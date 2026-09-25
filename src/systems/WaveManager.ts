/**
 * Dalga yaşam döngüsü: hazırlık → doğurma → bitiş → sonraki hazırlık.
 *
 * `M1`'in geçici `SpawnSystem`'inin yerini alıyor.
 *
 * TIER 1 kural 8: tüm zamanlayıcılar `scaledDelta` — 2× hızda dalga da hızlanır.
 * TIER 1 kural 11: `entities/Enemy`'yi tanımaz, `SpawnableEnemy` şeklini tanır.
 * TIER 1 kural 1: sayı yok; `BALANCE` ve `waves.ts`'ten geliyor.
 */

import type { EnemyDef, EnemyId, Mover, SpawnableEnemy } from '../types/enemy';
import type { Wave } from '../types/wave';
import type { Poolable } from '../util/pool';
import type { Pool } from '../util/pool';
import { BALANCE } from '../data/balance';
import { getEnemy } from '../data/enemies';
import type { EconomySystem } from './EconomySystem';
import type { EventBus } from './EventBus';

const MS_TO_S = 1 / 1000;

export type WavePhase = 'prep' | 'running' | 'done';

/**
 * Erken başlatma bonusu. `GAME-DESIGN.md` §6:
 * `kalanSaniye × ceil(dalgaNo / 2)`, **ilk 3 dalgada kapalı**.
 *
 * Gerekçe dokümanda: eski sabit `+1/saniye` bonusu dalga 1'de gelirin
 * %28'iydi ve yeni oyuncuya "telegrafı okuma, hemen bas" öğretiyordu —
 * telegrafı zorunlu kılan kararla doğrudan çelişiyordu.
 */
export function earlyStartBonus(remainingSec: number, waveNo: number): number {
  if (waveNo < BALANCE.earlyBonusFrom) return 0;
  if (!(remainingSec > 0)) return 0;
  return Math.floor(remainingSec) * Math.ceil(waveNo / 2);
}

/**
 * Sonsuz mod kaynağı — `M8-T06`.
 *
 * `WaveManager` sonsuz modun **kurallarını** bilmiyor; yalnız "listem
 * bitti, sıradaki dalgayı sen üret" diyor. Üretim `systems/endlessWaves.ts`
 * içinde ve Phaser'sız; böylece sonsuz mod dalga yaşam döngüsüne hiç
 * dokunmadan ölçülebiliyor.
 */
export interface EndlessSource {
  /** 1 tabanlı dalga numarası için dalga üretir. */
  waveAt(n: number): Wave;
  /** O dalgada haritanın HP çarpanına uygulanacak **ek** çarpan. */
  hpScaleAt(n: number): number;
}

/** Doğurma sırasında bekleyen tek bir düşman. */
interface Bekleyen {
  readonly def: EnemyDef;
  /** Dalga başından itibaren doğum anı. Birim: saniye. */
  readonly at: number;
  /** Haritada birden fazla giriş varsa hangisi (`WaveGroup.spawnPoint`). */
  readonly spawnPoint: number;
}

export class WaveManager<T extends SpawnableEnemy & Poolable> {
  #phase: WavePhase = 'prep';
  /** 0 tabanlı; `waves[#index]` şu anki/gelecek dalga. */
  #index = 0;
  #prepLeftSec: number;
  #waveTimeSec = 0;
  /** Bu dalgada henüz doğmamış düşmanlar, `at`'a göre sıralı. */
  #kuyruk: Bekleyen[] = [];
  #spawnedThisWave = 0;
  /** Sonsuz modda son üretilen dalga (bkz. `#waveAt`). */
  #uretilen?: Wave;

  constructor(
    private readonly pool: Pool<T>,
    /**
     * Düşman tipine ve girişe (`spawnPoint`) göre hareket stratejisi seçer.
     *
     * Uçanlar `LineMover`, yürüyenler `PathMover` alıyor. Seçim burada
     * çünkü `Enemy` sınıfı hangi hareketle geldiğini bilmiyor ve
     * bilmemeli (`DEPENDENCIES.md` §2). `spawnPoint` haritada birden fazla
     * giriş varsa hangisini kullanacağını belirtiyor (`WaveGroup.spawnPoint`).
     */
    private readonly moverFor: (def: EnemyDef, spawnPoint: number) => Mover,
    private readonly bus: EventBus,
    private readonly eco: EconomySystem,
    private readonly waves: readonly Wave[],
    private readonly hpMultiplier: number,
    private readonly resolveEnemy: (id: EnemyId) => EnemyDef | undefined = getEnemy,
    /**
     * Bir düşman kaleye vardığında, havuza dönmeden **önce** çağrılır.
     * `M3-T09` sızan HP'yi buradan ölçüyor.
     */
    private readonly onLeak?: (enemy: T) => void,
    /**
     * Verilirse, elle yazılmış dalgalar bitince oyun **durmuyor**: bundan
     * sonraki dalgalar üretiliyor (`M8-T06`). Verilmezse eski davranış —
     * son dalgadan sonra `phase = 'done'`.
     */
    private readonly endless?: EndlessSource,
  ) {
    this.#prepLeftSec = BALANCE.prepSeconds;
    // Dalgasız harita hazırlık aşamasında beklemez — hazırlanacak bir şey yok.
    if (waves.length === 0 && endless === undefined) this.#phase = 'done';
  }

  get phase(): WavePhase {
    return this.#phase;
  }

  /**
   * 1 tabanlı dalga numarası. Bitince son dalganın numarası kalır.
   *
   * Sonsuz modda **kırpılmıyor** — 11, 12, 13… diye artıyor; HUD ve skor
   * bu sayıyı gösteriyor.
   */
  get waveNumber(): number {
    if (this.endless !== undefined) return this.#index + 1;
    return Math.min(this.#index + 1, this.waves.length);
  }

  /** Elle yazılmış dalgalar bitti mi — HUD "N/10" yerine "N" gösteriyor. */
  get isEndless(): boolean {
    return this.endless !== undefined && this.#index >= this.waves.length;
  }

  /**
   * Bu indeksteki dalga: önce elle yazılmış liste, sonra sonsuz üretici.
   *
   * Üretilen dalga **önbelleğe alınıyor**: `upcomingWave` (dalga telgrafı)
   * her karede okunuyor ve üretim her çağrıda yeniden koşarsa telgraf ile
   * gerçekten doğan dalga ayrışabilir — üretim deterministik olsa bile
   * boşuna iş olurdu.
   */
  #waveAt(i: number): Wave | undefined {
    const elle = this.waves[i];
    if (elle !== undefined) return elle;
    if (this.endless === undefined) return undefined;
    const no = i + 1;
    if (this.#uretilen?.index !== no) this.#uretilen = this.endless.waveAt(no);
    return this.#uretilen;
  }

  get prepRemainingSec(): number {
    return this.#phase === 'prep' ? this.#prepLeftSec : 0;
  }

  /** Hazırlık aşamasındaysa gelecek dalga; değilse `undefined`. */
  get upcomingWave(): Wave | undefined {
    return this.#phase === 'prep' ? this.#waveAt(this.#index) : undefined;
  }

  get isComplete(): boolean {
    return this.#phase === 'done';
  }

  /**
   * Kaydedilmiş bir turdan dönüldü — sayacı o dalganın **hazırlığına**
   * kur (`M10-T02`).
   *
   * Yalnız dalga sınırında çağrılıyor (tur kaydının tek yazma anı), o
   * yüzden sahada düşman olmadığı varsayılıyor ve kuyruk temizleniyor.
   * Dalga ortasında çağrılırsa kuyruktaki doğumlar kaybolur — çağıran
   * taraf bunu bilmek zorunda, bu yüzden ad "atla" değil "geri yükle".
   *
   * Hazırlık süresi **tam** veriliyor: oyuncu geri döndüğünde tahtasını
   * gözden geçirecek zamanı hak ediyor, ve ayrıca bu "çık-gir" ile
   * hazırlık süresini uzatma gibi bir sömürü üretmiyor — hazırlık
   * süresi zaten altın kazandırmıyor, erken başlatmak kazandırıyor.
   */
  turdanGeriYukle(waveIndex: number): void {
    const enBuyuk = this.endless !== undefined ? Number.MAX_SAFE_INTEGER : this.waves.length - 1;
    this.#index = Math.max(0, Math.min(waveIndex, enBuyuk));
    this.#phase = 'prep';
    this.#prepLeftSec = BALANCE.prepSeconds;
    this.#waveTimeSec = 0;
    this.#kuyruk = [];
    this.#spawnedThisWave = 0;
    this.#uretilen = undefined;
  }

  /** Erken başlatma butonu bu dalgada açık mı (§6: dalga 4'ten itibaren). */
  get earlyStartAvailable(): boolean {
    return this.#phase === 'prep' && this.waveNumber >= BALANCE.earlyBonusFrom;
  }

  /**
   * Oyuncu dalgayı erken başlattı.
   * @returns Kazanılan bonus altın. Hazırlık aşamasında değilse `0`.
   */
  startWaveEarly(): number {
    if (this.#phase !== 'prep') return 0;
    // `M14` — ölçekleme `EconomySystem`'de: altının **her** kalemi
    // haritanın çarpanını tek bir yerden izliyor (S70'in dersi).
    const bonus = this.eco.awardEarlyStart(this.#prepLeftSec, this.waveNumber);
    this.#dalgayiBaslat();
    return bonus;
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms. */
  update(scaledDelta: number): void {
    const dt = scaledDelta * MS_TO_S;
    if (!(dt > 0)) return;

    if (this.#phase === 'prep') {
      this.#prepLeftSec -= dt;
      /**
       * **`M144` — SAHADA KALANLAR HAZIRLIK BOYUNCA YÜRÜMÜYOR.**
       *
       * `#ilerlet(dt)` burada **çağrılmıyor**; `running` ve `done`
       * dallarında çağrılıyor. Sonuç: dalga kapanıp hazırlık başlayınca
       * sahada kalan düşmanlar **donuyor**, sonraki dalga başlayınca
       * yürümeye devam ediyor.
       *
       * **Oyuncu bildirdi, tarayıcıda üretildi** (Taş Köprü, hazırlık
       * fazı): iki Zırhlı Ork `pathFraction` 0,000 ve 0,065'te 16 saniye
       * kıpırdamadı, engellenmiş de değildiler. Dalganın kuyruğu son
       * doğanlarla birlikte kapandığı için donan şey genellikle **yeni
       * gelenler** oluyor — raporun sözleriyle "gelecekler donuyor".
       *
       * **Bu bir kusur ve `M16`'nın (S102) niyetine aykırı:** dalga
       * kuyruk bitince kapanıyor ki "sıradaki dalga bir öncekinin
       * artıkları yoldayken gelsin". Artıklar park edince örtüşme yarım
       * kalıyor ve hazırlık sırasında sızıntı **imkânsız** oluyor, yani
       * erken başlatmanın bedeli olduğundan az.
       *
       * **DÜZELTİLMEDİ ve sebebi ölçüldü.** Tek satır (`#ilerlet(dt)`)
       * eklendiğinde referans rampa `0 · 2 · 9 · 13 · 14 · 17` iken
       * `0 · 8 · 25 · 31 · 28 · 21` oluyor: altı haritanın **dördü
       * geçilemez** ve rampa monotonluğunu kaybediyor. Bütün denge bu
       * davranışın üstüne türetilmiş — düzeltmek çarpanları, dalga
       * bütçelerini ve boss ölçeklemesini yeniden türetmek demek.
       * Kayıt: `plan/OPEN-QUESTIONS.md` **S169**.
       *
       * **`M154` — düzeltmenin reçetesi uçtan uca koşturuldu ve sınır
       * ölçüldü.** `M145`-`M149`'un türettiği paket (bu satır + yeraltı
       * penceresi `0,6 → 0,5` + HP vektörü `1,0 · 1,3 · 1,7 · 5,145 ·
       * 7,4 · 8,08`) **rampaları kurtarıyor** — Normal `0 · 3 · 5 · 9 ·
       * 12 · 13` katı artan, Kolay azalmıyor, hiçbir aile 20'yi aşmıyor.
       * Ama **14 test / 9 dosya** kırılıyor ve altısı sayıyla kapanmıyor:
       * hepsi **karşılaştırmalı** iddia (hangi aile iyi · hangi hedefleme ·
       * hangi politika · hangi dalga doruk) ve hepsi **donmuş dünyada**
       * ölçüldü. En keskini: donma kalkınca `erkenPolitika`'nın yönü
       * **tersine dönüyor** (Taş Köprü'de `hemen` 1, `hic` 3), yani
       * bütün denge sayılarının tabanı olan *"en muhafazakâr politika
       * `hic`'tir"* düşüyor. Donma bir denge parametresi değil **zemin**:
       * kalkınca büyüklükler değil **sıralamalar** değişiyor ve HP
       * vektörü sıralamayı hareket ettiremiyor.
       */
      // Sayaç dolunca dalga **otomatik** başlıyor (S29). Erken başlatma
      // bir seçenek, zorunluluk değil — §6'nın bonus formülü zaten bunu
      // varsayıyor ("kalanSaniye × …" ancak sayaç işlerken anlamlı).
      if (this.#prepLeftSec <= 0) this.#dalgayiBaslat();
      return;
    }

    if (this.#phase === 'done') {
      this.#ilerlet(dt);
      return;
    }

    this.#waveTimeSec += dt;
    this.#dogur();
    this.#ilerlet(dt);
    this.#dalgaBittiMi();
  }

  #dalgayiBaslat(): void {
    const wave = this.#waveAt(this.#index);
    if (wave === undefined) {
      this.#phase = 'done';
      return;
    }

    // Grupları tek bir zaman sıralı kuyruğa aç. Kuyruk sayesinde "havuz
    // doluysa ERTELE" davranışı doğal: doğmayan düşman kuyrukta kalıyor,
    // sessizce atlanmıyor.
    const kuyruk: Bekleyen[] = [];
    for (const g of wave.groups) {
      const def = this.resolveEnemy(g.enemy);
      if (def === undefined) continue;
      for (let i = 0; i < g.count; i++) {
        kuyruk.push({ def, at: g.startAt + i * g.spawnDelay, spawnPoint: g.spawnPoint });
      }
    }
    kuyruk.sort((a, b) => a.at - b.at);

    this.#kuyruk = kuyruk;
    this.#waveTimeSec = 0;
    this.#spawnedThisWave = 0;
    this.#phase = 'running';
    this.bus.emit('wave:started', { index: wave.index });
  }

  #dogur(): void {
    while (this.#kuyruk.length > 0) {
      const bas = this.#kuyruk[0];
      if (bas === undefined || bas.at > this.#waveTimeSec) break;

      const dusman = this.pool.acquire();
      if (dusman === null) {
        // Havuz dolu — **ertele, atlama**. Kuyruğun başındaki düşman
        // orada kalıyor ve yer açılınca doğuyor. Sessizce atlamak dalga
        // bütçesinden düşman eksiltirdi ve denge testleri bunu göremezdi.
        return;
      }
      this.#kuyruk.shift();
      dusman.spawn(this.moverFor(bas.def, bas.spawnPoint), bas.def, this.#hpCarpani());
      this.#spawnedThisWave++;
    }
  }

  /**
   * O dalgada uygulanacak HP çarpanı.
   *
   * Sonsuz modda haritanınkinin **üstüne** dalga başına bir çarpan biniyor:
   * düşman sayısı havuz tavanıyla sınırlı olduğu için zorluğun tek
   * sürdürülebilir kolu dayanıklılık (`data/endless.ts` başlığı).
   */
  #hpCarpani(): number {
    if (this.endless === undefined) return this.hpMultiplier;
    return this.hpMultiplier * this.endless.hpScaleAt(this.waveNumber);
  }

  #ilerlet(dt: number): void {
    const scaledDelta = dt / MS_TO_S;
    // `activeItems` kopya döner — döngü içinde `release` güvenli.
    for (const dusman of this.pool.activeItems()) {
      dusman.step(scaledDelta);
      if (!dusman.reachedEnd()) continue;

      // Kaleye varış: mesafe hesabı yok, `remainingDistance <= 0` kesin.
      this.onLeak?.(dusman);
      this.eco.loseLife(dusman.def?.leakDamage ?? 1);
      this.pool.release(dusman);
    }
  }

  /**
   * **Dalga KUYRUK bitince kapanıyor, saha boşalınca değil** (`M16`, S102).
   *
   * Eskiden `pool.activeCount > 0` iken dönüyordu, yani hazırlık aşaması
   * hiçbir zaman düşman varken başlamıyor ve **dalgalar üst üste
   * binemiyordu**. Sonucu `M14` ölçtü: erken başlatmanın hiçbir bedeli
   * yoktu — buton bir karar değil, bedava altındı. Artık sıradaki dalga
   * bir öncekinin artıkları yoldayken geliyor ve "kalan süreyi altına
   * çevir" gerçek bir takas oluyor.
   *
   * **Son dalga istisna ve zorunlu.** Zafer `wavePhase === 'done'` ile
   * tetikleniyor (`HudScene.#oyunSonuKontrol`); kuralı körü körüne
   * uygulamak oyuncuyu **boss hâlâ yürürken** kazandırırdı. Bu yüzden
   * yalnız son dalgada saha bekleniyor: turun bitişi hep "saha temiz"
   * anlamına geliyor, ki tur kaydının sözleşmesi de (`RunSave`) o
   * varsayıma dayanıyor.
   */
  #dalgaBittiMi(): void {
    if (this.#kuyruk.length > 0) return;
    if (this.#spawnedThisWave === 0) return;
    const sonDalga = this.#index >= this.waves.length - 1 && this.endless === undefined;
    if (sonDalga && this.pool.activeCount > 0) return;

    const no = this.waveNumber;
    this.eco.awardWaveEnd(no);
    this.bus.emit('wave:ended', { index: no });

    this.#index++;
    if (this.#index >= this.waves.length && this.endless === undefined) {
      this.#phase = 'done';
      return;
    }
    this.#phase = 'prep';
    this.#prepLeftSec = BALANCE.prepSeconds;
  }
}

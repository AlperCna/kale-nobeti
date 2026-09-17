/**
 * **Kısıt B — başsız dalga simülasyonu.** `M3-T09`.
 *
 * ## Neden formül değil simülasyon
 *
 * Kısıt B'nin iki girdisi — `dalgaSüresi` ve `aktiflikOranı` — statik
 * veriden **hesaplanamaz.** İkisi de dalganın nasıl aktığına bağlı: kuleler
 * ne zaman hedef buldu, düşmanlar ne zaman öldü, kalan sürede kim
 * menzildeydi. Bunlara tanım uydurmak, uydurulmuş bir sayıyla testi yeşile
 * boyamak olurdu (S26, S27 bu yüzden **düştü**).
 *
 * Kısıt A statik kalabiliyor çünkü tek düşman için `kapsama / hız` yeterli
 * ve sonuç yerleşimden bağımsız (`research/01` §2). Kısıt B için değil.
 *
 * **Doğru çözüm: dalgayı gerçekten çalıştır ve sızan HP'yi ölç.**
 * Odaklanma kaybı (`× 0.75`, `research/01` §10) da doğal olarak ortaya
 * çıkıyor — çarpan gerekmiyor, kuleler zaten aynı hedefe ateş ediyor.
 *
 * TIER 1 kural 11: sahne yok, render yok, Phaser yok. `node`'da koşuyor.
 * TIER 1 kural 8: zaman tek kaynaktan — sabit `stepMs`.
 */

import type { EnemyDef, EnemyId, Mover, SpawnableEnemy, Targetable } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { ProjectileState } from '../types/projectile';
import type { ReferenceBoard } from '../types/board';
import type { Wave } from '../types/wave';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { GECICI_MERMI_HIZI, MERMI_ISABET_YARICAPI, POOL_PREALLOC } from '../data/balance';
import { getTower } from '../data/towers';
import { kalkandanGecir } from './combat';
import { getEnemyForMap } from '../data/enemies';
import { KISLA, barracksTierAt, SOLDIER_SPEED } from '../data/barracks';
import { defaultRally, spawnSoldier, stepSoldiers } from './BarracksSystem';
import { AbilitySystem } from './AbilitySystem';
import { METEOR } from '../data/abilities';
import { distSq } from '../util/math';
import type { SoldierState } from '../types/barracks';
import { EconomySystem } from './EconomySystem';
import { EventBus } from './EventBus';
import { PathSystem } from './PathSystem';
import { LineMover, PathMover, resetEnemyState } from './movers';
import { ProjectileSystem } from './ProjectileSystem';
import { EnemyAbilitySystem } from './EnemyAbilitySystem';
import { applyEffect, emptyEffects, resetEffects, speedMultiplier, stepEffects } from './effects';
import { TowerSystem } from './TowerSystem';
import { WaveManager } from './WaveManager';
import type { TowerEffect } from '../types/tower';

/**
 * **Oyuncunun iki yeteneği — `M11` Faz 4'te eklendi, varsayılan KAPALI.**
 *
 * `waveSim` bugüne kadar Meteor'u ve Takviye'yi hiç simüle etmiyordu:
 * referans tahta yetenek kullanmıyor, yani ölçülen zorluk oyuncunun
 * elindeki araçların bir kısmını **görmüyordu**. Bu, `M10`'un üç
 * körlüğüyle (S80/S81/S86) aynı sınıf ama ters yönde: ölçüm oyunu
 * **zor** gösteriyordu, kolay değil — yani muhafazakârdı ve denge
 * sayılarını bozmuyordu. Bu yüzden varsayılan `'yok'`: bütün mevcut
 * ölçümler aynen duruyor, yetenekler yalnız açıkça istendiğinde
 * simüle ediliyor (Faz 4'ün "Takviye meşru mu" sorusu).
 *
 * **Politika bilerek basit ve muhafazakâr:** bekleme dolar dolmaz,
 * en iyi hedefe. Gerçek oyuncu zamanlamayı daha iyi yapar, yani
 * ölçülen katkı bir **alt sınır**.
 */
export type YetenekKullanimi = 'yok' | 'meteor' | 'takviye' | 'ikisi';

/**
 * **Erken başlatma politikası** — `M16` Faz 2 (S102).
 *
 * Dalgalar üst üste binebildiğinden bu artık gerçek bir karar ve
 * modelin hangi oyuncuyu canlandırdığını **açıkça** seçmesi gerekiyor:
 *
 * - `'hemen'` — hazırlık görünür görünmez bas. Azami altın, azami
 *   üst üste binme. Saldırgan uç.
 * - `'sonBirkac'` — sahada `ERKEN_ESIK`'ten az düşman kalınca bas.
 *   Ölçülen **en iyi** oyun: bonusun çoğunu alıyor, kalabalığın
 *   üstüne yeni dalga çağırmıyor.
 * - `'temizken'` — saha tamamen boşalınca bas.
 * - `'hic'` — hiç basma. Muhafazakâr uç, bonus yok.
 *
 * Ölçülen fark (Zor, referans tahta, can kaybı):
 *
 * | politika | h1 | h2 | h3 | h4 | h5 | h6 |
 * |---|---|---|---|---|---|---|
 * | `hemen`     | 0 | 3 | 11 | 16 | 30 | 44 |
 * | `sonBirkac` | 0 | 0 |  4 |  8 | 10 | 23 |
 * | `hic`       | 0 | 0 |  3 |  6 | 11 | 25 |
 *
 * Karar **gerçek**: saldırgan oyun harita 5-6'yı 20 canla geçilemez
 * yapıyor. `M14` bunu ölçtüğünde fark **sıfırdı**; bedeli `M16` koydu.
 *
 * **`'temizken'` artık neredeyse hiç tetiklenmiyor** ve bu bir kusur
 * değil, kural değişikliğinin doğrudan sonucu: hazırlık aşaması `M16`'dan
 * beri **kuyruk** bitince başlıyor, saha boşalınca değil. Yani hazırlık
 * başladığında sahada hemen her zaman düşman var ve 20 sn'lik sayaç
 * dolmadan temizlenmiyor. Seçenek, ne zaman tetiklendiğini gösterebilmek
 * için duruyor; ölçüm tabanı olarak **kullanılmıyor** (bkz.
 * `referansOlcum.REFERANS_POLITIKA`).
 */
export type ErkenPolitika = 'hemen' | 'sonBirkac' | 'temizken' | 'hic';

/**
 * **Ölçüm gözlemcisi** — her sızıntıyı **zamanıyla** bildirir (`M37`).
 *
 * `SimResult` sızıntıyı **dalga başına** topluyor ve sızıntı "o an koşan
 * dalgaya" yazılıyor (gerekçe `kosturDalgalar`'ın başında). `M36`
 * ölçümü bu atfın yanıltıcı olduğunu gösterdi: hazırlık süresi 20 sn,
 * iki dalga arası 41-43 sn, ama bir Trol'ün yolu yürümesi 42-78 sn —
 * yani hiçbir dalga kendi döngüsünde boşalamıyor ve biriken kuyruğun
 * tamamı **son dalgaya** yazılıyor (yalnız o, sahanın boşalmasını
 * bekliyor). "Orta oyun boş" sonucu büyük ölçüde bu artefakt.
 *
 * Gözlemci yalnız **ölçüm** için; oyun onu kullanmıyor ve simülasyonun
 * davranışına hiç dokunmuyor. Ayrı bir ölçüm kopyası yazmak S80'in hata
 * sınıfı olurdu ("oyun ile ölçüm farklı bir şeyi biliyor").
 */
export interface SimGozlemci {
  /**
   * @param enemyId Kaleye ulaşan düşman.
   * @param saniye Koşunun **başından** itibaren geçen ölçekli süre.
   * @param waveIndex O an koşan dalganın 0 tabanlı indeksi.
   */
  sizinti(enemyId: EnemyId, saniye: number, waveIndex: number): void;
}

export interface SimResult {
  /** Kaleye ulaşan düşmanların **kalan** HP toplamı. Birim: HP. */
  readonly leakedHp: number;
  readonly leakedCount: number;
  /** **Ölçüldü**, tanımlanmadı. Birim: saniye. */
  readonly durationSec: number;
  readonly killedCount: number;
  /** Aynı anda ekranda görülen en yüksek düşman sayısı. */
  readonly peakEnemies: number;
  /**
   * **Hangi düşman** sızdı — tip başına adet.
   *
   * Toplam sayı "dalga sızdırdı" diyor ama *neyin* sızdığını söylemiyor.
   * Denge kararı için gereken bilgi bu: Trol mü sızıyor yoksa yanındaki
   * goblinler mi? İkisi tamamen farklı iki düzeltme gerektiriyor.
   */
  readonly leakedByEnemy: Readonly<Partial<Record<EnemyId, number>>>;
}

/** Sahnesiz düşman. `Enemy`'nin Phaser'sız ikizi. */
class SimEnemy implements SpawnableEnemy, Poolable, Targetable {
  x = 0;
  y = 0;
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  speed = 0;
  speedFactor = 1;
  progress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  pathFraction = 0;
  summonsDone = 0;
  blockedBy: object | null = null;
  alive = false;
  /** `M10-T03` — oyunla aynı kalkan alanı; denge ölçümü onu da görsün. */
  shieldLeft = 0;
  /** `M10-T05` — süreli kule etkileri (yanma, yavaşlatma). Oyunla aynı alan. */
  readonly effects = emptyEffects();
  mover: Mover | null = null;

  get remainingDistance(): number {
    return this.progress.remainingDistance;
  }

  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void {
    const hp = def.hp * hpMultiplier;
    this.mover = mover;
    this.def = def;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = def.speed;
    this.blockedBy = null;
    this.alive = true;
    this.shieldLeft = def.shield ?? 0;
    this.progress = mover.spawnProgress();
    this.#konumla();
  }

  step(scaledDelta: number): void {
    if (this.mover === null || !this.alive) return;
    this.mover.step(this, scaledDelta);
    this.#konumla();
  }

  reachedEnd(): boolean {
    return this.mover !== null && this.mover.reachedEnd(this);
  }

  resetForPool(): void {
    resetEnemyState(this);
    resetEffects(this.effects); // M10-T05 — TIER 1 kural 3
    this.mover = null;
    this.x = 0;
    this.y = 0;
  }

  #konumla(): void {
    if (this.mover === null) return;
    const p = this.mover.positionAt(this);
    this.x = p.x;
    this.y = p.y;
  }
}

/** Sahnesiz mermi. */
class SimProjectile implements ProjectileState<SimEnemy>, Poolable {
  x = 0;
  y = 0;
  target: SimEnemy | null = null;
  damage = 0;
  damageType: ProjectileState['damageType'] = 'physical';
  speed = 0;
  speedFactor = 1;
  splashRadius = 0;
  hitRadius = 0;
  effect: TowerEffect | undefined = undefined;
  alive = false;
  lastKnownX = 0;
  lastKnownY = 0;

  resetForPool(): void {
    this.target = null;
    this.damage = 0;
    this.speed = 0;
    this.splashRadius = 0;
    this.hitRadius = 0;
    this.effect = undefined;
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.lastKnownX = 0;
    this.lastKnownY = 0;
  }
}

/**
 * Simülasyonun sonsuza gitmemesi için sert tavan — **dalga başına**
 * 300 sn'lik oyun süresi.
 *
 * `M16` Faz 1'de dalga başına oldu: sürekli zaman çizgisinde on dalga
 * tek koşuda ilerliyor ve sabit 20.000 adım (333 sn) ortada kesiyordu.
 * İlk ölçüm bunu açıkça gösterdi — rampa `0·5·8·12·16·18` yerine
 * `0·4·1·0·0·5` çıktı, yani geç dalgalar hiç koşmamıştı. Tavanın kendisi
 * bir **güvenlik supabı**, ölçüm parametresi değil.
 */
const MAX_STEPS_PER_WAVE = 20_000;

/**
 * **Tavanın gerçek birimi SANİYE, adım değil** — `M59`.
 *
 * `MAX_STEPS_PER_WAVE` 20.000 adım demek ve varsayılan 16,667 ms adımda
 * bu **333 sn**'ye denk geliyor — yorumun anlattığı şey de bu. Ama tavan
 * adım cinsinden yazıldığı için **adım küçültülünce süre de küçülüyordu**:
 * 2,083 ms'de 20.000 adım yalnız 41,7 sn ediyor ve dalga ortasında
 * kesiliyordu. Ölçüldü (`M59`): o adımda harita 4 ve 5 **sıfır** can
 * kaybı veriyordu — hiçbir düşman kaleye varamadan koşu bitiyordu.
 * Sessiz ve tamamen yanıltıcı bir sonuç.
 *
 * Tavan artık süreden türetiliyor, yani adım boyu değişse de aynı oyun
 * süresini koruyor. Varsayılan adımda davranış **birebir aynı**
 * (20.000 × 16,667 ms = 333,3 sn).
 */
const MAX_SECONDS_PER_WAVE = (MAX_STEPS_PER_WAVE * (1000 / 60)) / 1000;

/**
 * `'sonBirkac'` politikasının eşiği: sahada bu kadar ya da daha az
 * düşman kalmışsa erken başlat.
 *
 * Bir **model parametresi**, oyun sayısı değil — "makul oyuncu"nun ne
 * zaman bastığını tarif ediyor.
 */
const ERKEN_ESIK = 3;

/**
 * Bir dalgayı referans tahtaya karşı çalıştırır.
 *
 * **Deterministik:** rastgelelik yok, aynı girdi aynı sonucu verir.
 * `waveSim.test.ts` bunu ayrı bir testle bağlıyor.
 */
function kosturDalgalar(
  waves: readonly Wave[],
  tahtaAl: (waveIndex: number) => ReferenceBoard,
  map: MapDef,
  stepMs = 1000 / 60,
  /**
   * Zorluk seviyesinin **doğum anındaki** ek HP çarpanı
   * (`DIFFICULTY[x].hpScale`). Varsayılan 1 — Normal ve Zor.
   *
   * **S92 — ölçüm körlüğünün dördüncüsü, bu kez `waveSim`'de değil
   * onu ÇAĞIRANDA.** Kolay'ı ölçmenin yolu `MapDef.hpMultiplier`'ı
   * çarpmaktı; ama `bossFor` mutlak boss HP'sini aynı çarpana
   * **bölüyor**, yani ikisi sadeleşiyor ve **boss Kolay'da hiç
   * ölçeklenmiyordu**. Canlı oyun öyle çalışmıyor: `GameScene`
   * düşman tanımını çarpansız haritadan çözüyor
   * (`dusmanCoz → getEnemyForMap(id, this.#map)`) ama doğum çarpanını
   * `map.hpMultiplier * difficulty.hpScale` olarak veriyor — yani
   * boss gerçekte `BOSS_HP × hpScale`. Ölçüm onu `BOSS_HP` sanıyordu.
   *
   * `difficulty.ts` başlığındaki *"HP çarpanı boss'u hiç
   * etkilemiyordu"* cümlesi bu yüzden **ölçüm aracının** davranışını
   * anlatıyordu, oyunun değil. Burada ikisi ayrıldı: tanım çarpansız
   * haritadan, doğum çarpanı ayrı parametreden — `GameScene`'in
   * birebir şekli.
   */
  hpScale = 1,
  /** Oyuncunun yetenekleri — varsayılan `'yok'`, bkz. `YetenekKullanimi`. */
  yetenekKullanimi: YetenekKullanimi = 'yok',
  erken: ErkenPolitika = 'hic',
  /** Yalnız ölçüm — bkz. `SimGozlemci`. Simülasyonun davranışına dokunmaz. */
  gozlemci?: SimGozlemci,
): SimResult[] {
  const dogumCarpani = map.hpMultiplier * hpScale;
  const bus = new EventBus();
  const eco = new EconomySystem(map, bus);
  // Birden fazla giriş olabilir (harita 2/3) — her yol/uçan hattı kendi
  // hareketini alır, `WaveGroup.spawnPoint` hangisini seçeceğini söylüyor.
  // Gerçek oyunla (`GameScene.ts`) aynı seçim mantığı: tek yol kullanmak
  // ikinci girişin kulelerini hiç sınamadan bırakırdı.
  const groundMovers: Mover[] = map.paths.map((p) => new PathMover(new PathSystem(p)));
  const flyerMovers: Mover[] = map.flyerPaths.map((p) => new LineMover(p));
  const moverFor = (def: EnemyDef, spawnPoint: number): Mover => {
    const havuz = def.flying ? flyerMovers : groundMovers;
    // Son çare: harita bozuksa (paths boş) bile bir Mover döner —
    // `map.paths[0] ?? []` yerine doğrudan boş yol, aynı zararsız kalıyor.
    return havuz[spawnPoint] ?? havuz[0] ?? groundMovers[0] ?? new PathMover(new PathSystem([]));
  };

  /**
   * **Sonuçlar dalga başına biriktiriliyor** (`M16` Faz 1).
   *
   * Üst üste binmede bir düşman, onu doğuran dalga kapandıktan sonra
   * sızabiliyor. Sızıntı **o an koşan dalgaya** yazılıyor: doğuran
   * dalgaya yazmak `EnemyState`'e bir alan daha eklemeyi gerektirirdi
   * ve toplam (rampanın ölçtüğü şey) iki yöntemde de aynı. `kisitB`'nin
   * "dalga 1 hiç sızdırmıyor" iddiası da bu yöntemle anlamlı kalıyor.
   */
  const sonuclar: SimResult[] = [];
  let leakedHp = 0;
  let leakedCount = 0;
  let leakedByEnemy: Partial<Record<EnemyId, number>> = {};
  let killedCount = 0;
  let dalgaAdimi = 0;
  let peakEnemies = 0;

  const enemyPool = new Pool<SimEnemy>(() => new SimEnemy(), POOL_PREALLOC.enemy);
  const projPool = new Pool<SimProjectile>(() => new SimProjectile(), POOL_PREALLOC.projectile);

  /**
   * Tek hasar hunisi — `GameScene.#hasarUygula`'nın karşılığı.
   *
   * Mermi de yanma da buradan geçiyor; ayrı yazılsaydı kalkan ya da
   * ölüm muhasebesi iki yerde ayrışırdı (S80/S81'in hata sınıfı).
   */
  const hasarVer = (e: SimEnemy, miktar: number): void => {
    if (!e.alive) return;
    e.hp -= kalkandanGecir(miktar, e); // M10-T03 — oyunla aynı sıra
    if (e.hp > 0) return;
    e.alive = false;
    killedCount++;
    enemyPool.release(e);
  };

  const projectiles = new ProjectileSystem<SimEnemy, SimProjectile>(
    projPool,
    (e, sonuc) => hasarVer(e, sonuc.dealt),
    /**
     * **Süreli etkiler — `M10-T05`'te eklendi (S86).**
     *
     * Buraya kadar `waveSim` `onEffect` geri çağrısını hiç vermiyordu,
     * yani yanma ve yavaşlatma **hiç uygulanmıyordu**. Kundakçı'nın
     * yanması (9 hasar + 4/sn × 4 sn = vuruş başına 16 ek hasar) ve
     * Buz dalının yavaşlatması hiçbir denge ölçümünde yoktu.
     *
     * S80 (boss) ve S81 (düşman yetenekleri) ile aynı hata sınıfının
     * üçüncüsü: oyun ile sim farklı şey çalıştırıyor.
     */
    (e, effect) => applyEffect(e.effects, effect),
  );

  const towers = new TowerSystem((kule, tier, hedef) => {
    const ucanCarpani = hedef.def?.flying === true ? tier.airMultiplier : 1;
    projectiles.fire({
      x: kule.x,
      y: kule.y,
      target: hedef as SimEnemy,
      damage: tier.damage * ucanCarpani,
      damageType: kule.def.damageType,
      speed: GECICI_MERMI_HIZI,
      splashRadius: tier.splashRadius ?? 0,
      hitRadius: MERMI_ISABET_YARICAPI,
      effect: tier.effect,
    });
  });

  /**
   * Tahtayı **fark olarak** uygular (`M16` Faz 1).
   *
   * Sürekli zaman çizgisinde tahta her dalgada sıfırdan kurulamaz: var
   * olan kulenin bekleme süresi ve kışla askerlerinin canı dalgalar
   * arasında **taşınmalı** — gerçek oyunda da öyle. Var olan noktanın
   * yalnız kademesi güncelleniyor, yeni nokta ekleniyor. Referans
   * tahtalar hiç kule kaldırmıyor, o yüzden silme dalı yok.
   */
  const kuleleriUygula = (board: ReferenceBoard): void => {
    for (const bt of board.towers) {
      const def = getTower(bt.towerId);
      const spot = map.buildSpots[bt.spotIndex];
      if (def === undefined || spot === undefined) continue;
      const mevcut = towers.towers.find((t) => t.spotIndex === bt.spotIndex);
      if (mevcut !== undefined) {
        mevcut.tierIndex = bt.tier;
        mevcut.targetMode = bt.targetMode ?? 'first';
        continue;
      }
      towers.add({
        spotIndex: bt.spotIndex,
        x: spot.x,
        y: spot.y,
        def,
        tierIndex: bt.tier,
        targetMode: bt.targetMode ?? 'first',
        cooldownLeft: 0,
        target: null,
      });
    }
  };

  const wm = new WaveManager(
    enemyPool,
    moverFor,
    bus,
    eco,
    waves,
    dogumCarpani,
    (id) => getEnemyForMap(id, map),
    (e) => {
      leakedHp += Math.max(0, e.hp);
      leakedCount++;
      const id = e.def?.id;
      if (id !== undefined) leakedByEnemy[id] = (leakedByEnemy[id] ?? 0) + 1;
      // `M37` — aynı olay, bir de **zamanıyla**. `adim` aşağıda tanımlı
      // ama bu geri çağrı yalnız döngü içinde koşuyor, yani güvenli.
      // `sonuclar.length` o an koşan dalganın 0 tabanlı indeksi:
      // sonuçlar dalga bitince ekleniyor.
      if (id !== undefined) gozlemci?.sizinti(id, (adim * stepMs) / 1000, sonuclar.length);
    },
  );
  // --- Kışlalar (M5'ten taşınan borç) -------------------------------------
  //
  // Kışla `TowerSystem`'e girmiyor; askerleri ayrı bir listede yaşıyor ve
  // `BarracksSystem.stepSoldiers` ile ilerliyor. O fonksiyon zaten
  // Phaser'sız (TIER 1 kural 11), yani burada yeni mantık değil **kablolama**
  // var — dokuz engelleme kuralı canlı oyunla **aynı** koddan geliyor.
  interface SimKisla {
    readonly soldiers: SoldierState[];
    readonly respawnSeconds: number;
  }
  const kislalar: SimKisla[] = [];
  /** Hangi noktada kışla kuruldu — fark uygulaması için (`M16` Faz 1). */
  const kislaNoktalari = new Set<number>();
  const kislalariUygula = (board: ReferenceBoard): void => {
  for (const bb of board.barracks ?? []) {
    const spot = map.buildSpots[bb.spotIndex];
    if (spot === undefined) continue;
    // Var olan kışla **yeniden kurulmuyor**: askerlerin canı ve diriliş
    // sayacı dalgalar arasında taşınıyor (gerçek oyundaki gibi).
    if (kislaNoktalari.has(bb.spotIndex)) continue;
    kislaNoktalari.add(bb.spotIndex);
    const kademe = barracksTierAt(KISLA, bb.tier);
    // Toplanma noktası: yola en yakın nokta. Kışlanın üstü **olamaz** —
    // yapı noktaları yoldan `pathSnapMax`'ten uzak (M5-SONUC §5).
    // `Y13`: bütün yollara bakılıyor — gerçek oyunla (`GameScene.ts`)
    // aynı fonksiyon, aynı imza. Eskiden yalnız `paths[0]`'a bakılıyordu,
    // yani harita 2/3'te kışla simülasyonu gerçek oyundan sessizce
    // ayrışıyordu ve buradan çıkan denge sayıları kışlası bozuk bir
    // oyunda ölçülmüştü.
    const rally = defaultRally(spot, map.paths);
    const askerler: SoldierState[] = [];
    for (let i = 0; i < kademe.soldierCount; i++) {
      const s: SoldierState = {
        x: 0,
        y: 0,
        hp: 0,
        maxHp: 0,
        dps: 0,
        engagedWith: null,
        home: { x: 0, y: 0 },
        rally: { x: 0, y: 0 },
        state: 'dead',
        respawnLeft: 0,
        shield: 0,
        evasion: 0,
        lifetimeLeft: Number.POSITIVE_INFINITY,
        speed: SOLDIER_SPEED,
        alive: false,
        flipX: false,
      };
      const yayilma = (i - (kademe.soldierCount - 1) / 2) * 14;
      spawnSoldier(s, spot, { x: rally.x + yayilma, y: rally.y }, {
        hp: kademe.soldierHp,
        dps: kademe.soldierDps,
        evasion: kademe.evasion ?? 0,
        speed: SOLDIER_SPEED,
      });
      askerler.push(s);
    }
    kislalar.push({ soldiers: askerler, respawnSeconds: kademe.respawnSeconds });
  }
  };

  /**
   * Tahtayı dalga için hazırlar — kule farkı + kışla farkı.
   *
   * `wave:started` her dalgada yayılıyor ve `index` **1 tabanlı**;
   * tahta dizisi 0 tabanlı.
   */
  const tahtayiHazirla = (waveIndex: number): void => {
    const b = tahtaAl(waveIndex);
    kuleleriUygula(b);
    kislalariUygula(b);
  };
  tahtayiHazirla(0);
  bus.on('wave:started', ({ index }) => {
    tahtayiHazirla(index - 1);
  });
  bus.on('wave:ended', () => {
    sonuclar.push({
      leakedHp,
      leakedCount,
      durationSec: (dalgaAdimi * stepMs) / 1000,
      killedCount,
      peakEnemies,
      leakedByEnemy,
    });
    leakedHp = 0;
    leakedCount = 0;
    leakedByEnemy = {};
    killedCount = 0;
    peakEnemies = 0;
    dalgaAdimi = 0;
  });

  /**
   * Oyuncunun yetenekleri. `'yok'` ise hiç kurulmuyor — tek satır bile
   * çalışmıyor, yani bugünkü bütün ölçümler birebir aynı kalıyor.
   */
  const oyuncuYetenekleri = yetenekKullanimi === 'yok' ? null : new AbilitySystem();
  /** Takviye'nin geçici askerleri — kışla askerleriyle aynı kurallar (S47). */
  const gecicAskerler: SoldierState[] = [];
  const METEOR_YARICAP_KARE = METEOR.radius * METEOR.radius;
  const yeniGeciciAsker = (): SoldierState => ({
    x: 0,
    y: 0,
    hp: 0,
    maxHp: 0,
    dps: 0,
    engagedWith: null,
    home: { x: 0, y: 0 },
    rally: { x: 0, y: 0 },
    state: 'dead',
    respawnLeft: 0,
    shield: 0,
    evasion: 0,
    lifetimeLeft: Number.POSITIVE_INFINITY,
    speed: SOLDIER_SPEED,
    alive: false,
    flipX: false,
  });

  // Hazırlık aşamasını atla — ölçülen şey dalganın kendisi.
  wm.startWaveEarly();

  /**
   * **Düşman yetenekleri — `M10-T03`'te eklendi.**
   *
   * Buraya kadar `waveSim` yetenekleri **hiç** simüle etmiyordu: Şaman
   * iyileştirmiyor, Trol yenilenmiyor, Örümcek Ana bölünmüyordu. Yani
   * her denge ölçümü sistematik olarak **iyimser**di — ve en büyük
   * sapma bölünmede: harita 3'te 6 Örümcek Ana var, her biri 3 yavru
   * demek, yani sim 18 düşmanı hiç görmüyordu.
   *
   * `S80` ile aynı hata sınıfı (oyun ve sim farklı şeyi çalıştırıyor),
   * bu sefer düşman tarafında. Gerçek oyunla aynı sıra: yetenekler
   * kulelerden **önce** işleniyor (`GameScene.update`).
   */
  const yetenekler = new EnemyAbilitySystem<SimEnemy>(enemyPool, dogumCarpani, (id) =>
    getEnemyForMap(id, map),
  );

  const maxAdim = Math.ceil((MAX_SECONDS_PER_WAVE * 1000) / stepMs) * Math.max(1, waves.length);
  let adim = 0;
  while (!wm.isComplete && adim < maxAdim) {
    wm.update(stepMs);
    yetenekler.update(stepMs);
    const dusmanlar = enemyPool.activeItems();
    // Etkiler yeteneklerden SONRA, kışla/kulelerden ÖNCE —
    // `GameScene.update`'in birebir sırası.
    for (const e of dusmanlar) {
      if (!e.alive) continue;
      const yanma = stepEffects(e.effects, stepMs);
      e.speedFactor = speedMultiplier(e.effects);
      // Yanma **gerçek hasar**: zırh/direnç uygulanmıyor (§4.1).
      if (yanma > 0) hasarVer(e, yanma);
    }
    if (dusmanlar.length > peakEnemies) peakEnemies = dusmanlar.length;

    // --- Oyuncunun yetenekleri (`M11` Faz 4, varsayılan kapalı) ---------
    if (oyuncuYetenekleri !== null) {
      oyuncuYetenekleri.tick(stepMs);
      const canlilar = dusmanlar.filter((e) => e.alive && e.hp > 0);
      if (
        (yetenekKullanimi === 'meteor' || yetenekKullanimi === 'ikisi') &&
        oyuncuYetenekleri.ready('meteor') &&
        canlilar.length > 0
      ) {
        // **En kalabalık nokta.** Adaylar düşmanların kendi konumları:
        // en iyi daire merkezinin en az bir düşmanın üstünden geçtiği
        // her zaman doğru değil ama fark küçük ve politika muhafazakâr.
        let enIyi = canlilar[0]!;
        let enCok = 0;
        for (const aday of canlilar) {
          let n = 0;
          for (const e of canlilar) if (distSq(aday, e) <= METEOR_YARICAP_KARE) n++;
          if (n > enCok) {
            enCok = n;
            enIyi = aday;
          }
        }
        const sonuc = oyuncuYetenekleri.castMeteor({ x: enIyi.x, y: enIyi.y }, canlilar);
        if (sonuc !== null) {
          // Ölüm muhasebesi çağıranın işi — `castMeteor` yalnız `hp`
          // düşürüyor (kışlayla aynı sözleşme).
          for (const e of canlilar) {
            if (e.alive && e.hp <= 0) {
              e.alive = false;
              killedCount++;
              enemyPool.release(e);
            }
          }
        }
      }
      if (
        (yetenekKullanimi === 'takviye' || yetenekKullanimi === 'ikisi') &&
        oyuncuYetenekleri.ready('takviye') &&
        canlilar.length > 0
      ) {
        // **Öndeki düşmanın önü.** Takviye zaman kazandırma aracı; en
        // ileri düşmanı tutmak kaleye en yakın tehdidi geciktiriyor.
        let on = canlilar[0]!;
        for (const e of canlilar) if (e.progress > on.progress) on = e;
        oyuncuYetenekleri.castReinforcements({ x: on.x, y: on.y }, () => {
          const s2 = yeniGeciciAsker();
          gecicAskerler.push(s2);
          return s2;
        });
      }
    }
    if (gecicAskerler.length > 0) {
      stepSoldiers(gecicAskerler, dusmanlar, stepMs, Number.POSITIVE_INFINITY);
      for (const e of dusmanlar) {
        if (e.alive && e.hp <= 0) {
          e.alive = false;
          killedCount++;
          enemyPool.release(e);
        }
      }
    }

    // Kışla kulelerden **önce**: engellenen düşman aynı adımda duruyor,
    // yani kule ona ateş ederken doğru konumda oluyor (canlı oyunla
    // aynı sıra — `GameScene.update`).
    for (const k of kislalar) stepSoldiers(k.soldiers, dusmanlar, stepMs, k.respawnSeconds);
    // Askerlerin öldürdüğü düşmanların muhasebesi: `stepSoldiers` yalnız
    // `hp` düşürüyor, ölüm defterini tutmak çağıranın işi (canlı oyunda da
    // öyle — `GameScene.#hasarUygula`).
    if (kislalar.length > 0) {
      for (const e of dusmanlar) {
        if (e.alive && e.hp <= 0) {
          e.alive = false;
          killedCount++;
          enemyPool.release(e);
        }
      }
    }
    towers.update(stepMs, dusmanlar);
    projectiles.update(stepMs, dusmanlar);
    adim++;
    dalgaAdimi++;
    // Erken başlatma politikası — `ErkenPolitika`. Taban `'hic'`;
    // gerekçesi `referansOlcum.REFERANS_POLITIKA`'da.
    if (wm.phase === 'prep' && erken !== 'hic') {
      const kalan = enemyPool.activeCount;
      const bas =
        erken === 'hemen' ||
        (erken === 'sonBirkac' && kalan <= ERKEN_ESIK) ||
        (erken === 'temizken' && kalan === 0);
      if (bas) wm.startWaveEarly();
    }
  }

  return sonuclar;
}

/**
 * Bir dalgayı referans tahtaya karşı çalıştırır — **yalıtılmış** koşu.
 *
 * Senaryo testleri (dal kimliği, hedefleme modu, ölçek) bunu kullanıyor:
 * oradaki soru "bu dalga bu tahtaya karşı ne yapar", kampanyanın akışı
 * değil.
 */
export function simulateWave(
  wave: Wave,
  board: ReferenceBoard,
  map: MapDef,
  stepMs = 1000 / 60,
  hpScale = 1,
  yetenekKullanimi: YetenekKullanimi = 'yok',
): SimResult {
  // Tek dalgada politika görünmüyor (hazırlık yok) — `'hemen'` yeterli.
  const r = kosturDalgalar([wave], () => board, map, stepMs, hpScale, yetenekKullanimi, 'hemen');
  return (
    r[0] ?? {
      leakedHp: 0,
      leakedCount: 0,
      durationSec: 0,
      killedCount: 0,
      peakEnemies: 0,
      leakedByEnemy: {},
    }
  );
}

/** Bir haritanın tüm dalgalarını sırayla simüle eder. */
export function simulateAllWaves(
  waves: readonly Wave[],
  boards: readonly ReferenceBoard[],
  map: MapDef,
  stepMs = 1000 / 60,
  /** Zorluk seviyesinin doğum çarpanı — bkz. `simulateWave` (S92). */
  hpScale = 1,
  /** Oyuncunun yetenekleri — varsayılan `'yok'`, bkz. `YetenekKullanimi`. */
  yetenekKullanimi: YetenekKullanimi = 'yok',
  /**
   * Erken başlatma politikası — varsayılan `'hic'`.
   *
   * **Varsayılan, `buildReferenceBoards`'un `withEarlyBonus = false`
   * varsayılanıyla eşleşmek zorunda**: tahta bonusu saymıyorsa oyuncu da
   * kazanmamalı. İkisi ayrışırsa tahta hak etmediği altınla kurulur ve
   * bütün denge sayıları iyimserleşir — `M16` öncesi tam olarak bu oldu
   * (S109). Çifti birlikte tutan adres: `referansOlcum`.
   */
  erken: ErkenPolitika = 'hic',
  /** Yalnız ölçüm — bkz. `SimGozlemci`. */
  gozlemci?: SimGozlemci,
): SimResult[] {
  return kosturDalgalar(
    waves,
    (i) => boards[i] ?? boards[boards.length - 1]!,
    map,
    stepMs,
    hpScale,
    yetenekKullanimi,
    erken,
    gozlemci,
  );
}

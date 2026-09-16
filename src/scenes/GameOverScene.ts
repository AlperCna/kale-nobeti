import Phaser from 'phaser';
import { t } from '../util/i18n';
import { SaveSystem, starsFor } from '../systems/SaveSystem';
import { getSettings } from '../systems/Settings';
import { DIFFICULTY } from '../data/difficulty';
import { LocalStore } from '../util/storage';
import { devHooks } from '../util/devHooks';
import { createParchmentButton } from '../fx/ParchmentFrame';
import { MAPS } from '../data/maps';
import { FRAME_STAR, FRAME_STAR_EMPTY } from '../data/spriteFrames';
import { EndlessRecords } from '../systems/EndlessRecords';
import { AchievementSystem } from '../systems/AchievementSystem';
import { AchievementToast } from '../fx/AchievementToast';
import type { RunStatsData } from '../systems/RunStats';
import type { RunEndContext } from '../systems/AchievementSystem';

const INK = 0x14203a;
/** Yıldız bandının zemini — bkz. yıldız bloğundaki gerekçe. */
const PARSOMEN = 0xe4d3a8;

export interface GameOverData {
  readonly won: boolean;
  readonly lives: number;
  /** `M8-T03` — `HudScene` `Game` durmadan önce veriyi kopyalayıp yolluyor. */
  readonly stats?: RunStatsData;
  /** `M8-T06` — bu el sonsuz modda mı oynandı. */
  readonly endless?: boolean;
}

/**
 * Kazanma ve kaybetme ekranı (`M3-T11`).
 *
 * **Tüm metin bir kez yazılıyor** — sahne her açılışta yeniden kuruluyor,
 * `setText` çağrılmıyor (TIER 1 kural 7).
 *
 * Yıldız derecelendirmesi **M7'de** görselleştirilecek; eşikler
 * `GAME-DESIGN.md` §9'da zaten tanımlı (20 → ★★★, 15-19 → ★★, ≤14 → ★)
 * ve burada sayı olarak gösteriliyor.
 *
 * `Y07` — duruma göre **birincil bir eylem** var artık:
 * kaybedince "Tekrar dene", kazanıp sonraki harita açılınca "Sonraki
 * harita". "Ana menü" hep ikincil, hep orada.
 */
export class GameOverScene extends Phaser.Scene {
  #data: GameOverData & { mapId?: string } = { won: false, lives: 0 };
  /** `M8-T06` — bu el rekoru kırdı mı (`init`'te hesaplanıyor). */
  #yeniRekor = false;
  #rekor = 0;
  /** `M8-T07` — bu elde açılan başarımlar; `create()` bandı gösteriyor. */
  #acilanBasarimlar: readonly string[] = [];

  constructor() {
    super('GameOver');
  }

  init(data: Partial<GameOverData> & { mapId?: string }): void {
    this.#data = {
      won: data.won ?? false,
      lives: data.lives ?? 0,
      mapId: data.mapId,
      stats: data.stats,
      endless: data.endless === true,
    };

    // `M8-T06` — sonsuz rekoru da burada kaydediliyor, yıldızla aynı
    // gerekçeyle: `init` her elde koşuyor ve rekor **düşmüyor**.
    // Ölçüt `peakWave`: oyuncunun **başladığı** en yüksek dalga; bitirdiği
    // değil. Kaybettiren dalgayı saymamak "dalga 30'a kadar geldim"
    // cümlesini yalanlardı.
    this.#yeniRekor = false;
    this.#rekor = 0;
    if (this.#data.endless === true && this.#data.mapId !== undefined) {
      const kayit = new EndlessRecords(new LocalStore());
      this.#yeniRekor = kayit.record(this.#data.mapId, this.#data.stats?.peakWave ?? 0);
      this.#rekor = kayit.bestOf(this.#data.mapId);
    }

    // `M8-T07` — el sonu başarımları. `init`'te değerlendiriliyor ki
    // yukarıdaki `recordResult` çağrısından **sonra** olsun: "bütün
    // haritalar" ve "bütün yıldızlar" bu elin sonucunu da saymalı.
    this.#acilanBasarimlar = new AchievementSystem(new LocalStore()).checkRunEnd(
      this.#elOzeti(),
    );

    // **Sonuç burada kaydediliyor** — `init` her sahne başlatmasında
    // koşuyor, yani tekrar oynanan her el kaydediliyor. `recordResult`
    // yıldızı **düşürmüyor**: kötü bir tekrar kazanılmış ★★★'ü silmiyor.
    if (this.#data.mapId !== undefined) {
      // `M8-T11` — Kolay'da yıldız **kaydedilmiyor** (karar `difficulty.ts`
      // içinde yazılı: `SaveSystem` yıldızı düşürmüyor, yani Kolay'da
      // alınan ★★★ sonsuza kadar kalırdı). Harita kilidi yine açılıyor:
      // `isUnlocked` bitirmeye bakıyor ve Kolay da bir bitirme.
      const zorluk = getSettings(this).state.difficulty;
      const save = new SaveSystem(new LocalStore());
      // `M26` — eşikler o **koşunun** başlangıç canına göre. Zor 12 canla
      // başlıyor; mutlak 20/15 eşikleriyle kusursuz bir Zor koşusu bile
      // ★ alıyordu.
      const baslangicCan = this.#baslangicCan();
      if (DIFFICULTY[zorluk].recordStars) {
        save.recordResult(this.#data.mapId, this.#data.lives, this.#data.won, baslangicCan);
      } else if (this.#data.won) {
        // Yıldızsız "bitirdi" kaydı: 1 can ile bitmiş gibi — §9 tablosunda
        // ★ eşiği. Kilit zincirinin kopmaması için gerekli en küçük kayıt.
        // Yıldızsız "bitirdi" kaydı — ★ eşiği her başlangıç canında 1.
        save.recordResult(this.#data.mapId, 1, true, baslangicCan);
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const { won, lives, mapId } = this.#data;
    /** İstatistik bloğu eklenince tüm yerleşim yukarı çekildi. */
    const UST = height / 2 - 240;

    this.add.rectangle(0, 0, width, height, INK, 0.9).setOrigin(0);

    this.add
      .text(width / 2, UST, won ? t('victory') : t('defeat'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '64px',
        color: won ? '#D4A032' : '#B03A2E',
      })
      .setOrigin(0.5);

    this.add
      // `M34` — payda **bu turun** başlangıç canı. Sabit 20 ile Zor'da
      // kusursuz bir koşu "12 / 20 can kaldı" yazıyor, hemen altında
      // üç yıldız duruyordu; metin kendi ekranıyla çelişiyordu.
      .text(width / 2, UST + 60, `${lives} / ${this.#baslangicCan()} ${t('livesLeft')}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '24px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);

    // §9 eşikleri: 20 → ★★★, 15-19 → ★★, ≤14 → ★.
    // `G07` — atlas karesi (`FRAME_STAR`/`FRAME_STAR_EMPTY`), sistem yazı
    // tipi `★`'ın yerine. Üç yuva hep çiziliyor (dolu+boş) — kazanılmamış
    // yıldızlar da görünür, "bir tanesi daha var" hissi bedava.
    // Sonsuz elde yıldız yok: yıldız eşiği "20 canla bitir" demek ve
    // sonsuz mod tanımı gereği hep kaybetmeyle bitiyor.
    if (won && this.#data.endless !== true) {
      const yildizSayisi = this.#yildiz(lives);
      const ADIM = 44;
      // Parşömen altlık — **üçüncü kez** aynı sorun (`M8-T04` seviye seçim
      // kartları, `M8-T07` başarım listesi, şimdi burası): kazanılmış
      // yıldızın atlas karesi altın konturlu ama **içi mürekkep dolgu**
      // (ölçüldü `#14213B`), ve bu ekranın zemini de mürekkep. Canlı
      // ekran görüntüsünde üç yıldız da boş görünüyordu — 2 yıldızlık bir
      // zafer 0 yıldız gibi okunuyordu.
      this.add.rectangle(width / 2, UST + 104, 3 * ADIM + 20, 48, PARSOMEN, 0.85);
      for (let i = 0; i < 3; i++) {
        this.add
          .image(
            width / 2 + (i - 1) * ADIM,
            UST + 104,
            'atlas',
            i < yildizSayisi ? FRAME_STAR : FRAME_STAR_EMPTY,
          )
          .setDisplaySize(36, 36);
      }
    }

    // `M8-T03` — elin özeti. Oyun sonu ekranı bugüne kadar yalnız kalan
    // canı gösteriyordu; oyuncu ne öldürdüğünü, parasını nereye
    // harcadığını, ne kadar oynadığını hiç görmüyordu.
    //
    // Sayılar `Text` (BitmapText değil): bu sahne her açılışta baştan
    // kuruluyor ve hiç `setText` çağırmıyor — TIER 1 kural 7'nin
    // "bir kez yazılan metin" istisnası, dosyanın başlık notu.
    /**
     * "Yeni rekor!" satırı `UST + 132`'ye düşüyor ve istatistik bloğu
     * `UST + 150`'de başlıyordu — canlı ekran görüntüsünde ikisi
     * **üst üste bindi**. Blok ve butonlar o satır varsa aşağı kayıyor.
     */
    const rekorPayi = this.#yeniRekor ? 34 : 0;

    // `M8-T06` — sonsuz elin başlığı: ulaşılan dalga ve rekor.
    if (this.#data.endless === true) {
      const ulasilan = this.#data.stats?.peakWave ?? 0;
      this.add
        .text(
          width / 2,
          UST + 104,
          `${t('endlessReached')}: ${ulasilan}   ·   ${t('endlessBest')}: ${this.#rekor}`,
          {
            fontFamily: 'Spectral, serif',
            fontSize: '22px',
            color: this.#yeniRekor ? '#D4A032' : '#E4D3A8',
          },
        )
        .setOrigin(0.5);
      if (this.#yeniRekor) {
        this.add
          .text(width / 2, UST + 132, t('endlessNewRecord'), {
            fontFamily: '"Grenze Gotisch", serif',
            fontSize: '26px',
            color: '#D4A032',
          })
          .setOrigin(0.5);
      }
    }

    const s = this.#data.stats;
    if (s !== undefined) {
      const satirlar: ReadonlyArray<readonly [string, string]> = [
        [t('statKills'), String(s.kills)],
        [t('statTowers'), String(s.towersBuilt)],
        [t('statGoldEarned'), String(s.goldEarned)],
        [t('statGoldSpent'), String(s.goldSpent)],
        [t('statPeakWave'), String(s.peakWave)],
        [t('statDuration'), `${Math.floor(s.durationSec / 60)}:${String(s.durationSec % 60).padStart(2, '0')}`],
      ];
      const stil = { fontFamily: 'Spectral, serif', fontSize: '18px', color: '#8A7250' } as const;
      const ust = UST + 150 + rekorPayi;
      satirlar.forEach(([ad, deger], i) => {
        const y = ust + i * 26;
        this.add.text(width / 2 - 150, y, ad, stil).setOrigin(0, 0.5);
        this.add.text(width / 2 + 150, y, deger, { ...stil, color: '#E4D3A8' }).setOrigin(1, 0.5);
      });
    }

    // `Y07` — sıradaki harita. S62: kilit yalnız bitirmeye bağlı, yani
    // `won` ise bu haritanın kendisi az önce (yukarıdaki `init`) tamamlandı
    // sayıldı ve sıradaki **zaten** açık; ayrıca bir `SaveSystem` okuması
    // gerekmiyor.
    const ids = MAPS.map((m) => m.id);
    const suankiIndex = mapId !== undefined ? ids.indexOf(mapId) : -1;
    const sonrakiId = suankiIndex >= 0 ? ids[suankiIndex + 1] : undefined;
    const sonrakiVar = won && sonrakiId !== undefined;

    // Yerleşim ölçülerek kuruldu: 6 istatistik satırı (26 px) + 3 buton
    // (64 px) 720 px'e ancak sığıyor — canlı testte son buton ekranın
    // altından taşmıştı.
    const butonUst = this.#data.stats === undefined ? height / 2 + 96 : UST + 330 + rekorPayi;
    const birincilEylem = this.#butonlariKur(width / 2, butonUst, {
      kaybetti: !won,
      sonrakiVar,
      // `M8-T06` — sonsuz el **sonsuz olarak** tekrar başlıyor; normal
      // elde "Sonsuz moda devam" ayrı bir buton.
      sonsuzEl: this.#data.endless === true,
      haritayaGec: (hedefMapId: string) =>
        this.#haritayaGec(hedefMapId, this.#data.endless === true),
      sonsuzaGec: (hedefMapId: string) => this.#haritayaGec(hedefMapId, true),
      anaMenuyeDon: () => this.#anaMenuyeDon(),
      mapId,
      sonrakiId,
    });

    // `Enter` → birincil eylem. Duraklatma zaten ESC/boşluk kullanıyor
    // (Poki zorunlu); bu doğal bir ek. `create()` her yeniden açılışta
    // koşuyor ama sızıntı yok: `KeyboardPlugin.shutdown()` sahne kapanınca
    // TÜM dinleyicilerini kendisi temizliyor (`removeAllListeners()`,
    // Phaser çekirdeği) — `HudScene`'in ESC/boşluk dinleyicileriyle aynı
    // güvence.
    this.input.keyboard?.on('keydown-ENTER', birincilEylem);

    // `M8-T07` — bu elde açılan başarımlar. Bant **burada** gösteriliyor,
    // `init`'te değil: `init` sahne çizilmeden koşuyor ve tween'in
    // tutunacağı bir görüntü listesi henüz yok.
    if (this.#acilanBasarimlar.length > 0) {
      const bant = new AchievementToast(this);
      for (const id of this.#acilanBasarimlar) bant.show(id);
    }

    const dev = devHooks();
    if (dev !== undefined) {
      dev.gameOver = () => ({ won, lives, stars: won ? this.#yildiz(lives) : 0 });
      dev.achievements = () => new AchievementSystem(new LocalStore()).unlocked;
    }
  }

  /**
   * `AchievementSystem`'in el sonu bağlamı.
   *
   * `SaveSystem` **bu el kaydedildikten sonra** okunuyor (yukarıdaki
   * `recordResult` çağrısı `init`'in başında) — yoksa son haritayı
   * bitiren el "bütün haritalar" başarımını bir el geç açardı.
   */
  #elOzeti(): RunEndContext {
    const save = new SaveSystem(new LocalStore());
    const ids = MAPS.map((m) => m.id);
    return {
      won: this.#data.won,
      lives: this.#data.lives,
      // `M34` — sabit 20 geçiliyordu ve `flawless` başarımı
      // `lives >= startLives` istiyor: Zor 12 canla başladığı için
      // kusursuz bir Zor koşusunda bile 12 >= 20 yanlıştı, yani
      // **"Kusursuz" Zor'da imkânsızdı**. `M26`'nın kusurunun,
      // `M26`'nın ulaşamadığı ikinci kopyası.
      startLives: this.#baslangicCan(),
      sold: this.#data.stats?.soldAny ?? false,
      mapsCompleted: ids.filter((id) => save.isCompleted(id)).length,
      mapCount: ids.length,
      stars: save.totalStars(),
      maxStars: ids.length * 3,
      endlessWave: this.#data.endless === true ? (this.#data.stats?.peakWave ?? 0) : 0,
    };
  }

  /** `GAME-DESIGN.md` §9 yıldız tablosu. */
  /**
   * **Bu turun başlangıç canı — tek adres (`M34`).**
   *
   * `M26` yıldız eşiklerini mutlak 20/15'ten oranlara çevirmiş ve
   * `starsFor`/`recordResult`'a **zorunlu** `startLives` parametresi
   * koymuştu ki derleyici bütün çağıranları saysın. Bu sahnede dört yer
   * bu sayıya ihtiyaç duyuyordu; ikisi doğru değeri kullanıyordu,
   * **ikisi `BALANCE.startLives` sabitini** (20) kullanmaya devam etti.
   *
   * Zorunlu parametrenin sınırı tam burada: derleyici çağıranı bir şey
   * geçmeye zorluyor, **doğru** şeyi geçmeye zorlayamıyor. `RunEndContext`
   * `startLives` alanını şart koşuyordu ve yanlış sabit sorunsuzca
   * geçiyordu. Çare alanı zorunlu yapmak değil, **kaynağı tekleştirmek**.
   */
  #baslangicCan(): number {
    return DIFFICULTY[getSettings(this).state.difficulty].startLives;
  }

  #yildiz(lives: number): number {
    // Eşikler tek adreste: `SaveSystem.starsFor` (§9). Burada kopya yok.
    return starsFor(lives, this.#data.won, this.#baslangicCan());
  }

  /**
   * Duruma göre 1-3 buton kurar, dikey sıralı, birincil en üstte ve
   * belirgin biçimde daha büyük (`Y07` Öneri 1 — renk yerine **boyut**:
   * altın metin parşömen zeminde okunmuyor, `G02`'de düzeltilen hatanın
   * aynısını burada tekrarlamamak için).
   *
   * @returns Birincil eylemi tetikleyen fonksiyon — `Enter` tuşuna bağlanıyor.
   */
  #butonlariKur(
    x: number,
    y: number,
    d: {
      readonly kaybetti: boolean;
      readonly sonrakiVar: boolean;
      readonly sonsuzEl: boolean;
      readonly haritayaGec: (mapId: string) => void;
      readonly sonsuzaGec: (mapId: string) => void;
      readonly anaMenuyeDon: () => void;
      readonly mapId: string | undefined;
      readonly sonrakiId: string | undefined;
    },
  ): () => void {
    const ARA = 64;
    let satir = 0;
    const sonraki = () => y + satir++ * ARA;

    // `M8-T06` — kazanılan normal elden sonra sonsuz mod teklifi.
    // **Birincil değil:** ilk kez kazanan oyuncunun doğal yolu sıradaki
    // harita; sonsuz mod bir sapma, bir dayatma değil.
    const sonsuzTeklifi = (): void => {
      if (!d.sonsuzEl && !d.kaybetti && d.mapId !== undefined) {
        this.#buton(x, sonraki(), 240, 56, t('endlessMode'), false, () => d.sonsuzaGec(d.mapId!));
      }
    };

    if (d.sonrakiVar && d.sonrakiId !== undefined) {
      // Kazanıldı, sonraki harita açık: Sonraki harita (birincil) ·
      // Tekrar dene · Ana menü.
      const birincil = (): void => d.haritayaGec(d.sonrakiId!);
      this.#buton(x, sonraki(), 260, 64, t('nextMap'), true, birincil);
      sonsuzTeklifi();
      if (d.mapId !== undefined) {
        this.#buton(x, sonraki(), 220, 56, t('retry'), false, () => d.haritayaGec(d.mapId!));
      }
      this.#buton(x, sonraki(), 220, 56, t('backToMenu'), false, d.anaMenuyeDon);
      return birincil;
    }

    if (d.mapId !== undefined) {
      // Kaybedildi (birincil "Tekrar dene"), ya da kazanıldı+son harita
      // (ikisi de eşit ağırlıkta — tablo bu durumda birincil önermiyor).
      const birincil = (): void => d.haritayaGec(d.mapId!);
      const buyukMu = d.kaybetti;
      this.#buton(x, sonraki(), buyukMu ? 260 : 220, buyukMu ? 64 : 56, t('retry'), buyukMu, birincil);
      sonsuzTeklifi();
      this.#buton(x, sonraki(), 220, 56, t('backToMenu'), false, d.anaMenuyeDon);
      return birincil;
    }

    // `mapId` yok (teorik — `HudScene` her zaman veriyor). Tek çıkış.
    this.#buton(x, sonraki(), 260, 64, t('backToMenu'), true, d.anaMenuyeDon);
    return d.anaMenuyeDon;
  }

  #buton(
    x: number,
    y: number,
    w: number,
    h: number,
    metin: string,
    birincil: boolean,
    onClick: () => void,
  ): void {
    const cerceve = createParchmentButton(this, x, y, w, h, 14);

    this.add
      .text(x, y, metin, {
        fontFamily: 'Spectral, serif',
        fontSize: birincil ? '24px' : '20px',
        color: '#14203A',
      })
      .setOrigin(0.5);

    cerceve.on('pointerup', onClick);
  }

  /**
   * `stop` + `start`: `Game` ve `Hud` tamamen kapanıp temiz başlıyor —
   * `LevelSelectScene`'in kendi başlatma deseniyle aynı (`start('Game',
   * ...)` + `launch('Hud')`). `sleep`/`wake` kullanılsaydı önceki oyunun
   * altını ve kuleleri kalırdı — görevin "bitmedi sayılır eğer" maddesi.
   */
  #haritayaGec(mapId: string, endless = false): void {
    this.scene.stop('Hud');
    this.scene.stop('Game');
    this.scene.start('Game', { mapId, endless });
    this.scene.launch('Hud');
  }

  #anaMenuyeDon(): void {
    this.scene.stop('Hud');
    this.scene.stop('Game');
    this.scene.start('LevelSelect');
  }
}

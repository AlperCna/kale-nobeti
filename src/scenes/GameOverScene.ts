import Phaser from 'phaser';
import { t } from '../util/i18n';
import { SaveSystem, starsFor } from '../systems/SaveSystem';
import { LocalStore } from '../util/storage';
import { BALANCE } from '../data/balance';
import { devHooks } from '../util/devHooks';
import { createParchmentButton } from '../fx/ParchmentFrame';
import { MAPS } from '../data/maps';
import { FRAME_STAR, FRAME_STAR_EMPTY } from '../data/spriteFrames';
import type { RunStatsData } from '../systems/RunStats';

const INK = 0x14203a;

export interface GameOverData {
  readonly won: boolean;
  readonly lives: number;
  /** `M8-T03` — `HudScene` `Game` durmadan önce veriyi kopyalayıp yolluyor. */
  readonly stats?: RunStatsData;
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

  constructor() {
    super('GameOver');
  }

  init(data: Partial<GameOverData> & { mapId?: string }): void {
    this.#data = {
      won: data.won ?? false,
      lives: data.lives ?? 0,
      mapId: data.mapId,
      stats: data.stats,
    };

    // **Sonuç burada kaydediliyor** — `init` her sahne başlatmasında
    // koşuyor, yani tekrar oynanan her el kaydediliyor. `recordResult`
    // yıldızı **düşürmüyor**: kötü bir tekrar kazanılmış ★★★'ü silmiyor.
    if (this.#data.mapId !== undefined) {
      new SaveSystem(new LocalStore()).recordResult(
        this.#data.mapId,
        this.#data.lives,
        this.#data.won,
      );
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
      .text(width / 2, UST + 60, `${lives} / ${BALANCE.startLives} ${t('livesLeft')}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '24px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);

    // §9 eşikleri: 20 → ★★★, 15-19 → ★★, ≤14 → ★.
    // `G07` — atlas karesi (`FRAME_STAR`/`FRAME_STAR_EMPTY`), sistem yazı
    // tipi `★`'ın yerine. Üç yuva hep çiziliyor (dolu+boş) — kazanılmamış
    // yıldızlar da görünür, "bir tanesi daha var" hissi bedava.
    if (won) {
      const yildizSayisi = this.#yildiz(lives);
      const ADIM = 44;
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
      const ust = UST + 150;
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
    const butonUst = this.#data.stats === undefined ? height / 2 + 96 : UST + 330;
    const birincilEylem = this.#butonlariKur(width / 2, butonUst, {
      kaybetti: !won,
      sonrakiVar,
      haritayaGec: (hedefMapId: string) => this.#haritayaGec(hedefMapId),
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

    const dev = devHooks();
    if (dev !== undefined) {
      dev.gameOver = () => ({ won, lives, stars: won ? this.#yildiz(lives) : 0 });
    }
  }

  /** `GAME-DESIGN.md` §9 yıldız tablosu. */
  #yildiz(lives: number): number {
    // Eşikler tek adreste: `SaveSystem.starsFor` (§9). Burada kopya yok.
    return starsFor(lives, this.#data.won);
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
      readonly haritayaGec: (mapId: string) => void;
      readonly anaMenuyeDon: () => void;
      readonly mapId: string | undefined;
      readonly sonrakiId: string | undefined;
    },
  ): () => void {
    const ARA = 64;
    let satir = 0;
    const sonraki = () => y + satir++ * ARA;

    if (d.sonrakiVar && d.sonrakiId !== undefined) {
      // Kazanıldı, sonraki harita açık: Sonraki harita (birincil) ·
      // Tekrar dene · Ana menü.
      const birincil = (): void => d.haritayaGec(d.sonrakiId!);
      this.#buton(x, sonraki(), 260, 64, t('nextMap'), true, birincil);
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
  #haritayaGec(mapId: string): void {
    this.scene.stop('Hud');
    this.scene.stop('Game');
    this.scene.start('Game', { mapId });
    this.scene.launch('Hud');
  }

  #anaMenuyeDon(): void {
    this.scene.stop('Hud');
    this.scene.stop('Game');
    this.scene.start('LevelSelect');
  }
}

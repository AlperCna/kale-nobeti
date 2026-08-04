import Phaser from 'phaser';

/**
 * Font yükleme aşaması.
 *
 * Phaser'ın kendi yükleyicisi web fontlarını beklemiyor — `preload` fontu
 * beklemez, sahne fontsuz çizilir ve sonra zıplar (research/02 §2).
 * Bu yüzden `FontFace` API'si kullanılıyor: harici bağımlılık yok,
 * `Preload`'dan **önce** bitiyor.
 *
 * `scenes/` içinde olduğu için Phaser'ı çalışma zamanında almak serbest
 * (TIER 1 kural 11 yalnız `systems/`, `util/`, `data/`, `types/` için).
 */

/** Yükleme buna takılırsa oyun bekletilmez, sistem serif'ine düşülür. */
const FONT_TIMEOUT_MS = 2000;

/**
 * Google Fonts'un kendi alt küme sınırları (S01).
 *
 * DİKKAT: `latin-ext` `latin`'i **tamamlar, değiştirmez.**
 *   ç ö ü Ç Ö Ü  → latin (Latin-1 Supplement)
 *   ı            → latin (U+0131, açıkça listeli)
 *   İ ş ğ Ş Ğ    → latin-ext
 * Yalnız `latin-ext` indirilseydi temel ASCII harfler eksik kalırdı.
 */
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, ' +
  'U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, ' +
  'U+2212, U+2215, U+FEFF, U+FFFD';

const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, ' +
  'U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, ' +
  'U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

interface FontSpec {
  readonly family: string;
  readonly file: string;
  readonly unicodeRange: string;
}

/** Yol başında `/` YOK — `base: './'` ile portal alt klasöründe de çalışsın. */
const FONTS: readonly FontSpec[] = [
  { family: 'Grenze Gotisch', file: 'assets/fonts/grenze-latin.woff2', unicodeRange: LATIN },
  { family: 'Grenze Gotisch', file: 'assets/fonts/grenze-latin-ext.woff2', unicodeRange: LATIN_EXT },
  { family: 'Spectral', file: 'assets/fonts/spectral-latin.woff2', unicodeRange: LATIN },
  { family: 'Spectral', file: 'assets/fonts/spectral-latin-ext.woff2', unicodeRange: LATIN_EXT },
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // `create` async yapılmıyor: Phaser döndürülen promise'i beklemez.
    // Promise içeride yönetilip bitince sahne değiştiriliyor.
    void this.#loadFonts().finally(() => {
      // M0-T06'da hedef 'Preload' olacak.
      this.scene.start('Bootstrap');
    });
  }

  /**
   * Fontları yükler. **Hiçbir koşulda reddetmez** — başarısızlık oyunu
   * durdurmaz, sistem serif'iyle devam edilir.
   */
  async #loadFonts(): Promise<void> {
    const zamanAsimi = new Promise<void>((resolve) => {
      setTimeout(resolve, FONT_TIMEOUT_MS);
    });

    const yukleme = Promise.all(
      FONTS.map(async (spec) => {
        const face = new FontFace(spec.family, `url(${spec.file})`, {
          unicodeRange: spec.unicodeRange,
          display: 'swap',
        });
        await face.load();
        document.fonts.add(face);
      }),
      // Tek bir font düşerse diğerleri yüklensin diye hata yutuluyor;
      // eksik glif kutucuk olarak görünür, oyun çalışmaya devam eder.
    ).then(
      () => undefined,
      () => undefined,
    );

    await Promise.race([yukleme, zamanAsimi]);
  }
}

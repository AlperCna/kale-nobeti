/**
 * Oyuncuya görünen tüm metinler. S63.
 *
 * Düz nesne DEĞİL, **dil haritası**. Kullanım `t('play')` biçimindedir
 * (bkz. `src/util/i18n.ts`) — çağrı yerleri dil bilmez.
 *
 * `en` şimdilik boş. Çeviri M7'de bir oturumluk iş; **yapıyı** sonradan
 * eklemek `scenes/`'in tamamına dokunmak demek (CLAUDE.md Teknoloji).
 *
 * TIER 1 kural 11: bu dosya Phaser'a dokunmaz.
 */

export type Locale = 'tr' | 'en';

export const DEFAULT_LOCALE: Locale = 'tr';

/** Türkçe tam sözlük. Anahtar kümesini bu tanımlıyor. */
const TR = {
  play: 'Oyna',
  pause: 'Duraklat',
  paused: 'Duraklatıldı',
  resume: 'Devam',
  speed: 'Hız',
  gold: 'altın',
  lives: 'can',
  wave: 'dalga',
  startWave: 'Dalgayı başlat',
  victory: 'Kale ayakta',
  defeat: 'Kale düştü',
  livesLeft: 'kalan can',
  backToMenu: 'Ana menü',
  levelSelect: 'Seviye Seç',
  locked: 'Kilitli',
  back: '← Geri',
  /** `Y07` — oyun sonu ekranı. */
  retry: 'Tekrar dene',
  nextMap: 'Sonraki harita',
  /** `Y14` — kritik varlık yükleme hatası ekranı. */
  assetLoadError: 'Varlıklar yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.',
  reloadPage: 'Sayfayı yenile',

  /**
   * `Y03` — Adım 2: `scenes/`/`fx/`'te kodun içine yazılmış ~20 metin
   * buraya taşındı. `en` şimdilik boş (Adım 3, ayrı bir iş — bkz.
   * `docs/plan/iyilestirme/Y03-i18n-sizintisi.md`).
   */
  towerOkcu: 'Okçu',
  towerTop: 'Top',
  towerBuyu: 'Büyü',
  modeFirst: 'İlk',
  modeLast: 'Son',
  modeStrongest: 'Güçlü',
  modeWeakest: 'Zayıf',
  modeClosest: 'Yakın',
  barracks: 'Kışla',
  sell: 'Sat',
  pauseHint: 'ESC / boşluk',
  buildSpot: 'nokta',
  /** Harita adları — `OPEN-QUESTIONS.md` S75: çevrilecek, özel isim değil. */
  mapDegirmenGecidi: 'Değirmen Geçidi',
  mapTasKopru: 'Taş Köprü',
  mapKulOvasi: 'Kül Ovası',
  settingsTitle: 'Ayarlar',
  sound: 'Ses',
  screenShake: 'Ekran sarsıntısı',
  effects: 'Efekt yoğunluğu',
  on: 'Açık',
  off: 'Kapalı',
  effectLow: 'Düşük',
  effectFull: 'Tam',
} as const;

export type StringKey = keyof typeof TR;

/**
 * `Record<Locale, Record<StringKey, string>>` tipi, `en`'in **tam olarak
 * aynı anahtarlara** sahip olmasını derleyicide zorunlu kılıyor.
 * Bir anahtar eklenip `en`'e eklenmezse `npm run typecheck` kırılır.
 */
export const STRINGS: Record<Locale, Record<StringKey, string>> = {
  tr: TR,
  en: {
    play: '',
    pause: '',
    paused: '',
    resume: '',
    speed: '',
    gold: '',
    lives: '',
    wave: '',
    startWave: '',
    victory: '',
    defeat: '',
    livesLeft: '',
    backToMenu: '',
    levelSelect: '',
    locked: '',
    back: '',
    retry: '',
    nextMap: '',
    assetLoadError: '',
    reloadPage: '',
    towerOkcu: '',
    towerTop: '',
    towerBuyu: '',
    modeFirst: '',
    modeLast: '',
    modeStrongest: '',
    modeWeakest: '',
    modeClosest: '',
    barracks: '',
    sell: '',
    pauseHint: '',
    buildSpot: '',
    mapDegirmenGecidi: '',
    mapTasKopru: '',
    mapKulOvasi: '',
    settingsTitle: '',
    sound: '',
    screenShake: '',
    effects: '',
    on: '',
    off: '',
    effectLow: '',
    effectFull: '',
  },
};

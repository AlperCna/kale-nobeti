/**
 * Oyuncuya görünen tüm metinler. S63.
 *
 * Düz nesne DEĞİL, **dil haritası**. Kullanım `t('play')` biçimindedir
 * (bkz. `src/util/i18n.ts`) — çağrı yerleri dil bilmez.
 *
 * `Y03` Adım 3 (2026-09-13): `en` dolduruldu. Etkin dil artık çalışma
 * zamanında değişebiliyor (`i18n.setLocale`, `Settings.locale`);
 * `DEFAULT_LOCALE` bundan sonra **geri düşme** dili anlamına geliyor,
 * "açılıştaki dil" değil — onu `Settings` tarayıcıdan tespit ediyor.
 *
 * TIER 1 kural 11: bu dosya Phaser'a dokunmaz.
 */

export type Locale = 'tr' | 'en';

/**
 * Bir anahtarın karşılığı boşsa düşülecek dil. Oyunun yazıldığı dil bu
 * olduğu için `tr`: yeni bir anahtar eklenip `en`'i unutulursa oyuncu boş
 * buton değil Türkçe metin görür.
 */
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
  /**
   * Sayıdan sonra gelen "dalga" (`12 dalga`). Türkçede `wave` ile aynı
   * kelime ama İngilizcede sayıdan sonra çoğullanıyor (`12 waves`) —
   * ayrı anahtar olmasının tek sebebi bu.
   */
  waves: 'dalga',
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
   * buraya taşındı.
   */
  towerOkcu: 'Okçu',
  towerTop: 'Top',
  towerBuyu: 'Büyü',
  /**
   * Hedefleme modları. Türkçesi zaten kısaltılmış (`Güçlü`, `En Güçlü`
   * değil) — İngilizcesi de aynı terse kalıyor (`Strong`, `Strongest`
   * değil). Sebep teknik: bu beş buton 46 px genişlikte ve 50 px
   * aralıkta (`fx/BuildMenu.ts`), `Strongest` komşusuna taşardı.
   */
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
  mapKarGecidi: 'Kar Geçidi',
  settingsTitle: 'Ayarlar',
  sound: 'Ses',
  screenShake: 'Ekran sarsıntısı',
  effects: 'Efekt yoğunluğu',
  on: 'Açık',
  off: 'Kapalı',
  effectLow: 'Düşük',
  effectFull: 'Tam',
  /** `Y09` — ayarlardaki ipucu açma/kapama anahtarı. */
  hints: 'İpuçları',
  /** `Y09` — S65'in dayandığı mekanik: erken başlatma bonusu. */
  hintEarlyStart: 'Erken başlat, kalan süre altın olur',
  /** `Y09` — S69'un ölçtüğü mekanik: toplanma noktası sürükleme. */
  hintDragRally: 'Bayrağı sürükle',

  /**
   * `Y03` Adım 3 — dil seçimi. Dil **adları çevrilmiyor**: her dil kendi
   * adıyla yazılıyor (`Türkçe` / `English`), yani iki değer de iki
   * sözlükte aynı. Yaygın i18n pratiği — İngilizce arayüzde "Turkish"
   * yazsaydı, Türkçe bilen ama İngilizce bilmeyen oyuncu kendi dilini
   * listede tanıyamazdı.
   */
  language: 'Dil',
  langTr: 'Türkçe',
  langEn: 'English',

  /**
   * `Y03` Adım 3 — T3 dal adları (**S76 burada kapandı**). Önceden
   * `data/towers.ts`/`data/barracks.ts` içinde düz Türkçe dizeydiler;
   * artık `branchNameKey` ile buraya bağlılar. Çeviriler sözlük çevirisi
   * değil **ürün kararı**: `Kundakçı` → `Incendiary` (yakan ok, "kundakçı"
   * kişiyi anlatıyor ama bir kule dalı adı olarak İngilizcede tuhaf
   * kaçıyor), `Buz` → `Frost` (`Ice` yerine — tezhip/ortaçağ tonu).
   */
  branchSharpshooter: 'Keskin Nişancı',
  branchIncendiary: 'Kundakçı',
  branchMortar: 'Havan',
  branchPowderKeg: 'Barut Fıçısı',
  branchLightning: 'Yıldırım',
  branchFrost: 'Buz',
  branchPaladin: 'Paladin',
  branchOutlaws: 'Haydutlar',

  /**
   * Kule bilgi paneli etiketleri — oyuncu geri bildirimi (2026-09-14):
   * panel yalnız sayı gösteriyordu ("61.16.6 / 150 / 260 / +49"), hiçbir
   * göstergenin adı yoktu. §11'in yedi göstergesi artık adlandırılmış.
   * `infoRate` kısa: değer kolonu geniş, etiket kolonu dar.
   */
  infoDamage: 'Hasar',
  infoRate: 'Atış/sn',
  infoRange: 'Menzil',
  infoCoverage: 'Kapsanan yol',
  infoUpgrade: 'Yükseltme',
  infoRefund: 'Satış iadesi',
  infoPhysical: 'Fiziksel',
  infoMagic: 'Büyü',
  infoHitsAir: 'Uçana vurur',
  infoNoAir: 'Uçana vurmaz',
  infoDpsVs: 'Seçili düşmana DPS',

  /**
   * Yetenek butonu etiketleri — oyuncu geri bildirimi (2026-09-14):
   * İngilizce arayüzde "Meteor / Takviye" Türkçe kalmıştı. `fx/AbilityButtons.ts`
   * içinde sabit dizeydiler; bekçi k.12 yakalayamadı çünkü ikisinde de
   * aksanlı harf yok — dosyada yazılı kör nokta, tam öngörüldüğü gibi.
   */
  abilityMeteor: 'Meteor',
  abilityTakviye: 'Takviye',

  /**
   * `M8-T02` — satın almadan ÖNCE kule rolü. Oyuncu geri bildirimi
   * (2026-09-14): dört aile "isim + fiyat" dışında hiçbir şey
   * söylemiyordu (Y09'un kendi tablosunda da ❌ işaretliydi).
   *
   * Metinler `data/towers.ts`'in `role` alanıyla aynı bilgi ama oradaki
   * Türkçe dizeler **doküman üreticisinin** (`kurallar.mjs`) girdisi;
   * arayüzdeki kopya çevrilebilir olmak zorunda, o yüzden anahtarla
   * burada (S76 ile birebir aynı gerekçe).
   */
  roleOkcu: 'Tek hedef, hızlı, ucuz. Zırha karşı zayıf.',
  roleTop: 'Alan hasarı, yavaş. Kalabalığın cevabı. Uçana vurmaz.',
  roleBuyu: 'Zırh delen. Büyü dirençli düşmanlara zayıf.',
  roleKisla: 'Asker çıkarır, yolu tıkar. Bayrağı sürükleyerek konumlandır.',
  /** "?" düğmesi — dokunmatikte imleç yok, roller böyle açılıyor. */
  infoToggle: '?',

  /**
   * `M8-T02` — dalga telgrafındaki düşman adları. Telgraf §7'nin zorunlu
   * özelliği ("körlemesine oynamak türün en yaygın şikâyeti") ama yalnız
   * ikon + adet gösteriyordu; ikonu tanımayan oyuncu için bilgi değil
   * süstü. Üstüne gelince ad + savunma özeti çıkıyor.
   */
  enemyGoblin: 'Goblin',
  enemyOrkSavasci: 'Ork Savaşçı',
  enemyKurtBinicisi: 'Kurt Binicisi',
  enemyHarpi: 'Harpi',
  enemyZirhliOrk: 'Zırhlı Ork',
  enemySaman: 'Şaman',
  enemyTrol: 'Trol',
  enemyOrumcekAna: 'Örümcek Ana',
  enemyOrumcekYavrusu: 'Örümcek Yavrusu',
  enemyOgreSef: 'Ogre Şef',
  /** Savunma özeti parçaları — sayılar `enemies.ts`'ten geliyor. */
  statArmor: 'zırh',
  statResist: 'büyü direnci',
  statFlying: 'uçar',
  statRegen: 'yenilenir',
  statSplit: 'bölünür',
  statHeals: 'iyileştirir',

  /** `M8-T03` — duraklatma menüsü ve oyun sonu istatistikleri. */
  restart: 'Yeniden başla',
  settingsButton: 'Ayarlar',
  statKills: 'Öldürülen',
  statGoldEarned: 'Kazanılan altın',
  statGoldSpent: 'Harcanan altın',
  statTowers: 'Kurulan yapı',
  statDuration: 'Süre',
  statPeakWave: 'Ulaşılan dalga',

  /**
   * Oyuncu geri bildirimi (2026-09-14) ile eklenen iki ipucu. İkisi de
   * Y09 altyapısıyla tek seferlik: hedefleme satırı ilk açıldığında ve
   * ilk uçan dalga yaklaşınca (kesikli rota görünürken).
   * "Yalnız Okçu ve Büyü tam hasar verir" — `towers.ts`: okçu ve büyü
   * `airMultiplier` 1, Top 0 (yalnız Barut Fıçısı 0,5). Cümle doğru.
   */
  hintTargetModes:
    'Hedefleme — İlk: yolda en öndeki · Son: en gerideki · Güçlü: en çok canı olan · Zayıf: en az canı olan · Yakın: kuleye en yakın',
  hintFlyers: 'Kesikli hat uçanların rotası — yolu izlemezler. Yalnız Okçu ve Büyü onlara tam hasar verir.',
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
    play: 'Play',
    pause: 'Pause',
    paused: 'Paused',
    resume: 'Resume',
    speed: 'Speed',
    gold: 'gold',
    lives: 'lives',
    wave: 'wave',
    waves: 'waves',
    startWave: 'Start wave',
    victory: 'The castle stands',
    defeat: 'The castle has fallen',
    livesLeft: 'lives left',
    backToMenu: 'Main menu',
    levelSelect: 'Select Level',
    locked: 'Locked',
    back: '← Back',
    retry: 'Try again',
    nextMap: 'Next map',
    assetLoadError: 'Assets failed to load. Check your connection and reload the page.',
    reloadPage: 'Reload page',
    towerOkcu: 'Archer',
    towerTop: 'Cannon',
    towerBuyu: 'Magic',
    modeFirst: 'First',
    modeLast: 'Last',
    modeStrongest: 'Strong',
    modeWeakest: 'Weak',
    modeClosest: 'Near',
    barracks: 'Barracks',
    sell: 'Sell',
    pauseHint: 'ESC / space',
    buildSpot: 'spots',
    mapDegirmenGecidi: 'Mill Pass',
    mapTasKopru: 'Stone Bridge',
    mapKulOvasi: 'Ash Plain',
    mapKarGecidi: 'Snow Pass',
    settingsTitle: 'Settings',
    sound: 'Sound',
    screenShake: 'Screen shake',
    effects: 'Effects',
    on: 'On',
    off: 'Off',
    effectLow: 'Low',
    effectFull: 'Full',
    hints: 'Hints',
    hintEarlyStart: 'Start early — leftover time turns to gold',
    hintDragRally: 'Drag the flag',
    language: 'Language',
    langTr: 'Türkçe',
    langEn: 'English',
    branchSharpshooter: 'Sharpshooter',
    branchIncendiary: 'Incendiary',
    branchMortar: 'Mortar',
    branchPowderKeg: 'Powder Keg',
    branchLightning: 'Lightning',
    branchFrost: 'Frost',
    branchPaladin: 'Paladin',
    branchOutlaws: 'Outlaws',
    infoDamage: 'Damage',
    infoRate: 'Shots/s',
    infoRange: 'Range',
    infoCoverage: 'Path covered',
    infoUpgrade: 'Upgrade',
    infoRefund: 'Sell refund',
    infoPhysical: 'Physical',
    infoMagic: 'Magic',
    infoHitsAir: 'Hits flyers',
    infoNoAir: 'No flyers',
    infoDpsVs: 'DPS vs. selected',
    abilityMeteor: 'Meteor',
    abilityTakviye: 'Reinforce',
    roleOkcu: 'Single target, fast, cheap. Weak against armor.',
    roleTop: 'Splash damage, slow. The answer to crowds. Cannot hit flyers.',
    roleBuyu: 'Pierces armor. Weak against magic-resistant enemies.',
    roleKisla: 'Spawns soldiers that block the path. Drag the flag to position them.',
    infoToggle: '?',
    enemyGoblin: 'Goblin',
    enemyOrkSavasci: 'Orc Warrior',
    enemyKurtBinicisi: 'Wolf Rider',
    enemyHarpi: 'Harpy',
    enemyZirhliOrk: 'Armored Orc',
    enemySaman: 'Shaman',
    enemyTrol: 'Troll',
    enemyOrumcekAna: 'Spider Mother',
    enemyOrumcekYavrusu: 'Spiderling',
    enemyOgreSef: 'Ogre Chief',
    statArmor: 'armor',
    statResist: 'magic resist',
    statFlying: 'flies',
    statRegen: 'regenerates',
    statSplit: 'splits',
    statHeals: 'heals',
    restart: 'Restart',
    settingsButton: 'Settings',
    statKills: 'Kills',
    statGoldEarned: 'Gold earned',
    statGoldSpent: 'Gold spent',
    statTowers: 'Buildings placed',
    statDuration: 'Time',
    statPeakWave: 'Wave reached',
    hintTargetModes:
      'Targeting — First: furthest along the path · Last: furthest back · Strong: most HP · Weak: least HP · Near: closest to the tower',
    hintFlyers: 'The dashed line is the flyers’ route — they ignore the path. Only Archer and Magic deal full damage to them.',
  },
};

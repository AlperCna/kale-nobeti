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

  /**
   * Seçili hedefleme modunun bir satırlık açıklaması — oyuncu geri
   * bildirimi: "first last strong weak near ne anlama geliyor belli
   * olmuyor". Beş düğme oyunun en derin mekaniği ve tek kelime
   * söylenmiyordu.
   *
   * Metinler `TargetingSystem.skor`'dan **okunarak** yazıldı, tahminle
   * değil; skor en KÜÇÜK olan seçiliyor:
   *   first     → `remainingDistance`   en az kalan yol = kaleye en yakın
   *   last      → `-remainingDistance`  en çok kalan yol = yola en son giren
   *   strongest → `-maxHp`              en yüksek AZAMİ can
   *   weakest   → `hp`                  en düşük ANLIK can
   *   closest   → `distSq`              kuleye en yakın
   *
   * Güçlü/Zayıf arasındaki asimetri bilerek (§4.5: azami can kararlı
   * hedef verir) ve oyuncunun tahmin edemeyeceği tek şey o — bu yüzden
   * iki açıklamada da hangi canın kastedildiği yazılı.
   */
  modeFirstDesc: 'Kaleye en yakın düşmanı vurur',
  modeLastDesc: 'Yola en son gireni vurur',
  modeStrongestDesc: 'En dayanıklı türü vurur (azami cana göre)',
  modeWeakestDesc: 'En çok yaralanmışı vurur (anlık cana göre)',
  modeClosestDesc: 'Kuleye en yakın düşmanı vurur',
  barracks: 'Kışla',
  sell: 'Sat',
  sellConfirm: 'Onayla',
  pauseHint: 'ESC / boşluk',
  buildSpot: 'nokta',
  /** Harita adları — `OPEN-QUESTIONS.md` S75: çevrilecek, özel isim değil. */
  mapDegirmenGecidi: 'Değirmen Geçidi',
  mapTasKopru: 'Taş Köprü',
  mapKulOvasi: 'Kül Ovası',
  mapKarGecidi: 'Kar Geçidi',
  mapKadimHarabe: 'Kadim Harabe',
  mapSisliBataklik: 'Sisli Bataklık',
  endlessMode: 'Sonsuz moda devam',
  endlessReached: 'Ulaşılan dalga',
  endlessBest: 'En iyi',
  endlessNewRecord: 'Yeni rekor!',

  // --- M8-T07 başarımlar ---
  continueRun: 'Devam et',
  achievements: 'Başarımlar',
  achUnlocked: 'Başarım açıldı',
  achFirstTower: 'İlk Nöbetçi',
  achFirstTowerDesc: 'İlk kuleni kur.',
  achFirstBarracks: 'Saf Tut',
  achFirstBarracksDesc: 'İlk kışlanı kur.',
  achFirstTier3: 'Usta İşi',
  achFirstTier3Desc: 'Bir kuleyi üçüncü kademeye yükselt.',
  achKill100: 'Yüzbaşı',
  achKill100Desc: 'Toplam 100 düşman öldür.',
  achKill1000: 'Sur Bekçisi',
  achKill1000Desc: 'Toplam 1000 düşman öldür.',
  achMeteor5: 'Gökten Taş',
  achMeteor5Desc: 'Tek Meteor ile 5 düşmana vur.',
  // `M23` — oyunun `M8` sonrası katmanlarına işaret eden dört başarım.
  /**
   * `M25` — erken başlatmanın **risk** tarafı. Sayı ayrı (`BitmapText`,
   * TIER 1 kural 7); bu kelime bir kez yazılıp değişmiyor.
   */
  earlyRisk: 'sahada',
  achBothBranches: 'İki Yol',
  achBothBranchesDesc: 'Aynı elde hem 3a hem 3b dalından kule kur.',
  achBothAbilities: 'Çifte El',
  achBothAbilitiesDesc: 'Aynı elde iki yeteneği de kullan.',
  achTargeting: 'Nişan Al',
  achTargetingDesc: 'Bir kulenin hedefleme modunu aç.',
  achSawBurrow: 'Yeraltından',
  achSawBurrowDesc: 'Bir Tünelci’nin yere girişine tanık ol.',
  achFirstWin: 'Kale Ayakta',
  achFirstWinDesc: 'Bir haritayı bitir.',
  achAllMaps: 'Sefer Tamam',
  achAllMapsDesc: 'Bütün haritaları bitir.',
  achAllStars: 'Tam Not',
  achAllStarsDesc: 'Bütün haritalarda üç yıldız kazan.',
  achFlawless: 'Tek Bir Adım Bile',
  achFlawlessDesc: 'Bir haritayı hiç can kaybetmeden bitir.',
  achNoSell: 'Sözünden Dönme',
  achNoSellDesc: 'Bir haritayı hiç kule satmadan bitir.',
  achEndless20: 'Bitmeyen Gece',
  achEndless20Desc: 'Sonsuz modda 20. dalgaya ulaş.',
  achLocked: 'Kilitli',
  bossIncoming: 'Ogre Şef geliyor',
  music: 'Müzik',
  sfx: 'Ses efekti',
  difficulty: 'Zorluk',
  diffKolay: 'Kolay',
  diffNormal: 'Normal',
  diffZor: 'Zor',
  diffNoStars: 'Kolay modda yıldız kaydedilmez',
  rotateDevice: 'Cihazı yatay çevirin',
  rotateHint: 'Kale Nöbeti yatay ekranda oynanır',
  fullscreen: 'Tam ekran',
  tagline: 'Kale senin nöbetinde',
  howToPlay: 'Nasıl oynanır',
  howToTitle: 'Nasıl oynanır',
  /**
   * `M87` — sayfa on satırlık bir duvardı; üç başlık taramanın ölçüsünü
   * veriyor. Başlıklar oyunun kendi kavramları: ne yaparsın · neyle
   * yaparsın · kime karşı.
   */
  howToSecBasics: 'Temel',
  howToSecTowers: 'Kuleler ve yetenekler',
  howToSecEnemies: 'Düşmanlar',
  howTo1: 'Altın dairelere dokunup kule kur. Her ailenin işi farklı:',
  howTo2: 'Okçu hızlı ve ucuz · Top alan hasarı · Büyü zırhı delen · Kışla yolu tıkar',
  howTo3: 'Düşman kaleye varırsa can gider. Can biterse harita kaybedilir.',
  howTo4: 'Kule menüsünde hedefleme seç: ilk, son, güçlü, zayıf, yakın.',
  howTo5: 'Meteor ve Takviye bekleme süreli; dalga arasında değil, kalabalıkta kullan.',
  /**
   * `M99` — S117'nin gider kalemi. Sayfa mekanik eklenince onu saymayan
   * metinleri bırakmamalı (`M88`'in dersi): düğme yalnız alınabilirken
   * göründüğü için oyuncu onu hiç görmeden geçebilir.
   */
  howTo11:
    'Yeteneğin üstünde fiyat çıkarsa yükseltebilirsin: Meteor daha sert vurur, Takviye daha çok asker çağırır. Geç haritalarda altın tahtaya yetmekten fazlasını kazandırıyor.',
  /**
   * **`M28` — eski kuralı öğretiyordu.** `M16`'dan önce erken basmak
   * bedelsizdi ve bu satır doğruydu; `M16` dalgaları üst üste bindirdi
   * ve ölçüm hep basmanın harita 5-6'yı geçilemez yaptığını söylüyor.
   * Satır yalnız ödülü anlatınca oyun yanlış ders veriyordu.
   */
  howTo6:
    'Hazırlık sayacını erken bitirmek altın kazandırır — ama yeni dalga sahada kalanların üstüne biner. Düğmede iki sayı da yazıyor.',
  /**
   * `M87` — duraklatma düğmesi gelince bu satır **eski kuralı**
   * anlatıyordu: dokunmatikte klavye yok, yani oyuncuya “duraklatamazsın”
   * demiş oluyordu. CLAUDE.md TIER 2'nin “oyuncu metinleri” sınıfı.
   */
  howTo7: 'Üstteki duraklatma düğmesi — ya da ESC/boşluk — oyunu durdurur; menüde yeniden başlat ve ana menü de var.',
  /** `M10` — sinerji oyuncuya başka hiçbir yerde görünmüyor. */
  howTo8: 'Yavaşlatılmış düşman fiziksel hasardan daha çok etkilenir: Buz kulesi, Okçu ve Top ile birlikte çalışır.',
  /**
   * `M88` — ikinci cümle **yalnız harita 5'te doğruydu** ama kural gibi
   * yazılıyordu: hızlanma `BOSS_YETENEGI` tablosunda yalnız
   * `kadim-harabe`ye bağlı (`enemies.ts`). İlk dört haritanın bossu düz;
   * oyuncu “benim bossum neden hızlanmıyor” diye düşünüyordu. Cümle
   * boss numaralarının anlatıldığı `howTo10`'a taşındı ve haritasıyla
   * söylendi.
   */
  howTo9: 'Mavi halka buz kalkanı; erimeden cana hasar geçmez.',
  /**
   * **`M28` — `M12` ve `M13`'ün verb'leri buraya hiç girmemişti.**
   * `M10`'un kalkanı ve boss evresi `howTo8/9` ile eklenmişti; sonraki
   * iki mekanik atlandı. Oyun içi ipucu yeraltı geçişini gösteriyor
   * ama bu sayfa "bir şeyi kaçırdım" diyenin baktığı yer.
   */
  howTo10:
    'Bazı düşmanların kendi numarası var: Tünelci yolun ortasında yeraltına iner ve hedeflenemez. Son iki haritanın bossu da öyle — Kadim Harabe’de canı yarıya inince hızlanır, Sisli Bataklık’ta yandaş çağırır.',
  lockedHint: 'Önce önceki haritayı bitir',
  endlessBestShort: 'Sonsuz',
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
  /** `M28` — `howTo6` ile aynı sebep: takasın iki yakası da yazıyor. */
  hintEarlyStart:
    'Erken başlat: kalan süre altına döner. Ama yeni dalga, sahada kalanların üstüne gelir.',
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
  infoRange: 'Menzil (px)',
  infoCoverage: 'Yolun kapsanan payı',
  infoUpgrade: 'Yükseltme',
  saveFailed: 'İlerleme kaydedilemiyor — tarayıcın depolamayı engelliyor',
  infoMaxTier: 'Son kademe',
  /** `M11-T01` — kule etkisi satırı. Oyuncu yanma/yavaşlatmayı hiç göremiyordu. */
  /**
   * `M11-T02` — **patlama yarıçapı.** Faz 2'de Top'un iki dalı arasındaki
   * takas tek eksene indi (menzil ↔ yarıçap) ve oyuncu o iki sayıdan
   * **yalnız birini** görüyordu: panelde patlama satırı yoktu. Görünmeyen
   * bir takas seçim değil, zar atışıdır.
   */
  infoSplash: 'Patlama (px)',
  infoEffect: 'Etki',
  infoEffectNone: '—',
  /**
   * `M11-T02` (S93) — T3 dal menüsünün özet satırı. Kısa tutuluyor:
   * iki dal, iki satır, menü genişliğine (468 px) sığmak zorunda.
   */
  sumDps: 'DPS',
  sumRange: 'menzil',
  sumSplash: 'patlama',
  /** Kışla dalı özeti — aynı satır, farklı alanlar (asker/can/diriliş). */
  sumSoldiers: 'asker',
  sumHp: 'can',
  sumRespawn: 'sn diriliş',
  sumEvasion: 'kaçınma',
  infoEffectBurn: 'Yanma',
  infoEffectSlow: 'Yavaşlatma',
  infoEffectChain: 'Zincir',
  infoBranchChoice: 'Dal seçimi',
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
  enemyTunelci: 'Tünelci',
  statBurrow: 'yeraltından geçer',
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
  statEnrage: 'yarısında hızlanır',
  statSummon: 'yandaş çağırır',

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
   * `airMultiplier` 1, Top T1/T2 0 ve **iki T3 dalı da 0,5** (`M11`
   * Faz 2, S91). Cümle hâlâ doğru: *tam* hasarı yalnız o ikisi veriyor.
   */
  /**
   * `Güçlü` eskiden "en çok canı olan" diyordu ve bu **yanlıştı**:
   * `TargetingSystem` orada `-maxHp` kullanıyor, yani yaralanmayı değil
   * türün dayanıklılığını (§4.5 — azami can kararlı hedef verir).
   * `Zayıf` ise gerçekten `hp`, yani anlık can. Asimetri bilerek ve
   * oyuncunun tahmin edemeyeceği tek şey o; iki modda da hangi canın
   * kastedildiği artık yazılı. `modeStrongestDesc`/`modeWeakestDesc` ile
   * aynı cümleyi kuruyor — oyun iki farklı şey söylemesin.
   */
  hintTargetModes:
    'Hedefleme — İlk: yolda en öndeki · Son: en gerideki · Güçlü: en dayanıklı tür (azami can) · Zayıf: en yaralı (anlık can) · Yakın: kuleye en yakın',
  hintFlyers: 'Kesikli hat uçanların rotası — yolu izlemezler. Yalnız Okçu ve Büyü onlara tam hasar verir.',
  hintShield: 'Mavi halka buz kalkanı — erimeden cana hasar geçmiyor. Ağır vuruş kalkanı daha çabuk kırar.',
  hintBurrow: 'Soluk düşman yeraltında — kuleler onu hedef alamaz. Patlama ve yanma yine değer; yolun ilerisini tutan kuleler onu bekler.',
  /**
   * `M30` — halka neyi gösterdiğini kendi başına anlatmıyor.
   * Karşı hamle cümlenin **içinde**: oyuncu sırayı değiştirmeli.
   */
  hintHeal:
    'Çemberli düşman Şaman — çemberin içindeki herkesin canını sürekli tazeliyor. Önce onu düşür, kalabalık çok daha çabuk erir.',
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
    modeFirstDesc: 'Targets the one nearest the keep',
    modeLastDesc: 'Targets the one that entered last',
    modeStrongestDesc: 'Targets the toughest type (by max health)',
    modeWeakestDesc: 'Targets the most wounded (by current health)',
    modeClosestDesc: 'Targets the one nearest this tower',
    barracks: 'Barracks',
    sell: 'Sell',
    sellConfirm: 'Confirm',
    pauseHint: 'ESC / space',
    buildSpot: 'spots',
    mapDegirmenGecidi: 'Mill Pass',
    mapTasKopru: 'Stone Bridge',
    mapKulOvasi: 'Ash Plain',
    mapKarGecidi: 'Snow Pass',
    mapKadimHarabe: 'Ancient Ruin',
    mapSisliBataklik: 'Misty Marsh',
    endlessMode: 'Continue endless',
    endlessReached: 'Wave reached',
    endlessBest: 'Best',
    endlessNewRecord: 'New record!',

    continueRun: 'Continue',
    achievements: 'Achievements',
    achUnlocked: 'Achievement unlocked',
    achFirstTower: 'First Watch',
    achFirstTowerDesc: 'Build your first tower.',
    achFirstBarracks: 'Hold the Line',
    achFirstBarracksDesc: 'Build your first barracks.',
    achFirstTier3: "Master's Work",
    achFirstTier3Desc: 'Upgrade a tower to tier three.',
    achKill100: 'Centurion',
    achKill100Desc: 'Defeat 100 enemies in total.',
    achKill1000: 'Wall Warden',
    achKill1000Desc: 'Defeat 1000 enemies in total.',
    achMeteor5: 'Stone from the Sky',
    achMeteor5Desc: 'Hit 5 enemies with a single Meteor.',
    earlyRisk: 'on field',
    achBothBranches: 'Two Roads',
    achBothBranchesDesc: 'Build both a 3a and a 3b branch in one run.',
    achBothAbilities: 'Both Hands',
    achBothAbilitiesDesc: 'Use both abilities in one run.',
    achTargeting: 'Take Aim',
    achTargetingDesc: 'Open a tower’s targeting mode.',
    achSawBurrow: 'From Below',
    achSawBurrowDesc: 'Witness a Tunneler go underground.',
    achFirstWin: 'The Keep Stands',
    achFirstWinDesc: 'Complete a map.',
    achAllMaps: 'Campaign Complete',
    achAllMapsDesc: 'Complete every map.',
    achAllStars: 'Full Marks',
    achAllStarsDesc: 'Earn three stars on every map.',
    achFlawless: 'Not One Step',
    achFlawlessDesc: 'Complete a map without losing a life.',
    achNoSell: 'No Take-Backs',
    achNoSellDesc: 'Complete a map without selling a tower.',
    achEndless20: 'The Long Night',
    achEndless20Desc: 'Reach wave 20 in endless mode.',
    achLocked: 'Locked',
    bossIncoming: 'The Ogre Chief approaches',
    music: 'Music',
    sfx: 'Sound effects',
    difficulty: 'Difficulty',
    diffKolay: 'Easy',
    diffNormal: 'Normal',
    diffZor: 'Hard',
    diffNoStars: 'Stars are not saved on Easy',
    rotateDevice: 'Please rotate your device',
    rotateHint: 'Kale Nöbeti is played in landscape',
    fullscreen: 'Fullscreen',
    tagline: 'The keep is yours to hold',
    howToPlay: 'How to play',
    howToTitle: 'How to play',
    howToSecBasics: 'Basics',
    howToSecTowers: 'Towers and abilities',
    howToSecEnemies: 'Enemies',
    howTo1: 'Tap a gold circle to build a tower. Each family does a different job:',
    howTo2: 'Archer fast and cheap · Cannon splash · Magic pierces armour · Barracks blocks the road',
    howTo3: 'Enemies reaching the keep cost lives. Run out and the map is lost.',
    howTo4: 'Pick a targeting mode in the tower menu: first, last, strong, weak, near.',
    howTo5: 'Meteor and Reinforcements are on cooldown; save them for a crowd.',
    howTo11:
      'When a price appears above an ability you can upgrade it: Meteor hits harder, Reinforcements bring more soldiers. On later maps gold outgrows what the board can spend.',
    howTo6:
      'Ending the prep timer early earns gold — but the new wave arrives on top of whoever is still on the field. The button shows both numbers.',
    howTo7: 'The pause button up top — or ESC/space — stops the game; the menu also has restart and main menu.',
    howTo8: 'Slowed enemies take more physical damage: the Frost tower pairs with Archer and Cannon.',
    howTo9: 'A blue ring is a frost shield; nothing reaches health until it breaks.',
    howTo10:
      'Some enemies have a trick of their own: the Tunneler burrows mid-path and cannot be targeted. So do the last two bosses — the one in Ancient Ruin speeds up at half health, the one in Misty Marsh summons help.',
    lockedHint: 'Finish the previous map first',
    endlessBestShort: 'Endless',
    settingsTitle: 'Settings',
    sound: 'Sound',
    screenShake: 'Screen shake',
    effects: 'Effects',
    on: 'On',
    off: 'Off',
    effectLow: 'Low',
    effectFull: 'Full',
    hints: 'Hints',
    hintEarlyStart:
      'Start early: leftover time turns to gold. But the next wave arrives on top of whoever is still on the field.',
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
    infoRange: 'Range (px)',
    infoCoverage: 'Share of path covered',
    infoUpgrade: 'Upgrade',
    saveFailed: 'Progress is not being saved — your browser is blocking storage',
    infoMaxTier: 'Max tier',
    infoSplash: 'Splash (px)',
    infoEffect: 'Effect',
    infoEffectNone: '—',
    sumDps: 'DPS',
    sumRange: 'range',
    sumSplash: 'splash',
    sumSoldiers: 'soldiers',
    sumHp: 'HP',
    sumRespawn: 's respawn',
    sumEvasion: 'evasion',
    infoEffectBurn: 'Burn',
    infoEffectSlow: 'Slow',
    infoEffectChain: 'Chain',
    infoBranchChoice: 'Branch choice',
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
    enemyTunelci: 'Tunneler',
    statBurrow: 'burrows',
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
    statEnrage: 'enrages at half HP',
    statSummon: 'summons minions',
    restart: 'Restart',
    settingsButton: 'Settings',
    statKills: 'Kills',
    statGoldEarned: 'Gold earned',
    statGoldSpent: 'Gold spent',
    statTowers: 'Buildings placed',
    statDuration: 'Time',
    statPeakWave: 'Wave reached',
    hintTargetModes:
      'Targeting — First: furthest along the path · Last: furthest back · Strong: toughest type (max HP) · Weak: most wounded (current HP) · Near: closest to the tower',
    hintFlyers: 'The dashed line is the flyers’ route — they ignore the path. Only Archer and Magic deal full damage to them.',
    hintShield: 'The blue ring is a frost shield — no damage reaches health until it breaks. Heavy hits break it faster.',
    hintBurrow: 'A faded enemy is underground — towers cannot target it. Splash and burn still land; towers further along the path will catch it.',
    hintHeal:
      'The ringed enemy is a Shaman — it keeps restoring health to everyone inside the ring. Drop it first and the crowd melts far faster.',
  },
};

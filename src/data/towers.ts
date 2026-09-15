/**
 * Kule verisi. TIER 1 kural 1: sayı burada, sistem dosyalarında değil.
 *
 * Her sayı `docs/GAME-DESIGN.md` §4.1-§4.3 tablolarından **birebir**.
 * Bir kulenin hasarını değiştirmek için yalnız bu dosyaya dokunulur.
 *
 * **Üç aile × 4 kademe = 12 kademe.** Kışla (§4.4) M5'te; kule değil,
 * asker çıkaran ayrı bir mekanik.
 */

import type { TargetMode, TierIndex, TowerDef, TowerTier } from '../types/tower';

/**
 * Okçu Kulesi — tek hedef, hızlı, ucuz. Fiziksel hasar, uçana vurur,
 * zırha karşı zayıf (§4.1).
 */
export const OKCU: TowerDef = {
  id: 'okcu',
  role: 'Tek hedef, hızlı, ucuz. Zırha karşı zayıf.',
  damageType: 'physical',
  /**
   * **`M11` Faz 5 (S95) — Okçu ÖLÜ AİLEYDİ, hasarı yükseldi.**
   *
   * T1 6 → **8**, T2 10 → **14**, Keskin Nişancı 26 → **34**,
   * Kundakçı'nın yanması saniyede 7 → **11**.
   *
   * Ölçüm: tahta maliyet dahil tek aileye zorlandığında (yani ucuz
   * aileye hak ettiği fazladan kule verildiğinde bile) Okçu dört
   * haritada **14 / 23 / 28 / 33** can kaybettiriyordu; karışık tahta
   * 4 / 7 / 13 / 15. Yani oyuncunun Okçu kurması her zaman hataydı.
   *
   * Sebep yapısaldı: Okçu'nun **hiçbir çarpanı yok**. Top patlıyor
   * (bir atış N düşmana), Büyü zırhı yok sayıyor ve zincirliyor; Okçu
   * tek hedefe tek vuruş. Tek üstünlüğü menzil ve fiyat, ama tahtanın
   * bütün noktaları dolduğu için fiyat avantajı yalnız *erken*
   * yükseltmeye dönüşüyor — geç oyunda hiçbir şey vermiyor.
   *
   * Düzeltme çarpan eklemek değil **kademe çıktısını** hizaya almak
   * oldu: yeni çarpan yeni bir mekanik demekti ve `M11`'in dersi
   * görünmeyen mekanik eklememek. Yeni tablo (ham DPS): Okçu T2
   * **18,2** · Büyü T2 18 · Top T2 18,7 — yani artık aynı bantta.
   * Sonuç: 6 / 11 / 17 / 17 (karışık 4 / 5 / 12 / 14).
   *
   * Kilit: `systems/aileDengesi.test.ts`.
   */
  tiers: [
    { cost: 70, damage: 8, fireRate: 1.1, range: 150, airMultiplier: 1 },
    { cost: 110, damage: 14, fireRate: 1.3, range: 165, airMultiplier: 1 },
  ],
  branches: [
    // 3a Keskin Nişancı — uzun menzil, ağır vuruş.
    {
      cost: 170,
      damage: 34,
      fireRate: 0.6,
      range: 260,
      airMultiplier: 1,
      branchNameKey: 'branchSharpshooter',
    },
    // 3b Kundakçı — 9 hasar + 4/sn yanma (4 sn).
    {
      cost: 170,
      damage: 9,
      fireRate: 1.4,
      range: 195, // M11-T02: 165 → 195
      airMultiplier: 1,
      branchNameKey: 'branchIncendiary',
      effect: { kind: 'burn', dps: 11, seconds: 4 }, // M11-T02: 4 → 7 → 11 (S95)
    },
  ],
};

/**
 * Top Kulesi — alan hasarı, yavaş. Kalabalığın cevabı (§4.2).
 *
 * **T1/T2 ve Havan uçana vuramaz**; Barut Fıçısı %50 ile vurur. §4.2:
 * "4 aileden 2'si uçana etkisiz olduğunda harpi dalgasında oyuncunun
 * tahtasının yarısı ölü kalıyor" — Barut Fıçısı T3 dallanmasını gerçek
 * bir seçime çeviriyor.
 */
export const TOP: TowerDef = {
  id: 'top',
  role: 'Alan hasarı, yavaş. Kalabalığın cevabı.',
  damageType: 'physical',
  tiers: [
    { cost: 110, damage: 22, fireRate: 0.5, range: 140, splashRadius: 45, airMultiplier: 0 },
    { cost: 160, damage: 34, fireRate: 0.55, range: 150, splashRadius: 55, airMultiplier: 0 },
  ],
  branches: [
    // 3a Havan — kara uzmanı.
    {
      cost: 240,
      damage: 48,
      fireRate: 0.45,
      range: 230,
      splashRadius: 55, // M11-T02: 70 → 55, kimliği DAR ve UZAK
      // `M11-T02` — **0 → 0,5.** `airMultiplier: 0` düşmanı hedef
      // listesinden tümden eliyor (§4.2), yani Havan harpi dalgasında
      // **tamamen ölü** kalıyordu. Araştırmanın "kilit-anahtar tasarımı
      // kaçın, her tehdide çok çözüm ver" kuralının ihlali: bir dalın
      // bütün bir düşman sınıfına sıfır yazması, o dalı o dalgalarda
      // yok sayılabilir yapıyor. Tip `0 | 0,5 | 1` ile sınırlı;
      // sıfırdan sonraki en küçük adım 0,5.
      airMultiplier: 0.5,
      branchNameKey: 'branchMortar',
    },
    // 3b Barut Fıçısı — esnek: uçana %50, ve %40 yavaşlatma (2 sn).
    {
      cost: 240,
      damage: 24, // M11-T02: 30 → 24 (DPS 21,6 = Havan ile eşit; takas menzil↔patlama)
      fireRate: 0.9, // M11-T02: 0,6 → 0,9
      range: 150,
      splashRadius: 85, // M11-T02: 65 → 85, kimliği GENİŞ ve HIZLI
      airMultiplier: 0.5,
      branchNameKey: 'branchPowderKeg',
      // `M11-T02` — **yavaşlatma KALDIRILDI.**
      //
      // Ölçüm yapısal bir sebep gösterdi: Kısıt A `DPS × kapsananYol /
      // hız`. Yavaşlatma `hız`ı bölüyor, yani yavaşlatan kule **bütün
      // tahtanın** hasarını çarpıyor — kendi hasarını değil. Bu yüzden
      // yavaşlatan bir dal, yavaşlatmayan her dalı yeniyor; hasar ya da
      // menzilde ne verirsen ver kapatamıyorsun. (`M10`'un sinerjisi
      // bunu daha da büyütmüştü.)
      //
      // Sonuç: yavaşlatma **tek bir dalın kimliği** olmalı. Buz aldı.
      // Barut Fıçısı geniş patlama + hızlı atışa, Havan uzun menzil +
      // ağır vuruşa ayrıştı.
    },
  ],
};

/**
 * Büyü Kulesi — zırh delen (§4.3).
 *
 * **Zırhlı düşmanların tek temiz cevabı**: büyü hasarı zırhı hiç görmez,
 * yalnız büyü direnciyle azalır (§3). Bilgi panelinin (§11) göstereceği
 * asıl fark bu — Okçu T1 Zırhlı Ork'a (zırh 8) tabana düşerken Büyü T1
 * tam 14 veriyor.
 */
export const BUYU: TowerDef = {
  id: 'buyu',
  role: 'Zırh delen. Büyü dirençli düşmanlara zayıf.',
  damageType: 'magic',
  tiers: [
    { cost: 100, damage: 14, fireRate: 0.7, range: 155, airMultiplier: 1 },
    { cost: 150, damage: 24, fireRate: 0.75, range: 170, airMultiplier: 1 },
  ],
  branches: [
    // 3a Yıldırım — 3 hedefe zincirleme, her sıçramada %70'e düşerek.
    {
      cost: 230,
      /**
       * **`M18` (S110): 30 → 36.** Fiyatına göre çıktısı savunulamazdı.
       *
       * Kümülatif fiyatlar: Okçu Keskin Nişancı **350**, Yıldırım
       * **480**, Top Havan **510**. Yıldırım 30 hasarla 21,0 DPS
       * veriyordu — Okçu'nun 20,4'üne eşit sayılır, ama Okçu 130 altın
       * **ucuz** ve menzili 260 (Yıldırım 170). Yani oyuncu %37 fazla
       * ödeyip daha kısa menzille aynı hasarı alıyordu; karşılığındaki
       * iki şey (zincir ve zırhı yok sayma) ölçüldü, ikisi de küçük:
       * kadroların HP ağırlıklı ortalama zırhı 2,9-3,3 ve zırh **vuruş
       * başına** düştüğü için Havan'ın 48'lik vuruşunu zırh 8'de bile
       * yalnız %17 törpülüyor.
       *
       * Menzil yükseltilmedi bilerek: menzil **Okçu'nun kimliği**
       * (`M11` Faz 5). `M11`'in kuralı da korundu — yeni çarpan
       * eklenmedi, yalnız kademe çıktısı hizaya alındı.
       *
       * Tarama (tek aile, taban tahta, Kar Geçidi/Kadim Harabe can
       * kaybı): 30 → 8/21 · 32 → 8/16 · 34 → 7/16 · **36 → 5/13**.
       */
      damage: 36,
      fireRate: 0.7,
      range: 170,
      airMultiplier: 1,
      branchNameKey: 'branchLightning',
      effect: { kind: 'chain', targets: 3, falloff: 0.7 },
    },
    // 3b Buz — %50 yavaşlatma (2,5 sn).
    {
      cost: 230,
      damage: 8,
      fireRate: 0.8,
      range: 180,
      // `M11-T02` — **Buz'a alan verildi.** Ölçüm yapısal bir sorun
      // gösterdi: Buz yavaşlatmayı tek tek uyguluyordu (0,8 hedef/sn),
      // Barut Fıçısı ise patlamayla gruba. Yani ZAYIF yavaşlatan, iyi
      // yavaşlatandan daha çok düşman yavaşlatıyordu. `ProjectileSystem`
      // patlama içindeki her hedefe etkiyi zaten uyguluyor.
      splashRadius: 30,
      airMultiplier: 1,
      branchNameKey: 'branchFrost',
      effect: { kind: 'slow', factor: 0.3, seconds: 2 },
    },
  ],
};

/** M4 kadrosu: üç kule ailesi. Kışla M5'te. */
export const TOWERS: readonly TowerDef[] = [OKCU, TOP, BUYU];

/**
 * Hedefleme modlarının **tek** listesi.
 *
 * `M10-T02`'ye kadar yalnız `fx/BuildMenu.ts` içinde, dışa açılmadan
 * duruyordu; tur kaydı kayıttan okuduğu modu doğrulamak için de aynı
 * listeye ihtiyaç duyunca ikinci bir kopya yazmak yerine buraya taşındı.
 * İki kopya sessizce ayrışır ve ayrışma "bir mod menüde var ama kayıttan
 * yüklenmiyor" gibi görünür.
 */
export const TARGET_MODES: readonly TargetMode[] = [
  'first',
  'last',
  'strongest',
  'weakest',
  'closest',
];

export function getTower(id: TowerDef['id']): TowerDef | undefined {
  return TOWERS.find((t) => t.id === id);
}

/**
 * Kademe indeksini `TowerTier`e çevirir.
 *
 * `0` = T1, `1` = T2, `2` = T3a, `3` = T3b.
 */
export function tierAt(def: TowerDef, index: TierIndex): TowerTier {
  if (index === 2) return def.branches[0];
  if (index === 3) return def.branches[1];
  return def.tiers[index];
}

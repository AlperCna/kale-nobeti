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
/**
 * **`M67` (S134) — kademe çıktıları ÜÇ AİLEDE birden hizalandı.**
 *
 * `M66` simülasyonun Örümcek Ana'yı hiç böldürmediğini bulup düzeltti
 * (S133) ve geç haritalar belirgin biçimde sertleşti. Ortaya çıkan
 * tablo, `aileDengesi`'nin 20 can eşiğinin yalnız **Okçu'ya** konmuş
 * olduğunu da görünür kıldı: ölçülünce Top Kadim Harabe'de **22**,
 * Büyü Kar Geçidi'nde **21** kaybettiriyordu — ikisi de o haritayı tek
 * başlarına kaybediyor ve hiçbir test bakmıyordu. S119'un birebir
 * tekrarı, bu kez iki ailede.
 *
 * Sahip eşiğin üç aileye de konmasını istedi; bu bir denge turu demekti.
 * Çare `M11` Faz 5 ve `M18`'in aynısı: **yeni mekanik eklenmedi, kademe
 * çıktısı hizalandı.**
 *
 * | değer | önce | sonra | neyi çözdü |
 * |---|---|---|---|
 * | Havan hasarı | 48 | **52** | Top'un zırha karşı debisi (Kadim Harabe 22 → 19) |
 * | Barut Fıçısı hasarı | 24 | **26** | Top'un iki dalının DPS'i EŞİT kalsın (23,4) |
 * | Yıldırım hasarı | 36 | **39** | Büyü Kar Geçidi'nin bossunu öldüremiyordu (21'in 10'u boss) |
 * | Keskin Nişancı hasarı | 41 | **44** | Okçu iki haritada 19'da tıkalıydı, pay yoktu |
 *
 * Tarama ve gerekçeler `OPEN-QUESTIONS` S134'te. Barut Fıçısı'nın
 * yükselmesi bir denge kararı değil **değişmez koruması**: `M11-T02`
 * iki dalın DPS'ini bilerek eşitlemişti (fark menzil↔patlama), yalnız
 * Havan'ı yükseltmek o kimliği bozardı.
 *
 * Sonuç (taban çift, tek aile / karışık):
 * rampa `0·0·5·14·15·15`, üç ailenin üçü de her haritada 20'nin altında.
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
      /**
       * **`M22` (S119): 34 → 41.** Okçu harita 6'da ÖLÜ aileydi ve
       * hiçbir test bakmıyordu.
       *
       * Ölçüm (tek aile, taban tahta, can kaybı): Kar Geçidi 19 ·
       * Kadim Harabe 19 · Sisli Bataklık **29** — 20 can sınırının çok
       * üstünde, üstelik Okçu tahtası bossu bile sızdırıyordu. Top ve
       * Büyü aynı haritada 6 ve 5.
       *
       * Sebep haritaya özgü ve yapısal: Sisli Bataklık'ın **Tünelci**si
       * yolun %15-60'ında hedeflenemez (`M12`), yani vuruş penceresi
       * kısa. Kısa pencerede patlama (Top) ve zincir (Büyü) kayıplarını
       * çarpanla kapatıyor; Okçu'nun **hiçbir çarpanı yok** (`M11` Faz
       * 5'in teşhisi) ve tek hedefe tek vuruşla geride kalıyor.
       *
       * Düzeltme `M11` Faz 5 ve `M18`'in (Büyü) aynısı: yeni çarpan
       * eklenmedi, kademe çıktısı hizaya alındı. Tarama (Okçu, harita
       * 4/5/6): 34 → 19/19/29 · 40 → 13/14/20 · **41 → 13/9/9** ·
       * 43 → 9/9/6. 41, üç haritayı da sınırın altına indiren **en
       * küçük** adım.
       */
      damage: 44,
      fireRate: 0.6,
      range: 260,
      airMultiplier: 1,
      branchNameKey: 'branchSharpshooter',
    },
    // 3b Kundakçı — 9 hasar + 11/sn yanma (4 sn).
    // (`M31`: başlık "4/sn" diyordu; değer M11-T02'de 4 → 7 → 11 oldu,
    //  değişim aşağıdaki satıra yazıldı ama başlık güncellenmedi.)
    //
    // **`M61` (S131): referans tahta bu dalı ARTIK KURUYOR.** Eskiden
    // hiç kurmuyordu — dal kuralı Top ve Büyü'yü sayıp Okçu'yu
    // saymıyordu — ve üstteki `M22` notunun anlattığı harita 6 sorunu
    // buradan geliyordu: yanma hedef seçiminden geçmediği için gömülü
    // Tünelci'ye **değen tek Okçu cevabı** buydu, ama tahtada yoktu.
    // Kural kadroda gömülen düşman varken ilk Okçu'ya bu dalı veriyor
    // (`balanceChecks.buildReferenceBoards`); Sisli Bataklık'ta Okçu
    // tahtası 21 → 11.
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
      damage: 52,
      fireRate: 0.45,
      range: 230,
      // **`M75` (S137): 55 → 65.** `M11-T02` 70'ten 55'e indirmişti
      // ("kimliği DAR ve UZAK"). Ölçüm o daraltılmayı geri istedi:
      // `M73` Top'un tek hedef DPS'inin her yerde geride olduğunu
      // gösterdi (Yıldırım 27,3'e Havan 23,4 — zırhsızda bile), yani
      // Top'un karşılığı **patlamanın kendisi**. Hasarı yükseltmek
      // kimliği bozardı; yarıçap Top'a kendi işinde pay açıyor ve boss
      // türetmesinin (S137) önünü açan tek değişiklik bu oldu.
      splashRadius: 65,
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
    // 3b Barut Fıçısı — esnek: uçana %50, geniş ve hızlı patlama.
    // (`M31`: başlık "%40 yavaşlatma" diyordu; oysa yavaşlatma M11-T02'de
    //  KALDIRILDI ve gerekçesi sekiz satır aşağıda yazılı. Başlık kendi
    //  gövdesiyle çelişiyordu.)
    {
      cost: 240,
      damage: 26, // M11-T02: 30 → 24; `M67`: 24 → 26 (DPS 23,4 = Havan ile eşit)
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
      damage: 39,
      fireRate: 0.7,
      range: 170,
      airMultiplier: 1,
      branchNameKey: 'branchLightning',
      effect: { kind: 'chain', targets: 3, falloff: 0.7 },
    },
    // 3b Buz — %30 yavaşlatma (2 sn).
    // (`M31`: başlık "%50 · 2,5 sn" diyordu; iki sayı da yanlıştı.
    //  Oyuncuya gösterilen metin veriden türediği için doğruydu
    //  (`util/dalOzeti.etkiMetni`) — yanlış olan yalnız bu başlıktı.)
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

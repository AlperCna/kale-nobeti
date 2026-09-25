/**
 * Denge sağlamaları: Kısıt A, ekonomi karşılanabilirliği, referans tahta
 * türetimi. `GAME-DESIGN.md` §6, `research/01-denge-matematigi.md`.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz — hepsi saf fonksiyon.
 * TIER 1 kural 1: sayı yok; `BALANCE`, `towers.ts`, `enemies.ts`, `MapDef`.
 */

import type { EnemyDef } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { TierIndex, TowerDef } from '../types/tower';
import type { BoardBarracks, BoardTower, ReferenceBoard } from '../types/board';
import type { Wave } from '../types/wave';
import type { SpotCoverage } from '../util/coverage';
import { BALANCE } from '../data/balance';
import { getEnemy, getEnemyForMap } from '../data/enemies';
import { BUYU, OKCU, TOP, getTower, maliyet, tierAt } from '../data/towers';
import { KISLA, barracksTierAt } from '../data/barracks';
import { applyDamage, etkiDps } from './combat';
import { nearestPathIndex, measureCoverage, pathLength } from '../util/coverage';

// --------------------------------------------------------------- Kısıt A

/**
 * Bir kulenin **belirli bir düşmana karşı etkin** DPS'i.
 *
 * Zırh/direnç `applyDamage` üzerinden uygulanıyor — ham `damage × fireRate`
 * değil. Okçu T2 (14 hasar) boss'a (zırh 10) saniyede 18,2 değil **5,2**
 * veriyor; farkı yaratan bu. (`M11` Faz 5 öncesi sayı 10 hasar / 1,95
 * DPS'ti — örnek aynı, kadro güçlendi.)
 *
 * ## Hangi etki sayılıyor, hangisi sayılmıyor — ve NEDEN (S115)
 *
 * Bu fonksiyon **tek bir düşmana** verilen hasarı ölçüyor; Kısıt A'nın
 * sorusu da o ("bu boss öldürülebilir mi"). Dört etki dört farklı yere
 * düşüyor ve karışıklık `M18`'e kadar sürdü:
 *
 * | etki | sayılıyor mu | neden |
 * |---|---|---|
 * | **yanma** | ✅ burada | tek hedefe gerçek hasar (`combat.etkiDps`) |
 * | **yavaşlatma** | ✅ ama **paydada** | hızı bölüyor → `etkinHiz` (S113) |
 * | **zincir** | ❌ ve bu DOĞRU | tek düşmana sıçrayamıyor |
 * | **patlama** | ❌ ve bu DOĞRU | birincil hedef zaten tam hasar alıyor |
 *
 * Zincir ve patlamanın sıfır olması bir eksiklik **değil**, ölçülmüş bir
 * gerçek. `ProjectileSystem.#zincirle` aynı hedefe iki kez sıçramıyor
 * (S36 — sıçrasaydı Yıldırım kalabalık cevabı olmaktan çıkıp tek hedef
 * silahı olurdu) ve `#patlat` birincil hedefi `merkezdenOran(0) = 1` ile
 * vuruyor, yani patlama ona fazladan hiçbir şey eklemiyor.
 *
 * **Ölçüldü (S115):** tek boss, tek kule, harita 1 — Yıldırım'ın zinciri
 * kaldırıldığında boss'un kalan HP'si **484 → 484**, Havan'ın patlaması
 * kaldırıldığında **472 → 472**. Fark tam olarak sıfır.
 *
 * Yani bu ikisini buraya eklemek tavanı **şişirir** ve boss HP'si tavandan
 * türetildiği için öldürülemez boss üretir — `M17`'nin tam olarak
 * tosladığı duvar. Kalabalık değeri zaten doğru yerde ölçülüyor: Kısıt B,
 * yani `waveSim`, zinciri de patlamayı da gerçekten simüle ediyor.
 */
export function effectiveDps(def: TowerDef, tier: TierIndex, enemy: EnemyDef): number {
  const t = tierAt(def, tier);
  const ucanCarpani = enemy.flying ? t.airMultiplier : 1;
  if (ucanCarpani === 0) return 0; // kule bu düşmana hiç vuramıyor
  const vurus = applyDamage(t.damage * ucanCarpani, def.damageType, enemy);
  // `M11-T01` — **yanma da hasar.** Buraya kadar sayılmıyordu ve sonucu
  // ölçüldü: referans tahta altı T3 dalından üçünü hiç seçmiyordu.
  // Yanma gerçek hasar, `applyDamage`'dan geçmiyor (§4.1). Gerekçenin
  // tamamı `combat.etkiDps`'te. Zincir ve patlama bilerek 0 (S115);
  // yavaşlatma da burada 0 ama **yok sayılmıyor** — paydada, `etkinHiz`
  // içinde (S113). Üçünün gerekçesi başlıktaki tabloda.
  return vurus.dealt * t.fireRate + etkiDps(t.effect, t.fireRate);
}

/**
 * **Kısıt A** — tek düşmana verilebilecek toplam hasar tavanı.
 *
 * `GAME-DESIGN.md` §6:
 * `Σ_kule ( DPS_kule × kapsananYol_kule ) / hız_düşman`
 *
 * `research/01` §2'nin merkezi bulgusu: bu değer **kule yerleşiminden
 * bağımsızdır.** Kümelenseler de dağılsalar da toplam aynı; yerleşim
 * *ne zaman* hasar verildiğini değiştirir, *ne kadar* verildiğini değil.
 * `balanceChecks.test.ts` bunu ayrı bir testle kanıtlıyor.
 *
 * Menzil kule kademesine göre değiştiği için kapsama **kule kule** alınıyor;
 * `coverageByRange` her menzil için o haritanın ölçümünü veriyor.
 */
/**
 * **Yavaşlatmanın hesaba katıldığı etkin hız** — `M18` (S113).
 *
 * `ceilingA`'nın paydası. Kısıt A `DPS × kapsananYol / hız` diyor ve
 * `hız` taban hız olarak alınıyordu; oysa `towers.ts`'in `M11-T02`
 * notu şunu söylüyor: *"yavaşlatma `hız`ı bölüyor, yani yavaşlatan
 * kule **bütün tahtanın** hasarını çarpıyor — kendi hasarını değil."*
 * Formül bunu hiç öğrenmemişti ve tavan, yavaşlatıcısı bol tahtalarda
 * gerçeği %60'a varan oranda küçümsüyordu (S113 ölçümü).
 *
 * Model üç parçadan kuruluyor:
 *
 * 1. **Görev döngüsü** `min(1, süre × atışHızı)` — `combat.etkiDps`'in
 *    yanma için kullandığı fikrin aynısı. Buz'da `2 × 0,8 = 1,6`, yani
 *    menzildeki hedefte yavaşlatma **sürekli**.
 * 2. **Yığılma yok, en güçlüsü kazanıyor** (`effects.ts` S35). Bu
 *    yüzden oranlar çarpılmıyor, `max` alınıyor.
 * 3. **Yolun ne kadarı yavaş** — `q = Σ kapsananYol / yolUzunluğu`,
 *    1 ile sınırlı. Zaman ağırlıklı ortalama hız buradan çıkıyor:
 *    yol `L` ise süre `(1−q)L/v + qL/(v·s)`, etkin hız da `L` bölü o.
 *
 * **Bedeli:** `research/01` §2'nin *"tavan kule yerleşiminden
 * bağımsızdır"* bulgusu yavaşlatma varken **artık geçerli değil** —
 * yavaşlatıcıyı yolun başına koymak sonraki bütün kuleleri besler.
 * `q` bunu kapsama kesriyle **yaklaşık** alıyor; sırayı görmüyor.
 * Yerleşimden bağımsızlık yavaşlatıcısız tahtalarda aynen duruyor.
 */
export function etkinHiz(
  board: ReferenceBoard,
  coverageByRange: (range: number) => readonly SpotCoverage[],
  enemy: EnemyDef,
  yolUzunlugu: number,
): number {
  const hiz = enemy.speed;
  if (!(hiz > 0) || !(yolUzunlugu > 0)) return hiz;

  let enGucluOran = 0;
  let yavasKapsama = 0;
  for (const bt of board.towers) {
    const def = getTower(bt.towerId);
    if (def === undefined) continue;
    const t = tierAt(def, bt.tier);
    const fx = t.effect;
    if (fx === undefined || fx.kind !== 'slow') continue;
    // Vuramadığı düşmanı yavaşlatamaz (§4.2 uçan kuralı).
    if (enemy.flying && t.airMultiplier === 0) continue;

    const gorevDongusu = Math.min(1, fx.seconds * t.fireRate);
    if (!(gorevDongusu > 0)) continue;
    enGucluOran = Math.max(enGucluOran, fx.factor * gorevDongusu);
    yavasKapsama +=
      coverageByRange(t.range).find((c) => c.spotIndex === bt.spotIndex)?.coveredPx ?? 0;
  }

  if (!(enGucluOran > 0) || !(yavasKapsama > 0)) return hiz;

  const q = Math.min(1, yavasKapsama / yolUzunlugu);
  const yavasHiz = hiz * (1 - enGucluOran);
  if (!(yavasHiz > 0)) return hiz; // tam durdurma modellenmiyor
  return 1 / ((1 - q) / hiz + q / yavasHiz);
}

export function ceilingA(
  board: ReferenceBoard,
  coverageByRange: (range: number) => readonly SpotCoverage[],
  enemy: EnemyDef,
  map: MapDef,
  /**
   * Düşmanın yürüdüğü **kolun** uzunluğu (px). `M18`'de **zorunlu**
   * eklendi: yavaşlatmanın yolun ne kadarını kapladığını bilmeden
   * etkin hız hesaplanamıyor. Zorunlu olması bilinçli — derleyici
   * bütün çağıranları saysın (S80/S109'un panzehiri).
   */
  yolUzunlugu: number,
): number {
  const hiz = etkinHiz(board, coverageByRange, enemy, yolUzunlugu);
  if (!(hiz > 0)) return 0;

  let toplam = 0;
  for (const bt of board.towers) {
    const def = getTower(bt.towerId);
    if (def === undefined) continue;

    const dps = effectiveDps(def, bt.tier, enemy);
    if (dps === 0) continue;

    const kapsama =
      coverageByRange(tierAt(def, bt.tier).range).find((c) => c.spotIndex === bt.spotIndex)
        ?.coveredPx ?? 0;
    toplam += dps * kapsama;
  }
  // HP çarpanı düşmanın tarafında; tavan ham hasar cinsinden.
  void map;
  return toplam / hiz;
}

/** Haritanın HP çarpanı uygulanmış efektif can. Yenilenme çağıran tarafta. */
export function effectiveHp(enemy: EnemyDef, map: MapDef): number {
  return enemy.hp * map.hpMultiplier;
}

// ------------------------------------------------------------- Ekonomi

/**
 * Dalga `throughWave`'e kadar (dahil) toplanabilecek altın.
 *
 * `GAME-DESIGN.md` §6: `startGold` + öldürme altını + dalga bonusu.
 * **Erken başlatma bonusu 0 sayılıyor** — muhafazakâr taban; oyuncu hiç
 * erken başlatmasa bile tahtayı karşılayabilmeli.
 */
export function cumulativeGold(
  map: MapDef,
  waves: readonly Wave[],
  throughWave: number,
  /** `true` ise her dalgada **tam** erken başlatma bonusu sayılır (üst sınır). */
  withEarlyBonus = false,
): number {
  let toplam = map.startGold;

  for (const w of waves) {
    if (w.index > throughWave) break;
    for (const g of w.groups) {
      const e = getEnemyForMap(g.enemy, map);
      if (e === undefined) continue;
      toplam += Math.round(e.gold * map.goldMultiplier) * g.count;
    }
    // S70 — bonus da harita çarpanıyla (EconomySystem.awardWaveEnd gerekçesi).
    toplam += Math.round(BALANCE.waveEndBonus(w.index) * map.goldMultiplier);
    if (withEarlyBonus && w.index >= BALANCE.earlyBonusFrom) {
      // `M14` — bonus artık altın çarpanını izliyor (`EconomySystem`).
      toplam += Math.round(BALANCE.prepSeconds * Math.ceil(w.index / 2) * map.goldMultiplier);
    }
  }
  return toplam;
}

// ------------------------------------------- Referans tahta (türetiliyor)

/**
 * Kule dağılımı — `GAME-DESIGN.md` §5 karşı-oyun tablosundan.
 *
 * Harita 1 kadrosu (Goblin, Ork Savaşçı, Kurt Binicisi) kalabalık ve
 * hafif zırhlı. Top kalabalığın cevabı, Okçu tek hedef ve uçan. Sıra
 * viraj noktalarını (kapsaması en yüksek) **Top'a** veriyor: alan hasarı
 * yolu iki kez gören noktada en çok işe yarıyor.
 */
function kuleSecimi(sira: number): TowerDef {
  // Üçlü döngü → 8 noktada 3 Top, 3 Büyü, 2 Okçu.
  // Bu **tam olarak** `research/01` §4'ün referans tahtası (ΣDPS 84) ve
  // §5 karşı-oyun tablosunun dediği: kalabalığa Top, **zırhlıya Büyü**,
  // uçana Okçu.
  //
  // M3'te Büyü henüz yoktu ve döngü Top/Okçu ikilisiydi; boss (zırh 10)
  // kadroya girince Kısıt A kırıldı — Okçu T2 boss'a 5,2 DPS veriyor ve
  // Büyüsüz tahta 371 hasarda kalıyordu (gereken 805). Ölçüm, tahtanın
  // eksik olduğunu söyledi.
  const sirada = sira % 3;
  if (sirada === 0) return TOP;
  if (sirada === 1) return BUYU;
  return OKCU;
}

/**
 * Tercih edilen kule pahalıysa **ucuz olana düşer**.
 *
 * İlk yazımda bu geri düşüş yoktu ve türetme dalga 1'de 100 altın elde
 * dururken yeni kule almıyordu — sonuçta simülasyon 10 goblinin 6'sının
 * sızdığını gösterdi. Gerçek oyuncu elindeki parayla alabildiğini alır;
 * modelin onu yansıtmaması **modelin hatasıydı**, dengenin değil.
 */
function karsilanabilirKule(
  sira: number,
  butce: number,
  map: { readonly costMultiplier?: number },
  tekAile?: TowerDef['id'],
): TowerDef | undefined {
  const fiyat = (d: TowerDef): number => maliyet(d.tiers[0].cost, map);
  if (tekAile !== undefined) {
    const d = getTower(tekAile);
    return d !== undefined && butce >= fiyat(d) ? d : undefined;
  }
  const tercih = kuleSecimi(sira);
  if (butce >= fiyat(tercih)) return tercih;
  // Ucuzdan pahalıya dene — gerçek oyuncu elindekiyle alabildiğini alır.
  const sirali = [OKCU, BUYU, TOP].filter((d) => d !== tercih);
  return sirali.find((d) => butce >= fiyat(d));
}

/**
 * Kışlanın kurulacağı yapı noktası.
 *
 * **En düşük TOPLAM kapsamalı nokta** — S69: kışla kapsamayı kullanmıyor
 * ama işgal ettiği nokta bir kuleyi dışarıda bırakıyor.
 *
 * ## Denenen ve ÖLÇÜMLE ELENEN alternatif
 *
 * Harita 3'te kışla kol 1'e ait bir noktaya düşüyordu (kol 0'da 7 kule,
 * kol 1'de 6) ve dalga tasarımı Ork Savaşçı gruplarını (d2, d4, d7) tam
 * da o zayıf kola gönderiyordu. "Kolları dengele" hipotezi mantıklı
 * görünüyordu: kışlayı **ortak** bir noktaya alıp 6/6 yapmak.
 *
 * **Ölçüm hipotezi çürüttü:** kollar 6/6 oldu ama sızıntı **25 → 35**
 * çıktı ve Ork Savaşçı ×11'den ×14'e yükseldi. Sebep: ortak nokta iki
 * kolu birden görüyor, onu kışlaya vermek **her iki kolu** zayıflatıyor.
 * Asimetrik 7/6, simetrik 6/6'dan iyi.
 *
 * Yani bağlayıcı değişken kol **dengesi** değil, kol başına **toplam
 * kule sayısı**.
 */
function kislaNoktasiSec(map: MapDef): number | undefined {
  // **En düşük TOPLAM kapsama.** Ölçülerek seçildi, bkz. yukarıdaki not.
  let enIyi: number | undefined;
  let enAz = Number.POSITIVE_INFINITY;
  for (const c of map.coverage) {
    if (c.coveredPx < enAz) {
      enAz = c.coveredPx;
      enIyi = c.spotIndex;
    }
  }
  return enIyi;
}

/**
 * Referans tahtaları **türetir** — elle yazılmaz (S25).
 *
 * Harcama kuralı `GAME-DESIGN.md` §6: **önce yapı noktalarını doldur,
 * sonra yükselt.** Doküman "yükseltme yer kıtlığı yüzünden mantıklıdır"
 * ve "8 nokta dalga 4-5'te dolmalı" diyor; makul oyuncu bu sırayı izler.
 *
 * Kapsaması yüksek noktalar önce doluyor — oyuncunun da yapacağı şey bu
 * ve `M1-T09` ölçümü hangi noktanın değerli olduğunu zaten söylüyor.
 */
export function buildReferenceBoards(
  map: MapDef,
  waves: readonly Wave[],
  coverage: readonly SpotCoverage[],
  /**
   * `false` (varsayılan) → **muhafazakâr taban**: oyuncu hiç erken
   * başlatmıyor. Karşılanabilirlik sağlaması bunu kullanıyor.
   *
   * `true` → **gerçekçi tahta**: dalga 4'ten itibaren erken başlatma
   * bonusu tam kullanılıyor. §6 bu mekaniği "geç oyunda gerçek bir karar"
   * diye tanımlıyor, yani dalga 6'ya gelen oyuncunun onu kullanmış olması
   * beklenir. Kısıt B bunu kullanıyor.
   *
   * İkisinin farkı ölçüldü ve `M3-SONUC.md`'ye yazıldı — tek bir tahta
   * seçip diğerini gizlemek dengeyi olduğundan iyi/kötü gösterirdi.
   */
  withEarlyBonus = false,
  /**
   * **Tek aileye zorla** — `M11` Faz 5 (S95) için eklendi, varsayılan
   * yok (karışık tahta).
   *
   * Aile dengesini ölçmenin tek dürüst yolu **maliyeti de** hesaba
   * katmak: aileler farklı fiyatta, yani "aynı noktalara aynı kademede
   * kur" testi ucuz aileyi haksız yere cezalandırıyor. Burada tahta o
   * ailenin fiyatıyla türetiliyor — ekonomi, kademe sırası, kışla
   * kuralı aynen işliyor.
   */
  tekAile?: TowerDef['id'],
): ReferenceBoard[] {
  /**
   * **Nokta sırası — üç ölçüt** (`M47`, S95).
   *
   * Buraya kadar tek ölçüt vardı: kapsaması yüksek nokta önce. Sorun
   * ölçüldü: kapsamalar büyük ölçüde **eşit** (Sisli Bataklık'ın 15
   * noktasından 11'i aynı), `Array.sort` kararlı olduğu için eşitlerin
   * sırasını `maps.ts`'teki **yazılış sırası** belirliyordu — tasarımsal
   * hiçbir anlamı olmayan bir ayrıntı. Eşit noktalar başka sırada
   * yazılsaydı Sisli Bataklık'ın can kaybı **8 ile 25 arasında** herhangi
   * bir değer olurdu (25 = harita kaybedilir). Bütün dengenin demirlendiği
   * tahta keyfî bir ayrıntıya bağlıydı.
   *
   * **2. ölçüt — kaleye yakınlık.** Kaleye yakın noktalar son savunma
   * hattı; tahta sırayla yükseltildiği için listenin başındakiler en
   * yüksek kademeyi alıyor, yani en güçlü savunma sızıntının gerçekten
   * olduğu yere oturuyor. Ters yön ölçüldü ve her haritada daha kötü
   * çıktı (Sisli Bataklık 10 → 19).
   *
   * **3. ölçüt — yolun taşıdığı tehdit.** Harita 2 ve 3'te ayna çiftleri
   * kalıyordu: aynı kapsama, kaleye aynı uzaklık, **aynı yol oranı**.
   * Geometri eşdeğer ama trafik değil — Kül Ovası'nda yol 0, 47 düşman
   * **ve boss** taşıyor, yol 1 ise 34 düşman ama 7 Trol. Yoğun şeridin
   * noktası önce kuruluyor.
   *
   * Üçü birlikte **altı haritayı da** girdi sırasından bağımsız kılıyor
   * (ölçüldü: 25 karıştırmada tek değer).
   */
  const kaleKare = (i: number): number => {
    const s = map.buildSpots[i];
    if (s === undefined) return Number.POSITIVE_INFINITY;
    const dx = s.x - map.castle.x;
    const dy = s.y - map.castle.y;
    return dx * dx + dy * dy;
  };
  const yolTehdidi = map.paths.map(() => 0);
  for (const w of waves) {
    for (const g of w.groups) {
      const e = getEnemyForMap(g.enemy, map);
      if (e === undefined) continue;
      const li = Math.min(g.spawnPoint, yolTehdidi.length - 1);
      if (li >= 0) yolTehdidi[li] = (yolTehdidi[li] ?? 0) + g.count * e.points;
    }
  }
  const trafik = (i: number): number => {
    const s = map.buildSpots[i];
    return s === undefined ? 0 : (yolTehdidi[nearestPathIndex(map.paths, s)] ?? 0);
  };
  const tumSirali = [...coverage]
    .sort(
      (a, b) =>
        b.coveredPx - a.coveredPx ||
        kaleKare(a.spotIndex) - kaleKare(b.spotIndex) ||
        trafik(b.spotIndex) - trafik(a.spotIndex),
    )
    .map((c) => c.spotIndex);

  /**
   * **Kışla, kadroda Trol varsa alınıyor.**
   *
   * §5 karşı-oyun tablosu Trol'ün cevabını açıkça "Kışla ile tut + yoğun
   * tek hedef" diye veriyor. Tahta kışla almadığı sürece Kısıt B, oyuncunun
   * gerçekte kuracağı tahtayı değil **eksik** bir tahtayı simüle ediyordu;
   * harita 3'te Trol sızıntısının bir kısmı buradan geliyordu.
   *
   * **En DÜŞÜK kapsamalı noktaya** kuruluyor — S69'un ölçtüğü şey: kışla
   * kapsamayı kullanmıyor (hasar vermiyor, menzili yok) ama işgal ettiği
   * nokta bir kuleyi dışarıda bırakıyor. Canlı ölçümde en yüksek kapsamalı
   * noktaya kurmak 20/20 canı 0/20'ye çeviriyordu.
   */
  /**
   * Kadroda **hedef seçiminden kaçan** düşman var mı — `M61` (S131).
   * Harita adı değil kadro sorulur; `gomuluMu`'nun koşuluyla aynı alan.
   */
  const kadrodaGomulen = map.enemyRoster.some(
    (id) => getEnemyForMap(id, map)?.ability?.kind === 'burrow',
  );

  const kislaAlinacak = map.enemyRoster.includes('trol');
  const kislaNoktasi = kislaAlinacak ? kislaNoktasiSec(map) : undefined;
  const sirali = tumSirali.filter((i) => i !== kislaNoktasi);
  let kislaKuruldu = false;
  const kislalar: BoardBarracks[] = [];

  const kuleler: BoardTower[] = [];
  let harcanan = 0;
  const sonuc: ReferenceBoard[] = [];

  for (const w of waves) {
    // Bu dalganın **başında** elde olan altın = önceki dalgalara kadarki gelir.
    const gelir = cumulativeGold(map, waves, w.index - 1, withEarlyBonus);
    let kullanilabilir = gelir - harcanan;

    // 0) Kışla — **kuleden önce**, ama ilk dalgada değil.
    //
    // Trol harita 3'te dalga 6'da geliyor (§5 tanıtım sırası). Oyuncu
    // kışlayı ona hazırlanmak için alıyor, açılışta değil: dalga 1'de
    // kışla almak ilk kuleyi geciktirir ve erken dalgaları sızdırır.
    // Dalga 4 (ilk nefes) makul oyuncunun nefes aldığı yer.
    if (kislaAlinacak && !kislaKuruldu && kislaNoktasi !== undefined && w.index >= 4) {
      const fiyat = maliyet(barracksTierAt(KISLA, 0).cost, map);
      if (kullanilabilir >= fiyat) {
        kislalar.push({ spotIndex: kislaNoktasi, tier: 0 });
        kullanilabilir -= fiyat;
        harcanan += fiyat;
        kislaKuruldu = true;
      }
    }

    // 1) Boş nokta kaldıysa doldur.
    for (const spotIndex of sirali) {
      if (kuleler.some((k) => k.spotIndex === spotIndex)) continue;
      const def = karsilanabilirKule(kuleler.length, kullanilabilir, map, tekAile);
      if (def === undefined) break;
      const fiyat = maliyet(def.tiers[0].cost, map);
      kuleler.push({ spotIndex, towerId: def.id, tier: 0 });
      kullanilabilir -= fiyat;
      harcanan += fiyat;
    }

    // 2) Nokta kalmadıysa yükselt: önce hepsi T2, sonra T3.
    if (kuleler.every((k) => k.spotIndex !== undefined) && kuleler.length === sirali.length) {
      // 2a) T1 → T2
      for (let i = 0; i < kuleler.length; i++) {
        const k = kuleler[i];
        if (k === undefined || k.tier !== 0) continue;
        const def = getTower(k.towerId);
        if (def === undefined) continue;
        const fiyat = maliyet(def.tiers[1].cost, map);
        if (kullanilabilir < fiyat) continue;
        kuleler[i] = { ...k, tier: 1 };
        kullanilabilir -= fiyat;
        harcanan += fiyat;
      }

      // 2b) T2 → T3. **M7'de eklendi.**
      //
      // Bu daldan önce tahta T2'de takılıyordu ve Kısıt A harita 2-3'te
      // kimsenin sahip olmayacağı bir tahtayı ölçüyordu: oyuncunun elinde
      // 2129/2959 altın varken tahtaya harcanan çok daha azdı. Boss
      // tavanın %192'si (harita 2) ve %292'si (harita 3) çıkıyordu —
      // **ölçüm hatası**, denge hatası değil.
      //
      // **Dal seçimi ELLE yazılı — ve öyle kalması ÖLÇÜLDÜ (`M11-T01`).**
      //
      // Kural: Top ailesinin o dalgada yükselen ilk kulesi **Barut
      // Fıçısı** (T3b), sonrakiler **Havan** (T3a); diğer aileler T3a.
      // Havan uçana vuramıyor ve üç haritanın da kadrosunda Harpi var;
      // hepsini Havan yapmak tahtanın Top kısmını harpi dalgasında
      // tamamen ölü bırakırdı.
      //
      // ## Türetme denendi ve DAHA KÖTÜ çıktı
      //
      // `M11-T01`'de bu kural projenin kendi tavan formülünden
      // (`DPS × kapsananYol`, Kısıt A) türetilmeye çalışıldı — gerekçe
      // makuldü: elle yazılı kural, dal dengesi değişince tepki
      // vermiyor. Ölçüm türetmeyi **reddetti**:
      //
      // | Kural | Zor rampası (can kaybı) |
      // |---|---|
      // | elle (bugünkü) | 0 · 4 · 7 · 13 · 17 |
      // | `DPS × kapsama` | 0 · 4 · **14 · 28 · 26** |
      //
      // Türetilmiş tahta belirgin biçimde zayıf: formül **patlamayı,
      // yavaşlatmayı ve `M10` sinerjisini göremiyor**, ve `airMultiplier: 0`
      // gibi *kategorik* bir deliği kadro ortalamasına yayarak
      // yumuşatıyor (harpi 10 düşmandan biri, ama harpi dalgasında
      // tahtanın yarısı ölü).
      //
      // Yani elle yazılı kural, formülün göremediği bilgiyi taşıyor.
      // `M11` Faz 2 dalları ayrıştırdıktan sonra türetme yeniden
      // denenebilir; bugün ölçüm hayır diyor.
      //
      // **`M11-T02` güncellemesi:** yavaşlatma Barut Fıçısı'ndan alınıp
      // Buz'a verilince kural bir kez daha bayatladı — tahta artık
      // **hiç** yavaşlatan kule kurmuyordu ve belirgin biçimde zayıftı
      // (rampa `0·4·7·13·17` → `0·4·15·30·35`). Gerçek oyuncu bir tane
      // yavaşlatıcı kurar: Büyü ailesinin ilk kulesi **Buz** alıyor,
      // sonrakiler Yıldırım. Top'un ilkinin Barut Fıçısı alması ile
      // **birebir aynı desen** ve aynı gerekçe: tahtada bir tane
      // "farklı iş yapan" kule olmalı.
      // **S112 — bayrak TAHTADAN okunuyor, dalgadan değil.**
      //
      // Bu ikisi `true` ile başlıyordu ve döngü **dalga başına** koştuğu
      // için kural her dalga sıfırlanıyordu: tahta bir tane değil,
      // **dalga başına bir tane** yavaşlatıcı kuruyordu (ölçüldü: Kül
      // Ovası 4 Buz, Kar Geçidi 5). Üstteki yorum hep "bir tane" diyordu.
      let ilkTop = !kuleler.some((k) => k.towerId === 'top' && k.tier === 3);
      let ilkBuyu = !kuleler.some((k) => k.towerId === 'buyu' && k.tier === 3);
      /**
       * **`M61` (S131): kural Okçu'yu hiç saymıyordu.**
       *
       * Desen `M11-T01`'de Top için yazıldı, `M11-T02`'de Büyü eklendi,
       * Okçu eklenmedi — bu projenin en sık kusur sınıfı (CLAUDE.md
       * TIER 2: "yeni bir şey eklerken onu saymayan listeleri ara").
       * Sonuç: tek aileye zorlanan Okçu tahtası Sisli Bataklık'ta **on
       * dört tane aynı Keskin Nişancı** kuruyordu.
       *
       * Okçu'nun "farklı iş yapan" kulesi Kundakçı, ve farkı tam olarak
       * şu: **yanma hedef seçiminden geçmiyor.** `TargetingSystem`'in
       * `gomuluMu` notu bunu zaten söylüyor — gömülü Tünelci'yi kule
       * *seçemez* ama patlama ve yanma ona **değer**. Top patlamayla,
       * Büyü zinciriyle o pencereyi kapatıyordu; Okçu'nun elindeki cevap
       * tahtada hiç kurulmuyordu. `M22` teşhisi doğru koymuştu ("Okçu'nun
       * hiçbir çarpanı yok") ama çareyi kule sayısında aradı (T3a 34→41);
       * eksik olan sayı değil **dal seçimiydi**.
       *
       * İki dal da 170 altın, yani değişim ekonomik olarak bedelsiz.
       *
       * **Koşul kadroda** — ölçülerek. Kuralı koşulsuz uygulamak yanmayı
       * gerekmediği yerde de kuruyor ve tahtayı zayıflatıyor: Kül Ovası
       * Okçu `0 → 4`, Kadim Harabe `14 → 18`. Beklenen bir sonuç, çünkü
       * yanmanın biricik üstünlüğü *seçimi atlamak*; seçilebilen bir
       * kadroda Keskin Nişancı'nın ham vuruşu daha iyi. Gömülen düşman
       * bugün yalnız Sisli Bataklık'ta var, ve kural haritayı adıyla
       * değil **kadrosuyla** tanıyor: yarın başka haritaya Tünelci
       * konursa kendiliğinden geçerli olur.
       *
       * Ölçüm (bant ortancası, `M60`): Sisli Bataklık Okçu **21 → 11**.
       * Diğer beş harita ve bütün karışık tahtalar **birebir aynı**.
       */
      /**
       * **`M85` (S95) — "bir tane" kuralı genelleştirilmeye çalışıldı ve
       * ÖLÇÜM REDDETTİ.**
       *
       * Şüphe makuldü: tek aileye zorlanan tahta on dört kulenin
       * **on üçünü** aynı dala kuruyor (ölçüldü: Kadim Harabe Okçu
       * `T3×14`, sıfır Kundakçı). Gerçek bir oyuncu aile içinde dal
       * karıştırır; yani S95'in ölçtüğü makasın bir kısmı **ölçüm
       * kusuru** olabilirdi — ki öyle olsaydı S116 ve S117'nin duvarı da
       * kısmı kalkacaktı.
       *
       * Denenen kural: aile başına **her N. kule** (N=4) B dalını alsın.
       * Karışık tahtalar aynen kalıyor (hiçbir ailede 4'ten fazla kule
       * yok) — yani değişiklik yalnız tek aile tahtasını etkiliyor.
       * Ölçüm (can kaybı, bugünkü → N=4):
       *
       * | Harita | Okçu | Top | Büyü |
       * |---|---|---|---|
       * | Kadim Harabe | 18 → 18 | 17 → **19** | 13 → **16** |
       * | Sisli Bataklık | 16 → **19** | 9 → 9 | 12 → **19** |
       *
       * Yani çeşitlendirmek tahtayı **zayıflatıyor**: B dalları (Barut
       * Fıçısı, Buz, Kundakçı) yardımcı kuleler ve on dört kulelik bir
       * tahtanın ihtiyacı ham hasar. Okçu'nun koşulu kaldırılınca (her
       * haritada Kundakçı) daha da kötü: Okçu 23/21/27 ve **karışık**
       * tahta da bozuluyor (Kar Geçidi 14 → 18) — `M61`'in ölçümü aynen
       * tekrarlandı.
       *
       * Yani makas gerçek, kural yerinde kalıyor.
       */
      let ilkOkcu = kadrodaGomulen && !kuleler.some((k) => k.towerId === 'okcu' && k.tier === 3);
      for (let i = 0; i < kuleler.length; i++) {
        const k = kuleler[i];
        if (k === undefined || k.tier !== 1) continue;
        const def = getTower(k.towerId);
        if (def === undefined) continue;
        const dal: TierIndex =
          (def.id === 'top' && ilkTop) ||
          (def.id === 'buyu' && ilkBuyu) ||
          (def.id === 'okcu' && ilkOkcu)
            ? 3
            : 2;
        const fiyat = maliyet(tierAt(def, dal).cost, map);
        if (kullanilabilir < fiyat) continue;
        if (def.id === 'top') ilkTop = false;
        if (def.id === 'buyu') ilkBuyu = false;
        if (def.id === 'okcu') ilkOkcu = false;
        kuleler[i] = { ...k, tier: dal };
        kullanilabilir -= fiyat;
        harcanan += fiyat;
      }
    }

    sonuc.push({
      waveIndex: w.index,
      towers: kuleler.map((k) => ({ ...k })),
      ...(kislalar.length > 0 ? { barracks: kislalar.map((k) => ({ ...k })) } : {}),
      cumulativeCost: harcanan,
    });
  }

  return sonuc;
}

/** 8 yapı noktasının **ilk kez** tamamen dolduğu dalga. Yoksa `-1`. */
export function spotsFullAtWave(boards: readonly ReferenceBoard[], spotCount: number): number {
  // `M38` — **kışlalar da yer kaplıyor.** Bu fonksiyon `M3`'te yazıldı ve
  // o zaman referans tahtalarda kışla yoktu; `M5` kışlayı getirdiğinde
  // sayım güncellenmedi. Sonuç sessizce yanlıştı: harita 3-6'nın referans
  // tahtası 11 kule + 1 kışla ile 12 noktayı **dolduruyor** ama fonksiyon
  // `towers.length >= 12` aradığı için "hiç dolmadı" (-1) diyordu.
  // Harita 1'de kışla olmadığı için mevcut testler bunu göremiyordu.
  return (
    boards.find((b) => b.towers.length + (b.barracks?.length ?? 0) >= spotCount)?.waveIndex ?? -1
  );
}

/**
 * Bir kolun kapsama ölçerini üretir.
 *
 * `ceilingA`'nın beklediği `coverageByRange` biçiminde, ama yalnız
 * `branchIndex` numaralı yolu görüyor.
 */
export function branchCoverageFn(
  map: MapDef,
  branchIndex: number,
): (range: number) => readonly SpotCoverage[] {
  const kol = map.paths[branchIndex];
  if (kol === undefined) return () => [];
  return (range: number) => measureCoverage([kol], map.buildSpots, range);
}

/**
 * **Kısıt A, kol başına** — `GAME-DESIGN.md` §9 "ayrık yol uyarısı".
 *
 * > Harita 2 ve 3'te Kısıt A hesabı **her kol için ayrı** yapılır. Toplam
 * > DPS yanıltıcıdır — kolun yalnızca onu gören kuleleri sayılır.
 *
 * Neden yanıltıcı: bir düşman **tek** kol yürüyor. Diğer kolu savunan
 * kuleler ona hiç ateş etmiyor ama toplam hesapta sayılıyorlar. Harita 2'de
 * kollar 480 px ayrık ve 150 px menzilli bir kule ikisini birden göremiyor
 * — yani toplam tavan, gerçekte var olmayan bir savunmayı vaat ediyor.
 *
 * @returns Her kol için bir tavan; **en zayıf kol** belirleyici.
 */
export function ceilingAPerBranch(
  board: ReferenceBoard,
  enemy: EnemyDef,
  map: MapDef,
): number[] {
  return map.paths.map((_, i) =>
    ceilingA(board, branchCoverageFn(map, i), enemy, map, pathLength(map.paths[i] ?? [])),
  );
}

/**
 * Ayrık yolda Kısıt A'nın **gerçek** tavanı: en zayıf kol.
 *
 * Düşman hangi kolu seçeceğini oyuncuya sormuyor; savunma en zayıf koldan
 * yarılır. Ortalama veya toplam almak "iki koldan biri boş olabilir"
 * gerçeğini gizler.
 */
export function ceilingAWeakestBranch(
  board: ReferenceBoard,
  enemy: EnemyDef,
  map: MapDef,
): number {
  const kollar = ceilingAPerBranch(board, enemy, map);
  return kollar.length === 0 ? 0 : Math.min(...kollar);
}

// ------------------------------------------------- Boss HP'si (research/01 §12)

/**
 * **`M158` — TANIM ARTIK `data/bossScaling.ts`'te (TIER 1 kural 1).**
 *
 * Buraya `export const BOSS_CEILING_RATIO = 0.8` diye yazılıydı: gerekçesi
 * `research/01` §12'den gelen, hedef bandı `%75-85` olan, `GAME-DESIGN.md`
 * §5'te tablosu olan **bir denge sayısı** — yani k.1'in *"tüm sayısal
 * değerler `src/data/*.ts` içindeki tipli sabitlerde durur"* dediği şeyin
 * ta kendisi. `docs/plan/DATA-SCHEMAS.md` onu zaten veri diye listeliyordu.
 * Üstelik `balanceChecks.ts` onu **hiç kullanmıyordu**: tek tüketicileri
 * `data/bossScaling.test.ts` (türetmenin yaşadığı yer) ve belge üreticisi.
 *
 * Yeniden **dışa aktarılmıyor**: k.1'in derdi zaten "tek adres", ikinci
 * bir kapı açmak onu geri bozardı. Çağrı yerleri `data/bossScaling`'e
 * bakıyor.
 */

/**
 * **Boss HP'si haritadan türetilir** — `700 × hpMultiplier` DEĞİL.
 *
 * M7'de ölçüldü: `700 × hpMultiplier` harita 2'de 1120, harita 3'te 1820
 * ediyor ve o haritalarda **karşılanabilir hiçbir tahta** bu kadarını
 * indiremiyor — Kısıt A oranları %165 ve %282, yani boss öldürülemez.
 * `research/01` §12 bunu önceden söylemişti: *“boss HP'si `enemies.ts`
 * içinde sabit olmasın; ölçülen kapsama + referans tahtadan türetilsin.”*
 * Sonuç `data/bossScaling.ts` içinde ve her satırının yanında hangi
 * ölçümün ürettiği yazılı.
 *
 * ## `deriveBossHp` KALDIRILDI (`M103`)
 *
 * Buradaki `0,80 × ceilingAWeakestBranch(...)` bir **ölçüt**tü ve
 * `M18` (S113) onu açıkça reddetti: statik tavan tek düşman / taban hız /
 * yeteneksiz bir dünyayı ölçüyor, oyun artık o dünya değil. `M71` ve
 * `M75` yerine **simülasyonla** ölçülen ölçütü koydu: referans tahtanın
 * sürekli koşuda öldürebildiği en büyük HP, ikili aramayla.
 *
 * Fonksiyon o gün **silinmedi** ve `M103`'e kadar dışa aktarılmış,
 * çağrılmaya hazır, kendini “türetme” diye tanıtan bir öksüz olarak
 * durdu — onu çağıran biri **reddedilmiş** bir sayı alırdı. `M80`'in
 * belge tarafında yakaladığı kusurun kod tarafındaki ikizi.
 * Bugünkü türetmenin yaşadığı yer: `data/bossScaling.test.ts`.
 *
 * ## Döngüsellik yok
 *
 * Tavan boss'un **hızına ve savunmasına** bağlı, HP'sine değil.
 *
 * ## Kısıt A boss için tautolojiye dönüyor — yerine ne var
 *
 * §12 uyarıyor: HP `0,80 × tavan` olarak tanımlanırsa `tavan > HP × 1,15`
 * testi `tavan > 0,92 × tavan` olur ve **her zaman** geçer. Bu yüzden boss
 * Kısıt A'dan çıkarılıyor ve yerine iki gerçek sağlama geliyor:
 * `bossAffordable` (tahta karşılanıyor mu) ve regresyon bandı — ikisi de
 * `bossScaling.test.ts` içinde.
 */

/**
 * Boss dalgasının tahtası **karşılanabiliyor mu** — türetmenin dayandığı
 * asıl varsayım ve tautolojik olmayan kısım.
 */
export function bossAffordable(
  map: MapDef,
  waves: readonly Wave[],
  board: ReferenceBoard,
): boolean {
  return cumulativeGold(map, waves, 10, false) >= board.cumulativeCost;
}

/**
 * **Kısıt A'nın yapısal kör noktası: kışla.**
 *
 * `ceilingA` yalnız **kulelerin** verebileceği hasarı topluyor — tanımı bu
 * (`GAME-DESIGN.md` §6). Askerlerin DPS'i ve daha önemlisi **engellemenin
 * kazandırdığı süre** hesaba girmiyor.
 *
 * Bu, §5'in cevabını açıkça kışla olarak verdiği düşmanlar için tavanı
 * sistematik olarak **düşük** gösteriyor. M5'te ölçüldü: tek Haydutlar
 * kışlası bir Trol'ün kule menzilinde geçirdiği süreyi **%68** uzatıyor,
 * iki Paladin kışlası Trol'ü öldürüyor.
 *
 * Çözüm Kısıt A'ya asker DPS'i eklemek **değil** — o, "kulelerin
 * verebileceği hasar" tanımını bozardı ve `research/01` §2'nin
 * yerleşimden bağımsızlık özelliğini kaybettirirdi (askerler yer
 * değiştiriyor). Bunun yerine bu düşmanlar **Kısıt B ile doğrulanıyor**;
 * `kisitB.test.ts` sızıntıyı düşman tipine göre kırıyor.
 *
 * ## Ölçüm neyi gösterdi
 *
 * | Düşman | Kısıt A (harita 3) | Kısıt B sızıntı |
 * |---|---|---|
 * | Trol | **%116,6** (kalıyor) | ×3 |
 * | Ork Savaşçı | %39,9 (geçiyor) | **×11** |
 *
 * Yani iki sağlama farklı şeyleri ölçüyor ve **biri diğerinin yerine
 * geçmiyor**: Kısıt A tek düşmanın tankiliğini, Kısıt B dalganın debisini.
 * Trol'ü Kısıt A'da "kalıyor" diye işaretlemek onu olduğundan zor
 * gösteriyor; Ork Savaşçı'yı "geçiyor" diye işaretlemek de olduğundan
 * kolay.
 */
export const KISLA_ILE_DOGRULANAN: readonly EnemyDef['id'][] = ['trol'];

/**
 * **`ceilingAApplies` `M103`'te kaldırıldı.** “Bu düşman Kısıt A'dan muaf
 * mı” sorusunu soran bir kapıydı ve **hiçbir yer çağırmıyordu**:
 * `balanceChecks.test.ts`'in kendi muafiyet kümesi ayrı (`ogreSef`,
 * `orumcekYavrusu`) ve Trol orada muaf değil — geçmek zorunda, geçiyor da.
 * Yukarıdaki liste yalnız belge üreticisi tarafından okunuyor (✓/✗ yerine
 * ⓑ basmak için), yani karar **veri**de, kapıda değil.
 */

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
import { BUYU, OKCU, TOP, getTower, tierAt } from '../data/towers';
import { KISLA, barracksTierAt } from '../data/barracks';
import { applyDamage } from './combat';
import { measureCoverage } from '../util/coverage';

// --------------------------------------------------------------- Kısıt A

/**
 * Bir kulenin **belirli bir düşmana karşı etkin** DPS'i.
 *
 * Zırh/direnç `applyDamage` üzerinden uygulanıyor — ham `damage × fireRate`
 * değil. Okçu T2 (10 hasar) boss'a (zırh 10) saniyede 10 değil **1,95**
 * veriyor; farkı yaratan bu.
 */
export function effectiveDps(def: TowerDef, tier: TierIndex, enemy: EnemyDef): number {
  const t = tierAt(def, tier);
  const ucanCarpani = enemy.flying ? t.airMultiplier : 1;
  if (ucanCarpani === 0) return 0; // kule bu düşmana hiç vuramıyor
  const vurus = applyDamage(t.damage * ucanCarpani, def.damageType, enemy);
  return vurus.dealt * t.fireRate;
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
export function ceilingA(
  board: ReferenceBoard,
  coverageByRange: (range: number) => readonly SpotCoverage[],
  enemy: EnemyDef,
  map: MapDef,
): number {
  const hiz = enemy.speed;
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
      toplam += BALANCE.prepSeconds * Math.ceil(w.index / 2);
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
  // kadroya girince Kısıt A kırıldı — Okçu T2 boss'a 1,95 DPS veriyor ve
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
function karsilanabilirKule(sira: number, butce: number): TowerDef | undefined {
  const tercih = kuleSecimi(sira);
  if (butce >= tercih.tiers[0].cost) return tercih;
  // Ucuzdan pahalıya dene — gerçek oyuncu elindekiyle alabildiğini alır.
  const sirali = [OKCU, BUYU, TOP].filter((d) => d !== tercih);
  return sirali.find((d) => butce >= d.tiers[0].cost);
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
): ReferenceBoard[] {
  // Kapsaması yüksek nokta önce.
  const tumSirali = [...coverage].sort((a, b) => b.coveredPx - a.coveredPx).map((c) => c.spotIndex);

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
      const maliyet = barracksTierAt(KISLA, 0).cost;
      if (kullanilabilir >= maliyet) {
        kislalar.push({ spotIndex: kislaNoktasi, tier: 0 });
        kullanilabilir -= maliyet;
        harcanan += maliyet;
        kislaKuruldu = true;
      }
    }

    // 1) Boş nokta kaldıysa doldur.
    for (const spotIndex of sirali) {
      if (kuleler.some((k) => k.spotIndex === spotIndex)) continue;
      const def = karsilanabilirKule(kuleler.length, kullanilabilir);
      if (def === undefined) break;
      const maliyet = def.tiers[0].cost;
      kuleler.push({ spotIndex, towerId: def.id, tier: 0 });
      kullanilabilir -= maliyet;
      harcanan += maliyet;
    }

    // 2) Nokta kalmadıysa yükselt: önce hepsi T2, sonra T3.
    if (kuleler.every((k) => k.spotIndex !== undefined) && kuleler.length === sirali.length) {
      // 2a) T1 → T2
      for (let i = 0; i < kuleler.length; i++) {
        const k = kuleler[i];
        if (k === undefined || k.tier !== 0) continue;
        const def = getTower(k.towerId);
        if (def === undefined) continue;
        const maliyet = def.tiers[1].cost;
        if (kullanilabilir < maliyet) continue;
        kuleler[i] = { ...k, tier: 1 };
        kullanilabilir -= maliyet;
        harcanan += maliyet;
      }

      // 2b) T2 → T3. **M7'de eklendi.**
      //
      // Bu daldan önce tahta T2'de takılıyordu ve Kısıt A harita 2-3'te
      // kimsenin sahip olmayacağı bir tahtayı ölçüyordu: oyuncunun elinde
      // 2129/2959 altın varken tahtaya harcanan çok daha azdı. Boss
      // tavanın %192'si (harita 2) ve %292'si (harita 3) çıkıyordu —
      // **ölçüm hatası**, denge hatası değil.
      //
      // **Dal seçimi (§4.2 kısıtı):** Top ailesinin ilk kulesi **Barut
      // Fıçısı** (T3b) alıyor, sonrakiler **Havan** (T3a). Havan uçana
      // vuramıyor ve üç haritanın da kadrosunda Harpi var; hepsini Havan
      // yapmak tahtanın Top kısmını harpi dalgasında tamamen ölü
      // bırakırdı. Diğer aileler T3a alıyor (hasar dalı).
      let topT3Sayisi = 0;
      for (let i = 0; i < kuleler.length; i++) {
        const k = kuleler[i];
        if (k === undefined || k.tier !== 1) continue;
        const def = getTower(k.towerId);
        if (def === undefined) continue;
        const dal: TierIndex = def.id === 'top' && topT3Sayisi === 0 ? 3 : 2;
        const maliyet = tierAt(def, dal).cost;
        if (kullanilabilir < maliyet) continue;
        if (def.id === 'top') topT3Sayisi++;
        kuleler[i] = { ...k, tier: dal };
        kullanilabilir -= maliyet;
        harcanan += maliyet;
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
  return boards.find((b) => b.towers.length >= spotCount)?.waveIndex ?? -1;
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
  return map.paths.map((_, i) => ceilingA(board, branchCoverageFn(map, i), enemy, map));
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
 * Boss'un tavana oranı — `research/01` §12 ve `GAME-DESIGN.md` §5.
 * Hedef band %75-85; türetme ortayı alıyor.
 */
export const BOSS_CEILING_RATIO = 0.8;

/**
 * **Boss HP'si haritadan türetilir** — `700 × hpMultiplier` DEĞİL.
 *
 * ## Neden
 *
 * M7'de ölçüldü: `700 × hpMultiplier` harita 2'de 1120, harita 3'te 1820
 * ediyor ve o haritalarda **karşılanabilir hiçbir tahta** bu kadarını
 * indiremiyor. Kısıt A oranları %165 ve %282 çıkıyordu — yani boss
 * öldürülemez. Sebep basit: HP çarpanı 1,6/2,6 ile büyüyor ama savunma
 * öyle büyümüyor — ayrık yolda **en zayıf kol** yalnız noktaların bir
 * kısmını görüyor ve tavan harita 1'inkinin bile altına düşebiliyor.
 *
 * `research/01` §12 bunu önceden söylemişti: *"boss HP'si `enemies.ts`
 * içinde sabit olmasın; `balance.ts` içinde ölçülen kapsama + referans
 * tahtadan türetilsin."*
 *
 * ## Döngüsellik yok
 *
 * Tavan boss'un **hızına ve savunmasına** bağlı, HP'sine değil. Yani
 * `ceilingA` hesaplanırken boss HP'si hiç kullanılmıyor.
 *
 * ## Kısıt A boss için tautolojiye dönüyor — yerine ne var
 *
 * §12 uyarıyor: HP `0,80 × tavan` olarak tanımlanırsa `tavan > HP × 1,15`
 * testi `tavan > 0,92 × tavan` olur ve **her zaman** geçer. Bu yüzden boss
 * Kısıt A'dan çıkarılıyor ve yerine iki gerçek sağlama geliyor:
 * `bossAffordable` (tahta karşılanıyor mu) ve `BOSS_HP_BAND` regresyon
 * bandı — ikisi de `balanceChecks.test.ts` içinde.
 *
 * @param board Dalga 10 referans tahtası (muhafazakâr taban).
 */
export function deriveBossHp(map: MapDef, board: ReferenceBoard, boss: EnemyDef): number {
  const tavan = ceilingAWeakestBranch(board, boss, map);
  return Math.round(BOSS_CEILING_RATIO * tavan);
}

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
 * Kısıt A'nın bu düşman için **anlamlı** olup olmadığı.
 *
 * `false` ise sayı yine hesaplanıyor ve raporlanıyor — gizlenmiyor — ama
 * eşiği geçmemesi tek başına bir kusur sayılmıyor; doğrulama Kısıt B'de.
 */
export function ceilingAApplies(enemyId: EnemyDef['id']): boolean {
  return !KISLA_ILE_DOGRULANAN.includes(enemyId);
}

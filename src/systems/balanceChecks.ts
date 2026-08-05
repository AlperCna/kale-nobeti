/**
 * Denge sağlamaları: Kısıt A, ekonomi karşılanabilirliği, referans tahta
 * türetimi. `GAME-DESIGN.md` §6, `research/01-denge-matematigi.md`.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz — hepsi saf fonksiyon.
 * TIER 1 kural 1: sayı yok; `BALANCE`, `towers.ts`, `enemies.ts`, `MapDef`.
 */

import type { EnemyDef } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { TowerDef } from '../types/tower';
import type { BoardTower, ReferenceBoard } from '../types/board';
import type { Wave } from '../types/wave';
import type { SpotCoverage } from '../util/coverage';
import { BALANCE } from '../data/balance';
import { getEnemy } from '../data/enemies';
import { OKCU, TOP, getTower } from '../data/towers';
import { applyDamage } from './combat';

// --------------------------------------------------------------- Kısıt A

/**
 * Bir kulenin **belirli bir düşmana karşı etkin** DPS'i.
 *
 * Zırh/direnç `applyDamage` üzerinden uygulanıyor — ham `damage × fireRate`
 * değil. Okçu T2 (10 hasar) boss'a (zırh 10) saniyede 10 değil **1,95**
 * veriyor; farkı yaratan bu.
 */
export function effectiveDps(def: TowerDef, tier: 0 | 1, enemy: EnemyDef): number {
  const t = def.tiers[tier];
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
      coverageByRange(def.tiers[bt.tier].range).find((c) => c.spotIndex === bt.spotIndex)
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
      const e = getEnemy(g.enemy);
      if (e === undefined) continue;
      toplam += Math.round(e.gold * map.goldMultiplier) * g.count;
    }
    toplam += BALANCE.waveEndBonus(w.index);
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
  return sira % 2 === 0 ? TOP : OKCU;
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
  const digeri = tercih === TOP ? OKCU : TOP;
  return butce >= digeri.tiers[0].cost ? digeri : undefined;
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
  const sirali = [...coverage].sort((a, b) => b.coveredPx - a.coveredPx).map((c) => c.spotIndex);

  const kuleler: BoardTower[] = [];
  let harcanan = 0;
  const sonuc: ReferenceBoard[] = [];

  for (const w of waves) {
    // Bu dalganın **başında** elde olan altın = önceki dalgalara kadarki gelir.
    const gelir = cumulativeGold(map, waves, w.index - 1, withEarlyBonus);
    let kullanilabilir = gelir - harcanan;

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

    // 2) Nokta kalmadıysa yükselt — en pahalı karşılanabilirden başlayarak.
    if (kuleler.every((k) => k.spotIndex !== undefined) && kuleler.length === sirali.length) {
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
    }

    sonuc.push({
      waveIndex: w.index,
      towers: kuleler.map((k) => ({ ...k })),
      cumulativeCost: harcanan,
    });
  }

  return sonuc;
}

/** 8 yapı noktasının **ilk kez** tamamen dolduğu dalga. Yoksa `-1`. */
export function spotsFullAtWave(boards: readonly ReferenceBoard[], spotCount: number): number {
  return boards.find((b) => b.towers.length >= spotCount)?.waveIndex ?? -1;
}

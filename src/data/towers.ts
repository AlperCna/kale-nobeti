/**
 * Kule verisi. TIER 1 kural 1: sayı burada, sistem dosyalarında değil.
 *
 * Her sayı `docs/GAME-DESIGN.md` §4.1-§4.3 tablolarından **birebir**.
 * Bir kulenin hasarını değiştirmek için yalnız bu dosyaya dokunulur.
 *
 * **Üç aile × 4 kademe = 12 kademe.** Kışla (§4.4) M5'te; kule değil,
 * asker çıkaran ayrı bir mekanik.
 */

import type { TierIndex, TowerDef, TowerTier } from '../types/tower';

/**
 * Okçu Kulesi — tek hedef, hızlı, ucuz. Fiziksel hasar, uçana vurur,
 * zırha karşı zayıf (§4.1).
 */
export const OKCU: TowerDef = {
  id: 'okcu',
  role: 'Tek hedef, hızlı, ucuz. Zırha karşı zayıf.',
  damageType: 'physical',
  tiers: [
    { cost: 70, damage: 6, fireRate: 1.1, range: 150, airMultiplier: 1 },
    { cost: 110, damage: 10, fireRate: 1.3, range: 165, airMultiplier: 1 },
  ],
  branches: [
    // 3a Keskin Nişancı — uzun menzil, ağır vuruş.
    {
      cost: 170,
      damage: 26,
      fireRate: 0.6,
      range: 260,
      airMultiplier: 1,
      branchName: 'Keskin Nişancı',
    },
    // 3b Kundakçı — 9 hasar + 4/sn yanma (4 sn).
    {
      cost: 170,
      damage: 9,
      fireRate: 1.4,
      range: 165,
      airMultiplier: 1,
      branchName: 'Kundakçı',
      effect: { kind: 'burn', dps: 4, seconds: 4 },
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
      splashRadius: 70,
      airMultiplier: 0,
      branchName: 'Havan',
    },
    // 3b Barut Fıçısı — esnek: uçana %50, ve %40 yavaşlatma (2 sn).
    {
      cost: 240,
      damage: 30,
      fireRate: 0.6,
      range: 150,
      splashRadius: 65,
      airMultiplier: 0.5,
      branchName: 'Barut Fıçısı',
      effect: { kind: 'slow', factor: 0.4, seconds: 2 },
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
      damage: 30,
      fireRate: 0.7,
      range: 170,
      airMultiplier: 1,
      branchName: 'Yıldırım',
      effect: { kind: 'chain', targets: 3, falloff: 0.7 },
    },
    // 3b Buz — %50 yavaşlatma (2,5 sn).
    {
      cost: 230,
      damage: 20,
      fireRate: 0.8,
      range: 180,
      airMultiplier: 1,
      branchName: 'Buz',
      effect: { kind: 'slow', factor: 0.5, seconds: 2.5 },
    },
  ],
};

/** M4 kadrosu: üç kule ailesi. Kışla M5'te. */
export const TOWERS: readonly TowerDef[] = [OKCU, TOP, BUYU];

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

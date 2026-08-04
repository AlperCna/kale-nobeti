/**
 * Kule verisi. TIER 1 kural 1: sayı burada, sistem dosyalarında değil.
 *
 * Her sayı `docs/GAME-DESIGN.md` §4.1-§4.2 tablolarından **birebir**
 * alınmıştır. Bir kulenin hasarını değiştirmek için yalnız bu dosyaya
 * dokunulur.
 *
 * **M2 kapsamı:** Okçu ve Top, yalnız **Tier 1** oynanabilir. T2 satırları
 * tabloda var (yükseltme M4'te), T3 dalları yer tutucu.
 */

import type { TowerDef, TowerTier } from '../types/tower';

/**
 * T3 dalları M4'te dolacak. `TowerDef.branches` zorunlu alan olduğu için
 * boş bırakılamıyor; buraya §4 tablolarının **gerçek** T3 satırları
 * yazıldı, ama `M4` gelene kadar hiçbir kod bunları okumuyor.
 */
const OKCU_T3A: TowerTier = { cost: 170, damage: 26, fireRate: 0.6, range: 260, airMultiplier: 1 };
const OKCU_T3B: TowerTier = { cost: 170, damage: 9, fireRate: 1.4, range: 165, airMultiplier: 1 };
const TOP_T3A: TowerTier = {
  cost: 240,
  damage: 48,
  fireRate: 0.45,
  range: 230,
  splashRadius: 70,
  airMultiplier: 0,
};
const TOP_T3B: TowerTier = {
  cost: 240,
  damage: 30,
  fireRate: 0.6,
  range: 150,
  splashRadius: 65,
  airMultiplier: 0.5,
};

/**
 * Okçu Kulesi — tek hedef, hızlı, ucuz. Fiziksel hasar, uçana vurur,
 * zırha karşı zayıf (`GAME-DESIGN.md` §4.1).
 */
export const OKCU: TowerDef = {
  id: 'okcu',
  role: 'Tek hedef, hızlı, ucuz. Zırha karşı zayıf.',
  damageType: 'physical',
  tiers: [
    { cost: 70, damage: 6, fireRate: 1.1, range: 150, airMultiplier: 1 },
    { cost: 110, damage: 10, fireRate: 1.3, range: 165, airMultiplier: 1 },
  ],
  branches: [OKCU_T3A, OKCU_T3B],
};

/**
 * Top Kulesi — alan hasarı, yavaş. Kalabalığın cevabı
 * (`GAME-DESIGN.md` §4.2).
 *
 * **Uçana vuramaz** (`airMultiplier: 0`) — Havan dalına kadar. Bu, harpi
 * dalgasında oyuncunun tahtasının yarısını ölü bırakan kasıtlı bir zayıflık;
 * T3'te Barut Fıçısı dalı %50 ile bunu açıyor.
 */
export const TOP: TowerDef = {
  id: 'top',
  role: 'Alan hasarı, yavaş. Kalabalığın cevabı.',
  damageType: 'physical',
  tiers: [
    { cost: 110, damage: 22, fireRate: 0.5, range: 140, splashRadius: 45, airMultiplier: 0 },
    { cost: 160, damage: 34, fireRate: 0.55, range: 150, splashRadius: 55, airMultiplier: 0 },
  ],
  branches: [TOP_T3A, TOP_T3B],
};

/** M2'de kurulabilen kuleler. Büyü ve Kışla M4/M5'te ekleniyor. */
export const TOWERS: readonly TowerDef[] = [OKCU, TOP];

export function getTower(id: TowerDef['id']): TowerDef | undefined {
  return TOWERS.find((t) => t.id === id);
}

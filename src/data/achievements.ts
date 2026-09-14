/**
 * Başarım tanımları — `M8-T07`.
 *
 * TIER 1 kural 1: eşikler burada, sistemde değil.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * ## Neden "koşul türü" diye bir alan var
 *
 * Başarımların yarısı **olay** sayıyor (öldürme, kule kurma), yarısı bir
 * elin **sonucuna** bakıyor (canı tam bitir, satmadan bitir, kaç yıldız).
 * İkisini tek bir `check(state)` imzasıyla toplamak mümkündü ama o zaman
 * her başarım bütün oyun durumunu görürdü ve "bu başarım neye bakıyor"
 * sorusunun cevabı koda gömülürdü. Tür alanı sayesinde `AchievementSystem`
 * hangi başarımı **ne zaman** değerlendireceğini tablodan okuyor.
 */

import type { StringKey } from './strings';

/**
 * Koşul türü.
 *
 * - `counter`: bir sayaç eşiği geçti (kalıcı, eller arası birikiyor).
 * - `flag`: bir olay bir kez oldu (ilk kule, ilk T3…).
 * - `runEnd`: el bitince değerlendiriliyor (kalan can, yıldız, sonsuz dalga).
 */
export type AchievementKind = 'counter' | 'flag' | 'runEnd';

export interface AchievementDef {
  readonly id: string;
  readonly kind: AchievementKind;
  /** `counter` için eşik; `flag`/`runEnd` için anlamı tanıma özel. */
  readonly threshold: number;
  readonly title: StringKey;
  readonly desc: StringKey;
}

/**
 * On iki başarım.
 *
 * Seçim ölçütü ROADMAP'in "ucuz dönüş sebebi" notu: her biri **oyuncunun
 * zaten yapacağı** bir şeyi işaretliyor ya da bir kere denemeye değer bir
 * sapma öneriyor. Hiçbiri kavrama (grind) dayanmıyor — `kill1000` bile
 * beş haritayı bir kez bitiren birinde kendiliğinden doluyor.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstTower', kind: 'flag', threshold: 1, title: 'achFirstTower', desc: 'achFirstTowerDesc' },
  { id: 'firstBarracks', kind: 'flag', threshold: 1, title: 'achFirstBarracks', desc: 'achFirstBarracksDesc' },
  { id: 'firstTier3', kind: 'flag', threshold: 1, title: 'achFirstTier3', desc: 'achFirstTier3Desc' },
  { id: 'kill100', kind: 'counter', threshold: 100, title: 'achKill100', desc: 'achKill100Desc' },
  { id: 'kill1000', kind: 'counter', threshold: 1000, title: 'achKill1000', desc: 'achKill1000Desc' },
  { id: 'meteor5', kind: 'flag', threshold: 5, title: 'achMeteor5', desc: 'achMeteor5Desc' },
  { id: 'firstWin', kind: 'runEnd', threshold: 1, title: 'achFirstWin', desc: 'achFirstWinDesc' },
  /** Eşik `-1`: "bütün haritalar" — sayı `MAPS.length`'ten geliyor. */
  { id: 'allMaps', kind: 'runEnd', threshold: -1, title: 'achAllMaps', desc: 'achAllMapsDesc' },
  { id: 'allStars', kind: 'runEnd', threshold: -1, title: 'achAllStars', desc: 'achAllStarsDesc' },
  { id: 'flawless', kind: 'runEnd', threshold: 0, title: 'achFlawless', desc: 'achFlawlessDesc' },
  { id: 'noSell', kind: 'runEnd', threshold: 0, title: 'achNoSell', desc: 'achNoSellDesc' },
  { id: 'endless20', kind: 'runEnd', threshold: 20, title: 'achEndless20', desc: 'achEndless20Desc' },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

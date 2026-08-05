/**
 * Hasar çözümü. `docs/GAME-DESIGN.md` §3.
 *
 * **Oyunun tüm karşı-oyun katmanı bu saf fonksiyonun üstünde duruyor.**
 * `Enemy` kendi hasarını hesaplamaz (`CLAUDE.md` Mimari kuralı); M3'teki
 * Kısıt A/B sağlamaları bunu binlerce kez çağıracak.
 *
 * Saf: sahne yok, rastgelelik yok, zaman yok.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { DamageType, EnemyDef } from '../types/enemy';
import { BALANCE } from '../data/balance';

/**
 * Hiçbir vuruş tamamen emilmez — ham hasarın en az bu oranı geçer.
 *
 * `GAME-DESIGN.md` §3: "oyuncu tamamen yanlış kule kurduğunda oyun
 * kilitlenmez, sadece verimsizleşir. Ceza var ama duvar yok."
 *
 * Sayının kendisi `data/balance.ts`'te (TIER 1 kural 1) — burası yalnız
 * okunur bir takma ad; M2'de sayı bu dosyada yazılıydı ve kuralı deliyordu.
 */
export const DAMAGE_FLOOR_RATIO = BALANCE.damageFloor;

export interface DamageResult {
  /** Düşmanın canından düşecek miktar. Yuvarlanmaz — gösterim katmanı yuvarlar. */
  readonly dealt: number;
  /**
   * Taban devreye girdi mi (zırh/direnç hasarın çoğunu emdi).
   *
   * Hasar sayısının **gri + kalkan ikonu** ile çizilmesi buna bağlı
   * (`GAME-DESIGN.md` §3). Geri bildirim zorunluluğu: taban hasara düşen
   * vuruşlar oyuncuya "kırık" gibi görünüyor.
   */
  readonly floored: boolean;
}

/** `applyDamage`'ın ihtiyaç duyduğu düşman alanları. */
export type Defenses = Pick<EnemyDef, 'armor' | 'magicResist'>;

/**
 * `GAME-DESIGN.md` §3'teki kod bloğunun birebir uygulaması.
 *
 * - **Fiziksel** → zırh ile **sabit miktar** azalır.
 * - **Büyü** → büyü direnci ile **yüzde** azalır.
 * - **Gerçek** → hiçbir şeyle azalmaz (yalnız yeteneklerde).
 *
 * @param dmg Ham hasar. Uçan çarpanı (`airMultiplier`) **buraya girmeden
 *   önce** uygulanır — o kulenin özelliği, düşmanın savunması değil.
 */
export function applyDamage(dmg: number, type: DamageType, e: Defenses): DamageResult {
  if (!(dmg > 0)) return { dealt: 0, floored: false };

  let out = dmg;
  if (type === 'physical') out = dmg - e.armor;
  if (type === 'magic') out = dmg * (1 - e.magicResist);

  const taban = dmg * DAMAGE_FLOOR_RATIO;
  if (out < taban) return { dealt: taban, floored: true };
  return { dealt: out, floored: false };
}

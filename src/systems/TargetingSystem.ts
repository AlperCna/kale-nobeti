/**
 * Hedef seçimi. `docs/GAME-DESIGN.md` §4.5.
 *
 * Beş mod, tanımları belirsiz bırakılmadan. Özellikle `strongest`
 * **maksimum** HP'ye bakar — mevcut HP'ye bakarsa hedef her karede değişir
 * ve kule dönüş animasyonu titrer.
 *
 * TIER 1 kural 9: menzil kontrolü **karesel**, `Math.sqrt` yok.
 * TIER 1 kural 11: Phaser'a dokunmaz — `Enemy` sınıfını değil `Targetable`
 * şeklini tanır.
 */

import type { Targetable } from '../types/enemy';
import type { TargetMode } from '../types/tower';
import { distSq } from '../util/math';

export interface TargetingTower {
  readonly x: number;
  readonly y: number;
  /** Menzilin **karesi**. Çağıran bir kez hesaplar, kare kare değil. */
  readonly rangeSq: number;
  /** `0` ise uçan düşmanlar aday listesinden **elenir** (`GAME-DESIGN.md` §4.2). */
  readonly airMultiplier: 0 | 0.5 | 1;
}

/** Aday olabilir mi: canlı, menzilde, ve kule ona vurabiliyor mu. */
function uygun(e: Targetable, t: TargetingTower): boolean {
  if (!e.alive) return false;
  if (e.def === null) return false;
  if (e.def.flying && t.airMultiplier === 0) return false;
  return distSq(e, t) <= t.rangeSq;
}

/**
 * Modun "daha iyi" tanımı. Küçük olan kazanır.
 *
 * Tek bir skor fonksiyonuna indirgemek, beş modun da **aynı** eşitlik ve
 * kararlılık davranışını paylaşmasını garanti ediyor: skorlar eşitse dizide
 * önce gelen kalır, yani aynı girdi hep aynı hedefi verir.
 */
function skor(mode: TargetMode, e: Targetable, t: TargetingTower): number {
  switch (mode) {
    case 'first':
      return e.remainingDistance;
    case 'last':
      return -e.remainingDistance;
    case 'strongest':
      // Mevcut HP DEĞİL. §4.5: maksimum HP kararlı hedef verir.
      return -e.maxHp;
    case 'weakest':
      return e.hp;
    case 'closest':
      // Karesel mesafe sıralaması gerçek mesafe sıralamasıyla aynı (TIER 1 k.9).
      return distSq(e, t);
  }
}

/**
 * Menzildeki adaylardan moda göre bir hedef seçer.
 *
 * @returns Aday yoksa `null`. Rastgelelik yok; eşitlikte dizi sırası belirleyici.
 */
export function selectTarget(
  mode: TargetMode,
  candidates: readonly Targetable[],
  tower: TargetingTower,
): Targetable | null {
  let enIyi: Targetable | null = null;
  let enIyiSkor = Infinity;

  for (const e of candidates) {
    if (!uygun(e, tower)) continue;
    const s = skor(mode, e, tower);
    // `<`, `<=` DEĞİL: eşitlikte ilk bulunan kalıyor → kararlı seçim.
    if (s < enIyiSkor) {
      enIyiSkor = s;
      enIyi = e;
    }
  }
  return enIyi;
}

/**
 * Mevcut hedef hâlâ geçerli mi.
 *
 * `M2-T07`'nin ateş döngüsü bunu kullanıyor: geçerliyse yeniden arama
 * yapılmıyor. Hedef arama maliyetinin büyük kısmı buradan kalkıyor
 * (`research/02` §8).
 */
export function isTargetStillValid(
  target: Targetable | null,
  tower: TargetingTower,
): target is Targetable {
  return target !== null && uygun(target, tower);
}

import type { Vec2 } from '../types/common';

/**
 * Saf geometri. TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * TIER 1 kural 9: menzil ve yakınlık karşılaştırmaları **karesel** yapılır,
 * `Math.sqrt` çağrılmaz. Tek istisna `segmentLength` — yol uzunluğu gerçek
 * uzunluk ister, karesi toplanamaz.
 */

/** İki nokta arası mesafenin **karesi**. Karşılaştırma için bunu kullan. */
export function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Doğrusal ara değer. `t` kırpılmaz — çağıran sorumlu. */
export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Segmentin **gerçek** uzunluğu.
 *
 * `Math.sqrt`'nin kod tabanındaki tek meşru yeri: yol uzunluğu toplanabilir
 * olmalı ve karelerin toplamı uzunlukların toplamına eşit değil.
 */
export function segmentLength(a: Vec2, b: Vec2): number {
  return Math.sqrt(distSq(a, b));
}

/**
 * Noktanın `a`-`b` segmentine uzaklığının **karesi**.
 *
 * `util/coverage.ts`'in çekirdeği — tüm dengenin asılı olduğu kapsanan yol
 * ölçümü bu fonksiyonu kullanacak (`research/01` §2).
 *
 * Nokta segmentin uzantısına düşerse en yakın **uç noktaya** olan mesafe
 * döner; sonsuz doğruya değil segmente uzaklık ölçülüyor.
 */
export function pointToSegmentDistSq(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const uzunlukKare = abx * abx + aby * aby;

  // Sıfır uzunluklu segment: bozuk veriye dayanıklılık. Yol verisinde
  // üst üste iki waypoint olabilir; sıfıra bölme yerine noktaya uzaklık.
  if (uzunlukKare === 0) return distSq(p, a);

  // p'nin ab üzerindeki izdüşümü, [0,1] aralığına kırpılıyor.
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / uzunlukKare;
  const kirpik = t < 0 ? 0 : t > 1 ? 1 : t;

  const enYakin = { x: a.x + abx * kirpik, y: a.y + aby * kirpik };
  return distSq(p, enYakin);
}

/**
 * `from`'dan `to`'ya açı. Birim: radyan, `-π`…`π`.
 * Düşmanın yönelmesi ve kule dönüşü için.
 */
export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

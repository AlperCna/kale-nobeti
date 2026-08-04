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

/**
 * `a`-`b` segmentinin, `center` merkezli `radius` yarıçaplı çemberin
 * **içinde kalan** parçasının uzunluğu.
 *
 * Kapsama ölçümünün çekirdeği (`util/coverage.ts`). **Analitik** —
 * örnekleme değil. Örnekleme yaklaşımı adım boyutuna göre %1-2 kuantizasyon
 * hatası veriyordu; dengenin tamamı bu sayıya asılı olduğu için kapalı
 * formül tercih edildi. Yan fayda: `stepPx` parametresi ve onunla gelen
 * hassasiyet/maliyet takası tamamen ortadan kalktı.
 *
 * Yöntem: `Q(t) = a + t·(b−a)` üzerinde `|Q(t) − center|² = radius²`
 * ikinci derece denklemi çözülüp kökler `[0,1]`'e kırpılıyor.
 *
 * `Math.sqrt` burada meşru: diskriminantın karekökü kesişim **konumunu**
 * veriyor, karşılaştırma değil (TIER 1 kural 9'un konusu karşılaştırmalar).
 */
export function segmentCircleOverlapLength(
  a: Vec2,
  b: Vec2,
  center: Vec2,
  radius: number,
): number {
  if (radius <= 0) return 0;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const A = dx * dx + dy * dy;

  // Sıfır uzunluklu segment: uzunluğu zaten sıfır, kapsanan da sıfır.
  if (A === 0) return 0;

  const fx = a.x - center.x;
  const fy = a.y - center.y;

  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - radius * radius;

  const disc = B * B - 4 * A * C;
  if (disc < 0) return 0; // çemberi hiç kesmiyor

  const kok = Math.sqrt(disc);
  let t1 = (-B - kok) / (2 * A);
  let t2 = (-B + kok) / (2 * A);

  // Segment [0,1] ile sınırlı; sonsuz doğrunun dışı sayılmaz.
  if (t1 < 0) t1 = 0;
  if (t2 > 1) t2 = 1;
  if (t2 <= t1) return 0;

  return (t2 - t1) * Math.sqrt(A);
}

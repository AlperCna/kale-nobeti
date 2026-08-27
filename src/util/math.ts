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
 * Segment üzerindeki en yakın **nokta** (mesafe değil, konum).
 *
 * `pointToSegmentDistSq` aynı izdüşümü hesaplayıp mesafeyi döndürüyor;
 * burası konumu döndürüyor. Toplanma noktasının yola yapışması
 * (`GAME-DESIGN.md` §4.4 kural 6) buna ihtiyaç duyuyor — mesafeyi bilmek
 * "yola 40 px'ten yakın mı" sorusunu yanıtlıyor ama "nereye yapışacak"
 * sorusunu yanıtlamıyor.
 */
export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const uzunlukKare = abx * abx + aby * aby;
  if (uzunlukKare === 0) return { x: a.x, y: a.y };

  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / uzunlukKare;
  const kirpik = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: a.x + abx * kirpik, y: a.y + aby * kirpik };
}

/**
 * Çok segmentli bir yol üzerindeki en yakın nokta ve karesel mesafesi.
 *
 * Karesel döner (TIER 1 kural 9) — çağıran taraf `pathSnapMax` ile
 * karşılaştırırken o eşiğin karesini kullanıyor.
 */
export function closestPointOnPath(
  p: Vec2,
  path: readonly Vec2[],
): { point: Vec2; distSq: number } {
  if (path.length === 0) return { point: { x: p.x, y: p.y }, distSq: 0 };
  if (path.length === 1) {
    const tek = path[0]!;
    return { point: { x: tek.x, y: tek.y }, distSq: distSq(p, tek) };
  }

  let enIyi = { x: path[0]!.x, y: path[0]!.y };
  let enIyiKare = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const nokta = closestPointOnSegment(p, a, b);
    const kare = distSq(p, nokta);
    if (kare < enIyiKare) {
      enIyiKare = kare;
      enIyi = nokta;
    }
  }
  return { point: enIyi, distSq: enIyiKare };
}

/**
 * Aynı, ama **birden fazla yol** için (harita 2/3 — iki giriş, iki kol).
 *
 * Her yolun en yakın noktası ayrı ayrı hesaplanır, en yakını döner. Tek
 * yollu haritada `closestPointOnPath(p, paths[0])` ile birebir aynı sonucu
 * verir — `paths.length === 1` olduğu için erken çıkış yok, döngü tek
 * turda biter.
 *
 * `Y13`: kışlanın toplanma noktası (`BarracksSystem.defaultRally`/
 * `clampRally`) daha önce yalnız `paths[0]`'a bakıyordu — ikinci kolun
 * yanına kurulan kışla çalışmıyordu. Kök neden burada kapatılıyor.
 */
export function closestPointOnPaths(
  p: Vec2,
  paths: readonly (readonly Vec2[])[],
): { point: Vec2; distSq: number } {
  let enIyi = closestPointOnPath(p, paths[0] ?? []);
  for (let i = 1; i < paths.length; i++) {
    const aday = closestPointOnPath(p, paths[i]!);
    if (aday.distSq < enIyi.distSq) enIyi = aday;
  }
  return enIyi;
}

/**
 * `from`'dan `to`'ya açı. Birim: radyan, `-π`…`π`.
 * Düşmanın yönelmesi ve kule dönüşü için.
 */
export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * İkinci derece (tek kontrol noktalı) bezier — `GAME-DESIGN.md` §10
 * "altın uçuşu": düşman ölünce altın ikonu HUD sayacına bu eğriyle uçuyor.
 *
 * `t` kırpılmaz — çağıran sorumlu (`lerp` ile aynı sözleşme).
 */
export function quadraticBezier(p0: Vec2, control: Vec2, p1: Vec2, t: number): Vec2 {
  const ters = 1 - t;
  return {
    x: ters * ters * p0.x + 2 * ters * t * control.x + t * t * p1.x,
    y: ters * ters * p0.y + 2 * ters * t * control.y + t * t * p1.y,
  };
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
  const aralik = segmentCircleOverlapRange(a, b, center, radius);
  if (aralik === null) return 0;
  return (aralik.t2 - aralik.t1) * segmentLength(a, b);
}

/**
 * `from`'dan `to`'ya doğru en fazla `maxStep` kadar ilerlemiş konum.
 *
 * Mermi hareketi bunu kullanıyor. `Math.sqrt` burada meşru: normalleştirme
 * bir **konum** hesabı, karşılaştırma değil (TIER 1 kural 9'un konusu
 * karşılaştırmalar). Aynı sebeple `segmentLength` de burada.
 *
 * @returns Hedefe kalan mesafe `maxStep`'ten küçükse doğrudan `to`.
 */
export function moveToward(from: Vec2, to: Vec2, maxStep: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const uzaklikKare = dx * dx + dy * dy;

  if (uzaklikKare <= maxStep * maxStep) return { x: to.x, y: to.y };

  const uzaklik = Math.sqrt(uzaklikKare);
  return { x: from.x + (dx / uzaklik) * maxStep, y: from.y + (dy / uzaklik) * maxStep };
}

/**
 * Aynı kesişimin **parametre aralığı**: `[t1, t2]`, `0 ≤ t1 < t2 ≤ 1`.
 *
 * `segmentCircleOverlapLength` bunun uzunluğunu döndürüyor; çizim tarafı
 * (`M2-T04` hover'da kapsanan yol vurgusu) uçların **nerede** olduğunu
 * istiyor. Aynı hesabı iki kez yazmamak için ikisi de buradan besleniyor —
 * ayrılsalardı vurgulanan çizgi ile ölçülen uzunluk sessizce ayrışabilirdi.
 *
 * @returns Kesişim yoksa `null`.
 */
export function segmentCircleOverlapRange(
  a: Vec2,
  b: Vec2,
  center: Vec2,
  radius: number,
): { t1: number; t2: number } | null {
  if (radius <= 0) return null;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const A = dx * dx + dy * dy;

  // Sıfır uzunluklu segment: uzunluğu zaten sıfır, kapsanan da sıfır.
  if (A === 0) return null;

  const fx = a.x - center.x;
  const fy = a.y - center.y;

  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - radius * radius;

  const disc = B * B - 4 * A * C;
  if (disc < 0) return null; // çemberi hiç kesmiyor

  const kok = Math.sqrt(disc);
  let t1 = (-B - kok) / (2 * A);
  let t2 = (-B + kok) / (2 * A);

  // Segment [0,1] ile sınırlı; sonsuz doğrunun dışı sayılmaz.
  if (t1 < 0) t1 = 0;
  if (t2 > 1) t2 = 1;
  if (t2 <= t1) return null;

  return { t1, t2 };
}

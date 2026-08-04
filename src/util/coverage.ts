import type { Vec2 } from '../types/common';
import { segmentLength, segmentCircleOverlapLength } from './math';

/**
 * Kapsanan yol ölçümü — **projenin en kritik sayısı.**
 *
 * `research/01-denge-matematigi.md` §2: tek bir düşmana verilebilecek
 * toplam hasar `Σ (DPS × kapsananYol) / hız` ile sınırlı ve bu değer kule
 * **yerleşiminden bağımsız**. Yani dengenin tamamı buradan çıkan sayıya
 * asılı.
 *
 * `research/01` §4 (300 px) ile `research/03` §3 (450 px) arasındaki
 * çözülmemiş çelişkiyi **bu fonksiyonun çıktısı** kapatacak — varsayım
 * değil ölçüm.
 *
 * **Analitik, örnekleme değil** (`math.segmentCircleOverlapLength`).
 * Örnekleme yaklaşımı adım boyutuna göre %1-2 kuantizasyon hatası
 * veriyordu ve S14 (adım boyutu) diye bir açık soru doğuruyordu; kapalı
 * formül ikisini de ortadan kaldırdı.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

export interface SpotCoverage {
  readonly spotIndex: number;
  /** Bu yapı noktasının menzili içinde kalan yol uzunluğu. Birim: px. */
  readonly coveredPx: number;
}

/**
 * Bir noktanın menzili içinde kalan yol uzunluğu.
 *
 * **Kıvrımlı yolda aynı nokta yolu birden çok kez görebilir** — kapsama
 * toplanır, `2 × menzil` ile sınırlanmaz. `research/01` §4'teki
 * "düz yol varsayımı" tam olarak bu yüzden bir varsayım, tavan değil.
 */
export function coveredLength(path: readonly Vec2[], spot: Vec2, range: number): number {
  if (path.length < 2 || range <= 0) return 0;

  let toplam = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    // noUncheckedIndexedAccess: dizi erişimi undefined olabilir.
    if (a === undefined || b === undefined) continue;
    toplam += segmentCircleOverlapLength(a, b, spot, range);
  }
  return toplam;
}

/**
 * Tüm yapı noktaları için ölçüm. `MapDef.coverage` alanını **bu üretir**,
 * elle yazılmaz (`CLAUDE.md` Mimari kurallar).
 *
 * Çoklu giriş destekli: her yol ayrı taranıp toplanıyor
 * (`DEPENDENCIES.md` §1 — harita 3'ün iki girişi var).
 */
export function measureCoverage(
  paths: readonly (readonly Vec2[])[],
  spots: readonly Vec2[],
  range: number,
): SpotCoverage[] {
  return spots.map((spot, spotIndex) => ({
    spotIndex,
    coveredPx: paths.reduce((t, path) => t + coveredLength(path, spot, range), 0),
  }));
}

/** Bir yolun toplam uzunluğu. `research/01` §3'teki `L` değeri. */
export function pathLength(path: readonly Vec2[]): number {
  let toplam = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (a === undefined || b === undefined) continue;
    toplam += segmentLength(a, b);
  }
  return toplam;
}

/**
 * Uçan hattını menzilinde gören yapı noktası sayısı.
 *
 * `GAME-DESIGN.md` §5 harita kabul kriteri: `flyerPaths` yapı noktalarının
 * en az **%40'ının** menzilinden geçmeli. Sağlanmazsa harpi mekaniği
 * yazı-turaya dönüyor (`research/01` §7) — oyuncunun hiçbir kararı sonucu
 * değiştiremiyor.
 */
export function spotsCoveringFlyerPaths(
  flyerPaths: readonly (readonly Vec2[])[],
  spots: readonly Vec2[],
  range: number,
): number {
  return measureCoverage(flyerPaths, spots, range).filter((c) => c.coveredPx > 0).length;
}

/**
 * Sabit waypoint yolu üzerinde ilerleme.
 *
 * TIER 1 kural 4: yol **dinamik değil**. A* yok, flow field yok, kule yolu
 * değiştiremez. Bu dosyanın tamamı bir dizi düz segment üzerinde yürüme
 * muhasebesinden ibaret ve öyle kalmalı.
 *
 * TIER 1 kural 8: `PathSystem` **saati bilmez**. Hareket miktarı çağıran
 * tarafından `hız × scaledDelta` olarak hazır verilir. Bu sayede `advance`
 * saf bir fonksiyon ve `node` ortamında test edilebiliyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { Vec2 } from '../types/common';
import type { PathProgress } from '../types/path';
import { lerp, segmentLength } from '../util/math';

export class PathSystem {
  private readonly noktalar: readonly Vec2[];
  private readonly segmentUzunluk: readonly number[];
  /** `kalanSegmentBasinda[i]` = i. segmentin **başından** yol sonuna kalan px. */
  private readonly kalanSegmentBasinda: readonly number[];

  readonly totalLength: number;

  constructor(path: readonly Vec2[]) {
    if (path.length < 2) {
      // Sessizce tolere edilmez: tek noktalı yol bir veri hatasıdır ve
      // fark edilmezse düşmanlar doğdukları yerde donar.
      throw new Error(`PathSystem: yol en az 2 waypoint ister, ${path.length} geldi`);
    }
    this.noktalar = path;

    const uzunluklar: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      uzunluklar.push(a !== undefined && b !== undefined ? segmentLength(a, b) : 0);
    }
    this.segmentUzunluk = uzunluklar;

    // Sondan başa kümülatif toplam.
    const kalan = new Array<number>(uzunluklar.length + 1);
    kalan[uzunluklar.length] = 0;
    for (let i = uzunluklar.length - 1; i >= 0; i--) {
      kalan[i] = (kalan[i + 1] ?? 0) + (uzunluklar[i] ?? 0);
    }
    this.kalanSegmentBasinda = kalan;
    this.totalLength = kalan[0] ?? 0;
  }

  /** Segment sayısı = waypoint sayısı − 1. */
  get segmentCount(): number {
    return this.segmentUzunluk.length;
  }

  /** Yolun başındaki ilerleme durumu. */
  start(): PathProgress {
    return { segmentIndex: 0, tInSegment: 0, remainingDistance: this.totalLength };
  }

  /**
   * `pxToMove` kadar ilerletir ve **yeni** bir `PathProgress` döner.
   * Girdiyi değiştirmez.
   *
   * Bir karede birden çok segment geçilebilir — yüksek hızlı düşman (Kurt
   * Binicisi 110 px/sn) 2× hızda ve düşük FPS'te kısa bir segmenti tek
   * karede aşabilir. Döngü bunu işliyor; tek segmentlik varsayım köşede
   * takılmaya yol açardı.
   *
   * Köşe davranışı **keskin dönüş** — köşe kesme (yay) yok. `// GEÇİCİ — S13`;
   * yay eklenirse yol uzunluğu ve dolayısıyla kapsama ölçümü değişir.
   */
  advance(p: PathProgress, pxToMove: number): PathProgress {
    let i = p.segmentIndex;
    let t = p.tInSegment;

    if (!(pxToMove > 0)) return this.durum(i, t); // 0, negatif ve NaN
    let kalanHareket = pxToMove;

    for (;;) {
      if (i >= this.segmentCount) return this.durum(this.segmentCount - 1, 1);

      const uzunluk = this.segmentUzunluk[i] ?? 0;
      if (uzunluk === 0) {
        // Sıfır uzunluklu segment: hareket harcamadan bir sonrakine geç.
        i++;
        t = 0;
        continue;
      }

      const segmentSonunaKalan = (1 - t) * uzunluk;
      if (kalanHareket < segmentSonunaKalan) {
        return this.durum(i, t + kalanHareket / uzunluk);
      }

      kalanHareket -= segmentSonunaKalan;
      i++;
      t = 0;

      if (i >= this.segmentCount) return this.durum(this.segmentCount - 1, 1);
    }
  }

  /** Dünya koordinatı. */
  positionAt(p: PathProgress): Vec2 {
    const i = this.kirp(p.segmentIndex);
    const a = this.noktalar[i];
    const b = this.noktalar[i + 1];
    if (a === undefined || b === undefined) return { x: 0, y: 0 };
    return lerp(a, b, Math.min(1, Math.max(0, p.tInSegment)));
  }

  /** Kaleye vardı mı. */
  reachedEnd(p: PathProgress): boolean {
    return p.remainingDistance <= 0;
  }

  /** `(segmentIndex, t)` → tam `PathProgress`; `remainingDistance` burada türetilir. */
  private durum(segmentIndex: number, tInSegment: number): PathProgress {
    const i = this.kirp(segmentIndex);
    const t = Math.min(1, Math.max(0, tInSegment));
    const kalan = (this.kalanSegmentBasinda[i] ?? 0) - t * (this.segmentUzunluk[i] ?? 0);
    return { segmentIndex: i, tInSegment: t, remainingDistance: Math.max(0, kalan) };
  }

  private kirp(i: number): number {
    return Math.min(this.segmentCount - 1, Math.max(0, i));
  }
}

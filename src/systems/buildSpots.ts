/**
 * Yapı noktası etkileşiminin **saf** kısmı: hangi noktanın üstündeyiz,
 * o nokta dolu mu, tıklama alanı yeterli mi.
 *
 * Plan `systems/BuildSpotUI.ts` diyordu; çizim tarafı `GameScene`'de kaldı
 * çünkü `Graphics` çalışma zamanında Phaser demek (TIER 1 kural 11) ve o
 * durumda isabet testi de `node`'da test edilemezdi. Aynı ayrım `movers.ts`
 * ve `pool.ts`'te de yapıldı: karar burada, boya orada.
 *
 * TIER 1 kural 9: yakınlık kontrolü karesel.
 */

import type { Vec2 } from '../types/common';
import { distSq } from '../util/math';

/**
 * Yapı noktası tıklama yarıçapı. Birim: px (1280×720 ölçeğinde).
 *
 * `CLAUDE.md` Platform: minimum dokunmatik hedef **44×44 px**. Yarıçap 24 →
 * çap 48 px, görsel dairenin (yarıçap 22) bir tık dışında. Görselden büyük
 * olması bilinçli: Poki 640×360'a küçültüyor ve parmak ucu daireyi tam
 * tutturamıyor.
 */
export const SPOT_HIT_RADIUS = 24;

/**
 * Verilen noktaya en yakın yapı noktasının indeksi.
 *
 * Çakışan iki nokta olursa **en yakını** kazanır — dizi sırası değil.
 * Yapı noktaları birbirine 48 px'den yakın konmamalı; `maps.test.ts`
 * bunu ayrıca sınıyor.
 *
 * @returns Hiçbiri tıklama yarıçapında değilse `-1`.
 */
export function findSpotAt(
  point: Vec2,
  spots: readonly Vec2[],
  hitRadius = SPOT_HIT_RADIUS,
): number {
  const esikKare = hitRadius * hitRadius;
  let enIyi = -1;
  let enIyiKare = Infinity;

  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    if (s === undefined) continue;
    const d = distSq(point, s);
    if (d <= esikKare && d < enIyiKare) {
      enIyiKare = d;
      enIyi = i;
    }
  }
  return enIyi;
}

/**
 * Yapı noktalarının doluluk defteri.
 *
 * Kule nesnesini tutmuyor — yalnız "dolu mu" bilgisini. Kule referansı
 * `TowerSystem`'de, ve o `entities/Tower`'ı biliyor (Phaser). Bu ayrım
 * sayesinde doluluk mantığı `node`'da test edilebiliyor.
 */
export class SpotOccupancy {
  readonly #dolu: boolean[];

  constructor(spotCount: number) {
    this.#dolu = new Array<boolean>(spotCount).fill(false);
  }

  get count(): number {
    return this.#dolu.length;
  }

  isValid(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.#dolu.length;
  }

  isOccupied(index: number): boolean {
    return this.isValid(index) && this.#dolu[index] === true;
  }

  /** @returns Yerleştirilebildiyse `true`. Dolu veya geçersiz noktada `false`. */
  occupy(index: number): boolean {
    if (!this.isValid(index) || this.#dolu[index] === true) return false;
    this.#dolu[index] = true;
    return true;
  }

  /** Satış (M3). @returns Boşaltıldıysa `true`. */
  free(index: number): boolean {
    if (!this.isOccupied(index)) return false;
    this.#dolu[index] = false;
    return true;
  }

  get occupiedCount(): number {
    return this.#dolu.reduce((t, d) => t + (d ? 1 : 0), 0);
  }
}

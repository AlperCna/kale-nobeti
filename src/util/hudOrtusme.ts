import type { Kutu } from './math';

/**
 * Nokta, her yönden `pay` kadar büyütülmüş kutunun içinde mi — `M177`.
 * HUD örtüşme saydamlığı (`data/panelLayout.HUD_ORTUSME`) bununla karar
 * veriyor; `GameScene.kutudaDusmanVar` her düşman için çağırıyor.
 */
export function noktaKutuda(x: number, y: number, k: Kutu, pay: number): boolean {
  return x >= k.x0 - pay && x <= k.x1 + pay && y >= k.y0 - pay && y <= k.y1 + pay;
}

/**
 * Alfa hedefe **sabit adımla** yaklaşıyor — `M177`. Anlık geçiş kenardaki
 * bir düşmanda kartı yanıp söndürürdü; adım onu yumuşatıyor. Hedefi
 * aşmıyor.
 */
export function alfaAdimi(mevcut: number, hedef: number, adim: number): number {
  if (mevcut < hedef) return Math.min(hedef, mevcut + adim);
  if (mevcut > hedef) return Math.max(hedef, mevcut - adim);
  return mevcut;
}

/**
 * **Öğretici balonu yapı noktalarını ve HUD'u örtmüyor** — `M180`.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { ipucuYerlesimi, type IpucuYerlesimGirdisi } from './ipucuYerlesimi';
import { kutularKesisiyor, type Kutu } from './math';
import { IPUCU_BALONU, MENU_KACINILAN, MENU_YERLESIM } from '../data/panelLayout';
import { MAPS, MAP_1 } from '../data/maps';
import type { Vec2 } from '../types/common';

const EKRAN_W = 1280;
const EKRAN_H = 720;
/**
 * Balonun ölçülen boyları: tek satır (`hintBuild`) asgari yükseklikte;
 * en uzun ipucu (hedefleme modları) üç satır. 120 üç satırın üstünde pay.
 */
const BOYLAR = [IPUCU_BALONU.asgariH, 120];

function girdi(noktalar: readonly Vec2[], yukseklik: number): IpucuYerlesimGirdisi {
  return {
    genislik: IPUCU_BALONU.w,
    yukseklik,
    x: EKRAN_W / 2,
    ustY: IPUCU_BALONU.ustY,
    ekranW: EKRAN_W,
    ekranH: EKRAN_H,
    kenarPay: MENU_YERLESIM.kenarPay,
    noktalar,
    kartusYari: MENU_YERLESIM.kartusYari,
    kacinilan: MENU_KACINILAN.map((k) => k.kutu),
    adim: IPUCU_BALONU.adim,
  };
}

function kartus(n: Vec2): Kutu {
  const r = MENU_YERLESIM.kartusYari;
  return { x0: n.x - r, y0: n.y - r, x1: n.x + r, y1: n.y + r };
}

describe('ipucuYerlesimi (M180)', () => {
  it('çakışma yoksa balon bugünkü yerinde: üst-orta', () => {
    const yer = ipucuYerlesimi(girdi([], IPUCU_BALONU.asgariH));
    expect(yer.gecerli).toBe(true);
    expect(yer.x).toBe(EKRAN_W / 2);
    expect(yer.kutu.y0).toBe(IPUCU_BALONU.ustY);
  });

  /** Kusurun şekli: tercih edilen yer Değirmen Geçidi'nde bir noktayı örtüyor. */
  it('HATANIN ŞEKLİ: Değirmen Geçidi’nde tercih edilen yer bir yapı noktasını örtüyor', () => {
    const yari = IPUCU_BALONU.w / 2;
    const varsayilan: Kutu = {
      x0: EKRAN_W / 2 - yari,
      y0: IPUCU_BALONU.ustY,
      x1: EKRAN_W / 2 + yari,
      y1: IPUCU_BALONU.ustY + IPUCU_BALONU.asgariH,
    };
    expect(MAP_1.buildSpots.some((n) => kutularKesisiyor(varsayilan, kartus(n)))).toBe(true);
  });

  for (const m of MAPS) {
    for (const h of BOYLAR) {
      it(`${m.id}, yükseklik ${h}: geçerli yer var, hiçbir noktayı ve HUD kutusunu örtmüyor`, () => {
        const yer = ipucuYerlesimi(girdi(m.buildSpots, h));
        expect(yer.gecerli, m.id).toBe(true);
        for (const n of m.buildSpots) {
          expect(kutularKesisiyor(yer.kutu, kartus(n)), `${m.id} (${n.x},${n.y})`).toBe(false);
        }
        for (const k of MENU_KACINILAN) {
          expect(kutularKesisiyor(yer.kutu, k.kutu), `${m.id} ${k.ad}`).toBe(false);
        }
        expect(yer.kutu.x0).toBeGreaterThanOrEqual(0);
        expect(yer.kutu.x1).toBeLessThanOrEqual(EKRAN_W);
        expect(yer.kutu.y1).toBeLessThanOrEqual(EKRAN_H);
      });
    }
  }

  /**
   * "İlk kuleni kur" yalnız ilk haritada görünüyor (ilk oturum doğrudan
   * oraya açılıyor). Orada balon **üst bantta kalıyor**, yana kayıyor —
   * oyun alanının ortasına inmiyor.
   */
  it('Değirmen Geçidi: tek satırlık balon üst bantta kalıyor', () => {
    const yer = ipucuYerlesimi(girdi(MAP_1.buildSpots, IPUCU_BALONU.asgariH));
    expect(yer.kutu.y0).toBe(IPUCU_BALONU.ustY);
    expect(yer.x).not.toBe(EKRAN_W / 2);
  });
});

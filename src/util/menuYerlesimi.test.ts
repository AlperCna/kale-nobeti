import { describe, it, expect } from 'vitest';
import { menuYerlesimi, type MenuYerlesimGirdisi } from './menuYerlesimi';
import { kutularKesisiyor } from './math';
import { MAPS } from '../data/maps';
import { MENU_KACINILAN, MENU_YERLESIM, OLCULMUS_MENU_BOYLARI } from '../data/panelLayout';

const EKRAN = { ekranW: 1280, ekranH: 720 } as const;

function girdi(nokta: { x: number; y: number }, w: number, h: number): MenuYerlesimGirdisi {
  return {
    nokta,
    olcu: { sol: -w / 2, sag: w / 2, ust: -h / 2, alt: h / 2 },
    ...EKRAN,
    ...MENU_YERLESIM,
    kacinilan: MENU_KACINILAN.map((k) => k.kutu),
  };
}

describe('menuYerlesimi — tek nokta (M169)', () => {
  it('engel yoksa menü noktanın ÜSTÜNDE, noktaya ortalı', () => {
    const y = menuYerlesimi({ ...girdi({ x: 640, y: 400 }, 300, 100), kacinilan: [] });
    expect(y.gecerli).toBe(true);
    expect(y.x).toBe(640);
    expect(y.kutu.y1).toBe(400 - MENU_YERLESIM.noktaBosluk);
  });

  it('üste sığmayan nokta ALTA çevriliyor', () => {
    const y = menuYerlesimi({ ...girdi({ x: 640, y: 80 }, 300, 100), kacinilan: [] });
    expect(y.gecerli).toBe(true);
    expect(y.kutu.y0).toBe(80 + MENU_YERLESIM.noktaBosluk);
  });

  it('Kül Ovası sağ kol noktası (1055,195) — menü üst-sağ şeride girmiyor', () => {
    // Oyunda bulunan kusur: menü 773-1264 × 36-147'ye açılıyor, duraklat
    // düğmesi "Büyü 100"ün, hız düğmesi "?"nin üstüne düşüyordu.
    const y = menuYerlesimi(girdi({ x: 1055, y: 195 }, 491, 111));
    expect(y.gecerli).toBe(true);
    const serit = MENU_KACINILAN.find((k) => k.ad === 'üst-sağ şerit')!.kutu;
    expect(kutularKesisiyor(y.kutu, serit)).toBe(false);
  });

  it('hiçbir aday geçerli değilse `gecerli: false` — sessizce geçmiyor', () => {
    const tumEkran = { x0: 0, y0: 0, x1: 1280, y1: 720 };
    const y = menuYerlesimi({ ...girdi({ x: 640, y: 400 }, 300, 100), kacinilan: [tumEkran] });
    expect(y.gecerli).toBe(false);
  });
});

/**
 * **Asıl sağlama: altı haritanın bütün noktaları, ölçülmüş bütün menü
 * boyları.** Her birinde geçerli bir yer bulunmalı — ekranın içinde,
 * hiçbir kalıcı HUD kutusuna girmeyen, noktanın kartuşunu örtmeyen.
 *
 * `M168` ve `M169`'da bulunan dört çakışmanın dördü de oyunda, gözle
 * bulundu; bu test onları **önceden** bulurdu.
 */
describe('menuYerlesimi — altı harita × bütün noktalar × bütün menüler', () => {
  for (const m of MAPS) {
    it(`${m.id}: her noktada her menü için geçerli bir yer var`, () => {
      const kusurlar: string[] = [];
      m.buildSpots.forEach((s, i) => {
        for (const b of OLCULMUS_MENU_BOYLARI) {
          const y = menuYerlesimi(girdi(s, b.w, b.h));
          if (!y.gecerli) kusurlar.push(`nokta ${i} (${s.x},${s.y}) · ${b.ad}`);
          // Geçerli dediği yeri bağımsızca yeniden sına.
          for (const k of MENU_KACINILAN) {
            if (y.gecerli && kutularKesisiyor(y.kutu, k.kutu)) {
              kusurlar.push(`nokta ${i} · ${b.ad} · ${k.ad} ile kesişiyor`);
            }
          }
          if (y.kutu.x0 < 0 || y.kutu.y0 < 0 || y.kutu.x1 > 1280 || y.kutu.y1 > 720) {
            kusurlar.push(`nokta ${i} · ${b.ad} · ekran dışı`);
          }
        }
      });
      expect(kusurlar).toEqual([]);
    });
  }
});

import { describe, it, expect } from 'vitest';
import { MAPS } from './maps';
import { PANEL_W, PANEL_H, PANEL_SAG, PANEL_SOL, PANEL_ESIK, panelKonumu } from './panelLayout';

/** `MapRenderer.SPOT_RADIUS` — yuva dairesinin yarıçapı. */
const NOKTA_YARICAPI = 28;

function icinde(
  nokta: { x: number; y: number },
  kutu: { x: number; y: number },
  pay: number,
): boolean {
  return (
    nokta.x > kutu.x - pay &&
    nokta.x < kutu.x + PANEL_W + pay &&
    nokta.y > kutu.y - pay &&
    nokta.y < kutu.y + PANEL_H + pay
  );
}

describe('Kule bilgi paneli — incelenen kuleyi ÖRTMEZ', () => {
  /**
   * Oyuncu geri bildirimi: *"şuradaki konum çok iyi değil"*. Panel sabit
   * sağ-alttaydı ve %90 opak; harita 1'in `7` numaralı noktası
   * `(1120, 485)` tamamen altında kalıyordu. Sağ alttaki bir kuleyi
   * seçtiğinde panel **o kuleyi** örtüyordu.
   *
   * Bu test değişmez kuralı bekçiliyor: hangi noktayı seçersen seç,
   * panelin seçtiği köşe o noktayı içermiyor.
   */
  it('beş haritanın hiçbir yapı noktası, kendi paneli tarafından örtülmüyor', () => {
    for (const m of MAPS) {
      for (const [i, s] of m.buildSpots.entries()) {
        const yer = panelKonumu(s.x);
        expect(icinde(s, yer, NOKTA_YARICAPI), `${m.id} nokta ${i} (${s.x},${s.y}) panelin altinda`).toBe(
          false,
        );
      }
    }
  });

  it('kaçınma eşikten çıkıyor — iki köşe orta eksenin karşı yanlarında', () => {
    // Sağ köşe eşiğin sağında BAŞLIYOR, sol köşe eşiğin solunda BİTİYOR.
    // Bu iki şart doğruyken yukarıdaki test matematiksel olarak garanti.
    expect(PANEL_SAG.x).toBeGreaterThan(PANEL_ESIK);
    expect(PANEL_SOL.x + PANEL_W).toBeLessThan(PANEL_ESIK);
  });

  it('iki köşe de ekranın içinde', () => {
    for (const yer of [PANEL_SAG, PANEL_SOL]) {
      expect(yer.x).toBeGreaterThanOrEqual(0);
      expect(yer.y).toBeGreaterThanOrEqual(0);
      expect(yer.x + PANEL_W).toBeLessThanOrEqual(1280);
      expect(yer.y + PANEL_H).toBeLessThanOrEqual(720);
    }
  });

  it('sol yerleşim yetenek düğmelerinin ÜSTÜNDE bitiyor', () => {
    // Yetenek şeridi `28,622 – 170,707` (`maps.test.ts` KALICI_HUD).
    expect(PANEL_SOL.y + PANEL_H).toBeLessThanOrEqual(622);
  });

  it('sağ yerleşim kalıcı HUD ile çakışmıyor — tam ekran düğmesi hariç', () => {
    // Tam ekran düğmesi `848,636 – 928,714`; panel `998,440` — kesişmiyor.
    expect(PANEL_SAG.x).toBeGreaterThan(928);
  });
});

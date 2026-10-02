import { describe, it, expect } from 'vitest';
import { MAPS } from './maps';
import {
  PANEL_W,
  PANEL_H,
  PANEL_SAG,
  PANEL_SOL,
  PANEL_ESIK,
  PANEL_IC_PAY,
  PANEL_IKON_HEDEF,
  PANEL_IKON_SUTUN,
  panelKonumu,
  ERKEN_BASLAT,
  UST_ORTA_HUD,
  AYAR_DUGMESI,
  BASARIM_BANDI,
  panelYuksekligi,
} from './panelLayout';
import { ENEMIES } from './enemies';

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
  it('altı haritanın hiçbir yapı noktası, kendi paneli tarafından örtülmüyor', () => {
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

  /**
   * **`M134` — panelin boyu kadrodan türüyor, sabit değil.**
   *
   * S166 kapanırken ikon şeridi ızgaraya döndü (hedefler 29×44 → 44×44)
   * ve panel bir ikon satırı uzadı. Sabit bırakılsaydı beş düşmanlı
   * harita 1'de altta 44 px ölü boşluk kalırdı.
   *
   * `PANEL_H` en kötü hâli tarif ediyor ve içindeki satır sayısı elle
   * yazılı; burada `MAPS`'ten türetilip karşılaştırılıyor. Yeni bir
   * düşman kadroya girip satır sayısını artırırsa bu test kırılır —
   * `PANEL_H`'in yorumu da o zaman yeniden yazılır.
   */
  it('PANEL_H en kalabalık kadronun gerektirdiği boy — MAPS`ten türetildi', () => {
    const satir = (m: (typeof MAPS)[number]): number =>
      Math.ceil(ENEMIES.filter((e) => m.enemyRoster.includes(e.id)).length / PANEL_IKON_SUTUN);
    const enCok = Math.max(...MAPS.map(satir));
    expect(PANEL_H, `en kalabalık kadro ${enCok} satır`).toBe(panelYuksekligi(enCok));
  });

  it('her haritanın KENDİ boyu iki yerleşimde de sınırların içinde', () => {
    for (const m of MAPS) {
      const kadro = ENEMIES.filter((e) => m.enemyRoster.includes(e.id)).length;
      const h = panelYuksekligi(Math.ceil(kadro / PANEL_IKON_SUTUN));
      for (const spotX of [100, 1100]) {
        const yer = panelKonumu(spotX, h);
        expect(yer.y, `${m.id} üst kenar`).toBeGreaterThanOrEqual(0);
        expect(yer.y + h, `${m.id} alt kenar`).toBeLessThanOrEqual(720);
      }
      // Sol yerleşim yetenek şeridinin üstünde bitmeye devam ediyor.
      expect(panelKonumu(1100, h).y + h, `${m.id} yetenek şeridi`).toBeLessThanOrEqual(622);
    }
  });

  it('ikon ızgarası panelin iç genişliğine sığıyor — hedefler 44×44', () => {
    expect(PANEL_IKON_SUTUN * PANEL_IKON_HEDEF).toBeLessThanOrEqual(PANEL_W - 2 * PANEL_IC_PAY);
    // Platform alt sınırı: hedef iki eksende de 44'ten küçük olamaz.
    expect(PANEL_IKON_HEDEF).toBeGreaterThanOrEqual(44);
  });
});

/**
 * `M168` — "Dalgayı başlat" kutusu tek adreste ve kutu, düğmeyi **ve**
 * altındaki risk satırını kapsıyor. `BuildMenu` bu kutudan kaçıyor;
 * kutu düğmeden dar olursa menü yine düğmenin altına girer.
 */
describe('UST_ORTA_HUD — erken başlat kutusu (M168)', () => {
  it('düğmenin tamamını kapsıyor', () => {
    expect(UST_ORTA_HUD.x0).toBeLessThanOrEqual(ERKEN_BASLAT.x - ERKEN_BASLAT.w / 2);
    expect(UST_ORTA_HUD.x1).toBeGreaterThanOrEqual(ERKEN_BASLAT.x + ERKEN_BASLAT.w / 2);
    expect(UST_ORTA_HUD.y0).toBeLessThanOrEqual(ERKEN_BASLAT.y - ERKEN_BASLAT.h / 2);
    expect(UST_ORTA_HUD.y1).toBeGreaterThanOrEqual(ERKEN_BASLAT.y + ERKEN_BASLAT.h / 2);
  });

  it('düğmenin altındaki risk satırını da kapsıyor (merkez + 46, ~18 px)', () => {
    expect(UST_ORTA_HUD.y1).toBeGreaterThanOrEqual(ERKEN_BASLAT.y + 46 + 9);
  });

  it('hiçbir haritada yapı noktası kutunun altında değil', () => {
    for (const m of MAPS) {
      for (const s of m.buildSpots) {
        const icinde =
          s.x > UST_ORTA_HUD.x0 && s.x < UST_ORTA_HUD.x1 && s.y > UST_ORTA_HUD.y0 && s.y < UST_ORTA_HUD.y1;
        expect(icinde, `${m.id} (${s.x},${s.y})`).toBe(false);
      }
    }
  });
});

describe('BASARIM_BANDI — ayar düğmesiyle çakışmıyor (M168)', () => {
  const bant = {
    x0: 1280 - BASARIM_BANDI.sagBosluk - BASARIM_BANDI.w,
    x1: 1280 - BASARIM_BANDI.sagBosluk,
    y0: BASARIM_BANDI.y - BASARIM_BANDI.h / 2,
    y1: BASARIM_BANDI.y + BASARIM_BANDI.h / 2,
  };
  const ayar = {
    x0: AYAR_DUGMESI.x - AYAR_DUGMESI.w / 2,
    x1: AYAR_DUGMESI.x + AYAR_DUGMESI.w / 2,
    y0: AYAR_DUGMESI.y - AYAR_DUGMESI.h / 2,
    y1: AYAR_DUGMESI.y + AYAR_DUGMESI.h / 2,
  };

  it('bant ayar düğmesinin dikey bandına girmiyor — kayarken de üstünden geçmiyor', () => {
    expect(bant.y0, `bant ${bant.y0}-${bant.y1}, ayar ${ayar.y0}-${ayar.y1}`).toBeGreaterThanOrEqual(ayar.y1);
  });

  it('bant ekranın içinde ve kule bilgi panelinin üstünde bitiyor', () => {
    expect(bant.x0).toBeGreaterThanOrEqual(0);
    expect(bant.y1).toBeLessThanOrEqual(PANEL_SAG.y);
  });
});

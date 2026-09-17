import { describe, expect, it } from 'vitest';
import {
  adimBasla,
  adimBitti,
  araDegerUygula,
  gercegeDon,
  konumIsinla,
  type AraDegerli,
} from './araDeger';

function nesne(x = 0, y = 0): AraDegerli {
  return { x, y, oncekiX: x, oncekiY: y, gercekX: x, gercekY: y };
}

describe('ara değer üretimi — M65', () => {
  it('tam bir kare döngüsü: mantık 60 Hz, çizim arada', () => {
    const n = nesne(100, 100);

    adimBasla(n);
    n.x = 110; // mantık adımı
    adimBitti(n);

    araDegerUygula(n, 0.5);
    expect(n.x).toBe(105);

    araDegerUygula(n, 0);
    expect(n.x).toBe(100);

    araDegerUygula(n, 1);
    expect(n.x).toBe(110);
  });

  /**
   * **Asıl tehlike bu.** Ara değer `x`'e yazılıyor; bir sonraki adım
   * oradan devam ederse mantık yarım adım yanılır ve `M64`'ün kurtardığı
   * belirlilik geri gider.
   */
  it('**mantık ara değerden DEVAM ETMİYOR** — gercegeDon kilidi', () => {
    const n = nesne(0, 0);

    adimBasla(n);
    n.x = 60;
    adimBitti(n);
    araDegerUygula(n, 0.25); // çizim: 15
    expect(n.x).toBe(15);

    gercegeDon(n);
    expect(n.x).toBe(60); // mantık 60'tan devam ediyor, 15'ten değil
  });

  it('oran aralık dışındaysa kırpılıyor — geleceğe taşma yok', () => {
    const n = nesne(0, 0);
    adimBasla(n);
    n.x = 10;
    adimBitti(n);

    araDegerUygula(n, 2.5);
    expect(n.x).toBe(10);
    araDegerUygula(n, -1);
    expect(n.x).toBe(0);
  });

  /**
   * Havuzdan çıkan nesne (kural 3): `onceki` bir önceki sahibin son
   * konumunu taşırsa ilk karesinde ekranın öbür ucundan süzülür.
   */
  it('ışınlanma havuz mirasını siliyor', () => {
    const n: AraDegerli = { x: 900, y: 500, oncekiX: 10, oncekiY: 10, gercekX: 10, gercekY: 10 };

    konumIsinla(n);
    araDegerUygula(n, 0.5);

    expect(n.x).toBe(900);
    expect(n.y).toBe(500);
  });

  it('duran nesne kıpırdamıyor — oran ne olursa olsun', () => {
    const n = nesne(42, 7);
    adimBasla(n);
    adimBitti(n);

    for (const o of [0, 0.3, 0.77, 1]) {
      araDegerUygula(n, o);
      expect(n.x).toBe(42);
      expect(n.y).toBe(7);
    }
  });

  it('iki eksen birlikte ilerliyor', () => {
    const n = nesne(0, 0);
    adimBasla(n);
    n.x = 100;
    n.y = -40;
    adimBitti(n);

    araDegerUygula(n, 0.25);
    expect(n.x).toBe(25);
    expect(n.y).toBe(-10);
  });
});

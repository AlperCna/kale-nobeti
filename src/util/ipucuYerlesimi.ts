import type { Vec2 } from '../types/common';
import { kutularKesisiyor, type Kutu } from './math';

/**
 * **Öğretici balonunun yeri** — `M180`.
 *
 * Balon üst-ortada, HUD'un "Dalgayı başlat" kutusunun hemen altında
 * açılıyordu ve yerini haritaya bakmadan seçiyordu. ~6 sn görünüp
 * kaybolduğu sürece sorun sayılmamıştı. `M180` "ilk kuleni kur" balonunu
 * ilk kule kurulana kadar ekranda tutunca görüldü: Değirmen Geçidi'nde
 * balonun alt kenarı (480, 213) noktasının üst üçte birini örtüyordu.
 * "Altın daireye dokun" diyen balon bir altın daireyi saklıyordu.
 *
 * ## Kural
 *
 * Önce tercih edilen **satır** (üst bant), o satırda tercih edilen x'e en
 * yakın geçerli merkez (önce sağ, sonra sol). Satırda yer yoksa bir adım
 * aşağı. Yani balon olabildiğince **üst bantta** kalıyor ve oyun alanının
 * ortasına ancak üst bant tamamen doluysa iniyor.
 *
 * Geçerli = ekranın içinde (kenar payıyla), hiçbir yapı noktasının
 * kartuşuna ve kaçınılan HUD kutusuna (kenar payıyla şişirilmiş) girmiyor.
 * Kartuş yapı menüsünün de kaçtığı alan (`MENU_YERLESIM.kartusYari`):
 * kule kurulunca görselin kapladığı yer, yani balon kurulu kuleleri de
 * örtmüyor.
 *
 * TIER 1 kural 11: Phaser yok; altı haritanın bütün noktalarına karşı
 * `ipucuYerlesimi.test.ts` sınıyor.
 */
export interface IpucuYerlesimGirdisi {
  readonly genislik: number;
  readonly yukseklik: number;
  /** Tercih edilen merkez x ve üst kenar. */
  readonly x: number;
  readonly ustY: number;
  readonly ekranW: number;
  readonly ekranH: number;
  /** Ekran kenarından ve kaçınılan kutulardan bırakılan boşluk. */
  readonly kenarPay: number;
  readonly noktalar: readonly Vec2[];
  /** Noktanın kartuşunun yarı genişliği — balon bunu örtmüyor. */
  readonly kartusYari: number;
  readonly kacinilan: readonly Kutu[];
  /** Tarama adımı (px). */
  readonly adim: number;
}

export interface IpucuYeri {
  /** Balonun merkezi. */
  readonly x: number;
  readonly y: number;
  readonly kutu: Kutu;
  /** Hiçbir yer geçerli değilse `false` — tercih edilen yer döndürülüyor. */
  readonly gecerli: boolean;
}

function sisir(k: Kutu, pay: number): Kutu {
  return { x0: k.x0 - pay, y0: k.y0 - pay, x1: k.x1 + pay, y1: k.y1 + pay };
}

export function ipucuYerlesimi(g: IpucuYerlesimGirdisi): IpucuYeri {
  const yari = g.genislik / 2;
  const engeller: Kutu[] = [
    ...g.kacinilan.map((k) => sisir(k, g.kenarPay)),
    ...g.noktalar.map((n) => ({
      x0: n.x - g.kartusYari,
      y0: n.y - g.kartusYari,
      x1: n.x + g.kartusYari,
      y1: n.y + g.kartusYari,
    })),
  ];
  const kutuAt = (cx: number, ust: number): Kutu => ({
    x0: cx - yari,
    y0: ust,
    x1: cx + yari,
    y1: ust + g.yukseklik,
  });
  const yer = (cx: number, ust: number, gecerli: boolean): IpucuYeri => ({
    x: cx,
    y: ust + g.yukseklik / 2,
    kutu: kutuAt(cx, ust),
    gecerli,
  });
  const bos = (k: Kutu): boolean => !engeller.some((e) => kutularKesisiyor(k, e));

  const minX = g.kenarPay + yari;
  const maxX = g.ekranW - g.kenarPay - yari;
  for (let ust = g.ustY; ust + g.yukseklik <= g.ekranH - g.kenarPay; ust += g.adim) {
    for (let d = 0; g.x + d <= maxX || g.x - d >= minX; d += g.adim) {
      const sag = g.x + d;
      const sol = g.x - d;
      if (sag >= minX && sag <= maxX && bos(kutuAt(sag, ust))) return yer(sag, ust, true);
      if (d > 0 && sol >= minX && sol <= maxX && bos(kutuAt(sol, ust))) return yer(sol, ust, true);
    }
  }
  return yer(g.x, g.ustY, false);
}

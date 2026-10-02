import type { Vec2 } from '../types/common';
import { kutularKesisiyor, type Kutu } from './math';

/**
 * **Yapı menüsünün yeri** — `M169`, `BuildMenu`'dan çıkarıldı.
 *
 * Hesap `BuildMenu.#menuArkalikEkleVeKonumla`'nın içindeydi ve her HUD
 * çakışması ayrı bir `if` ile eklenmişti: önce kart (`M8-T01`), sonra
 * üst-orta "Dalgayı başlat" kutusu (`M168`), sonra yetenek bloğu
 * (`M169`). Her biri **oyunda** bulundu, testte değil — çünkü hesap
 * Phaser'ın içindeydi ve sınanamıyordu. Dördüncüsü de oyunda çıktı:
 * Kül Ovası'nın sağ kol noktasında menü duraklatma düğmesinin altına
 * açılıyordu. Kural ekleyerek kovalamak yerine hesap saf bir fonksiyona
 * çıktı ve **altı haritanın bütün noktalarına** karşı sınanıyor
 * (`menuYerlesimi.test.ts`).
 *
 * ## Kural
 *
 * Önce noktanın üstü, sonra altı denenir (menü noktaya ortalı). Geçersiz
 * bir aday, çarptığı her engelin — kaçınılan kutu ya da noktanın kartuşu —
 * sağına, soluna, altına ve üstüne kaydırılarak yeni adaylar doğurur;
 * arama genişlik öncelikli, yani **en az kaydırmalı** geçerli yer seçilir.
 *
 * Geçerli = ekranın içinde (kenar payıyla), kaçınılan hiçbir kutuya
 * (kenar payıyla şişirilmiş) girmiyor ve noktanın kartuşunu örtmüyor.
 * Kartuş kuralı `M8`'den: menünün düğmeleri incelenen kulenin üstüne
 * düşmemeli.
 */

/** Menü panelinin, kabın orijinine göre kenarları. */
export interface MenuOlcusu {
  readonly sol: number;
  readonly sag: number;
  readonly ust: number;
  readonly alt: number;
}

export interface MenuYerlesimGirdisi {
  readonly nokta: Vec2;
  readonly olcu: MenuOlcusu;
  readonly ekranW: number;
  readonly ekranH: number;
  /** Ekran kenarından ve kaçınılan kutulardan bırakılan boşluk. */
  readonly kenarPay: number;
  /** Noktanın merkezi ile menünün yakın kenarı arasındaki boşluk. */
  readonly noktaBosluk: number;
  /** Noktanın kartuşunun yarı genişliği — menü bunu örtmüyor. */
  readonly kartusYari: number;
  readonly kacinilan: readonly Kutu[];
}

export interface MenuYeri {
  /** Kabın konumu. */
  readonly x: number;
  readonly y: number;
  /** Panelin ekrandaki kutusu. */
  readonly kutu: Kutu;
  /** Hiçbir aday geçerli değilse `false` — ilk aday döndürülüyor. */
  readonly gecerli: boolean;
}

/**
 * Kaç ardışık kaydırma deneniyor. `M169`'da ölçüldü: altı haritanın bütün
 * noktalarında **bir** kaydırma yetiyor (sıfırda altı haritanın altısı da
 * kırılıyor — yalnız üst/alt yetmez). 3, gelecekteki bir harita için pay.
 */
const ARAMA_DERINLIGI = 3;

function kenetle(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function sisir(k: Kutu, pay: number): Kutu {
  return { x0: k.x0 - pay, y0: k.y0 - pay, x1: k.x1 + pay, y1: k.y1 + pay };
}

export function menuYerlesimi(g: MenuYerlesimGirdisi): MenuYeri {
  const { nokta, olcu, kenarPay } = g;
  const minX = kenarPay - olcu.sol;
  const maxX = g.ekranW - kenarPay - olcu.sag;
  const minY = kenarPay - olcu.ust;
  const maxY = g.ekranH - kenarPay - olcu.alt;

  const kutuAt = (x: number, y: number): Kutu => ({
    x0: x + olcu.sol,
    y0: y + olcu.ust,
    x1: x + olcu.sag,
    y1: y + olcu.alt,
  });
  const kartus: Kutu = {
    x0: nokta.x - g.kartusYari,
    y0: nokta.y - g.kartusYari,
    x1: nokta.x + g.kartusYari,
    y1: nokta.y + g.kartusYari,
  };
  const engeller = g.kacinilan.map((k) => sisir(k, kenarPay));
  const carpanlar = (k: Kutu): Kutu[] => engeller.filter((e) => kutularKesisiyor(e, k));
  const gecerli = (k: Kutu): boolean => carpanlar(k).length === 0 && !kutularKesisiyor(k, kartus);

  const ustY = kenetle(nokta.y - g.noktaBosluk - olcu.alt, minY, maxY);
  const altY = kenetle(nokta.y + g.noktaBosluk - olcu.ust, minY, maxY);
  const ortaX = kenetle(nokta.x, minX, maxX);

  // Kartuş da bir engel: menünün yakın kenarı ondan `noktaBosluk -
  // kartusYari` kadar uzakta durur — yukarıdaki üst/alt adaylarla aynı.
  const kartusEngeli = sisir(kartus, g.noktaBosluk - g.kartusYari);

  // Genişlik öncelikli arama: geçersiz her aday, çarptığı her engelin
  // sağına, soluna, altına ve üstüne kaydırılarak yeni adaylar doğuruyor.
  // En az kaydırmalı yer kazanıyor; derinlik sınırı aramayı sonlu tutuyor.
  const kuyruk: { x: number; y: number; d: number }[] = [
    { x: ortaX, y: ustY, d: 0 },
    { x: ortaX, y: altY, d: 0 },
  ];
  const gorulen = new Set<string>();
  for (let i = 0; i < kuyruk.length; i++) {
    const a = kuyruk[i]!;
    const anahtar = `${Math.round(a.x)},${Math.round(a.y)}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    const kutu = kutuAt(a.x, a.y);
    if (gecerli(kutu)) return { x: a.x, y: a.y, kutu, gecerli: true };
    if (a.d >= ARAMA_DERINLIGI) continue;
    const engel = carpanlar(kutu);
    if (kutularKesisiyor(kutu, kartus)) engel.push(kartusEngeli);
    for (const e of engel) {
      kuyruk.push({ x: kenetle(e.x1 - olcu.sol, minX, maxX), y: a.y, d: a.d + 1 });
      kuyruk.push({ x: kenetle(e.x0 - olcu.sag, minX, maxX), y: a.y, d: a.d + 1 });
      kuyruk.push({ x: a.x, y: kenetle(e.y1 - olcu.ust, minY, maxY), d: a.d + 1 });
      kuyruk.push({ x: a.x, y: kenetle(e.y0 - olcu.alt, minY, maxY), d: a.d + 1 });
    }
  }
  return { x: ortaX, y: ustY, kutu: kutuAt(ortaX, ustY), gecerli: false };
}

/**
 * **Baskı hangi dalgadan geliyor?** — `S116`, `M84`.
 *
 * S116'nın kaydı üç turdur şunu söylüyordu: *"bütün baskı 10. dalgada;
 * 1-9 boş"*. Ölçüm doğruydu ama **muhasebesi** yanıltıcıydı: sızıntı,
 * düşmanın kaleye vardığı anda **o sırada koşan** dalganın hanesine
 * yazılıyordu. `M16`'dan beri dalgalar üst üste biniyor, yani 9. dalganın
 * Trol'ü 10. dalga koşarken varıyor ve finalin hanesine yazılıyor.
 *
 * `waveSim` artık düşmanı **doğduğu dalgayla** damgalıyor
 * (`SimResult.canDogumDalgasina`). İki muhasebe yan yana konunca fark
 * ortaya çıkıyor (referans tahta, Normal):
 *
 * | Harita | sızdığı ana göre | doğduğu ana göre |
 * |---|---|---|
 * | Kül Ovası | `… 0 2 0 7` | `… 2 0 0 0 7` |
 * | Kar Geçidi | `… 0 0 0 14` | `… 0 0 6 8` |
 * | Kadim Harabe | `… 0 0 0 15` | `… 0 0 7 8` |
 * | Sisli Bataklık | `… 2 0 1 0 0 12` | `… 2 0 1 0 6 9` |
 *
 * Yani final **kampanyanın yarısını** götürüyor, tamamını değil; ve
 * 9. dalga her geç haritada gerçek bir tehdit. S116'nın iddiası bu
 * ölçümle daralıyor: boş olan 1-8, 9-10 değil.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../data/maps';
import { getEnemyForMap } from '../data/enemies';
import { referansKosu } from './referansOlcum';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

/** Sızan can — **doğum** dalgasına göre, 1 tabanlı dizi. */
function dogumaGore(m: MapDef): number[] {
  const dizi: number[] = new Array(10).fill(0) as number[];
  for (const r of referansKosu(m)) {
    for (const [d, can] of Object.entries(r.canDogumDalgasina)) {
      const i = Number(d) - 1;
      if (i >= 0 && i < dizi.length) dizi[i] = (dizi[i] ?? 0) + can;
    }
  }
  return dizi;
}

/** Sızan can — **sızdığı** dalgaya göre (eski muhasebe). */
function sizmayaGore(m: MapDef): number[] {
  return referansKosu(m).map((r) =>
    Object.entries(r.leakedByEnemy).reduce(
      (a, [id, n]) => a + (getEnemyForMap(id as EnemyId, m)?.leakDamage ?? 0) * (n ?? 0),
      0,
    ),
  );
}

describe('dalga baskısı — doğum dalgasına göre (S116)', () => {
  it('iki muhasebenin TOPLAMI aynı — damga can kaçırmıyor', () => {
    for (const m of MAPS) {
      const a = dogumaGore(m).reduce((x, y) => x + y, 0);
      const b = sizmayaGore(m).reduce((x, y) => x + y, 0);
      expect(a, m.id).toBe(b);
    }
  });

  /**
   * Damgalanmamış düşman `suankiDalga`ya düşer, yani sessizce eski
   * muhasebeye döner. Bu test onu yakalar: geç haritalarda **final
   * dışında** da can gitmeli.
   */
  it('geç haritalarda baskının en az üçte biri FİNALDEN ÖNCE doğuyor', () => {
    for (const m of MAPS.slice(3)) {
      const d = dogumaGore(m);
      const toplam = d.reduce((x, y) => x + y, 0);
      const onceki = d.slice(0, 9).reduce((x, y) => x + y, 0);
      expect(toplam, m.id).toBeGreaterThan(0);
      expect(onceki / toplam, `${m.id}: [${d.join(' ')}]`).toBeGreaterThanOrEqual(1 / 3);
    }
  });

  /**
   * İddianın daraltılmış hali: **1-8 hâlâ büyük ölçüde boş** — altı
   * haritanın toplamında en yükseği Sisli Bataklık'ın 3 canı. Bu bir
   * kabul değil, S116'nın açık kalan kısmının ölçüsü — düzeldiğinde bu
   * test bilinçli olarak gevşetilir.
   */
  it('S116 açık kalan kısım: 1-8 arası en fazla 3 can', () => {
    for (const m of MAPS) {
      const ilkSekiz = dogumaGore(m).slice(0, 8).reduce((x, y) => x + y, 0);
      expect(ilkSekiz, `${m.id}: [${dogumaGore(m).join(' ')}]`).toBeLessThanOrEqual(3);
    }
  });
});

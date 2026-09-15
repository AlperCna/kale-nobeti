/**
 * **Referans oyuncu — denge ölçümünün TEK adresi** (`M16` Faz 3, S109).
 *
 * Bir denge sayısı türetilirken iki ayrı varsayım yapılıyor:
 *
 * 1. **Tahta ne kadar zengin?** — `buildReferenceBoards(..., withEarlyBonus)`
 *    erken başlatma bonusunu sayar mı?
 * 2. **Oyuncu nasıl oynuyor?** — `simulateAllWaves(..., erken)` hazırlık
 *    aşamasında düğmeye basıyor mu?
 *
 * **İkisi ayrışırsa model yalan söyler.** `M16`'dan önce tam olarak bu
 * oldu: ölçüm tahtaya *tam* erken bonusunu yazıyor (`true`), simülasyon
 * ise hiç bastırmıyordu — yani referans tahta hak etmediği altınla
 * kuruluyor, sızıntı olduğundan iyimser çıkıyordu. Dalgalar üst üste
 * binmediği sürece bu zararsızdı (basmanın bedeli yoktu); `M16` bedeli
 * koyunca çift anlamlı hâle geldi ve düzeltilmesi gerekti.
 *
 * Bu dosya çifti **birlikte** tutuyor: ölçüm yapan herkes
 * `referansCanKaybi` çağırıyor, iki parametreyi ayrı ayrı seçmiyor.
 * Aynı panzehir S80/S81/S86/S92/S106'da da kullanıldı — kural tek bir
 * saf fonksiyona konur, çağıranlar onu paylaşır.
 *
 * **Neden `balanceChecks.ts`'te değil:** `fx/TowerInfoPanel` oradan
 * `effectiveDps` alıyor, yani `balanceChecks` **yayın paketine giriyor**.
 * Simülasyonu oraya bağlamak `waveSim`'i ve bağlı olduğu bütün sistemleri
 * pakete sokardı (TIER 1 kural 2).
 */

import type { MapDef } from '../types/map';
import type { EnemyId } from '../types/enemy';
import { COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import { measureCoverage } from '../util/coverage';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves, type ErkenPolitika, type SimResult } from './waveSim';

/**
 * Referans oyuncu **erken başlatmıyor**.
 *
 * `M16` üç politikayı da ölçtü (harita 3 · 5 · 6, Zor, referans tahta):
 *
 * | politika | h3 | h5 | h6 |
 * |---|---|---|---|
 * | `hemen`     | 11 | 30 | 44 |
 * | `sonBirkac` |  4 | 10 | 23 |
 * | `hic`       |  3 | 11 | 25 |
 *
 * `hemen` haritaları 20 canla **geçilemez** yapıyor, yani yardstick
 * olamaz. `sonBirkac` ölçülen en iyi oyun ama altın tarafı formülle
 * ifade edilemiyor: kazanılan bonus, sahanın ne zaman boşaldığına bağlı
 * ve dalgadan dalgaya değişiyor. `cumulativeGold` ise bonusu ya **tam**
 * sayıyor ya **hiç** — arası yok.
 *
 * Bu yüzden taban `hic` + `withEarlyBonus = false`: **kanıtlanabilir
 * biçimde tutarlı** tek çift. `cumulativeGold`'un `false` dalı zaten
 * "oyuncu hiç erken başlatmasa bile tahtayı karşılayabilmeli" diye
 * yazılmıştı; artık simülasyon da aynı oyuncuyu oynuyor.
 *
 * Erken basmak böylece dengenin *tabanı* değil, oyuncunun **kararı**
 * oluyor: altın kazandırıyor, can kaybettiriyor (S102).
 */
export const REFERANS_ERKEN_BONUSU = false;

/** @see REFERANS_ERKEN_BONUSU — bu ikisi birlikte değişir. */
export const REFERANS_POLITIKA: ErkenPolitika = 'hic';

/**
 * Referans tahtayla bir haritayı **baştan sona** oynar ve dalga
 * sonuçlarını döndürür.
 *
 * `hpScale` zorluk seviyesinin doğum çarpanı (S92) — `MapDef`'i
 * çarpmakla aynı şey **değil**, boss'u da ölçekliyor.
 */
export function referansKosu(map: MapDef, hpScale = 1): SimResult[] {
  const waves = wavesFor(map.id);
  const kapsama = measureCoverage(map.paths, map.buildSpots, COVERAGE_REFERENCE_RANGE);
  const tahtalar = buildReferenceBoards(map, waves, kapsama, REFERANS_ERKEN_BONUSU);
  return simulateAllWaves(waves, tahtalar, map, undefined, hpScale, 'yok', REFERANS_POLITIKA);
}

/** Sızan düşmanların toplam can bedeli — rampanın asıl ölçütü. */
export function referansCanKaybi(map: MapDef, hpScale = 1): number {
  let can = 0;
  for (const sonuc of referansKosu(map, hpScale)) {
    for (const [id, adet] of Object.entries(sonuc.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, map);
      if (e !== undefined) can += e.leakDamage * (adet ?? 0);
    }
  }
  return can;
}

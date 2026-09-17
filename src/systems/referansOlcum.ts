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
export function referansKosu(map: MapDef, hpScale = 1, adimMs?: number): SimResult[] {
  const waves = wavesFor(map.id);
  const kapsama = measureCoverage(map.paths, map.buildSpots, COVERAGE_REFERENCE_RANGE);
  const tahtalar = buildReferenceBoards(map, waves, kapsama, REFERANS_ERKEN_BONUSU);
  return simulateAllWaves(waves, tahtalar, map, adimMs, hpScale, 'yok', REFERANS_POLITIKA);
}

/** Sızan düşmanların toplam can bedeli — rampanın asıl ölçütü. */
export function referansCanKaybi(map: MapDef, hpScale = 1, adimMs?: number): number {
  let can = 0;
  for (const sonuc of referansKosu(map, hpScale, adimMs)) {
    for (const [id, adet] of Object.entries(sonuc.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, map);
      if (e !== undefined) can += e.leakDamage * (adet ?? 0);
    }
  }
  return can;
}

/**
 * **Referans ölçüm TEK KOŞUDA kararlı değil — `M60` (S130).**
 *
 * `referansCanKaybi` bugüne kadar tek bir adım süresiyle (1/60 sn)
 * koşturuldu ve çıkan sayı bir *ölçüm* gibi kullanıldı. Değilmiş.
 *
 * `M59`'da adım süresi taranınca haritaların son dalgası bıçak sırtında
 * çıktı: kapsama ile düşman hızı arasındaki fark tek bir düşmanı ya
 * kaleye ulaştırıyor ya ulaştırmıyor, ve bunu belirleyen şey dengenin
 * kendisi değil **hangi karede hangi merminin isabet ettiği**. Adım
 * küçültmek düzeltmiyor — 1,042 ms'ye kadar inildi, sayı yakınsamıyor,
 * sadece başka yerde salınıyor.
 *
 * 55-65 fps arasında her tam değerde ölçülen tablo (can kaybı):
 *
 * ```
 *              55  56  57  58  59  60  61  62  63  64  65   ortanca
 * Kar Geçidi   12  12  12  12  12  12  12  11  12  12  11     12
 * Kadim Harabe 14  14  14  14  13  14  14  14  14  10  14     14
 * Sisli Batak. 11  11  11  11  11  13  10  12  12  11  10     11
 * ```
 *
 * Harita 4 ve 5 için üretim adımı (60) ortancayla aynı — o sayılar
 * şanslı değil, gerçekten oranın değeri. **Harita 6 için değil:** 60
 * fps'te 13 çıkıyor, ama bandın *tavanı* orası; ortancası 11. Yani
 * rampanın son basamağı bugüne kadar tek bir talihsiz çekilişti.
 *
 * Bu yüzden rampa iddiası artık tek koşuya değil **ortancaya** bakıyor.
 * Ortanca, banttaki iki uç değeri de yutuyor (harita 5'in 64 fps'teki
 * 10'u gibi) ve sayıyı kare süresine borçlu olmaktan çıkarıyor.
 *
 * Bandın kendisi ölçümden geldi: gerçek oyun `M54`'te **59,4 fps**
 * ölçtü, bant onu ±%8 ile kuşatıyor. Beş örnek alınıyor, on bir değil —
 * ortanca aynı çıkıyor (12 · 14 · 11) ve test iki kat hızlı koşuyor.
 */
export const REFERANS_FPS_BANDI: readonly number[] = [56, 58, 60, 62, 64];

/**
 * Can kaybının **bant ortancası** — rampanın kabul ölçütü.
 *
 * @see REFERANS_FPS_BANDI — neden tek koşu yetmiyor.
 */
export function referansCanKaybiOrtanca(map: MapDef, hpScale = 1): number {
  const olcumler = REFERANS_FPS_BANDI.map((fps) =>
    referansCanKaybi(map, hpScale, 1000 / fps),
  ).sort((a, b) => a - b);
  return olcumler[Math.floor(olcumler.length / 2)]!;
}

/**
 * **Sürekli zaman çizgisi** — `M16` Faz 1.
 *
 * `simulateAllWaves` eskiden her dalgayı **ayrı** koşturuyordu: temiz
 * havuz, temiz kule, temiz kışla. Bugünkü oyun kuralıyla bu zararsızdı
 * (saha boşalmadan sıradaki dalga başlamıyor), ama `M16` Faz 2 o kuralı
 * kaldırıyor ve ayrık model **artıkları hiç göremezdi**.
 *
 * ## Doğruluk eski sayılara bakarak değil, DEĞİŞMEZLERLE kuruluyor
 *
 * Sürekli model on ayrı koşunun toplamını birebir tekrarlamıyor — ve
 * tekrarlamamalı: kule beklemesi, havadaki mermi ve kışla askerinin canı
 * artık dalga sınırında **sıfırlanmıyor**, gerçek oyundaki gibi
 * taşınıyor. Ölçüldü: rampa `0·5·8·12·16·18` → `0·5·8·11·16·17`, yani
 * dört harita aynı, ikisi birer can. Kısmi sıfırlama denendi ve
 * **üçüncü** bir sonuç verdi (`0·5·8·10·17·17`) — yani eski davranış
 * tek bir alt sistemin sıfırlanmasına indirgenemiyor.
 *
 * O yüzden bu dosya sayı ezberlemiyor; modelin **tutması gereken
 * şeyleri** tutuyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAPS, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { REFERANS_ERKEN_BONUSU, REFERANS_POLITIKA } from './referansOlcum';
import { measureCoverage } from '../util/coverage';
import type { MapDef } from '../types/map';

function kosu(m: MapDef) {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  // S109 — tahta ile simülasyon aynı oyuncuyu varsayıyor.
  const tahta = buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU);
  return { w, sim: simulateAllWaves(w, tahta, m, undefined, 1, 'yok', REFERANS_POLITIKA) };
}

describe('Sürekli zaman çizgisi — M16 Faz 1', () => {
  it('her dalga için bir sonuç dönüyor — hiçbiri düşmüyor', () => {
    // İlk yazımda adım tavanı dalga başına değil **koşu başına**ydı ve
    // geç dalgalar hiç koşmuyordu; rampa `0·4·1·0·0·5` çıktı. Bu test o
    // hatayı bir daha bırakmıyor.
    for (const m of MAPS) {
      const { w, sim } = kosu(m);
      expect(sim, m.id).toHaveLength(w.length);
    }
  });

  it('doğan düşman sayısı dalga verisiyle TUTUYOR — kimse kaybolmuyor', () => {
    for (const m of MAPS) {
      const { w, sim } = kosu(m);
      const beklenen = w.reduce((t, x) => t + x.groups.reduce((a, g) => a + g.count, 0), 0);
      const gercek = sim.reduce((t, r) => t + r.killedCount + r.leakedCount, 0);
      // Bölünen Örümcek Ana ve çağıran boss **fazladan** düşman üretiyor,
      // yani gerçek sayı beklenenin altına düşmemeli.
      expect(gercek, m.id).toBeGreaterThanOrEqual(beklenen);
    }
  });

  it('dalga 1 hiçbir haritada sızdırmıyor — tasarım değişmezi', () => {
    for (const m of MAPS) {
      expect(kosu(m).sim[0]!.leakedCount, m.id).toBe(0);
    }
  });

  it('koşu adım tavanına DAYANMIYOR — sim gerçekten bitiyor', () => {
    // Tavan bir güvenlik supabı; ona dayanmak "dalga bitmedi, kestik"
    // demek ve sızıntı sayısını sessizce eksiltir.
    for (const m of MAPS) {
      const { sim } = kosu(m);
      const toplamSure = sim.reduce((t, r) => t + r.durationSec, 0);
      expect(toplamSure, m.id).toBeLessThan(300 * sim.length);
    }
  });
});

/**
 * **S109 — ölçümün iki varsayımı AYRIŞAMAZ.**
 *
 * Tekrarlayan hata sınıfı (S80/S81/S86/S92/S106) hep aynı biçimde
 * geldi: *"oyun ile X farklı bir şeyi biliyor"*. Burada X **ekonomi**
 * oldu — referans tahta erken başlatma bonusunu alınmış sayarken
 * simülasyon o düğmeye hiç basmıyordu, yani tahta hak etmediği altınla
 * kuruluyordu. `M16` erken basmaya bedel koyana kadar zararsızdı.
 *
 * Panzehir yine aynı: tek adres (`referansOlcum`) **ve** derleyicinin
 * göremediğini yakalayan bir test. Varsayılanlar birbirinden kayarsa
 * aşağıdaki iki sağlama kırılır.
 */
describe('Referans oyuncu — çift tutarlı (S109)', () => {
  it('`buildReferenceBoards` varsayılanı referans bonusuyla AYNI', () => {
    for (const m of MAPS) {
      const w = wavesFor(m.id);
      const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
      expect(buildReferenceBoards(m, w, k), m.id).toEqual(
        buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU),
      );
    }
  });

  it('`simulateAllWaves` varsayılan politikası referans politikayla AYNI', () => {
    // Varsayılan değişirse (örn. birisi `'hemen'` yaparsa) bütün denge
    // sayıları sessizce kayar — sayı ezberlemeden bunu yakalıyoruz.
    const m = MAPS[2]!;
    const w = wavesFor(m.id);
    const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
    const tahta = buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU);

    const varsayilan = simulateAllWaves(w, tahta, m);
    const acik = simulateAllWaves(w, tahta, m, undefined, 1, 'yok', REFERANS_POLITIKA);

    expect(varsayilan.map((r) => r.leakedCount)).toEqual(acik.map((r) => r.leakedCount));
    expect(varsayilan.map((r) => r.killedCount)).toEqual(acik.map((r) => r.killedCount));
  });
});

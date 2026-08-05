/**
 * **Kısıt B'nin düşman kırılımı** — hangi düşman sızıyor.
 *
 * Toplam sızıntı sayısı "dalga sızdırdı" diyor ama *neyin* sızdığını
 * söylemiyor, ve bu ikisi tamamen farklı düzeltmeler gerektiriyor.
 *
 * ## Kısıt A ile Kısıt B AYNI şeyi ölçmüyor
 *
 * Kısıt A **tek** düşman için: "bir Ork Savaşçı öldürülebilir mi?"
 * Kısıt B **dalga** için: "on bir Ork Savaşçı aynı anda gelirse?"
 *
 * Ölçüm bunu net gösterdi: harita 3'te en çok sızan düşman **Ork Savaşçı
 * (×11)**, ama Kısıt A'da %39,9 ile rahat geçiyor. Trol ise Kısıt A'da
 * %116,6 ile kalıyor ama yalnız **×3** sızıyor. Yani ikisi de gerekli;
 * biri diğerinin yerine geçmiyor.
 */
import { describe, expect, it } from 'vitest';
import { MAP_1, MAP_2, MAP_3, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { MAP1_WAVES, MAP2_WAVES, MAP3_WAVES } from '../data/waves';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { Wave } from '../types/wave';

function kosu(map: MapDef, waves: readonly Wave[]) {
  const k = measureCoverage(map.paths, map.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(waves, buildReferenceBoards(map, waves, k, true), map);
  const toplam: Partial<Record<EnemyId, number>> = {};
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      toplam[id as EnemyId] = (toplam[id as EnemyId] ?? 0) + (n ?? 0);
    }
  }
  return { sim, toplam, adet: sim.reduce((t, r) => t + r.leakedCount, 0) };
}

describe('Kısıt B — düşman kırılımı', () => {
  it('harita 1: HİÇ sızıntı yok', () => {
    const r = kosu(MAP_1, MAP1_WAVES);
    expect(r.adet).toBe(0);
    expect(r.toplam).toEqual({});
  });

  it('**boss hiçbir haritada sızmıyor** — türetme çalışıyor', () => {
    // Boss HP'si haritadan türetildiği için (0,80 × tavan) geçilebilir
    // olmalı. Bu, türetmenin uçtan uca sağlaması.
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
    ] as const) {
      expect(kosu(m, w).toplam.ogreSef ?? 0, m.id).toBe(0);
    }
  });

  it('Trol Kısıt A’da kalıyor ama Kısıt B’de BASKIN sızan değil', () => {
    // §5 Trol'ün cevabını kışla olarak veriyor; Kısıt A kışlayı
    // modellemiyor ve Trol'ü olduğundan zor gösteriyor. Gerçek ölçüm:
    const r = kosu(MAP_3, MAP3_WAVES);
    const trol = r.toplam.trol ?? 0;
    const enCok = Math.max(...Object.values(r.toplam).map((v) => v ?? 0));
    expect(trol).toBeGreaterThan(0); // sızıyor — ama
    expect(trol).toBeLessThan(enCok); // baskın sızan DEĞİL
    expect(r.toplam.orkSavasci ?? 0).toBeGreaterThan(trol);
  });

  it('**baskın sızan Ork Savaşçı** — Kısıt A onu güvenli sayıyor', () => {
    // Kısıt A'da %39,9 (eşik %87) ile rahat geçiyor ama en çok o sızıyor.
    // Bu, iki sağlamanın farklı şeyleri ölçtüğünün kanıtı: Kısıt A tek
    // düşmanın tankiliği, Kısıt B dalganın debisi.
    const r = kosu(MAP_3, MAP3_WAVES);
    const sirali = Object.entries(r.toplam).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    expect(sirali[0]?.[0]).toBe('orkSavasci');
  });

  it('sızıntı erken dalgalarda DEĞİL — S72 düzeltmesi tutuyor', () => {
    // S72 öncesi harita 3'te d1:7 d2:5 d3:6 sızıyordu. Başlangıç altını
    // çarpanı izlemeye başlayınca dalga 1 temizlendi.
    for (const [m, w] of [
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
    ] as const) {
      expect(kosu(m, w).sim[0]!.leakedCount, `${m.id} dalga 1`).toBe(0);
    }
  });

  it('sızıntı toplamı bilinen tavanın altında — regresyon kilidi', () => {
    // Sayılar iyileşirse bu test bilinçli gevşetilir; kötüleşirse kırılır.
    expect(kosu(MAP_2, MAP2_WAVES).adet).toBeLessThanOrEqual(8);
    expect(kosu(MAP_3, MAP3_WAVES).adet).toBeLessThanOrEqual(25);
  });

  it('kırılım toplamı sızıntı sayısıyla TUTARLI', () => {
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
    ] as const) {
      const r = kosu(m, w);
      const kirilimToplam = Object.values(r.toplam).reduce((a, b) => a + (b ?? 0), 0);
      expect(kirilimToplam, m.id).toBe(r.adet);
    }
  });
});

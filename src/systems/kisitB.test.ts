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
import { MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { MAP1_WAVES, MAP2_WAVES, MAP3_WAVES, MAP4_WAVES, MAP5_WAVES } from '../data/waves';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { measureCoverage } from '../util/coverage';
import { getEnemyForMap } from '../data/enemies';
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

/** Sızan düşmanların toplam can bedeli — asıl kabul ölçütü. */
function canKaybi(map: MapDef, waves: readonly Wave[]): number {
  const r = kosu(map, waves);
  let can = 0;
  for (const [id, n] of Object.entries(r.toplam)) {
    const e = getEnemyForMap(id as EnemyId, map);
    if (e) can += e.leakDamage * (n ?? 0);
  }
  return can;
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
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
    ] as const) {
      expect(kosu(m, w).toplam.ogreSef ?? 0, m.id).toBe(0);
    }
  });

  it('**her harita GEÇİLEBİLİR** — kaybedilen can 20’nin altında', () => {
    // Asıl kabul ölçütü bu: sızıntı sayısı değil, **can kaybı**. Farklı
    // düşmanların sızma cezası farklı (Trol 2, boss 10).
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
    ] as const) {
      expect(canKaybi(m, w), m.id).toBeLessThan(20);
    }
  });

  it('**zorluk MONOTON** — çarpan değil, ölçülen can kaybı (M8-T04)', () => {
    // `M8-T04` dersi: monoton `hpMultiplier` monoton zorluk vermiyor.
    // Harita 4 ilk turda 3,4 çarpanla **sıfır** can kaybı verdi (harita
    // 3'ün 10'unun altında) çünkü tek yol + 12 nokta savunmayı bölmüyor.
    // Bu test o hatanın geri gelmesini engelliyor: ölçüt geometriyi de
    // kapsayan **çıktı**, girdi değil.
    const kayip = [
      canKaybi(MAP_1, MAP1_WAVES),
      canKaybi(MAP_2, MAP2_WAVES),
      canKaybi(MAP_3, MAP3_WAVES),
      canKaybi(MAP_4, MAP4_WAVES),
      canKaybi(MAP_5, MAP5_WAVES),
    ];
    for (let i = 1; i < kayip.length; i++) {
      expect(kayip[i]!, `harita ${i + 1}: ${kayip.join(' → ')}`).toBeGreaterThan(kayip[i - 1]!);
    }
  });

  it('Ork Savaşçı debisi çözüldü — S73', () => {
    // S73 öncesi harita 3'te Ork Savaşçı ×11 ile baskın sızandı ve toplam
    // can kaybı 34'tü (20 canla kayıp). Ekonomi düzeltilince düştü.
    const r = kosu(MAP_3, MAP3_WAVES);
    expect(r.toplam.orkSavasci ?? 0).toBeLessThanOrEqual(6);
  });

  it('sızıntı erken dalgalarda DEĞİL — S72 düzeltmesi tutuyor', () => {
    // S72 öncesi harita 3'te d1:7 d2:5 d3:6 sızıyordu. Başlangıç altını
    // çarpanı izlemeye başlayınca dalga 1 temizlendi.
    for (const [m, w] of [
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
    ] as const) {
      expect(kosu(m, w).sim[0]!.leakedCount, `${m.id} dalga 1`).toBe(0);
    }
  });

  it('sızıntı toplamı bilinen tavanın altında — regresyon kilidi', () => {
    // Sayılar iyileşirse bu test bilinçli gevşetilir; kötüleşirse kırılır.
    expect(kosu(MAP_2, MAP2_WAVES).adet).toBeLessThanOrEqual(8);
    expect(kosu(MAP_3, MAP3_WAVES).adet).toBeLessThanOrEqual(25);
    expect(kosu(MAP_4, MAP4_WAVES).adet).toBeLessThanOrEqual(14);
    expect(kosu(MAP_5, MAP5_WAVES).adet).toBeLessThanOrEqual(14);
  });

  it('kırılım toplamı sızıntı sayısıyla TUTARLI', () => {
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
    ] as const) {
      const r = kosu(m, w);
      const kirilimToplam = Object.values(r.toplam).reduce((a, b) => a + (b ?? 0), 0);
      expect(kirilimToplam, m.id).toBe(r.adet);
    }
  });
});

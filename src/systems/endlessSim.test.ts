import { describe, expect, it } from 'vitest';
import { generateEndlessWave, endlessHpScale } from './endlessWaves';
import { ENDLESS_FIRST_WAVE } from '../data/endless';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { measureCoverage } from '../util/coverage';
import { MAP_1, MAP_5, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { Wave } from '../types/wave';

/**
 * Sonsuz modun **simülasyonu** — `M8` doğrulama turu.
 *
 * `endlessWaves.test.ts` üretimin *kurallarını* sınıyor (bütçe, kadro,
 * beden tavanı, determinizm). Burada sorulan başka bir soru: üretilen
 * dalgalar **oynandığında** ne oluyor? Zorluk gerçekten artıyor mu, yoksa
 * beden tavanı bağladıktan sonra düzleşiyor mu?
 *
 * Bu soru `M8-T06` yazılırken hiç sorulmamıştı; tavanın zorluğu
 * düzleştirmesi tam da `data/endless.ts`'in önlemeye çalıştığı şey ve
 * onun çalıştığının tek kanıtı bu dosyada.
 */

/** Dalga `n`'i, o dalgadaki HP ölçeğiyle birlikte simüle edilebilir hâle getirir. */
function sonsuzHarita(m: MapDef, n: number): MapDef {
  return { ...m, hpMultiplier: m.hpMultiplier * endlessHpScale(n) };
}

/**
 * Tek bir sonsuz dalgayı, haritanın dalga 10 tahtasıyla oynatır.
 *
 * Tahta **sabit tutuluyor**: sonsuz modda oyuncunun tahtası dalga 10'da
 * zaten dolu (bütün noktalar kullanılmış) ve fazladan altın yalnız
 * yükseltmeye gidiyor. Sabit tahta, zorluk artışını tek değişkenle
 * (dalganın kendisi) ölçmeyi sağlıyor.
 */
function canKaybi(m: MapDef, n: number): number {
  const harita = sonsuzHarita(m, n);
  const elle = wavesFor(m.id);
  const kaps = measureCoverage(harita.paths, harita.buildSpots, COVERAGE_REFERENCE_RANGE);
  const tahtalar = buildReferenceBoards(harita, elle, kaps, true);
  const son = tahtalar[tahtalar.length - 1]!;

  const dalga: Wave = generateEndlessWave(n, harita.enemyRoster, harita.paths.length);
  // `simulateAllWaves` dalga başına bir tahta bekliyor.
  const sim = simulateAllWaves([dalga], [son], harita);

  let can = 0;
  for (const r of sim) {
    for (const [id, adet] of Object.entries(r.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, harita);
      if (e !== undefined) can += e.leakDamage * (adet ?? 0);
    }
  }
  return can;
}

/** `BALANCE.startLives` — doyum değeriyle karşılaştırmak için. */
const BASLANGIC_CANI = 20;

/**
 * On dalgalık pencere ortalaması.
 *
 * Tek dalga ölçmek gürültülü: kompozisyon tohumlu rastgele ve hangi tipin
 * sızdığı can bedelini değiştiriyor. İlk yazımda "dalga 70 > dalga 50"
 * diye bir iddia vardı ve **ölçüm onu yalanladı** (42 < 50) — sayı
 * düşmedi, yalnız o iki dalganın çekilişi farklıydı.
 */
function pencereOrtalamasi(m: MapDef, bas: number, son: number): number {
  let toplam = 0;
  for (let n = bas; n <= son; n++) toplam += canKaybi(m, n);
  return toplam / (son - bas + 1);
}

describe('sonsuz mod simülasyonu', () => {
  it('ilk sonsuz dalga (11) tahtayı **anında** yıkmıyor', () => {
    // Dalga 10'u geçen bir tahta 11'de bir anda çökmemeli; sonsuz mod bir
    // ödül, bir ceza değil.
    for (const m of [MAP_1, MAP_5]) {
      expect(canKaybi(m, ENDLESS_FIRST_WAVE), m.id).toBeLessThan(20);
    }
  });

  it('**zorluk ilk otuz dalgada keskin artıyor**', () => {
    // Tek dalga karşılaştırması yanıltıcı: kompozisyon tohumlu rastgele ve
    // hangi tipin sızdığı can bedelini değiştiriyor (Trol 2, goblin 1).
    // Ölçüt bu yüzden **on dalgalık pencere ortalaması**.
    expect(pencereOrtalamasi(MAP_1, 21, 30)).toBeGreaterThan(
      pencereOrtalamasi(MAP_1, 11, 20) * 2,
    );
    expect(pencereOrtalamasi(MAP_1, 31, 40)).toBeGreaterThan(
      pencereOrtalamasi(MAP_1, 21, 30),
    );
  });

  it('**eğri ~40. dalgada DÜZLEŞİYOR — ve bu zararsız**', () => {
    // Ölçülen ortalamalar (harita 1, sabit dalga-10 tahtası):
    //   11-20: 7,2 · 21-30: 32,7 · 31-40: 40,1 · 41-50: 41,9
    //   51-60: 41,1 · 61-70: 41,7 · 71-80: 42,0
    //
    // Sebep: o noktadan sonra tahta dalganın **hiçbirini** öldüremiyor,
    // yani can kaybı "dalganın tamamı sızdı" değerine doyuyor; düşmanı
    // daha da dayanıklı yapmak görünmez bir değişiklik oluyor.
    //
    // Zararsız olmasının sebebi: doyum değeri (~42) toplam candan (20)
    // zaten **iki kat** büyük. Oyuncu o dalgaya gelmeden çoktan
    // kaybetmiş oluyor; düzleşme oyunun görülmeyen bir bölgesinde.
    // `data/endless.ts` bu bulguyu taşıyor.
    const doyum = pencereOrtalamasi(MAP_1, 41, 50);
    const cokGec = pencereOrtalamasi(MAP_1, 71, 80);
    expect(Math.abs(cokGec - doyum) / doyum, `41-50:${doyum} 71-80:${cokGec}`).toBeLessThan(0.15);
    expect(doyum).toBeGreaterThan(BASLANGIC_CANI);
  });

  it('otuz sonsuz dalganın simülasyonu 2 sn’nin altında', () => {
    // `TEST-STRATEGY` şartı (`simulateWave` hızlı kalmalı) sonsuz modda da
    // geçerli — yoksa denge ölçümü yapılamaz hâle gelir.
    const t0 = Date.now();
    for (let n = ENDLESS_FIRST_WAVE; n < ENDLESS_FIRST_WAVE + 30; n++) canKaybi(MAP_1, n);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

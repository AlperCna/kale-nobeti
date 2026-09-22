import { describe, expect, it } from 'vitest';
import { generateEndlessWave, endlessHpScale } from './endlessWaves';
import { ENDLESS_FIRST_WAVE } from '../data/endless';
import { buildReferenceBoards } from './balanceChecks';
import type { ReferenceBoard } from '../types/board';
import { simulateAllWaves } from './waveSim';
import { measureCoverage } from '../util/coverage';
import { MAP_1, MAP_5, MAP_6, MAPS, COVERAGE_REFERENCE_RANGE } from '../data/maps';
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
  return canKaybiTahtayla(m, n, tahtalar[tahtalar.length - 1]!);
}

/**
 * Aynı ölçüm, ama tahta **dışarıdan** veriliyor — `M109`.
 *
 * `canKaybi` her zaman dalga 10 tahtasını kuruyor; bu sürüm sonsuz
 * dalgaların gelirini de sayan bir tahtayla karşılaştırma yapabilmek
 * için. İki yol aynı gövdeyi paylaşıyor ki ölçüm farkı yalnız
 * **tahtadan** gelsin.
 */
function canKaybiTahtayla(m: MapDef, n: number, tahta: ReferenceBoard): number {
  const harita = sonsuzHarita(m, n);
  const dalga: Wave = generateEndlessWave(n, harita.enemyRoster, harita.paths.length);
  // `simulateAllWaves` dalga başına bir tahta bekliyor.
  const sim = simulateAllWaves([dalga], [tahta], harita);

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
  /**
   * **`M86`: liste elle yazılmıştı ve harita 6'yı saymıyordu.** İddia
   * "sonsuz mod bir ödül" diyor ama yalnız iki haritada sınanıyordu;
   * `M12`'de gelen altıncı harita (ve 2-4) hiç bakılmamıştı. Artık
   * `MAPS` üzerinden **türetiliyor** — yeni harita kendiliğinden giriyor.
   * Ölçülen dalga 11 can kaybı: `0 · 0 · 6 · 10 · 11 · 8`.
   */
  it('ilk sonsuz dalga (11) tahtayı **anında** yıkmıyor', () => {
    // Dalga 10'u geçen bir tahta 11'de bir anda çökmemeli; sonsuz mod bir
    // ödül, bir ceza değil.
    for (const m of MAPS) {
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

  /**
   * **`M86` — son harita da sınanıyor, ama İDDİA AYNI DEĞİL.**
   *
   * İki kat şartı yalnız öğretici haritada tutuyor; geç haritalarda
   * ilk on sonsuz dalga **zaten** acıtıyor (ölçüm, 11-20 ortalaması:
   * Dğirmen 5,0 · Taş Köprü 6,9 · Kül Ovası 14,8 · Kar Geçidi 22,5 ·
   * Kadim Harabe 23,9 · Sisli Bataklık 20,1), yani başlangıç yüksek
   * olduğu için iki katına çıkmak için yer yok — Kar Geçidi 21-30'da
   * 39,4'te, iki katı 45 olurdu. Geç haritalarda sınanan şey bu yüzden
   * **kesin artış**, katsayı değil.
   */
  it('son haritada da zorluk her on dalgada ARTıYOR (M86)', () => {
    const ilk = pencereOrtalamasi(MAP_6, 11, 20);
    const orta = pencereOrtalamasi(MAP_6, 21, 30);
    const son = pencereOrtalamasi(MAP_6, 31, 40);
    expect(orta, `${ilk.toFixed(1)} → ${orta.toFixed(1)}`).toBeGreaterThan(ilk);
    expect(son, `${orta.toFixed(1)} → ${son.toFixed(1)}`).toBeGreaterThan(orta);
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

  /**
   * **`M109` — sonsuz modda gelirin karşılığı var mı?**
   *
   * Yukarıdaki bütün ölçümler tahtayı **dondurup** dalgayı büyütüyor ve
   * bunun gerekçesi yazılı (tek değişkenle zorluk ölçmek). Ama o
   * dondurma bir soruyu da gördürmemiş: **gerçek oyuncunun tahtası
   * dalga 11'den sonra büyüyor mu?**
   *
   * Ölçüldü — dalga 10 tahtası ile dokuz sonsuz dalganın gelirini de
   * sayan dalga 19 tahtasının **kümülatif bedeli**:
   *
   * | Harita | d10 | d19 |
   * |---|---|---|
   * | Değirmen Geçidi | 1680 | **3510** |
   * | Taş Köprü | 3820 | **4400** |
   * | Kül Ovası | 5100 | 5100 |
   * | Kar Geçidi | 7140 | 7140 |
   * | Kadim Harabe | 6440 | 6440 |
   * | Sisli Bataklık | 6440 | 6440 |
   *
   * Harita 3-6'da tahta dalga 10'da **doymuş**: dokuz dalgalık gelir
   * onu **tek kuruş** değiştirmiyor. Sonuç simülasyonda da birebir
   * görünüyor — tahtayı büyütmek can kaybını aynı bırakıyor
   * (124/189/212/169), harita 1-2'de ise **33 → 0** ve **56 → 25**
   * düşürüyor.
   *
   * Yani geç haritalarda sonsuz mod, gücü **sabit** bir oyuncuyla
   * dalga başına %8 büyüyen bir eğrinin yarışı — bir geri sayım.
   * S117'nin “gelir tahtaya yetmekten fazlasını kazandırıyor” bulgusunun
   * en saf hali; `M99`'un yetenek yükseltmesi orada tek gider kalemi ve
   * o da dört alımda tükeniyor. **Tasarım kararı sahibinde** (S163);
   * bu testler yalnız ölçümü sabitliyor.
   */
  it('doymuş tahtada sonsuz gelirin KARŞILIĞI YOK (M109)', () => {
    // Ölçüt harita numarası değil, **ölçümün kendisi**: tahta d10 ile
    // d19 arasında hiç değişmediyse o harita "doymuş" sayılıyor.
    // Elle harita listesi yazmak `M86`'nın bayatlattığı şey.
    const DENEK = 19;
    let doymusSayisi = 0;
    for (const m of MAPS) {
      const kaps = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
      const elle = wavesFor(m.id);
      const uzun: Wave[] = [...elle];
      for (let k = ENDLESS_FIRST_WAVE; k <= DENEK; k++) {
        uzun.push(generateEndlessWave(k, m.enemyRoster, m.paths.length));
      }
      const d10 = buildReferenceBoards(m, elle, kaps, true);
      const d19 = buildReferenceBoards(m, uzun, kaps, true);
      const donukBedel = d10[d10.length - 1]!.cumulativeCost;
      const buyuyenBedel = d19[d19.length - 1]!.cumulativeCost;
      const donukCan = canKaybi(m, DENEK);
      const buyuyenCan = canKaybiTahtayla(m, DENEK, d19[d19.length - 1]!);
      if (buyuyenBedel === donukBedel) {
        doymusSayisi += 1;
        // Doymuş tahta: dokuz dalgalık gelir hiçbir şey satın almıyor,
        // yani sonuç da **birebir** aynı olmak zorunda.
        expect(buyuyenCan, `${m.id} doymuş ama sonuç değişti`).toBe(donukCan);
      } else {
        // Doymamış tahta: gelirin bir karşılığı olmalı.
        expect(buyuyenCan, `${m.id} büyüyen tahta işe yaramadı`).toBeLessThanOrEqual(donukCan);
      }
    }
    // Boşa koşan döngü sağlaması (S136): bulgu **var**.
    expect(doymusSayisi, 'hiçbir harita doymuyorsa bu test bir şey söylemiyor').toBeGreaterThan(0);
  });

  it('otuz sonsuz dalganın simülasyonu 2 sn’nin altında', () => {
    // `TEST-STRATEGY` şartı (`simulateWave` hızlı kalmalı) sonsuz modda da
    // geçerli — yoksa denge ölçümü yapılamaz hâle gelir.
    const t0 = Date.now();
    for (let n = ENDLESS_FIRST_WAVE; n < ENDLESS_FIRST_WAVE + 30; n++) canKaybi(MAP_1, n);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

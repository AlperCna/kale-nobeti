import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY, DIFFICULTY, isDifficulty } from './difficulty';
import { MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { wavesFor } from './waves';
import { BALANCE } from './balance';
import { getEnemyForMap } from './enemies';
import {
  buildReferenceBoards,
  ceilingAPerBranch,
  effectiveHp,
} from '../systems/balanceChecks';
import { referansCanKaybiOrtanca } from '../systems/referansOlcum';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

/**
 * Zorluğun HP çarpanı **doğum anında** uygulanıyor (`WaveManager`).
 *
 * **S92:** eskiden ölçüm bunu `MapDef.hpMultiplier`'ı çarparak kuruyordu
 * ve o yol boss'u sessizce dışarıda bırakıyordu — `bossFor` mutlak boss
 * HP'sini aynı çarpana **bölüyor**, ikisi sadeleşiyor. Canlı oyun
 * (`GameScene`) tanımı çarpansız haritadan çözüyor ve doğum çarpanını
 * ayrı veriyor, yani boss gerçekte ölçekleniyor. Artık `waveSim` de o
 * ayrımı taşıyor: `simulateAllWaves(..., hpScale)`.
 *
 * Kısıt A tarafında (`enKotuKisitA`) ölçek **etkin HP'ye** uygulanıyor;
 * orada zaten doğruydu.
 */
function enKotuKisitA(m: MapDef, hpScale: number): { oran: number; kim: string } {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const son = buildReferenceBoards(m, w, k, false)[9]!;
  let enKotu = 0;
  let kim = '';
  for (const id of m.enemyRoster) {
    const e = getEnemyForMap(id as EnemyId, m);
    if (e === undefined) continue;
    const tavan = Math.min(...ceilingAPerBranch(son, e, m));
    if (!(tavan > 0)) continue;
    const oran = (effectiveHp(e, m) * hpScale) / tavan;
    if (oran > enKotu) {
      enKotu = oran;
      kim = id;
    }
  }
  return { oran: enKotu, kim };
}

/**
 * **S109 — ölçüm `referansOlcum`'a taşındı.**
 *
 * Buradaki eski gövde tahtayı `withEarlyBonus = true` ile kuruyor ama
 * simülasyona hiçbir politika vermiyordu; varsayılan `'temizken'` ise
 * `M16`'dan sonra **hiç tetiklenmiyor** (hazırlık artık kuyruk bitince
 * başlıyor, saha boşalınca değil). Yani tahta tam erken bonusuyla
 * zenginleşiyor, oyuncu o bonusu hiç kazanmıyordu.
 */
const bellek = new Map<string, number>();

/**
 * **Ölçüt BANT ORTANCASI — S130 (`M60`), buraya `M62`'de taşındı.**
 *
 * Buradaki eşiklerin hepsi tek canlık farklara bakıyor (≥ 12, ≤ 10) ve
 * `M59`-`M60` ölçümün o mertebede kare süresine bağlı olduğunu
 * gösterdi: harita 6 aynı dengede 55-65 fps arasında 10 ile 13 arası
 * değerler veriyor. Tek koşu, iddiayı dengeye değil şansa bağlıyordu.
 * `kisitB` ve `yetenekKatkisi` `M60`/`M61`'de taşınmıştı; bu dosya da
 * `M62`'nin denge turunda taşındı.
 */
function canKaybi(m: MapDef, hpScale: number): number {
  const anahtar = `${m.id}|${hpScale}`;
  const hazir = bellek.get(anahtar);
  if (hazir !== undefined) return hazir;
  const deger = referansCanKaybiOrtanca(m, hpScale);
  bellek.set(anahtar, deger);
  return deger;
}

describe('DIFFICULTY — M8-T11 (S80)', () => {
  it('üç seviye, varsayılan Normal', () => {
    expect(Object.keys(DIFFICULTY).sort()).toEqual(['kolay', 'normal', 'zor']);
    expect(DEFAULT_DIFFICULTY).toBe('normal');
    expect(isDifficulty('normal')).toBe(true);
    expect(isDifficulty('imkansiz')).toBe(false);
  });

  it('Normal hiçbir şeyi değiştirmiyor — bugünkü denge Normal’dir', () => {
    expect(DIFFICULTY.normal.hpScale).toBe(1);
    expect(DIFFICULTY.normal.startLives).toBe(BALANCE.startLives);
  });

  it('**Zor HP’ye DOKUNMUYOR** — hiçbir düşman öldürülemez olmuyor', () => {
    // `difficulty.ts` başlığındaki ölçümün testi: HP çarpanı ×1,10'da
    // harita 1'in bossu referans tahtanın tavanını aşıyordu (%101) ve
    // öğretici harita geçilemez hâle geliyordu. Zor bu yüzden canı
    // kısıyor; Kısıt A oranları Normal ile **birebir aynı** kalmalı.
    expect(DIFFICULTY.zor.hpScale).toBe(1);
    for (const m of MAPS) {
      expect(enKotuKisitA(m, DIFFICULTY.zor.hpScale).oran, m.id).toBeCloseTo(
        enKotuKisitA(m, 1).oran,
        6,
      );
    }
  });

  /**
   * Reddedilen tasarımın kanıtı — *"sayı iyileşirse bu test bilinçli
   * güncellenir"*. **`M18`'de iyileşti ve güncellendi.**
   *
   * Eskiden oran **1'i aşıyordu**: HP çarpanı ×1,10'da harita 1'in
   * bossu referans tahtanın tavanının üstünde kalıyor, yani öğretici
   * harita geçilemez oluyordu. `M18`'den sonra tahta güçlendi (S112
   * bayrağı + S110 Yıldırım) ve tavan yavaşlatmayı görmeye başladı
   * (S113); oran **0,965**'e indi, yani ×1,10 artık teknik olarak
   * geçilebilir.
   *
   * Zor'un HP'ye dokunmama kararı yine de duruyor, çünkü gerekçe
   * "geçilemez" değil **pay**: 0,965 demek düşmanın tavanın %96,5'ini
   * yemesi, yani `BALANCE.safetyMargin`'in istediği %15 payın (oran
   * eşiği ≈ 0,870) **hiç** kalmaması.
   * Kısıt A'nın bütün kabulü o payın üstünde durmak.
   */
  it('ölçülen dayanak: HP çarpanı ×1,10 PAYI tüketiyor', () => {
    // `safetyMargin` bir ÇARPAN (1,15): `tavan > hp × 1,15` isteniyor,
    // yani oran eşiği `1 / 1,15 ≈ 0,870`.
    const enKotu = Math.max(...MAPS.map((m) => enKotuKisitA(m, 1.1).oran));
    expect(enKotu).toBeGreaterThan(1 / BALANCE.safetyMargin);
    // ×1,10 durumu kesinlikle kötüleştiriyor — kıyas noktası.
    const normal = Math.max(...MAPS.map((m) => enKotuKisitA(m, 1).oran));
    expect(enKotu).toBeGreaterThan(normal);
  });

  it('Zor: can 12 — haritalar 1-3 referans tahtayla HÂLÂ geçiliyor', () => {
    expect(DIFFICULTY.zor.startLives).toBe(12);
    const ogrenmeYayi = MAPS.slice(0, 3);
    for (const m of ogrenmeYayi) {
      expect(canKaybi(m, 1), m.id).toBeLessThan(DIFFICULTY.zor.startLives);
    }
  });

  /**
   * Zor'un tanımı: harita 4 ve 5 referans tahtadan **daha iyisini**
   * istiyor. `M10`'da bu iddia bir süre ölçülen değerlere kilitlendi
   * (S87) çünkü `waveSim`'in üç körlüğü kapanınca gerçek değerler 3 ve
   * 8 çıkmıştı. S87'de harita çarpanları yeniden türetildi ve iddia
   * **geri kondu**.
   *
   * ## S131 — harita 6 ÇARPANDAN değil KADRODAN zorlaştırıldı (`M62`)
   *
   * `M61`'de Okçu'nun dal kuralı düzelince harita 6'nın referans
   * tahtası güçlendi ve can kaybı 13 → 9'a indi, yani bu eşiğin altına.
   * O turda eşik geçici olarak harita 6'yı kapsamaz yapılmıştı
   * (`slice(3, 5)`); sahibi **geri aldırdı** ve haritanın kadrodan
   * zorlaştırılmasını istedi. Doğru karar çıktı — eşik bugün yerinde.
   *
   * Çarpanla düzeltmek zaten mümkün değildi: 7,40-10,0 arası iki
   * tabanda birden tarandı, hiçbir değer 12-20 bandına oturmuyor çünkü
   * sebep gürültü değil **boss eşiği** (7,70'te `ogreSef` sızıyor,
   * toplam tek adımda 10 can zıplıyor).
   *
   * Kadro tarafında ise tek bir şey işe yaradı ve gerekçesi öğretici:
   * sabit puan bütçesinde **tip değiştirmek** karışık tahtayı zor
   * kıpırdatıyor — Örümcek Ana, Şaman, fazladan Tünelci, hepsi denendi,
   * karışık tahta 9-12 arasında kaldı, çünkü hangi tipi getirirsen bir
   * aile ona cevap veriyor. Kıpırdatan şey **sızıntı başına bedel**
   * oldu (`waves.ts` dalga 9: Zırhlı Ork ×2 → Trol ×1, aynı puan, iki
   * katı `leakDamage`), ve dalga 4'ün §7 düzeltmesi (S127) onun üstüne
   * bindi. Ölçüm: **9 → 12** (üretim adımı ve ortanca aynı).
   */
  it('Zor: harita 4 ve 5 referans tahtadan DAHA İYİSİNİ istiyor (S87)', () => {
    expect(DIFFICULTY.zor.startLives).toBe(12);
    for (const m of MAPS.slice(3)) {
      expect(canKaybi(m, 1), m.id).toBeGreaterThanOrEqual(DIFFICULTY.zor.startLives);
    }
  });

  it('Kolay: BEŞ harita da bol payla geçiliyor', () => {
    for (const m of MAPS) {
      expect(canKaybi(m, DIFFICULTY.kolay.hpScale), m.id).toBeLessThanOrEqual(10);
    }
  });

  it('Kolay yıldız kaydetmiyor, diğer ikisi kaydediyor', () => {
    expect(DIFFICULTY.kolay.recordStars).toBe(false);
    expect(DIFFICULTY.normal.recordStars).toBe(true);
    expect(DIFFICULTY.zor.recordStars).toBe(true);
  });

  it('zorluk MONOTON: kolay ≤ normal ≤ zor (pay olarak)', () => {
    // "Pay" = can / beklenen kayıp. Tek bir sayıda toplanamıyor çünkü iki
    // farklı kol var (HP ve can); en kötü haritada karşılaştırılıyor.
    const pay = (d: keyof typeof DIFFICULTY): number => {
      const enKotuKayip = Math.max(...MAPS.map((m) => canKaybi(m, DIFFICULTY[d].hpScale)));
      return DIFFICULTY[d].startLives - enKotuKayip;
    };
    expect(pay('kolay')).toBeGreaterThan(pay('normal'));
    expect(pay('normal')).toBeGreaterThan(pay('zor'));
  });
});

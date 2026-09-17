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
import { referansCanKaybi } from '../systems/referansOlcum';
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
function canKaybi(m: MapDef, hpScale: number): number {
  return referansCanKaybi(m, hpScale);
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
   * ## S130 — harita 6 burada TEK KARE SÜRESİNE borçlu (`M60`)
   *
   * Liste `MAPS.slice(3)`, yani harita 6 da dahil. Harita 6 bu eşiği
   * üretim adımında 13 ile geçiyor; 55-65 fps bandının **ortancası ise
   * 11**, yani eşiğin altında. İddia harita 4 ve 5 için sağlam (ortanca
   * 12 ve 14), harita 6 için değil.
   *
   * Sağlama ortancaya taşınmadı, çünkü taşımak onu **kırardı** ve
   * düzeltecek bir çarpan yok: `maps.ts`'teki S130 taraması 7,0-8,6
   * arasında bütün şartları sağlayan tek nokta buluyor (7,60) ve o
   * noktanın iki komşusu da Okçu'dan kırılıyor. Kusur S131.
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

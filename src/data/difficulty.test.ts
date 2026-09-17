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
   * ## S131 — harita 6 buraya KARAR'la değil `slice`'la girmişti (`M61`)
   *
   * Liste `MAPS.slice(3)` idi ve harita 6'yı da kapsıyordu. Bu bir
   * tasarım kararı değil: `slice(3)` `M8-T11`'de yazıldı, harita 6
   * `M12`'de geldi (git ile doğrulandı — `3dfd852`, `b3b7bc8`'in
   * atası). Başlık o günden beri "harita 4 ve 5" diyor; harita 6
   * listeye **süpürüldü**, konmadı. CLAUDE.md TIER 2'nin saydığı kusur
   * sınıfının tersten hâli: liste kendiliğinden büyüdü, iddia
   * büyümedi.
   *
   * Şart harita 6 için **ölçülerek reddedildi.** `M61`'de Okçu'nun dal
   * kuralı düzelince (S131) harita 6'nın referans tahtası güçlendi ve
   * can kaybı 13 → 9'a indi. Çarpan yeniden tarandı, 7,40-10,0 arası,
   * hem üretim adımında hem bant ortancasında (`M60`) — **hiçbir değer
   * 12-20 bandına oturmuyor:**
   *
   * ```
   * çarpan   7,40  7,45  7,50  7,55  7,60  7,65  7,70   (üretim/ortanca)
   * karışık  9/11 12/13 20/20 10/12 11/12 11/15 24/14
   * ```
   *
   * Sebep gürültü değil **boss eşiği**: 7,70'te sızanların arasına
   * `ogreSef` giriyor ve toplam tek adımda 10 can zıplıyor. Yani harita
   * 6 bir kadran değil bir **uçurum** — tahta bossu ya öldürüyor (≤15)
   * ya öldürmüyor (≥21), arası yok. S109'un harita 2 için yazdığı
   * cümlenin birebir aynısı: *"ya yetiyor ya çöküyor; arası yok"*, ve
   * oradaki çözüm de aynı olmuştu — iddiayı sivri uca oturtmak yerine
   * **kapsamını ölçüye göre yazmak**.
   *
   * Harita 6'nın zorluğu zaten çarpanda değil **kadroda**: Tünelci
   * (hedeflenemez pencere) ve çağıran boss. Bugünkü hâliyle Zor'da
   * referans tahta harita 6'yı **bir can payla** geçiyor (11/12).
   *
   * **Sahibine sorulacak:** bu, şartın gevşemesi demek. Alternatifi
   * çarpanı iki kırık komşunun arasındaki bir noktaya oturtmaktı ve
   * S82/S84 bunu bir kez reddetti.
   */
  it('Zor: harita 4 ve 5 referans tahtadan DAHA İYİSİNİ istiyor (S87)', () => {
    expect(DIFFICULTY.zor.startLives).toBe(12);
    // `slice(3, 5)` — harita 6 hariç, gerekçesi üstte (S131).
    for (const m of MAPS.slice(3, 5)) {
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

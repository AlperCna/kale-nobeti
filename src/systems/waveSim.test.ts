import { describe, it, expect } from 'vitest';
import { simulateWave, simulateAllWaves } from './waveSim';
import { buildReferenceBoards } from './balanceChecks';
import { MAP_1 } from '../data/maps';
import { MAP1_WAVES } from '../data/waves';
import { measureCoverage } from '../util/coverage';
import { BALANCE } from '../data/balance';
import { TOWERS } from '../data/towers';
import type { ReferenceBoard } from '../types/board';

const KAPSAMA = measureCoverage(MAP_1.paths, MAP_1.buildSpots, 150);
const BOARDS = buildReferenceBoards(MAP_1, MAP1_WAVES, KAPSAMA);
/** Erken başlatma bonusu kullanılmış hâli — §6 bunu bekliyor. */
const GERCEKCI = buildReferenceBoards(MAP_1, MAP1_WAVES, KAPSAMA, true);
const BOS_TAHTA: ReferenceBoard = { waveIndex: 1, towers: [], cumulativeCost: 0 };

describe('simulateWave — temel davranış', () => {
  it('sahnesiz koşuyor — Phaser gerektirmiyor', () => {
    // "Bitmedi sayılır eğer: simülasyon render veya Phaser.Scene
    // gerektiriyorsa." Bu test dosyası `node` ortamında koşuyor; import
    // zinciri Phaser'a dokunsaydı `window is not defined` ile patlardı.
    expect(() => simulateWave(MAP1_WAVES[0]!, BOARDS[0]!, MAP_1)).not.toThrow();
  });

  it('kulesiz tahtada HER düşman sızıyor', () => {
    const r = simulateWave(MAP1_WAVES[0]!, BOS_TAHTA, MAP_1);
    expect(r.leakedCount).toBe(10); // dalga 1: 10 goblin
    expect(r.leakedHp).toBeGreaterThan(0);
    expect(r.killedCount).toBe(0);
  });

  it('kulesiz sızan HP = düşman sayısı × tam can', () => {
    const r = simulateWave(MAP1_WAVES[0]!, BOS_TAHTA, MAP_1);
    expect(r.leakedHp).toBeCloseTo(10 * 45 * MAP_1.hpMultiplier, 6);
  });

  it('DETERMİNİSTİK — aynı girdi aynı sonuç', () => {
    const a = simulateWave(MAP1_WAVES[4]!, BOARDS[4]!, MAP_1);
    const b = simulateWave(MAP1_WAVES[4]!, BOARDS[4]!, MAP_1);
    expect(a).toEqual(b);
  });

  it('durationSec ÖLÇÜLÜYOR — pozitif ve makul', () => {
    const r = simulateWave(MAP1_WAVES[0]!, BOARDS[0]!, MAP_1);
    expect(r.durationSec).toBeGreaterThan(0);
    expect(r.durationSec).toBeLessThan(300);
  });

  /**
   * **Eşik %2 → %4.** Uçan düşmanlar artık gerçekten `flyerPaths` üstünde
   * uçuyor (bu oturumda düzeltildi — daha önce `waveSim` uçanı da yer
   * hattında yürütüyordu, `M7-T01`/`T02`'nin iki-giriş desteği hiç
   * sınanmamıştı). Bir uçan tam kaleye varacakken son kulenin vuruşuyla
   * ölüyorsa (dalga 5: 42.05 sn @ 60 kare, 40.68 sn @ 120 kare — **%3,27**)
   * bu doğal bir eşik hassasiyeti: 120 kare ve üstü birbirine <%0,1
   * yakınsıyor (ayrıca doğrulandı), yalnız 60 kare biraz kaba kalıyor.
   * `killedCount` eşitliği asıl denge sağlaması — o hâlâ **tam** eşleşiyor.
   *
   * **Eşik %4 → %5 (`M11` Faz 5).** Aile dengesi değişince aynı dalga
   * %4,06'ya çıktı. Yeni bir kararsızlık değil, **aynı** 60 kare
   * kabalığı: ölçüldü — 60→120 %4,06 · 120→240 **%0,02** · 240→480
   * **%0,01**, ve dört adım boyutunda da `killedCount` birebir aynı
   * (13). Yani seri yakınsıyor, yalnız ilk adım kaba.
   */
  it('adım boyutu yarıya inince sonuç < %5 değişiyor (yakınsama)', () => {
    const normal = simulateWave(MAP1_WAVES[5]!, BOARDS[5]!, MAP_1, 1000 / 60);
    const ince = simulateWave(MAP1_WAVES[5]!, BOARDS[5]!, MAP_1, 1000 / 120);
    const fark = Math.abs(ince.durationSec - normal.durationSec) / normal.durationSec;
    expect(fark).toBeLessThan(0.05);
    expect(ince.killedCount).toBe(normal.killedCount);
  });
});

/**
 * **`M9-T03` — 3× hız dengeyi bozmuyor.**
 *
 * `GameClock.scaledDelta = delta * scale`, yani 60 kare/sn'de 3× hız
 * simülasyonda **50 ms'lik adım** demek. Soru tek: adım üç katına
 * çıkınca dalganın sonucu değişiyor mu?
 *
 * Bu test harita 1 ile sınırlı (koşu süresi). Beş haritanın tamamı
 * ölçüldü ve sonuç `GameClock.setScale` dokümanında; oradaki asıl bulgu
 * 3×'in 240 kare/sn'lik "gerçek" cevaba **1× kadar yakın** olması.
 */
describe('3× hız — adım büyümesi sonucu değiştirmiyor', () => {
  const KARE = 1000 / 60;
  const bir = simulateAllWaves(MAP1_WAVES, GERCEKCI, MAP_1, KARE);
  const uc = simulateAllWaves(MAP1_WAVES, GERCEKCI, MAP_1, KARE * 3);

  /**
   * **`M16` — iddia dalga başınadan TOPLAMA taşındı.**
   *
   * Dalgalar üst üste binince bir düşmanın *hangi pencerede* öldüğü
   * dalga sınırına milisaniye hassasiyetinde bağlı: 50 ms'lik adımda
   * bir dalga 9'un artığı sınırın bir tarafına, 16,7 ms'lik adımda
   * öbür tarafına düşebiliyor (ölçüldü: dalga 2'de 8 ↔ 9). **Toplam**
   * değişmiyor — hiçbir düşman kaybolmuyor ya da iki kez sayılmıyor —
   * ve asıl iddia da buydu: 3× hız dengeyi bozmuyor.
   */
  it('öldürülen düşman sayısı TOPLAMDA aynı', () => {
    const a = bir.reduce((t, r) => t + r.killedCount, 0);
    const b = uc.reduce((t, r) => t + r.killedCount, 0);
    expect(b).toBe(a);
  });

  it('3×’te de hiçbir dalga sızdırmıyor', () => {
    for (const r of uc) expect(r.leakedCount).toBe(0);
  });

  it('toplam dalga süresi %2’den az sapıyor', () => {
    const a = bir.reduce((t, r) => t + r.durationSec, 0);
    const b = uc.reduce((t, r) => t + r.durationSec, 0);
    expect(Math.abs(b - a) / a).toBeLessThan(0.02);
  });

  /**
   * Asıl sessiz kırılma noktası: `TowerSystem` kare başına **bir** atış
   * yapıyor. Kare süresi atış periyodunu aşarsa atış düşerdi. En hızlı
   * kule `fireRate` 1.4/sn → 714 ms periyot; 3×'te kare 50 ms. Bu test
   * ileride hızlı bir kule eklenirse patlar.
   */
  it('en hızlı kule periyodu 3× kare süresinden UZUN', () => {
    const enHizli = Math.max(
      ...TOWERS.flatMap((k) => k.tiers.map((t) => t.fireRate)),
    );
    expect(1000 / enHizli).toBeGreaterThan(KARE * 3);
  });
});

describe('Kısıt B — 10 dalga referans tahtaya karşı', () => {
  const gercekci = simulateAllWaves(MAP1_WAVES, GERCEKCI, MAP_1);
  const muhafazakar = simulateAllWaves(MAP1_WAVES, BOARDS, MAP_1);

  it('HİÇBİR dalga sızdırmıyor — ★★★ ile bitiyor', () => {
    // M3'te bu iddia tutmuyordu (1 sızıntı) ve test "geçilebilirlik"
    // olarak gevşetilmişti. **M4'te tuttu**: Büyü ailesi girince referans
    // tahta zırhlı düşmanlara gerçek cevap kazandı ve tahta on dalgayı
    // temiz geçiyor. Gevşetilen iddia geri sıkılaştırıldı.
    gercekci.forEach((r, i) => {
      expect(r.leakedCount, `dalga ${i + 1}`).toBe(0);
    });
    expect(BALANCE.startLives).toBe(20); // ★★★
  });

  it('muhafazakâr tahta da temiz — erken başlatma ZORUNLU değil', () => {
    // Oyuncu hiç erken başlatmasa bile on dalgayı sızıntısız geçiyor.
    const toplamSizan = muhafazakar.reduce((t, r) => t + r.leakedCount, 0);
    expect(toplamSizan).toBe(0);
  });

  it('erken başlatma bonusu dalgaları HIZLANDIRIYOR', () => {
    // §6: "geç oyunda gerçek bir karar". Sızıntı ikisinde de sıfır olduğu
    // için fark artık orada değil — **dalga süresinde**. Daha çok T2 →
    // düşmanlar daha erken ölüyor → dalga daha kısa.
    const g = gercekci.reduce((t, r) => t + r.durationSec, 0);
    const m = muhafazakar.reduce((t, r) => t + r.durationSec, 0);
    expect(g).toBeLessThan(m);
  });

  it('BOSS dalgası geçiliyor — boss ölüyor', () => {
    const boss = gercekci[9]!;
    expect(boss.leakedCount).toBe(0);
    // Kendi kadrosu 1 boss + 10 refakat. **`M16`'dan beri pencere
    // yalnız kendi düşmanlarını içermiyor** — dalga 9'un artıkları da
    // burada ölüyor (ölçülen 22). İddia bu yüzden alt sınır.
    expect(boss.killedCount).toBeGreaterThanOrEqual(11);
  });

  it('TÜM düşmanlar ölüyor', () => {
    const toplamDusman = MAP1_WAVES.reduce(
      (t, w) => t + w.groups.reduce((s, g) => s + g.count, 0),
      0,
    );
    const oldurulen = gercekci.reduce((t, r) => t + r.killedCount, 0);
    expect(oldurulen).toBe(toplamDusman);
  });

  it('tepe düşman sayısı havuz kapasitesinin altında', () => {
    for (const r of gercekci) expect(r.peakEnemies).toBeLessThan(60);
  });

  it('10 dalga simülasyonu 2 saniyeden kısa', () => {
    // `CLAUDE.md` Test: "node belirgin şekilde hızlı ve simulateWave'in
    // '10 dalga < 2 sn' şartı buna bağlı."
    const t0 = performance.now();
    simulateAllWaves(MAP1_WAVES, GERCEKCI, MAP_1);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});

describe('simulateWave — tahta gücü sonucu değiştiriyor', () => {
  it('zayıf tahta sızdırıyor, güçlü tahta sızdırmıyor', () => {
    const zayif: ReferenceBoard = {
      waveIndex: 10,
      towers: [BOARDS[9]!.towers[0]!], // tek kule
      cumulativeCost: 0,
    };
    const zayifSonuc = simulateWave(MAP1_WAVES[9]!, zayif, MAP_1);
    const guclu = simulateWave(MAP1_WAVES[9]!, BOARDS[9]!, MAP_1);

    expect(zayifSonuc.leakedHp).toBeGreaterThan(0);
    expect(guclu.leakedHp).toBe(0);
  });

  it('erken dalga tahtası geç dalgayı tutamıyor — rampa gerçek', () => {
    const erkenTahta = BOARDS[0]!;
    const gecDalga = MAP1_WAVES[9]!;
    expect(simulateWave(gecDalga, erkenTahta, MAP_1).leakedHp).toBeGreaterThan(0);
  });
});

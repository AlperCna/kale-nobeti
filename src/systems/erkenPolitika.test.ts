/**
 * **Erken başlatma kararı ölçülüyor** — `M121` (S102 · S116 · CLAUDE.md).
 *
 * `M16` erken başlatmayı gerçek bir karara çevirdi (dalgalar üst üste
 * binebiliyor), `M25` kazancı ve riski HUD'a koydu, `M28` eski kuralı
 * anlatan metinleri düzeltti. Ama **hiçbir test politikaya bakmıyordu**:
 * `referansOlcum` her zaman `'hic'` koşuyor ve dört politikadan üçü
 * ölçüm dışıydı. `M120`'nin dersi burada birebir geçerli — bir koruma
 * tek yapılandırmada ölçerse öteki yapılandırmalar sessizce kayıyor.
 *
 * Kaydığı da ölçüldü: `M16`'nın belgelediği tablo `0 · 3 · 11 · 16 · 30
 * · 44`'tü, bugün `0 · 2 · 16 · 46 · 47 · 40` — harita 4'ün cezası
 * **üç katına** çıkmış ve kimse görmemiş.
 *
 * ## İki knob birlikte hareket eder (S109)
 *
 * Erken basan oyuncu **hem** bonus altını alıyor **hem** dalgaları üst
 * üste bindiriyor. Politikayı verip `withEarlyBonus`'ı vermemek ölçümün
 * çiftini ayrıştırır — S109 tam olarak bu hatadan doğdu. Bu dosya
 * ikisini `politikaninTahtasi` içinde birlikte seçiyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAPS, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import { POOL_PREALLOC } from '../data/balance';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import type { ErkenPolitika } from './waveSim';
import { REFERANS_POLITIKA } from './referansOlcum';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

const POLITIKALAR: readonly ErkenPolitika[] = ['hic', 'temizken', 'sonBirkac', 'hemen'];

/**
 * **Ölçüm çözünürlüğü ±2 can** (S145, `M94`). Bundan küçük farklar
 * gürültü; iddialar bu payın dışında kurulur.
 */
const COZUNURLUK = 2;

/** Politikayı basan oyuncu bonusu da alıyor — ikisi ayrılmaz (S109). */
const politikaninTahtasi = (p: ErkenPolitika): boolean => p !== 'hic';

const bellek = new Map<string, { can: number; tepe: number }>();

function olc(m: MapDef, p: ErkenPolitika): { can: number; tepe: number } {
  const anahtar = `${m.id}:${p}`;
  const hazir = bellek.get(anahtar);
  if (hazir !== undefined) return hazir;
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(
    w,
    buildReferenceBoards(m, w, k, politikaninTahtasi(p)),
    m,
    undefined,
    1,
    'yok',
    p,
  );
  let can = 0;
  let tepe = 0;
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      can += (getEnemyForMap(id as EnemyId, m)?.leakDamage ?? 0) * (n ?? 0);
    }
    tepe = Math.max(tepe, r.peakEnemies);
  }
  const sonuc = { can, tepe };
  bellek.set(anahtar, sonuc);
  return sonuc;
}

describe('Erken başlatma politikası — M121', () => {
  it('öğretici harita her politikada BEDAVA', () => {
    for (const p of POLITIKALAR) {
      expect(olc(MAPS[0]!, p).can, p).toBe(0);
    }
  });

  /**
   * **Risk gerçek.** `M16`'nın koyduğu bedel duruyor mu — saldırgan
   * oyun geç haritalarda belirgin biçimde daha çok can kaybettirmeli.
   * Ölçülen (bugün): Kar Geçidi 12 → **46**, Kadim Harabe 14 → **47**,
   * Sisli Bataklık 17 → **40**.
   *
   * Sıralama **iddia edilmiyor** ve bu bilinçli: `hemen`'de üç harita da
   * 20 canın iki-üç katını kaybediyor, yani aralarındaki sıra oyuncu
   * için hiçbir şey ifade etmiyor (bugün 46 · 47 · 40, monoton değil).
   */
  it('saldırgan oyun (`hemen`) geç haritalarda GERÇEK bir bedel ödüyor', () => {
    for (const m of MAPS.slice(3)) {
      expect(olc(m, 'hemen').can, m.id).toBeGreaterThan(olc(m, 'hic').can + COZUNURLUK);
    }
  });

  /**
   * **İyi oyun cezalandırılmıyor.** `sonBirkac` ölçülen en iyi oyun
   * (`waveSim` başlığı): bonusun çoğunu alıyor, kalabalığın üstüne yeni
   * dalga çağırmıyor. Hiç basmamaktan **kötü olmamalı** — olsaydı düğme
   * saf bir tuzak olurdu.
   *
   * Ölçülen fark bugün ±1 can, yani düğmenin kazancı can cinsinden
   * **sıfıra yakın**. Bu bir kusur değil ama bir soru: gerekçesi S117 —
   * harita 4-6'da altın zaten kısıt değil (tahta maliyeti/gelir 0,40 ·
   * 0,35), yani fazladan altının alacağı bir şey yok. `M99`'un yetenek
   * yükseltmesi o gideri açtı ama referans ölçüm yeteneği hiç
   * kullanmıyor (`'yok'`), dolayısıyla kazanç bu ölçümde görünmüyor.
   */
  it('iyi oyun (`sonBirkac` · `temizken`) hiç basmamaktan KÖTÜ değil', () => {
    for (const p of ['sonBirkac', 'temizken'] as const) {
      for (const m of MAPS) {
        expect(olc(m, p).can, `${p} / ${m.id}`).toBeLessThanOrEqual(
          olc(m, 'hic').can + COZUNURLUK,
        );
      }
    }
  });

  /**
   * **CLAUDE.md'nin `peakEnemies` satırı artık ELLE değil BURADA.**
   *
   * O satır *"bu satır bir dalga verisi değiştiren her turda yeniden
   * ölçülür"* diyordu ve `M117`/`M119`/`M120` dalga verisini değiştirip
   * ölçümü atladı — sayı 21'de kalmıştı, gerçek **23**. Elle tutulan
   * söz bu projede tutulmuyor; kural artık türetiliyor.
   *
   * En kötü hâl `hemen`: oyuncu her dalgayı mümkün olan en erken anda
   * başlatıyor, yani `M16` örtüşmesi sonuna kadar.
   */
  it('en kötü politikada bile eşzamanlı düşman havuza SIĞIYOR', () => {
    const tepe = Math.max(...MAPS.map((m) => olc(m, 'hemen').tepe));
    expect(tepe, `tepe ${tepe} / havuz ${POOL_PREALLOC.enemy}`).toBeLessThan(
      POOL_PREALLOC.enemy,
    );
    // `CLAUDE.md` Arcade fizik notu: naif O(n·m) taraması 200'e kadar
    // yetiyor. Pay en az iki kat kalmalı ki ızgara sorusu açılmasın.
    expect(200 / tepe).toBeGreaterThan(2);
  });

  it('referans ölçüm hâlâ en muhafazakâr politikayı kullanıyor', () => {
    // Taban `'hic'` olmazsa bütün denge sayıları başka bir oyuncuyu
    // anlatır (`referansOlcum` başlığı, S109).
    expect(REFERANS_POLITIKA).toBe('hic');
    for (const m of MAPS) {
      expect(olc(m, 'hemen').can, m.id).toBeGreaterThanOrEqual(olc(m, 'hic').can);
    }
  });
});

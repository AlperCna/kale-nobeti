import { describe, it, expect } from 'vitest';
import { MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { measureCoverage, pathLength, spotsCoveringFlyerPaths } from '../util/coverage';

describe('MAP_1 — GAME-DESIGN §9 tablosuna uygunluk', () => {
  it('§9 tablosundaki sayılar birebir', () => {
    expect(MAP_1.buildSpots).toHaveLength(8);
    expect(MAP_1.paths).toHaveLength(1); // 1 giriş
    expect(MAP_1.hpMultiplier).toBe(1.0);
    expect(MAP_1.goldMultiplier).toBe(MAP_1.hpMultiplier); // §9: altın çarpanı = HP çarpanı
    expect(MAP_1.startGold).toBe(280);
  });

  it('§5 kadrosu: harita 1 beş düşman tanıtıyor', () => {
    expect([...MAP_1.enemyRoster].sort()).toEqual(
      ['goblin', 'harpi', 'kurtBinicisi', 'ogreSef', 'orkSavasci'].sort(),
    );
  });

  it('yolun son waypointi kale', () => {
    const yol = MAP_1.paths[0];
    expect(yol?.[yol.length - 1]).toEqual(MAP_1.castle);
  });

  it('yapı noktası yolun üstünde değil', () => {
    // Yol üstüne kule konamaz. En yakın nokta bile yol merkezinden ≥ 40 px.
    const yol = MAP_1.paths[0] ?? [];
    for (const spot of MAP_1.buildSpots) {
      let enYakinKare = Infinity;
      for (let i = 0; i < yol.length - 1; i++) {
        const a = yol[i];
        const b = yol[i + 1];
        if (a === undefined || b === undefined) continue;
        // Segmentin ekseni ya yatay ya dikey; dik uzaklık yeterli.
        const dx = b.x - a.x;
        const d =
          dx !== 0
            ? spot.x >= Math.min(a.x, b.x) && spot.x <= Math.max(a.x, b.x)
              ? Math.abs(spot.y - a.y)
              : Infinity
            : spot.y >= Math.min(a.y, b.y) && spot.y <= Math.max(a.y, b.y)
              ? Math.abs(spot.x - a.x)
              : Infinity;
        enYakinKare = Math.min(enYakinKare, d);
      }
      expect(enYakinKare).toBeGreaterThanOrEqual(40);
    }
  });

  it('her şey mantıksal ekran içinde (kale ve doğum hariç)', () => {
    for (const spot of MAP_1.buildSpots) {
      expect(spot.x).toBeGreaterThanOrEqual(0);
      expect(spot.x).toBeLessThanOrEqual(1280);
      expect(spot.y).toBeGreaterThanOrEqual(0);
      expect(spot.y).toBeLessThanOrEqual(720);
    }
    expect(MAP_1.castle.x).toBeLessThanOrEqual(1280);
    expect(MAP_1.castle.y).toBeLessThanOrEqual(720);
  });
});

describe('MAP_1.coverage — elle yazılmadığının kanıtı', () => {
  it('measureCoverage çıktısıyla birebir eşleşiyor', () => {
    // Biri elle bir sayıyı "düzeltirse" bu test kırılır.
    const beklenen = measureCoverage(
      MAP_1.paths,
      MAP_1.buildSpots,
      COVERAGE_REFERENCE_RANGE,
    );
    expect(MAP_1.coverage).toEqual(beklenen);
  });

  it('her yapı noktası için bir kayıt, sırayla', () => {
    expect(MAP_1.coverage).toHaveLength(MAP_1.buildSpots.length);
    MAP_1.coverage.forEach((c, i) => expect(c.spotIndex).toBe(i));
  });

  it('hiçbir nokta ölü değil — hepsi yolu görüyor', () => {
    for (const c of MAP_1.coverage) expect(c.coveredPx).toBeGreaterThan(0);
  });
});

describe('MAP_1 — denge hedefleri', () => {
  it('ortalama kapsama boss 700 için gereken banda düşüyor', () => {
    // maps.ts başlığındaki türetme: boss 700 tavanın %75-85'i olacaksa
    // gereken tavan 824-933, tavan = 3C → C ∈ [275, 311].
    const ortalama =
      MAP_1.coverage.reduce((t, c) => t + c.coveredPx, 0) / MAP_1.coverage.length;
    expect(ortalama).toBeGreaterThanOrEqual(275);
    expect(ortalama).toBeLessThanOrEqual(311);
  });

  it('viraj noktaları düz noktalardan belirgin değerli', () => {
    // Oyuncunun yerleşim kararı anlamlı olsun diye: en iyi nokta en kötünün
    // en az 1.5 katı. Hepsi eşitse yerleşim kararı yok demektir.
    const degerler = MAP_1.coverage.map((c) => c.coveredPx);
    expect(Math.max(...degerler)).toBeGreaterThan(1.5 * Math.min(...degerler));
  });

  it('uçan hattını gören nokta oranı ≥ %40 (GAME-DESIGN §5, risk R4)', () => {
    const goren = spotsCoveringFlyerPaths(
      MAP_1.flyerPaths,
      MAP_1.buildSpots,
      COVERAGE_REFERENCE_RANGE,
    );
    expect(goren / MAP_1.buildSpots.length).toBeGreaterThanOrEqual(0.4);
  });

  it('yol uzunluğu ölçüldü — S16', () => {
    // Doküman bir L dayatmıyor; research/01 §3'teki 1800 bir örnekti.
    // Bu iddia yalnızca uzunluğun makul bir bantta kaldığını sabitliyor;
    // yol yeniden çizilirse burası bilinçli güncellenir.
    const L = pathLength(MAP_1.paths[0] ?? []);
    expect(L).toBe(1700);
  });
});

describe('MAPS', () => {
  it('M8 sonunda BEŞ harita var, zorluk sırasında', () => {
    // M1'de bu test "tek harita" diyordu, M7'de "üç" — ikisi de taş
    // durumuydu, kalıcı bir kural değil. `M8-T04` dördüncüyü ekliyor.
    // Sıra kilit sırası: `SaveSystem.isUnlocked` bu diziyi okuyor.
    expect(MAPS).toHaveLength(5);
    expect(MAPS[0]).toBe(MAP_1);
    expect(MAPS[1]).toBe(MAP_2);
    expect(MAPS[2]).toBe(MAP_3);
    expect(MAPS[3]).toBe(MAP_4);
    expect(MAPS[4]).toBe(MAP_5);
  });

  it('kimlikler benzersiz — kayıt anahtarı bunlara dayanıyor', () => {
    expect(new Set(MAPS.map((m) => m.id)).size).toBe(MAPS.length);
  });
});

// ---------------------------------------------------------------------
// M7 — Harita 2 ve 3
// ---------------------------------------------------------------------

describe('Harita 2 ve 3 — GAME-DESIGN.md §9 tablosu', () => {
  it('§9 tablosunun her hücresi', () => {
    expect(MAP_2.id).toBe('tas-kopru');
    expect(MAP_2.buildSpots).toHaveLength(10);
    expect(MAP_2.paths).toHaveLength(2); // Y ayrımı
    // S87 — zorluk rampası ölçülerek yeniden türetildi; gerekçe ve
    // tarama `data/maps.ts`'in harita 2 üstündeki S87 notunda.
    expect(MAP_2.hpMultiplier).toBe(1.5);
    expect(MAP_2.goldMultiplier).toBe(1.6);
    // S72 — §9 tablosu 340/400 diyor ama altın çarpanını izlemiyordu.
    // §9'un kendi gerekçesi ("altın/HP oranı düşmesin") başlangıç altınına
    // da uygulandı: 280 × çarpan. Ölçülen etki: dalga 1 sızıntısı
    // harita 2'de 4→0, harita 3'te 7→0.
    expect(MAP_2.startGold).toBe(448);

    expect(MAP_3.id).toBe('kul-ovasi');
    expect(MAP_3.buildSpots).toHaveLength(12);
    expect(MAP_3.paths).toHaveLength(2); // iki giriş
    // S82 geri alındı (S86) → S87 ile 3,0 → S91 ile 2,6 (M11-T02 dal
    // dengesi rampayı yeniden türettirdi).
    expect(MAP_3.hpMultiplier).toBe(2.6);
    expect(MAP_3.goldMultiplier).toBe(3.8); // S73 — HP çarpanından ayrıştı
    expect(MAP_3.startGold).toBe(1064); // 280 × 3,8
  });

  it('S73 — altın çarpanı HP çarpanından AZ OLAMAZ', () => {
    // §9 "eşit" diyordu; gerekçesi "altın/HP oranı düşmesin". Ölçüm harita
    // 3'te eşitliğin bu gerekçeyi karşılamadığını gösterdi (12 nokta tam
    // yükseltilemiyordu). Kural gevşetildi: **en az** eşit.
    for (const m of MAPS) expect(m.goldMultiplier).toBeGreaterThanOrEqual(m.hpMultiplier);
  });

  it('kadrolar §5 tablosuyla eşleşiyor — mekanik erken, uç örneği geç', () => {
    // Harita 2 = harita 1 + Zırhlı Ork, Şaman
    for (const e of MAP_1.enemyRoster) expect(MAP_2.enemyRoster).toContain(e);
    expect(MAP_2.enemyRoster).toContain('zirhliOrk');
    expect(MAP_2.enemyRoster).toContain('saman');
    expect(MAP_2.enemyRoster).not.toContain('trol');
    expect(MAP_2.enemyRoster).not.toContain('orumcekAna');

    // Harita 3 = harita 2 + Trol, Örümcek Ana
    for (const e of MAP_2.enemyRoster) expect(MAP_3.enemyRoster).toContain(e);
    expect(MAP_3.enemyRoster).toContain('trol');
    expect(MAP_3.enemyRoster).toContain('orumcekAna');
    // Yavru kadroda sayılmaz ama bölünmeden doğabilmesi için listede olmalı.
    expect(MAP_3.enemyRoster).toContain('orumcekYavrusu');
  });

  it('S72 — başlangıç altını çarpanı İZLİYOR', () => {
    for (const m of MAPS) {
      expect(m.startGold, m.id).toBe(Math.round(MAP_1.startGold * m.goldMultiplier));
    }
  });

  it('zorluk MONOTON artıyor', () => {
    // Dizi üstünde yürüyor: beşinci harita eklendiğinde bu test kendiliğinden
    // onu da kapsıyor (eskiden elle yazılmış üç karşılaştırmaydı).
    // **Yapı noktası sayısı hariç** — harita 3 ve 4 ikisi de 12 nokta;
    // zorluk artışı orada geometriden (tek giriş, uzun S) geliyor.
    for (let i = 1; i < MAPS.length; i++) {
      const onceki = MAPS[i - 1]!;
      const simdiki = MAPS[i]!;
      expect(onceki.hpMultiplier, simdiki.id).toBeLessThan(simdiki.hpMultiplier);
      expect(onceki.startGold, simdiki.id).toBeLessThan(simdiki.startGold);
      expect(onceki.buildSpots.length, simdiki.id).toBeLessThanOrEqual(simdiki.buildSpots.length);
    }
  });
});

// ---------------------------------------------------------------------
// M8-T04 — Harita 4 "Kar Geçidi"
// ---------------------------------------------------------------------

describe('Harita 4 — M8-T04', () => {
  it('sayılar ÖLÇÜLDÜ, uydurulmadı (M8-T04-SONUC)', () => {
    expect(MAP_4.id).toBe('kar-gecidi');
    expect(MAP_4.buildSpots).toHaveLength(12);
    // Tek giriş — harita 2/3'ün ayrık yolundan sonra bilinçli bir geri dönüş:
    // zorluk kolları bölmekten değil, uzun S kıvrımı + yüksek çarpandan geliyor.
    expect(MAP_4.paths).toHaveLength(1);
    // Çarpanlar İKİ turda belirlendi (gerekçe `maps.ts` yorumunda):
    // monotonluk 3,4/4,0 diyordu ama simülasyon o değerlerle **sıfır**
    // can kaybı verdi — harita 3'ten kolay. Tarama 4,4'ü verdi (can 13,
    // harita 3'ün 10'unun üstünde, 20 sınırının altında).
    // S87 → S91: HP düştü, altın kaldı (tahta kule başına zayıfladı).
    expect(MAP_4.hpMultiplier).toBe(4.8);
    expect(MAP_4.goldMultiplier).toBe(7.2);
    expect(MAP_4.startGold).toBe(2016);
  });

  it('kadro harita 3 + ogreSef — yeni düşman tipi YOK', () => {
    // `M8-T04` harita ekliyor, düşman değil (yeni düşman `M8-T09`'un işi).
    // Yavru da dahil: Örümcek Ana bölününce sahada doğuyor, kadroda
    // olmazsa bilgi paneli o düşmanı hiç listelemiyor.
    for (const e of MAP_3.enemyRoster) expect(MAP_4.enemyRoster, e).toContain(e);
  });

  it('uçan hattını gören nokta oranı ≥ %40', () => {
    const goren = spotsCoveringFlyerPaths(
      MAP_4.flyerPaths,
      MAP_4.buildSpots,
      COVERAGE_REFERENCE_RANGE,
    );
    expect(goren / MAP_4.buildSpots.length).toBeGreaterThanOrEqual(0.4);
  });

  it('yapı noktası yolun üstünde değil', () => {
    const yol = MAP_4.paths[0] ?? [];
    for (const spot of MAP_4.buildSpots) {
      let enYakinKare = Infinity;
      for (let i = 0; i < yol.length - 1; i++) {
        const a = yol[i]!;
        const b = yol[i + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const uzKare = dx * dx + dy * dy;
        const t =
          uzKare === 0 ? 0 : Math.max(0, Math.min(1, ((spot.x - a.x) * dx + (spot.y - a.y) * dy) / uzKare));
        const px = a.x + t * dx - spot.x;
        const py = a.y + t * dy - spot.y;
        enYakinKare = Math.min(enYakinKare, px * px + py * py);
      }
      expect(Math.sqrt(enYakinKare), `${spot.x},${spot.y}`).toBeGreaterThanOrEqual(40);
    }
  });

  it('yolun son waypointi kale', () => {
    const yol = MAP_4.paths[0];
    expect(yol?.[yol.length - 1]).toEqual(MAP_4.castle);
  });
});

describe('§9 kapsama bandı — KOL BAŞINA (ayrık yol uyarısı)', () => {
  /**
   * §9: geçerli aralık geometri bandı (285-315) ile boss bandının
   * (275-311) kesişimi = **285-311 px**.
   *
   * Ayrık yolda **kol başına** ölçülüyor: iki kol ortak gövdeyi
   * paylaşıyorsa toplam ölçüm aynı fiziksel yolu iki kez sayıyor. İlk
   * tasarımda harita 2 toplamda 487,5 çıkmıştı — kol başına 299,8.
   */
  const kolOrtalamasi = (kaps: readonly { coveredPx: number }[]): number => {
    // O kolu **hiç görmeyen** noktalar ortalamaya girmiyor: bir kolun
    // savunmasız kalması yerleşim kararı, geometri hatası değil.
    const goren = kaps.filter((c) => c.coveredPx > 0);
    return goren.reduce((a, c) => a + c.coveredPx, 0) / goren.length;
  };

  it('her haritanın HER KOLU 285-311 px bandında', () => {
    for (const m of MAPS) {
      m.branchCoverage.forEach((kol, i) => {
        const ort = kolOrtalamasi(kol);
        expect(ort, `${m.id} kol ${i}: ${ort.toFixed(1)}`).toBeGreaterThanOrEqual(285);
        expect(ort, `${m.id} kol ${i}: ${ort.toFixed(1)}`).toBeLessThanOrEqual(311);
      });
    }
  });

  it('ölçülen değerler — değişirse M7-SONUC güncellenmeli', () => {
    expect(kolOrtalamasi(MAP_1.branchCoverage[0]!)).toBeCloseTo(296.3, 0);
    expect(kolOrtalamasi(MAP_2.branchCoverage[0]!)).toBeCloseTo(299.8, 0);
    expect(kolOrtalamasi(MAP_2.branchCoverage[1]!)).toBeCloseTo(299.8, 0);
    expect(kolOrtalamasi(MAP_3.branchCoverage[0]!)).toBeCloseTo(291.3, 0);
    expect(kolOrtalamasi(MAP_3.branchCoverage[1]!)).toBeCloseTo(291.3, 0);
    expect(kolOrtalamasi(MAP_4.branchCoverage[0]!)).toBeCloseTo(290.1, 0);
    expect(kolOrtalamasi(MAP_5.branchCoverage[0]!)).toBeCloseTo(298.0, 0);
    expect(kolOrtalamasi(MAP_5.branchCoverage[1]!)).toBeCloseTo(298.0, 0);
  });

  it('Y ayrımında iki kol SİMETRİK — biri diğerinden kolay değil', () => {
    expect(kolOrtalamasi(MAP_2.branchCoverage[0]!)).toBeCloseTo(
      kolOrtalamasi(MAP_2.branchCoverage[1]!),
      3,
    );
    expect(kolOrtalamasi(MAP_3.branchCoverage[0]!)).toBeCloseTo(
      kolOrtalamasi(MAP_3.branchCoverage[1]!),
      3,
    );
  });

  it('kollar 150 px menzille aynı anda GÖRÜLEMİYOR — gerçek bir seçim', () => {
    // Harita 2: üst kol köşesini gören nokta alt kolu görmemeli.
    const ust = MAP_2.branchCoverage[0]!;
    const alt = MAP_2.branchCoverage[1]!;
    const ikisiniDeGoren = ust.filter(
      (c, i) => c.coveredPx > 0 && (alt[i]?.coveredPx ?? 0) > 0,
    );
    // Yalnız ortak gövde/kuyruk noktaları ikisini de görüyor (0,1,8,9).
    expect(ikisiniDeGoren).toHaveLength(4);
  });

  it('coverage ELLE YAZILMADI — measureCoverage ile aynı', () => {
    for (const m of MAPS) {
      const yeniden = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
      expect(m.coverage).toEqual(yeniden);
    }
  });
});

describe('Uçan hattı — M4-T06 kriteri (≥ %40 nokta)', () => {
  it('üç harita da kriteri geçiyor', () => {
    for (const m of MAPS) {
      const kesen = measureCoverage(m.flyerPaths, m.buildSpots, COVERAGE_REFERENCE_RANGE).filter(
        (c) => c.coveredPx > 0,
      );
      const oran = kesen.length / m.buildSpots.length;
      expect(oran, `${m.id}: %${(oran * 100).toFixed(0)}`).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('her girişin bir uçan hattı var — harita 3’te iki giriş, iki hat', () => {
    expect(MAP_2.flyerPaths).toHaveLength(1);
    expect(MAP_3.flyerPaths).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------
// M8-T05 — Harita 5 "Kadim Harabe"
// ---------------------------------------------------------------------

describe('Harita 5 - M8-T05', () => {
  it('sayilar OLCULDU, uydurulmadi (M8-T05-SONUC)', () => {
    expect(MAP_5.id).toBe('kadim-harabe');
    expect(MAP_5.buildSpots).toHaveLength(15);
    expect(MAP_5.paths).toHaveLength(2); // iki giris, erken birlesme
    // Altın doyumu 4,8'de düzleşiyor (tahta 6440'ta sabit), yani altın
    // artık bağlayıcı kısıt değil; çarpan **can kaybı taramasından** geldi:
    // 6,0→12 · 6,4→11 · 6,6→11 · **6,8→16** · 7,0→18 · 7,2→20.
    // 6,8 seçildi: harita 4'ün 13'ünün üstünde, 20 sınırının %20 altında ve
    // dalga profili tek bir uçurum içermiyor ([0,2,1,1,0,1,0,2,4,2]).
    // S87 → S91.
    expect(MAP_5.hpMultiplier).toBe(7.0);
    expect(MAP_5.goldMultiplier).toBe(10.0);
    expect(MAP_5.startGold).toBe(2800);
  });

  it('iki kol da BIRLESIYOR - ortak govde gercekten ortak', () => {
    const a = MAP_5.paths[0]!;
    const b = MAP_5.paths[1]!;
    expect(a.slice(a.length - 6)).toEqual(b.slice(b.length - 6));
    expect(a[0]).not.toEqual(b[0]);
  });

  it('ortak govde UZUN - harita 3ten farki bu', () => {
    // Harita 3'te birlesme kalenin dibindeydi (ortak kuyruk tek segment).
    // Burada govde yolun yarisindan fazlasi; tasarimin tamami buna dayaniyor.
    const a = MAP_5.paths[0]!;
    expect(pathLength(a.slice(a.length - 6))).toBeGreaterThan(pathLength(a) * 0.5);
  });

  it('ucan hattini goren nokta orani >= %40', () => {
    const goren = spotsCoveringFlyerPaths(
      MAP_5.flyerPaths,
      MAP_5.buildSpots,
      COVERAGE_REFERENCE_RANGE,
    );
    expect(goren / MAP_5.buildSpots.length).toBeGreaterThanOrEqual(0.4);
  });

  it('yapi noktasi HICBIR kolun ustunde degil', () => {
    for (const yol of MAP_5.paths) {
      for (const spot of MAP_5.buildSpots) {
        let enYakinKare = Infinity;
        for (let i = 0; i < yol.length - 1; i++) {
          const a = yol[i]!;
          const b = yol[i + 1]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const uzKare = dx * dx + dy * dy;
          const t =
            uzKare === 0
              ? 0
              : Math.max(0, Math.min(1, ((spot.x - a.x) * dx + (spot.y - a.y) * dy) / uzKare));
          const px = a.x + t * dx - spot.x;
          const py = a.y + t * dy - spot.y;
          enYakinKare = Math.min(enYakinKare, px * px + py * py);
        }
        expect(Math.sqrt(enYakinKare), `${spot.x},${spot.y}`).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

// ---------------------------------------------------------------------
// HUD çakışması — M8-T05'te ortaya çıktı
// ---------------------------------------------------------------------

/**
 * HUD'un **kalıcı** kutuları. Canlı ölçüldü (`Hud` sahnesindeki
 * `Container.getBounds()`), tahmin değil.
 *
 * Geçici olanlar (erken-başlat rozeti, dalga telgrafı) bilerek dışarıda:
 * onlar yalnız hazırlık sayacı boyunca duruyor ve bir yapı noktasını
 * kalıcı olarak gizlemiyorlar.
 */
const KALICI_HUD = [
  { ad: 'kartuş', x0: 8, y0: 16, x1: 224, y1: 156 },
  // `M8-B01`: ayar düğmesi harita 3'ün sağ girişinin (y=120) üstündeydi.
  // İkisi **ayrı** kutu, çünkü aradaki boşluktan o yol geçiyor — tek
  // kutuda birleştirilirse aşağıdaki yol testi kendi çözümünü kusur sanar.
  { ad: 'hız', x0: 1204, y0: 20, x1: 1260, y1: 76 },
  { ad: 'ayar', x0: 1204, y0: 152, x1: 1260, y1: 208 },
  // Zorluk rozeti yalnız Kolay/Zor'da çiziliyor ama çizildiğinde bütün
  // oyun boyunca duruyor — kalıcı sayılır. `M8-B01`'de sağ kenardan üst
  // şeride alındı; sağ kenarda üç cebin üçü de düğmelerle doluydu.
  { ad: 'zorluk rozeti', x0: 1086, y0: 25, x1: 1154, y1: 59 },
  { ad: 'yetenek', x0: 28, y0: 622, x1: 170, y1: 707 },
  // `M8-T12` tam ekran düğmesi. İlk yerleşimi sağ kenarın **ortasıydı**
  // ve harita 2'nin kalesinin (1220, 360) tam üstüne düşüyordu; aşağıdaki
  // "kale HUD altında kalmıyor" testi o hatayı bir daha bırakmıyor.
  // `M8-B01` onu ölçülmüş en geniş boşluğa aldı (alt şerit, 45 px pay);
  // kutu etiketi de kapsıyor, çünkü etiket de haritayı örtüyor.
  { ad: 'tam ekran', x0: 848, y0: 636, x1: 928, y1: 714 },
];

/** Yapı noktası dairesinin yarıçapı (`MapRenderer` SPOT_RADIUS). */
const NOKTA_YARICAPI = 28;
/** Kale işaretinin yarı ölçüsü (`MapRenderer` kale karesi). */
const KALE_YARICAPI = 26;

function carpisma(
  nokta: { x: number; y: number },
  kutu: { x0: number; y0: number; x1: number; y1: number },
  pay: number,
): boolean {
  return (
    nokta.x > kutu.x0 - pay &&
    nokta.x < kutu.x1 + pay &&
    nokta.y > kutu.y0 - pay &&
    nokta.y < kutu.y1 + pay
  );
}

/**
 * Bir yol parçasının (doğru parçası) bir HUD kutusuna en kısa uzaklığı.
 *
 * Yollar çoğunlukla eksen hizalı ama harita 4-5'te köşegen parçalar da
 * var; o yüzden nokta-nokta değil, **parça-dikdörtgen** ölçülüyor.
 * Parçayı 64 adıma bölüp her adımın kutuya uzaklığının en küçüğünü
 * alıyor — 1280 px'lik en uzun parçada bile adım 20 px, aranan eşik
 * (24) bunun üstünde.
 */
function parcaKutuMesafesi(
  a: { x: number; y: number },
  b: { x: number; y: number },
  kutu: { x0: number; y0: number; x1: number; y1: number },
): number {
  let enKucuk = Infinity;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const dx = Math.max(kutu.x0 - x, 0, x - kutu.x1);
    const dy = Math.max(kutu.y0 - y, 0, y - kutu.y1);
    enKucuk = Math.min(enKucuk, Math.hypot(dx, dy));
  }
  return enKucuk;
}

describe('yapı noktası HUD’un altında kalmıyor', () => {
  /**
   * `M8-T04` harita 4'e `(190, 65)` noktasını koydu ve o nokta altın/can
   * kartuşunun **tam altındaydı**: oyuncu ne görebiliyordu ne de rahat
   * tıklayabiliyordu. Kapsama, bütçe, Kısıt A/B testlerinin hiçbiri HUD'u
   * bilmiyor, o yüzden hepsi yeşil geçti — hata yalnız canlı ekran
   * görüntüsünde göründü. Bu test o boşluğu kapatıyor.
   */
  it('hiçbir haritada kalıcı HUD kutusuyla çakışan nokta yok', () => {
    for (const m of MAPS) {
      for (const s of m.buildSpots) {
        for (const b of KALICI_HUD) {
          expect(carpisma(s, b, NOKTA_YARICAPI), `${m.id} (${s.x},${s.y}) ${b.ad} altinda`).toBe(
            false,
          );
        }
      }
    }
  });

  /**
   * **`M8-B01` — YOL da düğmenin altından geçmemeli.**
   *
   * Yapı noktası ve kale testleri tek tek *noktaları* koruyor; asıl kusur
   * ikisi de değildi. Harita 3'ün sağ girişi `y = 120`'de başlıyor ve yol
   * şeridi 48 px (`MapRenderer.PATH_WIDTH`) — düşman ekrana girdiği anda
   * ayar düğmesinin (`y = 116`, kutu 88-144) **arkasından** yürüyordu.
   * Canlı ekran görüntüsünde görüldü, 865 testin hiçbiri göremedi.
   *
   * Bu test yalnız **sağdaki ve alttaki** kutuları kapsıyor. Soldaki
   * kartuş harita 1/3/4'ün giriş yolunun ilk pikselleriyle köşede
   * kesişiyor ve bu **bilerek kabul edildi** (gerekçe `HudScene`'in
   * `AYAR_BTN_Y` yorumunda); listeye alınsaydı test bir kusuru değil bir
   * kararı kırardı.
   */
  it('sağdaki ve alttaki HUD kutularının altından hiçbir yol geçmiyor', () => {
    const KAPSANAN = KALICI_HUD.filter((b) => b.x0 > 640);
    const YARI_SERIT = 24; // PATH_WIDTH / 2

    expect(KAPSANAN.map((b) => b.ad)).toEqual([
      'hız',
      'ayar',
      'zorluk rozeti',
      'tam ekran',
    ]);

    for (const m of MAPS) {
      for (const yol of [...m.paths, ...m.flyerPaths]) {
        for (let i = 0; i < yol.length - 1; i++) {
          const a = yol[i];
          const c = yol[i + 1];
          if (a === undefined || c === undefined) continue;
          for (const b of KAPSANAN) {
            expect(
              parcaKutuMesafesi(a, c, b) < YARI_SERIT,
              `${m.id}: (${a.x},${a.y})→(${c.x},${c.y}) ${b.ad} altindan geciyor`,
            ).toBe(false);
          }
        }
      }
    }
  });

  /**
   * **Kale de gizlenmemeli.** Düşmanın vardığı yer, oyuncunun bakması
   * gereken tek nokta. `M8-T12`'nin tam ekran düğmesi ilk yerleşiminde
   * harita 2'nin kalesini **tam olarak** kapatıyordu (kale 1220,360 —
   * düğme 1232,360) ve bunu ancak canlı ekran görüntüsü gösterdi.
   */
  it('hiçbir haritanın KALESİ kalıcı HUD kutusunun altında değil', () => {
    for (const m of MAPS) {
      for (const b of KALICI_HUD) {
        expect(
          carpisma(m.castle, b, KALE_YARICAPI),
          `${m.id} kale (${m.castle.x},${m.castle.y}) ${b.ad} altinda`,
        ).toBe(false);
      }
    }
  });
});

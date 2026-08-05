import { describe, it, expect } from 'vitest';
import {
  buildReferenceBoards,
  ceilingA,
  cumulativeGold,
  effectiveDps,
  effectiveHp,
  spotsFullAtWave,
  ceilingAPerBranch,
  ceilingAWeakestBranch,
} from './balanceChecks';
import { MAP_1, MAP_2, MAP_3 } from '../data/maps';
import { MAP1_WAVES } from '../data/waves';
import { ENEMIES, GOBLIN, ORK_SAVASCI } from '../data/enemies';
import { BUYU, OKCU, TOP } from '../data/towers';
import { BALANCE } from '../data/balance';
import { measureCoverage } from '../util/coverage';
import type { ReferenceBoard } from '../types/board';

const KAPSAMA_150 = measureCoverage(MAP_1.paths, MAP_1.buildSpots, 150);
const cov = (range: number) => measureCoverage(MAP_1.paths, MAP_1.buildSpots, range);
const BOARDS = buildReferenceBoards(MAP_1, MAP1_WAVES, KAPSAMA_150);
const GERCEKCI = buildReferenceBoards(MAP_1, MAP1_WAVES, KAPSAMA_150, true);

describe('effectiveDps — zırh/direnç uygulanmış', () => {
  it('Okçu T1 goblin\'e (zırhsız) tam DPS', () => {
    expect(effectiveDps(OKCU, 0, GOBLIN)).toBeCloseTo(6 * 1.1, 10);
  });

  it('Okçu T1 Ork Savaşçı\'ya (zırh 2) düşük DPS', () => {
    // (6 − 2) × 1.1 = 4.4, ham 6.6 değil.
    expect(effectiveDps(OKCU, 0, ORK_SAVASCI)).toBeCloseTo(4.4, 10);
  });

  it('Top uçana vuramıyor → DPS 0', () => {
    const harpi = { ...GOBLIN, flying: true };
    expect(effectiveDps(TOP, 0, harpi)).toBe(0);
    expect(effectiveDps(OKCU, 0, harpi)).toBeGreaterThan(0);
  });
});

describe('Kısıt A — GAME-DESIGN §6', () => {
  const son = BOARDS[BOARDS.length - 1]!;

  it('boss DIŞINDAKİ sekiz düşman %15 payla geçiyor', () => {
    for (const e of ENEMIES) {
      if (e.id === 'ogreSef' || e.id === 'orumcekYavrusu') continue;
      const tavan = ceilingA(son, cov, e, MAP_1);
      const hp = effectiveHp(e, MAP_1);
      expect(tavan, `${e.id}`).toBeGreaterThan(hp * BALANCE.safetyMargin);
    }
  });

  it('DENGE BULGUSU: boss tam sınırda — %15 payı yalnız erken başlatmayla tutuyor', () => {
    // §5'in ⚠️ notu M1'de kalkmıştı: research/01'in **hepsi T2** referans
    // tahtasıyla boss tavanın %78,7'siydi. M4'te tahta gerçekten türetilince
    // ortaya çıktı ki o tahtaya ulaşmak erken başlatma bonusunu gerektiriyor:
    //
    //   muhafazakâr tahta (bonus yok, 4 T2)  → tavan 761, boss %92,0 → pay TUTMUYOR
    //   gerçekçi tahta   (bonus var,  7 T2)  → tavan 818, boss %85,6 → pay tutuyor
    //
    // Sebep: Büyü ailesi M4'te girdi ve T1 maliyeti 100 (Okçu 70). Noktaları
    // doldurmak pahalılaştı, yükseltmeye daha az kaldı.
    //
    // Boss **öldürülebilir** (tavan > HP) ama tasarım bandının (%75-85)
    // 0,6 puan üstünde. `OPEN-QUESTIONS.md` S36.
    const bossDef = ENEMIES.find((e) => e.id === 'ogreSef')!;
    const hp = effectiveHp(bossDef, MAP_1);

    const muhafazakar = ceilingA(son, cov, bossDef, MAP_1);
    const gercekci = ceilingA(GERCEKCI[GERCEKCI.length - 1]!, cov, bossDef, MAP_1);

    // İkisinde de öldürülebilir.
    expect(muhafazakar).toBeGreaterThan(hp);
    expect(gercekci).toBeGreaterThan(hp);

    // Ama %15 payı yalnız gerçekçi tahta karşılıyor.
    expect(muhafazakar).toBeLessThan(hp * BALANCE.safetyMargin);
    expect(gercekci).toBeGreaterThan(hp * BALANCE.safetyMargin);
  });

  it('Büyü zırhlı düşmanların cevabı — Okçu\'dan belirgin üstün', () => {
    // §4.3'ün varlık sebebi. Zırhlı Ork zırh 8: Okçu T1 (6) tabana düşüyor.
    const zirhli = ENEMIES.find((e) => e.id === 'zirhliOrk')!;
    expect(effectiveDps(BUYU, 0, zirhli)).toBeGreaterThan(
      effectiveDps(OKCU, 0, zirhli) * 5,
    );
  });

  it('tavan kule YERLEŞİMİNDEN bağımsız — research/01 §2', () => {
    // "Bitmedi sayılır eğer: ceilingA kule yerleşimine göre farklı sonuç
    // veriyorsa — formül yanlış demektir."
    //
    // Aynı kuleleri farklı noktalara koy: kapsama toplamı aynı kaldığı
    // sürece tavan da aynı kalmalı. Bunu kurgulamak için tüm noktaları
    // dolduruyoruz — permütasyon toplamı değiştirmiyor.
    const hepsi: ReferenceBoard = {
      waveIndex: 1,
      towers: MAP_1.buildSpots.map((_, i) => ({ spotIndex: i, towerId: 'okcu' as const, tier: 0 as const })),
      cumulativeCost: 0,
    };
    const tersi: ReferenceBoard = {
      ...hepsi,
      towers: [...hepsi.towers].reverse(),
    };
    expect(ceilingA(tersi, cov, GOBLIN, MAP_1)).toBeCloseTo(
      ceilingA(hepsi, cov, GOBLIN, MAP_1),
      9,
    );
  });

  it('kapsaması sıfır olan tahta için tavan 0', () => {
    const olu: ReferenceBoard = {
      waveIndex: 1,
      towers: [{ spotIndex: 999, towerId: 'okcu', tier: 0 }], // olmayan nokta
      cumulativeCost: 0,
    };
    expect(ceilingA(olu, cov, GOBLIN, MAP_1)).toBe(0);
  });

  it('boş tahta için tavan 0', () => {
    const bos: ReferenceBoard = { waveIndex: 1, towers: [], cumulativeCost: 0 };
    expect(ceilingA(bos, cov, GOBLIN, MAP_1)).toBe(0);
  });

  it('hızlı düşmanın tavanı daha düşük — menzilde az kalıyor', () => {
    const kurt = ENEMIES.find((e) => e.id === 'kurtBinicisi')!;
    expect(ceilingA(son, cov, kurt, MAP_1)).toBeLessThan(ceilingA(son, cov, GOBLIN, MAP_1));
  });

  it('daha çok kule → daha yüksek tavan', () => {
    const az: ReferenceBoard = { waveIndex: 1, towers: BOARDS[0]!.towers, cumulativeCost: 0 };
    expect(ceilingA(son, cov, GOBLIN, MAP_1)).toBeGreaterThan(ceilingA(az, cov, GOBLIN, MAP_1));
  });
});

describe('referenceBoards — TÜRETİLİYOR, elle yazılmıyor', () => {
  it('her dalga için bir tahta', () => {
    expect(BOARDS).toHaveLength(MAP1_WAVES.length);
    BOARDS.forEach((b, i) => expect(b.waveIndex).toBe(i + 1));
  });

  it('tahta maliyeti o dalgaya kadarki geliri AŞMIYOR', () => {
    for (const b of BOARDS) {
      const gelir = cumulativeGold(MAP_1, MAP1_WAVES, b.waveIndex - 1);
      expect(b.cumulativeCost, `dalga ${b.waveIndex}`).toBeLessThanOrEqual(gelir);
    }
  });

  it('dalga N\'in tahtası N−1\'inkini KAPSIYOR — kule kaybolmuyor', () => {
    for (let i = 1; i < BOARDS.length; i++) {
      const onceki = BOARDS[i - 1]!;
      const simdi = BOARDS[i]!;
      for (const k of onceki.towers) {
        expect(
          simdi.towers.some((x) => x.spotIndex === k.spotIndex),
          `dalga ${simdi.waveIndex}: nokta ${k.spotIndex} kayboldu`,
        ).toBe(true);
      }
      expect(simdi.towers.length).toBeGreaterThanOrEqual(onceki.towers.length);
      expect(simdi.cumulativeCost).toBeGreaterThanOrEqual(onceki.cumulativeCost);
    }
  });

  it('hiçbir tahta 8 yapı noktasını aşmıyor', () => {
    for (const b of BOARDS) {
      expect(b.towers.length).toBeLessThanOrEqual(MAP_1.buildSpots.length);
      const noktalar = new Set(b.towers.map((t) => t.spotIndex));
      expect(noktalar.size, `dalga ${b.waveIndex} aynı noktada iki kule`).toBe(b.towers.length);
    }
  });

  it('kapsaması yüksek noktalar ÖNCE doluyor', () => {
    const ilk = BOARDS[0]!.towers.map((t) => t.spotIndex);
    const enIyi = [...KAPSAMA_150].sort((a, b) => b.coveredPx - a.coveredPx)[0]!.spotIndex;
    expect(ilk).toContain(enIyi);
  });

  it('dalga 10\'da en az bir Tier 2 var', () => {
    const son = BOARDS[BOARDS.length - 1]!;
    expect(son.towers.some((t) => t.tier === 1)).toBe(true);
  });

  it('yükseltme ancak 8 nokta dolduktan SONRA başlıyor (§6)', () => {
    // §6: "yükseltme yer kıtlığı yüzünden mantıklıdır, verimlilik yüzünden
    // değil". Makul oyuncu önce noktaları doldurur.
    const doluDalga = spotsFullAtWave(BOARDS, MAP_1.buildSpots.length);
    for (const b of BOARDS) {
      if (b.waveIndex >= doluDalga) continue;
      expect(b.towers.every((t) => t.tier === 0), `dalga ${b.waveIndex}`).toBe(true);
    }
  });
});

describe('Ekonomi karşılanabilirliği — M3-T10', () => {
  it('her dalgada tahta karşılanabiliyor', () => {
    for (const b of BOARDS) {
      expect(cumulativeGold(MAP_1, MAP1_WAVES, b.waveIndex)).toBeGreaterThanOrEqual(
        b.cumulativeCost,
      );
    }
  });

  it('gelir monoton artıyor', () => {
    for (let n = 1; n <= 10; n++) {
      expect(cumulativeGold(MAP_1, MAP1_WAVES, n)).toBeGreaterThan(
        cumulativeGold(MAP_1, MAP1_WAVES, n - 1),
      );
    }
  });

  it('erken başlatma bonusu geliri artırıyor ve dalga 4\'ten önce etkisiz', () => {
    for (const n of [1, 2, 3]) {
      expect(cumulativeGold(MAP_1, MAP1_WAVES, n, true)).toBe(
        cumulativeGold(MAP_1, MAP1_WAVES, n, false),
      );
    }
    expect(cumulativeGold(MAP_1, MAP1_WAVES, 10, true)).toBeGreaterThan(
      cumulativeGold(MAP_1, MAP1_WAVES, 10, false),
    );
  });

  it('DENGE BULGUSU: 8 nokta dalga 6\'da doluyor, §6 "4-5" diyor', () => {
    // Bu bir test başarısızlığı değil, **ölçüm**. §6: "8 yapı noktası
    // dalga 4-5'te dolmalı ki oyuncunun yükseltmekten başka seçeneği
    // kalmasın."
    //
    // Ölçülen: karışık tahta (4 Okçu + 4 Top = 720 altın) dalga 6 başında
    // karşılanabiliyor (gelir 727). En ucuz tahta (8 Okçu = 560) dalga 5'te
    // (gelir 603) doluyor — yani §6'nın hedefi yalnız "hep Okçu" oynayan
    // oyuncu için tutuyor.
    //
    // Sebep M4'te kapanıyor: harita 1 kadrosu şu an 3 düşman (Goblin 3,
    // Ork 6, Kurt 9 altın). Harpi (9) ve Ogre Şef (60) M4'te giriyor.
    // `OPEN-QUESTIONS.md` S34'e yazıldı; M4'te yeniden ölçülecek.
    const doluDalga = spotsFullAtWave(BOARDS, MAP_1.buildSpots.length);
    expect(doluDalga).toBe(7);
  });

  it('DENGE BULGUSU: toplam gelir 1614, §6 "~1850" diyor', () => {
    // %13 düşük. Aynı sebep: eksik kadro. M4'te yeniden ölçülecek (S34).
    const toplam = cumulativeGold(MAP_1, MAP1_WAVES, 10);
    expect(toplam).toBe(1602);
    expect(toplam).toBeLessThan(1850);
  });
});

// ---------------------------------------------------------------------
// M7-T03 — Ayrık yolda Kısıt A kol başına
// ---------------------------------------------------------------------

describe('M7-T03 — Kısıt A ayrık yolda KOL BAŞINA (§9 uyarısı)', () => {
  /** Harita 2'nin üst kolunu gören noktalara Okçu T2 koyan tahta. */
  const ustKolTahtasi: ReferenceBoard = {
    waveIndex: 10,
    cumulativeCost: 0,
    // 2, 3, 4 üst kolun noktaları (bkz. maps.ts yorumları).
    towers: [2, 3, 4].map((spotIndex) => ({ spotIndex, towerId: 'okcu' as const, tier: 1 as const })),
  };

  it('iki kol AYRI hesaplanıyor ve farklı çıkıyor', () => {
    const [ust, alt] = ceilingAPerBranch(ustKolTahtasi, GOBLIN, MAP_2);
    expect(ust).toBeGreaterThan(0);
    expect(alt).toBe(0); // alt kolu gören kule yok
    expect(ust).not.toBe(alt);
  });

  it('bir kola hiç kule yoksa o kolun tavanı 0 — savunmasız', () => {
    expect(ceilingAPerBranch(ustKolTahtasi, GOBLIN, MAP_2)[1]).toBe(0);
  });

  it('**toplam DPS yanıltıcı**: toplam tavan en zayıf koldan BÜYÜK', () => {
    // §9'un uyarısının sayısal kanıtı. Toplam hesap, gerçekte var olmayan
    // bir savunmayı vaat ediyor.
    const toplam = ceilingA(
      ustKolTahtasi,
      (r) => measureCoverage(MAP_2.paths, MAP_2.buildSpots, r),
      GOBLIN,
      MAP_2,
    );
    const enZayif = ceilingAWeakestBranch(ustKolTahtasi, GOBLIN, MAP_2);
    expect(toplam).toBeGreaterThan(enZayif);
    expect(enZayif).toBe(0);
  });

  it('en zayıf kol belirleyici — ortalama DEĞİL', () => {
    const kollar = ceilingAPerBranch(ustKolTahtasi, GOBLIN, MAP_2);
    const ortalama = kollar.reduce((a, b) => a + b, 0) / kollar.length;
    expect(ceilingAWeakestBranch(ustKolTahtasi, GOBLIN, MAP_2)).toBeLessThan(ortalama);
  });

  it('iki kolu da savunan tahtada iki tavan da pozitif', () => {
    const dengeli: ReferenceBoard = {
      waveIndex: 10,
      cumulativeCost: 0,
      towers: [2, 3, 5, 6].map((spotIndex) => ({
        spotIndex,
        towerId: 'okcu' as const,
        tier: 1 as const,
      })),
    };
    const kollar = ceilingAPerBranch(dengeli, GOBLIN, MAP_2);
    for (const k of kollar) expect(k).toBeGreaterThan(0);
  });

  it('tek yollu haritada kol hesabı toplamla AYNI', () => {
    const tahta: ReferenceBoard = {
      waveIndex: 10,
      cumulativeCost: 0,
      towers: [{ spotIndex: 3, towerId: 'okcu', tier: 1 }],
    };
    const kol = ceilingAPerBranch(tahta, GOBLIN, MAP_1);
    expect(kol).toHaveLength(1);
    expect(kol[0]).toBeCloseTo(
      ceilingA(tahta, (r) => measureCoverage(MAP_1.paths, MAP_1.buildSpots, r), GOBLIN, MAP_1),
      6,
    );
  });

  it('harita 3’ün iki girişi de ayrı hesaplanıyor', () => {
    const solTahta: ReferenceBoard = {
      waveIndex: 10,
      cumulativeCost: 0,
      towers: [0, 1, 2].map((spotIndex) => ({
        spotIndex,
        towerId: 'okcu' as const,
        tier: 1 as const,
      })),
    };
    const [sol, sag] = ceilingAPerBranch(solTahta, GOBLIN, MAP_3);
    expect(sol).toBeGreaterThan(0);
    expect(sag).toBe(0); // sağ giriş savunmasız
  });
});

/**
 * **Yetenek yükseltmesi — S117'nin gider kalemi** (`M99`).
 *
 * S117 ölçtü: geç haritalarda gelirin yarısından fazlası harcanmadan
 * kalıyor, yani ekonomi 6-7. dalgadan sonra kısıt olmaktan çıkıyor.
 * `M79` fiyat çarpanını denedi ve ölçüm yalnız harita 4'ü geçirdi
 * (5-6'da her `k` bir sağlamayı kırıyor). Kalan kol buydu: **paranın
 * gideceği yeni bir yer**.
 *
 * Buradaki testler iki şeyi bağlıyor: fiyat eğrisinin gelirle aynı
 * ölçekte büyüdüğünü, ve gider kaleminin atıl altını gerçekten
 * **emdiğini**. Gerekçe ve ölçüm tablosu `data/abilities.ts` başlığında.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { AbilitySystem } from './AbilitySystem';
import {
  METEOR_HASAR,
  TAKVIYE_ASKER,
  YETENEK_SEVIYE_SAYISI,
  YETENEK_YUKSELTME_TABANI,
  meteorHasari,
  takviyeAskerSayisi,
  yetenekYukseltmeFiyati,
} from '../data/abilities';
import { MAPS, MAP_1, MAP_6, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { buildReferenceBoards, cumulativeGold } from './balanceChecks';
import { measureCoverage } from '../util/coverage';
import { REFERANS_ERKEN_BONUSU } from './referansOlcum';
import { GOBLIN } from '../data/enemies';
import type { BlockableEnemy, SoldierState } from '../types/barracks';
import type { EnemyDef } from '../types/enemy';
import type { MapDef } from '../types/map';

function dusman(def: EnemyDef, x = 0, y = 0): BlockableEnemy {
  return { x, y, hp: 9999, maxHp: 9999, alive: true, def, blockedBy: null, shieldLeft: 0 };
}

function bosAsker(): SoldierState {
  return {
    x: 0,
    y: 0,
    hp: 0,
    maxHp: 0,
    dps: 0,
    engagedWith: null,
    home: { x: 0, y: 0 },
    rally: { x: 0, y: 0 },
    state: 'dead',
    respawnLeft: 0,
    shield: 0,
    evasion: 0,
    lifetimeLeft: Number.POSITIVE_INFINITY,
    speed: 0,
    alive: false,
    flipX: false,
  };
}

/** Haritanın dalga 10 tahtasından sonra elde kalan altın. */
function atilAltin(m: MapDef): number {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const son = buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU)[9]!;
  return cumulativeGold(m, w, 10, REFERANS_ERKEN_BONUSU) - son.cumulativeCost;
}

/**
 * **Oyun sürerken** elde kalan en çok altın (dalga 1-9).
 *
 * Toplam atıl altından farklı ve önemli olan bu: tur bittiğinde elde
 * kalan para bir karar değil, bir artık. Gider kaleminin bir şey ifade
 * etmesi için **oyun sürerken** alınabilir olması gerekiyor.
 */
function kosarkenEnCokAtil(m: MapDef): number {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const t = buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU);
  let enCok = 0;
  for (let i = 0; i < 9; i++) {
    const elde = cumulativeGold(m, w, i, REFERANS_ERKEN_BONUSU) - t[i]!.cumulativeCost;
    if (elde > enCok) enCok = elde;
  }
  return enCok;
}

/** İki yeteneği de azami seviyeye çıkarmanın toplam bedeli. */
function gideriToplami(m: MapDef): number {
  let toplam = 0;
  for (let s = 1; s < YETENEK_SEVIYE_SAYISI; s++) {
    const f = yetenekYukseltmeFiyati(s, m);
    if (f !== null) toplam += 2 * f;
  }
  return toplam;
}

describe('yetenek yükseltmesi — fiyat', () => {
  it('fiyat haritanın ALTIN çarpanını izliyor (S72 ile aynı gerekçe)', () => {
    for (const m of MAPS) {
      for (let s = 1; s < YETENEK_SEVIYE_SAYISI; s++) {
        expect(yetenekYukseltmeFiyati(s, m), `${m.id} L${s + 1}`).toBe(
          Math.round(YETENEK_YUKSELTME_TABANI[s - 1]! * m.goldMultiplier),
        );
      }
    }
  });

  it('azami seviyede yükseltme YOK — fiyat null', () => {
    expect(yetenekYukseltmeFiyati(YETENEK_SEVIYE_SAYISI, MAP_6)).toBeNull();
    expect(yetenekYukseltmeFiyati(99, MAP_6)).toBeNull();
  });

  /**
   * Eğrinin asıl iddiası: **erken haritada alınamıyor, geç haritada atıl
   * altını emiyor.** Ölçülen atıl altın `data/abilities.ts` tablosunda.
   */
  it('öğretici haritada gider kalemi OYUN SÜRERKEN erişilemez', () => {
    // Harita 1'de koşarken elde kalan en çok altın 94; ilk yükseltme 180.
    // Yani ekonomi orada sonuna kadar kısıt ve gider kalemi hiç görünmüyor.
    expect(yetenekYukseltmeFiyati(1, MAP_1)!).toBeGreaterThan(kosarkenEnCokAtil(MAP_1));
    expect(gideriToplami(MAP_1)).toBeGreaterThan(atilAltin(MAP_1));
  });

  it('geç haritalarda OYUN SÜRERKEN alınabiliyor — asıl iddia', () => {
    // Kar Geçidi, Kadim Harabe, Sisli Bataklık: koşarken biriken altın
    // ilk yükseltmeyi **kat kat** geçiyor, yani karar 6-7. dalgada masada.
    for (const m of MAPS.slice(3)) {
      expect(kosarkenEnCokAtil(m), m.id).toBeGreaterThan(yetenekYukseltmeFiyati(1, m)!);
    }
  });

  it('son haritada gider kalemi atıl altının ÇOĞUNU emiyor', () => {
    const atil = atilAltin(MAP_6);
    const gider = gideriToplami(MAP_6);
    expect(gider / atil, `gider ${gider} / atıl ${Math.round(atil)}`).toBeGreaterThan(0.8);
    // Ama hepsini değil: tamamını almak hâlâ mümkün olmalı, yoksa
    // "paranın gideceği yer" bir duvara dönerdi.
    expect(gider).toBeLessThan(atil);
  });

  it('gider kalemi harita zorlaştıkça BÜYÜYOR — gelirle aynı yönde', () => {
    const giderler = MAPS.map((m) => gideriToplami(m));
    for (let i = 1; i < giderler.length; i++) {
      expect(giderler[i]!, `${MAPS[i]!.id}`).toBeGreaterThanOrEqual(giderler[i - 1]!);
    }
  });
});

describe('yetenek yükseltmesi — etki', () => {
  it('seviye tabloları üç kademeli ve artan', () => {
    expect(METEOR_HASAR).toHaveLength(YETENEK_SEVIYE_SAYISI);
    expect(TAKVIYE_ASKER).toHaveLength(YETENEK_SEVIYE_SAYISI);
    for (let i = 1; i < YETENEK_SEVIYE_SAYISI; i++) {
      expect(METEOR_HASAR[i]!).toBeGreaterThan(METEOR_HASAR[i - 1]!);
      expect(TAKVIYE_ASKER[i]!).toBeGreaterThan(TAKVIYE_ASKER[i - 1]!);
    }
    // L1 = §8'in belgelenmiş değerleri; yükseltme onları DEĞİŞTİRMİYOR.
    expect(meteorHasari(1)).toBe(180);
    expect(takviyeAskerSayisi(1)).toBe(2);
  });

  it('Meteor yükseltilince daha çok hasar veriyor', () => {
    const olc = (seviye: number): number => {
      const s = new AbilitySystem();
      for (let i = 1; i < seviye; i++) s.yukselt('meteor');
      const e = dusman(GOBLIN);
      return s.castMeteor({ x: 0, y: 0 }, [e])?.totalDamage ?? 0;
    };
    expect(olc(1)).toBe(meteorHasari(1));
    expect(olc(2)).toBe(meteorHasari(2));
    expect(olc(3)).toBe(meteorHasari(3));
  });

  it('Takviye yükseltilince daha çok asker çağırıyor', () => {
    const olc = (seviye: number): number => {
      const s = new AbilitySystem();
      for (let i = 1; i < seviye; i++) s.yukselt('takviye');
      const havuz = [bosAsker(), bosAsker(), bosAsker(), bosAsker(), bosAsker()];
      let i = 0;
      return s.castReinforcements({ x: 0, y: 0 }, () => havuz[i++] ?? null)?.length ?? 0;
    };
    expect(olc(1)).toBe(takviyeAskerSayisi(1));
    expect(olc(2)).toBe(takviyeAskerSayisi(2));
    expect(olc(3)).toBe(takviyeAskerSayisi(3));
  });

  it('azami seviyenin üstüne çıkmıyor', () => {
    const s = new AbilitySystem();
    for (let i = 0; i < 10; i++) s.yukselt('meteor');
    expect(s.seviye('meteor')).toBe(YETENEK_SEVIYE_SAYISI);
    expect(s.azamiSeviyede('meteor')).toBe(true);
    expect(s.yukselt('meteor')).toBe(false);
  });

  /**
   * S49'un bekleme kuralıyla aynı gerekçe: yükseltme o haritanın
   * altınıyla alınıyor, sonraki haritaya taşınmıyor.
   */
  it('reset seviyeleri 1e döndürüyor — harita sınırı', () => {
    const s = new AbilitySystem();
    s.yukselt('meteor');
    s.yukselt('takviye');
    s.reset();
    expect(s.seviye('meteor')).toBe(1);
    expect(s.seviye('takviye')).toBe(1);
  });

  it('bozuk kayıt bedava seviye VERMİYOR', () => {
    const s = new AbilitySystem();
    s.turdanGeriYukleSeviye({ meteor: 99, takviye: 0, yokBoyleYetenek: 3 });
    expect(s.seviye('meteor')).toBe(1);
    expect(s.seviye('takviye')).toBe(1);
    s.turdanGeriYukleSeviye({ meteor: 2 });
    expect(s.seviye('meteor')).toBe(2);
    expect(s.seviyeKaydi()).toEqual({ meteor: 2, takviye: 1 });
  });
});

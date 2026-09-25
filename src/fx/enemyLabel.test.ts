import { describe, expect, it } from 'vitest';
import { enemyName, enemySummary, YETENEK_ANAHTARI } from './enemyLabel';
import {
  ENEMIES,
  GOBLIN,
  ZIRHLI_ORK,
  SAMAN,
  TROL,
  ORUMCEK_ANA,
  HARPI,
  TUNELCI,
  getEnemyForMap,
} from '../data/enemies';
import { MAPS, MAP_1, MAP_5, MAP_6 } from '../data/maps';
import { t } from '../util/i18n';
import type { EnemyDef } from '../types/enemy';

describe('enemyLabel — M8-T02 telgraf bilgisi', () => {
  it('her düşmanın adı var ve anahtar sızmıyor', () => {
    for (const e of ENEMIES) {
      const ad = enemyName(e.id);
      expect(ad, e.id).not.toBe('');
      // `t()` bulamadığı anahtarı kendisi döndürüyor — o sızıntı olurdu.
      expect(ad.startsWith('enemy'), e.id).toBe(false);
    }
  });

  it('sıfır savunma YAZILMIYOR — goblin yalnız ad', () => {
    expect(enemySummary(GOBLIN)).toBe('Goblin');
  });

  it('zırh yazılıyor', () => {
    expect(enemySummary(ZIRHLI_ORK)).toContain(`zırh ${ZIRHLI_ORK.armor}`);
  });

  it('büyü direnci yüzdeye çevriliyor', () => {
    expect(enemySummary(SAMAN)).toContain(`%${Math.round(SAMAN.magicResist * 100)}`);
  });

  it('uçan işaretleniyor', () => {
    expect(enemySummary(HARPI)).toContain('uçar');
  });

  it('yetenekler yazılıyor — karşı-oyun kararını değiştiren tek şey', () => {
    expect(enemySummary(TROL)).toContain('yenilenir');
    expect(enemySummary(ORUMCEK_ANA)).toContain('bölünür');
  });
});

/**
 * **Boss'un verb'ü telgrafta görünüyor** — `M13`/`M15`.
 *
 * `M13` boss'a çağırma ekledi ve telgraf onu söylemiyordu; harita 5'in
 * ikinci evresi de `M10`'dan beri sessizdi. Oyuncu karşı-oyun kararını
 * yetenekten veriyor, o yüzden dalga **gelmeden** okunmalı.
 */
describe('boss yetenekleri telgrafta yazılı (M15)', () => {
  it('harita 6 bossu "yandaş çağırır" diyor', () => {
    const boss = getEnemyForMap('ogreSef', MAP_6)!;
    expect(enemySummary(boss)).toContain('yandaş çağırır');
  });

  it('harita 5 bossu "yarısında hızlanır" diyor', () => {
    const boss = getEnemyForMap('ogreSef', MAP_5)!;
    expect(enemySummary(boss)).toContain('yarısında hızlanır');
  });

  it('düz boss yetenek satırı taşımıyor', () => {
    const boss = getEnemyForMap('ogreSef', MAP_1)!;
    expect(enemySummary(boss)).not.toContain('çağırır');
    expect(enemySummary(boss)).not.toContain('hızlanır');
  });

  it('Tünelci "yeraltından geçer" diyor', () => {
    expect(enemySummary(TUNELCI)).toContain('yeraltından geçer');
  });
});

/**
 * **Her yetenek oyuncuya SÖYLENİYOR — türetilerek sağlanıyor (`M156`).**
 *
 * Yukarıdaki testler yetenekleri **tek tek** sayıyor: Trol yenilenir,
 * Örümcek Ana bölünür, harita 6 bossu çağırır… Elle sayılan liste,
 * sayılan şey büyüdükçe sessizce yalan söylüyor (CLAUDE.md TIER 2) —
 * `M140`'ta susturma eklendiğinde bu blok da bir tur gecikti.
 *
 * Buradaki sağlama **veriden türüyor**: `YETENEK_ANAHTARI`'ın anahtar
 * kümesi `EnemyAbility['kind']` birleşimi olduğu için derleyici onu
 * eksiksiz tutuyor, bu test de her anahtarın gerçekten **oyuncuya ulaşan
 * bir cümleye** döndüğünü tutuyor. Yeni bir verb eklendiğinde ikisinden
 * biri mutlaka kırılır.
 */
describe('yetenek etiketleri — türetilmiş sağlama (M156)', () => {
  /** Kampanyadaki her düşman, haritaya özgü varyantlarıyla birlikte. */
  const tumVaryantlar = MAPS.flatMap((m) =>
    ENEMIES.map((e) => getEnemyForMap(e.id, m)).filter((e): e is EnemyDef => e !== undefined),
  );
  const turler = Object.keys(YETENEK_ANAHTARI) as (keyof typeof YETENEK_ANAHTARI)[];

  it('her yetenek türü kampanyada GERÇEKTEN kullanılıyor — ölü tür yok', () => {
    for (const tur of turler) {
      expect(
        tumVaryantlar.some((e) => e.ability?.kind === tur),
        `${tur} hiçbir düşmanda yok`,
      ).toBe(true);
    }
  });

  it('her yetenek türü telgrafta YAZILIYOR', () => {
    for (const tur of turler) {
      const tasiyan = tumVaryantlar.find((e) => e.ability?.kind === tur);
      expect(enemySummary(tasiyan!), `${tur} etiketi`).toContain(t(YETENEK_ANAHTARI[tur]));
    }
  });

  it('etiketler iki dilde de dolu ve BİRBİRİNDEN AYRI', () => {
    for (const dil of ['tr', 'en'] as const) {
      const metinler = turler.map((tur) => t(YETENEK_ANAHTARI[tur], dil));
      for (const [i, m] of metinler.entries()) {
        expect(m.trim().length, `${dil}/${turler[i]} boş`).toBeGreaterThan(0);
      }
      expect(new Set(metinler).size, `${dil}: ${metinler.join(' · ')}`).toBe(turler.length);
    }
  });
});

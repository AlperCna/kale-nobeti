/**
 * Boss türetmesinin regresyon bandı — `research/01` §12.
 *
 * §12 uyarıyor: HP `0,80 × tavan` olarak tanımlanınca Kısıt A boss için
 * **tautoloji** olur (`tavan > 0,92 × tavan` her zaman doğru). Onun yerine
 * iki gerçek sağlama var: **karşılanabilirlik** ve **bu bant**.
 */
import { describe, expect, it } from 'vitest';
import {
  BOSS_ARMOR_BY_MAP,
  BOSS_HP_BY_MAP,
  BOSS_HP_TOLERANCE,
  bossFor,
} from './bossScaling';
import { MAP_1, MAP_2, MAP_3, MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { MAP1_WAVES, MAP2_WAVES, MAP3_WAVES } from './waves';
import { OGRE_SEF, getEnemyForMap } from './enemies';
import {
  BOSS_CEILING_RATIO,
  bossAffordable,
  buildReferenceBoards,
  ceilingAPerBranch,
  cumulativeGold,
  effectiveHp,
} from '../systems/balanceChecks';
import { measureCoverage } from '../util/coverage';

const H = [
  { map: MAP_1, waves: MAP1_WAVES },
  { map: MAP_2, waves: MAP2_WAVES },
  { map: MAP_3, waves: MAP3_WAVES },
];

const tahta = (m: (typeof H)[number]) => {
  const k = measureCoverage(m.map.paths, m.map.buildSpots, COVERAGE_REFERENCE_RANGE);
  return buildReferenceBoards(m.map, m.waves, k, false)[9]!;
};

describe('Boss ölçeklemesi — zırh düşer, HP türetilir', () => {
  it('harita 1’in belgelenmiş 700’ü DEĞİŞMEDİ — §5', () => {
    expect(BOSS_HP_BY_MAP['degirmen-gecidi']).toBe(700);
    expect(BOSS_ARMOR_BY_MAP['degirmen-gecidi']).toBe(OGRE_SEF.armor);
  });

  it('zırh haritayla DÜŞÜYOR: 10 → 5 → 2', () => {
    // Harita 3'ün zırhı 3'ten 2'ye indi: referans tahta artık kışla satın
    // alıyor (§5 Trol) ve kışla bir kule noktasını işgal ediyor, tavan
    // düşüyor. Regresyon bandı testi bunu yakaladı.
    expect(BOSS_ARMOR_BY_MAP['tas-kopru']).toBe(5);
    expect(BOSS_ARMOR_BY_MAP['kul-ovasi']).toBe(2);
  });

  it('**boss HP’si MONOTON ARTIYOR** — zorluk eğrisi korunuyor', () => {
    const hp = MAPS.map((m) => BOSS_HP_BY_MAP[m.id]!);
    for (let i = 1; i < hp.length; i++) expect(hp[i]!).toBeGreaterThan(hp[i - 1]!);
  });

  it('regresyon bandı: yazılı HP hâlâ 0,80 × tavan (±%6)', () => {
    // §12'nin tautoloji-olmayan sağlaması. Ekonomi veya geometri sessizce
    // değişirse burası kırılır ve insan bakar.
    for (const m of H) {
      if (m.map.id === 'degirmen-gecidi') continue; // 700 elle sabit (S65)
      const boss = bossFor(m.map);
      const tavan = Math.min(...ceilingAPerBranch(tahta(m), boss, m.map));
      const beklenen = BOSS_CEILING_RATIO * tavan;
      const yazili = BOSS_HP_BY_MAP[m.map.id]!;
      expect(Math.abs(yazili - beklenen) / beklenen, `${m.map.id}`).toBeLessThanOrEqual(
        BOSS_HP_TOLERANCE,
      );
    }
  });

  it('boss tasarım bandında (%75-85) — harita 2 ve 3', () => {
    for (const m of H) {
      if (m.map.id === 'degirmen-gecidi') continue;
      const boss = bossFor(m.map);
      const tavan = Math.min(...ceilingAPerBranch(tahta(m), boss, m.map));
      const oran = (effectiveHp(boss, m.map) / tavan) * 100;
      expect(oran, `${m.map.id}: %${oran.toFixed(1)}`).toBeGreaterThanOrEqual(75);
      expect(oran, `${m.map.id}: %${oran.toFixed(1)}`).toBeLessThanOrEqual(85);
    }
  });

  it('karşılanabilirlik — türetmenin dayandığı asıl varsayım (§12)', () => {
    for (const m of H) expect(bossAffordable(m.map, m.waves, tahta(m)), m.map.id).toBe(true);
  });

  it('doğum yolu türetilmiş bossu veriyor — çarpan iki kez uygulanmıyor', () => {
    for (const m of H) {
      const def = getEnemyForMap('ogreSef', m.map)!;
      expect(def.hp * m.map.hpMultiplier).toBeCloseTo(BOSS_HP_BY_MAP[m.map.id]!, 6);
      expect(def.armor).toBe(BOSS_ARMOR_BY_MAP[m.map.id]);
    }
  });

  it('boss dışındaki düşmanlar DEĞİŞMEDİ', () => {
    for (const m of H) {
      for (const id of m.map.enemyRoster) {
        if (id === 'ogreSef') continue;
        expect(getEnemyForMap(id, m.map)).toEqual(
          MAPS.length > 0 ? getEnemyForMap(id, MAP_1) : undefined,
        );
      }
    }
  });

  it('700 × çarpan olsaydı GEÇİLEMEZDİ — düzeltmenin kanıtı', () => {
    for (const m of H) {
      if (m.map.id === 'degirmen-gecidi') continue;
      const eski = { ...OGRE_SEF };
      const tavan = Math.min(...ceilingAPerBranch(tahta(m), eski, m.map));
      const oran = (eski.hp * m.map.hpMultiplier) / tavan;
      expect(oran, `${m.map.id} eski oran`).toBeGreaterThan(1.5);
    }
  });

  it('gelir çarpanla ölçekleniyor — S70', () => {
    const g1 = cumulativeGold(MAP_1, MAP1_WAVES, 10, false);
    const g2 = cumulativeGold(MAP_2, MAP2_WAVES, 10, false);
    const g3 = cumulativeGold(MAP_3, MAP3_WAVES, 10, false);
    expect(g2 / g1).toBeGreaterThan(1.4);
    expect(g3 / g1).toBeGreaterThan(2.2);
  });
});

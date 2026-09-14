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
import { MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { MAP1_WAVES, MAP2_WAVES, MAP3_WAVES, MAP4_WAVES, MAP5_WAVES } from './waves';
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
  { map: MAP_4, waves: MAP4_WAVES },
  { map: MAP_5, waves: MAP5_WAVES },
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

  it('zırh haritayla DÜŞÜYOR: 10 → 5 → 2 → 2', () => {
    // Harita 3'ün zırhı 3'ten 2'ye indi: referans tahta artık kışla satın
    // alıyor (§5 Trol) ve kışla bir kule noktasını işgal ediyor, tavan
    // düşüyor. Regresyon bandı testi bunu yakaladı.
    //
    // Harita 4 de 2'de kaldı — `M8-T04` zırh taraması (0-5) tavanı yalnız
    // %12 oynattı (2441 → 2141), yani zırh burada artık bağlayıcı kısıt
    // değil; asıl zorluk HP çarpanında. Zırhı 3'e çıkarmak tavanı düşürüp
    // türetilen HP'yi de düşüreceği için net etkisi ≈ 0 olurdu.
    expect(BOSS_ARMOR_BY_MAP['tas-kopru']).toBe(5);
    expect(BOSS_ARMOR_BY_MAP['kul-ovasi']).toBe(2);
    expect(BOSS_ARMOR_BY_MAP['kar-gecidi']).toBe(2);
    expect(BOSS_ARMOR_BY_MAP['kadim-harabe']).toBe(2);
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

  it('boss tasarım bandında (%75-85) — harita 2’den itibaren', () => {
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

  /**
   * Bu testin işi boss ölçeklemesinin **diğer düşmanlara sızmadığını**
   * doğrulamak. `M10-T03` haritaya göre tek bir bilinçli varyant ekledi
   * (harita 4'ün kalkanlı Ork Savaşçı'sı), o yüzden iddia gevşetilmedi
   * **daraltıldı**: bilinen varyant adıyla ayrı tutuluyor, geri kalan
   * her düşman hâlâ birebir aynı olmak zorunda.
   */
  const BILINEN_VARYANTLAR = new Set(['kar-gecidi/orkSavasci']);

  it('boss dışındaki düşmanlar DEĞİŞMEDİ (bilinen varyantlar hariç)', () => {
    for (const m of H) {
      for (const id of m.map.enemyRoster) {
        if (id === 'ogreSef') continue;
        if (BILINEN_VARYANTLAR.has(`${m.map.id}/${id}`)) continue;
        expect(getEnemyForMap(id, m.map), `${m.map.id}/${id}`).toEqual(getEnemyForMap(id, MAP_1));
      }
    }
  });

  it('bilinen varyant YALNIZ kalkan alanında ayrışıyor', () => {
    const harita4 = H.find((m) => m.map.id === 'kar-gecidi');
    expect(harita4, 'harita 4 bulunamadı').toBeDefined();
    const varyant = getEnemyForMap('orkSavasci', harita4!.map)!;
    const temel = getEnemyForMap('orkSavasci', MAP_1)!;
    expect(varyant.shield).toBeGreaterThan(0);
    // Kalkan dışında TEK bir alan bile farklı olmamalı.
    const { shield: _atilan, ...kalkansiz } = varyant;
    expect(kalkansiz).toEqual(temel);
  });

  it('700 × çarpan olsaydı GEÇİLEMEZDİ — düzeltmenin kanıtı', () => {
    // Savunulan iddia: naif `700 × hpMultiplier` boss HP'sini tavanın
    // **üstüne** koyuyor, yani dalga 10 hiç geçilemiyor. Eşik bu yüzden
    // 1,0 — eskiden 1,5 yazıyordu ve o sayının bir gerekçesi yoktu,
    // yalnızca harita 2-3'ün ölçülen değeriydi.
    //
    // Ölçülen oranlar: harita 2 ≈ 2,6 · harita 3 ≈ 1,9 · harita 4 ≈ 1,29.
    // Harita 4'te düşük olmasının sebebi: 12 nokta + tek kol, yani tavan
    // yüksek; çarpan 3,4 ile birlikte naif HP 2380, tavan 1841. Hâlâ
    // geçilemez ama daha az dramatik — kanıt yine de duruyor.
    for (const m of H) {
      if (m.map.id === 'degirmen-gecidi') continue;
      const eski = { ...OGRE_SEF };
      const tavan = Math.min(...ceilingAPerBranch(tahta(m), eski, m.map));
      const oran = (eski.hp * m.map.hpMultiplier) / tavan;
      expect(oran, `${m.map.id} eski oran ${oran.toFixed(2)}`).toBeGreaterThan(1.0);
    }
  });

  it('gelir çarpanla ölçekleniyor — S70', () => {
    const g1 = cumulativeGold(MAP_1, MAP1_WAVES, 10, false);
    const g2 = cumulativeGold(MAP_2, MAP2_WAVES, 10, false);
    const g3 = cumulativeGold(MAP_3, MAP3_WAVES, 10, false);
    const g4 = cumulativeGold(MAP_4, MAP4_WAVES, 10, false);
    expect(g2 / g1).toBeGreaterThan(1.4);
    expect(g3 / g1).toBeGreaterThan(2.2);
    expect(g4).toBeGreaterThan(g3);
    expect(cumulativeGold(MAP_5, MAP5_WAVES, 10, false)).toBeGreaterThan(g4);
  });
});

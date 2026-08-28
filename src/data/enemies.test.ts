import { describe, expect, it } from 'vitest';
import { ENEMIES, GOBLIN, SAMAN, ORUMCEK_ANA, ORUMCEK_YAVRUSU, TROL, getEnemy } from './enemies';

/**
 * `Y08` — `enemies.ts` testsizdi. Amaç kapsam yüzdesi değil, **karar
 * taşıyan sayıların izlenebilirliği** (`docs/plan/iyilestirme/Y08-test-kapsami.md`
 * §4): `docs/plan/OPEN-QUESTIONS.md`'deki S37/S38'in "varsayılanla
 * geçildi" kararları burada kilitli — sayı değişirse bu test hangi
 * soruyu yeniden açtığını söylüyor. S39 (Trol yenilenmesi harita
 * çarpanıyla ölçeklenmiyor) zaten `EnemyAbilitySystem.test.ts`'te test
 * ediliyor — burada TEKRAR edilmiyor, yalnız işaret ediliyor.
 */

describe('S37 — Şaman iyileştirme yarıçapı (§5 yalnız "8 HP/sn" veriyor)', () => {
  it('yarıçap 90 px, hız 8 HP/sn — enemies.ts’in kararı', () => {
    expect(SAMAN.ability).toEqual({ kind: 'heal', hps: 8, radius: 90 });
  });

  it('büyü direnci %40 — §5', () => {
    expect(SAMAN.magicResist).toBe(0.4);
  });
});

describe('S38 — Örümcek yavrusu: §5’te yalnız HP/hız var, gerisi sıfır', () => {
  it('HP 30, hız 90 — §5’in verdiği tek iki sayı', () => {
    expect(ORUMCEK_YAVRUSU.hp).toBe(30);
    expect(ORUMCEK_YAVRUSU.speed).toBe(90);
  });

  it('zırh/direnç/altın/puan sıfır — uydurulmadı, bilinçli sıfır', () => {
    expect(ORUMCEK_YAVRUSU.armor).toBe(0);
    expect(ORUMCEK_YAVRUSU.magicResist).toBe(0);
    // Altın 0: yavrudan altın gelseydi §5'in "altın = 3 × puan" oranı
    // (ORUMCEK_ANA: gold 18 = 3 × points 6) bozulurdu.
    expect(ORUMCEK_YAVRUSU.gold).toBe(0);
    // Puan 0: dalga bütçesine girmiyor — anne zaten 6 puan taşıyor.
    expect(ORUMCEK_YAVRUSU.points).toBe(0);
  });

  it('anne §5’in "altın = 3 × puan" oranını sağlıyor — yavrunun 0 olma gerekçesi', () => {
    expect(ORUMCEK_ANA.gold).toBe(3 * ORUMCEK_ANA.points);
  });

  it('ölünce 3 yavru doğuruyor', () => {
    expect(ORUMCEK_ANA.ability).toEqual({ kind: 'split', count: 3, childId: 'orumcekYavrusu' });
  });
});

describe('S39 — Trol yenilenmesi (bkz. EnemyAbilitySystem.test.ts, burada tekrar edilmiyor)', () => {
  it('yenilenme hızı veri katmanında 6 HP/sn — ölçeklenmeme mantığı EnemyAbilitySystem’de', () => {
    expect(TROL.ability).toEqual({ kind: 'regen', hps: 6 });
  });
});

describe('ENEMIES — liste bütünlüğü', () => {
  it('dokuz düşman + örümcek yavrusu (kadroda sayılmaz)', () => {
    expect(ENEMIES).toHaveLength(10);
    expect(ENEMIES).toContain(ORUMCEK_YAVRUSU);
  });

  it('her id benzersiz', () => {
    const idler = ENEMIES.map((e) => e.id);
    expect(new Set(idler).size).toBe(idler.length);
  });

  it('getEnemy id ile çözüyor, olmayan id undefined', () => {
    expect(getEnemy('goblin')).toBe(GOBLIN);
    // @ts-expect-error — kasıtlı: olmayan bir id ile çağrı
    expect(getEnemy('yok')).toBeUndefined();
  });

  it('uçmayanların hepsi leakDamage ≥ 1 taşıyor — sızma cezasız düşman olamaz', () => {
    for (const e of ENEMIES) {
      expect(e.leakDamage).toBeGreaterThanOrEqual(1);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { applyDamage, kalkandanGecir, yavaslatmaSinerjisi, DAMAGE_FLOOR_RATIO } from './combat';
import { OKCU, TOP } from '../data/towers';
import { BALANCE } from '../data/balance';
import { GOBLIN, ORK_SAVASCI, getEnemy, getEnemyForMap } from '../data/enemies';

/** Zırhsız, dirençsiz. */
const CIPLAK = { armor: 0, magicResist: 0 };
/** Ogre Şef savunmaları (`GAME-DESIGN.md` §5). Düşman verisi M4'te gelecek. */
const BOSS = { armor: 10, magicResist: 0.25 };

describe('applyDamage — fiziksel', () => {
  it('zırh 0 → tam hasar', () => {
    expect(applyDamage(6, 'physical', CIPLAK)).toEqual({ dealt: 6, floored: false });
  });

  it('Okçu T1 (6) vs Ork Savaşçı (zırh 2) → 4', () => {
    // Zırh kavramını tanıtan senaryo (§5). Gerçek veriyle, kurguyla değil.
    const r = applyDamage(OKCU.tiers[0].damage, OKCU.damageType, ORK_SAVASCI);
    expect(r).toEqual({ dealt: 4, floored: false });
  });

  it('Top T1 (22) vs Goblin (zırh 0) → 22', () => {
    const r = applyDamage(TOP.tiers[0].damage, TOP.damageType, GOBLIN);
    expect(r).toEqual({ dealt: 22, floored: false });
  });

  it('Okçu T2 (10) vs boss zırh 10 → 1.5, tabana düştü', () => {
    // §3'ün "okçu boss'a tekrar tekrar 1 yazıyor" örneği.
    const r = applyDamage(OKCU.tiers[1].damage, 'physical', BOSS);
    expect(r.dealt).toBeCloseTo(1.5, 10);
    expect(r.floored).toBe(true);
  });

  it('zırh hasardan büyük → dmg × 0.15, floored', () => {
    const r = applyDamage(6, 'physical', { armor: 99, magicResist: 0 });
    expect(r.dealt).toBeCloseTo(0.9, 10);
    expect(r.floored).toBe(true);
  });

  it('zırh tam hasara eşit → yine taban (0 değil)', () => {
    // Duvar yok kuralı: hiçbir vuruş tamamen emilmez.
    const r = applyDamage(6, 'physical', { armor: 6, magicResist: 0 });
    expect(r.dealt).toBeCloseTo(0.9, 10);
    expect(r.floored).toBe(true);
    expect(r.dealt).toBeGreaterThan(0);
  });

  it('tabanın hemen üstü floored DEĞİL', () => {
    // dmg 10, zırh 8 → 2 > 1.5. Sınır davranışı.
    const r = applyDamage(10, 'physical', { armor: 8, magicResist: 0 });
    expect(r.dealt).toBe(2);
    expect(r.floored).toBe(false);
  });

  it('fiziksel hasar büyü direncini GÖRMEZ', () => {
    const r = applyDamage(10, 'physical', { armor: 0, magicResist: 0.9 });
    expect(r).toEqual({ dealt: 10, floored: false });
  });
});

describe('applyDamage — büyü', () => {
  it('direnç 0 → tam hasar', () => {
    expect(applyDamage(20, 'magic', CIPLAK)).toEqual({ dealt: 20, floored: false });
  });

  it('direnç 0.40 → %60', () => {
    const r = applyDamage(20, 'magic', { armor: 0, magicResist: 0.4 });
    expect(r.dealt).toBeCloseTo(12, 10);
    expect(r.floored).toBe(false);
  });

  it('boss direnci 0.25 → %75', () => {
    const r = applyDamage(24, 'magic', BOSS);
    expect(r.dealt).toBeCloseTo(18, 10);
    expect(r.floored).toBe(false);
  });

  it('büyü hasarı zırhı GÖRMEZ', () => {
    const r = applyDamage(20, 'magic', { armor: 100, magicResist: 0 });
    expect(r).toEqual({ dealt: 20, floored: false });
  });

  it('direnç %85 ALTINDA taban hiç devreye girmiyor', () => {
    // §3 notu: büyüde out = dmg × (1−mr); taban dmg × 0.15.
    // out < taban ⟺ mr > 0.85. Bu, görevin "bitmedi sayılır" maddesi.
    for (const mr of [0, 0.25, 0.4, 0.6, 0.8, 0.84]) {
      const r = applyDamage(20, 'magic', { armor: 0, magicResist: mr });
      expect(r.floored, `mr=${mr}`).toBe(false);
    }
  });

  it('direnç %85 ÜSTÜNDE taban devreye giriyor', () => {
    for (const mr of [0.86, 0.95, 1]) {
      const r = applyDamage(20, 'magic', { armor: 0, magicResist: mr });
      expect(r.floored, `mr=${mr}`).toBe(true);
      expect(r.dealt).toBeCloseTo(20 * DAMAGE_FLOOR_RATIO, 10);
    }
  });

  it('direnç tam %85 sınırında taban devreye girmiyor', () => {
    const r = applyDamage(20, 'magic', { armor: 0, magicResist: 0.85 });
    expect(r.dealt).toBeCloseTo(3, 10);
    expect(r.floored).toBe(false); // out === taban, küçük değil
  });
});

describe('applyDamage — gerçek hasar', () => {
  it('zırh ve direnç hiç etkilemiyor', () => {
    expect(applyDamage(180, 'true', BOSS)).toEqual({ dealt: 180, floored: false });
    expect(applyDamage(180, 'true', { armor: 999, magicResist: 1 })).toEqual({
      dealt: 180,
      floored: false,
    });
  });
});

describe('applyDamage — sınır durumları', () => {
  it('hasar 0 → 0 ve floored DEĞİL', () => {
    // Emilecek bir şey yok; kalkan ikonu çıkarmak yanıltıcı olurdu.
    expect(applyDamage(0, 'physical', BOSS)).toEqual({ dealt: 0, floored: false });
    expect(applyDamage(0, 'magic', BOSS)).toEqual({ dealt: 0, floored: false });
  });

  it('negatif hasar → 0', () => {
    expect(applyDamage(-5, 'physical', CIPLAK)).toEqual({ dealt: 0, floored: false });
  });

  it('sonuç asla negatif değil', () => {
    for (const armor of [0, 1, 5, 50, 1000]) {
      expect(applyDamage(6, 'physical', { armor, magicResist: 0 }).dealt).toBeGreaterThan(0);
    }
  });

  it('saf — aynı girdi hep aynı çıktı, yan etki yok', () => {
    const e = { armor: 2, magicResist: 0 };
    const a = applyDamage(6, 'physical', e);
    const b = applyDamage(6, 'physical', e);
    expect(a).toEqual(b);
    expect(e).toEqual({ armor: 2, magicResist: 0 });
  });
});

/**
 * `M10-T03` — buz kalkanı. Harita 4'ün yeni mekaniği.
 *
 * Kalkan **candan önce** eriyor ve `applyDamage`'dan AYRI bir adım:
 * zırh/direnç vuruşun gerçek gücünü belirliyor, kalkan onu emiyor. Ters
 * sıra olsaydı kalkan zırhın işini de görürdü ve iki savunma çarpışırdı.
 */
describe('kalkandanGecir — buz kalkanı', () => {
  it('kalkan hasarı tamamen emiyorsa cana hiçbir şey geçmiyor', () => {
    const e = { shieldLeft: 25 };
    expect(kalkandanGecir(10, e)).toBe(0);
    expect(e.shieldLeft).toBe(15);
  });

  it('kalkan bitince ARTAN hasar cana geçiyor — aynı vuruşta', () => {
    const e = { shieldLeft: 25 };
    expect(kalkandanGecir(40, e)).toBe(15);
    expect(e.shieldLeft).toBe(0);
  });

  it('kalkan yoksa hasar olduğu gibi geçiyor', () => {
    const e = { shieldLeft: 0 };
    expect(kalkandanGecir(12, e)).toBe(12);
    expect(e.shieldLeft).toBe(0);
  });

  it('tam kalkan kadar vuruş kalkanı bitiriyor, can sağlam', () => {
    const e = { shieldLeft: 25 };
    expect(kalkandanGecir(25, e)).toBe(0);
    expect(e.shieldLeft).toBe(0);
  });

  /**
   * Toplam bir havuz: çok sayıda küçük vuruş da tek büyük vuruş da
   * kalkanı aynı hızda eritiyor. Zırhtan farkı bu — zırh her vuruştan
   * ayrı ayrı düşüyor, yani küçük vuruşları cezalandırıyor.
   */
  it('çok sayıda küçük vuruş tek büyük vuruşla AYNI toplamı emiyor', () => {
    const a = { shieldLeft: 25 };
    let canaGecen = 0;
    for (let i = 0; i < 8; i++) canaGecen += kalkandanGecir(5, a);
    const b = { shieldLeft: 25 };
    expect(canaGecen).toBe(kalkandanGecir(40, b));
  });

  it('sıfır ya da negatif hasar kalkanı yemiyor', () => {
    const e = { shieldLeft: 25 };
    expect(kalkandanGecir(0, e)).toBe(0);
    expect(kalkandanGecir(-5, e)).toBe(-5);
    expect(e.shieldLeft).toBe(25);
  });
});

/**
 * Kalkan **yalnız harita 4'te** ve **yalnız Ork Savaşçı'da**. Sızması
 * diğer haritaların ölçülmüş dengesini sessizce bozardı.
 */
describe('getEnemyForMap — kalkan kapsamı', () => {
  const harita = (id: string) => ({ id, hpMultiplier: 1 });

  it('harita 4’ün Ork Savaşçı’sında kalkan var', () => {
    expect(getEnemyForMap('orkSavasci', harita('kar-gecidi'))?.shield).toBeGreaterThan(0);
  });

  it('diğer haritaların Ork Savaşçı’sında kalkan YOK', () => {
    for (const id of ['degirmen-gecidi', 'tas-kopru', 'kul-ovasi', 'kadim-harabe']) {
      expect(getEnemyForMap('orkSavasci', harita(id))?.shield, id).toBeUndefined();
    }
  });

  it('harita 4’ün diğer düşmanlarında kalkan yok', () => {
    for (const id of ['goblin', 'zirhliOrk', 'trol', 'harpi'] as const) {
      expect(getEnemyForMap(id, harita('kar-gecidi'))?.shield, id).toBeUndefined();
    }
  });

  it('temel tanım DEĞİŞMİYOR — varyant kopya üzerinden', () => {
    getEnemyForMap('orkSavasci', harita('kar-gecidi'));
    expect(getEnemy('orkSavasci')?.shield).toBeUndefined();
  });
});

/**
 * **Kule sinerjisi** — `M10-T05`. GameAnalytics'in en iyi TD'leri ayıran
 * dört kaldıracından dördüncüsü; ilk üçü (dalga arası planlama, seçim
 * çeşitliliği, kaynak kısıtı) bu oyunda zaten vardı.
 */
describe('yavaslatmaSinerjisi — yavaşlatılmış düşman fiziksele açık', () => {
  const YAVAS = { effects: { slowSeconds: 1.4 } };
  const NORMAL = { effects: { slowSeconds: 0 } };

  it('yavaşlatılmış düşmana fiziksel hasar artıyor', () => {
    expect(yavaslatmaSinerjisi('physical', YAVAS)).toBe(BALANCE.yavaslatmaFizikselBonus);
  });

  it('yavaşlatılmamış düşmana çarpan yok', () => {
    expect(yavaslatmaSinerjisi('physical', NORMAL)).toBe(1);
  });

  /**
   * Büyü zaten zırhı yok sayıyor (§3). İkisini birden güçlendirmek
   * "her kule her kuleyle iyi" demek olurdu ve sinerjinin amacı
   * **seçim** üretmek.
   */
  it('BÜYÜ hasarına dokunmuyor — sinerji seçim üretmeli', () => {
    expect(yavaslatmaSinerjisi('magic', YAVAS)).toBe(1);
  });

  it('gerçek hasara (yetenekler) dokunmuyor', () => {
    expect(yavaslatmaSinerjisi('true', YAVAS)).toBe(1);
  });

  /**
   * Çarpan **ham hasara**, zırhtan önce. Zırhtan sonra uygulansaydı
   * zırhlı/zırhsız farkını büyütür ve sinerji "zırh delen" bir şeye
   * dönüşürdü — Büyü ailesinin işine girerdi.
   */
  it('çarpan zırhtan ÖNCE — zırhın etkisi korunuyor', () => {
    const zirhli = { armor: 4, magicResist: 0 };
    const carpan = yavaslatmaSinerjisi('physical', YAVAS);
    const sinerjili = applyDamage(10 * carpan, 'physical', zirhli).dealt;
    const duz = applyDamage(10, 'physical', zirhli).dealt;
    // Zırh her iki durumda da aynı miktarı emiyor (4), yani fark ham
    // hasarın farkı kadar: 12,5 − 4 = 8,5 ve 10 − 4 = 6.
    expect(sinerjili).toBeCloseTo(10 * carpan - 4, 6);
    expect(duz).toBeCloseTo(6, 6);
  });
});

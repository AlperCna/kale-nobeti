import { describe, expect, it } from 'vitest';
import { SaveSystem, starsFor, STAR_THRESHOLDS } from './SaveSystem';
import { Settings } from './Settings';
import { MemoryStore, LocalStore, SAVE_KEY } from '../util/storage';
import { MAPS } from '../data/maps';

const ID = MAPS.map((m) => m.id);
const azaltma = () => ({ matches: false });

describe('starsFor — GAME-DESIGN §9 eşikleri', () => {
  it('20 can → ★★★, 15-19 → ★★, ≤14 → ★', () => {
    expect(starsFor(20)).toBe(3);
    expect(starsFor(19)).toBe(2);
    expect(starsFor(15)).toBe(2);
    expect(starsFor(14)).toBe(1);
    expect(starsFor(1)).toBe(1);
  });

  it('eşikler sabitlerle tutarlı', () => {
    expect(starsFor(STAR_THRESHOLDS.three)).toBe(3);
    expect(starsFor(STAR_THRESHOLDS.three - 1)).toBe(2);
    expect(starsFor(STAR_THRESHOLDS.two)).toBe(2);
    expect(starsFor(STAR_THRESHOLDS.two - 1)).toBe(1);
  });

  it('kaybedilen oyun 0 yıldız — kazanmadan yıldız yok', () => {
    expect(starsFor(18, false)).toBe(0);
    expect(starsFor(0)).toBe(0);
    expect(starsFor(-5)).toBe(0);
  });

  it('boss sızması tek başına ★★★ı düşürüyor — §9 bilinçli', () => {
    // Boss 10 can götürüyor; 20'den 10'a düşen oyuncu ★ alıyor.
    expect(starsFor(20 - 10)).toBe(1);
  });
});

describe('SaveSystem', () => {
  it('boş kayıtla başlıyor', () => {
    const s = new SaveSystem(new MemoryStore());
    expect(s.totalStars()).toBe(0);
    for (const id of ID) expect(s.starsOf(id)).toBe(0);
  });

  it('sonuç kaydediliyor ve okunuyor', () => {
    const d = new MemoryStore();
    new SaveSystem(d).recordResult(ID[0]!, 20, true);
    expect(new SaveSystem(d).starsOf(ID[0]!)).toBe(3);
  });

  it('**yıldız ASLA düşmüyor** — kötü tekrar kaydı bozmuyor', () => {
    const s = new SaveSystem(new MemoryStore());
    expect(s.recordResult(ID[0]!, 20, true)).toBe(true);
    expect(s.recordResult(ID[0]!, 5, true)).toBe(false);
    expect(s.starsOf(ID[0]!)).toBe(3);
  });

  it('kaybetmek mevcut yıldızı silmiyor', () => {
    const s = new SaveSystem(new MemoryStore());
    s.recordResult(ID[0]!, 18, true);
    s.recordResult(ID[0]!, 0, false);
    expect(s.starsOf(ID[0]!)).toBe(2);
  });

  it('S62 — kilit YALNIZ bitirmeye bağlı, yıldız şartı yok', () => {
    const s = new SaveSystem(new MemoryStore());
    expect(s.isUnlocked(ID, ID[0]!)).toBe(true); // ilk harita hep açık
    expect(s.isUnlocked(ID, ID[1]!)).toBe(false);

    s.recordResult(ID[0]!, 1, true); // tek yıldızla bitirdi
    expect(s.isUnlocked(ID, ID[1]!)).toBe(true); // yine de açılıyor
    expect(s.isUnlocked(ID, ID[2]!)).toBe(false);
  });

  it('toplam yıldız', () => {
    const s = new SaveSystem(new MemoryStore());
    s.recordResult(ID[0]!, 20, true);
    s.recordResult(ID[1]!, 15, true);
    expect(s.totalStars()).toBe(5);
  });

  it('bozuk JSON oyunu çökertmiyor', () => {
    const d = new MemoryStore();
    d.set(SAVE_KEY, '{bozuk');
    expect(() => new SaveSystem(d)).not.toThrow();
    expect(new SaveSystem(d).totalStars()).toBe(0);
  });

  it('bilinmeyen sürüm sıfırdan başlıyor — göç kancası', () => {
    const d = new MemoryStore();
    d.set(SAVE_KEY, JSON.stringify({ progress: { version: 99, stars: { x: 3 } } }));
    expect(new SaveSystem(d).totalStars()).toBe(0);
  });
});

describe('Settings ile AYNI anahtarı paylaşıyor — CLAUDE.md Teknoloji', () => {
  it('SaveSystem yazınca ayarlar KORUNUYOR', () => {
    const d = new MemoryStore();
    new Settings(d, azaltma).set('sound', false);
    new SaveSystem(d).recordResult(ID[0]!, 20, true);

    expect(new Settings(d, azaltma).state.sound).toBe(false);
    expect(new SaveSystem(d).starsOf(ID[0]!)).toBe(3);
  });

  it('Settings yazınca ilerleme KORUNUYOR', () => {
    const d = new MemoryStore();
    new SaveSystem(d).recordResult(ID[0]!, 20, true);
    new Settings(d, azaltma).set('screenShake', false);

    expect(new SaveSystem(d).starsOf(ID[0]!)).toBe(3);
    expect(new Settings(d, azaltma).state.screenShake).toBe(false);
  });

  it('tek anahtar kullanılıyor', () => {
    const d = new MemoryStore();
    new SaveSystem(d).recordResult(ID[0]!, 20, true);
    new Settings(d, azaltma).set('sound', false);
    expect(d.get(SAVE_KEY)).not.toBeNull();
  });
});

describe('TIER 1 kural 10 — gizli sekme', () => {
  it('localStorage fırlatsa bile SaveSystem çökmüyor', () => {
    const asil = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      const d = new LocalStore();
      const s = new SaveSystem(d);
      expect(() => s.recordResult(ID[0]!, 20, true)).not.toThrow();
      // Bellek yedeğinde tutuluyor — oturum içinde çalışıyor.
      expect(s.starsOf(ID[0]!)).toBe(3);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: asil });
    }
  });
});

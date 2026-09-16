import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { SaveSystem, starsFor, STAR_THRESHOLDS, STAR_TWO_RATIO } from './SaveSystem';
import { DIFFICULTY } from '../data/difficulty';
import { Settings } from './Settings';
import { MemoryStore, LocalStore, SAVE_KEY } from '../util/storage';
import { MAPS } from '../data/maps';

const ID = MAPS.map((m) => m.id);
const azaltma = () => ({ matches: false });

describe('starsFor — GAME-DESIGN §9 eşikleri', () => {
  it('20 can → ★★★, 15-19 → ★★, ≤14 → ★', () => {
    expect(starsFor(20, true, BALANCE.startLives)).toBe(3);
    expect(starsFor(19, true, BALANCE.startLives)).toBe(2);
    expect(starsFor(15, true, BALANCE.startLives)).toBe(2);
    expect(starsFor(14, true, BALANCE.startLives)).toBe(1);
    expect(starsFor(1, true, BALANCE.startLives)).toBe(1);
  });

  it('eşikler sabitlerle tutarlı', () => {
    expect(starsFor(STAR_THRESHOLDS.three, true, BALANCE.startLives)).toBe(3);
    expect(starsFor(STAR_THRESHOLDS.three - 1, true, BALANCE.startLives)).toBe(2);
    expect(starsFor(STAR_THRESHOLDS.two, true, BALANCE.startLives)).toBe(2);
    expect(starsFor(STAR_THRESHOLDS.two - 1, true, BALANCE.startLives)).toBe(1);
  });

  it('kaybedilen oyun 0 yıldız — kazanmadan yıldız yok', () => {
    expect(starsFor(18, false, BALANCE.startLives)).toBe(0);
    expect(starsFor(0, true, BALANCE.startLives)).toBe(0);
    expect(starsFor(-5, true, BALANCE.startLives)).toBe(0);
  });

  it('boss sızması tek başına ★★★ı düşürüyor — §9 bilinçli', () => {
    // Boss 10 can götürüyor; 20'den 10'a düşen oyuncu ★ alıyor.
    expect(starsFor(20 - 10, true, BALANCE.startLives)).toBe(1);
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
    new SaveSystem(d).recordResult(ID[0]!, 20, true, BALANCE.startLives);
    expect(new SaveSystem(d).starsOf(ID[0]!)).toBe(3);
  });

  it('**yıldız ASLA düşmüyor** — kötü tekrar kaydı bozmuyor', () => {
    const s = new SaveSystem(new MemoryStore());
    expect(s.recordResult(ID[0]!, 20, true, BALANCE.startLives)).toBe(true);
    expect(s.recordResult(ID[0]!, 5, true, BALANCE.startLives)).toBe(false);
    expect(s.starsOf(ID[0]!)).toBe(3);
  });

  it('kaybetmek mevcut yıldızı silmiyor', () => {
    const s = new SaveSystem(new MemoryStore());
    s.recordResult(ID[0]!, 18, true, BALANCE.startLives);
    s.recordResult(ID[0]!, 0, false, BALANCE.startLives);
    expect(s.starsOf(ID[0]!)).toBe(2);
  });

  it('S62 — kilit YALNIZ bitirmeye bağlı, yıldız şartı yok', () => {
    const s = new SaveSystem(new MemoryStore());
    expect(s.isUnlocked(ID, ID[0]!)).toBe(true); // ilk harita hep açık
    expect(s.isUnlocked(ID, ID[1]!)).toBe(false);

    s.recordResult(ID[0]!, 1, true, BALANCE.startLives); // tek yıldızla bitirdi
    expect(s.isUnlocked(ID, ID[1]!)).toBe(true); // yine de açılıyor
    expect(s.isUnlocked(ID, ID[2]!)).toBe(false);
  });

  it('toplam yıldız', () => {
    const s = new SaveSystem(new MemoryStore());
    s.recordResult(ID[0]!, 20, true, BALANCE.startLives);
    s.recordResult(ID[1]!, 15, true, BALANCE.startLives);
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
    new SaveSystem(d).recordResult(ID[0]!, 20, true, BALANCE.startLives);

    expect(new Settings(d, azaltma).state.sound).toBe(false);
    expect(new SaveSystem(d).starsOf(ID[0]!)).toBe(3);
  });

  it('Settings yazınca ilerleme KORUNUYOR', () => {
    const d = new MemoryStore();
    new SaveSystem(d).recordResult(ID[0]!, 20, true, BALANCE.startLives);
    new Settings(d, azaltma).set('screenShake', false);

    expect(new SaveSystem(d).starsOf(ID[0]!)).toBe(3);
    expect(new Settings(d, azaltma).state.screenShake).toBe(false);
  });

  it('tek anahtar kullanılıyor', () => {
    const d = new MemoryStore();
    new SaveSystem(d).recordResult(ID[0]!, 20, true, BALANCE.startLives);
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
      expect(() => s.recordResult(ID[0]!, 20, true, BALANCE.startLives)).not.toThrow();
      // Bellek yedeğinde tutuluyor — oturum içinde çalışıyor.
      expect(s.starsOf(ID[0]!)).toBe(3);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: asil });
    }
  });
});

/**
 * **`M26` — Zor'da üç yıldız artık mümkün.**
 *
 * Eşikler `M1`'de mutlak yazılmıştı (20 ve 15) çünkü o gün tek bir can
 * sayısı vardı. `M8-T11` zorluk seviyelerini ekledi ve Zor 12 canla
 * başlıyor; iki sistem hiç karşılaştırılmadı. Sonuç: **hiç can
 * kaybetmeden** bitiren Zor oyuncusu bile ★ alıyordu (12 < 15), yani
 * zoru seçmek ilerleme ölçüsünde cezaydı ve `allStars` başarımı
 * yalnız Zor oynayan için imkânsızdı.
 *
 * Düzeltme sayı uydurmadı: oran §9'un kendi eşiklerinden türedi
 * (`15 / 20 = 0,75`). Kural hep "canının dörtte üçünü koru"ydu.
 */
describe('starsFor — başlangıç canına ORANLI (M26)', () => {
  const ZOR = DIFFICULTY.zor.startLives;
  const NORMAL_CAN = DIFFICULTY.normal.startLives;

  it('Zor: kusursuz koşu ★★★ — eskiden ★ veriyordu', () => {
    expect(ZOR).toBe(12); // varsayımın kilidi
    expect(starsFor(ZOR, true, ZOR)).toBe(3);
    // Eski mutlak eşikle aynı koşu:
    expect(ZOR >= STAR_THRESHOLDS.three).toBe(false);
  });

  it('Zor: dörtte üçünü koruyan ★★ (ceil(12 × 0,75) = 9)', () => {
    expect(Math.ceil(ZOR * STAR_TWO_RATIO)).toBe(9);
    expect(starsFor(9, true, ZOR)).toBe(2);
    expect(starsFor(8, true, ZOR)).toBe(1);
  });

  it('Normal DEĞİŞMEDİ — oran 20 cana uygulanınca eski sayılar çıkıyor', () => {
    expect(starsFor(NORMAL_CAN, true, NORMAL_CAN)).toBe(3);
    expect(Math.ceil(NORMAL_CAN * STAR_TWO_RATIO)).toBe(STAR_THRESHOLDS.two);
    expect(starsFor(STAR_THRESHOLDS.two, true, NORMAL_CAN)).toBe(2);
    expect(starsFor(STAR_THRESHOLDS.two - 1, true, NORMAL_CAN)).toBe(1);
  });

  it('her zorlukta kusursuz koşu ★★★ — asıl iddia bu', () => {
    for (const d of Object.values(DIFFICULTY)) {
      expect(starsFor(d.startLives, true, d.startLives), String(d.startLives)).toBe(3);
    }
  });

  it('kaybedilen koşu ve bozuk başlangıç canı 0', () => {
    expect(starsFor(ZOR, false, ZOR)).toBe(0);
    expect(starsFor(5, true, 0)).toBe(0);
  });
});

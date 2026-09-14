import { afterEach, describe, expect, it } from 'vitest';
import {
  Settings,
  DEFAULT_SETTINGS,
  EFFECT_SCALE,
  reducedMotionDefaults,
  prefersReducedMotion,
  detectLocale,
  getSettings,
  SETTINGS_REGISTRY_KEY,
} from './Settings';
import { t, getLocale, setLocale } from '../util/i18n';
import { DEFAULT_LOCALE } from '../data/strings';
import { LocalStore, MemoryStore, SAVE_KEY } from '../util/storage';
import type { KeyValueStore } from '../util/storage';

const azalt = (q: string) => ({ matches: q.includes('reduce') });
const azaltma = () => ({ matches: false });
/**
 * Dil de enjekte ediliyor — `node`'un kendi `navigator.language`'ı
 * **makineye göre** değişiyor (bu makinede `tr-TR`, CI'da büyük ihtimalle
 * `en-US`). Enjekte edilmezse `DEFAULT_SETTINGS` karşılaştırmaları
 * geliştiricinin işletim sistemi diline bağlı olurdu.
 */
const trDil = { language: 'tr-TR' };

describe('Settings — §10 + TIER 1 kural 6', () => {
  it('varsayılanlar: ses açık, sarsıntı açık, efekt tam', () => {
    const s = new Settings(new MemoryStore(), azaltma, trDil);
    expect(s.state).toEqual(DEFAULT_SETTINGS);
    expect(s.effectScale).toBe(1);
  });

  it('sekiz ayar da değiştirilebiliyor (TIER 1 k.6)', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    s.set('sound', false);
    s.set('screenShake', false);
    s.set('effects', 'off');
    s.set('hints', false);
    s.set('locale', 'en');
    s.set('difficulty', 'zor');
    expect(s.state).toEqual({
      sound: false,
      // `M8-T10` — `sound: false` iki kademeyi de sürüklüyor.
      musicLevel: 'off',
      sfxLevel: 'off',
      difficulty: 'zor',
      screenShake: false,
      effects: 'off',
      hints: false,
      locale: 'en',
    });
    expect(s.effectScale).toBe(0);
  });

  it('tercih KAYDEDİLİYOR ve yeniden okunuyor', () => {
    const depo = new MemoryStore();
    new Settings(depo, azaltma).set('screenShake', false);
    expect(new Settings(depo, azaltma).state.screenShake).toBe(false);
  });

  it('S53 — efekt yoğunluğu ÜÇ kademe, döngüsel', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    expect(s.cycleEffects()).toBe('low');
    expect(s.cycleEffects()).toBe('off');
    expect(s.cycleEffects()).toBe('full');
  });

  it('kademeler parçacık çarpanına eşleniyor', () => {
    expect(EFFECT_SCALE.full).toBe(1);
    expect(EFFECT_SCALE.low).toBeGreaterThan(0);
    expect(EFFECT_SCALE.low).toBeLessThan(1);
    expect(EFFECT_SCALE.off).toBe(0);
  });
});

describe('dil — Y03 Adım 3', () => {
  // `Settings` kurucusu etkin dili yazıyor; sızmasın.
  afterEach(() => {
    setLocale(DEFAULT_LOCALE);
  });

  it('tarayıcı dili Türkçeyse tr, değilse en', () => {
    expect(detectLocale({ language: 'tr-TR' })).toBe('tr');
    expect(detectLocale({ language: 'tr' })).toBe('tr');
    expect(detectLocale({ language: 'en-US' })).toBe('en');
    // Çevirisi olmayan bir dil `en`'e düşüyor, `tr`'ye değil: iki dilden
    // uluslararası olanı o.
    expect(detectLocale({ language: 'de-DE' })).toBe('en');
    expect(detectLocale({ language: 'fr' })).toBe('en');
  });

  it('okunamayan dilde geri düşme diline iniyor — node ortamı', () => {
    expect(detectLocale({})).toBe(DEFAULT_LOCALE);
  });

  it('tarayıcı dili varsayılanı belirliyor', () => {
    const s = new Settings(new MemoryStore(), azaltma, { language: 'en-GB' });
    expect(s.state.locale).toBe('en');
  });

  it('oyuncunun KAYITLI seçimi tarayıcı dilini EZİYOR', () => {
    const depo = new MemoryStore();
    new Settings(depo, azaltma, { language: 'en-GB' }).set('locale', 'tr');
    expect(new Settings(depo, azaltma, { language: 'en-GB' }).state.locale).toBe('tr');
  });

  it('kurucu etkin dili UYGULUYOR — Y04 hatası tekrarlanmasın', () => {
    // Tercihi saklayan ile uygulayan ayrı olsaydı, "ses tercihi açılışta
    // uygulanmıyor" hatasının (Y04) dil sürümü doğardı.
    new Settings(new MemoryStore(), azaltma, { language: 'en-US' });
    expect(getLocale()).toBe('en');
    expect(t('play')).toBe('Play');
  });

  it('set(locale) etkin dili ANINDA uyguluyor', () => {
    const s = new Settings(new MemoryStore(), azaltma, { language: 'tr' });
    expect(t('play')).toBe('Oyna');
    s.set('locale', 'en');
    expect(t('play')).toBe('Play');
  });

  it('bozuk kayıttaki dil oyunu çökertmiyor — t() undefined okumuyor', () => {
    const depo = new MemoryStore();
    depo.set(SAVE_KEY, JSON.stringify({ settings: { locale: 'klingon' } }));
    const s = new Settings(depo, azaltma, { language: 'en-US' });
    expect(s.state.locale).toBe('en');
    expect(() => t('play')).not.toThrow();
  });
});

describe('prefers-reduced-motion — §10, S54', () => {
  it('okunuyor', () => {
    expect(prefersReducedMotion(azalt)).toBe(true);
    expect(prefersReducedMotion(azaltma)).toBe(false);
  });

  it('matchMedia yoksa çökmüyor — node ortamı', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
  });

  it('matchMedia FIRLATSA bile çökmüyor', () => {
    expect(
      prefersReducedMotion(() => {
        throw new Error('kısıtlı');
      }),
    ).toBe(false);
  });

  it('S54 — varsayılanları DÜŞÜRÜYOR: efekt low, sarsıntı kapalı', () => {
    const s = new Settings(new MemoryStore(), azalt);
    expect(s.state.effects).toBe('low');
    expect(s.state.screenShake).toBe(false);
    expect(s.state.sound).toBe(true); // ses hareket değil, kapatılmıyor
  });

  it('“low” seçildi, “off” DEĞİL — medya sorgusunun adı reduce, disable değil', () => {
    expect(reducedMotionDefaults().effects).toBe('low');
    expect(EFFECT_SCALE[reducedMotionDefaults().effects]).toBeGreaterThan(0);
  });

  it('oyuncunun AÇIK seçimi sistem tercihini EZİYOR', () => {
    const depo = new MemoryStore();
    new Settings(depo, azalt).set('effects', 'full');
    // Sistem hâlâ "azalt" diyor ama oyuncu açıkça "tam" dedi.
    expect(new Settings(depo, azalt).state.effects).toBe('full');
  });
});

describe('TIER 1 kural 10 — localStorage her zaman try/catch içinde', () => {
  /** Gizli sekme taklidi: her erişim fırlatıyor. */
  class GizliSekme implements KeyValueStore {
    get(): string | null {
      throw new Error('SecurityError');
    }
    set(): boolean {
      throw new Error('SecurityError');
    }
    remove(): void {
      throw new Error('SecurityError');
    }
  }

  it('LocalStore gizli sekmede ÇÖKMÜYOR — yedeğe düşüyor', () => {
    const asil = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      const d = new LocalStore();
      expect(() => d.set('a', '1')).not.toThrow();
      expect(d.get('a')).toBe('1'); // bellek yedeği
      expect(() => d.remove('a')).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: asil,
      });
    }
  });

  it('yazma başarısız olunca oyuncuya BİR KEZ bildiriliyor', () => {
    const asil = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      let sayac = 0;
      const d = new LocalStore(() => sayac++);
      d.set('a', '1');
      d.set('b', '2');
      d.set('c', '3');
      expect(sayac).toBe(1); // CLAUDE.md k.10: "bir kez"
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: asil,
      });
    }
  });

  it('Settings fırlatan depoyla da çalışıyor', () => {
    // Kurucu okuma yapıyor; fırlatan depo oyunu açılışta çökertmemeli.
    expect(() => new Settings(new GizliSekme(), azaltma)).toThrow();
    // ↑ Ham `KeyValueStore` sözleşmesi fırlatmamayı şart koşuyor;
    //   `LocalStore` bu sözleşmeyi zaten sağlıyor (üstteki test).
    //   Bu satır sözleşmenin **kimde** olduğunu sabitliyor: sarma
    //   `LocalStore`'un işi, `Settings`'in değil.
  });

  it('bozuk JSON kaydı oyunu çökertmiyor', () => {
    const depo = new MemoryStore();
    depo.set(SAVE_KEY, '{bozuk json');
    const s = new Settings(depo, azaltma, trDil);
    expect(s.state).toEqual(DEFAULT_SETTINGS);
  });

  it('kayıt M7 SaveSystem’in alanlarını EZMİYOR', () => {
    const depo = new MemoryStore();
    depo.set(SAVE_KEY, JSON.stringify({ unlockedMaps: 2, stars: [3, 2] }));
    new Settings(depo, azaltma).set('sound', false);

    const sonra = JSON.parse(depo.get(SAVE_KEY)!) as Record<string, unknown>;
    expect(sonra['unlockedMaps']).toBe(2);
    expect(sonra['stars']).toEqual([3, 2]);
    expect((sonra['settings'] as { sound: boolean }).sound).toBe(false);
  });

  it('tek anahtar kullanılıyor — CLAUDE.md Teknoloji', () => {
    expect(SAVE_KEY).toBe('kale-nobeti-save-v1');
  });
});

describe('getSettings — Y04 sahneler arası paylaşım', () => {
  it('registry’deki Settings örneğini döndürüyor', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    const kayit = new Map<string, unknown>([[SETTINGS_REGISTRY_KEY, s]]);
    const host = { registry: { get: (k: string) => kayit.get(k) } };
    expect(getSettings(host)).toBe(s);
  });

  it('BootScene koşmadıysa (registry boş) fırlatıyor — sessizce any dönmüyor', () => {
    const host = { registry: { get: () => undefined } };
    expect(() => getSettings(host)).toThrow();
  });

  it('registry’de Settings olmayan bir değer varsa da fırlatıyor', () => {
    const host = { registry: { get: () => ({ sound: true }) } };
    expect(() => getSettings(host)).toThrow();
  });
});

// ---------------------------------------------------------------------
// M8-T10 — müzik ve ses efekti ayrı kademeler
// ---------------------------------------------------------------------

describe('Settings — ses kademeleri (M8-T10)', () => {
  it('varsayılan ikisi de tam', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    expect(s.state.musicLevel).toBe('full');
    expect(s.state.sfxLevel).toBe('full');
    expect(s.musicScale).toBe(1);
    expect(s.sfxScale).toBe(1);
  });

  it('kademe döngüsü full → low → off → full', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    expect(s.cycleAudio('musicLevel')).toBe('low');
    expect(s.cycleAudio('musicLevel')).toBe('off');
    expect(s.cycleAudio('musicLevel')).toBe('full');
  });

  it('biri kısılınca DİĞERİ etkilenmiyor', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    s.cycleAudio('musicLevel'); // low
    expect(s.state.sfxLevel).toBe('full');
    expect(s.musicScale).toBeLessThan(s.sfxScale);
  });

  it('`sound` bayrağı TÜRETİLİYOR — ikisi de kapanınca kapanıyor', () => {
    const s = new Settings(new MemoryStore(), azaltma);
    s.cycleAudio('musicLevel');
    s.cycleAudio('musicLevel'); // müzik off
    expect(s.state.sound).toBe(true); // efekt hâlâ açık
    s.cycleAudio('sfxLevel');
    s.cycleAudio('sfxLevel'); // efekt off
    expect(s.state.sound).toBe(false);
    s.cycleAudio('sfxLevel'); // full
    expect(s.state.sound).toBe(true);
  });

  it('**ESKİ KAYIT göç ediyor** — sürüm yükseltmeden', () => {
    // M8 öncesi kayıtta yalnız `sound` var.
    const store = new MemoryStore();
    store.set(SAVE_KEY, JSON.stringify({ settings: { sound: false, effects: 'low' } }));
    const s = new Settings(store, azaltma);
    expect(s.state.musicLevel).toBe('off');
    expect(s.state.sfxLevel).toBe('off');
    expect(s.state.effects).toBe('low'); // diğer alanlar bozulmadı

    const store2 = new MemoryStore();
    store2.set(SAVE_KEY, JSON.stringify({ settings: { sound: true } }));
    expect(new Settings(store2, azaltma).state.musicLevel).toBe('full');
  });

  it('kayıtta kademe VARSA `sound` ondan türetiliyor — çelişki kademeden yana çözülüyor', () => {
    const store = new MemoryStore();
    store.set(
      SAVE_KEY,
      JSON.stringify({ settings: { sound: true, musicLevel: 'off', sfxLevel: 'off' } }),
    );
    expect(new Settings(store, azaltma).state.sound).toBe(false);
  });

  it('bozuk kademe değeri yok sayılıyor', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEY, JSON.stringify({ settings: { sound: true, musicLevel: 'yüksek' } }));
    const s = new Settings(store, azaltma);
    expect(s.state.musicLevel).toBe('full');
  });

  it('kademe kalıcı — yeniden açılışta okunuyor', () => {
    const store = new MemoryStore();
    const s = new Settings(store, azaltma);
    s.cycleAudio('sfxLevel'); // low
    expect(new Settings(store, azaltma).state.sfxLevel).toBe('low');
  });
});

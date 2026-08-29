import { describe, expect, it } from 'vitest';
import { TutorialSystem } from './TutorialSystem';
import { EventBus } from './EventBus';
import { LocalStore, MemoryStore, SAVE_KEY } from '../util/storage';
import type { KeyValueStore } from '../util/storage';

describe('TutorialSystem — Y09, iki ipucu (S65, S69)', () => {
  it('temiz depoda start() ilk ipucu tetikliyor', () => {
    const gosterilen: string[] = [];
    const t = new TutorialSystem(new MemoryStore(), true, (h) => gosterilen.push(h), new EventBus());
    t.start();
    expect(gosterilen).toEqual(['earlyStart']);
  });

  it('görülen ipucu kalıcı — yeni oturumda (aynı depo) TEKRAR görünmüyor', () => {
    const depo = new MemoryStore();
    new TutorialSystem(depo, true, () => {}, new EventBus()).start();

    // "Sayfa yenilendi" — yeni sistem, aynı depo.
    const gosterilen: string[] = [];
    new TutorialSystem(depo, true, (h) => gosterilen.push(h), new EventBus()).start();
    expect(gosterilen).toEqual([]);
  });

  it('barracks:placed → dragRally ipucu, yalnız ilk kez', () => {
    const bus = new EventBus();
    const gosterilen: string[] = [];
    new TutorialSystem(new MemoryStore(), true, (h) => gosterilen.push(h), bus);

    bus.emit('barracks:placed', { spotIndex: 0 });
    bus.emit('barracks:placed', { spotIndex: 1 }); // ikinci kışla — tekrar göstermemeli
    expect(gosterilen).toEqual(['dragRally']);
  });

  it('iki ipucu birbirinden bağımsız — biri görülse diğeri hâlâ tetiklenir', () => {
    const bus = new EventBus();
    const gosterilen: string[] = [];
    const t = new TutorialSystem(new MemoryStore(), true, (h) => gosterilen.push(h), bus);
    t.start(); // earlyStart
    bus.emit('barracks:placed', { spotIndex: 0 }); // dragRally
    expect(gosterilen).toEqual(['earlyStart', 'dragRally']);
    expect(t.hasSeen('earlyStart')).toBe(true);
    expect(t.hasSeen('dragRally')).toBe(true);
  });

  it('setEnabled(false) — kapalıyken hiçbir ipucu tetiklenmiyor', () => {
    const bus = new EventBus();
    const gosterilen: string[] = [];
    const t = new TutorialSystem(new MemoryStore(), true, (h) => gosterilen.push(h), bus);
    t.setEnabled(false);
    t.start();
    bus.emit('barracks:placed', { spotIndex: 0 });
    expect(gosterilen).toEqual([]);
  });

  it('başlangıçta kapalı (enabled=false) verilirse de tetiklenmiyor', () => {
    const gosterilen: string[] = [];
    const t = new TutorialSystem(new MemoryStore(), false, (h) => gosterilen.push(h), new EventBus());
    t.start();
    expect(gosterilen).toEqual([]);
  });

  it('kapatılıp yeniden açılınca yeni tetikler yine çalışıyor', () => {
    const bus = new EventBus();
    const gosterilen: string[] = [];
    const t = new TutorialSystem(new MemoryStore(), false, (h) => gosterilen.push(h), bus);
    t.setEnabled(true);
    t.start();
    expect(gosterilen).toEqual(['earlyStart']);
  });

  describe('TIER 1 kural 10 — sözleşme LocalStore’da, TutorialSystem’de değil', () => {
    /**
     * `Settings.test.ts`'teki "Settings fırlatan depoyla da çalışıyor"
     * testiyle aynı gerekçe: ham `KeyValueStore` sözleşmesi fırlatmamayı
     * şart koşuyor, `LocalStore` bunu zaten sağlıyor (`storage.test.ts`).
     * Bu sözleşmeyi ihlal eden bir depo `TutorialSystem`'i de fırlatır —
     * beklenen, çünkü sarma `LocalStore`'un işi.
     */
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

    it('ham (LocalStore olmayan) fırlatan depo TutorialSystem’i de fırlatır', () => {
      expect(() => new TutorialSystem(new GizliSekme(), true, () => {}, new EventBus())).toThrow();
    });

    it('gerçek gizli-sekme yolu: LocalStore sarınca çökmüyor, ipucu HER SEFERİNDE görünür', () => {
      // `LocalStore`'un kendi "gizli sekme" testiyle aynı teknik
      // (`storage.test.ts`) — `localStorage` erişimi tamamen fırlıyor.
      const asil = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('SecurityError');
        },
      });
      try {
        const gosterilen: string[] = [];
        // İki AYRI `LocalStore` — gerçek "sayfa yenilendi" senaryosu.
        // (Aynı örnekte bellek-yedeği zaten kalıcılığı taklit eder;
        // gizli sekmede asıl kayıp SAYFA YENİLENİNCE ortaya çıkar.)
        expect(() => {
          new TutorialSystem(new LocalStore(), true, (h) => gosterilen.push(h), new EventBus()).start();
          new TutorialSystem(new LocalStore(), true, (h) => gosterilen.push(h), new EventBus()).start();
        }).not.toThrow();
        // Kalıcılık hiç çalışmadığı için ipucu her seferinde görünüyor —
        // veri kaybı sessiz kalmıyor, oyuncu bilgilendirilmeye devam ediyor.
        expect(gosterilen).toEqual(['earlyStart', 'earlyStart']);
      } finally {
        if (asil) Object.defineProperty(globalThis, 'localStorage', asil);
        else delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    });
  });

  describe('SaveData ile paylaşım — progress alanına dokunmuyor', () => {
    it('kayıt SaveSystem’in `progress` alanını EZMİYOR', () => {
      const depo = new MemoryStore();
      depo.set(SAVE_KEY, JSON.stringify({ progress: { version: 1, stars: { harita1: 3 } } }));
      new TutorialSystem(depo, true, () => {}, new EventBus()).start();

      const sonra = JSON.parse(depo.get(SAVE_KEY)!) as Record<string, unknown>;
      expect(sonra['progress']).toEqual({ version: 1, stars: { harita1: 3 } });
      expect((sonra['tutorial'] as { seenHints: string[] }).seenHints).toEqual(['earlyStart']);
    });

    it('bozuk JSON kaydı çökertmiyor, hiç ipucu görülmemiş sayılır', () => {
      const depo = new MemoryStore();
      depo.set(SAVE_KEY, '{bozuk json');
      const gosterilen: string[] = [];
      expect(() => {
        new TutorialSystem(depo, true, (h) => gosterilen.push(h), new EventBus()).start();
      }).not.toThrow();
      expect(gosterilen).toEqual(['earlyStart']);
    });

    it('eski kayıtta `tutorial` alanı hiç yoksa (sürüm öncesi) veri kaybı olmadan çalışıyor', () => {
      const depo = new MemoryStore();
      depo.set(SAVE_KEY, JSON.stringify({ progress: { version: 1, stars: {} } }));
      const gosterilen: string[] = [];
      new TutorialSystem(depo, true, (h) => gosterilen.push(h), new EventBus()).start();
      expect(gosterilen).toEqual(['earlyStart']);

      const sonra = JSON.parse(depo.get(SAVE_KEY)!) as Record<string, unknown>;
      expect(sonra['progress']).toEqual({ version: 1, stars: {} }); // dokunulmadı
    });
  });
});

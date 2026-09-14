import { describe, expect, it } from 'vitest';
import { ilkOturumMu, ILK_HARITA_ID } from './ilkOturum';
import { MemoryStore, SAVE_KEY } from '../util/storage';
import { MAPS } from '../data/maps';

function depo(icerik?: unknown): MemoryStore {
  const m = new MemoryStore();
  if (icerik !== undefined) m.set(SAVE_KEY, JSON.stringify(icerik));
  return m;
}

describe('ilkOturumMu — menü atlanacak mı', () => {
  it('hiç kayıt yoksa: ilk oturum', () => {
    expect(ilkOturumMu(new MemoryStore())).toBe(true);
  });

  it('kayıt var ama iki alan da boş: ilk oturum', () => {
    expect(ilkOturumMu(depo({ settings: { sound: true } }))).toBe(true);
  });

  /**
   * En sinsi yanlış cevap bu yönde: `false` dönerse fazın tamamı
   * sessizce devre dışı kalır ve kimse fark etmez.
   */
  it('YALNIZ ayarlar kaydedilmişse hâlâ ilk oturum', () => {
    const k = { settings: { sound: false, music: true, difficulty: 'zor' } };
    expect(ilkOturumMu(depo(k))).toBe(true);
  });

  it('bir haritada yıldız varsa: ilk oturum DEĞİL', () => {
    const k = { progress: { version: 1, stars: { 'degirmen-gecidi': 2 } } };
    expect(ilkOturumMu(depo(k))).toBe(false);
  });

  /**
   * Oyuncu oynayıp **hep kaybetmiş** olabilir: yıldızı yok ama oyunu
   * tanıyor. Yıldıza tek başına bakmak tam bu oyuncuyu her açılışta
   * doğrudan harita 1'e atardı.
   */
  it('yıldız yok ama ipucu görülmüşse: ilk oturum DEĞİL', () => {
    const k = { progress: { version: 1, stars: {} }, tutorial: { seenHints: ['earlyStart'] } };
    expect(ilkOturumMu(depo(k))).toBe(false);
  });

  it('boş yıldız haritası ve boş ipucu listesi: hâlâ ilk oturum', () => {
    const k = { progress: { version: 1, stars: {} }, tutorial: { seenHints: [] } };
    expect(ilkOturumMu(depo(k))).toBe(true);
  });

  /**
   * `SaveSystem` ve `TutorialSystem` bozuk kayıtta "sıfırdan başla"
   * diyor; bu dosya farklı cevap verirse oyuncu kendi kaydını yarı
   * tanıyan bir oyuna düşer.
   */
  it('bozuk JSON: ilk oturum (diğer iki sistemle aynı cevap)', () => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, '{bu json değil');
    expect(ilkOturumMu(m)).toBe(true);
  });

  it('JSON ama nesne değilse: ilk oturum', () => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, '"düz dize"');
    expect(ilkOturumMu(m)).toBe(true);
  });

  /**
   * Bu çağrı `PreloadScene.create()`'in içinde. Buradan sızan bir
   * istisna oyunu **açılışta** çökertirdi — TIER 1 kural 10'un tam
   * olarak önlemek istediği durum. `LocalStore` zaten kendi içinde
   * yakalıyor; bu test o korumanın burada da tekrarlandığını bağlıyor.
   */
  it('depo okuması patlarsa çökmüyor, ilk oturum sayıyor', () => {
    const patlak = {
      get: (): string | null => {
        throw new Error('erişim reddedildi');
      },
      set: () => true,
      remove: () => {},
    };
    expect(ilkOturumMu(patlak)).toBe(true);
  });
});

describe('ILK_HARITA_ID', () => {
  it('haritaların ilki — sıra değişirse bu test düşer', () => {
    expect(MAPS[0]?.id).toBe(ILK_HARITA_ID);
  });
});

import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { SaveSystem } from './SaveSystem';
import { EndlessRecords } from './EndlessRecords';
import { AchievementSystem } from './AchievementSystem';
import { Settings } from './Settings';
import { TutorialSystem } from './TutorialSystem';
import { EventBus } from './EventBus';
import { MemoryStore, SAVE_KEY } from '../util/storage';

/**
 * `TutorialSystem` ipucu **işaretleme** API'si taşımıyor: ipuçları
 * `EventBus` olaylarıyla tetikleniyor (`barracks:placed` → `dragRally`).
 * Test o yolu kullanıyor — özel bir arka kapı açmak, ölçtüğü şeyi
 * gerçek kullanımdan uzaklaştırırdı.
 */
function ogreticiIsaretle(store: MemoryStore, hint: 'dragRally' | 'targetModes'): void {
  const bus = new EventBus();
  new TutorialSystem(store, true, () => {}, bus);
  if (hint === 'dragRally') bus.emit('barracks:placed', { spotIndex: 0 });
  else bus.emit('targeting:opened', { spotIndex: 0 });
}

function ogreticiOku(store: MemoryStore): TutorialSystem {
  return new TutorialSystem(store, true, () => {}, new EventBus());
}

/**
 * **Beş sistem tek `localStorage` anahtarını paylaşıyor** —
 * `kale-nobeti-save-v1`. Her biri kendi üst alanını yazarken diğerlerinin
 * alanlarını korumak zorunda: hepsi "oku → birleştir → yaz" yapıyor ve
 * biri bu deseni bozarsa **sessizce** veri siliyor.
 *
 * | Sistem | Alan | Geldiği taş |
 * |---|---|---|
 * | `Settings` | `settings` | M6 |
 * | `SaveSystem` | `progress` | M7 |
 * | `TutorialSystem` | `tutorial` | `Y09` |
 * | `EndlessRecords` | `endless` | `M8-T06` |
 * | `AchievementSystem` | `achievements` | `M8-T07` |
 *
 * `M8` bu listeye **iki** yeni alan ekledi; bu dosya o eklemenin
 * güvenliğini tek yerde sınıyor. Tek tek her sistemin kendi testi var,
 * ama "beşi bir arada" sorusu hiçbirinde sorulmuyordu.
 */
describe('paylaşılan kayıt anahtarı — beş sistem', () => {
  it('sırayla yazınca HİÇBİRİ kaybolmuyor', () => {
    const store = new MemoryStore();

    new Settings(store).set('effects', 'low');
    new SaveSystem(store).recordResult('degirmen-gecidi', 20, true, BALANCE.startLives);
    ogreticiIsaretle(store, 'dragRally');
    new EndlessRecords(store).record('kar-gecidi', 23);
    new AchievementSystem(store).unlock('firstWin');

    expect(new Settings(store).state.effects).toBe('low');
    expect(new SaveSystem(store).starsOf('degirmen-gecidi')).toBe(3);
    expect(ogreticiOku(store).hasSeen('dragRally')).toBe(true);
    expect(new EndlessRecords(store).bestOf('kar-gecidi')).toBe(23);
    expect(new AchievementSystem(store).has('firstWin')).toBe(true);
  });

  it('TERS sırayla da kaybolmuyor', () => {
    const store = new MemoryStore();

    new AchievementSystem(store).unlock('firstTower');
    new EndlessRecords(store).record('kul-ovasi', 14);
    ogreticiIsaretle(store, 'targetModes');
    new SaveSystem(store).recordResult('tas-kopru', 17, true, BALANCE.startLives);
    new Settings(store).set('difficulty', 'zor');

    expect(new AchievementSystem(store).has('firstTower')).toBe(true);
    expect(new EndlessRecords(store).bestOf('kul-ovasi')).toBe(14);
    expect(ogreticiOku(store).hasSeen('targetModes')).toBe(true);
    expect(new SaveSystem(store).starsOf('tas-kopru')).toBe(2);
    expect(new Settings(store).state.difficulty).toBe('zor');
  });

  it('araya giren yazmalar birbirini EZMİYOR — aynı anda açık örnekler', () => {
    // Gerçek senaryo: `GameScene` bir `AchievementSystem` tutuyor,
    // `GameOverScene` **başka** bir tane yaratıyor, `Settings` ise
    // registry'de tek örnek olarak yaşıyor. Üçü de canlı.
    const store = new MemoryStore();
    const ayarlar = new Settings(store);
    const basarim = new AchievementSystem(store);
    const kayit = new SaveSystem(store);

    ayarlar.set('musicLevel', 'low');
    basarim.unlock('firstTower');
    kayit.recordResult('degirmen-gecidi', 20, true, BALANCE.startLives);
    ayarlar.set('sfxLevel', 'off');
    basarim.unlock('firstWin');

    const ham = JSON.parse(store.get(SAVE_KEY)!) as Record<string, unknown>;
    expect(Object.keys(ham).sort()).toEqual(['achievements', 'progress', 'settings']);
    expect(new Settings(store).state.musicLevel).toBe('low');
    expect(new Settings(store).state.sfxLevel).toBe('off');
    expect([...new AchievementSystem(store).unlocked].sort()).toEqual(['firstTower', 'firstWin']);
    expect(new SaveSystem(store).starsOf('degirmen-gecidi')).toBe(3);
  });

  it('**`progress.version` hiçbir yazmadan sonra değişmiyor**', () => {
    // `M8`'in iki yeni alanı da sürüm yükseltmeden eklendi; bu testin
    // kırılması "göç gerekiyor" demek.
    const store = new MemoryStore();
    new SaveSystem(store).recordResult('degirmen-gecidi', 20, true, BALANCE.startLives);
    new EndlessRecords(store).record('degirmen-gecidi', 30);
    new AchievementSystem(store).unlock('allMaps');
    new Settings(store).set('difficulty', 'kolay');

    const ham = JSON.parse(store.get(SAVE_KEY)!) as { progress: { version: number } };
    expect(ham.progress.version).toBe(1);
  });

  it('bozuk JSON hiçbirini ÇÖKERTMİYOR', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEY, 'bu json değil {{{');

    expect(() => new Settings(store)).not.toThrow();
    expect(() => new SaveSystem(store)).not.toThrow();
    expect(() => ogreticiOku(store)).not.toThrow();
    expect(() => new EndlessRecords(store)).not.toThrow();
    expect(() => new AchievementSystem(store)).not.toThrow();

    // Bozuk kaydın üstüne yazan ilk sistem onu düzeltmeli, diğerlerini
    // silmeye hakkı yok (zaten okunamıyordu).
    new SaveSystem(store).recordResult('degirmen-gecidi', 20, true, BALANCE.startLives);
    expect(new SaveSystem(store).starsOf('degirmen-gecidi')).toBe(3);
  });
});

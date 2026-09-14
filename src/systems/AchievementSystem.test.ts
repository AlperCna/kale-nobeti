import { describe, expect, it } from 'vitest';
import { AchievementSystem } from './AchievementSystem';
import type { RunEndContext } from './AchievementSystem';
import { EventBus } from './EventBus';
import { SaveSystem } from './SaveSystem';
import { ACHIEVEMENTS } from '../data/achievements';
import { MemoryStore, SAVE_KEY } from '../util/storage';

function kur(): { bus: EventBus; sys: AchievementSystem; acilan: string[] } {
  const bus = new EventBus();
  const acilan: string[] = [];
  const sys = new AchievementSystem(new MemoryStore(), bus, (id) => acilan.push(id));
  return { bus, sys, acilan };
}

const BOS_EL: RunEndContext = {
  won: false,
  lives: 0,
  startLives: 20,
  sold: false,
  mapsCompleted: 0,
  mapCount: 5,
  stars: 0,
  maxStars: 15,
  endlessWave: 0,
};

describe('AchievementSystem — tanımlar', () => {
  it('kimlikler BENZERSİZ — kayıt bunlara dayanıyor', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('on iki başarım var', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
  });

  it('tanımsız kimlik YAZILMIYOR — kurcalanmış kayıt sızmasın', () => {
    const { sys } = kur();
    expect(sys.unlock('boyleBirSeyYok')).toBe(false);
    expect(sys.unlocked).toHaveLength(0);
  });
});

describe('AchievementSystem — el içi tetikleyiciler', () => {
  it('ilk kule ve ilk kışla', () => {
    const { bus, sys, acilan } = kur();
    bus.emit('tower:placed', { spotIndex: 0 });
    bus.emit('barracks:placed', { spotIndex: 1 });
    expect(sys.has('firstTower')).toBe(true);
    expect(sys.has('firstBarracks')).toBe(true);
    expect(acilan).toEqual(['firstTower', 'firstBarracks']);
  });

  it('bant YALNIZ BİR KEZ — aynı başarım tekrar tetiklenmiyor', () => {
    const { bus, acilan } = kur();
    for (let i = 0; i < 5; i++) bus.emit('tower:placed', { spotIndex: i });
    expect(acilan).toEqual(['firstTower']);
  });

  it('T3: kademe 2’den itibaren, T2 açmıyor', () => {
    const { bus, sys } = kur();
    bus.emit('tower:upgraded', { spotIndex: 0, tier: 1 }); // T2
    expect(sys.has('firstTier3')).toBe(false);
    bus.emit('tower:upgraded', { spotIndex: 0, tier: 2 }); // T3a
    expect(sys.has('firstTier3')).toBe(true);
  });

  it('Meteor 5: 4 açmıyor, 5 açıyor; Takviye hiç açmıyor', () => {
    const { bus, sys } = kur();
    bus.emit('ability:cast', { id: 'meteor', hits: 4 });
    expect(sys.has('meteor5')).toBe(false);
    bus.emit('ability:cast', { id: 'takviye', hits: 9 });
    expect(sys.has('meteor5')).toBe(false);
    bus.emit('ability:cast', { id: 'meteor', hits: 5 });
    expect(sys.has('meteor5')).toBe(true);
  });

  it('öldürme sayacı EŞİKTE açıyor', () => {
    const { bus, sys } = kur();
    for (let i = 0; i < 99; i++) bus.emit('enemy:killed', { id: i, gold: 1 });
    expect(sys.has('kill100')).toBe(false);
    bus.emit('enemy:killed', { id: 99, gold: 1 });
    expect(sys.has('kill100')).toBe(true);
    expect(sys.kills).toBe(100);
  });

  it('öldürme sayacı ELLER ARASI birikiyor', () => {
    const store = new MemoryStore();
    const bus1 = new EventBus();
    new AchievementSystem(store, bus1);
    for (let i = 0; i < 50; i++) bus1.emit('enemy:killed', { id: i, gold: 1 });

    const bus2 = new EventBus();
    const sys2 = new AchievementSystem(store, bus2);
    expect(sys2.kills).toBe(50); // 25'in katında diske indi
    for (let i = 0; i < 50; i++) bus2.emit('enemy:killed', { id: i, gold: 1 });
    expect(sys2.has('kill100')).toBe(true);
  });

  it('**her ölümde diske YAZMIYOR** — 2× kasmasının kök nedeni bu sınıftı', () => {
    const store = new MemoryStore();
    let yazma = 0;
    const sayan = {
      get: (k: string) => store.get(k),
      set: (k: string, v: string) => {
        yazma++;
        return store.set(k, v);
      },
      remove: (k: string) => store.remove(k),
    };
    const bus = new EventBus();
    new AchievementSystem(sayan, bus);
    for (let i = 0; i < 100; i++) bus.emit('enemy:killed', { id: i, gold: 1 });
    // 25/50/75'te üç yazma + 100 eşiğinde `unlock`'un yazması = 4.
    expect(yazma).toBeLessThanOrEqual(5);
  });
});

describe('AchievementSystem — el sonu', () => {
  it('kazanınca ilk zafer; kaybedince değil', () => {
    const { sys } = kur();
    expect(sys.checkRunEnd({ ...BOS_EL, won: false })).toEqual([]);
    expect(sys.checkRunEnd({ ...BOS_EL, won: true })).toContain('firstWin');
  });

  it('kusursuz: kazanıp TAM canla bitirmek', () => {
    const { sys } = kur();
    sys.checkRunEnd({ ...BOS_EL, won: true, lives: 19, startLives: 20 });
    expect(sys.has('flawless')).toBe(false);
    sys.checkRunEnd({ ...BOS_EL, won: true, lives: 20, startLives: 20 });
    expect(sys.has('flawless')).toBe(true);
  });

  it('kaybedilen el kusursuz SAYILMIYOR — 0 can 20’den küçük ama şart `won`', () => {
    const { sys } = kur();
    sys.checkRunEnd({ ...BOS_EL, won: false, lives: 20, startLives: 20 });
    expect(sys.has('flawless')).toBe(false);
  });

  it('satmadan: kule satıldıysa açılmıyor', () => {
    const { sys } = kur();
    sys.checkRunEnd({ ...BOS_EL, won: true, sold: true });
    expect(sys.has('noSell')).toBe(false);
    sys.checkRunEnd({ ...BOS_EL, won: true, sold: false });
    expect(sys.has('noSell')).toBe(true);
  });

  it('bütün haritalar ve bütün yıldızlar', () => {
    const { sys } = kur();
    sys.checkRunEnd({ ...BOS_EL, won: true, mapsCompleted: 4, mapCount: 5, stars: 14, maxStars: 15 });
    expect(sys.has('allMaps')).toBe(false);
    expect(sys.has('allStars')).toBe(false);
    sys.checkRunEnd({ ...BOS_EL, won: true, mapsCompleted: 5, mapCount: 5, stars: 15, maxStars: 15 });
    expect(sys.has('allMaps')).toBe(true);
    expect(sys.has('allStars')).toBe(true);
  });

  it('sonsuz 20: 19 açmıyor, 20 açıyor — kaybedilen elde de', () => {
    const { sys } = kur();
    sys.checkRunEnd({ ...BOS_EL, endlessWave: 19 });
    expect(sys.has('endless20')).toBe(false);
    sys.checkRunEnd({ ...BOS_EL, endlessWave: 20 });
    expect(sys.has('endless20')).toBe(true);
  });

  it('aynı el iki kez değerlendirilirse ikinci kez bant çıkmıyor', () => {
    const { sys } = kur();
    const el = { ...BOS_EL, won: true };
    expect(sys.checkRunEnd(el)).toContain('firstWin');
    expect(sys.checkRunEnd(el)).toEqual([]);
  });
});

describe('AchievementSystem — kalıcılık', () => {
  it('açılanlar geri okunuyor', () => {
    const store = new MemoryStore();
    new AchievementSystem(store).unlock('firstTower');
    expect(new AchievementSystem(store).has('firstTower')).toBe(true);
  });

  it('**`progress` ve `endless` alanlarını BOZMUYOR**', () => {
    const store = new MemoryStore();
    new SaveSystem(store).recordResult('degirmen-gecidi', 20, true);
    new AchievementSystem(store).unlock('firstWin');
    expect(new SaveSystem(store).starsOf('degirmen-gecidi')).toBe(3);

    const ham = JSON.parse(store.get(SAVE_KEY)!) as { progress: { version: number } };
    expect(ham.progress.version).toBe(1);
  });

  it('bozuk kayıt ÇÖKERTMİYOR, tanımsız kimlik SÜZÜLÜYOR', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEY, '{bozuk');
    expect(new AchievementSystem(store).unlocked).toEqual([]);

    store.set(
      SAVE_KEY,
      JSON.stringify({ achievements: { unlocked: ['firstTower', 'uydurma', 42], kills: 'çok' } }),
    );
    const sys = new AchievementSystem(store);
    expect(sys.unlocked).toEqual(['firstTower']);
    expect(sys.kills).toBe(0);
  });
});

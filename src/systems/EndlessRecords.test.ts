import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { EndlessRecords } from './EndlessRecords';
import { SaveSystem } from './SaveSystem';
import { MemoryStore, SAVE_KEY } from '../util/storage';

describe('EndlessRecords — M8-T06', () => {
  it('boş kayıtta rekor 0', () => {
    expect(new EndlessRecords(new MemoryStore()).bestOf('degirmen-gecidi')).toBe(0);
  });

  it('rekor yazılıyor ve geri okunuyor', () => {
    const store = new MemoryStore();
    expect(new EndlessRecords(store).record('degirmen-gecidi', 17)).toBe(true);
    expect(new EndlessRecords(store).bestOf('degirmen-gecidi')).toBe(17);
  });

  it('**rekor DÜŞMÜYOR** — kazanılan geri alınmaz', () => {
    const r = new EndlessRecords(new MemoryStore());
    r.record('kar-gecidi', 24);
    expect(r.record('kar-gecidi', 12)).toBe(false);
    expect(r.bestOf('kar-gecidi')).toBe(24);
    expect(r.record('kar-gecidi', 24)).toBe(false); // eşit de rekor değil
  });

  it('haritalar birbirini EZMİYOR', () => {
    const r = new EndlessRecords(new MemoryStore());
    r.record('degirmen-gecidi', 14);
    r.record('kadim-harabe', 31);
    expect(r.bestOf('degirmen-gecidi')).toBe(14);
    expect(r.bestOf('kadim-harabe')).toBe(31);
  });

  it('**`progress` alanını BOZMUYOR** — aynı anahtar, ayrı alan', () => {
    // Asıl risk bu: iki sistem tek `localStorage` anahtarını paylaşıyor.
    const store = new MemoryStore();
    const save = new SaveSystem(store);
    save.recordResult('degirmen-gecidi', 20, true, BALANCE.startLives);

    new EndlessRecords(store).record('degirmen-gecidi', 19);

    expect(new SaveSystem(store).starsOf('degirmen-gecidi')).toBe(3);
    expect(new EndlessRecords(store).bestOf('degirmen-gecidi')).toBe(19);
  });

  it('ters sıra da bozmuyor — önce sonsuz, sonra yıldız', () => {
    const store = new MemoryStore();
    new EndlessRecords(store).record('tas-kopru', 22);
    new SaveSystem(store).recordResult('tas-kopru', 20, true, BALANCE.startLives);
    expect(new EndlessRecords(store).bestOf('tas-kopru')).toBe(22);
    expect(new SaveSystem(store).starsOf('tas-kopru')).toBe(3);
  });

  it('`progress.version` DEĞİŞMİYOR — göç gerekmiyor', () => {
    const store = new MemoryStore();
    new SaveSystem(store).recordResult('degirmen-gecidi', 20, true, BALANCE.startLives);
    new EndlessRecords(store).record('degirmen-gecidi', 15);
    const ham = JSON.parse(store.get(SAVE_KEY)!) as { progress: { version: number } };
    expect(ham.progress.version).toBe(1);
  });

  it('bozuk kayıt ÇÖKERTMİYOR', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEY, '{bu json degil');
    expect(new EndlessRecords(store).bestOf('x')).toBe(0);

    store.set(SAVE_KEY, JSON.stringify({ endless: { a: 'yirmi', b: -3, c: null, d: 9 } }));
    const r = new EndlessRecords(store);
    expect(r.bestOf('a')).toBe(0);
    expect(r.bestOf('b')).toBe(0);
    expect(r.bestOf('c')).toBe(0);
    expect(r.bestOf('d')).toBe(9);
  });

  it('geçersiz dalga numarası yazılmıyor', () => {
    const r = new EndlessRecords(new MemoryStore());
    expect(r.record('x', Number.NaN)).toBe(false);
    expect(r.record('x', Number.POSITIVE_INFINITY)).toBe(false);
    expect(r.bestOf('x')).toBe(0);
  });
});

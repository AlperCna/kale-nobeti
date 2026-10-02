import { describe, it, expect } from 'vitest';
import { elSonuKaydet, type ElSonuGirdisi } from './elSonu';
import { SaveSystem } from './SaveSystem';
import { MemoryStore } from '../util/storage';
import { MAPS } from '../data/maps';

const IDS = MAPS.map((m) => m.id);
const EL: ElSonuGirdisi = {
  mapId: undefined,
  won: true,
  lives: 20,
  startLives: 20,
  recordStars: true,
  sold: true,
  endlessWave: 0,
};

/** İlk `n` haritayı ★ ile bitirmiş bir kayıt. */
function bitirmis(n: number): MemoryStore {
  const store = new MemoryStore();
  const s = new SaveSystem(store);
  for (const id of IDS.slice(0, n)) s.recordResult(id, 1, true, 20);
  return store;
}

describe('elSonuKaydet — önce sonuç, sonra başarımlar (M171)', () => {
  it('SON haritayı bitiren el "Sefer Tamam"ı (allMaps) AYNI elde açıyor', () => {
    const store = bitirmis(IDS.length - 1);
    const acilan = elSonuKaydet(store, IDS, { ...EL, mapId: IDS.at(-1) });
    expect(acilan).toContain('allMaps');
  });

  it('Kolay\'da da — yıldızsız "bitirdi" kaydı sayılıyor', () => {
    const store = bitirmis(IDS.length - 1);
    const acilan = elSonuKaydet(store, IDS, { ...EL, mapId: IDS.at(-1), recordStars: false });
    expect(acilan).toContain('allMaps');
    expect(new SaveSystem(store).starsOf(IDS.at(-1)!)).toBe(1);
  });

  it('son ★★★ alınınca "Tam Not" (allStars) aynı elde açılıyor', () => {
    const store = new MemoryStore();
    const s = new SaveSystem(store);
    for (const id of IDS.slice(0, -1)) s.recordResult(id, 20, true, 20);
    const acilan = elSonuKaydet(store, IDS, { ...EL, mapId: IDS.at(-1), lives: 20 });
    expect(acilan).toContain('allStars');
  });

  it('kaybedilen el hiçbir haritayı bitirmiyor', () => {
    const store = bitirmis(IDS.length - 1);
    const acilan = elSonuKaydet(store, IDS, { ...EL, mapId: IDS.at(-1), won: false, lives: 0 });
    expect(acilan).not.toContain('allMaps');
  });
});

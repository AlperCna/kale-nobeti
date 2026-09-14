import { describe, expect, it } from 'vitest';
import { RunSave, RUN_VERSION } from './RunSave';
import type { RunData } from './RunSave';
import { MemoryStore, SAVE_KEY } from '../util/storage';
import { SaveSystem } from './SaveSystem';

function ornekTur(uzer: Partial<RunData> = {}): RunData {
  return {
    version: RUN_VERSION,
    mapId: 'degirmen-gecidi',
    difficulty: 'normal',
    waveIndex: 4,
    gold: 320,
    lives: 17,
    spots: [
      { spotIndex: 0, defId: 'okcu', tierIndex: 2, targetMode: 'strongest' },
      { spotIndex: 3, defId: 'kisla', tierIndex: 1, rally: { x: 400, y: 260 } },
    ],
    abilities: { meteor: 12.5, takviye: 0 },
    stats: { kills: 41, soldAny: false },
    ...uzer,
  };
}

describe('RunSave — yaz/oku turu', () => {
  it('yazılan tur aynen geri okunuyor', () => {
    const d = new RunSave(new MemoryStore());
    const t = ornekTur();
    d.yaz(t);
    expect(d.oku()).toEqual(t);
  });

  it('hiç yazılmamışsa null', () => {
    expect(new RunSave(new MemoryStore()).oku()).toBeNull();
  });

  it('sil() sonrası null', () => {
    const d = new RunSave(new MemoryStore());
    d.yaz(ornekTur());
    expect(d.varMi).toBe(true);
    d.sil();
    expect(d.oku()).toBeNull();
    expect(d.varMi).toBe(false);
  });

  it('kışla kaydı toplanma noktasını koruyor', () => {
    const d = new RunSave(new MemoryStore());
    d.yaz(ornekTur());
    const kisla = d.oku()?.spots.find((s) => s.defId === 'kisla');
    expect(kisla?.rally).toEqual({ x: 400, y: 260 });
    expect(kisla?.targetMode).toBeUndefined();
  });
});

/**
 * **Paylaşılan anahtarın asıl riski bu.** `SaveSystem` (`progress`),
 * `Settings` (`settings`), `TutorialSystem` (`tutorial`) ve bu dosya
 * (`run`) aynı `localStorage` anahtarını kullanıyor; biri diğerinin
 * alanını silerse oyuncu ilerlemesini kaybeder ve bunu çok sonra fark
 * eder.
 */
describe('RunSave — paylaşılan anahtarda diğer alanlar korunuyor', () => {
  it('yıldızlar tur yazınca bozulmuyor', () => {
    const m = new MemoryStore();
    const save = new SaveSystem(m);
    save.recordResult('degirmen-gecidi', 20, true);
    const oncekiYildiz = save.starsOf('degirmen-gecidi');
    expect(oncekiYildiz).toBeGreaterThan(0);

    new RunSave(m).yaz(ornekTur());

    expect(new SaveSystem(m).starsOf('degirmen-gecidi')).toBe(oncekiYildiz);
  });

  it('tur silinince yıldızlar yerinde kalıyor', () => {
    const m = new MemoryStore();
    const save = new SaveSystem(m);
    save.recordResult('degirmen-gecidi', 20, true);
    const d = new RunSave(m);
    d.yaz(ornekTur());
    d.sil();
    expect(new SaveSystem(m).starsOf('degirmen-gecidi')).toBe(save.starsOf('degirmen-gecidi'));
  });

  it('ayarlar alanı tur yazınca korunuyor', () => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, JSON.stringify({ settings: { sound: false, music: true } }));
    new RunSave(m).yaz(ornekTur());
    const ham = JSON.parse(m.get(SAVE_KEY) ?? '{}') as { settings?: { sound?: boolean } };
    expect(ham.settings?.sound).toBe(false);
  });

  it('yıldız yazmak turu bozmuyor — ters yön', () => {
    const m = new MemoryStore();
    const d = new RunSave(m);
    d.yaz(ornekTur());
    new SaveSystem(m).recordResult('tas-kopru', 15, true);
    expect(d.oku()?.waveIndex).toBe(4);
  });
});

/**
 * Bozuk tur "yüklendi" sayılırsa oyuncu yarısı eksik bir tahtayla oyuna
 * düşer ve nedenini anlayamaz. Şüphede kalınca `null` — kaybı en çok
 * bir tur.
 */
describe('RunSave — bozuk kayıt sessizce atılıyor', () => {
  const bozuk = (run: unknown): RunSave => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, JSON.stringify({ run }));
    return new RunSave(m);
  };

  it('eski sürüm atılıyor', () => {
    expect(bozuk({ ...ornekTur(), version: RUN_VERSION - 1 }).oku()).toBeNull();
  });

  it('harita kimliği yoksa atılıyor', () => {
    expect(bozuk({ ...ornekTur(), mapId: '' }).oku()).toBeNull();
  });

  it('dalga indeksi negatifse atılıyor', () => {
    expect(bozuk({ ...ornekTur(), waveIndex: -1 }).oku()).toBeNull();
  });

  /** Can 0 = tur zaten kaybedilmiş. Oyuncu ölü bir tura dönmemeli. */
  it('can sıfırsa atılıyor', () => {
    expect(bozuk({ ...ornekTur(), lives: 0 }).oku()).toBeNull();
  });

  it('yapı noktası listesi dizi değilse atılıyor', () => {
    expect(bozuk({ ...ornekTur(), spots: 'yok' }).oku()).toBeNull();
  });

  it('bir yapı noktasının kademesi geçersizse TÜM tur atılıyor', () => {
    const t = ornekTur();
    const kotu = { ...t, spots: [t.spots[0], { spotIndex: 1, defId: 'top', tierIndex: 9 }] };
    expect(bozuk(kotu).oku()).toBeNull();
  });

  it('JSON bozuksa null', () => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, '{bu json değil');
    expect(new RunSave(m).oku()).toBeNull();
  });

  it('run alanı yoksa null', () => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, JSON.stringify({ progress: { version: 1, stars: {} } }));
    expect(new RunSave(m).oku()).toBeNull();
  });

  it('depo patlarsa null, çökme yok', () => {
    const patlak = {
      get: (): string | null => {
        throw new Error('erişim reddedildi');
      },
      set: () => true,
      remove: () => {},
    };
    expect(new RunSave(patlak).oku()).toBeNull();
  });
});

/**
 * `stats` bilerek tipsiz: `RunStatsData`'ya alan eklenince tur kaydı
 * derlenmez hâle gelmemeli, yalnız eski turlarda o alan eksik kalmalı.
 */
describe('RunSave — istatistik alanı ileriye dönük esnek', () => {
  it('tanınmayan sayısal alan korunuyor', () => {
    const d = new RunSave(new MemoryStore());
    d.yaz(ornekTur({ stats: { kills: 3, yeniAlan: 7, soldAny: true } }));
    expect(d.oku()?.stats).toEqual({ kills: 3, yeniAlan: 7, soldAny: true });
  });

  it('sayı/boolean olmayan değerler eleniyor', () => {
    const m = new MemoryStore();
    m.set(SAVE_KEY, JSON.stringify({ run: { ...ornekTur(), stats: { kills: 3, kotu: {} } } }));
    expect(new RunSave(m).oku()?.stats).toEqual({ kills: 3 });
  });
});

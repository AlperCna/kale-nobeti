import { describe, expect, it } from 'vitest';
import { RunStats } from './RunStats';
import { EventBus } from './EventBus';

function kur(): { bus: EventBus; stats: RunStats; ilerlet: (ms: number) => void } {
  const bus = new EventBus();
  let saat = 1000;
  const stats = new RunStats(bus, () => saat, 280);
  return { bus, stats, ilerlet: (ms) => (saat += ms) };
}

describe('RunStats — M8-T03', () => {
  it('öldürmeyi sayıyor', () => {
    const { bus, stats } = kur();
    bus.emit('enemy:killed', { id: 1, gold: 3 });
    bus.emit('enemy:killed', { id: 2, gold: 3 });
    expect(stats.data.kills).toBe(2);
  });

  it('kule ve kışla birlikte sayılıyor', () => {
    const { bus, stats } = kur();
    bus.emit('tower:placed', { spotIndex: 0 });
    bus.emit('barracks:placed', { spotIndex: 1 });
    expect(stats.data.towersBuilt).toBe(2);
  });

  it('altın FARKTAN çıkarılıyor — olay toplamı taşıyor', () => {
    const { bus, stats } = kur();
    // Taban kurucuda (280) — ilk olay da sayılıyor, yoksa ilk satın alma kaybolurdu.
    bus.emit('gold:changed', { total: 210, reason: 'spend' }); // -70 (ilk kule)
    bus.emit('gold:changed', { total: 230, reason: 'kill' }); // +20
    bus.emit('gold:changed', { total: 120, reason: 'spend' }); // -110 (ikinci kule)
    bus.emit('gold:changed', { total: 150, reason: 'waveBonus' }); // +30
    expect(stats.data.goldEarned).toBe(50);
    expect(stats.data.goldSpent).toBe(180);
  });

  it('can kaybı kalan candan çıkarılıyor — boss 10 can götürebilir', () => {
    const { bus, stats } = kur();
    bus.emit('life:lost', { remaining: 19 });
    expect(stats.data.livesLost).toBe(1);
    bus.emit('life:lost', { remaining: 9 }); // boss sızdı
    expect(stats.data.livesLost).toBe(11);
  });

  it('tepe dalga GERİ GİTMİYOR', () => {
    const { bus, stats } = kur();
    bus.emit('wave:started', { index: 3 });
    bus.emit('wave:started', { index: 7 });
    bus.emit('wave:started', { index: 5 }); // yeniden başlatma senaryosu
    expect(stats.data.peakWave).toBe(7);
  });

  it('süre DUVAR SAATİ — enjekte ediliyor, 2× hız etkilemiyor', () => {
    const { stats, ilerlet } = kur();
    ilerlet(95_000);
    expect(stats.data.durationSec).toBe(95);
  });

  it('satış BAYRAĞI — `sell` sebebi görülünce açılıyor, kapanmıyor', () => {
    const { bus, stats } = kur();
    expect(stats.data.soldAny).toBe(false);
    bus.emit('gold:changed', { total: 300, reason: 'kill' });
    expect(stats.data.soldAny).toBe(false);
    bus.emit('gold:changed', { total: 335, reason: 'sell' });
    expect(stats.data.soldAny).toBe(true);
    bus.emit('gold:changed', { total: 200, reason: 'spend' });
    expect(stats.data.soldAny).toBe(true);
  });

  it('boş el hepsi sıfır', () => {
    const { stats } = kur();
    const d = stats.data;
    expect([d.kills, d.goldEarned, d.goldSpent, d.towersBuilt, d.livesLost, d.peakWave]).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
  });
});

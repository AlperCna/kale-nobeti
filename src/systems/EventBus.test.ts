import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './EventBus';

describe('EventBus', () => {
  it('emit ile gönderilen yükü on dinleyicisine ulaştırır', () => {
    const bus = new EventBus();
    const fn = vi.fn();

    bus.on('gold:changed', fn);
    bus.emit('gold:changed', { total: 280 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ total: 280 });
  });

  it('off sonrası dinleyici çağrılmaz', () => {
    const bus = new EventBus();
    const fn = vi.fn();

    bus.on('life:lost', fn);
    bus.off('life:lost', fn);
    bus.emit('life:lost', { remaining: 19 });

    expect(fn).not.toHaveBeenCalled();
    expect(bus.listenerCount('life:lost')).toBe(0);
  });

  it('aynı olaya iki dinleyici de çağrılır', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('wave:started', a);
    bus.on('wave:started', b);
    bus.emit('wave:started', { index: 1 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('wave:started')).toBe(2);
  });

  it('dinleyici içinde off çağrılırsa yineleme bozulmaz', () => {
    const bus = new EventBus();
    const ikinci = vi.fn();
    const ilk = vi.fn(() => {
      bus.off('tower:placed', ikinci);
    });

    bus.on('tower:placed', ilk);
    bus.on('tower:placed', ikinci);
    bus.emit('tower:placed', { spotIndex: 3 });

    // Kopya üzerinden gezildiği için ikinci bu turda hâlâ çağrılır,
    // ama bir sonraki emit'te çağrılmaz.
    expect(ikinci).toHaveBeenCalledTimes(1);

    bus.emit('tower:placed', { spotIndex: 4 });
    expect(ikinci).toHaveBeenCalledTimes(1);
    expect(ilk).toHaveBeenCalledTimes(2);
  });

  it('dinleyicisi olmayan olayda emit sessizce geçer', () => {
    const bus = new EventBus();
    expect(() => bus.emit('enemy:killed', { id: 1, gold: 3 })).not.toThrow();
  });

  it('clear tüm dinleyicileri kaldırır', () => {
    const bus = new EventBus();
    bus.on('gold:changed', vi.fn());
    bus.on('life:lost', vi.fn());

    bus.clear();

    expect(bus.listenerCount('gold:changed')).toBe(0);
    expect(bus.listenerCount('life:lost')).toBe(0);
  });

  it('clear sonrası eski dinleyici artık çağrılmıyor', () => {
    const bus = new EventBus();
    const eski = vi.fn();

    bus.on('gold:changed', eski);
    bus.clear();
    bus.emit('gold:changed', { total: 100 });

    expect(eski).not.toHaveBeenCalled();
  });

  it('clear sonrası yeniden eklenen dinleyici çağrılıyor', () => {
    // `clear` fazla agresif olup emitter'ı kullanılamaz bırakırsa bu yakalar.
    // Sahne yeniden başlatmada tam olarak bu olur: shutdown temizler,
    // sonraki create yeniden abone olur.
    const bus = new EventBus();

    bus.on('gold:changed', vi.fn());
    bus.clear();

    const yeni = vi.fn();
    bus.on('gold:changed', yeni);
    bus.emit('gold:changed', { total: 280 });

    expect(yeni).toHaveBeenCalledTimes(1);
    expect(yeni).toHaveBeenCalledWith({ total: 280 });
    expect(bus.listenerCount('gold:changed')).toBe(1);
  });

  it('art arda clear çağrıları birikmiyor', () => {
    const bus = new EventBus();

    for (let i = 0; i < 5; i++) {
      bus.on('wave:started', vi.fn());
      bus.clear();
    }
    const son = vi.fn();
    bus.on('wave:started', son);
    bus.emit('wave:started', { index: 1 });

    // Beş tur sonrası tek dinleyici olmalı — dinleyici sızıntısının
    // saf mantık tarafındaki karşılığı.
    expect(bus.listenerCount('wave:started')).toBe(1);
    expect(son).toHaveBeenCalledTimes(1);
  });
});

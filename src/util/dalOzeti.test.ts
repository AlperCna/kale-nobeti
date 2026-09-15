/**
 * Dal özeti — S93. Metin `towers.ts`'ten **üretiliyor**; bu test
 * üretimin doğru alanları seçtiğini bağlıyor, cümleyi ezberlemiyor.
 */
import { describe, expect, it } from 'vitest';
import { dalOzeti, etkiMetni } from './dalOzeti';
import { BUYU, OKCU, TOP } from '../data/towers';

describe('dalOzeti — T3 seçimi satın almadan önce okunabilir', () => {
  it('Top: iki dalın DPS’i aynı, fark menzil ve patlamada', () => {
    const havan = dalOzeti('Havan', TOP.branches[0]);
    const barut = dalOzeti('Barut Fıçısı', TOP.branches[1]);
    // Faz 2'nin tasarım iddiası: eşit DPS, farklı geometri.
    expect(havan).toContain('DPS 21.6');
    expect(barut).toContain('DPS 21.6');
    expect(havan).toContain('menzil 230');
    expect(barut).toContain('menzil 150');
    expect(havan).toContain('patlama 55');
    expect(barut).toContain('patlama 85');
  });

  it('patlaması olmayan dal "patlama" yazmıyor', () => {
    expect(dalOzeti('Keskin Nişancı', OKCU.branches[0])).not.toContain('patlama');
  });

  it('etkisi olan dal etkisini yazıyor', () => {
    expect(dalOzeti('Kundakçı', OKCU.branches[1])).toContain('Yanma');
    expect(dalOzeti('Buz', BUYU.branches[1])).toContain('Yavaşlatma');
    expect(dalOzeti('Yıldırım', BUYU.branches[0])).toContain('Zincir');
  });

  it('uçana vuramayan dal bunu YAZIYOR — kategorik delik', () => {
    // Bugün altı T3 dalının hepsi uçana vuruyor (S91), yani bu satır
    // görünmüyor. Sözleşme yine de bağlı: bir dal yeniden kapatılırsa
    // oyuncu bunu satın almadan önce görmeli.
    const kapali = { ...TOP.branches[0], airMultiplier: 0 as const };
    expect(dalOzeti('Havan', kapali)).toContain('Uçana vurmaz');
    expect(dalOzeti('Havan', TOP.branches[0])).not.toContain('Uçana vurmaz');
  });

  it('etkiMetni üç etki türünü de yazıyor', () => {
    expect(etkiMetni({ kind: 'burn', dps: 7, seconds: 4 })).toBe('Yanma 7/sn · 4 sn');
    expect(etkiMetni({ kind: 'slow', factor: 0.3, seconds: 2 })).toBe('Yavaşlatma %30 · 2 sn');
    expect(etkiMetni({ kind: 'chain', targets: 3, falloff: 0.7 })).toBe('Zincir ×3');
  });
});

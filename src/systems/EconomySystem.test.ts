import { describe, it, expect, vi } from 'vitest';
import { EconomySystem } from './EconomySystem';
import { EventBus } from './EventBus';
import { MAP_1 } from '../data/maps';
import { GOBLIN, ORK_SAVASCI } from '../data/enemies';
import { OKCU, TOP } from '../data/towers';
import { BALANCE } from '../data/balance';
import type { MapDef } from '../types/map';

function kur(map: MapDef = MAP_1) {
  const bus = new EventBus();
  return { bus, eco: new EconomySystem(map, bus) };
}

describe('EconomySystem — başlangıç', () => {
  it('harita 1: 280 altın, 20 can (§6, §9)', () => {
    const { eco } = kur();
    expect(eco.gold).toBe(280);
    expect(eco.lives).toBe(20);
    expect(eco.isDefeated).toBe(false);
  });

  it('başlangıç altını haritadan geliyor', () => {
    const sahteHarita: MapDef = { ...MAP_1, startGold: 400 };
    expect(kur(sahteHarita).eco.gold).toBe(400);
  });
});

describe('EconomySystem — harcama', () => {
  it('yeterli altınla harcanıyor ve gold:changed yayılıyor', () => {
    const { eco, bus } = kur();
    const dinleyici = vi.fn();
    bus.on('gold:changed', dinleyici);

    expect(eco.spend(OKCU.tiers[0].cost)).toBe(true);
    expect(eco.gold).toBe(280 - 70);
    expect(dinleyici).toHaveBeenCalledWith({ total: 210 });
  });

  it('yetersiz altında false döner ve altın DEĞİŞMEZ', () => {
    const { eco, bus } = kur();
    const dinleyici = vi.fn();
    bus.on('gold:changed', dinleyici);

    expect(eco.spend(9999)).toBe(false);
    expect(eco.gold).toBe(280);
    expect(dinleyici).not.toHaveBeenCalled();
  });

  it('altın NEGATİFE düşmüyor — art arda harcama', () => {
    const { eco } = kur();
    for (let i = 0; i < 20; i++) eco.spend(TOP.tiers[0].cost);
    expect(eco.gold).toBeGreaterThanOrEqual(0);
  });

  it('tam altınla harcama geçiyor', () => {
    const { eco } = kur();
    expect(eco.spend(280)).toBe(true);
    expect(eco.gold).toBe(0);
    expect(eco.canAfford(1)).toBe(false);
    expect(eco.canAfford(0)).toBe(true);
  });

  it('negatif maliyet reddediliyor', () => {
    const { eco } = kur();
    expect(eco.spend(-100)).toBe(false);
    expect(eco.gold).toBe(280);
  });
});

describe('EconomySystem — öldürme altını', () => {
  it('goblin 3, ork 6 (§5)', () => {
    const { eco } = kur();
    eco.award(GOBLIN);
    expect(eco.gold).toBe(283);
    eco.award(ORK_SAVASCI);
    expect(eco.gold).toBe(289);
  });

  it('goldMultiplier uygulanıyor — §9 altın çarpanı = HP çarpanı', () => {
    // Harita 2 çarpanı 1.6. Uygulanmasaydı harita 3'te altın/HP oranı
    // %38'e düşer ve 12 nokta doldurulamazdı.
    const harita2: MapDef = { ...MAP_1, goldMultiplier: 1.6 };
    const { eco } = kur(harita2);
    eco.award(ORK_SAVASCI); // 6 × 1.6 = 9.6 → 10
    expect(eco.gold).toBe(280 + 10);
  });

  it('dalga bitiş bonusu 30 + 5n (§6)', () => {
    const { eco } = kur();
    expect(eco.awardWaveEnd(1)).toBe(35);
    expect(eco.gold).toBe(315);
    expect(eco.awardWaveEnd(10)).toBe(80);
    expect(eco.gold).toBe(395);
  });
});

describe('EconomySystem — satış (%70, kümülatif)', () => {
  it('harcanan TOPLAMIN %70\'i — tek kademenin değil (§4.5)', () => {
    const { eco } = kur();
    // T1 (70) sonra T2 (110) → toplam 180 harcandı.
    expect(eco.buyAt(3, OKCU.tiers[0].cost)).toBe(true);
    expect(eco.buyAt(3, OKCU.tiers[1].cost)).toBe(true);
    expect(eco.spentAt(3)).toBe(180);

    const iade = eco.sellAt(3);
    expect(iade).toBe(Math.floor(180 * 0.7)); // 126
    expect(eco.spentAt(3)).toBe(0);
  });

  it('iade AŞAĞI yuvarlanıyor — sat-al döngüsüyle altın üretilemiyor', () => {
    const { eco } = kur();
    expect(eco.sellRefund(1)).toBe(0);
    expect(eco.sellRefund(10)).toBe(7);
    expect(eco.sellRefund(70)).toBe(49);
    // %70 iade zaten kayıp; yukarı yuvarlansaydı küçük tutarlarda
    // sat-al döngüsü kâr üretebilirdi.
    for (const h of [1, 3, 7, 13, 70, 180]) {
      expect(eco.sellRefund(h)).toBeLessThan(h);
    }
  });

  it('satış sonrası altın gerçekten artıyor', () => {
    const { eco } = kur();
    eco.buyAt(0, 70);
    const oncesi = eco.gold;
    const iade = eco.sellAt(0);
    expect(eco.gold).toBe(oncesi + iade);
    expect(iade).toBe(49);
  });

  it('boş noktayı satmak 0 veriyor', () => {
    const { eco } = kur();
    expect(eco.sellAt(5)).toBe(0);
    expect(eco.gold).toBe(280);
  });

  it('aynı noktayı iki kez satmak altın basmıyor', () => {
    const { eco } = kur();
    eco.buyAt(2, 70);
    const ilk = eco.sellAt(2);
    const ikinci = eco.sellAt(2);
    expect(ilk).toBe(49);
    expect(ikinci).toBe(0);
  });

  it('yetersiz altında buyAt harcama YAZMIYOR', () => {
    const { eco } = kur();
    expect(eco.buyAt(1, 9999)).toBe(false);
    expect(eco.spentAt(1)).toBe(0);
  });

  it('noktalar birbirine karışmıyor', () => {
    const { eco } = kur();
    eco.buyAt(0, 70);
    eco.buyAt(1, 110);
    expect(eco.spentAt(0)).toBe(70);
    expect(eco.spentAt(1)).toBe(110);
  });
});

describe('EconomySystem — can', () => {
  it('can düşüyor ve life:lost yayılıyor', () => {
    const { eco, bus } = kur();
    const dinleyici = vi.fn();
    bus.on('life:lost', dinleyici);

    expect(eco.loseLife(1)).toBe(1);
    expect(eco.lives).toBe(19);
    expect(dinleyici).toHaveBeenCalledWith({ remaining: 19 });
  });

  it('boss sızması 10 can götürüyor (§5)', () => {
    const { eco } = kur();
    eco.loseLife(10);
    expect(eco.lives).toBe(10);
  });

  it('can 0\'ın ALTINA inmiyor', () => {
    const { eco } = kur();
    expect(eco.loseLife(25)).toBe(20); // yalnız 20 düşebilir
    expect(eco.lives).toBe(0);
    expect(eco.isDefeated).toBe(true);
    expect(eco.loseLife(5)).toBe(0);
    expect(eco.lives).toBe(0);
  });

  it('0 veya negatif can kaybı yok sayılıyor', () => {
    const { eco } = kur();
    expect(eco.loseLife(0)).toBe(0);
    expect(eco.loseLife(-3)).toBe(0);
    expect(eco.lives).toBe(20);
  });

  it('başlangıç canı BALANCE\'tan geliyor', () => {
    expect(kur().eco.lives).toBe(BALANCE.startLives);
  });
});

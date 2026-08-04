import { describe, it, expect, vi } from 'vitest';
import { ProjectileSystem } from './ProjectileSystem';
import { Pool } from '../util/pool';
import type { Poolable } from '../util/pool';
import type { ProjectileState } from '../types/projectile';
import type { Targetable } from '../types/enemy';
import { GOBLIN } from '../data/enemies';
import { GECICI_MERMI_HIZI, MERMI_ISABET_YARICAPI } from '../data/balance';

class SahteMermi implements ProjectileState, Poolable {
  x = 0;
  y = 0;
  target: Targetable | null = null;
  damage = 0;
  damageType: ProjectileState['damageType'] = 'physical';
  speed = 0;
  splashRadius = 0;
  hitRadius = 0;
  alive = false;
  lastKnownX = 0;
  lastKnownY = 0;
  sifirlamaSayisi = 0;

  resetForPool(): void {
    this.target = null;
    this.damage = 0;
    this.speed = 0;
    this.splashRadius = 0;
    this.hitRadius = 0;
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.lastKnownX = 0;
    this.lastKnownY = 0;
    this.sifirlamaSayisi++;
  }
}

type MutTargetable = { -readonly [K in keyof Targetable]: Targetable[K] };

function dusman(o: Partial<Targetable> = {}): MutTargetable {
  return {
    x: 100,
    y: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    remainingDistance: 500,
    def: GOBLIN,
    ...o,
  };
}

function kur(prealloc = 20) {
  const pool = new Pool<SahteMermi>(() => new SahteMermi(), prealloc);
  const onDamage = vi.fn();
  const sys = new ProjectileSystem(pool, onDamage);
  return { pool, sys, onDamage };
}

function at(sys: ProjectileSystem<SahteMermi>, o: Partial<ProjectileState> = {}) {
  return sys.fire({
    x: 0,
    y: 0,
    target: null,
    damage: 6,
    damageType: 'physical',
    speed: GECICI_MERMI_HIZI,
    splashRadius: 0,
    hitRadius: MERMI_ISABET_YARICAPI,
    ...o,
  });
}

describe('ProjectileSystem — hareket ve isabet', () => {
  it('hedefe varıyor ve hasar veriyor', () => {
    const { sys, onDamage, pool } = kur();
    const hedef = dusman({ x: 100, y: 0 });
    at(sys, { target: hedef });

    for (let i = 0; i < 30 && pool.activeCount > 0; i++) sys.update(1000 / 60, [hedef]);

    expect(onDamage).toHaveBeenCalledTimes(1);
    expect(onDamage.mock.calls[0]?.[0]).toBe(hedef);
    expect(pool.activeCount).toBe(0);
  });

  it('zırh uygulanıyor — Okçu T1 (6) Ork Savaşçı\'ya (zırh 2) 4', () => {
    const { sys, onDamage } = kur();
    const ork = dusman({ def: { ...GOBLIN, armor: 2 } });
    at(sys, { target: ork, damage: 6 });
    for (let i = 0; i < 30; i++) sys.update(1000 / 60, [ork]);
    expect(onDamage.mock.calls[0]?.[1]).toEqual({ dealt: 4, floored: false });
  });

  it('mermi hedefe doğru ilerliyor', () => {
    const { sys } = kur();
    const hedef = dusman({ x: 600, y: 0 });
    const m = at(sys, { target: hedef })!;
    sys.update(1000 / 60, [hedef]);
    expect(m.x).toBeCloseTo(GECICI_MERMI_HIZI / 60, 6);
    expect(m.y).toBe(0);
  });

  it('hareketli hedefi takip ediyor', () => {
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 200, y: 0 });
    at(sys, { target: hedef });
    for (let i = 0; i < 60; i++) {
      hedef.y += 2; // düşman yana kaçıyor
      sys.update(1000 / 60, [hedef]);
    }
    expect(onDamage).toHaveBeenCalled();
  });
});

describe('ProjectileSystem — TÜNELLEME', () => {
  it('30 FPS + 2× hızda hedefin içinden geçmiyor', () => {
    // Kritik senaryo: scaledDelta 66 ms, mermi karede 40 px atlıyor,
    // isabet yarıçapı 12 px. Nokta-mesafe kontrolü ıskalardı.
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 100, y: 0 });
    at(sys, { target: hedef });

    const scaledDelta = (1000 / 30) * 2; // 66,67 ms
    for (let i = 0; i < 10; i++) sys.update(scaledDelta, [hedef]);

    expect(onDamage).toHaveBeenCalledTimes(1);
  });

  it('süpürülmüş kontrol: hedefin tam üstünden geçen mermi vuruyor', () => {
    // Mermi tek karede hedefi 40 px aşacak şekilde ayarlandı.
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 20, y: 0 });
    at(sys, { target: hedef, x: 0, y: 0, speed: 6000 });
    sys.update(1000 / 60, [hedef]); // 100 px'lik adım, hedef 20 px'te
    expect(onDamage).toHaveBeenCalledTimes(1);
  });

  it('yandan 40 px geçen mermi ıskalıyor — yanlış pozitif yok', () => {
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 50, y: 40 }); // yoldan 40 px uzakta
    // Mermi düz sağa gidiyor, hedefe kilitli değil.
    at(sys, { target: null, x: 0, y: 0, speed: 6000 });
    sys.update(1000 / 60, [hedef]);
    expect(onDamage).not.toHaveBeenCalled();
  });

  it('yavaş mermi de aynı sonucu veriyor — kare boyutundan bağımsız', () => {
    for (const kareSuresi of [1000 / 144, 1000 / 60, 1000 / 30, (1000 / 30) * 2]) {
      const { sys, onDamage } = kur();
      const hedef = dusman({ x: 300, y: 0 });
      at(sys, { target: hedef });
      for (let i = 0; i < 200; i++) sys.update(kareSuresi, [hedef]);
      expect(onDamage, `kare=${kareSuresi.toFixed(1)}ms`).toHaveBeenCalledTimes(1);
    }
  });
});

describe('ProjectileSystem — hedef havadayken ölürse (S21)', () => {
  it('son bilinen konuma gidip sönümleniyor, hasar YOK', () => {
    const { sys, onDamage, pool } = kur();
    const hedef = dusman({ x: 300, y: 0 });
    at(sys, { target: hedef });

    sys.update(1000 / 60, [hedef]); // son bilinen konum kaydedildi
    hedef.alive = false;

    for (let i = 0; i < 60 && pool.activeCount > 0; i++) sys.update(1000 / 60, [hedef]);

    expect(onDamage).not.toHaveBeenCalled();
    expect(pool.activeCount).toBe(0); // sönümlendi, havuza döndü
  });

  it('alan hasarlı mermi hedefi ölse bile PATLIYOR', () => {
    const { sys, onDamage, pool } = kur();
    const olen = dusman({ x: 300, y: 0 });
    const yakin = dusman({ x: 320, y: 0 });
    at(sys, { target: olen, splashRadius: 45 });

    sys.update(1000 / 60, [olen, yakin]);
    olen.alive = false;

    for (let i = 0; i < 60 && pool.activeCount > 0; i++) sys.update(1000 / 60, [olen, yakin]);

    // Ölen vurulmuyor (alive false), yakındaki vuruluyor.
    expect(onDamage).toHaveBeenCalledTimes(1);
    expect(onDamage.mock.calls[0]?.[0]).toBe(yakin);
  });

  it('hedefsiz mermi (target null) sönümleniyor', () => {
    const { sys, pool } = kur();
    at(sys, { target: null, x: 0, y: 0 });
    sys.update(1000 / 60, []);
    expect(pool.activeCount).toBe(0);
  });
});

describe('ProjectileSystem — alan hasarı (M2-T09)', () => {
  it('yarıçap içindeki TÜM düşmanlar hasar alıyor', () => {
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 200, y: 0 });
    const yakin1 = dusman({ x: 220, y: 0 }); // 20 px
    const yakin2 = dusman({ x: 200, y: 30 }); // 30 px
    const uzak = dusman({ x: 400, y: 0 }); // 200 px

    at(sys, { target: hedef, splashRadius: 45, damage: 22 });
    for (let i = 0; i < 60; i++) sys.update(1000 / 60, [hedef, yakin1, yakin2, uzak]);

    const vurulanlar = onDamage.mock.calls.map((c) => c[0]);
    expect(vurulanlar).toContain(hedef);
    expect(vurulanlar).toContain(yakin1);
    expect(vurulanlar).toContain(yakin2);
    expect(vurulanlar).not.toContain(uzak);
    expect(onDamage).toHaveBeenCalledTimes(3);
  });

  it('yarıçap sınırındaki düşman DAHİL', () => {
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 200, y: 0 });
    const sinirda = dusman({ x: 245, y: 0 }); // tam 45
    at(sys, { target: hedef, splashRadius: 45 });
    for (let i = 0; i < 60; i++) sys.update(1000 / 60, [hedef, sinirda]);
    expect(onDamage.mock.calls.map((c) => c[0])).toContain(sinirda);
  });

  it('ölü düşman patlamadan etkilenmiyor', () => {
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 200, y: 0 });
    const olu = dusman({ x: 210, y: 0, alive: false });
    at(sys, { target: hedef, splashRadius: 45 });
    for (let i = 0; i < 60; i++) sys.update(1000 / 60, [hedef, olu]);
    expect(onDamage).toHaveBeenCalledTimes(1);
  });

  it('splashRadius 0 → yalnız hedef', () => {
    const { sys, onDamage } = kur();
    const hedef = dusman({ x: 200, y: 0 });
    const yakin = dusman({ x: 205, y: 0 });
    at(sys, { target: hedef, splashRadius: 0 });
    for (let i = 0; i < 60; i++) sys.update(1000 / 60, [hedef, yakin]);
    expect(onDamage).toHaveBeenCalledTimes(1);
    expect(onDamage.mock.calls[0]?.[0]).toBe(hedef);
  });
});

describe('ProjectileSystem — havuz (TIER 1 kural 3)', () => {
  it('havuz dolunca fire null döner, yeni nesne yaratılmıyor', () => {
    const { sys, pool } = kur(3);
    const hedef = dusman({ x: 5000, y: 0 });
    expect(at(sys, { target: hedef })).not.toBeNull();
    expect(at(sys, { target: hedef })).not.toBeNull();
    expect(at(sys, { target: hedef })).not.toBeNull();
    expect(at(sys, { target: hedef })).toBeNull();
    expect(pool.capacity).toBe(3);
  });

  it('isabet sonrası resetForPool çağrılıyor — target null', () => {
    const { sys, pool } = kur();
    const hedef = dusman({ x: 100, y: 0 });
    const m = at(sys, { target: hedef })!;
    for (let i = 0; i < 30 && pool.activeCount > 0; i++) sys.update(1000 / 60, [hedef]);

    expect(m.target).toBeNull(); // ölü düşmanı canlı tutmuyor
    expect(m.alive).toBe(false);
    expect(m.damage).toBe(0);
    expect(m.splashRadius).toBe(0);
    expect(m.sifirlamaSayisi).toBeGreaterThan(1);
  });

  it('uzun atışta activeCount DENGEYE oturuyor, birikmiyor', () => {
    // Her karede bir mermi atılıyor ve her mermi ~10 karede varıyor →
    // havada sürekli ~10 mermi olması DOĞRU. Sızıntı testi "sıfıra iner"
    // değil, "sabitlenir" olmalı — ilk yazımda `< 5` bekleyip kırdım.
    const { sys, pool } = kur(200);
    const hedef = dusman({ x: 100, y: 0 });

    for (let tur = 0; tur < 50; tur++) {
      at(sys, { target: hedef });
      sys.update(1000 / 60, [hedef]);
    }
    const erken = pool.activeCount;

    for (let tur = 0; tur < 500; tur++) {
      at(sys, { target: hedef });
      sys.update(1000 / 60, [hedef]);
    }
    const gec = pool.activeCount;

    expect(gec).toBe(erken); // denge noktası kaymıyor
    expect(gec).toBeLessThan(15);
    expect(pool.capacity).toBe(200);
  });

  it('atış durunca hepsi havuza dönüyor', () => {
    const { sys, pool } = kur(200);
    const hedef = dusman({ x: 100, y: 0 });
    for (let tur = 0; tur < 50; tur++) {
      at(sys, { target: hedef });
      sys.update(1000 / 60, [hedef]);
    }
    expect(pool.activeCount).toBeGreaterThan(0);

    for (let i = 0; i < 60; i++) sys.update(1000 / 60, [hedef]);
    expect(pool.activeCount).toBe(0);
  });

  it('releaseAll hepsini geri veriyor', () => {
    const { sys, pool } = kur();
    const hedef = dusman({ x: 5000, y: 0 });
    at(sys, { target: hedef });
    at(sys, { target: hedef });
    sys.releaseAll();
    expect(pool.activeCount).toBe(0);
  });

  it('0 veya negatif kare süresi durumu bozmuyor', () => {
    const { sys, pool } = kur();
    const hedef = dusman({ x: 300, y: 0 });
    const m = at(sys, { target: hedef })!;
    sys.update(0, [hedef]);
    sys.update(-16, [hedef]);
    expect(m.x).toBe(0);
    expect(pool.activeCount).toBe(1);
  });
});

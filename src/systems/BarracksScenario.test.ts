/**
 * `M5-T06` — karşı-oyun tablosunun "Trol → **Kışla ile tut** + yoğun tek
 * hedef" satırının **ölçülmesi**.
 *
 * M4'te bu satır "geçti (kışla M5)" diye işaretlenmişti: kule kısmı
 * ölçülmüştü, engelleme kısmı yoktu. Burası eksik yarısını kapatıyor.
 *
 * ## Ölçüm neden ikiye bölündü
 *
 * İlk denemede tek ölçüm kullanıldı (kule ateş ediyor + menzilde geçen
 * süre) ve kışlalı koşu **daha kötü** çıktı. Sebep ölçüm hatası değildi:
 * kışlalı koşuda Trol ölüyordu, o yüzden menzilde daha az kalıyordu. Yani
 * metrik, kışla işini iyi yaptıkça kötüleşiyordu.
 *
 * - **A — kazanılan zaman:** kule ateş etmiyor. İki koşuda da Trol hayatta;
 *   tek fark kışla. "Zaman kazandırır" iddiasının izole ölçümü.
 * - **B — sonuç:** kule ateş ediyor. Sızıyor mu, ölüyor mu.
 */

import { describe, expect, it } from 'vitest';
import { MAP_1 } from '../data/maps';
import { TROL } from '../data/enemies';
import { KISLA, barracksTierAt, SOLDIER_SPEED } from '../data/barracks';
import { OKCU } from '../data/towers';
import { PathSystem } from './PathSystem';
import { PathMover } from './movers';
import { defaultRally, spawnSoldier, stepSoldiers } from './BarracksSystem';
import { applyDamage } from './combat';
import { distSq } from '../util/math';
import type { BlockableEnemy, SoldierState } from '../types/barracks';
import type { EnemyState } from '../types/enemy';
import type { Vec2 } from '../types/common';

const KARE_MS = 1000 / 60;
const YOL = MAP_1.paths[0]!;

/** Kapsaması en yüksek yapı noktası — kule ve kışla oraya kuruluyor. */
const EN_IYI_INDEKS = [...MAP_1.coverage].sort((a, b) => b.coveredPx - a.coveredPx)[0]!.spotIndex;
const NOKTA: Vec2 = MAP_1.buildSpots[EN_IYI_INDEKS]!;

type SimTrol = EnemyState & BlockableEnemy;

function trolYap(mover: PathMover): SimTrol {
  return {
    def: TROL,
    hp: TROL.hp * MAP_1.hpMultiplier,
    maxHp: TROL.hp * MAP_1.hpMultiplier,
    speed: TROL.speed,
    speedFactor: 1,
    progress: mover.spawnProgress(),
    blockedBy: null,
    alive: true,
    x: 0,
    y: 0,
  };
}

function askerYap(): SoldierState {
  return {
    x: 0,
    y: 0,
    hp: 0,
    maxHp: 0,
    dps: 0,
    engagedWith: null,
    home: { x: 0, y: 0 },
    rally: { x: 0, y: 0 },
    state: 'dead',
    respawnLeft: 0,
    shield: 0,
    evasion: 0,
    lifetimeLeft: Number.POSITIVE_INFINITY,
    speed: SOLDIER_SPEED,
    alive: false,
    flipX: false,
  };
}

/** Kışla yapılandırması: hangi kademe, kaç kışla. */
interface Kurulum {
  /** `null` = kışla yok. */
  readonly tier: 0 | 1 | 2 | 3 | null;
  readonly kislaSayisi: number;
}

interface Sonuc {
  /** Trol'ün kule menzilinde geçirdiği süre. Birim: saniye. */
  menzildeSn: number;
  yenenHasar: number;
  sizdiMi: boolean;
  kalanHp: number;
}

/**
 * Trol'ü Harita 1'in gerçek yolunda yürütür.
 *
 * Kule: `NOKTA`'da bir **Okçu T2** — §5'in "yoğun tek hedef" satırının en
 * zayıf hâli, yani kışlanın katkısının en görünür olduğu durum.
 */
function kosu(kurulum: Kurulum, kuleAtesEdiyor = true, sureSn = 240): Sonuc {
  const path = new PathSystem(YOL);
  const mover = new PathMover(path);
  const trol = trolYap(mover);

  const kuleKademe = OKCU.tiers[1];
  const menzilKare = kuleKademe.range * kuleKademe.range;
  const kuleDpsSaniyelik = kuleAtesEdiyor
    ? applyDamage(kuleKademe.damage, OKCU.damageType, TROL).dealt * kuleKademe.fireRate
    : 0;

  const askerler: SoldierState[] = [];
  let respawn = 8;
  if (kurulum.tier !== null) {
    const kademe = barracksTierAt(KISLA, kurulum.tier);
    respawn = kademe.respawnSeconds;
    // §4.4 sinerji: iki kışlanın toplanma noktası AYNI yere konuyor.
    const rally = defaultRally(NOKTA, [YOL]);
    let sira = 0;
    for (let k = 0; k < kurulum.kislaSayisi; k++) {
      for (let i = 0; i < kademe.soldierCount; i++) {
        const s = askerYap();
        spawnSoldier(s, NOKTA, { x: rally.x + (sira - 1) * 10, y: rally.y }, {
          hp: kademe.soldierHp,
          dps: kademe.soldierDps,
          evasion: kademe.evasion ?? 0,
          speed: SOLDIER_SPEED,
        });
        askerler.push(s);
        sira++;
      }
    }
  }

  let menzildeSn = 0;
  let yenenHasar = 0;
  const kare = Math.round((sureSn * 1000) / KARE_MS);
  const dt = KARE_MS / 1000;

  for (let i = 0; i < kare; i++) {
    if (askerler.length > 0) stepSoldiers(askerler, [trol], KARE_MS, respawn);

    mover.step(trol, KARE_MS);
    const p = mover.positionAt(trol);
    // `BlockableEnemy.x/y` salt okunur (hedefleme onları yazmıyor); burada
    // konumu hareket sistemi belirliyor, o yüzden yazılabilir görünüm.
    const yazilabilir = trol as { x: number; y: number };
    yazilabilir.x = p.x;
    yazilabilir.y = p.y;

    // Trol yenilenmesi (§5, 6 HP/sn) — kışlanın işini zorlaştırıyor.
    if (trol.hp > 0 && trol.hp < trol.maxHp) {
      trol.hp = Math.min(trol.maxHp, trol.hp + 6 * dt);
    }

    if (distSq(NOKTA, trol) <= menzilKare && trol.hp > 0) {
      menzildeSn += dt;
      const hasar = kuleDpsSaniyelik * dt;
      trol.hp -= hasar;
      yenenHasar += hasar;
      if (trol.hp <= 0) {
        trol.hp = 0;
        trol.alive = false;
      }
    }

    if (mover.reachedEnd(trol) && trol.hp > 0) {
      return { menzildeSn, yenenHasar, sizdiMi: true, kalanHp: trol.hp };
    }
    if (trol.hp <= 0) break;
  }

  return { menzildeSn, yenenHasar, sizdiMi: false, kalanHp: trol.hp };
}

const KISLASIZ: Kurulum = { tier: null, kislaSayisi: 0 };
const TABAN = kosu(KISLASIZ, false).menzildeSn;

/**
 * **Birleşik ölçüt.** Planın tek ölçütü ("menzilde geçen süre ≥ %50 artmalı")
 * kışla işini *çok iyi* yaptığında tersine dönüyor: Trol ölürse menzilde
 * geçen süre kısalıyor. İki ölçüm birlikte kullanılıyor:
 *
 *     başarı = (Trol ölüyor) VEYA (menzilde süre ≥ %50 uzun)
 *
 * Ölmek zaten "sonsuz zaman kazanıldı" demek; ölçüt bu yüzden bozulmuyor.
 */
function basarili(k: Kurulum): boolean {
  const oldu = !kosu(k, true).sizdiMi;
  const kazanc = kosu(k, false).menzildeSn / TABAN - 1;
  return oldu || kazanc >= 0.5;
}

const kazanc = (k: Kurulum): number => kosu(k, false).menzildeSn / TABAN - 1;

describe('M5-T06 · A — kışlanın kazandırdığı zaman', () => {
  it('taban ölçüldü: kışlasız Trol kule menzilinde ~15,3 sn', () => {
    expect(TABAN).toBeCloseTo(15.3, 0);
  });

  it('kışla her yapılandırmada menzilde geçen süreyi ARTIRIYOR', () => {
    for (const t of [0, 1, 2, 3] as const) {
      expect(kazanc({ tier: t, kislaSayisi: 1 })).toBeGreaterThan(0);
    }
  });

  it('TEK T1/T2 kışla planın %50 hedefini TUTTURAMIYOR — %13 ve %22', () => {
    // **Başarısızlık değil, ölçüm.** Sayı S66'dan (düşmanın askere verdiği
    // hasar, türetilmiş) çıkıyor: Trol 45 DPS vuruyor, T2 askeri 75 HP ile
    // 1,67 sn dayanıyor, iki asker toplam 3,3 sn.
    // **Türetilmiş sayı testi geçirmek için OYNATILMADI.**
    expect(kazanc({ tier: 0, kislaSayisi: 1 })).toBeLessThan(0.5);
    expect(kazanc({ tier: 1, kislaSayisi: 1 })).toBeLessThan(0.5);
  });

  it('kışla sayısı arttıkça kazanılan zaman monoton artıyor (T1)', () => {
    const bir = kazanc({ tier: 0, kislaSayisi: 1 });
    const iki = kazanc({ tier: 0, kislaSayisi: 2 });
    const uc = kazanc({ tier: 0, kislaSayisi: 3 });
    expect(iki).toBeGreaterThan(bir);
    expect(uc).toBeGreaterThan(iki);
  });
});

describe('M5-T06 · B — "Trol → Kışla ile tut" satırı sağlanıyor mu', () => {
  it('kışlasız Trol SIZIYOR ve TAM CANLA varıyor', () => {
    const r = kosu(KISLASIZ, true);
    expect(r.sizdiMi).toBe(true);
    // Okçu T2 → Trol 7,80 DPS; yenilenme 6 HP/sn. Menzilden çıkınca
    // yediği 119 hasarın tamamını geri kazanıyor.
    expect(r.kalanHp).toBeCloseTo(TROL.hp * MAP_1.hpMultiplier, 0);
  });

  it('tek T1/T2/Paladin kışla YETMİYOR — Trol yine sızıyor', () => {
    expect(basarili({ tier: 0, kislaSayisi: 1 })).toBe(false);
    expect(basarili({ tier: 1, kislaSayisi: 1 })).toBe(false);
    expect(basarili({ tier: 2, kislaSayisi: 1 })).toBe(false);
  });

  it('TEK Haydutlar kışlası YETİYOR — %68 zaman kazancı', () => {
    // 3 asker × 70 HP × (1 / 0,75 kaçınma) = en çok "engelleme kütlesi".
    expect(basarili({ tier: 3, kislaSayisi: 1 })).toBe(true);
    expect(kazanc({ tier: 3, kislaSayisi: 1 })).toBeGreaterThan(0.5);
  });

  it('İKİ Paladin ve İKİ Haydutlar kışlası Trol’ü ÖLDÜRÜYOR', () => {
    expect(kosu({ tier: 2, kislaSayisi: 2 }, true).sizdiMi).toBe(false);
    expect(kosu({ tier: 3, kislaSayisi: 2 }, true).sizdiMi).toBe(false);
  });

  it('ÜÇ T2 kışla da yetiyor — %238 zaman kazancı', () => {
    expect(basarili({ tier: 1, kislaSayisi: 3 })).toBe(true);
  });

  it('kışla kule hasarını da artırıyor — "zaman kazandırır"ın sonucu', () => {
    const kislasiz = kosu(KISLASIZ, true).yenenHasar;
    expect(kosu({ tier: 3, kislaSayisi: 1 }, true).yenenHasar).toBeGreaterThan(kislasiz * 1.5);
  });
});

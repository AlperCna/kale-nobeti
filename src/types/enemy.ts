/**
 * Düşman durumu ve hareket stratejisi arayüzleri.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz. Bu ayrım sayesinde hareket mantığı
 * `node` ortamında test edilebiliyor — `Enemy` bir `Phaser.GameObjects`
 * alt sınıfı olduğu için kendisi test edilemez.
 */

import type { Vec2 } from './common';
import type { PathProgress } from './path';

/**
 * Düşman türleri. Kaynak: `GAME-DESIGN.md` §5 tablosu (9 satır).
 *
 * `types/map.ts` içindeydi (`MapDef.enemyRoster` için gerekiyordu);
 * M2'de düşman verisi gelince asıl yerine taşındı.
 */
export type EnemyId =
  | 'goblin'
  | 'orkSavasci'
  | 'zirhliOrk'
  | 'harpi'
  | 'kurtBinicisi'
  | 'saman'
  | 'trol'
  | 'orumcekAna'
  | 'ogreSef'
  /** Bölünmeden çıkar; kadroda ve dalga bütçesinde yer almaz (§5). */
  | 'orumcekYavrusu';

/**
 * Düşman özel yetenekleri. `GAME-DESIGN.md` §5 "Özellik" sütunu.
 *
 * Ayrık birleşim: her yeteneğin kendi alanları var, ortak "value" yok.
 */
export type EnemyAbility =
  /** Şaman: yakındakilere 8 HP/sn. **Yarıçap dokümanda yok — S37.** */
  | { readonly kind: 'heal'; readonly hps: number; readonly radius: number }
  /** Trol: 6 HP/sn kendini yeniler. */
  | { readonly kind: 'regen'; readonly hps: number }
  /** Örümcek Ana: ölünce 3× yavru. */
  | { readonly kind: 'split'; readonly count: number; readonly childId: EnemyId };

/**
 * `GAME-DESIGN.md` §3: iki hasar tipi, iki savunma tipi. Kule
 * çeşitliliğinin **tek** kaynağı bu.
 *
 * `true` yalnız yeteneklerde — hiçbir şeyle azalmaz.
 */
export type DamageType = 'physical' | 'magic' | 'true';

/** Düşman tanımı. Kaynak: `GAME-DESIGN.md` §5 tablosu, `DATA-SCHEMAS.md`. */
export interface EnemyDef {
  readonly id: EnemyId;
  /** **Temel** can; harita `hpMultiplier` ile çarpılır (§9). */
  readonly hp: number;
  /** Yol üstünde ilerleme hızı. Birim: px/sn. */
  readonly speed: number;
  /** Fiziksel hasardan **sabit miktar** düşer (§3). */
  readonly armor: number;
  /** Büyü hasarını **yüzde** azaltır, 0..1 (§3). */
  readonly magicResist: number;
  /** **Temel** öldürme altını; harita `goldMultiplier` ile çarpılır (§9). */
  readonly gold: number;
  /** Dalga bütçesi maliyeti. Birim: puan (§7). */
  readonly points: number;
  /** Sızdığında düşen can. §5: normal 1, Trol/Örümcek Ana 2, boss 10. */
  readonly leakDamage: number;
  /** Uçar mı — yolu takip etmez, engellenemez (§5). */
  readonly flying: boolean;
  readonly ability?: EnemyAbility;
}

/**
 * Hareketin ihtiyaç duyduğu düşman durumu.
 *
 * `Enemy` bunu uygular ama testler düz bir nesneyle de uygulayabilir —
 * `Mover`'lar `Enemy` sınıfını değil bu şekli tanır.
 */
export interface EnemyState {
  /**
   * Bu düşmanın **kimliği** — havuzdan çıkarken atanır, dönerken `null`'lanır.
   *
   * Zırh, direnç, uçma, altın, puan hepsi buradan okunuyor. M1'de yalnız
   * `hp`/`speed` sayı olarak taşınıyordu; M2'de hedefleme uçma bilgisini,
   * `applyDamage` zırh/direnci istedi ve ham sayı taşımak sürdürülemez oldu.
   */
  def: EnemyDef | null;
  hp: number;
  maxHp: number;
  /** Birim: px/sn. Harita çarpanı uygulanmış hâli. */
  speed: number;
  /**
   * Yavaşlatma çarpanı, 0..1. Efekt sistemi yazıyor, `Mover` okuyor.
   *
   * Ayrı alan olmasının sebebi sadelik: `Mover` etkiler modülüne
   * bağlansaydı her hareket testi efekt sistemini de ayağa kaldırmak
   * zorunda kalırdı. Tek sayı taşımak yeterli.
   */
  speedFactor: number;
  progress: PathProgress;
  /**
   * Kışla askeri tarafından engellenmiş mi (`DEPENDENCIES.md` §7).
   *
   * **Alan M1'de tanımlanıyor, kullanımı M5'te.** `null` değilse `step`
   * ilerlemeyi atlar. Sonradan eklemek `PathSystem`'e ve her `Mover`'a
   * geri dönmek demekti; şimdi bir satır, sonra üç dosya.
   */
  blockedBy: object | null;
  alive: boolean;
}

/**
 * Hareket stratejisi. `Enemy`'den **ayrık** (`DEPENDENCIES.md` §2).
 *
 * `PathMover` M1'de, `LineMover` (uçanlar) M4'te aynı arayüzü uygular.
 * Ayrılmasaydı M4'te entity'yi yarmak gerekirdi.
 */
/**
 * `SpawnSystem`'in bir düşmandan beklediği yüzey.
 *
 * `Enemy` sınıfı değil **bu şekil** talep ediliyor: `SpawnSystem` `systems/`
 * altında ve `entities/Enemy`'yi çalışma zamanında içeri alsaydı TIER 1
 * kural 11'i delerdi. Testler bu arayüzü uygulayan düz bir nesne kullanıyor.
 */
export interface SpawnableEnemy extends EnemyState {
  /** @param hpMultiplier Harita çarpanı (`MapDef.hpMultiplier`, §9). */
  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void;
  step(scaledDelta: number): void;
  reachedEnd(): boolean;
}

/**
 * `selectTarget`'ın bir düşmandan gördüğü yüzey.
 *
 * `Enemy` sınıfı değil bu şekil talep ediliyor (TIER 1 kural 11) — hedefleme
 * `systems/` altında ve `node`'da test ediliyor. `x`/`y` Phaser'ın
 * `GameObject`'inden geliyor ama burada yalnız iki sayı.
 */
export interface Targetable {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  /** Kaleye kalan yol. `first`/`last` buna bakar (`GAME-DESIGN.md` §4.5). */
  readonly remainingDistance: number;
  readonly def: EnemyDef | null;
}

export interface Mover {
  /** @param scaledDelta `GameClock.scaledDelta`, birim ms (TIER 1 kural 8). */
  step(e: EnemyState, scaledDelta: number): void;
  /** Hedeflemenin (`first`/`last`) bakacağı sayı. Birim: px. */
  remainingDistance(e: EnemyState): number;
  /** Dünya koordinatı — çizim bunu kullanır. */
  positionAt(e: EnemyState): Vec2;
  /** Yolun/hattın sonuna vardı mı (kale). */
  reachedEnd(e: EnemyState): boolean;
  /** Doğum anındaki ilerleme durumu. */
  spawnProgress(): PathProgress;
}

import Phaser from 'phaser';
import type { BlockableEnemy, SoldierState, SoldierStateName } from '../types/barracks';
import type { Vec2 } from '../types/common';
import type { Poolable } from '../util/pool';
import { resetSoldierState } from '../systems/BarracksSystem';
import { SOLDIER_FRAME } from '../data/spriteFrames';

/**
 * **Havuzlu** — TIER 1 kural 3.
 *
 * **İnce sınıf.** Dokuz engelleme kuralının tamamı `BarracksSystem`'de ve
 * `node`'da test edilmiş durumda (TIER 1 kural 11); burada yalnız Phaser'a
 * bağlı olan kısım var: görüntü listesi, konum, görsel sıfırlama.
 *
 * `x`/`y` Phaser'ın kendi alanları; sistem onları doğrudan yazıyor —
 * `Projectile` ve `Enemy` ile aynı sözleşme.
 */
export class Soldier extends Phaser.GameObjects.Sprite implements SoldierState, Poolable {
  /** `Y08` — bkz. `Enemy.HAVUZ_ALANLARI`'ın başındaki gerekçe. */
  static readonly HAVUZ_ALANLARI: readonly string[] = [
    'Active',
    'Visible',
    'Position',
    'Alpha',
    'DisplaySize',
    'Angle',
    'Tint',
  ];

  hp = 0;
  maxHp = 0;
  dps = 0;
  engagedWith: BlockableEnemy | null = null;
  home: Vec2 = { x: 0, y: 0 };
  rally: Vec2 = { x: 0, y: 0 };
  state: SoldierStateName = 'dead';
  respawnLeft = 0;
  shield = 0;
  evasion = 0;
  lifetimeLeft = Number.POSITIVE_INFINITY;
  speed = 0;
  alive = false;

  /** Bu askeri çıkaran kışlanın yapı noktası; `-1` = Takviye askeri. */
  spotIndex = -1;

  readonly #size: number;

  constructor(scene: Phaser.Scene, size: number) {
    super(scene, 0, 0, 'atlas', SOLDIER_FRAME);
    this.#size = size;
    this.setDisplaySize(size, size);
    scene.add.existing(this);
    this.resetForPool();
  }

  /** Asker göründü — `spawnSoldier` alanları doldurduktan sonra. */
  activate(): void {
    this.setActive(true).setVisible(true).setAlpha(1);
  }

  /**
   * TIER 1 kural 3: **tüm** durum sıfırlanır.
   *
   * Mantıksal kısım `resetSoldierState`'te (Phaser'sız, test edilmiş) —
   * özellikle `engagedWith` **iki taraflı** temizleniyor: sıfırlanmayan
   * kilit ölü askeri düşmana bağlı bırakır ve düşman sonsuza kadar durur.
   */
  resetForPool(): void {
    resetSoldierState(this);
    this.spotIndex = -1;
    this.setActive(false).setVisible(false).setAlpha(1);
    this.setPosition(0, 0);
    this.setDisplaySize(this.#size, this.#size);
    this.setAngle(0);
    this.clearTint();
  }

  /** Can oranına göre soluklaşır — greybox geri bildirim, M6'da can çubuğu. */
  refreshVisual(): void {
    if (this.maxHp <= 0) return;
    const oran = this.hp / this.maxHp;
    this.setAlpha(0.4 + 0.6 * oran);
  }
}

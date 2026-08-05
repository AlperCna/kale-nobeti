import Phaser from 'phaser';
import type { BlockableEnemy, SoldierState, SoldierStateName } from '../types/barracks';
import type { Vec2 } from '../types/common';
import type { Poolable } from '../util/pool';
import { resetSoldierState } from '../systems/BarracksSystem';

/**
 * Greybox asker. **Havuzlu** — TIER 1 kural 3.
 *
 * **İnce sınıf.** Dokuz engelleme kuralının tamamı `BarracksSystem`'de ve
 * `node`'da test edilmiş durumda (TIER 1 kural 11); burada yalnız Phaser'a
 * bağlı olan kısım var: görüntü listesi, konum, görsel sıfırlama.
 *
 * `x`/`y` Phaser'ın kendi alanları; sistem onları doğrudan yazıyor —
 * `Projectile` ve `Enemy` ile aynı sözleşme.
 */
export class Soldier extends Phaser.GameObjects.Rectangle implements SoldierState, Poolable {
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

  readonly #baseColor: number;

  constructor(scene: Phaser.Scene, size: number, color: number) {
    super(scene, 0, 0, size, size, color);
    this.#baseColor = color;
    scene.add.existing(this);
    this.resetForPool();
  }

  /** Asker göründü — `spawnSoldier` alanları doldurduktan sonra. */
  activate(): void {
    this.setActive(true).setVisible(true).setAlpha(1).setFillStyle(this.#baseColor);
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
    this.setActive(false).setVisible(false).setAlpha(1).setFillStyle(this.#baseColor);
    this.setPosition(0, 0);
    this.setScale(1);
    this.setAngle(0);
  }

  /** Can oranına göre soluklaşır — greybox geri bildirim, M6'da can çubuğu. */
  refreshVisual(): void {
    if (this.maxHp <= 0) return;
    const oran = this.hp / this.maxHp;
    this.setAlpha(0.4 + 0.6 * oran);
  }
}

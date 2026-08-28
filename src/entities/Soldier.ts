import Phaser from 'phaser';
import type { BlockableEnemy, SoldierState, SoldierStateName } from '../types/barracks';
import type { Vec2 } from '../types/common';
import type { Poolable } from '../util/pool';
import { resetSoldierState } from '../systems/BarracksSystem';
import { SOLDIER_FRAME } from '../data/spriteFrames';

/**
 * `G05` — greybox döneminde `refreshVisual()` alfa ile soluyordu; gerçek
 * silüet sanatı geldikten sonra bu "yaralı asker hayalete dönüşüyor"
 * okumasını üretiyordu (bkz. görevin kendi bulgusu). Silüet artık **her
 * zaman tam opak**, can azaldıkça hafif vermilyona kayıyor — tam
 * vermilyona DEĞİL (`VERMILION_KARISIM_TAVANI < 1`), yoksa düşük canlı
 * bir asker düz kırmızı bir leke olurdu ve silüet detayı kaybolurdu.
 */
const BEYAZ = 0xffffff;
const VERMILION = 0xb03a2e;
const VERMILION_KARISIM_TAVANI = 0.55;

/** İki rengi `oran` (0-1) ile karıştırır — kanal başına doğrusal enterpolasyon. */
function renkKaristir(taban: number, hedef: number, oran: number): number {
  const tr = (taban >> 16) & 0xff;
  const tg = (taban >> 8) & 0xff;
  const tb = taban & 0xff;
  const hr = (hedef >> 16) & 0xff;
  const hg = (hedef >> 8) & 0xff;
  const hb = hedef & 0xff;
  const r = Math.round(tr + (hr - tr) * oran);
  const g = Math.round(tg + (hg - tg) * oran);
  const b = Math.round(tb + (hb - tb) * oran);
  return (r << 16) | (g << 8) | b;
}

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

  /**
   * `G05` — can oranına göre hafif vermilyona kayar, **opaklık sabit
   * kalır**. Eski alfa çözümü (`0.4 + 0.6*oran`) greybox döneminde
   * doğruydu; gerçek sanatla asker "hayalete" dönüşüyordu.
   */
  refreshVisual(): void {
    if (this.maxHp <= 0) return;
    const oran = this.hp / this.maxHp;
    this.setTint(renkKaristir(BEYAZ, VERMILION, (1 - oran) * VERMILION_KARISIM_TAVANI));
  }
}

import Phaser from 'phaser';
import type { Targetable } from '../types/enemy';
import type { TargetMode, TierIndex, TowerDef, TowerRuntime } from '../types/tower';
import { towerFrameKey } from '../data/spriteFrames';

/** Oyun içi gösterim boyutu — P03 brifi, kaynak kare 80×80'den küçültülüyor. */
const TOWER_DISPLAY_SIZE = 64;

/**
 * **Havuzlanmaz** (TIER 1 kural 3 mermi/düşman/parçacık/hasar sayısı için):
 * kule sayısı sabit ve az (harita başına 8-12), her biri oyun boyunca
 * yaşıyor. Havuzlamak sıfırlanacak alan sayısını artırıp hiçbir şey
 * kazandırmazdı.
 *
 * **İnce sınıf.** Ateş döngüsü `TowerSystem`'de ve `node`'da test edilmiş;
 * burada yalnız Phaser tarafı var. `TowerRuntime` şeklini uyguluyor.
 *
 * Dönüş animasyonu **yok** — `// GEÇİCİ — S23`. Kule anında ateş ediyor.
 * `research/01` "dönüş vergisi"ni %15-20 etkin DPS kaybı olarak ölçmüştü;
 * eklenirse denge sayıları yeniden bakılmalı.
 */
export class Tower extends Phaser.GameObjects.Container implements TowerRuntime {
  tierIndex: TierIndex = 0;
  targetMode: TargetMode = 'first';
  cooldownLeft = 0;
  target: Targetable | null = null;

  readonly #gorsel: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly spotIndex: number,
    x: number,
    y: number,
    readonly def: TowerDef,
  ) {
    super(scene, x, y);

    this.#gorsel = scene.add
      .image(0, 0, 'atlas', towerFrameKey(def.id, this.tierIndex))
      .setDisplaySize(TOWER_DISPLAY_SIZE, TOWER_DISPLAY_SIZE);

    this.add(this.#gorsel);
    scene.add.existing(this);
  }

  /** Yükseltme: kademe hem sayısal hem görsel değişir — ikisi ayrışırsa yanlış sprite kalır. */
  setTier(tierIndex: TierIndex): void {
    this.tierIndex = tierIndex;
    this.#gorsel.setFrame(towerFrameKey(this.def.id, tierIndex));
  }
}

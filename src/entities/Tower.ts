import Phaser from 'phaser';
import type { Targetable } from '../types/enemy';
import type { TargetMode, TowerDef, TowerRuntime } from '../types/tower';

/**
 * Greybox kule. Nihai sprite M6'da.
 *
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
  tierIndex: 0 | 1 = 0;
  targetMode: TargetMode = 'first';
  cooldownLeft = 0;
  target: Targetable | null = null;

  constructor(
    scene: Phaser.Scene,
    readonly spotIndex: number,
    x: number,
    y: number,
    readonly def: TowerDef,
    govdeRengi: number,
  ) {
    super(scene, x, y);

    const taban = scene.add.circle(0, 0, 18, govdeRengi).setStrokeStyle(3, 0xd4a032);
    // Aileyi renkten başka bir işaretle de ayır: TIER 1 kural 6 —
    // "düşman/dost ayrımı yalnız renge dayanmaz". Okçu ince, Top kalın.
    const isaret =
      def.id === 'top'
        ? scene.add.rectangle(0, 0, 16, 16, 0x14203a)
        : scene.add.triangle(0, 0, 0, -11, 9, 8, -9, 8, 0x14203a);

    this.add([taban, isaret]);
    scene.add.existing(this);
  }
}

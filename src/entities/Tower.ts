import Phaser from 'phaser';
import type { Targetable } from '../types/enemy';
import type { TargetMode, TierIndex, TowerDef, TowerRuntime } from '../types/tower';
import { towerFrameKey } from '../data/spriteFrames';

/** Oyun içi gösterim boyutu — P03 brifi, kaynak kare 80×80'den küçültülüyor. */
const TOWER_DISPLAY_SIZE = 64;

/**
 * Ateş geri tepmesi — `M8-T08`.
 *
 * Kule **yerinden oynamıyor**, yalnız hedefin tersine doğru kısa bir
 * kayma yapıyor. Ölçek değiştirmek (1 → 0,92 → 1) de denenebilirdi ama
 * o, kulenin ayak izini bir an küçültüyor ve yan yana duran kulelerde
 * "titreme" gibi okunuyordu; kayma yönü taşıdığı için **hangi kuleye
 * bakacağını** da söylüyor.
 */
const GERI_TEPME_PX = 4;
const GERI_TEPME_MS = 90;

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

  /**
   * Ateş geri tepmesi (`M8-T08`).
   *
   * @param dirX Hedefe doğru birim olmayan yön; geri tepme **tersine**.
   * @param olcek `Settings.effectScale` — 0 ise hiç oynamıyor
   *   (TIER 1 kural 6: efektler kapatılabilir).
   *
   * Tween **görsele** uygulanıyor, `Container`'a değil: menzil çemberi,
   * seçim halkası ve kışla bayrağı kulenin konumundan okunuyor; kabın
   * kendisini oynatmak onları da oynatırdı.
   *
   * Yeni tween eskisini **durduruyor**: hızlı ateş eden bir kule (Okçu T3
   * saniyede ~2,5 atış) üst üste binen tween'lerle sprite'ı yerinden
   * kaydırıp geri döndürmezdi.
   */
  recoil(dirX: number, dirY: number, olcek: number): void {
    if (olcek <= 0) return;
    const uz = Math.hypot(dirX, dirY);
    if (!(uz > 0)) return;

    const geriX = (-dirX / uz) * GERI_TEPME_PX;
    const geriY = (-dirY / uz) * GERI_TEPME_PX;

    this.scene.tweens.killTweensOf(this.#gorsel);
    this.#gorsel.setPosition(geriX, geriY);
    this.scene.tweens.add({
      targets: this.#gorsel,
      x: 0,
      y: 0,
      duration: GERI_TEPME_MS,
      ease: 'Quad.easeOut',
    });
  }
}

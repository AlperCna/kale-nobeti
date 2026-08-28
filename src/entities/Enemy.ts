import Phaser from 'phaser';
import type { EnemyDef, EnemyState, Mover } from '../types/enemy';
import type { PathProgress } from '../types/path';
import type { Poolable } from '../util/pool';
import { resetEnemyState } from '../systems/movers';
import { emptyEffects, resetEffects } from '../systems/effects';
import { enemyFrameKey } from '../data/spriteFrames';

/**
 * **Bu sınıf ince.** Hareket mantığı `Mover`'da, sıfırlamanın mantıksal
 * kısmı `resetEnemyState`'te — ikisi de Phaser'sız ve `node`'da test edilmiş
 * durumda (TIER 1 kural 11). Burada kalan tek şey Phaser'a bağlı olan kısım:
 * görüntü listesi, konum, görsel sıfırlama.
 *
 * `PathSystem`'e **doğrudan atıf yok** — yalnız `Mover` biliniyor. Uçanlar
 * M4'te `LineMover` alacak ve bu dosya değişmeyecek (`DEPENDENCIES.md` §2).
 *
 * `Rectangle` değil `Sprite`: her düşman tipi atlas'ta farklı bir kareye
 * sahip (P04). Havuzdaki nesne genel amaçlı — `spawn()` gerçek kareyi
 * `def.id`'den çözüyor; `resetForPool()` sabit savaş alanı boyutuna
 * (`#size`) dönüyor, çünkü kareler kendi arasında farklı doğal piksel
 * boyutuna sahip (boss 96, yavru 40, geri kalan 64) — `setScale(1)` tek
 * başına bunu düzeltmez.
 */
export class Enemy extends Phaser.GameObjects.Sprite implements Poolable, EnemyState {
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  /** Birim: px/sn. */
  speed = 0;
  speedFactor = 1;
  /** Süreli kule etkileri (yanma, yavaşlatma). */
  readonly effects = emptyEffects();
  progress: PathProgress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  blockedBy: object | null = null;
  alive = false;

  /** `null` yalnız havuzda beklerken. */
  mover: Mover | null = null;

  /**
   * Havuzdaki nesnenin kalıcı kimliği. `enemy:killed` olayı bunu taşıyor.
   *
   * Havuz nesneyi geri kullandığı için bu **düşman örneğinin** değil
   * **havuz yuvasının** kimliği; olay tüketicileri (M3 ekonomi) yalnız
   * "bir düşman öldü" bilgisini kullanıyor.
   */
  readonly id: number;

  static #sonrakiId = 1;

  /**
   * `Y08` — `guard-rules.mjs` k.3'ün okuduğu manifest: burada listelenen
   * her ad için `resetForPool()` gövdesinde `set${ad}(` (`Tint` özel:
   * `clearTint(`) geçmeli. Bu sınıf **beş kez** yaşanan "sıfırlanmayan
   * havuz durumu" hatasının (`CLAUDE.md` TIER 1 kural 3) dördüncüsünü
   * taşıyor (`FlipX` — `G06`); bekçi artık beşinciyi otomatik yakalıyor.
   * `Frame` **kasıtlı dışarıda**: `spawn()` her zaman göstermeden önce
   * `setFrame` çağırıyor, yani havuzdaki eski kare hiç görünmüyor —
   * sıfırlanması gereken bir "sızıntı" değil.
   */
  static readonly HAVUZ_ALANLARI: readonly string[] = [
    'Active',
    'Visible',
    'Position',
    'Alpha',
    'Angle',
    'FlipX',
    'DisplaySize',
    'Tint',
  ];

  /** Savaş alanı gösterim boyutu — kare değişse de sabit kalır. */
  readonly #size: number;

  constructor(scene: Phaser.Scene, size: number) {
    // Kurucudaki kare geçici — havuz nesnesi henüz hiçbir düşmana ait değil.
    // `spawn()` gerçek kareyi yazana kadar görünmez (`setVisible(false)`).
    super(scene, 0, 0, 'atlas', enemyFrameKey('goblin'));
    this.id = Enemy.#sonrakiId++;
    this.#size = size;
    this.setDisplaySize(size, size);
    scene.add.existing(this);
  }

  /**
   * Havuzdan çıkarken çağrılır.
   *
   * @param hpMultiplier Harita çarpanı (`MapDef.hpMultiplier`,
   *   `GAME-DESIGN.md` §9). Hız çarpanla ölçeklenmiyor — yalnız HP ve altın.
   */
  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void {
    const hp = def.hp * hpMultiplier;
    this.mover = mover;
    this.def = def;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = def.speed;
    this.blockedBy = null;
    this.alive = true;
    this.progress = mover.spawnProgress();
    this.setFrame(enemyFrameKey(def.id));
    this.setDisplaySize(this.#size, this.#size);
    this.setActive(true).setVisible(true);
    this.syncPosition();
  }

  /** @param scaledDelta `GameClock.scaledDelta` (TIER 1 kural 8). */
  step(scaledDelta: number): void {
    if (this.mover === null || !this.alive) return;
    this.mover.step(this, scaledDelta);
    this.syncPosition();
  }

  /** Hedeflemenin (`first`/`last`) bakacağı sayı. M2'de kullanılacak. */
  get remainingDistance(): number {
    return this.progress.remainingDistance;
  }

  reachedEnd(): boolean {
    return this.mover !== null && this.mover.reachedEnd(this);
  }

  /** Titremeyi önleyen ölü bölge — `G06`. Kayan nokta gürültüsü ile
   * dikey segmentlerde `dx` sıfıra çok yakın çıkabiliyor. */
  static readonly #YON_OLU_BOLGE = 0.01;

  private syncPosition(): void {
    if (this.mover === null) return;
    const p = this.mover.positionAt(this);
    // G06 — yürüdüğü yöne dönüyor. Atlas'taki kareler elle incelendi
    // (`public/assets/atlas.png`): çoğu (goblin, ork, trol, zırhlı ork,
    // örümcek, şaman, boss) öne bakan simetrik silüet — flip'in görünür
    // bir etkisi yok, ama zararı da yok. `kurtBinicisi` gerçekten yönlü
    // ve **varsayılan olarak sola** koşuyor — flip yönü ona göre seçildi
    // (`dx > 0` = sağa gidiyor = aynala).
    const dx = p.x - this.x;
    if (Math.abs(dx) > Enemy.#YON_OLU_BOLGE) this.setFlipX(dx > 0);
    this.setPosition(p.x, p.y);
  }

  /**
   * TIER 1 kural 3: **tüm** durum sıfırlanır.
   *
   * Mantıksal kısım `resetEnemyState`'te (test edilebilir olsun diye);
   * burada yalnız Phaser tarafı. `killTweensOf` atlanırsa havuza dönen
   * nesne eski ölüm animasyonunu yeni düşman üzerinde oynatır.
   */
  resetForPool(): void {
    resetEnemyState(this);
    resetEffects(this.effects);
    this.mover = null;

    this.scene?.tweens.killTweensOf(this);
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setAlpha(1);
    this.setAngle(0);
    this.setFlipX(false); // G06 — TIER 1 kural 3: yön de sıfırlanmalı
    this.setDisplaySize(this.#size, this.#size);
    this.clearTint();
  }
}

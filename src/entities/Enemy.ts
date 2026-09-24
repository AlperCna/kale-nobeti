import Phaser from 'phaser';
import type { EnemyDef, EnemyState, Mover } from '../types/enemy';
import type { PathProgress } from '../types/path';
import type { Poolable } from '../util/pool';
import { resetEnemyState } from '../systems/movers';
import { emptyEffects, resetEffects } from '../systems/effects';
import { enemyFrameKey, enemyDisplaySize } from '../data/spriteFrames';
import { konumIsinla, type AraDegerli } from '../util/araDeger';
import {
  HIT_FLASH_COLOR,
  HIT_FLASH_MS,
  DOGUS_SONUM_MS,
  SALLANTI_ACI_UCAN,
  SALLANTI_ACI_YER,
  SALLANTI_PERIYOT_UCAN,
  SALLANTI_PERIYOT_YER,
} from '../data/enemyVisuals';

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
export class Enemy extends Phaser.GameObjects.Sprite implements Poolable, EnemyState, AraDegerli {
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  /** Birim: px/sn. */
  speed = 0;
  speedFactor = 1;
  /** Süreli kule etkileri (yanma, yavaşlatma). */
  readonly effects = emptyEffects();
  progress: PathProgress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  /** Yolun kat edilen oranı — `Mover.step` yazıyor (`M12` yeraltı geçişi). */
  pathFraction = 0;
  /** Kaç kez yandaş çağırdı (`M13`). Havuza dönerken sıfırlanıyor. */
  summonsDone = 0;
  blockedBy: object | null = null;
  alive = false;
  /** `M10-T03` — kalan buz kalkanı. `resetEnemyState` sıfırlıyor. */
  shieldLeft = 0;

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
  ]; // bekçi: havuz Frame — spawn() göstermeden önce her zaman setFrame yazıyor

  /** Savaş alanı gösterim boyutu — kare değişse de sabit kalır. */
  readonly #size: number;

  /**
   * `G08` — vuruş flaşı kalan süre (ms, `scaledDelta` birimiyle azalır).
   * Tween DEĞİL, sayaç: `resetForPool()`'un `killTweensOf`'a ihtiyaç
   * duymadan tek satırla güvenli olması için (bkz. dosyanın başlık notu
   * ve `G08` bulgusunun "TIER 1 kural 3 tuzağı" bölümü).
   */
  #flashLeft = 0;

  /**
   * `M8-T09` — yürüme sallantısının fazı (ms, ölçekli zaman birikimi) ve
   * doğuş sönümünün kalan süresi.
   *
   * `G08`'in gerekçesiyle aynı: **tween değil sayaç**. `resetForPool()`
   * tek satırda sıfırlayabiliyor ve havuzdan çıkan düşman önceki
   * düşmanın animasyonunu devralmıyor (kural 3).
   */
  #sallantiFaz = 0;
  #dogusKalan = 0;

  /**
   * Hareket süsü açık mı.
   *
   * **`screenShake` ayarına bağlanıyor**, `effects`'e değil. Gerekçe:
   * ikisi de "bilgi taşımayan görüntü hareketi" sınıfında ve
   * `reducedMotionDefaults()` zaten `screenShake: false` veriyor — yani
   * `prefers-reduced-motion` sallantıyı kendiliğinden kapatıyor. `effects`
   * parçacık **yoğunluğunu** yönetiyor; `effects: off` oynayan biri
   * parçacık istemiyor demek, "düşmanlar donuk dursun" demek değil.
   * (`M8-T09` kabul kriteri bu ayrımı açıkça istiyor.)
   */
  /**
   * Ara değer üretimi (`M65`, `util/araDeger.ts`). Çizim son iki
   * mantık durumu arasında yapılıyor; `x`/`y` hem mantığın hem
   * çizimin alanı olduğu için gerçek konum ayrıca saklanıyor.
   */
  oncekiX = 0;
  oncekiY = 0;
  gercekX = 0;
  gercekY = 0;

  readonly #hareketAcik: () => boolean;

  constructor(scene: Phaser.Scene, size: number, hareketAcik: () => boolean = () => true) {
    // Kurucudaki kare geçici — havuz nesnesi henüz hiçbir düşmana ait değil.
    // `spawn()` gerçek kareyi yazana kadar görünmez (`setVisible(false)`).
    super(scene, 0, 0, 'atlas', enemyFrameKey('goblin'));
    this.id = Enemy.#sonrakiId++;
    this.#size = size;
    this.#hareketAcik = hareketAcik;
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
    this.shieldLeft = def.shield ?? 0;
    this.progress = mover.spawnProgress();
    this.setFrame(enemyFrameKey(def.id));
    // `M10` — boyut **düşman başına**, havuz nesnesi başına değil:
    // aynı yuva bir karede goblin bir karede boss olabiliyor.
    // `resetForPool` varsayılana dönüyor (kural 3), `spawn` üstüne
    // yazıyor. Gerekçe `data/spriteFrames.ts` `enemyDisplaySize`'da.
    const boyut = enemyDisplaySize(def.id);
    this.setDisplaySize(boyut, boyut);
    this.setActive(true).setVisible(true);
    // `M8-T09` — doğuş sönümü. Düşman ekran kenarında bir anda
    // "belirmiyor"; 200 ms içinde beliriyor. Faz her doğumda sıfırdan
    // başlıyor ki aynı anda doğan iki düşman senkron sallanmasın diye
    // kimliğe göre kaydırılıyor.
    this.#dogusKalan = DOGUS_SONUM_MS;
    this.#sallantiFaz = (this.id % 7) * 60;
    this.setAlpha(0);
    this.setAngle(0);
    this.syncPosition();
    // Havuz mirasını sil — yoksa düşman ilk karesinde ekranın öbür
    // ucundan süzülerek gelir (`M65`).
    konumIsinla(this);
  }

  /** @param scaledDelta `GameClock.scaledDelta` (TIER 1 kural 8). */
  step(scaledDelta: number): void {
    if (this.#flashLeft > 0) {
      this.#flashLeft -= scaledDelta;
      if (this.#flashLeft <= 0) this.clearTint();
    }
    if (this.#dogusKalan > 0) {
      this.#dogusKalan -= scaledDelta;
      this.setAlpha(this.#dogusKalan <= 0 ? 1 : 1 - this.#dogusKalan / DOGUS_SONUM_MS);
    }
    if (this.mover === null || !this.alive) return;
    this.mover.step(this, scaledDelta);
    this.syncPosition();
    this.#salla(scaledDelta);
  }

  /**
   * `M8-T09` — yürüme sallantısı.
   *
   * Faz **ölçekli zamanla** ilerliyor (kural 8): 2× hızda düşman iki kat
   * hızlı yürüyor ve iki kat hızlı sallanıyor, yani adım sıklığı hızla
   * tutarlı kalıyor. Ham `delta` kullanılsaydı 2×'te düşmanlar süzülerek
   * kayardı.
   *
   * **Engellenmiş düşman sallanmıyor**: `blockedBy` doluyken yerinde
   * duruyor, sallanmak "yürüyor" yalanı söylerdi.
   */
  #salla(scaledDelta: number): void {
    if (!this.#hareketAcik()) {
      // Ayar **oyun içinde** kapatılabiliyor. Yalnız `return` etmek
      // düşmanı son açısında **eğik dondurup** bırakıyordu (canlı ölçümle
      // görüldü: 10 düşmanın hiçbiri oynamıyor ama hepsi çarpık duruyor).
      // Hareket hassasiyeti yüzünden kapatan biri için bu, kapattığı
      // şeyin kalıntısını ekranda bırakmak demek.
      if (this.angle !== 0) this.setAngle(0);
      return;
    }
    if (this.blockedBy !== null) {
      this.setAngle(0);
      return;
    }
    const ucan = this.def?.flying === true;
    const periyot = ucan ? SALLANTI_PERIYOT_UCAN : SALLANTI_PERIYOT_YER;
    const genlik = ucan ? SALLANTI_ACI_UCAN : SALLANTI_ACI_YER;
    this.#sallantiFaz = (this.#sallantiFaz + scaledDelta) % periyot;
    this.setAngle(Math.sin((this.#sallantiFaz / periyot) * Math.PI * 2) * genlik);
  }

  /**
   * `G08` — vuruş geri bildirimi. Yalnız gerçek mermi isabetinde çağrılır
   * (`GameScene`'in `ProjectileSystem` `onDamage` callback'i) — yanma
   * tikleri ve `hp<=0` kontrol amaçlı sıfır-hasarlı çağrılar (`#hasarUygula`
   * içinden) burayı **tetiklemiyor**, o yüzden `hit()` `#hasarUygula`'nın
   * içinde değil, isabet callback'inde duruyor.
   */
  hit(): void {
    this.#flashLeft = HIT_FLASH_MS;
    this.setTint(HIT_FLASH_COLOR);
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
    this.#sallantiFaz = 0;
    this.#dogusKalan = 0;
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
    this.#flashLeft = 0; // G08 — TIER 1 kural 3: flaş sayacı da sıfırlanmalı
    this.clearTint();
  }
}

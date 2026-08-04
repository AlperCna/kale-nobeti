import Phaser from 'phaser';
import { GameClock } from '../systems/GameClock';
import { EventBus } from '../systems/EventBus';
import { PathSystem } from '../systems/PathSystem';
import { PathMover } from '../systems/movers';
import { SpawnSystem } from '../systems/SpawnSystem';
import { Enemy } from '../entities/Enemy';
import { Pool } from '../util/pool';
import { MAP_1, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { POOL_PREALLOC, STARTING_LIVES, M1_GECICI_DOGMA_ARALIGI_SN } from '../data/balance';
import { GOBLIN } from '../data/enemies';
import { devHooks } from '../util/devHooks';

/**
 * Greybox palet — `GAME-DESIGN.md` §2. Arka plan görseli ve sprite'lar M6'da;
 * M4 sonuna kadar oyun greybox'la tamamen oynanabilir olmalı
 * (`CLAUDE.md` Görsel yön, "Üretim kuralı").
 */
const ENEMY_SIZE = 22;
const ENEMY_COLOR = 0xb03a2e; // Vermilyon — düşman
const PATH_COLOR = 0x8a7250; // Yol: parşömen ile mürekkep arası ara ton
const PATH_WIDTH = 48;
const SPOT_COLOR = 0xe4d3a8; // Parşömen
/** Yarıçap 22 → çap 44 px: platform dokunmatik hedef alt sınırı (M2'de tıklanacak). */
const SPOT_RADIUS = 22;
const CASTLE_COLOR = 0x14203a; // Mürekkep
const GOLD_COLOR = 0xd4a032; // Altın varak — kontur
const CASTLE_SIZE = 56;

/**
 * Oyun alanı. Saatin sahibi.
 *
 * `Hud` bunun **üstünde paralel** çalışır (CLAUDE.md Mimari) —
 * duraklatmada `Game` durur, `Hud` durmaz.
 */
export class GameScene extends Phaser.Scene {
  readonly clock = new GameClock();
  readonly bus = new EventBus();

  #spawner?: SpawnSystem<Enemy>;

  constructor() {
    super('Game');
  }

  create(): void {
    const yol = MAP_1.paths[0] ?? [];
    const path = new PathSystem(yol);
    const mover = new PathMover(path);

    // Harita **bir kez** çiziliyor. `update`'te yeniden çizmek her karede
    // yeni geometri üretmek demek; Graphics'in maliyeti orada.
    this.#drawMap(yol);

    // TIER 1 kural 3: `Group` burada, sahne tarafında — görüntü listesi ve
    // sahne kapanınca toplanma onun işi. Havuz *muhasebesi* `util/pool.ts`
    // içinde ve Phaser'sız (CLAUDE.md kural 3'ün kural 11 sınırı).
    const grup = this.add.group({ runChildUpdate: false });

    const pool = new Pool<Enemy>(
      () => {
        const e = new Enemy(this, ENEMY_SIZE, ENEMY_COLOR);
        grup.add(e);
        return e;
      },
      POOL_PREALLOC.enemy,
      (kapasite) => {
        const d = devHooks();
        if (d !== undefined) d.poolExhausted = (d.poolExhausted ?? 0) + 1;
        // Yayın yapısında konsol çıktısı yasak (CLAUDE.md Platform).
        if (import.meta.env.DEV) console.warn(`[havuz] düşman havuzu doldu (${kapasite})`);
      },
    );

    this.#spawner = new SpawnSystem(pool, mover, this.bus, {
      def: GOBLIN,
      hpMultiplier: MAP_1.hpMultiplier,
      intervalSeconds: M1_GECICI_DOGMA_ARALIGI_SN,
      startingLives: STARTING_LIVES,
    });

    this.bus.on('life:lost', ({ remaining }) => {
      // Kaybetme ekranı M3'te. Şimdilik yalnız geliştirme kancası.
      const d = devHooks();
      if (d !== undefined) d.lives = () => remaining;
      if (import.meta.env.DEV) console.info(`[can] kalan ${remaining}`);
    });

    // `once`, `on` DEĞİL. Phaser kaynağı (Systems.js):
    //   - `shutdown()` yalnız SHUTDOWN yayar, dinleyicileri KALDIRMAZ
    //     (`removeAllListeners` `destroy()` içinde, 810. satır)
    //   - `SceneManager.create()` her başlatmada `create()`'i çağırır
    // Yani `on` kullanılsaydı her yeniden başlatma kalıcı bir dinleyici
    // daha eklerdi ve `bus.clear()` N. kapanışta N kez çağrılırdı.
    // `once` her `create`'te taze kaydediliyor, kapanışta tükeniyor.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      pool.releaseAll();
      this.bus.clear();
      const d = devHooks();
      if (d !== undefined) d.clearCount = (d.clearCount ?? 0) + 1;
    });

    const dev = devHooks();
    if (dev !== undefined) {
      dev.scale = () => this.clock.scale;
      dev.shutdownListeners = () => this.events.listenerCount(Phaser.Scenes.Events.SHUTDOWN);
      dev.restartGame = () => {
        this.scene.start('Game');
      };
      dev.enemyActive = () => pool.activeCount;
      dev.enemyCapacity = () => pool.capacity;
      dev.lives = () => this.#spawner?.lives ?? -1;
      dev.pathLength = () => path.totalLength;
      dev.coverage = () => MAP_1.coverage;
      dev.coverageAverage = () => this.#ortalamaKapsama();
    }
  }

  /**
   * Yol, yapı noktaları ve kale — greybox.
   *
   * `create`'te bir kez. Düşmanlar bu `Graphics`'in üstünde çizilir çünkü
   * havuz sonradan ekleniyor (Phaser görüntü listesi ekleme sırasına göre).
   */
  #drawMap(yol: readonly { x: number; y: number }[]): void {
    const g = this.add.graphics();

    // Yol
    g.lineStyle(PATH_WIDTH, PATH_COLOR, 1);
    g.beginPath();
    yol.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.strokePath();
    // Keskin virajda (S13) köşe boşluk bırakıyor; nokta ile dolduruluyor.
    g.fillStyle(PATH_COLOR, 1);
    for (const p of yol) g.fillCircle(p.x, p.y, PATH_WIDTH / 2);

    // Yapı noktaları
    for (const s of MAP_1.buildSpots) {
      g.fillStyle(SPOT_COLOR, 1);
      g.fillCircle(s.x, s.y, SPOT_RADIUS);
      g.lineStyle(3, GOLD_COLOR, 1);
      g.strokeCircle(s.x, s.y, SPOT_RADIUS);
    }

    // Kale — mürekkep zemin üstünde mürekkep kare görünmez, altın kontur şart.
    const c = MAP_1.castle;
    g.fillStyle(CASTLE_COLOR, 1);
    g.fillRect(c.x - CASTLE_SIZE / 2, c.y - CASTLE_SIZE / 2, CASTLE_SIZE, CASTLE_SIZE);
    g.lineStyle(4, GOLD_COLOR, 1);
    g.strokeRect(c.x - CASTLE_SIZE / 2, c.y - CASTLE_SIZE / 2, CASTLE_SIZE, CASTLE_SIZE);

    this.#drawCoverageOverlay();
  }

  /**
   * `M1-T09` — kapsama göstergesi. **Yalnız geliştirmede.**
   *
   * `CLAUDE.md` Platform: yayın yapısında hata ayıklama göstergesi bulunmaz.
   * `import.meta.env.DEV` dalı üretimde tamamen siliniyor.
   *
   * TIER 1 kural 7 ihlali değil: bu metinler bir kez yazılıp bir daha
   * değişmiyor, `setText` çağrılmıyor.
   */
  #drawCoverageOverlay(): void {
    if (!import.meta.env.DEV) return;

    const stil = { fontFamily: 'monospace', fontSize: '16px', color: '#D4A032' };
    MAP_1.coverage.forEach((c, i) => {
      const s = MAP_1.buildSpots[i];
      if (s === undefined) return;
      this.add
        .text(s.x, s.y - SPOT_RADIUS - 14, `${Math.round(c.coveredPx)}`, stil)
        .setOrigin(0.5, 1);
    });

    const L = MAP_1.paths.reduce(
      (t, p) => t + (p.length > 1 ? new PathSystem(p).totalLength : 0),
      0,
    );
    this.add.text(
      12,
      12,
      `ort: ${this.#ortalamaKapsama().toFixed(1)} px · L: ${L.toFixed(0)} px · menzil: ${COVERAGE_REFERENCE_RANGE}`,
      { fontFamily: 'monospace', fontSize: '16px', color: '#E4D3A8' },
    );
  }

  #ortalamaKapsama(): number {
    const c = MAP_1.coverage;
    if (c.length === 0) return 0;
    return c.reduce((t, x) => t + x.coveredPx, 0) / c.length;
  }

  /**
   * Ham `delta`nın dokunulduğu **tek yer**.
   *
   * TIER 1 kural 8: hiçbir sistem ham `delta` kullanmaz. Bu metodun tek
   * işi saati ilerletmek; zaman bağımlı her mantık `clock.scaledDelta`
   * üzerinden çalışır. Buraya ikinci bir satır eklenirse kural delinir.
   */
  update(_time: number, delta: number): void {
    this.clock.tick(delta);
    this.#spawner?.update(this.clock.scaledDelta);

    const dev = devHooks();
    if (dev !== undefined) dev.gameFrames = (dev.gameFrames ?? 0) + 1;
  }
}

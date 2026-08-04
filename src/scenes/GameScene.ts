import Phaser from 'phaser';
import { GameClock } from '../systems/GameClock';
import { EventBus } from '../systems/EventBus';
import { devHooks } from '../util/devHooks';

/**
 * GEÇİCİ hız göstergesi. M1'de silinecek.
 *
 * Var olma sebebi tek: `GameClock`'un 2× hızda gerçekten iki kat hızlı
 * çalıştığını **gözle** doğrulanabilir kılmak. Denge sayısı değil,
 * atılacak iskele.
 */
const PROBE_SPEED_PX_PER_SEC = 220;
const PROBE_SIZE = 28;

/**
 * Oyun alanı. Saatin sahibi.
 *
 * `Hud` bunun **üstünde paralel** çalışır (CLAUDE.md Mimari) —
 * duraklatmada `Game` durur, `Hud` durmaz.
 */
export class GameScene extends Phaser.Scene {
  readonly clock = new GameClock();
  readonly bus = new EventBus();

  #probe?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Game');
  }

  create(): void {
    const { height } = this.scale;

    // GEÇİCİ — M1'de yerini yol ve düşmanlar alacak.
    this.#probe = this.add.rectangle(0, height / 2, PROBE_SIZE, PROBE_SIZE, 0x8a7250);

    // `once`, `on` DEĞİL. Phaser kaynağı (Systems.js):
    //   - `shutdown()` yalnız SHUTDOWN yayar, dinleyicileri KALDIRMAZ
    //     (`removeAllListeners` `destroy()` içinde, 810. satır)
    //   - `SceneManager.create()` her başlatmada `create()`'i çağırır
    // Yani `on` kullanılsaydı her yeniden başlatma kalıcı bir dinleyici
    // daha eklerdi ve `bus.clear()` N. kapanışta N kez çağrılırdı.
    // `once` her `create`'te taze kaydediliyor, kapanışta tükeniyor.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bus.clear();
      const d = devHooks();
      if (d !== undefined) d.clearCount = (d.clearCount ?? 0) + 1;
    });

    const dev = devHooks();
    if (dev !== undefined) {
      dev.probeX = () => this.#probe?.x ?? -1;
      dev.scale = () => this.clock.scale;
      dev.shutdownListeners = () =>
        this.events.listenerCount(Phaser.Scenes.Events.SHUTDOWN);
      dev.restartGame = () => {
        this.scene.start('Game');
      };
    }
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
    this.#stepProbe();

    const dev = devHooks();
    if (dev !== undefined) dev.gameFrames = (dev.gameFrames ?? 0) + 1;
  }

  /** GEÇİCİ — M1'de silinecek. `scaledDelta` kullanımının canlı örneği. */
  #stepProbe(): void {
    if (this.#probe === undefined) return;

    const saniye = this.clock.scaledDelta / 1000;
    this.#probe.x += PROBE_SPEED_PX_PER_SEC * saniye;

    if (this.#probe.x > this.scale.width + PROBE_SIZE) {
      this.#probe.x = -PROBE_SIZE;
    }
  }
}

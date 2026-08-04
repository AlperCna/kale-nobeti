import Phaser from 'phaser';
import { GameClock } from '../systems/GameClock';
import { EventBus } from '../systems/EventBus';
import { PathSystem } from '../systems/PathSystem';
import { PathMover } from '../systems/movers';
import { SpawnSystem } from '../systems/SpawnSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { SpotOccupancy, findSpotAt } from '../systems/buildSpots';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { DamageText, DamageTextSystem } from '../fx/DamageText';
import { ensureNumberFont } from '../fx/numberFont';
import { Pool } from '../util/pool';
import { coveredSegments } from '../util/coverage';
import { MAP_1, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { OKCU, TOP, TOWERS } from '../data/towers';
import { GOBLIN } from '../data/enemies';
import {
  POOL_PREALLOC,
  STARTING_LIVES,
  M1_GECICI_DOGMA_ARALIGI_SN,
  GECICI_MERMI_HIZI,
  MERMI_ISABET_YARICAPI,
} from '../data/balance';
import { devHooks } from '../util/devHooks';
import type { TowerDef } from '../types/tower';
import type { Vec2 } from '../types/common';

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
/** Yarıçap 22 → çap 44 px: platform dokunmatik hedef alt sınırı. */
const SPOT_RADIUS = 22;
const CASTLE_COLOR = 0x14203a; // Mürekkep
const GOLD_COLOR = 0xd4a032; // Altın varak
const INK_COLOR = 0x14203a;
const CASTLE_SIZE = 56;
const PROJECTILE_RADIUS = 5;

/** Kule gövde renkleri — aile ayrımı renge **ek olarak** şekille de yapılıyor. */
const TOWER_COLORS: Readonly<Record<string, number>> = { okcu: 0x3e5ca8, top: 0x2f4a3c };

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
  #towers?: TowerSystem;
  #projectiles?: ProjectileSystem<Enemy, Projectile>;
  #damageTexts?: DamageTextSystem;
  #enemyPool?: Pool<Enemy>;

  #occupancy?: SpotOccupancy;
  #hoverGfx?: Phaser.GameObjects.Graphics;
  #menu?: Phaser.GameObjects.Container;
  #hoveredSpot = -1;
  #mermiTepe = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    const yol = MAP_1.paths[0] ?? [];
    const path = new PathSystem(yol);
    const mover = new PathMover(path);
    ensureNumberFont(this);

    // Harita **bir kez** çiziliyor. `update`'te yeniden çizmek her karede
    // yeni geometri üretmek demek; Graphics'in maliyeti orada.
    this.#drawMap(yol);
    this.#hoverGfx = this.add.graphics();

    // TIER 1 kural 3: `Group` burada, sahne tarafında — görüntü listesi ve
    // sahne kapanınca toplanma onun işi. Havuz *muhasebesi* `util/pool.ts`
    // içinde ve Phaser'sız (CLAUDE.md kural 3'ün kural 11 sınırı).
    const dusmanGrup = this.add.group({ runChildUpdate: false });
    const mermiGrup = this.add.group({ runChildUpdate: false });
    const sayiGrup = this.add.group({ runChildUpdate: false });

    const enemyPool = new Pool<Enemy>(
      () => {
        const e = new Enemy(this, ENEMY_SIZE, ENEMY_COLOR);
        dusmanGrup.add(e);
        return e;
      },
      POOL_PREALLOC.enemy,
      (k) => this.#havuzDoldu('düşman', k),
    );
    this.#enemyPool = enemyPool;

    const mermiHavuzu = new Pool<Projectile>(
      () => {
        const m = new Projectile(this, PROJECTILE_RADIUS, GOLD_COLOR);
        mermiGrup.add(m);
        return m;
      },
      POOL_PREALLOC.projectile,
      (k) => this.#havuzDoldu('mermi', k),
    );

    const sayiHavuzu = new Pool<DamageText>(
      () => {
        const t = new DamageText(this);
        sayiGrup.add(t);
        return t;
      },
      POOL_PREALLOC.damageText,
      (k) => this.#havuzDoldu('hasar sayısı', k),
    );

    this.#damageTexts = new DamageTextSystem(sayiHavuzu);

    this.#projectiles = new ProjectileSystem<Enemy, Projectile>(mermiHavuzu, (e, sonuc, x, y) => {
      this.#damageTexts?.spawn(x, y - ENEMY_SIZE, sonuc.dealt, sonuc.floored);
      this.#hasarUygula(e, sonuc.dealt);
    });

    this.#towers = new TowerSystem((kule, tier, hedef) => {
      // Uçan çarpanı **mermiye girmeden önce** uygulanıyor: o kulenin
      // özelliği, düşmanın savunması değil (`combat.ts` notu).
      const ucanCarpani = hedef.def?.flying === true ? tier.airMultiplier : 1;
      const m = this.#projectiles?.fire({
        x: kule.x,
        y: kule.y,
        target: hedef as Enemy,
        damage: tier.damage * ucanCarpani,
        damageType: kule.def.damageType,
        speed: GECICI_MERMI_HIZI, // GEÇİCİ — S20
        splashRadius: tier.splashRadius ?? 0,
        hitRadius: MERMI_ISABET_YARICAPI,
      });
      m?.activate();
    }, this.bus);

    this.#spawner = new SpawnSystem(enemyPool, mover, this.bus, {
      def: GOBLIN,
      hpMultiplier: MAP_1.hpMultiplier,
      intervalSeconds: M1_GECICI_DOGMA_ARALIGI_SN,
      startingLives: STARTING_LIVES,
    });

    this.#occupancy = new SpotOccupancy(MAP_1.buildSpots.length);
    this.#setupInput();

    this.bus.on('life:lost', ({ remaining }) => {
      // Kaybetme ekranı M3'te. Şimdilik yalnız geliştirme çıktısı.
      if (import.meta.env.DEV) console.info(`[can] kalan ${remaining}`);
    });

    // `once`, `on` DEĞİL. Phaser kaynağı (Systems.js):
    //   - `shutdown()` yalnız SHUTDOWN yayar, dinleyicileri KALDIRMAZ
    //     (`removeAllListeners` `destroy()` içinde, 810. satır)
    //   - `SceneManager.create()` her başlatmada `create()`'i çağırır
    // Yani `on` kullanılsaydı her yeniden başlatma kalıcı bir dinleyici
    // daha eklerdi ve `bus.clear()` N. kapanışta N kez çağrılırdı.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      enemyPool.releaseAll();
      mermiHavuzu.releaseAll();
      sayiHavuzu.releaseAll();
      this.bus.clear();
      const d = devHooks();
      if (d !== undefined) d.clearCount = (d.clearCount ?? 0) + 1;
    });

    this.#devKancalari(path, enemyPool, mermiHavuzu, sayiHavuzu);
  }

  /**
   * Ham `delta`nın dokunulduğu **tek yer**.
   *
   * TIER 1 kural 8: hiçbir sistem ham `delta` kullanmaz. Bu metodun tek
   * işi saati ilerletmek; zaman bağımlı her mantık `clock.scaledDelta`
   * üzerinden çalışır.
   */
  update(_time: number, delta: number): void {
    this.clock.tick(delta);
    const sd = this.clock.scaledDelta;

    this.#spawner?.update(sd);
    const dusmanlar = this.#enemyPool?.activeItems() ?? [];
    this.#towers?.update(sd, dusmanlar);
    this.#projectiles?.update(sd, dusmanlar);
    this.#damageTexts?.update(sd);

    const aktifMermi = this.#projectiles?.activeCount ?? 0;
    if (aktifMermi > this.#mermiTepe) this.#mermiTepe = aktifMermi;

    const dev = devHooks();
    if (dev !== undefined) dev.gameFrames = (dev.gameFrames ?? 0) + 1;
  }

  // ------------------------------------------------------------------ hasar

  #hasarUygula(e: Enemy, miktar: number): void {
    if (!e.alive) return;
    e.hp -= miktar;
    if (e.hp > 0) return;

    // Ölüm **burada** işaretleniyor, havuza dönüşten önce: aynı karede
    // uçmakta olan başka mermiler `alive === false` görüp bu düşmanı
    // ikinci kez öldürmesin (odaklanma kaybı M3'te ölçülecek, ama çift
    // sayım hiçbir zaman doğru değil).
    e.alive = false;
    this.bus.emit('enemy:killed', { id: e.id, gold: e.def?.gold ?? 0 });
    this.#enemyPool?.release(e);
  }

  #havuzDoldu(ad: string, kapasite: number): void {
    const d = devHooks();
    if (d !== undefined) d.poolExhausted = (d.poolExhausted ?? 0) + 1;
    // Yayın yapısında konsol çıktısı yasak (CLAUDE.md Platform).
    if (import.meta.env.DEV) console.warn(`[havuz] ${ad} havuzu doldu (${kapasite})`);
  }

  // -------------------------------------------------------------- etkileşim

  #setupInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const i = findSpotAt({ x: p.worldX, y: p.worldY }, MAP_1.buildSpots);
      if (i === this.#hoveredSpot) return;
      this.#hoveredSpot = i;
      this.#drawHover();
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      const i = findSpotAt({ x: p.worldX, y: p.worldY }, MAP_1.buildSpots);
      if (i < 0 || this.#occupancy?.isOccupied(i) === true) {
        this.#closeMenu();
        return;
      }
      this.#openMenu(i);
    });
  }

  /**
   * `GAME-DESIGN.md` §4.5 + §2: kesikli altın menzil çemberi + mürekkep
   * kontur, ve o noktanın **kapsadığı yol parçası** kalın altın çizgiyle.
   *
   * Tek bir `Graphics` nesnesi **yeniden çiziliyor**, her karede yenisi
   * yaratılmıyor — üstelik yalnız hover değiştiğinde.
   */
  #drawHover(): void {
    const g = this.#hoverGfx;
    if (g === undefined) return;
    g.clear();

    const i = this.#hoveredSpot;
    const spot = i >= 0 ? MAP_1.buildSpots[i] : undefined;
    if (spot === undefined) return;

    const menzil = COVERAGE_REFERENCE_RANGE;

    // Kapsanan yol vurgusu — `coveredSegments` ile, yani ekranda görünen
    // çizgi ile `MapDef.coverage` içindeki sayı aynı hesaptan geliyor.
    g.lineStyle(10, GOLD_COLOR, 0.55);
    for (const p of coveredSegments(MAP_1.paths[0] ?? [], spot, menzil)) {
      g.beginPath();
      g.moveTo(p.a.x, p.a.y);
      g.lineTo(p.b.x, p.b.y);
      g.strokePath();
    }

    // Kesikli altın çember + mürekkep dış kontur.
    // Kontursuz çember yoğun dalgada kayboluyor (`GAME-DESIGN.md` §2).
    this.#dashedCircle(g, spot, menzil + 1.5, INK_COLOR, 3);
    this.#dashedCircle(g, spot, menzil, GOLD_COLOR, 2);
  }

  /** Phaser'da hazır kesikli yay yok; parça parça çiziliyor. */
  #dashedCircle(
    g: Phaser.GameObjects.Graphics,
    c: Vec2,
    r: number,
    renk: number,
    kalinlik: number,
  ): void {
    const parca = 24;
    const adim = (Math.PI * 2) / parca;
    g.lineStyle(kalinlik, renk, 1);
    for (let k = 0; k < parca; k += 2) {
      g.beginPath();
      g.arc(c.x, c.y, r, k * adim, (k + 1) * adim);
      g.strokePath();
    }
  }

  /**
   * Kule seçim menüsü. **S19 geçici:** iki butonlu düz liste.
   * `GAME-DESIGN.md` §2'deki "altın kartuş" biçimi M6'da.
   */
  #openMenu(spotIndex: number): void {
    this.#closeMenu();
    const spot = MAP_1.buildSpots[spotIndex];
    if (spot === undefined) return;

    const kap = this.add.container(
      Phaser.Math.Clamp(spot.x, 100, this.scale.width - 100),
      Phaser.Math.Clamp(spot.y - 56, 40, this.scale.height - 40),
    );

    TOWERS.forEach((def, i) => {
      const bx = (i - (TOWERS.length - 1) / 2) * 92;
      // 88×44 — Platform dokunmatik hedef alt sınırı.
      const arka = this.add
        .rectangle(bx, 0, 88, 44, SPOT_COLOR)
        .setStrokeStyle(2, GOLD_COLOR)
        .setInteractive({ useHandCursor: true });
      const etiket = this.add
        .text(bx, 0, def.id === 'okcu' ? 'Okçu' : 'Top', {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#14203A',
        })
        .setOrigin(0.5);

      arka.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _p: Phaser.Input.Pointer,
          _x: number,
          _y: number,
          olay: Phaser.Types.Input.EventData,
        ) => {
          // Sahne dinleyicisi aynı tıklamayla menüyü kapatmasın.
          olay.stopPropagation();
          this.#placeTower(spotIndex, def);
        },
      );

      kap.add([arka, etiket]);
    });

    this.#menu = kap;
  }

  #closeMenu(): void {
    this.#menu?.destroy(true);
    this.#menu = undefined;
  }

  #placeTower(spotIndex: number, def: TowerDef): boolean {
    const spot = MAP_1.buildSpots[spotIndex];
    // Doluluk defteri **tek yerde**: `SpotOccupancy`. `TowerSystem` kendi
    // kontrolünü yapmıyor — aynı defteri iki yerde tutmak sessizce ayrışır.
    if (spot === undefined || this.#occupancy?.occupy(spotIndex) !== true) return false;

    const kule = new Tower(this, spotIndex, spot.x, spot.y, def, TOWER_COLORS[def.id] ?? GOLD_COLOR);
    this.#towers?.add(kule);
    this.#closeMenu();
    return true;
  }

  // ------------------------------------------------------------------- çizim

  #drawMap(yol: readonly Vec2[]): void {
    const g = this.add.graphics();

    g.lineStyle(PATH_WIDTH, PATH_COLOR, 1);
    g.beginPath();
    yol.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.strokePath();
    // Keskin virajda (S13) köşe boşluk bırakıyor; nokta ile dolduruluyor.
    g.fillStyle(PATH_COLOR, 1);
    for (const p of yol) g.fillCircle(p.x, p.y, PATH_WIDTH / 2);

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
   * `CLAUDE.md` Platform: yayın yapısında hata ayıklama göstergesi bulunmaz.
   *
   * TIER 1 kural 7 ihlali değil: bir kez yazılıp bir daha değişmiyor.
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

  #devKancalari(
    path: PathSystem,
    enemyPool: Pool<Enemy>,
    mermiHavuzu: Pool<Projectile>,
    sayiHavuzu: Pool<DamageText>,
  ): void {
    const dev = devHooks();
    if (dev === undefined) return;

    dev.scale = () => this.clock.scale;
    dev.shutdownListeners = () => this.events.listenerCount(Phaser.Scenes.Events.SHUTDOWN);
    dev.restartGame = () => {
      this.scene.start('Game');
    };
    dev.enemyActive = () => enemyPool.activeCount;
    dev.enemyCapacity = () => enemyPool.capacity;
    dev.lives = () => this.#spawner?.lives ?? -1;
    dev.pathLength = () => path.totalLength;
    dev.coverage = () => MAP_1.coverage;
    dev.coverageAverage = () => this.#ortalamaKapsama();

    dev.projectileActive = () => mermiHavuzu.activeCount;
    dev.projectilePeak = () => this.#mermiTepe;
    dev.damageTextActive = () => sayiHavuzu.activeCount;
    dev.towerCount = () => this.#towers?.towers.length ?? 0;
    dev.placeTower = (spotIndex: number, towerId: string) =>
      this.#placeTower(spotIndex, towerId === 'top' ? TOP : OKCU);
    dev.showDamage = (amount: number, floored: boolean) => {
      this.#damageTexts?.spawn(640, 360, amount, floored);
      const son = sayiHavuzu.activeItems().at(-1);
      return { tint: son?.tintTopLeft ?? -1, scale: son?.scaleX ?? -1, text: son?.text ?? '' };
    };
    dev.hoverSpot = (spotIndex: number) => {
      this.#hoveredSpot = spotIndex;
      this.#drawHover();
    };
  }
}

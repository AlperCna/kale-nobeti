import Phaser from 'phaser';
import { GameClock } from '../systems/GameClock';
import { EventBus } from '../systems/EventBus';
import { PathSystem } from '../systems/PathSystem';
import { LineMover, PathMover } from '../systems/movers';
import { EnemyAbilitySystem } from '../systems/EnemyAbilitySystem';
import { applyEffect, speedMultiplier, stepEffects } from '../systems/effects';
import { WaveManager } from '../systems/WaveManager';
import type { WavePhase } from '../systems/WaveManager';
import { EconomySystem } from '../systems/EconomySystem';
import { TowerSystem } from '../systems/TowerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { SpotOccupancy, findSpotAt } from '../systems/buildSpots';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { Soldier } from '../entities/Soldier';
import {
  clampRally,
  defaultRally,
  spawnSoldier,
  stepSoldiers,
} from '../systems/BarracksSystem';
import { AbilitySystem } from '../systems/AbilitySystem';
import { ScreenShake } from '../fx/ScreenShake';
import { HitStop } from '../fx/HitStop';
import { Settings, getSettings, SAVE_FAILED_REGISTRY_KEY } from '../systems/Settings';
import { KISLA, barracksTierAt, BLOCK, SOLDIER_SPEED } from '../data/barracks';
import type { AbilityId } from '../types/ability';
import { DamageText, DamageTextSystem } from '../fx/DamageText';
import { GoldCoin, GoldFlightSystem } from '../fx/GoldFlight';
import { EnemyHealthBar } from '../fx/EnemyHealthBar';
import { EnemyHealthBarSystem } from '../fx/EnemyHealthBarSystem';
import { Particles } from '../fx/Particles';
import { MapRenderer } from '../fx/MapRenderer';
import { BuildMenu } from '../fx/BuildMenu';
import type { BarracksKayit } from '../fx/BuildMenu';
import { TowerInfoPanel } from '../fx/TowerInfoPanel';
import { SoundSystem } from '../fx/SoundSystem';
import { Pool } from '../util/pool';
import { averageCoverage, measureCoverage } from '../util/coverage';
import { MAP_1, getMap, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { PreloadScene } from './PreloadScene';
import type { MapDef } from '../types/map';
import { TOWERS, getTower, tierAt } from '../data/towers';
import { towerFrameKey } from '../data/spriteFrames';
import { getEnemy, ENEMIES } from '../data/enemies';
import { BALANCE, POOL_PREALLOC, GECICI_MERMI_HIZI, MERMI_ISABET_YARICAPI } from '../data/balance';
import { MAP1_WAVES, wavesFor } from '../data/waves';
import { devHooks } from '../util/devHooks';
import { t } from '../util/i18n';
import type { TargetMode, TierIndex, TowerDef } from '../types/tower';
import type { Mover } from '../types/enemy';
import type { Vec2 } from '../types/common';
import type { Wave } from '../types/wave';

/**
 * Greybox palet — `GAME-DESIGN.md` §2. Arka plan görseli ve sprite'lar M6'da;
 * M4 sonuna kadar oyun greybox'la tamamen oynanabilir olmalı
 * (`CLAUDE.md` Görsel yön, "Üretim kuralı").
 */
/** Savaş alanı gösterim boyutu — P04 brifinden "~30 px en uzun kenar" hedefinin karesel yaklaşımı. */
const ENEMY_SIZE = 30;
const GOLD_COLOR = 0xd4a032; // Altın varak
const INK_COLOR = 0x14203a;
const PROJECTILE_RADIUS = 5;
/** P03 brifi — kule/kışla gövdesi oyun içi gösterim boyutu (`Tower.ts` ile aynı). */
const TOWER_DISPLAY_SIZE = 64;

/** Asker (M5). Düşmandan küçük; TIER 1 kural 6: ayrım renge dayanmıyor. */
const SOLDIER_SIZE = 20;
const RALLY_COLOR = 0x3e6ca8;

/**
 * Altın uçuşunun vardığı nokta.
 *
 * Sayacın **merkezi değil, üst kenarının hemen üstü** — `Hud` sahnesi
 * `Game`'in her zaman üstünde çiziliyor (`CLAUDE.md` Mimari), yani bu
 * `GoldCoin` (bir `Game` nesnesi) parşömen kartın (`HudScene`'de,
 * `createParchmentFrame(this, MARGIN+96, MARGIN+66, 216, 140, 16)`, üst
 * kenarı `y=16`) ardına düşen her koordinatta **görünmez oluyor**. Canlı
 * testte yakalandı: coin sayaca yaklaşırken kartın arkasında kayboluyordu.
 * Bezier zaten yukarı kabararak yaklaşıyor (`ARC_HEIGHT`) — hedefi kartın
 * **üst kenarının 4 px üstüne** çekmek uçuşun neredeyse tamamını kartın
 * dışında (üstünde) tutuyor, yalnız varış anının son karesi sınırda oluyor.
 */
const HUD_GOLD_HEDEFI: Vec2 = { x: 44, y: 12 };

/**
 * Oyun alanı. Saatin sahibi.
 *
 * `Hud` bunun **üstünde paralel** çalışır (CLAUDE.md Mimari) —
 * duraklatmada `Game` durur, `Hud` durmaz.
 */
export class GameScene extends Phaser.Scene {
  readonly clock = new GameClock();
  readonly bus = new EventBus();

  #waves?: WaveManager<Enemy>;
  #eco?: EconomySystem;
  #towers?: TowerSystem;
  #projectiles?: ProjectileSystem<Enemy, Projectile>;
  #damageTexts?: DamageTextSystem;
  #altinUcusu?: GoldFlightSystem;
  /** `G05` — hasar görmüş düşmanların can çubuğu (seçenek b). */
  #enemyHealthBars?: EnemyHealthBarSystem;
  #enemyPool?: Pool<Enemy>;
  #abilities?: EnemyAbilitySystem<Enemy>;

  #occupancy?: SpotOccupancy;
  /** `Y01` adım 2 — harita çizimi, hover, uçan ipucu. */
  #mapRenderer?: MapRenderer;
  /** `Y01` adım 3 — yapı/yükseltme/satış/kışla menüsü. */
  #buildMenu?: BuildMenu;
  /** M6-T11 — `HudScene` `soundSystem` getter'ıyla erişiyor (zafer/yenilgi). */
  #soundSystem?: SoundSystem;
  #infoPanel?: TowerInfoPanel;
  #hoveredSpot = -1;
  #mermiTepe = 0;
  readonly #towerBySpot = new Map<number, Tower>();

  // ------------------------------------------------------------ kışla (M5)

  #soldierPool?: Pool<Soldier>;
  #rallyGfx?: Phaser.GameObjects.Graphics;
  /** Sürüklenen toplanma noktasının kışlası; `-1` = sürükleme yok. */
  #draggingRally = -1;
  /**
   * Yapı noktası → kışla kademesi + toplanma noktası + askerleri.
   *
   * Kule defterinden (`#towerBySpot`) **ayrı**: kışla bir `TowerDef` değil,
   * `TowerSystem`'e girmiyor (hasar vermiyor, menzili yok). Doluluk defteri
   * yine ortak — `SpotOccupancy` tek adres.
   */
  /** Şekil `fx/BuildMenu.ts`de tanımlı (`BarracksKayit`) — menü onu da okuyor. */
  readonly #barracksBySpot = new Map<number, BarracksKayit>();

  // --------------------------------------------------------- yetenekler (M5)

  // ------------------------------------------------------------ juice (M6)

  /** §10 — yönlü sarsıntı. Kamerayı sahne kaydırıyor, sınıf yalnız vektör üretiyor. */
  readonly shake = new ScreenShake();
  /** §10 — 60-80 ms, 2× hızda devre dışı. */
  readonly hitStop = new HitStop();
  /**
   * TIER 1 kural 6 + 10. `Y04`: `BootScene`de kurulup `registry`'ye
   * konan tekil örnek — `create()`'te okunuyor (alan başlatıcısı bir
   * kez koşardı, `registry`'den okumak her `create()`'te tazeleniyor,
   * ki zaten hep aynı örneği döndürüyor).
   */
  settings!: Settings;
  /** `Y01` adım 1 — juice katmanı (parçacık, ölüm ezilmesi, meteor, vinyet). */
  #efektler?: Particles;
  #kayitUyarildi = false;

  readonly abilities = new AbilitySystem();
  /** Tıkla-hedefle bekleyen yetenek; `null` = yok. */
  #pendingAbility: AbilityId | null = null;

  /**
   * **Oynanan harita.** M7'ye kadar `MAP_1` sabitti; 32 yerde doğrudan
   * geçiyordu ve harita 2-3 veri olarak var olduğu hâlde oynanamıyordu.
   *
   * `init()` her sahne başlatmasında koşuyor (bekçi kural 10), yani
   * seçim yeniden başlatmada da taze.
   */
  #map: MapDef = MAP_1;
  #waveList: readonly Wave[] = MAP1_WAVES;

  constructor() {
    super('Game');
  }

  /** Seviye seçim ekranı `{ mapId }` gönderiyor; yoksa harita 1. */
  init(data?: { mapId?: string }): void {
    this.#map = (data?.mapId !== undefined ? getMap(data.mapId) : undefined) ?? MAP_1;
    this.#waveList = wavesFor(this.#map.id);
  }

  get map(): MapDef {
    return this.#map;
  }

  /** M6-T11 — `HudScene` zafer/yenilgi sesini bunun üzerinden çalıyor. */
  get soundSystem(): SoundSystem | undefined {
    return this.#soundSystem;
  }

  /**
   * Atlas + harita 1 arka planı burada, hep. Harita 2-3 tembel —
   * yalnız o harita seçildiğinde (`M6-T03` kabul kriteri: ilk indirmede
   * yalnız harita 1).
   */
  preload(): void {
    PreloadScene.queueGame(this);
    if (this.#map.id !== 'degirmen-gecidi') {
      PreloadScene.queueLazy(this, this.#map.id);
    }
  }

  // ------------------------------------------------- HUD'un okuduğu durum

  get gold(): number {
    return this.#eco?.gold ?? 0;
  }

  /**
   * `#eco` yalnız `create()` bittikten sonra var. Tembel yüklenen harita
   * arka planı (2/3, `PreloadScene.queueLazy`) `preload()`'u gerçekten
   * asenkron yapıyor — `Hud`, `Game`'in `create()`'i bitmeden ilk
   * `update()`'ini çalıştırabiliyor. Geri dönüş `0` olsaydı `HudScene`'in
   * "can 0 → kaybettin" kontrolü *harita henüz yüklenirken* sahte bir
   * yenilgi tetikliyordu (canlı testte yakalandı — harita 1 hiç
   * görülmüyordu çünkü onun arka planı erken/istekli yükleniyor, bu yarış
   * yalnız 2/3'te açığa çıkıyordu). Tam can dönmek daha güvenli varsayılan:
   * "henüz başlamadıysa can eksilmemiştir."
   */
  get lives(): number {
    return this.#eco?.lives ?? BALANCE.startLives;
  }

  get wavePhase(): WavePhase {
    return this.#waves?.phase ?? 'prep';
  }

  get waveNumber(): number {
    return this.#waves?.waveNumber ?? 1;
  }

  get totalWaves(): number {
    return this.#waveList.length;
  }

  get prepRemainingSec(): number | null {
    return this.#waves?.phase === 'prep' ? (this.#waves.prepRemainingSec ?? 0) : null;
  }

  get upcomingWave(): Wave | undefined {
    return this.#waves?.upcomingWave;
  }

  get earlyStartAvailable(): boolean {
    return this.#waves?.earlyStartAvailable ?? false;
  }

  /**
   * `G05` — boss can çubuğu için. Aynı anda birden fazla boss
   * beklenmiyor (dalga tasarımı tek boss); yine de savunmacı olarak
   * **ilk** canlı boss döndürülüyor, `find` sırası havuzun iç sırası
   * (kararlı, `Y02`'nin araştırdığı `Set` sırası).
   */
  get bossInfo(): { hp: number; maxHp: number } | null {
    const boss = (this.#enemyPool?.activeItems() ?? []).find(
      (e) => e.alive && e.def?.id === 'ogreSef',
    );
    return boss !== undefined ? { hp: boss.hp, maxHp: boss.maxHp } : null;
  }

  /** @returns Kazanılan bonus altın. */
  startWaveEarly(): number {
    return this.#waves?.startWaveEarly() ?? 0;
  }

  create(): void {
    // `Y04` — `BootScene`de kurulan tekil `Settings` buradan okunuyor.
    // Her `create()`'te tekrar okumak zararsız: `registry` hep aynı
    // örneği döndürüyor, yalnız *nereden* okunduğu değişti.
    this.settings = getSettings(this);

    // **Alan başlatıcıları yalnız BİR KEZ koşuyor; `create()` her yeniden
    // başlatmada.** Phaser sahne örneğini yeniden kullanıyor, yani
    // `#towerBySpot` önceki oyunun (yok edilmiş) kulelerini taşıyordu —
    // yeni oyunda dolu nokta gibi görünüyor, yükseltme yok edilmiş bir
    // nesneyi değiştiriyordu. Canlı testte yakalandı.
    //
    // Bu, M0'daki `once`/`on` hatasıyla aynı sınıf: "kurucuda bir kez"
    // ile "her `create`'te" karıştırılınca sızıntı **çökme değil, yanlış
    // durum** olarak görünüyor.
    this.#towerBySpot.clear();
    this.#hoveredSpot = -1;
    this.#mermiTepe = 0;
    this.#soundSystem = undefined;
    // M5: kışla ve yetenek durumu da yeniden başlatmada sıfırlanıyor —
    // aynı tuzak (alan başlatıcısı bir kez, `create` her seferinde).
    this.#barracksBySpot.clear();
    // **`#gecici` de burada.** Atlanmıştı, canlı testte yakalandı: yeniden
    // başlatmadan sonra `soldiers()` 2 asker gösteriyordu ama yeni havuzun
    // `activeCount`'u 0'dı — o ikisi **yok edilmiş sahnenin** askerleriydi.
    // Her karede işleniyor, yeni havuz onları tanımadığı için (`release`
    // bilinmeyen nesneyi yok sayıyor) asla iade edilemiyor ve her yeniden
    // başlatmada birikiyorlardı.
    //
    // Aynı tuzağın **dördüncü** görünümü (M0 `once`/`on`, M4
    // `#towerBySpot`, M5 kışla durumu). Bekçiye kural 10 bu yüzden eklendi.
    this.#gecici.length = 0;
    this.#draggingRally = -1;
    this.#pendingAbility = null;
    this.abilities.reset(); // S49 — beklemeler haritalar arası sıfırlanıyor
    // M6 juice durumu da yeniden başlatmada sıfırlanıyor.
    this.shake.reset();
    this.hitStop.reset();
    this.#kayitUyarildi = false;
    // Gecikmiş kayıt-hatası bildirimi (TIER 1 kural 10) — `#kayitUyarildi`
    // sıfırlandıktan SONRA kontrol edilmeli, yoksa önceki oturumdan kalan
    // `true` bu çağrıyı sessizce yutar. Bkz. `Settings.ts`
    // `SAVE_FAILED_REGISTRY_KEY`'in "bilinen sınır" notu.
    if (this.registry.get(SAVE_FAILED_REGISTRY_KEY) === true) {
      this.registry.set(SAVE_FAILED_REGISTRY_KEY, false);
      this.#kayitUyar();
    }
    this.shake.enabled = this.settings.state.screenShake;

    const yol = this.#map.paths[0] ?? [];
    const path = new PathSystem(yol);
    // Birden fazla giriş olabilir (`M7-T01`/`T02` Y ayrımı / iki giriş) —
    // her yol kendi `PathMover`'ını alır, `WaveGroup.spawnPoint` hangisini
    // seçeceğini söylüyor. Daha önce yalnız `paths[0]` kullanılıyordu ve
    // ikinci giriş hem çizimde hem harekette **hiç** devreye girmiyordu.
    const groundMovers: Mover[] = this.#map.paths.map((p) => new PathMover(new PathSystem(p)));

    // Arka plan da bir kez — yol/yapı noktaları onun ÜSTÜNE çiziliyor
    // (P01 brifi: arka plan kendi yolunu çizmiyor, oyun kodu çiziyor).
    this.add.image(this.scale.width / 2, this.scale.height / 2, `bg-${this.#map.id}`);
    // Harita **bir kez** çiziliyor. `update`'te yeniden çizmek her karede
    // yeni geometri üretmek demek; Graphics'in maliyeti orada.
    // `Y01` adım 2 — çizim `fx/MapRenderer.ts`'e taşındı.
    this.#mapRenderer = new MapRenderer(this, this.#map);
    // Bilgi paneli: harita 1 kadrosunun düşmanları (S42).
    this.#infoPanel = new TowerInfoPanel(
      this,
      this.scale.width - 262,
      this.scale.height - 222,
      ENEMIES.filter((e) => this.#map.enemyRoster.includes(e.id)),
    );

    // TIER 1 kural 3: `Group` burada, sahne tarafında — görüntü listesi ve
    // sahne kapanınca toplanma onun işi. Havuz *muhasebesi* `util/pool.ts`
    // içinde ve Phaser'sız (CLAUDE.md kural 3'ün kural 11 sınırı).
    const dusmanGrup = this.add.group({ runChildUpdate: false });
    const mermiGrup = this.add.group({ runChildUpdate: false });
    const sayiGrup = this.add.group({ runChildUpdate: false });
    const altinGrup = this.add.group({ runChildUpdate: false });
    const canCubuguGrup = this.add.group({ runChildUpdate: false });

    const enemyPool = new Pool<Enemy>(
      () => {
        const e = new Enemy(this, ENEMY_SIZE);
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

    const altinHavuzu = new Pool<GoldCoin>(
      () => {
        const c = new GoldCoin(this);
        altinGrup.add(c);
        return c;
      },
      POOL_PREALLOC.goldFlight,
      (k) => this.#havuzDoldu('altın uçuşu', k),
    );
    this.#altinUcusu = new GoldFlightSystem(altinHavuzu, HUD_GOLD_HEDEFI.x, HUD_GOLD_HEDEFI.y);

    const canCubuguHavuzu = new Pool<EnemyHealthBar>(
      () => {
        const b = new EnemyHealthBar(this);
        canCubuguGrup.add(b);
        return b;
      },
      POOL_PREALLOC.enemyHealthBar,
      (k) => this.#havuzDoldu('düşman can çubuğu', k),
    );
    const enemyHealthBars = new EnemyHealthBarSystem(canCubuguHavuzu);
    this.#enemyHealthBars = enemyHealthBars;

    // Asker havuzu — `research/02` §7 tablosu 24 diyor. Kışla askerleri ve
    // Takviye'nin geçici askerleri **aynı** havuzdan geliyor: ikisi de
    // `SoldierState`, ayrım yalnız `lifetimeLeft`.
    const askerGrup = this.add.group({ runChildUpdate: false });
    this.#soldierPool = new Pool<Soldier>(
      () => {
        const s = new Soldier(this, SOLDIER_SIZE);
        askerGrup.add(s);
        return s;
      },
      POOL_PREALLOC.soldier,
      (k) => this.#havuzDoldu('asker', k),
    );
    this.#rallyGfx = this.add.graphics();
    // `Y01` adım 1 — juice katmanı `fx/Particles.ts`'e taşındı.
    this.#efektler = new Particles(this, this.settings, this.clock, enemyPool, enemyHealthBars);

    this.#projectiles = new ProjectileSystem<Enemy, Projectile>(
      mermiHavuzu,
      (e, sonuc, x, y) => {
        this.#damageTexts?.spawn(x, y - ENEMY_SIZE, sonuc.dealt, sonuc.floored);
        // §10: sarsıntı YALNIZ top patlaması, boss vuruşu ve can kaybında.
        // Okçu atışı sarsmıyor — kural metninde adı geçen karşı örnek.
        if (e.def?.id === 'ogreSef' && sonuc.dealt > 0) {
          this.hitStop.trigger(80, this.clock.scale);
          this.shake.trigger(x - e.x || 1, y - e.y, 0.5);
        }
        this.#efektler?.patlat(x, y, x - e.x, y - e.y, 4);
        this.#hasarUygula(e, sonuc.dealt);
      },
      // Süreli etkiler isabet anında uygulanıyor (yanma, yavaşlatma).
      (e, effect) => applyEffect(e.effects, effect),
      // §10: ekran sarsıntısı **yalnız** top patlamasında (ve boss vuruşu,
      // can kaybı). Yön yukarı — patlama zeminden geliyor.
      (x, y, r) => {
        this.shake.trigger(0, 1, Math.min(1, r / 90));
        this.#efektler?.patlat(x, y, 0, -1, 16);
      },
    );

    this.#soundSystem = new SoundSystem(this, this.bus, this.#waveList);

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
        effect: tier.effect,
      });
      m?.activate();
      this.#soundSystem?.playTowerShot(kule.def.id);
    }, this.bus);

    // Uçanlar `flyerPaths` üstünde düz gidiyor (§5). Seçim burada; `Enemy`
    // hangi hareketle geldiğini bilmiyor (`DEPENDENCIES.md` §2). Yerdekiler
    // gibi giriş başına bir hat — harita 3'ün iki uçan rotası var.
    const flyerMovers: Mover[] = this.#map.flyerPaths.map((p) => new LineMover(p));
    const moverFor = (def: { flying: boolean }, spawnPoint: number): Mover => {
      const havuz = def.flying ? flyerMovers : groundMovers;
      return havuz[spawnPoint] ?? havuz[0] ?? groundMovers[0] ?? new PathMover(path);
    };

    this.#eco = new EconomySystem(this.#map, this.bus);
    this.#abilities = new EnemyAbilitySystem(enemyPool, this.#map.hpMultiplier, getEnemy);
    this.#waves = new WaveManager(
      enemyPool,
      moverFor,
      this.bus,
      this.#eco,
      this.#waveList,
      this.#map.hpMultiplier,
      getEnemy,
      // `G05` — sızan düşmanın can çubuğu da havuza dönmeden önce
      // serbest kalmalı, ölüm yoluyla aynı sözleşme (`Particles.olumEfekti`).
      (e) => this.#enemyHealthBars?.releaseFor(e),
    );

    this.#occupancy = new SpotOccupancy(this.#map.buildSpots.length);

    // `Y01` adım 3 — yapı/yükseltme/satış/kışla menüsü. Geri çağrım
    // tabanlı: ekonomi/yerleştirme burada kalıyor, menü yalnız "hangi
    // buton görünsün" karar verip tıklamayı buraya yönlendiriyor.
    this.#buildMenu = new BuildMenu(
      this,
      this.bus,
      this.#map,
      this.#eco,
      this.#towerBySpot,
      this.#barracksBySpot,
      this.#infoPanel,
      {
        placeTower: (spotIndex, def) => this.#placeTower(spotIndex, def),
        placeBarracks: (spotIndex) => this.#placeBarracks(spotIndex),
        sellTower: (spotIndex) => this.#sellTower(spotIndex),
        sellBarracks: (spotIndex) => this.#sellBarracks(spotIndex),
        upgradeTower: (spotIndex, tier) => this.#upgradeTower(spotIndex, tier),
        upgradeBarracks: (spotIndex, tier) => this.#upgradeBarracks(spotIndex, tier),
        redrawRally: () => this.#drawRally(),
      },
    );

    this.#setupInput();

    this.bus.on('life:lost', ({ remaining }) => {
      // §10: can kaybında vermilyon vinyet nabzı + yönlü sarsıntı.
      this.#efektler?.vinyetNabzi();
      this.shake.trigger(0, 1, 0.8);
      // Kaybetme ekranı M3'te. Şimdilik yalnız geliştirme çıktısı.
      if (import.meta.env.DEV) console.info(`[can] kalan ${remaining}`);
    });

    // M6-T11 — dalga 1 boyunca sessiz (brif: "oyun içinde, dalga 1
    // bittikten sonra devreye giriyor"), menü müziği burada susuyor.
    this.sound.stopByKey('music_menu');
    this.bus.on('wave:ended', ({ index }) => {
      if (index !== 1) return;
      const basla = (): void => {
        this.sound.play('music_game', { loop: true, volume: 0.5 });
      };
      if (this.cache.audio.exists('music_game')) {
        basla();
      } else {
        this.load.once('filecomplete-audio-music_game', basla);
        PreloadScene.queueBackground(this);
        this.load.start();
      }
    });

    // `once`, `on` DEĞİL. Phaser kaynağı (Systems.js):
    //   - `shutdown()` yalnız SHUTDOWN yayar, dinleyicileri KALDIRMAZ
    //     (`removeAllListeners` `destroy()` içinde, 810. satır)
    //   - `SceneManager.create()` her başlatmada `create()`'i çağırır
    // Yani `on` kullanılsaydı her yeniden başlatma kalıcı bir dinleyici
    // daha eklerdi ve `bus.clear()` N. kapanışta N kez çağrılırdı.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // **Havuzlar burada `releaseAll` edilmiyor.** İlk yazımda ediliyordu
      // ve sahne yeniden başlatılınca çöküyordu:
      //   TypeError: Cannot read properties of null (reading 'chars')
      //   at GetBitmapTextSize → DamageText.resetForPool → setText
      // Sebep: `shutdown` sırasında Phaser görüntü listesini çoktan
      // yıkmış oluyor; yıkılmış bir `BitmapText`e `setText` çağırmak
      // font verisine dokunuyor ve o veri artık yok.
      //
      // Zaten gereksizdi: havuzlar `create()` içinde kuruluyor, yeniden
      // başlatmada yenileri yaratılıyor ve eskiler sahneyle birlikte
      // toplanıyor. Sıfırlamanın koruduğu şey (ölü hedef referansı) yalnız
      // **yaşayan** bir havuzda anlamlı.
      this.bus.clear();
      // M6-T11 — `Game`den çıkarken oyun müziği susuyor; `Menu` kendi
      // müziğini kendi başlatıyor (`MenuScene.create()`).
      this.sound.stopByKey('music_game');
      const d = devHooks();
      if (d !== undefined) d.clearCount = (d.clearCount ?? 0) + 1;
    });

    this.#devKancalari(path, enemyPool, mermiHavuzu, sayiHavuzu, altinHavuzu, canCubuguHavuzu);
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
    // **Hit-stop oyun zamanını sıfırlıyor** (§10). Sayacı duvar saatiyle
    // işliyor — durdurduğu saatle kendini ölçseydi hiç bitmezdi.
    const donduruldu = this.hitStop.update(delta);
    const sd = donduruldu ? 0 : this.clock.scaledDelta;

    this.#waves?.update(sd);
    const dusmanlar = this.#enemyPool?.activeItems() ?? [];
    this.#abilities?.update(sd);
    this.#etkileriIsle(sd, dusmanlar);
    // Kışla, kulelerden **önce**: engellenen düşman aynı karede duruyor,
    // yani kule ona ateş ederken doğru konumda oluyor.
    this.#kislalariIsle(sd, dusmanlar);
    this.abilities.tick(sd);
    this.#towers?.update(sd, dusmanlar);
    this.#projectiles?.update(sd, dusmanlar);
    this.#damageTexts?.update(sd);
    this.#altinUcusu?.update(sd);
    this.#enemyHealthBars?.update(dusmanlar);
    this.#mapRenderer?.updateFlyerHint(this.#waves?.upcomingWave);

    const aktifMermi = this.#projectiles?.activeCount ?? 0;
    if (aktifMermi > this.#mermiTepe) this.#mermiTepe = aktifMermi;

    // §10 ekran sarsıntısı — kamerayı sahne kaydırıyor.
    this.shake.update(sd);
    const kayma = this.shake.offset;
    this.cameras.main.setScroll(kayma.x, kayma.y);

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
    if (e.def !== null) this.#eco?.award(e.def);
    this.bus.emit('enemy:killed', { id: e.id, gold: e.def?.gold ?? 0 });

    // §10 juice — hit-stop yalnız ölümde ve boss hasarında; sarsıntı
    // **her ölümde değil** (§10: "her okçu atışında sarsıntı olmaz").
    this.hitStop.trigger(e.def?.id === 'ogreSef' ? 80 : 60, this.clock.scale);
    this.#efektler?.patlat(e.x, e.y, 0, -1, 10);
    if (e.def?.id === 'ogreSef') this.shake.trigger(0, 1, 1);
    // Altın uçuşu — ödül kazandıran her ölümde (§10). Salt görsel; gerçek
    // altın zaten yukarıda anında kazanıldı, o yüzden TIER 1 k.6 efekt
    // yoğunluğu 0'ken sessizce atlanabiliyor.
    if (e.def !== null && e.def.gold > 0 && this.settings.effectScale > 0) {
      this.#altinUcusu?.spawn(e.x, e.y);
    }

    // Bölünme havuza DÖNMEDEN önce — yavrular annenin `progress`'ini
    // devralıyor ve `release` onu sıfırlıyor.
    this.#abilities?.splitOnDeath(e);
    this.#efektler?.olumEfekti(e);
  }

  /** Yanma hasarı ve yavaşlatma çarpanı — `effects.ts` saf tarafı. */
  #etkileriIsle(scaledDelta: number, dusmanlar: readonly Enemy[]): void {
    for (const e of dusmanlar) {
      if (!e.alive) continue;
      const yanma = stepEffects(e.effects, scaledDelta);
      e.speedFactor = speedMultiplier(e.effects);
      if (yanma > 0) {
        // Yanma **gerçek hasar**: zırh/direnç uygulanmıyor (§4.1'de yanma
        // ayrı bir kanal olarak tanımlı, vuruşun kendisi değil).
        //
        // **Hasar sayısı ÇIKMIYOR.** Yanma her karede tik atıyor; saniyede
        // 60 sayı üretmek 60'lık havuzu tek yanan düşmanla doldururdu ve
        // gerçek vuruşların sayısı görünmez olurdu. M6'da yanan düşmana
        // turuncu bir tint verilecek — bilgi kaybolmuyor, kanal değişiyor.
        this.#hasarUygula(e, yanma);
      }
    }
  }

  // ------------------------------------------------------------ kışla (M5)

  /**
   * Tüm kışlaların askerlerini bir kare ilerletir.
   *
   * Dokuz engelleme kuralı `BarracksSystem`'de ve `node`'da test edilmiş
   * durumda; burada kalan tek şey Phaser tarafı: konum, görünürlük,
   * ölmüş/ömrü dolmuş askerin havuza dönüşü.
   */
  #kislalariIsle(scaledDelta: number, dusmanlar: readonly Enemy[]): void {
    // Takviye'nin geçici askerleri hiçbir kışlaya ait değil ama **aynı**
    // dokuz kurala tabi (S47). Diriliş süresi anlamsız — ölünce zaten
    // `expired` olup havuza dönüyorlar.
    if (this.#gecici.length > 0) {
      const { expired } = stepSoldiers(this.#gecici, dusmanlar, scaledDelta, 0);
      for (const s of expired) {
        const i = this.#gecici.indexOf(s as Soldier);
        if (i >= 0) this.#gecici.splice(i, 1);
        this.#soldierPool?.release(s as Soldier);
      }
      for (const s of this.#gecici) {
        s.setPosition(s.x, s.y);
        s.refreshVisual();
      }
    }

    if (this.#barracksBySpot.size === 0) return;

    for (const [, k] of this.#barracksBySpot) {
      const kademe = barracksTierAt(KISLA, k.tier);
      const { expired } = stepSoldiers(k.soldiers, dusmanlar, scaledDelta, kademe.respawnSeconds);

      // Ömrü dolan **geçici** asker havuza döner. Kışla askeri burada
      // görünmez — `lifetimeLeft` sonsuz olduğu için `expired`'a girmiyor.
      for (const s of expired) {
        const i = k.soldiers.indexOf(s as Soldier);
        if (i >= 0) k.soldiers.splice(i, 1);
        this.#soldierPool?.release(s as Soldier);
      }

      for (const s of k.soldiers) {
        s.setPosition(s.x, s.y);
        // Ölü asker gizleniyor ama havuza DÖNMÜYOR: diriliş sayacı
        // `BarracksSystem` içinde işliyor ve nesne o sayacı taşıyor.
        s.setVisible(s.state !== 'dead');
        if (s.state !== 'dead') s.refreshVisual();
      }
    }
    // **`#drawRally()` BURADA ÇAĞRILMIYOR.** İlk yazımda çağrılıyordu ve
    // dalga 10'un kare maliyetini 0,95 ms'ten 3,5 ms'e çıkardı (canlı
    // ölçüm): her karede `Graphics.clear()` + kesikli çember + kesikli
    // çizgi yeniden üretmek demekti. `MapRenderer.drawHover` zaten aynı sebeple
    // yalnız hover değiştiğinde çiziliyor; toplanma noktası da yalnız
    // **değiştiğinde** çiziliyor (kurma, satma, seçim, sürükleme).
  }

  /** Seçili kışlanın toplanma noktası ve menzil halkası. */
  #drawRally(): void {
    const g = this.#rallyGfx;
    if (g === undefined) return;
    g.clear();

    for (const [spotIndex, k] of this.#barracksBySpot) {
      const secili = spotIndex === (this.#buildMenu?.selectedSpot ?? -1) || spotIndex === this.#draggingRally;
      k.marker.setPosition(k.rally.x, k.rally.y).setVisible(true).setAlpha(secili ? 1 : 0.45);

      if (!secili) continue;
      const spot = this.#map.buildSpots[spotIndex];
      if (spot === undefined) continue;

      // Toplanma menzili (kural 6) — kesikli, kule menzil halkasıyla aynı dil.
      g.lineStyle(2, RALLY_COLOR, 0.5);
      this.#mapRenderer?.dashedCircle(g, spot, BLOCK.rallyRange, RALLY_COLOR, 2);
      // Kışla → toplanma noktası bağı.
      g.lineStyle(2, RALLY_COLOR, 0.7);
      this.#mapRenderer?.dashedLine(g, spot, k.rally, 8);
    }
  }

  #placeBarracks(spotIndex: number): boolean {
    const spot = this.#map.buildSpots[spotIndex];
    if (spot === undefined) return false;

    const kademe = barracksTierAt(KISLA, 0);
    if (this.#eco?.canAfford(kademe.cost) !== true) return false;
    if (this.#occupancy?.occupy(spotIndex) !== true) return false;
    this.#eco.buyAt(spotIndex, kademe.cost);

    const marker = this.add.circle(0, 0, 7, RALLY_COLOR, 0.9).setStrokeStyle(2, INK_COLOR);
    // Kışla gövdesi — kule ile aynı görsel dil (`towerFrameKey`), ama
    // `TowerSystem`'e girmiyor, `Tower` sınıfını kullanmıyor.
    const govde = this.add
      .image(spot.x, spot.y, 'atlas', towerFrameKey('kisla', 0))
      .setDisplaySize(TOWER_DISPLAY_SIZE, TOWER_DISPLAY_SIZE);
    const kayit = {
      tier: 0 as 0 | 1 | 2 | 3,
      rally: defaultRally(spot, this.#map.paths),
      soldiers: [] as Soldier[],
      marker,
      govde,
    };
    this.#barracksBySpot.set(spotIndex, kayit);
    this.#askerleriKur(spotIndex);
    this.#drawRally();

    this.#buildMenu?.closeMenu();
    return true;
  }

  /** Kademenin gerektirdiği kadar askeri havuzdan alıp doğurur. */
  #askerleriKur(spotIndex: number): void {
    const k = this.#barracksBySpot.get(spotIndex);
    const spot = this.#map.buildSpots[spotIndex];
    if (k === undefined || spot === undefined) return;

    const kademe = barracksTierAt(KISLA, k.tier);

    // Fazlalık varsa havuza döner (yükseltmede asker sayısı değişebiliyor).
    while (k.soldiers.length > kademe.soldierCount) {
      const s = k.soldiers.pop();
      if (s !== undefined) this.#soldierPool?.release(s);
    }

    while (k.soldiers.length < kademe.soldierCount) {
      const s = this.#soldierPool?.acquire();
      if (s === null || s === undefined) break; // havuz doldu — `new` yok
      k.soldiers.push(s);
    }

    k.soldiers.forEach((s, i) => {
      // Askerler toplanma noktası çevresine yayılıyor; üst üste binmeleri
      // engelleme mantığını bozmaz ama görsel olarak tek asker gibi durur.
      const yayilma = (i - (kademe.soldierCount - 1) / 2) * 14;
      spawnSoldier(s, spot, { x: k.rally.x + yayilma, y: k.rally.y }, {
        hp: kademe.soldierHp,
        dps: kademe.soldierDps,
        evasion: kademe.evasion ?? 0,
        speed: SOLDIER_SPEED,
      });
      s.spotIndex = spotIndex;
      s.activate();
    });
  }

  /** Toplanma noktasını taşır — kural 6 kısıtlarından geçirerek. */
  #setRally(spotIndex: number, istenen: Vec2): void {
    const k = this.#barracksBySpot.get(spotIndex);
    const spot = this.#map.buildSpots[spotIndex];
    if (k === undefined || spot === undefined) return;

    k.rally = clampRally(spot, istenen, this.#map.paths, k.rally);
    const kademe = barracksTierAt(KISLA, k.tier);
    k.soldiers.forEach((s, i) => {
      const yayilma = (i - (kademe.soldierCount - 1) / 2) * 14;
      s.rally = { x: k.rally.x + yayilma, y: k.rally.y };
      // Kilitli asker toplanma noktasına hemen koşmuyor; kilit kırılınca
      // (kural 4) 'idle' oluyor ve yeni noktaya yöneliyor.
    });
    this.#drawRally();
  }

  #sellBarracks(spotIndex: number): number {
    const k = this.#barracksBySpot.get(spotIndex);
    if (k === undefined) return 0;

    const iade = this.#eco?.sellAt(spotIndex) ?? 0;
    // **S46:** kışla satılınca askerler anında havuza döner. `release`
    // `resetSoldierState`'i çağırıyor, o da kilidi **iki taraflı** kırıyor —
    // yani engellenen düşmanlar aynı karede serbest kalıyor.
    for (const s of k.soldiers) this.#soldierPool?.release(s);
    k.marker.destroy();
    k.govde.destroy();
    this.#barracksBySpot.delete(spotIndex);
    this.#occupancy?.free(spotIndex);
    this.#buildMenu?.closeMenu();
    this.#drawRally();
    return iade;
  }

  #upgradeBarracks(spotIndex: number, hedef: 0 | 1 | 2 | 3): boolean {
    const k = this.#barracksBySpot.get(spotIndex);
    if (k === undefined) return false;

    const kademe = barracksTierAt(KISLA, hedef);
    if (this.#eco?.canAfford(kademe.cost) !== true) return false;
    this.#eco.buyAt(spotIndex, kademe.cost);
    k.tier = hedef;
    k.govde.setFrame(towerFrameKey('kisla', hedef));
    // Yükseltme askerleri **tazeliyor**: yeni HP ile doğuyorlar. Kule
    // tarafında bekleme sıfırlanmıyordu (S40); burada karşılığı yok,
    // asker zaten sürekli bir varlık.
    this.#askerleriKur(spotIndex);
    this.#buildMenu?.closeMenu();
    return true;
  }

  // --------------------------------------------------------- yetenekler (M5)

  /** HUD'dan çağrılıyor: yetenek seçildi, sıradaki tık hedefi belirliyor. */
  armAbility(id: AbilityId): boolean {
    if (!this.abilities.ready(id)) return false;
    this.#pendingAbility = this.#pendingAbility === id ? null : id;
    return this.#pendingAbility !== null;
  }

  get pendingAbility(): AbilityId | null {
    return this.#pendingAbility;
  }

  /** @returns Yetenek kullanıldıysa `true` — tık kule menüsüne gitmiyor. */
  #tryCastAbility(at: Vec2): boolean {
    const id = this.#pendingAbility;
    if (id === null) return false;
    this.#pendingAbility = null;

    const dusmanlar = this.#enemyPool?.activeItems() ?? [];
    if (id === 'meteor') {
      const r = this.abilities.castMeteor(at, dusmanlar);
      if (r === null) return true;
      // Ölenleri işle — `castMeteor` yalnız `hp` düşürüyor, ölüm
      // muhasebesi (altın, olay, bölünme, havuz) sahnenin işi.
      for (const e of dusmanlar) {
        if (e.alive && e.hp <= 0) this.#hasarUygula(e, 0);
      }
      this.#efektler?.meteorEfekti(at);
      return true;
    }

    this.abilities.castReinforcements(at, () => {
      const s = this.#soldierPool?.acquire() ?? null;
      if (s !== null) {
        s.spotIndex = -1;
        s.activate();
        this.#gecici.push(s);
      }
      return s;
    });
    return true;
  }

  /** Takviye'nin geçici askerleri — hiçbir kışlaya ait değiller. */
  readonly #gecici: Soldier[] = [];

  /**
   * TIER 1 kural 10 son cümlesi: "Kayıt başarısızsa oyuncuya **bir kez**
   * bildirilir." Gizli sekmede ayarlar kalıcı olmuyor; oyun çalışmaya
   * devam ediyor ama oyuncu bunu bilmeli.
   */
  #kayitUyar(): void {
    if (this.#kayitUyarildi) return;
    this.#kayitUyarildi = true;
    this.bus.emit('save:failed', { once: true });
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
      // Toplanma noktası sürükleniyorsa hover'a bakılmıyor (M5-T03).
      if (this.#draggingRally >= 0) {
        this.#setRally(this.#draggingRally, { x: p.worldX, y: p.worldY });
        return;
      }
      const i = findSpotAt({ x: p.worldX, y: p.worldY }, this.#map.buildSpots);
      if (i === this.#hoveredSpot) return;
      this.#hoveredSpot = i;
      this.#mapRenderer?.drawHover(this.#hoveredSpot);
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.#draggingRally = -1;
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      const nokta = { x: p.worldX, y: p.worldY };

      // 1) Bekleyen yetenek her şeyin önünde — tıkla-hedefle (§8).
      if (this.#tryCastAbility(nokta)) {
        this.#buildMenu?.closeMenu();
        return;
      }

      // 2) Seçili kışlanın toplanma işaretçisine basıldıysa sürükleme başlar.
      const secili = this.#barracksBySpot.get((this.#buildMenu?.selectedSpot ?? -1));
      if (secili !== undefined) {
        const dx = nokta.x - secili.rally.x;
        const dy = nokta.y - secili.rally.y;
        // Tutma alanı 44×44 px (CLAUDE.md Platform) → yarıçap 22.
        if (dx * dx + dy * dy <= 22 * 22) {
          this.#draggingRally = (this.#buildMenu?.selectedSpot ?? -1);
          return;
        }
      }

      const i = findSpotAt(nokta, this.#map.buildSpots);
      if (i < 0) {
        this.#buildMenu?.closeMenu();
        return;
      }
      if (this.#occupancy?.isOccupied(i) === true) {
        this.#buildMenu?.openSellMenu(i);
        return;
      }
      this.#buildMenu?.openMenu(i);
    });
  }

  /**
   * Kademe yükseltme. Maliyet **kademenin kendi `cost`'u**, kümülatif değil
   * (§4.1 tablosu). Satış iadesi ise harcanan **toplamın** %70'i (§4.5) —
   * `EconomySystem.buyAt` toplamı yapı noktasına yazıyor.
   *
   * **S40: yükseltme sırasında kule ateş etmeye devam ediyor.** Bekleme
   * süresi sıfırlanmıyor; yalnız hedef düşürülüyor çünkü yeni kademenin
   * menzili farklı olabilir. Kesinti koymak "yükseltme anında sızma"
   * gibi bir cezayı ücretsiz getirirdi ve §6 zaten yükseltmeyi altın
   * başına verimsiz kılıyor — ikinci bir ceza gereksiz.
   */
  #upgradeTower(spotIndex: number, hedefKademe: TierIndex): boolean {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined) return false;
    // T1'den yalnız T2'ye, T2'den yalnız dallara.
    if (hedefKademe === 1 && kule.tierIndex !== 0) return false;
    if (hedefKademe >= 2 && kule.tierIndex !== 1) return false;
    if (hedefKademe === 0) return false;

    const maliyet = tierAt(kule.def, hedefKademe).cost;
    if (this.#eco?.buyAt(spotIndex, maliyet) !== true) return false;

    kule.setTier(hedefKademe);
    kule.target = null;
    this.bus.emit('tower:upgraded', { spotIndex });
    this.#buildMenu?.closeMenu();
    return true;
  }

  #placeTower(spotIndex: number, def: TowerDef): boolean {
    const spot = this.#map.buildSpots[spotIndex];
    if (spot === undefined) return false;

    const maliyet = def.tiers[0].cost;
    // **Önce para, sonra yer.** Ters sıra olsaydı parası yetmeyen oyuncu
    // noktayı kilitler ve o nokta boşa giderdi.
    if (this.#eco?.canAfford(maliyet) !== true) return false;
    // Doluluk defteri **tek yerde**: `SpotOccupancy`. `TowerSystem` kendi
    // kontrolünü yapmıyor — aynı defteri iki yerde tutmak sessizce ayrışır.
    if (this.#occupancy?.occupy(spotIndex) !== true) return false;
    this.#eco.buyAt(spotIndex, maliyet);

    // §10 kule yerleşimi: toz halkası. (40 ms zoom M6-T10'un görsel
    // yarısı; kamera kaydırması sarsıntıyla çakışmasın diye eklenmedi.)
    this.#efektler?.patlat(spot.x, spot.y, 0, -1, 14);

    const kule = new Tower(this, spotIndex, spot.x, spot.y, def);
    this.#towerBySpot.set(spotIndex, kule);
    this.#towers?.add(kule);
    this.#buildMenu?.closeMenu();
    return true;
  }

  /** Kule satışı — harcanan **toplamın** %70'i (`GAME-DESIGN.md` §4.5). */
  #sellTower(spotIndex: number): number {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined) return 0;

    const iade = this.#eco?.sellAt(spotIndex) ?? 0;
    this.#towers?.remove(spotIndex);
    this.#occupancy?.free(spotIndex);
    this.#towerBySpot.delete(spotIndex);
    kule.destroy(true);
    this.#buildMenu?.closeMenu();
    return iade;
  }

  #devKancalari(
    path: PathSystem,
    enemyPool: Pool<Enemy>,
    mermiHavuzu: Pool<Projectile>,
    sayiHavuzu: Pool<DamageText>,
    altinHavuzu: Pool<GoldCoin>,
    canCubuguHavuzu: Pool<EnemyHealthBar>,
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
    dev.lives = () => this.#eco?.lives ?? -1;
    dev.pathLength = () => path.totalLength;
    dev.coverage = () => this.#map.coverage;
    dev.coverageAverage = () => averageCoverage(this.#map.coverage);

    dev.projectileActive = () => mermiHavuzu.activeCount;
    dev.projectilePeak = () => this.#mermiTepe;
    dev.damageTextActive = () => sayiHavuzu.activeCount;
    dev.goldFlightActive = () => altinHavuzu.activeCount;
    dev.enemyHealthBarActive = () => canCubuguHavuzu.activeCount;
    dev.towerCount = () => this.#towers?.towers.length ?? 0;
    dev.placeTower = (spotIndex: number, towerId: string) => {
      const def = getTower(towerId as TowerDef['id']);
      return def !== undefined && this.#placeTower(spotIndex, def);
    };
    dev.showDamage = (amount: number, floored: boolean) => {
      this.#damageTexts?.spawn(640, 360, amount, floored);
      const son = sayiHavuzu.activeItems().at(-1);
      return { tint: son?.tintTopLeft ?? -1, scale: son?.scaleX ?? -1, text: son?.text ?? '' };
    };
    dev.upgradeTower = (spotIndex: number, tier = 1) => this.#upgradeTower(spotIndex, tier as TierIndex);
    dev.sellTower = (spotIndex: number) => this.#sellTower(spotIndex);
    dev.selectTower = (spotIndex: number) => {
      this.#buildMenu?.openSellMenu(spotIndex);
      return this.#infoPanel?.visible ?? false;
    };
    dev.infoDps = (enemyId: string) => this.#infoPanel?.dpsFor(enemyId) ?? -1;
    dev.setTargetMode = (spotIndex: number, mod: string) => {
      this.#buildMenu?.setTargetMode(spotIndex, mod as TargetMode);
      return this.#towerBySpot.get(spotIndex)?.targetMode ?? '';
    };
    dev.towerTier = (spotIndex: number) => this.#towerBySpot.get(spotIndex)?.tierIndex ?? -1;
    dev.flyerHintOn = () => this.#mapRenderer?.flyerHintActive ?? false;
    dev.enemyKinds = () =>
      (this.#enemyPool?.activeItems() ?? []).map((e) => e.def?.id ?? '?');
    dev.enemySpeedFactors = () =>
      (this.#enemyPool?.activeItems() ?? []).map((e) => e.speedFactor);
    dev.hoverSpot = (spotIndex: number) => {
      this.#hoveredSpot = spotIndex;
      this.#mapRenderer?.drawHover(this.#hoveredSpot);
    };

    // --- M5 ---
    dev.placeBarracks = (spotIndex: number) => this.#placeBarracks(spotIndex);
    dev.upgradeBarracks = (spotIndex: number, tier: number) =>
      this.#upgradeBarracks(spotIndex, tier as 0 | 1 | 2 | 3);
    dev.sellBarracks = (spotIndex: number) => this.#sellBarracks(spotIndex);
    dev.setRally = (spotIndex: number, x: number, y: number) => {
      this.#setRally(spotIndex, { x, y });
      return this.#barracksBySpot.get(spotIndex)?.rally ?? { x: -1, y: -1 };
    };
    dev.rallyOf = (spotIndex: number) =>
      this.#barracksBySpot.get(spotIndex)?.rally ?? { x: -1, y: -1 };
    dev.soldiers = () => {
      const hepsi: Soldier[] = [...this.#gecici];
      for (const [, k] of this.#barracksBySpot) hepsi.push(...k.soldiers);
      return hepsi.map((s) => ({
        spotIndex: s.spotIndex,
        state: s.state,
        hp: s.hp,
        engaged: s.engagedWith !== null,
        x: s.x,
        y: s.y,
      }));
    };
    dev.soldierActive = () => this.#soldierPool?.activeCount ?? -1;
    dev.soldierCapacity = () => this.#soldierPool?.capacity ?? -1;
    dev.blockedEnemies = () =>
      (this.#enemyPool?.activeItems() ?? []).filter((e) => e.blockedBy !== null).length;
    dev.abilityReady = (id: string) => this.abilities.ready(id as AbilityId);
    dev.abilityProgress = (id: string) => this.abilities.progress(id as AbilityId);
    dev.castMeteor = (x: number, y: number) => {
      this.#pendingAbility = 'meteor';
      const oncesi = this.abilities.cooldownLeft('meteor');
      const dusmanlar = this.#enemyPool?.activeItems() ?? [];
      const r = this.abilities.castMeteor({ x, y }, dusmanlar);
      this.#pendingAbility = null;
      if (r !== null) for (const e of dusmanlar) if (e.alive && e.hp <= 0) this.#hasarUygula(e, 0);
      void oncesi;
      return r;
    };
    // --- M6 ---
    dev.shakeOffset = () => this.shake.offset;
    dev.shakeActive = () => this.shake.active;
    dev.triggerShake = (dx: number, dy: number, g: number) => { this.shake.trigger(dx, dy, g); };
    dev.hitStopActive = () => this.hitStop.active;
    dev.triggerHitStop = (ms: number) => { this.hitStop.trigger(ms, this.clock.scale); return this.hitStop.remainingMs; };
    dev.particleCount = () => this.#efektler?.aliveCount ?? -1;
    dev.settings = () => ({ ...this.settings.state, scale: this.settings.effectScale });
    dev.setSetting = (k: string, v: unknown) => {
      if (k === "effects") this.settings.set("effects", v as "off" | "low" | "full");
      else this.settings.set(k as "sound" | "screenShake", v as boolean);
      this.shake.enabled = this.settings.state.screenShake;
      if (!this.shake.enabled) this.shake.reset();
      return { ...this.settings.state };
    };
    dev.castReinforcements = (x: number, y: number) => {
      const r = this.abilities.castReinforcements({ x, y }, () => {
        const s = this.#soldierPool?.acquire() ?? null;
        if (s !== null) {
          s.spotIndex = -1;
          s.activate();
          this.#gecici.push(s);
        }
        return s;
      });
      return r?.length ?? -1;
    };
  }
}

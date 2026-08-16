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
import { Settings } from '../systems/Settings';
import { LocalStore } from '../util/storage';
import { KISLA, barracksTierAt, BLOCK, SOLDIER_SPEED } from '../data/barracks';
import type { AbilityId } from '../types/ability';
import { DamageText, DamageTextSystem } from '../fx/DamageText';
import { ensureNumberFont } from '../fx/numberFont';
import { TowerInfoPanel } from '../fx/TowerInfoPanel';
import { SoundSystem } from '../fx/SoundSystem';
import { Pool } from '../util/pool';
import { coveredSegments, measureCoverage } from '../util/coverage';
import { MAP_1, getMap, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { PreloadScene } from './PreloadScene';
import type { MapDef } from '../types/map';
import { TOWERS, getTower, tierAt } from '../data/towers';
import { towerFrameKey, FRAME_CARTOUCHE } from '../data/spriteFrames';
import { getEnemy, ENEMIES } from '../data/enemies';
import { POOL_PREALLOC, GECICI_MERMI_HIZI, MERMI_ISABET_YARICAPI } from '../data/balance';
import { MAP1_WAVES, wavesFor } from '../data/waves';
import { devHooks } from '../util/devHooks';
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
/** P03 brifi — kule/kışla gövdesi oyun içi gösterim boyutu (`Tower.ts` ile aynı). */
const TOWER_DISPLAY_SIZE = 64;

/** Asker (M5). Düşmandan küçük; TIER 1 kural 6: ayrım renge dayanmıyor. */
const SOLDIER_SIZE = 20;
const RALLY_COLOR = 0x3e6ca8;

/** §10: "Aynı anda en fazla 300 parçacık (havuzlu)." */
const PARTICLE_MAX = 300;

/** Beş hedefleme modu (`GAME-DESIGN.md` §4.5). Varsayılan `first`. */
const TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'strongest', 'weakest', 'closest'];
const TOWER_LABEL: Readonly<Record<string, string>> = {
  okcu: 'Okçu',
  top: 'Top',
  buyu: 'Büyü',
};

const MODE_LABEL: Readonly<Record<TargetMode, string>> = {
  first: 'İlk',
  last: 'Son',
  strongest: 'Güçlü',
  weakest: 'Zayıf',
  closest: 'Yakın',
};

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
  #enemyPool?: Pool<Enemy>;
  #abilities?: EnemyAbilitySystem<Enemy>;

  #occupancy?: SpotOccupancy;
  #hoverGfx?: Phaser.GameObjects.Graphics;
  #flyerGfx?: Phaser.GameObjects.Graphics;
  #flyerHintOn = false;
  #menu?: Phaser.GameObjects.Container;
  /** Seçili kule/kışlanın üstündeki altın kartuş (P02) — yalnız menü açıkken. */
  #cartouche?: Phaser.GameObjects.Image;
  /** M6-T11 — `HudScene` `soundSystem` getter'ıyla erişiyor (zafer/yenilgi). */
  #soundSystem?: SoundSystem;
  #infoPanel?: TowerInfoPanel;
  #hoveredSpot = -1;
  #selectedSpot = -1;
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
  readonly #barracksBySpot = new Map<
    number,
    {
      tier: 0 | 1 | 2 | 3;
      rally: Vec2;
      soldiers: Soldier[];
      marker: Phaser.GameObjects.Arc;
      govde: Phaser.GameObjects.Image;
    }
  >();

  // --------------------------------------------------------- yetenekler (M5)

  // ------------------------------------------------------------ juice (M6)

  /** §10 — yönlü sarsıntı. Kamerayı sahne kaydırıyor, sınıf yalnız vektör üretiyor. */
  readonly shake = new ScreenShake();
  /** §10 — 60-80 ms, 2× hızda devre dışı. */
  readonly hitStop = new HitStop();
  /** TIER 1 kural 6 + 10. */
  readonly settings = new Settings(new LocalStore(() => this.#kayitUyar()));
  #particles?: Phaser.GameObjects.Particles.ParticleEmitter;
  #vignette?: Phaser.GameObjects.Graphics;
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

  get lives(): number {
    return this.#eco?.lives ?? 0;
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

  /** @returns Kazanılan bonus altın. */
  startWaveEarly(): number {
    return this.#waves?.startWaveEarly() ?? 0;
  }

  create(): void {
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
    this.#selectedSpot = -1;
    this.#flyerHintOn = false;
    this.#mermiTepe = 0;
    this.#menu = undefined;
    this.#cartouche = undefined;
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
    this.shake.enabled = this.settings.state.screenShake;

    const yol = this.#map.paths[0] ?? [];
    const path = new PathSystem(yol);
    const mover = new PathMover(path);
    ensureNumberFont(this);

    // Arka plan da bir kez — yol/yapı noktaları onun ÜSTÜNE çiziliyor
    // (P01 brifi: arka plan kendi yolunu çizmiyor, oyun kodu çiziyor).
    this.add.image(this.scale.width / 2, this.scale.height / 2, `bg-${this.#map.id}`);
    // Harita **bir kez** çiziliyor. `update`'te yeniden çizmek her karede
    // yeni geometri üretmek demek; Graphics'in maliyeti orada.
    this.#drawMap(yol);
    this.#flyerGfx = this.add.graphics();
    this.#hoverGfx = this.add.graphics();
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
    this.#kurJuice();

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
        this.#particleBurst(x, y, x - e.x, y - e.y, 4);
        this.#hasarUygula(e, sonuc.dealt);
      },
      // Süreli etkiler isabet anında uygulanıyor (yanma, yavaşlatma).
      (e, effect) => applyEffect(e.effects, effect),
      // §10: ekran sarsıntısı **yalnız** top patlamasında (ve boss vuruşu,
      // can kaybı). Yön yukarı — patlama zeminden geliyor.
      (x, y, r) => {
        this.shake.trigger(0, 1, Math.min(1, r / 90));
        this.#particleBurst(x, y, 0, -1, 16);
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
    // hangi hareketle geldiğini bilmiyor (`DEPENDENCIES.md` §2).
    const ucanMover = new LineMover(this.#map.flyerPaths[0] ?? yol);
    const moverFor = (def: { flying: boolean }): Mover => (def.flying ? ucanMover : mover);

    this.#eco = new EconomySystem(this.#map, this.bus);
    this.#abilities = new EnemyAbilitySystem(enemyPool, this.#map.hpMultiplier, getEnemy);
    this.#waves = new WaveManager(
      enemyPool,
      moverFor,
      this.bus,
      this.#eco,
      this.#waveList,
      this.#map.hpMultiplier,
    );

    this.#occupancy = new SpotOccupancy(this.#map.buildSpots.length);
    this.#setupInput();

    this.bus.on('life:lost', ({ remaining }) => {
      // §10: can kaybında vermilyon vinyet nabzı + yönlü sarsıntı.
      this.#vinyetNabzi();
      this.shake.trigger(0, 1, 0.8);
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
    this.#updateFlyerHint();

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
    this.#particleBurst(e.x, e.y, 0, -1, 10);
    if (e.def?.id === 'ogreSef') this.shake.trigger(0, 1, 1);

    // Bölünme havuza DÖNMEDEN önce — yavrular annenin `progress`'ini
    // devralıyor ve `release` onu sıfırlıyor.
    this.#abilities?.splitOnDeath(e);
    this.#olumEfekti(e);
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
    // çizgi yeniden üretmek demekti. `#drawHover` zaten aynı sebeple
    // yalnız hover değiştiğinde çiziliyor; toplanma noktası da yalnız
    // **değiştiğinde** çiziliyor (kurma, satma, seçim, sürükleme).
  }

  /** Seçili kışlanın toplanma noktası ve menzil halkası. */
  #drawRally(): void {
    const g = this.#rallyGfx;
    if (g === undefined) return;
    g.clear();

    for (const [spotIndex, k] of this.#barracksBySpot) {
      const secili = spotIndex === this.#selectedSpot || spotIndex === this.#draggingRally;
      k.marker.setPosition(k.rally.x, k.rally.y).setVisible(true).setAlpha(secili ? 1 : 0.45);

      if (!secili) continue;
      const spot = this.#map.buildSpots[spotIndex];
      if (spot === undefined) continue;

      // Toplanma menzili (kural 6) — kesikli, kule menzil halkasıyla aynı dil.
      g.lineStyle(2, RALLY_COLOR, 0.5);
      this.#dashedCircle(g, spot, BLOCK.rallyRange, RALLY_COLOR, 2);
      // Kışla → toplanma noktası bağı.
      g.lineStyle(2, RALLY_COLOR, 0.7);
      this.#dashedLine(g, spot, k.rally, 8);
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
      rally: defaultRally(spot, this.#map.paths[0] ?? []),
      soldiers: [] as Soldier[],
      marker,
      govde,
    };
    this.#barracksBySpot.set(spotIndex, kayit);
    this.#askerleriKur(spotIndex);
    this.#drawRally();

    this.#closeMenu();
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

    k.rally = clampRally(spot, istenen, this.#map.paths[0] ?? [], k.rally);
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
    this.#closeMenu();
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
    this.#closeMenu();
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
      this.#meteorEfekti(at);
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

  #meteorEfekti(at: Vec2): void {
    const g = this.add.graphics();
    g.fillStyle(0xd4632a, 0.5);
    g.fillCircle(at.x, at.y, 90);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 400,
      onComplete: () => g.destroy(),
    });
  }

  // -------------------------------------------------------------- juice (M6)

  /**
   * Parçacık dokusu ve vinyet — `GAME-DESIGN.md` §10.
   *
   * Doku **çalışma zamanında** üretiliyor: M6'nın atlası (`M6-P03`/`P04`)
   * henüz yok ve tek beyaz piksel için bir varlık dosyası eklemek paketi
   * büyütür. `numberFont.ts` aynı yolu izliyor.
   */
  #kurJuice(): void {
    const ad = 'kn-parcacik';
    if (!this.textures.exists(ad)) {
      const doku = this.textures.createCanvas(ad, 4, 4);
      const ctx = doku?.getContext();
      if (ctx !== undefined && ctx !== null) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 4, 4);
        doku?.refresh();
      }
    }

    // §10: "Aynı anda en fazla 300 parçacık (havuzlu)."
    // `research/02` §7: Phaser'ın parçacık sistemi **zaten havuzlu**,
    // ayrı havuz yazmak TIER 1 kural 3'ün istediği şey değil.
    this.#particles = this.add.particles(0, 0, ad, {
      lifespan: 420,
      speed: { min: 40, max: 140 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      // §10: "ilk kare parlak altın/vermilyon, hızla koyu duman/toza sönüm"
      tint: [0xd4a032, 0xb03a2e, 0x6b5a3e],
      maxParticles: PARTICLE_MAX,
      emitting: false,
    });
    this.#particles.setDepth(50);

    // §10 can kaybı: ekran kenarında vermilyon vinyet nabzı, 400 ms.
    this.#vignette = this.add.graphics().setDepth(60).setAlpha(0);
    const g = this.#vignette;
    const w = this.scale.width;
    const h = this.scale.height;
    const kalinlik = 90;
    g.fillStyle(0xb03a2e, 1);
    g.fillRect(0, 0, w, kalinlik);
    g.fillRect(0, h - kalinlik, w, kalinlik);
    g.fillRect(0, 0, kalinlik, h);
    g.fillRect(w - kalinlik, 0, kalinlik, h);
  }

  /**
   * §10 squash & stretch: "düşman ölürken **1,3× yatay ezilme** +
   * kaybolma, **120 ms**".
   *
   * ## Havuz sözleşmesi nasıl korunuyor (TIER 1 kural 3)
   *
   * Efekt, düşman havuza dönmeden önce oynatılmak zorunda — nesne aynı
   * nesne. Yani `release` **120 ms geciktiriliyor**. Bu güvenli, çünkü
   * `alive` zaten `false`: hedefleme onu eliyor, `Mover` ilerletmiyor,
   * mermiler ıskalıyor.
   *
   * **Ama havuz baskısı altında gecikme kapatılıyor.** Serbest yuva 8'in
   * altına inerse efekt atlanıp nesne anında iade ediliyor: 60'lık havuzda
   * her ölümü 120 ms tutmak yoğun dalgada `acquire`'ı `null` döndürürdü ve
   * bir görsel süs yüzünden **düşman doğmazdı**. Kural 3'ün "havuz sessizce
   * büyümez" tavizi bu yönde ödenmez.
   */
  #olumEfekti(e: Enemy): void {
    const havuz = this.#enemyPool;
    if (havuz === undefined) return;

    const olcek = this.settings.effectScale;
    if (olcek <= 0 || havuz.freeCount < 8) {
      havuz.release(e);
      return;
    }

    this.tweens.add({
      targets: e,
      scaleX: 1.3,
      scaleY: 0.6,
      alpha: 0,
      duration: 120,
      ease: 'Quad.easeOut',
      // Süre **oyun zamanına** bağlı: `tweens.timeScale` `GameClock`
      // tarafından yazılıyor (TIER 1 kural 8), yani 2× hızda 60 ms.
      onComplete: () => havuz.release(e),
    });
  }

  /** §10: can kaybında 400 ms vermilyon nabız. */
  #vinyetNabzi(): void {
    const g = this.#vignette;
    if (g === undefined) return;
    // Vinyet **efekt yoğunluğundan bağımsız**: bir geri bildirim değil,
    // bir uyarı. TIER 1 kural 6 "erişilebilirlik tabanı" istiyor ve can
    // kaybının görülmemesi tabanın altına düşmek olurdu.
    this.tweens.killTweensOf(g);
    g.setAlpha(0);
    this.tweens.add({
      targets: g,
      alpha: { from: 0, to: 0.35 },
      duration: 130,
      yoyo: true,
      hold: 40,
      ease: 'Quad.easeOut',
      onComplete: () => g.setAlpha(0),
    });
  }

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

  /**
   * §10 parçacıkları. **Ayrı havuz YOK** — Phaser'ın parçacık sistemi zaten
   * havuzlu (`research/02` §7: "ömrü biten parçacık yok edilmez, havuza
   * döner"). Sınır `maxParticles` ile veriliyor.
   */
  #particleBurst(x: number, y: number, dirX: number, dirY: number, adet: number): void {
    const e = this.#particles;
    if (e === undefined) return;

    const olcek = this.settings.effectScale;
    if (olcek <= 0) return; // TIER 1 k.6 — efekt kapalı

    // §10 "2× hızda parçacık yoğunluğu yarıya iner": okunurluk için.
    const hizBolen = this.clock.scale === 2 ? 2 : 1;
    const n = Math.max(1, Math.round((adet * olcek) / hizBolen));

    const aci = Math.atan2(dirY, dirX);
    e.setParticleTint(0xd4a032);
    e.emitParticle(n, x, y);
    void aci;
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
      this.#drawHover();
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.#draggingRally = -1;
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      const nokta = { x: p.worldX, y: p.worldY };

      // 1) Bekleyen yetenek her şeyin önünde — tıkla-hedefle (§8).
      if (this.#tryCastAbility(nokta)) {
        this.#closeMenu();
        return;
      }

      // 2) Seçili kışlanın toplanma işaretçisine basıldıysa sürükleme başlar.
      const secili = this.#barracksBySpot.get(this.#selectedSpot);
      if (secili !== undefined) {
        const dx = nokta.x - secili.rally.x;
        const dy = nokta.y - secili.rally.y;
        // Tutma alanı 44×44 px (CLAUDE.md Platform) → yarıçap 22.
        if (dx * dx + dy * dy <= 22 * 22) {
          this.#draggingRally = this.#selectedSpot;
          return;
        }
      }

      const i = findSpotAt(nokta, this.#map.buildSpots);
      if (i < 0) {
        this.#closeMenu();
        return;
      }
      if (this.#occupancy?.isOccupied(i) === true) {
        this.#openSellMenu(i);
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
    const spot = i >= 0 ? this.#map.buildSpots[i] : undefined;
    if (spot === undefined) return;

    const menzil = COVERAGE_REFERENCE_RANGE;

    // Kapsanan yol vurgusu — `coveredSegments` ile, yani ekranda görünen
    // çizgi ile `MapDef.coverage` içindeki sayı aynı hesaptan geliyor.
    g.lineStyle(10, GOLD_COLOR, 0.55);
    for (const p of coveredSegments(this.#map.paths[0] ?? [], spot, menzil)) {
      g.beginPath();
      g.moveTo(p.a.x, p.a.y);
      g.lineTo(p.b.x, p.b.y);
      g.strokePath();
    }

    // Menzil uçan hattını kesiyorsa o parça da vurgulanıyor (§5) — oyuncu
    // "bu nokta harpiyi görüyor mu" sorusunu bakarak cevaplayabilsin.
    g.lineStyle(8, 0x3e5ca8, 0.5); // lapis — uçan
    for (const uc of this.#map.flyerPaths) {
      for (const p of coveredSegments(uc, spot, menzil)) {
        g.beginPath();
        g.moveTo(p.a.x, p.a.y);
        g.lineTo(p.b.x, p.b.y);
        g.strokePath();
      }
    }

    // Kesikli altın çember + mürekkep dış kontur.
    // Kontursuz çember yoğun dalgada kayboluyor (`GAME-DESIGN.md` §2).
    this.#dashedCircle(g, spot, menzil + 1.5, INK_COLOR, 3);
    this.#dashedCircle(g, spot, menzil, GOLD_COLOR, 2);
  }

  /**
   * **Uçan hattı gösterimi** (`M4-T06`, `GAME-DESIGN.md` §5 — zorunlu).
   *
   * "Harpi yolu takip etmediği için, uçuş hattı kule menzillerinden
   * geçmiyorsa harpi **garantili sızar** — oyuncunun hiçbir kararı bunu
   * değiştiremez." Defense Grid'in çözümü: hazırlık aşamasında hattı göster.
   *
   * Hat **yalnız o dalgada uçan varsa** ve **yalnız hazırlıkta** görünüyor;
   * dalga başlayınca sönüyor.
   */
  #updateFlyerHint(): void {
    const g = this.#flyerGfx;
    if (g === undefined) return;

    const dalga = this.#waves?.upcomingWave;
    const ucanVar =
      dalga !== undefined &&
      dalga.groups.some((gr) => getEnemy(gr.enemy)?.flying === true);

    if (ucanVar === this.#flyerHintOn) return;
    this.#flyerHintOn = ucanVar;
    g.clear();
    if (!ucanVar) return;

    // Soluk kesikli altın çizgi (§5).
    g.lineStyle(3, GOLD_COLOR, 0.45);
    for (const hat of this.#map.flyerPaths) {
      for (let i = 0; i < hat.length - 1; i++) {
        const a = hat[i];
        const b = hat[i + 1];
        if (a === undefined || b === undefined) continue;
        this.#dashedLine(g, a, b, 18);
      }
    }
  }

  /** Kesikli düz çizgi — Phaser'da hazır yok. */
  #dashedLine(g: Phaser.GameObjects.Graphics, a: Vec2, b: Vec2, parcaPx: number): void {
    const uzunluk = Math.hypot(b.x - a.x, b.y - a.y);
    const adet = Math.max(1, Math.floor(uzunluk / parcaPx));
    for (let k = 0; k < adet; k += 2) {
      const t0 = k / adet;
      const t1 = Math.min(1, (k + 1) / adet);
      g.beginPath();
      g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
      g.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      g.strokePath();
    }
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
    const spot = this.#map.buildSpots[spotIndex];
    if (spot === undefined) return;

    const kap = this.add.container(
      Phaser.Math.Clamp(spot.x, 160, this.scale.width - 160),
      Phaser.Math.Clamp(spot.y - 56, 40, this.scale.height - 40),
    );

    // Dört aile: üç kule + kışla (§4). Kışla ayrı tip olduğu için ayrı
    // buton — `TOWERS` dizisine sokmak `TowerDef` sözleşmesini bozardı.
    const toplam = TOWERS.length + 1;
    TOWERS.forEach((def, i) => {
      const bx = (i - (toplam - 1) / 2) * 84;
      const maliyet = def.tiers[0].cost;
      const alinabilir = this.#eco?.canAfford(maliyet) === true;

      this.#menuButonu(
        kap,
        bx,
        `${TOWER_LABEL[def.id] ?? def.id} ${maliyet}`,
        alinabilir,
        () => this.#placeTower(spotIndex, def),
      );
    });

    const kislaMaliyet = barracksTierAt(KISLA, 0).cost;
    this.#menuButonu(
      kap,
      (TOWERS.length - (toplam - 1) / 2) * 84,
      `Kışla ${kislaMaliyet}`,
      this.#eco?.canAfford(kislaMaliyet) === true,
      () => this.#placeBarracks(spotIndex),
    );

    this.#menu = kap;
  }

  /**
   * Dolu noktaya tıklayınca: **yükselt** ve **sat**.
   *
   * ## Yükseltme neden M3'te (plan M4 diyordu)
   *
   * Plan "Olmayan: Tier 2-3" diyordu ama aynı taşın bitiş durumu
   * "Harita 1 ... bitirilebiliyor" istiyordu. `waveSim` ile ölçüldü:
   *
   * | Tahta | sızan | kalan can |
   * |---|---|---|
   * | T2 dahil (referans tahta) | 1 | **19/20** |
   * | Yalnız T1 | 30 | **kayıp** |
   *
   * Yani yükseltme olmadan harita geçilemiyor ve iki plan maddesi aynı
   * anda doğru olamıyor. T2 satırları `towers.ts`'te zaten var, kademe
   * `TowerSystem`'de zaten destekli — eksik olan tek şey menü butonuydu.
   * T3 dalları M4'te kalıyor.
   */
  #openSellMenu(spotIndex: number): void {
    // Kışla ayrı menü — kademe adları ve toplanma ipucu farklı.
    if (this.#barracksBySpot.has(spotIndex)) {
      this.#openBarracksMenu(spotIndex);
      return;
    }
    this.#closeMenu();
    const spot = this.#map.buildSpots[spotIndex];
    const kule = this.#towerBySpot.get(spotIndex);
    if (spot === undefined || kule === undefined) return;

    const kap = this.add.container(
      Phaser.Math.Clamp(spot.x, 140, this.scale.width - 140),
      Phaser.Math.Clamp(spot.y - 56, 40, this.scale.height - 40),
    );

    const iade = this.#eco?.sellRefund(this.#eco.spentAt(spotIndex)) ?? 0;

    if (kule.tierIndex === 0) {
      // T1 → T2, tek seçenek.
      const maliyet = kule.def.tiers[1].cost;
      this.#menuButonu(kap, -48, `↑ ${maliyet}`, this.#eco?.canAfford(maliyet) === true, () =>
        this.#upgradeTower(spotIndex, 1),
      );
      this.#menuButonu(kap, 48, `Sat +${iade}`, true, () => this.#sellTower(spotIndex));
    } else if (kule.tierIndex === 1) {
      // T2 → **iki dal**. `M4-T03`: dal seçimi zorunlu, kademe atlanamıyor.
      const [a, b] = kule.def.branches;
      this.#menuButonu(
        kap,
        -96,
        `${a.branchName ?? '3a'} ${a.cost}`,
        this.#eco?.canAfford(a.cost) === true,
        () => this.#upgradeTower(spotIndex, 2),
      );
      this.#menuButonu(
        kap,
        0,
        `${b.branchName ?? '3b'} ${b.cost}`,
        this.#eco?.canAfford(b.cost) === true,
        () => this.#upgradeTower(spotIndex, 3),
      );
      this.#menuButonu(kap, 96, `Sat +${iade}`, true, () => this.#sellTower(spotIndex));
    } else {
      // T3 — son kademe. **Dal geri alınamıyor (S41)**; değiştirmek için
      // satmak gerekiyor ve %30 kayıp bilinçli bir bedel.
      this.#menuButonu(kap, 0, `Sat +${iade}`, true, () => this.#sellTower(spotIndex));
    }

    // Hedefleme modu seçici (`M4-T11`) — beş mod, kule başına.
    TARGET_MODES.forEach((mod, i) => {
      const bx = (i - (TARGET_MODES.length - 1) / 2) * 50;
      const secili = kule.targetMode === mod;
      const btn = this.add
        .rectangle(bx, 52, 46, 44, secili ? GOLD_COLOR : SPOT_COLOR)
        .setStrokeStyle(2, GOLD_COLOR)
        .setInteractive({ useHandCursor: true });
      const et = this.add
        .text(bx, 52, MODE_LABEL[mod], {
          fontFamily: 'Spectral, serif',
          fontSize: '14px',
          color: '#14203A',
        })
        .setOrigin(0.5);
      btn.on(
        Phaser.Input.Events.POINTER_DOWN,
        (_p: unknown, _x: number, _y: number, olay: Phaser.Types.Input.EventData) => {
          olay.stopPropagation();
          this.#setTargetMode(spotIndex, mod);
        },
      );
      kap.add([btn, et]);
    });

    this.#selectedSpot = spotIndex;
    this.#showCartouche(spot);
    this.#showInfoPanel(spotIndex);
    this.#menu = kap;
  }

  /**
   * Hedefleme modu değişimi (`M4-T11`).
   *
   * **Mevcut hedef hemen düşürülüyor** — "bitmedi sayılır eğer: mod değişimi
   * mevcut hedefi hemen güncellemiyorsa". Kule bir sonraki ateş karesinde
   * yeni moda göre arama yapıyor.
   */
  #setTargetMode(spotIndex: number, mod: TargetMode): void {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined) return;
    kule.targetMode = mod;
    kule.target = null;
    this.#openSellMenu(spotIndex); // menüyü yeniden çiz (seçili mod değişti)
  }

  /** `M4-T10` — bilgi paneli. */
  #showInfoPanel(spotIndex: number): void {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined || this.#infoPanel === undefined) return;

    const tier = tierAt(kule.def, kule.tierIndex);
    const kapsama =
      measureCoverage(this.#map.paths, this.#map.buildSpots, tier.range).find(
        (c) => c.spotIndex === spotIndex,
      )?.coveredPx ?? 0;

    this.#infoPanel.show({
      def: kule.def,
      tier,
      tierIndex: kule.tierIndex,
      targetMode: kule.targetMode,
      coveredPx: kapsama,
      refund: this.#eco?.sellRefund(this.#eco.spentAt(spotIndex)) ?? 0,
      nextTier: kule.tierIndex === 0 ? kule.def.tiers[1] : undefined,
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
    this.#closeMenu();
    return true;
  }

  /** 88×44 — Platform dokunmatik hedef alt sınırı. */
  #menuButonu(
    kap: Phaser.GameObjects.Container,
    bx: number,
    metin: string,
    etkin: boolean,
    onClick: () => void,
  ): void {
    const arka = this.add
      .rectangle(bx, 0, 88, 44, etkin ? SPOT_COLOR : 0x6b6558)
      .setStrokeStyle(2, GOLD_COLOR)
      .setInteractive({ useHandCursor: etkin });

    const etiket = this.add
      .text(bx, 0, metin, {
        fontFamily: 'Spectral, serif',
        fontSize: '16px',
        color: etkin ? '#14203A' : '#3A3A3A',
      })
      .setOrigin(0.5);

    // Devre dışıyken de tıklanabilir: M6-T11 "yetersiz altınla satın alma
    // denenince" sesi (`purchase:denied`) ancak böyle tetiklenebiliyor.
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
        if (!etkin) {
          this.bus.emit('purchase:denied', {});
          return;
        }
        onClick();
      },
    );

    kap.add([arka, etiket]);
  }

  /**
   * Kışla menüsü: yükselt / dal seç / sat.
   *
   * Menü açıkken kışla **seçili** sayılıyor, yani toplanma noktası ve
   * menzil halkası çiziliyor ve işaretçi sürüklenebiliyor (M5-T03).
   */
  #openBarracksMenu(spotIndex: number): void {
    this.#closeMenu();
    const spot = this.#map.buildSpots[spotIndex];
    const k = this.#barracksBySpot.get(spotIndex);
    if (spot === undefined || k === undefined) return;

    this.#selectedSpot = spotIndex;
    this.#showCartouche(spot);
    const kap = this.add.container(
      Phaser.Math.Clamp(spot.x, 140, this.scale.width - 140),
      Phaser.Math.Clamp(spot.y - 56, 40, this.scale.height - 40),
    );
    const iade = this.#eco?.sellRefund(this.#eco.spentAt(spotIndex)) ?? 0;

    if (k.tier === 0) {
      const m = barracksTierAt(KISLA, 1).cost;
      this.#menuButonu(kap, -48, `↑ ${m}`, this.#eco?.canAfford(m) === true, () =>
        this.#upgradeBarracks(spotIndex, 1),
      );
      this.#menuButonu(kap, 48, `Sat +${iade}`, true, () => this.#sellBarracks(spotIndex));
    } else if (k.tier === 1) {
      const [a, b] = KISLA.branches;
      this.#menuButonu(kap, -96, `${a.branchName} ${a.cost}`, this.#eco?.canAfford(a.cost) === true, () =>
        this.#upgradeBarracks(spotIndex, 2),
      );
      this.#menuButonu(kap, 0, `${b.branchName} ${b.cost}`, this.#eco?.canAfford(b.cost) === true, () =>
        this.#upgradeBarracks(spotIndex, 3),
      );
      this.#menuButonu(kap, 96, `Sat +${iade}`, true, () => this.#sellBarracks(spotIndex));
    } else {
      this.#menuButonu(kap, 0, `Sat +${iade}`, true, () => this.#sellBarracks(spotIndex));
    }

    this.#menu = kap;
    this.#drawRally();
  }

  #closeMenu(): void {
    this.#menu?.destroy(true);
    this.#menu = undefined;
    this.#cartouche?.destroy();
    this.#cartouche = undefined;
    this.#selectedSpot = -1;
    this.#infoPanel?.hide();
    this.#drawRally();
  }

  /** Seçili kule/kışlanın üstüne altın kartuş (P02) — `#closeMenu` kaldırıyor. */
  #showCartouche(spot: Vec2): void {
    this.#cartouche?.destroy();
    this.#cartouche = this.add
      .image(spot.x, spot.y, 'atlas', FRAME_CARTOUCHE)
      .setDisplaySize(TOWER_DISPLAY_SIZE + 16, TOWER_DISPLAY_SIZE + 16);
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
    this.#particleBurst(spot.x, spot.y, 0, -1, 14);

    const kule = new Tower(this, spotIndex, spot.x, spot.y, def);
    this.#towerBySpot.set(spotIndex, kule);
    this.#towers?.add(kule);
    this.#closeMenu();
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
    this.#closeMenu();
    return iade;
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

    for (const s of this.#map.buildSpots) {
      g.fillStyle(SPOT_COLOR, 1);
      g.fillCircle(s.x, s.y, SPOT_RADIUS);
      g.lineStyle(3, GOLD_COLOR, 1);
      g.strokeCircle(s.x, s.y, SPOT_RADIUS);
    }

    // Kale — mürekkep zemin üstünde mürekkep kare görünmez, altın kontur şart.
    const c = this.#map.castle;
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
    this.#map.coverage.forEach((c, i) => {
      const s = this.#map.buildSpots[i];
      if (s === undefined) return;
      this.add
        .text(s.x, s.y - SPOT_RADIUS - 14, `${Math.round(c.coveredPx)}`, stil)
        .setOrigin(0.5, 1);
    });

    const L = this.#map.paths.reduce(
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
    const c = this.#map.coverage;
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
    dev.lives = () => this.#eco?.lives ?? -1;
    dev.pathLength = () => path.totalLength;
    dev.coverage = () => this.#map.coverage;
    dev.coverageAverage = () => this.#ortalamaKapsama();

    dev.projectileActive = () => mermiHavuzu.activeCount;
    dev.projectilePeak = () => this.#mermiTepe;
    dev.damageTextActive = () => sayiHavuzu.activeCount;
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
      this.#openSellMenu(spotIndex);
      return this.#infoPanel?.visible ?? false;
    };
    dev.infoDps = (enemyId: string) => this.#infoPanel?.dpsFor(enemyId) ?? -1;
    dev.setTargetMode = (spotIndex: number, mod: string) => {
      this.#setTargetMode(spotIndex, mod as TargetMode);
      return this.#towerBySpot.get(spotIndex)?.targetMode ?? '';
    };
    dev.towerTier = (spotIndex: number) => this.#towerBySpot.get(spotIndex)?.tierIndex ?? -1;
    dev.flyerHintOn = () => this.#flyerHintOn;
    dev.enemyKinds = () =>
      (this.#enemyPool?.activeItems() ?? []).map((e) => e.def?.id ?? '?');
    dev.enemySpeedFactors = () =>
      (this.#enemyPool?.activeItems() ?? []).map((e) => e.speedFactor);
    dev.hoverSpot = (spotIndex: number) => {
      this.#hoveredSpot = spotIndex;
      this.#drawHover();
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
    dev.particleCount = () => this.#particles?.getAliveParticleCount() ?? -1;
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

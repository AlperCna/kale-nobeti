import Phaser from 'phaser';
import { GameClock } from '../systems/GameClock';
import { EventBus } from '../systems/EventBus';
import { PathSystem } from '../systems/PathSystem';
import { LineMover, PathMover } from '../systems/movers';
import { EnemyAbilitySystem } from '../systems/EnemyAbilitySystem';
import { applyEffect, speedMultiplier, stepEffects } from '../systems/effects';
import { gomuluMu } from '../systems/TargetingSystem';
import { kalkandanGecir } from '../systems/combat';
import { WaveManager } from '../systems/WaveManager';
import { endlessHpScale, generateEndlessWave } from '../systems/endlessWaves';
import { AchievementSystem } from '../systems/AchievementSystem';
import { AchievementToast } from '../fx/AchievementToast';
import { BossBanner } from '../fx/BossBanner';
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
  adimBasla,
  adimBitti,
  araDegerUygula,
  gercegeDon,
  type AraDegerli,
} from '../util/araDeger';
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
import { RunSave, RUN_VERSION } from '../systems/RunSave';
import type { RunData, SpotKaydi } from '../systems/RunSave';
import { gosterKayitUyarisi } from '../fx/SaveWarning';
import { KISLA, barracksTierAt, BLOCK, SOLDIER_SPEED } from '../data/barracks';
import type { AbilityId } from '../types/ability';
import { DamageText, DamageTextSystem } from '../fx/DamageText';
import { GoldCoin, GoldFlightSystem } from '../fx/GoldFlight';
import { EnemyHealthBar } from '../fx/EnemyHealthBar';
import { EnemyHealthBarSystem } from '../fx/EnemyHealthBarSystem';
import { Particles } from '../fx/Particles';
import { MapRenderer } from '../fx/MapRenderer';
import { EnemyStatus } from '../fx/EnemyStatus';
import { BuildMenu } from '../fx/BuildMenu';
import type { BarracksKayit } from '../fx/BuildMenu';
import { TowerInfoPanel } from '../fx/TowerInfoPanel';
import { SoundSystem } from '../fx/SoundSystem';
import { Pool } from '../util/pool';
import { averageCoverage, measureCoverage } from '../util/coverage';
import { MAP_1, getMap, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { PreloadScene } from './PreloadScene';
import type { MapDef } from '../types/map';
import { TOWERS, TARGET_MODES, getTower, maliyet, tierAt } from '../data/towers';
import { towerFrameKey } from '../data/spriteFrames';
import { projectileLook } from '../data/projectileVisuals';
import { getEnemy, getEnemyForMap, ENEMIES } from '../data/enemies';
import { BALANCE, POOL_PREALLOC, MERMI_HIZI, MERMI_ISABET_YARICAPI } from '../data/balance';
import { ABILITIES, yetenekYukseltmeFiyati } from '../data/abilities';
import { yetenekIpucuMetni } from '../util/yetenekOzeti';
import { MUSIC_BASE_VOLUME } from '../data/audio';
import { portal } from '../systems/Portal';
import { haritaBasladi } from '../systems/olcum';

import { MAP1_WAVES, wavesFor } from '../data/waves';
import { devHooks } from '../util/devHooks';
import { t } from '../util/i18n';
import { LocalStore } from '../util/storage';
import { TutorialSystem } from '../systems/TutorialSystem';
import { RunStats } from '../systems/RunStats';
import type { HintId } from '../systems/TutorialSystem';
import { TutorialHints } from '../fx/TutorialHints';
import type { StringKey } from '../data/strings';
import type { TargetMode, TierIndex, TowerDef } from '../types/tower';
import type { DamageType, EnemyDef, EnemyId, Mover } from '../types/enemy';
import type { Vec2 } from '../types/common';
import type { Wave } from '../types/wave';

/**
 * Namlu parıltısının kule merkezine uzaklığı — hedefe olan mesafenin
 * oranı olarak. Sabit piksel verilseydi yakın hedefte parçacık düşmanın
 * üstünde patlardı.
 */
const NAMLU_ORANI = 0.18;
const NAMLU_PARCACIK = 3;
/** Namlu parıltısı dar koni: "buradan çıktı" demeli, patlama gibi değil. */
const NAMLU_YAYILIM = 22;
/** Mermi izi parçacıkları arası süre (ms, ölçekli zaman). */
const IZ_ARALIK_MS = 70;
/** Yönsüz saçılım — ölüm, patlama ve iz için (yarı açı 180° = her yön). */
const TAM_DAIRE = 180;
/**
 * Yükseltme sütununun saçılma yarı açısı (derece) — `M24`.
 *
 * Dar koni = yönlü sıçrama (`Particles.patlat` notu). 22°, toz
 * halkasının 180°'siyle yan yana konunca "yayıldı" ile "yükseldi"
 * arasındaki farkı tek bakışta okutuyor.
 */
const YUKSELTME_KONISI = 22;

/**
 * İsabet parıltısı rengi — `M8-T08`. Fiziksel altın varak, büyü lapis;
 * §2 paletinin dışına çıkmıyor. Renk **bilgi taşımıyor** (hasar sayısı
 * zaten taşıyor), yalnız hangi kulenin vurduğunu okunur kılıyor —
 * TIER 1 kural 6 "yalnız renge dayanmaz" bu yüzden ihlal edilmiyor.
 */
const ISABET_RENGI: Readonly<Record<DamageType, number>> = {
  physical: 0xd4a032,
  magic: 0x3e5ca8,
  /** Saf hasar kule tarafından verilmiyor (yalnız yanma tiki); tamlık için. */
  true: 0xb03a2e,
};


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
 * `M10-T03` — buz kalkanı halkası. Açık lapis: §2'nin mürekkep mavisi
 * paletinden, ama düşman siluetinden ve yol renginden ayrışacak kadar
 * açık. Renk **tek başına** bilgi taşımıyor (bkz. `#kalkanlariCiz`).
 */
const KALKAN_RENGI = 0x9fd8ef;
/** Düşman gösterim boyutunun (30 px) biraz dışı. */
const KALKAN_YARICAP = 22;
/**
 * Gömülü düşmanın saydamlığı — `M12` Faz 1.
 *
 * Sıfır değil: tamamen görünmez bir düşman "oyun bozuk" gibi okunur ve
 * oyuncu nereye kule koyacağını öğrenemez. Silüet kalıyor, "kuleler bunu
 * göremiyor" bilgisi saydamlıktan çıkıyor.
 */
const GOMULU_ALFA = 0.35;

/**
 * `M10-T02` — tahtayı geri kurarken kullanılan **geçici** bakiye.
 *
 * Kuleler normal satın alma yolundan kuruluyor (gerekçe
 * `#turuGeriYukle`'de: satış iadesi `EconomySystem`'in harcama
 * defterine bakıyor), yani o an paranın yetmesi gerekiyor. Sekiz
 * yapı noktasının hepsi T3 olsa bile en pahalı tahta 8 × (70+110+170)
 * = 2800 altın; buradaki değer onun on katından fazla ve tur bittiğinde
 * bakiye zaten gerçek değerine geri çekiliyor.
 */
const GERI_YUKLEME_BAKIYESI = 99_999;

/**
 * Tur kaydına erişim — **alan değil, çağrı**.
 *
 * `RunSave` durumsuz (her çağrıda depoyu okuyor/yazıyor), ama sınıf
 * alanı olarak tutulunca bekçinin "sahne alanları `create()` içinde
 * sıfırlanıyor" kuralına takılıyor ve o kural dört gerçek hatayı
 * yakalamış durumda — zayıflatılmıyor. `LevelSelectScene` ve
 * `GameOverScene` `SaveSystem` için zaten aynı deseni kullanıyor.
 */
function turKaydi(): RunSave {
  return new RunSave(new LocalStore());
}

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

/** `Y09` — hangi ipucunun hangi metni gösterdiği, `strings.ts` üzerinden. */
const HINT_TEXT_KEY: Readonly<Record<HintId, StringKey>> = {
  build: 'hintBuild',
  earlyStart: 'hintEarlyStart',
  dragRally: 'hintDragRally',
  targetModes: 'hintTargetModes',
  flyers: 'hintFlyers',
  shield: 'hintShield',
  burrow: 'hintBurrow',
  heal: 'hintHeal',
  /**
   * `M102` — bu ipucunun metni **tek başına yetmiyor**: altına o anki
   * takasın sayıları ekleniyor (`util/yetenekOzeti.ts`). Harita yine
   * de eksiksiz, çünkü `Record<HintId, StringKey>` eksik anahtarda
   * derlenmiyor ve kural cümlesi buradan geliyor.
   */
  abilityUpgrade: 'hintAbilityUpgrade',
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
  #towers?: TowerSystem<Tower>;
  /** `M8-T08` — mermi izi zamanlayıcısı (ms, `scaledDelta` birikimi). */
  #izBirikim = 0;
  #mermiHavuzu?: Pool<Projectile>;
  #projectiles?: ProjectileSystem<Enemy, Projectile>;
  #damageTexts?: DamageTextSystem;
  #altinUcusu?: GoldFlightSystem;
  /** `G05` — hasar görmüş düşmanların can çubuğu (seçenek b). */
  #enemyHealthBars?: EnemyHealthBarSystem;
  #enemyPool?: Pool<Enemy>;
  #abilities?: EnemyAbilitySystem<Enemy>;
  /** `M30`/`M31` — Şaman çemberi, iyileşme/yanma/yavaşlatma işaretleri. */
  #durumKatmani?: EnemyStatus;

  #occupancy?: SpotOccupancy;
  /** `Y01` adım 2 — harita çizimi, hover, uçan ipucu. */
  #mapRenderer?: MapRenderer;
  /** `Y01` adım 3 — yapı/yükseltme/satış/kışla menüsü. */
  #buildMenu?: BuildMenu;
  /** M6-T11 — `HudScene` `soundSystem` getter'ıyla erişiyor (zafer/yenilgi). */
  #soundSystem?: SoundSystem;
  /** `M8-T03` — bu elin istatistikleri; `HudScene` oyun sonunda okuyor. */
  #runStats?: RunStats;
  #infoPanel?: TowerInfoPanel;
  #hoveredSpot = -1;
  #mermiTepe = 0;
  /** `M102` — yükseltme ipucu tur başına bir kez duyuruluyor. */
  #yukseltmeDuyuruldu = false;
  readonly #towerBySpot = new Map<number, Tower>();

  // ------------------------------------------------------------ kışla (M5)

  #soldierPool?: Pool<Soldier>;
  #rallyGfx?: Phaser.GameObjects.Graphics;
  /** `M10-T03` — kalkan halkaları. Tek `Graphics`, her karede yeniden çiziliyor. */
  #kalkanGfx?: Phaser.GameObjects.Graphics;
  /** `M106` — hasar tabanına düşen sayıların kalkan işareti. */
  #emildiGfx?: Phaser.GameObjects.Graphics;
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
  /** `Y09` — öğretici: hangi ipucu ne zaman (mantık) + parşömen balon (sunum). */
  #tutorial?: TutorialSystem;
  #tutorialHints?: TutorialHints;
  #kayitUyarildi = false;

  readonly abilities = new AbilitySystem();

  /** `init()` okuyor, `create()` uyguluyor, sonra `null`'a dönüyor. */
  #devamTuru: RunData | null = null;
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
  /** `M8-T06` — sonsuz mod bu koşuda açık mı (oyun sonu ekranından gelir). */
  #endless = false;
  #achievements?: AchievementSystem;
  #achievementToast?: AchievementToast;
  #bossBanner?: BossBanner;
  /** `M8-T09` — boss geçen karede sahadaydı mı (yok→var geçişi). */
  #bossSahada = false;

  constructor() {
    super('Game');
  }

  /**
   * Seviye seçim ekranı `{ mapId }` gönderiyor; yoksa harita 1.
   * `M8-T06`: oyun sonu ekranı `{ endless: true }` ile yeniden başlatıyor.
   */
  init(data?: { mapId?: string; endless?: boolean; devam?: boolean }): void {
    this.#map = (data?.mapId !== undefined ? getMap(data.mapId) : undefined) ?? MAP_1;
    this.#waveList = wavesFor(this.#map.id);
    this.#endless = data?.endless === true;
    // `M10-T02` — kayıtlı tur YALNIZ açıkça istendiğinde yükleniyor.
    // "Kayıt varsa otomatik yükle" demek, menüden yeni bir tur başlatan
    // oyuncuyu eski turuna düşürürdü.
    this.#devamTuru = null;
    if (data?.devam === true) {
      const kayit = turKaydi().oku();
      // Harita kimliği eşleşmiyorsa kayıt bu tura ait değil — yok say.
      if (kayit !== null && kayit.mapId === this.#map.id) this.#devamTuru = kayit;
    }
  }

  /** `HudScene` ve `GameOverScene` bunu okuyor. */
  get isEndlessRun(): boolean {
    return this.#endless;
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

  /** `M8-T03` — oyun sonu ekranı bunu okuyor. */
  get runStats(): RunStats | undefined {
    return this.#runStats;
  }

  /** `M8-T03` — duraklatma menüsünün "Yeniden başla"sı aynı haritayı istiyor. */
  get mapId(): string {
    return this.#map.id;
  }

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

  /** `M8-T06` — elle yazılmış dalgalar bitti, üretilene geçildi. */
  get isEndlessWave(): boolean {
    return this.#waves?.isEndless ?? false;
  }

  get prepRemainingSec(): number | null {
    return this.#waves?.phase === 'prep' ? (this.#waves.prepRemainingSec ?? 0) : null;
  }

  get upcomingWave(): Wave | undefined {
    return this.#waves?.upcomingWave;
  }

  /**
   * Bu **koşunun** başlangıç canı — `M26`.
   *
   * Zorluğa göre değişiyor (Zor 12, diğerleri 20) ve yıldız eşikleri
   * artık buna oranlı. HUD portal olayını gönderirken kayıtla aynı
   * sayıyı kullansın diye dışa açıldı.
   */
  get startLives(): number {
    return this.settings.difficulty.startLives;
  }

  get earlyStartAvailable(): boolean {
    return this.#waves?.earlyStartAvailable ?? false;
  }

  /**
   * Sahada **şu an** kaç düşman var — `M25`.
   *
   * Erken başlatmanın **risk** tarafı bu sayı. `M16`'dan beri dalga
   * kuyruk bitince kapanıyor, yani düğmeye basmak sıradaki dalgayı bu
   * düşmanların **üstüne** çağırmak demek. Ölçüm riskin gerçek
   * olduğunu söylüyor: hep basmak harita 5-6'yı 20 canla geçilemez
   * yapıyor (S102).
   */
  get enemiesOnField(): number {
    return this.#enemyPool?.activeCount ?? 0;
  }

  /**
   * Erken başlatma bonusunun **şu anki** değeri — `M25`.
   *
   * HUD bunu düğmenin üstünde gösteriyor. Sayı `EconomySystem`'den
   * geliyor, burada yeniden hesaplanmıyor: ödülü veren fonksiyonla
   * **aynı** kaynak (bkz. `earlyStartPreview`).
   */
  get earlyStartPreview(): number {
    const w = this.#waves;
    if (w === undefined || w.phase !== 'prep') return 0;
    return this.#eco?.earlyStartPreview(w.prepRemainingSec, w.waveNumber) ?? 0;
  }

  /** `Y09` — `HudScene`'in ayarlar paneli "İpuçları" değişince çağırıyor. */
  setHintsEnabled(enabled: boolean): void {
    this.#tutorial?.setEnabled(enabled);
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
    // `M10-T01` — `Overlay`'i normalde `Menu.create()` başlatıyor, ama
    // ilk oturumda menü **atlanıyor** ve o zaman tam ekran düğmesi ile
    // yatay çevirme perdesi hiç kurulmuyordu; kayıt uyarısı da
    // (`fx/SaveWarning.ts`) `Overlay`'e çiziliyor, yani sessizce
    // görünmez kalırdı. Çağrı fikirsiz (`isActive` koruması): normal
    // akışta `Overlay` zaten ayakta ve burası hiçbir şey yapmıyor.
    // Atlas bu noktada yüklü — `preload()` `queueGame` çağırıyor.
    if (!this.scene.isActive('Overlay')) this.scene.launch('Overlay');

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
    this.#yukseltmeDuyuruldu = false;
    this.#izBirikim = 0;
    this.#bossSahada = false;
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
    /**
     * **Arka plan KRİTİK DEĞİL ama korumasız da değil** — `M124`.
     *
     * `Y14`'ün kararı: atlas ve sayı fontu kritik, geri kalanı (müzik,
     * geç ses efektleri, arka planlar) *"sessizce eksik kalabilir"*.
     * Ölçüldü (`queueLazy`'nin yolu bilerek bozulup tarayıcıda koşuldu):
     * sessiz **değildi**. Korumasız `add.image` Phaser'ın `__MISSING`
     * dokusunu çiziyor — haritanın ortasında 32×32'lik yeşil bir hata
     * kutusu, yani oyuncuya hata ayıklama artığı.
     *
     * Geri kalan her şey o ölçümde doğru çıktı: mürekkep zemin, yol,
     * yapı noktaları, HUD, oynanış. Yani eksik arka plan gerçekten
     * sessiz kalabiliyor — yalnız bu tek kutu engelliyordu.
     */
    const arkaPlan = `bg-${this.#map.id}`;
    if (this.textures.exists(arkaPlan)) {
      this.add.image(this.scale.width / 2, this.scale.height / 2, arkaPlan);
    }
    // Harita **bir kez** çiziliyor. `update`'te yeniden çizmek her karede
    // yeni geometri üretmek demek; Graphics'in maliyeti orada.
    // `Y01` adım 2 — çizim `fx/MapRenderer.ts`'e taşındı.
    this.#mapRenderer = new MapRenderer(this, this.#map);
    // Bilgi paneli: harita 1 kadrosunun düşmanları (S42).
    this.#infoPanel = new TowerInfoPanel(
      this,
      this.scale.width - 12 - TowerInfoPanel.W,
      this.scale.height - 12 - TowerInfoPanel.H,
      ENEMIES.filter((e) => this.#map.enemyRoster.includes(e.id)),
      this.#map.paths.reduce((t, p) => t + (p.length > 1 ? new PathSystem(p).totalLength : 0), 0),
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
        // `M8-T09` — sallantı `screenShake` ayarına bağlı (bkz. `Enemy`).
        const e = new Enemy(this, ENEMY_SIZE, () => this.settings.state.screenShake);
        dusmanGrup.add(e);
        return e;
      },
      POOL_PREALLOC.enemy,
      (k) => this.#havuzDoldu('düşman', k),
    );
    this.#enemyPool = enemyPool;

    // `M30` — düşman havuzundan **sonra** kuruluyor: havuz bütün
    // düşmanları kurucuda üretiyor (`util/pool.ts` prealloc), yani
    // sonra eklenen bu katman görüntü listesinde onların üstünde
    // kalıyor. Can çubukları daha da sonra kuruluyor, işaret onların
    // altında kalmıyor — zaten çubuğun yanına düşüyor.
    this.#durumKatmani = new EnemyStatus(this, this.#mapRenderer);

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
    // `M10-T03` — kalkan halkası. **Tek** `Graphics`, havuz değil:
    // `#drawRally`'nin deseni. Düşman sprite'ı `Sprite` (Container
    // değil), yani çocuk ekleyemiyor; havuzlu ikinci bir nesne
    // (`EnemyHealthBar` gibi) bu kadar seyrek bir süs için fazla
    // makine olurdu.
    this.#kalkanGfx = this.add.graphics();
    // `M106` — hasar tabanı kalkanı. Aynı desen: tek `Graphics`, her
    // karede yeniden çiziliyor. Sayıların **üstünde** durmalı, o yüzden
    // havuz yaratıldıktan sonra ekleniyor (sahne çizim sırası).
    this.#emildiGfx = this.add.graphics();
    // `Y01` adım 1 — juice katmanı `fx/Particles.ts`'e taşındı.
    this.#efektler = new Particles(this, this.settings, this.clock, enemyPool, enemyHealthBars);

    // `Y09` — öğretici. `SaveData`'nın (`progress`) versiyonuna dokunmuyor,
    // aynı anahtarın kendi `tutorial` alanını kullanıyor (bkz.
    // `TutorialSystem`'in başlık yorumu).
    this.#tutorialHints = new TutorialHints(this, this.bus);
    this.#tutorial = new TutorialSystem(
      new LocalStore(),
      this.settings.state.hints,
      (hint) =>
        this.#tutorialHints?.show(
          // `M102` — tek sapma: yükseltme ipucunun sayıları veriden
          // türetiliyor, `strings.ts`'te yazılı değil (TIER 1 k.1).
          hint === 'abilityUpgrade'
            ? yetenekIpucuMetni((id) => this.abilities.seviye(id))
            : t(HINT_TEXT_KEY[hint]),
        ),
      this.bus,
    );
    this.#tutorial.start();

    this.#mermiHavuzu = mermiHavuzu;
    this.#projectiles = new ProjectileSystem<Enemy, Projectile>(
      mermiHavuzu,
      (e, sonuc, x, y, hasarTipi) => {
        this.#damageTexts?.spawn(x, y - ENEMY_SIZE, sonuc.dealt, sonuc.floored);
        // §10: sarsıntı YALNIZ top patlaması, boss vuruşu ve can kaybında.
        // Okçu atışı sarsmıyor — kural metninde adı geçen karşı örnek.
        if (e.def?.id === 'ogreSef' && sonuc.dealt > 0) {
          this.hitStop.trigger(80, this.clock.scale);
          this.shake.trigger(x - e.x || 1, y - e.y, 0.5);
        }
        // `M8-T08` — isabet parıltısı hasar tipine göre renkleniyor:
        // fiziksel altın, büyü lapis. Yön zaten doğruydu ama `patlat`
        // onu kullanmıyordu (bkz. `Particles.patlat` notu).
        this.#efektler?.patlat(x, y, x - e.x, y - e.y, 4, ISABET_RENGI[hasarTipi]);
        // `G08` — vuruş flaşı. Yalnız GERÇEK mermi isabetinde (bu callback
        // yalnız buradan çağrılıyor — yanma tikleri ve sıfır-hasarlı ölüm
        // kontrolleri `#hasarUygula`'yı DOĞRUDAN çağırıyor, buraya hiç
        // uğramıyor). Efekt — bilgi değil — `effectScale 0`'da atlanıyor;
        // hasar sayısı zaten bilgiyi taşıyor.
        if (sonuc.dealt > 0 && this.settings.effectScale > 0) e.hit();
        this.#hasarUygula(e, sonuc.dealt);
      },
      // Süreli etkiler isabet anında uygulanıyor (yanma, yavaşlatma).
      (e, effect) => applyEffect(e.effects, effect),
      // §10: ekran sarsıntısı **yalnız** top patlamasında (ve boss vuruşu,
      // can kaybı). Yön yukarı — patlama zeminden geliyor.
      (x, y, r) => {
        this.shake.trigger(0, 1, Math.min(1, r / 90));
        // Patlama **her yöne**: `patlat`'ın varsayılan dar konisi (55°)
        // isabet sıçraması için doğru, patlama için değil — `M8-T08`
        // yönü kullanmaya başlayınca top patlaması bir anda yukarı
        // fışkıran bir çeşmeye dönmüştü.
        this.#efektler?.patlat(x, y, 0, -1, 16, undefined, TAM_DAIRE);
      },
    );

    // `M8-T10` — seviye çağrı anında okunuyor: ayar oyun içinde
    // değişince bir sonraki efekt doğru seviyede çalıyor.
    this.#soundSystem = new SoundSystem(this, this.bus, this.#waveList, () => this.settings.sfxScale);
    // `M8-T03` — yalnız `bus` dinliyor. Duvar saati enjekte ediliyor:
    // `RunStats` saf mantık, zamanı kendi okumaz (bekçi k.8).
    this.#runStats = new RunStats(
      this.bus,
      () => performance.now(),
      this.#map.startGold,
      this.startLives,
    );

    this.#towers = new TowerSystem<Tower>((kule, tier, hedef) => {
      // Uçan çarpanı **mermiye girmeden önce** uygulanıyor: o kulenin
      // özelliği, düşmanın savunması değil (`combat.ts` notu).
      const ucanCarpani = hedef.def?.flying === true ? tier.airMultiplier : 1;
      const m = this.#projectiles?.fire({
        x: kule.x,
        y: kule.y,
        target: hedef as Enemy,
        damage: tier.damage * ucanCarpani,
        damageType: kule.def.damageType,
        speed: MERMI_HIZI, // S20 kapandı (`M82`): ölçüldü, geçici değil
        splashRadius: tier.splashRadius ?? 0,
        hitRadius: MERMI_ISABET_YARICAPI,
        effect: tier.effect,
      });
      // Görünüm `fire`'dan sonra (konum/hedef dolu), `activate`'ten önce.
      const gorunum = projectileLook(kule.def.id, tier.effect?.kind, kule.tierIndex);
      m?.setLook(gorunum, this.settings.effectScale);
      m?.activate();

      // `M8-T08` — geri tepme + namlu parıltısı. İkisi de **aynı yönü**
      // kullanıyor: kule hedefin tersine kayıyor, parçacık hedefe doğru
      // saçılıyor. Renk merminin rengi — üç aile ekranda ayrışsın diye
      // (oyuncu geri bildirimi: "kule tipini değiştirince atış şekli
      // hiç değişmiyor").
      const yonX = hedef.x - kule.x;
      const yonY = hedef.y - kule.y;
      kule.recoil(yonX, yonY, this.settings.effectScale);
      this.#efektler?.patlat(
        kule.x + yonX * NAMLU_ORANI,
        kule.y + yonY * NAMLU_ORANI,
        yonX,
        yonY,
        NAMLU_PARCACIK,
        gorunum.color,
        NAMLU_YAYILIM,
      );
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

    // `M8-T11` — zorluk yalnız iki yerden giriyor: başlangıç canı (burada)
    // ve doğum anındaki HP çarpanı (`WaveManager`'a geçen `hpScale`).
    this.#eco = new EconomySystem(this.#map, this.bus, this.settings.difficulty.startLives);
    // Bölünmeden doğan yavru da zorluk çarpanını almalı — yoksa Zor'da
    // ana ölçekleniyor, yavrusu ölçeklenmiyordu.
    /**
     * **`getEnemyForMap`, `getEnemy` DEĞİL.**
     *
     * `M10-T03`'te canlı testte yakalandı ve kendi başına bir hata:
     * `waveSim` düşmanı `getEnemyForMap` ile çözüyordu, canlı oyun ham
     * `getEnemy` ile. Yani **denge testi oyuncunun dövüşmediği bir
     * boss'u ölçüyordu**:
     *
     * | Harita | Canlı (hatalı) | Ölçülen (doğru) |
     * |---|---|---|
     * | tas-kopru | 1120 HP · zırh 10 | 712 HP · zırh 5 |
     * | kul-ovasi | 1820 HP · zırh 10 | 1023 HP · zırh 2 |
     * | kar-gecidi | 3080 HP · zırh 10 | 1933 HP · zırh 2 |
     * | kadim-harabe | **4760 HP · zırh 10** | 2675 HP · zırh 2 |
     *
     * `bossScaling.ts`'in kendi yorumu bu sözleşmeyi zaten yazıyordu:
     * *"Doğum yolu bu fonksiyondan geçtiği sürece hem oyun hem
     * `simulateWave` aynı boss'u görüyor."* Canlı yol o fonksiyondan
     * geçmiyordu. `referenceBoards.ts` `BOSS_HP_BEFORE_NERF = 2200`'ü
     * "projenin en pahalı hatası" diye kaydetmiş; bu onun sessiz
     * nüksü ve daha büyüğü.
     */
    const dusmanCoz = (id: EnemyId): EnemyDef | undefined => getEnemyForMap(id, this.#map);

    this.#abilities = new EnemyAbilitySystem(
      enemyPool,
      this.#map.hpMultiplier * this.settings.difficulty.hpScale,
      dusmanCoz,
      // `M140` — susturmanın tek uygulama adresi `TowerSystem.sustur`;
      // `waveSim` de aynı sistemi aynı geri çağrıyla kuruyor.
      (x, y, r, sn) => this.#towers?.sustur(x, y, r, sn) != null,
    );
    this.#waves = new WaveManager(
      enemyPool,
      moverFor,
      this.bus,
      this.#eco,
      this.#waveList,
      this.#map.hpMultiplier * this.settings.difficulty.hpScale,
      dusmanCoz,
      // `G05` — sızan düşmanın can çubuğu da havuza dönmeden önce
      // serbest kalmalı, ölüm yoluyla aynı sözleşme (`Particles.olumEfekti`).
      (e) => this.#enemyHealthBars?.releaseFor(e),
      // `M8-T06` — sonsuz modda dalga listesi bitince oyun durmuyor.
      // `WaveManager` üretimin kurallarını bilmiyor, yalnız bu sözleşmeyi.
      this.#endless
        ? {
            waveAt: (n) =>
              generateEndlessWave(n, this.#map.enemyRoster, this.#map.paths.length),
            hpScaleAt: (n) => endlessHpScale(n),
          }
        : undefined,
    );

    // `M8-T07` — el içi başarımlar. Bant `Game` sahnesinde duruyor
    // (HUD'da değil): duraklatmada `Game` donuyor, yani bant da donuyor
    // ve oyuncu duraklattığı anda kayan bir bildirimle karşılaşmıyor.
    this.#achievementToast = new AchievementToast(this, this.settings);
    this.#achievements = new AchievementSystem(new LocalStore(), this.bus, (id) => {
      this.#achievementToast?.show(id);
    });

    // `M8-T09` — boss giriş bandı. Dalga **başlarken** değil, boss
    // gerçekten sahaya çıkınca: telgrafta zaten yazıyor, bant "işte
    // şimdi" demeli. Doğum anını yakalamanın tek yeri `wave:started`
    // değil — boss refakatinden 8 sn sonra geliyor (BOSS_REFAKAT_GECIKMESI).
    this.#bossBanner = new BossBanner(this, this.settings);
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
        targetingShown: (spotIndex) => this.bus.emit('targeting:opened', { spotIndex }),
        redrawRally: () => this.#drawRally(),
      },
      this.settings,
    );

    this.#setupInput();

    this.bus.on('life:lost', ({ remaining }) => {
      // §10: can kaybında vermilyon vinyet nabzı + yönlü sarsıntı.
      this.#efektler?.vinyetNabzi();
      this.shake.trigger(0, 1, 0.8);
      // Kaybetme ekranı M3'te. Şimdilik yalnız geliştirme çıktısı.
      if (import.meta.env.DEV) console.info(`[can] kalan ${remaining}`);
    });

    /**
     * Oyun müziği **harita açılır açılmaz** başlıyor.
     *
     * Eskiden dalga 1 bitene kadar sessizdi (`M6-T11` brifi: "oyun
     * içinde, dalga 1 bittikten sonra devreye giriyor"). Ölçülen zaman
     * çizgisi şuydu:
     *
     *   menü            music_menu
     *   haritaya giriş  menü müziği susuyor -> SESSİZLİK
     *   dalga 1         sessiz (tasarım)
     *   dalga 1 bitti   music_game O AN indirilmeye başlıyor — 2,8 MB
     *
     * Menü müziğinin tarayıcı otomatik oynatma kilidine takılmasıyla
     * birleşince oyunun **ilk dakikası büsbütün sessiz** kalıyordu ve
     * oyuncu bunu "müzik gelmiyor" diye bildirdi. İki düzeltme yapıldı:
     * indirme öne alındı (aşağıda) ve **kullanıcının kararıyla** dalga 1
     * beklemesi kaldırıldı.
     *
     * `Y05` ile çelişmiyor: `Y05` müziği **ilk indirmeden** çıkarmıştı
     * ve o hâlâ öyle — burası oyun başladıktan sonrası, ilk indirme
     * ölçümüne (0,86 MB) girmiyor.
     *
     * `musicScale <= 0` ise dosya **hiç indirilmiyor** (`Y04`'ün bedava
     * kazancı, `MenuScene`'deki aynı desen).
     */
    // `M9-T02` — `ROADMAP`'in teşhis matrisi için. Olay sözcüğü
    // `systems/olcum.ts`'te; burası yalnız "ne zaman" diyor.
    haritaBasladi(portal, this.#map.id, this.settings.state.difficulty);

    this.sound.stopByKey('music_menu');

    if (this.settings.musicScale > 0) {
      const cal = (): void => {
        this.sound.play('music_game', {
          loop: true,
          volume: MUSIC_BASE_VOLUME * this.settings.musicScale,
        });
      };
      if (this.cache.audio.exists('music_game')) {
        cal();
      } else {
        /**
         * Gecikmeli yolda **sahne hâlâ açık mı** diye bakılıyor: dosya
         * 2,8 MB ve gelene kadar oyuncu haritadan çıkmış olabilir;
         * çıkmışsa oyun müziği menüde çalmaya başlamamalı.
         *
         * Koruma yalnız BURADA. Anlık yola da konduğunda yeniden
         * başlatmada müzik hiç çalmadı (ölçüldü: üç `restartGame`'de
         * çalan kopya 1 → 0, 0, 0) — `create()` çalışırken sahne henüz
         * `isActive` değil.
         */
        this.load.once('filecomplete-audio-music_game', () => {
          if (this.scene.isActive()) cal();
        });
        PreloadScene.queueBackground(this);
        this.load.start();
      }
    }

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
      this.sound.stopByKey('boss_music');
      // Ses efekti örnekleri `SoundManager`'da (oyun geneli) yaşıyor —
      // sahneyle birlikte gitmiyor, elle bırakılıyor.
      this.#soundSystem?.destroy();
      // `M10` — bekleyen ipucu sayacı ölü sahneye ateşlemesin.
      this.#tutorialHints?.destroy();
      const d = devHooks();
      if (d !== undefined) d.clearCount = (d.clearCount ?? 0) + 1;
    });

    this.#devKancalari(
      path,
      enemyPool,
      mermiHavuzu,
      sayiHavuzu,
      altinHavuzu,
      canCubuguHavuzu,
      moverFor,
    );

    // `M10-T02` — sıra ÖNEMLİ: her şey kurulduktan sonra, ama ilk
    // `update()`'ten önce. Kule kurulumu `#placeTower`/`#upgradeTower`
    // yollarından geçiyor, yani `#occupancy`, `#towers` ve `#eco`'nun
    // hazır olması gerekiyor.
    this.#turuGeriYukle();

    // Dalga sınırı = kaydetme anı. `wave:ended` dalga bittiğinde ve
    // hazırlık başlarken yayılıyor; saha o an boş.
    this.bus.on('wave:ended', ({ index }) => this.#turuKaydet(index));
  }

  // ------------------------------------------------------- tur kaydı (M10)

  /**
   * Turu **dalga sınırında** yazar.
   *
   * Sahadaki düşman/mermi/asker durumu kaydedilmiyor — gerekçe
   * `systems/RunSave.ts`'te. Bu yüzden çağrı yeri yalnız `wave:ended`.
   *
   * Sonsuz mod **kaydedilmiyor**: `WaveManager` üretilmiş dalgayı
   * önbelleğe alıyor ve sonsuz koşunun indeksi elle yazılmış dalga
   * listesinin dışında; turu yarıda yükleyip devam ettirmek rekorun
   * anlamını da tartışmalı hâle getirirdi (`EndlessRecords`).
   */
  #turuKaydet(sonrakiWaveIndex: number): void {
    const eco = this.#eco;
    const waves = this.#waves;
    if (eco === undefined || waves === undefined) return;
    if (this.#endless || waves.isEndless) return;
    // Kaybedilmiş ya da bitmiş tur kaydedilmiyor.
    if (eco.lives <= 0 || waves.isComplete) return;
    /**
     * **Saha boş değilse kaydedilmiyor** (`M16` Faz 2).
     *
     * `RunSave`'in yazılı sözleşmesi "dalga sınırında saha boş" —
     * sahadaki düşman/mermi/asker bilerek kaydedilmiyor. Dalgalar üst
     * üste binebildiği için o varsayım artık kendiliğinden doğru değil:
     * artıklar yoldayken kaydedip yeniden yüklemek onları **silerdi**,
     * yani oyuncu lehine bir sömürü olurdu. Şema büyütmek yerine kayıt
     * bir sonraki temiz sınıra bırakılıyor; kampanyada her dalganın
     * artığı er geç tükeniyor.
     */
    if ((this.#enemyPool?.activeCount ?? 0) > 0) return;

    const spots: SpotKaydi[] = [];
    for (const [spotIndex, kule] of this.#towerBySpot) {
      spots.push({
        spotIndex,
        defId: kule.def.id,
        tierIndex: kule.tierIndex,
        targetMode: kule.targetMode,
      });
    }
    for (const [spotIndex, k] of this.#barracksBySpot) {
      spots.push({
        spotIndex,
        defId: 'kisla',
        tierIndex: k.tier,
        rally: { x: k.rally.x, y: k.rally.y },
      });
    }

    turKaydi().yaz({
      version: RUN_VERSION,
      mapId: this.#map.id,
      difficulty: this.settings.state.difficulty,
      // **Olayın taşıdığı sayı kullanılıyor, `waves.waveNumber` değil.**
      // `wave:ended` sayaç artmadan önce yayılıyor, yani o an
      // `waveNumber` daha BİTEN dalgayı gösteriyor; ondan hesaplamak
      // oyuncuyu kazandığı dalgaya geri gönderirdi (canlı testte
      // yakalandı: dalga 2 koşarken kayıt `waveIndex: 0` diyordu).
      // Olayın `index`'i 1 tabanlı biten dalga = 0 tabanlı sıradaki
      // dalga; eşitlik `WaveManager.test.ts`'te bağlı.
      waveIndex: sonrakiWaveIndex,
      gold: eco.gold,
      lives: eco.lives,
      spots,
      abilities: this.abilities.beklemeler,
      abilityLevels: this.abilities.seviyeKaydi(),
      stats: { ...this.#runStats?.data },
    });
  }

  /** Tur bitti — kayıt siliniyor. `HudScene`/`GameOverScene` çağırıyor. */
  turKaydiniSil(): void {
    turKaydi().sil();
  }

  /**
   * Kaydedilmiş turu sahneye uygular.
   *
   * ## Tahta neden NORMAL satın alma yolundan kuruluyor
   *
   * Doğrudan `new Tower(...)` daha kısa olurdu ama `EconomySystem`'in
   * `#spentBySpot` defteri boş kalırdı ve **satış iadesi sıfır** olurdu
   * (`sellRefund(spentAt(spot))`). Oyuncu turuna dönünce kuleleri
   * satamaz hâle gelirdi ve bunu kimse test etmeden fark etmezdi.
   *
   * O yüzden: geçici bakiye → gerçek satın almalar → bakiyeyi turun
   * değerine geri çek. `RunStats`'ın altın tabanı da o sıçramayı
   * harcama sanmasın diye ayrıca ayarlanıyor.
   */
  #turuGeriYukle(): void {
    const tur = this.#devamTuru;
    this.#devamTuru = null;
    const eco = this.#eco;
    if (tur === null || eco === undefined) return;

    // Geçici bakiye: en pahalı tahta bile bunun altında kalıyor.
    const gercekAltin = tur.gold;
    eco.turdanGeriYukle(GERI_YUKLEME_BAKIYESI, tur.lives);

    for (const s of tur.spots) {
      if (s.defId === 'kisla') {
        if (!this.#placeBarracks(s.spotIndex)) continue;
        // Kademeler **sırayla**: `#upgradeBarracks` tek adım atlıyor mu
        // diye bakmıyor ama askerleri her adımda tazeliyor.
        for (let k = 1; k <= s.tierIndex; k++) {
          this.#upgradeBarracks(s.spotIndex, k as 0 | 1 | 2 | 3);
        }
        if (s.rally !== undefined) this.#setRally(s.spotIndex, s.rally);
        continue;
      }
      // Kayıttaki kimlik `string`; `TowerId`'ye **daraltılarak**
      // aranıyor. Tanınmayan aile sessizce atlanıyor: kule listesi
      // değişirse eski tur yine de yüklensin, yarım da olsa.
      const def = TOWERS.find((t) => t.id === s.defId);
      if (def === undefined) continue;
      if (!this.#placeTower(s.spotIndex, def)) continue;
      // T1→T2 zorunlu ara adım; T3 dalları doğrudan hedeften geliyor
      // (`#upgradeTower` T2'den 2'ye ya da 3'e izin veriyor).
      if (s.tierIndex >= 1) this.#upgradeTower(s.spotIndex, 1);
      if (s.tierIndex >= 2) this.#upgradeTower(s.spotIndex, s.tierIndex);
      const kule = this.#towerBySpot.get(s.spotIndex);
      const mod = TARGET_MODES.find((m) => m === s.targetMode);
      if (kule !== undefined && mod !== undefined) kule.targetMode = mod;
    }

    eco.turdanGeriYukle(gercekAltin, tur.lives);
    this.#runStats?.geriYukle(tur.stats);
    this.#runStats?.altinTabaniniAyarla(gercekAltin);
    this.abilities.turdanGeriYukle(tur.abilities);
    // `M99` — satın alınmış yükseltmeler de turun durumu. Alan eksikse
    // (bu sürümden önce yazılmış tur) seviyeler 1'de kalıyor.
    if (tur.abilityLevels !== undefined) this.abilities.turdanGeriYukleSeviye(tur.abilityLevels);
    this.#waves?.turdanGeriYukle(tur.waveIndex);
  }

  /**
   * Ham `delta`nın dokunulduğu **tek yer**.
   *
   * TIER 1 kural 8: hiçbir sistem ham `delta` kullanmaz. Bu metodun tek
   * işi saati ilerletmek; zaman bağımlı her mantık `clock.scaledDelta`
   * üzerinden çalışır.
   */
  /**
   * **Kare döngüsü — mantığı DEĞİL, yalnız kaç adım koşulacağını belirler**
   * (`M64`, S132).
   *
   * Oyun mantığı artık ekranın kare süresine bakmıyor: `GameClock` gerçek
   * süreyi biriktiriyor ve tam `SABIT_ADIM_MS`'lik adımlar veriyor. 144
   * Hz'de karelerin çoğu **sıfır** adım koşar, 30 Hz'de bir kare iki adım
   * koşar; ikisinde de oyun birebir aynı oynanır.
   *
   * Çizim yine her karede oluyor — ama çizimi yapan `#sabitAdim` içindeki
   * katmanlar, çünkü bu oyunda sunum da oyun zamanına bağlı (hasar sayısı,
   * altın uçuşu, ekran sarsıntısı `2×`'te hızlanmalı — `M11` kararı). 60
   * Hz mantık adımı ile 144 Hz çizim arasındaki fark düşman başına kare
   * başına ~1 px; ara değer üretmeye (interpolation) gerek görülmedi.
   */
  update(_time: number, delta: number): void {
    // **Hit-stop oyun zamanını sıfırlıyor** (§10). Sayacı duvar saatiyle
    // işliyor — durdurduğu saatle kendini ölçseydi hiç bitmezdi.
    // Donmuşken saat hiç ilerlemiyor: biriktirici de durur, artık korunur.
    const donduruldu = this.hitStop.update(delta);
    const adimlar = donduruldu ? 0 : this.clock.tick(delta);
    if (adimlar > 0) {
      // Önceki karenin ara değeri siliniyor: mantık **gerçek** konumdan
      // devam etmeli, yoksa hedefleme yarım adım yanılır (`M65`).
      for (const n of this.#araDegerliler()) gercegeDon(n);
      for (let i = 0; i < adimlar; i += 1) this.#sabitAdim();
      for (const n of this.#araDegerliler()) adimBitti(n);
    }
    this.#araDegerleriCiz();

    this.#yukseltmeAlinabilirMi();

    const devKare = devHooks();
    if (devKare !== undefined) devKare.gameFrames = (devKare.gameFrames ?? 0) + 1;
  }

  /**
   * Bir yükseltme **ilk kez** alınabilir olduğunda olayı yayar (`M102`).
   *
   * Karede bir kez koşuyor ama bayrak yüzünden tur başına **bir kez**
   * iş yapıyor; sonrası tek `if`. Olay yerine `gold:changed`'e
   * bağlanabilirdi, ama alınabilirlik iki şeyden birden doğuyor
   * (altın **ve** seviye) ve ikisini ayrı ayrı dinlemek aynı kararı
   * iki yere yazmak olurdu — HUD de tam bu koşulu kendi çiziminde
   * kullanıyor, tek fark orada her kare yeniden soruluyor.
   */
  #yukseltmeAlinabilirMi(): void {
    if (this.#yukseltmeDuyuruldu) return;
    for (const a of ABILITIES) {
      const bedel = this.yetenekYukseltmeBedeli(a.id);
      if (bedel === null || this.gold < bedel) continue;
      this.#yukseltmeDuyuruldu = true;
      this.bus.emit('ability:upgradable', {});
      return;
    }
  }

  /**
   * Ara değer üretilecek nesneler: hareket eden her şey (`M65`).
   *
   * Kuleler yok — yerlerinde duruyorlar. Kışla askerleri iki listede
   * yaşıyor (kışlanınkiler ve Takviye'nin **geçici** olanları); ikincisi
   * `M16`'da bir kez atlanmıştı (bkz. `shutdown`'daki not), o yüzden
   * burada ikisi de açıkça sayılıyor.
   */
  *#araDegerliler(): Generator<AraDegerli> {
    yield* this.#enemyPool?.activeItems() ?? [];
    yield* this.#mermiHavuzu?.activeItems() ?? [];
    yield* this.#gecici;
    // `BarracksKayit.soldiers` saf tip (`SoldierState`) tutuyor ve o tip
    // ara değer alanlarını taşımıyor — `waveSim`'in askerleri de aynı
    // tipte ve onların çizimi yok. Zorlama yerine daraltma: sahnedeki
    // asker her zaman `Soldier`.
    for (const [, k] of this.#barracksBySpot) {
      for (const asker of k.soldiers) if (asker instanceof Soldier) yield asker;
    }
  }

  /**
   * Çizim konumlarını son iki mantık durumu **arasına** koyar ve
   * düşmandan türeyen katmanları oradan çizer (`M65`).
   *
   * Can çubuğu, durum işaretleri, kalkan halkası ve yeraltı gölgesi
   * `#sabitAdim`'den buraya taşındı: düşman ara değerde, çubuğu gerçek
   * konumda çizilseydi ikisi ayrı yerlerde titrerdi.
   */
  #araDegerleriCiz(): void {
    const oran = this.clock.oran;
    for (const n of this.#araDegerliler()) araDegerUygula(n, oran);

    const dusmanlar = this.#enemyPool?.activeItems() ?? [];
    // `M15`'in deseni: olay her karede yayılıyor, "ilk kez mi" kararı
    // `TutorialSystem`'in.
    if (this.#durumKatmani?.update(dusmanlar) === true) this.bus.emit('enemy:healing', {});
    this.#gomululeriCiz(dusmanlar);
    this.#enemyHealthBars?.update(dusmanlar);
    this.#kalkanlariCiz(dusmanlar);
  }

  /** Bir sabit mantık adımı. Sırası `waveSim` ile birebir aynı. */
  #sabitAdim(): void {
    const sd = this.clock.scaledDelta;
    for (const n of this.#araDegerliler()) adimBasla(n);

    this.#waves?.update(sd);
    const dusmanlar = this.#enemyPool?.activeItems() ?? [];
    this.#abilities?.update(sd);
    // Yeteneklerden **sonra**: halka ve işaret o karede uygulanan
    // iyileştirmeyi gösteriyor, bir kare öncekini değil.
    // `M15`'in `enemy:burrowed` deseni: olay her karede yayılıyor,
    // "ilk kez mi" kararı `TutorialSystem`'in.
    this.#etkileriIsle(sd, dusmanlar);
    // Kışla, kulelerden **önce**: engellenen düşman aynı karede duruyor,
    // yani kule ona ateş ederken doğru konumda oluyor.
    this.#kislalariIsle(sd, dusmanlar);
    this.abilities.tick(sd);
    this.#towers?.update(sd, dusmanlar);
    // İşaret durumdan türüyor (`Tower.susturmaGoster`), bayrak tutulmuyor.
    for (const k of this.#towers?.towers ?? []) k.susturmaGoster();
    this.#projectiles?.update(sd, dusmanlar);
    this.#damageTexts?.update(sd);
    // `M106` — işaretler güncellemeden SONRA: konum ve alfa o karede
    // kesinleşmiş oluyor, yoksa işaret sayının bir kare gerisinde kalırdı.
    if (this.#emildiGfx !== undefined) this.#damageTexts?.ciz(this.#emildiGfx);
    this.#altinUcusu?.update(sd);
    // `true` yalnız hattın GÖRÜNDÜĞÜ karede — öğretici bir kez tetiklensin.
    if (this.#mapRenderer?.updateFlyerHint(this.#waves?.upcomingWave) === true) {
      this.bus.emit('wave:flyers', {});
    }

    const aktifMermi = this.#projectiles?.activeCount ?? 0;
    if (aktifMermi > this.#mermiTepe) this.#mermiTepe = aktifMermi;

    this.#mermiIzi(sd);
    this.#bossGirisi();

    // §10 ekran sarsıntısı — kamerayı sahne kaydırıyor.
    this.shake.update(sd);
    const kayma = this.shake.offset;
    this.cameras.main.setScroll(kayma.x, kayma.y);
  }

  /**
   * Boss sahaya çıktı mı — `M8-T09`.
   *
   * `wave:started` olayına bağlanmadı: boss refakatinden **8 sn sonra**
   * doğuyor (`BOSS_REFAKAT_GECIKMESI_SN`, §7), yani dalga başında bant
   * göstermek erken olurdu ve oyuncu bandı boss yokken görürdü.
   * `bossInfo` zaten sahadaki boss'u arıyor (can çubuğu onu kullanıyor);
   * yok→var geçişi tam aradığımız an.
   */
  #bossGirisi(): void {
    const vardi = this.#bossSahada;
    this.#bossSahada = this.bossInfo !== null;
    if (this.#bossSahada && !vardi) {
      this.#bossBanner?.goster(() => this.shake.trigger(1, 0, 0.8));
      this.#bossMuzigi();
    }
  }

  /**
   * Boss müziğine geçiş — `M8-T10`, `M8-P03`.
   *
   * Parça **henüz üretilmedi**. `cache.audio.exists` kontrolü sayesinde
   * bugün hiçbir şey olmuyor (oyun müziği çalmaya devam ediyor) ve dosya
   * `public/assets/audio/music/boss_music.m4a` olarak geldiğinde koda
   * dokunmadan devreye giriyor — `Y14`'ün "kritik olmayan varlık eksikse
   * sessizce devam et" deseni.
   *
   * Geri dönüş yok: boss dalgası haritanın son dalgası, ardından zafer
   * ya da yenilgi geliyor ve ikisi de müziği durduruyor.
   */
  /**
   * Dil değişince sahnenin bir-kez-kurulan çevrili arayüzünü tazeler —
   * `M8-B04`. `HudScene` kendini `scene.restart()` ile yeniliyor ama bu
   * sahne yenilenemez (kuleler, altın, dalga kaybolurdu), o yüzden
   * yalnız etkilenen parçalar elden geçiriliyor.
   *
   * Açık bir yapı menüsü de kapatılıyor: `openSellMenu` bir sonraki
   * açılışta zaten yeni dille kuruluyor, ama ekranda duran eski menü
   * kullanıcıya iki dilli bir ekran gösterirdi.
   */
  dilYenile(): void {
    this.#infoPanel?.dilYenile();
    this.#buildMenu?.closeMenu();
  }

  #bossMuzigi(): void {
    if (!this.cache.audio.exists('boss_music')) return;
    if (this.settings.musicScale <= 0) return;
    this.sound.stopByKey('music_game');
    this.sound.play('boss_music', {
      loop: true,
      volume: MUSIC_BASE_VOLUME * this.settings.musicScale,
    });
  }

  /**
   * Büyü mermisinin parçacık izi — `M8-T08`.
   *
   * `Projectile` kendi `update`'ini taşımıyor (ince sınıf: hareketi
   * `ProjectileSystem` yapıyor ve o Phaser'sız), o yüzden iz **burada**,
   * sahnenin karesinde üretiliyor.
   *
   * Süre `scaledDelta` üzerinden (TIER 1 kural 8): 2× hızda mermi iki kat
   * hızlı gidiyor ve iz de iki kat sık bırakılıyor, yani izin uzunluğu
   * hızdan bağımsız kalıyor. Ham `delta` kullanılsaydı 2×'te iz seyrekleşip
   * kesik kesik görünürdü.
   *
   * Bütçe: aynı anda havada tipik olarak 1-3 büyü mermisi var ve her biri
   * saniyede ~14 parçacık bırakıyor; §10'un 300 tavanına uzak.
   */
  #mermiIzi(scaledDelta: number): void {
    if (this.settings.effectScale <= 0) return; // k.6 — efekt kapalı
    const havuz = this.#mermiHavuzu;
    if (havuz === undefined) return;

    this.#izBirikim += scaledDelta;
    if (this.#izBirikim < IZ_ARALIK_MS) return;
    this.#izBirikim = 0;

    for (const m of havuz.activeItems()) {
      if (!m.trail || !m.alive) continue;
      this.#efektler?.patlat(m.x, m.y, 0, 0, 1, m.trailColor, TAM_DAIRE);
    }
  }

  // ------------------------------------------------------------------ hasar

  #hasarUygula(e: Enemy, miktar: number): void {
    if (!e.alive) return;
    // `M10-T03` — kalkan **candan önce**. Mermi de yanma da bu huniden
    // geçiyor, yani kalkan "hiçbir şey cana dokunmadan önce erir"
    // sözleşmesini oyunun tamamında koruyor.
    e.hp -= kalkandanGecir(miktar, e);
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
    this.#efektler?.patlat(e.x, e.y, 0, -1, 10, undefined, TAM_DAIRE);
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

  /**
   * `M10-T03` — kalkanlı düşmanın halkası.
   *
   * ## k.6: renk tek başına taşımıyor
   *
   * Halkanın **varlığı** bir sinyal (şekil), uzunluğu ikincisi: kalan
   * kalkanla orantılı bir **yay** çiziliyor, yani erirken gözle
   * izleniyor. Renk körü bir oyuncu için de "yayı olan düşman" ve
   * "yayı bitmiş düşman" ayrı görünüyor.
   *
   * ## Neden her karede yeniden çiziliyor
   *
   * `#drawRally` her karede çağrılmıyor çünkü kesikli çember + çizgi
   * üretmek pahalı (canlı ölçüm: 0,95 ms → 3,5 ms). Bu çizim ondan
   * **çok** daha ucuz: kalkanlı düşman sayısı bir elin parmağı kadar
   * ve her biri tek bir yay. Yine de kalkanlı hiç düşman yoksa
   * `clear()` dışında hiçbir iş yapılmıyor.
   */
  #kalkanlariCiz(dusmanlar: readonly Enemy[]): void {
    const g = this.#kalkanGfx;
    if (g === undefined) return;
    g.clear();
    let kalkanliVar = false;
    for (const e of dusmanlar) {
      if (!e.alive || e.shieldLeft <= 0) continue;
      kalkanliVar = true;
      const tam = e.def?.shield ?? 0;
      if (tam <= 0) continue;
      const oran = Math.min(1, e.shieldLeft / tam);
      g.lineStyle(3, KALKAN_RENGI, 0.95);
      g.beginPath();
      // Tepe noktasından başlayıp saat yönünde: dolu yay = tam kalkan.
      g.arc(e.x, e.y, KALKAN_YARICAP, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * oran, false);
      g.strokePath();
    }
    // `M10` — öğretici ilk seferinde kalkanın ne olduğunu anlatıyor.
    // `wave:flyers`'ın birebir deseni: olay **her karede** yayılıyor ama
    // `TutorialSystem` "ilk kez mi" kararını kendi veriyor ve ipucu bir
    // kez görünüyor; burada ayrı bir bayrak tutmak kural 3'ün tuzağını
    // açardı (havuza dönen sahne alanı).
    if (kalkanliVar) this.bus.emit('enemy:shielded', {});
  }

  /**
   * **Yeraltı geçişi görünürlüğü** — `M12` Faz 1.
   *
   * Gömülü düşman saydamlaşıyor. Kural `TargetingSystem.gomuluMu`'da,
   * burada yalnız **gösterim** var: oyuncu "neden kuleler ateş etmiyor"
   * sorusunu can çubuğuna bakmadan cevaplayabilmeli (TIER 1 kural 6 —
   * bilgi yalnız renge değil, *saydamlığa ve harekete* bağlı).
   *
   * Her karede yazılıyor ve durum tutulmuyor: `alpha` düşmanın kendi
   * alanı ve havuza dönerken `resetForPool` zaten sıfırlıyor.
   */
  #gomululeriCiz(dusmanlar: readonly Enemy[]): void {
    let gomuluVar = false;
    for (const e of dusmanlar) {
      if (!e.alive) continue;
      const gomulu = gomuluMu(e);
      if (gomulu) gomuluVar = true;
      e.setAlpha(gomulu ? GOMULU_ALFA : 1);
    }
    // `M15` — öğretici ilk seferinde "kuleler neden ateş etmiyor"u
    // anlatıyor. `enemy:shielded`'ın birebir deseni: olay **her karede**
    // yayılıyor ama "ilk kez mi" kararını `TutorialSystem` veriyor;
    // burada ayrı bir bayrak tutmak kural 3'ün tuzağını açardı.
    if (gomuluVar) this.bus.emit('enemy:burrowed', {});
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
        // gerçek vuruşların sayısı görünmez olurdu.
        //
        // Bu satır M6'dan beri *"turuncu bir tint verilecek — bilgi
        // kaybolmuyor, kanal değişiyor"* diyordu ve **kanal hiç
        // açılmamıştı**: sayı kaldırılmış, yerine bir şey konmamıştı.
        // `M31` sözü tuttu — `fx/EnemyStatus` yanan düşmana kor rengi bir
        // üçgen koyuyor. Söz verilen tint değil bir **şekil**, çünkü k.6
        // bilginin yalnız renge dayanmasını yasaklıyor.
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
    const fiyat = maliyet(kademe.cost, this.#map);
    if (this.#eco?.canAfford(fiyat) !== true) return false;
    if (this.#occupancy?.occupy(spotIndex) !== true) return false;
    this.#eco.buyAt(spotIndex, fiyat);

    // `M24` — kışla da kule ile **aynı** toz halkasını atıyor. §10'un
    // "kule yerleşimi: toz halkası" kuralı `M6-T10`'da yalnız kuleye
    // uygulanmıştı; iki yapı da aynı eylemse aynı dili konuşmalı.
    this.#efektler?.patlat(spot.x, spot.y, 0, -1, 14, undefined, TAM_DAIRE);

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
    // `Y09` — öğreticinin "bayrağı sürükle" ipucu bunu dinliyor.
    this.bus.emit('barracks:placed', { spotIndex });
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
    this.#sokumGeriBildirimi(k.govde.x, k.govde.y, iade);
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
    const fiyat = maliyet(kademe.cost, this.#map);
    if (this.#eco?.canAfford(fiyat) !== true) return false;
    this.#eco.buyAt(spotIndex, fiyat);
    k.tier = hedef;
    k.govde.setFrame(towerFrameKey('kisla', hedef));
    /**
     * **`M33` — kışla yükseltmesi hiçbir olay yaymıyordu.**
     *
     * `M24` görsel kanalı birleştirmişti (aşağıdaki "kule yükseltmesiyle
     * aynı sütun") ama olay kanalı birleştirilmemişti. İki sonucu vardı:
     * yükseltme **sessizdi** (kule yükseltmesinin sesi var) ve
     * `AchievementSystem`'in `tower:upgraded` dinleyicisi kışlayı hiç
     * görmüyordu — yani `firstTier3` ve `bothBranches` kışla ailesiyle
     * **kazanılamıyordu**.
     *
     * `tower:upgraded` doğru olay, uydurma değil: `CLAUDE.md` "4 kule
     * ailesi (okçu, top, büyü, **kışla**)" diyor ve kademe indeksleri
     * birebir aynı (0..3, 2 ve 3 = T3a/T3b).
     *
     * Kurulum tarafı bilerek **bu yoldan geçmiyor**: `barracks:placed`'i
     * `tower:placed`'a bağlamak `firstTower` başarımını ve `RunStats`'ın
     * kule sayacını da kaydırırdı. Oradaki eksik yalnız sesti, o yüzden
     * `SoundSystem` `barracks:placed`'i kendi dinliyor.
     */
    this.bus.emit('tower:upgraded', { spotIndex, tier: hedef });
    // `M24` — kule yükseltmesiyle aynı sütun.
    this.#efektler?.patlat(k.govde.x, k.govde.y, 0, -1, 18, undefined, YUKSELTME_KONISI);
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

  /**
   * **Yetenek yükseltmesi satın alır** — `M99`, S117'nin gider kalemi.
   *
   * Fiyatı `data/abilities.yetenekYukseltmeFiyati` veriyor (tek adres,
   * `M79`'un `towers.maliyet` deseni): menüde yazan ile kesilen fiyat
   * ayrışamasın. Yetersiz altında **sessizce geçmiyor**, yapı menüsüyle
   * aynı geri bildirimi veriyor (`purchase:denied` → hata sesi).
   *
   * @returns Satın alındıysa `true`.
   */
  yetenegiYukselt(id: AbilityId): boolean {
    const eco = this.#eco;
    if (eco === undefined) return false;
    const fiyat = yetenekYukseltmeFiyati(this.abilities.seviye(id), this.#map);
    if (fiyat === null) return false; // azami seviye
    if (!eco.spend(fiyat)) {
      this.bus.emit('purchase:denied', {});
      return false;
    }
    this.abilities.yukselt(id);
    this.bus.emit('ability:upgraded', { id, seviye: this.abilities.seviye(id) });
    return true;
  }

  /**
   * Bir sonraki yükseltmenin fiyatı; azami seviyede `null`.
   * HUD düğmeyi buna göre gösteriyor.
   */
  yetenekYukseltmeBedeli(id: AbilityId): number | null {
    if (!this.#tahtaDolu) return null;
    return yetenekYukseltmeFiyati(this.abilities.seviye(id), this.#map);
  }

  /**
   * **Yapı noktalarının hepsi dolu mu** — `M107`, yükseltmenin kapısı.
   *
   * ## Neden bir kapı gerekti
   *
   * Ölçüldü: `startGold` ile yükseltme fiyatının **ikisi de**
   * `goldMultiplier` ile ölçekleniyor, yani oranları her haritada aynı
   * (0,64) ve yükseltme turun **ilk saniyesinde** altı haritanın
   * **altısında** da alınabilir durumdaydı. Harita 1'de bu, 280 altının
   * 180'ini tek kule kurmadan harcamak demek — ve `M102`'nin ipucu tam o
   * anda “yükseltebilirsin” diye açılıyordu. Öğretici haritada, ilk
   * kuleden önce.
   *
   * `data/abilities.ts` bunun tersini yazıyordu (*“harita 1'de hiç
   * görünmüyor”*); o ölçüm dalga içindeki **atıl** altına bakıyor,
   * açılış anına bakmıyordu.
   *
   * ## Neden bu kapı
   *
   * Yeni bir sayı uydurulmadı (TIER 2): kapı **canlı tahtadan**
   * türetiliyor ve §6'nın kule yükseltmeleri için zaten kullandığı
   * gerekçenin aynısı — *“yükseltme **yer kıtlığı** yüzünden
   * mantıklıdır”*. Tahta dolmadan yükseltme, tahtayla yarışan bir
   * gider; dolduktan sonra S117'nin emmek istediği **atıl** altın.
   *
   * Ölçülen pencere (referans tahtanın noktaları doldurduğu dalga,
   * `spotsFullAtWave`): **7 · 3 · 4 · 4 · 4 · 4**. Yani harita 1'de
   * yükseltme neredeyse hiç doğmuyor — `abilities.ts`'in iddiası artık
   * **doğru**. Sayılar `M132`'den beri bağlı:
   * `systems/yetenekYukseltme.test.ts`.
   */
  get #tahtaDolu(): boolean {
    return this.#towerBySpot.size + this.#barracksBySpot.size >= this.#map.buildSpots.length;
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
      this.bus.emit('ability:cast', { id: 'meteor', hits: r.hit });
      return true;
    }

    const asker = this.abilities.castReinforcements(at, () => {
      const s = this.#soldierPool?.acquire() ?? null;
      if (s !== null) {
        s.spotIndex = -1;
        s.activate();
        this.#gecici.push(s);
      }
      return s;
    });
    /**
     * `M25` — **Takviye'nin de bir varış anı var.**
     *
     * Meteor `meteorEfekti` ile ekranı dolduruyordu, Takviye ise
     * hiçbir şey göstermiyordu: oyuncu tıklıyor, askerler bir sonraki
     * karede öylece beliriyordu. İki yeteneğin ölçülen değeri birbirine
     * yakın (`yetenekKatkisi`), ekrandaki ağırlıkları ise değildi.
     *
     * Kurulumun yukarı halkası, çünkü olan şey bir **varış**.
     */
    if (asker !== null && asker.length > 0) {
      this.#efektler?.patlat(at.x, at.y, 0, -1, 12, undefined, TAM_DAIRE);
    }
    this.bus.emit('ability:cast', { id: 'takviye', hits: asker?.length ?? 0 });
    return true;
  }

  /** Takviye'nin geçici askerleri — hiçbir kışlaya ait değiller. */
  readonly #gecici: Soldier[] = [];

  /**
   * TIER 1 kural 10 son cümlesi: "Kayıt başarısızsa oyuncuya **bir kez**
   * bildirilir." Gizli sekmede ayarlar kalıcı olmuyor; oyun çalışmaya
   * devam ediyor ama oyuncu bunu bilmeli.
   */
  /**
   * Kayıt başarısız — oyuncuya **bir kez** söyleniyor (TIER 1 kural 10).
   *
   * `M9-T03`'e kadar burada yalnız `bus.emit` vardı ve o olayın
   * **hiçbir dinleyicisi yoktu**: mekanizma tamdı, bildirim hiç
   * görünmüyordu. Artık uyarı `Overlay` sahnesinde çiziliyor —
   * gerekçesi `fx/SaveWarning.ts`'te (özet: oranın zamanı
   * ölçeklenmiyor, sahne geçişlerinde ölmüyor, en üstte).
   *
   * Olay yine yayılıyor: sesi kısmak ya da ölçüm göndermek gibi başka
   * bir tüketici eklenirse seam yerinde dursun.
   */
  #kayitUyar(): void {
    if (this.#kayitUyarildi) return;
    this.#kayitUyarildi = true;
    this.bus.emit('save:failed', { once: true });
    const overlay = this.scene.get('Overlay');
    // `Overlay` `Menu.create()`'te başlatılıyor, yani `Game`'e gelindiğinde
    // her zaman ayakta. Yine de savunmacı: doğrudan test için `Game`
    // sahnesi tek başına başlatılabiliyor (`__game.scene.start('Game')`).
    if (overlay.scene.isActive()) gosterKayitUyarisi(overlay, this.settings.effectScale);
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
      /**
       * `M9-T01` — `gameplayStart` oyuncunun **ilk etkileşiminde**.
       *
       * Poki'nin şartı açık: *"yüklemede değil"*. Harita açılışında
       * çağırmak yanlış olurdu — oyuncu daha bakıyor olabilir. Burası
       * sahnedeki ilk `pointerdown`, yani gerçek etkileşim.
       *
       * Her tıklamada çağrılıyor ve bu **kasıtlı**: yinelenen çağrıyı
       * `Portal` yutuyor (`Portal.test.ts`), yani burada bayrak tutmaya
       * gerek yok ve duraklatmadan dönüşte de doğru davranıyor.
       */
      portal.gameplayStart();

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

      // 3) `M8-T12` — **dokunmatikte sürüklemeden** toplanma noktası.
      //
      // Sürükleme 44 px'lik bir işaretçiyi parmakla yakalamayı gerektiriyor
      // ve parmak işaretçinin üstünü kapatıyor; masaüstünde doğal olan jest
      // telefonda en kırılgan etkileşim. Seçili kışlanın menzili içinde
      // **boş bir yere dokunmak** artık bayrağı oraya taşıyor. Sürükleme
      // kalkmadı — ikisi bir arada, hangisi elverişliyse.
      //
      // Sıra önemli: bir yapı noktasına dokunmak hâlâ o noktanın menüsünü
      // açıyor (`i >= 0`), yoksa kışlanın yanındaki noktalar erişilemez
      // hâle gelirdi.
      if (i < 0 && secili !== undefined) {
        const spot = this.#map.buildSpots[this.#buildMenu?.selectedSpot ?? -1];
        if (spot !== undefined) {
          const mx = nokta.x - spot.x;
          const my = nokta.y - spot.y;
          if (mx * mx + my * my <= BLOCK.rallyRange * BLOCK.rallyRange) {
            this.#setRally(this.#buildMenu?.selectedSpot ?? -1, nokta);
            return;
          }
        }
      }

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

    const fiyat = maliyet(tierAt(kule.def, hedefKademe).cost, this.#map);
    if (this.#eco?.buyAt(spotIndex, fiyat) !== true) return false;

    kule.setTier(hedefKademe);
    kule.target = null;
    /**
     * `M24` — **yükseltmenin kendi dili.** Kurmak toz halkası olarak
     * *yayılıyor*, yükseltmek dar bir sütun olarak **yükseliyor**; iki
     * eylem ekranda karışmasın.
     *
     * Bu an `M6-T10`'da atlanmıştı ve atlanması pahalıydı: yapı
     * noktaları 4. dalgada doluyor (harita 3-6, `M23` araştırması),
     * yani geç oyunda oyuncunun elinde kalan **tek** eylem yükseltmek
     * ve o eylemin hiçbir görsel karşılığı yoktu.
     */
    this.#efektler?.patlat(kule.x, kule.y, 0, -1, 18, undefined, YUKSELTME_KONISI);
    this.bus.emit('tower:upgraded', { spotIndex, tier: hedefKademe });
    this.#buildMenu?.closeMenu();
    return true;
  }

  #placeTower(spotIndex: number, def: TowerDef): boolean {
    const spot = this.#map.buildSpots[spotIndex];
    if (spot === undefined) return false;

    const fiyat = maliyet(def.tiers[0].cost, this.#map);
    // **Önce para, sonra yer.** Ters sıra olsaydı parası yetmeyen oyuncu
    // noktayı kilitler ve o nokta boşa giderdi.
    if (this.#eco?.canAfford(fiyat) !== true) return false;
    // Doluluk defteri **tek yerde**: `SpotOccupancy`. `TowerSystem` kendi
    // kontrolünü yapmıyor — aynı defteri iki yerde tutmak sessizce ayrışır.
    if (this.#occupancy?.occupy(spotIndex) !== true) return false;
    this.#eco.buyAt(spotIndex, fiyat);

    // §10 kule yerleşimi: toz halkası. (40 ms zoom M6-T10'un görsel
    // yarısı; kamera kaydırması sarsıntıyla çakışmasın diye eklenmedi.)
    this.#efektler?.patlat(spot.x, spot.y, 0, -1, 14, undefined, TAM_DAIRE);

    const kule = new Tower(this, spotIndex, spot.x, spot.y, def);
    this.#towerBySpot.set(spotIndex, kule);
    this.#towers?.add(kule);
    this.#buildMenu?.closeMenu();
    return true;
  }

  /** Kule satışı — harcanan **toplamın** %70'i (`GAME-DESIGN.md` §4.5). */
  /**
   * **Söküm geri bildirimi — `M25`.**
   *
   * Satış iki şey yapıyor: yapı gidiyor ve **altın geliyor**. İkisinin
   * de ekranda karşılığı yoktu; `GoldFlightSystem.spawn` yalnız düşman
   * ölümünde çağrılıyordu (`M6`), yani kesene giren aynı altın öldürmede
   * uçuyor, satışta sessizce beliriyordu.
   *
   * Toz **aşağı** çöküyor (kurulum yukarı yayılıyordu) — iki eylem
   * birbirinin tersi, ekranda da öyle okunsun.
   */
  #sokumGeriBildirimi(x: number, y: number, iade: number): void {
    this.#efektler?.patlat(x, y, 0, 1, 12, undefined, TAM_DAIRE);
    if (iade > 0) this.#altinUcusu?.spawn(x, y);
  }

  #sellTower(spotIndex: number): number {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined) return 0;

    const iade = this.#eco?.sellAt(spotIndex) ?? 0;
    this.#sokumGeriBildirimi(kule.x, kule.y, iade);
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
    /** `M30` — `spawnEnemy` uçanı havaya, yürüyeni yola koysun diye. */
    moverFor: (def: { flying: boolean }, spawnPoint: number) => Mover,
  ): void {
    const dev = devHooks();
    if (dev === undefined) return;

    dev.scale = () => this.clock.scale;
    dev.shutdownListeners = () => this.events.listenerCount(Phaser.Scenes.Events.SHUTDOWN);
    dev.restartGame = () => {
      this.scene.start('Game');
    };
    dev.enemyActive = () => enemyPool.activeCount;
    // `M8-T06` — dalga 11'e elle oynayarak varmak pratik değil.
    // Normal hasar yolundan geçiyor: altın, efekt, olaylar aynı.
    dev.killAllEnemies = () => {
      const hedefler = enemyPool.activeItems();
      for (const e of hedefler) this.#hasarUygula(e, e.hp + 1);
      return hedefler.length;
    };
    /**
     * **Tek düşman doğur** — `M30`.
     *
     * `killAllEnemies` ile aynı aile ve aynı gerekçe: dalga 6'ya elle
     * oynayarak varmak pratik değil. Şaman/Trol gibi geç gelen türlerin
     * **görselini** doğrulamak (halka, iyileşme işareti) tam olarak bunu
     * gerektiriyor. Normal doğum yolundan geçiyor: aynı havuz, aynı
     * `Mover`, aynı harita çarpanı — yani ekranda görülen şey gerçek.
     */
    dev.spawnEnemy = (id: string, spawnPoint = 0): boolean => {
      const def = getEnemyForMap(id as EnemyId, this.#map);
      if (def === undefined) return false;
      const e = enemyPool.acquire();
      if (e === null) return false;
      e.spawn(
        moverFor(def, spawnPoint),
        def,
        this.#map.hpMultiplier * this.settings.difficulty.hpScale,
      );
      return true;
    };
    /**
     * **Dalga/ekonomi kancaları burada da bağlanıyor** — `M56`.
     *
     * Bunlar `HudScene`'de bağlıydı ve **yalnız HUD koşarken** vardı.
     * `scene.start('Game')` ile doğrudan açılan bir turda HUD başlamıyor,
     * yani ölçüm koşusu dalga numarasını okuyamıyordu (`M55`, S129 —
     * referans tahtanın dalga dalga programı tam bu yüzden uygulanamadı).
     *
     * Anlattıkları şey **oyunun** durumu, HUD'ın değil; sahibi de burası.
     * `HudScene` aynı değerleri yeniden atıyor — zararsız, ikisi de aynı
     * genel erişimciyi okuyor.
     */
    dev.waveNumber = () => this.waveNumber;
    dev.wavePhase = () => this.wavePhase;
    dev.prepRemaining = () => this.prepRemainingSec ?? -1;
    dev.gold = () => this.gold;
    dev.startWaveEarly = () => this.startWaveEarly();
    dev.isEndlessWave = () => this.isEndlessWave;
    dev.isEndlessRun = () => this.isEndlessRun;
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
      else this.settings.set(k as "sound" | "screenShake" | "hints", v as boolean);
      this.shake.enabled = this.settings.state.screenShake;
      if (!this.shake.enabled) this.shake.reset();
      this.#tutorial?.setEnabled(this.settings.state.hints);
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

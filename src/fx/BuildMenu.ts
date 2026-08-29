import Phaser from 'phaser';
import type { EventBus } from '../systems/EventBus';
import type { EconomySystem } from '../systems/EconomySystem';
import type { Tower } from '../entities/Tower';
import type { Soldier } from '../entities/Soldier';
import type { MapDef } from '../types/map';
import type { Vec2 } from '../types/common';
import type { TargetMode, TierIndex, TowerDef } from '../types/tower';
import { TOWERS, tierAt } from '../data/towers';
import { KISLA, barracksTierAt } from '../data/barracks';
import { FRAME_CARTOUCHE } from '../data/spriteFrames';
import { measureCoverage } from '../util/coverage';
import { t } from '../util/i18n';
import type { StringKey } from '../data/strings';
import { createParchmentButton, createParchmentFrame } from './ParchmentFrame';
import type { TowerInfoPanel } from './TowerInfoPanel';

/**
 * `Y01` adım 3 — yapı/yükseltme/satış/kışla menüsü `GameScene`'den
 * buraya taşındı. En büyük ve en riskli parça (plan: "dört sistemle
 * konuşuyor").
 *
 * **Geri çağrım tabanlı** (planın kendi kararı): bu sınıf "kule kur"
 * demiyor, `actions.placeTower(spotIndex, def)` çağırıyor. Ekonomi
 * kontrolü (`canAfford`), yerleştirme (`SpotOccupancy`), gerçek kule
 * nesnesi yaratma — hepsi `GameScene`'de kalıyor. Bu sınıf yalnız:
 * hangi butonun görüneceğine karar veriyor (okuma — `economy`/
 * `towerBySpot`/`barracksBySpot` **paylaşılan referanslar**, kopya
 * değil), ve tıklamayı ilgili callback'e yönlendiriyor.
 *
 * **Kasıtlı taşınmayan:** `GameScene.#drawRally` — kışla durumuna
 * bağlı, plan "ilk turda bırakılabilir" diyor. `redrawRally` callback'i
 * bu sınıfın `#drawRally`'yi tetiklemesi gereken üç noktada (kışla
 * menüsü açılışı, herhangi bir menü kapanışı) kullanılıyor.
 *
 * **Hedefleme modu değişimi (`setTargetMode`) taşındı ve burada
 * doğrudan mutasyon yapıyor** (`kule.targetMode = ...`) — ekonomi
 * kapısı yok, salt UI tercihi, callback gerektirmiyor. `towerBySpot`
 * paylaşılan `Map` referansı olduğu için `GameScene`'in kendi okuduğu
 * `Tower` nesnesi aynı, değişiklik anında görünür.
 */

const HEDEFLEME_SECILMEMIS_ALFA = 0.8;
const MENU_PANEL_PAY = 16;
const MENU_PANEL_CORNER = 16;
const MENU_KENAR_PAY = 16;
const VERMILION = 0xb03a2e;
/** P03 brifi — kule/kışla gövdesi oyun içi gösterim boyutu (`Tower.ts`/`GameScene.ts` ile aynı). */
const TOWER_DISPLAY_SIZE = 64;

const TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'strongest', 'weakest', 'closest'];

const MODE_LABEL_KEY: Readonly<Record<TargetMode, StringKey>> = {
  first: 'modeFirst',
  last: 'modeLast',
  strongest: 'modeStrongest',
  weakest: 'modeWeakest',
  closest: 'modeClosest',
};

/** `Y03` — kule etiketleri `strings.ts`'e taşındı. */
const TOWER_LABEL_KEY: Readonly<Record<string, StringKey>> = {
  okcu: 'towerOkcu',
  top: 'towerTop',
  buyu: 'towerBuyu',
};

/** Bilinmeyen bir `id` gelirse (olmaması gerekir) ham id'ye düşer. */
function kuleAdi(id: string): string {
  const anahtar = TOWER_LABEL_KEY[id];
  return anahtar !== undefined ? t(anahtar) : id;
}

/** `GameScene.#barracksBySpot`'un değer tipi — burada tanımlı, orada içe aktarılıyor. */
export interface BarracksKayit {
  tier: 0 | 1 | 2 | 3;
  rally: Vec2;
  soldiers: Soldier[];
  marker: Phaser.GameObjects.Arc;
  govde: Phaser.GameObjects.Image;
}

export interface BuildMenuActions {
  placeTower: (spotIndex: number, def: TowerDef) => void;
  placeBarracks: (spotIndex: number) => void;
  sellTower: (spotIndex: number) => void;
  sellBarracks: (spotIndex: number) => void;
  upgradeTower: (spotIndex: number, tier: TierIndex) => void;
  upgradeBarracks: (spotIndex: number, tier: 0 | 1 | 2 | 3) => void;
  /** Kışla menüsü açılışında ve her menü kapanışında — `#drawRally` `GameScene`'de kaldı. */
  redrawRally: () => void;
}

export class BuildMenu {
  readonly #scene: Phaser.Scene;
  readonly #bus: EventBus;
  readonly #map: MapDef;
  readonly #economy: EconomySystem;
  readonly #towerBySpot: Map<number, Tower>;
  readonly #barracksBySpot: Map<number, BarracksKayit>;
  readonly #infoPanel: TowerInfoPanel;
  readonly #actions: BuildMenuActions;

  #menu?: Phaser.GameObjects.Container;
  /** Seçili kule/kışlanın üstündeki altın kartuş (P02) — yalnız menü açıkken. */
  #cartouche?: Phaser.GameObjects.Image;
  #selectedSpot = -1;

  constructor(
    scene: Phaser.Scene,
    bus: EventBus,
    map: MapDef,
    economy: EconomySystem,
    towerBySpot: Map<number, Tower>,
    barracksBySpot: Map<number, BarracksKayit>,
    infoPanel: TowerInfoPanel,
    actions: BuildMenuActions,
  ) {
    this.#scene = scene;
    this.#bus = bus;
    this.#map = map;
    this.#economy = economy;
    this.#towerBySpot = towerBySpot;
    this.#barracksBySpot = barracksBySpot;
    this.#infoPanel = infoPanel;
    this.#actions = actions;
  }

  /** `GameScene`'in rally sürükleme/işaretçi kontrolü bunu okuyor. */
  get selectedSpot(): number {
    return this.#selectedSpot;
  }

  /**
   * Kule seçim menüsü.
   *
   * `G03` — arkasında bir parşömen panel var (`S19`'un "altın kartuş
   * biçimi" borcu). Butonlar önce eklenip panel SONRA, içeriğin ölçülmüş
   * sınırlarına göre kuruluyor — `#menuArkalikEkleVeKonumla`.
   */
  openMenu(spotIndex: number): void {
    this.closeMenu();
    const spot = this.#map.buildSpots[spotIndex];
    if (spot === undefined) return;

    // Konum SONRADAN veriliyor (`#menuArkalikEkleVeKonumla`) — panel
    // boyutu içeriğe bağlı, o yüzden ekran-kenarı kenetleme butonlar
    // eklendikten sonra yapılabiliyor.
    const kap = this.#scene.add.container(0, 0);

    // Dört aile: üç kule + kışla (§4). Kışla ayrı tip olduğu için ayrı
    // buton — `TOWERS` dizisine sokmak `TowerDef` sözleşmesini bozardı.
    const toplam = TOWERS.length + 1;
    TOWERS.forEach((def, i) => {
      const bx = (i - (toplam - 1) / 2) * 84;
      const maliyet = def.tiers[0].cost;
      const alinabilir = this.#economy.canAfford(maliyet);

      this.#menuButonu(kap, bx, `${kuleAdi(def.id)} ${maliyet}`, alinabilir, () =>
        this.#actions.placeTower(spotIndex, def),
      );
    });

    const kislaMaliyet = barracksTierAt(KISLA, 0).cost;
    this.#menuButonu(
      kap,
      (TOWERS.length - (toplam - 1) / 2) * 84,
      `${t('barracks')} ${kislaMaliyet}`,
      this.#economy.canAfford(kislaMaliyet),
      () => this.#actions.placeBarracks(spotIndex),
    );

    this.#menuArkalikEkleVeKonumla(kap, spot.x, spot.y - 56);
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
  openSellMenu(spotIndex: number): void {
    // Kışla ayrı menü — kademe adları ve toplanma ipucu farklı.
    if (this.#barracksBySpot.has(spotIndex)) {
      this.#openBarracksMenu(spotIndex);
      return;
    }
    this.closeMenu();
    const spot = this.#map.buildSpots[spotIndex];
    const kule = this.#towerBySpot.get(spotIndex);
    if (spot === undefined || kule === undefined) return;

    // Konum SONRADAN veriliyor — bkz. yukarıdaki `openMenu`'nün aynı notu.
    const kap = this.#scene.add.container(0, 0);

    const iade = this.#economy.sellRefund(this.#economy.spentAt(spotIndex));

    if (kule.tierIndex === 0) {
      // T1 → T2, tek seçenek.
      const maliyet = kule.def.tiers[1].cost;
      this.#menuButonu(kap, -48, `↑ ${maliyet}`, this.#economy.canAfford(maliyet), () =>
        this.#actions.upgradeTower(spotIndex, 1),
      );
      this.#menuButonu(kap, 48, `${t('sell')} +${iade}`, true, () =>
        this.#actions.sellTower(spotIndex),
      );
    } else if (kule.tierIndex === 1) {
      // T2 → **iki dal**. `M4-T03`: dal seçimi zorunlu, kademe atlanamıyor.
      const [a, b] = kule.def.branches;
      this.#menuButonu(
        kap,
        -96,
        `${a.branchName ?? '3a'} ${a.cost}`,
        this.#economy.canAfford(a.cost),
        () => this.#actions.upgradeTower(spotIndex, 2),
      );
      this.#menuButonu(
        kap,
        0,
        `${b.branchName ?? '3b'} ${b.cost}`,
        this.#economy.canAfford(b.cost),
        () => this.#actions.upgradeTower(spotIndex, 3),
      );
      this.#menuButonu(kap, 96, `${t('sell')} +${iade}`, true, () =>
        this.#actions.sellTower(spotIndex),
      );
    } else {
      // T3 — son kademe. **Dal geri alınamıyor (S41)**; değiştirmek için
      // satmak gerekiyor ve %30 kayıp bilinçli bir bedel.
      this.#menuButonu(kap, 0, `${t('sell')} +${iade}`, true, () =>
        this.#actions.sellTower(spotIndex),
      );
    }

    // Hedefleme modu seçici (`M4-T11`) — beş mod, kule başına. Diğer
    // menülerle aynı parşömen buton; seçili olan `#menuButonu`'nun dolgu
    // rengi ayrımını taşıyamıyor (9-slice doku, düz renk değil), o yüzden
    // seçim vermilyon çerçeve + soluk-olmayan dolgu ile işaretleniyor
    // (`G03`: kontur tek başına TIER 1 kural 6'nın "yalnız renge
    // dayanmaz" ruhuna zayıf bir cevaptı — diğer butonlar hafifçe
    // soluklaştırılıp seçili olan şekilsel de ayrışıyor).
    TARGET_MODES.forEach((mod, i) => {
      const bx = (i - (TARGET_MODES.length - 1) / 2) * 50;
      const secili = kule.targetMode === mod;
      const cerceve = createParchmentButton(this.#scene, bx, 52, 46, 44, 8);
      if (!secili) cerceve.setAlpha(HEDEFLEME_SECILMEMIS_ALFA);
      const et = this.#scene.add
        .text(bx, 52, t(MODE_LABEL_KEY[mod]), {
          fontFamily: 'Spectral, serif',
          fontSize: '14px',
          color: secili ? '#B03A2E' : '#14203A',
        })
        .setOrigin(0.5);
      cerceve.on(
        Phaser.Input.Events.POINTER_DOWN,
        (_p: unknown, _x: number, _y: number, olay: Phaser.Types.Input.EventData) => {
          olay.stopPropagation();
          this.setTargetMode(spotIndex, mod);
        },
      );
      kap.add([cerceve, et]);
      if (secili) {
        kap.add(this.#scene.add.rectangle(bx, 52, 46, 44, 0, 0).setStrokeStyle(3, VERMILION));
      }
    });

    this.#menuArkalikEkleVeKonumla(kap, spot.x, spot.y - 56);
    this.#selectedSpot = spotIndex;
    this.#showCartouche(spot);
    this.#showInfoPanel(spotIndex);
    this.#menu = kap;
  }

  /**
   * Kışla menüsü: yükselt / dal seç / sat.
   *
   * Menü açıkken kışla **seçili** sayılıyor, yani toplanma noktası ve
   * menzil halkası çiziliyor ve işaretçi sürüklenebiliyor (M5-T03).
   */
  #openBarracksMenu(spotIndex: number): void {
    this.closeMenu();
    const spot = this.#map.buildSpots[spotIndex];
    const k = this.#barracksBySpot.get(spotIndex);
    if (spot === undefined || k === undefined) return;

    this.#selectedSpot = spotIndex;
    this.#showCartouche(spot);
    // Konum SONRADAN veriliyor — bkz. `openMenu`'nün aynı notu.
    const kap = this.#scene.add.container(0, 0);
    const iade = this.#economy.sellRefund(this.#economy.spentAt(spotIndex));

    if (k.tier === 0) {
      const m = barracksTierAt(KISLA, 1).cost;
      this.#menuButonu(kap, -48, `↑ ${m}`, this.#economy.canAfford(m), () =>
        this.#actions.upgradeBarracks(spotIndex, 1),
      );
      this.#menuButonu(kap, 48, `${t('sell')} +${iade}`, true, () =>
        this.#actions.sellBarracks(spotIndex),
      );
    } else if (k.tier === 1) {
      const [a, b] = KISLA.branches;
      this.#menuButonu(kap, -96, `${a.branchName} ${a.cost}`, this.#economy.canAfford(a.cost), () =>
        this.#actions.upgradeBarracks(spotIndex, 2),
      );
      this.#menuButonu(kap, 0, `${b.branchName} ${b.cost}`, this.#economy.canAfford(b.cost), () =>
        this.#actions.upgradeBarracks(spotIndex, 3),
      );
      this.#menuButonu(kap, 96, `${t('sell')} +${iade}`, true, () =>
        this.#actions.sellBarracks(spotIndex),
      );
    } else {
      this.#menuButonu(kap, 0, `${t('sell')} +${iade}`, true, () =>
        this.#actions.sellBarracks(spotIndex),
      );
    }

    this.#menuArkalikEkleVeKonumla(kap, spot.x, spot.y - 56);
    this.#menu = kap;
    this.#actions.redrawRally();
  }

  closeMenu(): void {
    this.#menu?.destroy(true);
    this.#menu = undefined;
    this.#cartouche?.destroy();
    this.#cartouche = undefined;
    this.#selectedSpot = -1;
    this.#infoPanel.hide();
    this.#actions.redrawRally();
  }

  /**
   * Hedefleme modu değişimi (`M4-T11`).
   *
   * **Mevcut hedef hemen düşürülüyor** — "bitmedi sayılır eğer: mod değişimi
   * mevcut hedefi hemen güncellemiyorsa". Kule bir sonraki ateş karesinde
   * yeni moda göre arama yapıyor.
   *
   * Ekonomi kapısı yok — doğrudan mutasyon, callback gerekmiyor
   * (bkz. sınıfın başlık yorumu). **Public** — `dev.setTargetMode`
   * (`GameScene`) da bunu tetikliyor.
   */
  setTargetMode(spotIndex: number, mod: TargetMode): void {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined) return;
    kule.targetMode = mod;
    kule.target = null;
    this.openSellMenu(spotIndex); // menüyü yeniden çiz (seçili mod değişti)
  }

  /** `M4-T10` — bilgi paneli. */
  #showInfoPanel(spotIndex: number): void {
    const kule = this.#towerBySpot.get(spotIndex);
    if (kule === undefined) return;

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
      refund: this.#economy.sellRefund(this.#economy.spentAt(spotIndex)),
      nextTier: kule.tierIndex === 0 ? kule.def.tiers[1] : undefined,
    });
  }

  /**
   * `S19` düz dikdörtgen yerine parşömen çerçeve (`ParchmentFrame`) — M6'nın
   * söz verip unuttuğu "altın kartuş" biçimi (`GAME-DESIGN.md` §2, yorum
   * hâlâ "S19 geçici" diyordu). Kartuş resmi değil: `cartouche.png`
   * `#showCartouche`'un sabit en-boylu süsü, bu buton her satırda farklı
   * genişlikte olabildiği için 9-slice `createParchmentButton` kullanıyor.
   * 88×44 — Platform dokunmatik hedef alt sınırı.
   */
  #menuButonu(
    kap: Phaser.GameObjects.Container,
    bx: number,
    metin: string,
    etkin: boolean,
    onClick: () => void,
  ): void {
    const cerceve = createParchmentButton(this.#scene, bx, 0, 88, 44, 10);
    if (!etkin) cerceve.setAlpha(0.55);

    const etiket = this.#scene.add
      .text(bx, 0, metin, {
        fontFamily: 'Spectral, serif',
        fontSize: '16px',
        color: etkin ? '#14203A' : '#3A3A3A',
      })
      .setOrigin(0.5);

    // Devre dışıyken de tıklanabilir: M6-T11 "yetersiz altınla satın alma
    // denenince" sesi (`purchase:denied`) ancak böyle tetiklenebiliyor.
    cerceve.on(
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
          this.#bus.emit('purchase:denied', {});
          return;
        }
        onClick();
      },
    );

    kap.add([cerceve, etiket]);
  }

  /**
   * `G03` — menü içeriği (butonlar, hedefleme satırı) eklendikten SONRA
   * çağrılır: içeriğin gerçek sınırlarını ölçüp arkaya bir parşömen panel
   * ekler (`addAt(..., 0)` — liste sırası çizim sırası, index 0 en altta),
   * sonra `kap`'ı panelin gerçek yarı-genişliğine göre ekran içinde
   * kalacak şekilde konumlandırır.
   *
   * Eskiden konum **önce**, sabit bir yarı-genişlik varsayımıyla
   * (`Clamp(spot.x, 160, ...)` gibi) veriliyordu — panel yoktu, yalnız
   * butonlar vardı ve varsayım kabaca doğruydu. Panel her menüde farklı
   * genişlikte (2 buton mu, 3 buton + hedefleme satırı mı), o yüzden
   * konumlandırma artık **ölçülmüş** genişliğe göre yapılıyor
   * (`OPEN-QUESTIONS.md` S19'un bıraktığı not: "Clamp payı panelin
   * yarısı olmalı, sabit değil").
   */
  #menuArkalikEkleVeKonumla(
    kap: Phaser.GameObjects.Container,
    istenenX: number,
    istenenY: number,
  ): void {
    const b = kap.getBounds();
    const yerelSol = b.left - kap.x;
    const yerelSag = b.right - kap.x;
    const yerelUst = b.top - kap.y;
    const yerelAlt = b.bottom - kap.y;

    const genislik = yerelSag - yerelSol + MENU_PANEL_PAY * 2;
    const yukseklik = yerelAlt - yerelUst + MENU_PANEL_PAY * 2;
    const merkezX = (yerelSol + yerelSag) / 2;
    const merkezY = (yerelUst + yerelAlt) / 2;

    const panel = createParchmentFrame(
      this.#scene,
      merkezX,
      merkezY,
      genislik,
      yukseklik,
      MENU_PANEL_CORNER,
    );
    kap.addAt(panel, 0);

    // Kenetleme **panelin** kenarına göre, buton sınırına göre DEĞİL —
    // panel butonlardan `MENU_PANEL_PAY` daha geniş (dolgu payı), o payı
    // hesaba katmazsa panel ekranın kenarından `MENU_PANEL_PAY` kadar
    // taşabiliyordu (canlı testte yakalandı: sağ kenardaki bir noktada
    // panelin sağı tam ekran genişliğine denk geliyordu, `MENU_KENAR_PAY`
    // payı hiç görünmüyordu).
    const panelSol = merkezX - genislik / 2;
    const panelSag = merkezX + genislik / 2;
    const panelUst = merkezY - yukseklik / 2;
    const panelAlt = merkezY + yukseklik / 2;

    const minX = MENU_KENAR_PAY - panelSol;
    const maxX = this.#scene.scale.width - MENU_KENAR_PAY - panelSag;
    const minY = MENU_KENAR_PAY - panelUst;
    const maxY = this.#scene.scale.height - MENU_KENAR_PAY - panelAlt;
    kap.setPosition(
      Phaser.Math.Clamp(istenenX, minX, maxX),
      Phaser.Math.Clamp(istenenY, minY, maxY),
    );
  }

  /** Seçili kule/kışlanın üstüne altın kartuş (P02) — `closeMenu` kaldırıyor. */
  #showCartouche(spot: Vec2): void {
    this.#cartouche?.destroy();
    this.#cartouche = this.#scene.add
      .image(spot.x, spot.y, 'atlas', FRAME_CARTOUCHE)
      .setDisplaySize(TOWER_DISPLAY_SIZE + 16, TOWER_DISPLAY_SIZE + 16);
  }
}

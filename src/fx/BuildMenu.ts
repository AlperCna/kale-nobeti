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

/**
 * Seçili olmayan hedefleme modu butonlarının alfası. Oyuncu geri
 * bildirimi (2026-09-14): seçili mod eskiden **kırmızı yazıyla**
 * işaretleniyordu ve parşömen üstünde okunmuyordu ("kırmızıyla yazan
 * yazı net değil"). Yazı artık her butonda mürekkep; seçim yalnız
 * çerçeve (vermilyon kontur) + soluklukla veriliyor. 0,8 → 0,55: fark
 * gözle seçilecek kadar büyümeli, yoksa kontur tek başına kalıyor
 * (TIER 1 kural 6, "yalnız renge dayanmaz").
 */
const HEDEFLEME_SECILMEMIS_ALFA = 0.55;
const MENU_PANEL_PAY = 16;
const MENU_PANEL_CORNER = 16;
const MENU_KENAR_PAY = 16;
/**
 * Menü her zaman kartuşun ve kule/düşman sprite'larının ÜSTÜNDE.
 * Oyuncu geri bildirimi (2026-09-14): altın kartuş "Strong" butonunu
 * örtüyordu — `BuildMenu` hiç `setDepth` çağırmıyordu, çizim sırası
 * eklenme sırasıydı. `TutorialHints` 300'de, o balon menünün de üstünde
 * kalmalı.
 */
const MENU_DERINLIK = 150;
/** HUD'un sol üst alanı (kart + telgraf satırı) + `MENU_KENAR_PAY` — bkz. `#menuArkalikEkleVeKonumla`. */
const HUD_ALANI = { sag: 224 + 16, alt: 190 + 16 } as const;

/**
 * Menü buton ölçüleri — `Y03` Adım 3'te ölçülerek ayarlandı.
 *
 * Etiketler `wordWrap` taşımıyor (tek satır olmaları gerekiyor), yani
 * genişlik metnin kendisine göre seçilmek zorunda. Üç ayrı ölçü var
 * çünkü üç satırın en uzun metni çok farklı:
 * `Sat +54` ≪ `Barracks 90` ≪ `Sharpshooter 170`.
 *
 * Aralık her zaman genişlikten **büyük**: eskiden kule satırı 88 px
 * butonu 84 px aralıkla diziyordu, yani komşu parşömenler 4 px üst üste
 * biniyordu.
 */
const BUTON_W = 100;
const BUTON_ARA = 104;
const DAL_BUTON_W = 152;
const DAL_BUTON_ARA = 156;
/** İkili satır (yükselt + sat) — tek ölçü, ortadan eşit uzaklık. */
const IKILI_OFSET = BUTON_ARA / 2;
/**
 * Hedefleme modu satırı: beş buton yan yana.
 *
 * Yazı 16 px — **Platform alt sınırı** (`CLAUDE.md`: "minimum yazı 16 px,
 * 640×360'a küçültüldüğünde okunur kalmalı"). Uzun süre 14 px'di; 640×360
 * denetiminde kod tabanındaki **tek** ihlal olarak yakalandı. Buton
 * genişliği bu yüzden etiketten türetildi: en uzun etiket 16 px'te ~48 px
 * (`Strong`), 60 px buton her iki dilde de altı şar piksel pay bırakıyor.
 *
 * Yazı boyutu **sabite alınmadı, çağrı yerinde duruyor** — bekçi k.13
 * satır içi `fontSize: '<n>px'` değişmezini tarıyor; sabite taşımak onu
 * tam da bu kurala karşı kör ederdi.
 */
const MOD_BUTON_W = 60;
const MOD_BUTON_ARA = 64;
const VERMILION = 0xb03a2e;
/**
 * Satış onayı arasındaki **en kısa** süre — `M9-T03`.
 *
 * Satış tek geri alınamaz eylem: %30 kayıpla ve doğru anda basılmışsa
 * dalgayı kaybettirir. İki dokunuş istiyoruz, ama iki dokunuş tek başına
 * yetmiyor — sinirli bir çift tıklama (~150 ms) ikisini de yutar. Bu pay
 * o kazayı kapatıyor; kasıtlı ikinci dokunuş zaten bundan yavaş.
 *
 * **Duvar saati bilerek:** bu bir arayüz zıplama koruması, oyun mantığı
 * değil. Oyun saatiyle ölçülseydi 3× hızda 300 ms gerçek hayatta 100 ms
 * olurdu — yani korumanın kendisi en çok gerektiği yerde zayıflardı.
 * (`fx/` bekçi k.8'in duvar saati kapsamında değil; `HitStop`'un
 * `realMs`'i ile aynı gerekçe.)
 */
const SAT_ONAY_EN_AZ_MS = 300;
/** P03 brifi — kule/kışla gövdesi oyun içi gösterim boyutu (`Tower.ts`/`GameScene.ts` ile aynı). */
const TOWER_DISPLAY_SIZE = 64;
/**
 * Menü panelinin alt kenarı ile yapı noktasının merkezi arasındaki
 * boşluk: kartuşun yarısı (`(TOWER_DISPLAY_SIZE + 16) / 2`) + 8 px.
 * Eskiden menü `spot.y - 56`'ya konuyor ve hedefleme satırı (+52)
 * tam noktanın üstüne düşüyordu.
 */
const MENU_NOKTA_BOSLUK = (TOWER_DISPLAY_SIZE + 16) / 2 + 8;

const TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'strongest', 'weakest', 'closest'];

const MODE_LABEL_KEY: Readonly<Record<TargetMode, StringKey>> = {
  first: 'modeFirst',
  last: 'modeLast',
  strongest: 'modeStrongest',
  weakest: 'modeWeakest',
  closest: 'modeClosest',
};

/** Seçili modun bir satırlık açıklaması — metinler `strings.ts`'te. */
const MODE_DESC_KEY: Readonly<Record<TargetMode, StringKey>> = {
  first: 'modeFirstDesc',
  last: 'modeLastDesc',
  strongest: 'modeStrongestDesc',
  weakest: 'modeWeakestDesc',
  closest: 'modeClosestDesc',
};

/** `Y03` — kule etiketleri `strings.ts`'e taşındı. */
const TOWER_LABEL_KEY: Readonly<Record<string, StringKey>> = {
  okcu: 'towerOkcu',
  top: 'towerTop',
  buyu: 'towerBuyu',
};

/** `M8-T02` — satın almadan önce rol. `data/towers.ts` `role` alanının çevrilebilir kopyası. */
const ROLE_KEY: Readonly<Record<string, StringKey>> = {
  okcu: 'roleOkcu',
  top: 'roleTop',
  buyu: 'roleBuyu',
};

/**
 * Rol şeridi: buton satırı 0'da (44 px yüksek), şerit onun altında.
 *
 * **Aynı anda yalnız BİR satır görünüyor.** İlk denemede `?` dördünü
 * birden açıyordu ve iki şey birden bozuldu: satırlar üst üste bindi
 * (sarılan metin 2 satır oluyor, sabit 20 px aralık yetmiyor) ve arka
 * paneli örtemedi — panel `getBounds()` ile **bir kez** kuruluyor, sonradan
 * büyüyemiyor. Tek satır = sabit yükseklik = panel her zaman doğru.
 */
const ROL_Y = 40;

/**
 * `M8-T02` — yapı menüsünün altındaki rol şeridi.
 *
 * Oyuncu geri bildirimi (2026-09-14): dört aile "isim + fiyat" dışında
 * hiçbir şey söylemiyordu; hangi kulenin ne işe yaradığı ancak satın alıp
 * denemekle öğreniliyordu.
 *
 * **İki giriş yolu, çünkü dokunmatikte imleç yok:**
 * - Fare: bir aile butonunun üstüne gelince o ailenin satırı görünüyor.
 * - Dokunmatik: satırın sağındaki `?` düğmesi rolleri **sırayla geziyor**
 *   (`pointerover` hiç gelmeyen cihazlar için tek erişim yolu — görevin
 *   "bitmedi sayılır eğer" maddesi tam olarak bu). Dördü birden değil:
 *   bkz. `ROL_Y`'nin notu.
 *
 * TIER 1 kural 7: her rol için ayrı statik `Text`, yalnız görünürlük
 * değişiyor. `setText` yok — `SettingsPanel`'in deseni.
 */
class RolSeridi {
  readonly #satirlar = new Map<StringKey, Phaser.GameObjects.Text>();
  readonly #kap: Phaser.GameObjects.Container;
  readonly #scene: Phaser.Scene;
  readonly #genislik: number;
  /** `?` ile gezilen sıra; `-1` = hiçbiri sabitlenmedi (fare modu). */
  #sabitIndex = -1;

  constructor(scene: Phaser.Scene, kap: Phaser.GameObjects.Container, butonSayisi: number) {
    this.#scene = scene;
    this.#kap = kap;
    this.#genislik = butonSayisi * BUTON_ARA;
  }

  /** Bir aile butonunu rol satırına bağlar ve satırı (gizli) yaratır. */
  bagla(cerceve: Phaser.GameObjects.Container, anahtar: StringKey): void {
    if (!this.#satirlar.has(anahtar)) {
      const yazi = this.#scene.add
        .text(0, ROL_Y, t(anahtar), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // bekçi k.13 — Platform alt sınırı
          color: '#14203A',
          align: 'center',
          wordWrap: { width: this.#genislik },
        })
        .setOrigin(0.5, 0)
        .setVisible(false);
      this.#satirlar.set(anahtar, yazi);
      this.#kap.add(yazi);
    }
    cerceve.on(Phaser.Input.Events.POINTER_OVER, () => this.#goster(anahtar));
    cerceve.on(Phaser.Input.Events.POINTER_OUT, () => this.#gizle());
  }

  /** Satırın sağ ucunda `?` — dokunmatik yolu. */
  soruButonuEkle(butonSayisi: number): void {
    const bx = ((butonSayisi - 1) / 2) * BUTON_ARA + BUTON_ARA * 0.72;
    const cerceve = createParchmentButton(this.#scene, bx, 0, 44, 44, 10);
    const etiket = this.#scene.add
      .text(bx, 0, t('infoToggle'), {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#14203A',
      })
      .setOrigin(0.5);
    cerceve.on(
      Phaser.Input.Events.POINTER_DOWN,
      (_p: unknown, _x: number, _y: number, olay: Phaser.Types.Input.EventData) => {
        olay.stopPropagation(); // sahne dinleyicisi menüyü kapatmasın
        // Sırayla gez, sonuncudan sonra kapat (-1).
        this.#sabitIndex = this.#sabitIndex + 1 >= this.#satirlar.size ? -1 : this.#sabitIndex + 1;
        this.#uygula();
      },
    );
    this.#kap.add([cerceve, etiket]);
  }

  #goster(anahtar: StringKey): void {
    if (this.#sabitIndex >= 0) return; // `?` ile sabitlenmişken hover karışmasın
    for (const [k, y] of this.#satirlar) y.setVisible(k === anahtar);
  }

  #gizle(): void {
    if (this.#sabitIndex >= 0) return;
    for (const y of this.#satirlar.values()) y.setVisible(false);
  }

  /** `?` seçimini uygular — tek satır görünür, hepsi aynı y'de. */
  #uygula(): void {
    let i = 0;
    for (const y of this.#satirlar.values()) {
      y.setVisible(i === this.#sabitIndex);
      i++;
    }
  }
}

/** Bilinmeyen bir `id` gelirse (olmaması gerekir) ham id'ye düşer. */
function kuleAdi(id: string): string {
  const anahtar = TOWER_LABEL_KEY[id];
  return anahtar !== undefined ? t(anahtar) : id;
}

/**
 * `Y03` Adım 3 / S76 — T3 dal adı. `branchNameKey` tipte isteğe bağlı
 * (T1/T2 kademelerinde yok), veride her dalda dolu; `yedek` yalnız tip
 * sözleşmesinin gereği.
 */
function dalAdi(anahtar: StringKey | undefined, yedek: string): string {
  return anahtar !== undefined ? t(anahtar) : yedek;
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
  /** Hedefleme satırı ekrana geldi — öğretici (`targeting:opened`) buradan. */
  targetingShown: (spotIndex: number) => void;
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
    const roller = new RolSeridi(this.#scene, kap, toplam);

    TOWERS.forEach((def, i) => {
      const bx = (i - (toplam - 1) / 2) * BUTON_ARA;
      const maliyet = def.tiers[0].cost;
      const alinabilir = this.#economy.canAfford(maliyet);

      const cerceve = this.#menuButonu(kap, bx, `${kuleAdi(def.id)} ${maliyet}`, alinabilir, () =>
        this.#actions.placeTower(spotIndex, def),
      );
      roller.bagla(cerceve, ROLE_KEY[def.id] ?? 'roleOkcu');
    });

    const kislaMaliyet = barracksTierAt(KISLA, 0).cost;
    const kislaCerceve = this.#menuButonu(
      kap,
      (TOWERS.length - (toplam - 1) / 2) * BUTON_ARA,
      `${t('barracks')} ${kislaMaliyet}`,
      this.#economy.canAfford(kislaMaliyet),
      () => this.#actions.placeBarracks(spotIndex),
    );
    roller.bagla(kislaCerceve, 'roleKisla');
    roller.soruButonuEkle(toplam);

    this.#menuArkalikEkleVeKonumla(kap, spot);
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
      this.#menuButonu(kap, -IKILI_OFSET, `↑ ${maliyet}`, this.#economy.canAfford(maliyet), () =>
        this.#actions.upgradeTower(spotIndex, 1),
      );
      this.#satButonu(kap, IKILI_OFSET, iade, () => this.#actions.sellTower(spotIndex));
    } else if (kule.tierIndex === 1) {
      // T2 → **iki dal**. `M4-T03`: dal seçimi zorunlu, kademe atlanamıyor.
      const [a, b] = kule.def.branches;
      this.#menuButonu(
        kap,
        -DAL_BUTON_ARA,
        `${dalAdi(a.branchNameKey, '3a')} ${a.cost}`,
        this.#economy.canAfford(a.cost),
        () => this.#actions.upgradeTower(spotIndex, 2),
        DAL_BUTON_W,
      );
      this.#menuButonu(
        kap,
        0,
        `${dalAdi(b.branchNameKey, '3b')} ${b.cost}`,
        this.#economy.canAfford(b.cost),
        () => this.#actions.upgradeTower(spotIndex, 3),
        DAL_BUTON_W,
      );
      this.#satButonu(
        kap,
        DAL_BUTON_ARA,
        iade,
        () => this.#actions.sellTower(spotIndex),
        DAL_BUTON_W,
      );
    } else {
      // T3 — son kademe. **Dal geri alınamıyor (S41)**; değiştirmek için
      // satmak gerekiyor ve %30 kayıp bilinçli bir bedel.
      this.#satButonu(kap, 0, iade, () => this.#actions.sellTower(spotIndex));
    }

    // Hedefleme modu seçici (`M4-T11`) — beş mod, kule başına. Diğer
    // menülerle aynı parşömen buton; seçili olan `#menuButonu`'nun dolgu
    // rengi ayrımını taşıyamıyor (9-slice doku, düz renk değil), o yüzden
    // seçim **vermilyon kontur + tam alfa**, diğerleri soluk (bkz.
    // `HEDEFLEME_SECILMEMIS_ALFA`). Yazı her butonda mürekkep — kırmızı
    // yazı parşömende okunmuyordu.
    TARGET_MODES.forEach((mod, i) => {
      const bx = (i - (TARGET_MODES.length - 1) / 2) * MOD_BUTON_ARA;
      const secili = kule.targetMode === mod;
      const cerceve = createParchmentButton(this.#scene, bx, 52, MOD_BUTON_W, 44, 8);
      if (!secili) cerceve.setAlpha(HEDEFLEME_SECILMEMIS_ALFA);
      const et = this.#scene.add
        .text(bx, 52, t(MODE_LABEL_KEY[mod]), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // bekçi k.13 — Platform alt sınırı, satır içi kalmalı
          color: '#14203A',
        })
        .setOrigin(0.5);
      if (!secili) et.setAlpha(HEDEFLEME_SECILMEMIS_ALFA);
      cerceve.on(
        Phaser.Input.Events.POINTER_DOWN,
        (_p: unknown, _x: number, _y: number, olay: Phaser.Types.Input.EventData) => {
          olay.stopPropagation();
          this.setTargetMode(spotIndex, mod);
        },
      );
      kap.add([cerceve, et]);
      if (secili) {
        // Kontur butonla aynı genişlikte — eskiden 46 sabitti, buton 60'a
        // çıkınca kontur butonun içinde dar bir dikdörtgen olarak kalmıştı.
        kap.add(
          this.#scene.add.rectangle(bx, 52, MOD_BUTON_W, 44, 0, 0).setStrokeStyle(3, VERMILION),
        );
      }
    });

    /**
     * Seçili modun açıklaması — düğme satırının altında tek satır.
     *
     * `setText` YOK: menü her gösterildiğinde baştan kuruluyor ve mod
     * değişince de yeniden kuruluyor, yani bu metin bir kez yazılıp bir
     * daha değişmiyor. TIER 1 kural 7'nin `Text` için verdiği izin tam
     * olarak bu durum; bekçi k.4 de bu dosyada `setText` aramıyor.
     *
     * Buton satırı y=52 ve 44 px yüksek (alt kenar 74); açıklama 88'de.
     */
    kap.add(
      this.#scene.add
        .text(0, 88, t(MODE_DESC_KEY[kule.targetMode]), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // bekçi k.13 — Platform alt sınırı
          color: '#8A7250',
        })
        .setOrigin(0.5),
    );

    this.#menuArkalikEkleVeKonumla(kap, spot);
    this.#selectedSpot = spotIndex;
    this.#showCartouche(spot);
    this.#showInfoPanel(spotIndex);
    this.#menu = kap;
    this.#actions.targetingShown(spotIndex);
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
      this.#menuButonu(kap, -IKILI_OFSET, `↑ ${m}`, this.#economy.canAfford(m), () =>
        this.#actions.upgradeBarracks(spotIndex, 1),
      );
      this.#satButonu(kap, IKILI_OFSET, iade, () => this.#actions.sellBarracks(spotIndex));
    } else if (k.tier === 1) {
      const [a, b] = KISLA.branches;
      this.#menuButonu(
        kap,
        -DAL_BUTON_ARA,
        `${dalAdi(a.branchNameKey, '3a')} ${a.cost}`,
        this.#economy.canAfford(a.cost),
        () => this.#actions.upgradeBarracks(spotIndex, 2),
        DAL_BUTON_W,
      );
      this.#menuButonu(
        kap,
        0,
        `${dalAdi(b.branchNameKey, '3b')} ${b.cost}`,
        this.#economy.canAfford(b.cost),
        () => this.#actions.upgradeBarracks(spotIndex, 3),
        DAL_BUTON_W,
      );
      this.#satButonu(
        kap,
        DAL_BUTON_ARA,
        iade,
        () => this.#actions.sellBarracks(spotIndex),
        DAL_BUTON_W,
      );
    } else {
      this.#satButonu(kap, 0, iade, () => this.#actions.sellBarracks(spotIndex));
    }

    this.#menuArkalikEkleVeKonumla(kap, spot);
    this.#menu = kap;
    this.#actions.redrawRally();
  }

  /**
   * Açık menüdeki sat butonlarının "onay bekliyor" durumunu geri alan
   * geri çağrılar. Menü her açılışta baştan kuruluyor, yani bu dizi de
   * her seferinde temizleniyor (`closeMenu`).
   */
  readonly #satSifirlayicilar: (() => void)[] = [];

  #satOnaylariniSifirla(): void {
    for (const f of this.#satSifirlayicilar) f();
  }

  closeMenu(): void {
    this.#satSifirlayicilar.length = 0;
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
      // T2'de sıradaki adım tek kademe değil **dal seçimi**; panel
      // "Son kademe" yazmamalı (bkz. `TowerInfoLabels.#dalSecimi`).
      branchChoice: kule.tierIndex === 1,
      // Panel bu konuma göre karşı köşeye geçiyor (`TowerInfoPanel.show`).
      spot: this.#map.buildSpots[spotIndex] ?? { x: 0, y: 0 },
    });
  }

  /**
   * `S19` düz dikdörtgen yerine parşömen çerçeve (`ParchmentFrame`) — M6'nın
   * söz verip unuttuğu "altın kartuş" biçimi (`GAME-DESIGN.md` §2, yorum
   * hâlâ "S19 geçici" diyordu). Kartuş resmi değil: `cartouche.png`
   * `#showCartouche`'un sabit en-boylu süsü, bu buton her satırda farklı
   * genişlikte olabildiği için 9-slice `createParchmentButton` kullanıyor.
   * Yükseklik 44 — Platform dokunmatik hedef alt sınırı.
   *
   * `genislik` satır başına değişiyor (`BUTON_W` / `DAL_BUTON_W`): dal
   * adları diğer etiketlerden belirgin biçimde uzun (`Keskin Nişancı 170`,
   * `Sharpshooter 170`) ve `Text` burada sarılmıyor — dar buton metni
   * parşömenin dışına taşırır.
   */
  #menuButonu(
    kap: Phaser.GameObjects.Container,
    bx: number,
    metin: string,
    etkin: boolean,
    onClick: () => void,
    genislik: number = BUTON_W,
  ): Phaser.GameObjects.Container {
    const cerceve = createParchmentButton(this.#scene, bx, 0, genislik, 44, 10);
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
        // Menüdeki başka bir butona basmak bekleyen satış onayını
        // düşürüyor: "sat"a dokunup fikrini değiştirip "yükselt"e
        // basan oyuncu, menü yeniden kurulmasa bile hazır bir sat
        // butonu bırakmamalı.
        this.#satOnaylariniSifirla();
        onClick();
      },
    );

    kap.add([cerceve, etiket]);
    return cerceve;
  }

  /**
   * Sat butonu — **iki dokunuş** (`M9-T03`).
   *
   * `research/05` küratör notu: *"cila ve his, içerik miktarından
   * önemli."* Satış oyunun tek geri alınamaz eylemi; tek dokunuşta
   * %30 kayıpla gidiyor ve yanlış anda dalgayı kaybettiriyor. Üstelik
   * buton, yükseltme butonunun **104 px yanında** — aynı satırda, aynı
   * boyda, aynı parşömende.
   *
   * ## Neden basılı tutma değil
   *
   * Dokunmatikte basılı tutma tarayıcının kendi bağlam menüsünü ve metin
   * seçimini tetikliyor, ayrıca hiçbir yerde görünmüyor — oyuncu
   * keşfetmiyor. İki dokunuş kendini **yazıyla** anlatıyor: "Sat +49"
   * → "Onayla +49".
   *
   * ## k.6: renk tek başına taşımıyor
   *
   * Onay durumunda hem **yazı değişiyor** hem vermilyon kontur çıkıyor.
   * Kontur tek başına bırakılsaydı renk körü bir oyuncu için buton
   * değişmemiş görünürdü. Yazı mürekkep kalıyor: kırmızı yazı parşömende
   * okunmuyor (hedefleme satırının aynı notu).
   *
   * ## k.4: `setText` yok
   *
   * Bu dosya `Text` üretiyor, yani bekçi k.4 burada `setText`'i
   * yasaklıyor. İki etiket de baştan kuruluyor, geçiş `setVisible` ile.
   */
  #satButonu(
    kap: Phaser.GameObjects.Container,
    bx: number,
    iade: number,
    onSell: () => void,
    genislik: number = BUTON_W,
  ): void {
    const cerceve = createParchmentButton(this.#scene, bx, 0, genislik, 44, 10);
    const yaz = (metin: string): Phaser.GameObjects.Text =>
      this.#scene.add
        .text(bx, 0, metin, {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // bekçi k.13 — Platform alt sınırı
          color: '#14203A',
        })
        .setOrigin(0.5);

    const normal = yaz(`${t('sell')} +${iade}`);
    const onay = yaz(`${t('sellConfirm')} +${iade}`).setVisible(false);
    const kontur = this.#scene.add
      .rectangle(bx, 0, genislik, 44, 0, 0)
      .setStrokeStyle(3, VERMILION)
      .setVisible(false);

    /** `null` = onay beklemiyor. Sayı = ilk dokunuşun duvar saati anı. */
    let bekleyenAn: number | null = null;

    const sifirla = (): void => {
      bekleyenAn = null;
      normal.setVisible(true);
      onay.setVisible(false);
      kontur.setVisible(false);
    };
    this.#satSifirlayicilar.push(sifirla);

    cerceve.on(
      Phaser.Input.Events.POINTER_DOWN,
      (
        _p: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        olay: Phaser.Types.Input.EventData,
      ) => {
        olay.stopPropagation();
        if (bekleyenAn === null) {
          // Aynı menüde başka bir sat butonu hazırdaysa o düşüyor:
          // iki buton aynı anda "onay bekliyor" görünemez.
          this.#satOnaylariniSifirla();
          bekleyenAn = performance.now();
          normal.setVisible(false);
          onay.setVisible(true);
          kontur.setVisible(true);
          return;
        }
        // Çift tıklama payı. Erken gelen ikinci dokunuş **yutuluyor**,
        // onayı bozmuyor: oyuncu bir daha dokunabilsin.
        if (performance.now() - bekleyenAn < SAT_ONAY_EN_AZ_MS) return;
        onSell();
      },
    );

    kap.add([cerceve, normal, onay, kontur]);
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
  #menuArkalikEkleVeKonumla(kap: Phaser.GameObjects.Container, spot: Vec2): void {
    kap.setDepth(MENU_DERINLIK);
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

    // Panelin ALT kenarı noktanın üstünde biter — hedefleme satırı da
    // dahil hiçbir buton kartuşun/kulenin üstüne düşmez. Üste sığmıyorsa
    // (ekranın üst kenarındaki noktalar) aynı boşlukla noktanın ALTINA
    // çevriliyor; kenetlemeyle noktanın üstüne bastırmak eski hatayı
    // geri getirirdi.
    let istenenY = spot.y - MENU_NOKTA_BOSLUK - panelAlt;
    if (istenenY < minY) istenenY = spot.y + MENU_NOKTA_BOSLUK - panelUst;

    let istenenX = Phaser.Math.Clamp(spot.x, minX, maxX);
    const y = Phaser.Math.Clamp(istenenY, minY, maxY);
    // M8-T01 — HUD kartı ve dalga telgrafı sol üstte (`HudScene`: kart
    // 8..224 × 8..136, telgraf satırı 172±17). Menü o dikdörtgene giriyorsa
    // sağa kaydır: harita 1 nokta 1 (300,65) aşağı çevrilince kartın
    // üstüne düşüyordu. Sabitler `HudScene`'in yerleşimini yansıtıyor —
    // orası değişirse burası da değişmeli (yorumla bağlı, kodla değil).
    if (y + panelUst < HUD_ALANI.alt && istenenX + panelSol < HUD_ALANI.sag) {
      istenenX = Math.min(HUD_ALANI.sag - panelSol, maxX);
    }

    kap.setPosition(istenenX, y);
  }

  /** Seçili kule/kışlanın üstüne altın kartuş (P02) — `closeMenu` kaldırıyor. */
  #showCartouche(spot: Vec2): void {
    this.#cartouche?.destroy();
    this.#cartouche = this.#scene.add
      .image(spot.x, spot.y, 'atlas', FRAME_CARTOUCHE)
      .setDisplaySize(TOWER_DISPLAY_SIZE + 16, TOWER_DISPLAY_SIZE + 16);
  }
}

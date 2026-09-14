import Phaser from 'phaser';
import type { EnemyDef } from '../types/enemy';
import { PANEL_W, PANEL_H, PANEL_IC_PAY, panelKonumu } from '../data/panelLayout';
import type { TargetMode, TowerDef, TowerTier } from '../types/tower';
import { NUMBER_FONT_KEY } from './numberFont';
import { effectiveDps } from '../systems/balanceChecks';
import { applyDamage } from '../systems/combat';
import { enemyFrameKey } from '../data/spriteFrames';
import { createParchmentFrame } from './ParchmentFrame';
import { TowerInfoLabels, SATIRLAR } from './TowerInfoLabels';

/**
 * Kule bilgi paneli — `GAME-DESIGN.md` §11.
 *
 * "Bilgi eksikliği türün 1 numaralı şikâyeti." §11'in yedi göstergesi:
 * ham hasar + atış hızı · hasar tipi · **seçili düşmana karşı etkin
 * DPS** · menzil + kapsanan yol · uçana vurur/vurmaz · yükseltme farkı ·
 * satış iadesi.
 *
 * **Üçüncüsü en kritik** (§11): "Ham DPS yanıltıcı: okçu T2, boss'a
 * 1.95 DPS." Panelin altında düşman ikonu şeridi; üstüne gelince o düşmana
 * karşı etkin DPS yazılıyor. Hesap `applyDamage` üzerinden — yeni matematik
 * yok.
 *
 * ## Etiketler — oyuncu geri bildirimi (2026-09-14)
 *
 * Panel bir zamanlar yalnız sayı gösteriyordu; oyuncu için "hiçbir şey
 * ifade etmiyordu". İki hata birden vardı:
 * 1. Hiçbir göstergenin adı yoktu (bu dosyanın eski yorumu "etiketler
 *    `HudScene`'de" diyordu — yanlıştı, `HudScene` bu panel için etiket
 *    çizmiyor).
 * 2. İlk satır `"16x1.0=16.0"` yazıyordu ama sayı fontunda **`x` ve `=`
 *    yok** (`%+,-./0-9×›`); glifler kaybolup sayılar birbirine yapışıyordu
 *    ("61.16.6").
 * Etiketler `TowerInfoLabels`'ta (ayrı dosya — bekçi k.4: `setText` çağıran
 * dosya `Text` üretmez), değerler yalnız fontun bildiği karakterlerle.
 *
 * TIER 1 kural 7: değişen **sayılar** `BitmapText`. Bu dosya `Text` üretmiyor.
 *
 * ## Zemin: koyu, ama çerçeve parşömen — `G04`
 *
 * Parşömen zemin eylem yüzeylerinde (buton, menü, ayar), koyu zemin yoğun
 * bilgi yüzeylerinde (bu panel) — çerçeve her ikisinde de parşömen
 * (`createParchmentFrame`'in `skipMiddle=true`'su tam bu yüzden var).
 */

const GOLD = 0xd4a032;
const PARCHMENT = 0xe4d3a8;
const INK = 0x14203a;
const VERMILION = 0xb03a2e;

const SOL_PAY = PANEL_IC_PAY;
const ICON = 20;
/** Değer kolonunun sağ kenarı — sayılar sağa dayalı. */
const W = PANEL_W;
/** Son satır (ikon şeridi, y=236) + yarı ikon + alt band. */
const H = PANEL_H;

export interface TowerInfoState {
  readonly def: TowerDef;
  readonly tier: TowerTier;
  readonly tierIndex: 0 | 1 | 2 | 3;
  readonly targetMode: TargetMode;
  /** O yapı noktasının kapsadığı yol. Birim: px. */
  readonly coveredPx: number;
  /** Harcanan toplamın %70'i. */
  readonly refund: number;
  /** Bir sonraki kademe (varsa) — yükseltme farkı için. */
  readonly nextTier?: TowerTier;
  /** Seçili yapı noktasının konumu — panel karşı köşeye geçsin diye. */
  readonly spot: { readonly x: number; readonly y: number };
}

export class TowerInfoPanel {
  /** Panelin dış ölçüsü — `GameScene` konumu bundan türetiyor. */
  static readonly W = W;
  static readonly H = H;

  readonly #kap: Phaser.GameObjects.Container;
  readonly #scene: Phaser.Scene;
  readonly #roster: readonly EnemyDef[];
  readonly #etiketler: TowerInfoLabels;

  /** Değişen sayılar — hepsi `BitmapText`. */
  readonly #hasar: Phaser.GameObjects.BitmapText;
  readonly #atisHizi: Phaser.GameObjects.BitmapText;
  readonly #menzil: Phaser.GameObjects.BitmapText;
  readonly #kapsama: Phaser.GameObjects.BitmapText;
  readonly #iade: Phaser.GameObjects.BitmapText;
  readonly #etkinDps: Phaser.GameObjects.BitmapText;
  readonly #yukseltme: Phaser.GameObjects.BitmapText;

  /** Seçili düşman halkası — sprite'ın kendisi değil, çevresindeki çerçeve. */
  readonly #ikonlar: Phaser.GameObjects.Rectangle[] = [];

  #state: TowerInfoState | null = null;
  #seciliDusman = 0;

  /** Haritanın bütün yollarının toplam uzunluğu — kapsama yüzdesi için. */
  readonly #toplamYol: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    roster: readonly EnemyDef[],
    toplamYol: number,
  ) {
    this.#scene = scene;
    this.#roster = roster;
    this.#toplamYol = Math.max(1, toplamYol);
    this.#kap = scene.add.container(x, y).setVisible(false);

    const arka = scene.add.rectangle(0, 0, W, H, INK, 0.9).setOrigin(0);
    const cerceve = createParchmentFrame(scene, W / 2, H / 2, W, H, 16, true);
    this.#kap.add([arka, cerceve]);

    this.#etiketler = new TowerInfoLabels(scene, SOL_PAY, W / 2 + 8);
    this.#kap.add(this.#etiketler.nesneler);

    // Sayılar sağa dayalı: etiket solda, değer sağda — kolon hizası.
    const sayi = (dy: number, renk: number, olcek = 0.7): Phaser.GameObjects.BitmapText => {
      const n = scene.add
        .bitmapText(W - SOL_PAY, dy, NUMBER_FONT_KEY, '')
        .setOrigin(1, 0)
        .setScale(olcek)
        .setTint(renk);
      this.#kap.add(n);
      return n;
    };

    this.#hasar = sayi(SATIRLAR.damage, PARCHMENT);
    this.#atisHizi = sayi(SATIRLAR.rate, PARCHMENT);
    this.#menzil = sayi(SATIRLAR.range, PARCHMENT);
    this.#kapsama = sayi(SATIRLAR.coverage, GOLD);
    this.#yukseltme = sayi(SATIRLAR.upgrade, PARCHMENT);
    this.#iade = sayi(SATIRLAR.refund, GOLD);
    /**
     * §11'in en kritik sayısı büyük — ama **altın, vermilyon değil.**
     *
     * Oyuncu geri bildirimi: "kırmızıyla yazan yazı tam net değil".
     * Haklıydı ve sebebi palet çelişkisi: `GAME-DESIGN.md` §2
     * vermilyonu **"düşman, tehlike, can kaybı"** olarak tanımlıyor.
     * Oyuncunun kendi hasarını tehlike rengiyle yazmak, paletin her
     * yerde öğrettiği anlamı tam tersine çeviriyordu. Altın varak
     * paletin "vurgu/değer" rengi ve panelin öbür iki iyi sayısı
     * (kapsama, satış iadesi) zaten altın.
     */
    this.#etkinDps = sayi(SATIRLAR.dps - 6, GOLD, 0.9);

    // Düşman ikonu şeridi — **S42: o haritanın kadrosu.** Hepsini
    // listelemek oyuncuya henüz görmediği düşmanları gösterirdi.
    roster.forEach((e, i) => {
      const bx = SOL_PAY + ICON / 2 + i * 30;
      const halka = scene.add
        .rectangle(bx, SATIRLAR.ikonlar, ICON + 6, ICON + 6, 0x000000, 0)
        .setStrokeStyle(2, GOLD);
      const ikon = scene.add
        .image(bx, SATIRLAR.ikonlar, 'atlas', enemyFrameKey(e.id))
        .setDisplaySize(ICON, ICON)
        .setInteractive({ useHandCursor: true });
      ikon.on(Phaser.Input.Events.POINTER_OVER, () => {
        this.#seciliDusman = i;
        this.#dpsYaz();
      });
      this.#ikonlar.push(halka);
      this.#kap.add([halka, ikon]);
    });
  }

  hide(): void {
    this.#kap.setVisible(false);
    this.#state = null;
  }

  /**
   * Panelin iki yerleşimi — **seçili kulenin karşı tarafı**.
   *
   * Oyuncu geri bildirimi: *"şuradaki konum çok iyi değil"*, *"şuradaki
   * yazılar da tam gözükmüyor"*. Panel sabit sağ-alttaydı (`998,440 –
   * 1268,708`) ve %90 opak. Ölçüldü: harita 1'in **7 numaralı yapı
   * noktası `(1120, 485)` tamamen panelin altında**, 6 numara
   * `(950, 485)` kenarında. Panel açıkken o nokta ne görünüyor ne
   * tıklanabiliyor — ve daha kötüsü, sağ alttaki bir kuleyi seçtiğinde
   * panel **incelediğin kuleyi** örtüyordu.
   *
   * Aynı sebeple yükseltme menüsüyle de çakışıyordu: menü kulenin
   * yanında açılıyor, panel sabit duruyordu.
   *
   * Sabit bir "boş köşe" yok — panel 270×268, yani ekranın %8'i; beş
   * haritanın hiçbir köşesi bu boyutta serbest değil (`M8-B01`'deki
   * tarama bunu zaten göstermişti). O yüzden çözüm sabit yer değil
   * **kaçınma**: kule sağdaysa panel sola, soldaysa sağa.
   *
   * Sol yerleşim yetenek düğmelerinin (`28,622 – 170,707`) **üstünde**
   * duruyor; sağ yerleşim eskisiyle aynı.
   */
  show(s: TowerInfoState): void {
    this.#state = s;
    // Konum ve eşik `data/panelLayout.ts`'te (TIER 1 kural 1); orası
    // Phaser'a dokunmuyor, yani değişmez kural `node`'da test edilebiliyor.
    const yer = panelKonumu(s.spot.x);
    this.#kap.setPosition(yer.x, yer.y);
    this.#kap.setVisible(true);

    // §11: ham hasar + atış hızı. Yalnız fontun bildiği karakterler:
    // rakam, `.`, `+`, `-`, `›`, `×`.
    this.#hasar.setText(String(s.tier.damage));
    this.#atisHizi.setText(s.tier.fireRate.toFixed(1));
    this.#menzil.setText(String(s.tier.range));
    // Ham piksel oyuncuya hiçbir şey söylemiyordu ("294" neyin 294'ü?).
    // Yolun **payı** olarak yazılıyor: kıyas ölçüsü kendi içinde.
    this.#kapsama.setText(`${Math.round((s.coveredPx / this.#toplamYol) * 100)}%`);
    this.#iade.setText(`+${s.refund}`);

    // §11: yükseltme farkı (öncesi › sonrası, DPS). §6 yükseltmenin altın
    // başına verimsiz olduğunu söylüyor ve panel bunu **gizlemiyor**.
    const dps = s.tier.damage * s.tier.fireRate;
    const sonKademe = s.nextTier === undefined;
    this.#yukseltme.setVisible(!sonKademe);
    this.#etiketler.setMaxTier(sonKademe);
    if (s.nextTier !== undefined) {
      const yeni = s.nextTier.damage * s.nextTier.fireRate;
      this.#yukseltme.setText(`${dps.toFixed(1)}›${yeni.toFixed(1)}`);
    }

    this.#etiketler.setType(s.def.damageType === 'magic');
    this.#etiketler.setAir(s.tier.airMultiplier > 0);

    this.#dpsYaz();
  }

  /** Seçili düşmana karşı **etkin** DPS — §11'in en kritik satırı. */
  #dpsYaz(): void {
    const s = this.#state;
    const dusman = this.#roster[this.#seciliDusman];
    if (s === null || dusman === undefined) return;

    this.#ikonlar.forEach((ik, i) =>
      ik.setStrokeStyle(2, i === this.#seciliDusman ? 0xffffff : GOLD),
    );

    this.#etkinDps.setText(this.#etkinDpsHesapla(s, dusman).toFixed(2));
  }

  /**
   * `applyDamage` üzerinden — **yeni matematik yok** (§11).
   *
   * `balanceChecks.effectiveDps` T1/T2 için yazılmıştı; T3 dallarını da
   * kapsaması gerektiği için burada kademe doğrudan veriliyor.
   */
  #etkinDpsHesapla(s: TowerInfoState, e: EnemyDef): number {
    const ucanCarpani = e.flying ? s.tier.airMultiplier : 1;
    if (ucanCarpani === 0) return 0;
    const vurus = applyDamage(s.tier.damage * ucanCarpani, s.def.damageType, e);
    return vurus.dealt * s.tier.fireRate;
  }

  /** Test kancası — panel açıkken bir düşmana karşı DPS. */
  dpsFor(enemyId: string): number {
    const s = this.#state;
    const e = this.#roster.find((r) => r.id === enemyId);
    if (s === null || e === undefined) return -1;
    return this.#etkinDpsHesapla(s, e);
  }

  get visible(): boolean {
    return this.#kap.visible;
  }
}

/** `effectiveDps` yeniden kullanılabilir olsun diye dışarı veriliyor. */
export { effectiveDps };

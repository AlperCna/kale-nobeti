import Phaser from 'phaser';
import type { EnemyDef } from '../types/enemy';
import type { TargetMode, TowerDef, TowerTier } from '../types/tower';
import { NUMBER_FONT_KEY } from './numberFont';
import { effectiveDps } from '../systems/balanceChecks';
import { applyDamage } from '../systems/combat';
import { enemyFrameKey } from '../data/spriteFrames';

/**
 * Kule bilgi paneli — `GAME-DESIGN.md` §11.
 *
 * "Bilgi eksikliği türün 1 numaralı şikâyeti." §11'in yedi göstergesi:
 * ham hasar + atış hızı · hasar tipi rozeti · **seçili düşmana karşı etkin
 * DPS** · menzil + kapsanan yol · uçana vurur/vurmaz · yükseltme farkı ·
 * satış iadesi.
 *
 * **Üçüncüsü en kritik** (§11): "Ham DPS yanıltıcı: okçu T2, boss'a
 * 1.95 DPS." Panelin altında düşman ikonu şeridi; üstüne gelince o düşmana
 * karşı etkin DPS yazılıyor. Hesap `applyDamage` üzerinden — yeni matematik
 * yok.
 *
 * TIER 1 kural 7: değişen **sayılar** `BitmapText`. Bu dosya `Text`
 * üretmiyor; sabit etiketler `HudScene`'de.
 */

const GOLD = 0xd4a032;
const PARCHMENT = 0xe4d3a8;
const INK = 0x14203a;
const VERMILION = 0xb03a2e;
const LAPIS = 0x3e5ca8;

const W = 250;
const H = 210;
const ICON = 20;

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
}

export class TowerInfoPanel {
  readonly #kap: Phaser.GameObjects.Container;
  readonly #scene: Phaser.Scene;
  readonly #roster: readonly EnemyDef[];

  /** Değişen sayılar — hepsi `BitmapText`. */
  readonly #hasar: Phaser.GameObjects.BitmapText;
  readonly #menzil: Phaser.GameObjects.BitmapText;
  readonly #kapsama: Phaser.GameObjects.BitmapText;
  readonly #iade: Phaser.GameObjects.BitmapText;
  readonly #etkinDps: Phaser.GameObjects.BitmapText;
  readonly #yukseltme: Phaser.GameObjects.BitmapText;

  #tipRozeti: Phaser.GameObjects.Rectangle;
  #ucanIkon: Phaser.GameObjects.Rectangle;
  #ucanCizik: Phaser.GameObjects.Rectangle;
  /** Seçili düşman halkası — sprite'ın kendisi değil, çevresindeki çerçeve. */
  readonly #ikonlar: Phaser.GameObjects.Rectangle[] = [];

  #state: TowerInfoState | null = null;
  #seciliDusman = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, roster: readonly EnemyDef[]) {
    this.#scene = scene;
    this.#roster = roster;
    this.#kap = scene.add.container(x, y).setVisible(false);

    const arka = scene.add.rectangle(0, 0, W, H, INK, 0.9).setOrigin(0).setStrokeStyle(2, GOLD);
    this.#kap.add(arka);

    const sayi = (dx: number, dy: number, renk: number): Phaser.GameObjects.BitmapText => {
      const t = scene.add.bitmapText(dx, dy, NUMBER_FONT_KEY, '').setScale(0.7).setTint(renk);
      this.#kap.add(t);
      return t;
    };

    this.#hasar = sayi(12, 10, PARCHMENT);
    this.#menzil = sayi(12, 36, PARCHMENT);
    this.#kapsama = sayi(12, 62, GOLD);
    this.#iade = sayi(12, 88, GOLD);
    this.#yukseltme = sayi(12, 114, PARCHMENT);
    this.#etkinDps = scene.add
      .bitmapText(W - 12, 140, NUMBER_FONT_KEY, '')
      .setOrigin(1, 0)
      .setTint(VERMILION);
    this.#kap.add(this.#etkinDps);

    // Hasar tipi rozeti — renk + konum, yazı yok (§11 "rozet").
    this.#tipRozeti = scene.add.rectangle(W - 26, 16, 14, 14, LAPIS).setStrokeStyle(1, GOLD);
    // Uçana vurur/vurmaz: kare + üstü çizili.
    this.#ucanIkon = scene.add.rectangle(W - 52, 16, 14, 14, PARCHMENT).setStrokeStyle(1, GOLD);
    this.#ucanCizik = scene.add.rectangle(W - 52, 16, 20, 3, VERMILION).setVisible(false);
    this.#kap.add([this.#tipRozeti, this.#ucanIkon, this.#ucanCizik]);

    // Düşman ikonu şeridi — **S42: o haritanın kadrosu.** Hepsini
    // listelemek oyuncuya henüz görmediği düşmanları gösterirdi.
    roster.forEach((e, i) => {
      const bx = 16 + i * 30;
      const halka = scene.add
        .rectangle(bx, 168, ICON + 6, ICON + 6, 0x000000, 0)
        .setStrokeStyle(2, GOLD);
      const ikon = scene.add
        .image(bx, 168, 'atlas', enemyFrameKey(e.id))
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

  show(s: TowerInfoState): void {
    this.#state = s;
    this.#kap.setVisible(true);

    // §11: ham hasar + atış hızı, ve DPS.
    const dps = s.tier.damage * s.tier.fireRate;
    this.#hasar.setText(`${s.tier.damage}x${s.tier.fireRate}=${dps.toFixed(1)}`);
    this.#menzil.setText(String(s.tier.range));
    this.#kapsama.setText(String(Math.round(s.coveredPx)));
    this.#iade.setText(`+${s.refund}`);

    // §11: yükseltme farkı (öncesi → sonrası). §6 yükseltmenin altın
    // başına verimsiz olduğunu söylüyor ve panel bunu **gizlemiyor**.
    if (s.nextTier === undefined) {
      this.#yukseltme.setText('-');
    } else {
      const yeni = s.nextTier.damage * s.nextTier.fireRate;
      this.#yukseltme.setText(`${dps.toFixed(1)}-${yeni.toFixed(1)}`);
    }

    // Hasar tipi rozeti: lapis = büyü, vermilyon = fiziksel.
    this.#tipRozeti.setFillStyle(s.def.damageType === 'magic' ? LAPIS : VERMILION);
    // Uçana vurur mu.
    this.#ucanCizik.setVisible(s.tier.airMultiplier === 0);
    this.#ucanIkon.setFillStyle(s.tier.airMultiplier === 0 ? 0x6b6558 : PARCHMENT);

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

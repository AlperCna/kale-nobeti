import Phaser from 'phaser';
import { t } from '../util/i18n';

/**
 * Kule bilgi panelinin **statik etiketleri** — `TowerInfoPanel`'den ayrı
 * dosya, bekçi k.4 yüzünden: panel sayılarını `BitmapText.setText` ile
 * yazıyor ve kural "`setText` çağıran dosya `Text` üretmez" diyor
 * (`HudReadout` / `HudScene` ayrımıyla aynı gerekçe).
 *
 * Buradaki hiçbir metin `setText` görmüyor. Kuleye göre değişen iki
 * bilgi (hasar tipi, uçana vurur mu) `SettingsPanel`'in deseniyle
 * çözülüyor: her değer için ayrı bir `Text`, yalnız görünürlük değişiyor
 * (TIER 1 kural 7).
 */

const PARCHMENT = '#E4D3A8';
const LAPIS = '#6F8FD8';
const VERMILION = '#D9603F';

const STIL = { fontFamily: 'Spectral, serif', fontSize: '16px', color: PARCHMENT } as const;

/**
 * Sabit satırların y'si — `TowerInfoPanel`'deki sayı satırlarıyla aynı.
 * İlk satır 22'den başlıyor: parşömen çerçevenin üst bandı 16 px ve
 * parşömen renkli yazı o bandın üstünde görünmüyor (eski panelin ilk
 * satırı 10'daydı ve tam bu yüzden bandın içinde kayboluyordu).
 */
export const SATIRLAR = {
  damage: 22,
  rate: 48,
  range: 74,
  coverage: 100,
  upgrade: 126,
  refund: 152,
  tip: 178,
  dps: 204,
  ikonlar: 236,
} as const;

export class TowerInfoLabels {
  readonly nesneler: Phaser.GameObjects.Text[] = [];
  readonly #fiziksel: Phaser.GameObjects.Text;
  readonly #buyu: Phaser.GameObjects.Text;
  readonly #ucanaVurur: Phaser.GameObjects.Text;
  readonly #ucanaVurmaz: Phaser.GameObjects.Text;
  readonly #sonKademe: Phaser.GameObjects.Text;
  readonly #dalSecimi: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, solPay: number, tipSutunX: number) {
    const etiket = (y: number, metin: string, x = solPay, renk: string = PARCHMENT) => {
      const n = scene.add.text(x, y, metin, { ...STIL, color: renk }).setOrigin(0, 0);
      this.nesneler.push(n);
      return n;
    };

    etiket(SATIRLAR.damage, t('infoDamage'));
    etiket(SATIRLAR.rate, t('infoRate'));
    etiket(SATIRLAR.range, t('infoRange'));
    etiket(SATIRLAR.coverage, t('infoCoverage'));
    etiket(SATIRLAR.upgrade, t('infoUpgrade'));
    etiket(SATIRLAR.refund, t('infoRefund'));
    etiket(SATIRLAR.dps, t('infoDpsVs'));

    // Renk kodu korunuyor (lapis = büyü, vermilyon = fiziksel) ama artık
    // kelimeyle birlikte — TIER 1 kural 6, "yalnız renge dayanmaz".
    this.#fiziksel = etiket(SATIRLAR.tip, t('infoPhysical'), solPay, VERMILION);
    this.#buyu = etiket(SATIRLAR.tip, t('infoMagic'), solPay, LAPIS);
    this.#ucanaVurur = etiket(SATIRLAR.tip, t('infoHitsAir'), tipSutunX);
    this.#ucanaVurmaz = etiket(SATIRLAR.tip, t('infoNoAir'), tipSutunX, '#9A948A');

    // Son kademede yükseltme satırı eskiden yalnız `-` basıyordu; tire
    // "veri yok" mu "yükseltme yok" mu belli değildi (oyuncu geri
    // bildirimi). Sayı alanının yerine geçen, bir kez yazılan bir etiket:
    // TIER 1 kural 7'ye uyuyor, `setText` yok — görünürlük açılıp
    // kapanıyor, `Fiziksel`/`Büyü` çiftiyle aynı desen.
    this.#sonKademe = etiket(SATIRLAR.upgrade, t('infoMaxTier'), tipSutunX, '#9A948A');
    this.#sonKademe.setVisible(false);

    /**
     * **T2'de yükseltme satırı yalan söylüyordu** (`M9-T03`'te yakalandı).
     *
     * `BuildMenu` `nextTier`'i yalnız T1 için veriyordu, yani T2 bir kule
     * seçilince panel "Son kademe" yazıyordu — oysa menünün kendisi tam
     * o sırada **iki T3 dalı** gösteriyor. Oyunun en önemli kararının
     * üstüne "burası son" yazmak, ölçülebilir bir yanlış bilgi.
     *
     * Sayı yerine etiket, çünkü iki dalın DPS'i farklı (Keskin Nişancı
     * 15.6, Kundakçı 12.6 + yanma) ve ikisini `13.0›12.6-15.6` diye tek
     * satıra sığdırmak hem sütunu taşırıyor hem yanmayı saymadığı için
     * yine yanıltıyor. Dal adları ve bedelleri zaten menüde, hemen
     * panelin yanında.
     */
    this.#dalSecimi = etiket(SATIRLAR.upgrade, t('infoBranchChoice'), tipSutunX, PARCHMENT);
    this.#dalSecimi.setVisible(false);
  }

  /** Son kademe mi? Öyleyse yükseltme sayısının yerine etiket çıkıyor. */
  setMaxTier(max: boolean): void {
    this.#sonKademe.setVisible(max);
  }

  /** T2 — sıradaki adım tek kademe değil, **dal seçimi**. */
  setBranchChoice(dal: boolean): void {
    this.#dalSecimi.setVisible(dal);
  }

  setType(magic: boolean): void {
    this.#buyu.setVisible(magic);
    this.#fiziksel.setVisible(!magic);
  }

  setAir(hitsAir: boolean): void {
    this.#ucanaVurur.setVisible(hitsAir);
    this.#ucanaVurmaz.setVisible(!hitsAir);
  }
}

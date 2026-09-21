import Phaser from 'phaser';
import { t } from '../util/i18n';
import { PreloadScene } from './PreloadScene';
import { addPressFeedback } from '../fx/ParchmentFrame';
import type { StringKey } from '../data/strings';

const INK = 0x14203a;
const UST = 100;
/**
 * Satırlar arası nefes.
 *
 * **`M99`: 12 → 9.** On birinci satır (yetenek yükseltmesi) eklenince
 * sayfa alt şeride taşıyordu: son paragraf “← Geri” bağlantısına ve tam
 * ekran düğmesine giriyordu — canlı ekran görüntüsünde görüldü. Akış
 * yerleşimi üst üste binmeyi engelliyor ama sayfa **sığmayı** kendiliğinden
 * çözmüyor; aralık daraltıldı.
 */
const SATIR_ARALIGI = 9;
/** Bölümler arası nefes — başlığın üstünde. */
const BOLUM_ARALIGI = 14;

/**
 * Sayfa **bölümlere ayrılıyor** — `M87`.
 *
 * On satır tek blok halinde duruyordu ve oyuncu gözüyle bakıldığında bir
 * duvar görünüyordu: hepsi aynı punto, aynı renk, aynı aralık. Üç başlık
 * taramanın ölçüsünü veriyor — **ne yaparsın · neyle yaparsın · kime
 * karşı** — ve satırların sırası değişmedi, yalnız gruplandı.
 */
const BOLUMLER: readonly { readonly baslik: StringKey; readonly satirlar: readonly StringKey[] }[] =
  [
    { baslik: 'howToSecBasics', satirlar: ['howTo1', 'howTo3', 'howTo6', 'howTo7'] },
    { baslik: 'howToSecTowers', satirlar: ['howTo2', 'howTo4', 'howTo5', 'howTo11', 'howTo8'] },
    // `M28` — `M12` (yeraltı geçişi) ve `M13` (çağıran boss) bu sayfaya hiç
    // girmemişti; `M10`'un iki mekaniği `howTo8/9` ile eklenip sonrakiler
    // atlanmıştı.
    { baslik: 'howToSecEnemies', satirlar: ['howTo9', 'howTo10'] },
  ];

/**
 * "Nasıl oynanır" — `M8-T13`.
 *
 * Tek sayfa, **statik**. Oyun kendi öğreticisini oynanışta veriyor
 * (`TutorialSystem`, `Y09`); bu sayfa onun yerine geçmiyor, "bir şeyi
 * kaçırdım" diyen oyuncunun bakacağı yer.
 *
 * TIER 1 kural 7: metin bir kez yazılıyor, `setText` yok.
 * `CLAUDE.md` i18n: tüm satırlar `strings.ts`'te; bu dosyada tek bir
 * oyuncuya görünen dizge yok.
 */
export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  preload(): void {
    PreloadScene.queueAtlas(this);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, INK).setOrigin(0);

    this.add
      .text(width / 2, 56, t('howToTitle'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '44px',
        color: '#D4A032',
      })
      .setOrigin(0.5);

    /**
     * **Akış yerleşimi, sabit aralık değil.** Eskiden her satır
     * `UST + i * SATIR_Y` ile konuyordu; iki satıra taşan paragraflar
     * (erken başlatma, Tünelci) 46 px'lik aralığı aşıp bir sonrakine
     * yaklaşıyordu. Şimdi her metnin ölçülen yüksekliği kadar iniliyor.
     */
    let y = UST;
    for (const bolum of BOLUMLER) {
      const baslik = this.add
        .text(width / 2, y, t(bolum.baslik), {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '24px',
          color: '#D4A032',
        })
        .setOrigin(0.5, 0);
      y += baslik.height + 10;

      for (const k of bolum.satirlar) {
        const satir = this.add
          .text(width / 2, y, t(k), {
            fontFamily: 'Spectral, serif',
            fontSize: '20px',
            color: '#E4D3A8',
            align: 'center',
            wordWrap: { width: width - 200 },
          })
          .setOrigin(0.5, 0);
        y += satir.height + SATIR_ARALIGI;
      }
      y += BOLUM_ARALIGI;
    }

    const geri = this.add
      .text(width / 2, height - 42, t('back'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#8A7250',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('Menu'));
    addPressFeedback(geri);
  }
}

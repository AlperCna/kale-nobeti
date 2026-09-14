import Phaser from 'phaser';
import { t } from '../util/i18n';
import { PreloadScene } from './PreloadScene';
import type { StringKey } from '../data/strings';

const INK = 0x14203a;
const UST = 120;
const SATIR_Y = 46;

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
const SATIRLAR: readonly StringKey[] = [
  'howTo1',
  'howTo2',
  'howTo3',
  'howTo4',
  'howTo5',
  'howTo6',
  'howTo7',
];

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

    SATIRLAR.forEach((k, i) => {
      this.add
        .text(width / 2, UST + i * SATIR_Y, t(k), {
          fontFamily: 'Spectral, serif',
          fontSize: '20px',
          color: '#E4D3A8',
          align: 'center',
          wordWrap: { width: width - 200 },
        })
        .setOrigin(0.5);
    });

    this.add
      .text(width / 2, height - 42, t('back'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#8A7250',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('Menu'));
  }
}

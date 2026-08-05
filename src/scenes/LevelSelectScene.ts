import Phaser from 'phaser';
import { MAPS } from '../data/maps';
import { wavesFor } from '../data/waves';
import { SaveSystem } from '../systems/SaveSystem';
import { LocalStore } from '../util/storage';
import { t } from '../util/i18n';

const INK = 0x14203a;
const PARCHMENT = 0xe4d3a8;
const GOLD = 0xd4a032;
const KILITLI = 0x4a5570;

/** Dokunmatik hedef en az 44×44 px (`CLAUDE.md` Platform). */
const KART_W = 300;
const KART_H = 190;

const HARITA_ADI: Readonly<Record<string, string>> = {
  'degirmen-gecidi': 'Değirmen Geçidi',
  'tas-kopru': 'Taş Köprü',
  'kul-ovasi': 'Kül Ovası',
};

/**
 * Seviye seçim — `M7-T06`.
 *
 * Üç harita, kazanılan yıldızlar ve kilit durumu. **Kilit yalnız
 * bitirmeye bağlı** (S62): bir önceki harita bitmişse sonraki açılıyor,
 * yıldız şartı yok.
 *
 * TIER 1 kural 7: buradaki yazılar **bir kez** yazılıp değişmiyor, o
 * yüzden `Text` serbest. `setText` hiç çağrılmıyor.
 * TIER 1 kural 10: kayıt `LocalStore` üzerinden, gizli sekmede çökmüyor.
 */
export class LevelSelectScene extends Phaser.Scene {
  #save?: SaveSystem;

  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.#save = new SaveSystem(new LocalStore());
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, INK).setOrigin(0);
    this.add
      .text(width / 2, 56, t('levelSelect'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '44px',
        color: '#D4A032',
      })
      .setOrigin(0.5);

    const toplam = this.#save.totalStars();
    this.add
      .text(width / 2, 106, `★ ${toplam} / ${MAPS.length * 3}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#8A7250',
      })
      .setOrigin(0.5);

    const ids = MAPS.map((m) => m.id);
    MAPS.forEach((m, i) => {
      const x = width / 2 + (i - (MAPS.length - 1) / 2) * (KART_W + 24);
      const y = height / 2 + 20;
      const acik = this.#save!.isUnlocked(ids, m.id);
      const yildiz = this.#save!.starsOf(m.id);

      const kart = this.add
        .rectangle(x, y, KART_W, KART_H, acik ? PARCHMENT : KILITLI)
        .setStrokeStyle(3, acik ? GOLD : 0x2a3550);

      this.add
        .text(x, y - 54, `${i + 1}. ${HARITA_ADI[m.id] ?? m.id}`, {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '26px',
          color: acik ? '#14203A' : '#8A93AA',
        })
        .setOrigin(0.5);

      // Yıldızlar — kazanılan altın, kazanılmayan soluk.
      this.add
        .text(x, y - 8, '★★★', {
          fontFamily: 'serif',
          fontSize: '30px',
          color: '#B9AF95',
        })
        .setOrigin(0.5);
      if (yildiz > 0) {
        this.add
          .text(x - 30 + (yildiz * 30) / 2 - 15 + 15, y - 8, '★'.repeat(yildiz), {
            fontFamily: 'serif',
            fontSize: '30px',
            color: '#D4A032',
          })
          .setOrigin(0.5);
      }

      this.add
        .text(
          x,
          y + 34,
          acik ? `${wavesFor(m.id).length} dalga · ${m.buildSpots.length} nokta` : t('locked'),
          {
            fontFamily: 'Spectral, serif',
            fontSize: '16px', // Platform: minimum 16 px
            color: acik ? '#5A6478' : '#8A93AA',
          },
        )
        .setOrigin(0.5);

      if (!acik) return;
      kart.setInteractive({ useHandCursor: true });
      kart.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.scene.start('Game', { mapId: m.id });
        this.scene.launch('Hud');
      });
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

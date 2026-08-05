import Phaser from 'phaser';
import { t } from '../util/i18n';
import { BALANCE } from '../data/balance';
import { devHooks } from '../util/devHooks';

const INK = 0x14203a;
const PARCHMENT = 0xe4d3a8;
const GOLD = 0xd4a032;
const VERMILION = 0xb03a2e;

export interface GameOverData {
  readonly won: boolean;
  readonly lives: number;
}

/**
 * Kazanma ve kaybetme ekranı (`M3-T11`).
 *
 * **Tüm metin bir kez yazılıyor** — sahne her açılışta yeniden kuruluyor,
 * `setText` çağrılmıyor (TIER 1 kural 7).
 *
 * Yıldız derecelendirmesi **M7'de** görselleştirilecek; eşikler
 * `GAME-DESIGN.md` §9'da zaten tanımlı (20 → ★★★, 15-19 → ★★, ≤14 → ★)
 * ve burada sayı olarak gösteriliyor.
 */
export class GameOverScene extends Phaser.Scene {
  #data: GameOverData = { won: false, lives: 0 };

  constructor() {
    super('GameOver');
  }

  init(data: Partial<GameOverData>): void {
    this.#data = { won: data.won ?? false, lives: data.lives ?? 0 };
  }

  create(): void {
    const { width, height } = this.scale;
    const { won, lives } = this.#data;

    this.add.rectangle(0, 0, width, height, INK, 0.9).setOrigin(0);

    this.add
      .text(width / 2, height / 2 - 90, won ? t('victory') : t('defeat'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '64px',
        color: won ? '#D4A032' : '#B03A2E',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 20, `${lives} / ${BALANCE.startLives} ${t('livesLeft')}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '24px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);

    // §9 eşikleri: 20 → ★★★, 15-19 → ★★, ≤14 → ★. Görselleştirme M7'de.
    if (won) {
      this.add
        .text(width / 2, height / 2 + 20, '★'.repeat(this.#yildiz(lives)), {
          fontFamily: 'serif',
          fontSize: '36px',
          color: '#D4A032',
        })
        .setOrigin(0.5);
    }

    this.#menuButonu(width / 2, height / 2 + 100);

    const dev = devHooks();
    if (dev !== undefined) {
      dev.gameOver = () => ({ won, lives, stars: won ? this.#yildiz(lives) : 0 });
    }
  }

  /** `GAME-DESIGN.md` §9 yıldız tablosu. */
  #yildiz(lives: number): number {
    if (lives >= BALANCE.startLives) return 3;
    if (lives >= 15) return 2;
    return 1;
  }

  #menuButonu(x: number, y: number): void {
    const arka = this.add
      .rectangle(x, y, 220, 56, PARCHMENT)
      .setStrokeStyle(2, this.#data.won ? GOLD : VERMILION)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, t('backToMenu'), {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#14203A',
      })
      .setOrigin(0.5);

    arka.on('pointerup', () => {
      // `stop` + `start`: `Game` ve `Hud` tamamen kapanıyor ki yeni oyun
      // temiz başlasın. `sleep`/`wake` kullanılsaydı önceki oyunun altını
      // ve kuleleri kalırdı — görevin "bitmedi sayılır eğer" maddesi.
      this.scene.stop('Hud');
      this.scene.stop('Game');
      this.scene.start('Menu');
    });
  }
}

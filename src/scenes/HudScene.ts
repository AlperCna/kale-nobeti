import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { Speed } from '../types/common';
import { t } from '../util/i18n';
import { devHooks } from '../util/devHooks';

const INK = 0x14203a;
const PARCHMENT = 0xe4d3a8;
const GOLD = 0xd4a032;

/** Dokunmatik hedef en az 44×44 px (CLAUDE.md Platform). */
const BTN = 56;
const MARGIN = 20;

/**
 * HUD. `Game`'in **üstünde paralel** çalışır (CLAUDE.md Mimari).
 *
 * Duraklatmada `Game` durur, **`Hud` durmaz** — durursa devam butonu
 * tıklanamaz hale gelir. Bu görevin "bitmedi sayılır eğer" maddesi bu.
 */
export class HudScene extends Phaser.Scene {
  #paused = false;
  #speed: Speed = 1;

  /**
   * S07 — TIER 1 kural 7 çatışması.
   *
   * Kural değişen metni `BitmapText` zorunlu kılıyor, ama sayı bitmap
   * fontu M6'da üretiliyor. Ara çözüm: **iki statik `Text`**, biri
   * görünür. `setText` hiç çağrılmıyor, yani canvas yeniden üretilmiyor
   * ve kuralın önlemek istediği maliyet doğmuyor.
   * M6'da ikisi tek `BitmapText` ile değişecek.
   */
  #label1x?: Phaser.GameObjects.Text;
  #label2x?: Phaser.GameObjects.Text;

  #overlay?: Phaser.GameObjects.Container;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.#createSpeedButton();
    this.#createPauseOverlay();
    this.#bindKeys();

    const dev = devHooks();
    if (dev !== undefined) dev.paused = false;
  }

  update(): void {
    const dev = devHooks();
    if (dev !== undefined) dev.hudFrames = (dev.hudFrames ?? 0) + 1;
  }

  // -------------------------------------------------------------------
  // Hız
  // -------------------------------------------------------------------

  #createSpeedButton(): void {
    const x = this.scale.width - MARGIN - BTN / 2;
    const y = MARGIN + BTN / 2;

    const arka = this.add
      .rectangle(x, y, BTN, BTN, INK)
      .setStrokeStyle(2, GOLD)
      .setInteractive({ useHandCursor: true });

    const stil = { fontFamily: 'Spectral, serif', fontSize: '24px', color: '#D4A032' };
    this.#label1x = this.add.text(x, y, '1×', stil).setOrigin(0.5);
    this.#label2x = this.add.text(x, y, '2×', stil).setOrigin(0.5).setVisible(false);

    arka.on('pointerup', () => {
      this.#toggleSpeed();
    });
  }

  #toggleSpeed(): void {
    this.#speed = this.#speed === 1 ? 2 : 1;

    // Etiket değişmiyor, görünürlük değişiyor — S07.
    this.#label1x?.setVisible(this.#speed === 1);
    this.#label2x?.setVisible(this.#speed === 2);

    const game = this.scene.get('Game') as GameScene;
    // `Phaser.Scene` yapısal olarak `ClockTarget`i karşılıyor:
    // tweens.timeScale, time.timeScale, anims.globalTimeScale.
    game.clock.setScale(this.#speed, game);
    game.bus.emit('speed:changed', { scale: this.#speed });
  }

  // -------------------------------------------------------------------
  // Duraklatma
  // -------------------------------------------------------------------

  #createPauseOverlay(): void {
    const { width, height } = this.scale;

    const perde = this.add.rectangle(0, 0, width, height, INK, 0.72).setOrigin(0);
    const yazi = this.add
      .text(width / 2, height / 2, t('paused'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '56px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);
    const ipucu = this.add
      .text(width / 2, height / 2 + 60, 'ESC / boşluk', {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#8A7250',
      })
      .setOrigin(0.5);

    this.#overlay = this.add.container(0, 0, [perde, yazi, ipucu]).setVisible(false);
  }

  /**
   * ESC **ve** boşluk — Poki'nin zorunlu şartı (research/05 §1).
   * Tuşlar `Hud`'a bağlı: `Game` duraklatılınca onun girdi işleyicisi
   * de durur ve devam edilemezdi.
   */
  #bindKeys(): void {
    const kb = this.input.keyboard;
    if (kb === null) return;

    kb.on('keydown-ESC', () => {
      this.#togglePause();
    });
    kb.on('keydown-SPACE', () => {
      this.#togglePause();
    });
  }

  /**
   * `scene.pause()` kullanılıyor, `GameClock.setScale(0)` **değil**.
   * Sıfır ölçek bölme hataları doğuruyor (research/02 §3) ve `Speed`
   * tipinde `0` yok.
   */
  #togglePause(): void {
    this.#paused = !this.#paused;
    this.#overlay?.setVisible(this.#paused);

    const game = this.scene.get('Game') as GameScene;
    if (this.#paused) {
      this.scene.pause('Game');
    } else {
      this.scene.resume('Game');
    }
    game.bus.emit('game:paused', { paused: this.#paused });

    const dev = devHooks();
    if (dev !== undefined) dev.paused = this.#paused;
  }
}

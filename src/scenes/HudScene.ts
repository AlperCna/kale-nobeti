import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { Speed } from '../types/common';
import { t } from '../util/i18n';
import { devHooks } from '../util/devHooks';
import { HudReadout } from '../fx/HudReadout';
import { WaveTelegraph } from '../fx/WaveTelegraph';
import { ensureNumberFont } from '../fx/numberFont';
import { AbilityButtons } from '../fx/AbilityButtons';
import { SettingsPanel } from '../fx/SettingsPanel';

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

  /** Değişen sayılar ayrı dosyada — `HudReadout` başlığındaki gerekçe. */
  #readout?: HudReadout;
  #telegraph?: WaveTelegraph;
  #earlyBtn?: Phaser.GameObjects.Rectangle;
  #earlyLabel?: Phaser.GameObjects.Text;
  #bitti = false;

  /** İki yetenek butonu + dairesel bekleme dolumu (§8, M5-T07). */
  #abilityButtons?: AbilityButtons;

  /** Ayarlar paneli (M6-T12) — duraklatma perdesinin üstünde. */
  #settingsPanel?: SettingsPanel;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.#bitti = false;
    // **Bekçi kural 10'un bulduğu iki gerçek hata.**
    //
    // `#paused`: duraklatılmışken kaybedilip yeniden başlanınca `true`
    // kalıyordu. `create()` yeni bir perde yaratıyor ve o **gizli**
    // başlıyor, ama bayrak `true`; ilk ESC oyunu duraklatmak yerine
    // `scene.resume` çağırıyor ve perde açılıyordu — durum tam ters.
    //
    // `#speed`: 2×'te kaybedip yeniden başlayınca etiket 2× gösteriyordu
    // ama `GameClock` yeni sahnede 1×'ten başlıyor. Gösterge yalan
    // söylüyordu.
    //
    // İkisi de M0/M4/M5/M6'da dört kez çıkan tuzağın aynısı: alan
    // başlatıcısı bir kez, `create()` her seferinde.
    this.#paused = false;
    this.#speed = 1;
    ensureNumberFont(this);
    this.#createSpeedButton();
    this.#createLabels();
    this.#readout = new HudReadout(this, MARGIN, MARGIN);
    this.#telegraph = new WaveTelegraph(this, MARGIN + 150, MARGIN + 78);
    this.#createEarlyStartButton();
    this.#abilityButtons = new AbilityButtons(
      this,
      MARGIN + 40,
      this.scale.height - MARGIN - 46,
      (id) => this.#game().armAbility(id),
    );
    this.#settingsPanel = new SettingsPanel(this, this.#game().settings, () => {
      // Ayar değişince oyuna anında yansı — sarsıntı bayrağı ve ses.
      const g = this.#game();
      g.shake.enabled = g.settings.state.screenShake;
      if (!g.settings.state.screenShake) g.shake.reset();
      this.sound.mute = !g.settings.state.sound;
    });
    // Başlangıçta da uygula: kayıtlı tercih ve prefers-reduced-motion.
    {
      const g = this.#game();
      g.shake.enabled = g.settings.state.screenShake;
      this.sound.mute = !g.settings.state.sound;
    }
    this.#createSettingsButton();
    this.#createPauseOverlay();
    this.#bindKeys();

    const dev = devHooks();
    if (dev !== undefined) {
      dev.paused = false;
      dev.startWaveEarly = () => this.#game().startWaveEarly();
      dev.gold = () => this.#game().gold;
      dev.wavePhase = () => this.#game().wavePhase;
      dev.waveNumber = () => this.#game().waveNumber;
      dev.prepRemaining = () => this.#game().prepRemainingSec ?? -1;
    }
  }

  update(): void {
    const dev = devHooks();
    if (dev !== undefined) dev.hudFrames = (dev.hudFrames ?? 0) + 1;

    const game = this.#game();
    this.#readout?.update({
      gold: game.gold,
      lives: game.lives,
      prepRemainingSec: game.prepRemainingSec,
      waveNumber: game.waveNumber,
      totalWaves: game.totalWaves,
    });
    this.#telegraph?.show(game.upcomingWave);
    this.#abilityButtons?.update((id) => game.abilities.progress(id), game.pendingAbility);

    const erkenAcik = game.earlyStartAvailable;
    this.#earlyBtn?.setVisible(erkenAcik);
    this.#earlyLabel?.setVisible(erkenAcik);

    this.#oyunSonuKontrol(game);
  }

  /**
   * Kazanma / kaybetme geçişi (`M3-T11`).
   *
   * **S31 kararı: kaybetme ANINDA.** Can 0'a inince dalga sonu beklenmiyor.
   * Gerekçe: dalga sonunu beklemek oyuncuya kaybettiğini bildiği bir dalgayı
   * izletmek demek; tower defense'te en sık şikâyet edilen ölü zaman bu.
   */
  #oyunSonuKontrol(game: GameScene): void {
    if (this.#bitti) return;

    const kaybetti = game.lives <= 0;
    const kazandi = game.wavePhase === 'done' && game.lives > 0;
    if (!kaybetti && !kazandi) return;

    this.#bitti = true;
    this.scene.stop('Game');
    this.scene.start('GameOver', { won: kazandi, lives: game.lives });
  }

  /**
   * Ayarlar butonu — sağ üst. Duraklatma gerektirmiyor: §10'un istediği
   * ayarlar (sarsıntı, efekt, ses) oyun sürerken de değiştirilebilmeli,
   * çünkü etkileri ancak oyun akarken görülüyor.
   */
  #createSettingsButton(): void {
    const x = this.scale.width - MARGIN - BTN / 2;
    const y = MARGIN + BTN / 2 + BTN + 12;
    const btn = this.add
      .rectangle(x, y, BTN, BTN, PARCHMENT)
      .setStrokeStyle(2, GOLD)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, '⚙', { fontFamily: 'Spectral, serif', fontSize: '24px', color: '#14203A' })
      .setOrigin(0.5);
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.#settingsPanel?.setVisible(!(this.#settingsPanel?.visible ?? false));
    });
  }

  #game(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  /** Statik etiketler — bir kez yazılıyor, `setText` yok (TIER 1 k.7). */
  #createLabels(): void {
    const stil = { fontFamily: 'Spectral, serif', fontSize: '16px', color: '#8A7250' };
    this.add.text(MARGIN + 92, MARGIN + 4, t('gold'), stil);
    this.add.text(MARGIN + 92, MARGIN + 38, t('lives'), stil);
    this.add.text(MARGIN + 92, MARGIN + 72, t('wave'), stil);
  }

  /**
   * Erken başlatma butonu — **dalga 4'ten itibaren** görünür (§6).
   * Etiket sabit; kazanılacak bonus değişken olduğu için yazılmıyor.
   */
  #createEarlyStartButton(): void {
    const x = this.scale.width / 2;
    const y = this.scale.height - MARGIN - 26;

    this.#earlyBtn = this.add
      .rectangle(x, y, 180, 52, PARCHMENT)
      .setStrokeStyle(2, GOLD)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.#earlyLabel = this.add
      .text(x, y, t('startWave'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#14203A',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.#earlyBtn.on('pointerup', () => {
      this.#game().startWaveEarly();
    });
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
    if (!this.#paused) this.#settingsPanel?.setVisible(false);

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

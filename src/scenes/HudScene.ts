import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { Speed } from '../types/common';
import { t } from '../util/i18n';
import { getSettings } from '../systems/Settings';
import { devHooks } from '../util/devHooks';
import { HudReadout } from '../fx/HudReadout';
import { WaveTelegraph } from '../fx/WaveTelegraph';
import { AbilityButtons } from '../fx/AbilityButtons';
import { SettingsPanel } from '../fx/SettingsPanel';
import { BossHealthBar } from '../fx/BossHealthBar';
import { createParchmentButton, createParchmentFrame } from '../fx/ParchmentFrame';
import { PreloadScene } from './PreloadScene';
import { NUMBER_FONT_KEY } from '../fx/numberFont';

const INK = 0x14203a;

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
   * S07 — TIER 1 kural 7. `G02`: sayı bitmap fontu artık üretiliyor
   * (`M6-T01`), iki statik `Text` yerine tek `BitmapText` — kuralın
   * "değişen metin bitmap olur" ruhuna tam uyum. `×` karakteri font
   * karakter kümesinde (`prep-assets.mjs` `SAYI_KARAKTERLERI`).
   */
  #hizYazi?: Phaser.GameObjects.BitmapText;

  #overlay?: Phaser.GameObjects.Container;

  /** Değişen sayılar ayrı dosyada — `HudReadout` başlığındaki gerekçe. */
  #readout?: HudReadout;
  #telegraph?: WaveTelegraph;
  #earlyBtn?: Phaser.GameObjects.Container;
  #earlyLabel?: Phaser.GameObjects.Text;
  #bitti = false;

  /** İki yetenek butonu + dairesel bekleme dolumu (§8, M5-T07). */
  #abilityButtons?: AbilityButtons;

  /** Ayarlar paneli (M6-T12) — duraklatma perdesinin üstünde. */
  #settingsPanel?: SettingsPanel;

  /** `G05` — boss sahnedeyken görünen tek can çubuğu. */
  #bossBar?: BossHealthBar;

  constructor() {
    super('Hud');
  }

  /**
   * `LevelSelectScene` `Game` ve `Hud`'u aynı tıklamada başlatıyor
   * (`this.scene.start('Game', ...); this.scene.launch('Hud');`) —
   * `Hud`'un kendi `preload()`'u olmazsa Phaser onu hemen `create()`'e
   * geçirir, `GameScene.preload()`'daki atlas yüklemesi bitmeden.
   * Canlı testte yakalandı: `corner`/`edge-strip`/`middle-texture`
   * kareleri "yok" uyarısı veriyordu. `queueGame`'in kendi `exists()`
   * koruması sayesinde burada tekrar çağırmak GameScene'inkiyle
   * çakışmıyor — ikisinden hangisi önce biterse.
   */
  preload(): void {
    PreloadScene.queueGame(this);
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
    this.#createSpeedButton();
    // Altın/can/dalga sayaç kartı — P02 brifi "HUD sol üstte üç parşömen
    // kart" (`docs/plan/M6-sanat-uretim-brifi.md`). Etiket+sayı bloğunun
    // gerçek yerleşimini saran, ölçülmüş bir kutu.
    //
    // Kart kenarlığı (`cornerSize=16`) dekoratif bir şerit — sayılar bu
    // şeridin İÇİNE değil, ÜSTÜNE denk gelirse üst kısımları kenarlık
    // desenine gömülüp "tam gözükmüyor" görünür. Sayı bloğu bu yüzden
    // kenarlık kalınlığı + biraz boşluk kadar içeri (`MARGIN+8, MARGIN+16`)
    // kaydırılıyor; kart da üç satırı (dy 0/34/68 + 28px yükseklik) o payla
    // birlikte tutacak kadar büyütüldü.
    createParchmentFrame(this, MARGIN + 96, MARGIN + 66, 216, 140, 16);
    this.#createLabels();
    this.#readout = new HudReadout(this, MARGIN + 8, MARGIN + 16);
    this.#telegraph = new WaveTelegraph(this, MARGIN + 150, MARGIN + 94);
    // `G05` — prep geri sayımıyla aynı yatay eksende ama biraz altında;
    // ikisi zamanda hiç örtüşmüyor (biri yalnız `prep`'te, öbürü yalnız
    // boss canlıyken görünür), üst üste binme riski yok.
    this.#bossBar = new BossHealthBar(this, this.scale.width / 2, 46);
    this.#createEarlyStartButton();
    this.#abilityButtons = new AbilityButtons(
      this,
      MARGIN + 40,
      this.scale.height - MARGIN - 46,
      (id) => this.#game().armAbility(id),
    );
    // `settings` doğrudan paylaşılan registry'den (`getSettings`) okunuyor,
    // `this.#game().settings`'ten DEĞİL. **Canlı testte yakalanan gerçek
    // çökme:** `GameScene.settings` alan başlatıcısı değil, `create()`
    // içinde atanıyor (`this.registry`'nin Phaser tarafından enjekte
    // edilmesi sahne kurucusundan SONRA olduğu için alan başlatıcı olamaz —
    // ayrıntı bu değişikliğin commit notunda). `LevelSelectScene` `Game`'i
    // `start()`, `Hud`'u `launch()` ediyor; ikisi de aynı doğrultulmuş
    // tikte kuyruklanıyor ama **hangisinin `create()`'inin önce bittiği
    // garanti değil**. Yavaş bir cihazda/dar görünümde `HudScene.create()`
    // `GameScene.create()`'den önce çalışırsa `this.#game().settings`
    // hâlâ `undefined` oluyordu → `SettingsPanel.refresh()` `.state`
    // okurken patlıyordu. `getSettings(this)` ise oyun-geneli registry'yi
    // okuyor (`BootScene` orada bir kez kuruyor, her sahnenin `registry`'si
    // aynı nesneye işaret ediyor) — `GameScene`'in kendi `create()`'ine
    // bağımlı değil, `HudScene`'in kendi `registry`'si hazır olur olmaz
    // (Phaser'ın sahne önyükleme sırası) kullanılabilir.
    const settings = getSettings(this);
    this.#settingsPanel = new SettingsPanel(this, settings, () => {
      // Ayar değişince oyuna anında yansı — sarsıntı bayrağı ve ses.
      // `shake` (`GameScene`) alan başlatıcısı (`readonly shake = new
      // ScreenShake()`) — `settings`'in aksine kurucudan itibaren güvenli.
      const g = this.#game();
      g.shake.enabled = settings.state.screenShake;
      if (!settings.state.screenShake) g.shake.reset();
      this.sound.mute = !settings.state.sound;
    });
    // Başlangıçta da uygula: kayıtlı tercih ve prefers-reduced-motion.
    {
      const g = this.#game();
      g.shake.enabled = settings.state.screenShake;
      this.sound.mute = !settings.state.sound;
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

    const boss = game.bossInfo;
    if (boss !== null) this.#bossBar?.show(boss.hp, boss.maxHp);
    else this.#bossBar?.hide();

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
    game.soundSystem?.playOutcome(kazandi);
    this.scene.stop('Game');
    this.scene.start('GameOver', { won: kazandi, lives: game.lives, mapId: game.map.id });
  }

  /**
   * Ayarlar butonu — sağ üst. Duraklatma gerektirmiyor: §10'un istediği
   * ayarlar (sarsıntı, efekt, ses) oyun sürerken de değiştirilebilmeli,
   * çünkü etkileri ancak oyun akarken görülüyor.
   */
  #createSettingsButton(): void {
    const x = this.scale.width - MARGIN - BTN / 2;
    const y = MARGIN + BTN / 2 + BTN + 12;
    const btn = createParchmentButton(this, x, y, BTN, BTN, 14);
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
    this.add.text(MARGIN + 92, MARGIN + 20, t('gold'), stil);
    this.add.text(MARGIN + 92, MARGIN + 54, t('lives'), stil);
    this.add.text(MARGIN + 92, MARGIN + 88, t('wave'), stil);
  }

  /**
   * Erken başlatma butonu — **dalga 4'ten itibaren** görünür (§6).
   * Etiket sabit; kazanılacak bonus değişken olduğu için yazılmıyor.
   */
  #createEarlyStartButton(): void {
    const x = this.scale.width / 2;
    const y = this.scale.height - MARGIN - 26;

    this.#earlyBtn = createParchmentButton(this, x, y, 180, 52, 14).setVisible(false);
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

    // `G02` — diğer HUD butonlarıyla aynı parşömen çerçeve. Kare bir
    // kutuda 9-slice köşeleri hiç gerilmiyor, dönüşüm en ucuz durum.
    const cerceve = createParchmentButton(this, x, y, BTN, BTN, 12);

    // Parşömen zeminde mürekkep — altın burada okunmuyor.
    this.#hizYazi = this.add.bitmapText(x, y, NUMBER_FONT_KEY, '1×').setOrigin(0.5).setTint(INK);

    cerceve.on('pointerup', () => {
      this.#toggleSpeed();
    });
  }

  #toggleSpeed(): void {
    this.#speed = this.#speed === 1 ? 2 : 1;
    this.#hizYazi?.setText(this.#speed === 1 ? '1×' : '2×');

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
      .text(width / 2, height / 2 + 60, t('pauseHint'), {
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

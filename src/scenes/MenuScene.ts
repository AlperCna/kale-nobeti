import Phaser from 'phaser';
import { yenidenKurOverlay } from './OverlayScene';
import { t } from '../util/i18n';
import { getSettings } from '../systems/Settings';
import { PreloadScene } from './PreloadScene';
import { createParchmentButton, addPressFeedback } from '../fx/ParchmentFrame';
import { SettingsPanel } from '../fx/SettingsPanel';
import { MUSIC_BASE_VOLUME } from '../data/audio';

/**
 * Dokunmatik hedef en az 44×44 px (CLAUDE.md Platform, 1280×720 ölçeğinde).
 * Buton bunun çok üstünde — tıklama alanı yazı kutusundan **belirgin
 * biçimde** büyük olsun diye.
 */
const BTN_W = 260;
const BTN_H = 64;

/** Minimum yazı 16 px. Poki 640×360'a küçültüyor (research/05 §1). */
const BTN_FONT_PX = 28;
const TITLE_FONT_PX = 72;
/** Ayarlar düğmesi — `HudScene`'in dişlisiyle aynı ölçü ve köşe. */
const AYAR_BTN = 56;
/** İkincil menü butonu — "Oyna"dan küçük (hiyerarşi boyutla kuruluyor). */
const IKINCIL_W = 220;
const IKINCIL_H = 52;
const MARGIN = 20;

export class MenuScene extends Phaser.Scene {
  #settingsPanel?: SettingsPanel;

  constructor() {
    super('Menu');
  }

  /**
   * Yalnız atlas (`PreloadScene.queueAtlas`) — `#createPlayButton`'un
   * `createParchmentButton`'ı (`G01`) atlas karesi istiyor.
   * **Canlı testte yakalandı:** bu `preload()` yokken atlas hiç
   * istenmiyordu, "Oyna" butonu `__MISSING` dokusuyla (yeşil çapraz
   * çizgili kutu) çiziliyordu — bkz. `PreloadScene.queueAtlas`'ın
   * kendi yorumu. `queueGame`'in tamamı değil, yalnız bu — geri kalanı
   * (ses efektleri, harita 1 arka planı) hâlâ "Oyna"ya kadar bekliyor.
   */
  preload(): void {
    PreloadScene.queueAtlas(this);
  }

  /**
   * `data.settingsOpen`: dil değişimi menüyü yeniden kuruyor (`Hud`'la
   * aynı sebep — bekçi k.4 yüzünden çevrili `Text` yerinde
   * güncellenemiyor) ve panel açık kalsın diye bayrak taşınıyor.
   */
  create(data?: { readonly settingsOpen?: boolean }): void {
    const { width, height } = this.scale;

    // `M8-T12` — oyunun üstünde sürekli duran katman (tam ekran düğmesi,
    // yatay çevirme perdesi). Bir kez başlatılıp hiç durdurulmuyor.
    //
    // **`BootScene`'den değil buradan.** İlk yazımda `Boot`, `Preload`'un
    // yanına başlatıyordu ve `Overlay`'in kendi `preload`'unda atlası
    // kuyruğa alması gerekiyordu — iki sahnenin aynı varlığı istemesi.
    // Buradan başlatılınca atlas `Menu.preload` sayesinde **zaten**
    // yüklü ve `Overlay`'in hiçbir şey yüklemesi gerekmiyor.
    //
    // Kaybedilen: hazırlık ekranının o 1-2 saniyesinde yatay çevirme
    // perdesi yok. Kazanılan: tek yükleme sahibi. Takas bilinçli.
    if (!this.scene.isActive('Overlay')) this.scene.launch('Overlay');

    // M6-T05 — ilk izlenim ekranı. Kompozisyon üst-orta boşluk bırakacak
    // şekilde üretildi (bkz. görsel brifi): gökyüzü üstte açık, kale
    // alt yarıda — başlık/buton üstüne net oturuyor.
    this.add.image(width / 2, height / 2, 'menu-bg');

    // M6-T11 — menü müziği. `sound` sahneler arası paylaşılan tek
    // yönetici (Phaser); `isPlaying` koruması olmadan `Menu`ye her
    // dönüşte (ör. `GameOver`'dan "yeniden dene") ikinci bir kopya
    // üst üste binerdi.
    //
    // `Y05` — tembel yükleniyor: `GameScene.ts:504-517`'deki
    // `music_game` deseninin birebir kopyası (`filecomplete` olayı +
    // `load.start()`). `Y04`'ün bedava kazancı: ses kapalıysa
    // (`getSettings` artık `Menu`de de erişilebilir — bu da `Y04`'ün
    // eseri) dosya **hiç indirilmiyor**; `BootScene` zaten
    // `sound.mute`'u doğru kurdu, burada yalnız bant genişliği israfını
    // önlüyoruz.
    const ayarlar = getSettings(this);
    if (ayarlar.musicScale > 0 && this.sound.get('music_menu')?.isPlaying !== true) {
      const calmayaBasla = (): void => {
        this.sound.play('music_menu', { loop: true, volume: MUSIC_BASE_VOLUME * ayarlar.musicScale });
      };
      if (this.cache.audio.exists('music_menu')) {
        calmayaBasla();
      } else {
        this.load.once('filecomplete-audio-music_menu', calmayaBasla);
        PreloadScene.queueMenuMusic(this);
        this.load.start();
      }
    }

    // Başlık marka adı — çeviri sözlüğüne girmez (S63 istisnası).
    // Statik metin, bir kez yazılıp değişmiyor: `Text` serbest
    // (TIER 1 kural 7 istisnası, sonradan "ihlal mi" diye sorulmasın).
    const baslik = this.add
      .text(width / 2, height / 2 - 120, 'Kale Nöbeti', {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: `${TITLE_FONT_PX}px`,
        color: '#D4A032',
      })
      .setOrigin(0.5);

    // `M8-T13` — altın varak parıltısı: başlığın alfası çok yavaş nefes
    // alıyor. **Hareket ayarına bağlı** (`screenShake`, `M8-T09`'daki
    // kararla aynı gerekçe: bilgi taşımayan görüntü hareketi ve
    // `reducedMotionDefaults` onu zaten kapatıyor).
    if (getSettings(this).state.screenShake) {
      this.tweens.add({
        targets: baslik,
        alpha: { from: 1, to: 0.72 },
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // `M8-T13` — alt başlık. Başlık tek başına oyunun ne olduğunu
    // söylemiyordu; oyuncu geri bildirimi "burası çok sade duruyor".
    this.add
      .text(width / 2, height / 2 - 62, t('tagline'), {
        fontFamily: 'Spectral, serif',
        fontSize: '22px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5)
      // Menü arka planı burada **sabit değil**: kalenin sancağı ve
      // kulesi tam bu yüksekliği kesiyor ve soluk altın yazı taşın
      // üstünde okunmuyordu (canlı ekran görüntüsü). Mürekkep gölge,
      // zemin ne olursa olsun kontrastı garantiliyor — başlık 72 px
      // olduğu için ona gerek yok, 22 px'lik alt başlığa var.
      .setShadow(0, 2, '#14203A', 4, false, true);

    this.#createPlayButton(width / 2, height / 2 + 40);
    // `M8-T07` — başarımlar. "Oyna"nın altında ve **belirgin biçimde
    // daha küçük**: birincil eylem hâlâ oynamak (`Y07` ile aynı gerekçe,
    // renk yerine boyutla hiyerarşi).
    const ikincilUst = height / 2 + 40 + BTN_H / 2 + 18 + IKINCIL_H / 2;
    this.#createMenuButton(ikincilUst, t('achievements'), () =>
      this.scene.start('Achievements'),
    );
    this.#createMenuButton(ikincilUst + IKINCIL_H + 12, t('howToPlay'), () =>
      this.scene.start('HowTo'),
    );

    // `M8-T13` — sürüm etiketi. `vite.config.ts` `define` ile
    // `package.json`'dan geliyor; iki yerde elle tutulan bir sürüm
    // numarası sessizce ayrışırdı.
    this.add
      .text(width - 10, height - 8, `v${__APP_VERSION__}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '16px', // Platform: minimum 16 px
        color: 'rgba(138,114,80,0.7)',
      })
      .setOrigin(1, 1);
    this.#createSettingsButton(width - MARGIN - AYAR_BTN / 2, MARGIN + AYAR_BTN / 2);
    if (data?.settingsOpen === true) this.#settingsPanel?.setVisible(true);
  }

  /** İkincil menü butonu — `#createPlayButton`'un küçük kardeşi. */
  #createMenuButton(y: number, metin: string, onClick: () => void): void {
    const x = this.scale.width / 2;
    const cerceve = createParchmentButton(this, x, y, IKINCIL_W, IKINCIL_H, 14);
    addPressFeedback(cerceve);
    this.add
      .text(x, y, metin, {
        fontFamily: 'Spectral, serif',
        fontSize: '22px',
        color: '#14203A',
      })
      .setOrigin(0.5);
    cerceve.on('pointerup', onClick);
  }

  /**
   * Ayarlar (dil dahil) menüden — oyuncu geri bildirimi (2026-09-14):
   * "ana menü çok sade" ve Y03 Adım 3'ün açık bıraktığı boşluk: dil
   * seçici yalnız oyun içindeki paneldeydi, Türkçe tarayıcıdan İngilizce
   * oynamak isteyen önce bir haritaya girmek zorundaydı.
   *
   * Panel `HudScene`'dekiyle aynı sınıf. `onChange` burada yalnız sesi
   * uyguluyor (menü müziği); sarsıntı/ipucu/efekt kaydediliyor ve
   * `HudScene.create()` haritaya girince zaten uyguluyor.
   */
  #createSettingsButton(x: number, y: number): void {
    const settings = getSettings(this);
    this.#settingsPanel = new SettingsPanel(
      this,
      settings,
      () => {
        // `M8-T10` — `mute` hâlâ toplu anahtar (ikisi de kapalıysa),
        // ama müziğin **seviyesi** ayrıca uygulanıyor: oyuncu paneli
        // açıkken "Müzik: Düşük" derse menü müziği anında kısılmalı.
        this.sound.mute = !settings.state.sound;
        const muzik = this.sound.get('music_menu');
        if (muzik !== null && 'setVolume' in muzik) {
          (muzik as Phaser.Sound.BaseSound & { setVolume: (v: number) => void }).setVolume(
            MUSIC_BASE_VOLUME * settings.musicScale,
          );
        }
      },
      () => {
        this.scene.restart({ settingsOpen: true });
        yenidenKurOverlay(this);
      },
    );

    const cerceve = createParchmentButton(this, x, y, AYAR_BTN, AYAR_BTN, 12);
    addPressFeedback(cerceve);
    this.add
      .text(x, y, '⚙', { fontFamily: 'Spectral, serif', fontSize: '26px', color: '#14203A' })
      .setOrigin(0.5);
    cerceve.on('pointerup', () => {
      this.#settingsPanel?.setVisible(!(this.#settingsPanel?.visible ?? false));
    });
  }

  /**
   * Buton = parşömen çerçeve (tıklama alanı) + üstünde etiket (`G01`).
   *
   * Etkileşim **çerçeveye** bağlanıyor, metne değil. Metne bağlansaydı
   * yalnız harflerin tam üstüne tıklandığında çalışırdı — bu görevin
   * "bitmedi sayılır eğer" maddesi tam olarak bu. `createParchmentButton`
   * bunu zaten garanti ediyor: hit-alanı `Container`'ın tamamı.
   */
  #createPlayButton(x: number, y: number): void {
    const cerceve = createParchmentButton(this, x, y, BTN_W, BTN_H, 16);
    addPressFeedback(cerceve);

    // Metin tıklamayı yutmasın: etkileşim yalnız çerçevede.
    this.add
      .text(x, y, t('play'), {
        fontFamily: 'Spectral, serif',
        fontSize: `${BTN_FONT_PX}px`,
        color: '#14203A',
      })
      .setOrigin(0.5);

    cerceve.on('pointerup', () => {
      this.#startGame();
    });
  }

  /**
   * `Hud`, `Game`'in **üstünde paralel** çalışır (CLAUDE.md Mimari).
   * `start` menüyü kapatıp oyunu açar; `launch` HUD'ı **durdurmadan**
   * yanına ekler — duraklatmada HUD'ın yaşamaya devam etmesi buna bağlı.
   */
  #startGame(): void {
    // M7: doğrudan oyuna değil, **seviye seçime**. Üç harita var artık.
    this.scene.start('LevelSelect');
  }
}

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { GameOverScene } from './scenes/GameOverScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { HowToScene } from './scenes/HowToScene';
import { OverlayScene } from './scenes/OverlayScene';

/**
 * Sahne kaydı yalnız burada yapılır (CLAUDE.md Klasör yapısı).
 *
 * Zincir: Boot → Preload → Menu → Game (+ Hud paralel).
 */
const config: Phaser.Types.Core.GameConfig = {
  /**
   * `research/02` §4: AUTO (WebGL öncelikli). **Karar `Y10`'da ölçümle
   * verildi** — bu yorum eskiden "ölçmeden verilmiyor" diyordu.
   *
   * Ölçüm: harita 3, 10 kuleli tam tahta, efekt Tam, her renderer iki
   * koşu (ilki soğuk; ısınma farkı gerçek ve büyük).
   *
   * | | kısıtlamasız | 4× CPU kısıtlamalı |
   * |---|---|---|
   * | WebGL sıcak, kare ort | **2,53 ms** | 13,63 ms · **50,2 FPS** |
   * | Canvas sıcak, kare ort | 3,04 ms | **9,29 ms** · 50,1 FPS |
   *
   * İki sonuç birden:
   *
   * 1. **`S15`'in ikincil geçidi geçildi**: eşik ≥ 30 FPS, ölçülen
   *    49-50 FPS — %65 pay.
   * 2. **Sıralama kısıtlama altında tersine dönüyor.** Hızlı makinede
   *    WebGL %20 ucuz; 4× kısıtlamada Canvas %32 ucuz (p99'da %38).
   *    `research/02`'nin "eski cihazlarda Canvas %30 kazandırıyor"
   *    bulgusu vekil ölçümde **doğrulandı**.
   *
   * AUTO kalıyor çünkü eşik rahat geçiliyor ve hızlı makinede WebGL daha
   * iyi. Ama Canvas artık **ölçülmüş bir kol**: hedef cihazda FPS 45'in
   * altına düşerse (`RISKS.md` R13 erken uyarısı) geçiş ~%32 kazandırır.
   *
   * `?render=canvas` ile karşılaştırma tekrarlanabilir. **Yalnız
   * `import.meta.env.DEV`'de**: CLAUDE.md Platform "yayın yapısında hata
   * ayıklama tuşları bulunmaz" diyor, üretim paketinde bu dal hiç
   * derlenmiyor.
   */
  type: import.meta.env.DEV && new URLSearchParams(location.search).get('render') === 'canvas'
    ? Phaser.CANVAS
    : Phaser.AUTO,

  // CLAUDE.md Teknoloji: mantıksal çözünürlük 1280×720 (16:9).
  // Poki 16:9 zorunlu kılıyor ve 640×360'a orantılı küçültüyor
  // (research/05 §1) — UI o ölçekte de okunur kalmalı.
  width: 1280,
  height: 720,

  // GAME-DESIGN §2 "Mürekkep". Letterbox şeritleri de aynı renk:
  // index.html gövdesi aynı değeri taşıyor.
  backgroundColor: '#14203A',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  // CLAUDE.md Platform: yayın yapısında konsol çıktısı bulunmaz.
  // Phaser varsayılan olarak sürüm başlığını basıyor ve bu üretimde de
  // görünür — kapatılıyor.
  banner: false,

  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    HudScene,
    GameOverScene,
    AchievementsScene,
    HowToScene,
    // `M8-T12` — **en sonda**: her zaman en üstte çizilsin (tam ekran
    // düğmesi + yatay çevirme perdesi). `BootScene` `launch` ediyor.
    OverlayScene,
  ],
};

const game = new Phaser.Game(config);

// Geliştirme kancası: sahne durumunu dışarıdan sorgulayabilmek için.
// `CLAUDE.md` Platform — yayın yapısında hata ayıklama bulunmaz; bu dal
// üretimde derleyici tarafından tamamen siliniyor.
if (import.meta.env.DEV) {
  (globalThis as { __game?: Phaser.Game }).__game = game;
}

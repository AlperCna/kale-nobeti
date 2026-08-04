import Phaser from 'phaser';

/**
 * GEÇİCİ yer tutucu sahne — M0-T05..T09 bunu
 * Boot → Preload → Menu → Game + Hud zinciriyle değiştirecek.
 *
 * Var olma sebebi: Phaser boş sahne listesiyle uyarı basıyor ve M0-T02'nin
 * kabul kriteri "konsol temiz" diyor.
 */
class BootstrapScene extends Phaser.Scene {
  constructor() {
    super('Bootstrap');
  }
}

/**
 * Sahne kaydı yalnız burada yapılır (CLAUDE.md Klasör yapısı).
 */
const config: Phaser.Types.Core.GameConfig = {
  // research/02 §4: AUTO (WebGL öncelikli). Canvas'a düşme kararı
  // ölçmeden verilmiyor — M6'da hedef cihazda FPS ölçülünce bakılacak.
  type: Phaser.AUTO,

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

  scene: [BootstrapScene],
};

new Phaser.Game(config);

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';

/**
 * GEÇİCİ yer tutucu sahne — M0-T06..T09 bunu
 * Preload → Menu → Game + Hud zinciriyle değiştirecek.
 *
 * Şu anki işi `M0-T05`'in kabul kriterini gözle doğrulanabilir kılmak:
 * Türkçe karakterler her iki fontta da kutucuk çıkmadan çiziliyor mu?
 */
class BootstrapScene extends Phaser.Scene {
  constructor() {
    super('Bootstrap');
  }

  create(): void {
    const { width, height } = this.scale;

    // Statik metin — bir kez yazılıp değişmiyor, bu yüzden
    // `Phaser.GameObjects.Text` serbest (TIER 1 kural 7 istisnası).
    const ornek = 'İIıi ŞşĞğÇçÖöÜü';

    this.add
      .text(width / 2, height / 2 - 60, ornek, {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '48px',
        color: '#D4A032', // GAME-DESIGN §2 "Altın varak"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, ornek, {
        fontFamily: 'Spectral, serif',
        fontSize: '32px',
        color: '#E4D3A8', // GAME-DESIGN §2 "Parşömen"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 80, 'M0-T05 — font doğrulaması (geçici)', {
        fontFamily: 'Spectral, serif',
        fontSize: '16px',
        color: '#8A7250',
      })
      .setOrigin(0.5);
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

  scene: [BootScene, BootstrapScene],
};

new Phaser.Game(config);

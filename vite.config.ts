import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

/**
 * `M8-T13` — surum etiketi build'de gomuluyor.
 *
 * `package.json`'i calisma zamaninda okumak mumkun degil (tarayicida
 * dosya sistemi yok) ve elle ikinci bir yere yazmak iki kaynagin
 * sessizce ayrismasi demek. `define` ile tek kaynaktan geliyor.
 */
const surum = (JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }).version;

export default defineConfig({
  // CLAUDE.md Platform kisitlari: mutlak yol yasak (CrazyGames).
  // Unutulursa oyun portalda hic yuklenmez ve bu `npm run dev`'de
  // FARK EDILMEZ — yalniz dist/ alt klasorden servis edilince beyaz
  // ekran olarak cikar. M0-T01 "bitmedi sayilir eger" maddesi budur.
  base: './',

  define: {
    __APP_VERSION__: JSON.stringify(surum),
  },

  resolve: {
    alias: {
      /**
       * `M8-T14` — Phaser'in **Matter fiziksiz** yapimi.
       *
       * `Y11` "ozel yapim uret" diyordu (webpack, Phaser deposundan);
       * bu, onun olculmus ve risksiz alt kumesi. Proje ne Matter ne
       * Arcade fizik kullaniyor (`CLAUDE.md` Teknoloji: "Arcade fizik
       * kullanilmiyor"), ama `phaser-arcade-physics` hazir bir giris
       * noktasi ve ICINDE Matter yok:
       *
       *   dist/phaser.min.js                 1.196.122 bayt
       *   dist/phaser-arcade-physics.min.js  1.086.308 bayt  (-%9,2)
       *
       * Olcum tahmin degil: iki dosya tartildi. Tilemaps ve butun oyun
       * nesneleri (BitmapText, Container, TileSprite, Group, Particles)
       * bu yapimda DURUYOR — `Y11`'in "phaser-core kullanilamaz" bulgusu
       * hala gecerli, o yol icin gercek bir ozel yapim gerekiyor.
       */
      phaser: 'phaser/dist/phaser-arcade-physics.js',
    },
  },

  build: {
    target: 'es2022',
    // Varliklar data URI'ye gomulmesin: ilk indirme olcumu (M0-T10)
    // dosya bazli yapiliyor, gomulen varlik olcumu bozar.
    assetsInlineLimit: 0,
  },
});

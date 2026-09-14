import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { uretPhaser } from './scripts/build-phaser.mjs';

/**
 * `M8-T13` — surum etiketi build'de gomuluyor.
 *
 * `package.json`'i calisma zamaninda okumak mumkun degil (tarayicida
 * dosya sistemi yok) ve elle ikinci bir yere yazmak iki kaynagin
 * sessizce ayrismasi demek. `define` ile tek kaynaktan geliyor.
 */
const surum = (JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }).version;

/**
 * `Y11` — Phaser **ozel yapimi**.
 *
 * `scripts/build-phaser.mjs` uretiyor ve BU YAPILANDIRMA onu cagiriyor.
 * npm `predev` yasam dongusu yeterli DEGIL: Browser pane'in launch.json'i
 * `vite`'i dogrudan calistiriyor, `npm run dev` degil. Buradan cagirinca
 * hangi yoldan baslatilirsa baslatilsin kaciramiyor.
 *
 * Once (`M8-T14`) hazir `phaser-arcade-physics.js` yapimina gecilmisti:
 * Matter'siz, olculmus -%9,2. Bu ondan sonraki adim — cekirdekten
 * baslayip yalnizca kullanilan modulleri geri ekliyor. Hangi moduller
 * ve neden: `src/vendor/phaser-custom.js` basligi.
 *
 * Dev ve uretim AYNI dosyayi kullaniyor. Ayri olsalardi eksik bir modul
 * dev'de calisip yalnizca yayinlanmis oyunda coker — bu degisiklikte en
 * kotu hata bicimi bu.
 *
 * Doner deger MUTLAK yol. Goreli (`./node_modules/...`) denendiginde
 * `npm run build` calisti ama `npm run dev` her dosyada "Failed to
 * resolve import phaser" verdi: build takma adi kokten cozuyor, dev
 * sunucusu ise ice aktaran dosyaya gore cozmeye calisiyor.
 */
const OZEL_PHASER = await uretPhaser();

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
    // Dizi bicimi ve `find` olarak REGEX kullaniliyor, nesne bicimi degil:
    // nesne bicimi **onek** eslestiriyor ve `phaser` takma adi
    // `phaser-custom.js` icindeki `require('phaser/src/...')` cagrilarini
    // da yakalayip `/src/vendor/phaser-custom.js/src/...` uretiyordu.
    // `/^phaser$/` yalniz cip bas modul adini yakalar.
    alias: [
      { find: /^phaser$/, replacement: OZEL_PHASER },
    ],
  },

  build: {
    target: 'es2022',
    // Varliklar data URI'ye gomulmesin: ilk indirme olcumu (M0-T10)
    // dosya bazli yapiliyor, gomulen varlik olcumu bozar.
    assetsInlineLimit: 0,
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  // CLAUDE.md Platform kisitlari: mutlak yol yasak (CrazyGames).
  // Unutulursa oyun portalda hic yuklenmez ve bu `npm run dev`'de
  // FARK EDILMEZ — yalniz dist/ alt klasorden servis edilince beyaz
  // ekran olarak cikar. M0-T01 "bitmedi sayilir eger" maddesi budur.
  base: './',

  build: {
    target: 'es2022',
    // Varliklar data URI'ye gomulmesin: ilk indirme olcumu (M0-T10)
    // dosya bazli yapiliyor, gomulen varlik olcumu bozar.
    assetsInlineLimit: 0,
  },
});

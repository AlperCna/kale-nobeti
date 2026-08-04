import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // CLAUDE.md Test — S08. `jsdom` DEGIL:
    //   - test edilen hicbir sey DOM'a dokunmuyor
    //   - jsdom'da WebGL/Canvas yok, Phaser zaten kosmaz
    //   - `node` belirgin sekilde hizli ve M3-T09'un
    //     "10 dalga < 2 sn" sarti buna bagli
    // Bu ancak TIER 1 kural 11 tutuyorsa calisir: saf mantik dosyalari
    // Phaser'i yalniz `import type` ile alir.
    environment: 'node',
    include: ['src/**/*.test.ts'],

    // M0-T01'de henuz test yok; vitest bos dizinde exit 1 veriyor ve
    // tas sonu zincirini (typecheck && test && build && guard) kiriyor.
    //
    // DIKKAT: bu ayar "tum testlerim kayboldu" durumunu da maskeler.
    // M0-T10'daki guard'a 6. kontrol eklenecek: src/ altinda en az bir
    // *.test.ts olmali. Maske o zaman denetlenmis varsayima donusur.
    passWithNoTests: true,
  },
});

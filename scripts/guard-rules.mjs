// TIER 1 kural bekcileri — YER TUTUCU.
//
// Gercek hali M0-T10'da yazilir. Bes kontrol:
//   1. Ham `delta` kullanimi (GameClock disinda)        — TIER 1 k.8
//   2. `: any` / `<any>` / `as any`                     — TIER 1 k.5
//   3. PreloadScene'de >= 4 asama fonksiyonu            — ROADMAP M0
//   4. Degisen metinde setText (BitmapText degilse)     — TIER 1 k.7
//   5. systems/util/data/types icinde `import type`     — TIER 1 k.11
//      olmayan Phaser import'u
//   6. src/ altinda en az bir *.test.ts var mi          — vitest'in
//      passWithNoTests maskesini denetlenmis varsayima cevirir
//      (vitest.config.ts'teki nota bak)
//
// M0-T10 ayrica negatif dogrulama sart kosuyor: kasten bir ihlal ekle,
// exit 1 gordugunu dogrula, geri al. Yapilmazsa bekcilerin gercekten
// calistigi bilinmiyor demektir.
//
// UYARI (TEST-STRATEGY §4): bekciler kanit degil, AG. Hepsi duzenli ifade
// sezgiseli. Negatif dogrulama bekcinin atesledigini kanitlar, her ihlali
// yakaladigini degil. Asil koruma gorevin kendi kabul kriteri.

console.log("[guard] YER TUTUCU — 5 kontrol M0-T10'da yazilacak.");

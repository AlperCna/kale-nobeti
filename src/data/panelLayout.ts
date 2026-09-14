/**
 * Kule bilgi panelinin ölçüsü ve iki yerleşimi.
 *
 * TIER 1 kural 1: sayı `data/` içinde. TIER 1 kural 11: Phaser'a hiç
 * dokunmuyor — `node` ortamında test edilebiliyor, `TowerInfoPanel`
 * buradan okuyor. Sayıları teste kopyalamak, `kurallar.mjs`'in elle
 * tutulan tablosunun sessizce boş veri basmasıyla aynı hata olurdu.
 *
 * ## Neden iki yerleşim var
 *
 * Panel sabit sağ-alttaydı ve **%90 opak**. Ölçüldü: harita 1'in
 * `7` numaralı yapı noktası `(1120, 485)` tamamen panelin altında
 * kalıyordu, `6` numara `(950, 485)` kenarındaydı. Panel açıkken o nokta
 * ne görünüyor ne tıklanabiliyordu — ve daha kötüsü, sağ alttaki bir
 * kuleyi seçtiğinde panel **incelediğin kuleyi** örtüyordu. Aynı sebeple
 * kulenin yanında açılan yükseltme menüsüyle de çakışıyordu.
 *
 * Sabit bir "boş köşe" yok: panel 270×268, yani ekranın yaklaşık %8'i ve
 * beş haritanın hiçbir köşesi bu boyutta serbest değil (`M8-B01`'in
 * taraması bunu zaten göstermişti). Çözüm sabit yer değil **kaçınma**.
 */

/** Panelin dış ölçüsü. */
export const PANEL_W = 270;
export const PANEL_H = 268;

/** Mantıksal ekran (CLAUDE.md Teknoloji). */
const EKRAN_W = 1280;
const EKRAN_H = 720;

/** Kenar payı — HUD'un geri kalanıyla aynı. */
const PAY = 12;

/** Kule **solda** ise panel buraya. */
export const PANEL_SAG = {
  x: EKRAN_W - PAY - PANEL_W,
  y: EKRAN_H - PAY - PANEL_H,
} as const;

/**
 * Kule **sağda** ise panel buraya.
 *
 * Yetenek düğmelerinin (`28,622 – 170,707`) **üstünde** duruyor: alt
 * kenarı 622'den `PAY` kadar yukarıda bitiyor.
 */
export const PANEL_SOL = {
  x: PAY,
  y: 622 - PAY - PANEL_H,
} as const;

/** Ekranın orta ekseni — panelin hangi yana kaçacağını bu belirliyor. */
export const PANEL_ESIK = EKRAN_W / 2;

/**
 * Seçili yapı noktasının `x`'ine göre panelin köşesi.
 *
 * Değişmez kural: **panel hiçbir zaman incelenen kuleyi örtmez.** Bu
 * eşikten çıkıyor — `x > 640` olan bir nokta `PANEL_SOL`'un (12-282)
 * içine, `x <= 640` olan bir nokta `PANEL_SAG`'ın (998-1268) içine
 * düşemez. `panelLayout.test.ts` bunu beş haritanın gerçek noktalarıyla
 * doğruluyor.
 */
export function panelKonumu(spotX: number): { readonly x: number; readonly y: number } {
  return spotX > PANEL_ESIK ? PANEL_SOL : PANEL_SAG;
}

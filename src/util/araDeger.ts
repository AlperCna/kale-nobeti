/**
 * **Ara değer üretimi (interpolation) — `M65`.**
 *
 * `M64` mantığı sabit adıma aldı (`SABIT_ADIM_MS`, 1000/60). Bu, dengeyi
 * kare süresinden kurtardı ama bir bedel bıraktı: 144 Hz ekranda çizim
 * saniyede 144 kez oluyor, mantık 60 kez. Aradaki 84 karede hiçbir şey
 * kıpırdamıyor ve hareket **kesik** görünüyor.
 *
 * Çare, çizimi son iki mantık durumu **arasında** yapmak: her kare,
 * konum `onceki` ile `gercek` arasında `oran` kadar ilerletiliyor. Mantık
 * hâlâ 60 Hz'de koşuyor ve sonucu birebir aynı — değişen yalnız gözün
 * gördüğü şey.
 *
 * **Bu dosya Phaser'sız** (TIER 1 kural 11): `x`/`y` alanı olan her şeye
 * uyuyor, `node`'da test ediliyor. Phaser tarafı yalnız hangi nesnelerin
 * geçeceğine karar veriyor.
 *
 * ## Neden dört alan
 *
 * `x`/`y` hem mantığın hem çizimin kullandığı alan (Phaser'da sprite'ın
 * konumu). Çizim oraya ara değeri yazdığı için mantığın gerçek konumu
 * ayrıca saklanmalı, yoksa bir sonraki adım **ara değerden** devam eder
 * ve hedefleme yarım adım yanılır. Sıra şu:
 *
 * ```
 * kare başı   gercegeDon()    x ← gercek   (önceki karenin ara değeri silinir)
 * adım başı   adimBasla()     onceki ← x
 * adım        (mantık x'i hareket ettirir)
 * döngü sonu  adimBitti()     gercek ← x
 * çizim       uygula(oran)    x ← onceki..gercek arası
 * ```
 */

/** Ara değer üretilebilen nesne. Phaser sprite'ı da bu şekle uyuyor. */
export interface AraDegerli {
  x: number;
  y: number;
  oncekiX: number;
  oncekiY: number;
  gercekX: number;
  gercekY: number;
}

/**
 * **Işınlanma** — dört alanı da şimdiki konuma eşitler.
 *
 * Doğan düşman, ateşlenen mermi ve havuza dönen nesne için zorunlu
 * (TIER 1 kural 3). Yapılmazsa `onceki` havuzdaki bir önceki sahibinin
 * son konumunu taşır ve nesne ilk karesinde **ekranın öbür ucundan
 * süzülerek** gelir.
 */
export function konumIsinla(n: AraDegerli): void {
  n.oncekiX = n.x;
  n.oncekiY = n.y;
  n.gercekX = n.x;
  n.gercekY = n.y;
}

/** Adım başında: bu adımın *çıkış* konumunu sakla. */
export function adimBasla(n: AraDegerli): void {
  n.oncekiX = n.x;
  n.oncekiY = n.y;
}

/** Adım(lar) bitince: mantığın vardığı gerçek konumu sakla. */
export function adimBitti(n: AraDegerli): void {
  n.gercekX = n.x;
  n.gercekY = n.y;
}

/** Çizimden önce: mantığın gerçek konumuna dön. */
export function gercegeDon(n: AraDegerli): void {
  n.x = n.gercekX;
  n.y = n.gercekY;
}

/**
 * Çizim konumunu iki mantık durumu arasına koyar.
 *
 * `oran` biriktiricinin doluluğu (0..1). Aralık dışına çıkarsa kırpılıyor:
 * bir karede birden çok adım koşulduğunda ya da tavana dayanıldığında
 * (`KARE_BASINA_MAKS_ADIM`) oran 1'i aşabilir ve nesne gerçek konumunun
 * **ötesine** taşardı — geleceği tahmin etmek (extrapolation) titreme
 * üretir, bilerek yapılmıyor.
 */
export function araDegerUygula(n: AraDegerli, oran: number): void {
  const o = oran < 0 ? 0 : oran > 1 ? 1 : oran;
  n.x = n.oncekiX + (n.gercekX - n.oncekiX) * o;
  n.y = n.oncekiY + (n.gercekY - n.oncekiY) * o;
}

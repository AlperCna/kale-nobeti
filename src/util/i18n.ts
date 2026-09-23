import { DEFAULT_LOCALE, STRINGS } from '../data/strings';
import type { Locale, StringKey } from '../data/strings';

/**
 * Metin erişimcisi. S63.
 *
 * Çağrı yerleri dil bilmez: `t('play')` yazılır, `STRINGS.tr.play` değil.
 *
 * Boş çeviri **varsayılan dile düşer** — eksik bir anahtar boş buton
 * değil Türkçe metin üretir. Varsayılan da boşsa anahtarın kendisi döner:
 * eksik metin ekranda hemen görünür olsun diye, sessizce boş kalmasın.
 *
 * TIER 1 kural 11: bu dosya Phaser'a dokunmaz.
 */

/**
 * Etkin dil. Modül düzeyinde **değişken** — `Y03` Adım 3.
 *
 * Alternatif, `locale`'i 20 çağrı yerinin hepsinden geçirmekti; bu
 * `t('play')` sözleşmesini ("çağrı yerleri dil bilmez") bozardı. Tek
 * yazıcı `setLocale` ve onu yalnız `Settings` çağırıyor (kurucuda ve
 * `set('locale', …)`'de), yani durum iki yerde tutulmuyor: kalıcı kayıt
 * `Settings`'te, etkin değer burada, ikincisi birincisinden türüyor.
 */
let mevcut: Locale = DEFAULT_LOCALE;

/** Yalnız `systems/Settings.ts` çağırır — bkz. `mevcut` yorumu. */
export function setLocale(locale: Locale): void {
  mevcut = locale;
  belgeDiliniYaz(locale);
}

/**
 * `<html lang>` de etkin dili izliyor — `M98`.
 *
 * `index.html` sayfayı `lang="tr"` ile açıyor ve oyuncu İngilizce'ye
 * geçince belge **yalan söylüyordu**: ekran okuyucu Türkçe sesle
 * İngilizce metin okuyor, tarayıcı da “bu sayfayı çevir?” diye soruyor.
 * Tek yazıcı burada, çünkü etkin dilin adresi zaten burası —
 * `Settings`'in iki çağrı yeri (kurucu ve `set`) kendiliğinden kapsıyor.
 *
 * `document` koruması kural 11'in komşusu: bu dosya `node`'da test
 * ediliyor ve orada DOM yok (`util/storage.ts`'in gizli sekme
 * korumasıyla aynı gerekçe).
 */
function belgeDiliniYaz(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return mevcut;
}

export function t(key: StringKey, locale: Locale = mevcut): string {
  const value = STRINGS[locale][key];
  if (value !== '') return value;

  const fallback = STRINGS[DEFAULT_LOCALE][key];
  if (fallback !== '') return fallback;

  return key;
}

/**
 * **Dile bağlı BİÇİM — `M129`.**
 *
 * `t()` metni çeviriyordu ama **sayının biçimi** kodda kalmıştı ve iki
 * yönde birden yanlıştı. Tarayıcıda İngilizce arayüzde görüldü:
 * `Troll — armor 4, magic resist %15` (yüzde işareti Türkçe yerinde) ve
 * `Burn 11/sn · 4 sn` (birim hiç çevrilmemiş). Aynanın öteki yüzü de
 * vardı: kule panelinin kapsama değeri `15%` yazıyordu, yani **Türkçe
 * arayüzde İngilizce biçim**.
 *
 * Kural tek adreste: yüzde işareti Türkçede sayının **önünde**,
 * İngilizcede **arkasında**. Birim sözcüğü koda yazılmıyor —
 * `strings.ts`'ten geliyor (CLAUDE.md: oyuncuya görünen hiçbir metin
 * kodun içinde yazılmaz).
 */
export function yuzde(oran: number, locale: Locale = mevcut): string {
  const n = Math.round(oran * 100);
  return locale === 'tr' ? `%${n}` : `${n}%`;
}

/** `4 sn` · `4 s`. */
export function saniye(deger: number, locale: Locale = mevcut): string {
  return `${deger} ${t('unitSec', locale)}`;
}

/** `11/sn` · `11/s` — saniye BAŞINA. */
export function saniyede(deger: number, locale: Locale = mevcut): string {
  return `${deger}${t('unitPerSec', locale)}`;
}

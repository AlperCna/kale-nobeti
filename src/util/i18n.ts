import { DEFAULT_LOCALE, STRINGS } from '../data/strings';
import type { Locale, StringKey } from '../data/strings';

/**
 * Metin erişimcisi. S63.
 *
 * Çağrı yerleri dil bilmez: `t('play')` yazılır, `STRINGS.tr.play` değil.
 *
 * Boş çeviri **varsayılan dile düşer** — `en` doldurulana kadar oyun
 * Türkçe görünür, boş buton çıkmaz. Varsayılan da boşsa anahtarın kendisi
 * döner: eksik metin ekranda hemen görünür olsun diye, sessizce boş
 * kalmasın.
 *
 * TIER 1 kural 11: bu dosya Phaser'a dokunmaz.
 */
export function t(key: StringKey, locale: Locale = DEFAULT_LOCALE): string {
  const value = STRINGS[locale][key];
  if (value !== '') return value;

  const fallback = STRINGS[DEFAULT_LOCALE][key];
  if (fallback !== '') return fallback;

  return key;
}

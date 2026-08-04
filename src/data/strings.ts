/**
 * Oyuncuya görünen tüm metinler. S63.
 *
 * Düz nesne DEĞİL, **dil haritası**. Kullanım `t('play')` biçimindedir
 * (bkz. `src/util/i18n.ts`) — çağrı yerleri dil bilmez.
 *
 * `en` şimdilik boş. Çeviri M7'de bir oturumluk iş; **yapıyı** sonradan
 * eklemek `scenes/`'in tamamına dokunmak demek (CLAUDE.md Teknoloji).
 *
 * TIER 1 kural 11: bu dosya Phaser'a dokunmaz.
 */

export type Locale = 'tr' | 'en';

export const DEFAULT_LOCALE: Locale = 'tr';

/** Türkçe tam sözlük. Anahtar kümesini bu tanımlıyor. */
const TR = {
  play: 'Oyna',
  pause: 'Duraklat',
  resume: 'Devam',
  speed: 'Hız',
} as const;

export type StringKey = keyof typeof TR;

/**
 * `Record<Locale, Record<StringKey, string>>` tipi, `en`'in **tam olarak
 * aynı anahtarlara** sahip olmasını derleyicide zorunlu kılıyor.
 * Bir anahtar eklenip `en`'e eklenmezse `npm run typecheck` kırılır.
 */
export const STRINGS: Record<Locale, Record<StringKey, string>> = {
  tr: TR,
  en: {
    play: '',
    pause: '',
    resume: '',
    speed: '',
  },
};

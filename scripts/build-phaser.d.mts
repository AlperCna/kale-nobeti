/**
 * `scripts/build-phaser.mjs` için tip bildirimi — `Y11`.
 *
 * `vite.config.ts` strict TypeScript ve o betiği `import` ediyor; bildirim
 * olmadan `npm run typecheck` "implicitly has an 'any' type" ile kırılıyor
 * (TIER 1 kural 5).
 *
 * Dosya adı `.d.mts` olmak zorunda: TypeScript bir `.mjs` modülünün
 * tiplerini **aynı adlı** `.d.mts` dosyasından alıyor. `build-phaser.d.ts`
 * içinde `declare module './scripts/build-phaser.mjs'` denendi ve
 * çalışmadı — göreli belirteçli `declare module` ambient sayılmıyor.
 *
 * Betiğin kendisi `.mjs` kalıyor: Vite'ın yapılandırma yükleyicisi onu
 * derlemeden çalıştırabiliyor ve `node scripts/build-phaser.mjs` de
 * doğrudan koşuyor. `.mts`'e çevirmek ikisini de tip-soyma bayrağına
 * bağlardı.
 */

/** Üretilen özel Phaser paketinin mutlak yolu. */
export const OZEL_PHASER_YOLU: string;

/** Gerekiyorsa üretir, tazeyse atlar; paketin mutlak yolunu döner. */
export function uretPhaser(): Promise<string>;

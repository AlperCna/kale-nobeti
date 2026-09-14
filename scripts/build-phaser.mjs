/**
 * Phaser özel yapımını üretir — `Y11`.
 *
 * Girdi:  `src/vendor/phaser-custom.js` (hangi modüller, neden — orada)
 * Çıktı:  `node_modules/.phaser-custom/phaser.mjs`
 *
 * **`vite.config.ts` bunu kendisi çağırıyor**, npm script'i olarak değil.
 * İlk tasarım `prebuild`/`predev` yaşam döngüsüydü ve bir açığı vardı:
 * Browser pane'in `launch.json`'ı `vite`'ı **doğrudan** çalıştırıyor,
 * `npm run dev` değil — yani `predev` hiç koşmuyor ve bayat bir paket
 * sessizce servis edilebiliyordu. Yapılandırmadan çağrılınca hangi
 * yoldan başlatılırsa başlatılsın (npm, pane, IDE, CI) kaçamıyor.
 *
 * Elle de çağrılabilir: `node scripts/build-phaser.mjs`
 *
 * ## Neden ayrı bir üretim adımı gerekti
 *
 * İlk deneme `vite.config.ts` içinden doğrudan `src/vendor/phaser-custom.js`
 * takma adıydı ve **üretimde çalıştı, dev'de çalışmadı**: Vite dev sunucusu
 * `phaser/src/**` CJS ağacını esbuild ile ön-paketliyor, ön-paketleme
 * eklenti `transform` kancalarını atlıyor ve aşağıdaki bayrak değişimi
 * oraya hiç ulaşmıyordu.
 *
 * Yamamak yerine ayrı adım seçildi çünkü alternatif — dev'de hazır
 * `phaser-arcade-physics.js`, üretimde özel yapım — bu değişiklikte **en
 * kötü hata biçimi**: eksik bir modül dev'de sorunsuz çalışır, yalnız
 * yayınlanmış oyunda çöker. Tek bir üretilmiş dosya ikisine de veriliyor,
 * yani denenen şey yayınlanan şey.
 *
 * ## Webpack bayrakları
 *
 * Phaser'ın `src/` ağacı webpack `DefinePlugin` küresellerini kullanıyor:
 * `if (typeof WEBGL_RENDERER)` 37 yerde, `CANVAS_RENDERER` 30,
 * `PLUGIN_FBINSTANT` 9, `FEATURE_SOUND` 6, `PLUGIN_CAMERA3D` 5,
 * `WEBGL_DEBUG` 4.
 *
 * Tanımsız bırakılırsa `typeof` her zaman `'undefined'` döner ve bu
 * **truthy** — yani `if (typeof PLUGIN_FBINSTANT)` kapalı olması gereken
 * FBInstant eklentisini AÇAR. "Tanımlamazsak sorun olmaz" burada tam
 * tersine çalışıyor.
 *
 * esbuild/Vite `define`'ı anahtar olarak `typeof X` ifadesini kabul
 * etmiyor (yalnız tanımlayıcı ve noktalı yol), ve hiçbir değer `typeof`
 * altında falsy olamaz (`typeof` her zaman boş olmayan bir dize döner).
 * O yüzden metin değişimi şart. Değerler
 * `node_modules/phaser/config/webpack.dist.config.js` ile **birebir**
 * aynı — uydurulmadı, kopyalandı.
 */
import { build } from 'vite';
import { existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const GIRIS = join(KOK, 'src/vendor/phaser-custom.js');
const CIKTI_DIZIN = join(KOK, 'node_modules/.phaser-custom');
const CIKTI = join(CIKTI_DIZIN, 'phaser.mjs');

const BAYRAKLAR = {
  CANVAS_RENDERER: 'true',
  WEBGL_RENDERER: 'true',
  WEBGL_DEBUG: 'false',
  EXPERIMENTAL: 'false',
  PLUGIN_3D: 'false',
  PLUGIN_CAMERA3D: 'false',
  PLUGIN_FBINSTANT: 'false',
  FEATURE_SOUND: 'true',
};

const TERS_BOLU = String.fromCharCode(92);

function phaserBayrakEklentisi() {
  const desen = new RegExp('typeof (' + Object.keys(BAYRAKLAR).join('|') + ')(?![A-Za-z0-9_])', 'g');
  return {
    name: 'phaser-bayraklari',
    enforce: 'pre',
    transform(kod, id) {
      // Windows'ta `id` ters bölü taşıyor; tek biçime indiriliyor.
      if (!id.split(TERS_BOLU).join('/').includes('phaser/src/')) return null;

      let degisti = false;
      let yeni = kod.replace(desen, (_e, ad) => {
        degisti = true;
        return BAYRAKLAR[ad];
      });

      // `global.Phaser = Phaser` (phaser-core.js sonu) — Node küreseli,
      // tarayıcıda yok; webpack kendi shim'iyle çözüyordu.
      if (yeni.includes('global.Phaser')) {
        yeni = yeni.split('global.Phaser').join('globalThis.Phaser');
        degisti = true;
      }

      return degisti ? { code: yeni, map: null } : null;
    },
  };
}

/**
 * Taze mi? Çıktı hem giriş dosyasından hem de kurulu Phaser sürümünden
 * yeni olmalı. Sürüm karşılaştırması `package.json`'ın mtime'ıyla
 * yapılıyor: `npm install` yeni bir Phaser getirdiğinde o dosya da
 * yenileniyor, yani sessizce bayat kalmıyor.
 */
function taze() {
  if (!existsSync(CIKTI)) return false;
  const require_ = createRequire(import.meta.url);
  const phaserPkg = require_.resolve('phaser/package.json');
  const c = statSync(CIKTI).mtimeMs;
  return c > statSync(GIRIS).mtimeMs && c > statSync(phaserPkg).mtimeMs;
}

/** Üretilen paketin yolu — `vite.config.ts` takma adı buna bağlıyor. */
export const OZEL_PHASER_YOLU = CIKTI;

/** Gerekiyorsa üretir; tazeyse hiçbir şey yapmaz. */
export async function uretPhaser() {
  if (taze()) return CIKTI;

  mkdirSync(CIKTI_DIZIN, { recursive: true });
  await build({
    configFile: false,
    logLevel: 'warn',
    plugins: [phaserBayrakEklentisi()],
    build: {
      lib: { entry: GIRIS, formats: ['es'], fileName: () => 'phaser.mjs' },
      outDir: CIKTI_DIZIN,
      emptyOutDir: false,
      minify: false, // Uygulama build'i zaten küçültüyor; burada okunur kalsın.
      target: 'es2022',
    },
  });
  const kb = (statSync(CIKTI).size / 1024).toFixed(0);
  console.log(`[phaser] özel yapım üretildi — ${kb} KB ham`);
  return CIKTI;
}

// Doğrudan çalıştırıldıysa (npm script / elle) üret.
if (process.argv[1] && process.argv[1].split(TERS_BOLU).join('/').endsWith('scripts/build-phaser.mjs')) {
  const vardi = taze();
  await uretPhaser();
  if (vardi) console.log('[phaser] özel yapım taze, atlandı');
}

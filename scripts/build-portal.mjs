/**
 * Portal yapımı — `npm run build:poki` / `build:crazygames`.
 *
 * ## Neden bir betik, neden `VITE_PORTAL=poki vite build` değil
 *
 * O sözdizimi POSIX kabuğuna ait; Windows'ta `cmd` ve PowerShell'de
 * çalışmıyor ve bu depo Windows'ta geliştiriliyor. Yaygın çözüm
 * `cross-env` ama o yeni bir bağımlılık (`CLAUDE.md` Teknoloji:
 * "Harici bağımlılık eklemeden önce sor"). Node zaten elimizde ve
 * `spawn` ortam değişkenini her platformda aynı şekilde geçiriyor.
 *
 * ## Üç yapım, üç farklı paket
 *
 * `vite.config.ts` SDK betiğini yapım hedefine göre `<head>`'e enjekte
 * ediyor ve `portalSec()` `import.meta.env.VITE_PORTAL`'ı derleme
 * zamanında okuduğu için **seçilmeyen portalın kodu pakete hiç
 * girmiyor.** Ölçüldü (`M9-T04`):
 *
 * | Yapım | `<head>` betiği | `PokiSDK` | `CrazyGames` |
 * |---|---|---|---|
 * | `build` (itch.io) | yok | 0 | 0 |
 * | `build:poki` | `game-cdn.poki.com/.../poki-sdk.js` | 1 | 0 |
 * | `build:crazygames` | `sdk.crazygames.com/...-v3.js` | 0 | 1 |
 *
 * itch.io sürümünde **hiçbiri** olmamalı: `research/05`'in yasak
 * listesi hem "üçüncü taraf reklam (yalnız Poki SDK)" hem "dışa giden
 * bağlantılar" diyor ve itch'te bir portal CDN'ine istek atmanın
 * karşılığı yok.
 */
import { spawn } from 'node:child_process';

const HEDEFLER = new Set(['poki', 'crazygames']);
const hedef = process.argv[2];

if (!HEDEFLER.has(hedef)) {
  console.error(`[build-portal] hedef 'poki' ya da 'crazygames' olmalı, gelen: ${hedef ?? '(yok)'}`);
  process.exit(1);
}

console.log(`[build-portal] hedef: ${hedef}`);

const cocuk = spawn('npm', ['run', 'build'], {
  env: { ...process.env, VITE_PORTAL: hedef },
  stdio: 'inherit',
  // Windows'ta `npm` bir `.cmd`; kabuk olmadan `spawn` onu bulamıyor.
  shell: true,
});

cocuk.on('exit', (kod) => process.exit(kod ?? 1));

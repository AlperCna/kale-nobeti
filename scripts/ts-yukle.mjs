/**
 * Node betiklerinden TypeScript modülü okumanın tek yolu.
 *
 * ## Neden var
 *
 * `kurallar.mjs` ve `check-bg.mjs` denge verisini `src/data/*.ts`'ten
 * **canlı** okumak zorunda — elle kopyalanan bir tablo, projenin en
 * pahalı hatasının (2200 HP'lik boss) tam kaynağıydı.
 *
 * Eski çözüm: `src/` altına geçici bir vitest dosyası yazıp veriyi
 * JSON'a döktürmek, sonra silmek. **İki kez elde patladı**: build yarıda
 * kesilince dosya geride kaldı ve bir sonraki `npm run test`'i kırdı
 * (zaman aşımı, 871 test içinde tek bir anlamsız hata).
 *
 * Denenen ve **çalışmayan** iki yama, bir daha denenmesin diye:
 *
 * - `vitest.config.ts`'e `exclude` eklemek — vitest ACIKÇA verilen
 *   dosyayı da exclude ile eliyor, yani betiğin kendi koşusu da ölüyor.
 * - Geçici dosyayı depo köküne taşımak — bu sefer `include`
 *   (`src/**` + `*.test.ts`) desenine girmiyor ve yine koşmuyor.
 *
 * Doğru çözüm mekanizmayı tümden kaldırmak: Vite zaten bağımlılık ve
 * kendi SSR yükleyicisi TypeScript'i doğrudan içe aktarabiliyor. Geçici
 * dosya yok, vitest koşusu yok, geride kalacak bir şey yok.
 *
 * Yeni bağımlılık da yok — `vite-node`/`tsx` eklemeye gerek kalmadı.
 */
import { createServer } from 'vite';

/**
 * Verilen modülleri `src/` köküne göre yükler ve dışa aktardıklarını
 * döner.
 *
 * @param {string[]} yollar  Örn. `['/src/data/maps.ts', '/src/data/towers.ts']`
 * @returns {Promise<Record<string, unknown>[]>} Her yolun modül nesnesi, sırayla.
 */
export async function tsYukle(yollar) {
  const sunucu = await createServer({
    configFile: false,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    return await Promise.all(yollar.map((y) => sunucu.ssrLoadModule(y)));
  } finally {
    await sunucu.close();
  }
}

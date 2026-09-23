/**
 * Poki ve CrazyGames bağdaştırıcıları — `M9-T01`.
 *
 * İkisi de SDK'yı **sayfaya bir `<script>` ile** getiriyor ve global bir
 * nesne bırakıyor (`window.PokiSDK`, `window.CrazyGames`). Bu dosya o
 * globali arıyor; **yoksa `null` dönüyor** ve `main.ts` `PORTAL_YOK`'ta
 * kalıyor.
 *
 * ## Neden derleme zamanı seçimi
 *
 * İki SDK betiği aynı sayfaya konulamaz — ikisi de reklam çerçevesi
 * kuruyor ve `research/05`'in yasak listesi *"üçüncü taraf reklam (yalnız
 * Poki SDK)"* diyor. Ayrıca itch.io sürümünde **hiçbiri** olmamalı:
 * aynı liste *"dışa giden bağlantılar"*ı da yasaklıyor ve itch'te bir
 * portal CDN'ine istek atmanın karşılığı yok.
 *
 * Bu yüzden betiği `vite.config.ts` **yapım hedefine göre** ekliyor
 * (`VITE_PORTAL=poki|crazygames`, varsayılan yok) ve burası yalnız
 * çalışma zamanında globalin gerçekten geldiğini doğruluyor. İkisi
 * ayrı: betik eklenmiş ama SDK inememiş olabilir (ağ), o durumda da
 * oyun çalışmalı.
 *
 * TIER 1 kural 11: Phaser yok. `window`'a dokunuyor ama bu tarayıcı
 * küreseli, Phaser değil; testler bu dosyayı içe aktarmıyor.
 */
import type { PortalAdapter } from './Portal';

/** SDK globallerinin bizim kullandığımız yüzeyi — `any` yok (kural 5). */
interface PokiGlobal {
  init?: () => Promise<void>;
  gameplayStart: () => void;
  gameplayStop: () => void;
  commercialBreak: (beforeAd?: () => void) => Promise<void>;
  measure?: (kategori: string, ne: string, eylem: string) => void;
}

interface CrazyGlobal {
  SDK: {
    init?: () => Promise<void>;
    game: {
      gameplayStart: () => void;
      gameplayStop: () => void;
      /** v3'te reklam çağrısı ayrı bir ad alanında. */
      [k: string]: unknown;
    };
    ad?: { requestAd: (tur: string) => Promise<void> };
  };
}

function kuresel<T>(ad: string): T | null {
  const w = globalThis as unknown as Record<string, unknown>;
  const v = w[ad];
  return v === undefined || v === null ? null : (v as T);
}

/**
 * Poki.
 *
 * `commercialBreak` bir `Promise` dönüyor ve **beklenmiyor** — oyun
 * akışı reklama bağlanamaz. Ses kısma Poki'nin kendi `beforeAd`
 * geri çağrısıyla değil, bizim `sesiKis`'imizle yapılıyor: reklam hiç
 * gelmese bile (engelleyici, ağ) ses geri açılsın.
 */
/**
 * **SDK hazır olana kadar olayları KUYRUKLA** — `M131`.
 *
 * İki portalın dokümanı da aynı şeyi söylüyor ve bu kod ikisini de
 * ihlal ediyordu:
 *
 * - CrazyGames: *"It is important to `await` for the initialization
 *   since it happens asynchronously, and **the SDK is unusable until
 *   initialized**."* — ve init'in *yükleme ekranında*, oyun başlamadan
 *   yapılması öneriliyor.
 * - Poki: belgelenen kalıp `PokiSDK.init().then(() => { ... oyuna devam
 *   et ... }).catch(() => { ... yine de yükle ... })`, yani oyunun
 *   başlaması `then` içinde.
 *
 * Buradaki kod `void sdk.init()` diyordu: başlatma ateşlenip
 * **beklenmiyordu** ve bağdaştırıcı hemen dönüyordu. `gameplayStart`
 * oyuncunun sahnedeki **ilk `pointerdown`**'ında atıyor (`GameScene`),
 * yani hızlı tıklayan oyuncuda init'ten önce gidebiliyordu — ve
 * CrazyGames'in cümlesine göre o olay düşerdi.
 *
 * **Oyun yine beklemiyor.** Poki'nin kendi `catch` dalı *"yine de
 * yükle"* diyor ve platform şartı *"reklam engelleyici açıkken de
 * oynanabilmeli"*. Bu yüzden çare init'i beklemek değil, olayları
 * **sıraya koyup** init çözülünce (ya da reddedilince) boşaltmak:
 * oyun hiç gecikmiyor, hiçbir olay düşmüyor, sıra korunuyor.
 */
function initKapisi(init: (() => Promise<unknown>) | undefined): (is: () => void) => void {
  if (init === undefined) return (is) => is();
  let hazir = false;
  const bekleyen: (() => void)[] = [];
  const bosalt = (): void => {
    hazir = true;
    for (const is of bekleyen) is();
    bekleyen.length = 0;
  };
  // Reddetme de kapıyı açıyor: Poki'nin `catch` dalının karşılığı.
  void init().then(bosalt, bosalt);
  return (is) => {
    if (hazir) is();
    else bekleyen.push(is);
  };
}

export function pokiAdapter(): PortalAdapter | null {
  const sdk = kuresel<PokiGlobal>('PokiSDK');
  if (sdk === null) return null;
  const kapi = initKapisi(sdk.init === undefined ? undefined : () => sdk.init!());
  return {
    ad: 'poki',
    gameplayStart: () => kapi(() => sdk.gameplayStart()),
    gameplayStop: () => kapi(() => sdk.gameplayStop()),
    commercialBreak: (sesiKis) => {
      kapi(() => {
        sesiKis(true);
        void sdk
          .commercialBreak()
          .catch(() => {})
          .finally(() => sesiKis(false));
      });
    },
    // `sdk.poki.com/game-events` — `start`/`complete`/`fail` özel anlamlı.
    measure: (k, n, e) => sdk.measure?.(k, n, e),
  };
}

/**
 * CrazyGames v3.
 *
 * `measure` **uygulanmıyor**: dokümanlarında özel oyun olayı API'si
 * bulunamadı (zorunlu `gameplayStart`/`gameplayStop` var, özel olay
 * yok). `Portal.olc` isteğe bağlı çağırdığı için bu sessizce düşüyor —
 * yani `olcum.ts`'teki olaylar Poki yapımında gidiyor, CrazyGames
 * yapımında gitmiyor ve **hiçbir sahne bunu bilmek zorunda değil**.
 */
export function crazyAdapter(): PortalAdapter | null {
  const cg = kuresel<CrazyGlobal>('CrazyGames');
  if (cg === null) return null;
  const kapi = initKapisi(cg.SDK.init === undefined ? undefined : () => cg.SDK.init!());
  return {
    ad: 'crazygames',
    gameplayStart: () => kapi(() => cg.SDK.game.gameplayStart()),
    gameplayStop: () => kapi(() => cg.SDK.game.gameplayStop()),
    commercialBreak: (sesiKis) => {
      kapi(() => {
        const reklam = cg.SDK.ad;
        if (reklam === undefined) {
          sesiKis(true);
          sesiKis(false);
          return;
        }
        sesiKis(true);
        void reklam
          .requestAd('midgame')
          .catch(() => {})
          .finally(() => sesiKis(false));
      });
    },
  };
}

/**
 * Yapım hedefine göre bağdaştırıcıyı seçer.
 *
 * `import.meta.env.VITE_PORTAL` derleme zamanında sabitleniyor, yani
 * seçilmeyen portalın kodu pakete **hiç girmiyor**.
 */
export function portalSec(): PortalAdapter | null {
  const hedef = import.meta.env.VITE_PORTAL;
  if (hedef === 'poki') return pokiAdapter();
  if (hedef === 'crazygames') return crazyAdapter();
  return null;
}

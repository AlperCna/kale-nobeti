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
export function pokiAdapter(): PortalAdapter | null {
  const sdk = kuresel<PokiGlobal>('PokiSDK');
  if (sdk === null) return null;
  void sdk.init?.();
  return {
    ad: 'poki',
    gameplayStart: () => sdk.gameplayStart(),
    gameplayStop: () => sdk.gameplayStop(),
    commercialBreak: (sesiKis) => {
      sesiKis(true);
      void sdk
        .commercialBreak()
        .catch(() => {})
        .finally(() => sesiKis(false));
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
  void cg.SDK.init?.();
  return {
    ad: 'crazygames',
    gameplayStart: () => cg.SDK.game.gameplayStart(),
    gameplayStop: () => cg.SDK.game.gameplayStop(),
    commercialBreak: (sesiKis) => {
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

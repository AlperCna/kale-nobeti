/// <reference types="vite/client" />

/** `M8-T13` — `vite.config.ts` `define` ile gömülüyor. */
declare const __APP_VERSION__: string;

/**
 * `M9-T01` — portal hedefi. `VITE_PORTAL=poki|crazygames` ile derleniyor;
 * verilmezse SDK yok ve `Portal` `PORTAL_YOK`'ta kalıyor (itch.io sürümü).
 */
interface ImportMetaEnv {
  readonly VITE_PORTAL?: 'poki' | 'crazygames';
}

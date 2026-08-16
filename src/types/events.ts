import type { Speed } from './common';

/**
 * Sistemler birbirini doğrudan çağırmaz, EventBus üzerinden haberleşir
 * (CLAUDE.md Mimari kurallar).
 *
 * İlk beş olay CLAUDE.md'de listeli. Son ikisi M0'da eklendi ve **S06'da
 * onaylandı** — M0 ve M1 boyunca kullanımda kaldılar, geçici değiller.
 */
export interface GameEvents {
  'enemy:killed': { readonly id: number; readonly gold: number };
  'wave:started': { readonly index: number };
  'gold:changed': { readonly total: number };
  'life:lost': { readonly remaining: number };
  'tower:placed': { readonly spotIndex: number };

  /** S06 onaylandı. HUD hız butonu yayıyor. */
  'speed:changed': { readonly scale: Speed };
  /** S06 onaylandı. ESC/boşluk duraklatması yayıyor. */
  'game:paused': { readonly paused: boolean };

  /**
   * Kayıt başarısız — **yalnız bir kez** yayılıyor (TIER 1 kural 10:
   * "kayıt başarısızsa oyuncuya bir kez bildirilir"). Gizli sekmede
   * ayarlar kalıcı olmuyor; oyun çalışmaya devam ediyor (M6).
   */
  'save:failed': { readonly once: boolean };

  /** M6-T11 — `SoundSystem` `tower_upgrade.m4a` çalıyor. */
  'tower:upgraded': { readonly spotIndex: number };
  /**
   * Yetersiz altınla satın alma/yükseltme denendi (`#menuButonu`
   * devre dışıyken tıklandı). M6-T11 — `error.m4a`.
   */
  'purchase:denied': Record<string, never>;
}

export type GameEventName = keyof GameEvents;

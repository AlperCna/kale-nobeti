import type { Speed } from './common';

/**
 * Sistemler birbirini doğrudan çağırmaz, EventBus üzerinden haberleşir
 * (CLAUDE.md Mimari kurallar).
 *
 * İlk beş olay CLAUDE.md'de listeli. Son ikisi M0'ın kendi özellikleri —
 * S06 onaylanana kadar geçici işaretli.
 */
export interface GameEvents {
  'enemy:killed': { readonly id: number; readonly gold: number };
  'wave:started': { readonly index: number };
  'gold:changed': { readonly total: number };
  'life:lost': { readonly remaining: number };
  'tower:placed': { readonly spotIndex: number };

  /** GEÇİCİ — S06. CLAUDE.md'deki örnek listede yok, M0-T09 kullanıyor. */
  'speed:changed': { readonly scale: Speed };
  /** GEÇİCİ — S06. */
  'game:paused': { readonly paused: boolean };
}

export type GameEventName = keyof GameEvents;

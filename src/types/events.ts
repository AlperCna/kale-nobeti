import type { Speed } from './common';

/**
 * Sistemler birbirini doğrudan çağırmaz, EventBus üzerinden haberleşir
 * (CLAUDE.md Mimari kurallar).
 *
 * İlk beş olay CLAUDE.md'de listeli. Son ikisi M0'da eklendi ve **S06'da
 * onaylandı** — M0 ve M1 boyunca kullanımda kaldılar, geçici değiller.
 */
/**
 * `gold:changed`'in **neden** yayıldığı — `Y06`: `SoundSystem` bunu
 * kullanıp yalnız "haber değeri" olan artışlarda (`waveBonus`,
 * `earlyBonus`, `sell`) `gold` sesi çalıyor. `kill` sessiz — görsel
 * karşılığı zaten var (altın uçuşu, `GoldFlight`) ve her ölümde
 * `enemy_death` ile aynı anda çalması sesleri anlamsızlaştırıyordu.
 */
export type GoldChangeReason = 'kill' | 'waveBonus' | 'earlyBonus' | 'sell' | 'spend';

export interface GameEvents {
  'enemy:killed': { readonly id: number; readonly gold: number };
  'wave:started': { readonly index: number };
  /**
   * M6-T11 — dalga bitince yayılıyor. `music_game` dalga 1 bitince başlıyor.
   *
   * `index` **1 tabanlı biten dalga numarası** (`wave:started`'ın 0 tabanlı
   * `index`'iyle aynı ad, farklı taban — `M10-T02`'de fark edildi, adlar
   * korunuyor çünkü ikisi de yayınlanmış sözleşme).
   *
   * Olay `WaveManager`'ın sayacı **artmadan önce** yayılıyor: dinleyici
   * "sıradaki dalga" isterse `index`'i 0 tabanlı sıradaki indeks olarak
   * okuyabilir (biten 1. dalga → sıradaki 0 tabanlı indeks 1). Tur kaydı
   * (`M10-T02`) tam olarak bunu yapıyor ve `WaveManager.test.ts` bu
   * eşitliği bağlıyor.
   */
  'wave:ended': { readonly index: number };
  'gold:changed': { readonly total: number; readonly reason: GoldChangeReason };
  'life:lost': { readonly remaining: number };
  'tower:placed': { readonly spotIndex: number };
  /** `Y09` — öğretici, ilk kışlada "bayrağı sürükle" ipucunu tetikliyor. */
  'barracks:placed': { readonly spotIndex: number };
  /**
   * Oyuncu geri bildirimi (2026-09-14) — bir kulenin menüsü (hedefleme
   * satırıyla) açıldı. Öğretici ilk seferinde modların ne olduğunu anlatıyor.
   */
  'targeting:opened': { readonly spotIndex: number };
  /**
   * Uçan rota ipucu (`MapRenderer.updateFlyerHint`) **görünür oldu** —
   * yalnız kapalı→açık geçişinde, her karede değil. Öğretici ilk seferinde
   * kesikli hattın ne olduğunu anlatıyor.
   */
  'wave:flyers': Record<string, never>;

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

  /**
   * M6-T11 — `SoundSystem` `tower_upgrade.m4a` çalıyor.
   *
   * `tier`: **0 tabanlı** yeni kademe indeksi (`M8-T07`). Başarım sistemi
   * "ilk T3" için buna bakıyor; olayda olmasaydı dinleyicinin kule
   * nesnesine ulaşması gerekirdi ve `systems/` Phaser'a bakamaz (k.11).
   */
  'tower:upgraded': { readonly spotIndex: number; readonly tier: number };
  /**
   * Yetersiz altınla satın alma/yükseltme denendi (`#menuButonu`
   * devre dışıyken tıklandı). M6-T11 — `error.m4a`.
   */
  'purchase:denied': Record<string, never>;

  /**
   * Aktif yetenek kullanıldı — `M8-T07`.
   *
   * `hits`: Meteor'un aynı atışta vurduğu düşman sayısı (Takviye'de 0).
   * Başarım "tek Meteor'la 5 düşman" için bunu sayıyor; sonuç `GameScene`
   * içinde zaten hesaplanıyordu, yalnız hiçbir yere duyurulmuyordu.
   */
  'ability:cast': { readonly id: string; readonly hits: number };
}

export type GameEventName = keyof GameEvents;

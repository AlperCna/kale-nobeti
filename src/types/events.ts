import type { AbilityId } from './ability';

/**
 * Sistemler birbirini doğrudan çağırmaz, EventBus üzerinden haberleşir
 * (CLAUDE.md Mimari kurallar).
 *
 * İlk beş olay CLAUDE.md'de listeli.
 *
 * **Her olayın en az bir yayanı ve en az bir dinleyeni olmak zorunda**
 * (bekçi 22. kuralı, `M104`). Gerekçe ölçüldü: `game:paused` yayılıp
 * hiç dinlenmiyordu ve bu bir kusuru gizliyordu. Dinleyicisiz durması
 * gereken bir olay varsa satırına `// bekçi: <gerekçe>` yazılır.
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
  /**
   * `index` **1 tabanlı dalga numarası** — ilk dalga `1`.
   *
   * **`M159` — bu satır yıllarca yanlış belgelendi.** Aşağıdaki
   * `wave:ended` notu *"`wave:started`'ın 0 tabanlı `index`'i"* diyor ve
   * ikisi arasında **bilinçli bir taban farkı** olduğunu anlatıyordu.
   * Öyle değil: `WaveManager` `wave.index`'i yayıyor, `data/waves.ts` ise
   * dalgaları `dalgaKur(1..10)` ile kuruyor (sonsuz mod da `waveAt(i + 1)`).
   * Üç dinleyicinin üçü de zaten 1 tabanlı davranıyordu — `RunStats`
   * (“Ulaşılan dalga” satırı), `waveSim` (`tahtayiHazirla(index - 1)`),
   * `SoundSystem` (`waveList.find((w) => w.index === index)`). Yani **kod
   * doğru, sözleşme metni yanlıştı**; metne güvenip `+1` yapan dördüncü
   * bir dinleyici sessizce bir dalga kayardı. Taban artık
   * `WaveManager.test.ts` içinde **bağlı**.
   */
  'wave:started': { readonly index: number };
  /**
   * M6-T11 — dalga bitince yayılıyor. `music_game` dalga 1 bitince başlıyor.
   *
   * `index` **1 tabanlı biten dalga numarası** — `wave:started` ile
   * **aynı taban** (`M159`; eskiden burada bir fark olduğu yazıyordu).
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
  /**
   * `M10` — sahada **kalkanlı** bir düşman göründü. Yalnız kalkan
   * halkası ilk kez çizildiğinde, her karede değil. Öğretici ilk
   * seferinde kalkanın ne olduğunu anlatıyor (`wave:flyers` deseni).
   */
  'enemy:shielded': Record<string, never>;
  /**
   * `M30` — sahada **şifacı** bir düşman var (Şaman). `enemy:shielded` ve
   * `enemy:burrowed` ile birebir aynı desen: her karede yayılıyor, "ilk
   * kez mi" kararını `TutorialSystem` veriyor, burada bayrak tutulmuyor
   * (TIER 1 kural 3'ün tuzağı).
   */
  'enemy:healing': Record<string, never>;
  /**
   * `M15` — sahada **gömülü** bir düşman var (`M12` yeraltı geçişi).
   * `enemy:shielded` ile birebir aynı desen ve aynı gerekçe: oyuncu
   * kulelerinin neden ateş etmediğini kendiliğinden çözemez.
   */
  'enemy:burrowed': Record<string, never>;

  /**
   * Duraklatma durumu değişti. S06 onayladı; HUD yayıyor.
   *
   * **`M104`'e kadar hiçbir dinleyicisi yoktu** ve bu bir kusuru
   * gizliyordu: `fx/TutorialHints` okuma süresini duvar saatiyle
   * ölçüyor (doğru — 2×/3× hızda kısalmasın diye) ama duraklatmayı
   * görmüyordu; balon perdenin arkasında süresini doldurup
   * kayboluyordu. Artık dinleniyor.
   *
   * (`speed:changed` aynı turda **kaldırıldı**: hızın gerçek kanalı
   * doğrudan `clock.setScale` çağrısıydı, olay onu yalnız tekrarlıyor
   * ve hiç kimse duymuyordu.)
   */
  'game:paused': { readonly paused: boolean };

  /**
   * Kayıt başarısız — **yalnız bir kez** yayılıyor (TIER 1 kural 10:
   * "kayıt başarısızsa oyuncuya bir kez bildirilir"). Gizli sekmede
   * ayarlar kalıcı olmuyor; oyun çalışmaya devam ediyor (M6).
   */
  'save:failed': { readonly once: boolean }; // bekçi: bilerek dinleyicisiz seam — uyarıyı `GameScene` doğrudan çiziyor (`fx/SaveWarning.ts`)

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
  /**
   * Yetenek bir seviye yükseldi — `M99` (S117'nin gider kalemi).
   *
   * Ayrı bir olay, `tower:upgraded`'in yeniden kullanımı değil: o
   * `spotIndex` taşıyor ve yeteneğin yapı noktası yok. Ses ikisinde de
   * aynı (`tower_upgrade`) ama yükü **ayrı**; ileride başarım ya da
   * istatistik bağlanacaksa doğru alan burada olur.
   */
  'ability:upgraded': { readonly id: AbilityId; readonly seviye: number };

  /**
   * Bir yükseltme **ilk kez** alınabilir oldu — `M102`.
   *
   * `TutorialSystem`'in tetiği; `wave:flyers` / `enemy:shielded` ile
   * birebir aynı desen: sahne koşulu görüp olayı yayıyor, "ilk kez mi"
   * kararını öğretici veriyor. Yük yok, çünkü ipucu metni o anki
   * **iki** yeteneği birden anlatıyor (`util/yetenekOzeti.ts`).
   */
  'ability:upgradable': Record<string, never>;
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

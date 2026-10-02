import type { WavePhase } from './WaveManager';

/**
 * Bir elin bitip bitmediği — `HudScene` her karede soruyor.
 *
 * **`M168` — "oyun koşuyor mu" sorusu buraya girdi, çünkü girmediği için
 * oynanmamış haritalara yıldız yazılıyordu.** Karar eskiden doğrudan
 * `HudScene.#oyunSonuKontrol` içindeydi ve yalnız `can` ile `faz`'a
 * bakıyordu. O iki sayı `GameScene`'in getter'larından geliyor ve
 * getter'lar sahnenin **son** `EconomySystem`/`WaveManager` örneğini
 * okuyor — sahne kapanınca bu örnekler silinmiyor.
 *
 * Kusurun yolu, tarayıcıda üretildi: harita 1 kazanılıyor (`faz` `done`,
 * `can` 1) → "Sonraki harita" → `Game` yeniden başlatılıyor ama Taş
 * Köprü'nün arka planı **tembel** grupta, yani sahne `create()`'ten önce
 * birkaç kare **yükleniyor**. `Hud` ise hemen başlıyor ve o karelerde
 * getter'lar hâlâ önceki elin `done / 1 can`'ını döndürüyor → "kazandı"
 * → `GameOver`, kayda **Taş Köprü: 1 yıldız** yazılıyor ve oyuncu
 * haritayı hiç görmeden eski elin zafer ekranına geri dönüyor. Yalnız
 * arka planı ilk kez inen haritalarda oluyordu — tam da yeni bir
 * oyuncunun "Sonraki harita" yolu.
 *
 * Saf ve Phaser'sız (TIER 1 kural 11): sahne durumunu çağıran veriyor.
 */
export type OyunSonucu = 'kazandi' | 'kaybetti' | null;

export interface OyunDurumu {
  /**
   * `Game` sahnesi **şu an koşuyor mu** — yükleniyor, duraklatılmış ya da
   * durmuş değil. Değilse can ve faz bu ele ait olmayabilir.
   */
  readonly oyunKosuyor: boolean;
  readonly can: number;
  readonly faz: WavePhase;
}

export function oyunSonucu(d: OyunDurumu): OyunSonucu {
  if (!d.oyunKosuyor) return null;
  if (d.can <= 0) return 'kaybetti';
  if (d.faz === 'done') return 'kazandi';
  return null;
}

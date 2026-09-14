/**
 * Ortak birlik tipleri.
 *
 * TIER 1 kural 11: bu dosya Phaser'a hiç dokunmaz — ne `import` ne
 * `import type`. Testler `node` ortamında koşuyor.
 */

/** Mantıksal ekran koordinatı. Birim: px (1280×720 ölçeğinde). */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * Oyun hızı. GAME-DESIGN §1 Kontroller.
 * `0` yok — duraklatma `scene.pause()` ile yapılır, saat ölçeğiyle değil
 * (research/02 §3: sıfıra bölme riski).
 *
 * **`3` M9-T03'te eklendi** ve denge etkisi 2× ile aynı yöntemle ölçüldü:
 * 5 harita × 10 dalga, referans tahtaya karşı, üç adım boyutunda
 * (`waveSim` adımı = 16.7 ms × hız). Sonuç `GameClock.setScale`
 * dokümanında; özeti: 3× gerçeğe 1× kadar yakın, daha kaba değil.
 *
 * **Üst sınırın gerekçesi 4× değil 3× olması:** kule atış periyodu en kısa
 * 714 ms (`towers.ts`, en yüksek `fireRate` 1.4/sn) ve `TowerSystem`
 * kare başına **bir** atış yapıyor; kare süresi periyodu aşarsa atış
 * kaybolur. 3×'te kare 50 ms, sınıra 14 kat pay var. Asıl sınır bu değil,
 * okunabilirlik: 3×'te düşman 110 px/sn × 3 = 330 px/sn ile geçiyor ve
 * oyuncunun kule yerleştirme penceresi zaten daralıyor.
 */
export type Speed = 1 | 2 | 3;

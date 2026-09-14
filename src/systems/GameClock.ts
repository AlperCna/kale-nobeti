import type { Speed } from '../types/common';

/**
 * `setScale`'in dokunduğu Phaser yüzeyi.
 *
 * `Phaser.Scene` bu şekli zaten sağlıyor; testte sahte nesne aynı şekli
 * taklit ediyor. Dar arayüz sayesinde bu dosya Phaser'a **çalışma
 * zamanında hiç dokunmuyor** (TIER 1 kural 11) — testler `node`
 * ortamında koşabiliyor.
 *
 * `physics.world.timeScale` YOK: arcade fizik kullanılmıyor
 * (CLAUDE.md Teknoloji, S02). Senkronda tutulacak zaman otoritesi
 * dörtten üçe indi.
 */
export interface ClockTarget {
  readonly tweens: { timeScale: number };
  readonly time: { timeScale: number };
  readonly anims: { globalTimeScale: number };
}

/**
 * Oyunun tek zaman otoritesi. CLAUDE.md TIER 1 kural 8.
 *
 * Hiçbir sistem ham `delta` kullanmaz; zaman bağımlı her mantık
 * `scaledDelta` üzerinden çalışır. Bu sözleşme M0'da kuruluyor —
 * sonradan eklemek her sisteme dokunmak demek.
 *
 * Duraklatma bu sınıfla yapılmaz: `scene.pause()` kullanılır.
 * `Speed` tipinde `0` yok, çünkü sıfır ölçek bölme hataları doğuruyor
 * (research/02 §3).
 */
export class GameClock {
  #scale: Speed = 1;
  #scaledDelta = 0;

  /** Son karenin ölçeklenmiş süresi. Birim: ms. */
  get scaledDelta(): number {
    return this.#scaledDelta;
  }

  get scale(): Speed {
    return this.#scale;
  }

  /**
   * Her karede bir kez, yalnız `GameScene.update` içinden çağrılır.
   *
   * Ham `delta` başka hiçbir yere sızmaz. Sekme arkaya alınıp geri
   * gelindiğinde oluşan sıçramaları Phaser'ın kendi `TimeStep`'i zaten
   * sınırlıyor; burada ikinci bir kırpma yapılmıyor.
   */
  tick(delta: number): void {
    this.#scaledDelta = delta * this.#scale;
  }

  /**
   * Hızı değiştirir ve **üç** Phaser zaman otoritesini de senkronlar.
   * Biri atlanırsa o sistem yanlış hızda çalışır ve bu sessizce olur.
   */
  /**
   * Hızı değiştirir — **yalnız oyun sahnesine** verilir.
   *
   * Oyuncu geri bildirimi "2x'e alınca biraz sıkıntı oldu oyun kısmında"
   * üzerine baştan sona ölçüldü ve **düzeltilecek bir kusur bulunamadı.**
   * Bulunanlar, bir daha aranmasın diye:
   *
   * - **Sonuç değişmiyor.** Aynı harita, aynı tahta (2 okçu + 1 top),
   *   dalga 1: 1×'te ve 2×'te ikisi de sızıntısız bitti (can 12 → 12),
   *   2× yalnız yarı gerçek zamanda vardı. `scaledDelta` her yerde
   *   tutarlı kullanılıyor demek.
   * - **Kare hızı düşmüyor:** 1× ve 2×'te 59 FPS.
   * - **Mermi hedefi atlamıyor.** 2×'te kare başına adım iki katına
   *   çıkıyor ama `ProjectileSystem` nokta-mesafe değil **süpürülmüş**
   *   kontrol yapıyor (`pointToSegmentDistSq`), yani tünelleme yok.
   *
   * **Arayüz zamanı bilerek ölçeklenmiyor.** `tweens` ve `time`
   * Phaser'da sahne başına; buraya `GameScene` veriliyor, `Hud` ve
   * `Overlay` 1×'te kalıyor. Bu kusur değil karar: 2× oyunun temposunu
   * hızlandırmalı, düğmeye basma geri bildirimini değil. Oyun olaylarına
   * ait olan animasyonlar (hasar sayısı, altın uçuşu, başarım bandı,
   * boss afişi) zaten `GameScene` içinde yaşıyor.
   *
   * **Bilinen gizli tutarsızlık:** `anims.globalTimeScale` sahne başına
   * değil **oyun geneli**. Bugün zararsız, çünkü proje hiç sprite
   * animasyonu kullanmıyor (`.anims.create`/`.play` araması boş dönüyor)
   * — yani bu satır ölü bir kol. Sprite animasyonu eklendiği gün arayüzü
   * de hızlandıracak; o zaman ölçek sahne başına ayrılmalı. Satır
   * silinmedi çünkü o gün gelince oyun animasyonlarının ölçeklenmesi
   * DOĞRU olacak; yanlış olan yalnız arayüze de bulaşması.
   */
  setScale(s: Speed, target: ClockTarget): void {
    this.#scale = s;
    target.tweens.timeScale = s;
    target.time.timeScale = s;
    target.anims.globalTimeScale = s;
  }
}

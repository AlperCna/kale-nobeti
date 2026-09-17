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
   *
   *   **`M63` (S132) — bu madde YETERSİZ, yanlış değil.** Ölçüm dalga
   *   1'de, üç kuleyle yapılmış; orada saha her dalga sonunda
   *   boşalıyor. Geç haritalarda öyle değil: `M16`'nın örtüşen
   *   dalgaları yüzünden harita 4-5-6'da yolda sürekli 5-13 düşmanlık
   *   bir **kuyruk** duruyor, ve `TowerSystem` kare başına en fazla bir
   *   atış yaptığı için her atışın 0-dt gecikmesi o kuyruk boyunca
   *   birikiyor. 2× etkin adımı ikiye katladığı için birikimi de
   *   ikiye katlıyor: Kar Geçidi 1×'te 60-144 Hz arası sabit **12**
   *   can, 2×'te aynı bantta **10 ile 17** arasında geziniyor.
   *   Ayrıntı ve düzeltme yönü `OPEN-QUESTIONS.md` S132.
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
   * ## 3× (`M9-T03`) — aynı yöntemle ölçüldü
   *
   * Poki küratörleri cilaya bakıyor ve 3× tür standardı. Eklemeden önce
   * denge etkisi 2× ile **aynı soruyla** sınandı, ama bu kez canlı oyunda
   * değil `waveSim` üzerinde: 5 harita × 10 dalga, referans tahtaya karşı,
   * adım boyutu `16.7 ms × hız`. (Oyun 60 karede koşuyor, yani 3× hız
   * simülasyonda 50 ms'lik adım demek.)
   *
   * - **Sonuç değişmiyor.** Toplam dalga süresi sapması en fazla **%0,38**;
   *   öldürülen düşman sayısı üç hızda da aynı kalıyor, yalnız harita 4 ve
   *   5'te ±1 düşman oynuyor (kaleye tam varırken ölen düşman — var olan
   *   eşik hassasiyeti).
   * - **3× daha kaba DEĞİL.** 240 kare/sn'lik ince adım "gerçek" cevap
   *   sayılıp üçü de ona karşı ölçüldü: 1× 2 düşman, 2× 3 düşman, **3× 2
   *   düşman** uzakta. Yani 3×'in hatası 1×'inkinden büyük değil.
   * - **Harita 5'te sızan HP %51 sapıyor — ama 1×'te de sapıyor** (%50,9).
   *   Bu 60 kare/sn'nin kendi artefaktı, hızlandırmanın değil; oyun zaten
   *   60 karede yayınlanıyor, yani oyuncunun gördüğü doğru sayı o.
   * - **Atış kaybı yok.** `TowerSystem` kare başına bir atış yapıyor ve
   *   kare süresi atış periyodunu aşarsa atış düşerdi. En hızlı kule
   *   periyodu 714 ms (`fireRate` 1.4), 3×'te kare 50 ms — 14 kat pay.
   * - **Mermi tünellemesi yok.** Gerekçe 2× ile aynı: `ProjectileSystem`
   *   süpürülmüş kontrol yapıyor (`pointToSegmentDistSq`), nokta değil.
   *
   * Hit-stop 3×'te de kapalı: `HitStop.trigger` kapısı `speed === 2`'den
   * `speed > 1`'e çevrildi (§10 sayıyı değil niyeti söylüyor).
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

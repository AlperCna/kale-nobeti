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
/**
 * **Mantığın sabit adımı.** Birim: ms.
 *
 * `1000/60` seçildi çünkü bütün denge sayıları `M0`'dan beri bu adımda
 * ölçüldü (`waveSim`'in varsayılanı da bu). Başka bir değer seçmek,
 * düzeltmenin kendisiyle birlikte bütün rampayı da kaydırırdı — iki
 * değişikliği aynı anda yapmak hangisinin ne yaptığını görünmez kılar.
 */
export const SABIT_ADIM_MS = 1000 / 60;

/**
 * Bir karede koşulacak **en çok** adım — ölüm sarmalı koruması.
 *
 * Kare uzarsa biriktirici daha çok adım ister, adımlar kareyi daha da
 * uzatır ve oyun kilitlenir. Tavan aşılınca artık **atılıyor**: oyun
 * yavaşlar (slow motion) ama yanıt vermeye devam eder.
 *
 * **`M92`: 5 → 7, çünkü 5 kendi gerekçesini karşılamıyordu.** Yazılı niyet
 * “3× hızda 30 fps'e kadar yetsin” idi ama yanındaki aritmetik bunu
 * çürütüyordu: 30 fps'te kare 33,3 ms, 3×'te 100 ms, yani **tam 6** adım
 * gerekiyor. 5 ile o cihazda her karede bir adım düşüyordu — oyun
 * sessizce ağır çekime giriyor ve oyun zamanı gerçek zamandan **geri
 * kalıyor**. 5'in gerçek sınırı 3×'te 36 fps'ti (5 × 16,67 / 3 = 27,8 ms).
 * Portalların trafiği ağırlıklı mobil ve 30 fps oralarda sıradan.
 *
 * **Neden 6 değil 7:** ölçüldü. 1000/30 × 3 kayan noktada tam 100 ms
 * etmiyor (99,999…), yani bazı kareler 6 adımı **doldurmuyor** ve artık
 * birikiyor; bir sonraki kare 7 adım istiyor. Tavan 6 iken o kare
 * kırpılıyor ve — önemlisi — artık **sıfırlanıyor**, yani kayma kalıcı
 * kayıba dönüşüyordu: beş saniyede 1250 ms (ölçüm `GameClock.test`).
 * 7, o bir adımlık salınımı soğuruyor.
 *
 * Tavanın gerçek payı **oyunda ölçüldü** (Sisli Bataklık, 3×, 936 kare):
 * kare başına ortalama 3,04 adım, **en çok 4**, tavana hiç değilmedi.
 * Yani 6, 60 fps'te ölü bir sayı değil — yalnız yavaş cihazda konuşuyor.
 * 30 fps'in **altında** hâlâ adım düşüyor; bu bilerek, çünkü tavanın
 * kendisi ölüm sarmalı koruması.
 */
export const KARE_BASINA_MAKS_ADIM = 7;

export class GameClock {
  #scale: Speed = 1;
  #birikim = 0;

  /**
   * Mantığın gördüğü süre — **her zaman sabit** (`S132`, `M64`).
   *
   * Eskiden bu, karenin ham süresiydi ve oyun kare süresinden bağımsız
   * değildi: `TowerSystem` kare başına en fazla bir atış yaptığı için
   * her atış 0-dt arası gecikiyordu, ve geç haritalarda yolda sürekli
   * duran 5-13 düşmanlık kuyruk yüzünden o gecikme ~450 saniye boyunca
   * birikiyordu. Ölçülen sonuç: Kar Geçidi 2×'te 10 ile 17 can arasında
   * geziniyordu (1×'te sabit 12), yani **2× düğmesi zorluğu
   * değiştiriyordu**. Ayrıntı `OPEN-QUESTIONS.md` S132.
   */
  get scaledDelta(): number {
    return SABIT_ADIM_MS;
  }

  /**
   * Bir sonraki adıma sayılan artık. Birim: ms. Ölçüm ve test için;
   * mantık buna bakmaz.
   */
  get birikim(): number {
    return this.#birikim;
  }

  /**
   * **Ara değer oranı** — biriktiricinin doluluğu, `0..1` (`M65`).
   *
   * Çizim son iki mantık durumu arasında bu oranla yapılıyor. Mantık 60
   * Hz'de koşarken 144 Hz ekranda kareler arası hareket böyle sürekli
   * görünüyor; sonuç birebir aynı kalıyor çünkü bu sayıyı **yalnız
   * çizim** okuyor (`util/araDeger.ts`).
   */
  get oran(): number {
    return this.#birikim / SABIT_ADIM_MS;
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
   *
   * **Hız burada uygulanıyor, adımda değil** (`M64`). `2×`, adımı
   * büyütmüyor — biriktiriciye iki katı *gerçek zaman* veriyor, yani
   * aynı sabit adımdan iki katı **sayıda** koşuluyor. Mantık birebir
   * aynı, yalnız duvar saatinde daha hızlı akıyor. Kusurun kaynağı tam
   * olarak buydu: eskiden `2×` adımı 16,7 ms'den 33,3 ms'ye çıkarıyor
   * ve atış gecikmesini de ikiye katlıyordu.
   *
   * @returns Bu karede koşulacak sabit adım sayısı (0 olabilir — 60'tan
   *          hızlı ekranlarda karelerin bir kısmı mantık koşturmaz).
   */
  tick(delta: number): number {
    this.#birikim += delta * this.#scale;
    let adim = 0;
    while (this.#birikim >= SABIT_ADIM_MS && adim < KARE_BASINA_MAKS_ADIM) {
      this.#birikim -= SABIT_ADIM_MS;
      adim += 1;
    }
    // Tavana dayandıysak artığı taşımıyoruz; taşısak bir sonraki kare
    // daha da borçlu başlar ve sarmal kapanmaz.
    if (adim >= KARE_BASINA_MAKS_ADIM) this.#birikim = 0;
    return adim;
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

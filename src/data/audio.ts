/**
 * Ses zamanlama sabitleri — `fx/SoundSystem.ts` burada okuyor.
 *
 * TIER 1 kural 1'in disiplini: sayı `fx/`'e gömülmüyor, `data/` altında
 * duruyor. Bunlar bir *denge* sayısı değil (kural 1'in asıl hedefi
 * `waveSim`/`balanceChecks`'in okuduğu sayılar) ama "sayı uydurma,
 * ayarlanabilir yerde tut" ilkesi burada da geçerli — bir sonraki ayar
 * turu `fx/` dosyasını açmadan bu dosyayı değiştirebilmeli.
 */

/**
 * `enemy_death` sesinin en az kaç ms arayla çalabileceği — `Y06`.
 *
 * Tepe dalgada saniyede birkaç ölüm oluyor; 1,5 sn'lik ses üst üste
 * binince Web Audio'da doyum/kırpılma oluşturuyordu. **Duvar saatiyle**
 * kısıtlanıyor, oyun saatiyle DEĞİL: TIER 1 kural 8 yalnız *oyun
 * mantığını* `scaledDelta` üzerinden çalıştırmayı zorunlu kılıyor — ses
 * çalma bir mantık adımı değil, bir efekt. Kasıtlı sonuç: 2× hızda
 * ölümler iki kat sık geldiği için kısıtlamaya daha çok ses takılır;
 * bu, hız arttıkça sesin daha az (daha çok bilgi taşıyan) çalması
 * demek ve istenen davranış bu.
 */
export const ENEMY_DEATH_THROTTLE_MS = 80;

/**
 * Anahtar başına önceden yaratılan ses örneği sayısı — oyuncu geri
 * bildirimi (2026-09-14): "2×'te kasma oldu, müzik biraz takıldı".
 *
 * `scene.sound.play(key)` Phaser'da **her çağrıda yeni bir `Sound`
 * nesnesi** yaratıp bitince yok ediyor (WebAudio düğüm grafiği dahil).
 * Kule atışı için hiç kısıtlama yoktu; tam tahtada 2×'te saniyede ~20
 * atış = saniyede ~20 nesne + çöp toplama, ana iş parçacığı takılınca
 * müzik de takılıyordu. Artık her anahtar için `SFX_POOL_PER_KEY` örnek
 * bir kez yaratılıyor, sırayla çalınıyor: tahsis sıfır, aynı anda
 * çalabilen atış sesi anahtar başına en çok bu kadar (dördüncü atış
 * en eskisini yeniden başlatıyor — 0,1-0,3 sn'lik seslerde duyulmuyor).
 * Üç: gülle (en uzun, ~0,5 sn) 0,5/sn ateşleyen üç kuleyle bile
 * kuyruğu kesilmeden çalabilsin.
 */
export const SFX_POOL_PER_KEY = 3;

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

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
/**
 * Anahtar başına ses örneği sayısı.
 *
 * **3'ten 6'ya çıkarıldı** — ama bu kusurun asıl çaresi değil, payı.
 *
 * Ölçüm (harita 1, dört okçu, bir dalga): `shot_okcu` çağrılarının
 * **%100'ü** (1× hız) ve **%95'i** (2×) hâlâ çalmakta olan bir örneği
 * kesiyordu. Aritmetiği:
 *
 *     shot_okcu suresi          2,25 sn
 *     4 okcu x ~1,1 atis/sn  =  ~4,4 atis/sn
 *     3 ornek                =>  ayni ornek her 0,68 sn'de yeniden
 *
 * 2,25 saniyelik bir ses 0,68 saniyede bir baştan başlarsa hiç bitmiyor;
 * oyuncunun duyduğu "ses gelmedi" oluyor (geri bildirim: *"okçunun ok
 * atma sesi 2×'te gelmiyor, sonradan geliyor"*).
 *
 * `SoundSystem.#cal` artık önce **boş** örnek arıyor, yoksa **en eski
 * başlayanı** kesiyor (voice stealing). Doğru politika — ama havuz
 * doymuşken kurtaracak bir şey yok: ölçümde dört okçuyla üç örneğin üçü
 * de sürekli doluydu, politika değişikliği sonucu değiştirmedi.
 *
 * **Asıl kök neden ses dosyasının uzunluğu.** 2,25 saniyelik bir ok
 * atışı temsil ettiği olaya göre çok uzun. Havuzu dosyaya göre
 * büyütmek yanlış olurdu: 4,4 atış/sn'de kesilmemesi için 10 örnek
 * gerekirdi ve aynı sesin 10 kopyası üst üste çalması bu sefer çamur
 * olurdu. 6, efektler kısaldığında (~0,3-0,5 sn) fazlasıyla yeter ve
 * bugünkü dosyalarla da orta yoğunlukta kesmeyi durdurur.
 *
 * Gereksinim `docs/plan/M6-ses-uretim-brifi.md`'ye yazıldı.
 */
export const SFX_POOL_PER_KEY = 6;

/**
 * Müziğin taban ses seviyesi — `M8-T10`.
 *
 * Eskiden iki sahnede ayrı ayrı `volume: 0.5` yazıyordu. Ayar kademesi
 * bununla **çarpılıyor**, yani "Müzik: Düşük" = 0,5 × 0,35.
 */
export const MUSIC_BASE_VOLUME = 0.5;

/**
 * Arayüz tıklama sesinin anahtarı — `M8-P03`.
 *
 * Dosya (`audio/sfx/ui_click.m4a`) **henüz üretilmedi**; çalan taraf
 * (`fx/ParchmentFrame.addPressFeedback`) anahtarı önbellekte bulamazsa
 * sessizce geçiyor. Üretilince yükleme kuyruğuna da eklenecek —
 * `PreloadScene.SFX_ERKEN`, çünkü ilk duyulduğu yer ana menü.
 */
export const UI_CLICK = 'ui_click';

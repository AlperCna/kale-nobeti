/**
 * Boss'un harita başına ölçeklenmesi — **türetiliyor, yazılmıyor**.
 *
 * `research/01-denge-matematigi.md` §12'nin önerisi: *"boss HP'si
 * `enemies.ts` içinde sabit olmasın; ölçülen kapsama + referans tahtadan
 * türetilsin."* M7'de zorunlu hâle geldi.
 *
 * ## Neden gerekti (M7 ölçümü)
 *
 * `700 × hpMultiplier` harita 2'de 1120, harita 3'te 1820 ediyordu ve o
 * haritalarda **karşılanabilir hiçbir tahta** bu kadarını indiremiyordu:
 * Kısıt A oranları **%165,5** ve **%282,4**.
 *
 * Üç kol denendi ve **üçü de ölçümle elendi**:
 *
 * | Denenen | Sonuç |
 * |---|---|
 * | Yapı noktası sayısı 10 → 24 | Harita 2'de oran **kötüleşti** (%122,6 → %140,8) |
 * | Ayrımı tamamen kaldır (tek yol) | Yine %122,6 / %163,3 |
 * | HP çarpanı ×1,6 → ×1,00 | Yine **%177,9 / %252,6** |
 *
 * Sebep: tavan **altınla** sınırlı, noktayla değil. Aynı altın daha çok
 * kuleye bölününce tahta T2/T3 yerine T1'de kalıyor ve **T1'in zırhı 10
 * olan boss'a etkin DPS'i 0,99** — T2'nin yarısı. Yani nokta eklemek
 * boss'a karşı tahtayı zayıflatıyor.
 *
 * ## Uygulanan çözüm: zırhı düşür + HP'yi türet
 *
 * Zırh, düşük kademeli kuleleri işe yaramaz kılan şey; düşürmek tavanı
 * yükseltiyor, tavan da türetilen HP'yi yukarı çekiyor. İkisi birbirini
 * besliyor ve **monoton artan** bir boss eğrisi çıkıyor:
 *
 * | Harita | Zırh | Tavan | Boss HP (0,80 × tavan) |
 * |---|---|---|---|
 * | 1 Değirmen Geçidi | 10 | 761 | **700** (§5'in belgelenmiş değeri) |
 * | 2 Taş Köprü | 5 | 890 | **712** |
 * | 3 Kül Ovası | **2** | 925 | **740** |
 *
 * (Sayılar M7'nin ölçümü; bugünkü değerler aşağıdaki `BOSS_HP_BY_MAP`
 * içinde ve her biri yanındaki notta hangi ölçümden geldiğini yazıyor.)
 *
 * **Harita 3 iki kez yeniden türetildi ve iki kez de regresyon bandı
 * yakaladı** — sayı hiç elle ayarlanmadı:
 *
 * 1. Tahtaya kışla eklenince (§5 Trol) bir kule noktası gitti, tavan
 *    977 → 881 düştü, türetilen 705 olup harita 2'nin 712'sinin altına
 *    indi ve **monotonluk bozuldu**. Zırh 3 → 2 yapıldı, HP 740 oldu.
 * 2. S73'te altın çarpanı 2,6 → 3,8 olunca tahta tam yükseltilebildi,
 *    tavan 925 → **1278** çıktı ve yazılı 740 türetilenden %27,6 saptı.
 *    HP **1023** oldu.
 *
 * Her iki seferde de bandı **test** kırdı, ben değil.
 *
 * Harita 1'in türetilmiş değeri 718; §5'in yazdığı **700 aynen korunuyor**
 * (fark %2,5) — yani belgelenmiş sayı değişmiyor, yalnız 2 ve 3 türetiliyor.
 *
 * ## Zırh neden haritayla DÜŞÜYOR
 *
 * Ters görünüyor ama mekanik gereği: geç haritalarda oyuncunun altını daha
 * çok noktaya bölünüyor ve tahtanın ortalama kademesi **düşüyor**. Zırh 10
 * o tahtayı hasar tabanına (%15) mahkûm ediyor. Zırhı düşürmek, seyrelmiş
 * bir tahtanın boss'a **ulaşabilmesini** sağlıyor. Zorluk zırhtan değil,
 * HP'den ve dalga kompozisyonundan geliyor.
 *
 * TIER 1 kural 1: sayılar burada, sistemde değil.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { EnemyDef } from '../types/enemy';
import { OGRE_SEF } from './enemies';

/**
 * Harita kimliğine göre boss zırhı. **Ölçülerek seçildi** — bkz. dosya
 * başlığındaki tablo; **10/5/2** boss HP'sini monoton artan
 * yapan ve harita 1'in 700'ünü koruyan kombinasyon.
 */
export const BOSS_ARMOR_BY_MAP: Readonly<Record<string, number>> = {
  'degirmen-gecidi': 10,
  'tas-kopru': 5,
  'kul-ovasi': 2,
  // `M8-T04` — harita 3'le aynı: 12 nokta, tahtanın ortalama kademesi
  // benzer. Zırhı daha da düşürmenin gerekçesi yok; 2 taban.
  'kar-gecidi': 2,
  // `M8-T05` — aynı gerekçe. Zırh taraması (0-5) en zayıf kol tavanını
  // 3108'den 2724'e, yani yalnız %12 oynatıyor; türetilen HP de onunla
  // birlikte düştüğü için net zorluk etkisi ≈ 0.
  'kadim-harabe': 2,
  // `M12` — harita 6; 4 ve 5 ile aynı gerekçe (12+ nokta, seyrelmiş tahta).
  'sisli-bataklik': 2,
};

/**
 * Harita başına **mutlak** boss canı.
 *
 * `0,80 × o haritanın en zayıf kol tavanı` olarak ölçüldü ve sabitlendi.
 * Çalışma zamanında yeniden türetilmiyor: türetme referans tahtaya, tahta
 * ekonomiye, ekonomi dalgalara bağlı — bu zinciri her doğumda koşturmak
 * hem pahalı hem de denge sayısını **görünmez** yapardı.
 *
 * ## `M71` (S136) — burada YANLIŞ BİR CÜMLE vardı
 *
 * Bu paragraf *"`balanceChecks.test.ts` onun hâlâ `0,80 × tavan` olduğunu
 * her koşuda doğruluyor; sapma testi kırıyor"* diyordu. **Öyle bir test
 * yoktu.** `BOSS_HP_TOLERANCE` diye bir sabit vardı, `bossScaling.test`'e
 * içe aktarılmıştı ve tek bir `expect`'te geçmiyordu — okunmayan veri,
 * bu projenin tekrarlayan kusur sınıfı.
 *
 * Sonuç: tahtalar `M61`/`M66`/`M67` ile güçlendikçe yazılı HP'ler yerinde
 * kaldı ve oranlar sürüklendi. Bugün ölçülen: Değirmen %87,7 · Taş Köprü
 * %74,3 · Kül Ovası %54,4 · Kar Geçidi %70,1 · Kadim Harabe %36,3 ·
 * Sisli Bataklık %34,3.
 *
 * ## Eksik test yazılmadı, çünkü ÖLÇÜM kuralı reddetti
 *
 * `0,80 × tavan` ile yeniden türetme denendi (1069 / 1944 / 3425 / 4330 /
 * 4900) ve **türetmenin var olma sebebini kırdı**: Kadim Harabe'nin bossu
 * sızmaya başladı (`kisitB`'nin "boss hiçbir haritada sızmıyor" kilidi).
 * Çarpanlarla telafi edildiğinde (harita 5 → 7,0 · harita 6 → 6,0) boss
 * sızmayı bırakıyor ama bu kez **orta oyun sıfırlanıyor** — profiller
 * `0 0 0 0 0 0 0 0 0 15` oluyor ve S116 geri geliyor; Kolay da 0'a
 * düşüyor.
 *
 * Sebep ölçüldü: `ceilingAPerBranch` **tek** düşmanın karşısındaki tahtayı
 * ölçüyor. Tahtalar `M7`'den beri üç katına çıktı (tavanlar 800-925 →
 * 2400-6100) ama bir *dalganın* yarattığı baskı o kadar büyümedi. Yani
 * `0,80 × tek-düşman tavanı` bugün 20 canlık bütçenin tamamını bossa
 * veren bir sayı; `M7`'de öyle değildi.
 *
 * **Bugün gerçekten garanti edilen üç şey** ve hepsinin testi var:
 * `bossScaling.test`'in regresyon kilidi (yazılı HP'ler ölçülen
 * değerlerdir) · `kisitB`'nin "boss hiçbir haritada sızmıyor"u ·
 * `kisitB`'nin **"doruk sonda"**sı (`M70` → `M153`, S135).
 * Yani sayı **türetilmiş değil, ölçülerek ayarlanmış** — ve metin artık
 * bunu söylüyor.
 *
 * **`M153` — üçüncü madde yeniden tanımlandı.** Eski hâli *"boss dalgası
 * haritanın **sayısal zirvesi**"* idi ve `M151`'e kadar **yanlış
 * muhasebeyle** doğrulanıyordu: sızıntı, düşmanı doğuran dalgaya değil
 * **sızdığı ana** yazılıyordu, yani 9. dalganın Trol'ü finalin hanesine
 * geçiyordu. Doğru muhasebeye (`SimResult.canDogumDalgasina`) geçilince
 * iddia Kar Geçidi'nde düştü ve `M152` altı bütçe varyantıyla onu geri
 * getirmeyi denedi — hepsi başka bir sağlamayı kırdı. Sebep sayı değil:
 * S116 ağırlığı bilerek **orta oyuna** taşıdı, S135 ise finali zirve
 * istiyordu. Bugünkü kural ikisini birden sağlıyor: **final bedelsiz
 * olamaz** ve **son üç dalga haritanın toplam can hasarının yarısından
 * fazlasını taşır** (ölçülen paylar: %78 · %62 · %79 · %82). Bu sayı o
 * kuralın **refakat** ayağını besliyor — bossun kendisi hâlâ garantili
 * ölüyor.
 */
export const BOSS_HP_BY_MAP: Readonly<Record<string, number>> = {
  'degirmen-gecidi': 700, // §5'in belgelenmiş değeri (türetme 718 diyor)
  // **`M11` Faz 5 (S95): 712 → 859.** Okçu ailesi güçlenince (ölü
  // aileydi) her haritanın tavanı yükseldi; boss HP'leri aynı kuralla
  // yeniden türetildi. Bu sayı M7'den beri ilk kez değişti.
  // **`M20` (S118): 862 → 993.** Harita 2'nin altın çarpanı 1,6 → 2,2
  // olunca tahta güçlendi; boss aynı kuralla yeniden türetildi (sürekli
  // koşuda öldürülebilen eşik 1241 × 0,80). Boss yükselmeseydi harita 2
  // zenginleşen tahtanın karşısında daha da kolaylaşırdı.
  'tas-kopru': 958,
  // **`M11-T02` (S91): 1023 → 886.** Aynı sebep, aşağıdaki harita 5
  // notuna bakınız: dal dengesi referans tahtayı zayıflattı, tavan
  // 1278'den 1107'ye düştü. 0,80 × 1107 ≈ 886.
  // `M11` Faz 5 (S95): 886 → 979 — aynı sebep.
  // **`M18` (S113 + S112).** Tavan artık yavaşlatmayı görüyor ve tahta
  // dalga başına yavaşlatıcı kurmayı bıraktı; ikisi de tavanı yükseltti.
  // HP aynı kuralla yeniden türetildi: 0,80 × tavan. Simülasyonla
  // doğrulandı — referans tahta her haritada bossu öldürüyor.
  'kul-ovasi': 1573,
  // `M8-T04` — türetildi: 0,80 × en zayıf kol tavanı (2416,2, zırh 2).
  // İlk tur 1857'ydi (tavan 2321,2); `M8-T05`'te kartuşun altında kalan
  // yapı noktası taşınınca referans tahta değişti ve tavan yükseldi.
  //
  // **`M11-T02` (S91): 1933 → 1709.** Tavan 2136; 0,80 × 2136 ≈ 1709.
  // `M11` Faz 5 (S95): 1709 → 1956. `M18` (S113): 1956 → 2835.
  'kar-gecidi': 2807,
  // `M8-T05` — türetildi: 0,80 × **en zayıf kol** tavanı. İki kol ayrı
  // ölçüldü; zayıf olan belirleyici, çünkü düşman hangi kolu
  // yürüyeceğini oyuncu seçmiyor.
  //
  // **`M11-T02` (S91): 2675 → 2189.** Dal dengesi değişince referans
  // tahta zayıfladı (Barut Fıçısı'nın yavaşlatması Buz'a geçti, Buz'un
  // hasarı 20'den 8'e indi) ve **üç haritanın tavanı birden** düştü.
  // Yazılı HP'ler bandın (%75-85) dışına çıktı: %92,4 / %90,5 / %93,1.
  // Üçü de aynı türetme kuralıyla yeniden hesaplandı — elle
  // ayarlanmadı, `bossScaling.test.ts` bandı bir kez daha kırdı ve
  // sayıyı o söyledi: 0,80 × 2736 ≈ 2189.
  // `M11` Faz 5 (S95): 2189 → 2492. `M18` (S113): 2492 → 2519.
  'kadim-harabe': 2345,
  // `M12` Faz 3 — harita 6, aynı kuralla türetildi: en zayıf kol tavanı
  // 3472, 0,80 × 3472 ≈ 2778. Monotonluk korunuyor (2492 → 2778).
  // `M18` (S113): 2778 → 1825 — aynı türetme.
  'sisli-bataklik': 2333,
};

/**
 * O haritanın boss'u.
 *
 * `hp` **çarpan uygulanmadan önceki** değere geri çevriliyor: doğum yolu
 * (`WaveManager` → `Enemy.spawn`) `def.hp * hpMultiplier` yapıyor ve o
 * yolu boss için dallandırmak dokuz çağrı yerini değiştirmek demekti.
 * Böylece `bossFor(map).hp * map.hpMultiplier === BOSS_HP_BY_MAP[map.id]`.
 */
export function bossFor(map: { id: string; hpMultiplier: number }): EnemyDef {
  const hedefHp = BOSS_HP_BY_MAP[map.id] ?? OGRE_SEF.hp * map.hpMultiplier;
  const zirh = BOSS_ARMOR_BY_MAP[map.id] ?? OGRE_SEF.armor;
  return { ...OGRE_SEF, armor: zirh, hp: hedefHp / map.hpMultiplier };
}

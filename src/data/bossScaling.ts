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
 * **Harita 3'ün zırhı 3'ten 2'ye indi** çünkü referans tahta artık bir
 * kışla satın alıyor (§5: Trol'ün cevabı kışla) ve kışla bir kule
 * noktasını işgal ediyor — tavan 977'den 881'e düştü, türetilen HP 705
 * olup harita 2'nin 712'sinin **altına** indi ve monotonluk bozuldu.
 * Regresyon bandı testi bunu **yakaladı**; sayı elle değil ölçümle
 * düzeltildi.
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
};

/**
 * Harita başına **mutlak** boss canı.
 *
 * `0,80 × o haritanın en zayıf kol tavanı` olarak ölçüldü ve sabitlendi.
 * Çalışma zamanında yeniden türetilmiyor: türetme referans tahtaya, tahta
 * ekonomiye, ekonomi dalgalara bağlı — bu zinciri her doğumda koşturmak
 * hem pahalı hem de denge sayısını **görünmez** yapardı. Sayı burada
 * yazılı ve `balanceChecks.test.ts` onun hâlâ `0,80 × tavan` olduğunu
 * her koşuda doğruluyor; sapma testi kırıyor.
 */
export const BOSS_HP_BY_MAP: Readonly<Record<string, number>> = {
  'degirmen-gecidi': 700, // §5'in belgelenmiş değeri (türetme 718 diyor)
  'tas-kopru': 712,
  'kul-ovasi': 740,
};

/** Türetilen değerin kabul edilebilir sapma payı (regresyon bandı, §12). */
export const BOSS_HP_TOLERANCE = 0.06;

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

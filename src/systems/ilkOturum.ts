/**
 * "Bu oyuncu oyunu ilk kez mi açıyor?" — `M10-T01`.
 *
 * ## Neden var
 *
 * Poki'nin kendi onboarding kılavuzu: *"Menüyü atla. Özellikle ilk kez
 * oynayanlar için açılış ekranını, başlık ekranını ve **seviye seçimini**
 * atla. Doğrudan güzel kısma girsinler."* Aynı sayfa devam ediyor:
 * *"İlk birkaç dakika çoğu zaman oyunun kaderini belirliyor."*
 *
 * Bizim akışımız `Preload` → `Menu` → `LevelSelect` → `Game`'di: ilk kez
 * gelen oyuncu, beş haritanın dördü kilitliyken bir seçim ekranında tık
 * harcıyordu. `M10` planının 1. fazı bu iki ekranı **yalnız ilk seferde**
 * atlıyor.
 *
 * ## Neden ayrı ve saf bir dosya
 *
 * TIER 1 kural 11: karar `node`'da test edilebilsin. Kararın kendisi tek
 * satır değil — "ilk kez" iki ayrı işarete birden bakıyor (aşağıda) ve
 * yanlış cevabın iki farklı maliyeti var:
 *
 * - **Yanlış `true`** (dönen oyuncuyu ilk kez sanmak): oyuncu menüsünü
 *   ve ilerlemesini göremeden harita 1'e düşer. Sinir bozucu.
 * - **Yanlış `false`** (ilk kez geleni dönen sanmak): fazın tamamı
 *   sessizce devre dışı kalır ve bunu kimse fark etmez.
 *
 * İkincisi daha sinsi olduğu için testler ikisini de bağlıyor.
 *
 * ## "İlk kez"in tanımı: iki işaret birden
 *
 * | İşaret | Nerede | Neden yetmiyor tek başına |
 * |---|---|---|
 * | Hiç yıldız yok | `progress.stars` (`SaveSystem`) | Oyuncu oynayıp **hep kaybetmiş** olabilir — yıldız yok ama oyunu tanıyor |
 * | Hiç ipucu görülmemiş | `tutorial.seenHints` (`TutorialSystem`) | İpuçları ayarlardan kapatılabiliyor; kapalıyken hiç yazılmıyor |
 *
 * İkisi de boşsa "ilk kez" diyoruz. Biri doluysa oyuncu oyunu görmüş
 * demektir ve normal akış işliyor.
 *
 * ## Depolama engelliyse
 *
 * `LocalStore` yedeğe düşüyor ve her açılış "ilk kez" görünüyor — yani
 * gizli sekmedeki oyuncu her seferinde doğrudan oyuna giriyor. **Bu
 * doğru davranış:** kaydı olmayan oyuncunun seviye seçim ekranında
 * göreceği bir ilerleme zaten yok. Kayıt uyarısı ayrıca gösteriliyor
 * (`fx/SaveWarning.ts`).
 */
import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';

/** Kaydın bu dosyanın baktığı iki alanı. Geri kalanı umursanmıyor. */
interface KayitYuzeyi {
  readonly progress?: { readonly stars?: Readonly<Record<string, unknown>> };
  readonly tutorial?: { readonly seenHints?: readonly unknown[] };
}

/**
 * Oyuncu oyunu **hiç** oynamamış mı?
 *
 * Bozuk ya da okunamayan kayıt `true` döndürüyor: `SaveSystem` ve
 * `TutorialSystem` de aynı durumda "sıfırdan başla" diyor, üçü aynı
 * cevabı vermezse oyuncu kendi kaydını yarı tanıyan bir oyuna düşerdi.
 */
export function ilkOturumMu(store: KeyValueStore): boolean {
  let kayit: KayitYuzeyi;
  try {
    // Okuma da sarılı. `LocalStore` zaten kendi içinde yakalıyor, ama bu
    // çağrı `PreloadScene.create()`'in içinde: buradan sızan bir istisna
    // oyunu **açılışta** çökertirdi ve TIER 1 kural 10'un tam olarak
    // önlemek istediği durum bu.
    const ham = store.get(SAVE_KEY);
    if (ham === null) return true;
    const nesne: unknown = JSON.parse(ham);
    if (typeof nesne !== 'object' || nesne === null) return true;
    kayit = nesne as KayitYuzeyi;
  } catch {
    return true;
  }
  const yildizVar = Object.keys(kayit.progress?.stars ?? {}).length > 0;
  const ipucuVar = (kayit.tutorial?.seenHints ?? []).length > 0;
  return !yildizVar && !ipucuVar;
}

/**
 * İlk oturumda doğrudan açılan harita.
 *
 * Sabit — "kilitli olmayan ilk harita"yı hesaplamıyor, çünkü ilk
 * oturumda tanım gereği yalnız bu açık. `maps.ts`'in sırasına
 * bağlanmak, o sıranın değişmesini sessiz bir davranış değişikliğine
 * çevirirdi; testte kimliğin `MAPS[0]` ile eşleştiği ayrıca bağlanıyor.
 */
export const ILK_HARITA_ID = 'degirmen-gecidi';

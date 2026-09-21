/**
 * Yetenek verisi. TIER 1 kural 1: sayı burada, sistemde değil.
 *
 * Her sayı `docs/GAME-DESIGN.md` §8'den **birebir**:
 * - Meteor — hedeflenen **90 px** yarıçapta **180 gerçek hasar**, bekleme **45 sn**.
 * - Takviye — hedeflenen noktaya **2 geçici asker** (HP **60**, DPS **7**,
 *   **20 sn** ömür), bekleme **20 sn**.
 */

import type { AbilityDef, MeteorDef, TakviyeDef } from '../types/ability';

/**
 * §8 + §3: hasar tipi **`true`** — hiçbir şeyle azalmaz.
 *
 * §3 `true` tipini "yalnız yeteneklerde" diye tanımlıyor; Meteor onun tek
 * kullanıcısı. Zırh 10 ve %25 büyü direnci olan Ogre Şef'e de tam 180
 * giriyor — boss'a karşı yeteneğin varlık sebebi bu.
 */
export const METEOR: MeteorDef = {
  id: 'meteor',
  cooldownSeconds: 45,
  kind: 'damage',
  radius: 90,
  damage: 180,
  damageType: 'true',
  /**
   * `// GEÇİCİ — S48`: §8 uçanları söylemiyor. **Vuruyor** kabul edildi.
   * Vurmasaydı harpi sürüsüne karşı elde yalnız iki kule ailesi kalırdı ve
   * §5'in "Harpi sürüsü → Okçu + Büyü" satırı tek cevaba düşerdi.
   */
  hitsFlying: true,
};

export const TAKVIYE: TakviyeDef = {
  id: 'takviye',
  cooldownSeconds: 20,
  kind: 'summon',
  soldierCount: 2,
  soldierHp: 60,
  soldierDps: 7,
  lifetimeSeconds: 20,
};

export const ABILITIES: readonly AbilityDef[] = [METEOR, TAKVIYE];

/**
 * # Yetenek yükseltmesi — `M99`, S117'nin **gider kalemi**
 *
 * ## Neden var
 *
 * S117 ölçtü: geç haritalarda gelirin yarısından fazlası **harcanmadan
 * kalıyor**. Tahtanın maliyeti nokta sayısıyla sınırlı (6440 altın) ama
 * gelir harita çarpanıyla büyüyor (18 414). Ölçülen atıl altın, dalga
 * dalga:
 *
 * | Harita | d5 | d6 | d7 | d8 | d9 | d10 |
 * |---|---|---|---|---|---|---|
 * | Değirmen Geçidi | 43 | 57 | 92 | 69 | 94 | 34 |
 * | Kar Geçidi | 8 | 31 | 189 | 600 | 2012 | 3602 |
 * | Sisli Bataklık | 193 | 1491 | 3735 | 5275 | 7233 | 9510 |
 *
 * Yani ekonomi harita 1-3'te sonuna kadar kısıt, harita 4-6'da **6-7.
 * dalgadan sonra** kısıt olmaktan çıkıyor. `M79` fiyat çarpanını (S117'nin
 * ilk kolu) denedi ve ölçüm yalnız harita 4'ü geçirdi; kalan kol buydu.
 *
 * ## Fiyat neden `× goldMultiplier`
 *
 * Gider kalemi **gelirle aynı ölçekte** büyümeli, yoksa ya erken
 * haritalarda tahtayla yarışır ya geç haritalarda görünmez kalır.
 * `startGold`'un S72'de çarpanı izlemesiyle **aynı gerekçe**. Taban
 * fiyatların ölçülmüş sonucu (iki yetenek, iki yükseltme = `× goldMultiplier`
 * cinsinden 1000):
 *
 * | Harita | tüm yükseltmeler | atıl altın | ne oluyor |
 * |---|---|---|---|
 * | Değirmen Geçidi | 1000 | 252 | hiçbiri alınamıyor — ekonomi zaten kısıt |
 * | Taş Köprü | 2200 | 608 | en fazla bir L2 |
 * | Kül Ovası | 3800 | 1400 | bir-iki yükseltme |
 * | Kar Geçidi | 7800 | 5373 | dörtte ikisi — **seçim** |
 * | Kadim Harabe | 10 200 | 9845 | neredeyse hepsi |
 * | Sisli Bataklık | 11 000 | 11 974 | hepsi, kıl payı |
 *
 * Yani eğri kendiliğinden doğru şekli alıyor: erken haritada yok, geç
 * haritada atıl altını **emiyor**.
 *
 * ## Referans ölçümler NEDEN kayma dedi
 *
 * Bütün denge sayıları (`referansOlcum`) yetenekleri **kapalı** koşuyor
 * (`YetenekKullanimi 'yok'`). Yükseltme yalnız yeteneğin gücünü
 * değiştirdiği için rampa, Kısıt A/B, boss türetmesi ve zorluk tablosu
 * **kıpırdamıyor**. Değişen tek ölçüm `yetenekKatkisi` — yeteneğini
 * kullanan oyuncunun kazandığı pay.
 */
export const YETENEK_SEVIYE_SAYISI = 3;

/**
 * L1→L2 ve L2→L3 fiyat **tabanı**. Gerçek fiyat
 * `yetenekYukseltmeFiyati` ile haritanın altın çarpanından türetiliyor.
 */
export const YETENEK_YUKSELTME_TABANI: readonly number[] = [180, 320];

/**
 * Meteor'un seviyeye göre hasarı. L1 = §8'in belgelenmiş 180'i.
 *
 * Yükselen şey **hasar**, bekleme değil: bekleme düşürmek yeteneğin ne
 * zaman ateşlendiğini değiştirir ve ölçümü (“yetenek hangi dalgada
 * kullanıldı”) gürültülü yapar; hasar tek eksende ve ekranda okunuyor.
 */
export const METEOR_HASAR: readonly number[] = [180, 250, 330];

/** Takviye'nin seviyeye göre asker sayısı. L1 = §8'in belgelenmiş 2'si. */
export const TAKVIYE_ASKER: readonly number[] = [2, 3, 4];

/**
 * `seviye` (1 tabanlı) için **bir sonraki** yükseltmenin fiyatı.
 * Azami seviyede `null`.
 *
 * Tek adres: fiyatı hem menü hem satın alma buradan okuyor — `M79`'un
 * `towers.maliyet` ile aynı gerekçesi (menüde yazan ile kesilen fiyat
 * ayrışmasın).
 */
export function yetenekYukseltmeFiyati(
  seviye: number,
  map: { readonly goldMultiplier: number },
): number | null {
  const taban = YETENEK_YUKSELTME_TABANI[seviye - 1];
  if (taban === undefined) return null;
  return Math.round(taban * map.goldMultiplier);
}

/** Seviyeye göre Meteor hasarı — sınır dışı seviye L1'e düşüyor. */
export function meteorHasari(seviye: number): number {
  return METEOR_HASAR[seviye - 1] ?? METEOR_HASAR[0]!;
}

/** Seviyeye göre Takviye asker sayısı. */
export function takviyeAskerSayisi(seviye: number): number {
  return TAKVIYE_ASKER[seviye - 1] ?? TAKVIYE_ASKER[0]!;
}

export function getAbility(id: AbilityDef['id']): AbilityDef | undefined {
  return ABILITIES.find((a) => a.id === id);
}

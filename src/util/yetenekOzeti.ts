/**
 * **Yetenek yükseltmesinin özeti** — satın almadan ÖNCE okunabilir hâli.
 *
 * `util/dalOzeti.ts`'in birebir ikizi ve aynı gerekçeyle var. Orada
 * yazan cümle şuydu: *"menü yalnız ad + fiyat yazıyordu, yani oyuncu
 * iki dalın farkını ancak 240 altın harcadıktan sonra görüyordu.
 * Görünmeyen bir takas seçim değil, zar atışıdır"* — S93.
 *
 * `M99` yetenek yükseltmesini açtı ve **tam aynı deliği** bıraktı:
 * düğmede yalnız bir fiyat var (`1980`), ne aldığını söyleyen hiçbir
 * şey yok. `M100` bedelini ölçtü (geç haritalarda 1-3 can), yani takas
 * gerçek; görünmüyor olması kusur.
 *
 * Metin `data/abilities.ts`'ten **üretiliyor**, elle yazılmıyor
 * (TIER 1 kural 1): `METEOR_HASAR` ya da `TAKVIYE_ASKER` bir denge
 * turunda değişirse oyuncunun okuduğu satır kendiliğinden doğru kalıyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz, `node`'da test edilir.
 */

import { ABILITIES, METEOR_HASAR, TAKVIYE_ASKER, YETENEK_SEVIYE_SAYISI } from '../data/abilities';
import type { AbilityId } from '../types/ability';
import type { StringKey } from '../data/strings';
import { t } from './i18n';

/** `fx/AbilityButtons.ts` ile **aynı** harita — iki yerde iki ad olmasın. */
const ETIKET: Readonly<Record<AbilityId, StringKey>> = {
  meteor: 'abilityMeteor',
  takviye: 'abilityTakviye',
};

/**
 * Seviyeye göre değer dizisi. Yeni bir yetenek eklenirse burası
 * derlenmez — `Record<AbilityId, ...>` eksik anahtarı tipte yakalıyor,
 * yani "sayan liste" sessizce bayatlayamıyor (TIER 2).
 */
const DEGERLER: Readonly<Record<AbilityId, readonly number[]>> = {
  meteor: METEOR_HASAR,
  takviye: TAKVIYE_ASKER,
};

/**
 * `seviye`'den bir sonrakine geçişin tek satırlık özeti; azami
 * seviyede `null`.
 *
 * Biçim `dalOzeti`'ninkiyle aynı: ad · değişen sayı. Ok (`→`) yönü
 * okuyor — "180 daha 250 olacak".
 */
export function yetenekOzeti(id: AbilityId, seviye: number): string | null {
  if (seviye < 1 || seviye >= YETENEK_SEVIYE_SAYISI) return null;
  const dizi = DEGERLER[id];
  const simdi = dizi[seviye - 1];
  const sonra = dizi[seviye];
  if (simdi === undefined || sonra === undefined) return null;
  const ad = t(ETIKET[id]);
  // Meteor'un değişeni hasar, Takviye'ninki asker sayısı: birinde birim
  // önde (`Hasar 180 → 250`), diğerinde arkada (`2 → 3 asker`), çünkü
  // iki dil de böyle okuyor.
  return id === 'meteor'
    ? `${ad} · ${t('infoDamage')} ${simdi} → ${sonra}`
    : `${ad} · ${simdi} → ${sonra} ${t('sumSoldiers')}`;
}

/**
 * Öğretici ipucunun tam metni — kural cümlesi + o anki iki takas.
 *
 * Satır satır üretiliyor: azami seviyedeki yetenek listeden düşüyor,
 * yani ipucu oyuncuya **alınamayacak** bir şey vadetmiyor.
 */
export function yetenekIpucuMetni(seviye: (id: AbilityId) => number): string {
  const satirlar = ABILITIES.map((a) => yetenekOzeti(a.id, seviye(a.id))).filter(
    (s): s is string => s !== null,
  );
  return [t('hintAbilityUpgrade'), ...satirlar].join('\n');
}

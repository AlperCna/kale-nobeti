/**
 * **Dal özeti** — T3 seçiminin satın almadan ÖNCE okunabilir hâli.
 *
 * `M11` Faz 2 dalları gerçekten ayrıştırdı (S91): Havan ile Barut
 * Fıçısı'nın DPS'i aynı, takas **menzil ↔ patlama**. Ama menü yalnız
 * *ad + fiyat* yazıyordu, yani oyuncu iki dalın farkını **ancak 240
 * altın harcadıktan sonra** görüyordu. Görünmeyen bir takas seçim
 * değil, zar atışıdır — S93.
 *
 * Metin `towers.ts`'ten üretiliyor, elle yazılmıyor (TIER 1 kural 1):
 * bir denge turunda sayı değişirse menü kendiliğinden doğru kalıyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { TowerEffect, TowerTier } from '../types/tower';
import { t } from './i18n';

/**
 * Etkinin bir satırlık okunur hâli. Sayılar `towers.ts`'ten geliyor.
 *
 * `TowerInfoLabels` de bunu kullanıyor — iki yerde iki ayrı biçim,
 * oyunun aynı şeyi iki türlü söylemesi demek olurdu.
 */
export function etkiMetni(e: TowerEffect): string {
  if (e.kind === 'burn') return `${t('infoEffectBurn')} ${e.dps}/sn · ${e.seconds} sn`;
  if (e.kind === 'slow')
    return `${t('infoEffectSlow')} %${Math.round(e.factor * 100)} · ${e.seconds} sn`;
  return `${t('infoEffectChain')} ×${e.targets}`;
}

/**
 * Bir T3 dalının tek satırlık özeti.
 *
 * **Ham DPS yazılıyor, hasar değil.** Barut Fıçısı 24 hasar × 0,9 atış
 * ile Havan'ın 48 × 0,45'iyle aynı işi yapıyor; yan yana "24" ve "48"
 * görmek oyuncuya yanlış şeyi söylerdi. Yanma DPS'e katılmıyor
 * (`combat.etkiDps` ayrı bir hesap) — o zaten etki metninde yazıyor.
 *
 * Yalnız **anlamlı** alanlar giriyor: patlaması olmayan kule "patlama 0"
 * yazmıyor, etkisi olmayan dal boş bırakıyor. Uçan yalnız
 * *vuramıyorsa* yazılıyor — kategorik bir delik, ve oyuncunun bunu
 * satın almadan önce bilmesi gerekiyor.
 */
export function dalOzeti(ad: string, tier: TowerTier): string {
  const parcalar: string[] = [ad, `${t('sumDps')} ${(tier.damage * tier.fireRate).toFixed(1)}`];
  parcalar.push(`${t('sumRange')} ${tier.range}`);
  if (tier.splashRadius !== undefined && tier.splashRadius > 0) {
    parcalar.push(`${t('sumSplash')} ${tier.splashRadius}`);
  }
  if (tier.airMultiplier === 0) parcalar.push(t('infoNoAir'));
  if (tier.effect !== undefined) parcalar.push(etkiMetni(tier.effect));
  return parcalar.join(' · ');
}

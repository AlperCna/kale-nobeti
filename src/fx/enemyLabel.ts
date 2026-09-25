import type { EnemyAbility, EnemyDef, EnemyId } from '../types/enemy';
import type { StringKey } from '../data/strings';
import { t, yuzde } from '../util/i18n';

/**
 * `M8-T02` — düşman adı ve savunma özeti.
 *
 * Dalga telgrafı (§7'nin zorunlu özelliği) yalnız ikon + adet
 * gösteriyordu; ikonu tanımayan oyuncu için bilgi değil süstü. Bu dosya
 * hangi düşmanın ne olduğunu **veriden** cümleye çeviriyor — sayı
 * uydurulmuyor, `enemies.ts` okunuyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz, `node`'da test edilir.
 */

/**
 * Kimlik → `strings.ts` anahtarı. **Dışa aktarılıyor** (`M103`): belge
 * üreticisi (`scripts/kurallar.mjs`) düşman adlarını buradan çözüyor.
 * Önceden orada **elle yazılmış** ikinci bir harita vardı ve `M12`'de
 * gelen Tünelci'yi saymıyordu — belge on iki yerde ham kimlik
 * (`tunelci`) basıyordu. Tek adres, TIER 2'nin “sayan liste” kuralı.
 *
 * `Record<EnemyId, StringKey>` olduğu için yeni bir düşman eklendiğinde
 * derleyici duruyor — hatırlamak gerekmiyor.
 */
export const AD_ANAHTARI: Readonly<Record<EnemyId, StringKey>> = {
  goblin: 'enemyGoblin',
  orkSavasci: 'enemyOrkSavasci',
  kurtBinicisi: 'enemyKurtBinicisi',
  harpi: 'enemyHarpi',
  zirhliOrk: 'enemyZirhliOrk',
  saman: 'enemySaman',
  trol: 'enemyTrol',
  orumcekAna: 'enemyOrumcekAna',
  orumcekYavrusu: 'enemyOrumcekYavrusu',
  tunelci: 'enemyTunelci',
  ogreSef: 'enemyOgreSef',
};

export function enemyName(id: EnemyId): string {
  return t(AD_ANAHTARI[id]);
}

/**
 * Yetenek türü → `strings.ts` anahtarı.
 *
 * **Neden yetenek telgrafta yazıyor:** `M13`'te boss'a çağırma eklendi
 * ve telgraf onu söylemiyordu — oyuncu yandaşları ancak boss'u
 * dilimleyince öğreniyordu; harita 5'in ikinci evresi de `M10`'dan beri
 * sessizdi. Yetenek, oyuncunun karşı-oyun kararını değiştiren tek şey
 * (bu dosyanın başlığı) ve "tam bilgi ver" kuralı (S93) onu **dalga
 * gelmeden** göstermeyi istiyor.
 *
 * **`M156` — söz artık derleyicide.** Buranın yerinde yedi dallı bir
 * `if/else if` zinciri ve üstünde *"her yetenek burada yazılı olmalı"*
 * diye **elle tutulan bir söz** vardı. Bu projede elle tutulan söz
 * tutulmuyor (CLAUDE.md TIER 2): sekizinci bir `kind` eklemek zinciri
 * kırmaz, sessizce **etiketsiz** bir düşman üretir — yani oyuncuya
 * mekaniği söylemeyen tam da o en tehlikeli yüzey. `Record<EnemyAbility
 * ['kind'], StringKey>` eksik anahtarda `npm run typecheck`'i kırıyor,
 * ve dosyanın kendi `AD_ANAHTARI`'ı zaten bu biçimdeydi.
 */
export const YETENEK_ANAHTARI: Readonly<Record<EnemyAbility['kind'], StringKey>> = {
  regen: 'statRegen',
  split: 'statSplit',
  heal: 'statHeals',
  burrow: 'statBurrow',
  enrage: 'statEnrage',
  summon: 'statSummon',
  silence: 'statSilence',
};

/**
 * "Zırhlı Ork — zırh 8, uçar" gibi tek satır.
 *
 * Yalnız **sıfırdan farklı** savunmalar yazılıyor: goblin için "zırh 0,
 * büyü direnci 0" yazmak bilgi değil gürültü olurdu. Yetenekler
 * (`ability`) oyuncunun karşı-oyun kararını değiştiren tek şey olduğu
 * için hep yazılıyor.
 */
export function enemySummary(def: EnemyDef): string {
  const parcalar: string[] = [];
  if (def.armor > 0) parcalar.push(`${t('statArmor')} ${def.armor}`);
  if (def.magicResist > 0) {
    parcalar.push(`${t('statResist')} ${yuzde(def.magicResist)}`);
  }
  if (def.flying) parcalar.push(t('statFlying'));
  const y = def.ability?.kind;
  if (y !== undefined) parcalar.push(t(YETENEK_ANAHTARI[y]));

  const ad = enemyName(def.id);
  return parcalar.length === 0 ? ad : `${ad} — ${parcalar.join(', ')}`;
}

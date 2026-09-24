/**
 * Başarım tanımları — `M8-T07`.
 *
 * TIER 1 kural 1: eşikler burada, sistemde değil.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * ## Neden "koşul türü" diye bir alan var
 *
 * Başarımların yarısı **olay** sayıyor (öldürme, kule kurma), yarısı bir
 * elin **sonucuna** bakıyor (canı tam bitir, satmadan bitir, kaç yıldız).
 * İkisini tek bir `check(state)` imzasıyla toplamak mümkündü ama o zaman
 * her başarım bütün oyun durumunu görürdü ve "bu başarım neye bakıyor"
 * sorusunun cevabı koda gömülürdü. Tür alanı sayesinde `AchievementSystem`
 * hangi başarımı **ne zaman** değerlendireceğini tablodan okuyor.
 */

import type { StringKey } from './strings';

/**
 * Koşul türü.
 *
 * - `counter`: bir sayaç eşiği geçti (kalıcı, eller arası birikiyor).
 * - `flag`: bir olay bir kez oldu (ilk kule, ilk T3…).
 * - `runEnd`: el bitince değerlendiriliyor (kalan can, yıldız, sonsuz dalga).
 */
export type AchievementKind = 'counter' | 'flag' | 'runEnd';

export interface AchievementDef {
  readonly id: string;
  readonly kind: AchievementKind;
  /** `counter` için eşik; `flag`/`runEnd` için anlamı tanıma özel. */
  readonly threshold: number;
  readonly title: StringKey;
  readonly desc: StringKey;
}

/**
 * On yedi başarım (`M8-T07` on iki, `M23` dört, `M111` bir).
 *
 * Seçim ölçütü ROADMAP'in "ucuz dönüş sebebi" notu: her biri **oyuncunun
 * zaten yapacağı** bir şeyi işaretliyor ya da bir kere denemeye değer bir
 * sapma öneriyor.
 *
 * **`M133` — buradaki ölçülü iddia YANLIŞTI ve düzeltildi.** Cümle
 * "hiçbiri kavrama (grind) dayanmıyor — `kill1000` bile beş haritayı bir
 * kez bitiren birinde kendiliğinden doluyor" diyordu. Ölçüldü: bütün
 * kampanya (altı harita × on dalga, ölünce bölünen Örümcek Ana'nın 48
 * yavrusu dahil) toplam **662** düşman — harita başına 138 · 116 ·
 * 111 · 101 · 98 · 98. Beş harita 564. Yani eşik bir turda
 * **karşılanamıyor**; `kill1000` yaklaşık 1,5 kampanya ya da bir
 * kampanya + sonsuz mod demek. İddia harita 6 eklendiğinde
 * bayatlamadı, **baştan yanlıştı**.
 *
 * Doğru cümle: on altısı bir turda doğuyor, `kill1000` **bilerek**
 * turlar arası birikiyor (sayaç zaten kalıcı). Eşiğe dokunulmadı —
 * oyuncuya gösterilen metin ("Toplam 1000 düşman öldür.") dürüst.
 * Sayılar `systems/AchievementSystem.test.ts`'te bağlı.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstTower', kind: 'flag', threshold: 1, title: 'achFirstTower', desc: 'achFirstTowerDesc' },
  { id: 'firstBarracks', kind: 'flag', threshold: 1, title: 'achFirstBarracks', desc: 'achFirstBarracksDesc' },
  { id: 'firstTier3', kind: 'flag', threshold: 1, title: 'achFirstTier3', desc: 'achFirstTier3Desc' },
  { id: 'kill100', kind: 'counter', threshold: 100, title: 'achKill100', desc: 'achKill100Desc' },
  { id: 'kill1000', kind: 'counter', threshold: 1000, title: 'achKill1000', desc: 'achKill1000Desc' },
  { id: 'meteor5', kind: 'flag', threshold: 5, title: 'achMeteor5', desc: 'achMeteor5Desc' },
  { id: 'firstWin', kind: 'runEnd', threshold: 1, title: 'achFirstWin', desc: 'achFirstWinDesc' },
  /** Eşik `-1`: "bütün haritalar" — sayı `MAPS.length`'ten geliyor. */
  { id: 'allMaps', kind: 'runEnd', threshold: -1, title: 'achAllMaps', desc: 'achAllMapsDesc' },
  { id: 'allStars', kind: 'runEnd', threshold: -1, title: 'achAllStars', desc: 'achAllStarsDesc' },
  { id: 'flawless', kind: 'runEnd', threshold: 0, title: 'achFlawless', desc: 'achFlawlessDesc' },
  { id: 'noSell', kind: 'runEnd', threshold: 0, title: 'achNoSell', desc: 'achNoSellDesc' },
  // `M111` — `M99`'un gider kaleminin başarım karşılığı; `firstTier3`
  // ile aynı biçim (tek olay, tek bayrak). Eşik `AchievementSystem`'de
  // `YETENEK_SEVIYE_SAYISI`'ndan okunuyor, burada değil — `threshold`
  // `flag` türünde zaten anlamsız (bkz. alanın kendi notu).
  { id: 'abilityMax', kind: 'flag', threshold: 1, title: 'achAbilityMax', desc: 'achAbilityMaxDesc' },
  { id: 'endless20', kind: 'runEnd', threshold: 20, title: 'achEndless20', desc: 'achEndless20Desc' },
  /**
   * **`M23` — dört başarım oyunun `M8` sonrası katmanlarına işaret ediyor.**
   *
   * Liste `M8-T07`'de yazıldı ve hiç büyümedi; aradan hedefleme modları
   * (`M10-T02`), T3 dallarının ayrıştırılması (`M11` Faz 2), yeraltı
   * geçişi (`M12`) ve ikinci yeteneğin meşrulaşması (`M11` Faz 4) geçti.
   * Hiçbiri başarım listesinde görünmüyordu — yani oyunun en zengin
   * katmanları, oyuncuya *"burada bir şey var, dene"* diyen tek
   * mekanizmada yoktu.
   *
   * Dördü de **mevcut** olayları kullanıyor; olay şeması değişmedi.
   * İlk üçü oyuncunun kararını, dördüncüsü bir keşfi işaretliyor —
   * yukarıdaki seçim ölçütü ikisine de izin veriyor.
   *
   * **Neden tam dört:** `AchievementsScene` iki sütuna diziyor ve o gün
   * alt bilgiyle çakışmadan 8 satır sığıyordu, yani 16 tavan. 12 + 4 = 16.
   *
   * **`M133` — bu tavan artık 16 değil.** `M111` on yedinciyi eklerken
   * yerleşimi yeniden ölçtü (`UST` 190 → 172, `SATIR_Y` 58 → 54) ve
   * tavan **18** oldu; türetmesi `AchievementsScene`'in başında, sayı
   * `AchievementSystem.test.ts`'te bağlı (`≤ 18`). Buradaki "16" tarihî
   * bir kayıttı ve güncel sınır sanılabilirdi — on sekizinci başarımın
   * sığmayacağını söylüyordu, oysa sığıyor.
   */
  { id: 'bothBranches', kind: 'flag', threshold: 1, title: 'achBothBranches', desc: 'achBothBranchesDesc' },
  { id: 'bothAbilities', kind: 'flag', threshold: 1, title: 'achBothAbilities', desc: 'achBothAbilitiesDesc' },
  { id: 'targetingUsed', kind: 'flag', threshold: 1, title: 'achTargeting', desc: 'achTargetingDesc' },
  { id: 'sawBurrow', kind: 'flag', threshold: 1, title: 'achSawBurrow', desc: 'achSawBurrowDesc' },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

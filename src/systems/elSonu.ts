import type { KeyValueStore } from '../util/storage';
import { SaveSystem } from './SaveSystem';
import { AchievementSystem } from './AchievementSystem';

/** Bir elin sonunda kayda geçen her şey — `GameOverScene` dolduruyor. */
export interface ElSonuGirdisi {
  /** Sonsuz elde de dolu; `undefined` ise sonuç kaydedilmiyor. */
  readonly mapId: string | undefined;
  readonly won: boolean;
  readonly lives: number;
  /** O **koşunun** başlangıç canı (`DIFFICULTY[...].startLives`, `M34`). */
  readonly startLives: number;
  /** `DIFFICULTY[...].recordStars` — Kolay'da `false`. */
  readonly recordStars: boolean;
  /** Bu elde kule satıldı mı — `noSell`. */
  readonly sold: boolean;
  /** Sonsuz elde ulaşılan dalga; normal elde 0 — `endless20`. */
  readonly endlessWave: number;
}

/**
 * **El sonu kaydı: ÖNCE sonuç, SONRA başarımlar** — `M171`.
 *
 * Bu iki adım `GameOverScene.init`'in içindeydi ve sıraları **tersti**:
 * başarımlar sonuç kaydedilmeden değerlendiriliyordu. Hemen üstlerindeki
 * yorum *"recordResult çağrısından sonra olsun: bütün haritalar ve bütün
 * yıldızlar bu elin sonucunu da saymalı"* diyordu ve kod tam tersini
 * yapıyordu (`M8-T07`'den beri). Sonuç: son haritayı bitiren oyuncuya
 * **"Sefer Tamam" açılmıyordu**, son yıldızı alan "Tam Not"u alamıyordu —
 * ikisi de ancak bir *sonraki* elin sonunda, ilgisiz bir anda açılırdı.
 * Altı haritanın altısı oyunda bitirilince görüldü.
 *
 * Sahnede kalsaydı sıra sınanamazdı; burada `elSonu.test.ts` sınıyor.
 *
 * @returns Bu elde açılan başarımlar (bant için).
 */
export function elSonuKaydet(
  store: KeyValueStore,
  mapIds: readonly string[],
  el: ElSonuGirdisi,
): readonly string[] {
  const save = new SaveSystem(store);
  if (el.mapId !== undefined) {
    if (el.recordStars) {
      save.recordResult(el.mapId, el.lives, el.won, el.startLives);
    } else if (el.won) {
      // Kolay: yıldızsız "bitirdi" kaydı — kilit zinciri kopmasın (`M8-T11`).
      // Ekranda gösterilen de bu (`SaveSystem.kayitYildizi`).
      save.recordResult(el.mapId, 1, true, el.startLives);
    }
  }
  return new AchievementSystem(store).checkRunEnd({
    won: el.won,
    lives: el.lives,
    startLives: el.startLives,
    sold: el.sold,
    mapsCompleted: mapIds.filter((id) => save.isCompleted(id)).length,
    mapCount: mapIds.length,
    stars: save.totalStars(),
    maxStars: mapIds.length * 3,
    endlessWave: el.endlessWave,
  });
}

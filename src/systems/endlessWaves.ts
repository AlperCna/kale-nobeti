/**
 * Sonsuz mod dalga üretimi — `M8-T06`.
 *
 * TIER 1 kural 1: sayılar `data/endless.ts`'te.
 * TIER 1 kural 11: Phaser'a dokunmaz; `node`'da test ediliyor.
 *
 * **Deterministik.** Aynı `(n, kadro, tohum)` her zaman aynı dalgayı verir.
 * Gerekçe: oyuncu kaybedip tekrar denediğinde aynı dalgayı görmeli, yoksa
 * "bu sefer şansım kötüydü" savunulabilir bir şikâyet olur; ayrıca
 * simülasyonla dengeyi ölçmek imkânsızlaşır. Tohum imzada **açık** duruyor
 * ki test farklı tohumları gezebilsin.
 */

import type { EnemyId } from '../types/enemy';
import type { Wave, WaveGroup } from '../types/wave';
import { getEnemy } from '../data/enemies';
import { budget, spawnDelayFor } from '../data/waves';
import {
  ENDLESS_BOSS_EVERY,
  ENDLESS_BUDGET_GROWTH,
  ENDLESS_FIRST_WAVE,
  ENDLESS_HP_STEP,
  ENDLESS_MAX_ENEMIES,
  ENDLESS_TYPE_SHARE_CAP,
} from '../data/endless';

/** Sonsuz modun devraldığı son elle yazılmış dalga. */
const SON_ELLE_YAZILAN = ENDLESS_FIRST_WAVE - 1;

/**
 * Dalga `n`'in puan bütçesi (n ≥ 11).
 *
 * Dalga 10'un bütçesinden devam ediyor — sonsuz modun ilk dalgası bir
 * uçurum değil, bir adım olsun diye.
 */
export function endlessBudget(n: number): number {
  if (!Number.isInteger(n) || n < ENDLESS_FIRST_WAVE) {
    throw new Error(`endlessBudget: dalga ≥ ${ENDLESS_FIRST_WAVE} olmalı, ${n} geldi`);
  }
  return Math.round(budget(SON_ELLE_YAZILAN) * Math.pow(ENDLESS_BUDGET_GROWTH, n - SON_ELLE_YAZILAN));
}

/**
 * Dalga `n`'de düşman HP'sine uygulanan **ek** çarpan (haritanınkinin üstüne).
 *
 * Sonsuz mod dışında 1 — çağıran tarafın dallanmasına gerek kalmasın diye.
 */
export function endlessHpScale(n: number): number {
  if (n <= SON_ELLE_YAZILAN) return 1;
  return 1 + (n - SON_ELLE_YAZILAN) * ENDLESS_HP_STEP;
}

/** Bu dalgada boss var mı (S79: 20, 30, 40...). */
export function isEndlessBossWave(n: number): boolean {
  return n > SON_ELLE_YAZILAN && n % ENDLESS_BOSS_EVERY === 0;
}

/**
 * Tohumlu, çarpımsal-uyumlu (LCG) sözde rastgele.
 *
 * `Math.random` bilerek kullanılmıyor: determinizm bu dosyanın sözleşmesi.
 */
function rastgele(tohum: number): () => number {
  let s = (tohum >>> 0) || 1;
  return () => {
    // Numerical Recipes LCG sabitleri; kalite yeterli, tek amaç tekrar.
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Kadrodan doğrudan doğurulabilecek düşmanlar — boss ve yavru hariç. */
function dogurulabilir(roster: readonly EnemyId[]): EnemyId[] {
  return roster.filter((id) => {
    if (id === 'ogreSef') return false;
    // Yavru yalnız Örümcek Ana bölününce doğuyor; dalgaya elle konmaz.
    if (id === 'orumcekYavrusu') return false;
    return getEnemy(id) !== undefined;
  });
}

/**
 * Bir düşmanın havuzda kaç yer tuttuğu.
 *
 * Örümcek Ana ölünce **üç yavru doğuruyor** ve onlar da havuzdan yer
 * istiyor. Bedeni 1 saymak dalga 30'da 13 Ana × 4 = 52 beden demekti ve
 * havuz (60) taşıyordu; `WaveManager` erteleyip dalgayı uzatıyordu.
 */
function bedenMaliyeti(id: EnemyId): number {
  const ability = getEnemy(id)?.ability;
  if (ability !== undefined && ability.kind === 'split') return 1 + ability.count;
  return 1;
}

/**
 * Bir dalganın **havuz maliyeti**: bedenler, bölünmeden doğacaklar dahil.
 *
 * `waveEnemyCount` kafa sayıyor; havuzu zorlayan ise beden. Bir Örümcek
 * Ana tek kafa ama dört beden. Sonsuz mod tavanı bu sayıya bakıyor.
 */
export function endlessBodyCost(wave: Wave): number {
  return wave.groups.reduce((t, g) => t + g.count * bedenMaliyeti(g.enemy), 0);
}

/**
 * Sonsuz mod dalgası üretir.
 *
 * ## Doldurma algoritması
 *
 * Bütçe **pahalıdan ucuza** doğru dağıtılıyor. Sebep havuz tavanı: aynı
 * bütçeyi ucuz düşmanla doldurmak düşman **sayısını** patlatıyor ve
 * `WaveManager` havuz dolunca erteleyip dalgayı uzatıyor. Pahalı düşman
 * aynı puanı daha az bedenle taşıyor.
 *
 * Her tip için alınan pay tohumlu rastgele (%25-70) — dalgalar birbirinin
 * kopyası olmasın diye. İkinci bir tur artan bütçeyi ucuzdan pahalıya
 * kapatıyor. Hiçbir tip bedenlerin `ENDLESS_TYPE_SHARE_CAP`'inden fazlasını
 * alamıyor; tavan dolduysa bütçe **eksik** kalıyor ve farkı
 * `endlessHpScale` taşıyor.
 *
 * @param spawnPoints Haritadaki giriş sayısı (`MapDef.paths.length`).
 */
export function generateEndlessWave(
  n: number,
  roster: readonly EnemyId[],
  spawnPoints = 1,
  tohum = n * 7919,
): Wave {
  if (!Number.isInteger(n) || n < ENDLESS_FIRST_WAVE) {
    throw new Error(`generateEndlessWave: dalga ≥ ${ENDLESS_FIRST_WAVE} olmalı, ${n} geldi`);
  }
  const rnd = rastgele(tohum);
  const kapilar = Math.max(1, spawnPoints);

  const adaylar = dogurulabilir(roster)
    .map((id) => ({ id, puan: getEnemy(id)!.points, beden: bedenMaliyeti(id) }))
    .sort((a, b) => b.puan - a.puan);

  let kalanPuan = endlessBudget(n);
  let kalanAdet = ENDLESS_MAX_ENEMIES;

  // Boss önce: puanı ve bir bedeni baştan ayrılıyor.
  const secimler: { id: EnemyId; adet: number }[] = [];
  if (isEndlessBossWave(n) && roster.includes('ogreSef')) {
    const boss = getEnemy('ogreSef');
    if (boss !== undefined) {
      secimler.push({ id: 'ogreSef', adet: 1 });
      kalanPuan -= boss.points;
      kalanAdet -= 1;
    }
  }

  const tipTavani = Math.max(1, Math.floor(ENDLESS_MAX_ENEMIES * ENDLESS_TYPE_SHARE_CAP));
  const alinan = new Map<EnemyId, number>();
  const ekle = (id: EnemyId, adet: number): void => {
    const mevcut = secimler.find((s) => s.id === id);
    if (mevcut === undefined) secimler.push({ id, adet });
    else mevcut.adet += adet;
    alinan.set(id, (alinan.get(id) ?? 0) + adet);
  };

  /** Bu tipten en fazla kaç tane alınabilir — puan, beden ve tip tavanı. */
  const tavan = (a: { id: EnemyId; puan: number; beden: number }, istenen: number): number =>
    Math.max(
      0,
      Math.min(
        istenen,
        Math.floor(kalanPuan / a.puan),
        Math.floor(kalanAdet / a.beden),
        tipTavani - (alinan.get(a.id) ?? 0),
      ),
    );

  // 1. tur — pahalıdan ucuza, her tipe tohumlu bir pay.
  //
  // **Ucuz tipler için beden ayrılıyor:** sırada bekleyen her aday için bir
  // beden saklanmazsa pahalı tipler bedenlerin hepsini yiyor ve dalga 40+
  // "24 Trol + 5 Örümcek Ana"ya çöküyordu — kadronun yarısı hiç sahaya
  // çıkmıyordu (üretilen dalgalar basılarak görüldü).
  adaylar.forEach((a, i) => {
    if (kalanPuan <= 0 || kalanAdet <= 0) return;
    const sirada = adaylar.length - 1 - i;
    const pay = 0.25 + rnd() * 0.45;
    const adet = tavan(
      a,
      Math.min(
        Math.floor((kalanPuan * pay) / a.puan),
        Math.floor(Math.max(0, kalanAdet - sirada) / a.beden),
      ),
    );
    if (adet <= 0) return;
    ekle(a.id, adet);
    kalanPuan -= adet * a.puan;
    kalanAdet -= adet * a.beden;
  });

  // 2. tur — artan bütçeyi ucuzdan pahalıya kapat. Tek bir "en ucuzla
  // doldur" adımı yerine sıra: artan bütçe hep aynı tipe gitmesin.
  for (const a of [...adaylar].reverse()) {
    if (kalanPuan <= 0 || kalanAdet <= 0) break;
    const adet = tavan(a, Number.MAX_SAFE_INTEGER);
    if (adet <= 0) continue;
    ekle(a.id, adet);
    kalanPuan -= adet * a.puan;
    kalanAdet -= adet * a.beden;
  }

  const toplamDusman = secimler.reduce((t, s) => t + s.adet, 0);
  const aralik = spawnDelayFor(toplamDusman);

  let t = 0;
  const groups: WaveGroup[] = [];
  secimler.forEach((s, i) => {
    groups.push({
      enemy: s.id,
      count: s.adet,
      spawnDelay: aralik,
      startAt: Math.round(t * 100) / 100,
      // Kapılar sırayla — sabit ve okunabilir (S58 gerekçesi burada da
      // geçerli; rastgele kapı dalga telgrafını yalancı yapardı).
      spawnPoint: i % kapilar,
    });
    t += s.adet * aralik;
  });

  return { index: n, groups };
}

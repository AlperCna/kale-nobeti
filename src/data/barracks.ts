/**
 * Kışla verisi ve engelleme sabitleri. TIER 1 kural 1: sayı burada.
 *
 * Her sayı `docs/GAME-DESIGN.md` §4.4 tablosundan ve 9 engelleme
 * kuralından **birebir**. Türetilen tek sayı `MELEE_DPS_PER_POINT` —
 * gerekçesi aşağıda, işareti `// GEÇİCİ — S66`.
 *
 * Kışla `towers.ts` içinde değil çünkü `BarracksDef` `TowerDef` değil:
 * hasarı, menzili, atış hızı yok. `TOWERS` dizisine sokmak `getTower`'ın
 * dönüş tipini kirletirdi.
 */

import type { BarracksDef, BarracksTier } from '../types/barracks';
import type { EnemyDef } from '../types/enemy';

/**
 * Kışla — hasar vermez, **zaman kazandırır** (§4.4).
 *
 * Paladin'in "kalkan"ı ve Haydutlar'ın "%25 kaçınma"sı §4.4'te sayısal
 * olarak tanımlı değil: `shield` **yazılmadı** (S43), `evasion` kaydedildi
 * ama anlamı seçildi (S44).
 */
export const KISLA: BarracksDef = {
  id: 'kisla',
  role: 'Hasar vermez, zaman kazandırır. Düşmanı kule menzilinde tutar.',
  tiers: [
    { cost: 90, soldierCount: 2, soldierHp: 45, soldierDps: 5, respawnSeconds: 8 },
    { cost: 140, soldierCount: 2, soldierHp: 75, soldierDps: 8, respawnSeconds: 7 },
  ],
  branches: [
    // 3a Paladin — `11 + kalkan`. Kalkan sayısı YOK (S43): shield yazılmadı.
    {
      cost: 210,
      soldierCount: 2,
      soldierHp: 140,
      soldierDps: 11,
      respawnSeconds: 6,
      branchName: 'Paladin',
    },
    // 3b Haydutlar — `9 + kaçınma %25`.
    {
      cost: 210,
      soldierCount: 3,
      soldierHp: 70,
      soldierDps: 9,
      respawnSeconds: 5,
      evasion: 0.25,
      branchName: 'Haydutlar',
    },
  ],
};

/** `0` = T1, `1` = T2, `2` = Paladin, `3` = Haydutlar. */
export function barracksTierAt(def: BarracksDef, index: 0 | 1 | 2 | 3): BarracksTier {
  if (index === 2) return def.branches[0];
  if (index === 3) return def.branches[1];
  return def.tiers[index];
}

/**
 * Engelleme sabitleri — `GAME-DESIGN.md` §4.4 kural 2 ve 6'dan **birebir**.
 *
 * Dördü de karesel karşılaştırılır (TIER 1 kural 9); kare değerleri
 * `BarracksSystem` içinde bir kez hesaplanıyor.
 */
export const BLOCK = {
  /** Kural 2: bu yarıçaptaki en yakın engellenmemiş düşman hedeflenir. px. */
  aggroRadius: 60,
  /** Kural 2: bu mesafede iki taraf kilitlenir, düşman durur. px. */
  contactRadius: 20,
  /** Kural 6: toplanma noktası kışlaya bu kadar uzağa konabilir. px. */
  rallyRange: 160,
  /** Kural 6: toplanma noktası yola bu kadar yakın bir yere yapışır. px. */
  pathSnapMax: 40,
} as const;

/**
 * Askerin yürüme hızı. Birim: px/sn.
 *
 * `// GEÇİCİ — S68`: dokümanda yok. Kadronun **en yavaş** düşmanından
 * (Ogre Şef, 28) hızlı, en hızlısından (Kurt Binicisi, 110) yavaş olmalı;
 * yoksa asker ya hedefine yetişemez ya da kuralları anlamsızlaştıracak
 * kadar çevik olur. §5 tablosunun ortancası olan Ork Savaşçı'nın hızı (45)
 * bu iki koşulu da sağlıyor ve uydurma bir sayı getirmiyor.
 */
export const SOLDIER_SPEED = 45;

/**
 * ## Düşmanın askere verdiği hasar — dokümanda **YOK** (`// GEÇİCİ — S66`)
 *
 * §4.4 kural 3 "düşman yalnızca `blockedBy` askerine hasar verir" diyor ama
 * **hangi sayıyla** olduğunu ne §4.4 ne §5 söylüyor. §5 düşman tablosunda
 * saldırı gücü sütunu hiç yok. Bu sayı olmadan engelleme yazılamaz.
 *
 * **Uydurulmadı, türetildi.** İki belgelenmiş sayı ve bir belgelenmiş ölçek
 * kullanıldı:
 *
 * - §4.4 T1 satırı: asker **45 HP**, diriliş **8 sn**.
 * - Tasarım niyeti: kışla bir baraj değil, zaman kazanma aracı (kural 5).
 *   T1 askerinin kadronun **en zayıf** düşmanına (Goblin, 1 puan) karşı tam
 *   **bir diriliş döngüsü** dayanması, "kışla akışı yavaşlatır ama
 *   durdurmaz" niyetinin en sade sayısal karşılığı.
 * - §5 zaten `altın = 3 × puan` ile **puanı evrensel tehdit ölçeği** olarak
 *   kullanıyor. Aynı ölçeği burada da kullanmak yeni bir kavram getirmiyor.
 *
 *       K = 45 HP / 8 sn / 1 puan = 5,625 DPS / puan
 *
 * Sonuçlar (kadro): Goblin 5,6 · Ork Savaşçı 11,3 · Kurt Binicisi 16,9 ·
 * Zırhlı Ork 22,5 · Şaman 28,1 · Örümcek Ana 33,8 · Trol 45,0.
 *
 * Sağlaması: Trol (45 DPS) bir T1 askerini (45 HP) **1,0 saniyede**,
 * bir Paladin'i (140 HP) **3,1 saniyede** öldürüyor — §5'in Trol'ü
 * "kışlayla tut" diye işaretlemesiyle tutarlı, ama kışlayı sonsuz duvar
 * yapmıyor.
 *
 * **Boss bu formüle girmiyor** — §4.4 kural 9 onu açıkça istisna tutuyor:
 * askeri tek vuruşta öldürür. (Formül boss için 140,6 DPS verirdi ve zaten
 * bir Paladin'i ~1 sn'de öldürürdü; kural 9 bunu anlıktan yapıyor.)
 */
export const MELEE_DPS_PER_POINT = 45 / 8;

/** Bir düşmanın askere verdiği saniyelik hasar (S66). Boss kural 9 ile ayrı. */
export function meleeDps(def: EnemyDef): number {
  return def.points * MELEE_DPS_PER_POINT;
}

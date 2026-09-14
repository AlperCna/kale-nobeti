/**
 * Zorluk seviyeleri — `M8-T11` (açık soru **S80 kapandı**).
 *
 * TIER 1 kural 1: sayılar burada.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * ## Zor neden HP çarpanı DEĞİL
 *
 * Plan "Zor çarpanı, referans tahtayla beş haritanın da `waveSim`'de
 * geçilebildiği en yüksek 0,05 adımı" diyordu. **Ölçüm bu sorunun cevabının
 * `1,00` olduğunu gösterdi** — yani öyle bir adım yok:
 *
 * | HP çarpanı | En yüksek can kaybı (5 harita) |
 * |---|---|
 * | ×1,00 | 16 / 20 ✓ |
 * | ×1,05 | **21 / 20 ✗** (Kadim Harabe) |
 *
 * Sebep tasarımın kendisi: her harita zaten "referans tahta 20 canın
 * altında kalsın" ölçütüyle ayarlandı ve harita 5 o bandın üst ucunda
 * (16/20). Üstüne çarpan koymak için önce haritaları gevşetmek gerekirdi.
 *
 * İkinci ölçüm daha da belirleyici oldu: **HP çarpanı boss'u hiç
 * etkilemiyordu.** `BOSS_HP_BY_MAP` mutlak bir sayı ve `bossFor` onu
 * `hpMultiplier`'a bölüyor; `MapDef.hpMultiplier`'ı çarpmak bölmeyi de
 * çarpıyor ve boss aynı kalıyor. Boss'u da ölçekleyen tek yol doğum
 * anındaki çarpan (sonsuz modun `endlessHpScale` yolu) — ve o yolla
 * ölçüldüğünde Kısıt A oranları şöyle çıkıyor:
 *
 * | Çarpan | En kötü Kısıt A oranı | Nerede |
 * |---|---|---|
 * | ×1,00 | %92 | Harita 1 boss (§5'in belgelenmiş 700'ü) |
 * | ×1,10 | **%101** | aynı — referans tahta boss'u **öldüremiyor** |
 *
 * Yani ×1,10'da harita 1 (öğretici harita) referans tahtayla geçilemez
 * hâle geliyor. Bir "Zor" seviyesi zorlaştırmalı, imkânsızlaştırmamalı.
 *
 * ## Uygulanan çözüm: Zor CAN'ı kısıyor
 *
 * Can sayısı Kısıt A'ya, referans tahtaya, tavana, boss türetmesine
 * **hiç girmiyor** — yani hiçbir düşmanı öldürülemez yapmıyor, yalnız
 * hata payını daraltıyor. Ölçülen can kayıpları (referans tahta):
 *
 * | Harita | 1 | 2 | 3 | 4 | 5 |
 * |---|---|---|---|---|---|
 * | Can kaybı | 0 | 6 | 10 | 13 | 16 |
 *
 * **12 can** seçildi: 1-3 referans tahtayla hâlâ geçiliyor (öğrenme
 * yayı korunuyor), 4 ve 5 referans tahtadan **daha iyi** bir tahta
 * istiyor. Zor'un tanımı tam bu.
 *
 * Kolay ise HP çarpanı olarak kalıyor — orada tavan sorunu yok, tersine
 * pay artıyor (ölçülen can kayıpları 0 / 2 / 3 / 4 / 7).
 */

import { BALANCE } from './balance';

export type Difficulty = 'kolay' | 'normal' | 'zor';

export interface DifficultyDef {
  /** Düşman HP'sine **doğum anında** uygulanan ek çarpan (boss dahil). */
  readonly hpScale: number;
  readonly startLives: number;
  /**
   * Yıldız kaydediliyor mu.
   *
   * **Kolay'da kaydedilmiyor** — karar yazılı: Kolay bir öğrenme modu,
   * ve `SaveSystem` yıldızı düşürmediği için Kolay'da alınan ★★★ sonsuza
   * kadar "bu haritayı üç yıldızla bitirdim" diye durur. Harita kilidi
   * yine açılıyor (`isCompleted` yıldıza bakıyor ama Kolay'da da
   * ilerlemek mümkün olmalı) — bkz. `DIFFICULTY` kullanım yerleri.
   */
  readonly recordStars: boolean;
}

export const DIFFICULTY: Readonly<Record<Difficulty, DifficultyDef>> = {
  kolay: { hpScale: 0.85, startLives: BALANCE.startLives, recordStars: false },
  normal: { hpScale: 1, startLives: BALANCE.startLives, recordStars: true },
  zor: { hpScale: 1, startLives: 12, recordStars: true },
};

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export function isDifficulty(x: unknown): x is Difficulty {
  return x === 'kolay' || x === 'normal' || x === 'zor';
}

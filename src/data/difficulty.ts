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
 * İkinci ölçüm daha da belirleyici oldu. **Dikkat — o ölçümün gerekçesi
 * `M11`'de düzeltildi (S92):** "HP çarpanı boss'u hiç etkilemiyor"
 * cümlesi **ölçüm aracını** anlatıyordu, oyunu değil. `MapDef.hpMultiplier`'ı
 * çarpmak `bossFor`'un bölmesini de çarpıyor ve ikisi sadeleşiyor; ama
 * canlı oyun tanımı **çarpansız** haritadan çözüp doğum çarpanını ayrı
 * veriyor (`GameScene`), yani boss gerçekte `BOSS_HP × hpScale`. Artık
 * `waveSim` de bu ayrımı taşıyor. Aşağıdaki Kısıt A oranları doğum
 * çarpanı yoluyla ölçülmüştü, yani **onlar baştan doğruydu**:
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
 * | Can kaybı (`M8`) | 0 | 6 | 10 | 13 | 16 |
 * | Can kaybı (`M11-T02`) | 0 | 4 | 7 | 13 | 15 |
 *
 * **12 can** seçildi: 1-3 referans tahtayla hâlâ geçiliyor (öğrenme
 * yayı korunuyor), 4 ve 5 referans tahtadan **daha iyi** bir tahta
 * istiyor. Zor'un tanımı tam bu.
 *
 * Kolay ise HP çarpanı olarak kalıyor — orada tavan sorunu yok, tersine
 * pay artıyor (`M11-T02` ölçümü, ×0,80: 0 / 0 / 1 / 3 / 7).
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
  /**
   * **S91 (`M11-T02`): 0,85 → 0,80.** Dal dengesi referans tahtayı
   * zayıflattı; ×0,85'te harita 5 Kolay'da **11 can** kaybediyor
   * (sınır 10). Ölçüm: ×0,85 → 0·1·2·7·11 ✗ · **×0,80 → 0·0·1·3·7 ✓**.
   * Ölçütü karşılayan **en yüksek** adım seçildi — Kolay'ı gereğinden
   * fazla boşaltmak da bir tasarım hatası (×0,70'te harita 4 bir can
   * kaybediyor, yani tahta hiç sınanmıyor).
   *
   * Öncesi: **S84 GERİ ALINDI (S86).** `M10-T03` sırasında 0,85 → 0,75
   * yapılmıştı; o ölçüm `waveSim`'in süreli etki körlüğü kapatılmadan
   * alınmıştı. Üç körlük de kapanınca 0,85 ölçütü karşılıyordu.
   */
  kolay: { hpScale: 0.8, startLives: BALANCE.startLives, recordStars: false },
  normal: { hpScale: 1, startLives: BALANCE.startLives, recordStars: true },
  zor: { hpScale: 1, startLives: 12, recordStars: true },
};

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export function isDifficulty(x: unknown): x is Difficulty {
  return x === 'kolay' || x === 'normal' || x === 'zor';
}

/**
 * Altın ve can. `docs/GAME-DESIGN.md` §6, §4.5, §9.
 *
 * TIER 1 kural 1: sayı yok, hepsi `data/balance.ts` ve `MapDef`'ten geliyor.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { EnemyDef } from '../types/enemy';
import type { MapDef } from '../types/map';
import { BALANCE } from '../data/balance';
import type { EventBus } from './EventBus';

export class EconomySystem {
  #gold: number;
  #lives: number;
  /** Yapı noktası başına o noktaya harcanan **toplam** altın (satış için). */
  readonly #spentBySpot = new Map<number, number>();

  constructor(
    private readonly map: MapDef,
    private readonly bus: EventBus,
  ) {
    this.#gold = map.startGold;
    this.#lives = BALANCE.startLives;
  }

  get gold(): number {
    return this.#gold;
  }

  get lives(): number {
    return this.#lives;
  }

  canAfford(cost: number): boolean {
    return cost >= 0 && this.#gold >= cost;
  }

  /** @returns Harcandıysa `true`. Yetersizse altın **değişmez**. */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.#gold -= cost;
    this.bus.emit('gold:changed', { total: this.#gold });
    return true;
  }

  /** Ödül, bonus, iade. Negatif miktar yok sayılır. */
  earn(amount: number): void {
    if (!(amount > 0)) return;
    this.#gold += amount;
    this.bus.emit('gold:changed', { total: this.#gold });
  }

  /**
   * Öldürme altını. `GAME-DESIGN.md` §9: **altın çarpanı HP çarpanına eşit**.
   *
   * Çarpan uygulanmasaydı harita 3'te altın/HP oranı %38'e düşer ve
   * oyuncunun eline 12 noktayı doldurmaya bile yetmeyen para geçerdi (§9).
   */
  award(enemy: EnemyDef): void {
    this.earn(Math.round(enemy.gold * this.map.goldMultiplier));
  }

  /**
   * Kule yerleştirme/yükseltme — harcamayı **yapı noktasına** yazar ki
   * satışta kümülatif iade doğru hesaplansın.
   */
  buyAt(spotIndex: number, cost: number): boolean {
    if (!this.spend(cost)) return false;
    this.#spentBySpot.set(spotIndex, (this.#spentBySpot.get(spotIndex) ?? 0) + cost);
    return true;
  }

  /** Bir yapı noktasına şimdiye kadar harcanan toplam. */
  spentAt(spotIndex: number): number {
    return this.#spentBySpot.get(spotIndex) ?? 0;
  }

  /**
   * Satış iadesi: harcanan **toplamın** %70'i, tek kademenin değil (§4.5).
   *
   * Aşağı yuvarlanıyor: yukarı yuvarlamak sat-al döngüsüyle altın üretmeye
   * açık kapı bırakırdı (1 altınlık kule → 1 altın iade).
   */
  sellRefund(spentTotal: number): number {
    if (!(spentTotal > 0)) return 0;
    return Math.floor(spentTotal * BALANCE.sellRefund);
  }

  /** @returns İade edilen altın. Nokta boşsa `0`. */
  sellAt(spotIndex: number): number {
    const harcanan = this.spentAt(spotIndex);
    if (harcanan <= 0) return 0;
    const iade = this.sellRefund(harcanan);
    this.#spentBySpot.delete(spotIndex);
    this.earn(iade);
    return iade;
  }

  /**
   * Dalga bitiş bonusu `30 + 5n` (§6), **harita altın çarpanıyla**.
   *
   * ## Çarpan neden buraya da uygulanıyor (S70)
   *
   * §9 altın çarpanını açık bir gerekçeyle koymuş: *"Eskiden yalnız HP
   * ölçekleniyordu; altın ve kule maliyetleri sabit kaldığı için harita
   * 3'te altın/HP oranı %38'e düşüyordu."* Ama çarpan yalnız **öldürme
   * altınına** uygulanıyordu; dalga bitiş bonusu haritadan bağımsız sabit
   * 575 kalıyordu.
   *
   * M7'de ölçüldü — §9'un niyeti gerçekleşmiyordu:
   *
   * | Harita | HP çarpanı | Toplam gelir çarpanı |
   * |---|---|---|
   * | 1 | ×1,0 | ×1,00 |
   * | 2 | ×1,6 | **×1,33** |
   * | 3 | ×2,6 | **×1,85** |
   *
   * Sonuç: harita 2'de boss Kısıt A tavanının %192'si, harita 3'te %292'si
   * çıkıyordu — yani öldürülemez. Çarpanı bonusa da uygulamak §9'un yazılı
   * gerekçesini yerine getiriyor; yeni bir sayı uydurmuyor.
   *
   * Başlangıç altını §9'da tek tek verildiği için (280/340/400)
   * **değiştirilmedi**; kalan küçük fark ondan geliyor.
   */
  awardWaveEnd(waveNo: number): number {
    const b = Math.round(BALANCE.waveEndBonus(waveNo) * this.map.goldMultiplier);
    this.earn(b);
    return b;
  }

  /** Can **0'ın altına inmez.** @returns Gerçekten düşen can. */
  loseLife(amount = 1): number {
    if (!(amount > 0) || this.#lives <= 0) return 0;
    const dusen = Math.min(amount, this.#lives);
    this.#lives -= dusen;
    this.bus.emit('life:lost', { remaining: this.#lives });
    return dusen;
  }

  get isDefeated(): boolean {
    return this.#lives <= 0;
  }
}

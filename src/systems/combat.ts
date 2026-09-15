/**
 * Hasar çözümü. `docs/GAME-DESIGN.md` §3.
 *
 * **Oyunun tüm karşı-oyun katmanı bu saf fonksiyonun üstünde duruyor.**
 * `Enemy` kendi hasarını hesaplamaz (`CLAUDE.md` Mimari kuralı); M3'teki
 * Kısıt A/B sağlamaları bunu binlerce kez çağıracak.
 *
 * Saf: sahne yok, rastgelelik yok, zaman yok.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { DamageType, EnemyDef } from '../types/enemy';
import type { TowerEffect } from '../types/tower';
import { BALANCE } from '../data/balance';

/**
 * Hiçbir vuruş tamamen emilmez — ham hasarın en az bu oranı geçer.
 *
 * `GAME-DESIGN.md` §3: "oyuncu tamamen yanlış kule kurduğunda oyun
 * kilitlenmez, sadece verimsizleşir. Ceza var ama duvar yok."
 *
 * Sayının kendisi `data/balance.ts`'te (TIER 1 kural 1) — burası yalnız
 * okunur bir takma ad; M2'de sayı bu dosyada yazılıydı ve kuralı deliyordu.
 */
export const DAMAGE_FLOOR_RATIO = BALANCE.damageFloor;

export interface DamageResult {
  /** Düşmanın canından düşecek miktar. Yuvarlanmaz — gösterim katmanı yuvarlar. */
  readonly dealt: number;
  /**
   * Taban devreye girdi mi (zırh/direnç hasarın çoğunu emdi).
   *
   * Hasar sayısının **gri + kalkan ikonu** ile çizilmesi buna bağlı
   * (`GAME-DESIGN.md` §3). Geri bildirim zorunluluğu: taban hasara düşen
   * vuruşlar oyuncuya "kırık" gibi görünüyor.
   */
  readonly floored: boolean;
}

/** `applyDamage`'ın ihtiyaç duyduğu düşman alanları. */
export type Defenses = Pick<EnemyDef, 'armor' | 'magicResist'>;

/**
 * `GAME-DESIGN.md` §3'teki kod bloğunun birebir uygulaması.
 *
 * - **Fiziksel** → zırh ile **sabit miktar** azalır.
 * - **Büyü** → büyü direnci ile **yüzde** azalır.
 * - **Gerçek** → hiçbir şeyle azalmaz (yalnız yeteneklerde).
 *
 * @param dmg Ham hasar. Uçan çarpanı (`airMultiplier`) **buraya girmeden
 *   önce** uygulanır — o kulenin özelliği, düşmanın savunması değil.
 */
export function applyDamage(dmg: number, type: DamageType, e: Defenses): DamageResult {
  if (!(dmg > 0)) return { dealt: 0, floored: false };

  let out = dmg;
  if (type === 'physical') out = dmg - e.armor;
  if (type === 'magic') out = dmg * (1 - e.magicResist);

  const taban = dmg * DAMAGE_FLOOR_RATIO;
  if (out < taban) return { dealt: taban, floored: true };
  return { dealt: out, floored: false };
}

/**
 * Kalkan emilimi — `M10-T03`.
 *
 * `applyDamage`'dan **ayrı** bir adım, çünkü sırası önemli: zırh/direnç
 * önce uygulanıyor (vuruşun gerçek gücü), kalkan sonra emiyor. Ters sıra
 * olsaydı kalkan zırhın da işini görür ve iki savunma çarpışırdı.
 *
 * Fonksiyon **paylaşılıyor**: hem oyun (`GameScene`'in mermi geri
 * çağrısı) hem `waveSim` bunu çağırıyor. İkisinde ayrı ayrı yazılsaydı
 * denge testi oyunun ölçtüğünden başka bir şey ölçerdi — bu projenin
 * en pahalı hata sınıfı.
 *
 * @returns **Candan** düşecek miktar. Hedefin `shieldLeft`'i tüketiliyor.
 */
export function kalkandanGecir(dealt: number, hedef: { shieldLeft: number }): number {
  if (!(hedef.shieldLeft > 0) || !(dealt > 0)) return dealt;
  const emilen = Math.min(hedef.shieldLeft, dealt);
  hedef.shieldLeft -= emilen;
  return dealt - emilen;
}

/**
 * **Kule sinerjisi** — `M10-T05`.
 *
 * Yavaşlatılmış düşman fiziksel hasardan daha çok etkileniyor. Çarpan
 * **ham hasara** uygulanıyor, zırhtan önce: "daha sert vuruyor"un doğal
 * okunuşu bu. Zırhtan sonra uygulansaydı zırhsız düşmanla zırhlı düşman
 * arasındaki farkı büyütürdü ve sinerji zırhı delen bir şeye dönüşürdü
 * — Büyü ailesinin işine girerdi (§3: zırhı delen şey büyü hasarı).
 *
 * **Yalnız fiziksel.** Büyü zaten zırhı yok sayıyor; ikisini birden
 * güçlendirmek "her kule her kuleyle iyi" demek olurdu ve sinerjinin
 * amacı **seçim** üretmek.
 *
 * Saf ve paylaşılan: `ProjectileSystem` bunu hem oyunda hem `waveSim`'de
 * aynı yerden çağırıyor. Bu oturumda üç kez (S80, S81, S86) oyun ile
 * simülasyonun ayrı şey çalıştırdığı bulundu; dördüncüsü olmasın.
 */
export function yavaslatmaSinerjisi(
  type: DamageType,
  hedef: { readonly effects: { readonly slowSeconds: number } },
): number {
  if (type !== 'physical') return 1;
  return hedef.effects.slowSeconds > 0 ? BALANCE.yavaslatmaFizikselBonus : 1;
}

/**
 * Bir kule etkisinin **sürdürülebilir** ek DPS'i — `M11-T01`.
 *
 * ## Neden var
 *
 * `balanceChecks.effectiveDps` ve `fx/TowerInfoPanel` yalnız
 * `damage × fireRate` hesaplıyordu, yani **yanma ve yavaşlatma
 * görünmüyordu**. Sonuç ölçüldü: referans tahta altı T3 dalından
 * üçünü hiç seçmiyor ve oyuncu panelde Kundakçı'nın neden iyi
 * olabileceğini okuyamıyor.
 *
 * ## Yanma
 *
 * `applyEffect` süreyi **tazeliyor, DPS'i toplamıyor** (S34). Yani kule
 * yanma bitmeden tekrar vurduğu sürece yanma kesintisiz: katkı tam
 * `dps`. Atış aralığı yanma süresinden uzunsa aradaki boşluk kadar
 * düşüyor — görev döngüsü `seconds × fireRate`, 1'de doyuyor.
 *
 * Yanma **gerçek hasar**: zırh/direnç uygulanmıyor (§4.1'de ayrı bir
 * kanal). O yüzden `applyDamage`'dan geçmiyor ve zırhlı düşmana karşı
 * oransal olarak daha değerli.
 *
 * ## Yavaşlatma ve zincir: bilerek **0**
 *
 * - **Yavaşlatma hasar değil.** Değeri "düşman menzilde daha uzun
 *   kalıyor"; DPS'e katmak onu hasar gibi göstermek olurdu ve Kısıt
 *   A'nın `DPS × kapsananYol / hız` formülünde iki kez sayılırdı.
 *   Oyuncuya **ayrı bir satırda** gösteriliyor (`TowerInfoPanel`) —
 *   araştırmanın "tam bilgi ver" kuralı.
 * - **Zincir tek hedefte hiçbir şey eklemiyor.** Değeri kalabalığa
 *   bağlı ve bu fonksiyon "şu düşmana karşı" sorusunu cevaplıyor.
 */
export function etkiDps(effect: TowerEffect | undefined, fireRate: number): number {
  if (effect === undefined || effect.kind !== 'burn') return 0;
  if (!(fireRate > 0) || !(effect.seconds > 0)) return 0;
  const gorevDongusu = Math.min(1, effect.seconds * fireRate);
  return effect.dps * gorevDongusu;
}

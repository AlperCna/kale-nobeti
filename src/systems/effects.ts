/**
 * Süreli kule etkileri: yanma, yavaşlatma. `M4-T04`.
 *
 * Zincirleme (`chain`) süreli değil, anlık — `ProjectileSystem` içinde
 * çözülüyor.
 *
 * TIER 1 kural 8: süreler `scaledDelta` ile azalır — **2× hızda yanma da
 * iki kat hızlı biter ve toplam hasar aynı kalır.**
 * TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * ## Yığılma kuralları (S34, S35) — dokümanda yok
 *
 * `// GEÇİCİ`: her ikisi de **yenileme**, yığılma yok.
 * - **Yanma (S34):** ikinci Kundakçı vurunca süre sıfırlanıyor, DPS
 *   toplanmıyor. Yığılsaydı iki Kundakçı 8 DPS eder ve tek dalın gücü
 *   kule sayısıyla üstel büyürdü.
 * - **Yavaşlatma (S35):** **en güçlüsü kazanıyor.** Buz (%50) varken
 *   Barut Fıçısı (%40) vurursa yavaşlatma %50'de kalıyor; tersi olsaydı
 *   daha zayıf efekt güçlüyü ezerdi. Çarpımsal yığılma (%50 × %40 = %70)
 *   iki kule ile düşmanı neredeyse durdururdu.
 */

import type { EnemyState } from '../types/enemy';
import type { TowerEffect } from '../types/tower';

const MS_TO_S = 1 / 1000;

/** Bir düşmanın üstündeki aktif süreli etkiler. */
export interface ActiveEffects {
  /** Kalan yanma süresi (sn) ve DPS'i. `seconds <= 0` ise yanma yok. */
  burnSeconds: number;
  burnDps: number;
  /** Kalan yavaşlatma süresi (sn) ve oranı (0..1). */
  slowSeconds: number;
  slowFactor: number;
}

export function emptyEffects(): ActiveEffects {
  return { burnSeconds: 0, burnDps: 0, slowSeconds: 0, slowFactor: 0 };
}

/** Havuza dönen düşmanda çağrılır — sıfırlanmayan yanma yeni düşmanı yakar. */
export function resetEffects(fx: ActiveEffects): void {
  fx.burnSeconds = 0;
  fx.burnDps = 0;
  fx.slowSeconds = 0;
  fx.slowFactor = 0;
}

/** Kule etkisini düşmana uygular. Zincirleme burada işlenmez. */
export function applyEffect(fx: ActiveEffects, effect: TowerEffect): void {
  switch (effect.kind) {
    case 'burn':
      // Yenileme: süre sıfırlanıyor, DPS toplanmıyor (S34).
      fx.burnSeconds = effect.seconds;
      fx.burnDps = effect.dps;
      return;
    case 'slow':
      // En güçlüsü kazanıyor (S35). Eşitse süre tazeleniyor.
      if (effect.factor > fx.slowFactor || fx.slowSeconds <= 0) {
        fx.slowFactor = effect.factor;
        fx.slowSeconds = effect.seconds;
      } else if (effect.factor === fx.slowFactor) {
        fx.slowSeconds = Math.max(fx.slowSeconds, effect.seconds);
      }
      return;
    case 'chain':
      // Anlık; `ProjectileSystem` çözüyor.
      return;
  }
}

/** Yavaşlatma uygulanmış hız çarpanı. Yavaşlatma yoksa `1`. */
export function speedMultiplier(fx: ActiveEffects): number {
  return fx.slowSeconds > 0 ? 1 - fx.slowFactor : 1;
}

/**
 * Süreleri ilerletir ve bu karede yanmadan gelen hasarı döndürür.
 *
 * @param scaledDelta `GameClock.scaledDelta`, birim ms.
 * @returns Bu karede uygulanacak yanma hasarı. `0` ise yanma yok.
 */
export function stepEffects(fx: ActiveEffects, scaledDelta: number): number {
  const dt = scaledDelta * MS_TO_S;
  if (!(dt > 0)) return 0;

  if (fx.slowSeconds > 0) {
    fx.slowSeconds -= dt;
    // Süre bitince oran da sıfırlanıyor: "yavaşlatma süresi bitince hız
    // eski değerine dönmüyorsa bitmedi sayılır" maddesi.
    if (fx.slowSeconds <= 0) {
      fx.slowSeconds = 0;
      fx.slowFactor = 0;
    }
  }

  if (fx.burnSeconds <= 0) return 0;

  // Yanma süresinin **son parçası** tam sayılıyor: kare süresi kalan
  // süreden uzunsa yalnız kalan kadar hasar veriliyor. Aksi hâlde toplam
  // hasar kare boyutuna göre değişirdi.
  const gecen = Math.min(dt, fx.burnSeconds);
  const hasar = fx.burnDps * gecen;

  fx.burnSeconds -= dt;
  if (fx.burnSeconds <= 0) {
    fx.burnSeconds = 0;
    fx.burnDps = 0;
  }
  return hasar;
}

/** `EnemyState` + etkiler — `Enemy` ve simülasyon düşmanı ikisi de uyguluyor. */
export interface Burnable extends EnemyState {
  effects: ActiveEffects;
}

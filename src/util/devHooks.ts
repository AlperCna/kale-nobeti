/**
 * Geliştirme kancaları. **Yayın yapısına girmez.**
 *
 * `CLAUDE.md` Platform: "yayın yapısında konsol çıktısı, hata ayıklama
 * tuşları ve FPS sayacı bulunmaz." Buradaki her erişim
 * `import.meta.env.DEV` ile korunuyor; derleyici üretimde dalı tamamen
 * siliyor (M0-T08'de `dist/` taranarak doğrulandı).
 *
 * Var olma sebebi: bazı iddialar gözle doğrulanamıyor.
 * "2× gerçekten iki kat mı", "duraklatmada Game durup Hud çalışmaya
 * devam ediyor mu" — ikisi de sayaç ister.
 *
 * TIER 1 kural 11: bu dosya Phaser'a dokunmaz.
 */
export interface DevHooks {
  /** Geçici hız göstergesinin x konumu. M1'de kalkacak. */
  probeX: () => number;
  /** `GameScene.update` çağrı sayısı. Duraklatmada **artmamalı**. */
  gameFrames: number;
  /** `HudScene.update` çağrı sayısı. Duraklatmada **artmaya devam etmeli**. */
  hudFrames: number;
  scale: () => 1 | 2;
  paused: boolean;
}

type Global = { __kn?: Partial<DevHooks> };

/** Kanca nesnesini döndürür; üretimde `undefined`. */
export function devHooks(): Partial<DevHooks> | undefined {
  if (!import.meta.env.DEV) return undefined;

  const g = globalThis as Global;
  g.__kn ??= { gameFrames: 0, hudFrames: 0, paused: false };
  return g.__kn;
}

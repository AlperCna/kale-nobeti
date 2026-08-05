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
  /** `GameScene.update` çağrı sayısı. Duraklatmada **artmamalı**. */
  gameFrames: number;
  /** `HudScene.update` çağrı sayısı. Duraklatmada **artmaya devam etmeli**. */
  hudFrames: number;
  scale: () => 1 | 2;
  paused: boolean;
  /** `bus.clear()` kaç kez çağrıldı. Sahne yeniden başlatma sızıntı testi. */
  clearCount: number;
  /** `scene.events` üzerindeki SHUTDOWN dinleyici sayısı. Birikmemeli. */
  shutdownListeners: () => number;
  /** Sahneyi yeniden başlatır — yeniden başlatma davranışını sınamak için. */
  restartGame: () => void;

  // --- M1 ---
  /** Havuzdaki **kullanımdaki** düşman sayısı. Uzun koşuda sürekli artmamalı. */
  enemyActive: () => number;
  /** Havuz kapasitesi. **Sabit kalmalı** — sessiz büyüme TIER 1 kural 3 ihlali. */
  enemyCapacity: () => number;
  /** `acquire` kaç kez `null` döndü. */
  poolExhausted: number;
  /** Kalan can. */
  lives: () => number;
  /** Harita 1'in ölçülen yol uzunluğu (S16). */
  pathLength: () => number;
  /** Yapı noktası kapsamaları — `M1-T09` ekranda da gösteriyor. */
  coverage: () => readonly { spotIndex: number; coveredPx: number }[];
  /** Ortalama kapsama. `research/01` §4 çelişkisinin ölçülen cevabı. */
  coverageAverage: () => number;

  // --- M2 ---
  /** Havadaki mermi sayısı. */
  projectileActive: () => number;
  /** Oyun boyunca görülen en yüksek mermi sayısı — havuz boyutu kararı. */
  projectilePeak: () => number;
  damageTextActive: () => number;
  towerCount: () => number;
  /** @returns Yerleştirilebildiyse `true`. */
  placeTower: (spotIndex: number, towerId: string) => boolean;
  hoverSpot: (spotIndex: number) => void;
  /** Hasar sayısı üretip rengini/ölçeğini döndürür — iki renk kuralı sınaması. */
  showDamage: (amount: number, floored: boolean) => { tint: number; scale: number; text: string };

  // --- M3 ---
  gold: () => number;
  wavePhase: () => string;
  waveNumber: () => number;
  prepRemaining: () => number;
  startWaveEarly: () => number;
  gameOver: () => { won: boolean; lives: number; stars: number };
  /** T1 → T2. @returns Yükseltilebildiyse `true`. */
  upgradeTower: (spotIndex: number) => boolean;
  /** @returns İade edilen altın. */
  sellTower: (spotIndex: number) => number;
}

type Global = { __kn?: Partial<DevHooks> };

/** Kanca nesnesini döndürür; üretimde `undefined`. */
export function devHooks(): Partial<DevHooks> | undefined {
  if (!import.meta.env.DEV) return undefined;

  const g = globalThis as Global;
  g.__kn ??= { gameFrames: 0, hudFrames: 0, paused: false, clearCount: 0 };
  return g.__kn;
}

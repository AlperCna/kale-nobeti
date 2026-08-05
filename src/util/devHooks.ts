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
  upgradeTower: (spotIndex: number, tier?: number) => boolean;
  /** @returns İade edilen altın. */
  sellTower: (spotIndex: number) => number;

  // --- M4 ---
  /** Kuleyi seçip bilgi panelini açar. @returns Panel görünür mü. */
  selectTower: (spotIndex: number) => boolean;
  /** Açık paneldeki bir düşmana karşı **etkin** DPS. */
  infoDps: (enemyId: string) => number;
  setTargetMode: (spotIndex: number, mod: string) => string;
  towerTier: (spotIndex: number) => number;
  flyerHintOn: () => boolean;
  enemyKinds: () => string[];
  enemySpeedFactors: () => number[];

  // --- M5 ---
  /** @returns Kurulabildiyse `true`. */
  placeBarracks: (spotIndex: number) => boolean;
  upgradeBarracks: (spotIndex: number, tier: number) => boolean;
  sellBarracks: (spotIndex: number) => number;
  /** Toplanma noktasını taşır; **kural 6'dan geçmiş** sonucu döndürür. */
  setRally: (spotIndex: number, x: number, y: number) => { x: number; y: number };
  rallyOf: (spotIndex: number) => { x: number; y: number };
  /** Askerlerin durumu — engelleme kurallarının canlı sağlaması. */
  soldiers: () => {
    spotIndex: number;
    state: string;
    hp: number;
    engaged: boolean;
    x: number;
    y: number;
  }[];
  soldierActive: () => number;
  soldierCapacity: () => number;
  /** Kaç düşman şu an engelleniyor (kural 5 tavanı). */
  blockedEnemies: () => number;
  abilityReady: (id: string) => boolean;
  abilityProgress: (id: string) => number;
  /** @returns Meteor'un vurduğu düşman sayısı ve toplam hasar. */
  castMeteor: (x: number, y: number) => { hit: number; totalDamage: number } | null;
  castReinforcements: (x: number, y: number) => number;

  // --- M6 ---
  shakeOffset: () => { x: number; y: number };
  shakeActive: () => boolean;
  triggerShake: (dx: number, dy: number, strength: number) => void;
  hitStopActive: () => boolean;
  /** @returns Kalan hit-stop süresi (ms). */
  triggerHitStop: (ms: number) => number;
  /** Yaşayan parçacık sayısı — §10 tavanı 300. */
  particleCount: () => number;
  settings: () => { sound: boolean; screenShake: boolean; effects: string; scale: number };
  setSetting: (key: string, value: unknown) => { sound: boolean; screenShake: boolean; effects: string };
}

type Global = { __kn?: Partial<DevHooks> };

/** Kanca nesnesini döndürür; üretimde `undefined`. */
export function devHooks(): Partial<DevHooks> | undefined {
  if (!import.meta.env.DEV) return undefined;

  const g = globalThis as Global;
  g.__kn ??= { gameFrames: 0, hudFrames: 0, paused: false, clearCount: 0 };
  return g.__kn;
}

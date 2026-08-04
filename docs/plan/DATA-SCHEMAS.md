# Veri şemaları

`src/types/` ve `src/data/` altındaki tüm arayüzler. Her alanda **birim**
yorumu ve **kaynak bölüm** atfı var.

Kural: her sayı `docs/GAME-DESIGN.md` veya `CLAUDE.md`'den gelir.
Kaynağı olmayan alanlar `// AÇIK SORU S<nn>` ile işaretli — **uydurulmadı.**

---

## 1. Temel tipler

```ts
// src/types/common.ts

/** Mantıksal ekran koordinatı. Birim: px (1280×720 ölçeğinde). */
export interface Vec2 { readonly x: number; readonly y: number }

/** Oyun hızı. GAME-DESIGN §1 Kontroller. Duraklatma scene.pause ile, 0 yok. */
export type Speed = 1 | 2;

export type TowerId  = 'archer' | 'cannon' | 'magic' | 'barracks';
export type EnemyId  =
  | 'goblin' | 'orcWarrior' | 'armoredOrc' | 'harpy' | 'wolfRider'
  | 'shaman' | 'troll' | 'spiderQueen' | 'spiderling' | 'ogreChief';

/** GAME-DESIGN §3. 'true' hiçbir şeyle azalmaz, yalnız yeteneklerde. */
export type DamageType = 'physical' | 'magic' | 'true';

/** GAME-DESIGN §4.5. Tanımlar orada, tahmine yer yok. */
export type TargetMode = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';
```

---

## 2. Kuleler

```ts
// src/types/tower.ts

/** Süreli veya özel kule etkisi. GAME-DESIGN §4.1-§4.3. */
export type TowerEffect =
  /** Kundakçı: 4 hasar/sn, 4 sn. §4.1 */
  | { readonly kind: 'burn';  readonly dps: number;    readonly seconds: number }
  /** Barut Fıçısı %40 / 2 sn · Buz %50 / 2.5 sn. §4.2, §4.3 */
  | { readonly kind: 'slow';  readonly factor: number; readonly seconds: number }
  /** Yıldırım: 3 hedef, her sıçramada %70'e düşer. §4.3 */
  | { readonly kind: 'chain'; readonly targets: number; readonly falloff: number };

/** Tek bir kule kademesi. Kaynak: GAME-DESIGN §4.1-§4.4 tabloları. */
export interface TowerTier {
  /** Bu kademeye geçiş maliyeti. Kümülatif DEĞİL. Birim: altın. */
  readonly cost: number;
  /** Atış başına ham hasar, zırh/direnç uygulanmadan. Birim: hasar puanı. */
  readonly damage: number;
  /** Saniyedeki atış sayısı. Birim: 1/sn. DPS = damage × fireRate. */
  readonly fireRate: number;
  /** Menzil yarıçapı. Birim: px. */
  readonly range: number;
  /** Patlama yarıçapı. Yalnız Top ailesi. Birim: px. §4.2 */
  readonly splashRadius?: number;
  /** Uçana vurma çarpanı: 0 = vuramaz, 0.5 = Barut Fıçısı, 1 = tam. §4.2 */
  readonly airMultiplier: 0 | 0.5 | 1;
  readonly effect?: TowerEffect;
}

export interface TowerDef {
  readonly id: TowerId;
  /** İnsan okunur rol. §4: "hiçbir kule diğerinin düpedüz üstünü değildir". */
  readonly role: string;
  readonly damageType: DamageType;
  /** [T1, T2]. §4.1-§4.3 tablolarının ilk iki satırı. */
  readonly tiers: readonly [TowerTier, TowerTier];
  /** [T3a, T3b]. İki dallı uzmanlaşma. §4 */
  readonly branches: readonly [TowerTier, TowerTier];
}
```

### Kule verisi — `src/data/towers.ts`

| Aile | Kademe | cost | damage | fireRate | range | splash | air |
|---|---|---|---|---|---|---|---|
| Okçu | T1 | 70 | 6 | 1.1 | 150 | — | 1 |
| Okçu | T2 | 110 | 10 | 1.3 | 165 | — | 1 |
| Okçu | 3a Keskin Nişancı | 170 | 26 | 0.6 | 260 | — | 1 |
| Okçu | 3b Kundakçı | 170 | 9 + yanma | 1.4 | 165 | — | 1 |
| Top | T1 | 110 | 22 | 0.5 | 140 | 45 | **0** |
| Top | T2 | 160 | 34 | 0.55 | 150 | 55 | **0** |
| Top | 3a Havan | 240 | 48 | 0.45 | 230 | 70 | **0** |
| Top | 3b Barut Fıçısı | 240 | 30 + yavaşlatma | 0.6 | 150 | 65 | **0.5** |
| Büyü | T1 | 100 | 14 | 0.7 | 155 | — | 1 |
| Büyü | T2 | 150 | 24 | 0.75 | 170 | — | 1 |
| Büyü | 3a Yıldırım | 230 | 30 + zincir | 0.7 | 170 | — | 1 |
| Büyü | 3b Buz | 230 | 20 + yavaşlatma | 0.8 | 180 | — | 1 |

Kaynak: `GAME-DESIGN.md` §4.1, §4.2, §4.3.

---

## 3. Kışla

```ts
// src/types/barracks.ts

export interface BarracksTier {
  /** Birim: altın. §4.4 */
  readonly cost: number;
  readonly soldierCount: number;
  /** Asker canı. Birim: HP. */
  readonly soldierHp: number;
  /** Asker hasarı. Birim: hasar/sn. */
  readonly soldierDps: number;
  /** Ölen askerin yeniden doğma süresi. Birim: saniye. */
  readonly respawnSeconds: number;
  /** Paladin "kalkan". AÇIK SORU S43 — §4.4 tablosunda sayı yok. */
  readonly shield?: number;
  /** Haydutlar kaçınması, 0..1. §4.4 tablosunda "%25" var,
   *  anlamı (hasar iptali mi isabet şansı mı) AÇIK SORU S44. */
  readonly evasion?: number;
}

/** Engelleme sabitleri. GAME-DESIGN §4.4 kural 2 ve 6. */
export const BLOCK = {
  /** Askerin düşman aradığı yarıçap. Birim: px. Kural 2. */
  aggroRadius: 60,
  /** Kilitlenme mesafesi. Birim: px. Kural 2. */
  contactRadius: 20,
  /** Toplanma noktasının kışladan en fazla uzaklığı. Birim: px. Kural 6. */
  rallyRange: 160,
  /** Toplanma noktasının yola yapışma mesafesi. Birim: px. Kural 6. */
  pathSnapMax: 40,
} as const;
```

| Kademe | cost | asker | HP | DPS | diriliş |
|---|---|---|---|---|---|
| T1 | 90 | 2 | 45 | 5 | 8 sn |
| T2 | 140 | 2 | 75 | 8 | 7 sn |
| 3a Paladin | 210 | 2 | 140 | 11 (+kalkan ⚠️ S43) | 6 sn |
| 3b Haydutlar | 210 | 3 | 70 | 9 (+%25 kaçınma ⚠️ S44) | 5 sn |

---

## 4. Düşmanlar

```ts
// src/types/enemy.ts

export type EnemyAbility =
  /** Şaman: 8 HP/sn. Yarıçap AÇIK SORU S37 — §5'te yok. */
  | { readonly kind: 'heal';  readonly hps: number; readonly radius?: number }
  /** Trol: 6 HP/sn. Harita çarpanıyla ölçekleniyor mu — AÇIK SORU S39. */
  | { readonly kind: 'regen'; readonly hps: number }
  /** Örümcek Ana: ölünce 3× yavru. §5 */
  | { readonly kind: 'split'; readonly count: number; readonly childId: EnemyId }
  /** Ogre Şef: kışla askerlerini tek vuruşta öldürür. §5, §4.4 kural 9 */
  | { readonly kind: 'oneShotSoldiers' };

export interface EnemyDef {
  readonly id: EnemyId;
  /** TEMEL can. Harita hpMultiplier ile çarpılır. Birim: HP. §5, §9 */
  readonly hp: number;
  /** Yol üstünde ilerleme hızı. Birim: px/sn. §5 */
  readonly speed: number;
  /** Fiziksel hasardan SABİT miktar düşer. Birim: hasar puanı. §3, §5 */
  readonly armor: number;
  /** Büyü hasarını YÜZDE azaltır, 0..1. §3, §5 */
  readonly magicResist: number;
  /** TEMEL öldürme altını. Harita goldMultiplier ile çarpılır. §5, §9 */
  readonly gold: number;
  /** Dalga bütçesi maliyeti. Birim: puan. §5, §7 */
  readonly points: number;
  /** Sızdığında düşen can. §5: normal 1, Trol/Örümcek 2, boss 10. */
  readonly leakDamage: number;
  /** Uçar mı — yolu takip etmez, engellenemez. §5 */
  readonly flying: boolean;
  readonly ability?: EnemyAbility;
}
```

### Düşman verisi — `src/data/enemies.ts`

| Düşman | hp | speed | armor | magicResist | gold | points | leak | flying |
|---|---|---|---|---|---|---|---|---|
| Goblin | 45 | 60 | 0 | 0 | 3 | 1 | 1 | — |
| Ork Savaşçı | 110 | 45 | 2 | 0 | 6 | 2 | 1 | — |
| Zırhlı Ork | 160 | 38 | 8 | 0 | 12 | 4 | 1 | — |
| Harpi | 70 | 75 | 0 | 0 | 9 | 3 | 1 | **✓** |
| Kurt Binicisi | 60 | 110 | 1 | 0 | 9 | 3 | 1 | — |
| Şaman | 130 | 42 | 0 | 0.40 | 15 | 5 | 1 | — |
| Trol | **400** | 30 | 4 | 0 | 24 | 8 | 2 | — |
| Örümcek Ana | 150 | 50 | 0 | 0.20 | 18 | 6 | 2 | — |
| Yavru | 30 | 90 | **S38** | **S38** | **S38** | **S38** | **S38** | — |
| **Ogre Şef** | **700** | 28 | 10 | 0.25 | 60 | 25 | 10 | — |

⚠️ = `GAME-DESIGN.md` §5'te **geçici** işaretli; kapsanan yol ölçülmeden
türetilemez. M1 ölçümünden sonra yeniden hesaplanacak.

**Altın oranı:** tüm düşmanlar `gold = 3 × points`. Boss istisna (60,
oran 2.4) — son dalgada altının kullanım değeri düşük (§5).

---

## 5. Dalgalar

```ts
// src/types/wave.ts — GAME-DESIGN §7'den birebir

export interface WaveGroup {
  readonly enemy: EnemyId;
  readonly count: number;
  /** Grup içi düşmanlar arası bekleme. Birim: saniye. */
  readonly spawnDelay: number;
  /** Dalga başından itibaren gecikme. Birim: saniye. */
  readonly startAt: number;
  /** Haritada birden fazla giriş varsa hangisi. MapDef.paths indeksi. */
  readonly spawnPoint: number;
}

export interface Wave {
  /** Harita içi dalga numarası, 1..10. */
  readonly index: number;
  readonly groups: readonly WaveGroup[];
}
```

**Bütçe formülü** (`GAME-DESIGN.md` §7):
```ts
const BREATHER = new Set([4, 7]);
budget(n) = Math.round(10 * Math.pow(1.20, n - 1) * (BREATHER.has(n) ? 0.85 : 1));
```
Dalga 1 → 10 puan, dalga 10 → 52 puan.

**Tempo formülü** (§7) — sabitleri **AÇIK SORU S28**:
```
spawnDelay          = SPAWN_K / dalgaBoyu
dalgaSonrasıBekleme = REST_K  × dalgaBoyu
```

---

## 6. Haritalar

```ts
// src/types/map.ts — GAME-DESIGN §9'dan birebir + ölçüm alanı

export interface MapDef {
  readonly id: string;
  /** Ayrı WebP dosyası, atlas DEĞİL. CLAUDE.md Varlık formatları. */
  readonly background: string;
  /** Her giriş için waypoint dizisi. ÇOĞUL — harita 1 tek elemanlı. */
  readonly paths: readonly (readonly Vec2[])[];
  readonly buildSpots: readonly Vec2[];
  /** Uçanlar için düz hatlar. §5 */
  readonly flyerPaths: readonly (readonly Vec2[])[];
  readonly castle: Vec2;
  readonly waves: readonly Wave[];
  /** Düşman HP çarpanı. §9: 1.0 / 1.6 / 2.6 */
  readonly hpMultiplier: number;
  /** Öldürme altını çarpanı. §9: hpMultiplier'a EŞİT. */
  readonly goldMultiplier: number;
  /** Başlangıç altını. Birim: altın. §9: 280 / 340 / 400 */
  readonly startGold: number;
  /** Bu haritada çıkabilecek düşman tipleri. §5 kadro tablosu. */
  readonly enemyRoster: readonly EnemyId[];
  /** util/coverage.ts ÜRETİR, elle yazılmaz. CLAUDE.md Mimari. */
  readonly coverage: readonly { readonly spotIndex: number; readonly coveredPx: number }[];
}
```

| # | Ad | Nokta | Giriş | hp/gold ×  | startGold | Yeni düşmanlar |
|---|---|---|---|---|---|---|
| 1 | Değirmen Geçidi | 8 | 1 | 1.0 | 280 | Goblin, Ork Savaşçı, Kurt Binicisi, Harpi, Ogre Şef |
| 2 | Taş Köprü | 10 | 1 (Y ayrımı) | 1.6 | 340 | + Zırhlı Ork, Şaman |
| 3 | Kül Ovası | 12 | 2 | 2.6 | 400 | + Trol, Örümcek Ana |

---

## 7. Referans tahta

```ts
// src/types/board.ts

/** Dalga N'de oyuncunun makul olarak sahip olacağı tahta.
 *  Denge sağlamalarının girdisi. research/01 §11.
 *  ELLE YAZILMAZ — buildReferenceBoards() ekonomi tablosundan türetir (M3-T07). */
export interface ReferenceBoard {
  readonly waveIndex: number;
  readonly towers: readonly {
    readonly spotIndex: number;
    readonly towerId: TowerId;
    readonly tier: 0 | 1 | 2;
  }[];
  /** Hesaplanır, elle yazılmaz. Birim: altın. */
  readonly cumulativeCost: number;
}
```

---

## 8. Denge sabitleri

```ts
// src/data/balance.ts

export const BALANCE = {
  /** GAME-DESIGN §6 */
  startLives: 20,
  /** §4.5: harcanan TOPLAMIN %70'i. */
  sellRefund: 0.70,
  /** §3: hiçbir vuruş tamamen emilmez. */
  damageFloor: 0.15,
  /** §6: dalga bitiş bonusu. */
  waveEndBonus: (n: number) => 30 + n * 5,
  /** §6: hazırlık sayacı. Birim: saniye. */
  prepSeconds: 20,
  /** §6: erken başlatma bonusu = kalanSaniye × ceil(n/2), dalga 4'ten itibaren. */
  earlyBonusFromWave: 4,
  /** §6 Kısıt B: odaklanma kaybı. research/01 §10. */
  focusLoss: 0.75,
  /** §6: her iki kısıt için pay. */
  safetyMargin: 1.15,
  /** §6 aktiflik tablosu. KULLANILMIYOR — Kısıt B artık formül değil,
   *  başsız simülasyon (M3-T09). Referans olarak duruyor. */
  activityRatio: { 1: 0.60, 2: 0.80, 3: 0.95 },
  /** Yıldız eşikleri, kalan cana göre. GAME-DESIGN §9. */
  starThresholds: { three: 20, two: 15 },
  /** §7: nefes dalgaları, bütçe × 0.85. */
  breatherWaves: [4, 7],
  /** §7 tempo sabitleri — AÇIK SORU S28. */
  SPAWN_K: undefined,
  REST_K: undefined,
  /** research/01 §12 önerisi. Uygulanmadı. */
  BOSS_CEILING_RATIO: 0.80,
} as const;
```

**Yetenekler** (`GAME-DESIGN.md` §8):

| Yetenek | Etki | Yarıçap | Bekleme |
|---|---|---|---|
| Meteor | 180 **gerçek** hasar | 90 px | 45 sn |
| Takviye | 2 asker (HP 60, DPS 7, 20 sn ömür) | — | 20 sn |

---

## 9. Kayıt

```ts
// src/types/save.ts

/** Portal SDK adaptörü için. CrazyGames Data modülü aynı API'yi sunuyor.
 *  research/05 §2. */
export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

/** Tek anahtar: 'kale-nobeti-save-v1'. CLAUDE.md Teknoloji.
 *  ŞEMA TANIMLI DEĞİL — AÇIK SORU S60.
 *  Yıldız eşikleri kapandı: 20 → 3, 15-19 → 2, ≤14 → 1 (GAME-DESIGN §9). */
export interface SaveData {
  readonly version: 1;
  readonly unlockedMaps: readonly string[];
  readonly stars: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  readonly settings: {
    readonly sound: boolean;
    readonly screenShake: boolean;
    readonly effectDensity: unknown;   // kademeler AÇIK SORU S53
  };
}
```

---

## 10. Doğrulama tablosu

`GAME-DESIGN.md` tablolarındaki her hücrenin karşılığı:

| Kaynak | Alan | Durum |
|---|---|---|
| §4.1-§4.3 (12 kademe × 5-6 sütun) | `TowerTier` | ✅ tam |
| §4.4 (4 kademe × 5 sütun) | `BarracksTier` | ⚠️ `shield` (S43), `evasion` anlamı (S44) |
| §4.4 kural 2, 6 (4 sabit) | `BLOCK` | ✅ tam |
| §4.5 (5 hedefleme modu) | `TargetMode` | ✅ tam |
| §5 (9 düşman × 7 sütun) | `EnemyDef` | ⚠️ yavru satırı (S38), Şaman yarıçapı (S37) |
| §5 sızma cezası | `leakDamage` | ✅ tam |
| §6 (8 ekonomi sabiti) | `BALANCE` | ⚠️ `SPAWN_K`/`REST_K` (S28) |
| §6 aktiflik tablosu | `activityRatio` | ✅ kullanım dışı — Kısıt B simülasyona çevrildi |
| §7 (bütçe, nefes, şema) | `Wave`, `budget` | ✅ tam |
| §8 (2 yetenek × 3 alan) | Yetenek tablosu | ✅ tam |
| §9 (3 harita × 8 sütun) | `MapDef` | ⚠️ koordinatlar (S57) |
| `CLAUDE.md` Teknoloji | `KeyValueStore` | ✅ tam |
| §9 yıldız eşikleri | `starThresholds` | ✅ tam (20 / 15-19 / ≤14) |
| ROADMAP M7 (3 yıldız) | `SaveData.stars` | ⚠️ şema (S60) |

**Kaçak yok.** Eksik olan her hücre bir açık soru kimliğine bağlı.

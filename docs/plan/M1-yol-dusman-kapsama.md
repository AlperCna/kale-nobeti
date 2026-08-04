# M1 — Yol, düşman hareketi, kapsama aracı

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M1 |
| **Görev** | 9 (`M1-T01` … `M1-T09`) |
| **Kod yazma süresi** | ~5 sa 50 dk — **takvim değil** |
| **Takvim bütçesi** | 2 gün (`ROADMAP.md`). Fark: harita çizimi, ölçüm turu, Phaser öğrenme. |
| **Durum** | ☐ bekliyor |

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı.
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/plan/DEPENDENCIES.md` — **§1, §2, §3, §5, §7** (bu taşta karar veriliyor)
4. `docs/GAME-DESIGN.md` §9 (haritalar, `MapDef`), §5 (uçan notu)
5. `docs/research/01-denge-matematigi.md` **§4 başındaki uyarı kutusu** ve §2
6. `docs/research/02-phaser-teknik.md` §6 (kapsama ölçüm aracı), §7 (havuzlama)

**Başka dosya açma.** `research/03`, `04`, `05`, `06` bu taşa girmiyor.

## 1. Amaç ve bitiş durumu

**Amaç:** Düşmanların yolu yürümesi ve kaleye varınca can eksiltmesi.
Bu taşın asıl çıktısı görsel değil: **kapsanan yol ölçümü.** Tüm dengenin
asılı olduğu sayı burada ilk kez gerçek bir haritadan okunacak
(`research/01` §4 uyarı kutusu).

**Taş bittiğinde oyun:** Harita 1'in yolu çizili, 20 greybox düşman aynı anda
akıcı ilerliyor, kaleye varan can düşürüyor ve havuza dönüyor. Geliştirme
modunda her yapı noktasının kapsadığı piksel ekranda yazıyor.

**Olmayan:** kule, mermi, altın, dalga, uçan düşman, kışla. Düşmanlar sabit
aralıkla doğuyor; dalga sistemi M3'te.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| **3 — havuzlama** | `M1-T04`, `M1-T06`, `M1-T07` |
| 4 — yol bulma dinamik değil | `M1-T05` (A*/flow field **yasak**) |
| 5 — `any` yasak | hepsi |
| **8 — ham `delta` yasak** | `M1-T05`, `M1-T06` |
| **9 — karesel mesafe** | `M1-T02`, `M1-T07` |

Kural 9 bu taşta **ilk kez** devreye giriyor: kapsama ölçümü ve kaleye varış
kontrolü mesafe hesabı yapıyor. `Math.sqrt` çağrılmaz.

---

## 2. Görevler

### M1-T01 — Vektör ve segment matematiği

| | |
|---|---|
| **Kimlik** | `M1-T01` · **Durum** ☑ · **Süre** ~35 dk |
| **Önkoşul** | `M0-T03` |
| **TIER 1** | kural 5, kural 9 |
| **Açık soru** | — |
| **Doküman** | `CLAUDE.md` Klasör yapısı (`util/math`) |

**Dosyalar**
- `src/util/math.ts` — yeni — saf vektör/segment fonksiyonları
- `src/util/math.test.ts` — yeni

**İmza**
```ts
export function distSq(a: Vec2, b: Vec2): number;           // karekök YOK
export function lerp(a: Vec2, b: Vec2, t: number): Vec2;
export function segmentLength(a: Vec2, b: Vec2): number;    // burada sqrt serbest
export function pointToSegmentDistSq(p: Vec2, a: Vec2, b: Vec2): number;
export function angleTo(from: Vec2, to: Vec2): number;      // radyan
```

**Yapılacak**
- Menzil/yakınlık karşılaştırmaları `distSq` ile yapılır (TIER 1 k.9).
  `segmentLength` istisna — yol uzunluğu gerçek uzunluk ister, karesi değil.
- `pointToSegmentDistSq` kapsama ölçümünün çekirdeği; ayrı test edilir.

**Kabul kriteri**
```bash
npm run test -- math
```
Beklenen: `≥ 10 passed`. Sınır durumları: `a === b` (sıfır uzunluklu segment),
nokta segmentin uzantısında, nokta tam segment üstünde.

**Bitmedi sayılır eğer:** `Math.sqrt` `segmentLength` dışında bir yerde geçiyorsa.

---

### M1-T02 — `util/coverage.ts` ve testleri

| | |
|---|---|
| **Kimlik** | `M1-T02` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M1-T01` |
| **TIER 1** | kural 5, kural 9 |
| **Açık soru** | S14 |
| **Doküman** | `research/02-phaser-teknik.md` §6 · `research/01` §2, §4 uyarı kutusu |

**Dosyalar**
- `src/util/coverage.ts` — yeni — kapsanan yol uzunluğu ölçümü
- `src/util/coverage.test.ts` — yeni

**İmza**
```ts
/** Bir noktanın menzili içinde kalan yol uzunluğu. Birim: px. */
export function coveredLength(
  path: readonly Vec2[], spot: Vec2, range: number, stepPx?: number
): number;

/** Tüm yapı noktaları için ölçüm. maps.ts'in coverage alanını üretir. */
export function measureCoverage(
  paths: readonly (readonly Vec2[])[], spots: readonly Vec2[], range: number
): { spotIndex: number; coveredPx: number }[];
```

**Yapılacak**
- Yolu `stepPx` aralıklarla örnekle, her örnek noktanın menzil içinde olup
  olmadığına `distSq <= range²` ile bak (TIER 1 k.9).
- **Kıvrımlı yolda aynı kule yolu birden çok kez görebilir** — kapsama
  toplanır, `2 × menzil` ile sınırlanmaz. `research/01` §4'teki çelişkinin
  çözümü bu fonksiyonun çıktısı.
- `stepPx` varsayılanı **S14**'e bağlı; cevap gelene kadar `4` kullanılır ve
  bu değer dosyada geçici olarak işaretlenir.

**Kabul kriteri**
```bash
npm run test -- coverage
```
Beklenen: `≥ 6 passed`. Zorunlu senaryolar:
kule yoldan uzak → `0`;
düz yol kule merkezinden geçiyor → `≈ 2 × range` (±%3);
yol menzilden iki kez geçiyor → iki geçişin toplamı;
`stepPx` yarıya inince sonuç %1'den az değişiyor (yakınsama).

**Bitmedi sayılır eğer:** fonksiyon `2 × range` üstünü kırpıyorsa.

**Risk:** Bu fonksiyonun çıktısı boss ve Trol HP'sini belirleyecek
(`GAME-DESIGN.md` §5 ⚠️ notu). **Erken uyarı:** yakınsama testi geçmiyorsa
ölçüm gürültülü demektir ve türetilen HP'ler de gürültülü olur.

---

### M1-T03 — `MapDef` tipi ve Harita 1 verisi

| | |
|---|---|
| **Kimlik** | `M1-T03` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M1-T02` |
| **TIER 1** | **kural 1** (denge verisi `src/data/`), kural 5 |
| **Açık soru** | S11, S12, S16, S17 |
| **Doküman** | `GAME-DESIGN.md` §9 (`MapDef` şeması, harita tablosu) · `DEPENDENCIES.md` §1 |

**Dosyalar**
- `src/types/map.ts` — yeni — `MapDef` arayüzü
- `src/data/maps.ts` — yeni — Harita 1 verisi

**İmza**
```ts
export interface MapDef {
  readonly id: string;
  readonly background: string;
  readonly paths: readonly (readonly Vec2[])[];   // ÇOĞUL — DEPENDENCIES §1
  readonly buildSpots: readonly Vec2[];
  readonly flyerPaths: readonly (readonly Vec2[])[];
  readonly castle: Vec2;
  readonly hpMultiplier: number;
  readonly goldMultiplier: number;
  readonly startGold: number;
  readonly enemyRoster: readonly EnemyId[];
  readonly coverage: readonly { spotIndex: number; coveredPx: number }[];
}
```

**Yapılacak**
- `paths` **baştan çoğul** — harita 1 tek elemanlı dizi kullanır.
  Sonradan çoğullaştırmak `PathSystem`'i baştan yazdırır (`DEPENDENCIES` §1).
- Harita 1: 8 yapı noktası, 1 giriş, `hpMultiplier: 1.0`, `goldMultiplier: 1.0`,
  `startGold: 280` (`GAME-DESIGN.md` §9 tablosu).
- **Waypoint ve yapı noktası koordinatları dokümanda yok** — S11, S12.
  Cevap gelene kadar geçici bir yol çizilir ve dosyada `// GEÇİCİ — S11`
  işaretlenir.
- `coverage` **elle yazılmaz**; `measureCoverage` üretir (`CLAUDE.md` Mimari).
- `waves` alanı bu taşta yok, M3'te eklenir.

**Kabul kriteri**
```bash
npm run typecheck && npm run test -- maps
```
Beklenen: `typecheck` temiz; test → `coverage` alanı `measureCoverage`
çıktısıyla birebir eşleşiyor (elle yazılmadığının kanıtı).

**Bitmedi sayılır eğer:** `coverage` dizisi `maps.ts` içinde sabit yazılmışsa.

---

### M1-T04 — Nesne havuzu sözleşmesi

| | |
|---|---|
| **Kimlik** | `M1-T04` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M0-T03` |
| **TIER 1** | **kural 3** |
| **Açık soru** | — |
| **Doküman** | `CLAUDE.md` TIER 1 k.3 · `research/02-phaser-teknik.md` §7 |

**Dosyalar**
- `src/util/pool.ts` — yeni — havuz sarmalayıcı ve sıfırlama sözleşmesi
- `src/util/pool.test.ts` — yeni

**İmza**
```ts
export interface Poolable {
  /** Havuza dönerken TÜM durumu sıfırlar: hedef referansı, tween, timer, tint. */
  resetForPool(): void;
}

export class Pool<T extends Phaser.GameObjects.GameObject & Poolable> {
  constructor(scene: Phaser.Scene, factory: () => T, prealloc: number);
  acquire(): T | null;      // havuz boşsa null — sessizce büyümez
  release(obj: T): void;    // resetForPool çağırır
  readonly activeCount: number;
}
```

**Yapılacak**
- `release` **her zaman** `resetForPool` çağırır. Sıfırlanmayan hedef
  referansı ölü düşmanı canlı tutar (`CLAUDE.md` TIER 1 k.3).
- Ön ayırma: düşman **60** (`research/02` §7 tablosu).
- Havuz **sessizce büyümez** — dolduğunda `null` döner ve geliştirme modunda
  uyarı basar. Sessiz büyüme M6'da takılma olarak ortaya çıkar.

**Kabul kriteri**
```bash
npm run test -- pool
```
Beklenen: `≥ 5 passed` — `acquire`/`release` turu, havuz dolunca `null`,
`release` `resetForPool` çağırıyor, `activeCount` doğru, aynı nesne iki kez
`release` edilirse ikincisi yok sayılıyor.

**Bitmedi sayılır eğer:** `acquire` havuz dolduğunda yeni nesne yaratıyorsa.

---

### M1-T05 — `PathSystem`: waypoint ilerleme ve kalan mesafe

| | |
|---|---|
| **Kimlik** | `M1-T05` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M1-T01`, `M1-T03` |
| **TIER 1** | **kural 4**, **kural 8** |
| **Açık soru** | S13 |
| **Doküman** | `CLAUDE.md` TIER 1 k.4, k.8 · `GAME-DESIGN.md` §4.5 (hedefleme tanımı) · `DEPENDENCIES.md` §3, §7 |

**Dosyalar**
- `src/systems/PathSystem.ts` — yeni
- `src/systems/PathSystem.test.ts` — yeni

**İmza**
```ts
export interface PathProgress {
  segmentIndex: number;
  tInSegment: number;        // 0..1
  remainingDistance: number; // kaleye kalan yol, px — DEPENDENCIES §3
}

export class PathSystem {
  constructor(path: readonly Vec2[]);
  readonly totalLength: number;
  advance(p: PathProgress, pxToMove: number): PathProgress;  // saf
  positionAt(p: PathProgress): Vec2;
  reachedEnd(p: PathProgress): boolean;
}
```

**Yapılacak**
- Sabit waypoint dizisi. **A* veya flow field eklenmez** (TIER 1 k.4).
- `remainingDistance` her adımda güncellenir — `first`/`last` hedeflemesi
  buna bağlı olacak (`GAME-DESIGN.md` §4.5: yol *ilerlemesine* değil kalan
  mesafeye bakılır).
- Hareket miktarı çağıran tarafından `hız × scaledDelta` olarak verilir;
  `PathSystem` saat bilmez (test edilebilirlik).
- Bir karede birden çok segment geçilebilir (yüksek hız + 2×) — döngüyle işlenir.
- Köşe davranışı **S13**'e bağlı; cevap gelene kadar keskin dönüş
  (köşe kesme yok) ve bu işaretlenir.

**Kabul kriteri**
```bash
npm run test -- PathSystem
```
Beklenen: `≥ 7 passed` — tek segment ilerleme; segment sınırını tam yakalama;
bir adımda iki segment geçme; `remainingDistance` monoton azalıyor;
`totalLength` segment uzunlukları toplamına eşit; yol sonunda `reachedEnd`.

**Bitmedi sayılır eğer:** `advance` içinde `delta` veya `Date.now()` geçiyorsa.

---

### M1-T06 — `Enemy` entity ve hareket stratejisi ayrımı

| | |
|---|---|
| **Kimlik** | `M1-T06` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M1-T04`, `M1-T05` |
| **TIER 1** | **kural 3**, **kural 8** |
| **Açık soru** | — |
| **Doküman** | `DEPENDENCIES.md` §2, §7 · `GAME-DESIGN.md` §5 (uçan notu) |

**Dosyalar**
- `src/entities/Enemy.ts` — yeni
- `src/entities/movers.ts` — yeni — `PathMover`, `LineMover`

**İmza**
```ts
export interface Mover {
  step(e: Enemy, scaledDelta: number): void;
  remainingDistance(e: Enemy): number;
}

export class Enemy extends Phaser.GameObjects.Rectangle implements Poolable {
  hp: number;
  speed: number;               // px/sn
  mover: Mover;
  blockedBy: unknown | null;   // M5'te Soldier olacak — DEPENDENCIES §7
  progress: PathProgress;
  resetForPool(): void;
}
```

**Yapılacak**
- **Hareket stratejisi `Enemy`'den ayrık** (`DEPENDENCIES` §2). `PathMover`
  bu taşta yazılır; `LineMover` (uçanlar) M4'te aynı arayüzü uygular.
  Ayırmazsan M4'te entity'yi yarman gerekir.
- `blockedBy` alanı **bu taşta tanımlanır**, kullanımı M5'te. `null` değilse
  `step` ilerlemeyi atlar (`DEPENDENCIES` §7). Alanı sonradan eklemek
  `PathSystem`'e geri dönmek demek.
- `resetForPool`: `hp`, `progress`, `blockedBy`, `mover`, tint, tween — hepsi.
- Görsel: greybox dikdörtgen. Sprite M6'da.

**Kabul kriteri**
```bash
npm run test -- Enemy
```
Beklenen: `≥ 4 passed` — `PathMover` ile ilerleme; `blockedBy != null` iken
ilerleme **durur**; `resetForPool` sonrası tüm alanlar başlangıç değerinde;
`remainingDistance` `PathSystem` ile tutarlı.

**Bitmedi sayılır eğer:** `Enemy` içinde `PathSystem`'e doğrudan atıf varsa
(strateji üzerinden gitmeli).

---

### M1-T07 — Doğurma, kaleye varış, can kaybı

| | |
|---|---|
| **Kimlik** | `M1-T07` · **Durum** ☐ · **Süre** ~35 dk |
| **Önkoşul** | `M1-T06` |
| **TIER 1** | kural 3, kural 9 |
| **Açık soru** | S17 |
| **Doküman** | `CLAUDE.md` Mimari (`life:lost`) · `GAME-DESIGN.md` §6 (başlangıç canı 20) |

**Dosyalar**
- `src/systems/SpawnSystem.ts` — yeni — geçici sabit aralıklı doğurucu
- `src/scenes/GameScene.ts` — değişiklik — sistemleri bağla

**İmza**
```ts
export class SpawnSystem {
  constructor(pool: Pool<Enemy>, path: PathSystem, bus: EventBus);
  update(scaledDelta: number): void;
  setInterval(seconds: number): void;   // M3'te WaveManager devralacak
}
```

**Yapılacak**
- Sabit aralıkla düşman doğur. **Bu sistem M3'te `WaveManager` ile
  değiştirilecek** — koda o yorumu yaz.
- Kaleye varan düşman: `life:lost` yayar, havuza döner.
- Başlangıç canı **20** (`GAME-DESIGN.md` §6). Can 0'a inince şimdilik
  yalnız konsola yazar; kaybetme ekranı M3'te.
- `M0-T08`'deki greybox test dikdörtgenini **sil**.

**Kabul kriteri**
```bash
npm run dev
```
gözle: düşmanlar yolda akıcı ilerliyor; kaleye varan kayboluyor ve sayaç
20'den geri sayıyor; 20 düşman aynı andayken hareket takılmıyor.
```bash
npm run guard
```
Beklenen: `4/4 ✓` — `M0-T08`'in ham `delta` kontrolü hâlâ temiz.

**Bitmedi sayılır eğer:** kaleye varan düşman `release` edilmiyorsa
(havuz sızıntısı — `activeCount` sürekli artar).

---

### M1-T08 — Yol ve yapı noktası çizimi

| | |
|---|---|
| **Kimlik** | `M1-T08` · **Durum** ☐ · **Süre** ~35 dk |
| **Önkoşul** | `M1-T03` |
| **TIER 1** | kural 7 |
| **Açık soru** | — |
| **Doküman** | `GAME-DESIGN.md` §2 (palet, yol rengi `#8A7250`) |

**Dosyalar**
- `src/scenes/GameScene.ts` — değişiklik — yol ve nokta çizimi

**Yapılacak**
- Yol: `Phaser.GameObjects.Graphics` ile kalın çizgi, renk `#8A7250`
  (`GAME-DESIGN.md` §2). Arka plan görseli M6'da.
- Yapı noktaları: parşömen renkli daire, henüz tıklanabilir değil
  (tıklama M2'de).
- Kale: mürekkep renkli kare, yolun sonunda.
- **Bu çizim `create`'te bir kez yapılır**, `update`'te değil.

**Kabul kriteri**
```bash
npm run dev
```
gözle: yol, 8 yapı noktası ve kale görünüyor; düşmanlar yolun tam üstünde
yürüyor (yoldan sapma yok); pencere yeniden boyutlandırılınca hizalama bozulmuyor.

**Bitmedi sayılır eğer:** çizim `update` içinde her karede yeniden yapılıyorsa.

---

### M1-T09 — Geliştirme modu kapsama göstergesi

| | |
|---|---|
| **Kimlik** | `M1-T09` · **Durum** ☐ · **Süre** ~30 dk |
| **Önkoşul** | `M1-T02`, `M1-T08` |
| **TIER 1** | kural 7, **Platform** (yayında hata ayıklama yok) |
| **Açık soru** | S16 |
| **Doküman** | `research/02-phaser-teknik.md` §6 · `research/01` §4 uyarı kutusu · `CLAUDE.md` Platform |

**Dosyalar**
- `src/scenes/GameScene.ts` — değişiklik — `import.meta.env.DEV` bloğu

**Yapılacak**
- Her yapı noktasının üstüne kapsadığı piksel sayısını yaz. Ortalamayı ve
  yolun toplam uzunluğunu (`L`) ekranın köşesinde göster.
- **Yalnız `import.meta.env.DEV` içinde.** Yayın yapısında hata ayıklama
  göstergesi bulunmaz (`CLAUDE.md` Platform).
- **Bu taşın asıl çıktısı bu sayı.** Ölçüm alınınca `research/01` §4'teki
  uyarı kutusu ve `GAME-DESIGN.md` §5'teki ⚠️ işaretleri çözülebilir hale
  gelir — ama çözüm bu taşın kapsamında değil, sayıyı **raporlamak** yeterli.

**Kabul kriteri**
```bash
npm run dev
```
gözle: 8 noktanın her birinde bir piksel sayısı; köşede `ort: N px · L: M px`.
```bash
npm run build && grep -rc "coveredPx" dist/assets/*.js
```
Beklenen: `0` — gösterge yayın yapısına sızmamış.

**Bitmedi sayılır eğer:** gösterge yayın yapısında görünüyorsa.

**Raporlanacak:** ölçülen ortalama kapsama. Bu sayı `OPEN-QUESTIONS.md`
S16'ya işlenir ve M3'ün denge sağlamalarının girdisi olur.

---

## 3. AÇIK SORULAR

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S11 | Harita 1'in waypoint koordinatlarını kim çizecek? Dokümanda yalnız "tek yol, 2 keskin viraj" var | `M1-T03` |
| S12 | 8 yapı noktasının koordinatları? | `M1-T03` |
| S13 | Köşe davranışı: keskin dönüş mü, köşe kesme mi (yay)? Kapsama ölçümünü etkiler | `M1-T05`, `M1-T02` |
| S14 | Kapsama ölçüm adım boyutu kaç px? Hassasiyet/hız takası | `M1-T02` |
| S15 | "60 FPS" hangi cihazda ölçülecek? CrazyGames 4 GB Chromebook şartı koyuyor | `M1-T07` kabulü |
| S16 | **Harita 1'in yol uzunluğu `L` kaç px?** `research/01` §3 bunun hiçbir yerde yazmadığını söylüyor; tüm denge buna asılı | `M1-T03`, `M1-T09` |
| S17 | Düşman nerede doğar — ilk waypoint mi, ekran dışı mı? | `M1-T07` |

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Kapsama ölçümü gürültülü çıkar | `M1-T02` yakınsama testi geçmiyor | `stepPx` küçült, S14'ü cevapla |
| Ölçülen kapsama ne 300 ne 450 çıkar | `M1-T09` göstergesi ikisinden de uzak bir sayı veriyor | **Beklenen durum.** Boss/Trol o sayıyla yeniden hesaplanır (`research/01` §12) |
| `paths` tekil yazılır | M7'de harita 3 eklenirken `PathSystem` baştan yazılıyor | `M1-T03` imzası çoğul (`DEPENDENCIES` §1) |
| `blockedBy` alanı atlanır | M5'te kışla yazılırken `PathSystem`'e geri dönülüyor | `M1-T06` kabulünde açıkça test ediliyor |
| Havuz sessizce büyür | M6'da yoğun dalgada takılma | `M1-T04`: dolunca `null`, büyüme yok |
| Hareket stratejisi ayrılmaz | M4'te uçan eklenirken `Enemy` yarılıyor | `M1-T06` kabulü `Mover` üzerinden gitmeyi şart koşuyor |

### Süre sapması

Görev toplamı **5 sa 50 dk**; `ROADMAP.md` M1 için **2 gün** diyor.
İkisi uyuşmuyor. İki olasılık:

- ROADMAP tahmini payı geniş tutuyor (ilk Phaser projesi, deneme yanılma).
- Görev tahminleri iyimser — özellikle `M1-T02` ve `M1-T05` ilk kez yazılan
  saf geometri kodu ve test yazımı tahminden uzun sürer.

**Karar verilmedi.** Taş bitince gerçek süre ölçülüp `ROADMAP.md`'ye
düzeltme önerilecek. Bu, sonraki taşların tahminlerini de kalibre eder.

## 5. Taş sonu kontrol listesi

- [ ] `npm run typecheck && npm run test && npm run build && npm run guard` dördü de yeşil
- [ ] 20 düşman aynı anda akıcı ilerliyor
- [ ] Sızan düşman can düşürüyor ve havuza dönüyor
- [ ] `activeCount` uzun süre sonra sabit kalıyor (havuz sızıntısı yok)
- [ ] Geliştirme modunda 8 noktanın kapsama sayısı görünüyor
- [ ] **Ölçülen ortalama kapsama ve `L` raporlandı** ve `OPEN-QUESTIONS.md`
      S16'ya işlendi
- [ ] Gösterge yayın yapısında yok
- [ ] `M0-T08`'in greybox test dikdörtgeni silindi
- [ ] `Math.sqrt` yalnız `segmentLength` içinde
- [ ] `blockedBy` alanı tanımlı ve testli (M5 için)
- [ ] `paths` çoğul (M7 için)
- [ ] **`docs/results/M1-SONUC.md` yazıldı** — 8 yapı noktasının kapsanan
      yolu, ortalaması ve `L` dahil. **Bu üç sayı M3'ün denge sağlamalarının
      tek girdisi**; yazılmadan M2'ye geçilmez.

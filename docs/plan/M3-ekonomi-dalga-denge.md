# M3 — Ekonomi, dalgalar, denge sağlamaları

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M3 |
| **Görev** | 11 (`M3-T01` … `M3-T11`) |
| **Kod yazma süresi** | ~7 sa 30 dk — **takvim değil** |
| **Takvim bütçesi** | 3 gün (`ROADMAP.md`) |
| **Durum** | ☐ bekliyor |

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı.
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/plan/DEPENDENCIES.md` — §4 (kapsama → denge zinciri)
4. `docs/GAME-DESIGN.md` §5 (düşman tablosu **ve ⚠️ geçicilik notu**),
   §6 (ekonomi, Kısıt A/B), §7 (dalga sistemi), §9 (harita çarpanları)
5. `docs/research/01-denge-matematigi.md` — **tamamı.** Bu taşın matematik
   kaynağı bu dosya; §4 uyarı kutusu, §8, §9, §10, §11, §12 hepsi geçerli.
6. `docs/plan/M1-yol-dusman-kapsama.md` — `M1-T09`'da **ölçülen kapsama sayısı**

**Başka dosya açma.** `research/02`-`06` bu taşa girmiyor.

> ⚠️ **Bu taş M1'in ölçümüne bağlı.** `M1-T09` kapsama sayısını raporlamadan
> `M3-T08`/`M3-T09` yazılamaz — girdi yok demektir.

## 1. Amaç ve bitiş durumu

**Amaç:** Harita 1'i baştan sona oynanabilir hale getirmek **ve dengeyi
otomatik doğrulanabilir kılmak.** İkincisi asıl iş: 30 dalga elle yazıldıktan
sonra hepsinin yanlış olduğunu öğrenmek pahalı (`research/01` §11).

**Taş bittiğinde oyun:** Harita 1'in 10 dalgası oynanıyor ve bitirilebiliyor.
Altın kazanılıyor, kule alınıp satılıyor, hazırlık sayacı ve erken başlatma
bonusu çalışıyor, dalga telegrafı ne geleceğini gösteriyor. Kazanma ve
kaybetme ekranı var. **Üç denge sağlaması testte yeşil.**

**Olmayan:** Tier 2-3, Büyü/Kışla, uçan düşman, yetenekler, ses, sanat.
Harita 1 kadrosu yalnız Goblin, Ork Savaşçı, Kurt Binicisi.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| **1 — denge verisi `src/data/`** | `M3-T01`, `M3-T02`, `M3-T07` |
| 3 — havuzlama | `M3-T05` |
| 5 — `any` yasak | hepsi |
| 7 — `BitmapText` | `M3-T03` (altın/can sayacı), `M3-T04` (geri sayım) |
| 8 — ham `delta` yasak | `M3-T04`, `M3-T05` |

Altın, can ve geri sayım **her karede değişen metinler** — üçü de
`BitmapText` olmak zorunda (`CLAUDE.md` TIER 1 k.7).

---

## 2. Görevler

### M3-T01 — `BalanceConstants` ve dalga bütçesi üretici

| | |
|---|---|
| **Kimlik** | `M3-T01` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M2-T01` |
| **TIER 1** | **kural 1**, kural 5 |
| **Açık soru** | S28 |
| **Doküman** | `GAME-DESIGN.md` §6, §7 · `research/01` §8 |

**Dosyalar**
- `src/data/balance.ts` — yeni — dağınık sabitler tek yerde
- `src/data/waves.ts` — yeni — bütçe üretici
- `src/data/waves.test.ts` — yeni

**İmza**
```ts
export const BALANCE = {
  startLives: 20,               // GAME-DESIGN §6
  sellRefund: 0.70,             // §4.5
  damageFloor: 0.15,            // §3
  waveEndBonus: (n: number) => 30 + n * 5,          // §6
  prepSeconds: 20,              // §6
  earlyBonusFrom: 4,            // ilk 3 dalgada kapalı — §6
  focusLoss: 0.75,              // Kısıt B — §6
  safetyMargin: 1.15,           // §6
  activityRatio: { 1: 0.60, 2: 0.80, 3: 0.95 },     // §6 tablosu
  breatherWaves: new Set([4, 7]),                    // §7
} as const;

export function budget(n: number): number;   // §7 formülü
```

**Yapılacak**
- Her sabitin yanına `GAME-DESIGN.md` bölüm atfı yorumla yazılır.
- `budget(n) = round(10 * 1.20^(n-1) * (breather ? 0.85 : 1))` (§7).
- `SPAWN_K` ve `REST_K` (§7 tempo formülü) **dokümanda sayı olarak yok** —
  S28. Geçici değer konur ve `// GEÇİCİ — S28` işaretlenir.

**Kabul kriteri**
```bash
npm run test -- waves
```
Beklenen: `≥ 6 passed` — `budget(1) === 10`; `budget(4) === 15` (nefes);
`budget(7) === 25` (nefes); `budget(10) === 52`; `budget(0)` hata fırlatıyor;
nefes dalgaları bir öncekinden **küçük**.

**Bitmedi sayılır eğer:** herhangi bir denge sayısı `src/systems/` içinde
geçiyorsa (TIER 1 k.1).

---

### M3-T02 — `Wave` tipleri ve Harita 1'in 10 dalgası

| | |
|---|---|
| **Kimlik** | `M3-T02` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M3-T01` |
| **TIER 1** | **kural 1** |
| **Açık soru** | S30, S33 |
| **Doküman** | `GAME-DESIGN.md` §7 (şema, telegraf), §5 (harita kadrosu tablosu) |

**Dosyalar**
- `src/types/wave.ts` — yeni — `Wave`, `WaveGroup`
- `src/data/waves.ts` — değişiklik — harita 1'in dalgaları

**İmza**
```ts
export interface WaveGroup {
  readonly enemy: EnemyId;
  readonly count: number;
  readonly spawnDelay: number;   // grup içi, saniye
  readonly startAt: number;      // dalga başından, saniye
  readonly spawnPoint: number;   // giriş indeksi
}
export interface Wave { readonly index: number; readonly groups: readonly WaveGroup[]; }
```

**Yapılacak**
- Şema `GAME-DESIGN.md` §7'den **birebir**.
- Harita 1 kadrosu: **yalnız Goblin, Ork Savaşçı, Kurt Binicisi**
  (§5 kadro tablosu; Harpi M4'te uçan hareketiyle gelir, boss da M4'te).
- Dalgalar bütçeden **üretilir**, sonra elle rötuşlanır (§7). Rötuşu kimin
  yapacağı **S30**.
- Boss dalgası (10) bu taşta **yok** — boss M4'te. Dalga 10 şimdilik
  yoğun Kurt Binicisi dalgası. Boss dalgasında refakat olup olmayacağı **S33**.

**Kabul kriteri**
```bash
npm run test -- waves
```
Beklenen: `≥ 4 ek test` — her dalganın puan toplamı `budget(n)` ile
`±%10` içinde; hiçbir dalga `enemyRoster` dışı düşman içermiyor;
`startAt` değerleri artan; toplam düşman sayısı havuz kapasitesini (60) aşmıyor.

**Bitmedi sayılır eğer:** bir dalga `enemyRoster`'da olmayan bir düşman
içeriyorsa.

---

### M3-T03 — `EconomySystem`

| | |
|---|---|
| **Kimlik** | `M3-T03` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M3-T01`, `M2-T05` |
| **TIER 1** | kural 1, **kural 7** |
| **Açık soru** | — |
| **Doküman** | `GAME-DESIGN.md` §6, §4.5 (%70 satış), §9 (`startGold`, `goldMultiplier`) |

**Dosyalar**
- `src/systems/EconomySystem.ts` — yeni
- `src/systems/EconomySystem.test.ts` — yeni

**İmza**
```ts
export class EconomySystem {
  constructor(map: MapDef, bus: EventBus);
  readonly gold: number;
  readonly lives: number;
  canAfford(cost: number): boolean;
  spend(cost: number): boolean;
  award(enemy: EnemyDef): void;          // gold × map.goldMultiplier
  sellRefund(spentTotal: number): number; // %70
  loseLife(amount: number): void;
}
```

**Yapılacak**
- Başlangıç: `map.startGold` (harita 1 → **280**), can **20**
  (`GAME-DESIGN.md` §6, §9).
- Öldürme altını `enemy.gold × map.goldMultiplier` (§9: altın çarpanı
  HP çarpanına eşit).
- Satış iadesi harcanan **toplamın** %70'i — tek kademe değil, kümülatif.
- Altın ve can göstergeleri `BitmapText` (TIER 1 k.7).
- `gold:changed`, `life:lost` yayar.

**Kabul kriteri**
```bash
npm run test -- EconomySystem
```
Beklenen: `≥ 7 passed` — başlangıç değerleri; `spend` yetersiz altında
`false` dönüyor ve altını değiştirmiyor; `%70` yuvarlaması
(`Math.floor` mu `round` mu — testte sabitlenir); `goldMultiplier`
uygulanıyor; can 0'ın altına inmiyor.

**Bitmedi sayılır eğer:** altın negatife düşebiliyorsa.

---

### M3-T04 — Hazırlık sayacı ve erken başlatma bonusu

| | |
|---|---|
| **Kimlik** | `M3-T04` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M3-T03` |
| **TIER 1** | **kural 7**, **kural 8** |
| **Açık soru** | S29 |
| **Doküman** | `GAME-DESIGN.md` §6 (ölçekli bonus formülü ve gerekçesi) |

**Dosyalar**
- `src/systems/WaveManager.ts` — yeni (iskelet) — hazırlık aşaması
- `src/systems/WaveManager.test.ts` — yeni

**İmza**
```ts
export function earlyStartBonus(remainingSec: number, waveNo: number): number;
```

**Yapılacak**
- Formül: `kalanSaniye × ceil(dalgaNo / 2)` (§6). Sayaç **20 sn**.
- **İlk 3 dalgada kapalı** — buton dalga 4'te açılır (§6). Gerekçe dokümanda:
  eski sabit bonus yeni oyuncuya "telegrafı okuma, hemen bas" öğretiyordu.
- Geri sayım `BitmapText` (TIER 1 k.7), `scaledDelta` ile (TIER 1 k.8).
- Dalga 1'in otomatik başlayıp başlamayacağı **S29**.

**Kabul kriteri**
```bash
npm run test -- WaveManager
```
Beklenen: `≥ 5 passed` — `earlyStartBonus(20, 1) === 0` (kapalı);
`earlyStartBonus(20, 4) === 40`; `earlyStartBonus(20, 10) === 100`;
`earlyStartBonus(0, 10) === 0`; negatif kalan süre `0` veriyor.

**Bitmedi sayılır eğer:** bonus dalga 1-3'te sıfırdan farklıysa.

---

### M3-T05 — `WaveManager`: doğurma ve grup tempo formülü

| | |
|---|---|
| **Kimlik** | `M3-T05` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M3-T02`, `M3-T04` |
| **TIER 1** | kural 3, **kural 8** |
| **Açık soru** | S28 |
| **Doküman** | `GAME-DESIGN.md` §7 (tempo formülü) · `research/01` §8 |

**Dosyalar**
- `src/systems/WaveManager.ts` — değişiklik — doğurma döngüsü
- `src/systems/SpawnSystem.ts` — **silinir** (M1'in geçici doğurucusu)

**Yapılacak**
- `M1-T07`'deki geçici `SpawnSystem` bu görevde **kaldırılır**.
- Grup tempo formülü (§7): `düşmanlarArasıBekleme = SPAWN_K / dalgaBoyu`,
  `dalgaSonrasıBekleme = REST_K × dalgaBoyu`. Kalabalık dalgalar sık doğurur,
  uzun nefes bırakır. Sabitler **S28**.
- Tüm zamanlayıcılar `scaledDelta` (TIER 1 k.8) — 2× hızda dalga da hızlanır.
- `wave:started` yayar.

**Kabul kriteri**
```bash
npm run test -- WaveManager
```
Beklenen: `≥ 4 ek test` — grup `startAt`'ta doğmaya başlıyor; `spawnDelay`
aralıklarla `count` kadar düşman çıkıyor; son düşman ölünce/sızınca dalga
bitiyor; havuz dolu olduğunda doğurma **erteleniyor** (düşman kaybolmuyor).

**Bitmedi sayılır eğer:** havuz doluyken doğurulmak istenen düşman sessizce
atlanıyorsa.

---

### M3-T06 — Dalga telegrafı

| | |
|---|---|
| **Kimlik** | `M3-T06` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M3-T05` |
| **TIER 1** | kural 7 |
| **Açık soru** | — |
| **Doküman** | `GAME-DESIGN.md` §7 (telegraf zorunlu), §11 (bilgi paneli ilkesi) |

**Dosyalar**
- `src/scenes/HudScene.ts` — değişiklik — telegraf şeridi

**Yapılacak**
- Hazırlık aşamasında gelecek dalganın kompozisyonu ikonlarla:
  `🗡️×8  🛡️×3` biçiminde (§7). M6'da ikonlar sprite olacak; şimdilik
  greybox renkli kareler + `BitmapText` sayı.
- **Zorunlu özellik** — "oyuncunun körlemesine oynaması türün en yaygın
  şikâyeti" (§7).
- Sayılar `BitmapText` (TIER 1 k.7).

**Kabul kriteri**
```bash
npm run dev
```
gözle: hazırlık aşamasında ekranda gelecek dalganın her düşman tipi için
bir kare + adet; dalga başlayınca telegraf sönümleniyor; dalga 4'te
(nefes dalgası) adetler bir öncekinden az.

**Bitmedi sayılır eğer:** telegraf dalga başladıktan sonra da duruyorsa.

---

### M3-T07 — `referenceBoards.ts`

| | |
|---|---|
| **Kimlik** | `M3-T07` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M3-T03` |
| **TIER 1** | **kural 1** |
| **Açık soru** | — (S25 kapandı: bu görev cevabı **türetiyor**) |
| **Doküman** | `GAME-DESIGN.md` §6 (ekonomi tablosu) · `research/01` §6, §9, §11 |

**Dosyalar**
- `src/types/board.ts` — yeni — `ReferenceBoard`
- `src/data/referenceBoards.ts` — yeni

**İmza**
```ts
/** Dalga N'de oyuncunun makul olarak sahip olacağı tahta. */
export interface ReferenceBoard {
  readonly waveIndex: number;
  readonly towers: readonly { spotIndex: number; towerId: TowerId; tier: 0|1|2 }[];
  readonly cumulativeCost: number;   // altın
}
```

**Yapılacak**

Tahta **uydurulmaz, türetilir.** Kaynak `GAME-DESIGN.md` §6 ekonomi tablosu:

1. Dalga N'e kadarki kümülatif altını hesapla (`M3-T10`'un `cumulativeGold`'u):
   `startGold` + öldürme altını + `Σ(30 + 5n)` + erken bonus (0 varsay —
   muhafazakâr taban).
2. Harcama kuralı: **önce yapı noktalarını doldur, sonra yükselt.** §6:
   "yükseltme yer kıtlığı yüzünden mantıklıdır" ve "8 nokta dalga 4-5'te
   dolmalı". Makul oyuncu bu sırayı izler.
3. Kule dağılımı §5 karşı-oyun tablosundan: kalabalığa Top, zırhlıya Büyü,
   uçana Okçu. Harita 1 kadrosu (Goblin, Ork Savaşçı, Kurt Binicisi) için
   Okçu/Top ağırlıklı.
4. Kalan altınla en pahalı karşılanabilir yükseltmeyi al, tekrarla.

Bu bir **algoritma**, elle yazılmış bir liste değil — `buildReferenceBoards()`
fonksiyonu üretir, çıktı `referenceBoards.ts`'e yazılır.

**Kabul kriteri**
```bash
npm run test -- referenceBoards
```
Beklenen: `≥ 5 passed` — her tahtanın `cumulativeCost`'u o dalgaya kadarki
kümülatif altını **aşmıyor**; dalga N'in tahtası N-1'inkini **kapsıyor**
(kule kaybolmuyor); hiçbir tahta 8 yapı noktasını aşmıyor; **dalga 5'te
8 nokta dolu** (§6 şartı); dalga 10'da en az bir Tier 2 var.

**Bitmedi sayılır eğer:** tahta elle yazılmışsa. Türetilmezse ekonomi
değiştiğinde tahta eskiyor ve üç denge testi sessizce yanlış temele oturuyor.

---

### M3-T08 — Kısıt A sağlaması

| | |
|---|---|
| **Kimlik** | `M3-T08` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M1-T02`, `M2-T02`, `M3-T07` |
| **TIER 1** | kural 5 |
| **Açık soru** | — (S25 `M3-T07`'de türetiliyor) |
| **Doküman** | `GAME-DESIGN.md` §6 (Kısıt A) · `research/01` §2, §4, §11, §12 |

**Dosyalar**
- `src/systems/balanceChecks.ts` — yeni — `ceilingA`
- `src/systems/balanceChecks.test.ts` — yeni

**İmza**
```ts
/** Tek düşmana verilebilecek toplam hasar tavanı. Yerleşimden bağımsız. */
export function ceilingA(
  board: ReferenceBoard, coverage: readonly {spotIndex:number;coveredPx:number}[],
  enemy: EnemyDef, map: MapDef
): number;
```

**Yapılacak**
- Formül (`GAME-DESIGN.md` §6):
  `Σ_kule ( DPS_kule × kapsananYol_kule ) / hız_düşman`.
- `DPS_kule` düşmana **etkin** DPS — `applyDamage` üzerinden, zırh/direnç
  uygulanmış (M2-T02'yi çağırır).
- **Ayrık yollu haritalarda kol başına ayrı hesap** (§9 uyarısı). Harita 1
  tek yol ama fonksiyon çoğulu destekler.
- Test: her düşman tipi için `ceilingA > effectiveHp × 1.15`.
- Trol'ün yenilenmesi efektif HP'ye eklenir (`research/01` §5).

**Kabul kriteri**
```bash
npm run test -- balanceChecks
```
Beklenen: `≥ 5 passed` — harita 1'in üç düşman tipi için sağlama geçiyor;
kapsama sıfır olan bir tahta için `ceilingA === 0`; kule yerleşimi
değiştiğinde sonuç **değişmiyor** (yerleşimden bağımsızlık kanıtı).

**Bitmedi sayılır eğer:** `ceilingA` kule yerleşimine göre farklı sonuç
veriyorsa — formül yanlış demektir (`research/01` §2).

**Risk:** Girdi olan kapsama sayısı `M1-T09`'dan gelir ve o sayı şu an
`research/01` §4'teki çözülmemiş varsayımın konusu. **Erken uyarı:**
boss/Trol dışındaki düşmanlar için tavan HP'nin 3-8 katı çıkmıyorsa
ölçüm veya formül hatalı.

---

### M3-T09 — Kısıt B: başsız simülasyon

| | |
|---|---|
| **Kimlik** | `M3-T09` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M3-T05`, `M3-T07` |
| **TIER 1** | kural 5, **kural 8** |
| **Açık soru** | — (S26 ve S27 **kapandı** — aşağıdaki gerekçe) |
| **Doküman** | `GAME-DESIGN.md` §6 (Kısıt B) · `research/01` §10 · `CLAUDE.md` Mimari |

**Dosyalar**
- `src/systems/waveSim.ts` — yeni — başsız dalga simülasyonu
- `src/systems/waveSim.test.ts` — yeni

**İmza**
```ts
export interface SimResult {
  readonly leakedHp: number;      // kaleye ulaşan toplam efektif HP
  readonly leakedCount: number;
  readonly durationSec: number;   // ÖLÇÜLDÜ, tanımlanmadı
}
export function simulateWave(
  wave: Wave, board: ReferenceBoard, map: MapDef, stepMs?: number
): SimResult;
```

**Neden formül değil simülasyon**

Kısıt B'nin iki girdisi — `dalgaSüresi` ve `aktiflikOranı` — **statik veriden
hesaplanamaz.** İkisi de bir dalganın nasıl aktığına bağlı: kuleler ne zaman
hedef buldu, düşmanlar ne zaman öldü, kalan sürede kim menzildeydi.
Bunlara tanım uydurmak, uydurulmuş bir sayıyla test yeşile boyamak olurdu.

Kısıt A statik kalabiliyor çünkü tek düşman için kapsama × hız yeterli
(`research/01` §2: yerleşimden bağımsız). Kısıt B için aynı şey doğru değil.

**Doğru çözüm:** dalgayı gerçekten çalıştır ve **sızan HP'yi ölç.**
`CLAUDE.md` Mimari bunu zaten mümkün kılıyor — "Sahneler ince olur, oyun
mantığı `systems/` içinde yaşar", yani `WaveManager`, `TowerSystem`,
`ProjectileSystem` sahnesiz koşturulabilir.

**Yapılacak**
- Sabit adımlı döngü (`stepMs` varsayılan 16.67), render yok, sahne yok.
  `GameClock.tick(stepMs)` ile ilerlet — TIER 1 k.8 burada da geçerli.
- Referans tahtayı kur, dalgayı doğur, son düşman ölene veya kaleye
  varana kadar çalıştır.
- `durationSec` **çıktı**, girdi değil. `aktiflikOranı` hiç hesaplanmıyor —
  simülasyon zaten gerçek aktifliği yaşıyor. Odaklanma kaybı (`× 0.75`,
  `research/01` §10) da doğal olarak ortaya çıkıyor, çarpan gerekmiyor.
- Deterministik olmalı: rastgelelik yoksa aynı girdi aynı sonucu verir.
  Perde kayması gibi görsel rastgelelikler simülasyonda devre dışı.

**Kabul kriteri**
```bash
npm run test -- waveSim
```
Beklenen: `≥ 5 passed` — harita 1'in 10 dalgası için `leakedHp === 0`
(referans tahtayla hiçbir dalga sızmıyor); aynı girdi iki kez aynı sonuç
(determinizm); kulesiz tahtada `leakedHp > 0`; `stepMs` yarıya inince
sonuç `< %2` değişiyor (yakınsama); simülasyon 10 dalga için `< 2 sn` sürüyor.

**Bitmedi sayılır eğer:** simülasyon render veya `Phaser.Scene` gerektiriyorsa
— o zaman test ortamında koşmaz ve CI'da çalışmaz.

**Not:** bu yaklaşım M7'de bedava genişliyor — 3 harita × 10 dalga aynı
fonksiyonla doğrulanıyor, ayrık yol dahil.

---

### M3-T10 — Ekonomi karşılanabilirlik sağlaması

| | |
|---|---|
| **Kimlik** | `M3-T10` · **Durum** ☐ · **Süre** ~35 dk |
| **Önkoşul** | `M3-T07`, `M3-T03` |
| **TIER 1** | kural 5 |
| **Açık soru** | — (S25 `M3-T07`'de türetiliyor) |
| **Doküman** | `GAME-DESIGN.md` §6 (denge ilkesi, yükseltme gerekçesi) · `research/01` §6, §9 |

**Dosyalar**
- `src/systems/balanceChecks.ts` — değişiklik — `cumulativeGold`

**İmza**
```ts
export function cumulativeGold(map: MapDef, throughWave: number): number;
```

**Yapılacak**
- Toplam gelir: `startGold` + öldürme altını + dalga bonusu + erken bonus
  (üst sınır). Formüller `GAME-DESIGN.md` §6.
- Test: her dalga için `cumulativeGold(n) ≥ referenceBoard[n].cumulativeCost`.
- **Ek test:** 8 yapı noktası **dalga 4-5'te** doluyor mu? §6 açıkça bunu
  şart koşuyor — dolmazsa yükseltme mekaniği hiç yaşanmıyor
  (`research/01` §9).

**Kabul kriteri**
```bash
npm run test -- balanceChecks
```
Beklenen: `≥ 3 ek test` — her dalgada karşılanabilirlik; dalga 5 sonunda
referans tahta 8 noktayı dolduruyor; dalga 10'da en az bir Tier 2 alınabiliyor.

**Bitmedi sayılır eğer:** 8 noktanın dolma dalgası 6'dan büyükse — bu bir
test başarısızlığı değil, **denge bulgusu**; `OPEN-QUESTIONS.md`'ye yazılır.

---

### M3-T11 — Kazanma ve kaybetme ekranları

| | |
|---|---|
| **Kimlik** | `M3-T11` · **Durum** ☐ · **Süre** ~35 dk |
| **Önkoşul** | `M3-T05`, `M3-T03` |
| **TIER 1** | kural 7 |
| **Açık soru** | S31, S32 |
| **Doküman** | `GAME-DESIGN.md` §2 (palet) · `ROADMAP.md` M7 (3 yıldız) |

**Dosyalar**
- `src/scenes/GameOverScene.ts` — yeni — kazanma ve kaybetme

**Yapılacak**
- Kaybetme: can 0. **Anında mı dalga sonunda mı — S31.**
- Kazanma: 10. dalga bitti ve can > 0. Kalan can gösterilir.
- 3 yıldız derecelendirmesi M7'de; **eşikler dokümanda yok — S32.**
  Bu ekran şimdilik yalnız kalan canı yazar.
- Menüye dön butonu, ≥ 44×44 px.

**Kabul kriteri**
```bash
npm run dev
```
gözle: 10 dalgayı bitirince kazanma ekranı ve kalan can; kuleleri silip
canı 0'a düşürünce kaybetme ekranı; ikisinden de menüye dönülüyor ve
yeni oyun temiz başlıyor (altın ve can sıfırlanmış).

**Bitmedi sayılır eğer:** menüden yeni oyuna girince önceki oyunun altını
veya kuleleri duruyorsa.

---

## 3. AÇIK SORULAR

> **Üçü kapandı.** `S25` `M3-T07`'de **türetiliyor** (ekonomi tablosundan
> algoritmayla, elle yazılmadan). `S26` ve `S27` **düştü** — Kısıt B artık
> formül değil, başsız simülasyon (`M3-T09`); `dalgaSüresi` ölçülüyor,
> `aktiflikOranı` hiç hesaplanmıyor.

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S28 | `SPAWN_K` ve `REST_K` sabitleri | `M3-T01`, `M3-T05` |
| S29 | Dalga 1 otomatik mi başlıyor, oyuncu mu başlatıyor? | `M3-T04` |
| S30 | 10 dalganın bütçeden üretilen kompozisyonunu kim rötuşlayacak? | `M3-T02` |
| S31 | Kaybetme: can 0 olunca anında mı, dalga sonunda mı? | `M3-T11` |
| S32 | 3 yıldız eşikleri (kalan cana göre) | `M3-T11`, M7 |
| S33 | Boss dalgasında refakat var mı? §7 "refakatsiz gelir veya sonra gönderilir" diyor ama seçim yapılmamış | `M3-T02`, M4 |

**Bu taşta bloke edici soru kalmadı.** Denge sağlamalarının üçü de
çalıştırılabilir: Kısıt A statik hesap, Kısıt B simülasyon, ekonomi
türetilmiş referans tahtaya karşı.

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Simülasyon sahneye bağımlı yazılır | Test ortamında koşmuyor, `npm run test` kırılıyor | `M3-T09` "bitmedi sayılır eğer" |
| Simülasyon deterministik değil | Aynı test bazen yeşil bazen kırmızı | Determinizm testi (`M3-T09`) |
| M1'in kapsama ölçümü gelmemiş | `M3-T08` çalıştırılamıyor | Taş sırası zorunlu; M1 bitmeden M3 başlamaz |
| Referans tahta gerçeği yansıtmıyor | Testler yeşil ama oyun elle oynanınca zor/kolay | `M3-T10` "8 nokta dalga 4-5'te dolsun" testi bunu yakalar |
| Boss/Trol geçici HP'leri denge testine giriyor | Test sonucu ⚠️ işaretli sayılara dayanıyor | Boss M4'te; Trol harita 3'te — ikisi de M3'te devrede değil |
| Dalgalar elle yazılıp bütçeden kopuyor | `M3-T02` `±%10` testi kırmızı | Test zaten var |
| Altın/can `Text` ile çizilir | `guard` kontrol 4 kırmızı | TIER 1 k.7 |

## 5. Taş sonu kontrol listesi

- [ ] `npm run typecheck && npm run test && npm run build && npm run guard` dördü de yeşil
- [ ] Harita 1 baştan sona oynanıyor ve **bitirilebiliyor**
- [ ] Kaybetme de çalışıyor (canı bilerek düşür)
- [ ] Hazırlık sayacı, erken başlatma bonusu (dalga 4'ten itibaren), telegraf
- [ ] Kule alınıp %70 iadeyle satılabiliyor
- [ ] Kısıt A sağlaması yeşil, üç düşman tipi için de
- [ ] **Kısıt B simülasyonu** 10 dalga için `leakedHp === 0` veriyor
- [ ] Simülasyon deterministik ve sahnesiz (test ortamında koşuyor)
- [ ] `referenceBoards` **türetiliyor**, elle yazılmamış
- [ ] Ekonomi sağlaması yeşil; 8 nokta hangi dalgada doluyor **raporlandı**
- [ ] Altın, can, geri sayım hepsi `BitmapText`
- [ ] `M1-T07`'nin geçici `SpawnSystem`'i silindi
- [ ] Uydurulmuş hiçbir sayı yok; geçiciler `// GEÇİCİ — S<nn>` işaretli
- [ ] Yeni ortaya çıkan belirsizlikler `OPEN-QUESTIONS.md`'ye eklendi

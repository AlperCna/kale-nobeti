# M2 — Kule, mermi, hedefleme

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M2 |
| **Görev** | 9 (`M2-T01` … `M2-T09`) |
| **Kod yazma süresi** | ~6 sa 5 dk — **takvim değil** |
| **Takvim bütçesi** | 2-3 gün (`ROADMAP.md`) |
| **Durum** | ☐ bekliyor |

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı.
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/plan/DATA-SCHEMAS.md` — `TowerDef`, `TowerTier`, `EnemyDef`
4. `docs/GAME-DESIGN.md` §3 (hasar modeli), §4.1 (Okçu), §4.2 (Top), §4.5
   (kule kuralları, hedefleme tanımları), §5 (düşman tablosu)
5. `docs/research/02-phaser-teknik.md` §1 (`BitmapText`), §7 (havuzlama), §8 (kare bütçesi)

**Başka dosya açma.** `research/03`-`06` bu taşa girmiyor.

## 1. Amaç ve bitiş durumu

**Amaç:** Kule koyup düşman öldürebilmek. Bu taşın kalıcı çıktısı
`applyDamage` — oyunun tüm karşı-oyun katmanı bu saf fonksiyonun üstünde
duruyor ve M3'teki denge sağlamaları onu doğrudan çağıracak.

**Taş bittiğinde oyun:** yapı noktasına tıklayıp Okçu veya Top (Tier 1)
koyabiliyorum; kuleler otomatik ateş ediyor, düşmanlar ölüyor; hover'da
menzil dairesi ve **kapsanan yol** görünüyor; hasar sayıları üç renkte
(gri/parşömen/altın) süzülüyor.

**Olmayan:** altın, maliyet, satış, yükseltme, Tier 2-3, Büyü/Kışla,
dalga, kazan/kaybet. Kuleler bedava ve sınırsız konuyor — ekonomi M3'te.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| 1 — denge verisi `src/data/` | `M2-T01` |
| **3 — havuzlama** | `M2-T06`, `M2-T08` |
| 5 — `any` yasak | hepsi |
| **7 — `BitmapText`** | `M2-T08` (ilk gerçek çarpışma) |
| 8 — ham `delta` yasak | `M2-T06`, `M2-T07` |
| **9 — karesel mesafe** | `M2-T03`, `M2-T07`, `M2-T09` |

---

## 2. Görevler

### M2-T01 — Kule/düşman tipleri ve Tier 1 verisi

| | |
|---|---|
| **Kimlik** | `M2-T01` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M1-T03` |
| **TIER 1** | **kural 1**, kural 5 |
| **Açık soru** | — |
| **Doküman** | `GAME-DESIGN.md` §4.1, §4.2, §5 · `DATA-SCHEMAS.md` |

**Dosyalar**
- `src/types/tower.ts` — yeni — `TowerDef`, `TowerTier`, `TargetMode`
- `src/types/enemy.ts` — yeni — `EnemyDef`, `DamageType`
- `src/data/towers.ts` — yeni — Okçu ve Top, yalnız Tier 1
- `src/data/enemies.ts` — yeni — Goblin, Ork Savaşçı (harita 1 kadrosunun ilk ikisi)

**İmza**
```ts
export type DamageType = 'physical' | 'magic' | 'true';
export type TargetMode = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';

export interface TowerTier {
  readonly cost: number;         // altın
  readonly damage: number;       // atış başına ham hasar
  readonly fireRate: number;     // atış/sn
  readonly range: number;        // px
  readonly splashRadius?: number;// px, yalnız Top
  readonly airMultiplier: 0 | 0.5 | 1;
}
```

**Yapılacak**
- Sayılar `GAME-DESIGN.md` §4.1/§4.2 tablolarından **birebir**:
  Okçu T1 `70 / 6 / 1.1 / 150`, Top T1 `110 / 22 / 0.5 / 140`, patlama `45`.
- Düşman: Goblin `45 / 60 / 0 / 0`, Ork Savaşçı `110 / 45 / 2 / 0`
  (§5 tablosu). Ork Savaşçı **zırh kavramını tanıtan** düşman — M2'de
  olması `applyDamage`'ı gerçek veriyle sınamak için gerekli.
- Hiçbir sayı `src/systems/` içine yazılmaz (TIER 1 k.1).

**Kabul kriteri**
```bash
npm run typecheck && npm run test -- data
```
Beklenen: `typecheck` temiz; test → `towers.ts` ve `enemies.ts` içindeki her
sayı `GAME-DESIGN.md` tablosuyla eşleşiyor (test sabitleri elle yazılı,
kaynak belirtilmiş).

**Bitmedi sayılır eğer:** `airMultiplier` Top T1'de `0` değilse
(§4.2: Havan dalına kadar uçana vuramaz).

---

### M2-T02 — `applyDamage` ve testleri

| | |
|---|---|
| **Kimlik** | `M2-T02` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M2-T01` |
| **TIER 1** | kural 5 |
| **Açık soru** | — |
| **Doküman** | `GAME-DESIGN.md` §3 (kod bloğu dahil) |

**Dosyalar**
- `src/systems/combat.ts` — yeni — saf hasar fonksiyonu
- `src/systems/combat.test.ts` — yeni

**İmza**
```ts
export interface DamageResult {
  readonly dealt: number;
  readonly floored: boolean;   // %15 tabanına düştü mü — M2-T08 renk kodu için
}
export function applyDamage(
  dmg: number, type: DamageType, e: Pick<EnemyDef, 'armor' | 'magicResist'>
): DamageResult;
```

**Yapılacak**
- `GAME-DESIGN.md` §3'teki kod bloğunu birebir uygula: fiziksel `dmg - armor`,
  büyü `dmg × (1 - magicResist)`, taban `Math.max(out, dmg * 0.15)`.
- `floored` alanı §3'teki eklenti: taban devreye girdi mi. Hasar sayısının
  gri + kalkan ikonlu çizilmesi buna bağlı.
- **Fonksiyon saf.** Sahne, rastgelelik, zaman yok — M3'teki Kısıt A/B
  testleri bunu binlerce kez çağıracak.

**Kabul kriteri**
```bash
npm run test -- combat
```
Beklenen: `≥ 8 passed`. Zorunlu senaryolar:
zırh 0 → tam hasar; zırh > hasar → `dealt === dmg * 0.15`, `floored === true`;
Okçu T2 (10) vs boss zırh 10 → `1.5`; büyü + direnç `0.40` → `%60`;
`true` hasar hiç azalmaz; `dmg === 0` → `0`; büyü direnci `0` → tam hasar;
Ork Savaşçı zırh 2 vs Okçu T1 (6) → `4`.

**Bitmedi sayılır eğer:** `floored` büyü hasarında yanlış hesaplanıyorsa —
büyü direnci `%85`'in altındaysa taban hiç devreye girmez (§3 notu).

---

### M2-T03 — `TargetingSystem` seçicileri

| | |
|---|---|
| **Kimlik** | `M2-T03` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M1-T06`, `M2-T01` |
| **TIER 1** | kural 5, **kural 9** |
| **Açık soru** | S24 |
| **Doküman** | `GAME-DESIGN.md` §4.5 (beş modun tam tanımı) |

**Dosyalar**
- `src/systems/TargetingSystem.ts` — yeni
- `src/systems/TargetingSystem.test.ts` — yeni

**İmza**
```ts
export function selectTarget(
  mode: TargetMode,
  candidates: readonly Enemy[],
  tower: { pos: Vec2; rangeSq: number; airMultiplier: 0 | 0.5 | 1 }
): Enemy | null;
```

**Yapılacak**
- Beş mod, `GAME-DESIGN.md` §4.5 tablosundaki tanımlarla **birebir**:
  `first` = kaleye kalan **mesafe** en az; `last` = en çok;
  `strongest` = **maksimum** HP en yüksek (mevcut HP değil — hedef titremesini
  önlemek için); `weakest` = mevcut HP en düşük; `closest` = öklit mesafe.
- Menzil kontrolü `distSq <= rangeSq` (TIER 1 k.9).
- `airMultiplier === 0` olan kule uçan düşmanı **aday listesinden eler**.
- Eşitlikte kararlı sonuç: aynı girdi hep aynı hedefi verir (dizi sırası
  belirleyici; rastgelelik yok).

**Kabul kriteri**
```bash
npm run test -- TargetingSystem
```
Beklenen: `≥ 9 passed` — beş mod ayrı ayrı; boş liste → `null`;
menzil dışı hepsi → `null`; `strongest` mevcut HP'ye **bakmıyor**
(hasar görmüş yüksek maksHP'li düşman hâlâ seçiliyor);
uçan düşman `airMultiplier: 0` kulede eleniyor.

**Bitmedi sayılır eğer:** `strongest` mevcut HP'ye bakıyorsa.

---

### M2-T04 — Yapı noktası etkileşimi, menzil ve kapsama gösterimi

| | |
|---|---|
| **Kimlik** | `M2-T04` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M1-T08`, `M1-T02` |
| **TIER 1** | kural 7, **Platform** (44×44) |
| **Açık soru** | S19 |
| **Doküman** | `GAME-DESIGN.md` §4.5 (hover'da kapsanan yol), §2 (kesikli altın çember) · `CLAUDE.md` Platform |

**Dosyalar**
- `src/systems/BuildSpotUI.ts` — yeni — hover/seçim ve göstergeler
- `src/scenes/GameScene.ts` — değişiklik

**Yapılacak**
- Yapı noktası tıklama alanı **≥ 44×44 px** (`CLAUDE.md` Platform).
- Hover'da: **kesikli altın menzil çemberi** + **mürekkep renkli 1 px dış
  kontur** (`GAME-DESIGN.md` §2 — kontursuz çember yoğun dalgada kayboluyor).
- Hover'da: o noktanın **kapsadığı yol parçası kalın altın çizgiyle
  vurgulanır** (`GAME-DESIGN.md` §4.5). `coveredLength`'in döndürdüğü
  noktalar kullanılır — `M1-T02` zaten biliyor.
- Kule seçim menüsü **S19**'a bağlı; cevap gelene kadar iki butonlu düz liste.

**Kabul kriteri**
```bash
npm run dev
```
gözle: noktanın üstüne gelince kesikli altın çember + koyu kontur çıkıyor;
yolun o noktadan görünen parçası kalınlaşıyor; çember düşmanların üstünde
kaybolmuyor; tıklama alanı görsel daireden büyük.

**Bitmedi sayılır eğer:** menzil çemberi her karede yeniden yaratılıyorsa
(tek `Graphics` nesnesi yeniden çizilmeli).

---

### M2-T05 — `Tower` entity ve yerleştirme

| | |
|---|---|
| **Kimlik** | `M2-T05` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M2-T01`, `M2-T04` |
| **TIER 1** | kural 5 |
| **Açık soru** | S23 |
| **Doküman** | `CLAUDE.md` Mimari (`tower:placed`) · `GAME-DESIGN.md` §4 |

**Dosyalar**
- `src/entities/Tower.ts` — yeni
- `src/systems/TowerSystem.ts` — yeni

**İmza**
```ts
export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerDef;
  tierIndex: 0 | 1 | 2;          // T3 dalı M4'te ayrışacak
  targetMode: TargetMode;         // varsayılan 'first'
  cooldownLeft: number;           // sn
  target: Enemy | null;
}

export class TowerSystem {
  place(spotIndex: number, towerId: TowerId): Tower | null;
  update(scaledDelta: number, enemies: readonly Enemy[]): void;
}
```

**Yapılacak**
- Kuleler havuzlanmaz — sayıları sabit ve az (8-12). Havuzlama kuralı
  (TIER 1 k.3) mermi/düşman/parçacık/hasar sayısı için; kule dışında.
  Bunu koda yorum olarak yaz.
- `targetMode` varsayılanı `'first'` (`GAME-DESIGN.md` §4.5).
- Yerleştirme `tower:placed` yayar.
- Dönüş animasyonu **S23**'e bağlı; cevap gelene kadar kule dönmez,
  anında ateş eder.

**Kabul kriteri**
```bash
npm run dev
```
gözle: yapı noktasına tıklayıp Okçu koyabiliyorum; ikinci kez tıklayınca
dolu nokta yeni kule kabul etmiyor; 8 noktanın hepsi dolabiliyor.

**Bitmedi sayılır eğer:** aynı noktaya iki kule konabiliyorsa.

---

### M2-T06 — `ProjectileSystem` (havuzlu, hedef takipli)

| | |
|---|---|
| **Kimlik** | `M2-T06` · **Durum** ☐ · **Süre** ~45 dk |
| **Önkoşul** | `M1-T04`, `M2-T02` |
| **TIER 1** | **kural 3**, **kural 8**, kural 9 |
| **Açık soru** | S20, S21 |
| **Doküman** | `CLAUDE.md` TIER 1 k.3 · `research/02` §7 (havuz boyutları) |

**Dosyalar**
- `src/entities/Projectile.ts` — yeni
- `src/systems/ProjectileSystem.ts` — yeni

**İmza**
```ts
export class Projectile extends Phaser.GameObjects.Arc implements Poolable {
  target: Enemy | null;
  damage: number;
  damageType: DamageType;
  speed: number;                 // px/sn — S20
  splashRadius: number;          // 0 = tek hedef
  resetForPool(): void;
}
```

**Yapılacak**
- Havuz ön ayırma **200** (`research/02` §7 tablosu).
- Hareket `scaledDelta` ile (TIER 1 k.8). Çarpma kontrolü `distSq`
  (TIER 1 k.9).
- **Mermi hızı dokümanda yok — S20.** Cevap gelene kadar `600 px/sn`
  kullanılır ve `// GEÇİCİ — S20` işaretlenir.
- Hedef mermi havadayken ölürse davranış **S21**'e bağlı; geçici olarak
  mermi son bilinen konuma gider ve orada sönümlenir.
- `resetForPool`: `target`, `damage`, `splashRadius`, tween — hepsi sıfırlanır.
  **Sıfırlanmayan `target` ölü düşmanı canlı tutar** (TIER 1 k.3).

**Kabul kriteri**
```bash
npm run test -- Projectile
```
Beklenen: `≥ 4 passed` — hedefe varış; hedef `null` iken sönümlenme;
`resetForPool` sonrası `target === null`; havuz dolunca yeni mermi
yaratılmıyor.

**Bitmedi sayılır eğer:** `activeCount` uzun oyunda sürekli artıyorsa.

**Tuzak — mermi tünellemesi.** İsabet kontrolü **süpürülmüş** olmalı:
önceki konum → yeni konum doğru parçasının hedefe uzaklığı. Nokta-mesafe
kontrolü (`distSq(mermi, hedef) <= r²`) **yetmez.**

Hesap: 30 FPS'lik bir mobil cihazda **2× hızda** `scaledDelta` 66 ms'e
çıkıyor. 600 px/sn mermi o karede **40 px** atlıyor. İsabet yarıçapı
40 px'ten küçükse mermi hedefin içinden geçip ıskalıyor.

**Neden sinsi:** yalnız düşük FPS **ve** 2× birleşince oluyor. Geliştirme
makinesinde (M0'da 145 FPS ölçüldü) asla görünmez; M7'de "bazen mermiler
ıskalıyor" diye bulunamayan bir hata olarak döner.

`M2-T09`'daki patlama yarıçapı kontrolü de aynı sorunu taşıyor — patlama
konumu süpürülmüş kesişim noktası olmalı, son kare konumu değil.

---

### M2-T07 — Ateş döngüsü ve hedef arama bütçesi

| | |
|---|---|
| **Kimlik** | `M2-T07` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M2-T03`, `M2-T05`, `M2-T06` |
| **TIER 1** | **kural 8**, **kural 9** |
| **Açık soru** | S24 |
| **Doküman** | `research/02-phaser-teknik.md` §8 (kare bütçesi) · `CLAUDE.md` TIER 1 k.9 |

**Dosyalar**
- `src/systems/TowerSystem.ts` — değişiklik — ateş döngüsü

**Yapılacak**
- `cooldownLeft -= scaledDelta`; sıfırın altına inince ateş et ve sıfırla.
- **Kule ateşe hazır değilken hedef aramaz** (`CLAUDE.md` TIER 1 k.9).
  Bu tek kural hedef arama maliyetini ~10 kat düşürüyor (`research/02` §8).
- Mevcut hedef hâlâ geçerliyse (canlı + menzilde) yeniden arama yapılmaz.
- Aynı düşmana birden çok mermi gidebilmesi **S24**'e bağlı — bu, `research/01`
  §10'daki odaklanma kaybının (overkill) kaynağı. Geçici: sınır yok.

**Kabul kriteri**
```bash
npm run dev
```
gözle: 8 kule + 20 düşman aynı andayken hareket takılmıyor; kuleler
bekleme süresi dolmadan mermi çıkarmıyor (atış aralığı gözle sabit).
```bash
npm run guard
```
Beklenen: `4/4 ✓`.

**Bitmedi sayılır eğer:** `update` içinde her kule her karede tüm düşman
listesini tarıyorsa (bekleme süresindeyken de).

---

### M2-T08 — Hasar sayıları: `BitmapText` ve üç renk

| | |
|---|---|
| **Kimlik** | `M2-T08` · **Durum** ☐ · **Süre** ~40 dk |
| **Önkoşul** | `M2-T02`, `M2-T06` |
| **TIER 1** | **kural 3**, **kural 7** |
| **Açık soru** | S18 |
| **Doküman** | `GAME-DESIGN.md` §3 (üç renk tablosu), §10 · `research/02` §1 |

**Dosyalar**
- `src/fx/DamageText.ts` — yeni — havuzlu hasar sayısı
- `public/assets/fonts/numbers.png` + `.xml` — yeni — yer tutucu bitmap font

**Yapılacak**
- **`Phaser.GameObjects.Text` kullanılamaz** (TIER 1 k.7). Yoğun dalgada
  saniyede 30-60 sayı üretilecek; `Text` her içerik değişiminde canvas
  yeniden üretip GPU'ya yüklüyor (`research/02` §1).
- Bitmap font **S18**'e bağlı: nihai font M6'da. Bu görevde 0-9 ve
  `+ - . %` içeren **yer tutucu** bitmap font üretilir
  (SnowB BMF, `research/02` §1'de linkli).
- Havuz ön ayırma **60** (`research/02` §7).
- **İki renk** (`GAME-DESIGN.md` §3):
  `floored === true` → gri + küçük kalkan ikonu, %80 boyut;
  normal → parşömen, %100. **Kritik yok** — v1'den çıkarıldı (§3).
- Yukarı süzülme + sönümlenme; süre `scaledDelta` ile (2× hızda da doğru).

**Kabul kriteri**
```bash
npm run guard
```
Beklenen: `4/4 ✓` — kontrol 4 (değişen `Text`) temiz.
gözle: Okçu ile Ork Savaşçı'ya (zırh 2) vurunca parşömen `4`;
Top ile vurunca parşömen `20`; zırhı hasardan büyük bir kurgu düşmana
vurunca **gri** sayı + kalkan ikonu. Üçüncü bir renk **yok**.

**Bitmedi sayılır eğer:** hasar sayısı `Text` ile çiziliyorsa.

---

### M2-T09 — Alan hasarı (Top patlaması)

| | |
|---|---|
| **Kimlik** | `M2-T09` · **Durum** ☐ · **Süre** ~35 dk |
| **Önkoşul** | `M2-T06`, `M2-T08` |
| **TIER 1** | **kural 9** |
| **Açık soru** | S22 |
| **Doküman** | `GAME-DESIGN.md` §4.2 (patlama yarıçapı 45) |

**Dosyalar**
- `src/systems/ProjectileSystem.ts` — değişiklik — patlama çözümü

**Yapılacak**
- `splashRadius > 0` ise çarpma noktasındaki yarıçap içindeki **tüm**
  düşmanlara `applyDamage` uygulanır. Mesafe `distSq` (TIER 1 k.9).
- Merkeze uzaklığa göre azalma **S22**'ye bağlı; dokümanda yok.
  Geçici: sabit hasar, azalma yok.
- Her etkilenen düşman için ayrı hasar sayısı çıkar — havuz sınırına dikkat.

**Kabul kriteri**
```bash
npm run dev
```
gözle: Top kulesi, üst üste yürüyen 3 goblinin ortasına vurunca üçü de
hasar alıyor ve üç ayrı sayı çıkıyor; yarıçap dışındaki dördüncü goblin
etkilenmiyor.

**Bitmedi sayılır eğer:** patlama yalnız doğrudan vurulan düşmanı etkiliyorsa.

---

## 3. AÇIK SORULAR

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S18 | Yer tutucu bitmap font M2'de mi üretilecek, hangi karakter kümesi? | `M2-T08` |
| S19 | Kule seçim menüsü biçimi (liste / radyal / kartuş)? | `M2-T04` |
| S20 | **Mermi uçuş hızı kaç px/sn?** Dokümanda hiçbir yerde yok | `M2-T06` |
| S21 | Mermi havadayken hedef ölürse: kaybolsun mu, son konuma gitsin mi? | `M2-T06` |
| S22 | Patlama hasarı merkeze uzaklığa göre azalıyor mu? | `M2-T09` |
| S23 | Kule dönüş animasyonu var mı? Varsa dönerken ateş edebiliyor mu? (`research/01` §"dönüş vergisi" %15-20) | `M2-T05` |
| S24 | Aynı düşmana aynı anda kaç mermi gidebilir? Sınırsızsa odaklanma kaybı (`research/01` §10) gerçek oluyor | `M2-T07` |

S20 ve S24 denge etkisi olan sorular — **uydurulmadı**, geçici değer
kullanılıp işaretlendi.

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Hasar sayıları `Text` ile yazılır | Yoğun dalgada FPS düşüşü; `guard` kontrol 4 kırmızı | `M2-T08` kabulü `guard`'a bağlı |
| Mermi havuzu sızdırır | `activeCount` sürekli artıyor | `resetForPool` testi (`M2-T06`) |
| Ölü düşmana referans kalır | Düşman ölüyor ama kule ona ateş etmeye devam ediyor | `resetForPool` `target`'ı `null`'lar |
| Her karede hedef arama | 8 kule × 40 düşman = 320 mesafe/kare, 2×'te iki katı | Bekleme süresindeyken arama yok (`M2-T07`) |
| `strongest` hedef titremesi | Kule sürekli hedef değiştiriyor | Maksimum HP'ye bakılıyor (`M2-T03` testi) |
| Geçici mermi hızı kalıcılaşır | Denge M3'te tutmuyor, sebebi bulunamıyor | `// GEÇİCİ — S20` işareti + `OPEN-QUESTIONS.md` |

## 5. Taş sonu kontrol listesi

- [ ] `npm run typecheck && npm run test && npm run build && npm run guard` dördü de yeşil
- [ ] Yapı noktasına tıklayıp Okçu ve Top koyabiliyorum
- [ ] Kuleler otomatik ateş ediyor, düşmanlar ölüyor
- [ ] Hover'da kesikli altın çember + koyu kontur + kapsanan yol vurgusu
- [ ] Hasar sayıları `BitmapText` ve üç renk doğru çalışıyor
- [ ] Top patlaması birden çok düşmanı vuruyor
- [ ] `applyDamage` için ≥ 8 test geçiyor (zırh, direnç, %15 tabanı dahil)
- [ ] Beş hedefleme modu ayrı ayrı test edildi
- [ ] Uzun oyun sonrası mermi `activeCount` sabit
- [ ] Geçici sayılar (`S20`, `S22`, `S24`) kodda işaretli ve
      `OPEN-QUESTIONS.md`'de listeli
- [ ] **`docs/results/M2-SONUC.md` yazıldı** — test sayısı, 8 kule + 20
      düşmanla FPS, mermi havuzu tepe kullanımı dahil.

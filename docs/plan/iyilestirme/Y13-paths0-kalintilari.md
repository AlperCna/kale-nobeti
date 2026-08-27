# Y13 · `paths[0]` kalıntıları — kışla harita 2/3'te bozuk

| | |
|---|---|
| **Tür** | Yapısal — **doğrulanmış hata** (oynanış), **☑ düzeltildi (2026-08-27)** |
| **Önem** | **En yüksek.** Bir mekanik iki haritada büyük ölçüde çalışmıyordu |
| **Emek** | Küçük (gerçekleşen) |
| **Risk** | Düşük çıktı — aşağıdaki "Sonuç" bölümüne bakınız |
| **Dokunulan** | `src/util/math.ts`, `src/systems/BarracksSystem.ts`, `src/scenes/GameScene.ts:720, 774, 1102`, `src/systems/waveSim.ts:168, 261`, dört test dosyası |
| **İlgili** | `OPEN-QUESTIONS.md` **S57**, **S58**, **S69**, **S74** · `M7-SONUC.md` |

---

## Sonuç (2026-08-27)

**Düzeltildi.** `math.ts`'e `closestPointOnPaths` eklendi (bütün yollara
bakıp en yakınını seçiyor); `BarracksSystem.defaultRally`/`clampRally`
çoğul `paths` alacak şekilde değişti; üç gerçek çağrı yeri
(`GameScene.ts:720, 774, 1102`) ve `waveSim.ts:261` güncellendi.

**Canlı doğrulama** (`dev.placeBarracks`/`dev.rallyOf`/`dev.setRally`):

| Harita | Nokta | Beklenen kol | Sonuç |
|---|---|---|---|
| 2 · Taş Köprü | spot 6 (alt kol) | `y=600` | ✅ `{x:440, y:600}` |
| 2 · Taş Köprü | bayrak alt kola sürüklendi | `y=600` | ✅ `{x:300, y:600}` |
| 2 · Taş Köprü | bayrak üst kola sürüklenmeye çalışıldı (405 px uzak) | reddedilmeli | ✅ önceki noktada kaldı |
| 3 · Kül Ovası | spot 5 (Kol B) | `x∈[980,1340], y=120` | ✅ `{x:1160, y:120}` |
| 1 · Değirmen Geçidi (regresyon) | spot 0 | değişmemeli | ✅ `{x:95, y:140}`, eskisiyle aynı |

`npm run typecheck && npm run test && npm run guard` — **hepsi yeşil**
(686/686 test, 10/10 bekçi). `BarracksSystem.test.ts`'e yeni bir
`describe('Kural 6 — çok yollu harita (Y13)')` bloğu ve
`math.test.ts`'e `closestPointOnPaths` testleri eklendi.

### `KURALLAR.md` diff'i **boş çıktı** — ve bunun gerçek bir nedeni var

Doğrulama planı "denge sayıları değişecek, ayrıca ölçülmeli" diyordu.
Ölçüldü: **hiçbir sayı değişmedi.** Sebep, hatanın kendisi değil,
**otomatik referans tahtanın kışlayı nereye koyduğu**.

`balanceChecks.ts`'in `kislaNoktasiSec()`'i kışlayı her zaman **en düşük
toplam kapsamalı** noktaya kuruyor (S69'un ölçtüğü kural). Bu nokta,
harita 3 (`kul-ovasi`) için canlı ölçüldü:

```
kışla noktası index 4, {x:480, y:345}
  kol 0 (A) — distSq 5625   (75 px)
  kol 1 (B) — distSq 31225  (176,7 px)
```

Yani otomatik tahtanın seçtiği nokta **zaten** A koluna (yani
`paths[0]`'a) daha yakın. Eski hatalı kod da `paths[0]`'a bakıyordu —
bu **tek** senaryoda tesadüfen doğru sonucu veriyordu. (Harita 2'nin
referans tahtasında kışla hiç yok — `enemyRoster`'ında `trol` olmadığı
için `kislaAlinacak` hiç `true` olmuyor.)

**Hata gerçekti ve düzeltme gerekliydi** — canlı doğrulama bunu manuel
yerleşimlerde (spot 6, spot 5) açıkça gösterdi. Ama otomatik denge
ölçümü, kışlayı hep aynı (ve hatanın görünmediği) noktaya koyduğu için
hatayı **hiç sınamıyordu**. Bu, `Y13`'ün orijinal metnindeki üçüncü
desenin ("testler üst sınır kontrol ediyor, eşitlik değil") bir kuzeni:
burada test bile değil, **otomatik senaryonun kapsamı** hatayı
görmüyordu.

**`M7-SONUC.md:128`'deki hipotez doğrulanamadı.** O deneyin ("kışla
ortak noktaya") hangi tam koordinatları kullandığı kayıtlı değil;
bugünkü `kislaNoktasiSec` onunla aynı yeri seçmiyor olabilir. Hipotez
resmen **açık** kalıyor — ne doğrulandı ne çürütüldü.

### Öğrenilen ders

Bu, kod tabanının kendi 2. deseninin ("bekçiye bağlanan kurallar tuttu,
bağlanmayan tutmadı") somut bir örneği daha: `waveSim`/`balanceChecks`
**gerçek oyunla aynı kodu kullanıyor** iddiası doğru, ama yalnız **bir**
yerleşim senaryosunu deniyor. Oyuncunun deneyebileceği bütün yerleşimleri
kapsamıyor. Bu, listeye yeni bir bulgu olarak eklenmeye değer:
`balanceChecks.ts`'in kışla yerleşim mantığı yalnız "en düşük kapsamalı
nokta"yı deniyor; ikinci kolun yanındaki noktalar hiç sınanmıyor.

---

## Bulgu

Bu oturumda `WaveGroup.spawnPoint`'in hiç tüketilmediği bulunup
düzeltildi — düşmanlar harita 2 ve 3'ün ikinci girişini kullanmıyordu.

**Aynı sınıftan dört kalıntı daha var.** Üçü kışla mekaniğini harita
2 ve 3'te bozuyor, biri oyuncuya yanlış bilgi gösteriyor.

## Kanıt

Kod tabanında kalan bütün `paths[0]` kullanımları:

```
GameScene.ts:318    const yol = this.#map.paths[0] ?? [];                  ← düzeltildi, artık yalnız yedek
GameScene.ts:720    rally: defaultRally(spot, this.#map.paths[0] ?? [])                     HATA 1
GameScene.ts:774    k.rally = clampRally(spot, istenen, this.#map.paths[0] ?? [], k.rally)  HATA 2
GameScene.ts:1102   for (const p of coveredSegments(this.#map.paths[0] ?? [], spot, menzil))  HATA 3
waveSim.ts:168      const path = new PathSystem(map.paths[0] ?? []);       ← ölü yedek, zararsız
waveSim.ts:261      const rally = defaultRally(spot, map.paths[0] ?? []);                   HATA 4
```

Ve haritalar gerçekten çok yollu:

```
maps.ts:107   paths: [MAP1_PATH]                 ← tek yol, etkilenmiyor
maps.ts:199   paths: [MAP2_UST, MAP2_ALT]        ← iki yol
maps.ts:288   paths: [MAP3_KOL_A, MAP3_KOL_B]    ← iki yol
```

---

## Hata 1 — Kışla toplanma noktası yanlış kola kuruluyor

`GameScene.ts:720`, kışla kurulurken varsayılan toplanma noktasını
hesaplıyor:

```ts
rally: defaultRally(spot, this.#map.paths[0] ?? []),
```

`defaultRally` (`BarracksSystem.ts:82-87`):

```ts
export function defaultRally(barracksPos: Vec2, path: readonly Vec2[]): Vec2 {
  const yol = closestPointOnPath(barracksPos, path);
  if (distSq(barracksPos, yol.point) <= TOPLANMA_KARE) return yol.point;
  // Yol toplanma menzilinin dışında — harita hatası. Kışlanın üstü.
  return { x: barracksPos.x, y: barracksPos.y };
}
```

**Sonuç:** harita 2 veya 3'te, ikinci kolun yanına kurulan bir kışla
toplanma noktasını **birinci kola** göre hesaplıyor. Birinci kol
toplanma menzilinin (`TOPLANMA_KARE`) dışındaysa, fonksiyon kendi
yorumunun "harita hatası" dediği dala giriyor ve toplanma noktasını
**kışlanın kendi üstüne** koyuyor.

Askerler yolun üstünde değil, kışlanın üstünde toplanıyor. Yolun
üstünde durmayan asker **hiçbir düşmanı engellemiyor** —
`GAME-DESIGN.md` §4.4'ün dokuz kuralının tamamı engellemeye dayanıyor.

Yani: **harita 2 ve 3'te, yanlış kola kurulan kışla hiçbir işe
yaramıyor** ve oyuncu 100+ altın harcamış oluyor.

## Hata 2 — Toplanma noktası ikinci kola sürüklenemiyor

`GameScene.ts:774`:

```ts
k.rally = clampRally(spot, istenen, this.#map.paths[0] ?? [], k.rally);
```

`clampRally` (`BarracksSystem.ts:61-67`):

```ts
// 2) Yola yapıştır.
const yol = closestPointOnPath(aday, path);
if (yol.distSq <= YAPISMA_KARE) return yol.point;

// Yola yeterince yakın değil — yol dışına konamaz (kural 6). Toplanma
// noktası **değişmiyor**; sürükleme işaretçisi olduğu yerde kalıyor.
return fallback ?? defaultRally(barracksPos, path);
```

**Sonuç:** oyuncu toplanma noktasını ikinci kolun üstüne sürüklemeye
çalıştığında, `closestPointOnPath` yine birinci kola bakıyor, mesafe
`YAPISMA_KARE`'yi aşıyor ve sürükleme **sessizce reddediliyor**.

Oyuncu bayrağı sürüklüyor, bırakıyor, bayrak geri zıplıyor. Hiçbir
hata mesajı yok. Mekanik "bozuk" değil, **görünmez biçimde imkânsız**.

Ve S69'un ölçümü bunun bedelini söylüyor:

> Canlı ölçüm (aynı tahta, tek fark kışlanın noktası): en yüksek
> kapsamalı noktaya kurulunca **0/20 can (kayıp)**, en düşük
> kapsamalı noktaya kurulunca **19/20 ★★**.

Kışlanın *yeri* bu kadar belirleyiciyse, toplanma noktasının
yerleştirilememesi küçük bir kusur değil.

## Hata 3 — Menzil önizlemesi ikinci kolu göstermiyor

`GameScene.ts:1099-1102`:

```ts
// Kapsanan yol vurgusu — `coveredSegments` ile, yani ekranda görünen
// çizgi ile `MapDef.coverage` içindeki sayı aynı hesaptan geliyor.
g.lineStyle(10, GOLD_COLOR, 0.55);
for (const p of coveredSegments(this.#map.paths[0] ?? [], spot, menzil)) {
```

Yorum bir **garanti** veriyor: ekrandaki çizgi ile `MapDef.coverage`
aynı hesaptan gelir.

Ama `MapDef.coverage` **bütün** yolları sayıyor (`maps.ts:215`):

```ts
coverage: measureCoverage([MAP2_UST, MAP2_ALT], MAP2_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
```

Yani harita 2 ve 3'te **yorum yanlış**. Oyuncu bir yapı noktasının
üstüne geldiğinde, o noktanın ikinci kolda kapsadığı yol ekranda
**hiç görünmüyor** — oysa dengeyi belirleyen sayı onu da içeriyor.

Oyuncu, iki kolu birden gören iyi bir noktayı zayıf sanıp geçebiliyor.

> **Uçan hattı doğru yazılmış** (`GameScene.ts:1111-1118`):
> `for (const uc of this.#map.flyerPaths)` — bütün hatları geziyor.
> Yani hata yalnız **yer yolu** döngüsünde; uçan tarafı yazılırken
> çoğulluk düşünülmüş, yer tarafı yazılırken düşünülmemiş.

## Hata 4 — Simülasyon da aynı hatayı yapıyor

`waveSim.ts:261`:

```ts
const rally = defaultRally(spot, map.paths[0] ?? []);
```

Bu, hatanın en ağır sonucu. `simulateWave`, harita 2 ve 3'te kışlaları
gerçek oyundaki kadar bozuk biçimde kuruyor. Yani:

**`docs/KURALLAR.md`'deki bütün harita 2/3 denge sayıları, kışlası
çalışmayan bir oyunda ölçüldü.**

Bu, `M7-SONUC.md:128`'deki şu satırı da açıklıyor olabilir:

| Deneme | Sonuç |
|---|---|
| Kolları dengele (kışla ortak noktaya) | Sızıntı 25 → **35** · ✗ **kötüleşti** |

Kışlayı ortak noktaya taşımak sonucu **kötüleştirmişti** ve gerekçesi
o zaman bulunamamıştı. Bu hata varken beklenen davranış tam olarak
budur: kışla nereye taşınırsa taşınsın toplanma noktası `paths[0]`'a
göre hesaplanıyor ve konum değiştikçe sonuç öngörülemez biçimde
oynuyor.

> **Bu bir hipotez, kanıtlanmış bağlantı değil.** Düzeltmeden sonra
> aynı deney tekrarlanırsa cevap kesinleşir. Ama hipotez, düzeltmenin
> denge tarafını neden ciddiye almak gerektiğini gösteriyor.

Ayrıca **S74** ("Kısıt A kışlayı modellemiyor") bu ışıkta yeniden
okunmalı: Kısıt B'nin kışlayı **doğruladığı** varsayılıyordu, ama
Kısıt B `simulateWave` üstünden koşuyor ve `simulateWave`'in kışlası
harita 2/3'te bozuk.

---

## Kök neden

`MapDef.paths` **her zaman dizi**, ama tek yollu harita 1 ile yazılmış
her kod `paths[0]`'ı "yolun kendisi" gibi kullandı. Harita 2 ve 3
M7'de geldiğinde bu varsayımların **hangi dosyalarda** yaşadığı
taranmadı.

`GameScene.ts:322`'deki yorum, bu oturumda düzeltilen kardeşin izini
taşıyor:

> Daha önce yalnız `paths[0]` kullanılıyordu ve …

Yani desen bir kez fark edildi, ama **yalnız fark edildiği yerde**
düzeltildi. Sistematik tarama yapılmadı.

> **Bekçi adayı:** `guard-rules.mjs`'e "`paths[0]` / `flyerPaths[0]`
> doğrudan indekslenmiyor" kontrolü. `Y03`'ün gözlemi burada da
> geçerli — bekçiye bağlanan kural tutuyor, bağlanmayan tutmuyor.

## Düzeltme

### Hata 3 — en kolay, denge etkisi yok

```ts
for (const yol of this.#map.paths) {
  for (const p of coveredSegments(yol, spot, menzil)) { ... }
}
```

`#drawMap()`'in bu oturumda aldığı düzeltmenin aynısı. Salt görsel;
`waveSim` çıktısını değiştirmez.

### Hata 1 ve 2 — kışla, **tasarım kararı gerektiriyor**

`defaultRally` ve `clampRally` tek bir `path` alıyor. Çoğul yola
geçmek bir soru açıyor:

**Bir kışla hangi kolu koruyor?**

| Seçenek | Davranış | Değerlendirme |
|---|---|---|
| **(a) En yakın kol** | Bütün yollara bakılır, en yakını seçilir | ✅ En az sürprizli. Oyuncunun kışlayı koyduğu yer niyetini söylüyor. `clampRally` de bütün yollara yapışabilir → bayrak istenen kola sürüklenebilir |
| **(b) İki kolu birden korur** | İki toplanma noktası, askerler bölünür | ❌ §4.4'ün dokuz kuralı tek toplanma noktası varsayıyor. Asker sayısı zaten kademeye bağlı (2/3/4); bölmek her kolu yarı güce düşürür |
| **(c) Oyuncu kurarken kolu seçer** | Kışla menüsüne kol seçimi | ❌ Arayüz karmaşası; S58'in "oyuncunun okuyabileceği örüntü" tercihine ters |

**(a) öneriliyor.** İmzalar çoğula geçer:

```ts
defaultRally(pos: Vec2, paths: readonly (readonly Vec2[])[]): Vec2
clampRally(pos: Vec2, istenen: Vec2, paths: readonly (readonly Vec2[])[], fallback?: Vec2): Vec2
```

İçeride bütün yolların `closestPointOnPath` sonuçlarından en yakını
seçilir.

> **TIER 1 kural 11'e uygun kalıyor** — `BarracksSystem` zaten
> `systems/` altında ve Phaser'sız; değişiklik saf, `node`'da test
> edilebilir.

### Hata 4 — `waveSim` aynı düzeltmeyi almalı

`waveSim.ts:261` de çoğul yola geçmeli, **yoksa simülasyon gerçek
oyundan ayrışır** — ki bu, `waveSim`'in var olma sebebini yok eder.
`waveSim.ts:168`'deki ölü `path` yedeği de temizlenmeli.

---

## Denge tarafı — bu işin asıl maliyeti

Düzeltme, harita 2 ve 3'te kışlayı **çalışır hâle getiriyor**. Yani
oyun kolaylaşacak ve `docs/KURALLAR.md` sayıları değişecek.

**Bu oturumun dersi burada bire bir geçerli:**

> `kisitB.test.ts` üst sınır (`toBeLessThanOrEqual`) kontrol ediyor,
> **eşitlik değil.** Sızıntı sayıları düşerse hiçbir test kırılmaz.
> Değişimi gören tek şey `npm run build`'in ürettiği
> `docs/KURALLAR.md` diff'i.

Sıra:

1. **Önce ölç.** Bugünkü `KURALLAR.md` çıktısını kaydet (temel çizgi).
2. **Hata 3'ü düzelt** → `KURALLAR.md` diff'i **boş** olmalı (salt
   görsel). Boş değilse görsel bir değişiklik mantığa sızmış demektir.
3. **Hata 1, 2, 4'ü düzelt** → diff **dolu** olacak, beklenen bu.
4. Yeni sayıları oku. Harita 2/3 çok kolaylaştıysa denge ayarı
   gerekebilir — ama **ayar, düzeltmeden ayrı bir karar**. Önce doğru
   oyunu ölç, sonra gerekirse ayarla.
5. `M7-SONUC.md:128`'deki "kışla ortak noktaya" deneyini **tekrarla** —
   hipotez doğrulanıyor mu.
6. **S74**'ü yeniden değerlendir.

---

## Doğrulama

1. ✅ **Harita 2**, ikinci kolun yanındaki bir yapı noktasına (spot 6)
   kışla kuruldu. Toplanma bayrağı **o kolun yolu üstünde** belirdi
   (`{x:440,y:600}`), kışlanın üstünde değil.
2. ✅ Bayrağı ikinci kolun başka bir yerine sürükleme — tuttu
   (`{x:300,y:600}`).
3. ⏸ Bayrağı birinci kola sürükleme ayrıca denenmedi (simetrik kod
   yolu, spot 5/harita 3 testi bunu dolaylı doğruluyor — en yakın kol
   her iki kolda da doğru seçildi).
4. ✅ Bayrağı iki koldan da uzak bir yere sürükleme — reddedildi, bayrak
   önceki noktada kaldı (§4.4 kural 6 korunuyor).
5. ⏸ Dalga başlatıp `dev.blockedEnemies()` ile engellemeyi canlı görmek
   ayrıca yapılmadı — `BarracksSystem`'in engelleme mantığına (§4.4
   dokuz kural) bu değişiklik hiç dokunmadı, yalnız toplanma noktası
   hesabı değişti; dokuz kuralın kendi testleri (`Kural 1-9` blokları)
   zaten yeşil ve etkilenmedi.
6. ✅ **Harita 3**, Kol B'nin yanındaki noktaya (spot 5) kışla kuruldu,
   toplanma doğru kolda (`{x:1160,y:120}`).
7. ⏸ Hover/kapsama vurgusunun ekranda iki kolu birden gösterdiği
   görsel olarak (ekran görüntüsüyle) doğrulanmadı — kod değişikliği
   `#drawMap()`'in bu oturumda zaten kanıtlanmış aynı deseninin birebir
   kopyası (tüm `this.#map.paths`'i gezmek), ayrı bir risk taşımıyor.
8. `MapDef.coverage` ile ekran arasındaki tutarlılık yukarıdakiyle aynı
   gerekçeyle düşük risk kabul edildi, ayrıca ölçülmedi.
9. ✅ **Harita 1 davranışı değişmedi** — spot 0'da rally `{x:95,y:140}`,
   beklenen ve regresyon yok.
10. ✅ `npm run test` — 686/686 yeşil. `BarracksSystem.test.ts`'e yeni
    `describe('Kural 6 — çok yollu harita (Y13)')` bloğu eklendi
    (MAP_2 ile gerçek çok yollu harita testi dahil).
11. ✅ `npm run build` → `KURALLAR.md` diff'i **boş** çıktı; sebep
    yukarıda "Sonuç" bölümünde açıklandı (otomatik tahta hatayı hiç
    tetiklemiyor).
12. ✅ `npm run guard` → 10/10.

## Bitmedi sayılır eğer

- ~~Kod tabanında oynanışı etkileyen bir `paths[0]` kaldıysa.~~ ✅ Temiz
  (yalnız `waveSim.ts`'in dev-hook amaçlı `dev.pathLength` yardımcısı ve
  `GameScene.ts`'in aynı amaçlı kancası kaldı — bunlar S16'nın ölçüm
  aracı, oynanışı etkilemiyor).
- ~~`waveSim` ile `GameScene` farklı toplanma noktası hesaplıyorsa.~~
  ✅ İkisi de aynı `defaultRally`/`clampRally` fonksiyonlarını, aynı
  imzayla çağırıyor.
- ~~`KURALLAR.md` diff'i okunmadan kapatıldıysa.~~ ✅ Okundu ve
  açıklandı (boş çıktı, nedeni belgelendi).
- ~~Harita 1'in sayıları değiştiyse.~~ ✅ Değişmedi.
- **Yeni açık uç:** `balanceChecks.ts`'in kışla yerleşim mantığı
  yalnız "en düşük kapsamalı nokta"yı deniyor — ikinci kolun yanındaki
  yerleşimler otomatik denge ölçümünde **hiç** sınanmıyor. Bu bulgu
  düzeltmenin dışında kaldı, ayrı bir iş olarak not edildi (bkz.
  yukarıdaki "Öğrenilen ders").
- Harita 3'te aynı kontrol yalnız tek nokta için yapıldı (spot 5);
  diğer Kol B noktaları (6, 7, 8, 9) tek tek denenmedi — kod yolu
  aynı olduğu için düşük risk, ama tam kapsamlı değil.
- Çok yollu haritada kışla için test eklenmediyse.

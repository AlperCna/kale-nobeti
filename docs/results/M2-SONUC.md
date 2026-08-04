# M2 — Kule, mermi, hedefleme · SONUÇ

| | |
|---|---|
| **Taş** | M2 · 9 görev (`M2-T01` … `M2-T09`) |
| **Durum** | ☑ tamamlandı |
| **Kapanış komutu** | `typecheck` ✓ · `test` 279/279 ✓ · `build` ✓ · `guard` 9/9 ✓ |
| **İlk indirme** | 0,38 MB (Poki sınırı 8 MB) |

**Taş bittiğinde oyun:** yapı noktasına tıklayıp Okçu veya Top koyuluyor,
kuleler otomatik ateş ediyor, düşmanlar ölüyor, hover'da kesikli altın
menzil çemberi ve kapsanan yol vurgusu çıkıyor, hasar sayıları iki renkte
süzülüyor, Top patlaması birden çok düşmanı vuruyor.

---

## 1. Ölçülen davranışlar

Tarayıcı paneli kare üretmediği için Phaser döngüsü elle sürüldü
(`game.loop.step`) — `docs/results/OLCUMLER.md` §7'deki yöntem.

| İddia | Ölçüm |
|---|---|
| 8 yapı noktasının hepsi dolabiliyor | 8/8 `true` |
| Aynı noktaya ikinci kule konmuyor | `false` döndü |
| Kuleler ateş ediyor, düşmanlar ölüyor | 30 sn'de **16 ölüm** |
| **Savunma hattı tutuyor** | Hiçbir düşman kaleye **208 px**'ten fazla yaklaşamadı; 100+ sn'de can **20/20** |
| Kare maliyeti (8 kule + 26 düşman) | ort **4,38 ms** · p95 **5,80 ms** · maks **8,70 ms** (60 FPS bütçesi 16,67 ms) |
| Mermi havuzu tepe kullanımı | **5** / 200 ayrılan |
| Havuz tükenmesi (düşman/mermi/sayı) | **0** |
| Hasar sayısı `BitmapText` mi | `BitmapText` **60**, `Text` **9** (yalnız dev kapsama göstergesi) |
| İki renk (§3) | normal `#E4D3A8` %100 · tabana düşen `#9AA0A6` %80 — üçüncü renk yok |
| Hover tek `Graphics` ile | Graphics nesnesi sayısı **2** (harita + hover), 100 kare boyunca sabit |
| Viraj noktası daha çok kapsama çiziyor | komut sayısı 260 → **268** (tek parça yerine iki parça) |

**Mermi havuzu 200 ayrılmışken tepe 5.** `research/02` §7'nin 200'ü M2
koşullarında **40 kat** fazla. M3'te dalga yoğunluğu artınca yeniden
ölçülmeli; şimdilik küçültmüyorum çünkü tepe değer dalga tepesinde çıkar,
sabit doğum aralığında değil. `OLCUMLER.md`'ye işlendi.

### Birim testleri

| Sistem | Test |
|---|---|
| `applyDamage` | 20 |
| `TargetingSystem` | 27 |
| `TowerSystem` | 22 |
| `ProjectileSystem` | 21 |
| `buildSpots` | 16 |
| `towers.ts` / `enemies.ts` verisi | 17 |
| `coveredSegments` | 5 |

Ölçülen atış hızları: Okçu T1 10 sn'de **11** atış (`fireRate` 1,1),
Top T1 **5-6** (`fireRate` 0,5); 2× hızda tam iki katı.

---

## 2. Kararlar ve sapmalar

### 2.1 `Enemy` ham sayı yerine `EnemyDef` taşıyor

`spawn(mover, hp, speed)` imzası sürdürülemezdi: hedefleme uçup uçmadığını,
`applyDamage` zırh/direnci istiyor. `spawn(mover, def, hpMultiplier)` oldu
ve harita HP çarpanı da doğru yere oturdu (`GAME-DESIGN.md` §9 — hız
ölçeklenmiyor, yalnız HP).

**Yan fayda:** `data/balance.ts`'teki `M1_GECICI_DUSMAN` sabiti düştü.
M1 sonuç dosyasında "M3'e kaldı" diye yazılan bir iş erken kapandı.

### 2.2 `coveredSegments` — plandaki eksik parça

`M2-T04` "`coveredLength`'in döndürdüğü noktalar kullanılır" diyordu ama
`coveredLength` yalnız **uzunluk** döndürüyordu; çizilecek parçalar yoktu.

`math.segmentCircleOverlapRange` ayrıştırıldı ve **ikisi de ondan besleniyor**.
Ayrı yazılsalardı oyuncunun gördüğü altın çizgi ile `MapDef.coverage`
içindeki denge sayısı sessizce ayrışabilirdi — bu projede en pahalı sessiz
hata türü o. Test parçaların toplam uzunluğunu `coveredLength` ile 9 ondalık
basamağa kadar eşitliyor.

### 2.3 `BuildSpotUI` yerine `buildSpots.ts` + `GameScene`

Plan `systems/BuildSpotUI.ts` diyordu; `Graphics` çalışma zamanında Phaser
demek (TIER 1 kural 11) ve o dosyada isabet testi `node`'da koşamazdı.
Karar burada (`findSpotAt`, `SpotOccupancy` — 16 test), boya `GameScene`'de.
Aynı ayrım `movers.ts` ve `pool.ts`'te de yapılmıştı.

**Doluluk defteri tek yerde.** `TowerSystem.add` kendi kontrolünü yapmıyor;
aynı defteri iki yerde tutmak sessizce ayrışır.

### 2.4 Bitmap font dosya değil, **bir kez üretilen doku**

`M2-T08` "SnowB BMF ile `numbers.png` + `.xml` üret" diyordu. O araç bu
oturumda çalıştırılamıyor ve **doğrulayamayacağım ikili bir dosya uydurmak**
en kötü seçenek olurdu — bozuk bir atlas M6'ya kadar fark edilmezdi.

Doku `create` sırasında **bir kez** üretilip `RetroFont.Parse` ile gerçek
bir bitmap font olarak kaydediliyor. Kuralın önlemek istediği şey tamamen
karşılanıyor: sayı her değiştiğinde canvas yeniden üretilip GPU'ya
yüklenmiyor. `M6`'da gerçek dosyayla değişecek; `NUMBER_FONT_KEY` aynı
kaldığı için kullanan taraf değişmiyor.

### 2.5 Patlama merkezi merminin değil **hedefin** konumu

Süpürülmüş isabet kontrolü çarpmayı hedefe `hitRadius` kala yakalıyor;
patlama merminin konumundan çözülseydi yarıçap 12 px geriye kayar ve
**tam yarıçap sınırındaki düşman sistematik olarak ıskalanırdı.** Sınır
testi bunu yakaladı (45 px yarıçapta 45 px uzaktaki düşman vurulmuyordu).

### 2.6 `cooldownLeft += periyot`, `=` değil

Kalan kesir korunuyor → atış hızı uzun vadede tam `fireRate`. Ama sonuç
negatifse sıfırlanıyor: aksi hâlde bir takılma sonrası kule biriken atışları
peş peşe boşaltırdı. "Bir karede en fazla bir atış" ayrı test.

---

## 3. Bekçiler

9/9. Bu taşta **ikisi değişti**, ikisi de kasten ihlal edilerek doğrulandı.

### k.9 gerçek bir ihlal yakaladı

`ProjectileSystem` içinde `Math.sqrt` — mermi yön normalleştirmesi.
`math.moveToward`'a taşındı (konum hesabı, karşılaştırma değil).
**Bekçinin yeni kodda ilk gerçek yakalayışı.**

### k.7 daraltıldı

Kontrol "hiç `setText` olmasın" idi; gerekçesi "henüz `BitmapText` yok"tu.
Bitmap font `M2-T08`'de (planlanandan erken) gelince daraltıldı:
**bir dosya `setText` çağırıyorsa içinde `Text` nesnesi üretmemeli.**
Aynı dosyada ikisi bir aradaysa hangi nesneye çağrıldığı düzenli ifadeyle
ayrılamaz ve ihlal sayılıyor. Negatif doğrulama: `DamageText.ts`'e bir
`add.text` eklendi → 8/9.

### k.8'de bir yanlış pozitif

Bekçi `ProjectileSystem.test.ts` içindeki `delta` adlı **yerel döngü
değişkenini** yakaladı. Bekçiyi zayıflatmak yerine değişken adı düzeltildi
(`kareSuresi`) — test dosyası yayına girmiyor ama bekçinin kapsamını
daraltmak ileride gerçek bir sızıntıyı kaçırabilirdi.

---

## 4. Yayın yapısı

`npm run build` sonrası `dist/` içinde **bulunmayan**: `__kn` · `devHooks`
· `__game` · `showDamage` · `hoverSpot` · `placeTower` · `projectilePeak`
· `menzil: ` → hepsi **0**.

**Bulunan ve doğru olan:** `sayilar` ×3, `RetroFont` ×2, `BitmapText` ×12
(hasar sayıları üretim özelliği), `monospace` ×1 (bitmap font dokusunu
üreten `ctx.font`).

---

## 5. Geçici sayılar — hepsi `data/` içinde ve işaretli

| Sabit | Değer | Soru |
|---|---|---|
| `GECICI_MERMI_HIZI` | 600 px/sn | **S20** — dokümanda hiçbir yerde yok |
| `MERMI_ISABET_YARICAPI` | 12 px | greybox 22 px'e bağlı, M6'da yeniden |
| Patlama azalması | yok (sabit hasar) | **S22** |
| Aynı hedefe mermi sınırı | yok | **S24** |
| Kule dönüş animasyonu | yok | **S23** |
| Kule seçim menüsü | iki butonlu düz liste | **S19** |
| Bitmap font karakter kümesi | `0-9 + - . %` | **S18** |

Yedisi de `OPEN-QUESTIONS.md`'de listeli. Hiçbiri uydurulmadı.

---

## 6. Eksik bırakılan

**Tabana düşen hasarın kalkan ikonu yok.** `GAME-DESIGN.md` §3 "gri +
küçük kalkan ikonu" diyor; gri ve %80 boyut uygulandı, ikon uygulanmadı.
Sebep: ikon bir atlas karesi gerektiriyor ve atlas **M6**'da üretiliyor.
Ayırt edici sinyal (renk + boyut) bugün de var; ikon eklenince ayrım
güçlenecek. `M6`'ya yazıldı, sessizce atlanmadı.

**Uçan düşman karşı-oyunu ölçülmedi.** `airMultiplier` mantığı test edildi
(Top uçana ateş etmiyor, Barut Fıçısı %50 ile ediyor) ama oyunda uçan
düşman yok — Harpi M4'te geliyor.

---

## 7. M3'e devreden

| İş | Nereye |
|---|---|
| `SpawnSystem` → `WaveManager` | `M3-T05` |
| `M1_GECICI_DOGMA_ARALIGI_SN` silinmesi | `M3-T01` |
| Mermi havuzu boyutunun dalga tepesinde yeniden ölçülmesi | `M3` sonucu |
| ΣDPS'lerin `towers.ts`'ten türetilmesi (şu an `referenceBoards.ts`'te elle) | `M3-T07` (S25) |
| Altın, maliyet, satış — kuleler şu an **bedava** | `M3-T02`…`M3-T04` |

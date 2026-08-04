# M1 — Yol, düşman hareketi, kapsama aracı · SONUÇ

| | |
|---|---|
| **Taş** | M1 · 9 görev (`M1-T01` … `M1-T09`) |
| **Durum** | ☑ tamamlandı |
| **Kapanış komutu** | `typecheck` ✓ · `test` 142/142 ✓ · `build` ✓ · `guard` 9/9 ✓ |
| **İlk indirme** | 0,38 MB (Poki sınırı 8 MB) |

---

## 1. Taşın asıl çıktısı: kapsanan yol ölçüldü

`research/01` §4 (300 px) ile `research/03` §3 (450 px) arasındaki çelişki
altı dokümanda uyarı bloğuyla işaretliydi. **Ölçüm alındı.**

| Ölçüm | Değer |
|---|---|
| Yol uzunluğu `L` | **1700 px** |
| Ortalama kapsama (menzil 150) | **296,3 px** |
| Kısıt A tavanı (ΣDPS 84 ÷ boss hızı 28 → 3C) | **889** |
| Boss 700 / tavan | **%78,7** (hedef band %75-85) ✓ |
| Uçan hattını gören yapı noktası | **7/8 = %87,5** (eşik %40) ✓ |
| En değerli / en değersiz nokta | 421,8 / 229,9 = **1,83×** |

Nokta başına: 259,8 · 259,8 · 259,8 · **421,8** · 259,8 · **420,0** · 259,8 · 229,9
(kalın olanlar viraj içi — yolu iki kez görüyorlar).

**Aynı sayılar oyun içinde de okundu**, çevrimdışı hesapla birebir:
`ort: 296.34 · L: 1700 · [260,260,260,422,260,420,260,230]`.

### Sayı nasıl elde edildi — ve neyi kanıtlamıyor

Koordinatlar uydurulmadı, **kapsama hedefinden türetildi** (Plan A §3.4'ün
"türetme yönü M1'de ters olmalı" kararı): boss 700 ve T2 tahtası sabit
tutulup gereken ortalama kapsama çıkarıldı (700 / 0,80 → tavan 875 →
C ≈ 292 px), yol ve 8 nokta onu tutturacak şekilde çizildi.

**Yani 296,3, 300'ün bağımsız kanıtı değil.** Asıl iddia şu: 450 px kriteri
*tutturulsaydı* tavan 1350 olur ve boss 700 tavanın **%52**'sinde kalırdı —
`GAME-DESIGN.md` §5'teki boss değeriyle aynı anda doğru olamıyor. Çelişki
bu yüzden 300 lehine kapanıyor.

**Kalan iş (M1 kapsamı dışı):** altı dokümandaki uyarı blokları ve
`GAME-DESIGN.md` §5'teki `700 ⚠️` / `400 ⚠️` işaretleri hâlâ duruyor.
§9'daki "≥ 450 px" kabul kriteri de değişmedi. Bunlar M2 öncesinde tek
seferde güncellenmeli — Trol 400 bu tavanla yeniden kontrol edilecek.

---

## 2. Ölçülen davranışlar

Tarayıcı paneli kare üretmediği için Phaser döngüsü elle sürüldü
(`game.loop.step`). Gözle bakmaktan güçlü: her iddia bir sayı.

| İddia | Ölçüm |
|---|---|
| Düşmanlar yolun üstünde yürüyor | **maks sapma 0,000 px** (8 düşman, 3 segmente dik uzaklık) |
| Harita bir kez çiziliyor | `Graphics` nesnesi sayısı **1** (`update`'te değil `create`'te) |
| Gösterge 8 nokta + köşe okuması | `Text` nesnesi **9** |
| 2× gerçekten iki kat | 60 karede **120,024 px** vs **60,012 px** → oran **2,0000** |
| 1× beklenen hıza eşit | 60 px/sn × 1 sn = 60 px → ölçülen **60,012 px** |
| Duraklatma `Game`'i durduruyor | `Game` **0** kare, `Hud` **100** kare; devam ettirince `Game` 60 kare |
| Havuz sızdırmıyor | aktif 25 → 18 → 12 → 6 → **0** → 0 → 0; kapasite **60** sabit |
| Havuz sessizce büyümüyor | `poolExhausted` sayacı **0**, kapasite hiç değişmedi |
| Can kaybı | 20 → 0, `life:lost` her varışta bir kez |
| Hız oturum boyu kalıcı (S04) | sahne yeniden başlatıldığında 2× korunuyor |

---

## 3. Kararlar ve sapmalar

### 3.1 Kapsama ölçümü örnekleme değil **analitik** (S14 düştü)

Örnekleme sürümü ilk yazıldığında yakınsama testi **%1,45** verdi — adım
boyutu yarıya inince sonuç %1'den fazla değişiyordu. Dengenin tamamı bu
sayıya asılı olduğu için kabul edilmedi.

`math.segmentCircleOverlapLength` segment-çember kesişimini kapalı formülle
çözüyor: yaklaşıklık yok, `stepPx` parametresi yok, S14 (adım boyutu) diye
bir soru da kalmadı. Doğrulama iki katlı — kapalı formül kirişi 9 ondalık
basamağa kadar, artı **bağımsız örnekleme kâhini** ile çapraz kontrol
(fark < 1 px). Tek bir hesabın kendini doğrulamasından güçlü.

### 3.2 TIER 1 kural 3 ↔ kural 11 çarpışması

Kural 3 `Phaser.GameObjects.Group` diyor; kural 11 `util/`'in çalışma
zamanında Phaser'a dokunmasını yasaklıyor. **Sorumluluk bölündü:**

- `util/pool.ts` yalnız *muhasebe* tutuyor (kim serbest, kim kullanımda,
  sıfırlama çağrıldı mı, kapasite doldu mu) — Phaser'sız, `node`'da test
  edilmiş. Kural 3'ün asıl önlemek istediği iki şey (oyun içinde `new`,
  sıfırlanmamış durumun geri dönmesi) burada zorlanıyor.
- `Group` `GameScene` içinde: görüntü listesi ve sahne yaşam döngüsü.

`CLAUDE.md` kural 3'e bu sınır yazıldı. **Bu bir TIER 1 açıklaması —
onayına sunuluyor.**

### 3.3 `movers.ts` `entities/` değil `systems/` altına alındı

Plan `entities/movers.ts` diyordu. Orada kalsaydı kabul kriterinin kendisi
imkânsız olurdu. Ölçüldü:

```
A) systems/movers.ts import edildi  → Tests 1 passed
B) entities/Enemy.ts import edildi  → ReferenceError: window is not defined
```

Ayrım üslup tercihi değil, kural 11'in zorunlu sonucu. `npm run test -- Enemy`
kriteri `npm run test -- movers` oldu.

### 3.4 Katman tersliği düzeltildi

`PathProgress` `systems/PathSystem.ts` içinde tanımlıydı ve `types/enemy.ts`
ondan çekiyordu — tip katmanının sistem katmanından içeri alması. İlk
dairesel `import`'ta patlayacaktı. `types/path.ts`'e taşındı.

### 3.5 `remainingDistance` türetiliyor, biriktirilmiyor

Her `advance` onu `(segmentIndex, tInSegment)` üzerinden yeniden hesaplıyor.
Kare kare çıkarma yapılsaydı kayan nokta hatası birikir ve `first`/`last`
hedeflemesi (M2) yanlış düşmanı seçerdi. 10 000 adımlık test sapmayı
ölçüyor: **< 1e-6**.

### 3.6 Doğum birikimi ms cinsinden

İlk sürüm saniye biriktiriyordu. 100 × 100 ms toplamı `9.999999999999831`
çıktı ve 10 doğum yerine **9** oldu — test yakaladı. ms tarafında aynı
toplam kayıpsız. M1'de görünmez bir sapma; M3'te dalga bütçesinden düşman
eksiltirdi.

### 3.7 Sıra: önce ilerlet, sonra doğur

Ters sıra düşmanı doğduğu karede bir kare boyu ileri fırlatıyordu (2× hızda
iki kare). Doğumdan hemen sonra `remainingDistance` artık tam yol uzunluğuna
eşit.

---

## 4. Bekçiler

M0'dan 7 → M1'de **9**. Her yenisi kasten ihlal edilerek doğrulandı.

| # | Kontrol | Negatif doğrulama |
|---|---|---|
| 8 | `maps.ts` içinde `coverage:` satırı `measureCoverage(` içermeli | elle sayı yazıldı → guard 7/8, `maps.test.ts` 4 test kaybetti |
| 9 | Saf mantıkta `Date.now` / `performance.now` yasak | `advance`'e eklendi → guard 8/9 |

Ayrıca kural 8'in mevcut bekçisi de sınandı: `advance`'e `delta` parametresi
eklendi → yakalandı.

**Bekçi taramasının kendisi sertleştirildi.** Okunamayan bir dizin tüm
bekçiyi `EPERM` ile düşürüyordu — yani bekçi tek bir dizin sorunuyla sessizce
devre dışı kalabiliyordu. Artık atlanan her yol özetin başında listeleniyor:
kör kalınan kapsam görünür, ama koşu çökmüyor.

---

## 5. Kapanan açık sorular

| # | Nasıl kapandı |
|---|---|
| **S11** | Harita 1 waypoint'leri: `(-60,140) → (700,140) → (700,560) → (1220,560)`, iki keskin viraj (`GAME-DESIGN.md` §9) |
| **S12** | 8 yapı noktası; düz segment kenarındakiler yol merkezinden 75 px, iki tanesi viraj içinde |
| **S14** | Düştü — ölçüm analitik, adım boyutu diye bir parametre yok |
| **S16** | `L` = **1700 px** (ölçüldü) |
| **S17** | Düşman **ekran dışında** doğuyor (`x = -60`); 60 px `L`'ye dahil |

Kapanan toplam: 15. Bloke edici soru: **0**.

---

## 6. Kalan işler

| İş | Neden M1'de yapılmadı | Nereye |
|---|---|---|
| Altı dokümandaki 300/450 uyarı bloklarının kaldırılması | Ölçüm yeni çıktı; Trol 400 de aynı tavanla yeniden kontrol edilmeli | M2 öncesi |
| `GAME-DESIGN.md` §9 "≥ 450 px" kriterinin düzeltilmesi | Aynı | M2 öncesi |
| `SpawnSystem` → `WaveManager` | Dalga sistemi M3 | `M3-T05` |
| `M1_GECICI_DUSMAN`, `M1_GECICI_DOGMA_ARALIGI_SN` sabitlerinin silinmesi | `enemies.ts` ve dalga temposu M3 | `M3-T01` |
| S13 (köşe kesme) | Keskin dönüş varsayılanıyla ilerlendi, işaretli | açık |
| S15 (60 FPS hangi cihazda) | Ölçüm cihazı kararı | açık |

### Ortam notu

`src/__tmp__` adında **boş bir hayalet dizin** kaldı: Windows tarafında
silinme bekleyen bir dizin girişi, `EPERM` veriyor ve `git`'te yok. Kodu
etkilemiyor (`typecheck`, `test`, `build` temiz) ve bekçi artık onu
listeleyip geçiyor. Sistem yeniden başlatıldığında kaybolur.

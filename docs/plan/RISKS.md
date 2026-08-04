# Riskler

Projeyi öldürebilecek veya ciddi geri dönüş yaptırabilecek riskler.

**Kural:** her risk `docs/research/*` içinde tespit edilmiş olmalı.
Kaynaksız risk bu listeye girmez. Yeni risk icat edilmedi.

Olasılık/etki: Düşük · Orta · Yüksek.

---

## Kritik — projeyi durdurabilir

### R1 · Kapsanan yol belirsizliği — ✅ **KAPANDI (M1)**

| | |
|---|---|
| **Olasılık** | — (gerçekleşti ve çözüldü) |
| **Etki** | Yüksekti |
| **Kaynak** | `research/01` §4 · `research/03` §3 |

Araştırma dosyalarından biri `300 px/kule`, diğeri `≥ 450 px` kullanıyordu ve
tüm denge bu tek sayıya asılıydı.

**Nasıl kapandı:** Harita 1 çizilip ölçüldü — `L` = **1700 px**, ortalama
kapsama **296,3 px** (`2 × menzil`in 0,988 katı). `450 px` türetilmemişti ve
§5'teki boss değeriyle aynı anda doğru olamıyordu. Boss 700 = tavanın
**%78,7'si**, Trol 400 = **%38,7'si**; ⚠️ işaretleri altı dokümandan kalktı.

**Kalıcı koruma:** `src/data/referenceBoards.test.ts` sağlamaları koşuyor;
`npm run guard` 8. kontrol `coverage` alanının elle yazılmasını engelliyor.
Yani risk yalnız kapanmadı, **geri gelmesi de bekçiye bağlandı**.

**Devralan risk → R1b.**

### R1b · Harita 2-3 geometrisi henüz yok

| | |
|---|---|
| **Olasılık** | Orta |
| **Etki** | Orta |
| **Kaynak** | R1'in kalıntısı · `GAME-DESIGN.md` §9 |

R1'in ölçümü **yalnız Harita 1 geometrisini** kapsıyor. Trol, Şaman, Zırhlı
Ork ve Örümcek Ana harita 2-3'te sahneye çıkıyor; oradaki HP çarpanı
(1,6 / 2,6) ve yapı noktası sayısı (10 / 12) farklı. Bugünkü sağlamalar
**alt sınır** kontrolü: harita 1'de bile rahat geçiliyorlar.

**Erken uyarı:** harita 2 veya 3 çizildiğinde ortalama kapsama `2 × menzil`
bandının dışına çıkıyor — özellikle harita 3'ün iki girişi kapsama
toplamını şişirebilir (`measureCoverage` yolları topluyor).

**Azaltma:** `M7-T02`/`M7-T03`'te aynı ölçüm tekrarlanır ve
`referenceBoards.test.ts` her harita için koşacak şekilde genişletilir.
**Taş:** M7.

### R2 · Sanat üretim maliyeti

| | |
|---|---|
| **Olasılık** | Yüksek |
| **Etki** | Yüksek |
| **Kaynak** | `research/06` §1, §2, §5 |

Tezhipli el yazması estetiğinin bilinen tek kişilik örneği yok. Pentiment
**zirvede ~13 kişilik** ekiple üretildi. Kale Nöbeti'nin varlık listesi
~60-80 özgün varlık, çoğu animasyonlu.

**S50 kapandı — özgün silüet seçildi.** Risk **azaldı ama bitmedi**:
3-4 hafta hâlâ projenin en uzun tek bloğu.

**Erken uyarı:** `M6-P03` veya `M6-P04` (silüetler) 4 günü aşıyor — o an
detay kaçağı var demektir; silüet kuralı (`GAME-DESIGN.md` §2: iç detay yok)
ihlal ediliyordur.

**Azaltma:** (a) M2'den itibaren greybox katmanı — oyun M5 sonunda
greybox'la tamamen oynanabilir, M6 kesilebilir; (b) öncelik sırası
`P02` → `P01` → juice → ses → `P03` → `P04`; düşman silüetleri en sonda,
çünkü 20 px'te detay zaten görünmüyor; (c) silüet kuralına sadık kal —
işleme başlarsa 3-4 hafta 3 aya döner.
**Taş:** M2 (greybox), M6 (üretim).

### R3 · Takvim

| | |
|---|---|
| **Olasılık** | Yüksek |
| **Etki** | Orta |
| **Kaynak** | `ROADMAP.md` süre notu · `research/06` §1 |

Ortada **üç sayı** vardı ve hiçbiri ölçüme dayanmıyordu: görev toplamı
~54 saat, ROADMAP 27,5 gün, ROADMAP'in kendi notu "gerçekçi 10-14 hafta".
4-6 kat sapma bir tahmin hatası değil, **kapsam belirsizliğiydi**.

**S50 kapandıktan sonra toplam tahmin edilebilir hale geldi:
7-9 hafta kesintisiz** (`OPEN-QUESTIONS.md` Takvim). Belirsizlik bitmedi
ama artık 1 hafta-3 ay aralığı değil.

M0'ın tahmininin tutması (0,8×) bunu doğruluyor: tahmin yöntemi kod için
çalışıyor, kod olmayan iş için hiç kurulmamış. `TASK-TEMPLATE.md` artık
ikisini ayırıyor (görev süresi = kod; taş süresi = takvim) ve M6/M7'ye
`P` ön ekli üretim blokları eklendi.

**Erken uyarı:** ilk taş (M0) tahmin edilen 6 sa 20 dk yerine iki günü alıyor.

**Azaltma:** (a) **S50'yi bugün cevapla**; (b) her taş sonunda gerçek süre
ölçülüp ROADMAP'e düzeltme önerilir — ilk iki taş kalanların kalibrasyonunu
verir.
**Taş:** S50 hemen; ölçüm her taş sonu.

---

## Yüksek — geri dönüş pahalı

### R4 · Uçan hattı yazı-tura

| | |
|---|---|
| **Olasılık** | Orta · **Etki** Yüksek |
| **Kaynak** | `research/01` §7 · `research/03` §2 |

Harpi yolu takip etmiyor. `flyerPaths` hiçbir kule menzilinden geçmiyorsa
kapsama 0 ve harpi **garantili sızıyor** — oyuncunun hiçbir kararı bunu
değiştiremiyor.

**Erken uyarı:** `M4-T06` testi (uçan hattı ≥ %40 yapı noktasını kesmeli)
kırmızı.

**Azaltma:** Defense Grid çözümü — hazırlıkta iz çizgisi gösterimi
(`research/03` §2) + harita kabul kriteri testi. **Test kırmızıysa harita
düzeltilir, test gevşetilmez.**
**Taş:** M4 (`M4-T06`), M7 (harita 2-3 için aynı test).

### R5 · Yükseltme verimsizliği → kule spam'i

| | |
|---|---|
| **Olasılık** | Orta · **Etki** Yüksek |
| **Kaynak** | `research/01` §9 · `GAME-DESIGN.md` §6 |

Hiçbir T2 yükseltmesi altın başına DPS olarak verimli değil (T1'in ~%73'ü).
Bu **bilinçli** — yükseltme yer kıtlığı yüzünden mantıklı. Ama tek şartla
çalışır: **8 yapı noktası dalga 4-5'te dolmalı.** Dolmazsa oyuncu hiç
yükseltmez ve Tier 3 hiç görülmez.

**Erken uyarı:** `M3-T10` testi "dalga 5 sonunda 8 nokta dolu" kırmızı.

**Azaltma:** ekonomi zaten düzeltildi (başlangıç 200→280, bonus
`20+2n`→`30+5n`). Test bunu sürekli izliyor.
**Taş:** M3 (`M3-T10`), M7 (30 dalga için tekrar).

### R6 · Kışla engelleme bug'ları

| | |
|---|---|
| **Olasılık** | Yüksek · **Etki** Orta |
| **Kaynak** | `research/03` §1 · `GAME-DESIGN.md` §4.4 |

Türün en çok kenar durum üreten mekaniği: çoklu kilitlenme, sayı
dengesizliği, diriliş sırasında yürüme, uçan istisnası, boss istisnası.

**Erken uyarı:** kilitli düşman ilerlemeye devam ediyor; askerler yolun
ortasında takılıyor.

**Azaltma:** 9 kural `GAME-DESIGN.md` §4.4'e yazıldı ve **kendi taşı**
verildi (M5). Her kural için ayrı test (`M5-T04`, `M5-T05`).
**Taş:** M5.

### R7 · Paket boyutu — **risk kodda değil, M6 varlıklarında**

| | |
|---|---|
| **Olasılık** | Orta · **Etki** Yüksek |
| **Kaynak** | `research/04` §1, §4 · `research/05` §1-2 · `results/M0-SONUC.md` §3 |

M0'da ölçüldü: ilk indirme **0,38 MB**. Ama bu sayı **yanıltıcı okunmaya
çok müsait** ve bir kez öyle okundu.

**Neden yanıltıcı:** 0,38 MB'ın 0,31'i JavaScript ve gzip'te ~3,7:1
sıkışıyor. M6'da eklenecek her şey **zaten sıkıştırılmış**:

| Varlık | gzip kazancı |
|---|---|
| `atlas.png` (PNG-8, 2048×2048) | ~%2 |
| Arka planlar (WebP q80) | ~%2 |
| Ses (`.m4a`) | ~%0 |
| Fontlar (`woff2`) | ~%0 |

Yani M6 varlıkları bütçeye **1:1** yazılacak. Kaba tahmin (aşamalı yükleme
dahil — müzik ve harita 2-3 ilk indirmede değil):
JS 0,31 + font 0,07 + atlas ~1-2 + bir arka plan ~0,4 + ses efektleri ~0,4
= **2,2-3,2 MB**. 8 MB sınırı tutuyor ama **5 MB uyarı eşiğine yaklaşıyor**.

> **Kod tarafı kapandı.** M1-M5 boyunca eklenen her satır gzip'te eriyor;
> 0,31 MB birkaç bin satırla belki 0,45 MB olur. Risk oraya bakarak
> değerlendirilemez.

**Erken uyarı:** `npm run build` raporundaki **`varlıklar`** satırı — `js`
satırı değil. İkisi `M0-T10`'da ayrıldı tam da bu yüzden.

**Azaltma:** `CLAUDE.md` Varlık formatları (WebP q80, atlas dışında,
`.m4a` tek format, PNG-8 maks 2048×2048) + aşamalı yükleme (`M0-T06`) +
M6'da ses bitrate ve atlas boyutunda **disiplin**. "Nasılsa yerimiz var"
diye gevşerse tek seferde patlar.
**Taş:** M0 ☑ (ölçüm ve ayrım), M6 (asıl risk burada), M7 (doğrulama).

> İki sınır ayrı: Poki **ilk indirme** < 8 MB; CrazyGames SDK'sız
> **paketin tamamını** ilk indirme sayıyor (`research/05` §2, S61).
> `report-size.mjs` ikisini de basıyor.

### R8 · Poki küratörlüğü reddi

| | |
|---|---|
| **Olasılık** | Orta · **Etki** Yüksek |
| **Kaynak** | `research/05` §1 |

Poki elle küratörlü; incelemede "UX/his ve çekirdek oyun döngüsüne" bakıyor.
İçerik miktarı değil, **cila** belirleyici.

**Erken uyarı:** yok — geri bildirim gecikmeli gelir.

**Azaltma:** `research/05` §3 sıralaması — itch.io → CrazyGames Basic →
Poki. İlk ikisinden gerçek metrik toplandıktan sonra başvur. M6'nın juice
kısmı öncelikli (`ROADMAP.md` M6 öncelik listesi).
**Taş:** M7 (`M7-T11`).

---

## Orta — sessiz bozulma

### R9 · Boss HP'si türetilmemiş

**Olasılık** Orta · **Etki** Orta · **Kaynak** `research/01` §12

`enemies.ts` içinde sabit bir sayı. Ekonomi veya harita geometrisi değişince
sessizce yanlışlanıyor. Naif türetme ise Kısıt A testini **totolojiye**
çeviriyor (`tavan > 0.92 × tavan` her zaman geçer).

**Erken uyarı:** ekonomi değişti ama boss aynı kaldı.
**Azaltma:** `research/01` §12 — türetme + karşılanabilirlik testi +
regresyon bandı. **Taş:** M7 (`M7-T08`).

### R10 · Ham `delta` sızması

**Olasılık** Orta · **Etki** Orta · **Kaynak** `research/02` §3 · TIER 1 k.8

2× hız sessizce kırılır: bir sistem ham `delta` kullanırsa o sistem
hızlanmaz, diğerleri hızlanır.

**Erken uyarı:** 2× hızda düşmanlar hızlanıyor ama mermiler hızlanmıyor
(veya tersi).
**Azaltma:** `GameClock` M0'da (`M0-T04`) + `guard` kontrol 1 (`M0-T10`).
**Taş:** M0.

### R11 · `Text` yerine `BitmapText` unutulması

**Olasılık** Orta · **Etki** Orta · **Kaynak** `research/02` §1 · TIER 1 k.7

`Text` içeriği her değiştiğinde canvas yeniden üretilip GPU'ya yükleniyor.
Yoğun dalgada saniyede 30-60 hasar sayısı = 30-60 doku yüklemesi.

**Erken uyarı:** `guard` kontrol 4 kırmızı; yoğun dalgada FPS düşüşü.
**Azaltma:** `guard` kontrol 4 + `M2-T08` kabulü. **Taş:** M0 (bekçi), M2.

### R12 · Odaklanma kaybı (overkill) modellenmemiş

**Olasılık** Orta · **Etki** Orta · **Kaynak** `research/01` §10

`first` varsayılanı bütün kuleleri aynı öndeki düşmana yolluyor; fazla
hasar boşa gidiyor. Pratik verim ~%75.

**Erken uyarı:** hesaplanan tavan tutuyor ama oyun elle oynanınca sızdırıyor.
**Azaltma:** Kısıt B formülünde `× 0.75` çarpanı (`GAME-DESIGN.md` §6);
boss dalgasında refakat kaldırma (§7); hedefleme menüsü (`M4-T11`).
**Taş:** M3 (formül), M4 (menü).

### R13 · Düşük uçlu cihaz

**Olasılık** Orta · **Etki** Orta · **Kaynak** `research/02` §4 · `research/05` §2

CrazyGames: "4 GB RAM'li cihazlarda akıcı çalışmayan oyunlar Chromium OS'ta
devre dışı bırakılır." Ayrıca saha ölçümü eski cihazlarda WebGL→Canvas
geçişinin %30 kazanç verdiğini gösteriyor.

**Erken uyarı:** hedef cihazda FPS 45'in altında.
**Azaltma:** render modu kararı ölçümden sonra (`research/02` §4);
havuzlama ve atlas zaten zorunlu. **Taş:** M6 (ölçüm), M7 (`E17`).

### R14 · Kritik vuruş mekaniği tanımsız — ☑ **KAPANDI**

**Kaynak** `GAME-DESIGN.md` §3, §10

Doküman iki yerde "kritik" hasar sayısından bahsediyordu ama kritik şansı
veya çarpanı hiçbir yerde tanımlı değildi.

**Çözüm:** kritik vuruş **v1'den çıkarıldı** (S56). Eklemek bir istatistik,
bir rastgele atış ve denge varyansı getiriyordu; karşılığında neredeyse
hiçbir şey vermiyordu — Keskin Nişancı'nın kimliği zaten menzil ve zırh
delme. Hasar rengi üç renkten **ikiye** indi.

---

## Düşük olasılık, yüksek etki — tek satırlık hatalar

### R15 · `base: './'` unutulması

**Olasılık** Düşük · **Etki** Yüksek · **Kaynak** `research/05` §2

Mutlak yol kullanılırsa oyun portalda **hiç yüklenmez**. `npm run dev`'de
fark edilmez.

**Erken uyarı:** `dist/` alt klasörden servis edilince beyaz ekran.
**Azaltma:** `M0-T01` "bitmedi sayılır eğer"; `E5` elle testi; `M7-T10`.
**Taş:** M0, M7.

### R16 · Gizli sekmede `localStorage` çökmesi

**Olasılık** Düşük · **Etki** Yüksek · **Kaynak** `research/05` §1 · TIER 1 k.10

Gizli sekmede `localStorage` erişimi istisna fırlatıyor. Sarılmazsa oyun
**açılışta çöker** ve Poki reddediyor.

**Erken uyarı:** gizli pencerede siyah ekran.
**Azaltma:** TIER 1 k.10 + `M7-T05` "bitmedi sayılır eğer" + `E16`.
**Taş:** M6 (ayarlar), M7 (kayıt).

---

## Taş başına risk özeti

| Taş | Azaltılması gereken riskler |
|---|---|
| **M0** | R10 (`GameClock`), R11 (bekçi), R15 (`base`), R7 (boyut raporu) |
| **M1** | **R1 (ölçüm)**, R6 (`blockedBy` alanı) |
| **M2** | R11 (`BitmapText`), R2 (greybox katmanı başlıyor) |
| **M3** | R5 (8 nokta dolma testi), R12 (`× 0.75`), R1 (Kısıt A) |
| **M4** | R4 (uçan hattı testi), R12 (hedefleme menüsü), R14 |
| **M5** | **R6 (9 kural)** |
| **M6** | **R2 (sanat kararı)**, R7 (WebP), R13 (ölçüm), R14, R16 |
| **M7** | R1 (yeniden hesap), R9 (türetme), R8 (yayın sırası), R15, R16, R13 |

**En yüklü taşlar M6 ve M7.** İkisi de ROADMAP'te en uzun süreli taşlar
(5-7 gün) — tesadüf değil.

---

## İzlenmesi gereken sayılar

Riskler soyut; bu beş sayı somut ve her biri bir riski erkenden görünür kılıyor:

| Sayı | Nerede ölçülür | Hangi riski gösterir |
|---|---|---|
| Yapı noktası başına kapsanan yol | M1 | R1 |
| 8 noktanın dolduğu dalga | M3 | R5 |
| İlk indirme boyutu | Her `build` | R7 |
| Hedef cihazda FPS | M6 | R13, R11 |
| Gerçek taş süresi | Her taş sonu | R3, R2 |

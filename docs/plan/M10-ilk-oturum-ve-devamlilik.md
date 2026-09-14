# M10 — İlk oturum ve devamlılık

**Durum:** taslak · **Kaynak:** 2026-09-14 araştırması + kod ölçümü
**Öncül:** M9 Faz 1-4 bitti; Faz 5 (yayın) sahipte, Faz 6 (içerik) veri
bekliyor.

---

## Bu plan neden Faz 6 değil

`ROADMAP`'in teşhis matrisi *"hangi içeriği ekleyeceğine veri karar
versin"* diyor ve o karar hâlâ bekliyor. Buradaki maddelerin **hiçbiri
içerik miktarı değil**: oyunun var olan hâlinin portalın oynanma
biçimine uymayan yerleri. Matris "harita 6 mı, kahraman mı" sorusuna
cevap veriyor; bu plan "eldeki 5 harita oyuncuya hiç ulaşıyor mu"
sorusuna bakıyor. İkisi farklı sorular ve ikincisi verisiz
cevaplanabiliyor — çünkü cevabı portalların kendi yayımladığı
sayılarda.

---

## 1. Araştırmanın verdiği sayılar

| Bulgu | Kaynak |
|---|---|
| Web oyuncusu oturumu **11–20 dk**, oturumda **2–3 oyun** deniyor | Poki, 2026 State of Web Gaming |
| Oyuncuların **%37'si günde birden çok kez** giriyor | aynı |
| **10 sn**'den uzun yükleme → oyuncu başka oyuna gidiyor | Poki, Requirements |
| *"İlk birkaç dakika oyunun kaderini belirliyor; yükleme ve erken oynanıştaki terk edilme acımasızca hafife alınıyor"* | Poki, Easy Access |
| *"Menüyü atla. Özellikle ilk kez oynayanlar için açılış ekranını, başlık ekranını ve **seviye seçimini** atla."* | aynı |
| *"Metin duvarları ürkütüyor ve İngilizce metin küresel izleyicinin çoğunu dışarıda bırakıyor. Görsel, animasyon, jest kullan."* | aynı |
| Mobilde **portre veya yatay** tam ekranı kaplamalı; portre uyumlu oyunlar daha çok etkileşim görüyor | Poki, Requirements |
| *"İlerlemeyi uygun yerlerde kaydet, ya da çıkışta kaydedilmeyeceğini oyuncuya açıkça söyle"* | aynı |
| Küresel yayın için **durağan ve animasyonlu** küçük resim zorunlu | aynı |
| TD'de en iyileri ayıran dört kaldıraç: dalga arası planlama, seçim çeşitliliği, kaynak kısıtı, **kule sinerjisi** | GameAnalytics, TD metrikleri |
| *"Her seviye tam olarak **bir** yeni mekanik ya da düşman tipi tanıtıyor"* — Kingdom Rush'ı taklitlerinden ayıran şey | KR tasarım incelemeleri |

**Bir uyarı:** GameAnalytics'in "oturum başına saatler hedefleyin"
tavsiyesi **mobil** TD içindir. Poki'nin kendi sayısı 11–20 dakika.
İkisi aynı oyuncu değil ve bu planın ilk iki fazı tam olarak bu farktan
doğuyor.

---

## 2. Oyunun ölçülen hâli, aynı maddelere karşı

Hepsi bu oturumda koddan ya da canlı ekrandan ölçüldü.

### ✗ Oyunun oynanış birimi, portalın oturumundan uzun

`ROADMAP`: dalga döngüsü ~80 sn × 10 dalga → **harita ~13 dk**.
Portalın oturumu 11–20 dk ve oyuncu o sürede **2–3 oyun** deniyor. Yani
bizim oyunumuza düşen pay ~5–7 dakika: **bir haritanın yarısı.**

Ve `SaveSystem` yalnız şunu tutuyor ([SaveSystem.ts:32](../../src/systems/SaveSystem.ts#L32)):

```ts
export interface SaveData {
  readonly version: 1;
  readonly stars: Readonly<Record<string, 0 | 1 | 2 | 3>>;
}
```

Yani **tur ortası kayıt yok.** 8. dalgada sekmesini kapatan oyuncu
sıfıra dönüyor. Poki'nin "%37'si günde birden çok kez giriyor" sayısı
bizde karşılıksız: geri dönen oyuncunun döneceği bir yer yok.

### ✗ İlk oturumda oynanıştan önce iki ekran

Ölçülen akış: `Boot` → `Preload` → **`Menu`** → **`LevelSelect`** →
`Game`. Poki'nin maddesi bunu ismen sayıyor: *başlık ekranı ve seviye
seçimi atlanmalı.* İlk kez gelen oyuncu, hiçbir anlam taşımayan iki
ekranda iki tık yapıyor; `LevelSelect`'te beş haritanın dördü zaten
kilitli.

### ✗ Harita 4 ve 5 hiçbir yeni şey tanıtmıyor

Ölçüm — harita başına düşman kadrosu:

| Harita | Kadro | Yeni |
|---|---|---|
| 1 Değirmen Geçidi | 5 | — |
| 2 Taş Köprü | 7 | +2 (Zırhlı Ork, Şaman) |
| 3 Kül Ovası | 10 | +3 (Trol, Örümcek Ana, yavru) |
| **4 Kar Geçidi** | 10 | **0** |
| **5 Kadim Harabe** | 10 | **0** |

M8'in eklediği iki harita, geometri varyasyonu. Kingdom Rush'ı
taklitlerinden ayıran maddenin tam tersi. Bu **içerik miktarı sorunu
değil, var olan içeriğin derinlik kusuru** — o yüzden veri beklemesi
gerekmiyor.

### ✗ Portre modunda oyun yok, gösterilen şey de çirkin

375×812'de ölçüldü: tuval 375×211'e düşüyor, ekranın kalanı boş lacivert
ve ortada "Please rotate your device" + iki düz dikdörtgen. Yatayda
(812×375) oyun **tam oynanabilir ve okunur** — 640×360 kuralı işini
görmüş. Yani sorun oynanışta değil, portreye düşen oyuncunun gördüğü ilk
karede.

### ✓ Yükleme bütçesi rahat

İlk indirme **0,81 MB** (Poki sınırı 8 MB). 10 sn kuralı için bol pay
var. Burada iş yok.

### ✓ Kayıt uyarısı

M9 Faz 3'te kapandı — depolama engelliyse oyuncu artık ilk saniyede
uyarılıyor.

### ~ Kule sinerjisi yok

Üç kule etkisi var (`burn`, `slow`, `chain`) ve üç düşman yeteneği
(`heal`, `regen`, `split`) — ama **kuleler birbirini bilmiyor.**
"Yavaşlatılmış düşmana +%X", "yanan düşman ölünce patlar" türü
etkileşim yok. GameAnalytics'in dört kaldıracından üçü bizde var
(dalga arası planlama, seçim çeşitliliği, kaynak kısıtı), dördüncüsü
yok.

### ~ Eksik yayın varlıkları

Poki küresel yayın için **durağan + animasyonlu** küçük resim istiyor.
İkisi de yok. (Kod işi değil, üretim işi.)

---

## 3. Fazlar

Sıralama ilkesi: **önce oyuncunun oyuna ulaşmasını sağla, sonra geri
dönmesini, sonra derinleştir.** İlk ikisi ucuz ve etkisi büyük; üçüncüsü
var olan içeriği düzeltiyor; son ikisi isteğe bağlı.

### Faz 1 — İlk oturum: menüyü atla *(≈0,5 gün · risk düşük)*

**İlk kez gelen** oyuncu `Preload` biter bitmez harita 1'in içinde
olsun. Menü ve seviye seçimi kaybolmuyor, **ilk seferde atlanıyor**:

- Kayıtta hiç yıldız yoksa ve hiç ipucu görülmemişse → doğrudan
  `Game` (`degirmen-gecidi`, Normal).
- Oyunun içinde küçük bir "Ana menü" yolu zaten var (duraklatma
  menüsü, `M8-T03`) — kaçış kapısı hazır.
- İkinci gelişte normal akış (`Menu` → `LevelSelect`), çünkü artık
  seçecek bir şeyi var.

**Neden risk düşük:** `LevelSelectScene` zaten `scene.start('Game',
{mapId})` çağırıyor; atlama tek bir dallanma.

**Kabul:** temiz kayıtla açılışta ilk tık **kule yerleştirmek** oluyor.
İkinci açılışta menü geliyor. Duraklatma → ana menü çalışıyor.

### Faz 2 — Tur ortası devamlılık *(≈1,5-2 gün · risk orta)*

Sekmeyi kapatan oyuncu döndüğünde **kaldığı dalgadan** devam etsin.

- `SaveData`'ya `run` alanı: harita, zorluk, dalga no, altın, can,
  yapı noktası durumları (kule ailesi + kademe + hedefleme modu),
  yetenek beklemeleri. `version` **artmıyor** —
  `TutorialSystem`'in `tutorial` alanı için kullandığı desenin aynısı,
  eski kayıtlar bozulmuyor.
- Yazma anı **dalga arası hazırlık** — turun tek doğal sınırı; dalga
  ortasında yazmak düşman/mermi durumunu da serileştirmek demekti ve
  o iş bu işin on katı.
- Menüde "Devam et" satırı; tur bitince (kazan/kaybet) alan siliniyor.
- Poki'nin 1 MB (gzip) kayıt sınırı: bu yapı ~1 KB.

**Neden ikinci:** Faz 1 oyuncuyu oyuna sokuyor, bu faz **geri
getiriyor**. Sırası bu; ama asıl ağırlık burada — portalın "%37'si
günde birden çok kez giriyor" sayısını bizim için para eden tek madde.

**Kabul:** dalga 5'te sekme kapatılıp açılınca oyun dalga 5 hazırlığında
aynı tahtayla açılıyor. Eski kayıtlar (yalnız `stars`) sorunsuz
okunuyor. `SaveSystem` testleri yeşil + yeni göç testi.

### Faz 3 — Harita 4 ve 5'e birer yeni şey *(≈1-1,5 gün · risk orta)*

İkisine de **birer** yeni tanıtım. Öneri (ölçümle doğrulanacak):

- **Harita 4 (Kar Geçidi):** yeni düşman değil, yeni **davranış** —
  kar temasına oturan bir "kalkanlı" varyant (belirli hasar tipini
  ilk N vuruşta emen) ya da var olan `slow` etkisine direnç. Yeni
  sprite gerektirmeyen seçenek tercih edilir.
- **Harita 5 (Kadim Harabe):** boss'un ikinci bir evresi ya da
  haritaya özel bir çevre olayı.

Her ikisi de `waveSim` ile **ölçülerek** dengeleniyor (Kısıt A/B,
`referenceBoards`); sayı uydurulmuyor. Yeni bir düşman `enemies.ts`'e
girerse `KURALLAR.md` kendiliğinden güncelleniyor.

**Uyarı:** bu faz içerik *ekliyor* gibi görünüyor ama eklediği şey
miktar değil **ayrım**. Yine de matris "tamamlama düşük" derse harita
4-5'e çoğu oyuncu hiç ulaşmıyor demektir ve bu faz beklemeliydi — o
yüzden Faz 1-2'den sonra, veri gelmişse ona bakarak.

### Faz 4 — Portre karesi *(≈0,5 gün · risk düşük)*

Portrede oyun oynatmıyoruz (16:9 mimari karar, `CLAUDE.md`). Ama
portreye düşen oyuncunun gördüğü kare bugün boş lacivert + iki
dikdörtgen. Aynı ekran; oyunun kimliğini taşısın: menü arka planı,
başlık, dönen telefon animasyonu, ve **tam ekran düğmesi** (tam ekran
çoğu tarayıcıda yatayı kendisi getiriyor).

Portre oynanışı **kapsam dışı** — 1280×720 sabit tuval ve beş haritanın
geometrisi yatay; portre desteği yeni bir yerleşim katmanı demek.

### Faz 5 — Kule sinerjisi *(≈1-2 gün · risk YÜKSEK — dengeyi ölçmek şart)*

GameAnalytics'in dördüncü kaldıracı. En küçük hâli: **iki** sinerji,
ikisi de var olan etkileri kullanıyor.

- Yavaşlatılmış düşman fiziksel hasardan daha çok etkilenir, ya da
- Yanan düşman ölünce küçük bir alan hasarı bırakır.

**Neden riskli:** Kısıt A ve Kısıt B `referenceBoards`'a dayanıyor ve
sinerji "toplam DPS" varsayımını kırıyor. Üç sağlama testi de yeniden
ölçülmek zorunda. Bu yüzden en sonda ve bu yüzden **en küçük hâliyle**.

---

## 4. Bu planın YAPMADIĞI şeyler

- **Yeni harita eklemiyor.** Miktar kararı matrisin işi (`ROADMAP`).
- **Kahraman, meta ağaç, sıralama, editör** — `ROADMAP`'in dört
  uyarısı, hâlâ dışarıda.
- **Portre oynanışı** — Faz 4 yalnız o karenin görünüşü.
- **Poki bulut kaydı** — `KeyValueStore` arayüzü hazır ve geçiş kolay,
  ama önce Poki'ye kabul edilmek gerekiyor (M9 Faz 5).
- **Küçük resimler (durağan + animasyonlu)** — üretim işi, kod değil;
  yayın adımında sahibin listesinde.

---

## 5. Toplam

| Faz | Durum |
|---|---|
| 1 · Menüyü atla | ✅ `55a8b1e` |
| 2 · Tur ortası devamlılık | ✅ `cfe907d` |
| 3a · Harita 4'e buz kalkanı | ✅ `827651e` |
| 3b · Harita 5'in yeni mekaniği | ⬜ **açık** |
| 4 · Portre karesi | ✅ `d85cee5` |
| 5 · Kule sinerjisi | ⬜ **açık** |

## Faz 3 yol boyunca İKİ ciddi hata buldu

Planın hiçbir yerinde yazmıyordu; ikisi de harita 4'ün kalkanının
canlı oyunda görünmemesi üzerinden çıktı.

**S80 — oyun ile denge simülasyonu farklı boss dövüşüyordu.** `waveSim`
`getEnemyForMap` (haritaya duyarlı) kullanıyordu, `GameScene` ham
`getEnemy`. Harita 5'te oyuncu **4760 HP / zırh 10** bir boss'la
karşılaşıyordu, oysa her ölçüm **2675 / 2** varsayıyordu. Düzeltildi
(`827651e`).

**S81 — `waveSim` düşman yeteneklerini hiç simüle etmiyordu.** Şaman
iyileştirmiyor, Trol yenilenmiyor, Örümcek Ana bölünmüyordu. Yani M3'ten
beri her denge ölçümü iyimserdi. Düzeltilince üç kabul testi birden
düştü ve iki denge sayısı ölçülerek yeniden türetildi (S82, S84). Ayrıca
§5'in Şaman tavsiyesinin yarısının **tersine döndüğü** ortaya çıktı
(S83). Düzeltildi (`1f82f54`).

İkisi de `docs/plan/OPEN-QUESTIONS.md`'de kayıtlı.

**Kalan iki faz için not:** Faz 5 (kule sinerjisi) "toplam DPS"
varsayımını kırıyor ve Kısıt A/B'nin yeniden ölçülmesini gerektiriyor —
denge katmanı S81'den sonra zaten bir kez yeniden türetildi, bu yüzden
sıradaki turda aynı ölçümler tekrar koşturulmalı.

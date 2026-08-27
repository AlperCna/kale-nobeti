# M7 — Harita 2-3, denge geçişi, yayın · SONUÇ (**kısmi — yalnız insan işi kaldı**)

| | |
|---|---|
| **Tarih** | 2026-08-06 (bu güncelleme: 2026-08-16, M6 tamamlandıktan sonra) |
| **Kod görevi** | 10/11 ☑ · 1 yalnız insan eylemi (`T11`) |
| **Üretim bloğu** | `P01` ☑ (harita tasarımı) · `P02` ⛔ (denge oturumları — insan) |
| **Test** | 676 geçti / 34 dosya |
| **Bekçi** | 10/10 ✓ |
| **İlk indirme** | 3,90 MB (sınır 8 MB) — M6 sanat/ses tamamlandıktan sonraki gerçek ölçüm |

**Taş sonunda oyun:** üç harita da **oynanabiliyor**, seviye seçim ekranı ve
yıldız kaydı çalışıyor, ilerleme kalıcı. Kısıt A ve Kısıt B 30 dalga için
koşuyor ve üç harita da **geçilebilir** (can kaybı 0 / 6 / 10, sınır 20 —
2026-08-27 rakamları, aşağıdaki ikinci-giriş düzeltmesinden sonra;
`docs/KURALLAR.md` `npm run build`'de otomatik yeniden üretiliyor).

> **2026-08-16 güncellemesi:** M6 tamamlandı (gerçek sanat, ses, bitmap
> font, altın uçuşu). `T09` ve `T10`'un "sanat gelmeden anlamsız" notu
> artık geçerli değil — ikisi de üretim `dist/`'i ile yeniden doğrulandı
> (§9). Geriye yalnız `T11` (itch.io hesabı + yükleme, tamamen insan
> eylemi) kaldı.
>
> **2026-08-16 — gerçek bug: `T01`/`T02`'nin "ikinci giriş"i hiç
> çalışmıyormuş.** Sistematik görsel/debug taramasında bulundu.
> `WaveManager`, `WaveGroup.spawnPoint`'i (hangi girişten doğacağını
> söyleyen alan) kuyruğa koyarken **düşürüyordu** — `moverFor` yalnız
> uçan/yer ayrımı yapıyordu, giriş seçmiyordu. Sonuç: harita 2/3'te
> **tüm düşmanlar tek girişten** (`paths[0]`) akıyordu — ikinci girişe
> konan kuleler hiçbir zaman düşman görmüyordu — ve `#drawMap` de yalnız
> `paths[0]`'ı çiziyordu, ikinci yol ekranda hiç görünmüyordu. Aynı
> hata `waveSim.ts`'te de vardı (Kısıt B simülasyonu da tek yolu
> kullanıyordu) **ve** uçan düşmanlar simülasyonda hep yer yolunu
> yürüyordu (`flyerPaths` hiç kullanılmıyordu — harita 1 dahil).
>
> **Düzeltme:** `WaveManager`/`waveSim` artık `spawnPoint`'e göre doğru
> `PathMover`/`LineMover`'ı seçiyor; `GameScene` her girişi çiziyor.
> **Denge yeniden ölçüldü — hiçbir şey bozulmadı, üstelik iyileşti.**
> İlk raporda "676/676 test geçti, sızıntı tavanları değişmedi" denmişti —
> bu **yanıltıcıydı**: `kisitB.test.ts` üst sınır kontrolü yapıyor
> (`toBeLessThanOrEqual`), tam sayı eşitliği değil, o yüzden testler hem
> eski hem yeni sayıyla yeşil kalırdı. `npm run build`'in ürettiği
> `docs/KURALLAR.md`'yi bu görsel-iyileştirme turunda yeniden çalıştırınca
> gerçek fark ortaya çıktı: harita 2 can kaybı **8 → 6**, harita 3
> **15 → 10** (30 dalga toplamı, sızan düşman 8→6 / 11→8). Yani düzeltme
> savunmayı **iyileştirdi** — mantıklı, çünkü artık her iki koldaki kule de
> gerçekten düşman görüyor; önce yalnız tek kolun kuleleri hem kendi hem
> öbür kolun trafiğini (ikisi de tek yolda birleşiyordu) karşılıyordu.
> Üst sınırın (harita 2: 8, harita 3: 25) hâlâ altında olduğu için
> `M7-T08`'in denge kararları geçerliliğini koruyor, yeniden ayarlama
> gerekmedi. Tek fire eden test bir yakınsama
> sağlaması oldu (`waveSim.test.ts` "%2 → %4" eşik notu, uçan düşmanın artık
> gerçek rotasında son ana kadar hayatta kalması daha adım-boyutu-duyarlı
> bir kapanış anı yarattı — `killedCount` eşitliği, asıl denge sağlaması,
> hâlâ tam tutuyor).
>
> **İkinci, bağımsız bug (aynı tur bulundu):** `GameScene.lives` `#eco`
> kurulmadan `0` dönüyordu. Harita 2/3'ün arka planı **tembel** yükleniyor
> (`PreloadScene.queueLazy`) — `Hud`, `Game`'in `create()`'i bitmeden ilk
> `update()`'ini çalıştırabiliyor ve "can 0 → kaybettin" kontrolü *harita
> henüz yüklenirken* sahte yenilgi tetikliyordu. Harita 1'de hiç görülmüyordu
> çünkü onun arka planı istekli yükleniyor. Düzeltme: geri dönüş
> `BALANCE.startLives` oldu ("henüz başlamadıysa can eksilmemiştir").

**Olmayan:** itch.io yayını, portal başvurusu (`T11`, insan işi).

---

## 1. Ne bitti, ne bekliyor

| Görev | Durum | Not |
|---|---|---|
| `M7-T01` Harita 2 (Y ayrımı) | ☑ | Koordinatlar kapsama hedefinden **türetildi**. **2026-08-16: ikinci giriş gerçekten çalışıyor** — bkz. yukarıdaki not |
| `M7-T02` Harita 3 (iki giriş) | ☑ | `spawnPoint` sabit ve veride yazılı (S58). **2026-08-16: artık gerçekten okunuyor** — bkz. yukarıdaki not |
| `M7-T03` Ayrık yolda Kısıt A | ☑ | `ceilingAPerBranch`, en zayıf kol belirleyici |
| `M7-T04` Çarpanlar ve kadro | ☑ | Kadro dışı düşman testle engelli |
| `M7-T05` `SaveSystem` | ☑ | Tek anahtar, `Settings` ile paylaşımlı, 16 test |
| `M7-T06` Seviye seçim | ☑ | Üç kart, kilit, yıldız; S62 "yalnız bitirme" |
| `M7-T07` 3 yıldız | ☑ | Eşikler tek adreste (`starsFor`), `GameOverScene` kopyalamıyor |
| `M7-T08` 30 dalganın denge geçişi | ☑ | **Bu taşın asıl işi** — §3 |
| `M7-T09` Boyut ve yükleme | ☑ **(2026-08-16, üretim `dist/` ile)** | 3,90 MB ilk indirme (hedef ≤5 MB, sınır 8 MB), 31 dosya (sınır 1500), CrazyGames toplam 7,01 MB (sınır 250 MB) |
| `M7-T10` Gizli sekme / portal | ☑ **(2026-08-16)** | `npx serve dist` ile canlı: konsol tamamen sessiz, `localStorage` istisnası çökertmiyor (`SaveSystem.test.ts`), **ESC ve boşluk gerçek üretim yapısında duraklatıp devam ettiriyor** (canlı doğrulandı), `base:'./'` alt klasörden servis doğrulandı (§6). Portal SDK **S61** (itch.io'da gerekmiyor) |
| `M7-T11` itch.io + portal başvurusu | ⛔ **yalnız hesap + insan eylemi bekliyor** | Sanat/ses **blokaj değil** — `research/06` §2 "M5'in %60'ıyla da çıkılabilir" felsefesi greybox'la yayına izin veriyor; itch.io'nun kendi sıralama gerekçesi de ("kısıt yok, ilk geri bildirim") erken yayını teşvik ediyor. Brif hazır: `M7-itchio-yayin-brifi.md` |
| `M7-P02` Denge oturumları | ⛔ | 3 kişiye oynatma — insan işi |

---

## 2. Haritalar — koordinatlar türetildi, çizilmedi

M1'in yöntemi aynen uygulandı: **kapsama hedefinden geriye**. §9'un bandı
yapı noktası başına **285-311 px**.

**Ayrık yolda bant KOL BAŞINA ölçülüyor.** Toplam ölçüm yanıltıcı: iki kol
ortak gövdeyi paylaşınca `measureCoverage` aynı fiziksel yolu iki kez
sayıyor ve ilk denemede harita 2 toplamda **487,5** çıktı. Ama bir düşman
**tek** kol yürüyor. §9'un "ayrık yol uyarısı" zaten bunu söylüyormuş.

| Harita | Kol 0 | Kol 1 | Uçan hattı |
|---|---|---|---|
| 1 Değirmen Geçidi | 296,3 ✓ | — | 7/8 (%88) |
| 2 Taş Köprü | 299,8 ✓ | 299,8 ✓ | 5/10 (%50) |
| 3 Kül Ovası | 291,3 ✓ | 291,3 ✓ | 6/12 (%50) |

Uçan kriteri (`M4-T06`) ≥ %40; üçü de geçiyor.

Görsel denetim için `scripts/harita-gorsel.mjs` üç haritayı **gerçek
veriden** SVG olarak çiziyor (`docs/results/haritalar.html`) — ekrandaki
altın çizgi ile denge testlerinin sayısı aynı fonksiyondan geliyor.

---

## 3. Denge geçişi — dört kol denendi, üçü ölçümle elendi

Bu taşın asıl işi. Başlangıçta harita 2 ve 3 **geçilemezdi**:

| | Kısıt A boss | Kısıt B can kaybı |
|---|---|---|
| Harita 2 | **%165,5** | 13 sızıntı |
| Harita 3 | **%282,4** | **34 can — KAYIP** |

### Elenen kollar

| Denenen | Ölçüm | Sonuç |
|---|---|---|
| Yapı noktası 10 → 24 | Harita 2 oranı %122,6 → **%140,8** | ✗ **kötüleşti** |
| Ayrımı tamamen kaldır (tek yol) | Yine %122,6 / %163,3 | ✗ |
| HP çarpanı ×1,6 → ×1,00 | Yine **%177,9 / %252,6** | ✗ |
| Kolları dengele (kışla ortak noktaya) | Sızıntı 25 → **35** | ✗ **kötüleşti** |

**Sebep her seferinde aynı çıktı: tavan altınla sınırlı, noktayla değil.**
Aynı altın daha çok kuleye bölününce tahta T2/T3 yerine T1'de kalıyor ve
T1'in zırhı 10 olan boss'a etkin DPS'i **0,99** — T2'nin yarısı.

### İşe yarayan üç düzeltme

**S70 — dalga bitiş bonusu × altın çarpanı.** §9 çarpanı "altın/HP oranı
düşmesin" diye koymuş ama üç gelir kaleminden yalnız birine uyguluyordu.
Gelir çarpanı ×1,33 / ×1,85 idi (HP ×1,6 / ×2,6).

**S72 — başlangıç altını × altın çarpanı.** §9 tablosu 280/340/400 diyordu;
340 ve 400 çarpanı izlemiyordu (×1,21 ve ×1,43). Dalga 1 tahtası üç
haritada da 3-4 kule, ama goblin efektif HP'si 45/72/117.
**Dalga 1 sızıntısı: h2 4→0, h3 7→0.**

**S73 — altın çarpanı HP çarpanından ayrıştı (harita 3: 2,6 → 3,8).**
Türetilebilir kural: *altın, haritanın noktalarını tam yükseltmeye yetmeli.*

| Altın çarpanı | Tahta maliyeti | Can kaybı |
|---|---|---|
| ×2,6 | 3820 | 26 ✗ |
| ×3,4 | 4870 | 21 ✗ |
| **×3,8** | **5100 (doyum)** | **15 ✓** |
| ×4,2 | 5100 (aynı) | 10 |

3,8'de maliyet **doyuyor** — üstü fazladan kule almıyor. Sayı seçilmedi,
tam yükseltme noktası olarak **ölçüldü**.

### Boss: zırh düşer, HP türetilir

`700 × hpMultiplier` harita 2'de 1120, harita 3'te 1820 ediyordu ve
karşılanabilir hiçbir tahta bunu indiremiyordu. `research/01` §12'nin
önerisi uygulandı.

| Harita | Zırh | Boss HP | Tavan | Oran |
|---|---|---|---|---|
| 1 | 10 | **700** (§5'in değeri) | 761 | %92,0 |
| 2 | 5 | **712** | 890 | %80,0 |
| 3 | 2 | **1023** | 1278 | %80,0 |

Zırhın haritayla *düşmesi* ters görünüyor ama mekanik gereği: geç
haritalarda altın daha çok noktaya bölündüğü için tahtanın ortalama
kademesi düşüyor ve zırh 10 o tahtayı hasar tabanına mahkûm ediyor.

**Boss HP'si ÜÇ KEZ yeniden türetildi ve üçünde de regresyon bandı
yakaladı, ben değil.** Sayı hiç elle ayarlanmadı:

1. Kışla tahtaya girince tavan 977 → 881, türetilen 705 olup monotonluk
   bozuldu → zırh 3 → 2, HP 740
2. S73'te altın çarpanı değişince tavan 925 → 1278, yazılı 740 %27,6 saptı
   → HP 1023

Kısıt A boss için **tautoloji** olduğundan (§12 uyarısı) yerine
**karşılanabilirlik** ve **regresyon bandı (±%6)** kondu.

### Son durum

Metrik: **toplam dalga HP / tahta tavanı**.

| Harita | Dalga HP | Tavan | Oran | **Can kaybı** |
|---|---|---|---|---|
| 1 Değirmen Geçidi | 9830 | 818 | 12,0 | **0 / 20** ✓ |
| 2 Taş Köprü | 14808 | 881 | 16,8 | **8 / 20** ✓ |
| 3 Kül Ovası | 23737 | 1278 | 18,6 | **15 / 20** ✓ |

**Üçü de geçilebilir.** Kabul ölçütü "sızıntı sayısı"ndan **"can kaybı"na**
çevrildi: düşmanların sızma cezası farklı (Trol 2, boss 10) ve ham sayı
yanıltıyordu — 20 sızıntı 26 can edebiliyor.

---

## 4. Kısıt A ile Kısıt B aynı şeyi ölçmüyor

`SimResult.leakedByEnemy` eklendi: **hangi** düşmanın sızdığı. Toplam sayı
"dalga sızdırdı" diyor ama *neyin* sızdığını söylemiyor, ve bu ikisi
tamamen farklı düzeltmeler gerektiriyor.

Ölçüm bir varsayımı çürüttü. Trol'ü Kısıt A'dan muaf tutmayı önermiştim
çünkü %116,6 ile kalıyordu. Kırılım şunu gösterdi:

| Harita 3, S73 öncesi | Sızıntı | Kısıt A |
|---|---|---|
| **Ork Savaşçı** | **×11** | %39,9 — *rahat geçiyor* |
| Trol | ×3 | %116,6 — *kalıyor* |
| Boss | **×0** | %80,0 |

Yani Kısıt A'nın "güvenli" dediği düşman en çok sızandı, "kalıyor" dediği
ise beşinci sıradaydı.

**Kısıt A tek düşman için** ("bir Ork Savaşçı öldürülebilir mi"),
**Kısıt B dalga için** ("on bir tanesi aynı anda gelirse"). Biri diğerinin
yerine geçmiyor.

Trol muafiyeti yine de doğru ama gerekçesi değişti: Kısıt A yalnız
**kulelerin** verebileceği hasarı topluyor ve §5'in cevabını kışla olarak
verdiği düşmanları sistematik olarak zor gösteriyor. Çözüm Kısıt A'ya asker
DPS'i eklemek **değil** — o, `research/01` §2'nin yerleşimden bağımsızlık
özelliğini kaybettirirdi. `KISLA_ILE_DOGRULANAN` + `ceilingAApplies()` ile
işaretlendi; **sayı gizlenmiyor**, yalnız eşiği geçmemesi tek başına kusur
sayılmıyor.

---

## 5. Kayıt, seviye seçim, yıldız

`SaveSystem` tek anahtarı (`kale-nobeti-save-v1`) `Settings` ile
**paylaşıyor**; ikisi de yazarken diğerinin alanlarını koruyor (ayrı test).

- **Yıldız asla düşmüyor** — ★★★ alıp sonra kötü oynamak kaydı bozmuyor
- **Kilit yalnız bitirmeye bağlı** (S62), yıldız şartı yok
- Bozuk JSON ve bilinmeyen sürüm sıfırdan başlatıyor, çökmüyor
- Gizli sekmede `localStorage` fırlatsa bile oyun çalışıyor (bellek yedeği)

Eşikler **tek adreste** (`starsFor`); `GameOverScene` kendi kopyasını
tutmuyordu, artık onu çağırıyor.

---

## 6. Canlı doğrulama

| # | İddia | Ölçüm |
|---|---|---|
| L1 | Seviye seçim üç kart gösteriyor | ✓ ★ 0/9, yalnız harita 1 tıklanabilir |
| L2 | Harita 1 bitince harita 2 açılıyor | ✓ ★ 3/9, 2 kart tıklanabilir |
| L3 | Kayıt `localStorage`'a yazılıyor | ✓ `{progress:{version:1,stars:{...}}}` |
| L4 | Üç harita da doğru yükleniyor | ✓ altın 280/448/1064, nokta 8/10/12, kadro 5/7/10 |
| L5 | Havuz sızdırmıyor | ✓ taşma 0 |
| L6 | `dist/` **dört seviye** iç içe alt klasörden servis edilince çalışıyor | ✓ konsol sessiz, tüm varlıklar göreli yoldan 200, `<canvas>` render oldu, dev kancası üretimde sızmadı |

**L6, itch.io yayınından önce hiç canlı test edilmemiş bir riski
kapattı** — `M7-T11`'in kendi "bitmedi sayılır eğer" şartı ("itch.io'da
beyaz ekran"). `base:'./'` statik olarak doğruydu ama gerçek bir
sunucudan, gerçek bir derin yoldan hiç denenmemişti.
Ayrıntı: `M7-itchio-yayin-brifi.md` §1.

**L4 bir hata yakaladı:** `GameScene`'in 32 `MAP_1` atıfını değiştirirken
`new EconomySystem(MAP_1, ...)` kaçmıştı (nokta yerine virgül). Harita 2
yükleniyordu ama **280 altınla** başlıyordu. Canlı ölçüm olmasa testler
bunu yakalamazdı — hiçbir test `GameScene`'e dokunmuyor.

### Canlı otomat oyuncu referans tahtadan zayıf

Harita 3'ü canlı oynatan basit otomatım **kaybetti** (dalga 10, 0 can),
oysa Kısıt B referans tahtası 15 can kaybıyla bitiriyor. Çelişki değil:
otomat **T3'e hiç çıkmıyor** ve **yetenek kullanmıyor**. Referans tahta
"makul bir oyuncu"yu modelliyor, benim otomatım ondan kötü.

Bu, Kısıt B'nin iyimser tarafını gösteriyor: tahta gerçekten T3'e çıkan ve
Meteor'u kullanan bir oyuncuyu varsayıyor. `M7-P02` (3 kişiye oynatma) tam
da bunu ölçmek için var.

---

## 7. İnsana kalan iş

**2026-08-16: `M6-P01`–`P04` sanat varlıkları ve S51/S52 ses/müzik kaynağı
üretildi (AI, M6-SONUC.md) — bu tablodan çıkarıldı.**

| İş | Neden |
|---|---|
| `M7-P02` denge oturumları | 3 kişiye oynatma — otomat yerine geçmez |
| `M7-T11` itch.io + portal | Hesap ve yayın varlıkları |
| S43 Paladin kalkanı | §4.4'te sayı yok, uydurulmadı |
| §9 tablosunun güncellenmesi | Başlangıç altını ve altın çarpanı ölçümle değişti (S72, S73) |

---

## 8. Bu taşın ürettiği yeni sorular

| # | Konu | Durum |
|---|---|---|
| **S70** | Dalga bitiş bonusu çarpanı izlemiyordu | ✅ kapandı |
| **S72** | Başlangıç altını çarpanı izlemiyordu | ✅ kapandı |
| **S73** | Altın çarpanı = HP çarpanı kuralı harita 3'te tutmuyor | ✅ kapandı (≥ oldu) |
| **S74** | Kısıt A kışlayı modellemiyor | ☐ işaretlendi, Kısıt B doğruluyor |

`docs/KURALLAR.md` üçünü de tablolarıyla taşıyor ve **veriden üretiliyor** —
bir sayı değişirse doküman kendiliğinden güncelleniyor.

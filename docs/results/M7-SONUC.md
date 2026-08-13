# M7 — Harita 2-3, denge geçişi, yayın · SONUÇ (**kısmi**)

| | |
|---|---|
| **Tarih** | 2026-08-06 |
| **Kod görevi** | 8/11 ☑ · 1 kısmi · 2 yapılamadı |
| **Üretim bloğu** | `P01` ☑ (harita tasarımı) · `P02` ⛔ (denge oturumları — insan) |
| **Test** | 643 geçti / 34 dosya |
| **Bekçi** | 10/10 ✓ |
| **İlk indirme** | 0,39 MB (sınır 8 MB) |

**Taş sonunda oyun:** üç harita da **oynanabiliyor**, seviye seçim ekranı ve
yıldız kaydı çalışıyor, ilerleme kalıcı. Kısıt A ve Kısıt B 30 dalga için
koşuyor ve üç harita da **geçilebilir** (can kaybı 0 / 8 / 15, sınır 20).

**Olmayan:** sanat ve ses (M6'nın üretim blokları), itch.io yayını, portal
başvurusu.

---

## 1. Ne bitti, ne bekliyor

| Görev | Durum | Not |
|---|---|---|
| `M7-T01` Harita 2 (Y ayrımı) | ☑ | Koordinatlar kapsama hedefinden **türetildi** |
| `M7-T02` Harita 3 (iki giriş) | ☑ | `spawnPoint` sabit ve veride yazılı (S58) |
| `M7-T03` Ayrık yolda Kısıt A | ☑ | `ceilingAPerBranch`, en zayıf kol belirleyici |
| `M7-T04` Çarpanlar ve kadro | ☑ | Kadro dışı düşman testle engelli |
| `M7-T05` `SaveSystem` | ☑ | Tek anahtar, `Settings` ile paylaşımlı, 16 test |
| `M7-T06` Seviye seçim | ☑ | Üç kart, kilit, yıldız; S62 "yalnız bitirme" |
| `M7-T07` 3 yıldız | ☑ | Eşikler tek adreste (`starsFor`), `GameOverScene` kopyalamıyor |
| `M7-T08` 30 dalganın denge geçişi | ☑ | **Bu taşın asıl işi** — §3 |
| `M7-T09` Boyut ve yükleme | ☑ **kısmi** | 0,39 MB ölçüldü; yükleme süresi sanat gelmeden anlamsız |
| `M7-T10` Gizli sekme / portal | ☑ **kısmi** | Gizli sekme ✓; portal SDK **S61** (itch.io'da gerekmiyor); `base:'./'` **canlı doğrulandı** (§6) |
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

| İş | Neden |
|---|---|
| `M6-P01`–`P04` sanat varlıkları | Elle çizilen; 7 kod görevi bunları bekliyor |
| S51/S52 ses ve müzik kaynağı | 20 efekt + 2 parça |
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

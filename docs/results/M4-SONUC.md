# M4 — Tam kule/düşman seti, yükseltme, bilgi paneli · SONUÇ

| | |
|---|---|
| **Tarih** | 2026-08-05 |
| **Gerçek süre** | ~2 sa 40 dk (plan: 4 gün — birim farkı, `TASK-TEMPLATE.md` "Süre birimi") |
| **Görev** | 11/11 ☑ |
| **Test** | 430 geçti / 23 dosya · 1,56 sn |
| **Bekçi** | 9/9 ✓ |
| **İlk indirme** | 0,39 MB (sınır 8 MB) |

**Taş sonunda oyun:** 3 kule ailesi × 4 kademe (T1→T2→T3a/T3b dallanma),
9 düşman + örümcek yavrusu, yükseltme/satış menüsü, düşmana özel etkin DPS
gösteren bilgi paneli, ayrı uçan hattı, efekt sistemi (yanma/yavaşlatma/
zincir), düşman yetenekleri (iyileştirme/yenilenme/bölünme). 10 dalga baştan
sona oynanıyor.

---

## 1. Karşı-oyun tablosunun 7 senaryosu — **ölçüldü**

Yöntem: her senaryoda 8 yapı noktasının **hepsine aynı aile T2** konuldu ve
`simulateWave` çalıştırıldı. Yerleşim sabit olduğu için aradaki tek değişken
aile. Böylece "hangi aile doğru cevap" sorusu göz kararıyla değil süreyle ve
sızıntıyla yanıtlanıyor.

| # | Tehdit | §5'in cevabı | Ölçüm | Sonuç |
|---|---|---|---|---|
| 1 | Kalabalık goblin ×20 | Top | Top **18,9 sn** · Büyü 22,7 · Okçu 27,4 — üçü de temizliyor | ✅ **geçti** |
| 2 | Zırhlı Ork ×8 | Büyü | Okçu **7/8 sızdırıyor** (984 HP). Büyü 33,2 sn temizliyor, Top 18,5 sn | ⚠️ **kısmen** |
| 3 | Şaman ×6 | Keskin Nişancı (`last`) / Yıldırım | Üçü de temizliyor. `last` modu ayrı testle doğrulandı | ⚠️ **kısmen** |
| 4 | Harpi ×10 | Okçu + Büyü; Top işe yaramaz | Top **etkin DPS 0,00**, 10/10 sızıyor (700 HP). Büyü 14,7 sn, Okçu 20,8 sn | ✅ **geçti** |
| 5 | Trol ×4 | Kışla ile tut + yoğun tek hedef | Okçu **3/4 sızdırıyor** (738 HP). Top 28,4 sn, Büyü 46,2 sn | ✅ **geçti** (kışla M5) |
| 6 | Kurt Binicisi ×10 | Buz / Barut Fıçısı yavaşlatma | Üçü de temizliyor: Top 12,9 · Büyü 14,5 · Okçu 18,3 sn | ⚠️ **tehdit keskin değil** |
| 7 | Ogre Şef ×1 | Büyü + Top, `strongest`, Meteor | Okçu **sızdırıyor, 499 HP kalıyor** (1,95 DPS). Büyü 27,3 sn, Top 29,9 sn | ✅ **geçti** (Meteor M5) |

**Dördü geçti, üçü kısmi.** 5 ve 7 "geçti" sayıldı çünkü tablonun **kule**
kısmı ölçüldü ve çalışıyor; eksik olan mekanik (kışla, Meteor) M5 kapsamında
ve henüz yazılmadı — bu bir başarısızlık değil, sıradaki iş.

### 4. satır tablonun en keskin kanıtı

Top ailesinin harpiye **etkin DPS'i tam sıfır** — `airMultiplier: 0`. Sekiz
Top kulesi kurulmuş bir tahta harpi dalgasında hiçbir şey yapamıyor ve 10/10
sızdırıyor. Barut Fıçısı (T3b) uçana %50 ile vurunca aynı aile 9,00 DPS'e
çıkıyor. Yani T3 dallanması gerçek bir seçim: `9,00 (uçana vurur)` mu
`21,60 Havan (uçana vurmaz)` mı.

### 2. ve 3. satır neden kısmi

**Zırhlı Ork:** tablonun **olumsuz** iddiası çok güçlü — Okçu 2,60 DPS ile
Büyü'nün 18,00'inin **%14'ü**, 7/8 sızdırıyor. Ama **olumlu** iddia ("cevap
Büyü'dür") 8 birimlik grup yoğunluğunda zayıflıyor: Top, patlama sayesinde
daha düşük tek hedef DPS'iyle (14,30) dalgayı daha **erken** bitiriyor.
"Okçu yanlış cevap" kesin; "yalnız Büyü doğru cevap" değil.

**Şaman:** tablo bir DPS iddiası değil, bir **konum** iddiası ortaya koyuyor
— Şaman grubun arkasında durup öndekileri iyileştiriyor, o yüzden arkaya
ulaşabilen kule gerekiyor. Ham DPS'e bakınca Havan (21,60) hem Keskin
Nişancı'yı (15,60) hem Yıldırım'ı (12,60) geçiyor; ama Havan onu **seçemiyor**
çünkü varsayılan `first` öne vuruyor. Mekanizma (`last` modu + 260 px menzil)
ayrı testle doğrulandı; simülasyon hedefleme modunu taşımadığı için senaryo
uçtan uca ölçülemedi.

> **Kapandı (M7 öncesi kapanış turu).** `ReferenceBoard.targetMode` eklendi
> ve `waveSim` onu uyguluyor. Ölçüldü: dört kuleyle `first`/`last`/`closest`
> farklı sonuç veriyor; tek kuleyle beşi de aynı (menzilde tek düşman varken
> her mod aynı hedefi seçer — kontrol grubu). `waveSimBoard.test.ts`.

### 6. satır bir tasarım bulgusu

Kurt Binicisi'ne (hız 100, HP 60) yavaşlatma **gerekmiyor** — dolu bir
dalga-10 tahtası onu zaten üç ailenin herhangi biriyle temizliyor. Yavaşlatma
mekanizması çalışıyor (canlı ölçümde Buz çarpanı tam **0,50**) ama Harita 1
onu **zorunlu kılmıyor**. Tehdidi keskinleştirmek Harita 2-3'ün işi (M7);
burada zorlamak Harita 1'i giriş haritası olmaktan çıkarırdı.

---

## 2. Uçan hattını kesen yapı noktaları

Plan **≥3 nokta** istiyordu (R4: "uçan hattı yazı-tura").

| Menzil | Kesen nokta | Ayrıntı (nokta:px) |
|---|---|---|
| 150 (T1 Okçu) | **7 / 8** | 0:296 2:229 3:195 4:186 5:284 6:299 7:263 |
| 170 (T2 Okçu) | **7 / 8** | 0:337 2:279 3:252 4:245 5:326 6:339 7:284 |
| 190 (Büyü T2) | **8 / 8** | + 1:99 |
| 230 (Havan) | 8 / 8 | 5:450 6:459 en yüksek |
| 260 (Keskin Nişancı) | 8 / 8 | 6:519 en yüksek |

**7-8 nokta, hedefin 2,3-2,7 katı.** R4 bu haritada kapandı; Harita 2-3'te
yeniden ölçülecek. Nokta **1** yalnız menzil ≥190'da kesiyor (99 px) — yani
uçan savunmasını 1 numaralı noktaya kurmak T1 Okçu ile işe yaramıyor.
Bu bir hata değil, tek noktanın kör kalması yerleşim kararı üretiyor.

Canlı ölçümde Harpi hattan **0,31 px** sapmayla geçti; hat ipucu tam olarak
uçan içeren dalgalarda (6, 8, 9, 10) açık, içermeyenlerde (5, 7) kapalı.

---

## 3. 12 kademe × 10 düşman etkin DPS matrisi

`applyDamage` üzerinden, zırh/direnç/uçan çarpanı uygulanmış. Yanma dalları
sürekli hasarı da içeriyor. `-` = vuramıyor.

| Kademe | goblin | orkSav | kurtBin | harpi | zırhlıOrk | şaman | trol | örümcek | **boss** | yavru |
|---|---|---|---|---|---|---|---|---|---|---|
| Okçu T1 | 6,60 | 4,40 | 5,50 | 6,60 | 0,99 | 6,60 | 2,20 | 6,60 | **0,99** | 6,60 |
| Okçu T2 | 13,00 | 10,40 | 11,70 | 13,00 | 2,60 | 13,00 | 7,80 | 13,00 | **1,95** | 13,00 |
| Okçu T3a Keskin Nişancı | 15,60 | 14,40 | 15,00 | 15,60 | 10,80 | 15,60 | 13,20 | 15,60 | 9,60 | 15,60 |
| Okçu T3b Kundakçı | 16,60 | 13,80 | 15,20 | 16,60 | 5,89 | 16,60 | 11,00 | 16,60 | 5,89 | 16,60 |
| Top T1 | 11,00 | 10,00 | 10,50 | **-** | 7,00 | 11,00 | 9,00 | 11,00 | 6,00 | 11,00 |
| Top T2 | 18,70 | 17,60 | 18,15 | **-** | 14,30 | 18,70 | 16,50 | 18,70 | 13,20 | 18,70 |
| Top T3a Havan | 21,60 | 20,70 | 21,15 | **-** | 18,00 | **21,60** | 19,80 | 21,60 | 17,10 | 21,60 |
| Top T3b Barut Fıçısı | 18,00 | 16,80 | 17,40 | **9,00** | 13,20 | 18,00 | 15,60 | 18,00 | 12,00 | 18,00 |
| Büyü T1 | 9,80 | 9,80 | 9,80 | 9,80 | 9,80 | 5,88 | 9,80 | 7,84 | 7,35 | 9,80 |
| Büyü T2 | 18,00 | 18,00 | 18,00 | 18,00 | 18,00 | 10,80 | 18,00 | 14,40 | **13,50** | 18,00 |
| Büyü T3a Yıldırım | 21,00 | 21,00 | 21,00 | 21,00 | 21,00 | 12,60 | 21,00 | 16,80 | 15,75 | 21,00 |
| Büyü T3b Buz | 16,00 | 16,00 | 16,00 | 16,00 | 16,00 | 9,60 | 16,00 | 12,80 | 12,00 | 16,00 |

Canlı oyunda bilgi panelinin gösterdiği iki sayı bu tablodan **birebir**
doğrulandı: Okçu T2 → boss **1,95**, Büyü T2 → boss **13,50**.

### Matristen çıkan üç sayı

- **Okçu T1 (2,20) Trol'ün yenilenmesini (6 HP/sn) geçemiyor.** Tek başına
  bir Okçu T1 kulesi bir Trol'ü **hiçbir zaman** öldüremiyor — HP artıyor.
  T2'de 7,80 ile ancak 1,80 net kalıyor. §5'in "Trol'e yoğun tek hedef"
  cümlesinin sayısal karşılığı bu.
- **Okçu T1/T2 boss'a 0,99 / 1,95.** Hasar tabanına (`%15`) dayanmış durumda;
  ekranda gri sayı olarak görünüyor (§11 gereği).
- **Büyü Şaman'a en zayıf aile** (10,80 vs Top 18,70) — Şaman'ın %40 büyü
  direnci tam da "Büyü'ye her şeyi çözdürme" eğilimini kesiyor.

---

## 4. Kısıt A — dalga 10 tahtası (muhafazakâr taban)

Tahta: `topT2@3 buyuT2@5 okcuT2@1 topT2@2 buyuT1@0 okcuT1@4 topT1@6 buyuT1@7`

| Düşman | Tavan | Etkin HP | Oran | %15 payı |
|---|---|---|---|---|
| Goblin | 571 | 45 | %7,9 | ✓ |
| Ork Savaşçı | 710 | 110 | %15,5 | ✓ |
| Kurt Binicisi | 301 | 60 | %19,9 | ✓ |
| Harpi | 252 | 70 | %27,7 | ✓ |
| Zırhlı Ork | 680 | 160 | %23,5 | ✓ |
| Şaman | 689 | 130 | %18,9 | ✓ |
| Trol | 988 | 400 | %40,5 | ✓ |
| Örümcek Ana | 632 | 150 | %23,7 | ✓ |
| Örümcek Yavrusu | 381 | 30 | %7,9 | ✓ |
| **Ogre Şef** | **761** | **700** | **%92,0** | **✗** |

Sekizi rahat geçiyor. **Boss tek başına payı tutturmuyor** — S65.

### S65 — boss tam sınırda

| Tahta | Nokta dolma | Tavan | Boss oranı | %15 payı |
|---|---|---|---|---|
| Muhafazakâr (erken başlatma yok) | dalga **7** | 761 | **%92,0** | ✗ |
| Gerçekçi (erken başlatma kullanılmış) | dalga **6** | 818 | **%85,6** | ✓ (kıl payı) |

Tasarım bandı (§6) **%75-85**. Gerçekçi tahta bandın **0,6 puan** üstünde.

**Sebep ölçüldü:** M3'te türetilen tahta iki aileliydi (Top/Okçu); M4'te üç
aile olunca türetici 3'lü döngüye geçti ve Büyü T1'in **100 altını** (Okçu 70)
noktaları doldurmayı pahalılaştırdı. Nokta dolma dalgası muhafazakâr tabanda
6'dan **7'ye** kaydı.

**Boss öldürülebiliyor** — canlı oyunda 700 HP'den **18 HP'ye** düştü ve
öldü. Yani sınırda ama geçilebilir; §6'nın "boss zirve olmalı" niyetiyle
uyumlu. Sayı **değiştirilmedi**: M7'de Harita 2-3 ile birlikte üç bağlı
büyüklük (kapsama · tahta · boss HP) tek seferde bakılacak. Tek başına boss
HP'sini düşürmek `research/01` §12'nin "türetme yönü" uyarısını çiğnerdi.

---

## 5. Canlı doğrulama

Tarayıcı bölmesi kompoze etmediği için `requestAnimationFrame` hiç
tetiklenmiyor ve Phaser döngüsü donuyor. Çözüm M3'te bulunmuştu:
`game.loop.step(t)` elle sürülüyor. Yan faydası daha iyi bir yöntem —
kare sayısı **tam** ve tekrarlanabilir.

| # | İddia | Ölçüm |
|---|---|---|
| L1 | 10 dalga baştan sona | **evet**, 19/20 can, ★★ |
| L2 | Bilgi paneli etkin DPS — Okçu T2 vs boss | **1,95** (matris ile birebir) |
| L3 | Bilgi paneli etkin DPS — Büyü T2 vs boss | **13,50** (matris ile birebir) |
| L4 | Buz yavaşlatma çarpanı | tam **0,50** |
| L5 | Harpi uçan hattı sapması | **0,31 px** |
| L6 | Boss refakatsiz süre | **10,2 sn** (`BOSS_REFAKAT_GECIKMESI_SN = 8` + doğum gecikmesi) |
| L7 | Boss kalan HP | 700 → **18** (öldü) |
| L8 | Uçan hattı ipucu | dalga 6/8/9/10 **açık**, 5/7 **kapalı** |
| L9 | Dalga 10 kare maliyeti | ort **0,946 ms** · p95 **1,3** · maks **1,7** |

**L9, M3'ün 1,93 ms'inden düşük** — dalga 10'un düşman sayısı bossla birlikte
azaldığı için (11 birim, M3'te 10 ama tamamı aynı anda). Efekt sistemi ölçülen
kare maliyetini artırmadı.

---

## 6. Yakalanan hatalar

### Sahne yeniden başlatmada hayalet kuleler

Canlı testte yakalandı: menüden yeni oyun başlatınca **önceki oyunun yok
edilmiş kuleleri** yapı noktalarını dolu gösteriyordu.

Sebep M0'daki `once`/`on` hatasının **aynı sınıfı**: alan başlatıcıları
yalnız bir kez koşuyor, `create()` her yeniden başlatmada. `#towerBySpot`
bir alan başlatıcısında dolduruluyordu.

Düzeltme: `create()`'in başında **tüm değişebilir durum açıkça sıfırlanıyor**
(`#towerBySpot`, `#hoveredSpot`, `#selectedSpot`, `#flyerHintOn`,
`#mermiTepe`, `#menu`). Yorumla birlikte, çünkü bu tuzak üçüncü kez çıktı.

### Kısıt A boss'ta kırıldı

M3'ün 2'li döngüsüyle türetilen tahtada **hiç Büyü yoktu**; boss'a Okçu
1,95 DPS vuruyordu ve tavan boss'un altına düşüyordu. Türetici
`research/01`'in referans tahtasını **birebir** üreten 3'lü döngüye
(Top/Büyü/Okçu) çevrildi.

### `placeTower` geliştirme kancası M2 kalıntısıydı

`towerId === 'top' ? TOP : OKCU` — üçüncü aile eklendiğinde `'buyu'` sessizce
Okçu kuruyordu. `getTower(...)` ile değiştirildi. Yalnız `import.meta.env.DEV`
altında olduğu için yayın yapısını etkilemiyordu, ama **canlı doğrulamanın
tamamı bu kancadan geçiyor** — yani yanlış ölçüm üretiyordu.

---

## 7. Bekçiler

9/9 yeşil. M4'te ikisi gerçek ihlal yakaladı:

- **k.9** — `ProjectileSystem` içinde bir `Math.sqrt`. `math.moveToward`'a
  taşındı (konum için meşru kök, karşılaştırma için değil).
- **k.7** — yeni `BitmapText` kullanımında yanlış alarm. Bekçi
  "`setText` çağıran dosya `Text` **üretmemeli**" biçimine daraltıldı ve
  daraltmanın hâlâ ihlali yakaladığı **kasıtlı bozmayla** doğrulandı.

Bekçi ayrıca `src/__tmp__` (EPERM) yolunu **yüksek sesle** raporluyor.
NTFS'te silinmeyi bekleyen bir Vite izleyici artığı; bekçi eskiden bu
yüzden çöküyordu, artık kör kaldığı kapsamı yazıp devam ediyor.

---

## 8. M5'e taşınanlar

| İş | Neden M4'te yapılmadı |
|---|---|
| ~~`ReferenceBoard`'a hedefleme modu alanı~~ | ✅ **kapandı** — M7 öncesi kapanış turu |
| Kışla + 9 engelleme kuralı | M5 kapsamı; Trol satırının tam cevabı |
| Meteor/yetenekler | M5 kapsamı; boss satırının tam cevabı |
| Kurt Binicisi tehdidinin keskinleştirilmesi | Harita 2-3 işi (M7) |
| Boss payının yeniden değerlendirilmesi (S65) | Üç bağlı büyüklük M7'de birlikte bakılacak |

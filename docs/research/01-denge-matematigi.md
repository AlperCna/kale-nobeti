# 01 — Denge Matematiği

Bu dosya `GAME-DESIGN.md` §6'daki sızıntı formülünün neden yanlış olduğunu,
doğrusunun ne olduğunu ve mevcut sayılara uygulandığında ne çıktığını içerir.

---

## 1. Temel eşitlik

Sektörde tekrar tekrar aynı yere varılıyor:

> **Toplam Hasar = DPS × Düşmanların Menzilde Geçirdiği Süre** **[D]**

Bu bariz görünüyor ama ikinci terim, TD tasarımında en çok yanlış hesaplanan
büyüklük. Çünkü "menzilde geçirilen süre" yol uzunluğuna değil, **kulenin
menzil dairesi içinde kalan yol parçasının uzunluğuna** bağlı.

Alex Loughran'ın elektronik tabloyla yaptığı denge çalışmasında aynı büyüklük
şöyle ifade edilmiş: **[T]**

```
BirGeçişteAtışSayısı = Quotient(EtkiAlanı / Hız, Bekleme)
BirGeçişteHasar      = BirGeçişteAtışSayısı × AtışBaşınaHasar
```

`EtkiAlanı` burada kulenin gördüğü yol parçası. Bölme `Quotient` (tam bölme)
çünkü yarım atış diye bir şey yok — bu, kısa kapsamalı/yavaş kulelerde
gerçekten fark yaratır.

---

## 2. Doğru model: iki ayrı kısıt

`GAME-DESIGN.md` §6 tek bir formül veriyor ve bu formül iki farklı sorunun
melezi. Ayırmak zorunlu, çünkü ikisi farklı tasarım koluyla çözülüyor.

### Kısıt A — Tek düşman dayanıklılığı ("tank sızar mı")

Yalnız yürüyen bir düşmana verilebilecek toplam hasar:

```
ToplamHasar(düşman) = Σ_kule ( DPS_kule × kapsananYol_kule ) / hız_düşman
```

`kapsananYol_kule` = kulenin menzil dairesi içinde kalan yol uzunluğu (piksel).

**Bu değer kule yerleşiminden bağımsızdır.** İki kule aynı yerde kümelense de,
yola dağılsa da, her biri kendi kapsadığı parçada ateş eder ve toplam aynıdır.
Yerleşim yalnızca *ne zaman* hasar verildiğini değiştirir, *ne kadar* değil.

Bu kısıt boss'ları, Trol'ü ve Zırhlı Ork'u yönetir.

### Kısıt B — Dalga verimi ("sürü sızar mı")

```
ToplamHasar(dalga) = Σ_kule ( DPS_kule × aktifSüre_kule )
aktifSüre_kule ≈ dalgaSüresi × aktiflikOranı_kule
```

Burada yerleşim **çok** önemli, çünkü akış halinde düşman varken kule sürekli
hedef bulur. Ölçülmüş aktiflik oranları: **[D]**

| Kapsanan düz yol parçası sayısı | Aktiflik oranı |
|---|---|
| 1 (düz hat ortası) | ~%60 |
| 2 (viraj) | ~%80 |
| 3 (T kavşağı) | ~%95 |
| 4+ (büyük kavşak) | neredeyse sürekli |

Bu kısıt goblin/harpi sürülerini yönetir.

### Neden ikisi de gerekli

Kısıt B'yi geçen bir tahta Kısıt A'da çuvallayabilir (sürüyü eritir, boss'u
geçiremez) veya tersi (tek hedefli sniper duvarı boss'u yıkar, goblin selinde
boğulur). Karşı-oyun tablosunun matematiksel karşılığı tam olarak budur.

---

## 3. `GAME-DESIGN.md` §6'daki hatanın büyüklüğü

Dokümandaki formül:

```
toplamHP < D × L / v          (D = toplam DPS, L = yol uzunluğu)
```

Bu, `kapsananYol = L` demek — yani **her kule yolun tamamını görüyor**
varsayımı. Gerçekte `kapsananYol ≈ 2 × menzil`.

```
HataÇarpanı = L / (2 × menzil)
```

Harita 1 için — **artık tahmin değil, ölçüm** (`M1-T03`):

```
L = 1700 px  (ölçüldü)
ortalama kapsanan yol = 296,3 px  (ölçüldü, menzil 150)

HataÇarpanı = 1700 / 296,3 = 5,74
```

**Doküman savunma kapasitesini ~5,7 kat abartıyor.** M6'daki "her dalga için
`toplamHP < D·L/v` sağlaması yapılacak" maddesi bu haliyle 30 dalganın
hepsini yanlış onaylar.

> `L` başlangıçta dokümanın hiçbir yerinde yazmıyordu; burada "1600-2000 px
> makul" diye tahmin edilmişti. Harita çizilince **1700** çıktı — tahmin
> bandının ortası. İlk hesaptaki `1800 / 300 = 6` bu yüzden büyüklük olarak
> doğruydu; kesin değer **5,74**.

---

## 4. Mevcut sayılara uygulama — Ogre Şef

> ## ✅ ÇÖZÜLDÜ — kapsanan yol ölçüldü (M1)
>
> Bu bölümün ve §5'in tüm sayıları `~300 px/kule` kapsama **varsayımına**
> dayanıyordu ve o varsayım `03-mekanik-tasarim.md` §3'ün "≥ 450 px"
> kriteriyle çelişiyordu. İkisi aynı harita için aynı anda doğru olamazdı.
>
> **Harita 1 çizildi ve ölçüldü** (`M1-T03`, `M1-T09`):
>
> | | |
> |---|---|
> | Yol uzunluğu `L` | **1700 px** |
> | Ortalama kapsama (menzil 150) | **296,3 px** |
> | `ort ÷ 2 × menzil` | **0,988** |
>
> **Bu dosyanın `kapsama ≈ 2 × menzil` modeli %1,2 hatayla doğrulandı.**
> `03`'ün 450 px'i türetilmemişti ("T1 menzilinin 3 katı", hiçbir hesaptan
> gelmiyor) ve §5'teki boss değeriyle aynı anda doğru olamıyordu: 450 px'te
> T2 tavanı 1350 olur, boss 700 tavanın **%52**'sinde kalırdı.
>
> | Kapsama | Menzilde süre | T2 tavanı | Boss 700 = tavanın |
> |---|---|---|---|
> | **296,3 px (ölçülen)** | **10,58 sn** | **889** | **%78,7** ✓ hedef %75-85 |
> | 450 px (`03`, reddedildi) | 16,1 sn | 1350 | %52 |
>
> ### Dürüstlük notu: bu, 300'ün bağımsız kanıtı değil
>
> Koordinatlar kapsama hedefinden **türetildi** — boss 700 ve T2 tahtası
> sabit tutulup gereken ortalama kapsama çıkarıldı (≈292 px) ve yol onu
> tutturacak şekilde çizildi. Ölçüm bu yüzden "300 doğruydu" demiyor;
> **"450 px, §5'teki boss değeriyle aynı anda doğru olamıyor"** diyor.
> Çelişki bu gerekçeyle 300 lehine kapandı.
>
> ### Türev sonuç a) "Mutlak tavan 2131" — ayakta, ama payı ince
>
> Bu iddia `kapsama = 2 × menzil` ile hesaplanmıştı. Gerçek menzillerde
> ölçülen kapsamayla yeniden hesaplandı:
>
> | Kule | Menzil | Ölçülen kapsama | Süre | Hasar |
> |---|---|---|---|---|
> | Havan ×3 | 230 | 476 px | 17,0 sn | 872 |
> | Yıldırım ×3 | 170 | 340 px | 12,1 sn | 574 |
> | Keskin Nişancı ×2 | 260 | 557 px | 19,9 sn | 382 |
> | Meteor ×2 | — | — | — | 360 |
> | **MUTLAK TAVAN** | | | | **2188** |
>
> **2188 < 2200 — iddia ayakta, ama yalnız %0,5 pay var** (eski tahmin
> 2131 idi). Doğru ifade "matematiksel olarak imkânsız" değil,
> **"pratikte imkânsız"**: senaryo ekonomik olarak zaten erişilemez ve
> %0,5 pay tek bir menzil düzeltmesiyle kapanır.
> `src/data/referenceBoards.test.ts` bu payı bekçiye bağladı.
>
> Not: geniş menzilli kulelerde `ort ÷ 2r` oranı 1'in üstüne çıkıyor
> (260 px menzilde 1,070) — viraj noktaları yolu daha çok kez görüyor.
> Tavanın 2131'den 2188'e çıkmasının sebebi bu.
>
> ### Türev sonuç b) §3'teki "tam 6 kat" → **5,7 kat**
>
> `HataÇarpanı = L / kapsananYol = 1700 / 296,3 = 5,74`. Eski formülün
> yanlış olduğu bulgusu etkilenmiyor, yalnız büyüklüğü — ve 6'ya çok yakın.
>
> ### Kalan sınır
>
> Yukarıdaki oranlar **Harita 1 geometrisiyle** hesaplandı. Trol, Şaman,
> Zırhlı Ork ve Örümcek Ana harita 2-3'te sahneye çıkıyor; oradaki HP
> çarpanı (1,6 / 2,6) ve yapı noktası sayısı (10 / 12) farklı. Gerçek
> sağlamaları o haritalar çizilince (M7) yapılacak.

### Girdi

| | |
|---|---|
| Boss HP | 2200 (harita 1, çarpan 1.0) |
| Boss zırh | 10 |
| Boss büyü direnci | %25 |
| Boss hızı | 28 px/sn |
| Yapı noktası | 8 |
| Menzil (T2) | 150-180 px |
| Kapsanan yol (düz yol varsayımı) | ~300 px/kule |
| Menzilde süre | 300 / 28 = **10.7 sn/kule** |

### Gerçekçi bir Tier 2 tahtası

Harita 1 ekonomisi 8 noktayı T1 ile doldurup yalnızca 3-4 T2 yükseltmeye
yetiyor (hesap §6'da). İyimser senaryo: hepsi T2.

| Kule | Ham hasar | Boss'a etkin hasar | Atış/sn | Etkin DPS |
|---|---|---|---|---|
| Büyü T2 ×3 | 24 | `24 × 0.75 = 18` | 0.75 | **13.5** |
| Top T2 ×3 | 34 | `34 − 10 = 24` | 0.55 | **13.2** |
| Okçu T2 ×2 | 10 | `10 − 10 = 0 → taban %15 = 1.5` | 1.3 | **1.95** |

```
ΣDPS = 3(13.5) + 3(13.2) + 2(1.95) = 40.5 + 39.6 + 3.9 = 84.0
ToplamHasar = 84.0 × 10.7 = 899
```

**899 < 2200.** Boss %59 canla kaleye varıyor. Sızma cezası 10 can → 20 canlık
havuzun yarısı tek düşmandan gidiyor.

### Tavan senaryosu: her şey Tier 3 + yetenekler

T3 menzilleri farklı olduğu için kapsama kule kule hesaplanmalı
(`kapsama = 2 × menzil`, `süre = kapsama / 28`):

| Kule | Boss'a etkin DPS | Menzil | Kapsama | Süre | Hasar (adet) |
|---|---|---|---|---|---|
| Havan ×3 | `(48−10) × 0.45 = 17.1` | 230 | 460 | 16.4 sn | 280 → **841** |
| Yıldırım ×3 | `30 × 0.75 × 0.7 = 15.75` | 170 | 340 | 12.1 sn | 191 → **573** |
| Keskin Nişancı ×2 | `(26−10) × 0.6 = 9.6` | 260 | 520 | 18.6 sn | 179 → **357** |

```
Kulelerden gelen tavan = 841 + 573 + 357 = 1771
Meteor ×2 (180 gerçek hasar, 45 sn bekleme, boss 64 sn yolda) = +360
MUTLAK TAVAN = 2131
```

**2131 < 2200.** Yani 8 yapı noktasının hepsi Tier 3 olsa, hepsi boss'a
optimal kule seçilse ve Meteor iki kez kullanılsa **bile** boss ölmüyor.
Üstelik bu senaryo zaten imkânsız (ekonomi 8 kuleyi T3'e çıkarmıyor) ve
boss'un yanındaki 27 puanlık refakat ateşin bir kısmını çekiyor. Kışla da
işe yaramaz: doküman boss'un askerleri tek vuruşta öldürdüğünü söylüyor.

### Sonuç

Ogre Şef, mevcut haliyle harita 1'de **geçilemez.** Üç düzeltme yolu var:

**A) Boss HP'sini düşür.** Gerçekçi T2 tahtasının tavanı 899. Boss'un zorlayıcı
ama geçilebilir olması için tavanın %75-85'i uygun: **HP ≈ 650-750.**

**B) Yol geometrisini değiştir.** 2200 HP'yi 84 DPS ile öldürmek için gereken
ortalama kapsanan yol:

```
2200 = 84 × (kapsananYol / 28)  →  kapsananYol = 733 px/kule
```

Yani her yapı noktası **733 px** yol görmeli — düz kapsamanın 2.4 katı.
Bu ancak yılankavi/saç tokası viraj yapısıyla olur ve haritayı bilinçli
öyle çizmek gerekir. Yapılabilir ama harita 1'in "öğretici" rolüyle çelişir.

**C) Ekonomiyi aç.** T3'ün 10. dalgadan önce erişilebilir olması için harita 1
gelirini ~%60 artırmak gerekir. Bu ayrıca §6'daki ayrı sorunu da çözer.

**Önerim: A + C birlikte.** Boss 700, gelir +%40. B'yi harita 3'e sakla.

---

## 5. Diğer düşmanların sağlaması

Aynı formülle (`ΣDPS × kapsama / hız`), T2 tahtası ve 300 px kapsama:

| Düşman | Hız | Menzilde süre | Etkin ΣDPS* | Tavan hasar | HP | Sonuç |
|---|---|---|---|---|---|---|
| Goblin | 60 | 5.0 sn | ~150 | 750 | 45 | çok rahat |
| Ork Savaşçı | 45 | 6.7 sn | ~135 | 905 | 110 | rahat |
| Zırhlı Ork | 38 | 7.9 sn | ~95 | 750 | 160 | rahat |
| Kurt Binicisi | 110 | **2.7 sn** | ~145 | 392 | 60 | rahat |
| Harpi | 75 | **?** | **?** | **?** | 70 | **bkz. §7** |
| Şaman | 42 | 7.1 sn | ~110 | 781 | 130 | rahat (+iyileşme) |
| Trol | 30 | 10.0 sn | ~120 | 1200 | 400 (+6/sn≈380) | dengeli |
| Örümcek Ana | 50 | 6.0 sn | ~130 | 780 | 150 (+3×30) | rahat |
| **Ogre Şef** | 28 | 10.7 sn | 84 | **899** | **2200** | **imkânsız** |

\* Zırh ve büyü direncine göre değişiyor; zırhsız düşmanlarda okçular tam
hasar verdiği için ΣDPS yükseliyor.

**Okunacak şey:** boss dışında her düşmanın tavanı HP'sinin 3-8 katı. Yani
tekil düşmanlar fazla kolay, boss imkânsız. Eğri değil, uçurum. Trol tek
sağlıklı nokta.

Öneri: ara düşmanların HP'lerini yükseltmek yerine **dalga kompozisyonunu
yoğunlaştır** (Kısıt B'ye yüklen) ve boss'u indir. Böylece tekil okunabilirlik
korunur, zorluk kalabalıktan gelir — bu zaten dokümanın §7'deki bildirilmiş
niyeti.

---

## 6. Ekonomi sağlaması — harita 1

### Toplam altın arzı **[H]**

Bütçe formülü `budget(n) = round(10 × 1.20^(n−1))`:

```
Σ(n=1..10) = 10 × (1.20^10 − 1) / 0.20 = 10 × 25.96 = 259.6 puan
```

Altın/puan oranları (dokümandaki tablodan):

| Düşman | Altın | Puan | Altın/Puan |
|---|---|---|---|
| Goblin | 3 | 1 | 3.00 |
| Ork Savaşçı | 5 | 2 | 2.50 |
| Zırhlı Ork | 8 | 4 | 2.00 |
| Harpi | 6 | 3 | 2.00 |
| Kurt Binicisi | 5 | 3 | 1.67 |
| Şaman | 10 | 5 | 2.00 |
| Trol | 15 | 8 | 1.88 |
| Örümcek Ana | 8 | 6 | **1.33** |
| Ogre Şef | 120 | 25 | **4.80** |

Ortalama ~2.2 (boss hariç). Toplam:

| Kaynak | Altın |
|---|---|
| Başlangıç | 200 |
| Öldürme (234.6 puan × 2.2) | ~516 |
| Boss | 120 |
| Dalga bonusu `Σ(20 + 2n)` | 310 |
| Erken başlatma (0-20/dalga) | 0-200 |
| **Toplam** | **1146 - 1346** |

### Harcama tarafı

Ailelerin T1 ortalaması: `(70 + 110 + 100 + 90) / 4 = 92.5`
8 noktayı doldurmak: **740 altın.**
Kalan: **406-606.**
T1→T2 ortalaması: `(110 + 160 + 150 + 140) / 4 = 140` → **3-4 yükseltme.**
T2→T3: 170-240 → **sıfır.**

### İki sonuç

1. **Tier 3 harita 1'de hiç görülmüyor.** Tasarımın en ilginç kısmı (iki dallı
   uzmanlaşma) oyuncuların çoğunun oynadığı tek haritada görünmez.
2. **Altın/puan oranı ters teşvik veriyor.** Örümcek Ana 1.33, boss 4.80.
   Yani "zor düşman = az altın". Oyuncu Örümcek Ana'lı dalgada fakirleşiyor.
   Oranı 2.0-2.5 bandında sabitlemek daha sağlıklı: Örümcek Ana 8 → **13**,
   boss 120 → 55 (HP düşerse ödül de düşmeli).

### Harita çarpanı sorunu

`hpMultiplier` yalnız HP'ye uygulanıyor; altın ve kule maliyetleri sabit.

| Harita | HP çarpanı | Altın/HP oranı |
|---|---|---|
| 1 | 1.0 | %100 |
| 2 | 1.6 | %62 |
| 3 | 2.6 | %38 |

Yapı noktası artışı (8 → 10 → 12) bunu telafi etmiyor: nokta arttıkça doldurma
maliyeti de artıyor. Harita 3'te oyuncunun eline 12 noktayı doldurmaya bile
yetmeyen para geçecek.

**Düzeltme:** öldürme altınını `hpMultiplier` ile ölçekle, veya `MapDef`'e
`goldMultiplier` ve `startGold` alanları ekle.

---

## 7. Uçanlar — hesaplanamayan durum

Harpi yolu takip etmiyor, `flyerPaths` üzerinden düz gidiyor. Bu, Kısıt A'yı
tamamen değiştiriyor: kapsanan yol artık kule menzillerinin uçuş hattını kesip
kesmediğine bağlı, ve bu **harita çizimiyle** belirleniyor.

En kötü durum: uçuş hattı hiçbir yapı noktasının menzilinden geçmiyor →
kapsanan yol 0 → harpi garantili sızıyor.
En iyi durum: hat 4 noktanın üstünden geçiyor → harpi anında eriyor.

Yani harpiler şu an **yazı-tura**. Çözüm §3'te (`03-mekanik-tasarim.md` §3).

Zorunlu doğrulama: her harita için `flyerPaths` çizildikten sonra
"kaç yapı noktası uçuş hattını kesiyor" sayısı ölçülmeli ve
**en az 3** olmalı (8 noktalı haritada). Bu bir kabul kriteri olmalı.

---

## 8. Dalga temposu — doğrulanmış kalıplar

**Zorluk eğrisi doğrusal değil üstel olmalı, ama tekdüze rampa yorucu;
zirveler ve nefes alma anları planlanmalı.** **[T]**
Mevcut `1.20^(n−1)` üstel — doğru. Ama nefes anı yok: her dalga bir öncekinden
büyük. Kingdom Rush'ın çözümü ölçülmüş: **5. seviye bilinçli olarak baskıyı
düşürüyor** ve güçlü bir kuleyi hemen veriyor. **[D]**

Öneri: dalga 4 ve 7'de bütçeyi `0.85 ×` uygula. Formül:

```ts
const BREATHER = new Set([4, 7]);
budget(n) = round(10 * 1.20**(n-1) * (BREATHER.has(n) ? 0.85 : 1));
```

**Grup içi tempo formülü:** **[T]**
```
düşmanlarArasıBekleme = sabit / dalgaBoyu
dalgaSonrasıBekleme   = sabit × dalgaBoyu
```
Yani kalabalık dalgalar daha sık doğurur ama daha uzun nefes bırakır.
Mevcut `WaveGroup.spawnDelay` sabit; bu formülle üretilmesi daha iyi.

**Düşman tanıtım sırası (Kingdom Rush ölçümü):** **[D]**
- Seviye 1-2: yalnız temel tipler (goblin, ork, kurt)
- Seviye 3-7: zırh, uçan, özel tehditler kademeli
- Seviye 8-12: kombinasyon ve çoklu yol

Mevcut plan 3 haritaya 9 düşman sıkıştırıyor. Harita 1'in 10 dalgasında en
fazla **4 tip** olmalı (goblin, ork, kurt binicisi, harpi); zırhlı ork ve şaman
harita 2'ye, trol/örümcek harita 3'e.

---

## 9. Kule spam'i vs yükseltme

Genel kural: **tam yükseltilmiş bir kule, üç temel kuleden iyidir** — ama bu
oyunun tasarımına bağlı ve kolayca tersine dönüyor. **[T]**
Defense Grid 2'de ekonomi yanlışlıkla çok kule kurmayı ödüllendirmiş ve
istatistikler yükseltmenin "sahte ekonomi" olduğunu göstermiş. **[T]**

Kingdom Rush'ın çözümü doğrudan: **yapı noktası sayısını kısıtla.**
"Ucuz bina spam'i yaparsan yer kalmaz." **[D]**

Kale Nöbeti'nde yapı noktası zaten kısıtlı (8/10/12) — doğru karar. Ama
sağlama gerekiyor. Yükseltmenin verimli olması için:

```
DPS(T2) / Maliyet(T2 kümülatif) > DPS(T1) / Maliyet(T1)
```

| Aile | T1 DPS/altın | T2 DPS/altın (kümülatif) | Yükseltme verimli mi? |
|---|---|---|---|
| Okçu | `6×1.1/70` = 0.094 | `10×1.3/180` = 0.072 | **HAYIR** |
| Top | `22×0.5/110` = 0.100 | `34×0.55/270` = 0.069 | **HAYIR** |
| Büyü | `14×0.7/100` = 0.098 | `24×0.75/250` = 0.072 | **HAYIR** |

Hiçbir yükseltme altın başına DPS olarak verimli değil. Yükseltme yalnızca
"yer kısıtlı" olduğu için mantıklı — yani 8 nokta dolduktan **sonra**.

Bu aslında çalışabilir bir tasarım (yer kıtlığı yükseltmeyi zorunlu kılar),
ama tek şartla: **8 noktayı doldurmak dalga 4-5'te bitmeli** ki oyuncunun
geri kalan 6 dalgada yükseltmekten başka seçeneği kalmasın. Mevcut ekonomiyle
8 nokta ancak dalga 7-8'de doluyor → yükseltme neredeyse hiç yaşanmıyor.

**Düzeltme:** başlangıç altınını 200 → 280 çıkar veya erken dalga ödüllerini
öne yükle. Hedef: dalga 5 sonunda 8 nokta dolu.

---

## 10. Odaklanma kaybı (overkill) — modellenmemiş risk

Tabloda hesaplanan ΣDPS, tüm kulelerin **farklı** hedeflere vurduğunu varsayar.
Gerçekte `first` hedeflemesi varsayılan olduğu için **bütün kuleler aynı öndeki
düşmana vurur** ve fazla hasar boşa gider.

Loughran'ın tabloda kullandığı basitleştirme kullanışlı: **[T]**
> Üçlü gruplarda ilk düşman %100, ikinci %75, üçüncü %50 hasar alır.

Yani pratik verim ~%75. Yukarıdaki bütün tavan hesaplarını **0.75 ile çarpmak**
gerekiyor:

```
Boss gerçekçi tavan: 899 × 0.75 ≈ 674   (boss yalnızsa overkill yok, 899 geçerli)
Sürü tavanı:         hesaplanan × 0.75
```

Boss tek başına geldiği için ondan etkilenmiyor — ama refakatçi 27 puan
varken kuleler `first` ile refakati vurur, boss'u değil. Bu boss sorununu
**daha da** kötüleştiriyor.

**Tasarım sonucu:** boss dalgasında refakatçiyi ya kaldır ya boss'tan **sonra**
gönder. Ayrıca hedefleme menüsünün varlığı burada kritik: oyuncunun `strongest`
seçebilmesi boss dalgasının tek çözümü.

---

## 11. Kabul kriteri olarak yazılması gereken sağlamalar

Bunlar Vitest'te saf fonksiyon testi olarak yazılabilir — harita verisi
girdi, sonuç boolean.

```ts
// Kısıt A: her düşman tipi için
solo(enemy, board, map) = Σ(dps_i(enemy) * coveredLen_i / enemy.speed)
assert(solo(enemy) > enemy.effectiveHp * 1.15)   // %15 pay

// Kısıt B: her dalga için
wave(w, board, map) = Σ(dps_i * waveDuration * activityRatio_i) * 0.75
assert(wave(w) > totalHp(w) * 1.15)

// Ekonomi: her dalga için
assert(cumulativeGold(n) >= requiredBoardCost(n))
```

`board` burada "dalga N'de oyuncunun makul olarak sahip olacağı tahta".
Bunu tanımlamak gerekiyor — öneri: `referenceBoards.ts` içinde dalga başına
bir referans tahta, dengeleme bu tahtaya karşı yapılır.

Bu üç sağlama yazılırsa `ROADMAP.md` M6'daki denge geçişi elle deneme
olmaktan çıkıp otomatik kontrole dönüşür. **Bunu M3'te yaz, M6'ya bırakma** —
30 dalga elle yazıldıktan sonra hepsinin yanlış olduğunu öğrenmek pahalı.

---

## 12. Boss HP'si nasıl türetilmeli (öneri, uygulanmadı)

§4'teki 700 elle yazılmış bir sayı ve §4'ün başındaki uyarıya bağlı.
Aynı hatayı üçüncü kez yapmamak için kalıcı çözüm: **boss HP'si sabit
olmasın, türetilsin.**

### Öneri

```ts
// data/balance.ts
export const BOSS_CEILING_RATIO = 0.80;

export function deriveBossHp(
  map: MapDef, board: ReferenceBoard, boss: EnemyBase
): number {
  return Math.round(BOSS_CEILING_RATIO * ceilingA(board, map.coverage, boss.speed));
}
```

`enemies.ts` boss satırında sayı durmaz, `hp: 'derived'` işareti durur.
Ekonomi veya harita geometrisi değişince değer kendini düzeltir.

### Ama naif hali Kısıt A testini öldürüyor

§11'deki Kısıt A testi `tavan > HP × 1.15` diyor. HP `0.80 × tavan` olarak
tanımlanırsa test `tavan > 0.92 × tavan` olur — **her zaman geçer, hiçbir
bilgi vermez.** Türetme kalacaksa boss için Kısıt A'nın yerine iki gerçek
sağlama gerekiyor:

1. **Karşılanabilirlik.** Dalga 10'a kadarki kümülatif altın,
   `referenceBoard[10]`'un maliyetini karşılıyor mu? Türetmenin dayandığı
   asıl varsayım bu ve totolojik değil.
2. **Regresyon bandı.** Türetilen boss HP'si `balance.ts`'te ilan edilen
   `[alt, üst]` bandının dışına çıkarsa test kırılır. Ekonomi veya harita
   sessizce boss'u %40 tanklaştırırsa insan bakar.

Kısıt A, elle yazılan tüm düşmanlar için aynen kalır — orada anlamlı.

### Türetme yönü M1'de ters olmalı

Üç bağlı büyüklük var — **harita kapsaması**, **tahta DPS'i**, **boss HP'si** —
ve ancak ikisi sabitlenebilir. Dokümanlar şu an üçünü de bağımsız yazıyor;
§4'teki çelişki bundan çıkıyor.

- **M1'de, harita çizilirken:** boss HP + tahtayı sabitle, **gereken
  kapsamayı türet.** Elinde kalem varken bilmek istediğin şey "yolu ne kadar
  kıvırmalıyım". Uydurulmuş "≥ 450 px" yerine "boss yolun %80'inde ölsün
  diye nokta başına N px lazım" çıktısı alırsın.
- **Haritalar kilitlendikten sonra:** yukarıdaki `deriveBossHp`'ye geç.
  Kapsama artık ölçülmüş bir gerçek.

### Yalnız boss türetilir

Her düşman tahtadan türetilirse "bu düşman duvar, bu chaff" yazarlığı
kaybolur. Boss tek zorluk zirvesi olduğu için istisna. **Trol dahil
diğerleri elle yazılı kalır**, M1'de bir kez yeniden kontrol edilir.

### Uyarı: türetme tahmini yok etmiyor

`referenceBoard` de bir tahmin. Türetme, tahmini boss HP'sinden referans
tahtaya taşıyor — daha iyi bir yer, çünkü tahta tek sayı değil ve oynanınca
doğrulanabiliyor. Ama "kendi kendini düzeltir" fazla iyimser: yanlış referans
tahta yanlış boss üretir ve bunu sessizce yapar. Regresyon bandı bu yüzden var.

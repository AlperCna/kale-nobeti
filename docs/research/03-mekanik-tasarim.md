# 03 — Mekanik Tasarım Bulguları

`GAME-DESIGN.md`'de spesifikasyonu eksik veya hiç olmayan mekanikler.

---

## 1. Kışla engelleme — tam spesifikasyon

`GAME-DESIGN.md` §4.4 kışlayı bir tabloyla geçiyor. Ama engelleme, türün en
çok kenar durum üreten mekaniği ve dokümanda tek bir kural yok. Kingdom
Rush'ın davranışı belgelenmiş; aşağısı ondan türetildi. **[D]**

### Doğrulanmış kurallar

**Bire bir kilitlenme.**
> Her asker yalnızca **bir** düşmanı durdurur; ama askerlerin sayısı
> düşmanlardan fazlaysa, birden çok asker aynı düşmana saldırır ve
> yalnızca biri hasar alır. **[D]**

Bu ikinci kısım önemli ve atlanması kolay: 2 asker 1 düşmanla dövüşürken
düşman yalnızca birine vuruyor, ama iki askerin DPS'i de sayılıyor. Yani
sayı üstünlüğü ikili kazanç veriyor.

**Kilit kırılma koşulları — tam liste.**
> Kilit üç şekilde kırılır: askerin canı sıfırlanır, düşmanın canı sıfırlanır,
> ya da öldürdüğü düşmanı biten asker yeni hedef arar. Düşmanlar askerlerden
> **fazla** olur olmaz, kilidi kırılanlar yola devam eder. **[D]**

**Toplanma noktası.**
> Kışla askerlerini yol üzerindeki bir konumun etrafına yerleştirir; askerler
> düşman yeterince yaklaşana kadar orada bekler, sonra saldırıya atılır.
> Konum "Rally" komutuyla değiştirilir ve kışlanın **toplanma menzili**
> içinde kalmak zorundadır — bu menzil kabaca diğer kulelerin ortalama
> saldırı menzili kadardır. **[D]**

**İki kışlanın aynı noktaya toplanması.**
> İki kışlanın toplanma noktası aynı yere konursa, iki takım güçlü bir
> düşmana grup halinde saldırır, daha çok hasar verir ve daha az hasar alır. **[D]**

Bu, oyuncuya öğretilmesi gereken bir sinerji ve bedava derinlik.

### `GAME-DESIGN.md` §4.4'e yazılması gereken bölüm

```
### Engelleme kuralları

1. Her askerin bir `engagedWith: Enemy | null` alanı, her düşmanın bir
   `blockedBy: Soldier | null` alanı vardır.
2. Asker, aggro yarıçapı (60 px) içindeki en yakın *engellenmemiş* düşmanı
   hedefler ve ona doğru yürür. Temas mesafesinde (20 px) iki taraf da
   kilitlenir; düşmanın yol ilerlemesi durur.
3. Bir düşman aynı anda birden çok asker tarafından dövülebilir. Düşman
   yalnızca `blockedBy` askerine hasar verir; diğerleri bedava DPS ekler.
4. Kilit kırılır: asker ölür / düşman ölür. Askeri ölen düşman, aggro
   yarıçapında serbest asker varsa yeniden kilitlenir, yoksa yürümeye devam
   eder.
5. Askerler düşmandan azsa, fazla düşmanlar hiç durmadan geçer. Bu bilinçli:
   kışla bir baraj değil, bir zaman kazanma aracıdır.
6. Toplanma noktası kışladan `rallyRange = 160 px` içinde olmalı ve yola
   `<= 40 px` mesafede bir noktaya yapışır (yol dışına konamaz).
7. Ölen asker `respawn` süresi sonra kışlada doğar ve toplanma noktasına
   *yürür*; yürürken engelleme yapmaz (`engagedWith` null kalır).
8. Uçanlar engellenemez: `enemy.flying === true` ise asker onu hedeflemez.
9. Ogre Şef askerleri tek vuruşta öldürür — kışla boss'a karşı yalnızca
   ~1 saniyelik gecikme sağlar. Bu bilinçlidir.
```

### Yol haritası etkisi

Bu 9 kural, `TowerSystem`'e sıkıştırılamaz. Kendi sistemi (`BarracksSystem`)
ve kendi kilometre taşı olmalı. Öneri: **M4'ü ikiye böl** — M4a (kule aileleri
+ yükseltme + düşman seti), M4b (kışla + asker + toplanma + yetenekler).

---

## 2. Uçanlar — mevcut tasarım kırık, Defense Grid'in çözümü var

### Sorun

Tür literatüründe tanımlanmış ikilem: **[T]**

> Uçan birimler pahalı olduğunda, TD oyunları onları boss veya beklenmedik
> zorluk olarak yerleştirir ve bu, o ana kadar yapılmış tüm tasarım işine
> tükürür gibi görünür; ucuz olduklarında ise ya kara birimleriyle aynı
> kulelerin hedefi olurlar ya da aynı yola hapsedilirler.

Kale Nöbeti şu an birinci tarafta: Harpi ayrı bir düz hattan gidiyor,
oyuncu o hattı görmüyor, ve hattın kule menzillerinden geçip geçmediği
haritayı çizenin şansına kalmış (`01-denge-matematigi.md` §7).

### Doğrulanmış çözüm

Defense Grid'in yaklaşımı: **[T]**

> Her seviyenin başındaki bir **iz çizgisi**, o seviyede hava birimi olduğunu
> *ve* saldırı yollarını gösterir.

Yani uçan hattı bir sır değil, **planlama bilgisi**. Bu, dokümanın kendi
"dalga telegrafı zorunlu" ilkesiyle birebir aynı mantık — telegraf ne
geleceğini söylüyor, iz çizgisi nereden geleceğini.

### `GAME-DESIGN.md`'ye eklenecek

```
### Uçan hattı gösterimi (zorunlu)

- Hazırlık aşamasında, o dalgada uçan varsa `flyerPaths` haritada soluk
  kesikli altın bir çizgi olarak gösterilir. Dalga başlayınca sönümlenir.
- Bir yapı noktası seçildiğinde menzil dairesi çizilirken, uçan hattını
  kesiyorsa çizginin kesişen parçası vurgulanır. Oyuncu "bu kule harpilere
  yetişir mi" sorusunu tıklamadan cevaplayabilmeli.

### Harita kabul kriteri

Her haritada `flyerPaths`, yapı noktalarının **en az %40'ının** menzilinden
geçmeli (8 noktalı haritada ≥ 3). `util/coverage.ts` ile ölçülür ve testte
sağlanır.
```

### Ek risk: Top kulesi uçana vuramıyor

4 aileden 2'si (Top, Kışla) uçana etkisiz. Yani harpi dalgasında oyuncunun
tahtasının yarısı ölü. Bu doğru karşı-oyun ama şiddeti fazla — özellikle
Top'un T3 dalları (Havan, Barut Fıçısı) toplam yatırımın büyük kısmı olabilir.

Öneri: **Barut Fıçısı** dalına uçanlara vurma yetisi ver (patlama basıncı,
tematik olarak da tutuyor), hasarı %50 azaltılmış olarak. Böylece Top ailesi
tamamen ölü kalmıyor ve T3 dallanması gerçek bir seçim oluyor:
Havan = kara uzmanı, Barut Fıçısı = esnek.

---

## 3. Harita tasarımı — Kingdom Rush'tan doğrulanmış kurallar

**Yapı noktası kısıtı spam'e karşı.** **[D]**
> Ucuz bina spam'i yaparsan, daha fazlasını koyacak yer kalmaz.

Kale Nöbeti bunu zaten yapıyor (8/10/12). Ama `01-denge-matematigi.md` §9
gösteriyor ki bu ancak noktalar **erken dolarsa** işe yarıyor.

**Ayrık yollar.** **[D]**
> Twin River Pass'te iki yol yalnızca sonda birleşir.

Kale Nöbeti'nin harita 2'si (Y ayrımı) ve 3'ü (iki giriş) bu kalıbı izliyor.
Doğru. Uyarı: ayrık yolda savunma kapasitesi ikiye bölünüyor, yani
`01-denge-matematigi.md` §2 Kısıt A hesabı **her kol için ayrı** yapılmalı.
Toplam DPS yanıltıcı olur.

**Nefes seviyesi.** **[D]**
> Seviye 5 (Silveroak Forest) bilinçli olarak baskıyı düşürüyor ve
> Keskin Nişancı kulesini hemen veriyor, tırmanış öncesi yorgunluğu önlüyor.

Kale Nöbeti'nde harita başına 10 dalga var; nefes dalga 4 ve 7'ye konmalı
(`01-denge-matematigi.md` §8).

**Mekanik tanıtım takvimi.** **[D]**
> Zırh 1. seviyede tanıtılıyor ama karmaşık varyasyonlar (Dark Knight %80
> savunma) çok sonra geliyor.

Yani mekanik erken, **uç örneği geç.** Kale Nöbeti'ne uyarlaması:
zırh kavramı harita 1'de düşük zırhlı (2) Ork Savaşçı ile tanıtılmalı,
Zırhlı Ork (8) harita 2'ye ertelenmeli.

### Kapsanan yol uzunluğu bir harita özelliği olmalı

`01-denge-matematigi.md` §4'ün gösterdiği gibi, boss'un öldürülebilirliği
doğrudan yapı noktalarının kapsadığı yol uzunluğuna bağlı. `MapDef`'e
türetilmiş bir alan eklenmeli:

```ts
interface MapDef {
  // ... mevcut alanlar
  /** util/coverage.ts ile üretilir, elle yazılmaz. Denge testleri kullanır. */
  readonly coverage: { spotIndex: number; coveredPx: number }[];
}
```

Ve her harita için bir hedef: yapı noktası başına ortalama kapsanan yol
**≥ 450 px** (T1 menzil 150'nin 3 katı). Bunun altındaysa harita düz demektir
ve boss dalgası çalışmaz.

> ## ⚠️ ÇÖZÜLMEMİŞ VARSAYIM — kapsanan yol
>
> **Yukarıdaki 450 px, `01-denge-matematigi.md` §4-§5 ile çelişiyor.**
> O dosya bütün tavan hesaplarını `kapsama ≈ 2 × menzil` = **300 px** ile
> yapıyor ve Ogre Şef HP'sini (700) o hesaptan türetiyor.
>
> | Kapsama | T2 tavanı (boss) | Boss 700 = tavanın |
> |---|---|---|
> | 300 px (`01` §4) | 899 | %78 ← hedeflenen |
> | 450 px (bu bölüm) | **1350** | **%52** |
>
> 450 px doğruysa boss yolun yarısında ölür ve final dalgası olay olmaktan
> çıkar. **Ayrıca 450 px'in kaynağı yok** — "T1 menzilinin 3 katı" bir
> hesap değil, elle konmuş bir sayı. Çelişkinin kökeni bu.
>
> Bu kriter, ölçüm yapılana kadar **bağlayıcı değildir.**
> Tam analiz: `01-denge-matematigi.md` §4 "Çözülmemiş varsayım".
> Çözülme noktası: M1, `util/coverage.ts` ile ölçüm.

---

## 4. Yerleşim öğretimi — bedava derinlik

Ölçülmüş bulgular, oyuncunun yerleşimi öğrenmesinin ne kadar fark ettiğini
gösteriyor: **[T]**

- Düz hattın **arkasına** konan kule segment boyunca "8, 10, bazen 12 saniye
  kesintisiz ateş" ediyor; **önüne** konan yalnızca 2 saniye.
- Ölçülen örnekte aynı kule, aynı yükseltme, aynı destek: **2 karo sola**
  taşınınca **%44 daha fazla** toplam hasar.
- 90 derecelik virajlarda kötü konumlanmış kuleler dönüş süresi yüzünden
  **etkin DPS'in %15-20'sini** kaybediyor.
- "2 karo kuralı": kuleyi yol boyunca 2 karo kaydırmak çoğu zaman bir
  kapsama bölgesini **tamamen ekliyor veya çıkarıyor.**

### Kale Nöbeti'ne uyarlama

Sabit yapı noktalı bir oyunda oyuncu kuleyi kaydıramaz — ama **hangi noktayı
seçeceğini** seçebilir. Yani yukarıdaki fark, "hangi noktaya hangi kule"
kararına dönüşüyor. Bunu okunur kılmak için:

```
Yapı noktası üstüne gelindiğinde (hover), o noktanın menzil dairesi ile
birlikte kapsadığı yol parçası kalın altın bir çizgiyle vurgulanır.
Oyuncu böylece "bu nokta yolun ne kadarını görüyor" sorusunu bakarak
cevaplayabilir.
```

Bu tek özellik, dokümanın "bilgi eksikliği türün 1 numaralı şikâyeti"
tespitine verilebilecek en yüksek getirili cevap. Uygulaması ucuz:
`coveredLength` fonksiyonu zaten kapsanan noktaları biliyor.

Ayrıca `GAME-DESIGN.md` §2'deki "imza öğesi" ile de uyumlu — kesikli altın
menzil çemberi + kalın altın yol vurgusu aynı görsel dili konuşuyor.

---

## 5. Hedefleme önceliği — tanımlar netleşmeli

`GAME-DESIGN.md` §4.5 dört mod sayıyor ama tanımları yok. Belirsizlikler:

| Mod | Belirsizlik | Öneri |
|---|---|---|
| `first` | Yolda en ileri = `pathProgress` en yüksek. Ayrık yolda? | Kaleye kalan **mesafe** en az olan |
| `last` | Aynı, tersi | Kaleye kalan mesafe en çok olan |
| `strongest` | Maksimum HP mi, **mevcut** HP mi? Trol yenilendiği için fark eder | Maksimum HP (kararlı hedef; mevcut HP hedef titremesi yapar) |
| `closest` | Kuleye öklit mesafe | Aynen |

**Kritik ayrıntı:** `strongest` mevcut HP'ye bakarsa, hedef her karede
değişebilir ve kule dönüş animasyonuyla titrer. Maksimum HP kararlı.

Ayrıca dördüne bir beşinci eklemeye değer: **`weakest`** (bitirici vuruş için).
Dokümanın kendi karşı-oyun tablosunda "Şaman'ı arkadan seç" senaryosu var;
bu aslında `last` ile çözülüyor, tamam. Ama Örümcek Ana yavruları için
`weakest` doğal cevap. Maliyeti sıfır — aynı seçici arayüzü.

---

## 6. Erken başlatma bonusu — ters teşvik

`GAME-DESIGN.md` §6: hazırlık sayacında kalan her saniye için +1 altın,
sayaç 20 sn.

| Dalga | Bonus | O dalganın diğer geliri | Bonusun payı |
|---|---|---|---|
| 1 | 20 | ~52 | **%28** |
| 10 | 20 | ~190 | **%10** |

Erken oyunda devasa, geç oyunda önemsiz. İki sorun:

1. **Yeni oyuncuya "telegrafı okuma, hemen bas" öğretiyor** — dokümanın
   telegrafı zorunlu kılan kararıyla doğrudan çelişiyor.
2. Geç oyunda mekanik ölüyor, yani tempo katkısı tam da gerektiği yerde yok.

**Düzeltme:**
```
erkenBonus(n) = kalanSaniye × ceil(n / 2)
```
Dalga 1'de ×1 (maks 20), dalga 10'da ×5 (maks 100). Erken oyunda öğrenmeyi
cezalandırmıyor, geç oyunda gerçek bir karar.

Ek koruma: **ilk 3 dalgada erken başlatma kapalı olsun** (buton dalga 4'te
açılır). Oyuncu önce döngüyü öğrensin.

---

## 7. Bilgi gösterimi — dokümanın kendi teşhisine karşılık

Doküman "bilgi eksikliği türün 1 numaralı şikâyeti" diyor ve M4'te bir
bilgi paneli planlıyor. Araştırma bunu doğruluyor. Panelde olması gerekenler,
`01-denge-matematigi.md`'nin matematiğine göre:

| Gösterge | Neden |
|---|---|
| Ham hasar + atış hızı | Temel |
| **Hasar tipi rozeti** (fiziksel/büyü) | Zırh/direnç kararının tamamı buna bağlı |
| **Etkin DPS, seçili düşman tipine karşı** | Ham DPS yanıltıcı; zırh 10'a karşı okçu 1.95 |
| Menzil (daire) + **kapsanan yol** (kalın çizgi) | §4 |
| Uçana vurur/vurmaz ikonu | Top ailesinin yarısı ölü kalıyor |
| Yükseltme farkı (öncesi → sonrası) | Yükseltme kararı |
| Satış iadesi (%70) | |

En kritik olan üçüncüsü: **etkin DPS**. Okçu T2'nin boss'a 1.95 DPS verdiğini
oyuncu ancak hasar sayılarına bakıp tahmin edebilir. Panelde "Ogre Şef'e karşı:
1.95 DPS" yazması, dokümanın tüm karşı-oyun tasarımını görünür kılar.

Bunun ucuz uygulaması: panelde küçük bir düşman ikonu şeridi, üstüne gelince
o düşmana karşı etkin DPS. Hesap zaten `applyDamage` saf fonksiyonunda var.

---

## 8. Zırh geri bildirimi

`applyDamage`'ın %15 tabanı yüzünden okçu boss'a **1** yazacak, tekrar tekrar.
Doğru davranış, ama oyuncu bunu "kırık" diye okur.

Öneri:
- Taban hasara düşen vuruşlar **gri, küçük** sayı + kalkan ikonu.
- Tam hasar veren vuruşlar parşömen rengi.
- Kritik/zayıflık vuruşları altın + %140 boyut (doküman zaten kritik boyutunu
  tanımlamış).

Üç renk, tek bakışta "bu kule bu düşmana yaramıyor" mesajı. Maliyeti bir
`tint` çağrısı.

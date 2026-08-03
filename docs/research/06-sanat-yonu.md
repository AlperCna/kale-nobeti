# 06 — Sanat Yönü: Maliyet ve Gerçekçi Alternatifler

`GAME-DESIGN.md` §2 tezhipli el yazması estetiği tanımlıyor. Bu bölüm o
kararın üretim maliyetini ölçüyor ve tek kişilik bir bütçeye sığan varyantını
öneriyor.

---

## 1. Referans oyunlar ve ekip büyüklükleri

Bu estetiğin bilinen örnekleri: **[T]**

| Oyun | Stil | Üretim |
|---|---|---|
| **Pentiment** (Obsidian) | 16. yy Bavyera el yazması + gravür | **Zirvede ~13 kişilik ekip** **[D]** |
| **Inkulinati** (Yaza Games) | Ortaçağ el yazması, canlı mürekkep | Bağımsız stüdyo, Gamescom 2022'de En İyi Bağımsız Oyun |
| **Gleamlight** | Tamamen vitraydan örülmüş dünya | Stüdyo yapımı |
| **Saga of Sins** | Vitray | Stüdyo yapımı |
| **Glass Masquerade** | Art Deco + vitray | Küçük ekip, ama bulmaca oyunu — varlık sayısı çok az |

**Okunacak şey:** bu stilin tek kişilik bilinen bir örneği yok. En yalını
(Glass Masquerade) varlık sayısı en az olan tür (bulmaca).

Kale Nöbeti'nin varlık listesi: 3 arka plan + 4 aile × 4 kademe (T1, T2, T3a,
T3b) = 16 kule + 9 düşman (her biri yürüme + ölüm animasyonu) + askerler +
mermiler + parçacıklar + tezhip HUD çerçevesi + menü ekranları.
Kabaca **60-80 özgün varlık, çoğu animasyonlu.**

---

## 2. Pentiment'ten alınabilecek tek pratik ders

Game Developer'daki sanat derin dalışında teknik yöntem (vektör mü, elle
çizim mi, gölgelendirici mi) anlatılmıyor. Anlatılan şey **iş organizasyonu**
ve tam olarak burası kopyalanabilir: **[D]**

> Ekip her sahnenin önce **basit, renksiz kaba taslaklarını** üretti, sonra
> bunları geliştirme boyunca motorda oynadı — nihai çizime karar vermeden önce.

> "Her sahne için özel hissettirecek ama çok zaman almayacak bir greybox
> yöntemi bulmamız gerekiyordu."

> 157 karakterin hepsini, anlatı kimin ekranda ne kadar duracağını
> kesinleştirene kadar tam olarak çizemediler. Bu kademeli yaklaşım, küçük
> rolleri olan karakterlere boşa emek harcamayı önledi.

Ders: **detayı, gerekliliği kesinleşene kadar ertele.** 13 kişilik bir stüdyo
için kritikti; tek kişi için hayat memat meselesi.

### `ROADMAP.md` ile çelişki

Mevcut yol haritası tüm sanatı **M5**'e topluyor (5-7 gün). Bu, Pentiment'in
yaptığının tam tersi: önce sistemler, sonra tek seferde sanat. Sorunları:

1. **Geri bildirim geç geliyor.** Bir kulenin okunmadığını M5'te öğrenirsen,
   silüeti değiştirmek 16 kule varyantını etkiler.
2. **Kesilebilir iş görünmüyor.** M5'e girdiğinde 60 varlığın hepsi "gerekli"
   görünür. Halbuki T3 dalları oynanışta hiç kullanılmıyorsa çizilmemeliydi.
3. **M5 tek büyük risk bloğu.** Kayarsa proje kayar.

### Öneri: kaba taslak katmanı

```
M1'den itibaren her varlığın iki hali var:
  - GREYBOX: tek renk silüet + palet renginden dolgu. 5 dakikada üretilir.
  - FINAL: tezhip işlemesi. M5'te, ama YALNIZCA oynanışta kanıtlanmış
    varlıklar için.

M4 sonunda oyun greybox'la tamamen oynanabilir olmalı.
M5, oynanışı değiştirmeyen bir kaplama katmanıdır ve kısmen kesilebilir.
```

Bu düzenleme M5'in risk bloğu olmaktan çıkıp **tedricen bitirilebilir** bir
işe dönmesini sağlıyor. Yayına M5'in %60'ıyla da çıkılabilir.

---

## 3. Estetiği maliyeti düşük yerlere yoğunlaştırma

`GAME-DESIGN.md` §2 zaten doğru bir şey söylüyor:
> "Cesaretin tamamı buraya harcanır; geri kalan her şey sakin durur."

Bunu somutlaştırmak gerekiyor. Tezhip estetiğinin maliyeti varlık türüne göre
çok değişiyor:

| Varlık | Tezhip maliyeti | Getiri | Karar |
|---|---|---|---|
| HUD çerçevesi, kartuş, menzil çemberi | **Düşük** (bir kez çizilir, tekrar kullanılır) | **Yüksek** (her karede ekranda) | **YAP** |
| Menü / seviye seçim ekranı | Düşük (statik) | Yüksek (ilk izlenim, ekran görüntüsü) | **YAP** |
| Harita arka planları (3) | Orta | Yüksek | **YAP** |
| Kule sprite'ları (16) | **Yüksek** (küçük, animasyonlu) | Orta | Sadeleştir |
| Düşman sprite'ları (9 × animasyon) | **Çok yüksek** | Düşük (40 px'te detay görünmez) | Silüet odaklı |
| Mermi/parçacık | Düşük | Düşük | Palet yeterli |

**Sonuç: kimliği çerçeve ve arka plan taşısın, birimler sade silüet olsun.**
Bu aslında el yazması mantığıyla da tutarlı — tezhip zaten *kenar süslemesi*
demek; sayfanın ortası düz metindir.

40 px'lik bir düşman sprite'ında tezhip detayı fiziken görünmüyor (Poki'nin
640×360 ölçeğinde 20 px'e iniyor, bkz. `05-yayin-platformlari.md` §1).
Oraya harcanan emek ekrana ulaşmıyor.

---

## 4. İnce altın motif riski — çözünürlük

Poki 16:9 ve 640×360'a orantılı ölçekleme istiyor **[D]**. Tezhip çerçevesinin
ince altın çizgileri yarı ölçekte kaybolur veya titrer (aliasing).

Kurallar:
- Çerçeve motiflerinde **minimum çizgi kalınlığı 2 px** (1280×720 ölçeğinde).
- Kesikli menzil çemberinin kesik uzunluğu ≥ 6 px, boşluk ≥ 4 px.
- Altın varak vurgusu ince çizgiyle değil, **dolgu alanıyla** yapılsın —
  ölçeklemede hayatta kalan tek şey kütle.

---

## 5. Kenney tabanı — gerçek maliyet karşılaştırması

Kenney'nin Tower Defense (Top-Down) paketi CC0, ~300 varlık, ücretsiz.

**Sorun:** o paket tam olarak `GAME-DESIGN.md` §2'nin reddettiği estetik —
parlak, doygun, çizgi film. "Tint ile kendi paletini uygula" işe yaramaz,
çünkü tezhip stilini yapan şey renk değil; çizgi karakteri, altın varak
dokusu ve kompozisyon.

Üç dürüst seçenek:

### A) Kenney tabanı + özgün UI
Birimler Kenney (paletle uyumlulaştırılmış), arka plan + HUD + menü özgün
tezhip. Ekran görüntüsünde ayırt edilebilir kalıyor çünkü çerçeve ve arka
plan ekranın %40'ı.
**Maliyet:** M5 için ~1 hafta. **Kimlik:** %60.

### B) Tam özgün, silüet odaklı
Birimler de özgün ama sade: koyu mürekkep silüet + tek vurgu rengi + altın
kontur. Tezhip detayı yok, ama palet ve çizgi dili tutarlı.
**Maliyet:** M5 için ~3-4 hafta. **Kimlik:** %90.

### C) Tam tezhip
`GAME-DESIGN.md`'nin yazdığı gibi.
**Maliyet:** tek kişi için 2-3 ay veya ücretli sanatçı. **Kimlik:** %100.

**Önerim: A ile yayına çık, B'ye kademeli geç.** §2'deki greybox katmanı
zaten bu geçişi mümkün kılıyor — birimler ayrı katman olduğu için Kenney'den
özgüne geçiş sistem kodunu hiç etkilemiyor.

C'yi ancak oyun A veya B ile yayınlanıp gerçek ilgi gördüğünde düşün.

---

## 6. Palet doğrulaması

`GAME-DESIGN.md` §2'deki 6 renk oyun işlevi açısından kontrol edildi:

| Renk | Hex | İşlevsel sorun |
|---|---|---|
| Mürekkep | `#14203A` | — |
| Yosun | `#2F4A3C` | — |
| Parşömen | `#E4D3A8` | — |
| Altın varak | `#D4A032` | **Vermilyon ile karışabilir** (ikisi de sıcak, orta parlaklık) |
| Vermilyon | `#B03A2E` | Yukarıdaki |
| Lapis | `#3E5CA8` | Mürekkeple karışabilir (ikisi de mavi) |

İki risk noktası:

1. **Altın (vurgu/seçim) ve vermilyon (düşman/tehlike)** yan yana geldiğinde
   ayırt edilmesi zor. Menzil çemberi altın, düşmanlar vermilyon → yoğun
   dalgada çember kaybolur. Çözüm: menzil çemberine **koyu dış kontur**
   (mürekkep, 1 px) ekle. Bu klasik ve ucuz çözüm.
2. **Lapis (dost büyü) ve mürekkep (zemin)** — buz/yavaşlatma efekti koyu
   zeminde okunmaz. Lapis'i efektlerde **açık bir varyantla** kullan
   (`#6E8AD0` gibi) veya efektlere parlaklık (additive blend) ver.

Ek eksik: **renk körlüğü.** Vermilyon-yeşil (yosun) ayrımı en yaygın renk
körlüğü türünde kayboluyor. Düşman/dost ayrımı yalnız renge dayanmamalı —
düşmanlar silüet olarak da farklı olmalı (dokümanın "her kule bir rol çözer"
ilkesinin görsel karşılığı).

---

## 7. Tipografi doğrulaması

| Font | Kullanım | Not |
|---|---|---|
| Grenze Gotisch | Başlıklar | Uygun. **Yalnız büyük başlık** kuralı doğru — gotik yüz gövde metninde okunmaz. |
| Spectral | Gövde/UI | Uygun. Ama 640×360'a inince serif'in ince tırnakları kaybolur; **minimum 16 px** (1280×720) kuralı zorunlu. |
| Inter Tight | Sayılar | **Web fontu olarak kullanılmayacak** — `02-phaser-teknik.md` §1 gereği sayılar bitmap font olmak zorunda. Inter Tight'ı bitmap fonta dönüştür, web fontu olarak yükleme. |

Türkçe karakterler için `latin-ext` alt kümesi zorunlu
(`04-varlik-paket-boyut.md` §3). Grenze Gotisch ve Spectral'in ikisi de
Google Fonts'ta `latin-ext` destekliyor — doğrulandı.

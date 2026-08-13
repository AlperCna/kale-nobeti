# Kale Nöbeti — Tasarım Dokümanı

> Bu doküman `docs/research/` altındaki araştırma bulgularıyla güncellendi.
> Değişen sayıların gerekçesi için ilgili araştırma dosyasına atıf verildi.

## 1. Çekirdek döngü

Hazırlık (altını harca) → dalgayı başlat → düşmanlar sabit yolu yürür,
kuleler otomatik ateş eder → öldürmeden altın kazan → dalgayı atlat → tekrar.

Gerilim kaynağı bir planlama bulmacasıdır: **mevcut DPS'im gelen dalgaya yeter mi,
ve cevabı satın alabilir miyim?** Tüm tasarım kararları bu soruyu keskinleştirmeye
hizmet eder.

### Kontroller

- **Hız:** 1× / 2× geçişi tek butonla. Bu bir konfor özelliği değil, mimari
  karardır — bkz. `CLAUDE.md` TIER 1 kural 8.
- **Duraklatma:** ESC veya boşluk tuşu. Poki'nin zorunlu şartı
  (`docs/research/05-yayin-platformlari.md` §1).
- **Fare/dokunmatik:** yapı noktasına tıkla → kule menüsü. Dokunmatik hedefler
  1280×720 ölçeğinde en az 44×44 px.

## 2. Sanat yönü

Tür klişesi parlak, doygun çizgi film paletidir. Buradan kaçınıyoruz.
Referans: **ortaçağ tezhipli el yazması** — mürekkep, parşömen, altın varak, lapis.

### Palet (6 değer, hepsi bu listeden türetilir)

| İsim | Hex | Kullanım |
|---|---|---|
| Mürekkep | `#14203A` | Zemin gölgesi, UI paneli, letterbox |
| Yosun | `#2F4A3C` | Çim, ağaç kütlesi |
| Parşömen | `#E4D3A8` | HUD şeritleri, metin zemini |
| Altın varak | `#D4A032` | Vurgu, menzil dairesi, altın, seçim |
| Vermilyon | `#B03A2E` | Düşman, tehlike, can kaybı |
| Lapis | `#3E5CA8` | Büyü, buz, dost etkileri |

Yol rengi parşömen ile mürekkep arası ara ton: `#8A7250`.

**İşlevsel düzeltmeler** (`docs/research/06-sanat-yonu.md` §6):

- Altın ve vermilyon yan yana ayırt edilemiyor. Menzil çemberi ve seçim
  vurgusu **mürekkep renginde 1 px dış kontur** taşır, yoksa yoğun dalgada
  düşmanların içinde kaybolur.
- Lapis koyu zeminde okunmuyor. Efektlerde açık varyant `#6E8AD0` kullanılır.
- **Düşman/dost ayrımı yalnız renge dayanmaz.** Yeşil-kırmızı ayrımı en yaygın
  renk körlüğünde kayboluyor; silüetler de farklı olmak zorunda.

### Tipografi

- **Başlık:** Grenze Gotisch — ortaçağ karakteri var ama okunur. Sadece
  büyük başlıklarda, asla gövde metninde.
- **Gövde/UI:** Spectral — serif, ekranda rahat, tarihsel dokuya uyuyor.
  Minimum 16 px (1280×720 ölçeğinde); Poki 640×360'a küçültme yapıyor ve
  serif tırnakları altında kayboluyor.
- **Sayılar:** Inter Tight, tabular figürler — ama **web fontu olarak değil,
  bitmap fonta dönüştürülerek.** Değişen tüm metinler `BitmapText` olmak
  zorunda (`CLAUDE.md` TIER 1 kural 7).

Web fontları statik `woff2`, tek ağırlık, **`latin-ext` alt kümesi**
(Türkçe `ı ğ ü ş ö ç` için zorunlu).

### İmza öğesi

**Tezhip çerçevesi.** HUD parşömen şeridinin köşelerinde ince altın varak motifi;
kule menzil dairesi düz beyaz halka değil, kesikli altın bir çember ve içinde
çok hafif bir ışık yıkaması. Seçili kule, sayfa kenarındaki bir minyatür gibi
altın bir kartuş içinde gösterilir. Cesaretin tamamı buraya harcanır; geri kalan
her şey sakin durur.

Ölçeklenme kuralları: motiflerde minimum çizgi kalınlığı **2 px**, kesikli
çemberde kesik ≥ 6 px / boşluk ≥ 4 px. Altın vurgu ince çizgiyle değil
**dolgu alanıyla** yapılır — yarı ölçekte hayatta kalan tek şey kütledir.

### Üretim seviyesi: özgün silüet

Tüm varlıklar **özgün** çizilir, ama **tezhip detayı yalnız çerçevede ve
arka planda** olur. Birimler (kule, düşman, asker, mermi) sade kalır:

- Koyu mürekkep **silüet** + tek vurgu rengi + ince altın kontur.
- İşleme, doku, iç detay yok. 40 px'lik bir sprite Poki'nin 640×360
  ölçeğinde 20 px'e iniyor — oraya harcanan detay ekrana ulaşmıyor
  (`docs/research/06-sanat-yonu.md` §3).
- Ayırt edilebilirlik **silüetten** gelir, renkten değil. Gri tonlamalı
  ekran görüntüsünde düşman tipleri hâlâ ayrılabilmeli (TIER 1 kural 6).

**Kimliği çerçeve ve arka plan taşır.** Bu, el yazması mantığıyla da
tutarlı — tezhip zaten kenar süslemesi demektir; sayfanın ortası düz metindir.

Hazır varlık paketi (Kenney vb.) **kullanılmaz** — o paketler §2'nin
reddettiği parlak çizgi film paletinde ve tint ile dönüştürülemez;
stili yapan şey renk değil, çizgi karakteri.

Üretim bütçesi: **3-4 hafta** (`docs/plan/M6-sanat-juice-ses.md` üretim
blokları). Tam tezhip (2-3 ay) bilinçli olarak reddedildi — ilk oyun için
projeyi bitirilemez yapma riski taşıyor.

## 3. Hasar modeli

İki hasar tipi, iki savunma tipi. Bu, kule çeşitliliğinin tek kaynağıdır.

- **Fiziksel** hasar → **Zırh** ile sabit miktarda azalır.
- **Büyü** hasar → **Büyü direnci** ile yüzde olarak azalır.
- **Gerçek** hasar → hiçbir şeyle azalmaz (yalnız yeteneklerde).

```ts
function applyDamage(dmg: number, type: DamageType, e: EnemyStats): number {
  let out = dmg;
  if (type === 'physical') out = dmg - e.armor;
  if (type === 'magic')    out = dmg * (1 - e.magicResist);
  return Math.max(out, dmg * 0.15); // taban: hiçbir vuruş tamamen emilmez
}
```

%15 tabanı önemli: oyuncu tamamen yanlış kule kurduğunda oyun kilitlenmez,
sadece verimsizleşir. Ceza var ama duvar yok.

**Geri bildirim zorunluluğu:** taban hasara düşen vuruşlar oyuncuya "kırık"
gibi görünüyor (okçu, boss'a tekrar tekrar `1` yazıyor). Hasar sayıları
üç renkte gösterilir:

| Durum | Renk | Boyut |
|---|---|---|
| Tabana düşmüş (zırh/direnç emdi) | Gri + küçük kalkan ikonu | %80 |
| Normal | Parşömen | %100 |

**Kritik vuruş yok.** Dokümanın önceki hali üçüncü bir renk (altın, %140)
için "kritik" diyordu ama kritik diye bir mekanik hiçbir yerde tanımlı
değildi. v1'e kritik eklemek bir istatistik, bir rastgele atış ve denge
varyansı getirir; karşılığında neredeyse hiçbir şey vermez — Keskin
Nişancı'nın kimliği zaten menzil ve zırh delme. İki renk yeterli.

## 4. Kuleler

4 aile. Her aile: Tier 1 → Tier 2 → Tier 3'te **iki dallı uzmanlaşma**.
Kural: **hiçbir kule diğerinin düpedüz üstünü değildir; her biri bir rolü çözer.**

### 4.1 Okçu Kulesi — tek hedef, hızlı, ucuz
Fiziksel hasar. Uçanlara vurabilir. Zırha karşı zayıf.

| Tier | Maliyet | Hasar | Atış/sn | Menzil |
|---|---|---|---|---|
| 1 | 70 | 6 | 1.1 | 150 |
| 2 | 110 | 10 | 1.3 | 165 |
| 3a Keskin Nişancı | 170 | 26 | 0.6 | 260 |
| 3b Kundakçı | 170 | 9 + 4/sn yanma (4 sn) | 1.4 | 165 |

### 4.2 Top Kulesi — alan hasarı, yavaş
Fiziksel hasar, patlama yarıçapı. Kalabalığın cevabı.
**Havan dalı uçana vuramaz; Barut Fıçısı dalı vurabilir (hasarın %50'si).**

| Tier | Maliyet | Hasar | Atış/sn | Menzil | Yarıçap | Uçan |
|---|---|---|---|---|---|---|
| 1 | 110 | 22 | 0.5 | 140 | 45 | hayır |
| 2 | 160 | 34 | 0.55 | 150 | 55 | hayır |
| 3a Havan | 240 | 48 | 0.45 | 230 | 70 | hayır |
| 3b Barut Fıçısı | 240 | 30 + %40 yavaşlatma (2 sn) | 0.6 | 150 | 65 | **evet, %50** |

Gerekçe: 4 aileden 2'si uçana etkisiz olduğunda harpi dalgasında oyuncunun
tahtasının yarısı ölü kalıyor. Barut Fıçısı'na uçan yetisi vermek T3
dallanmasını gerçek bir seçime çeviriyor: Havan = kara uzmanı,
Barut Fıçısı = esnek (`docs/research/03-mekanik-tasarim.md` §2).

### 4.3 Büyü Kulesi — zırh delen
Büyü hasarı. Zırhlı düşmanların tek temiz cevabı. Büyü dirençli düşmanlara zayıf.

| Tier | Maliyet | Hasar | Atış/sn | Menzil |
|---|---|---|---|---|
| 1 | 100 | 14 | 0.7 | 155 |
| 2 | 150 | 24 | 0.75 | 170 |
| 3a Yıldırım | 230 | 30, 3 hedefe zincirleme (%70 azalarak) | 0.7 | 170 |
| 3b Buz | 230 | 20 + %50 yavaşlatma (2.5 sn) | 0.8 | 180 |

### 4.4 Kışla — asker çıkarır, yolu tıkar
Hasar vermez, **zaman kazandırır**. Türün en önemli mekaniği: düşmanı durdurup
diğer kulelerin menzilinde tutar. Uçanlar engellenemez.

| Tier | Maliyet | Asker | Asker HP | Asker DPS | Diriliş |
|---|---|---|---|---|---|
| 1 | 90 | 2 | 45 | 5 | 8 sn |
| 2 | 140 | 2 | 75 | 8 | 7 sn |
| 3a Paladin | 210 | 2 | 140 | 11 + kalkan | 6 sn |
| 3b Haydutlar | 210 | 3 | 70 | 9 + kaçınma %25 | 5 sn |

#### Engelleme kuralları

Bu 9 madde pazarlıksız. Türün en çok kenar durum üreten mekaniği; belirsiz
bırakılırsa bug üretir. Kingdom Rush'ın belgelenmiş davranışından türetildi
(`docs/research/03-mekanik-tasarim.md` §1).

1. Her askerin `engagedWith: Enemy | null`, her düşmanın
   `blockedBy: Soldier | null` alanı vardır.
2. Asker, aggro yarıçapı (**60 px**) içindeki en yakın *engellenmemiş* düşmanı
   hedefler ve ona yürür. Temas mesafesinde (**20 px**) iki taraf kilitlenir;
   düşmanın yol ilerlemesi durur.
3. Bir düşman aynı anda birden çok asker tarafından dövülebilir. Düşman
   **yalnızca `blockedBy` askerine** hasar verir; diğerleri bedava DPS ekler.
   Sayı üstünlüğü böylece ikili kazanç verir.
4. Kilit kırılır: asker ölür / düşman ölür. Askeri ölen düşman, aggro
   yarıçapında serbest asker varsa yeniden kilitlenir, yoksa yürümeye devam eder.
5. Askerler düşmandan azsa fazla düşmanlar hiç durmadan geçer. Bu bilinçlidir:
   kışla bir baraj değil, zaman kazanma aracıdır.
6. **Toplanma noktası** kışladan `rallyRange = 160 px` içinde olmalı ve yola
   `≤ 40 px` mesafedeki bir noktaya yapışır. Yol dışına konamaz.
7. Ölen asker `respawn` süresi sonra kışlada doğar ve toplanma noktasına
   *yürür*; yürürken engelleme yapmaz.
8. Uçanlar engellenemez: `enemy.flying === true` ise asker onu hedeflemez.
9. Ogre Şef askerleri tek vuruşta öldürür — kışla boss'a karşı yalnızca
   ~1 saniyelik gecikme sağlar. Bilinçlidir.

**Sinerji:** iki kışlanın toplanma noktası aynı yere konursa iki takım tek
düşmana grup halinde saldırır — daha çok hasar, daha az kayıp. Oyuncuya
öğretilmeye değer bedava derinlik.

### 4.5 Kule kuralları

- Satış iadesi: harcanan toplamın **%70'i**.
- Menzil dairesi yalnızca hover/seçimde görünür.
- **Hover'da kapsanan yol vurgulanır.** Menzil dairesiyle birlikte, o yapı
  noktasının gördüğü yol parçası kalın altın çizgiyle çizilir. Sabit yapı
  noktalı bir oyunda "hangi noktaya hangi kule" kararının tamamı buna bağlı
  (`docs/research/03-mekanik-tasarim.md` §4).

#### Hedefleme önceliği

Kule başına seçilebilir. Kışlada yoktur. Tanımlar belirsiz bırakılmaz:

| Mod | Tanım |
|---|---|
| `first` (varsayılan) | Kaleye kalan **yol mesafesi** en az olan |
| `last` | Kaleye kalan yol mesafesi en çok olan |
| `strongest` | **Maksimum** HP'si en yüksek olan |
| `weakest` | Mevcut HP'si en düşük olan (bitirici vuruş) |
| `closest` | Kuleye öklit mesafesi en az olan |

`strongest` **mevcut** HP'ye bakmaz — bakarsa hedef her karede değişir ve
kule dönüş animasyonu titrer. Maksimum HP kararlı hedef verir.

`first`/`last` yol ilerlemesine (`pathProgress`) değil kalan mesafeye bakar;
ayrık yollu haritalarda ilerleme yüzdesi karşılaştırılabilir değildir.

## 5. Düşmanlar

`hp` ve `altın` değerleri **temel** değerlerdir; harita çarpanlarıyla
ölçeklenir (bkz. §7, §9).

| Düşman | HP | Hız | Zırh | B.Direnç | Altın | Puan | Özellik |
|---|---|---|---|---|---|---|---|
| Goblin | 45 | 60 | 0 | 0 | 3 | 1 | — |
| Ork Savaşçı | 110 | 45 | 2 | 0 | 6 | 2 | Zırh kavramını tanıtır |
| Zırhlı Ork | 160 | 38 | 8 | 0 | 12 | 4 | Fiziksele dirençli |
| Harpi | 70 | 75 | 0 | 0 | 9 | 3 | **Uçar** — yolu takip etmez, engellenemez |
| Kurt Binicisi | 60 | 110 | 1 | 0 | 9 | 3 | Çok hızlı |
| Şaman | 130 | 42 | 0 | 0.40 | 15 | 5 | Yakındaki düşmanlara 8 HP/sn iyileştirme |
| Trol | **400** | 30 | 4 | 0 | 24 | 8 | 6 HP/sn yenilenme |
| Örümcek Ana | 150 | 50 | 0 | 0.20 | 18 | 6 | Ölünce 3× yavru (HP 30, hız 90) |
| **Ogre Şef** (boss) | **700** | 28 | 10 | 0.25 | 60 | 25 | Kışla askerlerini tek vuruşta öldürür |

Sızma cezası: normal 1 can, Trol/Örümcek Ana 2 can, boss 10 can.

### Ogre Şef (700) ve Trol (400) — ölçümle doğrulandı

Bu iki sayı önceden `~300 px kapsanan yol` **varsayımıyla** türetilmişti ve
o varsayım `research/03` §3'ün "≥ 450 px" kriteriyle çelişiyordu. M1'de
Harita 1 çizildi ve kapsama ölçüldü: **296,3 px** (menzil 150).

| Düşman | Menzilde süre | ΣDPS | Tavan | Etkin HP | Oran |
|---|---|---|---|---|---|
| Ogre Şef | 10,58 sn | 84 | **889** | 700 | **%78,7** ✓ hedef %75-85 |
| Trol | 9,88 sn | ~120 | **1185** | 459 (yenilenme dahil) | **%38,7** |

Trol, boss dışındaki **en tank düşman** ama duvar değil — Zırhlı Ork %22,
Örümcek Ana %31. Yenilenme sıralamayı değiştirmiyor. Rolüyle tutarlı, sayı
kalıyor.

`450 px doğru olsaydı` boss tavanın **%52**'sinde kalırdı — yani 450 px,
bu tablodaki boss değeriyle aynı anda doğru olamıyor. Çelişki 300 lehine
kapandı.

> **Sınır:** yukarıdaki oranlar **Harita 1 geometrisiyle** hesaplandı.
> Trol, Şaman, Zırhlı Ork ve Örümcek Ana harita 2-3'te sahneye çıkıyor;
> oradaki HP çarpanı (1,6 ve 2,6) ve yapı noktası sayısı (10 ve 12) farklı.
> Gerçek sağlamaları o haritaların geometrisi çizilince (M7) yapılacak.
> Buradaki hesap alt sınır sağlaması: harita 1'de bile rahat geçiliyorlar.
> Sağlamalar `src/data/referenceBoards.test.ts` içinde koşuyor.

### Boss HP'si neden 2200 değil 700

Eski 2200 değeri, gerçekçi bir Tier 2 tahtasına karşı **geçilemezdi.**
Tek bir düşmana verilebilecek toplam hasar, kule yerleşiminden bağımsız
olarak `Σ (DPS × kapsananYol) / hız` ile sınırlı; ölçülen kapsamayla T2
tavanı **889** — 2200'ün çok altında.

> **Manşet iddia ölçümle sınandı ve ayakta kaldı, ama payı ince.**
> "8 nokta Tier 3 olsa ve Meteor iki kez kullanılsa bile boss ölmez"
> hesabı `kapsama = 2 × menzil` varsayımıyla **2131** vermişti. Gerçek
> menzillerde ölçülen kapsamayla (Havan 476, Yıldırım 340, Keskin Nişancı
> 557 px) mutlak tavan **2188** çıkıyor — hâlâ 2200'ün altında ama yalnız
> **%0,5** pay var.
>
> Doğru ifade "matematiksel olarak imkânsız" değil, **"pratikte imkânsız"**:
> senaryo zaten ekonomik olarak erişilemez ve %0,5 pay tek bir denge
> düzeltmesiyle kapanır. `referenceBoards.test.ts` bu payı bekçiye bağladı —
> kule menzilleri artarsa manşet sessizce yanlışlanamaz.

700 değeri ölçülen tavanın **%78,7'si**.
Tam hesap: `docs/research/01-denge-matematigi.md` §4.

### Altın oranı

Tüm düşmanlar `altın = 3 × puan`. Eskiden oran 1.33 (Örümcek Ana) ile
4.80 (boss) arasında savruluyordu; yani "zor düşman = az altın" gibi ters
bir teşvik vardı. Boss istisna (60, oran 2.4) çünkü son dalgada kazanılan
altının kullanım değeri düşük.

### Harita başına düşman kadrosu

Mekanik erken, uç örneği geç tanıtılır (Kingdom Rush kalıbı):

| Harita | Yeni düşmanlar | Tanıtılan kavram |
|---|---|---|
| 1 | Goblin, Ork Savaşçı, Kurt Binicisi, Harpi, Ogre Şef | Zırh (hafif, 2), hız, uçan |
| 2 | + Zırhlı Ork, Şaman | Ağır zırh (8), büyü direnci, iyileştirme |
| 3 | + Trol, Örümcek Ana | Yenilenme, bölünme, çoklu giriş |

Harita 1'in 10 dalgasına 9 düşman tipi sıkıştırmak okunabilirliği öldürür.

### Uçan hattı gösterimi (zorunlu)

Harpi yolu takip etmediği için, uçuş hattı kule menzillerinden geçmiyorsa
harpi **garantili sızar** — oyuncunun hiçbir kararı bunu değiştiremez.
Defense Grid'in çözümü uygulanır:

- Hazırlık aşamasında, o dalgada uçan varsa `flyerPaths` haritada **soluk
  kesikli altın çizgi** olarak gösterilir; dalga başlayınca sönümlenir.
- Yapı noktası seçiliyken menzil dairesi uçan hattını kesiyorsa, kesişen
  parça vurgulanır. Oyuncu "bu kule harpilere yetişir mi" sorusunu tıklamadan
  cevaplayabilmeli.

**Harita kabul kriteri:** `flyerPaths`, yapı noktalarının en az **%40'ının**
menzilinden geçmeli (8 noktalı haritada ≥ 3). `util/coverage.ts` ile ölçülür.

### Karşı-oyun tablosu (tasarımın omurgası)
| Tehdit | Doğru cevap |
|---|---|
| Kalabalık goblin | Top |
| Zırhlı Ork | Büyü |
| Şaman | Keskin Nişancı (`last` ile arkadan seç) veya Yıldırım |
| Harpi sürüsü | Okçu + Büyü + Barut Fıçısı (Havan işe yaramaz) |
| Trol | Kışla ile tut + yoğun tek hedef |
| Kurt Binicisi | Buz / Barut Fıçısı yavaşlatma |
| Ogre Şef | Büyü + Top, `strongest` hedefleme, Meteor |

## 6. Ekonomi

- Başlangıç altını: **280** (harita başına değişir, bkz. §9), başlangıç canı: **20**.
- Öldürme altını yukarıdaki tabloda (`3 × puan`).
- Dalga bitiş bonusu: `30 + dalgaNo * 5`.
- **Erken başlatma bonusu:** `kalanSaniye × ceil(dalgaNo / 2)`. Sayaç 20 sn.
  **İlk 3 dalgada kapalıdır** — buton dalga 4'te açılır.
- Kule satışı %70 iade.

Eski sabit `+1/saniye` bonusu dalga 1'de gelirin %28'iydi, dalga 10'da %10.
Yani yeni oyuncuya "dalga telegrafını okuma, hemen bas" öğretiyordu — telegrafı
zorunlu kılan kararla doğrudan çelişiyordu. Ölçekli formül erken oyunda
öğrenmeyi cezalandırmıyor, geç oyunda gerçek bir karar oluyor.

### Yükseltme neden pahalı görünüyor

Hiçbir yükseltme altın başına DPS olarak verimli değildir (T2, T1'in
~%73'ü kadar verim verir). Bu bilinçlidir: yükseltme **yer kıtlığı** yüzünden
mantıklıdır, verimlilik yüzünden değil — Kingdom Rush'ın modeli budur.

Ama tek şartla çalışır: **8 yapı noktası dalga 4-5'te dolmalı** ki oyuncunun
geri kalan dalgalarda yükseltmekten başka seçeneği kalmasın. Başlangıç altını
200'den 280'e, dalga bonusu `20+2n`'den `30+5n`'e bu yüzden çıkarıldı.

Eski ekonomiyle harita 1'in toplam geliri ~1250 altındı; 8 noktayı doldurmak
740, T2 yükseltmeleri 1120, T3 1640 tutuyor. Yani **Tier 3 harita 1'de hiç
görülmüyordu** — tasarımın en ilginç kısmı görünmezdi. Yeni gelir ~1850.

### Sızıntı sağlaması — iki ayrı kısıt

> Eski `toplamHP < D × L / v` formülü **yanlıştı ve savunmayı tam 6 kat
> abartıyordu.** Her kulenin yolun tamamını gördüğünü varsayıyordu; gerçek
> kapsama `2 × menzil`. Tam açıklama: `docs/research/01-denge-matematigi.md` §2-3.

İki kısıt vardır ve **ikisi de** tutmak zorundadır.

**Kısıt A — tek düşman dayanıklılığı** ("tank/boss sızar mı"):

```
ToplamHasar(düşman) = Σ_kule ( DPS_kule × kapsananYol_kule ) / hız_düşman
```

`kapsananYol_kule` = kulenin menzil dairesi içinde kalan yol uzunluğu (px).
Bu değer **kule yerleşiminden bağımsızdır** — kümelenseler de dağılsalar da
toplam aynıdır. Yerleşim *ne zaman* hasar verildiğini değiştirir, *ne kadar*
verildiğini değil.

> **Kısıt A kışlayı modellemiyor.** Formül yalnız kulelerin verebileceği
> hasarı topluyor; askerlerin DPS'i ve engellemenin kazandırdığı süre
> girmiyor. §4.4'te cevabı açıkça kışla olan düşmanlar (Trol) için Kısıt A
> tavanı **sistematik olarak düşük** çıkar. `src/systems/balanceChecks.ts`
> içindeki `KISLA_ILE_DOGRULANAN` listesi bu düşmanları işaretliyor — sayı
> gizlenmiyor, yalnız eşiği geçmemesi tek başına kusur sayılmıyor.
> Doğrulaması Kısıt B'nin işi (M7, S74).

**Kısıt B — dalga verimi** ("sürü sızar mı"):

```
ToplamHasar(dalga) = Σ_kule ( DPS_kule × dalgaSüresi × aktiflikOranı_kule ) × 0.75
```

Burada yerleşim çok önemli. Ölçülmüş aktiflik oranları:

| Kapsanan düz yol parçası | Aktiflik |
|---|---|
| 1 (düz hat) | ~%60 |
| 2 (viraj) | ~%80 |
| 3 (T kavşağı) | ~%95 |

Sondaki `× 0.75` **odaklanma kaybıdır**: `first` hedeflemesi varsayılan olduğu
için kuleler aynı düşmana vurur ve fazla hasar boşa gider.

Her iki kısıt için **%15 pay** bırakılır: `tavan > gerekenHP × 1.15`.
Bu üç sağlama Vitest'te saf fonksiyon olarak yazılır (M3'te, M6'da değil).

### Denge ilkesi

Oyuncunun dalga N'de kazandığı toplam altın, dalga N+1'i geçmek için gereken
DPS artışının maliyetine yaklaşık eşit olmalı. Bu bir tabloda simüle edilir,
oyunda deneme yanılma ile değil.

## 7. Dalga sistemi

Dalgalar elle yazılmaz, **bütçe ile üretilir** ve sonra elle rötuşlanır.
Bütçe yaklaşımı, oyunun asla yenilemez bir dalga üretmemesini garanti eder.

```ts
const BREATHER = new Set([4, 7]);
budget(n) = Math.round(10 * Math.pow(1.20, n - 1) * (BREATHER.has(n) ? 0.85 : 1));
```

Harita 1 → dalga 1'de 10 puan, dalga 10'da ~52 puan.

**Nefes dalgaları (4 ve 7).** Tekdüze rampa yorucu; zirveler ve nefes anları
planlanmalı. Kingdom Rush 5. seviyeyi bilinçli olarak hafifletiyor.

**Grup içi tempo** sabit değil, dalga boyundan türetilir:

```
düşmanlarArasıBekleme = SPAWN_K / dalgaBoyu
dalgaSonrasıBekleme   = REST_K × dalgaBoyu
```

Kalabalık dalgalar daha sık doğurur ama daha uzun nefes bırakır.

Harita zorluk çarpanları: bkz. §9. **Dalga içi HP artışı yoktur.** Zorluk
kompozisyondan gelir — böylece oyuncu düşmanı tanır ve "bu ne kadar dayanıklı"
tahmini güvenilir kalır. Dalga başına %5 HP eklemek yaygın ama okunabilirliği
bozan bir kısayoldur.

Boss dalgaları: her haritanın 10. dalgası. **Boss refakatsiz gelir** veya
refakat boss'tan *sonra* gönderilir — aksi halde `first` hedeflemesi bütün
ateşi refakate yönlendirir ve boss serbest yürür.

### Dalga telegrafı (zorunlu)
Hazırlık aşamasında gelecek dalganın kompozisyonu ikonlarla gösterilir:
`🗡️×8  🛡️×3  🦅×4`. Oyuncunun körlemesine oynaması türün en yaygın şikâyeti.

### Veri şeması
```ts
interface WaveGroup {
  enemy: EnemyId;
  count: number;
  spawnDelay: number;   // grup içi düşmanlar arası saniye
  startAt: number;      // dalga başından itibaren saniye
  spawnPoint: number;   // haritada birden fazla giriş varsa
}
interface Wave { index: number; groups: WaveGroup[]; }
```

## 8. Yetenekler

İki aktif yetenek, tıkla-hedefle, bekleme süreli. Oyuncuyu izleyici olmaktan
çıkarır ama odağı yol yapısından almaz.

- **Meteor** — hedeflenen 90 px yarıçapta 180 gerçek hasar. Bekleme 45 sn.
- **Takviye** — hedeflenen noktaya 2 geçici asker (HP 60, DPS 7, 20 sn ömür).
  Bekleme 20 sn.

Bekleme süreleri HUD'da dairesel dolum ile gösterilir; hazır olunca altın
kenar bir kez parlar.

## 9. Haritalar

| # | Ad | Tema | Yol | Yapı noktası | Giriş | HP çarpanı | Altın çarpanı | Başlangıç altını |
|---|---|---|---|---|---|---|---|---|
| 1 | Değirmen Geçidi | Yeşil vadi, değirmen | Tek yol, 2 keskin viraj | 8 | 1 | 1,0 | 1,0 | 280 |
| 2 | Taş Köprü | Nehir, taş köprü, sis | Y şeklinde ikiye ayrılır, köprüde birleşir | 10 | 1 | 1,6 | 1,6 | 448 |
| 3 | Kül Ovası | Yanmış toprak, volkanik | İki ayrı giriş, kalede birleşir | 12 | 2 | 2,6 | **3,8** | **1064** |

**Altın çarpanı ≥ HP çarpanı** (M7, S70/S72/S73). Eskiden "eşit" kuralı
vardı ve yalnız öldürme altınına uygulanıyordu; kule maliyetleri sabit
kaldığı için harita 3'te altın/HP oranı %38'e düşüyordu ve oyuncunun eline
12 noktayı doldurmaya bile yetmeyen para geçiyordu. M7'de üç şey ölçüldü ve
düzeltildi:

- **S70** — dalga bitiş bonusu da altın çarpanıyla çarpılıyor artık,
  yalnız öldürme altını değil (`EconomySystem.awardWaveEnd`).
- **S72** — başlangıç altını da çarpanı izliyor: `280 × altınÇarpanı`.
  Önceki tablo (280/340/400) çarpanı izlemiyordu; dalga 1 tahtası her
  haritada aynı sayıda kule alırken düşman HP'si haritayla büyüyordu ve
  ilk dalgalar sızdırıyordu.
- **S73** — harita 3'te altın çarpanı HP çarpanından **ayrıştı** (2,6 → 3,8).
  Eşit tutulunca 12 nokta tam yükseltilemiyordu; tarama sonucu 3,8'de
  tahta maliyeti **doyuyor** (üstü fazladan kule almıyor) — sayı seçilmedi,
  tam yükseltme noktası olarak ölçüldü.

Ölçülen sonuç: üç haritanın da 10 dalgası **geçilebilir** (kalan can
sırasıyla 20/20, 12/20, 5/20 — ayrıntı `docs/results/M7-SONUC.md` §3).

**Ayrık yol uyarısı:** harita 2 ve 3'te Kısıt A hesabı **her kol için ayrı**
yapılır. Toplam DPS yanıltıcıdır — kolun yalnızca onu gören kuleleri sayılır.

### Yıldız derecelendirmesi

Harita bitince kalan cana göre:

| Kalan can | Yıldız |
|---|---|
| 20 (hiç sızma yok) | ★★★ |
| 15-19 | ★★ |
| 14 ve altı | ★ |

Başlangıç canı 20 (§6). Boss sızması tek başına 10 can götürüyor (§5), yani
boss'u kaçırmak doğrudan tek yıldıza düşürüyor — bilinçli.

### Kapsanan yol — asıl denge kolu

Ölçülmüş: aynı kule düz hattın önünde 2 saniye, arkasında 8-12 saniye ateş
ediyor; tek kulede **%44 toplam hasar farkı**. Yani haritaların yapı noktası
*sayısı* değil, her noktanın **kapsadığı yol uzunluğu** dengeyi belirliyor.

**Kabul kriteri (M1'de düzeltildi):** yapı noktası başına ortalama kapsanan
yol, T1 menzili için **`2 × menzil` ± %5** bandında olmalı — 150 px menzilde
**285-315 px**. Altındaysa harita fazla düz, üstündeyse fazla kıvrımlı.

> **Eski kriter "≥ 450 px" idi ve yanlıştı.** Türetilmemiş bir sayıydı
> ("T1 menzilinin 3 katı") ve §5'teki boss değeriyle aynı anda doğru
> olamıyordu: 450 px'te T2 tavanı 1350 olur, boss 700 tavanın %52'sinde
> kalır ve yolun yarısında ölürdü.
>
> Harita 1 çizildi, kapsama ölçüldü: **296,3 px**, yani `2 × menzil`in
> **0,988** katı. Model %1,2 hatayla tutuyor. Kriter bu yüzden mutlak bir
> piksel sayısı değil, **menzile bağlı bir oran** olarak yazıldı — T2 ve T3
> menzilleri farklı olduğu için tek bir px eşiği zaten anlamsızdı.

**Bir harita aslında İKİ bağımsız bandı birden geçmeli.** İkisi farklı
şeyi koruyor ve karıştırılmamalı:

| Bant | Aralık (menzil 150) | Neyi korur | Nerede sınanır |
|---|---|---|---|
| **Geometri** — `2 × menzil` ± %5 | 285-315 px | Haritanın ne fazla düz ne fazla kıvrımlı olması; `research/01`'in tavan modelinin geçerli kalması | `referenceBoards.test.ts` |
| **Boss** — tavanın %75-85'i | 275-311 px | Boss dalgasının zorlayıcı ama geçilebilir olması | `maps.test.ts` |

Geçerli aralık ikisinin kesişimi: **285-311 px**. Harita 1: **296,3** ✓

**Bandın türetilmesi.** Sayı seçilmedi, boss'tan geriye çözüldü: boss HP'si
ve referans tahta sabit tutulup gereken ortalama kapsama çıkarıldı
(`700 / 0,80` → tavan 875 → **C ≈ 292 px**). Harita bunu tutturacak şekilde
çizildi. Bu, "elde kalem varken bilinmesi gereken şey yolu ne kadar
kıvıracağımdır" demenin karşılığı.

**Ölçülen menzil-kapsama eğrisi (Harita 1):**

| Menzil | Ortalama kapsama | `ort ÷ 2r` |
|---|---|---|
| 150 (T1) | 296,3 | 0,988 |
| 170 | 340,1 | 1,000 |
| 180 | 361,2 | 1,003 |
| 230 | 475,9 | 1,035 |
| 260 | 556,5 | 1,070 |

Menzil büyüdükçe oran hafifçe yükseliyor: geniş menzilli kule viraj
noktalarından yolu daha çok kez görüyor. Bu, T3 hesaplarını **iyimserleştiren**
bir etki ve mutlak tavan hesabında görünüyor (§5).

Sağlamalar `src/data/referenceBoards.test.ts` içinde koşuyor; `coverage`
alanı `util/coverage.ts` tarafından üretiliyor ve `npm run guard` elle
yazılmasını engelliyor.

Harita verisi:
```ts
interface MapDef {
  id: string;
  background: string;             // ayrı WebP dosyası, atlas DEĞİL
  paths: Vec2[][];                // her giriş için waypoint dizisi
  buildSpots: Vec2[];
  flyerPaths: Vec2[][];           // uçanlar için düz hatlar
  castle: Vec2;
  waves: Wave[];
  hpMultiplier: number;
  goldMultiplier: number;         // = hpMultiplier
  startGold: number;
  enemyRoster: EnemyId[];         // bu haritada çıkabilecek tipler
  /** util/coverage.ts ile üretilir, ELLE YAZILMAZ. Denge testleri kullanır. */
  readonly coverage: { spotIndex: number; coveredPx: number }[];
  /** Ayrık yolda kol başına kapsama — `paths` ile aynı sırada. */
  readonly branchCoverage: { spotIndex: number; coveredPx: number }[][];
}
```

### Boss'un harita başına ölçeklenmesi

**Ogre Şef'in zırhı ve HP'si haritadan haritaya değişiyor** — `enemies.ts`
içindeki 700/zırh 10 yalnız harita 1'in değeri. `700 × hpMultiplier`
kullanılsaydı harita 2'de 1120, harita 3'te 1820 olurdu ve karşılanabilir
hiçbir tahta bunu indiremezdi (M7'de ölçüldü: Kısıt A oranı %165 ve %282).

`src/data/bossScaling.ts` her harita için ayrı zırh ve HP tutuyor:

| Harita | Zırh | Boss HP | Tavanın oranı |
|---|---|---|---|
| 1 Değirmen Geçidi | 10 | 700 | %92,0 |
| 2 Taş Köprü | 5 | 712 | %80,0 |
| 3 Kül Ovası | 2 | 1023 | %80,0 |

Zırhın haritayla düşmesi bilinçli: geç haritalarda altın daha çok noktaya
bölündüğü için tahtanın ortalama kademesi düşüyor ve yüksek zırh o tahtayı
hasar tabanına mahkûm ediyor. HP `0,80 × o haritanın en zayıf kol tavanı`
olarak türetiliyor (`research/01` §12) ve regresyon bandıyla (±%6)
korunuyor — ekonomi veya geometri değişirse test kırılır, sayı elle
ayarlanmaz.

## 10. Juice — hissi taşıyan katman

TD'de oyuncu çoğu zaman **izler**. İzlenen şey tatmin edici olmak zorunda.

- **Ekran sarsıntısı:** yönlü, darbe vektörü boyunca; süre 0.12–0.25 sn;
  üstel sönüm. Yalnızca top patlaması, boss vuruşu ve can kaybında. Her okçu
  atışında sarsıntı olmaz.
- **Hit-stop:** 60–80 ms. Yalnızca boss hasarı ve düşman ölümünde. Hareket hiç
  değişmese bile beyin bunu "daha ağır vuruş" olarak okur.
- **Squash & stretch:** düşman ölürken 1.3× yatay ezilme + kaybolma, 120 ms.
- **Parçacıklar:** darbe yönünde dışa; ilk kare parlak altın/vermilyon,
  hızla koyu duman/toza sönüm. Aynı anda en fazla 300 parçacık (havuzlu).
- **Hasar sayıları:** yukarı süzülür; renk kodu §3'te. `BitmapText`, `Text` değil.
- **Altın uçuşu:** düşman ölünce altın ikonu HUD sayacına doğru bezier ile uçar,
  vardığında sayaç tick sesiyle artar.
- **Kule yerleşimi:** toz halkası + 40 ms hafif zoom + tok bir "yerleşti" sesi.
- **Can kaybı:** ekran kenarında vermilyon vinyet nabzı, 400 ms.
- **Dalga bitişi:** altın sayacı tek tek sayarak artar (anında değil).

Ayarlarda **Ekran sarsıntısı** ve **Efekt yoğunluğu** kapatılabilir olmalı;
`prefers-reduced-motion` varsayılanı düşük yapar.

**2× hızda:** hit-stop devre dışı, parçacık yoğunluğu yarıya iner. Yoksa
hızlandırılmış oyun okunmaz hale gelir.

## 11. Bilgi paneli

"Bilgi eksikliği" türün 1 numaralı şikâyeti. Kule seçildiğinde gösterilenler:

| Gösterge | Neden |
|---|---|
| Ham hasar + atış hızı | Temel |
| **Hasar tipi rozeti** (fiziksel/büyü) | Zırh/direnç kararının tamamı buna bağlı |
| **Seçili düşman tipine karşı etkin DPS** | Ham DPS yanıltıcı: okçu T2, boss'a 1.95 DPS |
| Menzil dairesi + **kapsanan yol** | §4.5 |
| Uçana vurur/vurmaz ikonu | §4.2 |
| Yükseltme farkı (öncesi → sonrası) | Yükseltme kararı |
| Satış iadesi (%70) | |

En kritik olan üçüncüsü. Panelin altında küçük bir düşman ikonu şeridi;
üstüne gelince o düşmana karşı etkin DPS yazılır. Hesap zaten `applyDamage`
saf fonksiyonunda var — maliyeti neredeyse sıfır, getirisi tasarımın tüm
karşı-oyun katmanını görünür kılmak.

## 12. Ses

- Her kule ailesinin ayrı atış sesi, ±%8 rastgele perde kayması (tekdüzelik önler).
- Ölüm, altın, yerleştirme, yükseltme, hata (yetersiz altın), dalga başlangıcı,
  boss girişi, kazanma/kaybetme.
- Format: **yalnız `.m4a` (AAC)**. `.ogg` kopyası üretilmez — hedef
  tarayıcıların hepsinde AAC var, çift format paketi gereksiz büyütüyor.
- Müzik: 2 parça (menü + oyun), `.m4a` 96 kbps mono, döngü.
  **İlk dalgadan sonra yüklenir.**
- Varsayılan ses açık ama tek tuşla kapatılabilir, tercih kaydedilir.
- Reklam oynarken ses kısılır (Poki şartı).

## 13. Kapsam dışı (v1'de yok)

Bunlar bilinçli olarak dışarıda: kahraman birimi, meta yükseltme ağacı, sonsuz
mod, günlük sıralama, çoklu oyuncu, harita editörü, başarımlar.
v1 bittikten sonra tartışılır.

**Kapsam dışı değil, sonradan eklendi:** 2× hız ve duraklatma (§1) —
ikisi de mimari karar olduğu için M0'da kurulur.

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
| Kritik / zayıflık | Altın | %140 |

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
| Trol | 400 | 30 | 4 | 0 | 24 | 8 | 6 HP/sn yenilenme |
| Örümcek Ana | 150 | 50 | 0 | 0.20 | 18 | 6 | Ölünce 3× yavru (HP 30, hız 90) |
| **Ogre Şef** (boss) | **700** | 28 | 10 | 0.25 | 60 | 25 | Kışla askerlerini tek vuruşta öldürür |

Sızma cezası: normal 1 can, Trol/Örümcek Ana 2 can, boss 10 can.

### Boss HP'si neden 2200 değil 700

Eski 2200 değeri **matematiksel olarak öldürülemezdi.** Tek bir düşmana
verilebilecek toplam hasar, kule yerleşiminden bağımsız olarak
`Σ (DPS × kapsananYol) / hız` ile sınırlı. Harita 1'de 8 yapı noktasının
hepsi Tier 3 olsa ve Meteor iki kez kullanılsa bile mutlak tavan **2131**.
Gerçekçi bir Tier 2 tahtasında tavan **899**.

700 değeri o tavanın %78'i — zorlayıcı ama geçilebilir.
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

| # | Ad | Tema | Yol | Yapı noktası | Giriş | HP/Altın çarpanı | Başlangıç altını |
|---|---|---|---|---|---|---|---|
| 1 | Değirmen Geçidi | Yeşil vadi, değirmen | Tek yol, 2 keskin viraj | 8 | 1 | 1.0 | 280 |
| 2 | Taş Köprü | Nehir, taş köprü, sis | Y şeklinde ikiye ayrılır, köprüde birleşir | 10 | 1 | 1.6 | 340 |
| 3 | Kül Ovası | Yanmış toprak, volkanik | İki ayrı giriş, kalede birleşir | 12 | 2 | 2.6 | 400 |

**Altın çarpanı HP çarpanına eşittir.** Eskiden yalnız HP ölçekleniyordu;
altın ve kule maliyetleri sabit kaldığı için harita 3'te altın/HP oranı
%38'e düşüyordu ve oyuncunun eline 12 noktayı doldurmaya bile yetmeyen para
geçiyordu.

**Ayrık yol uyarısı:** harita 2 ve 3'te Kısıt A hesabı **her kol için ayrı**
yapılır. Toplam DPS yanıltıcıdır — kolun yalnızca onu gören kuleleri sayılır.

### Kapsanan yol — asıl denge kolu

Ölçülmüş: aynı kule düz hattın önünde 2 saniye, arkasında 8-12 saniye ateş
ediyor; tek kulede **%44 toplam hasar farkı**. Yani haritaların yapı noktası
*sayısı* değil, her noktanın **kapsadığı yol uzunluğu** dengeyi belirliyor.

**Kabul kriteri:** yapı noktası başına ortalama kapsanan yol **≥ 450 px**
(T1 menzil 150'nin 3 katı). Altındaysa harita fazla düz demektir ve boss
dalgası çalışmaz.

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
}
```

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

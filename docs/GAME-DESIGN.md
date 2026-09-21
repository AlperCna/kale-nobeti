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

- **Hız:** 1× → 2× → 3× → 1× döngüsü tek butonla (3× `M9-T03`'te eklendi;
  denge etkisi ölçüldü, `GameClock.setScale` dokümanı). Bu bir konfor
  özelliği değil, mimari karardır — bkz. `CLAUDE.md` TIER 1 kural 8.
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
- **UI zemini yüzeyin işine göre seçilir, çerçeve her zaman parşömen**
  (`docs/plan/iyilestirme/G04-towerinfopanel-paleti.md`): parşömen zemin
  eylem yüzeylerinde (buton, menü, ayar); koyu mürekkep zemin yoğun bilgi
  yüzeylerinde (`TowerInfoPanel` — yedi gösterge, açık renkli metin üstüne
  kurulu; açık zemine geçmek okunurluğu riske atardı). Çerçeve dili
  (`ParchmentFrame`, köşe+kenar) ikisinde de aynı — göz "bu aynı aileden"
  diyor, zemin rengi bilgi yoğunluğuna göre değişiyor.

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

> **Aşağıdaki dört kule tablosu ÜRETİLİYOR** (`node scripts/kurallar.mjs`)
> — maliyet, hasar, atış hızı, menzil, patlama ve uçan çarpanı
> `data/towers.ts` ve `data/barracks.ts`'ten okunuyor. `M48`'de burada iki
> eski sayı vardı (Keskin Nişancı 34, gerçek 41; Yıldırım 30, gerçek 36);
> `M49`'da üreticiye devredildi ki bir daha eskimesin. **Dalların tasarım
> gerekçesi** (neyin neyle takas edildiği) tabloların altında, elle yazılı
> kalmaya devam ediyor — o düzyazı veriden türetilemez.

<!-- ÜRETİLEN:kule-okcu -->
| Kademe | Maliyet | Hasar | Atış/sn | Menzil | Uçan |
|---|---|---|---|---|---|
| T1 | 70 | 8 | 1,1 | 150 | tam |
| T2 | 110 | 14 | 1,3 | 165 | tam |
| T3a Keskin Nişancı | 170 | 44 | 0,6 | 260 | tam |
| T3b Kundakçı | 170 | 9 + **11**/sn yanma (4 sn) | 1,4 | 195 | tam |
<!-- /ÜRETİLEN:kule-okcu -->

**`M11` Faz 5 (S95): Okçu ÖLÜ AİLEYDİ.** Maliyet dahil ölçüldü — tahta
her aile için yeniden türetilip ucuz aileye hak ettiği fazladan kule
verildi. Okçu yine de dört haritada **14 / 23 / 28 / 33** can
kaybettiriyordu (karışık tahta 4 / 7 / 13 / 15): oyuncunun Okçu kurması
her zaman hataydı. Sebep yapısal — Okçu'nun **hiçbir çarpanı yok**
(Top patlıyor, Büyü zırh yok sayıp zincirliyor), tek üstünlüğü menzil
ve fiyat, ama bütün noktalar dolduğu için fiyat yalnız *erken*
yükseltmeye dönüşüyor. Çözüm yeni bir mekanik değil **kademe çıktısını
hizaya almak** oldu; ham DPS artık Okçu T2 18,2 · Büyü 18 · Top 18,7.

**`M11` Faz 2 (S91):** Kundakçı yanması 4 → 7/sn, menzili 165 → 195.
Öncesi hiçbir senaryoda kazanmıyordu: aynı menzilde, daha az vuruş
hasarıyla Keskin Nişancı'nın zayıf bir kopyasıydı. Kimliği artık
**çok hedefte sabit hasar** — yanma hedef başına işliyor, yani düşman
sayısıyla doğrusal büyüyor; Keskin Nişancı ise **tek sert** hedefte.

### 4.2 Top Kulesi — alan hasarı, yavaş
Fiziksel hasar, patlama yarıçapı. Kalabalığın cevabı.
**İki dal da uçana vurur (hasarın %50'si)** — `M11` Faz 2'ye kadar Havan hiç vuramıyordu, bkz. aşağıdaki not.

<!-- ÜRETİLEN:kule-top -->
| Kademe | Maliyet | Hasar | Atış/sn | Menzil | Yarıçap | Uçan |
|---|---|---|---|---|---|---|
| T1 | 110 | 22 | 0,5 | 140 | 45 | **vuramaz** |
| T2 | 160 | 34 | 0,55 | 150 | 55 | **vuramaz** |
| T3a Havan | 240 | 52 | 0,45 | 230 | 65 | %50 |
| T3b Barut Fıçısı | 240 | 26 | 0,9 | 150 | 85 | %50 |
<!-- /ÜRETİLEN:kule-top -->

**`M11` Faz 2 (S91) — ikisinin DPS'i artık EŞİT (21,6).** Takas tek bir
eksene indi: **menzil ↔ patlama yarıçapı.** Havan uzağı dar vuruyor
(230/55), Barut Fıçısı yakını geniş (150/85). Ölçüm ikisini de
kazandırıyor: Barut kalabalık ve hızlı sürülerde (kurt binicisi ×40:
1260'a 2237), Havan zırhlı/uçan/tek sert hedefte (zırhlı ork ×30:
1384'e 2272). Test: `systems/dalKimligi.test.ts`.

**Boss'un verb'ü haritaya göre (`M13`).** Altı haritanın altısında da
aynı Ogre Şef vardı; değişen tek şey zırh ve HP'ydi. `M10-T03`'ün
"her harita bir şey öğretir" kuralı boss'a da uygulandı: ilk dört
harita boss'u **tanıtıyor** (düz), harita 5 ikinci evre, harita 6
**çağırma**. Tablo `enemies.BOSS_YETENEGI`.

**Patlamanın artık bir BEDELİ var (`M11` Faz 5, S22 kapandı).** Hasar
merkezde %100, kenarda **%35**; arası doğrusal
(`BALANCE.patlamaKenarOrani`, `ProjectileSystem.#patlat`). Buraya kadar
yarıçapın içindeki **herkes tam** hasar alıyordu, yani alan hasarı
bedava bir çarpandı ve ölçüm sonucunu gösterdi: yalnız Top kuran
oyuncu, modelin "makul oyuncu" tahtasından her haritada iyiydi
(13 → 7, 15 → 8). Azalma tek başına yetmedi — Okçu'nun düzeltmesiyle
**birlikte** türetildi (S95).

**Yavaşlatma Barut Fıçısı'ndan ALINDI** ve Buz'un tek kimliği oldu.
Sebep yapısal: Kısıt A `DPS × kapsananYol / hız` ve yavaşlatma **hızı
böler** — yani yavaşlatan bir kule yalnız kendi hasarını değil
**bütün tahtanın** hasarını çarpıyor. İki dalın biri yavaşlatıp diğeri
yavaşlatmıyorsa seçim yok: yavaşlatan her zaman kazanır.

**Havan da artık uçana vuruyor (%50).** `airMultiplier: 0` *kategorik*
bir delikti: harpi dalgasında Havan'lı tahtanın Top kısmı tamamen ölü
kalıyordu ve oyuncu dal seçerken bunu tek bir dalgaya bakarak
yapıyordu. Asıl gerekçe (4 aileden 2'si uçana etkisizse tahtanın yarısı
ölü — `docs/research/03-mekanik-tasarim.md` §2) zaten bunu söylüyordu;
uçan farkı artık kimlik değil, menzil/yarıçap kimlik.

### 4.3 Büyü Kulesi — zırh delen
Büyü hasarı. Zırhlı düşmanların tek temiz cevabı. Büyü dirençli düşmanlara zayıf.

<!-- ÜRETİLEN:kule-buyu -->
| Kademe | Maliyet | Hasar | Atış/sn | Menzil | Yarıçap | Uçan |
|---|---|---|---|---|---|---|
| T1 | 100 | 14 | 0,7 | 155 | — | tam |
| T2 | 150 | 24 | 0,75 | 170 | — | tam |
| T3a Yıldırım | 230 | **39**, 3 hedefe zincirleme (her sıçramada %55'ine düşerek) | 0,7 | 170 | — | tam |
| T3b Buz | 230 | 8 + %30 yavaşlatma (2 sn) | 0,8 | 180 | 30 | tam |
<!-- /ÜRETİLEN:kule-buyu -->

**`M11` Faz 2 (S91):** Buz **tahtanın yavaşlatıcısı**. Hasarı bilerek
düşük (8) — ödediği bedel bu; karşılığında yavaşlatma bütün tahtanın
hasarını çarpıyor (yukarıdaki §4.2 notu). Küçük bir patlama (30)
eklendi ki yavaşlatma **tek hedefe** değil gruba değsin: eskiden Barut
Fıçısı'nın patlamayla dağıttığı daha zayıf yavaşlatma, Buz'un tek
hedefli güçlü yavaşlatmasından **daha çok** düşmana değiyordu.
Ölçüm: kalabalıkta ezici (ork ×60: 3928'e 13515), tek sert hedefte ve
uçanda Yıldırım önde.

### 4.4 Kışla — asker çıkarır, yolu tıkar
Hasar vermez, **zaman kazandırır**. Türün en önemli mekaniği: düşmanı durdurup
diğer kulelerin menzilinde tutar. Uçanlar engellenemez.

<!-- ÜRETİLEN:kule-kisla -->
| Kademe | Maliyet | Asker | Asker HP | Asker DPS | Diriliş (sn) | Ek |
|---|---|---|---|---|---|---|
| T1 | 90 | 2 | 45 | 5 | 8 | — |
| T2 | 140 | 2 | 75 | 8 | 7 | — |
| T3a Paladin | 210 | 2 | 140 | 11 | 6 | — |
| T3b Haydutlar | 210 | 3 | 70 | 9 | 5 | kaçınma %25 |
<!-- /ÜRETİLEN:kule-kisla -->

**Paladin'in "kalkan"ı KALDIRILDI (`M11` Faz 3, S43).** Bu satır uzun
süre `11 + kalkan` yazıyordu ve kalkanın sayısı hiç verilmemişti.
Ölçüm sayıyı seçmek yerine mekaniği reddetti: iki dal **kalkansız da**
altı senaryoda 4-2 bölüşüyor (Paladin kesintisiz baskı / zırhlı / hızlı,
Haydutlar sürü / dalgalı), hiçbir kalkan değeri (0-100) kazananı
değiştirmiyor, ve HP ile kalkanın toplamı sabit tutulduğunda bütün
ölçümler **birebir aynı** çıkıyor — yani kalkan, candan farklı bir şey
değil. Gerekçenin tamamı `src/data/barracks.ts` başlığında; kilit
`systems/kislaDali.test.ts`.

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

<!-- ÜRETİLEN:dusman -->
| Düşman | HP | Hız | Zırh | B.Direnç | Altın | Puan | Sızma | Özellik |
|---|---|---|---|---|---|---|---|---|
| Goblin | 45 | 60 | 0 | 0 | 3 | 1 | 1 | — |
| Ork Savaşçı | 110 | 45 | 2 | 0 | 6 | 2 | 1 | — |
| Kurt Binicisi | 60 | 110 | 1 | 0 | 9 | 3 | 1 | — |
| Harpi | 70 | 75 | 0 | 0 | 9 | 3 | 1 | **Uçar** — yolu takip etmez, engellenemez |
| Zırhlı Ork | 160 | 38 | 8 | 0 | 12 | 4 | 1 | — |
| Şaman | 130 | 42 | 0 | 0,4 | 15 | 5 | 1 | Yakındakilere 8 HP/sn iyileştirme (yarıçap 90) |
| Trol | 400 | 30 | 4 | 0 | 24 | 8 | 2 | 6 HP/sn yenilenme |
| Örümcek Ana | 150 | 50 | 0 | 0,2 | 18 | 6 | 2 | Ölünce 3× yavru |
| Tünelci | 90 | 70 | 1 | 0 | 9 | 3 | 1 | **Yeraltı geçişi** — yolun %15-%60 arasında hedeflenemez |
| **Ogre Şef** (boss) | 700 | 28 | 10 | 0,25 | 60 | 25 | 10 | — |
| Örümcek Yavrusu | 30 | 90 | 0 | 0 | 0 | 0 | 1 | — |
<!-- /ÜRETİLEN:dusman -->

> **Yukarıdaki tablo ÜRETİLİYOR** (`node scripts/kurallar.mjs`) — sayılar
> `data/enemies.ts`'ten okunuyor, elle düzenlenmiyor. `M48`'de bu tablonun
> iki satırı eksikti (Tünelci `M12`'den beri, Örümcek Yavrusu hiç);
> `M49`'da üreticiye devredildi ki bir daha eskimesin.

**Kadronun tasarım rolleri** (bunlar veri değil, o yüzden elle yazılıyor):

- **Ork Savaşçı** — zırh kavramını tanıtır; oyuncunun ilk "hasar tipi
  önemli" anı.
- **Zırhlı Ork** — fiziksele dirençli; Büyü ailesinin varlık sebebi.
- **Kurt Binicisi** — çok hızlı; yavaşlatmanın ve yol boyu kapsamanın
  değerini gösterir.
- **Ogre Şef** — kışla askerlerini tek vuruşta öldürür, yani "tut ve
  erit" stratejisini bozar. HP'si **harita başına türetiliyor**
  (`data/bossScaling.BOSS_HP_BY_MAP`, §12); tablodaki değer harita 1'in.
- **Örümcek Yavrusu** — altın ve puan **vermez**: yavrudan altın gelseydi
  "altın = 3 × puan" oranı bozulurdu.

\* Boss HP'si **harita başına türetiliyor**, bu sütundaki 700 yalnız harita
1'in değeri — tablo `data/bossScaling.BOSS_HP_BY_MAP` içinde ve §12'de
anlatılıyor.

> **`M48` — bu tabloya iki satır eklendi.** Tünelci (`M12`) ve Örümcek
> Yavrusu hiç girmemişti; kadro dokuz görünüyordu, oysa **on bir** tür var.
> Listelenen dokuzun bütün sayıları `enemies.ts` ile birebir tutuyor.

Sızma cezası: normal 1 can, Trol/Örümcek Ana 2 can, boss 10 can.

### Ogre Şef (700) ve Trol (400) — ölçümle doğrulandı

Bu iki sayı önceden `~300 px kapsanan yol` **varsayımıyla** türetilmişti ve
o varsayım `research/03` §3'ün "≥ 450 px" kriteriyle çelişiyordu. M1'de
Harita 1 çizildi ve kapsama ölçüldü: **296,3 px** (menzil 150).

> **Bu tablo bir ÖLÇÜM KAYDI, referans değil** (`M50`). `M1`'de harita 1
> çizilip kapsama ölçüldüğünde alınmış ve *"450 px mi 300 px mi"*
> tartışmasını kapatan kanıt bu. **Bugünkü değerler farklı** — boss oranı
> artık %78,7 değil **%87,7** (çarpanlar M14/M18/M20/M22/M47'de yeniden
> türetildi). Güncel sayılar için üretilen tabloya bak (§12 boss
> ölçeklemesi) ya da `docs/KURALLAR.md`. Buradaki sayılar **bilerek
> donduruldu**: argümanın dayandığı ölçüm değişirse argüman okunamaz hâle
> gelir.

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
> oradaki HP çarpanı (**1,3 ve 3,0** — S87'de yeniden türetildi) ve yapı
> noktası sayısı (10 ve 12) farklı.
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

<!-- ÜRETİLEN:kadro -->
| Harita | Yeni düşmanlar |
|---|---|
| 1 · Değirmen Geçidi | Goblin, Ork Savaşçı, Kurt Binicisi, Harpi, **Ogre Şef** (boss) |
| 2 · Taş Köprü | Zırhlı Ork, Şaman |
| 3 · Kül Ovası | Trol, Örümcek Ana |
| 4 · Kar Geçidi | — (yeni tip yok) |
| 5 · Kadim Harabe | — (yeni tip yok) |
| 6 · Sisli Bataklık | Tünelci |
<!-- /ÜRETİLEN:kadro -->

> **Yukarıdaki tablo ÜRETİLİYOR** — sütun `enemyRoster` farkından
> türetiliyor (`M50`). Elle yazılıyken **üç haritada kalmıştı**; harita
> 4-6 `M8`'de geldi, tablo büyümedi.

**Her harita ne tanıtıyor** (bu düzyazı veriden türetilemez, elle yazılı):

| Harita | Tanıtılan kavram | Nasıl |
|---|---|---|
| 1 | Zırh (hafif, 2), hız, uçan | yeni tip |
| 2 | Ağır zırh (8), büyü direnci, iyileştirme | yeni tip |
| 3 | Yenilenme, bölünme, çoklu giriş | yeni tip + harita geometrisi |
| 4 | **Buz kalkanı** | mevcut tipe **değiştirici** (`orkSavasci` + `KAR_GECIDI_KALKANI`) |
| 5 | **Boss ikinci evresi** | bossa değiştirici (`KADIM_HARABE_EVRE2`) |
| 6 | **Yeraltı geçişi** + **çağırma** | yeni tip (Tünelci) **ve** bossa değiştirici |

Üretilen tablonun ortaya çıkardığı şey: **harita 4 ve 5 hiç yeni düşman
tipi tanıtmıyor.** Bu bir eksiklik değil, bilinçli bir kalıp — geç
haritalar yeni *tip* yerine tanıdık tipe **değiştirici** takıyor
(kalkan, ikinci evre). Oyuncu yeni bir silüet öğrenmek yerine bildiği
silüetin kuralının değiştiğini öğreniyor. `M10`'un kararı, `M12`/`M13`
onu bozmadan üstüne yeni tip **ve** değiştirici birden koydu.

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
| Şaman | Keskin Nişancı — **`first` ile ODAKLAN**, `last` değil (S83) |
| Harpi sürüsü | Okçu + Büyü + Top (ikisi de %50 vuruyor; **Havan önde**, uzun menzili uçan hattını daha çok görüyor — S91) |
| Trol | Kışla ile tut + yoğun tek hedef |
| Kurt Binicisi | **Buz** (yavaşlatma artık yalnız onda) / Barut Fıçısı'nın geniş patlaması |
| Ogre Şef | Büyü + Top, **`weakest` ya da `closest`** hedefleme (S94: `strongest` ölçümde en kötü çıktı), Meteor |
| **Buz kalkanı** (harita 4 Ork Savaşçı) | Patlama/ağır vuruş — kalkan **toplam** bir havuz, erimeden cana hasar geçmiyor |
| **Ogre Şef 2. evre** (harita 5, can %50) | Hız ×1,6 — kaleye varmadan bitirmek gerekiyor |
| **Tünelci** (`M12`, yeraltı geçişi) | Yolun %15-%60'ında **hedeflenemez**: kuleleri aralığın DIŞINA kur. Patlama ve önceden tutuşmuş yanma hâlâ değer |

**Yeni mekanikler oyuncuya söyleniyor (`M15`).** Dalga telgrafı düşmanı **haritaya göre** çözüyor — eskiden temel tanımı gösteriyordu ve harita 6'nın bossunu "zırh 10, yetenek yok" diye yazıyordu (S106). Yeraltı geçişi ayrıca bir öğretici ipucu alıyor (`hintBurrow`), buz kalkanıyla aynı ölçütle: sonucu değiştiriyor ve kendiliğinden keşfedilemiyor. **Çağırmaya ipucu verilmedi** — olay görünür (ekrana yandaş geliyor) ve telgraf zaten "yandaş çağırır" diyor.
| **Ogre Şef çağırma** (harita 6, `M13`) | Canının her çeyreğinde 2 Ork Savaşçı doğuruyor — boss'u dilimlemek ekrana gövde getiriyor; alan hasarı öbeği topluyor |

**Hedefleme modları ölçüldü (`M11` Faz 4, S94).** Yedi senaryoda, metrik
can kaybı: `weakest` 4 · `last` 3 · `first` 3 · `closest` 1 kazandı;
**`strongest` hiçbirini tek başına kazanmadı.** Boss tavsiyesi bu yüzden
düzeltildi: tavan yetmiyorsa boss'a odaklanmak onu yine öldürmüyor ama
çetenin sızmasına izin veriyor. Kilit: `systems/hedefModu.test.ts`.

**İki yetenek de meşru (`M11` Faz 4 · `M19`'da yeniden ölçüldü).**
`waveSim` oyuncunun yeteneklerini de simüle edebiliyor (varsayılan
kapalı). Güncel ölçüm (Zor, taban çift, can kaybı):

| harita | yok | Meteor | Takviye | ikisi |
|---|---|---|---|---|
| Kar Geçidi     | 12 |  9 | 11 | 9 |
| Kadim Harabe   | 13 | 11 | 10 | 9 |
| Sisli Bataklık | 14 |  8 | 10 | 7 |

Takviye Meteor'un gölgesinde değil ve ikisi birden harita 5-6'da
**kesin** en iyisi.

**Takviye bir dönem can kaybettirdi ve sebebi öğreticiydi (S111).**
`M16` dalgaları üst üste bindirince askerlerin düşmanı *tutması*
bedelli hâle geldi: tutulan düşman ölmüyorsa gecikme bir sonraki
dalgaya taşınıyor ve birikiyordu (Kar Geçidi 13 → **17**). `M18`
tahtayı düzeltince tablo tersine döndü. Ölçülen mekanik nettir:
Takviye artık koşuyu **geciktirmiyor** (süre ±1 sn, tepe düşman aynı),
yalnız **daha çok öldürüyor** — +1 · +3 · +4 düşman, kurtarılan canla
(−1 · −3 · −4) birebir. Yani Takviye'nin değeri **tahtanın tuttuğu
şeyi öldürebilmesine** bağlı: zayıf tahtada tutmak erteleme, güçlü
tahtada öldürme.

**Kule sinerjisi (M10):** yavaşlatılmış düşman **fiziksel** hasardan
×1,25 etkileniyor. Yani **Buz** ile Okçu-Top birlikte çalışıyor;
Büyü'ye uygulanmıyor (§3: büyü zaten zırhı yok sayıyor, ikisini birden
güçlendirmek seçimi yok ederdi). **S91'den sonra yavaşlatmanın tek
kaynağı Buz** — sinerji böylece bir *aile arası* karar oldu: Büyü
dalını Buz yapan oyuncu, Okçu ve Top kulelerini de güçlendiriyor.

## 6. Ekonomi

- Başlangıç altını: **280** (harita başına değişir, bkz. §9), başlangıç canı: **20**.
- Öldürme altını yukarıdaki tabloda (`3 × puan`).
- Dalga bitiş bonusu: `30 + dalgaNo * 5`.
- **Erken başlatma bonusu:** `kalanSaniye × ceil(dalgaNo / 2) × altınÇarpanı`.
  Sayaç 20 sn. **İlk 3 dalgada kapalıdır** — buton dalga 4'te açılır.
- Kule satışı %70 iade.

Eski sabit `+1/saniye` bonusu dalga 1'de gelirin %28'iydi, dalga 10'da %10.
Yani yeni oyuncuya "dalga telegrafını okuma, hemen bas" öğretiyordu — telegrafı
zorunlu kılan kararla doğrudan çelişiyordu.

**`M14` — iki düzeltme, ikisi de ölçümden:**

1. **Bonus artık altın çarpanını izliyor** (S101). İzlemiyordu ve sabit
   520 altın ediyordu (dalga 4-10, hemen basınca): harita 1'de dalga
   10'a kadarki gelirin **%32'si**, harita 6'da **%3'ü**. Yani buton geç
   haritalarda gürültüye iniyordu — "geç oyunda gerçek bir karar"
   iddiasının tam tersi. Öldürme altını, dalga bonusu (S70) ve başlangıç
   altını (S72) çarpanı izliyordu; bu tek kalem atlanmıştı.

2. **"Gerçek bir karar" ifadesi düzeltildi** (S102). Kod okundu: dalga
   ancak saha **tamamen boşalınca** bitiyor (`WaveManager.#dalgaBittiMi`
   `pool.activeCount > 0` iken dönmüyor), yani hazırlık aşaması hiçbir
   zaman düşman varken başlamıyor ve **dalgalar üst üste binemiyor**.
   Hazırlık süresi de altın getirmiyor. Sonuç: erken başlatmanın hiçbir
   bedeli yok — bu bir **risk kararı değil, hazır olmanın ödülü**. Tempo
   becerisi olarak değerli, ama doküman onu olduğundan fazla
   göstermemeli. Dalgaların üst üste binmesi ayrı bir tasarım kolu;
   maliyeti `OPEN-QUESTIONS` S102'de yazılı.

**`M16` — dalgalar artık üst üste biniyor, karar GERÇEK oldu (S102 kapandı).**

Kural değişti: dalga **kuyruk bitince** kapanıyor, saha boşalınca değil.
Hazırlık aşaması bir öncekinin artıkları hâlâ yoldayken başlıyor, yani
erken basmak "kalan saniyeyi altına çevir" ile "yenisini artıkların
üstüne çağır" arasında gerçek bir takas. Ölçülen can kaybı (Zor,
referans tahta, altı harita):

| politika | h1 | h2 | h3 | h4 | h5 | h6 |
|---|---|---|---|---|---|---|
| hep erken bas   | 0 | 3 | 11 | 16 | 30 | 44 |
| son birkaç kala | 0 | 0 |  4 |  8 | 10 | 23 |
| hiç basma       | 0 | 0 |  3 |  6 | 11 | 25 |

Yani **hep erken basmak harita 5-6'yı 20 canla geçilemez yapıyor**, ama
en iyi oyun "hiç basmama" da değil: sahada birkaç düşman kalınca basmak
harita 5'te 11'i 10'a indiriyor — bonusun çoğunu alıp kalabalığın
üstüne yeni dalga çağırmadan. Buton artık tempo becerisi değil **risk
kararı**.

İki yan etki ölçülmüştü; **ikisi de `M18`/`M19`'da kapandı.** Takviye
tek başına can kaybettiriyordu (S111 — tutmak gecikmeyi sonraki dalgaya
taşıyordu) ve pahalı olan Büyü ailesi tabanda aç kalıyordu (S110).
İkisinin de sebebi yetenek ya da aile değil **referans tahtaydı**:
`balanceChecks` dalga başına bir yavaşlatıcı kuruyordu (S112) ve tavan
yavaşlatmayı hiç görmüyordu (S113).

**Denge tabanı:** referans oyuncu erken **basmıyor**
(`systems/referansOlcum.ts`). Referans tahta hangi ekonomiyi
varsayıyorsa simülasyon da onu oynamak zorunda — ikisi ayrışırsa tahta
hak etmediği altınla kurulur ve bütün denge sayıları iyimserleşir
(S109'da tam olarak bu bulundu).

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

> **`M83` (S24) — bu çarpan bir VARSAYIMDI ve ölçüm onu üç kat
> abartılı buldu.** Formülün kendisi `S26`/`S27` ile zaten düşmüştü
> (`dalgaSüresi` ve `aktiflikOranı` statik veriden hesaplanamıyor, yerine
> simülasyon kondu) ama `0,75` `BALANCE.focusLoss` olarak veri dosyasında
> kalmıştı — **hiçbir formül onu okumuyordu**, yalnız üretilen belge onu
> yaşayan bir kural gibi basıyordu. Simülasyon artık kaybı **sayıyor**:
> uçuşta hedefi ölen tek hedefli mermiler + kalan canı aşan hasar
> (`SimResult.atilanHasar` / `bosaHasar`). Ölçülen verim (1 = hiç kayıp):
> **0,87 · 0,95 · 0,96 · 0,96 · 0,97 · 0,97** — yani gerçek kayıp %25 değil
> **%3-13**. En yüksek kayıp öğretici haritada, çünkü orada atış başına
> hasar düşmanın canının büyük bir kısmı (24 hasar, 8 canlık goblin) ve
> aşırı öldürme baskın; geç haritalarda düşman HP'si 8-10 kat büyük olduğu
> için aynı atış fireyi üretmiyor. `BALANCE.focusLoss` **silindi**; güncel
> tablo `KURALLAR.md`'de ve her `build`'de yeniden ölçülüyor.

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

### Yükseltme — `M99`, S117'nin gider kalemi

Yukarıdaki değerler **seviye 1**. Her yetenek tur içinde iki kez
yükseltilebiliyor; yükseltme **o haritanın altınıyla** alınıyor ve harita
bitince sıfırlanıyor (beklemenin S49'daki kuralıyla aynı gerekçe).

| Seviye | Meteor hasarı | Takviye askeri | Fiyat |
|---|---|---|---|
| 1 | 180 | 2 | — (başlangıç) |
| 2 | 250 | 3 | `180 × altınçarpanı` |
| 3 | 330 | 4 | `320 × altınçarpanı` |

**Neden var:** S117 ölçtü — geç haritalarda gelirin yarısından fazlası
harcanmadan kalıyor, çünkü tahtanın maliyeti nokta sayısıyla sınırlı ama
gelir harita çarpanıyla büyüyor. `M79` fiyat çarpanını denedi ve ölçüm
yalnız harita 4'ü geçirdi; bu ikinci kol.

**Neden fiyat altın çarpanını izliyor:** gider kalemi gelirle aynı ölçekte
büyümeli — `startGold`'un S72'de çarpanı izlemesiyle aynı gerekçe. Sonuç
ölçüldü: Değirmen Geçidi'nde ilk yükseltme (180) koşarken elde kalan en
çok altından (94) pahalı, yani orada **hiç görünmüyor**; Sisli
Bataklık'ta dört yükseltmenin toplamı 11 000 ve atıl altın 11 974, yani
neredeyse tamamını emiyor. Aradaki haritalarda **seçim** doğuyor (Kar
Geçidi: dörtte ikisi).

**Neden hasar, bekleme değil:** bekleme düşürmek yeteneğin *ne zaman*
ateşlendiğini değiştirir ve ölçümü gürültülü yapar; hasar/asker sayısı
tek eksende ve ekranda okunuyor.

**Denge sayıları kıpırdamadı:** bütün referans ölçümler yetenekleri
**kapalı** koşuyor (`YetenekKullanimi 'yok'`), yani rampa, Kısıt A/B, boss
türetmesi ve zorluk tablosu bu eklemeden etkilenmiyor.

## 9. Haritalar

> **`M48` — bu tablo iki türlü eskimişti.** (1) **Üç harita eksikti:** M8
> ile 4-6 geldi, tablo üçte kaldı. (2) **Listelediği sayıların yarısı
> yanlıştı:** harita 2 HP `1,3` (gerçek 1,6) ve altın `1,6` (gerçek 2,2,
> `M20`/S118), harita 3 HP `3,0` (gerçek 2,8). **`M49`'da üreticiye
> devredildi** — tablo artık `node scripts/kurallar.mjs` ile `maps.ts`'ten
> üretiliyor, elle düzenlenmiyor ve bir daha eskiyemez.

<!-- ÜRETİLEN:harita -->
| # | Ad | Yapı noktası | Giriş | HP çarpanı | Altın çarpanı | Başlangıç altını |
|---|---|---|---|---|---|---|
| 1 | Değirmen Geçidi | 8 | 1 | 1 | 1 | 280 |
| 2 | Taş Köprü | 10 | 2 | 1,6 | 2,2 | 616 |
| 3 | Kül Ovası | 12 | 2 | 2,8 | 3,8 | 1064 |
| 4 | Kar Geçidi | 12 | 1 | 7,35 | 7,8 | 2184 |
| 5 | Kadim Harabe | 15 | 2 | 10,05 | 10,2 | 2856 |
| 6 | Sisli Bataklık | 15 | 1 | 8,5 | 11 | 3080 |
<!-- /ÜRETİLEN:harita -->

Tema ve yol geometrisi tablodan **çıkarıldı**: ikisi de `maps.ts` içinde
waypoint dizisi ve arka plan olarak yaşıyor, burada ikinci bir kopya
tutmak tam olarak yukarıdaki eskimeyi üretiyordu.

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
- **S117** (`M79`) — **kule fiyatı da haritayla ölçeklenebiliyor**
  (`MapDef.costMultiplier`, bugün yalnız Kar Geçidi ×1,4). Gerekçe ölçüldü:
  fiyatlar MUTLAK, gelir ölçekli olduğu için tahta maliyeti / toplam gelir
  oranı kampanya boyunca 0,84'ten 0,36'ya savruluyordu — ekonomi 4. haritadan
  sonra karşı güç olmaktan çıkıyordu. **Değişen:** Kar Geçidi oranı 0,41 →
  **0,57**, boşta kalan altın %59 → %43. **DEĞİŞMEYEN:** yapı noktaları hâlâ
  4. dalgada doluyor, dalga 10 tahtası birebir aynı, can kaybı 14 → 13. Yani
  çarpan atıl altını emiyor, **kıtlığı geri getirmiyor**. Harita 5-6'ya
  konmadı: taranan her k değeri bir sağlamayı kırıyor (`OPEN-QUESTIONS` S117).
  Fiyatın tek adresi `towers.maliyet(ham, map)`; ham `.cost` okumasını
  bekçinin 18. kuralı yasaklıyor.
- **S82 → S86 → S87** — harita 3'ün çarpanı bir ara 2,5'e çekildi,
  **geri alındı**, sonra rampa yeniden türetilirken **3,0** oldu.
  `waveSim` M10'a kadar üç şeyi birden simüle etmiyordu: haritaya
  duyarlı boss (S80), düşman yetenekleri (S81) ve süreli kule etkileri
  (S86). Üçü kapanınca ölçülen zorluk rampası monoton çıkmadı; **S87**
  dört haritanın çarpanını ölçerek yeniden türetti.

- **S87 → S91 — ölçülen zorluk rampası (Zor'da can kaybı):**

  > **`M47` — bu tablo M14'ten beri eskiydi ve altı satırın beşi yanlıştı;
> `M49`'da ÜRETİCİYE devredildi.**
  > Aradan M14 (S101), M18 (S113), M20 (S118), M22 (S119) ve M47 (S95)
  > geçti; her biri çarpanları yeniden türetti, tablo hiç güncellenmedi.
  > Aşağıdaki değerler ölçülerek yenilendi. **Zor sütunu kaldırıldı:** Zor
  > yalnız başlangıç canını değiştiriyor (`hpScale` 1,0), yani can kaybı
  > Normal ile **birebir aynı** — ayrı sütun olması yanıltıcıydı.

<!-- ÜRETİLEN:rampa -->
| Harita | HP çarpanı | Altın çarpanı | Normal = Zor | Kolay (×0,80) |
|---|---|---|---|---|
| 1 · Değirmen Geçidi | 1 | 1 | 0 | 0 |
| 2 · Taş Köprü | 1,6 | 2,2 | 0 | 0 |
| 3 · Kül Ovası | 2,8 | 3,8 | 9 | 2 |
| 4 · Kar Geçidi | 7,35 | 7,8 | 14 | 3 |
| 5 · Kadim Harabe | 10,05 | 10,2 | 15 | 6 |
| 6 · Sisli Bataklık | 8,5 | 11 | 18 | 7 |
<!-- /ÜRETİLEN:rampa -->

  **`M14` (S101): dört çarpan yeniden türetildi.** Erken başlatma bonusu
  altın çarpanını izlemeye başlayınca geç haritaların referans tahtası
  zenginleşti ve rampa `0·3·4·15·14·18`'e düştü — harita 5, harita 4'ün
  altına inip monotonluğu kırdı. Tarama sonucu yeni rampa
  **`0 · 5 · 8 · 12 · 16 · 18`**, Kolay ×0,80'de `0 · 2 · 2 · 4 · 8 · 5`.
  Harita 2'nin HP çarpanı altın çarpanına (1,6) **dayandı**: S73'ün
  "altın ≥ HP" değişmezi 1,7'yi reddetti.

  **Harita 6'nın çarpanı harita 5'inkinden DÜŞÜK** (`M12` Faz 3) ve bu
  bir kusur değil: zorluk artık kadronun kendisinden geliyor. Tünelci
  yolun %15-%60'ında hedeflenemez, yani tahtanın kapsamasının yarısından
  çoğu ona karşı ölü. Harita 5'in çarpanıyla (7,0) ölçüm **24 can**
  verdi — 20 sınırının çok üstünde. Tarama: 5,8 → 10 · **6,2 → 16** ·
  6,4 → 19 · 7,0 → 24. `M8-T04`'ün dersi burada somutlaştı: *monoton
  çarpan monoton zorluk vermiyor, ölçüt çıktı olmalı.*

  Dört ölçüt: monoton · öğrenme yayı (2-3) Zor'da geçilebilir (< 12) ·
  harita 4-5 Zor'un tanımını karşılıyor (≥ 12) · Kolay'da hepsi ≤ 10.

  **`M11` Faz 5 (S95): 2 ve 3 bir kez daha türetildi** — aile dengesi
  düzeltilince (Okçu güçlendi, patlama bedel aldı) referans tahta
  değişti ve rampa `0·2·4·12·14`'e düştü; harita 2-3 çarpanları
  1,3 → **1,5** ve 2,4 → **2,6** ile geri getirildi. Boss HP'leri de
  aynı kuralla yeniden türetildi (aşağıdaki tablo).

  **`M11` Faz 2 (S91): 3-4-5 yeniden türetildi.** Dal dengesi referans
  tahtayı zayıflattı (Buz'un hasarı 20 → 8; karşılığında yavaşlatma,
  ama tahta başına bir tane) ve aynı çarpanlarla rampa `0·4·13·17·19`
  çıktı — harita 3 Zor'da geçilemez (13 ≥ 12), harita 5 ise 20 canın
  19'unu alıyordu. Çarpanlar tarandı, **HP düştü, altın sabit kaldı**:
  ekonomiye dokunmamak boss türetmesini (altına bağlı) yerinde
  bırakıyor ve S73'ün "altın ≥ HP" değişmezi zaten sağlanıyor.
  **Harita 2 düştü**, çünkü ölçüm onun konumuna göre fazla zor olduğunu
  gösterdi (20 canın 8'i, ikinci haritada). Harita 4-5'te altın çarpanı
  HP ile **birlikte** yükseldi: S73'ün değişmezi (altın ≥ HP) referans
  tahtanın karşılanabilirliğini koruyor.
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
| hepsi (hiç sızma yok) | ★★★ |
| başlangıcın **dörtte üçü** ve üstü | ★★ |
| altı | ★ |

Boss sızması tek başına 10 can götürüyor (§5), yani boss'u kaçırmak
doğrudan tek yıldıza düşürüyor — bilinçli.

**`M26` — eşikler orana çevrildi.** Tablo eskiden mutlak sayı yazıyordu
(20 / 15-19 / ≤14) çünkü `M1`'de tek bir başlangıç canı vardı. `M8-T11`
zorluk seviyelerini ekledi ve **Zor 12 canla başlıyor**; iki sistem hiç
karşılaştırılmamıştı. Sonuç: Zor'da **hiç can kaybetmeden** bitiren
oyuncu bile ★ alıyordu (12 < 15 olduğu için ★★ bile erişilemezdi) —
yani zoru seçmek ilerleme ölçüsünde **cezaydı** ve `allStars` başarımı
yalnız Zor oynayan için imkânsızdı.

Yeni sayı uydurulmadı; oran tablonun kendi eşiklerinden türedi:
`15 / 20 = 0,75`. Kural hep *"canının dörtte üçünü koru"*ydu, yalnız
20 cana gömülü yazılmıştı. Normal'in davranışı **birebir aynı**
(20 → ★★★, 15 → ★★); değişen yalnız Zor: 12 → ★★★, ≥9 → ★★.

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

> **Ölçüm kaydı** (`M50` etiketi): harita 1'in eğrisi, `M1`'de alındı.
> Argümanı taşıyor ("menzil büyüdükçe oran yükseliyor"), güncel referans
> değil.

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
  goldMultiplier: number;         // >= hpMultiplier (S73; eskiden '=' idi)
  costMultiplier?: number;        // kule fiyat çarpanı (S117) — yok = ×1
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

> **`M48` — bu tablonun altı satırından beşi yanlıştı** (859/979/1956/2492/
> 2778 yazıyordu). Sebebi yalnız sayıların eskimesi değil: **`M18` (S113)
> türetmeyi statik tavandan SİMÜLASYONA taşıdı.** Eski kural "boss HP =
> 0,80 × tavan" olduğu için son sütun her satırda %80,0 yazıyordu; yeni
> kural "sürekli koşuda **öldürülebilen** eşiğin 0,80'i" ve o eşik statik
> tavanla aynı şey değil. Bugün oranın kendisi bir **hedef değil sağlama**:
> `bossScaling.test` yalnız `0,3 < oran < 1` bandını arıyor (tavanı aşan
> boss öldürülemez, üçte birin altındaki dövüş değil).

<!-- ÜRETİLEN:boss -->
| Harita | Zırh | Boss HP | Tavanın oranı (ölçülen) |
|---|---|---|---|
| 1 · Değirmen Geçidi | 10 | 700 | %87,7 |
| 2 · Taş Köprü | 5 | 958 | %71,7 |
| 3 · Kül Ovası | 2 | 1573 | %64,7 |
| 4 · Kar Geçidi | 2 | 2807 | %65,6 |
| 5 · Kadim Harabe | 2 | 2345 | %43,3 |
| 6 · Sisli Bataklık | 2 | 2333 | %38,1 |
<!-- /ÜRETİLEN:boss -->

**`M11` Faz 5 (S95): dördü de yeniden türetildi** (712/886/1709/2189 →
859/979/1956/2492). Okçu ailesi güçlenince her haritanın tavanı
yükseldi; kural aynı kaldı, sayıyı yine **test** söyledi.

**`M11` Faz 2 (S91): 3-4-5 yeniden türetildi** (1023 / 1933 / 2675 →
886 / 1709 / 2189). Dal dengesi referans tahtayı zayıflattı, üç tavan
birden düştü ve yazılı HP'ler banttan çıktı (%92,4 / %90,5 / %93,1).
Sayıyı **test söyledi**: regresyon bandı kırıldı, aynı kuralla
(`0,80 × en zayıf kol tavanı`) yeniden hesaplandı.

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

**Hızlandırma açıkken:** hit-stop devre dışı, parçacık yoğunluğu hız
oranında iner (2×'te yarısı, 3×'te üçte biri). Yoksa hızlandırılmış oyun
okunmaz hale gelir.

Madde eskiden "2× hızda" diyordu ve kod da `=== 2` yazıyordu; 3× eklenince
ikisi de **sessizce tersine dönüyordu** — en okunmaz hızda hit-stop geri
geliyor ve ekran en kalabalık hâline ulaşıyordu. Kural sayıya değil
**niyete** bağlandı.

## 11. Bilgi paneli

"Bilgi eksikliği" türün 1 numaralı şikâyeti. Kule seçildiğinde gösterilenler:

| Gösterge | Neden |
|---|---|
| Ham hasar + atış hızı | Temel |
| **Hasar tipi rozeti** (fiziksel/büyü) | Zırh/direnç kararının tamamı buna bağlı |
| **Seçili düşman tipine karşı etkin DPS** | Ham DPS yanıltıcı: okçu T2'nin ham DPS'i 18,2, boss'a (zırh 10) **5,2** |
| Menzil dairesi + **kapsanan yol** | §4.5 |
| Uçana vurur/vurmaz ikonu | §4.2 |
| Yükseltme farkı (öncesi → sonrası) | Yükseltme kararı |
| Satış iadesi (%70) | |
| **Patlama yarıçapı** (`M11` Faz 2) | Top'un iki dalı arasındaki takasın yarısı bu sayı; görünmezse seçim de görünmez |
| **Etki satırı** (`M11` Faz 1) | Yanma/yavaşlatma/zincir; etkisiz dalda `—` |

**Dal özeti — satın almadan ÖNCE (`M11` Faz 2, S93).** T3 menüsü yalnız
*ad + fiyat* yazıyordu; oyuncu iki dalın farkını 240 altın harcadıktan
sonra görüyordu. Menüde artık her dalın bir satırlık özeti var
(`Havan · DPS 21,6 · menzil 230 · patlama 55`), `towers.ts`'ten
**üretiliyor**. Hover değil **sabit iki satır**: dokunmatikte imleç yok.

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

Bunlar bilinçli olarak dışarıda: kahraman birimi, meta yükseltme ağacı,
günlük sıralama, çoklu oyuncu, harita editörü. v1 bittikten sonra
tartışılır — hangisinin sırası geleceğine `ROADMAP.md`'deki teşhis
matrisi karar verecek.

**Kapsam dışı değil, sonradan eklendi** (liste M8'de değişti, doküman
`M9-T04`'te buna yetişti):

| Ne | Ne zaman | Nerede |
|---|---|---|
| Duraklatma ve hızlandırma | M0 — mimari karar | `GameClock`, §1 |
| **3× hız** | M9 — küratörlük cilası | `GameClock.setScale` dokümanı |
| **Sonsuz mod** | M8-T06 | `systems/endlessWaves.ts`, `EndlessRecords.ts` |
| **Başarımlar (12 adet)** | M8-T07 | `data/achievements.ts`, `AchievementToast` |
| **Tur ortası kayıt** | M10 — "Devam et" | `systems/RunSave.ts` |
| **Buz kalkanı** (harita 4) | M10 | `data/enemies.ts`, `combat.kalkandanGecir` |
| **Boss ikinci evresi** (harita 5) | M10 | `EnemyAbilitySystem` `enrage` |
| **Kule sinerjisi** | M10 | `combat.yavaslatmaSinerjisi` |

Üçü de listede "yok" yazarken kodda vardı; bu tabloyu okuyan biri artık
ikisi arasında kalmıyor. Hız satırının M0'da kurulmasının gerekçesi
değişmedi: `GameClock.setScale` üç Phaser zaman otoritesini birden
senkronluyor ve bu sözleşme sonradan eklenemiyor (TIER 1 kural 8).

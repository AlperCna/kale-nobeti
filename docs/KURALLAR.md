# Kale Nöbeti — Kural ve Sayı Referansı

> **Bu dosya ÜRETİLİYOR.** Elle düzenlemeyin — `node scripts/kurallar.mjs`
> her sayıyı `src/data/*` içinden canlı okur ve bu dosyayı yeniden yazar.
> Bir kuleyi değiştirip betiği koşturmak dokümanı da günceller; böylece
> doküman ile kod **ayrışamaz**. Projenin en pahalı hatası (2200 HP'lik,
> öldürülemez boss) tam olarak böyle bir ayrışmadan çıkmıştı.

**Bir sayıyı değiştirmek için:** aşağıdaki tabloda sayının yanında yazan
kaynak dosyayı aç, değiştir, `npm run test` koş. Denge testleri kırılırsa
sayı dengeyi bozuyor demektir — test yanlış değil.

## İçindekiler

1. [Pazarlıksız kurallar (TIER 1)](#1-pazarlıksız-kurallar-tier-1)
2. [Hasar modeli](#2-hasar-modeli)
3. [Kuleler](#3-kuleler)
4. [Kışla ve askerler](#4-kışla-ve-askerler)
5. [Dokuz engelleme kuralı](#5-dokuz-engelleme-kuralı)
6. [Düşmanlar](#6-düşmanlar)
7. [Boss ölçeklemesi](#7-boss-ölçeklemesi)
8. [Etkin DPS matrisi](#8-etkin-dps-matrisi)
9. [Yetenekler](#9-yetenekler)
10. [Ekonomi](#10-ekonomi)
11. [Dalgalar](#11-dalgalar)
12. [Haritalar](#12-haritalar)
13. [Denge sağlamaları](#13-denge-sağlamaları)
14. [Juice ve ayarlar](#14-juice-ve-ayarlar)
15. [Teknik bütçeler](#15-teknik-bütçeler)
16. [Uydurulmayan sayılar](#16-uydurulmayan-sayılar)
17. [Bekçiler](#17-bekçiler)

---

## 1. Pazarlıksız kurallar (TIER 1)

Kaynak: `CLAUDE.md`. Bunlar tartışmaya kapalı; ihlal eden kod merge edilmez.

| # | Kural | Neden |
|---|---|---|
| 1 | Denge verisi **asla koda gömülmez** | `src/data/*.ts` tek adres. Bir kulenin hasarını değiştirmek için sistem dosyasına dokunulmaz |
| 2 | İlk indirme **≤ 8 MB** | Poki limiti. 5 MB uyarı, 8 MB hata |
| 3 | **Nesne havuzu zorunlu** | Oyun içinde `new` ile mermi/düşman yaratılmaz. Havuza dönen nesne **tüm** durumunu sıfırlar |
| 4 | Yol bulma **dinamik değil** | Sabit waypoint dizisi. A* veya flow field yok |
| 5 | `any` **yasak** | TypeScript strict |
| 6 | **Erişilebilirlik tabanı** | Sarsıntı ve parçacık kapatılabilir; `prefers-reduced-motion` saygı görür; düşman/dost ayrımı yalnız renge dayanmaz |
| 7 | Değişen metin **`BitmapText`** | `Text` içeriği her değişimde canvas yeniden üretip GPU'ya yüklüyor |
| 8 | Ham `delta` **yasak** | Her şey `GameClock.scaledDelta` üzerinden. `setScale` üç Phaser özelliğini de yazar |
| 9 | Mesafe kontrolleri **karesel** | `Math.sqrt` çağrılmaz (konum hesabı hariç) |
| 10 | `localStorage` **`try/catch` içinde** | Gizli sekmede istisna fırlatıyor; sarılmazsa oyun açılışta çöker |
| 11 | `systems/`,`util/`,`data/`,`types/` Phaser'ı **yalnız `import type`** | Testler `node` ortamında koşuyor; saf mantık Phaser yüklerse `window` arar ve patlar |

---

## 2. Hasar modeli

Kaynak: `src/systems/combat.ts` · `GAME-DESIGN.md` §3

| Tip | Nasıl azalır | Kim kullanır |
|---|---|---|
| `physical` | Zırh kadar **sabit miktar** düşer | Okçu, Top, askerler |
| `magic` | Büyü direnci kadar **yüzde** azalır | Büyü kulesi |
| `true` | **Hiçbir şeyle azalmaz** | Yalnız Meteor |

**Hasar tabanı: `0,15`** — hiçbir vuruş tamamen emilmez, ham hasarın
en az bu oranı geçer. Gerekçe: "oyuncu tamamen yanlış kule kurduğunda oyun
kilitlenmez, sadece verimsizleşir. Ceza var ama duvar yok."

Tabana düşen vuruş ekranda **gri** ve yanında bir **kalkan** işaretiyle
çiziliyor (İşaret `M106`'da eklendi: `DamageText`'in kendi tablosu onu
vadediyordu ama kod yalnız rengi değiştiriyordu — TIER 1 kural 6 bilginin
yalnız renge dayanmamasını istiyor.) — oyuncu kulesinin işe
yaramadığını görmeli. Örnek: Okçu T2 (10 hasar) harita 1 boss'una
(zırh 10) saniyede 10 değil **5,2** veriyor.

---

## 3. Kuleler

Kaynak: `src/data/towers.ts` · `GAME-DESIGN.md` §4.1–§4.3

Üç aile × 4 kademe. T2'den sonra **iki dal** var ve seçim geri alınamıyor
(değiştirmek için satmak gerekiyor, %30 kayıp).


### Okçu — Tek hedef, hızlı, ucuz. Zırha karşı zayıf.

Hasar tipi: `physical`

| Kademe | Maliyet | Hasar | Atış/sn | Ham DPS | Menzil | Patlama | Uçan çarpanı | Etki |
|---|---|---|---|---|---|---|---|---|
| **T1** | 70 | 8 | 1,1 | 8,8 | 150 | — | ×1 | — |
| **T2** | 110 | 14 | 1,3 | 18,2 | 165 | — | ×1 | — |
| **T3a** Keskin Nişancı | 170 | 44 | 0,6 | 26,4 | 260 | — | ×1 | — |
| **T3b** Kundakçı | 170 | 9 | 1,4 | 12,6 | 195 | — | ×1 | `burn` dps=11 seconds=4 |


### Top — Alan hasarı, yavaş. Kalabalığın cevabı.

Hasar tipi: `physical`

| Kademe | Maliyet | Hasar | Atış/sn | Ham DPS | Menzil | Patlama | Uçan çarpanı | Etki |
|---|---|---|---|---|---|---|---|---|
| **T1** | 110 | 22 | 0,5 | 11 | 140 | 45 px | **0** (vuramaz) | — |
| **T2** | 160 | 34 | 0,55 | 18,7 | 150 | 55 px | **0** (vuramaz) | — |
| **T3a** Havan | 240 | 52 | 0,45 | 23,4 | 230 | 65 px | ×0,5 | — |
| **T3b** Barut Fıçısı | 240 | 26 | 0,9 | 23,4 | 150 | 85 px | ×0,5 | — |


### Büyü — Zırh delen. Büyü dirençli düşmanlara zayıf.

Hasar tipi: `magic`

| Kademe | Maliyet | Hasar | Atış/sn | Ham DPS | Menzil | Patlama | Uçan çarpanı | Etki |
|---|---|---|---|---|---|---|---|---|
| **T1** | 100 | 14 | 0,7 | 9,8 | 155 | — | ×1 | — |
| **T2** | 150 | 24 | 0,75 | 18 | 170 | — | ×1 | — |
| **T3a** Yıldırım | 230 | 39 | 0,7 | 27,3 | 170 | — | ×1 | `chain` targets=3 falloff=0,55 |
| **T3b** Buz | 230 | 8 | 0,8 | 6,4 | 180 | 30 px | ×1 | `slow` factor=0,3 seconds=2 |

**Hedefleme modları** (kule başına seçilir, varsayılan `first`):

| Mod | Seçtiği |
|---|---|
| `first` | Kaleye **en yakın** — sızmayı önler |
| `last` | Kaleye **en uzak** — Şaman gibi arkadaki destekçiler için |
| `strongest` | **Maksimum** HP'si en yüksek (mevcut HP değil — hedef titremesini önlüyor) |
| `weakest` | Mevcut HP'si en düşük — bitirici vuruş |
| `closest` | Kuleye öklit mesafesi en az |

---

## 4. Kışla ve askerler

Kaynak: `src/data/barracks.ts` · `GAME-DESIGN.md` §4.4

**Kışla hasar vermez, zaman kazandırır.** Düşmanı durdurup diğer kulelerin
menzilinde tutar. Uçanlar engellenemez.

| Kademe | Maliyet | Asker | Asker HP | Asker DPS | Diriliş | Kalkan | Kaçınma |
|---|---|---|---|---|---|---|---|
| **T1** | 90 | 2 | 45 | 5 | 8 sn | **yok** (S43) | — |
| **T2** | 140 | 2 | 75 | 8 | 7 sn | **yok** (S43) | — |
| **T3a** Paladin | 210 | 2 | 140 | 11 | 6 sn | **yok** (S43) | — |
| **T3b** Haydutlar | 210 | 3 | 70 | 9 | 5 sn | **yok** (S43) | %25 |

**Asker yürüme hızı: 45 px/sn** (S68 — dokümanda yok, §5'in
ortanca düşman hızından alındı).


### Düşmanın askere verdiği hasar — S66

**Dokümanda hiç yok.** Türetildi: `K = 45 HP / 8 sn / 1 puan = 5,625 DPS/puan`
— §4.4'ün T1 satırından (45 HP, 8 sn diriliş) ve §5'in puan ölçeğinden.

| Düşman | Puan | Askere DPS | T1 askeri (45 HP) dayanma |
|---|---|---|---|
| Goblin | 1 | 5,63 | 7,99 sn |
| Ork Savaşçı | 2 | 11,25 | 4,00 sn |
| Kurt Binicisi | 3 | 16,88 | 2,67 sn |
| Harpi | 3 | 16,88 | 2,67 sn |
| Zırhlı Ork | 4 | 22,5 | 2,00 sn |
| Şaman | 5 | 28,13 | 1,60 sn |
| Trol | 8 | 45 | 1,00 sn |
| Örümcek Ana | 6 | 33,75 | 1,33 sn |
| Tünelci | 3 | 16,88 | 2,67 sn |
| Ogre Şef (boss) | 25 | 140,63 | **anlık** (kural 9) |

Boss formüle **girmiyor** — §4.4 kural 9 onu tek vuruşla ayrı tutuyor.

---

## 5. Dokuz engelleme kuralı

Kaynak: `src/systems/BarracksSystem.ts` · `GAME-DESIGN.md` §4.4

Türün en çok kenar durum üreten mekaniği. Her kural için ayrı test var.

| Sabit | Değer | Anlamı |
|---|---|---|
| `aggroRadius` | 60 px | Asker bu yarıçaptaki en yakın engellenmemiş düşmanı hedefler |
| `contactRadius` | 20 px | Bu mesafede iki taraf kilitlenir, düşman **durur** |
| `rallyRange` | 160 px | Toplanma noktası kışlaya en fazla bu kadar uzağa konabilir |
| `pathSnapMax` | 40 px | Toplanma noktası yola bu kadar yakınsa yapışır; uzaksa konamaz |

| # | Kural | Not |
|---|---|---|
| 1 | `Soldier.engagedWith` ve `Enemy.blockedBy` alanları | Kilit **iki taraflı**; tek taraflı temizlik düşmanı sonsuza durdurur |
| 2 | Aggro içindeki en yakın **engellenmemiş** düşmanı hedefle, temas mesafesinde kilitlen | Düşmanın yol ilerlemesi durur |
| 3 | Bir düşmanı **birden çok asker** dövebilir; düşman **yalnız `blockedBy`** askerine hasar verir | Sayı üstünlüğü ikili kazanç: bedava DPS + tek hasar |
| 4 | Kilit kırılır: asker ölür / düşman ölür. Aggro içinde serbest asker varsa **yeniden kilitlenir** | Temastaki ikinci asker **devralıyor** — yoksa düşman iki asker dövüşürken yürümeye devam ederdi |
| 5 | Askerler düşmandan azsa fazlası **durmadan geçer** | **Özel kod yok** — kural 1 ve 3'ten doğal olarak çıkıyor |
| 6 | Toplanma noktası menzil içinde ve **yola yapışık** olmalı | Kenetleme **önce**, yapışma **sonra**; ters sıra menzili aşardı |
| 7 | Ölen asker diriliş sonrası kışlada doğar ve toplanma noktasına **yürür**; yürürken engellemez | Aksi hâlde diriliş döngüsü kilitlenirdi |
| 8 | `flying === true` ise asker onu **hedeflemez** | Uçanlar engellenemez |
| 9 | Ogre Şef askerleri **tek vuruşta** öldürür | Kışla boss'a karşı ~1 sn gecikme sağlar — bilinçli |

**Sinerji:** iki kışlanın toplanma noktası aynı yere konursa verilen hasar
başına alınan hasar **yarıya** iniyor. Bu da kural 3'ten çıkıyor, özel kod yok.

**Varsayılan toplanma noktası kışlanın üstü OLAMAZ** — üç haritanın da yapı
noktaları yoldan 40 px'ten uzak. `defaultRally()` yola en yakın noktayı veriyor.

---

## 6. Düşmanlar

Kaynak: `src/data/enemies.ts` · `GAME-DESIGN.md` §5

HP ve altın **harita çarpanıyla** ölçekleniyor; hız, zırh, direnç ölçeklenmiyor.

| Düşman | HP | Hız | Zırh | Büyü direnci | Altın | Puan | Sızma cezası | Uçar | Yetenek |
|---|---|---|---|---|---|---|---|---|---|
| Goblin | 45 | 60 | 0 | %0 | 3 | 1 | 1 can | — | — |
| Ork Savaşçı | 110 | 45 | 2 | %0 | 6 | 2 | 1 can | — | — |
| Kurt Binicisi | 60 | 110 | 1 | %0 | 9 | 3 | 1 can | — | — |
| Harpi | 70 | 75 | 0 | %0 | 9 | 3 | 1 can | **evet** | — |
| Zırhlı Ork | 160 | 38 | 8 | %0 | 12 | 4 | 1 can | — | — |
| Şaman | 130 | 42 | 0 | %40 | 15 | 5 | 1 can | — | `heal` hps=8 radius=90 |
| Trol | 400 | 30 | 4 | %15 | 24 | 8 | 2 can | — | `regen` hps=6 |
| Örümcek Ana | 150 | 50 | 0 | %20 | 18 | 6 | 2 can | — | `split` count=3 childId=orumcekYavrusu |
| Tünelci | 90 | 70 | 1 | %0 | 9 | 3 | 1 can | — | `burrow` fromFraction=0,15 toFraction=0,6 |
| Ogre Şef (boss) | 700 | 28 | 10 | %25 | 60 | 25 | 10 can | — | — |
| Örümcek Yavrusu | 30 | 90 | 0 | %0 | 0 | 0 | 1 can | — | — |

**Altın = 3 × puan** — §5'in evrensel oranı. Örümcek yavrusu istisna
(altın 0, puan 0): yavrudan altın gelseydi oran bozulurdu, puan gelseydi
dalga bütçesine iki kez sayılırdı.


### Karşı-oyun tablosu — tasarımın omurgası

| Tehdit | Doğru cevap |
|---|---|
| Kalabalık goblin | Top (alan hasarı) |
| Zırhlı Ork | Büyü (zırhı yok sayar) |
| Şaman | Keskin Nişancı — **`first` ile ODAKLAN**, `last` değil (S83) |
| Harpi sürüsü | Okçu + Büyü tam hasar; Top T3 dalları %50 (T1/T2 vuramaz) |
| Trol | Kışla ile tut + yoğun tek hedef |
| Kurt Binicisi | Buz (yavaşlatmanın tek kaynağı) / Barut Fıçısı geniş patlama |
| Ogre Şef | Büyü + Top, **`weakest`/`closest`** hedefleme (S94), Meteor |

---

## 7. Boss ölçeklemesi

Kaynak: `src/data/bossScaling.ts`

**Boss HP'si `700 × hpMultiplier` DEĞİL — haritadan türetiliyor.**

`700 × çarpan` harita 2'de 1120, harita 3'te 1820 ediyordu ve o haritalarda
karşılanabilir hiçbir tahta bunu indiremiyordu (Kısıt A %165 ve %282).

| Harita | Boss zırhı | Boss HP | Tavan | Oran (tek düşman tavanına) |
|---|---|---|---|---|
| 1 · Değirmen Geçidi | **10** | **700** | 798 | %87,7 |
| 2 · Taş Köprü | **5** | **958** | 1605 | %59,7 |
| 3 · Kül Ovası | **2** | **1573** | 2431 | %64,7 |
| 4 · Kar Geçidi | **2** | **2807** | 4281 | %65,6 |
| 5 · Kadim Harabe | **2** | **2345** | 5412 | %43,3 |
| 6 · Sisli Bataklık | **2** | **2333** | 6125 | %38,1 |

**Zırh haritayla düşüyor** ve bu ters değil, mekanik gereği: geç haritalarda
altın daha çok noktaya bölündüğü için tahtanın ortalama kademesi düşüyor ve
zırh 10 o tahtayı hasar tabanına mahkûm ediyor. Zorluk zırhtan değil HP'den
ve dalga kompozisyonundan geliyor.

**İlk türetme oranı: 0,8** — `M7`, tasarım bandı %75-85'in ortası.

**`M71` (S136): bu oran bugün ARTIK TUTMUYOR ve bilerek böyle.**

`ceilingAPerBranch` **tek** düşmanın karşısındaki tahtayı ölçüyor. Tahtalar

`M7`’den beri üç katlandı (tavanlar 800-925 → 2400-6100) ama bir *dalganın*

baskısı o kadar büyümedi. `0,80 × tavan` ile yeniden türetme denendi ve

Kadim Harabe’nin bossunu sızdırdı — yani türetmenin var olma sebebi olan

değişmezi kırdı. Çarpanlarla telafi edildiğinde bu kez orta oyun sıfırlandı.



Bugün boss HP’si **türetilmiş değil ölçülerek ayarlanmış** bir sayı ve üç

testle bağlı: `bossScaling.test`’in regresyon kilidi (yazılı HP’ler ölçülen

değerlerdir) · `kisitB`’nin “boss hiçbir haritada sızmıyor”u · `kisitB`’nin

“boss dalgası haritanın zirvesi”i (`M70`). Gerekçe `bossScaling.ts` başlığında.

---

## 8. Etkin DPS matrisi

Zırh, direnç ve uçan çarpanı **uygulanmış** DPS. Yanma dalları sürekli
hasarı da içeriyor. `—` = vuramıyor. Boss sütunu harita 1 zırhıyla.

| Kademe | Goblin | Ork | Kurt | Harpi | Zırhlı | Şaman | Trol | Örümcek | Tünelci | Ogre | Örümcek |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Okçu T1 | 8,8 | 6,6 | 7,7 | 8,8 | 1,32 | 8,8 | 4,4 | 8,8 | 7,7 | 1,32 | 8,8 |
| Okçu T2 | 18,2 | 15,6 | 16,9 | 18,2 | 7,8 | 18,2 | 13 | 18,2 | 16,9 | 5,2 | 18,2 |
| Okçu T3a Keskin Nişancı | 26,4 | 25,2 | 25,8 | 26,4 | 21,6 | 26,4 | 24 | 26,4 | 25,8 | 20,4 | 26,4 |
| Okçu T3b Kundakçı | 23,6 | 20,8 | 22,2 | 23,6 | 12,89 | 23,6 | 18 | 23,6 | 22,2 | 12,89 | 23,6 |
| Top T1 | 11 | 10 | 10,5 | **—** | 7 | 11 | 9 | 11 | 10,5 | 6 | 11 |
| Top T2 | 18,7 | 17,6 | 18,15 | **—** | 14,3 | 18,7 | 16,5 | 18,7 | 18,15 | 13,2 | 18,7 |
| Top T3a Havan | 23,4 | 22,5 | 22,95 | 11,7 | 19,8 | 23,4 | 21,6 | 23,4 | 22,95 | 18,9 | 23,4 |
| Top T3b Barut Fıçısı | 23,4 | 21,6 | 22,5 | 11,7 | 16,2 | 23,4 | 19,8 | 23,4 | 22,5 | 14,4 | 23,4 |
| Büyü T1 | 9,8 | 9,8 | 9,8 | 9,8 | 9,8 | 5,88 | 8,33 | 7,84 | 9,8 | 7,35 | 9,8 |
| Büyü T2 | 18 | 18 | 18 | 18 | 18 | 10,8 | 15,3 | 14,4 | 18 | 13,5 | 18 |
| Büyü T3a Yıldırım | 27,3 | 27,3 | 27,3 | 27,3 | 27,3 | 16,38 | 23,2 | 21,84 | 27,3 | 20,47 | 27,3 |
| Büyü T3b Buz | 6,4 | 6,4 | 6,4 | 6,4 | 6,4 | 3,84 | 5,44 | 5,12 | 6,4 | 4,8 | 6,4 |

---

## 9. Yetenekler

Kaynak: `src/data/abilities.ts` · `GAME-DESIGN.md` §8


### Meteor

| Alan | Değer |
|---|---|
| `cooldownSeconds` | 45 |
| `radius` | 90 |
| `damageType` | true |
| `hitsFlying` | true |


### Takviye

| Alan | Değer |
|---|---|
| `cooldownSeconds` | 20 |
| `soldierHp` | 60 |
| `soldierDps` | 7 |
| `lifetimeSeconds` | 20 |

Beklemeler `scaledDelta` ile azalıyor — **hızlandırma açıkken o oranda**
kısa sürede doluyor (2×'te yarısı, 3×'te üçte biri).
HUD'da dairesel dolumla gösteriliyor; hazır olunca altın kenar bir kez parlıyor.
Haritalar arası **sıfırlanıyor** (S49).


### Yükseltme — S117'nin gider kalemi (`M99`)

Her yetenek tur içinde **2 kez** yükseltilebiliyor;
seviye harita bitince sıfırlanıyor (beklemeyle aynı kural).

| Seviye | Meteor hasarı | Takviye askeri |
|---|---|---|
| 1 | 180 | 2 |
| 2 | 250 | 3 |
| 3 | 330 | 4 |

Fiyat haritanın **altın çarpanını** izliyor — gider kalemi gelirle aynı
ölçekte büyümeli (S72'nin `startGold` gerekçesi):

| Harita | L2 | L3 | Dört yükseltme |
|---|---|---|---|
| 1 · Değirmen Geçidi | 180 | 320 | 1000 |
| 2 · Taş Köprü | 396 | 704 | 2200 |
| 3 · Kül Ovası | 684 | 1216 | 3800 |
| 4 · Kar Geçidi | 1404 | 2496 | 7800 |
| 5 · Kadim Harabe | 1836 | 3264 | 10200 |
| 6 · Sisli Bataklık | 1980 | 3520 | 11000 |

---

## 10. Ekonomi

Kaynak: `src/data/balance.ts` · `GAME-DESIGN.md` §6

| Sabit | Değer | Not |
|---|---|---|
| Başlangıç canı | 20 | Boss sızması tek başına 10 can götürüyor |
| Satış iadesi | %70 | Harcanan **toplamın** oranı |
| Hazırlık süresi | 20 sn | Her dalgada sabit |
| Dalga bitiş bonusu | 30 + 5n → d1:35, d5:55, d10:80 | **Harita altın çarpanıyla çarpılıyor** (S70) |
| Erken başlatma bonusu | `kalanSaniye × ceil(dalgaNo/2)` | Dalga 4'ten itibaren açık |
| Güvenlik payı | ×1,15 | Kısıt A eşiği: `tavan > eHP × 1,15` |

**Altın çarpanı ≥ HP çarpanı** (S73). §9 "eşit" diyordu ve gerekçesi
"altın/HP oranı düşmesin"di; ölçüm eşitliğin harita 3'te bu gerekçeyi
**karşılamadığını** gösterdi — 12 nokta ×2,6 altınla tam yükseltilemiyor,
tahta 3820'de takılıyor ve oyuncu 34 can kaybediyordu (20 canla kayıp).

| Harita | HP çarpanı | Altın çarpanı | Fiyat çarpanı | Tahta maliyeti | maliyet/gelir | + yükseltme | Can kaybı |
|---|---|---|---|---|---|---|---|
| 1 · Değirmen Geçidi | ×1 | ×1 | ×1 | 1350 | 0,84 | 1,47 | 0 / 20 ✓ |
| 2 · Taş Köprü | ×1,6 | ×2,2 **←ayrıştı** | ×1 | 3180 | 0,85 | 1,44 | 2 / 20 ✓ |
| 3 · Kül Ovası | ×2,8 | ×3,8 **←ayrıştı** | ×1 | 5100 | 0,78 | 1,37 | 9 / 20 ✓ |
| 4 · Kar Geçidi | ×7,35 | ×7,8 **←ayrıştı** | ×1,4 | 7140 | 0,55 | 1,16 | 12 / 20 ✓ |
| 5 · Kadim Harabe | ×10,05 | ×10,2 **←ayrıştı** | ×1 | 6440 | 0,38 | 0,99 | 14 / 20 ✓ |
| 6 · Sisli Bataklık | ×8,5 | ×11 **←ayrıştı** | ×1 | 6440 | 0,35 | 0,95 | 17 / 20 ✓ |

**`+ yükseltme` sütunu `M100`'de eklendi** — `maliyet/gelir` yalnız
**tahtayı** sayan bir orandı ve `M99` altına ikinci bir gider kalemi
açtı. S117'nin “gelirin yarısından fazlası harcanmadan kalıyor” iddiası
bu sütunla birlikte başka bir şey söylüyor: geç haritalarda harcanabilir
gider artık gelirin **tamamına yakını**. Oran kolunun (fiyat çarpanı)
kalan işi bu kadarıyla küçüldü — ama kapanmadı: yükseltme **seçime bağlı**,
tahta ise zorunlu.

Türetilebilir kural: **altın, haritanın noktalarını tam yükseltmeye
yetmeli.** 3,8'de maliyet doyuyor (üstü fazladan kule almıyor), yani sayı
seçilmedi — tam yükseltme noktası olarak **ölçüldü**.

**Başlangıç altını da çarpanı izliyor** — S72, kapandı. §9 tablosu
280/340/400 diyordu ama 340 ve 400 çarpanı izlemiyordu (×1,21 ve ×1,43,
oysa HP ×1,6 ve ×2,6). Ölçülen sonuç: dalga 1 tahtası üç haritada da 3-4
kule, ama goblin efektif HP'si 45/72/126/331/452/383. §9'un kendi gerekçesi
("altın/HP oranı düşmesin") başlangıç altınına da uygulandı:

| Harita | §9 tablosu | Kullanılan | Dalga 1 sızıntısı (önce → sonra) |
|---|---|---|---|
| 1 · Değirmen Geçidi | 280 | **280** | 0 → 0 |
| 2 · Taş Köprü | 340 | **616** = 280 × 1,6 | **4 → 0** |
| 3 · Kül Ovası | 400 | **1064** = 280 × 2,6 | **7 → 0** |

Toplam sızıntı: harita 2'de 13 → 2, harita 3'te 43 → 6.

---

## 11. Dalgalar

Kaynak: `src/data/waves.ts` · `GAME-DESIGN.md` §7

**Dalgalar elle yazılmaz, bütçe ile üretilir ve sonra rötuşlanır.** Bütçe
yaklaşımı oyunun asla yenilemez bir dalga üretmemesini garanti ediyor.

```
budget(n) = round(10 × 1,2^(n−1) × (nefes ? 0,85 : 1))
```

Nefes dalgaları: **4, 7** — yeni düşman tipi tanıtılmıyor.

Doğum penceresi `SPAWN_K = 24` (saniye × düşman). **Uydurulmadı,
ölçüldü**: sekiz farklı değerle 10 dalga koşturulup sızıntı sayıldı.


### 1 · Değirmen Geçidi

| Dalga | Bütçe | Puan | Adet | Aralık | Kompozisyon |
|---|---|---|---|---|---|
| **1** | 10 | 10 | 10 | 2,4 sn | 10× Goblin |
| **2** | 12 | 12 | 12 | 2 sn | 12× Goblin |
| **3** | 14 | 14 | 11 | 2,18 sn | 8× Goblin, 3× Ork Savaşçı |
| **4** _(nefes)_ | 15 | 15 | 12 | 2 sn | 9× Goblin, 3× Ork Savaşçı |
| **5** | 21 | 23 | 13 | 1,85 sn | 6× Goblin, 4× Ork Savaşçı, 3× Kurt Binicisi |
| **6** | 25 | 25 | 13 | 1,85 sn | 5× Goblin, 4× Ork Savaşçı, 2× Kurt Binicisi, 2× Harpi |
| **7** _(nefes)_ | 25 | 24 | 15 | 1,6 sn | 8× Goblin, 5× Ork Savaşçı, 2× Kurt Binicisi |
| **8** | 36 | 35 | 18 | 1,33 sn | 6× Goblin, 7× Ork Savaşçı, 3× Kurt Binicisi, 2× Harpi |
| **9** | 43 | 45 | 23 | 1,04 sn | 8× Goblin, 8× Ork Savaşçı, 4× Kurt Binicisi, 3× Harpi |
| **10** | 52 | 51 | 11 | 2,18 sn | 1× Ogre Şef (boss), 4× Ork Savaşçı, 4× Kurt Binicisi, 2× Harpi |


### 2 · Taş Köprü

| Dalga | Bütçe | Puan | Adet | Aralık | Kompozisyon |
|---|---|---|---|---|---|
| **1** | 10 | 10 | 10 | 2,4 sn | 10× Goblin⁽0⁾ |
| **2** | 12 | 11 | 9 | 2,67 sn | 7× Goblin⁽0⁾, 2× Ork Savaşçı⁽1⁾ |
| **3** | 14 | 14 | 8 | 3 sn | 6× Goblin⁽0⁾, 2× Zırhlı Ork⁽1⁾ |
| **4** _(nefes)_ | 15 | 15 | 11 | 2,18 sn | 7× Goblin⁽0⁾, 4× Ork Savaşçı⁽1⁾ |
| **5** | 21 | 21 | 9 | 2,67 sn | 4× Goblin⁽0⁾, 3× Kurt Binicisi⁽1⁾, 2× Zırhlı Ork⁽0⁾ |
| **6** | 25 | 56 | 20 | 1,2 sn | 6× Goblin⁽0⁾, 3× Ork Savaşçı⁽1⁾, 2× Şaman⁽0⁾, 2× Harpi⁽1⁾, 4× Zırhlı Ork⁽0⁾, 3× Zırhlı Ork⁽1⁾ |
| **7** _(nefes)_ | 25 | 24 | 13 | 1,85 sn | 6× Goblin⁽0⁾, 5× Ork Savaşçı⁽1⁾, 2× Zırhlı Ork⁽0⁾ |
| **8** | 36 | 32 | 11 | 2,18 sn | 5× Ork Savaşçı⁽0⁾, 3× Kurt Binicisi⁽1⁾, 2× Zırhlı Ork⁽0⁾, 1× Şaman⁽1⁾ |
| **9** | 43 | 47 | 16 | 1,5 sn | 6× Ork Savaşçı⁽0⁾, 4× Kurt Binicisi⁽1⁾, 3× Zırhlı Ork⁽0⁾, 1× Şaman⁽1⁾, 2× Harpi⁽0⁾ |
| **10** | 52 | 56 | 9 | 2,67 sn | 1× Ogre Şef (boss)⁽0⁾, 3× Zırhlı Ork⁽1⁾, 2× Şaman⁽0⁾, 3× Kurt Binicisi⁽1⁾ |

⁽ⁿ⁾ = giriş/kol numarası. **Sabit ve veride yazılı** (S58) — rastgele değil.


### 3 · Kül Ovası

| Dalga | Bütçe | Puan | Adet | Aralık | Kompozisyon |
|---|---|---|---|---|---|
| **1** | 10 | 10 | 10 | 2,4 sn | 6× Goblin⁽0⁾, 4× Goblin⁽1⁾ |
| **2** | 12 | 12 | 9 | 2,67 sn | 6× Goblin⁽0⁾, 3× Ork Savaşçı⁽1⁾ |
| **3** | 14 | 12 | 6 | 4 sn | 3× Ork Savaşçı⁽0⁾, 1× Zırhlı Ork⁽1⁾, 2× Goblin⁽1⁾ |
| **4** _(nefes)_ | 15 | 13 | 9 | 2,67 sn | 5× Goblin⁽0⁾, 4× Ork Savaşçı⁽1⁾ |
| **5** | 21 | 21 | 6 | 4 sn | 3× Ork Savaşçı⁽0⁾, 2× Örümcek Ana⁽1⁾, 1× Kurt Binicisi⁽0⁾ |
| **6** | 25 | 48 | 15 | 1,6 sn | 2× Zırhlı Ork⁽0⁾, 3× Trol⁽1⁾, 4× Ork Savaşçı⁽0⁾, 1× Harpi⁽1⁾, 5× Goblin⁽0⁾ |
| **7** _(nefes)_ | 25 | 22 | 11 | 2,18 sn | 4× Goblin⁽0⁾, 5× Ork Savaşçı⁽1⁾, 2× Zırhlı Ork⁽0⁾ |
| **8** | 36 | 33 | 6 | 4 sn | 2× Örümcek Ana⁽0⁾, 2× Zırhlı Ork⁽1⁾, 1× Şaman⁽0⁾, 1× Trol⁽1⁾ |
| **9** | 43 | 41 | 8 | 3 sn | 2× Trol⁽0⁾, 1× Örümcek Ana⁽1⁾, 2× Zırhlı Ork⁽0⁾, 1× Şaman⁽1⁾, 2× Harpi⁽0⁾ |
| **10** | 52 | 79 | 10 | 2,4 sn | 1× Ogre Şef (boss)⁽0⁾, 4× Trol⁽1⁾, 2× Örümcek Ana⁽1⁾, 2× Zırhlı Ork⁽0⁾, 1× Ork Savaşçı⁽0⁾ |

⁽ⁿ⁾ = giriş/kol numarası. **Sabit ve veride yazılı** (S58) — rastgele değil.


### 4 · Kar Geçidi

| Dalga | Bütçe | Puan | Adet | Aralık | Kompozisyon |
|---|---|---|---|---|---|
| **1** | 10 | 10 | 10 | 2,4 sn | 10× Goblin |
| **2** | 12 | 12 | 9 | 2,67 sn | 6× Goblin, 3× Ork Savaşçı |
| **3** | 14 | 14 | 5 | 4,8 sn | 3× Ork Savaşçı, 2× Zırhlı Ork |
| **4** _(nefes)_ | 15 | 15 | 10 | 2,4 sn | 5× Goblin, 5× Ork Savaşçı |
| **5** | 21 | 21 | 5 | 4,8 sn | 3× Kurt Binicisi, 2× Örümcek Ana |
| **6** | 25 | 48 | 12 | 2 sn | 3× Zırhlı Ork, 2× Harpi, 1× Şaman, 1× Ork Savaşçı, 2× Örümcek Ana, 2× Harpi, 1× Şaman |
| **7** _(nefes)_ | 25 | 24 | 12 | 2 sn | 4× Goblin, 6× Ork Savaşçı, 2× Zırhlı Ork |
| **8** | 36 | 37 | 8 | 3 sn | 2× Trol, 3× Zırhlı Ork, 2× Kurt Binicisi, 1× Harpi |
| **9** | 43 | 46 | 13 | 1,85 sn | 3× Trol, 1× Şaman, 2× Zırhlı Ork, 1× Harpi, 6× Goblin |
| **10** | 52 | 46 | 5 | 4,8 sn | 1× Ogre Şef (boss), 1× Trol, 2× Zırhlı Ork, 1× Şaman |


### 5 · Kadim Harabe

| Dalga | Bütçe | Puan | Adet | Aralık | Kompozisyon |
|---|---|---|---|---|---|
| **1** | 10 | 10 | 10 | 2,4 sn | 5× Goblin⁽0⁾, 5× Goblin⁽1⁾ |
| **2** | 12 | 12 | 8 | 3 sn | 4× Goblin⁽0⁾, 4× Ork Savaşçı⁽1⁾ |
| **3** | 14 | 14 | 5 | 4,8 sn | 3× Ork Savaşçı⁽0⁾, 2× Zırhlı Ork⁽1⁾ |
| **4** _(nefes)_ | 15 | 15 | 10 | 2,4 sn | 5× Goblin⁽0⁾, 5× Ork Savaşçı⁽1⁾ |
| **5** | 21 | 21 | 5 | 4,8 sn | 3× Kurt Binicisi⁽0⁾, 2× Örümcek Ana⁽1⁾ |
| **6** | 25 | 47 | 11 | 2,18 sn | 3× Zırhlı Ork⁽0⁾, 1× Harpi⁽1⁾, 2× Şaman⁽1⁾, 2× Şaman⁽1⁾, 1× Örümcek Ana⁽0⁾, 2× Harpi⁽1⁾ |
| **7** _(nefes)_ | 25 | 25 | 14 | 1,71 sn | 6× Goblin⁽0⁾, 6× Ork Savaşçı⁽1⁾, 1× Zırhlı Ork⁽0⁾, 1× Harpi⁽1⁾ |
| **8** | 36 | 36 | 6 | 4 sn | 2× Trol⁽0⁾, 2× Örümcek Ana⁽1⁾, 2× Zırhlı Ork⁽1⁾ |
| **9** | 43 | 43 | 10 | 2,4 sn | 1× Trol⁽0⁾, 4× Zırhlı Ork⁽1⁾, 2× Şaman⁽0⁾, 2× Harpi⁽1⁾, 1× Kurt Binicisi⁽0⁾ |
| **10** | 52 | 45 | 4 | 6 sn | 1× Ogre Şef (boss)⁽0⁾, 2× Trol⁽1⁾, 1× Zırhlı Ork⁽1⁾ |

⁽ⁿ⁾ = giriş/kol numarası. **Sabit ve veride yazılı** (S58) — rastgele değil.


### 6 · Sisli Bataklık

| Dalga | Bütçe | Puan | Adet | Aralık | Kompozisyon |
|---|---|---|---|---|---|
| **1** | 10 | 10 | 10 | 2,4 sn | 10× Goblin |
| **2** | 12 | 12 | 8 | 3 sn | 6× Goblin, 2× Tünelci |
| **3** | 14 | 14 | 8 | 3 sn | 5× Goblin, 3× Tünelci |
| **4** _(nefes)_ | 15 | 15 | 9 | 2,67 sn | 3× Tünelci, 6× Goblin |
| **5** | 21 | 21 | 6 | 4 sn | 3× Tünelci, 3× Zırhlı Ork |
| **6** | 25 | 48 | 18 | 1,33 sn | 3× Kurt Binicisi, 2× Tünelci, 2× Harpi, 2× Ork Savaşçı, 2× Trol, 7× Goblin |
| **7** _(nefes)_ | 25 | 25 | 14 | 1,71 sn | 6× Goblin, 3× Tünelci, 5× Ork Savaşçı |
| **8** | 36 | 36 | 8 | 3 sn | 2× Trol, 4× Tünelci, 2× Zırhlı Ork |
| **9** | 43 | 44 | 9 | 2,67 sn | 3× Trol, 1× Şaman, 3× Tünelci, 2× Harpi |
| **10** | 52 | 53 | 8 | 3 sn | 1× Ogre Şef (boss), 4× Tünelci, 1× Trol, 2× Zırhlı Ork |

---

## 11b. Zorluk seviyeleri

Kaynak: `src/data/difficulty.ts` (S80). Varsayılan **normal**.

**Zor HP’ye dokunmuyor, canı kısıyor.** Ölçüm: HP çarpanı ×1,10’da
harita 1’in bossu referans tahtanın Kısıt A tavanını aşıyordu (%101),
yani öğretici harita **geçilemez** hâle geliyordu. Can sayısı Kısıt A’ya,
referans tahtaya, tavana ve boss türetmesine hiç girmiyor — hiçbir düşmanı
öldürülemez yapmadan hata payını daraltıyor.

| Seviye | HP çarpanı | Başlangıç canı | Yıldız | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|---|
| kolay | ×0,8 | 20 | **kaydedilmiyor** | 0 / 20 ✓ | 0 / 20 ✓ | 2 / 20 ✓ | 4 / 20 ✓ | 5 / 20 ✓ | 8 / 20 ✓ |
| normal | ×1 | 20 | kaydediliyor | 0 / 20 ✓ | 2 / 20 ✓ | 9 / 20 ✓ | 12 / 20 ✓ | 14 / 20 ✓ | 17 / 20 ✓ |
| zor | ×1 | 12 | kaydediliyor | 0 / 12 ✓ | 2 / 12 ✓ | 9 / 12 ✓ | 12 / 12 ✗ | 14 / 12 ✗ | 17 / 12 ✗ |

Hücreler: referans tahtanın kaybettiği can / o seviyenin canı.

---

## 12. Haritalar

Kaynak: `src/data/maps.ts` · `GAME-DESIGN.md` §9

| Harita | Yol | Nokta | HP/Altın çarpanı | Başlangıç altını | Uçan hattı | Kadro |
|---|---|---|---|---|---|---|
| 1 · Değirmen Geçidi | 1 kol | 8 | ×1 | 280 | 1 hat, 7/8 nokta kesiyor | 5 tip |
| 2 · Taş Köprü | 2 kol | 10 | ×1,6 | 616 | 1 hat, 5/10 nokta kesiyor | 7 tip |
| 3 · Kül Ovası | 2 kol | 12 | ×2,8 | 1064 | 2 hat, 6/12 nokta kesiyor | 10 tip |
| 4 · Kar Geçidi | 1 kol | 12 | ×7,35 | 2184 | 1 hat, 11/12 nokta kesiyor | 10 tip |
| 5 · Kadim Harabe | 2 kol | 15 | ×10,05 | 2856 | 2 hat, 13/15 nokta kesiyor | 10 tip |
| 6 · Sisli Bataklık | 1 kol | 15 | ×8,5 | 3080 | 1 hat, 11/15 nokta kesiyor | 9 tip |


### Kapsanan yol — asıl denge kolu

Haritaların yapı noktası **sayısı** değil, her noktanın **kapsadığı yol
uzunluğu** dengeyi belirliyor. Ölçüm menzili: **150 px** (T1).

**Kabul bandı: 285-311 px** — geometri bandı (2 × menzil ± %5) ile boss
bandının (tavanın %75-85'i) kesişimi.

**Ayrık yolda ölçüm KOL BAŞINA yapılıyor.** Toplam ölçüm yanıltıcı: iki kol
ortak gövdeyi paylaşınca aynı fiziksel yol iki kez sayılıyor.

| Harita | Kol 0 | Kol 1 |
|---|---|---|
| 1 · Değirmen Geçidi | **296,3 px** (8/8 nokta) ✓ | — |
| 2 · Taş Köprü | **299,8 px** (7/10 nokta) ✓ | **299,8 px** (7/10 nokta) ✓ |
| 3 · Kül Ovası | **291,3 px** (7/12 nokta) ✓ | **291,3 px** (7/12 nokta) ✓ |
| 4 · Kar Geçidi | **290,1 px** (12/12 nokta) ✓ | — |
| 5 · Kadim Harabe | **298 px** (14/15 nokta) ✓ | **298 px** (14/15 nokta) ✓ |
| 6 · Sisli Bataklık | **288,9 px** (15/15 nokta) ✓ | — |

`coverage` alanı **elle yazılmaz** — `util/coverage.ts` üretiyor ve bekçi
elle yazılmasını engelliyor. Ekranda görünen altın çizgi ile denge
testlerinin sayısı **aynı fonksiyondan** geliyor.


### Yıldız derecelendirmesi

| Kalan can | Yıldız |
|---|---|
| 20 (hiç sızma yok) | ★★★ |
| 15-19 | ★★ |
| 14 ve altı | ★ |

---

## 13. Denge sağlamaları

İki bağımsız sağlama. Kaynak: `src/systems/balanceChecks.ts`, `waveSim.ts`


### Kısıt A — statik tavan

```
tavan = Σ_kule ( etkinDPS_kule × kapsananYol_kule ) / hız_düşman
```

**Yerleşimden bağımsız** — kuleler kümelense de dağılsa da toplam aynı;
yerleşim *ne zaman* hasar verildiğini değiştirir, *ne kadar* verildiğini değil.

Eşik: `tavan > efektifHP × 1,15`, yani oran **≤ %87**.
Ayrık yolda **en zayıf kol** belirleyici — düşman hangi kolu seçeceğini sormuyor.


**1 · Değirmen Geçidi** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Oran |
|---|---|---|---|
| Goblin | 45 | 606 | %7,4 |
| Ork Savaşçı | 110 | 757 | %14,5 |
| Kurt Binicisi | 60 | 320 | %18,7 |
| Harpi | 70 | 280 | %25 |
| Ogre Şef (boss) | 700 | 798 | %87,7 ✗ |


**2 · Taş Köprü** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Kollar | Oran |
|---|---|---|---|---|
| Goblin | 72 | 940 | 950 / 940 | %7,7 |
| Ork Savaşçı | 176 | 1156 | 1202 / 1156 | %15,2 |
| Kurt Binicisi | 96 | 493 | 505 / 493 | %19,5 |
| Harpi | 112 | 544 | 544 / 551 | %20,6 |
| Zırhlı Ork | 256 | 1026 | 1195 / 1026 | %24,9 |
| Şaman | 208 | 1252 | 1252 / 1321 | %16,6 |
| Ogre Şef (boss) | 958 | 1605 | 1678 / 1605 | %59,7 |


**3 · Kül Ovası** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Kollar | Oran |
|---|---|---|---|---|
| Goblin | 126 | 1244 | 1244 / 1317 | %10,1 |
| Ork Savaşçı | 308 | 1597 | 1597 / 1702 | %19,3 |
| Kurt Binicisi | 168 | 666 | 666 / 707 | %25,2 |
| Harpi | 196 | 820 | 848 / 820 | %23,9 |
| Zırhlı Ork | 448 | 1673 | 1673 / 1822 | %26,8 |
| Şaman | 364 | 1632 | 1632 / 1649 | %22,3 |
| Trol | 1120 | 2227 | 2227 / 2349 | %50,3 |
| Örümcek Ana | 420 | 1432 | 1432 / 1483 | %29,3 |
| Örümcek Yavrusu | 84 | 829 | 829 / 878 | %10,1 |
| Ogre Şef (boss) | 1573 | 2431 | 2431 / 2517 | %64,7 |


**4 · Kar Geçidi** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Oran |
|---|---|---|---|
| Goblin | 331 | 2209 | %15 |
| Ork Savaşçı | 809 | 2842 | %28,5 |
| Kurt Binicisi | 441 | 1184 | %37,3 |
| Harpi | 515 | 1439 | %35,7 |
| Zırhlı Ork | 1176 | 2999 | %39,2 |
| Şaman | 956 | 2850 | %33,5 |
| Trol | 2940 | 3947 | %74,5 |
| Örümcek Ana | 1103 | 2522 | %43,7 |
| Örümcek Yavrusu | 221 | 1472 | %15 |
| Ogre Şef (boss) | 2807 | 4281 | %65,6 |


**5 · Kadim Harabe** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Kollar | Oran |
|---|---|---|---|---|
| Goblin | 452 | 2777 | 2777 / 2903 | %16,3 |
| Ork Savaşçı | 1106 | 3573 | 3573 / 3746 | %30,9 |
| Kurt Binicisi | 603 | 1488 | 1488 / 1558 | %40,5 |
| Harpi | 704 | 1786 | 1786 / 1925 | %39,4 |
| Zırhlı Ork | 1608 | 3770 | 3770 / 3992 | %42,7 |
| Şaman | 1307 | 3615 | 3615 / 3667 | %36,1 |
| Trol | 4020 | 4980 | 4980 / 5180 | %80,7 |
| Örümcek Ana | 1508 | 3185 | 3185 / 3282 | %47,3 |
| Örümcek Yavrusu | 302 | 1852 | 1852 / 1935 | %16,3 |
| Ogre Şef (boss) | 2345 | 5412 | 5412 / 5570 | %43,3 |


**6 · Sisli Bataklık** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Oran |
|---|---|---|---|
| Goblin | 383 | 3153 | %12,1 |
| Ork Savaşçı | 935 | 4032 | %23,2 |
| Kurt Binicisi | 510 | 1685 | %30,3 |
| Harpi | 595 | 2067 | %28,8 |
| Zırhlı Ork | 1360 | 4170 | %32,6 |
| Şaman | 1105 | 4127 | %26,8 |
| Trol | 3400 | 5591 | %60,8 |
| Tünelci | 765 | 2647 | %28,9 |
| Ogre Şef (boss) | 2333 | 6125 | %38,1 |

**ⓑ = Kışla ile doğrulanan.** Kısıt A yalnız **kulelerin** verebileceği
hasarı topluyor (tanımı bu) — askerlerin DPS'i ve engellemenin kazandırdığı
süre girmiyor. §5 Trol'ün cevabını açıkça kışla olarak verdiği için, o
eşiği geçerse Kısıt A onu olduğundan **zor** gösterir; doğrulaması Kısıt B'de.
**Bugün hiçbir satır ⓑ almıyor** — kışla ile doğrulanan düşmanların hepsi eşiği kendi başına geçiyor.


### Kısıt B — başsız simülasyon

Dalgayı gerçekten çalıştırıp **sızan HP'yi ölçüyor.** Formül değil,
çünkü girdileri (dalga süresi, aktiflik oranı) statik veriden hesaplanamaz.
Odaklanma kaybı doğal olarak ortaya çıkıyor — çarpan gerekmiyor.

**Odaklanma kaybı artık SAYILIYOR** (`M83`, S24). §6'nın formülündeki
`× 0,75` bir varsayımdı ve hiçbir kod onu okumuyordu; silindi. Boşa giden
hasarın iki kalemi var: uçuşta hedefi ölen **tek hedefli** mermiler (alan
hasarlı mermi yine patlıyor, boşa gitmiyor — S21) ve hedefin kalan canını
aşan hasar. Kalkanın yuttuğu kayıp sayılmıyor: o gerçek bir mekanik.

| Harita | Atılan hasar | Uçuşta boşa | Aşırı öldürme | Verim |
|---|---|---|---|---|
| 1 · Değirmen Geçidi | 11714 | 178 | 1330 | **%87,1** |
| 2 · Taş Köprü | 22696 | 186 | 1114 | **%94,3** |
| 3 · Kül Ovası | 37328 | 405 | 1098 | **%96** |
| 4 · Kar Geçidi | 67611 | 750 | 1605 | **%96,5** |
| 5 · Kadim Harabe | 87256 | 982 | 1581 | **%97,1** |
| 6 · Sisli Bataklık | 70314 | 1039 | 1446 | **%96,5** |

Öğretici haritada kayıp en yüksek — çünkü orada atış başına hasar
düşmanın canının büyük bir kısmı ve aşırı öldürme baskın. Geç haritalarda
düşman HP'si 8-10 kat büyük olduğu için aynı atış fire üretmiyor.

Simülasyon **canlı oyunla aynı kodu** kullanıyor: aynı 
`BarracksSystem`, aynı `applyDamage`, aynı `TowerSystem`.

| Harita | Sızan düşman | Sızan HP | Dalga dağılımı |
|---|---|---|---|
| 1 · Değirmen Geçidi | **0** | 0 | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:0 d8:0 d9:0 d10:0 |
| 2 · Taş Köprü | **2** | 54 | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:2 d8:0 d9:0 d10:0 |
| 3 · Kül Ovası | **6** | 1540 | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:0 d8:1 d9:0 d10:5 |
| 4 · Kar Geçidi | **9** | 4907 | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:0 d8:4 d9:0 d10:5 |
| 5 · Kadim Harabe | **11** | 10141 | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:0 d8:1 d9:1 d10:9 |
| 6 · Sisli Bataklık | **15** | 7478 | d1:0 d2:0 d3:0 d4:0 d5:2 d6:0 d7:1 d8:0 d9:0 d10:12 |


**Baskı hangi dalgadan geliyor?** Üstteki dağılım sızıntıyı **sızdığı ana**
yazıyor. `M16`'dan beri dalgalar üst üste bindiği için 9. dalganın Trol'ü
10. dalga koşarken kaleye varıyor ve finalin hanesine yazılıyor — S116'nın
"bütün baskı 10. dalgada" iddiası kısmen bu muhasebeden doğuyordu. Aşağıdaki
tablo aynı canı düşmanın **doğduğu** dalgaya yazıyor (`M84`):

| Harita | Doğum dalgasına göre can kaybı | Final payı |
|---|---|---|
| 1 · Değirmen Geçidi | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:0 d8:0 d9:0 d10:0 | — |
| 2 · Taş Köprü | d1:0 d2:0 d3:0 d4:0 d5:0 d6:2 d7:0 d8:0 d9:0 d10:0 | **%0** |
| 3 · Kül Ovası | d1:0 d2:0 d3:0 d4:0 d5:0 d6:2 d7:0 d8:0 d9:0 d10:7 | **%78** |
| 4 · Kar Geçidi | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:4 d8:0 d9:4 d10:4 | **%33** |
| 5 · Kadim Harabe | d1:0 d2:0 d3:0 d4:0 d5:0 d6:3 d7:0 d8:0 d9:8 d10:3 | **%21** |
| 6 · Sisli Bataklık | d1:0 d2:0 d3:0 d4:2 d5:0 d6:1 d7:0 d8:0 d9:5 d10:9 | **%53** |


**Hangi düşman sızıyor** — toplam sayı *neyin* sızdığını söylemiyor ve
bu ikisi farklı düzeltmeler gerektiriyor:

| Harita | Sızan düşmanlar (çok → az) |
|---|---|
| 1 · Değirmen Geçidi | **hiç yok** |
| 2 · Taş Köprü | Harpi ×2 |
| 3 · Kül Ovası | Trol ×3 · Örümcek Yavrusu ×3 |
| 4 · Kar Geçidi | Örümcek Yavrusu ×4 · Trol ×3 · Şaman ×1 · Zırhlı Ork ×1 |
| 5 · Kadim Harabe | Zırhlı Ork ×4 · Şaman ×3 · Trol ×2 · Örümcek Ana ×1 · Kurt Binicisi ×1 |
| 6 · Sisli Bataklık | Tünelci ×8 · Ork Savaşçı ×5 · Trol ×2 |

**Kısıt A ile Kısıt B aynı şeyi ölçmüyor.** Kısıt A *tek* düşman için
("bir Ork Savaşçı öldürülebilir mi"), Kısıt B *dalga* için ("on bir tanesi
aynı anda gelirse").
Ölçüm bunu net gösteriyor — **6 · Sisli Bataklık**:
en çok sızan **Tünelci** (×8) Kısıt A'da
%28,9 ile rahat geçiyor; Kısıt A'da en zorlanan
**Trol** (%60,8) ise yalnız
×2 sızıyor. İkisi de gerekli.

**Boss hiçbir haritada sızmıyor** — türetmenin uçtan uca sağlaması.


### Referans tahta — türetiliyor, uydurulmuyor

"Dalga N'de makul bir oyuncunun sahip olacağı kule dizilimi." Ekonomiden
türetiliyor: kapsaması yüksek nokta önce doluyor, sonra T2, sonra T3.
Kadroda Trol varsa **kışla** da alınıyor (§5'in Trol cevabı) ve **en düşük
kapsamalı** noktaya kuruluyor.

| Harita | Nokta dolma | Altın (muhafazakâr) | Altın (gerçekçi) | Dalga 10 tahtası |
|---|---|---|---|---|
| 1 · Değirmen Geçidi | dalga 7 | 1602 | 2122 | 8 kule (1350 altın) |
| 2 · Taş Köprü | dalga 3 | 3744 | 4888 | 10 kule (3180 altın) |
| 3 · Kül Ovası | dalga 4 | 6500 | 8476 | 11 kule + 1 kışla (5100 altın) |
| 4 · Kar Geçidi | dalga 4 | 12932 | 16988 | 11 kule + 1 kışla (7140 altın) |
| 5 · Kadim Harabe | dalga 4 | 16775 | 22079 | 14 kule + 1 kışla (6440 altın) |
| 6 · Sisli Bataklık | dalga 4 | 18414 | 24134 | 14 kule + 1 kışla (6440 altın) |

---

## 14. Juice ve ayarlar

Kaynak: `src/fx/ScreenShake.ts`, `HitStop.ts`, `src/systems/Settings.ts`

| Efekt | Değer | Ne zaman | hızlandırmada (2×/3×) |
|---|---|---|---|
| Ekran sarsıntısı | 0,12–0,25 sn, **yönlü**, üstel sönüm | Top patlaması, boss vuruşu, can kaybı | **açık** (S55) |
| Hit-stop | 60–80 ms | Boss hasarı ve düşman ölümü | **kapalı** — akışı bozardı |
| Squash & stretch | 1,3× yatay ezilme, 120 ms | Düşman ölürken | süre hız oranında kısalır |
| Vinyet nabzı | 400 ms vermilyon | Can kaybı | **efekt ayarından bağımsız** — uyarı, süs değil |
| Parçacık | en fazla 300 | Vuruş, ölüm, kule yerleşimi | yoğunluk **hız oranında** iner |
| Altın sayacı | kalan farkın %18'i + en az 1, kare başına | Dalga sonu | aynı |

Sarsıntı **rastgele yönlü değil** — darbe vektörü boyunca. Rastgele yön
oyuncuya darbenin nereden geldiğini söylemez.


### Ayarlar (TIER 1 kural 6)

| Ayar | Varsayılan | `prefers-reduced-motion` açıkken |
|---|---|---|
| Ses | true | true — ses hareket değil, etkilenmiyor |
| Ekran sarsıntısı | true | **false** — "azaltılmış" hâli yok |
| Efekt yoğunluğu | `full` | **`low`** — `off` "azalt" değil "kaldır" olurdu |

Efekt kademeleri (parçacık çarpanı): `off` = 0 · `low` = 0,4 · `full` = 1

Tercihler tek anahtarda (`kale-nobeti-save-v1`) ve **her erişim `try/catch`
içinde**. Gizli sekmede oyun çökmüyor, bellek yedeğine düşüyor ve oyuncuya
**bir kez** bildiriliyor.

---

## 15. Teknik bütçeler

| Havuz | Ön ayırma | Gerekçe |
|---|---|---|
| Düşman | 60 | Dalga bütçesi ~50 düşman; 60 pay bırakıyor |
| Mermi | 200 | `research/02` §7 |
| Hasar sayısı | 60 | `research/02` §7 |
| Asker | 24 | 8 nokta × 3 asker (Haydutlar) = 24, yani tavan dolsa bile yetiyor |

Havuz **sessizce büyümüyor** — dolduğunda `acquire` `null` dönüyor ve
`new` çağrılmıyor. Bu sayılar aynı zamanda sert tavanlar.

| Sabit | Değer |
|---|---|
| Mermi hızı | 600 px/sn (S20 — dokümanda yok) |
| Mermi isabet yarıçapı | 12 px |
| Mantıksal çözünürlük | 1280×720, `Scale.FIT` + `CENTER_BOTH` |
| Minimum yazı | 16 px (640×360'a küçültüldüğünde okunur kalmalı) |
| Minimum dokunmatik hedef | 44×44 px |

---

## 16. Uydurulmayan sayılar

Dokümanda olmayan her sayı **türetildi ve işaretlendi** (`// GEÇİCİ — S<nn>`).
Bu projenin en pahalı hatası uydurulmuş bir sayıydı (2200 HP'lik, hiçbir
oyun durumunda öldürülemeyen boss); kural o yüzden var.

| # | Sayı | Nereden türetildi |
|---|---|---|
| S20 | Mermi hızı 600 px/sn | Dokümanda yok; en hızlı düşmanı (Kurt Binicisi 110) ıskalamayacak değer |
| S37 | Şaman iyileştirme yarıçapı 90 px | §5 yalnız "8 HP/sn" veriyor, menzil yok |
| S38 | Örümcek yavrusu zırh/direnç/altın/puan = 0 | §5'te yalnız HP 30 ve hız 90 var. Altın 0: yoksa "altın = 3 × puan" bozulur |
| S43 | **Paladin kalkanı — YAZILMADI** | §4.4 "11 + kalkan" diyor, sayı yok. `undefined` bırakıldı |
| S44 | Haydutlar kaçınması **çarpımsal** | Olasılıksal ile sürekli hasarda beklenen değer olarak özdeş; rastgelelik getirmiyor |
| S48 | Meteor uçanları **vuruyor** | §8 belirtmiyor; vurmasaydı harpiye cevap tek aileye düşerdi |
| S66 | Düşmanın askere hasarı = puan × 5,625 | §4.4 T1 satırı (45 HP, 8 sn) + §5'in puan ölçeği |
| S67 | Asker hasarı fiziksel, zırh **saniyelik** rakama | Kare başına uygulansaydı zırh sonsuz güçlü çıkardı |
| S68 | Asker hızı 45 px/sn | Kadronun ortanca hızı (Ork Savaşçı) — §5 tablosundan |
| S70 | Dalga bitiş bonusu × altın çarpanı | §9'un kendi gerekçesi: "altın/HP oranı düşmesin" |

---

## 17. Bekçiler

`npm run guard` — TIER 1 kurallarının otomatik denetimi. Kaynak:
`scripts/guard-rules.mjs`. **Bekçiler kanıt değil, ağ**: hepsi düzenli
ifade sezgiseli ve her biri **kasıtlı bozmayla** doğrulandı.

| # | Kural |
|---|---|
| 1 | k.8  ham delta yalnız GameClock/GameScene |
| 2 | k.5  any kullanılmıyor |
| 3 | M0   PreloadScene 4 aşama (8) |
| 4 | k.7  setText yalnız Text üretmeyen dosyada |
| 5 | k.11 saf mantıkta runtime Phaser yok |
| 6 | test src/ altında test dosyası (69) |
| 7 | k.9  Math.sqrt yalnız math.ts |
| 8 | mim. coverage measureCoverage ile üretiliyor |
| 9 | k.8  saf mantıkta duvar saati yok |
| 10 | mim. sahne alanları create() içinde sıfırlanıyor |
| 11 | k.3  HAVUZ_ALANLARI → resetForPool() tam eşleşiyor |
| 12 | i18n scenes/+fx/ içinde Türkçe metin sabiti yok (sezgisel) |
| 13 | platform yazı boyutu ≥ 16px (scenes/+fx/) |
| 14 | k.10 localStorage yalnız util/storage.ts |
| 15 | platform console yalnız DEV korumalı |
| 16 | platform dokunmatik hedef ≥ 44px (çözülebilen ölçüler) |
| 17 | platform vite base: './' (R15) |
| 18 | S117 kule fiyatı tek adresten (maliyet) |
| 19 | M100 özel Phaser yapımının kapalı yüzeyi |
| 20 | M101 özel Phaser yapımı ölü modül taşımıyor |
| 21 | M103 data/systems/util ölü dışa aktarım taşımıyor |
| 22 | M104 her olayın yayanı ve dinleyeni var |
| 23 | M105 hareket, hareket ayarını izliyor (k.6) |
| 24 | M114 dokunma hedefi ölçülü nesnede |
| 25 | M122 strings.ts ölü oyuncu metni taşımıyor |
| 26 | k.3  HAVUZ_ALANLARI eksiksiz (yaşamdaki setter bildirilmiş) |

Liste **türetilmiş**: üretici bekçiyi koşturup çıktısını okuyor, elle
sayılmıyor. Bugün **26** kural var.

Sahne alanları kuralı **dört kez çıkan** bir hatadan doğdu: alan
başlatıcısı yalnız bir kez koşuyor, `create()` her yeniden başlatmada.
Sızıntı çökme üretmiyor, **yanlış durum** olarak görünüyor. Kural beş
tarihsel hataya karşı negatif doğrulandı ve yazıldığı anda **iki yeni
hata** buldu.

Sonuncusu (`M100`) başka bir kör noktayı kapatıyor: özel Phaser yapımı
(`src/vendor/phaser-custom.js`) paket boyutu için modül eliyor, tipler
ise tam pakete bakıyor — taşınmayan bir API typecheck'ten **yeşil**
geçip tarayıcıda çöküyordu. `M100` buna canlı düştü (`Phaser.Geom.Point`).


---

_Üretildi: `node scripts/kurallar.mjs`_

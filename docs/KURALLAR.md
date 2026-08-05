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

Tabana düşen vuruş ekranda **gri** çiziliyor — oyuncu kulesinin işe
yaramadığını görmeli. Örnek: Okçu T2 (10 hasar) harita 1 boss'una
(zırh 10) saniyede 10 değil **1,95** veriyor.

---

## 3. Kuleler

Kaynak: `src/data/towers.ts` · `GAME-DESIGN.md` §4.1–§4.3

Üç aile × 4 kademe. T2'den sonra **iki dal** var ve seçim geri alınamıyor
(değiştirmek için satmak gerekiyor, %30 kayıp).


### Okçu — Tek hedef, hızlı, ucuz. Zırha karşı zayıf.

Hasar tipi: `physical`

| Kademe | Maliyet | Hasar | Atış/sn | Ham DPS | Menzil | Patlama | Uçan çarpanı | Etki |
|---|---|---|---|---|---|---|---|---|
| **T1** | 70 | 6 | 1,1 | 6,6 | 150 | — | ×1 | — |
| **T2** | 110 | 10 | 1,3 | 13 | 165 | — | ×1 | — |
| **T3a** Keskin Nişancı | 170 | 26 | 0,6 | 15,6 | 260 | — | ×1 | — |
| **T3b** Kundakçı | 170 | 9 | 1,4 | 12,6 | 165 | — | ×1 | `burn` dps=4 seconds=4 |


### Top — Alan hasarı, yavaş. Kalabalığın cevabı.

Hasar tipi: `physical`

| Kademe | Maliyet | Hasar | Atış/sn | Ham DPS | Menzil | Patlama | Uçan çarpanı | Etki |
|---|---|---|---|---|---|---|---|---|
| **T1** | 110 | 22 | 0,5 | 11 | 140 | 45 px | **0** (vuramaz) | — |
| **T2** | 160 | 34 | 0,55 | 18,7 | 150 | 55 px | **0** (vuramaz) | — |
| **T3a** Havan | 240 | 48 | 0,45 | 21,6 | 230 | 70 px | **0** (vuramaz) | — |
| **T3b** Barut Fıçısı | 240 | 30 | 0,6 | 18 | 150 | 65 px | ×0,5 | `slow` factor=0,4 seconds=2 |


### Büyü — Zırh delen. Büyü dirençli düşmanlara zayıf.

Hasar tipi: `magic`

| Kademe | Maliyet | Hasar | Atış/sn | Ham DPS | Menzil | Patlama | Uçan çarpanı | Etki |
|---|---|---|---|---|---|---|---|---|
| **T1** | 100 | 14 | 0,7 | 9,8 | 155 | — | ×1 | — |
| **T2** | 150 | 24 | 0,75 | 18 | 170 | — | ×1 | — |
| **T3a** Yıldırım | 230 | 30 | 0,7 | 21 | 170 | — | ×1 | `chain` targets=3 falloff=0,7 |
| **T3b** Buz | 230 | 20 | 0,8 | 16 | 180 | — | ×1 | `slow` factor=0,5 seconds=2,5 |

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
| Trol | 400 | 30 | 4 | %0 | 24 | 8 | 2 can | — | `regen` hps=6 |
| Örümcek Ana | 150 | 50 | 0 | %20 | 18 | 6 | 2 can | — | `split` count=3 childId=orumcekYavrusu |
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
| Şaman | Keskin Nişancı (`last` ile arkadan seç) veya Yıldırım |
| Harpi sürüsü | Okçu + Büyü — **Top ve Havan vuramaz** |
| Trol | Kışla ile tut + yoğun tek hedef |
| Kurt Binicisi | Buz / Barut Fıçısı yavaşlatma |
| Ogre Şef | Büyü + Top, `strongest` hedefleme, Meteor |

---

## 7. Boss ölçeklemesi

Kaynak: `src/data/bossScaling.ts`

**Boss HP'si `700 × hpMultiplier` DEĞİL — haritadan türetiliyor.**

`700 × çarpan` harita 2'de 1120, harita 3'te 1820 ediyordu ve o haritalarda
karşılanabilir hiçbir tahta bunu indiremiyordu (Kısıt A %165 ve %282).

| Harita | Boss zırhı | Boss HP | Tavan | Oran (hedef %75-85) |
|---|---|---|---|---|
| 1 · Değirmen Geçidi | **10** | **700** | 761 | %92 |
| 2 · Taş Köprü | **5** | **712** | 890 | %80 |
| 3 · Kül Ovası | **2** | **740** | 925 | %80 |

**Zırh haritayla düşüyor** ve bu ters değil, mekanik gereği: geç haritalarda
altın daha çok noktaya bölündüğü için tahtanın ortalama kademesi düşüyor ve
zırh 10 o tahtayı hasar tabanına mahkûm ediyor. Zorluk zırhtan değil HP'den
ve dalga kompozisyonundan geliyor.

**Türetme oranı: 0,8** (tasarım bandı %75-85'in ortası).

**Regresyon bandı: ±%6** — yazılı HP hâlâ `0,8 × tavan` mı,
her test koşusunda doğrulanıyor. Ekonomi veya geometri sessizce değişirse
test kırılır. (Bu zaten bir kez oldu: tahtaya kışla eklenince harita 3'ün
tavanı düştü ve test yakaladı.)

Kısıt A boss için **tautoloji** olduğundan (HP tavanın %80'i tanımlanınca
`tavan > HP × 1,15` her zaman geçer) yerine iki gerçek sağlama var:
**karşılanabilirlik** ve yukarıdaki **regresyon bandı**.

---

## 8. Etkin DPS matrisi

Zırh, direnç ve uçan çarpanı **uygulanmış** DPS. Yanma dalları sürekli
hasarı da içeriyor. `—` = vuramıyor. Boss sütunu harita 1 zırhıyla.

| Kademe | Goblin | Ork | Kurt | Harpi | Zırhlı | Şaman | Trol | Örümcek | Ogre | Örümcek |
|---|---|---|---|---|---|---|---|---|---|---|
| Okçu T1 | 6,6 | 4,4 | 5,5 | 6,6 | 0,99 | 6,6 | 2,2 | 6,6 | 0,99 | 6,6 |
| Okçu T2 | 13 | 10,4 | 11,7 | 13 | 2,6 | 13 | 7,8 | 13 | 1,95 | 13 |
| Okçu T3a Keskin Nişancı | 15,6 | 14,4 | 15 | 15,6 | 10,8 | 15,6 | 13,2 | 15,6 | 9,6 | 15,6 |
| Okçu T3b Kundakçı | 16,6 | 13,8 | 15,2 | 16,6 | 5,89 | 16,6 | 11 | 16,6 | 5,89 | 16,6 |
| Top T1 | 11 | 10 | 10,5 | **—** | 7 | 11 | 9 | 11 | 6 | 11 |
| Top T2 | 18,7 | 17,6 | 18,15 | **—** | 14,3 | 18,7 | 16,5 | 18,7 | 13,2 | 18,7 |
| Top T3a Havan | 21,6 | 20,7 | 21,15 | **—** | 18 | 21,6 | 19,8 | 21,6 | 17,1 | 21,6 |
| Top T3b Barut Fıçısı | 18 | 16,8 | 17,4 | 9 | 13,2 | 18 | 15,6 | 18 | 12 | 18 |
| Büyü T1 | 9,8 | 9,8 | 9,8 | 9,8 | 9,8 | 5,88 | 9,8 | 7,84 | 7,35 | 9,8 |
| Büyü T2 | 18 | 18 | 18 | 18 | 18 | 10,8 | 18 | 14,4 | 13,5 | 18 |
| Büyü T3a Yıldırım | 21 | 21 | 21 | 21 | 21 | 12,6 | 21 | 16,8 | 15,75 | 21 |
| Büyü T3b Buz | 16 | 16 | 16 | 16 | 16 | 9,6 | 16 | 12,8 | 12 | 16 |

---

## 9. Yetenekler

Kaynak: `src/data/abilities.ts` · `GAME-DESIGN.md` §8


### Meteor

| Alan | Değer |
|---|---|
| `cooldownSeconds` | 45 |
| `radius` | 90 |
| `damage` | 180 |
| `damageType` | true |
| `hitsFlying` | true |


### Takviye

| Alan | Değer |
|---|---|
| `cooldownSeconds` | 20 |
| `soldierCount` | 2 |
| `soldierHp` | 60 |
| `soldierDps` | 7 |
| `lifetimeSeconds` | 20 |

Beklemeler `scaledDelta` ile azalıyor — **2× hızda yarı sürede** doluyor.
HUD'da dairesel dolumla gösteriliyor; hazır olunca altın kenar bir kez parlıyor.
Haritalar arası **sıfırlanıyor** (S49).

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
| Odaklanma kaybı | ×0,75 | Kuleler aynı hedefe ateş ederken kayıp |
| Güvenlik payı | ×1,15 | Kısıt A eşiği: `tavan > eHP × 1,15` |

**Altın çarpanı = HP çarpanı.** Gerekçe §9'da yazılı: eskiden yalnız HP
ölçekleniyordu ve harita 3'te altın/HP oranı %38'e düşüyordu.

**Başlangıç altını da çarpanı izliyor** — S72, kapandı. §9 tablosu
280/340/400 diyordu ama 340 ve 400 çarpanı izlemiyordu (×1,21 ve ×1,43,
oysa HP ×1,6 ve ×2,6). Ölçülen sonuç: dalga 1 tahtası üç haritada da 3-4
kule, ama goblin efektif HP'si 45/72/117. §9'un kendi gerekçesi
("altın/HP oranı düşmesin") başlangıç altınına da uygulandı:

| Harita | §9 tablosu | Kullanılan | Dalga 1 sızıntısı (önce → sonra) |
|---|---|---|---|
| 1 · Değirmen Geçidi | 280 | **280** | 0 → 0 |
| 2 · Taş Köprü | 340 | **448** = 280 × 1,6 | **4 → 0** |
| 3 · Kül Ovası | 400 | **728** = 280 × 2,6 | **7 → 0** |

Toplam sızıntı: harita 2'de 13 → 8, harita 3'te 43 → 25.

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
| **6** | 25 | 26 | 11 | 2,18 sn | 4× Goblin⁽0⁾, 3× Ork Savaşçı⁽1⁾, 2× Şaman⁽0⁾, 2× Harpi⁽1⁾ |
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
| **3** | 14 | 14 | 7 | 3,43 sn | 4× Ork Savaşçı⁽0⁾, 1× Zırhlı Ork⁽1⁾, 2× Goblin⁽1⁾ |
| **4** _(nefes)_ | 15 | 15 | 10 | 2,4 sn | 5× Goblin⁽0⁾, 5× Ork Savaşçı⁽1⁾ |
| **5** | 21 | 21 | 6 | 4 sn | 3× Ork Savaşçı⁽0⁾, 2× Örümcek Ana⁽1⁾, 1× Kurt Binicisi⁽0⁾ |
| **6** | 25 | 25 | 7 | 3,43 sn | 2× Zırhlı Ork⁽0⁾, 1× Trol⁽1⁾, 3× Ork Savaşçı⁽0⁾, 1× Harpi⁽1⁾ |
| **7** _(nefes)_ | 25 | 24 | 12 | 2 sn | 4× Goblin⁽0⁾, 6× Ork Savaşçı⁽1⁾, 2× Zırhlı Ork⁽0⁾ |
| **8** | 36 | 39 | 7 | 3,43 sn | 3× Örümcek Ana⁽0⁾, 2× Zırhlı Ork⁽1⁾, 1× Şaman⁽0⁾, 1× Trol⁽1⁾ |
| **9** | 43 | 47 | 9 | 2,67 sn | 2× Trol⁽0⁾, 2× Örümcek Ana⁽1⁾, 2× Zırhlı Ork⁽0⁾, 1× Şaman⁽1⁾, 2× Harpi⁽0⁾ |
| **10** | 52 | 51 | 5 | 4,8 sn | 1× Ogre Şef (boss)⁽0⁾, 2× Trol⁽1⁾, 1× Örümcek Ana⁽1⁾, 1× Zırhlı Ork⁽0⁾ |

⁽ⁿ⁾ = giriş/kol numarası. **Sabit ve veride yazılı** (S58) — rastgele değil.

---

## 12. Haritalar

Kaynak: `src/data/maps.ts` · `GAME-DESIGN.md` §9

| Harita | Yol | Nokta | HP/Altın çarpanı | Başlangıç altını | Uçan hattı | Kadro |
|---|---|---|---|---|---|---|
| 1 · Değirmen Geçidi | 1 kol | 8 | ×1 | 280 | 1 hat, 7/8 nokta kesiyor | 5 tip |
| 2 · Taş Köprü | 2 kol | 10 | ×1,6 | 448 | 1 hat, 5/10 nokta kesiyor | 7 tip |
| 3 · Kül Ovası | 2 kol | 12 | ×2,6 | 728 | 2 hat, 6/12 nokta kesiyor | 10 tip |


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
| Goblin | 45 | 571 | %7,9 |
| Ork Savaşçı | 110 | 710 | %15,5 |
| Kurt Binicisi | 60 | 301 | %19,9 |
| Harpi | 70 | 252 | %27,7 |
| Ogre Şef (boss) | 700 | 761 | %92 ✗ |


**2 · Taş Köprü** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Kollar | Oran |
|---|---|---|---|---|
| Goblin | 72 | 605 | 605 / 616 | %11,9 |
| Ork Savaşçı | 176 | 736 | 736 / 778 | %23,9 |
| Kurt Binicisi | 96 | 315 | 315 / 327 | %30,4 |
| Harpi | 112 | 229 | 357 / 229 | %49 |
| Zırhlı Ork | 256 | 621 | 621 / 768 | %41,2 |
| Şaman | 208 | 733 | 733 / 749 | %28,4 |
| Ogre Şef (boss) | 712 | 890 | 890 / 1024 | %80 |


**3 · Kül Ovası** — dalga 10 tahtası (muhafazakâr):

| Düşman | Efektif HP | Tavan | Kollar | Oran |
|---|---|---|---|---|
| Goblin | 117 | 528 | 761 / 528 | %22,1 |
| Ork Savaşçı | 286 | 649 | 973 / 649 | %44 |
| Kurt Binicisi | 156 | 277 | 407 / 277 | %56,3 |
| Harpi | 182 | 331 | 468 / 331 | %54,9 |
| Zırhlı Ork | 416 | 574 | 1006 / 574 | %72,4 |
| Şaman | 338 | 628 | 907 / 628 | %53,8 |
| Trol | 1040 | 892 | 1398 / 892 | %116,6 ✗ |
| Örümcek Ana | 390 | 581 | 838 / 581 | %67,2 |
| Örümcek Yavrusu | 78 | 352 | 507 / 352 | %22,1 |
| Ogre Şef (boss) | 740 | 925 | 1396 / 925 | %80 |


### Kısıt B — başsız simülasyon

Dalgayı gerçekten çalıştırıp **sızan HP'yi ölçüyor.** Formül değil,
çünkü girdileri (dalga süresi, aktiflik oranı) statik veriden hesaplanamaz.
Odaklanma kaybı doğal olarak ortaya çıkıyor — çarpan gerekmiyor.

Simülasyon **canlı oyunla aynı kodu** kullanıyor: aynı 
`BarracksSystem`, aynı `applyDamage`, aynı `TowerSystem`.

| Harita | Sızan düşman | Sızan HP | Dalga dağılımı |
|---|---|---|---|
| 1 · Değirmen Geçidi | **0** | 0 | d1:0 d2:0 d3:0 d4:0 d5:0 d6:0 d7:0 d8:0 d9:0 d10:0 |
| 2 · Taş Köprü | **8** | 384 | d1:0 d2:0 d3:1 d4:2 d5:1 d6:1 d7:1 d8:0 d9:2 d10:0 |
| 3 · Kül Ovası | **25** | 3299 | d1:0 d2:2 d3:3 d4:3 d5:2 d6:4 d7:2 d8:1 d9:7 d10:1 |


### Referans tahta — türetiliyor, uydurulmuyor

"Dalga N'de makul bir oyuncunun sahip olacağı kule dizilimi." Ekonomiden
türetiliyor: kapsaması yüksek nokta önce doluyor, sonra T2, sonra T3.
Kadroda Trol varsa **kışla** da alınıyor (§5'in Trol cevabı) ve **en düşük
kapsamalı** noktaya kuruluyor.

| Harita | Nokta dolma | Altın (muhafazakâr) | Altın (gerçekçi) | Dalga 10 tahtası |
|---|---|---|---|---|
| 1 · Değirmen Geçidi | dalga 7 | 1602 | 2122 | 8 kule (1350 altın) |
| 2 · Taş Köprü | dalga 5 | 2582 | 3102 | 10 kule (2210 altın) |
| 3 · Kül Ovası | dalga -1 | 4207 | 4727 | 11 kule + 1 kışla (3590 altın) |

---

## 14. Juice ve ayarlar

Kaynak: `src/fx/ScreenShake.ts`, `HitStop.ts`, `src/systems/Settings.ts`

| Efekt | Değer | Ne zaman | 2× hızda |
|---|---|---|---|
| Ekran sarsıntısı | 0,12–0,25 sn, **yönlü**, üstel sönüm | Top patlaması, boss vuruşu, can kaybı | **açık** (S55) |
| Hit-stop | 60–80 ms | Boss hasarı ve düşman ölümü | **kapalı** — akışı bozardı |
| Squash & stretch | 1,3× yatay ezilme, 120 ms | Düşman ölürken | süre yarıya iner |
| Vinyet nabzı | 400 ms vermilyon | Can kaybı | **efekt ayarından bağımsız** — uyarı, süs değil |
| Parçacık | en fazla 300 | Vuruş, ölüm, kule yerleşimi | yoğunluk **yarıya** iner |
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

| Kural | Ne kontrol ediyor |
|---|---|
| k.8 ham `delta` | `GameScene`'de yalnız izin listesindeki üç satır |
| k.5 `any` | Hiç kullanılmıyor |
| M0 `PreloadScene` | En az 4 aşama fonksiyonu |
| k.7 `setText` | `setText` çağıran dosya `Text` **üretmemeli** |
| k.11 Phaser | `systems/`,`util/`,`data/`,`types/` çalışma zamanında Phaser almıyor |
| test varlığı | `src/` altında en az bir `*.test.ts` |
| k.9 `Math.sqrt` | Yalnız `math.ts` |
| mim. `coverage` | `measureCoverage` ile üretiliyor, elle yazılmıyor |
| k.8 duvar saati | Saf mantıkta `Date.now`/`performance.now` yok |
| **mim. sahne alanları** | Her değişebilir sahne alanı `init`/`preload`/`create` içinde **atanıyor** |

Son kural **dört kez çıkan** bir hatadan doğdu: alan başlatıcısı yalnız bir
kez koşuyor, `create()` her yeniden başlatmada. Sızıntı çökme üretmiyor,
**yanlış durum** olarak görünüyor. Kural beş tarihsel hataya karşı negatif
doğrulandı ve yazıldığı anda **iki yeni hata** buldu.


---

_Üretildi: `node scripts/kurallar.mjs`_

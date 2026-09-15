# M17 — Büyü ailesi parlamıyor (S110)

> **Durum:** ARAŞTIRILDI, kod geri alındı. Teşhis değişti: sorun
> Büyü'nün sayılarında değil, **modelin kendisinde** (S113).

## Neden

`M16` Faz 3 denge ölçümünün çiftini düzeltince (S109) Büyü'nün hiçbir
haritada parlamadığı görüldü — taban tahtada can kaybı 4 / 18 / 24 / 23,
üç ailenin en kötüsü. `aileDengesi.test.ts`'in "her ailenin parladığı
bir harita var" iddiası bu yüzden ikiye bölünmek zorunda kaldı.

S110 teşhisi **"Büyü ekonomiye bağlı"** demişti (zengin tahtada
2 / 2 / 12 / 24). Bu teşhis **yanlış çıktı**; gerçek sebep aşağıda.

## Gerçek sebep: tahta Büyü'yü yanlış kuruyordu

`balanceChecks`'in dal seçimi şunu söylüyordu:

> Gerçek oyuncu bir tane yavaşlatıcı kurar: Büyü ailesinin ilk kulesi
> **Buz** alıyor, sonrakiler Yıldırım.

Kod bunu söylemiyordu. `ilkTop` / `ilkBuyu` bayrakları **dalga
döngüsünün içinde** `true` ile başlıyordu, oysa `kuleler` dalgalar
boyunca birikiyor. Sonuç: tahta bir tane değil **dalga başına bir tane**
yavaşlatıcı kuruyordu — ölçüldü, Kül Ovası'nda 4 Buz, Kar Geçidi'nde 5.

Bedeli aileye göre çok farklı:

- **Top** neredeyse hiç etkilenmiyor — Havan ve Barut Fıçısı ikisi de
  21,6 DPS. Yanlış dal, aynı hasar.
- **Büyü** yarı yarıya çöküyor — Buz'un hasarı **6,4 DPS** ve kimliği
  yavaşlatma. Tahtanın yarısı hasar vermeyen kuleye gidiyordu.

Yani S80/S81/S86/S92/S106/S109'un yedincisi: **yorum ile kod farklı bir
şey biliyor.** Aile aç değildi; model onu yanlış kuruyordu.

## Geriye kalan: Büyü hâlâ hiçbir haritada birinci değil

Bayrak düzeltilince tablo (taban çift, Zor can kaybı):

| harita | karışık | Okçu | Top | Büyü |
|---|---|---|---|---|
| tas-kopru    | 0 | 2 |  4 |  4 |
| kul-ovasi    | 3 | 0 |  4 |  4 |
| kar-gecidi   | 7 | 14 | 6 |  8 |
| kadim-harabe | 8 | 15 | 9 | 21 |

Açık ara kötü olmaktan çıktı ama **hâlâ hiçbir haritayı kazanmıyor**,
ve Kadim Harabe'de 21 — 20 can sınırının üstünde.

İki yapısal sebep ölçüldü:

1. **Menzil.** Yıldırım 170; Havan 230, Keskin Nişancı 260. Kısıt A
   tavanı `DPS × kapsananYol / hız`, yani menzil doğrudan tavanı
   çarpıyor. Büyü ham DPS'te eşit (21,0 · 21,6 · 20,4) ama kapsamada
   geride.
2. **Zırh delmek bu kadroda az şey ifade ediyor.** Zırh **vuruş
   başına** düşüyor, yani hızlı-zayıf vuran kuleyi cezalandırıyor.
   Havan'ın vuruşu 48; zırh 8'de bile yalnız %17 kaybediyor. Kadroların
   HP ağırlıklı ortalama zırhı 2,9-3,3, büyü direnci 0,04. Büyü'nün
   kimliği bu sayılarda **görünmüyor**.

---

## ÖLÇÜLDÜ — ve taş bu hâliyle YAPILAMAZ

Fazlar denendi, ölçüldü ve **kod geri alındı**. Sebep aşağıda; sayıların
hepsi ölçüm, tahmin değil.

### Faz 1 denendi: bayrak düzeltmesi tek başına çalışmıyor

Bayrak tahtadan okunacak şekilde düzeltildi
(`!kuleler.some((k) => k.towerId === 'buyu' && k.tier === 3)`) ve Büyü
gerçekten düzeldi: Kül Ovası **18 → 4**, Kar Geçidi **24 → 8**. Karışık
tahta da güçlendi (Kar Geçidi 13 → 7).

Ama düzeltme bir **zincir** tetikliyor ve zincir kapanmıyor:

```
tahta güçlendi → ceilingA yükseldi → boss HP (0,80 × tavan) yükseldi
   → Okçu bossu öldüremiyor (Kadim Harabe'de 24 can, sınır 20)
   → karışık tahta da bossu öldüremiyor
```

Boss HP'leri kuralın dediği gibi yeniden türetildi (979 → 1468,
1956 → 2612, 2492 → 3372, 2778 → 3781) ve **iki değişmez birden
kırıldı**: `kisitB`'nin "boss hiçbir haritada sızmıyor" iddiası ve
`aileDengesi`'nin "Okçu ölü aile değil" eşiği.

### Asıl kusur: `ceilingA` YAVAŞLATMAYI görmüyor (S113)

Zincirin sebebi bulundu ve S110'un teşhisinden daha derin.

`effectiveDps` açıkça *"yavaşlatma ve zincir bilerek 0"* diyor. Yani
Kısıt A tavanı `DPS × kapsananYol / hız` hesabını **taban hızla**
yapıyor. Oysa `towers.ts`'in kendi yorumu tam tersini söylüyor:
*"yavaşlatma `hız`ı bölüyor, yani yavaşlatan kule bütün tahtanın
hasarını çarpıyor."*

Bayrak hatası yüzünden tahtada dalga başına bir Buz birikiyordu
(Kül Ovası 4, Kar Geçidi 5). Yani tahtanın **gerçek** kapasitesi
tavanın çok üstündeydi ve `0,80 × tavan` rahat öldürülüyordu — güvenlik
payını **modellenmeyen yavaşlatma** karşılıyordu. Hata düzelince o pay
buharlaştı:

| harita | boss HP | karışık tahta bossu öldürüyor mu |
|---|---|---|
| kadim-harabe | 2492 | evet (can kaybı 2) |
| kadim-harabe | 2700 | **hayır** |
| kadim-harabe | 3372 (türetilen) | **hayır** |

Yani formül tahtayı **olduğundan güçlü** gösteriyor ve türetilen boss
HP'si gerçekte öldürülemez çıkıyor.

### Yavaşlatıcı oranı tarandı — tek bir N bütün değişmezleri tutmuyor

"Bir tane" ile "dalga başına bir tane" arasındaki doğru sayı, kuleye
oranla tarandı (`YAVASLATICI_BASINA_KULE`). Her N için boss HP'si kendi
tahtasından yeniden türetilip ölçüldü:

| N | boss sızıyor mu | Okçu (h5) | Kar Geçidi kazanan | Kadim kazanan |
|---|---|---|---|---|
| 3 | hayır (h5) | 24 | Top | Top |
| 4 | hayır (h5) | 24 | Top | Top |
| 5 | hayır (h5) | 24 | **Büyü** | **Büyü** |
| 99 (bugünkü niyet) | **evet** | 24 | — | — |

- `N = 5` Büyü'yü kurtarıyor ama bu sefer **Top hiçbir haritayı
  kazanmıyor**.
- `N = 3/4` Top'u koruyor ama Büyü yine dibe düşüyor (Kül Ovası 14-15).
- **Okçu her N'de 24** — yani Okçu'nun sorunu yavaşlatıcı oranı değil,
  büyüyen boss HP'si. S95'in aynısı, aynı sebeple (Okçu'nun çarpanı yok).

Üç aileyi aynı anda ayakta tutan bir N **yok**; sistem bıçak sırtı ve
tepkisi monoton değil.

### Karar: zorla yeşile boyamak yerine geri alındı

Yeşile ulaşmanın tek yolu `aileDengesi`'nin 20 eşiğini ya da boss
sızıntısı değişmezini gevşetmekti. İkisi de bu projenin **asıl
korumaları** — S95 ve boss türetmesi onlar sayesinde yakalandı. Bıçak
sırtı bir sayıya oturtmak da S82/S84'ün yasakladığı şey.

`M16`'nın deseni izlendi: **ölç, kaydet, ayrı taşa bırak.** Kod geri
alındı (suite 1021/1021 yeşil), bulgular S112 ve S113'e yazıldı.

---

## Doğru sıra (gelecek taş)

S110 **S113 çözülmeden yapılamaz**. Sıra:

1. **S113 — `ceilingA` yavaşlatmayı görsün.** Tavan formülü `hız`
   yerine *etkin* hızı kullanmalı (yavaşlatma çalışma oranı ×
   kapsama). Bu, `M16`'nın "önce araç, sonra oyun" dersinin aynısı:
   yarım modelle sayı türetmek işi iki kez yapmaktır.
2. **S112 — bayrak düzeltmesi**, artık tavan dürüst olduğu için boss
   HP'si de dürüst türetilir.
3. **S110 — Büyü.** Yıldırım'ın fiyat/çıktı dengesizliği ölçüldü ve
   duruyor: kümülatif 480 altına 21,0 DPS ve menzil 170, oysa Okçu
   Keskin Nişancı 350 altına 20,4 DPS ve menzil 260. Tarama, hasar
   30 → **36**'nın Büyü'yü Kar Geçidi'nde birinci yapan en küçük adım
   olduğunu söylüyor (30 → 8/21 · 32 → 8/16 · 34 → 7/16 · 36 → 5/13).
4. **Okçu'ya ikinci bakış** — boss HP'si her türetmede büyüyor ve
   çarpanı olmayan aile her seferinde eziliyor. S95 bir kez daha
   tekrarlarsa sorun sayıda değil **yapıda**.

## Bu planın YAPMADIĞI şeyler

- **Büyü'ye yeni mekanik eklemek** — `M11`'in dersi: görünmeyen mekanik
  eklenmez. Düzeltme sayılarda.
- **Zırh formülünü değiştirmek** — vuruş başına düşmesi §3'ün kararı.
- **Korumaları gevşetmek** — 20 can eşiği ve boss sızıntısı değişmezi
  yerinde duruyor.

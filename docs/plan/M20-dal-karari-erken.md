# M20 — T3 dal kararı erken açılsın (S118)

> **Durum:** BİTTİ (iki fazın ikisi). Araştırma ölçtü, bu taş düzeltti.

## Neden

Oyunun en zengin kararı **T3 dal seçimi**. `M11` Faz 2 bunları
ayrıştırmak için ayrı bir taş harcadı (Havan ↔ Barut Fıçısı aynı DPS,
takas menzil ↔ patlama) ve S93 şunu yazdı: *"görünmeyen takas seçim
değil, zar atışıdır."*

Ölçüldü: dalga 10'daki tahtada T3 dalı olan kule sayısı —
Değirmen Geçidi **0/8** · Taş Köprü **0/10** · Kül Ovası 10/12 ·
Kar Geçidi 11/12 · Kadim Harabe 14/15 · Sisli Bataklık 14/15.

Yani oyuncu bu kararı **ilk kez üçüncü haritada** görüyor, sonra bir
anda neredeyse her kulede birden. Öğrenme eğrisi düz-düz-uçurum.

Sebep model değil ekonomi. Harita 1'in tahtası 10. dalgada hâlâ
`{T1:4, T2:4}` — **T2'yi bile bitiremiyor**; harita 2 `{T1:1, T2:9}`.
Gelir tam "noktaları doldur + T2" kadar yetiyor.

## Neden harita 2, harita 1 değil

Harita 1 kampanyanın **ekonomik birimi**: `hpMultiplier` ve
`goldMultiplier` 1,0 (§9'un "altın çarpanı = HP çarpanı" kuralı) ve
`startGold` 280, ki bütün haritaların başlangıç altını `280 × çarpan`
olarak ondan türetiliyor (S72). Harita 1'in ekonomisini değiştirmek
**bütün kampanyayı yeniden ölçeklemek** demek.

O yüzden bu taş harita 2'yi hedefliyor ve harita 1'i bilerek bırakıyor:
öğrenme arkı **harita 1 = temel (T1/T2), harita 2 = ilk dal kararı,
harita 3 = tam kadro** oluyor. Harita 1'in T2'yi bitirememesi ayrı bir
soru (nokta sayısı ya da T1 fiyatı kolu) ve kendi taşını istiyor.

## Ölçülen dayanak

Harita 2'nin altın çarpanı tarandı (can kaybı **her değerde 0**, yani
rampa etkilenmiyor):

| altın | başlangıç | dalga 10 kademe | T3 | ilk T3 |
|---|---|---|---|---|
| 1,6 | 448 | `{T1:1, T2:9}` | 0 | — |
| 1,8 | 504 | `{T2:9, T3b:1}` | 1 | dalga 10 |
| 2,0 | 560 | `{T2:9, T3b:1}` | 1 | dalga 10 |
| **2,2** | **616** | `{T2:7, T3a:1, T3b:2}` | **3** | **dalga 9** |
| 2,4 | 672 | `{T2:6, T3a:2, T3b:2}` | 4 | dalga 9 |

**2,2 seçiliyor.** 1,8 ve 2,0'da yalnız **tek** kule T3'e çıkıyor ve o
da dal kuralı gereği Buz (yavaşlatıcı) — bir *seçim* değil, tek bir
dalın gösterimi. 2,2'de hem T3a hem T3b tahtada var, yani oyuncu
**takası** görüyor. 2,4 daha fazlasını veriyor ama gerek yok; en küçük
yeterli adım alınıyor.

Oran kontrolü de destekliyor — altın/HP oranları:
1,00 · **1,00** · 1,36 · 1,13 · 1,09 · 1,62. Harita 2'nin 1,00'ı tek
başına aykırı (harita 1 zaten §9 gereği 1,00); 2,2 onu **1,375** yapıp
harita 3'ün 1,36'sının yanına oturtuyor.

---

## Fazlar

### Faz 1 — Harita 2'nin ekonomisi *(risk DÜŞÜK-ORTA)*

`goldMultiplier` 1,6 → **2,2**, `startGold` 448 → **616**
(`280 × 2,2`, S72 kuralı korunuyor). S73 (altın ≥ HP) rahat sağlanıyor.

Tahta güçlendiği için **boss HP'si yeniden türetiliyor** (`M18`'in
kuralı: sürekli koşuda öldürülebilen eşik × 0,80) ve simülasyonla
doğrulanıyor.

**Kabul:** harita 2'de dalga 10'da en az iki farklı T3 **dalı**
tahtada; can kaybı 0'da kalıyor; rampa ve boss sızıntısı değişmezleri
bozulmuyor.

> **BİTTİ.** Harita 2 artık dalga 10'da `{T2:7, T3a:1, T3b:2}` — üç T3
> kulesi, iki farklı dal. Noktalar 5. dalga yerine **3.** dalgada
> doluyor. Can kaybı **0**'da kaldı, rampa `0 · 0 · 3 · 12 · 13 · 14`
> aynen duruyor ve altı bossun altısı da ölüyor.
>
> Boss HP'si `M18` kuralıyla yeniden türetildi: sürekli koşuda
> öldürülebilen eşik 1241 × 0,80 = **993** (eski 862). Yükseltilmeseydi
> harita 2 zenginleşen tahtanın karşısında daha da kolaylaşırdı.
>
> **Not — diğer haritalarda türetme kayması var.** Ölçülen eşiklere göre
> yazılı HP oranları: Kül Ovası 0,80 ✓ · Kar Geçidi 0,85 · Kadim Harabe
> 0,68 · Sisli Bataklık 0,83. Sebep `M18` Faz 3'te sıra: boss HP'leri
> türetildikten **sonra** harita çarpanları değişti. Hepsi hâlâ ölüyor
> (asıl değişmez tutuyor), o yüzden bu taşta dokunulmadı — bir sonraki
> taş (S116/S117) rampayı zaten yeniden türetecek, düzeltme oraya ait.

### Faz 2 — Doğrulama ve doküman

Tarayıcıda harita 2'de dal menüsü oyuncu gözüyle. §6/§9 notu,
`OPEN-QUESTIONS` S118 ve harita 1 için ayrı kayıt.

> **BİTTİ.** Harita 2 artık **616 altınla** açılıyor ve dal menüsü
> **1. dalgada** görülebiliyor: Keskin Nişancı (DPS 20,4 · menzil 260)
> ile Kundakçı (DPS 12,6 · menzil 195 · Yanma 11/sn · 4 sn) yan yana,
> ikisi de 170 altın, oyuncunun elinde 443. Yani takas satın almadan
> **önce** okunuyor — S93'ün istediği şey. Konsol temiz.

---

## Bu planın YAPMADIĞI şeyler

- **Harita 1'in ekonomisine dokunmak** — kampanyanın birimi; yukarıda.
- **Kule fiyatlarını düşürmek** — küresel; harita 4-6 zaten gelirinin
  %56-64'ünü harcayamıyor (S117).
- **S116/S117** — orta oyunun boşluğu; sıradaki taş.

# M21 — Orta oyuna elit dalgası (S116)

> **Durum:** BİTTİ — ama **kısmi**. Harita 3'te çalıştı, harita 4-5'te
> ölçüm izin vermedi. Sınır ve sebebi aşağıda.

## Neden

Ölçüldü: **bütün baskı 10. dalgada.** Altı haritanın beşinde 1-9 arası
dalgalar tek can bile sızdırmıyor; haritalar arasındaki zorluk farkı
aslında boss HP farkı. Oyuncunun 1-9 arası yaşadığı şey, makul bir
tahtayla, sonucu değiştirmeyen bir izleme.

## Dört yol denendi, üçü elendi — ve eleme yönü belirledi

| denenen | sonuç |
|---|---|
| Orta dalgaları ×1,3-2,0 büyüt | orta yine 0, **final şişiyor** (12 → 36) |
| Aynı bütçeyle kalabalık → elit takası | **tek can bile** sızmıyor |
| Elitleri 5-8'e **yay** | orta 12 ama final **21** (> 20) |
| Geliri kıs (11,0 → 7,0) | tahta her değerde 14/14 T3, orta değişmiyor |

İki şey öğrenildi:

1. **Kalabalık tehdit etmiyor, tek sert birim ediyor.** Dalga 6'nın 25
   puanı kalabalık olarak da elit olarak da tamamen yutuluyor; tehdit
   ancak puan **eklenince** doğuyor.
2. **Yaymak finali şişiriyor, noktasal olmak şişirmiyor.** `M16` üst
   üste binmesi yüzünden orta dalgalara yayılan fazlalık boss dalgasına
   devrediliyor; tek bir dalgaya toplanınca final **sabit** kalıyor
   (Kar Geçidi: dalga 6'ya +4 Trol → orta 0 → 4, final 12 → 12).

## Tasarım

**Dalga 6 kampanyanın "elit dalgası" oluyor** — nefes dalgasının
(4 ve 7) aynadaki kardeşi. Nefes bütçeyi ×0,85 ile *kısıyor*; elit
×2,2 ile *büyütüyor* ve fazlalık **kalabalığa değil tek sert birime**
(Trol, 8 puan) gidiyor.

Kadrosunda Trol olan haritalar: 3, 4, 5, 6. Harita 1-2 öğrenme yayı,
düz eğride kalıyor.

**Toplam zorluk artmıyor, dağılıyor.** Elit dalgası eklenince tahtanın
boss'a ayırabildiği pay düşüyor; `M18`'in kuralı (boss HP = sürekli
koşuda öldürülebilen eşik × 0,80) bunu **kendiliğinden** yakalıyor ve
boss HP'si düşüyor. Yani finalden alınan pay ortaya veriliyor; özel
bir istisna gerekmiyor.

---

## Fazlar

### Faz 1 — Bütçeye elit terimi *(risk DÜŞÜK)*

`BALANCE.eliteWaves` / `eliteFactor` ve `budget(n, elit)`. Harita 3-6'nın
6. dalgaları elit kompozisyonuna geçiyor. `waves.test`'in ±%10 kuralı
haritayı bilen `budgetFor(mapId, n)` üzerinden çalışıyor.

**Kabul:** dalga 6 puanı elit bütçesinin ±%10'unda; harita 1-2
değişmiyor.

> **BİTTİ.** `BALANCE.eliteWaves` / `eliteFactor` (×2,2) ve
> `budget(n, elit)`. Bütçe kuralı tek adreste: `budgetFor(mapId, n)` —
> hem dalga verisi hem `waves.test`'in ±%10 ve ±%15 sağlamaları onu
> kullanıyor (düz `budget(n)` elit dalgayı %104 sapmış gösteriyordu).

### Faz 2 — Boss HP ve rampa yeniden türetiliyor *(risk ORTA)*

`M18` kuralıyla boss HP'leri, sonra gerekirse harita çarpanları.
Ölçütler aynı: monoton · 1-3 < 12 · 4-6 ≥ 12 · hepsi < 20 · Kolay ≤ 10.
**Ek ölçüt:** harita 4-6'da orta oyun payı (dalga 1-9) sıfır olmamalı.

> **KISMEN BİTTİ — ve ek ölçüt TUTMADI.**
>
> Boss HP'si düşmedi: elit dalgası öldürülebilir eşiği neredeyse hiç
> değiştirmiyor (troller 10. dalgadan önce ölüyor), yani "finalden
> alınan pay ortaya verilir" varsayımı **yanlış çıktı**. Toplamı banda
> çekmek için çarpan indirmek gerekti.
>
> **Asıl duvar S95 oldu.** Harita 4 ve 5'te karışık tahtaya baskı
> yapacak ağırlık (+4 Trol) Okçu tahtasını 20 can eşiğinin üstüne
> atıyor: Kar Geçidi 16 → **27**, Kadim Harabe 17 → **27**. Hiçbir
> çarpan ikisini birden sağlamıyor (hp 5,6→Okçu 23 · 5,8→23 · 6,0→27)
> ve kompozisyon da kurtarmıyor (2 Trol + 2 Örümcek Ana → 23). +3 Trol
> Okçu'yu kurtarıyor ama karışık tahtada orta pay **0**'a düşüyor.
>
> Harita 3'te ise rahat: Okçu 0 → 4. Elit dalgası **yalnız orada**
> kaldı ve orada tam olarak istendiği gibi çalıştı: dağılım
> `orta 0 / final 3` → **`orta 5 / final 1`**.
>
> Rampa: `0 · 0 · 6 · 12 · 13 · 14` (harita 4-6 dokunulmadı).

### Faz 3 — Doğrulama ve doküman

§7'ye elit dalgası notu, `OPEN-QUESTIONS` S116.

> **BİTTİ.** Değişen şey dalga verisi; görsel bir şey değişmediği için
> tarayıcı turu yapılmadı, sağlama simülasyonda (`waves.test` bütçe
> bandı + `kisitB` rampası + `aileDengesi` aile eşiği).
>
> **Öğrenilen ve kaydedilen:** orta oyunu daha ileri götürmenin önünde
> S95'in makası duruyor — karışık tahta ile tek aile tahtası
> arasındaki fark harita zorlaştıkça büyüyor, ve karışığı zorlayan her
> dalga en zayıf aileyi öldürüyor. Gerçek kol S117 (maliyet/gelir
> oranı).

---

## Bu planın YAPMADIĞI şeyler

- **Fiyatların haritayla ölçeklenmesi** (S117'nin kök sebebi) — asıl
  kol o ama kampanya dengesini baştan türetir; bu taş ucuz olanı
  deniyor. Yetmezse sıradaki taş odur.
- **Harita 1-2'ye elit** — öğrenme yayı; kadrolarında Trol de yok.

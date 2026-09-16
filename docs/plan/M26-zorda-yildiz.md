# M26 — Zor'da üç yıldız imkânsızdı

> **Durum:** BİTTİ (iki fazın ikisi). Dengeye **dokunmadı** — yıldız
> ilerleme mantığı, savaş sayıları değil.

## Kusur

Yıldızlar **mutlak** can eşiklerine bakıyor (`SaveSystem.starsFor`,
§9): 20 → ★★★, 15-19 → ★★, ≤14 → ★.

Zorluk seviyeleri `M8-T11`'de eklendi ve Zor'un başlangıç canı **12**
(`difficulty.ts`). İki sistem hiç karşılaştırılmamış:

| zorluk | başlangıç can | kusursuz koşuda yıldız |
|---|---|---|
| Kolay | 20 | — (kaydedilmiyor, bilinçli) |
| Normal | 20 | ★★★ |
| **Zor** | **12** | **★** |

Yani Zor'da **hiç can kaybetmeden** bitiren oyuncu bile 1 yıldız
alıyor; ★★ eşiği (15) başlangıç canının üstünde, ★★★ (20) ise
erişilemez. Zoru seçen oyuncu ilerleme ölçüsünde **cezalandırılıyor**
ve `allStars` başarımı yalnız Zor oynayan için imkânsız.

Hiçbir yerde böyle bir karar yazılı değil — `difficulty.ts` yalnız
Kolay'ın yıldız kaydetmediğini gerekçelendiriyor, Zor'un tavanından
söz etmiyor. S114 ve S119 ile **aynı sınıf**: yeni bir sistem eklendi,
ona dokunan eski kural güncellenmedi.

## Düzeltme — sayı uydurmadan

Eşikler **oranla ifade ediliyor**, ve oran mevcut sayılardan türüyor:

```
20 / 20 = 1,00   → ★★★  "hiç can kaybetme"
15 / 20 = 0,75   → ★★    "canının dörtte üçünü koru"
```

Yani `starsFor` `startLives`'ı da alıyor:

- ★★★ — `lives >= startLives`
- ★★ — `lives >= ceil(startLives × 0,75)`
- ★ — kazandıysa

**Normal'in davranışı birebir korunuyor** (20 ve 15 aynı sayılara
çıkıyor); değişen yalnız Zor: 12 → ★★★, ≥9 → ★★.

`startLives` **zorunlu parametre** oluyor — R17 panzehiri: derleyici
bütün çağıranları saysın, çünkü asıl hata "bir çağıran hangi koşudan
söz ettiğini söylemiyordu".

## Neden denge değil

`starsFor` yalnız `GameOverScene` (kayıt) ve `HudScene` (portal olayı)
tarafından çağrılıyor. Hiçbir denge türetmesine girmiyor: rampa, boss
HP'si, aile dengesi, Kısıt A/B onu görmüyor.

---

## Fazlar

### Faz 1 — Eşikler orana çevriliyor

`starsFor` + `recordResult` `startLives` alıyor; çağıranlar zorluktan
besliyor. Mevcut testler (20/19/15/14) **aynen geçmeli**.

> **BİTTİ.** Zorunlu parametre işini gördü: derleyici **37 çağıran**
> saydı (4'ü üretim kodu, kalanı test). Mevcut 20/19/15/14 sağlamaları
> tek satır değişmeden geçti — kabul ölçütü buydu.

### Faz 2 — Doğrulama ve doküman

Zor'da kusursuz koşu ★★★ veriyor mu; §9 eşik tablosu güncelleniyor.

> **BİTTİ.** Canlı yapıda ölçüldü:
>
> | koşu | önce | sonra |
> |---|---|---|
> | Zor kusursuz (12/12) | ★ | **★★★** |
> | Zor 9/12 | ★ | ★★ |
> | Zor 8/12 | ★ | ★ |
> | Normal 20 / 15 / 14 | ★★★ / ★★ / ★ | **aynı** |
>
> §9'un tablosu mutlak sayılardan orana çevrildi ve gerekçesi yazıldı.

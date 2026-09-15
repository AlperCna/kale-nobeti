# M18 — Kısıt A tavanı yavaşlatmayı görsün (S113)

> **Durum:** BİTTİ (dört fazın dördü). `M17` ölçtü, bu taş düzeltti —
> ve üstüne S112, S110, S114 de kapandı.

## Neden

`M17`, S110'u (Büyü parlamıyor) çözmeye çalışırken duvara tosladı.
Zincir şu:

```
S112 düzeltilir (tahta dalga başına bir yavaşlatıcı kurmayı bırakır)
  → tahta güçlenir → ceilingA yükselir
  → boss HP (0,80 × tavan) yükselir
  → referans tahta kendi bossunu ÖLDÜREMEZ
```

Sebep `ceilingA`'nın kör noktası. `effectiveDps` açıkça *"yavaşlatma ve
zincir bilerek 0"* diyor, yani tavan `DPS × kapsananYol / hız` hesabını
**taban hızla** yapıyor. Oysa `towers.ts`'in kendi yorumu tersini
söylüyor:

> yavaşlatma `hız`ı bölüyor, yani yavaşlatan kule **bütün tahtanın**
> hasarını çarpıyor — kendi hasarını değil.

`M11-T02` yavaşlatmayı Barut Fıçısı'ndan tam bu yüzden almıştı. Formül
bunu hiç öğrenmedi.

## Ölçüldü: tavan bir tahmin değil, ZAR

Her harita için "referans tahta en fazla kaç HP'lik bossu öldürebilir"
ikili aramayla ölçüldü (yalnız 10. dalga, refakatçiler dahil) ve statik
tavana bölündü:

| harita | yavaşlatıcı/kule | tavan | öldürülebilir | oran |
|---|---|---|---|---|
| tas-kopru      | 0/10 | 1074 | 1227 | **1,14** |
| kul-ovasi      | 3/11 | 1224 | 1993 | **1,63** |
| kar-gecidi     | 3/11 | 2445 | 3906 | **1,60** |
| kadim-harabe   | 4/14 | 3115 | 3906 | **1,25** |
| sisli-bataklik | 4/14 | 3472 | 3243 | **0,93** |

Oran 0,93 ile 1,63 arasında geziniyor. Yani `0,80 × tavan` kuralının
güvenliği **tesadüf**: tahtada bol yavaşlatıcı varken tavan gerçeği
küçümsüyor ve pay kendiliğinden doğuyor; yavaşlatıcı azalınca pay
buharlaşıyor ve türetilen boss öldürülemez çıkıyor.

Yavaşlatıcısı hiç olmayan Taş Köprü'nün 1,14'ü ile 3-4 yavaşlatıcılı
haritaların 1,25-1,63'ü arasındaki fark da hipotezi destekliyor.

## Model

Yavaşlatma **yığılmıyor** — `effects.ts` S35: en güçlüsü kazanıyor.
O yüzden doğru model "çarpanları çarp" değil:

- Yavaşlatabilen kuleler (etkisi `slow`, ve uçana vurabiliyorsa) için
  **görev döngüsü** `min(1, süre × atışHızı)` — `etkiDps`'in yanma için
  kullandığı fikrin aynısı.
- Etkin yavaşlama oranı = `max(factor × görevDöngüsü)` (yığılma yok).
- Yolun yavaşlatılan kesri `q = min(1, Σ kapsananYol / yolUzunluğu)`.
- Zaman ağırlıklı etkin hız:
  `1 / ((1 − q)/hız + q/(hız × (1 − oran)))`

`ceilingA` `hız` yerine bunu kullanıyor.

**Bunun bir bedeli var ve açıkça yazılıyor:** `research/01` §2'nin
"tavan yerleşimden bağımsızdır" bulgusu **yavaşlatma varken artık
geçerli değil** — yavaşlatıcıyı yolun başına koymak sonraki bütün
kuleleri besliyor. Formül bunu kapsama kesriyle yaklaşık alıyor.

---

## Fazlar

### Faz 1 — `etkinHiz` ve tavanın düzeltilmesi *(risk ORTA)*

Saf fonksiyon, `node`'da test edilir. `ceilingA` yeni bir **zorunlu**
`yolUzunlugu` parametresi alıyor — R17 panzehiri: derleyici bütün
çağıranları saysın.

**Kabul:** öldürülebilir/tavan oranı haritalar arasında **ve**
yavaşlatıcı yoğunluğu değiştiğinde belirgin biçimde daha dar bir banda
giriyor. Oran hâlâ 0,93-1,63 gibi geziniyorsa model düzelmemiştir ve
Faz 2'ye geçilmez.

> **BİTTİ, kabul ölçüldü.** Tek düşman senaryosunda (Kısıt A'nın kendi
> tanımı) oran **CV 0,203 → 0,120**, aralık **0,685 → 0,361** ve
> hepsi 0,80'in üstünde. İlk ölçüm yanıltıcıydı: boss dalgasına karşı
> ölçtüğümde refakatçilerin hasarı emdiğini sandım, ama yalnız-boss
> ölçümü **aynı** oranları verdi — artık kalan değişkenlik boss
> yeteneklerinden geliyor (harita 5 ikinci evre, harita 6 çağırma),
> refakatçilerden değil.

### Faz 2 — S112 (bayrak) ve boss HP'lerinin yeniden türetilmesi

Tavan dürüstleşince `M17`'nin zinciri güvenli: bayrak tahtadan okunur,
boss HP'leri `0,80 × tavan` ile yeniden türetilir ve **simülasyonla
doğrulanır** (boss gerçekten ölüyor mu).

> **BİTTİ — ve türetme kuralı değişti.** `0,80 × ceilingA` sürekli
> koşuda hâlâ tutmuyordu: harita 5-6'da oran 0,70 ve 0,46'ya düşüyor,
> çünkü `M16`'nın üst üste binmesi bossu bir önceki dalganın
> artıklarıyla birlikte getiriyor ve o iki bossun yetenekleri var.
> Statik, tek düşmanlı, yeteneksiz bir tavan bunu ifade edemez.
>
> Boss HP'si artık **simülasyondan** türetiliyor: referans tahtanın
> sürekli koşuda öldürebildiği en yüksek HP ikili aramayla ölçülüyor,
> `0,80` payla yazılıyor. Yazılı HP'nin tavana oranı haritaya göre
> **0,41-0,88** arasında ve bu bir hata değil, yeteneğin bedeli.
> `bossScaling.test`'in ±%6 bandı ve %75-85 bandı bu yüzden yerini
> ölçülen değerlerin regresyon kilidine ve iki taraflı akıl sağlığı
> sağlamasına bıraktı; **asıl** sağlama `kisitB`'de (boss sızmıyor).
>
> **S114 yan bulgusu:** harita 6 o listede hiç yoktu ve bossu `M16`'dan
> beri sızıyordu. Liste altı haritaya çıkarıldı.

### Faz 3 — Rampa ve aile dengesi

Rampa ölçütleri aynı. `aileDengesi`'nin 20 eşiği ve boss sızıntısı
değişmezi **gevşetilmiyor** — `M17`'nin durma sebebi buydu.

> **BİTTİ.** Rampa yedinci kez türetildi: **0 · 0 · 3 · 12 · 13 · 14**
> (Kolay ×0,80 `0·0·0·4·4·3`). Çarpanlar: harita 4 `5,6 → 6,4`,
> harita 5 `7,6 → 9,2`, harita 6 `5,6 → 6,8`.
>
> Harita 6 yine bıçak sırtı çıktı (6,85→10 · 6,9→22 · 6,95→9) ve
> 13-19 bandında hiçbir değer vermedi. Çözüm çarpanı zorlamak değil
> **bossu** kullanmak oldu: HP'si öldürülebilir eşiğin epey altındaydı
> (1832 / 2290), 2100'e çıkarılınca eğri düzeldi ve 6,8 → 14 verdi.
>
> İki eşik de yerinde: Okçu'nun en kötüsü **19** (< 20) ve boss altı
> haritanın altısında da ölüyor. S110 da bu fazda kapandı — üç ailenin
> üçü de bir haritada parlıyor.

### Faz 4 — Doğrulama ve doküman

`research/01` §2'nin yerleşim bağımsızlığı uyarısı, §6 ve
`OPEN-QUESTIONS` S113 güncelleniyor.

> **BİTTİ.** `research/01` §2'ye yerleşim bağımsızlığının yavaşlatma
> varken geçersiz olduğu notu eklendi. `OPEN-QUESTIONS`: S110, S112,
> S113 kapandı; S114 (harita 6 boss sızıntısı) ve S115 (tavan
> zincirlemeyi de görmüyor) kaydedildi.

---

## Bu planın YAPMADIĞI şeyler

- **Zincirlemeyi (`chain`) modellemek** — `effectiveDps` onu da 0
  sayıyor. Ayrı bir kusur; yavaşlatma gibi bütün tahtayı çarpmıyor,
  yalnız kendi kulesini ilgilendiriyor. Ölçülüp ayrı kaydedilecek.
- **`BOSS_CEILING_RATIO`'yu oynatmak** — 0,80 `research/01` §12'nin
  bandının ortası; sorun oranda değil tavanın kendisinde.

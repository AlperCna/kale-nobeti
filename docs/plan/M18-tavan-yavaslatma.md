# M18 — Kısıt A tavanı yavaşlatmayı görsün (S113)

> **Durum:** plan. `M17` ölçtü, bu taş düzeltiyor.

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

### Faz 2 — S112 (bayrak) ve boss HP'lerinin yeniden türetilmesi

Tavan dürüstleşince `M17`'nin zinciri güvenli: bayrak tahtadan okunur,
boss HP'leri `0,80 × tavan` ile yeniden türetilir ve **simülasyonla
doğrulanır** (boss gerçekten ölüyor mu).

### Faz 3 — Rampa ve aile dengesi

Rampa ölçütleri aynı. `aileDengesi`'nin 20 eşiği ve boss sızıntısı
değişmezi **gevşetilmiyor** — `M17`'nin durma sebebi buydu.

### Faz 4 — Doğrulama ve doküman

`research/01` §2'nin yerleşim bağımsızlığı uyarısı, §6 ve
`OPEN-QUESTIONS` S113 güncelleniyor.

---

## Bu planın YAPMADIĞI şeyler

- **Zincirlemeyi (`chain`) modellemek** — `effectiveDps` onu da 0
  sayıyor. Ayrı bir kusur; yavaşlatma gibi bütün tahtayı çarpmıyor,
  yalnız kendi kulesini ilgilendiriyor. Ölçülüp ayrı kaydedilecek.
- **`BOSS_CEILING_RATIO`'yu oynatmak** — 0,80 `research/01` §12'nin
  bandının ortası; sorun oranda değil tavanın kendisinde.

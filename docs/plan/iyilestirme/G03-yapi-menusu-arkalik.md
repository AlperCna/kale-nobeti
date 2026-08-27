# G03 · Yapı/yükseltme menüsünün arkasında panel yok — S19 yarım kaldı — ☑ **düzeltildi (2026-08-28)**

| | |
|---|---|
| **Tür** | Görsel — okunurluk *ve* tutarlılık |
| **Önem** | **Yüksek.** Oyunun en sık açılan arayüzü |
| **Emek** | Orta (gerçekleşen) |
| **Risk** | Orta — doğrulandı, bir gerçek hata canlı testte yakalanıp düzeltildi |
| **Dokunulan** | `src/scenes/GameScene.ts` (`#openMenu`, `#openSellMenu`, `#openBarracksMenu`, yeni `#menuArkalikEkleVeKonumla`) |
| **İlgili** | `GAME-DESIGN.md` §2 · `OPEN-QUESTIONS.md` **S19** (kapandı) |

---

## Sonuç (2026-08-28)

**Düzeltildi, seçenek (b) uygulandı** (içeriğe göre boyutlanan panel).
`fx/BuildMenu.ts`'e ayrıştırma (Y01'in 3. adımı, aynı oturumda
planlanmıştı) **bilinçli olarak ertelendi** — gerekçe aşağıda.

### Nasıl yapıldı — planla farkı

Doc'un önerdiği "önce ölç, sonra çiz" (b) sırası yerine, daha az kod
tekrarı isteyen bir sıra kullanıldı: **önce butonlar eskisi gibi çizilir
(`kap` konumu `(0,0)`), sonra tek bir yardımcı (`#menuArkalikEkleVeKonumla`)
`kap.getBounds()` ile gerçek sınırları ölçüp panel kurar VE `kap`'ı
ekran-güvenli konuma taşır.** Üç menünün (`#openMenu`, `#openSellMenu`,
`#openBarracksMenu`) üçü de aynı tek yardımcıyı çağırıyor — düzen
matematiği (buton aralığı, hedefleme satırı yüksekliği) **hiçbir yerde
elle kopyalanmadı**, `getBounds()` gerçek render'dan okuyor.

**Beklenmedik ve olumlu bir sonuç:** `getBounds()` yaklaşımı yalnız buton
kutularını değil, **metni de** ölçüyor. T2 kule menüsünde "Keskin
Nişancı 170" gibi uzun bir dal adı butonun 88 px'lik kutusundan taştığında
(136 px, 24 px taşma) panel bunu **otomatik olarak** kapsayacak şekilde
genişledi — canlı ölçümde doğrulandı. Doc'un kendi riski
("metin i18n ile değişirse hesap da değişmeli... bu risk bugün panelde
değil, butonda") burada **panel tarafında da** bedava çözülmüş oldu.

### Canlı testte yakalanan gerçek hata

İlk uygulamada kenetleme (`Clamp`) **panelin değil, yalnız butonların**
sınırlarına bakıyordu — panel butonlardan `MENU_PANEL_PAY` (16 px) daha
geniş olduğu için, ekranın **tam kenarındaki** bir yapı noktasında panel
ekranın dışına **tam 16 px taşıyordu** (sağ kenar testinde: panel sağı
`1280`, ekran genişliği `1280` — pay sıfıra inmişti). Kenetleme
**panelin gerçek kenarına** göre yeniden hesaplandı ve dört kenarda da
(sol/sağ/üst/alt) 16 px'lik payın tam korunduğu ölçülerek doğrulandı.
Bu, dosyanın kendi doğrulama listesindeki "en soldaki ve en sağdaki yapı
noktalarına tıkla" maddesinin **tam olarak yakalamak için var olduğu**
hata sınıfı.

### Hedefleme modu seçimi güçlendirildi

Öneri maddesi (1) uygulandı: seçili olmayan hedefleme butonları artık
`alpha 0.8` ile hafifçe soluk — seçili buton (vermilyon konturla birlikte)
tam opak. Ölçek küçültme (basılı görünüm) **bilerek yapılmadı**:
46×44 px'lik buton zaten platformun 44 px alt sınırına çok yakın;
`%6` küçültme dokunmatik hedefi 44 px'in **altına** düşürürdü. Opaklık
farkı, dokunmatik hedefi küçültmeden aynı "yalnız renge dayanmaz"
gerekçesini (TIER 1 kural 6) karşılıyor.

### Canlı doğrulama

| Kontrol | Sonuç |
|---|---|
| Boş nokta → 4 buton + panel | ✅ panel 9 parça, buton tıklaması panelin üstünden geçiyor (kule kuruldu, altın düştü) |
| T1 kule → 2 buton + 5 hedefleme + panel | ✅ panel genişliği elle hesapla **birebir** eşleşti (184/246 → 246) |
| T2 kule (uzun dal adı) → panel metni de kapsıyor | ✅ 280 (buton) yerine 304 (metin dahil) — beklenen ve doğru |
| Hedefleme modu değiştirme | ✅ tıklanan buton `alpha:1`, diğerleri `0.8`'e döndü |
| Kışla T0 menüsü (hedefleme satırı YOK) | ✅ panel 184×44, yalnız 2 buton |
| **Sol kenar** (spot 0) | ✅ panel sol kenarı ekranın **tam 16 px** içinde |
| **Sağ kenar** (spot 7) | ✅ panel sağ kenarı ekranın **tam 16 px** içinde (düzeltmeden önce 0 px'ti — canlı yakalandı) |
| **Üst kenar** (spot 1) | ✅ panel üstü ekranın **tam 16 px** içinde |
| Dışarı tıklayınca menü kapanıyor | ✅ panel dahil tamamen yok oluyor |
| `dev.shutdownListeners()` | ✅ 3 yeniden başlatmada sabit (13→13) |
| `npm run typecheck/test (698/698)/guard (10/10)` | ✅ hepsi yeşil |
| `docs/KURALLAR.md` diff'i | ✅ boş (salt görsel) |

**Not — ekran görüntüsü yine alınamadı** (Browser pane sorunu bu
oturumda da sürdü). Doğrulama, Phaser sahne grafiğinin doğrudan
okunmasıyla (`scene.children.list`, `getBounds()`, olay `emit` ile
tetikleme) yapıldı — geometri ve davranış **sayısal olarak** kanıtlandı,
piksel/göz kontrolü eksik kaldı.

### Ertelenen: `fx/BuildMenu.ts` ayrıştırması (Y01'in 3. adımı)

**Bilerek yapılmadı.** [Y01](Y01-gamescene-bolme.md)'in kendi notu:
"**Emek: Büyük — tek oturumda yapılmamalı**" ve bu üç menü metodu
projenin en çok sistemle konuşan yüzeyi (ekonomi, kule, kışla,
hedefleme, bilgi paneli, `dev` kancalarının yarısı). G03'ü aynı
oturumda **güvenli** biçimde bitirmek zaten mümkündü (yukarıdaki
doğrulama bunu gösteriyor); riskli 350 satırlık taşımayı da aynı
oturuma sıkıştırmak, tam da bu "iyileştirme" turunun önlemeye çalıştığı
türden bir hataya açık kapı bırakırdı. Ayrıştırma artık **daha ucuz**:
menü içeriği artık `#menuArkalikEkleVeKonumla` gibi tek bir ortak
noktadan geçiyor, gelecekteki taşıma bunu da beraberinde götürebilir.

---
---

## Bulgu

Bir yapı noktasına tıklayınca açılan menü — oyunun en sık kullanılan
arayüzü — **arkalıksız**. Butonlar tek tek parşömen, ama satırın arkasında
bir panel/kartuş yok; butonlar doğrudan savaş alanının üstünde yüzüyor:
yolun, yürüyen düşmanların ve arka plan görselinin üstünde.

## Kanıt

`#openMenu` bir `Container` kuruyor ve **doğrudan butonları** ekliyor:

```ts
// src/scenes/GameScene.ts:1204-1235
const kap = this.add.container(
  Phaser.Math.Clamp(spot.x, 160, this.scale.width - 160),
  Phaser.Math.Clamp(spot.y - 56, 40, this.scale.height - 40),
);

const toplam = TOWERS.length + 1;
TOWERS.forEach((def, i) => {
  const bx = (i - (toplam - 1) / 2) * 84;
  ...
  this.#menuButonu(kap, bx, `${TOWER_LABEL[def.id] ?? def.id} ${maliyet}`, ...);
});

const kislaMaliyet = barracksTierAt(KISLA, 0).cost;
this.#menuButonu(kap, (TOWERS.length - (toplam - 1) / 2) * 84, `Kışla ${kislaMaliyet}`, ...);

this.#menu = kap;
```

`kap`'a eklenen **tek şey butonlar**. Arkaya hiçbir şey konmuyor.
Aynı durum `#openSellMenu` (`1256-1344`) ve `#openBarracksMenu`
(`1460-1495`) için de geçerli.

### `#showCartouche` bu işi yapmıyor

```ts
// src/scenes/GameScene.ts:1508-1513
#showCartouche(spot: Vec2): void {
  this.#cartouche?.destroy();
  this.#cartouche = this.add
    .image(spot.x, spot.y, 'atlas', FRAME_CARTOUCHE)
    .setDisplaySize(TOWER_DISPLAY_SIZE + 16, TOWER_DISPLAY_SIZE + 16);
}
```

Kartuş **yapı noktasının kendisine** konuyor (`spot.x, spot.y`,
kule boyutunda), menü panelinin arkasına değil. İki farklı iş; ikincisi
hiç yapılmamış.

### S19 bunu zaten söylüyor

`OPEN-QUESTIONS.md` M2 tablosu:

| # | Durum | Ayrıntı |
|---|---|---|
| **S19** | ☐ varsayılan uygulandı | İki butonlu düz liste, 88×44 px. §2'deki "altın kartuş" biçimi **M6'da** |

M6 geldi ve **butonların stilini** getirdi (bu oturumda `eaa02c7`,
`14fff68`). S19'un asıl istediği "altın kartuş biçimi" — yani menünün
kendisinin bir kartuş içinde durması — gelmedi.

## Neden önemli

**1. Okunurluk, estetikten önce.** Menü, arka plan görselinin (WebP,
tam renkli manzara) ve **hareket eden düşmanların** üstünde açılıyor.
Parşömen butonlar açık renkli; açık renkli bir arka plan bölgesinde
(gökyüzü, taş köprü) sınırları kayboluyor. Bir panel, menüyü kendi
zemininden ayırıyor.

**2. En sık açılan arayüz.** Bir harita boyunca oyuncu bu menüyü
onlarca kez açıyor: 8-12 yapı noktası × (kurma + yükseltme + kademe 3
dalı + hedefleme modu). HUD'dan bile sık.

**3. Menü savaş alanını kapatıyor ama bunu belli etmiyor.** Panel
olmadığında butonların arasından yol ve düşmanlar görünüyor; gözün
"burası arayüz, orası oyun" ayrımı yapması zorlaşıyor. Panel bu ayrımı
tek hamlede kuruyor.

**4. Hedefleme modu satırı özellikle karışık.** `#openSellMenu`
(`1310-1332`) beş hedefleme modu butonunu bir satıra diziyor ve seçili
olanı **yalnız kontur** ile işaretliyor:

```ts
// src/scenes/GameScene.ts:1329
kap.add(this.add.rectangle(bx, 52, 46, 44, 0, 0).setStrokeStyle(3, VERMILION_COLOR));
```

Vermilyon kontur, arkasında hareketli bir manzara varken kaybolabilen
tam da o tür bir işaret.

## Ölçüler

Bugünkü menü genişliği hesaplanabilir:

- `#openMenu`: 4 buton (3 kule + kışla), aralık **84 px** → ~336 px
- `#openSellMenu` (T2 durumu): 2 buton (`-48`, `+48`) → ~180 px
- `#openSellMenu` (T3 durumu): 3 buton (`-96`, `0`, `96`) → ~280 px
  **artı** altında 5 hedefleme butonu (`y=52`, 46 px genişlik)
- `#openBarracksMenu`: aynı desen

Panel bu genişliklerin en büyüğüne göre **sabit** mi olmalı, yoksa
duruma göre **değişken** mi — asıl tasarım kararı bu (aşağıda).

## Seçenekler

### (a) Sabit boyutlu tek panel

En büyük duruma (`#openMenu`, ~336×60 + hedefleme satırı için ~110)
göre tek bir `createParchmentFrame` boyutu seçilir, bütün menüler onu
kullanır.

- ✅ Tek boyut, tek kod yolu
- ✅ Menüler arası geçişte panel **zıplamıyor** (yükselt → dal seç →
  hedefleme aynı çerçevede)
- ❌ İki butonlu menüde panelin yarısı boş kalıyor
- ❌ Kapladığı alan büyük; küçük haritalarda savaş alanının önemli bir
  kısmını örtüyor

### (b) İçeriğe göre boyutlanan panel *(önerilen)*

Butonlar yerleştirildikten sonra kapsayan dikdörtgen ölçülüp panel
ona göre kuruluyor. `Container.getBounds()` bunu veriyor; ama panel
butonların **arkasında** olmalı, yani:

1. Butonları geçici bir listeye kur (henüz `kap`'a ekleme)
2. Genişlik/yükseklik hesapla (buton sayısı × aralık + kenar payı)
3. `createParchmentFrame` ile paneli kur, **önce** `kap`'a ekle
4. Butonları sonra ekle → doğal çizim sırası paneli arkada bırakır

- ✅ Her menü kendi boyutunda
- ✅ Boş alan yok
- ⚠️ Menüler arası geçişte panel boyutu değişiyor. Yumuşatmak için kısa
  bir ölçek tween'i düşünülebilir, ama TIER 1 kural 6 (efekt yoğunluğu)
  ve `prefers-reduced-motion` bunu kapatabilmeli — yani tween
  `settings.effectScale` ile korunmalı.
- ⚠️ Genişlik hesabı buton metnine bağlı; metin i18n ile değişirse
  (bkz. [Y03](Y03-i18n-sizintisi.md)) hesap da değişmeli. Sabit
  aralık (84 px) kullanıldığı sürece metin taşarsa **butonun içinde**
  taşar, panelin dışında değil — yani bu risk bugün panelde değil,
  butonda.

### (c) `cartouche` karesini gerdirerek kullan

Atlas'ta zaten bir `cartouche` karesi var (`atlas.json`, 34 kareden biri).

- ❌ Kartuş dekoratif bir çerçeve, 9-slice değil. Gerdirilirse köşe
  süslemeleri bozulur. `ParchmentFrame` zaten tam bu iş için yazıldı
  (köşe `Image` + kenar `TileSprite` + orta `TileSprite`).
- ❌ Reddedilir. `cartouche` bugünkü işinde (yapı noktası vurgusu)
  doğru kullanılıyor.

## Öneri

**(b).** Ek olarak, aynı işte iki küçük düzeltme:

1. **Hedefleme modu seçim işareti güçlendirilsin.** Bugün yalnız
   vermilyon kontur (`GameScene.ts:1329`). Panel geldiğinde arkası
   sakinleşiyor, ama seçili modun **dolgusu** da değişmeli — kontur tek
   başına TIER 1 kural 6'nın "yalnız renge dayanmaz" ruhuna zayıf bir
   cevap. Dolgu + kontur birlikte, ya da seçili butonun hafifçe
   çökertilmiş (basılı) görünmesi.

2. **`GameScene.ts:1205-1206`'daki `Clamp` yeniden bakılmalı.** Bugün
   menü merkezi ekran kenarlarından 160 px içeride tutuluyor. Panel
   eklenince gerçek genişlik değişiyor; `Clamp` payı **panelin yarısı**
   olmalı, sabit 160 değil. Aksi hâlde kenardaki yapı noktalarında panel
   ekran dışına taşar.

## Doğrulama

1. Boş noktaya tıkla — 4 butonlu menü, arkasında panel. Panel
   butonların hepsini içine alıyor mu, kenar payı eşit mi.
2. T1 kule kur, tıkla — 2 butonlu menü. Panel küçüldü mü, ortalı mı.
3. T2'ye yükselt, tıkla — 3 buton + 5 hedefleme butonu. Panel her ikisini
   de kapsıyor mu.
4. Kışla kur, tıkla — `#openBarracksMenu` de panelli mi.
5. **Ekranın en solundaki ve en sağındaki** yapı noktalarına tıkla —
   panel ekran dışına taşmıyor mu (`Clamp` düzeltmesinin testi).
6. Dalga sırasında, düşmanlar menünün arkasından geçerken ekran
   görüntüsü al — butonlar okunuyor mu.
7. 640×360'a küçült — panel ve butonlar okunur mu, yazı ≥ 16 px mi.
8. Efekt yoğunluğu **Kapalı** iken menü açılışında tween koşmamalı.
9. `dev.*` menü kancaları (`dev.openMenu`, `dev.setTargetMode`) hâlâ
   çalışmalı — panel bir `Container` çocuğu, tıklama alanlarını
   değiştirmemeli.

## Bitmedi sayılır eğer

- Panel butonların **önünde** çiziliyorsa (çizim sırası yanlış).
- Kenardaki yapı noktalarında panel ekran dışına taşıyorsa.
- Panel tıklamayı yutuyorsa (butonların üstüne gelen bir tıklama alanı
  eklenmemeli; `createParchmentFrame` etkileşimsiz olmalı,
  `createParchmentButton` değil).
- Menü kapanınca panel ekranda kalıyorsa (`#closeMenu` `kap.destroy()`
  çağırıyor; panel `kap`'ın çocuğu olduğu sürece sorun yok — **ama
  `kap`'ın dışına konursa sızıntı olur**).
- `OPEN-QUESTIONS.md` S19 satırı güncellenmediyse.

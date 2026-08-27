# G03 · Yapı/yükseltme menüsünün arkasında panel yok — S19 yarım kaldı

| | |
|---|---|
| **Tür** | Görsel — okunurluk *ve* tutarlılık |
| **Önem** | **Yüksek.** Oyunun en sık açılan arayüzü |
| **Emek** | Orta |
| **Risk** | Orta — buton yerleşimi ve tıklama alanları etkileniyor |
| **Dokunulan** | `src/scenes/GameScene.ts:1199-1236`, `1256-1344`, `1460-1495`, `1508-1513` |
| **İlgili** | `GAME-DESIGN.md` §2 · `OPEN-QUESTIONS.md` **S19** |

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

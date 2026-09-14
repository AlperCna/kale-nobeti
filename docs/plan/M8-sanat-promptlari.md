# M8 — Arka plan üretim prompt'ları (harita 4 ve 5)

Bu dosya `M8-sanat-brifi.md`'deki `M8-P01`/`M8-P02` maddelerinin
**görüntü üretecine verilecek hâli**. Brif *ne gerektiğini* anlatır;
bu dosya *nasıl istendiğini*.

Prompt'lar **İngilizce**, çünkü görüntü üreteçlerinin hepsi İngilizce
istemde belirgin biçimde daha isabetli. Etrafındaki açıklama Türkçe.

---

## 0. Üretim ayarları

| | Değer |
|---|---|
| En-boy | **16:9** |
| Çözünürlük | **en az 2048×1152** (büyük üret, biz küçültüyoruz) |
| Çıktı | PNG (şeffaflık yok, tam kare) |
| Nereye | `assets-src/bg/kar-gecidi.png` · `assets-src/bg/kadim-harabe.png` |

Tam 1280×720 üretmeye çalışma. `scripts/prep-assets.mjs`
`sharp().resize(1280, 720, { fit: 'cover' })` ile kendisi küçültüp
WebP q80'e çeviriyor; büyük üretilen görüntü küçülünce keskinleşir,
küçük üretilen büyütülünce dağılır.

Dosyalar gelince tek komut:

```bash
node scripts/prep-assets.mjs bg
```

---

## 1. En kritik madde: **yol, yuva ve kale ÇİZİLMEZ**

`src/fx/MapRenderer.ts` `#drawMap()` her karede arka planın **üstüne**
çiziyor:

- **yol** — `PATH_WIDTH = 48` px kalınlığında düz `#8A7250` şerit,
- **yapı yuvaları** — `SPOT_RADIUS = 28` px, altın konturlu daireler,
- **kale** — altın konturlu mürekkep kare.

Yani arka plana yol boyamak motorun çizdiğiyle çakışır; iki yol görünür.
Doğrusu: yolun geçtiği koridoru **sakin, açık zemin** bırakmak ve detayı
koridorun **kenarına** koymak. O zaman motorun düz şeridi oraya ait
görünür.

Referans, harita 1 (`public/assets/bg/degirmen-gecidi.webp`): ortası
neredeyse boş bir çayır, bütün detay kenarlarda ve köşelerde. Yol yok.
Yeni iki harita da **aynı disiplinde** olmalı.

---

## 2. Harita 4 — "Kar Geçidi" (`M8-P01`)

Üretece **olduğu gibi** verilecek metin:

```text
A 16:9 top-down game-board illustration of a narrow northern mountain
pass in deep winter, painted in the style of an Ottoman/Persian
illuminated manuscript (tezhip miniature).

STYLE
Flat decorative miniature painting on aged paper. Every shape is a flat
colour fill bounded by a thin ink or gold-leaf outline. Fine gold
hairline ornament drawn inside the rock masses and the pine foliage, the
way gilded leaf-work is drawn in a manuscript border. Matte paper grain
across the whole image. No cast shadows, no volumetric light, no glow, no
lens effects, no gradients that imply a light source. Slightly elevated,
deliberately flattened bird's-eye view: the ground reads as a decorated
page, not as a photograph.

PALETTE — use only these hues and tones derived from them
  ink blue    #14203A  outlines, rock shadow, deep crevasse
  moss green  #2F4A3C  pine and fir mass
  parchment   #E4D3A8  snow, stone, highlights
  gold leaf   #D4A032  ornament, outlines, accents
  lapis       #3E5CA8  ice, frozen water, distant peaks
  vermilion   #B03A2E  a very few tiny accents only
The snow is COLD PARCHMENT — #E4D3A8 desaturated and shifted toward pale
blue-grey. Never pure white. The lightest value in the image is
parchment. No bright cartoon colours, no teal, no magenta.

COMPOSITION — this is a game board, not a landscape
The road, the round tower slots and the castle are drawn by the game
engine ON TOP of this image at runtime. Therefore:
  - Paint NO road, no path, no track, no trail, no footprints in a line.
  - The entire central area of the frame is an OPEN, CALM, stony
    snowfield: near-uniform value, very low contrast, only the faintest
    drift and scree variation. Nothing there may compete with a game
    piece sitting on it.
  - All landmarks and density live at the OUTER EDGE of the frame, like
    the illuminated border of a page:
      * TOP EDGE, top 8% only: a low band of misty mountain silhouettes
        in pale lapis, extremely low contrast, almost dissolving.
      * LEFT EDGE, lower two thirds: a steep dark rock wall in ink blue
        with gold hairline strata, capped with snow, a cluster of black
        firs at its foot.
      * RIGHT EDGE: a matching rock wall, taller, with a frozen waterfall
        of pale lapis ice frozen mid-fall down its face.
      * BOTTOM 20% of the frame, a continuous band: deep snow drifts,
        fir clusters, a few large gold-ornamented boulders half buried,
        the odd broken fence post.
  - Leave the very middle of the bottom band quieter than its corners.
  - Scatter a very small number of tiny gold frost tufts across the open
    snow — sparse, like the gold flecks in a manuscript margin, not a
    texture.

MOOD
Cold, still, defensible. A pass that armies have marched through and
nobody lives in. Austere, not pretty.

NEGATIVE — none of this
no road, no path, no trail, no roads painted on the ground, no castle,
no fort, no buildings in the centre, no people, no animals, no creatures,
no text, no letters, no numbers, no watermark, no signature, no UI, no
HUD, no icons, no frame, no border, no vignette, no drop shadow, no
photorealism, no 3D render, no cel-shaded cartoon, no anime, no pure
white, no neon, no lens flare, no bokeh, no depth of field.
```

### Ek istek (aynı sohbette, ilk sonuç geldikten sonra)

> Keep everything, but make the **central snowfield emptier and lower in
> contrast** — roughly 60% of the frame should be near-uniform ground.
> Push all remaining detail outward to the edges.

Üreteçler hemen hemen her zaman ortayı fazla dolduruyor; bu ikinci tur
neredeyse kesin gerekiyor.

---

## 3. Harita 5 — "Kadim Harabe" (`M8-P02`)

```text
A 16:9 top-down game-board illustration of an abandoned, moss-grown
ancient city ruin, painted in the style of an Ottoman/Persian illuminated
manuscript (tezhip miniature).

STYLE
Flat decorative miniature painting on aged paper. Every shape is a flat
colour fill bounded by a thin ink or gold-leaf outline. Fine gold
hairline ornament inside the stonework — carved fret patterns, mosaic
fragments, worn inscriptions rendered as pure decorative line, never as
readable letters. Matte paper grain across the whole image. No cast
shadows, no volumetric light, no glow, no lens effects. Slightly
elevated, deliberately flattened bird's-eye view: the ground reads as a
decorated page, not as a photograph.

PALETTE — use only these hues and tones derived from them
  ink blue      #14203A  outlines, deep shadow between stones
  moss green    #2F4A3C  moss, ivy, overgrowth
  parchment     #E4D3A8  cut stone, marble, highlights
  gold leaf     #D4A032  mosaic fragments, ornament, outlines
  lapis         #3E5CA8  a little standing water, glazed tile
  vermilion     #B03A2E  a very few tiny accents only
The overall cast is GREY-GREEN: wet stone and moss. Deliberately far from
orange and red — this map must read as a different climate from the
neighbouring volcanic ash plain.

COMPOSITION — this is a game board, not a landscape
The road, the round tower slots and the castle are drawn by the game
engine ON TOP of this image at runtime. Therefore:
  - Paint NO road, no paved avenue, no street, no path, no flagstone
    track crossing the frame.
  - The broad central area is an OPEN, CALM plane of cracked flagstone
    and thin moss: near-uniform value, very low contrast. Nothing there
    may compete with a game piece sitting on it.
  - All ruin architecture and density lives at the OUTER EDGE and along
    the BOTTOM, like the illuminated border of a page:
      * LEFT EDGE, narrow: two weathered ceremonial gateways, one in the
        upper third and one in the lower third, their arches broken,
        ivy hanging from the lintels. Keep them SHALLOW — they must not
        push more than a tenth of the frame width inward.
      * RIGHT EDGE: a taller surviving wall section with a gold mosaic
        band, and a collapsed colonnade.
      * BOTTOM 20% of the frame, a continuous band: toppled columns
        lying in the moss, broken statue fragments, cracked basin, a
        drift of fallen masonry, dense ivy.
      * UPPER MIDDLE-RIGHT, a small cluster only: the stumps of three or
        four column bases and a fallen capital.
  - The upper-left and centre-left must stay the QUIETEST part of the
    image — just cracked stone and moss.
  - Scatter a very small number of tiny gold mosaic tesserae across the
    open ground — sparse, like gold flecks in a manuscript margin.

MOOD
Old, green, silent, long abandoned. Grand architecture that lost its
argument with time. Melancholy, not spooky — no fog, no ghosts.

NEGATIVE — none of this
no road, no paved avenue, no street, no path, no castle in the centre,
no intact buildings, no people, no statues standing upright, no animals,
no creatures, no readable text, no letters, no numbers, no watermark, no
signature, no UI, no HUD, no icons, no frame, no border, no vignette, no
drop shadow, no photorealism, no 3D render, no cel-shaded cartoon, no
anime, no fog, no mist, no orange, no lava, no fire, no neon, no lens
flare, no depth of field.
```

### Ek istek

> Keep everything, but move the two gateways **closer to the left edge**
> and make the centre-left emptier. The middle of the frame should be
> near-uniform cracked stone.

---

## 4. Geldiğinde neye bakılacak

Sırayla; ilk üçü elemeli.

1. **Ortası boş mu?** Kareyi 3×3'e böl; orta hücre neredeyse düz olmalı.
   Değilse ikinci tur iste — bu, kabul edilebilir tek "yeniden üret"
   sebebi.
2. **Yol var mı?** Varsa reddet. Motorunki üstüne binince iki yol olur.
3. **Saf beyaz / parlak turuncu var mı?** Varsa palet kaçmış.
4. **Gri tonlamada ayrışıyor mu?** (TIER 1 kural 6.) Tarayıcıda:
   `document.body.style.filter='grayscale(1)'` — kule siluetleri ve yol
   hâlâ zeminden ayrılmalı.
5. **HUD kutuları sakin mi?** Aşağıdaki dikdörtgenlerin altında yüksek
   kontrastlı detay olmamalı. `M8-B01` sonrası güncel liste
   (`src/data/maps.test.ts` `KALICI_HUD` ile aynı):

   | Alan | Dikdörtgen |
   |---|---|
   | Altın/can/dalga kartuşu | `8,16 – 224,156` |
   | Dalga sayacı | `500,0 – 780,120` |
   | Zorluk rozeti | `1086,25 – 1154,59` |
   | Hız düğmesi | `1204,20 – 1260,76` |
   | Ayar düğmesi | `1204,152 – 1260,208` |
   | Yetenek butonları | `28,622 – 170,707` |
   | Tam ekran düğmesi | `848,636 – 928,714` |

6. **Yapı yuvalarının altı sakin mi?** Her yuva 28 px yarıçapında bir
   daire; çevresinde ≥ 40 px yarıçapta yüksek kontrastlı detay
   istemiyoruz. Yuva daireleri motor tarafından çiziliyor, yani
   "üstünde bir şey olmasın" değil, "altındaki zemin gürültülü
   olmasın" demek.

   **Harita 4** (12):
   ```
   (100,215) (280,65)  (405,215) (555,290) (405,355) (555,505)
   (700,355) (860,505) (925,355) (1075,500) (200,215) (780,505)
   ```
   **Harita 5** (15):
   ```
   (90,315)  (270,175) (150,405) (345,460) (275,535)
   (65,480)  (315,335) (480,360) (480,470) (610,500)
   (625,335) (910,255) (910,105) (925,400) (1075,520)
   ```

7. **Yol koridoru açık mı?** Motorun çizeceği şerit (48 px + iki yana
   30 px pay) boyunca yüksek kontrastlı kütle olmamalı.

   **Harita 4:** `(-60,140) → (480,140) → (480,430) → (1000,430) →
   (1000,660)` — sol kenardan üstten girer, ortada aşağı kırılır, sağa
   uzanır, sağda tekrar aşağı kırılıp alt kenarda kaleye varır.

   **Harita 5:** iki kol sol kenardan (`y = 250` ve `y = 570`),
   `(200,410)`'da birleşir; ortak gövde `(380,410) → (700,410) →
   (700,180) → (1000,180) → (1000,600) → (1180,600)`.

8. **Boyut.** `prep-assets.mjs` çıktısı ≤ 400 KB olmalı. Aşarsa görüntü
   gereğinden gürültülü demektir (WebP düz alanları çok iyi sıkıştırıyor);
   çözüm kaliteyi düşürmek değil, ortayı sakinleştirmek.

Beşinci maddeden sonrası benim işim: dosyayı koy, `prep-assets` çalıştır,
beş haritayı canlı ekranda gözle kontrol et, gri tonlama sağlamasını yap.

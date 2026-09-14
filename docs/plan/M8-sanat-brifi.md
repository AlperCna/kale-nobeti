# M8 — Sanat üretim brifi (insan işi)

Bu dosya **kod tarafında bitmiş**, yalnız görsel üretimi bekleyen işleri
listeler. Her madde için oyunda çalışan bir **geçici** görsel zaten var —
oyun hiçbir aşamada bozuk değil. Gerçek görsel üretilince **yalnız
`assets-src/` altındaki kaynak PNG değişir**, sonra:

```bash
node scripts/prep-assets.mjs bg kartlar
```

Kod, veri, atlas ve testler aynı kalır. Bu bilinçli: sanat gecikmesi
oyunun ilerlemesini durdurmuyor.

---

## M8-P01 — Harita 4 arka planı: "Kar Geçidi"

**Dosya:** `assets-src/bg/kar-gecidi.png`
**Hedef çıktı:** `public/assets/lazy/kar-gecidi.webp` (1280×720, q80, ≤400 KB)
**Şu anki durum:** GEÇİCİ. Harita 1'in arka planından türetildi
(`sharp().modulate({ saturation: 0.35, brightness: 1.18 }).tint(214,228,245)`)
— yani soğutulmuş bir değirmen vadisi. Kar yok, kaya yok, geçit yok.

### Ne çizilecek

Kuzeye açılan dar bir **dağ geçidi**, kışın. Kamera yukarıdan hafif eğik
(diğer üç haritayla aynı bakış açısı — referans için
`public/assets/bg/degirmen-gecidi.webp`).

**Zemin:** taşlı kar. Yolun kendisi **çamurlaşmış, basılmış kar**:
çevresinden bir ton koyu, hafif kahverengi-gri; kenarlarda ayak izi ve
kar birikintisi. Yol çizgisi görünür olmalı ama parlak olmamalı — üstünde
düşman ve kule oturuyor.

**Yolun geometrisi** (kod bunu zaten kullanıyor, arka plan buna uymalı;
1280×720 mantıksal çözünürlükte):

```
(-60,140) → (480,140) → (480,430) → (1000,430) → (1000,660)
```

Yani: **sol üstten** girer, ekranın üçte birinde **aşağı kırılır**,
ortadan **sağa** uzanır, sağ tarafta **tekrar aşağı** kırılıp alt kenarda
kaleye varır. İki keskin 90° dönüş — bunlar geçidin **boğazları**, kaya
duvarlarıyla desteklenmeli.

**Kale:** `(1000, 660)` — alt kenarda, kısmen çerçeve dışında. Kar altında
bir **sınır karakolu**: taş kule, mazgal, üstünde kar. Harita 1'in
değirmeninden daha askerî.

**Çevre:** yolun iki yanında dik kaya duvarları ve karaçam. Sol üst köşede
buzlu bir dere/şelale olabilir. Arka planda (üst kenar) sisli dağ silueti
— derinlik için, ama okunurluğu bozmayacak kadar soluk.

### Yapı noktaları — ÜSTÜNE HİÇBİR ŞEY ÇİZİLMEYECEK

Bu 12 nokta oyunda kule yuvasıdır; her birinin çevresi **≥ 40 px
yarıçapta boş ve sakin** kalmalı (koyu detay, parlak vurgu, yüksek
kontrast doku yok). Kule sprite'ı 64×64 oturuyor.

```
(100,215) (280,65)  (405,215) (555,290) (405,355) (555,505)
(700,355) (860,505) (925,355) (1075,500) (190,65)  (780,505)
```

### Palet

`docs/GAME-DESIGN.md` §2 tezhip paletinden çıkılmaz. Kar bu haritada
**parşömen beyazı** (`#E4D3A8`'in soğuk, açık hali) tarafına kaçar, saf
beyaz kullanılmaz — saf beyaz HUD parşömeniyle çakışıyor ve kule
siluetlerini yutuyor. Gölgeler mürekkep mavisi (`#14203A`) tarafında.
Altın varak (`#D4A032`) yalnız kalede ve birkaç vurguda.

### Kabul ölçütü

1. 1280×720, WebP q80 çıktısı ≤ 400 KB.
2. Yol, 12 yapı noktasının hiçbiriyle çakışmıyor (kod zaten ≥ 40 px
   uzaklığı test ediyor — bu **görsel** uyum için).
3. Gri tonlamaya çevrildiğinde (`grayscale(1)`) yol hâlâ görünür ve
   kule siluetleri zeminden ayrışıyor (TIER 1 kural 6: "yalnız renge
   dayanmaz").
4. Harita 1/2/3 ile yan yana konduğunda aynı oyuna ait görünüyor.

---

## Not: bu listede olmayan işler

Kule, düşman ve HUD sanatı `M6`'da üretildi ve **tamam** — bu brif
yalnız `M8` kapsamında açılan yeni görsel ihtiyaçlarını taşır. Yeni bir
madde eklenirse buraya eklenir, `M8-genisleme.md` içine değil.

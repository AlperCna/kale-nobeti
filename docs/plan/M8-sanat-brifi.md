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

## M8-P02 — Harita 5 arka planı: "Kadim Harabe"

**Dosya:** `assets-src/bg/kadim-harabe.png`
**Hedef çıktı:** `public/assets/lazy/kadim-harabe.webp` (1280×720, q80, ≤400 KB)
**Şu anki durum:** GEÇİCİ. Harita 3'ün (Kül Ovası, lav) arka planından
türetildi (`sharp().modulate({ saturation: 0.28, brightness: 0.88 })
.tint(150,168,150)`) — yani soğutulup soluklaştırılmış bir lav ovası.
Harabe yok, yapı yok, yosun yok.

### Ne çizilecek

**Terk edilmiş, yosun tutmuş bir antik şehir kalıntısı.** İki ayrı kapıdan
girilen, ortada birleşen taş döşeli bir ana cadde. Kamera diğer dört
haritayla aynı bakış açısı.

**Zemin:** çatlamış taş döşeme ve yosun. Yol, kalıntının hâlâ ayakta olan
**ana caddesi** — düzgün kesme taş, kenarlarında kırık sütun kaideleri.
Yolun dışı: devrilmiş sütunlar, kırık heykel parçaları, sarmaşık.

**Yolun geometrisi** (kod bunu kullanıyor, arka plan buna uymalı;
1280×720 mantıksal çözünürlük):

```
Kol A:  (-60,250) → (200,250) → (200,410) ─┐
Kol B:  (-60,570) → (200,570) → (200,410) ─┤
                                            ├─> ORTAK GÖVDE
gövde:  (380,410) → (700,410) → (700,180) → (1000,180) → (1000,600) → (1180,600)
```

İki kapı **sol kenarda**, biri üstte biri altta; `x = 200` sütununda
birleşiyorlar. Birleşme noktası görsel olarak da bir **kapı/kemer**
olmalı — oyuncu iki akışın orada buluştuğunu bakar bakmaz görmeli.

**Kale:** `(1180, 600)` — sağ altta. Kalıntının hâlâ savunulan son burcu:
üstü örtülü, mazgallı, etrafı moloz.

**Kritik: HUD alanları boş kalmalı.** Aşağıdaki dikdörtgenlerin üstüne
**okunurluğu bozacak detay konmayacak** (arayüz orada duruyor):

| Alan | Dikdörtgen |
|---|---|
| Altın/can/dalga kartuşu | `8,16 – 224,156` |
| Erken başlat rozeti | `17,155 – 102,211` |
| Hız + ayar | `1204,20 – 1260,144` |
| Yetenek butonları | `28,622 – 170,707` |
| Dalga sayacı/telgraf | `500,0 – 780,120` |

### Yapı noktaları — ÜSTÜNE HİÇBİR ŞEY ÇİZİLMEYECEK

15 nokta; her birinin çevresi **≥ 40 px yarıçapta boş ve sakin**:

```
(90,315)  (270,175) (150,405) (345,460) (275,535)
(65,480)  (315,335) (480,360) (480,470) (610,500)
(625,335) (910,255) (910,105) (925,400) (1075,520)
```

### Palet

Tezhip paleti. Bu harita **yeşilimsi gri** tarafa kaçar (yosun, ıslak taş);
mürekkep mavisi gölgelerde, altın varak yalnız kalede ve birkaç mozaik
parçasında. Harita 3'ün turuncu/kırmızısından tamamen uzak — ikisi yan yana
konduğunda farklı iklimler olmalı.

### Kabul ölçütü

`M8-P01` ile aynı dört madde + HUD dikdörtgenlerinin sakin kalması.

---

## M8-P03 — Üç ses dosyası

**Kod tarafı bitmiş.** Üçü de çağrılıyor ve **eksik oldukları için sessizce
atlanıyor** (`SoundSystem.#cal` / `cache.audio.exists` kontrolleri, `Y14`
deseni). Dosyalar gelince kod değişmeden çalışmaya başlarlar.

Biçim `CLAUDE.md` "Varlık formatları": ses efektleri **yalnız `.m4a`**
(AAC), müzik 96 kbps mono.

| Anahtar | Dosya | Süre | Ne zaman çalıyor |
|---|---|---|---|
| `countdown_tick` | `public/assets/audio/sfx/countdown_tick.m4a` | ≤ 150 ms | Hazırlık sayacının son 3 saniyesi, saniyede bir |
| `boss_music` | `public/assets/audio/music/boss_music.m4a` | 40-70 sn, **döngülü** | Boss sahaya çıkınca oyun müziğinin yerine |
| `ui_click` | `public/assets/audio/sfx/ui_click.m4a` | ≤ 120 ms | Menü, ayarlar, duraklatma menüsü ve tam ekran düğmelerine basınca |

### `countdown_tick`

Kuru, kısa, **alçak** bir tahta/deri vuruşu — nöbetçi davulu. Melodik
olmamalı: saniyede bir çalıyor ve bir nota olursa üç tekrarda tekdüze bir
ezgi duygusu doğuruyor. Son tik (1) diğerlerinden **bir yarım ton pes**
olabilir; ama tek bir dosya yeterli, kod hepsini aynı anahtarla çalıyor.

Ses düzeyi diğer efektlerden **belirgin biçimde düşük** olmalı: bir uyarı
değil, bir nabız.

### `boss_music`

Oyun müziğinin (`music_game`) **aynı tonalitesinde**, ama:
- tempo biraz daha yavaş ve ağır,
- alt register baskın (davul, bas),
- ana tema tanınabilir kalmalı — yeni bir parça değil, aynı parçanın
  "kuşatma" hâli.

Döngü noktası **duyulmamalı** (başı ve sonu aynı ölçüde kesilmiş olmalı).

### `ui_click`

Kısa, kuru, **tok** bir parşömen/tahta dokunuşu. Melodik değil, tınlamıyor:
saniyede birkaç kez basılabilen bir düğme sesi; rezonansı olan bir ses
üst üste binince çamurlaşıyor. Diğer efektlerden **bir tık alçak**.

**Kod tarafı hazır** (`fx/ParchmentFrame.addPressFeedback`). Nerede
çaldığı bilinçli olarak sınırlı: `addPressFeedback` yalnız **arayüz kromu**
düğmelerine takılıyor (menü, tam ekran, duraklatma menüsü). Yapı menüsü ve
yetenek düğmeleri onu kullanmıyor — onların kendi sesleri var
(`tower_place`, `error`) ve üstüne tıklama sesi bindirmek ikisini birden
anlamsızlaştırırdı.

Doğrulandı (ses geçici olarak başka bir dosyayla besleyerek): düğmeye
basınca `ui_click` çalıyor, ses seviyesi ayarı izliyor (Tam → 1,0 ·
Düşük → 0,35 · Kapalı → **hiç çalmıyor**, sessiz çalmıyor).

Dosya gelince tek yapılacak: `PreloadScene`'in `SFX_ERKEN` listesine
eklemek (ilk duyulduğu yer ana menü, o yüzden erken grupta).

---

## Not: bu listede olmayan işler

Kule, düşman ve HUD sanatı `M6`'da üretildi ve **tamam** — bu brif
yalnız `M8` kapsamında açılan yeni görsel ihtiyaçlarını taşır. Yeni bir
madde eklenirse buraya eklenir, `M8-genisleme.md` içine değil.

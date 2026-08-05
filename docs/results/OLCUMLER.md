# Ölçüm kütüğü

**Varsayılmayan, ölçülen her sayı.** Bir sayı buraya girdiyse tahmin değil;
nereden geldiği, neyin ona asılı olduğu ve hangi test onu koruduğu yazılı.

Kural: bir taş bittiğinde ölçülen her sayı buraya işlenir. İşlenmeyen ölçüm
bir sonraki oturumda yeniden yapılmak zorunda kalır — bu dosyanın varlık
sebebi o.

> Sütun anlamları
> **Değer** — ölçülen · **Nasıl** — hangi komut/dosya üretti ·
> **Neye asılı** — bu sayı değişirse ne kırılır · **Bekçi** — sessizce
> değişmesini engelleyen test

---

## 1. Harita geometrisi (M1)

| # | Büyüklük | Değer | Nasıl | Neye asılı | Bekçi |
|---|---|---|---|---|---|
| G1 | Harita 1 yol uzunluğu `L` | **1700 px** | `pathLength(MAP_1.paths[0])` | Sızıntı formülü hata çarpanı, dalga temposu (M3) | `maps.test.ts` |
| G2 | Ortalama kapsanan yol (menzil 150) | **296,3 px** | `measureCoverage` | **Tüm denge** — Kısıt A tavanları, boss/Trol HP | `maps.test.ts`, `referenceBoards.test.ts` |
| G3 | `ort ÷ (2 × menzil)`, r=150 | **0,988** | aynı | `kapsama ≈ 2 × menzil` modelinin geçerliliği | `referenceBoards.test.ts` |
| G4 | Nokta başına kapsama | 259,8 ×5 · **421,8** · **420,0** · 229,9 | aynı | Yerleşim kararının anlamlılığı | `maps.test.ts` (maks > 1,5 × min) |
| G5 | Uçan hattını gören nokta oranı | **%87,5** (7/8) | `spotsCoveringFlyerPaths` | Harpi mekaniğinin yazı-tura olmaması (R4) | `maps.test.ts` (≥ %40) |
| G6 | Yol sapması (düşman ↔ yol ekseni) | **0,000 px** | tarayıcıda 8 düşman ölçüldü | Kapsama ölçümünün oyunla tutarlılığı | — (elle) |

### Menzil-kapsama eğrisi

| Menzil | Ortalama kapsama | `ort ÷ 2r` |
|---|---|---|
| 150 (T1) | 296,3 | 0,988 |
| 170 | 340,1 | 1,000 |
| 180 | 361,2 | 1,003 |
| 230 | 475,9 | 1,035 |
| 260 | 556,5 | 1,070 |

**Okunuşu:** menzil büyüdükçe oran 1'in üstüne çıkıyor — geniş menzilli kule
viraj noktalarından yolu daha çok kez görüyor. T3 hesaplarını
**iyimserleştiren** bir etki; mutlak tavanın 2131'den 2188'e çıkmasının sebebi.

---

## 2. Denge tavanları (M1, ölçülen kapsamayla)

`tavan = ΣDPS × kapsama ÷ hız` (`GAME-DESIGN.md` §6 Kısıt A)

| Düşman | Hız | Menzilde süre | ΣDPS | Tavan | Etkin HP | Oran |
|---|---|---|---|---|---|---|
| Goblin | 60 | 4,94 sn | ~150 | 741 | 45 | %6,1 |
| Ork Savaşçı | 45 | 6,59 sn | ~135 | 889 | 110 | %12,4 |
| Zırhlı Ork | 38 | 7,80 sn | ~95 | 741 | 160 | %21,6 |
| Kurt Binicisi | 110 | 2,69 sn | ~145 | 391 | 60 | %15,4 |
| Şaman | 42 | 7,06 sn | ~110 | 776 | 130 | %16,7 |
| **Trol** | 30 | 9,88 sn | ~120 | 1185 | 459 (yenilenme) | **%38,7** |
| Örümcek Ana | 50 | 5,93 sn | ~130 | 770 | 240 (yavrular) | %31,1 |
| **Ogre Şef** | 28 | 10,58 sn | 84 | **889** | 700 | **%78,7** |

**Bekçi:** `referenceBoards.test.ts` — hepsi için `tavan > HP × 1,15`,
boss için ayrıca `%75 ≤ oran ≤ %85`, Trol için `%25 < oran < %50` ve
"boss dışındaki en tank" sıralaması.

> **Sınır — ΣDPS değerleri `~` işaretli.** `research/01` §5'te elle
> hesaplanmış yaklaşık değerler; kule kule zırh/direnç uygulanarak
> türetilmediler. `M3-T07` bunları `towers.ts` + `enemies.ts` üzerinden
> **algoritmayla** üretecek (S25). O zamana kadar bu tablo *gösterge*,
> kesin değil.
>
> **Sınır — yalnız Harita 1 geometrisi.** Trol, Şaman, Zırhlı Ork ve
> Örümcek Ana harita 2-3'te sahneye çıkıyor (HP çarpanı 1,6 / 2,6, yapı
> noktası 10 / 12). Yukarısı alt sınır sağlaması. Gerçek kontrol M7 (R1b).

### Mutlak tavan — manşet bulgunun sağlaması

| Kule | Menzil | Ölçülen kapsama | Süre | Hasar |
|---|---|---|---|---|
| Havan ×3 | 230 | 476 px | 17,0 sn | 872 |
| Yıldırım ×3 | 170 | 340 px | 12,1 sn | 574 |
| Keskin Nişancı ×2 | 260 | 557 px | 19,9 sn | 382 |
| Meteor ×2 | — | — | — | 360 |
| **TOPLAM** | | | | **2188** |

Boss'un eski HP'si 2200. **2188 < 2200 — iddia ayakta, pay %0,5.**
İlk tahmin 2131 idi (`2 × menzil` varsayımıyla).

**Doğru ifade:** "matematiksel olarak imkânsız" değil, **"pratikte
imkânsız"**. Senaryo ekonomik olarak zaten erişilemez; %0,5 pay tek bir
menzil düzeltmesiyle kapanır. `referenceBoards.test.ts` payı bekçiye bağladı.

---

## 3. Zaman ve motor davranışı (M0 + M1)

| # | İddia | Ölçüm |
|---|---|---|
| Z1 | 2× gerçekten iki kat | 60 karede **120,024 px** vs **60,012 px** → oran **2,0000** |
| Z2 | 1× beklenen hıza eşit | 60 px/sn × 1 sn = 60 → ölçülen **60,012 px** |
| Z3 | 2× ekstra kare üretmiyor | 1× ve 2× kare sayıları özdeş (M0) |
| Z4 | Duraklatma `Game`'i durduruyor, `Hud`'u durdurmuyor | `Game` **0** kare, `Hud` **100** kare |
| Z5 | Duraklatmadan çıkış | `Game` **60** kare |
| Z6 | Hız oturum boyu kalıcı (S04) | sahne yeniden başlatıldığında 2× korunuyor |
| Z7 | `remainingDistance` sapması | 10 000 küçük adımda **< 1e-6** |
| Z8 | Doğum birikimi kaybı | saniye biriktirince 100 × 100 ms = `9.999999999999831` → **9 doğum**; ms'te tam **10** |

---

## 4. Havuz ve bellek (M1)

| # | İddia | Ölçüm |
|---|---|---|
| H1 | Havuz sızdırmıyor | aktif 25 → 18 → 12 → 6 → **0** → 0 → 0 |
| H2 | Havuz sessizce büyümüyor | kapasite **60** sabit; `acquire` üretim sayacı prealloc'ta çakılı |
| H3 | Havuz tükenme sayısı | **0** (45 sn oyun) |
| H4 | Dinleyici sızıntısı (`once` vs `on`) | `once`: 4 yeniden başlatmada sayı **13** sabit · `on`: 13→14→14→16→16 |

---

## 5. Paket boyutu (M0 + M1)

| # | Büyüklük | Değer | Sınır |
|---|---|---|---|
| P1 | js/html/css (gzip'li) | 0,31 MB | — |
| P2 | Varlıklar (sıkışmaz) | 0,07 MB | M6'da 1:1 büyür |
| P3 | **İlk indirme** | **0,38 MB** | Poki 8 MB (uyarı 5 MB) |
| P4 | Toplam | 0,38 MB | CrazyGames, SDK'sız |

---

## 6. Yayın yapısı temizliği (M1)

`npm run build` sonrası `dist/` içinde aranan ve **bulunmayan**:
`menzil:` · ` · L: ` · `monospace` · `__kn` · `devHooks` · `__game` ·
`poolExhausted` · `coverageAverage` → hepsi **0**.

**Bulunan ve doğru olan:** `coveredPx` ×1 (`MapDef.coverage` anahtarı —
üretim verisi, `GAME-DESIGN.md` §9), `#D4A032` ×2 (yapı noktası konturu ve
kale çerçevesi — üretim çizimi).

> Bu ayrım bir kabul kriterini düzeltti: `M1-T09` özgün kriteri
> `grep coveredPx dist/ → 0` bekliyordu ve **hata ayıklama göstergesiyle
> üretim verisini karıştırıyordu**. Kriter göstergenin kendi dizelerine
> çevrildi.

---

## 7. Yöntem notları — bir sonraki ölçümü yapan için

**Tarayıcı paneli görünmüyorsa Phaser döngüsü durur.** Sayfa kare üretmediği
için `requestAnimationFrame` koşmaz; sahne geçişleri işlenmez ve oyun
donmuş görünür. Çözüm: `window.__game.loop.step(t)` ile döngüyü elle sür
(`main.ts` içinde `import.meta.env.DEV` altında `__game` açık). Bu aynı
zamanda **daha iyi bir yöntem** — kare sayısı ve delta tam kontrol altında,
ölçüm tekrarlanabilir oluyor.

**Sentetik `PointerEvent` Phaser'ın girdi yöneticisine ulaşmıyor** (elle
sürülen döngüde). Buton denemek için nesnenin kendi olayını tetikle:
`btn.emit('pointerup')`. Gerçek tıklama M0'da ayrıca doğrulandı.

**Sentetik `KeyboardEvent`'te `code` alanı şart.** Phaser `code`/`keyCode`
üzerinden eşleştiriyor; boş `code` ile `keydown-ESC` sessizce düşüyor.

**Havuzdan rastgele bir nesne seçip iki kez ölçme.** `activeItems()[0]`
iki ölçüm arasında farklı düşman olabilir; tek bir nesneyi takip et.

**Geçici test dizini açma.** Vite dosya izleyicisi tutunca dizin
silinemiyor ve Windows'ta `EPERM` veren bir hayalet kalıyor — bekçinin
tarayıcısını çökertmişti. Ölçüm gerekiyorsa **kalıcı bir test dosyası**
yaz; ölçüm zaten regresyon bekçisi olmayı hak ediyor.

---

## 8. Kule ve mermi (M2)

| # | İddia | Ölçüm |
|---|---|---|
| K1 | 8 kule + 26 düşmanla kare maliyeti | ort **4,38 ms** · p95 **5,80** · maks **8,70** (bütçe 16,67) |
| K2 | Savunma hattı tutuyor | hiçbir düşman kaleye **208 px**'ten fazla yaklaşmadı; 100+ sn boyunca can 20/20 |
| K3 | Mermi havuzu tepe kullanımı | **5** / 200 ayrılan — M3 dalga tepesinde yeniden ölçülmeli |
| K4 | Okçu T1 atış hızı | 10 sn'de **11** atış (`fireRate` 1,1) |
| K5 | Top T1 atış hızı | 10 sn'de **5-6** atış (`fireRate` 0,5) |
| K6 | 2× hızda atış | tam iki katı |
| K7 | Hasar sayısı `BitmapText` mi | `BitmapText` **60**, `Text` **9** (yalnız dev göstergesi) |
| K8 | İki renk (§3) | normal `#E4D3A8` %100 · tabana düşen `#9AA0A6` %80 |
| K9 | Hover tek `Graphics` | Graphics sayısı **2**, 100 kare boyunca sabit |
| K10 | Havuz tükenmesi | **0** (düşman, mermi, hasar sayısı) |

**Mermi süpürülmüş isabet kontrolü** dört kare boyutunda aynı sonucu
veriyor: 144 FPS, 60 FPS, 30 FPS ve 30 FPS × 2. Nokta-mesafe kontrolü son
senaryoda ıskalardı — 66 ms karede mermi 40 px atlıyor, isabet yarıçapı
12 px.

**Patlama merkezi hedefin konumu**, merminin değil. Süpürülmüş kontrol
çarpmayı hedefe `hitRadius` kala yakalıyor; patlama merminin konumundan
çözülseydi yarıçap 12 px geriye kayar ve tam sınırdaki düşman sistematik
olarak ıskalanırdı (45 px yarıçapta 45 px uzaktaki düşman vurulmuyordu —
sınır testi yakaladı).

---

## 9. Ekonomi ve dalga (M3)

| # | Büyüklük | Değer | Neye asılı |
|---|---|---|---|
| E1 | Harita 1 toplam geliri (10 dalga, erken bonus yok) | **1614** | §6 "~1850" diyor — %13 düşük, sebep eksik kadro (S34) |
| E2 | 8 yapı noktasının dolduğu dalga (karışık tahta) | **6** | §6 "4-5" diyor (S34) |
| E3 | 8 yapı noktasının dolduğu dalga (en ucuz tahta) | **5** | aynı |
| E4 | `SPAWN_K` (doğum penceresi) | **24 sn** | ölçülerek seçildi, S28 |
| E5 | Referans tahta ile sızan düşman | **1** / 10 dalga | kalan can 19/20 = ★★ |
| E6 | Yalnız T1 ile sızan düşman | **30** | oyun kaybediliyor → yükseltme M3'e alındı (S35) |

### `SPAWN_K` taraması

| `SPAWN_K` | doğum penceresi | sızan dalga | toplam sızan HP |
|---|---|---|---|
| 8 | 7,2 sn | 6 | 364 |
| 12 | 10,8 sn | 5 | 315 |
| 15 | 13,5 sn | 5 | 158 |
| 18 | 16,2 sn | 3 | 118 |
| 20 | 18,0 sn | 4 | 74 |
| **24** | **21,6 sn** | **1** | **14** |

**Bulgu:** `SPAWN_K` bir "aralık katsayısı" değil, **dalganın doğum
penceresi** — `(n−1)×K/n ≈ K`, dalga boyundan bağımsız.

### Kısıt A (dalga 10 tahtası, ölçülen kapsamayla)

| Düşman | Tavan | Etkin HP | Oran |
|---|---|---|---|
| Goblin | 551 | 45 | %8,2 |
| Ork Savaşçı | 636 | 110 | %17,3 |
| Kurt Binicisi | 280 | 60 | %21,4 |

Yerleşimden bağımsızlık ayrı testle kanıtlandı (ters sırada aynı sonuç,
9 ondalık).

### Canlı oyun (Phaser döngüsü elle sürülerek)

| # | İddia | Ölçüm |
|---|---|---|
| C1 | 10 dalga bitiriliyor | **evet**, 19/20 can, ★★ |
| C2 | Simülasyon ↔ canlı oyun uyumu | ikisi de **1 sızıntı, 19 can** |
| C3 | Dalga 10 kare maliyeti | ort **1,93 ms** · p95 **2,80** · maks **3,50** |
| C4 | Dalga 10 tepe düşman | **10** |
| C5 | Mermi havuzu tepe | **5** / 200 |
| C6 | Havuz tükenmesi | **0** |
| C7 | Telegraf dalga başlayınca | **gizleniyor** |
| C8 | Menüden yeni oyun | 280 altın, 20 can, 0 kule — temiz |

**C2 en değerli ölçüm:** başsız simülasyon ile gerçek Phaser döngüsü
bağımsız yollardan aynı sayıya çıktı. Kısıt B'nin oyunu temsil ettiğinin
kanıtı bu.

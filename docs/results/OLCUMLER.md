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

## 10. Tam set (M4)

### Karşı-oyun senaryoları — 8 nokta tek aile T2, `simulateWave`

| Tehdit | Okçu | Top | Büyü |
|---|---|---|---|
| Goblin ×20 | 27,4 sn | **18,9 sn** | 22,7 sn |
| Zırhlı Ork ×8 | **7 sızıntı / 984 HP** | 18,5 sn | 33,2 sn |
| Şaman ×6 | 29,5 sn | **12,8 sn** | 34,8 sn |
| Harpi ×10 | 20,8 sn | **10 sızıntı / 700 HP** | 14,7 sn |
| Trol ×4 | **3 sızıntı / 738 HP** | 28,4 sn | 46,2 sn |
| Kurt Binicisi ×10 | 18,3 sn | **12,9 sn** | 14,5 sn |
| Ogre Şef ×1 | **1 sızıntı / 499 HP** | 29,9 sn | 27,3 sn |

Yerleşim üç ölçümde de aynı (kapsamaya göre sıralı 8 nokta), tek değişken
aile. **Neye bağlı:** `towers.ts`, `enemies.ts`, `combat.applyDamage`,
`MAP_1.coverage`. **Koruyan:** `waveSim.test.ts`, `balanceChecks.test.ts`.

### Etkin DPS — 12 kademe × 10 düşman

Tam matris `M4-SONUC.md` §3. Karar besleyen uç değerler:

| Ölçüm | Değer | Neden önemli |
|---|---|---|
| Top (T1/T2/Havan) → harpi | **0,00** | Karşı-oyun tablosunun en keskin satırı |
| Barut Fıçısı → harpi | 9,00 | T3 dallanmasını gerçek seçime çeviren sayı |
| Okçu T1 → trol | **2,20** | Trol yenilenmesinin (6 HP/sn) **altında** — tek kule Trol'ü hiç öldüremiyor |
| Okçu T2 → trol | 7,80 | Net 1,80 |
| Okçu T1/T2 → boss | 0,99 / 1,95 | Hasar tabanına (%15) dayanmış; ekranda gri sayı |
| Büyü T2 → boss | 13,50 | Bilgi paneliyle **birebir** doğrulandı |
| Büyü T2 → şaman | 10,80 | Büyü'nün en zayıf olduğu düşman (%40 büyü direnci) |
| Havan → şaman | 21,60 | Ham DPS'te en yüksek — ama `first` onu seçemiyor (konum sorunu) |

### Uçan hattını kesen yapı noktaları

| Menzil | Kesen | Not |
|---|---|---|
| 150 | **7 / 8** | nokta 1 kör |
| 170 | 7 / 8 | nokta 1 kör |
| 190 | **8 / 8** | 1:99 px ile katılıyor |
| 230 / 260 | 8 / 8 | tepe 6:459 / 6:519 |

Hedef ≥3'tü (R4). **2,3-2,7 katı.** Harita 2-3'te yeniden ölçülecek.

### Kısıt A — dalga 10 tahtası (muhafazakâr)

| Düşman | Tavan | Etkin HP | Oran |
|---|---|---|---|
| Goblin | 571 | 45 | %7,9 |
| Ork Savaşçı | 710 | 110 | %15,5 |
| Kurt Binicisi | 301 | 60 | %19,9 |
| Harpi | 252 | 70 | %27,7 |
| Zırhlı Ork | 680 | 160 | %23,5 |
| Şaman | 689 | 130 | %18,9 |
| Trol | 988 | 400 | %40,5 |
| Örümcek Ana | 632 | 150 | %23,7 |
| Örümcek Yavrusu | 381 | 30 | %7,9 |
| **Ogre Şef** | **761** | **700** | **%92,0** ✗ |

### Boss payı — iki tahta (S65)

| Tahta | Nokta dolma | Tavan | Boss oranı |
|---|---|---|---|
| Muhafazakâr | dalga 7 | 761 | **%92,0** |
| Gerçekçi (erken başlatma) | dalga 6 | 818 | **%85,6** |

Tasarım bandı %75-85. **Neye bağlı:** `towers.ts` maliyetleri (Büyü T1 = 100),
`waves.ts` bütçesi, `MAP_1.coverage`, `OGRE_SEF.hp`. **Koruyan:**
`balanceChecks.test.ts` Kısıt A. **Karar:** sayı değiştirilmedi, M7'de üç
bağlı büyüklük birlikte bakılacak (`research/01` §12 türetme yönü).

### Kümülatif altın (dalga 10 sonu)

| Tahta | Altın |
|---|---|
| Muhafazakâr | 1602 |
| Gerçekçi (erken başlatma) | 2122 |

Fark **520 altın (%32)** — erken başlatma bonusunun geç oyundaki ağırlığı.

### Canlı oyun (Phaser döngüsü elle sürülerek)

| # | İddia | Ölçüm |
|---|---|---|
| L1 | 10 dalga bitiriliyor | **evet**, 19/20 can, ★★ |
| L2 | Bilgi paneli ↔ matris uyumu | Okçu T2→boss **1,95**, Büyü T2→boss **13,50** — birebir |
| L3 | Buz yavaşlatma çarpanı | tam **0,50** |
| L4 | Harpi uçan hattı sapması | **0,31 px** |
| L5 | Boss refakatsiz süre | **10,2 sn** |
| L6 | Boss kalan HP | 700 → **18** (öldü) |
| L7 | Uçan hattı ipucu | dalga 6/8/9/10 açık · 5/7 kapalı |
| L8 | Dalga 10 kare maliyeti | ort **0,946 ms** · p95 **1,3** · maks **1,7** |

**L8, M3'ün 1,93 ms'inin altında.** Efekt sistemi (yanma/yavaşlatma/zincir),
düşman yetenekleri ve bilgi paneli kare maliyetini **artırmadı** — dalga 10'da
aynı anda 11 birim var ve boss tek başına geliyor.

### Paket ve test (M4 sonu)

| Ölçüm | Değer |
|---|---|
| Test | **430** / 23 dosya · 1,56 sn |
| İlk indirme | **0,39 MB** (sınır 8 MB) |
| Bekçi | **9/9** ✓ (+1 taranamayan yol raporu) |

## 11. Kışla, asker, yetenek (M5)

### S66 — düşmanın askere verdiği hasar (**türetildi**)

Dokümanda **hiç yok**. §4.4 kural 3 "düşman yalnızca `blockedBy` askerine
hasar verir" diyor, sayıyı vermiyor; §5 tablosunda saldırı gücü sütunu yok.

    K = 45 HP / 8 sn / 1 puan = 5,625 DPS / puan

| Düşman | Puan | Askere DPS | T1 (45 HP) | T2 (75) | Paladin (140) |
|---|---|---|---|---|---|
| Goblin | 1 | 5,63 | 8,00 sn | 13,3 | 24,9 |
| Ork Savaşçı | 2 | 11,25 | 4,00 | 6,67 | 12,4 |
| Kurt Binicisi | 3 | 16,88 | 2,67 | 4,44 | 8,30 |
| Zırhlı Ork | 4 | 22,50 | 2,00 | 3,33 | 6,22 |
| Şaman | 5 | 28,13 | 1,60 | 2,67 | 4,98 |
| Örümcek Ana | 6 | 33,75 | 1,33 | 2,22 | 4,15 |
| **Trol** | 8 | **45,00** | **1,00** | **1,67** | **3,11** |
| Ogre Şef | 25 | (140,6) | kural 9: **anlık** | anlık | anlık |

**Dayanak:** §4.4 T1 satırı (45 HP, 8 sn) + §5'in puan ölçeği
(`altın = 3 × puan`). **Neye asılı:** `barracks.ts` T1 satırı değişirse K
değişir. **Koruyan:** `data/barracks.test.ts` — "T1 askeri Goblin karşısında
tam bir diriliş döngüsü dayanıyor".

### Kışlalı / kışlasız Trol (zorunlu ölçüm)

Taban: **kışlasız Trol kule menzilinde 15,32 sn** (Okçu T2, Harita 1,
kapsaması en yüksek nokta).

| Kışla | ×1 | ×2 | ×3 |
|---|---|---|---|
| T1 | +%13 | +%26 | +%39 |
| T2 | +%22 | +%43 | +%238 |
| Paladin | +%41 | ölüyor | ölüyor |
| **Haydutlar** | **+%68** | ölüyor | ölüyor |

Planın "%50" ölçütünü tutturan **en küçük yapılandırma: tek Haydutlar
kışlası**. **Koruyan:** `BarracksScenario.test.ts`.

**Ölçüt notu:** "menzilde geçen süre" tek başına yanıltıcı — Trol ölürse süre
kısalıyor. Birleşik ölçüt: `öldü VEYA süre ≥ %50 uzun`.

### Sinerji — kural 3'ten türüyor

| Asker | Verilen hasar başına alınan hasar |
|---|---|
| 2 | taban |
| 4 | **taban × 0,50** |

Verilen `N × dpsEtkin`, alınan `1 × meleeDps`. N ikiye katlanınca oran yarıya
iniyor. **Özel kod yok.**

### S69 — kışlanın yeri (canlı, aynı tahta)

| Tahta | Can | Dalga 10 kare ort |
|---|---|---|
| 8 kule, kışlasız | **20/20 ★★★** | 3,69 ms |
| 7 kule + kışla **en yüksek** kapsamada (422 px) | **0/20 kayıp** | 3,84 ms |
| 7 kule + kışla **en düşük** kapsamada (230 px) | **19/20 ★★** | 3,95 ms |

Kışla kapsamayı kullanmıyor ama noktayı işgal ediyor. **M7 harita kuralı:**
her haritada kışlaya uygun düşük kapsamalı nokta olmalı.

### Harita 1 yapı noktalarının yola uzaklığı

| Nokta | Yola px | Kapsama px |
|---|---|---|
| 0 | 75,0 | 259,8 |
| 1 | 75,0 | 259,8 |
| 2 | 75,0 | 259,8 |
| 3 | 90,0 | 421,8 |
| 4 | 75,0 | 259,8 |
| 5 | 90,0 | 420,0 |
| 6 | 75,0 | 259,8 |
| 7 | 75,0 | 229,9 |

**Hepsi `pathSnapMax = 40`'ın dışında.** Bu yüzden varsayılan toplanma
noktası kışlanın üstü **olamıyor** — `defaultRally()` yola en yakın noktayı
veriyor. Kışlanın üstü kullanılsaydı askerler yol kenarında durur, aggro
(60 px) yola yetişmez ve kışla hiçbir şey yapmazdı. **Koruyan:**
`BarracksSystem.test.ts` — "Harita 1'in HER yapı noktası geçerli bir
toplanma noktası üretiyor".

### Canlı engelleme sağlamaları

| # | İddia | Ölçüm |
|---|---|---|
| K3 | İki asker dövüşüyor, **biri** hasar alıyor | HP **38 vs 45** |
| K5 | Aynı anda engellenen tepe | **3** (asker sayısı kadar) |
| K8 | Uçan engelleniyor mu | **475 örnek, 0 ihlal** |
| K9 | Boss askeri tek karede öldürüyor | **75 / 60 / 60 HP → 0** |

### Yetenekler (§8)

| Ölçüm | Değer |
|---|---|
| Meteor — Ogre Şef'e (zırh 10, direnç %25) | tam **180** (gerçek hasar) |
| Meteor yarıçapı / bekleme | 90 px / 45 sn |
| Takviye — asker sayısı / HP / DPS / ömür | 2 / 60 / 7 / 20 sn |
| Takviye askeri engelliyor mu (S47) | **evet**, anında `fighting` |
| Geçici asker havuza dönüşü | **4 → 2**, `destroy` yok |
| Bekleme 2× hızda | **yarı sürede** doluyor |

### Havuz (M5 sonu)

| Havuz | Ön ayırma | Tepe kullanım | Taşma |
|---|---|---|---|
| Asker | **24** | 4 | **0** |
| Mermi | 200 | 4 | 0 |

Asker 24'ün dayanağı: 8 nokta × 3 asker (Haydutlar) = 24, yani tüm noktalar
Haydutlar kışlası olsa bile karşılanıyor. Takviye'nin 2 geçici askeri bunun
**üstüne** geliyor ve havuz doluysa sessizce kısılıyor.

### Test ve paket (M5 sonu)

| Ölçüm | Değer |
|---|---|
| Test | **531** / 27 dosya · 1,81 sn (M4: 430 / 23) |
| İlk indirme | **0,39 MB** (değişmedi) |
| Bekçi | **9/9** ✓ |

## 12. Juice ve ayarlar (M6 — kısmi)

### Ekran sarsıntısı (§10)

| Ölçüm | Değer |
|---|---|
| Süre aralığı | 0,12-0,25 sn (şiddete göre) |
| Sönüm | üstel, k=5 → sonda genlik başlangıcın %0,7'si |
| Salınım | 34 Hz |
| Canlı genlik dizisi (yatay darbe) | 3,05 → 2,80 → 2,10 → 1,31 → 0,64 |
| Dik eksende kayma | **0** (yönlü) |
| Kapalıyken | **{0, 0}**, `active = false` |

### Hit-stop (§10)

| Ölçüm | Değer |
|---|---|
| 1× hızda | **80 ms** |
| **2× hızda** | **0 ms** — devre dışı |
| Üst sınır | 80 ms (`trigger(500)` → 80) |
| Üst üste vuruş | uzatmıyor, en uzunu kazanıyor |

### Parçacıklar (§10)

| Ölçüm | Değer |
|---|---|
| `maxParticles` | **300** |
| Canlı tepe (10 dalga) | **34** |
| Efekt kapalıyken tepe | **0** |
| Efekt ölçeği tam/düşük/kapalı | 1 / **0,4** / 0 |

**Ayrı havuz yok** — Phaser'ın parçacık sistemi zaten havuzlu
(`research/02` §7).

### Ayarlar ve kalıcılık

| İddia | Ölçüm |
|---|---|
| Sayfa yenilendikten sonra korunuyor | ✅ `effects: low`, `screenShake: false` |
| Başlangıçta uygulanıyor | ✅ `shake.enabled = false` |
| M7 SaveSystem alanını ezmiyor | ✅ `unlockedMaps: 3` korundu |
| Gizli sekmede çökmüyor | ✅ bellek yedeği |
| Yazma hatası bildirimi | **1 kez** (3 yazma denemesinde) |

### Paket ve test (M6 kod kısmı sonu)

| Ölçüm | Değer |
|---|---|
| Test | **569** / 29 dosya (M5: 531 / 27) |
| İlk indirme | **0,39 MB** (hedef ≤ 5 MB) |
| `.ogg` dosyası | **0** |
| Bekçi | **10/10** ✓ (k.8 izin listesine çevrildi, mim. k.10 eklendi) |
| Test (kapanış turu sonu) | **580** / 31 dosya |

**Not:** sanat ve ses varlıkları henüz yok; nihai paket boyutu `P01`-`P04`
ve `T11` girdileriyle yeniden ölçülecek.

### Sahne yeniden başlatma sızıntısı (M6, kapanış turu)

Aynı hata sınıfının **dördüncü** görünümü: `#gecici` (Takviye askerleri).

| Ölçüm | Düzeltmeden önce | Sonra |
|---|---|---|
| Yeniden başlatma sonrası `soldiers()` | **2** | **0** |
| Aynı anda `soldierActive()` (yeni havuz) | **0** | **0** |
| Üç kez üst üste yeniden başlatma | birikiyor | **0** |

İkisinin uyuşmaması hatanın imzası: gösterilen askerler **yok edilmiş
sahnenin** nesneleri, yeni havuz onları tanımıyor ve `release` yok sayıyor.

**Bekçi kural 10 eklendi**, beş tarihsel hataya karşı negatif doğrulandı
(`#gecici`, `#towerBySpot`, `#barracksBySpot`, `#paused`, `#speed`).
Kuralın kendisi **üç kez yanlış yazıldı** ve üçünde de yeşil dönüyordu;
kasıtlı bozma sınaması olmasa fark edilmezdi.

### Dalga sonu altın sayacı (§10)

| Ölçüm | Değer |
|---|---|
| Gerçek altın (kule satışı) | anında **259** |
| Ekranda okunanlar | 219 → 227 → 233 → 238 → 242 → … → **259** |
| Sayma süresi | ~**20 kare** (0,33 sn) |
| Harcama yönü | **anında** (geriye saymıyor) |

Formül: `kalan fark × 0,18`, en az `1`, kare başına.

### Kare maliyeti — tüm juice açık (dalga 10)

| Ölçüm | Değer |
|---|---|
| Ortalama | **1,91 ms** |
| p95 | **2,7 ms** |
| Maksimum | **7,6 ms** |
| Örnek | 2802 kare |
| Sonuç | 10 dalga, **20/20 can ★★★** |

60 FPS bütçesi 16,7 ms. Juice katmanı (sarsıntı, hit-stop, parçacık, vinyet,
squash, toz, sayaç) ölçülebilir bir maliyet getirmedi.

### M7 öncesi kapatılan iki borç

**1. `ReferenceBoard.targetMode`** (M4'ten). Simülasyon her kuleyi `first`
yapıyordu; §4.5'in beş modu Kısıt B'de hiç ölçülemiyordu.

| Tahta | `first` | `last` | `closest` |
|---|---|---|---|
| **1 kule**, Ork ×8 | sızan 7 / 730 HP | 7 / 730 | 7 / 730 |
| **4 kule**, Ork ×8 | 5 / **358** HP, öldü 3 | 5 / **374** HP | **4** / 360, öldü **4** |

Tek kulede beş modun da aynı çıkması **kontrol grubu**: menzilde tek düşman
varken her mod aynı hedefi seçer, yani 4 kuledeki fark gürültü değil.
M4-SONUC §1'de "ölçülemedi" denen Şaman senaryosu artık ölçülüyor.

**2. `ReferenceBoard.barracks`** (M5'ten). `simulateWave` kışlayı bilmiyordu;
Kısıt B kışlalı tahtayı modelleyemiyordu — oysa S69 kışlanın **yerinin**
sonucu 20/20'den 0/20'ye çevirdiğini ölçmüştü.

| Sağlama | Sonuç |
|---|---|
| Kışla sızıntıyı azaltıyor | ✅ |
| Asker öldürmesi `killedCount`a giriyor | ✅ `killed + leaked = 10` |
| Haydutlar ≥ T1 | ✅ |
| **Uçanlar etkilenmiyor** (kural 8 simülasyonda da) | ✅ sızıntı **birebir aynı** |
| S69 yer etkisi simülasyonda da görünüyor | ✅ |
| "10 dalga < 2 sn" şartı korunuyor | ✅ |

Dokuz engelleme kuralı **canlı oyunla aynı koddan** geliyor
(`BarracksSystem.stepSoldiers` zaten Phaser'sız) — simülasyona kopyalanan
mantık yok, yalnız kablolama.

# M8 — Genişleme: içerik, cila, hata avı (yayın öncesi)

**Karar (sahip, 2026-09-14):** ROADMAP'in "v1 sonrası yönü veriden oku"
felsefesi bu taşla **askıya alındı** — yayından önce oyun büyütülecek.
Bu dosya 15 fazı sırayla tanımlar; her faz kendi başına oynanabilir bir
oyun bırakır (`CLAUDE.md` TIER 2), her biri ayrı commit(ler)le kapanır.

**Çalışma tarzı:** faz faz, soru sorulmadan; ürün kararlarında makul
varsayılan seçilip gerekçesi bu dosyaya/`OPEN-QUESTIONS.md`'ye yazılır.
Kapsam dışı (ROADMAP §12 uyarıları): meta yükseltme ağacı, kahraman,
sıralama, harita editörü, çoklu oyuncu.

---

## 0. Oturum başlangıcı

Sırayla oku, başka dosya açma: `CLAUDE.md` → bu dosya → ilgili fazın
"Doküman" satırındaki bölümler → `docs/plan/iyilestirme/T3-oyuncu-geri-bildirimi.md`
(oyuncunun gözüyle neyin bozuk göründüğü).

Canlı doğrulama: Browser pane'de `requestAnimationFrame` çalışmıyor;
her yüklemeden sonra `raf.start(raf.callback, true, 16)`. Her fazın
sonunda ekran görüntüsüne **oyuncu gözüyle** bak (hafıza notu).

## 1. Amaç ve bitiş durumu

Oyun 3 → **5 harita**, her harita bitince **sonsuz mod**, **başarımlar**,
duraklatma menüsü ve oyun sonu istatistikleri, satın almadan önce kule
bilgisi, üç zorluk, mobil cila, kule/mermi/düşman animasyon katmanı,
ses seviyesi ayarları, daha dolu menü ve seviye seçim. Paket boyutu ölçülüp
küçültülmeye çalışılmış; itch.io paketi hazır.

**Olmayan:** yeni düşman/kule ailesi (sanat gerektirir), yeni yetenek,
sunucu isteyen her şey. Yeni harita arka planları **geçici** (mevcut
sanattan türetilmiş); gerçek görsel için brif yazılır.

---

## 2. Fazlar

### Faz 1 — Hata avı ve temiz tur — `M8-T01`

| | |
|---|---|
| **Kimlik** | `M8-T01` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk kod + canlı tur |
| **Önkoşul** | — |
| **TIER 1** | k.3, k.7 |
| **Doküman** | `T3-oyuncu-geri-bildirimi.md` "Ertelenen yan gözlemler" · `HudScene.ts` kart yerleşimi · `BuildMenu.#menuArkalikEkleVeKonumla` |

**Dosyalar**
- `src/fx/BuildMenu.ts` — değişiklik — menü HUD kartıyla çakışırsa sağa kaydır
- `src/scenes/HudScene.ts` — değişiklik — dalga telgrafı kartın içine (kart genişler)
- `scripts/smoke-play.mjs` — yeni — dev kancalarıyla üç haritayı baştan sona oynatan tarayıcı betiği (Browser pane JS'i olarak da kullanılabilir), sonuç: harita, can, yıldız, konsol hatası sayısı

**Yapılacak**
- Üç haritayı referans tahtaya yakın bir dizilimle 2×'te sonuna kadar oynat; her sonucu (can/yıldız/konsol) not et; çıkan her hatayı düzelt.
- Menü, HUD kartı dikdörtgeniyle (`0..224 × 0..140`) kesişiyorsa panelin sol kenarını `224 + 16`'ya kaydır.
- HUD kartını 216 → 260 genişlet, telgrafı kartın içinde tut.

**Kabul kriteri** — `npm run test` yeşil; canlı: üç harita "Kale ayakta" ile bitiyor, konsol sessiz; harita 1 nokta 1 menüsü kartla kesişmiyor (ekran görüntüsü).

**Bitmedi sayılır eğer:** bir harita canlı turda bitirilemiyorsa ve sebebi yazılmadıysa.

### Faz 2 — Satın almadan önce kule bilgisi — `M8-T02`

| | |
|---|---|
| **Kimlik** | `M8-T02` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T01` |
| **TIER 1** | k.7, k.6 |
| **Doküman** | `GAME-DESIGN.md` §4 (aile rolleri), §11 · `fx/BuildMenu.ts` `openMenu` |

**Dosyalar**
- `src/data/strings.ts` — değişiklik — 4 aile için rol cümlesi (`roleOkcu`…), `buildInfoHint`
- `src/fx/BuildMenu.ts` — değişiklik — yapı menüsünde imleç bir aile butonunun üstündeyken altta tek satır rol şeridi (`Text`, görünürlükle seçiliyor, `setText` yok); dokunmatikte "?" butonu dört satırlık açıklamayı açıp kapatıyor
- `src/fx/WaveTelegraph.ts` — değişiklik — düşman ikonuna gelince ad + zırh/direnç/uçan (görünürlükle)

**Kabul kriteri** — `npm run guard` (k.4/k.12/k.13) yeşil; canlı: Büyü butonuna gelince "Zırh delen, uçana vurur, tek hedef" şeridi görünüyor; "?" dört satırı açıyor.

**Bitmedi sayılır eğer:** dokunmatikte (hover yok) bilgiye ulaşmanın yolu yoksa.

### Faz 3 — Duraklatma menüsü + oyun sonu istatistikleri — `M8-T03`

| | |
|---|---|
| **Kimlik** | `M8-T03` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T01` |
| **TIER 1** | k.7, k.8 |
| **Doküman** | `GAME-DESIGN.md` §1 Kontroller, §9 Yıldız · `HudScene.#createPauseOverlay` · `GameOverScene.ts` |

**Dosyalar**
- `src/scenes/HudScene.ts` — değişiklik — perde: Devam / Yeniden başla / Ana menü / Ayarlar (parşömen butonlar)
- `src/systems/RunStats.ts` — yeni — öldürülen, kazanılan altın, harcanan altın, süre (duvar saati), tepe dalga; `bus` dinleyerek, Phaser'sız, testli
- `src/scenes/GameOverScene.ts` — değişiklik — istatistik satırları (`BitmapText`) + yıldız eşiği açıklaması (statik `Text`)
- `src/data/strings.ts` — değişiklik

**Kabul kriteri** — `npm run test -- RunStats` ≥ 5 test; canlı: ESC → dört buton; kaybet/kazan → istatistikler doğru (dev kancasıyla karşılaştır).

**Bitmedi sayılır eğer:** "Yeniden başla" `GameOverScene.#haritayaGec` ile aynı stop/start sırasını kullanmıyorsa (bayat perde hatası).

### Faz 4 — Harita 4 "Kar Geçidi" — `M8-T04`, `M8-P01`

| | |
|---|---|
| **Kimlik** | `M8-T04` |
| **Durum** | ☑ **bitti** (2026-09-14) |
| **Süre** | ~45 dk kod + ölçüm turu |
| **Önkoşul** | `M8-T01` |
| **TIER 1** | k.1, k.4 |
| **Açık soru** | S77 (HP/altın çarpanı ilerlemesi), S78 (boss zırhı harita 4-5) |
| **Doküman** | `GAME-DESIGN.md` §9 (kapsama bandı **kol başına 285-311 px**, yıldız, boss ölçekleme), §5 kadro, §7 dalga · `maps.ts` MAP_2 türetme notu (S57) · `bossScaling.ts` · `waves.ts` MAP3 deseni |

**Tasarım (varsayılan, gerekçesiyle):** tek giriş, **S kıvrımı (3 keskin viraj)**, 10 nokta — harita 1'in geometrisini zorlaştıran ama iki giriş/Y karmaşıklığı olmayan bir ara adım; kadro 9 düşmanın tamamı (boss dahil), yeni tanıtım yok (tüm mekanikler harita 3'te tanıtıldı) → zorluk kaynağı yalnız çarpanlar ve kıvrım. Çarpanlar S73 yöntemiyle **ölçülür**: `hpMultiplier` monoton (>2,6; başlangıç 3,4), `goldMultiplier` tam-yükseltme doyum taramasıyla. Boss HP `deriveBossHp`, zırh S78.

**Dosyalar**
- `src/data/maps.ts` — değişiklik — `MAP_4` (koordinatlar kapsama hedefinden geriye, MAP_2 yöntemi), `MAPS`'e ekle
- `src/data/waves.ts` — değişiklik — `MAP4_WAVES` (bütçe ±%10, nefes 4/7, boss 10)
- `src/data/bossScaling.ts` — değişiklik — `BOSS_HP_BY_MAP`/`BOSS_ARMOR_BY_MAP` harita 4
- `src/data/strings.ts` — değişiklik — `mapKarGecidi` (tr/en)
- `assets-src/bg/kar-gecidi.png` + `public/assets/lazy/kar-gecidi.webp` — **geçici**: `degirmen-gecidi.png`'den `sharp` ile soğuk tonlama (`modulate`/`tint`), `// GEÇİCİ — M8-P01`
- `scripts/prep-assets.mjs` — değişiklik — yeni arka plan ve kart küçük resmi
- `src/scenes/PreloadScene.ts` — değişiklik — `queueLazy` harita 4
- `src/data/maps.test.ts`, `waves.test.ts`, `bossScaling.test.ts` — değişiklik — tabloya harita 4
- `docs/plan/M8-sanat-brifi.md` — yeni — `M8-P01` Kar Geçidi arka plan brifi (P01 biçimi)

**Kabul kriteri** — `npm run test` yeşil (kapsama bandı, Kısıt A kol başına, boss bandı ±%6, dalga bütçesi); `npm run build` → `KURALLAR.md` diff'i **harita 4 satırlarını içeriyor ve başka satır değişmiyor**; `waveSim` referans tahtayla 10 dalga ≤ 20 can kaybı; canlı: harita 3 bitince harita 4 açılıyor, oynanıyor.

**Bitmedi sayılır eğer:** `hpMultiplier`/`goldMultiplier`/zırh **ölçülmeden** yazıldıysa.

#### Sonuç — `M8-T04`

**Harita.** Tek giriş, S kıvrımı, iki keskin viraj:
`(-60,140) → (480,140) → (480,430) → (1000,430) → (1000,660)`, `L` = **1580 px**.
12 yapı noktası. Uçan hat 11/12 noktayı kesiyor (%92 ≥ %40 şartı).

**Kapsama 290,1 px** (bant 285-311). Üç turda ölçüldü: 291,4 (10 nokta) →
286,1 (12 nokta) → 290,1, son adımda kale tarafındaki nokta `(1075,580)`'den
`(1075,500)`'e taşındı (o konumda yalnız 210 px görüyordu).

**Çarpanlar iki turda belirlendi — ve ilk tur YANLIŞTI.**

1. Monotonluk `hpMultiplier` 3,4 · `goldMultiplier` 4,0 diyordu (doyum
   taraması: tahta maliyeti 3,8'den itibaren 5100'de sabit; 4,0
   `startGold`'u harita 3'ün 1064'ünün üstüne çıkaran en küçük adım).
2. `simulateAllWaves` bu değerlerle **0 can kaybı** verdi — harita 2 (6) ve
   harita 3'ten (10) **kolay**. Sebep geometri: tek yolda 12 noktanın
   **hepsi** aynı yolu görüyor, harita 2-3'te savunma iki kola bölünüyordu.
   **Monoton çarpan, monoton zorluk demek değil.**
3. `hpMultiplier` taraması (3,4 → 5,6): can kaybı 0 · 6 · 11 · **13** · 17 · 21.
   Seçilen **4,4/4,4** — harita 3'ün 10'unun üstünde, 20 sınırının %35 altında.
   `startGold` 1232.

Bu ders teste bağlandı: `kisitB.test.ts` artık **ölçülen can kaybının**
haritalar boyunca monoton arttığını doğruluyor (girdi çarpanının değil).

**Boss.** Zırh taraması (0-5) tavanı yalnız %12 oynattı (2441 → 2141) —
zırh burada bağlayıcı kısıt değil, harita 3'le aynı **2** bırakıldı.
Türetilen HP **1857** (0,80 × 2321,2). Tavan tahta DPS'ine bağlı olduğu için
`hpMultiplier` değişikliğinden **etkilenmedi**.

**Dalga bütçeleri** ±%4 içinde (dalga 7 ilk turda −%12'ydi, orkSavasci
5→6 ile −%4'e çekildi). Sızıntı 10 / can 13 / boss 0.

**Yan bulgular — ikisi de canlı ekran görüntüsünden çıktı, ölçümden değil:**

- **Seviye seçim tek satırda taşıyordu.** 4 kart = 1272 px, 1280'lik
  sahnede yanlarda 4'er piksel. Izgaraya geçildi (satır başına 3);
  harita 5 eklenince bu dosyaya dokunulmayacak.
- **Yıldızlar parlak küçük resimde okunmuyordu.** Önce mürekkep bant
  denendi — o da **kazanılmış** yıldızı bozdu, çünkü atlas karesinin içi
  mürekkep dolgu (ölçüldü: `#14213B`); dolu yıldız banda karışıp boşa
  benzedi. Parşömen bant ikisini birden çözdü.
- **`kurallar.mjs` harita 4'ü sessizce boş bastı** — elle tutulan
  id→dalga tablosu güncellenmemişti, doküman "0 sızıntı" yazdı (ölçüm 10
  diyordu). `wavesFor()`'a geçildi ve eksik harita adı artık build'i
  durduruyor.

**Sanat.** `M8-P01` brifi `docs/plan/M8-sanat-brifi.md`'de. Oyundaki görsel
**geçici** (harita 1'in arka planından soğuk tonlama); gerçek görsel
üretilince yalnız `assets-src/bg/kar-gecidi.png` değişecek.

**Plandan sapmalar:** `PreloadScene.queueLazy` değişmedi — zaten `mapId`
üzerinden genel çalışıyordu. Nokta sayısı 10 değil **12** oldu (kapsama
bandı 10 noktayla tutmuyordu).

### Faz 5 — Harita 5 "Kadim Harabe" — `M8-T05`, `M8-P02`  ☑

Aynı şablon; **iki giriş + Y birleşme** (harita 2 ve 3'ün mekaniklerinin bileşimi), 12 nokta, kadro tam, çarpanlar ölçülür (`hpMultiplier` > harita 4). Boss tek kapıdan, refakat diğerinden (harita 3 kararı). Geçici arka plan `kul-ovasi.png`'den ton kaydırma; brif `M8-P02`.

**Kabul kriteri** — Faz 4 ile aynı + `MAPS` sırası ve `isUnlocked` zinciri beş harita.

**Durum:** ☑ **bitti** (2026-09-14)

#### Sonuç — `M8-T05`

**Harita.** İki giriş, `x = 200` sütununda birleşiyor, sonra **1420 px'lik
ortak gövde** üç virajla kaleye gidiyor. Kol başına `L` = 2050 px.
Harita 3'ten farkı burada: orada birleşme kalenin dibindeydi (ortak kuyruk
iki noktalık), burada gövde yolun yarısından fazlası. Karar tersine dönüyor —
"iki kolu ayrı mı tutayım yoksa gövdeye mi yığayım".

**15 yapı noktası ARANARAK bulundu, elle serpilmedi.** Elle serpilen ilk
yerleşim kol ortalamalarını 272,2 / 278,4 veriyordu (bandın altında). Tepe
tırmanma `|A−298| + |B−298| + 0,5·|A−B|` cezasını minimize etti ve **ikisini
de 298,0**'a getirdi. Arama kısıtları: yoldan ≥50 px, noktalar arası ≥100 px,
HUD dikdörtgenlerinden ≥36 px.

**Çarpanlar.** Altın doyumu 4,8'de düzleşiyor (tahta 6440'ta sabit), yani
altın bağlayıcı kısıt değil. Çarpan can kaybı taramasından: 6,0→12 · 6,4→11
· 6,6→11 · **6,8→16** · 7,0→18 · 7,2→20. Seçilen **6,8/6,8**, `startGold`
1904. Boss zırh 2, türetilen HP **2675** (0,80 × 3344, en zayıf kol).

**Ölçülen zorluk zinciri artık beş halkalı:** 0 → 6 → 10 → **13** → **16**
can kaybı (sınır 20). `kisitB.test.ts` bunu monoton olarak doğruluyor.

**Bu fazın asıl dersi HUD'du — ve üç turda öğrenildi.**

Kapsama, bütçe, Kısıt A/B testlerinin **hiçbiri HUD'u bilmiyor**. O yüzden
aşağıdaki üç hatanın üçü de bütün testler yeşilken vardı ve yalnız canlı
ekran görüntüsünde göründü:

1. Kol A `y = 120`'de altın/can kartuşunun (8-224 × 16-156) **altından**
   giriyordu — düşman ekrana görünmeden 260 px yürüyordu.
2. Düzeltince `y = 200` oldu; bu kez erken-başlat rozetinin
   (17-102 × 155-211) altında kaldı — yani oyuncunun yerleşim kararı
   verdiği tam anda giriş kapalıydı. `y = 250` oldu.
3. Kol B `y = 660`'ta yetenek butonlarının (28-170 × 622-707) altından
   geçiyordu. `y = 570` oldu.

Ve taramayı bütün haritalara uygulayınca **harita 4'te de bir hata çıktı**:
`M8-T04`'te koyduğum `(190, 65)` yapı noktası kartuşun tam altındaydı —
oyuncu onu ne görebiliyor ne tıklayabiliyordu. `(200, 215)`'e alındı;
kapsama 290,1'de **aynı** kaldı, uçan hattı da 11/12. Tahtanın değişmesi
boss tavanını 2321 → 2416 çıkardı, türetilen HP 1857 → **1933** oldu.

HUD kutuları **canlı ölçüldü** (`Container.getBounds()`), tahmin edilmedi,
ve `maps.test.ts` artık "hiçbir yapı noktası kalıcı bir HUD kutusuyla
çakışmıyor" diye bir test taşıyor.

**Kapanmamış bulgu — `M8-B01`:** **yolların** HUD altından geçmesi devam
ediyor: harita 1 ve 4'ün girişi kartuşun (y≈140), harita 3'ün iki girişi
hem kartuşun hem hız/ayar düğmelerinin altından başlıyor. Harita 5'te
düzeltildi ama eskiler M1/M7'den beri böyle. Düzeltmek ya dört haritanın
geometrisini (ve onlara bağlı bütün ölçülmüş sayıları) ya da HUD'un
yerleşimini değiştirmek demek — bu fazın kapsamına sığmaz, **Faz 13
(menü/HUD)** ile birlikte ele alınacak.

**Plandan sapmalar:** nokta sayısı 12 değil **15** oldu (bandı tutturmak
için); `PreloadScene` yine değişmedi.


### Faz 6 — Sonsuz mod — `M8-T06`  ☑

| | |
|---|---|
| **Kimlik** | `M8-T06` |
| **Durum** | ☑ **bitti** (2026-09-14) |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T03` (istatistik), `M8-T05` |
| **TIER 1** | k.1, k.3 (havuz tavanı), k.8 |
| **Açık soru** | S79 (sonsuzda boss sıklığı) |
| **Doküman** | ROADMAP "Sonsuz mod beklenenden ucuz" · `waves.ts` `budget(n)` · `WaveManager` "havuz dolu → ertele" · `SaveSystem` |

**Dosyalar**
- `src/systems/endlessWaves.ts` — yeni, Phaser'sız — `generateWave(n, roster, seed)`: `budget(n)`'i kadrodan puanla doldurur (deterministik, tohumlu), her 10. dalga boss + refakat
- `src/systems/WaveManager.ts` — değişiklik — 10. dalga bitince `endless` bayrağıyla üretilen dalgalara geçiş
- `src/systems/SaveSystem.ts` — değişiklik — `endlessBest: Record<mapId, number>` **ayrı alan** (sürüm değişmiyor, `TutorialSystem` deseni)
- `src/scenes/GameOverScene.ts` — değişiklik — kazanınca "Sonsuz moda devam" butonu; sonsuzda kaybedince "En iyi: dalga N"
- `src/scenes/HudScene.ts` — değişiklik — sonsuzda dalga sayacı `N` (toplam yok)
- `src/systems/endlessWaves.test.ts` — yeni

**Kabul kriteri** — `npm run test -- endless`: bütçe ±%10, yalnız kadro, deterministik, dalga 30 simülasyonu < 2 sn, tepe düşman ≤ havuz; canlı: harita 1 bitir → devam → dalga 11+ geliyor, HUD "11".

**Bitmedi sayılır eğer:** havuz dolunca dalga sessizce eksiliyorsa (WaveManager erteleme korunmalı).

**Durum:** ☑ **bitti** (2026-09-14)

#### Sonuç — `M8-T06`

**`budget(n)` olduğu gibi kullanılamadı** ve bu fazın asıl kararı bu oldu.
Formül dalga başına %20 büyüyor; dalga 30'da 10 × 1,20²⁹ ≈ **1900 puan**
eder ve en ucuz düşman 1 puan olduğu için bu tek dalgada 1900 düşman
demek. Havuz 60 ve `WaveManager` havuz dolunca **erteliyor** (sessizce
atlamıyor, bilerek) — yani dalga hiç bitmez, oyun kilitlenirdi.

Zorluk bu yüzden **iki kola** ayrıldı:
- **bütçe** %8 büyüyor ve düşman **bedeni** tavanla sınırlı (havuzun %75'i),
- tavan bağlayınca zorluğu **HP çarpanı** taşıyor: dalga başına kalıcı +%8.

**Ölçerek düzeltilen üç şey** (üçü de üretilen dalgalar basılarak görüldü,
teste bakarak değil):

1. **Beden ≠ kafa.** Örümcek Ana tek kafa ama **dört beden** (kendisi + 3
   yavru). Tavanı kafayla ölçmek dalga 30'da 13 Ana × 4 = 52 beden demekti
   ve havuz taşıyordu. `endlessBodyCost()` eklendi, tavan ona bakıyor.
2. **Tek tipe çökme.** Bütçe tavanı geçtikten sonra en pahalı düşmanla
   doldurmak tek çare oluyor ve dalga 40, 50, 60 hepsi "44 Trol" çıkıyordu.
   `ENDLESS_TYPE_SHARE_CAP` (%55) eklendi.
3. **Ucuz tipler yine de kayboluyordu** — pahalılar bedenlerin hepsini
   yiyordu. Birinci tur artık sırada bekleyen her aday için bir beden
   **ayırıyor**; dalga 60'ta bile kadronun tamamı sahada.

**Kayıt.** `EndlessRecords` ayrı bir üst alan (`endless`) kullanıyor,
`progress.version` **değişmedi** — `TutorialSystem` deseni. İki sistemin
aynı `localStorage` anahtarını paylaşması asıl risk olduğu için test her
iki sırayı da (önce yıldız/önce rekor) deniyor.

**Canlı doğrulama — ve onu mümkün kılan kanca.** Sonsuz mod dalga 11'de
başlıyor; tarayıcıda oraya elle oynayarak varmak pratik değil (dalga başına
24 sn doğum penceresi). Bu yüzden `DEV`-korumalı `killAllEnemies` kancası
eklendi (normal hasar yolundan geçiyor: altın, efekt, olaylar aynı) ve
sayfada 100 ms'lik bir otomat dalgaları sürdü. Sonuç: **dalga 11'e
ulaşıldı**, `isEndlessWave` `true` oldu, HUD sayacı `11.10` yerine **`11`**
yazdı ve üretilen dalga harita 1'in kadrosuyla geldi (kurtBinicisi, harpi,
orkSavasci, goblin — trol yok, çünkü kadroda yok; boss yok, çünkü 11 boss
dalgası değil). Kanca olmasa bu soruların hiçbiri canlı doğrulanamazdı.

**Oyun sonu ekranı.** Kazanınca "Sonsuz moda devam" (**birincil değil** —
ilk kez kazanan oyuncunun doğal yolu sıradaki harita). Sonsuz elde
"Ulaşılan dalga / En iyi" satırı ve rekor kırılmışsa altın "Yeni rekor!".
Canlı kontrolde o satır istatistik bloğuyla **üst üste bindi**; blok ve
butonlar rekor satırı varsa 34 px aşağı kayıyor.

**Plandan sapma:** `endlessWaves.ts` imzası `generateWave(n, roster, seed)`
yerine `generateEndlessWave(n, roster, spawnPoints, seed)` oldu — iki
girişli haritalarda kapı dağıtımı gerekiyordu.


### Faz 7 — Başarımlar — `M8-T07`  ☑

| | |
|---|---|
| **Kimlik** | `M8-T07` |
| **Durum** | ☑ **bitti** (2026-09-14) |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T03`, `M8-T06` |
| **TIER 1** | k.7, k.10 |
| **Doküman** | ROADMAP "Başarımlar — ucuz dönüş sebebi" · `EventBus` olayları · `TutorialSystem` (aynı kalıcılık deseni) |

**Dosyalar**
- `src/data/achievements.ts` — yeni — 12 başarım tanımı (kimlik, koşul türü, eşik, metin anahtarı)
- `src/systems/AchievementSystem.ts` — yeni, Phaser'sız — `bus` dinler, `RunStats`/`SaveSystem` okur, `save.achievements` **ayrı alan**; `onUnlock` callback
- `src/fx/AchievementToast.ts` — yeni — sağ üstte parşömen bant, 3 sn sonra kayarak gider (`scene.time`, oyun mantığı değil)
- `src/scenes/MenuScene.ts` — değişiklik — "Başarımlar" düğmesi → liste sahnesi `AchievementsScene`
- `src/systems/AchievementSystem.test.ts` — yeni

**Başarımlar (varsayılan liste):** ilk kule · ilk T3 · her harita ★★★ (5) · sızmasız harita · boss'u sızdırmadan öldür · sonsuz dalga 15 · sonsuz dalga 20 · Meteor'la 5 düşman tek atışta · 100 düşman öldür · kule satmadan harita bitir.

**Kabul kriteri** — `npm run test -- Achievement` ≥ 8; canlı: ilk kule → bant çıkıyor; menüde liste ✓/✗.

**Durum:** ☑ **bitti** (2026-09-14) — 20 test (hedef 8).

#### Sonuç — `M8-T07`

**Koşul türü alanı** (`counter` / `flag` / `runEnd`) tanımların içinde.
Başarımların yarısı olay sayıyor, yarısı elin sonucuna bakıyor; tek bir
`check(state)` imzası mümkündü ama o zaman her başarım bütün oyun
durumunu görürdü. Tür alanı sayesinde sistem hangi başarımı **ne zaman**
değerlendireceğini tablodan okuyor.

**Olaylara iki alan eklendi** çünkü bilgi zaten hesaplanıyordu ama hiçbir
yere duyurulmuyordu:
- `tower:upgraded` artık `tier` taşıyor. Olmasaydı dinleyicinin kule
  nesnesine ulaşması gerekirdi ve `systems/` Phaser'a bakamaz (k.11).
- `ability:cast { id, hits }` yeni. Meteor'un kaç düşmana vurduğu
  `GameScene` içinde zaten dönüyordu.

**"Satmadan bitir" için yeni olay gerekmedi:** `gold:changed`'in `sell`
sebebi tam bu bilgiyi taşıyordu; `RunStats` bir `soldAny` bayrağı tutuyor.

**Öldürme sayacı her ölümde diske YAZMIYOR.** Yoğun dalgada saniyede ~20
ölüm var ve her biri `JSON.parse` + `stringify` + `localStorage.set`
demekti — `M8-T01`'deki 2× kasmasının kök nedeni tam bu sınıftı (kare
başına senkron iş). Yazma yalnız eşik geçilince ve 25'te bir; test yazma
sayısını sayıyor (100 ölümde ≤ 5).

**Canlı kontrolden çıkan iki düzeltme:**

1. **Başarım listesi yukarı yapışıktı** — 12 satır `y = 410`'da bitiyor,
   altında 230 px boşluk kalıyordu. Satır aralığı 52 → 58, üst kenar
   150 → 190.
2. **Kazanılmış yıldız mürekkep zeminde BOŞ görünüyordu.** `M8-T04`'te
   seviye seçim kartlarında çözülen sorunun aynısı: atlas karesi altın
   konturlu ama içi mürekkep dolgu (`#14213B`), mürekkep zemine karışıyor.
   2/12 ekranı 0/12 gibi okunuyordu. Her yıldızın altına parşömen altlık
   kondu.

**Bant `Game` sahnesinde**, HUD'da değil: duraklatmada `Game` donuyor,
yani bant da donuyor ve oyuncu duraklattığı anda kayan bir bildirimle
karşılaşmıyor. Kuyruk sınırlı (4) — 12 başarım tek elde açılırsa oyuncu
36 saniye bant izlemek zorunda kalırdı.

**Canlı doğrulandı:** kule kur → "İlk Nöbetçi" bandı sağdan kayarak geldi;
kışla kur → "Saf Tut" kuyruğa girip sırayla çıktı; ikisi de 3 sn sonra
geri kaydı; menü → Başarımlar listesi 2/12 gösterdi, açık olan ikisi dolu
yıldızla ayrıştı.

**Plandan sapma:** `AchievementSystem` `SaveSystem`'i okumuyor —
`GameOverScene` okuyup `RunEndContext` olarak veriyor. Sistem böylece
Phaser'sız kalıyor ve `MAPS`/`SaveSystem`'e hiç bağlanmıyor.

### Faz 8 — Görsel cila 1: kule ve mermi — `M8-T08`  ☑

| | |
|---|---|
| **Kimlik** | `M8-T08` |
| **Durum** | ☑ **bitti** (2026-09-14) |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T01` |
| **TIER 1** | k.3, k.6, k.8 |
| **Doküman** | `GAME-DESIGN.md` §10 · `fx/Particles.ts` · `data/projectileVisuals.ts` · `Tower.ts` (S23 "dönüş animasyonu yok") |

**Yapılacak**
- Kule ateşlerken 90 ms geri tepme (ölçek 1 → 0,92 → 1, tween; `prefers-reduced-motion`/`effectScale 0` → yok).
- Namlu parıltısı: aile rengiyle 3 parçacık (`Particles.patlat` renk parametresi alır).
- Büyü mermisi izi: mermiyi izleyen kısa parçacık kuyruğu, havuzlu emitter, 2×'te yarı.
- Gülle: uçuşta `scaleY` ile hafif kabarma (yay hissi), çarpışta toz halkası.
- İsabet parıltısı hasar tipine göre renk (fiziksel altın, büyü lapis).

**Kabul kriteri** — `dev.particleCount()` tepe dalgada ≤ 300; havuz k.3 bekçisi yeşil; canlı ekran görüntüsünde üç aile ayırt ediliyor; `effects: off` ile hiçbiri yok.

**Durum:** ☑ **bitti** (2026-09-14)

#### Sonuç — `M8-T08`

**En büyük bulgu, yazılan koddan önce duruyordu: `patlat` yön parametresini
ALIYOR ama KULLANMIYORDU.** `Particles.patlat` `aci`yi hesaplayıp
`void aci` ile atıyordu; bütün patlamalar her yöne eşit saçılıyor, bir okun
nereden geldiği parçacıklardan hiç okunmuyordu. Çağıranlar yönü zaten doğru
veriyordu. Tek satırlık bir "kullan" değişikliği, yeni efektten daha çok
şey kazandırdı.

Ama **hemen bir yan etki doğurdu**: dar koni (55°) isabet sıçraması için
doğru, top patlaması için değil — patlama bir anda yukarı fışkıran çeşmeye
dönüştü. Ölüm, patlama ve iz için `TAM_DAIRE` (180° yarı açı) eklendi.

**Yapılanlar:**
- **Geri tepme**: kule ateşlerken hedefin tersine 4 px, 90 ms. Ölçek nabzı
  (1 → 0,92 → 1) da denenebilirdi ama kulenin ayak izini bir an küçültüyor
  ve yan yana kulelerde "titreme" gibi okunuyor; kayma **yön taşıdığı**
  için hangi kuleye bakılacağını da söylüyor. Tween **görsele** uygulanıyor,
  `Container`'a değil (menzil çemberi ve kışla bayrağı kulenin konumundan
  okunuyor). Yeni tween eskisini öldürüyor — Okçu T3 saniyede ~2,5 atış.
- **Namlu parıltısı**: 3 parçacık, **merminin rengiyle**, dar koni (22°),
  kule-hedef mesafesinin %18'inde. Sabit piksel verilseydi yakın hedefte
  parçacık düşmanın üstünde patlardı.
- **İsabet parıltısı** hasar tipine göre (fiziksel altın, büyü lapis).
  `DamageResult`'a eklenmedi — o `combat.ts`'in saf çıktısı ve hasar tipi
  zaten girdisi; `DamageHandler`'a beşinci parametre olarak geçti.
- **Gülle yay nabzı**: uçuşta ölçek 1,70 ↔ 2,12 (`yoyo`, sonsuz döngü).
  Tepeden bakışta yükseklik gösterilemiyor; ölçek nabzı en ucuz ipucu.
  Sonsuz döngü güvenli çünkü `resetForPool` `killTweensOf` + `setScale(1)`
  yapıyor — kural 3'ün tuzağına düşmemenin tek yolu buydu.
- **Büyü izi**: mermiyi izleyen parçacık kuyruğu. `Projectile`'ın `update`'i
  yok (ince sınıf), o yüzden iz sahnenin karesinde üretiliyor; süre
  `scaledDelta` üzerinden, böylece 2×'te iz seyrelmiyor.

**`TowerSystem` genel hâle geldi** (`TowerSystem<T extends TowerRuntime>`).
`GameScene` ateş anında `Tower.recoil()` çağırmak istedi; seçenekler ya
`TowerRuntime`'a görsel bir metot eklemek (k.11'i bulanıklaştırırdı) ya da
tip parametresiydi. `ProjectileSystem<E, T>` ve `WaveManager<T>` zaten aynı
deseni kullanıyor.

**Bekçi bir hata yakaladı:** `#izBirikim` alanı `create()` içinde
sıfırlanmıyordu — "yeniden başlatmada önceki oyunun durumu taşınır".
Tam olarak bunun için var olan kontrol, ilk denemede iş gördü.

**Ölçümler (canlı):** parçacık tepesi **39** (§10 tavanı 300);
`effects: off` → **0**; gülle ölçeği 1,70 → 1,92 → 1,70 salınıyor; büyü
mermisi `trail: true` ve o anda 24 parçacık havada; okçu mermisi
`1,8 × 0,55` altın, gülle `1,7 × 1,7` mürekkep — üç aile ekran
görüntüsünde ayırt ediliyor.

### Faz 9 — Görsel cila 2: düşman — `M8-T09`  ☑

| | |
|---|---|
| **Kimlik** | `M8-T09` |
| **Durum** | ☑ **bitti** (2026-09-14) |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T08` |
| **TIER 1** | k.3 (Angle/Alpha manifestte), k.8 |
| **Doküman** | §10 squash & stretch · `Enemy.step` · `Particles.olumEfekti` |

**Yapılacak**
- Yürüme sallantısı: `Enemy.step` içinde hıza bağlı ±4° açı (`scaledDelta` ile faz), uçanlarda kanat çırpma hissi için ±6°.
- Doğum: 200 ms alfa 0 → 1.
- Ölüm: mevcut ezilme + 180 ms dönerek düşme (yerdekiler) / yukarı sönme (uçanlar).
- Boss girişi: "BOSS" parşömen bandı (statik `Text`, `t()`), 300 ms sarsıntı, boss çubuğu zaten var.

**Kabul kriteri** — `resetForPool` bekçisi yeşil; canlı: 2×'te sallantı okunabilir; `effects: off`'ta sallantı kalıyor (bilgi değil ama hareket — `reducedMotion`'da kapanıyor, karar yazılı).

**Durum:** ☑ **bitti** (2026-09-14)

#### Sonuç — `M8-T09`

**Kabul kriterindeki "karar yazılı" maddesinin cevabı: sallantı
`screenShake` ayarına bağlandı.** Kalıcı bir `reducedMotion` bayrağı yok —
`reducedMotionDefaults()` tercihi *varsayılanlara* çeviriyor ve orada
`screenShake: false` var. İkisi de "bilgi taşımayan görüntü hareketi"
sınıfında, yani aynı anahtarın altında olmaları tutarlı. `effects`
parçacık **yoğunluğunu** yönetiyor; `effects: off` oynayan biri parçacık
istemiyor demek, "düşmanlar donuk dursun" demek değil.

**Tween değil sayaç.** Sallantı fazı ve doğuş sönümü `#flashLeft` (`G08`)
ile aynı deseni izliyor: `resetForPool()` tek satırda sıfırlıyor ve
havuzdan çıkan düşman öncekinin animasyonunu devralmıyor (kural 3).
Faz düşman kimliğine göre kaydırılıyor — yoksa aynı anda doğan iki goblin
senkron sallanır ve tek bir nesne gibi okunurdu.

**Canlı kontrol bir kusur gösterdi ve düzeltildi:** ayar oyun **içinde**
kapatılınca `#salla` yalnız `return` ediyordu ve düşmanlar son açılarında
**eğik donuyordu** (ölçüldü: 10 düşmanın hiçbiri oynamıyor ama hepsi
çarpık). Hareket hassasiyeti yüzünden kapatan biri için bu, kapattığı
şeyin kalıntısını ekranda bırakmak demek. Artık ilk karede düzeliyor.

**Ölüm artık yöne göre iki biçimde:** yerdekiler yana devrilip (±70°)
eziliyor, uçanlar devrilmiyor, **yukarı süzülüp sönüyor** — bir harpi'nin
yere yapışması yanlış hikâye anlatırdı.

**Boss bandı `wave:started`'a bağlanmadı.** Boss refakatinden **8 sn
sonra** doğuyor (`BOSS_REFAKAT_GECIKMESI_SN`, §7); dalga başında bant
göstermek oyuncuya boss yokken "geliyor" derdi. Bant `bossInfo`'nun
yok→var geçişini izliyor — can çubuğunun zaten kullandığı sinyal.

**Canlı ölçümler:** sallantı açıları ±4° bandında ve düşmanlar arasında
faz farklı (1,3° / 3,4°); doğuş sönümü yakalandı (alfa 0,09);
`screenShake: false` ile 700 ms boyunca **hiçbir** açı değişmiyor ve
hepsi 0; dalga 10'da boss sahaya çıkarken "Ogre Şef geliyor" bandı
ekran görüntüsünde.

### Faz 10 — Ses cilası — `M8-T10`, `M8-P03`

| | |
|---|---|
| **Kimlik** | `M8-T10` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T01` |
| **TIER 1** | k.7 |
| **Doküman** | §12 · `SoundSystem` havuzu · `SettingsPanel` |

**Dosyalar**
- `src/systems/Settings.ts` — değişiklik — `musicLevel`/`sfxLevel: 'off'|'low'|'full'` (efekt yoğunluğu deseni, k.7 uyumlu), `sound` bayrağı ikisinin toplamı olarak korunuyor
- `src/fx/SettingsPanel.ts` — değişiklik — iki satır (panel 380 → 440)
- `src/fx/SoundSystem.ts` — değişiklik — `ui_click`, `countdown_tick` (son 3 sn), `boss_music` anahtarları; **yoksa sessizce atlar** (Y14 deseni)
- `docs/plan/M8-sanat-brifi.md` — `M8-P03`: üç ses için üretim brifi (M6 ses brifi biçimi)

**Kabul kriteri** — `npm run test -- Settings` (yeni alanlar + geri düşme); canlı: müzik "Düşük"te müzik kısılıyor efekt değişmiyor.

### Faz 11 — Zorluk seviyeleri — `M8-T11`

| | |
|---|---|
| **Kimlik** | `M8-T11` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T05` |
| **TIER 1** | k.1 |
| **Açık soru** | S80 (Zor çarpanı — ölçülecek) |
| **Doküman** | §6 Denge ilkesi, §9 · `waveSim` · `kisitB.test.ts` |

**Yapılacak**
- `data/balance.ts`: `DIFFICULTY = { kolay: 0.85, normal: 1, zor: ? }` — Zor çarpanı, referans tahtayla beş haritanın da `waveSim`'de geçilebildiği en yüksek 0,05 adımı (**ölçülerek**), bulunan değer S80'e yazılır.
- Seviye seçimde üç düğme (kalıcı tercih `Settings.difficulty`), HUD'da küçük rozet.
- Yıldız yalnız Normal ve Zor'da kaydedilir (Kolay öğrenme modu; karar yazılı).
- Denge testleri Normal'de koşmaya devam eder + Zor için "geçilebilir" testi.

**Kabul kriteri** — `npm run test` yeşil; `KURALLAR.md` zorluk tablosu eklenmiş.

### Faz 12 — Mobil / dokunmatik cila — `M8-T12`

| | |
|---|---|
| **Kimlik** | `M8-T12` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T02` |
| **TIER 1** | Platform (44 px, yatay) |
| **Doküman** | `CLAUDE.md` Platform · `research/05` §1 · Browser pane mobil ön ayarı |

**Yapılacak**
- Tam ekran düğmesi (menü + HUD dişlisinin yanı), `scale.startFullscreen`.
- Dikey yönde "Cihazı yatay çevir" perdesi (`orientationchange`, itch.io için; Poki kendisi yapıyor).
- `index.html`: `touch-action: manipulation` (çift dokunma yakınlaştırmasını keser).
- Toplanma noktası sürükleme dokunmatikte doğrulanır (mobil ön ayar, `pointer` olayları).

**Kabul kriteri** — Browser pane mobil ön ayarında (375×812 → yatay) menü→harita→kule kur→bayrak sürükle tamamlanıyor; ekran görüntüleri.

### Faz 13 — Menü ve seviye seçim — `M8-T13`

| | |
|---|---|
| **Kimlik** | `M8-T13` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T07` |
| **TIER 1** | k.6, k.7 |
| **Doküman** | §2 sanat yönü · `LevelSelectScene` · `MapRenderer.dashedLine` |

**Yapılacak**
- Menü: alt başlık satırı (`t('tagline')`), başlıkta altın parıltı tween'i (reduced-motion → yok), sürüm etiketi (`package.json` sürümü build'de gömülü), "Nasıl oynanır" düğmesi → tek sayfa statik açıklama (tr/en).
- Seviye seçim: kart üstüne yolun kesikli çizimi (`MapDef.paths`'ten, küçük resme ölçekli), en iyi sonsuz dalga, kilitli kartta "Önce N. haritayı bitir".

**Kabul kriteri** — canlı ekran görüntüleri; `guard` k.12/k.13 yeşil.

### Faz 14 — Paket boyutu ve başarım — `M8-T14`

| | |
|---|---|
| **Kimlik** | `M8-T14` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M8-T13` |
| **Doküman** | `iyilestirme/Y11-phaser-tam-yapim.md` · `Y02` · `report-size.mjs` |

**Yapılacak**
- Phaser özel yapımı dene (yalnız kullanılan alt sistemler); `report-size` ile **ölçülen** fark; kazanç < %15 ise geri al ve yaz.
- Ses efektleri ilk dalgadan sonra tembel (müzik gibi) — ilk indirme küçülür.
- Y02 adım 3 yalnız Y10 ölçümü gelirse.

**Kabul kriteri** — `npm run build` boyut raporu önce/sonra dosyaya yazılmış.

### Faz 15 — Yayın hazırlığı — `M8-T15`

| | |
|---|---|
| **Kimlik** | `M8-T15` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | tüm fazlar |
| **Doküman** | `M7-itchio-yayin-brifi.md` · `results/README.md` |

**Yapılacak**
- `scripts/package-itch.mjs`: `dist/` içeriğini **kökte `index.html`** olacak şekilde `kale-nobeti-itch.zip`'e paketler, doğrular.
- İki dilde üretim QA turu (beş harita, sonsuz, başarım, ayarlar), konsol sessiz.
- itch.io sayfa metni tr/en, üretim yapısından ekran görüntüleri (`docs/results/M8-ekran/`).
- `docs/results/M8-SONUC.md`, `ROADMAP.md`/`plan/README.md` güncel.

**Kabul kriteri** — `unzip -l kale-nobeti-itch.zip | head` ilk satırda `index.html`; `npx serve dist` 4 seviye derin yoldan açılıyor.

---

## 3. Açık sorular (bu taşta ilk kez)

| # | Soru | Varsayılan |
|---|---|---|
| S77 | Harita 4-5 HP/altın çarpanı ilerlemesi | Monoton artış; altın tam-yükseltme doyumuyla ölçülür (S73 yöntemi) |
| S78 | Harita 4-5 boss zırhı | Tahtanın ortalama kademesine göre tarama (M7 yöntemi); 2'nin altına inmez |
| S79 | Sonsuzda boss sıklığı | Her 10. dalga, refakat bütçenin kalanı |
| S80 | Zor çarpanı | Ölçülür: beş haritada referans tahta geçebilen en yüksek değer |

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Yeni harita dengesi ölçülmeden yazılır | `KURALLAR.md` diff'inde harita dışı satır değişiyor | Faz 4/5 "bitmedi sayılır" maddesi; her çarpan taramayla |
| Sonsuzda havuz tavanı | `dev.poolExhausted` artıyor | Erteleme korunur, dalga üreteci puan/adet tavanına bakar |
| Cila katmanı FPS'i düşürür (ölçemiyorum) | `dev.particleCount` > 300, 2×'te tahsis sayacı | Her efekt `effectScale`'e bağlı, 2×'te yarı; tahsis ölçümü (SFX havuzu yöntemi) |
| Geçici arka planlar "bitmiş" sanılır | — | Dosya adında ve `strings`'te değil, `maps.ts` yorumunda `GEÇİCİ — M8-P0x`; brif yazılı |

## 5. Taş sonu kontrol listesi

- [ ] Beş harita `MAPS`'te, hepsi `waveSim`'de geçilebilir, `KURALLAR.md` güncel
- [ ] Sonsuz mod beş haritada açılıyor, en iyi dalga kaydediliyor
- [ ] 12 başarım, menüden liste
- [ ] ESC menüsü, oyun sonu istatistikleri
- [ ] Zorluk üçlü, Zor çarpanı S80'de ölçülü
- [ ] Mobil ön ayarda tam tur
- [ ] `npm run typecheck && npm run test && npm run guard && npm run build` yeşil
- [ ] `kale-nobeti-itch.zip` kökte `index.html`
- [ ] `docs/results/M8-SONUC.md` yazıldı

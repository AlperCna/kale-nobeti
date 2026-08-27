# İyileştirme dosyası — görsel ve yapısal

M7 bittikten sonra yapılan sistematik tarama. İki turda genişletildi. **22 bulgu**, her biri
kendi dosyasında: kanıt (dosya:satır), gerekçe, seçenekler,
öneri, doğrulama listesi, "bitmedi sayılır eğer".

**Tarih:** 2026-08-27 · **Kapsam:** `src/` (72 kaynak dosya, 10.743
satır), `public/assets/`, `scripts/`, `docs/`.

> **Bu dosyalar plan değil, bulgu.** Hiçbiri uygulanmadı. Her biri
> bağımsız sevk edilebilir; bağımlı olanlar dosya içinde işaretli.

---

## Nasıl bulundu

Bulgular dört kaynaktan çıktı — ve **hiçbiri "şuna da bakalım"dan**:

| Kaynak | Örnek |
|---|---|
| **Kodun kendi bıraktığı borçlar** | `Soldier.ts:68` "M6'da can çubuğu" · `GameOverScene.ts:73` "Görselleştirme M7'de" · S07 "M6'da ikisi tek `BitmapText` olacak" · S13 "görsel bedeli M6'da kapatılır" · S19 "altın kartuş biçimi M6'da" |
| **Ölçüm** | `report-size.mjs` çıktısı · MP4 `mvhd` süre okuması · dosya satır sayımı · atlas kare listesi · pango glif genişliği |
| **Kural ile kodun karşılaştırılması** | `CLAUDE.md` "sahneler ince olur" vs 1749 satır · "hiçbir metin kodun içinde yazılmaz" vs ~30 metin · TIER 1 k.3 vs havuzun kendi tahsisi |
| **Düzeltilmiş bir hatanın kardeşlerini aramak** | Bu oturumda `spawnPoint` çok-yol hatası düzeltildi → `paths[0]` deseni **tüm kod tabanında** tarandı → **Y13**: dört kalıntı daha |

> Dördüncü satır en verimlisi çıktı. Bir hata bulunduğunda **aynı varsayımın**
> başka nerede yaşadığını taramak, sıfırdan yeni bir şey aramaktan hem ucuz
> hem daha keskin. Y13, bu taramanın en ağır bulgusu.

**Doğrulanıp elenen şüpheler** (bulgu değil, temiz çıktı):

- `HudScene`'in ESC/boşluk dinleyicileri sızmıyor —
  `KeyboardPlugin.shutdown()` `removeAllListeners()` çağırıyor
  (`node_modules/phaser/src/input/keyboard/KeyboardPlugin.js:880-893`).
- `SaveSystem.recordResult` yıldızı düşürmüyor
  (`SaveSystem.ts:85`: `if (yeni <= this.starsOf(mapId)) return false`).
- `i18n.t()` geri düşmesi doğru yazılmış (`i18n.ts:17-24`) — boş `en`
  arayüzü boşaltmıyor.
- Dokunmatik girdi çalışıyor — `#setupInput` Phaser'ın birleşik
  `POINTER_*` olaylarını kullanıyor, fareye özel kod yok.
- `BootScene` font yükleme hata yolu doğru: zaman aşımı + zarif geri
  düşme (`BootScene.ts:69-95`). **Aynı disiplin varlık yüklemede yok**
  → Y14.
- `devHooks` üretimde tamamen siliniyor (`devHooks.ts:127`).
- `index.html` platform kısıtlarını taşıyor: `-webkit-user-select`,
  `overflow: hidden`, letterbox rengi.

---

## Önem sırası

Emek/etki oranına göre. **Üstteki üçü açık ara en yüksek getirili.**

| # | Bulgu | Tür | Emek | Etki |
|---|---|---|---|---|
| 1 | [Y13 · `paths[0]` kalıntıları — kışla harita 2/3'te bozuk](Y13-paths0-kalintilari.md) | **hata** | ☑ **düzeltildi** | **çok yüksek** |
| 2 | [Y05 · Menü müziği ilk indirmenin %75'i](Y05-menu-muzigi-ilk-indirme.md) | boyut | ☑ **düzeltildi** | **çok yüksek** |
| 3 | [Y04 · Ses tercihi açılışta uygulanmıyor](Y04-ses-tercihi-acilista-uygulanmiyor.md) | **hata** | ☑ **düzeltildi** | yüksek |
| 4 | [Y10 · Kısıtlanmış FPS geçidi hiç ölçülmedi](Y10-kisitlanmis-fps-olculmedi.md) | doğrulama | **küçük** | yüksek |
| 5 | [G01 · Menü "Oyna" butonu parşömene geçmedi](G01-menu-oyna-butonu-parsomen.md) | görsel | ☑ **düzeltildi** | yüksek |
| 6 | [Y12 · Açılışta boş ekran, favicon yok](Y12-acilis-bos-ekran.md) | ilk izlenim | **küçük** | orta-yüksek |
| 7 | [G02 · HUD hız butonu parşömene geçmedi](G02-hud-hiz-butonu-parsomen.md) | görsel | ☑ **düzeltildi** | orta |
| 8 | [Y07 · "Tekrar dene" / "Sonraki harita" yok](Y07-oyun-sonu-akisi.md) | akış | küçük-orta | yüksek |
| 9 | [G03 · Yapı menüsünün arkasında panel yok](G03-yapi-menusu-arkalik.md) | görsel | orta | yüksek |
| 10 | [Y14 · Yükleme hatası ele alınmıyor](Y14-yukleme-hatasi-ele-alinmiyor.md) | dayanıklılık | küçük-orta | orta-yüksek |
| 11 | [G07 · Yıldızlar sistem yazı tipine bırakılmış](G07-yildiz-gosterimi.md) | görsel | küçük-orta | orta-yüksek |
| 12 | [G06 · Düşmanlar yürüdükleri yöne dönmüyor](G06-dusman-yonelmesi.md) | görsel | ☑ **düzeltildi (kısmen)** | orta |
| 13 | [Y06 · Her ölümde iki ses üst üste](Y06-ses-cakismasi.md) | ses | ☑ **düzeltildi** | orta |
| 14 | [G08 · Vuruşta darbe geri bildirimi yok](G08-vurus-geri-bildirimi.md) | görsel | küçük | orta |
| 15 | [Y08 · Test kapsamı — `storage.ts` testsiz](Y08-test-kapsami.md) | test | orta | orta-yüksek |
| 16 | [Y03 · i18n sızıntısı, `en` %0](Y03-i18n-sizintisi.md) | yapısal | orta | yüksek |
| 17 | [G05 · Düşmanlarda can göstergesi yok](G05-dusman-can-gostergesi.md) | görsel | orta | **yüksek** |
| 18 | [G04 · `TowerInfoPanel` paletten kopuk](G04-towerinfopanel-paleti.md) | görsel | orta | orta |
| 19 | [Y02 · `Pool.activeItems()` kare başına 7 dizi](Y02-pool-activeitems-tahsis.md) | başarım | orta | orta |
| 20 | [Y09 · Öğretici / yönlendirme yok](Y09-ogretici-yok.md) | UX | orta-büyük | **yüksek** |
| 21 | [Y01 · `GameScene.ts` 1749 satır](Y01-gamescene-bolme.md) | mimari | **büyük** | orta-yüksek |
| 22 | [Y11 · Phaser tam yapımı paketleniyor](Y11-phaser-tam-yapim.md) | boyut | orta-büyük | **belirsiz — önce ölç** |

---

## Önerilen paketleme

Dosyalar tek tek bağımsız, ama bazıları **aynı kodu açıyor**. Birlikte
yapılmaları hem ucuz hem tutarlı:

### Paket 0 — "çok yol hatasını kapat" — ☑ **tamamlandı (2026-08-27)**
**Y13.** `closestPointOnPaths` eklendi, `defaultRally`/`clampRally`
çoğul yol alıyor, üç çağrı yeri ve `waveSim` güncellendi. Canlı
doğrulandı (harita 2 spot 6, harita 3 spot 5, harita 1 regresyon yok).
`KURALLAR.md` diff'i **boş çıktı** — beklenmedik ama açıklanabilir:
otomatik denge tahtası kışlayı her zaman "en düşük kapsamalı nokta"ya
kuruyor ve bu nokta bugünkü haritalarda zaten `paths[0]`'a yakın, yani
hata otomatik ölçümü hiç tetiklemiyordu. Ayrıntı: Y13'ün kendi "Sonuç"
bölümü. **Yeni bulgu:** `balanceChecks.ts`'in kışla yerleşimi ikinci
kolu hiç sınamıyor — bu ayrı, açık bir uç olarak kaldı.

### Paket A — "yarım kalanları kapat" — ☑ **tamamlandı (2026-08-27)**
**G01 + G02 + G06.** Menü ve HUD hız butonu parşömene geçti (paylaşılan
`addPressFeedback` yardımcısı doğdu); S07'nin `BitmapText` borcu kapandı
(bu arada `guard-rules.mjs`'in k.7 kontrolündeki bir yanlış-pozitif de
düzeltildi — alıcı-farkındalıklı hâle geldi); düşmanlar ve askerler artık
yürüdükleri/dövüştükleri yöne bakıyor (`flipX`, ölü bölgeli). Atlas
kareleri elle incelendi: art çoğunlukla simetrik öne-bakan silüet, yalnız
kurt binicisi gerçekten yönlü — flip onun için görünür, diğerleri için
zararsız. S13'ün dönüş tween'i (c) **açık kaldı**, kod tabanında
`createParchmentButton` kullanmayan buton kalmadı.
> **Ekran görüntüsü alınamadı** (Browser pane sorunu, istemci taraflı) —
> doğrulama Phaser sahne grafiği okunarak yapıldı, piksel/göz kontrolü
> eksik kaldı. Ayrıntı: her dosyanın "Sonuç" bölümü.

### Paket B — "ses ve boyut" — ☑ **tamamlandı (2026-08-27)**
**Y05 + Y04 + Y06.** `Settings` `BootScene`'e taşındı (registry
üzerinden paylaşılıyor); `music_menu` 60 sn'ye kırpılıp tembel
yüklemeye geçti ve susturulmuş oyuncuda **hiç** indirilmiyor; `gold:changed`
artık `reason` taşıyor, `enemy_death` 80 ms kısıtlandı. Üçü de canlı
doğrulandı (gerçek ağ istekleri, gerçek `bus.emit`/`sound.play` izlemesi).
> İlk indirme **3,90 MB → 1,03 MB** (%74 düşüş). Toplam paket
> **7,01 MB → 4,85 MB**. Ayrıntı: her dosyanın kendi "Sonuç" bölümü.
> **Kapanmayan uç:** müzik kırpma noktası kulakla doğrulanmadı (Y05).

### Paket C — "menü yüzeyi" *(bir oturum)*
**G03 + Y01'in 3. adımı** — G03 zaten `#openMenu`/`#openSellMenu`/
`#openBarracksMenu`'nün 350 satırını açıyor; `fx/BuildMenu.ts`'e
taşıma aynı işte yapılmalı. Y01'in diğer iki adımı bundan bağımsız.

### Paket D — "oyuncu akışı" *(bir oturum)*
**Y07 + G07** — oyun sonu ekranı ikisinde de değişiyor.

### Paket E — "ilk beş saniye" *(bir oturum)*
**Y12 + Y14** — ikisi de `index.html` / `PreloadScene`'e dokunuyor.
Y12'nin saf HTML/CSS açılış perdesi, Y14'ün kritik hata ekranı için
**hazır zemin**: hiçbir varlığa bağlı değil, atlas inmese bile çiziliyor.
Ayrı yapmak aynı perdeyi iki kez tasarlamak.
> Y05 ile birlikte okunmalı: Y05 *ne kadar* indiğini, Y12 indirirken
> *ne görüldüğünü*, Y14 *inmezse ne olduğunu* çözüyor.

### Paket F — "ölçüm oturumu" *(bir oturum, kod yazmıyor)*
**Y10 + Y02'nin 2. adımı + Y11'in karar ölçümü** — üçü de aynı Chrome
DevTools oturumunda toplanıyor: 4× CPU kısıtlamasında FPS, tahsis oranı,
JS ayrıştırma süresi. Tek kurulum, üç kararı birden açıyor.
> Sonuçlar `OLCUMLER.md`'ye işlenmeli — dosyanın kendi kuralı:
> "İşlenmeyen ölçüm bir sonraki oturumda yeniden yapılmak zorunda kalır."

### Tek başına duranlar
**Y08** (test — her an), **Y03** (i18n — bekçiden başla),
**G05** (can göstergesi — kendi başına büyük),
**G04** (karar gerektiriyor),
**Y09** (en büyük, Y01'den sonra ucuzlar).

---

## Tekrarlayan dört desen

Bulguların çoğu dört kökten çıkıyor. Tek tek düzeltmek yerine kökü
kapatmak daha değerli:

### 1. Greybox varsayımları gerçek sanattan sonra geçersizleşti

`Soldier`'ın alfa ile solması, düşmanların yönsüzlüğü, yıldızın sistem
glifi, `GoldCoin`'in `setScale(1)` tuzağı (bu oturumda yakalandı) —
hepsi greybox döneminde **doğru** çözümlerdi. M6 sanatı geldi, kod
güncellenmedi.

> **G05, G06, G07** bu kökten. `CLAUDE.md`'nin "greybox → nihai çizim"
> üretim kuralı, *sanat gelince kodun da güncellenmesi* adımını
> içermiyor.

### 2. Bekçiye bağlanan kurallar tuttu, bağlanmayan tutmadı

`guard-rules.mjs` on kontrol koşuyor. Kontrol edilen her kural temiz:
`any` yok, ham `delta` yok, `Math.sqrt` yalnız `math.ts`'te, `coverage`
elle yazılmamış.

Kontrol **edilmeyenler**: i18n kuralı (~30 metin sızmış), havuz
sıfırlama tamlığı (beş kez hata), "sahneler ince olur" (1749 satır).

> **Y03, Y08, Y01** bu kökten. En yüksek getirili tek hamle:
> **bekçiye kural eklemek**, sızıntıyı tek tek temizlemek değil.

### 3. Testler üst sınır kontrol ediyor, eşitlik değil

Bu oturumda kanıtlandı: çok girişli harita hatası düzeltilince sızıntı
sayıları düştü (8→6, 15→10) ve **hiçbir test kırılmadı**, çünkü
`kisitB.test.ts` `toBeLessThanOrEqual` kullanıyor.

> Sonuç: **yeşil testler "hiçbir şey değişmedi" demek değil**, yalnız
> "hiçbir sınır aşılmadı" demek. Denge değişimini yakalayan tek şey
> `npm run build`'in ürettiği `docs/KURALLAR.md` diff'i.
>
> **Y01, Y02, G06, G08, Y13**'ün doğrulama listelerinde bu yüzden
> "`KURALLAR.md` diff'i" maddesi var.

### 4. Harita 1 varsayımları çok yollu haritalarda kırıldı

`MapDef.paths` her zaman dizi. Ama tek yollu harita 1 ile yazılmış her
kod `paths[0]`'ı "yolun kendisi" gibi kullandı. Harita 2 ve 3 M7'de
geldiğinde bu varsayımın **hangi dosyalarda** yaşadığı taranmadı.

Bilinen üyeler:

| Nerede | Durum |
|---|---|
| `WaveGroup.spawnPoint` hiç tüketilmiyordu | ✅ bu oturumda düzeltildi |
| `#drawMap()` yalnız `paths[0]` çiziyordu | ✅ bu oturumda düzeltildi |
| Kışla toplanma noktası (`defaultRally`) | ⛔ **açık** — Y13 |
| Toplanma noktası sürükleme (`clampRally`) | ⛔ **açık** — Y13 |
| Menzil önizlemesi (`coveredSegments`) | ⛔ **açık** — Y13 |
| `waveSim`'in kışla kurulumu | ⛔ **açık** — Y13 |

> **Y13** bu kökten ve listedeki en ağır bulgu. Desenin dersi 2. desenle
> aynı yere çıkıyor: `guard-rules.mjs`'e "`paths[0]` doğrudan
> indekslenmiyor" kontrolü, bu sınıfı tamamen kapatır.

---

## Ölçüm özeti

Bu taramada çıkan sayılar, tek yerde:

| Ölçüm | Değer |
|---|---|
| İlk indirme | **3,90 MB** (Poki sınırı 8 MB, uyarı 5 MB) |
| → bunun menü müziği | **2,94 MB (%75,3)** |
| Toplam paket | 7,01 MB (CrazyGames, SDK'sız) |
| `music_menu.m4a` | 244,5 sn · ~98 kbps |
| `music_game.m4a` | 230,6 sn · ~99 kbps (tembel — doğru) |
| `atlas.png` | 59,8 KB · 1024×272 · **34 kare** (sınır 2048×2048) |
| `src/` toplam | 10.743 satır · 72 dosya · ortalama 149 |
| `GameScene.ts` | **1749 satır** (%16, ortalamanın 11,7 katı) |
| Test dosyası | 34 |
| → `systems/` | **16/16** ✅ |
| → `entities/` | **0/4** |
| → `fx/` | 0/12 (çoğu doğru — görsel) |
| `strings.ts` anahtarı | 16 (`tr` dolu, **`en` 16/16 boş**) |
| Kodda kalan görünür metin | **~30** |
| `guard-rules.mjs` kontrolü | 10 |
| Kare başına havuz dizi tahsisi | **7** (~420/sn) |
| Ham JS paketi | **1,27 MB** (gzip 0,33 MB) |
| Çok yollu harita | **2/3** (harita 2 ve 3, ikişer kol) |
| Oynanışı etkileyen `paths[0]` kalıntısı | **4** |
| Yükleme hatası dinleyicisi | **0** |
| 4× CPU kısıtlamasında ölçülmüş FPS | **hiç** |
| `index.html` açılış göstergesi / favicon / `noscript` | **yok / yok / yok** |

---

## Sonraki adım

Bu dosyaların hiçbiri uygulanmadı. Başlamak için önerilen sıra:

1. **Paket 0** (Y13) — **tek başına.** Gerçek bir hata, iki haritada bir
   mekaniği bozuyor ve denge sayılarını etkiliyor. Diğer her şeyden
   önce, çünkü sonraki her ölçüm bunun düzeltilmiş olmasına bağlı.
2. **Paket B** (Y05+Y04+Y06) — ilk indirme 3,90 → ~0,96 MB, bir hata
   kapanıyor, bir oturum.
3. **Paket A** (G01+G02+G06) — M6'nın görsel borçları kapanıyor.
4. **Paket F** (Y10 ölçüm oturumu) — "yayın öncesi zorunlu" denen
   geçit hâlâ koşulmadı; Y02 ve Y11'in kararlarını da açıyor.
5. **Bekçi kuralları** — Y03'ün i18n kontrolü, Y13'ün `paths[0]`
   kontrolü, Y08'in havuz sıfırlama kontrolü. Üçü küçük ve üçü de
   2. ile 4. desenin kökünü kapatıyor.

Sonrası ölçüme ve önceliğe bağlı.

---

## Kapsanmayanlar

Dürüstlük adına, bu taramanın **bakmadığı** yerler:

- `systems/balanceChecks.ts` (490 satır) ve `data/waves.ts` — denge
  formüllerinin kendisi. `M3`-`M7` sonuç dosyaları bunları zaten
  ölçmüş; yeniden denetlemek ayrı bir iş.
- Dalga kompozisyonu ve zorluk eğrisi — oyun tasarımı sorusu, kod
  taraması cevaplamıyor.
- Gerçek cihazda oynanabilirlik — S15'in vekili bile koşulmadı (Y10).
- Dokunmatik cihazda **canlı** doğrulama — girdi kodu doğru görünüyor
  ama gerçek bir telefonda denenmedi.

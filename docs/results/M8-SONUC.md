# `M8` — Genişleme: sonuç defteri

15 faz, hepsi bitti. Bu dosya **ne yapıldığını** değil, **ölçümün neyi
değiştirdiğini** kaydeder; faz faz ayrıntı `docs/plan/M8-genisleme.md`
içindeki "Sonuç" bölümlerinde.

## Oyunun M8 öncesi/sonrası hâli

| | Önce | Sonra |
|---|---|---|
| Harita | 3 | **5** |
| Dalga (elle yazılmış) | 30 | **50** |
| Oyun modu | kampanya | kampanya + **sonsuz** |
| Zorluk | tek | **üç** (Kolay / Normal / Zor) |
| Başarım | yok | **12** |
| İlk indirme | 1,10 MB | **0,93 MB** |
| Test | 777 | **864** |
| Ayar | 5 | **8** (müzik/efekt sesi ayrı, zorluk) |

## Ölçümün planı değiştirdiği yerler

Bu tastaki en değerli çıktı bu liste. Her satırda plan bir şey
öngörüyordu, ölçüm başka bir şey söyledi ve **ölçüm kazandı**.

### 1. Monoton çarpan ≠ monoton zorluk (`M8-T04`)

Harita 4'ün çarpanları monotonluk kuralıyla seçildi (hp 3,4). Simülasyon
o değerlerle **sıfır** can kaybı verdi — harita 2 (6) ve 3'ten (10) kolay.
Sebep geometri: tek yolda 12 noktanın **hepsi** aynı yolu görüyor,
harita 2-3'te savunma iki kola bölünüyordu.

→ Ölçüt girdiden (çarpan) **çıktıya** (ölçülen can kaybı) taşındı ve
`kisitB.test.ts` bunu haritalar boyunca monoton olarak doğruluyor.

### 2. "Zor" bir HP çarpanı olamadı (`M8-T11`, S80)

Plan "referans tahtayla beş haritanın da geçilebildiği en yüksek 0,05
adımı" diyordu. **Cevap 1,00 çıktı** — öyle bir adım yok, çünkü haritalar
zaten "referans tahta 20 canın altında kalsın" ölçütüyle ayarlandı.

Dahası: HP çarpanı **boss'u hiç etkilemiyordu** (`BOSS_HP_BY_MAP` mutlak
ve `bossFor` `hpMultiplier`'a bölüyor). Doğum anındaki çarpanla
ölçüldüğünde ×1,10 harita 1'in bossunu Kısıt A tavanının üstüne çıkarıyor
— **öğretici harita geçilemez** hâle geliyor.

→ Zor artık canı kısıyor (20 → 12). Can, Kısıt A'ya ve boss türetmesine
hiç girmiyor: hiçbir düşmanı öldürülemez yapmadan hata payını daraltıyor.

### 3. `budget(n)` sonsuza ölçeklenmiyordu (`M8-T06`)

%20'lik büyüme dalga 30'da ~1900 puan eder; en ucuz düşman 1 puan olduğu
için bu tek dalgada 1900 düşman demek. Havuz 60 ve `WaveManager` havuz
dolunca **erteliyor** — dalga hiç bitmez, oyun kilitlenirdi.

→ Zorluk iki kola ayrıldı: bütçe %8 büyüyor + **beden** tavanı; tavan
bağlayınca kalanı HP çarpanı taşıyor.

### 4. `patlat()` yönü alıyor ama kullanmıyordu (`M8-T08`)

`Particles.patlat` açıyı hesaplayıp `void aci` ile atıyordu. Çağıranlar
yönü zaten doğru veriyordu. Tek satırlık bir "kullan" değişikliği, o fazda
yazılan bütün yeni efektlerden çok şey kazandırdı — ve hemen bir yan etki
doğurdu (patlamalar dar koniye düştü), o da ölçülüp düzeltildi.

### 5. Canlı ekranın ölçümün göremediği dört hatası

Kapsama, bütçe, Kısıt A/B testlerinin hiçbiri **HUD'u** bilmiyor:

- Harita 5'in iki girişi de HUD'un altından giriyordu (kartuş, erken-başlat
  rozeti, yetenek düğmeleri — üçü de ayrı turda).
- Harita 4'ün bir yapı noktası kartuşun tam altındaydı: görülemiyor ve
  tıklanamıyordu. Testler yeşildi.
- Kazanılmış yıldızın atlas karesi **içi mürekkep dolgu**; mürekkep zeminde
  boş görünüyordu. **Üç** ayrı ekranda aynı hata (seviye seçim, başarım
  listesi, oyun sonu) — üçüncüsü doğrulama turunda çıktı.
- Zorluk rozeti düz metinken harita zemininde **bulunamıyordu**.

→ `maps.test.ts` artık "hiçbir yapı noktası kalıcı bir HUD kutusuyla
çakışmıyor" testini taşıyor; HUD kutuları canlı `getBounds()` ile ölçüldü.

## Kapanan açık sorular

| # | Cevap |
|---|---|
| S77 | Harita 4: hp 4,4 / altın 4,4 · Harita 5: 6,8 / 6,8 — **can kaybı taramasıyla** |
| S78 | İkisinde de zırh **2**; tarama tavanı yalnız %12 oynatıyor, bağlayıcı kısıt değil |
| S79 | Sonsuzda boss her 10. dalga (20, 30, 40…) |
| S80 | **Zor çarpan değil, can kısıyor** (yukarıda) |

## Açık kalanlar

| Konu | Durum |
|---|---|
| `M8-P01`/`P02` harita 4-5 arka planı | **Geçici görsel** oyunda; brif `docs/plan/M8-sanat-brifi.md` |
| `M8-P03` üç ses | **Üçünün de kod tarafı bağlı**, yalnız dosyalar bekliyor |
| `M8-B01` yolların HUD altından geçmesi | **Kapandı** — HUD yerleşimi taranarak çözüldü, harita geometrisine dokunulmadı (aşağıda) |
| `Y11` Phaser özel yapımı | Ölçülmüş ara kazanç alındı (−%9,2); webpack yapımı hâlâ açık |
| `Y10` / `Y02` adım 3 | Kullanıcının DevTools CPU kısıtlama ölçümünü bekliyor |
| Toplanma noktası **sürükleme** jesti | Tarayıcı panelinde sınanamadı; dokunmayla taşıma eklendi ve sınandı |

## M8 sonrası doğrulama turu (aynı gece)

Plan bitince uçtan uca bir hata avı yapıldı. Bulunanlar:

### Gerçek hatalar (düzeltildi)

1. **Dinleyici sızıntısı.** `OrientationGate` `scale.on(RESIZE)` ve
   `OverlayScene` `scale.on(FULLSCREEN_UNSUPPORTED)` kaydediyor, hiçbiri
   kaldırılmıyordu. `scale` **oyun geneli** bir yayıcı — sahne kapanışı
   onu temizlemiyor. `Overlay` dil değişiminde yeniden kurulduğu için her
   dil değişimi bir dinleyici daha bırakıyordu (ölçüldü: dört yeniden
   kurulumda 13 → 17). Düzeltildikten sonra beş yeniden kurulumda 13 → 13.
2. **Yıldız okunmuyor — üçüncü kez.** Kazanılmış yıldızın atlas karesi
   altın konturlu ama içi mürekkep dolgu; mürekkep zeminde boş görünüyor.
   `M8-T04` (seviye seçim) ve `M8-T07` (başarım listesi) turlarında
   çözülmüştü; **oyun sonu ekranı** atlanmıştı ve gerçek bir zaferde
   ★★☆ yerine üç boş yıldız göründü.
3. **Dil değişimi `Overlay`'i güncellemiyordu** — arayüz İngilizceye
   geçerken tam ekran düğmesi "Tam ekran" kalıyordu.

### Ölçülen ama hata olmayanlar

- **Sekiz noktaya da okçu koyan otomatik oyuncu dalga 10'da kaybetti**
  (boss zırh 10, okçu fiziksel). Aynı otomat karışık tahtayla (büyü/top/
  okçu) **19/20 canla kazandı**. Tek aileye yığmak cezalandırılıyor —
  tasarımın çalıştığının kanıtı.
- **Sonsuz modun eğrisi ~40. dalgada düzleşiyor** (pencere ortalamaları
  7,2 → 32,7 → 40,1 → ~42 ve sabit). Doyum değeri başlangıç canının iki
  katı olduğu için oyuncunun hiç göremeyeceği bir bölgede; ölçüm
  `data/endless.ts` başlığına ve `endlessSim.test.ts`'e yazıldı.
- **Sahne yeniden başlatma temiz**: altı `Game` yeniden başlatmasında
  shutdown dinleyicisi 13'te, havuz kapasitesi 60'ta sabit, `bus.clear()`
  başlatma başına tam bir kez.

### Araç kaynaklı, oyun hatası olmayan üç şey

Browser pane'in `left_click_drag`'i Phaser'ın girdi sistemine hiç
ulaşmıyor; `computer.key` olayları `keyCode` taşımadığı için ESC
duraklatmayı tetiklemiyor (elle `keyCode` verilen olayla **çalışıyor**);
konsol tamponu sekme başına olduğu için eski dev oturumunun hataları yeni
sanılabiliyor. Üçü de doğrulandı ve ayrı tutuldu — hiçbiri için kod
değiştirilmedi.

### Yeni testler

| Dosya | Ne sınıyor |
|---|---|
| `kayitPaylasimi.test.ts` | **Beş sistemin** aynı `localStorage` anahtarını bozmadan paylaşması |
| `endlessSim.test.ts` | Üretilen sonsuz dalgaların **oynandığında** ne yaptığı |

Test sayısı 855 → **864**.

## Yayın paketi

`npm run package:itch` → `kale-nobeti-itch.zip` (5,15 MB, 36 dosya,
kökte `index.html`, zip geçerliliği doğrulandı).

**Üretim yapısı dört seviye derin bir yoldan açıldı** ve bütün varlıklar
200 döndü (`base: './'` sağlaması). Konsol **tamamen sessiz** — temiz bir
sekmede tek bir mesaj yok.

İki dilde geçilen QA: menü, ayarlar (altı satır), seviye seçim (zorluk
satırı, beş kart, kilit metni), harita, yapı menüsü, rol şeridi, öğretici
ipucu. Türkçe ve İngilizce ekranlarda çeviri boşluğu görülmedi.

## `M8-B01` — HUD yerleşimi taramayla çözüldü

Kusur: harita 3'ün sağ girişi `y = 120`'de, yol şeridi 48 px
(`MapRenderer.PATH_WIDTH`) yani **96-144**; ayar düğmesi `y = 116`'daydı
(kutu 88-144). Düşman ekrana girdiği anda bir arayüz düğmesinin
**arkasından** yürüyordu. 865 testin hiçbiri göremedi — kapsama, bütçe ve
Kısıt A/B testlerinin hiçbiri HUD'u bilmiyor.

İki seçenek vardı: üç haritanın ölçülmüş geometrisini yeniden türetmek ya
da HUD'u taşımak. **Ölçüm ikincisini mümkün kıldı.** Beş haritanın bütün
yolları, yapı noktaları ve kaleleri taranınca sağ kenarda (`x = 1232`)
56×56'lık bir düğmeye yer kalan yalnız **üç cep** olduğu çıktı:

| Cep | Ne kondu |
|---|---|
| `30-68` | hız düğmesi (48) |
| `172-196` | ayar düğmesi (180) |
| `654-700` | **hiçbir şey** — harita 5'in kalesine `(1180, 600)` 2 px kalıyordu |

Yani sağ kenar dolu. Kalan iki öğe ölçümün gösterdiği yere gitti:

- **Zorluk rozeti** üst şeride, hız düğmesinin soluna (`1120, 42`). Üst
  şerit `x = 362`'den sağa tamamen boş; boss can çubuğu (460-820) ile de
  çakışmıyor.
- **Tam ekran düğmesi** `(888, 664)` — bütün ekran tarandığında
  düğme + etiket kutusunun (80×78) her harita öğesinden ve her HUD
  kutusundan en uzak durabildiği nokta, **45 px** payla. Sağ alt köşede en
  iyi pay 12 px.

Alt orta bir tam ekran düğmesi alışılmadık; ama beş haritanın yolları
köşeleri kullanıyor ve ölçüm alışkanlığı yendi.

### Taramanın kendi hatası

İlk tarama kutuyu **yalnız düğme** (56×56) saydı ve kazanan noktada
etiket ekranın alt kenarından taştı — canlı ekran görüntüsünde kırpık
göründü. Kutu `düğme + etiket` (80×78) yapılıp yeniden tarandı.

### Ölçümün yine göremediği şey

Yeni yerinde tam ekran etiketi harita 5'in koyu yeşil zemininde
**okunmuyordu**: soluk altın (`#8A7250`) düz metin, çerçevesiz. Aynı
sorun yetenek düğmelerinin "Meteor"/"Takviye" etiketlerinde de vardı ve
oradaydı zaten. İkisi de menü alt başlığında çözülmüş olan yolla
düzeltildi: parşömen rengi (`#E4D3A8`) + mürekkep gölge.

### Bilerek kapatılmayan

Soldaki kartuş harita 1/3/4'ün giriş yolunun ilk pikselleriyle köşede
kesişiyor. Orası ekranın köşesi, düşman kartuşun altından değil yanından
çıkıyor ve tür standardı. Düzeltmek üç haritanın yolunu yeniden çizmek
demekti; yeni yol testi bu yüzden yalnız sağ ve alt kutuları kapsıyor —
kartuş listeye alınsaydı test bir kusuru değil **bir kararı** kırardı.

### Yeni test

`maps.test.ts` artık "sağdaki ve alttaki HUD kutularının altından hiçbir
yol geçmiyor" diyor (parça-dikdörtgen mesafesi, eşik 24 = şeridin yarısı,
uçan hatlar dahil). Eski ayar konumu geri konduğunda **kırıldığı
doğrulandı**. Test sayısı 866.

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
| Test | 777 | **855** |
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
  boş görünüyordu. İki ayrı ekranda (seviye seçim, başarımlar) aynı hata.
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
| `M8-P03` üç ses | `countdown_tick`/`boss_music` **kod tarafında bağlı**, dosya bekliyor; `ui_click` kod tarafı da bekliyor |
| `M8-B01` yolların HUD altından geçmesi | Harita 1, 3, 4'ün girişleri; geometri ya da HUD yerleşimi değişmeli |
| `Y11` Phaser özel yapımı | Ölçülmüş ara kazanç alındı (−%9,2); webpack yapımı hâlâ açık |
| `Y10` / `Y02` adım 3 | Kullanıcının DevTools CPU kısıtlama ölçümünü bekliyor |
| Toplanma noktası **sürükleme** jesti | Tarayıcı panelinde sınanamadı; dokunmayla taşıma eklendi ve sınandı |

## Yayın paketi

`npm run package:itch` → `kale-nobeti-itch.zip` (5,15 MB, 36 dosya,
kökte `index.html`, zip geçerliliği doğrulandı).

**Üretim yapısı dört seviye derin bir yoldan açıldı** ve bütün varlıklar
200 döndü (`base: './'` sağlaması). Konsol **tamamen sessiz** — temiz bir
sekmede tek bir mesaj yok.

İki dilde geçilen QA: menü, ayarlar (altı satır), seviye seçim (zorluk
satırı, beş kart, kilit metni), harita, yapı menüsü, rol şeridi, öğretici
ipucu. Türkçe ve İngilizce ekranlarda çeviri boşluğu görülmedi.

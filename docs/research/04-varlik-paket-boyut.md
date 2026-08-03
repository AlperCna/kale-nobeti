# 04 — Varlıklar, Formatlar ve Paket Boyutu

Hedef: ilk indirme **≤ 8 MB** (Poki), tercihen **≤ 5 MB** (güvenli marj ve
CrazyGames mobil ana sayfası için manevra alanı).

---

## 1. Görüntü formatı

`CLAUDE.md` sadece `atlas.png` diyor. Format kararı yazılmamış ve bu, bütçenin
en büyük kalemi.

### Doğrulanmış durum (2026)

- **AVIF** artık tüm büyük tarayıcılarda destekleniyor: Chrome 85+,
  Firefox 93+, Safari 16+, Edge 121+. **[T]**
- **AVIF boyutta WebP'yi yeniyor ama kodlaması belirgin şekilde yavaş.**
  2026 ortası itibarıyla WebP kodlaması hâlâ çok daha hızlı; derleme
  sırasında görüntü üretiyorsan bu fark ediyor. **[T]**
- Oyun geliştirmede WebP ile **%60-80 daha küçük** dosya boyutu tipik. **[T]**

### Karar önerisi

| Varlık | Format | Gerekçe |
|---|---|---|
| Arka planlar (3×) | **WebP, kayıplı q80** | Opak, alfa gerekmiyor. PNG-24'te 1.5-2 MB → WebP'de 250-400 KB |
| `atlas.png` | **PNG-8 veya WebP kayıpsız** | Alfa gerekli. Keskin kenarlı sprite'lar kayıplıda bozulur |
| Bitmap font dokusu | **PNG-8** | Küçük, keskin |
| UI/tezhip çerçeve | atlas içinde | |

**AVIF'i şimdilik kullanma.** Kazanç WebP'ye göre marjinal (~%15-20), Safari 16
altı kullanıcıları düşürüyor ve derleme süresini uzatıyor. WebP zaten hedefi
tutturuyor.

> Phaser WebP'yi doğrudan yükler (`this.load.image('bg', 'bg.webp')`),
> tarayıcı desteğine dayanır. Ek yapılandırma gerekmez.

---

## 2. Ses formatı

`CLAUDE.md` `.m4a` + `.ogg` çifti diyor. Bu klasik çift ve **hâlâ doğru**:
Safari `.ogg`/Vorbis'i uzun süre desteklemedi, `.m4a`/AAC her yerde çalışıyor.

Phaser her iki yolu da kabul eder ve tarayıcıya göre seçer:

```ts
this.load.audio('shot_archer', ['audio/shot_archer.m4a', 'audio/shot_archer.ogg']);
```

**Ama çift dosya paketi iki katına çıkarıyor.** Ses efektleri küçük olduğu için
sorun değil; **müzik için sorun.** İki müzik parçası × iki format = dört dosya.

Öneriler:
- **Ses efektleri:** yalnızca `.m4a`. AAC her hedef tarayıcıda var
  (CrazyGames Chrome/Edge/Safari hedefliyor). `.ogg` kopyasını at → %50 tasarruf.
- **Müzik:** `.m4a` 96 kbps mono. Döngülü oyun müziği için fazlasıyla yeterli.
  Bir dakikalık parça ≈ 700 KB. İki parça ≈ 1.4 MB.
- **Müzik ilk pakette olmasın.** Doküman zaten "ilk dalgadan sonra yüklenir"
  diyor — doğru karar, korunmalı.

---

## 3. Font bütçesi

`GAME-DESIGN.md` §2 üç aile istiyor: Grenze Gotisch, Spectral, Inter Tight.

`02-phaser-teknik.md` §1'in sonucu: **sayılar bitmap font olmak zorunda**,
yani Inter Tight bir web fontu olarak indirilmeyecek.

| Font | Biçim | Alt küme | Tahmini boyut |
|---|---|---|---|
| Grenze Gotisch (yalnız 700) | woff2 | Latin + Türkçe, yalnız büyük harf yeterli olabilir | ~15-25 KB |
| Spectral (400 + 600) | woff2 | Latin + Türkçe | ~35-50 KB |
| Sayı fontu | PNG bitmap | 0-9, `+ - . / % ×` | ~8-15 KB |
| **Toplam** | | | **~60-90 KB** |

Sorun değil. Ama iki uyarı:

1. **Türkçe karakterler alt kümede olmalı** (`ı ğ ü ş ö ç İ Ğ Ü Ş Ö Ç`).
   Standart "latin" alt kümesi `ı` ve `ğ` içermez — `latin-ext` gerekir.
   Bu unutulursa arayüzde kutucuklar çıkar.
2. Değişken font (variable font) kullanma. Tek ağırlık statik woff2, değişken
   fontun tüm eksenini indirmekten küçük.

---

## 4. Paket bütçesi taslağı

8 MB hedefe göre gerçekçi dağılım:

| Kalem | Bütçe | Not |
|---|---|---|
| Phaser 3 (minified + gzip) | ~900 KB | Ağaç sallama sınırlı; tam paket |
| Oyun kodu | ~150 KB | 3-6 bin satır TS → küçük |
| `atlas.png` (kule/düşman/mermi/UI/parçacık) | ~1.2 MB | 2048×2048 PNG-8 |
| Arka plan ×3 (WebP q80) | ~1.0 MB | 330 KB/adet |
| Fontlar | ~90 KB | §3 |
| Ses efektleri (~20 adet, m4a) | ~400 KB | 20 KB/adet |
| **İlk indirme toplamı** | **~3.8 MB** | **Hedefin çok altında** |
| Müzik (sonradan) | ~1.4 MB | İlk indirmeye sayılmaz |

**Sonuç: 8 MB rahat tutuluyor, hatta 5 MB bile.** Asıl risk arka planların
PNG olarak kalması — üç tane PNG-24 arka plan tek başına 4-6 MB eder ve
bütçeyi patlatır. Format kararı `CLAUDE.md`'ye yazılmalı.

### Ek kısıt: dosya sayısı

CrazyGames **1500 dosya** sınırı koyuyor **[D]**. Atlas kullanıldığı için
sorun yok, ama sesler tek tek dosyaysa ~20-40 dosya. Toplam ~60 dosya
bekleniyor. Rahat.

---

## 5. `CLAUDE.md`'ye yazılacak kural

```
## Varlık formatları (pazarlıksız)

- Arka planlar: WebP, kayıplı q80, atlas DIŞINDA, ayrı dosya.
- Sprite/UI: tek `atlas.png`, PNG-8 (veya kayıpsız WebP), maks 2048×2048.
- Bitmap font: PNG-8 + .xml.
- Ses efektleri: yalnız .m4a (AAC). .ogg kopyası üretilmez.
- Müzik: .m4a 96 kbps mono, ilk dalgadan sonra yüklenir.
- Web fontları: statik woff2, tek ağırlık, latin-ext alt kümesi
  (Türkçe karakterler için ZORUNLU).
- Toplam doku sayısı ≤ 16 (Phaser multi-texture batching sınırı).

Her `npm run build` sonrası ilk indirme boyutu raporlanır. Eşik: 5 MB uyarı,
8 MB hata.
```

---

## 6. Aşamalı yükleme stratejisi

Poki'nin yaklaşımı belgelenmiş: **[T]**
> Hızlı erişimi yalnızca bir sıkıştırma sorunu değil bir tasarım sorunu
> olarak ele al: mümkün olan en küçük ilk oynanabilir parçayı gönder,
> isteğe bağlı seviyeleri, müziği, kozmetikleri ve yüksek çözünürlüklü
> varlıkları oyuncu başlayabildikten *sonra* yükle.

Kale Nöbeti'ne uyarlaması:

| Aşama | İçerik | Ne zaman |
|---|---|---|
| **1 — Açılış** | Phaser, kod, fontlar, menü arka planı, UI atlası | İlk indirme |
| **2 — Oyun** | Harita 1 arka planı, sprite atlası, ses efektleri | "Oyna"ya basınca |
| **3 — Arka plan** | Müzik | Dalga 1 bittikten sonra |
| **4 — Tembel** | Harita 2 ve 3 arka planları | O harita seçilince |

Bu bölünmeyle **ilk indirme ~1.5 MB'a** iner. Poki'nin "5 MB altı" iç hedefine
bile rahat girer ve CrazyGames mobil ana sayfa eşiğinin (20 MB) çok altında
kalır.

`ROADMAP.md` M6'da "boyut kontrolü" var; bu bölünme aslında **M0'da**
kurulmalı — `Preload` sahnesi baştan aşamalı tasarlanırsa sonradan bölmek
kolay, tek bir dev `preload()` yazılırsa sökmek zor.

---

## 7. Kenney varlıkları hakkında not

Önceki araştırmada Kenney'nin CC0 Tower Defense paketi temel olarak
öneriliyordu. `06-sanat-yonu.md` bu kararı ayrıntılı ele alıyor; buradaki
teknik kısmı:

- Kenney paketleri ayrı PNG'ler + hazır tilesheet olarak geliyor. **Hazır
  tilesheet'i kullanma** — kendi atlasını üret (`free-tex-packer`, ücretsiz),
  yalnızca gerçekten kullandığın kareleri koy. Hazır sheet'ler kullanılmayan
  yüzlerce karo içeriyor ve atlası gereksiz şişiriyor.
- Kenney sprite'ları genelde büyük çözünürlüklü. 1280×720 mantıksal
  çözünürlükte kule ~64 px, düşman ~40 px olacak. Varlıkları **hedef boyuta
  indirip** öyle paketle; ölçeklenmiş çizim hem bulanık hem pahalı.

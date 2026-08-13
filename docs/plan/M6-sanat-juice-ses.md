# M6 — Sanat, juice, ses

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M6 |
| **Görev** | 12 kod görevi + 4 üretim bloğu |
| **Kod yazma süresi** | ~8 sa — **takvim değil** |
| **Takvim bütçesi** | **3-4 hafta** (S50 = özgün silüet) |
| **Durum** | ▶ **5/12** — varlıktan bağımsız kod bitti, üretim blokları bekliyor |

> ## ⚠️ Bu taşa dakika tahmini verilmiyor
>
> Kod görevlerinin (`T`) süreleri yalnız **kod yazma** süresidir ve toplamı
> ~8 saattir. Ama bu taşın işinin çoğu kod değil: sanat üretimi, ses
> derleme, cila. Denetim ölçtü — M6 kod süresiyle takvim arasında **6 kat**
> fark var, çünkü ikisi farklı şey ölçüyor.
>
> **S50 kapandı: özgün silüet** (`GAME-DESIGN.md` §2 "Üretim seviyesi").
> Birimler koyu mürekkep silüet + tek vurgu + altın kontur; tezhip detayı
> yalnız çerçevede ve arka planda. Hazır varlık paketi kullanılmıyor.
> Takvim bu karara göre **3-4 hafta**.

## Kod dışı üretim blokları

`TASK-TEMPLATE.md`'nin 30-45 dk kuralı bunlara **geçerli değil**.
Süreleri gün cinsinden; kabul kriterleri bir kod görevinin girdisi olabilmesi.

**Somut üretim brifi:** [`M6-sanat-uretim-brifi.md`](M6-sanat-uretim-brifi.md)
— palet uygulaması, tam varlık listesi, ölçek kuralları, öncelik sırası
ve teslim yolu. Aşağıdaki tablo yalnız özet.

| Kimlik | Çıktı | Süre | Tüketen görev |
|---|---|---|---|
| `M6-P01` | 3 harita arka planı, hedef boyutta | 3-5 gün | `M6-T03` |
| `M6-P02` | HUD tezhip çerçevesi, kartuş, menzil çemberi | 2-3 gün | `M6-T04` |
| `M6-P03` | 16 kule kademesi silüeti | 3-4 gün | `M6-T02`, `M6-T06` |
| `M6-P04` | 9 düşman silüeti + ölüm karesi | 3-4 gün | `M6-T02`, `M6-T06` |

**Silüet kuralı** (`GAME-DESIGN.md` §2): iç detay yok, ayırt edilebilirlik
siluetten gelir. `P03` ve `P04` bu yüzden 3-4 günde bitebiliyor — işleme
yapılsaydı haftalar sürerdi.

**Denetim bulgusu:** `M6-T03` ve `M6-T06` daha önce girdisizdi — varlıkları
üreten görev yoktu. Bu dört blok o boşluğu kapatıyor.

Öncelik `ROADMAP.md` M6'daki sıra: `P02` → `P01` → juice → ses → `P03` → `P04`.
Düşman sprite'ları en sonda; 40 px'te (Poki ölçeğinde 20 px) detay zaten
görünmüyor (`research/06` §3).

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı (özellikle **Varlık formatları**, Görsel yön).
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/GAME-DESIGN.md` §2 (palet, tipografi, imza öğesi), §10 (juice),
   §12 (ses)
4. `docs/research/06-sanat-yonu.md` — **tamamı** (maliyet, üç seçenek, palet
   doğrulaması)
5. `docs/research/04-varlik-paket-boyut.md` §1-§6
6. `docs/research/02-phaser-teknik.md` §1 (`BitmapText`), §5 (atlas), §7 (havuz)

## 1. Amaç ve bitiş durumu

**Amaç:** Greybox katmanının üstüne kaplama. `ROADMAP.md` M6: **bu taş
kısmen kesilebilir** — oyun M5 sonunda zaten oynanabilir, M6 oynanışı
değiştirmeyen bir katman. Yayına M6'nın %60'ıyla da çıkılabilir.

**Öncelik sırası (`ROADMAP.md` M6):** HUD + menü + arka planlar → juice →
ses → kule sprite'ları → düşman sprite'ları. Düşman sprite'ları en sonda,
çünkü 40 px'te (Poki'nin 640×360 ölçeğinde 20 px) detay zaten görünmüyor
(`research/06` §3).

**Taş bittiğinde oyun:** tezhip çerçeveli HUD, üç harita arka planı, tüm
juice katmanı, ses efektleri ve iki müzik parçası, ayarlar menüsü.
Ses ve efektler **kapalıyken de oyun okunur**.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| **2 — paket boyutu** | `M6-T02`, `M6-T03`, `M6-T11` |
| **3 — havuzlama** | `M6-T09`, `M6-T10` |
| **6 — erişilebilirlik** | `M6-T12` (ilk kez tam devrede) |
| **7 — `BitmapText`** | `M6-T01` |
| 8 — ham `delta` | `M6-T07`, `M6-T08`, `M6-T09` |

---

## 2. Görevler

### M6-T01 — Nihai bitmap font

`M6-T01` · ☐ · ~35 dk · Önkoşul `M2-T08` · TIER 1 **k.7** · Açık soru —
· Doküman `GAME-DESIGN.md` §2 · `research/02` §1 · `research/04` §3

**Yapılacak**
- Inter Tight'tan bitmap font üret (SnowB BMF / Hiero). Karakterler:
  `0-9 + - . , / % × ×2 ›`.
- **Web fontu olarak indirilmez** — bitmap ürettiğin an paketten bir font
  dosyası düşüyor (`research/04` §3).
- `M2-T08`'in yer tutucu fontunun yerini alır.

**Kabul kriteri**
```bash
npm run build && ls -la public/assets/fonts/
```
Beklenen: `numbers.png` **≤ 15 KB**, `.xml` mevcut; `dist/` içinde
`Inter` adlı bir `woff2` **yok**.

**Bitmedi sayılır eğer:** Inter Tight hâlâ web fontu olarak yükleniyorsa.

---

### M6-T02 — Atlas üretim boru hattı

`M6-T02` · ☐ · ~40 dk · Önkoşul — · TIER 1 **k.2** · Açık soru S50
· Doküman `CLAUDE.md` Varlık formatları · `research/04` §4, §7 · `research/02` §5

**Yapılacak**
- `free-tex-packer` ile tek `atlas.png` (PNG-8, **maks 2048×2048**).
- **Kenney hazır tilesheet'i kullanma** — yalnız gerçekten kullanılan
  kareler paketlenir (`research/04` §7).
- Varlıklar hedef boyuta **indirilip** paketlenir; ölçeklenmiş çizim hem
  bulanık hem pahalı (`research/04` §7).
- Toplam doku sayısı ≤ 16 (`research/02` §5).
- **Sanat yönü kararı S50** — hangi seçenek (Kenney tabanı / özgün silüet /
  tam tezhip) bu görevin girdisini belirliyor.

**Kabul kriteri**
```bash
npm run build
```
Beklenen: `atlas.png` ≤ 2048×2048; ilk indirme raporu **≤ 5 MB**.

**Bitmedi sayılır eğer:** arka planlar atlasa girdiyse (`CLAUDE.md`
Varlık formatları: atlas **DIŞINDA**).

---

### M6-T03 — Arka planlar (WebP) ve aşamalı yükleme bağlantısı

`M6-T03` · ☐ · ~40 dk · Önkoşul `M6-T02`, `M0-T06` · TIER 1 **k.2** · Açık soru S50
· Doküman `CLAUDE.md` Varlık formatları · `research/04` §1, §6

**Yapılacak**
- Üç arka plan **WebP q80**, atlas dışında, ayrı dosya. PNG-24 kalırsa üçü
  tek başına bütçeyi patlatır (`research/04` §1).
- `M0-T06`'daki dört aşamaya bağla: harita 1 arka planı `queueGame`,
  harita 2-3 `queueLazy`.

**Kabul kriteri**
```bash
npm run build && du -h public/assets/bg/*.webp
```
Beklenen: her arka plan **≤ 400 KB**; ilk indirme raporu ≤ 2 MB
(harita 2-3 tembel yükleniyor).

**Bitmedi sayılır eğer:** üç arka plan da ilk indirmede yer alıyorsa.

---

### M6-T04 — Tezhip çerçeveli HUD

`M6-T04` · ☐ · ~45 dk · Önkoşul `M6-T02` · TIER 1 k.7, Platform · Açık soru —
· Doküman `GAME-DESIGN.md` §2 (imza öğesi, ölçeklenme kuralları) · `research/06` §3, §4

**Yapılacak**
- Parşömen şerit + köşelerde altın varak motifi (§2 imza öğesi).
- Menzil çemberi: **kesikli altın + mürekkep 1 px dış kontur** (§2 işlevsel
  düzeltme — kontursuz çember yoğun dalgada kayboluyor).
- Seçili kule altın kartuş içinde (§2).
- **Ölçeklenme kuralları (§2):** motiflerde minimum çizgi **2 px**;
  kesik ≥ 6 px, boşluk ≥ 4 px; vurgu ince çizgiyle değil **dolgu alanıyla**.
- `research/06` §3: kimliği çerçeve ve arka plan taşır, birimler sade kalır.

**Kabul kriteri**
```bash
npm run dev
```
gözle, üç ölçülebilir kontrol:
1. Tarayıcıyı **640×360**'a küçült — altın motiflerin her çizgisi hâlâ
   görünür (kaybolan veya titreyen çizgi **sıfır** olmalı).
2. En yoğun dalgada menzil çemberini aç — çemberin **tamamı** düşman
   siluetlerinin üstünde ayırt ediliyor (mürekkep konturu sayesinde).
3. Ekran görüntüsünü **gri tonlamaya** çevir — parşömen şerit ile altın
   motif arasındaki kontrast hâlâ ayırt edilebiliyor.

**Bitmedi sayılır eğer:** çerçeve motifleri yarı ölçekte kayboluyorsa.

---

### M6-T05 — Menü ve seviye seçim görselleri

`M6-T05` · ☐ · ~40 dk · Önkoşul `M6-T04` · TIER 1 Platform · Açık soru S50
· Doküman `GAME-DESIGN.md` §2 · `research/05` §1 (Poki küratörlüğü)

**Yapılacak**
- Menü ekranı ilk izlenim ve ekran görüntüsü — `research/06` §3'e göre
  **yüksek getirili, düşük maliyetli** (statik).
- Poki elle küratörlü ve "UX/his ve çekirdek döngü"ye bakıyor
  (`research/05` §1) — menü buranın ilk teması.
- Minimum yazı 16 px, dokunmatik hedef 44×44 px.

**Kabul kriteri**
```bash
npm run dev
```
gözle, üç ölçülebilir kontrol:
1. Menüde kullanılan **her renk** `GAME-DESIGN.md` §2'deki 6 renklik
   paletten (veya lapis açık varyantından) — palet dışı renk **sıfır**.
2. **640×360**'ta her metin okunur; en küçük yazı 1280×720 ölçeğinde
   **≥ 16 px**.
3. "Oyna" butonunun tıklama alanı **≥ 44×44 px** (devtools ile ölç).

**Bitmedi sayılır eğer:** menüde 16 px altında yazı varsa.

---

### M6-T06 — Kule ve düşman sprite'ları

`M6-T06` · ☐ · ~45 dk · Önkoşul `M6-T02` · TIER 1 k.2 · Açık soru S50
· Doküman `research/06` §3 (maliyet tablosu), §6 (renk körlüğü)

**Yapılacak**
- Greybox → sprite. 16 kule kademesi + 9 düşman.
- **Silüet odaklı** — 40 px'te tezhip detayı fiziken görünmüyor
  (`research/06` §3).
- **Düşman/dost ayrımı yalnız renge dayanmaz** (TIER 1 k.6,
  `research/06` §6): silüetler de farklı olmalı.

**Kabul kriteri**
```bash
npm run dev
```
gözle: 640×360 ölçeğinde düşman tipleri **silüetten** ayırt edilebiliyor;
gri tonlamalı ekran görüntüsünde de ayırt edilebiliyor (renk körlüğü testi).

**Bitmedi sayılır eğer:** iki düşman tipi yalnız renkle ayrılıyorsa.

---

### M6-T07 — `ScreenShake`

`M6-T07` · ☑ · ~35 dk · Önkoşul `M0-T04` · TIER 1 **k.6**, k.8 · Açık soru S55
· Doküman `GAME-DESIGN.md` §10

**Yapılacak**
- **Yönlü**, darbe vektörü boyunca; süre **0.12–0.25 sn**; üstel sönüm (§10).
- Yalnız top patlaması, boss vuruşu, can kaybında. **Her okçu atışında yok.**
- Ayarlardan kapatılabilir (TIER 1 k.6).
- 2× hızda kapanıyor mu — **S55**.

**Kabul kriteri**
```bash
npm run test -- ScreenShake
```
Beklenen: `≥ 3 passed` — süre `scaledDelta` ile tükeniyor; kapalıyken
kamera hiç oynamıyor; sönüm üstel.

**Bitmedi sayılır eğer:** sarsıntı rastgele yönlü ise (yönlü olmalı).

---

### M6-T08 — `HitStop`

`M6-T08` · ☑ · ~35 dk · Önkoşul `M0-T04` · TIER 1 k.8 · Açık soru S55
· Doküman `GAME-DESIGN.md` §10

**Yapılacak**
- **60–80 ms**, yalnız boss hasarı ve düşman ölümünde (§10).
- **2× hızda devre dışı** (§10: "2× hızda hit-stop kapalı").

**Kabul kriteri**
```bash
npm run test -- HitStop
```
Beklenen: `≥ 3 passed` — 1×'te duraklama var; **2×'te yok**; süre 80 ms'i
aşmıyor.

**Bitmedi sayılır eğer:** 2× hızda hit-stop çalışıyorsa.

---

### M6-T09 — Parçacıklar

`M6-T09` · ☑ · ~40 dk · Önkoşul `M6-T02` · TIER 1 **k.3**, k.6, k.8 · Açık soru S53
· Doküman `GAME-DESIGN.md` §10 · `research/02` §7

**Yapılacak**
- Darbe yönünde dışa; ilk kare parlak altın/vermilyon, hızla koyu duman/toza
  sönüm (§10).
- **Aynı anda en fazla 300 parçacık** (§10). Phaser'ın kendi parçacık sistemi
  zaten havuzlu — ayrı havuz yazma, `maxParticles` yeterli (`research/02` §7).
- Efekt yoğunluğu ayarı kademeleri **S53**.

**Kabul kriteri**
```bash
npm run dev
```
gözle: yoğun dalgada parçacık sayısı 300'ü aşmıyor (geliştirme sayacıyla);
efekt yoğunluğu kapalıyken hiç parçacık yok ve oyun **hâlâ okunur**.

**Bitmedi sayılır eğer:** parçacıklar için ayrı havuz yazıldıysa.

---

### M6-T10 — Altın uçuşu, vinyet, dalga sonu sayacı

`M6-T10` · ☑ · ~40 dk · Önkoşul `M6-T01`, `M6-T09` · TIER 1 k.3, k.7, k.8
· Açık soru — · Doküman `GAME-DESIGN.md` §10

**Yapılacak**
- **Altın uçuşu:** düşman ölünce altın ikonu HUD sayacına bezier ile uçar,
  varınca sayaç tick sesiyle artar (§10). İkonlar havuzlu.
- **Can kaybı:** ekran kenarında vermilyon vinyet nabzı, 400 ms (§10).
- **Dalga bitişi:** altın sayacı tek tek sayarak artar, anında değil (§10).
- **Kule yerleşimi:** toz halkası + 40 ms hafif zoom (§10).
- **Squash & stretch:** düşman ölürken 1.3× yatay ezilme, 120 ms (§10).

**Kabul kriteri**
```bash
npm run dev
```
gözle: beş efektin hepsi çalışıyor; 2× hızda süreleri de yarıya iniyor;
altın ikonu havuzu sızdırmıyor.

**Bitmedi sayılır eğer:** dalga sonu altını anında ekleniyorsa.

---

### M6-T11 — Ses efektleri ve müzik

`M6-T11` · ☐ · ~45 dk · Önkoşul `M0-T06` · TIER 1 **k.2** · Açık soru S51, S52
· Doküman `GAME-DESIGN.md` §12 · `research/04` §2, §6 · `research/05` §1

**Yapılacak**
- Her kule ailesinin ayrı atış sesi, **±%8 rastgele perde kayması**
  (tekdüzelik önler) (§12).
- Ölüm, altın, yerleştirme, yükseltme, hata, dalga başlangıcı, boss girişi,
  kazanma/kaybetme (§12).
- **Yalnız `.m4a`** (AAC). `.ogg` kopyası **üretilmez** (`CLAUDE.md`
  Varlık formatları — çift format paketi gereksiz büyütüyor).
- Müzik: 2 parça, `.m4a` **96 kbps mono**, **ilk dalgadan sonra yüklenir**
  (`queueBackground`).
- **Reklam oynarken ses kısılır** (§12, Poki şartı).
- Kaynak **S51/S52**.

**Kabul kriteri**
```bash
npm run build && find dist -name "*.ogg" | wc -l
```
Beklenen: `0`. İlk indirme raporu müziği içermiyor.
gözle: aynı kule arka arkaya ateş ederken sesler tıpatıp aynı duyulmuyor.

**Bitmedi sayılır eğer:** `.ogg` dosyaları üretilmişse veya müzik ilk
indirmede yer alıyorsa.

---

### M6-T12 — Ayarlar menüsü ve erişilebilirlik

`M6-T12` · ☑ · ~40 dk · Önkoşul `M6-T07`, `M6-T09`, `M6-T11` · TIER 1 **k.6**, k.10
· Açık soru S53, S54 · Doküman `GAME-DESIGN.md` §10 · `CLAUDE.md` TIER 1 k.6, k.10

**Yapılacak**
- Ayarlar: ses açık/kapalı, **ekran sarsıntısı**, **efekt yoğunluğu** (§10).
- `prefers-reduced-motion` **varsayılanı düşük yapar** (§10, TIER 1 k.6).
  Hangi kademeye ayarlayacağı **S54**.
- Tercihler `localStorage`'a **`try/catch` içinde** yazılır (TIER 1 k.10).
- Efekt yoğunluğu kademeleri **S53**.

**Kabul kriteri**
```bash
npm run dev
```
gözle: üç ayar da çalışıyor ve sayfa yenilendikten sonra korunuyor;
tarayıcıda "hareketi azalt" açıkken varsayılanlar düşük geliyor.
Gizli sekmede oyun **çöküyor mu** — çökmemeli.

**Bitmedi sayılır eğer:** `localStorage` erişimi `try/catch` dışındaysa.

---

## 3. AÇIK SORULAR

| # | Özet | Bloke ettiği görev |
|---|---|---|
| **S50** | **Sanat yönü kararı:** Kenney tabanı (~1 hafta, %60 kimlik) / özgün silüet (~3-4 hafta, %90) / tam tezhip (2-3 ay) — `research/06` §5 | `M6-T02`, `M6-T03`, `M6-T05`, `M6-T06` |
| S51 | Ses efektleri nereden? | `M6-T11` |
| S52 | Müzik nereden? | `M6-T11` |
| S53 | Efekt yoğunluğu ayarının kademeleri | `M6-T09`, `M6-T12` |
| S54 | `prefers-reduced-motion` hangi kademeye ayarlıyor? | `M6-T12` |
| S55 | Ekran sarsıntısı 2× hızda kapanıyor mu? | `M6-T07`, `M6-T08` |

> **S56 kapandı — kritik vuruş v1'den çıkarıldı.** Doküman iki yerde
> kritikten bahsediyordu ama mekanik hiç tanımlı değildi. Eklemek bir
> istatistik, bir rastgele atış ve denge varyansı getirir; karşılığı yok.
> `GAME-DESIGN.md` §3 hasar rengi artık **iki renk**.

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| **Sanat maliyeti taşı yutar** (`research/06` §1: Pentiment ~13 kişi) | `M6-T06` bir günü aşıyor | Öncelik sırası; M6 kısmen kesilebilir |
| İnce altın motifler yarı ölçekte kaybolur | 640×360'ta çerçeve titriyor | §2 ölçeklenme kuralları (2 px, dolgu) |
| Arka planlar PNG kalır | İlk indirme > 5 MB | `M6-T03` kabulü boyut ölçüyor |
| `.ogg` kopyaları paketi şişirir | `find dist -name "*.ogg"` boş değil | `M6-T11` kabulü |
| Parçacıklar 300'ü aşar | Yoğun dalgada FPS düşüşü | `maxParticles` + geliştirme sayacı |
| Hit-stop 2×'te açık kalır | Hızlandırılmış oyun okunmuyor | `M6-T08` testi |
| Renk körlüğünde düşmanlar ayırt edilemiyor | Gri tonlama testinde kayboluyor | `M6-T06` kabulü |

## 5. Taş sonu kontrol listesi

- [ ] `typecheck && test && build && guard` dördü de yeşil
- [ ] **Ses ve efektler kapalıyken de oyun okunur**
- [ ] Açıkken vuruşlar tatmin edici
- [ ] 2× hızda hit-stop kapalı, parçacık yoğunluğu yarı
- [ ] İlk indirme **≤ 5 MB**; müzik ve harita 2-3 arka planı içinde değil
- [ ] Hiç `.ogg` dosyası yok
- [ ] 640×360'ta HUD motifleri ve tüm yazılar okunur
- [ ] Gri tonlamada düşman tipleri ayırt edilebiliyor
- [ ] `prefers-reduced-motion` varsayılanları düşürüyor
- [ ] Ayarlar gizli sekmede de çökmüyor
- [ ] Silüet kuralına sadık kalındı — hiçbir birimde iç detay/işleme yok
      (`GAME-DESIGN.md` §2 "Üretim seviyesi")
- [ ] **`docs/results/M6-SONUC.md` yazıldı** — ilk indirme boyutu, hedef
      cihazda FPS, üretilen varlık sayısı ve atlas boyutu dahil.

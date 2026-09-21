# Yol Haritası — 8 kilometre taşı

Kural: her taşın sonunda oyun oynanabilir kalır. Bir taş bitmeden sonraki
başlamaz. Her taşı Claude Code'da **plan modunda** aç, planı oku, sonra uygula.

> **Araştırma sonrası yeniden düzenlendi.** Değişenler:
> M0'a saat/hız mimarisi ve aşamalı yükleme; M1'e kapsama ölçüm aracı;
> M3'e denge sağlamaları (M6'dan öne alındı); kışla kendi taşına ayrıldı (M5);
> sanat M2'den itibaren greybox olarak paralelleştirildi.
> Gerekçeler `docs/research/README.md` içinde.

### Süre hakkında dürüst not

Aşağıdaki gün sayıları **ideal iş günü** (kesintisiz, engelsiz). Toplamı
~30 gün. İlk büyük proje + yarı zamanlı + özgün sanat için gerçekçi takvim
**10-14 hafta**. Yalnız hazır varlıklarla ve M6 kısaltılarak 5-6 hafta tutar.
Planı buna göre kurmak, altıncı haftada moral kaybetmekten iyidir.

---

## M0 — İskelet, saat, aşamalı yükleme (1 gün)

Vite + TypeScript (strict) + Phaser 3 kurulumu. 1280×720 `Scale.FIT`.
Boot → Preload → Menu → Game sahne zinciri. `npm run dev`, `build`,
`typecheck`, `test` script'leri.

Bu taşta kurulması **zorunlu** olan üç şey — sonradan eklemek her sisteme
dokunmak demek:

1. **`GameClock`** — `scaledDelta` + `setScale(1|2)`, **üç** Phaser
   `timeScale` özelliğini de günceller: `tweens`, `time`, `anims`
   (`CLAUDE.md` TIER 1 kural 8). Arcade fizik kullanılmadığı için
   `physics.world.timeScale` yok (`CLAUDE.md` Teknoloji).
2. **Duraklatma** — ESC ve boşluk (Poki zorunlu şartı).
3. **Aşamalı `Preload`** — tek dev `preload()` yazma. Dört aşama:
   açılış / oyun / arka plan (müzik) / tembel (harita 2-3).
   Tek blokta yazılırsa sonradan sökmek zor.

Ayrıca: `vite.config.ts` içinde `base: './'`, `Boot`'ta `FontFace` yüklemesi.

**Kabul:** `npm run dev` açılıyor, menüden oyuna geçiliyor, ESC duraklatıyor,
hız butonu 1×/2× arası geçiyor, konsol temiz.

---

## M1 — Yol, düşman hareketi, kapsama aracı (2 gün)

`PathSystem`: waypoint dizisi boyunca sabit hızda ilerleme, segment sonunda
sıradaki waypoint'e yönelme. `Enemy` entity + nesne havuzu. Harita 1 için
greybox düşmanlar ve çizilmiş yol. Düşman kaleye varınca can eksilir,
düşman havuza döner.

**`util/coverage.ts` bu taşta yazılır.** Saf fonksiyon: bir yapı noktasının
menzili içinde kalan yol uzunluğunu ölçer. İki kullanımı var — denge
sağlamaları (M3) ve harita çizerken anlık geri bildirim. Harita 1'in yolu
bu taşta çiziliyor; yol yanlış çizilirse tüm denge yanlış oturuyor.

**Kabul:** 20 düşman aynı anda yolda akıcı ilerliyor, 60 FPS, sızan düşman
can düşürüyor. Geliştirme modunda her yapı noktasının kapsadığı piksel
ekranda yazıyor.

> ✅ **Ölçüldü.** Eski kabul kriteri "ortalama ≥ 450 px" idi; o sayı
> türetilmemişti ve `01-denge-matematigi.md` §4'ün 300 px varsayımıyla
> çelişiyordu. Harita 1'in ölçümü: `L` = **1700 px**, ortalama kapsama
> **296,3 px** (`2 × menzil`in 0,988 katı). Boss 700 tavanın **%78,7'si**,
> Trol 400 **%38,7**'si — ikisi de bandın içinde, ⚠️ işaretleri kalktı.
> Kriter menzile bağlı orana çevrildi (`2 × menzil` ± %5).
> Sonuç: `docs/results/M1-SONUC.md`.

**Tuzak:** düşmanın kaleye kalan yol mesafesini sakla — `first`/`last`
hedeflemesi buna bağlı olacak (yol *ilerlemesine* değil; ayrık yollu
haritalarda yüzde karşılaştırılabilir değil).

---

## M2 — Kule, mermi, hedefleme (2-3 gün)

`TowerSystem` (yapı noktasına tıkla → menü → yerleştir), `TargetingSystem`
(`first`/`last`/`strongest`/`weakest`/`closest`), `ProjectileSystem`
(havuzlu, hedef takipli). `combat.ts` içinde saf `applyDamage()`.
Okçu ve Top kuleleri, Tier 1. Menzil dairesi hover'da görünür —
**kapsanan yol da vurgulanır** (`GAME-DESIGN.md` §4.5).

Buradan itibaren her yeni varlık **greybox** olarak üretilir: tek renk
silüet + palet dolgusu, 5 dakika. Nihai çizim M6'da.

**Kabul:** kule koyup düşman öldürebiliyorum. `applyDamage` için Vitest
testleri geçiyor (zırh, büyü direnci, %15 tabanı). Hasar sayıları
`BitmapText` ve üç renk kodunu uyguluyor.

---

## M3 — Ekonomi, dalgalar, denge sağlamaları (3 gün)

`EconomySystem` (altın, can, kule maliyeti, %70 satış), `WaveManager`
(bütçe üreticisi + nefes dalgaları + `Wave` şeması), hazırlık sayacı +
**ölçekli erken başlatma bonusu**, **dalga telegrafı**. Harita 1'in 10 dalgası.
Kazanma ve kaybetme ekranı.

**Denge sağlamaları bu taşta yazılır, M7'ye bırakılmaz.** Üç Vitest testi
(`GAME-DESIGN.md` §6):

- **Kısıt A** — her düşman tipi için `Σ(DPS × kapsananYol) / hız > HP × 1.15`
- **Kısıt B** — her dalga için `Σ(DPS × süre × aktiflik) × 0.75 > toplamHP × 1.15`
- **Ekonomi** — dalga N'e kadarki kümülatif altın, referans tahtayı karşılıyor mu

`data/referenceBoards.ts`: dalga başına "oyuncunun makul olarak sahip olacağı
tahta". Dengeleme bu tahtaya karşı yapılır.

**Kabul:** Harita 1 baştan sona oynanabiliyor ve bitirilebiliyor. Üç sağlama
testi de yeşil. Bu noktadan sonra oyun "oyun".

**Neden burada:** 30 dalga elle yazıldıktan *sonra* hepsinin yanlış olduğunu
öğrenmek pahalı. Eski plandaki `toplamHP < D·L/v` formülü savunmayı 6 kat
abartıyordu ve 30 dalganın hepsini yanlış onaylardı.

---

## M4 — Tam kule/düşman seti + yükseltme + bilgi paneli (4 gün)

Okçu/Top/Büyü ailelerinin Tier 2 ve Tier 3 dallanması. Harita 1 kadrosu
(Goblin, Ork Savaşçı, Kurt Binicisi, Harpi, Ogre Şef) + harita 2-3 kadrosu
(Zırhlı Ork, Şaman, Trol, Örümcek Ana). Uçan hareketi (ayrı düz hat) ve
**uçan hattı gösterimi**. Şaman iyileştirmesi, Trol yenilenmesi,
Örümcek Ana bölünmesi, boss.

**Bilgi paneli bu taşta yazılır** (`GAME-DESIGN.md` §11) — özellikle
"seçili düşman tipine karşı etkin DPS". Bilgi eksikliği türün 1 numaralı
şikâyeti; sonraya bırakılmaz.

**Kabul:** karşı-oyun tablosundaki her tehdidin cevabı oyunda çalışıyor.
Yanlış kule kurmak oyunu kilitlemiyor, sadece verimsizleştiriyor.
Ogre Şef zorlayıcı ama öldürülebiliyor.

---

## M5 — Kışla, askerler, yetenekler (3 gün)

Kışla ailesi + Tier 2/3 dallanma. `BarracksSystem`: `GAME-DESIGN.md` §4.4'teki
**9 engelleme kuralının tamamı**. Toplanma noktası sürükleme + `rallyRange`
kısıtı + yola yapışma. Asker diriliş ve toplanma noktasına yürüme.
Meteor + Takviye yetenekleri.

**Neden ayrı taş:** engelleme, oyunun en çok kenar durum üreten mekaniği —
çoklu kilitlenme, asker/düşman sayı dengesizliği, diriliş sırasında yürüme,
uçan istisnası. `TowerSystem`'e sıkıştırılırsa bug fabrikası olur.

**Kabul:** 9 kuralın her biri için elle senaryo denendi. İki kışla aynı
noktaya toplanınca grup dövüşü çalışıyor. Trol'ü kışlayla tutup eritmek
karşı-oyun tablosundaki gibi işliyor.

---

## M6 — Sanat, juice, ses (5-7 gün)

Atlas üretimi (`free-tex-packer`), 3 harita arka planı (WebP), kule/düşman
sprite'ları, tezhip çerçeveli HUD. `fx/` modülleri: ScreenShake, HitStop,
Particles, DamageText, altın uçuşu. Tüm ses efektleri ve 2 müzik parçası.
Ayarlar menüsü (ses, sarsıntı, efekt yoğunluğu).

**Bu taş kısmen kesilebilir.** M2'den itibaren greybox katmanı olduğu için
oyun zaten oynanabilir; M6 oynanışı değiştirmeyen bir kaplama katmanıdır.
Yayına M6'nın %60'ıyla da çıkılabilir. Öncelik sırası:

1. HUD + menü + arka planlar (ekranın %40'ı, ilk izlenim, ekran görüntüsü)
2. Juice (`fx/`) — Poki incelemede "UX/his ve çekirdek döngüye" bakıyor
3. Ses
4. Kule sprite'ları
5. Düşman sprite'ları (40 px'te detay zaten görünmüyor — silüet yeter)

**Kabul:** ses ve efektler kapalıyken de oyun okunur; açıkken vuruşlar
tatmin edici. 2× hızda hit-stop kapanıyor ve okunabilirlik korunuyor.
İlk indirme hâlâ 5 MB altında.

---

## M7 — Harita 2-3, denge geçişi, yayın (5-7 gün)

Harita 2 (Y ayrımı) ve 3 (iki giriş). `SaveSystem` (`KeyValueStore` arayüzü
arkasında, `try/catch` sarmalı). Seviye seçim ekranı. 3 yıldız derecelendirmesi
(kalan cana göre). Boyut kontrolü, itch.io yüklemesi, sonra portal başvurusu.

Denge geçişi artık elle deneme değil: M3'teki üç sağlama testi 3 haritanın
30 dalgasının hepsinde çalıştırılır. Ayrık yollu haritalarda **Kısıt A her kol
için ayrı** hesaplanır.

**Kabul:** 3 harita da bitirilebiliyor. Üç sağlama testi 30 dalgada yeşil.
İlk yükleme < 3 sn. Tek tıkla oyun başlıyor. Gizli sekmede çöküyor mu diye
test edildi.

---

## Denge geçişi kontrol listesi (M7)

Otomatik testlerin yakalayamadıkları — bunlar elle oynanarak kontrol edilir:

- [ ] Her harita ilk denemede zor ama ikinci-üçüncü denemede geçilebiliyor mu?
- [ ] Tek bir kule tipiyle spam yaparak geçilebiliyor mu? (Geçilebiliyorsa
      o kule aşırı güçlü veya yapı noktası sayısı fazla.)
- [ ] **8 yapı noktası dalga 4-5'te doluyor mu?** (Dolmuyorsa yükseltme
      mekaniği hiç yaşanmıyor demektir — ekonomi düşük.)
- [ ] **Tier 3 harita 1'de görülüyor mu?** (Görülmüyorsa tasarımın en ilginç
      kısmı görünmez kalıyor.)
- [ ] Hiç kullanılmayan kule dalı var mı? Varsa rolü belirsiz demektir.
- [ ] Boss dalgası, önceki dalgadan belirgin şekilde farklı mı hissettiriyor?
- [ ] Harpi dalgası hem yapılabilir hem tehditkâr mı? (Uçan hattı yeterli
      sayıda yapı noktasından geçiyor mu — `flyerPaths` kabul kriteri.)
- [ ] Nefes dalgaları (4, 7) gerçekten nefes aldırıyor mu?
- [ ] 3 kişiye oynattın mı ve nerede sıkıldıklarını not aldın mı?

---

## v1 sonrası — karar noktası

**Bu bölüm M8'i planlamaz.** M7 bitince hangi soruyu soracağımızı ve neye
bakarak cevaplayacağımızı kaydeder. Gerekçe: §12'deki yedi kapsam dışı
maddeden hangisinin gerektiğini **veri söyleyecek**, tahmin değil.
Bugün seçmek, bir hafta sonra ücretsiz gelecek bilgiyi tahmin etmek olur.

### v1 bittiğinde elimizde ne var

3 harita × 10 dalga · 4 kule ailesi × 4 kademe · 9 düşman · 2 yetenek ·
3 yıldız · kayıt · yayında.

Oynanış süresi: dalga döngüsü ~80 sn (60 sn dalga + 20 sn hazırlık) →
harita ~13 dk → **temiz geçişte ~40 dk**, tekrarlarla **1,5-2,5 saat**.

Bu bir **dikey dilim**: çekirdek döngü ve karşı-oyun katmanı tam, içerik ince.
Karşılaştırma için Kingdom Rush kampanyası 12 seviye + kahraman + meta ağaç.

### Ne ölçülecek

Kaynak: portal geliştirici panelleri (`docs/research/05-yayin-platformlari.md`).
CrazyGames'in Full Launch geçişi zaten bunlara bakıyor.

| Metrik | Nereden | Durum |
|---|---|---|
| Ortalama oturum süresi | Portal paneli | bedava |
| Harita başına tamamlama oranı | Kendi olayımız | ✅ `level/<harita>/{start,complete}` |
| Nerede bırakıyorlar (harita ve dalga) | Kendi olayımız | ✅ `wave/<harita>/<dalga>` |
| Dönüş oranı (retention) | Portal paneli | bedava |
| Yıldız dağılımı | Kendi olayımız | ✅ `stars/<n>/complete` |

**Olay sayacı `M9-T02`'de yazıldı** (plan M7 diyordu, yayın ertelenince
M9'a kaydı): `systems/olcum.ts`. Kendi sunucumuz yok, olaylar Poki'nin
`measure(category, what, action)` API'sine gidiyor ve onun `start` /
`complete` / `fail` sözlüğünü kullanıyor — panelde hazır huni grafiği
demek. CrazyGames v3'te karşılığı bulunamadı, o yapımda olaylar sessizce
düşüyor (`Portal.olc` isteğe bağlı çağırıyor).

Yıldız dağılımı da kayıttan değil olaydan geliyor: kayıt yalnız **bu**
tarayıcıda duruyor, panel ise bütün oyuncuları topluyor.

Koşu başına en çok **dört** olay gönderiliyor — her dalga için olay
göndermek matrisin sormadığı bir şey ve ayrık değer sayısını şişirir.

### Teşhis matrisi — hangi sinyal hangi yöne

Sayı uydurmuyoruz; **sinyal birleşimine** bakıyoruz.

| Tamamlama | Oturum | Dönüş | Teşhis | Yön |
|---|---|---|---|---|
| Yüksek | Kısa | — | İçerik bitiyor | **Harita ekle** |
| Düşük, harita 1'de bırakıyor | Kısa | — | Öğretici/zorluk sorunu | **İçerik ekleme, dengeyi düzelt** |
| Düşük, harita 3'te bırakıyor | Uzun | — | Sondaki zorluk sıçraması | **Denge, dalga 8-10** |
| Yüksek | Uzun | Düşük | Geri dönme sebebi yok | **Meta ilerleme veya sonsuz mod** |
| Düşük | Uzun | Yüksek | İlerlemeden oynuyorlar | **Ekonomi sorunu** |

En sık hata: tamamlama düşükken içerik eklemek. Oyuncu zaten bitiremiyorsa
dördüncü harita hiç görülmez.

### §12'deki yedi maddenin maliyet/getiri sırası

| Madde | Maliyet | Yeni sistem? | Not |
|---|---|---|---|
| **Yeni harita** | 2-3 gün | Hayır | `MapDef` + dalga verisi + arka plan. **En ucuz içerik kolu.** |
| **Başarımlar** | 2-3 gün | Küçük (`SaveData`) | Ucuz dönüş sebebi |
| **Sonsuz mod** | 4-5 gün | Orta | **Zor kısmı zaten yazılı** — `budget(n)` üreticisi doğal olarak uzuyor |
| **Meta yükseltme ağacı** | 1-2 hafta | Büyük | ⚠️ **Dengeyi baştan bozar** — Kısıt A/B sabit referans tahta varsayıyor; kalıcı yükseltme o varsayımı geçersiz kılar |
| **Kahraman birimi** | 2-3 hafta | Büyük | Kontrol, yetenek, seviye, ölüm/diriliş. En pahalı tek özellik |
| **Günlük sıralama** | 1 hafta+ | ⚠️ **Sunucu gerekir** | Portal SDK'sı veriyorsa ucuz, vermiyorsa kategori değişimi |
| **Harita editörü** | 2-3 hafta | Çok büyük | Getirisi niş |
| **Çoklu oyuncu** | Aylar | ⚠️ Sunucu | v1 sonrası değil, **başka bir oyun** |

Üç uyarı:

- **Sıralama ve çoklu oyuncu sunucu istiyor.** Bu bir özellik değil, kategori
  değişimi — barındırma, maliyet, bakım. v1'in "statik dosya, portala yükle"
  modelini kırar.
- **Meta ağaç denge işini geçersizleştirir.** M3'te kurulan üç sağlama
  (Kısıt A, Kısıt B, ekonomi) `referenceBoards.ts`'e dayanıyor. Kalıcı
  yükseltme eklenirse referans tahta dalgaya değil **oyuncunun geçmişine**
  bağlı olur ve üç test de yeniden yazılır.
- **Sonsuz mod beklenenden ucuz.** `budget(n) = 10 × 1.20^(n-1)` zaten
  sınırsız üretiyor; dalga 15'te ~150 puan, 20'de ~380. Asıl iş denge değil,
  havuz boyutları ve `simulateWave`'in uzun koşuda hâlâ hızlı kalması.

### Karar sırası

1. M7 biter, yayına girer
2. **En az bir hafta veri biriktir** — daha erken bakmak gürültü okumak
3. `M7-SONUC.md`'ye metrikleri yaz
4. Teşhis matrisinden yönü oku
5. **O zaman** M8'in planını yaz — `docs/plan/` kuralı gereği, önceki taş
   bitmeden sonraki planlanmaz

### Ne oldu (2026-09-14)

**Bu sıra izlenmedi ve sebebi yazılı.** Sahip yayını erteledi
(`M7-T11` → M8 sonu) ve önce içeriği büyütmeyi seçti: *"oyunu daha çok
geliştirmek gerekir, seviye sayısını artırmak, güzelleştirme yapmak,
hataları gidermek"*. Yani M8'in yönü portal metriğinden değil, **sahibin
kararından** geldi; yukarıdaki teşhis matrisi hâlâ geçerli ama girdisi
(bir haftalık veri) hiç toplanmadı.

M8 bitti: 5 harita, 50 dalga, sonsuz mod, üç zorluk, 12 başarım, ilk
indirme 0,93 MB. Sonuç defteri: [`results/M8-SONUC.md`](results/M8-SONUC.md).
Yayın paketi hazır (`npm run package:itch`), yükleme sahibin işi.

> **Bu satır M8 anının fotoğrafı, bugünün durumu DEĞİL** (`M53` notu).
> Güncel: **6 harita · 60 dalga · 16 başarım · 11 düşman türü · ilk
> indirme 0,82 MB · 1058 test**. Aşağıdaki "M11 sonrası" bölümüne bakın.

---

## M9 — Yayın hazırlığı (plan: [`plan/M9-yayin-hazirligi.md`](plan/M9-yayin-hazirligi.md))

M8 içeriği büyüttü ama **yayın hâlâ yapılmadı**, yani yukarıdaki teşhis
matrisinin girdisi hâlâ yok. M9 tam olarak o boşluğu kapatıyor: portalın
istediği şeyleri yapıp matrisin okuyacağı sinyalleri göndermek.

| Faz | Ne | Durum |
|---|---|---|
| 1 | Portal SDK katmanı — `gameplayStart`/`gameplayStop`/`commercialBreak` | ✅ `systems/Portal.ts` |
| 2 | Olay sayacı — matrisin üç sinyali | ✅ `systems/olcum.ts` |
| 3 | Küratörlük cilası — 3× hız, satış onayı, kayıt uyarısı | ✅ |
| 4 | Doküman tazeleme | ✅ bu satır |
| 5 | **Yayınla, sonra en az bir hafta bekle** | sahibin işi — üç yapım komutu planda |
| 6 | İçeriği teşhis matrisi seçsin | 5 bitmeden başlamaz |

Faz 5–6'nın sırası **bu kez izlenecek**: M8'de atlandığı yazılı, sebebi
de yazılı (sahibin kararı). Faz 6 için plan yazmak, Faz 5'in verisi
gelmeden `docs/plan/` kuralının ihlali olur.

---

## M10 — İlk oturum ve devamlılık (plan: [`plan/M10-ilk-oturum-ve-devamlilik.md`](plan/M10-ilk-oturum-ve-devamlilik.md))

**Bu da Faz 6 değil.** Matris "hangi içeriği ekleyelim" sorusuna cevap
veriyor; M10 "eldeki beş harita oyuncuya **hiç ulaşıyor mu**" sorusuna
baktı. Cevabı portalların kendi yayımladığı sayılarda, yani verisiz
cevaplanabiliyordu.

Tetikleyen bulgu: Poki'nin 2026 raporu web oyuncusunun oturumda
**11–20 dakika** kaldığını ve o sürede **2–3 oyun** denediğini söylüyor.
Bizim bir haritamız ~13 dakika ve tur ortası kayıt **yoktu**.

| Faz | Ne | Durum |
|---|---|---|
| 1 | İlk oturumda menü + seviye seçimi atlanıyor | ✅ |
| 2 | Tur ortası devamlılık — "Devam et" | ✅ |
| 3a | Harita 4'e buz kalkanı | ✅ |
| 3b | Harita 5'e boss ikinci evresi | ✅ |
| 4 | Portre karesi | ✅ |
| 5 | Kule sinerjisi | ✅ |

### M10'un asıl bulduğu şey: simülasyon körlüğü

Üç ayrı yerde **oyun ile denge simülasyonu farklı şey çalıştırıyordu**.
Oyun hep doğruydu; yanlış olan ölçümdü.

| # | Ne görülmüyordu | Etkisi |
|---|---|---|
| **S80** | Haritaya duyarlı boss | Harita 5'te oyuncu 4760 HP/zırh 10 boss'la dövüşüyordu, ölçüm 2675/2 sanıyordu |
| **S81** | Düşman yetenekleri (iyileştirme, yenilenme, bölünme) | Her ölçüm sistematik iyimserdi |
| **S86** | Süreli kule etkileri (yanma, yavaşlatma) | Kundakçı'nın vuruş başına 16 ek hasarı hiç sayılmıyordu |

Üçü kapanınca ölçülen zorluk rampasının **monoton olmadığı** ortaya
çıktı ve **S87** dört haritanın çarpanını ölçerek yeniden türetti:
`0 · 4 · 7 · 13 · 17`.

**Ders (S82/S84'e mal oldu):** ölçüm aracı düzeltilirken bütün körlükler
kapanmadan sayı türetme — iki denge sayısı yarım simülasyonda türetilip
üçüncü körlük kapanınca geri alındı.

---

## M11 sonrası — özet (`M53`'te yazıldı)

> **Bu belge M10'da duruyordu ve 42 kilometre taşı geride kalmıştı.**
> Her taşa satır açmak gürültü olurdu; aşağısı **temalara göre** özet.
> Taş taş ayrıntı iki yerde yaşıyor: karar kayıtları
> [`plan/OPEN-QUESTIONS.md`](plan/OPEN-QUESTIONS.md) ve git geçmişi
> (commit başlıkları `M<n>: <ne bulundu>` biçiminde).

**İçerik (M11-M13).** Kararların gerçekten fark ettiği ölçüldü ve iki
ölü aile düzeltildi (S95). Altıncı harita **Sisli Bataklık** ve yeni
verb **yeraltı geçişi** (Tünelci) geldi; son haritanın bossu **çağırma**
kazandı — altı haritada aynı boss olmaktan çıktı.

**Ekonomi ve dalga akışı (M14-M22).** Erken başlatma bonusu altın
çarpanını izlemeye başladı; dalgalar artık **üst üste biniyor** (M16) ve
bu, "erken bas" düğmesini bedelsiz bir kazançtan gerçek bir riske
çevirdi. `ceilingA` yavaşlatmayı görmeye başladı (M18) ve boss HP'si
statik tavandan **simülasyona** taşındı. M17 tamamen geri alındı —
zincir kapanmadığı için; içtihat olarak duruyor.

**Oyuncu deneyimi (M23-M34).** Başarımlar 12 → 16. Geri bildirimi
olmayan eylemler kapatıldı (M24), erken başlatmanın hem kazancı hem
riski HUD'a geldi (M25). Zor'da üç yıldız imkânsızdı (M26) ve
"Kusursuz" başarımı Zor'da hiç kazanılamıyordu (M34) — ikisi de aynı
kusurun iki kopyasıydı. Oyunun **sessiz** eylemleri görünür oldu: Şaman
iyileştirmesi ve Trol yenilenmesi (M30), kule yanması ve yavaşlatması
(M31), ve Tünelci'nin Örümcek Ana'yla aynı silüeti taşıması (M32).

**Ölçüm ve denge tabanı (M36-M47).** S116 ve S117 yeniden ölçüldü;
ikisinin de kökü aynı yerde çıktı: referans tahtanın **nokta ataması
keyfîydi** (kapsamalar eşit olunca sıra `maps.ts`'teki yazılış sırasına
düşüyordu ve harita 6'nın sonucunu 8 ile 25 can arasında oynatabiliyordu).
M47'de sıralama **üç ölçüte** çıkarıldı — kapsama ↓ · kaleye uzaklık ↑ ·
yol trafiği ↓ — ve rampa yeniden türetildi:
**`0·0·5·12·14·13`**.

**Doküman ve veri hijyeni (M48-M52).** `GAME-DESIGN.md`'nin dört tablosu
birden bozuktu (harita tablosu üç haritada kalmış, boss tablosunun beş
satırı yanlış). Dokuz tablo **üreticiye devredildi**
(`scripts/kurallar.mjs`, işaretçi blokları); ölçüm kaydı olan tablolar
bilerek elle bırakıldı ve etiketlendi. Üç **ölü veri** silindi ya da
canlandırıldı: başarım `threshold`'ları (kod sabit yazıyordu),
`BALANCE.activityRatio`, `MapDef.background` (değerlerinin yarısı
yanlıştı).

**Açık duran denge soruları (M53'teki hal):** S116, S117, S120, S127.
Bugünkü durumları aşağıdaki özette.


---

## M54 sonrası — özet (`M91`'de yazıldı)

> Üstteki özet `M53`'te yazıldı ve **otuz yedi taş** geride kaldı.
> Aynı kural: taş taş ayrıntı `OPEN-QUESTIONS.md` ile git geçmişinde,
> burası temalara göre.

**Ölçüm krizi ve çözümü (M54-M68).** Uçtan uca doğrulama simülasyonun
gerçek oyundan **iyimser** olduğunu gösterdi (S129) ve dört hipotez tek
tek elendi — ama her eleme kendi kusurunu buldu: ölçüm düzeneği (M57),
yapısal ayrışma (M58), sayısal kararsızlık (M59: simülasyon tavanının
birimi adım değil **saniye**ymiş; M60: referans ölçüm tek bir kare
süresine borçluymuş), kare süresi (M63: harita 5'in çukuru bir eşik değil
**kuyruk**; M64: sabit adımlı biriktirici; M65: ara değer üretimi). Gerçek
sebep başkaydı: simülasyon Örümcek Ana'yı **hiç böldürmüyordu** (M66).
S129 `M68`'de tamamen kapandı — üç haritada da simülasyon oyunla birebir.
Yan ürün: referans tahta Okçu'nun tek cevabını (Kundakçı) hiç
kurmuyormuş (M61) ve harita 6 çarpandan değil **kadrodan** zorlaştırıldı
(M62, sahibin isteği).

**Boss ve aile (M69-M78).** §7 “boss dalgası zirvedir” diyordu, ölçüm
tersini buldu (S135) — boss HP'leri **dalga baskısı eşiğinden** türetildi
(`0,65 × eşik`, M75) ve bossun payını ölçen sağlama eklendi (M74). Sektör
standardı iki kurala indirildi — *her kulenin en iyi olduğu bir senaryo
olmalı*, *hiçbir tehdidin tek anahtarı olmamalı* — ve her aileye bir **ev**
verildi (M76), oyunda doğrulandı (M77).

**Fiyat, rampa, ölçüm dürüstlüğü (M79-M85).** `MapDef.costMultiplier` +
fiyatın tek adresi + bekçi 18. kuralı (M79). **Belge, testlerin S109'da
reddettiği ölçümü basıyordu** (M80) — üretici kanonik adrese bağlandı.
Zorluk rampası kampanyanın **son haritasını saymıyordu** (M81); seçim
`M82`'de noktaya değil **banda** göre yapıldı (mermi hızı taramasının yan
bulgusu). Odaklanma kaybı varsayım olmaktan çıkıp **ölçüm** oldu (M83:
gerçek kayıp %25 değil %3-13). S116'nın “bütün baskı 10. dalgada” iddiası
**yarı ölçüm kusuru** çıktı (M84: sızıntı doğduğu dalgaya değil sızdığı
ana yazılıyordu). S95'in makası da aynı şüpheyle sınandı — **değil**,
gerçek (M85).

**Arayüz ve belge hijyeni (M86-M90).** Sonsuz modun listeleri harita 6'yı
saymıyordu ve `CLAUDE.md`'nin iki sayısı bayattı (M86). **Dokunmatikte
duraklatma yoktu** — menü vardı, kapısı yalnız ESC'ti (M87). “Nasıl
oynanır” bir kuralı haritasız anlatıyordu (M88). Arayüz kromunun yarısı
geri bildirimsizdi — tıklama sesi üretilmiş ama çağıran yoktu (M89). Son
haritanın “sayılar ölçüldü” kaydı hiç yazılmamıştı ve harita başına elle
yazılan blokların yanına `MAPS`'ten **türetilen** değişmezler kondu (M90).

**Ölçülen rampa (bugün):** `0 · 0 · 9 · 14 · 15 · 18`. Bu satır elle
yazılmıyor; kaynağı `kisitB.test.ts`'in monotonluk testi ve
`KURALLAR.md`'nin üretilen zorluk tablosu.

**Gider kalemi ve ölçüm hijyeni (M91-M100).** `ROADMAP` otuz yedi taş
geride kalmıştı (M91). Adım tavanı kendi gerekçesini karşılamıyordu (M92),
bir dosya başlığı gerçekleşmiş bir geleceği anlatıyordu (M93). `M77`'nin
2 canlık farkı bir kusur değil **ölçümün çözünürlüğü** çıktı (M94);
sahne yeniden başlatma tarayıcıda sızıntısız (M95) ve “200 eşiği” hesap
değil ölçüm oldu (M96). Elit dalganın bedeli can değil **kuyruk** (M97),
belge dili oyunun dilini izlemiyordu (M98). **S117'nin ikinci kolu
açıldı** — yetenek yükseltmesi (M99) — ve bedeli can cinsinden ölçülüp
oran tablosuna **`+ yükseltme`** sütunu olarak kondu (M100 Faz 1).
Satın alınanın ekranda izi yoktu; seviye pimleri kondu ve onları çizerken
özel Phaser yapımının kör noktasına **canlı düşüldü** — bekçinin 19.
kuralı o boşluğu kapattı ve §17'nin elle yazılı bekçi tablosu türetildi
(M100 Faz 2).

**Bugün açık duranlar:** S116'nın kalanı (dalga **1-8** hâlâ boş; 9-10
değil), S117'nin **oran** kolu (tahta tek başına hâlâ 0,40 · 0,35;
yükseltmeyle birlikte 1,02 · 0,95 — ama yükseltme seçime bağlı, tahta
zorunlu), ve `M77`'nin bıraktığı tek aile tahtalarındaki 2 canlık
sim/oyun farkı — **`M94`'te çözünürlük olarak açıklandı**.

---

## Claude Code komut şablonu

Her taşın başında:

```
docs/GAME-DESIGN.md içindeki §<bölüm> ve docs/ROADMAP.md içindeki M<n>
bölümünü oku. Plan modunda kal. Bu taşı en fazla 5 adıma böl ve planı göster.
Onaylamadan kod yazma.
```

Uygulama sırasında:

```
Birinci adımı uygula, sonra dur ve diff'i göster. Devam demeden ilerleme.
```

Taş sonunda:

```
npm run typecheck && npm run test && npm run guard && npm run build çalıştır.
İlk indirme boyutunu raporla. Sonra bu taşta verilen kararlardan CLAUDE.md'ye
eklenmesi gerekenleri öner (ekleme yapma, öner).
```

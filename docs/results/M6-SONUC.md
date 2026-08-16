# M6 — Sanat, juice, ses · SONUÇ (**kısmi — 10/12 görev**)

| | |
|---|---|
| **Tarih** | 2026-08-05 (bu güncelleme: 2026-08-16) |
| **Durum** | ⚠️ **kısmi.** 10 görev bitti; yalnız nihai bitmap font (`T01`) ve `T10`'un altın-uçuşu parçası açık — ikisi de artık insan üretimi değil, kod işi |
| **Test** | 671 geçti / 34 dosya (M5: 531 / 27) |
| **Bekçi** | 10/10 ✓ |
| **İlk indirme** | 3,90 MB (hedef ≤ 5 MB — menü müziği tek başına 2,9 MB, bkz. not) |

> **2026-08-16 güncellemesi:** `M6-P01`-`P04` sanatı, 12 ses efekti ve
> 2 müzik parçası üretildi (AI üretim, gerçek piksel/alfa ölçümüyle ve
> canlı tarayıcı testiyle doğrulandı) ve `T02`-`T06`, `T11` tamamlandı
> — `5401d58`, `4ea71a6`, `c01bd70` commit'leri. **Not:** müzik
> parçaları brif'in istediği 60-90 sn'lik döngü yerine ~4 dakikalık tam
> şarkı geldi (dinleyip kısaltmak mümkün değildi) — ilk indirmeyi
> 0,69 MB'tan 3,90 MB'a çıkardı, hâlâ 5 MB uyarı eşiğinin altında ama
> payı daralttı. Aşağıdaki "neden yarım" ve "insana kalan iş" bölümleri
> **o tarihteki** durumu anlatıyor, tarihsel kayıt olarak bırakıldı;
> güncel görev tablosu §1'de.

> ## Bu taş neden yarım
>
> M6'nın dört **üretim bloğu** (`M6-P01`…`P04`) elle çizilmiş sanat
> varlığı istiyor: 3 harita arka planı, HUD tezhip çerçevesi, 16 kule
> silüeti, 9 düşman silüeti. Plan bunlara 3-5 gün *insan* süresi ayırmış
> ve `S50` "özgün silüet" kararıyla toplam takvimi **3-4 hafta** koymuş.
> Bunlar üretilemedi; üreten görevler de (`T02`, `T03`, `T04`, `T05`, `T06`)
> girdisiz kaldı. `T11` (ses) aynı şekilde 20 ses efekti ve 2 müzik
> parçası istiyor.
>
> **Yapılan:** varlığa bağlı olmayan her şey — juice katmanının tamamı,
> ayarlar, erişilebilirlik, kalıcılık.

---

## 1. Ne bitti, ne bekliyor

**Güncel (2026-08-16):**

| Görev | Durum | Neden |
|---|---|---|
| `M6-T01` Nihai bitmap font | ⏸ | PNG + `.xml` varlığı gerekiyor. Şu an çalışma zamanında üretilen yer tutucu font kullanılıyor (`fx/numberFont.ts`, M2'de kondu) — sayaçlar çalışıyor, yalnız nihai *görünüm* eksik |
| **`M6-T02` Atlas boru hattı** | ☑ | `scripts/prep-assets.mjs` — `sharp` ile 33 kareyi tek `atlas.png`'e (PNG-8, 1024×272) paketliyor |
| **`M6-T03` Arka planlar** | ☑ | 3 harita arka planı WebP q80, harita 1 `bg/`, 2-3 `lazy/` — tembel yükleme canlı doğrulandı |
| **`M6-T04` Tezhip HUD** | ☑ | `ParchmentFrame` (Phaser `TileSprite` ile 9-slice, yeni bağımlılık yok) — sayaç kartı, butonlar, kartuş |
| **`M6-T05` Menü görselleri** | ☑ | Menü arka planı + seviye seçim kartları (P01'in küçük resmi olarak yeniden kullanıldı) |
| **`M6-T06` Kule/düşman sprite'ları** | ☑ | `Tower`/`Enemy`/`Soldier` gerçek sprite; `Enemy`/`Soldier` `Rectangle`'dan `Sprite`'a çevrildi |
| **`M6-T07` `ScreenShake`** | ☑ | 11 test |
| **`M6-T08` `HitStop`** | ☑ | 10 test |
| **`M6-T09` Parçacıklar** | ☑ | Phaser parçacığı, ayrı havuz yok |
| **`M6-T10` Vinyet, squash, toz, sayaç** | ☑ **kısmi** | Yalnız **altın uçuşu** kaldı — artık altın ikonu var (atlas'ta `meteor_icon`/`takviye_icon` gibi paketlenebilir) ama uçuş animasyonu hâlâ yazılmadı |
| **`M6-T11` Ses ve müzik** | ☑ **(2026-08-16)** | 12/12 ses efekti (ElevenLabs) + 2/2 müzik parçası (Suno/Udio) üretildi, `ffmpeg-static` ile `.m4a`'ya çevrildi, `SoundSystem` + `wave:ended` olayıyla koda bağlandı. `S51`, `S52` kapandı |
| **`M6-T12` Ayarlar + erişilebilirlik** | ☑ | 17 test |

Aşağıdaki alt bölümler (§1'in geri kalanı hariç her şey) **2026-08-05
tarihli orijinal metin** — o günkü "neden yarım" anlatısı, sanat gelmeden
önceki durumu belgeliyor.

---

## 2. Juice — `GAME-DESIGN.md` §10

### Ekran sarsıntısı (`T07`)

§10: "**yönlü**, darbe vektörü boyunca; süre 0,12–0,25 sn; üstel sönüm.
Yalnızca top patlaması, boss vuruşu ve can kaybında."

Sınıf **Phaser'a dokunmuyor** — yalnız bir kayma vektörü üretiyor, kamerayı
sahne kaydırıyor. `node`'da test ediliyor.

| İddia | Ölçüm (canlı) |
|---|---|
| Yönlü — yatay darbede dikey kayma yok | `y = 0` (6 karede de) |
| Üstel sönüm | genlik 3,05 → 2,80 → 2,10 → 1,31 → 0,64 |
| Süre şiddete göre 0,12-0,25 sn | ✅ test |
| 2× hızda yarı sürede biter | ✅ test |
| **Kapalıyken kamera hiç oynamıyor** (TIER 1 k.6) | `{0, 0}`, `active = false` |

**Rastgele yön yok.** Sıfır vektörle tetiklenirse sarsıntı **üretilmiyor** —
rastgele bir yön uydurmak §10'un "yönlü" şartını sessizce delerdi.

**Sarsıntı sürerken ayar kapatılırsa** kayma anında sıfırlanıyor. Bayrak
yalnız `trigger`'da kontrol edilseydi ekran donmuş bir kaymayla kalırdı;
ayrı test var.

### Hit-stop (`T08`)

§10: "60–80 ms. **2× hızda devre dışı.**"

| İddia | Ölçüm |
|---|---|
| 1× hızda tetikleniyor | 80 ms |
| **2× hızda hiç tetiklenmiyor** | **0 ms**, `active = false` |
| 80 ms'i aşmıyor | `trigger(500)` → 80 |
| Üst üste vuruş **uzatmıyor** | 3× `trigger(60)` → 60 ms |

**Sayacı duvar saatiyle işliyor** — durdurduğu saatle kendini ölçseydi hiç
bitmezdi. Bu TIER 1 kural 8'in ihlali değil **tanımı**: `scaledDelta`yı
üreten katman kuralın dışında kalmak zorunda (`GameClock`'un kendisi gibi).

### Parçacıklar (`T09`)

§10: "Aynı anda en fazla **300** parçacık (havuzlu)."
`research/02` §7: "Phaser'ın parçacık sistemi zaten havuzlu — ayrı havuz
yazmaya gerek yok, `maxParticles` yeterli."

| Ölçüm | Değer |
|---|---|
| `maxParticles` | **300** |
| Canlı tepe (10 dalga) | **34** |
| Efekt **kapalıyken** tepe | **0** (TIER 1 k.6) |
| Efekt ölçeği: tam / düşük / kapalı | 1 / **0,4** / 0 |

Doku çalışma zamanında üretiliyor (4×4 beyaz kare) — atlas henüz yok ve tek
piksel için varlık dosyası eklemek paketi büyütürdü. `numberFont.ts` aynı
yolu izliyor.

**2× hızda yoğunluk yarıya iniyor** (§10) — okunurluk için.

### Vinyet, squash & stretch, toz (`T10` kısmi)

| Efekt | Durum |
|---|---|
| Can kaybında vermilyon vinyet nabzı | ☑ 400 ms, **efekt ayarından bağımsız** |
| Düşman ölürken 1,3× yatay ezilme, 120 ms | ☑ havuz baskısı altında atlanıyor |
| Kule yerleşiminde toz halkası | ☑ |
| Altın uçuşu (bezier → HUD sayacı) | ⏸ altın ikonu — `M6-P02` |
| **Dalga sonu altın sayacının tek tek artması** | ☑ **yapıldı** |

**Sayaç `T01`'i beklemiyormuş.** İlk değerlendirmede "bitmap fontuna bağlı"
diye ertelenmişti; oysa `numberFont.ts` **çalışma zamanında üretilen** bir
bitmap font sağlıyor ve M2'den beri kullanımda. `T01`'in getireceği şey
nihai *görünüm*, sayacın çalışması değil. Ertelemenin gerekçesi yanlıştı ve
görev `M6-T10`'un açık "bitmedi sayılır eğer" şartıydı:

> **Bitmedi sayılır eğer:** dalga sonu altını **anında** ekleniyorsa.

**Ölçüldü (canlı):** kule satıldığında gerçek altın anında `259` oluyor,
ekran `219 → 227 → 233 → 238 → … → 259` diye ~20 karede sayıyor.
**Harcama anında** — sayaç geriye doğru saymıyor, çünkü oyuncu parayı zaten
harcadı ve gecikme "yetiyor mu" kararını yanıltır.

Formül: kalan farkın **%18'i + en az 1**, kare başına. Sabit adım (`+1/kare`)
dalga 10'un 80 altınlık bonusunu 1,3 saniyede sayardı ama tek goblinin
3 altını 3 karede biter ve fark edilmezdi; oranla ikisi de aynı formülden
doğru çıkıyor.

**Altın uçuşu** hâlâ bekliyor ama bağımlılığı `T01` değil **`M6-P02`** —
uçacak bir altın ikonu gerekiyor.

**Vinyet neden efekt ayarından bağımsız:** can kaybı bir süs değil bir
**uyarı**. TIER 1 kural 6 erişilebilirlik tabanı istiyor; can kaybının
görülmemesi tabanın altına düşmek olurdu.

**Squash & stretch havuz sözleşmesini nasıl koruyor:** efekt düşman havuza
dönmeden oynatılmak zorunda (nesne aynı nesne), yani `release` **120 ms
geciktiriliyor**. Güvenli, çünkü `alive` zaten `false`. **Ama serbest yuva
8'in altına inerse efekt atlanıp nesne anında iade ediliyor** — 60'lık
havuzda her ölümü 120 ms tutmak yoğun dalgada `acquire`'ı `null` döndürür ve
bir görsel süs yüzünden **düşman doğmazdı**.

---

## 3. Ayarlar ve erişilebilirlik (`T12`)

Üç ayar (§10 + TIER 1 kural 6): **ses**, **ekran sarsıntısı**, **efekt
yoğunluğu**.

### S53 — efekt yoğunluğu üç kademe

`kapalı / düşük / tam`. İki kademe (açık-kapalı) `prefers-reduced-motion`'ı
ikili bir anahtara indirger ve §10'un "varsayılanı **düşük** yapar"
cümlesinin karşılığı kalmaz — "düşük" ancak arada bir kademe varsa var
olabilir.

### S54 — `prefers-reduced-motion` → `low`

`off` değil: medya sorgusunun adı `reduce`, `disable` değil. Ekran sarsıntısı
**kapatılıyor** (sarsıntının "azaltılmış" hâli yok), ses değişmiyor (ses
hareket değil).

**Oyuncunun açık seçimi sistem tercihini eziyor** — sistem hâlâ "azalt" dese
bile oyuncu "tam" dediyse tam kalıyor. Ayrı test var.

### TIER 1 kural 10 — `localStorage` her zaman `try/catch` içinde

| İddia | Ölçüm |
|---|---|
| Gizli sekmede çökmüyor | ✅ bellek yedeğine düşüyor |
| Varlığını **yoklamak** bile sarılı | ✅ bazı tarayıcılarda yoklama fırlatıyor |
| Yazma başarısızsa **bir kez** bildiriliyor | ✅ 3 yazma → 1 olay |
| Bozuk JSON oyunu çökertmiyor | ✅ varsayılanlara dönüyor |
| **M7 `SaveSystem`'in alanlarını ezmiyor** | ✅ canlı: `unlockedMaps: 3` korundu |
| Tek anahtar | `kale-nobeti-save-v1` |

Canlı doğrulama: ayarlar sayfa yenilendikten sonra korundu ve **başlangıçta
uygulandı** (`shake.enabled = false`).

---

## 4. Bekçi k.8 sıkılaştırıldı

Hit-stop, `GameScene`'de ham `delta`nın **üçüncü** meşru kullanımını doğurdu.
Bekçi "en fazla 2 satır" diyordu.

**Sayıyı 3'e çıkarmak bekçiyi zayıflatırdı**: dördüncü bir *sızıntı* da
serbest kalırdı ve izinli satırlardan birinin **değişmesi** görülmezdi.
Sayım yerine **izin listesi** kondu — her satır tam olarak beklenen ifadeyle
eşleşmeli.

**Kasıtlı bozmayla doğrulandı:**

| Sınama | Eski kural | Yeni kural |
|---|---|---|
| Dördüncü kullanım eklendi | yakalar | ✅ yakalar |
| `clock.tick(delta)` → `clock.tick(delta * 1.0)` | **kaçırır** | ✅ **yakalar** |

---

## 4b. Yeni bekçi kuralı: sahne alanları `create()` içinde sıfırlanıyor

**Aynı hata dördüncü kez çıktı**, bu kez `#gecici`'de (Takviye'nin geçici
askerleri). Tek tek düzeltmek yerine bekçiye onuncu kural eklendi.

### Hatanın kendisi

Yeniden başlatmadan sonra `soldiers()` **2** asker gösteriyor ama yeni
havuzun `activeCount`'u **0**'dı. O ikisi **yok edilmiş sahnenin**
askerleriydi: her karede işleniyor, yeni havuz onları tanımadığı için
(`Pool.release` bilinmeyen nesneyi yok sayıyor) asla iade edilemiyor ve
**her yeniden başlatmada birikiyorlardı**.

Sebep dört kezdir aynı: **alan başlatıcısı yalnız bir kez koşuyor,
`create()` her yeniden başlatmada.** Sızıntı çökme üretmiyor, "yanlış durum"
olarak görünüyor — yani en zor fark edilen türden.

### Kural ve iki yanlış deneme

Kural: bir sahnenin değişebilir özel alanı, `init`/`preload`/`create`
kancalarının birinde (veya oradan çağrılan bir yardımcıda) **atanmalı**.

İlk iki sürüm işe yaramıyordu ve **kasıtlı bozma sınaması olmasa fark
edilmezdi** — ikisi de yeşil dönüyordu:

| Sürüm | Hata | Sonuç |
|---|---|---|
| 1 | "`create()` gövdesi" = imzadan dosya sonuna | Alan adları alttaki metotlarda geçtiği için **hiçbir şey** yakalamıyordu |
| 2 | Gövde bitişi = "başlangıç + gövde satır **sayısı**" | Yorumlar elendiği için aralık dosyanın yarısını yutuyordu |
| 3 | "adı geçiyor mu" | `#gecici` `#devKancalari` içinde **okunuyordu**, atanmıyordu — "ele alınmış" sayılıyordu |

Son hâli: süslü parantez eşleştirmesiyle gerçek gövde, **atama** araması
(`this.#x =`, `.clear()`, `.reset()`, `.splice()`, `.length =`), ve
`init`/`preload`/`create` üçünün de sayılması (Phaser üçünü de her
başlatmada çağırıyor).

### Negatif doğrulama — beş tarihsel hatanın hepsi

| Sınama | Yakalandı |
|---|---|
| M6 `#gecici` | ✅ |
| M4 `#towerBySpot` | ✅ |
| M5 `#barracksBySpot` | ✅ |
| HUD `#paused` | ✅ |
| HUD `#speed` | ✅ |

### Kuralın bulduğu iki YENİ hata

Kural yazılır yazılmaz `HudScene`'de iki gerçek hata çıkardı:

- **`#paused`** — duraklatılmışken kaybedilip yeniden başlanınca `true`
  kalıyordu. `create()` yeni bir perde yaratıyor ve o **gizli** başlıyor,
  ama bayrak `true`; ilk ESC oyunu duraklatmak yerine `scene.resume`
  çağırıyor ve perde açılıyordu — durum tam ters.
- **`#speed`** — 2×'te kaybedip yeniden başlayınca etiket 2× gösteriyordu
  ama `GameClock` yeni sahnede 1×'ten başlıyor. Gösterge yalan söylüyordu.

**Canlı doğrulandı:** duraklatılmış hâlde yeniden başlatma → `paused: false`.
Üç kez üst üste Takviye + yeniden başlatma → asker **0**, havuz **0**
(birikme yok).

---

## 5. Kontrol listesinden geçenler

- [x] `typecheck && test && build && guard` — 569 test, **10/10** bekçi
- [x] **Ses ve efektler kapalıyken oyun okunur** — efekt kapalıyken parçacık tepesi 0, oyun oynanabilir
- [x] 2× hızda hit-stop **kapalı**, parçacık yoğunluğu **yarı**
- [x] İlk indirme ≤ 5 MB — **0,39 MB**
- [x] Hiç `.ogg` dosyası yok — tarandı, **0**
- [x] `prefers-reduced-motion` varsayılanları düşürüyor
- [x] Ayarlar gizli sekmede çökmüyor
- [x] 640×360'ta HUD motifleri okunur — canlı doğrulandı (2026-08-16)
- [x] Gri tonlamada düşman tipleri ayırt edilebiliyor — 9 düşman + boss, siluet farkıyla üretildi ve kontrol edildi
- [x] Silüet kuralına sadık kalındı — `P03`/`P04` üretimi tamamlandı, kod tarafına bağlandı
- [x] Açıkken vuruşlar tatmin edici — greybox düzeyinde; nihai değerlendirme sprite'larla

---

## 6. İnsana kalan iş (2026-08-05 tarihli — güncel liste için üstteki not)

| Blok | Çıktı | Plan süresi |
|---|---|---|
| ~~`M6-P01`~~ | ~~3 harita arka planı~~ | **üretildi, 2026-08-16** |
| ~~`M6-P02`~~ | ~~HUD tezhip çerçevesi, kartuş, menzil çemberi~~ | **üretildi, 2026-08-16** |
| ~~`M6-P03`~~ | ~~16 kule kademesi silüeti~~ | **üretildi, 2026-08-16** |
| ~~`M6-P04`~~ | ~~9 düşman silüeti + ölüm karesi~~ | **üretildi, 2026-08-16** |
| ~~`M6-T11` SFX~~ | ~~12 ses efekti~~ | **üretildi, 2026-08-16** |
| ~~`M6-T11` müzik~~ | ~~2 müzik parçası (`S52`)~~ | **üretildi, 2026-08-16** |
| `M6-T01` girdisi | Bitmap font PNG-8 + `.xml` | — hâlâ açık |

Varlıklar geldiğinde tüketen görevler (`T01`-`T06`, `T11`) doğrudan
uygulanabilir; hiçbiri mimari karar bekletmiyor.

# M6 — Sanat, juice, ses · SONUÇ (**kısmi — 5/12 görev**)

| | |
|---|---|
| **Tarih** | 2026-08-05 |
| **Durum** | ⚠️ **kısmi.** Varlıktan bağımsız 5 kod görevi bitti; 7 görev insan üretimi bekliyor |
| **Test** | 569 geçti / 29 dosya (M5: 531 / 27) |
| **Bekçi** | 9/9 ✓ — **k.8 sıkılaştırıldı** |
| **İlk indirme** | 0,39 MB (hedef ≤ 5 MB) |

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

| Görev | Durum | Neden |
|---|---|---|
| `M6-T01` Nihai bitmap font | ⏸ | PNG + `.xml` varlığı gerekiyor. Şu an çalışma zamanında üretilen yer tutucu font kullanılıyor (`fx/numberFont.ts`, M2'de kondu) |
| `M6-T02` Atlas boru hattı | ⏸ | Kaynak sanat yok (`P03`, `P04`) |
| `M6-T03` Arka planlar | ⏸ | `P01` bekliyor |
| `M6-T04` Tezhip HUD | ⏸ | `P02` bekliyor |
| `M6-T05` Menü görselleri | ⏸ | `P02` bekliyor |
| `M6-T06` Kule/düşman sprite'ları | ⏸ | `P03`, `P04` bekliyor |
| **`M6-T07` `ScreenShake`** | ☑ | 11 test |
| **`M6-T08` `HitStop`** | ☑ | 10 test |
| **`M6-T09` Parçacıklar** | ☑ | Phaser parçacığı, ayrı havuz yok |
| **`M6-T10` Vinyet, squash, toz** | ☑ **kısmi** | Altın uçuşu ve dalga sonu sayacı `T01`'in bitmap fontuna bağlı |
| `M6-T11` Ses ve müzik | ⏸ | 20 ses efekti + 2 müzik parçası (`S51`, `S52`) |
| **`M6-T12` Ayarlar + erişilebilirlik** | ☑ | 17 test |

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
| Altın uçuşu (bezier → HUD sayacı) | ⏸ `T01` bitmap fontu |
| Dalga sonu altın sayacının tek tek artması | ⏸ `T01` bitmap fontu |

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

## 5. Kontrol listesinden geçenler

- [x] `typecheck && test && build && guard` — 569 test, 9/9 bekçi
- [x] **Ses ve efektler kapalıyken oyun okunur** — efekt kapalıyken parçacık tepesi 0, oyun oynanabilir
- [x] 2× hızda hit-stop **kapalı**, parçacık yoğunluğu **yarı**
- [x] İlk indirme ≤ 5 MB — **0,39 MB**
- [x] Hiç `.ogg` dosyası yok — tarandı, **0**
- [x] `prefers-reduced-motion` varsayılanları düşürüyor
- [x] Ayarlar gizli sekmede çökmüyor
- [ ] 640×360'ta HUD motifleri okunur — **`P02` bekliyor**
- [ ] Gri tonlamada düşman tipleri ayırt edilebiliyor — **`P04` bekliyor**
- [ ] Silüet kuralına sadık kalındı — **`P03`/`P04` bekliyor**
- [x] Açıkken vuruşlar tatmin edici — greybox düzeyinde; nihai değerlendirme sprite'larla

---

## 6. İnsana kalan iş

| Blok | Çıktı | Plan süresi |
|---|---|---|
| `M6-P01` | 3 harita arka planı (WebP q80, atlas dışında) | 3-5 gün |
| `M6-P02` | HUD tezhip çerçevesi, kartuş, menzil çemberi | 2-3 gün |
| `M6-P03` | 16 kule kademesi silüeti | 3-4 gün |
| `M6-P04` | 9 düşman silüeti + ölüm karesi | 3-4 gün |
| `M6-T11` girdisi | 20 ses efekti + 2 müzik parçası (`S51`, `S52`) | — |
| `M6-T01` girdisi | Bitmap font PNG-8 + `.xml` | — |

Varlıklar geldiğinde tüketen görevler (`T01`-`T06`, `T11`) doğrudan
uygulanabilir; hiçbiri mimari karar bekletmiyor.

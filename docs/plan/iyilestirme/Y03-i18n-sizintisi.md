# Y03 · i18n sızıntısı — görünen metinlerin çoğu `strings.ts` dışında, `en` %0

| | |
|---|---|
| **Tür** | Yapısal — **TIER 1 komşusu kural ihlali** |
| **Önem** | Yüksek. `CLAUDE.md` Teknoloji bölümünün açık bir kuralı |
| **Emek** | Orta (metin toplama küçük, çeviri ayrı bir oturum) |
| **Risk** | Düşük |
| **Dokunulan** | `src/data/strings.ts`, `src/scenes/*.ts`, `src/fx/SettingsPanel.ts`, `src/data/towers.ts`, `src/data/barracks.ts`, `scripts/guard-rules.mjs` |
| **İlgili** | `OPEN-QUESTIONS.md` **S63** · `RISKS.md` R8 |

---

## Bulgu

İki ayrı sorun, aynı kökten:

1. **Sözlük yapısı kuruldu ama çoğu metin ona girmedi.** `strings.ts`
   16 anahtar tutuyor; oyuncuya görünen metinlerin sayıca çoğu hâlâ
   kodun içinde yazılı.
2. **`en` sözlüğü tamamen boş.** 16 anahtarın 16'sı `''`.

## Kuralın kendisi

`CLAUDE.md` Teknoloji:

> **Oyuncuya görünen hiçbir metin kodun içinde yazılmaz.** Hepsi
> `src/data/strings.ts` içinde bir **dil haritası**nda durur.

Gerekçesi de yazılı:

> Poki ve CrazyGames global platformlar, Türkçe-only bir oyun oradaki
> erişimi büyük ölçüde kesiyor. [...] sonradan **yapı** eklemek
> `scenes/`'in tamamına dokunmak demek.

Yapı doğru kurulmuş (S63 kapandı). Ama kural "yapı kurulur" demiyor,
"hiçbir metin kodun içinde yazılmaz" diyor.

## Kanıt — kodda kalan görünür metinler

### Sahnelerde

| Yer | Metin | Not |
|---|---|---|
| `GameScene.ts:98-101` | `'Okçu'`, `'Top'`, `'Büyü'` | `TOWER_LABEL` — menüde her tıklamada görünüyor |
| `GameScene.ts:104-109` | `'İlk'`, `'Son'`, `'Güçlü'`, `'Zayıf'`, `'Yakın'` | `MODE_LABEL` — hedefleme butonları |
| `GameScene.ts:1230` | `` `Kışla ${kislaMaliyet}` `` | satır içi |
| `GameScene.ts:1277, 1284, 1291` | `` `↑ ${maliyet}` `` | satır içi |
| `GameScene.ts:1280, 1298, 1302` | `` `Sat +${iade}` `` | satır içi |
| `LevelSelectScene.ts:27-29` | `'Değirmen Geçidi'`, `'Taş Köprü'`, `'Kül Ovası'` | harita adları |
| `LevelSelectScene.ts:138-147` | `` `${n} dalga · ${m} nokta` `` | `strings.ts`'te `wave: 'dalga'` **var ama kullanılmıyor** |
| `HudScene.ts:288` | `'ESC / boşluk'` | duraklatma ipucu |
| `MenuScene.ts:46` | `'Kale Nöbeti'` | **istisna, doğru** — marka adı, S63 istisnası olarak yazılmış |

### Ayarlar panelinde

```
src/fx/SettingsPanel.ts:13-15   'Kapalı', 'Düşük', 'Tam'
src/fx/SettingsPanel.ts:53      'Ayarlar'
src/fx/SettingsPanel.ts:61      'Ses'
src/fx/SettingsPanel.ts:61,72   'Açık', 'Kapalı'
src/fx/SettingsPanel.ts:70      'Ekran sarsıntısı'
src/fx/SettingsPanel.ts:84      'Efekt yoğunluğu'
```

Ayarlar paneli, i18n açısından **tamamen** dışarıda. Sekiz metin, sıfırı
sözlükte.

### Veri dosyalarında

```
src/data/towers.ts:33,42,73,83,113,123   'Keskin Nişancı', 'Kundakçı', 'Havan',
                                          'Barut Fıçısı', 'Yıldırım', 'Buz'
src/data/barracks.ts:38,48                'Paladin', 'Haydutlar'
```

`branchName` alanları — T3 dal butonlarında doğrudan ekrana yazılıyor
(`GameScene.ts:1482, 1485`).

> Bu sekizi **ayrı bir tartışma**: özel isim mi, çevrilecek metin mi?
> "Paladin" evrensel; "Barut Fıçısı" değil. Karar verilmeli, ama
> `strings.ts`'e girmeseler bile **neden girmediklerinin yazılı bir
> gerekçesi olmalı** — bugün gerekçe yok, sadece unutulmuş görünüyorlar.

### Sayım

| Kategori | Sözlükte | Kodda |
|---|---|---|
| Sahne metinleri | 16 | ~14 |
| Ayarlar paneli | 0 | 8 |
| Kule/kışla dal adları | 0 | 8 |
| **Toplam** | **16** | **~30** |

Yani **görünen metinlerin yaklaşık üçte ikisi sözlüğün dışında.**

## `en` sözlüğü

```ts
// src/data/strings.ts:46-63
en: {
  play: '', pause: '', paused: '', resume: '', speed: '',
  gold: '', lives: '', wave: '', startWave: '', victory: '',
  defeat: '', livesLeft: '', backToMenu: '', levelSelect: '',
  locked: '', back: '',
},
```

16/16 boş. Dosyanın kendi yorumu:

> `en` şimdilik boş. Çeviri M7'de bir oturumluk iş

M7 bitti.

**Not:** tip sistemi burada iyi çalışıyor —
`Record<Locale, Record<StringKey, string>>` `en`'in anahtarlarını
zorunlu kılıyor, yani bir anahtar eklenip `en`'e eklenmezse
`npm run typecheck` kırılıyor. Ama **boş dize** geçerli bir `string`;
tip sistemi eksikliği değil, yalnız *unutulmayı* yakalıyor.

## Neden önemli

**1. Kuralın gerekçesi hâlâ geçerli.** Poki ve CrazyGames'e Türkçe-only
girmek, erişimin büyük kısmını kesiyor. Bu, `RISKS.md` R8'in (küratörlük
reddi) doğrudan girdisi değil ama yayın sonrası oynanma sayısının ana
belirleyicisi.

**2. Bugün ucuz, yarın pahalı.** Kural zaten bunu söylüyor: yapıyı
sonradan eklemek `scenes/`'in tamamına dokunmak demek. **Yapı var,
metinler yok** — ara bir durumdayız ve bu durum, her yeni özellikle
biraz daha bozuluyor. Bu oturumda eklenen her metin (menü butonları,
panel etiketleri) doğrudan koda yazıldı.

**3. Bekçi bu kuralı kontrol etmiyor.** `scripts/guard-rules.mjs`
**on** kontrol koşuyor:

```
k.8  ham delta yalnız GameClock/GameScene
k.5  any kullanılmıyor
M0   PreloadScene 4 aşama
k.7  setText yalnız Text üretmeyen dosyada
k.11 saf mantıkta runtime Phaser yok
test src/ altında test dosyası
k.9  Math.sqrt yalnız math.ts
mim. coverage measureCoverage ile üretiliyor
k.8  saf mantıkta duvar saati yok
mim. sahne alanları create() içinde sıfırlanıyor
```

Listede "kodda oyuncuya görünen metin var mı" **yok**. TIER 1 kuralları
ve iki mimari kural bekçiye bağlanmış; i18n kuralı bağlanmamış. Yani bu
kural yalnızca hatırlanarak uygulanıyor — ve tarama gösteriyor ki
hatırlanmıyor.

> Desen dikkate değer: **bekçiye bağlanan kurallar tutmuş, bağlanmayan
> tutmamış.** `any` yok, ham `delta` yok, `Math.sqrt` yok, `coverage`
> elle yazılmamış. i18n bekçisiz ve üçte iki sızmış. Bu, tek başına
> "Adım 1 önce" önerisinin gerekçesi.

## Seçenekler

### (a) Yalnız `en` sözlüğünü doldur

Mevcut 16 anahtar çevrilir.

- ✅ Bir saat
- ❌ Metinlerin üçte ikisi kodda kaldığı için **oyun İngilizce'ye
  geçmiyor** — "Oyna" İngilizce olur, "Okçu 70" Türkçe kalır. Yarı
  çevrilmiş arayüz, çevrilmemiş arayüzden kötü.

### (b) Metinleri topla, `en`'i boş bırak

Kodda kalan ~30 metin `strings.ts`'e taşınır, `tr` dolu, `en` boş.

- ✅ Kural sağlanıyor
- ✅ Çeviri, gerçekten "bir oturumluk iş" hâline geliyor
- ✅ Bekçi eklenebilir hâle geliyor
- ✅ **Geri düşme zaten doğru yazılmış** — `i18n.ts:17-24` boş çeviriyi
  varsayılan dile, o da boşsa anahtarın kendisine düşürüyor. Yani boş
  `en` ile arayüz boşalmıyor, Türkçe görünüyor. Bu tarafta iş yok.

### (c) (b) + `en` doldur *(önerilen)*

- ✅ Kural sağlanıyor **ve** ikinci dil gerçekten çalışıyor
- ⚠️ Çeviri kalitesi: `'Barut Fıçısı'` → `'Powder Keg'`,
  `'Keskin Nişancı'` → `'Sharpshooter'` gibi kararlar var. Oyun
  terminolojisi, sözlük çevirisi değil.
- ⚠️ Dil seçimi arayüzü **yok**. `DEFAULT_LOCALE = 'tr'` sabit. `en`
  doldurulsa bile oyuncu ona ulaşamıyor → ayrı bir iş
  (tarayıcı diline göre otomatik seçim + ayarlarda geçiş).

## Öneri

**Üç adım, ayrı ayrı sevk edilebilir:**

### Adım 1 — bekçiyi ekle *(önce bu)*

`guard-rules.mjs`'e 9. kontrol: `src/scenes/` ve `src/fx/` içinde,
`.text(` / `setText(` argümanı olarak geçen ve Türkçe karakter içeren
dize sabitleri. Beyaz liste: yorum satırları, `'Kale Nöbeti'` (marka).

**Neden önce:** bekçi olmadan toplama işi yapılır ve bir hafta sonra
yeniden bozulur. Bu oturumun kanıtı: kural yazılı olmasına rağmen
~30 metin sızmış.

### Adım 2 — metinleri topla

Kodda kalan metinler `strings.ts`'e. Bu sırada üç karar verilir:
- Harita adları çevrilecek mi? (`'Değirmen Geçidi'` → `'Mill Pass'`)
- `branchName` alanları çevrilecek mi?
- Marka adı dışında istisna var mı?

Kararlar **`OPEN-QUESTIONS.md`'e yazılır**, koda değil.

### Adım 3 — `en` doldur + dil seçimi

Ayrı bir iş. Adım 2 bitmeden başlanmaz.

## Doğrulama

1. `npm run guard` — 9. kontrol yeşil.
2. `npm run typecheck` — `StringKey` birliği genişledi, `en` tam.
3. `DEFAULT_LOCALE`'ü geçici olarak `'en'` yap, oyunu baştan sona oyna:
   **hiçbir Türkçe metin** ekranda kalmamalı (marka adı hariç).
4. `en` anahtarları boşken `t()` `tr`'ye düşüyor mu — `i18n.test.ts`'e
   bu senaryo için test eklenmeli.
5. En uzun İngilizce metinlerle butonlar taşmıyor mu — özellikle
   `'Sharpshooter 240'` gibi dal butonları (`GameScene.ts:1482`,
   sabit 84 px aralık). **Taşma riski gerçek**; G03 ile birlikte
   bakılmalı.
6. 640×360'ta İngilizce metinler ≥ 16 px okunur.

## Bitmedi sayılır eğer

- Bekçi eklenmediyse (metinler toplansa bile).
- `DEFAULT_LOCALE = 'en'` ile Türkçe metin görünüyorsa.
- Boş `en` anahtarı boş dize gösteriyorsa (geri düşme yoksa).
- İngilizce metinler butonlardan taşıyorsa.
- Harita adı / `branchName` kararları `OPEN-QUESTIONS.md`'e yazılmadıysa.

## Sonuç (2026-08-28)

Adım 1 + Adım 2 uygulandı. **Adım 3 (en doldur + dil seçimi) bilinçli
olarak yapılmadı** — planın kendi notu: "ayrı bir iş, Adım 2 bitmeden
başlanmaz."

### Adım 1 — bekçi

`guard-rules.mjs`'e 12. kontrol (`i18n`) eklendi: `src/scenes/` ve
`src/fx/` içinde, dize/şablon değişmezlerinde Türkçe'ye özgü karakter
(ç ö ü ş ğ ı İ Ç Ö Ü Ş Ğ) arıyor. **Bilerek eksik bir net** —
`'Top'`/`'Son'`/`'Sat'`/`'Tam'`/`'Ses'`/`'Havan'`/`'Buz'` gibi
aksansız Türkçe kelimeleri yakalamıyor (bu oturumda taranan ~30
metnin 7'si böyleydi). Ama kalan ~23'ü (aksanlı) gelecekteki
sızıntıların büyük kısmını temsil ediyor — sıfır kontrolden iyi,
kanıt değil (`TEST-STRATEGY`'nin kendi uyarısı).

Beyaz liste iki madde: marka adı (`'Kale Nöbeti'`, S63 istisnası) ve
`#havuzDoldu(` çağrıları (`GameScene.ts`'in dev-only havuz-dolum
uyarısı — `console.warn`'a gidiyor, oyuncu hiç görmüyor; canlı
taramada gerçek bir yanlış-pozitif olarak yakalandı, `düşman`/`hasar
sayısı`/`altın uçuşu` gibi pool etiketleri).

**Kasıtlı bozma sınamasında bir öğrenme oldu (bekçi hatası değil, test
tasarımı hatası):** ilk denemede `'Ayarlar'` (aksansız) geri
sokuldu — bekçi **doğru şekilde** yeşil kaldı, çünkü bu kelime zaten
net'in bilinen kör noktasında. İkinci denemede aksanlı bir metin
(`'Ekran sarsıntısı'`) geri sokulunca bekçi **kırmızı** oldu, satır
geri alınınca yeşile döndü — doğru davranış doğrulandı.

### Adım 2 — metinler toplandı

`strings.ts`'e **20 yeni anahtar** eklendi (`tr` dolu, `en` boş —
plana uygun): kule/hedefleme etiketleri (`GameScene.ts` —
`TOWER_LABEL`/`MODE_LABEL` haritaları `*_KEY` + `t()` çağıran
`kuleAdi()`/doğrudan koda geçti), kışla/sat butonları (6 çağrı
yeri), duraklatma ipucu (`HudScene.ts`), harita adları
(`LevelSelectScene.ts` — `HARITA_ADI` → `HARITA_ADI_ANAHTARI` +
`haritaAdi()`, `dalga`/`nokta` da `t()`'ye geçti — doğrulanmış eski
"`wave` var ama kullanılmıyor" bulgusu artık geçersiz, `wave` zaten
`HudScene`'de kullanılıyordu; `LevelSelectScene`'in kendi kopyası
buradaydı), ayarlar paneli (`SettingsPanel.ts` — sekiz metnin hepsi).

**Yazarken bulunan küçük bir hijyen sorunu:** `SettingsPanel.ts`'te
zaten yerel bir `Text` değişkeni `t` adını kullanıyordu (iki yerde) —
i18n `t()` import edilince isim çakışması oldu (fonksiyonel bir hata
değil, `t` yereldeki blokta gölgeleniyordu ve o bloklarda zaten
`t()` çağrılmıyordu, ama okunurluğu bozuyordu). İkisi de `metin` diye
yeniden adlandırıldı.

**İki karar `OPEN-QUESTIONS.md`'e yazıldı** (koda değil, planın
istediği gibi):
- **S75** — harita adları **çevrilecek**, özel isim değil.
- **S76** — kule/asker dalı adları (`branchName`, 8 değer)
  **şimdilik `strings.ts`'e taşınmıyor** — zaten `data/towers.ts`/
  `data/barracks.ts` içinde veri olarak duruyor (TIER 1 kural 1'in
  ruhuna uygun, sahne kodunda hardcode değil), bekçinin kapsamı
  bilerek yalnız `scenes/`+`fx/` — bu istisna örtük değil, S76'da
  yazılı. Çevrilecekse Adım 3'le birlikte ayrı ele alınacak.

### Doğrulama

`npm run typecheck && npm run test && npm run guard && npm run build`
temiz — **727/727 test** (yeni anahtarlar `i18n.test.ts`'in genel
"her tr metni dolu" kontrolünden otomatik geçti, ayrı test eklenmedi
— gerek yoktu), **12/12 guard** (11 → 12). `docs/KURALLAR.md` diff'i
**boş**. Boyut raporunda anlamsız bir artış (+1 KB, string tablosu).

**Canlı doğrulama yapılmadı** — bu değişiklik saf bir kaynak
değişikliği (`literal` → `t('anahtar')`), gösterilen Türkçe metin
**birebir aynı** kalıyor (aynı dize, yalnız kaynağı değişti) ve
`StringKey` birleşimi + `i18n.test.ts`'in "her tr metni dolu"
kontrolü yazım hatalarını derleme/test aşamasında zaten yakalıyor.
Bu, HudScene/GameScene yarış hatasından (davranış değişikliği vardı,
canlı doğrulama zorunluydu) kasıtlı olarak farklı bir risk sınıfı.

**Açık kalan uçlar** (plan zaten böyle bırakıyor):
- Doğrulama listesinin 3-6. maddeleri (`DEFAULT_LOCALE='en'` ile tam
  oyun taraması, taşma kontrolü, 640×360 okunurluk) Adım 3'e ait —
  `en` dolana kadar test edilecek bir şey yok.
- Guard'ın aksansız Türkçe kelimeleri (`Top`/`Son`/`Sat`/`Tam`/`Ses`)
  kaçırdığı yukarıda belgelendi — kabul edilen, dürüstçe yazılı bir
  sınır.

---

## Sonuç — Adım 3 (2026-09-13)

**`en` dolduruldu, dil seçimi ayarlar paneline eklendi. Y03 kapandı.**

### Sözlük

46 anahtar çevrildi, **12 yeni anahtar** eklendi (toplam 58):

| Yeni anahtar | Neden |
|---|---|
| `waves` | `wave`'in çoğulu. Türkçede sayıdan sonra çoğul eki yok (`12 dalga`), İngilizcede var (`12 waves`) — tek anahtar iki dilbilgisi bağlamına yetmiyordu. Seviye seçim alt başlığı bunu kullanıyor, HUD etiketi hâlâ `wave`. |
| `language`, `langTr`, `langEn` | Dil satırı. **Dil adları çevrilmiyor** — her dil kendi adıyla (`Türkçe`/`English`), iki sözlükte de aynı. İngilizce arayüzde `Turkish` yazsaydı, İngilizce bilmeyen bir oyuncu kendi dilini listede tanıyamazdı. |
| 8 × `branch*` | S76 — aşağıda. |

Çeviri kararlarından ikisi sözlük çevirisi değil: `Kundakçı` →
`Incendiary` ("arsonist" kişiyi anlatıyor, kule dalı adı olarak tuhaf
kaçıyor), `Buz` → `Frost` (`Ice` değil — tezhip/ortaçağ tonu).

### S76 kapandı — dal adları çevrildi

Dal adları `data/towers.ts`/`data/barracks.ts` içinde düz Türkçe dizeydi.
Artık `branchNameKey: StringKey` — değer hâlâ **veride** (TIER 1 kural 1),
metin `strings.ts`'te ve çevrilebilir. `types/tower.ts` ve
`types/barracks.ts` alan tipi değişti; `BuildMenu`'deki 4 okuma noktası
`dalAdi()` üzerinden çözüyor.

`scripts/kurallar.mjs` dal adını **`STRINGS.tr`'den** çözüyor, etkin
dilden değil — `docs/KURALLAR.md` Türkçe bir denge referansı, oyuncunun
diline göre değişmemeli. Doğrulaması kesin: **`KURALLAR.md` diff'i boş
çıktı**, yani refactor dokümanın tek baytını bile değiştirmedi.

> Bu dosyayı düzenlerken bir tuzak: `kurallar.mjs` üreteceği test
> dosyasını bir **şablon dizesi** içinde tutuyor. Oraya eklenen yoruma
> ters tırnak konursa şablon erken kapanıyor ve `npm run build`
> `SyntaxError` veriyor. Yorum ters tırnaksız yazıldı, sebebi de
> dosyanın içine.

### Çalışma zamanında dil değişimi

`t(key, locale = mevcut)` — `util/i18n.ts` artık modül düzeyinde bir
etkin dil tutuyor, tek yazıcısı `setLocale`. Alternatif `locale`'i 20
çağrı yerinden geçirmekti; o da "çağrı yerleri dil bilmez"
sözleşmesini bozardı.

**`setLocale`'i yalnız `Settings` çağırıyor** — kurucuda ve
`set('locale', …)`'de. Tercihi saklayan ile uygulayanı ayırmamak
bilinçli: `Y04` ("ses tercihi açılışta uygulanmıyor") tam olarak o
ayrımdan doğmuştu.

### Ekranın yenilenmesi — neden sahne yeniden kuruluyor

Dil değişince ekrandaki `Text` nesneleri bayat kalıyor. **Bekçi kural 4
`setText`'i `Text` üreten bir dosyada yasaklıyor**, yani etiketler
yerinde güncellenemiyor — yeniden üretilmeleri gerekiyor. Çözüm
`HudScene`'in kendini `scene.restart(data)` ile kurması
(`GameOverScene`'in `stop`/`start` deseniyle aynı aile).

Kapsam beklenenden küçük çıktı, çünkü:
- `GameScene`'de **kalıcı çevrili metin yok** — tek istisna öğretici
  balonu, o da her gösterimde baştan kuruluyor. Yani `Game` hiç
  yeniden başlatılmıyor, oyun kesintisiz sürüyor.
- `BuildMenu` her açılışta yeniden kuruluyor, kendiliğinden düzeliyor.
- `Menu`/`LevelSelect`/`GameOver` o an çalışmıyor; sonra girildiğinde
  zaten yeni dille doğuyorlar.

Yeniden kurulumda **iki şey veriyle taşınıyor**: açık olan ayarlar
paneli (oyuncu sonucu görsün ve fikrini değiştirebilsin) ve **hız**.
İkincisi gerçek bir tuzaktı: `HudScene.create()` `#speed`'i 1'e
sıfırlıyor ve bunun gerekçesi dosyada yazılı (2×'te kaybedip yeniden
başlayınca gösterge yalan söylüyordu). Dil değişiminde ise `Game`
çalışmaya devam ediyor ve saati 2×'te olabilir — sıfırlama bu kez
**tersinden** aynı hatayı üretirdi. Hız artık `data.speed` ile
korunuyor, hız etiketi de sabit `'1×'` yerine `#speed`'ten türüyor.

### Tarayıcı dili algılama

`detectLocale(nav?)` — `prefersReducedMotion` ile birebir aynı
enjeksiyon deseni. Sıra da aynı: tarayıcı dili bir **sistem tercihi**,
oyuncunun kayıtlı seçimi onu eziyor.

Gerekçe kapsam kararından çıktı: dil seçici **yalnız ayarlar
panelinde** ve panele ancak bir haritanın içinden ulaşılıyor
(`MenuScene`'de ayar yüzeyi yok). Algılama olmasaydı, yabancı bir
oyuncunun dili değiştirmek için önce Türkçe bir menüyü çözmesi
gerekirdi.

Türkçe dışındaki **her** dil `en`'e düşüyor — çevirisi olmayan bir
dile değil, var olan iki dilden uluslararası olanına.

Bozuk kayıt ayrıca eleniyor (`gecerliLocale`): diğer alanlardan farklı
olarak bozuk bir `locale` `STRINGS[bozuk][key]` okumasını `undefined`
alanı okumaya çevirip oyunu **açılışta çökertirdi**.

### Taşma — doğrulamanın asıl bulgusu

Doğrulama listesi "taşma riski gerçek" diyordu. **Ölçüldü ve risk
tahmin edilenden büyüktü; üstelik bir kısmı Türkçede zaten vardı:**

| Satır | Eski buton | En uzun metin | Ölçülen | Yeni buton |
|---|---|---|---|---|
| Dal (T3) | 88 px | `Keskin Nişancı 170` | **136 px** | 152 px |
| Dal (T3) | 88 px | `Sharpshooter 170` | 123 px | 152 px |
| Kule | 88 px | `Cannon 110` | 85 px | 100 px |
| Hedefleme | 46 px | `Güçlü` | 38 px | 52 px |

`Keskin Nişancı 170` **48 px taşıyordu** — Adım 3'ten bağımsız, var
olan bir hata. Ayrıca kule satırı 88 px butonu 84 px aralıkla
diziyordu, yani komşu parşömenler 4 px üst üste biniyordu. Aralık
artık her zaman genişlikten büyük.

Hedefleme modlarında **buton büyütmek tek başına yetmedi**: Türkçesi
zaten kısaltılmış (`Güçlü`, "En Güçlü" değil), İngilizcesi de öyle
seçildi — `Strongest` (~62 px) yerine `Strong` (42 px), `Closest`
yerine `Near`. Beş buton yan yana ve satırın toplam genişliği
menü panelini büyütüyor.

### Doğrulama

`npm run typecheck && npm run test && npm run guard && npm run build`
— **753/753 test** (11 yeni), guard 12/12, **`KURALLAR.md` diff'i boş**.

Testlerde bir tuzak yakalandı: `node`'un `navigator.language`'ı
**makineye göre** değişiyor (bu makinede `tr-TR`, CI'da muhtemelen
`en-US`). `DEFAULT_SETTINGS` karşılaştırmaları enjekte edilmiş dille
yapılıyor, yoksa test geliştiricinin işletim sistemi diline bağlı
olurdu.

`i18n.test.ts`'in "boş çeviride geri düşer" testi `en` dolunca anlamsız
kalacaktı; anahtarı geçici olarak boşaltıp geri koyan bir biçime
çevrildi — geri düşme yolu **yeni eklenecek anahtarlar için** hâlâ ağ,
ve `en` tamlığı ayrı bir testle kilitlendi.

**Canlı doğrulama** (gerçek tarayıcı, sayısal ölçümle):

1. Türkçe tarayıcıda temiz kayıtla açılış → menü Türkçe ✓
2. Ayarlar paneli beş satır, hepsi panel içinde ✓
3. **2× hızdayken** dil `English` yapıldı → HUD + panel anında
   İngilizce, panel açık kaldı, **hız göstergesi 2× kaldı ve
   `GameClock.scale` da 2** (ayrışma yok) ✓
4. Yapı menüsü iki dilde ölçüldü — yukarıdaki tablo; hepsi buton
   içinde ✓
5. `Settings` üretim yolundan (`new Settings(store)`, enjeksiyonsuz)
   `de-DE`/`fr`/`en-US` → `en`, `tr-TR` → `tr` ✓
6. Kayıtlı `en` ile sayfa yenilendi → `Play`, `Select Level`,
   `Mill Pass`/`Stone Bridge`/`Ash Plain`, `Locked`, `← Back`,
   `10 waves · 8 spots` (124 px / 300 px kart) ✓
7. Oyun sonu ekranı İngilizce: `The castle has fallen`,
   `0 / 20 lives left`, `Try again`, `Main menu` ✓
8. Konsol hatasız ✓

`DEFAULT_LOCALE`'ü geçici olarak `'en'` yapma adımı (doğrulama 3)
**gerekmedi ve yapılmadı** — artık kalıcı bir dil seçici var, gerçek
oyuncu yolundan aynı şey sınandı. `DEFAULT_LOCALE`'ün anlamı da
değişti: "açılıştaki dil" değil, **geri düşme dili**.

### 640×360 denetimi (2026-09-14) — bir ihlal buldu

Yukarıda "yapılmayan" olarak bırakılan doğrulama 6 ayrıca koşuldu ve
**göz kararı yerine kuralın kendisi ölçüldü**: `CLAUDE.md` Platform
kısıtı "minimum yazı 16 px, minimum dokunmatik hedef 44×44 px
(1280×720 ölçeğinde)" diyor, ikisi de sayılabilir.

- Dokunmatik hedefler: `createParchmentButton` çağrılarının **hepsi**
  ≥44×44 (en küçüğü hedefleme satırı, 44 px yükseklik — sınırda ama
  uygun).
- Yazı boyutu: `scenes/`+`fx/` içindeki 25 `fontSize` değerinden
  **biri ihlal** — `BuildMenu`'nün hedefleme modu satırı **14 px**.
  Adım 3'ten eski; 640×360'ta 7 fiziksel piksele iniyordu.

Düzeltildi: 16 px + buton 52→60 px, aralık 56→64 px (en uzun etiket
16 px'te `Strong` = 48 px, ölçüldü). Türkçe `Güçlü` 43 px.

**Bekçiye bağlandı — k.13.** Gerekçe README'nin kendi dersiyle aynı
("bekçiye bağlanan kurallar tuttu, bağlanmayan tutmadı"): bu kural
`CLAUDE.md`'de yazılıydı, bekçide yoktu ve ihlal edilmişti — k.12'nin
i18n için yaşadığının aynısı. Kontrol `scenes/`+`fx/` içinde satır içi
`fontSize: '<n>px'` değişmezlerini tarıyor; kasıtlı bozma sınamasında
doğru dosya:satırı verdi.

> Bunu yazarken kendi tuzağıma düştüm: yazı boyutunu önce adlandırılmış
> bir sabite aldım ve **bekçiyi tam o kurala karşı kör ettim** (regex
> satır içi değişmez arıyor). Değer çağrı yerine geri kondu, sebebi de
> yanına yazıldı.

### Yapılmayan

- `MenuScene`'e dil seçici konmadı (karar: yalnız ayarlar paneli).
  Tarayıcı algılaması bu boşluğun büyük kısmını kapatıyor ama
  **Türkçe tarayıcıdan İngilizce oynamak isteyen** biri hâlâ önce bir
  haritaya girmek zorunda.

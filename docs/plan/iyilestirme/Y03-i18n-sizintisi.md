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

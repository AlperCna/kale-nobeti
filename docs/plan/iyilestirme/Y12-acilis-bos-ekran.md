# Y12 · Phaser boot edene kadar boş ekran; favicon ve `noscript` yok

| | |
|---|---|
| **Tür** | Yapısal — ilk izlenim / platform cilası |
| **Önem** | Orta-yüksek. Oyuncunun gördüğü **ilk kare** |
| **Emek** | **Küçük** |
| **Risk** | Düşük |
| **Dokunulan** | `index.html`, `public/` |
| **İlgili** | [Y05](Y05-menu-muzigi-ilk-indirme.md) · `RISKS.md` R8, R13 |

---

## Bulgu

Sayfa açıldığı andan Phaser'ın ilk karesine kadar geçen sürede ekranda
**hiçbir şey yok** — düz mürekkep rengi bir alan. Yükleme çubuğu var
ama o `PreloadScene`'de, yani Phaser çalışmaya başladıktan **sonra**.
Ayrıca favicon ve `<noscript>` de yok.

## Kanıt

`index.html` gövdesi tek satır:

```html
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
```

Gövdede görsel hiçbir öğe yok. Sıra:

| Aşama | Ekranda ne var |
|---|---|
| 1. HTML iniyor (~1 KB) | boş, `#14203a` |
| 2. **JS iniyor — 1,27 MB ham / ~0,33 MB gzip** | boş, `#14203a` |
| 3. **JS ayrıştırılıyor ve çalıştırılıyor** | boş, `#14203a` |
| 4. `BootScene` — fontlar (`FontFace`, azami 2 sn) | boş, `#14203a` |
| 5. `PreloadScene` — **ilk kez bir şey görünüyor** | yükleme çubuğu |

`PreloadScene.ts:125-126` çubuğu kuruyor — ama 4. adımdan sonra.

`BootScene.ts:16`: `FONT_TIMEOUT_MS = 2000`. Font yükleme takılırsa
**2 saniye daha** boş ekran; kod bunu doğru yönetiyor (zaman aşımıyla
serif'e düşüyor) ama o 2 saniye boyunca oyuncuya hiçbir şey söylenmiyor.

### Favicon yok

```
index.html:  rel="icon" / favicon → 0 eşleşme
public/:     yalnız assets/ — kök dosya yok
dist/:       assets/  index.html
```

Tarayıcı `/favicon.ico` isteyip **404** alıyor. Sekmede varsayılan
boş sayfa ikonu görünüyor.

### `<noscript>` yok

```
index.html: noscript → 0 eşleşme
```

JavaScript kapalıysa oyuncu sonsuza kadar boş bir sayfaya bakıyor —
neden çalışmadığına dair tek kelime yok.

## Neden önemli

**1. Bu, Y05 ile aynı sorunun ikinci yarısı.**
[Y05](Y05-menu-muzigi-ilk-indirme.md) *ne kadar* indirildiğini
küçültüyor (3,90 → ~0,96 MB). Y12 ise indirme sırasında oyuncunun *ne
gördüğünü* düzeltiyor. İkisi birlikte "ilk 5 saniye" deneyiminin
tamamı. Y05 tek başına yapılırsa boş ekran süresi kısalır ama
**boş kalmaya devam eder**.

**2. Ayrıştırma süresi indirme süresinden bağımsız.**
1,27 MB'lık JS gzip'te 0,33 MB'a iniyor, yani **transfer** ucuz. Ama
tarayıcı 1,27 MB'ı **ayrıştırmak** zorunda ve bu, düşük uçlu cihazda
(R13: 4 GB Chromebook) saniyelerle ölçülüyor. Hızlı bağlantıdaki
zayıf bir cihazda 2. adım hızlı, **3. adım yavaş** geçiyor — ve o süre
tamamen boş ekran.

**3. Boş ekran "bozuk" gibi okunuyor.** Oyuncu bir şey olduğunu
göremiyorsa sekmeyi kapatıyor. Bu, `ROADMAP.md`'nin karar matrisindeki
"nerede bırakıldığı" metriğini de kirletiyor: oyunu hiç görmeden
bırakanlar, oyun hakkında bir şey söylemiyor.

**4. Favicon, portal listelerinde görünüyor.** itch.io ve portal
sekmelerinde oyunun ikonu var/yok farkı, `RISKS.md` R8'in
"cila" değerlendirmesinde bedava bir puan.

**5. `index.html` zaten platform kısıtlarının yaşadığı yer.**
Dosya `-webkit-user-select: none` (CrazyGames şartı), `overflow: hidden`,
letterbox rengi gibi maddeleri titizlikle taşıyor ve hepsi yorumlanmış.
Yani dosya "platform uyumu burada" diye kurulmuş; bu üç madde aynı
listenin eksik kalanları.

## Seçenekler

### (a) Saf CSS açılış perdesi *(önerilen)*

`index.html`'in içine, `<style>` bloğuna gömülü bir yükleme göstergesi:

```html
<div id="acilis">
  <div class="marka">Kale Nöbeti</div>
  <div class="nabiz"></div>
</div>
```

CSS animasyonlu bir nabız/çizgi. `main.ts` Phaser'ı kurduktan sonra
(ya da `PreloadScene.create()` içinde) `document.getElementById('acilis')?.remove()`.

- ✅ **Ek istek sıfır** — HTML'in içinde, aynı ~1 KB'ta geliyor
- ✅ İlk baytla birlikte görünüyor; JS'i beklemiyor
- ✅ Font gerekmiyor (sistem yazı tipi yeterli, marka adı zaten
  `MenuScene.ts:46`'da `Text` olarak da var)
- ⚠️ Kaldırma noktası dikkatli seçilmeli: `PreloadScene` çubuğu
  görünür olduğu anda kaldırılmalı, iki gösterge üst üste binmemeli
- ⚠️ Perde `pointer-events: none` almalı ya da tamamen kaldırılmalı —
  tuvalin üstünde kalırsa tıklamayı yutar

### (b) Küçük bir gömülü görsel (data URI)

Marka işareti bir `data:` URI olarak `index.html`'e gömülür.

- ✅ Görsel olarak daha zengin
- ❌ HTML boyutunu şişiriyor ve HTML **kritik yol** — küçük kalması,
  ilk baytın hızlı gelmesi demek
- ❌ (a) zaten yeterli

### (c) JS'i parçala (code splitting)

Phaser'ı ayrı bir chunk'a alıp önce küçük bir açılış çizen kod yükle.

- ⚠️ Vite `manualChunks` ile mümkün
- ❌ Toplam ayrıştırma süresi **değişmiyor**, yalnız sıralanıyor
- ❌ (a) aynı sonucu 20 satır CSS ile veriyor
- → İlgili ama ayrı konu: [Y11](Y11-phaser-tam-yapim.md)

## Favicon

Küçük, ayrı, bağımsız:

1. `public/favicon.png` (32×32 ve 180×180 `apple-touch-icon`)
2. `index.html`'e `<link rel="icon" ...>`

Sanat zaten var: atlas'taki `cartouche` ya da `gold-coin` karesi
temel alınabilir; ya da yeni üretilecekse
[G07](G07-yildiz-gosterimi.md)'nin yıldız üretimiyle **aynı oturumda**
yapılır.

> `public/` altındakiler `dist/`'e olduğu gibi kopyalanıyor
> (`vite.config.ts` varsayılanı) — yani `public/favicon.png` doğrudan
> çalışır. Yolun `base: './'` ile uyumlu olması için `index.html`'de
> **başında `/` olmadan** yazılmalı: `href="favicon.png"`.
> **Bu, R15'in (mutlak yol) tam olarak uyardığı tuzak.**

## `<noscript>`

Üç satır:

```html
<noscript>
  <p style="color:#e4d3a8;font-family:serif;padding:2rem">
    Bu oyun JavaScript gerektiriyor.
  </p>
</noscript>
```

Metin `strings.ts`'e **giremez** (JS çalışmıyorken okunuyor) — bu,
[Y03](Y03-i18n-sizintisi.md)'ün eklenecek bekçisinde bir **istisna**
olarak yazılmalı, yoksa bekçi bunu ihlal sayar.

## Doğrulama

1. DevTools → Network → **Slow 3G** + Disable cache ile aç.
   İlk saniyeden itibaren ekranda bir şey olmalı.
2. DevTools → Performance → **4× CPU** ile aç (Y10 oturumuyla
   birleştirilebilir): ayrıştırma süresi boyunca perde görünmeli.
3. Perde, `PreloadScene` çubuğu göründüğü anda kaybolmalı — iki
   gösterge üst üste binmemeli, arada boş kare olmamalı.
4. Perde kaldırıldıktan sonra tuvale tıklama çalışmalı (perde
   tıklamayı yutmamalı).
5. Sekmede favicon görünmeli. `dist/`'i **alt klasörden** servis
   edip favicon'un hâlâ yüklendiğini doğrula (R15 — `base: './'`).
6. JavaScript'i kapatıp aç → `<noscript>` metni görünmeli.
7. `npm run build` → boyut raporunda anlamlı bir artış olmamalı
   (favicon birkaç KB).
8. Konsol sessiz — `/favicon.ico` 404'ü kalkmış olmalı.

## Bitmedi sayılır eğer

- Perde `PreloadScene` çubuğuyla üst üste biniyorsa.
- Perde tıklamayı yutuyorsa.
- Favicon yolu `/` ile başlıyorsa (R15).
- Alt klasörden servis edince favicon 404 veriyorsa.
- `<noscript>` metni i18n bekçisine istisna olarak yazılmadıysa.

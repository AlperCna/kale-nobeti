# Y05 · Menü müziği ilk indirmenin %75'i

| | |
|---|---|
| **Tür** | Yapısal — paket boyutu |
| **Önem** | **En yüksek.** Tek başına ilk indirmenin dörtte üçü |
| **Emek** | Küçük (bir script satırı + bir yükleme aşaması) |
| **Risk** | Düşük — kod mantığı değişmiyor, yalnız *ne zaman* indirildiği |
| **Dokunulan** | `scripts/prep-assets.mjs`, `src/scenes/PreloadScene.ts`, `src/scenes/MenuScene.ts`, `assets-src/audio/music_menu.mp3` |
| **İlgili risk** | `RISKS.md` **R7** (paket boyutu), **R8** (Poki küratörlüğü) |

---

## Bulgu

Oyuncu "Oyna" butonunu görebilmeden önce **4 dakika 4 saniyelik** bir müzik
dosyası indiriliyor. Bu dosya tek başına ilk indirmenin **%75,3'ü**.

## Kanıt

`npm run build` çıktısı (bu oturumda `scripts/report-size.mjs` ile alındı):

```
     2937.8 KB  assets/audio/music/music_menu.m4a
     1237.8 KB  assets/index-CMzoor-r.js
      104.6 KB  assets/menu-bg.webp
      103.5 KB  assets/bg/degirmen-gecidi.webp
       59.8 KB  assets/atlas.png

  js/html/css     0.33 MB   (gzip'li, ~4:1 sıkışır)
  varlıklar       3.58 MB   (sıkışmaz — M6'da 1:1 büyür)
  ─────────────────────────
  İLK İNDİRME     3.90 MB   ← Poki sınırı 8 MB
  toplam          7.01 MB   ← CrazyGames, SDK'sız (S61)
```

MP4 `mvhd` atomundan doğrudan okunan süre ve gerçek bit hızı:

| Dosya | Boyut | Süre | Bit hızı | İlk indirmede? |
|---|---|---|---|---|
| `audio/music/music_menu.m4a` | **2937 KB** | **244,5 sn** | ~98 kbps | ✅ **evet** |
| `lazy/music_game.m4a` | 2791 KB | 230,6 sn | ~99 kbps | ❌ hayır (doğru) |

Yerleşim kararı `scripts/prep-assets.mjs:238-241`'de bilinçli olarak
verilmiş ve gerekçesi de yazılmış:

```js
// `music_menu` erken (`queueBoot`) yükleniyor — `audio/music/` altında,
// "ilk indirme"ye dahil, doğru. `music_game` `queueBackground` ile dalga
// 1 bitince yükleniyor — `report-size.mjs`'in "ilk indirme" hariç tutma
// yolu klasör adına (`assets/lazy/`) bakıyor, o yüzden bilerek oraya.
const MUZIK = [
  { ad: 'music_menu', cikisYolu: 'audio/music/music_menu.m4a' },
  { ad: 'music_game', cikisYolu: 'lazy/music_game.m4a' },
];
```

Yani yerleşim **hata değil, karar**. Sorgulanan şey kararın kendisi değil,
kararın verildiği sıradaki varsayım: *"menü müziği küçüktür, erken
yüklenebilir."* Ölçüm bu varsayımı çürütüyor.

## Neden önemli

**1. Süre, menünün gerçek kullanımıyla orantısız.** Menüde geçirilen süre
saniyelerle ölçülür — "Oyna"ya basılana kadar belki 3-8 saniye. 244
saniyelik bir parça, hiç duyulmayacak 236 saniye için ödenen bir bedel.

**2. Bu bayt gzip'te erimiyor.** `RISKS.md` R7 bunu açıkça uyarıyor:
`.m4a` gzip kazancı **~%0**. `js/html/css` satırındaki 0,33 MB gerçekte
1,24 MB'lık kaynağın sıkışmış hâli; müzik ise 2,94 MB olarak yazılıyor ve
2,94 MB olarak iniyor.

**3. Poki'nin 8 MB sınırı değil, ilk izlenim asıl mesele.** 8 MB tutuyor.
Ama R8 (küratörlük) "içerik miktarı değil, **cila** belirleyici" diyor ve
ilk oynanabilir kareye kadar geçen süre cilanın ilk ölçüsü. Kaba tahmin:

| Bağlantı | 3,90 MB | 0,96 MB |
|---|---|---|
| 4G (~5 Mbps gerçek) | ~6,2 sn | ~1,5 sn |
| Yavaş mobil (~1,5 Mbps) | ~21 sn | ~5 sn |

**4. `report-size.mjs`'in 5 MB uyarı eşiği yakın.** Bugün 3,90 MB. M7
sonrası herhangi bir ek varlık (öğretici görselleri, ikinci müzik parçası,
portal SDK) 1,1 MB'lık payı hızla yer. Menü müziği düşerse pay 4,04 MB'a
çıkıyor — dört kat.

## Seçenekler

### (a) Yalnız tembelleştir — `lazy/` altına taşı

`music_menu.m4a` → `lazy/music_menu.m4a`, `queueBoot` yerine menü
göründükten **sonra** yükle, gelince çalmaya başla.

- ✅ İlk indirme 3,90 → **0,96 MB**
- ✅ Kod değişikliği bir avuç satır
- ⚠️ Menü ilk 2-6 saniye **sessiz** açılıyor
- ⚠️ Toplam paket (CrazyGames sayacı) **değişmiyor** — 7,01 MB kalıyor

### (b) Yalnız kırp — döngüye uygun ~60 sn

Menü müziği zaten döngüde çalıyor (`MenuScene.ts:39`, `loop: true`).
244 sn yerine düzgün bir döngü noktası bulunup ~60 sn'ye kırpılırsa:

- ✅ İlk indirme 3,90 → **2,17 MB**
- ✅ Toplam paket 7,01 → **5,24 MB** (CrazyGames için de kazanç)
- ✅ Menü sessiz açılmıyor
- ⚠️ Kırpma noktası **kulakla** bulunmalı — kötü bir döngü noktası her
  60 saniyede duyulur bir "tık" üretir
- ⚠️ `assets-src/audio/music_menu.mp3` kaynağı (5,52 MB) korunmalı,
  kırpma `prep-assets.mjs` içinde `-ss`/`-t` ile yapılmalı ki kaynak
  bozulmasın

### (c) Bit hızını düşür — 96 → 64 kbps

- ✅ İlk indirme 3,90 → **2,94 MB**
- ⚠️ Tek başına yetersiz; ayrıca ortam müziğinde 64 kbps mono AAC'de
  yüksek frekanslarda duyulabilir bozulma başlar

### (d) **(a) + (b) birlikte** — önerilen

Kırp **ve** tembelleştir.

- ✅ İlk indirme 3,90 → **0,96 MB** (%75 düşüş)
- ✅ Toplam paket 7,01 → **5,24 MB** (%25 düşüş)
- ✅ Menü sessizliği 6 sn değil ~1,5 sn (dosya 0,72 MB'a indi)

## Öneri

**(d).** Sırayla:

1. `prep-assets.mjs` `MUZIK` tablosuna kırpma alanı ekle:
   ```js
   { ad: 'music_menu', cikisYolu: 'lazy/music_menu.m4a', sure: 60 },
   { ad: 'music_game', cikisYolu: 'lazy/music_game.m4a' },
   ```
   `sesDosyasiCevir` `-t` bayrağını yalnız `sure` verilmişse eklesin.
   Kaynak `.mp3` **kırpılmıyor** — `assets-src/` her zaman tam kayıt kalır
   (M6 brifinin "kaynak dosya depoda durur" kuralı).
2. Döngü noktasını kulakla seç. 60 sn keyfî bir sayı; asıl ölçüt
   **müzikal olarak kapanan bir cümle**. 45-90 sn arası kabul edilebilir.
3. `PreloadScene.queueBoot`'tan `music_menu` çıkar; menü göründükten sonra
   yükle. `MenuScene.create()` çalmayı `filecomplete-audio-music_menu`
   olayına bağlasın — `GameScene.ts:496`'daki `music_game` deseni aynen
   kopyalanabilir, orada zaten çalışan bir örnek var.

> **Sıra önemli:** önce kırp, sonra tembelleştir. Kırpma yapılmadan
> tembelleştirilirse menü 6 saniye sessiz kalır ve bu, çözdüğünden fazla
> sorun yaratır.

## Y04 ile birleşen nokta

[Y04](Y04-ses-tercihi-acilista-uygulanmiyor.md) menü müziğinin susturulmuş
oyuncuda bile çaldığını gösteriyor. İkisi aynı satırda buluşuyor
(`MenuScene.ts:38-40`) ve **birlikte düzeltilmeli**: müzik tembel
yüklenecekse, yüklenmeden önce `sound.mute` durumu da okunmuş olmalı —
yoksa dosya boşuna indirilir. Susturulmuş oyuncuda müziği **hiç indirmemek**
Y04'ün bedava yan kazancı.

## Doğrulama

1. `npm run prep-assets` → `public/assets/lazy/music_menu.m4a` üretildi mi,
   boyutu ~0,72 MB mı, süresi ~60 sn mi (`mvhd` ile ölç).
2. `public/assets/audio/music/` klasörü **boş kaldıysa sil** — yoksa
   `report-size.mjs` çıktısında hayalet satır kalır.
3. `npm run build` → `İLK İNDİRME` satırı **≤ 1,1 MB** okumalı.
4. Canlı: menüye gir, ağ sekmesinde `music_menu.m4a` isteğinin sayfa
   yüklendikten **sonra** gittiğini doğrula.
5. Menüde 2 dakika bekle — döngü noktasında duyulur bir kesinti var mı.
6. Menü → Seviye Seç → Menü dönüşünde ikinci kopya üst üste binmiyor mu
   (`MenuScene.ts:38`'deki `isPlaying` koruması hâlâ çalışmalı; artık
   dosyanın *yüklenmiş* olup olmadığı da kontrol edilmeli).

## Bitmedi sayılır eğer

- `İLK İNDİRME` satırı 1,1 MB'ın üstündeyse.
- Kaynak `assets-src/audio/music_menu.mp3` kırpılmış/değiştirilmişse.
- Menü müziği döngüde duyulur bir kesinti veriyorsa.
- Menüye ikinci kez girildiğinde iki kopya üst üste biniyorsa.

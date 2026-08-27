# Y11 · Phaser tam yapımı — kullanılmayan fizik ve tilemap pakete giriyor

| | |
|---|---|
| **Tür** | Yapısal — paket boyutu / ayrıştırma süresi |
| **Önem** | **Düşük-orta.** Transfer açısından küçük, ayrıştırma açısından değerli |
| **Emek** | Orta-büyük · **sonuç belirsiz** |
| **Risk** | Orta — yanlış kesilen bir modül çalışma zamanında patlar |
| **Dokunulan** | `vite.config.ts`, muhtemelen yeni bir Phaser özel yapım adımı |
| **İlgili** | `RISKS.md` **R7**, **R13** · [Y10](Y10-kisitlanmis-fps-olculmedi.md) · [Y12](Y12-acilis-bos-ekran.md) |

> **Bu dosya bir öneri değil, bir seçenek kaydı.** Aşağıdaki analiz
> "yapılmalı" demiyor; **ölçülmeden yapılmamalı** diyor ve neyin
> ölçüleceğini tarif ediyor.

---

## Bulgu

Oyun, Phaser 3'ün **tam** yapımını paketliyor: 1,27 MB ham JavaScript.
İçinde projenin bilerek ve yazılı olarak kullanmadığı iki büyük alt
sistem var — **fizik motorları** ve **tilemap**.

## Kanıt

### Paketlenen boyut

```
dist/assets/index-CMzoor-r.js   1.267.479 bayt  (1,21 MB ham)
report-size.mjs:  js/html/css   0,33 MB  (gzip'li, ~4:1)
```

`report-size.mjs` çıktısında ilk indirmenin ikinci en büyük kalemi
(birincisi menü müziği — bkz. [Y05](Y05-menu-muzigi-ilk-indirme.md)).

### Kullanılmayanlar, projenin kendi kurallarında yazılı

`CLAUDE.md` Teknoloji:

> **Arcade fizik kullanılmıyor.** Mermiler elle hareket eder; tüm
> yakınlık ve isabet kontrolleri karesel mesafe (kural 9).

> Arka plan tek WebP dosyasıdır, **tilemap kullanılmaz**.

Yani iki büyük Phaser alt sistemi, **karar verilerek** dışarıda
bırakıldı — ama pakette duruyorlar.

### Phaser çekirdek yapımı mevcut

`node_modules/phaser@3.90.0` üç ayrı giriş noktası taşıyor:

```
src/phaser.js                  ← bugün kullanılan (tam)
src/phaser-arcade-physics.js
src/phaser-core.js             ← fiziksiz, tilemapsiz
```

`phaser.js` ile `phaser-core.js` farkı, `require` listesi
karşılaştırmasıyla doğrulandı:

| Modül | `phaser.js` | `phaser-core.js` |
|---|---|---|
| `Physics` (Arcade + Matter) | ✅ | ❌ |
| `Tilemaps` | ✅ | ❌ |
| `Actions` | ✅ | ❌ |
| `Create` | ✅ | ❌ |
| `Curves` | ✅ | ❌ |
| `Cameras` | tümü | yalnız `Scene2D` |
| `Display` | tümü | yalnız `Masks` |

## Neden bu **basit bir kazanç değil**

`phaser-core.js` yalnız beş oyun nesnesi taşıyor:

```
Graphics · Image · Layer · Sprite · Text
```

Bu proje bunların **hepsinden fazlasını** kullanıyor:

| Kullanılan | `phaser-core`'da var mı |
|---|---|
| `Sprite` (`Enemy`) | ✅ |
| `Image` (`GoldCoin`, kule, atlas kareleri) | ✅ |
| `Graphics` (menzil çemberi, harita, vinyet) | ✅ |
| `Text` (statik etiketler) | ✅ |
| **`BitmapText`** (TIER 1 kural 7 — hasar sayıları, HUD) | ❌ |
| **`Container`** (menüler, yetenek butonları) | ❌ |
| **`Rectangle`** / `Arc` (perde, halka, işaretçi) | ❌ |
| **`TileSprite`** (`ParchmentFrame` kenar/orta dokusu) | ❌ |
| **`Group`** (TIER 1 kural 3 — havuzlar) | ❌ |
| **`Particles`** (§10 juice) | ❌ |

Yani `phaser-core.js`'i olduğu gibi kullanmak **imkânsız**. Gerçek
seçenek, çekirdekten başlayıp eksik altı modülü geri eklemek — yani
Phaser deposunun kendi webpack yapılandırmasıyla bir **özel yapım**
üretmek.

## Kazanç tahmini — ve neden tahmin

Kaba büyüklükler (Phaser 3 kaynak ağacına bakarak):

| Çıkarılan | Yaklaşık ham |
|---|---|
| Matter.js (Matter fizik) | ~180-220 KB |
| Arcade fizik | ~60-80 KB |
| Tilemaps | ~80-100 KB |
| Actions, Create, Curves, Camera3D | ~40-60 KB |
| **Toplam** | **~360-460 KB ham** |

1,27 MB → ~0,85 MB ham. Gzip'te **0,33 MB → ~0,23 MB**.

> **Bu sayılar ölçülmedi, tahmin edildi.** `OLCUMLER.md`'nin kuralı
> ("bir sayı buraya girdiyse tahmin değil") gereği bu tablo o dosyaya
> **girmemeli** — özel yapım gerçekten üretilip tartılana kadar.

## Değer mi — iki ayrı soru

### Transfer açısından: **hayır, öncelik düşük**

Gzip'te kazanç ~0,10 MB. Poki sınırı 8 MB; Y05 uygulandıktan sonra
ilk indirme ~0,96 MB olacak. 0,10 MB, %10'luk bir iyileşme — gerçek
ama küçük ve emek/risk oranı kötü.

### Ayrıştırma açısından: **belki, ve asıl soru bu**

Tarayıcı 1,27 MB'ın **tamamını** ayrıştırmak zorunda; gzip transferi
ucuzlatıyor, ayrıştırmayı **hiç** ucuzlatmıyor. Ve ayrıştırma süresi,
`RISKS.md` R13'ün (4 GB Chromebook) darboğazı.

[Y12](Y12-acilis-bos-ekran.md) ile doğrudan bağlantılı: açılışta boş
ekranın süresi büyük ölçüde bu ayrıştırma. Ham boyutta %30 kesinti,
o boş ekranda %30 kesinti demek.

**Ama bu da ölçülmedi.**

## Öneri

**Şimdilik yapma. Önce [Y10](Y10-kisitlanmis-fps-olculmedi.md)'u
koştur.**

Gerekçe zinciri:

1. Y10 zaten 4× CPU kısıtlaması altında bir ölçüm oturumu kuruyor.
2. O oturumda **açılış süresi** de ölçülebilir (ek maliyet sıfır):
   sayfa isteğinden `PreloadScene`'in ilk karesine kadar geçen süre,
   ve bunun içinde JS ayrıştırmasının payı (DevTools → Performance →
   `Evaluate Script`).
3. Ayrıştırma payı **kayda değer değilse** (ör. < 500 ms), Y11 kapanır
   ve bu dosya "ölçüldü, gerekmiyor" notuyla arşivlenir.
4. Kayda değerse, özel yapım denenir ve **gerçek** sayı ölçülür.

Bu sıra, projenin kendi karar felsefesiyle aynı: `main.ts:16-18`
render modu için "ölçmeden verilmiyor" diyor; aynı disiplin burada da
geçerli.

## Eğer yapılırsa — dikkat edilecekler

### Kesilen bir modül çalışma zamanında patlar, derlemede değil

TypeScript, `Phaser.GameObjects.BitmapText`'i tip olarak görmeye devam
eder; eksik olan **çalışma zamanı** kaydı. Yani `npm run typecheck`
yeşil geçer ve oyun tarayıcıda çöker. **Bu, en tehlikeli kısım.**

Azaltma: özel yapım sonrası **tam bir elle tur** zorunlu — üç harita,
bütün kule aileleri, kışla, iki yetenek, ayarlar paneli, oyun sonu
ekranı. Otomatik test bu sınıfı yakalayamaz (`node` ortamı Phaser
çalıştırmıyor — S08).

### Phaser sürümü yükseltilirse özel yapım yeniden üretilmeli

`CLAUDE.md` Phaser 4'e geçilmeyeceğini yazıyor, ama 3.x yamaları
gelebilir. Özel yapım, `package.json`'da görünmeyen bir bağımlılık
katmanı ekliyor ve güncelleme sırasında sessizce bayatlıyor.

Azaltma: yapım adımı `scripts/` altında ve `npm run` ile
tekrarlanabilir olmalı — `prep-assets.mjs` gibi. Elle üretilip
depoya atılan bir `phaser-custom.js` **kabul edilmez**.

### Vite tarafı tek satır

```ts
resolve: { alias: { phaser: 'phaser/src/phaser-core.js' } }
```

Ama yukarıdaki altı modül eklenmediği sürece bu **çalışmaz**.

## Doğrulama

1. Özel yapım `npm run` ile üretilebiliyor, depoya elle atılmamış.
2. `npm run build` → ham JS boyutu **ölçülüp** `OLCUMLER.md`'ye
   işlendi (tahmin değil).
3. Açılış süresi öncesi/sonrası ölçüldü.
4. **Elle tam tur**: üç harita, dört kule ailesi, T2/T3 dalları,
   kışla + toplanma noktası, Meteor + Takviye, hedefleme modları,
   ayarlar paneli, duraklatma, 2× hız, kazanma ve kaybetme ekranları.
   Konsol **tamamen sessiz** olmalı.
5. `npm run test` etkilenmemeli (`node` ortamı Phaser'a dokunmuyor).
6. Boyut raporundaki `js/html/css` satırı düştü.

## Bitmedi sayılır eğer

- Elle tam tur yapılmadıysa (tek yakalama yolu bu).
- Özel yapım tekrarlanabilir bir script değilse.
- Kazanç `OLCUMLER.md`'ye tahmin olarak girdiyse.
- Konsolda tek bir uyarı bile varsa.
- Y10 ölçümü yapılmadan bu işe girişildiyse.

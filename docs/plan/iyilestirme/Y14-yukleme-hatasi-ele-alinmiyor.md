# Y14 · Varlık yükleme hatası hiçbir yerde ele alınmıyor

| | |
|---|---|
| **Tür** | Yapısal — dayanıklılık |
| **Önem** | Orta-yüksek. Portalda ağ bizim denetimimizde değil |
| **Emek** | Küçük-orta |
| **Risk** | Düşük |
| **Dokunulan** | `src/scenes/PreloadScene.ts`, `src/scenes/GameScene.ts:490-500` |
| **İlgili** | `RISKS.md` **R8**, **R15** · TIER 1 kural 10'un ruhu · [Y12](Y12-acilis-bos-ekran.md) |

---

## Bulgu

Bir varlık dosyası inmezse oyun **sessizce bozuluyor**. Hiçbir yerde
yükleme hatası dinleyicisi yok; oyuncuya hiçbir şey söylenmiyor;
yeniden deneme yok.

## Kanıt

Kod tabanının tamamında yükleyici olay dinleyicisi taraması:

```
src/scenes/GameScene.ts:496     this.load.once('filecomplete-audio-music_game', basla);
src/scenes/PreloadScene.ts:128  this.load.on('progress', (oran: number) => { ... });
```

**İki tane, ikisi de başarı yolu.** `loaderror` / `FILE_LOAD_ERROR`
kod tabanında **sıfır** kez geçiyor.

Yüklenen varlıklar (`PreloadScene` dört aşama + `GameScene.preload`):

| Aşama | Varlık | Hata olursa |
|---|---|---|
| `queueBoot` | `menu-bg.webp` | Menü arka planı yok — `add.image` eksik doku üretir |
| `queueBoot` | `music_menu.m4a` (2,94 MB!) | Menü müziği yok |
| `queueGame` | `atlas.png` + `atlas.json` | **Bütün kuleler, düşmanlar, HUD çerçevesi yok** |
| `queueGame` | 12 ses efekti | Ses yok |
| `queueGame` | `numbers.png` + `.xml` | **Bütün sayılar yok** (hasar, altın, can, dalga) |
| `queueBackground` | `music_game.m4a` (2,79 MB) | Oyun müziği yok |
| `queueLazy` | harita 2/3 arka planı | Harita zemini yok |

`atlas` veya `numbers` inmezse oyun **oynanamaz** hâle geliyor ve
oyuncu neden olduğunu bilmiyor.

## En kırılgan nokta: `music_menu`

`PreloadScene.queueBoot`:

```ts
this.load.audio('music_menu', 'assets/audio/music/music_menu.m4a');
```

Bu **2,94 MB'lık** bir dosya ve `queueBoot` aşamasında, yani
`PreloadScene.create()` onun bitmesini bekliyor:

```ts
create(): void {
  this.#bar?.destroy();
  this.scene.start('Menu');
}
```

Phaser `create()`'i **bütün kuyruk bitince** çağırıyor — başarıyla ya
da hatayla. Yani müzik inmezse menü yine açılıyor (iyi), ama:

- İniş **yavaşsa** menü o kadar bekliyor (bkz.
  [Y05](Y05-menu-muzigi-ilk-indirme.md))
- İniş **başarısızsa** `MenuScene.ts:39`'daki `this.sound.play('music_menu')`
  var olmayan bir anahtarı çalmaya çalışıyor

> Phaser bu durumda genellikle konsola uyarı basıp devam ediyor,
> çökmüyor. Ama `CLAUDE.md` Platform açıkça diyor: **"yayın yapısında
> konsol çıktısı bulunmaz."** `M7-T10` bunu canlı doğrulamış
> ("konsol tamamen sessiz") — ama **başarılı** bir yüklemede. Hata
> yolunda konsol sessiz kalmıyor.

## Neden önemli

**1. Ağ bizim denetimimizde değil.** itch.io, Poki ve CrazyGames
varlıkları kendi CDN'lerinden servis ediyor. `RISKS.md` R15 zaten
yol biçimi (`base: './'`) yüzünden bir portal hatası sınıfını
işaretliyor; yükleme hatası aynı ailenin ikinci üyesi.

**2. Mobil bağlantı kopuyor.** 3,90 MB'lık bir ilk indirme sırasında
(bkz. Y05) tünele giren bir telefonda istek düşüyor. Bugün bunun
karşılığı sessiz bir bozulma.

**3. Sessiz bozulma, çökmeden kötüdür.** Çöken oyun "bozuk" diye
bildirilir; eksik dokuyla açılan oyun "kötü yapılmış" diye
bildirilir. R8 (küratörlük) ikincisini daha ağır cezalandırıyor.

**4. Projenin kendi felsefesiyle çelişiyor.** TIER 1 kural 10:

> `localStorage` erişimi her zaman `try/catch` içinde. […] Kayıt
> başarısızsa oyuncuya **bir kez** bildirilir.

Kayıt hatası için bu titizlik gösterilmiş — `GameScene.#kayitUyar()`
(`GameScene.ts:993-1002`) `save:failed` olayını **bir kez** yayıyor.
Yükleme hatası için aynı şey yapılmamış, oysa etkisi çok daha büyük.

**5. `BootScene` bu işi doğru yapıyor — örnek elimizde.** Font yükleme
(`BootScene.ts:69-95`):

```ts
/**
 * Fontları yükler. **Hiçbir koşulda reddetmez** — başarısızlık oyunu
 * durdurmaz, sistem serif'iyle devam edilir.
 */
```

Zaman aşımı (2 sn), hata yutma, zarif geri düşme. Aynı disiplin
`PreloadScene`'e uygulanmamış.

## Seçenekler

### (a) Yalnız günlükle ve devam et

`loaderror` dinleyicisi ekle, `import.meta.env.DEV` altında konsola bas.

- ✅ Bir avuç satır
- ✅ Geliştirmede sorunu görünür yapıyor
- ❌ Üretimde oyuncu için hiçbir şey değişmiyor

### (b) Kritik / kritik olmayan ayrımı *(önerilen)*

Varlıklar iki kümeye ayrılır:

| Küme | Varlık | Hata davranışı |
|---|---|---|
| **Kritik** | `atlas`, `numbers` (font) | Oyun başlatılamaz. Parşömen bir kutuda "Varlıklar yüklenemedi — sayfayı yenileyin" + yeniden dene butonu |
| **Kritik olmayan** | müzik, ses efektleri, arka planlar | Sessizce atlanır, oyun oynanır |

Kritik olmayanlar için ek koruma: `SoundSystem.#cal` ve
`MenuScene`'in müzik çağrısı **anahtarın varlığını kontrol etsin**:

```ts
if (!this.#scene.cache.audio.has(anahtar)) return;
```

- ✅ Oyun her hâlükârda oynanabilir kalıyor
- ✅ Kritik hatada oyuncu ne olduğunu **biliyor**
- ✅ Konsol sessiz kalıyor (Platform kuralı)
- ⚠️ Hata ekranı metinleri `strings.ts`'e girmeli
  ([Y03](Y03-i18n-sizintisi.md))
- ⚠️ Hata ekranı **atlas olmadan** çizilebilmeli — yani
  `ParchmentFrame` kullanamaz (atlas kareleri gerekiyor). Düz
  `Graphics` + sistem yazı tipiyle çizilmeli. Bu bir kısıt, tasarım
  tercihi değil.

### (c) Otomatik yeniden deneme

Phaser'ın yükleyicisi yerleşik yeniden deneme taşımıyor; elle
kuyruğa geri koymak gerekiyor.

- ✅ Geçici ağ hatalarının çoğunu çözer
- ⚠️ Sonsuz döngü riski — deneme sayısı sınırlı olmalı (2-3)
- ⚠️ 404 ile ağ hatasını ayırt etmiyor; yol hatasında (R15) boşuna
  üç kez deniyor
- → (b)'nin üstüne eklenebilir, yerine değil

## Öneri

**(b).** Sıra:

1. `PreloadScene`'e `loaderror` dinleyicisi + kritik varlık listesi.
2. Kritik olmayan tüketicilere varlık kontrolü (`cache.audio.has`,
   `textures.exists`).
3. Hata ekranı — atlas'sız çizilebilen, en sade hâliyle.

(c) sonraya bırakılır; önce (b) ile hata **görünür** olsun.

> **Y12 ile birlikte planlanmalı.** Y12 `index.html`'e bir açılış
> perdesi koyuyor. Kritik yükleme hatasında o perdeyi **kaldırmamak**
> ve üstüne hata metnini yazmak, ayrı bir hata ekranı çizmekten
> hem ucuz hem daha güvenilir — çünkü perde saf HTML/CSS ve hiçbir
> varlığa bağlı değil.

## Doğrulama

1. DevTools → Network → `atlas.png` isteğini **engelle** (Block request
   URL) → oyun hata ekranı göstermeli, sessizce bozulmamalı.
2. `numbers.png` engelle → aynı.
3. `music_menu.m4a` engelle → **oyun normal açılmalı**, sessiz, konsol
   temiz.
4. Bütün ses efektlerini engelle → oyun tam oynanabilir olmalı.
5. `assets/lazy/kul-ovasi.webp` engelle → harita 3 açılmalı (zeminsiz
   ama oynanabilir), ya da anlaşılır bir hata vermeli — hangisi
   olduğu **karar verilip yazılmalı**.
6. Üretim yapısında (`npx serve dist`) hata yollarının hepsinde
   **konsol sessiz** olmalı (Platform kuralı, `M7-T10`'un genişletmesi).
7. Hata ekranı 640×360'ta okunur olmalı.
8. Hata metinleri `strings.ts`'te.

## Bitmedi sayılır eğer

- Hata yolunda konsola bir şey basılıyorsa (üretimde).
- Kritik olmayan bir varlığın eksikliği oyunu durduruyorsa.
- Hata ekranı atlas'a bağımlıysa (atlas inmediğinde çizilemez).
- Hata metinleri koda gömülüyse.
- Tembel varlık hatasının davranışı yazılmadıysa.

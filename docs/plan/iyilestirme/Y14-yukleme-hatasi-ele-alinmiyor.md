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

## Sonuç (2026-08-28)

Seçenek (b) uygulandı, önerilen sırayla — ama "dinleyerek" değil
"ölçerek" yaklaşımıyla (aşağıda gerekçesi var), plandan bilinçli bir
sapma.

**`PreloadScene.kritikVarliklarHazir(scene)`** (yeni statik metot):
`scene.textures.exists('atlas') && scene.cache.bitmapFont.has(NUMBER_FONT_KEY)`.
`loaderror` olayını dinlemek yerine sonucu **doğrudan sorguluyor**.
Gerekçe: `loaderror`'ın hangi alt dosya için ateşlendiğini (`atlas.png`
mi `atlas.json` mı, yoksa `numbers.png`/`.xml` mi) ayırt etmek kırılgan
bir varsayım gerektirirdi ve `queueGame` birden çok sahneden (`GameScene`,
`LevelSelectScene`) çağrılabiliyor — dinleyiciyi doğru sahne/doğru anda
kaydetmek, kullanım anında hazır olup olmadığını sormaktan daha kırılgan
çıktı. Bu yaklaşım aynı zamanda "iki `assets/lazy/*.webp` biri gelmeyip
diğeri gelirse ne olur" gibi kritik-olmayan varlıklardaki ayrım
sorularını da otomatik çözüyor: yalnız `atlas`/`numbers` sorgulanıyor,
gerisi tanım gereği kritik değil.

**Çağrı noktası:** yalnız `LevelSelectScene.create()`'in en başı —
plan `PreloadScene`'e `loaderror` dinleyicisi önermişti, ama gerçek
kontrol noktası `queueGame`'in **tüketildiği** yer olmalı.
`LevelSelectScene`, `queueGame`'i çağıran ve `Game`/`Hud`'a giden **tek**
yol (kodda doğrulandı) — burada durdurmak, `GameScene`/`HudScene`'in
ikisini de ayrıca korumaktan daha ucuz ve tek bir başarısızlık noktası.
Hazır değilse `#kritikYuklemeHatasi()` çizilip `create()` erken
`return` ediyor — `#save`, harita kartları, hiçbiri kurulmuyor.

**`#kritikYuklemeHatasi()`:** planın vurguladığı kısıt aynen uygulandı
— **atlas'sız çizilebilmeli**. `createParchmentButton`/`FRAME_STAR`
kullanılmıyor (ikisi de atlas karesi ister); düz `Rectangle`/`Text` +
sistem yazı tipi (`Georgia, "Times New Roman", serif`). Metin
`t('assetLoadError')`, buton `t('reloadPage')` — `strings.ts`'e
eklendi (`tr` dolu, `en` boş placeholder, mevcut desenle tutarlı).
Kurtarma tam sayfa yenileme (`window.location.reload()`) — Phaser'ın
yükleyicisi yerleşik yeniden deneme taşımadığından, dosyaları elle
kuyruğa geri koymak bu ekranın basitliğine değmiyor; bir tam yenileme
Boot'tan itibaren ağa yeni bir şans veriyor. Seçenek (c) (otomatik
yeniden deneme) plandaki gibi bilinçli olarak yapılmadı.

**Kritik olmayan varlıklar — `SoundSystem.#cal` guard'ı:** planın
önerdiği `if (!cache.audio.has(anahtar)) return;` birebir eklendi.
Bu, **gerçek ve önceden dokümante edilmemiş bir çökme yolunu**
kapatıyor: Phaser'ın `WebAudioSound` kurucusu, önbellekte olmayan bir
anahtarla çağrıldığında `Error('Audio key "..." not found in cache')`
**fırlatıyor** (`node_modules/phaser/src/sound/webaudio/WebAudioSound.js`
okunarak doğrulandı) — planın "genellikle konsola uyarı basıp devam
ediyor" varsayımı **yanlış** çıktı, gerçek davranış yakalanmazsa
`throw`. Canlı doğrulandı: `'tower_place'`'i `scene.cache.audio`'dan
çıkarıp `bus.emit('tower:placed', {spotIndex:0})` çağrıldığında guard'lı
haliyle **hiçbir hata fırlatmadı**; guard'ı bypass edip doğrudan
`scene.sound.play('tower_place')` çağrıldığında ise beklenen
`Audio key "tower_place" not found in cache` hatası **gerçekten**
fırladı — yani düzeltme olmadan bu proje gerçekten çökerdi.
`MenuScene`'in `music_menu` çağrısı zaten (Y04/Y05 oturumunda) benzer
bir `exists` koruması taşıyor, ayrıca dokunulmadı.

**`Y12` ile birleşim** planın önerdiği gibi: `#kritikYuklemeHatasi()`
`#acilis` perdesini kullanmıyor (o zaten `PreloadScene.preload()`'da
kaldırılmış oluyor, `LevelSelectScene` çok daha sonra çalışıyor) —
ama ikisi aynı görsel dil ve aynı mürekkep zeminle tutarlı, plan
metnindeki "perdeyi kaldırmayıp üstüne yaz" fikri bu akışta geçerli
olmadığı için (perde çoktan gitmiş) uygulanmadı, doğrudan yeni bir
tam-ekran hata sahnesi çizildi — sonuç aynı, yol farklı.

### Canlı doğrulama

Vite dev sunucusunda (`localhost:5173`), `public/assets/atlas.png`
geçici olarak `.bak` uzantısıyla kenara alınıp sayfa yeniden yüklendi:
`LevelSelectScene` hata ekranını doğru çizdi (`assetLoadError` metni,
`reloadPage` butonu, tıklanınca `window.location.reload()` tetiklendi
doğrulandı), harita kartları/ses/`SaveSystem` hiçbiri kurulmadı.
`numbers.png`/`.xml` kenara alınıp aynı test tekrarlandı — aynı sonuç.
Ardından yalnız `music_menu.m4a` erişilemez yapılıp test edildi:
oyun **normal açıldı**, menü göründü, konsol sessizdi (SFX guard'ı
sayesinde `MenuScene`'in müzik çağrısı zaten korumalıydı). Tüm SFX
dosyaları erişilemez yapılıp bir dalga oynatıldı: oyun tam oynanabilir
kaldı, hiçbir ses çalmadı, konsol sessiz — `SoundSystem.#cal` guard'ı
canlı doğrulandı.

Her iki `atlas.png` ve `numbers.png`/`.xml` dosyası test sonunda
gerçek adlarına geri taşındı; `dist/`'teki kopyalar da aynı şekilde
geri alındı — oturum sonunda `.bak` kalıntısı kalmadığı ayrıca
doğrulandı.

**Vite dev sunucusunun 404 davranışı üretimden farklı** — bir
uyarıyı burada not etmek gerekiyor: `atlas.png`'i kenara alınca Vite
dev sunucusu Phaser'ın `File.onProcessError` yolunu tetikliyor
(dosya "indi" ama ayrıştırılamadı gibi davranıyor), bu da
`console.error('Failed to process file: %s "%s"', ...)` çağırıyor —
**gerçek** üretim/portal ortamındaki bir ağ 404'ü ise Phaser'ın
`File.onError` yolundan geçer ve bu yol **hiçbir zaman**
`console.error` çağırmaz (`node_modules/phaser/src/loader/File.js:388-482`
okunarak doğrulandı). Yani dev sunucudaki bu testte görülen konsol
çıktısı üretim davranışını **temsil etmiyor** — kod tarafında sorun
yok, test ortamı farklı davranıyor.

Bu farkı doğru ölçmek için `npx serve dist` ile gerçek bir statik
sunucu üzerinden tekrar denenmeye çalışıldı, ama bu segmentte Browser
pane'in tekrarlayan bir sınırlamasıyla karşılaşıldı: `localhost:5050`
sekmesi `document.visibilityState:'hidden'` raporluyor (sekme
öne alınsa bile), bu da Chrome'un zamanlayıcı kısıtlamasını tetikleyip
`BootScene`'in 2 saniyelik font yükleme zaman aşımının (`Promise.race`)
34+ saniye gerçek bekleme süresinde bile hiç tetiklenmemesine yol
açtı — oyun `BootScene`'de tamamen takılı kaldı. Bunun test senaryosuyla
(atlas eksikliği) ilgisi olmadığı, `atlas.png` **yerinde** dururken
aynı hangin tekrarlanmasıyla doğrulandı — yani bu, ortam/araç kısıtı,
kod kusuru değil.

**Dolayısıyla açıkça işaretlenmesi gereken nokta:** doğrulama
listesinin 6. maddesi ("üretim yapısında hata yollarının hepsinde
konsol sessiz olmalı") bu oturumda **gerçek bir üretim statik
sunucusuna karşı canlı doğrulanamadı**. Elimdeki dolaylı kanıt güçlü
(Phaser'ın kendi kaynak kodu, gerçek ağ 404'ünün `console.error`
çağırmadığını kesin şekilde gösteriyor) ama bu, canlı bir teyidin
yerini tutmuyor — bir sonraki oturumda güvenilir bir üretim-sunucusu
test ortamı bulunduğunda tekrar denenmeli.

### Sonuç

`npm run typecheck && npm run test && npm run guard && npm run build`
temiz (698 test, 10/10 guard). `docs/KURALLAR.md` diff'i **boş** —
beklenen, bu iş denge sayılarına dokunmuyor.

**Açık kalan uçlar:**
- Doğrulama listesi madde 6 (üretim statik sunucusunda konsol
  sessizliği) yalnız kaynak-kodu analiziyle doğrulandı, canlı değil.
- Doğrulama listesi madde 5 (`assets/lazy/kul-ovasi.webp` eksikliğinde
  davranış) planın bıraktığı gibi **karara bağlanmadı** — bu iş
  kapsamına alınmadı, `bg-*` kritik olmayan kümede kalmaya devam
  ediyor (Phaser eksik dokuda varsayılan/boş doku üretir, oyun
  durmaz) ama "anlaşılır bir hata mı, sessiz mi" seçimi hâlâ açık.

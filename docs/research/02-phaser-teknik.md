# 02 — Phaser 3 Teknik Bulgular

`CLAUDE.md`'ye eklenmesi gereken teknik sözleşmeler. Her madde kaynaklı.

---

## 1. Hasar sayıları: `Text` yasak, `BitmapText` zorunlu

Phaser'ın kendi dokümanı net: **[D]**

> Bir `Text` nesnesinin içeriği her değiştiğinde, metin canvas'ının yeniden
> üretilmesi ve WebGL'de yeni dokunun GPU'ya tekrar yüklenmesi gerekir.
> Sık kullanıldığında veya çok sayıda `Text` nesnesiyle bu pahalı bir işlemdir.

Buna karşılık: **[D]**

> WebGL altında `BitmapText` son derece hızlıdır ve `Text` nesnelerinin
> aksine içeriğini güncellerken hiçbir hız cezası ödemezsiniz, çünkü
> altındaki doku değişmez.

**Kale Nöbeti için anlamı:** yoğun bir dalgada saniyede 30-60 hasar sayısı
üretilecek. Bunlar `Text` olursa her biri ayrı canvas + GPU yüklemesi demek.
`CLAUDE.md` TIER 1 kural 3 nesne havuzunu zorunlu kılıyor ama **havuzlanmış
`Text` de aynı cezayı öder** — sorun nesne yaratma değil, içerik değişimi.

### Yazılması gereken kural

```
TIER 1 — Kural 7: Oyun içinde değişen hiçbir metin `Phaser.GameObjects.Text`
olamaz. Hasar sayıları, altın sayacı, can, bekleme süreleri ve dalga sayacı
`BitmapText` kullanır. `Text` yalnızca sahne kurulumunda bir kez yazılan,
sonra değişmeyen metinler için serbesttir (menü başlıkları, ayar etiketleri).
```

### Sonuç: font planı değişiyor

`GAME-DESIGN.md` §2 "Sayılar: Inter Tight, tabular figürler" diyor. Bu bir web
fontu ve `BitmapText` web fontu kullanamaz. Sayılar için **bitmap font üretmek
gerekiyor** (`.png` + `.xml`/`.fnt`). Araçlar: [SnowB BMF](https://snowb.org/)
(tarayıcıda, ücretsiz), Hiero, Littera.

Bu aslında iyi haber: bitmap font ürettiğinde Inter Tight'ı web fontu olarak
indirmene gerek kalmıyor → paketten bir font dosyası düşüyor (`04` dosyasına
bkz.).

---

## 2. Web fontları ve FOUT

`Grenze Gotisch` ve `Spectral` web fontu olarak kalacak (menü/UI metni).
Phaser'ın font yükleme desteği yok — `preload` fontu beklemez, sahne fontsuz
render edilir ve sonra zıplar. **[D]**

İki yaklaşım var: **[D]**

1. **`WebFontFile` özel yükleyici** — `Phaser.Loader.File` alt sınıfı yazıp
   `webfontloader` kütüphanesini `preload` kuyruğuna sokmak. En yaygın çözüm,
   hazır gist mevcut.
2. **`FontFace` API + `document.fonts.ready`** — modern tarayıcılarda
   kütüphanesiz çalışır, `Boot` sahnesinde `await` edilir.

`FontFace` yolu tercih edilmeli: harici bağımlılık yok (`CLAUDE.md` "harici
bağımlılık eklemeden önce sor" diyor) ve CrazyGames'in Chrome/Edge/Safari
hedefinde `FontFace` her yerde var.

```ts
// Boot sahnesinde, Preload'dan önce
async loadFonts() {
  const faces = [
    new FontFace('Grenze Gotisch', 'url(assets/fonts/grenze.woff2)'),
    new FontFace('Spectral', 'url(assets/fonts/spectral.woff2)'),
  ];
  await Promise.all(faces.map(async f => {
    await f.load();
    document.fonts.add(f);
  }));
}
```

---

## 3. Hız değiştirme (2×) — dört ayrı özellik

`GAME-DESIGN.md`'de hiç yok. Phaser'da tek bir global `timeScale` **yok**;
dört ayrı sistem ayrı ayrı ayarlanıyor: **[D]**

| Sistem | Özellik |
|---|---|
| Tween'ler | `scene.tweens.timeScale` |
| Fizik | `scene.physics.world.timeScale` |
| Zamanlayıcı olayları | `scene.time.timeScale` |
| Animasyonlar | `scene.anims.globalTimeScale` |

Ve iki tuzak: **[D]**

1. `scene.time.timeScale` **yalnızca zamanlayıcı olaylarını** etkiler —
   `update(time, delta)` içindeki `delta` değerini değiştirmez. Yani kendi
   yazdığın hareket/atış mantığı bundan hiç etkilenmez.
2. **Parçacık yayıcıları ayrı** ayarlanmalı, sahne çocukları gezilerek.

### Kale Nöbeti için sözleşme

Düşman hareketi, kule bekleme süreleri, mermi uçuşu ve dalga zamanlayıcısı
hep kendi yazdığımız `update` kodunda olacağı için, **tek doğru çözüm kendi
saatimizi tutmak:**

```
TIER 1 — Kural 8: Hiçbir sistem ham `delta` kullanmaz. Tüm zaman bağımlı
mantık `GameClock.scaledDelta` üzerinden çalışır. `GameClock.setScale(1|2)`
ayrıca dört Phaser özelliğini de günceller (tweens, physics.world, time,
anims). Bu sözleşme M0'da kurulur — sonradan eklemek her sisteme dokunmak
demektir.
```

```ts
// systems/GameClock.ts
export class GameClock {
  private scale = 1;
  scaledDelta = 0;

  setScale(s: 1 | 2, scene: Phaser.Scene) {
    this.scale = s;
    scene.tweens.timeScale = s;
    scene.physics.world.timeScale = 1 / s;  // DİKKAT: fizikte ters
    scene.time.timeScale = s;
    scene.anims.globalTimeScale = s;
  }

  tick(delta: number) { this.scaledDelta = delta * this.scale; }
}
```

> `physics.world.timeScale` ters çalışır (1.0 normal, 0.5 = iki kat hızlı).
> Arcade fizik kullanılmayacaksa (mermiler elle hareket ettirilecekse) bu
> satır gereksiz — ama karar M0'da verilmeli.

**Duraklatma** aynı mekanizmayla `setScale(0)` değil, sahne `pause()` ile
yapılmalı; `scale 0` sıfıra bölme riskleri doğuruyor.

---

## 4. Render modu: WebGL mi Canvas mi?

Varsayılan `AUTO` (WebGL öncelikli) ve genel tavsiye WebGL. **[T]**
Ama saha ölçümü ters yönde bir sonuç veriyor: **[T]**

> Eski cihazlarda WebGL'den Canvas'a geçmek performansı %30 artırdı.

Bu, CrazyGames'in **"4 GB RAM'li Chromebook'ta akıcı çalışmayan oyunlar
Chromium OS'ta devre dışı bırakılır"** şartıyla doğrudan ilgili
(`05-yayin-platformlari.md`). Yani düşük uçlu cihaz gerçek bir kabul kriteri.

**Öneri:** varsayılan `AUTO` kalsın, ama M5'te FPS ölçümü eklenip düşük
cihazda Canvas'a düşme seçeneği (URL parametresi veya ayar) test edilsin.
Kararı ölçmeden verme.

---

## 5. Atlas ve çizim çağrıları

- Doku atlası, çok sayıda küçük görüntüyü tek dokuda birleştirip Phaser'ın
  birçok sprite'ı **tek çizim çağrısında** render etmesini sağlar. **[T]**
- Phaser 3.50'den itibaren **çoklu doku toplu işleme (multi-texture batching)**
  var: tipik olarak **16 farklı doku** tek çizim çağrısında birleştirilebiliyor. **[T]**

**Kale Nöbeti için anlamı:** 16 doku limiti rahat. Ama arka planlar atlasa
**girmemeli** (bkz. `04-varlik-paket-boyut.md`) — 1280×720'lik üç görüntü
atlası şişirir ve atlas boyut limitlerini (genelde 2048 veya 4096) zorlar.

Plan: `atlas.png` (kuleler, düşmanlar, mermiler, UI, parçacıklar) + üç ayrı
arka plan dosyası + bir bitmap font dokusu = **5 doku.** Limitin çok altında.

---

## 6. Kapsama ölçüm aracı — M1'de yazılmalı

`01-denge-matematigi.md`'nin tamamı `kapsananYol_kule` değerine dayanıyor ve
bu değer elle tahmin edilemez. Basit bir hesap:

```ts
// util/coverage.ts — saf fonksiyon, Vitest'lenebilir
export function coveredLength(
  path: Vec2[], spot: Vec2, range: number, step = 4
): number {
  let covered = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]];
    const segLen = dist(a, b);
    const n = Math.ceil(segLen / step);
    for (let k = 0; k < n; k++) {
      const p = lerp(a, b, k / n);
      if (dist(p, spot) <= range) covered += segLen / n;
    }
  }
  return covered;
}
```

Bunun iki kullanımı var:

1. **Denge sağlaması** — her harita için `Σ coveredLength` hesaplanır,
   `01-denge-matematigi.md` §11'deki testler bunu kullanır.
2. **Editör yardımı** — geliştirme modunda her yapı noktasının üstüne
   kapsadığı piksel sayısını yazdır. Harita çizerken anında geri bildirim.

**M1'de yazılmalı**, çünkü harita 1'in yolu M1'de çiziliyor ve o yol yanlış
çizilirse tüm denge yanlış oturuyor.

---

## 7. Nesne havuzlama — mevcut kural doğru ama eksik

`CLAUDE.md` TIER 1 kural 3 doğru. Phaser `Group`'ları resmi olarak "nesne
havuzu" diye adlandırılmasa da havuzun temel özelliklerine sahip. **[T]**

Eklenmesi gereken iki nokta:

**a) `setActive(false)` + `setVisible(false)` yetmez.** Havuza dönen nesnenin
tüm durumu sıfırlanmalı (hedef referansı, tween'ler, timer'lar, tint).
Sıfırlanmayan hedef referansı ölü düşmanı canlı tutar → sızıntı.

**b) Havuz boyutları önden ayrılmalı.** `maxSize` verilmezse ilk yoğun dalgada
büyüme sırasında takılma olur. Öneri:

| Havuz | Ön ayırma |
|---|---|
| Düşman | 60 |
| Mermi | 200 |
| Hasar sayısı | 60 |
| Parçacık | 300 (dokümandaki limitle uyumlu) |
| Asker | 24 |

Parçacıklar için ek bilgi: Phaser'ın kendi parçacık sistemi zaten havuzlu —
ömrü biten parçacık yok edilmez, havuza döner. **[D]** Yani parçacıklar için
ayrı havuz yazmaya gerek yok, `maxParticles` yeterli.

---

## 8. Kare bütçesi

60 FPS hedefinde kare başına **16.67 ms** var ve bu süre fizik, oyun mantığı,
render ve çöp toplamanın tamamını kapsıyor. **[T]**

Kale Nöbeti'nin en yoğun anı: ~40 düşman + ~60 mermi + 8 kule hedef arıyor.
Hedef arama saf haliyle `O(kule × düşman)` = 320 mesafe hesabı/kare — sorun
değil. Ama şu iki şey sorun olur:

- **Her karede hedef aramak.** Kule ancak ateş etmeye hazır olduğunda hedef
  aramalı; bekleme süresindeyken aramamalı. Ya da hedefi 100 ms'de bir
  doğrulamalı. Bu tek başına hedef arama maliyetini ~10 kata düşürüyor.
- **`Math.sqrt`.** Menzil kontrolünde karekök alma; `distanceSquared <= range²`
  kullanılmalı.

---

## 9. `CLAUDE.md`'ye eklenecek maddelerin özeti

```
TIER 1
7. Değişen metinler `BitmapText`. `Text` yalnız statik metin için.
8. Ham `delta` yasak; `GameClock.scaledDelta` kullanılır. Hız 1× / 2×.
9. Menzil ve mesafe kontrolleri karesel yapılır, `Math.sqrt` çağrılmaz.
10. Havuza dönen nesne tüm durumunu sıfırlar (hedef, tween, timer, tint).

Teknoloji
- Fontlar `Boot` sahnesinde `FontFace` API ile yüklenir, `Preload`'dan önce
  `await` edilir. Sayı fontu web fontu değil, bitmap fonttur.
- Doku sayısı 16'yı geçmez (multi-texture batching sınırı).
```

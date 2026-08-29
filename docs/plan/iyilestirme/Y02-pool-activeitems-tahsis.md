# Y02 · `Pool.activeItems()` her karede yedi dizi tahsis ediyor

| | |
|---|---|
| **Tür** | Yapısal — başarım |
| **Önem** | Orta-yüksek. TIER 1 kural 3'ün amacını kendi API'si sızdırıyor |
| **Emek** | Orta (havuzun iç veri yapısı değişiyor, testler var) |
| **Risk** | **Orta** — yanlış yapılırsa yineleme sırasında serbest bırakma çöker |
| **Dokunulan** | `src/util/pool.ts` + 6 çağrı yeri |
| **İlgili** | TIER 1 kural 3 · `RISKS.md` R13 (düşük uçlu cihaz) |

---

## Bulgu

Nesne havuzu tam olarak **çöp üretmemek için** var. Ama havuzun okuma
API'si, her çağrıldığında kullanımdaki nesnelerin **yeni bir kopyasını**
üretiyor. Ana döngüde bu çağrı karede yedi kez geçiyor.

## Kanıt

```
src/util/pool.ts:112-114
  activeItems(): T[] {
    return [...this.kullanimda];
  }
```

`kullanimda` bir `Set<T>` (`pool.ts:41`). Yayılma işleci her seferinde
Set'i gezip yeni bir dizi kuruyor.

**Karede koşan çağrı yerleri** (test ve `waveSim` hariç):

| # | Yer | Havuz | Not |
|---|---|---|---|
| 1 | `GameScene.ts:547` | düşman | `update()` başında, her kare |
| 2 | `WaveManager.ts:196` | düşman | `#waves.update()` içinden |
| 3 | `EnemyAbilitySystem.ts:39` | düşman | **artı `.filter()`** → ikinci dizi |
| 4 | `ProjectileSystem.ts:96` | mermi | |
| 5 | `DamageText.ts:94` | hasar sayısı | |
| 6 | `GoldFlight.ts:116` | altın ikonu | |

`EnemyAbilitySystem.ts:39` iki tahsis birden yapıyor:

```ts
const canlilar = this.pool.activeItems().filter((e) => e.alive && e.def !== null);
```

Yani kare başına **7 dizi**. 60 FPS'te **saniyede 420 dizi**.

## Büyüklük tahmini

Tepe dalgada eşzamanlı ~50 düşman (`CLAUDE.md` Teknoloji: "Mevcut dalga
bütçesi ~50 düşman"), ~30 mermi, ~20 hasar sayısı, ~10 altın ikonu.

| Kare başına kopyalanan eleman | Adet |
|---|---|
| Düşman × 3 çağrı | 150 |
| `.filter()` çıktısı | ~50 |
| Mermi | 30 |
| Hasar sayısı | 20 |
| Altın | 10 |
| **Toplam** | **~260 referans/kare** |

Saniyede ~15.600 referans kopyası ve 420 dizi başlığı. Modern masaüstünde
bu ölçülebilir bir FPS kaybı **değil** — genç nesil çöp toplayıcı bunu
ucuza halleder. Ama:

- `RISKS.md` **R13**: CrazyGames "4 GB RAM'li cihazlarda akıcı
  çalışmayan oyunlar Chromium OS'ta devre dışı bırakılır." Düşük uçlu
  cihazda genç nesil toplama daha sık ve daha görünür.
- `S15`'in ikincil geçidi: **Chrome DevTools 4× CPU kısıtlamasında
  ≥ 30 FPS**. Kısıtlama altında tahsis maliyeti dörde katlanmıyor ama
  toplama duraklamaları görünür hâle geliyor.
- Bu, **kare başına düzenli çöp** — yani duraklamaları oyunun en yoğun
  anına (tepe dalga) denk getiren türden.

> **Dürüst çerçeve:** bu bir "oyun kasıyor" hatası değil. Bugün ölçülen bir
> FPS düşüşü yok. Buradaki asıl gerekçe **tutarlılık**: TIER 1 kural 3
> "oyun içinde asla `new` ile mermi yaratılmaz" diyor ve gerekçesi çöp
> üretmemek. Havuzun kendi okuma yolu her karede çöp üretiyorsa, kural
> kısmen yazıya kalmış olur.

## Neden bugünkü hâli böyle yazılmış

Kopya **kasıtlı ve gerekli**. Yineleme sırasında serbest bırakma
oluyor — örneğin:

```
src/fx/GoldFlight.ts:116-118
  for (const c of this.pool.activeItems()) {
    if (c.step(scaledDelta)) this.pool.release(c);
  }
```

`release` `kullanimda.delete(obj)` çağırıyor (`pool.ts:101`). `Set`
üzerinde doğrudan yinelerken silmek JavaScript'te tanımlı ve güvenli
(silinen eleman ziyaret edilmemişse atlanır) — ama **eklemek** güvenli
değil ve `WaveManager` yineleme sırasında yeni düşman doğurabiliyor.
Kopya bu belirsizliği tamamen kaldırıyor.

**Yani çözüm "kopyayı kaldır" değil, "kopyayı ücretsizleştir".**

## Seçenekler

### (a) `forEachActive(cb)` — geri çağrımlı gezinme

```ts
forEachActive(cb: (item: T) => void): void {
  for (const nesne of this.kullanimda) cb(nesne);
}
```

- ✅ Sıfır tahsis
- ❌ Yineleme sırasında **ekleme** hâlâ tanımsız
- ❌ Çağrı yerlerinin yarısı diziyi geri döndürüp başkasına veriyor
  (`GameScene.ts:547` → `dusmanlar` altı sisteme geçiyor). Geri çağrım
  bu deseni karşılamıyor.

### (b) Yoğun dizi + takas-silme (swap-remove), geriye doğru yineleme

`Set` yerine `T[]` + `Map<T, number>` (indeks defteri):

```ts
private readonly aktif: T[] = [];
private readonly indeks = new Map<T, number>();

release(obj: T): void {
  const i = this.indeks.get(obj);
  if (i === undefined) return;
  const son = this.aktif.pop()!;
  if (son !== obj) { this.aktif[i] = son; this.indeks.set(son, i); }
  this.indeks.delete(obj);
  obj.resetForPool();
  this.serbest.push(obj);
}

/** Canlı görünüm. **Kopya değil** — yineleme sırasında değişebilir. */
activeView(): readonly T[] { return this.aktif; }
```

Çağrı yerleri **geriye doğru** yineler:
```ts
const a = pool.activeView();
for (let i = a.length - 1; i >= 0; i--) { ... }
```
Takas-silme + geriye yineleme, silme sırasında hiçbir elemanı atlamıyor
(bilinen, kanıtlanmış desen).

- ✅ Sıfır tahsis
- ✅ Dizi başkasına geçirilebiliyor (mevcut desen korunuyor)
- ✅ `activeCount` O(1) kalıyor
- ⛔ **Aktif sıra artık kararlı değil — ve sıra hedeflemede belirleyici.**
  Bu bir şüphe değil, doğrulandı:

  ```
  src/systems/TargetingSystem.ts:61
    @returns Aday yoksa `null`. Rastgelelik yok; eşitlikte dizi sırası belirleyici.

  src/systems/TargetingSystem.ts:74-75
    // `<`, `<=` DEĞİL: eşitlikte ilk bulunan kalıyor → kararlı seçim.
    if (s < enIyiSkor) {
  ```

  Eşitlik **istisna değil, kural**: `strongest` modu `-e.maxHp` puanlıyor
  (`TargetingSystem.ts:49`) ve bir dalgadaki bütün goblinlerin `maxHp`'si
  aynı. `weakest` modu `e.hp` puanlıyor; hasar almamış düşmanlar yine
  eşit. Yani bu iki modda hedefi **tamamen dizi sırası** seçiyor.

  Takas-silme sırayı bozar → aynı tahtada farklı düşman vurulur →
  `waveSim` çıktısı kayar. `waveSim.test.ts` `killedCount` eşitliği arıyor
  ve **kırılır**. Bu durumda **test gevşetilmez** — ya (b) terk edilir,
  ya da hedeflemeye sıradan bağımsız bir eşitlik bozucu (ör. `e.id`)
  eklenir ve o değişikliğin denge etkisi ayrıca ölçülür.

### (c) Yeniden kullanılan tampon (scratch buffer)

Havuz tek bir `#tampon: T[]` tutar, `activeItems()` onu doldurup döndürür.

```ts
activeItems(): readonly T[] {
  this.#tampon.length = 0;
  for (const n of this.kullanimda) this.#tampon.push(n);
  return this.#tampon;
}
```

- ✅ Tahsis yok (dizi bir kez büyüyüp orada kalıyor)
- ✅ `Set` sırası korunuyor → **davranış birebir aynı**
- ✅ Mevcut çağrı yerlerinin **hiçbiri değişmiyor**
- ❌ **Tehlikeli takas:** iki çağrı yeri aynı anda tamponu tutamaz.
  `GameScene.ts:547` diziyi altı sisteme geçiriyor; o sistemlerden biri
  aynı havuzun `activeItems()`'ını tekrar çağırırsa (ör.
  `WaveManager.ts:196`, `EnemyAbilitySystem.ts:39` — **ikisi de düşman
  havuzu**) tampon altından çekilir.
  → Bugünkü kodda bu **gerçekten oluyor**. (c) olduğu gibi güvensiz.
- Kurtarma: her havuz **iki** tampon tutup dönüşümlü verse bile, üç
  eşzamanlı okuyucu varken yine kırılır.

## Öneri

**Üç adımlı, riski artan sırayla. İlk adım bugün yapılabilir; üçüncüsü
ayrı bir karar gerektiriyor.**

### Adım 1 — bedava kazanç, sıfır risk *(önerilen, hemen)*

`EnemyAbilitySystem.ts:39`'daki `.filter()`'ı kaldır:

```ts
// önce
const canlilar = this.pool.activeItems().filter((e) => e.alive && e.def !== null);
// sonra
for (const e of this.pool.activeItems()) {
  if (!e.alive || e.def === null) continue;
  ...
}
```

Kare başına bir dizi eksiliyor, davranış birebir aynı, sıra hiç
değişmiyor. Yedi tahsisten biri gidiyor (**%14**).

### Adım 2 — ölç, sonra karar ver

Adım 3'e girmeden önce **bugünkü sayı kayda geçmeli**: tepe dalgada
Chrome DevTools → Performance → Memory ile tahsis oranı, ve 4× CPU
kısıtlaması altında FPS (S15'in ikincil geçidi). Ölçüm "bu 6 dizi gerçekten
bir şeye mal oluyor mu" sorusunu cevaplıyor. **Mal olmuyorsa Adım 3
yapılmaz** — sıra kararlılığı, kazanılmayan bir başarım için feda
edilmez.

### Adım 3 — yalnız Adım 2 gerekçelendirirse

(b) uygulanır **ve** hedeflemeye sıradan bağımsız bir eşitlik bozucu
eklenir (`e.id` — `Enemy.ts:47`'de zaten kalıcı ve artan bir kimlik var).
Bu, hedeflemeyi dizi sırasından tamamen kurtarır ve (b)'nin tek gerçek
engelini kaldırır. Ama **denge etkisi ayrıca ölçülür**: eşitlik bozucu
değişimi hangi düşmanın önce öldüğünü değiştirir, `waveSim` çıktısı
kayabilir ve `docs/KURALLAR.md` sızıntı sayıları yeniden okunmalıdır.

> Bu oturumda öğrenilen ders burada geçerli: `kisitB.test.ts` üst sınır
> (`toBeLessThanOrEqual`) kontrol ediyor, **eşitlik değil**. Testler
> yeşil kalarak denge sessizce değişebilir. Tek güvenilir bekçi
> `npm run build`'in ürettiği `docs/KURALLAR.md` diff'i.

## Doğrulama

- `npm run test` — havuz testleri (`pool.test.ts`) ve `waveSim.test.ts`
  değişmeden geçmeli.
- `dev.enemyCapacity()` uzun koşuda **sabit** kalmalı (sessiz büyüme
  TIER 1 kural 3 ihlali; havuz iç yapısı değiştiği için bu sayaç asıl
  bekçi).
- `dev.poolExhausted` artmamalı.
- Tepe dalgada 60 FPS; 4× CPU kısıtlamasında ≥ 30 FPS (S15).
- Tahsis oranı: kare başına havuz kaynaklı dizi **0**.

## Bitmedi sayılır eğer

- `waveSim` çıktısı eski koddan farklıysa ve fark açıklanamıyorsa.
- Yineleme sırasında serbest bırakılan bir nesne atlanıyorsa (havuz
  testine kasıtlı bir "yineleme sırasında release" senaryosu eklenmeli).
- `activeItems()` dönüşü mutasyona açık bırakılmışsa (`readonly T[]`
  olmalı; çağıran `sort`/`push` yapamamalı).

## Sonuç

**Yalnız Adım 1 uygulandı — bilinçli olarak, önerinin kendi sırasına
uyularak.**

`EnemyAbilitySystem.ts`'in `.filter()`'ı kaldırıldı: `activeItems()`
artık `update()` başına **bir kez** çağrılıp `aktif` değişkeninde hem
dış hem iç (heal yarıçapı) döngüde paylaşılıyor; canlı/`def` filtresi
`.filter()`'ın ürettiği ikinci diziyle değil, döngü içi `continue`
ile uygulanıyor. Kare başına tahsis 7'den **6**'ya indi (%14) —
davranış ve iterasyon sırası birebir korunarak: `waveSim` ve tüm testler
(742/742) değişmeden geçti, `docs/KURALLAR.md` diff'i boş.

**Adım 2 (ölç) yapılmadı — [Y10](Y10-kisitlanmis-fps-olculmedi.md)'un
zaten belgelediği aynı araç kısıtına takılıyor:** bu ortamda Chrome
DevTools Performance/Memory paneline ve CPU kısıtlamasına erişim yok.
Adım 2 olmadan **Adım 3'e (takas-silme + hedeflemeye `e.id` eşitlik
bozucu) hiç girilmedi** — önerinin kendi metni bunu açıkça şart
koşuyor ("mal olmuyorsa Adım 3 yapılmaz, sıra kararlılığı kazanılmayan
bir başarım için feda edilmez") ve Adım 3'ün maliyeti düşük değil:
hedeflemenin `strongest`/`weakest` modlarındaki eşitlik davranışını
değiştirir, `waveSim` çıktısını kaydırabilir ve ayrı bir denge ölçümü
gerektirir — ölçülmemiş bir kazanç için bu riske girilmedi.

**Kalan 6 tahsis** (`GameScene.ts`, `WaveManager.ts`, `ProjectileSystem.ts`,
`DamageText.ts`, `GoldFlight.ts` — düşman havuzu için ikisi hâlâ ayrı
ayrı `activeItems()` çağırıyor) bilerek dokunulmadan bırakıldı; onlara
girmek (b) ya da (c)'yi gerektirir, ikisi de Adım 2'nin gerekçelendirmesi
olmadan yapılmıyor.

**Durum: Y10 çözülünce buraya dönülüp Adım 2 ile devam edilebilir.**
Şimdilik "bitmedi" değil — önerinin kendi planı tam olarak izlendi,
yalnız ölçüme bağlı kısım ölçüm olmadan yapılmadı.

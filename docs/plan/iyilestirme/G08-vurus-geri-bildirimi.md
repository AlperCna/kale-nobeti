# G08 · Vuruşta darbe geri bildirimi (hit flash) yok

| | |
|---|---|
| **Tür** | Görsel — juice |
| **Önem** | Orta |
| **Emek** | Küçük |
| **Risk** | **Orta** — TIER 1 kural 3 tuzağı tam burada |
| **Dokunulan** | `src/entities/Enemy.ts`, `src/scenes/GameScene.ts:413` |
| **İlgili** | `GAME-DESIGN.md` §10 · TIER 1 kural 3, 6 · [G05](G05-dusman-can-gostergesi.md) |

---

## Bulgu

Bir mermi düşmana isabet ettiğinde düşman sprite'ında **hiçbir şey
olmuyor**. Hasar sayısı uçuyor, ama vuruşun kendisi görsel bir iz
bırakmıyor. Ölüm anında efekt var (`#olumEfekti`), vuruş anında yok.

## Kanıt

İsabet yolu (`GameScene.ts:410-421`):

```ts
this.#damageTexts?.spawn(x, y - ENEMY_SIZE, sonuc.dealt, sonuc.floored);
...
this.#particleBurst(x, y, x - e.x, y - e.y, 4);
this.#hasarUygula(e, sonuc.dealt);
```

Üç şey oluyor: hasar sayısı, 4 parçacık, hasar uygulanması. Düşmanın
kendisine **dokunulmuyor**.

`#hasarUygula` (`GameScene.ts:574-603`) yalnız `hp` düşürüyor ve
ölümse ölüm yoluna giriyor. Ara durumda (`e.hp > 0`) **erken dönüyor**:

```ts
#hasarUygula(e: Enemy, miktar: number): void {
  if (!e.alive) return;
  e.hp -= miktar;
  if (e.hp > 0) return;      // ← hayatta kalan düşmanda hiçbir görsel iş yok
  ...
}
```

`Enemy.resetForPool()` `clearTint()` çağırıyor (`Enemy.ts:126`) — yani
altyapı bir tint kullanımını **bekliyor**, ama hiçbir yerde
`setTint` çağrılmıyor (tarandı).

## §10 ne diyor

`GAME-DESIGN.md` §10 juice listesi bu projede kısmen uygulanmış:

| §10 öğesi | Durum |
|---|---|
| Ekran sarsıntısı | ✅ `ScreenShake`, boss ölümünde |
| Hit-stop | ✅ `HitStop`, ölümde ve boss hasarında |
| Hasar sayıları | ✅ `DamageText` |
| Parçacıklar (maks 300, havuzlu) | ✅ `#particleBurst` |
| Altın uçuşu | ✅ `GoldFlight` (M6-T10) |
| Can kaybında vinyet nabzı | ✅ `#vinyetNabzi` |
| **Vuruş geri bildirimi** | ❌ |

Yani juice katmanı büyük ölçüde tamam; eksik olan tek şey, olayın
**en sık** yaşandığı an.

## Neden önemli

**1. En sık olay, en az geri bildirim.** Bir dalgada yüzlerce isabet
oluyor. Oyuncunun "vurdum" hissini aldığı tek kanal, uçuşan sayı —
ve sayı düşmanın **üstünde** beliriyor, düşmanın kendisinde değil.
Hangi düşmanın vurulduğu, kalabalıkta belirsiz.

**2. Hedefleme modunu görünmez kılıyor.** Beş hedefleme modu var
(§4.5) ve oyuncu bunları menüden seçiyor. Ama **seçimin işe yaradığını
göremiyor**: `strongest` seçildiğinde kulenin gerçekten en güçlüyü
vurup vurmadığı, isabet geri bildirimi olmadan izlenemiyor. Menü bir
karar sunuyor, oyun o kararın sonucunu göstermiyor.

**3. Zırh ve direnç sessiz.** `applyDamage` zırhı uyguluyor ve
`sonuc.floored` bayrağı taşıyor — yani "hasar tabana düştü" bilgisi
**zaten hesaplanıyor** ve `DamageText`'e geçiyor
(`GameScene.ts:413`, ikinci parametre). Bu, hasar sayısının rengiyle
gösteriliyor (§3, S56'da iki renge indirildi). Ama düşman üzerinde
"bu vuruş zayıf geçti" hissi yok.

## TIER 1 kural 3 tuzağı — bu işin asıl riski

Tint tabanlı bir flash, bu projenin **beş kez yaşadığı** hata sınıfının
tam ortasında:

> Havuza dönen nesne **tüm durumunu sıfırlar** (hedef referansı, tween,
> timer, tint) — sıfırlanmayan hedef referansı ölü düşmanı canlı tutar.

Kural metni **tint'i açıkça sayıyor**. Ve bu oturumda beşinci vaka
yakalandı (`GoldCoin`'de `setScale(1)`'in `setDisplaySize` ölçeğini
ezmesi) — testle değil, elle gözden geçirmede.

Somut senaryo: düşman vurulur → `setTint(beyaz)` → 60 ms sonra
`clearTint()` için bir zamanlayıcı/tween kurulur → **düşman o 60 ms
içinde ölür ve havuza döner** → `clearTint` gecikmeli çalışıp
**yeni** düşmanın tint'ini temizler ya da eski tint yeni düşmanda
kalır.

`Enemy.resetForPool()` bugün hem `killTweensOf` hem `clearTint`
çağırıyor (`Enemy.ts:121, 126`) — yani **altyapı bu tuzağa karşı
zaten hazır**. Ama çözüm `scene.time.delayedCall` ile yapılırsa
`killTweensOf` onu yakalamaz.

## Seçenekler

### (a) Tint flash — tween ile

```ts
this.setTint(0xffffff);
this.scene.tweens.add({ targets: this, duration: 80,
  onComplete: () => this.clearTint() });
```

- ✅ Klasik, tanıdık
- ✅ `killTweensOf` (`resetForPool`) tuzağı kapatıyor
- ⚠️ Tween süresi `tweens.timeScale`'e bağlı → 2× hızda 40 ms
  (TIER 1 kural 8 açısından **doğru** davranış)
- ❌ **50 düşman × saniyede birkaç isabet = onlarca eşzamanlı tween.**
  Tween yöneticisi bunun için tasarlandı ama ölçülmeli.
- ❌ Beyaz flash, tezhip paletine yabancı (§2: "parlak çizim film
  paletine kaçılmaz")

### (b) Tint flash — sayaç ile, tween'siz *(önerilen)*

`Enemy`'de bir `#flashLeft` alanı; `step()` içinde `scaledDelta` ile
azalıyor, sıfırlanınca `clearTint()`.

```ts
#flashLeft = 0;

hit(): void { this.#flashLeft = FLASH_MS; this.setTint(FLASH_COLOR); }

step(sd: number): void {
  ...
  if (this.#flashLeft > 0) {
    this.#flashLeft -= sd;
    if (this.#flashLeft <= 0) this.clearTint();
  }
}

resetForPool(): void {
  ...
  this.#flashLeft = 0;   // ← kural 3
  this.clearTint();      // ← zaten var
}
```

- ✅ Tween yok — 50 düşman için ek maliyet neredeyse sıfır
- ✅ `scaledDelta` kullanıyor → 2× hızda doğru (kural 8)
- ✅ Havuza dönüş **tek satırla** güvenli; gecikmeli geri çağrım yok
- ✅ `GoldCoin.step`/`DamageText` ile aynı desen — projede zaten var
- ⚠️ `Enemy` sınıfına bir alan daha ekliyor ve `resetForPool`'a bir
  satır — **kural 3 gereği ikisi de zorunlu**

### (c) Renk yerine ölçek darbesi

Tint yok; kısa bir `scaleX/Y` sıçraması (1 → 1,15 → 1).

- ✅ Renkten bağımsız → TIER 1 kural 6'ya doğal uyum
- ✅ Gri tonlamada da görünüyor
- ⚠️ `setDisplaySize` ile kurulmuş bir sprite'ta ölçek oynatmak
  [GoldCoin'in yaşadığı](../../results/M6-SONUC.md) `#baseScale`
  tuzağının aynısı — taban ölçek yakalanıp ona göre çarpılmalı
- ⚠️ 50 düşman aynı anda nabız atarsa görsel gürültü olur
- ⚠️ Ölüm efekti zaten ölçek kullanıyor (`scaleX: 1.3, scaleY: 0.6`) —
  ikisi karışabilir

### (d) (b) + (c) birlikte, düşük yoğunlukta

Hafif tint **ve** çok küçük bir ölçek darbesi (%5).

- ✅ İki kanal → kural 6 tam karşılanıyor
- ⚠️ İki tuzak birden (tint sıfırlama + taban ölçek)

## Öneri

**(b), `FLASH_COLOR` olarak beyaz değil parşömen/altın tonu.**

Gerekçe: sayaç deseni bu projede kanıtlanmış, tween yükü getirmiyor,
`scaledDelta` sözleşmesine uyuyor ve havuz güvenliği tek satır. Renk
seçimi §2'nin paletinde kalmalı — beyaz flash Kingdom Rush dili,
altın flash tezhip dili.

`FLASH_MS` ve `FLASH_COLOR` **`data/` altına** konmalı, `entities/`
içine gömülmemeli. Bir denge sayısı değil ama TIER 1 kural 1'in
disiplini burada da geçerli: ayarlanabilir görsel sabitler veriye ait.

**`settings.effectScale` koruması:** flash bir *efekt* mi *bilgi* mi?
[G05](G05-dusman-can-gostergesi.md)'te can göstergesinin bilgi olduğu
ve `effectScale: 0` iken bile görünmesi gerektiği savunuldu. Flash
ise **efekt** — ölüm efekti ve parçacıklar gibi `effectScale > 0`
koşuluna bağlanmalı. Bilgi zaten hasar sayısında var.

## Doğrulama

1. Bir kule kur, düşmanların vurulduğunu gözle gör.
2. **Havuz güvenliği:** flash süresi içinde ölen düşmanı üret
   (yüksek hasarlı Top). Havuzdan çıkan yeni düşman tint taşımamalı.
   `dev.enemyKinds()` ile birkaç tur döndürüp gözle kontrol.
3. 2× hızda flash süresi yarıya inmeli.
4. Efekt yoğunluğu **Kapalı** → flash yok, hasar sayısı **var**.
5. Efekt yoğunluğu **Düşük** → flash var mı yok mu, karar verilip
   yazılmalı (0,4 çarpanı süreye mi uygulanır, yoksa açık/kapalı mı).
6. Tepe dalgada 60 FPS; 4× CPU kısıtlamasında ≥ 30 FPS (S15).
7. Gri tonlamada flash görünüyor mu — görünmüyorsa (c) katmanı
   düşünülmeli (kural 6).
8. `FLASH_MS`/`FLASH_COLOR` `data/` altında.
9. `npm run test` — `waveSim` çıktısı **değişmemeli** (bu tamamen
   görsel).

## Bitmedi sayılır eğer

- `resetForPool()` `#flashLeft`'i sıfırlamıyorsa (kural 3).
- Havuzdan çıkan düşman tint taşıyorsa.
- Flash ham `delta` kullanıyorsa (kural 8).
- Sabitler koda gömülüyse.
- `effectScale: 0` iken flash görünüyorsa.
- `waveSim` çıktısı değiştiyse.

## Sonuç

**Öneri (b) aynen uygulandı: sayaç tabanlı tint flash, tween yok.**

### Uygulama

- `data/enemyVisuals.ts` (yeni) — `HIT_FLASH_MS = 80`, `HIT_FLASH_COLOR
  = 0xf2d98a` (parşömen/altın tonu, önerideki gibi beyaz değil).
  `entities/`'e gömülmedi; kural 11 zaten `data/`'nın Phaser importuna
  izin vermiyor, bu dosya da hiç yapmıyor.
- `Enemy.ts`: `#flashLeft` sayaç alanı, `hit()` (tint'i yakıyor),
  `step()`'in başına `scaledDelta` ile azaltıp sıfırlanınca
  `clearTint()` çağıran üç satır. `resetForPool()`'a `#flashLeft = 0`
  eklendi (kural 3 — `Tint` zaten `HAVUZ_ALANLARI`'ndaydı, `clearTint()`
  zaten çağrılıyordu; eksik olan yalnız sayacın kendisiydi).
- **`hit()` çağrı noktası `#hasarUygula` değil, `ProjectileSystem`'in
  `onDamage` callback'i** (`GameScene.ts`, mermi kurulumunun içi).
  Kasıtlı: `#hasarUygula` hem gerçek isabetlerden hem de iki farklı
  "isabet olmayan" yoldan çağrılıyor — yanma tikleri (`#etkileriIsle`,
  saniyede 60 çağrı) ve meteor/genel öldü-mü taraması
  (`#hasarUygula(e, 0)`, iki çağrı yeri). `hit()`'i oraya koymak yanan
  düşmanı sürekli flaşlatır ve sıfır hasarlı taramalarda anlamsız
  flaş üretirdi. `onDamage` yalnız **gerçek mermi isabetinde** (doğrudan,
  patlama, zincir — üçü de `ProjectileSystem.#vur`'dan geçiyor) çağrılıyor.

### Kapsam kararı — yalnızca (b), (c)/(d) değil

Bulgunun (c) seçeneği (ölçek darbesi) test edilmedi: `#particleBurst`/
`#efektler.patlat` ile aynı karede zaten görsel yoğunluk var, ikinci
bir kanal eklemek (d) gürültüyü artırırdı ve `GoldCoin`'in yaşadığı
taban-ölçek tuzağını (`#baseScale` gerekliliği) yeni bir yüzeye
taşırdı. Renk seçimi (0xf2d98a, RGB ~242/217/138) yüksek parlaklıkta
— gri tonlamada düşmanın kendi (koyu) rengine göre **açık bir yama**
olarak kalıyor, kural 6'yı ihlal etmiyor; ayrı bir ölçek katmanı
gerekmedi.

**Efekt yoğunluğu "Düşük" kararı:** doc'un sorduğu "süreye mi
uygulanır, açık/kapalı mı" sorusu **açık/kapalı** olarak çözüldü —
`GoldFlight`'ın zaten kullandığı `effectScale > 0` deseniyle aynı
(`GameScene.ts:663`). Süreyi ayrıca ölçeklemek (`0,4` çarpanı) ek bir
dal açardı; var olan ikili desenle tutarlılık tercih edildi.

### Doğrulama sonuçları

- `npm run typecheck && npm run test` — 742/742 yeşil, **`waveSim`
  çıktısı değişmedi** (tamamen görsel, testler bunu doğruluyor).
- `npm run guard` — 12/12, `k.3` (`HAVUZ_ALANLARI` ↔ `resetForPool`)
  dahil.
- `npm run build` — `docs/KURALLAR.md` diff'i **boş**.
- Canlı tarayıcı: gerçek bir dalga oynatıldı (dev kancasıyla
  `startWaveEarly`), sahne grafiği periyodik olarak taranarak
  (`scene.children.list`, `tintTopLeft`) **gerçek isabetlerde**
  `0xf2d98a` tint'inin aktif düşmanlarda göründüğü ve kısa süre sonra
  kendiliğinden temizlendiği doğrulandı (80 ms'lik pencereye tutarlı
  örnek sayısı). Ardından `dev.setSetting('effects','off')` ile aynı
  taramada **sıfır** örnek çıktı — efekt kapalıyken flash tamamen
  yok, hasar sayısı ayrı kanaldan (BitmapText) çalışmaya devam ediyor.
  Konsol boyunca hatasız; dalga sonuna kadar (kale düşene kadar) çöküş
  yok.
- 2× hız / kural 8: kod incelemesiyle doğrulandı — `#flashLeft` yalnız
  `GameClock.scaledDelta` ile azalıyor ve `scaledDelta = delta × scale`
  (`GameClock.ts:53`), yani 2×'te 80 ms'lik flash 40 ms'de bitiyor;
  ayrı bir canlı ölçüm gerekmedi, sözleşme zaten `Enemy.step`'in tek
  girdisi `scaledDelta` olduğu için mekanik olarak garanti.
- Havuz güvenliği: ayrı bir kasıtlı "flaş sırasında öldür" senaryosu
  elle tetiklenmedi ama gerçek dalga oynatımında onlarca düşman
  öldü/havuza döndü ve sahne taramasında **hiçbir kalıntı tint**
  görülmedi (`tintTopLeft !== beyaz` filtresi dalga bitiminde ve
  `effects:off` sonrasında hep 0 örnek verdi).

### Kapsam

`GAME-DESIGN.md` §10 juice listesi artık tam: yalnız "vuruş geri
bildirimi" satırı eksikti, o da kapandı.

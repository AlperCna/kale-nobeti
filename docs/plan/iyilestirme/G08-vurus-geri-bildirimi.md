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

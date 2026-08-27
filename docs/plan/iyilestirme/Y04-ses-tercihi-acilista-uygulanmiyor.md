# Y04 · Ses tercihi açılışta uygulanmıyor — **hata**

| | |
|---|---|
| **Tür** | Yapısal — doğrulanmış hata |
| **Önem** | Yüksek. Oyuncunun açık tercihi yok sayılıyor |
| **Emek** | Küçük |
| **Risk** | Düşük |
| **Dokunulan** | `src/scenes/BootScene.ts` *veya* `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts:178`, `src/scenes/HudScene.ts:121-126` |
| **İlgili** | `GAME-DESIGN.md` §12 · TIER 1 kural 10 · `RISKS.md` R8 · [Y05](Y05-menu-muzigi-ilk-indirme.md) |

---

## Bulgu

Oyuncu ayarlardan sesi kapatıp sayfayı kapatırsa, bir dahaki açılışta
**menü müziği çalarak açılıyor**. Tercih kaydedilmiş ve okunabiliyor —
ama okunduğu yer, müziğin çalmaya başladığı yerden **sonra** çalışıyor.

## Kanıt

**Ses susturması yalnız iki satırda uygulanıyor, ikisi de `HudScene`'de:**

```
src/scenes/HudScene.ts:119    this.sound.mute = !g.settings.state.sound;   ← panel geri çağrımı
src/scenes/HudScene.ts:125    this.sound.mute = !g.settings.state.sound;   ← create() içinde ilk uygulama
```

`HudScene.ts:121-126`, tam da bu amaçla yazılmış:

```ts
// Başlangıçta da uygula: kayıtlı tercih ve prefers-reduced-motion.
{
  const g = this.#game();
  g.shake.enabled = g.settings.state.screenShake;
  this.sound.mute = !g.settings.state.sound;
}
```

Niyet doğru. Sorun **nerede** olduğu.

**`Settings` nesnesi yalnız `GameScene` içinde kuruluyor:**

```
src/scenes/GameScene.ts:178
  readonly settings = new Settings(new LocalStore(() => this.#kayitUyar()));
```

Kod tabanında `new Settings(` başka hiçbir yerde geçmiyor (tarandı).
`HudScene` de kendi kopyasını kurmuyor, `this.#game().settings` ile
`GameScene`'inkini ödünç alıyor.

**Menü müziği ise `GameScene` hiç var olmadan çalıyor:**

```
src/scenes/MenuScene.ts:38-40
  if (this.sound.get('music_menu')?.isPlaying !== true) {
    this.sound.play('music_menu', { loop: true, volume: 0.5 });
  }
```

`BootScene` ve `PreloadScene`'de `sound` veya `Settings` geçmiyor (tarandı).

## Yeniden üretim

1. Bir haritaya gir, ayarlardan **Ses → Kapalı** yap.
2. Sekmeyi kapat.
3. Sayfayı yeniden aç.
4. Boot → Preload → **Menu**. `GameScene` henüz kurulmadı, `Settings`
   okunmadı, `this.sound.mute` varsayılan `false`.
5. **Menü müziği çalıyor.**

Susturma ancak oyuncu bir haritaya girip `HudScene.create()` koştuğunda
devreye giriyor. Yani oyuncu, kapattığı sesi her açılışta bir kez daha
duymak zorunda.

## Neden önemli

**1. Tercihin ihlali, sesin kendisinden daha kötü.** Ses açık başlamak bir
varsayılan; **kapatılmış** sesin açık başlaması bir hata. `GAME-DESIGN.md`
§12 "tercih kaydedilir" diyor — kaydediliyor ama uygulanmıyor, ki bu
kaydetmemekten farksız.

**2. Portal küratörlüğü tam buraya bakıyor.** `RISKS.md` R8: Poki
"UX/his"e bakıyor. Otomatik çalan ve susturulamamış ses, web oyunu
incelemelerinde en sık işaretlenen maddelerden biri.

**3. Tarayıcı otomatik-oynatma politikasıyla karışıyor.** Chrome, kullanıcı
etkileşimi olmadan sesi zaten engelleyebiliyor. Bu, hatayı **bazı
makinelerde gizliyor** — geliştirme makinesinde sekme daha önce
etkileşim görmüşse ses çalar, temiz profilde çalmaz. Yani "bende olmuyor"
bu hatayı kapatmaz.

## Kök neden

Mimari bir sıralama sorunu: **`Settings` bir oyun-oturumu nesnesi olarak
kurulmuş, oysa uygulama-ömrü nesnesi.** `GameScene`'in alanı olması,
`GameScene`'den önce çalışan hiçbir sahnenin ayarlara erişememesi demek.

`GameScene.ts:178` bir **alan başlatıcı**, yani `create()` dışında —
`CLAUDE.md` Mimari kurallarındaki "kayıt `create()` dışına taşınırsa
semantik tersine döner" uyarısının kardeşi bir durum: nesnenin *ne zaman*
doğduğu, davranışını belirliyor.

## Seçenekler

### (a) `MenuScene`'de yerel bir `Settings` kur

```ts
const s = new Settings(new LocalStore());
this.sound.mute = !s.state.sound;
```

- ✅ Üç satır
- ❌ **İki ayrı `Settings` örneği** doğuyor. Biri menüde, biri oyunda.
  Aynı anahtardan okudukları için bugün aynı değeri görürler, ama
  "tek doğruluk kaynağı" kırılıyor ve bir sonraki ayar eklendiğinde
  hangisinin yazdığı sorusu çıkıyor.

### (b) `Settings`'i `BootScene`'e taşı, `registry` üzerinden paylaş

Phaser'ın `game.registry`'si sahneler arası paylaşılan tek sözlük.

```ts
// BootScene.create()
const settings = new Settings(new LocalStore());
this.registry.set('settings', settings);
this.sound.mute = !settings.state.sound;
```

`GameScene.ts:178` ve `HudScene` bunu `registry`'den alır.

- ✅ Tek örnek, tek doğruluk kaynağı
- ✅ Ayar **oyun açılır açılmaz** uygulanıyor — menüden önce
- ✅ `prefers-reduced-motion` de aynı anda okunmuş oluyor
- ⚠️ `registry.get` tipsiz döner; `as Settings` gerekir ve TIER 1 kural 5
  `any` yasağının ruhuna yakın bir yer. Küçük bir tipli yardımcı
  (`getSettings(scene): Settings`) bunu kapatır.
- ⚠️ `GameScene.settings` bugün `readonly` bir alan; `init()`'te
  atanacak şekilde değişmeli

### (c) Modül düzeyinde tekil (singleton)

`systems/Settings.ts` içinde `export const settings = new Settings(...)`.

- ✅ En az kod
- ❌ TIER 1 kural 11'i zorluyor: `systems/` saf kalmalı, `LocalStore`
  `localStorage`'a dokunuyor ve modül yüklenir yüklenmez koşardı —
  `node` testlerinde import etmek yan etki üretir
- ❌ Test yalıtımı kırılır (`Settings` testleri bugün enjekte edilen
  sahte `KeyValueStore` ile koşuyor)

## Öneri

**(b).** Gerekçe: hata bir sıralama hatası, çözümü de sıralamada olmalı —
"ayarları uygulamanın en erken noktasına taşı". `BootScene` zaten fontları
`await` eden, uygulama-ömrü işlerinin yeri.

`Settings` aynı anda `screenShake` ve `effects` de taşıyor; ikisi de bugün
yalnız `GameScene`'i ilgilendiriyor, ama `registry`'ye taşımak onları da
menüde okunabilir kılıyor ve ileride menüye bir ayar butonu konulursa
(bugün yok — bkz. [G01](G01-menu-oyna-butonu-parsomen.md)) hazır olur.

## Doğrulama

1. Haritaya gir → Ses **Kapalı** → sekmeyi kapat → yeniden aç.
   Menüde **ses yok**.
2. Ses **Açık**'a al → sekmeyi kapat → yeniden aç. Menüde **ses var**.
3. Gizli sekmede aç (TIER 1 kural 10): `localStorage` istisna fırlatır,
   `Settings` varsayılana düşmeli, oyun **çökmemeli**, ses açık gelmeli.
4. `dev.clearCount` / `dev.shutdownListeners` sayaçları etkilenmemeli —
   `BootScene` bir kez koşuyor, dinleyici birikimi yok.
5. `npm run test` — `Settings` testleri enjekte edilen sahte store ile
   koşmaya devam etmeli (kurulum yeri değişti, sözleşme değişmedi).

## Bitmedi sayılır eğer

- Kod tabanında birden fazla `new Settings(` varsa.
- Menüde ses tercihi uygulanmıyorsa.
- `Settings` testleri gerçek `localStorage` istiyorsa.
- Gizli sekmede menü çöküyorsa.

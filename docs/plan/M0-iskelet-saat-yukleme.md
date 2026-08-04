# M0 — İskelet, saat, aşamalı yükleme

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M0 |
| **Görev** | 10 (`M0-T01` … `M0-T10`) |
| **Kod yazma süresi** | ~6 sa 20 dk — **takvim değil** |
| **Takvim bütçesi** | 1 gün (`ROADMAP.md`). **Tahminin tuttuğu tek taş** — saf kod, varlık ve denge işi yok. |
| **Durum** | ☐ bekliyor |

## 0. Oturum başlangıcı

`/clear` sonrası bu taşı açan oturum sırayla şunları okur:

1. `CLAUDE.md` — tamamı. TIER 1 kuralları bağlayıcı.
2. `docs/plan/TASK-TEMPLATE.md` — görev şablonu.
3. `docs/plan/DEPENDENCIES.md` — "Erken karar gerektiren çapraz bağlar" §6.
4. `docs/GAME-DESIGN.md` §1 (Kontroller), §2 (palet, tipografi).
5. `docs/research/02-phaser-teknik.md` §2, §3, §4.

**Başka dosya açma.** Bu taş `research/01`, `03`, `04`, `06`'ya bağlı değil;
açmak bağlamı gereksiz doldurur.

Okuma bitince `M0-T01`'e geç.

## 1. Amaç ve bitiş durumu

**Amaç:** Oynanabilir hiçbir şey üretmeden, sonradan eklenmesi pahalı üç
sözleşmeyi kurmak — `GameClock`, aşamalı yükleme iskeleti, duraklatma.
`ROADMAP.md` M0: "sonradan eklemek her sisteme dokunmak demek".

**Taş bittiğinde oyun:** boş bir mürekkep mavisi oyun alanı gösteriyor.
Menüden oyuna geçiliyor. ESC ve boşluk duraklatıyor. Hız butonu 1×/2× arası
geçiyor ve ekrandaki tek greybox test nesnesi gözle görülür şekilde iki kat
hızlanıyor.

**Olmayan:** kule, düşman, yol, altın, can, atlas, ses, kayıt, harita.
Ekranda yalnız bir dikdörtgen var ve o da M1'de siliniyor.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| 2 — paket boyutu | `M0-T06`, `M0-T10` |
| 5 — `any` yasak | `M0-T01`…`M0-T05`, `M0-T10` |
| 7 — `BitmapText` | `M0-T07`, `M0-T09`, `M0-T10` |
| 8 — ham `delta` yasak | `M0-T04`, `M0-T08`, `M0-T10` |

**Kural 3 (havuzlama) ve kural 9 (karesel mesafe) M0'da geçerli değil** —
havuzlanacak nesne ve mesafe kontrolü yok. İkisi de M1'de devreye giriyor.
Atlanmadılar, kapsam dışılar.

---

## 2. Görevler

### M0-T01 — Proje iskeleti ve araç zinciri

| | |
|---|---|
| **Kimlik** | `M0-T01` |
| **Durum** | ☑ bitti |
| **Süre** | ~40 dk |
| **Önkoşul** | yok |
| **TIER 1** | kural 5 |
| **Açık soru** | S08 |
| **Doküman** | `CLAUDE.md` Teknoloji, Platform kısıtları, Test |

**Dosyalar**
- `package.json` — yeni — bağımlılıklar ve script'ler
- `tsconfig.json` — yeni — strict yapılandırma
- `vite.config.ts` — yeni — `base: './'`
- `vitest.config.ts` — yeni — test ortamı

**İmza**
```jsonc
// package.json → scripts
{
  "dev": "vite",
  "build": "vite build && node scripts/report-size.mjs",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "guard": "node scripts/guard-rules.mjs"
}
```
```ts
// vite.config.ts
export default defineConfig({ base: './' });   // CLAUDE.md Platform
```

**Yapılacak**
- Phaser 3, TypeScript, Vite, Vitest kur. Başka bağımlılık **ekleme** —
  `CLAUDE.md`: "Harici bağımlılık eklemeden önce sor".
- `tsconfig.json`: `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`.
- `build` ve `guard` script'leri `M0-T10`'da yazılacak dosyalara işaret eder;
  o dosyalar yokken `build` kırılmasın diye `report-size.mjs` bu görevde
  tek satırlık yer tutucu olarak oluşturulur.

**Kabul kriteri**
```bash
npm run typecheck && npm run dev
```
Beklenen: `typecheck` çıktı vermeden 0 kodu döner; `dev` `VITE v… ready`
yazar ve `localhost` üstünde boş sayfa servis eder, konsol temiz.

**Bitmedi sayılır eğer:** `vite.config.ts` içinde `base` yoksa veya `'/'` ise.

**Risk:** Phaser tipleri strict modda `any` sızdırabilir. **Erken uyarı:**
`typecheck` ilk çalıştırmada hata yağmuru. Bu görev diğer her şeyden önce
yeşile getirilir, yoksa sonraki dokuz görev boyunca gürültü yapar.

---

### M0-T02 — Phaser yapılandırması ve `index.html`

| | |
|---|---|
| **Kimlik** | `M0-T02` |
| **Durum** | ☑ bitti |
| **Süre** | ~30 dk |
| **Önkoşul** | `M0-T01` |
| **TIER 1** | kural 5 |
| **Açık soru** | — |
| **Doküman** | `CLAUDE.md` Teknoloji, Platform · `GAME-DESIGN.md` §2 · `research/02` §4 |

**Dosyalar**
- `index.html` — yeni — tuval barındırıcı, CSS sıfırlama
- `src/main.ts` — yeni — Phaser yapılandırması ve sahne kaydı

**İmza**
```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,                 // research/02 §4: karar M6'ya ertelendi
  width: 1280, height: 720,          // CLAUDE.md Teknoloji
  backgroundColor: '#14203A',        // GAME-DESIGN §2 "Mürekkep"
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, HudScene],
};
```

**Yapılacak**
- `index.html` gövdesine `-webkit-user-select: none` ve türevleri
  (`CLAUDE.md` Platform kısıtları).
- Sayfa kaydırma çubuğu çıkmasın: `margin: 0`, `overflow: hidden`.
- Letterbox şeritleri mürekkep renginde olsun (`GAME-DESIGN` §2: letterbox
  paletin bir kullanımı).

**Kabul kriteri**
```bash
npm run dev
```
gözle: tarayıcıda 16:9 mürekkep mavisi tuval; pencere daraltılınca en-boy
korunuyor ve şeritler aynı renkte; sayfada kaydırma çubuğu yok; tuval
üstünde metin seçilemiyor. Konsol temiz.

**Bitmedi sayılır eğer:** sahne listesi `main.ts` dışında bir yerde
tanımlanmışsa (`CLAUDE.md` Klasör yapısı: sahne kaydı `main.ts`'te).

---

### M0-T03 — Ortak tipler ve tipli `EventBus`

| | |
|---|---|
| **Kimlik** | `M0-T03` |
| **Durum** | ☑ bitti |
| **Süre** | ~30 dk |
| **Önkoşul** | `M0-T01` |
| **TIER 1** | kural 5 |
| **Açık soru** | S06 |
| **Doküman** | `CLAUDE.md` Mimari kurallar (EventBus, olay listesi) |

**Dosyalar**
- `src/types/common.ts` — yeni — `Vec2` ve temel birlik tipleri
- `src/types/events.ts` — yeni — olay haritası
- `src/systems/EventBus.ts` — yeni — tipli sarmalayıcı
- `src/systems/EventBus.test.ts` — yeni
- `src/data/strings.ts` — yeni — dil haritası (S63)
- `src/util/i18n.ts` — yeni — `t()` erişimcisi

**İmza**
```ts
export interface Vec2 { readonly x: number; readonly y: number }

export interface GameEvents {
  'enemy:killed':  { id: number; gold: number };   // CLAUDE.md'de listeli
  'wave:started':  { index: number };
  'gold:changed':  { total: number };
  'life:lost':     { remaining: number };
  'tower:placed':  { spotIndex: number };
  'speed:changed': { scale: 1 | 2 };               // M0'da eklendi — S06
  'game:paused':   { paused: boolean };            // M0'da eklendi — S06
}

export class EventBus {
  on  <K extends keyof GameEvents>(k: K, fn: (p: GameEvents[K]) => void): void;
  off <K extends keyof GameEvents>(k: K, fn: (p: GameEvents[K]) => void): void;
  emit<K extends keyof GameEvents>(k: K, p: GameEvents[K]): void;
}
```

**İmza — dil haritası (S63)**
```ts
// src/data/strings.ts
export type Locale = 'tr' | 'en';
export const DEFAULT_LOCALE: Locale = 'tr';

/** tr eksiksiz; en şimdilik boş — yapı doğru olsun diye var.
 *  Çeviri M7'de bir oturumluk iş; YAPIYI sonradan eklemek
 *  scenes/'in tamamına dokunmak demek (CLAUDE.md Teknoloji). */
export const STRINGS = {
  tr: { play: 'Oyna', pause: 'Duraklat', resume: 'Devam', speed: 'Hız' },
  en: { play: '', pause: '', resume: '', speed: '' },
} as const satisfies Record<Locale, Record<string, string>>;

// src/util/i18n.ts
export function t(key: StringKey, locale?: Locale): string;
```

**Yapılacak**
- `Phaser.Events.EventEmitter` üstüne tipli kabuk. Ham emitter dışarı sızmaz.
- İlk beş olay `CLAUDE.md` Mimari kurallar'dan birebir alınır.
- `speed:changed` ve `game:paused` M0'ın kendi özellikleri; **S06 onaylanana
  kadar geçici işaretli** yorumla dursun.
- **`strings.ts` tek düz nesne değil, dil haritası** (S63). `t('play')`
  kullanılır, `STRINGS.tr.play` değil — çağrı yerleri dil bilmez.
- `t()` boş çeviri bulursa varsayılan dile düşer, boş string döndürmez.
- Bu dosyalar Phaser'a **hiç dokunmaz** (TIER 1 k.11).

**Kabul kriteri**
```bash
npm run test -- EventBus
```
Beklenen: `3 passed` — `emit`/`on` turu, `off` sonrası çağrılmama,
aynı olaya iki dinleyici.
```bash
npm run test -- i18n
```
Beklenen: `3 passed` — `t('play')` varsayılan dilde `'Oyna'`;
`t('play','en')` boş olduğu için **varsayılana düşüyor**;
`STRINGS.en` anahtar kümesi `STRINGS.tr` ile birebir aynı (tip düzeyinde
zorunlu, testte de doğrulanır).

**Bitmedi sayılır eğer:** yanlış payload ile `emit` çağrısı `npm run typecheck`
sırasında hata vermiyorsa. (Elle doğrula: kasten yanlış payload yaz, hatayı
gör, geri al.)

---

### M0-T04 — `GameClock`

| | |
|---|---|
| **Kimlik** | `M0-T04` |
| **Durum** | ☑ bitti |
| **Süre** | ~45 dk |
| **Önkoşul** | `M0-T01` |
| **TIER 1** | kural 5, **kural 8**, **kural 11** |
| **Açık soru** | — (S02, S08 kapandı) |
| **Doküman** | `CLAUDE.md` TIER 1 k.8, k.11 · Teknoloji · `research/02` §3 |

**Dosyalar**
- `src/systems/GameClock.ts` — yeni — saat sözleşmesi
- `src/systems/GameClock.test.ts` — yeni — saf mantık testi

**İmza**
```ts
export type Speed = 1 | 2;

/** setScale'in dokunduğu Phaser yüzeyi. Sahne bunu zaten sağlıyor;
 *  testte sahte nesne aynı şekli taklit eder. TIER 1 k.11 gereği
 *  burada Phaser'a çalışma zamanı bağımlılığı YOK. */
export interface ClockTarget {
  tweens: { timeScale: number };
  time:   { timeScale: number };
  anims:  { globalTimeScale: number };
}

export class GameClock {
  readonly scaledDelta: number;
  readonly scale: Speed;
  setScale(s: Speed, target: ClockTarget): void;
  tick(delta: number): void;
}
```

**Yapılacak**
- `tick(delta)` ham `delta`yı ölçekle çarpıp `scaledDelta`ya yazar.
- `setScale` **üç** özelliği yazar (`CLAUDE.md` TIER 1 k.8):
  `tweens.timeScale`, `time.timeScale`, `anims.globalTimeScale`.
- **`physics.world.timeScale` yok** — arcade fizik kullanılmıyor
  (`CLAUDE.md` Teknoloji). Senkronda tutulacak zaman otoritesi dörtten
  üçe indi.
- `ClockTarget` arayüzü sayesinde dosya Phaser'ı çalışma zamanında
  **hiç import etmiyor** (TIER 1 k.11) — test `node` ortamında koşuyor.
- Ölçek yalnız `1` veya `2`. `0` yasak — duraklatma `scene.pause()` ile
  yapılır (`research/02` §3: sıfıra bölme riski).

**Kabul kriteri**
```bash
npm run test -- GameClock
```
Beklenen: `4 passed` — `tick(16.67)` 1×'te `16.67`; 2×'te `33.34`;
`setScale(2, sahteHedef)` üç özelliği de `2` yapar;
`setScale(1, ...)` hepsini `1`'e döndürür.

**Bitmedi sayılır eğer:** `GameClock.ts` içinde `import type` olmayan bir
Phaser import'u varsa — o zaman test `node` ortamında `window` arayıp patlar
(TIER 1 k.11).

**Tuzak:** `scene.time.timeScale` yalnız zamanlayıcı olaylarını etkiler,
`update`'teki `delta`yı **etkilemez** (`research/02` §3). `scaledDelta`nın
var olma sebebi tam olarak bu.

---

### M0-T05 — `BootScene` ve font yükleme

| | |
|---|---|
| **Kimlik** | `M0-T05` |
| **Durum** | ☑ bitti |
| **Süre** | ~40 dk |
| **Önkoşul** | `M0-T02` |
| **TIER 1** | kural 5 |
| **Açık soru** | — (S01 kapandı) |
| **Doküman** | `CLAUDE.md` Teknoloji, Varlık formatları · `research/02` §2 · `GAME-DESIGN.md` §2 |

**Dosyalar**
- `src/scenes/BootScene.ts` — yeni — font yükleme, sonra `Preload`
- `public/assets/fonts/grenze.woff2` — yeni — Grenze Gotisch, `latin-ext`
- `public/assets/fonts/spectral.woff2` — yeni — Spectral, `latin-ext`

**İmza**
```ts
export class BootScene extends Phaser.Scene {
  create(): void;
  private loadFonts(timeoutMs: number): Promise<void>;
}
```

**Yapılacak**
- `FontFace` API + `document.fonts.add` (`research/02` §2). `webfontloader`
  gibi harici bağımlılık **ekleme**.
- Yüklenecekler: Grenze Gotisch, Spectral (`GAME-DESIGN.md` §2).
  Sayı fontu bitmap'tir, buraya girmez.
- **Zaman aşımı zorunlu.** Font dosyası yoksa veya yavaşsa oyun takılmaz;
  süre dolunca sistem serif'e düşer ve `Preload`'a geçer.
- `create` içinde `async` kullanma — Phaser döndürülen promise'i beklemez.
  Promise'i içeride yönet, bitince `this.scene.start('Preload')`.

**Font kaynağı (S01 cevabı)**
- Google Fonts'tan **`latin-ext` alt kümesiyle** indirilir, `public/assets/fonts/`
  altında **yerel** sunulur — CDN bağımlılığı yok (`CLAUDE.md` Varlık formatları).
- `&subset=latin-ext` ile indir veya `pyftsubset` ile kendin üret.
- `latin` alt kümesi Türkçe karakterleri **içermez.**

**Kabul kriteri**
```bash
npm run dev
```
gözle, üç kontrol:
1. Fontlar yüklendiğinde ekrandaki test metni **`İIıi ŞşĞğÇçÖöÜü`**
   doğru render ediliyor — hiçbiri kutucuk değil. **`İ` ve `ı` en sık
   kaçan çift**, ayrıca bak.
2. `public/assets/fonts/` **boşaltıldığında** oyun takılmıyor; 2 saniye
   içinde sistem serif'ine düşüp `Preload`'a geçiyor.
3. Konsolda `Unhandled promise rejection` yok.

**Bitmedi sayılır eğer:** font yüklemesi hata verdiğinde siyah ekranda
kalıyorsa, **veya** herhangi bir Türkçe karakter kutucuk çıkıyorsa.

---

### M0-T06 — Aşamalı `PreloadScene`

| | |
|---|---|
| **Kimlik** | `M0-T06` |
| **Durum** | ☑ bitti |
| **Süre** | ~45 dk |
| **Önkoşul** | `M0-T05` |
| **TIER 1** | kural 2 |
| **Açık soru** | — |
| **Doküman** | `ROADMAP.md` M0 · `research/04-varlik-paket-boyut.md` §6 |

**Dosyalar**
- `src/scenes/PreloadScene.ts` — yeni — dört aşamalı yükleme

**İmza**
```ts
export type LoadStage = 'boot' | 'game' | 'background' | 'lazy';

export class PreloadScene extends Phaser.Scene {
  preload(): void;                                            // yalnız queueBoot
  private queueBoot(): void;                                  // menü + UI
  private queueGame(): void;                                  // atlas + ses efektleri
  static queueBackground(scene: Phaser.Scene): void;          // müzik, dalga 1 sonrası
  static queueLazy(scene: Phaser.Scene, mapId: string): void; // harita 2-3 arka planı
}
```

**Yapılacak**
- **Dört fonksiyon boş olsa da ayrı ayrı yazılır.** M0'da yüklenecek varlık
  yok; iskelet şimdi kurulmazsa M6'da sökmek pahalı (`ROADMAP.md` M0).
- Aşama içerikleri `research/04` §6'daki tabloya birebir karşılık gelir.
- Yükleme çubuğu: `this.load.on('progress')` ile basit bir dikdörtgen.
  Parşömen rengi (`GAME-DESIGN.md` §2), süsleme yok.

**Kabul kriteri**
```bash
grep -oE "(private |static )queue[A-Za-z]+\(" src/scenes/PreloadScene.ts | sort -u | wc -l
```
Beklenen: `4` — dört aşama **ayrı ayrı tanımlı** fonksiyon.

> Bu kriter düzeltildi. Önceki hâli `grep -c "queue…" ≥ 8` idi; yorumları
> da sayıyordu ve yorum ekleyerek geçilebiliyordu. Sayım değil, **ayrık
> tanım sayısı** ölçülüyor artık.

gözle: `npm run dev` → yükleme çubuğu görünüp bir sonraki sahneye geçiyor.

**Bitmedi sayılır eğer:** `preload()` içinde `queueGame` de çağrılıyorsa —
oyun varlıkları menüden önce inmemeli, ilk indirmeyi şişirir.

---

### M0-T07 — `MenuScene`

| | |
|---|---|
| **Kimlik** | `M0-T07` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~30 dk |
| **Önkoşul** | `M0-T06` |
| **TIER 1** | kural 7 (istisna kullanımı) |
| **Açık soru** | S05 |
| **Doküman** | `CLAUDE.md` Platform · `GAME-DESIGN.md` §2 |

**Dosyalar**
- `src/scenes/MenuScene.ts` — yeni — başlık ve "Oyna"

**İmza**
```ts
export class MenuScene extends Phaser.Scene {
  create(): void;
  private startGame(): void;   // Game + Hud paralel başlatır
}
```

**Yapılacak**
- Başlık "Kale Nöbeti", Grenze Gotisch. **Statik metin olduğu için
  `Phaser.GameObjects.Text` serbest** (TIER 1 k.7 istisnası) — bunu koda
  yorum olarak yaz, sonradan "kural ihlali mi" diye sorulmasın.
- **Buton yazısı `t('play')` ile gelir**, kodda `'Oyna'` yazmaz
  (`CLAUDE.md` Teknoloji, S63). Oyun başlığı marka adı olduğu için istisna.
- "Oyna" butonu: tıklama alanı **≥ 44×44 px**, yazı **≥ 16 px**
  (`CLAUDE.md` Platform). Tıklama alanı yazı kutusundan büyük olmalı.
- `startGame` hem `Game` hem `Hud` sahnesini başlatır (`CLAUDE.md` Mimari:
  HUD `Game`'in üstünde paralel).

**Kabul kriteri**
```bash
npm run dev
```
gözle: başlık ve buton görünüyor; butonun tıklanabilir alanı yazının
dışına da taşıyor (kenarına tıklayınca da çalışıyor); tıklayınca oyun
alanına geçiliyor. Tarayıcı penceresi yarıya küçültülünce yazı hâlâ okunur.

**Bitmedi sayılır eğer:** buton yalnız yazının tam üstüne tıklanınca
çalışıyorsa.

**Risk:** `Scale.FIT` letterbox'ta girdi koordinatı kayabilir.
**Erken uyarı:** pencere yeniden boyutlandırıldıktan sonra tıklama ıskalıyor.
Kabulü **boyut değiştirilmiş pencerede de** dene.

---

### M0-T08 — `GameScene` ve saat bağlantısı

| | |
|---|---|
| **Kimlik** | `M0-T08` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~35 dk |
| **Önkoşul** | `M0-T04`, `M0-T07` |
| **TIER 1** | **kural 8** |
| **Açık soru** | — |
| **Doküman** | `CLAUDE.md` TIER 1 k.8, Mimari kurallar |

**Dosyalar**
- `src/scenes/GameScene.ts` — yeni — oyun alanı ve saat sahibi

**İmza**
```ts
export class GameScene extends Phaser.Scene {
  readonly clock: GameClock;
  readonly bus: EventBus;
  create(): void;
  update(_time: number, delta: number): void;   // yalnız clock.tick(delta)
}
```

**Yapılacak**
- `update` içinde **tek** iş: `this.clock.tick(delta)`. Başka hiçbir yerde
  ham `delta` kullanılmaz (TIER 1 k.8).
- Ekrana tek bir greybox dikdörtgen; `clock.scaledDelta` ile yatay hareket
  eder, kenara varınca başa döner.
- **Bu nesne M1'de silinir.** Varlık sebebi hız değişiminin gözle
  doğrulanabilmesi; koda o yorumu yaz.

**Kabul kriteri**
```bash
grep -rn "delta" src/ --include=*.ts | grep -v "GameClock" | grep -v "clock.tick"
```
Beklenen: **boş çıktı**.
gözle: `npm run dev` → dikdörtgen sabit hızla sağa gidiyor, kenarda başa dönüyor.

**Bitmedi sayılır eğer:** hareket `delta` ile yapılıyorsa (`scaledDelta` değil).

---

### M0-T09 — `HudScene`, duraklatma ve hız butonu

| | |
|---|---|
| **Kimlik** | `M0-T09` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M0-T08` |
| **TIER 1** | kural 7 |
| **Açık soru** | S03, S04, S07, S09 |
| **Doküman** | `CLAUDE.md` Platform, Mimari · `GAME-DESIGN.md` §1 Kontroller · `research/02` §3 |

**Dosyalar**
- `src/scenes/HudScene.ts` — yeni — duraklatma kaplaması ve hız butonu

**İmza**
```ts
export class HudScene extends Phaser.Scene {
  create(): void;
  private togglePause(): void;              // scene.pause/resume
  private toggleSpeed(): void;              // GameClock.setScale(1|2)
}
```

**Yapılacak**
- `Game` üstünde paralel çalışır (`CLAUDE.md` Mimari). **Duraklatmada Hud
  durmaz** — durursa devam butonu tıklanamaz.
- Duraklatma `scene.pause('Game')` ile. `GameClock.setScale(0)` **değil**
  (`research/02` §3).
- ESC **ve** boşluk ikisi de duraklatır/devam ettirir (`CLAUDE.md` Platform,
  Poki zorunlu şartı).
- Hız butonu 1× ↔ 2×. Etiket değişiyor; TIER 1 k.7 gereği `Text` kullanılamaz
  ama bitmap font M6'ya kadar yok — **S07 cevaplanana kadar iki ayrı statik
  `Text` nesnesinin görünürlüğünü değiştir** ve bunu geçici olarak işaretle.
- Buton `speed:changed` ve `game:paused` olaylarını yayar.

**Kabul kriteri**
```bash
npm run dev
```
gözle: ESC duraklatıyor, tekrar ESC devam ettiriyor; boşluk da aynısını
yapıyor; duraklatmada `M0-T08`'in dikdörtgeni donuyor ama hız butonu hâlâ
tıklanabiliyor; 2× seçince dikdörtgen **gözle görülür şekilde iki kat**
hızlanıyor.

**Bitmedi sayılır eğer:** duraklatmada `Hud` da donuyorsa.

**Risk:** hız butonunun etiketi `Text` olarak yazılıp kural 7 ihlali
kalıcılaşır. **Erken uyarı:** `npm run guard` (`M0-T10`) değişen `Text`
araması yaptığında yakalar — bu yüzden `M0-T10` bu görevden sonra gelmeli.

---

### M0-T10 — Boyut raporu ve kural bekçileri

| | |
|---|---|
| **Kimlik** | `M0-T10` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~40 dk |
| **Önkoşul** | `M0-T01`, `M0-T06`, `M0-T08`, `M0-T09` |
| **TIER 1** | kural 2, 5, 7, 8 (hepsini denetler) |
| **Açık soru** | S10 |
| **Doküman** | `CLAUDE.md` TIER 1 k.2 · `research/05-yayin-platformlari.md` §1 |

**Dosyalar**
- `scripts/report-size.mjs` — değişiklik — yer tutucudan gerçek rapora
- `scripts/guard-rules.mjs` — yeni — TIER 1 kural bekçileri
- `package.json` — değişiklik — `guard` script'i

**İmza**
```ts
// guard-rules.mjs → dört kontrol, hepsi ihlalde exit 1
// 1. ham delta: GameClock dışında "delta" kullanımı
// 2. any:       ": any" | "<any>" | "as any"
// 3. Preload:   dört aşama fonksiyonu var mı
// 4. Text:      update/olay içinde setText çağrısı (kural 7)
```

**Yapılacak**
- `report-size.mjs`: `dist/` içindeki ilk indirme boyutunu yazdırır.
  **> 5 MB uyarı, > 8 MB çıkış kodu 1** (`CLAUDE.md` TIER 1 k.2).
  "İlk indirme" tanımı **S10**'a bağlı; cevap gelene kadar `dist/` toplamı
  kullanılır ve bu varsayım çıktıda yazdırılır.
- `guard-rules.mjs`: yukarıdaki dört kontrol. Node ile yazılır ki
  PowerShell'de de çalışsın (`TASK-TEMPLATE.md` Kabuk notu).

**Kabul kriteri**
```bash
npm run guard && npm run build
```
Beklenen: `guard` → `4/4 ✓` ve 0 kodu. `build` → `İlk indirme: X.XX MB
(varsayım: dist/ toplamı — S10)`.

**Negatif doğrulama (zorunlu):** `src/` içine kasten `const x: any = 1;`
ekle, `npm run guard` → exit 1 ve `any` ihlali raporlanıyor. Sonra geri al.
Bu adım atlanırsa bekçilerin gerçekten çalıştığı bilinmiyor demektir.

**Bitmedi sayılır eğer:** `guard` hiçbir ihlal olmadığında da olduğunda da
0 dönüyorsa.

---

## 3. AÇIK SORULAR

Tam liste ve varsayılan davranışlar: [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md)

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S03 | Duraklatma ekranında ne olacak? | `M0-T09` |
| S04 | 2× seçimi kalıcı mı? | `M0-T09` |
| S05 | Menü M0'da ne kadar dolu? | `M0-T07` |
| S06 | `EventBus` M0'da mı kurulsun, iki yeni olay onaylanıyor mu? | `M0-T03` |
| S07 | Hız butonu etiketi TIER 1 k.7'yi nasıl karşılayacak? | `M0-T09` |
| S09 | `prefers-reduced-motion` M0'da mı okunacak? | `M0-T09` |
| S10 | "İlk indirme" tam olarak neyi kapsıyor? | `M0-T10` |

> **S01, S02, S08 ve S63 kapandı.** Fontlar Google Fonts'tan `latin-ext`
> alt kümesiyle, yerel sunulur (`M0-T05`). Metinler `src/data/strings.ts`
> içinde **dil haritası**: `{ tr, en }`, varsayılan `tr`, `en` şimdilik boş
> (`M0-T03`, `M0-T07`). Gerekçeler `CLAUDE.md` Teknoloji.

> **S02 ve S08 kapandı.** Arcade fizik **kullanılmıyor** (`CLAUDE.md`
> Teknoloji); Vitest ortamı **`node`**, Phaser'a dokunan kısımlar sahte
> nesneyle (`CLAUDE.md` Test). İkincisinin çalışma koşulu **TIER 1 kural 11**
> olarak yazıldı: saf mantık dosyaları Phaser'ı yalnız `import type` ile alır.

Kalan sekiz sorunun hepsinin makul bir varsayılanı var; hiçbiri denge
sayısı içermiyor.

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| `setScale` üç özellikten birini atlar | 2× hızda bir sistem hızlanmıyor (ör. tween'ler normal, hareket hızlı) | `M0-T04` testi üçünü de tek tek doğrular |
| `GameClock.ts` Phaser'ı çalışma zamanında import eder | `npm run test` `window is not defined` ile patlar | `ClockTarget` arayüzü + TIER 1 k.11 |
| `base: './'` unutulur | `dev`'de fark edilmez; alt klasörden servis edilince beyaz ekran | Taş sonu kontrolünde `dist/` alt klasörden servis edilir |
| Phaser tipleri strict modda `any` sızdırır | `typecheck` ilk kurulumda hata yağmuru | `M0-T01` her şeyden önce yeşile getirilir |
| `Scale.FIT` letterbox'ta girdi kayması | Pencere boyutu değişince tıklama ıskalıyor | `M0-T07` kabulü boyut değiştirilmiş pencerede de yapılır |
| Font yüklemesi asılı kalır | Siyah ekranda takılma | `M0-T05`'te zaman aşımı + sistem serif |
| Aşamalı `Preload` tek bloka çöker | M0'da varlık yok, **fark edilmez**; M6'da patlar | `M0-T06` `grep` kabulü |
| Ham `delta` sızar | M1'de düşman 2×'te hızlanmaz | `M0-T08` kabulü + `guard` |
| Kural 7 ihlali kalıcılaşır | Hız butonu `setText` kullanıyor | `guard` kontrol 4 |
| M0 kapsamı şişer | Görev sayısı 10'u geçer | ROADMAP M0 kabulünün dışı M1'e |

## 5. Taş sonu kontrol listesi

- [ ] `npm run typecheck && npm run test && npm run build && npm run guard` dördü de yeşil
- [ ] `npm run dev` → menüden oyuna geçiliyor
- [ ] ESC **ve** boşluk duraklatıp devam ettiriyor
- [ ] Hız butonu 1×/2× geçiyor ve test nesnesi gözle iki kat hızlanıyor
- [ ] Duraklatmada Hud yanıt vermeye devam ediyor
- [ ] Konsolda hiçbir hata veya uyarı yok
- [ ] `dist/` bir alt klasörden servis edildiğinde çalışıyor (`base:'./'`)
- [ ] `guard` negatif doğrulaması yapıldı (kasten ihlal → exit 1)
- [ ] `npm run build` ilk indirme boyutunu ve S10 varsayımını yazdırıyor
- [ ] 10 açık sorunun durumu `OPEN-QUESTIONS.md`'de güncel
- [ ] Bu taşta verilen kararlardan `CLAUDE.md`'ye eklenmesi gerekenler
      **önerildi** (eklenmedi — `ROADMAP.md` komut şablonu)
- [ ] **`docs/results/M0-SONUC.md` yazıldı** — ilk indirme boyutu, gerçek
      süre ve sabitlenen sürümler dahil. Bu dosya yazılmadan M1 başlamaz.

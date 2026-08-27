# G01 · Menü "Oyna" butonu parşömen çerçeveye geçmedi

| | |
|---|---|
| **Tür** | Görsel — tutarlılık |
| **Önem** | Yüksek. Oyuncunun gördüğü **ilk** etkileşimli öğe |
| **Emek** | Küçük |
| **Risk** | Düşük |
| **Dokunulan** | `src/scenes/MenuScene.ts:63-92` |
| **İlgili** | `GAME-DESIGN.md` §2 · [G02](G02-hud-hiz-butonu-parsomen.md) (aynı sınıf) |

---

## Bulgu

M6'da bütün butonlar `createParchmentButton` ile tezhipli çerçeveye
geçirildi. **Menü butonu geçmedi.** Oyuncunun ilk gördüğü etkileşimli öğe,
oyunun geri kalanında terk edilmiş bir stili kullanıyor.

## Kanıt

`createParchmentFrame` / `createParchmentButton` kullanan dosyalar
(tarandı, tam liste):

```
src/fx/ParchmentFrame.ts     ← tanım
src/scenes/GameScene.ts      ✅
src/scenes/GameOverScene.ts  ✅
src/scenes/HudScene.ts       ✅ (kısmen — bkz. G02)
src/scenes/LevelSelectScene.ts ✅
src/fx/SettingsPanel.ts      ✅
src/fx/AbilityButtons.ts     ✅
```

`MenuScene.ts` bu listede **yok**. Bunun yerine:

```ts
// src/scenes/MenuScene.ts:64-67
const arka = this.add
  .rectangle(x, y, BTN_W, BTN_H, PARCHMENT)
  .setStrokeStyle(2, GOLD)
  .setInteractive({ useHandCursor: true });
```

Bu, M6 öncesi greybox deseni: **düz dolgu + 2 px altın kontur**. Aynı
desen `GameScene`'in kule menüsünde ve `GameOverScene`'in "Ana menü"
butonunda vardı; ikisi de bu oturumda parşömene çevrildi
(`14fff68`, `eaa02c7`). Menü atlandı.

## Neden önemli

**1. İlk izlenim, tek izlenimdir.** `RISKS.md` R8: Poki küratörlüğü
"içerik miktarı değil, **cila**"ya bakıyor. İncelemeci ilk 10 saniyede
menü ekranını görüyor. Menü ekranı, oyunun geri kalanından daha az
işlenmiş görünüyorsa, incelemeci oyunun tamamı hakkında yanlış bir tahmin
yapıyor.

**2. Arka planla çelişiyor.** `MenuScene.ts:32` gerçek üretilmiş bir
arka plan görseli koyuyor (`menu-bg`, 104,6 KB WebP, `M6-T05` briﬁyle
"kompozisyon üst-orta boşluk bırakacak şekilde" üretildi). Üzerine
konan düz dikdörtgen, o kompozisyonun üstünde yapıştırılmış duruyor.

**3. Etkileşim geri bildirimi de düz renk değişimiyle yapılıyor**
(`MenuScene.ts:78-89`): `pointerover` → `setFillStyle(GOLD)`,
`pointerdown` → `setFillStyle(INK)`. Parşömen dokusu geldiğinde bu
geçişler de dokuya uygun bir şeye dönmeli (ölçek/parlaklık), yoksa
doku üstüne düz renk basılır.

## Bugünkü davranışın koruması gereken kısmı

`MenuScene.ts:56-62` çok belirgin bir uyarı taşıyor:

> Etkileşim **dikdörtgene** bağlanıyor, metne değil. Metne bağlansaydı
> yalnız harflerin tam üstüne tıklandığında çalışırdı — bu görevin
> "bitmedi sayılır eğer" maddesi tam olarak bu.

**Bu kural dönüşümde korunmalı.** `createParchmentButton` bir
`Container` döndürüyor; tıklama alanının **butonun tamamı** olduğu
(yalnız köşe görselleri değil) doğrulanmalı. `GameOverScene.ts:106`
(`cerceve.on('pointerup', ...)`) bunun çalışan bir örneği.

## Seçenekler

### (a) Doğrudan `createParchmentButton`'a çevir

`GameOverScene.ts:104-113` deseninin birebir kopyası:

```ts
const cerceve = createParchmentButton(this, x, y, BTN_W, BTN_H, 16);
this.add.text(x, y, t('play'), { ... }).setOrigin(0.5);
cerceve.on('pointerup', () => this.#startGame());
```

- ✅ Bir oturumdan kısa
- ✅ Kanıtlanmış desen, üç yerde çalışıyor
- ⚠️ `pointerover`/`pointerout`/`pointerdown` geri bildirimi
  `setFillStyle` ile yapılamaz (artık dolgu yok, doku var)

### (b) (a) + dokuya uygun vurgu

Üzerine gelme ve basma geri bildirimi:
- `pointerover`: `setScale(1.03)` + metin rengi altına kayar
- `pointerdown`: `setScale(0.98)`
- `pointerout`: `setScale(1)`

Ölçek değişimi dokuyu bozmuyor ve dokunmatikte de anlamlı
(basma hissi). Süre kısa tutulur (~80 ms tween) ya da anında uygulanır.

### (c) Butonu tamamen kaldır — arka plana gömülü "Oyna"

Arka plan görselinin kompozisyonuna doğrudan oturan, çerçevesiz bir
altın yazı.

- ✅ En temiz görünüm
- ❌ Dokunmatik hedef belirsizleşiyor. `CLAUDE.md` Platform: minimum
  dokunmatik hedef **44×44 px** ve `MenuScene.ts:9-13` butonun tıklama
  alanının "yazı kutusundan **belirgin biçimde** büyük" olması gerektiğini
  açıkça gerekçelendiriyor. (c) bu gerekçeyi geri alıyor.
- ❌ Reddedilir.

## Öneri

**(b).** (a) tek başına butonu tutarlı yapıyor ama ölü hissettiriyor;
üzerine gelme geri bildirimi bugün var ve kaybedilmemeli.

Aynı işte **G02** de yapılmalı — ikisi aynı sınıf ve aynı desen, ayrı
ayrı ele almak iki kez aynı dosyayı açmak demek.

## Ayrıca dikkate değer (bu iş sırasında görülecek)

`MenuScene`'de **ayarlar butonu yok**. Ayarlara ancak bir haritaya
girdikten sonra (`HudScene`) erişilebiliyor. Sesi kapatmak isteyen
oyuncu, önce bir harita başlatmak zorunda —
[Y04](Y04-ses-tercihi-acilista-uygulanmiyor.md) ile aynı kökten çıkan
ikinci bir sonuç. Y04 `Settings`'i `BootScene`'e taşıdığında menüye ayar
butonu koymak **bedava** hâle geliyor. İki iş birlikte planlanmalı.

## Doğrulama

1. Menüde butonun parşömen dokusunu taşıdığını ekran görüntüsüyle
   doğrula.
2. Butonun **köşesine** (yazının dışına, çerçevenin içine) tıkla —
   oyun başlamalı. Bu, `MenuScene.ts:56-62`'deki kuralın regresyon
   testi.
3. 640×360'a küçült (`CLAUDE.md` Platform): yazı ≥ 16 px okunur kalmalı,
   çerçeve köşeleri bulanıklaşmamalı.
4. Üzerine gel / bas / çek — üç durumun da ayırt edilebilir olduğunu gör.
5. Dokunmatik öykünmesinde (`resize_window` mobile ön ayarı) butonun
   ≥ 44×44 px kaldığını doğrula.

## Bitmedi sayılır eğer

- Tıklama yalnız yazının üstünde çalışıyorsa.
- Üzerine gelme geri bildirimi kaybolduysa.
- 640×360'ta çerçeve okunmuyorsa.
- `createParchmentButton` kullanmayan bir buton kod tabanında kaldıysa
  (G02 ile birlikte sıfırlanmalı).

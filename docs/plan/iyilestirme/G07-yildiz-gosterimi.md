# G07 · Yıldızlar sistem yazı tipine bırakılmış — platforma göre değişiyor

| | |
|---|---|
| **Tür** | Görsel — platformlar arası tutarlılık *ve* hizalama |
| **Önem** | Orta-yüksek. İlerlemenin **tek** görsel ödülü |
| **Emek** | Küçük-orta (bir atlas karesi üretilecek) |
| **Risk** | Düşük |
| **Dokunulan** | `src/scenes/GameOverScene.ts:74-82`, `src/scenes/LevelSelectScene.ts:121-136`, `assets-src/hud/`, `scripts/prep-assets.mjs` |
| **İlgili** | `GAME-DESIGN.md` §9 · `CLAUDE.md` Varlık formatları (`latin-ext` gerekçesiyle aynı sınıf) |

---

## Bulgu

Yıldızlar — oyunun **tek** kalıcı ilerleme ödülü — `★` (U+2605) Unicode
karakteriyle ve `fontFamily: 'serif'` ile çiziliyor. Bu, oyunun görünüşünü
**oyuncunun işletim sistemine** devrediyor. Kod bunun geçici olduğunu
zaten söylüyor, ama söylediği yerde kalmış.

## Kanıt

### Kod, borcu kendisi yazmış

```ts
// src/scenes/GameOverScene.ts:73
// §9 eşikleri: 20 → ★★★, 15-19 → ★★, ≤14 → ★. Görselleştirme M7'de.
```

M7 bitti. Görselleştirme gelmedi.

### İki yerde, ikisi de sistem yazı tipiyle

```ts
// src/scenes/GameOverScene.ts:75-81
this.add
  .text(width / 2, height / 2 + 20, '★'.repeat(this.#yildiz(lives)), {
    fontFamily: 'serif',
    fontSize: '36px',
    color: '#D4A032',
  })
```

```ts
// src/scenes/LevelSelectScene.ts:122-136
this.add.text(x, y - 8, '★★★', { fontFamily: 'serif', fontSize: '30px',
                                  color: 'rgba(212,160,50,0.35)' }).setOrigin(0.5);
if (yildiz > 0) {
  this.add.text(x - 30 + (yildiz * 30) / 2 - 15 + 15, y - 8, '★'.repeat(yildiz),
                { fontFamily: 'serif', fontSize: '30px', color: '#D4A032' })
    .setOrigin(0.5);
}
```

### Atlas'ta yıldız karesi **yok**

`public/assets/atlas.json` — 34 kare, tam liste tarandı:

```
cartouche, corner, edge-strip, middle-texture, gold-coin,
okcu_t1..t3b, top_t1..t3b, buyu_t1..t3b, kisla_t1..t3b,
goblin, ork_savasci, kurt_binicisi, harpi, zirhli_ork, saman,
trol, orumcek_ana, orumcek_yavrusu, ogre_sef_boss, kisla_askeri,
meteor_icon, takviye_icon
```

`yildiz` / `star` yok. Yani yıldız, üretilmiş sanata sahip olmayan
**tek** oyuncu-görünür simge.

## Neden önemli

### 1. `serif` yıldızı içermiyor — yedek yazı tipine düşüyor

`fontFamily: 'serif'` Windows'ta Times New Roman'a çözülüyor.
**Times New Roman U+2605'i içermiyor.** Tarayıcı yedek zincirine düşüyor
(Windows'ta genellikle Segoe UI Symbol, macOS'ta Apple Symbols,
Android'de Noto Symbols). Sonuç:

| Platform | Muhtemel sonuç |
|---|---|
| Windows | Segoe UI Symbol — ince, köşeli yıldız |
| macOS | Apple Symbols — farklı oran ve ağırlık |
| Android/Chrome OS | Noto — üçüncü bir biçim |
| Bazı yapılandırmalar | **Renkli emoji** (⭐) — `color: '#D4A032'` yok sayılır |
| En kötü | Tofu kutusu (□) |

Yani ödül ekranı, oyuncunun makinesine göre üç farklı görünüyor ve
en kötü durumda **altın rengi hiç uygulanmıyor**.

> Bu, `CLAUDE.md` Varlık formatları bölümündeki `latin-ext` kararının
> tam kardeşi. Orada "yalnız biri indirilirse arayüzde kutucuk çıkar"
> deniyor ve proje bu riski ciddiye alıp iki alt kümeyi de indiriyor.
> Aynı titizlik yıldıza uygulanmamış.

### 2. Ölçüm

`sharp`'ın pango render'ıyla ölçüldü (`font: serif`, aynı yedek zinciri):

| Metin | Genişlik |
|---|---|
| `★` | 10 px |
| `★★` | 22 px |
| `★★★` | 34 px |

Yani **ilerleme adımı 12 px, mürekkep genişliği 10 px** — glif kendi
kutusundan dar ve simetrik değil. Bu oran yedek yazı tipine göre değişir,
yani **hizalama hesabı hiçbir platformda güvenilir olamaz**.

### 3. `LevelSelectScene`'deki hizalama formülü şüpheli

```
x - 30 + (yildiz * 30) / 2 - 15 + 15
```

`- 15 + 15` birbirini götürüyor, yani formül sadeleşince:

```
x - 30 + 15 × yıldız
```

Arka plandaki soluk `★★★` `x`'te ortalı. Kazanılan yıldızların soldan
hizalanması için gereken merkez (adım genişliği `W` olmak üzere):

```
x + W × (yıldız/2 − 1,5)
```

`W = 30` varsayımıyla bu `x + 15×yıldız − 45` eder. Formül ise
`x + 15×yıldız − 30` veriyor — **sabit +15 px kayma**, yani tam yarım
yıldız. Ama `W`'nin gerçek değeri yedek yazı tipine bağlı (ölçümde
30 px'lik yazıda ~36 px çıkması beklenir, 30 değil), dolayısıyla kayma
platformdan platforma da **değişiyor**.

> **Dürüst not:** bu hizalama sapması tarayıcıda gözle **doğrulanmadı**;
> yukarıdaki, koddaki aritmetikten çıkan bir çıkarım. Ama zaten asıl
> mesele bu değil: hangi formül yazılırsa yazılsın, ölçüsü bilinmeyen
> bir yedek gliften hizalama çıkarmak mümkün değil. **Çözüm formülü
> düzeltmek değil, glifi ele almak.**

### 4. §9'un tek ödülü

`GAME-DESIGN.md` §9: 20 can → ★★★, 15-19 → ★★, ≤14 → ★. Yıldız,
oyuncunun bir haritayı "ne kadar iyi" bitirdiğinin tek kaydı
(`SaveData.stars`, S60) ve tekrar oynama sebebinin tamamı. Oyunun
en çok yatırım isteyen görsel öğelerinden biri olması gerekirken,
en az yatırım yapılanı.

## Seçenekler

### (a) Yıldızı atlas'a al *(önerilen)*

`assets-src/hud/star.png` (dolu) — ve tercihen `star-empty.png` (boş/soluk
kontur) üretilir, `prep-assets.mjs` MANIFEST'ine eklenir, iki sahne
`add.image(..., 'atlas', FRAME_STAR)` kullanır.

- ✅ Her platformda **birebir aynı**
- ✅ Tezhip paletinde, altın varak dokusuyla çizilebilir
- ✅ Hizalama artık aritmetik değil, konumlandırma: `i × ADIM` ile
  üç yıldız kesin yerleştirilir
- ✅ Atlas'ta yer var: bugün 1024×272, sınır 2048×2048 — bol pay
- ✅ Boyut etkisi ihmal edilebilir (atlas 59,8 KB; iki küçük kare ~1-2 KB)
- ⚠️ Sanat üretimi gerekiyor (P01-P04 ile aynı araç, tek oturumluk)
- ⚠️ `spriteFrames.ts`'e `FRAME_STAR` / `FRAME_STAR_EMPTY` eklenmeli

### (b) Bitmap fontuna yıldız karakteri ekle

`prep-assets.mjs` `SAYI_KARAKTERLERI` dizisine `★` eklenir; Inter Tight'tan
render edilir.

- ✅ Yeni sanat gerekmiyor, mevcut boru hattı
- ✅ Metin gibi kullanılabiliyor (`'★'.repeat(n)` deseni korunuyor)
- ❌ **Inter Tight de U+2605 içermiyor** (bir arayüz yazı tipi, sembol
  yazı tipi değil) — pango yine yedeğe düşer ve sorun *üretim* tarafına
  taşınır, çözülmez
- ❌ Yıldız tezhip estetiğinde olmaz, düz geometrik bir glif olur

### (c) SVG/`Graphics` ile prosedürel yıldız çiz

Beş köşeli yıldızı `Graphics` ile poligon olarak çizmek.

- ✅ Varlık yok, platform bağımsız
- ✅ Boyut sıfır
- ❌ Tezhip dokusu yok — düz renkli poligon, `GAME-DESIGN.md` §2'nin
  "altın varak" ifadesinin karşılığı değil
- ❌ Menzil çemberi kararının (`Graphics` prosedürel kalıyor) gerekçesi
  burada geçerli değil: menzil her yarıçapta farklı, yıldız hep aynı
  boyutta — yani prosedürelliğin sağladığı esneklik burada işe yaramıyor

## Öneri

**(a).** İki kare üret: `star` (kazanılmış, altın varak) ve `star-empty`
(kazanılmamış, soluk kontur). İki kare, tek soluk `★★★` + üstüne bindirme
hilesini de ortadan kaldırıyor — üç yuva çizilir, her biri dolu ya da boş.

Bu ayrıca `LevelSelectScene`'deki hizalama formülünü **tamamen siliyor**:

```ts
for (let i = 0; i < 3; i++) {
  this.add.image(x + (i - 1) * ADIM, y - 8, 'atlas',
                 i < yildiz ? FRAME_STAR : FRAME_STAR_EMPTY)
      .setDisplaySize(BOYUT, BOYUT);
}
```

## Doğrulama

1. `npm run prep-assets` → atlas 36 kare olmalı, `star` ve `star-empty`
   listede. Atlas hâlâ ≤ 2048×2048.
2. `npm run build` → varlık boyutu artışı < 5 KB.
3. Harita 1'i **20 canla** bitir → 3 dolu yıldız.
4. 17 canla bitir → 2 dolu + 1 boş.
5. 12 canla bitir → 1 dolu + 2 boş.
6. Kaybet → yıldız gösterilmemeli (`GameOverScene.ts:74` `if (won)`).
7. Seviye seçime dön — kart üstündeki yıldızlar `GameOver`'dakiyle
   **aynı** sayıda ve **hizalı**.
8. 640×360'a küçült — yıldızlar ayırt edilebilir mi (dolu/boş farkı
   yalnız renk değil, dolgu/kontur farkı da olmalı — TIER 1 kural 6).
9. Gri tonlamada dolu/boş ayrımı korunuyor mu.
10. `dev.gameOver()` `stars` alanı görselle uyuşmalı.

## Bitmedi sayılır eğer

- Kod tabanında `'★'` karakteri kaldıysa.
- Dolu/boş ayrımı yalnız renge dayanıyorsa (kural 6).
- `GameOver` ve `LevelSelect` farklı sayıda yıldız gösteriyorsa.
- 640×360'ta yıldızlar birbirine giriyorsa.
- `GameOverScene.ts:73`'teki "Görselleştirme M7'de" yorumu duruyorsa.

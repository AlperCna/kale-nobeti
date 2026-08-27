# G02 · HUD hız butonu (1×/2×) parşömen çerçeveye geçmedi — ☑ **düzeltildi (2026-08-27)**

| | |
|---|---|
| **Tür** | Görsel — tutarlılık |
| **Önem** | Orta. Oyun boyunca ekranda duran üç butondan biri |
| **Emek** | Küçük (gerçekleşen) |
| **Risk** | Düşük — doğrulandı |
| **Dokunulan** | `src/scenes/HudScene.ts`, `scripts/guard-rules.mjs` |
| **İlgili** | [G01](G01-menu-oyna-butonu-parsomen.md) (aynı oturumda yapıldı) · S07 (kapandı) |

---

## Sonuç (2026-08-27)

**Düzeltildi, seçenek (b) uygulandı.** `#createSpeedButton`
`createParchmentButton`'a geçti; `#label1x`/`#label2x` (iki statik
`Text`) yerine tek `#hizYazi` (`BitmapText`, `NUMBER_FONT_KEY`,
`.setTint(INK)` — parşömen zeminde altın okunmuyordu). `#toggleSpeed`
artık `setText('1×'|'2×')` çağırıyor. **S07'nin borcu kapandı**
(`OPEN-QUESTIONS.md` güncellendi).

**Beklenen yanlış pozitif çıktı, önceden öngörüldüğü gibi:**
`guard-rules.mjs`'in k.7 kontrolü `HudScene.ts`'i ihlal olarak
işaretledi — dosyada hem `BitmapText.setText` hem başka alanların
`add.text`si var, eski kontrol ikisini ayıramıyordu. **Bekçi
düzeltildi, kural değil** (dosyanın kendi önerisi buydu): kontrol artık
`setText`in **alıcısını** bulup atandığı yeri arıyor — `.bitmapText(`
ile kurulmuşsa serbest, değilse (ya da çözülemiyorsa) eski muhafazakâr
davranışa dönüyor. Kasıtlı bozma sınamasıyla doğrulandı: gerçek bir
`Text.setText` hâlâ yakalanıyor.

**Canlı doğrulama:**

| Kontrol | Sonuç |
|---|---|
| `BitmapText` tint'i | `1318970` = `0x14203a` (`INK`) — parşömen zeminde doğru kontrast |
| `pointerup` → toggle | `dev.scale()` `1→2`, metin `'1×'→'2×'` |
| Gerçek hızlanma | `tweens/time/anims.timeScale` üçü de `2` |
| `npm run guard` | 10/10, ayrıca kasıtlı bozmayla negatif doğrulandı |

`npm run typecheck/test (698/698)` yeşil. `docs/KURALLAR.md` diff'i boş.

**Not:** aynı oturumda G01'de eklenen `addPressFeedback` hız butonuna
**bilerek eklenmedi** — `HudScene`'deki diğer parşömen butonlar
(ayarlar, erken başlat) da bugün bu geri bildirimi taşımıyor; yalnız
hız butonuna eklemek HUD içinde yeni bir tutarsızlık yaratırdı. HUD
genelinde hover/basma geri bildirimi ayrı, kapsamı daha geniş bir iş.

---

## Bulgu

HUD'da üç buton var: **ayarlar**, **erken başlat**, **hız**. İlk ikisi
parşömen çerçeveye geçirildi. **Hız butonu geçmedi** ve sağ üst köşede,
oyunun tamamı boyunca ekranda duruyor.

## Kanıt

```ts
// src/scenes/HudScene.ts:244-247
const arka = this.add
  .rectangle(x, y, BTN, BTN, INK)
  .setStrokeStyle(2, GOLD)
  .setInteractive({ useHandCursor: true });
```

Aynı dosyada `createParchmentButton`/`createParchmentFrame` **kullanılıyor**
— yani desen bu dosyada zaten mevcut, yalnız bu buton atlanmış. Bu bir
"stil kararı" değil, gözden kaçma: `HudScene` `ParchmentFrame`'i içe
aktaran yedi dosyadan biri.

Ayrıca dikkat: bu buton `INK` (koyu mürekkep) dolgu kullanıyor,
`MenuScene`'inki `PARCHMENT` (açık) kullanıyor. Yani **iki eski buton
birbiriyle de tutarsız** — biri koyu, biri açık.

## Neden önemli

**1. Sürekli görünür.** Menü butonu (G01) bir kez görülüyor; hız butonu
her dalgada, her kare ekranda. Tutarsızlık burada daha çok birikiyor.

**2. Komşusuyla yan yana duruyor.** Ayarlar butonu parşömen, hız butonu
düz koyu dikdörtgen — ikisi HUD'un aynı köşesinde. Fark, tek başına
bakıldığında değil, **yan yana** bakıldığında göze çarpıyor.

**3. `BTN` boyutunda bir kare** — parşömen çerçeve için en kolay durum
(9-slice köşeleri kare bir kutuda hiç gerilmiyor). Yani dönüşüm burada
diğer butonlardan bile daha ucuz.

## Korunması gereken davranış — S07

`HudScene.ts:250-251` ve `258-263` bir tasarım kararını uyguluyor:

```ts
this.#label1x = this.add.text(x, y, '1×', stil).setOrigin(0.5);
this.#label2x = this.add.text(x, y, '2×', stil).setOrigin(0.5).setVisible(false);
```
```ts
// Etiket değişmiyor, görünürlük değişiyor — S07.
this.#label1x?.setVisible(this.#speed === 1);
this.#label2x?.setVisible(this.#speed === 2);
```

**Gerekçe (`OPEN-QUESTIONS.md` S07):** TIER 1 kural 7 değişen metnin
`BitmapText` olmasını istiyor. Burada `setText` **hiç çağrılmıyor** —
iki statik `Text` var, yalnız görünürlükleri değişiyor. Kuralın önlemek
istediği canvas yeniden üretimi doğmuyor.

S07 aynı satırda bir borç da bırakmış:

> M6'da ikisi tek `BitmapText` olacak

Sayı bitmap fontu **artık var** (`M6-T01`, `numbers.png` + `.xml`,
`NUMBER_FONT_KEY`) ve `×` karakteri font karakter kümesinde **mevcut**
(`prep-assets.mjs` `SAYI_KARAKTERLERI`: `0-9 + - . , / % × ›`). Yani
`1×` ve `2×` bugün tek bir `BitmapText` ile yazılabilir ve S07'nin borcu
kapanabilir.

## Seçenekler

### (a) Yalnız çerçeveyi değiştir

`createParchmentButton(this, x, y, BTN, BTN, 12)` + mevcut iki `Text`
olduğu gibi kalır.

- ✅ En küçük değişiklik
- ⚠️ Metin rengi gözden geçirilmeli: bugün `#D4A032` (altın) koyu
  mürekkep zemin üstünde. Parşömen zemine geçince altın metin
  **kontrastını kaybeder** — mürekkep (`#14203A`) olmalı.
- ❌ S07 borcu açık kalıyor

### (b) (a) + tek `BitmapText`'e indir *(önerilen)*

```ts
this.#hizYazi = this.add.bitmapText(x, y, NUMBER_FONT_KEY, '1×').setOrigin(0.5);
// toggle:
this.#hizYazi.setText(this.#speed === 1 ? '1×' : '2×');
```

- ✅ S07 borcu kapanıyor
- ✅ İki nesne yerine bir nesne
- ✅ TIER 1 kural 7'ye **tam** uyum (bugün de ihlal yok, ama kuralın
  ruhu "değişen metin bitmap")
- ⚠️ `setText` çağrısı `guard-rules.mjs`'in 4. kontrolünü tetikleyebilir.
  Bekçi `Text` üzerinde `setText` arıyorsa `BitmapText` üzerindeki çağrı
  yanlış işaretlenebilir — **uygulamadan önce `npm run guard` koşulmalı**
  ve bekçinin `BitmapText`'i ayırt ettiği doğrulanmalı. Ayırmıyorsa
  bekçi düzeltilir, kural değil.
- ⚠️ Bitmap font boyutu 32 pt üretildi; 24 px'e ölçeklenince keskinlik
  kontrol edilmeli

### (c) İkonlaştır — çift ok / tek ok sembolü

- ❌ Yeni sanat üretimi gerekiyor (atlas'a kare eklemek, `prep-assets`
  koşturmak). Kazanç, maliyeti karşılamıyor. `1×`/`2×` zaten evrensel.

## Öneri

**(b)**, G01 ile **aynı oturumda**. İkisi aynı desen değişimi; ayrı ayrı
yapmak iki kez bağlam kurmak demek.

Sıra:
1. `npm run guard` koş, bugünkü çıktıyı kaydet (temel çizgi).
2. G01'i uygula.
3. G02 (a) kısmını uygula — çerçeve + metin rengi düzeltmesi.
4. `npm run guard` — hâlâ yeşil mi.
5. G02 (b) kısmını uygula — tek `BitmapText`.
6. `npm run guard` — 4. kontrol ne diyor. Yanlış pozitifse bekçiyi
   düzelt, `OPEN-QUESTIONS.md` S07 satırını kapat.

## Doğrulama

1. Hız butonu ayarlar butonuyla yan yana **aynı** stilde görünmeli.
2. `1×` ↔ `2×` geçişi çalışmalı; `dev.scale()` 1 ve 2 dönmeli.
3. Oyun gerçekten hızlanmalı: `dev.gameFrames` sabit kalırken düşman
   ilerlemesi iki katına çıkmalı (TIER 1 kural 8 zaten test altında).
4. Metin kontrastı: parşömen zemin üstünde `#14203A`, 640×360'ta okunur.
5. Dokunmatik hedef ≥ 44×44 px (`BTN` sabiti bunu zaten karşılıyor,
   çerçeve onu küçültmemeli).
6. `npm run guard` yeşil.

## Bitmedi sayılır eğer

- Metin altın kalıp parşömen üstünde okunmuyorsa.
- `npm run guard` 4. kontrol kırmızıysa ve bekçi düzeltilmediyse.
- S07 satırı `OPEN-QUESTIONS.md`'de hâlâ "M6'da ikisi tek `BitmapText`
  olacak" diyorsa (borç kapandıysa yazılmalı).
- Kod tabanında `createParchmentButton` kullanmayan bir buton kaldıysa.

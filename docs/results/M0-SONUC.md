# M0 sonucu — İskelet, saat, aşamalı yükleme

| | |
|---|---|
| **Taş** | M0 |
| **Plan** | [`docs/plan/M0-iskelet-saat-yukleme.md`](../plan/M0-iskelet-saat-yukleme.md) |
| **Tarih** | 2026-08-04 |
| **Gerçek süre** | ~1 sa 10 dk (`M0-T01` 22:46 → `M0-T10` ~23:56) |
| **Plandaki kod süresi** | 6 sa 20 dk |
| **Plandaki takvim** | 1 gün |
| **Sapma** | kod tahmininin **~0,18 katı** — bkz. §5 |

## 1. Özet

Oyun `Boot → Preload → Menu → Game (+ Hud paralel)` zincirini koşuyor.
Menüden oyuna geçiliyor, ESC ve boşluk duraklatıyor, hız butonu 1×/2×
arası geçiyor ve geçici gösterge ölçülebilir biçimde iki kat hızlanıyor.

Plandaki bitiş durumu **tuttu**. Kule, düşman, yol, altın, atlas, ses ve
kayıt yok — hepsi sonraki taşlarda.

## 2. Görevler

| Görev | Durum | Plan | Not |
|---|---|---|---|
| `M0-T01` proje iskeleti | ☑ | 40 dk | Phaser 4 kuruldu, `^3`'e sabitlendi |
| `M0-T02` Phaser yapılandırması | ☑ | 30 dk | `banner: false` eklendi (plan dışı) |
| `M0-T03` tipler, `EventBus`, dil haritası | ☑ | 30 dk | Phaser emitter sarmalanmadı — §5 |
| `M0-T04` `GameClock` | ☑ | 45 dk | Üç `timeScale`, dört değil (S02) |
| `M0-T05` `BootScene`, font | ☑ | 40 dk | `latin` + `latin-ext` ikisi de — §5 |
| `M0-T06` aşamalı `PreloadScene` | ☑ | 45 dk | `queueGame` `static` yapıldı — §5 |
| `M0-T07` `MenuScene` | ☑ | 30 dk | |
| `M0-T08` `GameScene`, saat bağlantısı | ☑ | 35 dk | `devHooks` eklendi (plan dışı) |
| `M0-T09` `HudScene`, duraklatma, hız | ☑ | 45 dk | |
| `M0-T10` boyut raporu, kural bekçileri | ☑ | 40 dk | 5 kontrol yerine 6 |

İptal edilen görev yok.

## 3. Ölçümler

| Ölçüm | Değer | Nasıl ölçüldü | Kimin girdisi |
|---|---|---|---|
| **İlk indirme (ağ/gzip)** | **0,38 MB** | `npm run build` → `report-size.mjs` | M6 boyut bütçesi |
| İlk indirme (ham) | 1,22 MB | aynı | — |
| Phaser payı (gzip) | 321 KB | Vite raporu | M6 |
| Font payı | 71,3 KB (4 dosya) | dosya boyutu | M6 |
| Kaynak satır | 1006 (`src/`) + 238 (`scripts/`) | `wc -l` | — |
| Test | 17, 3 dosya | `npm run test` | — |
| **1× hız** | 219 px/sn | `devHooks`, 600 ms pencere | `M0-T09` |
| **2× hız** | 438 px/sn | aynı | — |
| **Hız oranı** | **2,000** (sapma %0) | hesaplanan | TIER 1 k.8 kanıtı |
| Kare hızı | 145 FPS | `devHooks.gameFrames` | — |
| Duraklatmada `gameFrames` | **0** | `devHooks` | `M0-T09` kabulü |
| Duraklatmada `hudFrames` | **101** | aynı | aynı |

### Sabitlenen sürümler

`node 24.19.0` · `npm 11.17.0` · **`phaser 3.90.0`** · `typescript 7.0.2` ·
`vite 8.2.0` · `vitest 4.1.10`

### Beklenmeyen bulgu

**Paket beklenenden çok küçük.** `research/04` §4 Phaser için ~900 KB
gzip öngörüyordu; ölçülen **321 KB**. Toplam ilk indirme 0,38 MB —
Poki'nin 8 MB sınırının **%5'i**, iç hedef 1,5 MB'ın dörtte biri.

Sonuç: M6'da atlas ve seslere sanılandan çok daha geniş bir bütçe var.
`RISKS.md` R7 (paket boyutu) buna göre yeniden değerlendirilmeli.

## 4. Kabul kriterleri

| Kriter | Sonuç | Çıktı |
|---|---|---|
| `npm run typecheck` | ☑ | exit 0, hata yok |
| `npm run test` | ☑ | `17 passed`, 3 dosya |
| `npm run build` | ☑ | exit 0, `0.38 MB` |
| `npm run guard` | ☑ | `6/6 ✓` |
| Zincir tek komutta | ☑ | exit 0 |
| Menüden oyuna geçiş | ☑ | tıklama alanı yazıdan 35 px geniş, ölçüldü |
| ESC **ve** boşluk duraklatıyor | ☑ | ikisi de her iki yönde |
| Duraklatmada Hud yaşıyor | ☑ | `gameFrames 0` / `hudFrames 101` |
| 1×/2× ve iki kat hız | ☑ | oran 2,000 |
| Konsol temiz | ☑ | hata/uyarı sıfır; Phaser başlığı kapatıldı |
| `dist/` alt klasörden çalışıyor | ☑ | `./assets/...`, iç içe yoldan HTTP 200 |
| `guard` negatif doğrulaması | ☑ | **6/6 ihlal yakalandı** |
| Türkçe karakterler | ☑ | 4 font yüzü `loaded`, genişlik serif'ten farklı |
| Font düşüş yolu | ☑ | `fonts/` boşken oyun takılmıyor |

### Negatif doğrulamalar

Bu taşta beş iddia **kasten kırılarak** kanıtlandı:

| İddia | Nasıl kırıldı | Sonuç |
|---|---|---|
| Tipli `EventBus` yanlış kullanımı yakalar | 4 hatalı çağrı | 4 derleme hatası |
| TIER 1 k.11 ihlali testi patlatır | `GameClock`'a runtime import | `window is not defined` |
| 6 bekçinin her biri çalışıyor | her kural ayrı ayrı ihlal | 6/6 exit 1 |
| Boyut raporu hata eşiği ateşliyor | eşik 0,1 MB'a indirildi | exit 1 |
| Boyut raporu uyarı eşiği ateşliyor | eşik 0,1 MB'a indirildi | uyarı + exit 0 |

## 5. Plandan sapmalar

| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| Phaser sürümü | "Phaser 3" | `^3` → 3.90.0 sabitlendi | `npm i phaser` bugün **4.2.1** getiriyor; `research/02`'nin tamamı Phaser 3'e karşı doğrulandı |
| `EventBus` | Phaser emitter'ını sarmala | Kendi `Map` tabanlı yayıcı (25 satır) | TIER 1 k.11 `systems/`'te runtime Phaser'ı yasaklıyor |
| `queueGame` | `private` | `static` | Hiç çağrılmıyor; `noUnusedLocals` ölü özel üyeyi hata sayıyor |
| Font alt kümesi | "`latin-ext`" | `latin` **+** `latin-ext` | `latin-ext` `latin`'i tamamlar, değiştirmez. `ı` U+0131 `latin`'de, `İ ş ğ` `latin-ext`'te |
| `banner: false` | yok | eklendi | Phaser sürüm başlığı yayın yapısında da basılıyordu |
| `passWithNoTests` | yok | eklendi + 6. bekçi | `vitest` boş dizinde exit 1 verip zinciri kırıyordu; maske 6. kontrolle denetlenmiş varsayıma çevrildi |
| `devHooks.ts` | yok | eklendi | "2× gerçekten iki kat mı" gözle doğrulanamıyor |
| Bekçi sayısı | 5 | 6 | Yukarıdaki maske |

### Düzeltilen kabul kriterleri

Planı ben yazmıştım ve **dört ölçüt hatalıydı** — hiçbiri gerçek bir şey
doğrulamıyordu:

| Görev | Eski ölçüt | Sorun | Yeni |
|---|---|---|---|
| `M0-T06` | `grep -c "queue…" ≥ 8` | Yorumları sayıyor, yorum ekleyerek geçilir | Ayrık tanım sayısı = 4 |
| `M0-T08` | `grep -v "clock.tick"` → boş | `update(_time, delta)` **imzası** da eşleşiyor; hiç boş çıkamaz | Yorum dışı `delta` satırı = 2 |
| `M0-T08` | "gözle: akıcı hareket ediyor" | Ölçülemez | Hız ±%2 **ve** kare hızından bağımsız |
| `M0-T09` | "gözle görülür şekilde iki kat" | Ölçülemez | 6 satırlık sayısal tablo |

Ortak sebep: **düzenli ifade sayımını gerçek kontrol sanmak.**
`TEST-STRATEGY.md` §4'e yazdığım "bekçiler kanıt değil, ağ" uyarısının
kendi planımdaki karşılığı.

## 6. Yeni açık sorular

Yeni soru çıkmadı. Kapanan/uygulananlar:

| # | Durum |
|---|---|
| S01 font kaynağı | ☑ kapandı — `latin` + `latin-ext`, yerel |
| S02 arcade fizik | ☑ kapandı — kullanılmıyor |
| S03 duraklatma ekranı | varsayılan uygulandı — perde + "Duraklatıldı" |
| S04 2× kalıcılığı | varsayılan uygulandı — oturum boyu |
| S05 menü kapsamı | varsayılan uygulandı — yalnız "Oyna" |
| S06 `EventBus` M0'da mı | uygulandı; `speed:changed` / `game:paused` geçici işaretli |
| S07 hız etiketi | ☑ uygulandı — iki statik `Text`, `setText` hiç yok |
| S08 test ortamı | ☑ kapandı — `node` |
| S09 `prefers-reduced-motion` | **açık** — M6'ya ertelendi |
| S10 "ilk indirme" tanımı | **açık** — `dist/` toplamı varsayımı çıktıda yazılı |
| S63 dil | ☑ kapandı — `{ tr, en }` haritası |

## 7. Sonraki taşa devredilenler

**Ölçülen girdiler**
- İlk indirme 0,38 MB → M6'nın varlık bütçesi sanılandan çok geniş
- 145 FPS'te 220 px/sn → hareket kare hızından bağımsız; M1'de düşman
  hareketi aynı deseni izleyecek

**Hazır sözleşmeler**
- `GameClock.scaledDelta` — M1'de `PathSystem` ve `Enemy` bunu kullanacak
- `EventBus` tipli — M1'de `life:lost` ilk gerçek tüketicisi olacak
- `devHooks` — `M1-T09`'un kapsama göstergesi aynı deseni kullanacak
- `PreloadScene.queueGame` — M1'de harita varlıkları buraya girecek

**Yarım kalan iş yok.**

**Değişen varsayım**
- Paket boyutu riski (R7) beklenenden **düşük** çıktı
- `M1-T07`'de silinecek: `GameScene`'deki geçici hız göstergesi
  (`PROBE_SPEED_PX_PER_SEC`, `#probe`, `#stepProbe`)

## 8. Kaynak dokümana işlenmesi gerekenler

`ROADMAP.md` komut şablonu: "öner, ekleme yapma."

| Öneri | Dosya | Gerekçe | Durum |
|---|---|---|---|
| Phaser `^3` sabitlemesi ve gerekçesi | `CLAUDE.md` Teknoloji | `npm i phaser` 4.x getiriyor | ☑ işlendi |
| `latin` + `latin-ext` ikisi de gerekli | `CLAUDE.md` Varlık formatları | Doküman yanlıştı | ☑ işlendi |
| TIER 1 k.8 "üç özellik" | `CLAUDE.md`, `ROADMAP.md` M0 | Fizik düştü | ☑ işlendi |
| `banner: false` platform kuralına eklensin | `CLAUDE.md` Platform | Yayında konsol çıktısı yasağının somut hâli | ☐ önerildi |
| Paket bütçesi gözden geçirilsin | `research/04` §4 | Ölçüm tahminin 1/4'ü | ☐ önerildi |
| Bekçilerin sezgisel olduğu | `TEST-STRATEGY.md` §4 | `setText` kontrolü `BitmapText`'i ayıramıyor | ☑ işlendi |

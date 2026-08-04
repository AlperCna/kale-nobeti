# Kale Nöbeti — Araştırma Dosyaları

Tarih: 2026-08-03
Kapsam: `files (1)/CLAUDE.md`, `files (1)/GAME-DESIGN.md`, `files (1)/ROADMAP.md`
dokümanlarında açık kalan veya doğrulanmamış varsayımların birincil kaynaklarla
sınanması.

Her dosya kaynaklı. Kaynakların tam listesi `KAYNAKLAR.md` içinde.
Bir bulgunun yanında **[D]** varsa birincil/resmi kaynaktan doğrulanmıştır,
**[T]** varsa ikincil kaynak veya topluluk deneyimidir, **[H]** varsa bu
projenin sayılarıyla yapılmış kendi hesabımdır.

| Dosya | İçerik |
|---|---|
| `01-denge-matematigi.md` | Kapsama, DPS, sızıntı formülleri. **En kritik dosya.** |
| `02-phaser-teknik.md` | BitmapText, havuzlama, timeScale, render modu |
| `03-mekanik-tasarim.md` | Kışla engelleme, uçanlar, harita tasarımı, dalga temposu |
| `04-varlik-paket-boyut.md` | Atlas, görüntü/ses formatı, font, bütçe dağılımı |
| `05-yayin-platformlari.md` | Poki ve CrazyGames şartları (resmi dokümanlardan) |
| `06-sanat-yonu.md` | Tezhip estetiğinin üretim maliyeti, gerçekçi alternatifler |
| `KAYNAKLAR.md` | Tüm kaynaklar |

---

## Yönetici özeti — beş bulgu

### 1. Harita 1 boss'u matematiksel olarak öldürülemez **[H]**

Tek bir düşmana verilebilecek toplam hasar, kule yerleşiminden **bağımsız**
olarak şu değere kilitlidir:

```
ToplamHasar = Σ (DPS_kule × kapsananYolUzunluğu_kule) / düşmanHızı
```

Harita 1'in mevcut tanımıyla (8 yapı noktası, ~150-170 menzil, düz yol
varsayımı) Ogre Şef'e verilebilecek **teorik tavan ~900 hasar**. Boss'un HP'si
**2200**.

Sekiz noktanın hepsi Tier 3 olsa, hepsi boss'a en uygun kule seçilse ve
Meteor iki kez kullanılsa bile mutlak tavan **2188** — hâlâ 2200'ün altında.
Yani boss **hiçbir oyun durumunda** öldürülemiyor.

Bu bir denge sorunu değil, tanım hatası.

> ## ✅ M1'de ölçüldü — bulgu ayakta, iki sayı düzeldi
>
> Yukarıdaki sayılar `kapsama = 2 × menzil` **varsayımıyla** hesaplanmıştı
> ve `03-mekanik-tasarim.md` §3'ün "≥ 450 px" kriteriyle çelişiyordu.
> Harita 1 çizildi ve kapsama ölçüldü: **296,3 px**, yani `2 × menzil`in
> **0,988** katı. Model %1,2 hatayla tuttu; `03`'ün 450 px'i türetilmemişti
> ve reddedildi (450 px'te boss 700 tavanın %52'sinde kalırdı).
>
> **Değişen iki sayı:**
> - Gerçekçi T2 tavanı ~900 → **889**
> - Mutlak tavan 2131 → **2188** (geniş menzilli kuleler viraj noktalarından
>   yolu daha çok kez görüyor; `ort ÷ 2r` 260 px menzilde 1,070)
>
> **Manşet ayakta ama payı ince: 2188 < 2200, yalnız %0,5.** Doğru ifade
> "matematiksel olarak imkânsız" değil, **"pratikte imkânsız"**. Senaryo
> zaten ekonomik olarak erişilemez. `src/data/referenceBoards.test.ts`
> bu payı bekçiye bağladı.
>
> Tam analiz: [`01-denge-matematigi.md` §4](01-denge-matematigi.md).

### 2. `GAME-DESIGN.md` §6'daki sızıntı formülü savunmayı ~6 kat abartıyor **[H]**

Dokümandaki `toplamHP < D × L / v` formülü her kulenin yolun tamamını
kapsadığını varsayıyor. Gerçek kapsama `2 × menzil`. Harita 1 için hata
çarpanı, ölçülen değerlerle `L / kapsama = 1700 / 296,3 = **5,74**`
(ilk tahmin `1800 / 300 = 6` idi — büyüklük doğruydu).

M6'daki "her dalga için sağlama yap" maddesi bu formülle çalıştırılırsa
30 dalganın hepsi yanlış onaylanır. Düzeltilmiş iki-kısıt modeli:
`01-denge-matematigi.md` §2.

### 3. Yol geometrisi, kule istatistiklerinden daha güçlü bir denge kolu **[D][H]**

Aynı kule, düz bir hattın önüne konduğunda 2 saniye, arkasına konduğunda
8-12 saniye ateş ediyor; ölçülen fark tek bir kulede **%44 toplam hasar**.
Kavşak/viraj kapsaması kuleyi %60 aktiflikten %95'e çıkarıyor.

Bunun sonucu: haritaların yapı noktası **sayısı** değil, her yapı noktasının
**kapsadığı yol uzunluğu** dengeyi belirliyor. Bu değer haritalar çizilirken
ölçülmeli ve `maps.ts` içine yazılmalı. Öneri: `02-phaser-teknik.md` §6'daki
kapsama ölçüm aracı.

### 4. Poki'nin şartları dokümandakinden farklı **[D]**

`CLAUDE.md` "8 MB" diyor, doğru. Ama Poki'nin resmi şart sayfasında
**16:9 zorunlu ve önerilen ölçekleme boyutları 640×360, 836×470, 1031×580**
olarak listeleniyor; ayrıca **ESC veya boşluk tuşu duraklatmayı açmalı** ve
**`localStorage` gizli sekmede çalışmadığı için `try/catch` ile sarılmalı.**
Sonuncusu doğrudan `SaveSystem`'i etkiliyor ve dokümanda yok.

CrazyGames'te mobil ana sayfaya girmek için ilk indirme **≤ 20 MB**, normal
kabul için **≤ 50 MB**, toplam **≤ 250 MB** ve **≤ 1500 dosya**.
Tümü: `05-yayin-platformlari.md`.

### 5. Tezhip estetiği tek kişilik bir varlık bütçesine sığmıyor **[D]**

Bu stilin en bilinen örneği Pentiment, **13 kişilik** bir ekiple üretildi ve
ekibin çözümü teknik değil organizasyoneldi: her sahnenin önce renksiz kaba
taslağı yapılıp motorda oynanıyor, nihai çizim ancak gerekliliği kesinleşince
üretiliyordu.

Bu, taklit edilebilir tek pratiktir ve `ROADMAP.md`'nin "M5'te sanat" yapısıyla
çelişiyor — sanat M5'e ertelenirse geri dönüş maliyeti çok yükseliyor.
Gerçekçi alternatifler: `06-sanat-yonu.md`.

---

## Dokümanlara işlenen değişiklikler

**Durum: hepsi uygulandı.** Tasarım dokümanları artık bu araştırmayla
tutarlı. Aşağıdaki liste neyin neden değiştiğinin kaydı olarak duruyor.

| # | Dosya | Değişiklik | Durum |
|---|---|---|---|
| 1 | `GAME-DESIGN.md` §6 | Sızıntı formülü iki kısıtlı modelle değişti | ✅ |
| 2 | `GAME-DESIGN.md` §5 | Ogre Şef HP'si 2200 → **700** | ✅ |
| 3 | `GAME-DESIGN.md` §9 | `MapDef`'e `coverage` alanı eklendi | ✅ |
| 4 | `GAME-DESIGN.md` §4.4 | Kışlaya 9 maddelik engelleme spesifikasyonu | ✅ |
| 5 | `GAME-DESIGN.md` §5 | Uçan hattı gösterimi + harita kabul kriteri | ✅ |
| 6 | `GAME-DESIGN.md` §6 | Erken başlatma bonusu dalgayla ölçekleniyor | ✅ |
| 7 | `CLAUDE.md` | TIER 1 kural 7: `BitmapText` zorunlu | ✅ |
| 8 | `CLAUDE.md` | TIER 1 kural 8: `GameClock` + 4 `timeScale` özelliği | ✅ |
| 9 | `CLAUDE.md` | Arka planlar atlas dışı WebP; ses **yalnız `.m4a`** | ✅ |
| 10 | `CLAUDE.md` | TIER 1 kural 10: `localStorage` `try/catch` zorunlu | ✅ |
| 11 | `ROADMAP.md` | Kışla kendi taşına ayrıldı (M5) | ✅ |
| 12 | `ROADMAP.md` | M0'a `GameClock`, M1'e kapsama aracı | ✅ |
| 13 | `ROADMAP.md` | Sanat M2'den itibaren greybox olarak paralelleşti | ✅ |

> #9 hakkında not: ilk taslakta `.webm` + `.m4a` çifti yazılmıştı.
> `04-varlik-paket-boyut.md` §2'deki incelemenin sonucu **yalnız `.m4a`** —
> hedef tarayıcıların hepsinde AAC var, ikinci format paketi gereksiz büyütüyor.

### Birlikte uygulanan bağlı değişiklikler

13 maddenin bazıları tek başına dokümanları tutarsız bırakıyordu; şunlar da
uygulandı:

| Alan | Değişiklik |
|---|---|
| Ekonomi | Başlangıç altını 200 → **280**; dalga bonusu `20+2n` → **`30+5n`** |
| Ödüller | Tüm düşmanlarda `altın = 3 × puan` (oran 1.33–4.80 arası savruluyordu) |
| Harita | `goldMultiplier` = `hpMultiplier`; harita başına `startGold` |
| Dalga | Nefes dalgaları (4, 7) bütçe × 0.85; tempo dalga boyundan türetiliyor |
| Kadro | Düşmanlar haritalara dağıtıldı — harita 1'de 4 tip + boss |
| Kule | Barut Fıçısı uçana vurabiliyor (%50 hasar) |
| Hedefleme | 5 modun tanımı netleşti, `weakest` eklendi |
| Geri bildirim | Hasar sayıları 3 renkli (zırh emmesi gri + kalkan) |
| Palet | Menzil çemberine mürekkep kontur; lapis efektlerde açık varyant |
| UI | Bilgi paneli (§11) — "seçili düşmana karşı etkin DPS" dahil |
| Kontrol | 2× hız ve ESC/boşluk duraklatma tasarıma girdi |

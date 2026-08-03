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
Meteor iki kez kullanılsa bile mutlak tavan **2131** — hâlâ 2200'ün altında.
Yani boss **hiçbir oyun durumunda** öldürülemiyor.

Bu bir denge sorunu değil, tanım hatası.
Ayrıntı ve düzeltme seçenekleri: `01-denge-matematigi.md` §4.

### 2. `GAME-DESIGN.md` §6'daki sızıntı formülü savunmayı 6 kat abartıyor **[H]**

Dokümandaki `toplamHP < D × L / v` formülü her kulenin yolun tamamını
kapsadığını varsayıyor. Gerçek kapsama `2 × menzil`. Harita 1 için hata
çarpanı tam olarak `L / 2r = 1800 / 300 = 6`.

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

## Dokümanlara işlenmesi gereken değişiklikler

Aşağıdakiler araştırma sonucu **kesinleşmiş** düzeltmeler. Henüz uygulanmadı.

| # | Dosya | Değişiklik |
|---|---|---|
| 1 | `GAME-DESIGN.md` §6 | Sızıntı formülünü iki kısıtlı modelle değiştir |
| 2 | `GAME-DESIGN.md` §5 | Ogre Şef HP'sini 2200 → ~700 (harita 1 tabanı) |
| 3 | `GAME-DESIGN.md` §9 | `MapDef`'e `coverageByCoveredLength` alanı ekle |
| 4 | `GAME-DESIGN.md` §4.4 | Kışlaya tam engelleme spesifikasyonu yaz |
| 5 | `GAME-DESIGN.md` §5 | Uçan hattını oyuncuya göster (Defense Grid çözümü) |
| 6 | `GAME-DESIGN.md` §6 | Erken başlatma bonusunu dalgayla ölçekle |
| 7 | `CLAUDE.md` | Hasar sayıları `BitmapText`, `Text` yasak |
| 8 | `CLAUDE.md` | Global `timeScale` sözleşmesi (4 ayrı özellik) |
| 9 | `CLAUDE.md` | Arka planlar atlas dışı, WebP; ses `.webm`+`.m4a` |
| 10 | `CLAUDE.md` | `localStorage` erişimi `try/catch` zorunlu |
| 11 | `ROADMAP.md` | Kışla için ayrı kilometre taşı |
| 12 | `ROADMAP.md` | M0'a hız değiştirme mimarisi, M1'e kapsama aracı |
| 13 | `ROADMAP.md` | M5 sanat işini M2'den itibaren paralel kaba taslağa çevir |

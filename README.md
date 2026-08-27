# Kale Nöbeti

Fantastik ortaçağ temalı, tarayıcıda çalışan tower defense oyunu.
Model: Kingdom Rush (sabit yol + belirli yapı noktaları).
Hedef: 3 harita × 10 dalga, 4 kule ailesi, 2 aktif yetenek.

**Durum: tasarım aşaması.** Henüz kod yok — bu depo şu an tasarım
dokümanları ve araştırma bulgularından oluşuyor.

Teknoloji planı: Phaser 3 + TypeScript (strict) + Vite.

---

## Dokümanlar

| Dosya | İçerik |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Proje kuralları — mimari, klasör yapısı, pazarlıksız kısıtlar |
| [docs/GAME-DESIGN.md](docs/GAME-DESIGN.md) | Tasarım dokümanı — kuleler, düşmanlar, ekonomi, dalgalar, sanat yönü |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 8 kilometre taşlı yol haritası |
| [docs/plan/](docs/plan/README.md) | **Uygulama planı** — 82 kod görevi + 6 üretim bloğu, 8 taş dosyası, veri şemaları, test stratejisi, riskler, açık sorular |
| [docs/results/](docs/results/README.md) | **Taş sonuçları** — her taş bitince yazılan ölçüm defteri |
| [docs/plan/iyilestirme/](docs/plan/iyilestirme/README.md) | **İyileştirme dosyası** — M7 sonrası taramada bulunan 22 görsel/yapısal bulgu |
| [docs/results/OLCUMLER.md](docs/results/OLCUMLER.md) | **Ölçüm kütüğü** — varsayılmayan, ölçülen her sayı; nereden geldiği ve hangi test onu koruduğu |
| [docs/research/](docs/research/README.md) | **Araştırma bulguları** — aşağıya bakınız |

## Araştırma

`docs/research/` altındaki dosyalar, tasarım dokümanlarındaki varsayımların
birincil kaynaklarla sınanmasından çıktı. **Bulgular tasarım dokümanlarına
işlendi** — `CLAUDE.md`, `GAME-DESIGN.md` ve `ROADMAP.md` bu araştırmayla
tutarlı. Neyin neden değiştiğinin kaydı
[docs/research/README.md](docs/research/README.md) sonunda.

| Dosya | İçerik |
|---|---|
| [README](docs/research/README.md) | Yönetici özeti + uygulanacak düzeltmeler listesi |
| [01 — Denge matematiği](docs/research/01-denge-matematigi.md) | Kapsama, DPS, sızıntı formülleri. **En kritik dosya.** |
| [02 — Phaser teknik](docs/research/02-phaser-teknik.md) | BitmapText, havuzlama, timeScale, render modu |
| [03 — Mekanik tasarım](docs/research/03-mekanik-tasarim.md) | Kışla engelleme, uçanlar, harita tasarımı, dalga temposu |
| [04 — Varlık ve paket boyutu](docs/research/04-varlik-paket-boyut.md) | Atlas, görüntü/ses formatı, font, bütçe |
| [05 — Yayın platformları](docs/research/05-yayin-platformlari.md) | Poki ve CrazyGames şartları |
| [06 — Sanat yönü](docs/research/06-sanat-yonu.md) | Tezhip estetiğinin üretim maliyeti, alternatifler |
| [Kaynaklar](docs/research/KAYNAKLAR.md) | Tüm kaynaklar, birincil/ikincil ayrımıyla |

### Öne çıkan bulgular ve sonuçları

**Ogre Şef öldürülemiyordu.** Tek bir düşmana verilebilecek toplam hasar,
kule yerleşiminden bağımsız olarak `Σ (DPS × kapsananYol) / hız` ile sınırlı.
Gerçekçi bir Tier 2 tahtasına karşı tavan **889**; boss'un HP'si **2200**'dü.
→ Boss HP'si **700**'e indirildi — ölçülen tavanın **%78,7'si**, hedef band
%75-85'in içinde.

**✅ Kapsanan yol ölçüldü (M1).** İki araştırma dosyası aynı büyüklük için
farklı değer kullanıyordu (`300 px/kule` ve `≥ 450 px`) ve tüm denge bu tek
sayıya asılıydı. Harita 1 çizildi ve ölçüldü: `L` = **1700 px**, ortalama
kapsama **296,3 px** — yani `2 × menzil`in **0,988** katı. `450 px`
türetilmemişti ve reddedildi: o değerde boss 700 tavanın yalnız %52'sinde
kalırdı. Boss (700) ve Trol (400) üzerindeki **geçici işaretleri kalktı.**
Sağlamalar `src/data/referenceBoards.test.ts` içinde koşuyor.
Ayrıntı: [`M1-SONUC.md`](docs/results/M1-SONUC.md).

**Sızıntı formülü savunmayı ~5,7 kat abartıyordu.** Her kulenin yolun
tamamını gördüğünü varsayıyordu; gerçek kapsama `2 × menzil`. Ölçülen
çarpan `1700 / 296,3 = 5,74` (ilk tahmin 6 idi).
→ İki kısıtlı modelle değiştirildi ve Vitest sağlamalarına bağlandı.

**Tier 3 harita 1'de hiç görülmüyordu.** Ekonomi 8 noktayı doldurup yalnızca
3-4 Tier 2 yükseltmeye yetiyordu.
→ Başlangıç altını ve dalga bonusu artırıldı, ödül oranları normalleştirildi.

**Yol geometrisi kule istatistiklerinden güçlü bir denge kolu.** Aynı kule
düz hattın önünde 2 saniye, arkasında 8-12 saniye ateş ediyor — tek kulede
%44 hasar farkı.
→ Kapsanan yol uzunluğu `MapDef`'e girdi ve harita kabul kriteri oldu.

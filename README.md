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
| [docs/ROADMAP.md](docs/ROADMAP.md) | 6 kilometre taşlı yol haritası |
| [docs/research/](docs/research/README.md) | **Araştırma bulguları** — aşağıya bakınız |

## Araştırma

`docs/research/` altındaki dosyalar, tasarım dokümanlarındaki varsayımların
birincil kaynaklarla sınanmasından çıktı. Bulgular **henüz tasarım
dokümanlarına işlenmedi**; `docs/research/README.md` sonunda uygulanması
gereken 13 düzeltmenin listesi var.

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

### Öne çıkan bulgular

**Ogre Şef mevcut haliyle öldürülemiyor.** Tek bir düşmana verilebilecek
toplam hasar, kule yerleşiminden bağımsız olarak
`Σ (DPS × kapsananYol) / hız` ile sınırlı. Harita 1'de 8 yapı noktasının
hepsi Tier 3 olsa ve Meteor iki kez kullanılsa bile mutlak tavan **2131**;
boss'un HP'si **2200**.

**`GAME-DESIGN.md` §6'daki sızıntı formülü savunmayı tam 6 kat abartıyor.**
Formül her kulenin yolun tamamını gördüğünü varsayıyor; gerçek kapsama
`2 × menzil`.

**Tier 3, harita 1'de hiç görülmüyor.** Ekonomi 8 noktayı doldurup yalnızca
3-4 Tier 2 yükseltmeye yetiyor.

Ayrıntılar ve düzeltme seçenekleri
[docs/research/README.md](docs/research/README.md) içinde.

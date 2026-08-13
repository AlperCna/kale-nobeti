# M6 Ses Üretim Brifi — `M6-T11`

`M6-sanat-uretim-brifi.md`'nin ses karşılığı. Kaynak karar
`GAME-DESIGN.md` §12; burası *hangi dosya*, *hangi ad*, *hangi formatta*
ve *nereye* sorularını somutlaştırıyor.

> **Kim için:** siz veya kaynak bulan/kaydeden biri. Kod bilgisi
> gerekmiyor — yalnız dosya adı ve format kuralı önemli (aşağıda).
>
> **Nasıl teslim edilir:** dosyaları `public/assets/audio/` altına, bu
> dosyadaki adlarla koyup haber verin. `M6-T11` (kayıt + gerekirse
> `EventBus`'a birkaç yeni olay ekleme) o andan itibaren uygulanır.

---

## 0. Format — pazarlıksız

| | Kural | Kaynak |
|---|---|---|
| Ses efektleri | **Yalnız `.m4a` (AAC)**. `.ogg` kopyası **üretilmez** | `CLAUDE.md` Varlık formatları |
| Müzik | `.m4a`, **96 kbps mono** | `GAME-DESIGN.md` §12 |
| Müzik boyutu | ~700 KB/dakika, iki parça ≈ **1,4 MB toplam** | `research/04` §2 |
| Müzik ilk indirmede DEĞİL | `queueBackground` ile **dalga 1 bittikten sonra** yükleniyor (kod zaten kurulu) | `research/04` §6, `GAME-DESIGN.md` §12 |
| Ses efekti bitrate'i | Dokümanda belirtilmemiş — boyutlar zaten birkaç KB, herhangi makul bir AAC kodlaması (önerilen ~128 kbps mono) yeterli | — |

**`.ogg` üretilmemesinin sebebi çift format değil, tek format kararı:**
`research/04` §2 eski notu "AAC her hedef tarayıcıda var, `.ogg` kopyası
paketi gereksiz büyütüyor" diyor ve `CLAUDE.md` bu kararı zaten
benimsemiş durumda — siz yalnızca `.m4a` üretin, `.ogg`'a hiç
dokunmayın.

**Kabul kriteri** (`M6-T11`, zaten yazılı):
```bash
npm run build && find dist -name "*.ogg" | wc -l   # 0 olmalı
```

---

## 1. Ses efektleri — tam liste, 12 dosya

`GAME-DESIGN.md` §12'nin **yazılı listesi** bu 12'yi veriyor. Başka
planlama dosyalarında görülen "~20 ses efekti" yuvarlak bir tahmindi,
kalemi hiçbir yerde yoktu — bu brif §12'nin gerçek listesini esas alıyor.

| Dosya | Ne zaman çalıyor | Kod hazır mı |
|---|---|---|
| `public/assets/audio/shot_okcu.m4a` | Okçu ailesi ateş edince | ✓ (`TowerSystem`) |
| `public/assets/audio/shot_top.m4a` | Top ailesi ateş edince | ✓ |
| `public/assets/audio/shot_buyu.m4a` | Büyü ailesi ateş edince | ✓ |
| `public/assets/audio/enemy_death.m4a` | Düşman ölünce | ✓ (`enemy:killed`) |
| `public/assets/audio/gold.m4a` | Altın kazanılınca | ✓ (`gold:changed`) |
| `public/assets/audio/tower_place.m4a` | Kule/kışla yerleştirilince | ✓ (`tower:placed`) |
| `public/assets/audio/tower_upgrade.m4a` | Kule yükseltilince | ☐ olay yok, `M6-T11`'de eklenecek |
| `public/assets/audio/error.m4a` | Yetersiz altınla satın alma denenince | ☐ olay yok, `M6-T11`'de eklenecek |
| `public/assets/audio/wave_start.m4a` | Dalga başlarken | ✓ (`wave:started`) |
| `public/assets/audio/boss_intro.m4a` | Dalga 10'da boss girişinde | ☐ olay yok, `M6-T11`'de eklenecek |
| `public/assets/audio/victory.m4a` | Harita kazanılınca | ☐ olay yok, `M6-T11`'de eklenecek |
| `public/assets/audio/defeat.m4a` | Harita kaybedilince | ☐ olay yok, `M6-T11`'de eklenecek |

**"Kod hazır mı" sütunu sizi bağlamıyor** — yalnız şeffaflık için:
dosyaları teslim ettiğinizde beşi zaten var olan bir oyun olayına
takılıyor, altısı için `M6-T11` küçük yeni olaylar ekleyecek. İkisi de
sizin işiniz değil.

### Kule atış sesleri — üç, dört değil

Kışla'nın "atış sesi" **yok** — Kışla mermi fırlatmıyor, asker
çıkarıyor ve askerler yakın dövüşüyor. §12'nin "her kule ailesinin ayrı
atış sesi" cümlesi **üç** aileyi kapsıyor (Okçu, Top, Büyü), Kışla'yı
değil.

### Perde kayması sizin işiniz değil

§12: "±%8 rastgele perde kayması (tekdüzelik önler)." Bu **çalışma
zamanında kod tarafından** uygulanacak (`Phaser.Sound` `rate`
parametresi) — siz her aile için **tek, temiz bir kayıt** teslim edin.
Birden fazla varyasyon vermeniz gerekmiyor; verirseniz zarar vermez ama
gerekli değil.

### T3 dalları ayrı ses ister mi — açık, varsayılan var

Her kulenin T3'te iki dalı var (örn. Okçu → Keskin Nişancı / Kundakçı).
§12 dal başına ayrı ses **istemiyor**; varsayılan: T3a/T3b aynı aile
sesini kullanıyor, yalnız hasar/menzil değişiyor, ses değişmiyor. Farklı
bir ses isterseniz bunu **ek** olarak düşünün, gerekli değil.

### Kapsam dışı bırakılanlar — açık soru, sizin kararınız

§12 şunları **belirtmiyor**, ben de uydurmadım:

- **Yetenek kullanımı** (Meteor, Takviye) — şu an sessiz. İsterseniz iki
  ek dosya (`meteor_cast.m4a`, `reinforce_cast.m4a`) ekleyebilirsiniz;
  §12'nin listesinde yok, o yüzden zorunlu değil.
- **Asker yakın dövüş sesi** (kışla askerinin düşmana vuruşu) — §12'de
  yok. Muhtemelen `enemy_death.m4a` yeterli geri bildirim veriyor.
- **Menü tık sesi** — §12'de yok, yalnız oyun içi listelendi.

Bunları eklemek isterseniz dosya adını siz belirleyin, ben
`M6-T11`'de bağlarım; eklemezseniz brif eksiksiz sayılır.

---

## 2. Müzik — iki parça

| Dosya | Ne zaman | Döngü |
|---|---|---|
| `public/assets/audio/music_menu.m4a` | Menü ve seviye seçim ekranında | Sorunsuz döngülenmeli (başı-sonu dikişsiz) |
| `public/assets/audio/music_game.m4a` | Oyun içinde, dalga 1 bittikten sonra devreye giriyor | Sorunsuz döngülenmeli |

**Ton önerisi** (`GAME-DESIGN.md` §2'nin görsel yönüyle tutarlı olsun
diye — bağlayıcı değil, palet gibi kesin bir kısıt yok): ortaçağ el
yazması havası — lut/ud, yaylı, hafif perküsyon; parlak/elektronik
tondan kaçının, §2'nin "parlak çizgi film paletinden kaçınıyoruz"
kararının ses karşılığı olarak düşünülebilir.

**Uzunluk:** kısa döngüler (60-90 sn) hem boyutu düşük tutar hem
`research/04`'ün 700 KB/dakika tahminini iki parça için ~1,4 MB'ta
tutar. Daha uzun parça isterseniz sorun değil, yalnız toplam boyutu
büyütür — ilk indirmeyi etkilemiyor ama tembel yüklemeyi büyütüyor.

---

## 3. Ses ayarı ve reklam kısma — zaten kodda, sizi bağlamıyor

- **Varsayılan ses açık, tek tuşla kapatılabilir, tercih kaydediliyor**
  — `Settings` sistemi zaten bunu yapıyor (`this.sound.mute` bağlı).
- **Reklam oynarken ses kısılır** (§12, Poki şartı) — bu, Poki portal
  SDK entegrasyonuna bağlı (`S61`, henüz yapılmadı, itch.io için
  gerekmiyor). Ses dosyalarınızda buna göre bir şey yapmanıza gerek yok;
  kısma çalışma zamanında oynatma seviyesiyle yapılacak.

---

## 4. Kaynak ve lisans

`OPEN-QUESTIONS.md` S51/S52'nin varsayılanı: **CC0 kütüphane**
(Freesound.org, OpenGameArt gibi CC0 etiketli aramalar). Bu, projenin
zaten kabul ettiği varsayılan — başka bir kaynak da olur, ama:

> **CC0 değilse (CC-BY vb.) atıf listesi tutulmalı.** İtch.io/CrazyGames
> sayfasında veya oyun içi bir "krediler" ekranında kaynağı
> belirtmeniz gerekir. Bu bir kod işi değil ama unutulursa lisans
> ihlali olur — dosyaları teslim ederken **her dosyanın kaynağını ve
> lisansını** de not düşün, ben ayrı tutmasam da kayıt sizde dursun.

---

## 5. Teslim

Dosyaları `public/assets/audio/` altına yukarıdaki adlarla koyup haber
verin. Kısmi teslim kabul — yalnız kule sesleri (3) veya yalnız müzik
(2) ayrı ayrı gönderilebilir, ben gelen parçayı o an bağlarım.

Bu brifte olmayan: sanat (`M6-sanat-uretim-brifi.md`, ayrı dosya).

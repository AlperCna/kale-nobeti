# Mağaza sayfası metni — itch.io · CrazyGames · Poki

Kopyala-yapıştır için hazır. **Yayınlamak sahibin işi** — hesap girişi ve
yükleme burada yapılmadı. Adım adım yol: [`docs/YAYIN.md`](../YAYIN.md).

> **`M178` (2026-10-03) — metin baştan yazıldı.** `M8-T15`'teki ilk hâli
> "5 harita, 50 dalga, 9 düşman, 12 başarım, Zor = daha az can" diyordu;
> aradan `M12` (6. harita, Tünelci), `M23` (başarımlar), `M99` (yetenek
> yükseltmesi), `M175` (zorluk merdiveni) ve `M176` (sonsuza devam)
> geçti. Sayılar bu kez **veriden** sayıldı: `MAPS` 6, dalga 60,
> `ENEMIES` 11 (yavru örümcek dahil), `ACHIEVEMENTS` 17. Veri değişirse
> bu sayılar da değişir — yayından önce yeniden say.

## Yükleme ayarları (itch.io)

| Alan | Değer |
|---|---|
| Kind of project | **HTML** |
| Dosya | `kale-nobeti-itch.zip` (`npm run build` → `npm run package:itch`) |
| This file will be played in the browser | ✅ |
| Viewport | **1280 × 720** |
| Fullscreen button | ✅ (oyunun kendi düğmesi de var) |
| Mobile friendly | ✅ — yatay (`landscape`) |
| Genre | Strategy |
| Tags | `tower-defense`, `strategy`, `fantasy`, `medieval`, `singleplayer`, `html5`, `turkish` |
| Cover image | `yayin/kapak/itch-630x500.jpg` |
| **AI generation disclosure** | **Evet** — grafik, ses efekti ve müzik yapay zekâ üretimi (`OPEN-QUESTIONS` S51/S52). Dürüst işaretle. |

## Kapaklar (`yayin/kapak/`)

| Dosya | Nerede |
|---|---|
| `yatay-1920x1080.jpg` | CrazyGames yatay (zorunlu) · Poki |
| `dikey-800x1200.jpg` | CrazyGames dikey (zorunlu) |
| `kare-800x800.jpg` | CrazyGames kare (zorunlu) · Poki |
| `itch-630x500.jpg` | itch.io kapak |

Menü sanatından (`assets-src/menu/menu-bg.png`) ve oyunun başlık
fontundan (Grenze Gotisch) türetildi. CrazyGames kuralına uygun: oyun içi
ekran görüntüsü yok, başlık dışında yazı yok, çerçeve yok. **Geçici
sayılır** — Poki'nin Web Fit Test'i kapağın tıklanma oranını ölçüyor;
daha güçlü bir kapak ürettirmek istenirse ölçü bu tablodaki boylar.

---

## Türkçe

### Başlık
**Kale Nöbeti**

### Kısa açıklama (~140 karakter)
Tezhipli el yazması estetiğinde bir kule savunma oyunu. Altı harita,
altmış dalga, sonsuz mod. Tarayıcıda, ücretsiz.

### Uzun açıklama

**Kale senin nöbetinde.**

Değirmen Geçidi'nden Sisli Bataklık'a altı harita, altmış dalga. Dört
kule ailesi — Okçu, Top, Büyü, Kışla — ve her birinin üçüncü kademede
ikiye ayrılan iki yolu. Ork sürüleri, zırhlı akıncılar, uçan harpiler,
yenilenen troller, bölünen örümcekler, yerin altından geçen tünelciler —
ve her haritanın sonunda bir Ogre Şef; son üçünün kendi hilesi var.

Kingdom Rush'ın sabit yol + yapı noktası modeli; ama görsel dili
**tezhipli el yazması**: mürekkep mavisi zemin, parşömen arayüz, altın
varak vurgular.

**Ne var:**
- 6 harita × 10 dalga, her denge sayısı ölçülerek ayarlandı
- **Üç zorluk**: Kolay, Normal ve Zor — Zor, oyunun tasarlandığı denge
- **Sonsuz mod** — haritayı kazanınca aynı tahtayla 11. dalgadan devam
  et ya da seviye seçimden baştan başla; rekor kaydediliyor
- **17 başarım**
- 11 düşman türü: zırh, büyü direnci, iyileştirme, buz kalkanı,
  yenilenme, bölünme, uçuş, yeraltı geçişi
- İki aktif yetenek — Meteor ve Takviye — tahta dolunca yükseltiliyor
- Yarıda kalan tur kaydediliyor: menüden "Devam et"
- Türkçe ve İngilizce
- Ekran sarsıntısı, efekt yoğunluğu ve ses ayrı ayrı kısılabilir;
  `prefers-reduced-motion` saygı görür

**Nasıl oynanır:** altın dairelere dokunup kule kur. Düşman kaleye
varırsa can gider. Dalgayı erken başlatmak altın kazandırır — ama yeni
dalga öncekinin üstüne biner.

---

## English

### Title
**Kale Nöbeti** *(Keep Watch)*

### Short description
A tower defense game in the visual language of illuminated manuscripts.
Six maps, sixty waves, endless mode. Free, in your browser.

### Long description

**The keep is yours to hold.**

Six maps and sixty waves, from Mill Pass to Misty Marsh. Four tower
families — Archer, Cannon, Magic, Barracks — each splitting into two
branches at tier three. Orc warbands, armoured raiders, flying harpies,
regenerating trolls, splitting spiders, tunnelers that burrow under the
road — and an Ogre Chief at the end of every map, the last three with a
trick of their own.

The Kingdom Rush model (fixed path, fixed build spots) in a different
visual language: **illuminated manuscript** — ink-blue ground, parchment
interface, gold leaf accents.

**What's in it:**
- 6 maps × 10 waves, every balance number measured rather than guessed
- **Three difficulties**: Easy, Normal and Hard — Hard is the balance the
  game was designed around
- **Endless mode** — win a map and keep the same board from wave 11, or
  start fresh from the map screen; your best is saved
- **17 achievements**
- 11 enemy types: armour, magic resistance, healing, frost shields,
  regeneration, splitting, flight, burrowing
- Two active abilities — Meteor and Reinforcements — upgradeable once
  the board is full
- Interrupted runs are saved: "Continue" from the menu
- English and Turkish
- Screen shake, effect density and sound can each be turned down;
  `prefers-reduced-motion` is respected

**How to play:** tap a gold circle to build a tower. Enemies reaching the
keep cost lives. Starting a wave early earns gold — but the new wave
lands on top of the last one.

---

## Kontroller (CrazyGames / Poki formu)

| | |
|---|---|
| Fare / dokunma | Altın daireye dokun: kule kur · kuleye dokun: yükselt, sat, hedefleme · yetenek düğmesi, sonra hedef |
| ESC / boşluk | Duraklat · devam |
| Ekran | Yatay, 16:9 |

**EN:** Click/tap a gold circle to build · click a tower to upgrade, sell
or change targeting · ability button, then the target · ESC or Space to
pause.

---

## Ekran görüntüleri — **sahip çekecek**

itch sayfası için 4-6 görüntü öneriliyor (CrazyGames ve Poki kapak ister,
ekran görüntüsü istemez). Yayın yapısını açıp alın — geliştirme
yapısında sol üstte kapsama yazısı çıkıyor, o yayında yok:

1. **Ana menü** — başlık, kale, düğmeler
2. **Seviye seçim** — altı kart, yıldızlar, zorluk satırı
3. **Oyun, kalabalık dalga** — kuleler ateş ederken
4. **Boss anı** — Ogre Şef ve can çubuğu
5. **Oyun sonu** — istatistik ve yıldızlar
6. (isteğe bağlı) **Başarımlar**

Görüntü ölçüsü 1280×720.

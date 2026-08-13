# M6 Sanat Üretim Brifi — `P01`-`P04`

Bu dosya `M6-sanat-juice-ses.md`'deki dört üretim bloğunun (`P01`-`P04`)
**somut** brifi. Kaynak kararlar (`GAME-DESIGN.md` §2, `research/06`)
*neden* özgün silüet seçildiğini anlatıyor; burası *ne çizileceğini*,
*hangi ölçüde*, *hangi hex'le* ve *hangi sırayla* söylüyor.

> **Kim için:** siz veya işe alınan bir sanatçı. Kod bilgisi gerekmiyor —
> yalnız dosya adı ve boyut kuralları önemli (aşağıda).
>
> **Nasıl teslim edilir:** dosyaları `public/assets/` altına, bu dosyadaki
> yol adlarıyla koyup haber verin. Ben `M6-T02`-`T06`'yı (kod tarafı) o
> andan itibaren uygularım — mimari karar beklemiyor.

---

## 0. Üç kural, hepsi ölçülüp doğrulandı

Bunlar tercih değil; `research/06` içinde maliyet/getiri ölçülerek
seçildi. Uymayan bir varlık `M6-T04`/`T05`/`T06`'nın kabul kriterini
geçemez.

1. **Kimliği çerçeve ve arka plan taşır; birimler sade silüet olur.**
   40 px'lik bir sprite Poki'nin 640×360 ölçeğinde 20 px'e iniyor — oraya
   harcanan iç detay ekrana hiç ulaşmıyor. Cesaret HUD çerçevesine ve
   arka planlara gidiyor.
2. **Ayırt edilebilirlik silüetten gelir, renkten değil** (TIER 1
   kural 6). Gri tonlamalı bir ekran görüntüsünde de düşman tipleri
   birbirinden ayrılabilmeli.
3. **İnce çizgi yarı ölçekte kaybolur.** Motiflerde minimum çizgi
   kalınlığı **2 px** (1280×720 tabanında), kesikli çemberde kesik
   ≥ 6 px / boşluk ≥ 4 px. Vurgu ince çizgiyle değil **dolgu alanıyla**
   yapılır.

---

## 1. Palet — kaynak `GAME-DESIGN.md` §2, burada yalnız uygulama notu

| İsim | Hex | Rol |
|---|---|---|
| Mürekkep | `#14203A` | Zemin, UI paneli, letterbox, kontur |
| Yosun | `#2F4A3C` | Çim, ağaç kütlesi |
| Parşömen | `#E4D3A8` | HUD şeridi, metin zemini |
| Altın varak | `#D4A032` | Vurgu, menzil çemberi, altın, seçim |
| Vermilyon | `#B03A2E` | Düşman, tehlike, can kaybı |
| Lapis | `#3E5CA8` | Büyü, buz, dost etkileri (açık varyant `#6E8AD0`) |

**Yeni renk eklenmez.** Bir varlık bu altı rengin dışına çıkıyorsa önce
bu listeden bir tonun tint/shade'i denenir (`research/06` §6 palet
doğrulamasında bu iki kısıt zaten işaretli):

- Altın ve vermilyon yan yana **ayırt edilemiyor** → altın öğeler mürekkep
  renginde 1 px dış kontur taşır.
- Lapis koyu zeminde okunmuyor → efektlerde açık varyant `#6E8AD0`.

### Bulunan bir tutarsızlık — karar sizin

Greybox'ın şu anki renk ataması **§2'nin kendi anlam haritasıyla
çelişiyor**. §2 Lapis'i açıkça "büyü, buz, dost etkileri" için ayırmış,
ama koddaki geçici atama şöyle:

| Aile | Greybox hex | Palette'te mi | Sorun |
|---|---|---|---|
| Okçu (fiziksel) | `#3E5CA8` (Lapis) | ✓ ama **yanlış aile** | Lapis büyü için ayrılmış, Okçu fiziksel |
| Büyü (§2'nin ta kendisi "lapis") | `#7A4A8A` (mor) | ✗ palet dışı | Asıl Lapis alıcısı palet dışı renk kullanıyor |
| Kışla | `#8A5A2A` (kahve) | ✗ palet dışı | — |
| Asker | `#3E6CA8` | ✗ **palet dışı — muhtemelen yazım kayması** | Lapis'in bir baytı farklı (`5C` yerine `6C`) |

**Önerilen varsayılan** (uygulanmadı, sizin onayınızı bekliyor): Lapis'i
**Büyü**'ye ver (§2'nin tanımıyla tutarlı olan bu), Okçu'yu nötr bir
mürekkep/parşömen tonuna çek, Kışla için palet içinden bir ton seçilsin
(altın varağın koyu bir tonu — asker "dost, savunma" rolüyle altın varağa
Vermilyon'dan daha yakın). Bu bir tercih meselesi; **siz karar verin**,
ben yalnız çelişkiyi ölçüp raporladım.

---

## 2. `P01` — Üç harita arka planı

**Format:** WebP q80, atlas **dışında**, ayrı dosya. **≤ 400 KB** her biri
(`M6-T03` kabul kriteri). **Çözünürlük:** 1280×720 (mantıksal ekran, `Scale.FIT`
ile letterbox'lanıyor — kenarlara pay bırakmaya gerek yok, tam kare).

| Dosya | Harita | Tema (`GAME-DESIGN.md` §9) |
|---|---|---|
| `public/assets/bg/degirmen-gecidi.webp` | 1 — Değirmen Geçidi | Yeşil vadi, değirmen |
| `public/assets/bg/tas-kopru.webp` | 2 — Taş Köprü | Nehir, taş köprü, sis |
| `public/assets/bg/kul-ovasi.webp` | 3 — Kül Ovası | Yanmış toprak, volkanik |

**Kritik kısıt: yol hattı arka planın üstüne oynanış çiziyor, arka plan
onu göstermek zorunda değil.** Yol rengi (`#8A7250`, parşömen-mürekkep
arası) ve yapı noktaları oyun kodu tarafından **arka planın üstüne**
çiziliyor. Arka plan yalnız **zemin dokusu ve atmosfer** veriyor —
kendi yol çizgisini çizmeyin, oyunun çizdiğiyle çakışır ve iki farklı
yol gibi görünür.

**Harita 1 gerçek yol geometrisi** (diğer ikisi de `docs/results/haritalar.html`'de
görsel — o dosyayı açıp üstüne taslak yapabilirsiniz):

- Tek giriş sol dışarıda, iki keskin viraj, kale sağ altta.
- Zemin, yol dışındaki her yer "yapılabilir" — 8 yapı noktası var,
  arka plan onları gizleyecek kadar kalabalık olmamalı (bir çayır/orman
  dokusu düz büyük kütleler halinde kalsın, küçük detay yığını olmasın).

**Yükleme sırası:** Harita 1 arka planı `queueGame` ile ilk indirmede;
harita 2-3 `queueLazy` ile **tembel** yükleniyor (`M0-T06`'nın dört
aşaması zaten kurulu, yalnız dosya bekleniyor). Yani harita 1'in dosya
boyutu ilk indirme bütçesini (8 MB Poki sınırı) etkiliyor, 2-3'ünki
etkilemiyor — ama yine de 400 KB hedefine uyun, tembel yükleme
"sınırsız" demek değil.

**Öncelik:** `research/06` §3 tablosuna göre **yüksek getiri, orta
maliyet** — `P02`'den sonra ikinci sırada üretilmeli.

---

## 3. `P02` — Tezhip çerçeveli HUD

**En yüksek getiri, en düşük maliyet** (`research/06` §3) — bir kez
çizilir, her karede ekranda durur. **İlk üretilmesi gereken blok.**

### Neyin üstüne çiziliyor — mevcut yerleşim

HUD sol üstte üç parşömen kart (altın/can/dalga sayacı), sağ altta iki
yetenek butonu, sağ üstte hız/ayar düğmeleri. Kenar boşluğu `20 px`.
Buton boyutu `56-64 px` — platform kuralı (44×44 px minimum) zaten
karşılanıyor, çerçeve motifi bu kutuların **içine değil çevresine** eklenir.

### Somut teslimatlar

| Parça | Ne | Ölçek kuralı |
|---|---|---|
| **Parşömen şerit dokusu** | 9-slice edilebilir kenarlı bir parşömen dokusu (köşe + kenar + orta) | Kenar detayı ≥ 2 px kalınlık |
| **Köşe motifi** | Şeritlerin köşesinde ince altın varak süsleme | Motif çizgisi ≥ 2 px |
| **Menzil çemberi** | Kesikli **altın** halka + **mürekkep 1 px dış kontur** | Kesik ≥ 6 px, boşluk ≥ 4 px. Kontur zorunlu — konturu olmayan çember yoğun dalgada düşman siluetlerinin içinde kayboluyor (ölçülen §2 bulgusu) |
| **Seçili kule kartuşu** | Kule seçilince açılan panelin altın çerçevesi | Dolgu alanıyla, ince çizgiyle değil |

### Kabul testi — üç ölçülebilir kontrol (`M6-T04`)

Ben bunları canlı tarayıcıda test edeceğim, ama sizin de üretirken
kontrol etmeniz için:

1. **640×360'a küçültünce** altın motiflerin her çizgisi hâlâ görünür —
   kaybolan/titreyen çizgi sıfır olmalı.
2. **En yoğun dalgada** menzil çemberi açıkken, çemberin tamamı düşman
   siluetlerinin üstünde ayırt ediliyor.
3. **Gri tonlamada** parşömen şerit ile altın motif arasındaki kontrast
   hâlâ ayırt edilebiliyor (renk körlüğü tabanı).

---

## 4. `P03` — 16 kule kademesi

Üç kule ailesi × 4 kademe + Kışla × 4 kademe = **16 tile**.

| Aile | T1 | T2 | T3a | T3b |
|---|---|---|---|---|
| Okçu | — | — | Keskin Nişancı | Kundakçı |
| Top | — | — | Havan | Barut Fıçısı |
| Büyü | — | — | Yıldırım | Buz |
| Kışla | — | — | Paladin | Haydutlar |

**Silüet odaklı — iç işleme yok.** Her tile: koyu mürekkep siluet + palet
renginden **tek** vurgu (§1'deki renk kararına göre) + ince altın kontur.
T3 dalları (Keskin Nişancı vs Kundakçı gibi) birbirinden **siluet
farkıyla** ayrılmalı — oyuncu menüde hangi dalı seçtiğini görsel olarak
tanıyabilmeli, yalnız isimden değil.

**Boyut:** oyun içi kule konteyneri şu an kare bir alan kullanıyor; sprite
kare tuval üstünde ve merkezde olsun (tam px ölçüsü atlas paketlenirken
`M6-T02`'de belirlenecek — siz kaynak dosyayı yüksek çözünürlükte
üretin, küçültme paketleme adımında yapılıyor, `research/04` §7
gereği kaynak zaten hedef boyuta küçültülmüş olarak paketlenmeli, o
yüzden **taslak/kaba ölçüyle** 128×128 px kaynak önerilir).

**Öncelik:** `P04`'ten önce — oyuncu kuleye P04'teki düşmandan daha uzun
bakıyor (yerleştirme, yükseltme kararı).

---

## 5. `P04` — 9 düşman siluyeti + boss + asker

### Şu an hiç görsel ayrım yok — ölçüldü

Bu bloğun neden önemli olduğunu somutlaştırmak gerekiyor: **şu anda
greybox'ta tüm düşmanlar tamamen aynı** — aynı boyut (22×22 px kare),
aynı renk (`#B03A2E` vermilyon), aynı şekil (dikdörtgen). Kod tarandı,
doğrulandı. Yani `P04` yalnızca bir cila katmanı değil; **düşman
tipini ilk kez görsel olarak okunur kılan** blok.

| Düşman | Rol/kavram | Uçuyor mu |
|---|---|---|
| Goblin | Temel, kalabalık | hayır |
| Ork Savaşçı | Hafif zırh | hayır |
| Kurt Binicisi | Hız | hayır |
| Harpi | Uçan | **evet** — ayrı yoldan geliyor, siluet bunu okutmalı |
| Zırhlı Ork | Ağır zırh | hayır |
| Şaman | İyileştirici, destek | hayır |
| Trol | Tank, yenilenme | hayır |
| Örümcek Ana | Bölünen | hayır — ölünce 3 yavru çıkarıyor, yavru silueti anne ile ailevi bağ kurmalı ama küçük |
| Örümcek Yavrusu | Örümcek Ana'nın çocuğu | hayır |
| **Ogre Şef (boss)** | Zirve, kışla askerlerini tek vuruşta öldürüyor | hayır |

Artı: **kışla askeri** (Lapis ailesinden, dost) ve **Meteor/Takviye
yetenek ikonları** (iki küçük ikon, HUD buton üstünde).

**Silüet farkı zorunlu, renk farkı yeterli değil** (TIER 1 kural 6):
gri tonlamalı ekran görüntüsünde de 9 tip birbirinden ayrılabilmeli.
Boyut/oran farkı (Trol büyük ve geniş, Kurt Binicisi alçak ve uzun,
Harpi kanatlı siluet, Örümcek çok bacaklı) renkten daha güvenilir bir
ayraç.

**Ölüm karesi:** her düşman için tek ek kare — oyun ölürken 120 ms'lik
squash&stretch (yatay ezilme) uyguluyor, o yüzden ayrı bir "ölüyor"
animasyonu **gerekmiyor**, yalnız statik sprite yeterli; motor onu
deforme ediyor.

**Öncelik: en son.** `research/06` §3: 40 px'te detay görünmüyor,
düşük getiri. Diğer üç blok bitmeden buna başlamayın.

---

## 6. Sıra ve teslim

```
P02 (HUD çerçeve)  →  P01 (arka planlar)  →  P03 (kule)  →  P04 (düşman)
```

Bu, `ROADMAP.md` M6'nın önceliğiyle aynı ve `research/06` §3'ün
maliyet/getiri tablosundan türetildi — kod bunu zaten bekliyor, sıra
değişirse kimse engellenmez ama getiri en yükseğe geç kalınmış olur.

**Kısmi teslim kabul.** Her blok kendi başına tüketilebilir; `P02`
bitip `P01` beklemedeyken `M6-T04` uygulanabiliyor. Hazır olan dosyaları
gönderin, ben o an tüketen görevi (`M6-T02`-`T06`) uygularım.

**Bu brifte olmayan:** ses/müzik (`M6-T11`, `S51`/`S52` — ayrı, dosya
formatı `CLAUDE.md` Varlık formatları'nda: yalnız `.m4a`, `.ogg` yok).

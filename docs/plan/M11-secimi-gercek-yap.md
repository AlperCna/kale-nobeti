# M11 — Seçimi gerçek yap

**Durum:** taslak · **Kaynak:** 2026-09-15 ölçümü + araştırma
**Öncül:** M10 bitti. Sahip yayını erteledi, geliştirmeye devam kararı verdi.

---

## Bu plan neden "yeni içerik" değil

M8 içerik ekledi (2 harita, sonsuz mod, başarımlar). M10 o içeriğin
oyuncuya ulaşmasını sağladı ve yol boyunca ölçümün üç kez kör olduğunu
buldu. Şimdi aynı soruyu bir kez daha sordum, ama bu sefer **var olan
mekaniklere**: *çalışıyorlar mı?*

Cevap: **oyunun en derin kararı sahte.**

T3 dal seçimi tasarımın omurgası — `GAME-DESIGN` §4 onu gerçek bir karar
diye tanımlıyor, `S41` geri alınamaz olduğunu yazıyor (değiştirmek için
satıp %30 kaybetmek gerekiyor). Ölçtüm: **her ailede tek doğru cevap
var.**

İkinci gerekçe pratik: **sanat senin darboğazın.** Bu planın hiçbir
maddesi yeni çizim istemiyor.

---

## 1. Ölçülen zayıflıklar

### ✗ Altı T3 dalının üçü ölü içerik

İki ayrı testle, iki haritada, aynı sonuç.

**Test A — 8 noktada tek tip T3** (sızan HP, düşük = iyi):

| Dal | Harita 3 | Harita 5 |
|---|---|---|
| **Barut Fıçısı** (Top 3b) | **539** | **18 343** |
| Havan (Top 3a) | 1 730 | 34 874 |
| Yıldırım (Büyü 3a) | 3 175 | 39 564 |
| Buz (Büyü 3b) | 4 384 | 51 178 |
| Keskin Nişancı (Okçu 3a) | 5 526 | 54 089 |
| **Kundakçı** (Okçu 3b) | **11 787** | **64 624** |

**Test B — dengeli tahtada tek dalı değiştir** (3 okçu + 3 top + 3 büyü):

| Değişiklik | Harita 3 | Harita 5 |
|---|---|---|
| Keskin Nişancı → Kundakçı | +388 kötü | +3 090 kötü |
| Barut Fıçısı → Havan | +1 082 kötü | +9 824 kötü |
| Yıldırım → Buz | +347 kötü | +4 830 kötü |

**Üç ailede de "öteki" dal her zaman daha kötü.** Yani seçim yok, tek
doğru cevap var ve oyuncu onu bir kez öğrenince bir daha düşünmüyor.

### ✗ Sebep: Barut Fıçısı fazla iş yapıyor

`KURALLAR.md`'nin kendi tablosundan:

| Dal | Bedel | DPS | Menzil | Patlama | Uçan | Etki |
|---|---|---|---|---|---|---|
| Keskin Nişancı | 170 | 15,6 | **260** | — | ×1 | — |
| Kundakçı | 170 | 12,6 | 165 | — | ×1 | yanma 4/4sn |
| Havan | 240 | **21,6** | 230 | 70 | **0 — vuramaz** | — |
| **Barut Fıçısı** | 240 | 18 | 150 | 65 | ×0,5 | **yavaşlatma** |
| Yıldırım | 230 | 21 | 170 | — | ×1 | zincir ×3 |
| Buz | 230 | 16 | 180 | — | ×1 | yavaşlatma (daha güçlü) |

Üç ayrı teşhis:

1. **Kundakçı, Keskin Nişancı'ya menzilde 95 px kaybediyor.** Yanma
   sürekli +4/sn veriyor (12,6 + 4 ≈ 16,6 vs 15,6) yani hasarda başa
   baş — ama menzil bu oyunda **matematiksel olarak** hasara dönüşüyor:
   Kısıt A `DPS × kapsananYol`. Menzil hem kapsamayı hem toplam hasarı
   çözüyor; yanma yalnız birini.
2. **Havan uçana hiç vuramıyor** (`airMultiplier: 0`). Kâğıt üstünde en
   yüksek DPS ve +80 menzil, ama harpi dalgasında tahtanın o kısmı ölü.
3. **Buz gereksiz: Barut Fıçısı zaten yavaşlatıyor** — üstelik 60 altın
   daha ucuz, patlaması var ve uçana yarım vuruyor. Buz'un tek üstünlüğü
   biraz daha güçlü yavaşlatma ve +10 menzil. Yetmiyor.

`M10`'un kule sinerjisi (yavaşlatılmış düşman fizikselden ×1,25
etkileniyor) **Barut Fıçısı'nı daha da güçlendirdi** — çünkü yavaşlatan
o. Farkı ben açtım; kapatmak da benim işim.

### ✗ Üç katmanlı körlük: etkileri kimse saymıyor

| Katman | Ne yapıyor | Etkileri sayıyor mu |
|---|---|---|
| `balanceChecks.effectiveDps` | Referans tahtayı **seçiyor** | **Hayır** |
| `fx/TowerInfoPanel` | Oyuncuya "seçili düşmana DPS" gösteriyor | **Hayır** |
| `waveSim` | Dengeyi ölçüyor | Evet (`M10` S86'da düzeldi) |

Yani hem denge modeli hem **oyuncu** yanma ve yavaşlatmayı göremiyor.
Kundakçı'nın neden iyi olabileceğini panelde okumanın yolu yok. Bu
`M10`'un R17'sinin (simülasyon körlüğü) oyuncuya bakan yüzü.

### ✗ Paladin'in kalkanı hiç yazılmamış (S43)

`§4.4` kışla T3a'yı *"11 + kalkan"* diye tanımlıyor ama kalkan sayısı
dokümanda yok, o yüzden **uygulanmadı** — `BarracksSystem` `s.shield = 0`
yazıyor. Yani dalın **tanımlayıcı özelliği yok**: Paladin şu an yalnız
"daha az ama daha canlı asker".

`M10` kalkan makinesini zaten kurdu (`combat.kalkandanGecir`,
`EnemyState.shieldLeft`). Sayı da aynı yöntemle türetilebilir.

### ✓ Dalga tasarımı iyi — burada iş yok

50 dalgada **26 farklı tür kümesi**. Tekrar eden 16 dalganın çoğu
harita 1'in öğretici yayı (goblin / goblin+ork), yani kasıtlı. Harita 5
her dalgada farklı bir bileşim veriyor.

---

## 2. Araştırma ne diyor

Kaynak: *Defender's Quest* geliştiricisinin tower defense tasarım yazısı
(`fortressofdoors.com`) ve genel TD tasarım derlemeleri.

| Kural | Bizdeki karşılığı |
|---|---|
| Seçimler **Farklı, Dengeli, Sınırlı, Açık** olmalı | "Dengeli" düşüyor — üç dal domine edilmiş |
| *"Menzil doğası gereği aşırı güçlü: hem kapsamayı hem DPS'i birden çözüyor"* | Kısıt A bunu **matematiksel olarak** söylüyor: `DPS × kapsananYol` |
| Her kulenin **en iyi olduğu bir senaryo** olmalı | Havan'ın senaryosu var (uzun menzil, ağır vuruş) ama uçan deliği onu yutuyor |
| Zırhlı düşmana **tek anahtar değil çok çözüm** ver | Bizde var (zırh delen büyü, yavaşlatma, kışla) |
| Oyuncuya **tam bilgi** ver, yüzde değil sayı | Panel sayı veriyor ama **etkileri saymıyor** |

Bir uyarı daha: *"kuleye ne kadar çok tür verirsen, her birine özel bir
amaç bulmak o kadar zorlaşır."* Yani çözüm **yeni dal eklemek değil**,
var olan altısını ayrıştırmak.

---

## 3. Fazlar

Sıralama ilkesi: **önce ölçüm ve gösterim dürüst olsun, sonra denge.**
M10'un dersi tam buydu — yarım düzeltilmiş ölçümle sayı türetmek işi
iki kez yaptırıyor.

### Faz 1 — Körlüğü kapat *(≈0,5 gün · risk düşük)*

`effectiveDps` ve `TowerInfoPanel` süreli etkileri saysın.

- Yanma: sürekli hasar olarak eklenir (yenilenmiyor, **yığılmıyor** —
  `applyEffect` süreyi tazeliyor, yani sürdürülebilir katkı `dps`).
- Yavaşlatma: doğrudan hasar değil; **kapsama süresini uzatıyor**.
  Kısıt A'nın diliyle: düşman aynı yolu daha yavaş geçiyor, yani kule
  daha çok vuruş yapıyor. Modele girecek hâli bu.
- `M10`'un sinerjisi de sayılmalı (yavaşlatılmış düşman fizikselden
  ×1,25).

**Neden önce:** Faz 2'nin bütün sayıları bu modele göre türetilecek.
Yarım modelle türetilen sayı geri alınır (S82/S84 aynen böyle oldu).

**Kabul:** panelde Kundakçı'nın DPS'i Keskin Nişancı'ya yakın çıkıyor;
`effectiveDps` referans tahtada artık yalnız iki dalı seçmiyor.

### Faz 2 — Altı dalı ayrıştır *(≈1-1,5 gün · risk ORTA — her sayı ölçülecek)*

Hedef: **her dalın kazandığı bir senaryo olsun.** Tahmini yön (ölçümle
doğrulanacak, sayılar uydurulmayacak):

- **Barut Fıçısı'nın yükü azaltılır.** Şu an patlama + yavaşlatma +
  yarım uçan + iyi DPS. Yavaşlatma Buz'un kimliği olmalı; Barut
  Fıçısı'nın yavaşlatması ya zayıflar ya kalkar.
- **Havan'ın uçan deliği kapatılır ya da rolü keskinleşir.** `0`
  çarpanı onu belirli dalgalarda tamamen ölü yapıyor — "çok çözüm"
  kuralının ihlali.
- **Kundakçı'ya menzil ya da yanma gücü.** Yanma zırhı yok sayıyor
  (gerçek hasar kanalı) — Zırhlı Ork'a karşı senaryosu bu olabilir,
  ama sayı bugün çok küçük.

**Yöntem:** her değişiklik iki testle ölçülür (tek tip tahta + dengeli
tahtada dal değişimi) ve `kisitB` rampası ile zorluk ölçütleri korunur.
Rampa bozulursa değişiklik geri alınır.

**Kabul:** üç ailede de "öteki" dal en az bir senaryoda **kazanıyor**.

### Faz 3 — Paladin kalkanı, S43'ü kapat *(≈0,5 gün · risk düşük)*

`M10`'un kalkan makinesi hazır (`kalkandanGecir`, `shieldLeft`).
Askere uygulanması aynı desen. Sayı taranarak seçilir: Paladin ile
Haydutlar arasında **gerçek bir seçim** doğuran en küçük değer.

### Faz 4 — Aynı soruyu diğer seçimlere sor *(≈0,5 gün · ölçüm ağırlıklı)*

Dal seçimi tek "seçim" değil. Aynı domine-edilme testi:

- **Beş hedefleme modu** — hepsinin kazandığı bir durum var mı?
  (`waveSimBoard` zaten mod taşıyor, ölçüm ucuz.)
- **İki yetenek** — Takviye, Meteor'un yanında meşru mu?
- **Üç kule ailesi** — Test A'da Top ailesi **iki dalıyla da** diğer
  ailelerin üstünde çıktı. Aile düzeyinde de bir baskınlık olabilir.

Bulunan her ölü seçenek ölçülerek düzeltilir; bulunmazsa kaydedilir.

### Faz 5 — Yeni verb *(sanat gerekiyor — sahibin işi)*

Faz 1-4 var olanı çalışır hâle getiriyor. Yeni **tür** içerik (yeni
düşman davranışı, yeni kule ailesi, harita 6) atlas karesi istiyor.
Sistem ve veri tarafını ben hazırlarım; çizim üretimi bekler.

---

## 4. Bu planın YAPMADIĞI şeyler

- **Yeni dal eklemiyor.** Araştırmanın uyarısı: tür arttıkça her birine
  özel amaç bulmak zorlaşır. Altı dal zaten fazla değil, **ayrışmamış**.
- **Meta yükseltme ağacı yok** — `ROADMAP` uyarısı hâlâ geçerli ve
  M10'dan sonra daha da geçerli: Kısıt A/B referans tahtaya dayanıyor.
- **Yeni harita yok.** M10 harita 4-5'in sıfır yeni mekanik getirdiğini
  ölçtü; altıncıyı eklemeden önce beşincinin seçimleri çalışmalı.
- **Sunucu isteyen hiçbir şey yok** (sıralama, çoklu oyuncu).

---

## 5. Toplam

| Faz | Emek | Sanat gerekiyor mu | Etki |
|---|---|---|---|
| 1 · Körlüğü kapat | 0,5 gün | hayır | Faz 2'nin ön şartı |
| 2 · Altı dalı ayrıştır | 1-1,5 gün | hayır | **oyunun en derin kararı** |
| 3 · Paladin kalkanı (S43) | 0,5 gün | hayır | kışla dalı gerçek seçim olur |
| 4 · Diğer seçimleri tara | 0,5 gün | hayır | bilinmeyen ölü seçenekler |
| 5 · Yeni verb | — | **evet** | bekler |

**Faz 1-4 ≈ 3 gün ve hiçbiri sanat istemiyor.** Öneri buradan başlamak.

# Kale Nöbeti — Tasarım Dokümanı

## 1. Çekirdek döngü

Hazırlık (altını harca) → dalgayı başlat → düşmanlar sabit yolu yürür,
kuleler otomatik ateş eder → öldürmeden altın kazan → dalgayı atlat → tekrar.

Gerilim kaynağı bir planlama bulmacasıdır: **mevcut DPS'im gelen dalgaya yeter mi,
ve cevabı satın alabilir miyim?** Tüm tasarım kararları bu soruyu keskinleştirmeye
hizmet eder.

## 2. Sanat yönü

Tür klişesi parlak, doygun çizgi film paletidir. Buradan kaçınıyoruz.
Referans: **ortaçağ tezhipli el yazması** — mürekkep, parşömen, altın varak, lapis.

### Palet (6 değer, hepsi bu listeden türetilir)

| İsim | Hex | Kullanım |
|---|---|---|
| Mürekkep | `#14203A` | Zemin gölgesi, UI paneli, letterbox |
| Yosun | `#2F4A3C` | Çim, ağaç kütlesi |
| Parşömen | `#E4D3A8` | HUD şeritleri, metin zemini |
| Altın varak | `#D4A032` | Vurgu, menzil dairesi, altın, seçim |
| Vermilyon | `#B03A2E` | Düşman, tehlike, can kaybı |
| Lapis | `#3E5CA8` | Büyü, buz, dost etkileri |

Yol rengi parşömen ile mürekkep arası ara ton: `#8A7250`.

### Tipografi

- **Başlık:** Grenze Gotisch — ortaçağ karakteri var ama okunur. Sadece
  büyük başlıklarda, asla gövde metninde.
- **Gövde/UI:** Spectral — serif, ekranda rahat, tarihsel dokuya uyuyor.
- **Sayılar:** Inter Tight, tabular figürler. Altın, DPS, hasar sayıları burada.
  Sayıların ayrı bir yüzde olması HUD'ı okunur tutar.

Üç font da Google Fonts'ta değişken font olarak var; yalnızca gereken ağırlıklar
alt kümelenip yerel olarak sunulur (paket boyutu için).

### İmza öğesi

**Tezhip çerçevesi.** HUD parşömen şeridinin köşelerinde ince altın varak motifi;
kule menzil dairesi düz beyaz halka değil, kesikli altın bir çember ve içinde
çok hafif bir ışık yıkaması. Seçili kule, sayfa kenarındaki bir minyatür gibi
altın bir kartuş içinde gösterilir. Cesaretin tamamı buraya harcanır; geri kalan
her şey sakin durur.

## 3. Hasar modeli

İki hasar tipi, iki savunma tipi. Bu, kule çeşitliliğinin tek kaynağıdır.

- **Fiziksel** hasar → **Zırh** ile sabit miktarda azalır.
- **Büyü** hasar → **Büyü direnci** ile yüzde olarak azalır.
- **Gerçek** hasar → hiçbir şeyle azalmaz (yalnız yeteneklerde).

```ts
function applyDamage(dmg: number, type: DamageType, e: EnemyStats): number {
  let out = dmg;
  if (type === 'physical') out = dmg - e.armor;
  if (type === 'magic')    out = dmg * (1 - e.magicResist);
  return Math.max(out, dmg * 0.15); // taban: hiçbir vuruş tamamen emilmez
}
```

%15 tabanı önemli: oyuncu tamamen yanlış kule kurduğunda oyun kilitlenmez,
sadece verimsizleşir. Ceza var ama duvar yok.

## 4. Kuleler

4 aile. Her aile: Tier 1 → Tier 2 → Tier 3'te **iki dallı uzmanlaşma**.
Kural: **hiçbir kule diğerinin düpedüz üstünü değildir; her biri bir rolü çözer.**

### 4.1 Okçu Kulesi — tek hedef, hızlı, ucuz
Fiziksel hasar. Uçanlara vurabilir. Zırha karşı zayıf.

| Tier | Maliyet | Hasar | Atış/sn | Menzil |
|---|---|---|---|---|
| 1 | 70 | 6 | 1.1 | 150 |
| 2 | 110 | 10 | 1.3 | 165 |
| 3a Keskin Nişancı | 170 | 26 | 0.6 | 260 |
| 3b Kundakçı | 170 | 9 + 4/sn yanma (4 sn) | 1.4 | 165 |

### 4.2 Top Kulesi — alan hasarı, yavaş, uçana vuramaz
Fiziksel hasar, patlama yarıçapı. Kalabalığın cevabı.

| Tier | Maliyet | Hasar | Atış/sn | Menzil | Yarıçap |
|---|---|---|---|---|---|
| 1 | 110 | 22 | 0.5 | 140 | 45 |
| 2 | 160 | 34 | 0.55 | 150 | 55 |
| 3a Havan | 240 | 48 | 0.45 | 230 | 70 |
| 3b Barut Fıçısı | 240 | 30 + %40 yavaşlatma (2 sn) | 0.6 | 150 | 65 |

### 4.3 Büyü Kulesi — zırh delen
Büyü hasarı. Zırhlı düşmanların tek temiz cevabı. Büyü dirençli düşmanlara zayıf.

| Tier | Maliyet | Hasar | Atış/sn | Menzil |
|---|---|---|---|---|
| 1 | 100 | 14 | 0.7 | 155 |
| 2 | 150 | 24 | 0.75 | 170 |
| 3a Yıldırım | 230 | 30, 3 hedefe zincirleme (%70 azalarak) | 0.7 | 170 |
| 3b Buz | 230 | 20 + %50 yavaşlatma (2.5 sn) | 0.8 | 180 |

### 4.4 Kışla — asker çıkarır, yolu tıkar
Hasar vermez, **zaman kazandırır**. Türün en önemli mekaniği: düşmanı durdurup
diğer kulelerin menzilinde tutar. Uçanlar engellenemez.

| Tier | Maliyet | Asker | Asker HP | Asker DPS | Diriliş |
|---|---|---|---|---|---|
| 1 | 90 | 2 | 45 | 5 | 8 sn |
| 2 | 140 | 2 | 75 | 8 | 7 sn |
| 3a Paladin | 210 | 2 | 140 | 11 + kalkan | 6 sn |
| 3b Haydutlar | 210 | 3 | 70 | 9 + kaçınma %25 | 5 sn |

Kışlanın bir **toplanma noktası** vardır; oyuncu sürükleyerek yolun neresinde
duracaklarını seçer. Bu, izlemekten sıkılmayı önleyen aktif karardır.

### 4.5 Kule kuralları
- Satış iadesi: harcanan toplamın **%70'i**.
- Hedefleme önceliği kule başına seçilebilir: `first` (varsayılan, yolda en ileri),
  `last`, `strongest`, `closest`. Kışlada yoktur.
- Menzil dairesi yalnızca hover/seçimde görünür.

## 5. Düşmanlar

`hp` değerleri **temel** değerlerdir; harita çarpanı ile ölçeklenir (bkz. §7).

| Düşman | HP | Hız | Zırh | B.Direnç | Altın | Puan | Özellik |
|---|---|---|---|---|---|---|---|
| Goblin | 45 | 60 | 0 | 0 | 3 | 1 | — |
| Ork Savaşçı | 110 | 45 | 2 | 0 | 5 | 2 | — |
| Zırhlı Ork | 160 | 38 | 8 | 0 | 8 | 4 | Fiziksele dirençli |
| Harpi | 70 | 75 | 0 | 0 | 6 | 3 | **Uçar** — yolu takip etmez, düz gider, engellenemez |
| Kurt Binicisi | 60 | 110 | 1 | 0 | 5 | 3 | Çok hızlı |
| Şaman | 130 | 42 | 0 | 0.40 | 10 | 5 | Yakındaki düşmanlara 8 HP/sn iyileştirme |
| Trol | 400 | 30 | 4 | 0 | 15 | 8 | 6 HP/sn yenilenme |
| Örümcek Ana | 150 | 50 | 0 | 0.20 | 8 | 6 | Ölünce 3× yavru (HP 30, hız 90) |
| **Ogre Şef** (boss) | 2200 | 28 | 10 | 0.25 | 120 | 25 | Kışla askerlerini tek vuruşta öldürür |

Sızma cezası: normal 1 can, Trol/Örümcek Ana 2 can, boss 10 can.

### Karşı-oyun tablosu (tasarımın omurgası)
| Tehdit | Doğru cevap |
|---|---|
| Kalabalık goblin | Top |
| Zırhlı Ork | Büyü |
| Şaman | Keskin Nişancı (arkadan seç) veya Yıldırım |
| Harpi sürüsü | Okçu + Büyü (Top işe yaramaz) |
| Trol | Kışla ile tut + yoğun tek hedef |
| Kurt Binicisi | Buz / Barut Fıçısı yavaşlatma |

## 6. Ekonomi

- Başlangıç altını: **200**, başlangıç canı: **20**.
- Öldürme altını yukarıdaki tabloda.
- Dalga bitiş bonusu: `20 + dalgaNo * 2`.
- **Erken başlatma bonusu:** hazırlık sayacında kalan her saniye için **+1 altın**.
  Bu mekanik oyuna tempo katar ve usta oyuncuya ödül verir. Sayaç 20 sn.
- Kule satışı %70 iade.

Denge ilkesi: oyuncunun dalga N'de kazandığı toplam altın, dalga N+1'i geçmek
için gereken DPS artışının maliyetine yaklaşık eşit olmalı. Bu bir tabloda
simüle edilir, oyunda deneme yanılma ile değil.

Sağlama formülü (yol uzunluğu L piksel, düşman hızı v, toplam DPS D):
düşmanın kule ateşi altında geçirdiği süre ≈ `L / v`, yani
**bir dalganın toplam HP'si `D * L / v` değerini geçerse sızıntı olur.**
Her dalga tasarlandıktan sonra bu eşitlikle kontrol edilir.

## 7. Dalga sistemi

Dalgalar elle yazılmaz, **bütçe ile üretilir** ve sonra elle rötuşlanır.
Bütçe yaklaşımı, oyunun asla yenilemez bir dalga üretmemesini garanti eder.

```ts
budget(n) = Math.round(10 * Math.pow(1.20, n - 1))  // n = harita içi dalga no
```
Harita 1 → dalga 1'de 10 puan, dalga 10'da ~52 puan.

Harita zorluk çarpanları (düşman HP'sine uygulanır):
`Harita 1 → 1.0`, `Harita 2 → 1.6`, `Harita 3 → 2.6`.

**Dalga içi HP artışı yoktur.** Zorluk kompozisyondan gelir — böylece oyuncu
düşmanı tanır ve "bu ne kadar dayanıklı" tahmini güvenilir kalır. Dalga başına
%5 HP eklemek yaygın ama okunabilirliği bozan bir kısayoldur.

Boss dalgaları: her haritanın 10. dalgası.

### Dalga telegrafı (zorunlu)
Hazırlık aşamasında gelecek dalganın kompozisyonu ikonlarla gösterilir:
`🗡️×8  🛡️×3  🦅×4`. Oyuncunun körlemesine oynaması türün en yaygın şikâyeti.

### Veri şeması
```ts
interface WaveGroup {
  enemy: EnemyId;
  count: number;
  spawnDelay: number;   // grup içi düşmanlar arası saniye
  startAt: number;      // dalga başından itibaren saniye
  spawnPoint: number;   // haritada birden fazla giriş varsa
}
interface Wave { index: number; groups: WaveGroup[]; }
```

## 8. Yetenekler

İki aktif yetenek, tıkla-hedefle, bekleme süreli. Oyuncuyu izleyici olmaktan
çıkarır ama odağı yol yapısından almaz.

- **Meteor** — hedeflenen 90 px yarıçapta 180 gerçek hasar. Bekleme 45 sn.
- **Takviye** — hedeflenen noktaya 2 geçici asker (HP 60, DPS 7, 20 sn ömür).
  Bekleme 20 sn.

Bekleme süreleri HUD'da dairesel dolum ile gösterilir; hazır olunca altın
kenar bir kez parlar.

## 9. Haritalar

| # | Ad | Tema | Yol | Yapı noktası | Giriş |
|---|---|---|---|---|---|
| 1 | Değirmen Geçidi | Yeşil vadi, değirmen | Tek yol, 2 keskin viraj | 8 | 1 |
| 2 | Taş Köprü | Nehir, taş köprü, sis | Y şeklinde ikiye ayrılır, köprüde birleşir | 10 | 1 |
| 3 | Kül Ovası | Yanmış toprak, volkanik | İki ayrı giriş, kalede birleşir | 12 | 2 |

Harita verisi:
```ts
interface MapDef {
  id: string;
  background: string;             // atlas frame
  paths: Vec2[][];                // her giriş için waypoint dizisi
  buildSpots: Vec2[];
  flyerPaths: Vec2[][];           // uçanlar için düz hatlar
  castle: Vec2;
  waves: Wave[];
  hpMultiplier: number;
}
```

## 10. Juice — hissi taşıyan katman

TD'de oyuncu çoğu zaman **izler**. İzlenen şey tatmin edici olmak zorunda.

- **Ekran sarsıntısı:** yönlü, darbe vektörü boyunca; süre 0.12–0.25 sn;
  üstel sönüm. Yalnızca top patlaması, boss vuruşu ve can kaybında. Her okçu
  atışında sarsıntı olmaz.
- **Hit-stop:** 60–80 ms. Yalnızca boss hasarı ve düşman ölümünde. Hareket hiç
  değişmese bile beyin bunu "daha ağır vuruş" olarak okur.
- **Squash & stretch:** düşman ölürken 1.3× yatay ezilme + kaybolma, 120 ms.
- **Parçacıklar:** darbe yönünde dışa; ilk kare parlak altın/vermilyon,
  hızla koyu duman/toza sönüm. Aynı anda en fazla 300 parçacık (havuzlu).
- **Hasar sayıları:** yukarı süzülür, kritikte %140 boyut, tabular font.
- **Altın uçuşu:** düşman ölünce altın ikonu HUD sayacına doğru bezier ile uçar,
  vardığında sayaç tick sesiyle artar.
- **Kule yerleşimi:** toz halkası + 40 ms hafif zoom + tok bir "yerleşti" sesi.
- **Can kaybı:** ekran kenarında vermilyon vinyet nabzı, 400 ms.
- **Dalga bitişi:** altın sayacı tek tek sayarak artar (anında değil).

Ayarlarda **Ekran sarsıntısı** ve **Efekt yoğunluğu** kapatılabilir olmalı;
`prefers-reduced-motion` varsayılanı düşük yapar.

## 11. Ses

- Her kule ailesinin ayrı atış sesi, ±%8 rastgele perde kayması (tekdüzelik önler).
- Ölüm, altın, yerleştirme, yükseltme, hata (yetersiz altın), dalga başlangıcı,
  boss girişi, kazanma/kaybetme.
- Müzik: 2 parça (menü + oyun), döngü. **İlk dalgadan sonra yüklenir** —
  ilk paket boyutunu düşürmek için.
- Varsayılan ses açık ama tek tuşla kapatılabilir, tercih kaydedilir.

## 12. Kapsam dışı (v1'de yok)

Bunlar bilinçli olarak dışarıda: kahraman birimi, meta yükseltme ağacı, sonsuz
mod, günlük sıralama, çoklu oyuncu, harita editörü, başarımlar.
v1 bittikten sonra tartışılır.

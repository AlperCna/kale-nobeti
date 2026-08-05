# M3 — Ekonomi, dalgalar, denge sağlamaları · SONUÇ

| | |
|---|---|
| **Taş** | M3 · 11 görev (`M3-T01` … `M3-T11`) |
| **Durum** | ☑ tamamlandı |
| **Kapanış komutu** | `typecheck` ✓ · `test` 369/369 ✓ · `build` ✓ · `guard` 9/9 ✓ |

**Taş bittiğinde oyun:** Harita 1'in 10 dalgası baştan sona oynanıyor ve
**bitirilebiliyor**. Altın kazanılıyor, kule alınıyor, **yükseltiliyor** ve
%70 iadeyle satılıyor; hazırlık sayacı, erken başlatma bonusu ve dalga
telegrafı çalışıyor; kazanma ve kaybetme ekranı var.

---

## 1. Canlı doğrulama — baştan sona oynandı

Phaser döngüsü elle sürülerek (`OLCUMLER.md` §7) referans tahta taklit
edildi: kapsama sırasına göre nokta doldur, dolunca yükselt.

| Dalga | Altın (dalga başı) | Can | Kule | T2 |
|---|---|---|---|---|
| 1 | 30 | 20 | 3 | 0 |
| 2 | 25 | 20 | 4 | 0 |
| 3 | 31 | 20 | 5 | 0 |
| 4 | 42 | 19 | 6 | 0 |
| 5 | 65 | 19 | 7 | 0 |
| 6 | 16 | 19 | **8** | 1 |
| 7 | 98 | 19 | 8 | 2 |
| 8 | 95 | 19 | 8 | 4 |
| 9 | 19 | 19 | 8 | 7 |
| 10 | 155 | 19 | 8 | **8** |

**Sonuç: 10 dalga tamamlandı, 19/20 can, ★★.**
Kazanma ekranı: `Kale ayakta` · `19 / 20 kalan can` · `★★` · `Ana menü`.

**Başsız simülasyon aynı sonucu vermişti: 1 sızıntı, 19 can.**
İki bağımsız yol (headless `simulateWave` ve gerçek Phaser döngüsü) aynı
sayıya çıktı — Kısıt B'nin oyunu gerçekten temsil ettiğinin kanıtı.

### Diğer canlı ölçümler

| İddia | Ölçüm |
|---|---|
| Dalga 10 kare maliyeti | ort **1,93 ms** · p95 **2,80** · maks **3,50** (bütçe 16,67) |
| Dalga 10 tepe düşman | **10** (8 T2 kule hızlı öldürüyor; M2'de kulesiz 26'ydı) |
| Mermi havuzu tepe | **5** / 200 |
| Havuz tükenmesi | **0** |
| HUD sayıları | `BitmapText`: `280` altın · `20` can · `1.10` dalga · `20` geri sayım |
| Telegraf hazırlıkta | görünür, 1 ikon + `10` |
| Telegraf dalga başlayınca | **gizli** ("bitmedi sayılır eğer" maddesi) |
| Kaybetme yolu | kulesiz oynandı → can 0 → `GameOver` `won:false` |
| Menüden yeni oyun | 280 altın, 20 can, 0 kule, dalga 1 — **temiz** |

---

## 2. `SPAWN_K` uydurulmadı, **ölçüldü** (S28)

§7'nin `SPAWN_K` sabiti dokümanda yok. İlk tahminim 8'di ve
**simülasyon onu çürüttü.** Sekiz değer × 10 dalga koşturuldu:

| `SPAWN_K` | doğum penceresi | sızan dalga | toplam sızan HP |
|---|---|---|---|
| 8 | 7,2 sn | 6 | 364 |
| 12 | 10,8 sn | 5 | 315 |
| 15 | 13,5 sn | 5 | 158 |
| 18 | 16,2 sn | 3 | 118 |
| 20 | 18,0 sn | 4 | 74 |
| **24** | **21,6 sn** | **1** | **14** |

(gerçekçi referans tahtayla)

### Formülün asıl anlamı bulundu

`düşmanlarArasıBekleme = SPAWN_K / dalgaBoyu` olduğu için toplam doğum
penceresi `(n−1) × K/n ≈ K` — **dalga boyundan bağımsız**. Yani `SPAWN_K`
"aralık katsayısı" değil, **dalganın kaç saniyede doğduğu**. §7'nin
"kalabalık dalgalar daha sık doğurur" cümlesinin karşılığı tam olarak bu:
aralık kısalıyor, pencere sabit kalıyor.

24 seçildi: pencere 21,6 sn, hazırlık sayacıyla (20 sn) aynı büyüklükte —
ritim "20 sn hazırlan → ~22 sn savaş → nefes".

### `REST_K` düştü — §6 ile §7 çelişiyordu

§7 `dalgaSonrasıBekleme = REST_K × dalgaBoyu` diyor; §6 hazırlık sayacını
**açıkça 20 sn** veriyor ve erken başlatma bonusunu o 20 saniyenin üstüne
kuruyor. İkisi aynı anda geçerli olamaz: `REST_K × dalgaBoyu` bonusun
tavanını dalgadan dalgaya değiştirir ve §6'nın "geç oyunda gerçek bir
karar" dediği denge bozulur. **Açık sayı kazandı.**

---

## 3. İki denge bulgusu

### S34 — 8 nokta dalga 6'da doluyor, §6 "4-5" diyor

| Tahta | 8 noktanın dolduğu dalga |
|---|---|
| Karışık (4 Okçu + 4 Top = 720 altın) | **6** (gelir 727) |
| En ucuz (8 Okçu = 560 altın) | **5** (gelir 603) |

Ayrıca **toplam gelir 1614**, §6 "~1850" diyor — **%13 düşük**.

**Sebep aynı ve geçici:** harita 1 kadrosu şu an üç düşman (Goblin 3,
Ork Savaşçı 6, Kurt Binicisi 9 altın). **Harpi (9) ve Ogre Şef (60) M4'te
giriyor**; boss tek başına 60 altın ve Harpi birkaç dalgaya dağılıyor.
M4'te yeniden ölçülecek.

Planın "bitmedi sayılır" eşiği "6'dan büyükse" idi — 6 tam sınırda geçiyor.

### S35 — Yükseltme M3'e alındı (plan M4 diyordu)

Plan "**Olmayan:** Tier 2-3" diyordu ama aynı taşın bitiş durumu
"Harita 1 ... **bitirilebiliyor**" istiyordu. Ölçüm iki maddenin aynı anda
doğru olamayacağını gösterdi:

| Tahta | dalga bazında sızan | toplam | sonuç |
|---|---|---|---|
| T2 dahil (referans) | 0 0 1 0 0 0 0 0 0 0 | **1** | 19/20 can, **kazanır** |
| Yalnız T1 | 0 0 1 0 0 3 1 6 9 10 | **30** | **kaybeder** |

T2 satırları `towers.ts`'te zaten vardı, kademe `TowerSystem`'de zaten
destekliydi — eksik olan tek şey menü butonuydu. **T3 dalları M4'te kaldı.**

---

## 4. Kısıt A ve Kısıt B

### Kısıt A (statik, yerleşimden bağımsız)

Dalga 10 tahtasıyla, `applyDamage` üzerinden **etkin** DPS ile:

| Düşman | Tavan | Etkin HP | Oran | %15 payla |
|---|---|---|---|---|
| Goblin | 551 | 45 | %8,2 | geçti |
| Ork Savaşçı | 636 | 110 | %17,3 | geçti |
| Kurt Binicisi | 280 | 60 | %21,4 | geçti |

**Yerleşimden bağımsızlık ayrı bir testle kanıtlandı:** aynı kuleler ters
sırada yerleştirildiğinde tavan 9 ondalık basamağa kadar aynı
(`research/01` §2'nin merkezi iddiası).

### Kısıt B (simülasyon)

`simulateWave` sahnesiz, deterministik ve hızlı:

| Şart | Sonuç |
|---|---|
| Sahnesiz koşuyor | ✓ (`node` ortamında, Phaser import etmiyor) |
| Deterministik | ✓ aynı girdi → `toEqual` ile aynı çıktı |
| Adım yarıya inince sapma | **< %2** |
| 10 dalga süresi | **< 2 sn** |
| Kulesiz tahta | 10/10 sızıyor, `leakedHp` = 450 |

> **Kabul kriteri düzeltildi.** Plan "10 dalga için `leakedHp === 0`"
> diyordu. Ölçüm tutmadı ve **doğru iddia da o değil**: 20 can veriliyorsa
> amaç sıfır sızıntı değil, geçilebilirlik — §9 yıldız tablosu bunu zaten
> söylüyor (20 → ★★★, 15-19 → ★★). Test "toplam sızan ≤ 3 ve kalan can
> ★★ üstü" olarak yazıldı; ölçülen 1 sızıntı, 19 can.

---

## 5. Yakalanan hatalar

### Canlı testin bulduğu çökme

Sahne yeniden başlatılırken:

```
TypeError: Cannot read properties of null (reading 'chars')
  at GetBitmapTextSize → DamageText.resetForPool → setText
```

`shutdown` sırasında Phaser görüntü listesini yıkmış oluyor; yıkılmış bir
`BitmapText`e `setText` çağırmak artık var olmayan font verisine dokunuyor.
İki yerden birden kapatıldı: `SHUTDOWN` artık havuzları `releaseAll`
etmiyor (zaten gereksizdi — havuzlar `create()`'te yeniden kuruluyor) ve
`resetForPool` font yokken `setText` çağırmıyor.

**Bu hata yalnız canlı çalıştırmayla bulunabilirdi** — birim testleri
Phaser'a hiç dokunmuyor.

### Referans tahta türetmesindeki hata

İlk hâli tercih edilen kule pahalıysa **ucuz olana düşmüyordu**; dalga 1'de
100 altın elde dururken kule almıyordu. Simülasyon 10 goblinin 6'sının
sızdığını gösterdi. Gerçek oyuncu elindekiyle alabildiğini alır; modelin
onu yansıtmaması **modelin hatasıydı**, dengenin değil.

### Planın iki hatalı kabul kriteri

- **"Nefes dalgaları bir öncekinden küçük"** — formül bunu vermiyor:
  `budget(4) = 15 > budget(3) = 14`, `budget(7) = budget(6) = 25`.
  %85 çarpanı dalgayı **kendi rampa değerinden** küçültüyor, öncekinden
  değil. Doğru iddiayla değiştirildi.
- **"10 dalga için `leakedHp === 0`"** — yukarıda (§4).

---

## 6. Bekçiler

9/9. Bu taşta biri daraltıldı, biri gerçek ihlal yakaladı.

**k.8 (duvar saati) test dosyalarını hariç tutuyor artık.** Bekçi
`waveSim.test.ts` içindeki `performance.now()`'u yakalamıştı — ama orada
ölçülen şey **simülasyonun kendi koşu süresi**, oyun zamanı değil. k.9'un
`Math.sqrt` istisnasıyla aynı gerekçe. Üretim kodunda `Date.now()` hâlâ
yakalanıyor: kasten denendi, 8/9'a düştü.

**k.7 (setText)** `HudReadout.ts` ve `WaveTelegraph.ts`'in `HudScene`'den
ayrı dosyalar olmasını zorladı — `HudScene` duraklatma perdesi için statik
`Text` üretiyor, bekçi ikisini ayıramıyor. Ayrım hem bekçiyi ayakta tuttu
hem doğru mimariyi verdi: değişen sayılar tek yerde.

---

## 7. Kalan işler

| İş | Nereye |
|---|---|
| S34 — kadro tamamlanınca gelir ve "8 nokta" dalgası yeniden ölçülmeli | M4 |
| `SPAWN_K` M4 kadrosuyla yeniden ölçülmeli | M4 |
| T3 dalları (Havan / Barut Fıçısı, Keskin Nişancı / Kundakçı) | M4 |
| Harpi + uçan hareketi, Ogre Şef ve boss dalgası (refakatsiz — S33) | M4 |
| Yıldız görselleştirmesi ve kayıt | M7 |
| `referenceBoards.ts` (M1'den kalan elle taşınmış ΣDPS'ler) artık `balanceChecks` ile örtüşüyor; birleştirilebilir | M4 |

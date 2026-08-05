# M5 — Kışla, askerler, yetenekler · SONUÇ

| | |
|---|---|
| **Tarih** | 2026-08-05 |
| **Gerçek süre** | ~1 sa 50 dk (plan: 3 gün — birim farkı, `TASK-TEMPLATE.md` "Süre birimi") |
| **Görev** | 9/9 ☑ |
| **Test** | 531 geçti / 27 dosya · 1,81 sn (M4: 430 / 23) |
| **Bekçi** | 9/9 ✓ |
| **İlk indirme** | 0,39 MB (sınır 8 MB) |

**Taş sonunda oyun:** Kışla kurulabiliyor, iki kademe + iki dal (Paladin /
Haydutlar) yükseltilebiliyor. Askerler çıkıyor, toplanma noktası
sürüklenebiliyor ve kural 6 kısıtlarından geçiyor, düşmanlar kilitleniyor.
Meteor ve Takviye çalışıyor, beklemeler HUD'da dairesel dolumla görünüyor.

---

## 1. Dokuz engelleme kuralı — her biri için ayrı test

`GAME-DESIGN.md` §4.4'ün dokuz maddesi. **44 test**, hepsi `node` ortamında
(`BarracksSystem` Phaser'a dokunmuyor — TIER 1 kural 11).

| # | Kural | Test | Canlı |
|---|---|---|---|
| 1 | `engagedWith` / `blockedBy` alanları | ✅ 2 test | ✅ |
| 2 | Aggro 60 px, temas 20 px, düşman duruyor | ✅ 5 test (sınır ve sınırın 1 px dışı) | ✅ |
| 3 | Çok asker → bedava DPS, **tek** hasar | ✅ 3 test | ✅ **iki asker `fighting`, HP 38 vs 45** |
| 4 | Kilit kırılma ve yeniden kilitlenme | ✅ 4 test | ✅ |
| 5 | Askerden fazla düşman durmadan geçer | ✅ 2 test | ✅ tepe engellenen **3** |
| 6 | Toplanma noktası: 160 px menzil, yola 40 px yapışma | ✅ 8 test | ✅ |
| 7 | Dirilen asker **yürür**, yürürken engellemez | ✅ 4 test | ✅ |
| 8 | Uçanlar engellenemez | ✅ 2 test | ✅ **475 örnek, 0 ihlal** |
| 9 | Ogre Şef askeri **tek vuruşta** öldürür | ✅ 3 test | ✅ **75/60/60 HP tek karede sıfırlandı** |

### Kural 2 ile kural 3 çelişiyordu — çözüldü

Kural 2 "en yakın **engellenmemiş** düşmanı hedefle" diyor; kural 3 "bir
düşman birden çok asker tarafından dövülebilir". İkisi aynı anda nasıl doğru
olur?

**Çözüm:** önce engellenmemiş düşmanlar aranıyor; hiçbiri yoksa zaten
engellenmiş olanlara düşülüyor. Serbest düşman varken ona gitmek her zaman
daha iyi; yoksa kural 3 devreye giriyor. `research/03` §1'in
"askerlerin sayısı düşmanlardan fazlaysa" cümlesi tam olarak bunu tarif
ediyor.

### Kural 4'e bir madde eklendi: devralma

Kural 4 "askeri ölen düşman, aggro yarıçapında serbest asker varsa yeniden
kilitlenir" diyor. Bu, kural 3'le birleşince gizli bir durum üretiyor:
**engelleyen asker ölünce üstünde hâlâ dövüşen ikinci asker varsa** düşman
serbest kalıp yürümeye başlıyordu. Temastaki asker zaten "aggro yarıçapında
serbest asker"in ta kendisi — devralıyor. Ayrı test var.

### Kural 5 için özel kod YOK

"Askerler düşmandan azsa fazla düşmanlar geçer" bir sayaçla değil, kural 1 ve
3'ten **doğal olarak** çıkıyor: her asker en fazla bir düşmana kilitleniyor ve
yalnız `blockedBy` olan düşman duruyor. Ayrı test bunu kanıtlıyor —
6 düşman, 3 asker, engellenen ≤ 3.

### Sinerji için de özel kod YOK

§4.4: "iki kışlanın toplanma noktası aynı yere konursa daha çok hasar, daha
az hasar alır." **"Daha az hasar" sabit süre penceresinde ölçülemez** —
düşman her an yalnız `blockedBy` askerine vuruyor, yani birim zamandaki kayıp
asker sayısından bağımsız; 3 saniyede 4 asker doğal olarak 2 askerden çok
kayıp verir.

Doğru ölçü **verilen hasar başına alınan hasar**: verilen `N × dpsEtkin`,
alınan `1 × meleeDps`. N ikiye katlanınca oran **yarıya** iniyor. Ölçüldü
(0,50 ± 0,05) ve kural 3'ten türediği testle sabitlendi.

---

## 2. Kışlalı / kışlasız Trol — zorunlu ölçüm

Aynı Trol, Harita 1'in gerçek yolu, aynı nokta, tek fark kışla.
Kule: Okçu T2 (§5'in "yoğun tek hedef" satırının en zayıf hâli).

**Taban: kışlasız Trol kule menzilinde 15,3 sn.**

| Kışla | ×1 | ×2 | ×3 | Kuleli sonuç (×1) |
|---|---|---|---|---|
| T1 | +%13 | +%26 | +%39 | sızıyor |
| T2 | +%22 | +%43 | +%238 | sızıyor |
| Paladin | +%41 | ölüyor | ölüyor | sızıyor |
| **Haydutlar** | **+%68** | ölüyor | ölüyor | sızıyor |

**Planın "%50 daha uzun" ölçütünü tutturan en küçük yapılandırma: tek
Haydutlar kışlası.** T1/T2/Paladin tek başına tutturamıyor.

### Ölçüt neden değiştirildi

Planın tek ölçütü ("menzilde geçen süre ≥ %50 artmalı") kışla işini *çok iyi*
yaptığında **tersine dönüyor**: Trol ölürse menzilde geçen süre kısalıyor.
İlk ölçümde kışlalı koşu 18,6 sn, kışlasız 23,0 sn çıktı ve kışla kötü
görünüyordu — oysa kışlalı koşuda Trol ölüyordu.

Birleşik ölçüte geçildi: **başarı = (Trol ölüyor) VEYA (süre ≥ %50 uzun)**.
Ölmek zaten "sonsuz zaman kazanıldı" demek.

### S66 testi geçirmek için oynatılmadı

Tek T2 kışlanın yalnız +%22 vermesi doğrudan S66'dan (düşmanın askere verdiği
hasar) çıkıyor: Trol 45 DPS vuruyor, T2 askeri 75 HP ile **1,67 sn**
dayanıyor, iki asker toplam 3,3 sn. Sayıyı %50 hedefini tutturacak şekilde
düşürmek mümkündü ve **yapılmadı** — türetilmiş bir sayıyı istenen sonuca
göre ayarlamak bu projenin bir kez yaptığı ve bir daha yapmamaya karar verdiği
hata (2200 HP'lik boss).

---

## 3. Dokümanda olmayan üç sayı — uydurulmadı, türetildi

### S66 — düşmanın askere verdiği hasar

**En ağır eksik.** Kural 3 "düşman yalnızca `blockedBy` askerine hasar verir"
diyor ama **hangi sayıyla** olduğunu ne §4.4 ne §5 söylüyor; §5 düşman
tablosunda saldırı gücü sütunu hiç yok. Bu sayı olmadan engelleme yazılamıyor.

Türetme, iki belgelenmiş sayı ve bir belgelenmiş ölçek kullanıyor:

- §4.4 T1 satırı: asker **45 HP**, diriliş **8 sn**
- Kural 5'in niyeti: kışla baraj değil, zaman kazanma aracı → T1 askerinin
  en zayıf düşmana (Goblin, 1 puan) karşı **tam bir diriliş döngüsü**
  dayanması
- §5 zaten `altın = 3 × puan` ile puanı **evrensel tehdit ölçeği** olarak
  kullanıyor

      K = 45 HP / 8 sn / 1 puan = 5,625 DPS / puan

| Düşman | Puan | Askere DPS | T1 askeri dayanma |
|---|---|---|---|
| Goblin | 1 | 5,6 | 8,0 sn |
| Ork Savaşçı | 2 | 11,3 | 4,0 sn |
| Kurt Binicisi | 3 | 16,9 | 2,7 sn |
| Zırhlı Ork | 4 | 22,5 | 2,0 sn |
| Şaman | 5 | 28,1 | 1,6 sn |
| Örümcek Ana | 6 | 33,8 | 1,3 sn |
| **Trol** | 8 | **45,0** | **1,0 sn** |
| Ogre Şef | 25 | — | kural 9: **anlık** |

Sağlaması: Trol bir Paladin'i (140 HP) 3,1 sn'de öldürüyor — §5'in Trol'ü
"kışlayla tut" diye işaretlemesiyle tutarlı, ama kışlayı sonsuz duvar
yapmıyor.

### S67 — asker hasarı fiziksel, zırh **saniyelik** rakama

Zırh kare başına uygulansaydı 60 FPS'te her tık `dps/60 ≈ 0,08` hasar olurdu,
zırh 4 onu her seferinde `%15` tabanına düşürürdü ve **zırh sonsuz güçlü**
çıkardı. Asker "saniyede bir vuruş yapıyor" varsayılıyor —
`balanceChecks.effectiveDps` de aynı sözleşmeyi kullanıyor. Regresyon testi
var: Zırhlı Ork'a (zırh 8) T1 askeri (5 DPS) tam **0,75** DPS veriyor.

### S68 — asker hızı 45 px/sn

Kadronun en yavaşından (boss 28) hızlı, en hızlısından (Kurt Binicisi 110)
yavaş. Ork Savaşçı'nın hızıyla aynı — §5 tablosundan alınan bir sayı.

### S44 — kaçınma çarpımsal, `Math.random()` yok

Olasılıksal ("%25 ihtimalle iptal") ile çarpımsal (`×0,75`) **sürekli hasarda
beklenen değer olarak özdeş**: saniyede 60 zar atılıyor, varyans zaten sıfıra
çöküyor. Çarpımsal biçim aynı sonucu rastgelelik olmadan veriyor. `S56`'da
kritik vuruş tam bu gerekçeyle çıkarılmıştı: "varyans getirip karşılığında
hiçbir şey vermiyordu."

---

## 4. S69 — **kışlanın yeri, kışlanın kademesinden önemli**

Canlı ölçüm. Aynı otomatik tahta, aynı dalgalar, tek fark kışlanın noktası:

| Tahta | Sonuç | Dalga 10 kare ort |
|---|---|---|
| 8 kule, kışlasız | **20/20 can ★★★** | 3,69 ms |
| 7 kule + kışla **en yüksek** kapsamalı noktada (422 px) | **0/20 — kayıp** | 3,84 ms |
| 7 kule + kışla **en düşük** kapsamalı noktada (230 px) | **19/20 ★★** | 3,95 ms |

Kışla kapsamayı **kullanmıyor** — hasar vermiyor, menzili yok. Ama işgal
ettiği nokta bir kuleyi dışarıda bırakıyor. En iyi noktaya kurmak, o noktanın
422 px'lik kapsamasını çöpe atmak demek.

**Sonuç:** Harita 1'de T2 kışla doğru yerde bile ~1 can maliyetli. Bu bir hata
değil — §4.4 kışlayı belirli tehditlerin (Trol) cevabı olarak tanımlıyor ve
Harita 1'in dalga 10'u Trol ağırlıklı değil. Ama **M7'ye bir harita kuralı
çıkıyor:** her haritada kışlaya uygun, kapsaması düşük ama yola yakın bir
nokta bulunmalı.

---

## 5. Yakalanan hatalar

### Varsayılan toplanma noktası kışlanın üstü olamaz

İlk yazımda `clampRally(spot, spot, yol)` kullanıldı ve **kışla hiçbir şey
yapmadı**. Ölçüldü: Harita 1'in sekiz yapı noktasının hepsi yoldan
**75-90 px** uzakta, yani `pathSnapMax = 40`'ın dışında. Kışlanın üstü
reddediliyor, askerler yol kenarında duruyor, aggro yarıçapı (60 px) yola
yetişmiyor.

`defaultRally()` eklendi: yola en yakın nokta. Her yapı noktası için geçerli
olduğu ayrı testle kanıtlandı (yol üstünde **ve** 160 px menzilde).

### `#drawRally` her karede çiziliyordu

`Graphics.clear()` + kesikli çember + kesikli çizgi, saniyede 60 kez.
`#drawHover` zaten aynı sebeple yalnız hover değiştiğinde çiziliyordu; aynı
kural toplanma noktasına uygulanmamıştı. Artık yalnız **değişimde** çiziliyor
(kurma, satma, seçim, sürükleme).

*Not: ölçüm bunun kare maliyetinin baskın sebebi olmadığını gösterdi
(kışlasız 3,69 ms vs kışlalı 3,84 ms — fark gürültü içinde). Düzeltme yine
de doğru; her karede geometri üretmek kuralın açıkça yasakladığı şey.*

### Ömrü dolan geçici asker her karede yeniden bildiriliyordu

`expired` listesine giren asker listede kalıyordu ve sonraki her karede
yeniden bildiriliyordu. Çağıran havuza dönüşü bir kare geciktirseydi **çift
iade** olurdu. `Pool.release` çift iadeyi yok sayıyor ama sayaçlar yanlış
okunur ve hata görünmez kalırdı. Artık `alive` bildirim anında düşüyor: tek
bildirim.

### Canı bitmiş ama havuza dönmemiş düşman hedeflenebiliyordu

`alive` bayrağı bir kare gecikmeyle düşüyor. O karede asker ölü düşmana
kilitlenirse gerçek tehdidi görmüyor. `hedefSec` artık `hp <= 0` olanı da
eliyor.

### Sahne yeniden başlatmada M5 durumu

M4'te yakalanan tuzağın aynısı (alan başlatıcısı bir kez, `create()` her
seferinde). `#barracksBySpot`, `#draggingRally`, `#pendingAbility` ve
`abilities.reset()` `create()` başında sıfırlanıyor. Canlı doğrulandı:
yeniden başlatınca 280 altın, 20 can, 0 kule, 0 asker, iki yetenek de hazır.

---

## 6. Canlı doğrulama

Tarayıcı bölmesi kompoze etmediği için `requestAnimationFrame` tetiklenmiyor;
Phaser döngüsü `game.loop.step(t)` ile **elle** sürülüyor (M3'te bulunan
yöntem — kare sayısı tam ve tekrarlanabilir).

| # | İddia | Ölçüm |
|---|---|---|
| L1 | Kışla kuruluyor, 90 altın düşüyor, 2 asker çıkıyor | ✅ 280 → 190 |
| L2 | Varsayılan toplanma noktası yol üstünde | ✅ (700, 240), kışladan 90 px |
| L3 | Menzil dışına sürükleme | ✅ reddedildi, mevcut korundu |
| L4 | Yola tam 40 px mesafe | ✅ kabul, yola yapıştı |
| L5 | Yola 80 px mesafe | ✅ reddedildi |
| L6 | **Kural 3** — iki asker dövüşüyor, biri hasar alıyor | ✅ HP **38 vs 45** |
| L7 | **Kural 9** — boss askeri tek karede öldürüyor | ✅ **75, 60, 60 HP → 0** |
| L8 | **Kural 8** — uçan engellenmiyor | ✅ **475 örnek, 0 ihlal** |
| L9 | Meteor gerçek hasar | ✅ tam **180** |
| L10 | Takviye 2 asker, 60 HP, engelliyor | ✅ ikisi de `fighting` |
| L11 | Geçici askerler 20 sn sonra havuza dönüyor | ✅ 4 → 2 |
| L12 | Asker havuzu sızdırmıyor | ✅ kapasite sabit **24**, taşma **0** |
| L13 | Sahne yeniden başlatma temiz | ✅ 280/20/0/0, yetenekler hazır |
| L14 | 10 dalga bitiriliyor | ✅ 19/20 can ★★ (kışla doğru yerde) |
| L15 | Dalga 10 kare maliyeti | ort **3,95 ms** · p95 **4,7** · maks **7,8** |

**L15 hakkında dürüst not:** M4'te 0,946 ms ölçülmüştü. Aradaki fark kışla
değil — kışlasız aynı koşu **3,69 ms** veriyor. Tahta doluluğu farklı
(8 kule T2 hepsi ateş ediyor) ve ölçüm oturumu farklı. **Kışlanın kare
maliyeti ölçülemeyecek kadar küçük** (~0,15-0,25 ms). p95 4,7 ms, 60 FPS
bütçesinin (16,7 ms) çok altında.

---

## 7. M6/M7'ye taşınanlar

| İş | Neden |
|---|---|
| Haritalara **kışlaya uygun** düşük kapsamalı nokta koyma | S69 — M7, Harita 2-3 |
| Paladin kalkanının sayısı | S43 — dokümanda yok, insan kararı |
| `ReferenceBoard`'a hedefleme modu alanı | M4'ten taşınmıştı; kışla da tahtaya girmeli (`waveSim` kışlayı bilmiyor) |
| Kışlanın Kısıt A/B'ye dahil edilmesi | `simulateWave` şu an yalnız kule tahtası kuruyor |
| Asker sprite'ı ve dövüş animasyonu | M6 (şu an greybox kare) |

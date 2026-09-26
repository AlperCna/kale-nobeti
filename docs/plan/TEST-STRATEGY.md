# Test stratejisi

Neyin nasıl doğrulandığı. `CLAUDE.md` Test bölümünün açılımı.

**İlke:** saf mantık Vitest'le, geri kalan elle. Görsel/sahne testi yazılmaz
(`CLAUDE.md` Test) — gerekçesi §2'de.

---

## 1. Vitest ile test edilen saf fonksiyonlar

### 1.1 `applyDamage` — M2

`src/systems/combat.ts` · Kaynak: `GAME-DESIGN.md` §3

| Girdi | Beklenen | Neden |
|---|---|---|
| `(22, 'physical', {armor:0, mr:0})` | `22`, `floored:false` | Temel |
| `(6, 'physical', {armor:2, mr:0})` | `4` | Ork Savaşçı zırh tanıtımı |
| `(10, 'physical', {armor:10, mr:0})` | `1.5`, `floored:true` | Okçu T2 vs boss — %15 tabanı |
| `(6, 'physical', {armor:8, mr:0})` | `0.9`, `floored:true` | Okçu T1 vs Zırhlı Ork |
| `(24, 'magic', {armor:8, mr:0})` | `24` | Büyü zırhtan **etkilenmez** |
| `(24, 'magic', {armor:0, mr:0.40})` | `14.4` | Şaman direnci |
| `(30, 'magic', {armor:0, mr:0.25})` | `22.5` | Boss büyü direnci |
| `(180, 'true', {armor:10, mr:0.25})` | `180` | Meteor — hiçbir şey azaltmaz |
| `(0, 'physical', {armor:5, mr:0})` | `0` | Sıfır hasar |

**Sınır durumları:** büyü direnci `%85`'in altındayken taban **hiç devreye
girmez** (`24 × 0.15 = 3.6 < 24 × 0.6`) — `floored` yanlışlıkla `true`
dönmemeli.

### 1.2 `budget(n)` — M3

`src/data/waves.ts` · Kaynak: `GAME-DESIGN.md` §7

| Girdi | Beklenen | Neden |
|---|---|---|
| `1` | `10` | Başlangıç |
| `2` | `12` | `10 × 1.2` |
| `4` | `15` | **Nefes dalgası** `× 0.85` |
| `5` | `21` | Nefesten sonra normale dönüş |
| `7` | `25` | **Nefes dalgası** |
| `10` | `52` | Son dalga |
| `0` veya `-1` | hata fırlatır | Geçersiz girdi |

**Sınır durumu:** nefes dalgaları bir öncekinden **küçük** olmalı
(4 < 3, 7 < 6). Değilse nefes hissi oluşmaz.

### 1.3 `coveredLength` — M1

`src/util/coverage.ts` · Kaynak: `research/02` §6, `research/01` §2

| Girdi | Beklenen | Neden |
|---|---|---|
| Kule yoldan 500 px uzakta, menzil 150 | `0` | Kapsama yok |
| Düz yol kule merkezinden geçiyor, menzil 150 | `≈ 300` (±%3) | `2 × menzil` |
| Kule yoldan 50 px yanda, menzil 150 | `≈ 283` | Kiriş `2√(r²−d²)` |
| Yol menzilden **iki kez** geçiyor | İki geçişin **toplamı** | Kıvrımlı yol |
| `stepPx` 4 → 2 | Sonuç `< %1` değişiyor | Yakınsama |
| Sıfır uzunluklu segment | Hata değil, `0` katkı | Bozuk veri dayanıklılığı |

**En kritik test yakınsama.** Geçmiyorsa ölçüm gürültülü demektir ve
ondan türetilen boss/Trol HP'si de gürültülü olur.

### 1.4 Hedefleme seçicileri — M2

`src/systems/TargetingSystem.ts` · Kaynak: `GAME-DESIGN.md` §4.5

| Girdi | Beklenen | Neden |
|---|---|---|
| Boş aday listesi | `null` | |
| Hepsi menzil dışı | `null` | `distSq > rangeSq` |
| `first`, 3 düşman | Kaleye **kalan mesafesi en az** olan | §4.5 |
| `last`, 3 düşman | Kalan mesafesi en çok olan | §4.5 |
| `strongest`, biri hasarlı yüksek maksHP'li | **Hasarlı olan** seçiliyor | §4.5: maksimum HP, mevcut değil |
| `weakest`, biri hasarlı | Mevcut HP'si en düşük | §4.5 |
| `closest` | Öklit mesafe en az | §4.5 |
| Uçan düşman + `airMultiplier: 0` kule | Uçan **elenmiş** | §4.2 |
| Aynı girdi iki kez | Aynı hedef | Kararlılık (titreme yok) |

### 1.5 Ekonomi — M3

`src/systems/EconomySystem.ts` · Kaynak: `GAME-DESIGN.md` §6, §9

| Girdi | Beklenen |
|---|---|
| Harita 1 başlangıç | `gold === 280`, `lives === 20` |
| `spend(300)` yetersizken | `false`, altın değişmiyor |
| Goblin öldürme, harita 3 | `3 × 2.6` altın |
| `sellRefund(180)` | `126` (%70; yuvarlama testte sabitlenir) |
| `earlyStartBonus(20, 1)` | `0` — ilk 3 dalgada kapalı |
| `earlyStartBonus(20, 4)` | `40` — `20 × ceil(4/2)` |
| `earlyStartBonus(20, 10)` | `100` — `20 × 5` |
| `earlyStartBonus(-5, 10)` | `0` |
| `loseLife(10)` boss sızması | Can `20 → 10` |

### 1.6 Kısıt A — M3

`src/systems/balanceChecks.ts` · Kaynak: `GAME-DESIGN.md` §6

```
ceilingA = Σ_kule ( etkinDPS_kule × kapsananYol_kule ) / hız_düşman
```

| Senaryo | Beklenen |
|---|---|
| Her düşman × her harita | `ceilingA > efektifHP × 1.15` |
| Trol | Efektif HP = `hp + regen × yolSüresi` |
| Kapsama sıfır olan tahta | `ceilingA === 0` |
| **Aynı kuleler farklı noktalarda** | **Sonuç değişmiyor** |
| Ayrık yol (harita 2, 3) | **Kol başına** ayrı hesap (M7) |

Son iki satır kritik. Yerleşimden bağımsızlık formülün doğruluğunun kanıtı
(`research/01` §2); ayrık yolda toplam DPS yanıltıcı (`GAME-DESIGN.md` §9).

### 1.7 Kısıt B — M3 · **başsız simülasyon** (birim testi değil)

Kısıt B formülle doğrulanmıyor. İki girdisi — `dalgaSüresi` ve
`aktiflikOranı` — **statik veriden hesaplanamıyor**; ikisi de bir dalganın
nasıl aktığına bağlı. Tanım uydurmak, uydurulmuş sabitle test yeşile
boyamak olurdu — projedeki en büyük riskin tam kalıbı.

**Çözüm:** dalgayı gerçekten çalıştır, **sızan HP'yi ölç.**
`CLAUDE.md` Mimari bunu mümkün kılıyor — oyun mantığı `systems/` içinde,
sahneden bağımsız.

```ts
simulateWave(wave, board, map, stepMs) → { leakedHp, leakedCount, durationSec }
```

| Senaryo | Beklenen |
|---|---|
| Harita 1'in 10 dalgası, referans tahta | `leakedHp === 0` |
| Aynı girdi iki kez | Aynı sonuç (determinizm) |
| Kulesiz tahta | `leakedHp > 0` |
| `stepMs` yarıya iniyor | Sonuç `< %2` değişiyor |
| 10 dalga simülasyonu | `< 2 sn` (CI'da koşabilmeli) |

`durationSec` **çıktı**, girdi değil. Odaklanma kaybı (`research/01` §10)
doğal olarak ortaya çıkıyor — `× 0.75` çarpanı gerekmiyor.

**Kritik şart:** simülasyon `Phaser.Scene` veya render gerektirmemeli;
gerektirirse test ortamında koşmaz.

### 1.8 Ekonomi karşılanabilirliği — M3

| Senaryo | Beklenen |
|---|---|
| Her dalga n | `cumulativeGold(n) ≥ referenceBoard[n].cumulativeCost` |
| Dalga 5 sonu | 8 yapı noktası **dolu** (`GAME-DESIGN.md` §6) |
| Dalga 10 | En az bir Tier 2 alınabiliyor |

Dolma dalgası 6'dan büyükse bu bir test hatası değil, **denge bulgusu**;
yükseltme mekaniği hiç yaşanmıyor demektir (`research/01` §9).

### 1.9 Diğer saf fonksiyonlar

| Fonksiyon | Taş | Kritik sınır durumu |
|---|---|---|
| `math.distSq`, `pointToSegmentDistSq` | M1 | Sıfır uzunluklu segment; nokta uzantıda |
| `PathSystem.advance` | M1 | Bir karede iki segment geçme; `remainingDistance` monoton |
| `Pool` | M1 | Dolunca `null`; çift `release` yok sayılıyor |
| `effects` | M4 | Yavaşlatma bitince hız geri geliyor; 2×'te süre yarı |
| `EnemyAbility` | M4 | İyileştirme maksHP'yi aşmıyor; havuz doluyken bölünme kısılıyor |
| `BarracksSystem` | M5 | **§4.4'ün 9 kuralı için ayrı test** |
| `AbilitySystem` | M5 | 2×'te bekleme yarı sürede doluyor |
| `SaveSystem` | M7 | İstisna fırlatan store ile **çökmüyor** |

---

## 2. Test edilmeyenler ve gerekçesi

`CLAUDE.md`: "Görsel/sahne testi yazılmaz." Kapsamı:

| Test edilmeyen | Neden | Nasıl doğrulanıyor |
|---|---|---|
| Sahne geçişleri | Phaser yaşam döngüsü mock'lamak testin kendisinden pahalı | Elle (§3) |
| Girdi ve tıklama | Letterbox koordinat dönüşümü gerçek tarayıcı gerektiriyor | Elle (§3) |
| Render ve sprite | Görsel doğruluk otomatik doğrulanamaz | Elle + ekran görüntüsü |
| Havuz **davranışı** sahne içinde | Havuz **mantığı** test ediliyor; sahnedeki sızıntı ancak uzun oyunla çıkar | Elle: `activeCount` izleme |
| FPS ve performans | Cihaza bağlı | Elle, hedef cihazda (§3) |

Bu liste yazıldı ki sonradan "neden sahne testi yok" sorulmasın.

---

## 3. Elle test listesi

| # | Test | Adım | Beklenen | İlk yapılan taş |
|---|---|---|---|---|
| E1 | Duraklatma | ESC, sonra boşluk | İkisi de duraklatıp devam ettiriyor; Hud yanıt veriyor | M0 |
| E2 | 2× hız | Butona bas | Test nesnesi **gözle** iki kat hızlanıyor | M0 |
| E3 | Letterbox girdisi | Pencereyi yarıya küçült, butona tıkla | Tıklama ıskalamıyor | M0 |
| E4 | Font düşüşü | `FontFace.prototype.load`'u reddet/askıda bırak | 2 sn içinde sistem serif'e düşüp devam ediyor | M0 · **koşturuldu `M164`** |
| E5 | Alt klasör servisi | `npx serve dist -l 5000`, alt yoldan aç | Beyaz ekran yok (`base:'./'`) | M0 |
| E6 | Havuz sızıntısı | 10 dalga oyna, **bütün** havuz sayaçlarını izle | Sabit kalıyor, saha boşalınca sıfır | M1 · **koşturuldu `M165`** |
| E6b | **Dinleyici sızıntısı** | Sahneyi N kez yeniden başlat, `devHooks.shutdownListeners()` izle | **Sabit kalıyor** | M1 |
| E7 | Kapsama ölçümü | Geliştirme göstergesini oku | Ortalama ve `L` raporlanıyor | M1 |
| E8 | Karşı-oyun | §5 tablosundaki 7 senaryoyu dene | Her tehdidin cevabı işliyor | M4 |
| E9 | Uçan hattı | Hazırlık aşamasına bak | Kesikli altın hat görünüyor, ≥3 nokta kesiyor | M4 · **koşturuldu `M164`** (hat evet, sayı gözle) |
| E10 | Kışla 9 kuralı | Her kural için senaryo | Hepsi §4.4'teki gibi | M5 |
| E11 | Kışla sinerjisi | İki kışlayı aynı noktaya topla | Grup dövüşü çalışıyor | M5 |
| E12 | Efektsiz okunurluk | Ses ve efektleri kapat | Oyun **hâlâ okunur** | M6 · **koşturuldu `M164`** |
| E13 | 640×360 okunurluk | **640×360'a indirgeyip** büyüt (DPR tuzağı, aşağıda) | Tüm yazı okunur, motifler kaybolmuyor | M6 · **koşturuldu `M162`** |
| E14 | Renk körlüğü | Gri tonlamalı ekran görüntüsü | Düşman tipleri **silüetten** ayrılıyor | M6 · **koşturuldu `M162`** |
| E15 | `prefers-reduced-motion` | Sistemde aç | Varsayılanlar düşük geliyor | M6 |
| E16 | **Gizli sekme** | `Storage.prototype.setItem` fırlatır yap + kaydı boşalt, `Boot`'tan başlat | Çökmüyor **ve** uyarı görünüyor | M7 · **koşturuldu `M163`, kusur buldu** |
| E17 | Düşük uçlu cihaz | 4 GB RAM'li cihazda oyna | Akıcı (CrazyGames şartı) | M7 |
| E18 | Üç harita | Baştan sona oyna | Üçü de bitirilebiliyor | M7 |
| E19 | Üç kişi | 3 kişiye oynat | Nerede sıkıldıkları not edildi | M7 |

E16 ve E17 **portal kabul şartı** — atlanırsa yayın reddedilir
(`research/05` §1, §2).

### E6b — `M115`'te yeniden ölçüldü

`M95` bu sağlamayı bir kez koşturmuştu; o günden sonra `bus`'a **üç
yeni dinleyici** eklendi (`M102`'nin `ability:upgradable` tetikleyicisi,
`M104`'ün `game:paused` dinleyicisi, `M111`'in `ability:upgraded`
başarımı). Yenileri de aynı kuralı tutuyor mu diye tekrar ölçüldü.

`Game` sahnesi **dört kez** üst üste yeniden başlatıldı ve her turda
sayılar **birebir aynı** kaldı:

| Olay | Dinleyici |
|---|---|
| `game:paused` | 1 |
| `ability:upgradable` | 1 |
| `ability:upgraded` | 2 |
| `tower:placed` · `enemy:killed` | 3 |
| `gold:changed` · `life:lost` · `wave:started` | 2 |
| `devHooks.shutdownListeners()` | 12 |

Yani `TutorialHints.destroy()`'un `off` çağrısı ve diğer iki kayıt
sahne ömrüyle birlikte temizleniyor — sızıntı yok.

### E6b — `M136`'da üçüncü kez, bu kez **bütün** olay kümesiyle

`M115` tablosu dokuz olay sayıyordu; `types/events.ts` on dokuz olay
tanımlıyor. Aradan `M118`-`M135` geçti. **Beş** başlatma üzerinden on
dokuzunun hepsi sayıldı ve turdan tura tek bir sayı bile değişmedi;
`M115`'in listelediği dokuzu da **birebir aynı** çıktı.

| Olay | Dinleyici | | Olay | Dinleyici |
|---|---|---|---|---|
| `barracks:placed` | 4 | | `ability:upgradable` | 1 |
| `enemy:killed` · `tower:placed` | 3 | | `enemy:healing` · `enemy:shielded` | 1 |
| `ability:upgraded` · `gold:changed` | 2 | | `game:paused` · `purchase:denied` | 1 |
| `life:lost` · `wave:started` | 2 | | `wave:flyers` | 1 |
| `wave:ended` · `tower:upgraded` | 2 | | `save:failed` | **0** (bilerek) |
| `enemy:burrowed` · `targeting:opened` | 2 | | **toplam** | **33** |

`shutdownListeners()` yine **12**. `save:failed`'in sıfırı kusur değil —
`types/events.ts`'te yazılı, bilerek dinleyicisiz bir seam (uyarıyı
`GameScene` doğrudan çiziyor). Bundan sonraki ölçüm tek bir sayıya
bakabilir: **toplam 33**.

### E6b — `M161`'de dördüncü kez; sızıntı yok, ama tablo bir satır eksikti

`M136`'dan sonra `M137`-`M160` geçti (susturma verb'ü, hazırlık kuralı,
`RunStats`'ın tabanı, bekçi kuralı 27). `RunStats` dikkate değer: beş
`bus` dinleyicisini **kurucusunda** kaydediyor ve `GameScene` her
`create()`'te yenisini yaratıyor — yani sızıntı olsaydı en hızlı buradan
büyürdü.

`Game` **beş kez** yeniden başlatıldı, on dokuz olayın hepsi sayıldı:

| tur | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| toplam dinleyici | 33 | 33 | 33 | 33 | 33 |

Dağılım: `barracks:placed` 4 · `enemy:killed` 3 · `tower:placed` 3 ·
`ability:upgraded` 2 · `enemy:burrowed` 2 · `gold:changed` 2 ·
`life:lost` 2 · `targeting:opened` 2 · `tower:upgraded` 2 ·
`wave:ended` 2 · `wave:started` 2 · `ability:cast` 1 ·
`ability:upgradable` 1 · `enemy:healing` 1 · `enemy:shielded` 1 ·
`game:paused` 1 · `purchase:denied` 1 · `wave:flyers` 1 ·
`save:failed` **0** (bilerek).

**Yan bulgu — `M136` tablosu on dokuz olaydan on sekizini sayıyor.**
`ability:cast` satırı yok; o yüzden tablonun satırları **32** ediyor ama
altındaki cümle doğru biçimde **33** diyor. Toplam yanlış değildi,
*sayan liste* eksikti — `CLAUDE.md` TIER 2'nin birinci yüzeyi. Yukarıdaki
dağılım on dokuzun hepsini taşıyor.

### E13 ve E14 — `M162`'de İLK KEZ koşturuldu

İkisi de tabloda `M6`'ya yazılıydı ama **hiçbir yerde koşturulduklarına
dair kayıt yoktu** — E6b'nin üç kayıtlı turu varken bunların sıfır. Aradan
kadro 11 düşmana, harita 6'ya, verb sayısı beşe çıktı.

**E14 — renk körlüğü / silüet.** Tuvale `filter: grayscale(1)` uygulanıp
iki şey bakıldı: (1) canlı sahada on bir tür (`__kn.spawnEnemy` ile
doğuruldu), (2) atlas kareleri yan yana.

*Sonuç:* dokuz kare de **silüetten** ayrılıyor — goblin ince ve hançerli,
Ork Savaşçı geniş ve baltalı, Zırhlı Ork ondan daha hantal, Kurt Binicisi
dört ayaklı, Harpi kanatlı, Şaman kambur ve asalı, Trol devasa ve uzun
kollu, örümcekler sekiz bacaklı. **Kural 6'nın asıl iddiası (dost/düşman)
da tutuyor:** kışla askeri **dik, ince, mızrak + kalkan, boynuzsuz**;
düşmanların hepsi kambur/boynuzlu/geniş. Ayrım renge dokunmuyor.

*Bilinen ve bilinçli örtüşme:* `orumcek_ana` ile `orumcek_yavrusu` yalnız
**boyutla** ayrılıyor, ve Tünelci'nin kendi karesi yok — Örümcek Ana'nın
karesini kullanıyor (`M12` greybox kararı, bedeli `M32`'de ölçüldü).
Boyut renk değil, yani k.6 ihlali değil; yine de nihai çizim geldiğinde
ilk kapatılacak yer burası.

**E13 — 640×360 okunurluk.** *Yöntem tuzağı, `M162`'de bulundu:*
tarayıcı penceresini 640×360 yapmak **yetmiyor**. Tarayıcı paneli
`devicePixelRatio = 2` ile çalışıyor, yani tuvalin arka deposu hâlâ
1280×720 ve ekran görüntüsü olduğundan **iki kat keskin** çıkıyor —
sağlama sahte biçimde geçer. Doğrusu: tuvali 640×360'lık bir offscreen
tuvale çizip (`drawImage(src, 0, 0, 640, 360)`) sonucu `image-rendering:
pixelated` ile büyütmek. Gerçek bilgi kaybı ancak böyle görünüyor.

*Sonuç:* en yoğun iki ekranda da **okunur**. "Nasıl oynanır" iki sütunlu
gövde metninin tamamı, bölüm başlıkları, `← Geri` ve `Tam ekran`
etiketleri; oyun içinde `280 altın · 20 can · 1.10 dalga`, `Meteor`,
`Takviye` ve üst şeritteki üç düğme. Yazı yumuşuyor ama hiçbir satır
kaybolmuyor. (Ekrandaki küçük kapsama sayıları geliştirme katmanı,
yayında yok.)

### E16 — `M163`'te İLK KEZ koşturuldu ve **bir kusur buldu**

`localStorage` gizli sekmede istisna fırlatıyor; kural 10 iki şey
istiyor: **çökmesin** ve **oyuncuya bir kez bildirilsin**. Taklit:
`Storage.prototype.setItem`'ı fırlatır yapıp kaydı boşaltmak, sonra
`Boot`'tan yeniden başlatmak (yani "ilk oturum" + "depolama yok").

**Birinci yarı geçti:** oyun çökmüyor, `MemoryStore` yedeğine düşüyor,
menü/oyun normal açılıyor. Boot'taki yoklama fırlatmayı yakalıyor.

**İkinci yarı KIRIKTI — ve tam da kuralın yazıldığı durumda.**
On dört örneklemenin hepsinde uyarı **yok**, registry bayrağı
`false` (yani tüketilmiş). Kontrol koşusu — `Overlay` önceden ayakta —
aynı anda uyarıyı **gösteriyordu**, yani mekanizma değil **zamanlama**
kırıktı.

*Teşhis:* ilk oturumda menü atlanıyor (`M10-T01`: `PreloadScene`
doğrudan `Game`'e gidiyor) ve `Overlay`'i `Menu` değil `GameScene`
başlatıyor — `create()`'in başında `scene.launch('Overlay')` ile. Ama
`launch` **kuyruğa alıyor**: sahne o karede aktifleşmiyor. Kırk küsur
satır aşağıdaki `if (overlay.scene.isActive())` hâlâ `false` dönüyor,
uyarı düşüyor, ve bayrak çoktan tüketildiği için bir daha denenmiyor.
Yani uyarı **yalnız ilk oturumda** kayboluyordu; menüden geçen her
yolda çalışıyordu — bu yüzden gözle fark edilmesi çok zor.

*Düzeltme (`M163`):* `isActive()` yanlışsa uyarı
`overlay.events.once(Phaser.Scenes.Events.CREATE, ciz)` ile
`Overlay` doğduğu anda çiziliyor. `once`, "create() içindeki dinleyici
tüketilmeli" mimari kuralını sağlıyor.

*Düzeltme sonrası:* aynı taklit, on iki örneklemenin **hepsinde** uyarı
görünüyor (*"İlerleme kaydedilemiyor — tarayıcın depolamayı
engelliyor"*), ekran görüntüsüyle de doğrulandı.

### E4, E9, E12 — `M164`'te ilk kez koşturuldu; üçü de geçti

**E4 — font düşüşü.** `BootScene` fontları `FontFace` ile yükleyip
`Preload`'dan **önce** `await` ediyor, yani yükleme takılırsa oyun hiç
açılmaz. İki uç durum ayrı ayrı taklit edildi
(`FontFace.prototype.load` değiştirilerek):

| Durum | Menüye varış |
|---|---|
| `load()` **reddediyor** | **204 ms** — beklemeden devam ediyor |
| `load()` **hiç çözülmüyor** | **2101 ms** — `FONT_TIMEOUT_MS` (2000) sınırı |

Üçüncü olarak `document.fonts.clear()` ile yüzler silinip menü yeniden
çizildi: başlık **sistem serif**ine düşüyor, düzen bozulmuyor, Türkçe
harfler (`ö · ı · ş`) eksiksiz. Yani hem "asılı kalmıyor" hem "okunur
kalıyor" tarafı ölçüldü.

**E12 — efektsiz okunurluk.** Ses kapalı, `effects: 'low'`, ekran
sarsıntısı kapalı. Dövüş hâlâ okunuyor: düşmanlar yolda, mermi havada,
hasar sayısı ve altın sayacı işliyor (`particleCount` düşük ama sıfır
değil — "low" kapatmıyor, seyreltiyor). Kayıp bilgi yok.

**E9 — uçan hattı.** Değirmen Geçidi'nin uçanları dalga 6'da; o dalganın
hazırlığında `flyerHintOn()` **true** ve ekranda **kesikli altın hat**
haritayı çapraz kesiyor — kahverengi yer yolundan açıkça ayrı.
*Kısmen ölçüldü:* hattın "≥3 yapı noktası kesiyor" şartı **gözle**
doğrulandı, sayıyla değil; hat birkaç noktanın menziline giriyor.
Sayısal sağlama istenirse `flyerPaths` ile `buildSpots` arasındaki
mesafe `util/coverage.ts` tarzında hesaplanabilir.

### E6 — `M165`'te İLK KEZ koşturuldu (ikizi dört kez koşmuştu)

Küçük bir ironi: E6b dört kez ölçüldü (`M95` · `M115` · `M136` · `M161`)
ama **asıl E6 hiç koşmamıştı**. Değirmen Geçidi baştan sona oynandı
(on dalga, 3× hız, tahta her karede yeniden doldurularak), **kazanıldı**
(8 can kaldı) ve belgenin istediği `activeCount`'un ötesinde **bütün
havuzlar** izlendi.

| dalga | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| sahadaki düşman | 2 | 3 | 4 | 3 | 5 | 5 | 7 | 6 | **12** | 9 |

- `enemyCapacity` boyunca **60** — sabit. Sessiz büyüme TIER 1 kural 3
  ihlali olurdu; yok.
- `poolExhausted` **0** — hiçbir havuz tükenmedi. Tepe 12, kapasitenin
  beşte biri (bu en kolay harita; `CLAUDE.md`'nin altı harita üzerinden
  ölçtüğü tepe 23).
- **Saha boşalınca hepsi sıfıra dönüyor:** düşman 0 · mermi 0 · can
  çubuğu 0 · altın uçuşu 0 · asker 0 · parçacık 0. Tek istisna hasar
  sayısı **1** — o da sönmekte olan son yazı, beklenen.

Yani havuza dönen nesne gerçekten dönüyor ve sayaçlar turdan tura
birikmiyor.

### E6 ve E6b neden ikiz

İkisi de **sessiz birikme** sınıfından: ne çökme üretiyorlar ne hata
mesajı. Havuz sızıntısı FPS düşüşü olarak, dinleyici sızıntısı **olayların
birden çok kez işlenmesi** olarak görünüyor — "bir düşman öldü, iki kez
altın geldi" gibi. Sebebi aramak M3'te akla gelmez.

**Bekçiye dönüştürülemez.** Statik analiz `once`/`on` ayrımının doğru olup
olmadığını, kaydın `create()` içinde mi dışında mı olduğunu bilmeden
söyleyemez — M0'da tam olarak bu ayrım bir hatalı teşhise yol açtı.
Çalışma zamanı sağlaması doğru araç; kancalar `devHooks`'ta hazır.

---

## 4. Sürekli kontroller — `npm run guard`

`M0-T10`'da dört kontrolle kuruldu; **bugün 17**. Node ile yazılır ki
PowerShell'de de çalışsın.

| # | Kontrol | Kural | Geldiği iş |
|---|---|---|---|
| 1 | Ham `delta` (`GameClock` dışında) | TIER 1 k.8 | M0-T10 |
| 2 | `: any` / `<any>` / `as any` | TIER 1 k.5 | M0-T10 |
| 3 | `PreloadScene`'de ≥ 4 aşama fonksiyonu | ROADMAP M0 | M0-T10 |
| 4 | Değişen metinde `setText` (`BitmapText` değilse) | TIER 1 k.7 | M0-T10 |
| 5 | Saf mantıkta çalışma zamanı Phaser | TIER 1 k.11 | — |
| 6 | `src/` altında test dosyası var | §1 | — |
| 7 | `Math.sqrt` yalnız `math.ts` | TIER 1 k.9 | — |
| 8 | `coverage` elle yazılmamış | mimari | — |
| 9 | Saf mantıkta duvar saati | TIER 1 k.8 | — |
| 10 | Sahne alanları `create()` içinde sıfırlanıyor | mimari | — |
| 11 | `HAVUZ_ALANLARI` → `resetForPool()` tamlığı | TIER 1 k.3 | `Y08` |
| 12 | `scenes/`+`fx/`'te Türkçe metin sabiti | Teknoloji (i18n) | `Y03` Adım 1 |
| 13 | Yazı boyutu ≥ 16 px | Platform | `Y03` Adım 3 |
| 14 | `localStorage` yalnız `util/storage.ts` | TIER 1 k.10 | bekçi taraması |
| 15 | `console` yalnız `import.meta.env.DEV` korumalı | Platform | bekçi taraması |
| 16 | Dokunmatik hedef ≥ 44 px | Platform | bekçi taraması |
| 17 | `base: './'` | Platform · `RISKS.md` R15 | bekçi taraması |
| 18 | Kule fiyatı tek adresten (`maliyet`) | `S117` · `M79` | bekçi taraması |

**Negatif doğrulama zorunlu** (`M0-T10`): kasten bir ihlal ekle, `guard`'ın
exit 1 verdiğini gör, geri al. Yapılmazsa bekçilerin çalıştığı bilinmiyor.

> ⚠️ **Bekçiler kanıt değil, ağ.** Hepsi düzenli ifade sezgiseli —
> özellikle kontrol 4 (`setText`), 12 (yalnız aksanlı Türkçe harf arıyor)
> ve 16 (parametreyle verilen ölçüyü çözemiyor). Her birinin kör noktası
> `guard-rules.mjs` içinde kendi başlığında **yazılı**. Negatif doğrulama
> bekçinin **ateşlendiğini** kanıtlar, **her ihlali yakaladığını** değil.
> Bir görev `guard` yeşil diye kural 7'ye uygun sayılmaz; asıl koruma
> görevin kendi kabul kriteri ve kod incelemesi. Bekçi yalnız sessiz
> gerilemeleri (regression) yakalar.

**Bekçisiz kalan kurallar** (bilerek): TIER 1 k.1 (denge verisi koda
gömülmez), k.4 (dinamik yol bulma), k.6 (erişilebilirlik), ESC/boşluk
duraklatma, ses biçimi, doku sayısı. Her biri ya düzenli ifadeyle
güvenilir taranamıyor ya da yanlış pozitif riski faydasını aşıyor —
bunlar görev kabul kriterlerine ve kod incelemesine bırakıldı.

### Taş sonu komutu

```bash
npm run typecheck && npm run test && npm run build && npm run guard
```

---

## 5. Test edilemeyen ama izlenmesi gerekenler

Bunlar ne otomatik ne elle test edilebilir; **ölçülüp raporlanır**:

| Ölçüm | Nerede | Neyi belirliyor |
|---|---|---|
| Yapı noktası başına kapsanan yol | M1 (`E7`) | Boss/Trol HP'si, Kısıt A/B'nin tamamı |
| Yol uzunluğu `L` | M1 | `research/01` §3: "hiçbir yerde yazmıyor" |
| 8 noktanın dolduğu dalga | M3 | Yükseltme mekaniğinin yaşanıp yaşanmadığı |
| İlk indirme boyutu | Her `build` | Poki 8 MB sınırı |
| Gerçek taş süresi | Her taş sonu | ROADMAP tahminlerinin kalibrasyonu |

Beşi de bir sayı üretir ve o sayı bir kararı besler. Raporlanmazsa karar
tahminle verilir.

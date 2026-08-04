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
| E4 | Font düşüşü | `fonts/` klasörünü boşalt | 2 sn içinde sistem serif'e düşüp devam ediyor | M0 |
| E5 | Alt klasör servisi | `npx serve dist -l 5000`, alt yoldan aç | Beyaz ekran yok (`base:'./'`) | M0 |
| E6 | Havuz sızıntısı | 10 dalga oyna, `activeCount` izle | Sabit kalıyor | M1 |
| E6b | **Dinleyici sızıntısı** | Sahneyi N kez yeniden başlat, `devHooks.shutdownListeners()` izle | **Sabit kalıyor** | M1 |
| E7 | Kapsama ölçümü | Geliştirme göstergesini oku | Ortalama ve `L` raporlanıyor | M1 |
| E8 | Karşı-oyun | §5 tablosundaki 7 senaryoyu dene | Her tehdidin cevabı işliyor | M4 |
| E9 | Uçan hattı | Hazırlık aşamasına bak | Kesikli altın hat görünüyor, ≥3 nokta kesiyor | M4 |
| E10 | Kışla 9 kuralı | Her kural için senaryo | Hepsi §4.4'teki gibi | M5 |
| E11 | Kışla sinerjisi | İki kışlayı aynı noktaya topla | Grup dövüşü çalışıyor | M5 |
| E12 | Efektsiz okunurluk | Ses ve efektleri kapat | Oyun **hâlâ okunur** | M6 |
| E13 | 640×360 okunurluk | Tarayıcıyı küçült | Tüm yazı okunur, motifler kaybolmuyor | M6 |
| E14 | Renk körlüğü | Gri tonlamalı ekran görüntüsü | Düşman tipleri **silüetten** ayrılıyor | M6 |
| E15 | `prefers-reduced-motion` | Sistemde aç | Varsayılanlar düşük geliyor | M6 |
| E16 | **Gizli sekme** | Gizli pencerede aç | `localStorage` istisnası **çökertmiyor** | M7 |
| E17 | Düşük uçlu cihaz | 4 GB RAM'li cihazda oyna | Akıcı (CrazyGames şartı) | M7 |
| E18 | Üç harita | Baştan sona oyna | Üçü de bitirilebiliyor | M7 |
| E19 | Üç kişi | 3 kişiye oynat | Nerede sıkıldıkları not edildi | M7 |

E16 ve E17 **portal kabul şartı** — atlanırsa yayın reddedilir
(`research/05` §1, §2).

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

`M0-T10`'da kurulur. Node ile yazılır ki PowerShell'de de çalışsın.

| # | Kontrol | Kural |
|---|---|---|
| 1 | Ham `delta` kullanımı (`GameClock` dışında) | TIER 1 k.8 |
| 2 | `: any` / `<any>` / `as any` | TIER 1 k.5 |
| 3 | `PreloadScene`'de ≥ 4 aşama fonksiyonu | ROADMAP M0 |
| 4 | Değişen metinde `setText` (`BitmapText` değilse) | TIER 1 k.7 |

**Negatif doğrulama zorunlu** (`M0-T10`): kasten bir ihlal ekle, `guard`'ın
exit 1 verdiğini gör, geri al. Yapılmazsa bekçilerin çalıştığı bilinmiyor.

> ⚠️ **Bekçiler kanıt değil, ağ.** Dördü de düzenli ifade sezgiseli —
> özellikle kontrol 4 (`setText`). Negatif doğrulama bekçinin
> **ateşlendiğini** kanıtlar, **her ihlali yakaladığını** değil.
> Bir görev `guard` yeşil diye kural 7'ye uygun sayılmaz; asıl koruma
> görevin kendi kabul kriteri ve kod incelemesi. Bekçi yalnız sessiz
> gerilemeleri (regression) yakalar.

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

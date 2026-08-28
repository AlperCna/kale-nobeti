# Y01 · `GameScene.ts` 1749 satır — "sahneler ince olur" kuralı tutmuyor

| | |
|---|---|
| **Tür** | Yapısal — mimari |
| **Önem** | Orta-yüksek. Bakım maliyeti, her yeni özellikte artıyor |
| **Emek** | **Büyük** — tek oturumda yapılmamalı |
| **Risk** | Orta — davranış değişmemeli, ama dokunulan yüzey geniş |
| **Dokunulan** | `src/scenes/GameScene.ts` → `src/fx/` altında 3 yeni dosya |
| **İlgili** | `CLAUDE.md` Mimari kuralları · Klasör yapısı |

---

## Bulgu

`CLAUDE.md` Mimari kuralları:

> Sahneler ince olur. Oyun mantığı `systems/` içinde yaşar.

`GameScene.ts` **1749 satır** — projedeki ikinci büyük dosyanın
(`balanceChecks.ts`, 490) **3,6 katı** ve tüm `src/` toplamının
(10.743 satır) **%16'sı**.

## Ölçüm

```
 1749  src/scenes/GameScene.ts      ← %16
  490  src/systems/balanceChecks.ts
  388  src/systems/BarracksSystem.ts
  342  src/data/maps.ts
  340  src/systems/waveSim.ts
  340  src/data/waves.ts
  336  src/scenes/HudScene.ts
  238  src/systems/ProjectileSystem.ts
  ...
10743  toplam (test dosyaları hariç, 72 dosya)
```

Ortalama dosya 149 satır. `GameScene` ortalamanın **11,7 katı**.

## Bu bir "büyük dosya" şikâyeti değil

Önemli olan satır sayısı değil, **dosyanın kaç ayrı işi yaptığı**.
`GameScene` bugün en az yedi ayrı sorumluluk taşıyor:

| Sorumluluk | Yaklaşık satır | Ait olduğu yer |
|---|---|---|
| Sahne kurulumu, havuzlar, sistem kablolama | ~280 (`280-530`) | ✅ burada doğru |
| Ana döngü (`update`) | ~30 (`539-570`) | ✅ burada doğru |
| Hasar/ölüm/etki işleme | ~60 (`574-632`) | ✅ burada doğru |
| **Kışla + toplanma noktası arayüzü** | ~140 (`633-830`) | ⚠️ sınırda |
| **Parçacık / ölüm / meteor / vinyet efektleri** | ~150 (`867-1020`) | ❌ `fx/Particles.ts` |
| **Harita çizimi, kesikli çizgi/çember, hover, kapsama katmanı** | ~190 (`1088-1198`, `1555-1623`) | ❌ `fx/MapRenderer.ts` |
| **Yapı/yükseltme/satış/kışla menüsü + hedefleme + kartuş** | ~350 (`1199-1513`) | ❌ `fx/BuildMenu.ts` |
| **Dev kancaları** | ~95 (`1624-1720`) | ❌ ayrı fonksiyon |

Son dört satır **~785 satır**, yani dosyanın **%45'i**.

## Plan bunu zaten öngörmüş

`CLAUDE.md` Klasör yapısı:

```
fx/    ScreenShake, HitStop, Particles, DamageText
```

`Particles.ts` **planda var, diskte yok**:

```
src/fx/  DamageText.ts  ScreenShake.ts  HitStop.ts  WaveTelegraph.ts
         HudReadout.ts  AbilityButtons.ts  SettingsPanel.ts
         ParchmentFrame.ts  SoundSystem.ts  numberFont.ts
         TowerInfoPanel.ts  GoldFlight.ts
```

`ScreenShake`, `HitStop`, `DamageText` üçü de plandaki gibi ayrılmış.
`Particles` ayrılmamış — `GameScene.#particleBurst`, `#olumEfekti`,
`#meteorEfekti`, `#vinyetNabzi` olarak içeride kalmış.

## Nasıl bu hâle geldi

Suçlu yok; bu **birikimin doğal sonucu**. Her kilometre taşı sınıfa
bir şey ekledi:

| Taş | Eklenen |
|---|---|
| M2 | kule menüsü, hover, menzil çemberi |
| M3 | ekonomi kablolama, satış menüsü |
| M4 | yükseltme dalları, hedefleme modu menüsü, bilgi paneli çağrısı |
| M5 | kışla menüsü, toplanma noktası sürükleme, asker havuzu |
| M6 | juice (parçacık, meteor efekti, vinyet), altın uçuşu |
| M7 | çok yollu hareket, uçan ipucu |

Hiçbiri tek başına "büyük" değildi. Toplamı 1749 satır.

## Neden şimdi

**1. En ucuz an şu an.** M7 bitti, yeni özellik akışı durdu. Bir sonraki
özellik (yeni kule ailesi, yeni harita, öğretici — bkz.
[Y09](Y09-ogretici-yok.md)) geldiğinde bölme işi o özelliğin de
üstünde yapılacak, yani daha pahalı.

**2. Bu oturumun kanıtı.** Çok girişli harita hatası
(`WaveGroup.spawnPoint` hiç tüketilmiyordu) tam da bu dosyanın
büyüklüğü yüzünden M7'den beri gizli kaldı: `moverFor` mantığı,
1749 satırın ortasında, gözden geçirilmesi zor bir yerdeydi.

**3. Test edilebilirlik.** `GameScene` testsiz (bkz.
[Y08](Y08-test-kapsami.md)) ve öyle kalması doğru — Phaser'a bağlı.
Ama içindeki menü mantığı (hangi butonlar hangi durumda çıkar) test
edilebilir bir karar ağacı ve bugün Phaser'a gömülü.

## Ne bölünmemeli

**Kurulum, `update()` ve hasar işleme `GameScene`'de kalmalı.**
Bunlar sahnenin **gerçek** işi: saatin sahibi, sistemlerin kablolandığı
yer, döngünün sırasının belirlendiği yer. `update()`'in satır sırası
(`GameScene.ts:546-558`) yorumlarla gerekçelendirilmiş bir tasarım
kararı ("Kışla, kulelerden **önce**") ve bölünmesi onu gizler.

Ayrıca: hiçbir şey `systems/`'e taşınmamalı. Bölünecek parçaların hepsi
**çalışma zamanında Phaser'a dokunuyor** — TIER 1 kural 11 onları
`scenes/` ya da `fx/`'te tutuyor. Hedef `fx/`.

## Önerilen sıra — üç ayrı sevk

Sıra, **riskin artan** ve **bağımlılığın azalan** düzeninde:

### 1. `fx/Particles.ts` — en kolay, en yalıtık

Taşınan: `#particleBurst`, `#olumEfekti`, `#meteorEfekti`, `#vinyetNabzi`
(`GameScene.ts:867-1020`, ~150 satır).

- Bağımlılıkları dar: `scene`, `settings.effectScale`, `enemyPool`
- Plan zaten bu dosyayı öngörüyor
- `#olumEfekti` havuza dokunuyor (`havuz.release(e)`) — havuz referansı
  kurucuya geçirilir
- **Risk düşük.** Çağrı yerleri sayılı ve hepsi `GameScene` içinde.

### 2. `fx/MapRenderer.ts` — orta

Taşınan: `#drawMap`, `#drawCoverageOverlay`, `#dashedLine`,
`#dashedCircle`, `#drawHover`, `#updateFlyerHint`
(`GameScene.ts:1088-1198`, `1555-1623`, ~190 satır).

- `#drawRally` de aday ama kışla durumuna bağlı — ilk turda bırakılabilir
- `#dashedCircle`/`#dashedLine` saf çizim yardımcıları, en temiz parça
- **Dikkat:** `GameScene.ts:672-680`'de `#drawRally()` hakkında
  "**BURADA ÇAĞRILMIYOR**" diye başlayan uzun bir yorum var — bir kez
  yanlış yapılmış ve gerekçesi yazılmış. Taşıma sırasında o yorumun
  koruduğu davranış korunmalı.

### 3. `fx/BuildMenu.ts` — en büyük, en riskli

Taşınan: `#openMenu`, `#openSellMenu`, `#openBarracksMenu`,
`#closeMenu`, `#menuButonu`, `#setTargetMode`, `#showCartouche`,
`#showInfoPanel` (`GameScene.ts:1199-1513`, ~350 satır).

- Geri çağrım tabanlı olmalı: `BuildMenu` "kule kur" demez,
  `onPlaceTower(spotIndex, def)` çağırır. Ekonomi ve yerleştirme
  `GameScene`'de kalır.
- **G03 ile birlikte planlanmalı** — G03 zaten bu koda arkalık panel
  ekliyor. İki işi ayrı ayrı yapmak aynı 350 satırı iki kez açmak demek.
- **Risk en yüksek**: menü, ekonomi/kule/kışla/hedefleme dört sistemle
  konuşuyor ve `dev` kancalarının yarısı buraya bağlı.

### Ek — dev kancaları

`#devKancalari` (~95 satır) sınıf gövdesinden çıkıp
`src/util/gameDevHooks.ts` gibi ayrı bir dosyaya alınabilir. Zaten
`import.meta.env.DEV` ile korunuyor ve üretimde siliniyor; ayrı dosyada
olması ölü kodun daha net ayrılmasını da sağlar.

## Doğrulama — her adım için aynı

Bu bir **davranış değiştirmeyen** yeniden düzenleme. Ölçüt: hiçbir şeyin
değişmemesi.

1. `npm run typecheck && npm run test && npm run build` — üçü de yeşil.
2. `npm run guard` — 10 kontrolün 10'u. Özellikle:
   - `k.11 saf mantıkta runtime Phaser yok` (yeni dosyalar `fx/`'te
     olduğu için serbest, ama yanlışlıkla `systems/`'e konursa kırılır)
   - `mim. sahne alanları create() içinde sıfırlanıyor`
3. **`docs/KURALLAR.md` diff'i boş olmalı.** Denge sayısı değiştiyse
   yeniden düzenleme sırasında mantık kaymıştır. (Bu oturumun dersi:
   testler üst sınır kontrol ediyor, eşitlik değil — tek güvenilir
   bekçi bu diff.)
4. `dev.shutdownListeners()` birikmiyor — sahne birkaç kez yeniden
   başlatılıp sayaç sabit kalmalı.
5. `dev.enemyCapacity()`, `dev.soldierCapacity()` sabit.
6. Elle tam tur: harita 1'i baştan sona oyna, kule kur/yükselt/sat,
   kışla kur, toplanma noktası sürükle, iki yeteneği de kullan,
   hedefleme modunu değiştir, duraklat, 2× hız, kaybet ve kazan.

## Bitmedi sayılır eğer

- `docs/KURALLAR.md` diff'i boş değilse.
- `npm run guard` bir kontrol kaybettiyse.
- Yeni dosyalardan biri `systems/`'e konduysa (kural 11).
- `GameScene.ts` hâlâ 1200 satırın üstündeyse (üç adım sonrası hedef
  ~950).
- Bir menü durumu (kışla T3 dalları, hedefleme seçili işareti)
  eskisinden farklı davranıyorsa.

## Sonuç — Adım 1 (2026-08-29)

**Yalnız Adım 1** ([fx/Particles.ts](../../../src/fx/Particles.ts))
uygulandı — planın kendi notu ("üç ayrı sevk") gereği Adım 2
(`MapRenderer.ts`) ve Adım 3 (`BuildMenu.ts`) **bilerek** bu oturuma
sıkıştırılmadı.

Taşınan: `#kurJuice` (parçacık dokusu + vinyet kurulumu),
`#particleBurst` → `patlat`, `#meteorEfekti` → `meteorEfekti`,
`#olumEfekti` → `olumEfekti`, `#vinyetNabzi` → `vinyetNabzi`.
`PARTICLE_MAX` sabiti de yeni dosyaya gitti. Bağımlılıklar dıştan
veriliyor (kurucu parametresi): `scene`, `settings`, `clock`,
`enemyPool`, `enemyHealthBars` (`G05`'in sistemi — `olumEfekti`
ikisine de dokunuyor). `GameScene`'in geri kalanını bilmiyor, planın
"bağımlılıkları dar" beklentisini karşılıyor.

`GameScene.ts`: **164 satır silindi, 16 satır eklendi** (net **-148**)
— planın ~150 satır tahminiyle hemen hemen birebir. Tek yeni alan
`#efektler?: Particles;`, tek yeni kurulum satırı `create()`'te.

### Doğrulama

`npm run typecheck && npm run test (727/727) && npm run guard (12/12)
&& npm run build` temiz. `docs/KURALLAR.md` diff'i **boş** — davranış
değişmeyen bir taşıma, beklenen.

Canlı doğrulama (gerçek oynanış, G05'te bulunan `forceSetTimeOut`
tekniğiyle): kule kurulup dalga başlatıldı — vuruşta parçacık patladı
(`dev.particleCount()` 20'ye çıktı), bir düşman öldü (altın arttı,
`olumEfekti`'nin havuza dönüş yolu çalıştı), Meteor yeteneği hatasız
çağrıldı (`meteorEfekti` çöküş üretmedi), oyun birden çok can kaybı
boyunca sorunsuz devam etti (`vinyetNabzi` her seferinde tetiklendi,
konsol sessiz). Dört metodun **hepsi** gerçek oynanışta en az bir kez
çalıştırılıp doğrulandı.

**Açık kalan (bu bölüm yazıldığında):** Adım 2 ve Adım 3 hâlâ
yapılmamıştı. Adım 2 aynı oturumda tamamlandı, aşağıda.

## Sonuç — Adım 2 (2026-08-29)

[fx/MapRenderer.ts](../../../src/fx/MapRenderer.ts) — taşınan:
`#drawMap`, `#drawCoverageOverlay`, `#drawHover`, `#updateFlyerHint`,
`#dashedLine`, `#dashedCircle`.

**Planın önerdiği gibi `#drawRally` taşınmadı** — kışla durumuna
(`#barracksBySpot`) bağlı, `GameScene`'de kaldı. Ama onun kullandığı
`dashedLine`/`dashedCircle` artık `MapRenderer`'ın **public** metotları
— tek kopya, iki çağıran (`MapRenderer`'ın kendisi ve `GameScene.#drawRally`).
Bu, planın öngörmediği ama gerekli küçük bir ek karardı: `dashedLine`/
`dashedCircle` taşınırken `#drawRally`'nin de çağrı yerlerini
güncellemesi gerekti (yalnız o iki satır, metodun geri kalanı dokunulmadı).

**Bir de kod tekrarı bulundu ve kapatıldı, planın öngörmediği bir
bonus:** `#ortalamaKapsama()` hem kapsama göstergesinde hem
`dev.coverageAverage` hook'unda kullanılıyordu; taşınırken iki sınıfa
dağılmaması için [util/coverage.ts](../../../src/util/coverage.ts)'e
`averageCoverage()` olarak çıkarıldı (üç yeni test eşliğinde) — artık
`MapRenderer` ve `GameScene` aynı fonksiyonu paylaşıyor.

`GameScene.ts`: **213 satır silindi, 14 satır eklendi** (net **-199**)
— planın ~190 satır tahmininin biraz üstünde (fazlası `#ortalamaKapsama`
+ ölü hâle gelen `#flyerHintOn` sıfırlama satırının da gitmesinden).
Toplam (Adım 1+2): **1751 → 1552 satır.**

### Doğrulama

`npm run typecheck && npm run test (730/730, +3 yeni) && npm run guard
(12/12) && npm run build` temiz. `docs/KURALLAR.md` diff'i **boş**.

Canlı doğrulama: harita çizildi (yol, yapı noktaları, kale — hepsi
doğru yerde), dev-only kapsama göstergesi doğru sayıları gösterdi
(`dev.coverageAverage()` HUD'daki "ort:" metniyle eşleşti), fareyle
yapı noktasının üstüne gelince kesikli menzil çemberi + kapsanan yol
vurgusu belirdi, kışla kurulup seçilince toplanma noktası işaretçisi
ve menzil çemberi (`#drawRally` → `MapRenderer.dashedCircle`/
`dashedLine` delegasyonu) doğru çizildi. Konsol sessiz.

**Açık kalan:** Adım 3 (`fx/BuildMenu.ts`, en büyük ve en riskli —
G03'ten sonra artık daha güvenli) hâlâ yapılmadı.

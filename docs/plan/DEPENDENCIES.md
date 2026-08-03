# Bağımlılık grafiği

Hangi sistem hangisi olmadan yazılamaz. `docs/ROADMAP.md` sırayı verir;
bu dosya sıranın **neden** o sıra olduğunu ve nerede esneyemeyeceğini söyler.

---

## Taş zinciri

```
M0 ──┬─► M1 ──┬─► M2 ──► M3 ──┬─► M4 ──► M5 ──► M6 ──► M7
     │        │              │
     │        └──────────────┘
     └──────────────────────────────────────────────────┘
        (GameClock + EventBus her taşta kullanılıyor)
```

Zincir doğrusal ama iki **geri ok** var — ikisi de gerçek risk:

- **M1 → M3.** Kapsama ölçümü M1'de çıkıyor, denge sağlamaları M3'te onu
  tüketiyor. M1'in çıktısı yanlışsa M3'ün tamamı yanlış temele oturuyor
  (`research/01-denge-matematigi.md` §4).
- **M0 → hepsi.** `GameClock` sözleşmesi M0'da kurulmazsa her sisteme
  sonradan dokunmak gerekiyor (`CLAUDE.md` TIER 1 kural 8).

---

## Sistem bağımlılıkları

| Sistem | Taş | Önkoşul sistemler | Neden |
|---|---|---|---|
| `GameClock` | M0 | — | Zaman bağımlı her şeyin tabanı |
| `EventBus` | M0 | — | Sistemler birbirini doğrudan çağırmıyor |
| `PathSystem` | M1 | `GameClock` | Hareket `scaledDelta` ile |
| `Enemy` + havuz | M1 | `PathSystem`, `GameClock` | |
| `util/coverage` | M1 | — (saf fonksiyon) | Haritadan bağımsız; erken yazılabilir |
| `TowerSystem` | M2 | `EventBus` | `tower:placed` |
| `TargetingSystem` | M2 | `PathSystem` | **Kaleye kalan mesafe** gerekiyor |
| `ProjectileSystem` | M2 | `GameClock`, havuz | |
| `combat.applyDamage` | M2 | — (saf fonksiyon) | |
| `EconomySystem` | M3 | `EventBus` | `gold:changed`, `enemy:killed` |
| `WaveManager` | M3 | `Enemy`, `GameClock` | |
| Denge sağlamaları | M3 | `coverage` (M1), `applyDamage` (M2), `referenceBoards` | Üçü de olmadan test yazılamaz |
| Bilgi paneli | M4 | `applyDamage` | "Bu düşmana karşı etkin DPS" |
| `BarracksSystem` | M5 | `PathSystem`, `Enemy` | Düşmanın yol ilerlemesini **durdurması** gerekiyor |
| `AbilitySystem` | M5 | `GameClock` | Bekleme süreleri |
| `fx/*` | M6 | `GameClock` | 2× hızda hit-stop kapanmalı |
| `SaveSystem` | M7 | `KeyValueStore` | Portal SDK adaptörü |

---

## Erken karar gerektiren çapraz bağlar

Bunlar tek bir taşa ait değil; **geç fark edilirse yeniden yazım** demek.

### 1. Çoklu giriş — `PathSystem`, M1'de çoğul olmalı

Harita 3'ün iki girişi var (`GAME-DESIGN.md` §9). `PathSystem` M1'de tek yol
varsayarak yazılırsa M7'de baştan yazılır.

**Karar M1'de:** `paths: Vec2[][]` en baştan çoğul; harita 1 tek elemanlı dizi
kullanır. Maliyeti neredeyse sıfır, sonradan açmanın maliyeti yüksek.

### 2. Uçan hareketi — `Enemy`, yola bağımlı olmamalı

Harpi yolu takip etmiyor, `flyerPaths` üzerinden düz gidiyor
(`GAME-DESIGN.md` §5). `Enemy` M1'de "yol üstünde ilerler" diye yazılırsa
M4'te uçan eklemek entity'yi yarıyor.

**Karar M1'de:** hareket stratejisi `Enemy`'den ayrık olsun
(`PathMover` / `LineMover`), harpi M4'te yalnız strateji değiştirsin.

### 3. Kaleye kalan mesafe — `first`/`last` bunun üstünde duruyor

`GAME-DESIGN.md` §4.5: hedefleme yol *ilerlemesine* değil **kalan mesafeye**
bakar; ayrık yolda yüzde karşılaştırılabilir değil.

**Karar M1'de:** `Enemy.remainingDistance` M1'de hesaplanıp saklanır,
M2'deki `TargetingSystem` onu tüketir. M2'de eklenmeye kalkılırsa
`PathSystem`'e geri dönmek gerekir.

### 4. Kapsama ölçümü — denge testlerinin tek girdisi

`util/coverage.ts` saf fonksiyon, hiçbir şeye bağlı değil, **M1'de yazılıyor**
ama tüketicisi M3. Aradaki iki taş boyunca kullanılmadan durması normal.

**Uyarı:** ölçüm sonucu şu an dokümanlar arasında çelişen bir varsayımı
çözecek (`research/01` §4). M1 bitmeden M3'ün denge sayıları
kesinleştirilemez.

### 5. Havuzlama sözleşmesi — M1'de kurulur, M2 ve M6 tüketir

`CLAUDE.md` TIER 1 kural 3: havuza dönen nesne **tüm durumunu sıfırlar**.
Sözleşme M1'de `Enemy` için yazılır; M2 mermileri, M6 parçacıkları aynı
sözleşmeye uyar. M1'de gevşek yazılırsa üç yerde ayrı sızıntı olur.

### 6. `BitmapText` — sayı fontu M6'ya kadar yok

TIER 1 kural 7 değişen metni `BitmapText` zorunlu kılıyor, ama bitmap font
üretimi M6'da. **M0'daki hız butonu bu kuralla ilk kez çarpışıyor.**
Çözüm kararı `OPEN-QUESTIONS.md` S07.

### 7. Kışla, `PathSystem`'in içine sızıyor

`BarracksSystem` (M5) düşmanın yol ilerlemesini durduruyor
(`GAME-DESIGN.md` §4.4 kural 2). `PathSystem` M1'de "her karede ilerle"
diye yazılırsa M5'te araya girecek yer yok.

**Karar M1'de:** `Enemy.blockedBy != null` iken ilerleme atlanır — alan M1'de
tanımlanır, kullanımı M5'te.

---

## Ne neyi bloke ediyor — özet

| Bloke eden | Bloke olan | Sonuç |
|---|---|---|
| Kapsama ölçümü (M1) | Boss/Trol HP'si, Kısıt A/B (M3) | Sayılar geçici kalıyor |
| `referenceBoards` tanımı (açık soru) | Kısıt A, Kısıt B, ekonomi sağlaması (M3) | Üç testin hiçbiri yazılamıyor |
| Bitmap font (M6) | Değişen her metin (M0'dan itibaren) | TIER 1 k.7 geçici çözüm gerektiriyor |
| Arcade fizik kararı (açık soru) | `GameClock` imzası (M0), mermi hareketi (M2) | M0'da verilmezse M2'de geri dönüş |
| Sanat yönü kararı (açık soru) | M6'nın tamamı | Greybox katmanı bu yüzden var |

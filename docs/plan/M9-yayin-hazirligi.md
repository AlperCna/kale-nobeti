# `M9` — Yayın hazırlığı ve geliştirme planı

> **Durum:** ☐ onay bekliyor. Araştırma yapıldı, kanıtlar aşağıda.

Bu plan tahminle değil **üç kaynaktan** çıktı: (1) projenin kendi
`ROADMAP.md` karar bölümü, (2) portal dokümanlarının bugünkü hâli,
(3) kod üzerinde yapılan tarama.

---

## Araştırmanın bulduğu şey

### 1. İki portal da SDK'yı ZORUNLU kılıyor — bizde yok

Poki ve CrazyGames dokümanları (Eylül 2026) `gameplayStart()` /
`gameplayStop()` çağrılarını **zorunlu** sayıyor. Kodda arama:
`PokiSDK`, `CrazyGames`, `gameplayStart` → **sıfır sonuç**.

Bu bir cila maddesi değil, **başvuru engeli**. `report-size.mjs`'in
"SDK'sız (S61)" notu bunu zaten söylüyordu ama madde hiç açılmamıştı.

Ayrıca `GAME-DESIGN.md` §12'nin son satırı: *"Reklam oynarken ses
kısılır (Poki şartı)"* — yazılı, **yapılmamış** (kodda `commercialBreak`
ya da reklam sırasında `mute` yok).

### 2. `ROADMAP`'in karar döngüsü ölçüm olmadan çalışmıyor

`ROADMAP.md` "v1 sonrası — karar noktası" bölümü net: hangi içeriğin
ekleneceğine **veri** karar verecek, tahmin değil. Teşhis matrisi beş
sinyal istiyor ve üçü bizim kendi olayımızdan gelmeli:

| Metrik | Kaynak | Bizde |
|---|---|---|
| Ortalama oturum süresi | portal paneli | SDK gelince ✓ |
| Dönüş oranı | portal paneli | SDK gelince ✓ |
| Harita başına tamamlama | **kendi olayımız** | **yok** |
| Nerede bırakıyorlar | **kendi olayımız** | **yok** |
| Yıldız dağılımı | kayıttan | var, gönderilmiyor |

`ROADMAP` bunu `M7`'ye koymuştu ve atlandı. **Bu ölçüm olmadan yayına
girmek, dönen veriyi okuyamamak demek** — ve o veri bir hafta sonra
hangi işi yapacağımızı söyleyecek olan şey.

### 3. Kapsam dışı listesi bayat

`GAME-DESIGN.md` §13 hâlâ "sonsuz mod, başarımlar" diyor — ikisi de
`M8`'de eklendi. Liste güncellenmeli, yoksa bir sonraki okuyan yanlış
karar verir.

### 4. Kodda bulunan iki somut eksik

- **Hız yalnız `1 | 2`.** (`types/common.ts:19`) Türün alışıldık
  beklentisi 3×'tir; 50 dalgalık bir kampanyada tekrar oynanabilirliği
  doğrudan etkiliyor.
- **Kule satışında onay yok.** Tek yanlış tıklama kuleyi satıyor
  (%70 iade var, yani yıkıcı değil ama sinir bozucu).

---

## Faz sırası

Sıralama ilkesi: **önce engeli kaldır, sonra ölçümü kur, sonra veri
gelsin, sonra içerik.** `ROADMAP`'in kendi kuralı bu ve "en sık hata"
diye yazdığı şey tersini yapmak.

### Faz 1 — Portal SDK katmanı *(yayın engeli)*

**Emek:** 1-1,5 gün · **Risk:** düşük · **Engel mi:** evet

Tek arayüz arkasında iki portal:

```
src/systems/Portal.ts     — arayüz + no-op varsayılan
src/systems/portal/poki.ts
src/systems/portal/crazy.ts
```

- `gameplayStart()` — oyuncunun **ilk etkileşiminde** (harita açılışında
  değil; `GameScene`'in ilk `pointerdown`'ı)
- `gameplayStop()` — duraklatma, ayar paneli, seviye bitişi, menüye dönüş
- `commercialBreak()` — **yalnız** duraklamadan oyuna dönerken
- Reklam sırasında `sound.mute = true`, bitince eski değere dön

**Kritik tasarım kuralı:** SDK yoksa katman **sessizce no-op**. itch.io
sürümü aynı kodla çalışmalı; `KeyValueStore` deseninin aynısı.

**Doğrulama:** olayların çift tetiklenmediği ölçülür (Poki şartı:
"olaylar arka arkaya veya çift tetiklenemez") — sayaçla, gözle değil.

### Faz 2 — Olay sayacı *(karar döngüsünün ön şartı)*

**Emek:** 0,5 gün · **Risk:** düşük · **Engel mi:** hayır ama **kör
yayına girmemek için şart**

`ROADMAP`'in teşhis matrisinin istediği üç olay:

| Olay | Ne zaman | Alan |
|---|---|---|
| `harita:basladi` | harita açılınca | `mapId`, `zorluk` |
| `harita:bitti` | kazanma/kaybetme | `mapId`, `kazandi`, `dalga`, `kalanCan` |
| `dalga:bitti` | her dalga | `mapId`, `dalga` |

Portal SDK'sı bir olay kanalı veriyorsa oraya; vermiyorsa `localStorage`
histogramı + oyuncunun görebileceği bir özet. **Kendi sunucumuz yok ve
olmayacak** (`ROADMAP`: sıralama/çoklu oyuncu kategori değişimi).

### Faz 3 — Küratörlük cilası *(Poki elle inceliyor)*

**Emek:** 1 gün · **Risk:** düşük

`research/05`: *"İncelemede esas olarak UX/his ve çekirdek oyun
döngüsüne bakılıyor. Yani cila ve his, içerik miktarından önemli."*

1. **3× hız.** `Speed` tipini `1 | 2 | 3` yap. `GameClock` sözleşmesi
   zaten ölçek alıyor; iş tip + düğme + `KURALLAR.md` yeniden üretimi.
   **Denge etkisi ölçülmeli:** 2×'te sonuç değişmiyordu (ölçüldü), 3×'te
   de değişmediği aynı yöntemle doğrulanmalı.
2. **Satışta onay.** Tek tık yerine "Sat +49" → ikinci tık onayı, ya da
   basılı tutma. Ucuz, geri döndürülemez eylemi korur.
3. **Kayıt uyarısı.** `research/05`: *"İlerlemenin kaydedilmediği
   durumlarda oyuncuyu açıkça bilgilendirin."* `SAVE_FAILED_REGISTRY_KEY`
   var; gösterildiğini **doğrulamadım**, edilecek.

### Faz 4 — Doküman tazeleme

**Emek:** 0,5 gün

- `GAME-DESIGN.md` §13: sonsuz mod ve başarımlar listeden çıkar
- `ROADMAP.md`: M8'in gerçekte ne yaptığı + M9'un yeri
- `RISKS.md` R8 (Poki küratörlüğü): SDK maddesi eklenir

### Faz 5 — YAYINLA, sonra bekle

`ROADMAP`: *"En az bir hafta veri biriktir — daha erken bakmak gürültü
okumak."*

### Faz 6 — İçerik *(yönü VERİ seçer)*

Şimdiden karar **verilmiyor**. Teşhis matrisi:

| Tamamlama | Oturum | Dönüş | Yön |
|---|---|---|---|
| Yüksek | Kısa | — | **6. harita** (en ucuz içerik kolu, 2-3 gün) |
| Düşük, harita 1'de bırakıyor | Kısa | — | Öğretici/denge — **içerik ekleme** |
| Düşük, son haritada | Uzun | — | Dalga 8-10 dengesi |
| Yüksek | Uzun | Düşük | Meta ilerleme ⚠️ ya da sonsuz modu öne çıkar |
| Düşük | Uzun | Yüksek | Ekonomi |

⚠️ **Meta yükseltme ağacı uyarısı** (`ROADMAP`): Kısıt A/B ve ekonomi
sağlamaları `referenceBoards.ts`'e dayanıyor. Kalıcı yükseltme referans
tahtayı dalgaya değil **oyuncunun geçmişine** bağlar ve üç denge testi de
yeniden yazılır. Ucuz görünüp pahalı olan madde bu.

---

## Bu planın YAPMADIĞI şeyler

Dürüstlük için: aşağıdakiler bilerek dışarıda.

- **Kahraman birimi** (2-3 hafta), **harita editörü** (2-3 hafta),
  **çoklu oyuncu** (aylar, sunucu) — `ROADMAP`'in maliyet tablosu.
- **Günlük sıralama** — sunucu gerektiriyor, "statik dosya portala
  yüklenir" modelini kırıyor.
- **Yeni harita** — Faz 6'ya bağlı, veri söylemeden yapılmıyor.

---

## Toplam

| Faz | Emek | Engel mi | Durum |
|---|---|---|---|
| 1 · Portal SDK | 1-1,5 gün | **evet** | ✅ `dd7bd13` |
| 2 · Olay sayacı | 0,5 gün | kör yayına girmemek için | ✅ `b0325ea` |
| 3 · Küratörlük cilası | 1 gün | hayır | ✅ `51e14a2` |
| 4 · Doküman | 0,5 gün | hayır | ✅ |
| **Yayına kadar** | **~3,5 gün** | | **kod tarafı bitti** |
| 5 · Bir hafta veri | — | | **sahibin işi** |
| 6 · İçerik | veriye göre | | 5 bitmeden başlamaz |

## Uygulamada ne değişti

Planın öngörmediği ama uygulanırken çıkan üç şey — plan yanlış değildi,
eksikti:

1. **Faz 3'ün 3× maddesi iki gizli kusuru açığa çıkardı.** `HitStop` ve
   `Particles` ikisi de `speed === 2` yazıyordu; 3× eklenince kural
   **tersine dönüyordu** (en okunmaz hızda hit-stop geri geliyor,
   parçacık tam yoğunluğa çıkıyordu). Sabit karşılaştırma yerine
   `speed > 1` / hızın kendisi.
2. **Faz 3'ün kayıt uyarısı maddesi yalnız "doğrulanacak" diyordu;
   doğrulama uyarının hiç gösterilmediğini buldu.** `save:failed`
   olayının dinleyicisi yoktu ve bildirim ilk başarısız *yazmaya*
   bağlıydı — oysa `LocalStore` kurucuda zaten biliyor. İki düzeltme
   birden gerekti (`fx/SaveWarning.ts` + `LocalStore` kurucusu).
3. **Satış onayını yazarken bilgi panelinde bir yalan bulundu:** T2 kule
   seçilince "Son kademe" yazıyordu, oysa menü tam o sırada iki T3 dalı
   gösteriyor. Yeni "Dal seçimi" etiketi.

Üçü de aynı desenin örneği: **kodu doğrulamak, kodu okumaktan farklı
şey buluyor.**

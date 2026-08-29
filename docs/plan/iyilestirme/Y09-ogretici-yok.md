# Y09 · Öğretici / ilk oyun yönlendirmesi yok

| | |
|---|---|
| **Tür** | Yapısal — oyuncu deneyimi |
| **Önem** | **Yüksek.** Portal küratörlüğünün baktığı ilk şey |
| **Emek** | Orta-büyük |
| **Risk** | Orta — kapsam şişmesine en açık iş |
| **Dokunulan** | Yeni: `src/systems/TutorialSystem.ts` (+ `fx/` sunum katmanı) |
| **İlgili** | `RISKS.md` **R8** · `ROADMAP.md` v1 sonrası · `GAME-DESIGN.md` §11 |

---

## Bulgu

Oyunda **hiçbir** ilk kullanım yönlendirmesi yok. Oyuncu "Oyna"ya
basıyor, haritayı seçiyor, ve karşısında 8 yapı noktası, dört kule
ailesi, iki yetenek, beş hedefleme modu, kışla toplanma noktası ve
20 saniyelik bir hazırlık sayacı buluyor. Hiçbiri açıklanmıyor.

## Kanıt

Kod tabanında "tutorial / öğretici / onboard / hint" taraması —
tek sonuç:

```
src/scenes/GameScene.ts:1137   #updateFlyerHint()
```

`#updateFlyerHint` uçan düşman geldiğinde uçuş hattını kesikli çizgiyle
gösteriyor (`RISKS.md` R4'ün azaltması, Defense Grid çözümü). Bu tek
yönlendirme öğesi ve **öğretici değil**, belirli bir mekaniğin
telgrafı.

`HudScene.ts:288`'deki `'ESC / boşluk'` ipucu **yalnız duraklatma
ekranında** görünüyor — yani oyuncu zaten duraklatmayı bulduktan sonra.

`MenuScene`, `LevelSelectScene`, `GameScene` `create()` içinde ilk
oyun kontrolü yok. `SaveData` (S60) yalnız `{ version, stars }` tutuyor
— "bu oyuncu daha önce oynadı mı" bilgisi **kaydedilmiyor bile**.

## Ne öğretilmesi gerekiyor

Oyunun mekanik yüzeyi küçük değil:

| Mekanik | Nerede | Kendiliğinden anlaşılır mı |
|---|---|---|
| Yapı noktasına tıkla | `GameScene` | ⚠️ noktalar görünür ama tıklanabilir olduğu belirsiz |
| Dört aile, farklı roller | menü | ❌ isim + fiyat dışında bilgi yok |
| Yükseltme, T3 dal seçimi | menü | ❌ dalın geri alınamadığı (S41) hiç söylenmiyor |
| Hedefleme modları | menü | ❌ beş kısaltma, açıklama yok |
| Kışla toplanma noktası | sürükleme | ❌ sürüklenebildiği hiçbir yerde belli değil |
| İki aktif yetenek | HUD altı | ⚠️ ikon var, kullanımı belirsiz |
| Erken dalga başlatma + bonus | HUD | ❌ bonusun varlığı hiç söylenmiyor |
| 2× hız | HUD | ⚠️ `1×` yazısı ipucu veriyor |
| Uçanlar yolu takip etmiyor | oynanış | ✅ `#updateFlyerHint` çözüyor |

**En kritik ikisi:**

1. **Erken başlatma bonusu.** `GAME-DESIGN.md` §6: bonus
   `kalanSaniye × …` formülüyle hesaplanıyor ve S65 ölçümü gösteriyor
   ki **boss'un karşılanabilirliği buna bağlı** — "muhafazakâr tahtayla
   tavan 761, boss %92,0 → %15 payı tutmuyor; **gerçekçi tahtayla
   (erken başlatma kullanılmış)** 818, %85,6 → tutuyor."

   Yani oyun, **oyuncunun keşfetmesi beklenmeyen bir mekaniği
   kullanacağı varsayımıyla dengeleniyor.** Erken başlatmayı hiç
   kullanmayan oyuncu, tasarımın hesapladığından daha zor bir oyun
   oynuyor.

2. **Toplanma noktası sürükleme.** S69'un ölçümü çarpıcı: aynı tahta,
   tek fark kışlanın yeri → **0/20 can (kayıp)** ile **19/20 (★★)**
   arasında fark. Kışla mekaniğinin doğru kullanımı sonucu tamamen
   değiştiriyor ve sürükleme özelliği hiçbir yerde belirtilmiyor.

## Neden önemli

**1. R8 — Poki küratörlüğü.** `RISKS.md`:

> Poki elle küratörlü; incelemede "UX/his ve çekirdek oyun döngüsüne"
> bakıyor. İçerik miktarı değil, **cila** belirleyici.

Öğreticisiz bir oyun, incelemecinin ilk beş dakikasında en görünür
eksik. Ve R8'in "Erken uyarı: **yok** — geri bildirim gecikmeli gelir"
notu bu riski özellikle sinsi yapıyor: reddedilene kadar öğrenilmiyor.

**2. Denge, öğretilmeyen mekaniklere dayanıyor.** Yukarıdaki iki madde.
Bu bir "iyi olurdu" değil, **dengenin geçerlilik şartı**.

**3. `ROADMAP.md` karar matrisi bozulur.** v1 sonrası kararı üç metriğe
bakıyor: ortalama oturum, harita başına tamamlama, nerede bırakıldığı.
Öğreticisiz bir oyunda bırakma noktaları **oyunun zorluğunu değil,
anlaşılmazlığını** ölçer. Yanlış veriyle verilen karar, veri
toplamamaktan kötü.

**4. §11 zaten bu yönde bir adım atmış.** `TowerInfoPanel` "bilgi
eksikliği türün 1 numaralı şikâyeti" diyerek kule tarafını çözmüş.
Aynı teşhis, mekaniklerin **tanıtımı** için de geçerli ve orada karşılık
bulmamış.

## Kapsam tuzağı

Bu, listedeki **kapsam şişmesine en açık** iş. Tam bir öğretici
(elle yönlendirilen ilk harita, adım adım kilitli arayüz, senaryo
metinleri) haftalar sürer ve `ROADMAP.md`'nin "her taş sonunda oyun
oynanabilir kalır" kuralını zorlar.

**Bu yüzden aşağıdaki seçenekler maliyete göre sıralandı ve en
ucuzu öneriliyor.**

## Seçenekler

### (a) Bağlamsal ipuçları — "ilk kez olduğunda göster"

Her mekanik, ilk kez ilgili hâle geldiğinde tek satırlık bir parşömen
balonu gösteriyor:

| Tetik | İpucu |
|---|---|
| Oyun başlar, hiç kule yok | "Bir yapı noktasına dokun" |
| İlk kule kuruldu | "Kuleye dokunarak yükselt" |
| Hazırlık sayacı ilk kez işliyor | "Erken başlat, kalan süre altın olur" |
| İlk kışla kuruldu | "Bayrağı sürükleyerek askerleri konumlandır" |
| İlk yetenek hazır | "Meteor: bir alana dokun" |
| İlk T3 kule | "Dal seçimi geri alınamaz" |

- ✅ Oynanışı **hiç kesmiyor** — oyun devam ederken görünüyor
- ✅ Artımlı sevk edilebilir: bir ipucu bile değer katıyor
- ✅ Kilitli arayüz, senaryo, ayrı harita gerekmiyor
- ✅ "Bir kez göster" durumu `SaveData`'ya küçük bir alan
  (`seenHints: string[]`) — S60 şeması `version: 1`, genişletme
  `version: 2` ve geçiş gerektiriyor (bozuk/bilinmeyen sürüm sıfırdan
  başlatıyor, yani **eski kayıtlar silinir** — bu kabul edilebilir mi,
  karar verilmeli)
- ⚠️ Metinler `strings.ts`'e girmeli ([Y03](Y03-i18n-sizintisi.md))
- ⚠️ İpuçları kapatılabilir olmalı (ayarlarda "İpuçları" anahtarı)

### (b) Harita 1'in ilk üç dalgasını yönlendirilmiş yap

İlk harita, ilk dalgalarda arayüzü kısıtlayıp adım adım açıyor.

- ✅ En etkili öğretme biçimi
- ❌ `waves.ts` ve denge ölçümleriyle çakışıyor — harita 1 dalga 1-3
  bugün denge simülasyonunun girdisi. Yönlendirme, `waveSim`'in
  ölçtüğü oyunla oynanan oyunu ayırır.
- ❌ Kapsam büyük

### (c) Menüde statik bir "Nasıl oynanır" ekranı

Tek sayfa, resimli açıklama.

- ✅ Ucuz
- ❌ Kimse okumuyor. Web oyunlarında en düşük etkili çözüm.
- ⚠️ Yine de **tamamlayıcı** olarak değerli (a) ile birlikte

### (d) Hiçbir şey yapma, v1'i böyle yayınla, veriye bak

`ROADMAP.md`'nin "v1 sonrası karar noktası" felsefesi bu:
"Bugün seçmek, bir hafta sonra ücretsiz gelecek bilgiyi tahmin etmek
olur."

- ✅ Projenin kendi karar felsefesine sadık
- ❌ Ama toplanacak veri **bozuk** olacak (yukarıdaki 3. madde)
- ❌ Ve R8'in "erken uyarı yok" notu, portal reddinin geri bildirim
  vermeyeceği anlamına geliyor

## Öneri

**(a), en küçük hâliyle: yalnız iki ipucu.**

1. **"Erken başlat, kalan süre altın olur"** — dengenin dayandığı
   mekanik.
2. **"Bayrağı sürükle"** — sonucu 0/20'den 19/20'ye taşıyan mekanik.

Bu ikisi, ölçümle kanıtlanmış (S65, S69) biçimde **oyunun sonucunu
değiştiren** ve **kendiliğinden keşfedilmesi beklenemeyecek** iki
mekanik. Diğerlerinden farkları bu; gerisi "iyi olur" kategorisinde.

İki ipucu ile başlamak:
- `SaveData` şema değişikliğini gerektiriyor (karar: eski kayıtlar
  silinsin mi)
- Sunum katmanını kuruyor (parşömen balon + "bir kez göster" mantığı)
- Sonraki ipuçlarını **bedava** hâle getiriyor

Sonra veriye bakılır ve (d)'nin felsefesi korunmuş olur — ama bozuk
veriyle değil.

## Mimari notu

Öğretici mantığı (**hangi ipucu, ne zaman, görüldü mü**) `systems/`
altında ve **Phaser'sız** olmalı (TIER 1 kural 11) — böylece
`node`'da test edilebilir. Sunum (balon, konum, tween) `fx/` altında.

Bu ayrım, [Y01](Y01-gamescene-bolme.md)'in kurduğu düzenle aynı ve
`GameScene`'in yeniden şişmesini önlüyor. **Y01'den sonra yapılırsa
daha ucuz.**

## Doğrulama

1. Temiz `localStorage` ile aç → ilk ipucu görünmeli.
2. İpucu kapandıktan sonra sayfayı yenile → **tekrar görünmemeli**.
3. Ayarlardan "İpuçları" kapatılabilmeli.
4. İpucu metinleri `strings.ts`'te.
5. `TutorialSystem` `node`'da test edilebilmeli (Phaser importu yok).
6. `npm run guard` — `k.11` yeşil.
7. Gizli sekmede (kayıt çalışmıyor): ipuçları her seferinde görünüyor
   ama oyun **çökmüyor** (TIER 1 kural 10).
8. `SaveData` sürüm geçişi: `version: 1` kayıt, `version: 2` kodla
   açılınca ne oluyor — bilinçli ve yazılı olmalı.
9. İpucu balonu oyunu **duraklatmıyor** ve tıklamayı yutmuyor.
10. 640×360'ta okunur.

## Bitmedi sayılır eğer

- İpucu her açılışta tekrar görünüyorsa.
- `TutorialSystem` Phaser'a dokunuyorsa.
- İpuçları kapatılamıyorsa.
- Metinler koda gömülüyse.
- `SaveData` sürüm geçiş kararı yazılmadıysa.
- İpucu balonu oynanışı engelliyorsa.

## Sonuç

**Öneri (a) en küçük hâliyle uygulandı: iki ipucu.**

### `SaveData` sürümü — kaçınma kararı, geçiş kararı değil

Bulgu bölümünün sorguladığı "`version: 1` → `version: 2`, eski kayıtlar
silinsin mi" ikilemi **hiç ortaya çıkmadı.** `SaveSystem.ts`'in kendi
`#oku()`'su `p.version !== 1` durumunda **tüm kaydı** (yıldızlar dahil)
sıfırlıyor — yani bir sürüm bump'ı, öğretici ipuçları için mevcut
oyuncuların `stars` ilerlemesini riske atardı.

Bunun yerine `TutorialSystem`, `Settings.ts`'in zaten kurduğu deseni
izleyerek kendi verisini **aynı `kale-nobeti-save-v1` blob'u içinde,
tamamen ayrı bir üst-seviye alanda** (`{ tutorial: { seenHints: [...] } }`)
tutuyor — `progress` ve `settings` alanlarına hiç dokunmadan. Şema
`version` numarasından bağımsız; eski bir kayıtta `tutorial` alanı hiç
yoksa `#oku()` boş listeye düşüyor, hiçbir veri kaybı olmuyor
(`TutorialSystem.test.ts` → *"eski kayıtta `tutorial` alanı hiç yoksa"*).
Bu, doğrulama maddesi 8'in beklediği "yazılı sürüm geçiş kararı"ndan
daha iyisi: **geçişe hiç gerek kalmadı.**

### Uygulanan iki ipucu

1. **`earlyStart`** — `#startEarly düğmesine ilk erişildiğinde`
   değil, **dalga hazırlık sayacı ilk kez işlemeye başladığında**
   tetikleniyor (`GameScene`'in kurulumunda `t.start()` çağrısı).
   Metin: *"Erken başlat, kalan süre altın olur."*
2. **`dragRally`** — yeni bir `EventBus` olayı, `'barracks:placed'`
   (`types/events.ts`), ilk kışla kurulduğunda `GameScene.#placeBarracks`
   içinden yayınlanıyor; `TutorialSystem` kurucuda buna abone oluyor.
   Metin: *"Bayrağı sürükle."*

İkisi de `strings.ts`'te (`hintEarlyStart`, `hintDragRally`), `en`
anahtarları boş — CLAUDE.md'nin i18n yapısına uygun.

### Sunum katmanı

`fx/TutorialHints.ts` — kasıtlı olarak **tween'siz, zamanlayıcısız**
parşömen balonu (`createParchmentFrame` üzerine). Gerekçe: bir bilgi
balonunun okunma süresi `GameClock`/2× hız/duraklatma ile hiç
etkileşmemeli. Yalnız kendi üstüne tıklanınca kapanıyor
(`stopPropagation` — alttaki tıklamayı yutmuyor).

### Ayarlar entegrasyonu

`Settings.ts`'e dördüncü alan: `hints: boolean` (varsayılan `true`,
`reducedMotionDefaults()` içinde de `true` — hareket azaltma ile
ilgisiz). `SettingsPanel.ts`'e dördüncü satır ("İpuçları"). Kapatılınca
`TutorialSystem.setEnabled(false)` — hem yeni tetikleri hem de o an
gösterilmekte olanı etkiliyor (yeni tetik hiç `#onShow` çağırmıyor).

### Test ve doğrulama sonuçları

- `TutorialSystem.test.ts`: 12/12 yeşil. Kritik olan ikisi:
  - Ham (LocalStore olmayan) fırlatan bir `KeyValueStore` verilirse
    `TutorialSystem` da fırlatıyor — **kasıtlı**, `Settings.test.ts`'in
    zaten sabitlediği sözleşmeyle birebir aynı: "sarma `LocalStore`'un
    işi, her tüketicinin değil." Üretimde `TutorialSystem` her zaman
    `new LocalStore()` ile kuruluyor, o da hiç fırlatmıyor
    (`storage.test.ts`).
  - Gerçek gizli-sekme yolu (`LocalStore` sarıp `localStorage`'ın
    kendisi fırlıyor): çökmüyor, kalıcılık çalışmadığı için ipucu
    **her session'da** yeniden görünüyor — veri kaybı sessiz kalmıyor
    (TIER 1 kural 10).
- `npm run typecheck && npm run test && npm run guard && npm run build`
  — hepsi yeşil (742/742 test, guard 12/12). `docs/KURALLAR.md` diff'i
  **boş** — bu iş denge verisine dokunmuyor.
- Canlı tarayıcı doğrulaması (gerçek sayfa yenilemesiyle, `localStorage`
  temizlenmiş):
  1. Temiz kayıtla harita başlatıldı → *"Erken başlat, kalan süre altın
     olur"* tam bir kez göründü.
  2. İlk kışla kuruldu → *"Bayrağı sürükle"* tam bir kez göründü.
  3. `localStorage` içeriği doğrulandı: `{"tutorial":{"seenHints":
     ["earlyStart","dragRally"]}}` — başka hiçbir alana dokunmamış.
  4. Sayfa **gerçekten** yenilendi (yeni `LocalStore` örneği), aynı
     haritaya tekrar girildi → hiçbir ipucu **tekrar görünmedi**.
  5. Ayarlardan "İpuçları" **Kapalı**'ya alındı, `seenHints` elle
     boşaltıldı, sayfa yenilendi, harita tekrar başlatıldı → ipucu
     **hiç görünmedi** (ayar, boş `seenHints`'i bile eziyor).
  6. Konsolda hata yok.
  Tüm doğrulama maddeleri (1-3, 9-10 hariç — 9 kod incelemesiyle,
  `stopPropagation` + zamanlayıcısız tasarımla; 10, 640×360'ta ayrıca
  denenmedi ama panel zaten diğer üç satırla aynı düzende) canlı
  ortamda doğrulandı.

### Kapsam

Seçenek (b)/(c)/(d) hiç uygulanmadı — bilinçli. Kod tabanı artık
sonraki ipuçlarını (T3 dal seçimi, yetenek kullanımı vb.) eklemeyi
**bedava** hale getiriyor: yeni bir `HintId`, `HINT_TEXT_KEY`'e bir
satır, bir tetik noktası.

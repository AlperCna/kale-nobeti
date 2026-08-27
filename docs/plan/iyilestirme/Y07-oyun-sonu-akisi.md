# Y07 · Oyun sonunda "tekrar dene" ve "sonraki harita" yok — ☑ **düzeltildi (2026-08-28)**

| | |
|---|---|
| **Tür** | Yapısal — akış / UX |
| **Önem** | Yüksek. Kaybetmenin bedeli, kaybetmenin kendisinden fazlaydı |
| **Emek** | Küçük-orta (gerçekleşen) |
| **Risk** | Düşük — doğrulandı |
| **Dokunulan** | `src/scenes/GameOverScene.ts`, `src/data/strings.ts` |
| **İlgili** | `ROADMAP.md` v1 sonrası karar noktası · `RISKS.md` R8 |

---

## Sonuç (2026-08-28)

**Düzeltildi, seçenek (b) uygulandı** (duruma göre üç buton), ek olarak
Öneri'nin iki maddesi de uygulandı.

Birincil eylem **boyutla** ayrışıyor (260×64 vs 220×56) — **renkle
değil**: altın metin parşömen zeminde okunmuyor, `G02`'de düzeltilen
kontrast hatasının aynısını burada tekrarlamamak için ölçek tercih
edildi (doc'un "daha büyük ya da altın dolgulu" seçeneğinden ilki).
`Enter` tuşu birincil eylemi tetikliyor — `HudScene`'in ESC/boşluk
deseniyle aynı güvence (`KeyboardPlugin.shutdown()` sahne kapanınca
kendi dinleyicilerini temizliyor, sızıntı yok).

İki yeni metin `strings.ts`'e eklendi (`retry`, `nextMap`) — koda
gömülmedi.

### Canlı doğrulama

| Senaryo | Butonlar | Sonuç |
|---|---|---|
| Kaybedildi (7/20) | Tekrar dene (260×64) · Ana menü (220×56) | ✅ |
| Kazanıldı, sonraki harita var (18/20, ★★) | Sonraki harita (260×64) · Tekrar dene · Ana menü | ✅ |
| Kazanıldı, son harita (20/20, ★★★) | Tekrar dene · Ana menü (ikisi eşit boy) | ✅ "Sonraki harita" doğru şekilde yok |
| `Enter` → Tekrar dene | Oyun sıfırdan başlıyor | ✅ `gold:280, lives:20, wave:1, towerCount:0` |
| `Enter` → Sonraki harita | Doğru haritaya geçiyor | ✅ `mapId: 'tas-kopru'` (harita 1'den sonraki) |
| 5 art arda "Tekrar dene" | `shutdownListeners` sabit | ✅ `13→13`, `clearCount` doğru artıyor (`0→5`) |

`npm run typecheck/test (698/698)/guard (10/10)` yeşil.
`docs/KURALLAR.md` diff'i boş (salt akış/UI).

**Not — ekran görüntüsü yine alınamadı** (Browser pane sorunu bu
oturumda da sürdü). Doğrulama sahne grafiği üzerinden (buton sayısı,
panel boyutları, yazı içerikleri, `Enter` tuşu emülasyonu) yapıldı.

---

---

## Bulgu

Harita bitince — kazanılsın ya da kaybedilsin — ekranda **tek bir buton**
var: "Ana menü". Oyuncu tekrar denemek isterse üç adım atmak zorunda:
Ana menü → Seviye Seç → haritaya tıkla.

## Kanıt

```ts
// src/scenes/GameOverScene.ts:83
this.#menuButonu(width / 2, height / 2 + 100);
```

Tek çağrı. `#menuButonu` (`104-121`) tek bir buton kuruyor:

```ts
cerceve.on('pointerup', () => {
  this.scene.stop('Hud');
  this.scene.stop('Game');
  this.scene.start('LevelSelect');
});
```

Sahnede başka etkileşimli öğe yok. `create()`'in tamamı: karartma,
başlık, kalan can, yıldızlar, tek buton.

## Neden önemli

**1. Kaybetmek zaten cezalandırıcı; navigasyon ikinci ceza.** Tower
defense'te kaybetmek olağan ve beklenen bir sonuç — `docs/research/03`
türün döngüsünü böyle tanımlıyor: dene, kaybet, tahtayı değiştir, tekrar
dene. Bu döngünün her turuna üç tıklama eklemek, döngüyü kırıyor.

**2. Tekrar oynama, `GAME-DESIGN.md` §9'un tek uzun vadeli mekaniği.**
Yıldızlar (20 can → ★★★) oyuncuyu daha iyi bir sonuç için tekrar
oynamaya davet ediyor. 2 yıldız alan oyuncunun 3'ü denemesi gerekiyor —
ve o an "tekrar dene" butonu ekranda **değil**.

**3. Kazanınca da tıkanıyor.** Harita 1'i bitiren oyuncu harita 2'yi
açmış oluyor (S62: kilit yalnız bitirmeye bağlı). Ama "sonraki harita"
butonu yok; seviye seçime dönüp yeni açılan kartı bulması gerekiyor.
Yeni açıldığına dair bir vurgu da yok.

**4. `ROADMAP.md`'nin karar matrisi bu veriyi istiyor.** v1 sonrası
karar noktası üç metriğe dayanıyor: ortalama oturum, harita başına
tamamlama, nerede bırakıldığı. **Kaybettikten sonra tekrar denemeyi
zorlaştırmak, tam olarak "nerede bırakıldığı" metriğini bozar** —
oyuncular oyunu zor buldukları için değil, akış kırıldığı için bırakır
ve veri yanlış okunur.

**5. R8 (küratörlük).** "Çekirdek oyun döngüsü"ne bakan bir incelemeci
için, kaybedince tekrar denenemeyen bir tower defense en görünür
eksiklerden.

## Bugünkü kodun koruduğu şey

`GameOverScene.ts:107-110`'daki yorum önemli ve **korunmalı**:

> `stop` + `start`: `Game` ve `Hud` tamamen kapanıyor ki yeni oyun
> temiz başlasın. `sleep`/`wake` kullanılsaydı önceki oyunun altını
> ve kuleleri kalırdı — görevin "bitmedi sayılır eğer" maddesi.

"Tekrar dene" butonu eklerken **aynı disiplin** gerekiyor: `Game` ve
`Hud` durdurulup yeniden başlatılmalı, `restart` ile değil. Ayrıca
`CLAUDE.md` Mimari kuralı burada devreye giriyor:

> Sahne yeniden başlatma bu oyunda garanti: kaybedince tekrar dene,
> haritalar arası geçiş, seviye seçimden dönüş.

Yani mimari bu akışı **zaten öngörmüş** ve dinleyici disiplini ona göre
kurulmuş (`GameScene.ts:508` `events.once(SHUTDOWN, ...)`). Altyapı
hazır; eksik olan buton.

## Seçenekler

### (a) İki buton: "Tekrar dene" + "Ana menü"

Kaybedince de kazanınca da aynı iki buton.

- ✅ Basit, tek kod yolu
- ✅ Mevcut düzene sığıyor
- ❌ Kazanınca "tekrar dene" ikincil bir istek; asıl istek "sonrakine geç"

### (b) Duruma göre üç buton *(önerilen)*

| Durum | Butonlar |
|---|---|
| **Kaybedildi** | **Tekrar dene** (birincil) · Ana menü |
| **Kazanıldı, sonraki harita var** | **Sonraki harita** (birincil) · Tekrar dene · Ana menü |
| **Kazanıldı, son harita** | Tekrar dene · Ana menü |

- ✅ Her durumda doğru birincil eylem
- ✅ 3 yıldız kovalayan oyuncu için "tekrar dene" hep orada
- ⚠️ "Sonraki harita" için sıradaki haritanın **açık** olduğu
  doğrulanmalı. `SaveSystem.isUnlocked` zaten var
  (`LevelSelectScene.ts:97`), aynı çağrı kullanılır.
- ⚠️ Üç buton, 220×56 px'lik mevcut boyutla dikeyde yer istiyor;
  yerleşim gözden geçirilmeli. Yatay iki + altta bir olabilir.

### (c) Kazanınca otomatik sonraki haritaya geç

- ❌ Oyuncunun yıldızını görmesine izin vermiyor. §9'un tek ödülü
  ekrandan kaçırılmış olur.
- ❌ Reddedilir.

## Öneri

**(b).** Ek olarak iki küçük madde:

1. **Birincil buton görsel olarak ayrışmalı.** Üç aynı görünümlü buton,
   hiçbirini önermiyor. Birincil olan daha büyük ya da altın dolgulu
   olmalı — `createParchmentButton` bir varyant alabilir.

2. **Klavye kısayolu.** Duraklatma zaten ESC/boşluk kullanıyor
   (Poki zorunlu). Oyun sonu ekranında **Enter → birincil eylem**
   doğal bir ek. Sıfır maliyet, akışı belirgin hızlandırıyor.
   `HudScene.#bindKeys` deseni kopyalanabilir — ama `GameOverScene`'in
   kendi klavye eklentisine bağlanmalı ve sahne kapanınca Phaser
   `KeyboardPlugin.shutdown()` `removeAllListeners()` çağırdığı için
   sızıntı riski yok (`node_modules/phaser/.../KeyboardPlugin.js:880-893`
   ile doğrulandı).

## `LevelSelect` tarafında bir not

"Sonraki harita" eklenirse, seviye seçim ekranındaki **yeni açılan
haritanın vurgulanması** hâlâ eksik kalıyor. Bugün açık ve kilitli
kartlar ayrışıyor ama "bu **yeni** açıldı" diye bir işaret yok.
Ayrı ve küçük bir iş; bu dosyanın kapsamı dışında ama aynı akışın
parçası.

## Doğrulama

1. Harita 1'i **kaybet** → "Tekrar dene" birincil olarak görünmeli.
2. Tıkla → aynı harita **sıfırdan** başlamalı: altın başlangıç
   değerinde, can 20, kule yok, dalga 1.
3. `dev.gold()`, `dev.lives()`, `dev.waveNumber()` ile bunu doğrula —
   önceki oyundan sızan durum olmamalı.
4. `dev.shutdownListeners()` — tekrar dene'yi **beş kez** üst üste
   kullan, sayaç birikmemeli. Bu, `CLAUDE.md`'nin "sızıntı çökme
   üretmez, **olayların iki kez işlenmesi** olarak görünür" uyarısının
   testi (`TEST-STRATEGY.md` E6b).
5. `dev.clearCount` her yeniden başlatmada artmalı (`bus.clear()`
   çağrılıyor).
6. Harita 1'i **kazan** → "Sonraki harita" görünmeli, harita 2'yi
   açmalı.
7. Harita 3'ü kazan → "Sonraki harita" **görünmemeli**.
8. Yıldız kaydı bozulmamalı: tekrar denemede daha kötü sonuç alınırsa
   **eski (daha iyi) yıldız korunmalı**.

   > **Bu taraf zaten doğru yazılmış** (`SaveSystem.ts:83-89`):
   > ```ts
   > const yeni = starsFor(lives, won);
   > if (yeni <= this.starsOf(mapId)) return false; // yıldız düşmüyor
   > ```
   > Yani "tekrar dene" akışı bu açıdan güvenli. Yine de tekrar denemeyi
   > kolaylaştırmak bu yolun **çok daha sık** koşulması demek, o yüzden
   > doğrulama listesinde kalıyor.
9. Enter tuşu birincil eylemi tetiklemeli.

## Bitmedi sayılır eğer

- Tekrar denemede önceki oyundan durum sızıyorsa.
- `dev.shutdownListeners()` birikiyorsa.
- Daha kötü bir tekrar deneme, kayıtlı yıldızı düşürüyorsa.
- Son haritada "Sonraki harita" görünüyorsa.
- Üç buton da aynı görsel ağırlıktaysa (birincil ayrışmıyorsa).

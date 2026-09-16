# Kale Nöbeti — Proje Kuralları

Fantastik ortaçağ temalı, tarayıcıda çalışan tower defense oyunu.
Model: Kingdom Rush (sabit yol + belirli yapı noktaları).
v1 hedefi 3 harita × 10 dalga, 4 kule ailesi, 2 aktif yetenekti ve aşıldı.
**Bugünkü kapsam:** 6 harita × 10 dalga, 4 kule ailesi (okçu, top, büyü,
kışla), 2 aktif yetenek, 3 zorluk, 11 düşman türü, sonsuz mod.
Bu satır bir sayı değiştiğinde güncellenir — eski hâli "3 harita" diyordu
ve `M29`'a kadar öyle kaldı.

## TIER 1 — Pazarlıksız kurallar

1. **Denge verisi asla koda gömülmez.** Tüm sayısal değerler `src/data/*.ts`
   içindeki tipli sabitlerde durur. Bir kulenin hasarını değiştirmek için
   sistem dosyalarına dokunulmaz.
2. **İlk yüklenen paket 8 MB'ı geçemez.** Poki limiti bu. Aşamalı yükleme ile
   hedef ~1.5 MB. Her `npm run build` sonrası boyut raporlanır;
   5 MB uyarı, 8 MB hata.
3. **Nesne havuzu zorunlu.** Mermi, düşman, hasar sayısı ve parçacıklar
   `Phaser.GameObjects.Group` ile havuzlanır. Oyun içinde asla `new` ile
   mermi yaratılmaz. Havuza dönen nesne **tüm durumunu sıfırlar**
   (hedef referansı, tween, timer, tint) — sıfırlanmayan hedef referansı
   ölü düşmanı canlı tutar.
   **Kural 11 ile sınırı:** havuz *muhasebesi* (`util/pool.ts` — kim serbest,
   kim kullanımda, sıfırlama çağrıldı mı, kapasite doldu mu) Phaser'sızdır ve
   `node`'da test edilir; `Group` havuzu kullanan tarafta (`entities/`,
   `scenes/`) yaşar ve nesnenin görüntü listesine girmesi, sahne kapanınca
   toplanması onun işidir. Havuz mantığı `Group`'un içine yazılırsa tek bir
   havuz testi bile Phaser dünyası ayağa kaldırmak zorunda kalır.
4. **Yol bulma dinamik değildir.** Yol sabit waypoint dizisidir. A* veya
   flow field eklenmez. Kuleler yolu değiştiremez.
5. **`any` tipi kullanılmaz.** TypeScript strict modda çalışır.
6. **Erişilebilirlik tabanı:** ekran sarsıntısı ve parçacık yoğunluğu
   ayarlardan kapatılabilir olmalı. `prefers-reduced-motion` saygı görür.
   Düşman/dost ayrımı yalnız renge dayanmaz.
7. **Değişen metin `BitmapText`'tir.** Hasar sayıları, altın, can, bekleme
   süreleri, dalga sayacı. `Phaser.GameObjects.Text` yalnızca bir kez yazılıp
   sonra değişmeyen metinlerde serbesttir. Gerekçe: `Text` içeriği her
   değiştiğinde canvas yeniden üretilip GPU'ya yükleniyor — havuzlamak
   bu cezayı kaldırmaz.
8. **Ham `delta` yasak.** Tüm zaman bağımlı mantık `GameClock.scaledDelta`
   üzerinden çalışır. `GameClock.setScale(1|2)` ayrıca **üç** Phaser
   özelliğini de günceller: `tweens.timeScale`, `time.timeScale`,
   `anims.globalTimeScale`. Bu sözleşme **M0'da** kurulur — sonradan
   eklemek her sisteme dokunmak demektir.
9. **Menzil ve mesafe kontrolleri karesel yapılır.** `Math.sqrt` çağrılmaz.
   Kule, ateşe hazır olmadığı sürece hedef aramaz.
10. **`localStorage` erişimi her zaman `try/catch` içinde.** Gizli sekmede
    istisna fırlatıyor; sarılmazsa oyun açılışta çöker. Kayıt başarısızsa
    oyuncuya bir kez bildirilir.
11. **`systems/`, `util/`, `data/` ve `types/` Phaser'ı yalnız `import type`
    ile alır.** Çalışma zamanında Phaser'a dokunan kod yalnız `scenes/` ve
    `entities/` içinde yaşar. Gerekçe: testler `node` ortamında koşuyor;
    saf mantık dosyası Phaser'ı çalışma zamanında yüklerse `window` arar ve
    patlar. O noktada çare diye `jsdom`'a geçilir, testler yavaşlar ve
    `simulateWave` için konan "10 dalga < 2 sn" şartı düşer. Bu kural,
    "sahneler ince olur, mantık `systems/` içinde yaşar" mimari kuralının
    derlenebilir hâlidir.

## TIER 2 — Çalışma düzeni

- Önemsiz olmayan her iş için önce plan modu. Plan tek seferde en fazla
  bir kilometre taşını kapsar (bkz. `docs/ROADMAP.md`).
- Her kilometre taşı sonunda oyun **oynanabilir** kalmalı. Yarım bırakılmış
  sistem merge edilmez.
- Bir sistem yazılmadan önce `docs/GAME-DESIGN.md` içindeki ilgili bölüm okunur.
- Yeni bir sayı uydurma. Tasarım dokümanında yoksa sor.
- Bir denge sayısı sorgulanıyorsa önce `docs/research/01-denge-matematigi.md`
  okunur — çoğu sayının gerekçesi orada.
- **Yeni bir şey eklerken onu saymayan listeleri ve eski kuralı anlatan
  metinleri ara.** Bu projenin en sık tekrarlayan kusur sınıfı bu; `M27`,
  `M28` ve `M29`'da üst üste çıktı. Sistem doğru yazılıyor, onu *numaralayan*
  eski yer güncellenmiyor. Üç yüzeyde birden aranır:
  1. **Sayan listeler** — sağlama dizileri, `Record<...>` haritaları,
     numaralı sabitler. Tarama: yeni kimliği geçmeyen ama eskisini geçen
     dosyaları bul (ör. `grep -rln MAP_5 src/ | while read f; do
     grep -q MAP_6 "$f" || echo "$f"; done`).
  2. **Oyuncu metinleri** — `data/strings.ts` içindeki `howTo*`, `hint*`.
     En tehlikelisi bu: kod doğru çalışırken oyuncuya **sessizce yanlış
     kural öğretiyor**. `M16` erken başlatmayı bir riske çevirdiği hâlde
     `howTo6` `M28`'e kadar "bedava altın" demeye devam etti.
  3. **Bu dosya ve `docs/`** — kapsam cümleleri, klasör listeleri, kapı
     komutu, elle yazılmış sayılar. `M29`'da beşi birden yanlıştı.
  Kural: elle sayılan liste yerine mümkünse **türetilen** liste yaz; bir
  sayı elle yazılacaksa yanına onu **hangi ölçümün** ürettiği not edilir.

## Teknoloji

- **Phaser 3** (`^3`, kurulu 3.90.0) + TypeScript (strict) + Vite.
  **Phaser 4'e yükseltilmez.** `npm install phaser` bugün 4.x getiriyor —
  sürüm `^3` ile sabitli, bilerek. Gerekçe: `docs/research/02-phaser-teknik.md`
  içindeki her bulgu Phaser 3'e karşı doğrulandı (`BitmapText` performansı,
  `timeScale` özellikleri, 16 doku batching sınırı, `Scale.FIT`); 4 bir yeniden
  yazım ve bunları geçersizleştirir. Örnek/tutorial ekosistemi de hâlâ 3.
  v1 yayınlandıktan sonra tartışılabilir.
- Mantıksal çözünürlük 1280×720 (16:9), `Scale.FIT` + `CENTER_BOTH`, letterbox
- **Arcade fizik kullanılmıyor.** Mermiler elle hareket eder; tüm yakınlık
  ve isabet kontrolleri karesel mesafe (kural 9). Gerekçe: çarpışma çözümü
  (itme, sekme, yerçekimi) yok; mermiler zaten hedef takipli olduğu için
  `velocity` her karede üzerine yazılırdı; havuza dönen nesnede sıfırlanacak
  alan sayısı artardı (kural 3); ve `simulateWave` başsız kalabiliyor —
  fizik olsaydı test bir Phaser dünyası ayağa kaldırmak zorundaydı.
  **Eşik:** aynı anda düşman sayısı 200'ü aşarsa naif `O(n·m)` mesafe
  taraması yetmez, uzamsal ızgara gerekir. **Ölçülen** pay (`M29`,
  `SimResult.peakEnemies`, altı harita × on dalga): en kalabalık tek dalga
  23 düşman, sahadaki eşzamanlı tepe **18** — ve bu 18, oyuncunun her
  dalgayı mümkün olan en erken anda başlattığı (`ErkenPolitika 'hemen'`,
  `M16` örtüşmesi sonuna kadar) en kötü hâl. Örtüşmesiz tepe 14.
  Eşiğe 11 kat pay var; ızgara gerekmiyor. Bu satırdaki sayı el yordamıyla
  yazılmaz, `peakEnemies` ile ölçülür.
- Yalnızca yatay yönlendirme (mobilde çevirme uyarısı platform tarafından yapılır)
- Ses: Phaser'ın kendi ses sistemi
- Kayıt: `KeyValueStore` arayüzü arkasında `localStorage`,
  tek anahtar `kale-nobeti-save-v1`
- **Oyuncuya görünen hiçbir metin kodun içinde yazılmaz.** Hepsi
  `src/data/strings.ts` içinde bir **dil haritası**nda durur:
  `{ tr: {...}, en: {...} }`, varsayılan `tr`. Kullanım `t('play')`
  biçimindedir, `strings.play` değil. **`en` tamamlandı** (202 anahtar) —
  yapı önce kurulduğu için çeviri gerçekten bir oturumluk iş oldu.
  Eşitlik derleyicide bağlı: `STRINGS` tipi
  `Record<Locale, Record<StringKey, string>>` ve `StringKey = keyof typeof TR`,
  yani `tr`'ye anahtar ekleyip `en`'e eklemeyen `npm run typecheck`'i kırar.
  Yeni metin eklerken iki dili de yazmak zorunludur, hatırlamak değil.
  İngilizcenin gerekçesi: Poki ve CrazyGames global platformlar, Türkçe-only
  bir oyun oradaki erişimi büyük ölçüde kesiyor.
- Fontlar `Boot` sahnesinde `FontFace` API ile yüklenir, `Preload`'dan önce
  `await` edilir. Sayı fontu web fontu değil, **bitmap font**tur.
- Harici bağımlılık eklemeden önce sor

## Platform kısıtları (M0'dan itibaren geçerli)

Ayrıntı: `docs/research/05-yayin-platformlari.md`

- `vite.config.ts` içinde `base: './'` — mutlak yol yasak (CrazyGames).
  Unutulursa oyun portalda hiç yüklenmez.
- UI, 640×360'a küçültüldüğünde okunur kalmalı: minimum yazı **16 px**,
  minimum dokunmatik hedef **44×44 px** (1280×720 ölçeğinde).
- **ESC ve boşluk** duraklatmayı açar/kapatır (Poki zorunlu).
- Sayfa CSS'inde `-webkit-user-select: none`.
- Yayın yapısında konsol çıktısı, hata ayıklama tuşları ve FPS sayacı bulunmaz.

## Varlık formatları

Ayrıntı: `docs/research/04-varlik-paket-boyut.md`

- Arka planlar: **WebP q80, atlas DIŞINDA**, ayrı dosya. (PNG-24 olarak
  bırakılırsa üç arka plan tek başına paketi patlatır.)
- Sprite/UI: tek `atlas.png`, PNG-8, maks 2048×2048.
- Bitmap font: PNG-8 + `.xml`.
- Ses efektleri: **yalnız `.m4a`** (AAC). `.ogg` kopyası üretilmez.
- Müzik: `.m4a` 96 kbps mono, ilk dalgadan sonra yüklenir.
- Web fontları: Google Fonts'tan indirilip `public/assets/fonts/` altında
  **yerel** sunulur (CDN'e bağımlılık yok). Statik `woff2`, tek ağırlık.
  **`latin` ve `latin-ext` alt kümelerinin ikisi de gerekir** — Google
  Fonts'ta `latin-ext`, `latin`'i *tamamlar, değiştirmez*:
  `ç ö ü Ç Ö Ü` ve `ı` (U+0131) `latin` içinde, `İ ş ğ Ş Ğ` `latin-ext`
  içinde. Yalnız biri indirilirse arayüzde kutucuk çıkar.
  `FontFace` yüzleri `unicodeRange` ile ayrı ayrı kaydedilir
  (bkz. `src/scenes/BootScene.ts`).
- Toplam doku sayısı ≤ 16 (Phaser multi-texture batching sınırı).

## Klasör yapısı

Buradaki tablo **hangi dosyanın nereye ait olduğunu** söyler; dosyaları
tek tek saymaz. Gerekçe: `M29`'da eski liste ölçüldü — `systems/`'in 30
dosyasından 10'unu, `fx/`'in 25'inden 4'ünü, `data/`'nın 19'undan 6'sını
sayıyordu ve `util/easing.ts` diye **var olmayan** bir dosya listeliyordu.
Elle sayılan liste, sayılan şey büyüdükçe sessizce yalan söylüyor. Güncel
içerik için klasörün kendisine bakılır.

```
src/
  main.ts       Phaser config, sahne kaydı
  scenes/       Phaser Scene'leri. İNCE: girdi alır, sistemi çağırır, çizer.
                Boot · Preload · Menu · LevelSelect · Game · Hud · Overlay ·
                HowTo · Achievements · GameOver
  systems/      Oyun mantığı. Phaser'a YALNIZ `import type` ile bakar (k.11),
                `node`'da test edilir. Omurga: GameClock · PathSystem ·
                WaveManager · TowerSystem · TargetingSystem · ProjectileSystem ·
                BarracksSystem · EconomySystem · AbilitySystem · SaveSystem ·
                EventBus. Ölçüm/denge tarafı: waveSim · balanceChecks ·
                referansOlcum (bu üçü oyunla aynı kuralları koşturur).
  entities/     Sahnede yaşayan havuzlanmış nesne: Enemy · Tower · Soldier ·
                Projectile. Phaser'a çalışma zamanında dokunabilir.
  fx/           Görsel/işitsel katman ve HUD parçaları. Oyun durumunu SAHİPLENMEZ,
                gösterir. ScreenShake · HitStop · Particles · DamageText · ...
  data/         Tipli sabitler — TIER 1 kural 1'in adresi. Bir dengeyi
                değiştirmek buraya dokunmaktır, başka hiçbir yere.
                towers · enemies · waves · maps · balance · bossScaling ·
                difficulty · achievements · strings · ...
  types/        Ortak arayüzler. Çalışma zamanı kodu yok.
  util/         Bağımsız saf yardımcılar: math · pool · coverage · storage · i18n
public/assets/  atlas.png · atlas.json · bg/*.webp · audio/ · fonts/
```

## Mimari kurallar

- Sahneler ince olur. Oyun mantığı `systems/` içinde yaşar.
- `Game` sahnesi ve `Hud` sahnesi ayrıdır; HUD, `Game`'in üstünde paralel çalışır.
- Sistemler birbirini doğrudan çağırmaz, `EventBus` (Phaser events) üzerinden
  haberleşir. Örnek olaylar: `enemy:killed`, `wave:started`, `gold:changed`,
  `life:lost`, `tower:placed`.
- **`create()` içinde kaydedilen her dinleyici, `shutdown()` tarafından ya
  tüketilmeli (`once`) ya da açıkça kaldırılmalı.** Phaser `shutdown()`'da
  `removeAllListeners()` çağırmıyor (o `destroy()` içinde), ama `create()`
  her yeniden başlatmada koşuyor. Yani `create()` içinde `on` kullanmak
  her denemede kalıcı bir dinleyici daha ekler.
  **Kayıt `create()` dışına taşınırsa semantik tersine döner** — `init`,
  kurucu veya alan başlatıcıda `once` bu kez yalnız bir kez çalışır.
  Sahne yeniden başlatma bu oyunda garanti: kaybedince tekrar dene,
  haritalar arası geçiş, seviye seçimden dönüş.
  Sızıntı çökme üretmez, **olayların iki kez işlenmesi** olarak görünür.
  Çalışma zamanı sağlaması: `TEST-STRATEGY.md` E6b.
- `Enemy` kendi hasarını hesaplamaz; `combat.ts` içindeki saf `applyDamage()`
  fonksiyonu kullanılır (test edilebilir olsun diye).
- Harita verisi (`maps.ts`) waypoint + yapı noktası koordinatları içerir.
  `coverage` alanı **elle yazılmaz**, `util/coverage.ts` üretir.
- Arka plan tek WebP dosyasıdır, tilemap kullanılmaz.

## Test

- **Ortam `node`**, `jsdom` değil. Test edilen hiçbir şey DOM'a dokunmuyor;
  `jsdom`'da WebGL/Canvas olmadığı için Phaser zaten koşmaz. `node` belirgin
  şekilde hızlı ve `simulateWave`'in "10 dalga < 2 sn" şartı buna bağlı.
  Phaser'a dokunan kısımlar **sahte sahne nesnesiyle** test edilir.
  Bu ancak kural 11 tutuyorsa çalışır.
- Saf mantık fonksiyonları için Vitest: `applyDamage`, dalga bütçesi üretici,
  ekonomi hesapları, hedefleme seçicileri, `coveredLength`, `simulateWave`.
- **Denge sağlamaları da test edilir** (M3'ten itibaren, M6'ya bırakılmaz):
  Kısıt A (tek düşman), Kısıt B (dalga verimi), ekonomi karşılanabilirliği.
  Üçü de `docs/GAME-DESIGN.md` §6'daki formülleri kullanır ve %15 pay arar.
- Görsel/sahne testi yazılmaz.
- Bir kilometre taşı bitince **dört adım**, sırayla:
  `npm run typecheck && npm run test && npm run guard && npm run build`
  `guard` (`scripts/guard-rules.mjs`, bugün 17 kural) uzun süre bu satırda
  yazmıyordu ama fiilen her kilometre taşında koşuyordu — TIER 1'in
  otomatikleştirilebilen kısmını o bekliyor (k.5 `any`, k.7 `BitmapText`,
  k.8 ham `delta`, k.9 `Math.sqrt`, k.11 `import type`). Kapıdan geçmeyen
  iş commit edilmez.

## Görsel yön

Tam açıklama `docs/GAME-DESIGN.md` §2. Özet: tezhipli el yazması estetiği.
Mürekkep mavisi zemin, parşömen UI, altın varak vurgular. Kingdom Rush'ın
parlak çizgi film paletine kaçılmaz.

**Üretim kuralı:** her varlığın önce GREYBOX hali yapılır (tek renk silüet).
Oyun M4 sonunda greybox'la tamamen oynanabilir olmalı. Nihai çizim yalnızca
oynanışta kanıtlanmış varlıklar için üretilir — gerekçe:
`docs/research/06-sanat-yonu.md` §2.

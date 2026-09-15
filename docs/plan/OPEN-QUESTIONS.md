# Açık sorular

## Kod bekleyen soru kalmadı — **M6'nın hiçbir görevi artık varlık beklemiyor**

M0-M5 boyunca hiçbir soru kodu bloke etmedi ve etmiyor. M6'da S50 (sanat
yönü), S51 (ses efektleri) ve S52 (müzik) **insan üretimi** gerektirdi.
**2026-08-16: üçü de kapandı** — sanat (`5401d58`, `4ea71a6`), 12 ses
efekti ve 2 müzik parçası (AI üretim + `ffmpeg-static`) koda bağlandı.

Kalan soruların makul bir varsayılanı var ve varsayılanla ilerlenebilir.
Bunları tek tek çözmeye çalışmak iki gün kod yazmamak demek.

| Durum | Sayı |
|---|---|
| ☑ Kapandı | 46 (S01, S02, S06, S08, S10-S18, S21, S25-S33, S39-S42, S45-S47, S49, S50, S51, S52, S53-S56, S57, S58, S59, S60, S62, S63, S73) |
| ☐ Varsayılanla geçilebilir | 24 |
| ⚠️ Yeni denge bulgusu | 11 (M3: 8 nokta · yükseltme kapsamı · M4: S65 boss payı · M5: S66 asker hasarı · S67 hasar tipi · S68 asker hızı · S69 kışla yeri · M7: S70 dalga bonusu ✅ · S72 başlangıç altını ✅ · S73 altın çarpanı ayrıştı ✅ · S74 Kısıt A kışlayı modellemiyor) |
| **⛔ Bloke edici** | **0** |

**Kod yazmaya başlamak için beklenen hiçbir şey yok.**

### Kapanan sorular

> **M1 bölümünde ayrıntısı olanlar:** S11, S12, S13, S15, S16, S17.
> **M0 bölümünde:** S06, S10.

| # | Nasıl kapandı |
|---|---|
| **S13** | **Keskin dönüş, kalıcı.** Yay eklenmiyor — `L` ve kapsama keskin dönüşle ölçüldü, yay onları geçersiz kılar; viraj noktalarının çift kapsaması bilinçli bir yerleşim kolu. Görsel bedeli M6'da dönüş tween'iyle kapatılır (yalnız görüntü) |
| **S15** | **İki kademeli ölçüm.** Birincil: geliştirme makinesi 60 FPS. İkincil (yayın öncesi zorunlu): Chrome DevTools 4× CPU kısıtlamasında ≥ 30 FPS. 4 GB Chromebook elde yok; uydurma sayı yerine **tekrarlanabilir vekil** seçildi ve vekil olduğu yazıldı |
| **S18** | Yer tutucu bitmap font `0-9 + - . %`; dosya değil, bir kez üretilen doku (M2 bölümü) |
| **S21** | Mermi hedefi ölürse son bilinen konuma gidiyor; alan hasarlıysa yine patlıyor (M2 bölümü) |
| **S25** | `ReferenceBoard` **türetiliyor**, uydurulmuyor — `M3-T07` ekonomi tablosundan algoritmayla üretiyor |
| **S26** | Düştü — `dalgaSüresi` artık tanımlanmıyor, **ölçülüyor** (`M3-T09` başsız simülasyon) |
| **S27** | Düştü — `aktiflikOranı` hiç hesaplanmıyor; simülasyon gerçek aktifliği zaten yaşıyor |
| **S56** | **Kritik vuruş v1'den çıkarıldı.** Mekanik hiç tanımlı değildi; eklemek varyans getirip karşılığında hiçbir şey vermiyordu. Hasar rengi iki renk (`GAME-DESIGN.md` §3) |
| **S59** | Eşikler verildi: 20 can → ★★★, 15-19 → ★★, ≤14 → ★ (`GAME-DESIGN.md` §9) |
| **S01** | **Fontlar Google Fonts'tan `latin-ext` alt kümesiyle** indirilip `public/assets/fonts/` altında yerel sunulur — CDN bağımlılığı yok. `latin` alt kümesi Türkçe karakterleri içermiyor; `M0-T05` kabul kriterine `İIıi ŞşĞğÇçÖöÜü` render kontrolü eklendi (`CLAUDE.md` Varlık formatları) |
| **S63** | **Dil haritası.** `src/data/strings.ts` düz nesne değil `{ tr, en }` haritası; varsayılan `tr`, `en` anahtarları şimdilik boş. Kullanım `t('play')`. Gerekçe: Poki ve CrazyGames global; Türkçe-only erişimi kesiyor. Çeviri M7'de bir oturumluk iş ama **yapıyı** sonradan eklemek `scenes/`'in tamamına dokunmak demek (`CLAUDE.md` Teknoloji) |
| **S14** | **Düştü** — kapsama ölçümü örnekleme değil **analitik** oldu (`math.segmentCircleOverlapLength`, segment-çember kesişimi kapalı formül). Adım boyutu diye bir parametre kalmadı. Örnekleme sürümü %1,45 kuantizasyon hatası veriyordu ve dengenin tamamı bu sayıya asılı |
| **S02** | **Arcade fizik kullanılmıyor.** Mermiler elle hareket eder; yakınlık ve isabet karesel mesafe. `GameClock` üç özellik yazıyor, dört değil. Belirleyici sebep: `simulateWave` fizikle Phaser dünyası ayağa kaldırmak zorunda kalırdı — S02'nin cevabı aslında `M3-T09` kararında verilmişti. Eşik: düşman > 200 olursa uzamsal ızgara gerekir (`CLAUDE.md` Teknoloji) |
| **S08** | **Vitest ortamı `node`**, Phaser'a dokunan kısımlar sahte nesneyle. `jsdom`'da WebGL/Canvas yok, Phaser zaten koşmaz; `node` hızlı ve "10 dalga < 2 sn" şartı buna bağlı. **Çalışma koşulu TIER 1 kural 11 olarak yazıldı** (`CLAUDE.md` Test) |
| **S50** | **Kararı kapandı, üretimi kapanmadı.** Yön **özgün silüet**: koyu mürekkep silüet + tek vurgu + altın kontur; tezhip yalnız çerçeve ve arka planda, hazır varlık paketi yok, takvim **3-4 hafta** (`GAME-DESIGN.md` §2). **Ama varlıklar üretilmedi** — M6 bölümünde ⛔ olarak duruyor ve 7 görevi bekletiyor. Karar bir daha sorulmayacak; beklenen şey çizim |

**S26/S27 neden "cevap" değil de "düştü":** Kısıt B birim testi olmaya
uygun değildi. Kısıt A statik veriden hesaplanabiliyor; Kısıt B'nin
girdileri simülasyon çıktısı. Tanım uydurmak yerine ölçmek hem daha doğru
hem iki soruyu birden siliyor.

---

Her soru için: **neden önemli** · **hangi taşı bloke ediyor** ·
**karar verilmezse varsayılan ne olur**.

> Varsayılanların hepsi kodda `// GEÇİCİ — S<nn>` olarak işaretlenir.
> Hiçbiri sessizce kararlaştırılmaz.

---

## M0 — İskelet, saat, aşamalı yükleme

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S02 | Arcade fizik kullanılacak mı? | `research/02` §3 kararı açıkça M0'a bırakıyor. Kullanılmazsa `GameClock`'tan `physics` satırı düşer; M2'de mermi yazılırken geri dönmek pahalı | `M0-T04` | Kullanılmıyor; mermiler elle hareket eder |
| S03 | Duraklatma ekranında ne var — yalnız karartma mı, menü mü? | **Varsayılan uygulandı:** %72 mürekkep perde + "Duraklatıldı" + "ESC / boşluk" ipucu. Buton yok. Ayarlar M6'da gelince yeniden bakılacak | `M0-T09` ☑ | (uygulandı) |
| S04 | 2× seçimi kalıcı mı — oturum boyu, harita boyu, yoksa her dalga 1×'e mi dönüyor? | **Varsayılan uygulandı:** oturum boyu, kaydedilmiyor. Ölçüldü — duraklatmayı aşıp korunuyor. Kalıcı olması istenirse `SaveSystem`'e (M7) bağlanır | `M0-T09` ☑ | (uygulandı) |
| S05 | Menü M0'da ne kadar dolu — yalnız "Oyna" mı, Ayarlar/Seviye Seçim yer tutucuları da mı? | Kapsam şişmesi riski | `M0-T07` | Yalnız "Oyna" |
| S06 | ✅ **Kapandı.** `EventBus` M0'da kuruldu; `speed:changed` ve `game:paused` iki taş boyunca kullanımda kaldı ve M1'de `life:lost` da devreye girdi. İkisi de **onaylandı**, `types/events.ts`'teki geçici işaretleri kaldırıldı | — | `M0-T03` ☑ | (onaylandı) |
| S07 | Hız butonu etiketi TIER 1 k.7'yi nasıl karşılayacak? | **Kapandı (2026-08-27, `G02`).** İki statik `Text` yerine tek `BitmapText` (`HudScene.#hizYazi`, `NUMBER_FONT_KEY`) — `setText` çağrılıyor ama `BitmapText` üzerinde, kuralın yasakladığı `Text` yeniden üretimi değil. `guard-rules.mjs`'in k.7 kontrolü bu ayrımı yapamıyordu (yanlış pozitif verdi) — alıcı-farkındalıklı hâle getirildi | `M0-T09` ☑ | (kapandı) |
| S08 | Vitest ortamı `node` mu `jsdom` mu? `GameClock`'un Phaser'a dokunan kısmı sahte nesneyle mi test edilecek? | Test yazım şeklini belirliyor | `M0-T01`, `M0-T04` | `node` + sahte sahne nesnesi |
| S09 | `prefers-reduced-motion` M0'da mı okunacak? | TIER 1 k.6 erişilebilirlik tabanı istiyor ama efektler M6'da | `M0-T09` | M6'ya bırakılır |
| S10 | ✅ **Kapandı.** `scripts/report-size.mjs` üç satır basıyor: `js/html/css` (gzip'li), `varlıklar` (sıkışmaz), `İLK İNDİRME` (Poki 8 MB) ve `toplam` (CrazyGames, SDK'sız). Tanım çıktının içinde yazılı, varsayım gizli değil. `assets/lazy/` dizini ilk indirmeden düşülüyor | — | `M0-T10` ☑ | (uygulandı) |

## M1 — Yol, düşman hareketi, kapsama aracı

**Açık soru kalmadı.** Altısı da M1'de kapandı.

**S13 kapandı — keskin dönüş, kalıcı karar.** Yay (köşe kesme) eklenmiyor.
Üç gerekçe: (1) `L` = 1700 ve ortalama kapsama 296,3 **keskin dönüşle
ölçüldü**; yay yol uzunluğunu kısaltır ve kilitlenen denge sayılarını
geçersiz kılar. (2) Viraj noktalarının çift kapsaması (421,8 px vs 259,8 px)
bilinçli bir yerleşim kolu — yay onu yumuşatır ve yerleşim kararını
düzleştirir. (3) TIER 1 kural 4 yolun sabit waypoint dizisi olmasını
istiyor; yay bir eğri değerlendirmesi getirir.
**Görsel bedeli M6'da kapatılır:** düşman köşede yön değiştirirken kısa bir
dönüş tween'i — yalnız görüntü, `PathSystem`'e dokunmaz, ölçümler değişmez.
**Kısmen ödendi (2026-08-27, `G06`):** yürüdüğü yöne bakma (`flipX`)
eklendi — `Enemy.ts`, `Soldier.ts`/`BarracksSystem.ts`. Dönüş tween'inin
kendisi (S13'ün asıl sözü, `scaleX: 1→0→-1`) hâlâ açık; `flipX` onun
ucuz/anında hâli.

**S15 kapandı — iki kademeli ölçüm.**
- **Birincil geçit:** geliştirme makinesi, tepe dalgada **60 FPS**
  (`M1-T07` kabul kriteri bu).
- **İkincil geçit (yayın öncesi zorunlu):** Chrome DevTools **4× CPU
  kısıtlaması** altında tepe dalgada **≥ 30 FPS**.

Gerekçe: CrazyGames 4 GB Chromebook şartı koyuyor ama elde o cihaz yok.
Uydurma bir sayı yerine **tekrarlanabilir bir vekil** seçildi; vekil
olduğu açıkça yazılıyor. Gerçek cihaza erişilirse vekil düşer.

**☑ İKİNCİL GEÇİT DE KOŞULDU (`Y10`).** Uzun süre yalnız birincil geçit
ölçülmüştü; "yayın öncesi zorunlu" olan ikincisi M6'da ve M7'de atlandı.

Ölçüm: harita 3 (en ağır), 10 kuleli karışık tahta, efekt Tam, 4× CPU
kısıtlaması, her renderer iki koşu.

| | FPS | kare ort | p95 | p99 |
|---|---|---|---|---|
| WebGL sıcak | **50,2** | 13,63 ms | 19,5 | 27,3 |
| Canvas sıcak | 50,1 | **9,29 ms** | 13,3 | 16,9 |

**Eşik 30, ölçülen 50 — %65 pay.** Geçit geçildi.

Yöntem notu, bir dahakine için: **duvar saati FPS'i tek başına
yetmiyor.** Kısıtlamasız ölçümde 62 FPS okunuyor ama bu vsync'e takılı
aralık; gerçek maliyeti görmek için `raf.callback` sarmalanıp kare
başına CPU süresi ölçüldü. Ve **her renderer iki kez** koşuldu: ilk koşu
soğuk (shader derleme, doku yükleme) ve kısıtlamasız ölçümde p99'u
26,9 ms gösterip 3,7 yerine — tek koşuya bakılsaydı render modu yanlış
değişirdi.
**Nerede:** M6 (efektler FPS riskinin zirvesi) ve M7 (yayın öncesi tekrar).

**S11, S12, S16, S17 `M1-T03`'te kapandı** — koordinatlar uydurulmadı,
**kapsama hedefinden türetildi**. Boss 700 ve T2 tahtası sabit tutulup
gereken ortalama kapsama çıkarıldı (≈292 px), yol ve 8 nokta onu tutturacak
şekilde çizildi. Ölçülen: `L` = **1700 px**, ortalama kapsama **296,3 px**,
boss 700 = tavanın **%78,7'si** (hedef %75-85). Düşman **ekran dışında**
doğuyor (`x = -60`) — 60 px'i `L`'ye dahil. Ayrıntı:
[M1 §M1-T03](M1-yol-dusman-kapsama.md).

## M2 — Kule, mermi, hedefleme

**S18 ve S21 kapandı; S19, S22, S23 varsayılanla uygulandı; S20 ve S24
hâlâ açık ve ikisi de M3'ün girdisi.**

| # | Durum | Ayrıntı |
|---|---|---|
| **S18** | ✅ kapandı | Karakter kümesi `0-9 + - . %`. Font **dosya değil**, `create`'te bir kez üretilen doku + `RetroFont.Parse` — doğrulanamayan ikili dosya uydurmak yerine. M6'da gerçek dosyayla değişecek, `NUMBER_FONT_KEY` aynı kalıyor. **2026-08-16: değişti** — `M6-T01` gerçek dosyayı üretti (`numbers.png`+`.xml`, Inter Tight), yer tutucu silindi |
| **S21** | ✅ kapandı | Mermi havadayken hedef ölürse **son bilinen konuma gidip sönümleniyor**; alan hasarlıysa oraya varınca **yine de patlıyor** (top mermisi boşa gitmiyor). Üç ayrı test |
| **S19** | ✅ **kapandı (2026-08-28, `G03`)** | "Altın kartuş biçimi" geldi: menüler artık içeriğe göre boyutlanan bir parşömen panel üstünde duruyor (`GameScene.ts` `#menuArkalikEkleVeKonumla`). Ayrıntı: `docs/plan/iyilestirme/G03-yapi-menusu-arkalik.md` |
| **S22** | ✅ **KAPANDI (`M11` Faz 5)** | **Patlama hasarı artık merkeze uzaklığa göre azalıyor:** merkezde %100, kenarda **%35**, arası doğrusal (`BALANCE.patlamaKenarOrani`, `ProjectileSystem.#patlat`). Buraya kadar yarıçapın içindeki herkes **tam** hasar alıyordu, yani alan hasarı bedava bir çarpandı — S95'in ana sebebi. Sayı tek başına türetilmedi: kenar oranı (%100/80/65/50/35) ile Okçu'nun kademe çıktısı **birlikte** tarandı, çünkü ikisi aynı tabloyu hareket ettiriyor. %35'te mono-Top'un karışık tahtaya üstünlüğü harita 4'te kayboluyor, %50'de kalıyor; %25'in altında kazanç duruyor. Karekök `util/math.merkezdenOran`'a taşındı — kural 9'un ikinci yazılı istisnası: bu bir **oran**, karşılaştırma değil |
| **S23** | ☐ varsayılan uygulandı | Kule dönmüyor, anında ateş ediyor. `research/01` "dönüş vergisi"ni %15-20 etkin DPS kaybı olarak ölçmüştü — eklenirse **tüm Kısıt A tavanları yeniden bakılmalı** |
| **S20** | ⚠️ **açık** | Mermi hızı `600 px/sn`, `data/balance.ts` içinde `GECICI_MERMI_HIZI` olarak işaretli. Dokümanda hiçbir yerde yok. En hızlı düşmanın (Kurt Binicisi 110) 5,5 katı; menzil 150'de uçuş süresi ≤ 0,25 sn — yani M2 ölçümlerinde ıskalama üretmiyor |
| **S24** | ⚠️ **açık — M3 girdisi** | Aynı hedefe mermi sınırı **yok**. `research/01` §10'daki odaklanma kaybının (overkill) kaynağı bu ve Kısıt B'deki `× 0,75` çarpanının karşılığı. `M3-T09` başsız simülasyonu bunu **ölçecek**; ölçmeden sınır konmuyor |

## M3 — Ekonomi, dalgalar, denge sağlamaları

**S28-S33'ün altısı da kapandı; M3 iki YENİ denge bulgusu üretti (S34, S35).**

| # | Durum | Ayrıntı |
|---|---|---|
| **S28** | ✅ kapandı | **`REST_K` düştü:** §7'nin `dalgaSonrasıBekleme = REST_K × dalgaBoyu` satırı §6'nın açık "20 sn hazırlık sayacı" ile çelişiyordu; açık sayı kazandı. **`SPAWN_K = 24`, ölçülerek** seçildi (8 farklı değer × 10 dalga simüle edildi, `M3-SONUC.md` §2). Formülün asıl anlamı da bulundu: `(n−1)×K/n ≈ K`, yani `SPAWN_K` **dalganın doğum penceresi** — dalga boyundan bağımsız |
| **S29** | ✅ kapandı | Hazırlık sayacı dolunca dalga **otomatik** başlıyor; erken başlatma bir seçenek. §6'nın bonus formülü (`kalanSaniye × …`) zaten sayacın işlediğini varsayıyor |
| **S30** | ✅ kapandı | Kompozisyon bütçeden üretiliyor, rötuş kuralı koda yazıldı: dalga 1-2 yalnız Goblin, Ork Savaşçı 3'te (zırh), Kurt Binicisi 5'te (hız), **nefes dalgalarında yeni tip tanıtılmıyor**. `waves.test.ts` üçünü de bağlıyor |
| **S31** | ✅ kapandı | **Kaybetme anında.** Can 0'a inince dalga sonu beklenmiyor; beklemek oyuncuya kaybettiğini bildiği bir dalgayı izletmek olurdu |
| **S32** | ✅ kapandı | Eşikler zaten `GAME-DESIGN.md` §9'da vardı (S59'da eklenmişti): 20 → ★★★, 15-19 → ★★, ≤14 → ★. `GameOverScene` uyguluyor. Soru bayattı |
| **S33** | ✅ kapandı | §7 zaten cevaplıyor: "**Boss refakatsiz gelir**" — aksi hâlde `first` hedeflemesi bütün ateşi refakate yönlendirir. M4'te uygulanacak |
| **S34** | ⚠️ **yeni** | **8 nokta dalga 6'da doluyor, §6 "4-5" diyor.** Ölçüldü: karışık tahta (4 Okçu + 4 Top = 720) dalga 6 başında karşılanabiliyor (gelir 727); en ucuz tahta (8 Okçu = 560) dalga 5'te. Ayrıca **toplam gelir 1614, §6 "~1850" diyor** (%13 düşük). İki sapmanın da sebebi aynı: harita 1 kadrosu şu an 3 düşman; Harpi (9 altın) ve Ogre Şef (60 altın) M4'te giriyor. **M4'te yeniden ölçülecek** |
| **S35** | ⚠️ **yeni** | **Yükseltme M3'e alındı.** Plan "Olmayan: Tier 2-3" diyordu ama aynı taşın bitiş durumu "harita bitirilebiliyor" istiyordu. Ölçüm: T2 dahil tahta 19/20 canla bitiriyor, **yalnız T1 ile 30 sızıntı → oyun kayıp**. İki plan maddesi aynı anda doğru olamıyordu; ölçüm karar verdi. T3 dalları M4'te kaldı |

## M4 — Tam set, yükseltme, bilgi paneli

**Dokuzu da kapandı veya varsayılanla uygulandı. M4 bir YENİ denge bulgusu
üretti: S65 — boss payı.**

| # | Durum | Ayrıntı |
|---|---|---|
| **S34** | ☐ varsayılan uygulandı | **Yanma yığılmıyor, yenileniyor.** İkinci Kundakçı vurunca süre sıfırlanıyor, DPS toplanmıyor. Yığılsaydı iki Kundakçı 8 DPS eder ve tek dalın gücü kule sayısıyla üstel büyürdü |
| **S35** | ☐ varsayılan uygulandı | **Yavaşlatmada en güçlüsü kazanıyor.** Buz (%50) varken Barut Fıçısı (%40) vurursa %50'de kalıyor. Çarpımsal yığılma (%50 × %40 = %70) iki kuleyle düşmanı neredeyse durdururdu. Canlı ölçüm: hız çarpanı tam **0,50** |
| **S36** | ☐ varsayılan uygulandı | **Zincir aynı hedefe iki kez sıçramıyor.** Sıçrayabilseydi tek düşmanlı dalgada Yıldırım hasarını üçe katlar ve "kalabalık cevabı" olmaktan çıkardı. Sıçrama yarıçapı **85 px** (kule menzilinin ~yarısı) — dokümanda yok, kodda işaretli |
| **S37** | ☐ varsayılan uygulandı | Şaman iyileştirme yarıçapı **90 px**, `enemies.ts` içinde işaretli. §5 yalnız "8 HP/sn" veriyor. Şaman **kendini iyileştirmiyor** — §5 "yakındaki **düşmanlara**" diyor |
| **S38** | ☐ varsayılan uygulandı | Örümcek yavrusu: §5'te yalnız HP 30 ve hız 90 var. Zırh/direnç/altın/puan **sıfır**. Altın 0 bilinçli: yavrudan altın gelseydi §5'in "altın = 3 × puan" oranı bozulurdu. Puan 0 → dalga bütçesine girmiyor (anne zaten 6 puan) |
| **S39** | ✅ kapandı | Trol yenilenmesi harita çarpanıyla **ölçeklenmiyor**. §5 mutlak hız veriyor. Sonuç: harita 3'te (HP ×2,6) yenilenme oransal zayıflıyor — bilinçli, aksi hâlde HP çarpanının zorluk etkisi nötrlenirdi. Ayrı test var |
| **S40** | ✅ kapandı | **Yükseltme sırasında kule ateş etmeye devam ediyor.** Bekleme sıfırlanmıyor; yalnız hedef düşürülüyor (yeni kademenin menzili farklı olabilir). Kesinti "yükseltme anında sızma" cezası getirirdi ve §6 zaten yükseltmeyi altın başına verimsiz kılıyor |
| **S41** | ✅ kapandı | **T3 dalı geri alınamıyor.** Değiştirmek için satmak gerekiyor; %30 kayıp bilinçli bedel. Geri alınabilseydi dal seçimi karar olmaktan çıkardı |
| **S42** | ✅ kapandı | Bilgi panelindeki düşman şeridi **o haritanın kadrosunu** listeliyor (`MapDef.enemyRoster`). Hepsini listelemek oyuncuya henüz görmediği düşmanları gösterirdi |
| **S65** | ⚠️ **yeni** | **Boss tam sınırda.** Muhafazakâr tahtayla tavan 761, boss **%92,0** → %15 payı **tutmuyor**; gerçekçi tahtayla (erken başlatma kullanılmış) 818, **%85,6** → tutuyor. Tasarım bandı %75-85'in 0,6 puan üstünde. Sebep: Büyü T1 100 altın (Okçu 70), noktaları doldurmak pahalılaştı. Boss **öldürülebilir** — canlı ölçümde 700 → 18 HP |

## M5 — Kışla, askerler, yetenekler

**Yedisi de kapandı veya varsayılanla uygulandı. M5 üç YENİ soru üretti
(S66, S67, S68) ve bir denge bulgusu (S69).**

| # | Durum | Ayrıntı |
|---|---|---|
| **S43** | ✅ **KAPANDI (`M11` Faz 3) — kalkan YOK** | **Soru "kalkan kaç olmalı" değil, "hangi kalkan gerçek bir seçim doğurur" diye soruldu; cevap: hiçbiri.** Üç ölçüm: **(1) seçim zaten var** — kalkansız hâlde altı senaryoda katkı (kışlasız tabana göre) Paladin kesintisiz baskıda 328'e 174, zırhlıda 29'a 5, hızlıda 207'ye 133; Haydutlar sürüde 254'e 186, dalgalıda 855'e 608, yani 4-2'lik gerçek bir bölüşme. **(2) hiçbir kalkan değeri bunu çevirmiyor** — 0/20/40/60/100 tarandı, kazanan senaryolar aynı kaldı, yalnız Paladin'in payı büyüdü (seçim üretmiyor, üstünlüğü artırıyor). **(3) kalkan = can, başka adla** — HP + kalkan toplamı 140'ta sabitlenip dağılım kaydırıldığında (140+0 … 60+80) bütün ölçümler **birebir aynı**. Dövüşler arasında dolan bir kalkan bile uygulanıp doğrulandı (90 sn'lik koşuda 5 kez doldu, Paladin seyrek akında hiç can kaybetmedi) ve engelleme süresini yalnız %5-15 oynattı. Yani kalkan, oyuncunun kararını değiştirmeyen **görünmez bir mekanik** olurdu — `M11`'in tam olarak temizlediği şey. Kod geri alındı, §4.4'ün "11 + kalkan" satırı düzeltildi, kilit `systems/kislaDali.test.ts`. **S90 ile aynı sınıf: olumsuz sonuç da sonuçtur** |
| **S44** | ☐ varsayılan uygulandı | **Kaçınma ÇARPIMSAL, rastgelelik yok.** §4.4 "kaçınma %25" diyor, anlamını söylemiyor. Olasılıksal ("%25 ihtimalle iptal") ile çarpımsal (`×0,75`) **sürekli hasarda beklenen değer olarak özdeş** — saniyede 60 kare varsa 60 zar atılıyor ve varyans zaten sıfıra çöküyor. Çarpımsal biçim aynı sonucu `Math.random()` olmadan veriyor; testler belirlenimci kalıyor. `S56`'da kritik vuruş tam bu gerekçeyle çıkarılmıştı |
| **S45** | ✅ kapandı | **Toplanma noktasına yürüyen asker engelleme yapmıyor** (kural 7) ve saldırıya da uğramıyor — düşman taraması bile yapılmıyor. Aksi hâlde diriliş döngüsü kilitlenebilirdi: asker doğar doğmaz ölür, yeniden doğar, yine ölür |
| **S46** | ✅ kapandı | **Kışla satılınca askerler anında havuza dönüyor.** `Pool.release` → `resetSoldierState` kilidi **iki taraflı** kırıyor, yani engellenen düşmanlar aynı karede serbest kalıyor. Tek taraflı temizlik düşmanı ölü bir askere kilitli bırakır ve sonsuza kadar durdururdu |
| **S47** | ✅ kapandı | **Takviye askerleri engelleme YAPIYOR** — kışla askeriyle aynı dokuz kural. Ayrı bir "engellemeyen asker" kavramı dokuz kuralın hepsine dal eklerdi. Canlı doğrulandı: çağrılan iki asker anında `fighting` durumuna geçti |
| **S48** | ☐ varsayılan uygulandı | **Meteor uçanları da vuruyor.** §8 belirtmiyor. Vurmasaydı harpi sürüsüne karşı elde yalnız iki kule ailesi kalırdı ve §5'in "Harpi sürüsü → Okçu + Büyü" satırı tek cevaba düşerdi |
| **S49** | ✅ kapandı | **Beklemeler haritalar arası sıfırlanıyor** (`AbilitySystem.reset()`, `create()` içinde). Sıfırlanmasaydı bir haritayı yetenek harcamadan bitiren oyuncu bir sonrakine avantajla girerdi ve "her harita kendi içinde dengeli" varsayımı bozulurdu |
| **S66** | ⚠️ **yeni** | **Düşmanın askere verdiği hasar dokümanda HİÇ YOK.** Ne §4.4 ne §5 veriyor; §5 düşman tablosunda saldırı gücü sütunu yok. Bu sayı olmadan kural 3 yazılamıyor. **Uydurulmadı, türetildi:** `K = 45 HP / 8 sn / 1 puan = 5,625 DPS/puan` — §4.4'ün T1 satırından (45 HP, 8 sn diriliş) ve §5'in zaten kullandığı puan ölçeğinden (`altın = 3 × puan`). Boss formüle girmiyor; kural 9 onu ayrı tutuyor |
| **S67** | ⚠️ **yeni** | **Asker hasarının tipi ve zırhla ilişkisi dokümanda yok.** Fiziksel kabul edildi (§3'te üç tip var, `true` yalnız yeteneklerde, asker büyü yapmıyor). Zırh **saniyelik** rakama uygulanıyor, kare başına değil: kare başına uygulansaydı 60 FPS'te her tık `dps/60 ≈ 0,08` olurdu, zırh 4 onu her seferinde %15 tabanına düşürürdü ve zırh sonsuz güçlü çıkardı. Regresyon testi var |
| **S68** | ⚠️ **yeni** | **Asker yürüme hızı dokümanda yok.** `45 px/sn` — kadronun en yavaşından (boss 28) hızlı, en hızlısından (Kurt Binicisi 110) yavaş. Ork Savaşçı'nın hızıyla aynı, yani §5 tablosundan alınmış bir sayı; uydurma değil |
| **S69** | ⚠️ **yeni bulgu** | **Kışlanın yeri, kışlanın kademesinden önemli.** Canlı ölçüm (aynı tahta, tek fark kışlanın noktası): en yüksek kapsamalı noktaya kurulunca **0/20 can (kayıp)**, en düşük kapsamalı noktaya kurulunca **19/20 ★★**, hiç kurulmayınca **20/20 ★★★**. Kışla kapsamayı kullanmıyor, ama işgal ettiği nokta bir kuleyi dışarıda bırakıyor. Harita 1'de T2 kışla doğru yerde bile ~1 can maliyetli. M7'de haritalara **kışlaya uygun düşük kapsamalı nokta** koymak gerekiyor |

## M6 — Sanat, juice, ses

**S53, S54, S55 kapandı** (juice kod katmanı). **S50 kapandı 2026-08-16**
(üretim de bitti, karar zaten kapalıydı). S51, S52 **hâlâ açık** — ikisi de
insan üretimi gerektiriyor ve `M6-T11`'i bekletiyor.

| # | Durum | Ayrıntı |
|---|---|---|
| **S50** | ✅ **kapandı (2026-08-16)** | **Sanat yönü.** Karar "özgün silüet" — koyu mürekkep silüet + tek vurgu + altın kontur. Üretim de bitti: 3 arka plan, HUD çerçevesi (`ParchmentFrame`, 9-slice), 16 kule silüeti, 9 düşman silüeti + boss + asker. `M6-T02`, `T03`, `T04`, `T05`, `T06` koda bağlandı (`5401d58`, `4ea71a6`) |
| **S51** | ✅ **kapandı (2026-08-16)** | Ses efektleri — 12/12 üretildi (ElevenLabs Sound Effects, AI üretim), `ffmpeg-static` ile `.m4a`'ya çevrildi, koda bağlandı. `.ogg` yok (tarandı: **0** dosya) |
| **S52** | ✅ **kapandı (2026-08-16)** | Müzik — 2/2 üretildi (Suno/Udio, AI üretim), `ffmpeg-static` ile `.m4a`'ya çevrildi. `music_menu` açılışta, `music_game` `wave:ended` (dalga 1) ile tembel yükleniyor (`assets/lazy/`) ve devreye giriyor |
| **S53** | ✅ kapandı | **Efekt yoğunluğu ÜÇ kademe:** kapalı / düşük / tam (çarpan 0 / **0,4** / 1). İki kademe `prefers-reduced-motion`'ı ikili bir anahtara indirir ve §10'un "varsayılanı **düşük** yapar" cümlesinin karşılığı kalmazdı — "düşük" ancak arada bir kademe varsa var olabilir |
| **S54** | ✅ kapandı | `prefers-reduced-motion` → **`low`**, `off` değil: medya sorgusunun adı `reduce`, `disable` değil. Ekran sarsıntısı **kapatılıyor** (sarsıntının "azaltılmış" hâli yok), ses değişmiyor (ses hareket değil). **Oyuncunun açık seçimi sistem tercihini eziyor** — ayrı test |
| **S55** | ✅ kapandı | **Ekran sarsıntısı 2× hızda AÇIK kalıyor**, hit-stop'un aksine. §10 hit-stop için açıkça "kapalı" diyor, sarsıntı için demiyor. Sarsıntı okunurluğu bozmuyor: kamerayı en çok 8 px oynatıyor ve süresi zaten oyun zamanıyla yarıya iniyor. Hit-stop ise **akışı durdurduğu** için 2×'te asıl sorunu o çıkarıyor |

## M7 — Harita 2-3, denge geçişi, yayın

**Beşi kapandı, biri açık kaldı (S61 — portal SDK, itch.io için gerekmiyor).
M7 dört YENİ soru/bulgu üretti: S70, S72, S73 (kapandı) ve S74 (işaretlendi,
Kısıt B ile doğrulanıyor).**

| # | Durum | Ayrıntı |
|---|---|---|
| **S57** | ✅ kapandı | Harita 2-3 koordinatları **kapsama hedefinden türetildi** (M1'in yöntemi). Ayrık yolda bant **kol başına** ölçüldü — toplam ölçüm yanıltıcı, iki kol ortak gövdeyi paylaşınca aynı fiziksel yol iki kez sayılıyor (ilk denemede harita 2 toplamda 487,5 çıkmıştı). Ölçülen: h2 her iki kol 299,8 px, h3 her iki kol 291,3 px — beşi de 285-311 bandında |
| **S58** | ✅ kapandı | `spawnPoint` **sabit ve veride yazılı**, rastgele veya dönüşümlü değil. Gerekçe: rastgele dağılım Kısıt A'yı doğrulanamaz yapardı (hangi kolun tavanına bakılacağı belli olmazdı) ve oyuncunun okuyabileceği bir örüntü yerine ezberlenmesi gereken bir sıra çıkardı |
| **S60** | ✅ kapandı | `SaveData = { version: 1, stars: Record<mapId, 0\|1\|2\|3> }`. Tek anahtarda (`kale-nobeti-save-v1`) `Settings` ile birlikte yaşıyor; ikisi de yazarken diğerinin alanını koruyor. Bozuk JSON ve bilinmeyen sürüm sıfırdan başlatıyor, çökmüyor |
| S61 | ☐ açık kaldı | Portal SDK entegrasyonu **yapılmadı** — itch.io yayını için gerekmiyor, portal başvurusunda eklenecek |
| **S62** | ✅ kapandı | Harita kilidi **yalnız bitirmeye bağlı**, yıldız şartı yok. İlk harita hep açık; sonrakiler bir öncekinin ★ olsun yeter, kaç yıldız olduğu önemsiz |
| **S70** | ⚠️ **yeni, kapandı** | **Dalga bitiş bonusu artık harita altın çarpanıyla çarpılıyor.** §9 çarpanı "altın/HP oranı düşmesin" diye koymuş ama üç gelir kaleminden yalnız birine (öldürme altını) uyguluyordu. Ölçülen gelir çarpanı ×1,33 / ×1,85 idi, HP ise ×1,6 / ×2,6 |
| **S72** | ⚠️ **yeni, kapandı** | **Başlangıç altını da çarpanı izliyor** (280 × altın çarpanı). §9 tablosu 280/340/400 diyordu; 340 ve 400 çarpanı izlemiyordu (×1,21 / ×1,43). Ölçülen etki: dalga 1 sızıntısı h2'de 4→0, h3'te 7→0 |
| **S73** | ⚠️ **yeni, kapandı** | **Altın çarpanı HP çarpanından ayrıştı** — harita 3'te 2,6 → 3,8. §9 "eşit" diyordu; ölçüm eşitliğin harita 3'te kendi gerekçesini karşılamadığını gösterdi (12 nokta tam yükseltilemiyordu, tahta 3820'de takılıyordu). Tarama: 3,8'de tahta maliyeti **doyuyor** (üstü fazladan kule almıyor) — sayı seçilmedi, tam yükseltme noktası olarak ölçüldü |
| **S74** | ⚠️ **yeni, işaretlendi** | **Kısıt A kışlayı modellemiyor.** Formül yalnız kulelerin hasarını topluyor; §5'in cevabını kışla olarak verdiği düşmanlar (Trol) için tavan sistematik düşük çıkıyor. Çözüm Kısıt A'ya asker DPS'i eklemek **değil** — `research/01` §2'nin yerleşimden bağımsızlık özelliğini bozardı. `KISLA_ILE_DOGRULANAN` listesiyle işaretlendi, doğrulaması Kısıt B'de. Ölçüm bir yan bulgu da verdi: harita 3'te en çok sızan düşman Trol değil **Ork Savaşçı** (×11) çıkmıştı — S73 bunu da düzeltti |

## Taşlara bağlı olmayan

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| **S64** | **Harita başına tamamlama ve bırakma noktası nasıl ölçülecek?** `ROADMAP.md` "v1 sonrası karar noktası" teşhis matrisi üç metriğe dayanıyor: ortalama oturum, harita başına tamamlama, nerede bırakıldığı. Portal panelleri ilk ve son metriği veriyor ama **harita/dalga kırılımını verdikleri doğrulanmadı** (`research/05` yalnız `gameplayStart`/`gameplayStop` ve Data modülünü belgeliyor). Vermiyorlarsa kendi sayacımız gerekir — ama **kendi sunucumuz yok**, yani sayaç `KeyValueStore`'a yazıp bir sonraki açılışta portala mı gönderecek? | `M7-T11` ve v1 sonrası karar | **Yok.** M7'de portal panelini aç, ne verdiğine bak, sonra karar ver. Vermiyorsa karar matrisi iki metrikle çalışır (oturum + dönüş) — daha kaba ama kullanılabilir |
| **S75** | **Harita adları çevrilecek mi?** (`docs/plan/iyilestirme/Y03-i18n-sizintisi.md`) `LevelSelectScene`'in `'Değirmen Geçidi'`/`'Taş Köprü'`/`'Kül Ovası'` sabitleri kodun içindeydi. Özel isim mi (Paladin gibi evrensel), yoksa çevrilecek anlatı metni mi? | i18n Adım 2 (2026-08-28) | **Çevrilecek.** Özel isim değil, tanımlayıcı anlatı metni (Kingdom Rush'ın "Vez'nan Castle" gibi haritaları da çevrilir). `strings.ts`'e `mapDegirmenGecidi`/`mapTasKopru`/`mapKulOvasi` olarak taşındı; `en` karşılıkları Adım 3'te (dil seçim arayüzüyle birlikte) doldurulacak. **✅ Uygulandı (2026-09-13, i18n Adım 3):** `Mill Pass` / `Stone Bridge` / `Ash Plain` |
| **S76** | ✅ **Kapandı (2026-09-13, i18n Adım 3).** **Evet, çevrildi.** Alan `branchName: string` → `branchNameKey: StringKey`: değer hâlâ `data/towers.ts`/`data/barracks.ts` içinde **veri** (TIER 1 kural 1 korundu), metin `strings.ts`'te ve çevrilebilir. İki çeviri ürün kararıydı: `Kundakçı` → `Incendiary` ("arsonist" kişiyi anlatıyor, kule dalı adı olarak tuhaf kaçıyor), `Buz` → `Frost` (`Ice` değil — tezhip tonu). `scripts/kurallar.mjs` dal adını `STRINGS.tr`'den çözüyor, etkin dilden DEĞİL — `KURALLAR.md` Türkçe bir denge referansı; doğrulaması **diff'in boş çıkması** oldu. `guard-rules.mjs` k.12'nin `data/`'yı taramama istisnası artık gereksiz değil ama zararsız: orada Türkçe dize kalmadı. Ayrıntı: `iyilestirme/Y03-i18n-sizintisi.md` Sonuç |

> S63 ve S64 bu oturumun denetiminde bulundu, taş planlarından çıkmadı.
> **S63 kapandı** — dil haritası, `M0-T03`'te kuruluyor.
> S64 M7'ye kadar beklenebilir — ama beklemek, karar matrisinin üç ayaktan
> ikisiyle çalışması demek.

---

## Cevap döngüsü

```
soru cevaplanır
  → cevap KAYNAK DOKÜMANA işlenir (GAME-DESIGN.md / CLAUDE.md)
  → burada "☑ cevaplandı → <dosya> §<bölüm>" işaretlenir
  → koddaki // GEÇİCİ — S<nn> işaretleri kaldırılır
  → bloke test varsa it.todo → gerçek teste çevrilir
```

**Cevap bu dosyada bırakılmaz.** Tek doğru kaynak `CLAUDE.md` ve
`GAME-DESIGN.md` (`plan/README.md` Açık soru döngüsü).

## M10'un ürettiği bulgular

| # | Durum | Bulgu |
|---|---|---|
| **S79** | ⚠️ **yeni, kapandı** | **Harita 4'ün buz kalkanı = 25.** `M10-T03` haritaya bir yeni mekanik ekledi (kadro ölçümü: harita 4 ve 5 **sıfır** yeni düşman/mekanik tanıtıyordu). Sayı uydurulmadı, taranarak bulundu — referans tahtaya karşı: kalkan 0 → 10 sızıntı, 15 → 10, **25 → 11**, 40 → 11, 60 → 13. 15 ve altı hiçbir şeyi değiştirmiyor (mekanik görünür ama sonuçsuz), 60 sızıntıyı %30 artırıyor. **25 = mekaniğin sonucu değiştirdiği en küçük değer.** Taşıyıcı da ölçülerek seçildi: ilk deneme Kurt Binicisi'ydi ve harita 4'ün 80 düşmanının yalnız 5'i o (%6) — mekanik neredeyse hiç görünmüyordu; Ork Savaşçı %22 ile haritanın omurgası |
| **S80** | 🔴 **yeni, kapandı — CİDDİ** | **Canlı oyun ile denge simülasyonu FARKLI boss dövüşüyordu.** `waveSim` düşmanı `getEnemyForMap` (haritaya duyarlı, `bossScaling` türetmesini uygulayan) ile çözüyordu; `GameScene` ham `getEnemy` ile. Ölçülen fark: `tas-kopru` 1120 HP/zırh 10 yerine 712/5 · `kul-ovasi` 1820/10 yerine 1023/2 · `kar-gecidi` 3080/10 yerine 1933/2 · **`kadim-harabe` 4760/10 yerine 2675/2**. Yani her boss ölçümü oyuncunun hiç dövüşmediği bir boss'u ölçüyordu ve oyuncu **1,6–1,8 kat** daha canlı, **5 kat** daha zırhlı bir boss'la karşılaşıyordu. `bossScaling.ts`'in kendi yorumu sözleşmeyi yazmıştı (*"doğum yolu bu fonksiyondan geçtiği sürece hem oyun hem `simulateWave` aynı boss'u görüyor"*) — canlı yol o fonksiyondan geçmiyordu. `referenceBoards.ts`'in `BOSS_HP_BEFORE_NERF = 2200` kaydı bu hata sınıfını "projenin en pahalı hatası" diye anıyor; bu onun sessiz ve daha büyük nüksü. **`M10-T03` sırasında, kalkanın canlı oyunda görünmemesi üzerinden bulundu** |

| **S81** | ⚠️ **yeni, kapandı** | **`waveSim` düşman yeteneklerini HİÇ simüle etmiyordu.** Şaman iyileştirmiyor, Trol yenilenmiyor, Örümcek Ana bölünmüyordu — yani M3'ten beri her denge ölçümü sistematik olarak **iyimser**di. S80 ile aynı hata sınıfı (oyun ve sim farklı şey çalıştırıyor), bu kez düşman tarafında. Düzeltildikten sonra ölçülen fark (can kaybı, gerçekçi referans tahta): harita 2 `6→8` · harita 3 `8→14` · harita 4 `11→15` · harita 5 `13→18`. Bu tek değişiklik **üç kabul testini birden düşürdü** ve aşağıdaki iki sayıyı gerektirdi |
| **S82** | ↩️ **GERİ ALINDI (S86)** | ~~Harita 3 HP çarpanı 2,6 → 2,5.~~ Bu sayı `waveSim`'in **hâlâ eksik** olduğu bir anda türetildi (süreli etkiler kapalıydı). Üç körlük de kapanınca 2,6 ölçütünü zaten karşılıyor (Zor'da 6 can). Orijinal: **Harita 3 HP çarpanı 2,6 → 2,5.** S81'den sonra harita 3 Zor'da (can 12) **14 can** kaybediyordu, yani `difficulty.ts`'in "öğrenme yayı Zor'da geçilebilir" ölçütü düştü. İki ölçüt birden tutmalıydı: Zor'da < 12 **ve** zorluk monoton (h2 < h3 < h4). Tarama: 2,6 → 14 ✗ · 2,55 → 12 ✗ · **2,5 → 11 ✓** · 2,45 → 10 ✓ · 2,4 → 8 ✗ (harita 2 ile eşit). 2,5 iki ölçütü de karşılayan en küçük değişiklik. `GAME-DESIGN` §9 tablosu güncellendi |
| **S83** | ⚠️ **yeni, kapandı** | **§5'in Şaman tavsiyesinin yarısı TERSİNE döndü.** §5: *"Şaman → Keskin Nişancı (`last` ile arkadan seç)"*. İyileştirme modellenince ölçüm (6 şaman, 0,6 sn): 8 kule T2 bile **sıfır** şaman öldürüyor — karşılıklı iyileştirme T2 okçuyu tümden yeniyor, yani "Keskin Nişancı" (T3 patlayıcı vuruş) tavsiyesi yalnız doğru değil **zorunlu**. Ama 6 kule T3'te `first` altısını da öldürüyor, `last` yalnız ikisini: odağı dağıtmak iyileştirme hızının altına düşüyor. **`last` artık kötü seçim.** §5'in cümlesi bir sonraki denge turunda güncellenmeli |
| **S84** | ↩️ **GERİ ALINDI (S86)** | ~~Kolay hpScale 0,85 → 0,75.~~ Aynı sebep: yarım simülasyonda türetildi. Tam simülasyonda 0,85 ile en kötü harita 6 can kaybediyor (sınır 10). Orijinal: **Kolay hpScale 0,85 → 0,75.** S81'den sonra Kolay'ın kendi ölçütü ("beş harita da bol payla geçiliyor", can kaybı ≤ 10) harita 5'te düştü (13). Tarama: 0,85 → h5 13 ✗ · **0,75 → h5 5 ✓** · 0,65 → h5 2 (neredeyse sızıntısız). 0,75 ölçütü karşılayan en büyük adım |
| **S85** | ⚠️ **yeni, kapandı** | **Harita 5'in ikinci evresi: eşik %50, hız ×1,6.** `M10-T03`'ün ikinci yarısı — harita 5 de sıfır yeni mekanik tanıtıyordu. Ogre Şef canı yarıya inince hızlanıyor; hız seçildi çünkü yeni sanat gerektirmiyor ve **gözle görünüyor** (28 → 45 px/sn). Ölçülen tarama (harita 5, referans tahta): taban Zor 18 · ×1,6 → 16 · ×1,7–1,8 → 15 · **×1,9+ → 25 ve Kolay 15** (Kolay'ın ≤ 10 ölçütü düşüyor). 1,8 son güvenli değer ama tam kenarda; 1,6 iki adım içeride. Eşik 0,35 ile 0,5 arasında ölçülebilir fark çıkmadı, 0,5 seçildi çünkü can çubuğundan okunabilen tek nokta. **Dürüstlük notu:** ölçüm evrenin haritayı zorlaştırmadığını gösteriyor (18 → 16) — amaç zorluk değil **his**; dengeyi bozmadığı ölçüldü. Durum tutulmuyor, hız her karede can oranından türetiliyor (kural 3'ün havuz tuzağı doğmuyor) |
| **S86** | ⚠️ **yeni, kapandı** | **`waveSim` süreli kule etkilerini de simüle etmiyordu.** S80 (haritaya duyarlı boss) ve S81 (düşman yetenekleri) ile aynı hata sınıfının **üçüncüsü**: `ProjectileSystem`'e `onEffect` geri çağrısı hiç verilmiyordu, yani **yanma ve yavaşlatma hiç uygulanmıyordu**. Kundakçı'nın yanması (9 hasar + 4/sn × 4 sn = vuruş başına 16 ek hasar) ve Buz dalının yavaşlatması hiçbir denge ölçümünde yoktu. Kapatılınca Zor'daki can kaybı: h2 `8→8` · h3 `14→6` · h4 `15→5` · h5 `18→10`. **Bu, S82 ve S84'ün geri alınmasını gerektirdi** — ikisi de yarım simülasyonda türetilmişti. **Ders:** ölçüm aracı düzeltilirken bütün körlükler kapanmadan sayı türetmek, işi iki kez yapmak demek |
| **S87** | ✅ **KAPANDI — sahip kararı bana bıraktı** | **Zorluk rampası ölçülerek yeniden türetildi.** Üç körlük (S80/S81/S86) kapandıktan sonra ölçülen Zor rampası `0 · 8 · 6 · 3 · 8` çıkmıştı: monoton değil ve harita 4-5 "Zor'da referans tahtadan fazlası" tanımını karşılamıyor. Yeni rampa **`0 · 4 · 7 · 13 · 17`** (Kolay: `0 · 1 · 4 · 7 · 8`). Çarpanlar: h2 `1,6→1,3` · h3 `2,6→3,0` · h4 `4,4→7,2` · h5 `6,8→10,0`. **Harita 2 DÜŞTÜ** — ölçüm onun konumuna göre fazla zor olduğunu gösterdi (20 canın 8'i, ikinci haritada); rampayı yalnız yukarı itmek öğrenme yayını daha da sertleştirirdi. **Harita 4-5'te altın çarpanı HP ile BİRLİKTE yükseldi:** ilk deneme yalnız HP'yi yükseltip S73'ün değişmezini deldi (*"altın çarpanı HP'den az olamaz"*), değişmez haklıydı — altın referans tahtanın karşılanabilirliğini belirliyor. Altın da yükselince tahta güçlendi ve HP hedefi 5,6→7,2 · 8,0→10,0'a çıktı; ikisi birlikte tarandı. Boss HP'si etkilenmiyor (`bossFor` mutlak hedefi çarpana bölüyor). İki test **gerçek tasarım iddiasına geri döndü** — artık ölçülen değere kilitli değil, monotonluk ve ≥ 12 doğrudan iddia ediliyor |
| **S88** | ⚠️ **yeni, kapandı** | **Kule sinerjisi: yavaşlatılmış düşman fiziksel hasardan ×1,25 etkileniyor.** GameAnalytics'in en iyi TD'leri ayıran dört kaldıracından dördüncüsü bizde yoktu — üç kule etkisi ve üç düşman yeteneği vardı ama hiçbir **etkileşim** yoktu. En küçük hâli ve var olan iki şeyi birleştiriyor: Top'un Barut Fıçısı dalı yavaşlatıyor, Okçu/Top vuruyor. Referans tahtanın harita 3-5'te **dört Barut Fıçısı** kurduğu doğrulandı, yani sinerji gerçekten işliyor. Ölçülen etki (Zor can kaybı): ×1,0 `0·8·6·5·10` · ×1,15 `…·5·8` · **×1,25 `0·8·6·3·8`** · ×1,6 `…·3·4` (harita 5'i yarıya indiriyor, fazla). Yalnız **fiziksel**: Büyü zaten zırhı yok sayıyor (§3), ikisini de güçlendirmek "her kule her kuleyle iyi" demek olurdu ve sinerjinin amacı **seçim** üretmek. Çarpan ham hasara, zırhtan **önce** — sonra uygulansaydı sinerji "zırh delen" bir şeye dönüşüp Büyü'nün işine girerdi. **Not:** sinerji S87'nin açığını 2 can büyüttü; o karar verilirken bu taban kullanılmalı |
| **S89** | ⚠️ **yeni, kapandı** | **Yanma denge modeline ve panele girdi; yavaşlatma bilerek girmedi.** `balanceChecks.effectiveDps` ve `fx/TowerInfoPanel` yalnız `damage × fireRate` hesaplıyordu — ne model ne **oyuncu** yanmayı görüyordu. Panel Kundakçı'yı 12,60, Keskin Nişancı'yı 15,60 gösteriyordu; yanma sayılınca 16,60 oldu, yani ilişki tersine döndü. Yanma **gerçek hasar** (zırhtan geçmiyor, §4.1) ve `applyEffect` süreyi tazeleyip DPS'i toplamadığı için (S34) sürdürülebilir katkı tam `dps` — görev döngüsü `seconds × fireRate`, 1'de doyuyor. **Yavaşlatma DPS'e katılmadı:** hasar değil, değeri "düşman menzilde daha uzun kalıyor" ve Kısıt A'nın `DPS × kapsananYol / hız` formülünde iki kez sayılırdı; oyuncuya **ayrı bir satırda** gösteriliyor. Zincir de 0: tek hedefte hiçbir şey eklemiyor. Panelde yeni **Etki** satırı (`Yanma 4/sn · 4 sn`, `Yavaşlatma %40 · 2 sn`, `Zincir ×3`), metinler `TOWERS`'tan üretiliyor |
| **S90** | ⚠️ **yeni, kapandı — OLUMSUZ sonuç** | **Referans tahtanın dal seçimi türetilmeye çalışıldı, ölçüm REDDETTİ.** Seçim `balanceChecks`'te elle yazılı ("Top'un ilki Barut Fıçısı, sonrakiler Havan; diğerleri T3a") ve iki sorunu vardı: "T3a hasar dalıdır" varsayımı S89'dan sonra yanlış, ve dal dengesi değişse tahta tepki vermiyor. Projenin kendi tavan formülünden (`DPS × kapsananYol`, Kısıt A) türetildi ve rampa ölçüldü: elle `0 · 4 · 7 · 13 · 17` → türetilmiş **`0 · 4 · 14 · 28 · 26`** (monotonluk ve Kolay ölçütü kırılıyor). Türetilmiş tahta belirgin biçimde zayıf, çünkü formül **patlamayı, yavaşlatmayı ve M10 sinerjisini göremiyor** ve `airMultiplier: 0` gibi *kategorik* bir deliği kadro ortalamasına yayıp yumuşatıyor (harpi 10 düşmandan biri, ama harpi dalgasında tahtanın yarısı ölü). Elle yazılı kural formülün göremediği bilgiyi taşıyor — **geri alındı**, gerekçe koda yazıldı. M11 Faz 2 dalları ayrıştırdıktan sonra yeniden denenebilir |
| **S91** | ⚠️ **yeni, kapandı** | **Altı T3 dalı ayrıştırıldı — üçü hiçbir senaryoda kazanmıyordu.** `M11` Faz 1 kararın sahte olduğunu ölçmüştü; Faz 2 dalları yeniden tasarladı. **Okçu:** Kundakçı yanma 4 → **7**/sn, menzil 165 → **195** (kimliği *çok hedef*, yanma hedef başına sabit; Keskin Nişancı *tek sert*). **Top:** Havan yarıçap 70 → **55** ve `airMultiplier` **0 → 0,5**; Barut Fıçısı hasar 30 → **24**, atış 0,6 → **0,9**, yarıçap 65 → **85**, **yavaşlatma kaldırıldı**. İkisinin DPS'i artık eşit (21,6) ve takas tek eksene indi: *menzil ↔ yarıçap*. **Büyü:** Buz hasar 20 → **8**, yavaşlatma %50/2,5 sn → **%30/2 sn**, **patlama 30** eklendi — tahtanın yavaşlatıcısı o. Yapısal gerekçe: Kısıt A `DPS × kapsananYol / hız` ve yavaşlatma **hızı böler**, yani yavaşlatan kule **bütün tahtanın** hasarını çarpıyor; iki dalın biri yavaşlatıp öteki yavaşlatmıyorsa seçim yoktur. Ölçüm (6 senaryo × 3 aile): Okçu 4-2, Top 3-2-1 berabere, Büyü 4-2 — **altı dalın hepsi kazanıyor**, test `systems/dalKimligi.test.ts`. **Bedeli:** referans tahta zayıfladı, üç boss tavanı ve zorluk rampası birden düştü; boss HP 3-4-5 aynı kuralla yeniden türetildi (1023/1933/2675 → **886/1709/2189**) ve HP çarpanları tarandı (2,6/5,2/7,5 → **2,4/4,8/7,0**), altın çarpanları **sabit** — rampa `0 · 4 · 7 · 13 · 15`, Kolay ×0,80 `0 · 0 · 1 · 3 · 7`. Kolay 0,85'ten 0,80'e indi |
| **S92** | ⚠️ **yeni, kapandı** | **Ölçüm körlüğünün dördüncüsü — bu kez `waveSim`'de değil onu ÇAĞIRANDA.** Kolay'ı ölçmenin yolu `MapDef.hpMultiplier`'ı `hpScale` ile çarpmaktı; ama `bossFor` mutlak boss HP'sini **aynı çarpana bölüyor** ve ikisi sadeleşiyor — yani **boss Kolay'da hiç ölçeklenmiyordu**. Canlı oyun öyle çalışmıyor: `GameScene` düşman tanımını çarpansız haritadan çözüyor (`dusmanCoz`) ama doğum çarpanını `map.hpMultiplier × difficulty.hpScale` olarak veriyor, yani boss gerçekte `BOSS_HP × hpScale`. `difficulty.ts` başlığındaki *"HP çarpanı boss'u hiç etkilemiyordu"* cümlesi bu yüzden **ölçüm aracının** davranışını anlatıyordu, oyunun değil — ve o cümle S80'i (canlı ile simin farklı boss dövüşmesi) düzeltirken de fark edilmemişti. `simulateWave`/`simulateAllWaves` artık `hpScale`'i ayrı parametre alıyor ve `GameScene`'in şeklini birebir taşıyor. Etkisi: Kolay ölçümü **gerçekte olduğundan zor** görünüyordu, yani muhafazakâr yönde hatalıydı. **R17'nin dördüncü örneği:** model ile oyunun ayrışması `waveSim`'in *içinde* bitmiyor, onu kuran test yardımcılarında da olabiliyor |
| **S93** | ⚠️ **yeni, kapandı** | **Dal seçimi GÖRÜNMEZ bir takastı — menü yalnız ad ve fiyat yazıyordu.** S91 iki dalı gerçekten ayrıştırdı ama farkı *menzil ↔ patlama* yaptı; oyuncu o iki sayıdan birini bile göremiyordu (panelde patlama satırı yoktu, menüde hiçbir sayı yoktu). Yani dal seçimi ölçümde gerçek, **ekranda zar atışıydı**. İki ekleme: (1) bilgi paneline **Patlama (px)** satırı — patlaması olmayan kulede gri `—`, etki satırıyla aynı desen; panel 294 → 320 px; (2) T3 menüsünde butonların üstünde **iki sabit özet satırı** (`Havan · DPS 21,6 · menzil 230 · patlama 55`), `util/dalOzeti.ts` tarafından `towers.ts`'ten üretiliyor. **Hover değil sabit:** dokunmatikte imleç yok (rol şeridinin `?` düğmesinin var olma sebebi) ve iki satır yan yana karşılaştırılabiliyor. **Ham hasar değil DPS yazılıyor:** Barut Fıçısı'nın 24'ü ile Havan'ın 48'i aynı işi yapıyor, yan yana "24 / 48" oyuncuya yanlış şeyi söylerdi. Kışla dalları (Paladin / Haydutlar) `M11` Faz 3'te aynı deseni aldı: `kislaOzeti` — `Paladin · 2 asker · 140 can · 11 DPS · 6 sn diriliş` |
| **S94** | ✅ **KAPANDI (`M14`'te çözüldü)** | **Ölçüldüğünde `strongest` hiçbir senaryoyu tek başına kazanmıyordu.** Yedi senaryo, metrik **can kaybı** (sızıntı sayısı değil — farklı düşmanın sızma cezası farklı): `weakest` 4 · `last` 3 · `first` 3 · `closest` 1; `strongest` yalnız herkesin berabere kaldığı tek tip dalgalarda paylaştı. `weakest`'in gücü yapısal: anlık cana bakıp yaralıyı bitiriyor, yani öldürme sayısını azamileştiriyor ve sızan **gövde** sayısı düşüyor. **§5'in boss tavsiyesi ölçümle çelişti ve düzeltildi:** tablo "Ogre Şef → `strongest`" diyordu; boss + çete dalgasında `strongest` bütün modlardan **kötü** çıktı, çünkü tavan yetmiyorsa boss'a odaklanmak onu yine öldürmüyor ama 24 goblinin sızmasına izin veriyor. Tavsiye `weakest`/`closest` oldu. Mod'un tunable bir sayısı yok (seçim kuralı, denge sayısı değil), yani doğrudan "düzeltme" mümkün değildi — kaydedildi. **`M14`'te yeniden ölçüldü ve kendiliğinden kapandı:** `M11` Faz 5'in aile dengesi ile `M14`'ün ekonomi düzeltmesi tabloyu oynattı ve `strongest` Örümcek Ana'lı dalgayı **açık ara** kazanıyor (17'ye 19) — anne ölmeden bölünme durmuyor, odağı dağıtmak her anneyi yarım bırakıyor. Beş modun beşinin de artık bir senaryosu var. Ders: ölü görünen bir seçenek bazen **başka bir dengesizliğin gölgesinde** duruyor; onu düzeltince kendi işini buluyor. Kilit: `systems/hedefModu.test.ts` |
| **S96** | ⚠️ **yeni, kaydedildi** | **Takviye artık hiçbir haritada Meteor'u geçmiyor** — ama katkısı duruyor. Faz 4'te harita 5'te Meteor'dan iyiydi (10'a 12); Faz 5 Okçu'yu güçlendirince kuleler o boşluğu kapattı ve tablo şöyle oldu (can kaybı): Taş Köprü yok 4 · Meteor 1 · Takviye 2 · ikisi 0 | Kül Ovası 5 · 5 · 5 · 5 | Kar Geçidi 12 · 8 · 11 · 6 | Kadim Harabe 14 · 11 · 13 · 10. **Meşruiyet sınavı "hangisi daha iyi" değil**: iki yetenek ayrı beklemelerde, yani oyuncu birini seçmiyor, ikisini de basıyor. Doğru soru "ikincisi birincinin üstüne bir şey koyuyor mu" ve cevap evet — ikisi birden her haritada tek başına kullanmaktan iyi. Yine de bir dengesizlik işareti: Takviye'nin **kazandığı** bir senaryo kalmadı. Yayın verisi geldiğinde (kullanım oranları) yeniden bakılacak; şimdi sayı değiştirmek, iki hafta önce türetilmiş bir rampayı üçüncü kez oynatmak olurdu. **`M12`/`M13` güncellemesi: soru kendiliğinden kapandı.** Harita 6'da (Tünelci kadrosu) Takviye Meteor'u **yeniyor** — 9'a 11; engelleme, gömülü aralıktan çıkan düşmanı tam tutması gereken yerde tutuyor. `M13`'te çağıran boss'un Takviye'ye ikinci bir senaryo kazandıracağı düşünüldü ve ölçüm **hipotezi çürüttü**: çağırma Meteor'u öne geçiriyor (10'a 12), çünkü öbeklenen yandaş meteorun tam istediği hedef. Yani Takviye'nin senaryosu **kadrodan** geliyor, boss'tan değil |
| **S97** | ☐ **varsayılan uygulandı** | **Tünelci'nin sayıları §5 tablosunda yok** (`M12` Faz 1). Kadro içindeki konumu "Kurt Binicisi'nden dayanıklı, Ork Savaşçı'dan zayıf" diye seçildi: 90 can, 70 hız, zırh 1, 9 altın / 3 puan (§5'in `altın = 3 × puan` oranı — ilk yazımda 8 yazılmıştı, **test kırdı**). Gömülü aralık `%15`-`%60`: sıfırdan başlasaydı düşman hiç görünmeden gelirdi ve mekanik öğretilemezdi; oyuncu **dalışı görmeli**. Aralığın oran cinsinden olması bilerek — düşman tanımı haritalar arasında paylaşılıyor, piksel taşınamaz. Nihai sayılar `M12` Faz 3'te harita 6'nın rampasıyla birlikte taranacak |
| **S98** | ☐ **varsayılan uygulandı** | **Gömülü düşman dokunulmaz DEĞİL, hedeflenemez.** Patlama ve önceden tutuşmuş yanma değmeye devam ediyor; yalnız `selectTarget` onu aday listesinden çıkarıyor. Alternatif (tam dokunulmazlık) reddedildi çünkü oyuncuya **cevap bırakmıyordu**: "bekle ve izle" bir karar değil. Bugünkü hâlinde üç cevap var — aralığın dışını kapsayan yerleşim, alan hasarı, ve dalıştan önce tutuşturulan yanma. Havadaki mermi de ıskalamıyor (zaten görünürken ateşlenmişti); `ProjectileSystem`'e dokunulmadı |
| **S99** | ☐ **bilinen körlük, bugün sonucu değiştirmiyor** | **Kısıt A gömülü aralığı GÖRMÜYOR** (`M12`). `ceilingA` bir düşman için `DPS × kapsananYol / hız` topluyor; Tünelci yolun %15-%60'ında hedeflenemez, yani o aralıktaki kapsama ona karşı **ölü** ama formül sayıyor. Harita 6'da aralığın içindeki altı nokta toplam kapsamanın yarısından çoğunu taşıyor, yani Tünelci'nin tavanı yaklaşık **iki kat** fazla gösteriliyor. **Bugün hiçbir sonucu değiştirmiyor:** Kısıt A boss türetmesinde kullanılıyor (boss gömülmüyor) ve "hiçbir düşman öldürülemez değil" sağlamasında (Tünelci 558 etkin canla tavanın çok altında). Düzeltmesi `util/coverage.ts`'e yol **alt aralığı** ölçen bir varyant eklemek; gömülü bir düşmanın Kısıt A payı gerçekten bağlayıcı olduğunda yapılacak. Kısıt B (`waveSim`) zaten doğru ölçüyor — mekaniği o çalıştırıyor |
| **S100** | ☐ **varsayılan uygulandı** | **Çağırma sayıları §5'te yok** (`M13`). Harita 6 boss'u canının her **%25**'inde **2 Ork Savaşçı** doğuruyor. Ölçüm (harita 6, referans tahta, Zor can kaybı): düz boss 16 · ork ×2/%25 **18** · ork ×2/%33 21 ✗ · zırhlı ork ×4/%20 32 ✗. Goblin ×3/%25 de denendi (15) ama harita 6 ölçeğinde goblin **tehdit değil** — Top'un patlaması tek atışta siliyor, ekranda olay var kararda yok. `hpStep` 0,25 seçildi çünkü can çubuğundan okunabilen üç nokta veriyor; 0,33 iki büyük dalga demek ve 20 sınırını aşıyor. **İyileşen boss geri saymıyor**: Şaman onu yukarı çekerse `summonsDone` düşmüyor, aksi hâlde iyileştirme-hasar döngüsü sonsuz yandaş üretirdi |
| **S101** | ⚠️ **yeni, kapandı** | **Erken başlatma bonusu altın çarpanını İZLEMİYORDU** — S70'in kaçırdığı kardeş. Öldürme altını, dalga bitiş bonusu (S70) ve başlangıç altını (S72) çarpanı izliyor; bu tek kalem sabit kalmıştı. Ölçülen kaçak: dalga 4-10 boyunca hemen basınca **520 altın**, yani harita 1'de dalga 10'a kadarki gelirin **%32'si**, harita 6'da **%3'ü**. §6 "geç oyunda gerçek bir karar" diyordu, oysa buton geç haritalarda **gürültüye iniyordu**. Ölçekleme `EconomySystem.awardEarlyStart`'a kondu (bütün altın kalemleri tek yerden çarpanı izliyor). **Bedeli:** geç haritaların referans tahtası zenginleşti, rampa `0·3·4·15·14·18`'e düştü ve harita 5 harita 4'ün altına inip monotonluğu kırdı; dört çarpan yeniden tarandı → **`0 · 5 · 8 · 12 · 16 · 18`**. Harita 2'nin HP'si 1,6'da durdu çünkü S73 (altın ≥ HP) 1,7'yi reddetti |
| **S102** | ☐ **ölçüldü, tasarım kolu açık** | **"Erken başlat" bir risk kararı değil, hazır olmanın ödülü.** Kod okundu: `WaveManager.#dalgaBittiMi` saha boşalmadan dalgayı bitirmiyor (`pool.activeCount > 0` iken dönüyor), yani hazırlık aşaması hiçbir zaman düşman varken başlamıyor ve **dalgalar üst üste binemiyor**. Hazırlık süresi de altın getirmiyor (eski `+1/sn` kaldırılmıştı). Sonuç: erken basmanın **hiçbir bedeli yok** — §6'nın "gerçek bir karar" ifadesi düzeltildi. **Gerçek karar hâline getirmenin yolu** dalgaların üst üste binmesi (klasik tür deseni): hazırlık, sahanın boşalmasını değil **kuyruğun bitmesini** beklerdi. Maliyeti küçük değil — `waveSim` dalgaları **ayrı ayrı** simüle ediyor (`simulateAllWaves` her dalga için temiz havuz), yani üst üste binme modele hiç girmiyor; önce sürekli zaman çizgisine geçmek, sonra bütün denge külliyatını yeniden türetmek gerekir. Bu oturumda üç kez türetildi; dördüncüsü ayrı bir taş olmalı |
| **S103** | ⚠️ **yeni, kapandı** | **"Devam et" yolu konsola Phaser hatası düşürüyordu.** `numberFont.ts`'in yorumu *"gerçek akışta bu yarış oluşmuyor, çünkü `LevelSelectScene.preload` zaten `queueGame` çağırıyor"* diyordu ve `M8`'de **doğruydu**. `M10`'un **"Devam et"** düğmesi menüden doğrudan `Game`'e giriyor ve o varsayımı sessizce geçersiz kıldı: font hiç yüklenmemiş oluyor, `Game` ile `Hud` aynı tikte kuyruğa atıyor, Phaser `Texture key already in use: sayilar` **hatası** basıyor. Canlı ölçüm: Seviye Seç yolu **0**, Devam et yolu **1**. Düzeltme `MenuScene.preload`'a `queueNumberFont` — atlasın oraya konma gerekçesiyle birebir aynı desen (tek sahip, önceden yükle). `M8-T01`'de denenen modül düzeyinde bayrak **tekrarlanmadı**: o, `Hud`'un beklemeyi de atlamasına yol açıp oyunu çökertmişti. Doğrulama: yeni sekmede menü → Devam et → harita, konsol **tamamen temiz**. **Ders:** "şu anda oluşmuyor" diye kapatılan bir yarış, yeni bir giriş yolu eklenince geri geliyor; yorumun kendisi bir varsayım ve o varsayım test edilmiyor |
| **S104** | ⚠️ **yeni, ölçüldü — müdahale YOK** | **`CLAUDE.md`'nin 200 düşman eşiği ilk kez ölçüldü.** M0'dan beri yazılı olan *"aynı anda 200 düşmanı aşarsa uzamsal ızgara gerekir"* cümlesi hiç sınanmamıştı. Ölçüm (referans tahta, gerçek dalgalar): kampanya tepesi **7-11** eşzamanlı düşman (en yüksek: harita 1 dalga 9 ve harita 6 dalga 10, 11'er); sonsuz modda tepe **25**'te doyuyor çünkü `ENDLESS_MAX_ENEMIES` bağlayıcı. Yani en kötü hâl havuzun (60) yarısını, eşiğin sekizde birini geçmiyor — ızgara tartışması açılmıyor. Kilit: `systems/olcek.test.ts`, bir dalga tasarımı eşiğe yaklaşırsa kırılır |
| **S105** | ☐ **ölçüldü, oynanan bölgenin DIŞINDA** | **Sonsuz modun dalga bileşimi ~38'den sonra tek bir şablona çöküyor:** 24 trol + her türden bir tane. 50 dalgada 28 farklı bileşim var ama en çok tekrarlanan **21 kez** çıkıyor. Sebep yapısal: bütçe %8 büyüyor ama düşman **sayısı** tavanlı, o yüzden üretici bütçeyi en pahalı düşmanla (Trol, 8 puan) dolduruyor. **Oynanan bölgede değil:** referans tahta harita 1'de dalga **18**'de, harita 5'te dalga **12**'de kaybediyor (sonsuz HP çarpanı uygulanmış ölçüm). Yani çöküş, `data/endless.ts`'in zaten kaydettiği zorluk düzleşmesiyle (~40) aynı bölgede ve aynı gerekçeyle zararsız. Düzeltilecekse tür payı tavanı (`ENDLESS_TYPE_SHARE_CAP`) bütçe üzerinden de bağlanmalı; oynanan bölgede ölçülebilir bir fark yaratmayacağı için **şimdi yapılmadı** |
| **S95** | ✅ **KAPANDI (`M11` Faz 5)** — aile dengesi düzeltildi | **Üç kule ailesinden biri baskın, biri ölü.** `M11` Faz 4'ün en büyük bulgusu. Ölçüm gerçek haritalar, gerçek dalgalar, **maliyet dahil** türetilmiş referans tahta ile yapıldı (tahta tek aileye zorlanıp ekonomi o ailenin fiyatıyla koştu). Can kaybı — Taş Köprü: karışık 4 · Okçu 14 · Top 6 · Büyü **1** · Kül Ovası: karışık 7 · Okçu 23 · Top **7** · Büyü 19 · Kar Geçidi: karışık 13 · Okçu 28 · Top **7** · Büyü 17 · Kadim Harabe: karışık 15 · Okçu 33 · Top **8** · Büyü 34. Yani **yalnız Top kuran oyuncu, modelin "makul oyuncu" tahtasından belirgin biçimde iyi** (harita 4'te 13 → 7, harita 5'te 15 → 8) ve **Okçu her haritada en kötü, üstelik açık farkla**. Sebep: Top'un alan hasarı bedava bir çarpan (S22 — kenar azalması yok), Okçu'nun ise hiçbir çarpanı yok (en düşük DPS, tek hedef; tek üstünlüğü menzil ve düşük fiyat, ama tahtanın bütün noktaları dolduğu için fiyat avantajı yalnız *erken* yükseltmeye dönüşüyor). Patlama kenar azalması uygulanıp tarandı (kenar %100/50/25/0): arayı **kapatıyor ama kapatmıyor** — Top hâlâ önde ve Okçu'ya hiç dokunmuyor, üstelik bütün rampayı sertleştirdiği için boss HP'leri ve harita çarpanları yeniden türetilmeyi gerektiriyor. **Düzeltme (Faz 5):** iki sayı **birlikte** türetildi. (1) Patlamanın bedeli — kenar oranı %35 (S22). (2) Okçu'nun kademe çıktısı hizalandı: T1 6→**8**, T2 10→**14**, Keskin Nişancı 26→**34**, Kundakçı yanması 7→**11**. Okçu'ya yeni bir *çarpan* verilmedi bilerek — yeni çarpan yeni bir mekanik demekti ve `M11`'in dersi görünmeyen mekanik eklememek; ham DPS artık Okçu T2 18,2 · Büyü 18 · Top 18,7, yani aynı bantta. **Sonuç tablosu:** Taş Köprü karışık 4 · Okçu 6 · Top 8 · Büyü **2** | Kül Ovası **5** · 11 · 12 · 23 | Kar Geçidi **12** · 17 · 11 · 29 | Kadim Harabe **14** · 17 · 12 · 39. Yani karışık tahta artık dört haritanın üçünde en iyi, hiçbir aile hepsinde kazanmıyor ve Okçu'nun en kötüsü 33'ten 17'ye indi. **Bedeli:** rampa ve boss HP'leri bir kez daha türetildi — harita 2-3 çarpanları 1,3→**1,5** ve 2,4→**2,6**, boss HP'leri 712/886/1709/2189 → **859/979/1956/2492**. Rampa `0 · 4 · 5 · 12 · 14`, Kolay ×0,80 `0 · 1 · 3 · 9 · 9`. Kilit: `systems/aileDengesi.test.ts` |

---

## Öncelik

Hangi soruların **ne zaman** cevaplanması gerektiği:

| Ne zaman | Sorular |
|---|---|
| M1 başlamadan | S11, S12 (harita koordinatları — yoksa ölçüm anlamsız) |
| M7 başlamadan | S57 (harita 2-3 koordinatları) |
| Sırası gelince | Kalan 52 soru; hepsinin makul bir varsayılanı var |

**M0 için cevaplanması gereken hiçbir soru kalmadı.**

## Takvim

S50 kapandığına göre toplam artık tahmin edilebilir:

| Aşama | Takvim |
|---|---|
| M0-M5 (kod) | ~15,5 gün → **3 hafta** |
| M6 (sanat + juice + ses) | **3-4 hafta** |
| M7 (harita 2-3, denge, yayın) | ~6 gün → **1-1,5 hafta** |
| **Toplam** | **7-9 hafta** kesintisiz çalışmayla |

`ROADMAP.md`'nin "gerçekçi 10-14 hafta" notu yarı zamanlı çalışmayı
varsayıyor. İkisi çelişmiyor — biri odaklanmış hafta, diğeri takvim haftası.

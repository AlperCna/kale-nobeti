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
| **S22** | ☐ varsayılan uygulandı | Patlama hasarı merkeze uzaklığa göre **azalmıyor**. M3 denge sağlamaları bu varsayımla koşacak; değişirse Top ailesinin tavanı değişir |
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
| **S43** | ☐ varsayılan uygulandı | **Paladin kalkanı YAZILMADI.** §4.4 yalnız "11 + kalkan" diyor, sayı yok. `shield` alanı tanımlı ama `undefined`; kalkan uygulanmıyor. Paladin şu an yalnız 140 HP ve 11 DPS'iyle ayrışıyor. Ayrı test bunu koruyor: uydurulmuş bir kalkan değeri girerse kırılır |
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

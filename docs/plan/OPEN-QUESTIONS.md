# Açık sorular

## Bloke edici soru kalmadı

56 sorunun makul bir varsayılanı var ve varsayılanla ilerlenebilir.
Bunları tek tek çözmeye çalışmak iki gün kod yazmamak demek.

| Durum | Sayı |
|---|---|
| ☑ Kapandı | 11 (S01, S02, S08, S14, S25, S26, S27, S50, S56, S59, S63) |
| ☐ Varsayılanla geçilebilir | 53 |
| **⛔ Bloke edici** | **0** |

**Kod yazmaya başlamak için beklenen hiçbir şey yok.**

### Kapanan on bir soru

| # | Nasıl kapandı |
|---|---|
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
| **S50** | **Özgün silüet** seçildi. Birimler koyu mürekkep silüet + tek vurgu + altın kontur; tezhip yalnız çerçeve ve arka planda. Hazır varlık paketi kullanılmıyor. M6 takvimi **3-4 hafta** (`GAME-DESIGN.md` §2 "Üretim seviyesi") |

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
| S06 | `EventBus` M0'da mı kurulsun? `speed:changed` ve `game:paused` olayları onaylanıyor mu? | İki olay `CLAUDE.md`'deki örnek listede yok | `M0-T03` | Kurulur, iki olay geçici işaretli |
| S07 | Hız butonu etiketi TIER 1 k.7'yi nasıl karşılayacak? | **(a) uygulandı** — iki statik `Text`, görünürlük değiştiriliyor. `setText` kod tabanında **hiç** çağrılmıyor (tarandı), yani kuralın önlemek istediği canvas yeniden üretimi doğmuyor. M6'da ikisi tek `BitmapText` olacak | `M0-T09` ☑ | (uygulandı) |
| S08 | Vitest ortamı `node` mu `jsdom` mu? `GameClock`'un Phaser'a dokunan kısmı sahte nesneyle mi test edilecek? | Test yazım şeklini belirliyor | `M0-T01`, `M0-T04` | `node` + sahte sahne nesnesi |
| S09 | `prefers-reduced-motion` M0'da mı okunacak? | TIER 1 k.6 erişilebilirlik tabanı istiyor ama efektler M6'da | `M0-T09` | M6'ya bırakılır |
| S10 | "İlk indirme" tam olarak neyi kapsıyor — `dist/` toplamı mı, ilk oynanabilir ana kadar yüklenenler mi? | Poki 8 MB sınırının ölçüm tanımı | `M0-T10`, `M7-T09` | `dist/` toplamı, varsayım çıktıda yazdırılır |

## M1 — Yol, düşman hareketi, kapsama aracı

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S11 | Harita 1'in waypoint koordinatlarını kim çizecek? | Dokümanda yalnız "tek yol, 2 keskin viraj" var; koordinat yok | `M1-T03` | Geçici yol çizilir, `// GEÇİCİ — S11` |
| S12 | 8 yapı noktasının koordinatları? | Kapsanan yol doğrudan buna bağlı → tüm denge | `M1-T03` | Geçici yerleşim |
| S13 | Köşe davranışı: keskin dönüş mü, köşe kesme (yay) mı? | Kapsama ölçümünü ve yol uzunluğunu değiştiriyor | `M1-T05`, `M1-T02` | Keskin dönüş |
| S15 | "60 FPS" hangi cihazda ölçülecek? | CrazyGames 4 GB Chromebook şartı koyuyor | `M1-T07` kabulü | Geliştirme makinesi |
| S16 | **Harita 1'in yol uzunluğu `L` kaç px?** | `research/01` §3: "hiçbir yerde yazmıyor, kesinleşmesi gerekiyor, çünkü bütün denge buna asılı" | `M1-T03`, `M1-T09` | Çizilen yoldan **ölçülür** ve raporlanır |
| S17 | Düşman nerede doğar — ilk waypoint mi, ekran dışı mı? | Ekran dışıysa görsel olarak daha iyi ama yol uzunluğu değişiyor | `M1-T07` | İlk waypoint |

## M2 — Kule, mermi, hedefleme

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S18 | Yer tutucu bitmap font hangi karakter kümesi? | Hasar sayıları `BitmapText` olmak zorunda ama nihai font M6'da | `M2-T08` | `0-9 + - . %` |
| S19 | Kule seçim menüsü biçimi — liste, radyal, kartuş? | `GAME-DESIGN.md` §2 "altın kartuş" diyor ama seçim menüsü için değil | `M2-T04` | İki butonlu düz liste |
| S20 | **Mermi uçuş hızı kaç px/sn?** | Dokümanda hiçbir yerde yok. Yavaş mermi hızlı düşmanı ıskalar → denge etkisi | `M2-T06` | `600 px/sn`, `// GEÇİCİ — S20` |
| S21 | Mermi havadayken hedef ölürse — kaybolsun mu, son konuma gitsin mi? | Alan hasarlı mermilerde fark yaratıyor | `M2-T06` | Son konuma gider, sönümlenir |
| S22 | Patlama hasarı merkeze uzaklığa göre azalıyor mu? | Top ailesinin gerçek gücünü belirliyor | `M2-T09` | Sabit, azalma yok |
| S23 | Kule dönüş animasyonu var mı? Varsa dönerken ateş edebiliyor mu? | `research/01` "dönüş vergisi" %15-20 etkin DPS kaybı diyor | `M2-T05` | Dönüş yok, anında ateş |
| S24 | Aynı düşmana aynı anda kaç mermi gidebilir? | Sınırsızsa odaklanma kaybı (`research/01` §10) gerçek oluyor; Kısıt B'deki `× 0.75` bunun karşılığı | `M2-T07` | Sınır yok |

## M3 — Ekonomi, dalgalar, denge sağlamaları

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S28 | `SPAWN_K` ve `REST_K` sabitleri | §7 tempo formülünün sayıları yok | `M3-T01`, `M3-T05` | Geçici değer, işaretli |
| S29 | Dalga 1 otomatik mi başlıyor, oyuncu mu başlatıyor? | İlk izlenim ve öğretici akış | `M3-T04` | Oyuncu başlatır |
| S30 | 10 dalganın bütçeden üretilen kompozisyonunu kim rötuşlayacak? | §7 "üretilir ve sonra elle rötuşlanır" diyor | `M3-T02` | Üretilen hali rötuşsuz kullanılır |
| S31 | Kaybetme: can 0 olunca anında mı, dalga sonunda mı? | Anlık kaybetme sert; dalga sonu daha affedici | `M3-T11` | Anında |
| S32 | 3 yıldız için kayıt formatı M3'te mi hazırlanacak? | Eşikler S59'da ama şema erken lazım olabilir | `M3-T11` | M7'ye bırakılır |
| S33 | Boss dalgasında refakat var mı? §7 "refakatsiz gelir **veya** sonra gönderilir" diyor, seçim yapılmamış | `first` hedeflemesi refakati vurursa boss serbest yürüyor (`research/01` §10) | `M3-T02`, `M4-T09` | Refakatsiz |

## M4 — Tam set, yükseltme, bilgi paneli

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S34 | Kundakçı yanması yığılır mı? (4/sn, 4 sn) | İki Kundakçı aynı düşmanı yakarsa hasar iki katı mı | `M4-T04` | Yığılmaz, süre yenilenir |
| S35 | Yavaşlatmalar yığılır mı? (Buz %50 + Barut Fıçısı %40) | Yığılırsa düşman neredeyse duruyor | `M4-T04` | Yığılmaz, güçlü olan uygulanır |
| S36 | Yıldırım aynı hedefe iki kez sıçrayabilir mi? | Tek düşmana karşı 3 kat hasar demek | `M4-T04` | Hayır, her hedef bir kez |
| S37 | **Şaman iyileştirme yarıçapı?** | §5 "8 HP/sn" veriyor, menzil yok. Yarıçap büyükse Şaman dalgayı ayakta tutuyor | `M4-T07` | Geçici değer, işaretli |
| S38 | **Örümcek yavrusunun zırh/direnç/altın/puanı?** | §5 yalnız HP 30 ve hız 90 veriyor. Altın 0 ise bölünme ekonomik ceza oluyor | `M4-T08` | Hepsi `0` |
| S39 | Trol yenilenmesi (6 HP/sn) harita çarpanıyla ölçekleniyor mu? | Ölçeklenmezse harita 3'te (HP ×2.6) oransal olarak zayıflıyor. Aynı soru yavaşlatma/yanma süreleri için de geçerli | `M4-T07`, `M7-T04` | Ölçeklenmiyor |
| S40 | Yükseltme sırasında kule ateş etmeye devam ediyor mu? | Etmiyorsa yoğun dalgada yükseltme risk oluyor | `M4-T03` | Devam ediyor |
| S41 | T3 dalı seçildikten sonra geri alınabilir mi? | Alınabiliyorsa yanlış seçim cezası kalkıyor | `M4-T01`, `M4-T03` | Hayır, yalnız satılabilir |
| S42 | Bilgi panelindeki düşman şeridi hangi düşmanları listeleyecek? | O haritanın kadrosu mu, dokuzu birden mi | `M4-T10` | O haritanın `enemyRoster`'ı |

## M5 — Kışla, askerler, yetenekler

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S43 | **Paladin "kalkan" sayısal değeri?** | §4.4 tablosunda yalnız "11 + kalkan" yazıyor. Paladin ile Haydutlar arasındaki seçim buna bağlı | `M5-T01` | **Yok.** `shield: undefined`, kalkan uygulanmıyor |
| S44 | Haydutlar %25 kaçınma: hasar iptali mi, isabet şansı mı? | İkisi farklı matematik; ortalama aynı ama varyans farklı | `M5-T01` | %25 ihtimalle hasar iptali |
| S45 | Toplanma noktasına yürüyen asker saldırıya uğrar mı? | Uğruyorsa diriliş döngüsü kırılabilir | `M5-T04` | Hayır, yürürken dokunulmaz |
| S46 | Kışla satılırsa askerler ne olur? | Anında kaybolmaları kilitli düşmanları serbest bırakıyor | `M5-T05` | Anında havuza döner |
| S47 | Takviye askerleri engelleme yapıyor mu? | §8 yalnız "2 geçici asker" diyor; engellerlerse yetenek çok güçlü | `M5-T09` | Evet, kışla askeriyle aynı kurallar |
| S48 | Meteor uçanları da vuruyor mu? | §8 belirtmiyor; vurmuyorsa harpi sürüsüne cevap azalıyor | `M5-T08` | Evet |
| S49 | Yetenek beklemeleri haritalar arası sıfırlanıyor mu? | Sıfırlanmazsa harita başında yetenek hazır geliyor | `M5-T07` | Sıfırlanıyor |

## M6 — Sanat, juice, ses

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| **S50** | **Sanat yönü:** (a) Kenney tabanı + özgün UI (~1 hafta, %60 kimlik), (b) özgün silüet (~3-4 hafta, %90), (c) tam tezhip (2-3 ay) | `research/06` §5. **M6'nın tamamını ve takvimi belirliyor.** Pentiment ~13 kişiydi | `M6-T02`, `M6-T03`, `M6-T05`, `M6-T06` | **Yok.** Karar verilmeden M6 başlayamaz |
| S51 | Ses efektleri nereden — kayıt, ücretsiz kütüphane, üretim? | 20 ses efekti; lisans ve tutarlılık | `M6-T11` | CC0 kütüphane |
| S52 | Müzik nereden? | 2 parça, döngülü | `M6-T11` | CC0 kütüphane |
| S53 | Efekt yoğunluğu ayarının kademeleri — kapalı/düşük/tam mı? | `prefers-reduced-motion` hangi kademeye ayarlayacağını belirliyor | `M6-T09`, `M6-T12` | Üç kademe |
| S54 | `prefers-reduced-motion` hangi kademeye ayarlıyor? | §10 "varsayılanı düşük yapar" diyor, kademe belirtmiyor | `M6-T12` | "düşük" |
| S55 | Ekran sarsıntısı 2× hızda kapanıyor mu? | §10 hit-stop için "2×'te kapalı" diyor, sarsıntı için demiyor | `M6-T07`, `M6-T08` | Açık kalır |

## M7 — Harita 2-3, denge geçişi, yayın

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S57 | Harita 2 ve 3'ün waypoint/yapı noktası koordinatları | S11/S12 ile aynı sorun, iki harita için daha | `M7-T01`, `M7-T02` | Geçici yerleşim |
| S58 | Ayrık yolda hangi grup hangi kola gidiyor — rastgele mi, `spawnPoint` sabit mi, dönüşümlü mü? | Kısıt A kol başına hesaplanıyor; dağılım bilinmeden doğrulanamıyor | `M7-T01`, `M7-T02` | `spawnPoint` sabit, veride yazılı |
| S60 | `SaveData` şeması | Sürüm alanı, göç stratejisi | `M7-T05` | `DATA-SCHEMAS.md` §9 taslağı |
| S61 | Portal SDK entegrasyonu M7'de mi, sonra mı? | Poki `gameplayStart`/`gameplayStop` zorunlu kılıyor (`research/05` §1) | `M7-T10`, `M7-T11` | itch.io için gerekmez; portal başvurusunda eklenir |
| S62 | Harita kilidi: yalnız bitirme mi, yıldız şartı var mı? | S59'a bağlı | `M7-T06` | Yalnız bitirme |

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

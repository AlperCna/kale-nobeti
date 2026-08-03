# Açık sorular

Tüm taş dosyalarındaki `AÇIK SORU`'ların tek listesi. **62 soru.**

Her soru için: **neden önemli** · **hangi taşı bloke ediyor** ·
**karar verilmezse varsayılan ne olur**.

> Varsayılanların hepsi kodda `// GEÇİCİ — S<nn>` veya `// BLOKE — S<nn>`
> olarak işaretlenir. Hiçbiri sessizce kararlaştırılmaz.

## Durum

| Durum | Sayı |
|---|---|
| ☐ Cevaplanmadı | 62 |
| ☑ Cevaplandı | 0 |

**Bloke edici 6 soru:** S25, S26, S27 (denge sağlamaları), S50 (sanat yönü),
S56 (kritik mekaniği), S59 (yıldız eşikleri). Bunlar varsayılanla
geçilemiyor — ya cevap gerekiyor ya iş `todo` kalıyor.

---

## M0 — İskelet, saat, aşamalı yükleme

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S01 | Grenze Gotisch + Spectral `woff2` dosyaları nereden, alt kümelemeyi (`latin-ext`) kim yapacak? | Türkçe karakterler `latin` alt kümesinde yok; unutulursa arayüzde kutucuk çıkar | `M0-T05` | Font yolu yer tutucu, sistem serif'e düşülür |
| S02 | Arcade fizik kullanılacak mı? | `research/02` §3 kararı açıkça M0'a bırakıyor. Kullanılmazsa `GameClock`'tan `physics` satırı düşer; M2'de mermi yazılırken geri dönmek pahalı | `M0-T04` | Kullanılmıyor; mermiler elle hareket eder |
| S03 | Duraklatma ekranında ne var — yalnız karartma mı, menü mü? | Ayarlar M6'da; M0'da yer tutucu buton olacak mı | `M0-T09` | Yalnız karartma + "devam" |
| S04 | 2× seçimi kalıcı mı — oturum boyu, harita boyu, yoksa her dalga 1×'e mi dönüyor? | Kalıcıysa `SaveSystem`'e M0'da dokunmak gerekir | `M0-T09` | Oturum boyu, kaydedilmiyor |
| S05 | Menü M0'da ne kadar dolu — yalnız "Oyna" mı, Ayarlar/Seviye Seçim yer tutucuları da mı? | Kapsam şişmesi riski | `M0-T07` | Yalnız "Oyna" |
| S06 | `EventBus` M0'da mı kurulsun? `speed:changed` ve `game:paused` olayları onaylanıyor mu? | İki olay `CLAUDE.md`'deki örnek listede yok | `M0-T03` | Kurulur, iki olay geçici işaretli |
| S07 | Hız butonu etiketi TIER 1 k.7'yi nasıl karşılayacak? (a) iki statik `Text` görünürlük, (b) iki sprite karesi, (c) yer tutucu bitmap font | Kuralın **ilk gerçek çarpışması**. Bitmap font M6'ya kadar yok | `M0-T09` | (a) iki statik `Text` |
| S08 | Vitest ortamı `node` mu `jsdom` mu? `GameClock`'un Phaser'a dokunan kısmı sahte nesneyle mi test edilecek? | Test yazım şeklini belirliyor | `M0-T01`, `M0-T04` | `node` + sahte sahne nesnesi |
| S09 | `prefers-reduced-motion` M0'da mı okunacak? | TIER 1 k.6 erişilebilirlik tabanı istiyor ama efektler M6'da | `M0-T09` | M6'ya bırakılır |
| S10 | "İlk indirme" tam olarak neyi kapsıyor — `dist/` toplamı mı, ilk oynanabilir ana kadar yüklenenler mi? | Poki 8 MB sınırının ölçüm tanımı | `M0-T10`, `M7-T09` | `dist/` toplamı, varsayım çıktıda yazdırılır |

## M1 — Yol, düşman hareketi, kapsama aracı

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S11 | Harita 1'in waypoint koordinatlarını kim çizecek? | Dokümanda yalnız "tek yol, 2 keskin viraj" var; koordinat yok | `M1-T03` | Geçici yol çizilir, `// GEÇİCİ — S11` |
| S12 | 8 yapı noktasının koordinatları? | Kapsanan yol doğrudan buna bağlı → tüm denge | `M1-T03` | Geçici yerleşim |
| S13 | Köşe davranışı: keskin dönüş mü, köşe kesme (yay) mı? | Kapsama ölçümünü ve yol uzunluğunu değiştiriyor | `M1-T05`, `M1-T02` | Keskin dönüş |
| S14 | Kapsama ölçüm adım boyutu kaç px? | Hassasiyet/hız takası; yakınsama testi buna bakıyor | `M1-T02` | `4 px` |
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
| **S25** | **`ReferenceBoard` içeriği:** dalga başına hangi kuleler, hangi noktada, hangi kademe? | `research/01` §11 tanımlanmasını istiyor ama içeriğini vermiyor. **Üç denge testinin tamamının girdisi** | `M3-T07`, `M3-T08`, `M3-T10` | **Yok.** Ekonomi hesabından taslak türetilir, tamamı `// GEÇİCİ — S25` |
| **S26** | **`dalgaSüresi` tanımı** — ilk doğumdan son ölüme mi, dalga penceresi mi? | Kısıt B'nin ikinci çarpanı; tanımsız çarpanla test yazılamaz | `M3-T09` | **Yok.** Test `it.todo` kalır |
| **S27** | **`aktiflikOranı` algoritması** — "kapsanan düz yol parçası"nı sayan yöntem | `GAME-DESIGN.md` §6 oran tablosunu veriyor (%60/%80/%95) ama parçayı sayan algoritma yok | `M3-T09` | **Yok.** Test `it.todo` kalır |
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
| **S56** | **Kritik vuruş mekaniği tanımlı değil.** §3 ve §10 "kritik" hasar sayısından bahsediyor (altın renk, %140 boyut) ama kritik şansı/çarpanı hiçbir yerde yok | Hasar sayısı renk kodunun üçte biri tanımsız | `M6-T10`, geriye dönük `M2-T08` | **Yok.** Kritik yolu ölü kod olarak durur |

## M7 — Harita 2-3, denge geçişi, yayın

| # | Soru | Neden önemli | Bloke | Varsayılan |
|---|---|---|---|---|
| S57 | Harita 2 ve 3'ün waypoint/yapı noktası koordinatları | S11/S12 ile aynı sorun, iki harita için daha | `M7-T01`, `M7-T02` | Geçici yerleşim |
| S58 | Ayrık yolda hangi grup hangi kola gidiyor — rastgele mi, `spawnPoint` sabit mi, dönüşümlü mü? | Kısıt A kol başına hesaplanıyor; dağılım bilinmeden doğrulanamıyor | `M7-T01`, `M7-T02` | `spawnPoint` sabit, veride yazılı |
| **S59** | **3 yıldız eşikleri** (kalan cana göre) | `ROADMAP.md` M7 istiyor, sayı yok | `M7-T07` | **Yok.** Tek yıldız (bitirme), test `it.todo` |
| S60 | `SaveData` şeması | Sürüm alanı, göç stratejisi | `M7-T05` | `DATA-SCHEMAS.md` §9 taslağı |
| S61 | Portal SDK entegrasyonu M7'de mi, sonra mı? | Poki `gameplayStart`/`gameplayStop` zorunlu kılıyor (`research/05` §1) | `M7-T10`, `M7-T11` | itch.io için gerekmez; portal başvurusunda eklenir |
| S62 | Harita kilidi: yalnız bitirme mi, yıldız şartı var mı? | S59'a bağlı | `M7-T06` | Yalnız bitirme |

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
| **M0 başlamadan** | S02 (fizik — imza değiştiriyor), S08 (test ortamı) |
| **M1 başlamadan** | S11, S12 (harita koordinatları — yoksa ölçüm anlamsız) |
| **M3 başlamadan** | **S25, S26, S27** — üçü de denge testlerini bloke ediyor |
| **M6 başlamadan** | **S50** — sanat yönü; M6'nın tamamını ve takvimi belirliyor |
| **M7 başlamadan** | S57, S59 |
| Sırası gelince | Kalan 51 soru; hepsinin makul bir varsayılanı var |

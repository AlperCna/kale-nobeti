# Kapanış — proje durumu (`M167` → `M174`, 2026-10-02)

Sahip projeyi kapattı: *"her şeyi tamamlayalım, bitirelim; baştan sona
kontrol et."* Bu dosya o kontrolün sonucu ve geri dönülürse ilk okunacak
yer. Ayrıntılar kendi adreslerinde; burada yalnız **durum** ve **neyin
bilerek bırakıldığı** var.

## Oyun

Tarayıcıda çalışan, tezhipli el yazması estetiğinde bir kule savunması.
Phaser 3.90 + TypeScript (strict) + Vite.

| | |
|---|---|
| Harita | 6 × 10 dalga + sonsuz mod |
| Kule ailesi | 4 (Okçu · Top · Büyü · Kışla), her biri iki T3 dalıyla |
| Aktif yetenek | 2 (Meteor · Takviye), seviyelenebilir |
| Düşman türü | 11; yedi yetenek türü (yenilenme · bölünme · şifa · yeraltı · susturma · ikinci evre · çağırma) — son üçü harita 4-6'nın bossunda |
| Zorluk | 3 (Kolay'da yalnız bitirme ★ olarak kaydedilir) |
| Dil | Türkçe + İngilizce, eşitlik derleyicide bağlı |
| Başarım | 17 |

## Kapanışta ölçülen durum

| | |
|---|---|
| Kapı (`typecheck · test · guard · build`) | yeşil — **1220 test** (73 dosya), **27/27 bekçi** |
| İlk indirme | **0,83 MB** (hedef ~1,5 MB, Poki sınırı 8 MB) |
| Toplam paket | 5,83 MB (müzik ve harita 2-6 arka planları tembel) |
| Açık tasarım sorusu (`plan/OPEN-QUESTIONS.md`) | **0** |
| Sonuçsuz elle sağlama (`plan/TEST-STRATEGY.md`) | **0 / 20** |
| Kodda `TODO`/`FIXME` | 0 |
| Git | temiz, `main` uzakla eşit |

**Yayın yapısı uçtan uca kontrol edildi** (`M166`): `dist` iç içe bir alt
yoldan sunuldu, 31 isteğin hepsi 200 ve hepsi alt yolun içinde, konsol
çıktısı sıfır, geliştirme kancaları (`__game`, `__kn`) ve kapsama katmanı
yok, oyun etkileşimli. **Altı harita ve sonsuz mod** geliştirme yapısında
tek tek açıldı: her biri kendi arka planıyla, doğru yapı noktası sayısıyla
(8 · 10 · 12 · 12 · 15 · 15) ve sıfır hatayla.

## Bu kapanış turunda bulunan ve düzeltilen kusurlar

Son turlar yalnız belge düzeltmesi değildi; elle sağlamaları ilk kez
koşturmak üç gerçek kusur çıkardı:

- **`M163` — kural 10'un yarısı ilk oturumda düşüyordu.** Oyunu ilk kez
  gizli sekmede açan oyuncu "ilerleme kaydedilemiyor" uyarısını hiç
  görmüyordu: menü atlandığı için `Overlay`'i `GameScene` başlatıyor, ama
  `scene.launch` kuyruğa alıyor ve kırk satır aşağıdaki `isActive()` hâlâ
  `false` dönüyordu. Uyarı artık `Overlay` doğduğu anda çiziliyor.
- **`M157` — Zor'da can kaybı dokuz kat yanlış sayılıyordu.** `RunStats`
  başlangıç canını 20 diye tahmin ediyordu; Zor 12 canla başlıyor.
- **`M158` — TIER 1 kural 1 ihlali.** Bir denge oranı (`BOSS_CEILING_RATIO`)
  sistem dosyasında yaşıyordu; `data/`'ya taşındı ve `data/`'nın yaprak
  katman olması bekçiye bağlandı.

## Oyuncu gibi oynanınca bulunanlar (`M168`-`M174`)

Kapanıştan sonra sahip *"bütün bölümleri gerçek bir oyuncu gibi oyna"*
dedi. Altı harita tarayıcıda baştan sona oynandı (Normal, Kolay ve Zor;
sonsuz mod dalga 15'e kadar; sıfır profille yeni oyuncu akışı; dil
değişimi; duraklatma, yeniden başlatma, satış, kayıttan devam). 1184
testin hiçbirinin görmediği **yirmi bir** kusur çıktı (aşağıdaki tablonun
maddeleri: 5 · 7 · 4 · 2 · 1 · 1 · 1); hepsi düzeltildi, çoğu artık testle
bağlı:

| | Kusur | Ciddiyet |
|---|---|---|
| `M168` | Oynanmamış bir haritada sahte zafer ve yıldız · menüde bayat "alınabilir" boyası · erken başlat düğmesi kule menüsünü örtüyordu · başarım bandı ayar düğmesinin üstünde · ipucu risk satırının üstünde | ikisi ciddi |
| `M169` | **"Devam et" hiç çıkmıyordu**: tur kaydı yalnız boş sahada yazılıyordu ve o an hiç gelmiyordu (artıklar artık yerleri ve canlarıyla kaydediliyor) · geri yüklenen düşmanlar oyunda vardı ama ekranda yoktu · dalga sayacı "3.10" yazıyordu · sol bilgi paneli yetenek fişlerinin altına giriyordu · menü fişlere biniyordu · telgraf menünün köşesine biniyordu · risk satırı yolun üstünde okunmuyordu | ciddi |
| `M170` | **Kül Ovası'nda Büyü'ye basan oyuncu oyunu duraklatıyordu** (menü duraklat düğmesinin altına açılıyordu) — yerleşim saf fonksiyona çıktı, altı haritanın her noktası test ediliyor · duraklatma menüsünden dil değişince menüsüz donuk oyun · dişli ayarları oyun akarken açıyordu · açık zeminde okunmayan etiketler | ciddi |
| `M171` | **Beş haritada yedi yapı noktası hazırlıkta tıklanamıyordu** (dalga telgrafının dokunma hedefleri altındaydı) · Kolay'da üç ekran üç ayrı yıldız söylüyordu | ciddi |
| `M172` | Son haritayı bitirene "Sefer Tamam", son yıldızı alana "Tam Not" açılmıyordu (başarım kaydın önünde değerlendiriliyordu) | orta |
| `M173` | Kazanma ekranındaki "Sonsuz moda devam" turu sürdürmüyor, baştan başlatıyordu — adı artık "Sonsuz mod" | orta |
| `M174` | Erken başlatma ipucu, düğme ekranda yokken (dalga 2) geliyordu | düşük |

Ortak desen yine projenin bilinen kusur sınıfı: **aynı bilgi iki yerde,
biri güncellenmiş.** Yükseltme fişinin yeri (`622` · `KALICI_HUD`),
menünün kaçtığı kutular, telgrafın genişliği ("5 tipe kadar"), sayaç
ayracı (greybox fontundan kalma `.`), "sınırda saha boş" varsayımı,
başarım sırasını tarif eden iki yorum. Kalıcı HUD öğelerinin yeri artık
`data/panelLayout.ts`'te tek adres; HUD, harita testleri ve menü aynı
veriyi okuyor.

`E6b` beşinci kez koşturuldu: toplam dinleyici **34**, beş yeniden
başlatmada sabit (`TEST-STRATEGY`).

## Bilerek bırakılanlar

Hiçbiri oynanışı bozmuyor. Geri dönülürse sıra bu:

1. **Tünelci'nin kendi çizimi yok.** Örümcek Ana'nın karesini kullanıyor
   (`M12` greybox kararı). Örümcek Ana ile yavrusu da yalnız boyutla
   ayrılıyor. Renk değil boyut olduğu için k.6 ihlali değil, ama nihai
   çizimde ilk kapatılacak yer (`TEST-STRATEGY` E14).
2. **T3 harita 1'de görülmüyor.** Referans tahta Değirmen Geçidi'nde T2'yi
   geçmiyor; T3 ilk kez Taş Köprü'nün 9. dalgasında. `M7` kontrol listesi
   bunu istiyordu; denge değiştirilmedi, açık tasarım notu (`ROADMAP` M7
   listesi).
3. **Yapı noktaları harita 1'de dalga 7'de doluyor**, tasarımın "4-5"
   hedefi yalnız harita 2-6'da tutuyor. Öğretici harita bilerek yavaş.
4. **Kar Geçidi'nde 7. dalga nefes almıyor** — ağır 6. dalganın taşması
   onu can kaybettiren bir dalgaya çeviriyor (`M152`).
5. **Karşı-oyun tablosunun yedi satırı tek bir testte bağlı değil**;
   satırlar ayrı testlerde (`TEST-STRATEGY` E8).
6. **İnsanla oynatılmadı** (E19) ve **düşük uçlu cihazda denenmedi** (E17).
   Oyun `M168`-`M174`'te tarayıcıda oyuncu gibi baştan sona oynandı, ama
   bu bir insan oyuncunun yerini tutmuyor; E19 açık işaretli kaldı.
7. **Yayın yok** — sahibin kararı. Mağaza paketi işi başlatılıp
   bırakılmıştı (`M9`); portal kabul şartlarından E17 açık.
8. **Normal'de geç haritalar çok dar** (`M171`, gözlem — karar sahibinde).
   Denge testi referans tahtanın can kaybını `0 · 0 · 9 · 14 · 15 · 18`
   olarak bağlıyor: en iyi oyunla harita 5 beş, harita 6 iki canla
   geçiliyor. Oyuncu gibi oynanınca harita 3, 4 ve 5 Normal'de ilk
   denemede kaybedildi; harita 5, dalga 6'da tamamen T3 olan bir tahtayla
   da son dalgada 17 can kaybetti. Kolay hepsini rahat geçiriyor ve
   kilitleri açıyor. Bir web portalının kısa oturumlu oyuncusu için
   Normal'in eğrisi fazla dik olabilir; değiştirmek dengeyi baştan
   türetmek demek, bu yüzden dokunulmadı.
9. **Sonsuz mod tahtayı sürdürmüyor.** Kazanınca başlatılan sonsuz tur da
   1. dalgadan başlıyor (`M173` yalnız düğmenin adını düzeltti). Tahtayı
   11. dalgaya taşıyan gerçek bir "devam" yeni bir özellik.
10. **Üç haritanın girişi HUD kartının altından geçiyor** (harita 1, 3, 4 —
    `HudScene` başlık notunda bilinçli istisna). Kül Ovası'nda yolun ilk
    ~220 px'i kartın arkasında; düşman kartın kenarından çıkıyor.

## Kalıcı karar: hazırlık sahayı dondurur

En büyük tek denge kararı (`M144`-`M155`, S169): hazırlık sayacı işlerken
sahada kalan düşmanlar yürümüyor. Oyuncu bunu kusur sanıp bildirmişti;
düzeltme uçtan uca ölçüldü ve **bütün karşılaştırmalı denge iddialarının
yönünü** çevirdiği görüldü. Davranış **kural** ilan edildi ve dört yüzeye
yazıldı (sözleşme testi · `GAME-DESIGN.md` §6 · oyuncu metni · kod). Bu
kuralı kaldırmak bir hata düzeltmesi değil, dengeyi baştan türetmek demek.

## Geri dönülürse

- Önce `CLAUDE.md` (kurallar), sonra bu dosya, sonra
  [`OLCUMLER.md`](OLCUMLER.md) (her sayının adresi).
- Kapı komutu: `npm run typecheck && npm run test && npm run guard && npm run build`.
- Geliştirme sunucusu `npm run dev`; yayın yapısı `npm run build` →
  `dist/`. Tarayıcıda ölçüm için geliştirme yapısında `window.__kn`
  kancaları var (`util/devHooks.ts`).
- Denge değişirse `docs/KURALLAR.md` ve `GAME-DESIGN.md` tabloları
  **üretiliyor** — elle düzeltilmez, `npm run kurallar`.

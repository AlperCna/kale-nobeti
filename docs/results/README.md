# Taş sonuçları

Her kilometre taşı bitince buraya bir sonuç dosyası yazılır:
`docs/results/M<n>-SONUC.md`.

Biçim: [`TEMPLATE.md`](TEMPLATE.md)

Taşa bağlı olmayan, **ölçülen her sayının kütüğü**:
[`OLCUMLER.md`](OLCUMLER.md). Sonuç dosyası bir taşın hikâyesini anlatır;
kütük ise "bu sayı nereden geldi, neye asılı, hangi test koruyor"
sorusunun tek adresi. Yeni bir ölçüm alan **ikisine birden** yazar.

## Neden var

Bu klasör bir günlük değil, **ölçüm defteri.** `docs/plan/` neyin
yapılacağını söylüyor; burası **ne olduğunu ve hangi sayıların ölçüldüğünü**
kaydediyor.

Projenin en büyük riski, kararların ölçüm yerine tahmine dayanması
(`docs/plan/RISKS.md` R1, R3). Bir kez oldu: 2200 HP'lik boss ölçülmemiş
bir kapsama varsayımından türetildi ve öldürülemez çıktı. Ölçülen sayı
yazılı bir yerde durmazsa bir sonraki taş yine tahminle başlar.

## Ne zaman yazılır

Taşın son işi olarak, `docs/plan/M<n>-*.md` içindeki **taş sonu kontrol
listesi bittikten sonra**. Kontrol listesinin son maddesi zaten budur.

Sonuç dosyası yazılmadan bir sonraki taş **başlamaz.** Gerekçe: her taş bir
sonrakinin girdisini üretiyor (`docs/plan/DEPENDENCIES.md`) ve o girdi
yazılı değilse sonraki oturum onu yeniden tahmin eder.

## Zorunlu ölçümler

Her taşın raporlaması **gereken** sayılar önceden belli. Sonuç dosyası
bunlar doldurulmadan tamamlanmış sayılmaz.

| Taş | Ölçülüp yazılacak | Kimin girdisi |
|---|---|---|
| **M0** | İlk indirme boyutu (MB) · gerçek süre · sabitlenen Phaser/TS/Vite sürümleri | M6 boyut bütçesi |
| **M1** | **Yapı noktası başına kapsanan yol (8 sayı)** · ortalama · **yol uzunluğu `L`** · 20 düşmanla FPS | **M3 denge sağlamalarının tamamı**; boss/Trol HP'sinin yeniden hesabı |
| **M2** | `applyDamage` test sayısı · 8 kule + 20 düşmanla FPS · mermi havuzu tepe kullanımı | M4 bilgi paneli; M6 performans tabanı |
| **M3** | **8 noktanın dolduğu dalga** · Kısıt A sonucu (düşman başına) · `simulateWave` sızan HP (dalga başına) · simülasyon süresi | M4 denge; M7 30 dalga geçişi |
| **M4** | Karşı-oyun tablosunun 7 senaryosu (geçti/kaldı) · uçan hattını kesen yapı noktası sayısı | M7 harita kabul kriteri |
| **M5** | 9 engelleme kuralının test sonucu · kışlalı/kışlasız Trol karşılaştırması | M7 denge oturumları |
| **M6** | İlk indirme boyutu · hedef cihazda FPS · üretilen varlık sayısı · atlas boyutu | M7 yayın kontrolü |
| **M7** | 30 dalganın sağlama sonucu · nihai paket boyutu · yükleme süresi · portal başvuru durumu | v1 sonrası karar |

`M7-SONUC.md` iki aşamalı yazılır: taş bitince teknik ölçümler, **yayından
en az bir hafta sonra** portal metrikleri eklenir (ortalama oturum, harita
başına tamamlama, bırakma noktası, dönüş oranı). İkinci aşama
`docs/ROADMAP.md` "v1 sonrası — karar noktası" bölümündeki teşhis matrisini
besliyor. Daha erken bakmak gürültü okumak olur.

Hangi metriğin portal panelinden geleceği doğrulanmadı — `OPEN-QUESTIONS.md`
**S64**.

`docs/plan/TEST-STRATEGY.md` §5 bu listenin gerekçesini taşıyor:
"beşi de bir sayı üretir ve o sayı bir kararı besler. Raporlanmazsa karar
tahminle verilir."

## Sonuçlar

| Taş | Dosya | Tarih | Gerçek süre |
|---|---|---|---|
| M0 | [M0-SONUC.md](M0-SONUC.md) | 2026-08-04 | ~1 sa 10 dk |
| M1 | [M1-SONUC.md](M1-SONUC.md) | 2026-08-05 | ~1 sa 40 dk |
| M2 | — | — | — |
| M3 | — | — | — |
| M4 | — | — | — |
| M5 | — | — | — |
| M6 | — | — | — |
| M7 | — | — | — |

## Sonuç dosyası plana geri besler

Sonuç yazıldıktan sonra **üç yerde güncelleme** yapılır:

1. `docs/plan/README.md` taş tablosunda durum `☑`
2. Ölçülen sayı bir tasarım kararını değiştiriyorsa **kaynak dokümana**
   işlenir (`GAME-DESIGN.md` / `CLAUDE.md`) — sonuç dosyasında bırakılmaz
3. Yeni belirsizlik çıktıysa `docs/plan/OPEN-QUESTIONS.md`'ye eklenir

Üçüncüsü en çok atlanan. Sonuç dosyası bir çöp kutusu değil; içindeki her
kalıcı bilgi bir kaynak dokümana taşınmalı.

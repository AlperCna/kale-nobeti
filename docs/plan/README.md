# Uygulama planı

`docs/ROADMAP.md` **ne** yapılacağını söyler; buradaki dosyalar **nasıl**
yapılacağını. Her kilometre taşı için bir dosya, her dosyada 30-45 dakikalık
görevler.

| Dosya | İçerik |
|---|---|
| [`TASK-TEMPLATE.md`](TASK-TEMPLATE.md) | Görev şablonu ve alan kuralları |
| [`DEPENDENCIES.md`](DEPENDENCIES.md) | Sistem bağımlılık grafiği, erken karar gerektiren çapraz bağlar |
| [`DATA-SCHEMAS.md`](DATA-SCHEMAS.md) | `src/types/` ve `src/data/` arayüzlerinin tam tanımı |
| [`TEST-STRATEGY.md`](TEST-STRATEGY.md) | Neyin nasıl doğrulanacağı |
| [`RISKS.md`](RISKS.md) | Projeyi öldürebilecek riskler |
| [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) | Karar bekleyen soruların tek listesi |
| [`../results/`](../results/README.md) | **Taş sonuçları** — her taş bitince yazılan ölçüm defteri |
| [`iyilestirme/`](iyilestirme/README.md) | **İyileştirme dosyası** — M7 sonrası taramada bulunan 22 görsel/yapısal bulgu |

## Taşlar

| Taş | Dosya | Kod görevi | Üretim bloğu | Takvim | Durum |
|---|---|---|---|---|---|
| M0 — İskelet, saat, aşamalı yükleme | [M0-iskelet-saat-yukleme.md](M0-iskelet-saat-yukleme.md) | 10 | — | 1 gün | **☑** |
| M1 — Yol, düşman hareketi, kapsama aracı | [M1-yol-dusman-kapsama.md](M1-yol-dusman-kapsama.md) | 9 | — | 2 gün | **☑** |
| M2 — Kule, mermi, hedefleme | [M2-kule-mermi-hedefleme.md](M2-kule-mermi-hedefleme.md) | 9 | — | 2-3 gün | **☑** |
| M3 — Ekonomi, dalgalar, denge sağlamaları | [M3-ekonomi-dalga-denge.md](M3-ekonomi-dalga-denge.md) | 11 | — | 3 gün | **☑** |
| M4 — Tam kule/düşman seti, yükseltme, bilgi paneli | [M4-tam-set-yukseltme-panel.md](M4-tam-set-yukseltme-panel.md) | 11 | — | 4 gün | **☑** |
| M5 — Kışla, askerler, yetenekler | [M5-kisla-asker-yetenek.md](M5-kisla-asker-yetenek.md) | 9 | — | 3 gün | **☑** |
| M6 — Sanat, juice, ses | [M6-sanat-juice-ses.md](M6-sanat-juice-ses.md) | 12 | 4 | **3-4 hafta** | **☑** |
| M7 — Harita 2-3, denge geçişi, yayın | [M7-harita23-denge-yayin.md](M7-harita23-denge-yayin.md) | 11 | 2 | 5-7 gün | ▶ **10/11** (yalnız `T11` itch.io yayını — insan eylemi) |

**82 kod görevi + 6 üretim bloğu. Toplam takvim: 7-9 hafta** kesintisiz
çalışmayla ([`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) Takvim).

> **Görev süreleri ≠ takvim.** Görev dakikaları yalnız **kod yazma**
> süresidir; takvim yukarıdaki sütundan okunur. İkisi arasında ölçülen fark
> 4-6 kat ve bu bir hata değil, birim farkı — ayrıntı
> [`TASK-TEMPLATE.md`](TASK-TEMPLATE.md) "Süre birimi".
>
> **Bloke edici açık soru kalmadı.** `S50` (sanat yönü) **özgün silüet**
> olarak kapandı; M6'nın 3-4 haftası buradan geliyor.

---

## Görev kimlikleri

```
M<taş>-T<sıra>
```

`M0-T01`, `M3-T12`. Sıra iki haneli, taş içinde 1'den başlar.

**Kimlik hiç değişmez.** Bir görev iptal edilirse numarası boş kalır,
yeniden kullanılmaz — böylece commit mesajlarındaki ve açık sorulardaki
atıflar bozulmaz.

## Durum işaretleri

| İşaret | Anlam |
|---|---|
| `☐ bekliyor` | Başlanmadı |
| `▶ devam` | Başlandı, bitmedi. Aynı anda **en fazla bir** görev bu durumda olur |
| `☑ bitti` | Kabul kriteri geçti |
| `⊘ iptal` | Yapılmayacak, gerekçesi görevin içine yazılır |

Taş dosyasının başındaki tablo ve `README.md`'deki taş tablosu elle
güncellenir; otomatik sayaç yok.

## Bir görev ne zaman "bitti" sayılır

Beşi birden sağlanmalı:

1. **Kabul kriteri komutu çalıştırıldı** ve beklenen çıktıyı verdi.
2. **"Bitmedi sayılır eğer" koşulu sağlanmıyor.**
3. `npm run typecheck` temiz.
4. Görevin dokunduğu TIER 1 kuralları ihlal edilmemiş — `npm run guard`
   yeşil (`M0-T10`'dan sonra).
5. Görev sırasında ortaya çıkan yeni belirsizlik `OPEN-QUESTIONS.md`'ye
   yazıldı — sessizce karar verilmedi.

Beşincisi en çok atlanan. Bu projede en büyük risk modelin eksik bilgiyi
sayı uydurarak kapatması; bir kez oldu (2200 HP'lik boss).

## Bir taş ne zaman "bitti" sayılır

Görevlerin hepsi bitmesi **yetmez**. İki şey daha:

1. Taş dosyasındaki **taş sonu kontrol listesinin** her maddesi işaretli.
2. **`docs/results/M<n>-SONUC.md` yazıldı** ve zorunlu ölçümler dolduruldu
   ([`../results/README.md`](../results/README.md)).

Sonuç dosyası yazılmadan bir sonraki taş **başlamaz.** Her taş bir
sonrakinin girdisini üretiyor; o girdi yazılı değilse sonraki oturum onu
yeniden tahmin eder — ve bu projede tahminle başlayan her sayı bir kez
yanlış çıktı.

## Plan yazma kuralları

1. **Kaynakları önce oku.** Taşın ROADMAP bölümü, atıf yaptığı
   `GAME-DESIGN.md` bölümleri, ilgili `docs/research/*` dosyaları.
2. **Sayı uydurma.** Dokümanda yoksa `OPEN-QUESTIONS.md`. `CLAUDE.md` TIER 2:
   "Yeni bir sayı uydurma. Tasarım dokümanında yoksa sor."
3. **Karar verme, sor.** Planı yazan tasarım kararı almaz.
4. **TIER 1 kurallarını göreve bağla.** Hangi görevin hangi kuralı ihlal
   edebileceği yazılır; "genel olarak geçerli" yetmez.
5. **Kabul kriteri çalıştırılabilir olsun.** Komut + beklenen çıktı.
6. **Toplam süre ROADMAP tahminiyle uyumlu olsun.** Sapıyorsa ya görevler
   şişmiş ya ROADMAP tahmini yanlış — ikisi de not düşülür.

## Açık soru döngüsü

```
plan yazılır → soru OPEN-QUESTIONS.md'ye girer → insan cevaplar
  → cevap kaynak dokümana (GAME-DESIGN.md / CLAUDE.md) işlenir
  → OPEN-QUESTIONS.md'de "cevaplandı → <dosya> §<bölüm>" işaretlenir
  → görev uygulanır
```

Cevap plan dosyasında bırakılmaz, kaynak dokümana taşınır. Tek doğru kaynak
`CLAUDE.md` ve `GAME-DESIGN.md`.

---

## Bir taşı uygulama

Her taş **temiz bir oturumda** (`/clear` sonrası) açılır. Taş dosyasının
başındaki "Oturum başlangıcı" bloğu neyin okunacağını söyler — o listenin
dışına çıkma, bağlam dolduğunda plan tutarlılığı bozuluyor.

```
docs/plan/M<n>-*.md oku. Oturum başlangıcı bölümündeki dosyaları oku.
Plan modunda kal. M<n>-T01'i uygula, sonra dur ve diff'i göster.
Devam demeden ilerleme.
```

Taş sonunda:

```bash
npm run typecheck && npm run test && npm run build && npm run guard
```

Sonra: bu taşta verilen kararlardan `CLAUDE.md`'ye eklenmesi gerekenleri
**öner** (ekleme yapma, öner).

## Bir taş planını yeniden üretme

Plan dosyası bozulur veya bir taş yeniden planlanacaksa, temiz oturumda:

```
Plan modunda kal.

docs/plan/TASK-TEMPLATE.md, docs/plan/README.md ve docs/plan/DEPENDENCIES.md
oku. docs/ROADMAP.md içindeki M<n> bölümünü ve o taşın atıf yaptığı
GAME-DESIGN.md / research bölümlerini oku.

docs/plan/M<n>-<taş-adı>.md dosyasını üret. İçerik:
0. Oturum başlangıcı — bu taşı açan temiz oturumun okuyacağı dosyalar.
1. Taşın amacı (2-3 cümle) ve taş bittiğinde oyunun hangi durumda olacağı.
2. Görev listesi — TASK-TEMPLATE şemasına göre, M<n>-T01'den başlayarak.
   Her görev 30-45 dakikalık olmalı; daha büyükse böl.
3. Her görev için: dokunulacak dosyalar (tam yol), yazılacak tip/arayüz
   imzaları, kabul kriteri (çalıştırılabilir komut + beklenen çıktı).
4. AÇIK SORU'lar — dokümanların cevaplamadığı, insanın karar vermesi
   gereken sorular. Kendin karar verme.
5. Risk listesi: neyin ters gitmesi muhtemel, erken uyarı işareti ne.
6. Taş sonu kontrol listesi.

Kısıtlar:
- Yeni denge sayısı uydurma. Dokümanda yoksa AÇIK SORU'ya yaz.
- CLAUDE.md TIER 1 kurallarının hangi görevlerde geçerli olduğunu görevin
  içinde belirt.
- Kod yazma. Bu bir plan dosyası.

Planı göster, onay bekle.
```

**Taşları tek oturumda üretme.** Aralarına `/clear` at; bağlam dolduğunda
son taşlar ilk taşların kalitesinde olmuyor.

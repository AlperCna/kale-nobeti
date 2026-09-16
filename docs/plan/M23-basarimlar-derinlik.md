# M23 — Başarımlar oyunun kendi derinliğini göstersin

> **Durum:** BİTTİ (iki fazın ikisi). Dengeye **dokunmadı** — yalnız veri,
> olay bağlama, metin.

## Neden

Başarımlar `M8-T07`'de yazıldı ve o günden beri **hiç büyümedi**. Aradan
geçen taşlar oyuna şunları ekledi:

| taş | eklenen |
|---|---|
| `M10-T02` · `M11` Faz 4 | hedefleme modları (5 mod) |
| `M10-T03` | buz kalkanı |
| `M11` Faz 2 | T3 dallarının ayrıştırılması (S93: *"görünmeyen takas zar atışıdır"*) |
| `M11` Faz 3 | kışla dalları |
| `M12` | yeraltı geçişi (Tünelci) |
| `M13` | çağıran boss |
| `M21` | elit dalgası |

On iki başarımın **hiçbiri** bunlara işaret etmiyor. Liste hâlâ "ilk
kule, 100 öldürme, ilk zafer" evresinde; yani oyunun en zengin
katmanları oyuncuya *"burada bir şey var, dene"* diyen tek mekanizmada
görünmüyor.

Bu, araştırmanın genel bulgusuyla aynı: oyun sistem açısından zengin,
**anlatım açısından fakir**.

## Neden dengeye dokunmuyor

Başarımlar hiçbir denge türetmesine girmiyor: referans tahta yetenek
kullanmıyor (`referansOlcum` `'yok'` geçiyor), rampa/boss/aile ölçümleri
başarımları görmüyor. Eklenen her şey veri + dinleyici + metin.

## Neden dört tane

`AchievementsScene` iki sütuna 58 px aralıkla diziyor, üst kenar 190 ve
alt bilgi ~640'ta; yani **8 satır × 2 sütun = 16** güvenli tavan.
12 + 4 = 16. Ekran düzenine dokunmadan sığan en büyük sayı.

## Seçilen dört — hepsi MEVCUT olayları kullanıyor

Sıfır altyapı değişikliği: gereken olayların dördü de zaten yayınlanıyor.

| başarım | ne işaret ediyor | tetikleyici |
|---|---|---|
| **İki Yol** | T3 takasının iki yakasını da aynı elde kur | `tower:upgraded` (kademe 2 **ve** 3) |
| **Çifte El** | iki yeteneği de aynı elde kullan | `ability:cast` (iki ayrı `id`) |
| **Nişan Al** | hedefleme modunu aç | `targeting:opened` |
| **Yeraltından** | bir Tünelci yeraltına girsin | `enemy:burrowed` |

İlk üçü **oyuncunun kararı**, dördüncüsü bir **keşif işareti** —
dosyanın kendi ölçütü ikisine de izin veriyor (*"oyuncunun zaten
yapacağı bir şeyi işaretliyor ya da bir kere denemeye değer bir sapma
öneriyor"*).

"İki Yol" ve "Çifte El" **el içi durum** tutuyor (hangi dallar/yetenekler
görüldü). Durum `AchievementSystem` örneğinde yaşıyor ve örnek elle
birlikte kuruluyor, yani eller arası sızmıyor.

---

## Fazlar

### Faz 1 — Veri, bağlama, metin *(risk DÜŞÜK)*

`achievements.ts` dört tanım · `AchievementSystem` dört tetikleyici ·
`strings.ts` tr + en (derleyici `en`'i tam eşleşmeye zorluyor).

**Kabul:** dördü de `AchievementSystem.test.ts`'te bağlı; eller arası
durum sızmıyor.

> **BİTTİ.** Altı yeni sağlama: tek dal yetmiyor (aynı yakayı iki kez
> almak "İki Yol" açmıyor), T2 yükseltmesi dal sayılmıyor, aynı yeteneği
> iki kez basmak "Çifte El" açmıyor, iki tek-olaylı başarım, ve **eller
> arası sızmama** — bir elde bir dal + öteki elde öteki dal almak
> başarımı açmıyor. Sızsaydı başarım kendiliğinden dolar ve işaret
> ettiği *karar* anlamını yitirirdi.

### Faz 2 — Doğrulama

Tarayıcıda başarımlar ekranı oyuncu gözüyle (16 satır sığıyor mu,
metinler kesiliyor mu).

> **BİTTİ.** Ekran **0 / 16** yazıyor, iki sütun sekizer satır, son
> satır y≈370 ve alt bilgi 404'te — çakışma yok, hiçbir metin
> kesilmiyor. Dört yeni başarım sağ sütunun altında okunuyor. Konsol
> temiz. Ekran düzenine tek satır bile dokunulmadı; sahne zaten
> `ACHIEVEMENTS.length`'ten türetiyor.

---

## Bu planın YAPMADIĞI şeyler

- **Dengeye dokunmak** — sahibin açık talebi.
- **Yeni olay/`payload` eklemek** — `enemy:killed` düşman **tipini**
  taşımıyor (havuz id'si taşıyor), o yüzden "bossu öldür" gibi
  başarımlar bu taşta yok; olay şeması değiştirmek ayrı iş.
- **Ekran düzenini değiştirmek** — 16 sığıyor; 17+ alt bilgiyle çakışır.

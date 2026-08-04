# M&lt;n&gt; sonucu — &lt;taş adı&gt;

| | |
|---|---|
| **Taş** | M&lt;n&gt; |
| **Plan** | `docs/plan/M<n>-<ad>.md` |
| **Başlangıç** | YYYY-AA-GG |
| **Bitiş** | YYYY-AA-GG |
| **Gerçek süre** | N gün / N saat |
| **Plandaki takvim** | N gün |
| **Sapma** | ×N.N |

## 1. Özet

Üç cümle: ne bitti, oyun şu an hangi durumda, neyi yapamıyor.

Plandaki "bitiş durumu" paragrafıyla karşılaştır — tuttuysa yaz,
tutmadıysa **farkı** yaz.

## 2. Görevler

| Görev | Durum | Plan | Gerçek | Not |
|---|---|---|---|---|
| M&lt;n&gt;-T01 | ☑ | 40 dk | 55 dk | |
| M&lt;n&gt;-T02 | ☑ | 30 dk | 25 dk | |
| M&lt;n&gt;-T03 | ⊘ | 30 dk | — | İptal gerekçesi |

`⊘` varsa gerekçesi zorunlu.

## 3. Ölçümler

> **Bu bölüm boş bırakılamaz.** Hangi sayıların zorunlu olduğu
> [`README.md`](README.md) "Zorunlu ölçümler" tablosunda.

| Ölçüm | Değer | Nasıl ölçüldü | Kimin girdisi |
|---|---|---|---|
| | | | |

Bir ölçüm beklenenden farklı çıktıysa **ne anlama geldiğini** yaz.
Örnek: "ortalama kapsama 380 px ölçüldü; ne 300 ne 450 varsayımını
tutuyor, boss HP'si buna göre yeniden hesaplanmalı."

## 4. Kabul kriterleri

| Kriter | Sonuç | Komut çıktısı |
|---|---|---|
| `npm run typecheck` | ☑ | `Found 0 errors` |
| `npm run test` | ☑ | `N passed` |
| `npm run build` | ☑ | `İlk indirme: N.NN MB` |
| `npm run guard` | ☑ | `N/N ✓` |

Taş dosyasındaki kontrol listesinin her maddesi buraya girer.
**Geçmeyen madde varsa taş bitmemiştir** — ya düzeltilir ya `⊘` ile
gerekçelendirilip bir sonraki taşa devredilir.

## 5. Plandan sapmalar

Ne farklı yapıldı ve **neden**. Sapma kötü değil, kaydedilmemiş sapma kötü.

| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| | | | |

## 6. Yeni açık sorular

Taş sırasında ortaya çıkan, plana yazılmamış belirsizlikler.
`docs/plan/OPEN-QUESTIONS.md`'ye **eklenmiş** olmalı.

| # | Soru | Varsayılan | Bloke ettiği |
|---|---|---|---|
| S&lt;nn&gt; | | | |

Hiçbiri yoksa "yok" yaz — boş bırakma, gözden kaçtı mı belli olmuyor.

## 7. Sonraki taşa devredilenler

En kritik bölüm. Sonraki oturum `/clear` sonrası **buradan** okuyacak.

- **Ölçülen girdiler:** hangi sayı, nerede yazılı
- **Yarım kalan iş:** varsa, hangi görev, ne kadarı
- **Değişen varsayım:** planı geçersizleştiren bir şey çıktıysa

## 8. Kaynak dokümana işlenmesi gerekenler

`ROADMAP.md` komut şablonu: "bu taşta verilen kararlardan `CLAUDE.md`'ye
eklenmesi gerekenleri **öner** (ekleme yapma, öner)."

| Öneri | Hangi dosya | Gerekçe |
|---|---|---|
| | | |

İşlendikten sonra bu satırlar `☑` işaretlenir. **Sonuç dosyasında
bırakılan kalıcı bilgi kaybolur** — tek doğru kaynak `CLAUDE.md` ve
`GAME-DESIGN.md`.

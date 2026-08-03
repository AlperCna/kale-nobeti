# Görev şablonu

`docs/plan/M<n>-*.md` dosyalarındaki her görev bu şemaya uyar.

Amacı: her görev **tek oturumda bitirilebilir** (30-45 dk), **kabul kriteri
bir komut çalıştırarak doğrulanabilir**, ve **Claude Code'a plan modunda tek
parça olarak verilebilir** olsun. Bir görev bu üçünden birini sağlamıyorsa
bölünmeli.

---

## Şablon

````markdown
### M0-T04 — GameClock

| | |
|---|---|
| **Kimlik** | `M0-T04` |
| **Durum** | ☐ bekliyor |
| **Süre** | ~45 dk |
| **Önkoşul** | `M0-T01` |
| **TIER 1** | kural 5, kural 8 |
| **Açık soru** | S02, S08 |
| **Doküman** | `CLAUDE.md` TIER 1 k.8 · `research/02-phaser-teknik.md` §3 |

**Dosyalar**
- `src/systems/GameClock.ts` — yeni — saat sözleşmesi
- `src/systems/GameClock.test.ts` — yeni — saf mantık testi

**İmza**
```ts
export class GameClock {
  readonly scaledDelta: number;
  setScale(s: 1 | 2, scene: Phaser.Scene): void;
  tick(delta: number): void;
}
```

**Yapılacak**
- Madde madde, emir kipinde.
- Sayı gerekiyorsa kaynağını belirt: `1280×720` (`CLAUDE.md` Teknoloji).

**Kabul kriteri**
```bash
npm run test -- GameClock
```
Beklenen: `4 passed`. Testler: `tick` 1×, `tick` 2×, `setScale` dört
özelliği de yazar, `physics.world.timeScale === 0.5`.

**Bitmedi sayılır eğer:** `setScale` dört özellikten üçünü yazıyorsa.

**Risk:** `physics.world.timeScale` ters çalışır (`1/s`). Yanlış yazılırsa
2× seçince oyun yavaşlar — erken uyarı bu.
````

---

## Alan kuralları

| Alan | Kural |
|---|---|
| **Kimlik** | `M<taş>-T<sıra>`, sıra iki haneli: `M0-T01`, `M3-T12`. Kimlik hiç değişmez — görev silinirse numara boş kalır, yeniden kullanılmaz. |
| **Durum** | `☐ bekliyor` · `▶ devam` · `☑ bitti` · `⊘ iptal` |
| **Süre** | **Kod yazma süresi.** 30-45 dk. Daha büyükse böl. Bkz. aşağıdaki birim uyarısı. |
| **Önkoşul** | Görev kimlikleri. Normalde aynı taş içinden. **Önceki** taşlardan önkoşul serbesttir (M3 görevi M1'in çıktısını tüketebilir) ve `DEPENDENCIES.md`'de karşılığı olmalı. **Sonraki** taştan önkoşul varsa görev yanlış taşta. |
| **TIER 1** | `CLAUDE.md` TIER 1 kural numaraları. Görev o kuralı **ihlal edebilecek** kod içeriyorsa yazılır — "ilgili olabilir" yetmez. |
| **Açık soru** | `OPEN-QUESTIONS.md`'deki `S<nn>` kimlikleri. Görevin kapsamını veya imzasını değiştirebilecek cevaplanmamış karar. |
| **Doküman** | Bu görevin dayandığı bölümler, tam atıf. Uygulayan başka dosya açmak zorunda kalmamalı. |
| **Dosyalar** | Tam yol + `yeni`/`değişiklik` + tek cümle amaç. |
| **İmza** | Yazılacak tip/arayüz/sınıf imzaları. Gövde yok, yalnız yüzey. |
| **Kabul kriteri** | **Çalıştırılabilir komut + beklenen çıktı.** Gözle doğrulanacaksa `gözle:` ile başlar ve tam olarak ne görüleceği yazılır. |
| **Bitmedi sayılır eğer** | Ters kabul. Görevin sessizce yarım kalabileceği en olası yol. |
| **Risk** | İsteğe bağlı. Varsa **erken uyarı işareti** zorunlu: "ne zaman anlarım ki ters gitti". |

### Yasaklar

- **Denge sayısı uydurma.** `GAME-DESIGN.md` veya `CLAUDE.md`'de yoksa
  `OPEN-QUESTIONS.md`'ye yazılır, göreve değil.
- **"Gerekirse şunu da yap" yok.** Kapsam kesin olmalı; belirsizlik açık soru.
- **Kabul kriteri "çalışıyor olmalı" olamaz.** Komut ve çıktı gerekir.
- **"UI'ı güzelleştir" gibi görev olmaz.** Ölçülemeyen iş görev değildir.
- **Öznel sıfat kabul kriteri olamaz.** "tutarlı", "güzel", "tatmin edici",
  "çalışıyor" — hiçbiri ölçülemez. Sayı, ikili karşılaştırma veya
  "şunu yap, şunu gör" biçimi gerekir.

---

## ⚠️ Süre birimi — iki farklı şey ölçülüyor

| Birim | Nerede | Neyi kapsıyor |
|---|---|---|
| **Görev süresi** (dk) | Görev bloklarında | **Yalnız kod yazma.** Belirtilen imzayı yazmak ve testini geçirmek. |
| **Taş süresi** (gün) | `docs/ROADMAP.md` | Gerçek takvim: hata ayıklama, Phaser öğrenme, varlık üretimi, oynatarak ayarlama, geri dönüşler. |

**İkisi aynı şey değil.** Denetim ölçtü: görev toplamı 54 saat, ROADMAP
27,5 gün (~220 saat) — **4 kat fark.** Fark hata değil, birim farkı.

M0 tuttu (0,8×) çünkü saf koddan ibaret. M6 ve M7 **6 kat** saptı çünkü
çoğunlukla kod olmayan iş.

**Takvim planlaması `ROADMAP.md`'den yapılır**, görev sürelerinin
toplamından değil. Görev süresi yalnız "bu oturumda bitirebilir miyim"
sorusuna cevap verir.

---

## Kod dışı görevler

Sanat üretimi, seviye tasarımı ve denge ayarı 30-45 dakikaya sığmıyor ve
kabul kriteri komutla doğrulanamıyor. Bunlar **`P` ön ekiyle** ayrı
işaretlenir:

````markdown
### M6-P01 — Kule sprite'larının üretimi

| | |
|---|---|
| **Kimlik** | `M6-P01` (**kod dışı** — 30-45 dk kuralı geçerli değil) |
| **Süre** | 1-3 gün · S50'ye bağlı |
| **Çıktı** | 16 kule kademesi için PNG, hedef boyutta |
| **Kabul** | `M6-T02` atlasa paketleyebiliyor; 640×360'ta silüetten ayırt ediliyor |
````

Farkları: süre **gün** cinsinden, kabul kriteri bir sonraki kod görevinin
girdisi olabilmesi, ve `npm run guard` kapsamı dışında.

**Kural:** her `P` görevinin çıktısını tüketen bir `T` görevi olmalı.
Tüketicisi olmayan üretim görevi yazılmaz.

---

## Taş dosyasının bölümleri

Her `M<n>-*.md` şu sırayla:

0. **Oturum başlangıcı** — `/clear` sonrası bu taşı açan oturumun okuyacağı
   dosyaların sıralı listesi, ve "başka dosya açma" talimatı. Bağlamı taş
   başına sınırlamak için; yoksa geç taşlar erken taşlardan düşük kalitede olur.
1. **Amaç ve bitiş durumu** — 2-3 cümle amaç, sonra "taş bittiğinde oyun
   şu durumda" paragrafı. Neyin **olmadığını** da yaz.
2. **Görev listesi** — yukarıdaki bloklar, sırayla.
3. **AÇIK SORULAR** — bu taşta ilk kez karşımıza çıkanlar. Tam liste
   `OPEN-QUESTIONS.md`'de; burada yalnız kimlik + tek satır özet.
4. **Riskler** — risk · erken uyarı · hafifletme.
5. **Taş sonu kontrol listesi** — kutucuklu, hepsi komutla veya gözle
   doğrulanabilir.

---

## Adlandırma

```
docs/plan/M<n>-<kisa-ad>.md
```

`<kisa-ad>`: ROADMAP başlığından türetilir, küçük harf, tire ayraçlı,
**Türkçe karakter yok** (kabuk ve URL uyumu için).

Örnek: ROADMAP "M0 — İskelet, saat, aşamalı yükleme"
→ `docs/plan/M0-iskelet-saat-yukleme.md`

---

## Kabuk notu

Kabul kriterlerindeki komutlar POSIX kabuk (Git Bash) içindir. Tekrar eden
kontroller (`grep` tabanlı kural bekçileri) `npm run guard` altında toplanır
ki PowerShell'de de aynı komutla çalışsın. `guard` `M0-T10`'da kurulur.

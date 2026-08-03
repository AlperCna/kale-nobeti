# M7 — Harita 2-3, denge geçişi, yayın

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M7 |
| **Görev** | 11 kod görevi + 2 üretim bloğu |
| **Takvim bütçesi** | 5-7 gün (`ROADMAP.md`) |
| **Durum** | ☐ bekliyor |

> ## ⚠️ Bu taşa da dakika tahmini verilmiyor
>
> Kod görevlerinin toplamı ~7 saat ama ROADMAP 5-7 gün diyor — **6,6 kat**
> fark, denetimdeki en büyük sapma. Sebebi M6'nınkiyle aynı: işin çoğu kod
> değil. Burada seviye tasarımı ve denge oturumları.
>
> `M7-T01`, `M7-T02` ve `M7-T08`'in dakika tahminleri **yalnız kodlama
> kısmını** kapsıyor. Asıl iş aşağıdaki bloklarda.

## Kod dışı üretim blokları

| Kimlik | Çıktı | Süre | Tüketen görev |
|---|---|---|---|
| `M7-P01` | Harita 2 ve 3'ün yol/nokta/uçan hattı tasarımı | 1-2 gün | `M7-T01`, `M7-T02` |
| `M7-P02` | Denge oturumları: 30 dalga elle oynanır, 3 kişiye oynatılır | 2-3 gün | `M7-T08` |

`M7-P01` çıktısı S57'yi kapatıyor. `M7-P02` `ROADMAP.md` M7 denge kontrol
listesinin dokuz elle maddesini işliyor.

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı (özellikle **Platform kısıtları**).
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/plan/DEPENDENCIES.md` — §1 (çoklu giriş)
4. `docs/GAME-DESIGN.md` §9 (harita tablosu, ayrık yol uyarısı, kapsama),
   §5 (harita kadroları), §6 (Kısıt A/B)
5. `docs/research/05-yayin-platformlari.md` — **tamamı**
6. `docs/research/01-denge-matematigi.md` §4 uyarı kutusu, §11, §12
7. `docs/plan/M1-yol-dusman-kapsama.md` — `M1-T09`'un ölçüm raporu

## 1. Amaç ve bitiş durumu

**Amaç:** İki harita daha, tam denge geçişi ve yayın. Denge geçişi artık
elle deneme değil: M3'teki üç sağlama 3 haritanın 30 dalgasında çalıştırılır.

**Taş bittiğinde oyun:** üç harita da bitirilebiliyor, seviye seçim ekranı
ve 3 yıldız var, ilerleme kaydediliyor, gizli sekmede çökmüyor, itch.io'da
yayında ve portal başvurusu yapılmış.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| **1 — denge verisi** | `M7-T01`, `M7-T02`, `M7-T04` |
| **2 — paket boyutu** | `M7-T09` |
| 5 — `any` yasak | hepsi |
| 7 — `BitmapText` | `M7-T06`, `M7-T07` |
| **10 — `localStorage` `try/catch`** | `M7-T05`, `M7-T10` |

---

## 2. Görevler

### M7-T01 — Harita 2 (Taş Köprü, Y ayrımı)

`M7-T01` · ☐ · ~45 dk · Önkoşul `M1-T03` · TIER 1 **k.1** · Açık soru S57, S58
· Doküman `GAME-DESIGN.md` §9 tablosu, §5 kadro tablosu

**Yapılacak**
- `paths` **iki elemanlı** — Y şeklinde ayrılıp köprüde birleşiyor (§9).
  `M1-T03` çoğulu zaten desteklediği için `PathSystem` değişmiyor
  (`DEPENDENCIES` §1'in sebebi buydu).
- 10 yapı noktası, 1 giriş, `hpMultiplier: 1.6`, `goldMultiplier: 1.6`,
  `startGold: 340` (§9).
- Kadro: harita 1 + **Zırhlı Ork, Şaman** (§5 kadro tablosu).
- `coverage` `measureCoverage` ile üretilir, elle yazılmaz.
- Waypoint koordinatları **S57**.

**Kabul kriteri**
```bash
npm run test -- maps
```
Beklenen: harita 2'nin `coverage`'ı `measureCoverage` çıktısıyla eşleşiyor;
`enemyRoster` §5 tablosuyla eşleşiyor; uçan hattı ≥ %40 yapı noktasını
kesiyor (`M4-T06` kriteri).

**Bitmedi sayılır eğer:** `PathSystem`'e harita 2 için özel kod eklendiyse.

---

### M7-T02 — Harita 3 (Kül Ovası, iki giriş)

`M7-T02` · ☐ · ~45 dk · Önkoşul `M7-T01` · TIER 1 **k.1** · Açık soru S57, S58
· Doküman `GAME-DESIGN.md` §9, §5

**Yapılacak**
- **İki ayrı giriş**, kalede birleşiyor (§9). `WaveGroup.spawnPoint` burada
  ilk kez anlamlı — hangi kola hangi grup gidiyor **S58**.
- 12 yapı noktası, `hpMultiplier: 2.6`, `goldMultiplier: 2.6`,
  `startGold: 400` (§9).
- Kadro: + **Trol, Örümcek Ana** (§5).
- Trol'ün 400'ü ⚠️ geçici (§5); harita 3'te `× 2.6` = 1040 olacak.

**Kabul kriteri**
```bash
npm run test -- maps
```
Beklenen: iki giriş de tanımlı; `spawnPoint` değerleri geçerli indeksler;
`coverage` üretilmiş.

**Bitmedi sayılır eğer:** iki girişten biri hiç kullanılmıyorsa.

---

### M7-T03 — Ayrık yolda Kısıt A: kol başına hesap

`M7-T03` · ☐ · ~40 dk · Önkoşul `M7-T02`, `M3-T08` · TIER 1 k.5 · Açık soru —
· Doküman `GAME-DESIGN.md` §9 (ayrık yol uyarısı), §6

**Yapılacak**
- §9: "harita 2 ve 3'te Kısıt A hesabı **her kol için ayrı** yapılır.
  Toplam DPS yanıltıcıdır — kolun yalnızca onu gören kuleler sayılır."
- `ceilingA` kol parametresi alır; her kol için kendi kapsama alt kümesi.

**Kabul kriteri**
```bash
npm run test -- balanceChecks
```
Beklenen: `≥ 3 ek test` — harita 2'nin iki kolu ayrı hesaplanıyor;
bir kola hiç kule yoksa o kolun tavanı `0`; toplam DPS ile kol DPS'i
**farklı** çıkıyor (yanıltıcılığın kanıtı).

**Bitmedi sayılır eğer:** ayrık yolda tek bir toplam DPS kullanılıyorsa.

---

### M7-T04 — Harita çarpanları ve kadro uygulaması

`M7-T04` · ☐ · ~35 dk · Önkoşul `M7-T02` · TIER 1 **k.1** · Açık soru S39
· Doküman `GAME-DESIGN.md` §9 (altın çarpanı), §5

**Yapılacak**
- `hpMultiplier` düşman HP'sine, `goldMultiplier` öldürme altınına uygulanır
  (§9). Eskiden yalnız HP ölçekleniyordu ve harita 3'te altın/HP oranı
  %38'e düşüyordu.
- `enemyRoster` dışı düşman doğurulamaz — çalışma zamanı kontrolü.
- Trol yenilenmesi çarpanla ölçekleniyor mu — **S39** (M4'ten devam).

**Kabul kriteri**
```bash
npm run test -- maps
```
Beklenen: harita 3'te Goblin HP `45 × 2.6 = 117`, altın `3 × 2.6 = 7.8`
(yuvarlama testte sabitlenir); roster dışı doğurma hata fırlatıyor.

**Bitmedi sayılır eğer:** altın çarpanı uygulanmıyorsa.

---

### M7-T05 — `SaveSystem` ve `KeyValueStore`

`M7-T05` · ☐ · ~40 dk · Önkoşul — · TIER 1 **k.10** · Açık soru S60
· Doküman `CLAUDE.md` Teknoloji, TIER 1 k.10 · `research/05` §1, §2

**İmza**
```ts
export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export class SaveSystem {
  constructor(store: KeyValueStore);   // portal SDK adaptörü için
}
```

**Yapılacak**
- Tek anahtar `kale-nobeti-save-v1` (`CLAUDE.md` Teknoloji).
- **Her erişim `try/catch`** — gizli sekmede istisna fırlatıyor, sarılmazsa
  oyun açılışta çöker (TIER 1 k.10, `research/05` §1).
- Kayıt başarısızsa oyuncuya **bir kez** bildirilir (Poki şartı).
- `KeyValueStore` arayüzü CrazyGames Data modülüne geçişi bedava kılıyor —
  API birebir aynı (`research/05` §2).
- `SaveData` şeması **S60**.

**Kabul kriteri**
```bash
npm run test -- SaveSystem
```
Beklenen: `≥ 4 passed` — `setItem` istisna fırlatan sahte store ile
**çökmüyor**; okuma başarısızsa varsayılan dönüyor; bildirim bir kez veriliyor.

**Bitmedi sayılır eğer:** herhangi bir `localStorage` çağrısı `try/catch`
dışındaysa.

---

### M7-T06 — Seviye seçim ekranı

`M7-T06` · ☐ · ~40 dk · Önkoşul `M7-T05`, `M6-T05` · TIER 1 k.7, Platform
· Açık soru S62 · Doküman `ROADMAP.md` M7 · `GAME-DESIGN.md` §2

**Yapılacak**
- Üç harita kartı, kilitli/açık durumu, kazanılan yıldızlar.
- Harita kilidi kuralı **S62** (harita 1 bitince mi, yıldız şartı var mı).
- Kartlar ≥ 44×44 px, yazılar ≥ 16 px.

**Kabul kriteri**
```bash
npm run dev
```
gözle: harita 1 bitirilmeden harita 2 kilitli; bitirilince açılıyor;
sayfa yenilenince durum korunuyor.

**Bitmedi sayılır eğer:** kilit durumu kaydedilmiyorsa.

---

### M7-T07 — 3 yıldız derecelendirmesi

`M7-T07` · ☐ · ~35 dk · Önkoşul `M7-T06`, `M3-T11` · TIER 1 k.1, k.7
· Açık soru — (S59 kapandı) · Doküman `GAME-DESIGN.md` §9 "Yıldız derecelendirmesi"

**Yapılacak**
- Eşikler (`GAME-DESIGN.md` §9): **20 can → ★★★**, **15-19 → ★★**,
  **14 ve altı → ★**.
- Eşikler `src/data/balance.ts` içinde sabit olarak durur (TIER 1 k.1).
- Boss sızması tek başına 10 can götürdüğü için (§5) boss'u kaçırmak
  doğrudan tek yıldıza düşürüyor — bilinçli.

**Kabul kriteri**
```bash
npm run test -- SaveSystem
```
Beklenen: `≥ 4 passed` — `20 → 3`; `19 → 2`; `15 → 2`; `14 → 1`; `1 → 1`.

**Bitmedi sayılır eğer:** eşikler `src/systems/` içine gömülmüşse (TIER 1 k.1).

---

### M7-T08 — 30 dalganın denge geçişi

`M7-T08` · ☐ · ~45 dk kod + `M7-P02` (2-3 gün) · Önkoşul `M7-T03`, `M7-T04`
· TIER 1 k.1 · Açık soru —
· Doküman `GAME-DESIGN.md` §6 · `research/01` §11, §12 · `ROADMAP.md` M7 kontrol listesi

**Yapılacak**
- M3'teki üç sağlamayı **3 harita × 10 dalga** üzerinde çalıştır.
- Kısıt B `M3-T09`'un başsız simülasyonuyla koşar — 30 dalga için
  `leakedHp === 0` beklenir. Ayrık yol simülasyonda doğal olarak destekli.
- `M1-T09`'un ölçtüğü kapsamayla **boss ve Trol HP'si yeniden hesaplanır**
  (`GAME-DESIGN.md` §5 ⚠️ notunun çözümü). `research/01` §12'deki
  `deriveBossHp` önerisi burada uygulanabilir.
- `ROADMAP.md` M7 kontrol listesindeki elle maddeler burada işlenir
  (tek kule spam'i, kullanılmayan dal, nefes dalgaları, 3 kişiye oynatma).

**Kabul kriteri**
```bash
npm run test -- balanceChecks
```
Beklenen: Kısıt A 3 harita × 9 düşman için yeşil; ekonomi sağlaması
30 dalga için yeşil; Kısıt B ya yeşil ya **gerekçeli `todo`**.

**Bitmedi sayılır eğer:** boss/Trol HP'si hâlâ ⚠️ geçici işaretliyse
**ve** ölçüm mevcutsa — ölçüm varsa hesaplanmalı.

---

### M7-T09 — Boyut ve yükleme doğrulaması

`M7-T09` · ☐ · ~35 dk · Önkoşul `M6-T11`, `M7-T02` · TIER 1 **k.2** · Açık soru S10
· Doküman `research/05` §1, §2 · `research/04` §4, §6

**Yapılacak**
- İlk indirme **≤ 8 MB** (Poki), hedef ~1.5 MB (`research/04` §6).
- CrazyGames: toplam ≤ 250 MB, **≤ 1500 dosya**, ilk indirme ≤ 50 MB
  (mobil ana sayfa için ≤ 20 MB) (`research/05` §2).
- İlk yükleme < 3 sn (`ROADMAP.md` M7).
- Oyun tek tıkla başlıyor.

**Kabul kriteri**
```bash
npm run build && find dist -type f | wc -l
```
Beklenen: ilk indirme raporu ≤ 5 MB; dosya sayısı ≤ 1500.

**Bitmedi sayılır eğer:** ilk indirme 8 MB'ı aşıyorsa.

---

### M7-T10 — Gizli sekme ve portal uyumu

`M7-T10` · ☐ · ~35 dk · Önkoşul `M7-T05`, `M7-T09` · TIER 1 **k.10**, Platform
· Açık soru S61 · Doküman `research/05` §1, §2 · `CLAUDE.md` Platform

**Yapılacak**
- **Gizli sekmede test** — `localStorage` istisnası oyunu çökertmemeli.
- `dist/` bir **alt klasörden** servis edilince çalışmalı (`base: './'`).
- **ESC ve boşluk** duraklatıyor (Poki zorunlu).
- 16:9 ve 640×360 okunurluğu (`research/05` §1).
- `-webkit-user-select: none` (`research/05` §2).
- Yayın yapısında konsol çıktısı, hata ayıklama tuşu, FPS sayacı **yok**.
- Portal SDK entegrasyonu bu taşta mı — **S61**.

**Kabul kriteri**
```bash
npm run build && npx serve dist -l 5000
```
gözle: gizli sekmede açılıyor ve çökmüyor; alt klasörden servis edilince
çalışıyor; ESC/boşluk duraklatıyor; konsol tamamen sessiz.

**Bitmedi sayılır eğer:** yayın yapısında herhangi bir konsol çıktısı varsa.

---

### M7-T11 — itch.io yükleme ve portal başvurusu

`M7-T11` · ☐ · ~40 dk · Önkoşul `M7-T10` · TIER 1 — · Açık soru S61
· Doküman `research/05` §3 (sıralama önerisi)

**Yapılacak**
- `research/05` §3 sıralaması: **itch.io** (kısıt yok, ilk geri bildirim) →
  **CrazyGames Basic Launch** (metrik toplama) → **Poki** (en sıkı, elle
  küratörlü, cila tamken).
- itch.io: zip yükle, tarayıcıda çalıştığını doğrula.
- Poki'nin küratörlüğü "UX/his ve çekirdek döngü"ye bakıyor
  (`research/05` §1) — başvurudan önce 3 kişiye oynat.

**Kabul kriteri**
gözle, dört ölçülebilir kontrol — **itch.io sayfasında**, yerel sunucuda değil:
1. Sayfa açılışından oynanabilir ana kadar **< 5 sn** (kronometreyle).
2. Harita 1'in 10 dalgası baştan sona oynanıyor, kazanma ekranı çıkıyor.
3. Tarayıcı konsolu **tamamen sessiz** (hata ve uyarı sayısı sıfır).
4. Mobil tarayıcıda yatay modda açılıyor ve yapı noktalarına dokunma
   çalışıyor.

**Bitmedi sayılır eğer:** itch.io'da oyun beyaz ekran veriyorsa
(`base: './'` sorunu).

---

## 3. AÇIK SORULAR

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S57 | Harita 2 ve 3'ün waypoint/yapı noktası koordinatları | `M7-T01`, `M7-T02` |
| S58 | Ayrık yolda hangi grup hangi kola gidiyor? Rastgele mi, `spawnPoint` sabit mi? | `M7-T01`, `M7-T02` |
| S60 | `SaveData` şeması | `M7-T05` |
| S61 | Portal SDK entegrasyonu M7'de mi, sonra mı? | `M7-T10`, `M7-T11` |
| S62 | Harita kilidi: yalnız bitirme mi, yıldız şartı var mı? | `M7-T06` |

Devam eden: S10 (ilk indirme tanımı), S39 (Trol yenilenmesi ölçekleniyor mu).

> **S59 kapandı** — eşikler `GAME-DESIGN.md` §9'da: 20 → ★★★, 15-19 → ★★,
> ≤14 → ★. **S25/S26/S27 de kapandı** — referans tahta M3'te türetiliyor,
> Kısıt B başsız simülasyona çevrildi.

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Ayrık yolda tek toplam DPS kullanılır | Harita 2 testte geçiyor ama oynanınca bir kol sızdırıyor | `M7-T03` kol başına hesap |
| Simülasyon yavaş, 30 dalga CI'da zaman aşımına uğruyor | `npm run test` süresi dakikaları buluyor | `M3-T09` kabulü "10 dalga < 2 sn" şartı koyuyor |
| Boss/Trol ⚠️ geçici kalır | Ölçüm var ama HP güncellenmemiş | `M7-T08` "bitmedi sayılır eğer" |
| `base:'./'` unutulur | itch.io'da beyaz ekran | `M7-T10` alt klasör testi |
| Gizli sekmede çöküyor | Poki reddediyor | `M7-T05` + `M7-T10` |
| İlk indirme 8 MB'ı aşar | `M7-T09` raporu | Aşamalı yükleme (`M0-T06`) |
| Poki küratörlüğü reddediyor | — (geri bildirim gecikmeli) | itch.io ve CrazyGames önce; 3 kişiye oynat |
| `PathSystem` harita 3 için yeniden yazılıyor | `M7-T02`'de özel kod ihtiyacı | `M1-T03` çoğul `paths` (`DEPENDENCIES` §1) |

## 5. Taş sonu kontrol listesi

- [ ] `typecheck && test && build && guard` dördü de yeşil
- [ ] **Üç harita da bitirilebiliyor**
- [ ] Kısıt A 3 harita × 9 düşman için yeşil; ayrık yolda kol başına
- [ ] Ekonomi sağlaması 30 dalga için yeşil
- [ ] Kısıt B simülasyonu 30 dalga için `leakedHp === 0`
- [ ] Boss ve Trol HP'si ölçülen kapsamayla yeniden hesaplandı, ⚠️ kalktı
- [ ] Seviye seçim, 3 yıldız (20/15-19/≤14), kayıt çalışıyor
- [ ] Gizli sekmede çökmüyor
- [ ] `dist/` alt klasörden servis edilince çalışıyor
- [ ] İlk yükleme < 3 sn, ilk indirme ≤ 5 MB, dosya sayısı ≤ 1500
- [ ] Yayın yapısında konsol çıktısı ve hata ayıklama yok
- [ ] itch.io'da yayında; 3 kişiye oynatıldı ve notlar alındı
- [ ] `ROADMAP.md` M7 denge kontrol listesinin 9 maddesi işlendi

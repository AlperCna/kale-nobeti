# M4 — Tam kule/düşman seti, yükseltme, bilgi paneli

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M4 |
| **Görev** | 11 (`M4-T01` … `M4-T11`) |
| **Kod yazma süresi** | ~7 sa 25 dk — **takvim değil** |
| **Takvim bütçesi** | 4 gün (`ROADMAP.md`). Fark: 9 düşman + 12 kademenin elle denenmesi. |
| **Durum** | ☑ tamamlandı |

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı.
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/plan/DEPENDENCIES.md` — §2 (uçan hareketi)
4. `docs/GAME-DESIGN.md` §4.1–§4.3, §4.5, §5 (**tamamı**, ⚠️ notu dahil),
   §7 (boss dalgası), §11 (bilgi paneli)
5. `docs/research/03-mekanik-tasarim.md` §2 (uçan hattı, Defense Grid çözümü),
   §7 (bilgi paneli)
6. `docs/research/01-denge-matematigi.md` §10 (odaklanma kaybı)

**Kışla bu taşta yok** — kendi taşı var (M5). `research/03` §1 açma.

## 1. Amaç ve bitiş durumu

**Amaç:** Karşı-oyun tablosunu (`GAME-DESIGN.md` §5) çalışır hale getirmek.
Üç kule ailesinin tam kademe ağacı, dokuz düşman tipi, ve **bilgi paneli** —
"bilgi eksikliği türün 1 numaralı şikâyeti" (§11), sonraya bırakılmaz.

**Taş bittiğinde oyun:** Okçu/Top/Büyü aileleri T1→T2→T3a/T3b yükseltiliyor.
Dokuz düşman tipi çalışıyor: uçan Harpi ayrı hattan geliyor ve hattı hazırlık
aşamasında görünüyor; Şaman iyileştiriyor, Trol yenileniyor, Örümcek Ana
bölünüyor, Ogre Şef geliyor. Kule seçilince **o düşmana karşı etkin DPS**
okunabiliyor. Hedefleme menüsü beş modu sunuyor.

**Olmayan:** Kışla ve askerler (M5), yetenekler (M5), ses, sanat, harita 2-3.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| 1 — denge verisi | `M4-T01`, `M4-T02`, `M4-T07`, `M4-T09` |
| 3 — havuzlama | `M4-T05`, `M4-T08` (yavrular havuzdan) |
| 5 — `any` yasak | hepsi |
| 7 — `BitmapText` | `M4-T10` (etkin DPS her seçimde değişiyor) |
| 8 — ham `delta` | `M4-T04`, `M4-T05`, `M4-T07` |
| 9 — karesel mesafe | `M4-T04`, `M4-T07` |

---

## 2. Görevler

### M4-T01 — Kademe ağacı ve dallanma yapısı

`M4-T01` · ☑ · ~40 dk · Önkoşul `M2-T01` · TIER 1 **k.1**, k.5 · Açık soru S41
· Doküman `GAME-DESIGN.md` §4.1–§4.3 tabloları

**Dosyalar**
- `src/types/tower.ts` — değişiklik — dallanma
- `src/data/towers.ts` — değişiklik — 12 kademe (3 aile × 4)

**İmza**
```ts
export interface TowerDef {
  readonly id: TowerId;
  readonly role: string;                    // "tek hedef" / "alan" / "zırh delen"
  readonly damageType: DamageType;
  readonly tiers: readonly [TowerTier, TowerTier];        // T1, T2
  readonly branches: readonly [TowerTier, TowerTier];     // T3a, T3b
}
```

**Yapılacak**
- Sayılar §4.1–§4.3 tablolarından birebir. Okçu T2 `110/10/1.3/165`,
  Keskin Nişancı `170/26/0.6/260`, Kundakçı `170/9+yanma/1.4/165`; Top T2
  `160/34/0.55/150`, Havan `240/48/0.45/230/70`, Barut Fıçısı
  `240/30+yavaşlatma/0.6/150/65` **`airMultiplier: 0.5`** (§4.2 düzeltmesi).
- Büyü T1 `100/14/0.7/155`, T2 `150/24/0.75/170`, Yıldırım
  `230/30 zincir/0.7/170`, Buz `230/20+yavaşlatma/0.8/180`.
- T3 dalı seçildikten sonra geri alınabilirliği **S41**.

**Kabul kriteri**
```bash
npm run test -- data
```
Beklenen: 12 kademenin her sayısı §4 tablolarıyla eşleşiyor;
Barut Fıçısı `airMultiplier === 0.5`, Havan `0`.

**Bitmedi sayılır eğer:** herhangi bir kademe `GAME-DESIGN.md`'de olmayan
bir sayı içeriyorsa.

---

### M4-T02 — Büyü kulesi ailesi

`M4-T02` · ☑ · ~35 dk · Önkoşul `M4-T01` · TIER 1 k.1 · Açık soru —
· Doküman `GAME-DESIGN.md` §4.3, §3 (büyü hasarı)

**Dosyalar**
- `src/data/towers.ts` — değişiklik
- `src/systems/TowerSystem.ts` — değişiklik — `damageType: 'magic'` yolu

**Yapılacak**
- Büyü hasarı `applyDamage` içinde yüzde azalma yoluna girer (§3).
- Büyü, zırhlı düşmanların **tek temiz cevabı** (§4.3) — bu, `M4-T10`
  bilgi panelinde gösterilecek asıl fark.

**Kabul kriteri**
```bash
npm run dev
```
gözle: Büyü T1 (14 hasar) Zırhlı Ork'a (zırh 8) **14** veriyor;
Okçu T1 (6 hasar) aynı düşmana **0.9** (gri, tabana düşmüş) veriyor.

**Bitmedi sayılır eğer:** büyü hasarı zırhtan etkileniyorsa.

---

### M4-T03 — Yükseltme akışı ve maliyet

`M4-T03` · ☑ · ~45 dk · Önkoşul `M4-T01`, `M3-T03` · TIER 1 k.1, k.7
· Açık soru S40, S41 · Doküman `GAME-DESIGN.md` §4.5, §6 (yükseltme gerekçesi)

**Dosyalar**
- `src/systems/TowerSystem.ts` — değişiklik — `upgrade()`
- `src/systems/BuildSpotUI.ts` — değişiklik — yükseltme paneli

**İmza**
```ts
upgrade(tower: Tower, branch?: 0 | 1): boolean;   // T2'den sonra dal zorunlu
```

**Yapılacak**
- Maliyet kümülatif **değil** — her kademe kendi `cost`'unu alır (§4.1 tablosu).
- Satış iadesi **harcanan toplamın** %70'i (§4.5).
- §6: yükseltme altın başına DPS olarak verimsizdir ve bu **bilinçlidir**;
  yer kıtlığı yüzünden mantıklı. Panelde bunu gizleme — öncesi/sonrası
  DPS farkı açıkça gösterilir (§11).
- Yükseltme sırasında ateş devam ediyor mu — **S40**.

**Kabul kriteri**
```bash
npm run dev
```
gözle: T1 kuleyi T2'ye yükseltebiliyorum; T2'den sonra iki dal seçeneği
çıkıyor; yetersiz altında buton pasif; satınca harcanan toplamın %70'i geliyor.

**Bitmedi sayılır eğer:** T3 kule T2 maliyetiyle alınabiliyorsa.

---

### M4-T04 — Kule efektleri: yanma, yavaşlatma, zincirleme

`M4-T04` · ☑ · ~45 dk · Önkoşul `M4-T01` · TIER 1 k.8, **k.9** · Açık soru S34, S35, S36
· Doküman `GAME-DESIGN.md` §4.1 (Kundakçı), §4.2 (Barut Fıçısı), §4.3 (Yıldırım, Buz)

**Dosyalar**
- `src/systems/effects.ts` — yeni — süreli etki yönetimi
- `src/entities/Enemy.ts` — değişiklik — etki listesi

**İmza**
```ts
export type TowerEffect =
  | { kind: 'burn';  dps: number; seconds: number }        // Kundakçı 4/sn, 4 sn
  | { kind: 'slow';  factor: number; seconds: number }     // %40 / %50
  | { kind: 'chain'; targets: number; falloff: number };   // Yıldırım 3, %70
```

**Yapılacak**
- Etki süreleri `scaledDelta` ile azalır (TIER 1 k.8) — 2× hızda yanma da
  hızlanır.
- Zincirleme hedef seçimi `distSq` (TIER 1 k.9).
- **Yığılma kuralları dokümanda yok:** yanma **S34**, yavaşlatma **S35**,
  zincirleme aynı hedefe iki kez **S36**. Geçici: hepsi yenileme
  (yığılmaz, süre sıfırlanır) ve `// GEÇİCİ — S34/S35/S36` işaretli.

**Kabul kriteri**
```bash
npm run test -- effects
```
Beklenen: `≥ 5 passed` — yanma toplam `dps × seconds` hasar veriyor;
yavaşlatma hızı `× (1 - factor)` yapıyor ve süre sonunda geri alıyor;
zincirleme `targets` kadar sıçrıyor ve her sıçramada `× falloff`;
2× hızda süreler yarıya iniyor.

**Bitmedi sayılır eğer:** yavaşlatma süresi bitince hız eski değerine
dönmüyorsa.

---

### M4-T05 — `LineMover` ve uçan hareketi

`M4-T05` · ☑ · ~40 dk · Önkoşul `M1-T06` · TIER 1 k.3, k.8 · Açık soru —
· Doküman `GAME-DESIGN.md` §5 (Harpi) · `DEPENDENCIES.md` §2

**Dosyalar**
- `src/entities/movers.ts` — değişiklik — `LineMover`
- `src/data/enemies.ts` — değişiklik — Harpi

**Yapılacak**
- `LineMover` `Mover` arayüzünü uygular — `Enemy` **değişmez**
  (`DEPENDENCIES` §2'nin sebebi buydu).
- Harpi `flyerPaths` üstünde düz gider, yolu takip etmez, engellenemez (§5).
- `remainingDistance` uçan için kaleye düz mesafe.
- Harpi `70/75/0/0`, altın 9, puan 3 (§5 tablosu).

**Kabul kriteri**
```bash
npm run test -- movers
```
Beklenen: `≥ 3 passed` — `LineMover` düz gidiyor; `Enemy` sınıfında
`PathMover`'a özel kod yok; Harpi `flying === true`.

**Bitmedi sayılır eğer:** uçan desteği için `Enemy` sınıfına `if (flying)`
dalı eklendiyse.

---

### M4-T06 — Uçan hattı gösterimi ve harita kabul kriteri

`M4-T06` · ☑ · ~40 dk · Önkoşul `M4-T05`, `M1-T02` · TIER 1 k.7 · Açık soru —
· Doküman `GAME-DESIGN.md` §5 (uçan hattı zorunlu) · `research/03` §2

**Dosyalar**
- `src/scenes/GameScene.ts` — değişiklik — iz çizgisi
- `src/util/coverage.ts` — değişiklik — uçan hattı kesişim sayısı

**Yapılacak**
- Hazırlık aşamasında o dalgada uçan varsa `flyerPaths` **soluk kesikli
  altın çizgi** olarak gösterilir; dalga başlayınca sönümlenir (§5).
- Yapı noktası seçiliyken menzil uçan hattını kesiyorsa kesişen parça
  vurgulanır (§5).
- **Harita kabul kriteri:** `flyerPaths`, yapı noktalarının en az **%40'ının**
  menzilinden geçmeli (8 noktalı haritada ≥ 3). Ölçüm `coverage.ts` ile,
  test olarak yazılır.

**Kabul kriteri**
```bash
npm run test -- coverage
```
Beklenen: `≥ 1 ek test` — harita 1 için uçan hattı ≥ 3 yapı noktasının
menzilinden geçiyor.
gözle: hazırlıkta kesikli altın hat görünüyor, dalga başlayınca sönüyor.

**Bitmedi sayılır eğer:** test kırmızıysa **harita düzeltilir**, test
gevşetilmez. Kriter sağlanmıyorsa harpi mekaniği yazı-turadır
(`research/01` §7).

---

### M4-T07 — Şaman iyileştirmesi ve Trol yenilenmesi

`M4-T07` · ☑ · ~45 dk · Önkoşul `M4-T05` · TIER 1 k.1, k.8, **k.9** · Açık soru S37, S39
· Doküman `GAME-DESIGN.md` §5

**Dosyalar**
- `src/systems/EnemyAbilitySystem.ts` — yeni
- `src/data/enemies.ts` — değişiklik — Şaman, Trol, Zırhlı Ork

**Yapılacak**
- Şaman: yakındaki düşmanlara **8 HP/sn** (§5). **Yarıçap dokümanda yok — S37.**
- Trol: **6 HP/sn** yenilenme (§5). Harita çarpanıyla ölçekleniyor mu — **S39.**
  Ölçeklenmiyorsa harita 3'te (HP ×2.6) oransal olarak zayıflıyor.
- Mesafe kontrolü `distSq` (TIER 1 k.9), süreler `scaledDelta` (k.8).
- Zırhlı Ork `160/38/8/0`, Şaman `130/42/0/0.40`, Trol `400/30/4/0` (§5).
  **Trol'ün 400'ü geçici** (§5 ⚠️ notu).

**Kabul kriteri**
```bash
npm run test -- EnemyAbility
```
Beklenen: `≥ 4 passed` — Şaman yarıçapındaki düşmanı iyileştiriyor,
dışındakini iyileştirmiyor; iyileştirme maksimum HP'yi aşmıyor;
Trol yenileniyor; 2× hızda iyileştirme de iki kat hızlı.

**Bitmedi sayılır eğer:** iyileştirme maksimum HP'nin üstüne çıkabiliyorsa.

---

### M4-T08 — Örümcek Ana bölünmesi

`M4-T08` · ☑ · ~35 dk · Önkoşul `M4-T07`, `M1-T04` · TIER 1 **k.3**, k.1 · Açık soru S38
· Doküman `GAME-DESIGN.md` §5

**Dosyalar**
- `src/systems/EnemyAbilitySystem.ts` — değişiklik
- `src/data/enemies.ts` — değişiklik — Örümcek Ana + yavru

**Yapılacak**
- Ölünce **3× yavru** (HP 30, hız 90) (§5).
- **Yavrunun zırh/direnç/altın/puanı dokümanda yok — S38.** Geçici: hepsi 0,
  altın 0, puan 0; `// GEÇİCİ — S38`.
- Yavrular **havuzdan** alınır (TIER 1 k.3). Havuz doluysa bölünme kısılır —
  sessizce yeni nesne yaratılmaz.
- Yavrular annenin yol ilerlemesini devralır (aynı noktadan devam).

**Kabul kriteri**
```bash
npm run test -- EnemyAbility
```
Beklenen: `≥ 3 ek test` — ölünce 3 yavru çıkıyor; yavrular aynı
`PathProgress`'ten devam ediyor; havuz doluyken bölünme yavru sayısını
kısıyor ve `new` çağırmıyor.

**Bitmedi sayılır eğer:** yavrular `new Enemy()` ile yaratılıyorsa.

---

### M4-T09 — Ogre Şef ve boss dalgası

`M4-T09` · ☑ · ~40 dk · Önkoşul `M4-T07`, `M3-T02` · TIER 1 k.1 · Açık soru S33
· Doküman `GAME-DESIGN.md` §5 (**⚠️ geçicilik notu dahil**), §7 (boss dalgası)

**Dosyalar**
- `src/data/enemies.ts` — değişiklik — Ogre Şef
- `src/data/waves.ts` — değişiklik — harita 1 dalga 10

**Yapılacak**
- Ogre Şef `700/28/10/0.25`, altın 60, puan 25, sızma cezası **10 can** (§5).
- **HP'si geçici** — `// GEÇİCİ — bkz. GAME-DESIGN §5 ⚠️` yorumu zorunlu.
- Kışla askerlerini tek vuruşta öldürme özelliği **M5'te** bağlanır; alan
  şimdi tanımlanır.
- §7: **boss refakatsiz gelir veya refakat boss'tan sonra gönderilir** —
  aksi halde `first` hedeflemesi ateşi refakate yönlendirir
  (`research/01` §10). Seçim **S33**.

**Kabul kriteri**
```bash
npm run dev
```
gözle: dalga 10'da boss geliyor; Okçu T2 ile vurunca **gri** sayı çıkıyor
(zırh 10, tabana düşüyor); Büyü ve Top anlamlı hasar veriyor; boss sızarsa
10 can gidiyor.
```bash
npm run test -- balanceChecks
```
Beklenen: Kısıt A boss için de çalışıyor (sonuç ⚠️ geçici HP'ye dayandığı
notuyla raporlanıyor).

**Bitmedi sayılır eğer:** boss HP'si `enemies.ts` içinde geçicilik yorumu
olmadan duruyorsa.

---

### M4-T10 — Bilgi paneli ve etkin DPS

`M4-T10` · ☑ · ~45 dk · Önkoşul `M4-T03`, `M2-T02` · TIER 1 **k.7** · Açık soru S42
· Doküman `GAME-DESIGN.md` §11 (tam tablo) · `research/03` §7

**Dosyalar**
- `src/scenes/HudScene.ts` — değişiklik — kule bilgi paneli

**Yapılacak**
- §11 tablosundaki yedi gösterge: ham hasar + atış hızı, **hasar tipi
  rozeti**, **seçili düşmana karşı etkin DPS**, menzil + kapsanan yol,
  uçana vurur/vurmaz ikonu, yükseltme farkı (öncesi → sonrası), satış iadesi.
- **Etkin DPS en kritik olan** (§11): panelin altında düşman ikonu şeridi,
  üstüne gelince o düşmana karşı DPS. Hesap `applyDamage` üzerinden —
  yeni matematik yok.
- Tüm sayılar `BitmapText` (TIER 1 k.7) — seçim değiştikçe değişiyorlar.
- Şeritte hangi düşmanların olacağı **S42** (o haritanın kadrosu mu, hepsi mi).

**Kabul kriteri**
```bash
npm run dev
```
gözle: Okçu T2 seçiliyken Ogre Şef ikonuna gelince **1.95 DPS** yazıyor;
Büyü T2 seçiliyken **13.5 DPS**; Havan seçiliyken uçan ikonu üstü çizili.
```bash
npm run guard
```
Beklenen: `9/9 ✓`.

**Bitmedi sayılır eğer:** panel yalnız ham DPS gösteriyorsa — ham DPS
yanıltıcıdır (§11) ve tasarımın karşı-oyun katmanını görünmez bırakır.

---

### M4-T11 — Hedefleme menüsü

`M4-T11` · ☑ · ~35 dk · Önkoşul `M2-T03`, `M4-T10` · TIER 1 k.7, Platform
· Açık soru — · Doküman `GAME-DESIGN.md` §4.5, §5 (karşı-oyun tablosu)

**Dosyalar**
- `src/scenes/HudScene.ts` — değişiklik — mod seçici

**Yapılacak**
- Beş mod kule başına seçilebilir (§4.5). Varsayılan `first`.
- Butonlar ≥ 44×44 px (`CLAUDE.md` Platform).
- Karşı-oyun tablosu bunu şart koşuyor: Şaman'ı `last` ile arkadan seçmek,
  boss'ta `strongest` (§5 tablosu).

**Kabul kriteri**
```bash
npm run dev
```
gözle: kule seçilince beş mod butonu; `last` seçili kule öndeki değil
arkadaki düşmana ateş ediyor; `strongest` seçili kule boss dalgasında
refakati değil boss'u vuruyor.

**Bitmedi sayılır eğer:** mod değişimi mevcut hedefi hemen güncellemiyorsa.

---

## 3. AÇIK SORULAR

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S34 | Kundakçı yanması yığılır mı? | `M4-T04` |
| S35 | Yavaşlatmalar yığılır mı (Buz %50 + Barut Fıçısı %40)? | `M4-T04` |
| S36 | Yıldırım aynı hedefe iki kez sıçrayabilir mi? | `M4-T04` |
| S37 | **Şaman iyileştirme yarıçapı** — dokümanda yok | `M4-T07` |
| S38 | **Örümcek yavrusunun zırh/direnç/altın/puanı** — dokümanda yok | `M4-T08` |
| S39 | Trol yenilenmesi harita çarpanıyla ölçekleniyor mu? | `M4-T07` |
| S40 | Yükseltme sırasında kule ateş etmeye devam ediyor mu? | `M4-T03` |
| S41 | T3 dalı geri alınabilir mi? | `M4-T01`, `M4-T03` |
| S42 | Bilgi panelindeki düşman şeridi hangi düşmanları listeleyecek? | `M4-T10` |

S37, S38, S39 denge etkisi olan **eksik sayılar** — uydurulmadı.

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Uçan hattı hiçbir kuleyi kesmiyor | `M4-T06` testi kırmızı | **Harita düzeltilir**, test gevşetilmez |
| `Enemy` uçan için yarılır | `if (flying)` dalları çoğalıyor | `M4-T05` kabulü `Mover` üzerinden şart koşuyor |
| Yavrular havuz dışı yaratılır | Yoğun dalgada `activeCount` patlıyor | `M4-T08` kabulü `new` yasağını test ediyor |
| Bilgi paneli ham DPS gösterir | Oyuncu neden kulesinin işe yaramadığını anlamıyor | §11'in üçüncü satırı zorunlu |
| Boss geçici HP'siyle "dengelenmiş" sayılır | Denge testi yeşil ama HP ⚠️ işaretli | `M4-T09` yorumu zorunlu; M1 ölçümü gelince yeniden hesap |
| Etkin DPS `Text` ile çizilir | `guard` kontrol 4 kırmızı | TIER 1 k.7 |
| Efekt yığılma kuralları sessizce kararlaştırılır | Kodda yığılma var ama dokümanda yok | S34-S36 işaretleri |

## 5. Taş sonu kontrol listesi

- [x] `typecheck && test && build && guard` dördü de yeşil — 430 test, 9/9 bekçi, 0,39 MB
- [x] Üç aile T1→T2→T3a/T3b yükseltilebiliyor — canlı doğrulandı
- [x] **Karşı-oyun tablosundaki (§5) her tehdidin cevabı çalışıyor** — 7 senaryo `simulateWave` ile ölçüldü: **5 geçti, 3'ü kısmi**. Ayrıntı ve kısmi olanların gerekçesi `docs/results/M4-SONUC.md` §1
- [x] Yanlış kule kurmak oyunu kilitlemiyor, sadece verimsizleştiriyor — 8 Okçu T2 ile zırhlı ork dalgası 7 sızıntı veriyor ama dalga ilerliyor; hiçbir senaryoda kilitlenme yok
- [x] Harpi ayrı hattan geliyor, hat hazırlıkta görünüyor, ≥3 nokta kesiyor — **7-8 nokta** (hedefin 2,3-2,7 katı); ipucu dalga 6/8/9/10'da açık, 5/7'de kapalı
- [x] Şaman iyileştiriyor, Trol yenileniyor, Örümcek bölünüyor — `EnemyAbilitySystem.test.ts`, 22 test
- [x] Boss dalgası çalışıyor; Okçu ona gri sayı yazıyor — Okçu T2 → boss **1,95 DPS**, hasar tabanına dayanmış
- [x] Bilgi paneli **seçili düşmana karşı etkin DPS** gösteriyor — panel değerleri 12×10 matrisle birebir uyuştu
- [x] Beş hedefleme modu kule başına seçilebiliyor
- [x] Geçici sayılar (S37, S38) kodda işaretli — `EnemyAbilitySystem.ts:57`, `enemies.ts:132`
- [x] Boss HP'sinde geçicilik yorumu var — `enemies.ts` `OGRE_SEF`, S43 ölçümüyle güncellendi
- [x] **`docs/results/M4-SONUC.md` yazıldı** — karşı-oyun tablosunun 7
      senaryosu ve uçan hattını kesen nokta sayısı dahil.

### Kısmi kalan üç senaryo

| # | Neden kısmi | Nereye taşındı |
|---|---|---|
| 2 Zırhlı Ork | Olumsuz iddia güçlü (Okçu %14 verim, 7/8 sızıntı); olumlu iddia zayıf — Top patlamayla dalgayı daha erken bitiriyor | Kabul edildi, tablo değişmiyor |
| 3 Şaman | Mekanizma (`last` + 260 px) ayrı testle doğrulandı, ama `ReferenceBoard` hedefleme modu taşımadığı için uçtan uca ölçülemedi | **M5** — `ReferenceBoard`'a hedefleme modu alanı |
| 6 Kurt Binicisi | Yavaşlatma çalışıyor (Buz çarpanı tam 0,50) ama Harita 1 onu **zorunlu kılmıyor** — üç aile de temizliyor | **M7** — Harita 2-3 |

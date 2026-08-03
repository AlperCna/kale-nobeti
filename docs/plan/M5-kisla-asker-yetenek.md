# M5 — Kışla, askerler, yetenekler

| | |
|---|---|
| **ROADMAP** | `docs/ROADMAP.md` M5 |
| **Görev** | 9 (`M5-T01` … `M5-T09`) |
| **Kod yazma süresi** | ~5 sa 55 dk — **takvim değil** |
| **Takvim bütçesi** | 3 gün (`ROADMAP.md`). Fark: 9 engelleme kuralının kenar durumları. |
| **Durum** | ☐ bekliyor |

## 0. Oturum başlangıcı

1. `CLAUDE.md` — tamamı.
2. `docs/plan/TASK-TEMPLATE.md`
3. `docs/plan/DEPENDENCIES.md` — **§7** (kışla `PathSystem`'e sızıyor)
4. `docs/GAME-DESIGN.md` §4.4 (**9 engelleme kuralı — bu taşın sözleşmesi**),
   §8 (yetenekler), §5 (boss askerleri tek vuruşta öldürür)
5. `docs/research/03-mekanik-tasarim.md` §1 (Kingdom Rush'ın belgelenmiş
   davranışı — 9 kuralın kaynağı)

**Başka dosya açma.**

> **Neden ayrı taş:** engelleme, türün en çok kenar durum üreten mekaniği.
> `TowerSystem`'e sıkıştırılırsa bug fabrikası olur (`ROADMAP.md` M5).

## 1. Amaç ve bitiş durumu

**Amaç:** Kışlayı ve iki aktif yeteneği eklemek. Kışla hasar vermez, **zaman
kazandırır** — düşmanı durdurup diğer kulelerin menzilinde tutar (§4.4).
Bu, TD'yi "izleme" oyunu olmaktan çıkaran mekanik.

**Taş bittiğinde oyun:** Kışla kurulabiliyor, askerler çıkıyor, toplanma
noktası sürüklenebiliyor, düşmanlar kilitleniyor. Meteor ve Takviye
çalışıyor, bekleme süreleri HUD'da dairesel dolumla görünüyor.
Karşı-oyun tablosundaki "Trol → Kışla ile tut + yoğun tek hedef" senaryosu
gerçekten işliyor.

**Olmayan:** ses, sanat, harita 2-3.

### TIER 1 kapsaması

| Kural | Nerede |
|---|---|
| 1 — denge verisi | `M5-T01` |
| **3 — havuzlama** | `M5-T02`, `M5-T09` |
| 5 — `any` yasak | hepsi |
| 7 — `BitmapText` | `M5-T07` (bekleme sayacı) |
| 8 — ham `delta` | `M5-T02`, `M5-T05`, `M5-T07` |
| **9 — karesel mesafe** | `M5-T03`, `M5-T04` (aggro 60 px, temas 20 px) |

---

## 2. Görevler

### M5-T01 — Kışla verisi ve engelleme sabitleri

`M5-T01` · ☐ · ~35 dk · Önkoşul `M4-T01` · TIER 1 **k.1** · Açık soru S43, S44
· Doküman `GAME-DESIGN.md` §4.4 tablosu ve kural 2, 6

**Dosyalar**
- `src/types/barracks.ts` — yeni
- `src/data/towers.ts` — değişiklik — kışla ailesi
- `src/data/balance.ts` — değişiklik — engelleme sabitleri

**İmza**
```ts
export interface BarracksTier {
  readonly cost: number;        // altın
  readonly soldierCount: number;
  readonly soldierHp: number;
  readonly soldierDps: number;
  readonly respawnSeconds: number;
  readonly shield?: number;     // Paladin — AÇIK SORU S43
  readonly evasion?: number;    // Haydutlar %25 — S44
}
export const BLOCK = {
  aggroRadius: 60,      // px — §4.4 kural 2
  contactRadius: 20,    // px — §4.4 kural 2
  rallyRange: 160,      // px — §4.4 kural 6
  pathSnapMax: 40,      // px — §4.4 kural 6
} as const;
```

**Yapılacak**
- §4.4 tablosu birebir: T1 `90/2/45/5/8sn`, T2 `140/2/75/8/7sn`,
  Paladin `210/2/140/11+kalkan/6sn`, Haydutlar `210/3/70/9+%25 kaçınma/5sn`.
- **Paladin "kalkan" sayısal değeri dokümanda yok — S43.**
- Haydutlar kaçınmasının anlamı (hasar iptali mi isabet şansı mı) — **S44**.

**Kabul kriteri**
```bash
npm run test -- data
```
Beklenen: dört kademenin sayıları §4.4 ile eşleşiyor; `BLOCK` sabitleri
§4.4 kural 2 ve 6 ile eşleşiyor.

**Bitmedi sayılır eğer:** `shield` için uydurulmuş bir sayı varsa
(`undefined` + S43 işareti olmalı).

---

### M5-T02 — `Soldier` entity ve havuz

`M5-T02` · ☐ · ~40 dk · Önkoşul `M5-T01`, `M1-T04` · TIER 1 **k.3**, k.8
· Açık soru — · Doküman `research/02` §7 (havuz boyutu 24)

**Dosyalar**
- `src/entities/Soldier.ts` — yeni

**İmza**
```ts
export class Soldier extends Phaser.GameObjects.Rectangle implements Poolable {
  hp: number;
  dps: number;
  engagedWith: Enemy | null;     // §4.4 kural 1
  home: Vec2;                    // kışla konumu
  rally: Vec2;                   // toplanma noktası
  state: 'walking' | 'idle' | 'fighting' | 'dead';
  resetForPool(): void;
}
```

**Yapılacak**
- Havuz ön ayırma **24** (`research/02` §7).
- `resetForPool`: `engagedWith`, `hp`, `state`, tween — hepsi.
  Sıfırlanmayan `engagedWith` ölü askeri düşmana kilitli bırakır.
- Hareket `scaledDelta` (TIER 1 k.8).

**Kabul kriteri**
```bash
npm run test -- Soldier
```
Beklenen: `≥ 4 passed` — `resetForPool` sonrası `engagedWith === null`;
havuz dolunca `acquire` `null`; durum geçişleri geçerli; ölünce
`state === 'dead'`.

**Bitmedi sayılır eğer:** ölen asker havuza dönmüyorsa.

---

### M5-T03 — Toplanma noktası

`M5-T03` · ☐ · ~45 dk · Önkoşul `M5-T02` · TIER 1 **k.9**, Platform
· Açık soru — · Doküman `GAME-DESIGN.md` §4.4 kural 6, sinerji notu

**Dosyalar**
- `src/systems/BarracksSystem.ts` — yeni — toplanma noktası yönetimi

**Yapılacak**
- Sürüklenebilir işaretçi. Tutma alanı ≥ 44×44 px (`CLAUDE.md` Platform).
- **Kışladan `rallyRange = 160 px` içinde olmalı** (§4.4 kural 6) —
  dışına sürüklenirse sınıra kenetlenir.
- **Yola `≤ 40 px` mesafedeki bir noktaya yapışır**; yol dışına konamaz
  (§4.4 kural 6).
- Mesafe kontrolleri `distSq` (TIER 1 k.9).

**Kabul kriteri**
```bash
npm run test -- BarracksSystem
```
Beklenen: `≥ 4 passed` — menzil dışına sürükleme sınıra kenetleniyor;
yoldan uzak nokta en yakın yol noktasına yapışıyor; yapışma mesafesi
`≤ 40 px`; işaretçi kışla menzilinde kalıyor.

**Bitmedi sayılır eğer:** toplanma noktası yol dışına konabiliyorsa.

---

### M5-T04 — Engelleme kuralları 1-4: kilitlenme

`M5-T04` · ☐ · ~45 dk · Önkoşul `M5-T03` · TIER 1 **k.9**, k.8 · Açık soru S45
· Doküman `GAME-DESIGN.md` §4.4 kural 1, 2, 3, 4 · `research/03` §1

**Dosyalar**
- `src/systems/BarracksSystem.ts` — değişiklik — kilitlenme mantığı
- `src/entities/Enemy.ts` — değişiklik — `blockedBy` tipi netleşir

**Yapılacak**
- **Kural 1:** `Soldier.engagedWith` ve `Enemy.blockedBy` alanları
  (`blockedBy` `M1-T06`'da zaten tanımlıydı — `DEPENDENCIES` §7).
- **Kural 2:** aggro `60 px` içindeki en yakın **engellenmemiş** düşmanı
  hedefle, yürü; temas `20 px`'te iki taraf kilitlenir, düşmanın yol
  ilerlemesi **durur**.
- **Kural 3:** bir düşman birden çok asker tarafından dövülebilir; düşman
  **yalnızca `blockedBy` askerine** hasar verir, diğerleri bedava DPS ekler.
- **Kural 4:** kilit kırılır (asker ölür / düşman ölür); askeri ölen düşman
  aggro içinde serbest asker varsa yeniden kilitlenir, yoksa yürür.
- Asker toplanma noktasına yürürken saldırıya uğrar mı — **S45**.

**Kabul kriteri**
```bash
npm run test -- BarracksSystem
```
Beklenen: `≥ 6 passed` — her kural için ayrı test. Özellikle kural 3:
iki asker bir düşmanla dövüşürken **düşman yalnız birine** hasar veriyor,
ama **iki askerin DPS'i de** sayılıyor.

**Bitmedi sayılır eğer:** kilitli düşman yol boyunca ilerlemeye devam ediyorsa.

---

### M5-T05 — Engelleme kuralları 5-9: sayı, diriliş, uçan, boss

`M5-T05` · ☐ · ~45 dk · Önkoşul `M5-T04` · TIER 1 k.3, k.8 · Açık soru S46
· Doküman `GAME-DESIGN.md` §4.4 kural 5, 7, 8, 9 · §5 (boss)

**Dosyalar**
- `src/systems/BarracksSystem.ts` — değişiklik

**Yapılacak**
- **Kural 5:** askerler düşmandan azsa fazla düşmanlar **hiç durmadan
  geçer.** Kışla bir baraj değil, zaman kazanma aracı — bilinçli.
- **Kural 7:** ölen asker `respawn` süresi sonra kışlada doğar ve toplanma
  noktasına **yürür**; yürürken engelleme yapmaz.
- **Kural 8:** `enemy.flying === true` ise asker onu hedeflemez.
- **Kural 9:** Ogre Şef askerleri **tek vuruşta** öldürür (§5) — kışla
  boss'a karşı ~1 saniyelik gecikme sağlar, bilinçli.
- Kışla satılırsa askerlere ne olur — **S46**.

**Kabul kriteri**
```bash
npm run test -- BarracksSystem
```
Beklenen: `≥ 5 ek test` — 3 düşman 2 askere gelince biri geçiyor;
dirilen asker yürürken `engagedWith === null`; harpi hedeflenmiyor;
boss askeri tek vuruşta öldürüyor.

**Bitmedi sayılır eğer:** dirilirken yürüyen asker engelleme yapıyorsa.

---

### M5-T06 — İki kışla sinerjisi ve senaryo doğrulaması

`M5-T06` · ☐ · ~35 dk · Önkoşul `M5-T05` · TIER 1 — · Açık soru —
· Doküman `GAME-DESIGN.md` §4.4 sinerji notu, §5 karşı-oyun tablosu

**Dosyalar**
- `src/systems/BarracksSystem.test.ts` — değişiklik — senaryo testleri

**Yapılacak**
- **Sinerji (§4.4):** iki kışlanın toplanma noktası aynı yere konursa iki
  takım tek düşmana grup halinde saldırır — daha çok hasar, daha az kayıp.
  Bu kural 3'ten **doğal olarak çıkmalı**; ayrı kod gerekmiyorsa bunu
  testle kanıtla.
- **Karşı-oyun doğrulaması:** "Trol → Kışla ile tut + yoğun tek hedef"
  (§5 tablosu) senaryosu elle oynanır.

**Kabul kriteri**
```bash
npm run test -- BarracksSystem
```
Beklenen: sinerji testi — iki kışla aynı noktada, tek düşmana karşı toplam
DPS iki takımın toplamı, kayıp tek kışlaya göre az.
gözle, ölçülebilir karşılaştırma: aynı Trol'ü **kışlasız** ve **kışlalı**
tahtayla iki kez gönder. Kışlalı denemede Trol'ün kule menzilinde geçirdiği
süre **en az %50 daha uzun** olmalı (geliştirme sayacıyla ölç). Kışlasız
denemede Trol sızıyorsa, kışlalı denemede sızmamalı.

**Bitmedi sayılır eğer:** sinerji için özel kod yazıldıysa (kural 3'ten
çıkması gerekiyor — çıkmıyorsa kural 3 yanlış uygulanmış).

---

### M5-T07 — `AbilitySystem` ve bekleme göstergesi

`M5-T07` · ☐ · ~40 dk · Önkoşul `M0-T04` · TIER 1 **k.7**, k.8 · Açık soru S49
· Doküman `GAME-DESIGN.md` §8

**Dosyalar**
- `src/systems/AbilitySystem.ts` — yeni
- `src/scenes/HudScene.ts` — değişiklik — dairesel dolum

**Yapılacak**
- İki yetenek, tıkla-hedefle, bekleme süreli (§8).
- Bekleme `scaledDelta` ile azalır (TIER 1 k.8) — 2× hızda da doğru.
- HUD'da **dairesel dolum**; hazır olunca altın kenar bir kez parlar (§8).
- Kalan süre sayısı `BitmapText` (TIER 1 k.7).
- Bekleme haritalar arası sıfırlanıyor mu — **S49**.

**Kabul kriteri**
```bash
npm run test -- AbilitySystem
```
Beklenen: `≥ 4 passed` — bekleme dolmadan kullanılamıyor; 2× hızda bekleme
yarı sürede doluyor; kullanım sonrası tam süreye sıfırlanıyor.

**Bitmedi sayılır eğer:** bekleme ham `delta` ile azalıyorsa.

---

### M5-T08 — Meteor

`M5-T08` · ☐ · ~35 dk · Önkoşul `M5-T07`, `M2-T09` · TIER 1 **k.9** · Açık soru S48
· Doküman `GAME-DESIGN.md` §8, §3 (gerçek hasar)

**Yapılacak**
- Hedeflenen **90 px yarıçapta 180 gerçek hasar**, bekleme **45 sn** (§8).
- **Gerçek hasar** hiçbir şeyle azalmaz (§3) — zırh ve direnç yok sayılır.
- Yarıçap kontrolü `distSq` (TIER 1 k.9).
- Uçanları da vuruyor mu — **S48** (dokümanda belirtilmemiş).

**Kabul kriteri**
```bash
npm run test -- AbilitySystem
```
Beklenen: `≥ 2 ek test` — Ogre Şef'e (zırh 10, direnç %25) **180** hasar;
yarıçap dışındaki düşman etkilenmiyor.

**Bitmedi sayılır eğer:** Meteor hasarı zırhtan etkileniyorsa.

---

### M5-T09 — Takviye

`M5-T09` · ☐ · ~35 dk · Önkoşul `M5-T07`, `M5-T02` · TIER 1 **k.3** · Açık soru S47
· Doküman `GAME-DESIGN.md` §8

**Yapılacak**
- Hedeflenen noktaya **2 geçici asker** (HP 60, DPS 7, **20 sn ömür**),
  bekleme **20 sn** (§8).
- Askerler **havuzdan** alınır (TIER 1 k.3), ömür bitince havuza döner.
- Engelleme yapıyorlar mı — **S47** (§8 yalnız "2 geçici asker" diyor).
  Geçici: kışla askerleriyle aynı kurallara tabi.

**Kabul kriteri**
```bash
npm run test -- AbilitySystem
```
Beklenen: `≥ 2 ek test` — 20 sn sonra askerler havuza dönüyor;
havuz doluyken Takviye asker sayısını kısıyor ve `new` çağırmıyor.

**Bitmedi sayılır eğer:** geçici askerler ömür sonunda `destroy` ediliyorsa
(havuza dönmeli).

---

## 3. AÇIK SORULAR

| # | Özet | Bloke ettiği görev |
|---|---|---|
| S43 | **Paladin "kalkan"** sayısal değeri — dokümanda yok | `M5-T01` |
| S44 | Haydutlar %25 kaçınma: hasar iptali mi, isabet şansı mı? | `M5-T01` |
| S45 | Toplanma noktasına yürüyen asker saldırıya uğrar mı? | `M5-T04` |
| S46 | Kışla satılırsa askerler ne olur? | `M5-T05` |
| S47 | Takviye askerleri engelleme yapıyor mu? | `M5-T09` |
| S48 | Meteor uçanları da vuruyor mu? | `M5-T08` |
| S49 | Yetenek beklemeleri haritalar arası sıfırlanıyor mu? | `M5-T07` |

## 4. Riskler

| Risk | Erken uyarı | Hafifletme |
|---|---|---|
| Kilitli düşman ilerlemeye devam eder | Kışla hiçbir şey yapmıyor gibi | `M5-T04` kabulü bunu test ediyor |
| Sayı üstünlüğü kuralı yanlış (kural 3) | İki asker bir düşmanı iki kat hızlı öldürmüyor | Kural 3 testi + `M5-T06` sinerjisi |
| Dirilen asker yürürken engelliyor | Askerler yolun ortasında takılıyor | Kural 7 testi |
| Asker havuzu sızdırır | `activeCount` artıyor | `resetForPool` testi |
| `blockedBy` alanı M1'de yoksa | `PathSystem`'e geri dönmek gerekiyor | `M1-T06` bunu şart koşmuştu |
| Boss kışlayla kilitleniyor | Boss duruyor, tasarım bozuluyor | Kural 9 testi (tek vuruşta öldürme) |

## 5. Taş sonu kontrol listesi

- [ ] `typecheck && test && build && guard` dördü de yeşil
- [ ] **§4.4'teki 9 kuralın her biri için ayrı test var ve geçiyor**
- [ ] Toplanma noktası sürüklenebiliyor, menzil ve yol kısıtı çalışıyor
- [ ] İki kışla aynı noktaya toplanınca grup dövüşü çalışıyor
- [ ] Trol'ü kışlayla tutup eritmek karşı-oyun tablosundaki gibi işliyor
- [ ] Boss askerleri tek vuruşta öldürüyor
- [ ] Meteor ve Takviye çalışıyor, bekleme HUD'da dairesel dolumla görünüyor
- [ ] 2× hızda beklemeler de iki kat hızlı
- [ ] Asker ve geçici asker havuzları sızdırmıyor
- [ ] S43'e uydurulmuş bir kalkan değeri **yazılmadı**

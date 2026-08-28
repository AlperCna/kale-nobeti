# Y08 · Test kapsamı haritası — `entities/` ve `fx/` tamamen testsiz

| | |
|---|---|
| **Tür** | Yapısal — test |
| **Önem** | Orta. Bir kısmı **bilinçli ve doğru**, bir kısmı gerçek boşluk |
| **Emek** | Orta |
| **Risk** | Düşük |
| **Dokunulan** | `src/entities/*.test.ts` (yeni), `src/systems/effects.test.ts` genişletme |
| **İlgili** | `docs/plan/TEST-STRATEGY.md` · TIER 1 kural 3, 11 |

---

## Ölçüm

72 kaynak dosya, 34 test dosyası. Yan yana konan tam harita:

### `systems/` — **16/16 testli** ✅

```
✅ AbilitySystem  BarracksSystem  EconomySystem  EnemyAbilitySystem
✅ EventBus  GameClock  PathSystem  ProjectileSystem  SaveSystem
✅ Settings  TargetingSystem  TowerSystem  WaveManager
✅ balanceChecks  buildSpots  combat  effects  movers  waveSim
```

Bir tane bile eksik yok. Bu, TIER 1 kural 11'in (`systems/` Phaser'sız)
doğrudan getirisi — kural, testi mümkün kıldığı için test yazılmış.

### `util/` — **4/6 testli**

```
✅ coverage  i18n  math  pool
❌ devHooks   ← üretimde siliniyor, test gereksiz (doğru)
❌ storage    ← gerçek boşluk (aşağıda)
```

### `data/` — **6/10 testli**

```
✅ barracks  bossScaling  maps  referenceBoards  spriteFrames  towers  waves
❌ abilities  balance  enemies  strings
```

### `entities/` — **0/4** ❌

```
❌ Enemy  Projectile  Soldier  Tower
```

### `fx/` — **0/12** ❌

```
❌ AbilityButtons  DamageText  GoldFlight  HitStop  HudReadout
❌ ParchmentFrame  ScreenShake  SettingsPanel  SoundSystem
❌ TowerInfoPanel  numberFont
```
(`juice.test.ts` var ama bir kaynak dosyanın karşılığı değil — birkaç
efekt davranışını topluca sınıyor.)

### `scenes/` — **0/7** ❌ *(doğru)*

## Neyin testsiz olması doğru

`TEST-STRATEGY.md` ve `CLAUDE.md` Test bölümü açık:

> Görsel/sahne testi yazılmaz.

`scenes/` testsiz kalmalı. `fx/`'in çoğu da öyle — `ParchmentFrame`,
`AbilityButtons`, `SettingsPanel`, `TowerInfoPanel`, `HudReadout`,
`numberFont` **görsel bileşen**; testleri ancak Phaser dünyası kurarak
yazılabilir ve bu, `node` ortamı kararını (S08) bozar.

`devHooks` üretimde silindiği için testi anlamsız.

**Yani 34/72 oranı yanıltıcı okunmamalı.** Doğru soru "kaç dosya
testli" değil, **"test edilebilir olup da test edilmeyen ne var"**.

## Gerçek boşluklar

### 1. `util/storage.ts` — TIER 1 kural 10'un tam kalbi

TIER 1 kural 10:

> `localStorage` erişimi her zaman `try/catch` içinde. Gizli sekmede
> istisna fırlatıyor; sarılmazsa oyun açılışta çöker. Kayıt başarısızsa
> oyuncuya bir kez bildirilir.

`RISKS.md` **R16**: "Gizli sekmede siyah ekran" — *Olasılık Düşük,
**Etki Yüksek***.

`LocalStore` testi **yok**. `Settings` ve `SaveSystem` sahte
`KeyValueStore` ile test ediliyor — yani sözleşmenin *tüketici* tarafı
test altında, **sağlayıcı tarafı değil**. `localStorage` istisna
fırlattığında `LocalStore`'un gerçekten yakaladığı ve `null`/`false`
döndürdüğü hiçbir yerde doğrulanmıyor.

Bu, listedeki **en yüksek değerli** test boşluğu: yüksek etkili bir
riski koruyan tek kod, testsiz. Ve `node`'da kolayca test edilebilir —
fırlatan sahte bir `globalThis.localStorage` enjekte etmek yeterli.

### 2. `entities/*` — havuz sıfırlaması (TIER 1 kural 3)

Dört varlık sınıfının hepsinde `resetForPool()` var ve kural 3 diyor ki:

> Havuza dönen nesne **tüm durumunu sıfırlar** (hedef referansı, tween,
> timer, tint) — sıfırlanmayan hedef referansı ölü düşmanı canlı tutar.

`CLAUDE.md`'nin kendi ifadesiyle bu proje **bu hata sınıfını dört kez
yaşadı**. Ve bu oturumda beşincisi yakalandı (`GoldCoin`'de
`setScale(1)`'in `setDisplaySize` ölçeğini ezmesi) — **sevk edilmeden
önce, elle gözden geçirmede**, testle değil.

Sınıfların mantıksal yarısı zaten testli:
`resetEnemyState` (`movers.test.ts`), `resetSoldierState`
(`BarracksSystem.test.ts`), `resetEffects` (`effects.test.ts`).
Test edilmeyen kısım **Phaser tarafı**: `setDisplaySize`, `clearTint`,
`setFlipX`, `killTweensOf`, `setAngle`, `setAlpha`.

Ve tam olarak orada hata çıkıyor.

**Sahte sahne nesnesiyle test edilebilir.** `CLAUDE.md` Test bölümü
bunu açıkça izin veriyor:

> Phaser'a dokunan kısımlar **sahte sahne nesnesiyle** test edilir.

Ama `Enemy extends Phaser.GameObjects.Sprite` olduğu için sınıfın
kendisi `node`'da örneklenemez. Çözüm: **sıfırlanması gereken alanların
listesini veriden çıkarıp sınamak** — ya da daha basiti, aşağıdaki (b).

### 3. `fx/GoldFlight.ts`, `fx/DamageText.ts` — havuz döngüsü

İkisi de `Poolable` ve ikisi de bir zaman ilerletme adımı (`step`)
taşıyor. `GoldCoin.step` saf matematik (`quadraticBezier`, zaten testli)
ama ömür sayımı ve "vardı mı" dönüşü test edilebilir.

### 4. `data/enemies.ts`, `data/abilities.ts`, `data/balance.ts`

Diğer altı veri dosyası testli (`towers`, `waves`, `maps`, `barracks`,
`bossScaling`, `referenceBoards`). Bu üçü değil.

`enemies.ts` özellikle dikkate değer: içinde S37 (Şaman iyileştirme
yarıçapı 90), S38 (yavru istatistikleri), S39 (Trol yenilenmesi harita
çarpanıyla ölçeklenmiyor) gibi **karar** taşıyan sayılar var. S39'un
ayrı bir testi olduğu `OPEN-QUESTIONS.md`'de yazılı — ama
`enemies.test.ts` yok, yani o test başka bir dosyada. Kararların
hangi testle korunduğu izlenebilir değil.

## Seçenekler

### (a) Kapsam aracı ekle ve sayıya bak

`vitest --coverage` (`@vitest/coverage-v8` devDependency).

- ✅ Boşluklar tahminle değil ölçümle bulunur
- ⚠️ Yeni bağımlılık — `CLAUDE.md` "Harici bağımlılık eklemeden önce
  sor" diyor. devDependency ve tarayıcıya gitmiyor, ama yine de sorulmalı.
- ⚠️ **Kapsam yüzdesi bir hedef hâline gelirse zarar verir.** `scenes/`
  ve `fx/` bilinçli olarak testsiz; %85 gibi bir eşik onları test
  etmeye zorlar ve S08 kararını bozar. Ölçüm aracı olarak evet, geçit
  olarak hayır.

### (b) Hedefli testler yaz — kapsam aracı olmadan *(önerilen)*

Yukarıdaki dört boşluğa doğrudan test yaz. Sıra:

**1. `util/storage.test.ts`** — en yüksek değer, en kolay
- `localStorage` yok → `get` `null`, `set` `false`
- `get` fırlatıyor → yakalanıyor, `null`
- `set` fırlatıyor (kota dolu / gizli sekme) → yakalanıyor, `false`,
  uyarı geri çağrımı **bir kez** çağrılıyor
- Normal durum → yaz-oku turu çalışıyor

**2. `entities/` havuz sıfırlama sözleşmesi**
Doğrudan sınıfı örneklemek yerine, **sıfırlanan alanların listesini**
sınamak. Örneğin her varlık sınıfı bir
`static readonly SIFIRLANAN_GORSEL = ['scale','tint','alpha','angle','flipX','frame']`
bildirir ve test, `resetForPool` gövdesinin bu alanların hepsine
dokunduğunu **kaynak metni üzerinden** doğrular.

> Bu kulağa dolaylı geliyor ve öyle. Ama `guard-rules.mjs` zaten tam
> bu tekniği kullanıyor (10 kontrolün hepsi kaynak metni taraması) ve
> **çalışıyor** — bekçiye bağlanan kurallar tutmuş. Havuz sıfırlaması,
> bekçiye bağlanmayı en çok hak eden kural.
>
> **Alternatif:** bunu bir test değil, `guard-rules.mjs`'in **11.
> kontrolü** yap. Daha tutarlı: kural TIER 1'de, bekçi TIER 1'i
> koruyor.

**3. `data/enemies.test.ts`** — karar taşıyan sayıları kilitle
S37/S38/S39'un değerlerini doğrudan sına. Amaç regresyon değil,
**kararın izlenebilirliği**: sayı değişirse test adı hangi soruyu
işaret ettiğini söyler.

**4. `fx/GoldFlight`, `fx/DamageText` ömür döngüsü**
Düşük öncelik. Phaser sınıflarından türedikleri için sahte nesne
kurulumu gerekiyor; kazanç sınırlı.

## Öneri

**(b), 1 → 2 → 3 sırasıyla.** (a) yalnız ölçüm aracı olarak, geçit
olarak değil — ve önce sorularak.

**En yüksek öncelik açık ara `util/storage.test.ts`**: R16 yüksek
etkili, kural TIER 1'de, kodu koruyan hiçbir test yok, ve testi yazmak
yarım saat.

**İkinci öncelik havuz sıfırlaması bekçisi**: proje bu hatayı beş kez
yaşadı, beşincisi bu oturumda ve **tesadüfen** yakalandı.

## Doğrulama

1. `npm run test` — yeni testler yeşil, mevcut 34 dosya etkilenmemiş.
2. `npm run guard` — `test src/ altında test dosyası` kontrolü sayıyı
   güncellemeli.
3. `storage.test.ts` **gerçekten fırlatan** bir sahte ile koşmalı;
   `localStorage`'ı hiç tanımlamamak yeterli değil (iki farklı hata
   yolu: yok, ve var ama fırlatıyor).
4. Havuz bekçisi eklendiyse: bir `resetForPool`'dan kasten bir satır
   sil, bekçi **kırmızı** olmalı. (Kasıtlı bozma sınaması —
   `guard-rules.mjs:319` bir kontrolün bu yolla yakalandığını zaten
   not ediyor.)
5. Test süresi: `simulateWave` "10 dalga < 2 sn" şartı korunmalı.

## Bitmedi sayılır eğer

- `LocalStore` fırlatan bir ortamda test edilmiyorsa.
- Havuz bekçisi kasıtlı bozmayla yakalanmıyorsa.
- Kapsam yüzdesi bir CI geçidi hâline geldiyse (S08 kararını bozar).
- Test süresi 2 saniye şartını aştıysa.

## Sonuç (2026-08-28)

Seçenek (b), önerilen sırayla (1 → 2 → 3) uygulandı.

**1. [storage.test.ts](../../../src/util/storage.test.ts)** — `LocalStore`'un
sağlayıcı tarafı artık test altında. Gerçek `localStorage` API'sini
taklit eden **çalışan** bir sahte (`SahteLocalStorage`) yazıldı —
`Settings.test.ts`'teki "her erişim fırlıyor" sahtesinden kasıtlı
farklı: burada normal okuma/yazma gerçekten çalışıyor, yalnız
`bozAnahtar()` ile işaretlenen anahtarlar fırlatıyor. Bu, "prob
(yoklama) başarılı ama gerçek yazma kota yüzünden fırlıyor" yolunu
ayrı test etmeyi sağladı — `Settings.test.ts`'in kapsamadığı bir kod
yolu.

**Yazarken gerçek bir hata bulundu:** `#kullanilabilir` yalnız kurucuda
ölçülüp bir daha bakılmıyordu. Prob başarılı olup örnek "kullanılabilir"
işaretlendikten SONRA bir `set()` kota yüzünden fırlarsa, o çağrı
yedeğe düşüyordu ama bayrak `true` kalıyordu — bir sonraki `get()`
gerçek `localStorage`'ı tekrar deniyor ve (yazma hiç gerçekleşmediği
için) eski/olmayan değeri döndürüyordu. Yani oyuncunun az önce
değiştirdiği bir ayar, `#yedek`'te doğru değer dururken, okurken sanki
hiç değişmemiş gibi geri geliyordu. Düzeltme: `#kaliciOlarakDus()` —
herhangi bir gerçek erişim (get/set/remove, kurucu dahil) fırlarsa
örnek **kalıcı** olarak yedeğe geçiyor; o andan sonraki her erişim
tutarlı biçimde aynı kaynaktan (yedek) okuyor. Test dosyasında bu
davranış hem doğrudan (`get çalışma sırasında fırlarsa da kalıcı
düşüyor`) hem dolaylı (başka bir anahtarın da artık yedekten okunduğu)
olarak kilitlendi.

**2. Havuz sıfırlaması bekçisi** — plan (b)'nin "alternatif" olarak
önerdiği yol seçildi: test değil, `guard-rules.mjs`'in **11. kontrolü**
(`k.3`). Beş sınıfa (`Enemy`, `Projectile`, `Soldier`, `DamageText`,
`GoldCoin`) `static readonly HAVUZ_ALANLARI` manifestosu eklendi —
her biri kendi `resetForPool()`'unun dokunması gereken Phaser
setter'larını (`Tint` özel: `clearTint`) elle bildiriyor. Bekçi,
listelenen her ad için `resetForPool()` gövdesinde karşılığını arıyor.

**Kasıtlı bozma sınamasında bekçinin KENDİSİNDE bir hata yakalandı:**
ilk yazımda manifest ayrıştırması "ilk `]` görülene kadar birleştir"
mantığı kullanıyordu — ama bildirim satırındaki `readonly string[]`
**tip** ek açıklamasının kendi `]`si erken kesiyordu, `alanlar` listesi
her zaman **boş** çıkıyordu ve kontrol sessizce hiçbir şeyi
doğrulamıyordu (her zaman yeşil). `Enemy.resetForPool()`'dan
`clearTint()` satırı kasten yorum satırına alınıp bekçi koşturulunca
bu ortaya çıktı — bekçi **kırmızı olması gerekirken yeşil kaldı**.
Kök neden: dizi köşeli parantezinin başlangıcı (`= [`) tip ek
açıklamasının köşeli parantezinden ayırt edilmiyordu. Düzeltme: sayım
yalnız `= [`den **sonra** başlıyor, kapanış derinlik sayılarak
buluyor. Düzeltmeden sonra aynı kasıtlı bozma **doğru şekilde**
yakalandı (`k.3 src/entities/Enemy.ts:149 HAVUZ_ALANLARI 'Tint'
bildiriyor ama resetForPool() clearTint( çağırmıyor`), satır geri
alınınca bekçi tekrar yeşile döndü. **Bu, TEST-STRATEGY'nin kendi
uyarısını** ("bekçiler kanıt değil, ağ — negatif doğrulama olmadan
güvenilmez") **canlı olarak doğruladı**: doğrulama listesinin 4.
maddesi (kasıtlı bozma sınaması) süslü bir formalite değil, bu
oturumda gerçekten bir bekçi hatası yakaladı.

**3. [enemies.test.ts](../../../src/data/enemies.test.ts)** — S37
(Şaman iyileştirme: 90 px yarıçap, 8 HP/sn, %40 büyü direnci) ve S38
(Örümcek yavrusu: HP 30/hız 90 dışında her şey bilinçli sıfır, ana
"altın = 3 × puan" oranını koruyor) kilitlendi. S39 (Trol yenilenmesi)
**tekrar edilmedi** — zaten `EnemyAbilitySystem.test.ts`'te test
ediliyordu, yeni dosya yalnız oraya işaret ediyor (izlenebilirlik
sorunu buydu, kapsam sorunu değildi). Liste bütünlüğü (benzersiz id,
`getEnemy` çözümü, hepsinde `leakDamage ≥ 1`) da eklendi.

**4. `fx/GoldFlight`/`fx/DamageText` ömür döngüsü testi** — planın
kendi notu gereği **yapılmadı**: "düşük öncelik... kazanç sınırlı."

### Doğrulama

`npm run typecheck && npm run test && npm run guard && npm run build`
temiz — **727/727 test** (698 → 727, +29), **11/11 guard** (10 → 11,
yeni `k.3`). `docs/KURALLAR.md` diff'i **boş** — beklenen, bu iş
denge sayılarına dokunmuyor. `simulateWave` "10 dalga < 2 sn" şartı
korundu (toplam test süresi ~30 sn, `Duration` alanında `tests`
bölümü 27,66 sn — mevcut büyük testlerin (`waveSim`, `balanceChecks`)
payı, bu oturumun eklediği testler görece küçük).

**Açık kalan uç:** `util/storage.ts` ve `Enemy.ts`/`Soldier.ts`/vb.
bu oturumda değişti (`#kaliciOlarakDus`, `HAVUZ_ALANLARI`) — davranış
değişikliği yalnız `LocalStore`'un çalışma-zamanı-bozulma yolunda
(yukarıda anlatıldı), oyuncuya görünen hiçbir akış değişmedi.

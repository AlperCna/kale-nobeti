# M16 — Dalgalar üst üste binsin (S102)

> **Durum:** plan. `M14` ölçtü, bu taş düzeltiyor.

## Neden

`M14` "Erken başlat" butonunu ölçtü ve **bedelinin olmadığını** buldu:

```ts
// WaveManager.#dalgaBittiMi
if (this.#kuyruk.length > 0) return;
if (this.pool.activeCount > 0) return;   // ← saha boşalmadan dalga bitmiyor
```

Hazırlık aşaması hiçbir zaman düşman varken başlamıyor, yani **dalgalar
üst üste binemiyor**; hazırlık süresi de altın getirmiyor. Sonuç: erken
basmak saf kazanç. §6 onu "geç oyunda gerçek bir karar" diye tanımlıyor
ve bu ifade `M14`'te düzeltildi — ama asıl düzeltme mekanikte.

Klasik tür deseni: hazırlık **kuyruk bitince** başlar, saha boşalınca
değil. O zaman erken basmak "kalan süreyi altına çevir" ile "bir önceki
dalganın artıkları hâlâ yoldayken yenisini çağır" arasında gerçek bir
takas olur.

## Neden pahalı — ve sırayı bu belirliyor

`waveSim` dalgaları **ayrı ayrı** simüle ediyor: `simulateAllWaves` her
dalga için temiz havuz, temiz kule, temiz kışla kuruyor. Bugün bu
zararsız, çünkü oyun da dalgaları ayırıyor (saha boşalmadan sıradaki
başlamıyor). **Kural değişirse model yalan söylemeye başlar:** sim,
dalgayı kuyruk bitince kapatıp artıkları hiç görmez ve bütün denge
sayıları iyimserleşir.

Bu yüzden **önce araç, sonra oyun**. S82/S84'ün dersi aynen geçerli:
yarım modelle sayı türetmek işi iki kez yapmaktır.

---

## Fazlar

### Faz 1 — `waveSim` sürekli zaman çizgisine geçiyor *(risk YÜKSEK)*

Tek `WaveManager`, bütün dalgalar, tek havuz. Tahta dalga başına
**fark** olarak uygulanıyor (var olan kule kademesi güncelleniyor, yeni
nokta ekleniyor) — bugünkü gibi sıfırdan kurulmuyor.

**Kabul:** oyun kuralı **değişmeden** bugünkü rampayı üretiyor
(`0 · 5 · 8 · 12 · 16 · 18`). Fark çıkarsa her biri **adı konmuş** bir
model iyileşmesiyle açıklanmalı (örn. kışla askerleri artık dalgalar
arasında canını taşıyor); açıklanamayan tek bir fark bile Faz 2'yi
durdurur.

### Faz 2 — Oyun kuralı *(risk ORTA)*

- `#dalgaBittiMi` sahayı beklemeyi bırakıyor: kuyruk bitince dalga
  kapanıyor, hazırlık başlıyor, artıklar yürümeye devam ediyor.
- **Tur kaydı kaskadı.** `RunSave` "dalga sınırında saha boş" varsayıyor
  (`GameScene.#turuKaydet` yorumu). Üst üste binmede bu bozuluyor:
  kaydedip yeniden yüklemek sahadaki düşmanları **siler** — oyuncu
  lehine bir sömürü. Çözüm: kayıt yalnız saha gerçekten boşken yazılır;
  `RunSave`'in yazılı sözleşmesi korunuyor, şema değişmiyor.
- Erken başlatma artık gerçek bir takas: kalan saniye altına dönüyor
  ama sıradaki dalga artıkların üstüne biniyor.

**Kabul:** "hep erken bas" ile "hiç basma" ölçülebilir biçimde
**farklı** sonuç veriyor; fark yönü savunulabilir (erken basmak altın
kazandırıyor ama can kaybettiriyor).

### Faz 3 — Denge yeniden türetiliyor *(risk ORTA)*

Rampa ölçütleri aynı: monoton · 1-3 Zor'da < 12 · 4-6 ≥ 12 · hepsi
< 20 · Kolay ≤ 10. Referans tahta hangi politikayı kullanıyorsa
(`withEarlyBonus`) simülasyon da onu kullanmalı — ikisi ayrışırsa model
yine yalan söyler.

> **BİTTİ.** Ve asıl iş beklenen yerde değildi: **çift zaten ayrışıktı**
> (S109). Beş dosya tahtayı `withEarlyBonus = true` ile kurup
> simülasyona politika vermiyordu; `M16` öncesi varsayılan `'temizken'`
> ise yeni kuralda **hiç tetiklenmiyor**. Yani tahta tam erken bonusuyla
> zenginleşiyor, oyuncu o bonusu hiç kazanmıyordu. Ölçülen sapma küçük
> değil: `kisitB` harita 5'te 12 diyordu, doğrusu 15.
>
> Çift tek adrese taşındı — `systems/referansOlcum.ts`
> (`REFERANS_ERKEN_BONUSU = false` + `REFERANS_POLITIKA = 'hic'`), artı
> varsayılanların kaymasını yakalayan iki sağlama. `'hic'` seçildi çünkü
> **kanıtlanabilir biçimde tutarlı tek çift** o: `sonBirkac` ölçülen en
> iyi oyun ama kazandığı bonus sahanın ne zaman boşaldığına bağlı ve
> `cumulativeGold` bonusu ya tam ya hiç sayıyor, arası yok.
>
> **Rampa beşinci kez türetildi:** `0 · 0 · 3 · 13 · 15 · 18`,
> Kolay ×0,80 `0 · 0 · 0 · 8 · 6 · 0`. Çarpanlar: harita 4 `4,4 → 5,6`,
> harita 5 `7,2 → 7,6`, harita 6 `6,2 → **5,6**` — altıncının çarpanı
> **düştü**, çünkü üst üste binme haritanın kendi zorluğunu artırdı.
>
> **Monotonluk iddiası öğrenme yayında gevşetildi.** Harita 2 tabanda
> **0** sızdırıyor ve bu tarama eksikliği değil: S73 altın çarpanını
> HP'nin altına bırakmıyor, yani HP'yi yükseltmek tahtayı da zorunlu
> olarak zenginleştiriyor ve ikisi sadeleşiyor
> (`1,8→0 · 2,0→0 · 2,2→0 · 2,4→0 · 2,6→13` — uçurum, dial değil).
> Altını HP'nin üstünde tutmak da bıçak sırtı veriyor (`2,6/2,8→0`,
> `2,6/3,0→3`, `2,6/3,2→0`). Bu sivri uçlardan birine oturtmak sayıyı
> **uydurmak** olurdu (S82/S84 dersi). İddia ikiye ayrıldı: öğrenme yayı
> azalmıyor, asıl rampa (3'ten sonra) kesin artıyor.
>
> **İki yan bulgu kaydedildi, düzeltilmedi** — ikisi de ayrı taş:
> **S110** Büyü ailesi ekonomiye bağlı (taban 4/18/24/23, zengin tahta
> 2/2/12/24 — ölü değil, kapısı altına bakıyor) ve **S111** Takviye tek
> başına can kaybettiriyor (tutmak artık *erteleme*) ama Meteor'un
> yanında hâlâ katkı ekliyor (11 → 10). İlgili testler bozuk durumu
> **iddia etmiyor**; yalnız ölçülen ve sağlam olanı bağlıyor.

### Faz 4 — Doğrulama ve doküman

Tarayıcıda: erken basınca iki dalga aynı anda sahada. §6 ve
`OPEN-QUESTIONS` S102 güncelleniyor.

---

## Bu planın YAPMADIĞI şeyler

- **Sahadaki düşmanı kaydetmek** — `RunSave` şeması bilerek "dalga
  sınırı" sözleşmesinde kalıyor; alternatifi düşman konumlarını
  serileştirmek ve sürüm yükseltmek.
- **Sonsuz modun yeniden dengelenmesi** — üretici zaten kendi tavanına
  dayanıyor (S105); üst üste binme oradaki doyumu değiştirmiyor.

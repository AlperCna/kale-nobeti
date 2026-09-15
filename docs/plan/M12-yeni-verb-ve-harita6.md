# M12 — Yeni verb ve altıncı harita

> **Durum:** BİTTİ (dört fazın dördü). `M11` karar katmanını düzeltti;
> bu taş **içerik** ekledi: yeni bir düşman verb'ü ve altıncı harita.

## Neden bu taş

`M11` beş faz boyunca oyunun **kararlarını** ölçtü ve düzeltti: aile,
dal, kışla dalı, hedefleme modu, yetenekler. Karar katmanı artık
sağlıklı. Bu planın açılışında iki ölçüm daha yapıldı, ikisi de karar
katmanının iyi durumda olduğunu doğruladı:

| Soru | Ölçüm (harita 3, referans tahta, can kaybı) | Sonuç |
|---|---|---|
| Yerleştirme gerçek mi? | kapsama sıralı **5** · rastgele 9 / 14 / 9 · en düşük kapsama 8 | **Gerçek** — yer 2-3 kat fark ediyor |
| Genişle mi yükselt mi? | 3 nokta 41 · 5 nokta 22 · 8 nokta **10** · 12 nokta 11 | **Çözülmüş** — önce noktaları doldur (§6 kuralı doğru) |

Yerleştirmenin gerçek olması önemli, çünkü oyuncu bunu **görebiliyor**:
yapı noktasının üstüne gelince kapsadığı yol parçası altınla
vurgulanıyor (`MapRenderer.drawHover`) — kapsama sayısı geliştirme
katmanında, ama bilgi oyuncuda.

Geriye kalan eksik `ROADMAP`'in kendi teşhisinde yazılı:

> *"Bu bir **dikey dilim**: çekirdek döngü ve karşı-oyun katmanı tam,
> **içerik ince**."*

`ROADMAP`'in maliyet tablosu da yeni haritayı **en ucuz içerik kolu**
(2-3 gün, yeni sistem yok) diye işaretliyor.

## Ama yalnız harita eklemek yetmez

`M10-T03`'ün dersi: harita 4 ve 5 eklendiğinde **sıfır yeni mekanik**
getirmişlerdi ve bu bir kusur olarak kaydedilip düzeltildi (buz kalkanı
ve boss'un ikinci evresi o yüzden var). Yani projenin kendi kuralı:
**her harita bir şey öğretir.** Altıncı harita da bir verb getirmeli —
ve verb önce gelmeli ki harita onun etrafında tasarlanabilsin.

## Seçilen verb: **yeraltı geçişi**

Bugünkü düşman yetenekleri: iyileştirme (Şaman), yenilenme (Trol),
bölünme (Örümcek Ana), kalkan (harita 4 Ork Savaşçı), ikinci evre
(boss). Hepsi **dayanıklılık** ekseninde; hiçbiri oyuncunun *yer*
kararına dokunmuyor.

**Yeraltı geçişi**: düşman yolun belirli bir aralığında **hedeflenemez**
oluyor, sonra çıkıyor. Seçilme gerekçeleri:

1. **Var olan en gerçek kararı derinleştiriyor.** Yerleştirme zaten 2-3
   kat fark ediyor; gömülü aralık, "bütün kuleleri en yüksek kapsamalı
   iki noktaya yığ" cevabını cezalandırıyor ve *nereye* sorusunu
   düşman tipine bağlıyor.
2. **Yeni sanat istemiyor.** Gömülü düşman saydamlaşıyor; aralık,
   uçan rotası gibi kesikli çizgiyle gösteriliyor (`flyerPaths`
   göstergesi zaten var — aynı dil).
3. **Gözle görünür ve öğretilebilir** (TIER 1 kural 6: bilgi yalnız
   renge dayanmıyor — burada *hareket ve saydamlık*).
4. **Ölçülebilir:** `waveSim` hedef seçimini zaten çalıştırıyor.

**R17 uyarısı bu fazın merkezinde:** hedeflenebilirlik kuralı **tek bir
saf fonksiyonda** yaşayacak ve hem `TargetingSystem` hem `waveSim` onu
çağıracak. `M10`'un üç körlüğü (S80/S81/S86) ve `M11`'in S92'si aynı
hatadan doğdu: kuralın iki kopyası.

---

## Fazlar

### Faz 1 — Yeraltı geçişi *(≈1 gün · risk ORTA — hedefleme yoluna dokunuyor)*

- `EnemyAbility`'ye `{ kind: 'burrow', fromProgress, toProgress }`.
- Hedeflenebilirlik **saf fonksiyona** taşınır (`systems/targetability.ts`
  ya da `combat.ts` yanında): `hedeflenebilir(e)`. `TargetingSystem.uygun`
  ve `waveSim` aynı fonksiyonu çağırır; `ProjectileSystem`'in havada olan
  mermisi gömülen düşmanı **ıskalar** (S21'in "hedef öldü" dalıyla aynı
  desen).
- Görsel: gömülüyken `alpha` düşüyor, can çubuğu gizleniyor.
- Denge sağlaması: gömülü aralık Kısıt A'da o düşman için **kapsamayı
  kısaltıyor** — `ceilingA` bunu görmeli, yoksa tavan yalan söyler.

**Kabul:** aynı tahta, gömülü aralığı en yüksek kapsamalı noktanın
üstünden geçen düşmana karşı ölçülebilir biçimde zayıf; `kisitB` rampası
bozulmuyor.

> **BİTTİ.** Ölçüldü (harita 3, Okçu T3a, sızan düşman): Goblin ×6 →
> aralık içi tahta **0**, dışı 3; Tünelci ×6 → **5 / 5**. Yani normal
> düşmana karşı kapsama kazanıyor, Tünelci'ye karşı o üstünlük
> tamamen siliniyor. Kural `TargetingSystem.gomuluMu`'da ve
> `TowerSystem` üzerinden hem oyun hem `waveSim` onu çağırıyor.
> Kısıt A'nın gömülü aralığı görmemesi **bilinen körlük** olarak
> kaydedildi (S99) — bugün hiçbir sonucu değiştirmiyor.
>
> Canlı ekranda bir kusur yakalandı ve düzeltildi: gömülü düşman %35
> saydamken can çubuğu tam opak kalıyordu.

### Faz 2 — Harita 6 iskeleti *(≈0,5 gün · risk düşük)*

- `MAP_6` — yol, yapı noktaları, uçan hattı, kale, kilit zinciri,
  seviye seçim kartı.
- **Arka plan GEÇİCİ**: var olan bir arka plandan tonlama ile üretilir
  (`M8-P01` precedent'i: harita 4'ün görseli harita 1'den soğuk tonlama
  ile çıkmıştı). Brif dosyaya yazılır, sahip nihai çizimi sonra koyar.
- Paket bütçesi: yeni arka plan **tembel** yükleniyor (`assets/lazy/`),
  ilk indirmeyi büyütmüyor — `npm run build` raporu doğrular.

**Kabul:** harita açılıyor, oynanıyor, `buildSpots.test` ve
`panelLayout.test` altı haritayla geçiyor.

> **BİTTİ.** 15 yapı noktası, ortalama kapsama 297,3 px (bant 285-311),
> uçan hattı %75. Üç ölçüm turu gerekti; ayrıntı commit mesajında.
> Arka plan `M8-P01` deseniyle türetildi (80 KB, tembel).

### Faz 3 — Harita 6 dalgaları ve dengesi *(≈1 gün · risk ORTA)*

- Kadro: yeraltı düşmanı + geç oyun kadrosu.
- HP/altın çarpanı **taranarak** türetilir; rampa altı haritaya uzar ve
  ölçütler korunur: monoton · harita 1-3 Zor'da geçilebilir (< 12) ·
  4-6 Zor'un tanımını karşılıyor (≥ 12) · hepsi < 20 · Kolay ≤ 10.
- Boss HP'si aynı kuralla türetilir (`0,80 × en zayıf kol tavanı`).

**Kabul:** `kisitB`, `difficulty`, `bossScaling` testleri altı haritayla
geçiyor; hiçbiri gevşetilmiyor.

> **BİTTİ.** hp **6,2** · altın **11,0** · boss **2778** (0,80 × 3472).
> Rampa `0 · 4 · 5 · 12 · 14 · 16`, Kolay ×0,80'de 5.
>
> **Tek gevşetme `maps.test.ts`'in GİRDİ monotonluğunda** ve bilerek:
> harita 6'nın çarpanı harita 5'inkinden düşük (6,2 < 7,0) ama ölçülen
> zorluğu daha yüksek (16 > 14), çünkü zorluk kadronun kendisinden
> geliyor. `M8-T04`'ün "ölçüt çıktı olmalı" dersi. Gerçek iddia
> `kisitB.test.ts`'te ve o **gevşetilmedi**.

### Faz 4 — Doğrulama ve doküman *(≈0,5 gün)*

- Tarayıcıda oynanış doğrulaması (oyuncu gözüyle ekran görüntüsü).
- `GAME-DESIGN` §5 kadro tablosu, §9 harita tablosu, karşı-oyun satırı.
- `OPEN-QUESTIONS`: yeni verb'ün açık kalan tanımları (gömülü aralık
  uzunluğu, çıkış anındaki dokunulmazlık).

> **BİTTİ.** S97 (Tünelci'nin sayıları), S98 (dokunulmaz değil
> hedeflenemez), S99 (Kısıt A'nın gömülü aralığı görmemesi) kaydedildi.
> `GAME-DESIGN` §5 karşı-oyun tablosu ve §9 harita/boss tabloları
> güncellendi. Tarayıcıda: seviye seçimde altı kart, harita 6 oynanıyor,
> gömülü düşmanın alfası 129 örneklemin hepsinde 0,35.

---

## Bu planın YAPMADIĞI şeyler

- **Meta yükseltme ağacı** — `ROADMAP` uyarısı: Kısıt A/B sabit referans
  tahta varsayıyor, kalıcı yükseltme üç sağlamayı da geçersiz kılar.
- **Kahraman birimi, harita editörü, sıralama** — maliyet tablosu.
- **Nihai sanat** — arka plan ve düşman görseli GEÇİCİ; `CLAUDE.md`'nin
  greybox kuralı bunu zaten böyle istiyor.

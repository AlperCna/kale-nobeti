# M12 — Yeni verb ve altıncı harita

> **Durum:** plan. `M11` bitti; bu taş **içerik** ekliyor.

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

### Faz 3 — Harita 6 dalgaları ve dengesi *(≈1 gün · risk ORTA)*

- Kadro: yeraltı düşmanı + geç oyun kadrosu.
- HP/altın çarpanı **taranarak** türetilir; rampa altı haritaya uzar ve
  ölçütler korunur: monoton · harita 1-3 Zor'da geçilebilir (< 12) ·
  4-6 Zor'un tanımını karşılıyor (≥ 12) · hepsi < 20 · Kolay ≤ 10.
- Boss HP'si aynı kuralla türetilir (`0,80 × en zayıf kol tavanı`).

**Kabul:** `kisitB`, `difficulty`, `bossScaling` testleri altı haritayla
geçiyor; hiçbiri gevşetilmiyor.

### Faz 4 — Doğrulama ve doküman *(≈0,5 gün)*

- Tarayıcıda oynanış doğrulaması (oyuncu gözüyle ekran görüntüsü).
- `GAME-DESIGN` §5 kadro tablosu, §9 harita tablosu, karşı-oyun satırı.
- `OPEN-QUESTIONS`: yeni verb'ün açık kalan tanımları (gömülü aralık
  uzunluğu, çıkış anındaki dokunulmazlık).

---

## Bu planın YAPMADIĞI şeyler

- **Meta yükseltme ağacı** — `ROADMAP` uyarısı: Kısıt A/B sabit referans
  tahta varsayıyor, kalıcı yükseltme üç sağlamayı da geçersiz kılar.
- **Kahraman birimi, harita editörü, sıralama** — maliyet tablosu.
- **Nihai sanat** — arka plan ve düşman görseli GEÇİCİ; `CLAUDE.md`'nin
  greybox kuralı bunu zaten böyle istiyor.

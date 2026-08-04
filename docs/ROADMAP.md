# Yol Haritası — 8 kilometre taşı

Kural: her taşın sonunda oyun oynanabilir kalır. Bir taş bitmeden sonraki
başlamaz. Her taşı Claude Code'da **plan modunda** aç, planı oku, sonra uygula.

> **Araştırma sonrası yeniden düzenlendi.** Değişenler:
> M0'a saat/hız mimarisi ve aşamalı yükleme; M1'e kapsama ölçüm aracı;
> M3'e denge sağlamaları (M6'dan öne alındı); kışla kendi taşına ayrıldı (M5);
> sanat M2'den itibaren greybox olarak paralelleştirildi.
> Gerekçeler `docs/research/README.md` içinde.

### Süre hakkında dürüst not

Aşağıdaki gün sayıları **ideal iş günü** (kesintisiz, engelsiz). Toplamı
~30 gün. İlk büyük proje + yarı zamanlı + özgün sanat için gerçekçi takvim
**10-14 hafta**. Yalnız hazır varlıklarla ve M6 kısaltılarak 5-6 hafta tutar.
Planı buna göre kurmak, altıncı haftada moral kaybetmekten iyidir.

---

## M0 — İskelet, saat, aşamalı yükleme (1 gün)

Vite + TypeScript (strict) + Phaser 3 kurulumu. 1280×720 `Scale.FIT`.
Boot → Preload → Menu → Game sahne zinciri. `npm run dev`, `build`,
`typecheck`, `test` script'leri.

Bu taşta kurulması **zorunlu** olan üç şey — sonradan eklemek her sisteme
dokunmak demek:

1. **`GameClock`** — `scaledDelta` + `setScale(1|2)`, **üç** Phaser
   `timeScale` özelliğini de günceller: `tweens`, `time`, `anims`
   (`CLAUDE.md` TIER 1 kural 8). Arcade fizik kullanılmadığı için
   `physics.world.timeScale` yok (`CLAUDE.md` Teknoloji).
2. **Duraklatma** — ESC ve boşluk (Poki zorunlu şartı).
3. **Aşamalı `Preload`** — tek dev `preload()` yazma. Dört aşama:
   açılış / oyun / arka plan (müzik) / tembel (harita 2-3).
   Tek blokta yazılırsa sonradan sökmek zor.

Ayrıca: `vite.config.ts` içinde `base: './'`, `Boot`'ta `FontFace` yüklemesi.

**Kabul:** `npm run dev` açılıyor, menüden oyuna geçiliyor, ESC duraklatıyor,
hız butonu 1×/2× arası geçiyor, konsol temiz.

---

## M1 — Yol, düşman hareketi, kapsama aracı (2 gün)

`PathSystem`: waypoint dizisi boyunca sabit hızda ilerleme, segment sonunda
sıradaki waypoint'e yönelme. `Enemy` entity + nesne havuzu. Harita 1 için
greybox düşmanlar ve çizilmiş yol. Düşman kaleye varınca can eksilir,
düşman havuza döner.

**`util/coverage.ts` bu taşta yazılır.** Saf fonksiyon: bir yapı noktasının
menzili içinde kalan yol uzunluğunu ölçer. İki kullanımı var — denge
sağlamaları (M3) ve harita çizerken anlık geri bildirim. Harita 1'in yolu
bu taşta çiziliyor; yol yanlış çizilirse tüm denge yanlış oturuyor.

**Kabul:** 20 düşman aynı anda yolda akıcı ilerliyor, 60 FPS, sızan düşman
can düşürüyor. Geliştirme modunda her yapı noktasının kapsadığı piksel
ekranda yazıyor.

> ⚠️ Eski kabul kriteri "ortalama ≥ 450 px" idi. **O sayı türetilmemiş ve
> `docs/research/01-denge-matematigi.md` §4'ün 300 px varsayımıyla çelişiyor.**
> M1'in gerçek çıktısı bir eşiği geçmek değil, **kapsamayı ölçmek**; ölçüm
> çıkınca boss ve Trol HP'si yeniden hesaplanır. Bkz. `01` §4 ve §12.

**Tuzak:** düşmanın kaleye kalan yol mesafesini sakla — `first`/`last`
hedeflemesi buna bağlı olacak (yol *ilerlemesine* değil; ayrık yollu
haritalarda yüzde karşılaştırılabilir değil).

---

## M2 — Kule, mermi, hedefleme (2-3 gün)

`TowerSystem` (yapı noktasına tıkla → menü → yerleştir), `TargetingSystem`
(`first`/`last`/`strongest`/`weakest`/`closest`), `ProjectileSystem`
(havuzlu, hedef takipli). `combat.ts` içinde saf `applyDamage()`.
Okçu ve Top kuleleri, Tier 1. Menzil dairesi hover'da görünür —
**kapsanan yol da vurgulanır** (`GAME-DESIGN.md` §4.5).

Buradan itibaren her yeni varlık **greybox** olarak üretilir: tek renk
silüet + palet dolgusu, 5 dakika. Nihai çizim M6'da.

**Kabul:** kule koyup düşman öldürebiliyorum. `applyDamage` için Vitest
testleri geçiyor (zırh, büyü direnci, %15 tabanı). Hasar sayıları
`BitmapText` ve üç renk kodunu uyguluyor.

---

## M3 — Ekonomi, dalgalar, denge sağlamaları (3 gün)

`EconomySystem` (altın, can, kule maliyeti, %70 satış), `WaveManager`
(bütçe üreticisi + nefes dalgaları + `Wave` şeması), hazırlık sayacı +
**ölçekli erken başlatma bonusu**, **dalga telegrafı**. Harita 1'in 10 dalgası.
Kazanma ve kaybetme ekranı.

**Denge sağlamaları bu taşta yazılır, M7'ye bırakılmaz.** Üç Vitest testi
(`GAME-DESIGN.md` §6):

- **Kısıt A** — her düşman tipi için `Σ(DPS × kapsananYol) / hız > HP × 1.15`
- **Kısıt B** — her dalga için `Σ(DPS × süre × aktiflik) × 0.75 > toplamHP × 1.15`
- **Ekonomi** — dalga N'e kadarki kümülatif altın, referans tahtayı karşılıyor mu

`data/referenceBoards.ts`: dalga başına "oyuncunun makul olarak sahip olacağı
tahta". Dengeleme bu tahtaya karşı yapılır.

**Kabul:** Harita 1 baştan sona oynanabiliyor ve bitirilebiliyor. Üç sağlama
testi de yeşil. Bu noktadan sonra oyun "oyun".

**Neden burada:** 30 dalga elle yazıldıktan *sonra* hepsinin yanlış olduğunu
öğrenmek pahalı. Eski plandaki `toplamHP < D·L/v` formülü savunmayı 6 kat
abartıyordu ve 30 dalganın hepsini yanlış onaylardı.

---

## M4 — Tam kule/düşman seti + yükseltme + bilgi paneli (4 gün)

Okçu/Top/Büyü ailelerinin Tier 2 ve Tier 3 dallanması. Harita 1 kadrosu
(Goblin, Ork Savaşçı, Kurt Binicisi, Harpi, Ogre Şef) + harita 2-3 kadrosu
(Zırhlı Ork, Şaman, Trol, Örümcek Ana). Uçan hareketi (ayrı düz hat) ve
**uçan hattı gösterimi**. Şaman iyileştirmesi, Trol yenilenmesi,
Örümcek Ana bölünmesi, boss.

**Bilgi paneli bu taşta yazılır** (`GAME-DESIGN.md` §11) — özellikle
"seçili düşman tipine karşı etkin DPS". Bilgi eksikliği türün 1 numaralı
şikâyeti; sonraya bırakılmaz.

**Kabul:** karşı-oyun tablosundaki her tehdidin cevabı oyunda çalışıyor.
Yanlış kule kurmak oyunu kilitlemiyor, sadece verimsizleştiriyor.
Ogre Şef zorlayıcı ama öldürülebiliyor.

---

## M5 — Kışla, askerler, yetenekler (3 gün)

Kışla ailesi + Tier 2/3 dallanma. `BarracksSystem`: `GAME-DESIGN.md` §4.4'teki
**9 engelleme kuralının tamamı**. Toplanma noktası sürükleme + `rallyRange`
kısıtı + yola yapışma. Asker diriliş ve toplanma noktasına yürüme.
Meteor + Takviye yetenekleri.

**Neden ayrı taş:** engelleme, oyunun en çok kenar durum üreten mekaniği —
çoklu kilitlenme, asker/düşman sayı dengesizliği, diriliş sırasında yürüme,
uçan istisnası. `TowerSystem`'e sıkıştırılırsa bug fabrikası olur.

**Kabul:** 9 kuralın her biri için elle senaryo denendi. İki kışla aynı
noktaya toplanınca grup dövüşü çalışıyor. Trol'ü kışlayla tutup eritmek
karşı-oyun tablosundaki gibi işliyor.

---

## M6 — Sanat, juice, ses (5-7 gün)

Atlas üretimi (`free-tex-packer`), 3 harita arka planı (WebP), kule/düşman
sprite'ları, tezhip çerçeveli HUD. `fx/` modülleri: ScreenShake, HitStop,
Particles, DamageText, altın uçuşu. Tüm ses efektleri ve 2 müzik parçası.
Ayarlar menüsü (ses, sarsıntı, efekt yoğunluğu).

**Bu taş kısmen kesilebilir.** M2'den itibaren greybox katmanı olduğu için
oyun zaten oynanabilir; M6 oynanışı değiştirmeyen bir kaplama katmanıdır.
Yayına M6'nın %60'ıyla da çıkılabilir. Öncelik sırası:

1. HUD + menü + arka planlar (ekranın %40'ı, ilk izlenim, ekran görüntüsü)
2. Juice (`fx/`) — Poki incelemede "UX/his ve çekirdek döngüye" bakıyor
3. Ses
4. Kule sprite'ları
5. Düşman sprite'ları (40 px'te detay zaten görünmüyor — silüet yeter)

**Kabul:** ses ve efektler kapalıyken de oyun okunur; açıkken vuruşlar
tatmin edici. 2× hızda hit-stop kapanıyor ve okunabilirlik korunuyor.
İlk indirme hâlâ 5 MB altında.

---

## M7 — Harita 2-3, denge geçişi, yayın (5-7 gün)

Harita 2 (Y ayrımı) ve 3 (iki giriş). `SaveSystem` (`KeyValueStore` arayüzü
arkasında, `try/catch` sarmalı). Seviye seçim ekranı. 3 yıldız derecelendirmesi
(kalan cana göre). Boyut kontrolü, itch.io yüklemesi, sonra portal başvurusu.

Denge geçişi artık elle deneme değil: M3'teki üç sağlama testi 3 haritanın
30 dalgasının hepsinde çalıştırılır. Ayrık yollu haritalarda **Kısıt A her kol
için ayrı** hesaplanır.

**Kabul:** 3 harita da bitirilebiliyor. Üç sağlama testi 30 dalgada yeşil.
İlk yükleme < 3 sn. Tek tıkla oyun başlıyor. Gizli sekmede çöküyor mu diye
test edildi.

---

## Denge geçişi kontrol listesi (M7)

Otomatik testlerin yakalayamadıkları — bunlar elle oynanarak kontrol edilir:

- [ ] Her harita ilk denemede zor ama ikinci-üçüncü denemede geçilebiliyor mu?
- [ ] Tek bir kule tipiyle spam yaparak geçilebiliyor mu? (Geçilebiliyorsa
      o kule aşırı güçlü veya yapı noktası sayısı fazla.)
- [ ] **8 yapı noktası dalga 4-5'te doluyor mu?** (Dolmuyorsa yükseltme
      mekaniği hiç yaşanmıyor demektir — ekonomi düşük.)
- [ ] **Tier 3 harita 1'de görülüyor mu?** (Görülmüyorsa tasarımın en ilginç
      kısmı görünmez kalıyor.)
- [ ] Hiç kullanılmayan kule dalı var mı? Varsa rolü belirsiz demektir.
- [ ] Boss dalgası, önceki dalgadan belirgin şekilde farklı mı hissettiriyor?
- [ ] Harpi dalgası hem yapılabilir hem tehditkâr mı? (Uçan hattı yeterli
      sayıda yapı noktasından geçiyor mu — `flyerPaths` kabul kriteri.)
- [ ] Nefes dalgaları (4, 7) gerçekten nefes aldırıyor mu?
- [ ] 3 kişiye oynattın mı ve nerede sıkıldıklarını not aldın mı?

---

## Claude Code komut şablonu

Her taşın başında:

```
docs/GAME-DESIGN.md içindeki §<bölüm> ve docs/ROADMAP.md içindeki M<n>
bölümünü oku. Plan modunda kal. Bu taşı en fazla 5 adıma böl ve planı göster.
Onaylamadan kod yazma.
```

Uygulama sırasında:

```
Birinci adımı uygula, sonra dur ve diff'i göster. Devam demeden ilerleme.
```

Taş sonunda:

```
npm run typecheck && npm run test && npm run build çalıştır.
İlk indirme boyutunu raporla. Sonra bu taşta verilen kararlardan CLAUDE.md'ye
eklenmesi gerekenleri öner (ekleme yapma, öner).
```

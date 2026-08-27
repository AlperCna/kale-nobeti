# G05 · Düşmanlarda can göstergesi yok; askerlerde alfa ile — M6 borcu

| | |
|---|---|
| **Tür** | Görsel — oynanış okunurluğu |
| **Önem** | **Yüksek.** §11'in "bilgi eksikliği türün 1 numaralı şikâyeti" maddesi |
| **Emek** | Orta |
| **Risk** | Orta-yüksek — 50 düşman × can çubuğu = başarım ve havuz sorusu |
| **Dokunulan** | `src/entities/Enemy.ts`, `src/entities/Soldier.ts:68-74`, `src/scenes/GameScene.ts` |
| **İlgili** | `GAME-DESIGN.md` §11 · TIER 1 kural 3, 6, 7 · [Y02](Y02-pool-activeitems-tahsis.md) |

---

## Bulgu

Oyuncu bir düşmanın **ne kadar canı kaldığını göremiyor.** Hasar sayıları
uçuşuyor ama toplam/kalan oranı hiçbir yerde gösterilmiyor. Askerlerde
bir gösterge var — ama can çubuğu değil, **saydamlık**, ve kodun kendi
yorumu bunun geçici olduğunu söylüyor.

## Kanıt

### Düşmanda hiçbir gösterge yok

`Enemy.ts` `hp` ve `maxHp` tutuyor (`27-28`) ama görsel karşılığı yok.
Sınıfta çubuk, halka, tint kademesi — hiçbiri yok. `resetForPool()`
`clearTint()` çağırıyor (`126`), yani tint bir yerde kullanılıyor
olabilirdi; kullanılmıyor.

### Askerde alfa var, ve borç açıkça yazılmış

```ts
// src/entities/Soldier.ts:68-74
/** Can oranına göre soluklaşır — greybox geri bildirim, M6'da can çubuğu. */
refreshVisual(): void {
  if (this.maxHp <= 0) return;
  const oran = this.hp / this.maxHp;
  this.setAlpha(0.4 + 0.6 * oran);
}
```

Yorumun kendisi söylüyor: **"greybox geri bildirim, M6'da can çubuğu."**
M6 bitti, can çubuğu gelmedi. Alfa çözümü greybox döneminde (düz renkli
dikdörtgen) makuldü; gerçek silüet sanatı geldikten sonra **yaralı asker
hayalete dönüşüyor** — ki bu, tezhipli el yazması estetiğinde hiç
istenmeyen bir okuma.

## Neden önemli

**1. `GAME-DESIGN.md` §11 bunu doğrudan hedefliyor.** `TowerInfoPanel`'in
başındaki yorum:

> "Bilgi eksikliği türün 1 numaralı şikâyeti."

Panel bu şikâyeti **kule tarafında** çözüyor (ham DPS, etkin DPS, menzil,
kapsama). **Düşman tarafında** hiçbir şey çözülmüş değil.

**2. Karar veremiyor olmak.** Tower defense'te oyuncunun sürekli sorduğu
soru: *"Bu trol ölecek mi, yoksa meteor mu atmalıyım?"* Can göstergesi
olmadan bu soru tahmin. İki aktif yetenek (`Meteor`, `Takviye`,
`GAME-DESIGN.md` §8) tam bu kararın aracı — ve karar verilemiyorsa
yetenekler körlemesine kullanılıyor.

**3. Trol'ün yenilenmesi görünmüyor.** Trol can yeniliyor (S39,
`enemies.ts`). Oyuncu bunu **hiçbir şekilde göremiyor** — ne çubuk, ne
ikon, ne parçacık. Mekaniğin varlığı yalnız "bu düşman bir türlü
ölmüyor" hissiyle sezilebiliyor. Bir mekanik görünmüyorsa tasarım
olarak yoktur.

**4. Boss dövüşü tamamen körlemesine.** Ogre Şef 700 HP (harita
çarpanıyla 1820'ye kadar). Canlı ölçümde "700 → 18 HP" ile bitiyor
(S65) — yani nefes kesici bir sonuç, ve **oyuncu bunu göremiyor.**
Oyunun en dramatik anı, dramasız geçiyor.

## Zorluk: bu ucuz bir özellik değil

Bu, listedeki diğer görsel işlerden farklı olarak **gerçek bir tasarım
ve başarım sorusu**.

### Başarım

Tepe dalgada ~50 düşman. Her birine bir çubuk = 50 ek çizim nesnesi
(ya da 100: zemin + dolgu). TIER 1 kural 3 bunların **havuzlanmasını**
zorunlu kılıyor — `new Rectangle()` her doğumda yasak.

### Kural 7 tuzağı

Çubuk **metin değil**, yani kural 7 doğrudan uygulanmıyor. Ama çubuk
`Graphics` ile her kare yeniden çizilirse (`clear()` + `fillRect()` ×50)
bu, kural 7'nin önlemek istediği maliyetin kardeşi olur. `Image`'ın
`scaleX`'ini değiştirmek çok daha ucuz.

### Kural 6

> Düşman/dost ayrımı yalnız renge dayanmaz.

Yeşil/kırmızı can çubuğu klasik ama renk körlüğünde ayrışmıyor. Çubuk
**uzunluğu** zaten renkten bağımsız bir kanal — yani çubuk, alfa
çözümünden bu açıdan da üstün.

### Görsel yön

`GAME-DESIGN.md` §2 tezhipli el yazması istiyor; "parlak çizim film
paletine kaçılmaz." Kingdom Rush'ın parlak yeşil can çubuğu **doğrudan
o paletten**. Buradaki çubuk mürekkep/altın/vermilyon üçlüsünde kalmalı.

## Seçenekler

### (a) Klasik çubuk — her düşmanın üstünde iki ince dikdörtgen

Havuzlanmış `Image` çifti (atlas'ta 1×1 beyaz kare, tint ile renklenir)
veya iki `Rectangle`. Dolgunun `scaleX`'i `hp/maxHp`.

- ✅ Evrensel olarak anlaşılır, öğrenme maliyeti sıfır
- ✅ Uzunluk kanalı renkten bağımsız (kural 6 ✓)
- ❌ 50 düşman × 2 nesne = 100 nesne, havuz gerekiyor
- ❌ 20-30 px'lik düşmanın üstünde ince bir çubuk, 640×360'a
  küçültüldüğünde **1-2 piksel** kalır — okunmaz
- ❌ Palete yabancı; ekranı "oyunlaştırıyor"

### (b) Yalnız hasar görmüşlerde çubuk

Tam canlı düşmanda çubuk yok; ilk hasarla beliriyor.

- ✅ Ekran kalabalığı ciddi biçimde azalıyor (çoğu düşman ya tam canlı ya
  ölü)
- ✅ Aynı anda gösterilen çubuk sayısı tepe dalgada bile ~10-15
- ✅ Havuz baskısı düşüyor
- ⚠️ "Belirme" anı bir tween ister, yoksa titrek görünür
- ⚠️ Trol'ün yenilenmesi çubuğu **geri doldururken** kaybolmamalı
  (tam dolunca gizlenirse yanıp söner) → "bir kez göründüyse ölene kadar
  kalır" kuralı gerekir

### (c) Silüetin **dolum** göstergesi — palete en uygun

Ayrı çubuk yok. Düşman silüetinin kendisi, canı azaldıkça alttan yukarı
doğru vermilyona boyanıyor (ya da tersi: mürekkep silüet, kaybedilen can
kadar soluyor).

- ✅ Ek nesne **sıfır** — tint/maske düşmanın kendi sprite'ında
- ✅ Tezhip paletinde kalıyor
- ✅ 640×360'ta bile okunur (bütün silüet değişiyor, 1 px çubuk değil)
- ❌ Phaser 3'te sprite'ın **bir kısmını** boyamak kolay değil; maske
  gerekiyor ve maske her düşman için ayrı bir `Graphics` demek — (a)'dan
  pahalı çıkabilir
- ❌ Kesin oran okunmuyor ("yarısı mı, üçte biri mi" belirsiz)
- ⚠️ Alfa/tint kademesi (maskesiz basitleştirilmiş hâli) askerdeki
  **aynı** hatayı tekrar eder: silüet hayalete döner

### (d) Yalnız boss ve elit düşmanlarda büyük çubuk

Boss için ekranın üstünde tek büyük parşömen can çubuğu; Trol/Zırhlı Ork
gibi elitlerde küçük çubuk; sıradan düşmanlarda hiç.

- ✅ Dramanın olduğu yere yatırım yapıyor (boss dövüşü)
- ✅ Nesne sayısı çok düşük
- ✅ Boss çubuğu HUD'a konabilir → parşömen kartla aynı dilde
- ❌ Trol'ün yenilenmesi hâlâ görünmüyor (elit sayılırsa görünür)
- ❌ Sıradan düşmanlarda "ölecek mi" sorusu çözülmüyor

## Öneri

**(b) + (d) birlikte, iki ayrı iş olarak.**

**Önce (d)'nin boss kısmı** — en yüksek dram, en düşük risk, en az nesne:
ekranın üstünde tek bir parşömen çerçeveli boss can çubuğu, yalnız boss
sahnedeyken görünür. Havuz gerekmiyor (tek nesne), palete uyuyor
(`ParchmentFrame` zaten var), 640×360'ta okunur (büyük).

**Sonra (b)** — hasar görmüş düşmanlarda çubuk. Havuzlanmış, "bir kez
göründüyse kalır" kuralıyla, `settings.effectScale` ile **kapatılamaz**
(bu bir efekt değil, bilgi — vinyet nabzının gerekçesiyle aynı,
bkz. `GameScene.ts:970-973`).

(c) **araştırılmaya değer ama önce ölçülmeli**: Phaser 3'te 50 maskenin
gerçek maliyeti bilinmiyor ve tahminle karar verilmemeli.

## Askerdeki alfa ne olacak

`Soldier.refreshVisual()` **her hâlükârda değişmeli** — gerçek sanatla
alfa yanlış bir okuma üretiyor. En az müdahale: alfa yerine hafif bir
vermilyon tint kademesi (`setTint`), silüet tam opak kalır. Bu tek satır,
can çubuğu kararından **bağımsız** olarak bugün yapılabilir.

## Doğrulama

1. Boss dalgasını başlat — üstte can çubuğu belirdi mi, boss ölünce
   kayboldu mu, harita değişince sıfırlandı mı.
2. Boss'a hasar ver, çubuğun düzgün azaldığını gör. `dev` kancasıyla
   `hp/maxHp` oranını çubuk uzunluğuyla karşılaştır.
3. Trol'ü yarala, bırak — çubuğun **geri dolduğunu** gör (S39
   yenilenmesi ilk kez görünür oluyor).
4. Tepe dalgada 60 FPS; 4× CPU kısıtlamasında ≥ 30 FPS (S15).
5. `dev.enemyCapacity()` sabit; yeni bir havuz eklendiyse onun
   kapasitesi de sabit ve `dev.poolExhausted` artmıyor.
6. Düşman ölüp havuza dönünce çubuğu da dönmeli — **TIER 1 kural 3**:
   havuza dönen nesne tüm durumunu sıfırlar. Yeni düşman eski düşmanın
   can oranıyla doğmamalı. (Bu proje bu hata sınıfını dört kez yaşadı.)
7. 640×360'a küçült — çubuk okunuyor mu.
8. Efekt yoğunluğu **Kapalı**: çubuklar **görünmeye devam etmeli**.
9. Gri tonlamada (`filter: grayscale(1)`) çubuk hâlâ okunuyor mu
   (kural 6).

## Bitmedi sayılır eğer

- Havuza dönen düşman eski can oranını taşıyorsa.
- Çubuk `effectScale: 0` iken kayboluyorsa (bilgi, efekt değil).
- 640×360'ta okunmuyorsa.
- Boss çubuğu harita değişiminde sıfırlanmıyorsa.
- Asker hâlâ alfa ile soluyorsa.
- Tepe dalgada FPS düştüyse.

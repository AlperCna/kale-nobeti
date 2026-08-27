# G06 · Düşmanlar yürüdükleri yöne dönmüyor — S13'ün görsel borcu — ☑ **düzeltildi (2026-08-27, kısmen)**

| | |
|---|---|
| **Tür** | Görsel — hareket okunurluğu |
| **Önem** | Orta |
| **Emek** | Küçük (gerçekleşen — yalnız (a), dönüş tween'i (c) hâlâ açık) |
| **Risk** | Düşük — doğrulandı |
| **Dokunulan** | `src/entities/Enemy.ts`, `src/systems/BarracksSystem.ts`, `src/types/barracks.ts` |
| **İlgili** | `OPEN-QUESTIONS.md` **S13** (kısmen kapandı) · TIER 1 kural 4 |

---

## Sonuç (2026-08-27)

**Düzeltildi, seçenek (a) uygulandı** (yatay çevirme, ölü bölgeli).
(c) — S13'ün sözü verdiği dönüş tween'i — **açık kaldı**, isteğe bağlı
bir sonraki adım olarak.

**Beklenmedik bulgu — art sanat çoğunlukla öne bakan simetrik silüet.**
Uygulamaya başlamadan önce atlas'taki kareler tek tek incelendi
(`public/assets/atlas.png`, `sharp` ile kırpılıp elle bakıldı): goblin,
ork savaşçı, trol, zırhlı ork, örümcek (ana+yavru), şaman, boss, kışla
askeri — hepsi **simetrik, öne bakan** kompozisyon (tezhip
"kahraman silüeti" geleneği). Yalnız **kurt binicisi** gerçekten yönlü
— koşan bir profil, **varsayılan olarak sola** bakıyor. Flip mantığı
buna göre kuruldu (`dx > 0` → aynala). Simetrik olanlarda flip **görünür
bir etki yaratmıyor** ama zararı da yok; kurt binicisi ve ileride
eklenecek yönlü sanat için doğru.

**Asker de kapsandı (`Soldier.ts`), ama dolaylı yoldan.** `x`/`y` gibi
`flipX` de artık `SoldierState`'in bir alanı — `BarracksSystem.ts`
(Phaser'sız, TIER 1 kural 11) hareket yönünü hesaplayıp `s.flipX` yazıyor;
gerçek `Soldier` (`Phaser.GameObjects.Sprite`) bu alanı zaten kendi
`flipX`'i olarak taşıyor, ayrı bir köprü kodu gerekmedi. Yürürken **ve**
dövüşürken (kilitli düşmana bakarak) çalışıyor — doğrulama listesinin
5. maddesi.

### Canlı doğrulama (Phaser sahne grafiği üzerinden — ekran görüntüsü alınamadı, bkz. not)

| Kontrol | Sonuç |
|---|---|
| Sağa yürüyen goblin (harita 1) | `flipX: true`, birkaç karede `x` artıyor, `flipX` sabit kalıyor (titreme yok) |
| Dikey segmentte (harita 3, köşe dönüşü) | `flipX` **değişmiyor** — dx≈0 ölü bölgesi çalışıyor |
| İki kışla askeri, aynı barakadan, zıt yönlere yayılmış | biri `flipX:true`, diğeri `flipX:false` — aynı kaynaktan farklı yön, gerçekten hareket-türevli |
| `npm run test` | `waveSim` dahil **698/698** değişmeden geçti |

**Ek doğrulama — asker yön testleri** (`BarracksSystem.test.ts`, yeni
`describe('Yön — G06')` bloğu): sağa/sola yürüme, dikey ölü bölge,
dövüşürken düşmana bakma, doğan askerin ilk kareden doğru yöne bakması.

`npm run typecheck/test (698/698)/guard (10/10)` yeşil.
`docs/KURALLAR.md` diff'i boş (salt görsel, `waveSim` etkilenmedi).

**Not — ekran görüntüsü alınamadı:** [G01](G01-menu-oyna-butonu-parsomen.md)'deki
notla aynı — Browser pane'in ekran görüntüsü aracı bu oturumda
çalışmadı. Doğrulama `scene.children.list` üzerinden gerçek sprite
durumu (`x`, `flipX`) okunarak yapıldı; görsel olarak *nasıl göründüğü*
(silüetin gerçekten simetrik olup olmadığı gibi) atlas karelerinin
doğrudan kırpılıp incelenmesiyle ayrıca doğrulandı, ama canlı oyun
ekranının kendisi göz ile görülemedi.

### Kapanmayan uç

**(c) — dönüş tween'i.** S13'ün sözü tam olarak `scaleX: 1→0→-1`
tween'iydi; bu iş yalnız anında `flipX` yaptı. `OPEN-QUESTIONS.md`
S13 satırı "kısmen ödendi" olarak güncellendi, tam kapanmadı.

---

## Bulgu

Düşmanlar hangi yöne gidiyorlarsa gitsinler **hep aynı yöne bakıyor**.
Sola yürüyen bir goblin, sağa yürüyen goblinle piksel piksel aynı. Yol
keskin dönüş yaptığında (S13 kararı) düşman anında yön değiştiriyor ama
sprite'ta hiçbir şey olmuyor.

## Kanıt

Kod tabanında **hiçbir** yön kodu yok:

```
src/entities/Enemy.ts:125     this.setAngle(0);     ← yalnız havuz sıfırlaması
src/entities/Soldier.ts:64    this.setAngle(0);     ← yalnız havuz sıfırlaması
```

`flipX`, `setRotation`, `angle =` — `entities/` ve `GameScene.ts`
içinde tarandı, **sıfır sonuç**. `Enemy.syncPosition()` (`Enemy.ts:105-109`)
yalnız konum yazıyor:

```ts
private syncPosition(): void {
  if (this.mover === null) return;
  const p = this.mover.positionAt(this);
  this.setPosition(p.x, p.y);
}
```

## S13 bunu söz vermiş

`OPEN-QUESTIONS.md`, S13 (keskin dönüş kararı):

> **Görsel bedeli M6'da kapatılır:** düşman köşede yön değiştirirken kısa
> bir dönüş tween'i — yalnız görüntü, `PathSystem`'e dokunmaz, ölçümler
> değişmez.

Aynı cümle `RISKS.md`'de de var. M6 bitti; tween gelmedi ve bugün
düşman **hiç** yönelmiyor — söz verilen tween bir yana, temel yatay
çevirme bile yok.

## Neden önemli

**1. Haritalarda yol her iki yöne de gidiyor.** Harita 1 yolu soldan
girip birkaç kez yön değiştiriyor; harita 3'ün **iki girişi var**
(`maps.ts:234`, `maps.ts:243` — biri `x: -60`, diğeri `x: 1340`), yani
düşmanların bir kısmı **sağdan sola** yürüyor. Sağdan gelen düşman
sırtı önde yürüyor gibi görünüyor.

**2. Silüet sanatı yönü belli ediyor.** Greybox döneminde (düz renkli
dikdörtgen) yön diye bir kavram yoktu; sorun da yoktu. Gerçek silüetler
(`P04`) profil çizimler — bir yüzü, bir sırtı var. Sanat geldi, ona eşlik
etmesi gereken tek satırlık kod gelmedi. Bu, [G05](G05-dusman-can-gostergesi.md)
ve [G07](G07-yildiz-gosterimi.md) ile aynı sınıf: **greybox varsayımı
gerçek sanattan sonra geçersizleşti ama kod güncellenmedi.**

**3. Hareket hissi.** Yön değiştirme, bir birimin "canlı" görünmesinin en
ucuz yolu. Kingdom Rush modelinde (sabit yol) düşmanların yönü, oyuncunun
yolu okumasının bir parçası.

## Ne yapılmamalı

**TIER 1 kural 4 ve S13 burada sınırı çiziyor.** Bu iş:
- `PathSystem`'e **dokunmaz**
- Yolu yumuşatmaz, köşe kesmez (S13 kalıcı karar: keskin dönüş)
- `L` = 1700 px ölçümünü ve kapsama sayılarını **değiştirmez**
- `waveSim` çıktısını değiştirmez

Yani bu tamamen `entities/` içinde, `Mover`'ın verdiği konumdan türetilen
bir görüntü işi.

## Seçenekler

### (a) Yatay çevirme — `flipX`

Hareket vektörünün `x` bileşenine bakılıp `setFlipX(dx < 0)`.

```ts
private syncPosition(): void {
  if (this.mover === null) return;
  const p = this.mover.positionAt(this);
  if (p.x !== this.x) this.setFlipX(p.x < this.x);
  this.setPosition(p.x, p.y);
}
```

- ✅ İki satır
- ✅ Hiçbir tween, hiçbir zamanlama, kural 8 ile ilgisi yok
- ✅ Profil silüetler için **doğru** çözüm — karakter sanatının
  standardı
- ⚠️ `dx ≈ 0` olan dikey segmentlerde çevirme titreyebilir
  (`p.x` ile `this.x` kayan nokta gürültüsüyle bir ileri bir geri).
  Küçük bir ölü bölge gerekiyor: `if (Math.abs(p.x - this.x) > 0.01)`.
- ⚠️ `resetForPool()`'a `setFlipX(false)` eklenmeli — **TIER 1 kural 3**.
  Bu proje bu hata sınıfını dört kez yaşadı; yeni bir görsel durum
  eklendiğinde sıfırlanması **zorunlu**.

### (b) Tam dönüş — `setRotation`

Sprite hareket vektörünün açısına döner.

- ❌ Silüetler **profil** çizim, kuşbakışı değil. Sola giderken 90°
  dönmüş bir goblin yan yatmış görünür.
- ❌ Reddedilir. (Mermiler için doğru olabilir — bkz. aşağıdaki not.)

### (c) (a) + S13'ün söz verdiği dönüş tween'i

Çevirme anında değil, kısa bir `scaleX: 1 → 0 → -1` tween'iyle
(karakter "kendi ekseninde dönüyor" hissi, ~120 ms).

- ✅ S13'ün sözü tam olarak bu
- ✅ Keskin dönüşün görsel sertliğini yumuşatıyor — **yolu
  değiştirmeden**
- ⚠️ Tween süresi `GameClock`'a bağlı olmalı: `tweens.timeScale`
  zaten `GameClock.setScale` tarafından yazılıyor (TIER 1 kural 8),
  yani `this.tweens.add` kullanıldığı sürece 2× hızda otomatik olarak
  60 ms oluyor. Ek iş yok.
- ⚠️ `settings.effectScale` ile korunmalı: efekt kapalıyken tween
  koşmamalı, doğrudan çevirmeli
- ⚠️ Havuza dönüşte `killTweensOf` gerekiyor — `Enemy.resetForPool()`
  bunu **zaten yapıyor** (`Enemy.ts:121`), yani altyapı hazır
- ⚠️ 50 düşman × köşe başına bir tween: köşe sayısı az (harita başına
  ~6-8 waypoint) olduğu için tepe yükü düşük, ama ölçülmeli

## Öneri

**(a) önce, (c) sonra.**

(a) tek başına sorunun %90'ını çözüyor ve riski neredeyse sıfır. (c)
S13'ün defterini kapatıyor ama bir tween bütçesi ve bir ayar koruması
getiriyor — ayrı ve isteğe bağlı bir iyileştirme olarak ele alınmalı.

Aynı değişiklik **askerlere de** uygulanmalı (`Soldier.ts`): asker
toplanma noktasına yürüyor ve düşmanla dövüşürken yüzü ona dönük
olmalı. Askerin `resetForPool()`'u da (`Soldier.ts:58-66`) `setFlipX(false)`
almalı.

### Not: mermiler

Mermiler bugün daire (`Projectile`, `PROJECTILE_RADIUS`). Daire için
yön anlamsız. Ama mermilere ileride ok/gülle sanatı verilirse **(b)
onlar için doğru seçenek** — ok uçuş yönüne dönmeli. Bu dosya bunu
kapsamıyor; ayrı bir iş.

## Doğrulama

1. Harita 1'i başlat, düşmanların yolun her dönüşünde yön değiştirdiğini
   gör.
2. **Harita 3'e geç** — iki girişten gelen düşmanlar birbirine **zıt**
   yönlere bakmalı. Bu, çok girişli haritaların bu oturumda düzeltilen
   yönlendirme işinin görsel karşılığı.
3. Dikey segmentlerde çevirme **titremiyor** olmalı (ölü bölge testi).
4. Uzun bir oturum koştur, havuzdan çıkan düşmanı gözle: eski `flipX`
   taşımamalı. `dev.enemyKinds()` ile birlikte gözle kontrol.
5. Asker toplanma noktasına yürürken ve dövüşürken doğru yöne bakıyor mu.
6. (c) uygulandıysa: efekt yoğunluğu **Kapalı** iken tween koşmamalı,
   anında çevirmeli.
7. (c) uygulandıysa: 2× hızda tween süresi yarıya inmeli
   (`GameClock` sözleşmesi).
8. `npm run test` — `waveSim` çıktısı **birebir aynı** olmalı. Değiştiyse
   görsel bir değişiklik mantığa sızmış demektir.

## Bitmedi sayılır eğer

- `resetForPool()` `flipX`'i sıfırlamıyorsa (kural 3).
- Dikey segmentlerde titreme varsa.
- `waveSim` çıktısı değiştiyse.
- Harita 3'te iki girişten gelenler aynı yöne bakıyorsa.
- (c) yapıldıysa ve efekt kapalıyken tween koşuyorsa.

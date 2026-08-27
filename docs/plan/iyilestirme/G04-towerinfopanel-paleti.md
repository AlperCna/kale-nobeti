# G04 · `TowerInfoPanel` paletten kopuk — kalan tek koyu-zemin kutu

| | |
|---|---|
| **Tür** | Görsel — tutarlılık |
| **Önem** | Orta |
| **Emek** | Orta — metin renklerinin tamamı gözden geçirilecek |
| **Risk** | **Orta-yüksek** — kontrast bozulursa §11'in çözdüğü sorun geri gelir |
| **Dokunulan** | `src/fx/TowerInfoPanel.ts` |
| **İlgili** | `GAME-DESIGN.md` §2, §11 · [G03](G03-yapi-menusu-arkalik.md) |

---

## Bulgu

M6'da bütün paneller parşömen çerçeveye geçti. `TowerInfoPanel` geçmedi
ve artık oyundaki **tek** koyu mürekkep zeminli kutu. Diğerleri
parşömenleştikçe bu panel daha çok göze batıyor — tutarsızlık, mutlak
değil **göreli** olarak arttı.

## Kanıt

`SettingsPanel` `createParchmentButton` içe aktarıyor
(`SettingsPanel.ts:3`); `AbilityButtons` da öyle. `TowerInfoPanel`
içe aktarmıyor — dosyanın import listesi:

```ts
// src/fx/TowerInfoPanel.ts:1-7
import Phaser from 'phaser';
import type { EnemyDef } from '../types/enemy';
import type { TargetMode, TowerDef, TowerTier } from '../types/tower';
import { NUMBER_FONT_KEY } from './numberFont';
import { effectiveDps } from '../systems/balanceChecks';
import { applyDamage } from '../systems/combat';
import { enemyFrameKey } from '../data/spriteFrames';
```

`ParchmentFrame` yok. Panel kendi paletini kuruyor:

```ts
// src/fx/TowerInfoPanel.ts:26-33
const GOLD = 0xd4a032;
const PARCHMENT = 0xe4d3a8;
const INK = 0x14203a;
const VERMILION = 0xb03a2e;
const LAPIS = 0x3e5ca8;

const W = 250;
const H = 210;
```

## Bu bilinçli bir erteleme — ve gerekçesi geçerli

Bu oturumda değerlendirildi ve **kasıtlı olarak yapılmadı**. Gerekçe:
panelin metinleri açık renkli (`PARCHMENT`, `GOLD` tonlarında
`BitmapText`), koyu zemin için tasarlanmış. Parşömen (açık) zemine
geçmek, **bütün metin renklerini yeniden atamayı** gerektiriyor —
yoksa açık metin açık zeminde kaybolur.

Yani bu, G01/G02 gibi "çerçeveyi değiştir" işi **değil**. Panelin
tipografik tasarımının tamamı ters çevriliyor.

## Neden yine de yapılmalı

**1. Tek kalan istisna.** Bir tutarsızlık tek başınayken "stil" gibi
okunabilir; ortamın geri kalanı tutarlıyken **hata** gibi okunur.
M6 öncesi bu panel diğerleriyle aynıydı; şimdi yalnız.

**2. Yan yana görünüyor.** `#showInfoPanel` (`GameScene.ts:1355`)
yapı menüsüyle **aynı anda** açılıyor. G03 menüye parşömen arkalık
eklediğinde, koyu panel parşömen menünün hemen yanında duracak.
G03 bu sorunu **görünür kılıyor**, yani iki iş bağlantılı.

**3. `GAME-DESIGN.md` §2.** "Mürekkep mavisi zemin, parşömen UI,
altın varak vurgular." Zemin mürekkep, **UI parşömen**. Panel bir UI
öğesi ve mürekkep kullanıyor — kural tam tersini söylüyor.

## Riskin adı: §11'in çözdüğü sorun

Panelin başındaki yorum:

> "Bilgi eksikliği türün 1 numaralı şikâyeti." §11'in yedi göstergesi:
> ham hasar + atış hızı · hasar tipi rozeti · **seçili düşmana karşı
> etkin DPS** · menzil + kapsanan yol · uçana vurur/vurmaz · yükseltme
> farkı · satış iadesi.
>
> **Üçüncüsü en kritik** (§11): "Ham DPS yanıltıcı: okçu T2, boss'a
> 1.95 DPS."

Bu panel, oyunun en yoğun bilgi taşıyan yüzeyi: yedi gösterge,
250×210 px'te. **Okunurluk burada estetikten önemli.** Kontrast
bozulursa §11'in çözdüğü sorun geri gelir ve görsel tutarlılık için
bilgi feda edilmiş olur.

Ayrıca renkler **anlam taşıyor**:
- `VERMILION` (`0xb03a2e`) ve `LAPIS` (`0x3e5ca8`) — hasar tipi rozeti
  (§3 iki renk, S56'da üçten ikiye indirildi)
- `GOLD` — vurgu
- `PARCHMENT` — normal metin

Zemin parşömen olunca `PARCHMENT` metin **yok olur** ve rozet renkleri
açık zeminde farklı okunur. Yani bu bir renk değiştirme değil,
**renk sisteminin yeniden eşlenmesi**.

## Seçenekler

### (a) Tam parşömen dönüşümü

`createParchmentFrame(scene, x, y, W, H, 16)` + bütün metinler koyu
tonlara (`INK` taban, `VERMILION`/`LAPIS` rozet, koyu altın vurgu).

- ✅ Tam tutarlılık
- ⚠️ Yedi göstergenin **her birinin** kontrastı yeniden doğrulanmalı
- ⚠️ Rozet renkleri açık zeminde koyulaştırılmalı; `LAPIS` (`0x3e5ca8`)
  parşömen üstünde yeterince koyu, `VERMILION` (`0xb03a2e`) da öyle —
  ikisi de muhtemelen çalışıyor, ama **ölçülmeli**, varsayılmamalı
- ⚠️ Bitmap font tek renkte üretildi mi, `setTint` ile mi renkleniyor —
  kontrol edilmeli

### (b) Karma: parşömen çerçeve + koyu iç alan

Dış çerçeve parşömen (`ParchmentFrame`'in köşe + kenarları), **orta
doku yerine** koyu mürekkep dolgu.

- ✅ Çerçeve dili tutarlı, metin renkleri **hiç değişmiyor**
- ✅ Risk neredeyse sıfır — bugünkü okunurluk aynen korunuyor
- ✅ Emek küçük
- ⚠️ Yarım çözüm; panel yine de diğerlerinden farklı görünüyor
- ✅ Ama **savunulabilir bir tasarım kararı**: "yoğun bilgi paneli
  koyu zeminde, eylem panelleri parşömen zeminde" tutarlı bir kural
  olabilir — yeter ki **yazılsın**

### (c) Dokunma, gerekçeyi yaz

Bugünkü durumu koru ama `GAME-DESIGN.md` §2'ye ya da panelin başına
"neden istisna" gerekçesini ekle.

- ✅ Sıfır risk
- ✅ Tutarsızlık "hata" olmaktan çıkıp "karar" oluyor
- ❌ Görsel olarak hiçbir şey iyileşmiyor

## Öneri

**(b).** Gerekçe: (a)'nın kazancı görsel, kaybı bilgisel ve §11 bilgiyi
açıkça önceliklendiriyor. (b) çerçeve dilini tutturuyor — göz, çerçeveye
bakarak "bu aynı ailedendir" diyor — ve okunurluğa hiç dokunmuyor.

(b) seçilirse **kural yazılmalı**: *"Parşömen zemin eylem yüzeylerinde
(buton, menü, ayar); koyu zemin yoğun bilgi yüzeylerinde (kule bilgisi).
Çerçeve her ikisinde de parşömen."* Bu, `TowerInfoPanel`'i istisna
olmaktan çıkarıp bir kategorinin üyesi yapıyor.

(a) ileride denenirse, **G03'ten sonra** denenmeli: menü arkalığı
geldiğinde panelin komşusu değişiyor ve karar o bağlamda yeniden
değerlendirilmeli.

## Doğrulama

1. Panel açıkken yedi göstergenin **hepsi** okunuyor mu — tek tek.
2. Hasar tipi rozeti (vermilyon/lapis) ayırt ediliyor mu.
3. Düşman ikonu şeridine üzerine gel → etkin DPS güncelleniyor ve
   okunuyor mu (§11'in "en kritik" göstergesi).
4. 640×360'a küçült — yedi gösterge hâlâ okunur mu, yazı ≥ 16 px mi.
5. Gri tonlamada (`filter: grayscale(1)`) rozet ayrımı korunuyor mu
   (TIER 1 kural 6: "yalnız renge dayanmaz").
6. Panel yapı menüsüyle yan yana açıkken ekran görüntüsü — ikisi aynı
   aileden görünüyor mu.
7. Panel kapanınca tamamen yok oluyor mu (sızıntı yok).

## Bitmedi sayılır eğer

- Yedi göstergeden biri okunmuyorsa.
- Rozet renkleri gri tonlamada ayrışmıyorsa.
- 640×360'ta metin 16 px'in altına düştüyse.
- (b) seçilip kural yazılmadıysa — o zaman tutarsızlık hâlâ "karar"
  değil "unutma" olarak kalır.

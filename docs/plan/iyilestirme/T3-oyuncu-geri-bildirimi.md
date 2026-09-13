# Tur 3 · Oyuncu geri bildirimi — M7-P02'nin ilk gerçek verisi

| | |
|---|---|
| **Kaynak** | Kullanıcı oyunu kendi tarayıcısında oynadı (2026-09-14): 10 ekran görüntüsü + serbest metin. `M7-P02` "3 kişiye oynatma"nın ilk gerçek girdisi |
| **Kapsam** | 12 kullanıcı gözlemi + 3 kendi bulgum = 15 madde |
| **Sonuç** | 12 madde 9 commit'te kapandı; 1 soru açık (2×); 2 yan gözlem ertelendi |

---

## Bu turun en önemli dersi

Bu bulguların **çoğu benim aynı oturumda aldığım ekran görüntülerinde
de görünüyordu** — ayar butonundaki dikey çizgi, "61.16.6" yığını,
harita 3'te balonun noktaları örtmesi — ve ben yalnız ölçtüğüm şeye
bakıp geçmiştim. Sayısal doğrulama ("metin butona sığıyor mu") görsel
doğrulamanın yerini tutmuyor. Kullanıcının sözü: *"her zaman da kontrol
etmeni istiyorum."* Hafızaya alındı; bundan sonra her canlı doğrulamada
"ekranda göze batan bir şey var mı" sorusu ölçümün yanına eklenecek.

---

## A — Kanıtlı hatalar (kapandı)

### 1. Parşömen çerçevede dikey dikişler — `69927bc`
**Nerede:** Play, Try again, Main menu, ayar değer butonları, seviye
kartları (yeşil köşe boşlukları). Her ekranda.
**Kök (iki katman, ikisi de ölçüldü):** (a) dört çerçeve parçasının
kaynak PNG'si saydam kenar payı taşıyor (dört kenarda alfa 0);
`fit:'contain'` payı koruyunca `TileSprite` her 128 px tekrarında boşluk
bırakıp arkasını gösteriyordu — parşömen butonda mürekkep zemin (koyu
çizgi), kartta küçük resim (yeşil köşe). (b) Atlas'ta kareler bitişik
(sıfır boşluk), `edge-strip`'in sol komşusu koyu örümcek karesi; WebGL
döşeme sınırında komşu piksel örnekleniyor.
**Düzeltme:** `prep-assets.mjs` çerçeve parçalarını `trim` + `fill` ile
kare doldurup her kareyi 2 px kenar kopyasıyla paketliyor
(`extend extendWith:'copy'`); adımlar tek tek koşturulabiliyor
(`prep-assets.mjs atlas` — ses adımı ffmpeg'den geçtiği için her koşuda
bayt bayt aynı değil). `ParchmentFrame` şeridi band kalınlığına
ölçekliyor (`setTileScale`) — eskiden 32 px şeridin yalnız üst `corner`
satırı görünüyordu. Atlas 1024×272 → 1012×284, 61 → 62 KB.

### 2. Kartuş "Strong" butonunu örtüyor — `6581bc7`
**Kök:** `BuildMenu` hiç `setDepth` çağırmıyordu (çizim sırası = eklenme
sırası) ve menü `spot.y − 56`'ya konuyor, hedefleme satırı (+52) tam
noktanın üstüne düşüyordu.
**Düzeltme:** menü depth 150; panelin alt kenarı noktanın üstünde
bitiyor (kartuş yarısı + 8); üste sığmıyorsa noktanın altına çevriliyor.

### 3. Bilgi paneli okunmuyor ("61.16.6", "hiçbir şey ifade etmiyor") — `2fdcd16`
**Kök (iki hata):** (a) panelde hiç etiket yoktu — dosyanın yorumu
"etiketler HudScene'de" diyordu, yanlıştı. (b) İlk satır
`${dmg}x${rate}=${dps}` yazıyordu; sayı fontunda `x` ve `=` **yok**
(`%+,-./0-9×›`), glifler kaybolup sayılar yapışıyordu.
**Düzeltme:** `fx/TowerInfoLabels.ts` (ayrı dosya — bekçi k.4:
`setText` çağıran dosya `Text` üretmez); hasar/atış hızı ayrı satır,
yükseltme `6.6›13.0`, sayılar sağa dayalı, rozet kareleri yerine renkli
kelime (k.6). İlk satır 22'den başlıyor — 10'dayken parşömen bandın
üstünde kayboluyordu (eski panelde de öyleydi, canlı görünümde
yakalandı). 11 yeni `strings.ts` anahtarı.

### 4. 4 haneli altın etiketle çakışıyor — `e8e5c97`
**Kök:** glif ilerlemesi 25 px, dört hane 28→128, etiket 112'de. Kart
harita 1'in 280'i için ölçülmüştü; harita 3 hep 1064 (S73).
**Düzeltme:** etiket kolonu 136, telgraf 200.

### 5. Meteor / Takviye İngilizcede Türkçe — `f9c19f7`
**Kök:** `AbilityButtons.ts`'te sabit dize. Bekçi k.12 yakalayamadı —
ikisinde de aksanlı harf yok; dosyada **yazılı** kör nokta tam
öngörüldüğü gibi vurdu. S76 ile aynı sınıf.
**Düzeltme:** `abilityMeteor`/`abilityTakviye` (→ Reinforce).

### 6. Balon ve "Start wave" harita 3'ün alt noktalarını/kalesini örtüyor — `f15ebc3` *(kendi bulgum, 3. ve 9. görüntü)*
**Kök:** ikisi de ekranın alt-ortasına sabit; harita 3'ün kalesi
(640,690) tam orada.
**Düzeltme:** ikisi de üst-orta — buton geri sayımın altında (y 82),
balon 116'dan başlıyor, yüksekliği metinden. Üst-orta üç haritada da
boş. Buton §6 gereği dalga 4'ten itibaren görünüyor; canlı dalga 4
hazırlığında doğrulandı.

## B — Tasarım kararları (kullanıcıyla, kapandı)

### 7 + 9. Hedefleme modları ve "menziller" açıklanmıyor — `f9c19f7`
"Menziller" aslında uçan düşman rotası (`updateFlyerHint`, %45 saydam
kesikli çizgi) — doğru davranış, etiketsiz. **Karar:** Y09 ipucu
balonu, tek seferlik. İki yeni olay (`targeting:opened`, `wave:flyers`),
iki `HintId`. `updateFlyerHint` artık hattın göründüğü karede `true`
dönüyor. Balon metnin yüksekliğine göre büyüyor (60 sabitti). Uçan
ipucu canlı görülmedi (uçan dalgaya ulaşmak gerekiyor) — tetik testte.

### 8. Seçili modun kırmızı yazısı okunmuyor — `6581bc7`
Yazı her butonda mürekkep; seçim vermilyon kontur + tam alfa, diğerleri
0,55 soluk. Kontur 46'da sabit kalmıştı (buton 60) — düzeltildi.

### 10. Ana menü çok sade — `99f674d`
**Karar:** ayarlar + dil düğmesi. Y03 Adım 3'ün "Yapılmayan"ı da
kapandı: dil artık haritaya girmeden değiştirilebiliyor. Dil değişince
menü `restart({settingsOpen:true})` — Hud'la aynı sebep (k.4).

### 11. Seviye kartlarında ad/alt yazı düşük kontrast — `6c4045d` *(kendi bulgum)*
Mürekkep bant + parşömen yazı.

### 12. Mermiler hep aynı — mermi commit'i
**Kanıt:** tek havuz, `new Projectile(this, 5, GOLD)`; "greybox mermi"
hiç değişmemişti. **Karar:** önce ucuz yol — `data/projectileVisuals.ts`:
ok ince-uzun ve hedefe dönük, gülle büyük koyu, büyü lapis; dal etkisi
rengi eziyor. `Projectile.setLook`, `Angle` havuz manifestine girdi.
Sprite üretilirse yalnız bu dosya ve `setLook` değişir.

## C — Hata değil (açıklandı)

### 13. 1064 altın
`MAP_3.startGold = round(280 × 3,8)` — S73: 3,8 altın çarpanı 12 noktayı
tam yükseltme noktası olarak **ölçüldü**, testi var. Bilinçli.

### 14. "260 / 410" sayıları, üstteki "ort · L · menzil" yazısı
`MapRenderer.#drawCoverageOverlay`, `import.meta.env.DEV` korumalı —
üretim paketinde **yok** (dist'te doğrulandı). `npm run dev`'de
görünüyor. Dev'de HUD kartının altında kalması can sıkıcı; ertelendi.

## D — Açık

### 15. "2×'e alınca biraz sıkıntı oldu"
Ne olduğu anlaşılmadı — düşman mı zıpladı, mermi mi ıskaladı, arayüz mü
takıldı? Kod tarafında 2× için bilinen tek tuzak (düşük FPS'te
tünelleme) süpürülmüş çarpışmayla kapalı (`ProjectileSystem` başlığı).
**Kullanıcıdan ayrıntı bekleniyor.**

## Ertelenen yan gözlemler

- Harita 1 nokta 1'de (y=65) menü aşağı çevrilince HUD kartıyla
  çakışıyor — **önceden de öyleydi** (eski konum kartın üstüne
  kenetleniyordu). Çözüm `BuildMenu`'ye HUD geometrisi bilgisi sokmak
  demek; ayrı karar.
- Dalga telgrafı (sayı + ikon) HUD kartının dışına taşıyor — önceden de
  öyleydi; kart genişletilebilir ya da telgraf kendi satırına alınabilir.
- Dev kapsama katmanı HUD kartının altında kalıyor (yalnız dev).

## Doğrulama

Her commit: `typecheck` · `test` · `guard` · `build` · `KURALLAR.md`
diff boş · canlı ekran görüntüsü. Test sayısı 753 → 758.

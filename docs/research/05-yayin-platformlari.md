# 05 — Yayın Platformları

Tümü resmi geliştirici dokümanlarından. Bu kısıtlar mimariyi etkilediği için
M0'dan itibaren geçerli sayılmalı.

---

## 1. Poki

Kaynak: `sdk.poki.com/new-requirements` ve `sdk.poki.com/requirements` **[D]**

### Boyut
> "İlk indirme boyutunu 8 MB'ın altında hedefleyin."

İkincil bir kaynak daha sıkı bir iç hedef aktarıyor (ilk indirme 5 MB,
toplam 8 MB) **[T]** — resmi doküman yalnızca 8 MB diyor. Güvenli plan:
`04-varlik-paket-boyut.md` §6'daki aşamalı yüklemeyle ilk indirmeyi
**~1.5 MB**'a indir, tartışma bitsin.

### Çözünürlük — **dokümanda olmayan kritik kısıt**
> "16:9 en-boy oranı. Orantılı ölçeklenecek doğru boyutlar: **640×360**,
> **836×470** veya **1031×580**."

`CLAUDE.md` 1280×720 diyor — 16:9, uyumlu. Ama listelenen boyutlar
1280×720'nin yarısı/alt katları; UI'ın **640×360'ta okunur kalması**
gerektiği anlamına geliyor. Yani:

- Minimum yazı boyutu 1280×720 tasarımda **en az 16 px** olmalı
  (640×360'ta 8 px'e denk gelir, sınırda).
- Dokunmatik hedefler (yapı noktası, yükseltme butonları) 1280×720'de
  **en az 44×44 px** olmalı.
- Tezhip çerçevesinin ince altın motifleri yarı ölçekte kaybolabilir —
  `06-sanat-yonu.md`'de not edildi.

### Mobil
> "Mobilde oyununuz dikey veya yatay yönelimlerden birinde tüm ekranı
> kaplamalı."
> "Tablet cihazlar otomatik olarak mobil kontrol şemasını kullanmalı."

`CLAUDE.md` "yalnızca yatay yönlendirme" diyor — Poki'de geçerli, ama
tabletin mobil şemaya düşmesi ayrıca kodlanmalı (ekran genişliğine değil,
dokunmatik yeteneğine bakarak).

### Duraklatma — **dokümanda olmayan kısıt**
> "ESC veya boşluk tuşu duraklatma/devam işlevini açmalı."

`GAME-DESIGN.md`'de duraklatma hiç yok. Zorunlu özellik.

### Kayıt — **`SaveSystem`'i doğrudan etkiliyor**
> "Gizli sekmede (incognito) çalışmalı; `localStorage` `try/catch` bloklarına
> sarılmalı."

`CLAUDE.md` "Kayıt: `localStorage`, tek anahtar `kale-nobeti-save-v1`" diyor.
Gizli sekmede `localStorage` erişimi bazı tarayıcılarda **istisna fırlatır**.
Sarılmazsa oyun açılışta çöker.

```ts
// systems/SaveSystem.ts
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* yut */ }
}
```

Ve kayıt çalışmıyorsa oyuncuya söylenmeli:
> "İlerlemenin kaydedilmediği durumlarda oyuncuyu açıkça bilgilendirin."

### SDK olay sözleşmesi
> `gameplayStart()` oyuncunun **ilk etkileşiminde** tetiklenir (yüklemede
> değil). `gameplayStop()` kesintilerde (duraklat, menü, seviye bitişi).
> `commercialBreak()` yalnızca duraklamadan aktif oyuna dönerken.
> Olaylar arka arkaya veya çift tetiklenemez.

Bu, sahne mimarisine oturuyor: `Game` sahnesi `create()` içinde değil,
ilk tıklamada `gameplayStart()` çağırmalı; `GameOver`/`LevelSelect`'e geçişte
`gameplayStop()`.

### Yasaklar
- Harici açılış ekranları ve dışa giden bağlantılar
- Üçüncü taraf reklam (yalnız Poki SDK)
- Oyun içi satın alma arayüzü veya reklam kapatma seçeneği
- Yayın öncesi tüm hata ayıklama araçları ve test artıkları temizlenmeli

### Küratörlük
> Poki elle küratörlü bir alan; ekip her oyunu inceleyip uygun olup
> olmadığına karar veriyor. İncelemede esas olarak **UX/his ve çekirdek
> oyun döngüsüne** bakılıyor.

Yani cila ve his, içerik miktarından önemli. Bu, `ROADMAP.md`'nin juice'u
M5'e koymasını riskli yapıyor — M3'te (ilk oynanabilir harita) minimum juice
olmalı ki erken geri bildirim gerçek hissi ölçsün.

---

## 2. CrazyGames

Kaynak: `docs.crazygames.com/requirements/technical/` **[D]**

### Boyut ve dosya sayısı
> "Toplam en fazla 250 MB dosya boyutuna izin verilir."
> "1500 dosya, çünkü yüksek dosya sayıları yüklemeyi yavaşlatır."
> "Oyunun ilk indirme boyutu ≤ 50 MB olmalı."
> Mobil ana sayfa uygunluğu için ilk indirme **≤ 20 MB**.
> Harici barındırılan dosyalar için QA ekibi **oynanışa ulaşma süresine
> (≤ 20 saniye)** göre değerlendiriyor.

İlk indirme, yüklemenin başından ilk `Gameplay start` olayına kadar ölçülüyor.

Kale Nöbeti'nin ~1.5-4 MB'lık planı bu eşiklerin çok altında. **CrazyGames
kısıt değil; Poki bağlayıcı olan.** 8 MB'ı tutturursan her yere girersin.

### Tarayıcı ve cihaz
> "Oyunların Chrome ve Edge'de çalışmasını bekliyoruz. Safari'de iyi
> çalışmayan oyunlar o tarayıcıda devre dışı bırakılır."
> 4 GB RAM'li cihazlarda akıcı çalışmayan oyunlar Chromium OS'ta devre dışı.

Sonuncusu `02-phaser-teknik.md` §4'teki render modu tartışmasını bağlıyor:
düşük uçlu cihaz gerçek bir kabul kriteri, teorik bir endişe değil.

### Diğer
> "Paket içindeki dosyalara başvururken yalnızca **göreli yol** kullanın.
> Asla mutlak yol kullanmayın."
> "Seçim sorunlarını önlemek için `-webkit-user-select: none` ve ilgili
> özellikleri ekleyin."
> "Oyun masaüstünde yatay modda oynanabilir olmalı."
> "Oyun fare, klavye ve (mobil destekleniyorsa) dokunmatiği desteklemeli."

Göreli yol kuralı Vite yapılandırmasını etkiliyor:
```ts
// vite.config.ts
export default defineConfig({ base: './' });  // mutlak '/' DEĞİL
```
Bu unutulursa oyun portalda hiç yüklenmez. Sessiz ve klasik bir hata.

### Kayıt: Data modülü
Kaynak: `docs.crazygames.com/sdk/data/` **[D]**

> Data modülü `window.localStorage` ile **aynı API'yi** sunuyor:
> `clear()`, `getItem(key)`, `removeItem(key)`, `setItem(key, value)`.
> Kullanıcı giriş yapmamışsa veri LocalStorage'da tutulur; sonra giriş
> yaparsa veri hesabına senkronlanır ve yedeklenir.
> Kayıt **1 saniye debounce** edilir; bazı durumlarda **30 saniyeye** kadar.
> **1 MB veri sınırı** var; aşarsa yedeklenmiyor.

API aynı olduğu için `SaveSystem` bir adaptör arkasına yazılırsa geçiş
bedava:

```ts
interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
// Varsayılan: güvenli localStorage sarmalayıcı
// CrazyGames'te: window.CrazyGames.SDK.data
```

**1 saniyelik debounce önemli:** her kule yerleştirmede kayıt yazma. Zaten
`SaveSystem` sadece açılan harita + ayarları tuttuğu için nadir yazacak.

### Gelir paylaşımı
CrazyGames ana geliştirici dokümanlarında oran yayınlamıyor. En yakın resmi
veri 2026 GameMaker web jam şartları: geliştirici **reklam gelirinin %60'ını,
satın alma gelirinin %70'ini** alıyor. **[T]**
Ayrıca SDK entegre edip yayında **2 ay münhasırlık** kabul edilirse pay
**%50 artırılabiliyor**. **[T]**

---

## 3. Sıralama önerisi

1. **itch.io** — kısıt yok, anında yayın. İlk geri bildirim buradan.
2. **CrazyGames Basic Launch** — kısıtlar gevşek, hızlı giriş. Metrikler
   (ortalama oynama süresi, retention) toplanır.
3. **Poki** — en sıkı kısıtlar ve elle küratörlük. En son, cila tamamken.

Ama **teknik kısıtları baştan Poki'ye göre kur** — 8 MB, 16:9, ESC duraklatma,
`try/catch` kayıt, göreli yollar. Bunlar sonradan eklenmesi pahalı olan
şeyler ve hiçbiri geliştirmeyi yavaşlatmıyor.

---

## 4. `CLAUDE.md`'ye eklenecek

```
## Platform kısıtları (M0'dan itibaren geçerli)

- `vite.config.ts` içinde `base: './'` — mutlak yol yasak (CrazyGames).
- 16:9 zorunlu. UI, 640×360'a küçültüldüğünde okunur kalmalı:
  minimum yazı 16 px, minimum dokunmatik hedef 44×44 px (1280×720 ölçeğinde).
- ESC ve boşluk tuşu duraklatmayı açar/kapatır (Poki zorunlu).
- `localStorage` erişimi her zaman try/catch içinde. Kayıt başarısızsa
  oyuncuya bir kez bildirilir.
- Kayıt bir `KeyValueStore` arayüzü arkasında yazılır (portal SDK'sına
  geçiş için).
- Yayın yapısında konsol çıktısı, hata ayıklama tuşları ve FPS sayacı
  bulunmaz.
- Sayfa CSS'inde `-webkit-user-select: none`.
```

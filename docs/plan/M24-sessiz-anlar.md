# M24 — Oyuncunun kendi eylemlerinin görsel karşılığı yok

> **Durum:** BİTTİ (üç fazın üçü). Dengeye **dokunmadı** — yalnız geri
> bildirim.

## Neden

Juice katmanı olgun: sarsıntı yönlü ve üstel sönümlü, hit-stop 2×'te
kendini kapatıyor, ölümde parçacık + hasar yazısı + altın uçuşu var,
boss bandı ve başarım tostu var, hepsi `juice.test.ts`'te bağlı.

Ama sesle işaretlenen anların listesi çıkarılınca **üç tanesinin hiçbir
görseli olmadığı** görüldü:

| an | ses | görsel |
|---|---|---|
| `enemy:killed` | ✅ | ✅ parçacık · hasar yazısı · altın uçuşu |
| `gold:changed` | ✅ | ✅ altın uçuşu |
| `wave:started` | ✅ | ✅ telgraf · boss bandı |
| kule kurma | ✅ | ✅ toz halkası (§10, `M6-T10`) |
| **kışla kurma** | ✅ | ❌ **yok** |
| **kule yükseltme** | ✅ | ❌ **yok** |
| **kışla yükseltme** | ✅ | ❌ **yok** |
| **`purchase:denied`** | ✅ | ❌ **yok** |

§10'un *"kule yerleşimi: toz halkası"* kuralı **yalnız kuleye**
uygulanmış; kışla ve **bütün yükseltmeler** dışarıda kalmış.

Bu, araştırmanın ölçtüğü şeyle birleşince ağırlaşıyor: yapı noktaları
**4. dalgada** doluyor (harita 3-6) ve ondan sonra oyuncunun elinde
kalan tek eylem **yükseltmek**. Yani geç oyunun *tek* eylemi ekranda
hiçbir karşılık bulmuyor.

**Erişilebilirlik tarafı daha ağır (TIER 1 kural 6).** Ses ayarlardan
kapatılabiliyor (§12, varsayılan açık ama kısılabilir). Sesi kapatan
oyuncu için `purchase:denied` **tamamen sessiz**: tıklıyor, hiçbir şey
olmuyor, ve oyun ona neden olmadığını söylemiyor. Düğme zaten soluk
(`alpha 0.55`) ama o *durum*; eksik olan **olaya** verilen cevap.

## Tasarım

- **Kışla kurulumu** — kulenin toz halkasının aynısı; iki yapı aynı
  eylemse aynı dili konuşmalı.
- **Yükseltme** (kule ve kışla) — **yukarı doğru** dar bir sütun, toz
  halkasından ayrı okunsun: kurmak yayılır, yükseltmek yükselir.
- **Reddedilen satın alma** — tıklanan devre dışı düğme kırmızıya bir
  kez parlıyor **ve** yatayda küçük bir "hayır" titremesi yapıyor.

**İki kanal bilerek:** kural 6 bilgiyi yalnız renge bağlamayı
yasaklıyor, `prefers-reduced-motion` ise hareketi. Renk + hareket
birlikte verilince renk körü oyuncu titremeyi, hareketi kapatan oyuncu
parlamayı görüyor; hiçbiri **tek** taşıyıcı değil.

Parçacıklar zaten `settings.effectScale <= 0` ile kapanıyor
(`Particles.patlat` ilk satırı) ve 2× hızda yoğunluk kendiliğinden
yarılanıyor — yeni kapı gerekmiyor.

---

## Fazlar

### Faz 1 — Kışla kurulumu ve yükseltmeler *(risk DÜŞÜK)*

`GameScene`'in `#placeBarracks`, `#upgradeTower` ve `#upgradeBarracks`
yollarında `#efektler.patlat`. Kurma = geniş toz halkası (mevcut dil),
yükseltme = yukarı dar sütun.

> **BİTTİ.** Kurma 180° (toz halkası), yükseltme **22°** (dar sütun) —
> "yayıldı" ile "yükseldi" tek bakışta ayrılıyor. Tarayıcıda ölçüldü:
> kışla kurulduğu anda **14 canlı parçacık** (verilen `adet` ile
> birebir). Parçacıklar zaten `settings.effectScale <= 0` ile kapanıyor
> ve 2× hızda yoğunluk yarılanıyor; yeni kapı gerekmedi.

### Faz 2 — Reddedilen satın alma *(risk DÜŞÜK)*

`BuildMenu`'nün devre dışı düğme dalında parlama + titreme.

> **BİTTİ.** `BuildMenu` artık `Settings` alıyor. Üst üste tıklamada
> tween'ler birikmiyor (her çağrı öncekini öldürüp başlangıç değerine
> dönüyor), yoksa hızlı tıklayan oyuncu butonu kalıcı kaydırabilirdi.

### Faz 3 — Doğrulama

Tarayıcıda oyuncu gözüyle: kurulum, yükseltme ve parası yetmeyen
tıklama. Ayarlardan efekt kapatılıp ikinci kanalın hâlâ çalıştığı
görülecek.

> **BİTTİ — ve iki kanal ÖLÇÜLDÜ.** Parçacık ve tween'ler 200 ms'den
> kısa yaşadığı için ekran görüntüsüyle kovalamak güvenilir değildi;
> onun yerine çalışma zamanında sayıldı:
>
> | durum | tetiklenen |
> |---|---|
> | kışla kurulumu | **14 canlı parçacık** |
> | reddetme, hareket **açık** | `alpha` + `x` + `x` |
> | reddetme, hareket **kapalı** | **yalnız `alpha`** |
>
> Yani kural 6'nın istediği sağlandı: hareketi kapatan oyuncu parlamayı,
> renk körü oyuncu titremeyi alıyor; hiçbiri tek taşıyıcı değil.
> Konsol temiz.
>
> **Yol boyunca bir iddiam düzeldi:** plan önce "kule kurmanın da
> görseli yok" diyordu; koda bakınca `#placeTower`'ın §10 toz halkasını
> `M6-T10`'dan beri attığı görüldü. Eksik olan kışla kurulumu ve
> **bütün yükseltmelerdi**.

---

## Bu planın YAPMADIĞI şeyler

- **Dengeye dokunmak** — sahibin açık talebi.
- **Yeni ses eklemek** — üçünün de sesi zaten var; eksik olan görsel.
- **Yeni parçacık sistemi** — `Particles.patlat` yeniden kullanılıyor
  (TIER 1 kural 3: oyun içinde `new` ile parçacık yaratılmıyor).

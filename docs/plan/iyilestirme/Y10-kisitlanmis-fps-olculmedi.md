# Y10 · S15'in "yayın öncesi zorunlu" ölçümü hiç yapılmadı

> **☑ BİTTİ.** 4× kısıtlamalı okuma kullanıcı tarafından yapıldı:
> **WebGL 50,2 FPS · Canvas 50,1 FPS**, eşik ≥ 30 → **%65 payla
> geçildi**. `S15` kapandı, `R13` azaldı (kapanmadı — ölçüm bir vekil,
> gerçek 4 GB Chromebook elde yok).
>
> **Beklenmeyen ikinci sonuç:** kısıtlama altında sıralama tersine
> dönüyor. Hızlı makinede WebGL %20 ucuz (2,53 vs 3,04 ms); 4×
> kısıtlamada Canvas **%32 ucuz** (9,29 vs 13,63 ms), p99'da %38.
> `research/02` §4'ün "eski cihazlarda Canvas %30 kazandırıyor" bulgusu
> vekil ölçümde **doğrulandı** — daha önce "bu makinede doğrulanmadı"
> yazmıştım, kısıtlamasız ölçüme bakarak; eksik olan kısıtlamaydı.
>
> `Phaser.AUTO` kalıyor (eşik rahat geçiliyor, hızlı makinede WebGL daha
> iyi) ama Canvas artık **ölçülmüş bir kol**: hedef cihazda FPS 45'in
> altına düşerse geçiş ~%32 kazandırıyor.
>
> Sayılar: `docs/results/OLCUMLER.md` `F1`-`F10`. Karar ve gerekçe:
> `src/main.ts`. Aşağıdaki analiz ve tarif olduğu gibi bırakıldı —
> ölçüm tekrarlanabilir kalsın diye.
>
> ---
>
> **◧ Önceki durum (kısmen yapıldı):** Kısıtlamasız taraf ölçüldü ve
> `docs/results/OLCUMLER.md` "Kare maliyeti ve render modu" bölümüne
> işlendi. **Geriye tek adım kaldı: 4× CPU kısıtlaması altındaki okuma**
> — Chrome DevTools gerektiriyor, tarayıcı panelinde CPU kısıtlama
> yok.
>
> Yapılanlar:
>
> | Ne | Sonuç |
> |---|---|
> | Tepe senaryo kuruldu | Harita 3, 10 kuleli karışık tahta, efekt Tam |
> | **Gerçek kare CPU maliyeti** | WebGL sıcak: ort **2,53 ms**, p95 3,30, p99 3,70 |
> | **AUTO ↔ CANVAS karşılaştırması** | Sıcak WebGL, Canvas'tan **hızlı** (2,53 vs 3,04 ms) |
> | Bellek | WebGL 42-44 MB · Canvas 32 MB |
> | Kare maliyeti ↔ düşman sayısı | **bağımsız** — maliyet sabit işte, varlıklarda değil |
>
> **Duvar saati FPS'i yanıltıcıydı:** 62 FPS okunuyor ama bu vsync'e
> takılı aralık, CPU maliyeti değil. Ölçüm `raf.callback` sarmalanarak
> kare başına gerçek süreyle yapıldı.
>
> **İki koşu şarttı.** İlk WebGL örneği p99 26,9 ms / maks 150,8 ms
> verdi; ikincisi aynı sahnede p99 3,7 / maks 7,2. Fark ısınma (shader
> derleme, doku yükleme). Tek koşuya bakılsaydı "Canvas kazanıyor"
> sonucu çıkar ve render modu **yanlış** değişirdi. Soğuk başlangıcın
> kendisi ayrı bir bulgu — `Y12` (açılışta boş ekran) ile doğrudan
> ilgili.
>
> **Karar:** `Phaser.AUTO` kalıyor. `research/02` §4'ün "eski cihazlarda
> Canvas %30 kazandırıyor" bulgusu bu makinede doğrulanmadı — ama bu
> makine hedef cihaz değil, o yüzden bulgu çürütülmüş de sayılmıyor.
> Karşılaştırma `?render=canvas` ile (yalnız `import.meta.env.DEV`)
> tekrarlanabilir hâle geldi.
>
> **Aritmetik eşiği geçtiğini söylüyor** (sıcak p99 3,7 × 4 = 14,8 ms →
> 68 FPS) **ama bu ölçüm değil.** Bu dosyanın kendi kuralı: "tahmin,
> ölçümün yerini tutmuyor". S15 ve R13 bu yüzden **açık kalıyor.**

| | |
|---|---|
| **Tür** | Yapısal — doğrulama boşluğu |
| **Önem** | **Yüksek.** Kendi kuralımızın "zorunlu" dediği geçit atlandı |
| **Emek** | Küçük (ölçüm) / bilinmiyor (çıkarsa düzeltme) |
| **Risk** | — (ölçüm risk taşımaz; **ölçmemek** taşıyor) |
| **Dokunulan** | `docs/results/OLCUMLER.md`, `docs/results/M7-SONUC.md`, muhtemelen `src/main.ts` |
| **İlgili** | `OPEN-QUESTIONS.md` **S15** · `RISKS.md` **R13**, **R11** |

---

## Bulgu

`S15` iki kademeli bir başarım geçidi tanımlıyor ve ikincisini **"yayın
öncesi zorunlu"** olarak işaretliyor. Proje yayın adımında
(`M7-T11`, "yalnız hesap + insan eylemi bekliyor") ve bu ölçüm
**hiç yapılmadı**.

## Kanıt

### Kural ne diyor

`OPEN-QUESTIONS.md`, S15:

> **Birincil geçit:** geliştirme makinesi, tepe dalgada **60 FPS**.
> **İkincil geçit (yayın öncesi zorunlu):** Chrome DevTools **4× CPU
> kısıtlaması** altında tepe dalgada **≥ 30 FPS**.
>
> **Nerede:** M6 (efektler FPS riskinin zirvesi) ve M7 (yayın öncesi
> tekrar).

`M1-SONUC.md:208` da aynı şeyi taşa bağlıyor:

```
| 4× CPU kısıtlaması altında FPS ölçümü | M6, M7 |
```

`RISKS.md` R13 ("Düşük uçlu cihaz") azaltması:

> render modu kararı ölçümden sonra (`research/02` §4)
> **Taş:** M6 (ölçüm), M7 (`E17`).

### Ölçüm yapıldı mı — hayır

`docs/results/M6-SONUC.md` ve `docs/results/M7-SONUC.md` içinde
`FPS`, `kısıtla`, `Chromebook`, `4 GB`, `R13`, `Canvas`, `S15`
taraması: **sıfır sonuç.**

Var olan bütün FPS ölçümleri geliştirme makinesinde ve **kısıtlamasız**:

| Kaynak | Ölçüm | Koşul |
|---|---|---|
| `M0-SONUC.md:52` | 145 FPS | geliştirme makinesi |
| `M2-SONUC.md:28` | kare 4,38 ms ort · 8,70 ms maks | 8 kule + 26 düşman, kısıtlamasız |
| `M5-SONUC.md:268` | p95 4,7 ms | kısıtlamasız |
| `OLCUMLER.md:577` | juice katmanı 16,7 ms bütçesinde | kısıtlamasız |

Yani **birincil geçit rahatça geçiliyor** ve iyi belgelenmiş. İkincil
geçitten hiç geçilmedi.

### Ve buna bağlı bir karar askıda

`src/main.ts:16-18`:

```ts
// research/02 §4: AUTO (WebGL öncelikli). Canvas'a düşme kararı
// ölçmeden verilmiyor — M6'da hedef cihazda FPS ölçülünce bakılacak.
type: Phaser.AUTO,
```

`research/02` §4'ün bulgusu (R13'te aktarılıyor):

> saha ölçümü eski cihazlarda WebGL→Canvas geçişinin **%30 kazanç**
> verdiğini gösteriyor

Yani ortada ölçüme bağlanmış, ölçüm yapılmadığı için **verilmemiş** bir
karar var. Kararın verilmemesi yanlış değil — kuralın kendisi "ölçmeden
verme" diyor. Yanlış olan, ölçümün de yapılmamış olması.

## Neden önemli

**1. CrazyGames'in yazılı şartı.** `RISKS.md` R13:

> "4 GB RAM'li cihazlarda akıcı çalışmayan oyunlar Chromium OS'ta
> devre dışı bırakılır."

Bu bir tercih değil, platformun kuralı. Ölçmeden yayınlamak, şartı
karşılayıp karşılamadığımızı bilmeden başvurmak demek.

**2. M6 tam da riskin arttığı taştı.** Ölçümün M6'ya konması tesadüf
değil: juice katmanı (parçacıklar, sarsıntı, hit-stop, altın uçuşu,
vinyet) o taşta geldi ve S15'in kendi notu "M6 (efektler FPS riskinin
zirvesi)" diyor. Riskin en yükseldiği anda ölçüm atlandı.

**3. Bu oturumda eklenenler de ölçülmedi.** Altın uçuşu (M6-T10),
gerçek sprite'a geçişi, çok yollu hareket — hiçbiri kısıtlama altında
görülmedi.

**4. Ucuz.** Chrome DevTools → Performance → CPU: 4× slowdown. Tepe
dalgayı oynat, FPS'i oku. Yarım saat.

**5. Vekilin kendisi zaten bir taviz.** S15 dürüstçe yazıyor: 4 GB
Chromebook elde yok, bu yüzden "tekrarlanabilir bir **vekil**"
seçildi ve vekil olduğu açıkça belirtildi. Vekil bile koşulmazsa
geriye hiçbir şey kalmıyor.

## Ölçüm nasıl yapılmalı

`OLCUMLER.md`'nin biçimine uygun, tekrarlanabilir:

| Ne | Nasıl |
|---|---|
| **Senaryo** | Harita 3 (en ağır: HP ×2,6, 12 nokta, iki giriş), tepe dalga (boss dalgası), tam tahta kurulu, efekt yoğunluğu **Tam** |
| **Kısıtlama** | Chrome DevTools → Performance → CPU → **4× slowdown** |
| **Okuma** | `dev.gameFrames` sayacı (duvar saatiyle bölünerek) — göz kararı değil |
| **Eşik** | ≥ 30 FPS |
| **Karşılaştırma** | Aynı senaryo `type: Phaser.CANVAS` ile tekrar |

**İkinci ölçüm kritik:** `research/02`'nin %30 kazanç bulgusu
doğrulanmadan render modu değiştirilmemeli. Ölçüm iki sayı üretmeli,
bir tane değil.

## Olası sonuçlar ve ne yapılacağı

| Sonuç | Karar |
|---|---|
| **≥ 30 FPS, rahat** | `Phaser.AUTO` kalır. `main.ts:16-18` yorumu güncellenir, S15 kapanır, R13 azaltılır. **En olası sonuç** — kısıtlamasız kare 4,38 ms, 4× kısıtlamada ~17,5 ms, yani 57 FPS civarı beklenir. |
| **30 FPS civarı, sınırda** | Efekt yoğunluğunun cihaza göre otomatik düşürülmesi düşünülür (`Settings` zaten üç kademe taşıyor — altyapı hazır). |
| **< 30 FPS** | Canvas ölçümüyle karşılaştırılır. Canvas kazandırıyorsa render modu kararı verilir; kazandırmıyorsa darboğaz profillenip bulunur ([Y02](Y02-pool-activeitems-tahsis.md) ilk şüpheli). |

> **Kaba tahmin ≥30 FPS'i gösteriyor** — ama tahmin, ölçümün yerini
> tutmuyor ve kuralın "zorunlu" dediği şey tam olarak bu.

## Bir de bunun yanında ölçülmeli

Ölçüm oturumu zaten kurulmuşken, ek maliyeti sıfır olan iki şey:

1. **Bellek.** Uzun bir oturumda (30 dalga, üç harita) bellek düzenli
   büyüyor mu — havuz sızıntısının tek doğrudan göstergesi.
   `dev.enemyCapacity()` sabitliği bunu dolaylı ölçüyor ama bellek
   eğrisi doğrudan söylüyor.
2. **Tahsis oranı.** [Y02](Y02-pool-activeitems-tahsis.md)'nin
   "Adım 2 — ölç, sonra karar ver" adımı tam bu ölçümü istiyor.
   İki iş aynı oturumda yapılırsa Y02'nin kararı da verilebilir hâle
   geliyor.

## Doğrulama

1. Ölçüm yapıldı ve **`OLCUMLER.md`'ye işlendi** — dosyanın kendi
   kuralı: "İşlenmeyen ölçüm bir sonraki oturumda yeniden yapılmak
   zorunda kalır."
2. `M7-SONUC.md`'ye S15 satırı eklendi.
3. `OPEN-QUESTIONS.md` S15 durumu güncellendi.
4. `RISKS.md` R13'ün "Erken uyarı: hedef cihazda FPS 45'in altında"
   satırı gerçek bir sayıyla karşılaştırılabilir hâle geldi.
5. Karar verildiyse `main.ts:16-18` yorumu güncellendi; verilmediyse
   **neden verilmediği** yazıldı.

## Bitmedi sayılır eğer

- Ölçüm yapılıp `OLCUMLER.md`'ye işlenmediyse.
- Yalnız `AUTO` ölçülüp `CANVAS` karşılaştırması atlandıysa.
- Ölçüm göz kararı yapıldıysa (sayaç kullanılmadıysa).
- Harita 1 ölçülüp harita 3 atlandıysa (en ağır senaryo o).
- Sonuç ≥30 çıktı diye S15/R13 kapatılmayıp açık bırakıldıysa.

---

## Kalan tek adım: 4× kısıtlamalı okuma (insan işi)

Tarayıcı panelinde CPU kısıtlama yok; Chrome DevTools gerekiyor.
Aşağıdaki tarif **tekrarlanabilir** — aynı senaryo, aynı okuma yöntemi.

### 1. Sunucuyu başlat

```bash
npm run dev
```

### 2. Chrome'da aç ve DevTools'u kur

`http://localhost:5174/` → **F12** → **Performance** sekmesi →
dişli/ayarlar → **CPU: 4× slowdown**.

> Kısıtlama sekmeye bağlı ve sayfa yenilense de kalıyor. Kaydı
> başlatmaya gerek yok, yalnız kısıtlama açık olsun.

### 3. Senaryoyu kur (Console'a yapıştır)

```js
const g = window.__game, raf = g.loop.raf;
g.registry.get('settings').set('effectScale', 'full');
g.registry.get('settings').set('difficulty', 'kolay');
g.scene.getScene('Menu').scene.start('Game', { mapId: 'kul-ovasi' });
g.scene.getScene('Menu').scene.launch('Hud');
await new Promise(r => setTimeout(r, 3000));
const k = window.__kn;
const PLAN = ['okcu','buyu','top','okcu','buyu','kisla','okcu','buyu','top','okcu','buyu','kisla'];
for (let s = 0; s < 12; s++) { try { PLAN[s] === 'kisla' ? k.placeBarracks(s) : k.placeTower(s, PLAN[s]); } catch {} }
k.startWaveEarly?.();
'tahta hazir: ' + k.towerCount() + ' kule';
```

### 4. Ölç (Console'a yapıştır)

```js
window.__olc = async (sn = 25) => {
  const g = window.__game, raf = g.loop.raf, asil = raf.callback, d = [];
  raf.stop();
  raf.start((t) => { const a = performance.now(); asil(t); d.push(performance.now() - a); }, true, 16);
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, sn * 1000));
  const duvar = performance.now() - t0;
  raf.stop(); raf.start(asil, true, 16);
  d.sort((a, b) => a - b);
  const p = (q) => +d[Math.floor(d.length * q)].toFixed(2);
  return {
    kare: d.length,
    FPS: +(d.length / (duvar / 1000)).toFixed(1),
    kareMsOrt: +(d.reduce((t, v) => t + v, 0) / d.length).toFixed(2),
    p95: p(0.95), p99: p(0.99), maks: +d[d.length - 1].toFixed(2),
  };
};
await window.__olc(25);
```

**İki kez çalıştır.** Birincisi soğuk (shader derleme, doku yükleme) ve
yanıltıcı; karar ikincisine göre verilir. Kısıtlamasız ölçümde ilk koşu
p99 **26,9 ms**, ikincisi **3,7 ms** verdi — aradaki fark tamamen ısınma.

### 5. Aynısını Canvas ile

`http://localhost:5174/?render=canvas` ile aç, 3-4. adımları tekrarla.

### Eşik ve karar

| `FPS` (ikinci koşu) | Karar |
|---|---|
| **≥ 30** | `Phaser.AUTO` kalır · S15 kapanır · R13 azaltılır |
| **30 civarı** | Efekt yoğunluğunun cihaza göre düşürülmesi (altyapı hazır, `Settings` üç kademe taşıyor) |
| **< 30** | Canvas sayısıyla karşılaştır; Canvas kazanıyorsa render modu değişir, kazanmıyorsa darboğaz profillenir |

Sonuç `docs/results/OLCUMLER.md`'deki `F1`-`F5` tablosunun altına
işlenmeli — dosyanın kendi kuralı: işlenmeyen ölçüm yeniden yapılmak
zorunda kalıyor.
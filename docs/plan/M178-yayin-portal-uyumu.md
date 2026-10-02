# `M178` — Yayın: portal uyumu ve sahibin yol haritası

> **Durum:** uygulanıyor (2026-10-03). Sahip kapanıştan sonra *"yayın
> için neler yapabiliriz, neler yapacağız"* diye sordu. `M9`'un kod
> tarafı bitmişti; aradan `M10`-`M177` geçti ve portal belgeleri bugün
> yeniden okundu.

Kaynaklar (bugünkü hâlleri): CrazyGames `requirements/technical`,
`requirements/ads`, `requirements/gameplay`, `requirements/game-covers`,
`sdk/video-ads`, `sdk/game`; Poki `sdk-documentation` ve geliştirici
rehberi (arama özetleri üzerinden — `developers.poki.com`'a doğrudan
erişim reddedildi, alıntılar arama sonuçlarındaki belge metninden).

---

## Bulgular

### 1. CrazyGames'te ilk reklamdan sonra ses kalıcı olarak kısılıyordu

Bağdaştırıcı `SDK.ad.requestAd('midgame').catch(...).finally(...)`
diyordu. Belge: *"`requestAd` does not return a Promise; it uses
callback-based handling"* — imza `requestAd(tur, { adStarted,
adFinished, adError })`. `undefined.catch` fırlıyor ve **`sesiKis(true)`
o satırdan önce çağrılmış**: oyun sessiz kalıyor, hiçbir şey geri açmıyor.
Testteki sahte SDK'da `ad` alanı yoktu, yani bu yol hiç koşmamıştı.

### 2. Reklam yanlış yerde ve oyun reklam sırasında sürüyordu

| | Belge | Bizde |
|---|---|---|
| Yer | Poki: *"we recommend you implement `commercialBreak()` before every `gameplayStart()`"* · *"Player dies and restarts: `gameplayStop()` > `commercialBreak()` > `gameplayStart()`"*. CrazyGames: *"between levels… level transitions, map changes, player death"* · *"Do not show a midgame ad on a navigational button"* | **Yalnız** duraklatmadan dönüşte; harita başında, yeniden denemede, sonraki haritada **hiç** |
| Oyun | CrazyGames: *"Your game should be paused during a video ad"* · *"muted"* · *"Disable buttons"*. Poki: reklam sırasında SDK olayı atılamaz | Reklam **beklenmiyordu**: `Devam`a basınca oyun hemen sürüyor, video oynarken düşman yürüyor, can gidiyordu |

`M9`'un *"reklam yalnız duraklamadan dönüşte meşru"* okuması Poki'nin
bir örneğini kural sanmıştı; CrazyGames için o yer açıkça yanlış
(duraklatma menüsünün `Devam`ı bir gezinme düğmesi).

### 3. Yükleme olayları yok

Poki `gameLoadingFinished()` (*"so conversion to play is measured
correctly"*), CrazyGames `loadingStart()` / `loadingStop()` (`sdk/game`:
*Required*). Kodda üçü de yok.

### 4. Kendi tam ekran düğmemiz CrazyGames'te yasak

*"Custom in-game fullscreen buttons are prohibited."* Poki'de tam ekranı
platform oyun oyun kendisi açıyor (*"No action is needed on the
developer's side"*). Düğme itch.io'da gerekli, portal yapımında değil.

### 5. `research/05` §3'ün sıralaması Poki'nin münhasırlığıyla çelişiyor

*"Poki prefers to work with developers on a Web Exclusive basis"* —
açık web'de yalnız Poki (Steam/mobil hariç). §3 "önce itch.io, en son
Poki" diyordu; o sırayla gidilirse Poki kapısı büyük olasılıkla kapanır.

### 6. itch.io sayfa metni bayat

"5 harita, 50 dalga, 9 düşman, 12 başarım, Zor = daha az can". Veriden
sayıldı: **6 · 60 · 11 · 17**, Zor `M175`'ten beri 20 can.

### 7. Lisans — sahibin teyidi gerekiyor

Sanat, ses efektleri (ElevenLabs) ve müzik (Suno/Udio) yapay zekâ
üretimi (`OPEN-QUESTIONS` S51/S52). Reklam geliri ticari kullanım;
bu araçların çoğunda ticari hak **üretim anındaki ücretli plana** bağlı.
Kod işi değil, ama yayın engeli olabilir.

### 8. Kapak görselleri yok

CrazyGames üç boyu zorunlu tutuyor: 1920×1080, 800×1200, 800×800;
oyun içi ekran görüntüsü yasak, başlık yazısı serbest.

---

## Faz 1 — SDK düzeltmeleri *(yayın engeli)*

- CrazyGames reklamı geri çağrılı imzayla. Belge her isteğe bir geri
  çağrı **garanti etmiyor**; reklam belli bir süre içinde başlamazsa
  istek ölü sayılıyor ve oyun bekletilmiyor (sonsuz bekleme = oyuncu
  geçişte kilitli kalır).
- Reklam **seviye geçişlerinde**: seviye seçimden haritaya, yeniden
  dene, sonraki harita, sonsuza devam, duraklatmadan "Yeniden başla",
  menüden "Devam et". Oyun **reklam bitince** başlıyor; reklam boyunca
  girdi kapalı, ses kısık. Duraklatmadan dönüşte reklam **yok**.
  İlk açılıştaki doğrudan oyun da reklamsız (Poki'nin açılış sırası
  `gameLoadingFinished` > `gameplayStart`).
- Yükleme olayları: açılışta `loadingStart`, ilk yükleme bitince Poki
  `gameLoadingFinished` + CrazyGames `loadingStop`.
- Portal yapımında kendi tam ekran düğmemiz çizilmiyor.

**Doğrulama:** sahte SDK'yla birim testi (Poki · CrazyGames · SDK yok);
tarayıcıda sahte bağdaştırıcıyla geçiş sırası ve sayaçlar.

## Faz 2 — Paketler, sayfa metni, kapaklar

- itch.io sayfa metni veriden sayılarak güncellenir.
- Sürüm `1.0.0`.
- Üç yapım koşturulur; çapraz SDK dizesi taranır (`M9`'un ölçümü).
- Kapaklar mevcut sanattan türetilir (geçici; sahip isterse yeniden
  ürettirir).

## Faz 3 — Belgeler

- `research/05` §3 düzeltilir.
- `docs/YAYIN.md`: sahibin adım adım yayın rehberi (karar, lisans,
  hesaplar, yükleme, ilk hafta).

## Bilerek ertelenen

- **CrazyGames Data modülü** (bulut kayıt): *Full Launch*'ın şartı
  (*"Data module if applicable"*), *Basic Launch*'ın değil. Full
  Launch'a CrazyGames kendi ölçümüne bakıp geçiriyor; o gün yapılır.
- `happytime()` (isteğe bağlı), site kilidi, tanıtım videosu.

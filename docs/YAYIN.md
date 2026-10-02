# Yayın rehberi — Kale Nöbeti

> **Durum (2026-10-03, `M178`):** kod tarafı hazır. Bu belge **sahibin**
> yapacaklarını sırayla anlatıyor: bir karar, bir lisans kontrolü,
> hesaplar, yükleme. Hesap açmak, şartları kabul etmek, yüklemek ve
> ödeme bilgisi girmek sahibin işi; bunları ben yapmıyorum.
>
> Kaynaklar: CrazyGames ve Poki belgelerinin 2026-10-03 hâli
> (`docs/plan/M178-yayin-portal-uyumu.md`), `research/05`.

---

## Hazır olanlar

| | Nasıl |
|---|---|
| itch.io paketi | `npm run build` → `npm run package:itch` → `kale-nobeti-itch.zip` |
| Poki paketi | `npm run package:poki` → `kale-nobeti-poki.zip` |
| CrazyGames paketi | `npm run package:crazygames` → `kale-nobeti-crazygames.zip` |
| Kapaklar | `yayin/kapak/` — CrazyGames'in üç zorunlu boyu + itch.io |
| Sayfa metni (TR/EN), kontroller | [`docs/results/M8-itchio-sayfa.md`](results/M8-itchio-sayfa.md) |
| Portal SDK'sı | Yükleme olayları, oyun başla/dur, **seviye geçişinde** reklam (oyun reklam bitince başlıyor, reklam boyunca ses kısık). CrazyGames tarafı **gerçek SDK'yla** (3.8.0, yerel mod) uçtan uca sınandı. |

Her paket kendi yapımını koşturuyor ve zip'in kökünde `index.html` olduğunu,
içindeki SDK'nın hedefle eşleştiğini denetliyor. **Kodda bir şey değişirse
paketi yeniden üretin.** Zip'ler depoya girmiyor (`.gitignore`).

---

## 1. Karar: hangi yol?

| | Poki | CrazyGames | itch.io |
|---|---|---|---|
| Münhasırlık | **Açık web'de yalnız Poki** (Steam ve mobil mağazalar hariç) | Yok — 2 aylık münhasırlık kabul edilirse pay artıyor | Yok |
| Giriş | Elle seçiliyor. Test hunisi: Player Fit Test (~500 oyuncu, oynama süresi) → Web Fit Test (kapağın tıklanma oranı) → son inceleme | *Basic Launch* (reklamsız, ölçüm) → CrazyGames ölçüme bakıp *Full Launch*'a (reklam geliri) geçiriyor | Anında |
| Gelir | Poki'den gelen oyuncuda yarı yarıya | Reklam gelirinin yaklaşık %60'ı *(belgede yazmıyor, ikincil kaynak)* | İsteğe bağlı bağış / fiyat |

### Önerim: önce Poki'ye başvurun, yanıtı bekleyin; ret gelirse CrazyGames + itch.io

1. **Sıra tek yönlü.** Oyun önce itch.io'ya ya da CrazyGames'e konursa
   Poki'nin münhasırlık şartı büyük olasılıkla kapıyı kapatır. Ters
   yön açık: Poki reddederse diğer ikisi hâlâ orada.
2. **Poki'nin testi bedava gerçek oyuncu verisi.** Bu projenin hiç
   yapılamayan tek kontrolü (insanla oynatma, `KAPANIS` madde 6) Poki'nin
   Player Fit Test'inde kendiliğinden oluyor. Oyuncu videoları ya da
   rakamlar gelirse bana getirin; gördüğüm sorunları düzeltirim.
3. **Ret bir kayıp değil.** Paketler hazır; B yoluna aynı gün geçilir.

Acele edilecekse ya da Poki'nin yanıt süresi beklenmek istenmiyorsa
doğrudan B yolu da doğru bir seçim; yalnız Poki seçeneği o gün kapanmış
sayılır.

**İsim üzerine bir not:** iki portal da İngilizce konuşan bir kitleye
açılıyor. "Kale Nöbeti" adı kalabilir (kapaklar bu adla); portal formundaki
başlığa ya da alt başlığa *Keep Watch* eklemek İngilizce oyuncuya oyunun ne
olduğunu söyler. Karar sizin.

---

## 2. Yayından ÖNCE: lisans kontrolü — engel olabilir

Görseller, ses efektleri (ElevenLabs) ve müzik (Suno/Udio) **yapay zekâ
üretimi** (`OPEN-QUESTIONS` S51/S52). Portalda reklamla yayınlamak
**ticari kullanım** demek. Bu araçların çoğunda ticari kullanım hakkı,
**üretim anında ücretli bir planda olmaya** bağlı. Örneğin Suno'nun ücretsiz
planında üretilen şarkılar ticari kullanılamıyor; ElevenLabs'ta da ticari
lisans ücretli planlarda veriliyor. Şartlar değişebiliyor, o yüzden kesin
cevap **sizin hesabınızın üretim tarihindeki planında**.

| Varlık | Araç | Kontrol |
|---|---|---|
| Müzik (2 parça) | Suno / Udio | Üretildiği gün ücretli plan var mıydı? |
| Ses efektleri (12) | ElevenLabs | Aynı soru |
| Görseller (harita, kule, düşman, menü) | ? — belgelerde araç adı yok | Hangi araç, hangi plan? |
| Fontlar (Grenze Gotisch, Spectral, Inter Tight) | Google Fonts | SIL OFL — ticari kullanım serbest ✓ |

**Ücretsiz planda üretildiyse** üç yol var: ücretli planda yeniden üretmek,
CC0 lisanslı bir kütüphaneden (Freesound, OpenGameArt) karşılığını bulmak ya
da o varlığı çıkarmak. Müzik oyunun işleyişi için gerekli değil; çıkarılması
en ucuz olan o. Hangisini seçerseniz kod tarafını ben yaparım.

**itch.io** proje ayarlarında yapay zekâ açıklaması istiyor: "evet" (grafik,
ses, müzik) diye dürüstçe işaretleyin.

---

## 3. Yayından önce: eski bir cihazda bir harita

CrazyGames: *4 GB RAM'li cihazlarda akıcı çalışmayan oyunlar ChromeOS'ta
kapatılıyor.* Oyun bu makinede hiç zayıf donanımda denenmedi (`KAPANIS`
madde 6). Evdeki en eski dizüstünde ya da telefonda bir haritayı baştan sona
oynayın; takılma varsa bana söyleyin. İlk indirme 0,83 MB, yani yükleme
tarafında sorun beklenmiyor; soru kare hızı.

---

## 4. Yol A — Poki

1. `developers.poki.com` adresinde geliştirici hesabı açın.
2. `npm run package:poki` → `kale-nobeti-poki.zip`'i Poki'nin yükleme
   aracına verin.
3. Kapak: `yayin/kapak/yatay-1920x1080.jpg` ve `kare-800x800.jpg`. Poki
   başka bir boy isterse söyleyin, aynı sanattan üretirim.
4. Açıklama ve kontroller: sayfa metni dosyasının "English" ve "Kontroller"
   bölümleri.
5. Test hunisi süresince oyunu başka bir web sitesine koymayın.

**Bilinen sınır:** bu makinenin ağı poki.com'a SSL ile bağlanamıyor
(tarayıcı `ERR_SSL_PROTOCOL_ERROR`), yani Poki SDK'sını burada canlı
deneyemedim. Bağdaştırıcı belgedeki imzaya göre yazıldı ve sahte SDK'yla
sınandı; SDK hiç yüklenmezse (reklam engelleyici) oyunun yine açıldığı ise
canlı doğrulandı. Poki'nin yükleme aracı olayları kendisi denetliyor; bir
uyarı verirse metnini bana iletin.

---

## 5. Yol B — CrazyGames + itch.io

### CrazyGames
1. `developer.crazygames.com` adresinde hesap açın.
2. Yeni oyun → HTML5 → `npm run package:crazygames` →
   `kale-nobeti-crazygames.zip`.
3. Kapaklar: `yatay-1920x1080.jpg`, `dikey-800x1200.jpg`, `kare-800x800.jpg`.
4. Açıklama ve kontroller: sayfa metni dosyası. Yaş: CrazyGames'in kitlesi
   13 yaş üstü ve oyunların PEGI 12'ye uymasını istiyor.
5. Yönlendirme: **yatay**.
6. Oyun önce *Basic Launch*'ta yayınlanıyor (reklamsız). CrazyGames
   ölçüme bakıp *Full Launch*'a geçirirse **bana haber verin**: Full Launch
   için bulut kayıt (CrazyGames Data modülü) eklenmeli. Bilerek ertelendi;
   Basic Launch'ın şartı değil.
7. Gelir ve vergi bilgisi, 2 aylık münhasırlık teklifi: sizin kararınız.
   Münhasırlığı kabul ederseniz itch.io'yu 2 ay bekletin.

### itch.io
1. itch.io hesabı → *Upload new project*.
2. Ayarlar sayfa metni dosyasındaki tabloda: **HTML**, viewport
   **1280 × 720**, *mobile friendly* (yatay), *fullscreen button*.
3. `npm run build` → `npm run package:itch` → `kale-nobeti-itch.zip`.
4. Kapak: `yayin/kapak/itch-630x500.jpg`. Ekran görüntülerini yayın
   yapısından alın (liste sayfa metni dosyasında).
5. Yapay zekâ açıklaması: evet.
6. Fiyat: ücretsiz (isterseniz bağışa açık).

---

## 6. Yayından sonra: ilk hafta

`ROADMAP.md`'nin kuralı: **en az bir hafta veri biriktirin**, daha erken
bakmak gürültü okumak demek. Sonra şu beşini getirin:

| Sinyal | Nereden |
|---|---|
| Ortalama oturum süresi | Portal paneli |
| Dönüş oranı | Portal paneli |
| Harita başına tamamlama | Poki paneli (oyun `start`/`complete`/`fail` olaylarını gönderiyor — `systems/olcum.ts`) |
| Nerede bırakıyorlar | Aynı olaylar |
| Yıldız dağılımı | Gönderilmiyor — yalnız oyuncunun kendi kaydında |

Hangi birleşimin hangi işe işaret ettiği `ROADMAP.md`'deki teşhis
matrisinde. Bir sonraki işi tahmin değil bu veri seçecek.

---

## Bilerek ertelenenler (yayını engellemiyor)

- CrazyGames Data modülü (bulut kayıt): Full Launch'ta.
- CrazyGames `happytime()`, site kilidi, tanıtım videosu (15-20 sn,
  yatay + dikey 1080p, sessiz): isteğe bağlı.
- Tünelci'nin kendi çizimi (`KAPANIS` madde 1).

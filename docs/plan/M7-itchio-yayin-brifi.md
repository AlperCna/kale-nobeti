# itch.io Yayın Brifi — `M7-T11`

`M6-sanat-uretim-brifi.md` ve `M6-ses-uretim-brifi.md`'nin yayın
karşılığı. **Ben itch.io'ya yükleme yapamam** — hesap açma, herkese
açık içerik yayınlama benim iznim dışında (proje güvenlik kuralları).
Bu dosya sizin veya yükleme yapacak kişinin izleyeceği adımları verir;
ben yalnız **öncesindeki ve sonrasındaki teknik doğrulamayı** yaparım.

---

## 0. Sıralama neden itch.io ile başlıyor

`research/05-yayin-platformlari.md` §3: **itch.io → CrazyGames Basic
Launch → Poki**. Sebep kısıt sıkılığı: itch.io'nun teknik kısıtı yok,
anında yayınlıyor — ilk geri bildirim buradan gelir. Poki en sıkısı ve
**elle küratörlü** ("UX/his ve çekirdek döngü"ye bakıyorlar); oraya en
son, cila tamken gidilir.

**Ama teknik kısıtlar baştan Poki'ye göre kurulmuş durumda** (`base:'./'`,
16:9, ESC/boşluk, `try/catch` kayıt) — yani itch.io'ya yüklerken zaten
Poki'nin de kabul edeceği bir yapı gidiyor. Sıralama bir teknik borç
değil, geri bildirim hızı meselesi.

---

## 1. Ön kontrol — otomatik olanlar zaten geçiyor

`npm run typecheck && npm run test && npm run build && npm run guard`
dördü de yeşil (proje genelinde sürekli doğrulanıyor).

### Bugün canlı doğrulanan tek şey: derin alt klasörden servis

M7-T11'in kendi "bitmedi sayılır eğer" şartı: *"itch.io'da oyun beyaz
ekran veriyorsa (`base: './'` sorunu)."* Bu **hiç canlı test
edilmemişti** — statik olarak `vite.config.ts`'te `base: './'` yazdığı
biliniyordu ama gerçek bir sunucudan, gerçek bir derin yoldan hiç
denenmemişti. Şimdi denedim:

```
build çıktısı → yerel sunucu → /html/oyun/derin/yol/ (4 seviye iç içe)
```

| Kontrol | Sonuç |
|---|---|
| `index.html` içindeki kaynak yolu | `src="./assets/index-*.js"` — **göreli**, mutlak değil |
| JS paketi, 4 seviye derinden | 200 OK |
| Font dosyaları, 4 seviye derinden | 200 OK |
| Tarayıcı konsolu | **tamamen sessiz** |
| `<canvas>` render oldu mu | evet |
| Üretim yapısında dev kancası (`window.__game`) sızdı mı | **hayır** — doğru davranış |

itch.io tam olarak bunu yapıyor: zip'inizi kendi alt yoluna
(`html-classic.itch.zone/.../<hash>/...` gibi) açıp oradan serviyor.
**Bu test onun simülasyonu** ve geçti — `base:'./'` riski kapandı.

### Kalan kontroller — yalnız gerçek itch.io sayfasında yapılabilir

Yerel ortamda test edilemeyenler (itch.io'nun kendi CDN gecikmesi,
gerçek mobil cihaz vb.) — bunlar `M7-T11`'in kabul kriteri, siteye
yükledikten **sonra** siz veya ben kontrol ederiz:

1. Sayfa açılışından oynanabilir ana kadar **< 5 sn** (kronometreyle).
2. Harita 1'in 10 dalgası baştan sona oynanıyor, kazanma ekranı çıkıyor.
3. Tarayıcı konsolu tamamen sessiz.
4. Mobil tarayıcıda yatay modda açılıyor, yapı noktalarına dokunma çalışıyor.

---

## 2. Zip'i hazırlama — tek gerçek risk noktası

```bash
npm run build
```

`dist/` klasörü oluşuyor. **itch.io'nun beklediği şey:** zip dosyasının
**kökünde** `index.html` olması — `dist/` klasörünün kendisi değil,
**içindekiler**.

> **En sık yapılan hata budur** ve `base:'./'` kadar sessiz bir
> hata verir: `dist` klasörünü olduğu gibi zip'lerseniz itch.io
> `dist/index.html` arar ama bulamaz veya yanlış bir yoldan servis
> eder. Zip'i açtığınızda `index.html` doğrudan görünmeli, bir
> `dist` klasörünün *içinde* değil.

Windows'ta: `dist` klasörünü açın, **içindeki dosyaları seçin**
(klasörün kendisini değil), sağ tık → "Sıkıştırılmış klasöre gönder".

Güncel `dist/` içeriği (M6'nın sanat/ses varlıkları eklendikçe
büyüyecek, ama yapı aynı kalacak):

```
index.html
assets/index-<hash>.js
assets/fonts/*.woff2
```

Toplam boyut şu an **~0,4 MB** — itch.io'nun herhangi bir sınırına
yaklaşmıyor bile (Poki'nin 8 MB sınırı için tasarlandı, itch.io çok
daha gevşek).

---

## 3. itch.io'da sayfa oluşturma

Bu adımlar itch.io'nun kendi arayüzünde; tam buton adları zamanla
değişebilir, aşağıdaki **alan anlamları** stabil:

1. **Yeni proje** oluştur — başlık `Kale Nöbeti`.
2. **Kind of project: HTML**.
3. Zip dosyasını yükle (yukarıdaki, kök dizininde `index.html` olan).
4. Yüklenen zip dosyasının yanındaki **"This file will be played in the
   browser"** kutusunu işaretle — bu kutu işaretlenmezse itch.io dosyayı
   indirilecek bir eklenti olarak sunar, oynanmaz.
5. **Embed boyutu:** genişlik **1280**, yükseklik **720** —
   `CLAUDE.md`'deki mantıksal çözünürlükle birebir aynı. Farklı bir
   embed boyutu girerseniz `Scale.FIT` yine doğru orana oturtur ama
   gereksiz boşluk çıkar.
6. **"Mobile friendly"** işaretlensin — proje yatay-yalnız çalışacak
   şekilde kurulu (`CLAUDE.md` "yalnızca yatay yönlendirme").
7. **Fullscreen button**'ı açık bırakın — küçük ekranlarda 640×360
   okunurluk testi zaten geçti (`M6-T05`), tam ekran ek fayda sağlar.
8. **Kind: Free**, kategori: Strategy / Tower Defense.
9. Yayınlamadan önce **"Draft"** olarak kaydedip önizleme linkinden
   kendiniz açın — herkese açık yayınlamadan önceki son kontrol.

**"Draft" aşamasındayken de önizleme linki çalışır** — genel yayına
almadan §1'deki dört kontrolü draft linkinde yapabilirsiniz.

---

## 4. Yayından sonra

### `docs/results/M7-SONUC.md` güncellenir

Taşın kendi kuralı: sonuç dosyası "nihai paket boyutu, yükleme süresi
ve portal başvuru durumu" alanlarını zorunlu tutuyor
(`docs/results/README.md`). Yayınlandıktan sonra haber verin, ben o
alanları dolduruyorum.

### 3 kişiye oynatma (`M7-P02`)

Bu da benim yapamayacağım bir iş — gerçek insan geri bildirimi.
itch.io linkini üç kişiye gönderip şunları not alın:

- Nerede takıldılar (hangi dalga, hangi kule kararı)
- Yeneni mi kaybetti mi bitirdiler, kaç yıldızla
- Sözlü/yazılı en az bir cümlelik izlenim

Bu notlar geldiğinde `M7-SONUC.md`'ye ben işlerim.

### Sıradaki platform

itch.io'da birkaç gün durup geri bildirim toplandıktan sonra sıradaki
adım **CrazyGames Basic Launch** (`research/05` §3) — kısıtları
itch.io'dan biraz daha sıkı ama Poki kadar değil, ve oynama
süresi/dönüş metriklerini topluyor. O platformun kendi teknik
gereksinimleri (`S61` — portal SDK) ayrı bir iş; itch.io için
gerekmiyor, CrazyGames/Poki başvurusunda ele alınacak.

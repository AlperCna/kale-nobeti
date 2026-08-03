# Yol Haritası — 6 kilometre taşı

Kural: her taşın sonunda oyun oynanabilir kalır. Bir taş bitmeden sonraki
başlamaz. Her taşı Claude Code'da **plan modunda** aç, planı oku, sonra uygula.

---

## M0 — İskelet (yarım gün)

Vite + TypeScript (strict) + Phaser 3 kurulumu. 1280×720 `Scale.FIT`.
Boot → Preload → Menu → Game sahne zinciri. Boş bir yeşil ekran ve "Oyna" butonu.
`npm run dev`, `build`, `typecheck`, `test` script'leri.

**Kabul:** `npm run dev` açılıyor, menüden oyuna geçiliyor, konsol temiz.

---

## M1 — Yol ve düşman hareketi (1-2 gün)

`PathSystem`: waypoint dizisi boyunca sabit hızda ilerleme, segment sonunda
sıradaki waypoint'e yönelme. `Enemy` entity + nesne havuzu. Harita 1 için
geçici olarak renkli dikdörtgen düşmanlar ve çizilmiş yol.
Düşman kaleye varınca can eksilir, düşman havuza döner.

**Kabul:** 20 düşman aynı anda yolda akıcı ilerliyor, 60 FPS, sızan düşman
can düşürüyor.

**Tuzak:** düşmanın yolda kat ettiği mesafeyi (`pathProgress`) sakla —
`first`/`last` hedeflemesi buna bağlı olacak.

---

## M2 — Kule, mermi, hedefleme (2-3 gün)

`TowerSystem` (yapı noktasına tıkla → menü → yerleştir), `TargetingSystem`
(first/last/strongest/closest), `ProjectileSystem` (havuzlu, hedef takipli).
`combat.ts` içinde saf `applyDamage()`. Okçu ve Top kuleleri, Tier 1.
Menzil dairesi hover'da görünür.

**Kabul:** kule koyup düşman öldürebiliyorum. `applyDamage` için Vitest
testleri geçiyor (zırh, büyü direnci, %15 tabanı).

---

## M3 — Ekonomi, dalgalar, kazan/kaybet (2-3 gün)

`EconomySystem` (altın, can, kule maliyeti, %70 satış), `WaveManager`
(bütçe üreticisi + `Wave` veri şeması), hazırlık sayacı + **erken başlatma
bonusu**, **dalga telegrafı**. Harita 1'in 10 dalgası. Kazanma ve kaybetme ekranı.

**Kabul:** Harita 1 baştan sona oynanabiliyor ve bitirilebiliyor.
Bu noktadan sonra oyun "oyun".

---

## M4 — Tam kule/düşman seti + yükseltme + yetenekler (4-5 gün)

4 kule ailesi, Tier 2 ve Tier 3 dallanma. Kışla + asker + toplanma noktası.
9 düşman türü, uçan hareketi (ayrı düz hat), Şaman iyileştirmesi, Trol
yenilenmesi, Örümcek Ana bölünmesi, boss. Meteor + Takviye yetenekleri.
Kule bilgi paneli: DPS, hasar tipi, menzil, "uçana vurur mu" ikonu.

**Kabul:** karşı-oyun tablosundaki her tehdidin cevabı oyunda çalışıyor.
Yanlış kule kurmak oyunu kilitlemiyor, sadece verimsizleştiriyor.

**Tuzak:** bilgi eksikliği türün 1 numaralı şikâyeti. Panel bu taşta yazılır,
sonraya bırakılmaz.

---

## M5 — Sanat, juice, ses (5-7 gün)

Atlas üretimi (TexturePacker veya `free-tex-packer`), 3 harita arka planı,
kule/düşman sprite'ları, tezhip çerçeveli HUD. `fx/` modülleri:
ScreenShake, HitStop, Particles, DamageText, altın uçuşu. Tüm ses efektleri
ve 2 müzik parçası. Ayarlar menüsü (ses, sarsıntı, efekt yoğunluğu).

**Kabul:** ses ve efektler kapalıyken de oyun okunur; açıkken vuruşlar
tatmin edici. Paket hâlâ 8 MB altında.

---

## M6 — Harita 2-3, denge, cila, yayın (5-7 gün)

Harita 2 (Y ayrımı) ve 3 (iki giriş). Tam denge geçişi: her dalga için
`toplam HP < D * L / v` sağlaması. `SaveSystem` (açılan harita, ayarlar).
Seviye seçim ekranı. 3 yıldız derecelendirmesi (kalan cana göre).
Lighthouse/boyut kontrolü, itch.io yüklemesi, sonra portal başvurusu.

**Kabul:** 3 harita da bitirilebiliyor. İlk yükleme < 3 sn, paket < 8 MB.
Tek tıkla oyun başlıyor.

---

## Denge geçişi kontrol listesi (M6)

- [ ] Her harita ilk denemede zor ama ikinci-üçüncü denemede geçilebiliyor mu?
- [ ] Tek bir kule tipiyle spam yaparak geçilebiliyor mu? (Geçilebiliyorsa
      o kule aşırı güçlü veya yapı noktası sayısı fazla.)
- [ ] Yükseltmek, aynı parayla yeni kule kurmaktan verimli mi? (Değilse
      kule spam'i oyunu öldürür.)
- [ ] Hiç kullanılmayan kule dalı var mı? Varsa rolü belirsiz demektir.
- [ ] Boss dalgası, önceki dalgadan belirgin şekilde farklı mı hissettiriyor?
- [ ] 3 kişiye oynattın mı ve nerede sıkıldıklarını not aldın mı?

---

## Claude Code komut şablonu

Her taşın başında:

```
docs/GAME-DESIGN.md içindeki §<bölüm> ve docs/ROADMAP.md içindeki M<n>
bölümünü oku. Plan modunda kal. Bu taşı en fazla 5 adıma böl ve planı göster.
Onaylamadan kod yazma.
```

Uygulama sırasında:

```
Birinci adımı uygula, sonra dur ve diff'i göster. Devam demeden ilerleme.
```

Taş sonunda:

```
npm run typecheck && npm run test && npm run build çalıştır.
Paket boyutunu raporla. Sonra bu taşta verilen kararlardan CLAUDE.md'ye
eklenmesi gerekenleri öner (ekleme yapma, öner).
```

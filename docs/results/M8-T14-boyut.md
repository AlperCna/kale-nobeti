# `M8-T14` — paket boyutu: önce / sonra

Ölçüm aracı `npm run build` → `scripts/report-size.mjs`. Bütün sayılar
**tartıldı**, hiçbiri tahmin değil.

## Özet

| | Önce | Sonra | Fark |
|---|---|---|---|
| **İlk indirme** | **1,10 MB** | **0,93 MB** | **−0,17 MB (−%15,5)** |
| js/html/css (gzip) | 0,34 MB | 0,31 MB | −0,03 MB |
| varlıklar | 0,76 MB | 0,62 MB | −0,14 MB |
| toplam (bütün haritalar dahil) | 5,22 MB | 5,19 MB | −0,03 MB |

Poki sınırı 8 MB; ilk indirme artık sınırın **%12'si**.

## 1. Geç çalan ses efektleri tembel yüklemeye alındı

On iki ses efektinin dördü oyunun ilk dakikasında **hiç** çalmıyor:

| Ses | İlk çaldığı an | Boyut |
|---|---|---|
| `boss_intro` | dalga 10 | 40,2 KB |
| `defeat` | harita kaybedilince | 41,5 KB |
| `victory` | harita kazanılınca | 37,7 KB |
| `tower_upgrade` | ilk yükseltme | 24,4 KB |
| **toplam** | | **143,8 KB** |

Dosyalar `public/assets/lazy/sfx/` altına taşındı ve `queueBackground`
(ilk dalga bitince, müzikle aynı aşama) yüklüyor. `report-size.mjs`'in
"ilk indirme" hesabı `assets/lazy/` klasörünü zaten hariç tutuyor, yani
ölçüm kendiliğinden doğru çıkıyor.

**Risk yok:** yükleme gecikirse `SoundSystem.#cal` eksik anahtarı sessizce
atlıyor (`Y14` deseni) — en kötü durum bir sesin kaçırılması.

**Ölçülen:** varlıklar 0,76 → 0,62 MB; ilk indirme 1,10 → **0,97 MB**.

**Canlı doğrulandı:** harita açıldığında `shot_okcu` önbellekte var,
`victory`/`boss_intro`/`tower_upgrade` **yok**; dalga 1 bitince üçü de
geliyor.

## 2. Phaser'ın Matter'sız yapımı

`Y11` "Phaser özel yapımı üret" diyordu (webpack, Phaser deposundan).
**O yapılmadı.** Onun yerine ölçülmüş ve risksiz alt kümesi alındı:
Phaser'ın kendi hazır giriş noktalarından biri Matter fiziği içermiyor.

Tartılan dosyalar:

```
node_modules/phaser/dist/phaser.min.js                 1.196.122 bayt
node_modules/phaser/dist/phaser-arcade-physics.min.js  1.086.308 bayt   −%9,2
```

`vite.config.ts` içinde tek satırlık bir `resolve.alias` ile bağlandı;
kaynak dosyaların hiçbirine dokunulmadı.

**Neden güvenli:** proje ne Matter ne Arcade fizik kullanıyor
(`CLAUDE.md` Teknoloji: *"Arcade fizik kullanılmıyor"*), ve bu yapımda
Tilemaps ile **bütün oyun nesneleri** (`BitmapText`, `Container`,
`TileSprite`, `Group`, `Particles`) duruyor — `Y11`'in "`phaser-core`
olduğu gibi kullanılamaz" bulgusu hâlâ geçerli, o yol için gerçek bir
özel yapım gerekiyor.

**Ölçülen:** paket 1.285,3 → **1.177,7 KB** (gzip 357,8 → **324,8 KB**).

**Canlı doğrulandı:** menü → seviye seçim → harita → kule + kışla + asker
+ dalga akışı, `dev` sayaçlarıyla birlikte sorunsuz.

## Yapılmayan ve neden

**Phaser özel yapımı (webpack, kaynak ağacından).** `Y11`'in tahmini
ek olarak ~250-350 KB ham kazanç. Yapılmadı çünkü:

- Phaser deposunun kendi webpack yapılandırmasını projeye taşımayı ve
  altı modülü (BitmapText, Container, Rectangle/Arc, TileSprite, Group,
  Particles) elle geri eklemeyi gerektiriyor;
- yanlış kesilen bir modül **çalışma zamanında** patlıyor, derlemede
  değil — yani hatayı yalnız o kod yolu oynanınca görüyorsunuz;
- kazanç hâlâ **tahmin**; yukarıdaki iki adım ölçülmüş %15,5'i zaten
  getirdi ve Poki sınırının %12'sindeyiz.

Kayıt olarak duruyor: `Y11` açık, ama artık **ölçülmüş bir taban**
(0,93 MB) ve ölçülmüş bir ara kazanç (%9,2) ile.

**`Y02` adım 3** — `Y10`'un CPU kısıtlı ölçümüne bağlı; o ölçüm
kullanıcının DevTools'unu gerektiriyor ve hâlâ alınmadı.

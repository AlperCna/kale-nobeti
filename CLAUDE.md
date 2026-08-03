# Kale Nöbeti — Proje Kuralları

Fantastik ortaçağ temalı, tarayıcıda çalışan tower defense oyunu.
Model: Kingdom Rush (sabit yol + belirli yapı noktaları).
Hedef: 3 harita × 10 dalga, 4 kule ailesi, 2 aktif yetenek.

## TIER 1 — Pazarlıksız kurallar

1. **Denge verisi asla koda gömülmez.** Tüm sayısal değerler `src/data/*.ts`
   içindeki tipli sabitlerde durur. Bir kulenin hasarını değiştirmek için
   sistem dosyalarına dokunulmaz.
2. **İlk yüklenen paket 8 MB'ı geçemez.** Poki limiti bu. Her yeni varlık
   eklendiğinde `npm run build` çıktısının boyutu kontrol edilir.
3. **Nesne havuzu zorunlu.** Mermi, düşman, hasar sayısı ve parçacıklar
   `Phaser.GameObjects.Group` ile havuzlanır. Oyun içinde asla `new` ile
   mermi yaratılmaz — çok kule konunca takılma en sık görülen kullanıcı şikâyeti.
4. **Yol bulma dinamik değildir.** Yol sabit waypoint dizisidir. A* veya
   flow field eklenmez. Kuleler yolu değiştiremez.
5. **`any` tipi kullanılmaz.** TypeScript strict modda çalışır.
6. **Erişilebilirlik tabanı:** ekran sarsıntısı ve parçacık yoğunluğu
   ayarlardan kapatılabilir olmalı. `prefers-reduced-motion` saygı görür.

## TIER 2 — Çalışma düzeni

- Önemsiz olmayan her iş için önce plan modu. Plan tek seferde en fazla
  bir kilometre taşını kapsar (bkz. `docs/ROADMAP.md`).
- Her kilometre taşı sonunda oyun **oynanabilir** kalmalı. Yarım bırakılmış
  sistem merge edilmez.
- Bir sistem yazılmadan önce `docs/GAME-DESIGN.md` içindeki ilgili bölüm okunur.
- Yeni bir sayı uydurma. Tasarım dokümanında yoksa sor.

## Teknoloji

- Phaser 3 + TypeScript (strict) + Vite
- Mantıksal çözünürlük 1280×720, `Scale.FIT` + `CENTER_BOTH`, letterbox
- Yalnızca yatay yönlendirme (mobilde çevirme uyarısı platform tarafından yapılır)
- Ses: Phaser'ın kendi ses sistemi, `.m4a` + `.ogg` çifti
- Kayıt: `localStorage`, tek anahtar `kale-nobeti-save-v1`
- Harici bağımlılık eklemeden önce sor

## Klasör yapısı

```
src/
  main.ts                 Phaser config, sahne kaydı
  scenes/                 Boot, Preload, Menu, LevelSelect, Game, Hud, GameOver
  systems/                PathSystem, WaveManager, TowerSystem, TargetingSystem,
                          ProjectileSystem, EconomySystem, AbilitySystem, SaveSystem
  entities/               Enemy, Tower, Soldier, Projectile
  fx/                     ScreenShake, HitStop, Particles, DamageText
  data/                   towers.ts, enemies.ts, waves.ts, maps.ts, balance.ts
  types/                  ortak arayüzler
  util/                   math, pool, easing
public/assets/            atlas.png, atlas.json, audio/, fonts/
```

## Mimari kurallar

- Sahneler ince olur. Oyun mantığı `systems/` içinde yaşar.
- `Game` sahnesi ve `Hud` sahnesi ayrıdır; HUD, `Game`'in üstünde paralel çalışır.
- Sistemler birbirini doğrudan çağırmaz, `EventBus` (Phaser events) üzerinden
  haberleşir. Örnek olaylar: `enemy:killed`, `wave:started`, `gold:changed`,
  `life:lost`, `tower:placed`.
- `Enemy` kendi hasarını hesaplamaz; `combat.ts` içindeki saf `applyDamage()`
  fonksiyonu kullanılır (test edilebilir olsun diye).
- Harita verisi (`maps.ts`) waypoint koordinatları + yapı noktası koordinatları
  içerir. Görsel arka plan tek PNG'dir, tilemap kullanılmaz.

## Test

- Saf mantık fonksiyonları için Vitest: `applyDamage`, dalga bütçesi üretici,
  ekonomi hesapları, hedefleme seçicileri.
- Görsel/sahne testi yazılmaz.
- Bir kilometre taşı bitince: `npm run typecheck && npm run test && npm run build`

## Görsel yön

Tam açıklama `docs/GAME-DESIGN.md` → "Sanat yönü". Özet:
tezhipli el yazması estetiği. Mürekkep mavisi zemin, parşömen UI, altın varak
vurgular. Kingdom Rush'ın parlak çizgi film paletine kaçılmaz.

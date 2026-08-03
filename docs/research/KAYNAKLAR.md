# Kaynaklar

Araştırma tarihi: 2026-08-03

Sınıflandırma:
**[D]** birincil/resmi kaynak — platform dokümanı, motor dokümanı, geliştirici röportajı
**[T]** ikincil kaynak — topluluk analizi, oyuncu geri bildirimi, blog
**[H]** bu projenin kendi sayılarıyla yapılmış hesap (kaynak yok, doğrulanabilir aritmetik)

---

## Phaser 3 — motor

- **[D]** [Text | Phaser Help](https://docs.phaser.io/phaser/concepts/gameobjects/text) — `Text` içeriği değiştiğinde canvas yeniden üretimi ve GPU yüklemesi
- **[D]** [Bitmap Text | Phaser Help](https://docs.phaser.io/phaser/concepts/gameobjects/bitmap-text) — WebGL'de `BitmapText` hız avantajı, güncelleme cezası olmaması
- **[D]** [BitmapText API](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.BitmapText.html) — esneklik/hız takası
- **[D]** [How to add time scale that affects tweens, animations and so on — Phaser Discourse](https://phaser.discourse.group/t/how-to-add-time-scale-that-affects-tweens-animations-and-so-on-solved/1357) — dört ayrı `timeScale` özelliği, `time.timeScale`'in yalnız zamanlayıcıları etkilemesi, parçacık yayıcılarının ayrı gezilmesi
- **[D]** [ParticleEmitter | Phaser Help](https://docs.phaser.io/api-documentation/class/gameobjects-particles-particleemitter) — parçacıkların yayıcı tarafından havuzlanması
- **[T]** [Phaser Performance Optimization Guide](https://generalistprogrammer.com/tutorials/phaser-performance-optimization-guide) — atlas/çizim çağrısı, havuzlama, 16.67 ms kare bütçesi
- **[T]** [How I optimized my Phaser 3 action game — in 2025](https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025) — eski cihazlarda WebGL→Canvas geçişiyle %30 kazanç
- **[T]** [Multi Texture Batching | Phaser](https://phaser.io/tutorials/advanced-rendering-tutorial/part2) — v3.50+ tipik 16 doku tek çizim çağrısı
- **[T]** [Game Optimization with Basic Object Pools in Phaser 3 — Ourcade](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/) — `Group`'ların havuz olarak kullanımı
- **[D]** [phaser3-webfont-loader](https://github.com/cloakedninjas/phaser3-webfont-loader) — `@font-face` + `FontFaceSet` ile yükleme
- **[D]** [Phaser 3 WebFontFile gist](https://gist.github.com/supertommy/bc728957ff7dcb8016da68b04d3a2768) — `Phaser.Loader.File` alt sınıfı yaklaşımı
- **[T]** [Web Font preloading for HTML5 games — Mozilla Hacks](https://hacks.mozilla.org/2016/06/webfont-preloading-for-html5-games/) — bitmap font vs vektör font ayrımı, FOUT

## Tower defense — denge ve matematik

- **[D]** [TDS Tower Placement Theory — Dungeonpath](https://dungeonpath.com/posts/tower-defense-simulator/tower-placement-theory/) — kapsama bölgeleri (%60/%80/%95), "2 karo kuralı", ön/arka yerleşim 2 sn vs 8-12 sn, %44 hasar farkı, virajlarda %15-20 dönüş vergisi, `ToplamHasar = DPS × MenzildeSüre`
- **[T]** [Tower Defense Proof Part 1: Excel — Alex Loughran](https://alexloughran.wordpress.com/2014/09/13/tower-defense-proof-part-1-excel/) — `Quotient(EtkiAlanı/Hız, Bekleme) × HasarPerAtış`, üçlü grupta %100/%75/%50 odaklanma modeli, ekonomi modellemesinin eksikliği itirafı
- **[T]** [How To: Calculate DPS and Create Balanced Towers — TDS Fandom](https://tds.fandom.com/f/p/4400000000000204994) — `(Hasar × Seri) / (Bekleme + Atış×Seri)`
- **[T]** [Formula for damage calibration RTS tower defence — GameDev.net](https://gamedev.net/forums/topic/638057-formula-for-damage-calibration-rts-tower-defence-game/) — her kulenin DPS'ini kapsadığı alan oranıyla çarpma, teorik tavan ile toplam HP arasında pay bırakma
- **[T]** [Dynamic Difficulty Adjustment in Tower Defence (PDF)](https://www.sciencedirect.com/science/article/pii/S187705091502092X/pdf) — üç zorluk ölçeği: durum puanı, altın puanı, doğum puanı
- **[T]** [Procedural generation of tower defense levels (PDF)](https://www.diva-portal.org/smash/get/diva2:1442180/FULLTEXT01.pdf)
- **[T]** [A NEAT Approach to Wave Generation in Tower Defense Games (PDF)](https://www.open-access.bcu.ac.uk/13568/1/A_NEAT_Approach_to_Wave_Generation_in_Tower_Defense_Games___IMET.pdf) — dalga bütçesi yaklaşımı *(erişilemedi, önceki araştırmadan aktarıldı)*
- **[T]** [Wave & Spawn System — CraftMyGame](https://craftmygame.com/features/wave-spawn) — `beklemeArası = sabit / dalgaBoyu`, `dalgaSonrası = sabit × dalgaBoyu`
- **[T]** [tower-defense Skill — Claude Skills Hub](https://claudeskills.info/skills/gamedev-skills/awesome-gamedev-agent-skills/tower-defense/) — üstel zorluk eğrisi, zirve/nefes temposu, HP eğrisinin gelir eğrisine karşı ayarlanması, dalga patlama kalıpları

## Tower defense — mekanik tasarım

- **[D]** [Militia Barracks — Kingdom Rush Wiki](https://kingdomrushtd.fandom.com/wiki/Militia_Barracks) — bire bir kilitlenme, sayı üstünlüğünde tek askerin hasar alması
- **[D]** [Knights Barracks — Kingdom Rush Wiki](https://kingdomrushtd.fandom.com/wiki/Knights_Barracks) — kilit kırılma koşulları, düşman sayısı askeri aşınca geçiş
- **[D]** [Defender Barracks — Kingdom Rush Wiki](https://kingdomrushtd.fandom.com/wiki/Defender_Barracks) — toplanma noktası, toplanma menzili, iki kışlanın aynı noktaya toplanması
- **[D]** [Paladin Barracks Skills Breakdown — Ironhide resmi destek](https://support.ironhidegames.com/support/solutions/articles/4000223657-paladin-barracks-skills-breakdown-defend-the-lines-in-kingdom-rush-battles) — iki asker doğurma, engelleme ve yakın dövüş
- **[D]** [Kingdom Rush — the wonderful Campaign level design — Game Developer](https://www.gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design) — Stratejik Nokta kısıtı, spam'e karşı yer kıtlığı, ayrık yollar, seviye 5 nefes seviyesi, mekanik erken/uç örnek geç tanıtımı
- **[T]** [Defense Grid, a Top-tier Tower Defense Game — The Gemsbok](https://thegemsbok.com/art-reviews-and-articles/mid-week-mission-defense-grid-awakening-hidden-path/) — hava birimi ikilemi, seviye başında iz çizgisiyle uçuş yolunun gösterilmesi
- **[T]** [Flying — Tower Defense Simulator Wiki](https://tds.fandom.com/wiki/Flying) — uçanların yol üstünde ilerlemesi, tespit gereksinimi
- **[T]** [More towers vs. upgrading towers — Defense Grid 2 Steam tartışması](https://steamcommunity.com/app/221540/discussions/0/522728814563637410/) — yükseltmenin "sahte ekonomi" olabilmesi, yer kıtlığı istisnası
- **[T]** [Tower Defense Economy Pressure Tier List — TowerWard](https://towerward.com/blog/tower-defense-economy-pressure-tier-list) — kötü harcamanın cezalandırılması, breakpoint gecikmesi

## Yayın platformları

- **[D]** [Requirements — Poki Documentation](https://sdk.poki.com/new-requirements) — 8 MB ilk indirme hedefi, 16:9 ve 640×360/836×470/1031×580, ESC/boşluk duraklatma, gizli sekme + `try/catch` localStorage, SDK olay sözleşmesi, yasaklar
- **[D]** [Working With Poki — Poki Documentation](https://sdk.poki.com/index.html)
- **[T]** [Poki for Developers — Easy access](https://developers.poki.com/guide/easy-access) — en küçük ilk oynanabilir parça, gerisini sonra yükleme
- **[D]** [Technical — CrazyGames Documentation](https://docs.crazygames.com/requirements/technical/) — 250 MB toplam, 1500 dosya, ≤50 MB ilk indirme, ≤20 MB mobil ana sayfa, ≤20 sn oynanışa erişim, göreli yol zorunluluğu, Chrome/Edge/Safari, 4 GB Chromebook, `-webkit-user-select`
- **[D]** [Data — CrazyGames Documentation](https://docs.crazygames.com/sdk/data/) — localStorage ile aynı API, giriş sonrası senkron, 1 sn (bazen 30 sn) debounce, 1 MB sınırı
- **[D]** [Introduction — CrazyGames Documentation](https://docs.crazygames.com/requirements/intro/)
- **[T]** [How to Submit an HTML5 Game to Web Game Platforms — Bounty Board](https://www.bountyboard.gg/blog/how-to-submit-an-html5-game-to-web-platforms) — Poki için ilk indirme 5 MB / toplam 8 MB aktarımı, CrazyGames SDK'sız 50 MB kuralı
- **[T]** [CrazyGames Developer Guide: Publish and Earn (2026) — Cinevva](https://app.cinevva.com/guides/publish-game-crazygames) — %60 reklam / %70 satın alma payı (2026 GameMaker jam şartlarından), SDK + 2 ay münhasırlıkla %50 artış

## Varlıklar ve formatlar

- **[T]** [AVIF vs WebP in 2026: which to serve — modpagespeed](https://modpagespeed.com/blog/avif-vs-webp-2026/) — AVIF boyutta üstün, kodlaması yavaş; WebP kodlaması hâlâ çok daha hızlı
- **[T]** [AVIF Format Adoption Guide and Browser Compatibility 2026 — Orquitool](https://orquitool.com/en/blog/avif-format-adoption-browser-compatibility-2026) — Chrome 85+, Firefox 93+, Safari 16+, Edge 121+
- **[T]** [Web-based Game Development Guide 2026 — Nipsapp](https://nipsapp.com/web-based-game-development-guide/) — WebP ile %60-80 boyut düşüşü
- **[T]** [WebP and AVIF for the web — ICS MEDIA](https://ics.media/en/entry/201001/)

## Sanat yönü

- **[D]** [Deep Dive: Behind the evocative medieval manuscript art of Pentiment — Game Developer](https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment) — renksiz kaba taslak → motorda oynama → nihai çizim; 157 karakterin kademeli tamamlanması; greybox standardı
- **[D]** [Pentiment — Obsidian Art Director interview — GamesHub](https://www.gameshub.com/news/features/pentiment-interview-xbox-obsidian-entertainment-hannah-kennedy-art-director-34642/) — zirvede ~13 kişilik ekip, Cartoon Saloon referansı
- **[T]** [How Obsidian brought the past to life in Pentiment — Gamereactor](https://www.gamereactor.eu/how-obsidan-brought-the-past-to-life-in-pentiment-1221583/)
- **[T]** [The Best Games With Stained Glass Art Styles — TheGamer](https://www.thegamer.com/best-games-stained-glass/) — Gleamlight, Glass Masquerade, Saga of Sins
- **[T]** [Inkulinati — Medieval Manuscripts Come to Life — DailyArt Magazine](https://www.dailyartmagazine.com/inkulinati-video-game/)
- **[T]** [Medieval Manuscripts Take Center Stage — Medievalists.net](https://www.medievalists.net/2024/02/inkulinati/)

## Araçlar (araştırma sırasında not edildi)

- [SnowB Bitmap Font Generator](https://snowb.org/) — tarayıcıda bitmap font üretimi, ücretsiz
- [free-tex-packer](http://free-tex-packer.com/) — ücretsiz atlas paketleyici, Phaser formatı destekli
- [Kenney — Tower Defense (Top-Down)](https://www.kenney.nl/assets/tower-defense-top-down) — CC0, ~300 varlık

---

## Erişilemeyen kaynaklar

- `open-access.bcu.ac.uk` (NEAT dalga üretimi PDF) — bağlantı zaman aşımı.
  Dalga bütçesi yaklaşımı için ikincil kaynaklar kullanıldı. Bütçe formülünün
  kendisi (`10 × 1.20^(n−1)`) zaten `GAME-DESIGN.md`'de mevcut ve bu
  araştırmada aritmetik olarak doğrulandı.

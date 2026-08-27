# Y06 · Her ölümde iki ses üst üste biniyor

| | |
|---|---|
| **Tür** | Yapısal — ses tasarımı |
| **Önem** | Orta. Yoğun dalgada duyulur biçimde bozucu |
| **Emek** | Küçük |
| **Risk** | Düşük |
| **Dokunulan** | `src/fx/SoundSystem.ts` |
| **İlgili** | `docs/plan/M6-ses-uretim-brifi.md` · `RISKS.md` R8 |

---

## Bulgu

Bir düşman öldüğünde **iki ayrı ses** aynı anda çalıyor: `enemy_death`
ve `gold`. İkisi de ~1,5 saniye. Tepe dalgada saniyede birkaç ölüm
olduğunda bu, çakışan seslerden oluşan bir gürültü katmanı üretiyor.

## Kanıt

```ts
// src/fx/SoundSystem.ts:38-47
bus.on('enemy:killed', () => this.#cal('enemy_death'));
...
bus.on('gold:changed', ({ total }) => {
  if (this.#sonAltin >= 0 && total > this.#sonAltin) this.#cal('gold');
  this.#sonAltin = total;
});
```

`GameScene.#hasarUygula` bu ikisini **aynı karede, art arda** tetikliyor:

```ts
// src/scenes/GameScene.ts:583-585
e.alive = false;
if (e.def !== null) this.#eco?.award(e.def);        // → gold:changed
this.bus.emit('enemy:killed', { id: e.id, ... });   // → enemy_death
```

`award()` altını artırıyor → `gold:changed` yayılıyor → `total > sonAltin`
→ `gold` çalıyor. Hemen ardından `enemy:killed` → `enemy_death` çalıyor.

**Altın vermeyen düşman yok** (Örümcek Yavrusu hariç — `altın 0`, S38).
Yani pratikte **her ölüm iki ses**.

## Süreler

MP4 `mvhd` atomundan ölçüldü:

| Ses | Süre | Boyut |
|---|---|---|
| `enemy_death.m4a` | 1,5 sn | 24 KB |
| `gold.m4a` | 1,5 sn | 25 KB |

1,5 saniyelik iki ses, saniyede 2-4 ölüm olan bir dalgada **6-12 örtüşen
ses örneği** demek.

## Neden önemli

**1. Ses tasarımında "her olaya bir ses" bir hata desenidir.** Tower
defense'te ölüm, oyunun en sık olayı. Her birine iki ses vermek, o
sesleri **bilgi taşımaz** hâle getiriyor — sürekli çalan bir ses,
dikkat çekmiyor.

**2. Altın sesi asıl işini yapamıyor.** `gold` sesinin anlamı
"altın kazandın". Ama ölümle aynı anda çaldığı için oyuncu ikisini
ayırt edemiyor. **Altın kazanmanın gerçekten haber değeri taşıdığı an**
— dalga sonu bonusu (`30 + 5n`, §6) — kaybolup gidiyor.

**3. Web Audio ses sınırları.** Aynı örneğin onlarca kopyası aynı anda
çalınca toplam genlik doyuma gidiyor ve kırpılma (clipping) duyulabiliyor.
Phaser bunu kendiliğinden sınırlamıyor.

**4. R8 (küratörlük).** Ses karmaşası, "cila" değerlendirmesinde
görsel karmaşadan daha hızlı fark ediliyor.

## Ek bulgu: ses açma/kapama ikili

`SoundSystem.#cal` koşulsuz çalıyor:

```ts
#cal(anahtar: string): void {
  this.#scene.sound.play(anahtar, { rate: rastgeleHiz() });
}
```

Susturma yalnız `this.sound.mute` ile, yani **hep ya da hiç**. Ayrı
müzik/efekt seviyesi yok, ses seviyesi kaydırıcısı yok
(`Settings.SettingsState`: `sound: boolean`). Menü müziği
`volume: 0.5` ile sabit kodlanmış (`MenuScene.ts:39`).

Bu ayrı bir iş ama aynı dosyaya dokunuyor — birlikte planlanmalı.
İlgili: [Y04](Y04-ses-tercihi-acilista-uygulanmiyor.md) (tercih
açılışta uygulanmıyor).

## Seçenekler

### (a) `gold` sesini ölümden ayır

Öldürme altınında **ses çalma**; `gold` sesini yalnız:
- dalga sonu bonusunda
- (belki) yetenek/kule satışında

- ✅ İki satır
- ✅ Altın sesi anlam kazanıyor
- ⚠️ `gold:changed` olayı kaynağı ayırt etmiyor. Olaya bir `reason`
  alanı (`'kill' | 'waveBonus' | 'sell'`) eklenmeli — `types/events.ts`
  değişikliği, `EconomySystem`'in yayın yerleri güncellenmeli.
  Küçük ama tek satır değil.

### (b) Ölüm sesini kısıtla (throttle)

`enemy_death` en fazla her N ms'de bir çalar (ör. 80 ms), aradakiler
düşer.

- ✅ Yoğunlukta doyum yok
- ✅ Tek yerde, `#cal`'ın üstünde bir zaman damgası kontrolü
- ⚠️ Kısıtlama **duvar saatiyle mi, oyun saatiyle mi?** 2× hızda ölümler
  iki kat sık geliyor; duvar saatiyle kısıtlanırsa 2×'te daha çok ses
  düşer. Ses bir efekt, oyun zamanına bağlanması **gerekmiyor** —
  duvar saati doğru seçim, ama bilinçli olarak seçilmeli ve yazılmalı.
- ⚠️ Kısıtlama süresi bir sayı; **`data/` altına konmalı**
  (TIER 1 kural 1: denge verisi koda gömülmez — bu bir denge sayısı
  değil ama aynı disiplin `balance.ts`/`audio.ts` için geçerli)

### (c) Eşzamanlı ses sayısını sınırla (voice limiting)

Her ses anahtarı için en fazla K eşzamanlı örnek; aşarsa en eskisi
kesilir.

- ✅ Genel çözüm, bütün seslere uygulanıyor
- ✅ Doyum sorununu kökten çözüyor
- ⚠️ Phaser'ın `sound.getAll(key)` ile yapılabiliyor ama her çalışta
  liste taraması demek
- ⚠️ (b)'den daha karmaşık, kazancı çok daha büyük değil

### (d) Ses tasarımını değiştir — kısa "vuruş" sesi

`enemy_death` 1,5 sn yerine ~0,3 sn'lik kuru bir ses olsa çakışma
sorunu büyük ölçüde kendiliğinden çözülür.

- ✅ En doğru çözüm ses tasarımı açısından
- ❌ Yeni üretim gerekiyor (`assets-src/audio/enemy_death.wav` yeniden)
- ⚠️ 1,5 sn'lik bir ölüm sesi zaten uzun; brifin gözden geçirilmesi
  gereken bir kararı olabilir

## Öneri

**(a) + (b) birlikte.**

1. `gold:changed` olayına `reason` alanı ekle; `SoundSystem` yalnız
   `'waveBonus'` için `gold` çalsın. Öldürme altını sessiz —
   görsel karşılığı zaten var ([altın uçuşu](../../results/M6-SONUC.md),
   `GoldFlight`), ses tekrarına gerek yok.
2. `enemy_death`'e ~80 ms kısıtlama koy, süreyi `data/` altına yaz.

(d) ayrı bir üretim işi olarak not edilsin; (a)+(b) onsuz da yeterli.

Ses seviyesi ayrıntılandırması (müzik/efekt ayrı) **Y04 ile aynı işte**
yapılmalı — `Settings` zaten o iş için `BootScene`'e taşınıyor.

## Doğrulama

1. Tepe dalgayı 1× ve 2× hızda dinle — çakışma/doyum yok.
2. Dalga sonu bonusunda `gold` sesi **duyuluyor** ve ayırt edilebiliyor.
3. Öldürmede `gold` sesi **çalmıyor**.
4. Kule satışında ne olduğu bilinçli bir karar olmalı ve yazılmalı.
5. Ses **Kapalı** iken hiçbir ses çıkmıyor (Y04 düzeltmesiyle birlikte,
   menü dahil).
6. `npm run test` — `EconomySystem` testleri `reason` alanı eklenince
   güncellenmeli; olay sözleşmesi değişikliği `types/events.ts`'te
   görünmeli.
7. Kısıtlama süresi `data/` altında, koda gömülü değil.

## Bitmedi sayılır eğer

- Öldürmede hâlâ iki ses çalıyorsa.
- Kısıtlama süresi koda gömülüyse.
- `gold:changed` tüketicilerinden biri `reason` eklendikten sonra
  kırıldıysa (`HudReadout`, `EconomySystem` testleri).
- Dalga sonu bonusu sesi kaybolduysa.

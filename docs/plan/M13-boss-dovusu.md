# M13 — Boss dövüşü altı kez aynı

> **Durum:** BİTTİ (üç fazın üçü). `M12` içerik ekledi; bu taş
> **finali** düzeltti: altı haritanın altısında aynı olan boss artık
> harita 6'da bir verb taşıyor.

## Neden bu taş

Her haritanın onuncu dalgası boss dövüşü — yani oyuncunun **her
haritada gördüğü doruk nokta**. Bugün altı haritanın altısında da aynı
düşman var:

```ts
// data/enemies.ts
if (id === 'ogreSef') {
  const boss = bossFor(map);                       // aynı tanım, farklı HP/zırh
  return map.id === 'kadim-harabe'
    ? { ...boss, ability: KADIM_HARABE_EVRE2 }     // TEK istisna
    : boss;
}
```

Değişen tek şey **sayılar**: zırh 10 → 5 → 2 ve HP 700 → 2778. Harita
5'in ikinci evresi (`M10-T03`) dışında hiçbir boss bir şey *yapmıyor*.
En yeni harita olan 6'nın finali, altı finalin en düzü.

`M10-T03`'ün kaydettiği kusurun aynısı: *"harita 4 ve 5 sıfır yeni
mekanik tanıtıyordu."* O zaman düşman kadrosu için düzeltildi; boss
için hiç bakılmadı.

## Seçilen verb: **çağırma**

Boss canının her `hpStep` oranını kaybettiğinde yandaş doğuruyor.

Seçilme gerekçeleri:

1. **Var olan makine yetiyor.** `EnemyAbilitySystem.splitOnDeath` zaten
   havuzdan düşman alıp annenin yol ilerlemesini devrediyor; çağırma
   aynı üç satır, farklı tetikleyici. Yeni sanat da istemiyor.
2. **Durum tutmuyor — cana bağlı.** `enrage` gibi eşiğe bağlanıyor:
   `summonsDone` tek bir tam sayı ve havuza dönerken `0`'a düşüyor.
   Zamanlayıcı tutulsaydı `GameClock` ve havuz sıfırlaması iki ayrı
   tuzak açardı (TIER 1 kural 3 ve 8).
3. **Dramatik ve okunur:** oyuncu boss'u her dilimlediğinde ekrana
   yandaş geliyor. Bilgi renge değil **olaya** bağlı (kural 6).
4. **Ölü bir seçeneğe iş veriyor.** `S96`: Takviye artık hiçbir
   haritada Meteor'u geçmiyor. Çağıran boss yandaşları **engellenecek**
   gövdeler üretiyor — Takviye'nin tam işi. Faz 1 bunu ölçecek; hipotez
   doğrulanmazsa kaydedilir, uydurulmaz.

---

## Fazlar

### Faz 1 — `summon` verb'ü *(≈0,5 gün · risk ORTA — havuz ve sıfırlama)*

- `EnemyAbility`'ye `{ kind: 'summon', childId, count, hpStep }`.
- `EnemyState.summonsDone: number`, `resetEnemyState`'te `0`.
- `EnemyAbilitySystem.update` içinde: hedef sayı
  `floor((1 − hp/maxHp) / hpStep)`; `summonsDone` ondan küçükse doğur
  ve artır. Havuz doluysa **kısılıyor**, `new` yok.
- Ölçüm: çağıran boss Takviye'ye bir senaryo kazandırıyor mu (S96).

**Kabul:** boss canı düştükçe yandaş doğuyor, havuza dönen boss
`summonsDone = 0` ile geliyor; `waveSim` ile oyun aynı sonucu veriyor.

> **BİTTİ.** `systems/cagirma.test.ts` altı sözleşmeyi bağlıyor: eşik
> sayımı (%75/%50/%25), tek karede iki eşik (Meteor 180 gerçek hasar
> veriyor), iyileşen boss'un geri saymaması, havuz doluyken kısılma ve
> havuza dönüşte `summonsDone = 0`.
>
> **Hipotez ÇÜRÜDÜ.** Çağırmanın Takviye'ye senaryo kazandıracağı
> düşünülmüştü; ölçüm tersini söyledi (Meteor 10, Takviye 12). Üstelik
> S96 zaten kapanmış: **düz** bossla harita 6'da Takviye Meteor'u
> yeniyor (9'a 11) — senaryoyu kadro veriyor, boss değil.

### Faz 2 — Harita 6'nın finali *(≈0,5 gün · risk ORTA — denge)*

- Harita 6 boss'u çağıran boss oluyor; sayılar taranarak seçiliyor.
- Rampa ölçütleri korunuyor: monoton · 1-3 Zor'da < 12 · 4-6 ≥ 12 ·
  hepsi < 20 · Kolay ≤ 10. Gerekirse harita 6'nın çarpanı yeniden
  türetilir (boss HP'si tavana bağlı, çağırma tavanı değiştirmiyor —
  ama sızıntıyı değiştiriyor).

**Kabul:** `kisitB`, `difficulty`, `bossScaling` altı haritayla geçiyor.

> **BİTTİ.** Ork Savaşçı ×2, `hpStep` 0,25. Rampa `0 · 4 · 5 · 12 · 14
> · 18` (düz bossla 16'ydı), Kolay ×0,80'de 5. Harita 6'nın çarpanı
> **değişmedi** (6,2) — yükselen 16 → 18 yalnız verb'ün bedeli. Boss HP
> türetmesi de değişmedi: tavan boss'un hızına ve zırhına bağlı,
> çağırmaya değil.

### Faz 3 — Doğrulama ve doküman *(≈0,5 gün)*

- Tarayıcıda boss dövüşü (oyuncu gözüyle).
- `GAME-DESIGN` §5 boss satırı ve karşı-oyun tablosu.
- `OPEN-QUESTIONS`: çağırma sayıları, S96'nın sonucu.

> **BİTTİ.** S100 (çağırma sayıları) kaydedildi, S96 ölçümle kapandı.
> `GAME-DESIGN` §5'e boss satırı ve "boss'un verb'ü haritaya göre"
> notu eklendi. Tarayıcıda: boss %75'e inince çağırma 1 tetiklendi ve
> ekranda iki Ork Savaşçı belirdi.

---

## Bu planın YAPMADIĞI şeyler

- **Yeni boss sprite'ı** — çağrılan yandaş var olan kadrodan; boss
  görseli aynı kalıyor (`CLAUDE.md` greybox kuralı).
- **Her haritaya ayrı boss verb'ü** — bu taş ikinciyi ekliyor. Üçüncüsü
  gerekirse ayrı taş; içerik eklemeden önce var olanın işe yaradığı
  ölçülür.

import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY, DIFFICULTY, isDifficulty } from './difficulty';
import { MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { wavesFor } from './waves';
import { BALANCE } from './balance';
import { getEnemyForMap } from './enemies';
import {
  buildReferenceBoards,
  ceilingAPerBranch,
  effectiveHp,
} from '../systems/balanceChecks';
import { referansCanKaybi } from '../systems/referansOlcum';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

/**
 * Zorluğun HP çarpanı **doğum anında** uygulanıyor (`WaveManager`).
 *
 * **S92:** eskiden ölçüm bunu `MapDef.hpMultiplier`'ı çarparak kuruyordu
 * ve o yol boss'u sessizce dışarıda bırakıyordu — `bossFor` mutlak boss
 * HP'sini aynı çarpana **bölüyor**, ikisi sadeleşiyor. Canlı oyun
 * (`GameScene`) tanımı çarpansız haritadan çözüyor ve doğum çarpanını
 * ayrı veriyor, yani boss gerçekte ölçekleniyor. Artık `waveSim` de o
 * ayrımı taşıyor: `simulateAllWaves(..., hpScale)`.
 *
 * Kısıt A tarafında (`enKotuKisitA`) ölçek **etkin HP'ye** uygulanıyor;
 * orada zaten doğruydu.
 */
function enKotuKisitA(m: MapDef, hpScale: number): { oran: number; kim: string } {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const son = buildReferenceBoards(m, w, k, false)[9]!;
  let enKotu = 0;
  let kim = '';
  for (const id of m.enemyRoster) {
    const e = getEnemyForMap(id as EnemyId, m);
    if (e === undefined) continue;
    const tavan = Math.min(...ceilingAPerBranch(son, e, m));
    if (!(tavan > 0)) continue;
    const oran = (effectiveHp(e, m) * hpScale) / tavan;
    if (oran > enKotu) {
      enKotu = oran;
      kim = id;
    }
  }
  return { oran: enKotu, kim };
}

/**
 * **S109 — ölçüm `referansOlcum`'a taşındı.**
 *
 * Buradaki eski gövde tahtayı `withEarlyBonus = true` ile kuruyor ama
 * simülasyona hiçbir politika vermiyordu; varsayılan `'temizken'` ise
 * `M16`'dan sonra **hiç tetiklenmiyor** (hazırlık artık kuyruk bitince
 * başlıyor, saha boşalınca değil). Yani tahta tam erken bonusuyla
 * zenginleşiyor, oyuncu o bonusu hiç kazanmıyordu.
 */
/**
 * **`M64` (S132) — ölçüt yine TEK KOŞU, ama bu kez hak edilmiş.**
 *
 * `M60` bunu bant ortancasına taşımıştı çünkü ölçüm kare süresine
 * bağlıydı ve tek koşu iddiayı şansa bağlıyordu. `M64` sebebi düzeltti:
 * `GameClock` sabit adımlı biriktirici, oyunun adımı her ekranda
 * `SABIT_ADIM_MS` ve `waveSim` de onu aynı sabitten alıyor. Ortalanacak
 * bir bant kalmadı — tek koşu artık oyunun kendisi.
 */
function canKaybi(m: MapDef, hpScale: number): number {
  return referansCanKaybi(m, hpScale);
}

describe('DIFFICULTY — M8-T11 (S80)', () => {
  it('üç seviye, varsayılan Normal', () => {
    expect(Object.keys(DIFFICULTY).sort()).toEqual(['kolay', 'normal', 'zor']);
    expect(DEFAULT_DIFFICULTY).toBe('normal');
    expect(isDifficulty('normal')).toBe(true);
    expect(isDifficulty('imkansiz')).toBe(false);
  });

  /**
   * **`M175` — tasarlanan denge artık ZOR'dur.** Bu test eskiden
   * "Normal hiçbir şeyi değiştirmiyor" diyordu. Merdiven bir basamak
   * kaydı (gerekçe ve ölçüm `difficulty.ts` başlığında): denge testlerinin
   * hepsi ×1,00'de ölçüyor, yani artık Zor'u sınıyor.
   */
  it('Zor tasarlanan dengedir — HP ×1, can 20; Normal ve Kolay onun ölçeklenmiş hâli', () => {
    expect(DIFFICULTY.zor.hpScale).toBe(1);
    expect(DIFFICULTY.zor.startLives).toBe(BALANCE.startLives);
    expect(DIFFICULTY.normal.hpScale).toBeLessThan(1);
    expect(DIFFICULTY.kolay.hpScale).toBeLessThan(DIFFICULTY.normal.hpScale);
    // Üçü de aynı canla başlıyor: fark yalnız düşmanın canında.
    for (const d of Object.values(DIFFICULTY)) expect(d.startLives).toBe(BALANCE.startLives);
  });

  it('**Zor HP’ye DOKUNMUYOR** — hiçbir düşman öldürülemez olmuyor', () => {
    // `difficulty.ts` başlığındaki ölçümün testi: HP çarpanı ×1,10'da
    // harita 1'in bossu referans tahtanın tavanını aşıyordu (%101) ve
    // öğretici harita geçilemez hâle geliyordu. Zor bu yüzden canı
    // kısıyor; Kısıt A oranları Normal ile **birebir aynı** kalmalı.
    expect(DIFFICULTY.zor.hpScale).toBe(1);
    for (const m of MAPS) {
      expect(enKotuKisitA(m, DIFFICULTY.zor.hpScale).oran, m.id).toBeCloseTo(
        enKotuKisitA(m, 1).oran,
        6,
      );
    }
  });

  /**
   * Reddedilen tasarımın kanıtı — *"sayı iyileşirse bu test bilinçli
   * güncellenir"*. **`M18`'de iyileşti ve güncellendi.**
   *
   * Eskiden oran **1'i aşıyordu**: HP çarpanı ×1,10'da harita 1'in
   * bossu referans tahtanın tavanının üstünde kalıyor, yani öğretici
   * harita geçilemez oluyordu. `M18`'den sonra tahta güçlendi (S112
   * bayrağı + S110 Yıldırım) ve tavan yavaşlatmayı görmeye başladı
   * (S113); oran **0,965**'e indi, yani ×1,10 artık teknik olarak
   * geçilebilir.
   *
   * Zor'un HP'ye dokunmama kararı yine de duruyor, çünkü gerekçe
   * "geçilemez" değil **pay**: 0,965 demek düşmanın tavanın %96,5'ini
   * yemesi, yani `BALANCE.safetyMargin`'in istediği %15 payın (oran
   * eşiği ≈ 0,870) **hiç** kalmaması.
   * Kısıt A'nın bütün kabulü o payın üstünde durmak.
   */
  it('ölçülen dayanak: HP çarpanı ×1,10 PAYI tüketiyor', () => {
    // `safetyMargin` bir ÇARPAN (1,15): `tavan > hp × 1,15` isteniyor,
    // yani oran eşiği `1 / 1,15 ≈ 0,870`.
    const enKotu = Math.max(...MAPS.map((m) => enKotuKisitA(m, 1.1).oran));
    expect(enKotu).toBeGreaterThan(1 / BALANCE.safetyMargin);
    // ×1,10 durumu kesinlikle kötüleştiriyor — kıyas noktası.
    const normal = Math.max(...MAPS.map((m) => enKotuKisitA(m, 1).oran));
    expect(enKotu).toBeGreaterThan(normal);
  });

  /**
   * **`M175` — Zor ustalıkla GEÇİLEBİLİR.** Eski hâli (12 can) 4-6.
   * haritalarda referans tahtanın bile geçemeyeceği bir seviyeydi
   * (13 · 14 · 17 ≥ 12). Sektör standardında zor seviye imkânsız değil.
   */
  it('Zor: referans tahta HER haritayı geçiyor', () => {
    for (const m of MAPS) {
      expect(canKaybi(m, DIFFICULTY.zor.hpScale), m.id).toBeLessThan(DIFFICULTY.zor.startLives);
    }
  });

  /**
   * Zor'un tanımı: harita 4 ve 5 referans tahtadan **daha iyisini**
   * istiyor. `M10`'da bu iddia bir süre ölçülen değerlere kilitlendi
   * (S87) çünkü `waveSim`'in üç körlüğü kapanınca gerçek değerler 3 ve
   * 8 çıkmıştı. S87'de harita çarpanları yeniden türetildi ve iddia
   * **geri kondu**.
   *
   * ## S131 — harita 6 ÇARPANDAN değil KADRODAN zorlaştırıldı (`M62`)
   *
   * `M61`'de Okçu'nun dal kuralı düzelince harita 6'nın referans
   * tahtası güçlendi ve can kaybı 13 → 9'a indi, yani bu eşiğin altına.
   * O turda eşik geçici olarak harita 6'yı kapsamaz yapılmıştı
   * (`slice(3, 5)`); sahibi **geri aldırdı** ve haritanın kadrodan
   * zorlaştırılmasını istedi. Doğru karar çıktı — eşik bugün yerinde.
   *
   * Çarpanla düzeltmek zaten mümkün değildi: 7,40-10,0 arası iki
   * tabanda birden tarandı, hiçbir değer 12-20 bandına oturmuyor çünkü
   * sebep gürültü değil **boss eşiği** (7,70'te `ogreSef` sızıyor,
   * toplam tek adımda 10 can zıplıyor).
   *
   * Kadro tarafında ise tek bir şey işe yaradı ve gerekçesi öğretici:
   * sabit puan bütçesinde **tip değiştirmek** karışık tahtayı zor
   * kıpırdatıyor — Örümcek Ana, Şaman, fazladan Tünelci, hepsi denendi,
   * karışık tahta 9-12 arasında kaldı, çünkü hangi tipi getirirsen bir
   * aile ona cevap veriyor. Kıpırdatan şey **sızıntı başına bedel**
   * oldu (`waves.ts` dalga 9: Zırhlı Ork ×2 → Trol ×1, aynı puan, iki
   * katı `leakDamage`), ve dalga 4'ün §7 düzeltmesi (S127) onun üstüne
   * bindi. Ölçüm: **9 → 12** (üretim adımı ve ortanca aynı).
   */
  /**
   * **`M149` — kural GEVŞETİLDİ: üç harita yerine YALNIZ FİNAL.**
   *
   * Eski hâli harita **4, 5 ve 6**'nın üçünün de Zor'da referans
   * tahtayla geçilememesini istiyordu. S169'un düzeltmesi (hazırlık
   * fazında düşmanlar artık yürüyor) o şartı **uygulanamaz** yaptı ve
   * sebebi ölçüldü: şart `h4 ≥ 12` tabanı koyuyor, Büyü tahtası harita
   * 6'yı `~14`'te tavanlıyor (8,08'de 19 can, 8,2'de 20) ve katı
   * artanlık `h4 < h5 < h6` istiyor — yani üç harita **iki canlık** bir
   * banda sıkışıyor, oysa ölçüm çözünürlüğü **±2**. Bölge gürültüden
   * dar, pratikte boş.
   *
   * Bugünkü rampanın üst ucu (13-17) donmanın verdiği payla mümkündü;
   * pay kalkınca taban ile tavan çakıştı.
   *
   * **Neyi koruyoruz:** Zor'un anlamı başlangıç canının **12** olması
   * ve **finalin referans tahtayı yenmesi** — "Zor'da iyi oynamak
   * gerekir" iddiası buradan geliyor. **Neyi bıraktık:** orta
   * haritaların da aynı şartı sağlaması. Öğrenme yayı (harita 1-3
   * Zor'da geçilebilir) yukarıdaki testte **aynen duruyor**, yani
   * kuralın iki ucu da hâlâ bağlı.
   */
  /**
   * `M149`'un iddiasının `M175` hâli: "Zor'da iyi oynamak gerekir" artık
   * **finalin payının dar** olmasıyla bağlı — referans tahta finalde
   * canının yarısından fazlasını bırakıyor. Eskiden "final referansı
   * yeniyor" (≥ 12 can kaybı, 12 canla) diye bağlıydı.
   */
  it('Zor: FİNAL dar payla geçiliyor — referans canının yarısından fazlasını kaybediyor', () => {
    const final = MAPS[MAPS.length - 1]!;
    expect(canKaybi(final, DIFFICULTY.zor.hpScale), final.id).toBeGreaterThan(
      DIFFICULTY.zor.startLives / 2,
    );
  });

  /**
   * **`M175` — Normal ortalama oyuncu içindir.** Oyuncu gibi oynanırken
   * ×0,80'de 4-6. haritalar 12 · 11 · 15 canla kazanıldı; ×1,00'de 3, 4
   * ve 5 ilk denemede kaybedildi. Referans tahta Normal'de hiçbir haritada
   * canının yarısını bırakmamalı — insan oyuncu ondan kötü oynuyor.
   */
  it('Normal: her harita bol payla geçiliyor (referans can kaybı ≤ 10)', () => {
    for (const m of MAPS) {
      expect(canKaybi(m, DIFFICULTY.normal.hpScale), m.id).toBeLessThanOrEqual(10);
    }
  });

  /**
   * Zorluk haritadan haritaya **artmalı** — en çok oynanan seviyede.
   * `M120` bu eğriyi ×0,80'de (o zamanki Kolay) artan yaptı; `M175`'ten
   * beri o eğri Normal'in kendisi. ×0,70 ve ×0,75'te eğri artan değil
   * (0·0·2·0·0·5 · 0·0·2·0·2·5), Normal'in ×0,80 olmasının bir sebebi de bu.
   */
  it('Normal rampası AZALMIYOR ve final bir şey istiyor', () => {
    const kayip = MAPS.map((m) => canKaybi(m, DIFFICULTY.normal.hpScale));
    for (let i = 1; i < kayip.length; i++) {
      expect(kayip[i]!, `harita ${i + 1}: ${kayip.join(' → ')}`).toBeGreaterThanOrEqual(
        kayip[i - 1]!,
      );
    }
    expect(kayip[0]).toBe(0);
    expect(kayip[kayip.length - 1]!).toBeGreaterThan(0);
  });

  it('Kolay: bütün haritalar neredeyse bedava (referans can kaybı ≤ 3)', () => {
    for (const m of MAPS) {
      expect(canKaybi(m, DIFFICULTY.kolay.hpScale), m.id).toBeLessThanOrEqual(3);
    }
  });

  /**
   * **`M120` — KOLAY'IN RAMPASI ARTIK BAĞLI.**
   *
   * `kisitB` rampanın monotonluğunu **yalnız Normal'de** ölçüyordu;
   * Kolay'ın şekli hiçbir yerde bağlı değildi ve `M119`'da sessizce
   * ters döndü — harita 4 **0** cana düşüp harita 3'ün (2) altına indi.
   * Kusur "hiçbir liste onu saymıyordu" sınıfının bir örneği daha
   * (CLAUDE.md TIER 2), bu kez sayılan şey harita ya da aile değil
   * **zorluk seviyesi**.
   *
   * İddia Normal'inkinden **gevşek**: yalnız azalmama aranıyor, kesin
   * artış değil. Gerekçe ölçüldü — ×0,8 HP'de sızıntı bir eşik olayı
   * (haritaların çoğunda sıfır, sızan da neredeyse hep **Trol**), yani
   * Kolay'da kesin artış istemek gürültüye sağlama koymak olurdu.
   *
   * Ölçülen (`M120`, Kolay ×0,80): `0 · 0 · 2 · 4 · 5 · 8`.
   * `M175`: Kolay ×0,60 → `0 · 0 · 0 · 0 · 0 · 2`.
   */
  it('Kolay rampası da AZALMIYOR — zorluk seviyeleri arası şekil korunuyor', () => {
    const kayip = MAPS.map((m) => canKaybi(m, DIFFICULTY.kolay.hpScale));
    for (let i = 1; i < kayip.length; i++) {
      expect(kayip[i]!, `harita ${i + 1}: ${kayip.join(' → ')}`).toBeGreaterThanOrEqual(
        kayip[i - 1]!,
      );
    }
    // Öğretici harita Kolay'da da bedava.
    expect(kayip[0]).toBe(0);
    // Son harita gerçekten bir şey istiyor — Kolay "hiç kaybetme" değil.
    expect(kayip[kayip.length - 1]!).toBeGreaterThan(0);
  });

  it('Kolay yıldız kaydetmiyor, diğer ikisi kaydediyor', () => {
    expect(DIFFICULTY.kolay.recordStars).toBe(false);
    expect(DIFFICULTY.normal.recordStars).toBe(true);
    expect(DIFFICULTY.zor.recordStars).toBe(true);
  });

  it('zorluk MONOTON: kolay ≤ normal ≤ zor (pay olarak)', () => {
    // "Pay" = can / beklenen kayıp. Tek bir sayıda toplanamıyor çünkü iki
    // farklı kol var (HP ve can); en kötü haritada karşılaştırılıyor.
    const pay = (d: keyof typeof DIFFICULTY): number => {
      const enKotuKayip = Math.max(...MAPS.map((m) => canKaybi(m, DIFFICULTY[d].hpScale)));
      return DIFFICULTY[d].startLives - enKotuKayip;
    };
    expect(pay('kolay')).toBeGreaterThan(pay('normal'));
    expect(pay('normal')).toBeGreaterThan(pay('zor'));
  });
});

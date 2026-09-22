/**
 * **Kısıt B'nin düşman kırılımı** — hangi düşman sızıyor.
 *
 * Toplam sızıntı sayısı "dalga sızdırdı" diyor ama *neyin* sızdığını
 * söylemiyor, ve bu ikisi tamamen farklı düzeltmeler gerektiriyor.
 *
 * ## Kısıt A ile Kısıt B AYNI şeyi ölçmüyor
 *
 * Kısıt A **tek** düşman için: "bir Ork Savaşçı öldürülebilir mi?"
 * Kısıt B **dalga** için: "on bir Ork Savaşçı aynı anda gelirse?"
 *
 * Ölçüm bunu net gösterdi: harita 3'te en çok sızan düşman **Ork Savaşçı
 * (×11)**, ama Kısıt A'da %39,9 ile rahat geçiyor. Trol ise Kısıt A'da
 * %116,6 ile kalıyor ama yalnız **×3** sızıyor. Yani ikisi de gerekli;
 * biri diğerinin yerine geçmiyor.
 */
import { describe, expect, it } from 'vitest';
import { MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, MAP_6, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import {
  MAP1_WAVES,
  MAP2_WAVES,
  MAP3_WAVES,
  MAP4_WAVES,
  MAP5_WAVES,
  MAP6_WAVES,
  FINAL_ZIRVE_MUAF,
} from '../data/waves';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { REFERANS_ERKEN_BONUSU, REFERANS_POLITIKA, referansCanKaybi } from './referansOlcum';
import { measureCoverage } from '../util/coverage';
import { getEnemyForMap } from '../data/enemies';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { Wave } from '../types/wave';

/**
 * **S109 — tahta ile simülasyon aynı oyuncuyu varsayıyor.**
 *
 * Buradaki çift eskiden ayrışıktı: tahta `withEarlyBonus = true` ile
 * kuruluyordu (yani her dalgada tam erken bonusu alınmış sayılıyordu)
 * ama simülasyona politika verilmediği için o bonus hiç kazanılmıyordu.
 * Dalgalar üst üste binmediği sürece zararsızdı; `M16` erken basmaya
 * bedel koyunca ölçüm iyimserleşmeye başladı (harita 5: 12 yerine
 * gerçekte 15). Çift artık `referansOlcum`'dan geliyor.
 */
function kosu(map: MapDef, waves: readonly Wave[]) {
  const k = measureCoverage(map.paths, map.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(
    waves,
    buildReferenceBoards(map, waves, k, REFERANS_ERKEN_BONUSU),
    map,
    undefined,
    1,
    'yok',
    REFERANS_POLITIKA,
  );
  const toplam: Partial<Record<EnemyId, number>> = {};
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      toplam[id as EnemyId] = (toplam[id as EnemyId] ?? 0) + (n ?? 0);
    }
  }
  return { sim, toplam, adet: sim.reduce((t, r) => t + r.leakedCount, 0) };
}

/** Sızan düşmanların toplam can bedeli — asıl kabul ölçütü. */
function canKaybi(map: MapDef, waves: readonly Wave[]): number {
  const r = kosu(map, waves);
  let can = 0;
  for (const [id, n] of Object.entries(r.toplam)) {
    const e = getEnemyForMap(id as EnemyId, map);
    if (e) can += e.leakDamage * (n ?? 0);
  }
  return can;
}

/** Dalga başına **can bedeli** — S135'in ölçütü. */
function dalgaBasinaCan(map: MapDef, waves: readonly Wave[]): number[] {
  return kosu(map, waves).sim.map((r) => {
    let can = 0;
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, map);
      if (e) can += e.leakDamage * (n ?? 0);
    }
    return can;
  });
}

describe('Kısıt B — düşman kırılımı', () => {
  /**
   * **Boss dalgası haritanın ZİRVESİDİR — §7, sahibin kararı (`M70`).**
   *
   * `GAME-DESIGN.md` §7 boss dalgasını zirve olarak tanımlıyor ama
   * hiçbir test bakmıyordu. `M69`'un S116 yeniden ölçümü Kül Ovası'nda
   * tersini buldu: boss dalgası **sıfır** can kaybettiriyor, bütün
   * baskı elit dalgasının taşmasında (S135). Sahibi kuralı seçti —
   * boss her haritada zirve olacak — ve bu test onu bağlıyor.
   *
   * İki kademeli, çünkü öğretici haritalar hiç sızdırmıyor:
   * her haritada zirve **en az** boss dalgasında, ve baskının olduğu
   * haritalarda **kesin** orada.
   *
   * Ölçüt sızıntı **sayısı** değil **can bedeli**: Trol'ün `leakDamage`
   * değeri 2, goblininki 1 — iki goblin bir Trol etmiyor.
   */
  it('**boss dalgası haritanın ZİRVESİ** — §7 (S135)', () => {
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
      [MAP_6, MAP6_WAVES],
    ] as const) {
      const pw = dalgaBasinaCan(m, w);
      const son = pw[9] ?? 0;
      const erkenEnCok = Math.max(...pw.slice(0, 9));
      const etiket = `${m.id}: ${pw.join(' ')}`;
      /**
       * `M117` — muafiyet **veride** (`FINAL_ZIRVE_MUAF`), testte değil.
       *
       * Taş Köprü'ye S116 için elit dalgası konunca kural kırıldı ve
       * finali büyütmek **işe yaramadı** (bütçe 52 → 78'de bile final 0
       * sızdırıyor — dalga 10 tahtası tamamlanmış, dalga 6'daki kuruluyor).
       * Sahibi öğrenme yayında S116'yı öncelikli seçti; gerekçe listenin
       * başında. Liste dışındaki her harita kuralı **aynen** taşıyor.
       */
      if (FINAL_ZIRVE_MUAF.includes(m.id)) continue;
      expect(son, etiket).toBeGreaterThanOrEqual(erkenEnCok);
      if (pw.reduce((a, b) => a + b, 0) > 0) expect(son, etiket).toBeGreaterThan(erkenEnCok);
    }
    // Muafiyet **sessizce büyümesin**: bugün tek harita, ve bu sayı
    // büyüyecekse bilerek büyümeli (S136'nın “boşa koşan test” dersi).
    expect(FINAL_ZIRVE_MUAF).toHaveLength(1);
  });

  it('harita 1: HİÇ sızıntı yok', () => {
    const r = kosu(MAP_1, MAP1_WAVES);
    expect(r.adet).toBe(0);
    expect(r.toplam).toEqual({});
  });

  /**
   * **Boss türetmesinin ASIL sağlaması** — `M18` (S113).
   *
   * Boss HP'si artık statik tavandan değil, referans tahtanın **sürekli
   * koşuda** öldürebildiği eşikten türetiliyor (`bossScaling.ts`). O
   * türetmenin doğru olup olmadığını söyleyen tek şey bu test.
   *
   * **Harita 6 `M18`'de eklendi ve eklenir eklenmez bir kusur ortaya
   * çıkardı:** Sisli Bataklık'ın bossu `M16`'dan (üst üste binen
   * dalgalar) beri sızıyordu ve hiçbir test bakmıyordu — liste harita
   * 5'te bitiyordu. Çağıran boss (`M13`) artıkların üstüne gelince
   * tahta ona yetişemiyordu.
   */
  it('**boss hiçbir haritada sızmıyor** — türetme çalışıyor', () => {
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
      [MAP_6, MAP6_WAVES],
    ] as const) {
      expect(kosu(m, w).toplam.ogreSef ?? 0, m.id).toBe(0);
    }
  });

  it('**her harita GEÇİLEBİLİR** — kaybedilen can 20’nin altında', () => {
    // Asıl kabul ölçütü bu: sızıntı sayısı değil, **can kaybı**. Farklı
    // düşmanların sızma cezası farklı (Trol 2, boss 10).
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
      [MAP_6, MAP6_WAVES],
    ] as const) {
      expect(canKaybi(m, w), m.id).toBeLessThan(20);
    }
  });

  /**
   * **Zorluk rampası MONOTON — S87'de ölçülerek yeniden türetildi.**
   *
   * `M8-T04` dersi: monoton `hpMultiplier` monoton zorluk vermiyor,
   * ölçüt **çıktı** olmalı. `M10`'da bu testin bir süre ölçülen
   * değerlere kilitlenmesi gerekti, çünkü `waveSim`'in üç körlüğü
   * (S80 boss, S81 düşman yetenekleri, S86 süreli etkiler) kapanınca
   * gerçek rampa `0 · 8 · 6 · 3 · 8` çıktı — monoton değil. Oyun hep
   * böyleydi; simülasyon göremiyordu.
   *
   * S87'de dört harita çarpanı taranarak yeniden türetildi ve iddia
   * **geri kondu**: rampa `0 · 4 · 7 · 12 · 14`.
   *
   * ## S109 — iddia öğrenme yayında GEVŞETİLDİ (`M16`)
   *
   * Rampa beşinci kez türetildi ve `0 · 0 · 3 · 13 · 15` çıktı. Harita
   * 2'nin **sıfır** olması tarama eksikliği değil, ölçülen bir gerçek:
   * S73 altın çarpanını HP çarpanından aşağı bırakmıyor, yani harita 2'de
   * HP'yi yükseltmek tahtayı da zorunlu olarak zenginleştiriyor ve ikisi
   * sadeleşiyor. Altın HP ile birlikte tarandığında sonuç
   * `1,8→0 · 2,0→0 · 2,2→0 · 2,4→0 · 2,6→13`: bir **uçurum**, dial değil.
   * Altını HP'nin üstünde tutmak da düzeltmiyor — `2,6/2,8→0`,
   * `2,6/3,0→3`, `2,6/3,2→0` gibi bıçak sırtı sıçramalar veriyor.
   *
   * Yani harita 2'nin tahtası ya yetiyor (0) ya çöküyor (13); arası yok.
   * Bu sivri uçlardan birine oturtmak sayıyı **uydurmak** olurdu (S82/S84
   * dersi). İddia bu yüzden ikiye ayrıldı: öğrenme yayı (1-2) azalmıyor,
   * asıl rampa (3'ten sonra) **kesin** artıyor.
   *
   * Harita 2'nin zorluğu zaten çarpanda değil **kadroda**: Zırhlı Ork ve
   * Şaman orada tanıtılıyor.
   *
   * ## S130 — iddia artık TEK KOŞUYA dayanmıyor (`M60`)
   *
   * Altı türetmenin hepsi tek bir adım süresiyle (1/60 sn) ölçülmüştü.
   * `M59`'un adım taraması bunun bir *seçim* olduğunu gösterdi: 55-65
   * fps arasında harita 5 bir yerde 14 yerine **10**, harita 4 bir yerde
   * 12 yerine **11** veriyor. O tek noktalarda bu testin "kesin artan"
   * şartı düşerdi — yani iddia bugüne kadar kare süresinin şansına
   * bağlıydı, dengeye değil.
   *
   * Ölçüt `referansCanKaybiOrtanca`'ya taşındı: aynı harita beş kare
   * süresinde koşuluyor ve **ortanca** alınıyor. Ortanca bandın iki
   * ucundaki tek atışları yutuyor. Üretim adımındaki değerlerle
   * karşılaştırma `referansOlcum.ts`'teki tabloda; harita 1-5 için
   * rampa değişmiyor (`0 · 0 · 5 · 12 · 14`), yalnız **dayanağı**
   * değişiyor.
   */
  it('**zorluk MONOTON** — çarpan değil, ölçülen can kaybı (M8-T04, S87, S130)', () => {
    // `M64` (S132): adım sabitlendi, bant ortancası söküldü — tek koşu
    // artık oyunun kendisi.
    //
    // **`M81` — liste altıncı haritada BİTİYORDU.** Harita 6 `M12`'de geldi,
    // bu iddia `M8`'de yazıldı ve aradan yedi türetme geçti; kampanyanın
    // **son** haritası rampanın dışında kaldı. Eklenince ilk ölçüm
    // `0 · 0 · 9 · 14 · 17 · 15` — yani son harita bir öncekinden **kolay**
    // ve iddia düşüyordu. Çarpanlar yeniden türetildi (harita 5: 10,2 →
    // 10,05 · harita 6: 8,1 → 8,5) ve rampa `0 · 0 · 9 · 14 · 15 · 16` oldu.
    // **`M84`:** harita 6'ya elit dalgası gelince son halka 16 → **18**.
    // `M18`'in aynı dosyadaki dersi ("liste harita 5'te bitiyordu") bu kez
    // **bütün** listelere uygulandı.
    const kayip = [MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, MAP_6].map((m) => referansCanKaybi(m));
    // Hiçbir yerde AZALMIYOR.
    for (let i = 1; i < kayip.length; i++) {
      expect(kayip[i]!, `harita ${i + 1}: ${kayip.join(' → ')}`).toBeGreaterThanOrEqual(
        kayip[i - 1]!,
      );
    }
    // Harita 3'ten sonra KESİN artıyor — asıl rampa burada.
    for (let i = 3; i < kayip.length; i++) {
      expect(kayip[i]!, `harita ${i + 1}: ${kayip.join(' → ')}`).toBeGreaterThan(kayip[i - 1]!);
    }
    // Öğretici harita bedava kalmalı — rampanın alt ucu.
    expect(kayip[0]).toBe(0);
    // Öğrenme yayı ucuz, asıl rampa pahalı — ikisi ayrı bantta.
    expect(kayip[2]!).toBeLessThan(12);
    expect(kayip[3]!).toBeGreaterThanOrEqual(12);
  });

  it('Ork Savaşçı debisi çözüldü — S73', () => {
    // S73 öncesi harita 3'te Ork Savaşçı ×11 ile baskın sızandı ve toplam
    // can kaybı 34'tü (20 canla kayıp). Ekonomi düzeltilince düştü.
    const r = kosu(MAP_3, MAP3_WAVES);
    expect(r.toplam.orkSavasci ?? 0).toBeLessThanOrEqual(6);
  });

  it('sızıntı erken dalgalarda DEĞİL — S72 düzeltmesi tutuyor', () => {
    // S72 öncesi harita 3'te d1:7 d2:5 d3:6 sızıyordu. Başlangıç altını
    // çarpanı izlemeye başlayınca dalga 1 temizlendi.
    for (const [m, w] of [
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
      [MAP_6, MAP6_WAVES],
    ] as const) {
      expect(kosu(m, w).sim[0]!.leakedCount, `${m.id} dalga 1`).toBe(0);
    }
  });

  it('sızıntı toplamı bilinen tavanın altında — regresyon kilidi', () => {
    // Sayılar iyileşirse bu test bilinçli gevşetilir; kötüleşirse kırılır.
    expect(kosu(MAP_2, MAP2_WAVES).adet).toBeLessThanOrEqual(8);
    expect(kosu(MAP_3, MAP3_WAVES).adet).toBeLessThanOrEqual(25);
    expect(kosu(MAP_4, MAP4_WAVES).adet).toBeLessThanOrEqual(14);
    expect(kosu(MAP_5, MAP5_WAVES).adet).toBeLessThanOrEqual(14);
    // `M81` — harita 6 bu listeye de eklendi; ölçülen 14.
    expect(kosu(MAP_6, MAP6_WAVES).adet).toBeLessThanOrEqual(16);
  });

  it('kırılım toplamı sızıntı sayısıyla TUTARLI', () => {
    for (const [m, w] of [
      [MAP_1, MAP1_WAVES],
      [MAP_2, MAP2_WAVES],
      [MAP_3, MAP3_WAVES],
      [MAP_4, MAP4_WAVES],
      [MAP_5, MAP5_WAVES],
      [MAP_6, MAP6_WAVES],
    ] as const) {
      const r = kosu(m, w);
      const kirilimToplam = Object.values(r.toplam).reduce((a, b) => a + (b ?? 0), 0);
      expect(kirilimToplam, m.id).toBe(r.adet);
    }
  });
});

/**
 * Boss türetmesinin regresyon bandı — `research/01` §12.
 *
 * §12 uyarıyor: HP `0,80 × tavan` olarak tanımlanınca Kısıt A boss için
 * **tautoloji** olur (`tavan > 0,92 × tavan` her zaman doğru). Onun yerine
 * iki gerçek sağlama var: **karşılanabilirlik** ve **bu bant**.
 */
import { describe, expect, it } from 'vitest';
import {
  BOSS_ARMOR_BY_MAP,
  BOSS_HP_BY_MAP,
  bossFor,
} from './bossScaling';
import { MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, MAP_6, MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { MAP1_WAVES, MAP2_WAVES, MAP3_WAVES, MAP4_WAVES, MAP5_WAVES, MAP6_WAVES } from './waves';
import { OGRE_SEF, getEnemyForMap } from './enemies';
import { BALANCE } from './balance';
import {
  BOSS_CEILING_RATIO,
  bossAffordable,
  buildReferenceBoards,
  ceilingAPerBranch,
  cumulativeGold,
  effectiveHp,
} from '../systems/balanceChecks';
import { measureCoverage } from '../util/coverage';
import { referansKosu } from '../systems/referansOlcum';

/**
 * **`M27`: harita 6 listeye EKLENDİ.**
 *
 * Liste `M7`'de yazıldı, harita 6 `M12`'de geldi. Sonuç: **çağıran
 * boss** (`M13`) hiçbir boss sağlamasından geçmiyordu — zırh tablosu,
 * HP kilidi, tavan akıl sağlığı, karşılanabilirlik, "boss dışındaki
 * düşmanlar değişmedi". S114/S119 ile aynı sınıf.
 */
const H = [
  { map: MAP_1, waves: MAP1_WAVES },
  { map: MAP_2, waves: MAP2_WAVES },
  { map: MAP_3, waves: MAP3_WAVES },
  { map: MAP_4, waves: MAP4_WAVES },
  { map: MAP_5, waves: MAP5_WAVES },
  { map: MAP_6, waves: MAP6_WAVES },
];

const tahta = (m: (typeof H)[number]) => {
  const k = measureCoverage(m.map.paths, m.map.buildSpots, COVERAGE_REFERENCE_RANGE);
  return buildReferenceBoards(m.map, m.waves, k, false)[9]!;
};

describe('Boss ölçeklemesi — zırh düşer, HP türetilir', () => {
  it('harita 1’in belgelenmiş 700’ü DEĞİŞMEDİ — §5', () => {
    expect(BOSS_HP_BY_MAP['degirmen-gecidi']).toBe(700);
    expect(BOSS_ARMOR_BY_MAP['degirmen-gecidi']).toBe(OGRE_SEF.armor);
  });

  it('zırh haritayla DÜŞÜYOR: 10 → 5 → 2 → 2', () => {
    // Harita 3'ün zırhı 3'ten 2'ye indi: referans tahta artık kışla satın
    // alıyor (§5 Trol) ve kışla bir kule noktasını işgal ediyor, tavan
    // düşüyor. Regresyon bandı testi bunu yakaladı.
    //
    // Harita 4 de 2'de kaldı — `M8-T04` zırh taraması (0-5) tavanı yalnız
    // %12 oynattı (2441 → 2141), yani zırh burada artık bağlayıcı kısıt
    // değil; asıl zorluk HP çarpanında. Zırhı 3'e çıkarmak tavanı düşürüp
    // türetilen HP'yi de düşüreceği için net etkisi ≈ 0 olurdu.
    expect(BOSS_ARMOR_BY_MAP['tas-kopru']).toBe(5);
    expect(BOSS_ARMOR_BY_MAP['kul-ovasi']).toBe(2);
    expect(BOSS_ARMOR_BY_MAP['kar-gecidi']).toBe(2);
    expect(BOSS_ARMOR_BY_MAP['kadim-harabe']).toBe(2);
  });

  /**
   * **`M18` (S113) — HAM HP artık monoton değil, ZORLUK monoton.**
   *
   * Boss HP'si `0,80 × ceilingA` ile türetiliyordu ve o formül tek bir
   * düşmanı, taban hızda, yeteneksiz varsayıyor. Harita 5'in bossunun
   * ikinci evresi (`M10-T03`), harita 6'nınkinin **çağırması** (`M13`)
   * ve `M16`'nın üst üste binen dalgaları var; üçü de bossu HP'sinden
   * bağımsız olarak zorlaştırıyor. Ölçülen "referans tahta en fazla kaç
   * HP'lik bossu öldürebilir" eşiği bu yüzden harita 4'te 3750, harita
   * 5'te 2452 — yani **daha yetenekli boss, daha az ham HP taşıyabilir**.
   *
   * Ham HP'nin monotonluğunu dayatmak, yeteneği olan bossu öldürülemez
   * yapmak demekti (`M17`'nin duvara tosladığı yer). İddia ikiye
   * ayrıldı: düz bossların (harita 1-4) HP'si monoton artıyor, **ölçülen
   * zorluk** ise `kisitB.test.ts`'te altı harita için monoton.
   */
  it('düz bossların HP’si monoton artıyor (harita 1-4)', () => {
    const hp = MAPS.slice(0, 4).map((m) => BOSS_HP_BY_MAP[m.id]!);
    for (let i = 1; i < hp.length; i++) expect(hp[i]!).toBeGreaterThan(hp[i - 1]!);
    // Yetenekli bosslar (5-6) kendi aralarında da artıyor.
    expect(BOSS_HP_BY_MAP['sisli-bataklik']!).toBeGreaterThan(BOSS_HP_BY_MAP['kadim-harabe']!);
  });

  /**
   * **`M18` (S113) — türetme statik tavandan SİMÜLASYONA taşındı.**
   *
   * Eski iki test HP'yi `0,80 × ceilingA`'ya kilitliyordu. `ceilingA`
   * tek düşman / taban hız / yeteneksiz bir dünyayı ölçüyor; oyun
   * artık o dünya değil (boss yetenekleri + `M16` üst üste binme).
   * Ölçüldü: yazılı HP'nin tavana oranı haritaya göre **0,41 ile 0,88**
   * arasında geziniyor ve bu bir hata değil, boss yeteneklerinin bedeli.
   * Sabit bir bant dayatmak yetenekli bossu öldürülemez yapıyordu.
   *
   * Sayılar artık şöyle türetiliyor: referans tahtanın **sürekli
   * koşuda** (bütün dalgalar, üst üste binme dahil) öldürebildiği en
   * yüksek HP ikili aramayla ölçülüyor ve `0,80` payla yazılıyor.
   * Asıl davranış sağlaması `kisitB.test.ts`'te: **boss hiçbir haritada
   * sızmıyor**. Buradaki iki test o türetmenin kaydı.
   */
  it('yazılı HP’ler ÖLÇÜLEN değerler — regresyon kilidi', () => {
    expect(BOSS_HP_BY_MAP).toEqual({
      'degirmen-gecidi': 700, // §5'in belgelenmiş değeri (S65)
      'tas-kopru': 993, // `M20` (S118) — altın çarpanı 2,2 olunca yeniden türetildi
      'kul-ovasi': 1322,
      'kar-gecidi': 3000,
      'kadim-harabe': 1962,
      'sisli-bataklik': 2100,
    });
  });

  it('hiçbir boss statik tavanın üstünde değil, hiçbiri de önemsiz', () => {
    // İki taraflı akıl sağlığı: tavanı aşan boss statik olarak bile
    // öldürülemez; tavanın üçte birinin altındaki boss dövüş değil.
    for (const m of H) {
      const boss = bossFor(m.map);
      const tavan = Math.min(...ceilingAPerBranch(tahta(m), boss, m.map));
      const oran = effectiveHp(boss, m.map) / tavan;
      expect(oran, `${m.map.id}: ${oran.toFixed(3)}`).toBeLessThan(1);
      expect(oran, `${m.map.id}: ${oran.toFixed(3)}`).toBeGreaterThan(0.3);
    }
  });

  it('karşılanabilirlik — türetmenin dayandığı asıl varsayım (§12)', () => {
    for (const m of H) expect(bossAffordable(m.map, m.waves, tahta(m)), m.map.id).toBe(true);
  });

  it('doğum yolu türetilmiş bossu veriyor — çarpan iki kez uygulanmıyor', () => {
    for (const m of H) {
      const def = getEnemyForMap('ogreSef', m.map)!;
      expect(def.hp * m.map.hpMultiplier).toBeCloseTo(BOSS_HP_BY_MAP[m.map.id]!, 6);
      expect(def.armor).toBe(BOSS_ARMOR_BY_MAP[m.map.id]);
    }
  });

  /**
   * Bu testin işi boss ölçeklemesinin **diğer düşmanlara sızmadığını**
   * doğrulamak. `M10-T03` haritaya göre tek bir bilinçli varyant ekledi
   * (harita 4'ün kalkanlı Ork Savaşçı'sı), o yüzden iddia gevşetilmedi
   * **daraltıldı**: bilinen varyant adıyla ayrı tutuluyor, geri kalan
   * her düşman hâlâ birebir aynı olmak zorunda.
   */
  const BILINEN_VARYANTLAR = new Set(['kar-gecidi/orkSavasci']);

  it('boss dışındaki düşmanlar DEĞİŞMEDİ (bilinen varyantlar hariç)', () => {
    for (const m of H) {
      for (const id of m.map.enemyRoster) {
        if (id === 'ogreSef') continue;
        if (BILINEN_VARYANTLAR.has(`${m.map.id}/${id}`)) continue;
        expect(getEnemyForMap(id, m.map), `${m.map.id}/${id}`).toEqual(getEnemyForMap(id, MAP_1));
      }
    }
  });

  it('bilinen varyant YALNIZ kalkan alanında ayrışıyor', () => {
    const harita4 = H.find((m) => m.map.id === 'kar-gecidi');
    expect(harita4, 'harita 4 bulunamadı').toBeDefined();
    const varyant = getEnemyForMap('orkSavasci', harita4!.map)!;
    const temel = getEnemyForMap('orkSavasci', MAP_1)!;
    expect(varyant.shield).toBeGreaterThan(0);
    // Kalkan dışında TEK bir alan bile farklı olmamalı.
    const { shield: _atilan, ...kalkansiz } = varyant;
    expect(kalkansiz).toEqual(temel);
  });

  /**
   * **Bossun PAYI — `M74` (S136'nın bıraktığı boşluğu dolduruyor).**
   *
   * `M71` şunu buldu: dosya bir bandın "her koşuda doğrulandığını"
   * söylüyordu ama öyle bir test yoktu, ve sabit (`BOSS_HP_TOLERANCE`)
   * okunmadan duruyordu. Yanlış cümle silindi; **eksik sağlama buydu.**
   *
   * Eski bandın ölçütü (`0,80 × tek düşman tavanı`) `M71`'de ölçümle
   * reddedildi: tahtalar `M7`'den beri üç katlandı, o tavan bir *dalganın*
   * baskısını artık temsil etmiyor. `M73` doğru ölçütü ölçtü: **bossun
   * gerçek dalgada öldüğü en büyük HP**.
   *
   * Bu test o eşiği *aramadan* aynı şeyi soruyor — aramak altı haritada
   * ikili arama demekti ve suite'e sekiz saniye eklerdi. Soru tek koşuya
   * indirgendi: **HP'nin %15 fazlasında boss hâlâ ölüyor mu?** Pay yine
   * uydurulmadı, `BALANCE.safetyMargin`'den geliyor — Kısıt A'nın bütün
   * kabulü `tavan > hp × 1,15`, burada tavan yerine **dalga baskısı**.
   *
   * Ölçülen paylar (HP / eşik): Değirmen %72,7 · Taş Köprü %67,4 ·
   * Kül Ovası %54,6 · Kar Geçidi %68,8 · Kadim Harabe %52,2 · Sisli
   * Bataklık %54,4 — hepsi `1/1,15 ≈ %87`'nin altında.
   *
   * **Neden önemli:** `kisitB`'nin "boss hiçbir haritada sızmıyor"u ikili
   * bir kontrol; sürüklenmeyi ancak kaza olduktan sonra görür. Bu test
   * kazadan **önce** görüyor. Tam olarak `M61`/`M66`/`M67`'de olan şey
   * bu: tahtalar değişti, boss yerinde kaldı, kimse bakmıyordu.
   */
  it('**bossun PAYI var** — HP’nin %15 fazlasında da ölüyor (S136)', () => {
    const yazilabilir = BOSS_HP_BY_MAP as unknown as Record<string, number>;
    for (const m of MAPS) {
      const asil = BOSS_HP_BY_MAP[m.id];
      if (asil === undefined) continue;
      try {
        yazilabilir[m.id] = Math.round(asil * BALANCE.safetyMargin);
        const sizdi = referansKosu(m).some((r) => (r.leakedByEnemy.ogreSef ?? 0) > 0);
        expect(sizdi, `${m.id}: boss ${asil} × ${BALANCE.safetyMargin} = ${Math.round(asil * BALANCE.safetyMargin)}`).toBe(false);
      } finally {
        yazilabilir[m.id] = asil;
      }
    }
  });

  it('700 × çarpan olsaydı PAY BIRAKMAZDI — düzeltmenin kanıtı (S134)', () => {
    // Savunulan iddia: naif `700 × hpMultiplier` boss HP'sini tavanın
    // **üstüne** koyuyor, yani dalga 10 hiç geçilemiyor. Eşik bu yüzden
    // 1,0 — eskiden 1,5 yazıyordu ve o sayının bir gerekçesi yoktu,
    // yalnızca harita 2-3'ün ölçülen değeriydi.
    //
    // **`M67` (S134) — eşik 1,0'dan PAY'a çekildi.**
    //
    // Kademe çıktıları hizalanınca tahtalar güçlendi ve Kül Ovası'nda
    // naif formülün oranı **0,96**'ya düştü, yani teknik olarak
    // geçilebilir oldu. İddia "imkansız"dan "**pay bırakmıyor**"a
    // çekildi ve eşik uydurulmadı, `BALANCE.safetyMargin`'den
    // türetildi: Kısıt A'nın bütün kabulü `tavan > hp × 1,15`, yani
    // oran eşiği `1 / 1,15 ≈ 0,87`. Naif boss o payın üstünde kalıyor
    // — kanıt duruyor, yalnız cümlesi dürüstleşti.
    //
    // Ölçülen oranlar: harita 2 ≈ 2,6 · harita 3 ≈ 1,9 · harita 4 ≈ 1,29.
    // Harita 4'te düşük olmasının sebebi: 12 nokta + tek kol, yani tavan
    // yüksek; çarpan 3,4 ile birlikte naif HP 2380, tavan 1841. Hâlâ
    // geçilemez ama daha az dramatik — kanıt yine de duruyor.
    for (const m of H) {
      if (m.map.id === 'degirmen-gecidi') continue;
      const eski = { ...OGRE_SEF };
      const tavan = Math.min(...ceilingAPerBranch(tahta(m), eski, m.map));
      const oran = (eski.hp * m.map.hpMultiplier) / tavan;
      expect(oran, `${m.map.id} eski oran ${oran.toFixed(2)}`).toBeGreaterThan(
        1 / BALANCE.safetyMargin,
      );
    }
  });

  it('gelir çarpanla ölçekleniyor — S70', () => {
    const g1 = cumulativeGold(MAP_1, MAP1_WAVES, 10, false);
    const g2 = cumulativeGold(MAP_2, MAP2_WAVES, 10, false);
    const g3 = cumulativeGold(MAP_3, MAP3_WAVES, 10, false);
    const g4 = cumulativeGold(MAP_4, MAP4_WAVES, 10, false);
    expect(g2 / g1).toBeGreaterThan(1.4);
    expect(g3 / g1).toBeGreaterThan(2.2);
    expect(g4).toBeGreaterThan(g3);
    expect(cumulativeGold(MAP_5, MAP5_WAVES, 10, false)).toBeGreaterThan(g4);
  });
});

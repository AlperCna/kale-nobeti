/**
 * `docs/KURALLAR.md` üretici — **oyunun tek referans dosyası**.
 *
 * Sayılar `src/data/*` içinden **canlı** okunuyor; elle yazılmıyor. Bir
 * kuleyi değiştirip bu betiği koşturmak dokümanı günceller. Böylece
 * doküman ile kod **ayrışamaz** — projenin en pahalı hatası (2200 HP'lik
 * boss) tam olarak böyle bir ayrışmadan çıkmıştı.
 *
 * Kullanım:  node scripts/kurallar.mjs
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dizin = mkdtempSync(join(tmpdir(), 'kn-kural-'));
const veriYolu = join(dizin, 'veri.json');

/**
 * Veriyi `src/data/*.ts`'ten **canlı** okumak için geçici bir vitest
 * dosyası yazılıp siliniyor. Dosya `src/` altında olmak zorunda: import
 * yolları oraya göre ve `vitest.config.ts` yalnız `src/**` tarıyor.
 *
 * **Bu dosya iki kez geride kaldı** (build yarıda kesilince) ve bir
 * sonraki `npm run test`'i kırdı — 871 test içinde tek bir anlamsız
 * zaman aşımı, sebebi bulunması zor. Aşağıdaki `temizle()` her koşunun
 * başında ve sonunda çağrılıyor, yani bir kez daha kalsa bile `npm run
 * build` onu siliyor.
 *
 * Denenip **çalışmayan** iki yama, bir daha denenmesin diye:
 * `vitest.config.ts`'e `exclude` eklemek (vitest açıkça verilen dosyayı
 * da eliyor, betiğin kendi koşusu ölüyor) ve dosyayı depo köküne taşımak
 * (bu sefer `include` desenine girmiyor, yine koşmuyor).
 *
 * Kalıcı çözüm `scripts/ts-yukle.mjs` — `check-bg.mjs` ona geçti ve
 * hiç geçici dosya üretmiyor. Buranın geçişi ayrı bir iş: bu betiğin
 * dökümü 170 satırlık bir şablon ve gerçek koda çevrilmesi gerekiyor.
 */
const testDosyasi = join('src', '__kural_dokum.test.ts');
const temizle = () => {
  if (existsSync(testDosyasi)) unlinkSync(testDosyasi);
};
temizle();

writeFileSync(
  testDosyasi,
  `import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { TOWERS, tierAt } from './data/towers';
import { KISLA, barracksTierAt, BLOCK, SOLDIER_SPEED, MELEE_DPS_PER_POINT, meleeDps } from './data/barracks';
import { ENEMIES, getEnemyForMap } from './data/enemies';
import { BOSS_ARMOR_BY_MAP, BOSS_HP_BY_MAP } from './data/bossScaling';
import { MAPS, COVERAGE_REFERENCE_RANGE } from './data/maps';
import { wavesFor, budget, wavePoints, waveEnemyCount, spawnDelayFor } from './data/waves';
import { ABILITIES, YETENEK_SEVIYE_SAYISI, METEOR_HASAR, TAKVIYE_ASKER, yetenekYukseltmeFiyati } from './data/abilities';
// Y03 Adım 3 / S76: dal adları artık strings.ts anahtarı. Doküman
// Türkçe, o yüzden burada açıkça tr sözlüğünden çözülüyor — etkin
// dilden (t()) DEĞİL, yoksa doküman oyuncunun diline göre değişirdi.
// (Ters tırnak YOK: bu satırlar kurallar.mjs içinde bir şablon
// dizesinin içinde yaşıyor, ters tırnak onu erken kapatıyor.)
import { STRINGS } from './data/strings';
import { closestPointOnPaths } from './util/math';
const dalAdi = (k) => (k === undefined ? null : STRINGS.tr[k]);
// M103 — düşman adları da aynı adresten. Önceden bu betikte elle
// yazılmış bir harita vardı ve Tünelci'yi (M12) saymıyordu.
// (Ters tırnak YOK — yukarıdaki not.)
import { AD_ANAHTARI } from './fx/enemyLabel';
import { BALANCE, POOL_PREALLOC, MERMI_HIZI, MERMI_ISABET_YARICAPI, SPAWN_K } from './data/balance';
import { EFFECT_SCALE, DEFAULT_SETTINGS, reducedMotionDefaults } from './systems/Settings';
import { SHAKE_MIN_SEC, SHAKE_MAX_SEC } from './fx/ScreenShake';
import { HITSTOP_MIN_MS, HITSTOP_MAX_MS } from './fx/HitStop';
import { applyDamage } from './systems/combat';
import { buildReferenceBoards, ceilingAPerBranch, effectiveHp, effectiveDps, BOSS_CEILING_RATIO, cumulativeGold, spotsFullAtWave, KISLA_ILE_DOGRULANAN } from './systems/balanceChecks';
// S109/S92 — referans ölçümün TEK adresi. Bu betik M80'e kadar çifti
// kendi kuruyordu (gerçekçi tahta + politikasız sim) ve belgeye iyimser
// sayı basıyordu; testler aynı kusuru S109'da kapatmıştı.
import { referansKosu, referansCanKaybi } from './systems/referansOlcum';
import { measureCoverage } from './util/coverage';
import { DIFFICULTY, DEFAULT_DIFFICULTY } from './data/difficulty';

it('dokum', () => {
  const AD = ['T1', 'T2', 'T3a', 'T3b'];

  const kuleler = TOWERS.map((t) => ({
    id: t.id, role: t.role, damageType: t.damageType,
    kademeler: [0, 1, 2, 3].map((i) => {
      const k = tierAt(t, i);
      return { ad: AD[i], branchName: dalAdi(k.branchNameKey), cost: k.cost, damage: k.damage,
        fireRate: k.fireRate, range: k.range, splashRadius: k.splashRadius ?? null,
        airMultiplier: k.airMultiplier, effect: k.effect ?? null,
        dps: +(k.damage * k.fireRate).toFixed(2) };
    }),
  }));

  const kisla = {
    role: KISLA.role,
    kademeler: [0, 1, 2, 3].map((i) => {
      const k = barracksTierAt(KISLA, i);
      return { ad: AD[i], branchName: dalAdi(k.branchNameKey), cost: k.cost, soldierCount: k.soldierCount,
        soldierHp: k.soldierHp, soldierDps: k.soldierDps, respawnSeconds: k.respawnSeconds,
        shield: k.shield ?? null, evasion: k.evasion ?? null };
    }),
  };

  const dusmanlar = ENEMIES.map((e) => ({
    id: e.id, hp: e.hp, speed: e.speed, armor: e.armor, magicResist: e.magicResist,
    gold: e.gold, points: e.points, leakDamage: e.leakDamage, flying: e.flying,
    ability: e.ability ?? null, meleeDps: +meleeDps(e).toFixed(2),
  }));

  // Etkin DPS matrisi (12 kademe × 10 düşman)
  const matris = [];
  for (const t of TOWERS) {
    for (let i = 0; i < 4; i++) {
      const k = tierAt(t, i);
      matris.push({
        kule: t.id, kademe: AD[i], dal: dalAdi(k.branchNameKey),
        hucre: ENEMIES.map((e) => {
          const carpan = e.flying ? k.airMultiplier : 1;
          if (carpan === 0) return null;
          let d = applyDamage(k.damage * carpan, t.damageType, e).dealt * k.fireRate;
          if (k.effect?.kind === 'burn') d += k.effect.dps;
          return +d.toFixed(2);
        }),
      });
    }
  }

  const haritalar = MAPS.map((m) => {
    // \`wavesFor\` — elle tutulan id->dalga tablosu DEĞİL. Harita 4 eklenince
    // o tablo güncellenmedi ve dokümanda sessizce boş dalga listesi, boş
    // Kısıt A tablosu ve \"0 sızıntı\" yazdı (ölçüm 10 diyordu).
    const w = wavesFor(m.id);
    const kaps = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
    const boards = buildReferenceBoards(m, w, kaps, false);
    const b10 = boards[9];
    const sim = referansKosu(m);
    const kolOrt = (kol) => { const g = kol.filter((c) => c.coveredPx > 0);
      return { n: g.length, ort: +(g.reduce((a, c) => a + c.coveredPx, 0) / g.length).toFixed(1) }; };
    return {
      id: m.id, hpMultiplier: m.hpMultiplier, goldMultiplier: m.goldMultiplier,
      costMultiplier: m.costMultiplier ?? 1,
      startGold: m.startGold, spots: m.buildSpots.length, kollar: m.paths.length,
      roster: m.enemyRoster, ucanHat: m.flyerPaths.length,
      kapsama: m.coverage.map((c) => ({ i: c.spotIndex, px: +c.coveredPx.toFixed(1) })),
      kolKapsama: m.branchCoverage.map(kolOrt),
      ucanKesen: measureCoverage(m.flyerPaths, m.buildSpots, COVERAGE_REFERENCE_RANGE).filter((c) => c.coveredPx > 0).length,
      bossZirh: BOSS_ARMOR_BY_MAP[m.id], bossHp: BOSS_HP_BY_MAP[m.id],
      noktaDolma: spotsFullAtWave(boards, m.buildSpots.length),
      altinMuhafazakar: cumulativeGold(m, w, 10, false),
      altinGercekci: cumulativeGold(m, w, 10, true),
      tahta10: b10 ? { kule: b10.towers.map((t) => \`\${t.towerId}T\${t.tier + 1}@\${t.spotIndex}\`),
        kisla: (b10.barracks ?? []).map((b) => \`T\${b.tier + 1}@\${b.spotIndex}\`), maliyet: b10.cumulativeCost } : null,
      kisitA: m.enemyRoster.map((id) => {
        const e = getEnemyForMap(id, m);
        if (!e || !b10) return null;
        const kollar = ceilingAPerBranch(b10, e, m);
        const tavan = Math.min(...kollar);
        return { id, eHp: Math.round(effectiveHp(e, m)), tavan: Math.round(tavan),
          kollar: kollar.map((k) => Math.round(k)),
          oran: tavan > 0 ? +((effectiveHp(e, m) / tavan) * 100).toFixed(1) : null };
      }).filter(Boolean),
      canKaybi: sim.reduce((t, r) => t + Object.entries(r.leakedByEnemy).reduce((a, [id, v]) => a + (getEnemyForMap(id, m)?.leakDamage ?? 0) * v, 0), 0),
      odaklanma: { atilan: Math.round(sim.reduce((t, r) => t + r.atilanHasar, 0)),
        ucus: Math.round(sim.reduce((t, r) => t + r.bosaUcusta, 0)),
        asiri: Math.round(sim.reduce((t, r) => t + r.bosaAsiri, 0)),
        bosa: Math.round(sim.reduce((t, r) => t + r.bosaUcusta + r.bosaAsiri, 0)) },
      dogumBaskisi: (() => {
        const d = new Array(10).fill(0);
        for (const r of sim) {
          for (const [no, can] of Object.entries(r.canDogumDalgasina)) {
            const i = Number(no) - 1;
            if (i >= 0 && i < 10) d[i] += can;
          }
        }
        return d;
      })(),
      kisitB: { sizanAdet: sim.reduce((t, r) => t + r.leakedCount, 0),
        sizanHp: Math.round(sim.reduce((t, r) => t + r.leakedHp, 0)),
        dalga: sim.map((r) => r.leakedCount),
        kirilim: sim.reduce((acc, r) => { for (const [id, v] of Object.entries(r.leakedByEnemy)) acc[id] = (acc[id] ?? 0) + v; return acc; }, {}) },
      dalgalar: w.map((x) => ({ index: x.index, butce: budget(x.index), puan: wavePoints(x),
        adet: waveEnemyCount(x), aralik: +spawnDelayFor(waveEnemyCount(x)).toFixed(2),
        gruplar: x.groups.map((g) => ({ enemy: g.enemy, count: g.count, spawnPoint: g.spawnPoint, startAt: g.startAt })) })),
    };
  });

  const zorluk = {
    varsayilan: DEFAULT_DIFFICULTY,
    seviyeler: Object.entries(DIFFICULTY).map(([ad, d]) => ({
      ad,
      hpScale: d.hpScale,
      startLives: d.startLives,
      recordStars: d.recordStars,
      // Referans tahtanın o seviyede kaybettiği can — harita başına.
      // \`hpScale\` SIMULASYONA veriliyor; \`hpMultiplier\`i çarpmak aynı şey
      // DEĞİL — o boss'u ölçeklemiyor (S92).
      canKaybi: MAPS.map((m) => referansCanKaybi(m, d.hpScale)),
    })),
  };

  const veri = {
    kuleler, kisla, dusmanlar, matris, haritalar, zorluk,
    yetenekler: ABILITIES.map((a) => ({ ...a })),
    yetenekSeviye: { sayi: YETENEK_SEVIYE_SAYISI, meteor: [...METEOR_HASAR], takviye: [...TAKVIYE_ASKER],
      fiyat: MAPS.map((m) => ({ id: m.id,
        basamaklar: Array.from({ length: YETENEK_SEVIYE_SAYISI - 1 }, (_, i) => yetenekYukseltmeFiyati(i + 1, m)) })) },
    // Boss işareti de türetiliyor: §5'e göre sızan can normalde 1-2,
    // bossta 10 — yani en büyük leakDamage bossu veriyor.
    dusmanAdi: (() => {
      const enBuyuk = Math.max(...ENEMIES.map((e) => e.leakDamage));
      return Object.fromEntries(ENEMIES.map((e) => [e.id,
        STRINGS.tr[AD_ANAHTARI[e.id]] + (e.leakDamage === enBuyuk ? ' (boss)' : '')]));
    })(),
    // M138 — belge 'uc haritanin da' diyordu, harita alti. Sayi da
    // mesafe de artik OLCULUYOR: butun haritalarin yapi noktalari
    // arasinda yola en yakin olani.
    yolaEnYakinNokta: Math.min(...MAPS.map((m) =>
      Math.min(...m.buildSpots.map((s) => Math.sqrt(closestPointOnPaths(s, m.paths).distSq))))),
    blok: { ...BLOCK }, soldierSpeed: SOLDIER_SPEED, meleeK: +MELEE_DPS_PER_POINT.toFixed(4),
    balance: { startLives: BALANCE.startLives, sellRefund: BALANCE.sellRefund, damageFloor: BALANCE.damageFloor,
      prepSeconds: BALANCE.prepSeconds, earlyBonusFrom: BALANCE.earlyBonusFrom,
      safetyMargin: BALANCE.safetyMargin, breatherWaves: BALANCE.breatherWaves, breatherFactor: BALANCE.breatherFactor,
      budgetBase: BALANCE.budgetBase, budgetGrowth: BALANCE.budgetGrowth, spawnK: SPAWN_K,
      waveEndBonus: [1, 5, 10].map((n) => ({ n, v: BALANCE.waveEndBonus(n) })) },
    havuz: { ...POOL_PREALLOC }, mermiHizi: MERMI_HIZI, isabetYaricapi: MERMI_ISABET_YARICAPI,
    bossOran: BOSS_CEILING_RATIO, kislaIle: [...KISLA_ILE_DOGRULANAN],
    kapsamaMenzil: COVERAGE_REFERENCE_RANGE,
    ayarlar: { efektOlcek: EFFECT_SCALE, varsayilan: DEFAULT_SETTINGS, azaltilmis: reducedMotionDefaults() },
    juice: { shakeMin: SHAKE_MIN_SEC, shakeMax: SHAKE_MAX_SEC, hitStopMin: HITSTOP_MIN_MS, hitStopMax: HITSTOP_MAX_MS },
    dpsOrnek: { okcuT2Boss: +effectiveDps(TOWERS[0], 1, ENEMIES.find((e) => e.id === 'ogreSef')).toFixed(2) },
  };
  writeFileSync(${JSON.stringify(veriYolu)}, JSON.stringify(veri));
}, 60000);
`,
  'utf8',
);

try {
  execSync(`npx vitest run ${testDosyasi}`, { stdio: 'pipe' });
} finally {
  temizle();
}
const D = JSON.parse(readFileSync(veriYolu, 'utf8'));

/**
 * Bekçi kurallarının adları — `M100`. §17'nin listesi elle yazılıydı ve
 * on satır gösteriyordu; bekçi o gün on dokuz kural koşuyordu.
 *
 * Bekçiyi **koşturup** çıktısındaki kural adlarını okuyor. Bekçinin
 * metnini taramak da denendi ve aynı tuzağa düştü: düzenli ifadedeki
 * geri başvuru katmanlarda **0x01 baytına** dönüştü (18. kural
 * başlığındaki sözcük-sınırı uyarısının ikizi). Koşturmak hem kesin
 * hem ucuz — üstelik adlardaki çalışma zamanı sayıları (bulunan test
 * dosyası sayısı gibi) da doğru geliyor.
 *
 * Bekçi kırmızı dönerse `execSync` fırlatıyor; çıktı yine okunuyor,
 * çünkü belge kural **listesini** anlatıyor, sonucu değil.
 */
D.bekciler = (() => {
  let cikti = '';
  try {
    cikti = execSync(`node ${JSON.stringify(join(import.meta.dirname, 'guard-rules.mjs'))}`,
      { encoding: 'utf8' });
  } catch (e) {
    cikti = String(e.stdout ?? '');
  }
  // Satır ayracı `String.fromCharCode(10)` ile yazılı: bu dosyaya
  // kaçış dizisi taşıyan katmanlar onu **gerçek** satır sonuna
  // çeviriyor ve düzenli ifade kırılıyor (18. kuralın başındaki uyarı).
  const adlar = cikti.split(String.fromCharCode(10))
    .map((satir) => /^\s*[✓✗]\s+(.*\S)\s*$/.exec(satir))
    .filter((m) => m !== null)
    .map((m) => m[1]);
  if (adlar.length === 0) throw new Error('bekçi kuralları okunamadı — §17 boş kalırdı');
  return adlar;
})();

// ---------------------------------------------------------------- yardımcılar
const n = (x) => (x === null || x === undefined ? '—' : String(x).replace('.', ','));
/**
 * Yüzde biçimi — **yuvarlama zorunlu** (`M78`).
 *
 * `0,55 × 100` JavaScript'te `55.00000000000001` ediyor ve bu sayı
 * GAME-DESIGN §4.3'ün zincir satırına aynen yazılmıştı.
 *
 * Tek bir yeri düzeltmek yetmezdi: üretici **altı ayrı yerde** ham
 * `× 100` yapıyordu ve hangisinin patlayacağı sabitin ikilik tabanda
 * temsil edilebilirliğine bağlı — yani sessiz bir kur'a. `0,5` ve `0,15`
 * temiz çıkıyor, `0,55` çıkmıyor. Hepsi artık buradan geçiyor ve
 * çıktı `artikDenetle` ile ayrıca sınanıyor.
 */
const yuzde = (x, basamak = 1) =>
  x === null ? '—' : `%${String(Number(Number(x).toFixed(basamak))).replace('.', ',')}`;
const tablo = (basliklar, satirlar) =>
  [`| ${basliklar.join(' | ')} |`, `|${basliklar.map(() => '---').join('|')}|`, ...satirlar.map((s) => `| ${s.join(' | ')} |`)].join('\n');

/**
 * Dokümandaki harita başlıkları. Sıra numarası `MAPS` dizisinden geliyor,
 * elle yazılmıyor.
 *
 * `?? m.id` düşüşü **bilerek yok**: harita 4 eklenince tablolarda ham
 * `kar-gecidi` yazdı ve kimse fark etmedi. Eksik ad artık `npm run build`'i
 * durduruyor — denge dokümanı sessizce bozulmasın.
 */
const HARITA_GOSTERIM_ADI = {
  'degirmen-gecidi': 'Değirmen Geçidi',
  'tas-kopru': 'Taş Köprü',
  'kul-ovasi': 'Kül Ovası',
  'kar-gecidi': 'Kar Geçidi',
  'kadim-harabe': 'Kadim Harabe',
  'sisli-bataklik': 'Sisli Bataklık',
};
/** Zorluk adını olduğu gibi yazan küçük yardımcı (harita adı tablosuyla karışmasın). */
/**
 * Düşman gösterim adları. `HARITA_GOSTERIM_ADI` ile aynı disiplin: eksik ad
 * derlemeyi **durduruyor**, çünkü ham kimlik (`orkSavasci`) tasarım
 * dokümanında okunmuyor ve sessizce oraya sızmıştı (`M49`).
 */
const DUSMAN_GOSTERIM_ADI = {
  goblin: 'Goblin',
  orkSavasci: 'Ork Savaşçı',
  kurtBinicisi: 'Kurt Binicisi',
  harpi: 'Harpi',
  zirhliOrk: 'Zırhlı Ork',
  saman: 'Şaman',
  trol: 'Trol',
  orumcekAna: 'Örümcek Ana',
  orumcekYavrusu: 'Örümcek Yavrusu',
  tunelci: 'Tünelci',
  ogreSef: '**Ogre Şef** (boss)',
};

const dusmanAdi = (id) => {
  const ad = DUSMAN_GOSTERIM_ADI[id];
  if (ad === undefined) {
    throw new Error(`kurallar.mjs: '${id}' için gösterim adı yok — DUSMAN_GOSTERIM_ADI'ya ekle.`);
  }
  return ad;
};

const HARITA_ADI_YOK = (x) => String(x);

const HARITA_ADI = Object.fromEntries(
  D.haritalar.map((m, i) => {
    const ad = HARITA_GOSTERIM_ADI[m.id];
    if (ad === undefined) {
      throw new Error(
        `kurallar.mjs: '${m.id}' için gösterim adı yok — HARITA_GOSTERIM_ADI'ya ekle.`,
      );
    }
    return [m.id, `${i + 1} · ${ad}`];
  }),
);
/**
 * **`M103`: türetiliyor, elle yazılmıyor.** Burası on düşman yazan bir
 * nesneydi; `M12` Tünelci'yi ekledi ve bu liste büyümedi, yani belge
 * oyuncunun “Tünelci” gördüğü yerde ham kimlik (`tunelci`) basıyordu —
 * Kısıt A tablosunda, sızıntı kırılımında ve dalga bileşimlerinde.
 * Kaynak artık oyunun kendi adresi (`fx/enemyLabel.AD_ANAHTARI`).
 */
const DUSMAN_ADI = D.dusmanAdi;
const KULE_ADI = { okcu: 'Okçu', top: 'Top', buyu: 'Büyü' };

const b = [];
const y = (...s) => b.push(...s);

/**
 * **Kayan nokta artığı belgeye sızmasın** — `M78`.
 *
 * `yuzde()` artık yuvarlıyor, ama bu kontrol **sınıfı** kapatıyor:
 * yeni bir tablo ham `× 100` ile yazılırsa üretim burada durur,
 * sessizce belgeye geçmez. Eksik marker'ın üretimi durdurmasıyla (`M49`)
 * aynı desen.
 *
 * Altı basamağın altı serbest: meşru ondalıklar (`0,45` · `23,4` ·
 * süreler) oraya girmiyor, ikilik taban artığı ise her zaman 10+ basamak.
 */
function artikDenetle(metin, dosya) {
  // `split` argumani kacis icermiyor: bu dosya bir uretici ve
  // kacis karakterleri duzenleme sirasinda sessizce bozulabiliyor.
  const satirlar = metin.split(String.fromCharCode(10));
  for (let i = 0; i < satirlar.length; i += 1) {
    const m = /\d\.\d{6,}/.exec(satirlar[i]);
    if (m !== null) {
      throw new Error(
        `${dosya}:${i + 1} — kayan nokta artığı (${m[0]}). Ham × 100 yerine yuzde() kullan.`,
      );
    }
  }
}

const kurallarMetni = olustur();
artikDenetle(kurallarMetni, 'docs/KURALLAR.md');
writeFileSync('docs/KURALLAR.md', kurallarMetni, 'utf8');
process.stdout.write('docs/KURALLAR.md yazıldı\n');

gameDesignGuncelle();
artikDenetle(readFileSync('docs/GAME-DESIGN.md', 'utf8'), 'docs/GAME-DESIGN.md');

/**
 * **`GAME-DESIGN.md`'nin SAYISAL tabloları da buradan üretiliyor** — `M49`.
 *
 * Neden gerekti: `KURALLAR.md` bu betikten üretildiği için hiç ayrışmıyor,
 * ama `GAME-DESIGN.md` elle yazılıyordu ve `M48`'de **dört tablosu birden**
 * bozuk çıktı — harita tablosu üç haritayı hiç listelemiyordu (M8'den beri)
 * ve boss tablosunun altı satırından beşi yanlıştı. Aradan M14, M18, M20,
 * M22, M47 geçmiş, her biri çarpanları yeniden türetmiş, tablolar hiç
 * güncellenmemişti.
 *
 * Doküman **elle yazılmaya devam ediyor** — üretilen yalnız işaretli
 * bloklar. Sınır şu: **bir sayı `src/data`'dan okunabiliyorsa üretilir,
 * okunamıyorsa (tema, yol geometrisi, tasarım gerekçesi) elle kalır.**
 * Tasarım dokümanının değeri düzyazısında; sayıları da ele geçirmek onu
 * ikinci bir `KURALLAR.md` yapardı.
 *
 * Eksik işaretçi **sessizce geçilmiyor**: blok bulunamazsa derleme durur,
 * yoksa tablo yeniden elle düzenlenmeye başlar ve `M48` tekrarlanır.
 */
function gameDesignGuncelle() {
  const yol = 'docs/GAME-DESIGN.md';
  let metin = readFileSync(yol, 'utf8');
  const bloklar = {
    harita: haritaTablosu(),
    dusman: dusmanTablosu(),
    boss: bossTablosu(),
    rampa: rampaTablosu(),
    'kule-okcu': kuleTablosu('okcu'),
    'kule-top': kuleTablosu('top'),
    'kule-buyu': kuleTablosu('buyu'),
    'kule-kisla': kislaTablosu(),
    kadro: kadroTablosu(),
  };
  for (const [ad, icerik] of Object.entries(bloklar)) {
    const bas = `<!-- ÜRETİLEN:${ad} -->`;
    const son = `<!-- /ÜRETİLEN:${ad} -->`;
    const i = metin.indexOf(bas);
    const j = metin.indexOf(son);
    if (i < 0 || j < 0 || j < i) {
      throw new Error(
        `GAME-DESIGN.md: "${ad}" işaretçisi yok ya da bozuk — tablo elle düzenlenmiş olabilir`,
      );
    }
    metin = metin.slice(0, i + bas.length) + '\n' + icerik + '\n' + metin.slice(j);
  }
  writeFileSync(yol, metin, 'utf8');
  process.stdout.write('docs/GAME-DESIGN.md tabloları güncellendi\n');
}

function haritaTablosu() {
  return tablo(
    ['#', 'Ad', 'Yapı noktası', 'Giriş', 'HP çarpanı', 'Altın çarpanı', 'Başlangıç altını'],
    D.haritalar.map((m, i) => [
      String(i + 1),
      HARITA_GOSTERIM_ADI[m.id],
      String(m.spots),
      String(m.kollar),
      n(m.hpMultiplier),
      n(m.goldMultiplier),
      String(m.startGold),
    ]),
  );
}

function dusmanTablosu() {
  const ozellik = (e) => {
    if (e.flying) return '**Uçar** — yolu takip etmez, engellenemez';
    const a = e.ability;
    if (!a) return '—';
    if (a.kind === 'heal') return `Yakındakilere ${a.hps} HP/sn iyileştirme (yarıçap ${a.radius})`;
    if (a.kind === 'regen') return `${a.hps} HP/sn yenilenme`;
    if (a.kind === 'split') return `Ölünce ${a.count}× yavru`;
    if (a.kind === 'burrow')
      return `**Yeraltı geçişi** — yolun ${yuzde(a.fromFraction * 100)}-${yuzde(a.toFraction * 100)} arasında hedeflenemez`;
    if (a.kind === 'summon') return `Canı düştükçe ${a.count} yandaş çağırır`;
    return a.kind;
  };
  return tablo(
    ['Düşman', 'HP', 'Hız', 'Zırh', 'B.Direnç', 'Altın', 'Puan', 'Sızma', 'Özellik'],
    D.dusmanlar.map((e) => [
      dusmanAdi(e.id),
      String(e.hp),
      String(e.speed),
      String(e.armor),
      n(e.magicResist),
      String(e.gold),
      String(e.points),
      String(e.leakDamage),
      ozellik(e),
    ]),
  );
}

function bossTablosu() {
  return tablo(
    ['Harita', 'Zırh', 'Boss HP', 'Tavanın oranı (ölçülen)'],
    D.haritalar.map((m, i) => {
      const k = m.kisitA.find((x) => x.id === 'ogreSef');
      return [
        HARITA_ADI[m.id],
        String(m.bossZirh),
        String(m.bossHp),
        k ? yuzde(k.oran) : '—',
      ];
    }),
  );
}

/**
 * **Bir T3 dalının etki metni** — sayı değil, sayının anlamı.
 *
 * `M48`'de kule tablolarında iki eski hasar bulundu (Keskin Nişancı 34,
 * gerçek 41; Yıldırım 30, gerçek 36). `M49`'da tablolar üreticiye geçti,
 * ama "hasar" sütunu salt sayı değil: yanma/zincir/yavaşlatma orada
 * anlatılıyor. Bu fonksiyon o cümleyi **veriden** kuruyor.
 */
function etkiCumlesi(k) {
  const e = k.effect;
  if (!e) return n(k.damage);
  if (e.kind === 'burn') return `${n(k.damage)} + **${e.dps}**/sn yanma (${e.seconds} sn)`;
  // `M76`: "%70 azalarak" YANLIŞTI. Kod `hasar *= falloff` yapıyor, yani
  // 0,7 hasarı %70'ine **düşürüyor** (=%30 azalıyor). Metin tersini
  // öğretiyordu — CLAUDE.md TIER 2'nin "oyuncuya sessizce yanlış kural
  // öğretme" kusur sınıfı.
  if (e.kind === 'chain')
    return `**${n(k.damage)}**, ${e.targets} hedefe zincirleme (her sıçramada ${yuzde(e.falloff * 100)}'ine düşerek)`;
  if (e.kind === 'slow') return `${n(k.damage)} + ${yuzde(e.factor * 100)} yavaşlatma (${e.seconds} sn)`;
  return n(k.damage);
}

function kuleTablosu(id) {
  const t = D.kuleler.find((x) => x.id === id);
  if (!t) throw new Error(`kurallar.mjs: '${id}' kulesi dökümde yok`);
  const patlamaVar = t.kademeler.some((k) => k.splashRadius);
  const basliklar = ['Kademe', 'Maliyet', 'Hasar', 'Atış/sn', 'Menzil'];
  if (patlamaVar) basliklar.push('Yarıçap');
  basliklar.push('Uçan');
  return tablo(
    basliklar,
    t.kademeler.map((k) => {
      const satir = [
        k.branchName ? `${k.ad} ${k.branchName}` : k.ad,
        String(k.cost), etkiCumlesi(k), n(k.fireRate), String(k.range),
      ];
      if (patlamaVar) satir.push(k.splashRadius ? String(k.splashRadius) : '—');
      satir.push(k.airMultiplier === 0 ? '**vuramaz**' : k.airMultiplier === 1 ? 'tam' : yuzde(k.airMultiplier * 100));
      return satir;
    }),
  );
}

function kislaTablosu() {
  return tablo(
    ['Kademe', 'Maliyet', 'Asker', 'Asker HP', 'Asker DPS', 'Diriliş (sn)', 'Ek'],
    D.kisla.kademeler.map((k) => [
      k.branchName ? `${k.ad} ${k.branchName}` : k.ad,
      String(k.cost), String(k.soldierCount), String(k.soldierHp),
      String(k.soldierDps), n(k.respawnSeconds),
      k.shield ? `kalkan ${k.shield}` : k.evasion ? `kaçınma ${yuzde(k.evasion * 100)}` : '—',
    ]),
  );
}

/**
 * **Harita başına YENİ tanıtılan düşmanlar** — `M50`.
 *
 * Elle yazılıyken üç haritada kalmıştı (harita 4-6 `M8`'de geldi, tablo
 * büyümedi). Sütun tamamen türetilebilir: her haritanın `enemyRoster`'ı
 * ile önceki haritaların birleşimi arasındaki **fark**.
 *
 * `orumcekYavrusu` listeden çıkarılıyor: kadroda var ama dalgaya elle
 * konmuyor (yalnız Örümcek Ana bölününce doğuyor), yani "bu haritada
 * tanıtılan düşman" değil.
 */
function kadroTablosu() {
  const gorulen = new Set();
  return tablo(
    ['Harita', 'Yeni düşmanlar'],
    D.haritalar.map((m) => {
      const yeni = m.roster.filter((id) => id !== 'orumcekYavrusu' && !gorulen.has(id));
      for (const id of m.roster) gorulen.add(id);
      return [HARITA_ADI[m.id], yeni.length ? yeni.map(dusmanAdi).join(', ') : '— (yeni tip yok)'];
    }),
  );
}

function rampaTablosu() {
  const seviye = (ad) => D.zorluk.seviyeler.find((z) => z.ad === ad);
  const normal = seviye('normal');
  const kolay = seviye('kolay');
  return tablo(
    ['Harita', 'HP çarpanı', 'Altın çarpanı', 'Normal = Zor', 'Kolay (×0,80)'],
    D.haritalar.map((m, i) => [
      HARITA_ADI[m.id],
      n(m.hpMultiplier),
      n(m.goldMultiplier),
      String(normal?.canKaybi?.[i] ?? '—'),
      String(kolay?.canKaybi?.[i] ?? '—'),
    ]),
  );
}

function olustur() {
  y(`# Kale Nöbeti — Kural ve Sayı Referansı`, '');
  y(`> **Bu dosya ÜRETİLİYOR.** Elle düzenlemeyin — \`node scripts/kurallar.mjs\``);
  y(`> her sayıyı \`src/data/*\` içinden canlı okur ve bu dosyayı yeniden yazar.`);
  y(`> Bir kuleyi değiştirip betiği koşturmak dokümanı da günceller; böylece`);
  y(`> doküman ile kod **ayrışamaz**. Projenin en pahalı hatası (2200 HP'lik,`);
  y(`> öldürülemez boss) tam olarak böyle bir ayrışmadan çıkmıştı.`, '');
  y(`**Bir sayıyı değiştirmek için:** aşağıdaki tabloda sayının yanında yazan`);
  y(`kaynak dosyayı aç, değiştir, \`npm run test\` koş. Denge testleri kırılırsa`);
  y(`sayı dengeyi bozuyor demektir — test yanlış değil.`, '');

  y(`## İçindekiler`, '');
  y([
    '1. [Pazarlıksız kurallar (TIER 1)](#1-pazarlıksız-kurallar-tier-1)',
    '2. [Hasar modeli](#2-hasar-modeli)',
    '3. [Kuleler](#3-kuleler)',
    '4. [Kışla ve askerler](#4-kışla-ve-askerler)',
    '5. [Dokuz engelleme kuralı](#5-dokuz-engelleme-kuralı)',
    '6. [Düşmanlar](#6-düşmanlar)',
    '7. [Boss ölçeklemesi](#7-boss-ölçeklemesi)',
    '8. [Etkin DPS matrisi](#8-etkin-dps-matrisi)',
    '9. [Yetenekler](#9-yetenekler)',
    '10. [Ekonomi](#10-ekonomi)',
    '11. [Dalgalar](#11-dalgalar)',
    '12. [Haritalar](#12-haritalar)',
    '13. [Denge sağlamaları](#13-denge-sağlamaları)',
    '14. [Juice ve ayarlar](#14-juice-ve-ayarlar)',
    '15. [Teknik bütçeler](#15-teknik-bütçeler)',
    '16. [Uydurulmayan sayılar](#16-uydurulmayan-sayılar)',
    '17. [Bekçiler](#17-bekçiler)',
  ].map((x) => `${x}`).join('\n'), '');

  // ---------------------------------------------------------------- 1
  y('---', '', '## 1. Pazarlıksız kurallar (TIER 1)', '');
  y(`Kaynak: \`CLAUDE.md\`. Bunlar tartışmaya kapalı; ihlal eden kod merge edilmez.`, '');
  y(tablo(['#', 'Kural', 'Neden'], [
    ['1', 'Denge verisi **asla koda gömülmez**', '`src/data/*.ts` tek adres. Bir kulenin hasarını değiştirmek için sistem dosyasına dokunulmaz'],
    ['2', 'İlk indirme **≤ 8 MB**', 'Poki limiti. 5 MB uyarı, 8 MB hata'],
    ['3', '**Nesne havuzu zorunlu**', 'Oyun içinde `new` ile mermi/düşman yaratılmaz. Havuza dönen nesne **tüm** durumunu sıfırlar'],
    ['4', 'Yol bulma **dinamik değil**', 'Sabit waypoint dizisi. A* veya flow field yok'],
    ['5', '`any` **yasak**', 'TypeScript strict'],
    ['6', '**Erişilebilirlik tabanı**', 'Sarsıntı ve parçacık kapatılabilir; `prefers-reduced-motion` saygı görür; düşman/dost ayrımı yalnız renge dayanmaz'],
    ['7', 'Değişen metin **`BitmapText`**', '`Text` içeriği her değişimde canvas yeniden üretip GPU\'ya yüklüyor'],
    ['8', 'Ham `delta` **yasak**', 'Her şey `GameClock.scaledDelta` üzerinden. `setScale` üç Phaser özelliğini de yazar'],
    ['9', 'Mesafe kontrolleri **karesel**', '`Math.sqrt` çağrılmaz (konum hesabı hariç)'],
    ['10', '`localStorage` **`try/catch` içinde**', 'Gizli sekmede istisna fırlatıyor; sarılmazsa oyun açılışta çöker'],
    ['11', '`systems/`,`util/`,`data/`,`types/` Phaser\'ı **yalnız `import type`**', 'Testler `node` ortamında koşuyor; saf mantık Phaser yüklerse `window` arar ve patlar'],
  ]), '');

  // ---------------------------------------------------------------- 2
  y('---', '', '## 2. Hasar modeli', '');
  y(`Kaynak: \`src/systems/combat.ts\` · \`GAME-DESIGN.md\` §3`, '');
  y(tablo(['Tip', 'Nasıl azalır', 'Kim kullanır'], [
    ['`physical`', 'Zırh kadar **sabit miktar** düşer', 'Okçu, Top, askerler'],
    ['`magic`', 'Büyü direnci kadar **yüzde** azalır', 'Büyü kulesi'],
    ['`true`', '**Hiçbir şeyle azalmaz**', 'Yalnız Meteor'],
  ]), '');
  y(`**Hasar tabanı: \`${n(D.balance.damageFloor)}\`** — hiçbir vuruş tamamen emilmez, ham hasarın`);
  y(`en az bu oranı geçer. Gerekçe: "oyuncu tamamen yanlış kule kurduğunda oyun`);
  y(`kilitlenmez, sadece verimsizleşir. Ceza var ama duvar yok."`, '');
  y(`Tabana düşen vuruş ekranda **gri** ve yanında bir **kalkan** işaretiyle`);
  y(`çiziliyor (İşaret \`M106\`'da eklendi: \`DamageText\`'in kendi tablosu onu`);
  y(`vadediyordu ama kod yalnız rengi değiştiriyordu — TIER 1 kural 6 bilginin`);
  y(`yalnız renge dayanmamasını istiyor.) — oyuncu kulesinin işe`);
  y(`yaramadığını görmeli. Örnek: Okçu T2 (10 hasar) harita 1 boss'una`);
  y(`(zırh ${n(D.haritalar[0].bossZirh)}) saniyede 10 değil **${n(D.dpsOrnek.okcuT2Boss)}** veriyor.`, '');

  // ---------------------------------------------------------------- 3
  y('---', '', '## 3. Kuleler', '');
  y(`Kaynak: \`src/data/towers.ts\` · \`GAME-DESIGN.md\` §4.1–§4.3`, '');
  y(`Üç aile × 4 kademe. T2'den sonra **iki dal** var ve seçim geri alınamıyor`);
  y(`(değiştirmek için satmak gerekiyor, ${yuzde((1 - D.balance.sellRefund) * 100)} kayıp).`, '');
  for (const t of D.kuleler) {
    y('', `### ${KULE_ADI[t.id] ?? t.id} — ${t.role}`, '');
    y(`Hasar tipi: \`${t.damageType}\``, '');
    y(tablo(['Kademe', 'Maliyet', 'Hasar', 'Atış/sn', 'Ham DPS', 'Menzil', 'Patlama', 'Uçan çarpanı', 'Etki'],
      t.kademeler.map((k) => [
        k.branchName ? `**${k.ad}** ${k.branchName}` : `**${k.ad}**`,
        n(k.cost), n(k.damage), n(k.fireRate), n(k.dps), n(k.range),
        k.splashRadius ? `${n(k.splashRadius)} px` : '—',
        k.airMultiplier === 0 ? '**0** (vuramaz)' : `×${n(k.airMultiplier)}`,
        k.effect ? `\`${k.effect.kind}\` ${Object.entries(k.effect).filter(([q]) => q !== 'kind').map(([q, v]) => `${q}=${n(v)}`).join(' ')}` : '—',
      ])), '');
  }
  y(`**Hedefleme modları** (kule başına seçilir, varsayılan \`first\`):`, '');
  y(tablo(['Mod', 'Seçtiği'], [
    ['`first`', 'Kaleye **en yakın** — sızmayı önler'],
    ['`last`', 'Kaleye **en uzak** — Şaman gibi arkadaki destekçiler için'],
    ['`strongest`', '**Maksimum** HP\'si en yüksek (mevcut HP değil — hedef titremesini önlüyor)'],
    ['`weakest`', 'Mevcut HP\'si en düşük — bitirici vuruş'],
    ['`closest`', 'Kuleye öklit mesafesi en az'],
  ]), '');

  // ---------------------------------------------------------------- 4
  y('---', '', '## 4. Kışla ve askerler', '');
  y(`Kaynak: \`src/data/barracks.ts\` · \`GAME-DESIGN.md\` §4.4`, '');
  y(`**Kışla hasar vermez, zaman kazandırır.** Düşmanı durdurup diğer kulelerin`);
  y(`menzilinde tutar. Uçanlar engellenemez.`, '');
  y(tablo(['Kademe', 'Maliyet', 'Asker', 'Asker HP', 'Asker DPS', 'Diriliş', 'Kalkan', 'Kaçınma'],
    D.kisla.kademeler.map((k) => [
      k.branchName ? `**${k.ad}** ${k.branchName}` : `**${k.ad}**`,
      n(k.cost), n(k.soldierCount), n(k.soldierHp), n(k.soldierDps), `${n(k.respawnSeconds)} sn`,
      k.shield === null ? '**yok** (S43)' : n(k.shield),
      k.evasion === null ? '—' : yuzde(k.evasion * 100),
    ])), '');
  y(`**Asker yürüme hızı: ${n(D.soldierSpeed)} px/sn** (S68 — dokümanda yok, §5'in`);
  y(`ortanca düşman hızından alındı).`, '');
  y('', `### Düşmanın askere verdiği hasar — S66`, '');
  y(`**Dokümanda hiç yok.** Türetildi: \`K = 45 HP / 8 sn / 1 puan = ${n(D.meleeK)} DPS/puan\``);
  y(`— §4.4'ün T1 satırından (45 HP, 8 sn diriliş) ve §5'in puan ölçeğinden.`, '');
  y(tablo(['Düşman', 'Puan', 'Askere DPS', 'T1 askeri (45 HP) dayanma'],
    D.dusmanlar.filter((e) => e.points > 0).map((e) => [
      DUSMAN_ADI[e.id] ?? e.id, n(e.points), n(e.meleeDps),
      e.id === 'ogreSef' ? '**anlık** (kural 9)' : `${n((45 / e.meleeDps).toFixed(2))} sn`,
    ])), '');
  y(`Boss formüle **girmiyor** — §4.4 kural 9 onu tek vuruşla ayrı tutuyor.`, '');

  // ---------------------------------------------------------------- 5
  y('---', '', '## 5. Dokuz engelleme kuralı', '');
  y(`Kaynak: \`src/systems/BarracksSystem.ts\` · \`GAME-DESIGN.md\` §4.4`, '');
  y(`Türün en çok kenar durum üreten mekaniği. Her kural için ayrı test var.`, '');
  y(tablo(['Sabit', 'Değer', 'Anlamı'], [
    ['`aggroRadius`', `${n(D.blok.aggroRadius)} px`, 'Asker bu yarıçaptaki en yakın engellenmemiş düşmanı hedefler'],
    ['`contactRadius`', `${n(D.blok.contactRadius)} px`, 'Bu mesafede iki taraf kilitlenir, düşman **durur**'],
    ['`rallyRange`', `${n(D.blok.rallyRange)} px`, 'Toplanma noktası kışlaya en fazla bu kadar uzağa konabilir'],
    ['`pathSnapMax`', `${n(D.blok.pathSnapMax)} px`, 'Toplanma noktası yola bu kadar yakınsa yapışır; uzaksa konamaz'],
  ]), '');
  // M138 — basliktaki 'Dokuz' elle yazili, liste burada; ikisi
  // ayrisabilir. HARITA_GOSTERIM_ADI ile ayni disiplin: uyusmazsa
  // sessizce yanlis belge basmak yerine FIRLAT.
  const engellemeKurallari = [
    ['1', '`Soldier.engagedWith` ve `Enemy.blockedBy` alanları', 'Kilit **iki taraflı**; tek taraflı temizlik düşmanı sonsuza durdurur'],
    ['2', 'Aggro içindeki en yakın **engellenmemiş** düşmanı hedefle, temas mesafesinde kilitlen', 'Düşmanın yol ilerlemesi durur'],
    ['3', 'Bir düşmanı **birden çok asker** dövebilir; düşman **yalnız `blockedBy`** askerine hasar verir', 'Sayı üstünlüğü ikili kazanç: bedava DPS + tek hasar'],
    ['4', 'Kilit kırılır: asker ölür / düşman ölür. Aggro içinde serbest asker varsa **yeniden kilitlenir**', 'Temastaki ikinci asker **devralıyor** — yoksa düşman iki asker dövüşürken yürümeye devam ederdi'],
    ['5', 'Askerler düşmandan azsa fazlası **durmadan geçer**', '**Özel kod yok** — kural 1 ve 3\'ten doğal olarak çıkıyor'],
    ['6', 'Toplanma noktası menzil içinde ve **yola yapışık** olmalı', 'Kenetleme **önce**, yapışma **sonra**; ters sıra menzili aşardı'],
    ['7', 'Ölen asker diriliş sonrası kışlada doğar ve toplanma noktasına **yürür**; yürürken engellemez', 'Aksi hâlde diriliş döngüsü kilitlenirdi'],
    ['8', '`flying === true` ise asker onu **hedeflemez**', 'Uçanlar engellenemez'],
    ['9', 'Ogre Şef askerleri **tek vuruşta** öldürür', 'Kışla boss\'a karşı ~1 sn gecikme sağlar — bilinçli'],
  ];
  if (engellemeKurallari.length !== 9) {
    throw new Error(
      'kurallar.mjs: basliktaki "Dokuz engelleme kurali" ' +
        engellemeKurallari.length +
        ' satirla uyusmuyor — basligi ve icindekiler satirini da guncelle.',
    );
  }
  y(tablo(['#', 'Kural', 'Not'], engellemeKurallari), '');
  y(`**Sinerji:** iki kışlanın toplanma noktası aynı yere konursa verilen hasar`);
  y(`başına alınan hasar **yarıya** iniyor. Bu da kural 3'ten çıkıyor, özel kod yok.`, '');
  y(`**Varsayılan toplanma noktası kışlanın üstü OLAMAZ** — ${D.haritalar.length} haritanın da`);
  y(`yapı noktaları yoldan uzak: en yakını **${n(D.yolaEnYakinNokta)} px**, \`pathSnapMax\` ${n(D.blok.pathSnapMax)}.`);
  y(`\`defaultRally()\` yola en yakın noktayı veriyor.`, '');

  // ---------------------------------------------------------------- 6
  y('---', '', '## 6. Düşmanlar', '');
  y(`Kaynak: \`src/data/enemies.ts\` · \`GAME-DESIGN.md\` §5`, '');
  y(`HP ve altın **harita çarpanıyla** ölçekleniyor; hız, zırh, direnç ölçeklenmiyor.`, '');
  y(tablo(['Düşman', 'HP', 'Hız', 'Zırh', 'Büyü direnci', 'Altın', 'Puan', 'Sızma cezası', 'Uçar', 'Yetenek'],
    D.dusmanlar.map((e) => [
      DUSMAN_ADI[e.id] ?? e.id, n(e.hp), n(e.speed), n(e.armor), yuzde(e.magicResist * 100),
      n(e.gold), n(e.points), `${n(e.leakDamage)} can`, e.flying ? '**evet**' : '—',
      e.ability ? `\`${e.ability.kind}\` ${Object.entries(e.ability).filter(([q]) => q !== 'kind').map(([q, v]) => `${q}=${n(v)}`).join(' ')}` : '—',
    ])), '');
  y(`**Altın = 3 × puan** — §5'in evrensel oranı. Örümcek yavrusu istisna`);
  y(`(altın 0, puan 0): yavrudan altın gelseydi oran bozulurdu, puan gelseydi`);
  y(`dalga bütçesine iki kez sayılırdı.`, '');
  y('', `### Karşı-oyun tablosu — tasarımın omurgası`, '');
  y(tablo(['Tehdit', 'Doğru cevap'], [
    ['Kalabalık goblin', 'Top (alan hasarı)'],
    ['Zırhlı Ork', 'Büyü (zırhı yok sayar)'],
    ['Şaman', 'Keskin Nişancı — **`first` ile ODAKLAN**, `last` değil (S83)'],
    ['Harpi sürüsü', 'Okçu + Büyü tam hasar; Top T3 dalları %50 (T1/T2 vuramaz)'],
    ['Trol', 'Kışla ile tut + yoğun tek hedef'],
    ['Kurt Binicisi', 'Buz (yavaşlatmanın tek kaynağı) / Barut Fıçısı geniş patlama'],
    ['Ogre Şef', 'Büyü + Top, **`weakest`/`closest`** hedefleme (S94), Meteor'],
    ['Ogre Şef susturma (harita 4)', 'Cevap AILE degil YERLESIM: kapsamayi dagit, tek darbogaza yigma. Meteor acil cevap'],
  ]), '');

  // ---------------------------------------------------------------- 7
  y('---', '', '## 7. Boss ölçeklemesi', '');
  y(`Kaynak: \`src/data/bossScaling.ts\``, '');
  y(`**Boss HP'si \`700 × hpMultiplier\` DEĞİL — haritadan türetiliyor.**`, '');
  y(`\`700 × çarpan\` harita 2'de 1120, harita 3'te 1820 ediyordu ve o haritalarda`);
  y(`karşılanabilir hiçbir tahta bunu indiremiyordu (Kısıt A %165 ve %282).`, '');
  y(tablo(['Harita', 'Boss zırhı', 'Boss HP', 'Tavan', 'Oran (tek düşman tavanına)'],
    D.haritalar.map((m) => {
      const boss = m.kisitA.find((k) => k.id === 'ogreSef');
      return [HARITA_ADI[m.id], `**${n(m.bossZirh)}**`, `**${n(m.bossHp)}**`,
        n(boss?.tavan), boss ? yuzde(boss.oran) : '—'];
    })), '');
  y(`**Zırh haritayla düşüyor** ve bu ters değil, mekanik gereği: geç haritalarda`);
  y(`altın daha çok noktaya bölündüğü için tahtanın ortalama kademesi düşüyor ve`);
  y(`zırh 10 o tahtayı hasar tabanına mahkûm ediyor. Zorluk zırhtan değil HP'den`);
  y(`ve dalga kompozisyonundan geliyor.`, '');
  y(`**İlk türetme oranı: ${n(D.bossOran)}** — \`M7\`, tasarım bandı %75-85'in ortası.`, '');
  y('**`M71` (S136): bu oran bugün ARTIK TUTMUYOR ve bilerek böyle.**', '');
  y('`ceilingAPerBranch` **tek** düşmanın karşısındaki tahtayı ölçüyor. Tahtalar', '');
  y('`M7`’den beri üç katlandı (tavanlar 800-925 → 2400-6100) ama bir *dalganın*', '');
  y('baskısı o kadar büyümedi. `0,80 × tavan` ile yeniden türetme denendi ve', '');
  y('Kadim Harabe’nin bossunu sızdırdı — yani türetmenin var olma sebebi olan', '');
  y('değişmezi kırdı. Çarpanlarla telafi edildiğinde bu kez orta oyun sıfırlandı.', '');
  y('', '');
  y('Bugün boss HP’si **türetilmiş değil ölçülerek ayarlanmış** bir sayı ve üç', '');
  y('testle bağlı: `bossScaling.test`’in regresyon kilidi (yazılı HP’ler ölçülen', '');
  y('değerlerdir) · `kisitB`’nin “boss hiçbir haritada sızmıyor”u · `kisitB`’nin', '');
  y('“boss dalgası haritanın zirvesi”i (`M70`). Gerekçe `bossScaling.ts` başlığında.', '');

  // ---------------------------------------------------------------- 8
  y('---', '', '## 8. Etkin DPS matrisi', '');
  y(`Zırh, direnç ve uçan çarpanı **uygulanmış** DPS. Yanma dalları sürekli`);
  y(`hasarı da içeriyor. \`—\` = vuramıyor. Boss sütunu harita 1 zırhıyla.`, '');
  y(tablo(['Kademe', ...D.dusmanlar.map((e) => (DUSMAN_ADI[e.id] ?? e.id).split(' ')[0])],
    D.matris.map((r) => [
      `${KULE_ADI[r.kule] ?? r.kule} ${r.kademe}${r.dal ? ` ${r.dal}` : ''}`,
      ...r.hucre.map((c) => (c === null ? '**—**' : n(c))),
    ])), '');

  // ---------------------------------------------------------------- 9
  y('---', '', '## 9. Yetenekler', '');
  y(`Kaynak: \`src/data/abilities.ts\` · \`GAME-DESIGN.md\` §8`, '');
  for (const a of D.yetenekler) {
    y('', `### ${a.id === 'meteor' ? 'Meteor' : 'Takviye'}`, '');
    const satir = Object.entries(a).filter(([k]) => k !== 'id' && k !== 'kind').map(([k, v]) => [`\`${k}\``, n(v)]);
    y(tablo(['Alan', 'Değer'], satir), '');
  }
  y(`Beklemeler \`scaledDelta\` ile azalıyor — **hızlandırma açıkken o oranda**`);
  y(`kısa sürede doluyor (2×'te yarısı, 3×'te üçte biri).`);
  y(`HUD'da dairesel dolumla gösteriliyor; hazır olunca altın kenar bir kez parlıyor.`);
  y(`Haritalar arası **sıfırlanıyor** (S49).`, '');
  y('', `### Yükseltme — S117'nin gider kalemi (\`M99\`)`, '');
  y(`Her yetenek tur içinde **${n(D.yetenekSeviye.sayi - 1)} kez** yükseltilebiliyor;`);
  y(`seviye harita bitince sıfırlanıyor (beklemeyle aynı kural).`, '');
  y(tablo(['Seviye', 'Meteor hasarı', 'Takviye askeri'],
    D.yetenekSeviye.meteor.map((h, i) => [n(i + 1), n(h), n(D.yetenekSeviye.takviye[i])])), '');
  y(`Fiyat haritanın **altın çarpanını** izliyor — gider kalemi gelirle aynı`);
  y(`ölçekte büyümeli (S72'nin \`startGold\` gerekçesi):`, '');
  y(tablo(['Harita', ...D.yetenekSeviye.meteor.slice(1).map((_, i) => `L${i + 2}`), 'Dört yükseltme'],
    D.yetenekSeviye.fiyat.map((f) => [HARITA_ADI[f.id], ...f.basamaklar.map((x) => n(x)),
      n(f.basamaklar.reduce((t, x) => t + 2 * x, 0))])), '');

  // ---------------------------------------------------------------- 10
  y('---', '', '## 10. Ekonomi', '');
  y(`Kaynak: \`src/data/balance.ts\` · \`GAME-DESIGN.md\` §6`, '');
  y(tablo(['Sabit', 'Değer', 'Not'], [
    ['Başlangıç canı', n(D.balance.startLives), 'Boss sızması tek başına 10 can götürüyor'],
    ['Satış iadesi', yuzde(D.balance.sellRefund * 100), 'Harcanan **toplamın** oranı'],
    ['Hazırlık süresi', `${n(D.balance.prepSeconds)} sn`, 'Her dalgada sabit'],
    ['Dalga bitiş bonusu', `30 + 5n → ${D.balance.waveEndBonus.map((w) => `d${w.n}:${w.v}`).join(', ')}`, '**Harita altın çarpanıyla çarpılıyor** (S70)'],
    ['Erken başlatma bonusu', '`kalanSaniye × ceil(dalgaNo/2)`', `Dalga ${n(D.balance.earlyBonusFrom)}'ten itibaren açık`],
    ['Güvenlik payı', `×${n(D.balance.safetyMargin)}`, 'Kısıt A eşiği: `tavan > eHP × 1,15`'],
  ]), '');
  y(`**Altın çarpanı ≥ HP çarpanı** (S73). §9 "eşit" diyordu ve gerekçesi`);
  y(`"altın/HP oranı düşmesin"di; ölçüm eşitliğin harita 3'te bu gerekçeyi`);
  y(`**karşılamadığını** gösterdi — 12 nokta ×2,6 altınla tam yükseltilemiyor,`);
  y(`tahta 3820'de takılıyor ve oyuncu 34 can kaybediyordu (20 canla kayıp).`, '');
  /** `M100` — haritanın **dört** yetenek yükseltmesinin toplamı. */
  const yukseltmeGideri = (id) => (D.yetenekSeviye.fiyat.find((f) => f.id === id)?.basamaklar ?? [])
    .reduce((t, x) => t + 2 * x, 0);
  y(tablo(['Harita', 'HP çarpanı', 'Altın çarpanı', 'Fiyat çarpanı', 'Tahta maliyeti', 'maliyet/gelir', '+ yükseltme', 'Can kaybı'],
    D.haritalar.map((m) => [HARITA_ADI[m.id], `×${n(m.hpMultiplier)}`,
      `×${n(m.goldMultiplier)}${m.goldMultiplier !== m.hpMultiplier ? ' **←ayrıştı**' : ''}`,
      `×${n(m.costMultiplier)}`, n(m.tahta10?.maliyet),
      n(+((m.tahta10?.maliyet ?? 0) / m.altinMuhafazakar).toFixed(2)),
      n(+(((m.tahta10?.maliyet ?? 0) + yukseltmeGideri(m.id)) / m.altinMuhafazakar).toFixed(2)),
      `${n(m.canKaybi)} / 20${m.canKaybi < 20 ? ' ✓' : ' ✗'}`])), '');
  y(`**\`+ yükseltme\` sütunu \`M100\`'de eklendi** — \`maliyet/gelir\` yalnız`);
  y(`**tahtayı** sayan bir orandı ve \`M99\` altına ikinci bir gider kalemi`);
  y(`açtı. S117'nin “gelirin yarısından fazlası harcanmadan kalıyor” iddiası`);
  y(`bu sütunla birlikte başka bir şey söylüyor: geç haritalarda harcanabilir`);
  y(`gider artık gelirin **tamamına yakını**. Oran kolunun (fiyat çarpanı)`);
  y(`kalan işi bu kadarıyla küçüldü — ama kapanmadı: yükseltme **seçime bağlı**,`);
  y(`tahta ise zorunlu.`, '');
  y(`Türetilebilir kural: **altın, haritanın noktalarını tam yükseltmeye`);
  y(`yetmeli.** 3,8'de maliyet doyuyor (üstü fazladan kule almıyor), yani sayı`);
  y(`seçilmedi — tam yükseltme noktası olarak **ölçüldü**.`, '');
  y(`**Başlangıç altını da çarpanı izliyor** — S72, kapandı. §9 tablosu`);
  y(`280/340/400 diyordu ama 340 ve 400 çarpanı izlemiyordu (×1,21 ve ×1,43,`);
  y(`oysa HP ×1,6 ve ×2,6). Ölçülen sonuç: dalga 1 tahtası üç haritada da 3-4`);
  y(`kule, ama goblin efektif HP'si ${D.haritalar.map((m) => Math.round(45 * m.hpMultiplier)).join('/')}. §9'un kendi gerekçesi`);
  y(`("altın/HP oranı düşmesin") başlangıç altınına da uygulandı:`, '');
  y(tablo(['Harita', '§9 tablosu', 'Kullanılan', 'Dalga 1 sızıntısı (önce → sonra)'], [
    ['1 · Değirmen Geçidi', '280', `**${n(D.haritalar[0].startGold)}**`, '0 → 0'],
    ['2 · Taş Köprü', '340', `**${n(D.haritalar[1].startGold)}** = 280 × 1,6`, '**4 → 0**'],
    ['3 · Kül Ovası', '400', `**${n(D.haritalar[2].startGold)}** = 280 × 2,6`, '**7 → 0**'],
  ]), '');
  y(`Toplam sızıntı: harita 2'de 13 → ${n(D.haritalar[1].kisitB.sizanAdet)}, harita 3'te 43 → ${n(D.haritalar[2].kisitB.sizanAdet)}.`, '');

  // ---------------------------------------------------------------- 11
  y('---', '', '## 11. Dalgalar', '');
  y(`Kaynak: \`src/data/waves.ts\` · \`GAME-DESIGN.md\` §7`, '');
  y(`**Dalgalar elle yazılmaz, bütçe ile üretilir ve sonra rötuşlanır.** Bütçe`);
  y(`yaklaşımı oyunun asla yenilemez bir dalga üretmemesini garanti ediyor.`, '');
  y('```', `budget(n) = round(${n(D.balance.budgetBase)} × ${n(D.balance.budgetGrowth)}^(n−1) × (nefes ? ${n(D.balance.breatherFactor)} : 1))`, '```', '');
  y(`Nefes dalgaları: **${D.balance.breatherWaves.join(', ')}** — yeni düşman tipi tanıtılmıyor.`, '');
  y(`Doğum penceresi \`SPAWN_K = ${n(D.balance.spawnK)}\` (saniye × düşman). **Uydurulmadı,`);
  y(`ölçüldü**: sekiz farklı değerle 10 dalga koşturulup sızıntı sayıldı.`, '');
  for (const m of D.haritalar) {
    y('', `### ${HARITA_ADI[m.id]}`, '');
    y(tablo(['Dalga', 'Bütçe', 'Puan', 'Adet', 'Aralık', 'Kompozisyon'],
      m.dalgalar.map((w) => [
        `**${n(w.index)}**${D.balance.breatherWaves.includes(w.index) ? ' _(nefes)_' : ''}`,
        n(w.butce), n(w.puan), n(w.adet), `${n(w.aralik)} sn`,
        w.gruplar.map((g) => `${g.count}× ${DUSMAN_ADI[g.enemy] ?? g.enemy}${m.kollar > 1 ? `⁽${g.spawnPoint}⁾` : ''}`).join(', '),
      ])), '');
    if (m.kollar > 1) y(`⁽ⁿ⁾ = giriş/kol numarası. **Sabit ve veride yazılı** (S58) — rastgele değil.`, '');
  }

  // ------------------------------------------------------------ 11b zorluk
  y('---', '', '## 11b. Zorluk seviyeleri', '');
  y(`Kaynak: \`src/data/difficulty.ts\` (S80). Varsayılan **${HARITA_ADI_YOK(D.zorluk.varsayilan)}**.`, '');
  y(
    '**Zor HP’ye dokunmuyor, canı kısıyor.** Ölçüm: HP çarpanı ×1,10’da',
    'harita 1’in bossu referans tahtanın Kısıt A tavanını aşıyordu (%101),',
    'yani öğretici harita **geçilemez** hâle geliyordu. Can sayısı Kısıt A’ya,',
    'referans tahtaya, tavana ve boss türetmesine hiç girmiyor — hiçbir düşmanı',
    'öldürülemez yapmadan hata payını daraltıyor.',
    '',
  );
  y(
    tablo(
      ['Seviye', 'HP çarpanı', 'Başlangıç canı', 'Yıldız', ...D.haritalar.map((m) => HARITA_ADI[m.id].split(' · ')[0])],
      D.zorluk.seviyeler.map((z) => [
        z.ad,
        `×${n(z.hpScale)}`,
        n(z.startLives),
        z.recordStars ? 'kaydediliyor' : '**kaydedilmiyor**',
        ...z.canKaybi.map((c, i) => {
          const sinir = z.startLives;
          return `${n(c)} / ${n(sinir)}${c < sinir ? ' ✓' : ' ✗'}`;
        }),
      ]),
    ),
    '',
  );
  y('Hücreler: referans tahtanın kaybettiği can / o seviyenin canı.', '');

  // ---------------------------------------------------------------- 12
  y('---', '', '## 12. Haritalar', '');
  y(`Kaynak: \`src/data/maps.ts\` · \`GAME-DESIGN.md\` §9`, '');
  y(tablo(['Harita', 'Yol', 'Nokta', 'HP/Altın çarpanı', 'Başlangıç altını', 'Uçan hattı', 'Kadro'],
    D.haritalar.map((m) => [
      HARITA_ADI[m.id], `${n(m.kollar)} kol`, n(m.spots), `×${n(m.hpMultiplier)}`,
      n(m.startGold), `${n(m.ucanHat)} hat, ${n(m.ucanKesen)}/${n(m.spots)} nokta kesiyor`,
      `${m.roster.length} tip`,
    ])), '');
  y('', `### Kapsanan yol — asıl denge kolu`, '');
  y(`Haritaların yapı noktası **sayısı** değil, her noktanın **kapsadığı yol`);
  y(`uzunluğu** dengeyi belirliyor. Ölçüm menzili: **${n(D.kapsamaMenzil)} px** (T1).`, '');
  y(`**Kabul bandı: 285-311 px** — geometri bandı (2 × menzil ± %5) ile boss`);
  y(`bandının (tavanın %75-85'i) kesişimi.`, '');
  y(`**Ayrık yolda ölçüm KOL BAŞINA yapılıyor.** Toplam ölçüm yanıltıcı: iki kol`);
  y(`ortak gövdeyi paylaşınca aynı fiziksel yol iki kez sayılıyor.`, '');
  y(tablo(['Harita', ...D.haritalar[2].kolKapsama.map((_, i) => `Kol ${i}`)],
    D.haritalar.map((m) => [
      HARITA_ADI[m.id],
      ...m.kolKapsama.map((k) => `**${n(k.ort)} px** (${n(k.n)}/${n(m.spots)} nokta) ${k.ort >= 285 && k.ort <= 311 ? '✓' : '✗'}`),
      ...Array(Math.max(0, D.haritalar[2].kolKapsama.length - m.kolKapsama.length)).fill('—'),
    ])), '');
  y(`\`coverage\` alanı **elle yazılmaz** — \`util/coverage.ts\` üretiyor ve bekçi`);
  y(`elle yazılmasını engelliyor. Ekranda görünen altın çizgi ile denge`);
  y(`testlerinin sayısı **aynı fonksiyondan** geliyor.`, '');
  y('', `### Yıldız derecelendirmesi`, '');
  y(tablo(['Kalan can', 'Yıldız'], [['20 (hiç sızma yok)', '★★★'], ['15-19', '★★'], ['14 ve altı', '★']]), '');

  // ---------------------------------------------------------------- 13
  y('---', '', '## 13. Denge sağlamaları', '');
  y(`İki bağımsız sağlama. Kaynak: \`src/systems/balanceChecks.ts\`, \`waveSim.ts\``, '');
  y('', `### Kısıt A — statik tavan`, '');
  y('```', 'tavan = Σ_kule ( etkinDPS_kule × kapsananYol_kule ) / hız_düşman', '```', '');
  y(`**Yerleşimden bağımsız** — kuleler kümelense de dağılsa da toplam aynı;`);
  y(`yerleşim *ne zaman* hasar verildiğini değiştirir, *ne kadar* verildiğini değil.`, '');
  y(`Eşik: \`tavan > efektifHP × ${n(D.balance.safetyMargin)}\`, yani oran **≤ %87**.`);
  y(`Ayrık yolda **en zayıf kol** belirleyici — düşman hangi kolu seçeceğini sormuyor.`, '');
  for (const m of D.haritalar) {
    y('', `**${HARITA_ADI[m.id]}** — dalga 10 tahtası (muhafazakâr):`, '');
    y(tablo(['Düşman', 'Efektif HP', 'Tavan', m.kollar > 1 ? 'Kollar' : '', 'Oran'].filter(Boolean),
      m.kisitA.map((k) => [
        DUSMAN_ADI[k.id] ?? k.id, n(k.eHp), n(k.tavan),
        ...(m.kollar > 1 ? [k.kollar.join(' / ')] : []),
        `${yuzde(k.oran)}${k.oran > 87 ? (D.kislaIle.includes(k.id) ? ' ⓑ' : ' ✗') : ''}`,
      ])), '');
  }
  /**
   * `M103` — bu paragraf **koşulsuz** basılıyordu ve ⓑ'yi yürürlükteki
   * bir muafiyet gibi anlatıyordu. Ölçüm: hiçbir satır bugün ⓑ almıyor
   * (Trol en çok %77,8, eşik %87). İşaret duruyor çünkü liste bir denge
   * turunda yeniden gerekebilir, ama metin artık **olduğunu** söylüyor.
   */
  const bMarkali = D.haritalar.flatMap((m) =>
    m.kisitA.filter((k) => k.oran > 87 && D.kislaIle.includes(k.id)).map((k) => k.id));
  y(`**ⓑ = Kışla ile doğrulanan.** Kısıt A yalnız **kulelerin** verebileceği`);
  y(`hasarı topluyor (tanımı bu) — askerlerin DPS'i ve engellemenin kazandırdığı`);
  y(`süre girmiyor. §5 Trol'ün cevabını açıkça kışla olarak verdiği için, o`);
  y(`eşiği geçerse Kısıt A onu olduğundan **zor** gösterir; doğrulaması Kısıt B'de.`);
  y(bMarkali.length === 0
    ? `**Bugün hiçbir satır ⓑ almıyor** — kışla ile doğrulanan düşmanların hepsi eşiği kendi başına geçiyor.`
    : `Bugün ⓑ alan: ${[...new Set(bMarkali)].map((id) => DUSMAN_ADI[id] ?? id).join(', ')}.`, '');

  y('', `### Kısıt B — başsız simülasyon`, '');
  y(`Dalgayı gerçekten çalıştırıp **sızan HP'yi ölçüyor.** Formül değil,`);
  y(`çünkü girdileri (dalga süresi, aktiflik oranı) statik veriden hesaplanamaz.`);
  y(`Odaklanma kaybı doğal olarak ortaya çıkıyor — çarpan gerekmiyor.`, '');
  y(`**Odaklanma kaybı artık SAYILIYOR** (`+'`'+`M83`+'`'+`, S24). §6'nın formülündeki`);
  y(`\`× 0,75\` bir varsayımdı ve hiçbir kod onu okumuyordu; silindi. Boşa giden`);
  y(`hasarın iki kalemi var: uçuşta hedefi ölen **tek hedefli** mermiler (alan`);
  y(`hasarlı mermi yine patlıyor, boşa gitmiyor — S21) ve hedefin kalan canını`);
  y(`aşan hasar. Kalkanın yuttuğu kayıp sayılmıyor: o gerçek bir mekanik.`, '');
  y(tablo(['Harita', 'Atılan hasar', 'Uçuşta boşa', 'Aşırı öldürme', 'Verim'],
    D.haritalar.map((m) => [HARITA_ADI[m.id], n(m.odaklanma.atilan), n(m.odaklanma.ucus),
      n(m.odaklanma.asiri),
      `**${yuzde((1 - m.odaklanma.bosa / m.odaklanma.atilan) * 100)}**`])), '');
  y(`Öğretici haritada kayıp en yüksek — çünkü orada atış başına hasar`);
  y(`düşmanın canının büyük bir kısmı ve aşırı öldürme baskın. Geç haritalarda`);
  y(`düşman HP'si 8-10 kat büyük olduğu için aynı atış fire üretmiyor.`, '');
  y(`Simülasyon **canlı oyunla aynı kodu** kullanıyor: aynı `);
  y(`\`BarracksSystem\`, aynı \`applyDamage\`, aynı \`TowerSystem\`.`, '');
  y(tablo(['Harita', 'Sızan düşman', 'Sızan HP', 'Dalga dağılımı'],
    D.haritalar.map((m) => [
      HARITA_ADI[m.id], `**${n(m.kisitB.sizanAdet)}**`, n(m.kisitB.sizanHp),
      m.kisitB.dalga.map((v, i) => `d${i + 1}:${v}`).join(' '),
    ])), '');
  y('', `**Baskı hangi dalgadan geliyor?** Üstteki dağılım sızıntıyı **sızdığı ana**`);
  y(`yazıyor. \`M16\`'dan beri dalgalar üst üste bindiği için 9. dalganın Trol'ü`);
  y(`10. dalga koşarken kaleye varıyor ve finalin hanesine yazılıyor — S116'nın`);
  y(`"bütün baskı 10. dalgada" iddiası kısmen bu muhasebeden doğuyordu. Aşağıdaki`);
  y(`tablo aynı canı düşmanın **doğduğu** dalgaya yazıyor (\`M84\`):`, '');
  y(tablo(['Harita', 'Doğum dalgasına göre can kaybı', 'Final payı'],
    D.haritalar.map((m) => {
      const d = m.dogumBaskisi;
      const toplam = d.reduce((a, b) => a + b, 0);
      return [HARITA_ADI[m.id], d.map((v, i) => `d${i + 1}:${v}`).join(' '),
        toplam > 0 ? `**${yuzde((d[9] / toplam) * 100, 0)}**` : '—'];
    })), '');
  y('', `**Hangi düşman sızıyor** — toplam sayı *neyin* sızdığını söylemiyor ve`);
  y(`bu ikisi farklı düzeltmeler gerektiriyor:`, '');
  y(tablo(['Harita', 'Sızan düşmanlar (çok → az)'],
    D.haritalar.map((m) => [HARITA_ADI[m.id],
      Object.entries(m.kisitB.kirilim).sort((a, b) => b[1] - a[1])
        .map(([id, adet]) => `${DUSMAN_ADI[id] ?? id} ×${adet}`).join(' · ') || '**hiç yok**'])), '');
  /**
   * `M103` — bu cümlenin **iki sayısı da elle yazılıydı ve ikisi de
   * bayattı**: "Ork Savaşçı %39,9" diyordu, ölçüm %19,3; "Trol Kısıt
   * A'da kalıyor" diyordu, Trol %48,6 ile geçiyor. İddia (iki kısıt
   * ayrı şeyi ölçüyor) doğruydu, kanıtı uydurma olmuştu. Artık ölçümden
   * türüyor: **en çok sızan** düşmanın Kısıt A oranı ile **Kısıt A'da
   * en zorlanan** düşmanın sızıntısı yan yana konuyor.
   */
  const enCok = (m) => Object.entries(m.kisitB.kirilim).sort((a, b) => b[1] - a[1])[0];
  const enZor = (m) => [...m.kisitA]
    .filter((k) => k.id !== 'ogreSef' && k.oran !== null)
    .sort((a, b) => b.oran - a.oran)[0];
  // İkisinin **aynı** düşman çıktığı harita örnek olamaz: cümle
  // "A'da rahat geçen çok sızıyor, A'da zorlanan az sızıyor" diyor.
  // En çok sızıntısı olan, bu şartı sağlayan harita seçiliyor.
  const ornekHarita = D.haritalar
    .filter((m) => {
      const s = enCok(m);
      const z = enZor(m);
      return s !== undefined && z !== undefined && s[0] !== z.id;
    })
    .sort((a, b) => enCok(b)[1] - enCok(a)[1])[0];
  y(`**Kısıt A ile Kısıt B aynı şeyi ölçmüyor.** Kısıt A *tek* düşman için`);
  y(`("bir Ork Savaşçı öldürülebilir mi"), Kısıt B *dalga* için ("on bir tanesi`);
  y(`aynı anda gelirse").`);
  if (ornekHarita !== undefined) {
    const oranOf = (id) => ornekHarita.kisitA.find((k) => k.id === id)?.oran;
    const sizan = enCok(ornekHarita);
    const zorlanan = enZor(ornekHarita);
    const ad = (id) => DUSMAN_ADI[id] ?? id;
    // Harita adı **ek almadan** yazılıyor: "Sisli Bataklık'nde" gibi bir
    // ek türetmek Türkçe ünlü uyumu demek ve üretici onu bilmiyor.
    y(`Ölçüm bunu net gösteriyor — **${HARITA_ADI[ornekHarita.id]}**:`);
    y(`en çok sızan **${ad(sizan[0])}** (×${n(sizan[1])}) Kısıt A'da`);
    y(`${yuzde(oranOf(sizan[0]))} ile rahat geçiyor; Kısıt A'da en zorlanan`);
    y(`**${ad(zorlanan.id)}** (${yuzde(zorlanan.oran)}) ise yalnız`);
    y(`×${n(ornekHarita.kisitB.kirilim[zorlanan.id] ?? 0)} sızıyor. İkisi de gerekli.`, '');
  } else {
    y(`Bu turda hiçbir haritada sızıntı ölçülmedi — karşılaştırma yapılamıyor.`, '');
  }
  y(`**Boss hiçbir haritada sızmıyor** — türetmenin uçtan uca sağlaması.`, '');
  y('', `### Referans tahta — türetiliyor, uydurulmuyor`, '');
  y(`"Dalga N'de makul bir oyuncunun sahip olacağı kule dizilimi." Ekonomiden`);
  y(`türetiliyor: kapsaması yüksek nokta önce doluyor, sonra T2, sonra T3.`);
  y(`Kadroda Trol varsa **kışla** da alınıyor (§5'in Trol cevabı) ve **en düşük`);
  y(`kapsamalı** noktaya kuruluyor.`, '');
  y(tablo(['Harita', 'Nokta dolma', 'Altın (muhafazakâr)', 'Altın (gerçekçi)', 'Dalga 10 tahtası'],
    D.haritalar.map((m) => [
      HARITA_ADI[m.id], `dalga ${n(m.noktaDolma)}`, n(m.altinMuhafazakar), n(m.altinGercekci),
      m.tahta10 ? `${m.tahta10.kule.length} kule${m.tahta10.kisla.length ? ` + ${m.tahta10.kisla.length} kışla` : ''} (${n(m.tahta10.maliyet)} altın)` : '—',
    ])), '');

  // ---------------------------------------------------------------- 14
  y('---', '', '## 14. Juice ve ayarlar', '');
  y(`Kaynak: \`src/fx/ScreenShake.ts\`, \`HitStop.ts\`, \`src/systems/Settings.ts\``, '');
  y(tablo(['Efekt', 'Değer', 'Ne zaman', 'hızlandırmada (2×/3×)'], [
    ['Ekran sarsıntısı', `${n(D.juice.shakeMin)}–${n(D.juice.shakeMax)} sn, **yönlü**, üstel sönüm`, 'Top patlaması, boss vuruşu, can kaybı', '**açık** (S55)'],
    ['Hit-stop', `${n(D.juice.hitStopMin)}–${n(D.juice.hitStopMax)} ms`, 'Boss hasarı ve düşman ölümü', '**kapalı** — akışı bozardı'],
    ['Squash & stretch', '1,3× yatay ezilme, 120 ms', 'Düşman ölürken', 'süre hız oranında kısalır'],
    ['Vinyet nabzı', '400 ms vermilyon', 'Can kaybı', '**efekt ayarından bağımsız** — uyarı, süs değil'],
    ['Parçacık', 'en fazla 300', 'Vuruş, ölüm, kule yerleşimi', 'yoğunluk **hız oranında** iner'],
    ['Altın sayacı', 'kalan farkın %18\'i + en az 1, kare başına', 'Dalga sonu', 'aynı'],
  ]), '');
  y(`Sarsıntı **rastgele yönlü değil** — darbe vektörü boyunca. Rastgele yön`);
  y(`oyuncuya darbenin nereden geldiğini söylemez.`, '');
  y('', `### Ayarlar (TIER 1 kural 6)`, '');
  y(tablo(['Ayar', 'Varsayılan', '`prefers-reduced-motion` açıkken'], [
    ['Ses', n(D.ayarlar.varsayilan.sound), `${n(D.ayarlar.azaltilmis.sound)} — ses hareket değil, etkilenmiyor`],
    ['Ekran sarsıntısı', n(D.ayarlar.varsayilan.screenShake), `**${n(D.ayarlar.azaltilmis.screenShake)}** — "azaltılmış" hâli yok`],
    ['Efekt yoğunluğu', `\`${D.ayarlar.varsayilan.effects}\``, `**\`${D.ayarlar.azaltilmis.effects}\`** — \`off\` "azalt" değil "kaldır" olurdu`],
  ]), '');
  y(`Efekt kademeleri (parçacık çarpanı): ${Object.entries(D.ayarlar.efektOlcek).map(([k, v]) => `\`${k}\` = ${n(v)}`).join(' · ')}`, '');
  y(`Tercihler tek anahtarda (\`kale-nobeti-save-v1\`) ve **her erişim \`try/catch\``);
  y(`içinde**. Gizli sekmede oyun çökmüyor, bellek yedeğine düşüyor ve oyuncuya`);
  y(`**bir kez** bildiriliyor.`, '');

  // ---------------------------------------------------------------- 15
  y('---', '', '## 15. Teknik bütçeler', '');
  y(tablo(['Havuz', 'Ön ayırma', 'Gerekçe'], [
    ['Düşman', n(D.havuz.enemy), 'Dalga bütçesi ~50 düşman; 60 pay bırakıyor'],
    ['Mermi', n(D.havuz.projectile), '`research/02` §7'],
    ['Hasar sayısı', n(D.havuz.damageText), '`research/02` §7'],
    ['Asker', n(D.havuz.soldier), '8 nokta × 3 asker (Haydutlar) = 24, yani tavan dolsa bile yetiyor'],
  ]), '');
  y(`Havuz **sessizce büyümüyor** — dolduğunda \`acquire\` \`null\` dönüyor ve`);
  y(`\`new\` çağrılmıyor. Bu sayılar aynı zamanda sert tavanlar.`, '');
  y(tablo(['Sabit', 'Değer'], [
    ['Mermi hızı', `${n(D.mermiHizi)} px/sn (S20 — dokümanda yok)`],
    ['Mermi isabet yarıçapı', `${n(D.isabetYaricapi)} px`],
    ['Mantıksal çözünürlük', '1280×720, `Scale.FIT` + `CENTER_BOTH`'],
    ['Minimum yazı', '16 px (640×360\'a küçültüldüğünde okunur kalmalı)'],
    ['Minimum dokunmatik hedef', '44×44 px'],
  ]), '');

  // ---------------------------------------------------------------- 16
  y('---', '', '## 16. Uydurulmayan sayılar', '');
  y(`Dokümanda olmayan her sayı **türetildi ve işaretlendi** (\`// GEÇİCİ — S<nn>\`).`);
  y(`Bu projenin en pahalı hatası uydurulmuş bir sayıydı (2200 HP'lik, hiçbir`);
  y(`oyun durumunda öldürülemeyen boss); kural o yüzden var.`, '');
  y(tablo(['#', 'Sayı', 'Nereden türetildi'], [
    ['S20', `Mermi hızı ${n(D.mermiHizi)} px/sn`, 'Dokümanda yok; en hızlı düşmanı (Kurt Binicisi 110) ıskalamayacak değer'],
    ['S37', 'Şaman iyileştirme yarıçapı 90 px', '§5 yalnız "8 HP/sn" veriyor, menzil yok'],
    ['S38', 'Örümcek yavrusu zırh/direnç/altın/puan = 0', '§5\'te yalnız HP 30 ve hız 90 var. Altın 0: yoksa "altın = 3 × puan" bozulur'],
    ['S43', '**Paladin kalkanı — YAZILMADI**', '§4.4 "11 + kalkan" diyor, sayı yok. `undefined` bırakıldı'],
    ['S44', 'Haydutlar kaçınması **çarpımsal**', 'Olasılıksal ile sürekli hasarda beklenen değer olarak özdeş; rastgelelik getirmiyor'],
    ['S48', 'Meteor uçanları **vuruyor**', '§8 belirtmiyor; vurmasaydı harpiye cevap tek aileye düşerdi'],
    ['S66', `Düşmanın askere hasarı = puan × ${n(D.meleeK)}`, '§4.4 T1 satırı (45 HP, 8 sn) + §5\'in puan ölçeği'],
    ['S67', 'Asker hasarı fiziksel, zırh **saniyelik** rakama', 'Kare başına uygulansaydı zırh sonsuz güçlü çıkardı'],
    ['S68', `Asker hızı ${n(D.soldierSpeed)} px/sn`, 'Kadronun ortanca hızı (Ork Savaşçı) — §5 tablosundan'],
    ['S70', 'Dalga bitiş bonusu × altın çarpanı', '§9\'un kendi gerekçesi: "altın/HP oranı düşmesin"'],
  ]), '');

  // ---------------------------------------------------------------- 17
  y('---', '', '## 17. Bekçiler', '');
  y(`\`npm run guard\` — TIER 1 kurallarının otomatik denetimi. Kaynak:`);
  y(`\`scripts/guard-rules.mjs\`. **Bekçiler kanıt değil, ağ**: hepsi düzenli`);
  y(`ifade sezgiseli ve her biri **kasıtlı bozmayla** doğrulandı.`, '');
  /**
   * Liste `M100`'e kadar **elle** yazılıydı ve on satır gösteriyordu;
   * bekçi o gün on dokuz kural koşuyordu. TIER 2'nin tam tarif ettiği
   * kusur: sistem büyüdü, onu *sayan* yer büyümedi. Artık bekçinin
   * kendi `sonuclar.push([...])` satırlarından türetiliyor.
   */
  y(tablo(['#', 'Kural'], D.bekciler.map((ad, i) => [n(i + 1), ad])), '');
  y(`Liste **türetilmiş**: üretici bekçiyi koşturup çıktısını okuyor, elle`);
  y(`sayılmıyor. Bugün **${n(D.bekciler.length)}** kural var.`, '');
  y(`Sahne alanları kuralı **dört kez çıkan** bir hatadan doğdu: alan`);
  y(`başlatıcısı yalnız bir kez koşuyor, \`create()\` her yeniden başlatmada.`);
  y(`Sızıntı çökme üretmiyor, **yanlış durum** olarak görünüyor. Kural beş`);
  y(`tarihsel hataya karşı negatif doğrulandı ve yazıldığı anda **iki yeni`);
  y(`hata** buldu.`, '');
  y(`Sonuncusu (\`M100\`) başka bir kör noktayı kapatıyor: özel Phaser yapımı`);
  y(`(\`src/vendor/phaser-custom.js\`) paket boyutu için modül eliyor, tipler`);
  y(`ise tam pakete bakıyor — taşınmayan bir API typecheck'ten **yeşil**`);
  y(`geçip tarayıcıda çöküyordu. \`M100\` buna canlı düştü (\`Phaser.Geom.Point\`).`, '');

  y('', '---', '', `_Üretildi: \`node scripts/kurallar.mjs\`_`, '');
  return b.join('\n');
}

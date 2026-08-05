/**
 * Üç haritayı **gerçek veriden** SVG olarak çizer — görsel denetim için.
 *
 * Yol, yapı noktaları, menzil çemberleri, kapsanan yol parçaları, uçan
 * hatları ve kale. Kapsama sayıları `util/coverage.ts`'ten geliyor, yani
 * ekranda görünen çizgi ile denge testlerinin kullandığı sayı **aynı
 * hesaptan** çıkıyor.
 *
 * Kullanım: node scripts/harita-gorsel.mjs > docs/results/haritalar.html
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// TS'i doğrudan çalıştıramıyoruz; veriyi vitest üzerinden JSON olarak alıyoruz.
const dizin = mkdtempSync(join(tmpdir(), 'kn-gorsel-'));
const testDosyasi = join('src', '__gorsel_dokum.test.ts');
writeFileSync(
  testDosyasi,
  `import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { MAPS, COVERAGE_REFERENCE_RANGE } from './data/maps';
import { measureCoverage, coveredSegments } from './util/coverage';
import { MAP1_WAVES, MAP2_WAVES, MAP3_WAVES } from './data/waves';

it('dokum', () => {
  const dalgalar = { 'degirmen-gecidi': MAP1_WAVES, 'tas-kopru': MAP2_WAVES, 'kul-ovasi': MAP3_WAVES };
  const veri = MAPS.map((m) => ({
    id: m.id,
    paths: m.paths,
    flyerPaths: m.flyerPaths,
    buildSpots: m.buildSpots,
    castle: m.castle,
    hpMultiplier: m.hpMultiplier,
    startGold: m.startGold,
    roster: m.enemyRoster,
    range: COVERAGE_REFERENCE_RANGE,
    branchCoverage: m.branchCoverage,
    coverage: m.coverage,
    segments: m.buildSpots.map((s) =>
      m.paths.map((p) => coveredSegments(p, s, COVERAGE_REFERENCE_RANGE)),
    ),
    waveCount: (dalgalar[m.id] ?? []).length,
  }));
  void measureCoverage;
  writeFileSync(${JSON.stringify(join(dizin, 'veri.json'))}, JSON.stringify(veri));
});
`,
  'utf8',
);
execSync(`npx vitest run ${testDosyasi}`, { stdio: 'pipe' });
unlinkSync(testDosyasi);

const haritalar = JSON.parse(readFileSync(join(dizin, 'veri.json'), 'utf8'));

const MUREKKEP = '#14203A';
const PARSOMEN = '#E4D3A8';
const ALTIN = '#D4A032';
const YOL = '#8A7250';
const VERMILYON = '#B03A2E';

function svg(m) {
  const p = [];
  p.push(`<svg viewBox="-80 -40 1440 800" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${MUREKKEP};border-radius:8px">`);

  // Yollar
  for (const yol of m.paths) {
    p.push(
      `<polyline points="${yol.map((q) => `${q.x},${q.y}`).join(' ')}" fill="none" stroke="${YOL}" stroke-width="48" stroke-linejoin="round" stroke-linecap="round"/>`,
    );
  }
  // Uçan hatları — kesikli
  for (const u of m.flyerPaths) {
    p.push(
      `<polyline points="${u.map((q) => `${q.x},${q.y}`).join(' ')}" fill="none" stroke="${PARSOMEN}" stroke-width="3" stroke-dasharray="12 10" opacity="0.5"/>`,
    );
  }
  // Kapsanan yol parçaları — altın kalın
  m.segments.forEach((perSpot) => {
    for (const kolSeg of perSpot) {
      for (const seg of kolSeg) {
        p.push(
          `<line x1="${seg.a.x}" y1="${seg.a.y}" x2="${seg.b.x}" y2="${seg.b.y}" stroke="${ALTIN}" stroke-width="9" opacity="0.30"/>`,
        );
      }
    }
  });
  // Menzil çemberleri + yapı noktaları
  m.buildSpots.forEach((s, i) => {
    p.push(
      `<circle cx="${s.x}" cy="${s.y}" r="${m.range}" fill="none" stroke="${ALTIN}" stroke-width="1.5" stroke-dasharray="8 8" opacity="0.35"/>`,
    );
    p.push(`<circle cx="${s.x}" cy="${s.y}" r="22" fill="${PARSOMEN}" stroke="${MUREKKEP}" stroke-width="3"/>`);
    p.push(
      `<text x="${s.x}" y="${s.y + 6}" font-family="monospace" font-size="18" font-weight="700" text-anchor="middle" fill="${MUREKKEP}">${i}</text>`,
    );
    const kaps = m.coverage.find((c) => c.spotIndex === i)?.coveredPx ?? 0;
    p.push(
      `<text x="${s.x}" y="${s.y + 44}" font-family="monospace" font-size="17" text-anchor="middle" fill="${ALTIN}">${Math.round(kaps)}</text>`,
    );
  });
  // Kale
  p.push(
    `<rect x="${m.castle.x - 28}" y="${m.castle.y - 28}" width="56" height="56" fill="${VERMILYON}" stroke="${ALTIN}" stroke-width="3"/>`,
  );
  p.push('</svg>');
  return p.join('\n');
}

const kolOrt = (kol) => {
  const g = kol.filter((c) => c.coveredPx > 0);
  return g.reduce((a, c) => a + c.coveredPx, 0) / g.length;
};

const bolumler = haritalar
  .map((m) => {
    const kollar = m.branchCoverage.map((k, i) => {
      const o = kolOrt(k);
      const ok = o >= 285 && o <= 311;
      return `<span class="rozet ${ok ? 'ok' : 'kotu'}">kol ${i}: ${o.toFixed(1)} px ${ok ? '✓' : '✗'}</span>`;
    });
    return `
<section>
  <h2>${m.id}</h2>
  <p class="ust">
    <span class="rozet">HP ×${m.hpMultiplier}</span>
    <span class="rozet">başlangıç ${m.startGold}</span>
    <span class="rozet">${m.buildSpots.length} nokta</span>
    <span class="rozet">${m.paths.length} kol</span>
    <span class="rozet">${m.waveCount} dalga</span>
    ${kollar.join(' ')}
  </p>
  ${svg(m)}
  <p class="alt">Kadro: ${m.roster.join(' · ')}</p>
</section>`;
  })
  .join('\n');

process.stdout.write(`<style>
  body{background:#0e1626;color:${PARSOMEN};font-family:system-ui,sans-serif;margin:0;padding:24px}
  h1{color:${ALTIN};font-size:26px;margin:0 0 4px}
  h2{color:${ALTIN};font-size:20px;margin:32px 0 8px;text-transform:capitalize}
  section{margin-bottom:36px}
  .rozet{display:inline-block;background:#1d2b47;border:1px solid #35496f;border-radius:999px;
         padding:3px 11px;margin:2px 4px 2px 0;font-size:14px;font-family:monospace}
  .rozet.ok{background:#1b3a26;border-color:#2f6b42;color:#8fdca6}
  .rozet.kotu{background:#3a1b1b;border-color:#6b2f2f;color:#dc8f8f}
  .ust{margin:0 0 10px}
  .alt{font-size:13px;opacity:.75;margin:8px 0 0;font-family:monospace}
  .aciklama{font-size:14px;opacity:.85;max-width:900px;line-height:1.55}
</style>
<h1>Kale Nöbeti — üç harita, gerçek veriden çizildi</h1>
<p class="aciklama">
  Kalın <b style="color:${ALTIN}">altın</b> parçalar her yapı noktasının
  <b>kapsadığı yol</b>; kesikli çember 150 px T1 menzili; kesikli açık çizgi
  <b>uçan hattı</b>. Nokta altındaki sayı o noktanın toplam kapsaması.
  Rozetlerdeki <b>kol ortalaması</b> §9'un 285–311 px bandına göre işaretli —
  ayrık yolda ölçüm <b>kol başına</b> yapılıyor, çünkü bir düşman tek kol yürüyor.
</p>
${bolumler}
`);

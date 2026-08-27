// Sanat hazırlama script'i — `assets-src/` altındaki ham PNG'leri
// `public/assets/` altına üretim-hazır biçimde yazar.
//
// `npm run build`'e bağlı DEĞİL — fontlar gibi bir kez çalıştırılıp
// çıktısı depoya committ edilir (docs/plan/M6-sanat-uretim-brifi.md,
// CLAUDE.md "Varlık formatları").
//
// İki iş:
//   1. 3 harita arka planı -> WebP q80, 1280x720 (harita 1 `bg/`,
//      harita 2-3 `lazy/` — `scripts/report-size.mjs`'in "ilk indirme"
//      hariç tutma yolu tam bu klasör adına bakıyor).
//   2. P02+P03+P04 (33 parça) -> tek `atlas.png` (PNG-8) + `atlas.json`
//      (Phaser "hash" atlas biçimi), basit raf-paketleme (shelf packing).
//   3. Ses efektleri + müzik: WAV -> AAC (.m4a), `ffmpeg-static` ile
//      (M6-ses-uretim-brifi.md). Eksik kaynak dosya sessizce atlanır —
//      kısmi teslim (yalnız SFX veya yalnız müzik) kabul.

import sharp from 'sharp';
import ffmpegYolu from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public', 'assets');

const UYARI_WEBP_BYTE = 400 * 1024;
const AZAMI_ATLAS_PX = 2048;
const RAF_GENISLIK = 1024;

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

// ---------------------------------------------------------------------
// 1. Arka planlar
// ---------------------------------------------------------------------

const ARKA_PLANLAR = [
  { src: ['bg', 'degirmen-gecidi.png'], out: 'bg/degirmen-gecidi.webp' },
  { src: ['bg', 'tas-kopru.png'], out: 'lazy/tas-kopru.webp' },
  { src: ['bg', 'kul-ovasi.png'], out: 'lazy/kul-ovasi.webp' },
  // M6-T05 — menü arka planı, `queueBoot`'ta (ilk indirmenin parçası).
  { src: ['menu', 'menu-bg.png'], out: 'menu-bg.webp' },
];

async function arkaPlanlariUret() {
  for (const bp of ARKA_PLANLAR) {
    const srcPath = path.join(SRC, ...bp.src);
    const outPath = path.join(OUT, bp.out);
    await ensureDir(path.dirname(outPath));
    await sharp(srcPath)
      .resize(1280, 720, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(outPath);
    const { size } = await stat(outPath);
    const kb = Math.round(size / 1024);
    const uyari = size > UYARI_WEBP_BYTE ? '  UYARI: 400 KB hedefini aşıyor' : '';
    console.log(`  ${bp.out}  ${kb} KB${uyari}`);
  }
}

// ---------------------------------------------------------------------
// 1b. Seviye seçim kart küçük resimleri — aynı 3 kaynaktan, küçük boyutta.
//     Yeni sanat değil: P01'in yeniden kullanımı (M6-T05).
// ---------------------------------------------------------------------

const KART_W = 300;
const KART_H = 190;
const KART_KUCUK_RESIMLERI = [
  { src: ['bg', 'degirmen-gecidi.png'], id: 'degirmen-gecidi' },
  { src: ['bg', 'tas-kopru.png'], id: 'tas-kopru' },
  { src: ['bg', 'kul-ovasi.png'], id: 'kul-ovasi' },
];

async function kartKucukResimleriUret() {
  for (const k of KART_KUCUK_RESIMLERI) {
    const srcPath = path.join(SRC, ...k.src);
    const outPath = path.join(OUT, 'level-select', `${k.id}.webp`);
    await ensureDir(path.dirname(outPath));
    await sharp(srcPath)
      .resize(KART_W, KART_H, { fit: 'cover' })
      .webp({ quality: 78 })
      .toFile(outPath);
    const { size } = await stat(outPath);
    console.log(`  level-select/${k.id}.webp  ${Math.round(size / 1024)} KB`);
  }
}

// ---------------------------------------------------------------------
// 2. Atlas — manifest: {ad, dosya, w, h}
// ---------------------------------------------------------------------

const KULE_KUTU = 80;
const DUSMAN_KUTU = 64;
const YAVRU_KUTU = 40;
const BOSS_KUTU = 96;
const YETENEK_KUTU = 48;

const KULE_DOSYALARI = [
  'okcu_t1', 'okcu_t2', 'okcu_t3a_keskin-nisanci', 'okcu_t3b_kundakci',
  'top_t1', 'top_t2', 'top_t3a_havan', 'top_t3b_barut-ficisi',
  'buyu_t1', 'buyu_t2', 'buyu_t3a_yildirim', 'buyu_t3b_buz',
  'kisla_t1', 'kisla_t2', 'kisla_t3a_paladin', 'kisla_t3b_haydutlar',
];

const MANIFEST = [
  // HUD (P02) — ring.png bilerek dışarıda (plan kararı 4: menzil çemberi
  // prosedürel Graphics olarak kalıyor).
  { ad: 'corner', dosya: 'hud/corner.png', w: 96, h: 96 },
  { ad: 'edge-strip', dosya: 'hud/edge-strip.png', w: 128, h: 32 },
  { ad: 'middle-texture', dosya: 'hud/middle-texture.png', w: 64, h: 64 },
  { ad: 'cartouche', dosya: 'hud/cartouche.png', w: 128, h: 128 },
  // Altın uçuşu (M6-T10 görsel iyileştirme) — greybox daireyi değiştiriyor.
  { ad: 'gold-coin', dosya: 'hud/gold-coin.png', w: YETENEK_KUTU, h: YETENEK_KUTU },

  // Kule kademeleri (P03) — 16 tanesi de aynı kare kutu.
  ...KULE_DOSYALARI.map((ad) => ({ ad, dosya: `towers/${ad}.png`, w: KULE_KUTU, h: KULE_KUTU })),

  // Düşman/asker/yetenek (P04).
  { ad: 'goblin', dosya: 'enemies/goblin.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'ork_savasci', dosya: 'enemies/ork_savasci.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'kurt_binicisi', dosya: 'enemies/kurt_binicisi.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'harpi', dosya: 'enemies/harpi.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'zirhli_ork', dosya: 'enemies/zirhli_ork.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'saman', dosya: 'enemies/saman.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'trol', dosya: 'enemies/trol.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'orumcek_ana', dosya: 'enemies/orumcek_ana.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'kisla_askeri', dosya: 'enemies/kisla_askeri.png', w: DUSMAN_KUTU, h: DUSMAN_KUTU },
  { ad: 'orumcek_yavrusu', dosya: 'enemies/orumcek_yavrusu.png', w: YAVRU_KUTU, h: YAVRU_KUTU },
  { ad: 'ogre_sef_boss', dosya: 'enemies/ogre_sef_boss.png', w: BOSS_KUTU, h: BOSS_KUTU },
  { ad: 'meteor_icon', dosya: 'enemies/meteor_icon.png', w: YETENEK_KUTU, h: YETENEK_KUTU },
  { ad: 'takviye_icon', dosya: 'enemies/takviye_icon.png', w: YETENEK_KUTU, h: YETENEK_KUTU },
];

/** Basit raf-paketleme: yüksekliğe göre azalan sırala, sabit genişlikte satırlara diz. */
function rafPaketle(ogeler, azamiGenislik) {
  const sirali = [...ogeler].sort((a, b) => b.h - a.h);
  let x = 0;
  let y = 0;
  let rafYuksekligi = 0;
  let atlasGenislik = 0;
  const yerlesim = [];
  for (const oge of sirali) {
    if (x + oge.w > azamiGenislik && x > 0) {
      x = 0;
      y += rafYuksekligi;
      rafYuksekligi = 0;
    }
    yerlesim.push({ ...oge, x, y });
    x += oge.w;
    atlasGenislik = Math.max(atlasGenislik, x);
    rafYuksekligi = Math.max(rafYuksekligi, oge.h);
  }
  const atlasYukseklik = y + rafYuksekligi;
  return { yerlesim, atlasGenislik, atlasYukseklik };
}

async function atlasUret() {
  const { yerlesim, atlasGenislik, atlasYukseklik } = rafPaketle(MANIFEST, RAF_GENISLIK);

  if (atlasGenislik > AZAMI_ATLAS_PX || atlasYukseklik > AZAMI_ATLAS_PX) {
    throw new Error(
      `Atlas ${atlasGenislik}x${atlasYukseklik} -> ${AZAMI_ATLAS_PX}px sınırını aşıyor.`,
    );
  }

  const kompozitler = [];
  const frames = {};
  for (const oge of yerlesim) {
    const srcPath = path.join(SRC, oge.dosya);
    const buffer = await sharp(srcPath)
      .resize(oge.w, oge.h, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    kompozitler.push({ input: buffer, left: oge.x, top: oge.y });
    frames[oge.ad] = {
      frame: { x: oge.x, y: oge.y, w: oge.w, h: oge.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: oge.w, h: oge.h },
      sourceSize: { w: oge.w, h: oge.h },
    };
  }

  await ensureDir(OUT);
  const atlasPath = path.join(OUT, 'atlas.png');
  await sharp({
    create: {
      width: atlasGenislik,
      height: atlasYukseklik,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(kompozitler)
    .png({ palette: true })
    .toFile(atlasPath);

  const atlasJson = {
    frames,
    meta: {
      app: 'kale-nobeti-prep-assets',
      version: '1.0',
      image: 'atlas.png',
      format: 'RGBA8888',
      size: { w: atlasGenislik, h: atlasYukseklik },
      scale: '1',
    },
  };
  await writeFile(path.join(OUT, 'atlas.json'), JSON.stringify(atlasJson, null, 2));

  const { size } = await stat(atlasPath);
  console.log(`  atlas.png  ${atlasGenislik}x${atlasYukseklik}  ${Math.round(size / 1024)} KB  (${yerlesim.length} kare)`);
}

// ---------------------------------------------------------------------
// 3. Ses — WAV -> AAC (.m4a). `M6-ses-uretim-brifi.md`: efekt ~128 kbps
//    mono, müzik 96 kbps mono, `.ogg` üretilmez.
// ---------------------------------------------------------------------

const SES_EFEKTLERI = [
  'shot_okcu', 'shot_top', 'shot_buyu', 'enemy_death', 'gold',
  'tower_place', 'tower_upgrade', 'error', 'wave_start', 'boss_intro',
  'victory', 'defeat',
];
// `Y05` — ikisi de artık `lazy/` altında: `music_menu` menü göründükten
// SONRA yükleniyor (`MenuScene.ts`, `filecomplete` deseni `music_game`
// ile aynı — `GameScene.ts:504-517`'de zaten çalışan örnek). Eskiden
// `music_menu` `queueBoot`'ta, "ilk indirme"nin **%75'i** tek başına
// oydu (244,5 sn, 2,94 MB) — oyuncu "Oyna"yı görebilmeden önce iniyordu.
//
// `sure` verilen parçalar `sesDosyasiCevir`'de kırpılıyor — bkz. onun
// başındaki not (döngü noktası kulakla değil, kısılarak yumuşatılıyor).
const MUZIK = [
  { ad: 'music_menu', cikisYolu: 'lazy/music_menu.m4a', sure: 60 },
  { ad: 'music_game', cikisYolu: 'lazy/music_game.m4a' },
];

/** Kaynak `.wav` ya da `.mp3` olabilir — sanatçı hangisini verdiyse. */
function sesKaynagiBul(ad) {
  for (const uzanti of ['wav', 'mp3']) {
    const p = path.join(SRC, 'audio', `${ad}.${uzanti}`);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Döngü kırpmasının kenarlarına kısa bir kısılma (fade).
 *
 * `Y05` "kırpma noktası kulakla bulunmalı" diyor — bu script kulakla
 * dinleyemiyor. Rastgele bir saniyede (`sure`) kesilen dalga formu
 * müzikal bir cümlenin ortasına denk gelebilir ve döngü her tekrarında
 * duyulur bir "tık" üretebilirdi. Kısa bir kısılma bu süreksizliği
 * **maskeliyor** — mükemmel bir döngü noktası değil ama güvenilir ve
 * kod tarafından üretilebilir. Kesin bir müzikal döngü noktası
 * isteniyorsa `sure` değeri kulakla ayarlanıp buradaki kısılma
 * kısaltılabilir/kaldırılabilir.
 */
const KIRPMA_KISILMA_SN = 1.2;

async function sesDosyasiCevir(ad, cikisYolu, bitrate, sure) {
  const srcPath = sesKaynagiBul(ad);
  if (srcPath === null) return false;
  const outPath = path.join(OUT, cikisYolu);
  await ensureDir(path.dirname(outPath));

  const args = [
    '-y',
    '-i', srcPath,
    '-vn', // mp3 kaynaklarda gömülü kapak resmi olabiliyor — o bir "video"
           // akışı sayılıyor ve .m4a'ya (ses-only mp4 profili) yazılamıyor.
    '-map', '0:a',
  ];
  if (sure !== undefined) {
    args.push('-t', String(sure));
    args.push(
      '-af',
      `afade=t=in:st=0:d=${KIRPMA_KISILMA_SN},` +
        `afade=t=out:st=${sure - KIRPMA_KISILMA_SN}:d=${KIRPMA_KISILMA_SN}`,
    );
  }
  args.push('-c:a', 'aac', '-b:a', bitrate, '-ac', '1', outPath);

  await execFileAsync(ffmpegYolu, args);
  const { size } = await stat(outPath);
  const etiket = sure !== undefined ? ` (${sure} sn'ye kırpıldı)` : '';
  console.log(`  ${cikisYolu}  ${Math.round(size / 1024)} KB${etiket}`);
  return true;
}

async function sesleriUret() {
  let uretilen = 0;
  for (const ad of SES_EFEKTLERI) {
    if (await sesDosyasiCevir(ad, `audio/sfx/${ad}.m4a`, '128k')) uretilen++;
  }
  for (const m of MUZIK) {
    if (await sesDosyasiCevir(m.ad, m.cikisYolu, '96k', m.sure)) uretilen++;
  }
  const toplam = SES_EFEKTLERI.length + MUZIK.length;
  console.log(`  (${uretilen}/${toplam} kaynak dosya bulundu — eksikler atlandı)`);
}

// ---------------------------------------------------------------------
// 4. Sayı bitmap fontu — Inter Tight'tan `numbers.png` + `numbers.xml`
//    (M6-T01, AngleCode BMFont biçimi). Inter Tight **web fontu olarak
//    indirilmiyor** — kaynak `.ttf` yalnız burada, üretim aracı olarak
//    kullanılıyor (`assets-src/`, pakete girmiyor).
// ---------------------------------------------------------------------

const FONT_TTF = path.join(SRC, 'fonts', 'InterTight-Variable.ttf');
const FONT_PT = 32;
/** `M6-sanat-juice-ses.md` T01: `0-9 + - . , / % × ×2 ›`. `×2` iki ayrı
 * karakterden (`×`, `2`) kuruluyor, tekrar glif gerekmiyor. */
const SAYI_KARAKTERLERI = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '+', '-', '.', ',', '/', '%', '×', '›',
];
/** Rakamlar sabit genişlikte (tabular figürler, `GAME-DESIGN.md` §2) —
 * yoksa altın sayacı her değiştiğinde metin genişliği oynar. */
const RAKAM_PAY = 3;
const SEMBOL_PAY = 2;
const HUCRE_BOSLUK = 1;

async function sayiFontuUret() {
  // Beyaz dolgu: kullanım yerleri `.setTint(renk)` çağırıyor (altın/vermilion/
  // mürekkep) — siyah dolguda tint hiçbir şey değiştirmez (siyah × renk = siyah).
  const metin = `<span foreground="#ffffff">${SAYI_KARAKTERLERI.join(' ')}</span>`;
  const { data, info } = await sharp({
    text: { text: metin, font: `Inter Tight Bold ${FONT_PT}`, fontfile: FONT_TTF, rgba: true },
  })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const inkVarMi = (x) => {
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * channels + 3] > 10) return true;
    }
    return false;
  };
  const araliklar = [];
  let basla = null;
  for (let x = 0; x < width; x++) {
    const var_ = inkVarMi(x);
    if (var_ && basla === null) basla = x;
    if (!var_ && basla !== null) {
      araliklar.push([basla, x - 1]);
      basla = null;
    }
  }
  if (basla !== null) araliklar.push([basla, width - 1]);
  if (araliklar.length !== SAYI_KARAKTERLERI.length) {
    throw new Error(
      `Sayı fontu: ${araliklar.length} parça bulundu, ${SAYI_KARAKTERLERI.length} bekleniyordu ` +
        '(karakterler birbirine değiyor olabilir — Font.PT düşür).',
    );
  }

  const genislikler = araliklar.map(([x0, x1]) => x1 - x0 + 1);
  const azamiRakamGenisligi = Math.max(...genislikler.slice(0, 10));
  const tabularAdvance = azamiRakamGenisligi + 2 * RAKAM_PAY;

  const kompozitler = [];
  const charlar = [];
  let atlasX = 0;
  for (let i = 0; i < SAYI_KARAKTERLERI.length; i++) {
    const [x0, x1] = araliklar[i];
    const inkW = genislikler[i];
    const rakamMi = i < 10;

    const dilim = await sharp(data, { raw: { width, height, channels } })
      .extract({ left: x0, top: 0, width: inkW, height })
      .png()
      .toBuffer();
    kompozitler.push({ input: dilim, left: atlasX, top: 0 });

    const xadvance = rakamMi ? tabularAdvance : inkW + 2 * SEMBOL_PAY;
    const xoffset = rakamMi ? Math.round((tabularAdvance - inkW) / 2) : SEMBOL_PAY;
    charlar.push({
      id: SAYI_KARAKTERLERI[i].codePointAt(0),
      x: atlasX,
      y: 0,
      width: inkW,
      height,
      xoffset,
      yoffset: 0,
      xadvance,
    });

    atlasX += inkW + HUCRE_BOSLUK;
  }
  const atlasGenislik = atlasX - HUCRE_BOSLUK;

  await ensureDir(path.join(OUT, 'fonts'));
  const pngPath = path.join(OUT, 'fonts', 'numbers.png');
  await sharp({
    create: { width: atlasGenislik, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(kompozitler)
    .png({ palette: true })
    .toFile(pngPath);

  const xml = [
    '<?xml version="1.0"?>',
    '<font>',
    `  <info face="Inter Tight" size="${FONT_PT}" bold="1" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="0,0"/>`,
    `  <common lineHeight="${height}" base="${height}" scaleW="${atlasGenislik}" scaleH="${height}" pages="1" packed="0"/>`,
    '  <pages>',
    '    <page id="0" file="numbers.png"/>',
    '  </pages>',
    `  <chars count="${charlar.length}">`,
    ...charlar.map(
      (c) =>
        `    <char id="${c.id}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" ` +
        `xoffset="${c.xoffset}" yoffset="${c.yoffset}" xadvance="${c.xadvance}" page="0" chnl="15"/>`,
    ),
    '  </chars>',
    '</font>',
    '',
  ].join('\n');
  await writeFile(path.join(OUT, 'fonts', 'numbers.xml'), xml);

  const { size } = await stat(pngPath);
  console.log(`  fonts/numbers.png  ${atlasGenislik}x${height}  ${Math.round(size / 1024).toFixed(0)} KB (${size} B)`);
  console.log(`  fonts/numbers.xml  ${charlar.length} karakter`);
}

async function main() {
  if (!existsSync(SRC)) {
    throw new Error(`${SRC} yok — assets-src/ altına kaynak dosyalar konmalı.`);
  }
  console.log('Arka planlar:');
  await arkaPlanlariUret();
  console.log('Seviye seçim kartları:');
  await kartKucukResimleriUret();
  console.log('Atlas:');
  await atlasUret();
  console.log('Ses:');
  await sesleriUret();
  console.log('Sayı fontu:');
  await sayiFontuUret();
  console.log('Bitti.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

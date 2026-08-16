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

import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
  console.log('Bitti.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

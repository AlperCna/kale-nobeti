// itch.io paketleyici — `M8-T15`.
//
// `dist/` içeriğini **kökte `index.html`** olacak şekilde tek bir zip'e
// koyar. itch.io "HTML oyun" yüklemesi zip'in **kökünde** `index.html`
// arıyor; `dist/index.html` biçiminde (bir klasör içinde) yüklenirse
// oyun sayfası boş çıkıyor ve hata mesajı vermiyor.
//
// `npm run build`'e bağlı DEĞİL — yayın anında elle çalıştırılıyor.
// Bağımlılık eklemiyor: zip, Node'un kendi `zlib`'iyle elle yazılıyor
// (deflate + ZIP64 olmayan basit merkezi dizin). Oyun ~5 MB, 200'den az
// dosya; ZIP64'e gerek yok ve `archiver` gibi bir paket getirmek
// `CLAUDE.md`'nin "harici bağımlılık eklemeden önce sor" kuralına takılır.

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { deflateRaw } from 'node:zlib';
import { promisify } from 'node:util';
import { crc32 } from 'node:zlib';
import path from 'node:path';

const deflate = promisify(deflateRaw);

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CIKTI = path.join(ROOT, 'kale-nobeti-itch.zip');

/** itch.io'nun HTML oyun yükleme sınırı. */
const ITCH_SINIR_MB = 1000;

async function dosyalariTopla(dizin, kok = dizin) {
  const girisler = await readdir(dizin, { withFileTypes: true });
  const sonuc = [];
  for (const g of girisler) {
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) {
      sonuc.push(...(await dosyalariTopla(tam, kok)));
    } else {
      // Zip içindeki yol **her zaman** ileri eğik çizgi (Windows'ta da).
      sonuc.push({ tam, zipYolu: path.relative(kok, tam).split(path.sep).join('/') });
    }
  }
  return sonuc;
}

function dosyaBasligi(zipYolu, crc, sikistirilmis, hamBoyut) {
  const ad = Buffer.from(zipYolu, 'utf8');
  const b = Buffer.alloc(30);
  b.writeUInt32LE(0x04034b50, 0); // yerel dosya başlığı imzası
  b.writeUInt16LE(20, 4); // gereken sürüm
  b.writeUInt16LE(0x0800, 6); // bayraklar: ad UTF-8
  b.writeUInt16LE(8, 8); // yöntem: deflate
  b.writeUInt16LE(0, 10); // saat
  b.writeUInt16LE(0, 12); // tarih
  b.writeUInt32LE(crc, 14);
  b.writeUInt32LE(sikistirilmis, 18);
  b.writeUInt32LE(hamBoyut, 22);
  b.writeUInt16LE(ad.length, 26);
  b.writeUInt16LE(0, 28);
  return Buffer.concat([b, ad]);
}

function merkeziGiris(zipYolu, crc, sikistirilmis, hamBoyut, offset) {
  const ad = Buffer.from(zipYolu, 'utf8');
  const b = Buffer.alloc(46);
  b.writeUInt32LE(0x02014b50, 0);
  b.writeUInt16LE(20, 4); // oluşturan sürüm
  b.writeUInt16LE(20, 6); // gereken sürüm
  b.writeUInt16LE(0x0800, 8);
  b.writeUInt16LE(8, 10);
  b.writeUInt16LE(0, 12);
  b.writeUInt16LE(0, 14);
  b.writeUInt32LE(crc, 16);
  b.writeUInt32LE(sikistirilmis, 20);
  b.writeUInt32LE(hamBoyut, 24);
  b.writeUInt16LE(ad.length, 28);
  b.writeUInt16LE(0, 30); // ek alan
  b.writeUInt16LE(0, 32); // yorum
  b.writeUInt16LE(0, 34); // disk
  b.writeUInt16LE(0, 36); // iç öznitelik
  b.writeUInt32LE(0, 38); // dış öznitelik
  b.writeUInt32LE(offset, 42);
  return Buffer.concat([b, ad]);
}

function son(girisSayisi, merkezBoyut, merkezOffset) {
  const b = Buffer.alloc(22);
  b.writeUInt32LE(0x06054b50, 0);
  b.writeUInt16LE(0, 4);
  b.writeUInt16LE(0, 6);
  b.writeUInt16LE(girisSayisi, 8);
  b.writeUInt16LE(girisSayisi, 10);
  b.writeUInt32LE(merkezBoyut, 12);
  b.writeUInt32LE(merkezOffset, 16);
  b.writeUInt16LE(0, 20);
  return b;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('[package-itch] dist/ yok — önce `npm run build`.');
    process.exit(1);
  }
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('[package-itch] dist/index.html yok — yapı eksik.');
    process.exit(1);
  }

  const dosyalar = await dosyalariTopla(DIST);
  // `index.html` **ilk** giriş: itch'in açıcısı sıraya bakmıyor ama
  // `unzip -l` çıktısının ilk satırı bu görevin kabul kriteri.
  dosyalar.sort((a, b) => {
    if (a.zipYolu === 'index.html') return -1;
    if (b.zipYolu === 'index.html') return 1;
    return a.zipYolu.localeCompare(b.zipYolu);
  });

  const parcalar = [];
  const merkez = [];
  let offset = 0;
  let hamToplam = 0;

  for (const d of dosyalar) {
    const veri = await readFile(d.tam);
    const crc = crc32(veri);
    const sikistirilmis = await deflate(veri, { level: 9 });
    hamToplam += veri.length;

    const bas = dosyaBasligi(d.zipYolu, crc, sikistirilmis.length, veri.length);
    parcalar.push(bas, sikistirilmis);
    merkez.push(merkeziGiris(d.zipYolu, crc, sikistirilmis.length, veri.length, offset));
    offset += bas.length + sikistirilmis.length;
  }

  const merkezBuf = Buffer.concat(merkez);
  const zip = Buffer.concat([
    ...parcalar,
    merkezBuf,
    son(dosyalar.length, merkezBuf.length, offset),
  ]);
  await writeFile(CIKTI, zip);

  const { size } = await stat(CIKTI);
  const mb = size / (1024 * 1024);
  console.log('[package-itch]');
  console.log(`  ${dosyalar.length} dosya · ham ${(hamToplam / 1048576).toFixed(2)} MB`);
  console.log(`  kale-nobeti-itch.zip  ${mb.toFixed(2)} MB`);
  console.log(`  ilk giriş: ${dosyalar[0].zipYolu}`);
  if (dosyalar[0].zipYolu !== 'index.html') {
    console.error('  HATA: zip kökünde index.html yok — itch sayfası boş açılır.');
    process.exit(1);
  }
  if (mb > ITCH_SINIR_MB) {
    console.error(`  HATA: itch.io sınırı ${ITCH_SINIR_MB} MB.`);
    process.exit(1);
  }
  console.log('  ✓ kökte index.html, sınır içinde.');
}

await main();

/**
 * Arka plan / yol kontrast ölçümü — `M8-B02`.
 *
 * Yol (`MapRenderer.PATH_COLOR` = `#8A7250`, luma 117) düz bir şerit ve
 * okunurluğu **arka planın lumasına** bağlı. Bu betik her haritanın
 * yolunun iki yanından zemin lumasi örnekleyip yolla farkını basar.
 *
 * Neden var: harita 5'in arka planı geldiğinde gri tonlamada yol
 * kayboldu — ve ölçüm bunun **yeni sanatın kusuru olmadığını**, harita
 * 1'in aylardır yayında olan arka planında da aynı durumun bulunduğunu
 * gösterdi (fark 9). Göz "harita 5 kötü" diyordu; sayı "üç harita kötü"
 * dedi ve çözüm arka planı değiştirmek değil, yola mürekkep kontur
 * koymak oldu (`MapRenderer.PATH_OUTLINE`) — tek değişiklik, beş harita.
 *
 * **Kapı değil, gösterge.** Kontur konduktan sonra düşük fark artık
 * okunurluğu bozmuyor; bu sayılar yeni bir arka plan üretilirken
 * "ortası ne kadar sakin" sorusunun niceliksel cevabı olarak duruyor.
 * O yüzden `npm run guard`'a bağlı değil:
 *
 *     npm run check:bg
 *
 * Harita verisi `scripts/ts-yukle.mjs` ile **canlı** okunuyor; elle
 * kopyalamak `kurallar.mjs`'in elle tutulan harita tablosunun sessizce
 * boş veri basmasıyla aynı hataya davetiye olurdu.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { tsYukle } from './ts-yukle.mjs';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const YOL_LUMA = luma(0x8a, 0x72, 0x50);
/** Yolun **merkezinden** dışarı: şerit yarısı 24 + 16 px pay. */
const ORNEK_UZAKLIK = 40;

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const [{ MAPS: HARITALAR }] = await tsYukle(['/src/data/maps.ts']);

// ------------------------------------------------------------------- ölçüm
/**
 * Harita 1 ilk indirmede, geri kalanı tembel grupta — `report-size.mjs`
 * `lazy/` klasörünü ilk indirme toplamından hariç tutuyor.
 */
function bgYolu(id) {
  return id === 'degirmen-gecidi'
    ? join(KOK, 'public/assets/bg/degirmen-gecidi.webp')
    : join(KOK, `public/assets/lazy/${id}.webp`);
}

async function olc(harita) {
  const { data, info } = await sharp(bgYolu(harita.id))
    .resize(1280, 720, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const kanal = info.channels;
  const pikselLuma = (x, y) => {
    const px = Math.min(1279, Math.max(0, Math.round(x)));
    const py = Math.min(719, Math.max(0, Math.round(y)));
    const i = (py * 1280 + px) * kanal;
    return luma(data[i], data[i + 1], data[i + 2]);
  };

  const ornekler = [];
  for (const yol of harita.paths) {
    for (let i = 0; i < yol.length - 1; i++) {
      const a = yol[i];
      const b = yol[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const L = Math.hypot(dx, dy);
      if (L === 0) continue;
      // Parçanın normali; **iki yan da** örnekleniyor, çünkü yol çoğu
      // yerde iki farklı zemin arasından geçiyor (kaya duvarı / açık kar).
      const nx = -dy / L;
      const ny = dx / L;
      const adim = 1 / Math.max(1, Math.round(L / 12));
      for (let t = 0; t <= 1; t += adim) {
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        if (x < 0 || x > 1280 || y < 0 || y > 720) continue;
        ornekler.push(pikselLuma(x + nx * ORNEK_UZAKLIK, y + ny * ORNEK_UZAKLIK));
        ornekler.push(pikselLuma(x - nx * ORNEK_UZAKLIK, y - ny * ORNEK_UZAKLIK));
      }
    }
  }

  const ortalama = ornekler.reduce((t, v) => t + v, 0) / ornekler.length;
  // En kötü durum: örneklerin yola EN YAKIN dörtte biri. Ortalama tek
  // başına yanıltıcı — bir yanı çok koyu kaya, öbür yanı yola yapışık bir
  // harita ortalamada iyi görünüp o kolda okunmaz kalabiliyor.
  const farklar = ornekler.map((v) => Math.abs(v - YOL_LUMA)).sort((p, q) => p - q);
  return {
    ortalama,
    fark: Math.abs(ortalama - YOL_LUMA),
    enKotuCeyrek: farklar[Math.floor(farklar.length / 4)],
  };
}

console.log('Arka plan / yol kontrastı — yol lumasi', YOL_LUMA.toFixed(0), '(#8A7250)\n');
console.log('harita              zemin   fark   en kötü çeyrek');
console.log('─'.repeat(50));
for (const harita of HARITALAR) {
  const { ortalama, fark, enKotuCeyrek } = await olc(harita);
  console.log(
    harita.id.padEnd(18) +
      ortalama.toFixed(0).padStart(5) +
      fark.toFixed(0).padStart(7) +
      enKotuCeyrek.toFixed(0).padStart(16),
  );
}
console.log(
  '\nDüşük fark artık okunurluğu BOZMUYOR: yolun mürekkep konturu\n' +
    '(MapRenderer.PATH_OUTLINE) zemin ne olursa olsun kenarı ayırıyor.\n' +
    'Bu tablo yeni arka plan üretilirken "ortası ne kadar sakin" göstergesi.',
);

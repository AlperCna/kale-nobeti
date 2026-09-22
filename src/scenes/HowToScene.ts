import Phaser from 'phaser';
import { t } from '../util/i18n';
import { PreloadScene } from './PreloadScene';
import { addPressFeedback, createBackLink } from '../fx/ParchmentFrame';
import type { StringKey } from '../data/strings';

const INK = 0x14203a;
const UST = 100;
/**
 * Satırlar arası nefes.
 *
 * **`M99`: 12 → 9.** On birinci satır (yetenek yükseltmesi) eklenince
 * sayfa alt şeride taşıyordu: son paragraf “← Geri” bağlantısına ve tam
 * ekran düğmesine giriyordu — canlı ekran görüntüsünde görüldü. Akış
 * yerleşimi üst üste binmeyi engelliyor ama sayfa **sığmayı** kendiliğinden
 * çözmüyor; aralık daraltıldı.
 */
const SATIR_ARALIGI = 9;
/** Bölümler arası nefes — başlığın üstünde. */
const BOLUM_ARALIGI = 14;

/**
 * Sayfa **bölümlere ayrılıyor** — `M87`.
 *
 * On satır tek blok halinde duruyordu ve oyuncu gözüyle bakıldığında bir
 * duvar görünüyordu: hepsi aynı punto, aynı renk, aynı aralık. Üç başlık
 * taramanın ölçüsünü veriyor — **ne yaparsın · neyle yaparsın · kime
 * karşı** — ve satırların sırası değişmedi, yalnız gruplandı.
 */
const BOLUMLER: readonly { readonly baslik: StringKey; readonly satirlar: readonly StringKey[] }[] =
  [
    { baslik: 'howToSecBasics', satirlar: ['howTo1', 'howTo3', 'howTo6', 'howTo7'] },
    { baslik: 'howToSecTowers', satirlar: ['howTo2', 'howTo4', 'howTo5', 'howTo11', 'howTo8'] },
    // `M28` — `M12` (yeraltı geçişi) ve `M13` (çağıran boss) bu sayfaya hiç
    // girmemişti; `M10`'un iki mekaniği `howTo8/9` ile eklenip sonrakiler
    // atlanmıştı.
    { baslik: 'howToSecEnemies', satirlar: ['howTo9', 'howTo10'] },
  ];

/**
 * "Nasıl oynanır" — `M8-T13`.
 *
 * Tek sayfa, **statik**. Oyun kendi öğreticisini oynanışta veriyor
 * (`TutorialSystem`, `Y09`); bu sayfa onun yerine geçmiyor, "bir şeyi
 * kaçırdım" diyen oyuncunun bakacağı yer.
 *
 * TIER 1 kural 7: metin bir kez yazılıyor, `setText` yok.
 * `CLAUDE.md` i18n: tüm satırlar `strings.ts`'te; bu dosyada tek bir
 * oyuncuya görünen dizge yok.
 */
export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  preload(): void {
    PreloadScene.queueAtlas(this);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, INK).setOrigin(0);

    this.add
      .text(width / 2, 56, t('howToTitle'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '44px',
        color: '#D4A032',
      })
      .setOrigin(0.5);

    /**
     * **İKİ SÜTUN — `M123`. Tek sütun okunur bir satır uzunluğuna
     * SIĞMIYORDU.**
     *
     * Ölçüldü: `wordWrap` 1080 px ve 20 px Spectral ile satırlar **120
     * karaktere** çıkıyordu; tipografinin okunur bandı 45-75. Sarmayı
     * daraltmak tek başına çözmüyor çünkü sayfa zaten kapasitede — 900
     * px'te taban 683'e çıkıp "← Geri" bağlantısının (678) altına
     * giriyor. Punto ile birlikte on iki birleşim tarandı; **hiçbiri**
     * iki dilde birden hem ≤80 karakter hem ≤660 taban vermiyor
     * (en iyisi 18 px / 620 px: 76 karakter ama taban 704).
     *
     * İki sütun ikisini birden çözüyor: taban **550**, en uzun satır
     * **60** karakter, punto 20'de kalıyor ve 128 px pay açılıyor.
     * Desen projede zaten var (`AchievementsScene`), ve iki sütun sola
     * hizalı metin §2'nin el yazması dilinin kendi biçimi.
     *
     * **Bölümlerin sütuna dağılımı ELLE YAZILMIYOR:** yükseklikler
     * ölçülüp en yüksek sütunu asgariye indiren bölme noktası
     * seçiliyor. Bir satır eklendiğinde denge kendiliğinden yeniden
     * kuruluyor — `M99`'un "on birinci satır sayfayı taşırdı" olayının
     * tekrarı bu yüzden imkânsız.
     */
    const KENAR = 90;
    const ARALIK = 60;
    const SUTUN_W = (width - 2 * KENAR - ARALIK) / 2;

    // 1. geçiş — nesneleri kur ve bölüm yüksekliklerini ÖLÇ.
    const olculen = BOLUMLER.map((bolum) => {
      const baslik = this.add.text(0, 0, t(bolum.baslik), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '24px',
        color: '#D4A032',
      });
      const satirlar = bolum.satirlar.map((k) =>
        this.add.text(0, 0, t(k), {
          fontFamily: 'Spectral, serif',
          fontSize: '20px',
          color: '#E4D3A8',
          align: 'left',
          wordWrap: { width: SUTUN_W },
        }),
      );
      const yukseklik =
        baslik.height +
        10 +
        satirlar.reduce((toplam, s) => toplam + s.height + SATIR_ARALIGI, 0) +
        BOLUM_ARALIGI;
      return { baslik, satirlar, yukseklik };
    });

    // 2. geçiş — en yüksek sütunu asgariye indiren bölme noktası.
    const toplam = olculen.reduce((a, b) => a + b.yukseklik, 0);
    let enIyi = 0;
    let enIyiFark = Number.POSITIVE_INFINITY;
    let birikim = 0;
    for (let k = 1; k <= olculen.length; k++) {
      birikim += olculen[k - 1]?.yukseklik ?? 0;
      const fark = Math.max(birikim, toplam - birikim);
      if (fark < enIyiFark) {
        enIyiFark = fark;
        enIyi = k;
      }
    }

    // 3. geçiş — yerleştir.
    const sutunX = [KENAR, KENAR + SUTUN_W + ARALIK];
    const y = [UST, UST];
    olculen.forEach((bolum, i) => {
      const s = i < enIyi ? 0 : 1;
      const x = sutunX[s] ?? KENAR;
      bolum.baslik.setPosition(x + SUTUN_W / 2, y[s] ?? UST).setOrigin(0.5, 0);
      y[s] = (y[s] ?? UST) + bolum.baslik.height + 10;
      for (const satir of bolum.satirlar) {
        satir.setPosition(x, y[s] ?? UST).setOrigin(0, 0);
        y[s] = (y[s] ?? UST) + satir.height + SATIR_ARALIGI;
      }
      y[s] = (y[s] ?? UST) + BOLUM_ARALIGI;
    });

    createBackLink(this, width / 2, height - 42, t('back'), () => this.scene.start('Menu'));
  }
}

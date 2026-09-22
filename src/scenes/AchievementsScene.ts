import Phaser from 'phaser';
import { t } from '../util/i18n';
import { AchievementSystem } from '../systems/AchievementSystem';
import { LocalStore } from '../util/storage';
import { ACHIEVEMENTS } from '../data/achievements';
import { FRAME_STAR, FRAME_STAR_EMPTY } from '../data/spriteFrames';
import { PreloadScene } from './PreloadScene';

const INK = 0x14203a;
const PARSOMEN = 0xe4d3a8;

/** İki sütun — 12 başarım tek sütunda 720 px'e sığmıyor (ölçüldü). */
const SUTUN = 2;
/**
 * Satır aralığı ve üst kenar **ölçülerek** ayarlandı: ilk değerlerde
 * (52 / 150) liste `y = 410`'da bitiyordu ve altında 230 px boşluk
 * kalıyordu — canlı ekran görüntüsünde blok yukarı yapışık duruyordu.
 */
const SATIR_Y = 54;
const SUTUN_W = 560;
/**
   * `M111` — on yedinci başarım için yeniden ölçüldü (eski: `UST` 190,
   * `SATIR_Y` 58). Bir satır başlık+açıklamayla **40 px**; satır
   * `UST + i × SATIR_Y`'de, alttaki “öldürülen” satırı `720 - 74 = 646`
   * merkezli (üst kenarı ~637).
   *
   * Eski ölçüyle 9 satır son satırı 654'e koyuyor, alt kenarı 673 —
   * öldürülen satırıyla **36 px çakışıyordu**; testin “17+ çakışır”
   * notu doğruydu. Yeni ölçüyle son satır 604, alt kenar 623 — 14 px
   * pay. Satır arası boşluk 18 → 14 px.
   *
   * Bugünkü tavan **18**: 172 + 8×54 + 19 = 623 ≤ 630.
   */
const UST = 172;

/**
 * Başarım listesi — `M8-T07`.
 *
 * TIER 1 kural 7: metin bir kez yazılıyor, `setText` yok.
 * TIER 1 kural 10: kayıt `LocalStore` üzerinden.
 *
 * Açılmamış başarımın **adı ve açıklaması görünüyor** (gizlenmiyor):
 * başarım bir sürpriz değil, bir **hedef listesi**. Gizli başarım
 * oyuncuya ne yapacağını söylemez ve dönüş sebebi olma işini yapmaz —
 * ROADMAP'in "ucuz dönüş sebebi" notu tam bunu istiyor.
 */
export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
  }

  preload(): void {
    // Yıldız kareleri atlasta; menüden gelindiğinde atlas zaten yüklü
    // ama doğrudan bu sahneye başlanırsa (dev) eksik kalmasın.
    PreloadScene.queueAtlas(this);
  }

  create(): void {
    const { width, height } = this.scale;
    const sys = new AchievementSystem(new LocalStore());

    this.add.rectangle(0, 0, width, height, INK).setOrigin(0);
    this.add
      .text(width / 2, 56, t('achievements'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '44px',
        color: '#D4A032',
      })
      .setOrigin(0.5);

    const acik = ACHIEVEMENTS.filter((a) => sys.has(a.id)).length;
    this.add
      .text(width / 2, 106, `${acik} / ${ACHIEVEMENTS.length}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#8A7250',
      })
      .setOrigin(0.5);

    const satirSayisi = Math.ceil(ACHIEVEMENTS.length / SUTUN);
    ACHIEVEMENTS.forEach((a, i) => {
      const sutun = Math.floor(i / satirSayisi);
      const satir = i % satirSayisi;
      const x = width / 2 + (sutun - (SUTUN - 1) / 2) * SUTUN_W;
      const y = UST + satir * SATIR_Y;
      const kazanildi = sys.has(a.id);

      // Parşömen altlık — **seviye seçim kartlarındaki aynı sebep**:
      // kazanılmış yıldızın atlas karesi altın konturlu ama içi mürekkep
      // dolgu (ölçüldü `#14213B`). Mürekkep zeminde dolgu zemine karışıp
      // yıldız boş görünüyordu; 2/12 ekranı 0/12 gibi okunuyordu.
      this.add.rectangle(x - SUTUN_W / 2 + 26, y, 34, 34, PARSOMEN, 0.85);
      this.add
        .image(x - SUTUN_W / 2 + 26, y, 'atlas', kazanildi ? FRAME_STAR : FRAME_STAR_EMPTY)
        .setDisplaySize(26, 26);

      this.add
        .text(x - SUTUN_W / 2 + 52, y - 11, t(a.title), {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '20px',
          color: kazanildi ? '#E4D3A8' : 'rgba(228,211,168,0.45)',
        })
        .setOrigin(0, 0.5);

      this.add
        .text(x - SUTUN_W / 2 + 52, y + 11, t(a.desc), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // Platform: minimum 16 px
          color: kazanildi ? '#8A7250' : 'rgba(138,114,80,0.55)',
        })
        .setOrigin(0, 0.5);
    });

    // Toplam öldürme — sayaçlı başarımların ilerlemesi görünsün.
    this.add
      .text(width / 2, height - 74, `${t('statKills')}: ${sys.kills}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#8A7250',
      })
      .setOrigin(0.5);

    const geri = this.add
      .text(width / 2, height - 42, t('back'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#8A7250',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    geri.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('Menu'));

    // Görsel ayraç: sütunlar arasında ince parşömen çizgi.
    this.add
      .rectangle(width / 2, UST + (satirSayisi - 1) * SATIR_Y * 0.5, 1, satirSayisi * SATIR_Y, PARSOMEN, 0.25)
      .setOrigin(0.5);
  }
}

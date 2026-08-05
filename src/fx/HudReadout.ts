import Phaser from 'phaser';
import { NUMBER_FONT_KEY } from './numberFont';

/**
 * HUD'un **değişen sayıları**: altın, can, hazırlık geri sayımı ve dalga
 * telegrafı adetleri.
 *
 * Hepsi `BitmapText` — TIER 1 kural 7. `Phaser.GameObjects.Text` her içerik
 * değişiminde canvas yeniden üretip GPU'ya yüklüyor; altın ve geri sayım
 * her karede değişiyor.
 *
 * ## Neden `HudScene`'den ayrı dosya
 *
 * `HudScene` duraklatma perdesi ve hız etiketi için statik `Text` yaratıyor.
 * `guard` kontrol 4 "bir dosya `setText` çağırıyorsa `Text` üretmemeli"
 * diyor — düzenli ifade hangi nesneye çağrıldığını ayıramıyor. Ayrım
 * bekçiyi zayıflatmadan çözüyor **ve** doğru mimari: değişen sayılar tek
 * bir yerde toplanıyor.
 */

const GOLD = '#D4A032';
const PARCHMENT = '#E4D3A8';
const VERMILION = '#B03A2E';

/** Etiketler statik; **`HudScene` çiziyor**, burada yalnız sayılar var. */
export interface HudState {
  readonly gold: number;
  readonly lives: number;
  /** `prep` aşamasında kalan saniye; değilse `null`. */
  readonly prepRemainingSec: number | null;
  readonly waveNumber: number;
  readonly totalWaves: number;
}

export class HudReadout {
  readonly #gold: Phaser.GameObjects.BitmapText;
  readonly #lives: Phaser.GameObjects.BitmapText;
  readonly #countdown: Phaser.GameObjects.BitmapText;
  readonly #wave: Phaser.GameObjects.BitmapText;

  /** Son yazılan değerler — **değişmediyse `setText` çağrılmıyor.** */
  #sonGold = Number.NaN;
  #sonLives = Number.NaN;
  #sonCountdown = Number.NaN;
  #sonWave = Number.NaN;

  /**
   * Ekranda **gösterilen** altın. Gerçek altına doğru sayarak yaklaşıyor.
   *
   * §10 son maddesi: "Dalga bitişi: altın sayacı **tek tek sayarak** artar
   * (anında değil)." `M6-T10`'un "bitmedi sayılır eğer" şartı bu.
   */
  #gosterilenGold = Number.NaN;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const yap = (dx: number, dy: number, renk: string): Phaser.GameObjects.BitmapText =>
      scene.add.bitmapText(x + dx, y + dy, NUMBER_FONT_KEY, '').setTint(
        Phaser.Display.Color.HexStringToColor(renk).color,
      );

    this.#gold = yap(0, 0, GOLD);
    this.#lives = yap(0, 34, VERMILION);
    this.#wave = yap(0, 68, PARCHMENT);
    this.#countdown = scene.add
      .bitmapText(scene.scale.width / 2, 16, NUMBER_FONT_KEY, '')
      .setOrigin(0.5, 0)
      .setTint(Phaser.Display.Color.HexStringToColor(GOLD).color);
  }

  /**
   * Sayıları günceller.
   *
   * **Değişmeyen sayıya `setText` çağrılmıyor.** `BitmapText` ucuz ama
   * bedava değil: her `setText` glif dizilimini yeniden kuruyor. Geri sayım
   * saniyeye yuvarlandığı için saniyede bir kez değişiyor, her karede değil.
   */
  update(s: HudState): void {
    const gosterilen = this.#goldSay(s.gold);
    if (gosterilen !== this.#sonGold) {
      this.#gold.setText(String(Math.max(0, gosterilen)));
      this.#sonGold = gosterilen;
    }
    if (s.lives !== this.#sonLives) {
      this.#lives.setText(String(Math.max(0, s.lives)));
      this.#sonLives = s.lives;
    }
    if (s.waveNumber !== this.#sonWave) {
      this.#wave.setText(`${s.waveNumber}.${s.totalWaves}`);
      this.#sonWave = s.waveNumber;
    }

    const kalan = s.prepRemainingSec === null ? -1 : Math.max(0, Math.ceil(s.prepRemainingSec));
    if (kalan !== this.#sonCountdown) {
      this.#countdown.setText(kalan < 0 ? '' : String(kalan));
      this.#sonCountdown = kalan;
    }
  }

  /**
   * §10: altın sayacı **tek tek sayarak** artar, anında değil.
   *
   * ## Neden kare başına oran, sabit adım değil
   *
   * Sabit adım (`+1/kare`) dalga sonu bonusunu (dalga 10'da 80 altın)
   * 80 karede, yani 1,3 saniyede sayardı; ama tek bir goblinin 3 altını da
   * 3 kare sürerdi ve fark edilmezdi. **Kalan farkın %18'i + en az 1**
   * kullanılıyor: küçük artışlar birkaç karede biterken büyük bonuslar
   * gözle görülür şekilde akıyor ve ikisi de aynı formülden çıkıyor.
   *
   * **Düşüş anında.** Kule satın alınca sayaç geriye doğru saymıyor —
   * oyuncu parayı zaten harcadı, gecikme "yetiyor mu" kararını yanıltır.
   */
  #goldSay(hedef: number): number {
    const h = Math.max(0, Math.round(hedef));
    if (!Number.isFinite(this.#gosterilenGold)) {
      this.#gosterilenGold = h; // ilk kare: sayma yok
      return h;
    }
    if (h <= this.#gosterilenGold) {
      this.#gosterilenGold = h; // harcama anında
      return h;
    }
    const fark = h - this.#gosterilenGold;
    this.#gosterilenGold = Math.min(h, this.#gosterilenGold + Math.max(1, Math.ceil(fark * 0.18)));
    return this.#gosterilenGold;
  }

  /** Sahne yeniden başlatmasında — sayaç sıfırdan saymasın. */
  resetCounter(): void {
    this.#gosterilenGold = Number.NaN;
  }
}

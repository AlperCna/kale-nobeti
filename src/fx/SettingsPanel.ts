import Phaser from 'phaser';
import type { Settings, EffectLevel } from '../systems/Settings';

const PARCHMENT = 0xe4d3a8;
const GOLD = 0xd4a032;
const INK = 0x14203a;

/** Platform: minimum dokunmatik hedef 44×44 px, minimum yazı 16 px. */
const SATIR_Y = 58;
const GENISLIK = 420;

const EFEKT_ETIKET: Readonly<Record<EffectLevel, string>> = {
  off: 'Kapalı',
  low: 'Düşük',
  full: 'Tam',
};

/**
 * Ayarlar paneli — `GAME-DESIGN.md` §10 ve **TIER 1 kural 6**.
 *
 * Üç ayar: ses, ekran sarsıntısı, efekt yoğunluğu. Duraklatma perdesinin
 * üstünde açılıyor; `Hud` duraklatmada da çalıştığı için erişilebilir
 * kalıyor (`CLAUDE.md` Mimari).
 *
 * ## TIER 1 kural 7
 *
 * Değer etiketleri (`Açık`/`Kapalı`, `Tam`/`Düşük`/`Kapalı`) **değişen
 * metin**. Kural değişen metni `BitmapText` zorunlu kılıyor ama sayı bitmap
 * fontu yalnız `0-9 + - . %` içeriyor — harf yok. Bu yüzden `M0-T09`'daki
 * hız butonuyla **aynı çözüm** kullanılıyor: her değer için ayrı statik
 * `Text`, yalnız görünürlük değişiyor. `setText` hiç çağrılmıyor, yani
 * kuralın önlemek istediği canvas yeniden üretimi doğmuyor.
 */
export class SettingsPanel {
  readonly #kok: Phaser.GameObjects.Container;
  readonly #sesEtiketleri: Phaser.GameObjects.Text[] = [];
  readonly #sarsintiEtiketleri: Phaser.GameObjects.Text[] = [];
  readonly #efektEtiketleri = new Map<EffectLevel, Phaser.GameObjects.Text>();

  constructor(
    scene: Phaser.Scene,
    private readonly settings: Settings,
    private readonly onChange: () => void,
  ) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.#kok = scene.add.container(w / 2, h / 2).setDepth(200).setVisible(false);

    const arka = scene.add
      .rectangle(0, 0, GENISLIK, 260, INK, 0.96)
      .setStrokeStyle(3, GOLD);
    const baslik = scene.add
      .text(0, -100, 'Ayarlar', {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '32px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);
    this.#kok.add([arka, baslik]);

    this.#satir(scene, -SATIR_Y + 12, 'Ses', this.#sesEtiketleri, ['Açık', 'Kapalı'], () => {
      this.settings.set('sound', !this.settings.state.sound);
      this.refresh();
      this.onChange();
    });

    this.#satir(
      scene,
      12,
      'Ekran sarsıntısı',
      this.#sarsintiEtiketleri,
      ['Açık', 'Kapalı'],
      () => {
        this.settings.set('screenShake', !this.settings.state.screenShake);
        this.refresh();
        this.onChange();
      },
    );

    // Efekt yoğunluğu üç kademeli (S53) — ayrı etiket haritası.
    const y = SATIR_Y + 12;
    this.#kok.add(
      scene.add
        .text(-GENISLIK / 2 + 24, y, 'Efekt yoğunluğu', {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#E4D3A8',
        })
        .setOrigin(0, 0.5),
    );
    const buton = scene.add
      .rectangle(GENISLIK / 2 - 74, y, 116, 44, PARCHMENT)
      .setStrokeStyle(2, GOLD)
      .setInteractive({ useHandCursor: true });
    buton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.settings.cycleEffects();
      this.refresh();
      this.onChange();
    });
    this.#kok.add(buton);
    for (const k of ['off', 'low', 'full'] as EffectLevel[]) {
      const t = scene.add
        .text(GENISLIK / 2 - 74, y, EFEKT_ETIKET[k], {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#14203A',
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.#efektEtiketleri.set(k, t);
      this.#kok.add(t);
    }

    this.refresh();
  }

  #satir(
    scene: Phaser.Scene,
    y: number,
    ad: string,
    etiketler: Phaser.GameObjects.Text[],
    degerler: readonly string[],
    onTap: () => void,
  ): void {
    this.#kok.add(
      scene.add
        .text(-GENISLIK / 2 + 24, y, ad, {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#E4D3A8',
        })
        .setOrigin(0, 0.5),
    );
    const buton = scene.add
      .rectangle(GENISLIK / 2 - 74, y, 116, 44, PARCHMENT)
      .setStrokeStyle(2, GOLD)
      .setInteractive({ useHandCursor: true });
    buton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    this.#kok.add(buton);

    for (const d of degerler) {
      const t = scene.add
        .text(GENISLIK / 2 - 74, y, d, {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#14203A',
        })
        .setOrigin(0.5)
        .setVisible(false);
      etiketler.push(t);
      this.#kok.add(t);
    }
  }

  /** Görünürlükleri duruma göre ayarlar — `setText` yok (TIER 1 k.7). */
  refresh(): void {
    const s = this.settings.state;
    this.#sesEtiketleri[0]?.setVisible(s.sound);
    this.#sesEtiketleri[1]?.setVisible(!s.sound);
    this.#sarsintiEtiketleri[0]?.setVisible(s.screenShake);
    this.#sarsintiEtiketleri[1]?.setVisible(!s.screenShake);
    for (const [k, t] of this.#efektEtiketleri) t.setVisible(k === s.effects);
  }

  setVisible(v: boolean): void {
    this.#kok.setVisible(v);
    if (v) this.refresh();
  }

  get visible(): boolean {
    return this.#kok.visible;
  }
}

import Phaser from 'phaser';
import type { Settings, EffectLevel } from '../systems/Settings';
import { createParchmentButton } from './ParchmentFrame';
import { t } from '../util/i18n';

const GOLD = 0xd4a032;
const INK = 0x14203a;

/** Platform: minimum dokunmatik hedef 44×44 px, minimum yazı 16 px. */
const SATIR_Y = 58;
const GENISLIK = 420;
/**
 * `Y03` Adım 3 — beşinci satır (dil) eklenince yeniden ölçüldü.
 *
 * Satırlar `ILK_SATIR_Y + SATIR_Y * i` formülüyle diziliyor (eskiden dört
 * ayrı elle yazılmış y vardı). Son satırın buton alt kenarı
 * `148 + 22 = 170`, panelin yarı yüksekliği `190` — 20 px pay. Başlığın
 * üst kenarı `-154 - 16 = -170`, aynı pay.
 */
const YUKSEKLIK = 380;
const BASLIK_Y = -154;
const ILK_SATIR_Y = -84;

/** `Y03` — panel etiketleri `strings.ts`'e taşındı. */
function efektEtiket(k: EffectLevel): string {
  return k === 'off' ? t('off') : k === 'low' ? t('effectLow') : t('effectFull');
}

/**
 * Ayarlar paneli — `GAME-DESIGN.md` §10 ve **TIER 1 kural 6**.
 *
 * Beş ayar: dil (`Y03` Adım 3), ses, ekran sarsıntısı, öğretici ipuçları
 * (`Y09`), efekt yoğunluğu. Duraklatma perdesinin üstünde açılıyor; `Hud`
 * duraklatmada da çalıştığı için erişilebilir kalıyor (`CLAUDE.md` Mimari).
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
  readonly #dilEtiketleri: Phaser.GameObjects.Text[] = [];
  readonly #sesEtiketleri: Phaser.GameObjects.Text[] = [];
  readonly #sarsintiEtiketleri: Phaser.GameObjects.Text[] = [];
  readonly #ipucuEtiketleri: Phaser.GameObjects.Text[] = [];
  readonly #efektEtiketleri = new Map<EffectLevel, Phaser.GameObjects.Text>();

  constructor(
    scene: Phaser.Scene,
    private readonly settings: Settings,
    private readonly onChange: () => void,
    private readonly onLocaleChange: () => void,
  ) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.#kok = scene.add.container(w / 2, h / 2).setDepth(200).setVisible(false);

    const arka = scene.add
      .rectangle(0, 0, GENISLIK, YUKSEKLIK, INK, 0.96)
      .setStrokeStyle(3, GOLD);
    const baslik = scene.add
      .text(0, BASLIK_Y, t('settingsTitle'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '32px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);
    this.#kok.add([arka, baslik]);

    /**
     * `Y03` Adım 3 — dil **en üstte**: diğer dört satırın metnini de o
     * belirliyor.
     *
     * Değiştirince `onLocaleChange` `Hud`'u yeniden kuruyor (bekçi k.4
     * `Text` üreten dosyada `setText`'i yasakladığı için tek yol bu) —
     * yani `refresh()` çağırmanın anlamı yok, bu panel birazdan yok
     * olacak ve yenisi doğru dille doğacak.
     */
    this.#satir(
      scene,
      ILK_SATIR_Y,
      t('language'),
      this.#dilEtiketleri,
      [t('langTr'), t('langEn')],
      () => {
        this.settings.set('locale', this.settings.state.locale === 'tr' ? 'en' : 'tr');
        this.onLocaleChange();
      },
    );

    this.#satir(
      scene,
      ILK_SATIR_Y + SATIR_Y,
      t('sound'),
      this.#sesEtiketleri,
      [t('on'), t('off')],
      () => {
        this.settings.set('sound', !this.settings.state.sound);
        this.refresh();
        this.onChange();
      },
    );

    this.#satir(
      scene,
      ILK_SATIR_Y + SATIR_Y * 2,
      t('screenShake'),
      this.#sarsintiEtiketleri,
      [t('on'), t('off')],
      () => {
        this.settings.set('screenShake', !this.settings.state.screenShake);
        this.refresh();
        this.onChange();
      },
    );

    // `Y09` — öğretici ipuçları açık/kapalı. Aynı satır deseni.
    this.#satir(
      scene,
      ILK_SATIR_Y + SATIR_Y * 3,
      t('hints'),
      this.#ipucuEtiketleri,
      [t('on'), t('off')],
      () => {
        this.settings.set('hints', !this.settings.state.hints);
        this.refresh();
        this.onChange();
      },
    );

    // Efekt yoğunluğu üç kademeli (S53) — ayrı etiket haritası.
    const y = ILK_SATIR_Y + SATIR_Y * 4;
    this.#kok.add(
      scene.add
        .text(-GENISLIK / 2 + 24, y, t('effects'), {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#E4D3A8',
        })
        .setOrigin(0, 0.5),
    );
    const buton = createParchmentButton(scene, GENISLIK / 2 - 74, y, 116, 44, 10);
    buton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.settings.cycleEffects();
      this.refresh();
      this.onChange();
    });
    this.#kok.add(buton);
    for (const k of ['off', 'low', 'full'] as EffectLevel[]) {
      const metin = scene.add
        .text(GENISLIK / 2 - 74, y, efektEtiket(k), {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#14203A',
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.#efektEtiketleri.set(k, metin);
      this.#kok.add(metin);
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
    const buton = createParchmentButton(scene, GENISLIK / 2 - 74, y, 116, 44, 10);
    buton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    this.#kok.add(buton);

    for (const d of degerler) {
      // `metin`, imzadaki `t()` (i18n) ile karışmasın diye — bu yereldeki
      // `Text` nesnesinin adı, çevirmen değil.
      const metin = scene.add
        .text(GENISLIK / 2 - 74, y, d, {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#14203A',
        })
        .setOrigin(0.5)
        .setVisible(false);
      etiketler.push(metin);
      this.#kok.add(metin);
    }
  }

  /** Görünürlükleri duruma göre ayarlar — `setText` yok (TIER 1 k.7). */
  refresh(): void {
    const s = this.settings.state;
    this.#dilEtiketleri[0]?.setVisible(s.locale === 'tr');
    this.#dilEtiketleri[1]?.setVisible(s.locale === 'en');
    this.#sesEtiketleri[0]?.setVisible(s.sound);
    this.#sesEtiketleri[1]?.setVisible(!s.sound);
    this.#sarsintiEtiketleri[0]?.setVisible(s.screenShake);
    this.#sarsintiEtiketleri[1]?.setVisible(!s.screenShake);
    this.#ipucuEtiketleri[0]?.setVisible(s.hints);
    this.#ipucuEtiketleri[1]?.setVisible(!s.hints);
    for (const [k, metin] of this.#efektEtiketleri) metin.setVisible(k === s.effects);
  }

  setVisible(v: boolean): void {
    this.#kok.setVisible(v);
    if (v) this.refresh();
  }

  get visible(): boolean {
    return this.#kok.visible;
  }
}

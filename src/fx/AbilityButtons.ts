import Phaser from 'phaser';
import type { AbilityId } from '../types/ability';
import { ABILITIES } from '../data/abilities';
import { createParchmentButton, addPressFeedback } from './ParchmentFrame';
import { NUMBER_FONT_KEY } from './numberFont';
import { METEOR_FRAME, TAKVIYE_FRAME } from '../data/spriteFrames';
import type { StringKey } from '../data/strings';
import { t } from '../util/i18n';

const GOLD = 0xd4a032;
const INK = 0x14203a;

/** Dokunmatik hedef en az 44×44 px (`CLAUDE.md` Platform). */
const BTN = 64;
const IKON_BOYUT = 40;
/** Yükseltme düğmesi — dokunmatik alt sınırı (44) ile aynı. */
const YUKSELT_BTN = 44;
/** Yükseltme düğmesinin yetenek düğmesine göre dikey yeri. */
const YUKSELT_DY = -(BTN / 2 + YUKSELT_BTN / 2 + 12);

/**
 * Etiketler `strings.ts` anahtarı — oyuncu geri bildirimi (2026-09-14):
 * İngilizce arayüzde "Takviye" Türkçe kalıyordu. Sabit dizeydi ve bekçi
 * k.12 yakalayamadı: iki kelimede de aksanlı harf yok (dosyada yazılı kör
 * nokta). Bu dosyada oyuncuya görünen başka metin yok.
 */
const ETIKET: Readonly<Record<AbilityId, StringKey>> = {
  meteor: 'abilityMeteor',
  takviye: 'abilityTakviye',
};

const IKON_KARE: Readonly<Record<AbilityId, string>> = {
  meteor: METEOR_FRAME,
  takviye: TAKVIYE_FRAME,
};

interface Buton {
  readonly id: AbilityId;
  readonly kok: Phaser.GameObjects.Container;
  readonly gfx: Phaser.GameObjects.Graphics;
  /** Yükseltme düğmesi ve fiyatı — `M99`. */
  readonly yukseltKok: Phaser.GameObjects.Container;
  readonly yukseltFiyat: Phaser.GameObjects.BitmapText;
  /** Dinamik vurgu halkası — dolgu yok, yalnız kenar; `ParchmentFrame`'in
   * `Container` olması `setStrokeStyle` taşımıyor, o yüzden ayrı. */
  readonly halka: Phaser.GameObjects.Rectangle;
  /** Hazır olma anında bir kez parlıyor (§8) — iki kez parlamasın diye. */
  parladi: boolean;
}

/**
 * İki yetenek butonu ve **dairesel bekleme dolumu** — `GAME-DESIGN.md` §8.
 *
 * "Bekleme süreleri HUD'da dairesel dolum ile gösterilir; hazır olunca
 * altın kenar bir kez parlar."
 *
 * ## TIER 1 kural 7 burada nasıl karşılanıyor
 *
 * Kalan süre **sayı olarak yazılmıyor**; bilgi dairesel dolumla veriliyor.
 * `setText` hiç çağrılmıyor, yani kuralın önlemek istediği canvas yeniden
 * üretimi hiç doğmuyor. Etiketler ("Meteor", "Takviye") statik.
 *
 * Sayı istenirse M6'da `BitmapText` ile eklenir — kuralın izin verdiği tek
 * yol o. `Text` ile eklemek saniyede bir canvas yeniden üretmek demekti.
 */
export class AbilityButtons {
  readonly #butonlar: Buton[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly onSelect: (id: AbilityId) => void,
    /** Yükseltmeyi satın al — `M99`. */
    private readonly onUpgrade: (id: AbilityId) => void = () => {},
  ) {
    ABILITIES.forEach((def, i) => {
      const bx = x + i * (BTN + 14);
      const kok = scene.add.container(bx, y);

      const cerceve = createParchmentButton(scene, 0, 0, BTN, BTN, 14);
      cerceve.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.onSelect(def.id));

      const ikon = scene.add
        .image(0, 0, 'atlas', IKON_KARE[def.id])
        .setDisplaySize(IKON_BOYUT, IKON_BOYUT);

      // Dolum grafiği ikonun üstünde: bekleme sürerken butonu karartıyor.
      const gfx = scene.add.graphics();

      const halka = scene.add
        .rectangle(0, 0, BTN, BTN, 0x000000, 0)
        .setStrokeStyle(2, GOLD);

      const yazi = scene.add
        .text(0, BTN / 2 + 12, t(ETIKET[def.id]), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // Platform: minimum 16 px
          color: '#E4D3A8',
        })
        .setOrigin(0.5)
        // Düğmenin çerçevesi var, etiketin yok — doğrudan haritanın
        // üstünde duruyor. Soluk altın (#8A7250) harita 5'in koyu yeşil
        // zemininde okunmuyordu (`M8-B01` canlı turu, tam ekran
        // etiketiyle aynı sorun). Parşömen rengi + mürekkep gölge beş
        // haritanın hepsinde kontrastı garantiliyor.
        .setShadow(0, 2, '#14203A', 4, false, true);

      /**
       * **Yükseltme düğmesi** — `M99`, S117'nin gider kalemi.
       *
       * Yalnız **alınabilirken** görünüyor (azami seviyede değil ve altın
       * yetiyor). Gerekçe: harita 1-2'de fiyat hiç karşılanmıyor, yani
       * orada düğme **hiç doğmuyor** ve HUD sade kalıyor; geç haritada ise
       * tam kararın doğduğu anda beliriyor. Yapı menüsünün “sönük ama
       * tıklanabilir” deseni burada uygun değil: o menü oyuncunun açtığı
       * bir pencere, bu ise kalıcı HUD.
       *
       * Fiyat `BitmapText` — seviye atlayınca değişiyor, yani TIER 1
       * kural 7'nin tam hedefi. Ok bir **üçgen** (biçim, renk değil — k.6).
       */
      const yukseltKok = scene.add.container(0, YUKSELT_DY).setVisible(false);
      const yukseltCerceve = createParchmentButton(scene, 0, 0, YUKSELT_BTN, YUKSELT_BTN, 10);
      addPressFeedback(yukseltCerceve);
      yukseltCerceve.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
        this.onUpgrade(def.id),
      );
      const ok = scene.add.graphics();
      ok.fillStyle(INK, 1);
      ok.fillTriangle(-7, -2, 7, -2, 0, -13);
      const yukseltFiyat = scene.add
        .bitmapText(0, 6, NUMBER_FONT_KEY, '')
        .setFontSize(16)
        .setOrigin(0.5, 0.5)
        .setTint(INK);
      yukseltKok.add([yukseltCerceve, ok, yukseltFiyat]);

      kok.add([cerceve, ikon, gfx, halka, yazi, yukseltKok]);
      this.#butonlar.push({ id: def.id, kok, gfx, halka, parladi: true, yukseltKok, yukseltFiyat });
    });
  }

  /**
   * @param progress `0`…`1` — `AbilitySystem.progress(id)`.
   * @param secili Tıkla-hedefle bekleyen yetenek.
   */
  update(
    progress: (id: AbilityId) => number,
    secili: AbilityId | null,
    /**
     * Bir sonraki yükseltmenin fiyatı — gösterilmeyecekse `null`
     * (azami seviye ya da altın yetmiyor). `M99`.
     */
    yukseltmeBedeli: (id: AbilityId) => number | null = () => null,
  ): void {
    for (const b of this.#butonlar) {
      const bedel = yukseltmeBedeli(b.id);
      if (bedel === null) {
        b.yukseltKok.setVisible(false);
      } else {
        // `setText` yalnız değer değişince: seviye atlaması turda en çok
        // iki kez oluyor, her karede yeniden yazmak boşuna iş olurdu.
        const metin = String(bedel);
        if (b.yukseltFiyat.text !== metin) b.yukseltFiyat.setText(metin);
        b.yukseltKok.setVisible(true);
      }
      const p = progress(b.id);
      const hazir = p >= 1;

      b.gfx.clear();
      if (!hazir) {
        // **Dairesel dolum:** kalan kısım mürekkeple örtülü. Saat yönünde
        // açılıyor, yani dolan pasta hazır olan kısım.
        b.gfx.fillStyle(INK, 0.62);
        b.gfx.slice(
          0,
          0,
          BTN * 0.62,
          Phaser.Math.DegToRad(-90 + 360 * p),
          Phaser.Math.DegToRad(270),
          false,
        );
        b.gfx.fillPath();
        b.parladi = false;
      } else if (!b.parladi) {
        // §8: hazır olunca altın kenar **bir kez** parlar.
        b.parladi = true;
        b.halka.setStrokeStyle(4, GOLD);
        b.kok.scene.tweens.add({
          targets: b.halka,
          scale: { from: 1.12, to: 1 },
          duration: 260,
          ease: 'Quad.easeOut',
          onComplete: () => b.halka.setStrokeStyle(2, GOLD),
        });
      }

      // Seçili yetenek belirgin: kalın altın kenar.
      if (b.id === secili) b.halka.setStrokeStyle(4, GOLD);
      else if (hazir && b.parladi) b.halka.setStrokeStyle(2, GOLD);
      else b.halka.setStrokeStyle(2, INK);
    }
  }
}

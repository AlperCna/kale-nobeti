import Phaser from 'phaser';
import type { AbilityId } from '../types/ability';
import { ABILITIES, YETENEK_SEVIYE_SAYISI } from '../data/abilities';
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
 * Seviye başının yarı genişliği ve merkezleri arası — `M100`.
 *
 * Ara ölçüyle bağlı: başın tam genişliği `2×PIM_R` artı kenar kalınlığı,
 * yani ~11,5 px. Ara 13'ken üç dolu baş canlı turda **tek bir altın
 * çubuğa** yapışıyordu ve seviye gözle sayılamıyordu. Bugünkü ölçü
 * 6/17: başlar arası ~3,5 px boşluk, üç baş 47,5 px, düğme 64 px.
 * Büyüklük alt sınırdan değil **okunurluktan** geliyor: portal trafiği
 * 0,62-0,70 ölçeğe düşüyor (`CLAUDE.md` 640×360 şartı) ve 5 px'lik baş
 * orada sayılamıyordu.
 */
const PIM_R = 6;
const PIM_ARA = 17;
/**
 * Pimlerin dikey yeri: parşömen çerçevenin **mürekkep şeridi**.
 * Çerçeve kalınlığı `cornerSize` (14), yani iç parşömen ±18 px ve
 * şerit 18…32 px; pim yarıçapı 5, yani 20–30 arası tam şeridin içinde.
 * Parşömenin içine konsaydı 40 px'lik ikonla çakışırdı.
 */
const PIM_Y = BTN / 2 - 7;

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
  /** Seviye pimleri — `M100`. */
  readonly seviyeGfx: Phaser.GameObjects.Graphics;
  /** En son çizilen seviye; her karede yeniden çizmemek için. */
  cizilenSeviye: number;
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

      /**
       * **Seviye pimleri** — `M100`. Dolum grafiğinden SONRA ekleniyor,
       * yani bekleme karartmasının üstünde kalıyor.
       */
      const seviyeGfx = scene.add.graphics();

      kok.add([cerceve, ikon, gfx, seviyeGfx, halka, yazi, yukseltKok]);
      this.#butonlar.push({
        id: def.id,
        kok,
        gfx,
        halka,
        parladi: true,
        yukseltKok,
        yukseltFiyat,
        seviyeGfx,
        cizilenSeviye: 1,
      });
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
    /** Yürürlükteki yetenek seviyesi (1 tabanı) — `M100`. */
    seviye: (id: AbilityId) => number = () => 1,
  ): void {
    for (const b of this.#butonlar) {
      const sv = seviye(b.id);
      if (sv !== b.cizilenSeviye) {
        b.cizilenSeviye = sv;
        this.#pimleriCiz(b.seviyeGfx, sv);
      }
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

  /**
   * **Seviye pimleri** — `M100`. `M99` yükseltmeyi satılabilir yaptı ama
   * oyuncunun aldığının **hiçbir kalıcı izi** yoktu: yükseltme düğmesi
   * yalnız altın yeterken görünüyor, yani satın alışın hemen ardından
   * (altın düştüğü için) kayboluyor ve ekranda 1404 altının nereye
   * gittiğini söyleyen tek şey kalmıyordu.
   *
   * **Seviye 1'de hiç çizilmiyor.** Boş bir yol göstermek harita 1-3'te
   * ulaşılmayan bir şey vadederdi — oradaki `+ yükseltme` oranı 1'in
   * üstünde (`M100`: 1,47 · 1,45 · 1,37), yani ekonomi tahtayı zaten zor
   * karşılıyor. Yükseltme düğmesinin kendisi de aynı gerekçeyle orada
   * hiç doğmuyor.
   *
   * Bilgi **biçimle** de veriliyor (TIER 1 k.6): alınan seviye **dolu**
   * baş, alınmayan **boş** çerçeve — yalnız renk değil.
   */
  #pimleriCiz(g: Phaser.GameObjects.Graphics, seviye: number): void {
    g.clear();
    if (seviye <= 1) return;
    const sol = -((YETENEK_SEVIYE_SAYISI - 1) * PIM_ARA) / 2;
    for (let i = 0; i < YETENEK_SEVIYE_SAYISI; i++) {
      const cx = sol + i * PIM_ARA;
      // Yol ilkelleri (`beginPath`/`lineTo`) — `fillPoints` DEĞİL: o
      // `Phaser.Geom.Point` isterdi ve özel yapım onu taşımıyor
      // (bekçi 19. kural). Aynı yoldan hem dolgu hem çerçeve çıkıyor.
      /**
       * **İki renk de TERS çevriliyor**, yalnız dolgu değil: alınan pim
       * altın dolgu + mürekkep kenar, alınmayan mürekkep dolgu + altın
       * kenar. Gerekçe canlı turda görüldü — pim dizisi çerçevenin
       * hem mürekkep şeridine hem köşe **altın** bandına taşıyor
       * (üç baş 47,5 px, orta şerit 36 px — sığmıyor). Tek renkli
       * çizimde boş pim altın zeminde kayboluyordu; ters çevrilmiş çift
       * her iki zeminde de okunuyor. TIER 1 k.6: fark **biçimde** de var
       * (som ↔ oyuk), yalnız renkte değil.
       */
      const alindi = i < seviye;
      g.fillStyle(alindi ? GOLD : INK, 1);
      g.lineStyle(1.5, alindi ? INK : GOLD, 1);
      g.beginPath();
      g.moveTo(cx, PIM_Y - PIM_R);
      g.lineTo(cx + PIM_R, PIM_Y);
      g.lineTo(cx, PIM_Y + PIM_R);
      g.lineTo(cx - PIM_R, PIM_Y);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
  }
}

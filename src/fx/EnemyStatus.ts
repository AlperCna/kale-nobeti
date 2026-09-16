/**
 * **Düşmanın üstündeki durum katmanı** — `M30` (iyileşme), `M31` (yanma,
 * yavaşlatma).
 *
 * ## Neden
 *
 * `heal` (Şaman, 8 HP/sn, yarıçap 90) ve `regen` (Trol, 6 HP/sn) canı
 * **hiçbir görsel olmadan** artırıyordu. Oyuncu can çubuğunun geri
 * dolduğunu görüyor ama sebebini göremiyordu; üstelik karşı hamle
 * ("önce Şamanı öldür") tam olarak **kaynağı ayırt etmeyi** gerektiriyor
 * ve sahada iki Şaman kalabalığın içinde kayboluyordu.
 *
 * `M24` oyuncunun sessiz **eylemlerini** kapatmıştı; bu onun aynadaki
 * hâli — sessiz olan **oyunun** eylemi. S93'ün kuralı aynen geçerli:
 * *"görünmeyen takas zar atışıdır"*.
 *
 * Neden yalnız bu ikisi: `shield` ve `burrow` (`M10`, `M12`) hem görselle
 * hem ipucuyla geldi; `split` ve `summon`'ın görseli zaten var (yavruların
 * kendisi ekranda beliriyor). Geriye **sayıyı sessizce değiştiren tam iki
 * mekanik** kalıyordu.
 *
 * ## `M31` — aynı boşluk, oyuncunun tarafında
 *
 * Kule etkileri de görünmüyordu. Yanma için bu **tutulmamış bir sözdü**:
 * `GameScene.#etkileriIsle` yanma hasarının sayı üretmemesini şöyle
 * gerekçelendiriyor — *"M6'da yanan düşmana turuncu bir tint verilecek —
 * bilgi kaybolmuyor, kanal değişiyor"*. Sayı kaldırıldı, kanal hiç
 * açılmadı; bilgi `M31`'e kadar kayıptı.
 *
 * Yavaşlatmanınki daha da keskin: `howTo8` oyuncuya bir sinerji
 * öğretiyor (*"yavaşlatılmış düşman fiziksel hasardan daha çok
 * etkilenir"*) ama o durumu görmesinin hiçbir yolu yoktu.
 *
 * İkisi de **en pahalı kararın** karşılığı: Kundakçı (Okçu 3b) ve Buz
 * (Büyü 3b). Satın alma anında `dalOzeti` etkiyi veriden türetip
 * yazıyor; sahada karşılığı yoktu.
 *
 * ## Durum tutmuyor
 *
 * Her karede canlı düşman listesinden **yeniden türetiliyor**: `clear()` +
 * yeniden çizim. Bayrak tutulsaydı havuza dönen düşmanda sıfırlanması
 * gerekirdi (TIER 1 kural 3) ve bu, bu projede beş kez hata üretmiş sınıf.
 * Sıfırlanacak alan yok.
 *
 * ## Menzil kuralı burada DEĞİL
 *
 * `healKapsiyorMu` `systems/EnemyAbilitySystem`'den geliyor — oyunun
 * iyileştirmeyi **uygularken** çağırdığı fonksiyonun aynısı. Kopyalansaydı
 * halka bir yeri gösterirken iyileşme başka yere giderdi ve oyuncu yanlış
 * düşmanı öldürürdü (S80/S106 sınıfı).
 *
 * TIER 1 kural 1: yarıçap `data/enemies.ts`'ten okunuyor, burada sayı yok.
 * TIER 1 kural 6: bilgi renge değil **şekle** dayanıyor — halka ve artı
 * işareti, rengi görmeyen oyuncuda da okunur.
 */

import Phaser from 'phaser';
import type { AbilityEnemy } from '../systems/EnemyAbilitySystem';
import { healKapsiyorMu } from '../systems/EnemyAbilitySystem';
import type { ActiveEffects } from '../systems/effects';
import { gomuluMu } from '../systems/TargetingSystem';
import type { MapRenderer } from './MapRenderer';

/**
 * Bu katmanın bir düşmandan gördüğü yüzey — `Enemy` sınıfı değil (k.11'in
 * `Targetable`/`AbilityEnemy` deseni). Yetenek alanlarına **artı** süreli
 * kule etkileri gerekiyor.
 */
export interface DurumDusman extends AbilityEnemy {
  readonly effects: ActiveEffects;
  /** `gomuluMu` `Targetable` istiyor; `Enemy` zaten taşıyor. */
  readonly remainingDistance: number;
}

const INK = 0x14203a;
/** Zincifre yeşili — altın oyuncunun rengi, iyileşme onunla karışmamalı. */
const SIFA = 0x6f9e5c;
/** Kor turuncusu — `GameScene.#etkileriIsle`'nin söz verdiği "turuncu". */
const KOR = 0xc8622a;
/** Soluk buz mavisi — kalkanın doygun mavisinden ayrı bir ton. */
const BUZ = 0x7fb6c8;
/** Parşömen — rozet her arka planda okunsun diye en açık ton. */
const ROZET = 0xe4d3a8;

/**
 * Can çubuğu `y - 30`'da ve 40 px geniş (`EnemyHealthBar`); işaret onun
 * **sağına** düşüyor — oyuncu zaten oraya bakıyor.
 *
 * Boyut platform kısıtından geliyor, göz kararından değil: arayüz
 * 640×360'a küçültüldüğünde okunur kalmalı (CLAUDE.md, Poki/CrazyGames).
 * İlk çizimde kol 4 px'ti; yarıya inince 4 px'lik bir artı kalıyordu ve
 * ekranda seçilmiyordu. Kol 6 → tam ölçekte 12 px, yarıda 6 px; oyunun
 * kendi can çubuğu o ölçekte 3 px yüksekliğinde, yani işaret ondan
 * **daha** okunur.
 */
const ISARET_KOL = 6;
const ISARET_KALINLIK = 3;
const ISARET_KONTUR = 5;

/**
 * **Üç yuva, çakışmasın diye ayrı.** Bir düşman aynı anda hem yanıyor hem
 * iyileşiyor olabilir (Şamanın çemberindeki yanan ork) — tek yuva
 * paylaşsalardı biri ötekini gizlerdi.
 *
 * Can çubuğu `y - 30`'da ve 40 px geniş (`EnemyHealthBar`), gövde 30 px
 * (`ENEMY_SIZE`, yani `y - 15`'ten başlıyor). Yuvalar bu iki şeyin
 * arasına ve yanlarına düşüyor.
 */
const YUVA = {
  /** Cana **eklenen** — çubuğun sağı. */
  iyilesme: { dx: 30, dy: -30 },
  /** Candan **eksilen** — çubuğun solu. */
  yanma: { dx: -30, dy: -30 },
  /** Hıza etki eden — çubukla gövde arasında, ortada. */
  yavaslama: { dx: 0, dy: -21 },
  /**
   * **Tür rozeti** — çubuğun *üstünde*, geçici durumların hepsinin dışında.
   * Yeri bilerek ayrı: ötekiler "şu an başına gelen", bu "bu ne".
   */
  rozet: { dx: 0, dy: -44 },
} as const;

export class EnemyStatus {
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #renderer: MapRenderer;

  constructor(scene: Phaser.Scene, renderer: MapRenderer) {
    // Ad, tarayıcıda katmanı ayırt etmek için (`M30`/`M31` doğrulaması).
    this.#g = scene.add.graphics().setName('enemyStatus');
    this.#renderer = renderer;
  }

  /**
   * @param aktif Havuzun o karedeki canlı düşmanları.
   * @returns Sahada **şifacı var mı** — `MapRenderer.updateFlyerHint`
   * deseni: olayı `GameScene` yayıyor, bu katman yalnız bildiriyor.
   * `fx/` oyun olayı yaymıyor (mimari kural: sistemler `EventBus`'tan
   * haberleşir, süsleme katmanı değil).
   */
  update(aktif: readonly DurumDusman[]): boolean {
    const g = this.#g;
    g.clear();

    // Birinci geçiş: şifacıların erişim çemberi. Aynı geçişte şifacıları
    // topluyorum ki ikinci geçiş hiç şifacı yokken O(n²)'ye girmesin —
    // haritaların çoğunda liste **boş**.
    const sifacilar: DurumDusman[] = [];
    for (const e of aktif) {
      if (!e.alive || e.def === null) continue;
      const y = e.def.ability;
      if (y === undefined) continue;
      if (y.kind !== 'heal') continue;
      sifacilar.push(e);
      // Mürekkep alt kontur + renk: `MapRenderer`'ın menzil çemberiyle
      // aynı teknik — arka plan lumasına bağımlı kalmasın diye (M8-B02).
      this.#renderer.dashedCircle(g, e, y.radius + 1.5, INK, 3);
      this.#renderer.dashedCircle(g, e, y.radius, SIFA, 2);
    }

    // İkinci geçiş: düşman başına durum işaretleri. Üçü de **o karenin**
    // gerçeğinden türetiliyor; hiçbiri bayrak tutmuyor.
    for (const e of aktif) {
      if (!e.alive || e.def === null) continue;

      // Cana eklenen. Tam candayken `#iyilestir` hiçbir şey yapmıyor;
      // işaret koymak oyuncuya olmayan bir tehdit gösterirdi.
      if (e.hp < e.maxHp && this.#canArtiyorMu(e, sifacilar)) {
        this.#arti(g, e.x + YUVA.iyilesme.dx, e.y + YUVA.iyilesme.dy);
      }

      // Candan eksilen — `M31`'in tuttuğu söz.
      if (e.effects.burnSeconds > 0) {
        this.#alev(g, e.x + YUVA.yanma.dx, e.y + YUVA.yanma.dy);
      }

      // Hıza etki eden. `effects.slowSeconds` tek doğru kaynak:
      // `speedFactor` alanı `Mover` için türetiliyor ve öfkelenmiş boss
      // gibi başka çarpanlarla karışabiliyor.
      if (e.effects.slowSeconds > 0) {
        this.#yavas(g, e.x + YUVA.yavaslama.dx, e.y + YUVA.yavaslama.dy);
      }

      // **Kazıcı rozeti** (`M32`). Yalnız yerüstündeyken: gömülüyken
      // solukluk zaten "nereye gitti"yi söylüyor, rozet "bu ne"yi.
      // `gomuluMu` `TargetingSystem`'den — oyun kimi hedefleyemiyorsa
      // rozet tam o anda kalkıyor, ayrı bir eşik yazılmıyor (S80 sınıfı).
      if (e.def.ability?.kind === 'burrow' && !gomuluMu(e)) {
        this.#kazici(g, e.x + YUVA.rozet.dx, e.y + YUVA.rozet.dy);
      }
    }

    return sifacilar.length > 0;
  }

  #canArtiyorMu(e: DurumDusman, sifacilar: readonly DurumDusman[]): boolean {
    if (e.def?.ability?.kind === 'regen') return true;
    for (const kaynak of sifacilar) {
      if (healKapsiyorMu(kaynak, e)) return true;
    }
    return false;
  }

  /**
   * Her işaret **iki kez** çiziliyor: önce kalın mürekkep konturu, sonra
   * ince renk. Parşömen yolun ve yeşil çimenin üstünde aynı okunurlukta
   * kalsın diye — `MapRenderer`'ın yol konturuyla aynı gerekçe (M8-B02).
   */
  #ciz(
    g: Phaser.GameObjects.Graphics,
    renk: number,
    kalem: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    for (const [c, k] of [
      [INK, ISARET_KONTUR],
      [renk, ISARET_KALINLIK],
    ] as const) {
      g.lineStyle(k, c, 1);
      g.beginPath();
      kalem(g);
      g.strokePath();
    }
  }

  /** İyileşme: **artı** — iki çizgi. */
  #arti(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    this.#ciz(g, SIFA, (p) => {
      p.moveTo(cx - ISARET_KOL, cy);
      p.lineTo(cx + ISARET_KOL, cy);
      p.moveTo(cx, cy - ISARET_KOL);
      p.lineTo(cx, cy + ISARET_KOL);
    });
  }

  /**
   * Yanma: **yukarı üçgen** — kapalı bir şekil, artıyla karışmıyor.
   * Şekil taşıyor, renk yalnız pekiştiriyor (TIER 1 kural 6).
   */
  #alev(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    this.#ciz(g, KOR, (p) => {
      p.moveTo(cx - ISARET_KOL, cy + ISARET_KOL);
      p.lineTo(cx, cy - ISARET_KOL);
      p.lineTo(cx + ISARET_KOL, cy + ISARET_KOL);
      p.lineTo(cx - ISARET_KOL, cy + ISARET_KOL);
    });
  }

  /**
   * Yavaşlatma: **aşağı bakan çift çevron** — "geri tutuluyor" okuması.
   * Kalkanın mavi çemberiyle karışmıyor: o gövdeyi saran bir daire,
   * bu çubuğun altında küçük bir işaret.
   */
  #yavas(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    this.#ciz(g, BUZ, (p) => {
      for (const kayma of [-4, 0]) {
        p.moveTo(cx - ISARET_KOL, cy + kayma);
        p.lineTo(cx, cy + kayma + 4);
        p.lineTo(cx + ISARET_KOL, cy + kayma);
      }
    });
  }

  /**
   * **Kazıcı rozeti: yatay zemin çizgisi + onu delip inen bir çizgi.**
   *
   * Neden var (`M32`): Tünelci'nin kendi karesi yok, **Örümcek Ana'nın
   * karesini** kullanıyor (`data/spriteFrames.ts`, `M12`'den beri geçici).
   * Ölçüldü: Örümcek Ana harita 3-4-5'te, Tünelci **yalnız harita 6'da
   * ama on dalganın dokuzunda**. Yani ikisi hiç karşılaşmıyor — sorun
   * karışıklık değil, **yanlış öğrenme**: oyuncu üç harita boyunca "bu
   * silüet ölünce üç yavru verir" diye öğreniyor, son haritada aynı
   * silüet yeraltına iniyor. Sahada düşman adı hiçbir yerde yazmıyor
   * (`enemySummary` yalnız dalga telgrafında), yani ayırt edecek başka
   * kanal yoktu.
   *
   * Şekil seçildi, renk değil: k.6 bilginin yalnız renge dayanmasını
   * yasaklıyor ve zaten iki silüet **aynı**, ayrımı renge yıkmak onu
   * göremeyen oyuncuda hiç çalışmazdı.
   */
  #kazici(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    this.#ciz(g, ROZET, (p) => {
      // Zemin çizgisi ve **yalnız altına** inen bir gövde — "⊥".
      // İlk çizimde gövde çizginin üstüne de taşıyordu ve şekil artıya
      // benziyordu; tarayıcıda yan yana görülünce fark edildi. Şekil
      // dilinde iki işaret aynı şekli kullanamaz — artı **iyileşme**.
      p.moveTo(cx - ISARET_KOL, cy);
      p.lineTo(cx + ISARET_KOL, cy);
      p.moveTo(cx, cy);
      p.lineTo(cx, cy + ISARET_KOL);
    });
  }

  destroy(): void {
    this.#g.destroy();
  }
}

/**
 * **Şaman erişim halkası ve iyileşme işareti** — `M30`.
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
import type { MapRenderer } from './MapRenderer';

const INK = 0x14203a;
/** Zincifre yeşili — altın oyuncunun rengi, iyileşme onunla karışmamalı. */
const SIFA = 0x6f9e5c;

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
const ISARET_DX = 30;
const ISARET_DY = 30;
const ISARET_KOL = 6;
const ISARET_KALINLIK = 3;
const ISARET_KONTUR = 5;

export class HealAura {
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #renderer: MapRenderer;

  constructor(scene: Phaser.Scene, renderer: MapRenderer) {
    // Ad, tarayıcıda katmanı ayırt etmek için (`M30` doğrulaması).
    this.#g = scene.add.graphics().setName('healAura');
    this.#renderer = renderer;
  }

  /**
   * @param aktif Havuzun o karedeki canlı düşmanları.
   * @returns Sahada **şifacı var mı** — `MapRenderer.updateFlyerHint`
   * deseni: olayı `GameScene` yayıyor, bu katman yalnız bildiriyor.
   * `fx/` oyun olayı yaymıyor (mimari kural: sistemler `EventBus`'tan
   * haberleşir, süsleme katmanı değil).
   */
  update(aktif: readonly AbilityEnemy[]): boolean {
    const g = this.#g;
    g.clear();

    // Birinci geçiş: şifacıların erişim halkası. Aynı geçişte şifacıları
    // topluyorum ki ikinci geçiş hiç şifacı yokken O(n²)'ye girmesin —
    // haritaların çoğunda liste **boş**.
    const sifacilar: AbilityEnemy[] = [];
    for (const e of aktif) {
      if (!e.alive || e.def === null) continue;
      const y = e.def.ability;
      if (y === undefined) continue;
      if (y.kind !== 'heal') continue;
      sifacilar.push(e);
      // Mürekkep alt kontur + renk: `MapRenderer`'ın menzil halkasıyla
      // aynı teknik — arka plan lumasına bağımlı kalmasın diye (M8-B02).
      this.#renderer.dashedCircle(g, e, y.radius + 1.5, INK, 3);
      this.#renderer.dashedCircle(g, e, y.radius, SIFA, 2);
    }

    // İkinci geçiş: **o an gerçekten canı artan** düşmanlar.
    for (const e of aktif) {
      if (!e.alive || e.def === null) continue;
      // Tam candayken `#iyilestir` hiçbir şey yapmıyor; işaret koymak
      // oyuncuya olmayan bir tehdit gösterirdi.
      if (e.hp >= e.maxHp) continue;
      if (!this.#canArtiyorMu(e, sifacilar)) continue;
      this.#arti(g, e.x, e.y);
    }

    return sifacilar.length > 0;
  }

  #canArtiyorMu(e: AbilityEnemy, sifacilar: readonly AbilityEnemy[]): boolean {
    if (e.def?.ability?.kind === 'regen') return true;
    for (const kaynak of sifacilar) {
      if (healKapsiyorMu(kaynak, e)) return true;
    }
    return false;
  }

  /** Küçük bir artı — can çubuğunun sağında, iki çizgi. */
  #arti(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const cx = x + ISARET_DX;
    const cy = y - ISARET_DY;
    for (const [renk, kalinlik] of [
      [INK, ISARET_KONTUR],
      [SIFA, ISARET_KALINLIK],
    ] as const) {
      g.lineStyle(kalinlik, renk, 1);
      g.beginPath();
      g.moveTo(cx - ISARET_KOL, cy);
      g.lineTo(cx + ISARET_KOL, cy);
      g.moveTo(cx, cy - ISARET_KOL);
      g.lineTo(cx, cy + ISARET_KOL);
      g.strokePath();
    }
  }

  destroy(): void {
    this.#g.destroy();
  }
}

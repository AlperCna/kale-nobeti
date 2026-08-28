import Phaser from 'phaser';
import type { MapDef } from '../types/map';
import type { Vec2 } from '../types/common';
import type { Wave } from '../types/wave';
import { PathSystem } from '../systems/PathSystem';
import { getEnemy } from '../data/enemies';
import { COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { averageCoverage, coveredSegments } from '../util/coverage';

/**
 * `Y01` adım 2 — harita çizimi `GameScene`'den buraya taşındı: statik yol/
 * yapı noktası/kale çizimi, geliştirme-only kapsama göstergesi, hover
 * vurgusu (kesikli menzil çemberi + kapsanan yol), uçan ipucu hattı, ve
 * ikisinin de paylaştığı kesikli-çizgi/kesikli-çember yardımcıları.
 *
 * `#drawRally` (`GameScene.ts`) **taşınmadı** — kışla durumuna
 * (`#barracksBySpot`) bağlı, planın kendi notu "ilk turda bırakılabilir"
 * diyor. Yine de onun kullandığı `dashedLine`/`dashedCircle` buradan
 * (public) çağrılıyor — tek kopya, iki çağıran.
 */
const PATH_COLOR = 0x8a7250; // Yol: parşömen ile mürekkep arası ara ton
const PATH_WIDTH = 48;
const SPOT_COLOR = 0xe4d3a8; // Parşömen
/** Yarıçap 22 → çap 44 px: platform dokunmatik hedef alt sınırı. */
const SPOT_RADIUS = 22;
const CASTLE_COLOR = 0x14203a; // Mürekkep
const GOLD = 0xd4a032; // Altın varak
const INK = 0x14203a;
const CASTLE_SIZE = 56;

export class MapRenderer {
  readonly #scene: Phaser.Scene;
  readonly #map: MapDef;
  readonly #hoverGfx: Phaser.GameObjects.Graphics;
  readonly #flyerGfx: Phaser.GameObjects.Graphics;
  #flyerHintOn = false;

  constructor(scene: Phaser.Scene, map: MapDef) {
    this.#scene = scene;
    this.#map = map;
    this.#flyerGfx = scene.add.graphics();
    this.#hoverGfx = scene.add.graphics();
    this.#drawMap();
  }

  /** `dev.flyerHintOn` — sahnenin kendi hook'u buradan okuyor. */
  get flyerHintActive(): boolean {
    return this.#flyerHintOn;
  }

  #drawMap(): void {
    const g = this.#scene.add.graphics();

    // Birden fazla giriş varsa (harita 2/3) **hepsi** çizilir — yalnız
    // `paths[0]` çizilirse ikinci girişin yolu ekranda hiç görünmez, oysa
    // düşman artık gerçekten oradan da geliyor.
    for (const yol of this.#map.paths) {
      g.lineStyle(PATH_WIDTH, PATH_COLOR, 1);
      g.beginPath();
      yol.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.strokePath();
      // Keskin virajda (S13) köşe boşluk bırakıyor; nokta ile dolduruluyor.
      g.fillStyle(PATH_COLOR, 1);
      for (const p of yol) g.fillCircle(p.x, p.y, PATH_WIDTH / 2);
    }

    for (const s of this.#map.buildSpots) {
      g.fillStyle(SPOT_COLOR, 1);
      g.fillCircle(s.x, s.y, SPOT_RADIUS);
      g.lineStyle(3, GOLD, 1);
      g.strokeCircle(s.x, s.y, SPOT_RADIUS);
    }

    // Kale — mürekkep zemin üstünde mürekkep kare görünmez, altın kontur şart.
    const c = this.#map.castle;
    g.fillStyle(CASTLE_COLOR, 1);
    g.fillRect(c.x - CASTLE_SIZE / 2, c.y - CASTLE_SIZE / 2, CASTLE_SIZE, CASTLE_SIZE);
    g.lineStyle(4, GOLD, 1);
    g.strokeRect(c.x - CASTLE_SIZE / 2, c.y - CASTLE_SIZE / 2, CASTLE_SIZE, CASTLE_SIZE);

    this.#drawCoverageOverlay();
  }

  /**
   * `M1-T09` — kapsama göstergesi. **Yalnız geliştirmede.**
   * `CLAUDE.md` Platform: yayın yapısında hata ayıklama göstergesi bulunmaz.
   *
   * TIER 1 kural 7 ihlali değil: bir kez yazılıp bir daha değişmiyor.
   */
  #drawCoverageOverlay(): void {
    if (!import.meta.env.DEV) return;

    const stil = { fontFamily: 'monospace', fontSize: '16px', color: '#D4A032' };
    this.#map.coverage.forEach((c, i) => {
      const s = this.#map.buildSpots[i];
      if (s === undefined) return;
      this.#scene.add
        .text(s.x, s.y - SPOT_RADIUS - 14, `${Math.round(c.coveredPx)}`, stil)
        .setOrigin(0.5, 1);
    });

    const L = this.#map.paths.reduce(
      (t, p) => t + (p.length > 1 ? new PathSystem(p).totalLength : 0),
      0,
    );
    this.#scene.add.text(
      12,
      12,
      `ort: ${averageCoverage(this.#map.coverage).toFixed(1)} px · L: ${L.toFixed(0)} px · menzil: ${COVERAGE_REFERENCE_RANGE}`,
      { fontFamily: 'monospace', fontSize: '16px', color: '#E4D3A8' },
    );
  }

  /**
   * `GAME-DESIGN.md` §4.5 + §2: kesikli altın menzil çemberi + mürekkep
   * kontur, ve o noktanın **kapsadığı yol parçası** kalın altın çizgiyle.
   *
   * Tek bir `Graphics` nesnesi **yeniden çiziliyor**, her karede yenisi
   * yaratılmıyor — üstelik yalnız hover değiştiğinde (çağıran taraf karar
   * veriyor).
   */
  drawHover(hoveredSpotIndex: number): void {
    const g = this.#hoverGfx;
    g.clear();

    const spot = hoveredSpotIndex >= 0 ? this.#map.buildSpots[hoveredSpotIndex] : undefined;
    if (spot === undefined) return;

    const menzil = COVERAGE_REFERENCE_RANGE;

    // Kapsanan yol vurgusu — `coveredSegments` ile, yani ekranda görünen
    // çizgi ile `MapDef.coverage` içindeki sayı aynı hesaptan geliyor.
    // `Y13`: bütün yollar geziliyor — yalnız `paths[0]` çizilseydi harita
    // 2/3'ün ikinci kolundaki kapsama hiç görünmezdi, oysa `MapDef.coverage`
    // (yukarıdaki yorumun "aynı hesap" dediği sayı) ikisini de topluyor.
    g.lineStyle(10, GOLD, 0.55);
    for (const yol of this.#map.paths) {
      for (const p of coveredSegments(yol, spot, menzil)) {
        g.beginPath();
        g.moveTo(p.a.x, p.a.y);
        g.lineTo(p.b.x, p.b.y);
        g.strokePath();
      }
    }

    // Menzil uçan hattını kesiyorsa o parça da vurgulanıyor (§5) — oyuncu
    // "bu nokta harpiyi görüyor mu" sorusunu bakarak cevaplayabilsin.
    g.lineStyle(8, 0x3e5ca8, 0.5); // lapis — uçan
    for (const uc of this.#map.flyerPaths) {
      for (const p of coveredSegments(uc, spot, menzil)) {
        g.beginPath();
        g.moveTo(p.a.x, p.a.y);
        g.lineTo(p.b.x, p.b.y);
        g.strokePath();
      }
    }

    // Kesikli altın çember + mürekkep dış kontur.
    // Kontursuz çember yoğun dalgada kayboluyor (`GAME-DESIGN.md` §2).
    this.dashedCircle(g, spot, menzil + 1.5, INK, 3);
    this.dashedCircle(g, spot, menzil, GOLD, 2);
  }

  /**
   * **Uçan hattı gösterimi** (`M4-T06`, `GAME-DESIGN.md` §5 — zorunlu).
   *
   * "Harpi yolu takip etmediği için, uçuş hattı kule menzillerinden
   * geçmiyorsa harpi **garantili sızar** — oyuncunun hiçbir kararı bunu
   * değiştiremez." Defense Grid'in çözümü: hazırlık aşamasında hattı göster.
   *
   * Hat **yalnız o dalgada uçan varsa** ve **yalnız hazırlıkta** görünüyor;
   * dalga başlayınca sönüyor.
   */
  updateFlyerHint(upcomingWave: Wave | undefined): void {
    const g = this.#flyerGfx;

    const ucanVar =
      upcomingWave !== undefined &&
      upcomingWave.groups.some((gr) => getEnemy(gr.enemy)?.flying === true);

    if (ucanVar === this.#flyerHintOn) return;
    this.#flyerHintOn = ucanVar;
    g.clear();
    if (!ucanVar) return;

    // Soluk kesikli altın çizgi (§5).
    g.lineStyle(3, GOLD, 0.45);
    for (const hat of this.#map.flyerPaths) {
      for (let i = 0; i < hat.length - 1; i++) {
        const a = hat[i];
        const b = hat[i + 1];
        if (a === undefined || b === undefined) continue;
        this.dashedLine(g, a, b, 18);
      }
    }
  }

  /**
   * Kesikli düz çizgi — Phaser'da hazır yok.
   *
   * Public: `GameScene.#drawRally` de kullanıyor (toplanma noktası bağı) —
   * kışla durumuna bağlı olduğu için o metot taşınmadı, ama iki çizim
   * yardımcısının tek kopyası burada.
   */
  dashedLine(g: Phaser.GameObjects.Graphics, a: Vec2, b: Vec2, parcaPx: number): void {
    const uzunluk = Math.hypot(b.x - a.x, b.y - a.y);
    const adet = Math.max(1, Math.floor(uzunluk / parcaPx));
    for (let k = 0; k < adet; k += 2) {
      const t0 = k / adet;
      const t1 = Math.min(1, (k + 1) / adet);
      g.beginPath();
      g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
      g.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      g.strokePath();
    }
  }

  /** Phaser'da hazır kesikli yay yok; parça parça çiziliyor. */
  dashedCircle(
    g: Phaser.GameObjects.Graphics,
    c: Vec2,
    r: number,
    renk: number,
    kalinlik: number,
  ): void {
    const parca = 24;
    const adim = (Math.PI * 2) / parca;
    g.lineStyle(kalinlik, renk, 1);
    for (let k = 0; k < parca; k += 2) {
      g.beginPath();
      g.arc(c.x, c.y, r, k * adim, (k + 1) * adim);
      g.strokePath();
    }
  }
}

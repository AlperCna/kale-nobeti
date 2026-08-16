import Phaser from 'phaser';
import { FRAME_CORNER, FRAME_EDGE, FRAME_MIDDLE } from '../data/spriteFrames';

/**
 * P02 tezhipli parşömen çerçevesi — 9-slice.
 *
 * `rexUI` gibi bir eklenti eklenmedi: Phaser 3 çekirdeğinde `TileSprite`
 * zaten var ve kenar/orta dokuyu **gererek değil döşeyerek** doldurur.
 * 4 köşe aynı `corner` karesinin 0/90/180/270 döndürülmüş hâli — sanatçı
 * yalnız bir köşe çizdi (bkz. `docs/plan/M6-sanat-uretim-brifi.md` P02).
 *
 * `add.rectangle(...INK...).setStrokeStyle(2,GOLD)` deseninin yerine
 * geçiyor — merkez `(x,y)`, eski rectangle çağrılarıyla aynı orijin.
 */
export function createParchmentFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerSize = 24,
  /** Harita seçim kartları gibi — arkada başka bir görsel varsa orta
   * dolgu onu kapatır, o yüzden atlanabiliyor (yalnız köşe+kenar kalır). */
  skipMiddle = false,
): Phaser.GameObjects.Container {
  const corner = Math.min(cornerSize, width / 2, height / 2);
  const middleW = Math.max(1, width - corner * 2);
  const middleH = Math.max(1, height - corner * 2);

  const container = scene.add.container(x, y);

  const middle = skipMiddle
    ? null
    : scene.add.tileSprite(0, 0, middleW, middleH, 'atlas', FRAME_MIDDLE).setOrigin(0.5);

  const top = scene.add
    .tileSprite(0, -height / 2 + corner / 2, middleW, corner, 'atlas', FRAME_EDGE)
    .setOrigin(0.5);
  const bottom = scene.add
    .tileSprite(0, height / 2 - corner / 2, middleW, corner, 'atlas', FRAME_EDGE)
    .setOrigin(0.5)
    .setAngle(180);
  const left = scene.add
    .tileSprite(-width / 2 + corner / 2, 0, middleH, corner, 'atlas', FRAME_EDGE)
    .setOrigin(0.5)
    .setAngle(270);
  const right = scene.add
    .tileSprite(width / 2 - corner / 2, 0, middleH, corner, 'atlas', FRAME_EDGE)
    .setOrigin(0.5)
    .setAngle(90);

  const koseler = [
    { dx: -width / 2 + corner / 2, dy: -height / 2 + corner / 2, angle: 0 }, // sol-üst
    { dx: width / 2 - corner / 2, dy: -height / 2 + corner / 2, angle: 90 }, // sağ-üst
    { dx: width / 2 - corner / 2, dy: height / 2 - corner / 2, angle: 180 }, // sağ-alt
    { dx: -width / 2 + corner / 2, dy: height / 2 - corner / 2, angle: 270 }, // sol-alt
  ] as const;
  const koseGorselleri = koseler.map((k) =>
    scene.add
      .image(k.dx, k.dy, 'atlas', FRAME_CORNER)
      .setDisplaySize(corner, corner)
      .setAngle(k.angle),
  );

  const parcalar = middle === null ? [top, bottom, left, right] : [middle, top, bottom, left, right];
  container.add([...parcalar, ...koseGorselleri]);
  return container;
}

/**
 * `createParchmentFrame` + tıklanabilir buton kurulumu tek çağrıda —
 * `HudScene`/`AbilityButtons`/`SettingsPanel`'deki `add.rectangle(...)
 * .setInteractive({useHandCursor:true})` deseninin yerine geçiyor.
 * `Container`'ın örtük sınırı yok, hit-alanı elle veriliyor.
 */
export function createParchmentButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerSize = 24,
  skipMiddle = false,
): Phaser.GameObjects.Container {
  const frame = createParchmentFrame(scene, x, y, width, height, cornerSize, skipMiddle);
  frame.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  if (frame.input !== null) frame.input.cursor = 'pointer';
  return frame;
}

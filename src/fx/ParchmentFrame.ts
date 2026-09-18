import Phaser from 'phaser';
import { FRAME_CORNER, FRAME_EDGE, FRAME_MIDDLE } from '../data/spriteFrames';
import { getSettings } from '../systems/Settings';
import { UI_CLICK } from '../data/audio';

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

  /**
   * Kenar şeridi **1:1 çiziliyor — ölçeklenmiyor.**
   *
   * Bir ara `setTileScale(corner / 32)` eklenmişti; gerekçesi "şeridin
   * tamamı banda sığsın"dı ve sonucu **tarama çizgisi** oldu. Sebep
   * dokunun kendisinde: `edge-strip` karesinin ilk 12 satırı tezhip
   * bandı, kalan 20 satır düz parşömen. Satır lumaları:
   *
   *     24 · 60 · 212 · 207 · 165 · 162 · 204 · 216 · 176 · 157 · 193 · 215
   *     ├──── mürekkep kontur ────┤   ├─ üç koyu/açık çift (süsleme) ─┤
   *
   * Oyunda `corner` 8-20 px (çoğu yerde 10-14). 32 satırı oraya
   * sıkıştırmak 12 satırlık süsü **3-5 piksele** eziyor: üç koyu/açık
   * çift birer piksele düşüyor ve göz bunu süs değil **çizgi** olarak
   * görüyor. Canlı ölçüm (menüdeki "Oyna" düğmesinin üst kenarı):
   * `209 · 164 · 211 · 166 · 203` — birer piksellik dönüşümlü satırlar.
   *
   * 1:1'de doku yeniden örneklenmiyor, yani çizgilenme kaynağında
   * ortadan kalkıyor. Karşılığı: `corner < 12` olduğunda süsün iç
   * satırları kırpılıyor. Bu **kabul edilebilir, hatta doğru** — dokunun
   * 0. satırı şeridin DIŞ kenarı (çerçevenin mürekkep konturu), kırpılan
   * taraf iç kenar, yani orta parşömene karışan taraf. Süsün en kuvvetli
   * kısmı her zaman görünür kalıyor.
   */
  const serit = (sx: number, sy: number, uzunluk: number, aci: number) =>
    scene.add
      .tileSprite(sx, sy, uzunluk, corner, 'atlas', FRAME_EDGE)
      .setOrigin(0.5)
      .setAngle(aci);

  const top = serit(0, -height / 2 + corner / 2, middleW, 0);
  const bottom = serit(0, height / 2 - corner / 2, middleW, 180);
  const left = serit(-width / 2 + corner / 2, 0, middleH, 270);
  const right = serit(width / 2 - corner / 2, 0, middleH, 90);

  const koseler = [
    { dx: -width / 2 + corner / 2, dy: -height / 2 + corner / 2, angle: 0 }, // sol-üst
    { dx: width / 2 - corner / 2, dy: -height / 2 + corner / 2, angle: 90 }, // sağ-üst
    { dx: width / 2 - corner / 2, dy: height / 2 - corner / 2, angle: 180 }, // sağ-alt
    { dx: -width / 2 + corner / 2, dy: height / 2 - corner / 2, angle: 270 }, // sol-alt
  ] as const;
  /**
   * Köşe de **1:1** — `Image` + `setDisplaySize` değil, `TileSprite`.
   *
   * Kenar şeridiyle birebir aynı hata köşede daha beterdi: kare 96×96 ve
   * `setDisplaySize(corner, corner)` onu 12 piksele indiriyordu, yani
   * **8 kat** küçültme. Karenin satır lumaları:
   *
   *     31 · 31 · 37 | 188 · 205 · 173 · 151 ... 184 · 207 · 156 | 119 (×65)
   *     ├─ kontur ─┤ ├────── tezhip, ~24 satır ──────┤ ├─ düz dolgu ─┤
   *
   * Yani anlamlı süs ilk ~32 satırda; kalan 64 satır düz. Tamamını 12
   * piksele sıkıştırmak süsü 4 piksele indiriyor ve köşe bir "leke"
   * olarak okunuyordu.
   *
   * `TileSprite` dokuyu ölçeklemeden gösteriyor, yani `corner × corner`
   * kutuda karenin **sol üst `corner × corner` pikseli** çıkıyor: dış
   * kontur ve tezhibin başı doğal çözünürlükte. `setAngle` her köşeyi
   * döndürüyor, gösterilen bölge hep dokunun süslü köşesi.
   *
   * `corner` (≤ 20) her zaman 96'dan küçük olduğu için döşeme tekrarı
   * oluşmuyor.
   */
  const koseGorselleri = koseler.map((k) =>
    scene.add
      .tileSprite(k.dx, k.dy, corner, corner, 'atlas', FRAME_CORNER)
      .setOrigin(0.5)
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

/** Üzerine gelme: %3 büyür. Basma: %2 küçülür. */
const HOVER_SCALE = 1.03;
const PRESS_SCALE = 0.98;

/**
 * `createParchmentButton`'a üzerine gelme/basma geri bildirimi ekler
 * (`G01`/`G02`). Eski greybox butonların `setFillStyle` ile yaptığı işin
 * doku üstündeki karşılığı — düz renk yerine **ölçek** değişiyor,
 * dokunun kendisi bozulmuyor.
 *
 * Anında uygulanıyor, tween yok: bu buton kromu (menü/HUD), oynanış
 * VFX'i değil — `settings.effectScale`'e bağlanmıyor, tıpkı kod
 * tabanındaki hiçbir düğmenin bugün bağlanmadığı gibi.
 */
/**
 * Geri bildirim alabilen nesne — `M89`.
 *
 * Önceden imza yalnız `Container` alıyordu ve arayüzün düz
 * `Rectangle`/`Text` düğmeleri (seviye seçimdeki zorluk seçenekleri,
 * “← Geri” bağlantıları) bu yüzden geri bildirimsiz kalıyordu.
 * Gereken iki şey var: olay dinleyebilmek (`GameObject`) ve
 * ölçeklenebilmek (`Transform`).
 */
type Basilabilir = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

export function addPressFeedback(container: Basilabilir): void {
  container.on('pointerover', () => container.setScale(HOVER_SCALE));
  container.on('pointerout', () => container.setScale(1));
  container.on('pointerdown', () => {
    container.setScale(PRESS_SCALE);
    uiTiklamaSesi(container.scene);
  });
  container.on('pointerup', () => container.setScale(HOVER_SCALE));
}

/**
 * `M8-P03` — arayüz tıklama sesi.
 *
 * ## Neden `SoundSystem` değil
 *
 * `SoundSystem` yalnız `GameScene` içinde yaşıyor ve havuzlu: o havuz
 * saniyede ~20 atışın tahsisini önlemek için var (`M8-T01`'de ölçülen 2×
 * kasmasının kök nedeni). Arayüz tıklaması **saniyede yirmi kez olmuyor**;
 * tek atışlık `sound.play` yeterli ve karşılığında menü, seviye seçim,
 * başarımlar, nasıl oynanır ve duraklatma menüsü ses sistemine hiç
 * bağlanmak zorunda kalmıyor.
 *
 * ## Neden `addPressFeedback` içinde
 *
 * Bu yardımcı zaten tam olarak **arayüz kromu** düğmelerine takılıyor
 * (menü, tam ekran, duraklatma menüsü). Yapı menüsü ve yetenek düğmeleri
 * onu kullanmıyor — onların kendi sesleri var (`tower_place`, `error`) ve
 * üstüne bir tıklama sesi bindirmek iki sesi birden anlamsızlaştırırdı.
 *
 * ## Dosya henüz yok
 *
 * `cache.audio.has` koruması `Y14` deseninin aynısı: ses üretilene kadar
 * bu çağrı **hiçbir şey yapmıyor**, dosya gelince koda dokunmadan
 * çalışmaya başlıyor. Yükleme kuyruğuna eklenmesi de o zaman —
 * var olmayan bir dosyayı kuyruğa koymak 404 ve konsol çıktısı demek
 * (`CLAUDE.md` Platform: yayın yapısında konsol çıktısı bulunmaz).
 */
function uiTiklamaSesi(scene: Phaser.Scene): void {
  if (!scene.cache.audio.has(UI_CLICK)) return;
  const olcek = getSettings(scene).sfxScale;
  if (olcek <= 0) return;
  scene.sound.play(UI_CLICK, { volume: olcek });
}

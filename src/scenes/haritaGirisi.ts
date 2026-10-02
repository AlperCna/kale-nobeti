import type Phaser from 'phaser';
import { portal } from '../systems/Portal';

/**
 * **Haritaya giriş — `M178`.** Bir haritanın başladığı her yer buradan
 * geçiyor: seviye seçim (kampanya + sonsuz), oyun sonu (yeniden dene,
 * sonraki harita, sonsuza devam), duraklatma menüsünün "Yeniden başla"sı
 * ve ana menünün "Devam et"i.
 *
 * Portalların reklam yeri burası — seviye geçişi. Poki:
 * *"`commercialBreak()` before every `gameplayStart()`"*; CrazyGames:
 * *"between levels… level transitions, map changes, player death"*.
 * Reklam **beklenerek** gösteriliyor: CrazyGames *"Your game should be
 * paused during a video ad"* ve *"Disable buttons"* diyor, Poki reklam
 * sırasında hiçbir SDK olayı istemiyor. Bu yüzden:
 *
 * - `Game` reklam **kapanınca** başlıyor (`portal.commercialBreak`'in
 *   `devam`ı). itch.io'da reklam yok ve `devam` aynı tikte geliyor.
 * - Reklam boyunca çağıran sahnenin dokunma **ve** klavyesi kapalı:
 *   çift tıklama ikinci bir giriş açmasın, duraklatma menüsündeki ESC
 *   oyunu reklamın arkasında devam ettirmesin.
 * - Ses `sound.mute` ile kısılıyor; oyuncunun kendi "ses kapalı"
 *   tercihi reklamdan sonra geri konuyor.
 *
 * **Klavye elle geri açılıyor:** Phaser `InputPlugin.start` dokunmayı
 * sahne başlarken yeniden açıyor, `KeyboardPlugin.start` açmıyor
 * (`node_modules/phaser/src/input/keyboard/KeyboardPlugin.js`). Açılmazsa
 * duraklatma menüsünden yeniden başlatılan haritada ESC ve boşluk
 * sessizce ölürdü.
 *
 * Reklamsız tek giriş ilk açılış (`PreloadScene`, ilk oturum): Poki'nin
 * açılış sırası `gameLoadingFinished` > `gameplayStart`.
 */
export interface HaritaGirisi {
  readonly mapId: string;
  readonly endless?: boolean;
  readonly devam?: boolean;
  readonly sonsuzDevam?: boolean;
}

/**
 * @param kapat `Game` ve `Hud` önce durdurulsun mu — oyun sonundan ve
 *   duraklatma menüsünden gelişte açıklar; `sleep`/`wake` önceki turun
 *   altınını ve kulelerini bırakırdı.
 */
export function haritayaGir(sahne: Phaser.Scene, veri: HaritaGirisi, kapat = false): void {
  const girdi = sahne.input;
  const klavye = girdi.keyboard;
  girdi.enabled = false;
  if (klavye !== null) klavye.enabled = false;

  const ses = sahne.sound;
  const oncekiMute = ses.mute;
  portal.commercialBreak(
    (kisik) => {
      ses.mute = kisik ? true : oncekiMute;
    },
    () => {
      girdi.enabled = true;
      if (klavye !== null) klavye.enabled = true;
      sahneleriKur(sahne, veri, kapat);
    },
  );
}

/**
 * **Çağıran `Hud` ise `launch('Hud')` HİÇBİR ŞEY yapmıyor** — `M178`'de
 * tarayıcıda bulundu. Phaser `ScenePlugin.launch`: `if (key && key !==
 * this.key) queueOp('start', …)`; bir sahne kendini başlatamıyor.
 * Duraklatma menüsünün "Yeniden başla"sı `stop('Hud')` · `stop('Game')` ·
 * `start('Game')` · `launch('Hud')` diyordu: kuyruk Hud'u durduruyor, son
 * satır sessizce düşüyordu. Harita **HUD'suz** açılıyordu — altın, can,
 * yetenek yok ve duraklatma da (tuşu ve düğmesi Hud'da) yok, yani oyuncu
 * haritadan çıkamıyordu. `M174`'ün oyuncu turu bu düğmeye basmamıştı.
 *
 * `Hud` kendini `restart` ile yeniliyor (aynı kuyruk: önce `Game`
 * başlıyor, sonra `Hud` — `HudScene.create` `Game`'i okuyor).
 */
function sahneleriKur(sahne: Phaser.Scene, veri: HaritaGirisi, kapat: boolean): void {
  const sp = sahne.scene;
  if (sp.key === 'Hud') {
    sp.stop('Game');
    sp.launch('Game', veri);
    sp.restart();
    return;
  }
  if (kapat) {
    sp.stop('Hud');
    sp.stop('Game');
  }
  sp.start('Game', veri);
  sp.launch('Hud');
}

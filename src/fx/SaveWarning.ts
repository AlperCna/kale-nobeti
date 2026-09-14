import Phaser from 'phaser';
import { t } from '../util/i18n';
import { createParchmentFrame } from './ParchmentFrame';

const GENISLIK = 620;
/** Platform dokunmatik hedef alt sınırı — bant kapatmak için tıklanabilir. */
const YUKSEKLIK = 44;
/**
 * **Ölçülerek seçildi, tahminle değil.** Üst şeritteki düğmeler
 * (`HudScene` `HIZ_BTN_Y` = 48, buton 56 px) 20–76 arasını, dalga ipucu
 * (`TutorialHints`, merkez y=146, asgari 60 px) 116–176 arasını kaplıyor.
 * Aradaki boşluk **76–116**, tam 40 px. Bant 44 px olduğu için merkezi
 * 92'ye konuyor (70–114): ipucunun üstüne hiç binmiyor, üstte 6 px'lik
 * örtüşme ise yalnız x≥1204'teki düğmelerle olurdu ve bant 330–950
 * arasında duruyor.
 *
 * İlk deneme iki satırlı, 72 px'lik bir banttı ve canlı ekranda dalga
 * ipucunu tamamen örtüyordu (ekran görüntüsüyle görüldü) — metin tek
 * satıra indirildi.
 */
const UST = 92;
/** Kendiliğinden kapanma. `Overlay` **hiç ölçeklenmiyor**, yani bu gerçek 12 sn. */
const SURE_MS = 12_000;
const KAYMA_MS = 260;
const VERMILION = 0xb03a2e;

/**
 * "İlerleme kaydedilemiyor" uyarısı — `M9-T03`.
 *
 * ## Neden var: kural 10'un yarısı eksikti
 *
 * TIER 1 kural 10 *"kayıt başarısızsa oyuncuya **bir kez bildirilir**"*
 * diyor ve `research/05` aynısını yayın şartı olarak sayıyor:
 * *"İlerlemenin kaydedilmediği durumlarda oyuncuyu açıkça
 * bilgilendirin."*
 *
 * Mekanizmanın yarısı vardı: `BootScene` yazma hatasını yakalıyor,
 * bayrağı `registry`'ye koyuyor, `GameScene.create()` onu okuyup
 * `save:failed` olayını yayıyordu. Ama **o olayın hiçbir dinleyicisi
 * yoktu** (`Settings.ts`'in kendi notu bunu yazılı olarak kabul ediyordu).
 * Yani gizli sekmede oyuncuya hiçbir şey söylenmiyordu.
 *
 * ## Neden `Overlay` sahnesinde
 *
 * Üç sebep, üçü de başka bir sahnede sorun olurdu:
 *
 * 1. **Zaman ölçeklenmiyor.** `GameClock.setScale` yalnız `GameScene`'e
 *    veriliyor; uyarı orada yaşasaydı 3× hızda 12 saniye gerçek hayatta
 *    4 saniye olurdu — yani uyarı en çok kaçırılacağı anda en kısa.
 * 2. **Sahne geçişlerinde ölmüyor.** `Overlay` bir kez başlatılıp hiç
 *    durdurulmuyor.
 * 3. **En üstte çiziliyor.** Sahne listesinde en sonda kayıtlı.
 *
 * ## k.6
 *
 * Renk tek başına taşımıyor: vermilyon kontur **ve** açık bir cümle var.
 * Metin `strings.ts`'te, iki dilde.
 */
export function gosterKayitUyarisi(scene: Phaser.Scene): void {
  const merkez = scene.scale.width / 2;
  const baslangicY = -YUKSEKLIK;

  const kap = scene.add.container(merkez, baslangicY).setDepth(900);
  kap.add(createParchmentFrame(scene, 0, 0, GENISLIK, YUKSEKLIK, 18));
  // Kontur: metnin taşıdığı anlamı **tekrarlıyor**, tek başına taşımıyor.
  kap.add(scene.add.rectangle(0, 0, GENISLIK, YUKSEKLIK, 0, 0).setStrokeStyle(3, VERMILION));
  kap.add(
    scene.add
      .text(0, 0, t('saveFailed'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '20px',
        color: '#14203A',
      })
      .setOrigin(0.5),
  );

  let kapaniyor = false;
  const kapat = (): void => {
    if (kapaniyor) return;
    kapaniyor = true;
    scene.tweens.add({
      targets: kap,
      y: baslangicY,
      duration: KAYMA_MS,
      ease: 'Quad.easeIn',
      onComplete: () => kap.destroy(),
    });
  };

  // Dokunmatik hedef 620×44 — Platform alt sınırı tam karşılanıyor.
  kap.setSize(GENISLIK, YUKSEKLIK).setInteractive({ useHandCursor: true });
  kap.on(Phaser.Input.Events.POINTER_DOWN, kapat);

  scene.tweens.add({
    targets: kap,
    y: UST,
    duration: KAYMA_MS,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.time.delayedCall(SURE_MS, kapat);
    },
  });
}

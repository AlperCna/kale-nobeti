import Phaser from 'phaser';
import { yenidenKurOverlay } from './OverlayScene';
import { portal } from '../systems/Portal';
import { haritaKazanildi, haritaKaybedildi } from '../systems/olcum';
import { starsFor } from '../systems/SaveSystem';
import type { SoundSystem } from '../fx/SoundSystem';
import type { GameScene } from './GameScene';
import type { Speed } from '../types/common';
import { t } from '../util/i18n';
import { getSettings } from '../systems/Settings';
import type { StringKey } from '../data/strings';
import { devHooks } from '../util/devHooks';
import { HudReadout } from '../fx/HudReadout';
import { WaveTelegraph } from '../fx/WaveTelegraph';
import { getEnemyForMap } from '../data/enemies';
import { AbilityButtons } from '../fx/AbilityButtons';
import { SettingsPanel } from '../fx/SettingsPanel';
import { BossHealthBar } from '../fx/BossHealthBar';
import { createParchmentButton, createParchmentFrame, addPressFeedback } from '../fx/ParchmentFrame';
import { PreloadScene } from './PreloadScene';
import { NUMBER_FONT_KEY } from '../fx/numberFont';

const INK = 0x14203a;
/** Altın varak — `M25` bonus sayısı (§2 paleti). */
const ALTIN = 0xd4a032;
/** Zincifre — `M25` risk sayısı; can göstergesiyle aynı ton (`HudReadout`). */
const ZINCIFRE = 0xb03a2e;

/** Dokunmatik hedef en az 44×44 px (CLAUDE.md Platform). */
const BTN = 56;
const MARGIN = 20;

/**
 * Sağ kenardaki kalıcı düğmelerin yerleri — `M8-B01`.
 *
 * Bu sayılar **taranarak** bulundu, göze göre değil. Beş haritanın bütün
 * yolları, yapı noktaları ve kaleleri tarandığında sağ kenarda
 * (`x = 1232`) 56×56'lık bir düğmeye yer kalan yalnız **üç cep** var:
 * `30-68`, `172-196` ve `654-700`. Aradaki her şey bir yolun altında.
 *
 * Kusur şuydu: ayar düğmesi `y = 116`'daydı ve **harita 3'ün sağ girişi
 * `y = 120`'de**. Yol şeridi 48 px (`MapRenderer.PATH_WIDTH`), yani
 * 96-144 — düşman ekrana girdiği anda düğmenin arkasından yürüyordu.
 * Canlı ekran görüntüsünde görüldü; 865 testin hiçbiri göremedi, çünkü
 * kapsama/bütçe/Kısıt testleri HUD'u bilmiyor.
 *
 * Yerleşim: hız 48 · ayar 180 · tam ekran 654 (`OverlayScene`). Zorluk
 * rozeti sağ kenardan **tamamen çıktı**: üç cebin üçü de dolu ve rozeti
 * 415 gibi tek başına bir boşluğa koymak onu HUD'a değil haritaya ait
 * gösteriyordu. Üst şerit (`y = 40`) `x = 362`'den sağa tamamen boş;
 * rozet hız düğmesinin soluna, aynı satıra alındı.
 *
 * **Bilerek kabul edilen istisna:** soldaki kartuş harita 1/3/4'ün giriş
 * yolunun ilk pikselleriyle köşede kesişiyor. Orası ekranın köşesi,
 * düşman kartuşun altından değil yanından çıkıyor ve tür standardı.
 * Düzeltmek üç haritanın yolunu yeniden çizmek demekti.
 */
const HIZ_BTN_Y = MARGIN + BTN / 2;
const AYAR_BTN_Y = 180;
/**
 * Duraklatma düğmesi — `M87`. **Üst şeritte, sağ kenarda değil.**
 *
 * Sağ kenardaki üç cebin (`30-68`, `172-196`, `654-700`) üçü de dolu;
 * dördüncü bir düğme oraya konsaydı `M8-B01`'in düzelttiği kusur geri
 * gelirdi (ayar düğmesi harita 3'ün giriş yolunun üstündeydı). Üst şerit
 * `x = 362`'den sağa boş; zorluk rozeti 1086-1154'te, düğme onun soluna
 * oturuyor. Yeri `maps.test.ts`'in `KALICI_HUD` listesinde ve altı
 * haritaya karşı sınanıyor — göze göre değil.
 */
const DURAKLAT_BTN_X = 1020;
/** Hiz düğmesiyle **aynı eksende** (48): iki düğme yan yana okunuyor. */
const DURAKLAT_BTN_Y = HIZ_BTN_Y;
/** Dokunmatik hedef en az 44 (CLAUDE.md Platform); üst şerit 56'yı taşımıyor. */
const DURAKLAT_BTN = 48;
/** Zorluk rozeti: üst şeritte, hız düğmesinin solunda. Boss can çubuğu
 *  (640 merkez, 360 geniş → 460-820) ile de çakışmıyor. */
const ZORLUK_ROZET_X = 1120;
const ZORLUK_ROZET_Y = 42;


/**
 * HUD. `Game`'in **üstünde paralel** çalışır (CLAUDE.md Mimari).
 *
 * Duraklatmada `Game` durur, **`Hud` durmaz** — durursa devam butonu
 * tıklanamaz hale gelir. Bu görevin "bitmedi sayılır eğer" maddesi bu.
 */
/** Geri sayım tikinin başladığı saniye — `M8-T10`. */
const GERI_SAYIM_TIK_SN = 3;

/**
 * Hız düğmesinin yazısı. `×` işareti sayı fontunda var (`NUMBER_FONT_KEY`),
 * dile bağlı değil — `strings.ts`'e girmiyor.
 */
function hizEtiketi(hiz: Speed): string {
  return `${hiz}×`;
}

export class HudScene extends Phaser.Scene {
  /** `M8-T10` — son çalınan geri sayım tikinin saniyesi; -1 = yok. */
  #sonTik = -1;
  #paused = false;
  #speed: Speed = 1;

  /**
   * S07 — TIER 1 kural 7. `G02`: sayı bitmap fontu artık üretiliyor
   * (`M6-T01`), iki statik `Text` yerine tek `BitmapText` — kuralın
   * "değişen metin bitmap olur" ruhuna tam uyum. `×` karakteri font
   * karakter kümesinde (`prep-assets.mjs` `SAYI_KARAKTERLERI`).
   */
  #hizYazi?: Phaser.GameObjects.BitmapText;

  #overlay?: Phaser.GameObjects.Container;

  /** Değişen sayılar ayrı dosyada — `HudReadout` başlığındaki gerekçe. */
  #readout?: HudReadout;
  #telegraph?: WaveTelegraph;
  #earlyBtn?: Phaser.GameObjects.Container;
  /**
   * Erken başlatma bonusunun **canlı** değeri — `M25`.
   *
   * `BitmapText`, çünkü her karede değişiyor (TIER 1 kural 7). Etiketin
   * kendisi (`#earlyLabel`) bir kez yazılıp değişmediği için `Text`
   * kalıyor.
   */
  #earlyBonus?: Phaser.GameObjects.BitmapText;
  /**
   * Erken başlatmanın **risk** tarafı — `M25`: sahadaki düşman sayısı.
   *
   * Sayı `BitmapText` (değişiyor), yanındaki kelime `Text` (değişmiyor)
   * — sayı fontunda harf yok, TIER 1 kural 7 de zaten bu ayrımı
   * istiyor. Yalnız sayı **sıfırdan büyükken** görünüyor: ortaya
   * çıkması uyarının kendisi, "0 sahada" ise gürültü olurdu.
   */
  #earlyRiskSayi?: Phaser.GameObjects.BitmapText;
  #earlyRiskEtiket?: Phaser.GameObjects.Text;
  #earlyLabel?: Phaser.GameObjects.Text;
  #bitti = false;

  /** İki yetenek butonu + dairesel bekleme dolumu (§8, M5-T07). */
  #abilityButtons?: AbilityButtons;

  /** Ayarlar paneli (M6-T12) — duraklatma perdesinin üstünde. */
  #settingsPanel?: SettingsPanel;

  /** `G05` — boss sahnedeyken görünen tek can çubuğu. */
  #bossBar?: BossHealthBar;

  constructor() {
    super('Hud');
  }

  /**
   * `LevelSelectScene` `Game` ve `Hud`'u aynı tıklamada başlatıyor
   * (`this.scene.start('Game', ...); this.scene.launch('Hud');`) —
   * `Hud`'un kendi `preload()`'u olmazsa Phaser onu hemen `create()`'e
   * geçirir, `GameScene.preload()`'daki atlas yüklemesi bitmeden.
   * Canlı testte yakalandı: `corner`/`edge-strip`/`middle-texture`
   * kareleri "yok" uyarısı veriyordu.
   *
   * **`queueGame` değil `queueHud`:** eski hâli `Game`'in tüm varlık
   * listesini (harita arka planı + 12 ses efekti) kuyruğa atıyordu, oysa
   * `Hud` ikisini de hiç kullanmıyor — yalnız atlas (parşömen çerçeve)
   * ve sayı fontu. Eski yorumdaki "`exists()` koruması sayesinde
   * çakışmıyor" gerekçesi de sağlam değildi; ayrıntı ve ölçüm
   * `PreloadScene.queueHud`'un notunda.
   */
  preload(): void {
    PreloadScene.queueHud(this);
  }

  /**
   * `Y03` Adım 3 — dil değişiminde `Hud` kendini yeniden kuruyor
   * (`scene.restart(data)`), çünkü bekçi kural 4 `Text` üreten bir
   * dosyada `setText`'i yasaklıyor: çevrili etiketler yerinde
   * güncellenemiyor, yeniden üretilmeleri gerekiyor. `Game` bu yoldan
   * hiç etkilenmiyor — orada kalıcı çevrili metin yok (tek istisna
   * öğretici balonu, o da her gösterimde baştan kuruluyor).
   *
   * Yeniden kurulumda korunması gereken iki şey bu veriyle taşınıyor.
   */
  create(data?: { readonly speed?: Speed; readonly settingsOpen?: boolean }): void {
    this.#bitti = false;
    this.#sonTik = -1;
    // **Bekçi kural 10'un bulduğu iki gerçek hata.**
    //
    // `#paused`: duraklatılmışken kaybedilip yeniden başlanınca `true`
    // kalıyordu. `create()` yeni bir perde yaratıyor ve o **gizli**
    // başlıyor, ama bayrak `true`; ilk ESC oyunu duraklatmak yerine
    // `scene.resume` çağırıyor ve perde açılıyordu — durum tam ters.
    //
    // `#speed`: 2×'te kaybedip yeniden başlayınca etiket 2× gösteriyordu
    // ama `GameClock` yeni sahnede 1×'ten başlıyor. Gösterge yalan
    // söylüyordu.
    //
    // İkisi de M0/M4/M5/M6'da dört kez çıkan tuzağın aynısı: alan
    // başlatıcısı bir kez, `create()` her seferinde.
    this.#paused = false;
    // Varsayılan 1 — yeni oyunda `GameClock` da 1×'ten başlıyor. Dil
    // değişiminden gelen yeniden kurulumda ise `Game` çalışmaya devam
    // ediyor ve saati 2×'te olabilir; o durumda gösterge yalan
    // söylememesi için gerçek hız veriyle taşınıyor.
    this.#speed = data?.speed ?? 1;
    this.#createSpeedButton();
    this.#zorlukRozeti();
    // Altın/can/dalga sayaç kartı — P02 brifi "HUD sol üstte üç parşömen
    // kart" (`docs/plan/M6-sanat-uretim-brifi.md`). Etiket+sayı bloğunun
    // gerçek yerleşimini saran, ölçülmüş bir kutu.
    //
    // Kart kenarlığı (`cornerSize=16`) dekoratif bir şerit — sayılar bu
    // şeridin İÇİNE değil, ÜSTÜNE denk gelirse üst kısımları kenarlık
    // desenine gömülüp "tam gözükmüyor" görünür. Sayı bloğu bu yüzden
    // kenarlık kalınlığı + biraz boşluk kadar içeri (`MARGIN+8, MARGIN+16`)
    // kaydırılıyor; kart da üç satırı (dy 0/34/68 + 28px yükseklik) o payla
    // birlikte tutacak kadar büyütüldü.
    createParchmentFrame(this, MARGIN + 96, MARGIN + 66, 216, 140, 16);
    this.#createLabels();
    this.#readout = new HudReadout(this, MARGIN + 8, MARGIN + 16);
    // M8-T01 — telgraf kartın ALTINDA kendi satırında (x 28, y 172): beş
    // düşman tipine kadar 370 px, kartın içine hiçbir zaman sığmıyordu.
    // Yapı noktalarıyla çakışmıyor: en üstteki nokta harita 1'de y=215
    // (yarıçap 22 → 193), satır 172±17 → 189'da bitiyor.
    // `M15` — düşman **haritaya göre** çözülüyor: telgraf eskiden
    // `getEnemy` kullanıyor ve oyuncuya dövüşmeyeceği bossu gösteriyordu
    // (harita 6: yazan "zırh 10, yetenek yok", gerçek "zırh 2, yandaş
    // çağırır"). S80'in birebir aynı hata sınıfı, bu kez arayüzde.
    this.#telegraph = new WaveTelegraph(this, MARGIN + 8, MARGIN + 152, (id) =>
      getEnemyForMap(id, this.#game().map),
    );
    // `G05` — prep geri sayımıyla aynı yatay eksende ama biraz altında;
    // ikisi zamanda hiç örtüşmüyor (biri yalnız `prep`'te, öbürü yalnız
    // boss canlıyken görünür), üst üste binme riski yok.
    this.#bossBar = new BossHealthBar(this, this.scale.width / 2, 46);
    this.#createEarlyStartButton();
    this.#abilityButtons = new AbilityButtons(
      this,
      MARGIN + 40,
      this.scale.height - MARGIN - 46,
      (id) => this.#game().armAbility(id),
      // `M99` — S117'nin gider kalemi; fiyat ve kesinti `GameScene`'de.
      (id) => {
        this.#game().yetenegiYukselt(id);
      },
    );
    // `settings` doğrudan paylaşılan registry'den (`getSettings`) okunuyor,
    // `this.#game().settings`'ten DEĞİL. **Canlı testte yakalanan gerçek
    // çökme:** `GameScene.settings` alan başlatıcısı değil, `create()`
    // içinde atanıyor (`this.registry`'nin Phaser tarafından enjekte
    // edilmesi sahne kurucusundan SONRA olduğu için alan başlatıcı olamaz —
    // ayrıntı bu değişikliğin commit notunda). `LevelSelectScene` `Game`'i
    // `start()`, `Hud`'u `launch()` ediyor; ikisi de aynı doğrultulmuş
    // tikte kuyruklanıyor ama **hangisinin `create()`'inin önce bittiği
    // garanti değil**. Yavaş bir cihazda/dar görünümde `HudScene.create()`
    // `GameScene.create()`'den önce çalışırsa `this.#game().settings`
    // hâlâ `undefined` oluyordu → `SettingsPanel.refresh()` `.state`
    // okurken patlıyordu. `getSettings(this)` ise oyun-geneli registry'yi
    // okuyor (`BootScene` orada bir kez kuruyor, her sahnenin `registry`'si
    // aynı nesneye işaret ediyor) — `GameScene`'in kendi `create()`'ine
    // bağımlı değil, `HudScene`'in kendi `registry`'si hazır olur olmaz
    // (Phaser'ın sahne önyükleme sırası) kullanılabilir.
    const settings = getSettings(this);
    this.#settingsPanel = new SettingsPanel(
      this,
      settings,
      () => {
        // Ayar değişince oyuna anında yansı — sarsıntı bayrağı ve ses.
        // `shake` (`GameScene`) alan başlatıcısı (`readonly shake = new
        // ScreenShake()`) — `settings`'in aksine kurucudan itibaren güvenli.
        const g = this.#game();
        g.shake.enabled = settings.state.screenShake;
        if (!settings.state.screenShake) g.shake.reset();
        this.sound.mute = !settings.state.sound;
        g.setHintsEnabled(settings.state.hints);
      },
      () => {
        // Dil değişti: çevrili her etiket yeniden üretilmeli. Panel de
        // çevrili, o yüzden açık kalsın diye veriyle birlikte gidiyor.
        // `Game` sahnesi yeniden BAŞLATILAMAZ (kuleler, altın, dalga
        // kaybolurdu) — bir-kez-kurulan çevrili arayüzü elden geçiriyor.
        this.#game().dilYenile();
        this.scene.restart({ speed: this.#speed, settingsOpen: true });
        yenidenKurOverlay(this);
      },
    );
    // Başlangıçta da uygula: kayıtlı tercih ve prefers-reduced-motion.
    {
      const g = this.#game();
      g.shake.enabled = settings.state.screenShake;
      this.sound.mute = !settings.state.sound;
    }
    this.#createSettingsButton();
    this.#createPauseButton();
    this.#createPauseOverlay();
    this.#bindKeys();
    // Dil değişiminden geldiyse panel açık kalıyor — oyuncu tek tıkla
    // hem sonucu görüyor hem de fikrini değiştirip geri dönebiliyor.
    if (data?.settingsOpen === true) this.#settingsPanel.setVisible(true);

    const dev = devHooks();
    if (dev !== undefined) {
      dev.paused = false;
      dev.startWaveEarly = () => this.#game().startWaveEarly();
      dev.gold = () => this.#game().gold;
      dev.wavePhase = () => this.#game().wavePhase;
      dev.waveNumber = () => this.#game().waveNumber;
      dev.prepRemaining = () => this.#game().prepRemainingSec ?? -1;
    }
  }

  update(): void {
    const dev = devHooks();
    if (dev !== undefined) dev.hudFrames = (dev.hudFrames ?? 0) + 1;

    const game = this.#game();
    this.#readout?.update({
      gold: game.gold,
      lives: game.lives,
      prepRemainingSec: game.prepRemainingSec,
      waveNumber: game.waveNumber,
      totalWaves: game.totalWaves,
      endless: game.isEndlessWave,
    });
    this.#telegraph?.show(game.upcomingWave);
    this.#abilityButtons?.update(
      (id) => game.abilities.progress(id),
      game.pendingAbility,
      // Yükseltme düğmesi yalnız **alınabilirken** görünüyor (`M99`).
      (id) => {
        const bedel = game.yetenekYukseltmeBedeli(id);
        return bedel !== null && game.gold >= bedel ? bedel : null;
      },
    );

    const boss = game.bossInfo;
    if (boss !== null) this.#bossBar?.show(boss.hp, boss.maxHp);
    else this.#bossBar?.hide();

    const erkenAcik = game.earlyStartAvailable;
    this.#earlyBtn?.setVisible(erkenAcik);
    this.#earlyLabel?.setVisible(erkenAcik);
    this.#earlyBonus?.setVisible(erkenAcik);
    // `setText` **kendi satırında**: `k.7` bekçisi alıcıyı satır başından
    // çıkarıyor, `if (...)` öneki onu izlenemez yapıyor.
    if (erkenAcik) {
      this.#earlyBonus?.setText(`+${game.earlyStartPreview}`);
    }
    // Risk yalnız gerçekten varken görünüyor.
    const sahada = game.enemiesOnField;
    const riskVar = erkenAcik && sahada > 0;
    this.#earlyRiskSayi?.setVisible(riskVar);
    this.#earlyRiskEtiket?.setVisible(riskVar);
    if (riskVar) {
      this.#earlyRiskSayi?.setText(String(sahada));
    }

    this.#geriSayimTiki(game.prepRemainingSec, game.soundSystem);
    this.#oyunSonuKontrol(game);
  }

  /**
   * Zorluk rozeti — `M8-T11`.
   *
   * Yalnız Normal **dışında** çiziliyor. Normal varsayılan; her ele bir
   * "Normal" etiketi koymak ekranda bilgi değil gürültü olurdu, ve HUD'un
   * sağ üstü zaten hız/ayar düğmeleriyle dolu.
   *
   * TIER 1 kural 7: bir kez yazılıyor, `setText` yok — zorluk bir elin
   * ortasında değişmiyor (seçim seviye seçim ekranında).
   */
  #zorlukRozeti(): void {
    const zorluk = getSettings(this).state.difficulty;
    if (zorluk === 'normal') return;
    const anahtar: StringKey = zorluk === 'kolay' ? 'diffKolay' : 'diffZor';
    const x = ZORLUK_ROZET_X;
    const y = ZORLUK_ROZET_Y;
    // Parşömen altlık: ilk denemede rozet **düz metindi** ve harita
    // zemininde (yeşil çayır, gri kar, yosun) neredeyse görünmüyordu —
    // canlı ekran görüntüsünde arandı ve bulunamadı, yalnız sahne
    // dökümünde vardı. HUD'un geri kalanı zaten parşömen üstünde duruyor.
    // Genişlik 92 değil 68: bekçi testi 92'nin harita 3'ün `(1160, 195)`
    // yapı noktasına değdiğini gösterdi. Rozet o sırada sağ kenardaydı;
    // üst şeride taşındıktan sonra da 68 kaldı, çünkü hız düğmesiyle
    // (1204'te başlıyor) arasındaki boşluğu 68 rahat bırakıyor. Her iki
    // dildeki metin (Kolay/Zor, Easy/Hard) 16 px'te sığıyor.
    createParchmentFrame(this, x, y, 68, 34, 12);
    this.add
      .text(x, y, t(anahtar), {
        fontFamily: 'Spectral, serif',
        fontSize: '16px', // Platform: minimum 16 px
        color: zorluk === 'zor' ? '#B03A2E' : '#14203A',
      })
      .setOrigin(0.5);
  }

  /**
   * Hazırlık sayacının son 3 saniyesinde saniyede bir tik — `M8-T10`.
   *
   * **Tam saniye sınırında** çalıyor, her karede değil: sayaç kaydı
   * (`#sonTik`) yalnız değer değiştiğinde tetikliyor. Ses dosyası henüz
   * yok; `SoundSystem` eksik anahtarı sessizce atlıyor.
   */
  #geriSayimTiki(kalanSn: number | null, ses: SoundSystem | undefined): void {
    if (kalanSn === null) {
      this.#sonTik = -1;
      return;
    }
    const tam = Math.ceil(kalanSn);
    if (tam === this.#sonTik) return;
    this.#sonTik = tam;
    if (tam >= 1 && tam <= GERI_SAYIM_TIK_SN) ses?.playCountdownTick();
  }

  /**
   * Kazanma / kaybetme geçişi (`M3-T11`).
   *
   * **S31 kararı: kaybetme ANINDA.** Can 0'a inince dalga sonu beklenmiyor.
   * Gerekçe: dalga sonunu beklemek oyuncuya kaybettiğini bildiği bir dalgayı
   * izletmek demek; tower defense'te en sık şikâyet edilen ölü zaman bu.
   */
  #oyunSonuKontrol(game: GameScene): void {
    if (this.#bitti) return;

    const kaybetti = game.lives <= 0;
    const kazandi = game.wavePhase === 'done' && game.lives > 0;
    if (!kaybetti && !kazandi) return;

    this.#bitti = true;
    game.soundSystem?.playOutcome(kazandi);
    // `M9-T01` — seviye bitişi de bir "kesinti" (Poki/CrazyGames şartı).
    portal.gameplayStop();

    /**
     * `M9-T02` — teşhis matrisinin iki sinyali burada doğuyor:
     * tamamlama oranının paydası (`start`) `GameScene`'de atıldı, payı
     * (`complete`) burada; kaybedişte ayrıca **hangi dalgada** bırakıldığı.
     */
    if (kazandi) {
      // `M26` — yıldız o koşunun başlangıç canına göre; portal olayı da
      // kayıtla **aynı** sayıyı göndermeli.
      haritaKazanildi(portal, game.map.id, starsFor(game.lives, true, game.startLives));
    } else {
      haritaKaybedildi(portal, game.map.id, game.waveNumber);
    }
    // `M10-T02` — tur bitti, kayıt siliniyor. **Kazanışta da kaybedişte
    // de**: menüdeki "Devam et" yalnız gerçekten sürmekte olan bir tur
    // için görünmeli, yoksa oyuncu bitirdiği haritayı yeniden açar.
    // `Game` durmadan ÖNCE çağrılıyor — sahne durduktan sonra metodu
    // çağırmak ölü bir sahneye dokunmak olurdu.
    game.turKaydiniSil();
    this.scene.stop('Game');
    this.scene.start('GameOver', {
      won: kazandi,
      lives: game.lives,
      mapId: game.map.id,
      // `M8-T03` — `Game` birazdan duruyor; istatistik **veri olarak**
      // taşınıyor, nesne referansı olarak değil.
      stats: game.runStats?.data,
      // `M8-T06` — oyun sonu ekranı rekoru yalnız sonsuz elde kaydediyor.
      endless: game.isEndlessRun,
    });
  }

  /**
   * Ayarlar butonu — sağ üst. Duraklatma gerektirmiyor: §10'un istediği
   * ayarlar (sarsıntı, efekt, ses) oyun sürerken de değiştirilebilmeli,
   * çünkü etkileri ancak oyun akarken görülüyor.
   */
  #createSettingsButton(): void {
    const x = this.scale.width - MARGIN - BTN / 2;
    const y = AYAR_BTN_Y;
    const btn = createParchmentButton(this, x, y, BTN, BTN, 14);
    addPressFeedback(btn);
    this.add
      .text(x, y, '⚙', { fontFamily: 'Spectral, serif', fontSize: '24px', color: '#14203A' })
      .setOrigin(0.5);
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.#settingsPanel?.setVisible(!(this.#settingsPanel?.visible ?? false));
    });
  }

  /**
   * **Duraklatma düğmesi** — `M87`.
   *
   * Duraklatma menüsü (`Devam · Yeniden başla · Ayarlar · Ana menü`)
   * `M8-T03`'ten beri var ama **yalnız ESC/boşluk** ile açılıyordu. Poki
   * ve CrazyGames ağırlıklı olarak dokunmatik; klavyesi olmayan oyuncu
   * duraklayamıyor, **haritayı yeniden başlatamıyor ve menüye dönemiyordu**
   * — tek çıkışı kaybetmeyi beklemekti. Ayar düğmesi bunun yerine
   * geçmiyor: o bilerek duraklatmıyor (etkileri ancak oyun akarken
   * görülür, kendi başlığındaki gerekçe).
   *
   * Glif çizgiyle çiziliyor, yazıyla değil: `⏸` Spectral'de yok ve
   * atlas'ta duraklatma ikonu bulunmuyor. İki çubuk **biçim**, yani
   * bilgi renge dayanmıyor (TIER 1 kural 6).
   */
  #createPauseButton(): void {
    const x = DURAKLAT_BTN_X;
    const y = DURAKLAT_BTN_Y;
    const btn = createParchmentButton(this, x, y, DURAKLAT_BTN, DURAKLAT_BTN, 12);
    addPressFeedback(btn);
    const cubuk = this.add.graphics();
    cubuk.fillStyle(INK, 1);
    cubuk.fillRoundedRect(x - 9, y - 10, 6, 20, 2);
    cubuk.fillRoundedRect(x + 3, y - 10, 6, 20, 2);
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.#togglePause();
    });
  }

  #game(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  /** Statik etiketler — bir kez yazılıyor, `setText` yok (TIER 1 k.7). */
  #createLabels(): void {
    const stil = { fontFamily: 'Spectral, serif', fontSize: '16px', color: '#8A7250' };
    // Etiket kolonu x=136 — oyuncu geri bildirimi (2026-09-14): harita 3
    // 1064 altınla başlıyor, sayı fontunun glif ilerlemesi 25 px, dört
    // hane x=28'den 128'e uzanıyor ve etiket 112'deyken "1064" "gold"un
    // üstüne biniyordu. Kart 3 hane için ölçülmüştü.
    this.add.text(MARGIN + 116, MARGIN + 20, t('gold'), stil);
    this.add.text(MARGIN + 116, MARGIN + 54, t('lives'), stil);
    this.add.text(MARGIN + 116, MARGIN + 88, t('wave'), stil);
  }

  /**
   * Erken başlatma butonu — **dalga 4'ten itibaren** görünür (§6).
   * Etiket sabit; kazanılacak bonus değişken olduğu için yazılmıyor.
   */
  #createEarlyStartButton(): void {
    const x = this.scale.width / 2;
    // Üst-orta, geri sayımın hemen altında — oyuncu geri bildirimi
    // (2026-09-14, harita 3): alt-ortadayken kalenin ve iki yapı
    // noktasının üstüne düşüyordu (harita 3'ün kalesi ekranın alt
    // ortasında). Geri sayım (y 16, 32 px) ile boss çubuğu (y 46) aynı
    // yerde ama bu buton yalnız hazırlıkta görünüyor, boss çubuğu yalnız
    // boss canlıyken — hiç çakışmıyorlar.
    const y = 82;

    this.#earlyBtn = createParchmentButton(this, x, y, 180, 52, 14).setVisible(false);
    this.#earlyLabel = this.add
      .text(x, y - 14, t('startWave'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#14203A',
      })
      .setOrigin(0.5)
      .setVisible(false);
    /**
     * **`M25` — bonus artık düğmenin üstünde yazıyor.**
     *
     * `M16` erken basmayı gerçek bir risk kararı yaptı (kalan süre altına
     * dönüyor ama sıradaki dalga artıkların üstüne biniyor; ölçüm hep
     * basmanın harita 5-6'yı geçilemez yaptığını söylüyor). Oyuncu o
     * kararın **kazanç** tarafını hiçbir yerde göremiyordu: düğmede yalnız
     * "Dalgayı başlat" yazıyordu.
     *
     * S93'ün kuralı burada da geçerli — *"görünmeyen takas seçim değil,
     * zar atışıdır."* Sayı sayaç düştükçe eriyor, yani "erken basmak daha
     * çok altın" kuralını kendi kendine öğretiyor.
     */
    // Atama ve `bitmapText` **aynı satırda**: `k.7` bekçisi alıcıyı ancak
    // böyle izleyebiliyor (çok satırlı zincirde `setText` çağrısını
    // `Text` sanıp ihlal sayıyor — ölçüldü).
    this.#earlyBonus = this.add.bitmapText(x, y + 12, NUMBER_FONT_KEY, '');
    // Sayı fontunun doğal boyu 32 px ve düğme 52 px yüksekliğinde:
    // doğal boyda bırakılınca parşömenin **altından 4 px taşıyordu**
    // (ölçüldü: sayı 80-112, düğme 56-108). 20 px hem sığıyor hem
    // Platform'un 16 px alt sınırının üstünde kalıyor.
    this.#earlyBonus.setFontSize(20).setOrigin(0.5).setTint(ALTIN).setVisible(false);

    // Risk satırı düğmenin **altında**, parşömenin dışında: kazanç
    // (altın) düğmenin içinde, bedel dışında — ikisi karışmasın.
    // Sayı sağa, kelime sola yaslı: rakam sayısı değiştikçe (1 → 2 → 3)
    // kelime **yerinde kalıyor**, yalnız sayı sola doğru büyüyor.
    // `x - 14` / `x - 6` ikilisi çifti düğme merkezine oturtuyor
    // (ölçüldü: iki haneyle 598-683, merkez 640).
    this.#earlyRiskSayi = this.add.bitmapText(x - 14, y + 46, NUMBER_FONT_KEY, '');
    this.#earlyRiskSayi.setFontSize(18).setOrigin(1, 0.5).setTint(ZINCIFRE).setVisible(false);
    this.#earlyRiskEtiket = this.add
      .text(x - 6, y + 46, t('earlyRisk'), {
        fontFamily: 'Spectral, serif',
        fontSize: '16px', // Platform alt sınırı
        color: '#B03A2E',
      })
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.#earlyBtn.on('pointerup', () => {
      this.#game().startWaveEarly();
    });
  }

  // -------------------------------------------------------------------
  // Hız
  // -------------------------------------------------------------------

  #createSpeedButton(): void {
    const x = this.scale.width - MARGIN - BTN / 2;
    const y = HIZ_BTN_Y;

    // `G02` — diğer HUD butonlarıyla aynı parşömen çerçeve. Kare bir
    // kutuda 9-slice köşeleri hiç gerilmiyor, dönüşüm en ucuz durum.
    const cerceve = createParchmentButton(this, x, y, BTN, BTN, 12);
    addPressFeedback(cerceve);

    // Parşömen zeminde mürekkep — altın burada okunmuyor.
    // Etiket `#speed`'ten türüyor, sabit `'1×'` değil: dil değişiminde
    // sahne yeniden kuruluyor ve hız korunuyor (`create`'in `data.speed`
    // notu). Normal başlangıçta `#speed` zaten 1, çıktı aynı.
    // **Zincir tek satırda kalmalı.** Bekçi k.7 `setText`in alıcısını
    // atama satırında arıyor ve `.bitmapText(` aynı satırda değilse
    // ayrıştıramayıp ihlal sayıyor (kuralın yazılı varsayımı).
    const etiket = hizEtiketi(this.#speed);
    this.#hizYazi = this.add.bitmapText(x, y, NUMBER_FONT_KEY, etiket).setOrigin(0.5).setTint(INK);

    cerceve.on('pointerup', () => {
      this.#toggleSpeed();
    });
  }

  /**
   * `M9-T03` — hız artık **üç durumlu döngü**: 1× → 2× → 3× → 1×.
   *
   * İki durumlu anahtar üçe çıkarken tek doğru desen bu: ayrı bir "3×
   * düğmesi" HUD'a ikinci bir 44 px hedef ekler ve sağ kenar zaten dolu
   * (`HIZ_BTN_Y`/`AYAR_BTN_Y`). Döngü geri gitmiyor — 3×'ten sonra 1×'e
   * dönmek "yanlışlıkla hızlandırdım" durumunu tek dokunuşla düzeltiyor.
   *
   * Denge etkisi ölçüldü, `Speed` tipinin dokümanında.
   */
  #toggleSpeed(): void {
    this.#speed = this.#speed === 1 ? 2 : this.#speed === 2 ? 3 : 1;
    this.#hizYazi?.setText(hizEtiketi(this.#speed));

    const game = this.scene.get('Game') as GameScene;
    // `Phaser.Scene` yapısal olarak `ClockTarget`i karşılıyor:
    // tweens.timeScale, time.timeScale, anims.globalTimeScale.
    game.clock.setScale(this.#speed, game);
    game.bus.emit('speed:changed', { scale: this.#speed });
  }

  // -------------------------------------------------------------------
  // Duraklatma
  // -------------------------------------------------------------------

  /**
   * `M8-T03` — duraklatma perdesi artık bir **menü**.
   *
   * Eskiden yalnız "Duraklatıldı" + tuş ipucu vardı: oyundan çıkmanın ya
   * da baştan başlamanın tek yolu kaybetmeyi beklemekti. Dört eylem:
   * Devam · Yeniden başla · Ayarlar · Ana menü.
   *
   * "Yeniden başla" ve "Ana menü" `GameOverScene`'in stop/start sırasını
   * **birebir** tekrarlıyor (`#haritayaGec`/`#anaMenuyeDon`): `sleep`/
   * `wake` kullanılsaydı önceki elin altını ve kuleleri kalırdı — o
   * hatanın gerekçesi `GameOverScene`'de yazılı.
   */
  #createPauseOverlay(): void {
    const { width, height } = this.scale;

    const perde = this.add.rectangle(0, 0, width, height, INK, 0.72).setOrigin(0);
    const yazi = this.add
      .text(width / 2, height / 2 - 150, t('paused'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '56px',
        color: '#E4D3A8',
      })
      .setOrigin(0.5);
    const ipucu = this.add
      .text(width / 2, height / 2 - 100, t('pauseHint'), {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#8A7250',
      })
      .setOrigin(0.5);

    this.#overlay = this.add.container(0, 0, [perde, yazi, ipucu]).setVisible(false);

    const ARA = 64;
    let i = 0;
    const buton = (metin: string, onClick: () => void): void => {
      const y = height / 2 - 40 + i++ * ARA;
      const cerceve = createParchmentButton(this, width / 2, y, 240, 52, 14);
      addPressFeedback(cerceve);
      const etiket = this.add
        .text(width / 2, y, metin, {
          fontFamily: 'Spectral, serif',
          fontSize: '20px',
          color: '#14203A',
        })
        .setOrigin(0.5);
      cerceve.on('pointerup', onClick);
      this.#overlay?.add([cerceve, etiket]);
    };

    buton(t('resume'), () => this.#togglePause());
    buton(t('restart'), () => {
      const mapId = this.#game().mapId;
      // `M10-T02` — oyuncu turu **bilerek** bırakıyor; kayıt siliniyor.
      // Silinmeseydi yeni tur ilk dalgasını bitirene kadar eski kayıt
      // ayakta kalırdı ve o aralıkta sekmeyi kapatan oyuncu "Devam
      // et"te ESKİ turunu bulurdu.
      //
      // "Ana menü" bilerek silmiyor: oradan çıkmak turu bırakmak değil,
      // tam da bu özelliğin var olma sebebi olan "sonra dönerim".
      this.#game().turKaydiniSil();
      this.scene.stop('Hud');
      this.scene.stop('Game');
      this.scene.start('Game', { mapId });
      this.scene.launch('Hud');
    });
    buton(t('settingsButton'), () => this.#settingsPanel?.setVisible(true));
    buton(t('backToMenu'), () => {
      // `M9-T01` — menüye dönüş de kesinti. Zaten duraklatmadayız ve
      // `Portal` yinelenen `stop`'u yutuyor; yine de açıkça yazılıyor
      // ki "menüye dönerken olay gitti mi" sorusu koda bakarak
      // cevaplanabilsin. **Burada reklam YOK** — Poki'nin yanlış
      // kullanım örneği tam olarak bu: "oyundan çıkıp seviye seçime
      // gitmek".
      portal.gameplayStop();
      this.scene.stop('Hud');
      this.scene.stop('Game');
      this.scene.start('LevelSelect');
    });
  }

  /**
   * ESC **ve** boşluk — Poki'nin zorunlu şartı (research/05 §1).
   * Tuşlar `Hud`'a bağlı: `Game` duraklatılınca onun girdi işleyicisi
   * de durur ve devam edilemezdi.
   */
  #bindKeys(): void {
    const kb = this.input.keyboard;
    if (kb === null) return;

    kb.on('keydown-ESC', () => {
      this.#togglePause();
    });
    kb.on('keydown-SPACE', () => {
      this.#togglePause();
    });
  }

  /**
   * `scene.pause()` kullanılıyor, `GameClock.setScale(0)` **değil**.
   * Sıfır ölçek bölme hataları doğuruyor (research/02 §3) ve `Speed`
   * tipinde `0` yok.
   */
  #togglePause(): void {
    this.#paused = !this.#paused;
    this.#overlay?.setVisible(this.#paused);
    if (!this.#paused) this.#settingsPanel?.setVisible(false);

    const game = this.scene.get('Game') as GameScene;
    if (this.#paused) {
      this.scene.pause('Game');
      // `M9-T01` — Poki/CrazyGames: duraklatma bir "kesinti".
      portal.gameplayStop();
    } else {
      this.scene.resume('Game');
      /**
       * Poki'nin tek meşru reklam anı: *"duraklamadan çıkıp oyuna
       * dönerken"*. Oyuncu "Devam"a bastıysa devam etme niyetini
       * göstermiş demektir — dokümanın kendi ölçütü bu.
       *
       * Reklam boyunca ses kısılıyor (`GAME-DESIGN.md` §12'nin son
       * satırı, Poki şartı). `sound.mute` toplu anahtar olduğu için
       * reklamdan önceki değer saklanıp geri konuyor — oyuncunun kendi
       * "ses kapalı" tercihi reklam yüzünden açılmasın.
       */
      const oncekiMute = this.sound.mute;
      portal.commercialBreak((kisik) => {
        this.sound.mute = kisik ? true : oncekiMute;
      });
      portal.gameplayStart();
    }
    game.bus.emit('game:paused', { paused: this.#paused });

    const dev = devHooks();
    if (dev !== undefined) dev.paused = this.#paused;
  }
}

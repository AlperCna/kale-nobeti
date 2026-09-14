import Phaser from 'phaser';
import { MAPS } from '../data/maps';
import { wavesFor } from '../data/waves';
import { SaveSystem } from '../systems/SaveSystem';
import { LocalStore } from '../util/storage';
import { t } from '../util/i18n';
import { PreloadScene } from './PreloadScene';
import { createParchmentButton } from '../fx/ParchmentFrame';
import { getSettings } from '../systems/Settings';
import { DIFFICULTY } from '../data/difficulty';
import type { Difficulty } from '../data/difficulty';
import { FRAME_STAR, FRAME_STAR_EMPTY } from '../data/spriteFrames';
import type { StringKey } from '../data/strings';

const INK = 0x14203a;
const GOLD = 0xd4a032;
/** Parşömen — yıldız bandının zemini (metin rengi olarak zaten kullanılıyor). */
const PARSOMEN = 0xe4d3a8;
/**
 * M6-T05 palet temizliği: `KILITLI`/kart-dışı metin renkleri önceden
 * palet dışıydı (`0x4a5570`, `0x2a3550`, `#8A93AA`, `#B9AF95`, `#5A6478`
 * — `M6-T05` kabul kriteri "palet dışı renk sıfır" bunlarla geçmiyordu).
 * Kilitli kart artık düz mürekkep + düşük alfa altın kontur; soluk
 * metinler `rgba()` ile GOLD/PARCHMENT'ın düşük alfalı hali — yeni renk
 * yok, var olanın saydamlığı.
 */
const KILITLI_KONTUR_ALFA = 0.35;

/** Dokunmatik hedef en az 44×44 px (`CLAUDE.md` Platform). */
const KART_W = 300;
const KART_H = 190;
const KART_ARA_X = 24;
/** Yıldız yuvaları arası adım — bant genişliği de buna bağlı. */
const YILDIZ_ADIM = 36;
const KART_ARA_Y = 30;

/**
 * Satır başına en fazla kaç kart — `M8-T04`.
 *
 * Eski düzen bütün haritaları **tek satıra** diziyordu: 3 haritayla
 * sorunsuzdu, 4'te toplam genişlik 4×300 + 3×24 = **1272 px** oldu ve
 * 1280'lik sahnede yanlarda 4'er piksel kaldı — kartlar ekranın kenarına
 * yapıştı (canlı ekran görüntüsüyle görüldü). 5'te taşacaktı.
 *
 * Üç sütunla sınırlamak hem bugünkü 4'ü (3+1) hem yarınki 5'i (3+2)
 * kenar boşluğunu koruyarak taşıyor; `M8-T05` harita 5'i eklerken bu
 * dosyaya hiç dokunulmayacak.
 */
const SATIR_BASINA = 3;

/** Zorluk seçici satırı — kartların üstünde, yıldız toplamının altında. */
const ZORLUK_Y = 148;

/** Kartların dikey olarak ortalanacağı bant (başlık altı, "Geri" üstü). */
const IZGARA_UST = 186;
const IZGARA_ALT = 660;

/** Izgara yerleşimi — saf aritmetik, sahneye dokunmuyor. */
function izgaraKonumu(
  i: number,
  toplam: number,
  genislik: number,
): { x: number; y: number } {
  const satirSayisi = Math.ceil(toplam / SATIR_BASINA);
  const satir = Math.floor(i / SATIR_BASINA);
  // Son satır eksik kalabilir; o satırdaki kart sayısına göre ortalanıyor.
  const buSatirdaki = Math.min(SATIR_BASINA, toplam - satir * SATIR_BASINA);
  const sutun = i % SATIR_BASINA;

  const x =
    genislik / 2 + (sutun - (buSatirdaki - 1) / 2) * (KART_W + KART_ARA_X);
  const bantMerkezi = (IZGARA_UST + IZGARA_ALT) / 2;
  const y =
    bantMerkezi + (satir - (satirSayisi - 1) / 2) * (KART_H + KART_ARA_Y);
  return { x, y };
}

/** `Y03` — harita adları `strings.ts`'e taşındı (S75: çevrilecek). */
const HARITA_ADI_ANAHTARI: Readonly<Record<string, StringKey>> = {
  'degirmen-gecidi': 'mapDegirmenGecidi',
  'tas-kopru': 'mapTasKopru',
  'kul-ovasi': 'mapKulOvasi',
  'kar-gecidi': 'mapKarGecidi',
  'kadim-harabe': 'mapKadimHarabe',
};

/** Bilinmeyen bir harita id'si gelirse (olmaması gerekir) ham id'ye düşer. */
function haritaAdi(id: string): string {
  const anahtar = HARITA_ADI_ANAHTARI[id];
  return anahtar !== undefined ? t(anahtar) : id;
}

/**
 * Seviye seçim — `M7-T06`.
 *
 * Üç harita, kazanılan yıldızlar ve kilit durumu. **Kilit yalnız
 * bitirmeye bağlı** (S62): bir önceki harita bitmişse sonraki açılıyor,
 * yıldız şartı yok.
 *
 * TIER 1 kural 7: buradaki yazılar **bir kez** yazılıp değişmiyor, o
 * yüzden `Text` serbest. `setText` hiç çağrılmıyor.
 * TIER 1 kural 10: kayıt `LocalStore` üzerinden, gizli sekmede çökmüyor.
 */
export class LevelSelectScene extends Phaser.Scene {
  #save?: SaveSystem;

  constructor() {
    super('LevelSelect');
  }

  /**
   * Bir sonraki tıklama `Game` + `Hud`'u **aynı anda** başlatıyor
   * (`this.scene.start('Game', ...); this.scene.start('Hud');`, aşağıda).
   * İkisi de atlas kullanıyor ama `Hud`'un kendi yükleme aşaması yok —
   * burada, ikisi başlamadan önce, tek seferde yüklemek ikisi arasındaki
   * yarışı (`Game` bitirmeden `Hud` `create()`'e geçip "kare yok"
   * uyarısı vermesi, canlı testte yakalandı) kökten kapatıyor.
   */
  preload(): void {
    PreloadScene.queueGame(this);
    // M6-T05 — kart küçük resimleri (P01'in yeniden kullanımı, yeni
    // sanat değil). `exists` koruması: sahne yeniden başlatmada tekrar
    // istenmesin (aynı gerekçe `PreloadScene.queueGame`'de de var).
    for (const m of MAPS) {
      const key = `card-${m.id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/level-select/${m.id}.webp`);
      }
    }
  }

  create(): void {
    // `Y14` — `atlas`/sayı fontu inmediyse oyun oynanamaz hâle geliyor
    // (kuleler, düşmanlar, HUD çerçevesi, bütün sayılar). `LevelSelect`
    // bu ikisini isteyen **ilk** sahne (`preload()`'daki `queueGame`) ve
    // `Game`/`Hud`'a giden **tek** yol — burada durdurmak, aşağı akışın
    // hepsini (Game + Hud, ikisi de atlas'a bağımlı) ayrıca korumaktan
    // daha ucuz ve daha güvenilir.
    if (!PreloadScene.kritikVarliklarHazir(this)) {
      this.#kritikYuklemeHatasi();
      return;
    }

    this.#save = new SaveSystem(new LocalStore());
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, INK).setOrigin(0);
    this.add
      .text(width / 2, 56, t('levelSelect'), {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: '44px',
        color: '#D4A032',
      })
      .setOrigin(0.5);

    // `G07` — tek yıldız ikonu + sayı. Metin önce `(0,0)`'da ölçülüp
    // sonra ikon+metin çifti birlikte ortalanıyor (ikon genişliği +
    // aralarındaki boşluk hesaba katılarak) — `★` karakteri kod
    // tabanından tamamen kalktı.
    const toplam = this.#save.totalStars();
    const IKON_BOYUT = 20;
    const IKON_METIN_BOSLUK = 6;
    const toplamMetin = this.add
      .text(0, 106, `${toplam} / ${MAPS.length * 3}`, {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#8A7250',
      })
      .setOrigin(0, 0.5);
    const grupGenisligi = IKON_BOYUT + IKON_METIN_BOSLUK + toplamMetin.width;
    const solKenar = width / 2 - grupGenisligi / 2;
    this.add
      .image(solKenar + IKON_BOYUT / 2, 106, 'atlas', FRAME_STAR)
      .setDisplaySize(IKON_BOYUT, IKON_BOYUT);
    toplamMetin.setX(solKenar + IKON_BOYUT + IKON_METIN_BOSLUK);

    this.#zorlukSecici(width);

    const ids = MAPS.map((m) => m.id);
    MAPS.forEach((m, i) => {
      const { x, y } = izgaraKonumu(i, MAPS.length, width);
      const acik = this.#save!.isUnlocked(ids, m.id);
      const yildiz = this.#save!.starsOf(m.id);

      let kart: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container;
      if (acik) {
        // Küçük resim + üstünde yalnız köşe/kenar (orta dolgu yok —
        // varsa küçük resmi kapatırdı).
        this.add.image(x, y, `card-${m.id}`).setDisplaySize(KART_W, KART_H);
        // Ad ve alt yazı için mürekkep bant — küçük resmin üstünde doğrudan
        // yazı okunmuyordu (lav haritasında "Kül Ovası" zor, "10 dalga ·
        // 12 nokta" neredeyse görünmez). Yazı rengi de parşömene döndü.
        this.add.rectangle(x, y - 54, KART_W - 40, 34, INK, 0.72);
        this.add.rectangle(x, y + 34, KART_W - 40, 26, INK, 0.72);
        // `M8-T04` — yıldız sırası için de bant, ama **parşömen**, mürekkep
        // değil. İki ayrı okunurluk sorunu var ve zıt yönleri istiyorlar:
        //
        // 1. Kazanılmamış yıldız (soluk altın **kontur**, içi boş) parlak bir
        //    küçük resmin üstünde tamamen kayboluyordu — Kül Ovası'nın
        //    çölünde üçüncü yuva, Kar Geçidi'nin karında üçü de.
        // 2. Kazanılmış yıldızın atlas karesi altın konturlu ama **içi
        //    mürekkep dolgu** (ölçüldü: merkez `#14213B`). Mürekkep bant
        //    denendi ve dolgu banda karıştı: üç dolu yıldız, üç boş yıldıza
        //    benzedi — yani bant birinci sorunu çözerken ikincisini yarattı.
        //
        // Parşömen zemin ikisini birden çözüyor: dolu yıldız koyu dolgusuyla
        // basıyor, boş yıldız zemini gösteriyor. Ayrım **dolu/boş**, yani
        // yalnız renge dayanmıyor (TIER 1 kural 6).
        this.add.rectangle(x, y - 8, 3 * YILDIZ_ADIM + 16, 40, PARSOMEN, 0.85);
        kart = createParchmentButton(this, x, y, KART_W, KART_H, 20, true);
      } else {
        kart = this.add
          .rectangle(x, y, KART_W, KART_H, INK)
          .setStrokeStyle(3, GOLD, KILITLI_KONTUR_ALFA);
      }

      this.add
        .text(x, y - 54, `${i + 1}. ${haritaAdi(m.id)}`, {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '26px',
          color: acik ? '#E4D3A8' : 'rgba(228,211,168,0.4)',
        })
        .setOrigin(0.5);

      // Yıldızlar — `G07`: atlas karesi, eski sistem yazı tipi `★`'ın
      // yerine. Üç yuva her zaman çiziliyor (dolu+boş) — eski "soluk
      // arka plan ★★★ + üstüne dolu ★ bindirme" hilesi ve onun şüpheli
      // hizalama aritmetiği (`x - 30 + (yildiz*30)/2 - 15 + 15`) tamamen
      // kalktı; artık her yuva kendi sabit konumunda.
      for (let i = 0; i < 3; i++) {
        this.add
          .image(
            x + (i - 1) * YILDIZ_ADIM,
            y - 8,
            'atlas',
            i < yildiz ? FRAME_STAR : FRAME_STAR_EMPTY,
          )
          .setDisplaySize(30, 30);
      }

      this.add
        .text(
          x,
          y + 34,
          acik
            ? `${wavesFor(m.id).length} ${t('waves')} · ${m.buildSpots.length} ${t('buildSpot')}`
            : t('locked'),
          {
            fontFamily: 'Spectral, serif',
            fontSize: '16px', // Platform: minimum 16 px
            color: acik ? '#E4D3A8' : 'rgba(228,211,168,0.4)',
          },
        )
        .setOrigin(0.5);

      if (!acik) return;
      kart.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.scene.start('Game', { mapId: m.id });
        this.scene.launch('Hud');
      });
    });

    this.add
      .text(width / 2, height - 42, t('back'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#8A7250',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('Menu'));
  }

  /**
   * Zorluk seçici — `M8-T11`.
   *
   * **Ayarlar panelinde değil, burada.** Zorluk bir elin ortasında
   * değiştirilmemeli (dalga 7'de "Kolay"a geçmek kaydı anlamsızlaştırır);
   * seviye seçim ekranı onu değiştirmenin doğal ve tek anı.
   *
   * TIER 1 kural 7: üç ayrı statik `Text`, `setText` yok — seçim
   * değişince sahne yeniden kuruluyor (`SettingsPanel`'in dil satırıyla
   * aynı desen).
   */
  #zorlukSecici(width: number): void {
    const settings = getSettings(this);
    const secili = settings.state.difficulty;
    const secenekler: readonly { id: Difficulty; etiket: StringKey }[] = [
      { id: 'kolay', etiket: 'diffKolay' },
      { id: 'normal', etiket: 'diffNormal' },
      { id: 'zor', etiket: 'diffZor' },
    ];

    const BTN_W = 120;
    /** Platform: dokunmatik hedef en az 44×44 px (bekçi bunu ölçüyor). */
    const BTN_H = 44;
    const ARA = 8;
    const toplam = secenekler.length * BTN_W + (secenekler.length - 1) * ARA;
    const y = ZORLUK_Y;

    this.add
      .text(width / 2 - toplam / 2 - 16, y, t('difficulty'), {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#8A7250',
      })
      .setOrigin(1, 0.5);

    secenekler.forEach((o, i) => {
      const x = width / 2 - toplam / 2 + BTN_W / 2 + i * (BTN_W + ARA);
      const aktif = o.id === secili;
      if (aktif) {
        createParchmentButton(this, x, y, BTN_W, BTN_H, 10);
      } else {
        this.add
          .rectangle(x, y, BTN_W, BTN_H, INK)
          .setStrokeStyle(2, GOLD, KILITLI_KONTUR_ALFA)
          .setInteractive({ useHandCursor: true })
          .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
            settings.set('difficulty', o.id);
            this.scene.restart();
          });
      }
      this.add
        .text(x, y, t(o.etiket), {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: aktif ? '#14203A' : 'rgba(228,211,168,0.55)',
        })
        .setOrigin(0.5);
    });

    if (!DIFFICULTY[secili].recordStars) {
      this.add
        .text(width / 2, y + 30, t('diffNoStars'), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // Platform: minimum 16 px
          color: '#8A7250',
        })
        .setOrigin(0.5);
    }
  }

  /**
   * `Y14` — kritik varlık yüklenemedi. **Atlas'sız çizilebilmeli**
   * (`createParchmentButton`/`FRAME_STAR` atlas kareleri, tam da eksik
   * olan şey) — düz `Graphics`/`Rectangle` + sistem yazı tipi.
   *
   * Kurtarma tam sayfa yenileme: Phaser'ın yükleyicisi yerleşik yeniden
   * deneme taşımıyor, belirli dosyaları elle kuyruğa geri koymak bu
   * ekranın basitliğine değmiyor — bir sayfa yenilemesi (Boot'tan
   * itibaren) ağa yeni bir şans veriyor ve çok daha güvenilir.
   */
  #kritikYuklemeHatasi(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, INK).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 50, t('assetLoadError'), {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#E4D3A8',
        align: 'center',
        wordWrap: { width: width - 160 },
      })
      .setOrigin(0.5);

    const btnY = height / 2 + 70;
    const btn = this.add
      .rectangle(width / 2, btnY, 260, 60, GOLD)
      .setStrokeStyle(2, INK)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, btnY, t('reloadPage'), {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: '#14203A',
      })
      .setOrigin(0.5);

    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      window.location.reload();
    });
  }
}

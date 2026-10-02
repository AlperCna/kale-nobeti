import type { Kutu } from '../util/math';

/**
 * Kule bilgi panelinin ölçüsü ve iki yerleşimi.
 *
 * TIER 1 kural 1: sayı `data/` içinde. TIER 1 kural 11: Phaser'a hiç
 * dokunmuyor — `node` ortamında test edilebiliyor, `TowerInfoPanel`
 * buradan okuyor. Sayıları teste kopyalamak, `kurallar.mjs`'in elle
 * tutulan tablosunun sessizce boş veri basmasıyla aynı hata olurdu.
 *
 * ## Neden iki yerleşim var
 *
 * Panel sabit sağ-alttaydı ve **%90 opak**. Ölçüldü: harita 1'in
 * `7` numaralı yapı noktası `(1120, 485)` tamamen panelin altında
 * kalıyordu, `6` numara `(950, 485)` kenarındaydı. Panel açıkken o nokta
 * ne görünüyor ne tıklanabiliyordu — ve daha kötüsü, sağ alttaki bir
 * kuleyi seçtiğinde panel **incelediğin kuleyi** örtüyordu. Aynı sebeple
 * kulenin yanında açılan yükseltme menüsüyle de çakışıyordu.
 *
 * Sabit bir "boş köşe" yok: panel 270×268, yani ekranın yaklaşık %8'i ve
 * beş haritanın hiçbir köşesi bu boyutta serbest değil (`M8-B01`'in
 * taraması bunu zaten göstermişti). Çözüm sabit yer değil **kaçınma**.
 */

/**
 * Panelin dış ölçüsü.
 *
 * Genişlik **270'ten 300'e** çıktı — oyuncu geri bildirimi: *"şuradaki
 * yazılar da tam gözükmüyor gibi"*. Ölçüldü: parşömen çerçevenin kenar
 * bandı **16 px**, ama etiketler `x = 12`'den başlıyor ve değerler
 * `x = 258`'de bitiyordu (sağ kenara 12 kalıyor). Yani **iki sütun da
 * çerçevenin altına giriyordu.**
 *
 * Yalnız iç payı 22'ye çıkarmak yetmedi: en geniş satırda
 * ("Seçili düşmana DPS" 142 px + "13.00" 98 px) etiket ve değer
 * çakışıyordu. 270 - 44 pay = 226 < 240 gereken. 300'de 256 kalıyor ve
 * araya 11 px giriyor.
 *
 * Genişleme iki yerleşimi de bozmuyor: sağ köşe `968`'de başlıyor (tam
 * ekran düğmesinin sağ kenarı 928), sol köşe `12-312` ve orta eksenin
 * (640) solunda kalıyor — `panelLayout.test.ts` ikisini de bekçiliyor.
 */
export const PANEL_W = 300;

/**
 * İçerik ile panel kenarı arasındaki pay.
 *
 * **Çerçeve bandından (16) büyük olmak zorunda** — eskiden 12'ydi ve
 * metin süslemenin altında kalıyordu. 22 = 16 kenar + 6 nefes.
 */
export const PANEL_IC_PAY = 22;

/**
 * Düşman ikonu şeridinin dokunma hedefi — Platform alt sınırı, iki
 * eksende de (`M134`, S166'nın kapanışı).
 *
 * Şerit tek satırdı ve hedefin **genişliği** ikon adımıydı: on ikonlu
 * kadroda 29 px'e düşüyordu, yani 44×44 şartı yatayda tutmuyordu.
 * Kayıt bunu "ölçülmüş istisna" diye bırakmış ve çözümü de yazmıştı —
 * *"şeridi iki satıra bölmek ya da paneli genişletmek"*. İlki yapıldı:
 * paneli genişletmek 11 ikon × 44 = 484 px isterdi, panel 300.
 */
export const PANEL_IKON_HEDEF = 44;

/** Bir ikon satırının kapladığı yükseklik. */
export const PANEL_IKON_SATIR_H = PANEL_IKON_HEDEF;

/**
 * Şeridin sütun sayısı — **seçilmiyor, türetiliyor.**
 *
 * İç genişlik `300 - 2×22 = 256`, hedef 44 → `⌊256/44⌋ = 5`.
 */
export const PANEL_IKON_SUTUN = Math.max(
  1,
  Math.floor((PANEL_W - 2 * PANEL_IC_PAY) / PANEL_IKON_HEDEF),
);

/**
 * Tek ikon satırlı panelin dış yüksekliği.
 * `M11-T01` etki (+26), `M11-T02` patlama (+26).
 */
export const PANEL_H_TEK_SATIR = 320;

/** İkon satırı sayısına göre panelin dış yüksekliği. */
export function panelYuksekligi(ikonSatiri: number): number {
  return PANEL_H_TEK_SATIR + Math.max(0, ikonSatiri - 1) * PANEL_IKON_SATIR_H;
}

/**
 * **En kalabalık kadronun** gerektirdiği yükseklik — yerleşim
 * sağlamalarının kullandığı **en kötü hâl**.
 *
 * Buradaki `2` elle yazılı ama bağlı: en kalabalık kadro 10 (harita
 * 3-4-5), sütun 5, yani `⌈10/5⌉ = 2`. `panelLayout.test.ts` bu sayıyı
 * `MAPS`'ten türetip karşılaştırıyor — çelişirlerse doğru olan test.
 *
 * Panel **alt kenarından** demirli: yükseklik küçülünce üst kenar
 * aşağı iner, alt kenar yerinde kalır. Yani en kötü hâl aynı zamanda
 * en geniş kutu, ve "paneli örtmez" sağlaması onu sınadığında kısa
 * paneller de garanti altında.
 */
export const PANEL_H = panelYuksekligi(2);

/** Mantıksal ekran (CLAUDE.md Teknoloji). */
const EKRAN_W = 1280;
const EKRAN_H = 720;

/** Kenar payı — HUD'un geri kalanıyla aynı. */
const PAY = 12;

/**
 * **Yetenek bloğu** — sol alt köşedeki iki yetenek düğmesi ve üstlerindeki
 * yükseltme fişleri. `AbilityButtons` ve `HudScene` buradan okuyor (`M169`).
 *
 * Sol panel bu bloğun üstünde bitmek zorunda ve bunu elle yazılmış bir
 * sayıyla biliyordu: `622`, yetenek düğmelerinin üst kenarı. `M99`
 * düğmelerin **üstüne** yükseltme fişlerini ekledi ve sayı güncellenmedi.
 * Taş Köprü'de oynanırken görüldü: sağdaki bir kule seçilince panelin
 * alt satırları fişlerin altına giriyordu; HUD `Game`'in üstünde olduğu
 * için fişler panelin ikinci düşman satırını örtüyor ve o simgeleri
 * **tıklanamaz** yapıyordu. Fişler tahta dolunca çıkıyor, yani tam da
 * geç oyunda. İkinci kopya `maps.test.ts` `KALICI_HUD`'daydı ve o da
 * 12 px kaymıştı (578-622 diyordu, gerçek 566-610).
 */
export const YETENEK_BLOGU = {
  /** İlk düğmenin merkezi. */
  x: 20 + 40,
  y: EKRAN_H - 20 - 46,
  /** Düğme kenarı (kare) ve iki düğme arası boşluk. */
  btn: 64,
  ara: 14,
  /** Yükseltme fişinin kenarı — dokunmatik alt sınırı (44). */
  yukseltBtn: 44,
  /** Fiş ile düğme arasındaki boşluk. */
  yukseltAra: 12,
} as const;

/**
 * Yetenek bloğunun **tamamı** — düğmeler, alt etiketleri ve üstlerindeki
 * fişler. Yapı menüsü bu kutuya girmiyor (`BuildMenu`, `M169`).
 */
export const YETENEK_KUTUSU = {
  x0: YETENEK_BLOGU.x - YETENEK_BLOGU.btn / 2,
  y0: YETENEK_BLOGU.y - YETENEK_BLOGU.btn / 2 - YETENEK_BLOGU.yukseltAra - YETENEK_BLOGU.yukseltBtn,
  x1: YETENEK_BLOGU.x + YETENEK_BLOGU.btn + YETENEK_BLOGU.ara + YETENEK_BLOGU.btn / 2,
  y1: EKRAN_H,
} as const;

/** Yükseltme fişinin merkezinin düğme merkezine göre dikey yeri. */
export const YUKSELT_DY = -(YETENEK_BLOGU.btn / 2 + YETENEK_BLOGU.yukseltBtn / 2 + YETENEK_BLOGU.yukseltAra);

/**
 * Fişlerin kapladığı kutu — iki fişi birlikte örten dikdörtgen. Görünür
 * olduğunda turun sonuna kadar duruyor, yani kalıcı HUD sayılıyor.
 */
export const YUKSELT_KUTUSU = {
  x0: YETENEK_BLOGU.x - YETENEK_BLOGU.yukseltBtn / 2,
  y0: YETENEK_BLOGU.y + YUKSELT_DY - YETENEK_BLOGU.yukseltBtn / 2,
  x1: YETENEK_BLOGU.x + (YETENEK_BLOGU.btn + YETENEK_BLOGU.ara) + YETENEK_BLOGU.yukseltBtn / 2,
  y1: YETENEK_BLOGU.y + YUKSELT_DY + YETENEK_BLOGU.yukseltBtn / 2,
} as const;

/** Kule **solda** ise panel buraya. */
export const PANEL_SAG = {
  x: EKRAN_W - PAY - PANEL_W,
  y: EKRAN_H - PAY - PANEL_H,
} as const;

/**
 * Kule **sağda** ise panel buraya.
 *
 * Yetenek bloğunun — yükseltme fişleri dahil — **üstünde** duruyor: alt
 * kenarı fişlerin üst kenarından (`YUKSELT_KUTUSU.y0`, 566) `PAY` kadar
 * yukarıda bitiyor. En geniş panelde (iki ikon satırı) üst kenar 190;
 * hazırlıktaki dalga telgrafının bandı 155-189 (`HudScene` `MARGIN + 152`,
 * bant `ICON + 12`), yani kesişmiyor — oyunda ölçüldü.
 */
export const PANEL_SOL = {
  x: PAY,
  y: YUKSELT_KUTUSU.y0 - PAY - PANEL_H,
} as const;

/** Ekranın orta ekseni — panelin hangi yana kaçacağını bu belirliyor. */
export const PANEL_ESIK = EKRAN_W / 2;

/**
 * Seçili yapı noktasının `x`'ine göre panelin köşesi.
 *
 * Değişmez kural: **panel hiçbir zaman incelenen kuleyi örtmez.** Bu
 * eşikten çıkıyor — `x > 640` olan bir nokta `PANEL_SOL`'un (12-282)
 * içine, `x <= 640` olan bir nokta `PANEL_SAG`'ın (998-1268) içine
 * düşemez. `panelLayout.test.ts` bunu altı haritanın gerçek noktalarıyla
 * doğruluyor.
 *
 * **`M134` — yükseklik artık parametre.** Panel o haritanın kadrosuna
 * göre bir ya da iki ikon satırı taşıyor; sabit boy, beş düşmanlı
 * harita 1'de altta 44 px ölü boşluk bırakıyordu. Demir **alt kenarda**:
 * kısa panelin üst kenarı aşağı iner, alt kenar iki yerleşimde de
 * yerinde kalır. Varsayılan `PANEL_H` en kötü hâl, yani `PANEL_SAG` /
 * `PANEL_SOL` sabitleri en geniş kutuyu tarif etmeye devam ediyor.
 */
export function panelKonumu(
  spotX: number,
  yukseklik: number = PANEL_H,
): { readonly x: number; readonly y: number } {
  return spotX > PANEL_ESIK
    ? { x: PANEL_SOL.x, y: YUKSELT_KUTUSU.y0 - PAY - yukseklik }
    : { x: PANEL_SAG.x, y: EKRAN_H - PAY - yukseklik };
}

/**
 * **"Dalgayı başlat" düğmesi — HUD üst-ortası** (`HudScene`). `M168`'de
 * buraya taşındı ki **tek adres** olsun.
 *
 * Kusur tarayıcıda, gerçek bir oyunda bulundu: hazırlık fazında (dalga
 * 4'ten itibaren) bu düğme ve altındaki *"N sahada"* satırı, üst-ortadaki
 * bir kulenin yükseltme menüsünün **tam üstüne** çiziliyordu. `Hud`
 * sahnesi `Game`'in üstünde koştuğu için menünün **"↑ yükselt"** ve
 * **"Sat"** düğmeleri hem görünmüyor hem tıklanamıyordu — oyuncunun
 * yükseltme yapmak istediği an tam da hazırlık fazı. Menü sol üstteki
 * HUD kartından zaten kaçıyordu (`BuildMenu`'nun `HUD_ALANI`'sı), ama o
 * kaçınma *"orası değişirse burası da değişmeli — yorumla bağlı, kodla
 * değil"* diye yazılmıştı ve bu düğme sonradan eklendiğinde listeye hiç
 * girmedi.
 */
export const ERKEN_BASLAT = { x: EKRAN_W / 2, y: 82, w: 180, h: 52 } as const;

/**
 * Erken başlatmanın **risk satırı** (*"N sahada"*) — düğme merkezinin
 * `dy` altında. `M169`'dan beri bir parşömen zemini var (`w` × `h`):
 * Taş Köprü'nün üst kolu tam bu yükseklikten geçiyor ve 16 px zincifre
 * kahverengi yolun üstünde güçlükle okunuyordu (oyunda görüldü).
 */
export const RISK_SATIRI = { dy: 46, w: 104, h: 24 } as const;

/**
 * Menülerin **girmediği** üst-orta kutu: düğmenin kendisi, üstündeki
 * geri sayım ve altındaki risk satırı ile zemini (`RISK_SATIRI`).
 */
export const UST_ORTA_HUD = {
  x0: ERKEN_BASLAT.x - ERKEN_BASLAT.w / 2,
  y0: 0,
  x1: ERKEN_BASLAT.x + ERKEN_BASLAT.w / 2,
  y1: ERKEN_BASLAT.y + RISK_SATIRI.dy + RISK_SATIRI.h / 2,
} as const;

/**
 * HUD'un sağ sütunundaki **ayar düğmesi** (`HudScene`) — `M168`'de buraya
 * taşındı, çünkü başarım bandı onun yerini bilmeden konmuştu.
 */
export const AYAR_DUGMESI = { x: EKRAN_W - 20 - 56 / 2, y: 180, w: 56, h: 56 } as const;

/**
 * **Başarım bandı** (`fx/AchievementToast`) — sağdan kayarak giren bildirim.
 *
 * `M168` — bant `y = 190`'daydı (152-228) ve sağ sütundaki ayar düğmesini
 * (152-208) **tamamen** örtüyordu; oyunda her başarımda düğme bandın
 * içinden fışkırıyordu. Sebep: bant `M8-T07`'de ayar düğmesi `y = 116`'da
 * iken konmuştu; `M8-B01` düğmeyi harita 3'ün yolundan kaçırmak için
 * 180'e indirdi ve bandın yerine hiç bakılmadı. Bant artık düğmenin
 * altında başlıyor — kayarken de üstünden geçmiyor.
 */
export const BASARIM_BANDI = {
  w: 320,
  h: 76,
  sagBosluk: 16,
  y: AYAR_DUGMESI.y + AYAR_DUGMESI.h / 2 + 12 + 76 / 2,
} as const;

/**
 * Merkez + boyla tarif edilen bir HUD öğesinin kutusu.
 */
export function kutusu(d: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }): Kutu {
  return { x0: d.x - d.w / 2, y0: d.y - d.h / 2, x1: d.x + d.w / 2, y1: d.y + d.h / 2 };
}

/*
 * ## Kalıcı HUD öğeleri — `M169`, TEK ADRES
 *
 * Bu öğelerin yeri üç yerde ayrı ayrı yazılıydı: `HudScene`'in sabitleri,
 * `maps.test.ts`'in `KALICI_HUD` listesi (elle kopyalanmış kutular) ve
 * `BuildMenu`'nun kaçınma kuralları (yalnız ikisi: kart ve üst-orta).
 * Sonuç bu projenin en bilinen kusur sınıfı oldu: Kül Ovası'nın sağ kol
 * noktasında (1055,195) yapı menüsü üst-sağ şeridin altına açılıyordu —
 * duraklat düğmesi "Büyü 100"ün, hız düğmesi "?"nin tam üstündeydi ve
 * `Hud` üstte olduğu için **Büyü'ye basan oyuncu oyunu duraklatıyordu**
 * (oyunda görüldü). Artık üçü de buradan okuyor.
 */

/** Altın/can/dalga kartı (`HudScene`): 8-224 × 16-156. */
export const KART = { x: 20 + 96, y: 20 + 66, w: 216, h: 140 } as const;

/** Hız düğmesi — sağ üst köşe. */
export const HIZ_DUGMESI = { x: EKRAN_W - 20 - 56 / 2, y: 20 + 56 / 2, w: 56, h: 56 } as const;

/**
 * Duraklatma düğmesi — `M87`. Üst şeritte, zorluk rozetinin solunda;
 * sağ kenardaki üç cep dolu (`HudScene` başlık notu). 48: üst şerit
 * 56'yı taşımıyor, Platform alt sınırı 44.
 */
export const DURAKLAT_DUGMESI = { x: 1020, y: HIZ_DUGMESI.y, w: 48, h: 48 } as const;

/** Zorluk rozeti — yalnız Kolay/Zor'da çiziliyor, çizilince tur boyu duruyor. */
export const ZORLUK_ROZETI = { x: 1120, y: 42, w: 68, h: 34 } as const;

/** Tam ekran düğmesi (`OverlayScene`) — alt şerit, ölçülmüş en geniş boşluk. */
export const TAM_EKRAN_DUGMESI = { x: 888, y: 664, w: 56, h: 56 } as const;

/**
 * Tam ekran düğmesi **etiketiyle birlikte** — etiket de haritayı örtüyor.
 * 80 px: "Tam ekran" / "Fullscreen"in ikisini de kapsıyor.
 */
export const TAM_EKRAN_KUTUSU = {
  x0: TAM_EKRAN_DUGMESI.x - 40,
  y0: TAM_EKRAN_DUGMESI.y - TAM_EKRAN_DUGMESI.h / 2,
  x1: TAM_EKRAN_DUGMESI.x + 40,
  y1: TAM_EKRAN_DUGMESI.y + TAM_EKRAN_DUGMESI.h / 2 + 22,
} as const;

/**
 * **Yapı menüsünün girmediği kutular** — `BuildMenu`, `M169`.
 *
 * `Hud` sahnesi `Game`'in üstünde koşuyor: menü bu kutulardan birine
 * girerse HUD öğesi menünün düğmesini hem örtüyor hem tıklamasını
 * yutuyor. Liste **sayan liste** — yeni bir kalıcı HUD öğesi buraya
 * yazılmazsa menü ondan kaçmaz; `menuYerlesimi.test.ts` altı haritanın
 * bütün noktalarını bu listeye karşı sınıyor.
 *
 * Dalga telgrafı listede yok: bandı tür sayısıyla 694 px'e uzuyor ve
 * menüyle kesiştiğinde kendini gizliyor (`WaveTelegraph`).
 */
export const MENU_KACINILAN: readonly { readonly ad: string; readonly kutu: Kutu }[] = [
  { ad: 'kart', kutu: kutusu(KART) },
  { ad: 'üst-orta', kutu: UST_ORTA_HUD },
  {
    ad: 'üst-sağ şerit',
    kutu: {
      x0: DURAKLAT_DUGMESI.x - DURAKLAT_DUGMESI.w / 2,
      y0: Math.min(kutusu(HIZ_DUGMESI).y0, kutusu(DURAKLAT_DUGMESI).y0, kutusu(ZORLUK_ROZETI).y0),
      x1: HIZ_DUGMESI.x + HIZ_DUGMESI.w / 2,
      y1: Math.max(kutusu(HIZ_DUGMESI).y1, kutusu(DURAKLAT_DUGMESI).y1, kutusu(ZORLUK_ROZETI).y1),
    },
  },
  { ad: 'ayar', kutu: kutusu(AYAR_DUGMESI) },
  { ad: 'yetenek', kutu: YETENEK_KUTUSU },
  { ad: 'tam ekran', kutu: TAM_EKRAN_KUTUSU },
];

/**
 * Yapı menüsünün yerleşim payları (`BuildMenu`, `util/menuYerlesimi`).
 *
 * `kartusYari` — seçili noktanın altın kartuşu `64 + 16` px (kule
 * görseli + çerçeve); menü onu örtmüyor. `noktaBosluk` kartuşun yarısı
 * + 8: eskiden menü `spot.y - 56`'ya konuyor ve hedefleme satırı
 * noktanın tam üstüne düşüyordu (`M8`).
 */
export const MENU_YERLESIM = {
  kenarPay: 16,
  kartusYari: (64 + 16) / 2,
  noktaBosluk: (64 + 16) / 2 + 8,
} as const;

/**
 * Öğretici balonu (`fx/TutorialHints`, `util/ipucuYerlesimi`) — `M180`'de
 * buraya taşındı ki yerleşim kuralı Phaser'sız sınanabilsin.
 *
 * `ustY` — üst-orta HUD kutusunun altı, yapı menüsüyle **aynı payla**
 * (`kenarPay`). `M168`'den beri `+ 6`'ydı; yerleşim kuralı kaçınılan
 * kutuları `kenarPay` ile şişirdiği için o yer kendi kuralına göre
 * geçersiz sayılırdı. Balon 10 px aşağıda.
 *
 * `adim` — yerleşim taraması. **Ölçülmedi:** kaydırmanın gözle seçilmeyecek
 * kadar ince olduğu bir değer; altı haritanın hepsinde geçerli yer
 * bulunduğu `ipucuYerlesimi.test.ts`'te bağlı.
 */
export const IPUCU_BALONU = {
  w: 480,
  ustY: UST_ORTA_HUD.y1 + MENU_YERLESIM.kenarPay,
  asgariH: 60,
  dikeyPay: 24,
  adim: 8,
} as const;

/**
 * Menülerin oyunda **ölçülmüş** dış boyları — `M169`, Kül Ovası, TR.
 *
 * Düğme genişlikleri sabit (`BuildMenu` `Y03` ölçüleri), yani boy dilden
 * bağımsız; yalnız dal özetleri `wordWrap` ile sarılabiliyor. Ölçüm:
 * menü açıkken `GameScene.acikMenuKutusu`. Yeni bir menü türü ya da
 * satır eklenirse burası yeniden ölçülür — `menuYerlesimi.test.ts`
 * bütün noktaları bu boylarla sınıyor.
 */
export const OLCULMUS_MENU_BOYLARI: readonly { readonly ad: string; readonly w: number; readonly h: number }[] = [
  { ad: 'yapı', w: 491, h: 111 },
  { ad: 'kule (yükselt/sat/hedefleme)', w: 348, h: 151 },
  { ad: 'kule dal seçimi', w: 496, h: 241 },
  { ad: 'kışla', w: 236, h: 76 },
  { ad: 'kışla dal seçimi', w: 496, h: 167 },
  { ad: 'kışla son kademe', w: 132, h: 76 },
];

/**
 * **HUD örtüşme saydamlığı** — `M177`.
 *
 * Kart (altın/can/dalga) sol üstte 216×140 ve üç haritanın girişi onun
 * altından geçiyor (harita 1, 3, 4 — `HudScene` başlık notunda bilinçli
 * istisna); Kül Ovası'nda yolun ilk ~220 px'i kartın arkasında. Düşman
 * kartın arkasındayken kart **saydamlaşıyor**, çıkınca geri geliyor —
 * oyunlarda HUD'un oyun alanını örttüğü yerlerdeki yaygın çözüm.
 *
 * `alfa`: örtüşme sürerken kartın görünürlüğü — sayılar hâlâ seçilsin
 * diye sıfır değil. Kül Ovası'nın açık kumunda büyüteçle karşılaştırıldı:
 * 0,35'te altın sayısı kayboluyordu, **0,5**'te sayılar okunuyor ve
 * arkadaki yol ile düşman da görünüyor. `adim`: kare başına alfa değişimi
 * (yumuşak geçiş, kenarda titremesin). `pay`: düşman kutuya bu kadar
 * yaklaşınca başlıyor.
 */
export const HUD_ORTUSME = { alfa: 0.5, adim: 0.1, pay: 12 } as const;

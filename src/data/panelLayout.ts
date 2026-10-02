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

/** Kule **solda** ise panel buraya. */
export const PANEL_SAG = {
  x: EKRAN_W - PAY - PANEL_W,
  y: EKRAN_H - PAY - PANEL_H,
} as const;

/**
 * Kule **sağda** ise panel buraya.
 *
 * Yetenek düğmelerinin (`28,622 – 170,707`) **üstünde** duruyor: alt
 * kenarı 622'den `PAY` kadar yukarıda bitiyor.
 */
export const PANEL_SOL = {
  x: PAY,
  y: 622 - PAY - PANEL_H,
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
    ? { x: PANEL_SOL.x, y: 622 - PAY - yukseklik }
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
 * Menülerin **girmediği** üst-orta kutu: düğmenin kendisi, üstündeki
 * geri sayım ve altındaki risk satırı (düğme merkezinin `46` px altında,
 * ~18 px yüksek — `HudScene.#createEarlyStartButton`).
 */
export const UST_ORTA_HUD = {
  x0: ERKEN_BASLAT.x - ERKEN_BASLAT.w / 2,
  y0: 0,
  x1: ERKEN_BASLAT.x + ERKEN_BASLAT.w / 2,
  y1: ERKEN_BASLAT.y + 46 + 12,
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

/**
 * Düşman durumu ve hareket stratejisi arayüzleri.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz. Bu ayrım sayesinde hareket mantığı
 * `node` ortamında test edilebiliyor — `Enemy` bir `Phaser.GameObjects`
 * alt sınıfı olduğu için kendisi test edilemez.
 */

import type { Vec2 } from './common';
import type { PathProgress } from './path';

/**
 * Düşman türleri. Kaynak: `GAME-DESIGN.md` §5 tablosu (9 satır).
 *
 * `types/map.ts` içindeydi (`MapDef.enemyRoster` için gerekiyordu);
 * M2'de düşman verisi gelince asıl yerine taşındı.
 */
export type EnemyId =
  | 'goblin'
  | 'orkSavasci'
  | 'zirhliOrk'
  | 'harpi'
  | 'kurtBinicisi'
  | 'saman'
  | 'trol'
  | 'orumcekAna'
  | 'ogreSef'
  /** Bölünmeden çıkar; kadroda ve dalga bütçesinde yer almaz (§5). */
  | 'orumcekYavrusu'
  /** `M12` — yeraltı geçişi yapan düşman. Harita 6'nın tanıttığı mekanik. */
  | 'tunelci';

/**
 * Düşman özel yetenekleri. `GAME-DESIGN.md` §5 "Özellik" sütunu.
 *
 * Ayrık birleşim: her yeteneğin kendi alanları var, ortak "value" yok.
 */
export type EnemyAbility =
  /** Şaman: yakındakilere 8 HP/sn. **Yarıçap dokümanda yok — S37.** */
  | { readonly kind: 'heal'; readonly hps: number; readonly radius: number }
  /** Trol: 6 HP/sn kendini yeniler. */
  | { readonly kind: 'regen'; readonly hps: number }
  /** Örümcek Ana: ölünce 3× yavru. */
  | { readonly kind: 'split'; readonly count: number; readonly childId: EnemyId }
  /**
   * **Susturma** — `M140`, boss'un üçüncü verb'ü (harita 4).
   *
   * Menzilindeki **en yakın** kuleyi `seconds` kadar susturur, sonra
   * `cooldownSeconds` bekler. Susturulmuş kule hedef aramaz, ateş
   * etmez; bekleme sayacı da donar.
   *
   * **Neden yeni bir eksen:** sahadaki bütün verb'ler tahtanın bir
   * varsayımını kırıyor (hedeflenebilirlik, engellenebilirlik, zırh,
   * öldürme sırası, doğum yeri) ama hiçbiri **kulelerin kendisine**
   * dokunmuyordu. Cevabı da aile değil **yerleşim**: tek noktaya
   * yığılmış tahtada bir susturma delik açar, dağıtılmışta açmaz.
   * Oyun bugüne kadar kapsamayı ölçüyordu, yedekliliği hiç sınamadı.
   */
  | {
      readonly kind: 'silence';
      /** Kule arama yarıçapı, px. Karesel karşılaştırılır (k.9). */
      readonly radius: number;
      /** Kulenin susturulduğu süre, sn. */
      readonly seconds: number;
      /** İki susturma arası bekleme, sn. */
      readonly cooldownSeconds: number;
    }
  /**
   * **İkinci evre** — `M10-T03`, harita 5 (Kadim Harabe).
   *
   * Canı `hpRatio`'nun altına düşünce hızlanıyor. Boss dövüşünü tek
   * uzun bir HP çubuğundan **iki evreli** bir şeye çeviriyor: ilk yarı
   * "yetişiyor muyum", ikinci yarı "yetişemiyorum, şimdi ne yapacağım".
   *
   * Hız seçildi çünkü **yeni sanat gerektirmiyor ve gözle görünüyor**:
   * boss'un adımı bir anda açılıyor, oyuncu bunu can çubuğuna bakmadan
   * fark ediyor (TIER 1 kural 6 — bilgi renge değil harekete bağlı).
   *
   * Durum tutulmuyor: her karede can oranından **türetiliyor**, yani
   * idempotent. Ayrı bir "öfkelendi mi" bayrağı olsaydı havuza dönen
   * düşmanda sıfırlanması gerekirdi (kural 3'ün beşinci tuzağı).
   */
  | {
      readonly kind: 'enrage';
      readonly hpRatio: number;
      readonly speedMultiplier: number;
    }
  /**
   * **Yeraltı geçişi** — `M12` Faz 1, harita 6'nın tanıttığı mekanik.
   *
   * Düşman yolun `fromFraction`..`toFraction` aralığında **hedeflenemez**.
   * Görünmez değil: saydamlaşıyor ve yürümeye devam ediyor, ama hiçbir
   * kule onu hedef olarak seçemiyor.
   *
   * ## Neden bu verb
   *
   * Bugünkü yeteneklerin hepsi **dayanıklılık** ekseninde (iyileştirme,
   * yenilenme, bölünme, kalkan, ikinci evre). Hiçbiri oyuncunun **yer**
   * kararına dokunmuyor — oysa ölçüm yerleştirmenin oyunun en çok fark
   * yaratan kararı olduğunu söylüyor (aynı kuleler rastgele noktalara
   * konunca can kaybı 5'ten 9-14'e çıkıyor). Gömülü aralık, "bütün
   * kuleleri en yüksek kapsamalı iki noktaya yığ" cevabını cezalandırıyor.
   *
   * ## Dokunulmaz DEĞİL, hedeflenemez
   *
   * Patlama ve yanma gömülüye de değiyor — kural yalnız **hedef
   * seçimini** kapatıyor. Bu bilerek: dokunulmazlık oyuncuya "bekle ve
   * izle" derdi; hedeflenemezlik ise bir **cevap** bırakıyor (alan
   * hasarı, önceden yakılmış yanma, ve gömülü aralığın dışını kapsayan
   * yerleşim).
   *
   * Durum tutulmuyor — `enrage` gibi her karede `pathFraction`'dan
   * **türetiliyor**, yani havuza dönen düşmanda sıfırlanacak bir bayrak
   * doğmuyor (TIER 1 kural 3).
   */
  /**
   * **Çağırma** — `M13`, boss'un ikinci verb'ü.
   *
   * Boss canının her `hpStep` oranını kaybettiğinde `count` tane
   * `childId` doğuruyor. `hpStep = 0,25` → %75, %50 ve %25'te üç kez.
   *
   * ## Neden cana bağlı, zamana değil
   *
   * Zamanlayıcı iki tuzak açardı: `GameClock` ölçeklemesi (TIER 1 kural
   * 8) ve havuza dönen düşmanda sıfırlanmayan sayaç (kural 3 — bu
   * projede beş kez yaşanmış hata sınıfı). Cana bağlı eşik `enrage`'in
   * deseni: durum **türetiliyor**, yalnız "kaç kez çağırdım" bilgisi
   * tek bir tam sayıda (`EnemyState.summonsDone`) duruyor ve sıfırlama
   * tek satır.
   *
   * Yan fayda: oyuncu boss'u her dilimlediğinde ekrana yandaş geliyor —
   * olay **hasarın kendisine** bağlı, yani okunur.
   */
  | {
      readonly kind: 'summon';
      readonly childId: EnemyId;
      readonly count: number;
      /** Canının bu oranı her düştüğünde çağırıyor. */
      readonly hpStep: number;
    }
  | {
      readonly kind: 'burrow';
      /** Yolun bu oranından itibaren gömülü. `0` = doğumdan itibaren. */
      readonly fromFraction: number;
      /** Bu orandan sonra çıkıyor. `1` = kaleye kadar. */
      readonly toFraction: number;
    };

/**
 * `GAME-DESIGN.md` §3: iki hasar tipi, iki savunma tipi. Kule
 * çeşitliliğinin **tek** kaynağı bu.
 *
 * `true` yalnız yeteneklerde — hiçbir şeyle azalmaz.
 */
export type DamageType = 'physical' | 'magic' | 'true';

/** Düşman tanımı. Kaynak: `GAME-DESIGN.md` §5 tablosu, `DATA-SCHEMAS.md`. */
export interface EnemyDef {
  readonly id: EnemyId;
  /** **Temel** can; harita `hpMultiplier` ile çarpılır (§9). */
  readonly hp: number;
  /** Yol üstünde ilerleme hızı. Birim: px/sn. */
  readonly speed: number;
  /** Fiziksel hasardan **sabit miktar** düşer (§3). */
  readonly armor: number;
  /** Büyü hasarını **yüzde** azaltır, 0..1 (§3). */
  readonly magicResist: number;
  /** **Temel** öldürme altını; harita `goldMultiplier` ile çarpılır (§9). */
  readonly gold: number;
  /** Dalga bütçesi maliyeti. Birim: puan (§7). */
  readonly points: number;
  /** Sızdığında düşen can. §5: normal 1, Trol/Örümcek Ana 2, boss 10. */
  readonly leakDamage: number;
  /** Uçar mı — yolu takip etmez, engellenemez (§5). */
  readonly flying: boolean;
  readonly ability?: EnemyAbility;
  /**
   * Buz kalkanı — `M10-T03`, yalnız harita 4 (Kar Geçidi).
   *
   * Cana inmeden önce emilen **toplam** hasar. Verilmezse kalkan yok.
   * Değeri `getEnemyForMap` haritaya göre iliştiriyor; temel düşman
   * tanımları (§5 tablosu) değişmiyor.
   */
  readonly shield?: number;
}

/**
 * Hareketin ihtiyaç duyduğu düşman durumu.
 *
 * `Enemy` bunu uygular ama testler düz bir nesneyle de uygulayabilir —
 * `Mover`'lar `Enemy` sınıfını değil bu şekli tanır.
 */
export interface EnemyState {
  /**
   * Bu düşmanın **kimliği** — havuzdan çıkarken atanır, dönerken `null`'lanır.
   *
   * Zırh, direnç, uçma, altın, puan hepsi buradan okunuyor. M1'de yalnız
   * `hp`/`speed` sayı olarak taşınıyordu; M2'de hedefleme uçma bilgisini,
   * `applyDamage` zırh/direnci istedi ve ham sayı taşımak sürdürülemez oldu.
   */
  def: EnemyDef | null;
  hp: number;
  maxHp: number;
  /** Birim: px/sn. Harita çarpanı uygulanmış hâli. */
  speed: number;
  /**
   * Yavaşlatma çarpanı, 0..1. Efekt sistemi yazıyor, `Mover` okuyor.
   *
   * Ayrı alan olmasının sebebi sadelik: `Mover` etkiler modülüne
   * bağlansaydı her hareket testi efekt sistemini de ayağa kaldırmak
   * zorunda kalırdı. Tek sayı taşımak yeterli.
   */
  speedFactor: number;
  progress: PathProgress;
  /**
   * Kaç kez yandaş çağırdı (`M13` — `summon`).
   *
   * `enrage`/`burrow` gibi tamamen türetilemiyor: "eşiği geçtim mi"
   * bilgisi geçmişe bağlı. Tek tam sayı ve `resetEnemyState` onu `0`'a
   * çekiyor — havuz sözleşmesi (TIER 1 kural 3) tek satırda.
   */
  summonsDone: number;
  /**
   * Yolun **kat edilen** oranı, 0..1. Doğumda `0`, kalede `1`.
   *
   * `Mover.step` yazıyor — yolun toplam uzunluğunu yalnız o biliyor.
   * `remainingDistance` tek başına oran vermiyor (harita başına toplam
   * uzunluk farklı) ve düşman tanımı haritalar arasında paylaşılıyor,
   * yani piksel cinsinden bir aralık taşınamazdı.
   *
   * Kullanan: yeraltı geçişi (`EnemyAbility` `burrow`).
   */
  pathFraction: number;
  /**
   * Kışla askeri tarafından engellenmiş mi (`DEPENDENCIES.md` §7).
   *
   * **Alan M1'de tanımlanıyor, kullanımı M5'te.** `null` değilse `step`
   * ilerlemeyi atlar. Sonradan eklemek `PathSystem`'e ve her `Mover`'a
   * geri dönmek demekti; şimdi bir satır, sonra üç dosya.
   */
  blockedBy: object | null;
  alive: boolean;
  /**
   * Kalan kalkan — `M10-T03`, harita 4 (Kar Geçidi).
   *
   * Cana **inmeden önce** emilen düz hasar. `def.shield` doğuşta buraya
   * kopyalanıyor ve `kalkandanGecir()` tüketiyor. Zırhtan farkı:
   * zırh her vuruştan sabit miktar düşürüyor (yani çok sayıda küçük
   * vuruşu cezalandırıyor), kalkan **toplam** bir havuz (yani tek büyük
   * vuruşla da çok sayıda küçükle de aynı hızda eriyor, ama erimeden
   * cana hiç hasar geçmiyor).
   *
   * TIER 1 kural 3: havuza dönen düşmanda sıfırlanıyor
   * (`resetEnemyState`) — sıfırlanmazsa bir sonraki düşman ölü bir
   * kalkanla doğar ve bu **çökme değil yanlış denge** olarak görünür.
   */
  shieldLeft: number;
  /**
   * Susturma yeteneğinin bir sonraki kullanıma kalan süresi, sn.
   *
   * `summonsDone` ile aynı gerekçe: zamana bağlı bilgi candan
   * türetilemiyor, o yüzden **tek sayı** saklanıyor ve
   * `resetEnemyState` onu sıfırlıyor (TIER 1 kural 3). Doğumda `0` —
   * yani boss menzile girer girmez ilk susturmayı yapabiliyor.
   */
  susturmaBekleme: number;
}

/**
 * Hareket stratejisi. `Enemy`'den **ayrık** (`DEPENDENCIES.md` §2).
 *
 * `PathMover` M1'de, `LineMover` (uçanlar) M4'te aynı arayüzü uygular.
 * Ayrılmasaydı M4'te entity'yi yarmak gerekirdi.
 */
/**
 * `SpawnSystem`'in bir düşmandan beklediği yüzey.
 *
 * `Enemy` sınıfı değil **bu şekil** talep ediliyor: `SpawnSystem` `systems/`
 * altında ve `entities/Enemy`'yi çalışma zamanında içeri alsaydı TIER 1
 * kural 11'i delerdi. Testler bu arayüzü uygulayan düz bir nesne kullanıyor.
 */
export interface SpawnableEnemy extends EnemyState {
  /** @param hpMultiplier Harita çarpanı (`MapDef.hpMultiplier`, §9). */
  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void;
  step(scaledDelta: number): void;
  reachedEnd(): boolean;
}

/**
 * `selectTarget`'ın bir düşmandan gördüğü yüzey.
 *
 * `Enemy` sınıfı değil bu şekil talep ediliyor (TIER 1 kural 11) — hedefleme
 * `systems/` altında ve `node`'da test ediliyor. `x`/`y` Phaser'ın
 * `GameObject`'inden geliyor ama burada yalnız iki sayı.
 */
export interface Targetable {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  /** Kaleye kalan yol. `first`/`last` buna bakar (`GAME-DESIGN.md` §4.5). */
  readonly remainingDistance: number;
  readonly def: EnemyDef | null;
  /**
   * Süreli kule etkileri — `M10-T05`.
   *
   * Hedefleme bunu kullanmıyor; **sinerji** kullanıyor
   * (`combat.yavaslatmaSinerjisi`). Arayüze eklenmesinin sebebi
   * `ProjectileSystem`'in çarpanı **kendi içinde** hesaplayabilmesi:
   * çağırana bırakılsaydı biri unutabilirdi ve bu oturumda oyun ile
   * simülasyonun ayrı şey çalıştırdığı üç kez bulundu (S80, S81, S86).
   * Tip zorunluluğu o riski ortadan kaldırıyor.
   */
  readonly effects: { readonly slowSeconds: number };
  /**
   * Yolun kat edilen oranı, 0..1 — yeraltı geçişi bunu okuyor
   * (`TargetingSystem.gomuluMu`).
   *
   * `EnemyState.pathFraction` ile aynı sayı; arayüzde olmasının sebebi
   * S80/S81/S86/S92'nin dersi: kural **tek** bir yerde yaşasın ve hem
   * oyun hem simülasyon aynı fonksiyonu çağırsın. Alanı arayüza koymak
   * derleyiciyi bütün uygulayıcıları saymaya zorluyor.
   */
  readonly pathFraction: number;
}

export interface Mover {
  /** @param scaledDelta `GameClock.scaledDelta`, birim ms (TIER 1 kural 8). */
  step(e: EnemyState, scaledDelta: number): void;
  /** Hedeflemenin (`first`/`last`) bakacağı sayı. Birim: px. */
  remainingDistance(e: EnemyState): number;
  /** Dünya koordinatı — çizim bunu kullanır. */
  positionAt(e: EnemyState): Vec2;
  /** Yolun/hattın sonuna vardı mı (kale). */
  reachedEnd(e: EnemyState): boolean;
  /** Doğum anındaki ilerleme durumu. */
  spawnProgress(): PathProgress;
}

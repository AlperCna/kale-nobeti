/**
 * Referans tahtalar — denge sağlamalarının girdisi.
 *
 * TIER 1 kural 1: sayı burada, testte veya sistemde değil.
 *
 * **Bunlar oyunun çalıştırdığı veri değil**, dengeyi *sınayan* veri. Bir
 * "referans tahta", 8 yapı noktasının belirli bir kule dizilimiyle dolu
 * hâlini temsil eden toplam DPS'tir; Kısıt A tavanı buradan çıkar
 * (`GAME-DESIGN.md` §6, `research/01-denge-matematigi.md` §4).
 *
 * **Kaynak ve geçicilik:** aşağıdaki DPS'ler `research/01` §4-§5'te elle
 * hesaplanmış değerlerdir. `M3-T07` bunları `towers.ts` + `enemies.ts`
 * üzerinden **algoritmayla üretecek** (S25 kararı) ve bu dosya o zaman
 * türetilmiş hâline geçecek. Şimdilik elle taşınıyorlar ki M1'de ölçülen
 * kapsama sayısı boşa gitmesin — sağlamalar bugünden test olarak koşuyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

/** Bir düşmana karşı belirli bir tahtanın toplam etkin DPS'i. */
export interface ReferenceBoard {
  readonly id: string;
  /** Hangi düşmana karşı hesaplandı — zırh/direnç etkin DPS'i değiştiriyor. */
  readonly againstEnemyId: string;
  /** Birim: hasar/sn. */
  readonly totalDps: number;
  readonly source: string;
}

/**
 * Harita 1'in gerçekçi Tier 2 tahtası, **boss'a karşı** etkin.
 *
 * `research/01` §4: Büyü T2 ×3 (13.5) + Top T2 ×3 (13.2) + Okçu T2 ×2 (1.95).
 * Okçunun katkısı neredeyse sıfır çünkü boss zırhı 10, okçu ham hasarı 10 →
 * taban %15'e düşüyor.
 */
export const T2_BOARD_VS_BOSS: ReferenceBoard = {
  id: 't2-harita1',
  againstEnemyId: 'ogreSef',
  totalDps: 84.0,
  source: 'research/01-denge-matematigi.md §4',
};

/**
 * "Her şey Tier 3 + yetenekler" tavan senaryosu.
 *
 * `research/01` §4'ün manşet bulgusu bu tabloya asılı: 8 noktanın hepsi T3
 * olsa, hepsi boss'a optimal seçilse ve Meteor iki kez kullanılsa bile
 * boss 2200'ü öldürmek mümkün mü?
 *
 * **Menzil başına kapsama artık ölçülüyor** — `2 × menzil` varsayımı değil.
 * `referenceBoards.test.ts` ikisinin ne kadar ayrıştığını da sınıyor.
 */
export interface T3CeilingEntry {
  readonly id: string;
  readonly count: number;
  /** Boss'a etkin DPS (zırh 10, büyü direnci %25 uygulanmış). Birim: hasar/sn. */
  readonly dpsVsBoss: number;
  /** Menzil yarıçapı. Birim: px. */
  readonly range: number;
}

export const T3_CEILING_BOARD: readonly T3CeilingEntry[] = [
  { id: 'havan', count: 3, dpsVsBoss: 17.1, range: 230 },
  { id: 'yildirim', count: 3, dpsVsBoss: 15.75, range: 170 },
  { id: 'keskinNisanci', count: 2, dpsVsBoss: 9.6, range: 260 },
];

/** Meteor ×2, 180 gerçek hasar. `research/01` §4. Birim: hasar. */
export const ABILITY_CEILING_DAMAGE = 360;

/** `GAME-DESIGN.md` §5'te indirilmeden önceki boss HP'si. Manşet bulgunun konusu. */
export const BOSS_HP_BEFORE_NERF = 2200;

/**
 * Boss'un Kısıt A tavanına oranı için hedef band.
 * `research/01` §4: "zorlayıcı ama geçilebilir olması için tavanın %75-85'i".
 */
export const BOSS_CEILING_BAND = { min: 0.75, max: 0.85 } as const;

/**
 * M1'de ölçülen kapsamayla Kısıt A sağlaması için düşman girdileri.
 *
 * `GAME-DESIGN.md` §5 tablosundan HP ve hız; `research/01` §5'ten yaklaşık
 * etkin ΣDPS (`~` işaretli, çünkü zırh/dirence göre kule kule değişiyor).
 *
 * **M3'te düşecek.** `enemies.ts` + `towers.ts` gelince ΣDPS uydurulmayacak,
 * hesaplanacak.
 */
export interface EnemyBalanceProbe {
  readonly id: string;
  readonly hp: number;
  /** Birim: px/sn. */
  readonly speed: number;
  /** Yaklaşık etkin ΣDPS, T2 tahtası. Birim: hasar/sn. */
  readonly approxDpsAgainst: number;
  /** Menzilde geçen sürede kazanılan ek etkin HP (yenilenme, yavru). */
  readonly extraEffectiveHp?: (secondsInRange: number) => number;
}

export const M1_ENEMY_PROBES: readonly EnemyBalanceProbe[] = [
  { id: 'goblin', hp: 45, speed: 60, approxDpsAgainst: 150 },
  { id: 'orkSavasci', hp: 110, speed: 45, approxDpsAgainst: 135 },
  { id: 'zirhliOrk', hp: 160, speed: 38, approxDpsAgainst: 95 },
  { id: 'kurtBinicisi', hp: 60, speed: 110, approxDpsAgainst: 145 },
  { id: 'saman', hp: 130, speed: 42, approxDpsAgainst: 110 },
  { id: 'trol', hp: 400, speed: 30, approxDpsAgainst: 120, extraEffectiveHp: (s) => 6 * s },
  { id: 'orumcekAna', hp: 150, speed: 50, approxDpsAgainst: 130, extraEffectiveHp: () => 90 },
  { id: 'ogreSef', hp: 700, speed: 28, approxDpsAgainst: T2_BOARD_VS_BOSS.totalDps },
];

/**
 * Kısıt A tavanı: bir düşmana verilebilecek toplam hasar.
 *
 * `research/01` §2'nin merkezi bulgusu — bu değer kule **yerleşiminden
 * bağımsız**, çünkü hangi noktaya kurulursa kurulsun düşman o kulenin
 * menzilinde `kapsama / hız` kadar kalıyor.
 */
export function ceilingA(totalDps: number, coveredPx: number, speedPxPerSec: number): number {
  if (speedPxPerSec <= 0) return 0;
  return (totalDps * coveredPx) / speedPxPerSec;
}

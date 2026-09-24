/**
 * Kule ateş döngüsü. `M2-T05` (yerleştirme) + `M2-T07` (ateş).
 *
 * **Kuleler havuzlanmaz.** TIER 1 kural 3 mermi/düşman/parçacık/hasar sayısı
 * için; kule sayısı sabit ve az (harita başına 8-12), her biri oyun boyunca
 * yaşıyor. Havuzlamak sıfırlanacak alan sayısını artırıp hiçbir şey
 * kazandırmazdı.
 *
 * TIER 1 kural 11: `entities/Tower`'ı tanımaz — `TowerRuntime` şeklini tanır.
 * TIER 1 kural 8: zaman yalnız `scaledDelta` üzerinden.
 * TIER 1 kural 9: menzil karesel, ve **kule ateşe hazır değilken hedef aramaz.**
 */

import type { Targetable } from '../types/enemy';
import type { TowerRuntime, TowerTier } from '../types/tower';
import type { EventBus } from './EventBus';
import { tierAt } from '../data/towers';
import { isTargetStillValid, selectTarget } from './TargetingSystem';

const MS_TO_S = 1 / 1000;

/**
 * Ateş anında çağrılır. Mermi üretimi `ProjectileSystem`'in işi.
 *
 * **Kule tipi genel** (`M8-T08`): sistem hâlâ yalnız `TowerRuntime`
 * şeklini biliyor (k.11) ama çağıran kendi somut tipini geri alıyor.
 * `GameScene` ateş anında `Tower.recoil()` çağırmak istedi ve tek
 * seçenek ya `TowerRuntime`'a görsel bir metot eklemek (kural 11'i
 * bulanıklaştırırdı) ya da tip parametresiydi. `ProjectileSystem<E, T>`
 * ve `WaveManager<T>` zaten aynı deseni kullanıyor.
 */
export type FireHandler<T extends TowerRuntime = TowerRuntime> = (
  tower: T,
  tier: TowerTier,
  target: Targetable,
) => void;

export function currentTier(t: TowerRuntime): TowerTier {
  return tierAt(t.def, t.tierIndex);
}

export class TowerSystem<T extends TowerRuntime = TowerRuntime> {
  readonly #towers: T[] = [];
  /**
   * Kaç kez susturma uygulandı — `M140`, ölçüm ve test için.
   *
   * Dengeye etkisi olmayan bir mekanik dekordur; bu sayaç "gerçekten
   * oluyor mu" sorusunu iddia değil **ölçüm** yapıyor.
   */
  #susturmaSayisi = 0;

  constructor(
    private readonly onFire: FireHandler<T>,
    private readonly bus?: EventBus,
  ) {}

  get towers(): readonly T[] {
    return this.#towers;
  }

  /** Uygulanan susturma sayısı — `M140`. */
  get susturmaSayisi(): number {
    return this.#susturmaSayisi;
  }

  /**
   * Kuleyi listeye alır ve `tower:placed` yayar.
   *
   * Yapı noktasının **dolu olup olmadığını burada kontrol etmiyoruz** —
   * o `SpotOccupancy`'nin işi ve çağıran taraf onu zaten sormak zorunda
   * (aynı defteri iki yerde tutmak sessizce ayrışır).
   */
  add(tower: T): void {
    this.#towers.push(tower);
    this.bus?.emit('tower:placed', { spotIndex: tower.spotIndex });
  }

  remove(spotIndex: number): void {
    const i = this.#towers.findIndex((t) => t.spotIndex === spotIndex);
    if (i >= 0) this.#towers.splice(i, 1);
  }

  /**
   * `(x, y)` çevresindeki **en yakın** kuleyi `saniye` kadar susturur —
   * `M140`, düşmanın `silence` yeteneğinin tek uygulama adresi.
   *
   * **Tek kule, en yakın.** Yarıçaptaki hepsini susturmak boss'u tek
   * başına bir tahta silgisine çevirirdi; "menzildeki rastgele biri"
   * ise okunmaz olurdu. En yakın olan hem tahmin edilebilir hem de
   * oyuncunun yerleşim kararını anlamlı kılıyor: darboğaza yığarsan
   * susturulan kule hep aynı bölgeden çıkar.
   *
   * Zaten susturulmuş kule **yeniden hedeflenmiyor** (`susturmaKalan`
   * sıfırdan büyükse aday değil); yoksa boss süreyi sürekli tazeleyip
   * tek bir kuleyi kalıcı olarak kapatırdı.
   *
   * TIER 1 kural 9: mesafe karesel.
   *
   * @returns Susturulan kule, yoksa `null` (çağıran ölçüm/olay için).
   */
  sustur(x: number, y: number, radius: number, saniye: number): T | null {
    const rKare = radius * radius;
    let enYakin: T | null = null;
    let enKucukKare = Infinity;
    for (const t of this.#towers) {
      if (t.susturmaKalan > 0) continue;
      const dx = t.x - x;
      const dy = t.y - y;
      const kare = dx * dx + dy * dy;
      if (kare > rKare || kare >= enKucukKare) continue;
      enKucukKare = kare;
      enYakin = t;
    }
    if (enYakin === null) return null;
    this.#susturmaSayisi++;
    enYakin.susturmaKalan = saniye;
    enYakin.target = null;
    return enYakin;
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms. */
  update(scaledDelta: number, enemies: readonly Targetable[]): void {
    const saniye = scaledDelta * MS_TO_S;

    for (const t of this.#towers) {
      /**
       * **Susturma** — `M140`. Kule kapalı: hedef aramıyor, ateş etmiyor
       * ve `cooldownLeft` **donuyor**.
       *
       * Sayacın donması bilinçli. Sayaç işlemeye devam etseydi susturma
       * bitince kule birikmiş atışı anında boşaltır ve kaybettiği zamanı
       * geri alırdı — yani etki yalnız *görsel* olurdu. Aşağıdaki
       * `+=` yorumunun tarif ettiği "birikmiş atışları peş peşe boşaltma"
       * sorununun aynısı, bu kez kasıtlı olarak yaratılmış hâli.
       *
       * Hedef referansı **bırakılıyor**: susturma bitince kule yeniden
       * seçiyor. Tutulsaydı ölü ya da menzilden çıkmış bir hedefe
       * dönerdi — `isTargetStillValid` zaten yakalardı ama bir kare
       * boşa giderdi.
       */
      if (t.susturmaKalan > 0) {
        t.susturmaKalan -= saniye;
        if (t.susturmaKalan <= 0) t.susturmaKalan = 0;
        t.target = null;
        continue;
      }

      t.cooldownLeft -= saniye;

      // TIER 1 kural 9: hazır değilse hedef ARAMA. Bu tek satır hedef arama
      // maliyetini ~10 kat düşürüyor (`research/02` §8) — 8 kule × 40 düşman
      // her karede 320 mesafe hesabı demekti, artık yalnız ateş karesinde.
      if (t.cooldownLeft > 0) continue;

      const tier = currentTier(t);
      const kuleKapsami = {
        x: t.x,
        y: t.y,
        rangeSq: tier.range * tier.range,
        airMultiplier: tier.airMultiplier,
      };

      // Mevcut hedef hâlâ geçerliyse yeniden arama yok.
      if (!isTargetStillValid(t.target, kuleKapsami)) {
        t.target = selectTarget(t.targetMode, enemies, kuleKapsami);
      }
      if (t.target === null) continue;

      this.onFire(t, tier, t.target);

      // `=` değil `+=`: kalan kesir korunuyor, yani uzun vadede atış hızı
      // tam olarak `fireRate`. Ama sonuç negatifse sıfırlanıyor — aksi
      // hâlde bir takılma sonrası kule biriken atışları peş peşe boşaltırdı.
      // Kayıp yalnız kare süresi atış periyodunu aşarsa oluşur; en yavaş
      // kule Top T1 (periyot 2 sn) ve kare hiç o kadar uzun olmuyor.
      const periyot = tier.fireRate > 0 ? 1 / tier.fireRate : Infinity;
      t.cooldownLeft += periyot;
      if (t.cooldownLeft < 0) t.cooldownLeft = 0;
    }
  }
}

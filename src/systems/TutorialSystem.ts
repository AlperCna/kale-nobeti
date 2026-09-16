import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';
import type { EventBus } from './EventBus';

/**
 * `Y09` — öğretici / ilk oyun yönlendirmesi. Öneri (a)'nın en küçük
 * hâli: **yalnız iki ipucu**, ölçümle kanıtlanmış (S65, S69) biçimde
 * oyunun sonucunu değiştiren ve kendiliğinden keşfedilmesi
 * beklenemeyecek iki mekanik için.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz — `node`'da test edilir. Sunum
 * (parşömen balon) `fx/TutorialHints.ts`'te; bu dosya yalnız **hangi
 * ipucu, ne zaman, görüldü mü** kararını veriyor ve `onShow`
 * callback'iyle çağırıyor (`WaveManager`'ın `onLeak`'iyle aynı desen).
 *
 * ## Kalıcılık — `SaveData`'nın versiyonuna DOKUNMUYOR
 *
 * Görülen ipuçları `SaveSystem`'in `progress` alanından **ayrı**, kendi
 * `tutorial` alanında tutuluyor (`Settings`'in `settings` alanıyla aynı
 * desen — `LocalStore`'un tek anahtarlı JSON'ı birden çok alan
 * paylaşıyor). Bu, görevin kendi sorduğu "SaveData şema değişikliği,
 * eski kayıtlar silinsin mi" sorusunu **tamamen ortadan kaldırıyor**:
 * `progress.version` hiç değişmiyor, var olan yıldız kayıtları
 * etkilenmiyor. Alan eksikse (eski kayıt) `seenHints` boş listeye
 * düşüyor — ipuçları dönen bir oyuncuya bir kez daha görünür, veri
 * kaybı yok.
 */

/**
 * `targetModes` ve `flyers` oyuncu geri bildirimiyle eklendi
 * (2026-09-14): "First/Last/Strong ne demek belli değil", "menziller
 * (kesikli yaylar) ne ifade ediyor net değil". Y09'un öngördüğü gibi her
 * biri bir anahtar + bir tetik.
 */
export type HintId =
  | 'earlyStart'
  | 'dragRally'
  | 'targetModes'
  | 'flyers'
  | 'shield'
  | 'burrow'
  | 'heal';

const HINT_IDS: readonly HintId[] = [
  'earlyStart',
  'dragRally',
  'targetModes',
  'flyers',
  'shield',
  'burrow',
  'heal',
];

function gecerliHint(deger: unknown): deger is HintId {
  return typeof deger === 'string' && (HINT_IDS as readonly string[]).includes(deger);
}

export class TutorialSystem {
  readonly #store: KeyValueStore;
  readonly #seen: Set<HintId>;
  readonly #onShow: (hint: HintId) => void;
  #enabled: boolean;

  constructor(
    store: KeyValueStore,
    enabled: boolean,
    onShow: (hint: HintId) => void,
    bus: EventBus,
  ) {
    this.#store = store;
    this.#enabled = enabled;
    this.#onShow = onShow;
    this.#seen = new Set(this.#oku());

    bus.on('barracks:placed', () => this.#tetikle('dragRally'));
    bus.on('targeting:opened', () => this.#tetikle('targetModes'));
    bus.on('wave:flyers', () => this.#tetikle('flyers'));
    /**
     * `M10` — buz kalkanı (harita 4). `wave:flyers` ile **birebir aynı
     * desen**: sahne koşulu görüp olayı yayıyor, burası "ilk kez mi"
     * kararını veriyor.
     *
     * Kalkan `Y09`'un ölçütünü karşılıyor: sonucu değiştiriyor (erimeden
     * cana hiç hasar geçmiyor) ve **kendiliğinden keşfedilemiyor** —
     * oyuncu yalnız "bu ork neden ölmüyor" diye düşünür.
     */
    bus.on('enemy:shielded', () => this.#tetikle('shield'));
    /**
     * `M15` — yeraltı geçişi (`M12`, harita 6). Kalkanla **aynı desen ve
     * aynı ölçüt**: sonucu değiştiriyor (o aralıkta hiçbir kule onu
     * hedef alamıyor) ve kendiliğinden keşfedilemiyor — oyuncu yalnız
     * "kulelerim neden ateş etmiyor" diye düşünür.
     *
     * **Çağırma (`M13`) için ipucu YOK, bilerek.** `Y09`'un ölçütü iki
     * şartlı ve çağırma ikincisini karşılamıyor: olay **görünür**
     * (ekrana yandaş geliyor) ve dalga telgrafı zaten "yandaş çağırır"
     * diyor (S106). Her mekaniğe bir balon açmak öğreticiyi gürültüye
     * çevirirdi; bu sistemin yazılı hâli "yalnız gereken kadar".
     */
    bus.on('enemy:burrowed', () => this.#tetikle('burrow'));
    /**
     * `M30` — Şaman iyileştirmesi. `Y09`'un iki şartı da tutuyor:
     * **sonucu değiştiriyor** (halkadaki herkes saniyede 8 HP geri
     * alıyor; karşı hamle "önce Şamanı düşür") ve **kendiliğinden
     * keşfedilemiyor** — `M30`'un halkası soruyu *sorduruyor* ama
     * cevabını vermiyor: oyuncu bir çember görüyor, onun iyileştirme
     * olduğunu ve kaynağı öldürmenin durdurduğunu okuyamıyor.
     *
     * Kalkanla aynı yapı: önce görsel, sonra ilk görüşte bir cümle.
     * Çağırmanın ipucu yok çünkü o **görünür** (yandaş ekrana geliyor);
     * iyileştirme görünmüyordu, `M30`'a kadar hiçbir kanalı yoktu.
     */
    bus.on('enemy:healing', () => this.#tetikle('heal'));
  }

  /** `GameScene.create()`'in sonunda **bir kez** — ilk hazırlık aşaması için. */
  start(): void {
    this.#tetikle('earlyStart');
  }

  /** Ayarlar panelindeki "İpuçları" anahtarı — kapalıyken hiç tetiklenmez. */
  setEnabled(enabled: boolean): void {
    this.#enabled = enabled;
  }

  /** Test kancası — bir ipucunun daha önce gösterilip gösterilmediği. */
  hasSeen(hint: HintId): boolean {
    return this.#seen.has(hint);
  }

  #tetikle(hint: HintId): void {
    if (!this.#enabled) return;
    if (this.#seen.has(hint)) return;
    this.#seen.add(hint);
    this.#yaz();
    this.#onShow(hint);
  }

  #oku(): HintId[] {
    const ham = this.#store.get(SAVE_KEY);
    if (ham === null) return [];
    try {
      const nesne = JSON.parse(ham) as { tutorial?: { seenHints?: unknown[] } };
      const liste = nesne.tutorial?.seenHints ?? [];
      return liste.filter(gecerliHint);
    } catch {
      // Bozuk kayıt oyunu çökertmiyor — hiç ipucu görülmemiş sayılır.
      return [];
    }
  }

  #yaz(): void {
    // `Settings` aynı anahtarı paylaşıyor; mevcut alanlar korunuyor.
    let mevcut: Record<string, unknown> = {};
    const ham = this.#store.get(SAVE_KEY);
    if (ham !== null) {
      try {
        const nesne: unknown = JSON.parse(ham);
        if (typeof nesne === 'object' && nesne !== null) mevcut = nesne as Record<string, unknown>;
      } catch {
        mevcut = {};
      }
    }
    mevcut['tutorial'] = { seenHints: [...this.#seen] };
    this.#store.set(SAVE_KEY, JSON.stringify(mevcut));
  }
}

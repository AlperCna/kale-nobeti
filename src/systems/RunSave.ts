/**
 * Tur ortası kayıt — `M10-T02`.
 *
 * ## Neden var: oyunun birimi, portalın oturumundan uzun
 *
 * Poki'nin 2026 raporu: web oyuncusu oturumda **11–20 dakika** kalıyor ve
 * o sürede **2–3 oyun** deniyor; **%37'si günde birden çok kez** giriyor.
 * Bizim bir haritamız `ROADMAP`'in kendi hesabıyla **~13 dakika**. Yani
 * bize düşen paya bir harita sığmıyor.
 *
 * Bu dosyadan önce `SaveSystem` yalnız **yıldızı** tutuyordu: 8. dalgada
 * sekmesini kapatan oyuncu sıfıra dönüyordu ve "günde birden çok kez
 * giren %37" bizde karşılıksızdı — geri dönenin döneceği bir yer yoktu.
 * Poki'nin gereksinim sayfası da bunu ayrıca istiyor: *"İlerlemeyi uygun
 * yerlerde kaydet."*
 *
 * ## Neden yalnız dalga arasında
 *
 * Kayıt anı **hazırlık aşaması** — turun tek doğal sınırı. Dalga
 * ortasında kaydetmek sahadaki her düşmanın konumunu, canını, etkilerini
 * (yanma/yavaşlama kalan süreleri), her merminin uçuş durumunu ve asker
 * konumlarını serileştirmek demekti; hem bu işin birkaç katı hem de
 * havuzlanmış nesnelerin (TIER 1 kural 3) durumunu ikinci bir yerde
 * tutmak demek. Dalga sınırında saha **boş** ve durum bir avuç sayıya
 * iniyor.
 *
 * Bedeli yazılı olsun: dalga 7'nin ortasında çıkan oyuncu dalga 7'nin
 * **başına** dönüyor, ortasına değil. Kaybedilen en çok bir dalga.
 *
 * ## `SaveData` sürümü ARTMIYOR
 *
 * Tur, paylaşılan JSON'da kendi `run` alanında duruyor —
 * `TutorialSystem`'in `tutorial` alanı ve `Settings`'in `settings` alanı
 * için kullandığı desenin aynısı. `progress.version` hiç değişmiyor,
 * yani var olan yıldız kayıtları etkilenmiyor ve göç kodu gerekmiyor.
 * Alan eksikse (eski kayıt) "sürmekte olan tur yok" oluyor.
 *
 * Kendi `version` alanı ayrı: turun **şekli** değişirse (yeni bir kule
 * alanı eklenirse) eski tur sessizce yanlış yüklenmemeli, atılmalı.
 * Yıldızın aksine yarım bir tur atılabilir bir şey.
 *
 * Poki'nin bulut kaydı 1 MB (gzip) sınırı koyuyor; bu yapı ~1 KB.
 *
 * TIER 1 kural 11: Phaser yok, `node`'da test ediliyor.
 */
import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';

/** Turun şekli. Değişirse eski turlar **atılıyor**, dönüştürülmüyor. */
export const RUN_VERSION = 1;

/** Bir yapı noktasının kaydı. Kule ve kışla aynı dizide. */
export interface SpotKaydi {
  readonly spotIndex: number;
  /** `'kisla'` kışla, diğerleri kule ailesi kimliği (`towers.ts`). */
  readonly defId: string;
  readonly tierIndex: 0 | 1 | 2 | 3;
  /** Yalnız kule — kışlada hedefleme modu yok. */
  readonly targetMode?: string;
  /** Yalnız kışla — toplanma noktası. */
  readonly rally?: { readonly x: number; readonly y: number };
}

export interface RunData {
  readonly version: number;
  readonly mapId: string;
  readonly difficulty: string;
  /** **0 tabanlı** sıradaki dalga indeksi — `WaveManager.#index` ile aynı. */
  readonly waveIndex: number;
  readonly gold: number;
  readonly lives: number;
  readonly spots: readonly SpotKaydi[];
  /** Yetenek kimliği → kalan bekleme (sn). */
  readonly abilities: Readonly<Record<string, number>>;
  /**
   * Yetenek kimliği → seviye (1 taban) — `M99`, S117'nin gider kalemi.
   *
   * **Steğe bağlı ve `RUN_VERSION` ARTMIYOR:** alan eksikse (bu sürümden
   * önce yazılmış tur) seviyeler 1'e düşüyor, yani oyuncu turunu
   * kaybetmiyor — en fazla yükseltmesini. Sürüm arttırmak bütün yarım
   * turları çöpe atardı ve bedeli kazancından büyük olurdu.
   */
  readonly abilityLevels?: Readonly<Record<string, number>>;
  /**
   * `RunStatsData`'nın kendisi değil, **şekli umursanmayan** bir kopya.
   *
   * Tip olarak bağlanmıyor çünkü bu dosya `RunStats`'a bağımlı olmamalı:
   * istatistik alanı eklenince tur kaydı derlenmez hâle gelmemeli, yalnız
   * o alan eski turlarda eksik kalmalı. Yükleyen taraf kendi
   * varsayılanını veriyor.
   */
  readonly stats: Readonly<Record<string, number | boolean>>;
}

/** Kaydın bu dosyanın yazdığı alanı. */
interface KayitYuzeyi {
  run?: unknown;
}

function sayiMi(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function kademeMi(v: unknown): v is 0 | 1 | 2 | 3 {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

/**
 * Okunan turu **tek tek** doğrular.
 *
 * Gevşek davranmak burada pahalı: bozuk bir tur "yüklendi" sayılırsa
 * oyuncu yarısı eksik bir tahtayla oyuna düşer ve bunun neden olduğunu
 * anlayamaz. Şüphede kalırsa `null` — yani "sürmekte olan tur yok",
 * oyuncunun kaybı en çok bir tur.
 */
function gecerliRun(v: unknown): RunData | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Partial<RunData>;
  if (r.version !== RUN_VERSION) return null;
  if (typeof r.mapId !== 'string' || r.mapId === '') return null;
  if (typeof r.difficulty !== 'string') return null;
  if (!sayiMi(r.waveIndex) || r.waveIndex < 0) return null;
  if (!sayiMi(r.gold) || r.gold < 0) return null;
  // Can 0 ise tur zaten kaybedilmiş; böyle bir kayıt yazılmamalı ama
  // yazıldıysa yüklenmemeli — oyuncu ölü bir tura dönmez.
  if (!sayiMi(r.lives) || r.lives <= 0) return null;
  if (!Array.isArray(r.spots)) return null;

  const spots: SpotKaydi[] = [];
  for (const s of r.spots as unknown[]) {
    if (typeof s !== 'object' || s === null) return null;
    const k = s as Partial<SpotKaydi>;
    if (!sayiMi(k.spotIndex) || k.spotIndex < 0) return null;
    if (typeof k.defId !== 'string' || k.defId === '') return null;
    if (!kademeMi(k.tierIndex)) return null;
    spots.push({
      spotIndex: k.spotIndex,
      defId: k.defId,
      tierIndex: k.tierIndex,
      ...(typeof k.targetMode === 'string' ? { targetMode: k.targetMode } : {}),
      ...(typeof k.rally === 'object' &&
      k.rally !== null &&
      sayiMi((k.rally as { x?: unknown }).x) &&
      sayiMi((k.rally as { y?: unknown }).y)
        ? { rally: { x: (k.rally as { x: number }).x, y: (k.rally as { y: number }).y } }
        : {}),
    });
  }

  const abilities: Record<string, number> = {};
  if (typeof r.abilities === 'object' && r.abilities !== null) {
    for (const [id, kalan] of Object.entries(r.abilities)) {
      if (sayiMi(kalan) && kalan >= 0) abilities[id] = kalan;
    }
  }

  /**
   * `abilityLevels` **yoksa alan da yok**: eklenirse yazılan ile okunan
   * tur birebir eşleşmez ve `RunSave`'in gidiş-dönüş testi — haklı
   * olarak — kırılır. `targetMode`/`rally` ile aynı desen.
   */
  let abilityLevels: Record<string, number> | undefined;
  if (typeof r.abilityLevels === 'object' && r.abilityLevels !== null) {
    const toplanan: Record<string, number> = {};
    for (const [id, seviye] of Object.entries(r.abilityLevels)) {
      // Sınır denetimi `AbilitySystem.turdanGeriYukleSeviye`'de — orada
      // azami seviye biliniyor. Burada yalnız şekil sınanıyor.
      if (sayiMi(seviye) && seviye >= 1) toplanan[id] = seviye;
    }
    abilityLevels = toplanan;
  }

  const stats: Record<string, number | boolean> = {};
  if (typeof r.stats === 'object' && r.stats !== null) {
    for (const [ad, deger] of Object.entries(r.stats)) {
      if (sayiMi(deger) || typeof deger === 'boolean') stats[ad] = deger;
    }
  }

  return {
    version: RUN_VERSION,
    mapId: r.mapId,
    difficulty: r.difficulty,
    waveIndex: r.waveIndex,
    gold: r.gold,
    lives: r.lives,
    spots,
    abilities,
    ...(abilityLevels !== undefined ? { abilityLevels } : {}),
    stats,
  };
}

/**
 * Sürmekte olan turu okur/yazar/siler.
 *
 * `SaveSystem` ve `TutorialSystem` ile aynı desen: paylaşılan JSON'daki
 * kendi alanına yazarken **diğer alanları koruyor**.
 */
export class RunSave {
  readonly #store: KeyValueStore;

  constructor(store: KeyValueStore) {
    this.#store = store;
  }

  /** Sürmekte olan tur, yoksa (ya da bozuksa) `null`. */
  oku(): RunData | null {
    try {
      const ham = this.#store.get(SAVE_KEY);
      if (ham === null) return null;
      const nesne: unknown = JSON.parse(ham);
      if (typeof nesne !== 'object' || nesne === null) return null;
      return gecerliRun((nesne as KayitYuzeyi).run);
    } catch {
      return null;
    }
  }

  get varMi(): boolean {
    return this.oku() !== null;
  }

  yaz(run: RunData): void {
    this.#guncelle(run);
  }

  /** Tur bitti (kazanıldı, kaybedildi ya da terk edildi). */
  sil(): void {
    this.#guncelle(undefined);
  }

  #guncelle(run: RunData | undefined): void {
    let mevcut: Record<string, unknown> = {};
    try {
      const ham = this.#store.get(SAVE_KEY);
      if (ham !== null) {
        const nesne: unknown = JSON.parse(ham);
        if (typeof nesne === 'object' && nesne !== null) {
          mevcut = nesne as Record<string, unknown>;
        }
      }
    } catch {
      // Bozuk kayıt: diğer alanlar zaten okunamıyor, üstüne yazılıyor.
      mevcut = {};
    }
    if (run === undefined) delete mevcut['run'];
    else mevcut['run'] = run;
    this.#store.set(SAVE_KEY, JSON.stringify(mevcut));
  }
}

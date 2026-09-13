/**
 * Ayarlar — `GAME-DESIGN.md` §10 son paragrafı ve **TIER 1 kural 6**.
 *
 * > Ayarlarda **Ekran sarsıntısı** ve **Efekt yoğunluğu** kapatılabilir
 * > olmalı; `prefers-reduced-motion` varsayılanı düşük yapar.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 * TIER 1 kural 10: kalıcılık `KeyValueStore` arkasında, hepsi `try/catch`.
 */

import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';
import type { Locale } from '../data/strings';
import { DEFAULT_LOCALE } from '../data/strings';
import { setLocale } from '../util/i18n';

/**
 * Efekt yoğunluğu kademeleri — **S53**.
 *
 * `// GEÇİCİ — S53`: §10 "kapatılabilir olmalı" diyor, kademe sayısını
 * söylemiyor. **Üç kademe** seçildi. İki kademe (açık/kapalı)
 * `prefers-reduced-motion`'ı ikili bir anahtara indirger ve §10'un
 * "varsayılanı **düşük** yapar" cümlesinin karşılığı kalmaz — "düşük"
 * ancak arada bir kademe varsa var olabilir.
 */
export type EffectLevel = 'off' | 'low' | 'full';

/** `full` = 1, `low` = 0,4, `off` = 0. Parçacık sayısı bununla çarpılıyor. */
export const EFFECT_SCALE: Readonly<Record<EffectLevel, number>> = {
  off: 0,
  low: 0.4,
  full: 1,
};

export interface SettingsState {
  /** §12: varsayılan ses açık, tek tuşla kapatılabilir, tercih kaydedilir. */
  sound: boolean;
  /** §10 + TIER 1 k.6: ekran sarsıntısı kapatılabilir olmalı. */
  screenShake: boolean;
  effects: EffectLevel;
  /**
   * `Y09` — öğretici ipuçları. Hareket içermiyor (tween'siz, statik
   * parşömen balon), o yüzden `reducedMotionDefaults`'ta da `true` —
   * "hareketi azalt" tercihi bilgilendirme mesajlarını kapatmıyor.
   */
  hints: boolean;
  /**
   * `Y03` Adım 3 — arayüz dili. Diğer ayarlardan bir farkı var: değeri
   * yalnız burada durmuyor, `i18n`'in modül düzeyindeki etkin diline de
   * yazılıyor (`setLocale`). Bunu **`Settings`'in kendisi** yapıyor,
   * çağıran değil — `Y04`'ün dersi: "ses tercihi açılışta uygulanmıyor"
   * hatası tam olarak tercihi saklayan ile uygulayan ayrı olduğu için
   * doğmuştu.
   */
  locale: Locale;
}

export const DEFAULT_SETTINGS: SettingsState = {
  sound: true,
  screenShake: true,
  effects: 'full',
  hints: true,
  locale: DEFAULT_LOCALE,
};

/**
 * `prefers-reduced-motion` uygulanmış varsayılanlar — **S54**.
 *
 * `// GEÇİCİ — S54`: §10 "varsayılanı düşük yapar" diyor, hangi kademe
 * olduğunu söylemiyor. **`low`** seçildi; `off` "azalt" değil "kaldır"
 * olurdu ve medya sorgusunun adı `reduce`, `disable` değil.
 * Ekran sarsıntısı **kapatılıyor** — sarsıntının "azaltılmış" bir hâli yok.
 */
export function reducedMotionDefaults(): SettingsState {
  return { sound: true, screenShake: false, effects: 'low', hints: true, locale: DEFAULT_LOCALE };
}

/**
 * Tarayıcının hareket tercihini okur.
 *
 * `matchMedia` **enjekte edilebilir**: `node` test ortamında yok ve
 * doğrudan çağırmak testleri `jsdom`'a mahkûm ederdi (TIER 1 kural 11'in
 * gerekçesiyle aynı sebep — `TEST-STRATEGY` ortam kararı).
 */
export type MatchMedia = (query: string) => { matches: boolean };

export function prefersReducedMotion(mm?: MatchMedia): boolean {
  const f = mm ?? (globalThis as { matchMedia?: MatchMedia }).matchMedia;
  if (f === undefined) return false;
  try {
    return f('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** `navigator.language` yüzeyi — `MatchMedia` ile aynı enjeksiyon gerekçesi. */
export interface NavigatorDili {
  readonly language?: string;
}

/**
 * `Y03` Adım 3 — açılış dili tarayıcıdan.
 *
 * Poki/CrazyGames global: menüye düşen yabancı oyuncu ilk kareden
 * itibaren İngilizce görmeli, çünkü dil seçici **ayarlar panelinde** ve
 * panele ancak bir haritanın içinden ulaşılıyor. Yani algılama olmasa,
 * dili değiştirmek için önce Türkçe bir menüyü çözmek gerekirdi.
 *
 * Türkçe dışındaki her dil `en`'e düşüyor — `en` çevirisi olmayan bir
 * dile değil, var olan iki dilden uluslararası olanına.
 *
 * Okunamadığında `DEFAULT_LOCALE`: `node` test ortamında `navigator`
 * yok ve `prefersReducedMotion` ile aynı sebeple (TIER 1 kural 11 /
 * `TEST-STRATEGY` ortam kararı) doğrudan çağrılmıyor.
 */
export function detectLocale(nav?: NavigatorDili): Locale {
  const n = nav ?? (globalThis as { navigator?: NavigatorDili }).navigator;
  const dil = n?.language;
  if (typeof dil !== 'string') return DEFAULT_LOCALE;
  return dil.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

/**
 * Kayıttan okunan dil değerini doğrular.
 *
 * Diğer alanlardan farklı olarak bu **zorunlu**: bozuk bir `effects`
 * değeri yalnız `EFFECT_SCALE[bozuk]` → `undefined` üretir (çirkin ama
 * çökmez), bozuk bir `locale` ise `STRINGS[bozuk][key]` okumasını
 * `undefined`'ın alanını okumaya çevirir ve oyun **açılışta çöker**.
 * Sınır burası: JSON'un tipsiz dünyadan girdiği yer.
 */
function gecerliLocale(deger: unknown): deger is Locale {
  return deger === 'tr' || deger === 'en';
}

interface KayitBicimi {
  readonly settings?: Partial<SettingsState>;
}

/**
 * Ayar durumu + kalıcılık.
 *
 * Kayıt `SAVE_KEY` altındaki tek JSON nesnesinin `settings` alanına
 * yazılıyor — M7'nin `SaveSystem`'i aynı anahtarın **başka** alanlarını
 * kullanacak, o yüzden yazarken mevcut içerik korunuyor.
 */
export class Settings {
  #durum: SettingsState;
  readonly #store: KeyValueStore;

  constructor(store: KeyValueStore, mm?: MatchMedia, nav?: NavigatorDili) {
    this.#store = store;
    // Önce sistem tercihi, sonra kayıtlı tercih. Sıra önemli: oyuncunun
    // açıkça yaptığı seçim sistem varsayılanını **ezer**. Dil de aynı
    // sırada: tarayıcının dili bir sistem tercihi, kayıtlı seçim onu ezer.
    const taban = prefersReducedMotion(mm) ? reducedMotionDefaults() : { ...DEFAULT_SETTINGS };
    taban.locale = detectLocale(nav);
    const kayitli = this.#oku();
    this.#durum = { ...taban, ...kayitli };
    // Bozuk/eski kayıt tipsiz geliyor — `t()` çökmeden önce burada elenir.
    if (!gecerliLocale(this.#durum.locale)) this.#durum.locale = taban.locale;
    setLocale(this.#durum.locale);
  }

  get state(): Readonly<SettingsState> {
    return this.#durum;
  }

  get effectScale(): number {
    return EFFECT_SCALE[this.#durum.effects];
  }

  set<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void {
    this.#durum = { ...this.#durum, [key]: value };
    // Dil, saklandığı yerde uygulanıyor — bkz. `SettingsState.locale`.
    if (key === 'locale') setLocale(this.#durum.locale);
    this.#yaz();
  }

  /** Efekt yoğunluğunu sırayla döndürür: full → low → off → full. */
  cycleEffects(): EffectLevel {
    const sira: EffectLevel[] = ['full', 'low', 'off'];
    const i = sira.indexOf(this.#durum.effects);
    const yeni = sira[(i + 1) % sira.length]!;
    this.set('effects', yeni);
    return yeni;
  }

  #oku(): Partial<SettingsState> {
    const ham = this.#store.get(SAVE_KEY);
    if (ham === null) return {};
    try {
      const nesne = JSON.parse(ham) as KayitBicimi;
      return nesne.settings ?? {};
    } catch {
      // Bozuk kayıt oyunu çökertmez — varsayılanlarla devam.
      return {};
    }
  }

  #yaz(): void {
    // M7'nin `SaveSystem`'i aynı anahtarı paylaşacak; mevcut alanlar korunuyor.
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
    mevcut['settings'] = this.#durum;
    this.#store.set(SAVE_KEY, JSON.stringify(mevcut));
  }
}

// ---------------------------------------------------------------------
// Y04 — sahneler arası paylaşım
// ---------------------------------------------------------------------
//
// Eskiden `Settings` `GameScene`'in `readonly` bir alanıydı — bir
// oyun-oturumu nesnesi gibi kurulmuştu, oysa uygulama-ömrü boyunca tek
// olması gereken bir nesneydi. `GameScene`'den önce çalışan hiçbir
// sahne (`Boot`, `Preload`, `Menu`) ona erişemiyordu; sonuç: oyuncu
// sesi kapatıp sekmeyi kapatsa bile bir dahaki açılışta menü müziği
// **açık** çalıyordu — susturma ancak bir haritaya girilip
// `HudScene.create()` koşunca uygulanıyordu.
//
// Çözüm `Settings`'i `BootScene`'de kurup Phaser'ın sahneler arası
// paylaşılan tek sözlüğüne (`scene.registry`) koymak — böylece `Menu`
// da dahil, hiçbir sahne ondan önce çalışmıyor.

/**
 * `BootScene`'in `Settings`'i koyduğu, diğer sahnelerin okuduğu
 * `registry` anahtarı.
 */
export const SETTINGS_REGISTRY_KEY = 'settings';

/**
 * `LocalStore`'un **ilk** yazma hatasını `BootScene`'den bir sonraki
 * `GameScene.create()`'e taşıyan bayrak. `BootScene` bir daha
 * çalışmadığı için hatayı kendisi bildiremiyor (TIER 1 kural 10:
 * "kayıt başarısızsa oyuncuya bir kez bildirilir").
 *
 * **Bilinen sınır:** bir harita ortasında (ör. ayarlar panelinden)
 * yeni bir yazma başarısız olursa bildirim **o an değil**, bir sonraki
 * `GameScene` başlangıcında görünür — eskiden (Settings `GameScene`'in
 * kendi alanıyken) anında oluyordu. `save:failed` olayının bugün hiçbir
 * dinleyicisi yok (tarandı, `GameScene.ts`), yani bu gecikme şu an
 * gözlemlenebilir değil; bir tüketici eklenirse bu sınır yeniden
 * değerlendirilmeli.
 */
export const SAVE_FAILED_REGISTRY_KEY = 'kn-save-failed';

/**
 * `scene.registry`'nin okuma yüzeyi — `Phaser.Scene`'in tamamı değil,
 * dar bir arayüz (`GameClock.ClockTarget` ile aynı desen: `Phaser.Scene`
 * bu şekli sağlıyor, testte sahte nesne de sağlayabilir). Bu dosya
 * Phaser'a hâlâ dokunmuyor (TIER 1 kural 11).
 */
export interface RegistryHost {
  readonly registry: { get(key: string): unknown };
}

/**
 * `registry`'den paylaşılan `Settings` örneğini tipli okur.
 *
 * `registry.get` tipsiz (`any`) döner; `instanceof` ile daraltmak
 * TIER 1 kural 5'in (`any` yasağı) ruhuna bir `as Settings`
 * zorlamasından daha uygun.
 *
 * @throws `BootScene` henüz koşmadıysa — sahne sırası bozulduysa
 *   (`main.ts`'te `Boot` her zaman ilk kayıtlı sahne olmalı).
 */
export function getSettings(host: RegistryHost): Settings {
  const s = host.registry.get(SETTINGS_REGISTRY_KEY);
  if (!(s instanceof Settings)) {
    throw new Error(
      'Settings registry’de yok — BootScene her zaman ilk koşan sahne olmalı (main.ts sahne sırası).',
    );
  }
  return s;
}

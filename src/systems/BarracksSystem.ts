/**
 * Kışla engellemesi — `GAME-DESIGN.md` §4.4'teki **9 kuralın** uygulaması.
 *
 * Türün en çok kenar durum üreten mekaniği; `TowerSystem`'e sıkıştırılırsa
 * bug fabrikası olur (`ROADMAP.md` M5, `research/03` §1).
 *
 * TIER 1 kural 11: Phaser'a dokunmaz — `SoldierState` ve `BlockableEnemy`
 * **şekilleri** üzerinden çalışıyor, `entities/Soldier` onları uyguluyor.
 * TIER 1 kural 9: tüm mesafe karşılaştırmaları karesel.
 * TIER 1 kural 8: zaman `scaledDelta` üzerinden geliyor.
 *
 * ## Rastgelelik yok
 *
 * Haydutlar'ın "%25 kaçınma"sı (S44) olasılıksal değil **çarpımsal**
 * uygulanıyor. Gerekçe `#askereHasar` üstünde yazılı.
 */

import type { Vec2 } from '../types/common';
import type { BarracksRuntime, BlockableEnemy, SoldierState } from '../types/barracks';
import { BLOCK, meleeDps } from '../data/barracks';
import { applyDamage } from './combat';
import { closestPointOnPaths, distSq, moveToward } from '../util/math';

const AGGRO_KARE = BLOCK.aggroRadius * BLOCK.aggroRadius;
const TEMAS_KARE = BLOCK.contactRadius * BLOCK.contactRadius;
const TOPLANMA_KARE = BLOCK.rallyRange * BLOCK.rallyRange;
const YAPISMA_KARE = BLOCK.pathSnapMax * BLOCK.pathSnapMax;

/** Toplanma noktasına "vardı" sayılma eşiği. Temas yarıçapıyla aynı. */
const VARIS_KARE = TEMAS_KARE;

/**
 * §4.4 kural 6 — toplanma noktasını geçerli bir konuma indirger.
 *
 * İki kısıt sırayla uygulanıyor ve **sıra önemli**:
 * 1. Kışladan `rallyRange = 160 px` dışına sürüklenirse sınıra kenetlenir.
 * 2. Sonuç yola `≤ 40 px` ise yola **yapışır**; değilse toplanma noktası
 *    değişmez (yol dışına konamaz).
 *
 * Ters sırada yapılsaydı yola yapışan nokta menzil dışına taşabilirdi ve
 * kural 6'nın iki yarısı çelişirdi.
 *
 * `paths` **çoğul** (`Y13`): harita 2/3'ün iki kolu var. `closestPointOnPaths`
 * hangi kola en yakınsa onu seçiyor — tek yollu haritada (`paths.length===1`)
 * davranış birebir aynı kalıyor. Eskiden yalnız `paths[0]` kullanılıyordu ve
 * ikinci kolun yanına sürüklenen bayrak sessizce reddediliyordu.
 */
export function clampRally(
  barracksPos: Vec2,
  istenen: Vec2,
  paths: readonly (readonly Vec2[])[],
  /**
   * İstenen nokta geçersizse dönülecek konum — sürükleme sırasında
   * **mevcut** toplanma noktası. Verilmezse varsayılan toplanma noktası
   * (`defaultRally`) kullanılıyor.
   */
  fallback?: Vec2,
): Vec2 {
  // 1) Kışla menziline kenetle.
  let aday: Vec2 = { x: istenen.x, y: istenen.y };
  const kare = distSq(barracksPos, aday);
  if (kare > TOPLANMA_KARE) {
    aday = moveToward(barracksPos, aday, BLOCK.rallyRange);
  }

  // 2) Yola yapıştır.
  const yol = closestPointOnPaths(aday, paths);
  if (yol.distSq <= YAPISMA_KARE) return yol.point;

  // Yola yeterince yakın değil — yol dışına konamaz (kural 6). Toplanma
  // noktası **değişmiyor**; sürükleme işaretçisi olduğu yerde kalıyor.
  return fallback ?? defaultRally(barracksPos, paths);
}

/**
 * Kışla kurulduğunda askerlerin toplandığı başlangıç noktası.
 *
 * **Kışlanın kendi konumu olamaz.** Harita 1'in sekiz yapı noktasının
 * hepsi yoldan **75-90 px** uzakta, yani `pathSnapMax = 40`'ın dışında;
 * kışlanın üstünü varsayılan yapsaydık askerler yolun kenarında dururdu,
 * aggro yarıçapı (60 px) yola yetişmezdi ve kışla **hiçbir şey yapmazdı**.
 * Ölçüm bunu gösterdi (`M5-SONUC.md`).
 *
 * Yola en yakın nokta her zaman geçerli: yapı noktası ↔ yol mesafesi
 * `rallyRange = 160`'ın altında olduğu sürece menzil kısıtı da sağlanıyor.
 *
 * `paths` **çoğul** (`Y13`): harita 2/3'te kışla, iki koldan **hangisine**
 * daha yakınsa ona toplanır. Eskiden yalnız `paths[0]`'a bakılıyordu; ikinci
 * kolun yanına kurulan kışla toplanma noktasını birinci kola göre
 * hesaplıyor, menzil dışı çıkınca da kışlanın kendi üstüne düşüyordu —
 * yolun üstünde durmayan asker hiçbir düşmanı engellemiyor.
 */
export function defaultRally(barracksPos: Vec2, paths: readonly (readonly Vec2[])[]): Vec2 {
  const yol = closestPointOnPaths(barracksPos, paths);
  if (distSq(barracksPos, yol.point) <= TOPLANMA_KARE) return yol.point;
  // Yol toplanma menzilinin dışında — harita hatası. Kışlanın üstü.
  return { x: barracksPos.x, y: barracksPos.y };
}

/** Askeri doğum durumuna getirir (kışla kurulunca ve dirilişte). */
export function spawnSoldier(
  s: SoldierState,
  home: Vec2,
  rally: Vec2,
  opts: {
    hp: number;
    dps: number;
    evasion: number;
    speed: number;
    lifetimeSeconds?: number;
  },
): void {
  s.x = home.x;
  s.y = home.y;
  s.home = { x: home.x, y: home.y };
  s.rally = { x: rally.x, y: rally.y };
  s.hp = opts.hp;
  s.maxHp = opts.hp;
  s.dps = opts.dps;
  s.evasion = opts.evasion;
  s.speed = opts.speed;
  s.shield = 0; // S43 — kalkan sayısı dokümanda yok, uygulanmıyor
  s.engagedWith = null;
  s.respawnLeft = 0;
  s.lifetimeLeft = opts.lifetimeSeconds ?? Number.POSITIVE_INFINITY;
  // **Kural 7:** doğan asker toplanma noktasına YÜRÜR ve yürürken
  // engelleme yapmaz. Doğrudan 'idle' yapmak kuralı sessizce delerdi.
  s.state = 'walking';
  s.alive = true;
}

/**
 * Askerin mantıksal durumunu sıfırlar (TIER 1 kural 3).
 *
 * `entities/Soldier.resetForPool` bunu çağırıp üstüne yalnız görsel
 * sıfırlamayı ekliyor. **Sıfırlanmayan `engagedWith` ölü askeri düşmana
 * kilitli bırakır** ve düşman sonsuza kadar durur — kural 3'ün var olma
 * sebebi tam olarak bu.
 */
export function resetSoldierState(s: SoldierState): void {
  // Kilit varsa düşman tarafını da serbest bırak — tek taraflı temizlik
  // düşmanı ölü bir askere kilitli bırakır.
  if (s.engagedWith !== null && s.engagedWith.blockedBy === s) {
    s.engagedWith.blockedBy = null;
  }
  s.engagedWith = null;
  s.hp = 0;
  s.maxHp = 0;
  s.dps = 0;
  s.evasion = 0;
  s.shield = 0;
  s.speed = 0;
  s.respawnLeft = 0;
  s.lifetimeLeft = Number.POSITIVE_INFINITY;
  s.state = 'dead';
  s.alive = false;
  s.x = 0;
  s.y = 0;
}

/** Kilidi iki taraflı olarak kırar (kural 4). */
function kilidiKir(s: SoldierState): void {
  const e = s.engagedWith;
  if (e !== null && e.blockedBy === s) e.blockedBy = null;
  s.engagedWith = null;
  if (s.state === 'fighting') s.state = 'idle';
}

/**
 * §4.4 kural 2 + 8 — aggro yarıçapındaki hedefi seçer.
 *
 * **Kural 8:** uçan düşman hiç aday değil.
 * **Kural 2 vs kural 3:** önce *engellenmemiş* düşmanlar aranıyor; hiçbiri
 * yoksa zaten engellenmiş olanlara düşülüyor. İki kural ancak böyle bir
 * arada durur — kural 3 "birden çok asker aynı düşmanı dövebilir" diyor,
 * ama serbest düşman varken ona gitmek her zaman daha iyi.
 */
function hedefSec(s: SoldierState, enemies: readonly BlockableEnemy[]): BlockableEnemy | null {
  let serbest: BlockableEnemy | null = null;
  let serbestKare = Number.POSITIVE_INFINITY;
  let dolu: BlockableEnemy | null = null;
  let doluKare = Number.POSITIVE_INFINITY;

  for (const e of enemies) {
    if (!e.alive || e.def === null) continue;
    // Canı bitmiş ama henüz havuza dönmemiş düşman aday değil. `alive`
    // bayrağı bir kare sonra düşüyor; o kareyi kaçırırsak asker ölü
    // düşmana kilitlenir ve gerçek tehdidi görmez.
    if (e.hp <= 0) continue;
    if (e.def.flying) continue; // kural 8 — uçanlar engellenemez
    const kare = distSq(s, e);
    if (kare > AGGRO_KARE) continue;

    if (e.blockedBy === null) {
      if (kare < serbestKare) {
        serbestKare = kare;
        serbest = e;
      }
    } else if (e.blockedBy !== s && kare < doluKare) {
      doluKare = kare;
      dolu = e;
    }
  }
  return serbest ?? dolu;
}

/**
 * Düşmanın askere verdiği hasar — kural 3 ve kural 9.
 *
 * **Kaçınma çarpımsal (S44).** §4.4 "kaçınma %25" diyor, anlamını
 * söylemiyor. Olasılıksal ("%25 ihtimalle hasar iptal") ile çarpımsal
 * (`× 0,75`) **sürekli hasarda beklenen değer olarak özdeş**: saniyede
 * 60 kare varsa 60 zar atılıyor ve varyans zaten sıfıra çöküyor. Çarpımsal
 * biçim aynı sonucu rastgelelik olmadan veriyor — yani testler
 * belirlenimci kalıyor ve `Math.random()` kod tabanına girmiyor.
 * `S56`'da kritik vuruş tam bu gerekçeyle çıkarılmıştı: "varyans getirip
 * karşılığında hiçbir şey vermiyordu".
 */
function askereHasar(s: SoldierState, e: BlockableEnemy, dtSec: number): void {
  if (e.def === null) return;

  // **Kural 9:** Ogre Şef askeri tek vuruşta öldürür. Bilinçli — kışla
  // boss'a karşı yalnız ~1 sn gecikme sağlıyor (§4.4).
  if (e.def.id === 'ogreSef') {
    s.hp = 0;
    return;
  }

  const ham = meleeDps(e.def) * dtSec;
  s.hp -= ham * (1 - s.evasion);
}

/**
 * Askerin düşmana verdiği hasar.
 *
 * `// GEÇİCİ — S67`: §4.4 asker DPS'i veriyor ama hasar **tipini** ve
 * zırhla ilişkisini söylemiyor. Fiziksel kabul edildi (§3'te üç tip var,
 * `true` yalnız yeteneklerde, asker büyü yapmıyor).
 *
 * Zırh **saniyelik** rakama uygulanıyor, kare başına değil. Kare başına
 * uygulansaydı 60 FPS'te her tık `dps/60 ≈ 0,08` hasar olurdu, zırh 4 onu
 * her seferinde `%15` tabanına düşürürdü ve zırh sonsuz güçlü çıkardı.
 * Yani asker "saniyede bir vuruş yapıyor" varsayılıyor — `balanceChecks`
 * içindeki `effectiveDps` de aynı sözleşmeyi kullanıyor.
 */
function dusmanaHasar(s: SoldierState, e: BlockableEnemy, dtSec: number): void {
  if (e.def === null) return;
  const saniyelik = applyDamage(s.dps, 'physical', e.def).dealt;
  e.hp -= saniyelik * dtSec;
  if (e.hp <= 0) e.hp = 0;
}

export interface BarracksStepResult {
  /** Ömrü dolan geçici askerler (Takviye) — çağıran havuza döndürür. */
  readonly expired: readonly SoldierState[];
}

/**
 * Bir kışlanın askerlerini bir kare ilerletir.
 *
 * @param scaledDelta `GameClock.scaledDelta`, birim **ms** (TIER 1 kural 8).
 */
export function stepSoldiers(
  soldiers: readonly SoldierState[],
  enemies: readonly BlockableEnemy[],
  scaledDelta: number,
  respawnSeconds: number,
): BarracksStepResult {
  const dt = scaledDelta / 1000;
  const expired: SoldierState[] = [];

  for (const s of soldiers) {
    // --- Ölü: diriliş sayacı (kural 7) ---
    if (s.state === 'dead') {
      if (!s.alive) continue; // havuzda bekliyor, kışlaya ait değil
      s.respawnLeft -= dt;
      if (s.respawnLeft <= 0) {
        s.x = s.home.x;
        s.y = s.home.y;
        s.hp = s.maxHp;
        s.state = 'walking'; // kural 7: toplanma noktasına YÜRÜR
      }
      continue;
    }

    if (!s.alive) continue;

    // --- Geçici asker ömrü (§8 Takviye, 20 sn) ---
    if (s.lifetimeLeft !== Number.POSITIVE_INFINITY) {
      s.lifetimeLeft -= dt;
      if (s.lifetimeLeft <= 0) {
        kilidiKir(s);
        // **Bir kez bildirilir.** `alive` burada düşüyor, çağıranın havuza
        // döndürmesini beklemeden: aksi hâlde iadeyi bir kare geciktiren
        // çağıran aynı askeri her karede yeniden "ömrü doldu" olarak alır
        // ve çift iade eder. `Pool.release` çift iadeyi yok sayıyor ama
        // sayaçlar yanlış okunur ve hata görünmez kalır.
        s.alive = false;
        s.state = 'dead';
        expired.push(s);
        continue;
      }
    }

    // --- Kilit hâlâ geçerli mi (kural 4) ---
    if (s.engagedWith !== null && (!s.engagedWith.alive || s.engagedWith.hp <= 0)) {
      kilidiKir(s);
    }

    switch (s.state) {
      case 'walking': {
        // **Kural 7:** yürürken engelleme YOK. Düşman taraması bile yapılmıyor.
        s.engagedWith = null;
        const yeni = moveToward(s, s.rally, s.speed * dt);
        s.x = yeni.x;
        s.y = yeni.y;
        if (distSq(s, s.rally) <= VARIS_KARE) s.state = 'idle';
        break;
      }

      case 'idle': {
        const hedef = hedefSec(s, enemies);
        if (hedef === null) {
          // Hedef yok — toplanma noktasına dön (yürüyerek, ama 'idle'
          // kalarak: bu asker hâlâ engellemeye hazır).
          const yeni = moveToward(s, s.rally, s.speed * dt);
          s.x = yeni.x;
          s.y = yeni.y;
          break;
        }
        // Hedefe yaklaş; temas mesafesinde kilitlen (kural 2).
        if (distSq(s, hedef) <= TEMAS_KARE) {
          s.engagedWith = hedef;
          // **Kural 3:** yalnız ilk gelen `blockedBy` olur; sonrakiler
          // bedava DPS ekler ve hasar almaz.
          if (hedef.blockedBy === null) hedef.blockedBy = s;
          s.state = 'fighting';
        } else {
          const yeni = moveToward(s, hedef, s.speed * dt);
          s.x = yeni.x;
          s.y = yeni.y;
        }
        break;
      }

      case 'fighting': {
        const e = s.engagedWith;
        if (e === null) {
          s.state = 'idle';
          break;
        }
        // **Kural 4 (devralma):** engelleyen asker öldüyse düşman serbest
        // kalıyor ama bu asker hâlâ temasta. "Aggro yarıçapında serbest
        // asker varsa yeniden kilitlenir" — temastaki asker o adayın ta
        // kendisi. Devralınmazsa düşman, üstünde iki asker dövüşürken
        // yürümeye devam eder.
        if (e.blockedBy === null) e.blockedBy = s;

        // Asker → düşman: **her** dövüşen asker vuruyor (kural 3).
        dusmanaHasar(s, e, dt);
        // Düşman → asker: **yalnız** blockedBy olan hasar alıyor (kural 3).
        if (e.blockedBy === s) askereHasar(s, e, dt);

        if (e.hp <= 0) kilidiKir(s); // kural 4 — düşman öldü
        break;
      }
    }

    // --- Asker öldü mü (kural 4 + 7) ---
    // Buraya gelindiğinde durum walking/idle/fighting; 'dead' dalı yukarıda
    // `continue` ile çıkıyor.
    if (s.hp <= 0) {
      kilidiKir(s);
      s.hp = 0;
      s.state = 'dead';
      s.respawnLeft = respawnSeconds;
      // Geçici asker (Takviye) dirilmez — ömrü zaten sınırlı. Ömür
      // dolması gibi burada da `alive` düşüyor: tek bildirim.
      if (s.lifetimeLeft !== Number.POSITIVE_INFINITY) {
        s.alive = false;
        expired.push(s);
      }
    }
  }

  return { expired };
}

/**
 * Bir kışlayı bir kare ilerletir — `stepSoldiers`'ın kışla sarmalayıcısı.
 */
export function stepBarracks(
  bar: BarracksRuntime,
  enemies: readonly BlockableEnemy[],
  scaledDelta: number,
  respawnSeconds: number,
): BarracksStepResult {
  return stepSoldiers(bar.soldiers, enemies, scaledDelta, respawnSeconds);
}

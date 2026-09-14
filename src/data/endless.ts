/**
 * Sonsuz mod sayıları — `M8-T06`.
 *
 * TIER 1 kural 1: sayı burada, sistemde değil.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * ## Neden `budget(n)` olduğu gibi kullanılamıyor
 *
 * `waves.ts`'in bütçe formülü dalga başına **%20** büyüyor. On dalga için
 * doğru (52 puanda bitiyor) ama sonsuzda patlıyor: dalga 30'da 10 × 1,20²⁹
 * ≈ **1900 puan** eder ve en ucuz düşman 1 puan olduğu için bu, tek dalgada
 * 1900 düşman demek. Havuz 60 (`POOL_PREALLOC.enemy`); `WaveManager` havuz
 * dolunca **erteliyor** (sessizce atlamıyor), yani dalga bitmiyor ve oyun
 * kilitleniyor.
 *
 * Bu yüzden sonsuz modda zorluk **iki koldan** geliyor:
 *
 * 1. **Bütçe** daha yavaş büyüyor (%8) ve düşman **sayısı** tavanla sınırlı.
 * 2. Tavan bağlayıcı olduğunda zorluğu **HP çarpanı** taşıyor: her dalga
 *    kalıcı olarak +%8 HP.
 *
 * İkisinin çarpımı (sayı × dayanıklılık) düz üstel bir tek koldan daha
 * uzun süre anlamlı kalıyor ve havuz tavanını hiç zorlamıyor.
 */

import { POOL_PREALLOC } from './balance';

/** Sonsuz modun ilk dalgası. Harita kendi 10 dalgasını bitirince başlıyor. */
export const ENDLESS_FIRST_WAVE = 11;

/** Dalga başına bütçe büyümesi. `waves.ts`'in %20'si yerine. */
export const ENDLESS_BUDGET_GROWTH = 1.08;

/** Dalga başına kalıcı HP artışı (çarpan olarak eklenir). */
export const ENDLESS_HP_STEP = 0.08;

/**
 * Bir sonsuz dalgadaki azami düşman sayısı.
 *
 * Havuzun **altında** bırakıldı: Örümcek Ana bölününce (3 yavru) havuzdan
 * ek yer istiyor ve önceki dalgadan sahada kalan düşman olabiliyor. Tavanı
 * havuza eşitlemek "dalga bitmiyor" kilidini davet ederdi.
 */
export const ENDLESS_MAX_ENEMIES = Math.floor(POOL_PREALLOC.enemy * 0.75);

/**
 * Kaç dalgada bir boss. Harita kendi bossunu 10'da veriyor; sonsuzda
 * 20, 30, 40... (S79). Daha sık olsaydı boss bir olay olmaktan çıkardı,
 * daha seyrek olsaydı sonsuz modun tek tempo kırıcısı kaybolurdu.
 */
export const ENDLESS_BOSS_EVERY = 10;

/**
 * Tek bir düşman tipinin dalgadaki beden payı tavanı.
 *
 * Olmadığında sonsuz mod **tek tipe çöküyordu**: bütçe havuz tavanını
 * geçtikten sonra en pahalı düşmanla doldurmak tek çare oluyor ve dalga 40,
 * 50, 60 hepsi "44 Trol" çıkıyordu — sayılar büyüse de oyun aynılaşıyordu
 * (ölçüldü, üretilen dalgalar basıldı). Tavan, bütçe ne kadar büyürse
 * büyüsün kadronun geri kalanının sahada kalmasını garanti ediyor.
 */
export const ENDLESS_TYPE_SHARE_CAP = 0.55;

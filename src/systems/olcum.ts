/**
 * Oyun olayları — `M9-T02`.
 *
 * `ROADMAP.md`'nin "v1 sonrası — karar noktası" bölümü hangi içeriğin
 * ekleneceğine **veri** karar versin diye bir teşhis matrisi kuruyor ve
 * beş sinyal istiyor. İkisi portal panelinden bedava geliyor (oturum
 * süresi, dönüş oranı); **üçü bizim göndermemiz gereken** sinyaller:
 *
 * | Matrisin istediği | Buradan |
 * |---|---|
 * | Harita başına tamamlama | `level/<harita>/start` ile `complete` oranı |
 * | Nerede bırakıyorlar | `wave/<harita>/<dalga>` (yalnız kaybedince) |
 * | Yıldız dağılımı | `stars/<n>/complete` |
 *
 * ## Neden bu üç olay ve bu kadarı
 *
 * Poki'nin `measure(category, what, action)` API'si `start`, `complete`
 * ve `fail` eylemlerine **özel raporlama anlamı** veriyor — ilerleme
 * huninisi bu üçünden çıkıyor. Kendi ad uyduracak yerde onların
 * sözlüğünü kullanmak, panelde hazır grafiği almak demek.
 *
 * Koşu başına **en çok dört** olay gönderiliyor. Her dalga için olay
 * göndermek hem gereksiz (matris "nerede bıraktı" soruyor, "her dalgayı
 * ne zaman bitirdi" değil) hem de ayrık değer sayısını şişirir.
 *
 * ## Sözcük burada, sahnelerde değil
 *
 * Kategori/eylem dizeleri tek bir dosyada; sahneler ad değil **işlev**
 * çağırıyor. `strings.ts` disiplininin aynısı: panelde görünen adları
 * beş ayrı sahneye dağıtmak, bir gün birinin sessizce ayrışması demek.
 *
 * TIER 1 kural 11: Phaser yok, `node`'da test ediliyor.
 */
import type { Portal } from './Portal';

/** Poki'nin sözlüğü — `sdk.poki.com/game-events`. */
const KATEGORI = {
  harita: 'level',
  dalga: 'wave',
  yildiz: 'stars',
  zorluk: 'difficulty',
} as const;

const EYLEM = {
  basladi: 'start',
  bitti: 'complete',
  kaybetti: 'fail',
} as const;

/**
 * Harita açıldı.
 *
 * Zorluk ayrı bir olay: hangi zorluğun seçildiği, tamamlama oranını
 * yorumlarken gereken bağlam ("düşük tamamlama" Zor'da normal,
 * Kolay'da sorun).
 */
export function haritaBasladi(portal: Portal, haritaId: string, zorluk: string): void {
  portal.olc(KATEGORI.harita, haritaId, EYLEM.basladi);
  portal.olc(KATEGORI.zorluk, zorluk, EYLEM.basladi);
}

/** Harita kazanıldı — tamamlama oranının payı, ve yıldız dağılımı. */
export function haritaKazanildi(portal: Portal, haritaId: string, yildiz: number): void {
  portal.olc(KATEGORI.harita, haritaId, EYLEM.bitti);
  portal.olc(KATEGORI.yildiz, String(yildiz), EYLEM.bitti);
}

/**
 * Harita kaybedildi — **matrisin "nerede bırakıyorlar" sinyali**.
 *
 * Dalga numarası `action` olarak gidiyor, `what` olarak değil: `what`
 * haritayı tanımlıyor ve ayrık değer sayısı harita sayısıyla sınırlı
 * kalıyor. Dalga `action`'a konunca "harita 3'te en çok dalga 8'de
 * bırakıyorlar" tek grafikte okunuyor.
 */
export function haritaKaybedildi(portal: Portal, haritaId: string, dalga: number): void {
  portal.olc(KATEGORI.harita, haritaId, EYLEM.kaybetti);
  portal.olc(KATEGORI.dalga, haritaId, String(dalga));
}

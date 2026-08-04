/**
 * Nesne havuzu — TIER 1 kural 3.
 *
 * ## Kural 3 ile kural 11 nasıl bir arada duruyor
 *
 * Kural 3 havuzlamanın `Phaser.GameObjects.Group` ile yapılmasını istiyor.
 * Kural 11 ise `util/`'in çalışma zamanında Phaser'a dokunmasını yasaklıyor —
 * gerekçesi testlerin `node` ortamında koşması ve `simulateWave`'in
 * "10 dalga < 2 sn" şartının buna asılı olması.
 *
 * İkisi **ayrıştırılarak** karşılanıyor:
 *
 * - **Bu dosya** yalnız *muhasebeyi* tutuyor — kim serbest, kim kullanımda,
 *   sıfırlama çağrıldı mı, havuz doldu mu. Phaser'a hiç dokunmuyor, `node`'da
 *   koşuyor. Kural 3'ün asıl önlemek istediği şey (oyun içinde `new`, ve
 *   sıfırlanmamış durumun geri dönmesi) tam olarak burada zorlanıyor.
 * - **`Group`** havuzu *kullanan* tarafta yaşıyor (`entities/`, `scenes/`):
 *   nesnelerin görüntü listesine girmesi, sahne kapanınca toplanması onun
 *   işi. `factory` bir `Group` üyesi üretir; havuz o nesnenin ne olduğunu
 *   bilmez.
 *
 * Yani `Group` kayboluyor değil, sorumluluk bölünüyor: yaşam döngüsü
 * Phaser'da, sıfırlama sözleşmesi burada. Havuz mantığı Phaser'ın içinde
 * kalsaydı tek bir havuz testi bile bir Phaser dünyası ayağa kaldırmak
 * zorunda kalırdı.
 */

/**
 * Havuza dönebilen nesne.
 *
 * `resetForPool` **tüm** durumu sıfırlar: hedef referansı, tween, timer,
 * tint, alpha, ölçek, hız. Sıfırlanmayan bir hedef referansı ölü düşmanı
 * canlı tutar — kural 3 bu cümle için var.
 */
export interface Poolable {
  resetForPool(): void;
}

export class Pool<T extends Poolable> {
  private readonly serbest: T[] = [];
  private readonly kullanimda = new Set<T>();
  private readonly onExhausted: ((capacity: number) => void) | undefined;

  /**
   * @param factory Nesne üretici. **Yalnız kurucuda** çağrılır; havuz
   *   çalışırken bir daha çağrılmaz.
   * @param prealloc Ön ayrılan nesne sayısı = havuzun kapasitesi.
   * @param onExhausted Havuz boşken `acquire` çağrılırsa tetiklenir.
   *   Havuz kendi başına `console` kullanmaz — kural 11 kapsamındaki bir
   *   dosya `import.meta.env` gibi Vite'a özgü şeylere de bağlanmasın diye
   *   uyarıyı çağıran taraf basar (yayın yapısında konsol çıktısı yasak).
   */
  constructor(factory: () => T, prealloc: number, onExhausted?: (capacity: number) => void) {
    this.onExhausted = onExhausted;
    for (let i = 0; i < prealloc; i++) {
      const nesne = factory();
      nesne.resetForPool(); // havuza ilk giriş de sıfırlanmış olmalı
      this.serbest.push(nesne);
    }
  }

  /** Kapasite sabittir; havuz **sessizce büyümez**. */
  get capacity(): number {
    return this.serbest.length + this.kullanimda.size;
  }

  get activeCount(): number {
    return this.kullanimda.size;
  }

  get freeCount(): number {
    return this.serbest.length;
  }

  /**
   * Havuzdan bir nesne alır. Havuz boşsa **`null`** döner ve yeni nesne
   * yaratmaz.
   *
   * Sessiz büyüme M6'da takılma olarak ortaya çıkar ve o noktada sebebi
   * bulmak zordur; `null` dönmek sorunu doğduğu anda görünür kılıyor.
   */
  acquire(): T | null {
    const nesne = this.serbest.pop();
    if (nesne === undefined) {
      this.onExhausted?.(this.capacity);
      return null;
    }
    this.kullanimda.add(nesne);
    return nesne;
  }

  /**
   * Nesneyi havuza döndürür ve `resetForPool` çağırır.
   *
   * Bu havuzdan alınmamış ya da zaten iade edilmiş bir nesne **yok sayılır**:
   * çift iade aynı nesnenin iki kez dağıtılması demek olurdu, ki bu bir
   * düşmanın iki yerde birden görünmesi gibi bulunması çok zor bir hataya
   * dönüşür.
   */
  release(obj: T): void {
    if (!this.kullanimda.delete(obj)) return;
    obj.resetForPool();
    this.serbest.push(obj);
  }

  /** Kullanımdaki her nesneyi sıfırlayıp havuza döndürür (dalga sonu, sahne kapanışı). */
  releaseAll(): void {
    for (const nesne of [...this.kullanimda]) this.release(nesne);
  }

  /** Kullanımdaki nesneler üzerinde gezinme. Kopya döner — döngü içinde `release` güvenli. */
  activeItems(): T[] {
    return [...this.kullanimda];
  }
}

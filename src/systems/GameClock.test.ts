import { describe, it, expect } from 'vitest';
import { GameClock, SABIT_ADIM_MS, KARE_BASINA_MAKS_ADIM } from './GameClock';
import type { ClockTarget } from './GameClock';

/**
 * Sahte hedef. `Phaser.Scene`'in `setScale`'e maruz kalan yüzeyini
 * taklit ediyor — gerçek Phaser yüklenmiyor (TIER 1 kural 11, S08).
 */
function sahteHedef(): ClockTarget {
  return {
    tweens: { timeScale: 1 },
    time: { timeScale: 1 },
    anims: { globalTimeScale: 1 },
  };
}

describe('GameClock', () => {
  /**
   * **`M64` (S132) — sözleşme DEĞİŞTİ: `scaledDelta` artık sabit.**
   *
   * Buradaki ilk üç test eskiden `scaledDelta`nın ham deltayla (ve hızla)
   * çarpıldığını sabitliyordu. O sözleşme oyunu kare süresine bağımlı
   * kılıyordu: `TowerSystem` kare başına en fazla bir atış yaptığı için
   * her atış 0-dt gecikiyor, ve geç haritalarda yolda duran 5-13
   * düşmanlık kuyruk yüzünden o gecikme koşu boyunca birikiyordu. `2×`
   * adımı ikiye katladığı için birikimi de ikiye katlıyordu — Kar Geçidi
   * 1×'te sabit 12 can, 2×'te 10 ile 17 arası.
   *
   * Yeni sözleşme: **adım sabit, sayısı değişken.** Hız artık adımı
   * değil adım *sayısını* çarpıyor.
   */
  it('scaledDelta SABİT — ham delta ne olursa olsun', () => {
    const clock = new GameClock();

    clock.tick(16.67);
    expect(clock.scaledDelta).toBe(SABIT_ADIM_MS);

    clock.tick(33.4);
    expect(clock.scaledDelta).toBe(SABIT_ADIM_MS);

    clock.tick(4);
    expect(clock.scaledDelta).toBe(SABIT_ADIM_MS);
  });

  it('60 Hz karede tam bir adım koşuluyor', () => {
    const clock = new GameClock();

    // İlk kare artığa göre 0 ya da 1 verebilir; on kare toplamı belirleyici.
    let toplam = 0;
    for (let i = 0; i < 10; i += 1) toplam += clock.tick(1000 / 60);

    expect(toplam).toBe(10);
  });

  it('144 Hz karelerin ÇOĞU sıfır adım koşar', () => {
    const clock = new GameClock();

    let bosKare = 0;
    for (let i = 0; i < 144; i += 1) if (clock.tick(1000 / 144) === 0) bosKare += 1;

    // 144 kare, ~60 adım: karelerin çoğu mantık koşturmuyor.
    expect(bosKare).toBeGreaterThan(80);
  });

  /**
   * **S132 kilidi — zaman ne KAYBOLUYOR ne YARATILIYOR.**
   *
   * İddia "her ekranda saniyede tam 60 adım" diye yazılamaz: biriktirici
   * kayan noktayla çalıştığı için bir saniyelik pencerenin son adımı
   * artığın 1e-13'ü yüzünden bir sonraki kareye **ertelenebiliyor**
   * (144 Hz'de 59+1, 3×'te 179+1). Bu kayıp değil kayma, ve iddiayı
   * pencere sınırına göre yazmak onu kırılgan yapardı.
   *
   * Sabitlenen şey asıl olan: koşulan oyun zamanı + taşınan artık,
   * geçen gerçek zamana **eşit**. Bir adım bile kaybolursa 144 Hz'de
   * oyun 60 Hz'dekinden yavaş akar ve S132 geri gelir.
   */
  it('**her ekranda aynı oyun zamanı akıyor** — S132 kilidi', () => {
    for (const hz of [30, 50, 60, 72, 90, 120, 144, 165, 240]) {
      const clock = new GameClock();
      const kare = 1000 / hz;
      let adim = 0;
      for (let i = 0; i < hz * 10; i += 1) adim += clock.tick(kare);

      const gercek = kare * hz * 10;
      expect(adim * SABIT_ADIM_MS + clock.birikim, `${hz} Hz`).toBeCloseTo(gercek, 6);
      // On saniye = 600 adım, en çok bir adım ertelenmiş olabilir.
      expect(adim, `${hz} Hz adım`).toBeGreaterThanOrEqual(599);
      expect(adim, `${hz} Hz adım`).toBeLessThanOrEqual(600);
    }
  });

  it('**2× adımı BÜYÜTMÜYOR, sayısını ikiye katlıyor** — kusurun kendisi', () => {
    const clock = new GameClock();
    clock.setScale(2, sahteHedef());

    let toplam = 0;
    for (let i = 0; i < 60; i += 1) toplam += clock.tick(1000 / 60);

    expect(clock.scale).toBe(2);
    // Adım sabit kaldı — eskiden 33,34 oluyordu ve kusur buydu.
    expect(clock.scaledDelta).toBe(SABIT_ADIM_MS);
    // Bir saniyelik gerçek zamanda iki saniyelik oyun.
    expect(toplam * SABIT_ADIM_MS + clock.birikim).toBeCloseTo(2000, 6);
  });

  it('3× hızda üç katı adım', () => {
    const clock = new GameClock();
    clock.setScale(3, sahteHedef());

    let toplam = 0;
    for (let i = 0; i < 60; i += 1) toplam += clock.tick(1000 / 60);

    expect(clock.scale).toBe(3);
    // 180 ya da 179+artık — üstteki S132 kilidinin notundaki sebep.
    expect(toplam * SABIT_ADIM_MS + clock.birikim).toBeCloseTo(3000, 6);
  });

  /**
   * Ölüm sarmalı koruması: uzun bir kare tavana dayanır ve **artık
   * taşınmaz**. Taşısaydı bir sonraki kare daha borçlu başlar, sarmal
   * kapanmazdı.
   */
  it('çok uzun kare tavanda kesiliyor ve borç taşınmıyor', () => {
    const clock = new GameClock();

    expect(clock.tick(5000)).toBe(KARE_BASINA_MAKS_ADIM);
    expect(clock.birikim).toBe(0);
    expect(clock.tick(1000 / 60)).toBe(1);
  });

  it('artık BİRİKİYOR — kayıp yok', () => {
    const clock = new GameClock();

    // Adımın yarısı kadar iki kare = tam bir adım.
    expect(clock.tick(SABIT_ADIM_MS / 2)).toBe(0);
    expect(clock.tick(SABIT_ADIM_MS / 2)).toBe(1);
  });

  /**
   * `M9-T03` — hız döngüsü 1→2→3→1. Üçü de üç Phaser otoritesini
   * yazmalı; 3× eklenirken biri unutulursa yalnız o hızda sapar ve
   * sessizce olur.
   */
  it('her hız üç Phaser özelliğini de yazıyor — 3× dahil', () => {
    const clock = new GameClock();
    const hedef = sahteHedef();

    for (const h of [1, 2, 3] as const) {
      clock.setScale(h, hedef);
      expect(hedef.tweens.timeScale, `hız ${h} tweens`).toBe(h);
      expect(hedef.time.timeScale, `hız ${h} time`).toBe(h);
      expect(hedef.anims.globalTimeScale, `hız ${h} anims`).toBe(h);
    }
  });

  it('setScale üç Phaser özelliğini de yazar', () => {
    const clock = new GameClock();
    const hedef = sahteHedef();

    clock.setScale(2, hedef);

    // Üçü de yazılmalı. Biri atlanırsa o sistem yanlış hızda çalışır
    // ve bu sessizce olur — bu görevin "bitmedi sayılır eğer" maddesi.
    expect(hedef.tweens.timeScale).toBe(2);
    expect(hedef.time.timeScale).toBe(2);
    expect(hedef.anims.globalTimeScale).toBe(2);
  });

  /**
   * **R17 kilidi — oyun ile simülasyon aynı adımı bilmeli.**
   *
   * `waveSim.kosturDalgalar` adımı verilmezse `SABIT_ADIM_MS` kullanıyor,
   * yani ikisi tek sabitten besleniyor. Bu tesadüf değil zorunluluk:
   * projedeki **bütün** denge sayıları (rampa, Kısıt A tavanları, boss
   * HP türetmesi, aile eşikleri) bu adımda ölçüldü. `M63` sabitin
   * kaymasının ne yaptığını ölçtü — Kar Geçidi 33,3 ms'de 12 yerine 17.
   *
   * Sabiti değiştirmek, dengeyi baştan türetmek demektir. Bu test onu
   * yasaklamıyor, **sessizce** olmasını yasaklıyor.
   */
  it('**sabit adım 1000/60** — dengenin türetildiği adım (S132)', () => {
    expect(SABIT_ADIM_MS).toBe(1000 / 60);
  });

  it('başlangıçta 1×', () => {
    expect(new GameClock().scale).toBe(1);
  });

  it('setScale(1) üçünü de 1e döndürür', () => {
    const clock = new GameClock();
    const hedef = sahteHedef();

    clock.setScale(2, hedef);
    clock.setScale(1, hedef);

    expect(clock.scale).toBe(1);
    expect(hedef.tweens.timeScale).toBe(1);
    expect(hedef.time.timeScale).toBe(1);
    expect(hedef.anims.globalTimeScale).toBe(1);
  });

});

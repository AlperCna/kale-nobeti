/**
 * **Odaklanma kaybı ÖLÇÜLÜYOR** — `M83` (S24).
 *
 * `GAME-DESIGN.md` §6'nın Kısıt B formülü sonuna `× 0,75` koyuyordu ve
 * bunu "odaklanma kaybı" diye adlandırıyordu: `first` hedeflemesi
 * varsayılan olduğu için kuleler aynı düşmana vurur, fazla hasar boşa
 * gider. Formül `S26`/`S27` ile düştü (girdileri statik veriden
 * hesaplanamıyordu, yerine simülasyon kondu) ama **sayı veri dosyasında
 * kaldı**: `BALANCE.focusLoss = 0,75`. Hiçbir kod onu okumuyordu; yalnız
 * üretilen belge onu yaşayan bir kural gibi basıyordu — "veri var, kimse
 * okumuyor" sınıfı (`activityRatio`, `M52`; `BOSS_HP_TOLERANCE`, `M75`).
 *
 * Varsayım ölçüldüğünde **üç kat abartılı** çıktı: gerçek kayıp %25 değil
 * %3-13. Sabit silindi, yerine simülasyonun saydığı iki kalem kondu.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../data/maps';
import { referansKosu } from './referansOlcum';

function olc(mapIndex: number): { atilan: number; ucus: number; asiri: number; verim: number } {
  const m = MAPS[mapIndex]!;
  const sim = referansKosu(m);
  const atilan = sim.reduce((t, r) => t + r.atilanHasar, 0);
  const ucus = sim.reduce((t, r) => t + r.bosaUcusta, 0);
  const asiri = sim.reduce((t, r) => t + r.bosaAsiri, 0);
  return { atilan, ucus, asiri, verim: 1 - (ucus + asiri) / atilan };
}

describe('odaklanma kaybı — ölçülen, varsayılan değil (S24)', () => {
  /**
   * Ölçülen verim: `0,871 · 0,945 · 0,958 · 0,961 · 0,969 · 0,967`.
   * Bant 0,85 — en düşük değerin (öğretici harita) biraz altında.
   * Öğretici harita neden en kötü: atış başına hasar düşmanın canının
   * büyük bir kısmı (T2 Okçu 24 hasar, goblin 8 can), yani aşırı öldürme
   * baskın. Geç haritalarda düşman HP'si 8-10 kat büyük.
   */
  it('her haritada verim %85’in üstünde', () => {
    for (let i = 0; i < MAPS.length; i++) {
      const r = olc(i);
      expect(r.verim, `${MAPS[i]!.id}: ${r.verim.toFixed(3)}`).toBeGreaterThan(0.85);
      expect(r.verim, `${MAPS[i]!.id}`).toBeLessThanOrEqual(1);
    }
  });

  /**
   * **Sayaç gerçekten çalışıyor mu?** Hiç ateşlenmeyen bir sayaç %0 kayıp
   * üretir ve bu ölçüm gibi görünür — `S136`'nın kusuru tam buydu
   * (bekçi hep yeşil dönüyordu). İki kalemin de her haritada pozitif
   * olması, ikisinin de gerçekten sayıldığını söylüyor.
   */
  it('iki kalem de SAYILIYOR — uçuşta boşa ve aşırı öldürme', () => {
    for (let i = 0; i < MAPS.length; i++) {
      const r = olc(i);
      expect(r.atilan, MAPS[i]!.id).toBeGreaterThan(0);
      expect(r.ucus, `${MAPS[i]!.id} uçuşta`).toBeGreaterThan(0);
      expect(r.asiri, `${MAPS[i]!.id} aşırı`).toBeGreaterThan(0);
    }
  });

  /**
   * Hangi kalem baskın sorusu denge kararını değiştiriyor: uçuşta boşa
   * giden hasar bir **hedefleme** kusuru (kule ölmüş düşmana ateş etti),
   * aşırı öldürme ise bir **kalibrasyon** olgusu (atış düşmanın canına
   * göre çok büyük). Altı haritada da ikincisi baskın — yani sorun
   * hedefleme değil, ve `first` modunu suçlayan §6 cümlesi yanlış yöne
   * bakıyordu.
   */
  it('aşırı öldürme, uçuşta boşa gidenden BASKIN', () => {
    for (let i = 0; i < MAPS.length; i++) {
      const r = olc(i);
      expect(r.asiri, `${MAPS[i]!.id}: uçuş ${Math.round(r.ucus)} / aşırı ${Math.round(r.asiri)}`).toBeGreaterThan(r.ucus);
    }
  });
});

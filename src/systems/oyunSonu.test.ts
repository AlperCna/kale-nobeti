import { describe, expect, it } from 'vitest';
import { oyunSonucu } from './oyunSonu';

describe('oyunSonucu — `M168`', () => {
  it('koşan oyunda: can biterse kaybetti, dalgalar biterse kazandı', () => {
    expect(oyunSonucu({ oyunKosuyor: true, can: 0, faz: 'running' })).toBe('kaybetti');
    expect(oyunSonucu({ oyunKosuyor: true, can: 7, faz: 'done' })).toBe('kazandi');
    expect(oyunSonucu({ oyunKosuyor: true, can: 7, faz: 'running' })).toBeNull();
    expect(oyunSonucu({ oyunKosuyor: true, can: 7, faz: 'prep' })).toBeNull();
  });

  it('son dalgada can biterse KAYBETTİ — kazanmaktan önce gelir', () => {
    expect(oyunSonucu({ oyunKosuyor: true, can: 0, faz: 'done' })).toBe('kaybetti');
  });

  /**
   * Kusurun kendisi: önceki elin `done / 1 can`'ı, yeni harita yüklenirken
   * hâlâ okunuyordu ve "kazandı" diyordu. Oyun koşmuyorsa hiçbir sonuç
   * verilmemeli — ne kazanma ne kaybetme.
   */
  it('oyun KOŞMUYORSA (yükleniyor/duraklatıldı) hiçbir sonuç yok', () => {
    expect(oyunSonucu({ oyunKosuyor: false, can: 1, faz: 'done' })).toBeNull();
    expect(oyunSonucu({ oyunKosuyor: false, can: 0, faz: 'running' })).toBeNull();
  });
});

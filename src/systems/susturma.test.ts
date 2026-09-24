/**
 * **Susturma** — `M140`, boss'un üçüncü verb'ü (harita 4).
 *
 * Sözleşme üç parçalı ve üçü de burada bağlı:
 * 1. `TowerSystem.sustur` **en yakın** ve **henüz susturulmamış** kuleyi
 *    seçiyor (yoksa boss tek kuleyi kalıcı kapatırdı).
 * 2. Susturulmuş kule hedef aramıyor, ateş etmiyor ve bekleme sayacı
 *    **donuyor** — yoksa etki yalnız görsel olurdu.
 * 3. Düşman tarafındaki bekleme **yalnız gerçekten bir kule
 *    susturulduğunda** başlıyor.
 *
 * Ayrıca ölçülen iki iddia: susturma gerçekten oluyor (harita 4, dalga 10)
 * ve referans tahtanın can kaybını **değiştirmiyor**.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { TowerSystem } from './TowerSystem';
import { referansKosu, referansCanKaybi } from './referansOlcum';
import { MAPS, MAP_4 } from '../data/maps';
import { getEnemyForMap, GOBLIN } from '../data/enemies';
import { OKCU } from '../data/towers';
import type { Targetable } from '../types/enemy';
import type { TowerRuntime } from '../types/tower';

function kule(spotIndex: number, x: number, y: number): TowerRuntime {
  return {
    spotIndex,
    x,
    y,
    def: OKCU,
    tierIndex: 0,
    targetMode: 'first',
    cooldownLeft: 0,
    susturmaKalan: 0,
    target: null,
  };
}

describe('susturma — kule tarafı', () => {
  it('EN YAKIN kuleyi seçiyor', () => {
    const s = new TowerSystem(() => {});
    s.add(kule(0, 200, 0));
    s.add(kule(1, 50, 0));
    s.add(kule(2, 400, 0));
    const secilen = s.sustur(0, 0, 300, 2);
    expect(secilen?.spotIndex).toBe(1);
    expect(secilen?.susturmaKalan).toBe(2);
  });

  it('yarıçap dışındaki kuleye dokunmuyor', () => {
    const s = new TowerSystem(() => {});
    s.add(kule(0, 400, 0));
    expect(s.sustur(0, 0, 150, 2)).toBeNull();
    expect(s.towers[0]?.susturmaKalan).toBe(0);
  });

  it('zaten susturulmuş kule YENİDEN hedeflenmiyor — kalıcı kapatma yok', () => {
    const s = new TowerSystem(() => {});
    s.add(kule(0, 50, 0)); // en yakın
    s.add(kule(1, 100, 0));
    expect(s.sustur(0, 0, 300, 2)?.spotIndex).toBe(0);
    // İkinci çağrı aynı kuleyi tazelemiyor, bir sonrakine geçiyor.
    expect(s.sustur(0, 0, 300, 2)?.spotIndex).toBe(1);
    // Üçüncüde aday kalmadı.
    expect(s.sustur(0, 0, 300, 2)).toBeNull();
  });

  it('susturulmuş kule ATEŞ ETMİYOR ve bekleme sayacı DONUYOR', () => {
    const atislar: number[] = [];
    const s = new TowerSystem((t) => atislar.push(t.spotIndex));
    s.add(kule(0, 0, 0));
    const hedef: Targetable = {
      x: 10,
      y: 0,
      hp: 100,
      maxHp: 100,
      alive: true,
      effects: { slowSeconds: 0 },
      pathFraction: 0,
      remainingDistance: 1000,
      def: GOBLIN,
    };

    // Önce normal: ateş ediyor.
    s.update(16, [hedef]);
    expect(atislar.length).toBe(1);

    s.sustur(0, 0, 100, 1);
    const oncekiBekleme = s.towers[0]!.cooldownLeft;
    for (let i = 0; i < 30; i++) s.update(16, [hedef]); // ~0,5 sn
    expect(atislar.length, 'susturulmuşken ateş etmemeli').toBe(1);
    expect(s.towers[0]!.cooldownLeft, 'sayaç donmalı').toBe(oncekiBekleme);
    expect(s.towers[0]!.target, 'hedef bırakılmalı').toBeNull();

    // Süre dolunca yeniden çalışıyor.
    for (let i = 0; i < 180; i++) s.update(16, [hedef]); // ~3 sn: Okçu T1 periyodu ~1,67 sn
    expect(s.towers[0]!.susturmaKalan).toBe(0);
    expect(atislar.length).toBeGreaterThan(1);
  });
});

describe('susturma — veri ve ölçüm', () => {
  it('YALNIZ harita 4 boss’unda var', () => {
    const tasiyan = MAPS.filter((m) => getEnemyForMap('ogreSef', m)?.ability?.kind === 'silence');
    expect(tasiyan.map((m) => m.id)).toEqual(['kar-gecidi']);
  });

  /**
   * **Dekor değil.** Dengeye etkisi ölçülemeyen bir mekanik dekordur;
   * bu sağlama susturmanın gerçekten uygulandığını ölçüyor. Sayı `M140`'ta
   * **8** ölçüldü ve hepsi dalga 10'da (boss dalgası) — alt sınır
   * bağlanıyor, tam sayı değil: dalga verisi değişince sayı kayar ama
   * "hiç olmuyor" durumu kırmalı.
   */
  it('harita 4’ün boss dalgasında GERÇEKTEN oluyor', () => {
    const kosu = referansKosu(MAP_4);
    const toplam = kosu.reduce((a, r) => a + r.susturmaSayisi, 0);
    expect(toplam, `ölçülen 8`).toBeGreaterThanOrEqual(4);
    expect(kosu[9]?.susturmaSayisi, 'boss dalgasında').toBeGreaterThanOrEqual(4);
  });

  it('başka hiçbir haritada susturma YOK', () => {
    for (const m of MAPS) {
      if (m.id === 'kar-gecidi') continue;
      const toplam = referansKosu(m).reduce((a, r) => a + r.susturmaSayisi, 0);
      expect(toplam, m.id).toBe(0);
    }
  });

  /**
   * **Rampa kıpırdamıyor — ölçülen sınır.**
   *
   * `M140` taraması cevabın **kesikli** olduğunu gösterdi: süre 2-3 sn
   * ya da bekleme 5 sn'de harita 4 **12**'de kalıyor, ama süre ≥ 4 ve
   * bekleme 3 sn'de birden **23**'e sıçrıyor. Sebep yapısal: boss en
   * tehlikeli sızıntı ve onu öldüren kuleyi kapatmak geri besleme
   * kuruyor (sustur → boss yaşar → daha çok sustur).
   *
   * Seçilen değerler bilerek uçurumun **altında**: susturma oluyor ve
   * görünüyor, iyi bir tahta soğuruyor. Bu test o kararı bağlıyor —
   * sayılar uçurumun üstüne çıkarsa kırılır.
   */
  it('referans tahtanın can kaybını DEĞİŞTİRMİYOR', () => {
    expect(referansCanKaybi(MAP_4)).toBe(12);
  });
});

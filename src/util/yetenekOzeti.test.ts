import { afterEach, describe, expect, it } from 'vitest';
import { yetenekIpucuMetni, yetenekOzeti } from './yetenekOzeti';
import { METEOR_HASAR, TAKVIYE_ASKER, YETENEK_SEVIYE_SAYISI } from '../data/abilities';
import { setLocale } from './i18n';
import { t } from './i18n';

afterEach(() => setLocale('tr'));

/**
 * `M102` — `dalOzeti.test.ts`'in ikizi. Korunan şey metnin harfleri
 * değil **sayının kaynağı**: özet `data/abilities.ts`'ten türemeli,
 * yoksa bir denge turunda oyuncuya eski takas gösterilir.
 */
describe('yetenekOzeti — S93’ün yetenek hâli', () => {
  it('Meteor: o anki hasarla bir sonrakini yan yana yazıyor', () => {
    const s = yetenekOzeti('meteor', 1);
    expect(s).toContain(String(METEOR_HASAR[0]));
    expect(s).toContain(String(METEOR_HASAR[1]));
    expect(s).toContain('→');
  });

  it('Takviye: asker sayısını yazıyor', () => {
    const s = yetenekOzeti('takviye', 1);
    expect(s).toContain(String(TAKVIYE_ASKER[0]));
    expect(s).toContain(String(TAKVIYE_ASKER[1]));
  });

  it('SAYILAR ELLE YAZILMIYOR — veri değişirse özet de değişir', () => {
    // Her kademe geçişi kendi iki sayısını gösteriyor; sabit bir metin
    // olsaydı bu döngü ikinci adımda kırılırdı.
    for (let sv = 1; sv < YETENEK_SEVIYE_SAYISI; sv++) {
      const s = yetenekOzeti('meteor', sv);
      expect(s, `seviye ${sv}`).toContain(`${METEOR_HASAR[sv - 1]} → ${METEOR_HASAR[sv]}`);
    }
  });

  it('azami seviyede null — alınamayacak şey vadedilmiyor', () => {
    expect(yetenekOzeti('meteor', YETENEK_SEVIYE_SAYISI)).toBeNull();
    expect(yetenekOzeti('takviye', YETENEK_SEVIYE_SAYISI)).toBeNull();
  });

  it('sınır dışı seviye null — bozuk kayıt metin üretmiyor', () => {
    expect(yetenekOzeti('meteor', 0)).toBeNull();
    expect(yetenekOzeti('meteor', -3)).toBeNull();
    expect(yetenekOzeti('meteor', YETENEK_SEVIYE_SAYISI + 5)).toBeNull();
  });

  it('İngilizcede de çalışıyor — etiket dilden, sayı veriden', () => {
    setLocale('en');
    const s = yetenekOzeti('takviye', 1);
    expect(s).toContain(t('abilityTakviye'));
    expect(s).toContain(t('sumSoldiers'));
    expect(s).toContain(String(TAKVIYE_ASKER[1]));
  });
});

describe('yetenekIpucuMetni', () => {
  it('kural cümlesi + iki takas', () => {
    const m = yetenekIpucuMetni(() => 1);
    const satirlar = m.split('\n');
    expect(satirlar).toHaveLength(3);
    expect(satirlar[0]).toBe(t('hintAbilityUpgrade'));
    expect(satirlar[1]).toContain(t('abilityMeteor'));
    expect(satirlar[2]).toContain(t('abilityTakviye'));
  });

  it('azami seviyedeki yetenek listeden DÜŞÜYOR', () => {
    const m = yetenekIpucuMetni((id) => (id === 'meteor' ? YETENEK_SEVIYE_SAYISI : 1));
    const satirlar = m.split('\n');
    expect(satirlar).toHaveLength(2);
    expect(m).not.toContain(String(METEOR_HASAR[1]));
    expect(satirlar[1]).toContain(t('abilityTakviye'));
  });

  it('ikisi de azamiyken yalnız kural cümlesi kalıyor', () => {
    expect(yetenekIpucuMetni(() => YETENEK_SEVIYE_SAYISI)).toBe(t('hintAbilityUpgrade'));
  });
});

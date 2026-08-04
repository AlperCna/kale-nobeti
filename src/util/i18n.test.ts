import { describe, it, expect } from 'vitest';
import { t } from './i18n';
import { STRINGS, DEFAULT_LOCALE } from '../data/strings';

describe('i18n', () => {
  it('varsayılan dilde metni döndürür', () => {
    expect(t('play')).toBe('Oyna');
    expect(t('pause')).toBe('Duraklat');
  });

  it('boş çeviride varsayılan dile düşer', () => {
    // en şimdilik tamamen boş (S63) — oyun Türkçe görünür, boş buton çıkmaz.
    expect(STRINGS.en.play).toBe('');
    expect(t('play', 'en')).toBe('Oyna');
  });

  it('en anahtar kümesi tr ile birebir aynı', () => {
    const tr = Object.keys(STRINGS.tr).sort();
    const en = Object.keys(STRINGS.en).sort();

    expect(en).toEqual(tr);
  });

  it('varsayılan dil tr', () => {
    expect(DEFAULT_LOCALE).toBe('tr');
  });

  it('her tr metni dolu — boş bırakılmış anahtar yok', () => {
    for (const [key, value] of Object.entries(STRINGS.tr)) {
      expect(value, `tr.${key} boş`).not.toBe('');
    }
  });
});

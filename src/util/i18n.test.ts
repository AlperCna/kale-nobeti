import { describe, it, expect, afterEach } from 'vitest';
import { t, setLocale, getLocale } from './i18n';
import { STRINGS, DEFAULT_LOCALE } from '../data/strings';

describe('i18n', () => {
  // Etkin dil modül düzeyinde — bir test onu değiştirirse sonrakini
  // kirletir. `Settings` üretimde aynı yazıcıyı kullanıyor, bu yüzden
  // temizlik testin sorumluluğu.
  afterEach(() => {
    setLocale(DEFAULT_LOCALE);
  });

  it('varsayılan dilde metni döndürür', () => {
    expect(t('play')).toBe('Oyna');
    expect(t('pause')).toBe('Duraklat');
  });

  it('açıkça verilen dilde metni döndürür', () => {
    expect(t('play', 'en')).toBe('Play');
    expect(t('play', 'tr')).toBe('Oyna');
  });

  it('setLocale etkin dili değiştiriyor — çağrı yerleri dil bilmeden', () => {
    expect(getLocale()).toBe(DEFAULT_LOCALE);
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('play')).toBe('Play');
  });

  it('boş çeviride varsayılan dile düşer', () => {
    // `en` artık dolu (Y03 Adım 3), ama geri düşme yolu **yeni eklenen
    // anahtarlar için** hâlâ ağ: biri `en`'i unutursa oyuncu boş buton
    // değil Türkçe metin görmeli. Yol ancak boş bir değerle sınanabilir,
    // o yüzden geçici olarak boşaltılıyor.
    const asil = STRINGS.en.play;
    try {
      STRINGS.en.play = '';
      expect(t('play', 'en')).toBe('Oyna');
    } finally {
      STRINGS.en.play = asil;
    }
  });

  it('iki dilde de boş olan anahtar, anahtarın kendisini döndürür', () => {
    const asilTr = STRINGS.tr.play;
    const asilEn = STRINGS.en.play;
    try {
      STRINGS.tr.play = '';
      STRINGS.en.play = '';
      // Sessiz boş buton yerine görünür bir hata — eksik metin fark edilsin.
      expect(t('play', 'en')).toBe('play');
    } finally {
      STRINGS.tr.play = asilTr;
      STRINGS.en.play = asilEn;
    }
  });

  it('en anahtar kümesi tr ile birebir aynı', () => {
    const tr = Object.keys(STRINGS.tr).sort();
    const en = Object.keys(STRINGS.en).sort();

    expect(en).toEqual(tr);
  });

  it('geri düşme dili tr', () => {
    expect(DEFAULT_LOCALE).toBe('tr');
  });

  it('her tr metni dolu — boş bırakılmış anahtar yok', () => {
    for (const [key, value] of Object.entries(STRINGS.tr)) {
      expect(value, `tr.${key} boş`).not.toBe('');
    }
  });

  it('her en metni dolu — Y03 Adım 3 tamamlandı, yeni anahtar da boş kalmamalı', () => {
    for (const [key, value] of Object.entries(STRINGS.en)) {
      expect(value, `en.${key} boş`).not.toBe('');
    }
  });
});

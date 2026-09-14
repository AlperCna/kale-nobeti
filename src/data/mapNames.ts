/**
 * Harita adları — `Y03`'te `strings.ts`'e taşındı, `M10-T02`'de **tek**
 * yere toplandı.
 *
 * Tablo ve çözücü önce `LevelSelectScene`'in içinde yaşıyordu. Menüdeki
 * "Devam et" satırı da harita adını yazmak isteyince ikinci bir kopya
 * yazmak yerine buraya alındı: iki kopya sessizce ayrışır ve ayrışma
 * "seviye seçimde doğru ad, menüde ham kimlik" gibi görünür.
 *
 * TIER 1 kural 11: Phaser yok.
 */
import { t } from '../util/i18n';
import type { StringKey } from './strings';

const HARITA_ADI_ANAHTARI: Readonly<Record<string, StringKey>> = {
  'degirmen-gecidi': 'mapDegirmenGecidi',
  'tas-kopru': 'mapTasKopru',
  'kul-ovasi': 'mapKulOvasi',
  'kar-gecidi': 'mapKarGecidi',
  'kadim-harabe': 'mapKadimHarabe',
};

/** Bilinmeyen bir harita kimliği gelirse (olmaması gerekir) ham kimliğe düşer. */
export function haritaAdi(id: string): string {
  const anahtar = HARITA_ADI_ANAHTARI[id];
  return anahtar !== undefined ? t(anahtar) : id;
}

# M28 — Oyun oyuncuya eski kuralı öğretiyordu

> **Durum:** BİTTİ. Dengeye **dokunmadı** — yalnız oyuncuya görünen metin.

## Neden

`M27`'nin deseni (*"yeni sistem eklendi, ona dokunan eski liste
güncellendi mi"*) haritaların dışına da uygulandı ve **daha kötüsü**
çıktı: eksik bilgi değil, **yanlış** bilgi.

İki oyuncuya görünen metin `M16` **öncesi** dünyayı anlatıyordu:

| metin | yazdığı |
|---|---|
| `howTo6` | "Hazırlık sayacını erken bitirmek altın kazandırır." |
| `hintEarlyStart` | "Erken başlat, kalan süre altın olur" |

`M16`'dan önce bu **doğruydu** — erken basmanın bedeli yoktu (S102'nin
ölçümü: *"hiçbir bedeli yok, bu bir risk kararı değil, hazır olmanın
ödülü"*). `M16` dalgaları üst üste bindirdi ve ölçüm şunu söylüyor: hep
erken basmak harita 5-6'yı 20 canla **geçilemez** yapıyor.

Yani `M25`'te HUD'a takasın iki yakasını koyduktan sonra bile, oyunun
**öğretici metinleri** hâlâ yalnız ödülü anlatıyordu. Oyun kendi
ölçtüğü şeyin tersini öğretiyordu.

Ayrıca `M12` (yeraltı geçişi) ve `M13` (çağıran boss) "Nasıl oynanır"a
hiç girmemişti; `M10`'un kalkanı ve boss evresi `howTo8/9` ile
eklenmiş, sonrakiler atlanmıştı — aynı liste eskimesi.

## Yapılan

- `howTo6` ve `hintEarlyStart` takasın **iki yakasını** da söylüyor;
  `howTo6` ayrıca oyuncuyu HUD'daki iki sayıya yönlendiriyor (`M25`).
- `howTo10` eklendi: Tünelci'nin yeraltı geçişi ve çağıran boss.
- İpuçlarının tonu korundu — diğerleri (kalkan, yeraltı, uçan) zaten
  sonucu **ve** karşı-oyunu söylüyor; erken başlatma tek eksikti.

## Ölçülen yerleşim

On satır artı başlık ve geri düğmesi, 720 px'e sığıyor ve **hiçbir
çift çakışmıyor** (çalışma zamanında `getBounds()` ile tarandı). Son
içerik satırı 554'te bitiyor, geri düğmesi 669'da başlıyor — **115 px**
boşluk, yani fazladan bir sarma satırı (46 px) bile sığar.

İki yeni/uzun satırın İngilizcesi Türkçesinden **kısa** (142 < 146 ve
152 < 164 karakter), yani ölçülen Türkçe düzen en kötü hâl.

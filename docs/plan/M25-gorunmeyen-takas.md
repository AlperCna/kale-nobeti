# M25 — Erken başlatmanın kazancı görünmüyordu

> **Durum:** BİTTİ. Dengeye **dokunmadı** — yalnız arayüz.

## Neden

`M16` erken başlatmayı **gerçek bir risk kararı** yaptı: kalan süre
altına dönüyor ama sıradaki dalga artıkların üstüne biniyor. Ölçüm net
— hep basmak harita 5-6'yı 20 canla geçilemez yapıyor
(`hemen 0·3·11·16·30·44` ↔ `hic 0·0·3·6·11·25`).

Ama oyuncu o kararın **kazanç** tarafını hiçbir yerde göremiyordu.
Düğmede yalnız statik `t('startWave')` yazıyordu; bonus formülü
(`kalanSaniye × ceil(dalgaNo/2) × altınÇarpanı`) hiçbir ekranda yok.

Projenin kendi kuralı bunu zaten söylüyor — S93:
*"görünmeyen takas seçim değil, zar atışıdır."* Kural `M11`'de T3
dalları için uygulanmıştı; erken başlatma atlanmıştı.

## Yapılan

Düğmenin altında **canlı** bonus sayısı. Sayaç düştükçe eriyor, yani
"erken basmak daha çok altın" kuralını kendi kendine öğretiyor.

**Tek kaynak (S80 panzehiri).** Sayı `EconomySystem.earlyStartPreview`
üzerinden geliyor ve `awardEarlyStart` **de** onu çağırıyor. Ayrı bir
yerde hesaplansaydı en sinsi hâliyle yanlış olurdu: formül haritanın
**altın çarpanını** içeriyor (S101) ve çarpanı unutan bir arayüz
harita 6'da gerçeğin onda birini gösterirdi. Dört sağlama bunu bağlıyor.

**TIER 1 kural 7.** Etiket bir kez yazılıp değişmediği için `Text`
kalıyor; **değişen sayı** `BitmapText`.

## Bekçinin yakaladıkları

İki kez kırıldı ve ikisi de haklıydı:

1. Atama ile `.bitmapText(` **ayrı satırlardaydı** — `k.7` bekçisi
   alıcıyı izleyemiyor ve `setText`'i `Text` sanıyor.
2. `setText` bir `if (...)` ekinin arkasındaydı — bekçi alıcıyı satır
   başından çıkarıyor, önek onu izlenemez yapıyor.

İkisi de tek satırlık düzeltmeydi ama kuralın gerçekten çalıştığını
gösteriyor: k.7'yi sessizce delmek mümkün değil.

## Ölçülen yerleşim

Sayı fontunun doğal boyu 32 px ve düğme 52 px: doğal boyda bırakılınca
parşömenin **altından taşıyordu** (sayı 80-112, düğme 56-108). 20 px'e
indirildi — Platform'un 16 px alt sınırının üstünde. Son ölçüm:

| öğe | dikey aralık |
|---|---|
| düğme | 56-108 |
| etiket "Dalgayı başlat" | 59-78 |
| bonus "+140" | **84-104** |

Taşma yok, etiketle 6 px boşluk. Tarayıcıda canlı görüldü: dalga 4'te
"+32" yazıyor ve sayaçla birlikte eriyor.

## Bu planın YAPMADIĞI şeyler

- **Riski de yazmak** — "sıradaki dalga üstüne binecek" uyarısı ayrı
  bir tasarım kararı; bu taş yalnız **ölçülebilir** kazancı gösteriyor.
- **Dengeye dokunmak** — sahibin açık talebi.

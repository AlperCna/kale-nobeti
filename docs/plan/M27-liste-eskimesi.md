# M27 — Harita 6 iki sağlama listesinde daha yoktu

> **Durum:** BİTTİ. Dengeye **dokunmadı** — rampa `0·0·6·12·13·12`
> ölçümle aynı kaldı.

## Neden bu taş

`M26`'da bir desen not edilmişti ve bu sefer **bilerek** arandı:

> *Yeni bir sistem eklerken, ona dokunan hangi eski kural veya liste
> var?*

`MAP_5` geçip `MAP_6` geçmeyen dosyalar tarandı; dördü çıktı, ikisi
gerçek sağlama listesiydi:

| dosya | harita 6 neyi kaçırıyordu |
|---|---|
| `waves.test.ts` | bütçe bandı, kadro üyeliği, havuz kapasitesi, "boss yalnız dalga 10'da", artan `startAt`, nefes kuralı |
| `bossScaling.test.ts` | zırh tablosu, HP kilidi, tavan akıl sağlığı, karşılanabilirlik, "boss dışındaki düşmanlar değişmedi" |

`waves.test`'in başlığı hâlâ **"50 dalga"** diyordu; altı harita × 10 =
**60**. Yani Sisli Bataklık'ın on dalgası `M12`'den beri hiç
denetlenmemişti ve `M13`'ün **çağıran bossu** hiçbir boss sağlamasından
geçmemişti.

Bu S114 (`kisitB`) ve S119 (`aileDengesi`) ile aynı sınıf — **üçüncü ve
dördüncü tekrar**.

## Eklenince ne çıktı

Boss tarafı **temiz** geçti.

Dalga tarafı bir gerçek kusur gösterdi (S127): harita 6'nın **nefes
dalgası** (4) `orkSavasci`yi ilk kez orada tanıtıyor, oysa §7 *"nefes
dalgalarında yeni tip tanıtılmaz"* diyor.

## Neden düzeltilmedi

Düzeltmenin bedeli ölçüldü ve **denge turu** gerektiriyor:

| dalga 4 | puan | harita 6 can kaybı |
|---|---|---|
| ork3 + tünelci3 (bugünkü) | 15 | **12** |
| goblin6 + tünelci3 | 15 | 19 |
| tünelci5 | 15 | **20** |
| goblin3 + tünelci4 | 15 | **20** |

Sebep ekonomi: Ork Savaşçı aynı puana daha çok **altın** getiriyor;
onu çıkarmak tahtayı tur boyunca zayıflatıyor. Son iki seçenek
doğrudan "hepsi < 20" bandının dışına taşıyor.

Sahip "dengeye dokunma" dediği için kusur **kayda geçirildi** ve tek o
sağlama harita 6 için gerekçesiyle kapsam dışı bırakıldı — sessizce
atlanmadı. Harita 6 **diğer bütün** sağlamalara girdi.

## Ders

Liste sessizce eskiyor ve eskidiğini yalnız ihlal ortaya çıkınca
anlıyoruz. Dört kez tekrarlandı; artık yeni harita/sistem eklerken
onu **numaralayan bütün listeleri** aramak refleks olmalı.

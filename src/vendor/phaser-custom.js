/* eslint-disable */
/**
 * Phaser 3 **özel yapımı** — `Y11`.
 *
 * Phaser'ın kendi `src/phaser-core.js` çekirdeğinden başlayıp bu projenin
 * gerçekten kullandığı modülleri geri ekler. Çekirdek fizik (Arcade +
 * Matter), Tilemaps, Actions, Create, Curves ve fazla Cameras/Display
 * taşımıyor — `CLAUDE.md` Teknoloji bölümü bunların hiçbirinin
 * kullanılmadığını zaten yazılı olarak söylüyor.
 *
 * ## Neden `phaser-core.js` olduğu gibi kullanılamıyordu
 *
 * `Y11`'in bulgusu doğru: çekirdek yalnız beş oyun nesnesi taşıyor
 * (`Graphics`, `Image`, `Layer`, `Sprite`, `Text`) ve bu proje yedi tane
 * daha kullanıyor. Aşağıdaki liste **taranarak** çıkarıldı, tahminle
 * değil — `.add.*` çağrıları ve `Phaser.*` referansları sayıldı:
 *
 * | Geri eklenen | Neden | Kullanım |
 * |---|---|---|
 * | `Rectangle` | perde, panel zemini, şerit | `.add.rectangle` ×22 |
 * | `Container` | menü, yetenek, kartuş | `.add.container` ×14 |
 * | `Group` | TIER 1 kural 3 havuzları | `.add.group` ×6 |
 * | `BitmapText` | TIER 1 kural 7 değişen metin | `.add.bitmapText` ×2 |
 * | `Arc` | menzil/işaret çemberi | `.add.circle` ×1 |
 * | `TileSprite` | `ParchmentFrame` kenar dokusu | `.add.tileSprite` ×1 |
 * | `Particles` | §10 juice | `.add.particles` ×1 |
 * | `BitmapFontFile` | `load.bitmapFont` | Boot |
 * | `Geom.Rectangle` | `setInteractive` isabet alanı | 2 yer |
 * | `Display.Color` | `HexStringToColor` | 2 yer |
 * | `Math.Clamp` | çekirdek 5 fonksiyon taşıyor, bu yok | 4 yer |
 *
 * ## Bu dosya elle bakımlı bir kopya DEĞİL
 *
 * `Y11` "elle üretilip depoya atılan bir `phaser-custom.js` kabul
 * edilmez" diyordu ve haklıydı — ama kastettiği, **derlenmiş bir paketi**
 * depoya atmaktı. Bu dosya derlenmiş çıktı değil, bir **giriş modülü**:
 * Phaser'ın kaynak ağacından `import` ediyor ve her build'de Vite
 * tarafından yeniden derleniyor. Phaser yamalandığında bayatlayacak bir
 * artefakt yok; `npm install` yeni sürümü getirir, sonraki build onu
 * paketler. Ayrı bir webpack adımına da gerek kalmadı.
 *
 * ## Nasıl kırılır
 *
 * Bir modül eksik kalırsa `npm run typecheck` **YEŞİL** geçer — tipler
 * `phaser/types`'tan geliyor, çalışma zamanından değil — ve oyun
 * tarayıcıda o kod yolu oynanınca çöker. Testler de göremez (`node`
 * ortamı Phaser çalıştırmıyor, S08). Tek gerçek sağlaması **elle tam
 * tur**; `Y11`'in "bitmedi sayılır eğer" maddesi bu.
 *
 * Fabrika dosyaları (`*Factory.js`) `GameObjectFactory.register(...)`
 * çağrısını kendi içinde yapıyor — yani onları `import` etmek
 * `scene.add.*` üstüne bağlamaya yetiyor. Sınıfın ayrıca
 * `Phaser.GameObjects` altına konması `instanceof` ve doğrudan `new`
 * kullanan yerler için gerekli; ikisi ayrı iş.
 */

import Phaser from 'phaser/src/phaser-core.js';

//  ------------------------------------------------------- oyun nesneleri
import Shape from 'phaser/src/gameobjects/shape/Shape';
import Rectangle from 'phaser/src/gameobjects/shape/rectangle/Rectangle';
import Arc from 'phaser/src/gameobjects/shape/arc/Arc';
import Container from 'phaser/src/gameobjects/container/Container';
import Group from 'phaser/src/gameobjects/group/Group';
import BitmapText from 'phaser/src/gameobjects/bitmaptext/static/BitmapText';
import TileSprite from 'phaser/src/gameobjects/tilesprite/TileSprite';
import Particles from 'phaser/src/gameobjects/particles';

//  ------------------------------------------------ fabrikalar/üreticiler
//  **Yan etki import'ları — bunların dışa aktardığı bir şey YOK.** Her
//  dosya yalnızca `GameObjectFactory.register('rectangle', ...)` (ya da
//  `GameObjectCreator.register`) çağırıyor ve o çağrı `scene.add.*` /
//  `scene.make.*` üstüne bağlanmayı sağlıyor. `import X from` yazmak
//  "default is not exported" ile derlemeyi durduruyor — Phaser'ın kendi
//  `phaser.js`'i CJS'te `require(...)` edip sonucu `Factories` altına
//  koyuyor ama o sonuç boş nesne; taklit etmenin bir değeri yok.
//
//  Bu import'lar olmadan `.add.rectangle` "is not a function" ile
//  patlar — ve `npm run typecheck` bunu göremez.
import 'phaser/src/gameobjects/shape/rectangle/RectangleFactory';
import 'phaser/src/gameobjects/shape/arc/ArcFactory';
import 'phaser/src/gameobjects/container/ContainerFactory';
import 'phaser/src/gameobjects/group/GroupFactory';
import 'phaser/src/gameobjects/bitmaptext/static/BitmapTextFactory';
import 'phaser/src/gameobjects/tilesprite/TileSpriteFactory';
import 'phaser/src/gameobjects/particles/ParticleEmitterFactory';
import 'phaser/src/gameobjects/container/ContainerCreator';
import 'phaser/src/gameobjects/group/GroupCreator';
import 'phaser/src/gameobjects/bitmaptext/static/BitmapTextCreator';
import 'phaser/src/gameobjects/tilesprite/TileSpriteCreator';
import 'phaser/src/gameobjects/particles/ParticleEmitterCreator';

//  ------------------------------------------------- yükleyici dosya tipi
//  Çekirdek `atlas`, `audio`, `image`, `xml` taşıyor; `bitmapFont` yok.
//  Sayı fontu bitmap font (TIER 1 kural 7 + GAME-DESIGN §2 Tipografi),
//  yani bu import olmadan `BootScene` hiçbir sayı basamıyor.
import BitmapFontFile from 'phaser/src/loader/filetypes/BitmapFontFile';

//  ------------------------------------------------------------ ad alanları
//  Çekirdek `Geom`'u hiç taşımıyor, `Display`'den yalnız `Masks` alıyor,
//  `Math`'i beş fonksiyonla sınırlıyor. Aşağıdakiler taramada kullanıldığı
//  görülen parçalar — tam ad alanını almak kesilenlerin çoğunu geri
//  getirirdi.
import GeomRectangle from 'phaser/src/geom/rectangle/Rectangle';
import GeomRectangleContains from 'phaser/src/geom/rectangle/Contains';
import GeomCircle from 'phaser/src/geom/circle/Circle';
import GeomCircleContains from 'phaser/src/geom/circle/Contains';
import Color from 'phaser/src/display/color';
import Clamp from 'phaser/src/math/Clamp';
import Linear from 'phaser/src/math/Linear';
import Wrap from 'phaser/src/math/Wrap';
import Distance from 'phaser/src/math/distance';
import Easing from 'phaser/src/math/easing';
import RandomDataGenerator from 'phaser/src/math/random-data-generator/RandomDataGenerator';

Phaser.GameObjects.Shape = Shape;
Phaser.GameObjects.Rectangle = Rectangle;
Phaser.GameObjects.Arc = Arc;
Phaser.GameObjects.Container = Container;
Phaser.GameObjects.Group = Group;
Phaser.GameObjects.BitmapText = BitmapText;
Phaser.GameObjects.TileSprite = TileSprite;
Phaser.GameObjects.Particles = Particles;

Phaser.Loader.FileTypes.BitmapFontFile = BitmapFontFile;

Phaser.Geom = { Rectangle: GeomRectangle, Circle: GeomCircle };
Phaser.Geom.Rectangle.Contains = GeomRectangleContains;
Phaser.Geom.Circle.Contains = GeomCircleContains;

Phaser.Display.Color = Color;

Phaser.Math.Clamp = Clamp;
Phaser.Math.Linear = Linear;
Phaser.Math.Wrap = Wrap;
Phaser.Math.Distance = Distance;
Phaser.Math.Easing = Easing;
Phaser.Math.RandomDataGenerator = RandomDataGenerator;

export default Phaser;

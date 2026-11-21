import Phaser from 'phaser';
import { SceneKeys } from '../../core/constants';
import { Win10StageScene, type HubReturn } from './shared/Win10StageScene';
import { drawWindow, TURQUOISE, UI_FONT } from './shared/Win10Theme';

type PictureKind = 'Mountain' | 'Cat' | 'Gem';
interface Picture {
  kind: PictureKind;
  x: number;
  top: number;
  angle: number;
  moving: boolean;
  image: Phaser.GameObjects.Container;
}

export default class Win10GalleryScene extends Win10StageScene {
  private pictures: Picture[] = [];
  private swatch?: Phaser.GameObjects.Container;

  constructor() { super(SceneKeys.Win10Gallery); }

  create(data: Partial<HubReturn> = {}): void {
    this.setupApp('Photos', data);
    drawWindow(this, 'Photos  /  Gallery');
    this.add.text(49, 103, 'E  Rotate a picture     ·     ←  Return to desktop', {
      fontFamily: UI_FONT, fontSize: '14px', color: '#425d77',
    });
    this.addDoor();
    this.swatch = undefined;
    this.pictures = [this.makePicture('Mountain', 173, 415),
      this.makePicture('Cat', 396, 350), this.makePicture('Gem', 620, 394)];
    if (!this.inventory.turquoise) void this.helper.say('Something about that one looks… upside down.');
  }

  private makePicture(kind: PictureKind, x: number, top: number): Picture {
    const y = top + 64;
    this.add.rectangle(x, y, 178, 128, 0xd8e6f2).setStrokeStyle(4, 0x6d879f);
    const art = this.add.graphics();
    art.fillStyle(kind === 'Cat' ? 0xf2d4b9 : 0x9cd4e9).fillRect(-57, -57, 114, 114);
    if (kind === 'Mountain') {
      art.fillStyle(0xffe396).fillCircle(32, -33, 12);
      art.fillStyle(0x426385).fillTriangle(-57, 42, -10, -35, 43, 42)
        .fillTriangle(-5, 42, 32, -19, 57, 42);
      art.fillStyle(0xe8f7ff).fillTriangle(-25, -10, -10, -35, 8, -9);
      art.fillStyle(0x427786).fillRect(-57, 41, 114, 16);
    } else if (kind === 'Cat') {
      art.fillStyle(0xb95538).fillTriangle(-28, -3, -36, -41, -4, -15)
        .fillTriangle(28, -3, 36, -41, 4, -15).fillEllipse(0, 5, 74, 66);
      art.fillStyle(0xffd4a7).fillEllipse(0, 15, 46, 31);
      art.fillStyle(0x502c32).fillCircle(-14, 1, 4).fillCircle(14, 1, 4).fillTriangle(-4, 9, 4, 9, 0, 15);
    } else {
      art.fillStyle(0x163a59).fillRect(-57, -57, 114, 114);
      art.fillStyle(TURQUOISE).fillTriangle(-40, -9, 40, -9, 0, 43)
        .fillRect(-26, -32, 52, 23).fillTriangle(-40, -9, -26, -32, -26, -9)
        .fillTriangle(40, -9, 26, -32, 26, -9);
      art.fillStyle(0x98f5e3).fillTriangle(-16, -9, 16, -9, 0, 43).fillTriangle(-16, -9, 0, -29, 16, -9);
    }
    this.add.text(x, y + 49, kind, { fontFamily: UI_FONT, fontSize: '12px', color: '#334e68',
      backgroundColor: '#eaf3fb', padding: { x: 5, y: 1 } }).setOrigin(0.5).setDepth(3);
    const angle = kind === 'Gem' && !this.inventory.turquoise ? 180 : 0;
    const image = this.add.container(x, y - 3, [art]).setAngle(angle);
    this.platform(x, top, 178);
    this.add.rectangle(x + 57, top - 15, 30, 29, 0x285b87).setStrokeStyle(1, 0x83b6dc);
    this.add.text(x + 57, top - 16, '⟳', { fontFamily: UI_FONT, fontSize: '21px' }).setOrigin(0.5);
    return { kind, x, top, angle, moving: false, image };
  }

  private reveal(picture: Picture): void {
    const x = picture.x - 30;
    const y = picture.top - 39;
    for (let i = 0; i < 8; i++) {
      const star = this.add.star(picture.x, picture.top + 35, 4, 2, 7, 0x9cfff1).setDepth(45);
      const angle = (i / 8) * Math.PI * 2;
      this.tweens.add({ targets: star, x: star.x + Math.cos(angle) * 60,
        y: star.y + Math.sin(angle) * 54, alpha: 0, duration: 480, onComplete: () => star.destroy() });
    }
    const swatch = this.add.container(picture.x, picture.top + 31, [
      this.add.rectangle(0, 0, 24, 24, TURQUOISE).setStrokeStyle(2, 0xb9fff3).setAngle(45),
      this.add.text(0, -20, 'Turquoise', { fontFamily: UI_FONT, fontSize: '12px', color: '#155762',
        backgroundColor: '#e6fffa' }).setOrigin(0.5),
    ]).setDepth(40);
    this.swatch = swatch;
    this.tweens.add({ targets: swatch, x, y, duration: 490, ease: 'Back.easeOut' });
  }

  protected play(): void {
    this.checkDoor();
    if (this.departing) return;
    if (this.swatch && this.near(this.swatch.x, this.swatch.y, 25, 28)) {
      this.tweens.killTweensOf(this.swatch);
      this.swatch.destroy();
      this.swatch = undefined;
      this.collect('Turquoise swatch', { turquoise: true });
      void this.helper.say('Diamond-ish turquoise. Remember that colour.');
    }
    if (!this.player.justPressed('interact')) return;
    const picture = this.pictures.find(({ x, top }) => this.near(x + 57, top - 21, 29, 32));
    if (!picture || picture.moving) return;
    picture.moving = true;
    this.tweens.add({
      targets: picture.image, angle: picture.image.angle + 90, duration: 250, ease: 'Sine.easeInOut',
      onComplete: () => {
        picture.moving = false;
        picture.angle = (picture.angle + 90) % 360;
        if (picture.kind === 'Gem' && picture.angle === 0 && !this.inventory.turquoise && !this.swatch) this.reveal(picture);
      },
    });
  }
}

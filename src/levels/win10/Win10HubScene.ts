import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '../../core/constants';
import { ensureTexture } from '../../core/art';
import { sfx } from '../../core/sfx';
import { Win10StageScene, type HubReturn } from './shared/Win10StageScene';
import { appTexture, UI_FONT, WIN10_FLOOR, type AppIcon } from './shared/Win10Theme';

interface DesktopApp {
  icon: AppIcon;
  name: string;
  hint: string;
  x: number;
  y: number;
  scene?: SceneKey;
}

const APPS: DesktopApp[] = [
  { icon: 'photos', name: 'Photos', x: 192, y: 474, scene: SceneKeys.Win10Gallery,
    hint: 'Photos — where 4,000 blurry screenshots live.' },
  { icon: 'paint', name: 'Paint', x: 510, y: 448, scene: SceneKeys.Win10Paint,
    hint: 'Paint — art, but with more jagged edges.' },
  { icon: 'word', name: 'Word', x: 853, y: 468, scene: SceneKeys.Win10Word,
    hint: 'Word — the page is blank. The pressure is real.' },
  { icon: 'explorer', name: 'Explorer', x: 1173, y: 435,
    hint: 'Explorer… is it looking at you?' },
  { icon: 'bin', name: 'Recycle Bin', x: 1460, y: 486,
    hint: "You've been in there before." },
];

interface CoinMiner {
  art: Phaser.GameObjects.Container;
  start: number;
  end: number;
  direction: 1 | -1;
}

export default class Win10HubScene extends Win10StageScene {
  private coins: CoinMiner[] = [];
  private arrow!: Phaser.GameObjects.Graphics;
  private cpu!: Phaser.GameObjects.Text;
  private action!: Phaser.GameObjects.Text;

  constructor() { super(SceneKeys.Win10Hub); }

  create(data: Partial<HubReturn> = {}): void {
    this.setupStage('Desktop', data, 1600);
    this.coins = [];
    const next = this.nextApp();
    for (const app of APPS) {
      this.add.rectangle(app.x, app.y + 5, 158, 10, 0x6eaddd, 0.72).setStrokeStyle(1, 0xc5efff);
      this.platform(app.x, app.y, 158);
      this.add.image(app.x, app.y - 43, appTexture(this, app.icon)).setAlpha(this.unlocked(app) ? 1 : 0.63);
      this.add.text(app.x, app.y + 15, app.name, {
        fontFamily: UI_FONT, fontSize: '15px', color: '#ebf6ff', fontStyle: 'bold', stroke: '#142a4d', strokeThickness: 4,
      }).setOrigin(0.5, 0);
      if (app === next) this.add.rectangle(app.x, app.y - 43, 66, 66).setStrokeStyle(2, 0x89f3e6);
      this.drawBadge(app);
      this.helper.addProximityHint(app.icon, { x: app.x, y: app.y - 20 }, 90, app.hint);
    }
    this.addPatrol(340, 433, 151);
    this.addPatrol(685, 441, 153);
    this.addPatrol(1034, 457, 151);

    this.arrow = this.add.graphics().setDepth(55);
    this.arrow.fillStyle(0xffffff).fillTriangle(17, 0, 1, -8, 1, 8).fillRect(-10, -3, 15, 6);
    this.cpu = this.add.text(0, 0, 'CPU 100%', {
      fontFamily: UI_FONT, fontSize: '11px', backgroundColor: '#25324d', color: '#ffd485', padding: { x: 4, y: 2 },
    }).setDepth(53).setOrigin(0.5, 1).setVisible(false);
    this.action = this.add.text(0, 0, '', {
      fontFamily: UI_FONT, fontSize: '12px', backgroundColor: '#152744', padding: { x: 7, y: 4 },
    }).setDepth(54).setOrigin(0.5).setVisible(false);
    if (!data.spawnX) void this.helper.say('Follow Pointer to Photos. Jump onto its tile and press E.', { holdMs: 4000 });
  }

  private nextApp(): DesktopApp {
    if (!this.inventory.turquoise) return APPS[0];
    if (!this.inventory.armour || !this.inventory.sword || !this.inventory.shield) return APPS[1];
    if (!this.inventory.wordDone) return APPS[2];
    return APPS[3];
  }

  private unlocked(app: DesktopApp): boolean {
    if (app.icon === 'paint') return this.inventory.turquoise;
    if (app.icon === 'word') return this.inventory.armour && this.inventory.sword && this.inventory.shield;
    if (app.icon === 'explorer') return this.inventory.wordDone;
    return true;
  }

  private drawBadge(app: DesktopApp): void {
    const x = app.x + 28;
    const y = app.y - 64;
    const done = (app.icon === 'photos' && this.inventory.turquoise) ||
      (app.icon === 'paint' && this.inventory.armour && this.inventory.sword && this.inventory.shield) ||
      (app.icon === 'word' && this.inventory.wordDone);
    if (done) {
      this.add.circle(x, y, 10, 0x12674e);
      this.add.text(x, y, '✓', { fontFamily: UI_FONT, fontSize: '13px' }).setOrigin(0.5);
    } else if (!this.unlocked(app)) {
      this.add.graphics().lineStyle(2, 0xd7e6f6).strokeRoundedRect(x - 4, y - 9, 8, 11, 4)
        .fillStyle(0x20334e).fillRoundedRect(x - 8, y - 3, 16, 13, 3)
        .fillStyle(0xd7e6f6).fillCircle(x, y + 3, 2);
    }
  }

  private addPatrol(x: number, y: number, width: number): void {
    this.add.rectangle(x, y + 4, width, 7, 0x446d99);
    this.platform(x, y, width);
    const bug = this.add.graphics().lineStyle(2, 0x8f5825);
    for (const leg of [-1, 1]) {
      bug.lineBetween(leg * 11, 0, leg * 18, -5).lineBetween(leg * 11, 6, leg * 18, 9);
    }
    bug.fillStyle(0xffc750).fillCircle(0, 0, 12).lineStyle(2, 0xa2602a).strokeCircle(0, 0, 10)
      .lineBetween(0, -5, 0, 5).fillStyle(0x684023).fillCircle(-5, -5, 1.6).fillCircle(5, -5, 1.6);
    this.coins.push({ art: this.add.container(x, y - 12, [bug]), start: x - width / 2 + 16,
      end: x + width / 2 - 16, direction: 1 });
  }

  protected movementScale(): number {
    return this.coins.some(({ art }) => Phaser.Math.Distance.Between(art.x, art.y, this.player.sprite.x, this.player.sprite.y) <= 120)
      ? 0.8 : 1;
  }

  protected play(time: number, delta: number): void {
    const p = this.player.sprite;
    const next = this.nextApp();
    const angle = Phaser.Math.Angle.Between(p.x, p.y, next.x, next.y - 25);
    this.arrow.setPosition(Phaser.Math.Clamp(p.x + 60 * Math.cos(angle), 20, 1580),
      Phaser.Math.Clamp(p.y + 60 * Math.sin(angle) + Math.sin(time / 250) * 5, 48, WIN10_FLOOR - 28))
      .setRotation(angle);
    this.cpu.setPosition(p.x, p.y - 29).setVisible(this.movementScale() < 1);
    this.updateCoins(delta);
    if (this.dead) return;

    const app = APPS.find(({ x, y }) => this.near(x, y - 30, 51, 37));
    this.action.setVisible(Boolean(app?.scene));
    if (!app) return;
    this.action.setPosition(app.x, app.y - 91).setText(this.unlocked(app) ? 'E  Open' : 'E  Locked');
    if (!this.player.justPressed('interact')) return;
    if (!this.unlocked(app)) {
      const hints = { paint: 'find the turquoise swatch in Photos.', word: 'finish gearing up in Paint.',
        explorer: 'leave your mark in Word.', photos: '', bin: '' };
      void this.helper.say(`Not yet — ${hints[app.icon]}`, { holdMs: 2800 });
      return;
    }
    if (!app.scene) return;
    const scene = app.scene;
    this.departing = true;
    this.player.setControlsEnabled(false);
    p.setVelocityX(0);
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.pan(app.x, app.y - 43, 320, 'Sine.easeInOut');
    camera.zoomTo(2, 320, 'Sine.easeInOut');
    this.time.delayedCall(320, () => this.goTo(scene, { spawnX: app.x + 57, spawnY: app.y - 24 }));
  }

  private updateCoins(delta: number): void {
    const hitbox = this.combat.hitbox;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.art.x = Phaser.Math.Clamp(coin.art.x + coin.direction * 60 * delta / 1000, coin.start, coin.end);
      if (coin.art.x === coin.start || coin.art.x === coin.end) coin.direction = coin.art.x === coin.start ? 1 : -1;
      const target = new Phaser.Geom.Rectangle(coin.art.x - 13, coin.art.y - 12, 26, 24);
      if (hitbox && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, target)) {
        this.popCoin(coin);
        this.coins.splice(i, 1);
      } else if (this.near(coin.art.x, coin.art.y, 25, 32) && !this.combat.blocks(coin.art.x)) {
        this.hurtPlayer('coinminer');
      }
    }
  }

  private popCoin(coin: CoinMiner): void {
    const texture = ensureTexture(this, 'win10-coin-pixel', 4, 4, (g) => { g.fillStyle(0xffc750).fillRect(0, 0, 4, 4); });
    const particles = this.add.particles(coin.art.x, coin.art.y, texture, {
      emitting: false, speed: { min: 35, max: 115 }, lifespan: 360, gravityY: 145, alpha: { start: 1, end: 0 },
    });
    particles.explode(12);
    this.time.delayedCall(400, () => particles.destroy());
    coin.art.destroy();
    sfx('collect');
  }
}

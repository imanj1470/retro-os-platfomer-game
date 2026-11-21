import Phaser from 'phaser';
import { sfx } from '../../../core/sfx';
import { oneWay, solid } from './XpScene';

const TITLE_HEIGHT = 30;
const EXIT_WIDTH = 92;

export interface AppWindowConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  texture?: string;
  expansion?: number;
}

export class AppWindow {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly view: Phaser.GameObjects.Container;
  private readonly status: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;
  private readonly bodies: ReturnType<typeof solid>[] = [];
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = [];
  private movingEdges: ReturnType<typeof solid>[] = [];
  private width: number;
  private expanded = false;
  private readonly scene: Phaser.Scene;
  readonly config: AppWindowConfig;

  constructor(scene: Phaser.Scene, config: AppWindowConfig) {
    this.scene = scene;
    this.config = config;
    this.width = config.width;
    this.frame = scene.add.graphics();
    this.status = scene.add.text(0, 6, '', {
      fontFamily: 'Tahoma', fontSize: '14px', color: '#ffffff',
    }).setOrigin(1, 0);
    this.closeButton = scene.add.text(0, 4, '×', {
      fontFamily: 'Tahoma', fontSize: '18px', fontStyle: 'bold', backgroundColor: '#d84c31',
      padding: { x: 6, y: 0 },
    });
    this.view = scene.add.container(config.x, config.y, [
      this.frame,
      scene.add.text(12, 6, config.title, { fontFamily: 'Tahoma', fontSize: '15px', fontStyle: 'bold' }),
      this.status,
      this.closeButton,
    ]).setDepth(10);
    this.draw();
    this.view.setAlpha(0);
    scene.tweens.add({ targets: this.view, alpha: 1, duration: 150 });
    sfx('windowOpen');
  }

  get right(): number { return this.config.x + this.width; }
  get top(): number { return this.config.y; }

  private get opening(): number {
    return this.width - EXIT_WIDTH - 8;
  }

  private draw(): void {
    const { height, texture, expansion } = this.config;
    this.frame.clear()
      .fillStyle(0xfcf8e9).fillRect(0, TITLE_HEIGHT, this.width, height - TITLE_HEIGHT)
      .lineStyle(4, 0x145bd7).lineBetween(2, TITLE_HEIGHT, 2, height)
      .lineBetween(this.width - 2, TITLE_HEIGHT, this.width - 2, height)
      .lineBetween(0, height - 2, this.width, height - 2)
      .fillStyle(0x145bd7);
    if (texture && (!expansion || this.expanded)) {
      this.frame.fillRect(0, 0, this.opening, TITLE_HEIGHT)
        .fillRect(this.width - 8, 0, 8, TITLE_HEIGHT)
        .fillStyle(0x368c3a, 0.85).fillRect(this.opening, 0, EXIT_WIDTH, 24);
    } else {
      this.frame.fillRect(0, 0, this.width, TITLE_HEIGHT);
    }
    this.status.setX(texture ? this.opening - 8 : this.width - 38);
    this.closeButton.setX(texture ? this.opening + 64 : this.width - 29);
  }

  setStatus(text: string, urgent = false): void {
    this.status.setText(text).setColor(urgent ? '#ffdd83' : '#ffffff');
  }

  pulse(strength: number): void {
    this.frame.setAlpha(strength);
  }

  closeNow(body: Phaser.Physics.Arcade.Body): boolean {
    const caught = body.left >= this.config.x && body.right <= this.right &&
      body.top >= this.top && body.bottom <= this.top + this.config.height;
    this.close();
    return caught;
  }

  confine(player: Phaser.Physics.Arcade.Sprite): void {
    const { x, y, width, height } = this.config;
    this.addWall(player, x, y, 8, height);
    this.updateEdges(player);
    this.addIcon(player, 72, height - 82, 'Recent files');
    this.addIcon(player, width - 82, height - 166, 'Documents');
    if (this.config.expansion) {
      this.addIcon(player, 130, height - 250, 'Templates');
    } else {
      this.addIcon(player, width - 53, height - 250, 'Exit ↑');
    }
  }

  tryExpand(player: Phaser.Physics.Arcade.Sprite, delta: number): void {
    const { width, expansion, y, height } = this.config;
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (!expansion || this.expanded || body.velocity.x <= 0 ||
      body.right < this.right - 13 || player.y < y + TITLE_HEIGHT || player.y > y + height) return;

    this.width = Math.min(width + expansion, this.width + delta * 0.13);
    this.expanded = this.width >= width + expansion;
    this.draw();
    this.updateEdges(player);
    if (this.expanded) this.addIcon(player, this.width - 54, height - 250, 'Exit ↑');
  }

  private addWall(player: Phaser.Physics.Arcade.Sprite, x: number, y: number, w: number, h: number) {
    const edge = solid(this.scene, x, y, w, h);
    this.bodies.push(edge);
    this.colliders.push(this.scene.physics.add.collider(player, edge));
    return edge;
  }

  private updateEdges(player: Phaser.Physics.Arcade.Sprite): void {
    for (const edge of this.movingEdges) {
      const index = this.bodies.indexOf(edge);
      this.colliders.splice(index, 1)[0].destroy();
      this.bodies.splice(index, 1)[0].destroy();
    }

    const { x, y, height, expansion } = this.config;
    this.movingEdges = [
      this.addWall(player, this.right - 8, y, 8, height),
      this.addWall(player, x, y + height - 8, this.width, 8),
      this.addWall(player, x, y, expansion && !this.expanded ? this.width : this.opening, TITLE_HEIGHT),
    ];
  }

  private addIcon(player: Phaser.Physics.Arcade.Sprite, x: number, y: number, label: string): void {
    const { platform, collider } = oneWay(this.scene, player, this.config.x + x - 32, this.top + y, 64);
    this.bodies.push(platform);
    this.colliders.push(collider);
    this.view.add([
      this.scene.add.image(x, y + 13, this.config.texture!).setDisplaySize(32, 32),
      this.scene.add.text(x, y + 29, label, {
        fontFamily: 'Tahoma', fontSize: '12px', color: '#203660',
      }).setOrigin(0.5, 0),
    ]);
  }

  close(): void {
    for (const collider of this.colliders) collider.destroy();
    for (const body of this.bodies) body.destroy();
    sfx('windowClose');
    this.scene.tweens.killTweensOf(this.view);
    this.scene.tweens.add({ targets: this.view, alpha: 0, scale: 0.93, duration: 220,
      onComplete: () => this.view.destroy() });
  }
}

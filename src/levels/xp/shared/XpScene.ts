import Phaser from 'phaser';
import { BaseLevelScene } from '../../../core/BaseLevelScene';
import { GAME_WIDTH, GAME_HEIGHT } from '../../../core/constants';
import { Helper } from '../../../core/Helper';
import { HUD } from '../../../core/HUD';
import { TextPrompt } from '../../../core/TextPrompt';
import { getDeaths } from '../../../core/state';

export const XP_FLOOR = GAME_HEIGHT - 32;
const SPAWN_X = 70;
const SPAWN_Y = XP_FLOOR - 30;

export function solid(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const zone = scene.add.zone(x, y, w, h).setOrigin(0);
  scene.physics.add.existing(zone, true);
  return zone as Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.StaticBody };
}

export function oneWay(
  scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite, x: number, y: number, w: number,
  passThrough?: () => boolean,
) {
  const platform = solid(scene, x, y, w, 12);
  const faces = platform.body.checkCollision;
  faces.down = faces.left = faces.right = false;
  const collider = scene.physics.add.collider(player, platform, undefined, () => {
    const body = player.body as Phaser.Physics.Arcade.Body;
    return !passThrough?.() && body.velocity.y >= 0 && body.prev.y + body.height <= y + 1;
  });
  return { platform, collider };
}

export abstract class XpScene extends BaseLevelScene {
  protected readonly levelId = 'xp' as const;
  protected dying = false;
  protected get respawnDelay(): number { return 850; }
  private bin!: Phaser.GameObjects.Container;
  private binLabel!: Phaser.GameObjects.Text;
  private countDeaths = false;

  protected createDesktop(countDeaths = false): void {
    this.dying = false;
    this.countDeaths = countDeaths;
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x3a6ee8);
    this.add.image(0, 0, 'windowsxp-bg').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-10);
    this.add.rectangle(0, XP_FLOOR, GAME_WIDTH, 32, 0x145bd7).setOrigin(0);
    this.add.rectangle(0, XP_FLOOR, 82, 32, 0x358820).setOrigin(0);
    this.add.text(19, XP_FLOOR + 6, 'start', { fontFamily: 'Tahoma', fontStyle: 'bold italic' });
    this.add.text(786, XP_FLOOR + 7, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      { fontFamily: 'Tahoma', fontSize: '14px' }).setOrigin(1, 0);

    this.helper = new Helper(this, 'xp');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'xp');
    this.spawnPlayer(SPAWN_X, SPAWN_Y, { texture: 'xp-jumping-clippy', moveSpeed: 260 });
    this.cameras.main.stopFollow();
    const sprite = this.player.sprite;
    sprite.setDisplaySize(39, 60).setDepth(50).setCollideWorldBounds(true);
    sprite.setBodySize(sprite.width * 0.72, sprite.height * 0.9);
    this.setCheckpoint(SPAWN_X, SPAWN_Y);
    this.physics.add.collider(sprite, solid(this, 0, XP_FLOOR, GAME_WIDTH, 32));

    const binArt = this.add.graphics();
    binArt.fillStyle(0xbacfd3).fillRoundedRect(-13, -11, 26, 26, 5);
    binArt.fillStyle(0xeaf6fa).fillRoundedRect(-16, -15, 32, 7, 2);
    this.binLabel = this.add.text(0, 18, countDeaths ? `Recycle Bin (${getDeaths(this)})` : 'Recycle Bin', {
      fontFamily: 'Tahoma', fontSize: '10px', stroke: '#173447', strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this.bin = this.add.container(countDeaths ? 57 : 32, XP_FLOOR - 35, [
      binArt,
      this.add.text(0, 1, '♻', { color: '#176b43', fontSize: '18px' }).setOrigin(0.5),
      this.binLabel,
    ]).setDepth(12);
  }

  protected onDeath(_reason: string): void {
    this.dying = true;
    this.player.setClimbing(false);
    this.player.setControlsEnabled(false);
    this.player.sprite.disableBody();
    if (this.countDeaths) this.binLabel.setText(`Recycle Bin (${getDeaths(this)})`);
    this.hud.showBanner(this.binLabel.text, this.respawnDelay);
    this.tweens.add({
      targets: this.player.sprite, x: this.bin.x, y: this.bin.y, alpha: 0,
      angle: 540, duration: 750, ease: 'Quad.In',
    });
  }

  protected onRespawn(): void {
    this.dying = false;
    this.player.sprite.enableBody().setAngle(0);
    this.player.setControlsEnabled(true);
  }
}

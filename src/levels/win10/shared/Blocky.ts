import Phaser from 'phaser';
import { ensureTexture } from '../../../core/art';
import type { PlayerController } from '../../../core/PlayerController';
import type { Win10Inventory } from '../../../core/state';

export const BLOCKY_TEXTURE = 'win10-blocky';
const WALK_TEXTURE = 'win10-blocky-step';

export class Blocky {
  private readonly gear: Phaser.GameObjects.Container;
  private readonly armour: Phaser.GameObjects.Graphics;
  private readonly sword: Phaser.GameObjects.Graphics;
  private readonly shield: Phaser.GameObjects.Graphics;
  private previousTexture = BLOCKY_TEXTURE;
  readonly player: PlayerController;

  static prepare(scene: Phaser.Scene): void {
    [BLOCKY_TEXTURE, WALK_TEXTURE].forEach((key, step) => {
      ensureTexture(scene, key, 28, 48, (g) => {
        g.fillStyle(0x303846).fillRect(step ? 4 : 6, 32, 8, step ? 15 : 16)
          .fillRect(step ? 16 : 14, 32, 8, step ? 13 : 16);
        g.fillStyle(0xff7a32).fillRect(2, 17, 24, 18);
        g.fillStyle(0xc64520).fillRect(4, 30, 20, 5).fillRect(16, 21, 2, 7);
        g.fillStyle(0xf5b88d).fillRect(6, 3, 17, 15).fillRect(23, 27, 4, 6);
        g.fillStyle(0x211e28).fillRect(5, 0, 19, 6).fillRect(5, 5, 5, 6).fillRect(18, 9, 3, 3);
      });
    });
  }

  constructor(scene: Phaser.Scene, player: PlayerController) {
    this.player = player;
    this.armour = scene.add.graphics()
      .fillStyle(0x25c3b9).fillRect(-10, -25, 21, 7).fillRect(-10, -8, 22, 16)
      .fillRect(-9, 10, 18, 7).fillRect(-10, 19, 8, 5).fillRect(3, 19, 8, 5)
      .fillStyle(0xb1ffed).fillRect(-9, -24, 18, 2).fillRect(-9, -7, 18, 2)
      .fillStyle(0x127d83).fillRect(0, 11, 2, 6);
    this.sword = scene.add.graphics().lineStyle(4, 0xa4673d).lineBetween(10, 12, 23, -12)
      .fillStyle(0xd2e2f0).fillRect(20, -13, 7, 6).fillStyle(0x28c9bd).fillRect(22, -19, 7, 8);
    this.shield = scene.add.graphics().fillStyle(0x693a62).fillRoundedRect(-5, -11, 13, 22, 3)
      .fillStyle(0xff8cb3).fillRoundedRect(-4, -12, 11, 17, 3)
      .fillStyle(0xffc2d5).fillRect(-3, -10, 8, 4);
    this.gear = scene.add.container(0, 0, [this.armour, this.sword, this.shield]).setDepth(51);
  }

  setGear(inv: Win10Inventory): void {
    this.armour.setVisible(inv.armour);
    this.sword.setVisible(inv.sword);
    this.shield.setVisible(inv.shield);
  }

  update(time: number, swinging = false, shielding = false): void {
    const { sprite, facing, isOnGround } = this.player;
    const moving = Math.abs(sprite.body?.velocity.x ?? 0) > 5;
    const key = moving && isOnGround && Math.floor(time / 125) % 2 ? WALK_TEXTURE : BLOCKY_TEXTURE;
    if (key !== this.previousTexture) {
      sprite.setTexture(key);
      this.previousTexture = key;
    }
    this.gear.setPosition(sprite.x, sprite.y).setAlpha(sprite.alpha).setScale(facing, 1);
    this.sword.setAngle(swinging ? 44 : 0);
    this.shield.setPosition(shielding ? 19 : 12, shielding ? -6 : 10).setAngle(shielding ? 0 : -20);
  }
}

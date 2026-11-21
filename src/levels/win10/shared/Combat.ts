import Phaser from 'phaser';
import { sfx } from '../../../core/sfx';
import type { PlayerController } from '../../../core/PlayerController';
import type { Win10Inventory } from '../../../core/state';

export class Combat {
  private active = 0;
  private cooldown = 0;
  private sword = false;
  private shield = false;
  private readonly bounds = new Phaser.Geom.Rectangle(0, 0, 40, 36);
  private readonly arc: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private readonly player: PlayerController;

  constructor(scene: Phaser.Scene, player: PlayerController) {
    this.scene = scene;
    this.player = player;
    this.arc = scene.add.graphics().setDepth(52).setVisible(false);
    this.arc.lineStyle(4, 0xb1ffed, 0.9).beginPath().arc(0, 0, 36, -0.66, 0.66).strokePath();
  }

  setGear(inv: Win10Inventory): void {
    this.sword = inv.sword;
    this.shield = inv.shield;
  }

  get isSwinging(): boolean { return this.active > 0; }
  get isShielding(): boolean { return this.shield && this.player.isHeld('shield'); }

  get hitbox(): Phaser.Geom.Rectangle | undefined {
    if (!this.isSwinging) return undefined;
    const { x, y } = this.player.sprite;
    return this.bounds.setPosition(x + (this.player.facing === 1 ? 12 : -52), y - 18);
  }

  swing(): boolean {
    if (!this.sword || this.cooldown > 0) return false;
    this.active = 160;
    this.cooldown = 350;
    this.scene.tweens.killTweensOf(this.arc);
    this.arc.setAlpha(1).setVisible(true);
    this.scene.tweens.add({ targets: this.arc, alpha: 0, duration: 160 });
    sfx('reflect');
    return true;
  }

  blocks(fromX: number): boolean {
    return this.isShielding && (fromX - this.player.sprite.x) * this.player.facing > 0;
  }

  update(delta: number, movementScale = 1): void {
    this.active = Math.max(0, this.active - delta);
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.player.justPressed('attack')) this.swing();
    this.player.setMoveSpeedScale(movementScale * (this.isShielding ? 0.5 : 1));
    this.arc.setPosition(this.player.sprite.x, this.player.sprite.y).setScale(this.player.facing, 1)
      .setVisible(this.isSwinging);
  }

  reset(): void {
    this.active = this.cooldown = 0;
    this.scene.tweens.killTweensOf(this.arc);
    this.arc.setVisible(false);
    this.player.setMoveSpeedScale(1);
  }
}

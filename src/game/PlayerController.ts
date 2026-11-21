import Phaser from 'phaser';

export class PlayerController {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  private readonly moveSpeed: number = 200;
  private readonly jumpVelocity: number = -450;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setBounce(0.1);
    this.sprite.setCollideWorldBounds(false);

    // Cursor keys
    this.cursors = scene.input.keyboard!.createCursorKeys();

    // WASD keys
    const keyboard = scene.input.keyboard!;
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  public get spriteRef(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  public get isOnGround(): boolean {
    // Use `blocked` for static objects (platforms) and `touching` for dynamic objects
    return (this.sprite.body?.blocked?.down ?? false) || (this.sprite.body?.touching?.down ?? false);
  }

  public update(): void {
    // Horizontal movement
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.sprite.setVelocityX(-this.moveSpeed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.sprite.setVelocityX(this.moveSpeed);
    } else {
      this.sprite.setVelocityX(0);
    }

    // Jump — only when touching ground
    if (
      (this.cursors.up.isDown || this.wasd.up.isDown) &&
      this.isOnGround
    ) {
      this.sprite.setVelocityY(this.jumpVelocity);
    }
  }

  public reset(x: number, y: number): void {
    (this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.sprite.setVelocity(0, 0);
  }
}

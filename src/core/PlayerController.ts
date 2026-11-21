import Phaser from 'phaser';
import { PHYSICS } from './constants';
import { sfx } from './sfx';

export interface PlayerOptions {
  texture: string;
  bodySize?: { w: number; h: number; offsetX?: number; offsetY?: number };
  moveSpeed?: number;
  jumpVelocity?: number;
}

export class PlayerController {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;
  private keyE: Phaser.Input.Keyboard.Key;
  private keyJ: Phaser.Input.Keyboard.Key;
  private keyX: Phaser.Input.Keyboard.Key;
  private keyK: Phaser.Input.Keyboard.Key;
  private keyShift: Phaser.Input.Keyboard.Key;

  private moveSpeed: number;
  private jumpVelocity: number;

  private controlsEnabled = true;
  private climbing = false;

  // Coyote time: 80ms after leaving ground you can still jump
  private coyoteTimer = 0;
  private readonly coyoteDuration = 80;

  // Jump buffer: 100ms — if you press jump slightly before landing, it counts
  private jumpBufferTimer = 0;
  private readonly jumpBufferDuration = 100;

  private lastOnGround = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: PlayerOptions) {
    this.scene = scene;
    this.moveSpeed = opts.moveSpeed ?? PHYSICS.moveSpeed;
    this.jumpVelocity = opts.jumpVelocity ?? PHYSICS.jumpVelocity;

    this.sprite = scene.physics.add.sprite(x, y, opts.texture);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(false);

    if (opts.bodySize) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(opts.bodySize.w, opts.bodySize.h);
      if (opts.bodySize.offsetX !== undefined || opts.bodySize.offsetY !== undefined) {
        body.setOffset(opts.bodySize.offsetX ?? 0, opts.bodySize.offsetY ?? 0);
      }
    }

    // Cursor keys
    this.cursors = scene.input.keyboard!.createCursorKeys();

    // WASD + Space
    const kb = scene.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyX = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyK = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  public get isOnGround(): boolean {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return (body.blocked?.down ?? false) || (body.touching?.down ?? false);
  }

  public get facing(): 1 | -1 {
    return this.sprite.flipX ? -1 : 1;
  }

  public update(delta: number): void {
    if (!this.controlsEnabled) return;

    if (this.climbing) {
      this.updateClimbing();
      return;
    }

    const onGround = this.isOnGround;

    // Coyote time tracking
    if (onGround && !this.lastOnGround) {
      this.coyoteTimer = this.coyoteDuration;
    } else if (!onGround) {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }

    // Jump buffer tracking
    const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keyW)
      || Phaser.Input.Keyboard.JustDown(this.keySpace);
    if (upPressed) {
      this.jumpBufferTimer = this.jumpBufferDuration;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
    }

    // Jump: either on ground or within coyote time, and either just pressed or within jump buffer
    const canJump = onGround || this.coyoteTimer > 0;
    const wantsJump = this.jumpBufferTimer > 0;
    if (canJump && wantsJump) {
      this.sprite.setVelocityY(this.jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      sfx('jump');
    }

    // Horizontal movement
    if (this.cursors.left.isDown || this.keyA.isDown) {
      this.sprite.setVelocityX(-this.moveSpeed);
      this.sprite.setFlipX(true);
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      this.sprite.setVelocityX(this.moveSpeed);
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setVelocityX(0);
    }

    this.lastOnGround = onGround;
  }

  private updateClimbing(): void {
    const climbSpeed = 140;
    this.sprite.setVelocityX(0);

    if (this.cursors.up.isDown || this.keyW.isDown) {
      this.sprite.setVelocityY(-climbSpeed);
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      this.sprite.setVelocityY(climbSpeed);
    } else {
      this.sprite.setVelocityY(0);
    }

    // Jump to leave ladder
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keyW)
      || Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.climbing = false;
      this.sprite.setVelocityY(this.jumpVelocity);
      sfx('jump');
    }
  }

  public reset(x: number, y: number): void {
    (this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.sprite.setVelocity(0, 0);
  }

  public setControlsEnabled(on: boolean): void {
    this.controlsEnabled = on;
  }

  public setClimbing(on: boolean): void {
    this.climbing = on;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(!on);
    if (on) {
      body.setVelocityY(0);
    }
  }

  public justPressed(action: 'interact' | 'attack'): boolean {
    if (action === 'interact') {
      return Phaser.Input.Keyboard.JustDown(this.keyE);
    }
    return Phaser.Input.Keyboard.JustDown(this.keyJ) || Phaser.Input.Keyboard.JustDown(this.keyX);
  }

  public isHeld(action: 'shield' | 'up' | 'down'): boolean {
    if (action === 'shield') {
      return this.keyK.isDown || this.keyShift.isDown;
    }
    if (action === 'up') {
      return this.cursors.up.isDown || this.keyW.isDown;
    }
    return this.cursors.down.isDown || this.keyS.isDown;
  }
}

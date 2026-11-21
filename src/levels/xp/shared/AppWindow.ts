import Phaser from 'phaser';
import { sfx } from '../../../core/sfx';

export interface AppWindowConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  closeInMs: number;
  entry: 'trap' | 'door';
  insideIcons?: { x: number; y: number; w: number; h: number }[];
}

export class AppWindow {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private titleBar: Phaser.GameObjects.Graphics;
  private clientArea: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private countdownText: Phaser.GameObjects.Text;
  private leftWall: Phaser.Physics.Arcade.Sprite;
  private rightWall: Phaser.Physics.Arcade.Sprite;
  private bottomWall: Phaser.Physics.Arcade.Sprite;
  private insidePlatforms: Phaser.Physics.Arcade.StaticGroup;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private isClosed = false;
  private hasPlayerInside = false;
  private config: AppWindowConfig;

  // For pushable wall (window 3)
  private pushableRightWall = false;
  private pushOffset = 0;
  private maxPushOffset = 260;
  private hiddenIcons: Phaser.Physics.Arcade.Sprite[] = [];

  constructor(scene: Phaser.Scene, config: AppWindowConfig) {
    this.scene = scene;
    this.config = config;

    // Container at window position
    this.container = scene.add.container(config.x, config.y);

    // Client area (beige)
    this.clientArea = scene.add.graphics();
    this.clientArea.fillStyle(0xf5f5dc, 1);
    this.clientArea.fillRect(0, 28, config.w, config.h - 28);
    this.container.add(this.clientArea);

    // Title bar (blue gradient)
    this.titleBar = scene.add.graphics();
    this.titleBar.fillStyle(0x0055cc, 1);
    this.titleBar.fillRect(0, 0, config.w, 28);
    // Rounded top corners
    this.titleBar.fillCircle(0, 0, 6);
    this.titleBar.fillCircle(config.w, 0, 6);
    this.container.add(this.titleBar);

    // Title text
    this.titleText = scene.add.text(8, 4, config.title, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Tahoma, Arial, sans-serif',
    });
    this.container.add(this.titleText);

    // Countdown text (hidden initially)
    this.countdownText = scene.add.text(config.w - 8, 4, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Tahoma, Arial, sans-serif',
    });
    this.countdownText.setOrigin(1, 0);
    this.container.add(this.countdownText);

    // Close button (✕)
    const closeBtn = scene.add.text(config.w - 24, 4, '✕', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Tahoma, Arial, sans-serif',
    });
    this.container.add(closeBtn);

    // Physics walls (thin static sprites) - create texture if not exists
    if (!scene.textures.exists('__wall')) {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0055cc';
      ctx.fillRect(0, 0, 4, 4);
      scene.textures.addCanvas('__wall', canvas);
    }

    // Left wall
    this.leftWall = scene.physics.add.staticSprite(2, config.h / 2, '__wall');
    (this.leftWall.body as Phaser.Physics.Arcade.StaticBody).setSize(4, config.h - 28);
    (this.leftWall.body as Phaser.Physics.Arcade.StaticBody).setOffset(0, 28);
    this.container.add(this.leftWall);

    // Right wall
    this.rightWall = scene.physics.add.staticSprite(config.w - 2, config.h / 2, '__wall');
    (this.rightWall.body as Phaser.Physics.Arcade.StaticBody).setSize(4, config.h - 28);
    (this.rightWall.body as Phaser.Physics.Arcade.StaticBody).setOffset(0, 28);
    this.container.add(this.rightWall);

    // Bottom wall
    this.bottomWall = scene.physics.add.staticSprite(config.w / 2, config.h - 2, '__wall');
    (this.bottomWall.body as Phaser.Physics.Arcade.StaticBody).setSize(config.w, 4);
    (this.bottomWall.body as Phaser.Physics.Arcade.StaticBody).setOffset(0, 0);
    this.container.add(this.bottomWall);

    // Inside platforms (icon platforms for climbing)
    this.insidePlatforms = scene.physics.add.staticGroup();
    if (config.insideIcons) {
      for (const icon of config.insideIcons) {
        const platform = this.insidePlatforms.create(
          icon.x, icon.y, '__wall',
        ) as Phaser.Physics.Arcade.Sprite;
        (platform.body as Phaser.Physics.Arcade.StaticBody).setSize(icon.w, icon.h);
        (platform.body as Phaser.Physics.Arcade.StaticBody).setOffset(0, 0);
        this.container.add(platform);
      }
    }

    // Open animation (scale from 0.2 to 1)
    this.container.setScale(0.2);
    this.container.setAlpha(0);
    sfx('windowOpen');
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }

  public startCountdown(): void {
    let remaining = Math.ceil(this.config.closeInMs / 1000);
    this.updateCountdownText(remaining);

    this.countdownTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        remaining--;
        this.updateCountdownText(remaining);

        // Flash red in last 3 seconds
        if (remaining <= 3 && remaining > 0) {
          this.titleBar.clear();
          this.titleBar.fillStyle(0xcc0000, 1);
          this.titleBar.fillRect(0, 0, this.config.w, 28);
          this.titleBar.fillCircle(0, 0, 6);
          this.titleBar.fillCircle(this.config.w, 0, 6);
        }

        if (remaining <= 0) {
          this.close();
        }
      },
      repeat: this.config.closeInMs / 1000 - 1,
    });
  }

  private updateCountdownText(remaining: number): void {
    if (remaining > 0) {
      this.countdownText.setText(`closing in ${remaining}...`);
    } else {
      this.countdownText.setText('closing!');
    }
  }

  public close(): void {
    if (this.isClosed) return;
    this.isClosed = true;

    if (this.countdownTimer) {
      this.countdownTimer.remove();
      this.countdownTimer = null;
    }

    sfx('windowClose');

    // Shrink to ✕ button
    this.scene.tweens.add({
      targets: this.container,
      scale: 0.1,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.container.destroy();
      },
    });
  }

  public closeNow(): Promise<boolean> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        scale: 0.1,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.container.destroy();
          resolve(this.hasPlayerInside);
        },
      });
      this.isClosed = true;
      if (this.countdownTimer) {
        this.countdownTimer.remove();
        this.countdownTimer = null;
      }
      sfx('windowClose');
    });
  }

  public contains(body: Phaser.Physics.Arcade.Body): boolean {
    const wx = body.x;
    const wy = body.y;
    const winX = this.config.x;
    const winY = this.config.y;
    const winW = this.config.w + this.pushOffset;
    const winH = this.config.h;

    // Exit gap is on the title bar (top), roughly in the middle
    const gapStart = winX + winW / 2 - 45;
    const gapEnd = winX + winW / 2 + 45;

    return (
      wx > winX + 4 &&
      wx < winX + winW - 4 &&
      wy > winY + 28 &&
      wy < winY + winH &&
      !(wy < winY + 28 && wx > gapStart && wx < gapEnd)
    );
  }

  public setPlayerInside(inside: boolean): void {
    this.hasPlayerInside = inside;
  }

  public get hasPlayerInsideNow(): boolean {
    return this.hasPlayerInside;
  }

  public get isClosedNow(): boolean {
    return this.isClosed;
  }

  public get configRef(): AppWindowConfig {
    return this.config;
  }

  public enablePushableWall(): void {
    this.pushableRightWall = true;
  }

  public tryPushWall(playerX: number, playerVelocityX: number): void {
    if (!this.pushableRightWall || this.pushOffset >= this.maxPushOffset) return;

    // Check if player is blocked against the right wall
    const rightWallX = this.config.x + this.config.w + this.pushOffset;
    if (
      playerX > rightWallX - 20 &&
      playerX < rightWallX + 5 &&
      playerVelocityX > 0
    ) {
      this.pushOffset = Math.min(this.pushOffset + 1, this.maxPushOffset);
      this.updateWallPositions();
    }
  }

  private updateWallPositions(): void {
    const w = this.config.w + this.pushOffset;

    // Reposition right wall
    this.rightWall.setPosition(w - 2, this.config.h / 2);

    // Reposition bottom wall
    this.bottomWall.setPosition(w / 2, this.config.h - 2);
    (this.bottomWall.body as Phaser.Physics.Arcade.StaticBody).setSize(w, 4);

    // Redraw client area
    this.clientArea.clear();
    this.clientArea.fillStyle(0xf5f5dc, 1);
    this.clientArea.fillRect(0, 28, w, this.config.h - 28);

    // Redraw title bar
    this.titleBar.clear();
    this.titleBar.fillStyle(0x0055cc, 1);
    this.titleBar.fillRect(0, 0, w, 28);
    this.titleBar.fillCircle(0, 0, 6);
    this.titleBar.fillCircle(w, 0, 6);

    // Reposition countdown
    this.countdownText.setPosition(w - 8, 4);

    // Reveal hidden icons
    for (const icon of this.hiddenIcons) {
      icon.setVisible(this.pushOffset > 100);
    }
  }

  public addHiddenIcon(x: number, y: number, w: number, h: number): void {
    const icon = this.scene.physics.add.staticSprite(x, y, '__wall');
    (icon.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
    icon.setVisible(false);
    this.container.add(icon);
    this.hiddenIcons.push(icon);
  }

  public destroy(): void {
    if (this.countdownTimer) {
      this.countdownTimer.remove();
    }
    this.container.destroy();
  }
}

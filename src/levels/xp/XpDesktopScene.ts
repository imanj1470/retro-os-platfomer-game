import Phaser from 'phaser';
import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';
import { ensureTexture } from '../../core/art';
import { sfx } from '../../core/sfx';
import { createVanishingPlatform } from '../../core/VanishingPlatform';

// XP world dimensions (matches the wallpaper image size)
const XP_WORLD_WIDTH = 1192;
const XP_WORLD_HEIGHT = 670;
const TASKBAR_HEIGHT = 32;

// Desktop icon data
interface DesktopIcon {
  x: number;
  y: number;
  label: string;
  letter: string;
  color: number;
  isOneWay?: boolean;
}

// Notification ladder data
interface NotificationStack {
  x: number;
  y: number;
  count: number;
  messages: string[];
}

// Popup ad data
interface PopupAdSpawner {
  x: number;
  y: number;
  intervalMs: number;
  messages: string[];
}


export default class XpDesktopScene extends BaseLevelScene {
  protected readonly levelId = 'xp' as const;

  private hp = 3;
  private maxHp = 3;


  // Desktop icons (one-way platforms)
  private iconPlatforms!: Phaser.Physics.Arcade.StaticGroup;

  // Notification ladders
  private notificationStacks: Phaser.GameObjects.Container[] = [];

  // Popup ads
  private popupAds: Phaser.GameObjects.Container[] = [];
  private popupSpawners: PopupAdSpawner[] = [];

  // Recycle Bin
  private recycleBin!: Phaser.GameObjects.Sprite;

  // Background elements
  private xpBg!: Phaser.GameObjects.Image;
  private taskbar!: Phaser.GameObjects.Container;
  private clockText!: Phaser.GameObjects.Text;

  // Vanishing platforms
  private vanishingPlatforms: ReturnType<typeof createVanishingPlatform>[] = [];

  constructor() {
    super(SceneKeys.XpDesktop);
  }

  create(): void {
    // World setup
    this.setupWorld(XP_WORLD_WIDTH, XP_WORLD_HEIGHT, 0x3a6ee8);

    // Core components
    this.helper = new Helper(this, 'xp');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'xp');

    // Generate XP textures
    this.generateXpTextures();

    // Background
    this.createBackground();

    // Taskbar (floor of first segment)
    this.createTaskbar();

    // Desktop icons (one-way platforms)
    this.createDesktopIcons();

    // Notification ladders
    this.createNotificationLadders();

    // Popup ad spawners
    this.createPopupAdSpawners();

    // Internet Exploder rage traps
    this.createVanishingPlatforms();

    // Recycle Bin (checkpoint)
    this.createRecycleBin();

    // Player — spawn on the taskbar floor
    // Taskbar floor physics body: staticSprite at Y=654 with origin (0, 0.5) and height 32, so top edge is at Y=638
    // Fixed display size for the player sprite — both SVGs have different source sizes
    // (512x512 vs 275x420), so setDisplaySize ensures they render at the same pixel size.
    const playerDisplayW = 64;
    const playerDisplayH = 72;
    const scaledBodyHeight = playerDisplayH; // physics body matches display height
    const taskbarTop = XP_WORLD_HEIGHT - TASKBAR_HEIGHT; // 638
    // Player body center Y = taskbar top - bodyHeight/2, so feet rest exactly on the floor surface
    const playerSpawnY = taskbarTop - scaledBodyHeight / 2; // 638 - 36 = 602
    this.spawnPlayer(80, playerSpawnY, {
      texture: 'xp-jumping-char',
      bodySize: { w: playerDisplayW - 6, h: scaledBodyHeight, offsetX: 3, offsetY: 6 },
    });
    this.player.sprite.setDisplaySize(playerDisplayW, playerDisplayH);
    this.player.sprite.setDepth(1000);
    this.setCheckpoint(80, playerSpawnY);


    // Collisions
    this.setupCollisions();

    // HUD
    this.updateHpHud();

    // Exit point
    this.createExitPoint();

    // Helper intro
    this.helper.say(
      'Welcome to the desktop! Hop across icons to the top-right exit to progress!',
      { holdMs: 5000 },
    );

    // Proximity hints
    this.helper.addProximityHint('wurd', { x: 120, y: XP_WORLD_HEIGHT - 120 }, 80, 'Wurd: for letters you\'ll never send.');
    this.helper.addProximityHint('exsell', { x: 240, y: XP_WORLD_HEIGHT - 170 }, 80, 'Exsell: 65,536 rows of regret.');
    this.helper.addProximityHint('outluck', { x: 90, y: XP_WORLD_HEIGHT - 220 }, 80, 'Outluck: 0 new messages, as always.');
    this.helper.addProximityHint('recyclebin', { x: 120, y: XP_WORLD_HEIGHT - 100 }, 80, 'If you die, you end up in here. Don\'t.');


    // Clock update
    this.time.addEvent({
      delay: 60000,
      callback: () => this.updateClock(),
      loop: true,
    });
  }

  private generateXpTextures(): void {
    // Sky gradient texture (for background)
    ensureTexture(this, 'xp-sky-tile', 800, 1200, (g) => {
      // Gradient from #3a6ee8 to #a8d4ff
      for (let y = 0; y < 1200; y++) {
        const t = y / 1200;
        const r = Math.round(0x3a + (0xa8 - 0x3a) * t);
        const gr = Math.round(0x6e + (0xd4 - 0x6e) * t);
        const b = Math.round(0xe8 + (0xff - 0xe8) * t);
        g.fillStyle(r << 16 | gr << 8 | b, 1);
        g.fillRect(0, y, 800, 1);
      }
    });

    // Desktop icon base
    ensureTexture(this, 'icon-base', 48, 48, (g) => {
      g.fillStyle(0xcccccc, 1);
      g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xeeeeee, 1);
      g.fillRect(2, 2, 44, 44);
    });


    // My PC icon (monitor)
    ensureTexture(this, 'icon-mypc', 48, 48, (g) => {
      g.fillStyle(0x888888, 1);
      g.fillRect(4, 6, 40, 30);
      g.fillStyle(0x00aa00, 1);
      g.fillRect(6, 8, 36, 24);
      g.fillStyle(0x888888, 1);
      g.fillRect(16, 36, 16, 6);
    });

    // Recycle Bin icon
    ensureTexture(this, 'icon-recyclebin', 48, 48, (g) => {
      g.fillStyle(0x888888, 1);
      g.fillRect(8, 14, 32, 28);
      g.fillStyle(0xaaaaaa, 1);
      g.fillRect(4, 8, 40, 8);
      g.fillStyle(0xffffff, 1);
      g.fillRect(14, 18, 4, 20);
      g.fillRect(22, 18, 4, 20);
      g.fillRect(30, 18, 4, 20);
    });

    // Internet Exploder icon (blue globe with fuse)
    ensureTexture(this, 'icon-exploder', 48, 48, (g) => {
      g.fillStyle(0x0066cc, 1);
      g.fillCircle(24, 28, 16);
      g.fillStyle(0x00aaff, 1);
      g.fillCircle(24, 28, 12);
      g.fillStyle(0xff4400, 1);
      g.fillRect(22, 2, 4, 12);
      g.fillStyle(0xffcc00, 1);
      g.fillCircle(24, 2, 4);
    });

    // Taskbar floor texture (for physics body)
    ensureTexture(this, 'taskbar-floor', 1192, 32, (g) => {
      g.fillStyle(0x0055cc, 1);
      g.fillRect(0, 0, 1192, 32);
    });


    // Floppy player with feet (richer version)
    ensureTexture(this, 'player-floppy-rich', 32, 36, (g) => {
      // Body
      g.fillStyle(0x4444aa, 1);
      g.fillRect(0, 4, 32, 32);
      // Silver shutter
      g.fillStyle(0xaaaaaa, 1);
      g.fillRect(4, 0, 24, 8);
      g.fillStyle(0x888888, 1);
      g.fillRect(8, 2, 16, 4);
      // Label sticker
      g.fillStyle(0xffffff, 1);
      g.fillRect(4, 12, 12, 10);
      g.fillStyle(0xcccccc, 1);
      g.fillRect(6, 14, 8, 2);
      g.fillRect(6, 18, 6, 2);
      // Eyes
      g.fillStyle(0xffffff, 1);
      g.fillRect(20, 14, 6, 6);
      g.fillStyle(0x000000, 1);
      g.fillRect(22, 16, 3, 3);
      // Tiny feet
      g.fillStyle(0x4444aa, 1);
      g.fillRect(4, 34, 8, 4);
      g.fillRect(20, 34, 8, 4);
    });
  }

  private createBackground(): void {
    // Windows XP wallpaper background — single image matching world size
    this.xpBg = this.add.image(0, 0, 'windowsxp-bg');
    this.xpBg.setDisplaySize(XP_WORLD_WIDTH, XP_WORLD_HEIGHT);
    this.xpBg.setOrigin(0, 0);
    this.xpBg.setScrollFactor(0);
    this.xpBg.setDepth(-1);
  }

  private createTaskbar(): void {
    this.taskbar = this.add.container(0, XP_WORLD_HEIGHT - TASKBAR_HEIGHT);

    // Blue gradient bar (visual)
    const bar = this.add.graphics();
    bar.fillStyle(0x0055cc, 1);
    bar.fillRect(0, 0, XP_WORLD_WIDTH, TASKBAR_HEIGHT);
    this.taskbar.add(bar);

    // Physics floor for the taskbar — a static sprite the player can stand on
    const taskbarFloor = this.physics.add.staticSprite(0, XP_WORLD_HEIGHT - TASKBAR_HEIGHT / 2, 'taskbar-floor');
    taskbarFloor.setDisplaySize(XP_WORLD_WIDTH, TASKBAR_HEIGHT);
    taskbarFloor.setOrigin(0, 0.5);
    taskbarFloor.setVisible(false); // invisible, only the physics body matters

    // Green start pill
    const startPill = this.add.text(16, 4, 'start', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Tahoma, Arial, sans-serif',
      backgroundColor: '#00aa00',
      padding: { x: 12, y: 4 },
    });
    this.taskbar.add(startPill);

    // Clock
    this.clockText = this.add.text(XP_WORLD_WIDTH - 16, 4, this.getCurrentTime(), {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Tahoma, Arial, sans-serif',
    });
    this.clockText.setOrigin(1, 0);
    this.taskbar.add(this.clockText);

    this.taskbar.setScrollFactor(0);
    this.taskbar.setDepth(500);
  }

  private getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  private updateClock(): void {
    this.clockText.setText(this.getCurrentTime());
  }

  private createDesktopIcons(): void {
    this.iconPlatforms = this.physics.add.staticGroup();

    // Define desktop icons with positions (scaled to fit 1192×670 world)
    const icons: DesktopIcon[] = [
      // Segment 1 (bottom area, near taskbar)
      { x: 120, y: XP_WORLD_HEIGHT - 120, label: 'Wurd', letter: 'W', color: 0x0055cc, isOneWay: true },
      { x: 240, y: XP_WORLD_HEIGHT - 170, label: 'Exsell', letter: 'X', color: 0x00aa00, isOneWay: true },
      { x: 90, y: XP_WORLD_HEIGHT - 220, label: 'Outluck', letter: 'O', color: 0x0066cc, isOneWay: true },
      { x: 210, y: XP_WORLD_HEIGHT - 270, label: 'My PC', letter: 'M', color: 0x888888, isOneWay: true },

      // Segment 2 (mid area)
      { x: 360, y: XP_WORLD_HEIGHT - 310, label: 'Wurd', letter: 'W', color: 0x0055cc, isOneWay: true },
      { x: 480, y: XP_WORLD_HEIGHT - 350, label: 'Exsell', letter: 'X', color: 0x00aa00, isOneWay: true },
      { x: 420, y: XP_WORLD_HEIGHT - 390, label: 'PowerPoynt', letter: 'P', color: 0xff8800, isOneWay: true },
      { x: 540, y: XP_WORLD_HEIGHT - 430, label: 'Outluck', letter: 'O', color: 0x0066cc, isOneWay: true },

      // Segment 3 (upper area)
      { x: 660, y: XP_WORLD_HEIGHT - 470, label: 'My PC', letter: 'M', color: 0x888888, isOneWay: true },
      { x: 780, y: XP_WORLD_HEIGHT - 510, label: 'Wurd', letter: 'W', color: 0x0055cc, isOneWay: true },
      { x: 720, y: XP_WORLD_HEIGHT - 540, label: 'Exsell', letter: 'X', color: 0x00aa00, isOneWay: true },
      { x: 840, y: XP_WORLD_HEIGHT - 570, label: 'PowerPoynt', letter: 'P', color: 0xff8800, isOneWay: true },

      // Segment 4 (top area, near exit)
      { x: 960, y: XP_WORLD_HEIGHT - 590, label: 'Outluck', letter: 'O', color: 0x0066cc, isOneWay: true },
      { x: 1050, y: XP_WORLD_HEIGHT - 600, label: 'My PC', letter: 'M', color: 0x888888, isOneWay: true },
    ];

    for (const icon of icons) {
      // Determine texture key
      let texKey = 'icon-base';
      if (icon.label === 'Wurd') texKey = 'xp-word';
      else if (icon.label === 'Exsell') texKey = 'xp-excel';
      else if (icon.label === 'PowerPoynt') texKey = 'xp-ppt';
      else if (icon.label === 'Outluck') texKey = 'xp-mail';
      else if (icon.label === 'My PC') texKey = 'icon-mypc';

      const sprite = this.iconPlatforms.create(icon.x, icon.y, texKey) as Phaser.Physics.Arcade.Sprite;
      sprite.setDisplaySize(48, 48);
      sprite.setOrigin(0.5);
      sprite.body!.setSize(48, 16);
      sprite.body!.setOffset(0, 16);

      // Label underneath
      const label = this.add.text(icon.x, icon.y + 28, icon.label, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Tahoma, Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
    }

    // Recycle Bin at checkpoint
    this.recycleBin = this.physics.add.staticSprite(120, XP_WORLD_HEIGHT - 100, 'icon-recyclebin');
    this.recycleBin.setOrigin(0.5);
  }

  private createNotificationLadders(): void {
    const stacks: NotificationStack[] = [
      {
        x: 300, y: XP_WORLD_HEIGHT - 360, count: 4,
        messages: ['Updates are ready', 'Your PC may be at risk!', 'You have 3 unread messages', 'Run Disk Cleanup'],
      },
      {
        x: 600, y: XP_WORLD_HEIGHT - 510, count: 5,
        messages: ['Windows Update', 'Security alert', 'New mail!', 'Defragment now', 'Low disk space'],
      },
      {
        x: 900, y: XP_WORLD_HEIGHT - 600, count: 3,
        messages: ['System restore', 'Driver update', 'Backup now'],
      },
    ];

    for (const stack of stacks) {
      const container = this.add.container(stack.x, stack.y);

      for (let i = 0; i < stack.count; i++) {
        // xpPrompts is 336×215 (ratio ~1.56:1). Toast: 160×100 to match aspect ratio.
        const toast = this.add.image(0, -i * 108, 'xpprompts');
        toast.setDisplaySize(160, 100);

        const msg = this.add.text(12, -i * 108 - 25, stack.messages[i] || '', {
          fontSize: '11px',
          color: '#333333',
          fontFamily: 'Tahoma, Arial, sans-serif',
        });

        container.add(toast);
        container.add(msg);
      }

      // Slide in from right
      container.setPosition(stack.x + 200, stack.y);
      this.tweens.add({
        targets: container,
        x: stack.x,
        duration: 800,
        ease: 'Back.easeOut',
        delay: 1000 + stack.x / 10,
      });

      this.notificationStacks.push(container);
    }
  }

  private createPopupAdSpawners(): void {
    this.popupSpawners = [
      { x: 240, y: 240, intervalMs: 20000, messages: ['CONGRATULATIONS! You are visitor 1,000,000!'] },
      { x: 420, y: 180, intervalMs: 25000, messages: ['FREE SMILEYS! Click here!'] },
      { x: 600, y: 300, intervalMs: 22000, messages: ['Your RAM is lonely. Fix it now!'] },
      { x: 780, y: 120, intervalMs: 28000, messages: ['You have been selected!'] },
      { x: 960, y: 240, intervalMs: 21000, messages: ['Hot singles in your area!'] },
      { x: 1050, y: 180, intervalMs: 24000, messages: ['Your PC is running slow!'] },
    ];

    for (const spawner of this.popupSpawners) {
      this.time.addEvent({
        delay: spawner.intervalMs,
        callback: () => this.spawnPopupAd(spawner.x, spawner.y, spawner.messages[0]),
        loop: true,
      });
    }
  }

  private spawnPopupAd(x: number, y: number, message: string): void {
    const container = this.add.container(x, y);
    container.setScale(0);

    // xpPrompts is 336×215 (ratio ~1.56:1). Popup: 120×77 to match aspect ratio.
    const bg = this.add.image(0, 0, 'xpprompts');
    bg.setDisplaySize(120, 77);

    const text = this.add.text(0, 18, message, {
      fontSize: '9px',
      color: '#cc0000',
      fontFamily: 'Tahoma, Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 100 },
    }).setOrigin(0.5);

    container.add(bg);
    container.add(text);

    // Scale in
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Drift toward player
    const driftTween = this.tweens.add({
      targets: container,
      x: this.player.sprite.x - 60,
      y: this.player.sprite.y - 40,
      duration: 4000,
      ease: 'Linear',
    });

    // Despawn after 6 seconds
    this.time.delayedCall(6000, () => {
      driftTween.stop();
      container.destroy();
      const idx = this.popupAds.indexOf(container);
      if (idx >= 0) this.popupAds.splice(idx, 1);
    });

    this.popupAds.push(container);
  }

  private createVanishingPlatforms(): void {
    // Internet Exploder icons on the main route
    const exploderPositions = [
      { x: 390, y: XP_WORLD_HEIGHT - 310 },
      { x: 750, y: XP_WORLD_HEIGHT - 550 },
    ];

    for (const pos of exploderPositions) {
      const vp = createVanishingPlatform(
        this,
        this.iconPlatforms,
        pos.x,
        pos.y,
        'icon-exploder',
        { label: 'Internet Exploder', vanishMs: 500, respawnMs: 3000 },
      );
      this.vanishingPlatforms.push(vp);
    }

    // Helper hint for first one
    this.helper.addProximityHint(
      'exploder1',
      { x: 650, y: XP_WORLD_HEIGHT - 520 },
      100,
      'Internet Exploder has stopped responding. Classic.',
    );
  }

  private createRecycleBin(): void {
    // Already created in createDesktopIcons
    // Set checkpoint at recycle bin
    this.setCheckpoint(200, XP_WORLD_HEIGHT - 160);
  }


  private setupCollisions(): void {
    // Player vs icon platforms (one-way from above) — use overlap so we can control
    // one-way behavior manually. The key is to push the player above the platform
    // and zero only the Y velocity, preserving horizontal movement so jumping works.
    this.physics.add.overlap(
      this.player.sprite,
      this.iconPlatforms,
      (playerObj, platformObj) => {
        const sprite = playerObj as Phaser.Physics.Arcade.Sprite;
        const platform = platformObj as Phaser.Physics.Arcade.Sprite;
        const pBody = sprite.body as Phaser.Physics.Arcade.Body;
        // One-way: only collide if player is falling (vy >= 0) and feet are near the platform top
        if (pBody.velocity.y >= 0 && sprite.y >= platform.y - 16 && sprite.y <= platform.y + 16) {
          // Push player to rest on top of the platform
          sprite.y = platform.y - 5;
          pBody.setVelocityY(0);
          pBody.setAccelerationY(0);
        }
        // If player is moving up (jumping through), do nothing — they pass through
      },
      undefined,
      this,
    );

    // Player vs Recycle Bin (checkpoint)
    this.physics.add.overlap(this.player.sprite, this.recycleBin, () => {
      this.setCheckpoint(120, XP_WORLD_HEIGHT - 100);
    });
  }

  private createExitPoint(): void {
    // Exit point at top-right of the desktop — player reaches it by climbing icons
    const exitX = XP_WORLD_WIDTH - 60;
    const exitY = 60;

    // Exit prompt text
    const exitPrompt = this.add.text(exitX, exitY, '🚪 Exit', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Tahoma, Arial, sans-serif',
    }).setOrigin(1, 0)
      .setDepth(500);

    // Blinking cursor
    this.tweens.add({
      targets: exitPrompt,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Check proximity to exit using a zone
    const exitZone = this.add.zone(exitX, exitY, 60, 40);
    this.physics.add.overlap(
      this.player.sprite,
      exitZone,
      () => {
        this.triggerLevelEnd();
      },
      undefined,
      this,
    );
  }

  private levelEnded = false;

  private triggerLevelEnd(): void {
    // Prevent double-trigger
    if (this.levelEnded) return;
    this.levelEnded = true;

    // Screen glitch: 3 quick camera shakes
    const cam = this.cameras.main;
    cam.shake(100, 0.005);
    this.time.delayedCall(200, () => cam.shake(100, 0.005));
    this.time.delayedCall(400, () => cam.shake(100, 0.005));

    // Fake popup using xpPrompts image
    this.time.delayedCall(800, () => {
      const popupContainer = this.add.container(cam.midPoint.x, cam.midPoint.y)
        .setScrollFactor(0)
        .setDepth(2000)
        .setAlpha(0);

      const popupBg = this.add.image(0, 0, 'xpprompts');
      popupBg.setDisplaySize(336, 215);
      popupBg.setOrigin(0.5);

      const popupText = this.add.text(0, 0, 'BuddyWare.exe would like to be your friend!\n\n[ Yes ]  [ Also Yes ]', {
        fontSize: '18px',
        color: '#333333',
        fontFamily: 'Tahoma, Arial, sans-serif',
        align: 'center',
      }).setOrigin(0.5);

      popupContainer.add(popupBg);
      popupContainer.add(popupText);

      this.tweens.add({
        targets: popupContainer,
        alpha: 1,
        duration: 200,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          this.time.delayedCall(1500, () => {
            popupContainer.destroy();
            this.completeLevel(SceneKeys.XpBoss);
          });
        },
      });
    });
  }

  // Override hurtPlayer for HP system
  protected onHurt(_source: string): 'survive' | 'dead' {
    this.hp--;
    this.updateHpHud();

    if (this.hp <= 0) {
      return 'dead';
    }
    return 'survive';
  }

  // Override killPlayer for Recycle Bin animation
  protected onDeath(reason: string): void {
    const cam = this.cameras.main;
    const binX = this.recycleBin.x;
    const binY = this.recycleBin.y;

    // Disable controls during death animation
    this.player.setControlsEnabled(false);

    // Floppy shrinks and spins into Recycle Bin
    // Use alpha fade and angle spin instead of scale, since setDisplaySize sets a fixed pixel size
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0,
      angle: 720,
      x: binX,
      y: binY,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        // Bin lid wobble
        this.tweens.add({
          targets: this.recycleBin,
          angle: 10,
          duration: 100,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            this.recycleBin.setAngle(0);
            // Respawn
            this.hp = this.maxHp;
            this.updateHpHud();
            this.player.reset(120, XP_WORLD_HEIGHT - 100);
            this.player.sprite.setTexture('xp-jumping-char');
            this.player.sprite.setDisplaySize(64, 72);
            this.player.sprite.setAngle(0);
            this.player.setControlsEnabled(true);
            // Reset invulnerability via base class mechanism
            this.player.sprite.setAlpha(1);
          },
        });
      },
    });

    this.hud.showBanner('Recycle Bin', 1500);
  }

  private updateHpHud(): void {
    const hpText = '💾'.repeat(this.hp) + '⬛'.repeat(this.maxHp - this.hp);
    this.hud.setRight(hpText);
  }

  tick(_time: number, _delta: number): void {
    // Switch texture based on jump state: jumping character on ground, jumping Clippy in air
    // Only swap when the state actually changes to avoid redundant setTexture calls
    const wantClippy = !this.player.isOnGround;
    const currentKey = this.player.sprite.texture.key;
    const isClippy = currentKey === 'xp-jumping-clippy';
    if (wantClippy && !isClippy) {
      this.player.sprite.setTexture('xp-jumping-clippy');
      this.player.sprite.setDisplaySize(64, 72);
    } else if (!wantClippy && isClippy) {
      this.player.sprite.setTexture('xp-jumping-char');
      this.player.sprite.setDisplaySize(64, 72);
    }

    this.helper.update(this.player.sprite.x, this.player.sprite.y);

    // Check climbing on notification stacks (taller toasts: 100px each, so stacks are taller)
    let onStack = false;
    for (const stack of this.notificationStacks) {
      const sx = stack.x;
      const sy = stack.y;
      const px = this.player.sprite.x;
      const py = this.player.sprite.y;

      if (
        px > sx - 80 &&
        px < sx + 80 &&
        py > sy - 400 &&
        py < sy + 50
      ) {
        onStack = true;
        if (this.player.isHeld('up') || this.player.isHeld('down')) {
          this.player.setClimbing(true);
        }
        break;
      }
    }

    // Stop climbing when not on a stack and on ground
    if (!onStack && this.player.isOnGround) {
      this.player.setClimbing(false);
    }
  }
}
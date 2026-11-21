import Phaser from 'phaser';
import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';
import { ensureTexture, textTexture } from '../../core/art';
import { sfx } from '../../core/sfx';
import { emitGame } from '../../core/events';
import { setPlayerName, getDeaths } from '../../core/state';
import { createVanishingPlatform } from '../../core/VanishingPlatform';

// CLI level constants
const CLI_WORLD_WIDTH = 800;
const CLI_WORLD_HEIGHT = 1800;
const CLI_GREEN = '#33ff66';
const CLI_DIM = '#1a8033';
const CLI_BLACK = '#000000';

// Target word to spell
const TARGET_WORD = 'start';


// Text attack strings
const TEXT_ATTACKS = ['SEGFAULT', 'rm -rf /', '^C', 'NaN', '404', 'core dumped'];

// Decoy glyphs
const DECOY_GLYPHS = ['▒', '#', '%', '?'];

// Boot lines
const BOOT_LINES = [
  '[ OK ] Mounted /dev/nostalgia',
  '[ OK ] Started retro.service',
  '[ OK ] Started X display manager',
  '[ OK ] Reached target Graphical Interface',
  '[ OK ] Welcome to Retro OS!',
];

interface LetterSlot {
  letter: string;
  filled: boolean;
}

interface FallingLetter {
  sprite: Phaser.GameObjects.Text;
  letter: string;
  isDecoy: boolean;
  decoyChar: string;
  spawnTime: number;
  removed: boolean;
}

interface TextBullet {
  sprite: Phaser.GameObjects.Text;
  warning: Phaser.GameObjects.Text;
  speed: number;
  direction: 1 | -1;
  removed: boolean;
}

interface CageWall {
  texts: Phaser.GameObjects.Text[];
  building: boolean;
  completed: boolean;
  y: number;
  x: number;
  width: number;
}

export default class CliLevelScene extends BaseLevelScene {
  protected readonly levelId = 'cli' as const;

  // Game state
  private letterSlots: LetterSlot[] = [];
  private fallingLetters: FallingLetter[] = [];
  private textBullets: TextBullet[] = [];
  private cageTriggers: { y: number; triggered: boolean; cage?: CageWall }[] = [];
  private checkpoints: { x: number; y: number; text: Phaser.GameObjects.Text; activated: boolean }[] = [];

  // Player body parts display
  private bodyContainer!: Phaser.GameObjects.Container;
  private bodyParts: Phaser.GameObjects.Text[] = [];
  private partsLost = 0;

  // Char flood
  private floodY = 0;
  private floodActive = false;
  private floodRows: Phaser.GameObjects.Text[] = [];
  private floodPaused = false;
  private floodPauseTimer: Phaser.Time.TimerEvent | null = null;

  // Timers
  private letterSpawnTimer: Phaser.Time.TimerEvent | null = null;
  private bulletSpawnTimer: Phaser.Time.TimerEvent | null = null;
  private bulletInterval = 3000;

  // Phase
  private phase: 'boot' | 'login' | 'pressenter' | 'playing' | 'exiting' = 'boot';
  private playerName = 'Player';

  // Exit prompt
  private exitPrompt!: Phaser.GameObjects.Text;
  private exitPromptX = 680;
  private exitPromptY = 60;

  // Platforms group
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super(SceneKeys.Cli);
  }

  create(): void {
    // Setup world
    this.setupWorld(CLI_WORLD_WIDTH, CLI_WORLD_HEIGHT, 0x000000);

    // Create core components
    this.helper = new Helper(this, 'cli');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'cli');

    // Initialize letter slots
    this.letterSlots = TARGET_WORD.split('').map((l) => ({ letter: l, filled: false }));

    // Create CLI textures
    this.createCLITextures();

    // Create player - invisible body with ASCII display
    ensureTexture(this, 'player-stick-px', 1, 1, (g) => {
      g.fillStyle(0x00ff00, 0.01);
      g.fillRect(0, 0, 1, 1);
    });

    this.spawnPlayer(100, CLI_WORLD_HEIGHT - 100, {
      texture: 'player-stick-px',
      bodySize: { w: 22, h: 46 },
    });

    // Create ASCII body display
    this.createBodyDisplay();

    // Set initial checkpoint
    this.setCheckpoint(100, CLI_WORLD_HEIGHT - 100);

    // Create platforms
    this.createPlatforms();

    // Create exit prompt (world object, top-right)
    this.exitPrompt = this.add.text(
      780,
      this.exitPromptY,
      'user@retro:~$ █',
      {
        fontSize: '18px',
        color: CLI_GREEN,
        fontFamily: 'monospace',
      },
    );
    this.exitPrompt.setOrigin(1, 0);

    // Create checkpoints
    this.createCheckpoints();

    // Create cage triggers
    this.cageTriggers = [
      { y: 1200, triggered: false },
      { y: 600, triggered: false },
    ];

    // Start boot sequence
    this.startBootSequence();
  }

  private createCLITextures(): void {
    // Letter texture for falling letters
    ensureTexture(this, 'cli-letter', 24, 24, (g) => {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, 0, 24, 24);
    });

    // Decoy texture (inverse video)
    ensureTexture(this, 'cli-decoy', 24, 24, (g) => {
      g.fillStyle(0x33ff66, 1);
      g.fillRect(0, 0, 24, 24);
    });

    // Flood glyph texture
    ensureTexture(this, 'cli-flood-glyph', 16, 16, (g) => {
      g.fillStyle(0x1a8033, 0.8);
      g.fillRect(0, 0, 16, 16);
    });
  }

  private createBodyDisplay(): void {
    this.bodyContainer = this.add.container(0, 0);
    this.bodyContainer.setDepth(100);

    // Create 6 body part texts
    const partTexts = [' O ', '/|\\', '/ \\'];
    const partPositions = [
      { x: 0, y: -23 },  // head
      { x: -8, y: 0 },   // left arm
      { x: 0, y: 0 },    // torso
      { x: 8, y: 0 },    // right arm
      { x: -6, y: 23 },  // left leg
      { x: 6, y: 23 },   // right leg
    ];

    for (let i = 0; i < 6; i++) {
      const text = this.add.text(0, 0, '', {
        fontSize: '18px',
        color: CLI_GREEN,
        fontFamily: 'monospace',
      });
      text.setOrigin(0.5, 0.5);
      this.bodyParts.push(text);
      this.bodyContainer.add(text);
    }

    this.updateBodyDisplay();
  }

  private updateBodyDisplay(): void {
    const facing = this.player.facing;
    const isWalking = Math.abs((this.player.sprite.body as Phaser.Physics.Arcade.Body).velocity.x) > 10;
    const walkFrame = isWalking ? Math.floor(Date.now() / 200) % 2 : 0;

    // Body part indices: 0=head, 1=left arm, 2=torso, 3=right arm, 4=left leg, 5=right leg
    // Loss order: partsLost=1→right leg(5), 2→left leg(4), 3→right arm(3), 4→left arm(1), 5→torso(2), 6→head(0)

    // Head (lost at partsLost >= 6)
    if (this.partsLost < 6) {
      this.bodyParts[0].setText(' O ');
      this.bodyParts[0].setPosition(0, -23);
    } else {
      this.bodyParts[0].setText('');
    }

    // Left arm (lost at partsLost >= 4)
    if (this.partsLost < 4) {
      this.bodyParts[1].setText(facing === 1 ? '/' : '\\');
      this.bodyParts[1].setPosition(-8, 0);
    } else {
      this.bodyParts[1].setText('');
    }

    // Torso (lost at partsLost >= 5)
    if (this.partsLost < 5) {
      this.bodyParts[2].setText('|');
      this.bodyParts[2].setPosition(0, 0);
    } else {
      this.bodyParts[2].setText('');
    }

    // Right arm (lost at partsLost >= 3)
    if (this.partsLost < 3) {
      this.bodyParts[3].setText(facing === 1 ? '\\' : '/');
      this.bodyParts[3].setPosition(8, 0);
    } else {
      this.bodyParts[3].setText('');
    }

    // Left leg (lost at partsLost >= 2)
    if (this.partsLost < 2) {
      this.bodyParts[4].setText(isWalking && walkFrame === 0 ? '/' : '|');
      this.bodyParts[4].setPosition(-6, 23);
    } else {
      this.bodyParts[4].setText('');
    }

    // Right leg (lost at partsLost >= 1)
    if (this.partsLost < 1) {
      this.bodyParts[5].setText(isWalking && walkFrame === 1 ? '\\' : '|');
      this.bodyParts[5].setPosition(6, 23);
    } else {
      this.bodyParts[5].setText('');
    }
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    // Ground at bottom
    for (let x = 0; x < CLI_WORLD_WIDTH; x += TILE_SIZE) {
      this.platforms.create(x, CLI_WORLD_HEIGHT - TILE_SIZE / 2, 'ground');
    }

    // Platform route - vertical climb with at least two routes in middle
    interface PlatformDef { x: number; y: number; text: string; isRageTrap?: boolean }
    const platformLines: PlatformDef[] = [
      // Bottom section - single route
      { x: 50, y: CLI_WORLD_HEIGHT - 180, text: 'drwxr-xr-x  user  2.0K  memories/' },
      { x: 250, y: CLI_WORLD_HEIGHT - 280, text: 'Reading package lists... Done' },
      { x: 100, y: CLI_WORLD_HEIGHT - 380, text: '[ OK ] Started ssh.service' },
      { x: 350, y: CLI_WORLD_HEIGHT - 480, text: 'total 128' },

      // Middle section - two routes
      { x: 150, y: CLI_WORLD_HEIGHT - 590, text: '-rw-r--r--  user  4.0K  notes.txt' },
      { x: 500, y: CLI_WORLD_HEIGHT - 590, text: 'drwxr-xr-x  root  8.0K  system/' },
      { x: 300, y: CLI_WORLD_HEIGHT - 700, text: '[ OK ] Mounted /home/user' },
      { x: 650, y: CLI_WORLD_HEIGHT - 700, text: 'Processing triggers...' },
      { x: 100, y: CLI_WORLD_HEIGHT - 810, text: 'Setting up retro-os...' },
      { x: 500, y: CLI_WORLD_HEIGHT - 810, text: 'Configuring display manager' },

      // Rage trap platform on main route
      { x: 300, y: CLI_WORLD_HEIGHT - 920, text: '[ .. ] Waiting for network', isRageTrap: true },

      { x: 150, y: CLI_WORLD_HEIGHT - 1030, text: '[ OK ] Network is live' },
      { x: 450, y: CLI_WORLD_HEIGHT - 1030, text: 'System ready' },
      { x: 250, y: CLI_WORLD_HEIGHT - 1140, text: 'Loading user profile...' },
      { x: 550, y: CLI_WORLD_HEIGHT - 1250, text: 'Starting desktop environment' },

      // Upper section
      { x: 150, y: CLI_WORLD_HEIGHT - 1360, text: 'Checking dependencies...' },
      { x: 400, y: CLI_WORLD_HEIGHT - 1470, text: 'All packages up to date' },
      { x: 200, y: CLI_WORLD_HEIGHT - 1580, text: '[ OK ] Ready for X session' },
      { x: 500, y: CLI_WORLD_HEIGHT - 1690, text: 'user@retro:~$ _' },

      // Top platform near exit
      { x: 600, y: 120, text: 'Welcome to Retro OS' },
    ];

    for (const p of platformLines) {
      const key = textTexture(this, `cli-plat-${p.text}`, p.text, {
        fontSize: '16px',
        color: CLI_GREEN,
        fontFamily: 'monospace',
      });

      const bounds = this.textures.get(key).getSourceImage() as HTMLImageElement;
      const w = bounds.width || 128;
      const h = bounds.height || 20;

      if (p.isRageTrap) {
        // Create vanishing platform
        createVanishingPlatform(this, this.platforms, p.x, p.y, key, {
          label: '(Not Responding)',
          vanishMs: 500,
          respawnMs: 3000,
        });
      } else {
        this.platforms.create(p.x, p.y, key);
      }
    }

    // Collider
    this.physics.add.collider(this.player.sprite, this.platforms);
  }

  private createCheckpoints(): void {
    const cpPositions = [
      { x: 100, y: CLI_WORLD_HEIGHT - 100 },
      { x: 200, y: CLI_WORLD_HEIGHT - 900 },
      { x: 300, y: CLI_WORLD_HEIGHT - 1500 },
    ];

    for (const cp of cpPositions) {
      const text = this.add.text(cp.x, cp.y - 20, '[ OK ] checkpoint saved', {
        fontSize: '14px',
        color: CLI_DIM,
        fontFamily: 'monospace',
      });
      text.setScrollFactor(1);

      this.checkpoints.push({ x: cp.x, y: cp.y, text, activated: false });
    }
  }

  private bootBackdrop!: Phaser.GameObjects.Graphics;
  private bootTexts: Phaser.GameObjects.Text[] = [];
  private bootSkipped = false;

  private startBootSequence(): void {
    this.phase = 'boot';
    this.player.setControlsEnabled(false);

    // Black backdrop during boot (screen space)
    this.bootBackdrop = this.add.graphics();
    this.bootBackdrop.fillStyle(0x000000, 1);
    this.bootBackdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.bootBackdrop.setScrollFactor(0);
    this.bootBackdrop.setDepth(650);

    const startY = 100;

    // Type each boot line
    BOOT_LINES.forEach((line, i) => {
      const y = startY + i * 30;
      const text = this.add.text(40, y, '', {
        fontSize: '16px',
        color: CLI_GREEN,
        fontFamily: 'monospace',
      });
      text.setScrollFactor(0);
      text.setDepth(700);
      this.bootTexts.push(text);

      let charIndex = 0;
      const typeTimer = this.time.delayedCall(i * 800, () => {
        if (this.bootSkipped) return;
        const typeInterval = this.time.addEvent({
          delay: 20,
          callback: () => {
            if (charIndex < line.length) {
              text.setText(line.substring(0, charIndex + 1));
              sfx('keyclick', { volume: 0.1 });
              charIndex++;
            } else {
              typeInterval.remove();
            }
          },
          repeat: line.length - 1,
        });
      });
    });

    // Any key skips boot
    this.input.keyboard!.once('keydown-ANY', () => {
      if (this.phase === 'boot') {
        this.bootSkipped = true;
        this.showPressEnter();
      }
    });

    // After boot lines, show PRESS ENTER
    const totalBootTime = BOOT_LINES.length * 800 + 2000;
    this.time.delayedCall(totalBootTime, () => {
      if (!this.bootSkipped) {
        this.showPressEnter();
      }
    });
  }

  private showPressEnter(): void {
    this.phase = 'pressenter';

    const enterText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PRESS ENTER TO START', {
      fontSize: '24px',
      color: CLI_GREEN,
      fontFamily: 'monospace',
    });
    enterText.setOrigin(0.5);
    enterText.setScrollFactor(0);
    enterText.setDepth(500);

    // Blink
    this.tweens.add({
      targets: enterText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Wait for Enter
    this.input.keyboard!.once('keydown-ENTER', () => {
      enterText.destroy();
      this.startLogin();
    });
  }

  private startPlaying(): void {
    // Destroy boot overlay elements
    this.bootBackdrop.destroy();
    for (const t of this.bootTexts) t.destroy();
    this.bootTexts = [];

    this.phase = 'playing';
    this.player.setControlsEnabled(true);

    // Helper greeting
    this.helper.say(`Welcome back, ${this.playerName}. Arrows to move, ↑ to jump. Catch the falling letters.`, {
      holdMs: 6000,
    });

    // Start game systems
    this.startFallingLetters();
    this.startTextBullets();
  }

  private startLogin(): void {
    this.phase = 'login';

    this.prompt.open({
      label: 'login:',
      maxLength: 12,
      placeholder: '_',
    }).then((result) => {
      this.playerName = (result ?? 'Player').trim() || 'Player';
      setPlayerName(this, this.playerName);

      this.startPlaying();
    });
  }

  private startFallingLetters(): void {
    // Spawn a needed letter every 2.5s
    this.letterSpawnTimer = this.time.addEvent({
      delay: 2500,
      callback: () => {
        if (this.phase !== 'playing') return;
        this.spawnLetter();
      },
      loop: true,
    });
  }

  private spawnLetter(): void {
    // Find unfilled slots
    const unfilled = this.letterSlots
      .map((slot, i) => ({ slot, index: i }))
      .filter(({ slot }) => !slot.filled);

    if (unfilled.length === 0) return;

    // 75% chance for needed letter, 25% for decoy
    const isDecoy = Math.random() < 0.25;

    let letter = '';
    let decoyChar = '';

    if (isDecoy) {
      decoyChar = DECOY_GLYPHS[Math.floor(Math.random() * DECOY_GLYPHS.length)];
      letter = decoyChar;
    } else {
      const pick = unfilled[Math.floor(Math.random() * unfilled.length)];
      letter = pick.slot.letter;
    }

    // Spawn position: random x within camera view, above camera top
    const cam = this.cameras.main;
    const spawnX = cam.scrollX + 50 + Math.random() * (cam.width - 100);
    const spawnY = cam.scrollY - 40;

    const text = this.add.text(spawnX, spawnY, letter, {
      fontSize: '20px',
      color: isDecoy ? CLI_BLACK : CLI_GREEN,
      fontFamily: 'monospace',
      backgroundColor: isDecoy ? CLI_GREEN : undefined,
      padding: isDecoy ? { x: 2, y: 1 } : undefined,
    });
    text.setOrigin(0.5);

    // Make it a physics body (dynamic)
    this.physics.add.existing(text);
    const body = text.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setAccelerationY(120);
    body.setMaxVelocity(0, 260);
    body.setBounce(0.2);
    body.setCollideWorldBounds(false);

    const fallingLetter: FallingLetter = {
      sprite: text,
      letter,
      isDecoy,
      decoyChar,
      spawnTime: this.time.now,
      removed: false,
    };
    this.fallingLetters.push(fallingLetter);

    // Collision with platforms
    this.physics.add.collider(text, this.platforms);

    // Collision with player
    this.physics.add.overlap(text, this.player.sprite, () => {
      this.onLetterCollect(fallingLetter);
    });

    // Blink after 5s, remove after 7s
    this.time.delayedCall(5000, () => {
      if (fallingLetter.removed) return;
      this.tweens.add({
        targets: text,
        alpha: 0.2,
        duration: 200,
        yoyo: true,
        repeat: -1,
      });
    });

    this.time.delayedCall(7000, () => {
      if (fallingLetter.removed) return;
      fallingLetter.removed = true;
      text.destroy();
    });
  }

  private onLetterCollect(letter: FallingLetter): void {
    if (letter.removed) return;
    letter.removed = true;
    letter.sprite.destroy();

    if (letter.isDecoy) {
      this.hurtPlayer('corrupt');
      return;
    }

    // Fill the next matching empty slot
    for (const slot of this.letterSlots) {
      if (!slot.filled && slot.letter === letter.letter) {
        slot.filled = true;
        break;
      }
    }

    // Rising pitch per slot filled
    const filledCount = this.letterSlots.filter((s) => s.filled).length;
    sfx('collect', { pitch: 1 + filledCount * 0.1 });
    emitGame('collect', { level: this.levelId, item: letter.letter });

    this.updateLetterHUD();

    // Check if all letters collected
    if (this.letterSlots.every((s) => s.filled)) {
      this.onAllLettersCollected();
    }

    // Start flood on first letter collected
    if (!this.floodActive && filledCount >= 1) {
      this.startFlood();
    }
  }

  private updateLetterHUD(): void {
    const display = this.letterSlots.map((slot) => {
      if (slot.filled) {
        return slot.letter;
      }
      return '_';
    }).join(' ');

    this.hud.setLeft(`> ${display}`);
  }

  private onAllLettersCollected(): void {
    this.helper.say('"start"... wait, that\'s half a command. startx boots the graphical desktop! Get to the prompt — top right.', {
      holdMs: 8000,
    });

    // Glow the exit prompt
    this.tweens.add({
      targets: this.exitPrompt,
      alpha: 0.5,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
  }

  private startTextBullets(): void {
    this.bulletSpawnTimer = this.time.addEvent({
      delay: this.bulletInterval,
      callback: () => {
        if (this.phase !== 'playing') return;
        this.spawnTextBullet();
      },
      loop: true,
    });
  }

  private spawnTextBullet(): void {
    const text = TEXT_ATTACKS[Math.floor(Math.random() * TEXT_ATTACKS.length)];
    const cam = this.cameras.main;

    // Random direction
    const direction = Math.random() < 0.5 ? 1 : -1;
    const speed = 220 + Math.random() * 80;

    // Spawn at screen edge
    const spawnX = direction === 1 ? cam.scrollX - 100 : cam.scrollX + cam.width + 100;
    const spawnY = cam.scrollY + 50 + Math.random() * (cam.height - 100);

    const bulletText = this.add.text(spawnX, spawnY, text, {
      fontSize: '16px',
      color: CLI_GREEN,
      fontFamily: 'monospace',
    });
    bulletText.setOrigin(0.5);

    // Warning at screen edge 700ms before
    const warningX = direction === 1 ? cam.scrollX + 10 : cam.scrollX + cam.width - 10;
    const warning = this.add.text(warningX, spawnY, '>>', {
      fontSize: '16px',
      color: CLI_GREEN,
      fontFamily: 'monospace',
    });
    warning.setOrigin(direction === 1 ? 0 : 1, 0.5);
    warning.setScrollFactor(0);

    // Blink warning
    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });

    // Delay bullet spawn by 700ms
    this.time.delayedCall(700, () => {
      warning.destroy();
      bulletText.setVisible(true);

      const bullet: TextBullet = {
        sprite: bulletText,
        warning,
        speed,
        direction,
        removed: false,
      };
      this.textBullets.push(bullet);

      // Collision with player
      this.physics.add.overlap(bulletText, this.player.sprite, () => {
        if (bullet.removed) return;
        bullet.removed = true;
        bulletText.destroy();
        this.hurtPlayer('text-attack');
      });
    });

    // Ramp up speed as more slots filled
    const filledCount = this.letterSlots.filter((s) => s.filled).length;
    this.bulletInterval = Math.max(1600, 3000 - filledCount * 300);
  }

  private startFlood(): void {
    this.floodActive = true;
    this.floodY = CLI_WORLD_HEIGHT;

    this.helper.say('Uh oh. Buffer overflow incoming.', { holdMs: 3000 });

    // Create flood rows
    const glyphs = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    for (let row = 0; row < 10; row++) {
      let line = '';
      for (let col = 0; col < 50; col++) {
        line += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      const text = this.add.text(0, this.floodY - row * 20, line, {
        fontSize: '14px',
        color: CLI_DIM,
        fontFamily: 'monospace',
      });
      text.setScrollFactor(1);
      text.setVisible(false);
      this.floodRows.push(text);
    }
  }

  private updateFlood(delta: number): void {
    if (!this.floodActive || this.floodPaused) return;

    // Rise at 14 px/s
    const riseAmount = 14 * (delta / 1000);
    this.floodY -= riseAmount;

    // Update flood rows
    for (let i = 0; i < this.floodRows.length; i++) {
      const row = this.floodRows[i];
      const rowY = this.floodY - i * 20;
      row.setPosition(0, rowY);
      row.setVisible(rowY > this.cameras.main.scrollY - 20 && rowY < this.cameras.main.scrollY + this.cameras.main.height + 20);
    }

    // Check collision with player
    const playerY = this.player.sprite.y;
    if (playerY > this.floodY - 200) {
      this.hurtPlayer('flood');
      // Bounce player upward
      this.player.sprite.setVelocityY(-500);
    }
  }

  private pauseFlood(): void {
    this.floodPaused = true;
    this.floodPauseTimer = this.time.delayedCall(4000, () => {
      this.floodPaused = false;
    });
  }

  // Loss order: right leg(5), left leg(4), right arm(3), left arm(1), torso(2), head(0)
  private readonly lossOrder = [5, 4, 3, 1, 2, 0];

  // Override hurtPlayer to handle body parts
  protected onHurt(source: string): 'survive' | 'dead' {
    if (this.partsLost >= 6) return 'dead';

    const partIndex = this.lossOrder[this.partsLost];
    this.partsLost++;
    sfx('beepError');

    // Pop off the lost glyph
    this.popOffBodyPart(partIndex);

    emitGame('player-hit', {
      level: this.levelId,
      remaining: 6 - this.partsLost,
    });

    this.updateBodyHUD();

    // Head gone = dead
    if (this.partsLost >= 6) {
      return 'dead';
    }

    return 'survive';
  }

  private popOffBodyPart(partIndex: number): void {
    // Find the text element for this part
    const part = this.bodyParts[partIndex];
    if (!part || part.text === '') return;

    const text = part.text;
    const worldX = this.player.sprite.x + (part.x ?? 0);
    const worldY = this.player.sprite.y + (part.y ?? 0);

    // Create a flying text that tweens away
    const flyText = this.add.text(worldX, worldY, text, {
      fontSize: '18px',
      color: CLI_GREEN,
      fontFamily: 'monospace',
    });
    flyText.setOrigin(0.5);
    flyText.setScrollFactor(1);

    // Tween: fly up, spin and fade
    this.tweens.add({
      targets: flyText,
      y: flyText.y - 100,
      alpha: 0,
      angle: 360,
      duration: 800,
      onComplete: () => flyText.destroy(),
    });

    // Clear the body part
    part.setText('');
  }

  protected onDeath(reason: string): void {
    // Crumble animation
    for (const part of this.bodyParts) {
      if (part.text === '') continue;
      const text = part.text;
      const worldX = this.player.sprite.x + (part.x ?? 0);
      const worldY = this.player.sprite.y + (part.y ?? 0);

      const flyText = this.add.text(worldX, worldY, text, {
        fontSize: '18px',
        color: CLI_GREEN,
        fontFamily: 'monospace',
      });
      flyText.setOrigin(0.5);
      flyText.setScrollFactor(1);

      this.tweens.add({
        targets: flyText,
        y: flyText.y + 100 + Math.random() * 50,
        x: flyText.x + (Math.random() - 0.5) * 60,
        alpha: 0,
        duration: 1000 + Math.random() * 500,
        onComplete: () => flyText.destroy(),
      });
    }

    this.player.sprite.setAlpha(0.3);

    // Restore body parts on respawn (after killPlayer's 500ms delay)
    this.time.delayedCall(500, () => {
      this.partsLost = 0;
      this.updateBodyDisplay();
      this.updateBodyHUD();
    });
  }

  private updateBodyHUD(): void {
    const deaths = getDeaths(this);

    // Build mini body display matching loss order
    let display = '';

    // Head
    if (this.partsLost < 6) display += ' O\n';
    else display += '   \n';

    // Middle row: left arm, torso, right arm
    let middle = '';
    if (this.partsLost < 4) middle += '/';
    else middle += ' ';
    if (this.partsLost < 5) middle += '|';
    else middle += ' ';
    if (this.partsLost < 3) middle += '\\';
    else middle += ' ';
    display += middle + '\n';

    // Legs: left leg, right leg
    let legs = '';
    if (this.partsLost < 2) legs += '/';
    else legs += ' ';
    legs += ' ';
    if (this.partsLost < 1) legs += '\\';
    else legs += ' ';
    display += legs;

    display += `\ndeaths: ${deaths}`;

    this.hud.setRight(display);
  }

  private checkCheckpoints(): void {
    for (const cp of this.checkpoints) {
      if (cp.activated) continue;

      const dx = this.player.sprite.x - cp.x;
      const dy = this.player.sprite.y - cp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        cp.activated = true;
        this.setCheckpoint(cp.x, cp.y);
        cp.text.setColor(CLI_GREEN);
        sfx('notify');
        this.pauseFlood();
      }
    }
  }

  private checkCageTriggers(): void {
    for (const trigger of this.cageTriggers) {
      if (trigger.triggered) continue;

      const dy = this.player.sprite.y - trigger.y;
      if (Math.abs(dy) < 30) {
        trigger.triggered = true;
        this.buildCage(trigger);
      }
    }
  }

  private buildCage(trigger: { y: number; triggered: boolean; cage?: CageWall }): void {
    this.helper.sayOnce('cage-intro', 'It\'s drawing a box around you. Don\'t be inside the box.');

    const cageWidth = 120;
    const cageHeight = 80;
    const texts: Phaser.GameObjects.Text[] = [];

    // Build walls over 1.8s, one char every 60ms
    let charCount = 0;
    const totalChars = Math.floor(cageWidth / 16) * 2 + Math.floor(cageHeight / 16) * 2;

    const buildInterval = this.time.addEvent({
      delay: 60,
      callback: () => {
        if (charCount >= totalChars) {
          buildInterval.remove();
          // Cage completed - check if player inside
          const px = this.player.sprite.x;
          const py = this.player.sprite.y;
          const cageLeft = trigger.cage!.x - cageWidth / 2;
          const cageRight = trigger.cage!.x + cageWidth / 2;
          const cageTop = trigger.cage!.y - cageHeight / 2;
          const cageBottom = trigger.cage!.y + cageHeight / 2;

          if (px > cageLeft && px < cageRight && py > cageTop && py < cageBottom) {
            this.hurtPlayer('cage');
          }

          // Shatter the cage
          for (const t of texts) {
            this.tweens.add({
              targets: t,
              alpha: 0,
              y: t.y + 50,
              duration: 500,
              onComplete: () => t.destroy(),
            });
          }
          return;
        }

        sfx('keyclick', { volume: 0.15 });
        const char = '|';
        const text = this.add.text(0, 0, char, {
          fontSize: '16px',
          color: CLI_GREEN,
          fontFamily: 'monospace',
        });
        text.setOrigin(0.5);
        text.setScrollFactor(1);

        // Position along the cage perimeter
        const perimeter = this.getCagePerimeterPosition(charCount, cageWidth, cageHeight, trigger.y);
        text.setPosition(perimeter.x, perimeter.y);
        texts.push(text);
        charCount++;
      },
      repeat: totalChars - 1,
    });

    trigger.cage = {
      texts,
      building: true,
      completed: false,
      y: trigger.y,
      x: this.player.sprite.x,
      width: cageWidth,
    };
  }

  private getCagePerimeterPosition(index: number, width: number, height: number, centerY: number): { x: number; y: number } {
    const step = 16;
    const halfW = width / 2;
    const halfH = height / 2;
    const centerX = this.player.sprite.x;

    // Bottom edge
    const bottomChars = Math.floor(width / step);
    if (index < bottomChars) {
      return { x: centerX - halfW + index * step, y: centerY + halfH };
    }
    index -= bottomChars;

    // Right edge
    const rightChars = Math.floor(height / step);
    if (index < rightChars) {
      return { x: centerX + halfW, y: centerY + halfH - index * step };
    }
    index -= rightChars;

    // Top edge
    if (index < bottomChars) {
      return { x: centerX + halfW - index * step, y: centerY - halfH };
    }
    index -= bottomChars;

    // Left edge
    return { x: centerX - halfW, y: centerY - halfH + index * step };
  }

  private checkExitPrompt(): void {
    const dx = this.player.sprite.x - this.exitPromptX;
    const dy = this.player.sprite.y - this.exitPromptY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 60) {
      // Check if all letters collected
      if (!this.letterSlots.every((s) => s.filled)) {
        this.helper.sayOnce('prompt-early', 'Permission denied (collect the command first)');
        return;
      }

      // Check for interact key
      if (this.player.justPressed('interact')) {
        this.openExitPrompt();
      }
    }
  }

  private openExitPrompt(): void {
    this.player.setControlsEnabled(false);

    this.prompt.open({
      label: 'user@retro:~$',
      maxLength: 20,
      placeholder: '_',
    }).then((result) => {
      this.player.setControlsEnabled(true);

      if (result === null) return; // Esc

      const input = result.trim().toLowerCase();

      if (input === 'startx') {
        this.exitLevel();
      } else {
        // Wrong input
        const errorMsg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, `bash: ${input}: command not found`, {
          fontSize: '16px',
          color: CLI_GREEN,
          fontFamily: 'monospace',
        });
        errorMsg.setOrigin(0.5);
        errorMsg.setScrollFactor(0);
        errorMsg.setDepth(700);

        this.time.delayedCall(2000, () => errorMsg.destroy());

        this.hurtPlayer('typo');
        this.helper.say('Typo. That\'s a leg.', { holdMs: 3000 });
      }
    });
  }

  private exitLevel(): void {
    this.phase = 'exiting';
    this.player.setControlsEnabled(false);

    // Print exit messages
    const msg1 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'Starting X server...', {
      fontSize: '18px',
      color: CLI_GREEN,
      fontFamily: 'monospace',
    });
    msg1.setOrigin(0.5);
    msg1.setScrollFactor(0);
    msg1.setDepth(800);

    this.time.delayedCall(1000, () => {
      const msg2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'xinit: connecting to display :0', {
        fontSize: '18px',
        color: CLI_GREEN,
        fontFamily: 'monospace',
      });
      msg2.setOrigin(0.5);
      msg2.setScrollFactor(0);
      msg2.setDepth(800);

      sfx('dialup');

      // White out from center
      this.time.delayedCall(1500, () => {
        const whiteRect = this.add.rectangle(0, 0, 1, 1, 0xffffff, 0);
        whiteRect.setScrollFactor(0);
        whiteRect.setDepth(900);
        whiteRect.setOrigin(0.5);
        whiteRect.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        this.tweens.add({
          targets: whiteRect,
          width: GAME_WIDTH * 3,
          height: GAME_HEIGHT * 3,
          alpha: 1,
          duration: 500,
          onComplete: () => {
            this.completeLevel(SceneKeys.XpDesktop);
          },
        });
      });
    });
  }

  tick(_time: number, delta: number): void {
    if (this.phase !== 'playing') return;
    if (this.prompt.isOpen) return;

    // Update body display position
    this.bodyContainer.setPosition(this.player.sprite.x, this.player.sprite.y);
    this.updateBodyDisplay();

    // Update falling letters
    this.fallingLetters = this.fallingLetters.filter((l) => !l.removed);

    // Update text bullets
    for (const bullet of this.textBullets) {
      if (bullet.removed) continue;
      bullet.sprite.x += bullet.speed * bullet.direction * (delta / 1000);

      // Remove if out of world bounds
      if (bullet.sprite.x < -200 || bullet.sprite.x > CLI_WORLD_WIDTH + 200) {
        bullet.removed = true;
        bullet.sprite.destroy();
      }
    }
    this.textBullets = this.textBullets.filter((b) => !b.removed);

    // Update flood
    this.updateFlood(delta);

    // Check checkpoints
    this.checkCheckpoints();

    // Check cage triggers
    this.checkCageTriggers();

    // Check exit prompt
    this.checkExitPrompt();

    // Update helper
    this.helper.update(this.player.sprite.x, this.player.sprite.y);
  }
}

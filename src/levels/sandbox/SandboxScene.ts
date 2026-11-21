import Phaser from 'phaser';
import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';
import { createVanishingPlatform } from '../../core/VanishingPlatform';

export default class SandboxScene extends BaseLevelScene {
  protected readonly levelId = 'cli' as const;

  constructor() {
    super(SceneKeys.Sandbox);
  }

  create(): void {
    this.setupWorld(1600, GAME_HEIGHT, 0x1a1a2e);

    // Create helper and HUD
    this.helper = new Helper(this, 'cli');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'cli');

    // Spawn player
    this.spawnPlayer(100, 400, { texture: 'player' });
    this.setCheckpoint(100, 400);

    // Platforms
    const platforms = this.physics.add.staticGroup();

    // Ground
    for (let x = 0; x < 25; x++) {
      platforms.create(x * TILE_SIZE, GAME_HEIGHT - TILE_SIZE, 'ground');
    }
    // Floating platforms
    const platformPositions = [
      { x: 200, y: 450, w: 4 },
      { x: 400, y: 370, w: 4 },
      { x: 600, y: 290, w: 4 },
      { x: 100, y: 230, w: 3 },
      { x: 500, y: 180, w: 4 },
      { x: 750, y: 350, w: 3 },
      { x: 850, y: 250, w: 4 },
      { x: 1050, y: 350, w: 3 },
      { x: 1200, y: 280, w: 5 },
    ];
    for (const p of platformPositions) {
      for (let i = 0; i < p.w; i++) {
        platforms.create(p.x + i * TILE_SIZE, p.y, 'ground');
      }
    }

    // Vanishing platform — "Internet Exploder"
    createVanishingPlatform(this, platforms, 350, GAME_HEIGHT - TILE_SIZE * 2, 'ground', {
      label: 'Internet Exploder',
    });

    // Hazards
    const hazards = this.physics.add.staticGroup();
    for (let x = 0; x < 2; x++) {
      hazards.create(
        700 + x * TILE_SIZE,
        GAME_HEIGHT - TILE_SIZE * 2,
        'hazard',
      );
    }

    // Goal
    const goal = this.physics.add.sprite(1300, 230, 'goal');
    (goal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    goal.setImmovable(true);

    // Collisions
    this.physics.add.collider(this.player.sprite, platforms);
    this.physics.add.overlap(this.player.sprite, hazards, () => this.killPlayer('hazard'));
    this.physics.add.overlap(this.player.sprite, goal, () => this.completeLevel(SceneKeys.Cli));

    // Proximity hint
    this.helper.addProximityHint('first-platform', { x: 200, y: 450 }, 80, 'Try the floating platforms!');

    // Initial helper message
    this.helper.say('Welcome to the Sandbox! Press T to test the text prompt.', { holdMs: 4000 });

    // Camera
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
  }

  tick(_time: number, _delta: number): void {
    // Update helper proximity hints
    this.helper.update(this.player.sprite.x, this.player.sprite.y);

    // T key opens text prompt
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T)) && !this.prompt.isOpen) {
      this.prompt.open({ label: 'Type something:', maxLength: 50 }).then((result) => {
        if (result) {
          this.helper.say(`You typed: ${result}`);
        }
      });
    }

    // Enter to advance to next level
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER))) {
      this.completeLevel(SceneKeys.Cli);
    }
  }
}

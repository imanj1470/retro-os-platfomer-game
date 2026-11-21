import Phaser from 'phaser';
import type { LevelConfig } from '../types/LevelConfig';
import { PlayerController } from '../game/PlayerController';
import { LevelFactory, type BuiltLevel } from '../game/LevelFactory';
import { GameStateManager } from '../game/GameStateManager';
import { HUD } from '../game/HUD';
import { BASE_HEIGHT, TILE_SIZE, WORLD_WIDTH } from '../config/GameConfig';

// Placeholder Level 1 configuration
function createLevel1Config(): LevelConfig {
  return {
    key: 'level1',
    playerSpawn: { x: 100, y: 400 },
    backgroundColor: 0x1a1a2e,
    platforms: [
      // Ground — full width at bottom
      { x: 0, y: BASE_HEIGHT - TILE_SIZE, width: 25, height: 2 },
      // Floating platforms
      { x: 200, y: 450, width: 4, height: 1 },
      { x: 400, y: 370, width: 4, height: 1 },
      { x: 600, y: 290, width: 4, height: 1 },
      { x: 100, y: 230, width: 3, height: 1 },
      { x: 500, y: 180, width: 4, height: 1 },
      { x: 750, y: 350, width: 3, height: 1 },
      { x: 850, y: 250, width: 4, height: 1 },
      { x: 1050, y: 350, width: 3, height: 1 },
      { x: 1200, y: 280, width: 5, height: 1 },
    ],
    collectibles: [
      { x: 250, y: 420, key: 'collectible', value: 10 },
      { x: 300, y: 420, key: 'collectible', value: 10 },
      { x: 450, y: 340, key: 'collectible', value: 10 },
      { x: 500, y: 340, key: 'collectible', value: 10 },
      { x: 650, y: 260, key: 'collectible', value: 10 },
      { x: 150, y: 200, key: 'collectible', value: 10 },
      { x: 550, y: 150, key: 'collectible', value: 10 },
      { x: 600, y: 150, key: 'collectible', value: 10 },
      { x: 900, y: 220, key: 'collectible', value: 10 },
      { x: 1250, y: 250, key: 'collectible', value: 10 },
    ],
    hazards: [
      // Spikes on ground
      { x: 350, y: BASE_HEIGHT - TILE_SIZE * 2, width: 2, height: 1, key: 'hazard' },
      { x: 700, y: BASE_HEIGHT - TILE_SIZE * 2, width: 3, height: 1, key: 'hazard' },
    ],
    goal: { x: 1300, y: 230, key: 'goal' },
  };
}

export default class PlayScene extends Phaser.Scene {
  private playerController!: PlayerController;
  private level!: BuiltLevel;
  private gameState!: GameStateManager;
  private hud!: HUD;
  private levelConfig!: LevelConfig;
  private isPaused: boolean = false;
  private isRespawning: boolean = false;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    // Create level config
    this.levelConfig = createLevel1Config();

    // Set background color
    this.cameras.main.setBackgroundColor(
      '#' + this.levelConfig.backgroundColor.toString(16).padStart(6, '0')
    );

    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, BASE_HEIGHT);

    // Build level from config
    this.level = LevelFactory.build(this, this.levelConfig);

    // Create player controller
    const spawn = this.levelConfig.playerSpawn;
    this.playerController = new PlayerController(
      this,
      spawn.x,
      spawn.y,
      'player'
    );

    // Create game state manager
    this.gameState = new GameStateManager();

    // Create HUD
    this.hud = new HUD(this, this.gameState);

    // Camera follow player
    this.cameras.main.startFollow(
      this.playerController.spriteRef,
      true,
      0.08,
      0.08
    );
    this.cameras.main.setZoom(1);

    // Camera bounds — prevent showing empty void outside the level
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, BASE_HEIGHT);

    // Collisions
    this.physics.add.collider(
      this.playerController.spriteRef,
      this.level.platforms
    );

    // Collectible overlap
    this.physics.add.overlap(
      this.playerController.spriteRef,
      this.level.collectibles,
      (obj1, obj2) => {
        const collectible = obj2 as Phaser.Physics.Arcade.Sprite;
        const value = collectible.getData('value') as number;
        this.gameState.addScore(value);
        collectible.destroy();
      }
    );

    // Hazard overlap (for death) — use overlap instead of collider so player can touch hazards
    this.physics.add.overlap(
      this.playerController.spriteRef,
      this.level.hazards,
      this.onHazardHit.bind(this)
    );

    // Goal overlap
    this.physics.add.overlap(
      this.playerController.spriteRef,
      this.level.goal,
      this.onGoalReached.bind(this)
    );

    // Pause key (ESC)
    const escKey = this.input.keyboard!.addKey(27);
    escKey.on('down', () => {
      this.isPaused = !this.isPaused;
      this.gameState.setPause(this.isPaused);
      if (this.isPaused) {
        this.physics.pause();
      } else {
        this.physics.resume();
      }
    });

    // Restart key (R)
    const rKey = this.input.keyboard!.addKey(82);
    rKey.on('down', () => {
      if (
        this.gameState.state === 'gameover' ||
        this.gameState.state === 'levelcomplete'
      ) {
        this.scene.restart();
      }
    });
  }

  update(): void {
    if (this.isPaused || this.gameState.state !== 'playing') {
      this.hud.update();
      return;
    }

    this.playerController.update();

    // Fall death — check if player falls below world
    if (this.playerController.spriteRef.y > BASE_HEIGHT + 50) {
      this.onPlayerDeath();
    }

    this.hud.update();
  }

  private onHazardHit(): void {
    this.onPlayerDeath();
  }

  private onPlayerDeath(): void {
    if (this.gameState.state !== 'playing') return;
    if (this.isRespawning) return;

    this.isRespawning = true;
    this.gameState.loseLife();
    const spawn = this.levelConfig.playerSpawn;
    this.playerController.reset(spawn.x, spawn.y);

    // Blink player while invulnerable
    this.playerController.spriteRef.setAlpha(0.5);
    this.time.delayedCall(1000, () => {
      this.isRespawning = false;
      this.playerController.spriteRef.setAlpha(1);
    });
  }

  private onGoalReached(): void {
    this.gameState.completeLevel();
    this.physics.pause();
  }
}

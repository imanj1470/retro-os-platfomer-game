import Phaser from 'phaser';
import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';

export default class Win10BossScene extends BaseLevelScene {
  protected readonly levelId = 'win10' as const;

  constructor() {
    super(SceneKeys.Win10Boss);
  }

  create(): void {
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x0a0a2e);

    this.helper = new Helper(this, 'win10');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'win10');

    this.spawnPlayer(100, 400, { texture: 'player-blocky' });
    this.setCheckpoint(100, 400);

    // Ground strip
    const platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 25; x++) {
      platforms.create(x * TILE_SIZE, GAME_HEIGHT - TILE_SIZE, 'ground-win10');
    }
    this.physics.add.collider(this.player.sprite, platforms);

    // Title
    this.add.text(GAME_WIDTH / 2, 100, 'LEVEL 3 BOSS — Teemz (coming soon)', {
      fontSize: '28px',
      color: '#ff4444',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    this.hud.setLeft('Win10 Boss');
    this.helper.say('Teemz is waiting! Press Enter to continue.', { holdMs: 4000 });
  }

  tick(_time: number, _delta: number): void {
    this.helper.update(this.player.sprite.x, this.player.sprite.y);

    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER))) {
      this.completeLevel(SceneKeys.Ending);
    }
  }
}

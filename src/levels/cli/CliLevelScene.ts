import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';
import { ensureTexture } from '../../core/art';

export default class CliLevelScene extends BaseLevelScene {
  protected readonly levelId = 'cli' as const;
  protected readonly sceneKey = SceneKeys.Cli;

  constructor() {
    super();
  }

  create(): void {
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x000000);

    this.helper = new Helper(this, 'cli');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'cli');

    // CLI player is invisible — levels that draw ASCII figures pass a 1px texture
    ensureTexture(this, 'player-stick-px', 1, 1, (g) => {
      g.fillStyle(0x00ff00, 0.01);
      g.fillRect(0, 0, 1, 1);
    });

    this.spawnPlayer(100, 400, { texture: 'player-stick-px' });
    this.setCheckpoint(100, 400);

    // Ground strip
    const platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 25; x++) {
      const tile = platforms.create(x * TILE_SIZE, GAME_HEIGHT - TILE_SIZE, 'ground') as Phaser.Physics.Arcade.Sprite;
      tile.setImmovable(true);
      (tile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      tile.refreshBody();
    }
    this.physics.add.collider(this.player.sprite, platforms);

    // Title
    this.add.text(GAME_WIDTH / 2, 100, 'LEVEL 1 — CLI (coming soon)', {
      fontSize: '32px',
      color: '#00ff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    this.hud.setLeft('CLI');
    this.helper.say('Welcome to the Command Line era. Press Enter to continue.', { holdMs: 5000 });
  }

  tick(_time: number, _delta: number): void {
    this.helper.update(this.player.sprite.x, this.player.sprite.y);

    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (Phaser.Input.Keyboard.JustDown(enterKey)) {
      this.completeLevel(SceneKeys.XpDesktop);
    }
  }
}

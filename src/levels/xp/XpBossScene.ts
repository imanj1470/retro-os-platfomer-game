import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';

export default class XpBossScene extends BaseLevelScene {
  protected readonly levelId = 'xp' as const;
  protected readonly sceneKey = SceneKeys.XpBoss;

  constructor() {
    super();
  }

  create(): void {
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x004040);

    this.helper = new Helper(this, 'xp');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'xp');

    this.spawnPlayer(100, 400, { texture: 'player-floppy' });
    this.setCheckpoint(100, 400);

    // Ground strip
    const platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 25; x++) {
      const tile = platforms.create(x * TILE_SIZE, GAME_HEIGHT - TILE_SIZE, 'ground-xp') as Phaser.Physics.Arcade.Sprite;
      tile.setImmovable(true);
      (tile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      tile.refreshBody();
    }
    this.physics.add.collider(this.player.sprite, platforms);

    // Title
    this.add.text(GAME_WIDTH / 2, 100, 'LEVEL 2 BOSS — BuddyWare.exe (coming soon)', {
      fontSize: '24px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    this.hud.setLeft('XP Boss');
    this.helper.say('BuddyWare.exe awaits! Press Enter to continue.', { holdMs: 4000 });
  }

  tick(_time: number, _delta: number): void {
    this.helper.update(this.player.sprite.x, this.player.sprite.y);

    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (Phaser.Input.Keyboard.JustDown(enterKey)) {
      this.completeLevel(SceneKeys.Win10Hub);
    }
  }
}

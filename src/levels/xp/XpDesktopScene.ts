import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';
import { ensureTexture } from '../../core/art';

export default class XpDesktopScene extends BaseLevelScene {
  protected readonly levelId = 'xp' as const;
  protected readonly sceneKey = SceneKeys.XpDesktop;

  constructor() {
    super();
  }

  create(): void {
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x008080);

    this.helper = new Helper(this, 'xp');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'xp');

    // XP ground texture
    ensureTexture(this, 'ground-xp', TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0x008080, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(0x006060, 1);
      g.fillRect(0, 0, TILE_SIZE, 2);
      g.fillRect(0, 0, 2, TILE_SIZE);
    });

    // Floppy player
    ensureTexture(this, 'player-floppy', 32, 36, (g) => {
      g.fillStyle(0x444444, 1);
      g.fillRect(0, 4, 32, 32);
      g.fillStyle(0x666666, 1);
      g.fillRect(4, 0, 24, 8);
      // Eyes
      g.fillStyle(0xffffff, 1);
      g.fillRect(8, 14, 6, 6);
      g.fillRect(18, 14, 6, 6);
      g.fillStyle(0x000000, 1);
      g.fillRect(10, 16, 3, 3);
      g.fillRect(20, 16, 3, 3);
    });

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
    this.add.text(GAME_WIDTH / 2, 100, 'LEVEL 2 — XP DESKTOP (coming soon)', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    this.hud.setLeft('XP Desktop');
    this.helper.say('Welcome to the XP Desktop! Meet Sniff, your guide. Press Enter.', { holdMs: 5000 });
  }

  tick(_time: number, _delta: number): void {
    this.helper.update(this.player.sprite.x, this.player.sprite.y);

    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (Phaser.Input.Keyboard.JustDown(enterKey)) {
      this.completeLevel(SceneKeys.XpBoss);
    }
  }
}

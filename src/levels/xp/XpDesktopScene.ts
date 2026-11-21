import Phaser from 'phaser';
import { BaseLevelScene } from '../../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../../core/constants';
import { Helper } from '../../core/Helper';
import { HUD } from '../../core/HUD';
import { TextPrompt } from '../../core/TextPrompt';

export default class XpDesktopScene extends BaseLevelScene {
  protected readonly levelId = 'xp' as const;

  constructor() {
    super(SceneKeys.XpDesktop);
  }

  create(): void {
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x008080);

    this.helper = new Helper(this, 'xp');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'xp');

    this.spawnPlayer(100, 400, { texture: 'player-floppy' });
    this.setCheckpoint(100, 400);

    // Ground strip
    const platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 25; x++) {
      platforms.create(x * TILE_SIZE, GAME_HEIGHT - TILE_SIZE, 'ground-xp');
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

    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER))) {
      this.completeLevel(SceneKeys.XpBoss);
    }
  }
}

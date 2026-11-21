import { BaseLevelScene } from '../core/BaseLevelScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { Helper } from '../core/Helper';
import { HUD } from '../core/HUD';
import { TextPrompt } from '../core/TextPrompt';
import { getDeaths } from '../core/state';

export default class EndingScene extends BaseLevelScene {
  protected readonly levelId = 'win10' as const;
  protected readonly sceneKey = SceneKeys.Ending;

  constructor() {
    super();
  }

  create(): void {
    this.setupWorld(GAME_WIDTH, GAME_HEIGHT, 0x000000);

    this.helper = new Helper(this, 'win10');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'win10');

    // No player needed for ending
    this.spawnPlayer(GAME_WIDTH / 2, GAME_HEIGHT / 2, { texture: 'player-blocky' });
    this.player.setControlsEnabled(false);

    // Title
    this.add.text(GAME_WIDTH / 2, 150, 'THANKS FOR PLAYING', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    // Death count
    const deaths = getDeaths(this);
    this.add.text(GAME_WIDTH / 2, 220, `Total deaths: ${deaths}`, {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    // Press Enter
    this.add.text(GAME_WIDTH / 2, 300, 'Press Enter to play again', {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    this.helper.say('You made it! Thanks for playing.', { holdMs: 4000 });
  }

  tick(_time: number, _delta: number): void {
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (Phaser.Input.Keyboard.JustDown(enterKey)) {
      this.goTo(SceneKeys.Cli);
    }
  }
}

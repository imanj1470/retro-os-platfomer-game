import Phaser from 'phaser';
import type { GameStateManager } from './GameStateManager';

export class HUD {
  private gameState: GameStateManager;
  private scoreText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private stateText: Phaser.GameObjects.Text;
  private stateTextVisible: boolean = false;

  constructor(scene: Phaser.Scene, gameState: GameStateManager) {
    this.gameState = gameState;

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    };

    // Score display (top-left) — fixed to screen, doesn't scroll with camera
    this.scoreText = scene.add.text(16, 16, 'Score: 0', {
      ...style,
      fontSize: '24px',
      stroke: '#000000',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(1000);

    // Lives display (top-right) — fixed to screen
    this.livesText = scene.add.text(scene.scale.width - 116, 16, 'Lives: 3', {
      ...style,
      fontSize: '24px',
      stroke: '#000000',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(1000);

    // State message (centered, hidden by default) — fixed to screen
    const stateStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    };
    this.stateText = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height / 2,
      '',
      stateStyle
    ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1000);
    this.stateText.setVisible(false);
  }

  public update(): void {
    this.scoreText.setText(`Score: ${this.gameState.score}`);
    this.livesText.setText(`Lives: ${this.gameState.lives}`);

    const state = this.gameState.state;

    if (state === 'paused') {
      this.showStateText('PAUSED');
    } else if (state === 'gameover') {
      this.showStateText('GAME OVER\nPress R to Restart');
    } else if (state === 'levelcomplete') {
      this.showStateText('LEVEL COMPLETE\nPress R to Restart');
    } else {
      this.hideStateText();
    }
  }

  private showStateText(text: string): void {
    if (!this.stateTextVisible) {
      this.stateText.setVisible(true);
      this.stateTextVisible = true;
    }
    this.stateText.setText(text);
  }

  private hideStateText(): void {
    if (this.stateTextVisible) {
      this.stateText.setVisible(false);
      this.stateTextVisible = false;
    }
  }
}

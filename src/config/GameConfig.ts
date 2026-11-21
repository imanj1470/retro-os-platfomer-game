import Phaser from 'phaser';
import { sceneList } from '../core/sceneList';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from '../core/constants';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: PHYSICS.gravityY },
        debug: false,
      },
    },
    scene: sceneList,
  };
}

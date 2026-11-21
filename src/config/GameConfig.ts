import Phaser from 'phaser';
import BootScene from '../scenes/BootScene';
import PlayScene from '../scenes/PlayScene';

const TILE_SIZE = 32;
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const WORLD_WIDTH = 1600;

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 600 },
        debug: false,
      },
    },
    scene: [BootScene, PlayScene],
  };
}

export { TILE_SIZE, BASE_WIDTH, BASE_HEIGHT, WORLD_WIDTH };

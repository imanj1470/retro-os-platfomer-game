import Phaser from 'phaser';
import { SceneKeys } from '../core/constants';
import { ensureTexture } from '../core/art';
import { setPlayerName } from '../core/state';
import { getDebugParams } from '../core/debug';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Boot });
  }

  preload() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    const width = this.scale.width;
    const height = this.scale.height;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 20, 320, 40);

    this.load.on('progress', () => {
      const value = this.load.progress;
      progressBar.clear();
      progressBar.fillStyle(0x00ff88, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 10, 300 * value, 20);
    });

    this.load.on('complete', () => {
      progressBox.destroy();
      progressBar.destroy();
    });

    // Load placeholder assets from public/assets/
    this.load.image('player', 'assets/player.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.image('collectible', 'assets/collectible.png');
    this.load.image('hazard', 'assets/hazard.png');
    this.load.image('goal', 'assets/goal.png');
  }

  create() {
    // Generate procedural fallback textures
    this.generateProceduralTextures();

    // Generate era-specific textures
    this.generateEraTextures();

    // Set player name from debug params
    const debug = getDebugParams();
    if (debug.name) {
      setPlayerName(this, debug.name);
    }

    // Route to the correct scene
    const startScene = debug.level ?? SceneKeys.Cli;
    this.scene.start(startScene);
  }

  private generateEraTextures(): void {
    // Icon generic
    ensureTexture(this, 'icon-generic', 48, 48, (g) => {
      g.fillStyle(0x888888, 1);
      g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xaaaaaa, 1);
      g.fillRect(4, 4, 40, 40);
    });

    // Glyph block
    ensureTexture(this, 'glyph-block', 32, 32, (g) => {
      g.fillStyle(0x444444, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x666666, 1);
      g.fillRect(4, 4, 24, 24);
    });
  }

  private generateProceduralTextures(): void {
    // Only generate procedural textures as fallback when the PNG failed to load
    if (!this.textures.exists('player')) {
      const g = this.add.graphics();
      g.fillStyle(0x4488ff, 1);
      g.fillRect(0, 0, 32, 48);
      g.fillStyle(0xffffff, 1);
      g.fillRect(8, 12, 6, 6);
      g.fillRect(18, 12, 6, 6);
      g.fillStyle(0x000000, 1);
      g.fillRect(10, 14, 3, 3);
      g.fillRect(20, 14, 3, 3);
      g.fillStyle(0xff6666, 1);
      g.fillRect(10, 26, 12, 3);
      g.generateTexture('player', 32, 48);
      g.destroy();
    }

    if (!this.textures.exists('ground')) {
      const g = this.add.graphics();
      g.fillStyle(0x8B4513, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0xA0522D, 1);
      g.fillRect(2, 2, 28, 28);
      g.fillStyle(0x6B3410, 1);
      g.fillRect(0, 0, 32, 2);
      g.fillRect(0, 0, 2, 32);
      g.generateTexture('ground', 32, 32);
      g.destroy();
    }

    if (!this.textures.exists('collectible')) {
      const g = this.add.graphics();
      g.fillStyle(0xffd700, 1);
      g.fillCircle(16, 16, 14);
      g.fillStyle(0xffa500, 1);
      g.fillCircle(16, 16, 10);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(16, 16, 6);
      g.generateTexture('collectible', 32, 32);
      g.destroy();
    }

    if (!this.textures.exists('hazard')) {
      const g = this.add.graphics();
      g.fillStyle(0xcc0000, 1);
      g.fillRect(0, 24, 32, 8);
      g.fillStyle(0xff0000, 1);
      g.fillTriangle(0, 24, 8, 0, 16, 24);
      g.fillTriangle(8, 24, 16, 0, 24, 24);
      g.fillTriangle(16, 24, 24, 0, 32, 24);
      g.generateTexture('hazard', 32, 32);
      g.destroy();
    }

    if (!this.textures.exists('goal')) {
      const g = this.add.graphics();
      g.fillStyle(0x800080, 1);
      g.fillRect(4, 0, 24, 48);
      g.fillStyle(0x9932CC, 1);
      g.fillRect(6, 2, 20, 44);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(22, 24, 3);
      g.fillStyle(0x800080, 1);
      g.fillCircle(16, 0, 8);
      g.generateTexture('goal', 32, 48);
      g.destroy();
    }
  }
}

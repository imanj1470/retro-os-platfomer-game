import Phaser from 'phaser';
import { createGameConfig } from './config/GameConfig';

const config = createGameConfig();
new Phaser.Game(config);

import Phaser from 'phaser';
import type { LevelId } from './constants';

export interface GameEventMap {
  'player-hit': { level: LevelId; remaining: number };
  'player-death': { level: LevelId; reason: string };
  collect: { level: LevelId; item: string };
  'level-complete': { level: LevelId };
  'rage-trap': { x: number; y: number; label: string };
  'boss-hit': { boss: string; hp: number; max: number };
  'helper-say': { text: string };
}

const bus = new Phaser.Events.EventEmitter();

export function emitGame<K extends keyof GameEventMap>(k: K, p: GameEventMap[K]): void {
  bus.emit(k, p);
}

export function onGame<K extends keyof GameEventMap>(
  scene: Phaser.Scene,
  k: K,
  cb: (p: GameEventMap[K]) => void,
): void {
  bus.on(k, cb);
  scene.events.once('shutdown', () => {
    bus.off(k, cb);
  });
}

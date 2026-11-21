export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TILE_SIZE = 32;

export const PHYSICS = {
  gravityY: 600,
  moveSpeed: 200,
  jumpVelocity: -450,
} as const;

export type LevelId = 'cli' | 'xp' | 'win10';

export const SceneKeys = {
  Boot: 'Boot',
  Sandbox: 'Sandbox',
  Cli: 'CliLevel',
  XpDesktop: 'XpDesktop',
  XpBoss: 'XpBoss',
  Win10Hub: 'Win10Hub',
  Win10Gallery: 'Win10Gallery',
  Win10Paint: 'Win10Paint',
  Win10Word: 'Win10Word',
  Win10Boss: 'Win10Boss',
  Ending: 'Ending',
} as const;

export type SceneKey = typeof SceneKeys[keyof typeof SceneKeys];

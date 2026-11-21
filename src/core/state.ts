import Phaser from 'phaser';

export interface Win10Inventory {
  turquoise: boolean;
  sword: boolean;
  shield: boolean;
  armour: boolean;
  wordDone: boolean;
}

const PLAYER_NAME_KEY = 'playerName';
const DEATHS_KEY = 'deaths';
const INVENTORY_KEY = 'inventory';

const defaultInventory: Win10Inventory = {
  turquoise: false,
  sword: false,
  shield: false,
  armour: false,
  wordDone: false,
};

export function getPlayerName(scene: Phaser.Scene): string {
  const val = scene.game.registry.get(PLAYER_NAME_KEY);
  return val != null ? (val as string) : 'Player';
}

export function setPlayerName(scene: Phaser.Scene, name: string): void {
  scene.game.registry.set(PLAYER_NAME_KEY, name);
}

export function getDeaths(scene: Phaser.Scene): number {
  const val = scene.game.registry.get(DEATHS_KEY);
  return val != null ? (val as number) : 0;
}

export function addDeath(scene: Phaser.Scene): void {
  const current = getDeaths(scene);
  scene.game.registry.set(DEATHS_KEY, current + 1);
}

export function getInventory(scene: Phaser.Scene): Win10Inventory {
  const val = scene.game.registry.get(INVENTORY_KEY);
  return val != null ? (val as Win10Inventory) : { ...defaultInventory };
}

export function setInventory(
  scene: Phaser.Scene,
  patch: Partial<Win10Inventory>,
): void {
  const current = getInventory(scene);
  scene.game.registry.set(INVENTORY_KEY, { ...current, ...patch });
}

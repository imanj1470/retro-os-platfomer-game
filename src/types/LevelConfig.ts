import type { PlayerSpawn } from './PlayerSpawn';
import type { PlatformData } from './PlatformData';
import type { CollectibleData } from './CollectibleData';
import type { HazardData } from './HazardData';
import type { GoalData } from './GoalData';

export interface LevelConfig {
  key: string;
  playerSpawn: PlayerSpawn;
  platforms: PlatformData[];
  collectibles: CollectibleData[];
  hazards: HazardData[];
  goal: GoalData;
  backgroundColor: number;
}

import type { SceneKey } from './constants';
import { SceneKeys } from './constants';

export interface DebugParams {
  level: SceneKey | null;
  godMode: boolean;
  name: string | null;
}

let parsed: DebugParams | null = null;

// Map aliases to scene keys (case-insensitive)
const levelAliasMap: Record<string, SceneKey> = {
  sandbox: SceneKeys.Sandbox,
  cli: SceneKeys.Cli,
  xp: SceneKeys.XpDesktop,
  xpboss: SceneKeys.XpBoss,
  win10: SceneKeys.Win10Hub,
  win10boss: SceneKeys.Win10Boss,
  ending: SceneKeys.Ending,
  // Also accept the exact scene keys
  [SceneKeys.Sandbox]: SceneKeys.Sandbox,
  [SceneKeys.Cli]: SceneKeys.Cli,
  [SceneKeys.XpDesktop]: SceneKeys.XpDesktop,
  [SceneKeys.XpBoss]: SceneKeys.XpBoss,
  [SceneKeys.Win10Hub]: SceneKeys.Win10Hub,
  [SceneKeys.Win10Boss]: SceneKeys.Win10Boss,
  [SceneKeys.Ending]: SceneKeys.Ending,
};

export function getDebugParams(): DebugParams {
  if (parsed) return parsed;

  const params = new URLSearchParams(window.location.search);
  const levelParam = params.get('level');
  const godParam = params.get('god');
  const nameParam = params.get('name');

  parsed = {
    level: levelParam ? (levelAliasMap[levelParam.toLowerCase()] ?? null) : null,
    godMode: godParam === '1',
    name: nameParam || null,
  };
  return parsed;
}

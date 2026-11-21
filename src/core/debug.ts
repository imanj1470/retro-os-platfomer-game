import type { SceneKey } from './constants';

export interface DebugParams {
  level: SceneKey | null;
  godMode: boolean;
  name: string | null;
}

let parsed: DebugParams | null = null;

export function getDebugParams(): DebugParams {
  if (parsed) return parsed;

  const params = new URLSearchParams(window.location.search);
  const levelParam = params.get('level');
  const godParam = params.get('god');
  const nameParam = params.get('name');

  const validLevels: SceneKey[] = [
    'Sandbox', 'CliLevel', 'XpDesktop', 'XpBoss', 'Win10Hub', 'Win10Boss', 'Ending',
  ];

  parsed = {
    level: levelParam && validLevels.includes(levelParam as SceneKey)
      ? (levelParam as SceneKey)
      : null,
    godMode: godParam === '1',
    name: nameParam || null,
  };
  return parsed;
}

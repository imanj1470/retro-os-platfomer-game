# Architecture

## Folder Map

```
src/
  main.ts                     Game entry point
  core/
    constants.ts              GAME_WIDTH/HEIGHT, PHYSICS, SceneKeys, LevelId
    sceneList.ts              Ordered scene class list
    events.ts                 Typed global event bus
    state.ts                  Typed registry accessors (playerName, deaths, inventory)
    art.ts                    ensureTexture / textTexture helpers
    sfx.ts                    Web Audio synth (no audio files)
    PlayerController.ts       Generalised player
    BaseLevelScene.ts         Abstract scene every level extends
    Helper.ts                 Era-skinned guide with message queue + proximity hints
    TextPrompt.ts             In-game typing input
    HUD.ts                    Generic HUD + boss bar
    VanishingPlatform.ts      The "Not Responding" rage trap
    debug.ts                  ?level= / ?god= URL params
  scenes/
    BootScene.ts              Loads, builds core textures, routes to ?level or CLI
  levels/
    sandbox/SandboxScene.ts   Test bed with all features
    cli/CliLevelScene.ts      Placeholder level 1
    xp/XpDesktopScene.ts      Placeholder level 2
    xp/XpBossScene.ts         Placeholder boss 2
    win10/Win10HubScene.ts    Placeholder level 3
    win10/Win10BossScene.ts   Placeholder boss 3
    EndingScene.ts            End screen
```

Rule: levels own `src/levels/<id>/` only.

## Cast Table

| Level | Player | Helper | Boss |
|---|---|---|---|
| CLI | Stick (ASCII figure) | cursor (blinking `_`) | — |
| XP | Floppy (floppy disk with eyes) | Sniff (magnifying glass) | BuddyWare.exe |
| Win10 | Blocky (voxel hero, orange hoodie) | Pointer (arrow cursor) | Teemz |

## Controls

- Move: ← → / A D
- Jump: ↑ / W / Space
- Climb: ↑ ↓ on ladders
- Interact: E
- Attack: J / X
- Shield (hold): K / Shift
- Submit typed text: Enter
- Pause: Esc
- Mute: M

## Jump Budget

Gravity 600, jump −450, so max rise ≈ 165 px and max gap ≈ 220 px. Design to ≤ 130 px up and ≤ 160 px across.

## Events

| Event | Payload |
|---|---|
| `player-hit` | `{ level, remaining }` |
| `player-death` | `{ level, reason }` |
| `collect` | `{ level, item }` |
| `level-complete` | `{ level }` |
| `rage-trap` | `{ x, y, label }` |
| `boss-hit` | `{ boss, hp, max }` |
| `helper-say` | `{ text }` |

## Contracts

- `constants.ts`: `GAME_WIDTH = 800`, `GAME_HEIGHT = 600`, `PHYSICS`, `SceneKeys`, `LevelId`
- `events.ts`: `emitGame()`, `onGame()` with auto-unsubscribe on scene SHUTDOWN
- `state.ts`: `getPlayerName/setPlayerName`, `getDeaths/addDeath`, `getInventory/setInventory`
- `art.ts`: `ensureTexture()`, `textTexture()`
- `sfx.ts`: `sfx(name, opts?)`, `toggleMute()`, `getDestinationNode()`
- `PlayerController`: constructor(scene, x, y, opts), `update(time)`, `reset(x,y)`, `setControlsEnabled(on)`, `setClimbing(on)`, `justPressed(action)`, `isHeld(action)`, `facing`, `isOnGround`
- `BaseLevelScene`: abstract, every level extends it
- `Helper`: `say()`, `sayOnce()`, `addProximityHint()`, `clear()`, `update(playerX, playerY)`
- `TextPrompt`: `open(opts) → Promise<string|null>`, `isOpen`
- `HUD`: `setLeft()`, `setRight()`, `showBanner()`, `hideBanner()`, `showBossBar()`, `setBossHp()`, `hideBossBar()`
- `VanishingPlatform`: `createVanishingPlatform(scene, group, x, y, texture, opts?)`
- `debug.ts`: `getDebugParams()` — parse `?level=`, `?god=1`, `?name=`

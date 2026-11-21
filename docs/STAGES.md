# Stages

| Stage | Name | Status |
|---|---|---|
| 0 | Fix movement (fix-movement-prompt) | ✅ Done |
| 1 | Foundation (shared core, scene flow, placeholders) | ✅ Done |
| 1.5 | Fix black screen (19 bug fixes) | ✅ Done |
| 2 | CLI Level | ✅ Done |
| 3 | XP desktop | ✅ Done |
| 4 | XP boss | ⬜ Pending |
| 5 | Win10 apps | ⬜ Pending |
| 6 | Win10 boss + ending | ⬜ Pending |
| 7 | Integration and polish | ⬜ Pending |

## Stage 1 Log (2026-11-21)

Created the shared engine architecture:
- `src/core/constants.ts` — GAME_WIDTH/HEIGHT, PHYSICS, SceneKeys, LevelId
- `src/core/events.ts` — Typed global event bus with auto-unsubscribe
- `src/core/state.ts` — Registry accessors for playerName, deaths, inventory
- `src/core/art.ts` — ensureTexture / textTexture helpers
- `src/core/sfx.ts` — Web Audio synth with 19 sounds
- `src/core/debug.ts` — URL param parser (?level, ?god, ?name)
- `src/core/PlayerController.ts` — Generalized player with coyote time, jump buffer, climbing, attack, shield, interact
- `src/core/BaseLevelScene.ts` — Abstract scene every level extends
- `src/core/Helper.ts` — Era-skinned guide with message queue + proximity hints
- `src/core/TextPrompt.ts` — In-game typing input
- `src/core/HUD.ts` — Generic HUD + boss bar
- `src/core/VanishingPlatform.ts` — "Not Responding" rage trap
- `src/core/sceneList.ts` — Ordered scene class list
- `src/scenes/BootScene.ts` — Updated with scene routing and era textures
- `src/config/GameConfig.ts` — Updated to use sceneList
- `src/levels/sandbox/SandboxScene.ts` — Test bed with vanishing platform, proximity hint, text prompt
- `src/levels/cli/CliLevelScene.ts` — Placeholder
- `src/levels/xp/XpDesktopScene.ts` — Placeholder
- `src/levels/xp/XpBossScene.ts` — Placeholder
- `src/levels/win10/Win10HubScene.ts` — Placeholder
- `src/levels/win10/Win10BossScene.ts` — Placeholder
- `src/levels/EndingScene.ts` — End screen with death count
- `docs/ARCHITECTURE.md` — Architecture documentation
- `docs/STAGES.md` — This file

Moved old PlayScene to SandboxScene. Deleted src/game/ directory (files moved to src/core/).

## Stage 2 Log (2026-11-21)

Implemented the full CLI level:
- `src/levels/cli/CliLevelScene.ts` — Complete rewrite with all MUST features
- Boot sequence with fake boot lines typed fast, any key skips
- Login prompt using TextPrompt, saves player name
- ASCII stick figure player with 6 body parts (head, arms, torso, legs)
- Body parts lost in order: right leg, left leg, right arm, left arm, torso, head
- Death animation: figure crumbles into falling characters
- Respawn restores all 6 body parts, keeps collected letters
- Falling letters spelling "start" with decoy glyphs (▒ # % ?)
- Text attacks: SEGFAULT, rm -rf /, ^C, NaN, 404, core dumped
- Warning ">>" at screen edge 700ms before each bullet
- Char flood rising at 14 px/s after first letter collected
- 3 checkpoints at start, ⅓ and ⅔ up
- Rage trap platform "[ .. ] Waiting for network" with "(Not Responding)"
- Cage trap at 2 trigger lines, builds over 1.8s, escapable
- Exit prompt at top-right, requires typing "startx"
- White-out transition to XP desktop
- HUD: letter slots on left, body parts + deaths on right
- Helper messages with sayOnce for first letter, decoy, bullet, cage
- Events: collect, player-hit, player-death, rage-trap, level-complete

Tuning numbers:
- World: 800×1800, vertical climb
- Gravity: 600, jump: −450, move speed: 200
- Letter spawn: every 2.5s, gravity 120, blink at 5s, remove at 7s
- Bullet interval: 3s → 1.6s as slots fill
- Flood rise: 14 px/s, pauses 4s at each checkpoint
- Cage build: 1.8s (one char every 60ms)

## Fix: Black Screen (2026-11-21)

Fixed 19 bugs that caused black screen and gameplay issues:

**P0 — Crashes:**
1. `src/core/BaseLevelScene.ts:26-29` — Scene key collision: changed constructor to accept SceneKey, all 7 subclasses now pass their key
2. `src/levels/cli/CliLevelScene.ts:285-286,342` — Static body setAllowGravity: removed from all static groups (Sandbox, CLI, XP, Win10, VanishingPlatform)
3. `src/levels/cli/CliLevelScene.ts:527-534` — Falling letters crash: replaced `add.existing(text, true)` with dynamic body + setAccelerationY
4. `src/levels/xp/XpDesktopScene.ts`, `XpBossScene.ts`, `Win10HubScene.ts`, `Win10BossScene.ts`, `EndingScene.ts` — Added missing `import Phaser from 'phaser'`

**P1 — Gameplay:**
5. `src/levels/cli/CliLevelScene.ts:373-431` — Boot sequence invisible: added screen-space backdrop, scrollFactor(0) on boot texts, any key skips
6. `src/levels/cli/CliLevelScene.ts:456` — Enter detection: replaced polling timer with `once('keydown-ENTER')`
7. `src/levels/cli/CliLevelScene.ts:148-159` — Exit prompt: made world object with setOrigin(1,0) at x=780
8. `src/core/Helper.ts:45-71` — Helper overflow: fixed box width to 320, proper positioning
9. `src/core/BaseLevelScene.ts:140-149` — Base update: passes delta (not time) to player.update, uses world bounds for fall death
10. `src/core/BaseLevelScene.ts:154-172` — Keys created every frame: moved to init(), shared handleGlobalKeys()
11. `src/core/PlayerController.ts:168-175` — Climbing gravity: uses setAllowGravity instead of setGravityY
12. `src/scenes/BootScene.ts:60-122` — Era textures moved to BootScene so direct-entry works
13. `src/core/debug.ts:13-28` — Debug aliases: accepts sandbox, cli, xp, xpboss, win10, win10boss, ending (case-insensitive)
14. `src/levels/EndingScene.ts:23` — No player spawned in ending scene

**P2 — Hygiene:**
15. `src/core/sfx.ts:27-42` — Audio autoplay: AudioContext created on unlock, not on first sfx() call
16. `src/levels/cli/CliLevelScene.ts:1134-1148` — Pause state: uses base class instance field instead of game.registry
17. `src/levels/cli/CliLevelScene.ts:450-460` — Duplicate login label: removed, TextPrompt handles it
18. `docs/STAGES.md` — Stage numbering updated to match plan

## Stage 3 Log (2026-11-21)

Implemented the full XP desktop level:
- `src/levels/xp/shared/AppWindow.ts` — Reusable window class with countdown, walls, exit gap, pushable wall, hidden icons
- `src/levels/xp/XpDesktopScene.ts` — Complete XP desktop level rewrite
- World: 2400×1200, horizontal climb from bottom-left to top-right
- Sky gradient background (#3a6ee8 to #a8d4ff) with parallax hill and clouds
- Taskbar at bottom with green "start" pill and real-time clock
- 15 desktop icons as one-way platforms (Wurd, Exsell, PowerPoynt, Outluck, My PC)
- Pointer enemy: hunts player at 120 px/s, telegraphs with double-blink, traps in AppWindow
- AppWindow mechanic: 12s countdown, escape through top gap, red flash at 3s
- 3 notification stacks as climbable ladders (hold ↑/↓ to climb)
- 6 popup ad spawners that drift toward player and hurt on contact
- 2 Internet Exploder vanishing platforms (rage traps)
- Recycle Bin death animation: Floppy shrinks into bin, respawns with full HP
- HP system: 3 HP shown as floppy icons, onHurt returns 'dead' at 0
- Level end: 3 camera shakes, BuddyWare.exe popup, transition to XP Boss
- Helper proximity hints for Wurd, Exsell, Outluck, Recycle Bin, Internet Exploder
- All XP-era textures generated procedurally (icons, toasts, pointer, popups)

AppWindow API (for Stage 4 boss reuse):
- `new AppWindow(scene, config)` — creates window with open animation
- `startCountdown()` — begins countdown timer with red flash
- `close()` / `closeNow(): Promise<boolean>` — closes window, resolves true if player inside
- `contains(body): boolean` — checks if body is inside window bounds
- `setPlayerInside(inside: boolean)` — tracks player presence
- `enablePushableWall()` / `tryPushWall(playerX, velocityX)` — resizable wall mechanic
- `addHiddenIcon(x, y, w, h)` — icons revealed when wall is pushed
- `destroy()` — cleanup

Tuning numbers:
- Pointer hunt speed: 120 px/s, telegraph distance: 140 px
- Window countdown: 12s (trap), 15s (gateway)
- Popup ad interval: 8–11s, despawn after 6s
- Vanishing platform: 500ms vanish, 3000ms respawn
- Notification ladder climb speed: 140 px/s (from PlayerController)

## Stage 4 Log

- `XpBossScene.ts` and `boss/BuddyWare.ts` add an original green-and-yellow ape, five attack states, three-hit uninstall, and the Windows 10 upgrade.
- `XpDesktopScene.ts` requires one escape. Reaching Outlook again advances the level. Fresh pointer contact starts another trap after a 1.3 s grace period.
- Stage 3 reuse includes wall-free `AppWindow.closeNow(body)` traps and the shared Recycle Bin sequence, with a Floppy skin and a cumulative death counter for the boss.
- `BaseLevelScene.playerHitRemaining` lets HP-based levels publish current HP on nonfatal and fatal hits.
- Tuning uses an 800 ms trap, 3 s cooldown per icon, 1 s hazard telegraph, 4 s hazard duration, and a 3 s skippable update.
- [x] Edge smoke test covered direct boss entry, intro control lock, all five states, trap miss, guaranteed taunt hits, cooldown, and three boss-hit events.
- [x] Verified three Recycle Bin resets in one session, full HP restoration, cleared traps and zones, uninstall, update progress and key skip, and Win10 routing.
- [x] `npm run build` and TypeScript pass. Vite skips CSS minification because the installed Lightning CSS ESM entry fails to load.
- [ ] First-time 60–120 s pacing and win rate need player testing. The optional active climb-out is deferred, and swing misses use actual movement.

# Stages

| Stage | Name | Status |
|---|---|---|
| 0 | Fix movement (fix-movement-prompt) | ✅ Done |
| 1 | Foundation (shared core, scene flow, placeholders) | ✅ Done |
| 2 | CLI Level | ⬜ Pending |
| 3 | XP Level | ⬜ Pending |
| 4 | Win10 Level | ⬜ Pending |
| 5 | Bosses | ⬜ Pending |
| 6 | Puzzles & Mini-games | ⬜ Pending |
| 7 | Polish (demo mode, recording, ?name) | ⬜ Pending |

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

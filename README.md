# Retro OS Platformer

**A browser platformer that starts at a command prompt and ends up on the Windows desktop.**

[**Play on Vercel**](https://retro-os-platfomer-game.vercel.app/) · [Controls](#controls) · [Run locally](#run-locally)

We built this game for **KCL FirstYearHack 2026** in the **Retro Remix** track.

> Old tech, new tricks. Take something old, such as a game, gadget, website or trend, and rebuild it as your own.

We took old desktop interfaces and turned them into platforming levels. Terminal output becomes terrain, application windows become timed traps, and a Paint toolbar doubles as an armoury. Each era has its own helper, hazards, and way out.

## The levels

### 1. Command line

Press **Enter** at the start prompt and log in with a name. Climb green terminal output as an ASCII stick figure while dodging text attacks, cages, and a rising flood of characters. Damage removes body parts one at a time. Collect the falling letters that spell `start`, reach the terminal in the top-right corner, and run `startx` to boot the desktop.

### 2. Windows XP

Play as Clippy on the Bliss desktop. Hop across Office app icons, climb stacked notifications, and pick up Windows XP trivia from Rover. Escape through the top of a timed app window, then dodge the pointer on the way back to Outlook Express. If it catches you again, you’ll have to escape another window. If you get trapped inside Outlook Express, push its right wall to reveal the exit.

The purple, Bonzi Buddy-inspired **BuddyWare.exe** swings, lunges, and blocks off parts of the desktop. Use the **New Window** buttons to trap it three times and trigger the upgrade to Windows 10. Running out of health sends Clippy to the Recycle Bin.

### 3. Windows 10

Follow Pointer through a scrolling desktop patrolled by CoinMiners. Enter the apps in order to gear up as Blocky.

| App | What to do |
| --- | --- |
| **Photos** | Rotate the upside-down gem picture to reveal a turquoise swatch. |
| **Paint** | Pick up a paintbrush sword and an eraser shield, then use the fill bucket to colour and equip four pieces of turquoise armour. |
| **Word** | Type `<your name> was here` using the name you entered at the CLI login. |

The CLI and Windows XP levels are complete. The Windows 10 desktop and its three app puzzles are playable, and the Teams-inspired finale, **Teemz**, is a placeholder. Press **Enter** there to see the ending.

## Controls

| Action | Keys |
| --- | --- |
| Move | **← / →** or **A / D** |
| Jump | **↑**, **W**, or **Space** |
| Climb XP notification ladders | **↑ / ↓** or **W / S** |
| Interact with prompts, apps, and buttons | **E** |
| Submit typed text | **Enter** |
| Swing the paintbrush | **J** or **X** after picking it up |
| Block with the eraser | Hold **K** or **Shift** after picking it up |
| Pause or cancel a text prompt | **Esc** |
| Toggle sound | **M** |
| Jump to a level during play | **1** for CLI, **2** for XP, **3** for Windows 10 |

## Run locally

With Node.js 22.12 or newer installed, run these commands from the project root.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To build and preview the production bundle, run `npm run build` followed by `npm run preview`.

## Tech stack

The game uses **TypeScript**, **Phaser 4** with Arcade Physics, **Vite**, and browser-generated sound effects through the **Web Audio API**. Each OS era has its own Phaser scenes, with shared movement, dialogue, HUD, and text input in `src/core/`.

[Architecture notes](docs/ARCHITECTURE.md) · [Development log](docs/STAGES.md)

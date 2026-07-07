# KOMBAT FORGE 🐉

A **Mortal Kombat–style 2D fighting game** that runs entirely in the browser.
No assets, no backend — every fighter, stage, particle and sound is generated
in code (Canvas 2D + WebAudio + SpeechSynthesis announcer).

## Play

```bash
npm install
npm run dev        # open the printed URL (default http://localhost:5173)
```

Production build:

```bash
npm run build      # outputs static site to dist/
npm run preview    # serve the built game
```

The `dist/` folder is a fully static site — host it anywhere (GitHub Pages,
Netlify, Railway, S3…).

## Features

- ⚔️ **4 fighters** with palette-swapped ninja looks and unique special moves:
  - **SCORCH** — Hellfire skull projectile that burns
  - **FROSTBITE** — Ice ball that freezes you solid (shatter combo!)
  - **VOLT** — Fast thunderbolt, straw hat, storm god vibes
  - **VENOM** — Acid spit with damage-over-time
- 🩸 Blood particles, screen shake, combo counter, floor blood pools
- 🏆 Best-of-3 rounds, 99-second timer, FLAWLESS VICTORY
- 💀 **FINISH HIM!** — win the match and perform a character-specific **FATALITY**
- 🤖 1 Player vs CPU (AI does motion inputs too) or 2 Players on one keyboard
- 🏟️ 3 stages: The Pit, Throne of Bones, Dead Grove
- 🔊 Synthesized SFX, dark ostinato soundtrack, pitched-down announcer voice

## Controls

|            | Player 1 | Player 2 |
| ---------- | -------- | -------- |
| Move       | A / D    | ← / →    |
| Jump       | W        | ↑        |
| Crouch     | S        | ↓        |
| Punch      | F        | `,` (or K / Numpad1) |
| Kick       | G        | `.` (or L / Numpad2) |
| Block      | H        | `/` (or ; / Numpad3) |

**Moves** (both players):

- **Special move** — tap **Down**, then **Forward**, then **Punch**
- **Uppercut** — Crouch + Punch (launches!)
- **Sweep** — Crouch + Kick (knockdown)
- **Jump kick** — Punch or Kick while airborne
- **Fatality** — when the announcer yells *FINISH HIM!*, walk close and do the
  special-move motion (Down, Forward, Punch)

Other keys: **P** pause · **M** mute · **Esc** back / character select

## Tech

- TypeScript + Vite, zero runtime dependencies
- Fixed-timestep 60 fps simulation with procedural skeletal-ish rendering
- CPU opponent performs real inputs (including special-move motions)

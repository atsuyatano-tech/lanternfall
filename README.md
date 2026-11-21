# lanternfall

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/atsuyatano-tech/lanternfall/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/atsuyatano-tech/lanternfall/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**LANTERNFALL** — a top-down 2D stealth game about light. You are a courier slipping through a lantern-lit archive compound at night: steal the Ember Ledger from its dais and reach the exit gate unseen, across three compounds of rising difficulty. Lantern pools are danger — in the light you are seen far away and fast; in shadow you are invisible past a few paces. Every guard carries an alert meter, not a switch: a glimpse fills it a little, a clear view fills it fast, and broken line-of-sight lets it drain, so detection is a slope you can slide back down. Toss coins to pull a watchman off his post, sneak in silence, or run and be heard. Vision cones are raycast against the walls and cover, so the cone drawn on screen is exactly the cone the guard sees with — its colour is his state of mind: pale calm, amber suspicion, red alarm.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. (To build the make.fun hand-in instead: `MAKEFUN_OUTPUT_DIR=out node main.ts`.)

**How to play**

- **WASD / arrow keys** — move
- **Shift** — sneak: slow and silent
- **Space (while moving)** — run: fast, and loud enough to draw a guard
- **Click** — toss a coin to that spot; guards in earshot investigate the clink (3 coins per compound)
- **P** — pause · **R** — restart the compound

**Systems**

- Guard AI: patrol (waypoint loops with pause-and-scan) → suspicious → investigate (last seen point / noise) → chase → lose the trail → return to patrol
- Raycast vision cones occluded by walls, crates, shelves, hedges and pillars
- Light & shadow: lantern pools multiply detection speed ~2.5×; shadow hides you beyond point-blank range
- Hearing: running and walking emit noise rings; sneaking emits nothing; guards emit footstep ripples as a telegraph
- Scoring per compound: time, times spotted, a ghost bonus for never being fully seen, unspent coins — carried across all three compounds
- Sound is synthesised live with WebAudio (footsteps, coin clink, suspicion sting, alarm, chimes) — no audio files, no assets, no network; the whole game is procedural canvas art

---

Entered on [make.fun](https://make.fun/?ref=waf1qbyg&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards

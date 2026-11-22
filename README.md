# MIDNIGHT VAULT — 3 rooms, 4 guards, 3 cameras, 7 loot, 4 tools: a top-down heist with patrols, vision cones and a getaway

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/hadhi2004xx/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/hadhi2004xx/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down night heist in a three-room bank — lobby, gallery hall, vault — where a lone thief ("Wren") crosses patrols, sweeping cameras and a rising alarm to crack the vault, grab the loot, and reach the getaway van. Vanilla JavaScript on canvas, no library, no network: the whole game is static files under `game/` and plays offline in desktop Chrome.

## The heist

- **3 rooms, 3 routes:** lobby → gallery hall → vault, linked by two doors, a service vent and a side corridor. Every room has more than one way through.
- **4 guards** (Marlow, Okonkwo, Reyes, Volkov) with wall-clipped vision cones and five states — patrol, suspicious, investigate, chase, return — plus hearing: running footsteps and a tossed coin pull them to look.
- **3 sweeping cameras** with visible arcs and blind-spot timing; kill them for 10 seconds with an EMP pulse, or forever by cutting the power box (which costs alarm and draws a guard).
- **7 loot in 3 tiers:** 3 desk cash ($50), 2 display cases ($100), vault gold ($200), and the risky optional Crown Jewel ($300) under the vault camera. All seven pay $850.
- **4 tools at a cost:** lockpick ×2 (open the vault door), smoke ×2 (blind every eye for 4 s), EMP ×1 (cameras dark 10 s), coin ×3 (lure a guard). Charges are the cost — there is nothing else to spend.
- **Alarm 0–100:** rises on cone and camera sight, decays unseen; 25+ guards investigate, 60+ they chase, 80+ the vault seals until the meter drops under 50. A full meter gives a 1.2 s "SPOTTED!" grace to break sight — the caught moment is fair.
- **5:00 on the clock:** reach the lobby exit and the getaway van to win; every second left pays $10 on top of the loot.

## Controls

WASD / arrows move (click to walk there) · Shift sneak (slower, quieter, harder to spot) · Ctrl run (fast, loud) · 1–4 use tools · E cut the power box · P pause · R restart · M mute. Tool buttons in the HUD are clickable too. All sound is synthesised in code (WebAudio) — no audio files.

## Run it

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Or open `game/index.html` from any static server. `?shot=cover|lobby|vault|getaway&seed=1` stages a deterministic screenshot scene; `?seed=N` fixes the floor dust. The hand-in program is `main.ts` (Node 22, standard library only): it copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library, byte-identical across runs.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2ym2spy1&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>

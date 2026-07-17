# Version History

Back to [[The Transfer Wheel]]. Related: [[Roadmap]], [[Game Modes]].

Current: **v3.9.68**. Reconstructed from git history (`git log`). Grouped by the project's major arcs rather than every commit — for the exact log run `git log --oneline`.

> Naming note: the project began as **"DoF War Chest" / "The Football Director"** and became **"The Transfer Wheel"**. The *War Chest* name survives as one of the [[Game Modes|game modes]].

---

## v1 — Foundations (v1.0 → v1.11)
The core single-screen draft game takes shape.
- **v1.0** Initial release (as *DoF War Chest*).
- Difficulty levels + the **roulette budget wheel** + bargain players.
- Match simulation engine + UI overhaul; **series & tournament system** with commentary.
- **Managerial Merry-Go-Round** — a manager draft phase between the player draft and the tournament, with one-at-a-time suspenseful card reveals.
- Rebrand to **The Football Director**; setup screen overhaul; lobby + club creator wizard.
- Filters (era / league / nation / tier), **player pool screen**, formation choice, structured substitute slots.
- Player **archetypes**, manager cohesion, style matchups, momentum, series draws.
- **v1.11** UCL match order, tournament stats panel, interactive draft-order draw with ball-pick.

## v2 — Multiplayer, accounts & depth (v2.0 → v2.21)
The game goes online and gains real systems.
- **v2.0** 🚀 **Multiplayer launch** — Firebase room create/join, waiting room, live draft sync (+ a run of sync bug-fixes). See [[Multiplayer]].
- 8-team tournament support; mode-select home screen.
- **v2.5** ⚔️ **War Chest mode** — fixed-budget economy, chest reveal, penalty shootout overhaul. See [[Game Modes#War Chest]].
- **v2.6** Player **attribute system** (pac/sho/pas/dri/def/phy) + full database rebalance. See [[Data Model]].
- **v2.9** 🎡 **Draft Roulette** mode (pre-game modifier wheel).
- **v2.10** +151 players (2024/25 season, club legends, Villa/Man Utd expansion).
- **v2.13+** War Chest online host control + squad timer; match-sim tuning; 5-a-side scoring tweaks.
- **Player accounts** — Google sign-in + save/load squads.
- **v2.16–2.20** Creation/finishing split, GK composite rating, automatic substitutions, manager shown on champion screen & saved squads.
- **v2.21** Tournament bracket polish (grand final promotion, reverse-chronological order).

## v3.9 — The Broadcast redesign era (current)
A full visual overhaul plus new modes. (Versioning jumped to 3.9.x here.)
- **v3.9.23** 🎨 **Broadcast redesign** — every screen reskinned to the new dark-pitch look; CRT scanline removed.
- **v3.9.25–31** Post-redesign fixes, **drag-to-spin wheels**, global menu → right-edge **pull-tab**.
- **v3.9.32–39** War Chest light-mode fixes; **desktop / widescreen support** across the app.
- **v3.9.40–43** Cup-draw feel — staggered reveals, ball-number-then-team, human ball choice.
- **v3.9.47–48** Squad-screen polish (kit-coloured pitch tokens, distinct GK kit); inline **penalty shootout tracker**.
- **v3.9.51–53** Compact name display fix; champion screen warmth; **series tiebreaker → straight penalties**.
- **v3.9.55–59** 🏟️ **Real Teams mode** (later renamed **Super League**) — CPUs assigned elite real clubs with real kits, legend DoF, and auto club manager. Advanced Options + How It Works copy rework.
- **v3.9.61–67** Matchday & champion-screen fixes; 4-4-2 pitch alignment; mobile tournament stats; "Road to Victory" stage labels; cleaner setup (default 8 teams, inline match-type).
- **v3.9.68** This docs vault + roadmap added.

---

## How to keep this current
When you cut a notable version, add a bullet under the latest arc (or start a new arc heading on a big shift). The commit subject line is usually enough — this note is the *story*, `git log` is the *record*.

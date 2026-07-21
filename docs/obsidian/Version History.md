# Version History

Back to [[The Transfer Wheel]]. Related: [[Roadmap]], [[Game Modes]].

Current: **v4.2.30**. Reconstructed from git history (`git log`). Grouped by the project's major arcs rather than every commit — for the exact log run `git log --oneline`.

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
- **v3.9.71** Formation & captain persist across games; War Chest flow refinements.

## v4 — Scout Mode & the draw (v4.0 → v4.2)
A third core mode, then a run of tournament and draft-visibility work.
- **v4.0.7** 🔎 **Scout Mode launch** — the v3 → v4 bump. A dealt scout report from one shared, depleting per-position pool, with tier caps, tenets and missions. Solo/local only. See [[Game Modes]] and the Scout Mode Spec.
- **v4.0.8 – v4.1.3** Scout tuning: guaranteed report options, a genuine £0 free-agent pool, affordable-only reports so you're never stranded, re-scout actually re-rolling the hand.
- **v4.1.5–6** **Hidden ratings + paid reveal** on the scout report, rating-based range labels, bargain-bucket dropdown.
- **v4.1.8–11** Scout filtering — per-turn sub position filters, ALL/one-position pill behaviour, Mission panel moved under its header button.
- **v4.2.0 / v4.2.7** ♻️ **RESTART** — re-run a tournament or series keeping drafted squads, from the series screen and the champion card (including after a loss).
- **v4.2.2–10** Scout copy and empty-state clarity; "Wheel & Deal" zero-spin label; current mode + settings shown in the pull-out menu; iOS zoom/keyboard fix on War Chest search.
- **v4.2.11–20** 🏆 **Tournament presentation overhaul** — a real bracket, clearer watch/skip controls, leg scores with aggregate, possession-coloured commentary, aligned bracket connectors, full 30 minutes of extra time, widescreen bracket sized to its round count.
- **v4.2.30** 📋 **[[Draw Board]]** — see what every club spun and signed, round by round, in Classic and Scout. Plus three multiplayer fixes found while testing it: online CPU turns that never advanced, a wheel that could spin forever, and `lastName()` mangling parenthetical names. See [[Bug Fixes]].

---

## How to keep this current
When you cut a notable version, add a bullet under the latest arc (or start a new arc heading on a big shift). The commit subject line is usually enough — this note is the *story*, `git log` is the *record*.

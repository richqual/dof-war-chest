# 🎡 The Transfer Wheel — Reference Home

> Map of Content (MOC) for the whole project. Start here.

**The Transfer Wheel** is a retro *Championship Manager 00/01*–style football **draft game**. Players spin a wheel for a transfer budget, then draft real footballers (across eras) into a squad within a chosen formation, and finally simulate matches / knockout series against each other. It plays **solo/local** (hot-seat on one screen) or **online multiplayer** (each player on their own device).

- **Live app:** https://transfer-game.vercel.app
- **Repo:** https://github.com/richqual/dof-war-chest
- **Current version:** `4.2.30` (see `APP_VERSION` in `src/App.jsx`)
- **Project root:** `/Users/richqual/Documents/Transfer Game/transfer-game/`

## Contents
- [[Tech Stack]] — what it's built with and how to run it
- [[Architecture]] — how the pieces fit together
- [[Game Modes]] — Classic, War Chest, Real Teams, Draft Roulette + solo vs online
- [[Screens]] — every screen and what it does
- [[Data Model]] — players, managers, formations, the draft object
- [[State & Persistence]] — hooks, localStorage, save/resume
- [[Multiplayer]] — Firebase real-time sync
- [[Draw Board]] — what everyone spun and signed, round by round
- [[Bug Fixes]] — non-obvious bugs and what actually caused them
- [[Roadmap]] — planning, ideas, and what's shipped
- [[Version History]] — the story of the build, v1 → now

## The core loop
1. Pick a **mode** → set up clubs / players → (optionally) [[Game Modes#Draft Roulette|spin the mode wheel]]
2. **Order draw** — who picks first
3. **Draft** — spin the [[Screens#Spin & Position wheels|budget wheel]], pick a player for each position slot
4. (Optional) **Manager draft** — assign a Director of Football / manager
5. **Squad** — arrange formation, bench, review
6. **Match / Series** — [[Screens#MatchSim|simulate]] games, run knockout brackets, decide a winner

## Conventions in this vault
- `file_path:line` references point into the real source so you (and Claude) can jump straight there.
- Links like [[Data Model]] are Obsidian wikilinks — click to navigate.

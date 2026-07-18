# Game Modes

Back to [[The Transfer Wheel]]. Related: [[Screens]], [[Data Model]].

Mode selection lives in `ModeSelectScreen` (`src/components/LobbyScreen.jsx`). The top-level `single` vs `multiplayer` switch is in `src/App.jsx` (`mode` state).

## Classic
The core draft game. Each manager spins the **budget wheel**, then drafts a real player into each position slot of their formation. Budgets scale with a chosen **difficulty**:

| Difficulty | Avg budget | Feel |
|---|---|---|
| GENEROUS | ~£81m | Legends within reach most spins |
| EASY | ~£61m | Room to breathe |
| NORMAL | ~£41m | Balanced, occasional dry spell |
| HARD | ~£31m | Shoestring, frequent zeros |
| BRUTAL | ~£17m | Half the wheel is zero — fight for frees |

- **Solo / Local:** 1–8 players hot-seat on one screen.
- **Online:** each player joins from their own device. See [[Multiplayer]].

## War Chest
An alternative economy. Instead of spinning per-pick budgets, players work from a **fixed war chest** and select through a dedicated flow:
- `WarChestLobbyScreen` → `WarChestSelectionScreen` → `WarChestDraftScreen` → `WarChestSquadScreen`.
- Logic: `buildInitialWarChestDraft`, `getWarChestPlayersForSlot`, `autoBuildWarChestSquad` in `draftUtils.js`.
- Also has Solo/Local and Online variants (online = everyone picks simultaneously).

## Scout Mode (✅ built v4.0.0)
A third core mode, alongside Classic and War Chest — not a Classic toggle. Replaces the open-browse pick loop with a curated, depleting one:
- **Live pool per position**, drawn at setup and shared across all managers — depletes as picks are made, so draft order matters for the first time.
- **Scout report** each turn — one candidate per tier still available and affordable, not a full browse.
- **Squad-wide tier caps** (opt-in Advanced-Options toggle, OFF by default) — once a manager's cap for a tier is hit, that tier stops appearing in their reports even if still in the pool. Off by default because the depleting pool already supplies the scarcity.
- **Club Tenets** — 1–2 soft draw-bias preferences (league/era/nation/archetype) picked at club creation.
- **Scouting mission** — a one-shot paid escape hatch, usable on exactly one sub slot, searching outside the live pool for a target league/era at a value premium.
- Full spec: [[Scout Mode Spec]]. Decided as its own mode (new screens/flow) rather than a Real-Teams-style toggle, since it replaces the core turn-by-turn interaction rather than adjusting a variable inside Classic's existing loop.
- **Build:** solo/local (hot-seat) only for v4.0 — online multiplayer is a deliberate follow-up (a shared depleting pool across devices needs host-authority sync). Screens: `ScoutLobbyScreen` (shared formation picker, draft-locked) → `ClubCreatorScreen` → `ScoutTenetsScreen` (1–2 tenets per human) → order draw → `ScoutDraftScreen` (wheel → dealt scout report → sign / re-scout / mission). Logic in `src/hooks/scoutUtils.js`; state actions (`startScoutGame`, `confirmScoutBudget`, `pickScoutPlayer`, `reScout`, `commissionMission`/`confirmMission`, `scoutSkipCpuTurns`) in `useDraftState.js`. Reuses the existing Classic draft loop (snake order, position-major turns, budget wheel, carryover, `applyPick`) — the live pool just shrinks the already-shared `takenIds` set so depletion bites. Tuning knobs live in `SCOUT_TUNING` / `TIER_CAPS_BY_DIFFICULTY`.

## Real Teams (built v3.9.55, expanded v3.9.56)
A Classic sub-option (toggle in **Advanced Options**). CPU opponents are assigned **elite real clubs** — real kit, a legend Director of Football, and an auto-assigned club manager. The human always retains access to their own club's players (including legends). Built via `buildRealTeamsPool` in `draftUtils.js`.

## Draft Roulette
Optional pre-game **mode wheel** (`DraftRouletteScreen` + `DraftRouletteToggle`). When enabled at setup, the game opens on `draft-roulette` and spins to randomise a game modifier before the order draw. Enabled via `options.draftRoulette.enabled` in `startGame` (`useDraftState.js`).

## Series formats (post-draft competition)
After squads are built, players compete. Formats include best-of series and an 8-player tournament bracket:
- **BO3 / BO5 / BO7** — first to 2 / 3 / 4 wins.
- **tournament8** — 8-player knockout (quarters → semis → final), built in `completeDraw` (`useDraftState.js`).
- Series logic + standings: `SeriesScreen.jsx`, `DrawScreen.jsx`; tiebreakers resolve draws → tiebreaker → straight pens (see the series-tiebreaker memory note).

## Planned / not yet built
- **Position eligibility** — multi-pool slots + out-of-position match penalty + filter UI.
- **Career mode** — wipe/re-draft loop, tier + era progression, save slots.

# Screens

Back to [[The Transfer Wheel]]. Related: [[Architecture]], [[Game Modes]].

The active screen is a **string in state** (`screen`), routed in `src/App.jsx` (`AppInner` for solo, `MultiplayerApp` for online). Each screen is one component in `src/components/`. Rough flow:

```
mode-select → lobby (setup) → [draft-roulette] → order-draw
    → player-pool → [manager-draft] → draft → squads
    → draw → series → match
```

## Setup & navigation
| Screen key | Component | Purpose |
|---|---|---|
| `mode-select` | `LobbyScreen.jsx` (`ModeSelectScreen`) | Choose Classic / War Chest, Solo vs Online |
| `lobby` / `setup` | `LobbyScreen.jsx` | Club/player setup, difficulty, options, start game |
| — | `ClubCreatorScreen.jsx` | Create/customise a club (name, kit colours via `KitSwatch`) |
| — | `AboutScreen.jsx` | About / how-to-play |
| — | `ProfileScreen.jsx` | Edit signed-in profile |
| — | `MySquadsScreen.jsx` / `MySquadPanel.jsx` | Saved squads for the account |
| — | `GlobalMenu` (in `App.jsx`) | Right-edge gold pull-tab slide-in menu (theme, text size, auth, quit) |

## Draft flow
| Screen key | Component | Purpose |
|---|---|---|
| `draft-roulette` | `DraftRouletteScreen.jsx` | Optional pre-game modifier wheel |
| `order-draw` | `OrderDrawScreen.jsx` | Decide pick order |
| `player-pool` | `PlayerPoolScreen.jsx` | Browse the available player pool |
| `manager-draft` | `ManagerDraftScreen.jsx` | Draft a manager / Director of Football (timing before or after squad draft) |
| `draft` | `DraftScreen.jsx` | **Main draft** — spin budget wheel, pick a player per slot. Carries the live [[Draw Board]] + its left-edge pull-tab |
| `squads` | `SquadScreen.jsx` | Arrange formation (SVG pitch), bench swaps, review, export. "▤ VIEW THE FULL DRAW" opens the [[Draw Board]] post-draft |

### Spin & Position wheels
- `SpinWheel.jsx` — the **budget wheel** (weighted wedges = the odds). Physically drag/flick-spinnable via `useSpinnableWheel.js`; physics decides where it lands, which stays fair because the wedges *are* the probabilities.
- `PositionWheel.jsx` — position selector wheel.
- `TurnTransition.jsx` — hand-off screen between players in hot-seat play.
- `SquadTimer.jsx` — per-turn timer.

## Competition
| Screen key | Component | Purpose |
|---|---|---|
| `draw` | `DrawScreen.jsx` | Bracket / fixture draw |
| `series` | `SeriesScreen.jsx` | Series standings, leg tracking, tiebreakers |
| `match` | `MatchSim.jsx` | **Match simulation** |

### MatchSim
`src/components/MatchSim.jsx` (**~2,300 lines — the largest component**). FM-style live commentary match engine: generates weighted-random events from the two squads' ratings, runs extra time / penalties, and reports the result back to the series. It **overrides** some draft-level shootout flags (it owns the match outcome). Balance-testable headless via `npm run sim:sweep`.

## War Chest screens
`WarChestLobbyScreen` → `WarChestSelectionScreen` → `WarChestDraftScreen` → `WarChestSquadScreen`. See [[Game Modes#War Chest]].

## Multiplayer-only screens
`MultiplayerEntryScreen.jsx` (join/host) and `MultiplayerWaitingRoom.jsx` (lobby before the host starts). See [[Multiplayer]].

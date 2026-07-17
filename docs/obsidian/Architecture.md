# Architecture

Back to [[The Transfer Wheel]]. See also [[State & Persistence]], [[Screens]], [[Multiplayer]].

## Shape of the app
The app is a **single-page React app with a hand-rolled screen router**. There is no React Router — the current screen is a string in state (`screen`), and `App.jsx` renders whichever screen matches. Game data lives in one big `draft` object.

```
App (src/App.jsx)
├─ mode: "single" | "multiplayer"      ← top-level switch
│
├─ AppInner  ........ solo/local play  → useDraftState (local + localStorage)
└─ MultiplayerApp .. online play       → useMultiplayerSession + useMultiplayerDraft (Firestore)
```

Both branches render the **same screen components** (DraftScreen, SquadScreen, MatchSim, …). The difference is *where the state lives*: local React state vs a synced Firestore document. This is the key design idea — screens are dumb-ish views driven by a `draft` object + callbacks, so they work identically solo or online.

## The three layers

### 1. Data (`src/data/`)
Static game content. No logic beyond helpers.
- `players.js` — ~1,300 player cards + helpers (`generateBudget`, `chooseCpuPick`, `normalizeSearch`, `SUB_POSITIONS`).
- `managers.js` — ~127 managers / Directors of Football.
- `formations.js` — formation definitions, slot layouts, position groups/colours.

See [[Data Model]].

### 2. Logic (`src/hooks/` + `draftUtils.js`)
- `hooks/draftUtils.js` (**~700 lines — the engine**) — pure functions: build the initial draft, apply a pick, resolve formations, serialize/deserialize, War Chest logic, series history. Imported by both the solo and multiplayer hooks.
- `hooks/useDraftState.js` — solo game state machine + localStorage persistence.
- `hooks/useMultiplayerDraft.js` / `useMultiplayerSession.js` — the same flow backed by Firestore. See [[Multiplayer]].
- `hooks/useAuth.js` — Firebase auth (Google + guest).
- `hooks/useSaveSquad.js` — save a finished squad to the user's account.
- `hooks/useSpinnableWheel.js` — shared drag/flick spin physics for both wheels.

### 3. View (`src/components/`)
One component per screen (+ small shared pieces like `PlayerCard`, `KitSwatch`, `SpinWheel`, `PositionWheel`). See [[Screens]].

## Data flow (one direction)
```
data/  →  draftUtils (pure logic)  →  useDraftState / useMultiplayerDraft  →  App router  →  screen components
                                                          ↑                                        │
                                                          └──────────── callbacks (pick, spin, advance) ─┘
```
State flows down as the `draft` object; user actions flow back up as callbacks that call `draftUtils` functions to produce the next `draft`.

## Why it's organised this way
- **One `draft` object** = trivial save/resume and trivial network sync (just serialize it).
- **Pure logic in `draftUtils`** = the same rules run locally and on Firestore, and can be batch-tested (`sim:sweep`).
- **String-based router** = no routing dependency; screen transitions are just state changes, which also makes them easy to drive from a synced Firestore field in multiplayer.

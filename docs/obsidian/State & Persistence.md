# State & Persistence

Back to [[The Transfer Wheel]]. Related: [[Architecture]], [[Data Model]], [[Multiplayer]].

## Solo state — `src/hooks/useDraftState.js`
Holds the two pieces of runtime state:
- `screen` — which [[Screens|screen]] is showing (string).
- `draft` — the whole game (the [[Data Model#The draft object runtime state|draft object]]).

Exposes actions that call [[Architecture#2 Logic|draftUtils]] pure functions to produce the next state: `startGame`, `completeDraw`, apply-pick, advance-turn, etc.

## localStorage save/resume
- **Key:** `transfer-game-state` (`STORAGE_KEY` in `draftUtils.js`).
- On mount, `useDraftState` reads the key, checks `parsed.v === STORAGE_VERSION`, and restores `{ draft, screen }` via `deserializeDraft`. Version mismatch → the save is discarded (prevents loading an incompatible old shape).
- On every `draft`/`screen` change it writes `{ v, draft: serializeDraft(draft), screen }` back.
- `ErrorBoundary` (in `App.jsx`) offers a **"Clear saved game & restart"** button that removes this key — the recovery hatch if a save gets into a bad state.

> Because the entire game is one serializable object, save/resume is essentially free — no per-feature persistence code.

## Serialization
`serializeDraft` / `deserializeDraft` in `draftUtils.js` convert the in-memory draft (which may hold richer structures) to/from a plain JSON-safe shape. The **same functions** feed both localStorage and Firestore, so solo and online games share one storage format.

## Auth & saved squads
- `hooks/useAuth.js` — Firebase auth: Google sign-in **or** guest. Resolves `auth.user === undefined` while loading (App renders nothing to avoid a flash).
- `hooks/useSaveSquad.js` — persists a finished squad to the signed-in user's account (viewable in `MySquadsScreen`).

## Theme / prefs
Small UI prefs are separate localStorage keys, not part of the draft:
- `tg-theme` (`light`), `tg-text-size` (`large`) — read in `App.jsx`.

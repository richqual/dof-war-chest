# Multiplayer

Back to [[The Transfer Wheel]]. Related: [[Architecture]], [[State & Persistence]].

Online play lets each player join from **their own device** and draft in a shared, real-time game. Selected from the top-level `mode = "multiplayer"` switch in `src/App.jsx`, which renders `MultiplayerApp` instead of `AppInner`.

## Backend — `src/firebase.js`
Firebase project `the-football-director`:
- **Firestore** (`db`) — the real-time game document store.
- **Auth** (`auth`, `googleProvider`) — Google + guest.
- Access rules in `firestore.rules`.

## The hooks
- `hooks/useMultiplayerSession.js` — session/lobby: create or join a game, track connected players, host vs guest.
- `hooks/useMultiplayerDraft.js` (**~600 lines**) — the online equivalent of [[State & Persistence#Solo state|useDraftState]]. Subscribes to the game's Firestore document and mirrors it into the same `draft` + `screen` shape the screens expect, and writes changes back.

## How it mirrors the solo flow
The game document holds the **same serialized [[Data Model#The draft object runtime state|draft object]]** (via the shared `serializeDraft`/`deserializeDraft`) plus a `phase`/`screen` field. So:
- The **same screen components** render for online games.
- The **host** generally owns advancing shared stages (draw/series/match); guests act on their own turns. In `App.jsx` you'll see guards like `if ((s === "match" || s === "series" || s === "draw") && !isHost) return;` and `gameDoc.phase === "waiting"` routing to the waiting room.

## Multiplayer-only screens
- `MultiplayerEntryScreen.jsx` — host a new game or join by code.
- `MultiplayerWaitingRoom.jsx` — lobby shown while `phase === "waiting"`, before the host starts.

## CPU turns online
⚠️ **The trap:** `confirmBudget` / `confirmSlot` / `pickPlayer` / `skipTurn` / `respin` in `useMultiplayerDraft.js` are all guarded with `if (!draft || !isMyTurn) return`, where `isMyTurn` is `activeManagerIdx === mySlotIdx`.

On a **CPU turn, no client is "my turn"** — so any screen-level CPU effect that drives the draft through those handlers is a **silent no-op online**. No error, no console warning: the draft just sits there looking like a hung timer. Before v4.2.30, online CPU turns never advanced on their own at all; a human had to press skip.

The fix pattern is a **host-only single-step function on the hook**, called on a timer by the screen:
- `stepCpuTurn()` — Classic MP. Advances a CPU turn by exactly one visible beat (draw slot → roll budget → pick), then writes.
- Guarded `if (!isHost) return` so the beat is written once, like every other CPU path here (`skipCpuTurns`, `autoCompleteDraft`, …).

**Consequence of host-only CPUs:** a **host** paused on a [[Draw Board#Review gates|review gate]] freezes CPUs for everyone, which reads as consistent. A **guest** paused on a gate has the host advancing the shared draft underneath them — the board goes stale, then jumps forward on continue. Not a crash (the pick log is server state and stays correct), but a known rough edge.

## Testing multiplayer locally
Two clients need two **origins**, not two tabs — identity is a `tfd-device-id` in `localStorage`, and the join path re-matches an existing slot by that id, so a second tab of the same origin rejoins as the *same* player. Use `localhost:5173` for the host and `127.0.0.1:5173` for the guest: different origin, separate `localStorage`, separate identity.

Note also that a plain page reload drops you to the home screen even with `tfd-mp-game-id` still stored — re-entering via **ONLINE** resumes the game.

## Deployment note
The app is **hosted on Vercel**, deploying from `main`. Firebase is only the DB + auth. Work often happens on other branches (e.g. `multiplayer`) — merge to `main` before a deploy reflects online-play changes.

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

## Deployment note
The app is **hosted on Vercel**, deploying from `main`. Firebase is only the DB + auth. Work often happens on other branches (e.g. `multiplayer`) — merge to `main` before a deploy reflects online-play changes.

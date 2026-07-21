# Draw Board

Back to [[The Transfer Wheel]]. Related: [[Screens]], [[Game Modes]], [[Multiplayer]], [[Data Model]].

Shipped **v4.2.30**. Shows what every club **spun** and **signed**, round by round — so a draft stops being a thing that happens to you between your own turns. Shared by [[Game Modes|Classic]] and Scout Mode; **War Chest has no draw board** (known gap).

## The pieces
- `src/components/DrawBoard.jsx` — the board itself, two densities from one component:
  - `mode="round"` — the live round, inline on the draft screen. Picks so far, plus `waiting…` placeholders for clubs still to come.
  - `mode="full"` — the whole draft as a grid, on its own screen (at 8 clubs it needs the full viewport, not a 380px panel).
- `src/components/DrawPanel.jsx` — slide-in panel on a **left-edge pull-tab**, mirroring the [[Screens|global menu]]'s tab on the right. `fullOnly` is the post-draft entry point from `SquadScreen.jsx` ("▤ VIEW THE FULL DRAW").

## Where the data comes from
`applyPick()` in `src/hooks/draftUtils.js` appends to `draft.pickLog`. That function is the **single choke point for every pick in every mode** (~13 call sites across `useDraftState.js` and `useMultiplayerDraft.js`), so every mode gets the log for free — including online, since `serializeDraft`/`deserializeDraft` are spread-based and a flat array of flat objects passes through Firestore untouched.

Each entry records `round`, `positionIndex`, `slot`, `slotPos`, `managerIdx`, `spun`, `budget`, `spent`, `carry`, and the player's id/name/pos/rating/tier.

## Three design decisions worth not undoing

**Ratings are never shown, in any mode.** Scout charges a `revealFee` to reveal ratings on your *own* report, so putting rivals' ratings on a shared board would give away the very thing that fee is for.

**`spun` and `budget` are tracked separately.** `rollBudget()` keeps the raw wheel value (`currentSpun`) alongside the spendable total. They diverge whenever someone banks carryover, and **only `spun` is a value the wheel can actually produce** — showing the pot alone made rows look impossible, e.g. a real board row reads `£0m (£11m)`: a zero spin spending an £11m carryover. The board shows the spin as the main figure, pot in brackets only when they differ.

**Round labels fall back to `Round N`.** When `positionMode === "random"` or clubs run different formations, no single position names the round. `roundLabel()` is **exported** from `DrawBoard.jsx` so the review gates and the board headings can't disagree with each other.

## Review gates
Both draft screens hold on a completed board until you tap through, so it can't change while you're reading it:
- **ROUND COMPLETE** — every club has signed; shown at the round boundary.
- **ROUND SO FAR** — "You're up next"; shown when play comes back round to you.

Acknowledgement lives in **refs** (`ackRoundRef` / `ackPicksRef`), not state — see [[Bug Fixes#Misdiagnosed "remount bug" (pre-v4.2.30)]] for the detour that led there. The CPU step effect freezes behind the gate (`if (roundReview !== null) return;`).

## Pacing
- Scout: `scoutStepCpuTurn()` — one CPU pick per tick (`CPU_STEP_DELAY = 1600`).
- Classic: already paced via `CPU_SPIN_DELAY = 900` / `CPU_PICK_DELAY = 1300`.
- Online: `stepCpuTurn()` — see [[Multiplayer#CPU turns online]].
- "⏭ SKIP TO END OF ROUND" fills the board in one go, then a separate continue.

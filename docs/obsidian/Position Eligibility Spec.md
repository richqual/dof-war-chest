# Position Eligibility — Implementation Spec

Back to [[Roadmap]]. Related: [[Game Modes]], [[Data Model]], [[Screens]].

> Handoff spec for Code. Design signed off by Rich (2026-07-17). Status: ✅ **BUILT v3.9.69**. Three interlocking parts, all shipped. Implementation notes at the bottom.

## Summary of the change

Today, outfield **starter** slots have **no position restriction at all** — the draft pool is literally `p.pos !== "GK"`, so any outfielder can fill any outfield slot with zero consequence (a striker at CB plays exactly as well as at ST). The formation `pos` label is used only for the wheel/badge display, not for filtering.

This feature introduces **hard-pool eligibility + an out-of-position penalty**:
- Each outfield starter slot restricts the pickable pool to a defined set (**hard pool** — can't pick outside it).
- Within the pool, the slot's **natural** position plays at full strength; **eligible** alternatives take a small match-engine rating penalty.
- GK (starter + sub) and all four outfield sub slots are **exempt and unchanged** — they already enforce prescribed pools.

## Part 1 — Eligibility pools (signed off)

Model per slot: `natural` (0 penalty) + `elig` (small penalty) + everything else not pickable.

### Standard slots (formation-independent)

| Slot role | Natural | Eligible (penalised) |
|---|---|---|
| GK | GK | — (locked, unchanged) |
| CB (back four/five) | CB | — (strict) |
| RB (back four/five) | RB | LB, RM |
| LB (back four/five) | LB | RB, LM |
| DM | DM | CM, CB |
| CM | CM | DM, CAM |
| CAM | CAM | CM, RW, LW |
| RM (orthodox wide mid — 4-4-2, 4-5-1, 5-4-1) | RM | RW, RB |
| LM (orthodox wide mid — 4-4-2, 4-5-1, 5-4-1) | LM | LW, LB |
| RW | RW | RM, LW, ST, CAM |
| LW | LW | LM, RW, ST, CAM |
| ST | ST | RW, LW, CAM |

### Formation-specific exceptions

**Wing-backs** — in **3-5-2** and **3-4-3**, the `RM`/`LM` slots are wing-backs, not orthodox wide mids. Wider pool:

| Slot | Natural | Eligible (penalised) |
|---|---|---|
| RM (wing-back) | RB | RM, LB, RW, LW, LM |
| LM (wing-back) | LB | LM, RB, RW, LW, RM |

**Back-three centre-backs** — in **3-5-2** and **3-4-3**, the three `CB` slots additionally allow full-backs to drop in:

| Slot | Natural | Eligible (penalised) |
|---|---|---|
| CB (back three) | CB | RB, LB |

> Back-four and back-five CBs (4-3-3, 4-4-2, 4-5-1, 4-2-3-1, 5-3-2, 5-4-1) stay strict — those formations already have dedicated full-back slots.

Because the same `pos` label (`RM`/`LM`/`CB`) means different things in different formations, **eligibility is defined per formation-slot, not as a flat `pos → pool` map.**

## Part 2 — Data shape

Add an `elig` array to each slot entry in [[formations.js|FORMATIONS]] (`src/data/formations.js`). The slot's own `pos` is the natural position; `elig` lists the penalised alternatives. GK slots and strict CB slots get `elig: []`.

```js
// Example: 3-4-3 (back three + wing-backs)
"3-4-3": [
  { pos: "GK", x: 50, y: 88, elig: [] },
  { pos: "RM", x: 86, y: 56, elig: ["RB","LB","RW","LW","LM"], natural: "RB" }, // wing-back
  { pos: "LM", x: 14, y: 56, elig: ["LB","RB","RW","LW","RM"], natural: "LB" }, // wing-back
  { pos: "CB", x: 65, y: 74, elig: ["RB","LB"] },
  { pos: "CB", x: 35, y: 74, elig: ["RB","LB"] },
  { pos: "CB", x: 50, y: 74, elig: ["RB","LB"] },
  { pos: "CM", x: 34, y: 48, elig: ["DM","CAM"] },
  { pos: "CM", x: 66, y: 48, elig: ["DM","CAM"] },
  { pos: "RW", x: 78, y: 20, elig: ["RM","LW","ST","CAM"] },
  { pos: "LW", x: 22, y: 20, elig: ["LM","RW","ST","CAM"] },
  { pos: "ST", x: 50, y: 12, elig: ["RW","LW","CAM"] },
],
```

- `natural` is optional — defaults to the slot's `pos`. Only wing-back slots need it (their `pos` label `RM`/`LM` isn't the true natural position, which is `RB`/`LB`).
- Define a small helper `slotEligibility(formation, slotIdx)` → `{ natural, elig }` so the draft pool and the match penalty read from one source of truth.

## Part 3 — Draft pool restriction (hard pool)

In `availablePlayersFor(posKey, takenIds, rouletteAssignment)` — [[draftUtils.js|src/hooks/draftUtils.js:123]] (mirror the change in `useDraftState.js` and `useMultiplayerDraft.js` if they don't already re-use it):

- **No change** to the GK, GKSUB, or the four `*SUB` branches — leave them exactly as-is.
- The final outfield branch currently returns `p.pos !== "GK"`. Replace with a filter to the slot's `{ natural } ∪ { elig }` set.
- **Caveat:** `availablePlayersFor` currently takes `posKey`, not a formation+slot index. It needs enough context to resolve the slot. Thread the active manager's `formation` and the slot index through to it (the caller in `applyPick`/the draft screens knows both). Keep the sub/GK keys working by short-circuiting before the formation lookup.

### Part 3b — Filter UI

On the player-selection screen ([[PlayerPoolScreen]] / the draft pick list), default the visible pool to the slot's eligible set. Since this is a **hard** pool, there's no "browse everything" override for starters — but visually distinguish natural vs. eligible players (e.g. a small "out of position" tag + the penalty value on eligible picks) so the player understands the trade-off before picking.

## Part 4 — Out-of-position match penalty

Single pre-pass at the top of `generateEvents()` — [[MatchSim.jsx|src/components/MatchSim.jsx:857]]. The squad array is **slot-indexed** (`squad.slice(0, 11)` = starters in slot order), so each starter's slot is its index.

- Add an `applyPositionPenalty(squad, formation)` helper returning a **new array** of adjusted player copies. For each starter at slot `i`:
  - Resolve `{ natural, elig }` via `slotEligibility(formation, i)`.
  - If `player.pos === natural` → no change.
  - If `player.pos ∈ elig` → subtract a flat penalty from `rating` **and** the six stored stat fields (`pac/sho/pas/dri/def/phy`) so `deriveAttributes` reflects it downstream.
  - (Players outside the pool can't reach the match — the hard draft pool guarantees it — so no clamp needed, but a defensive fallback penalty is harmless.)
- **Penalty magnitude (v1):** flat two-tier. `natural = 0`, `eligible = −5` (tune in the −4 to −6 range). Scaled so a great player out of position still beats a mediocre natural one. Distance-based scaling is a deliberate v2, not now.
- **Integration:** `generateEvents` doesn't currently receive the formation — thread `homeFormation`/`awayFormation` in (or apply the pre-pass at the caller and pass adjusted squads). Do the pass **once**, before `teamStrength`/`teamDefStrength`/`teamCreationStrength` are computed, so every existing consumer sees penalised values with no further edits.
- Subs are unaffected: they only enter via the existing sub logic, which already draws from prescribed pools — leave bench players at full rating (they came on in a position they're eligible for).

## v2 refinement — distance-based central-mid penalty ✅ BUILT v5.4.1 (2026-10-26)

> Raised by Rich, 26 Oct 2026, playtesting Season Pool (a 1998/99 game). The flat −5 was too blunt for central midfield, which is fluid (DM/CM/CAM are interchangeable). In a `CM` slot, DM cards (e.g. Gerrard) and CAM cards (Totti, Del Piero, Zola) were all offered **but every one tagged `OOP −5`** — which felt wrong. A CM/DM/CAM sliding across those three central roles should be **minimal**; the full −5 belongs on genuine mismatches like a CAM shoved into a DM role, or a defender in midfield.

Two parts, both shipped:
1. **Filter chips** — central-mid slots now offer the whole trio as chips. `ELIG_STD` broadened: `DM→[CM,CAM]`, `CM→[DM,CAM]`, `CAM→[CM,DM]` (the only non-scarcity broadening; RM/LM still same-side-winger only).
2. **Penalty** — replaced the flat `OOP_PENALTY` hit with a **role-distance** function `positionPenalty(naturalPos, playerPos)` in `formations.js`. Each position has a **band** (GK 0, DEF 1, DM 2, CM 3, CAM/RM/LM 4, RW/LW/ST/CF 5) and a **flank** (L / C / R). Penalty = `BAND_STEP[|Δband|]` (`[0,2,4,5,5,5]`) + flank surcharge (+3 opposite flanks, +1 centre↔wide), capped at `OOP_PENALTY` (5). Results: adjacent central (DM↔CM, CM↔CAM) = **−2**; DM↔CAM extreme = **−4**; defender-in-mid (CB↔CM) = **−4**; CB↔CAM/ST = **−5**; same-side winger cover (RM↔RW) = **−2** (was −5).

As built:
- `formations.js` — `positionPenalty()` + `POS_BAND`/`POS_FLANK`/`BAND_STEP_PENALTY`; `OOP_PENALTY` is now the **cap**, not the flat hit.
- `MatchSim.jsx::applyPositionPenalty` — hit is now `positionPenalty(e.natural, p.pos)`. Dropped the `e.pool.includes(p.pos)` guard, so **emergency-widened stand-ins** (drafted via `POS_FALLBACK` outside the pool) are now scored by distance too — fixing a latent bug where the draft showed them `OOP −5` but the match applied **0**.
- `DraftScreen.jsx` — filter chips and the per-card `OOP −n` tag both read the real per-player penalty; a 0-penalty role (e.g. RWB in an RB slot) now shows no tag.
- Verified: pure-function harness over `positionPenalty`/`slotEligibility` (all cases above) + `vite build` clean.

### Follow-up — 3-at-the-back pools ✅ BUILT v5.4.2 (2026-10-26)

Rich flagged that the squeeze bites harder in three-at-the-back shapes. Two pool changes to `ELIG_OVERRIDE`, applied to **3-5-2 and 3-4-3 only** (five-at-the-back 5-3-2 / 5-4-1 keep strict CBs — they already have dedicated full-back slots):
1. **Back-three centre-backs** (slots 3,4,5) now open up to **RB/LB** as wide centre-halves. Uses the distance model → **−1** (band 1↔1 + flank shift), so it's cheap and realistic.
2. **Wing-back slots** (slots 1,2) keep natural RB/LB + eligible RM/LM, but now carry a flat **`pen: 1`** that overrides the distance model — because a wing-back runs the whole flank, so a same-side wide mid is barely out of role (the distance model, anchored to the full-back, would wrongly read RM as a −5 vertical jump). Pool stayed RB+RM / LB+LM (Rich's call — no wingers, no cross-flank cover).

Mechanism: `slotEligibility` now returns an optional flat `pen`; new `slotPenalty(slotElig, playerPos)` is the single source of truth (natural = 0 → declared-eligible flat `pen` if set → else `positionPenalty`), consumed by both `MatchSim.applyPositionPenalty` and the `DraftScreen` chips/tag. Verified by harness (wing-back flat −1, back-three CB −1, five-at-back still strict, central-mid trio unchanged) + clean build.

### Tag threshold ✅ v5.4.3 (2026-10-26)

The orange `OOP −n` card tag now only shows for a **meaningful hit (−3 or worse)**. Small penalties (−1/−2 — the central-mid shuffles and wing-back/back-three cover, picks you want freely used) are left to the chip dropdown's own `(−n)` label, so the card list isn't noisy with near-free options. Chips still show every penalty; only the per-card tag is gated (`DraftScreen.oopTag`, `pen >= 3`). In normal play this means only the DM↔CAM central extreme (−4) tags a card; the rest are chip-only.

## Explicitly out of scope / unchanged
- GK starter + GK sub pools (already `p.pos === "GK"`).
- The four outfield sub pools in [[players.js|SUB_POSITIONS]] (DEFSUB/MIDSUB/WIDSUB/ATTSUB).
- War Chest / 5-a-side (no formation slots in the same sense — confirm the pool change is gated to formation-based draft only).
- Distance-based / footedness-aware penalties (v2 — see the refinement section above for the agreed central-mid design).

## Build order
1. `formations.js` data (`elig`/`natural`) + `slotEligibility()` helper.
2. `applyPositionPenalty()` pre-pass in `MatchSim.jsx` (thread formation in).
3. `availablePlayersFor` hard-pool restriction (thread formation + slot in).
4. Filter-UI natural/eligible distinction + penalty display.

## Implementation notes (v3.9.69, as built)
- **Eligibility data lives in `formations.js`**, not inline on each slot: `ELIG_STD` (per natural pos) + `ELIG_OVERRIDE` (back-three formations) → `slotEligibility(formation, slotIndex)` returns `{natural, elig, pool}`. `OOP_PENALTY = 5` exported from the same file. This kept the big coordinate table untouched.
- **Draft pool:** `availablePlayersFor()` gained a 4th `eligPool` arg; `currentEligPool(d)` in `draftUtils.js` resolves the pool for the pick on the clock (null for GK/subs/War Chest). Wired into the human paths (`useDraftState.getAvailablePlayers`, `useMultiplayerDraft.getAvailablePlayers`) and the CPU path (`getPlayersFromState`). GK + `SUB_POSITIONS` branches untouched.
- **Match penalty:** `applyPositionPenalty(squad, formation)` in `MatchSim.jsx`, called inside `buildEffectiveSquad` (both the no-absence early-return and the post-subs path), so both `generateEvents` call sites inherit it. Gated by `FORMATIONS[formation]?.length === 11`, so War Chest (no formation) is skipped. Reduces `rating` + `pac/sho/pas/dri/def/phy` by 5 and stamps `outOfPosition:true`. Out-of-pool legacy players (drafted before this shipped) are left unpenalised as a safe fallback.
- **UI:** DraftScreen position-filter chips now list only the slot's `posPool` (natural marked ★, others show `(−5)`); default filter shows the whole eligible pool. Out-of-position players in the pick list carry an orange `OOP −5` tag (`bw-player-tag-oop`) via a new `outOfPos` prop on `PlayerCard`.
- **Verified** by importing the live modules: `slotEligibility` pools match this doc for wing-backs / back-three CBs / orthodox slots; `buildEffectiveSquad` applies −5 only to eligible-but-not-natural starters and leaves naturals, GK, out-of-pool, and formation-less (War Chest) squads untouched.

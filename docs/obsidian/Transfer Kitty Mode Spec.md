# Transfer Kitty Mode — Spec (scoping)

> **Name:** **Transfer Kitty** (agreed 31 Aug 2026). Sits alongside the other transfer-window clichés: War Chest, Scout. The distinction from War Chest is the whole point — a *considered kitty per position*, rather than one big chest for a 5-a-side squad. (Was working-titled "Transfer Kitty" during scoping.)

Back to [[The Transfer Wheel]]. Related: [[Game Modes]], [[Roadmap]], [[Scout Mode Spec]], [[War Chest flow refinement|War Chest]], [[Multiplayer]], [[Draw Board]], [[Data Model]], [[Position Eligibility Spec]].

> Written by Claude (Code) after a scoping session with Rich, 31 August 2026. Design agreed in chat; **grounded against the codebase 31 Aug 2026** (see "Grounding against the code" below). Not yet built. This is build-ready design input, not a final ruling. Promote into [[Roadmap]]'s main table once agreed.

## Identity: name, theme, the kitty

- **Name: Transfer Kitty.** A "kitty" is a pooled pot of money — here, a measured per-block kitty you spend building that block, vs War Chest's single all-in-one chest. The name carries the core mechanic.
- **Theme colour: GOLD** — matching the title colouring. Slots into the mode-colour system: **Classic = green, War Chest = orange, Scout = blue, Transfer Kitty = gold.** Wire a `kitty-theme` (or reuse the Broadcast token approach) with gold `--kit-*`/`--cc-*` tokens. Watch the known theming gotchas: [[feedback_wc_theme_overrides_legacy_tokens]], [[feedback_kit_header_gradient]], [[feedback_border_radius_important]].
- **Incorporate an actual "kitty".** The name invites a literal cat mascot/motif. Ideas to pick from at build time (not yet decided):
  - A **kitty piggy-bank / money-pot icon** that fills as your block kitty is allocated and empties as you spend — a natural fit for the per-block purse UI.
  - A small **cat mascot** presiding over the gold theme (title screen, lobby, the reveal splash) — the mode's face, the way each mode has its own character.
  - Keep it tasteful, not gimmicky — a recurring gold kitty emblem on the kitty/purse UI is probably enough. **TODO: decide the exact treatment during build.**
- **Managerial merry-go-round is INCLUDED.** Like every other mode, Transfer Kitty supports the manager merry-go-round (`managerTiming: "before" | "after"`, routing to the shared `ManagerDraftScreen` / `manager-draft` screen — see [[project_post_redesign_fixes]] reveal+confirm). No new work beyond setting `managerTiming` and routing to `manager-draft` on `tkPhase:"complete"`, exactly as Classic/Scout/WC do in `useDraftState.js`.

## The problem this solves

Classic Mode's draft is **one spin per player per slot**, fully sequential. With 6 players that's ~16 slots × 6 = ~96 spins taken one at a time — it took *hours* live. The loop doesn't scale past 3–4 players.

Two separate problems are tangled together:

1. **Too many discrete steps** (16 spins per player).
2. **Everything is sequential** (players wait on each other).

Transfer Kitty attacks both:

- **Chunking** — draft in position *blocks* (GK+DEF → MID → ATT → SUBS), not slot-by-slot. Fewer, chunkier decisions.
- **Simultaneity** — everyone builds their block at once (where the platform allows), instead of taking turns.

Combined, a 6-player game goes from ~96 sequential spins to **4 phases**.

## The build path (agreed)

**Solo + local pass-and-play FIRST, as the POC.** Online is the eventual point of the mode, but it's the biggest, riskiest surface, so it's a follow-up — build the mode's *shape* offline first, keeping one eye on online prep.

- **Solo:** you build your blocks; CPUs resolve instantly. No timers.
- **Local pass-and-play:** one device, players take blocks in draft order (like the other modes today). Still "chunked" (big win over Classic), but **not simultaneous** — simultaneity is an online-only property. That's fine for POC.
- **Online (later):** the real prize — everyone builds their block at the same time. This is where clash-resolution timers, AFK handling, and host-authoritative resolution all live. **Deferred, but don't design ourselves into a corner.**

> Implication: the **clash / simultaneity machinery is only truly exercised online.** In solo and pass-and-play, picks are sequential, so a "clash" is just "that player's already taken" — the existing shared-pool `takenIds` behaviour ([[Scout Mode Spec]] §Grounding) already handles that. The elaborate re-pick flow below is **online-phase design**, noted now so the data model doesn't have to be retrofitted later.

## Flow

**Bookended by wheel spins** — start with a spin for your keeper, budget-build the outfield in blocks, end with a spin for your bench. Spin → build → build → build → spin.

1. **Draft order drawn.** This seniority breaks all clashes for the rest of the game.
2. **Shared formation chosen at setup** (see "Set formation" below) — fixes the slot counts every player drafts against.
3. **Phase 0 — GK = wheel spin.** A classic budget-wheel spin to sign your goalkeeper (reuses Classic's single-slot spin flow). Opens the draft with drama.
4. **Phase 1 — Defenders** · **Phase 2 — Midfielders** · **Phase 3 — Attackers**
   - Each phase reveals a **shared pool** for those positions.
   - You build that block **War Chest–style** against the block's purse.
   - *Online:* privately + simultaneously, blind lock-in → simultaneous reveal → clash resolution (below).
   - *Solo / pass-and-play:* in draft order; a taken player is simply unavailable.
5. **Phase 4 — Subs = wheel spin.** Everyone spins to fill bench gaps. Quick, chaotic, dramatic finish that mirrors the opening keeper spin. Funded by carried-over budget (see Budget) via [[Leftover Lolly]].
6. **Draw board** after each phase — reuse the existing [[Draw Board]] component.
7. **Post-draw:** formation is now unlocked; you may reshape your drafted squad into any formation (see below).

**Why GK is a spin, not a block:** a keeper is a single strict-position slot (GK is never eligible for anything else) — there's no "build" to it, just one pick. A wheel spin gives that one pick some theatre, and pairing it with the closing subs spin bookends the whole draft nicely. It also keeps the budgeted *build* blocks purely outfield (DEF/MID/ATT), which is cleaner.

## Set formation (the structural keystone)

**Everyone drafts against one shared, fixed formation, chosen at setup.** This is what makes blocks comparable and clashes fair: every player needs the *same number of players per position*, so a contested pick is always like-for-like. (Same rule, same reasoning as [[Scout Mode Spec]] §1b — mixed formations make per-position demand ambiguous and depletion/clashes unfair.)

**Formation is draft-locked, then freely editable afterward.** After the draw you can rearrange your *already-drafted* players into a different shape. This is a pure post-draft tactical tweak — it never touches the pool or anyone else's picks. It also absorbs the RM/LM scarcity worry: RB/LB cover RM/LM in some formations and RW/LW cover them in others, so once players reshape after the draw, thin wide-mid positions sort themselves out. (Pool size is a non-issue — 1000+ players is plenty; see [[reference_rm_lm_player_scarcity]] for the scarcity nuance, but Rich is not worried here.)

### Which formations to offer (agreed 31 Aug 2026)

**Offer a SMALL fixed set of draft formations, not the full `FORMATION_LIST`.** The draft formation only exists to fix *slot counts per block* so everyone builds the same shape; tactical variety is a post-draw concern. Rich's call:

- **4-4-2** and **4-3-3** to start. 4-3-3 effectively becomes 4-5-1 or 4-2-3-1 depending on which players you pick and how you set up after the draw.
- **A back-three (e.g. 3-5-2 / 3-4-3) is a "maybe later", not needed for v1.** If someone wants a back three they can rework their drafted players into it themselves after the draw — "on the player to make it work for them."

So: draft against 442 or 433 (identical DEF/MID/ATT block counts as each other except the MID/ATT split), reshape freely after. Keep the draft-formation picker to those two for the POC; the engine already supports every shape in `FORMATIONS` if we widen it later.

## Budget: per-block with carryover

- **Per-block purses**, so you can't blow everything on one Galactico and field 10 cheap players.
- **Scales with player count.**
- **Weighted by block** — attackers get a bigger purse (they cost more).
- **Unspent money carries forward** block → block, and whatever's left at the end **powers the sub-wheel** via the existing [[Leftover Lolly]] mechanic (unspent cash → sub fund → bench spins). This rewards thrift and ties the finish back to a system already built.

Exact per-block weightings and the player-count scaling curve are playtest tuning; the *shape* (per-block, carryover, attacker-weighted, feeds sub-wheel) is the design decision.

## The wheel's role

The wheel is **not** the contested picker (two people can't both win the same random wedge). It's kept only where it *adds drama to an outcome already set up*: **the subs phase.** Everyone spins simultaneously to fill bench gaps — the spin just takes longer than a tap, and since everyone spins at once nobody waits. Deliberate XI build → chaotic bench flourish is a nice emotional arc.

## Clash resolution (ONLINE phase — deferred)

Included for completeness so the online build has a target. Not needed for the POC.

- Contested shared pool; **draft-order seniority wins** a contested player.
- **Blind simultaneous reveal** — no watching others pick live (fairer, more dramatic, no info leak).
- **Losers re-pick together, timed:** reveal → winners lock → all clash-losers *simultaneously* re-pick from what's left on a short timer → reveal again → repeat if needed (usually 1 round, rarely 2). **Losers only ever wait on other losers, never on winners** — this preserves re-pick agency without the sequential stall the mode exists to kill.
- **Host-authoritative resolution.** Clash resolution must be a **host-only resolve step**, NOT `isMyTurn`-guarded — online, CPU turns are nobody's turn and `isMyTurn` handlers no-op silently ([[reference_mp_cpu_isMyTurn]]).

## Grounding against the code (what already exists)

Grounded 31 Aug 2026 against `src/hooks/draftUtils.js`, `src/hooks/scoutUtils.js`, `src/data/formations.js`, `src/data/players.js`, `src/hooks/useDraftState.js`. Headline: **most of the machinery Transfer Kitty needs already exists** — this mode is more a re-composition of built parts than new systems. Whoever builds it should not reinvent the following.

### Reuse wins (already built)

- **Shared depleting pool.** `takenIds` + `availablePlayersFor()` + `isDraftableBy()` in `draftUtils.js` already give a single shared, depleting pool with per-player value/form/order maps. In solo/pass-and-play this *is* the clash mechanic — a taken player is just unavailable. Nothing new needed for the POC's "someone already took him" case.
- **Block grouping already exists — twice.**
  - `formations.js` has `GROUP_SLOT_INDICES` (GK/DEF/MID/ATT → slot indices), `GROUP_ORDER`, `GROUP_LABELS`, `GROUP_COLORS`, `FORMATION_DISPLAY_ORDER`. ⚠️ **But `GROUP_SLOT_INDICES` is a single fixed slot→group map, not per-formation** — it assumes the standard 4-3-3 slot layout. For per-formation blocks, prefer the Scout path below.
  - `scoutUtils.js` has `formationStarterPositions()` / `formationStarterBuckets()` / `scoutBucketForSlot(formation, slotIndex)` — a genuinely **per-formation** slot→position mapping, plus `scoutDemand(formation, numPlayers)` which already computes per-bucket demand across N managers. **This is the right basis for defining a block's slot set and sizing per formation.** Transfer Kitty blocks = grouping these buckets into GK+DEF / MID / ATT.
- **War Chest budgeting is the model for a block build.** `getWarChestPlayersForSlot()`, `assignWarChestBudget()`, `autoBuildWarChestSquad()`, `autoFillWarChestSlot()`, `WAR_CHEST_SLOTS`, `WAR_CHEST_VALUES`, and crucially the **per-slot budget-fraction ceiling** `WC_MAX_FRACTION` + `WC_PICK_ORDER` (ATT weighted highest: 0.30/0.26 vs DEF 0.08). This is *exactly* the "per-block purse, attackers weighted bigger" mechanic — but note WC is **5-a-side** (5 outfield slots), whereas Transfer Kitty is a **full 16-slot squad** (11 + 5 subs, `squad: Array(16)`). So reuse the *budget-weighting shape*, re-scaled to real blocks. `autoFillWarChestSlot()` also already handles "timer ran out / no-show → auto-fill remaining slots" — the online AFK case is half-solved.
- **Leftover Lolly → sub-wheel is built and directly reusable.** `isBenchRound()`, `carryFor()`, `bankLeftover()`, `subFund`, `needsTopUp()`, `BENCH_MIN_FUND`, `cpuSpendCap()` already implement "unspent XI budget banks into a fund that funds the bench, with a floor and a top-up spin." Transfer Kitty's "carryover feeds the sub-wheel" is *this system* — see [[project_leftover_lolly]]. The bench-round CPU reserve logic is already there too.
- **Position eligibility / OOP penalty is built.** `slotEligibility()`, `ELIG_STD`, `ELIG_OVERRIDE`, `OOP_PENALTY` (−5), and `currentEligPool()` handle the hard-pool-per-slot + out-of-position penalty. RM/LM already broaden to same-side winger; back-three wing-backs already broaden to full-back. Transfer Kitty inherits this for free — including the RM/LM cover that makes post-draw reshaping viable.
- **Draft order + snake order + CPU picks.** `buildInitialDraft()` sets `snakeOrder`/`currentOrder`; `chooseCpuPick`/`cpuVariancePick` pick for CPUs. Draft-order seniority (needed for online clash tiebreaks) is already the thing that exists.
- **Position-major loop ≈ the block loop.** `applyPick()` only advances `positionIndex` once *every* manager has taken the current slot (`newTurnIndex >= n`), reversing order each round. That's "everyone drafts this slot, then everyone moves on." **Transfer Kitty is the same loop at coarser granularity** — everyone drafts this *block*, then everyone moves to the next block. The `positionMode: "random"` + `currentSlot` + `autoDrawSlot()` path already lets a manager fill their 11 slots in an arbitrary order, which is close to "build your block in any internal order."

### Genuinely new work

- **Block-major turn structure.** Existing loop is *slot*-major (one slot × all managers × next slot). Transfer Kitty (esp. offline pass-and-play) wants *block*-major: one manager builds their **whole** GK+DEF block (multiple picks, budgeted), then the next manager, then everyone moves to MID. That's a new outer loop wrapping the existing budgeted-pick primitives — not a rewrite of them.
- **Per-block purse allocation.** WC gives one chest split by fraction across 5 slots; Transfer Kitty wants a **purse per block** (scaling with player count, attacker-weighted) with carryover between blocks. New allocation function, but modelled on `WC_MAX_FRACTION`.
- **The subs-wheel-as-finale as its own phase.** Leftover Lolly already turns leftover → bench fund; Transfer Kitty makes that an explicit simultaneous *phase 4* with a wheel spin per bench slot. Mostly assembly of existing pieces.
- **Online only (all deferred):** blind simultaneous reveal, contested-pick clash resolution with senior-draft-wins + timed loser re-pick, host-authoritative resolve step ([[reference_mp_cpu_isMyTurn]]), timers/AFK. `autoFillWarChestSlot()` is a head start on AFK; `useMultiplayerDraft.js` / `useMultiplayerSession.js` are the sync layer to build on. None of this blocks the POC.

### Data-model notes

- Squad is `Array(16)`: slots 0–10 starters, 11–15 subs (`GKSUB`/`DEFSUB`/`MIDSUB`/`WIDSUB`/`ATTSUB`). Transfer Kitty keeps this shape.
- Values: no `value` field in data — always `resolveValue(playerValues, p)` or you get `undefined` ([[reference_player_values]]).
- Firestore can't nest arrays: `serializeDraft`/`deserializeDraft` already convert Sets↔arrays and Maps↔objects — any new Transfer Kitty state must round-trip through these for online.
- `STORAGE_VERSION = 8` — bump if Transfer Kitty changes persisted shape.

## Open questions / TODO before build

1. ~~**Grounding pass against the codebase.**~~ ✅ Done 31 Aug 2026 — see "Grounding against the code" above.
2. **Name.** "Transfer Kitty" is a placeholder Rich dislikes. Still open.
3. ~~**Block composition — fixed or flex with formation?**~~ ✅ Resolved: **flex with formation**, but only 442/433 offered at draft time (back-three later). Blocks derive from `formationStarterBuckets()` grouped into GK+DEF / MID / ATT. Slot counts identical across all players in a given game.
4. **Per-block budget weights + player-count scaling** — playtest tuning. Start from `WC_MAX_FRACTION` shape (ATT weighted highest), re-scaled to full blocks; layer player-count scaling on top.
5. **Online-only (all deferred):** timer lengths, AFK / "never locked in" auto-fill behaviour (see `autoFillWarChestSlot()` head start), host-authoritative state machine, blind-reveal netcode. None of this blocks the POC.

## Build-out: data model & state machine (proposed)

Concrete design for the POC (solo + local pass-and-play). This is a *proposal to build against*, not final — names/shapes can shift in code review. Mirrors how the other modes live on the `draft` object in `useDraftState.js`, with a `transferKitty: true` discriminator (like `warChest: true` / `scout: true`). Naming convention below: `tk*` prefix for state, "kitty" for the per-block pot. (Field names are illustrative — settle in code.)

### Block definitions (derive, don't hardcode)

A **block** is a named group of starter slots drafted together. Derive per formation from Scout's `formationStarterBuckets(formation)` so slot counts are always correct and self-consistent:

```
BLOCKS = [
  { key: "GK",   label: "Goalkeeper", slotIndices: [0],         wheel: true },   // opening spin
  { key: "DEF",  label: "Defence",    slotIndices: [1,2,3,4] },                  // budgeted build
  { key: "MID",  label: "Midfield",   slotIndices: [...] },                      // budgeted build
  { key: "ATT",  label: "Attack",     slotIndices: [...] },                      // budgeted build
  { key: "SUBS", label: "Substitutes", slotIndices: [11,12,13,14,15], wheel: true }, // closing spin
]
```

- **GK and SUBS are `wheel: true` (spin, not budgeted build)**; DEF/MID/ATT are budgeted build blocks. The draft opens and closes on a wheel.
- For **4-4-2**: DEF = slots 1–4 (RB/LB/CB/CB), MID = 5–8 (RM/CM/CM/LM), ATT = 9–10 (ST+ST).
- For **4-3-3**: DEF = 1–4, MID = 5–7 (DM/CM/CM), ATT = 8–10 (RW/LW/ST).
- Grouping rule: map each starter slot's bucket base-position (`bucketBasePosition`) to GK/DEF/MID/ATT using the existing `GROUP_*` intent, but **computed from the formation's actual slot list**, not the fixed `GROUP_SLOT_INDICES`. Write a small `kittyBlocks(formation)` helper next to `scoutBucketForSlot`.
- GK is its own single-slot spin block; subs stay one wheel block.

### Draft state additions

On the `draft` object (new fields, alongside the shared ones like `takenIds`, `playerValues`, `managers`):

```
transferKitty: true,
blocks: [...],            // computed block defs for the chosen (shared) formation
tkBlockIndex: 0,          // which block the whole table is on (0=GK,1=DEF,2=MID,3=ATT,4=SUBS)
tkPhase: "gk-wheel",      // "gk-wheel" | "building" | "block-reveal" | "subs-wheel" | "complete"
drawFormation: "4-4-2",   // the shared draft formation (442/433 for POC)
// order reuse: snakeOrder / currentOrder / turnIndex as today
```

Per manager (extend the `managers[i]` shape):

```
squad: Array(16).fill(null),   // same shape as Classic
blockKitty: null,              // £ kitty for the CURRENT block (assigned per block)
kittyRemaining: null,          // unspent in current block's kitty
carryover: 0,                  // rolls block→block
subFund: 0,                    // reuse Leftover Lolly: leftover → subs wheel
formation: drawFormation,      // locked during draft, editable after
```

**Reuse note:** `blockKitty`/`kittyRemaining`/`carryover`/`subFund` deliberately echo War Chest's `chestBudget`/`wcBudgetRemaining` and Classic's `carryover`/`subFund`, so `bankLeftover()`, `carryFor()`, `isBenchRound()`-style plumbing can be adapted rather than rewritten.

### Per-block purse allocation

New helper, modelled on `WC_MAX_FRACTION` but for full blocks and scaled by player count:

```
// Fraction of a manager's total draft budget assigned to each budgeted BUILD block.
// GK and SUBS are wheel spins, funded separately (see below), so they're not here.
// Attack weighted highest; DEF/MID/ATT sum to ~1.0 (minus a small subs reserve).
KITTY_FRACTION = { DEF: 0.32, MID: 0.34, ATT: 0.34 }
```

- **GK spin** is funded like a Classic budget spin (`generateBudget(difficulty)` off the wheel) — independent of the build-block purses. It's the opening flourish, not part of the outfield budget.
- **Total build budget** rolls once per manager at draft start (reuse `WAR_CHEST_VALUES[difficulty]` or a Transfer Kitty-specific band), then splits by fraction into the DEF/MID/ATT purses.
- **SUBS spin** is funded by `subFund` (leftover build budget) via Leftover Lolly, plus a floor/top-up spin — the closing flourish.
- **Player-count scaling:** the *pool* is shared and depletes, so more players = more competition, not smaller purses. Keep purses formula-simple; scale scarcity through the pool (Scout already proves this). If purses need to scale, do it as a difficulty-band choice, not a per-player divisor.
- **Carryover:** `kittyRemaining` at end of a block → `carryover`, added to the next block's purse; whatever's left after ATT → `subFund` for the subs wheel (exactly Leftover Lolly).

### The block-major loop (POC: solo + pass-and-play)

Coarser-grained version of `applyPick`'s "everyone does this, then advance." One **manager builds their entire current block** (multiple budgeted picks) before the turn passes — unlike Classic's one-pick-then-pass.

```
GK block (tkBlockIndex 0, wheel):
  tkPhase="gk-wheel": each manager spins Classic budget wheel → signs a GK into slot 0
  → block-reveal (Draw Board)

for each BUILD block B in [DEF, MID, ATT]:      // tkBlockIndex 1..3
  for each manager M in currentOrder:           // turnIndex, snake-reversed per block
    assign M.blockKitty (KITTY_FRACTION[B] × total + carryover)
    M builds B: repeatedly pick from availablePlayersFor(slotPos, takenIds, …)
        - human: browse + pick, War-Chest-style, until block slots filled or "done"
        - CPU: autoFill this block's slots (adapt autoFillWarChestSlot to a slot subset)
        - each pick: squad[slot]=player, takenIds.push(id), kittyRemaining -= value
    bank M.kittyRemaining → carryover (rolls to next block; after ATT → subFund)
  tkPhase="block-reveal" → show Draw Board for B

SUBS block (tkBlockIndex 4, wheel):
  tkPhase="subs-wheel": each manager spins subFund-funded wheel to fill 11–15
tkPhase="complete" → SquadScreen (formation now editable)
```

- The **GK and SUBS wheel phases reuse existing spin flows** — GK is Classic's single-slot budget spin (slot 0); SUBS is the Leftover Lolly bench-round spin. Only the three middle blocks use the new budgeted-build loop.

- **Advance function** `applyKittyBlockDone(d)`: analogue of `applyPick` at block granularity — advances `turnIndex`; when all managers done, snapshots the Draw Board, advances `tkBlockIndex`, reverses order (snake), rolls next purses.
- **Within a block**, the internal per-pick action is essentially `getWarChestPlayersForSlot`-style browse + a Classic-style `applyPick` scoped to the block's slots. The `positionMode:"random"` + `currentSlot` machinery already lets a manager fill slots in any order — reuse it, constrained to the current block's `slotIndices`.
- **Solo:** CPUs resolve instantly via an adapted `autoFillWarChestSlot` (pass the block's slot subset + purse). No timers.
- **Pass-and-play:** same loop; between managers, show the club-coloured "your turn" handoff splash already built ([[project_warchest_edit_and_turn_splash]]).

### Screen flow

New screens (mirroring War Chest's `WarChestLobbyScreen` / `WarChestDraftScreen` / `WarChestSquadScreen`):

- `TransferKittyLobbyScreen` — mode setup: player count, difficulty, **draft formation (442/433)**, filters, Remember-My-Preferences hook ([[project_remember_preferences]]).
- `order-draw` — reuse the existing order-draw screen (seniority for handoff + later online clash tiebreak).
- `TransferKittyDraftScreen` — the block builder: current block's empty slots, purse/remaining, browsable affordable pool for the block, pick/undo, "finish block." Reuse [[Draw Board]] on `block-reveal`.
- `TransferKittySubsScreen` (or fold into DraftScreen) — the subs wheel finale.
- `SquadScreen` — reuse; unlock formation editing post-draw.

### Online deltas (deferred — noted so the model doesn't fight it later)

- `tkPhase` gains `"locking"` (blind, simultaneous) and `"resolving"` (clash resolution).
- Add `pendingPicks[managerIdx]` (each manager's provisional block, hidden) and a host-only `resolveBlock()` that: reveals all, awards contested ids to the senior `snakeOrder` manager, sets losers back to a timed `"re-pick"` sub-state drawing from the now-updated `takenIds`. Must be host-authoritative, **not** `isMyTurn`-guarded ([[reference_mp_cpu_isMyTurn]]).
- All of `pendingPicks` must round-trip `serializeDraft`/`deserializeDraft` (no nested arrays).

## Suggested build order (POC)

> **▶ START HERE (next session's first action):** build the **pure logic first, no UI** — (a) `kittyBlocks(formation)` deriving block defs from `formationStarterBuckets()`, (b) the per-block kitty allocator (`KITTY_FRACTION` split of a rolled total, + carryover), and (c) `applyKittyBlockDone(d)`, the block-granularity analogue of `applyPick`. These are testable in isolation and are the skeleton everything else hangs off. Only after they're sound do the screens/lobby/wheels. Then proceed through the numbered order below.

1. Draft-formation picker limited to 442/433; derive block definitions from `formationStarterBuckets()`.
2. Per-block purse allocation function (model on `WC_MAX_FRACTION`, scale by player count).
3. Block-major outer loop wrapping the existing budgeted-pick primitives (`getWarChestPlayersForSlot`-style browse + `resolveValue`), reusing `takenIds` for "already taken."
4. Solo (CPUs via `autoFillWarChestSlot`/`cpuVariancePick`) → then local pass-and-play (one manager builds a full block, hand to next).
5. Bookend wheels: GK opening spin (reuse Classic single-slot budget spin) + subs closing spin funded by carried-over purse via the existing Leftover Lolly plumbing.
6. Reuse [[Draw Board]] between phases.
7. *(Later)* online: blind reveal + clash resolution + host authority.

## Relationship to existing modes

- **vs Classic:** same underlying player DB and draft-order draw; Transfer Kitty replaces slot-by-slot spinning with block-by-block budgeted building.
- **vs War Chest:** borrows the "build a chunk against a budget" feel ([[project_warchest_flow_refinement]]) but applies it *per block* rather than the whole squad at once, and adds contested simultaneity (online).
- **vs Scout:** shares the fixed-formation-during-draft rule and the shared depleting pool; differs in delivery (blocks + budget vs per-turn tiered scout report).

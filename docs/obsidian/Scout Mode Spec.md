# Scout Mode — Spec (scoped)

Back to [[The Transfer Wheel]]. Related: [[Roadmap]], [[Game Modes]], [[Data Model]], [[Position Eligibility Spec]].

> Written by Claude (chat) after a scoping session with Rich, 18 July 2026. Tidied by Claude (Code) 18 July 2026 after grounding against the codebase — see the "Grounding against the code" section for what the build plumbing actually does today. This is meant to be build-ready input, not a final ruling. Promote into [[Roadmap]]'s main table once agreed.

## The problem this solves

Right now it's too easy to end up with a genuinely great squad most games. The two existing levers — difficulty (budget) and league/era filters (menu restriction) — both act on *your* budget or *your* menu, not on competition for the players themselves. With ~1,300 cards across 5 leagues and up to 8 drafters, a good player in your price range is almost always available. Draft order barely bites, and there's no risk to browsing.

Scout Mode is the fix: it's the delivery mechanism for two combined mechanics — a **small, depleting live pool** and **tier caps** — rather than a fourth separate idea.

## Grounding against the code (what already exists)

Two things the earlier scoping pass treated as new turned out to already be in the build. Recorded here so whoever builds this doesn't re-invent them:

- **The pool is already a single shared, depleting set.** `takenIds` is one global set and [`availablePlayersFor`](../../src/hooks/draftUtils.js) filters every query against it. Sharing/depletion isn't a new system to build — it's already there. The *only* reason draft order and scarcity feel invisible today is that the master pool (~1,339 cards) is too big to ever run dry. **Scout Mode's core job is therefore not "make the pool shared" but "make the shared pool small enough that depletion actually bites."** That reframes #1 below from a new mechanic into a setup-time constraint on an existing one — cheaper to build, and squarely the War-Chest-reuse pattern already committed to.
- **Snake order is already in place.** `applyPick` rebuilds the pick order from `snakeOrder` and reverses it every other round (`draftUtils.js`). So "depletion makes turn order matter" works out of the box — no new ordering plumbing.
- **The draft loop is already position-major.** `applyPick` only advances `positionIndex` once *every* manager has taken their turn on the current position (`newTurnIndex >= n`). So the game already runs "everyone drafts this slot in snake order, then everyone moves to the next slot" — one position at a time, turn by turn. That's exactly the flow Scout Mode wants (see #6), and crucially it's *sequential within a position*, which is what lets depletion bite: picker 1 thins the pool, the last picker scrapes the barrel. Nothing to build — just don't break it.

## Core mechanic

### 1. Live pool, not master pool
The ~1,300-card database (`src/data/players.js`) stays untouched. At game setup, a smaller **live pool** is drawn per position, filtered by whatever league/era restriction is active for that game. It then depletes through the existing shared-`takenIds` mechanism above.

**Sizing — deliver scarcity, with a guaranteed-playable floor.** The goal is emotional, not a formula: the *last* manager on a position should sometimes be scraping a nearly-empty barrel with only a couple of real options left. To land that reliably rather than by luck, size the pool from **total demand plus a deliberately thin surplus**, not a fixed multiple:

- Demand per position = `numPlayers` (one starter each) + sub demand for positions that feed a sub slot.
- Draw `demand + surplus`, where `surplus` is small (starting point ~4–6 cards for the whole table, tuned to taste). A thin surplus is the whole point: with 4 managers needing 4 STs and only ~6 in the pool, the 4th picker is choosing from 2–3.
- **Floor rule (overrides the surplus):** guarantee **at least one card of each tier that exists in the filtered master set** for that position, so the "one candidate per tier" report promise (#2) can actually be met at the start of the draft. Tiers simply run out through depletion *after* that, which is the intended arc — not before it, which would just be a dead tier.

**Demand scales with player count; surplus stays roughly flat — so scarcity feels the same at every table size:**

| Players | Demand (≈ starters) | + surplus | Pool ≈ |
|---|---|---|---|
| 2 | 2 | + ~4 | ~6 |
| 4 | 4 | + ~4 | ~8 |
| 8 | 8 | + ~4 | ~12 |

Because the surplus is held ~constant while demand grows, the *last* picker on a position is always choosing from just the handful of surplus cards, whether it's a 2- or 8-player game. (If 8-player draws ever feel too brutal, `surplus` could scale gently, e.g. `4 + numPlayers/2` — but start flat, since flat is what makes a full table genuinely cut-throat.)

This replaces the old `(numPlayers × 3) + 5` Lucky Bag formula, which is too generous to ever create scarcity (11 cards for 2 players never runs dry). Exact surplus and sub-demand weighting are playtest tuning; the shape (near-demand draw + per-tier floor) is the design decision.

### 1b. Shared formation (draft-locked)
**All managers draft against one shared formation, chosen at game setup before the live pool is drawn.** This is a requirement of the sizing model, not just tidiness: "demand per position = `numPlayers`" is only well-defined if everyone needs the same slots. Mixed formations (a 3-5-2 vs a 4-2-3-1) make per-position demand ambiguous and depletion unfair — the back-three managers would starve the back-four managers of centre-backs, and the pool couldn't be sized cleanly.

The formation only needs to be shared **during the draft**, because that's what the pool was sized against. Once squads are built, a manager rearranging their *already-drafted* players into a different shape is a post-draft tactical tweak that never touches the pool or anyone else's picks — so: **locked during draft, freely editable afterward.**

### 2. The scout report (per-turn hand)
On your turn, you don't browse the live pool directly. You're shown a curated hand: **one player from each tier still available and still affordable** on your current budget (T1 → T5, skipping any tier with nothing left or nothing in range). This keeps Rich's original "one from each tier, if affordable" idea intact — it's the delivery UI.

### 3. Depletion
Whatever you don't pick stays in the live pool for the next manager's turn on that position. First pick sees the full live pool; later picks may be scraping the bottom of a tier. This is what makes draft/pick order matter for the first time — currently it doesn't, at all, since everyone drafts from the same effectively-bottomless pool independently.

### 4. Tier caps (opt-in — OFF by default as of v4.0)
Once a manager's squad hits its cap for a tier (e.g. max 3 T1s across the XI), their scout report simply stops offering that tier — even if it's still sitting in the live pool and affordable. This closes the loophole depletion alone wouldn't: a rich manager hoovering up every good player early, before scarcity has a chance to bite anyone else.

**Shipped as an opt-in Advanced-Options toggle, off by default** (Rich's call, v4.0): the depleting pool already generates plenty of scarcity on its own, so double-limiting with caps was too heavy as a default. When the toggle is off, `draft.tierCaps` is `null` and every tier is always allowed (the cap strip is hidden). When on, caps come from `TIER_CAPS_BY_DIFFICULTY`. The mechanism is liked enough that it's flagged to also become a **Classic** Advanced-Options toggle later — see [[Roadmap]].

**Caps are squad-wide totals, not per-position — this is a real decision, driven by the data.** The T1 tail is extremely uneven across positions: ST has 29 T1s but LM has **1**, RB **2**, LB **3**, DM/CM **6** each. A per-position cap would be meaningless on the thin positions (they can't surface a T1 anyway, so the cap never binds) and would only ever bite at ST and the wings. A single squad-wide total (e.g. "max 3 T1s across your XI") lets the fat positions subsidise the thin ones and makes the cap a genuine strategic constraint everywhere. Build the cap as a count over the manager's whole squad, checked when assembling each report.

### 5. Re-scouting has a cost
Unlimited re-rolls on a bad hand would recreate the exact browsing problem in a different skin. Give each manager a small number of re-scouts per game (a flat count, e.g. 2–3), or make each one cost something (a budget fee, or a shared re-spin-style token). Exact number/cost: needs playtesting, not a design decision to lock now.

### 6. Free-transfer safety net becomes load-bearing
The existing rule (minimum 4 free transfers per position) currently just sits quietly in the background. Under depletion, a position's live pool can genuinely run dry mid-draft — especially at Brutal difficulty combined with a late pick order. This rule stops being decoration and becomes the actual thing that keeps the game playable in that scenario. No change needed to the rule itself, just worth noting its role changes.

## Interactions with existing systems

- **Difficulty** stays an independent lever (how much money you have). Tier caps + live-pool scarcity now govern what's *achievable* with that money — two separate constraints instead of one doing all the work.
- **League/era filters** feed the live-pool draw at setup — a filtered game gets a live pool built only from the filtered subset.
- **Position eligibility (multi-pool slots, 🟡 designed not built)** — flagged dependency, not solved here: if a slot can draw from more than one position pool (e.g. CB accepting DM-listed players), that overlap needs to feed into the live-pool sizing formula, or a popular dual-eligible position could deplete unfairly fast relative to a single-eligible one. Whoever builds Scout Mode after position eligibility ships should check this interaction directly.
- **Draft/pick order** — snake order (1..N..1) is already in place (see "Grounding against the code"), so depletion turns turn order into a real strategic factor with no extra work.

## Open questions before build

- Exact live-pool **surplus** size and re-scout allowance/cost — playtest tuning. (The *shape* — near-demand draw + per-tier floor — is decided in #1.)
- Whether the live pool depletes **per position independently** (current assumption) or there's any cross-position interaction beyond the multi-pool-slot case above.
- Whether the squad-wide tier cap is fixed per game or configurable per difficulty (e.g. Brutal could allow zero T1s, Generous could allow more). Cap *scope* (squad-wide, not per-position) is decided in #4; only the *number* per difficulty is open.
- Exact scouting mission premium percentage and Club Tenet discount amount — needs playtesting.

## Club Tenets (identity layer, riding on the same draw)

A natural extension of the scout report mechanism: at club creation, a manager picks **1–2 tenets** that softly bias their scout reports for the rest of the game, rather than building a separate system for club identity.

**Data is already there — Tenets are cheap.** Every axis a tenet could bias on is a populated first-class field on the card today: `league`, `era`, `nation`, and `archetype` (e.g. "Shot Stopper", "Organiser"). No database work needed, unlike FFP/wages. Tenets are purely a weighting tweak on an existing draw.

**Mechanic:** a tenet is a **soft nudge** on the scout report draw, not a hard filter. When building a manager's per-tier hand (one candidate per tier, filtered by afford + tier cap as above), if there's a tenet-matching candidate still in the live pool, it gets slight preference for that tier's slot over a non-matching one. If nothing matches, the draw falls back to whatever's available — a tenet never leaves a manager starved, it just tilts the odds over the course of a draft. No hard-filter mode needed; keep it as one strength setting rather than a configurable dial, at least for v1.

**Candidate tenets** (pick 1–2 at club creation):
- **Continental** — bias toward a specific league
- **Old Guard** / **Academy** — bias toward Classic/Golden vs Modern era
- **Homegrown** — bias toward a nation (a club built entirely around this is effectively opting into the "one per nation" challenge idea voluntarily)
- **Front-Foot** / **Backs to the Wall** — bias toward attacking vs defensive `archetype` values

**Explicitly distinct from the roadmap's existing "club-philosophy perks" idea** (scouting perks, finance boosts, wheel re-spins) — that's an active-ability system meant to layer onto Career mode later. Tenets here are a passive draw-bias baked into Scout Mode itself, buildable alongside it rather than gated on Career mode existing. Keep these as two separate roadmap line items so one doesn't get mistaken for shipping the other.

**Open question:** final tenet list and exact weighting curve — needs playtesting, not a spec decision to lock now.

## Scouting Missions (paid escape hatch, subs only)

A rarer, separate action from the re-scout above: instead of redrawing from the live pool, a manager can commission a **scouting mission** that searches *outside* the live pool entirely, targeting a specific league and/or era. Solves a real problem the game already has — leftover carry-over money with nothing worth spending it on by the time you're filling frees at the bench.

**Availability:** once per game, and only usable on **one of the five sub slots** — never the starting XI. This is a deliberate, self-limiting constraint rather than a counted resource: it needs no tracker beyond "has this manager used their one mission yet," and it lands exactly where the problem it solves actually shows up (leftover budget, weak bench spot, late in the draft).

**Cost:** the found player's normal value **plus a premium percentage** — starting point ~30–40%, to be tuned via playtesting. Chosen over a flat fee because a flat number either does nothing at Generous difficulty or is crippling at Brutal; a percentage scales naturally with whatever tier the mission is actually reaching for.

**Still tier-capped.** A mission finds a player matching the request, it doesn't bypass the squad's tier cap — otherwise it's just a paid way to dodge the whole point of Scout Mode.

**Doesn't touch the shared live pool.** Missions search independently, so one manager using one can't indirectly deplete or starve another manager's live pool.

**Imperfect by design.** A mission takes a league/era + position request, not an exact player name — one candidate is shown, weighted by affordability, consistent with Scout Mode's "hand you're dealt" flavour rather than becoming free-text search.

**Club Tenet synergy:** if the mission's target league/era matches the manager's tenet, the premium is discounted — rewards philosophy alignment without forcing it.

## Mode vs. toggle — decided

**Decision: Scout Mode ships as its own mode, alongside Classic and War Chest — not a Classic toggle.**

Reasoning, by comparison to the two existing precedents:
- **Real Teams** is a toggle because it only changes what CPU opponents look like — the underlying pick loop (browse the full pool, sign whoever's affordable) is untouched.
- **War Chest** got its own mode because it replaces the core interaction — different economy, different screens, different draft logic entirely.

Scout Mode is the War Chest case, not the Real Teams case: it replaces the fundamental turn-by-turn action (dealt hand from a depleting pool, running tier caps, tenet-driven bias) rather than adjusting a variable inside Classic's existing flow. That's new screens and new per-turn UI, not a checkbox.

**Build approach:** its own mode, reusing the shared scaffolding underneath (formations, managers, budget/difficulty, series/tournament formats) rather than rebuilding any of it — same pattern War Chest already follows. Draft Roulette can still layer on top of it later exactly as it does for Classic, since Roulette operates one level above whichever mode's flow is running underneath.

**Optional cheaper validation path, not required:** if it's ever worth sanity-checking the depletion + tier-cap *feel* before committing to new screens, it could be prototyped as a throwaway Classic toggle first, then promoted to a real mode once the mechanic's proven out. Noted here for completeness, not chosen as the plan.

## Where this sits in the roadmap

Not sequenced yet — this spec makes it scopeable, not necessarily next. See [[Roadmap]] for where Rich wants to slot it against Career mode, League/era Draft Roulette modifiers, and FFP/wages.

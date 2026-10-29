# Roadmap & Ideas

Back to [[The Transfer Wheel]]. Related: [[Game Modes]], [[Screens]].

> Planning space for things that are **game-related but not (fully) built yet**. Living in the repo alongside the code is deliberate — the plan versions together with the thing being planned. Nothing here has to ship to belong here.

> ✅ **Verified 25 Oct 2026** (Claude Code) against the code and `git log` at **v5.0.0**. Every row's status below is current; [[Version History]] has been brought up to date to v5.0.0. (Correction: Scout Mode shipped at **v4.0.7**, not v4.0.0.)
> ✅ **Updated 29 Oct 2026** (Claude Code) at **v5.5.3**: Season Pool has shipped through Phase 2 plus per-player **growth types** and **keyframes**, the value curve is tuned, and the Google Sheet pipeline is operational. Statuses below reflect that; [[Version History]] is current to v5.5.3.

## Status key
- 🟢 **Building** · 🟡 **Designed, not built** · 🔵 **Idea / someday** · ✅ **Shipped**

## In flight / planned
| Idea                     | Status | Notes                                                                                         |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| ~~Position eligibility~~ | ✅     | Hard-pool slots + out-of-position penalty + filter UI (built v3.9.69); reworked to a **distance-based** penalty with DM/CM/CAM chips and three-at-the-back cover in v5.4.1–5.4.3. Spec: [[Position Eligibility Spec]]. |
| ~~Scout Mode~~           | ✅     | New mode alongside Classic and War Chest: shared depleting live pool per position, squad-wide tier caps, Club Tenets (soft draw-bias), and a one-shot paid scouting mission on a sub slot. Built v4.0.7 (solo/local; online MP is a follow-up). Spec: [[Scout Mode Spec]]. |
| Scout Mode — online MP   | 🟡     | Scout Mode ships solo/local in v4.0. Online needs host-authority sync of the shared depleting live pool across devices (same pattern War Chest MP uses). Spec: [[Scout Mode Spec]]. |
| Squad tier caps in Classic | 🔵   | The Scout Mode tier-cap mechanic (max N of each tier per squad, tightening by difficulty) works well as a standalone lever — Rich wants it as a Classic Advanced-Options toggle too. Logic already exists in `scoutUtils.js` (`TIER_CAPS_BY_DIFFICULTY`, `allowedTiers`); Classic would need to filter its browse list by it. Off by default, like in Scout. |
| ~~Season Pool~~ — core   | ✅     | **Shipped through Phase 2 + growth types + keyframes (v5.0.1 → v5.5.3).** Pick a season/era (single year, Classic/Golden/Modern range, or All-seasons Peak/Random) and the pool is the players & managers active then, each at that season's rating + reputation-driven value. Per-position ageing curves, then per-player `growth` shapes (v5.5.2) and hand-authored age→rating `keyframes` (v5.5.3) for marquee players; the value curve was tuned in v5.5.1. Classic/Golden/Modern are presets. Google Sheet ↔ repo pipeline is live. Remaining phases + bulk authoring are their own rows below. Spec: [[Season Pool Spec]]. |
| Season Pool — bulk authoring | 🟡 | Growth types + keyframes for the rest of the T1/T2 pool, authored in the now-live Google Sheet (`growth` column; keyframes via `src/data/keyframes.js`). Mechanisms shipped with a ~17-name / 6-player proof set — this fills out the rest. |
| Season Pool — inflation + wages (Phase 3) | 🟡 | Per-season **inflation** multiplier (display-only — never touches balance) so early seasons show smaller headline fees, plus a `wage` per player-season (unblocks FFP/Wages below). ⚠️ Inflation is cosmetic, so it does **not** fix pool feel — the "wheel feels pointless / prices jump" problem was the v5.5.1 curve tune, not this. Spec: [[Season Pool Spec]] §Inflation. |
| Season Pool — depth fill (Phase 5) | 🟡 | Cheap journeymen / squad players (60s–low 70s) per season. The real fix for star-heavy early seasons and "not enough mid-tier options" on the wheel — more impact than any other single data task. Spec: [[Season Pool Spec]] §Coverage. |
| Season Pool — club spells (Phase 4) | 🟡 | Per-season club list per player, unblocking historical real squads for Real Teams / Super League. Spec: [[Season Pool Spec]] §Clubs per season. |
| Non-season single rating for multi-spell players | 🔵 | Keyframes fix overlap-year ratings only in *season* games; non-season Classic still shows per-spell card ratings (R9 96 Inter / 88 Real Madrid). Could reconcile to one rating there too. |
| Career mode              | 🟡     | New mode: wipe/re-draft loop, tier + era progression, save slots. Design agreed, not built. **Now builds on [[Season Pool Spec]]**: start in a chosen season, players age along their curves, the inflation multiplier rises season to season. |
| FFP / Wages              | 🟡     | Blind wage-envelope + FFP penalty (top-5 earners cut, backfilled from frees). The database blocker (a wage on every card) is solved by phase 3 of [[Season Pool Spec]], and age tiers come from `birthYear` + season. |
| ~~Transfer Kitty~~        | ✅   | New gold-themed mode to fix Classic's slow multiplayer: bookended by wheel spins (GK spin → budgeted DEF/MID/ATT *kitty* blocks → SUBS slot machine), piggy-bank kitty reveal per block with carryover into [[Leftover Lolly]], fixed formation during draft (442/433, editable after), merry-go-round, per-block position filters, block recap draw board. Built v4.3.x (solo/local; ships as 5.0.0). Online MP is a follow-up (below). Spec: [[Transfer Kitty Mode Spec]]. |
| Transfer Kitty — online MP | 🟡  | Transfer Kitty ships solo/local. Online is the point of the mode: everyone builds their block simultaneously + blind, then a host-authoritative reveal resolves clashes (senior draft order keeps a contested player, losers re-pick on a timer). Needs the blind-reveal netcode + AFK handling; the block recap draw board is already designed as the home for the re-picks. Spec: [[Transfer Kitty Mode Spec]] §Clash resolution. |
| Transfer Kitty — Remember My Preferences | ✅ | Remember-My-Preferences toggle now wired into the TK lobby for parity with Classic/Scout (namespace "transferKitty"). Built v4.3.10. |
| Match sim desktop reflow | 🟡     | Only screen left in the widescreen/desktop reflow sweep.                                      |
| Captain match influence  | 🔵     | Captain (`manager.captainId`) now persists across games/series/tournaments (v3.9.71) but is **cosmetic only** — `MatchSim` ignores it. Idea: give the captain a small in-match effect (e.g. leadership/morale nudge, tie-break weighting, or a rating bump). Affects [[Screens#MatchSim]], set on [[Screens#SquadScreen]]. |

## Recently shipped (for context)
See [[Version History]] for the full story. Highlights:

| Feature | Version |
|---|---|
| Season Pool keyframes + overlap-rating fix | v5.5.3 |
| Season Pool growth types | v5.5.2 |
| Season value curve tune | v5.5.1 |
| Live draw-board reveal | v5.5.0 |
| Season Pool Phases 0–2 (seasons, curves, randomiser) | v5.0.1–5.4.0 |
| Scout Mode (v3→v4 bump) | v4.0.7 |
| Transfer Kitty mode (gold) | v5.0.0 |
| Real Teams / Super League mode | v3.9.55–59 |
| Broadcast UI redesign (complete) | v3.9.23 |
| Drag-to-spin wheels | v3.9.23 |
| Global menu → pull-tab | v3.9.31 |

## Backlog / loose ideas
_(add freely — one line each, promote to the table above when it firms up)_
- Spin the season: Draft Roulette modifier where the wheel picks the year (needs [[Season Pool Spec]] phase 1).
- Historical real squads ("Arsenal 1998/99") for Real Teams (needs [[Season Pool Spec]] phase 4).
- Seasons before 1998/99 (later extension of [[Season Pool Spec]]).

## How to use this note
- Add ideas as bullets under **Backlog**; when one gets real, move it into the table with a status.
- Cross-link to the screen/mode it touches, e.g. "affects [[Screens#MatchSim]]".
- Keep this as the single source of truth for "what's next" so it doesn't scatter across chats.

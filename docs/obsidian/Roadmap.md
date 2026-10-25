# Roadmap & Ideas

Back to [[The Transfer Wheel]]. Related: [[Game Modes]], [[Screens]].

> Planning space for things that are **game-related but not (fully) built yet**. Living in the repo alongside the code is deliberate — the plan versions together with the thing being planned. Nothing here has to ship to belong here.

> ✅ **Verified 25 Oct 2026** (Claude Code) against the code and `git log` at **v5.0.0**. Every row's status below is current; [[Version History]] has been brought up to date to v5.0.0. (Correction: Scout Mode shipped at **v4.0.7**, not v4.0.0.)

## Status key
- 🟢 **Building** · 🟡 **Designed, not built** · 🔵 **Idea / someday** · ✅ **Shipped**

## In flight / planned
| Idea                     | Status | Notes                                                                                         |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| ~~Position eligibility~~ | ✅     | Hard-pool slots + out-of-position penalty (−5) + filter UI. Built v3.9.69. Spec: [[Position Eligibility Spec]]. |
| ~~Scout Mode~~           | ✅     | New mode alongside Classic and War Chest: shared depleting live pool per position, squad-wide tier caps, Club Tenets (soft draw-bias), and a one-shot paid scouting mission on a sub slot. Built v4.0.7 (solo/local; online MP is a follow-up). Spec: [[Scout Mode Spec]]. |
| Scout Mode — online MP   | 🟡     | Scout Mode ships solo/local in v4.0. Online needs host-authority sync of the shared depleting live pool across devices (same pattern War Chest MP uses). Spec: [[Scout Mode Spec]]. |
| Squad tier caps in Classic | 🔵   | The Scout Mode tier-cap mechanic (max N of each tier per squad, tightening by difficulty) works well as a standalone lever — Rich wants it as a Classic Advanced-Options toggle too. Logic already exists in `scoutUtils.js` (`TIER_CAPS_BY_DIFFICULTY`, `allowedTiers`); Classic would need to filter its browse list by it. Off by default, like in Scout. |
| **Season Pool** — NEXT   | 🟡     | **Next build (agreed 25 Oct 2026), ahead of Career mode.** Pick a season (from 1998/99) and the pool is only the players active then, at that season's rating. One player identity with per-season data (club spells, rating curve, reputation-driven value, wage). Classic/Golden/Modern become presets of it. Inflation as a display-only multiplier. Google Sheet master → exported to the repo. Phased 0–5. Spec: [[Season Pool Spec]]. |
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

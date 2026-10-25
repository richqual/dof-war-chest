# Season Pool — Spec (scoped)

Back to [[The Transfer Wheel]]. Related: [[Roadmap]], [[Data Model]], [[Game Modes]], [[Scout Mode Spec]], [[Claude Notes]].

> Written by Claude (chat) after a design session with Rich, 25 October 2026. Coverage numbers below were computed against `src/data/players.js` at v4.2.53 (1,338 cards). This is build-ready input for Claude (Code), not a final ruling. Grounded against the codebase by Claude (Code) 25 October 2026 — see the "Grounding against the code" section below for what already exists, what contradicts the spec, and what it changes.

## The problem this solves

It's too easy to build a great squad because **every player is available at their peak, all at once.** The era filters (Classic / Golden / Modern) help a little, but each era spans 8–10 seasons and each card is the player's peak/iconic spell, so you nearly always end up with the best version of everyone.

Scout Mode attacks this through **scarcity** (a small depleting pool). This attacks it through **time**: pick a season, and you only get the players who were around then, at the level they were playing *that season*. In 1998/99 Gerrard is a promising kid, Henry is a wide player at Juventus, and Zidane is at his peak. Peaks rarely overlap, so the "everyone at their best" problem goes away by itself.

It's also the **foundation for the single-player, multi-season modes**, Career Mode first: players ageing, improving and declining across seasons comes straight out of this data.

## Grounding against the code (what already exists / contradicts / changes the plan)

Grounded by Claude (Code) 25 October 2026 against the repo at **v5.0.0**. Current card count is **1,338** (`src/data/players.js`), matching the coverage run above. Each note is tagged *exists* (already built, reuse it), *contradicts* (the spec assumes something the code doesn't do), or *changes the plan* (a concrete adjustment for the build).

- **rating→tier mapping — *contradicts*.** There is **no** rating→tier function anywhere. `tier` (`"T1"`…`"T5"`) is a hand-authored field on every one of the 1,338 cards in [`players.js`](../../src/data/players.js), and the tiers **overlap by rating**: T1 87–98, T2 82–92, T3 76–89, T4 74–83, T5 69–77. So "derive `tier` with the same rating→tier thresholds the current data uses" can't be done faithfully — those thresholds don't exist, because tier is an editorial judgement, not a cut on rating. **Changes the plan:** carry `tier` per keyframe in the sheet (author it alongside rating), *or* define brand-new thresholds and accept they won't reproduce today's tiers. This is also the single biggest risk to the Phase 0 "reproduce `players.js` exactly" goal — see the round-trip note below.
- **rating→value mapping — *contradicts* (same shape).** There's no rating→value formula either. Each card carries a `valueMin`/`valueMax` **band**, and [`randomizePlayerValues`](../../src/hooks/draftUtils.js) rolls a value inside it per game; [`resolveValue`](../../src/hooks/draftUtils.js) reads the band's midpoint when no roll exists (there is **no** `value` field in the data). So "apply the existing rating→value mapping to reputation" means: the sheet/export must emit a per-player-season `valueMin`/`valueMax` band centred on reputation. The band mechanic stays; only what centres it changes. (Matches the long-standing "always use `resolveValue()`" rule.)
- **CPU picks by value already — *exists*, and it's good news.** [`chooseCpuPick`](../../src/data/players.js) sorts affordable candidates by `b.value - a.value` (tiebreak rating) and hands off to `cpuVariancePick`. Its own comment: *"CPU acts on value (perceived market reputation), not actual ratings it can't see."* So "CPU managers pick by reputation, not true rating" is **already how it works** — the mechanic lands for free the moment `value` is reputation-driven. No change to `chooseCpuPick` is needed.
- **`era` and `legend` — *exists*, three consumers to update.** `era` is a stored string on every card: `"classic"` (359) / `"golden"` (396) / `"modern"` (531) / `"legend"` (52). It is read in exactly three places: the draft filter ([`DraftScreen.jsx`](../../src/components/DraftScreen.jsx) / [`PlayerPoolScreen.jsx`](../../src/components/PlayerPoolScreen.jsx)), the **Draft Roulette** era axis (`DRAFT_ROULETTE_ERAS` in [`draftUtils.js`](../../src/hooks/draftUtils.js) — only classic/golden/modern, **no** legend), and **Club Tenets** (`old_guard`→`classic`, `academy`→`modern` in [`scoutUtils.js`](../../src/hooks/scoutUtils.js); `tenetMatches` reads `player.era`). Making `era` a *derived preset* means updating these three; the preset boundaries (classic 1999–2008, golden 2009–2016, modern 2017–2026) are consistent with the current era buckets. **Legends are gated by `league: "legends"`, not by era** — all 52 `era:"legend"` cards also carry `league:"legends"`, and the filters deliberately bypass the era toggle with `p.league === "legends"`. So the spec's "legends sit outside the season system / All-seasons only" maps straight onto the existing league gate; no new flag needed.
- **Dedup by name — *exists*, and the identity merge is a natural extension.** [`selectGamePlayers`](../../src/hooks/draftUtils.js) groups the filtered pool by the `name` **string** and picks **one random version per name** (Real Teams dedups by `name|league` so each league's copy survives); [`dedupeByName`](../../src/hooks/draftUtils.js) is a Real-Teams-only collapse. This is exactly the fragile matching the spec's `wikidataId` identity key removes ("X" vs "X Jr", two Ronaldos, diacritics). Nice bonus: "range presets roll one random season per player" is behaviourally identical to the existing "pick one random version per name", so dedup stays trivial (one identity = one card) with no new code path.
- **The `draft` object & save snapshots — *exists*, mostly handled.** In-flight, the draft carries `playerValues` / `playerForm` / `playerOrder` as **`Map`s keyed by player id** ([`draftUtils.js`](../../src/hooks/draftUtils.js)), which already need bespoke serialisation for Firebase MP. A **signed** squad player is stored as a **full object spread** `{ ...player, value, ownedBy }` ([`useDraftState.js`](../../src/hooks/useDraftState.js)), and [`useSaveSquad`](../../src/hooks/useSaveSquad.js) persists `squad: m.squad` wholesale to Firestore. **So saved squads are already snapshots** — a later edit to master data can't retroactively change a saved squad, because the stats were copied at sign time. **Changes the plan (small):** the per-player *rolled season* for range presets should live in the draft `Map`s (same serialisation path as `playerValues`) and be baked into the spread at sign time; a `dataVersion` stamp on saves is still worth adding for Career Mode.
- **managers.js has era + years — *exists*.** All 127 managers in [`managers.js`](../../src/data/managers.js) carry `era`, a `years` **string range** (e.g. Wenger `"1996–2018"`), plus `tier`/`league`/`club`. So a manager "active window" can be derived from `years` the same way players' can — and it carries the **same start-year, off-by-one migration risk**. There is no structured numeric window field today; the sheet would add `fromSeason`/`toSeason`.
- **LM/RM already draw from wingers — *exists*.** [`formations.js`](../../src/data/formations.js) `ELIG_STD` broadens the scarce wide-mid slots: **RM → `["RW"]`, LM → `["LW"]`** (same-side winger only), with wing-back overrides broadening to same-side full-backs in back-three shapes. `OOP_PENALTY = 5`. The comment states the DB has "only ~4 RM and ~2 LM", which is why these slots broaden. **Changes the plan:** the coverage script must count *eligible wingers* toward LM/RM demand, not raw LM/RM cards — otherwise it will flag a shortage the eligibility system already covers.
- **`years` format confirms the convention risk — *exists*.** Cards use start-year ranges with two-digit ends and open-ended current spells: `"1991–99"`, `"2018–"`. This is exactly the start-year-vs-end-year hazard the spec flags; the migration must parse both forms. A `pos2` secondary-position field also exists on some cards (read by `chooseCpuPick`), which fits "positions live on the spell".

**Net:** the design is well-aligned with the code. The two genuine *contradictions* are both the same thing — **`tier` and `value` are authored, not computed** — so the sheet must own them per season, and the Phase 0 round-trip has to treat them as data to reproduce, not formulas to re-derive. Everything else (CPU-by-value, era/legend gating, dedup, save snapshots, LM/RM eligibility) already exists and is reused rather than rebuilt.

## Decisions taken (25 Oct 2026)

| Topic | Decision |
|---|---|
| Sequencing | **Next build, ahead of Career Mode.** Career Mode builds on it. |
| Earliest season | **1998/99.** Earlier seasons could come later (the 52 `legend` cards already live pre-1998). |
| Eras | **Classic / Golden / Modern become presets of the season system**, not a separate variable. One time concept in the game, not two. Rich explicitly values consistency and simplicity over parallel configurations. |
| Season label | **Store the season's end year: `1999` = 1998/99** (Rich calls it "the 99 season"). |
| Reputation | **In.** A player's price follows reputation, not just the current season's rating. |
| Wages | **In.** Designed alongside the season data so FFP/Wages doesn't need a second database pass. |
| Database count | **One database.** Season is a query over it, not a separate copy of the data. |
| Source data | **A private Google Sheet as the editable master**, exported into the repo by a script. The app never reads the sheet live. |

## Core concept: one player, many seasons

Today: **one card = one player at one peak spell** (with ~151 players duplicated across eras as separate cards, joined only by an identical `name` string).

New: split into two layers.

- **Identity** (stable): `id`, `name`, `nation`, `birthYear`, primary `archetype`.
- **Season data** (changes over time): `club`, `league`, `pos`, `rating`, plus derived `tier`, `reputation`, `value`, `wage` and attributes.

Choosing a season = "everyone who has season data for that year." The ~151 multi-card players merge into one identity. Their existing cards become two keyframes on one curve, which is a nice free head start.

### Data shape (illustrative, not final)

```js
// identity
{ id: 12, name: "Wayne Rooney", nation: "🏴", birthYear: 1985, archetype: "Complete Forward" }

// club spells (career history inside the top-5 leagues)
spells: [
  { club: "Everton",  league: "premier_league", from: 2003, to: 2004, pos: "ST" },
  { club: "Man Utd",  league: "premier_league", from: 2005, to: 2017, pos: "ST" },
  { club: "Everton",  league: "premier_league", from: 2018, to: 2018, pos: "CM" },
]

// rating keyframes; seasons in between are interpolated
curve: [
  { season: 2003, rating: 74 },
  { season: 2008, rating: 88 },
  { season: 2012, rating: 90 },
  { season: 2018, rating: 80 },
]

// optional per-season overrides for weird years (injury, loan, breakout)
overrides: [ { season: 2014, rating: 84 } ]
```

Positions live on the **spell**, not the identity: Gerrard, Rooney and Henry all changed role during their careers.

**Identity key:** each identity carries a `wikidataId` (e.g. `Q.....`) as its permanent cross-source key. The numeric `id` can stay for the app.

**Mid-season moves and loans:** a player counts at **the club he spent most of that season at**. Loans are their own spell (with `loan: true`), so a season-long loan puts him at the loan club for that season. Wikidata/Wikipedia dates are **calendar dates**, so every import converts them to season end-years (a spell starting Aug 2003 belongs to `2004`).

`firstSeason` / `lastSeason` come from the spells. A player only counts as "active" in seasons where they have a spell in a covered league (the top 5), so a year in MLS or a gap year drops them out of the pool for that season.

## Ratings and career curves

**Default:** a position-based ageing curve (keepers and centre-backs age well, pacy wide players fall away fast), tuned per player with 3–5 keyframes. Interpolate between keyframes, apply any override, then derive `tier` with the same rating→tier thresholds the current data uses (Claude Code: confirm where those live).

**Attributes** (`pac/sho/pas/dri/def/phy`): scale with the rating delta from the player's peak card, with an extra age penalty on `pac`. Hand-editing six attributes per season isn't realistic, so this has to be a formula.

**FIFA ratings as a reference, not a source.** Historical FIFA datasets track individual careers well (Messi staying 90+ into his mid-30s, Rooney falling away after his peak). Use them to **shape** curves where they exist, but keep the numbers on our own scale rather than copying EA's ratings. Limits:
- Coverage: commonly available datasets mostly start around FIFA 15, some go back to about FIFA 07. **Pre-2007 has no FIFA reference**, so the Classic era is hand-curved.
- Bias: reputation lag and big names being overrated, both of which we deliberately model separately (below).

**Priority:** curve the T1/T2 players first. They cause the "everyone's a star" problem. Everyone else can run on the default position curve from their current card until they're tuned.

## Reputation → value

A player's **transfer value follows reputation**, which lags behind rating in both directions:

- **Ageing stars stay expensive** for a while after their peak (realistic, and a trap for the unwary).
- **Rising young players are cheap** before their reputation catches up. This is where the bargains are, and it rewards football knowledge ("I know who this 17-year-old becomes").

Starting formula (a tuning knob, not gospel):

```
reputation(s) = max( rating(s), peakSoFar(s) − decayPerSeason × seasonsSincePeak )
                with young players held below rating until they've had N good seasons
value(s)      = existing rating→value mapping applied to a blend of rating(s) and reputation(s)
```

**CPU managers pick by reputation, not true rating.** CPU drafting (`chooseCpuPick`) should value players by what was known *at the time*. If CPUs saw true ratings they'd snap up every underpriced wonderkid first. With reputation-based picking, the human's football knowledge is a genuine edge over the CPU, which is the fun of the mechanic.

`valueMin`/`valueMax` keep their current role (the band that `randomizePlayerValues` rolls within). The band is just centred on reputation rather than raw rating.

## Wages

Add a `wage` per player-season, derived the same way as value (reputation + age), in the same base unit (see inflation below). This removes the FFP/Wages blocker ("every card needs a wage number") as a by-product. The FFP spec's age tiers (Young / Prime / Experienced) also come for free from `birthYear` + season.

## Inflation (display layer only)

**Inflation never touches game balance.** All values, wages and budgets stay in one internal base unit. A per-season multiplier converts that unit into "season money" for display only.

- **Anchor:** today's numbers are **2026 money (multiplier 1.0)**, so the Modern preset and the default game look exactly as they do now. Earlier seasons show smaller headline figures.
- **Use football inflation, not price inflation.** UK prices have roughly doubled since 1999, but transfer fees have grown many times faster. Build our own index (e.g. the average of each season's top-N fees, normalised to 2026 = 1.0), or borrow the method behind Tomkins & Riley's Transfer Price Index. The table is about 28 rows, one per season.
- **UI nicety:** a tooltip like "£22m (≈ £110m in 2026 money)".
- **Career Mode hook:** the multiplier rises as seasons pass, so money in the bank effectively loses value and early fees look like bargains later. Optional and later, but the data supports it.

The budget wheel, difficulty and kitty values are all multiplied for display the same way. No mode logic changes.

## Clubs per season

Real Teams / Super League needs a **club list per season**: who was in each top flight (Wimbledon in 98/99, clubs coming and going) and club renames. Store it as a small `clubs` table (`club`, `league`, `fromSeason`, `toSeason`). With player spells this also unlocks **real historical squads** ("Arsenal 1998/99") as a later bonus. Historical kits are out of scope.

## Managers per season

The ~127 managers / DoFs in `src/data/managers.js` need the same treatment, or a 1998/99 game will offer Pochettino. Minimum: **active window** (first/last season managing in a covered league). Ideally: **club spells per season**, same shape as players (Wenger at Arsenal 1997–2018 end-years). The Managerial Merry-Go-Round and manager draft then read the season pool just like players do. Wikidata covers managerial spells too (`position held` / head coach qualifiers), with patchier coverage.

## Card display: Age field

Cards get a **dedicated `Age:` field**, computed from `birthYear` and the season (age at the start of the season, to keep it simple). Not baked into the name. It makes the career curves visible at a glance (a T3 aged 18 reads very differently from a T3 aged 33) and supports the bargain-hunting play.

## Season flavour

A short intro on the season-select / game-start screen, e.g. *"1998/99: Arsenal are defending champions after the double. Can anyone stop them?"*

**Rule: flavour only knows what was known at the start of that season,** i.e. what happened up to the end of the previous season, plus summer transfers. 2015/16's intro talks about Chelsea defending the title, never Leicester. No hindsight, ever, consistent with the reputation principle above.

Stored as a `flavour` tab in the sheet: `season`, `league` (or `all`), 1–3 lines. Optional per season, since a missing row just shows nothing. Easy content for Rich to write and enjoy.

## Eras become presets

The season picker offers:

| Preset | Seasons (end-year convention) |
|---|---|
| Single season | any one of 1999 → 2026 |
| Classic | 1999–2008 |
| Golden | 2009–2016 |
| Modern | 2017–2026 |
| All seasons | 1999–2026 |

`era` on the card stops being hand-entered data and becomes something derived from the season (or is dropped). Club Tenets' "Old Guard / Academy" and the Draft Roulette era modifiers should read the preset rather than the old field.

**Decided (25 Oct 2026): range presets roll one season per player at game setup.** If a range preset just used each player's best season in the range, we'd recreate today's problem. Instead each player gets one random season within the range (inside their own active window). In a Golden game you might get 2009 Ronaldo or 2014 Ronaldo, with the identity shown once and only one version available. It's cheap, keeps dedup trivial (one identity = one card), and is fun. The rolled season is stored in the `draft` object (see Multiplayer / persistence).

`legend` cards (52, all pre-1998) sit outside the season system. Suggest they appear only in **All seasons**, or behind an existing legends toggle if there is one. Claude Code: check how `legend` is used today.

## Season label convention

- Stored as the **end year**: `1999` means 1998/99.
- Shown in the UI as **"1998/99"**, with a short form **"’99"** where space is tight.
- ⚠️ The current `years` field uses **start years** (`"1991–99"` = from 1991). The migration must convert carefully. Off-by-one season bugs are the main risk in this whole project.

## Source of truth: Google Sheet → repo

The editable master is a **private Google Sheet** (Rich + optionally his brother). A script exports it into the repo, and the build turns that into what the app loads. The deployed app only ever sees static files: no API keys in the browser, no dependency on Google being up, and the committed export gives full git history (every rating change is diffable and reversible).

Suggested tabs:

| Tab | One row per |
|---|---|
| `players` | identity |
| `spells` | player × club spell (club, league, from, to, pos) |
| `curve` | player × keyframe (season, rating) |
| `overrides` | player × season exception |
| `clubs` | club × top-flight run |
| `inflation` | season → multiplier |
| `managers` / `managerSpells` | manager identity × club spell |
| `flavour` | season (× league) → intro lines, previous-season knowledge only |
| `tuning` | global knobs (ageing curves per position, reputation decay, rating→tier/value/wage mappings) |

**Review status column.** Every data row carries a `source` / `checked` marker: `script` (drafted by an import, not reviewed), `checked` (Rich has eyeballed it), `manual` (hand-entered). Re-running an import must **never overwrite `checked` or `manual` rows**; it only refreshes `script` rows. That way review effort is never lost.

**"Good enough" bar.** Scripts draft everything. Rich hand-checks only (a) T1/T2 players and (b) positions/seasons the coverage report flags as thin. Everything else ships on script data and gets fixed when someone notices.

Build output (suggested): either one composed `players` module, or **one JSON file per season** (`seasons/1999.json` …) that's lazy-loaded when a game starts. Per-season files keep the initial bundle small. Claude Code to pick based on bundle size.

**Step one of the pipeline must reproduce today's `players.js` exactly** (a round-trip with no behaviour change) before anything new is layered on.

## Reference sources (for research, not bulk import)

Ground rule: use these to **check and inspire** the data (who was where, relative standing, who the bargains were), and keep our numbers on our own scale. They're other people's research, so credit any fan database we lean on heavily, e.g. on the About screen.

| Source | Good for | Notes |
|---|---|---|
| **Wikidata** (foundation) | Spells with start/end dates (`member of sports team` + qualifiers), birth dates, nationality | Wikipedia's structured sister project. Queryable directly by script (SPARQL), and CC0 so no attribution is required. **Its Q-IDs become our permanent player key** (`wikidataId` on the identity), which replaces matching duplicate cards by name string (fixes "X" vs "X Jr", Brazilian Ronaldo vs Cristiano, diacritics). |
| **Wikipedia club-season articles and player career tables** | Checking and filling gaps in Wikidata: squad lists per season, who was in each top flight, loans | CC BY-SA licensed. The checking layer, not the primary import. |
| **Championship Manager 01/02** | A *contemporaneous* snapshot of 2001/02: how players were rated **at the time**, not with hindsight | Released free by Eidos and still has an active community. Its Current Ability / Potential Ability model is a close cousin of our rating curve + reputation. Data files are in the game's own binary format, so read through community editors rather than importing directly. |
| **Fan-made FM retro databases** (1992/93, 1994/95, 1998/99, 2000/01, 2007/08, 2013/14 exist) | Historical squads per season, plus well-researched relative abilities | Built **with hindsight** (young Messi/Ronaldo get huge potential), which suits curves more than reputation. They're `.fmf` files opened in FM's Pre-Game Editor, so you'd need a copy of FM to browse them. Hosted on fan sites (passion4fm, FM Scout, sortitoutsi). |
| **FIFA ratings datasets** | Year-by-year rating trends from about FIFA 07/15 onward | See "Ratings and career curves" above: use to shape curves, don't copy. |
| Transfermarkt | Fees, career histories | Great data, but its terms forbid scraping. Look things up manually only. |

The **contemporaneous vs hindsight** split is useful: hindsight sources tell us a player's real **curve** (who he became), and contemporaneous sources tell us his **reputation** at the time (what people thought he was worth then). That's exactly the gap the bargains in this design live in.

## Coverage today (from current card spells)

Counting a card as active in a season when its existing `years` spell covers it. This **undercounts**, because a card's `years` is one club spell, not a whole career, so real coverage will be higher once spells are complete.

| Season | Active cards | of which T1/T2 | LB | RB | CAM |
|---|---|---|---|---|---|
| 1998/99 | 124 | 46 (37%) | 11 | 10 | 7 |
| 1999/00 | 151 | 56 | 15 | 11 | 10 |
| 2004/05 | 225 | 69 | 16 | 17 | 14 |
| 2009/10 | 208 | 68 | 14 | 20 | 15 |
| 2014/15 | 271 | 79 | 21 | 24 | 16 |
| 2019/20 | 336 | 87 | 26 | 32 | 22 |
| 2025/26 | 289 | 76 | 24 | 23 | 23 |

What this tells us:
- **Even step 1 cuts the pool hard**, from 1,338 to about 120–360 per season (roughly 10–25%).
- **Early seasons are star-heavy.** In 98/99 more than a third of the active cards are T1/T2, because the database was built from peak spells. **The fix is depth, not more stars:** journeymen and squad players in the 60s and low 70s. That changes the feel more than any other single data task.
- **Thin positions:** full-backs and CAMs in the early seasons, and LM/RM almost don't exist (0–3 in any season). Check this against position eligibility (multi-pool slots), since LM/RM slots may already draw from wingers.

**Re-run this coverage report as a script** at every phase, and fail the build (or warn) if any position in any season drops below what the modes need. That's demand plus the Scout surplus at 8 players, plus the 4-free-transfers floor.

## Interactions with existing systems

- **Scout Mode. Decided (25 Oct 2026):** the season pool sits **upstream**, exactly like league/era filters today. The season (or preset) defines the filtered master set, and Scout's live pool is drawn from it. Scout's per-tier floor rule and the free-transfer safety net still apply. One extra rule: **if the season pool for a position can't meet Scout's demand + surplus, widen to ±1 season automatically** (and say so in the UI) rather than producing a dead draft.
- **Draft Roulette.** "Spin the season" becomes a natural modifier: the wheel picks the year. That's in keeping with the board-game test (draw a season card).
- **Transfer Kitty / War Chest / Classic.** No logic change. They read the filtered pool and display values through the inflation multiplier.
- **Real Teams / Super League.** Needs the per-season club list (above). CPU sides can be built from that season's real squads once spells exist.
- **Position eligibility.** Positions move onto spells, so eligibility is evaluated against the player's position *that season*.
- **Multiplayer / persistence.** The chosen season or preset (and, for range presets, the rolled season per player) is part of the `draft` object and must be serialised. **Snapshot each signed player's season stats into the draft** so a saved game or online room doesn't change when the master data is edited. That matters even more for Career Mode saves, so consider a `dataVersion` stamp on saves.
- **Club Tenets.** Era-based tenets read the preset; everything else is unchanged.

## Tests

The season maths is where bugs will hide (end-year convention, calendar-date imports, `years` start-year migration). Add a small automated test suite of **known facts** that must always hold, e.g.:

- Rooney is at Everton in `2003`, Man Utd in `2005`, not active in `2019` (he was in MLS).
- Gerrard is active in `1999`, aged 18 at the start of 1998/99.
- Henry is at Juventus in `1999`, Arsenal in `2000`.
- Wenger manages Arsenal in `1999`; Pochettino isn't available in `1999`.
- Round-trip: phase 0's export reproduces today's `players.js` exactly.

Run them on every import and build.

## Build phases

Each phase stands on its own, so it's safe to stop after any of them.

0. **Pipeline + convention.** Sheet → export → build, reproducing today's `players.js` exactly. Adopt the end-year season convention. Add the coverage script.
1. **Career windows + season picker.** Script spells from Wikidata (attach `wikidataId` to every card, with at minimum first/last season in a top-5 league). Manager active windows. Ship the single-season picker, era presets and the `Age:` field using current ratings. Merge the multi-card players into identities. Known-facts tests in place.
2. **Curves + reputation.** Position ageing curves plus keyframes, starting with T1/T2. Value driven by reputation, and CPU picks by reputation. Range presets roll a season per player. Season flavour lines (can start any time; content, not code).
3. **Money.** Inflation multiplier table (display layer) and the `wage` field, which unblocks FFP/Wages.
4. **Clubs.** Full club spells (incl. loans) and the per-season club list. Manager club spells. Historical Real Teams squads.
5. **Depth fill.** Add mid-tier squad players where the coverage report shows gaps, starting with early seasons, full-backs and CAMs.

Then **Career Mode** builds on top: start in a chosen season, players age along their curves, and the inflation multiplier rises season to season.

## Open questions before build

- ~~Range presets~~: decided, roll one season per player.
- ~~Scout Mode + thin season pools~~: decided, upstream filter plus auto-widen to ±1 season.
- **Legends:** All-seasons only, or keep their current behaviour?
- **Inflation index:** build our own from top-N fees per season, or follow the TPI method?
- **Tuning values:** reputation decay rate, youth reputation lag, per-position ageing curves. Playtest these, not spec decisions.
- **Bundle strategy:** one composed module or per-season JSON files (Claude Code's call after measuring).
- **Data entry help:** how much of phases 1–2 can Claude Code script a first pass of (e.g. drafting spells from Wikipedia career tables, generating default curves from `birthYear` + peak card) for Rich to review in the sheet?

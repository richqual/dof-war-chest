# Data Model

Back to [[The Transfer Wheel]]. Related: [[Architecture]], [[State & Persistence]].

## Players — `src/data/players.js`
~1,300 player cards. **One card per player = their peak/iconic spell.** Shape:

```js
{
  id: 12, name: "Alisson Becker", club: "Liverpool", years: "2018–",
  pos: "GK", rating: 93, tier: "T1",
  valueMin: 46, valueMax: 77,               // transfer-value range (£m)
  pac: 66, sho: 16, pas: 76, dri: 30, def: 44, phy: 75,  // FIFA-style attributes
  nation: "🇧🇷", era: "modern",             // classic | golden | modern
  league: "premier_league", archetype: "Sweeper Keeper"
}
```

Key fields:
- **`rating` / `tier`** (T1–T5) — overall quality; drives value and CPU picks.
- **`valueMin`/`valueMax`** — actual signing cost varies in this band (randomised per game via `randomizePlayerValues`).
- **`era`** — `classic` / `golden` / `modern`. Same real player can appear once per era, but **must share an identical name string** or dedup (`dedupeByName` / `selectGamePlayers`) fails and they both show up in one game. Watch for `"X"` vs `"X Jr"` splits.
- **`archetype`** — playstyle label, colour-coded in UI.

Helpers exported: `normalizeSearch` (strips diacritics for search), `generateBudget`, `chooseCpuPick`, `SUB_POSITIONS`.

> Display names: use `lastName()` from `src/utils/displayName.js` for compact tokens — it handles "Jr" suffixes and "van/ten" particles without touching stored data.

## Managers — `src/data/managers.js`
~127 managers / Directors of Football, drafted in `ManagerDraftScreen`. Manager timing (`before`/`after` the squad draft) is set in options.

## Formations — `src/data/formations.js`
- `FORMATION_LIST` / `FORMATIONS` — each formation's slot layout (positions + pitch coordinates for the SVG diagram).
- `FORMATION_DISPLAY_ORDER`, `GROUP_SLOT_INDICES` — ordering/grouping of slots.
- `GROUP_ORDER = ["GK","DEF","MID","ATT"]`, `GROUP_LABELS`, `GROUP_COLORS` — position groups and their colours.

## The `draft` object (runtime state)
Built by `buildInitialDraft` (or `buildInitialWarChestDraft`) in `draftUtils.js`. It is the **single source of truth** for a game — everything needed to render any screen and resume later. Broadly holds:
- `clubs` / players per club, formations, pick order, current position/turn pointers
- budget/war-chest economy, assigned managers
- `series` (format, stage, brackets, goals, legs, winner) for competition
- flags/options (difficulty, real teams, draft roulette, manager timing)

It is serialized (`serializeDraft`) for both **localStorage** and **Firestore**. See [[State & Persistence]] and [[Multiplayer]].

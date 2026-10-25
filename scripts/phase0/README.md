# Season Pool — Phase 0 pipeline

The player master now lives in a flat CSV that a Google Sheet will eventually
export. The deployed app only ever imports a committed, generated JS module —
no CSV parsing or network at runtime. See `docs/obsidian/Season Pool Spec.md`.

## Flow

```
src/data/players.source.csv      ← master (edit here, or export from the Sheet)
        │  npm run data:build
        ▼
src/data/players.generated.js    ← committed build output (the app imports this)
        │  npm run data:verify
        ▼
scripts/phase0/players.golden.json   ← frozen v5.0.0 baseline; round-trip must match
```

`src/data/players.js` re-exports `PLAYERS` from the generated module and still
owns all the functions/constants (chooseCpuPick, WAR_CHEST_VALUES, …).

## Editing a player

1. Edit `src/data/players.source.csv` (one row per card; columns are fixed —
   see `players-codec.mjs`).
2. `npm run data:build` to regenerate `players.generated.js`.
3. Commit both the CSV and the generated file.

## Scripts

| Command | What it does |
|---|---|
| `npm run data:build` | CSV master → `players.generated.js` |
| `npm run data:verify` | round-trip gate: generated must equal the golden baseline |
| `npm run coverage` | season × position coverage (`--all`, `--strict`) |
| `npm run test:season` | unit tests for `src/utils/season.js` |
| `npm run phase0` | build + verify + season tests + coverage |
| `npm run data:extract` | one-off: regenerate CSV + golden from `players.js` (not normally run) |

## Note on the golden baseline

`players.golden.json` is "today's data at v5.0.0". `data:verify` proves the
pipeline reproduces it **exactly** — it's the Phase 0 no-change gate. Once real
data edits begin (Phase 1+), intentional changes to the data will make this
differ by design; re-baseline it deliberately (`npm run data:extract`) when a
data change is meant to land, rather than leaving it wired into every build.

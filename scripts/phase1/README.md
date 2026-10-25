# Phase 1 scripts — Season Pool career windows

Phase 1 adds, per player identity, a permanent Wikidata key and a career window,
and ships the single-season picker. The data columns (additive to the Phase-0
master) are:

| Column        | Type   | Source                    |
|---------------|--------|---------------------------|
| `wikidataId`  | string | Wikidata Q-ID (identity)  |
| `birthYear`   | number | Wikidata P569             |
| `firstSeason` | number | top-5 career start (end-year) |
| `lastSeason`  | number | top-5 career end (end-year)   |

All four are optional — unmatched identities simply keep none and gate by their
legacy `years` spell, exactly as before.

## Pipeline

```
Google Sheet  ──(data:export)──►  players.source.csv  ──(data:build)──►  players.generated.js
     ▲                                     │
     └──────────(data:populate)────────────┘
```

- `npm run enrich` — query Wikidata and write `wikidataId`/`birthYear`/
  `firstSeason`/`lastSeason` into `players.source.csv`. Resumable: results are
  cached in `wikidata-cache.json`, so re-runs only query new names. No auth.
- `npm run data:populate` — push `players.source.csv` up to the Sheet (adds a
  `source` review column; keeps existing `checked`/`manual` marks). **Needs auth.**
- `npm run data:export` — pull the Sheet back down into `players.source.csv`
  (strips `source`). **Needs auth.** Follow with `npm run data:build && npm run data:verify`.
- `npm run data:build` / `data:verify` — Phase-0 steps, unchanged. The round-trip
  gate now anchors on the original 21 columns, so the additive Phase-1 columns
  ride free; a change to any original field still fails it.

## Auth (one-time, for export/populate only)

`enrich` needs nothing. The Sheet steps use a **service account**:

1. In Google Cloud, create a service account and a JSON key; enable the Google
   Sheets API for the project.
2. Share the master sheet
   (`1US8-r3Dh9QmPnQHMgWKhLqOM5ijpKES9bcs2fNAVHZ0`) with the service account's
   email — Viewer for `data:export`, Editor for `data:populate`.
3. Point the scripts at the key:
   ```bash
   export GOOGLE_SHEETS_KEY_FILE=/absolute/path/to/service-account.json
   ```
   (`GOOGLE_APPLICATION_CREDENTIALS` is also accepted.) Never commit the key.

Auth uses `google-auth-library` (already in the dependency tree) + the Sheets
REST API — no extra install.

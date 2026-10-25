// Phase 1 — export step: Google Sheet master → src/data/players.source.csv.
//
// The Sheet is the editable source of truth; this pulls it into the committed
// CSV that the Phase-0 build turns into players.generated.js. The Sheet's review
// column (`source`: script/checked/manual) is stripped here — it's review
// metadata, not game data. After exporting, run `npm run data:build` and
// `npm run data:verify`.
//
// Needs a service-account key — see scripts/phase1/README.md. (The one-time bulk
// upload the other direction is populate-sheet.mjs.)
//
// Usage: node scripts/phase1/export-sheet.mjs
import { writeFileSync } from "node:fs";
import { COLS, NUMERIC_COLS, OPTIONAL_COLS, toCsv } from "../phase0/players-codec.mjs";
import { getValues, TAB } from "./sheets-client.mjs";

const CSV = new URL("../../src/data/players.source.csv", import.meta.url);

const rows = await getValues(`${TAB}!A1:ZZ`);
if (!rows.length) throw new Error("Sheet is empty — nothing to export.");

const header = rows[0];
const colIndex = Object.fromEntries(header.map((h, i) => [h, i]));
for (const c of COLS) {
  if (!(c in colIndex)) throw new Error(`Sheet header is missing column "${c}".`);
}

const players = [];
for (let r = 1; r < rows.length; r++) {
  const cells = rows[r];
  if (!cells || cells.every((c) => c === "" || c == null)) continue; // skip blank rows
  const p = {};
  for (const col of COLS) {
    const raw = cells[colIndex[col]];
    if (OPTIONAL_COLS.has(col) && (raw === undefined || raw === "")) continue;
    p[col] = NUMERIC_COLS.has(col) ? Number(raw) : String(raw ?? "");
  }
  players.push(p);
}

writeFileSync(CSV, toCsv(players));
console.log(`Exported ${players.length} rows → src/data/players.source.csv`);
console.log("Next: npm run data:build && npm run data:verify");

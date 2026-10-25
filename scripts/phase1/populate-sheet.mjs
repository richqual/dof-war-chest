// Phase 1 — populate step: src/data/players.source.csv → the Google Sheet master.
//
// Writes the CSV into the `players` tab as the 25 data columns plus a `source`
// review column. Honours the spec's review rule: a row the Sheet already marks
// `checked` or `manual` keeps that mark (and is NOT touched beyond re-asserting
// its data); only `script`/blank rows are (re)written as `script`. Match is by
// the stable `id` column.
//
// This is the committed, credentialed version of the one-time bulk upload. Needs
// a service-account key with Editor access — see scripts/phase1/README.md.
//
// Usage: node scripts/phase1/populate-sheet.mjs
import { readFileSync } from "node:fs";
import { COLS, parseCsvByHeader } from "../phase0/players-codec.mjs";
import { getValues, updateValues, TAB } from "./sheets-client.mjs";

const CSV = new URL("../../src/data/players.source.csv", import.meta.url);
const SHEET_COLS = [...COLS, "source"];          // data columns + review marker
const PROTECTED = new Set(["checked", "manual"]); // never downgraded by an import

const players = parseCsvByHeader(readFileSync(CSV, "utf8"));

// Preserve existing review marks, keyed by id.
const existing = await getValues(`${TAB}!A1:ZZ`);
const prevSource = {};
if (existing.length) {
  const h = Object.fromEntries(existing[0].map((c, i) => [c, i]));
  if (h.id != null && h.source != null) {
    for (let r = 1; r < existing.length; r++) {
      const id = existing[r][h.id];
      if (id) prevSource[String(id)] = existing[r][h.source] || "";
    }
  }
}

const cell = (v) => (v === undefined || v === null ? "" : String(v));
const rows = [SHEET_COLS];
for (const p of players) {
  const prev = prevSource[String(p.id)];
  const source = PROTECTED.has(prev) ? prev : "script";
  rows.push(SHEET_COLS.map((c) => (c === "source" ? source : cell(p[c]))));
}

await updateValues(`${TAB}!A1`, rows);
const kept = Object.values(prevSource).filter((s) => PROTECTED.has(s)).length;
console.log(`Populated ${players.length} rows into the "${TAB}" tab (${kept} checked/manual marks preserved).`);

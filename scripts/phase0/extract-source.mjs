// Phase 0 — one-time extraction of the player master out of the hand-written
// src/data/players.js array into the committed CSV master + a frozen golden
// snapshot.
//
// After Phase 0 the CSV (eventually a Google Sheet export) is the source of
// truth and this script is not re-run. The golden snapshot is the fixed
// reference the round-trip test (verify-players.mjs) asserts against, so it
// captures "today's players.js" before the array is rewired to the pipeline.
//
// Usage: node scripts/phase0/extract-source.mjs
import { writeFileSync } from "node:fs";
import { PLAYERS } from "../../src/data/players.js";
import { toCsv, assertCsvSafe } from "./players-codec.mjs";

assertCsvSafe(PLAYERS);

const csvPath = new URL("../../src/data/players.source.csv", import.meta.url);
const goldenPath = new URL("./players.golden.json", import.meta.url);

writeFileSync(csvPath, toCsv(PLAYERS));
writeFileSync(goldenPath, JSON.stringify(PLAYERS, null, 0) + "\n");

console.log(`Extracted ${PLAYERS.length} cards`);
console.log(`  → src/data/players.source.csv   (master)`);
console.log(`  → scripts/phase0/players.golden.json (round-trip reference)`);

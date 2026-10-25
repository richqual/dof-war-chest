// Phase 0 — build step: CSV master -> generated JS module the app imports.
//
// Reads src/data/players.source.csv and writes src/data/players.generated.js
// (one card object per line, so git diffs stay row-aligned with the CSV).
// src/data/players.js imports PLAYERS from the generated module. The deployed
// app only ever sees this committed static output — no CSV parsing at runtime.
//
// Usage: node scripts/phase0/build-players.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "./players-codec.mjs";

const csvPath = new URL("../../src/data/players.source.csv", import.meta.url);
const outPath = new URL("../../src/data/players.generated.js", import.meta.url);

const players = parseCsv(readFileSync(csvPath, "utf8"));

const body = players.map((p) => "  " + JSON.stringify(p) + ",").join("\n");
const out =
  "// GENERATED FILE — do not edit by hand.\n" +
  "// Source: src/data/players.source.csv  ·  Build: scripts/phase0/build-players.mjs\n" +
  "// Run `npm run data:build` after editing the CSV master.\n" +
  "export const PLAYERS = [\n" + body + "\n];\n";

writeFileSync(outPath, out);
console.log(`Built src/data/players.generated.js from ${players.length} CSV rows`);

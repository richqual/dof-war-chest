// Phase 0 — round-trip test: the built module must reproduce today's player
// data EXACTLY. Compares src/data/players.generated.js against the frozen
// golden snapshot (captured from the original hand-written players.js).
//
// This is the gate for the whole Season Pool pipeline: CSV -> build -> module
// may never silently change the data. Run it on every build.
//
// Usage: node scripts/phase0/verify-players.mjs   (exit 1 on any drift)
import { readFileSync } from "node:fs";
import { PLAYERS as generated } from "../../src/data/players.generated.js";
import { diffPlayers } from "./players-codec.mjs";

const golden = JSON.parse(readFileSync(new URL("./players.golden.json", import.meta.url), "utf8"));

const diff = diffPlayers(golden, generated);
if (diff) {
  console.log(`FAIL  round-trip drift (${golden.length} golden vs ${generated.length} generated)`);
  console.log("  " + diff);
  process.exit(1);
}
console.log(`ok  round-trip exact: ${generated.length} cards reproduce players.golden.json`);

// Phase 0 — season × position coverage report.
//
// For each season it counts how many DISTINCT players (deduped by name, the way
// selectGamePlayers builds a game pool) are active, broken down by position.
// Run it every phase and fail the build if a position in a wanted season drops
// below the floor the modes need — that's how we catch "nobody can fill LM in
// 1999" before it ships a dead draft.
//
// Position intake folds in the eligibility that already exists in
// src/data/formations.js: the scarce wide-mid slots draw from their same-side
// winger (RM←RW, LM←LW), so those are counted with the wingers that can fill
// them — otherwise the report flags a shortage the game already covers. A
// card's pos2 also counts toward that position.
//
// NOTE: active-in-season is read from the legacy `years` spell at face value
// (one club spell, not a full career), so this UNDERCOUNTS — exactly as the
// spec warns. Real per-season spells arrive in Phase 1; the mechanism and the
// thresholds are what Phase 0 locks in.
//
// Usage: node scripts/phase0/coverage.mjs [--all] [--strict]
import { PLAYERS } from "../../src/data/players.js";
import { parseYearsRange, seasonLabel, allSeasons, LATEST_SEASON } from "../../src/utils/season.js";

const args = new Set(process.argv.slice(2));
const ALL = args.has("--all");
const STRICT = args.has("--strict");

// Minimum draftable players per position per season before we warn. 8 ≈ the
// Scout surplus floor; tune as the mode-demand maths firms up.
const THIN = 8;

// Positions reported, in pitch order.
const POSITIONS = ["GK", "RB", "CB", "LB", "DM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST"];

// Which raw positions feed each reported slot (see header). Same-side only.
const INTAKE = { RM: ["RM", "RW"], LM: ["LM", "LW"] };
const intakeFor = (slot) => INTAKE[slot] ?? [slot];

// One identity per name (matches the game's dedupe-by-name pool build).
const byName = new Map();
for (const p of PLAYERS) {
  if (!byName.has(p.name)) byName.set(p.name, []);
  byName.get(p.name).push(p);
}

// A name is active in season S if ANY of its cards' `years` spans S.
function activeInSeason(cards, season) {
  return cards.some((c) => {
    const r = parseYearsRange(c.years);
    if (!r) return false;
    const to = r.to ?? LATEST_SEASON;
    return season >= r.from && season <= to;
  });
}

// Does a name field a given slot that season (via pos/pos2 + intake)?
function fillsSlot(cards, slot, season) {
  const wanted = intakeFor(slot);
  return cards.some((c) => {
    const r = parseYearsRange(c.years);
    if (!r) return false;
    const to = r.to ?? LATEST_SEASON;
    if (season < r.from || season > to) return false;
    return wanted.includes(c.pos) || (c.pos2 && wanted.includes(c.pos2));
  });
}

const seasons = ALL ? allSeasons() : [1999, 2000, 2005, 2010, 2015, 2020, 2026];

const header = ["Season", "Active", ...POSITIONS];
console.log(header.map((h) => h.padStart(h === "Season" ? 7 : 6)).join(" "));

let thinCount = 0;
for (const s of seasons) {
  let active = 0;
  const perPos = {};
  for (const cards of byName.values()) {
    if (activeInSeason(cards, s)) active++;
  }
  for (const slot of POSITIONS) {
    let n = 0;
    for (const cards of byName.values()) if (fillsSlot(cards, slot, s)) n++;
    perPos[slot] = n;
  }
  const cells = [
    seasonLabel(s).padStart(7),
    String(active).padStart(6),
    ...POSITIONS.map((slot) => {
      const n = perPos[slot];
      if (n < THIN) thinCount++;
      return (n < THIN ? `*${n}` : String(n)).padStart(6);
    }),
  ];
  console.log(cells.join(" "));
}

console.log(`\n(* = below the thin floor of ${THIN} draftable players; ${thinCount} slot-seasons flagged)`);
console.log("RM/LM counts include same-side wingers (RW/LW) per formations.js eligibility.");

if (STRICT && thinCount > 0) {
  console.log(`\nFAIL (--strict): ${thinCount} slot-seasons below the floor.`);
  process.exit(1);
}

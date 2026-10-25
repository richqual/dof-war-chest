// Phase 0 — unit tests for the season-convention helpers (src/utils/season.js).
// The season maths is where off-by-one bugs hide (end-year convention, the
// legacy start-year `years` strings, 2-digit ends, open-ended spells), so the
// edge cases are pinned here. Usage: node scripts/phase0/season-check.mjs
import {
  seasonLabel, seasonShort, seasonFromLabel, expandTwoDigitYear,
  parseYearsRange, eraForSeason, allSeasons, FIRST_SEASON, LATEST_SEASON,
} from "../../src/utils/season.js";

let pass = 0, fail = 0;
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}\n        got:  ${g}\n        want: ${w}`); }
}

console.log("\n── seasonLabel (end-year → 'YYYY/YY') ──");
check("1999 = 1998/99", seasonLabel(1999), "1998/99");
check("2000 = 1999/00", seasonLabel(2000), "1999/00");  // century roll in the label
check("2026 = 2025/26", seasonLabel(2026), "2025/26");

console.log("\n── seasonShort ──");
check("1999 → '99", seasonShort(1999), "'99");
check("2000 → '00", seasonShort(2000), "'00");

console.log("\n── seasonFromLabel (inverse) ──");
check("1998/99 → 1999", seasonFromLabel("1998/99"), 1999);
check("1999/00 → 2000", seasonFromLabel("1999/00"), 2000);
check("2025/26 → 2026", seasonFromLabel("2025/26"), 2026);
check("round-trips all seasons", allSeasons().every(y => seasonFromLabel(seasonLabel(y)) === y), true);

console.log("\n── expandTwoDigitYear ──");
check("1991 + 99 → 1999", expandTwoDigitYear(1991, 99), 1999);
check("1999 + 00 → 2000", expandTwoDigitYear(1999, 0), 2000);   // crosses century
check("2005 + 11 → 2011", expandTwoDigitYear(2005, 11), 2011);

console.log("\n── parseYearsRange (legacy start-year spells) ──");
check("1991–99", parseYearsRange("1991–99"), { from: 1991, to: 1999, open: false });
check("2005–11", parseYearsRange("2005–11"), { from: 2005, to: 2011, open: false });
check("1996–2018 (4-digit end)", parseYearsRange("1996–2018"), { from: 1996, to: 2018, open: false });
check("2018– (open-ended)", parseYearsRange("2018–"), { from: 2018, to: null, open: true });
check("hyphen also accepted", parseYearsRange("2005-11"), { from: 2005, to: 2011, open: false });
check("garbage → null", parseYearsRange("n/a"), null);

console.log("\n── eraForSeason (presets) ──");
check("1999 → classic", eraForSeason(1999), "classic");
check("2008 → classic (boundary)", eraForSeason(2008), "classic");
check("2009 → golden (boundary)", eraForSeason(2009), "golden");
check("2017 → modern (boundary)", eraForSeason(2017), "modern");
check("1998 → null (pre-pool)", eraForSeason(1998), null);

console.log("\n── range sanity ──");
check("FIRST_SEASON = 1999", FIRST_SEASON, 1999);
check("LATEST_SEASON = 2026", LATEST_SEASON, 2026);
check("allSeasons length = 28", allSeasons().length, 28);

console.log(`\n${fail ? "FAILED" : "ALL PASS"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

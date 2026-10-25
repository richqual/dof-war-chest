// Season-convention helpers for the Season Pool system.
//
// CONVENTION: a season is stored as its END year. `1999` means the 1998/99
// season ("the 99 season"). This is the one place the end-year convention is
// defined; everything else should go through these helpers rather than doing
// year maths inline, because the start-year-vs-end-year mismatch (below) is the
// main source of off-by-one bugs in this whole project.

export const FIRST_SEASON = 1999; // 1998/99 — earliest season in the pool
export const LATEST_SEASON = 2026; // 2025/26 — "today" / inflation anchor

// 1999 -> "1998/99", 2000 -> "1999/00", 2026 -> "2025/26".
export function seasonLabel(endYear) {
  const start = String(endYear - 1);
  const end = String(endYear).slice(2).padStart(2, "0");
  return `${start}/${end}`;
}

// 1999 -> "'99", 2000 -> "'00". Space-tight short form.
export function seasonShort(endYear) {
  return "'" + String(endYear).slice(2).padStart(2, "0");
}

// "1998/99" -> 1999. Inverse of seasonLabel; tolerant of the short "99" form.
export function seasonFromLabel(label) {
  const [startStr, endStr] = String(label).split("/");
  const start = Number(startStr);
  // Resolve a 2-digit end into the right century from the start year.
  const end = endStr.length === 2 ? expandTwoDigitYear(start, Number(endStr)) : Number(endStr);
  return end;
}

// Expand a 2-digit year written after a 4-digit start into a full year,
// rolling the century when the end digits are smaller (e.g. 1991–99 -> 1999,
// 1999–00 -> 2000, 2005–11 -> 2011).
export function expandTwoDigitYear(startYear, twoDigit) {
  const century = Math.floor(startYear / 100) * 100;
  let full = century + twoDigit;
  if (full < startYear) full += 100; // crossed into the next century
  return full;
}

// Parse a legacy `years` spell string into { from, to, open }.
//
// The current data writes `years` in START years with a 2-digit end and an
// open-ended current spell: "1991–99", "2005–11", "1996–2018", "2018–".
// Accepts both the en-dash "–" and a plain hyphen "-".
//   "1991–99"   -> { from: 1991, to: 1999, open: false }
//   "2005–11"   -> { from: 2005, to: 2011, open: false }
//   "1996–2018" -> { from: 1996, to: 2018, open: false }
//   "2018–"     -> { from: 2018, to: null, open: true }
export function parseYearsRange(years) {
  const m = String(years).trim().match(/^(\d{4})\s*[–-]\s*(\d{2,4})?$/);
  if (!m) return null;
  const from = Number(m[1]);
  if (m[2] === undefined) return { from, to: null, open: true };
  const to = m[2].length === 2 ? expandTwoDigitYear(from, Number(m[2])) : Number(m[2]);
  return { from, to, open: false };
}

// All end-year seasons in [FIRST_SEASON, LATEST_SEASON].
export function allSeasons() {
  const out = [];
  for (let y = FIRST_SEASON; y <= LATEST_SEASON; y++) out.push(y);
  return out;
}

// Era presets over the end-year convention (see Season Pool Spec).
export const ERA_PRESETS = {
  classic: { from: 1999, to: 2008 },
  golden: { from: 2009, to: 2016 },
  modern: { from: 2017, to: 2026 },
};

// Which preset an end-year season falls in ("classic" | "golden" | "modern"),
// or null if outside. Replaces the hand-entered `era` field once seasons land.
export function eraForSeason(endYear) {
  for (const [key, { from, to }] of Object.entries(ERA_PRESETS)) {
    if (endYear >= from && endYear <= to) return key;
  }
  return null;
}

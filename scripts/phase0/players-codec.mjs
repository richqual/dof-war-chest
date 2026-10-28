// Phase 0 — player data codec (shared by extract / build / verify).
//
// Defines the single, explicit column schema for the player master and the
// CSV ⇄ object conversions. This is the contract a Google Sheet tab will
// export to: one row per card, these columns, in this order. Keeping the codec
// in one place is what lets the round-trip be provably exact.
//
// All 1,338 current cards use 19 core keys; `pos2` and `nationality_code` are
// optional. No string field contains a comma, double-quote, newline or tab
// (asserted at extract time), so a trivial split/join CSV is safe — no quoting.

export const COLS = [
  "id", "name", "club", "years", "pos", "pos2", "rating", "tier",
  "valueMin", "valueMax", "pac", "sho", "pas", "dri", "def", "phy",
  "nation", "era", "league", "archetype", "nationality_code",
  // Phase 1 — Season Pool identity + career-window columns (additive).
  // All optional: a card only carries them once Wikidata enrichment matches it.
  "wikidataId", "birthYear", "firstSeason", "lastSeason",
  // Growth type — per-player career shape (early/late/evergreen/fragile),
  // additive + optional. Absent → "standard" (the plain position curve).
  "growth",
];

// The original Phase-0 column set (the 21 that reproduce today's players.js).
// The round-trip anchor compares on these; see diffOriginalCols below.
export const ORIGINAL_COLS = COLS.slice(0, 21);

// Columns stored as numbers (everything else is a string).
export const NUMERIC_COLS = new Set([
  "id", "rating", "valueMin", "valueMax", "pac", "sho", "pas", "dri", "def", "phy",
  "birthYear", "firstSeason", "lastSeason",
]);

// Columns that may be absent on a card. An empty cell means "key omitted"
// (not stored as "" / undefined), so the round-trip matches today's objects
// exactly — today's cards simply don't carry these keys when unused.
export const OPTIONAL_COLS = new Set([
  "pos2", "nationality_code",
  "wikidataId", "birthYear", "firstSeason", "lastSeason",
  "growth",
]);

const FORBIDDEN = /[",\n\r\t]/; // chars that would break the simple CSV

// Raise if any string value would need CSV quoting. Keeps the format honest:
// if data ever gains a comma, this fails loudly rather than corrupting a row.
export function assertCsvSafe(players) {
  for (const p of players) {
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === "string" && FORBIDDEN.test(v)) {
        throw new Error(`Value for "${k}" on id ${p.id} needs CSV quoting: ${JSON.stringify(v)}`);
      }
    }
  }
}

// players[] -> CSV text (header + one row per card, cards in array order).
export function toCsv(players) {
  assertCsvSafe(players);
  const lines = [COLS.join(",")];
  for (const p of players) {
    lines.push(COLS.map((c) => (p[c] === undefined ? "" : String(p[c]))).join(","));
  }
  return lines.join("\n") + "\n";
}

// CSV text -> players[]. Builds each object in COLS order, coercing numeric
// columns and omitting optional columns whose cell is empty.
export function parseCsv(text) {
  const rows = text.replace(/\n+$/, "").split("\n");
  const header = rows[0].split(",");
  if (header.join(",") !== COLS.join(",")) {
    throw new Error(`CSV header does not match schema.\n  got:    ${header.join(",")}\n  expect: ${COLS.join(",")}`);
  }
  const players = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(",");
    const p = {};
    COLS.forEach((col, j) => {
      const raw = cells[j];
      if (OPTIONAL_COLS.has(col) && (raw === undefined || raw === "")) return; // omit key
      p[col] = NUMERIC_COLS.has(col) ? Number(raw) : raw;
    });
    players.push(p);
  }
  return players;
}

// Header-driven loose parse: reads a CSV by matching cell positions to the
// header row's names, tolerant of column count/order (so it works on both the
// legacy 21-col master and the Phase-1 25-col one). Used by migration /
// enrichment scripts to read whatever is on disk; the strict parseCsv above
// stays the gate for the committed master.
export function parseCsvByHeader(text) {
  const rows = text.replace(/\n+$/, "").split("\n");
  const header = rows[0].split(",");
  const players = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(",");
    const p = {};
    header.forEach((col, j) => {
      const raw = cells[j];
      if (!COLS.includes(col)) return;            // ignore unknown columns (e.g. a sheet `source` col)
      if (OPTIONAL_COLS.has(col) && (raw === undefined || raw === "")) return;
      p[col] = NUMERIC_COLS.has(col) ? Number(raw) : raw;
    });
    players.push(p);
  }
  return players;
}

// Anchor comparison: the ORIGINAL 21 columns must still reproduce the golden
// snapshot exactly. Phase-1 additive columns are ignored here so the round-trip
// gate keeps protecting the original data without a re-baseline. Returns null
// if identical, else the first difference.
export function diffOriginalCols(golden, generated) {
  if (golden.length !== generated.length) return `length ${golden.length} vs ${generated.length}`;
  const pick = (o) => Object.fromEntries(ORIGINAL_COLS.filter((c) => c in o).map((c) => [c, o[c]]));
  const norm = (o) => JSON.stringify(Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]])));
  for (let i = 0; i < golden.length; i++) {
    const na = norm(pick(golden[i])), nb = norm(pick(generated[i]));
    if (na !== nb) return `row ${i} (id ${golden[i].id ?? "?"}):\n    golden:    ${na}\n    generated: ${nb}`;
  }
  return null;
}

// Order-independent deep comparison of two player arrays. Returns null if
// identical, else a human-readable description of the first difference.
export function diffPlayers(a, b) {
  if (a.length !== b.length) return `length ${a.length} vs ${b.length}`;
  const norm = (o) => JSON.stringify(Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]])));
  for (let i = 0; i < a.length; i++) {
    const na = norm(a[i]), nb = norm(b[i]);
    if (na !== nb) return `row ${i} (id ${a[i].id ?? "?"}):\n    golden:    ${na}\n    generated: ${nb}`;
  }
  return null;
}

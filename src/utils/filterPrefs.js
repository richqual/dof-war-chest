// Per-player draft filter/sort preferences.
//
// In pass-and-play the DraftScreen is a single component instance shared by
// every manager, so one player's filters used to bleed onto the next player's
// turn. We persist each human player's cross-cutting preferences (era / league /
// tier filters + sort) keyed by their identity, and swap them back in whenever
// the active manager changes. Stored in localStorage so a player's preferences
// also survive across games and sessions.
//
// Position and archetype filters are intentionally NOT persisted here — they're
// contextual to the slot on the clock and already reset per position.

const STORE_KEY = "tg-filter-prefs";

// Only these fields are treated as player preferences.
const DEFAULT_PREFS = {
  filterEra: ["classic", "golden", "modern"],
  filterLeague: ["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1", "legends"],
  filterTiers: ["T1", "T2", "T3", "T4", "T5"],
  sortBy: "tier",
  sortDir: "asc",
};

export function defaultPrefs() {
  return {
    filterEra: new Set(DEFAULT_PREFS.filterEra),
    filterLeague: new Set(DEFAULT_PREFS.filterLeague),
    filterTiers: new Set(DEFAULT_PREFS.filterTiers),
    sortBy: DEFAULT_PREFS.sortBy,
    sortDir: DEFAULT_PREFS.sortDir,
  };
}

// A stable key for a human manager. CPUs return null (their filters are never
// persisted or restored). Falls back to the slot index if a manager is unnamed.
export function playerPrefKey(manager) {
  if (!manager || manager.isComputer) return null;
  const name = (manager.dofName || manager.name || "").trim().toLowerCase();
  return name ? `name:${name}` : `slot:${manager.id}`;
}

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

export function loadPrefs(key) {
  if (!key) return defaultPrefs();
  const saved = readStore()[key];
  if (!saved) return defaultPrefs();
  return {
    filterEra: new Set(saved.filterEra || DEFAULT_PREFS.filterEra),
    filterLeague: new Set(saved.filterLeague || DEFAULT_PREFS.filterLeague),
    filterTiers: new Set(saved.filterTiers || DEFAULT_PREFS.filterTiers),
    sortBy: saved.sortBy || DEFAULT_PREFS.sortBy,
    sortDir: saved.sortDir || DEFAULT_PREFS.sortDir,
  };
}

export function savePrefs(key, prefs) {
  if (!key) return;
  try {
    const store = readStore();
    store[key] = {
      filterEra: [...prefs.filterEra],
      filterLeague: [...prefs.filterLeague],
      filterTiers: [...prefs.filterTiers],
      sortBy: prefs.sortBy,
      sortDir: prefs.sortDir,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (private mode / quota) — preferences just won't persist.
  }
}

// Remembered game-setup preferences ("remember my preferences").
//
// The lobby screens (Classic + Scout) hold all their setup options as local
// state seeded from defaults, so every new game starts from scratch. If a
// player opts in, we persist their last-used setup to localStorage and seed
// the lobby from it next time — so, e.g., a sibling who always plays with Free
// Subs doesn't have to re-tick it every game.
//
// This is device-level (localStorage), which matches how the game is played:
// pass-and-play on one shared screen. Each lobby passes its own `namespace`
// ("classic" / "scout") so the two modes remember independent setups.
//
// Each stored entry is `{ remember, values }`. When `remember` is off we drop
// the saved values but keep the flag, so the toggle itself stays where the
// player left it.

const STORE_KEY = "tg-setup-prefs";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (private mode / quota) — prefs just won't persist.
  }
}

// Returns { remember, values } for a namespace. `values` is an object of the
// saved setup fields (empty when nothing has been remembered yet).
export function loadSetupPrefs(namespace) {
  const entry = readStore()[namespace];
  if (!entry || typeof entry !== "object") return { remember: false, values: {} };
  return {
    remember: !!entry.remember,
    values: (entry.values && typeof entry.values === "object") ? entry.values : {},
  };
}

// Persists the opt-in flag and (when opted in) the setup fields. Passing
// remember=false clears the stored values but keeps the flag off for next time.
export function saveSetupPrefs(namespace, remember, values) {
  const store = readStore();
  store[namespace] = { remember: !!remember, values: remember ? (values || {}) : {} };
  writeStore(store);
}

// Convenience: merge saved values over a defaults object, keeping only keys
// that exist in defaults (so a stale/renamed saved field can't leak through).
export function seededFrom(defaults, savedValues) {
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (savedValues && Object.prototype.hasOwnProperty.call(savedValues, key)) {
      out[key] = savedValues[key];
    }
  }
  return out;
}

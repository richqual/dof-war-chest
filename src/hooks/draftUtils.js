import { PLAYERS, POSITIONS, SUB_POSITIONS, generateBudget, chooseCpuPick, cpuVariancePick, WAR_CHEST_VALUES, WAR_CHEST_SLOTS, realTeamPlayerClubs } from "../data/players";
import { GROUP_SLOT_INDICES, FORMATIONS, slotEligibility } from "../data/formations";
import { cardWindow, activeInSeason, seasonValueBand, applySeasonStats, peakSeasonOf, activeSeasonsInRange, windowOverlaps, FIRST_SEASON, LATEST_SEASON } from "../utils/season";

export { generateBudget, chooseCpuPick, cpuVariancePick, WAR_CHEST_VALUES, WAR_CHEST_SLOTS };

// Draft Roulette pools — legends are excluded (pool too shallow for a hard restriction).
export const DRAFT_ROULETTE_ERAS = [
  { key: "classic", label: "Classic Era" },
  { key: "golden",  label: "Golden Era" },
  { key: "modern",  label: "Modern Era" },
];
export const DRAFT_ROULETTE_LEAGUES = [
  { key: "premier_league", label: "Premier League" },
  { key: "la_liga",        label: "La Liga" },
  { key: "serie_a",        label: "Serie A" },
  { key: "bundesliga",     label: "Bundesliga" },
  { key: "ligue_1",        label: "Ligue 1" },
];

export const POS_LABELS = {
  GK: "Goalkeeper", RB: "Right Back", LB: "Left Back", CB: "Centre Back",
  DM: "Def. Mid", CM: "Midfielder", MF: "Midfielder", CAM: "Att. Mid", AM: "Att. Mid",
  RW: "Right Winger", LW: "Left Winger", ST: "Striker",
  RM: "Right Mid", LM: "Left Mid",
};

export const CPU_POS_ACCEPTABLE = {
  GK:     ["GK"],
  CB:     ["CB"],                           // strict — no fullbacks at CB
  LB:     ["LB", "RB"],                     // fullbacks only — no CBs
  RB:     ["RB", "LB"],                     // fullbacks only — no CBs
  DM:     ["DM", "CM"],
  CM:     ["CM", "CAM", "DM", "LM", "RM"],
  CAM:    ["CAM", "CM", "RM", "LM", "LW", "RW"],
  RM:     ["RM", "RW", "CM", "CAM"],
  LM:     ["LM", "LW", "CM", "CAM"],
  LW:     ["LW", "LM", "RW", "RM", "CAM"],
  RW:     ["RW", "RM", "LW", "LM", "CAM"],
  ST:     ["ST", "LW", "RW", "CAM"],
  DEFSUB: ["RB", "LB", "CB"],
  MIDSUB: ["DM", "CM", "CAM"],
  WIDSUB: ["RM", "LM", "RW", "LW"],
  ATTSUB: ["ST"],
};

export const STORAGE_KEY = "transfer-game-state";
export const STORAGE_VERSION = 8;

export function formationEntry(formation, slotIndex) {
  return FORMATIONS[formation]?.[slotIndex] ?? { pos: POSITIONS[slotIndex]?.key ?? "MF" };
}

export function formationPos(formation, slotIndex) {
  return formationEntry(formation, slotIndex).pos;
}

// Firestore doesn't support nested arrays, so Maps are serialized as plain objects
// with string keys. Sets are serialized as flat arrays (fine for Firestore).
function mapToObj(map) {
  if (!(map instanceof Map)) return map;
  const obj = {};
  for (const [k, v] of map) obj[String(k)] = v;
  return obj;
}

function objToMap(val) {
  if (val instanceof Map) return val;
  // Array format: legacy localStorage saves use [[k,v], ...] — keep working
  if (Array.isArray(val)) return new Map(val.map(([k, v]) => [Number(k), v]));
  if (val && typeof val === "object") {
    return new Map(Object.entries(val).map(([k, v]) => [Number(k), v]));
  }
  return new Map();
}

export function serializeDraft(draft) {
  if (!draft) return draft;
  return {
    ...draft,
    availablePlayerIds: draft.availablePlayerIds instanceof Set
      ? [...draft.availablePlayerIds]
      : draft.availablePlayerIds,
    poolIds: draft.poolIds instanceof Set ? [...draft.poolIds] : draft.poolIds,
    playerValues: mapToObj(draft.playerValues),
    playerForm:   mapToObj(draft.playerForm),
    playerOrder:  mapToObj(draft.playerOrder),
    playerSeasons: mapToObj(draft.playerSeasons),
  };
}

export function deserializeDraft(draft) {
  if (!draft) return draft;
  return {
    ...draft,
    availablePlayerIds: Array.isArray(draft.availablePlayerIds)
      ? new Set(draft.availablePlayerIds)
      : draft.availablePlayerIds instanceof Set
        ? draft.availablePlayerIds
        : new Set(),
    poolIds: Array.isArray(draft.poolIds)
      ? new Set(draft.poolIds)
      : draft.poolIds instanceof Set
        ? draft.poolIds
        : undefined,
    playerValues: objToMap(draft.playerValues),
    playerForm:   objToMap(draft.playerForm),
    playerOrder:  objToMap(draft.playerOrder),
    playerSeasons: objToMap(draft.playerSeasons),
  };
}

// `rouletteAssignment` is the active manager's { era, league } from Draft Roulette
// (either field may be null if that axis wasn't randomised). Legends are always
// excluded once Draft Roulette is on, since their pool is too shallow to restrict.
function matchesRoulette(p, rouletteAssignment) {
  if (!rouletteAssignment) return true;
  const { era, league } = rouletteAssignment;
  if (!era && !league) return true;
  if (p.league === "legends") return false;
  if (era && p.era !== era) return false;
  if (league && p.league !== league) return false;
  return true;
}

export function availablePlayersFor(posKey, takenIds, rouletteAssignment, eligPool = null, freeSubs = false) {
  const taken = new Set(takenIds);
  if (posKey === "GKSUB") {
    return PLAYERS.filter(p => p.pos === "GK" && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
  }
  if (SUB_POSITIONS[posKey]) {
    // Free Subs (Classic advanced option): outfield bench slots become free hits —
    // any outfielder qualifies, not just the slot's usual position band. The sub
    // goalkeeper (GKSUB, handled above) is deliberately never freed.
    if (freeSubs) {
      return PLAYERS.filter(p => p.pos !== "GK" && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
    }
    return PLAYERS.filter(p => SUB_POSITIONS[posKey].includes(p.pos) && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
  }
  if (posKey === "GK") {
    return PLAYERS.filter(p => p.pos === "GK" && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
  }
  // Outfield starter: restrict to the slot's eligibility pool (hard pool) when
  // one is supplied. Falls back to "any outfielder" for callers without a slot
  // context (e.g. warm-up/edge paths).
  if (eligPool && eligPool.length) {
    return PLAYERS.filter(p => eligPool.includes(p.pos) && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
  }
  return PLAYERS.filter(p => p.pos !== "GK" && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
}

// Emergency position widening. In a thin single season the scarce wide roles
// (LM/RM/LW) can run out of players before every club has filled that slot, even
// after the normal LM←LW broadening. Rather than leave a slot empty, we widen to
// adjacent positions and sign an out-of-position stand-in (who plays with the
// OOP −5 match penalty). Ordered nearest-first.
const POS_FALLBACK = {
  RB:  ["RWB", "LB", "LWB", "CB", "RM", "RW"],
  LB:  ["LWB", "RB", "RWB", "CB", "LM", "LW"],
  RWB: ["RB", "LWB", "LB", "RM", "RW", "CB"],
  LWB: ["LB", "RWB", "RB", "LM", "LW", "CB"],
  CB:  ["LB", "RB", "LWB", "RWB", "DM"],
  DM:  ["CM", "CB", "CAM"],
  CM:  ["DM", "CAM", "LM", "RM"],
  CAM: ["CM", "DM", "RW", "LW", "ST"],
  RM:  ["RW", "RB", "RWB", "CM", "LM", "CAM"],
  LM:  ["LW", "LB", "LWB", "CM", "RM", "CAM"],
  RW:  ["RM", "LW", "ST", "CAM"],
  LW:  ["LM", "RW", "ST", "CAM"],
  ST:  ["CF", "RW", "LW", "CAM"],
  CF:  ["ST", "RW", "LW", "CAM"],
};
export const OUTFIELD_POSITIONS = ["RB", "RWB", "CB", "LB", "LWB", "DM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST", "CF"];
// The slot's own position plus its nearest cover, for widening when exhausted.
export function widenedEligPool(posKey) {
  const fb = POS_FALLBACK[posKey];
  return fb ? [...new Set([posKey, ...fb])] : null;
}

// The single source of truth for what a player costs. No entry in PLAYERS has a
// `value` field — only a valueMin..valueMax band — so without the midpoint
// fallback every value is `undefined` whenever Value for Money is off, nothing
// is ever affordable, and the draft cannot be completed. Scout already did this;
// Classic didn't.
export function resolveValue(playerValues, p) {
  const dynamic = playerValues instanceof Map ? playerValues.get(p.id) : undefined;
  return dynamic ?? p.value ?? Math.round(((p.valueMin ?? 0) + (p.valueMax ?? 0)) / 2);
}

// The eligibility pool (array of acceptable pos strings) for the pick currently
// on the clock, or null when the slot has no formation-based pool (GK is handled
// by its own branch, subs by SUB_POSITIONS, War Chest not at all).
export function currentEligPool(d) {
  if (!d || d.warChest) return null;
  const slotIndex = (d.positionMode === "random" && d.positionIndex < 11 && d.currentSlot !== null && d.currentSlot !== undefined)
    ? d.currentSlot
    : d.positionIndex;
  if (slotIndex === null || slotIndex === undefined || slotIndex >= 11) return null;
  const e = slotEligibility(activeFormation(d), slotIndex);
  return e ? e.pool : null;
}

// Roll a CPU's budget, keeping the RAW wheel value alongside the spendable
// total. Without this the two are indistinguishable downstream, and a spin
// plus a big carryover reads as an impossible wheel result on the draw board.
export function rollBudget(d, carry) {
  // Bench rounds spin nothing — the sub fund IS the budget — except a manager's
  // one-off top-up, which spins the full-range budget wheel like any other round.
  const isTopUp = needsTopUp(d, d.currentOrder[d.turnIndex]);
  const spun = isBenchRound(d)
    ? (isTopUp ? generateBudget(d.difficulty) : 0)
    : generateBudget(d.difficulty);
  return { currentBudget: withCashInjection(spun + carry, isTopUp), currentSpun: spun };
}

// The full-range top-up wheel has £0 wedges, so someone who spent to the cap all
// draft can reach the bench with nothing at all. This is the floor under that:
// enough to fill a bench with squad players, not enough to buy one star and call
// it done. Applied once, at the top-up, to the whole pot — not per sub.
export const BENCH_MIN_FUND = 25;

export function withCashInjection(total, isTopUp) {
  return isTopUp ? Math.max(total, BENCH_MIN_FUND) : total;
}

// ── Leftover Lolly ──────────────────────────────────────────────────────────
// With the option on, unspent cash never rolls into the next spin: it banks
// into m.subFund, which stays locked until the bench rounds (slot 11+). From
// there the fund REPLACES the wheel — subs are bought out of one continuous
// pot, so the bench you get is the residue of how hard you pushed on the XI.
// The one exception is a manager's first bench turn, which spins the full budget
// wheel as a top-up — high variance on purpose, so a max-spender still has a
// shot at a big fund (and a scouting mission) but is never guaranteed one.
const BENCH_START = 11;

export function isBenchRound(d) {
  return !!d.leftoverLolly && d.positionIndex >= BENCH_START;
}

// True only for a manager's first bench turn — the top-up spin still shows a wheel.
export function needsTopUp(d, mgrIdx) {
  return isBenchRound(d) && !d.managers[mgrIdx]?.toppedUp;
}

// The carry the active manager brings into this turn. Under Lolly the XI rounds
// always carry nothing (that's the whole point) and the bench rounds carry the
// whole fund; otherwise it's the classic carryover, minus a forfeited re-spin.
export function carryFor(d, mgrIdx) {
  const m = d.managers[mgrIdx];
  if (!m) return 0;
  if (d.leftoverLolly) return isBenchRound(d) ? (m.subFund || 0) : 0;
  return d.noCarryoverNext ? 0 : (m.carryover || 0);
}

// Loading a budget consumes whatever the carry came from, so it can't be
// double-spent if the manager re-spins mid-turn.
export function consumeCarry(d, mgrIdx) {
  return d.managers.map((m, i) => {
    if (i !== mgrIdx) return m;
    if (d.leftoverLolly) return isBenchRound(d) ? { ...m, subFund: 0, toppedUp: true } : m;
    return { ...m, carryover: 0 };
  });
}

// Where a turn's unspent money goes. Under Lolly it always lands in the sub
// fund (the bench rounds zero the fund as they load it, so a plain += is right
// in both phases); otherwise it's the classic round-to-round carryover.
function bankLeftover(d, m, leftover) {
  if (d.leftoverLolly) return { ...m, carryover: 0, subFund: (m.subFund || 0) + leftover };
  return { ...m, carryover: d.noCarryoverNext ? 0 : leftover };
}

// ── Free transfers (Leftover Lolly bench rounds) ────────────────────────────
// The base data has 30 players with valueMin: 0 but none with an actual value of
// 0, so with Value for Money on the randomiser reprices everyone out of their
// min..max band and the free tier can vanish entirely. On a bench round there is
// no wheel left to spin, so a manager whose fund is spent gets permanently
// stranded by a £2m sub. These are the escape hatch, and they're genuinely free.
//
// One option per manager, cheapest first: everyone stranded in the same round is
// guaranteed one, and draft order decides who gets the pick of them rather than
// the last manager being left with nothing.
export function freeTransferOptions(d, candidates) {
  if (!candidates || !candidates.length) return [];
  return [...candidates]
    .sort((a, b) => a.value - b.value || b.rating - a.rating)
    .slice(0, d.managers.length)
    .map(p => ({ ...p, value: 0, freeTransfer: true }));
}

// ── CPU bench reserve (Leftover Lolly only) ─────────────────────────────────
// Without this a CPU spends every XI spin to the cap — it has no concept that
// leftovers now fund the bench — and finishes the draft with empty sub slots.
// Because leftovers bank themselves, simply bidding below the budget IS the
// reserve; nothing else needs to change.
//
// The rate scales with the spin: £25m has to go on the player in front of you,
// but £125m rarely needs to, so a big spin banks a bigger slice rather than
// blowing it on a marginal upgrade. The jitter is deliberate — CPUs are
// otherwise clinical to a fault, and this is a cheap place to make them
// occasionally overspend or hoard like a real drafter would.
const RESERVE_FLOOR_SPIN = 25;   // at or below this, spend it all — splitting it buys nothing
const RESERVE_FULL_SPIN = 125;   // spin at which the reserve rate maxes out
const RESERVE_MIN_PCT = 0.10;
const RESERVE_MAX_PCT = 0.40;
const RESERVE_JITTER = 0.24;     // total spread, so +/- half this
const RESERVE_CAP_PCT = 0.55;    // never bank so much they can't sign anyone decent

const BENCH_SPLURGE = 1.35;      // how far above an even split a CPU will stretch

export function cpuSpendCap(d, budget) {
  if (!d.leftoverLolly || budget <= RESERVE_FLOOR_SPIN) return budget;

  // On the bench the fund is one pot for several slots, so an uncapped CPU
  // spends the lot on the first sub and leaves the rest empty. Ration it by
  // what's still unfilled, with a bit of stretch so it can still splurge.
  if (isBenchRound(d)) {
    const m = d.managers[d.currentOrder[d.turnIndex]];
    const slotsLeft = m ? m.squad.slice(11).filter(s => !s).length : 1;
    if (slotsLeft <= 1) return budget;
    const share = (budget / slotsLeft) * BENCH_SPLURGE * (0.85 + Math.random() * 0.3);
    return Math.max(RESERVE_FLOOR_SPIN, Math.min(budget, Math.round(share)));
  }

  const scale = Math.min(1, budget / RESERVE_FULL_SPIN);
  const base = RESERVE_MIN_PCT + (RESERVE_MAX_PCT - RESERVE_MIN_PCT) * scale;
  const pct = Math.max(0, Math.min(RESERVE_CAP_PCT, base + (Math.random() - 0.5) * RESERVE_JITTER));
  return Math.max(RESERVE_FLOOR_SPIN, Math.round(budget * (1 - pct)));
}

export function applyPick(d, player) {
  const activeIdx = d.currentOrder[d.turnIndex];
  const budget = d.currentBudget ?? 0;
  const isRandomStarter = d.positionMode === "random" && d.positionIndex < 11;

  const managers = d.managers.map((m, i) => {
    if (i !== activeIdx) return m;
    if (!player) return bankLeftover(d, m, budget);
    const squad = [...m.squad];
    const squadSlot = (isRandomStarter && d.currentSlot !== null && d.currentSlot !== undefined)
      ? d.currentSlot
      : d.positionIndex;
    squad[squadSlot] = { ...player };
    return { ...bankLeftover(d, m, budget - player.value), squad };
  });

  const takenIds = player ? [...d.takenIds, player.id] : d.takenIds;
  const pickLog = [...(d.pickLog || []), buildPickEntry(d, player, activeIdx, budget, isRandomStarter)];
  const n = d.currentOrder.length;
  const newTurnIndex = d.turnIndex + 1;

  if (newTurnIndex >= n) {
    const newPositionIndex = d.positionIndex + 1;
    if (newPositionIndex >= POSITIONS.length) {
      return { ...d, managers, takenIds, pickLog, positionIndex: newPositionIndex, phase: "complete", currentSlot: null };
    }
    const newRound = d.round + 1;
    return {
      ...d,
      managers,
      takenIds,
      pickLog,
      positionIndex: newPositionIndex,
      turnIndex: 0,
      round: newRound,
      currentBudget: null,
      noCarryoverNext: false,
      currentSlot: null,
      currentOrder: newRound % 2 === 0 ? [...d.snakeOrder] : [...d.snakeOrder].reverse(),
      phase: "draft",
    };
  }
  return { ...d, managers, takenIds, pickLog, turnIndex: newTurnIndex, currentBudget: null, noCarryoverNext: false, currentSlot: null };
}

// One row of the draw board. Denormalised on purpose: name/rating/value are copied
// in rather than resolved later, because Scout's shared pool depletes as the draft
// runs and a player id alone may no longer resolve by the time the board renders.
// A null player is a genuine outcome (nothing affordable left), not an error — it
// logs as a skip so the board can show it rather than leaving a silent gap.
function buildPickEntry(d, player, managerIdx, budget, isRandomStarter) {
  const slot = (isRandomStarter && d.currentSlot !== null && d.currentSlot !== undefined)
    ? d.currentSlot
    : d.positionIndex;
  const m = d.managers[managerIdx];
  return {
    round: d.round,
    positionIndex: d.positionIndex,
    slot,
    slotPos: formationPos(m?.formation || "4-3-3", slot),
    managerIdx,
    // `spun` is the raw wheel result; `budget` is what they could actually
    // spend (spin + carryover from earlier rounds). They diverge whenever
    // someone banks money, and only `spun` is a possible wheel value.
    spun: d.currentSpun ?? budget,
    budget,
    spent: player ? player.value : 0,
    carry: d.leftoverLolly
      ? budget - (player ? player.value : 0) // banked to the sub fund, not carried
      : (d.noCarryoverNext ? 0 : budget - (player ? player.value : 0)),
    playerId: player ? player.id : null,
    name: player ? player.name : null,
    pos: player ? player.pos : null,
    rating: player ? player.rating : null,
    tier: player ? (player.tier ?? null) : null,
  };
}

const FORMAT_TARGETS = { bo3: 2, bo5: 3, bo7: 4, single: 1 };

export function buildSeries(n, format) {
  if (!format || format === "single") return null;
  if (n === 2) {
    return {
      format,
      participants: [0, 1],
      wins: [0, 0],
      draws: 0,
      played: 0,
      target: FORMAT_TARGETS[format] || 4,
      stage: "playing",
      champion: null,
      history: [],
    };
  }
  if (n === 4 && format === "tournament") {
    return {
      format: "tournament",
      stage: "draw",
      quarters: null,
      semis: null,
      final: null,
      champion: null,
    };
  }
  if (n === 8 && format === "tournament8") {
    return {
      format: "tournament8",
      stage: "draw",
      quarters: null,
      semis: null,
      final: null,
      champion: null,
    };
  }
  return null;
}

// Resets an existing series to its just-drawn starting state while preserving
// its shape (format / participants / singleLeg / target). Used by the RESTART
// feature so a player can re-run the whole tournament with their built squad —
// tournaments go back to the bracket draw, 2-player series back to 0–0.
export function freshSeries(series, n) {
  if (!series) return series;
  const { format } = series;
  if (format === "tournament" || format === "tournament8") {
    const base = { format, stage: "draw", champion: null, quarters: null, semis: null, final: null };
    if (series.singleLeg) base.singleLeg = true;
    return base;
  }
  // Two-player best-of-N series
  return {
    format,
    participants: series.participants || Array.from({ length: n }, (_, i) => i),
    wins: [0, 0],
    draws: 0,
    played: 0,
    target: series.target ?? (FORMAT_TARGETS[format] || 2),
    stage: "playing",
    champion: null,
    history: [],
  };
}

// Appends a completed leg to a two-player series' fixture history, always
// oriented to participants[0]'s perspective so the fixtures strip can render
// consistently regardless of which side was "home" that particular leg.
export function appendSeriesHistory(s, homeIdx, awayIdx, score, winnerIdx) {
  const [p0] = s.participants;
  const p0Goals = homeIdx === p0 ? (score?.home ?? null) : (score?.away ?? null);
  const p1Goals = homeIdx === p0 ? (score?.away ?? null) : (score?.home ?? null);
  const winnerPos = winnerIdx === null ? null : s.participants.indexOf(winnerIdx);
  return [...(s.history || []), { p0Goals, p1Goals, winnerPos }];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffled-bag distribution: no repeat combo until every combo has been used once,
// then the bag refills and reshuffles. Guarantees the most even possible spread.
export function assignDraftRoulette(n, draftRoulette) {
  if (!draftRoulette?.enabled || (!draftRoulette.era && !draftRoulette.league)) {
    return Array.from({ length: n }, () => ({ era: null, league: null }));
  }
  const eras = draftRoulette.era ? DRAFT_ROULETTE_ERAS.map(e => e.key) : [null];
  const leagues = draftRoulette.league ? DRAFT_ROULETTE_LEAGUES.map(l => l.key) : [null];
  const combos = [];
  for (const era of eras) {
    for (const league of leagues) {
      combos.push({ era, league });
    }
  }

  const assignments = [];
  let bag = [];
  while (assignments.length < n) {
    if (bag.length === 0) bag = shuffle(combos);
    assignments.push(bag.shift());
  }
  return assignments;
}

// The permanent identity key for a card: its Wikidata Q-ID when enriched, else
// the name string (the legacy key, kept as a fallback for unmatched cards). This
// is what collapses the ~151 multi-era duplicate cards into one identity, and it
// fixes the name-string fragility ("X" vs "X Jr", two Ronaldos, diacritics).
export function identityKey(player) {
  return player.wikidataId ? `wd:${player.wikidataId}` : `nm:${player.name}`;
}

const randOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Resolve a lobby playerFilter into a season-pool descriptor, or null for a
// non-season game (today's cross-era pool: Kitty, War Chest, or no picker).
//   { season: S }                 → { kind: "single", season }
//   { range: {from,to}, preset }  → { kind: "range", from, to, preset }
//   { allSeasons: "peak"|"random"}→ { kind: "all", mode }
export function resolveSeasonFilter(filter = {}) {
  if (!filter) return null;
  if (filter.season != null) return { kind: "single", season: filter.season };
  if (filter.range) return { kind: "range", from: filter.range.from, to: filter.range.to, preset: filter.preset || null };
  if (filter.allSeasons) return { kind: "all", mode: filter.allSeasons === "random" ? "random" : "peak" };
  return null;
}

// Roll ONE (card, season) for an identity's set of cards under a season filter,
// or null if the identity has no card active in the selected range. `season` is
// null when no season applies (non-season game, or a legend in All-seasons —
// legends sit outside the season system so they keep their peak card).
function rollIdentity(versions, sf) {
  if (!sf) return { id: randOf(versions).id, season: null };
  const isLegend = versions[0].league === "legends";
  if (sf.kind === "single") {
    const active = versions.filter(v => activeInSeason(cardWindow(v), sf.season));
    return active.length ? { id: randOf(active).id, season: sf.season } : null;
  }
  if (sf.kind === "all" && isLegend) {
    // Legends are pre-1998; they can't be rolled into the 1999+ season system,
    // so they ride along in All-seasons with no season (their iconic card).
    return { id: randOf(versions).id, season: null };
  }
  const [from, to] = sf.kind === "range" ? [sf.from, sf.to] : [FIRST_SEASON, LATEST_SEASON];
  if (sf.mode === "peak") {
    // Peak/Prime: the identity's best card, pinned to that card's peak season.
    const best = versions.reduce((a, b) => (b.rating > a.rating ? b : a));
    const s = Math.max(from, Math.min(to, peakSeasonOf(best)));
    return activeInSeason(cardWindow(best), s) ? { id: best.id, season: s }
         : (activeSeasonsInRange(best, from, to)[0] != null
             ? { id: best.id, season: activeSeasonsInRange(best, from, to)[0] } : null);
  }
  // Range or All-seasons random: collect every season each card is active in
  // within the range, roll a season uniformly, then a card active that season.
  const cardsBySeason = new Map();
  for (const v of versions) for (const s of activeSeasonsInRange(v, from, to)) {
    if (!cardsBySeason.has(s)) cardsBySeason.set(s, []);
    cardsBySeason.get(s).push(v);
  }
  if (!cardsBySeason.size) return null;
  const s = randOf([...cardsBySeason.keys()]);
  return { id: randOf(cardsBySeason.get(s)).id, season: s };
}

// Build the draftable pool for a game. Returns the set of chosen card ids and a
// `playerSeasons` map (id → rolled end-year season) for the season-pool modes.
// Legends are excluded from single-season and range games (they're pre-1998),
// kept in non-season and All-seasons games.
export function selectGamePlayers(filter = {}, { perLeagueDedup = false } = {}) {
  const { eras, leagues, tiers } = filter;
  const sf = resolveSeasonFilter(filter);
  const dropLegends = sf && (sf.kind === "single" || sf.kind === "range");
  let pool = PLAYERS.filter(p =>
    (!leagues || leagues.includes(p.league)) &&
    (!tiers   || tiers.includes(p.tier)) &&
    (dropLegends ? p.league !== "legends" : true) &&
    // The era checkbox filter applies to non-season and All-seasons games (where
    // the full pool is on offer and narrowing by era still makes sense); a single
    // season or range already defines the era. Legends bypass it (own toggle).
    ((sf && sf.kind !== "all") || p.league === "legends" || !eras || eras.includes(p.era))
  );
  // One card per identity (Q-ID, else name). Real Teams dedupes per-league
  // instead, so each league's version survives (e.g. a Man Utd Ronaldo AND a
  // Real Madrid Ronaldo) and an assigned CPU can find the card for its own league.
  const byIdentity = {};
  for (const player of pool) {
    const key = perLeagueDedup ? `${identityKey(player)}|${player.league}` : identityKey(player);
    if (!byIdentity[key]) byIdentity[key] = [player];
    else byIdentity[key].push(player);
  }
  const availablePlayerIds = new Set();
  const playerSeasons = new Map();
  for (const versions of Object.values(byIdentity)) {
    const pick = rollIdentity(versions, sf);
    if (!pick) continue;
    availablePlayerIds.add(pick.id);
    if (pick.season != null) playerSeasons.set(pick.id, pick.season);
  }
  return { availablePlayerIds, playerSeasons };
}

// The season a given player is pinned to in this draft: his own rolled season
// (range / All-seasons modes) or the single game season, else null.
export function effectiveSeason(draft, player) {
  if (!draft || !player) return null;
  const rolled = draft.playerSeasons instanceof Map ? draft.playerSeasons.get(player.id) : undefined;
  return rolled ?? draft.season ?? null;
}

// Is a manager eligible under a season-pool descriptor? Active that season
// (single), overlapping the range, or any (All-seasons / non-season game).
export function managerEligibleFor(manager, sf) {
  if (!sf) return true;
  if (sf.kind === "single") return activeInSeason(cardWindow(manager), sf.season);
  if (sf.kind === "range") return windowOverlaps(manager, sf.from, sf.to);
  return true; // All seasons
}

// Real Teams: the card ids a CPU always has access to for its assigned club — every
// card (any league, including Legends) whose club matches, deduped by name so a player
// isn't offered twice. Legends versions win the tie so the club's icons show up.
export function computeOwnClubIds(realClub) {
  if (!realClub) return [];
  const clubs = realTeamPlayerClubs(realClub);
  const byName = {};
  for (const p of PLAYERS) {
    if (!clubs.includes(p.club)) continue;
    const cur = byName[p.name];
    if (!cur || (p.league === "legends" && cur.league !== "legends")) byName[p.name] = p;
  }
  return Object.values(byName).map(p => p.id);
}

// Builds the shared pool. Everyone can draft from `poolIds` (the filtered selection);
// additionally, each Real Teams CPU can draft its own-club cards. Returns the union
// (so values/form/order get generated for every draftable card) plus the base poolIds.
export function buildRealTeamsPool(poolIds, managers) {
  const union = new Set(poolIds);
  for (const m of managers) {
    for (const id of (m.ownClubIds || [])) union.add(id);
  }
  return { availablePlayerIds: union, poolIds: new Set(poolIds) };
}

// Is a given card draftable by the active manager? Base pool for everyone, plus the
// active manager's own-club cards in Real Teams mode.
export function isDraftableBy(draft, activeManager, id) {
  const base = draft.poolIds || draft.availablePlayerIds;
  if (base && base.has(id)) return true;
  return !!activeManager?.ownClubIds?.includes(id);
}

// Fast id→name lookup for taken-by-name checks below.
const PLAYER_NAME_BY_ID = new Map(PLAYERS.map(p => [p.id, p.name]));

// Real Teams mode intentionally keeps multiple league-versions of the same real
// player in the shared pool, so an assigned CPU can always reach its own-club card.
// But any single manager must only ever be shown ONE version of a player, and a name
// already drafted (in any version) must not resurface. This collapses the list to one
// card per name, preferring the active manager's own-club version when it has one.
// No-op outside Real Teams mode (there are no duplicate names in a normal pool).
export function dedupeByName(players, draft, activeManager) {
  if (!draft?.realTeams) return players;
  const takenNames = new Set();
  for (const id of (draft.takenIds || [])) {
    const name = PLAYER_NAME_BY_ID.get(id);
    if (name) takenNames.add(name);
  }
  const ownIds = new Set(activeManager?.ownClubIds || []);
  const chosen = new Map(); // name -> chosen player
  for (const p of players) {
    if (takenNames.has(p.name)) continue;
    const existing = chosen.get(p.name);
    if (!existing) chosen.set(p.name, p);
    else if (ownIds.has(p.id) && !ownIds.has(existing.id)) chosen.set(p.name, p);
  }
  return Array.from(chosen.values());
}

export function randomizePlayerValues(availablePlayerIds, playerSeasons = null, season = null) {
  const playerValues = new Map();
  for (const player of PLAYERS) {
    if (availablePlayerIds.has(player.id)) {
      // Each player's value band is re-centred on HIS rolled season's reputation
      // (ageing stars stay dear, wonderkids are cheap). Falls back to the single
      // game season, else the authored peak band exactly as before.
      const s = (playerSeasons instanceof Map ? playerSeasons.get(player.id) : undefined) ?? season;
      const band = s != null ? seasonValueBand(player, s) : player;
      const min = band.valueMin ?? band.min ?? 0;
      const max = band.valueMax ?? band.max ?? 0;
      const randomValue = min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min;
      playerValues.set(player.id, randomValue);
    }
  }
  return playerValues;
}

export function generatePlayerForm(availablePlayerIds) {
  const playerForm = new Map();
  for (const playerId of availablePlayerIds) {
    const rand = Math.random();
    let form;
    if (rand < 0.1) form = -2;
    else if (rand < 0.3) form = -1;
    else if (rand < 0.7) form = 0;
    else if (rand < 0.9) form = 1;
    else form = 2;
    playerForm.set(playerId, form);
  }
  return playerForm;
}

export function generatePlayerOrder(availablePlayerIds) {
  const playerOrder = new Map();
  for (const playerId of availablePlayerIds) {
    playerOrder.set(playerId, Math.random());
  }
  return playerOrder;
}

export function getFormArrow(formValue) {
  switch (formValue) {
    case 2: return "↑";
    case 1: return "↗";
    case 0: return "→";
    case -1: return "↘";
    case -2: return "↓";
    default: return "→";
  }
}

export function buildInitialDraft(clubs, options = {}) {
  const n = clubs.length;
  const initialOrder = shuffle(Array.from({ length: n }, (_, i) => i));
  const rouletteAssignments = assignDraftRoulette(n, options.draftRoulette);
  const managers = clubs.map((c, i) => {
    // Real Teams mode: elite club this CPU favours during the draft (null otherwise)
    const realClub = (options.realTeams && c.isComputer) ? (c.realClub || null) : null;
    return {
      id: i,
      name: c.dofName,
      dofName: c.dofName,
      clubName: c.clubName,
      teamName: c.clubName,
      primaryColor: c.primaryColor || "#1a3a6b",
      secondaryColor: c.secondaryColor || "#ffffff",
      pattern: c.pattern || "plain",
      isComputer: !!c.isComputer,
      squad: Array(16).fill(null),
      carryover: 0,
      subFund: 0,
      toppedUp: false,
      tactics: "balanced",
      formation: c.formation || "4-3-3",
      assignedEra: rouletteAssignments[i].era,
      assignedLeague: rouletteAssignments[i].league,
      realClub,
      ownClubIds: realClub ? computeOwnClubIds(realClub) : [],
    };
  });
  const { availablePlayerIds: basePool, playerSeasons } = selectGamePlayers(options.playerFilter, { perLeagueDedup: !!options.realTeams });
  const { availablePlayerIds, poolIds } = buildRealTeamsPool(basePool, managers);
  const playerValues = options.dynamicValues !== false ? randomizePlayerValues(availablePlayerIds, playerSeasons, options.playerFilter?.season ?? null) : new Map();
  const playerForm = options.dynamicForm !== false ? generatePlayerForm(availablePlayerIds) : new Map();
  const playerOrder = generatePlayerOrder(availablePlayerIds);
  return {
    managers,
    realTeams: !!options.realTeams,
    draftRoulette: options.draftRoulette || null,
    // Season Pool: the single chosen season (end-year), or null for a range /
    // All-seasons / non-season game. `seasonFilter` is the full descriptor
    // (single | range | all | null) and `playerSeasons` maps each player id to
    // its rolled season. All serialise for online rooms / saves; the manager
    // pool, Age field and curve read through them. null season = no single year.
    season: options.playerFilter?.season ?? null,
    seasonFilter: resolveSeasonFilter(options.playerFilter),
    playerSeasons,
    positionIndex: 0,
    turnIndex: 0,
    round: 0,
    currentBudget: null,
    currentOrder: initialOrder,
    snakeOrder: initialOrder,
    takenIds: [],
    pickLog: [],
    availablePlayerIds,
    poolIds,
    playerValues,
    playerForm,
    playerOrder,
    phase: "draft",
    hideRatings: options.hideRatings || false,
    leftoverLolly: !!options.leftoverLolly,
    freeSubs: !!options.freeSubs,
    difficulty: options.difficulty || "normal",
    dynamicForm: options.dynamicForm !== false,
    series: buildSeries(n, options.format),
    managerTiming: options.managerTiming || "before",
    positionMode: options.positionMode || "fixed",
    currentSlot: null,
  };
}

export function getPlayersFromState(d, posKey) {
  const activeManager = d.managers[d.currentOrder[d.turnIndex]];
  const rouletteAssignment = activeManager
    ? { era: activeManager.assignedEra, league: activeManager.assignedLeague }
    : null;
  let players = availablePlayersFor(posKey, d.takenIds, rouletteAssignment, currentEligPool(d), d.freeSubs);
  if (d.availablePlayerIds instanceof Set) {
    players = players.filter(p => isDraftableBy(d, activeManager, p.id));
  }
  // Exhaustion: the slot's own pool (incl. the normal LM←LW broadening) is empty
  // — a scarce wide role in a thin season. Widen to adjacent positions so the
  // slot can always be filled by an out-of-position stand-in (OOP −5 in match).
  let widened = false;
  if (!players.length && posKey !== "GK" && posKey !== "GKSUB") {
    for (const pool of [widenedEligPool(posKey), OUTFIELD_POSITIONS]) {
      if (!pool) continue;
      let w = availablePlayersFor(posKey, d.takenIds, rouletteAssignment, pool, d.freeSubs);
      if (d.availablePlayerIds instanceof Set) w = w.filter(p => isDraftableBy(d, activeManager, p.id));
      if (w.length) { players = w; widened = true; break; }
    }
  }
  players = dedupeByName(players, d, activeManager);
  players = players.map(p => {
    // Season games: materialise the player as he was HIS rolled season (rating,
    // attributes, value band) before the rolled value is read, so the CPU
    // values — and later drafts into its squad — the right version.
    const player = applySeasonStats(p, effectiveSeason(d, p));
    player.value = resolveValue(d.playerValues, player);
    return player;
  });
  // With Free Subs on, outfield bench slots are free hits for everyone, so don't
  // narrow the CPU's pool back down to the slot's usual position band.
  // Skip the position-band narrowing when we had to widen — it would undo the
  // widening and leave the exhausted slot empty again.
  const acceptable = (widened || (d.freeSubs && SUB_POSITIONS[posKey])) ? null : CPU_POS_ACCEPTABLE[posKey];
  if (acceptable) {
    const posFiltered = players.filter(p => acceptable.includes(p.pos));
    if (posFiltered.length >= 1) players = posFiltered;
  }
  return players;
}

export function autoDrawSlot(d) {
  if (d.positionMode !== "random" || d.positionIndex >= 11 || d.currentSlot !== null) return d;
  const activeIdx = d.currentOrder[d.turnIndex];
  const m = d.managers[activeIdx];
  const avail = [];
  for (let i = 0; i < 11; i++) {
    if (!m.squad[i]) avail.push(i);
  }
  if (!avail.length) return d;
  const slot = avail[Math.floor(Math.random() * avail.length)];
  return { ...d, currentSlot: slot };
}

export function activeFormation(d) {
  if (!d?.currentOrder) return "4-3-3";
  const idx = d.currentOrder[d.turnIndex];
  return d.managers[idx]?.formation || "4-3-3";
}

export function resolveCurrentPosKey(d) {
  const formation = activeFormation(d);
  if (d.positionMode === "random" && d.positionIndex < 11 && d.currentSlot !== null) {
    return formationPos(formation, d.currentSlot);
  }
  return formationPos(formation, d.positionIndex);
}

// The outfield bench slot keys — the ones Free Subs turns into free hits. The
// sub goalkeeper (GKSUB) is deliberately excluded: it stays a keeper slot.
export const FREE_SUB_KEYS = ["DEFSUB", "MIDSUB", "WIDSUB", "ATTSUB"];

// With Free Subs on, an outfield bench slot has no position identity left to
// name, so it's just "Sub". Everything else keeps its normal label. Pass the
// slot's position key and the label you'd otherwise show.
export function subDisplayLabel(d, posKey, fallback) {
  return (d?.freeSubs && FREE_SUB_KEYS.includes(posKey)) ? "Sub" : fallback;
}

export function resolveCurrentPos(d) {
  if (!d || d.warChest) return null;
  const slotIndex = (d.positionMode === "random" && d.positionIndex < 11 && d.currentSlot !== null && d.currentSlot !== undefined)
    ? d.currentSlot
    : d.positionIndex;
  const formation = activeFormation(d);
  const entry = formationEntry(formation, slotIndex);
  const key = entry.pos;
  const displayKey = entry.label ?? key;
  return { key, label: subDisplayLabel(d, key, POS_LABELS[displayKey] ?? displayKey), slot: slotIndex };
}

// ── War Chest mode ──────────────────────────────────────────────────────────

function buildWCSeries(n, format = "bo3") {
  if (format === "single") return null; // one-off match — no series, just play & return
  if (n === 2) return {
    format,
    participants: [0, 1],
    wins: [0, 0],
    draws: 0,
    played: 0,
    target: FORMAT_TARGETS[format] || 2,
    stage: "playing",
    champion: null,
  };
  if (n === 4) return { format: "tournament", singleLeg: true, stage: "draw", semis: null, final: null, champion: null };
  if (n === 8) return { format: "tournament8", singleLeg: true, stage: "draw", quarters: null, semis: null, final: null, champion: null };
  return null;
}

export function buildInitialWarChestDraft(clubs, options = {}) {
  const { availablePlayerIds, playerSeasons } = selectGamePlayers(options.playerFilter);
  const playerValues = options.dynamicValues !== false ? randomizePlayerValues(availablePlayerIds, playerSeasons, options.playerFilter?.season ?? null) : new Map();
  const playerForm = options.dynamicForm !== false ? generatePlayerForm(availablePlayerIds) : new Map();
  const playerOrder = generatePlayerOrder(availablePlayerIds);

  // In multiplayer WC, slots are fixed (each player is their own index) — skip shuffle
  let orderedClubs;
  if (options.noShuffle) {
    orderedClubs = [...clubs];
  } else {
    const humans = clubs.filter(c => !c.isComputer);
    const computers = clubs.filter(c => c.isComputer);
    for (let i = humans.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [humans[i], humans[j]] = [humans[j], humans[i]];
    }
    orderedClubs = [...humans, ...computers];
  }
  const rouletteAssignments = assignDraftRoulette(orderedClubs.length, options.draftRoulette);

  return {
    warChest: true,
    managers: orderedClubs.map((c, i) => ({
      name: c.dofName,
      dofName: c.dofName,
      clubName: c.clubName,
      teamName: c.clubName,
      primaryColor: c.primaryColor || "#1a3a6b",
      secondaryColor: c.secondaryColor || "#ffffff",
      pattern: c.pattern || "plain",
      isComputer: !!c.isComputer,
      squad: Array(16).fill(null),
      chestBudget: null,
      wcBudgetRemaining: null,
      tactics: "balanced",
      assignedEra: rouletteAssignments[i].era,
      assignedLeague: rouletteAssignments[i].league,
    })),
    draftRoulette: options.draftRoulette || null,
    wcCurrentManagerIdx: 0,
    wcPhase: "selecting",
    wcBuildOrder: null,
    wcBuildCursor: 0,
    takenIds: [],
    pickLog: [],
    availablePlayerIds,
    playerValues,
    playerForm,
    playerOrder,
    season: options.playerFilter?.season ?? null,
    seasonFilter: resolveSeasonFilter(options.playerFilter),
    playerSeasons,
    hideRatings: options.hideRatings || false,
    difficulty: options.difficulty || "hard",
    dynamicForm: options.dynamicForm !== false,
    dynamicValues: options.dynamicValues !== false,
    phase: "draft",
    series: buildWCSeries(orderedClubs.length, options.format),
  };
}

export function getWarChestPlayersForSlot(slotIdx, takenIds, availablePlayerIds, playerValues, playerForm, rouletteAssignment, playerSeasons = null, season = null) {
  return wcSlotCandidates(slotIdx, new Set(takenIds), availablePlayerIds, rouletteAssignment, false)
    .map(p => wcSeasonPlayer(p, playerValues, playerSeasons, season, playerForm));
}

// Pick ATT slots first so they get the biggest share of budget.
// Slot indices: 0=GK, 1=DEF, 2=MID, 3=ATT, 4=ATT
const WC_PICK_ORDER = [3, 4, 0, 2, 1];
// Budget fraction ceiling per slot (sums to 1.0)
const WC_MAX_FRACTION = { 3: 0.30, 4: 0.26, 0: 0.22, 2: 0.14, 1: 0.08 };
// ATT slots: exclude purely defensive positions even if posFilter allows them
const WC_ATT_EXCLUDE_POS = ["CB", "LB", "RB", "DM"];

// Materialise a War Chest candidate at its (rolled) season — rating, attributes,
// value band and the stamped seasonYear — exactly like the Classic materialisers.
function wcSeasonPlayer(p, playerValues, playerSeasons, season, playerForm) {
  const es = (playerSeasons instanceof Map ? playerSeasons.get(p.id) : undefined) ?? season ?? null;
  const player = applySeasonStats(p, es); // fresh clone; stamps seasonYear
  player.value = resolveValue(playerValues, player);
  if (playerForm instanceof Map) player.form = playerForm.get(p.id) ?? 0;
  return player;
}

// Eligible raw cards for a War Chest slot, widening to any outfielder when the
// slot's own positions are exhausted (a scarce season) so a slot is never empty.
function wcSlotCandidates(slotIdx, takenSet, availablePlayerIds, roulette, attExclude) {
  const slotDef = WAR_CHEST_SLOTS[slotIdx];
  if (!slotDef) return [];
  const match = (positions) => PLAYERS.filter(p =>
    positions.includes(p.pos) && !takenSet.has(p.id) &&
    (!availablePlayerIds || availablePlayerIds.has(p.id)) &&
    (!attExclude || !WC_ATT_EXCLUDE_POS.includes(p.pos)) &&
    matchesRoulette(p, roulette));
  let list = match(slotDef.posFilter);
  if (!list.length && slotDef.key !== "GK") list = match(OUTFIELD_POSITIONS);
  return list;
}

// Assign a manager's chest budget without building their squad — used by the
// up-front "everyone opens their chest first" phase (CPU chests are rolled here;
// human chests come from WarChestSelectionScreen). Squads are built later, in the
// order set by the build-order draw.
export function assignWarChestBudget(d, managerIdx) {
  const values = WAR_CHEST_VALUES[d.difficulty] || WAR_CHEST_VALUES.hard;
  const budget = values[Math.floor(Math.random() * values.length)];
  const managers = d.managers.map((m, i) =>
    i === managerIdx ? { ...m, chestBudget: budget, wcBudgetRemaining: budget } : m
  );
  return { ...d, managers };
}

export function autoBuildWarChestSquad(d, managerIdx) {
  const values = WAR_CHEST_VALUES[d.difficulty] || WAR_CHEST_VALUES.hard;
  // Respect a budget already assigned in the chest-opening phase; only roll a
  // fresh one if this manager somehow reaches build with no chest yet.
  const budget = d.managers[managerIdx]?.chestBudget ?? values[Math.floor(Math.random() * values.length)];
  let takenIds = [...d.takenIds];
  let budgetRemaining = budget;
  const squad = Array(16).fill(null);
  const activeManager = d.managers[managerIdx];
  const rouletteAssignment = activeManager
    ? { era: activeManager.assignedEra, league: activeManager.assignedLeague }
    : null;

  const takenSet = new Set(takenIds);
  for (const slot of WC_PICK_ORDER) {
    const maxForSlot = Math.floor(budget * WC_MAX_FRACTION[slot]);
    const isAttSlot = slot === 3 || slot === 4;
    const pool = wcSlotCandidates(slot, takenSet, d.availablePlayerIds, rouletteAssignment, isAttSlot)
      .map(p => wcSeasonPlayer(p, d.playerValues, d.playerSeasons, d.season, d.playerForm))
      .sort((a, b) => b.rating - a.rating);
    // Ladder, so a slot is never left empty: within the per-slot cap → within
    // the remaining chest → Option B (lowest-rated, chest tops up to cover).
    let pick = cpuVariancePick(pool.filter(p => p.value <= Math.min(budgetRemaining, maxForSlot)))
      || cpuVariancePick(pool.filter(p => p.value <= budgetRemaining));
    if (!pick && pool.length) pick = pool.reduce((lo, p) => (p.rating < lo.rating ? p : lo));
    if (pick) {
      squad[slot] = pick;
      takenIds.push(pick.id);
      takenSet.add(pick.id);
      budgetRemaining = Math.max(0, budgetRemaining - pick.value);
    }
  }

  const managers = d.managers.map((m, i) =>
    i === managerIdx
      ? { ...m, chestBudget: budget, wcBudgetRemaining: budgetRemaining, squad }
      : m
  );
  return { ...d, managers, takenIds };
}

// Multiplayer War Chest has no shared taken-players pool (duplicates across managers are
// allowed, since squads build simultaneously) — so unlike autoBuildWarChestSquad above,
// this only avoids repicking a player already sitting in this manager's own squad.
// Used both to fill an entire squad from scratch (CPU slots, no-show players) and to
// top up whatever slots a player didn't finish before their timer ran out.
export function autoFillWarChestSlot({ chestBudget, wcBudgetRemaining, squad, availablePlayerIds, playerValues, playerForm, playerSeasons = null, season = null, difficulty, rouletteAssignment }) {
  const values = WAR_CHEST_VALUES[difficulty] || WAR_CHEST_VALUES.hard;
  const budget = chestBudget ?? values[Math.floor(Math.random() * values.length)];
  let budgetRemaining = chestBudget == null ? budget : (wcBudgetRemaining ?? budget);
  const filledSquad = squad ? [...squad] : Array(16).fill(null);
  const takenSet = new Set(filledSquad.filter(Boolean).map(p => p.id));

  for (const slot of WC_PICK_ORDER) {
    if (filledSquad[slot]) continue;
    const maxForSlot = Math.floor(budget * WC_MAX_FRACTION[slot]);
    const isAttSlot = slot === 3 || slot === 4;
    const pool = wcSlotCandidates(slot, takenSet, availablePlayerIds, rouletteAssignment, isAttSlot)
      .map(p => wcSeasonPlayer(p, playerValues, playerSeasons, season, playerForm))
      .sort((a, b) => b.rating - a.rating);
    const topRandom = (list) => list.length ? list[Math.floor(Math.random() * Math.min(3, list.length))] : null;
    // Same ladder as autoBuild, so a no-show / timed-out squad is never short.
    let pick = topRandom(pool.filter(p => p.value <= Math.min(budgetRemaining, maxForSlot)))
      || topRandom(pool.filter(p => p.value <= budgetRemaining));
    if (!pick && pool.length) pick = pool.reduce((lo, p) => (p.rating < lo.rating ? p : lo));
    if (pick) {
      filledSquad[slot] = pick;
      takenSet.add(pick.id);
      budgetRemaining = Math.max(0, budgetRemaining - pick.value);
    }
  }

  return { chestBudget: budget, wcBudgetRemaining: budgetRemaining, squad: filledSquad };
}

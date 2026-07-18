// Scout Mode — core logic (pure functions, no UI / no React).
//
// See docs/obsidian/Scout Mode Spec.md for the design. Scout Mode replaces
// Classic's open-browse pick loop with a small, shared, depleting "live pool"
// per position, delivered turn-by-turn as a curated "scout report" (one
// affordable candidate per tier), under squad-wide tier caps and optional
// Club Tenet draw-bias.
//
// Grounding notes that shaped this module:
//  - The draft already shares/depletes a single `takenIds` set globally, and the
//    draft loop is already position-major with snake order (see draftUtils.js).
//    Scout Mode's job is only to make the *pool* small enough that depletion
//    bites — everything here operates on a per-position `livePool` of ids drawn
//    at setup, then honours the same `takenIds` for what's still available.
//  - All managers share ONE formation (draft-locked), so per-position demand is
//    well-defined: demand = (#slots of that position in the formation) × players.

import { PLAYERS, POSITIONS, SUB_POSITIONS } from "../data/players";
import { FORMATIONS } from "../data/formations";
import { shuffle } from "./draftUtils";

// Default value accessor: mid of valueMin/valueMax. Callers with dynamic values
// (draft.playerValues) pass their own valueOf so affordability matches the rest
// of the game.
const defaultValueOf = (p) => p.value ?? Math.round(((p.valueMin ?? 0) + (p.valueMax ?? 0)) / 2);

export const TIERS = ["T1", "T2", "T3", "T4", "T5"];

const PLAYER_BY_ID = new Map(PLAYERS.map(p => [p.id, p]));

// ── Tuning constants (playtest knobs; the *shape* is the design decision) ──
export const SCOUT_TUNING = {
  surplus: 6,              // extra cards over demand, per bucket (roomy enough that
                           // a bucket holds same-tier duplicates to offer)
  reportSize: 5,           // max cards dealt in a scout report per turn
  minReportOptions: 3,     // always deal at least this many when the pool can supply
                           // them — cheapest-first, so a low/zero budget never empties
                           // the report
  freeAgentLimit: 6,       // max genuine £0 free agents surfaced per position
  reportValueBias: 1.15,   // >1 skews the report toward pricier cards you can afford
  reScoutsPerGame: 3,      // re-rolls of a bad hand per manager
  missionPremiumPct: 0.35, // scouting-mission cost = value × (1 + this)
  missionTenetDiscount: 0.15, // premium reduced by this if mission matches a tenet
  tenetBiasWeight: 3,      // relative draw weight of a tenet-matching candidate
};

// ── Pool size (setup option) ──
// Controls how many scarce (T1/T2) cards exist in EACH per-slot live-pool bucket,
// plus the overall bucket size. `elite(n)` returns the per-bucket cap on T1 and T2
// for `n` managers. Small = one genuine elite prize per position everyone fights
// over; Large = nearly one T1 per player. T3–T5 stay uncapped (plentiful). Every
// size still refines the pool massively vs Classic's open browse.
export const POOL_SIZES = {
  small:  { key: "small",  label: "SMALL",  surplus: 3,  elite: () => ({ T1: 1, T2: 1 }) },
  medium: { key: "medium", label: "MEDIUM", surplus: 6,  elite: (n) => ({ T1: Math.max(1, Math.round(n / 2)), T2: Math.max(2, n) }) },
  large:  { key: "large",  label: "LARGE",  surplus: 12, elite: (n) => ({ T1: Math.max(2, n), T2: n + 2 }) },
};

export function poolSizeFor(key) {
  return POOL_SIZES[key] || POOL_SIZES.medium;
}

// Squad-wide tier caps (max cards of each tier across the whole XI+subs).
// Null = uncapped. Tuned per difficulty; these are starting points.
export const DEFAULT_TIER_CAPS = { T1: 3, T2: 5, T3: null, T4: null, T5: null };

export const TIER_CAPS_BY_DIFFICULTY = {
  generous: { T1: 4, T2: 6, T3: null, T4: null, T5: null },
  easy:     { T1: 3, T2: 5, T3: null, T4: null, T5: null },
  normal:   { T1: 3, T2: 5, T3: null, T4: null, T5: null },
  hard:     { T1: 2, T2: 4, T3: null, T4: null, T5: null },
  brutal:   { T1: 1, T2: 3, T3: null, T4: null, T5: null },
};

export function tierCapsFor(difficulty) {
  return TIER_CAPS_BY_DIFFICULTY[difficulty] || DEFAULT_TIER_CAPS;
}

// ── Club Tenets (soft draw-bias; every axis is a populated card field) ──
// A tenet is { type, value }. `match(player)` returns true if the card fits.
// Archetype attack/defence classification is deliberately coarse (playtest).
const ATTACK_ARCHETYPES = new Set([
  "Poacher", "Target Man", "Finisher", "Playmaker", "Advanced Playmaker",
  "Winger", "Inside Forward", "Complete Forward", "False Nine", "Trequartista",
  "Box-to-Box", "Creator",
]);
const DEFENCE_ARCHETYPES = new Set([
  "Shot Stopper", "Organiser", "Sweeper Keeper", "Ball-Winner", "Anchor",
  "No-Nonsense", "Stopper", "Full-Back", "Wing-Back", "Enforcer", "Destroyer",
]);

export const TENET_DEFS = [
  { key: "continental", label: "Continental", type: "league", desc: "Bias toward one league" },
  { key: "old_guard",   label: "Old Guard",   type: "era", value: "classic", desc: "Bias toward the Classic era" },
  { key: "academy",     label: "Academy",     type: "era", value: "modern", desc: "Bias toward the Modern era" },
  { key: "homegrown",   label: "Homegrown",   type: "nation", desc: "Bias toward one nation" },
  { key: "front_foot",  label: "Front-Foot",  type: "archetype", value: "attack", desc: "Bias toward attacking players" },
  { key: "backs_wall",  label: "Backs to the Wall", type: "archetype", value: "defence", desc: "Bias toward defensive players" },
];

// Turn a TENET_DEF (+ optional chosen value for league/nation tenets) into a
// concrete tenet object { type, value }.
export function makeTenet(def, chosenValue) {
  if (def.value != null) return { key: def.key, type: def.type, value: def.value };
  return { key: def.key, type: def.type, value: chosenValue };
}

const CPU_TENET_LEAGUES = ["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1"];

// One or two random, fully-formed tenets for a CPU club.
export function randomCpuTenets() {
  const pool = TENET_DEFS.filter(d => d.key !== "homegrown"); // skip nation for CPUs
  const shuffled = shuffle(pool);
  const count = 1 + Math.floor(Math.random() * 2);
  return shuffled.slice(0, count).map(def =>
    def.type === "league"
      ? makeTenet(def, CPU_TENET_LEAGUES[Math.floor(Math.random() * CPU_TENET_LEAGUES.length)])
      : makeTenet(def)
  );
}

export function tenetMatches(tenet, player) {
  if (!tenet || !player) return false;
  switch (tenet.type) {
    case "league":    return player.league === tenet.value;
    case "era":       return player.era === tenet.value;
    case "nation":    return player.nation === tenet.value;
    case "archetype":
      if (tenet.value === "attack")  return ATTACK_ARCHETYPES.has(player.archetype);
      if (tenet.value === "defence") return DEFENCE_ARCHETYPES.has(player.archetype);
      return false;
    default: return false;
  }
}

// ── Live pool construction ──

// The natural position of each starting slot (0..10) in a formation, expanded
// from formation group tokens (DEF/MID/ATT) where needed. Returns e.g.
// ["GK","RB","LB","CB","CB","DM","CM","CM","RW","LW","ST"] for 4-3-3.
export function formationStarterPositions(formation) {
  const slots = FORMATIONS[formation];
  if (!slots) return POSITIONS.slice(0, 11).map(p => p.key);
  return slots.slice(0, 11).map((entry, i) => {
    // Formation entries use concrete pos keys (GK/RB/CB/DM/ST…) in the newer
    // data; fall back to the POSITIONS slot key for legacy group tokens.
    const pos = entry.pos;
    if (pos === "DEF" || pos === "MID" || pos === "ATT" || pos === "GK") {
      return POSITIONS[i]?.key ?? pos;
    }
    return pos;
  });
}

// Per-STARTER-SLOT bucket keys for a formation. Same-position slots get their
// own occurrence-suffixed bucket ("CB#0", "CB#1") so each draws a fresh, disjoint
// batch of players — the two centre-backs aren't fighting over one shared pool.
export function formationStarterBuckets(formation) {
  const seen = {};
  return formationStarterPositions(formation).map(pos => {
    const n = seen[pos] || 0;
    seen[pos] = n + 1;
    return `${pos}#${n}`;
  });
}

// The base position a bucket draws from ("CB#1" → "CB"; "DEFSUB" → "DEFSUB").
export function bucketBasePosition(bucket) {
  const hash = bucket.indexOf("#");
  return hash === -1 ? bucket : bucket.slice(0, hash);
}

// Per-bucket demand for a shared formation across `numPlayers` managers. Each
// starter SLOT is its own bucket needing one card per manager; each SUB group is
// its own bucket too (a MIDSUB won't starve the CM starters).
export function scoutDemand(formation, numPlayers) {
  const demand = {};
  for (const bucket of formationStarterBuckets(formation)) {
    demand[bucket] = (demand[bucket] || 0) + numPlayers;
  }
  for (const key of Object.keys(SUB_POSITIONS)) {
    demand[key] = (demand[key] || 0) + numPlayers;
  }
  demand.GKSUB = (demand.GKSUB || 0) + numPlayers;
  return demand;
}

// Candidate master ids for a base position, honouring the game's league/era
// filter. `base` is a concrete position key (GK/CB/ST…) or a SUB group key
// (DEFSUB/MIDSUB/WIDSUB/ATTSUB/GKSUB).
function masterIdsForBucket(base, filterFn) {
  let accept;
  if (base === "GKSUB") accept = p => p.pos === "GK";
  else if (SUB_POSITIONS[base]) accept = p => SUB_POSITIONS[base].includes(p.pos);
  else accept = p => p.pos === base;
  return PLAYERS.filter(p => accept(p) && filterFn(p)).map(p => p.id);
}

// The scarce, quantity-controlled tiers (Pool Size dials these). T3–T5 are
// plentiful and only ever used as the fill / bargain floor.
const ELITE_TIERS = ["T1", "T2"];
const LOW_TIERS = ["T3", "T4", "T5"];

// Pick a batch of `target` ids from `masterIds`, taking from `remaining` first
// (to keep same-position batches disjoint). Composition is Pool-Size-driven via
// `elite` (e.g. { T1: 1, T2: 2 }) = the GUARANTEED number of each scarce tier the
// batch should hold (capped by availability + room). We reserve a low-tier floor
// (one each of T3/T4/T5) FIRST so a cheap/bargain option always exists, then meet
// the elite targets, then fill the remainder with plentiful low tiers. Falls back
// to the full master list only when the disjoint pool can't cover demand (the
// "free transfer" case). Returns the picked id set; caller clears `remaining`.
function drawBatch(masterIds, remaining, target, need, elite = {}) {
  const picked = new Set();
  const tierCount = {};
  const addId = (id) => {
    picked.add(id);
    const t = PLAYER_BY_ID.get(id)?.tier;
    tierCount[t] = (tierCount[t] || 0) + 1;
  };
  const fillPass = (sourceIds) => {
    const byTier = new Map(TIERS.map(t => [t, []]));
    for (const id of sourceIds) {
      if (picked.has(id)) continue;
      const t = PLAYER_BY_ID.get(id)?.tier;
      if (byTier.has(t)) byTier.get(t).push(id);
    }
    const take = (t, upTo) => {
      for (const id of byTier.get(t)) {
        if (picked.size >= target || (tierCount[t] || 0) >= upTo) break;
        if (!picked.has(id)) addId(id);
      }
    };
    // 1) Reserve a bargain floor: one each of the low tiers, if present.
    for (const t of LOW_TIERS) take(t, (tierCount[t] || 0) + 1);
    // 2) Meet the scarce-tier targets (Pool Size).
    for (const t of ELITE_TIERS) take(t, elite[t] ?? 1);
    // 3) Fill the rest from plentiful low tiers (never exceed elite targets).
    for (const t of LOW_TIERS) take(t, Infinity);
  };
  fillPass(masterIds.filter(id => remaining.has(id)));
  if (picked.size < need) fillPass(masterIds);
  return picked;
}

// Draw the live pool. Buckets sharing a base position (CB#0, CB#1) are drawn as
// DISJOINT batches from that position's master list, so each slot has its own
// fresh players and the pool isn't blown through across duplicate positions.
// Each batch takes `demand + surplus` ids with a per-batch tier floor, so the
// scout report's "one per tier" promise holds for every slot.
//
// Starters are allocated first; the SUB buckets then draw from whatever's LEFT
// (a global "used" set), so the bench is a genuinely fresh batch of talent — a
// real chance to fix weak XI spots, not the dregs everyone already picked over.
// Only the free-transfer fallback in drawBatch reintroduces overlap, and only
// when a batch can't otherwise give every manager one option. Returns
// { bucket: [ids] }.
export function buildScoutLivePool(formation, numPlayers, options = {}) {
  const preset = poolSizeFor(options.poolSize);
  const surplus = options.surplus ?? preset.surplus;
  const eliteTargets = preset.elite(numPlayers); // guaranteed T1/T2 count per bucket
  const filterFn = options.filterFn || (() => true);
  const demand = scoutDemand(formation, numPlayers);
  const livePool = {};
  const globalUsed = new Set();

  const drawGroup = (buckets, avoidUsed) => {
    // Group by base position so same-position slots draw without overlap.
    const byBase = {};
    for (const bucket of buckets) {
      (byBase[bucketBasePosition(bucket)] ||= []).push(bucket);
    }
    for (const [base, list] of Object.entries(byBase)) {
      const masterIds = shuffle(masterIdsForBucket(base, filterFn));
      const remaining = new Set(avoidUsed ? masterIds.filter(id => !globalUsed.has(id)) : masterIds);
      for (const bucket of list) {
        const need = demand[bucket];
        const picked = drawBatch(masterIds, remaining, need + surplus, need, eliteTargets);
        for (const id of picked) { remaining.delete(id); globalUsed.add(id); }
        livePool[bucket] = [...picked];
      }
    }
  };

  const bucketKeys = Object.keys(demand);
  // Starters (occurrence-suffixed) take priority; subs draw from the remainder.
  drawGroup(bucketKeys.filter(b => b.includes("#")), false);
  drawGroup(bucketKeys.filter(b => !b.includes("#")), true);
  return livePool;
}

// Which live-pool bucket a formation slot draws from. Starters (0..10) use their
// per-slot bucket key (occurrence-suffixed); sub slots (11..15) use their SUB
// group key.
export function scoutBucketForSlot(formation, slotIndex) {
  if (slotIndex >= 11) return POSITIONS[slotIndex]?.key ?? null; // GKSUB/DEFSUB/…
  return formationStarterBuckets(formation)[slotIndex] ?? null;
}

// ── The scout report (per-turn hand) ──

// Count of each tier already in a manager's squad (for squad-wide caps).
export function squadTierCounts(squad) {
  const counts = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  for (const slot of squad || []) {
    if (slot && counts[slot.tier] !== undefined) counts[slot.tier]++;
  }
  return counts;
}

// Which tiers this manager may still sign, given squad-wide caps.
export function allowedTiers(squad, tierCaps) {
  const counts = squadTierCounts(squad);
  return TIERS.filter(t => {
    const cap = tierCaps?.[t];
    return cap == null || counts[t] < cap;
  });
}

// Build the hand for the manager on the clock. Candidates are the bucket's live
// players that are (a) still available and (b) not blocked by a squad-wide tier
// cap — NOT budget-filtered. From those we deal up to `size` cards, NOT
// one-per-tier:
//  - the cheapest `minOptions` are ALWAYS included, so a low or even £0 budget
//    never empties the report (genuine £0 free agents live in a separate
//    always-on list — see buildScoutFreeAgents);
//  - the rest are weighted toward pricier + tenet-matching cards you can afford,
//    so a bigger budget surfaces bigger names — the report reflects the money you
//    spun, while duplicates within a tier are perfectly fine.
// If tier caps would leave nothing, they're relaxed so the manager still gets a
// hand. Returns an array of ids (best value first). Fewer than `size` only when
// the bucket genuinely holds that few; empty only when the bucket is exhausted.
export function buildScoutReport({
  livePool, bucket, takenIds, squad, budget, tierCaps, tenets, valueOf = defaultValueOf,
  size = SCOUT_TUNING.reportSize, minOptions = SCOUT_TUNING.minReportOptions,
}) {
  const taken = new Set(takenIds);
  const poolIds = livePool[bucket] || [];

  const availablePlayers = () => {
    const out = [];
    for (const id of poolIds) {
      if (taken.has(id)) continue;
      const p = PLAYER_BY_ID.get(id);
      if (p) out.push(p);
    }
    return out;
  };

  const allowed = new Set(allowedTiers(squad, tierCaps));
  let candidates = availablePlayers().filter(p => allowed.has(p.tier));
  // Tier caps blocked the whole hand — relax them so the manager still has options.
  if (!candidates.length) candidates = availablePlayers();
  if (candidates.length <= size) {
    return [...candidates].sort((a, b) => valueOf(b) - valueOf(a)).map(p => p.id);
  }

  const remaining = [...candidates].sort((a, b) => valueOf(a) - valueOf(b));
  // Guarantee the cheapest `minOptions` (bargains / the free-transfer floor).
  const chosen = remaining.splice(0, Math.min(minOptions, remaining.length));

  // Fill the rest, weighted toward value (skewed by reportValueBias) with a tenet
  // nudge, sampling without replacement so a tier can repeat naturally. Cards over
  // budget are down-weighted so the report leans to what the spun money can buy.
  while (chosen.length < size && remaining.length) {
    const weights = remaining.map(p => {
      const base = Math.pow(valueOf(p) + 1, SCOUT_TUNING.reportValueBias);
      const tenetMult = (tenets || []).some(t => tenetMatches(t, p)) ? SCOUT_TUNING.tenetBiasWeight : 1;
      const affordMult = valueOf(p) <= budget ? 1 : 0.15;
      return base * tenetMult * affordMult;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < remaining.length - 1; idx++) { r -= weights[idx]; if (r <= 0) break; }
    chosen.push(remaining.splice(idx, 1)[0]);
  }

  return chosen.sort((a, b) => valueOf(b) - valueOf(a)).map(p => p.id); // best value first
}

// ── Free agents (the always-on £0 floor) ──

// Genuine free agents: position-eligible, still-available players whose in-game
// value is literally £0 (the worthless bench fodder — Paul Robinson, Adrián,
// Titus Bramble…). Drawn from the FULL eligible master list, NOT the depleting
// live pool, so every position always has a couple you can sign for nothing,
// regardless of what you spun or whether they made the 5-card report. Best-rated
// first, capped to a short shortlist. Returns an array of ids.
export function buildScoutFreeAgents({
  formation, positionIndex, takenIds, valueOf = defaultValueOf,
  filterFn = () => true, limit = SCOUT_TUNING.freeAgentLimit,
}) {
  const bucket = scoutBucketForSlot(formation, positionIndex);
  if (!bucket) return [];
  const base = bucketBasePosition(bucket);
  const taken = new Set(takenIds);
  const free = [];
  for (const id of masterIdsForBucket(base, filterFn)) {
    if (taken.has(id)) continue;
    const p = PLAYER_BY_ID.get(id);
    if (!p || valueOf(p) !== 0) continue;
    free.push(p);
  }
  free.sort((a, b) => b.rating - a.rating);
  return free.slice(0, limit).map(p => p.id);
}

// ── Scouting mission (paid escape hatch, one sub slot, once per game) ──

// A scouting mission is a paid, targeted search OUTSIDE the live pool, matching a
// league/era + position brief. It returns a shortlist of up to 3 AFFORDABLE
// candidates spanning a range of quality (best / middle / lower end) so the
// manager gets a real choice — every price already includes the premium levy, so
// each option is genuinely within budget. Still tier-capped. Returns an array of
// { id, missionCost, missionPremium } (best first), or a single unaffordable
// near-miss so the UI can show what the brief just missed, or [] if nothing
// matches the brief at all.
const MISSION_SHORTLIST = 3;
export function buildScoutMission({ takenIds, squad, budget, request, tierCaps, tenets, valueOf = defaultValueOf }) {
  const taken = new Set(takenIds);
  const allowed = new Set(allowedTiers(squad, tierCaps));
  const { positions, league, era } = request; // positions: array of pos keys

  const candidates = PLAYERS.filter(p =>
    !taken.has(p.id) &&
    positions.includes(p.pos) &&
    allowed.has(p.tier) &&
    (!league || p.league === league) &&
    (!era || p.era === era)
  );
  if (candidates.length === 0) return [];

  const tenetMatch = (era && (tenets || []).some(t => t.type === "era" && t.value === era)) ||
                     (league && (tenets || []).some(t => t.type === "league" && t.value === league));
  const premium = SCOUT_TUNING.missionPremiumPct - (tenetMatch ? SCOUT_TUNING.missionTenetDiscount : 0);
  const costOf = (p) => Math.round(valueOf(p) * (1 + premium));
  const mk = (p) => ({ id: p.id, missionCost: costOf(p), missionPremium: premium });

  // Affordable AFTER the premium — sorted best-first (rating, then value, then a
  // tenet-match nudge).
  const affordable = candidates
    .filter(p => valueOf(p) * (1 + premium) <= budget)
    .sort((a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) ||
      valueOf(b) - valueOf(a) ||
      ((tenets || []).some(t => tenetMatches(t, b)) ? 1 : 0) - ((tenets || []).some(t => tenetMatches(t, a)) ? 1 : 0)
    );

  if (!affordable.length) {
    // Nothing in budget — surface the cheapest match as a single near-miss.
    const near = [...candidates].sort((a, b) => valueOf(a) - valueOf(b))[0];
    return near ? [mk(near)] : [];
  }

  // Spread the shortlist across the affordable range: top, a middle, and the
  // lower end, so it reads as a real quality choice rather than three near-clones.
  const n = affordable.length;
  const idxs = n <= MISSION_SHORTLIST
    ? affordable.map((_, i) => i)
    : [0, Math.floor((n - 1) / 2), n - 1];
  return [...new Set(idxs)].map(i => mk(affordable[i]));
}

import { PLAYERS, POSITIONS, SUB_POSITIONS, generateBudget, chooseCpuPick, WAR_CHEST_VALUES, WAR_CHEST_SLOTS, realTeamPlayerClubs } from "../data/players";
import { GROUP_SLOT_INDICES, FORMATIONS, slotEligibility } from "../data/formations";

export { generateBudget, chooseCpuPick, WAR_CHEST_VALUES, WAR_CHEST_SLOTS };

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

export function availablePlayersFor(posKey, takenIds, rouletteAssignment, eligPool = null) {
  const taken = new Set(takenIds);
  if (posKey === "GKSUB") {
    return PLAYERS.filter(p => p.pos === "GK" && !taken.has(p.id) && matchesRoulette(p, rouletteAssignment));
  }
  if (SUB_POSITIONS[posKey]) {
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

export function applyPick(d, player) {
  const activeIdx = d.currentOrder[d.turnIndex];
  const budget = d.currentBudget ?? 0;
  const isRandomStarter = d.positionMode === "random" && d.positionIndex < 11;

  const managers = d.managers.map((m, i) => {
    if (i !== activeIdx) return m;
    if (!player) return { ...m, carryover: budget };
    const squad = [...m.squad];
    const squadSlot = (isRandomStarter && d.currentSlot !== null && d.currentSlot !== undefined)
      ? d.currentSlot
      : d.positionIndex;
    squad[squadSlot] = { ...player };
    return { ...m, squad, carryover: d.noCarryoverNext ? 0 : budget - player.value };
  });

  const takenIds = player ? [...d.takenIds, player.id] : d.takenIds;
  const n = d.currentOrder.length;
  const newTurnIndex = d.turnIndex + 1;

  if (newTurnIndex >= n) {
    const newPositionIndex = d.positionIndex + 1;
    if (newPositionIndex >= POSITIONS.length) {
      return { ...d, managers, takenIds, positionIndex: newPositionIndex, phase: "complete", currentSlot: null };
    }
    const newRound = d.round + 1;
    return {
      ...d,
      managers,
      takenIds,
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
  return { ...d, managers, takenIds, turnIndex: newTurnIndex, currentBudget: null, noCarryoverNext: false, currentSlot: null };
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

export function selectGamePlayers(filter = {}, { perLeagueDedup = false } = {}) {
  const { eras, leagues, tiers } = filter;
  const pool = PLAYERS.filter(p =>
    (!leagues || leagues.includes(p.league)) &&
    (!tiers   || tiers.includes(p.tier)) &&
    // Legends bypass the era filter — they're gated by their own league toggle
    (p.league === "legends" || !eras || eras.includes(p.era))
  );
  // Normally one card per real player (deduped by name). In Real Teams mode we dedupe
  // per-league instead, so each league's version survives (e.g. a Man Utd Ronaldo AND a
  // Real Madrid Ronaldo) and an assigned CPU can find the card for its own league.
  const byName = {};
  for (const player of pool) {
    const key = perLeagueDedup ? `${player.name}|${player.league}` : player.name;
    if (!byName[key]) byName[key] = [player];
    else byName[key].push(player);
  }
  const availableIds = new Set();
  for (const versions of Object.values(byName)) {
    const selected = versions[Math.floor(Math.random() * versions.length)];
    availableIds.add(selected.id);
  }
  return availableIds;
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

export function randomizePlayerValues(availablePlayerIds) {
  const playerValues = new Map();
  for (const player of PLAYERS) {
    if (availablePlayerIds.has(player.id)) {
      const min = player.valueMin || 0;
      const max = player.valueMax || 0;
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
      tactics: "balanced",
      formation: c.formation || "4-3-3",
      assignedEra: rouletteAssignments[i].era,
      assignedLeague: rouletteAssignments[i].league,
      realClub,
      ownClubIds: realClub ? computeOwnClubIds(realClub) : [],
    };
  });
  const basePool = selectGamePlayers(options.playerFilter, { perLeagueDedup: !!options.realTeams });
  const { availablePlayerIds, poolIds } = buildRealTeamsPool(basePool, managers);
  const playerValues = options.dynamicValues !== false ? randomizePlayerValues(availablePlayerIds) : new Map();
  const playerForm = options.dynamicForm !== false ? generatePlayerForm(availablePlayerIds) : new Map();
  const playerOrder = generatePlayerOrder(availablePlayerIds);
  return {
    managers,
    realTeams: !!options.realTeams,
    draftRoulette: options.draftRoulette || null,
    positionIndex: 0,
    turnIndex: 0,
    round: 0,
    currentBudget: null,
    currentOrder: initialOrder,
    snakeOrder: initialOrder,
    takenIds: [],
    availablePlayerIds,
    poolIds,
    playerValues,
    playerForm,
    playerOrder,
    phase: "draft",
    hideRatings: options.hideRatings || false,
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
  let players = availablePlayersFor(posKey, d.takenIds, rouletteAssignment, currentEligPool(d));
  if (d.availablePlayerIds instanceof Set) {
    players = players.filter(p => isDraftableBy(d, activeManager, p.id));
  }
  players = dedupeByName(players, d, activeManager);
  players = players.map(p => {
    const player = { ...p };
    if (d.playerValues instanceof Map) player.value = d.playerValues.get(p.id) ?? p.value;
    return player;
  });
  const acceptable = CPU_POS_ACCEPTABLE[posKey];
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

export function resolveCurrentPos(d) {
  if (!d || d.warChest) return null;
  const slotIndex = (d.positionMode === "random" && d.positionIndex < 11 && d.currentSlot !== null && d.currentSlot !== undefined)
    ? d.currentSlot
    : d.positionIndex;
  const formation = activeFormation(d);
  const entry = formationEntry(formation, slotIndex);
  const key = entry.pos;
  const displayKey = entry.label ?? key;
  return { key, label: POS_LABELS[displayKey] ?? displayKey, slot: slotIndex };
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
  const availablePlayerIds = selectGamePlayers(options.playerFilter);
  const playerValues = options.dynamicValues !== false ? randomizePlayerValues(availablePlayerIds) : new Map();
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
    availablePlayerIds,
    playerValues,
    playerForm,
    playerOrder,
    hideRatings: options.hideRatings || false,
    difficulty: options.difficulty || "hard",
    dynamicForm: options.dynamicForm !== false,
    dynamicValues: options.dynamicValues !== false,
    phase: "draft",
    series: buildWCSeries(orderedClubs.length, options.format),
  };
}

export function getWarChestPlayersForSlot(slotIdx, takenIds, availablePlayerIds, playerValues, playerForm, rouletteAssignment) {
  const slotDef = WAR_CHEST_SLOTS[slotIdx];
  if (!slotDef) return [];
  const taken = new Set(takenIds);
  return PLAYERS
    .filter(p =>
      slotDef.posFilter.includes(p.pos) &&
      !taken.has(p.id) &&
      (!availablePlayerIds || availablePlayerIds.has(p.id)) &&
      matchesRoulette(p, rouletteAssignment)
    )
    .map(p => {
      const player = { ...p };
      if (playerValues instanceof Map) player.value = playerValues.get(p.id) ?? p.value;
      if (playerForm instanceof Map) player.form = playerForm.get(p.id) ?? 0;
      return player;
    });
}

// Pick ATT slots first so they get the biggest share of budget.
// Slot indices: 0=GK, 1=DEF, 2=MID, 3=ATT, 4=ATT
const WC_PICK_ORDER = [3, 4, 0, 2, 1];
// Budget fraction ceiling per slot (sums to 1.0)
const WC_MAX_FRACTION = { 3: 0.30, 4: 0.26, 0: 0.22, 2: 0.14, 1: 0.08 };
// ATT slots: exclude purely defensive positions even if posFilter allows them
const WC_ATT_EXCLUDE_POS = ["CB", "LB", "RB", "DM"];

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

  for (const slot of WC_PICK_ORDER) {
    const slotDef = WAR_CHEST_SLOTS[slot];
    const maxForSlot = Math.floor(budget * WC_MAX_FRACTION[slot]);
    const isAttSlot = slot === 3 || slot === 4;
    const affordable = PLAYERS
      .filter(p =>
        slotDef.posFilter.includes(p.pos) &&
        !takenIds.includes(p.id) &&
        d.availablePlayerIds.has(p.id) &&
        !(isAttSlot && WC_ATT_EXCLUDE_POS.includes(p.pos)) &&
        matchesRoulette(p, rouletteAssignment)
      )
      .map(p => {
        const value = d.playerValues instanceof Map ? (d.playerValues.get(p.id) ?? p.value) : p.value;
        return { ...p, value };
      })
      .filter(p => p.value <= Math.min(budgetRemaining, maxForSlot))
      .sort((a, b) => b.rating - a.rating);

    if (affordable.length > 0) {
      const topN = affordable.slice(0, Math.min(3, affordable.length));
      const pick = topN[Math.floor(Math.random() * topN.length)];
      squad[slot] = pick;
      takenIds.push(pick.id);
      budgetRemaining -= pick.value;
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
export function autoFillWarChestSlot({ chestBudget, wcBudgetRemaining, squad, availablePlayerIds, playerValues, difficulty, rouletteAssignment }) {
  const values = WAR_CHEST_VALUES[difficulty] || WAR_CHEST_VALUES.hard;
  const budget = chestBudget ?? values[Math.floor(Math.random() * values.length)];
  let budgetRemaining = chestBudget == null ? budget : (wcBudgetRemaining ?? budget);
  const filledSquad = squad ? [...squad] : Array(16).fill(null);
  const takenIds = filledSquad.filter(Boolean).map(p => p.id);

  for (const slot of WC_PICK_ORDER) {
    if (filledSquad[slot]) continue;
    const slotDef = WAR_CHEST_SLOTS[slot];
    const maxForSlot = Math.floor(budget * WC_MAX_FRACTION[slot]);
    const isAttSlot = slot === 3 || slot === 4;
    const affordable = PLAYERS
      .filter(p =>
        slotDef.posFilter.includes(p.pos) &&
        !takenIds.includes(p.id) &&
        (!availablePlayerIds || availablePlayerIds.has(p.id)) &&
        !(isAttSlot && WC_ATT_EXCLUDE_POS.includes(p.pos)) &&
        matchesRoulette(p, rouletteAssignment)
      )
      .map(p => {
        const value = playerValues instanceof Map ? (playerValues.get(p.id) ?? p.value) : p.value;
        return { ...p, value };
      })
      .filter(p => p.value <= Math.min(budgetRemaining, maxForSlot))
      .sort((a, b) => b.rating - a.rating);

    if (affordable.length > 0) {
      const topN = affordable.slice(0, Math.min(3, affordable.length));
      const pick = topN[Math.floor(Math.random() * topN.length)];
      filledSquad[slot] = pick;
      takenIds.push(pick.id);
      budgetRemaining -= pick.value;
    }
  }

  return { chestBudget: budget, wcBudgetRemaining: budgetRemaining, squad: filledSquad };
}

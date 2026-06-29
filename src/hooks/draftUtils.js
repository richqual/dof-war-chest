import { PLAYERS, POSITIONS, SUB_POSITIONS, generateBudget, chooseCpuPick, WAR_CHEST_VALUES, WAR_CHEST_SLOTS } from "../data/players";
import { GROUP_SLOT_INDICES, FORMATIONS } from "../data/formations";

export { generateBudget, chooseCpuPick, WAR_CHEST_VALUES, WAR_CHEST_SLOTS };

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
    playerValues: objToMap(draft.playerValues),
    playerForm:   objToMap(draft.playerForm),
    playerOrder:  objToMap(draft.playerOrder),
  };
}

export function availablePlayersFor(posKey, takenIds) {
  const taken = new Set(takenIds);
  if (posKey === "GKSUB") {
    return PLAYERS.filter(p => p.pos === "GK" && !taken.has(p.id));
  }
  if (SUB_POSITIONS[posKey]) {
    return PLAYERS.filter(p => SUB_POSITIONS[posKey].includes(p.pos) && !taken.has(p.id));
  }
  if (posKey === "GK") {
    return PLAYERS.filter(p => p.pos === "GK" && !taken.has(p.id));
  }
  return PLAYERS.filter(p => p.pos !== "GK" && !taken.has(p.id));
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

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function selectGamePlayers(filter = {}) {
  const { eras, leagues, tiers } = filter;
  const pool = PLAYERS.filter(p =>
    (!leagues || leagues.includes(p.league)) &&
    (!tiers   || tiers.includes(p.tier)) &&
    // Legends bypass the era filter — they're gated by their own league toggle
    (p.league === "legends" || !eras || eras.includes(p.era))
  );
  const byName = {};
  for (const player of pool) {
    if (!byName[player.name]) byName[player.name] = [player];
    else byName[player.name].push(player);
  }
  const availableIds = new Set();
  for (const versions of Object.values(byName)) {
    const selected = versions[Math.floor(Math.random() * versions.length)];
    availableIds.add(selected.id);
  }
  return availableIds;
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
  const availablePlayerIds = selectGamePlayers(options.playerFilter);
  const playerValues = options.dynamicValues !== false ? randomizePlayerValues(availablePlayerIds) : new Map();
  const playerForm = options.dynamicForm !== false ? generatePlayerForm(availablePlayerIds) : new Map();
  const playerOrder = generatePlayerOrder(availablePlayerIds);
  return {
    managers: clubs.map((c, i) => ({
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
    })),
    positionIndex: 0,
    turnIndex: 0,
    round: 0,
    currentBudget: null,
    currentOrder: initialOrder,
    snakeOrder: initialOrder,
    takenIds: [],
    availablePlayerIds,
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
  let players = availablePlayersFor(posKey, d.takenIds);
  if (d.availablePlayerIds instanceof Set) {
    players = players.filter(p => d.availablePlayerIds.has(p.id));
  }
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

  // Randomise human draft order, keep computers at the end
  const humans = clubs.filter(c => !c.isComputer);
  const computers = clubs.filter(c => c.isComputer);
  for (let i = humans.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [humans[i], humans[j]] = [humans[j], humans[i]];
  }
  const orderedClubs = [...humans, ...computers];

  return {
    warChest: true,
    managers: orderedClubs.map(c => ({
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
    })),
    wcCurrentManagerIdx: 0,
    wcPhase: "selecting",
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

export function getWarChestPlayersForSlot(slotIdx, takenIds, availablePlayerIds, playerValues, playerForm) {
  const slotDef = WAR_CHEST_SLOTS[slotIdx];
  if (!slotDef) return [];
  const taken = new Set(takenIds);
  return PLAYERS
    .filter(p =>
      slotDef.posFilter.includes(p.pos) &&
      !taken.has(p.id) &&
      (!availablePlayerIds || availablePlayerIds.has(p.id))
    )
    .map(p => {
      const player = { ...p };
      if (playerValues instanceof Map) player.value = playerValues.get(p.id) ?? p.value;
      if (playerForm instanceof Map) player.form = playerForm.get(p.id) ?? 0;
      return player;
    });
}

export function autoBuildWarChestSquad(d, managerIdx) {
  const values = WAR_CHEST_VALUES[d.difficulty] || WAR_CHEST_VALUES.hard;
  const budget = values[Math.floor(Math.random() * values.length)];
  let takenIds = [...d.takenIds];
  let budgetRemaining = budget;
  const squad = Array(16).fill(null);

  // Pick ATT slots first so they get the biggest share of budget.
  // Slot indices: 0=GK, 1=DEF, 2=MID, 3=ATT, 4=ATT
  const PICK_ORDER = [3, 4, 0, 2, 1];
  // Budget fraction ceiling per slot (sums to 1.0)
  const MAX_FRACTION = { 3: 0.30, 4: 0.26, 0: 0.22, 2: 0.14, 1: 0.08 };
  // ATT slots: exclude purely defensive positions even if posFilter allows them
  const ATT_EXCLUDE_POS = ["CB", "LB", "RB", "DM"];

  for (const slot of PICK_ORDER) {
    const slotDef = WAR_CHEST_SLOTS[slot];
    const maxForSlot = Math.floor(budget * MAX_FRACTION[slot]);
    const isAttSlot = slot === 3 || slot === 4;
    const affordable = PLAYERS
      .filter(p =>
        slotDef.posFilter.includes(p.pos) &&
        !takenIds.includes(p.id) &&
        d.availablePlayerIds.has(p.id) &&
        !(isAttSlot && ATT_EXCLUDE_POS.includes(p.pos))
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

import { useState, useEffect } from "react";
import { PLAYERS, POSITIONS, SUB_POSITIONS, generateBudget, chooseCpuPick } from "../data/players";
import { GROUP_SLOT_INDICES, FORMATIONS } from "../data/formations";

const POS_LABELS = {
  GK: "Goalkeeper", RB: "Right Back", LB: "Left Back", CB: "Centre Back",
  DM: "Def. Mid", CM: "Midfielder", MF: "Midfielder", CAM: "Att. Mid", AM: "Att. Mid",
  RW: "Right Winger", LW: "Left Winger", ST: "Striker",
  RM: "Right Mid", LM: "Left Mid",
};

function formationEntry(formation, slotIndex) {
  return FORMATIONS[formation]?.[slotIndex] ?? { pos: POSITIONS[slotIndex]?.key ?? "MF" };
}

function formationPos(formation, slotIndex) {
  return formationEntry(formation, slotIndex).pos;
}

const STORAGE_KEY = "transfer-game-state";
const STORAGE_VERSION = 5; // bump when serialization format changes

function serializeDraft(draft) {
  if (!draft) return draft;
  return {
    ...draft,
    availablePlayerIds: draft.availablePlayerIds instanceof Set
      ? [...draft.availablePlayerIds]
      : draft.availablePlayerIds,
    playerValues: draft.playerValues instanceof Map
      ? [...draft.playerValues]
      : draft.playerValues,
    playerForm: draft.playerForm instanceof Map
      ? [...draft.playerForm]
      : draft.playerForm,
    playerOrder: draft.playerOrder instanceof Map
      ? [...draft.playerOrder]
      : draft.playerOrder,
  };
}

function deserializeDraft(draft) {
  if (!draft) return draft;
  return {
    ...draft,
    availablePlayerIds: Array.isArray(draft.availablePlayerIds)
      ? new Set(draft.availablePlayerIds)
      : draft.availablePlayerIds instanceof Set
        ? draft.availablePlayerIds
        : new Set(),
    playerValues: Array.isArray(draft.playerValues)
      ? new Map(draft.playerValues)
      : draft.playerValues instanceof Map
        ? draft.playerValues
        : new Map(),
    playerForm: Array.isArray(draft.playerForm)
      ? new Map(draft.playerForm)
      : draft.playerForm instanceof Map
        ? draft.playerForm
        : new Map(),
    playerOrder: Array.isArray(draft.playerOrder)
      ? new Map(draft.playerOrder)
      : draft.playerOrder instanceof Map
        ? draft.playerOrder
        : new Map(),
  };
}

const CPU_POS_ACCEPTABLE = {
  GK:  ["GK"],
  CB:  ["CB", "LB", "RB", "DM", "CM"],
  LB:  ["LB", "RB", "CB", "DM", "CM"],
  RB:  ["RB", "LB", "CB", "DM", "CM"],
  DM:  ["DM", "CM", "CB"],
  CM:  ["CM", "CAM", "DM", "LM", "RM", "LW", "RW"],
  CAM: ["CAM", "CM", "RM", "LM", "LW", "RW"],
  RM:  ["RM", "RW", "CM", "CAM"],
  LM:  ["LM", "LW", "CM", "CAM"],
  LW:  ["LW", "LM", "RW", "RM", "CAM", "CM"],
  RW:  ["RW", "RM", "LW", "LM", "CAM", "CM"],
  ST:  ["ST", "LW", "RW", "CAM"],
  DEFSUB: ["RB", "LB", "CB"],
  MIDSUB: ["DM", "CM", "CAM"],
  WIDSUB: ["RM", "LM", "RW", "LW"],
  ATTSUB: ["ST"],
};

function availablePlayersFor(posKey, takenIds) {
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
  // Outfield starting slots: return the full outfield pool.
  // Position filtering is handled in the UI via position chips.
  return PLAYERS.filter(p => p.pos !== "GK" && !taken.has(p.id));
}

// Applies one turn to a draft state: the active manager signs `player`
// (or banks the whole budget as carryover when player is null), then the
// turn/position/order advance exactly as before. Pure — returns the next state.
function applyPick(d, player) {
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
      currentOrder: Array.from({ length: n }, (_, i) => (i + newRound) % n),
      phase: "draft",
    };
  }
  return { ...d, managers, takenIds, turnIndex: newTurnIndex, currentBudget: null, noCarryoverNext: false, currentSlot: null };
}

const FORMAT_TARGETS = { bo3: 2, bo5: 3, bo7: 4, single: 1 };

function buildSeries(n, format) {
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
      stage: "draw",   // DrawScreen will advance this to "semis"
      semis: null,     // set after draw
      final: null,
      champion: null,
    };
  }
  return null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Randomly select one version per player (by name) to be available in this game.
// Returns a Set of player IDs that should be available.
function selectGamePlayers(filter = {}) {
  const { eras, leagues, tiers } = filter;
  const pool = PLAYERS.filter(p =>
    (!eras   || eras.includes(p.era)) &&
    (!leagues || leagues.includes(p.league)) &&
    (!tiers  || tiers.includes(p.tier))
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

// Randomize player values within their valueMin/valueMax range for this game.
// Returns a Map of playerID → randomValue.
function randomizePlayerValues(availablePlayerIds) {
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

// Generate random form (-2 to +2) for each available player with weighted distribution.
// Returns a Map of playerID → formBonus.
// Form is hidden during draft, revealed on squad screen.
// Distribution: ±2 (10%), ±1 (20%), 0 (40%)
function generatePlayerForm(availablePlayerIds) {
  const playerForm = new Map();
  for (const playerId of availablePlayerIds) {
    const rand = Math.random();
    let form;
    if (rand < 0.1) form = -2;           // 10%: Very poor form
    else if (rand < 0.3) form = -1;      // 20%: Poor form
    else if (rand < 0.7) form = 0;       // 40%: Normal form
    else if (rand < 0.9) form = 1;       // 20%: Good form
    else form = 2;                       // 10%: Very hot form
    playerForm.set(playerId, form);
  }
  return playerForm;
}

// Convert form value to arrow emoji
function getFormArrow(formValue) {
  switch (formValue) {
    case 2: return "↑";
    case 1: return "↗";
    case 0: return "→";
    case -1: return "↘";
    case -2: return "↓";
    default: return "→";
  }
}

// Generate random display order for players in this game (for tier-based grouping).
// Returns a Map of playerID → randomOrder (0-1 value for sorting within tiers).
function generatePlayerOrder(availablePlayerIds) {
  const playerOrder = new Map();
  for (const playerId of availablePlayerIds) {
    playerOrder.set(playerId, Math.random());
  }
  return playerOrder;
}

function buildInitialDraft(clubs, options = {}) {
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
    takenIds: [],
    availablePlayerIds,
    playerValues,
    playerForm,
    playerOrder,
    phase: "draft",
    hideRatings: options.hideRatings || false,
    difficulty: options.difficulty || "normal",
    series: buildSeries(n, options.format),
    managerTiming: options.managerTiming || "before",
    positionMode: options.positionMode || "fixed",
    currentSlot: null,
  };
}

export function useDraftState() {
  const [screen, setScreen] = useState("setup");
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Discard saves from older format versions — they have corrupted Maps/Sets
        if (parsed.v === STORAGE_VERSION && parsed.draft && parsed.screen) {
          setDraft(deserializeDraft(parsed.draft));
          setScreen(parsed.screen);
        } else if (parsed.v !== STORAGE_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (draft) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, draft: serializeDraft(draft), screen }));
      } catch (_) {}
    }
  }, [draft, screen]);

  function startGame(clubs, options) {
    const d = buildInitialDraft(clubs, options);
    setDraft(d);
    setScreen("order-draw");
  }

  // Called by DrawScreen once the animated draw is complete.
  function completeDraw(drawOrder) {
    setDraft(prev => ({
      ...prev,
      series: {
        ...prev.series,
        stage: "semis",
        semis: [
          { p: [drawOrder[0], drawOrder[1]], goals: [0, 0], legsPlayed: 0, winner: null },
          { p: [drawOrder[2], drawOrder[3]], goals: [0, 0], legsPlayed: 0, winner: null },
        ],
      },
    }));
    setScreen("series");
  }

  // Called by MatchSim after a match ends.
  // winnerIdx is a draft.managers index; score is { home, away } goals for this match.
  // matchRatings is { home: [...], away: [...] } player rating objects from generateEvents.
  function recordMatchResult(homeIdx, awayIdx, winnerIdx, score, matchRatings, matchEvents, matchInjuries) {
    setDraft(prev => {
      const s = prev.series;
      if (!s) return prev;

      let next = prev;

      if (s.format !== "tournament") {
        const newPlayed = (s.played ?? s.wins[0] + s.wins[1]) + 1;
        const maxGames = s.target * 2 - 1;

        if (winnerIdx === null) {
          const newDraws = (s.draws ?? 0) + 1;
          const tied = newPlayed >= maxGames && s.wins[0] === s.wins[1];
          next = { ...prev, series: { ...s, draws: newDraws, played: newPlayed, stage: tied ? "tiebreaker" : "playing" } };
        } else {
          const pos = s.participants.indexOf(winnerIdx);
          if (pos < 0) return prev;
          const wins = s.wins.map((w, i) => i === pos ? w + 1 : w);
          const hitTarget = wins.some(w => w >= s.target);
          const allPlayed = newPlayed > maxGames || (newPlayed >= maxGames && wins[0] !== wins[1]);
          const champion = hitTarget || allPlayed
            ? s.participants[wins[0] >= wins[1] ? 0 : 1]
            : null;
          next = { ...prev, series: { ...s, wins, played: newPlayed, champion, stage: champion !== null ? "champion" : "playing" } };
        }
      } else {
        // Tournament — find which semi this result belongs to
        const semiIdx = (s.semis || []).findIndex(sm =>
          (sm.p[0] === homeIdx && sm.p[1] === awayIdx) ||
          (sm.p[1] === homeIdx && sm.p[0] === awayIdx)
        );
        if (semiIdx >= 0) {
          const semi = s.semis[semiIdx];
          const isP0Home = semi.p[0] === homeIdx;
          const p0Goals = isP0Home ? (score?.home ?? 0) : (score?.away ?? 0);
          const p1Goals = isP0Home ? (score?.away ?? 0) : (score?.home ?? 0);
          const newGoals = [semi.goals[0] + p0Goals, semi.goals[1] + p1Goals];
          const newLegsPlayed = semi.legsPlayed + 1;

          let semiWinner = null;
          let wonOnPens = false;
          if (newLegsPlayed >= 2) {
            if (newGoals[0] > newGoals[1]) semiWinner = semi.p[0];
            else if (newGoals[1] > newGoals[0]) semiWinner = semi.p[1];
            else { semiWinner = winnerIdx; wonOnPens = true; }
          }

          const newSemis = s.semis.map((sm, i) =>
            i === semiIdx ? { ...sm, goals: newGoals, legsPlayed: newLegsPlayed, winner: semiWinner, wonOnPens } : sm
          );
          const bothDone = newSemis.every(sm => sm.winner !== null);
          const newFinal = bothDone && !s.final
            ? { p: newSemis.map(sm => sm.winner), wins: [0, 0], target: 1, winner: null }
            : s.final;
          next = { ...prev, series: { ...s, semis: newSemis, final: newFinal, stage: bothDone ? "final" : "semis" } };
        } else if (s.final) {
          // Final (single leg)
          const f = s.final;
          const pos = f.p.indexOf(winnerIdx);
          if (pos < 0) return prev;
          const wins = f.wins.map((w, i) => i === pos ? w + 1 : w);
          const champion = wins.some(w => w >= f.target) ? winnerIdx : null;
          next = { ...prev, series: { ...s, final: { ...f, wins, winner: champion }, champion, stage: champion !== null ? "champion" : "final" } };
        }
      }

      // Accumulate tournament stats from this match's player ratings
      if (matchRatings) {
        const stats = { ...(next.tournamentStats || {}) };
        const accum = (ratings, mgrIdx) => {
          for (const r of ratings) {
            if (!stats[r.name]) stats[r.name] = { goals: 0, assists: 0, ratings: [], managerIdx: mgrIdx };
            stats[r.name].goals += r.goals || 0;
            stats[r.name].assists += r.assists || 0;
            stats[r.name].ratings.push(r.rating);
          }
        };
        accum(matchRatings.home, homeIdx);
        accum(matchRatings.away, awayIdx);
        next = { ...next, tournamentStats: stats };
      }

      // Process suspensions & injuries
      {
        const absences = {};
        // Carry over existing absences, decrementing by 1 (remove expired ones)
        for (const [name, abs] of Object.entries(next.playerAbsences || {})) {
          if (abs.matchesRemaining > 1) absences[name] = { ...abs, matchesRemaining: abs.matchesRemaining - 1 };
        }
        // Red cards this match → 1-match suspension
        if (matchEvents) {
          const sideToIdx = { home: homeIdx, away: awayIdx };
          for (const ev of matchEvents) {
            if (ev.type === "red") {
              const mgrIdx = sideToIdx[ev.team];
              if (ev.player && mgrIdx !== undefined) {
                absences[ev.player] = { type: "suspension", mgrIdx, matchesRemaining: 1 };
              }
            }
          }
        }
        // Injuries this match → 1-match injury absence
        if (matchInjuries) {
          const sideToIdx = { home: homeIdx, away: awayIdx };
          for (const inj of matchInjuries) {
            const mgrIdx = sideToIdx[inj.team];
            if (inj.name && mgrIdx !== undefined && !absences[inj.name]) {
              absences[inj.name] = { type: "injury", mgrIdx, matchesRemaining: 1 };
            }
          }
        }
        next = { ...next, playerAbsences: absences };
      }

      return next;
    });
    setScreen("series");
  }

  // Called when the position wheel resolves — locks in which group to draft from.
  function confirmSlot(slotIndex) {
    setDraft(prev => ({ ...prev, currentSlot: slotIndex }));
  }

  // Called when spin wheel locks in a value — adds carryover and resets it
  function confirmBudget(spunVal) {
    setDraft(prev => {
      const activeIdx = prev.currentOrder[prev.turnIndex];
      const carry = prev.managers[activeIdx]?.carryover || 0;
      return {
        ...prev,
        currentBudget: spunVal + carry,
        managers: prev.managers.map((m, i) =>
          i === activeIdx ? { ...m, carryover: 0 } : m
        ),
      };
    });
  }

  function getTakenPlayers(posKey) {
    if (!draft) return [];
    const taken = new Set(draft.takenIds);
    let candidates;
    if (SUB_POSITIONS[posKey]) {
      candidates = PLAYERS.filter(p => SUB_POSITIONS[posKey].includes(p.pos) && taken.has(p.id));
    } else {
      candidates = PLAYERS.filter(p => p.pos === posKey && taken.has(p.id));
    }
    return candidates.map(player => {
      const owner = draft.managers.find(m => m.squad.some(s => s && s.id === player.id));
      const p = { ...player, ownedBy: owner ? (owner.clubName || owner.name) : null };
      // Apply randomized value and form for this game
      if (draft?.playerValues && draft.playerValues.has(p.id)) {
        p.value = draft.playerValues.get(p.id);
      }
      if (draft?.playerForm && draft.playerForm.has(p.id)) {
        const formBonus = draft.playerForm.get(p.id);
        p.rating = Math.max(0, p.rating + formBonus);
      }
      return p;
    });
  }

  // Pure version — works on any draft state object, used by autocomplete loops
  function getPlayersFromState(d, posKey) {
    let players = availablePlayersFor(posKey, d.takenIds);
    if (d.availablePlayerIds instanceof Set) {
      players = players.filter(p => d.availablePlayerIds.has(p.id));
    }
    // Apply values before position filtering so affordable check works correctly
    players = players.map(p => {
      const player = { ...p };
      if (d.playerValues instanceof Map) player.value = d.playerValues.get(p.id) ?? p.value;
      return player;
    });
    // Filter by position-appropriate players for CPU; fall back to full pool if too thin
    const acceptable = CPU_POS_ACCEPTABLE[posKey];
    if (acceptable) {
      const posFiltered = players.filter(p => acceptable.includes(p.pos));
      if (posFiltered.length >= 3) players = posFiltered;
    }
    return players;
  }

  function getAvailablePlayers(posKey) {
    let players = availablePlayersFor(posKey, draft ? draft.takenIds : []);
    // Filter to only include players available in this game
    if (draft?.availablePlayerIds) {
      players = players.filter(p => draft.availablePlayerIds.has(p.id));
    }
    // Apply randomized values for this game (form is reveal-only, not applied here)
    if (draft?.playerValues) {
      players = players.map(p => ({
        ...p,
        value: draft.playerValues.get(p.id) ?? p.value,
      }));
    }
    return players;
  }

  function pickPlayer(player) {
    if (!draft) return;
    if (draft.currentBudget === null || player.value > draft.currentBudget) return;
    const next = applyPick(draft, player);
    setDraft(next);
    if (next.phase === "complete") setScreen(draft.managerTiming === "before" ? "squads" : "manager-draft");
  }

  function assignManagers(assignments) {
    // assignments: { managerIdx: managerObject }
    setDraft(prev => ({
      ...prev,
      managers: prev.managers.map((m, i) =>
        assignments[i] ? { ...m, footballManager: assignments[i] } : m
      ),
    }));
    // "before" timing: managers assigned before player draft, so now go to draft
    // "after" timing: managers assigned after player draft, so now go to squads/series
    if (draft.managerTiming === "before") {
      setScreen("draft");
    } else {
      setScreen(draft.series?.stage === "draw" ? "draw" : draft.series ? "series" : "squads");
    }
  }

  // Active manager banks the whole budget as carryover and the turn moves on —
  // used when nothing is affordable (e.g. a £0 spin with no free players left).
  function respin() {
    setDraft(prev => ({
      ...prev,
      currentBudget: null,
      noCarryoverNext: true,
    }));
  }

  function skipTurn() {
    if (!draft || draft.currentBudget === null) return;
    const next = applyPick(draft, null);
    setDraft(next);
    if (next.phase === "complete") setScreen(draft.managerTiming === "before" ? "squads" : "manager-draft");
  }

  function autoDrawSlot(d) {
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

  function activeFormation(d) {
    const idx = d.currentOrder[d.turnIndex];
    return d.managers[idx]?.formation || "4-3-3";
  }

  function resolveCurrentPosKey(d) {
    const formation = activeFormation(d);
    if (d.positionMode === "random" && d.positionIndex < 11 && d.currentSlot !== null) {
      return formationPos(formation, d.currentSlot);
    }
    return formationPos(formation, d.positionIndex);
  }

  // Plays out every remaining turn instantly with CPU picks (spinning budgets
  // as needed) and jumps straight to the squads screen.
  function autoCompleteDraft() {
    if (!draft) return;
    let d = draft;
    let guard = 0;
    while (d.phase !== "complete" && guard++ < 500) {
      d = autoDrawSlot(d);
      if (d.currentBudget === null) {
        const activeIdx = d.currentOrder[d.turnIndex];
        const carry = d.noCarryoverNext ? 0 : (d.managers[activeIdx]?.carryover || 0);
        d = {
          ...d,
          currentBudget: generateBudget(d.difficulty) + carry,
          managers: d.managers.map((m, i) => i === activeIdx ? { ...m, carryover: 0 } : m),
        };
      }
      const posKey = resolveCurrentPosKey(d);
      const pick = chooseCpuPick(getPlayersFromState(d, posKey), d.currentBudget);
      if (!pick) {
        d = { ...d, currentBudget: null, noCarryoverNext: true };
        continue;
      }
      d = applyPick(d, pick);
    }
    setDraft(d);
    setScreen(d.managerTiming === "before" ? "squads" : "manager-draft");
  }

  // Runs CPU turns until the next human player's turn, then stops.
  function skipCpuTurns() {
    if (!draft) return;
    let d = draft;
    let guard = 0;
    while (d.phase !== "complete" && guard++ < 500) {
      const activeIdx = d.currentOrder[d.turnIndex];
      if (!d.managers[activeIdx].isComputer) break;
      d = autoDrawSlot(d);
      if (d.currentBudget === null) {
        const carry = d.noCarryoverNext ? 0 : (d.managers[activeIdx]?.carryover || 0);
        d = {
          ...d,
          currentBudget: generateBudget(d.difficulty) + carry,
          managers: d.managers.map((m, i) => i === activeIdx ? { ...m, carryover: 0 } : m),
        };
      }
      const posKey = resolveCurrentPosKey(d);
      const pick = chooseCpuPick(getPlayersFromState(d, posKey), d.currentBudget);
      if (!pick) {
        d = { ...d, currentBudget: null, noCarryoverNext: true };
        continue;
      }
      d = applyPick(d, pick);
    }
    setDraft(d);
    if (d.phase === "complete") setScreen(d.managerTiming === "before" ? "squads" : "manager-draft");
  }

  function setTeamName(managerIdx, name) {
    setDraft(prev => ({
      ...prev,
      managers: prev.managers.map((m, i) => i === managerIdx ? { ...m, teamName: name } : m),
    }));
  }

  function setTactics(managerIdx, tactics) {
    setDraft(prev => ({
      ...prev,
      managers: prev.managers.map((m, i) => i === managerIdx ? { ...m, tactics } : m),
    }));
  }

  function swapSquadPlayers(managerIdx, slotA, slotB) {
    setDraft(prev => ({
      ...prev,
      managers: prev.managers.map((m, i) => {
        if (i !== managerIdx) return m;
        const sq = [...m.squad];
        [sq[slotA], sq[slotB]] = [sq[slotB], sq[slotA]];
        return { ...m, squad: sq };
      }),
    }));
  }

  function restartGame() {
    setDraft(null);
    setScreen("setup");
    localStorage.removeItem(STORAGE_KEY);
  }

  function setPlayerPool(filter) {
    const availablePlayerIds = selectGamePlayers(filter);
    const playerValues = randomizePlayerValues(availablePlayerIds);
    const playerForm = generatePlayerForm(availablePlayerIds);
    const playerOrder = generatePlayerOrder(availablePlayerIds);
    setDraft(prev => ({ ...prev, availablePlayerIds, playerValues, playerForm, playerOrder }));
  }

  const activeManagerIdx = draft ? draft.currentOrder[draft.turnIndex] : 0;
  const activeManager = draft ? draft.managers[activeManagerIdx] : null;

  function resolveCurrentPos(d) {
    if (!d) return null;
    const slotIndex = (d.positionMode === "random" && d.positionIndex < 11 && d.currentSlot !== null && d.currentSlot !== undefined)
      ? d.currentSlot
      : d.positionIndex;
    const formation = activeFormation(d);
    const entry = formationEntry(formation, slotIndex);
    const key = entry.pos;
    const displayKey = entry.label ?? key;
    return { key, label: POS_LABELS[displayKey] ?? displayKey, slot: slotIndex };
  }

  const currentPos = resolveCurrentPos(draft);

  return {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, confirmSlot, pickPlayer, setTeamName,
    swapSquadPlayers, setTactics, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, respin, autoCompleteDraft, skipCpuTurns,
    completeDraw, recordMatchResult, assignManagers, setPlayerPool,
  };
}

export { getFormArrow };

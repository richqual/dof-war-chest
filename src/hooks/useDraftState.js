import { useState, useEffect } from "react";
import { PLAYERS, POSITIONS, SUB_POSITIONS, generateBudget, chooseCpuPick } from "../data/players";

const STORAGE_KEY = "transfer-game-state";

function availablePlayersFor(posKey, takenIds) {
  const taken = new Set(takenIds);
  if (posKey === "SUB") {
    return PLAYERS.filter(p => SUB_POSITIONS.includes(p.pos) && !taken.has(p.id));
  }
  return PLAYERS.filter(p => p.pos === posKey && !taken.has(p.id));
}

// Applies one turn to a draft state: the active manager signs `player`
// (or banks the whole budget as carryover when player is null), then the
// turn/position/order advance exactly as before. Pure — returns the next state.
function applyPick(d, player) {
  const activeIdx = d.currentOrder[d.turnIndex];
  const budget = d.currentBudget ?? 0;

  const managers = d.managers.map((m, i) => {
    if (i !== activeIdx) return m;
    if (!player) return { ...m, carryover: budget };
    const squad = [...m.squad];
    squad[d.positionIndex] = { ...player };
    return { ...m, squad, carryover: budget - player.value };
  });

  const takenIds = player ? [...d.takenIds, player.id] : d.takenIds;
  const n = d.currentOrder.length;
  const newTurnIndex = d.turnIndex + 1;

  if (newTurnIndex >= n) {
    const newPositionIndex = d.positionIndex + 1;
    if (newPositionIndex >= POSITIONS.length) {
      return { ...d, managers, takenIds, positionIndex: newPositionIndex, phase: "complete" };
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
      currentOrder: Array.from({ length: n }, (_, i) => (i + newRound) % n),
      phase: "draft",
    };
  }
  return { ...d, managers, takenIds, turnIndex: newTurnIndex, currentBudget: null };
}

function buildInitialDraft(clubs, options = {}) {
  const n = clubs.length;
  return {
    managers: clubs.map((c, i) => ({
      id: i,
      name: c.dofName,
      dofName: c.dofName,
      clubName: c.clubName,
      teamName: c.clubName,
      primaryColor: c.primaryColor || "#1a3a6b",
      secondaryColor: c.secondaryColor || "#ffffff",
      isComputer: !!c.isComputer,
      squad: Array(16).fill(null),
      carryover: 0,
    })),
    positionIndex: 0,
    turnIndex: 0,
    round: 0,
    currentBudget: null,
    currentOrder: Array.from({ length: n }, (_, i) => i),
    takenIds: [],
    phase: "draft",
    hideRatings: options.hideRatings || false,
    difficulty: options.difficulty || "normal",
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
        if (parsed.draft && parsed.screen) {
          setDraft(parsed.draft);
          setScreen(parsed.screen);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (draft) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, screen }));
      } catch (_) {}
    }
  }, [draft, screen]);

  function startGame(clubs, options) {
    const d = buildInitialDraft(clubs, options);
    setDraft(d);
    setScreen("draft");
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
    if (posKey === "SUB") {
      candidates = PLAYERS.filter(p => SUB_POSITIONS.includes(p.pos) && taken.has(p.id));
    } else {
      candidates = PLAYERS.filter(p => p.pos === posKey && taken.has(p.id));
    }
    return candidates.map(player => {
      const owner = draft.managers.find(m => m.squad.some(s => s && s.id === player.id));
      return { ...player, ownedBy: owner ? (owner.clubName || owner.name) : null };
    });
  }

  function getAvailablePlayers(posKey) {
    return availablePlayersFor(posKey, draft ? draft.takenIds : []);
  }

  function pickPlayer(player) {
    if (!draft) return;
    if (draft.currentBudget === null || player.value > draft.currentBudget) return;
    const next = applyPick(draft, player);
    setDraft(next);
    if (next.phase === "complete") setScreen("squads");
  }

  // Active manager banks the whole budget as carryover and the turn moves on —
  // used when nothing is affordable (e.g. a £0 spin with no free players left).
  function skipTurn() {
    if (!draft || draft.currentBudget === null) return;
    const next = applyPick(draft, null);
    setDraft(next);
    if (next.phase === "complete") setScreen("squads");
  }

  // Plays out every remaining turn instantly with CPU picks (spinning budgets
  // as needed) and jumps straight to the squads screen.
  function autoCompleteDraft() {
    if (!draft) return;
    let d = draft;
    let guard = 0;
    while (d.phase !== "complete" && guard++ < 500) {
      if (d.currentBudget === null) {
        const activeIdx = d.currentOrder[d.turnIndex];
        const carry = d.managers[activeIdx]?.carryover || 0;
        d = {
          ...d,
          currentBudget: generateBudget(d.difficulty) + carry,
          managers: d.managers.map((m, i) => i === activeIdx ? { ...m, carryover: 0 } : m),
        };
      }
      const posKey = POSITIONS[d.positionIndex].key;
      const pick = chooseCpuPick(availablePlayersFor(posKey, d.takenIds), d.currentBudget);
      d = applyPick(d, pick);
    }
    setDraft(d);
    setScreen("squads");
  }

  function setTeamName(managerIdx, name) {
    setDraft(prev => ({
      ...prev,
      managers: prev.managers.map((m, i) => i === managerIdx ? { ...m, teamName: name } : m),
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

  const activeManagerIdx = draft ? draft.currentOrder[draft.turnIndex] : 0;
  const activeManager = draft ? draft.managers[activeManagerIdx] : null;
  const currentPos = draft ? POSITIONS[draft.positionIndex] : null;

  return {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, pickPlayer, setTeamName,
    swapSquadPlayers, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, autoCompleteDraft,
  };
}

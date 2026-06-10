import { useState, useEffect } from "react";
import { PLAYERS, POSITIONS, SUB_POSITIONS } from "../data/players";

const STORAGE_KEY = "transfer-game-state";

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
    const taken = new Set(draft ? draft.takenIds : []);
    if (posKey === "SUB") {
      return PLAYERS.filter(p => SUB_POSITIONS.includes(p.pos) && !taken.has(p.id));
    }
    return PLAYERS.filter(p => p.pos === posKey && !taken.has(p.id));
  }

  function pickPlayer(player) {
    if (!draft) return;
    const {
      currentBudget, currentOrder, turnIndex, positionIndex,
      managers, round, takenIds,
    } = draft;

    if (currentBudget === null || player.value > currentBudget) return;

    const activeIdx = currentOrder[turnIndex];
    const remaining = currentBudget - player.value;

    const newManagers = managers.map((m, i) => {
      if (i !== activeIdx) return m;
      const newSquad = [...m.squad];
      newSquad[positionIndex] = { ...player };
      return { ...m, squad: newSquad, carryover: remaining };
    });

    const newTakenIds = [...takenIds, player.id];
    const n = currentOrder.length;
    const newTurnIndex = turnIndex + 1;

    if (newTurnIndex >= n) {
      const newPositionIndex = positionIndex + 1;
      if (newPositionIndex >= POSITIONS.length) {
        setDraft({ ...draft, managers: newManagers, takenIds: newTakenIds, positionIndex: newPositionIndex, phase: "complete" });
        setScreen("squads");
        return;
      }
      const newRound = round + 1;
      const rotated = Array.from({ length: n }, (_, i) => (i + newRound) % n);
      setDraft({
        ...draft,
        managers: newManagers,
        takenIds: newTakenIds,
        positionIndex: newPositionIndex,
        turnIndex: 0,
        round: newRound,
        currentBudget: null,
        currentOrder: rotated,
        phase: "draft",
      });
    } else {
      setDraft({
        ...draft,
        managers: newManagers,
        takenIds: newTakenIds,
        turnIndex: newTurnIndex,
        currentBudget: null,
      });
    }
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
  };
}

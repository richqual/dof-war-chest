import { useState, useEffect } from "react";
import { PLAYERS, POSITIONS, SUB_POSITIONS, generateBudget, chooseCpuPick } from "../data/players";

const STORAGE_KEY = "transfer-game-state";

function availablePlayersFor(posKey, takenIds) {
  const taken = new Set(takenIds);
  if (posKey === "GKSUB") {
    return PLAYERS.filter(p => p.pos === "GK" && !taken.has(p.id));
  }
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

const FORMAT_TARGETS = { bo3: 2, bo5: 3, bo7: 4, single: 1 };

function buildSeries(n, format) {
  if (!format || format === "single") return null;
  if (n === 2) {
    return {
      format,
      participants: [0, 1],
      wins: [0, 0],
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
      pattern: c.pattern || "plain",
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
    series: buildSeries(n, options.format),
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
  function recordMatchResult(homeIdx, awayIdx, winnerIdx, score) {
    setDraft(prev => {
      const s = prev.series;
      if (!s) return prev;

      if (s.format !== "tournament") {
        const pos = s.participants.indexOf(winnerIdx);
        if (pos < 0) return prev;
        const wins = s.wins.map((w, i) => i === pos ? w + 1 : w);
        const champion = wins.some(w => w >= s.target)
          ? s.participants[wins.findIndex(w => w >= s.target)]
          : null;
        return { ...prev, series: { ...s, wins, champion, stage: champion !== null ? "champion" : "playing" } };
      }

      // Tournament — find which semi this result belongs to
      const semiIdx = (s.semis || []).findIndex(sm =>
        (sm.p[0] === homeIdx && sm.p[1] === awayIdx) ||
        (sm.p[1] === homeIdx && sm.p[0] === awayIdx)
      );
      if (semiIdx >= 0) {
        const semi = s.semis[semiIdx];
        const isReplay = semi.legsPlayed >= 2;
        let newGoals, newLegsPlayed, semiWinner;

        if (isReplay) {
          // Replay after aggregate level — winner is the match winner (ET/pens included)
          newGoals = semi.goals;
          newLegsPlayed = semi.legsPlayed + 1;
          semiWinner = winnerIdx;
        } else {
          // Regular leg — add this match's goals to the aggregate
          const isP0Home = semi.p[0] === homeIdx;
          const p0Goals = isP0Home ? (score?.home ?? 0) : (score?.away ?? 0);
          const p1Goals = isP0Home ? (score?.away ?? 0) : (score?.home ?? 0);
          newGoals = [semi.goals[0] + p0Goals, semi.goals[1] + p1Goals];
          newLegsPlayed = semi.legsPlayed + 1;

          if (newLegsPlayed >= 2) {
            if (newGoals[0] > newGoals[1]) semiWinner = semi.p[0];
            else if (newGoals[1] > newGoals[0]) semiWinner = semi.p[1];
            // else null → level on aggregate, replay needed
          }
        }

        const newSemis = s.semis.map((sm, i) =>
          i === semiIdx ? { ...sm, goals: newGoals, legsPlayed: newLegsPlayed, winner: semiWinner } : sm
        );
        const bothDone = newSemis.every(sm => sm.winner !== null);
        const newFinal = bothDone && !s.final
          ? { p: newSemis.map(sm => sm.winner), wins: [0, 0], target: 1, winner: null }
          : s.final;
        return { ...prev, series: { ...s, semis: newSemis, final: newFinal, stage: bothDone ? "final" : "semis" } };
      }

      // Final (single leg)
      if (s.final) {
        const f = s.final;
        const pos = f.p.indexOf(winnerIdx);
        if (pos < 0) return prev;
        const wins = f.wins.map((w, i) => i === pos ? w + 1 : w);
        const champion = wins.some(w => w >= f.target) ? winnerIdx : null;
        return { ...prev, series: { ...s, final: { ...f, wins, winner: champion }, champion, stage: champion !== null ? "champion" : "final" } };
      }

      return prev;
    });
    setScreen("series");
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
    if (next.phase === "complete") setScreen(next.series?.stage === "draw" ? "draw" : next.series ? "series" : "squads");
  }

  // Active manager banks the whole budget as carryover and the turn moves on —
  // used when nothing is affordable (e.g. a £0 spin with no free players left).
  function skipTurn() {
    if (!draft || draft.currentBudget === null) return;
    const next = applyPick(draft, null);
    setDraft(next);
    if (next.phase === "complete") setScreen(next.series?.stage === "draw" ? "draw" : next.series ? "series" : "squads");
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
    setScreen(d.series?.stage === "draw" ? "draw" : d.series ? "series" : "squads");
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
    completeDraw, recordMatchResult,
  };
}

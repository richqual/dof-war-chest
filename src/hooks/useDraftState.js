import { useState, useEffect } from "react";
import { PLAYERS, SUB_POSITIONS, generateBudget, chooseCpuPick } from "../data/players";
import {
  STORAGE_KEY, STORAGE_VERSION,
  serializeDraft, deserializeDraft,
  applyPick, buildInitialDraft,
  availablePlayersFor, getPlayersFromState,
  autoDrawSlot, activeFormation, resolveCurrentPosKey, resolveCurrentPos,
  selectGamePlayers, randomizePlayerValues, generatePlayerForm, generatePlayerOrder,
  buildRealTeamsPool, isDraftableBy,
  POS_LABELS, getFormArrow,
  buildInitialWarChestDraft, getWarChestPlayersForSlot, autoBuildWarChestSquad,
  appendSeriesHistory,
} from "./draftUtils";

export { getFormArrow };

export function useDraftState() {
  const [screen, setScreen] = useState("setup");
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
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
    setScreen(options?.draftRoulette?.enabled ? "draft-roulette" : "order-draw");
  }

  function completeDraw(drawOrder) {
    setDraft(prev => {
      const fmt = prev.series?.format;
      if (fmt === "tournament8") {
        return {
          ...prev,
          series: {
            ...prev.series,
            stage: "quarters",
            quarters: [
              { p: [drawOrder[0], drawOrder[1]], goals: [0, 0], legsPlayed: 0, winner: null },
              { p: [drawOrder[2], drawOrder[3]], goals: [0, 0], legsPlayed: 0, winner: null },
              { p: [drawOrder[4], drawOrder[5]], goals: [0, 0], legsPlayed: 0, winner: null },
              { p: [drawOrder[6], drawOrder[7]], goals: [0, 0], legsPlayed: 0, winner: null },
            ],
          },
        };
      }
      return {
        ...prev,
        series: {
          ...prev.series,
          stage: "semis",
          semis: [
            { p: [drawOrder[0], drawOrder[1]], goals: [0, 0], legsPlayed: 0, winner: null },
            { p: [drawOrder[2], drawOrder[3]], goals: [0, 0], legsPlayed: 0, winner: null },
          ],
        },
      };
    });
    setScreen("series");
  }

  function recordMatchResult(homeIdx, awayIdx, winnerIdx, score, matchRatings, matchEvents, matchInjuries) {
    setDraft(prev => {
      const s = prev.series;
      if (!s) return prev;

      let next = prev;

      if (s.format !== "tournament" && s.format !== "tournament8") {
        const newPlayed = (s.played ?? s.wins[0] + s.wins[1]) + 1;
        const maxGames = s.target * 2 - 1;
        const history = appendSeriesHistory(s, homeIdx, awayIdx, score, winnerIdx);

        if (winnerIdx === null) {
          const newDraws = (s.draws ?? 0) + 1;
          const allPlayed = newPlayed >= maxGames;
          const tied = allPlayed && s.wins[0] === s.wins[1];
          const champion = allPlayed && !tied
            ? s.participants[s.wins[0] >= s.wins[1] ? 0 : 1]
            : null;
          next = { ...prev, series: { ...s, draws: newDraws, played: newPlayed, champion, history, stage: champion !== null ? "champion" : (tied ? "tiebreaker" : "playing") } };
        } else {
          const pos = s.participants.indexOf(winnerIdx);
          if (pos < 0) return prev;
          const wins = s.wins.map((w, i) => i === pos ? w + 1 : w);
          const hitTarget = wins.some(w => w >= s.target);
          const allPlayed = newPlayed > maxGames || (newPlayed >= maxGames && wins[0] !== wins[1]);
          const champion = hitTarget || allPlayed
            ? s.participants[wins[0] >= wins[1] ? 0 : 1]
            : null;
          next = { ...prev, series: { ...s, wins, played: newPlayed, champion, history, stage: champion !== null ? "champion" : "playing" } };
        }
      } else if (s.format === "tournament8") {
        const qIdx = (s.quarters || []).findIndex(q =>
          q.winner === null &&
          ((q.p[0] === homeIdx && q.p[1] === awayIdx) ||
           (q.p[1] === homeIdx && q.p[0] === awayIdx))
        );
        if (qIdx >= 0) {
          const q = s.quarters[qIdx];
          const isP0Home = q.p[0] === homeIdx;
          const p0Goals = isP0Home ? (score?.home ?? 0) : (score?.away ?? 0);
          const p1Goals = isP0Home ? (score?.away ?? 0) : (score?.home ?? 0);
          const newGoals = [q.goals[0] + p0Goals, q.goals[1] + p1Goals];
          const newLegsPlayed = q.legsPlayed + 1;
          let qWinner = null;
          let wonOnPens = false;
          if (newLegsPlayed >= (s.singleLeg ? 1 : 2)) {
            if (newGoals[0] > newGoals[1]) qWinner = q.p[0];
            else if (newGoals[1] > newGoals[0]) qWinner = q.p[1];
            else { qWinner = winnerIdx; wonOnPens = true; }
          }
          const newQuarters = s.quarters.map((qq, i) =>
            i === qIdx ? { ...qq, goals: newGoals, legsPlayed: newLegsPlayed, winner: qWinner, wonOnPens } : qq
          );
          const allQsDone = newQuarters.every(q => q.winner !== null);
          const newSemis = allQsDone && !s.semis
            ? [
                { p: [newQuarters[0].winner, newQuarters[1].winner], goals: [0, 0], legsPlayed: 0, winner: null },
                { p: [newQuarters[2].winner, newQuarters[3].winner], goals: [0, 0], legsPlayed: 0, winner: null },
              ]
            : s.semis;
          next = { ...prev, series: { ...s, quarters: newQuarters, semis: newSemis, stage: allQsDone ? "semis" : "quarters" } };
        } else {
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
            if (newLegsPlayed >= (s.singleLeg ? 1 : 2)) {
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
            const f = s.final;
            const pos = f.p.indexOf(winnerIdx);
            if (pos < 0) return prev;
            const wins = f.wins.map((w, i) => i === pos ? w + 1 : w);
            const champion = wins.some(w => w >= f.target) ? winnerIdx : null;
            next = { ...prev, series: { ...s, final: { ...f, wins, winner: champion }, champion, stage: champion !== null ? "champion" : "final" } };
          }
        }
      } else {
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
          if (newLegsPlayed >= (s.singleLeg ? 1 : 2)) {
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
          const f = s.final;
          const pos = f.p.indexOf(winnerIdx);
          if (pos < 0) return prev;
          const wins = f.wins.map((w, i) => i === pos ? w + 1 : w);
          const champion = wins.some(w => w >= f.target) ? winnerIdx : null;
          next = { ...prev, series: { ...s, final: { ...f, wins, winner: champion }, champion, stage: champion !== null ? "champion" : "final" } };
        }
      }

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

      {
        const absences = {};
        for (const [name, abs] of Object.entries(next.playerAbsences || {})) {
          if (abs.matchesRemaining > 1) absences[name] = { ...abs, matchesRemaining: abs.matchesRemaining - 1 };
        }
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

      if (next.dynamicForm && next.availablePlayerIds) {
        next = { ...next, playerForm: generatePlayerForm(next.availablePlayerIds) };
      }

      return next;
    });
    setScreen("series");
  }

  function confirmSlot(slotIndex) {
    setDraft(prev => ({ ...prev, currentSlot: slotIndex }));
  }

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

  function getAvailablePlayers(posKey) {
    const activeManager = draft?.managers?.[draft.currentOrder[draft.turnIndex]];
    const rouletteAssignment = activeManager
      ? { era: activeManager.assignedEra, league: activeManager.assignedLeague }
      : null;
    let players = availablePlayersFor(posKey, draft ? draft.takenIds : [], rouletteAssignment);
    if (draft?.availablePlayerIds) {
      players = players.filter(p => isDraftableBy(draft, activeManager, p.id));
    }
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
    setDraft(prev => ({
      ...prev,
      managers: prev.managers.map((m, i) =>
        assignments[i] ? { ...m, footballManager: assignments[i] } : m
      ),
    }));
    if (draft.managerTiming === "before") {
      setScreen("draft");
    } else {
      setScreen(draft.series?.stage === "draw" ? "draw" : draft.series ? "series" : "squads");
    }
  }

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
      const realClub = d.managers[d.currentOrder[d.turnIndex]]?.realClub || null;
      const pick = chooseCpuPick(getPlayersFromState(d, posKey), d.currentBudget, posKey, realClub);
      if (!pick) {
        d = { ...d, currentBudget: null, noCarryoverNext: true };
        continue;
      }
      d = applyPick(d, pick);
    }
    setDraft(d);
    setScreen(d.managerTiming === "before" ? "squads" : "manager-draft");
  }

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
      const realClub = d.managers[activeIdx]?.realClub || null;
      const pick = chooseCpuPick(getPlayersFromState(d, posKey), d.currentBudget, posKey, realClub);
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
    setDraft(prev => {
      const basePool = selectGamePlayers(filter, { perLeagueDedup: !!prev.realTeams });
      const { availablePlayerIds, poolIds } = buildRealTeamsPool(basePool, prev.managers);
      const playerValues = randomizePlayerValues(availablePlayerIds);
      const playerForm = generatePlayerForm(availablePlayerIds);
      const playerOrder = generatePlayerOrder(availablePlayerIds);
      return { ...prev, availablePlayerIds, poolIds, playerValues, playerForm, playerOrder };
    });
  }

  // ── War Chest actions ────────────────────────────────────────────────────

  function startWarChestGame(clubs, options) {
    let d = buildInitialWarChestDraft(clubs, options);
    // Auto-build any leading CPU managers before the first human
    let idx = 0;
    while (idx < d.managers.length && d.managers[idx].isComputer) {
      d = autoBuildWarChestSquad(d, idx);
      idx++;
    }
    if (idx >= d.managers.length) {
      d = { ...d, wcCurrentManagerIdx: d.managers.length, wcPhase: "complete", phase: "complete" };
      setDraft(d);
      setScreen("squads");
    } else {
      setDraft({ ...d, wcCurrentManagerIdx: idx });
      setScreen(options?.draftRoulette?.enabled ? "draft-roulette" : "war-chest-select");
    }
  }

  function selectWarChest(value) {
    setDraft(prev => ({
      ...prev,
      wcPhase: "building",
      managers: prev.managers.map((m, i) =>
        i === prev.wcCurrentManagerIdx
          ? { ...m, chestBudget: value, wcBudgetRemaining: value }
          : m
      ),
    }));
    setScreen("war-chest-draft");
  }

  function pickWarChestPlayer(slot, player) {
    setDraft(prev => {
      const idx = prev.wcCurrentManagerIdx;
      const managers = prev.managers.map((m, i) => {
        if (i !== idx) return m;
        const squad = [...m.squad];
        squad[slot] = { ...player };
        return { ...m, squad, wcBudgetRemaining: m.wcBudgetRemaining - player.value };
      });
      return { ...prev, managers, takenIds: [...prev.takenIds, player.id] };
    });
  }

  function completeWarChestSquad() {
    // Compute next state directly from the current draft snapshot (not inside
    // the setDraft updater) so setScreen gets the correct value in the same batch.
    let d = { ...draft };
    let nextIdx = draft.wcCurrentManagerIdx + 1;
    while (nextIdx < d.managers.length && d.managers[nextIdx].isComputer) {
      d = autoBuildWarChestSquad(d, nextIdx);
      nextIdx++;
    }
    const done = nextIdx >= d.managers.length;
    setDraft({
      ...d,
      wcCurrentManagerIdx: done ? d.managers.length : nextIdx,
      wcPhase: done ? "complete" : "selecting",
      phase: done ? "complete" : "draft",
    });
    setScreen(done ? "squads" : "war-chest-select");
  }

  function getWarChestPlayers(slotIdx) {
    if (!draft) return [];
    const activeManager = draft.managers[draft.wcCurrentManagerIdx];
    const rouletteAssignment = activeManager
      ? { era: activeManager.assignedEra, league: activeManager.assignedLeague }
      : null;
    return getWarChestPlayersForSlot(
      slotIdx, draft.takenIds, draft.availablePlayerIds, draft.playerValues, draft.playerForm, rouletteAssignment
    );
  }

  const activeManagerIdx = draft ? draft.currentOrder?.[draft.turnIndex] ?? 0 : 0;
  const activeManager = draft ? draft.managers[activeManagerIdx] : null;
  const currentPos = resolveCurrentPos(draft);

  return {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, confirmSlot, pickPlayer, setTeamName,
    swapSquadPlayers, setTactics, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, respin, autoCompleteDraft, skipCpuTurns,
    completeDraw, recordMatchResult, assignManagers, setPlayerPool,
    startWarChestGame, selectWarChest, pickWarChestPlayer, completeWarChestSquad, getWarChestPlayers,
  };
}

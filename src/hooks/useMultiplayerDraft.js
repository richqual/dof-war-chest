import { PLAYERS, SUB_POSITIONS, generateBudget, chooseCpuPick } from "../data/players";
import {
  serializeDraft, deserializeDraft,
  applyPick, buildInitialDraft,
  availablePlayersFor, getPlayersFromState,
  autoDrawSlot, resolveCurrentPosKey, resolveCurrentPos,
  selectGamePlayers, randomizePlayerValues, generatePlayerForm, generatePlayerOrder,
  getFormArrow,
} from "./draftUtils";

export { getFormArrow };

// Returns the same API surface as useDraftState, but reads/writes via Firestore.
// gameDoc   — live Firestore document data (from useMultiplayerSession)
// mySlotIdx — which manager slot this device controls
// writeGameState(serializedDraft, screen) — writes to Firestore
// isHost    — whether this device can run setup screens and CPU turns
export function useMultiplayerDraft({ gameDoc, mySlotIdx, writeGameState, isHost }) {
  const draft = gameDoc?.draft ? deserializeDraft(gameDoc.draft) : null;
  const screen = gameDoc?.screen ?? "setup";

  async function setDraftAndScreen(newDraft, newScreen) {
    await writeGameState(serializeDraft(newDraft), newScreen);
  }

  async function setScreenOnly(newScreen) {
    await writeGameState(serializeDraft(draft), newScreen);
  }

  // ── Setup (host only) ──────────────────────────────────────────────────

  async function startGame(clubs, options) {
    if (!isHost) return;
    const d = buildInitialDraft(clubs, options);
    await setDraftAndScreen(d, "order-draw");
  }

  async function setPlayerPool(filter) {
    if (!isHost || !draft) return;
    const availablePlayerIds = selectGamePlayers(filter);
    const playerValues = randomizePlayerValues(availablePlayerIds);
    const playerForm = generatePlayerForm(availablePlayerIds);
    const playerOrder = generatePlayerOrder(availablePlayerIds);
    const next = { ...draft, availablePlayerIds, playerValues, playerForm, playerOrder };
    await setDraftAndScreen(next, screen);
  }

  async function assignManagers(assignments) {
    if (!isHost || !draft) return;
    const next = {
      ...draft,
      managers: draft.managers.map((m, i) =>
        assignments[i] ? { ...m, footballManager: assignments[i] } : m
      ),
    };
    const nextScreen = draft.managerTiming === "before"
      ? "draft"
      : (draft.series?.stage === "draw" ? "draw" : draft.series ? "series" : "squads");
    await setDraftAndScreen(next, nextScreen);
  }

  async function completeDraw(drawOrder) {
    if (!isHost || !draft) return;
    const fmt = draft.series?.format;
    let next;
    if (fmt === "tournament8") {
      next = {
        ...draft,
        series: {
          ...draft.series,
          stage: "quarters",
          quarters: [
            { p: [drawOrder[0], drawOrder[1]], goals: [0, 0], legsPlayed: 0, winner: null },
            { p: [drawOrder[2], drawOrder[3]], goals: [0, 0], legsPlayed: 0, winner: null },
            { p: [drawOrder[4], drawOrder[5]], goals: [0, 0], legsPlayed: 0, winner: null },
            { p: [drawOrder[6], drawOrder[7]], goals: [0, 0], legsPlayed: 0, winner: null },
          ],
        },
      };
    } else {
      next = {
        ...draft,
        series: {
          ...draft.series,
          stage: "semis",
          semis: [
            { p: [drawOrder[0], drawOrder[1]], goals: [0, 0], legsPlayed: 0, winner: null },
            { p: [drawOrder[2], drawOrder[3]], goals: [0, 0], legsPlayed: 0, winner: null },
          ],
        },
      };
    }
    await setDraftAndScreen(next, "series");
  }

  // ── Draft actions (active player only) ────────────────────────────────

  const activeManagerIdx = draft ? draft.currentOrder[draft.turnIndex] : 0;
  const isMyTurn = draft ? activeManagerIdx === mySlotIdx : false;

  async function confirmBudget(spunVal) {
    if (!draft || !isMyTurn) return;
    const carry = draft.managers[activeManagerIdx]?.carryover || 0;
    const next = {
      ...draft,
      currentBudget: spunVal + carry,
      managers: draft.managers.map((m, i) =>
        i === activeManagerIdx ? { ...m, carryover: 0 } : m
      ),
    };
    await setDraftAndScreen(next, screen);
  }

  async function confirmSlot(slotIndex) {
    if (!draft || !isMyTurn) return;
    await setDraftAndScreen({ ...draft, currentSlot: slotIndex }, screen);
  }

  async function pickPlayer(player) {
    if (!draft || !isMyTurn) return;
    if (draft.currentBudget === null || player.value > draft.currentBudget) return;
    const next = applyPick(draft, player);
    const nextScreen = next.phase === "complete"
      ? (draft.managerTiming === "before" ? "squads" : "manager-draft")
      : screen;
    await setDraftAndScreen(next, nextScreen);
  }

  async function skipTurn() {
    if (!draft || !isMyTurn || draft.currentBudget === null) return;
    const next = applyPick(draft, null);
    const nextScreen = next.phase === "complete"
      ? (draft.managerTiming === "before" ? "squads" : "manager-draft")
      : screen;
    await setDraftAndScreen(next, nextScreen);
  }

  async function respin() {
    if (!draft || !isMyTurn) return;
    await setDraftAndScreen({ ...draft, currentBudget: null, noCarryoverNext: true }, screen);
  }

  // Host runs CPU turns
  async function skipCpuTurns() {
    if (!isHost || !draft) return;
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
    const nextScreen = d.phase === "complete"
      ? (d.managerTiming === "before" ? "squads" : "manager-draft")
      : screen;
    await setDraftAndScreen(d, nextScreen);
  }

  async function autoCompleteDraft() {
    if (!isHost || !draft) return;
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
    await setDraftAndScreen(d, d.managerTiming === "before" ? "squads" : "manager-draft");
  }

  // ── Post-draft actions ─────────────────────────────────────────────────

  async function recordMatchResult(homeIdx, awayIdx, winnerIdx, score, matchRatings, matchEvents, matchInjuries) {
    if (!draft) return;
    const s = draft.series;
    if (!s) return;

    let next = draft;

    if (s.format !== "tournament" && s.format !== "tournament8") {
      const newPlayed = (s.played ?? s.wins[0] + s.wins[1]) + 1;
      const maxGames = s.target * 2 - 1;
      if (winnerIdx === null) {
        const newDraws = (s.draws ?? 0) + 1;
        const tied = newPlayed >= maxGames && s.wins[0] === s.wins[1];
        next = { ...draft, series: { ...s, draws: newDraws, played: newPlayed, stage: tied ? "tiebreaker" : "playing" } };
      } else {
        const pos = s.participants.indexOf(winnerIdx);
        if (pos < 0) return;
        const wins = s.wins.map((w, i) => i === pos ? w + 1 : w);
        const hitTarget = wins.some(w => w >= s.target);
        const allPlayed = newPlayed > maxGames || (newPlayed >= maxGames && wins[0] !== wins[1]);
        const champion = hitTarget || allPlayed ? s.participants[wins[0] >= wins[1] ? 0 : 1] : null;
        next = { ...draft, series: { ...s, wins, played: newPlayed, champion, stage: champion !== null ? "champion" : "playing" } };
      }
    } else if (s.format === "tournament8") {
      const qIdx = (s.quarters || []).findIndex(q =>
        q.winner === null &&
        ((q.p[0] === homeIdx && q.p[1] === awayIdx) || (q.p[1] === homeIdx && q.p[0] === awayIdx))
      );
      if (qIdx >= 0) {
        const q = s.quarters[qIdx];
        const isP0Home = q.p[0] === homeIdx;
        const p0Goals = isP0Home ? (score?.home ?? 0) : (score?.away ?? 0);
        const p1Goals = isP0Home ? (score?.away ?? 0) : (score?.home ?? 0);
        const newGoals = [q.goals[0] + p0Goals, q.goals[1] + p1Goals];
        const newLegsPlayed = q.legsPlayed + 1;
        let qWinner = null, wonOnPens = false;
        if (newLegsPlayed >= 2) {
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
        next = { ...draft, series: { ...s, quarters: newQuarters, semis: newSemis, stage: allQsDone ? "semis" : "quarters" } };
      } else {
        const semiIdx = (s.semis || []).findIndex(sm =>
          (sm.p[0] === homeIdx && sm.p[1] === awayIdx) || (sm.p[1] === homeIdx && sm.p[0] === awayIdx)
        );
        if (semiIdx >= 0) {
          const semi = s.semis[semiIdx];
          const isP0Home = semi.p[0] === homeIdx;
          const p0Goals = isP0Home ? (score?.home ?? 0) : (score?.away ?? 0);
          const p1Goals = isP0Home ? (score?.away ?? 0) : (score?.home ?? 0);
          const newGoals = [semi.goals[0] + p0Goals, semi.goals[1] + p1Goals];
          const newLegsPlayed = semi.legsPlayed + 1;
          let semiWinner = null, wonOnPens = false;
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
          next = { ...draft, series: { ...s, semis: newSemis, final: newFinal, stage: bothDone ? "final" : "semis" } };
        } else if (s.final) {
          const f = s.final;
          const pos = f.p.indexOf(winnerIdx);
          if (pos < 0) return;
          const wins = f.wins.map((w, i) => i === pos ? w + 1 : w);
          const champion = wins.some(w => w >= f.target) ? winnerIdx : null;
          next = { ...draft, series: { ...s, final: { ...f, wins, winner: champion }, champion, stage: champion !== null ? "champion" : "final" } };
        }
      }
    } else {
      const semiIdx = (s.semis || []).findIndex(sm =>
        (sm.p[0] === homeIdx && sm.p[1] === awayIdx) || (sm.p[1] === homeIdx && sm.p[0] === awayIdx)
      );
      if (semiIdx >= 0) {
        const semi = s.semis[semiIdx];
        const isP0Home = semi.p[0] === homeIdx;
        const p0Goals = isP0Home ? (score?.home ?? 0) : (score?.away ?? 0);
        const p1Goals = isP0Home ? (score?.away ?? 0) : (score?.home ?? 0);
        const newGoals = [semi.goals[0] + p0Goals, semi.goals[1] + p1Goals];
        const newLegsPlayed = semi.legsPlayed + 1;
        let semiWinner = null, wonOnPens = false;
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
        next = { ...draft, series: { ...s, semis: newSemis, final: newFinal, stage: bothDone ? "final" : "semis" } };
      } else if (s.final) {
        const f = s.final;
        const pos = f.p.indexOf(winnerIdx);
        if (pos < 0) return;
        const wins = f.wins.map((w, i) => i === pos ? w + 1 : w);
        const champion = wins.some(w => w >= f.target) ? winnerIdx : null;
        next = { ...draft, series: { ...s, final: { ...f, wins, winner: champion }, champion, stage: champion !== null ? "champion" : "final" } };
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
            if (ev.player && mgrIdx !== undefined) absences[ev.player] = { type: "suspension", mgrIdx, matchesRemaining: 1 };
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

    await setDraftAndScreen(next, "series");
  }

  // ── Squad management ───────────────────────────────────────────────────

  async function setTeamName(managerIdx, name) {
    if (!draft || managerIdx !== mySlotIdx) return;
    const next = {
      ...draft,
      managers: draft.managers.map((m, i) => i === managerIdx ? { ...m, teamName: name } : m),
    };
    await setDraftAndScreen(next, screen);
  }

  async function setTactics(managerIdx, tactics) {
    if (!draft || managerIdx !== mySlotIdx) return;
    const next = {
      ...draft,
      managers: draft.managers.map((m, i) => i === managerIdx ? { ...m, tactics } : m),
    };
    await setDraftAndScreen(next, screen);
  }

  async function swapSquadPlayers(managerIdx, slotA, slotB) {
    if (!draft || managerIdx !== mySlotIdx) return;
    const next = {
      ...draft,
      managers: draft.managers.map((m, i) => {
        if (i !== managerIdx) return m;
        const sq = [...m.squad];
        [sq[slotA], sq[slotB]] = [sq[slotB], sq[slotA]];
        return { ...m, squad: sq };
      }),
    };
    await setDraftAndScreen(next, screen);
  }

  async function restartGame() {
    await writeGameState(null, "setup");
  }

  // ── Read helpers ───────────────────────────────────────────────────────

  function getAvailablePlayers(posKey) {
    let players = availablePlayersFor(posKey, draft ? draft.takenIds : []);
    if (draft?.availablePlayerIds) {
      players = players.filter(p => draft.availablePlayerIds.has(p.id));
    }
    if (draft?.playerValues) {
      players = players.map(p => ({ ...p, value: draft.playerValues.get(p.id) ?? p.value }));
    }
    return players;
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
      if (draft.playerValues?.has(p.id)) p.value = draft.playerValues.get(p.id);
      if (draft.playerForm?.has(p.id)) p.rating = Math.max(0, p.rating + draft.playerForm.get(p.id));
      return p;
    });
  }

  const activeManager = draft ? draft.managers[activeManagerIdx] : null;
  const currentPos = resolveCurrentPos(draft);

  return {
    screen,
    setScreen: (s) => setScreenOnly(s),
    draft,
    activeManager,
    activeManagerIdx,
    currentPos,
    isMyTurn,
    startGame,
    confirmBudget,
    confirmSlot,
    pickPlayer,
    setTeamName,
    swapSquadPlayers,
    setTactics,
    restartGame,
    getAvailablePlayers,
    getTakenPlayers,
    skipTurn,
    respin,
    autoCompleteDraft,
    skipCpuTurns,
    completeDraw,
    recordMatchResult,
    assignManagers,
    setPlayerPool,
  };
}

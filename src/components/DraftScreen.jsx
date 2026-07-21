import { useState, useEffect, useRef } from "react";
import { POSITIONS, generateBudget, chooseCpuPick, normalizeSearch } from "../data/players";
import { GROUP_COLORS, FORMATIONS, FORMATION_DISPLAY_ORDER, slotEligibility, OOP_PENALTY } from "../data/formations";
import { cpuSpendCap, BENCH_MIN_FUND } from "../hooks/draftUtils";
import { POSITIONS as ALL_POSITIONS } from "../data/players";
import PlayerCard, { ARCHETYPE_COLOR } from "./PlayerCard";
import SpinWheel from "./SpinWheel";
import PositionWheel from "./PositionWheel";
import TurnTransition from "./TurnTransition";
import DrawBoard, { roundLabel } from "./DrawBoard";
import DrawPanel from "./DrawPanel";
import MySquadPanel from "./MySquadPanel";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";

const CPU_SPIN_DELAY = 900;
const CPU_PICK_DELAY = 1300;

export default function DraftScreen({
  draft, activeManager, activeManagerIdx, currentPos,
  confirmBudget, confirmSlot, pickPlayer, getAvailablePlayers, getTakenPlayers,
  skipTurn, respin, autoCompleteDraft, skipCpuTurns,
  stepCpuTurn, // multiplayer only — see the CPU effect below
  myTurn = true, // false in multiplayer when it's someone else's go
}) {
  const GK_ARCHETYPES = ["Sweeper Keeper", "Shot Stopper", "Organiser"];
  const OUTFIELD_ARCHETYPES = ["Warrior", "Technician", "Maverick", "Grinder", "Leader", "Athlete"];
  const OUTFIELD_POS = ["RB", "LB", "CB", "DM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST"];
  const isGkPos = currentPos.key === "GK" || currentPos.key === "GKSUB";
  const isSubPos = ["DEFSUB", "MIDSUB", "WIDSUB", "ATTSUB"].includes(currentPos.key);
  const showPosChips = !isGkPos && !isSubPos;
  const relevantArchetypes = isGkPos ? GK_ARCHETYPES : OUTFIELD_ARCHETYPES;

  // Position eligibility for the slot on the clock. `posPool` is the hard pool of
  // draftable positions (natural + eligible); `naturalPos` plays with no penalty,
  // anything else in the pool takes the out-of-position match penalty.
  const slotElig = showPosChips ? slotEligibility(activeManager?.formation || "4-3-3", currentPos.slot) : null;
  const posPool = slotElig?.pool ?? OUTFIELD_POS;
  const naturalPos = slotElig?.natural ?? currentPos.key;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [filterEra, setFilterEra] = useState(new Set(["classic", "golden", "modern"]));
  const [filterLeague, setFilterLeague] = useState(new Set(["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1", "legends"]));
  const [filterTiers, setFilterTiers] = useState(new Set(["T1", "T2", "T3", "T4", "T5"]));
  const [filterArchetypes, setFilterArchetypes] = useState(new Set(relevantArchetypes));
  const [filterPos, setFilterPos] = useState(() => new Set(showPosChips ? posPool : [currentPos.key]));

  // Reset position and archetype filters when the slot changes
  const [lastPosKey, setLastPosKey] = useState(currentPos.key);
  useEffect(() => {
    if (currentPos.key === lastPosKey) return;
    setLastPosKey(currentPos.key);
    setFilterPos(new Set(showPosChips ? posPool : [currentPos.key]));
    setNameSearch("");
    const cat = isGkPos ? "gk" : "outfield";
    const prevCat = ["GK", "GKSUB"].includes(lastPosKey) ? "gk" : "outfield";
    if (cat !== prevCat) setFilterArchetypes(new Set(relevantArchetypes));
  }, [currentPos.key]);
  const [sortBy, setSortBy] = useState("tier");
  const [sortDir, setSortDir] = useState("asc");
  const [transition, setTransition] = useState(null);
  const [viewingSquadIdx, setViewingSquadIdx] = useState(null);
  const [showOrder, setShowOrder] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [showPosDropdown, setShowPosDropdown] = useState(false);
  const [showEraDropdown, setShowEraDropdown] = useState(false);
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showArchetypeDropdown, setShowArchetypeDropdown] = useState(false);
  const [hideBadges, setHideBadges] = useState(false);
  const [showArchetypeLegend, setShowArchetypeLegend] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [drawOpen, setDrawOpen] = useState(false);

  function toggleEra(era) {
    setFilterEra(prev => {
      const next = new Set(prev);
      if (next.has(era)) next.delete(era);
      else next.add(era);
      return next;
    });
  }

  function toggleLeague(league) {
    setFilterLeague(prev => {
      const next = new Set(prev);
      if (next.has(league)) next.delete(league);
      else next.add(league);
      return next;
    });
  }

  function toggleTier(tier) {
    setFilterTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }

  function toggleArchetype(archetype) {
    setFilterArchetypes(prev => {
      const next = new Set(prev);
      if (next.has(archetype)) next.delete(archetype);
      else next.add(archetype);
      return next;
    });
  }

  const { currentBudget, currentOrder, turnIndex, positionIndex, managers, hideRatings } = draft;

  function togglePos(pos) {
    setFilterPos(prev => {
      const next = new Set(prev);
      if (next.has(pos) && next.size > 1) next.delete(pos);
      else next.add(pos);
      return next;
    });
  }

  let available = getAvailablePlayers(currentPos.key);
  const rawAvailable = available;
  if (showPosChips && filterPos.size < posPool.length) {
    available = available.filter(p => filterPos.has(p.pos) || (p.pos2 && filterPos.has(p.pos2)));
  }
  if (filterEra.size > 0) available = available.filter(p => p.league === "legends" || filterEra.has(p.era));
  if (filterLeague.size > 0) available = available.filter(p => filterLeague.has(p.league));

  // When all leagues selected, consolidate duplicate players by name to their peak version
  // Collects all clubs they played for in that league
  if (filterLeague.size === 5) {
    const byName = {};
    for (const player of available) {
      if (!byName[player.name]) {
        byName[player.name] = { ...player, clubs: [player.club] };
      } else {
        // Add club if not already listed
        if (!byName[player.name].clubs.includes(player.club)) {
          byName[player.name].clubs.push(player.club);
        }
        // Update to peak rating and value
        if (player.rating > byName[player.name].rating) {
          byName[player.name].rating = player.rating;
          byName[player.name].value = player.value;
        }
      }
    }
    available = Object.values(byName).map(({ clubs, ...p }) => ({
      ...p,
      club: clubs.length > 1 ? clubs.join(", ") : clubs[0],
    }));
  }

  // Filter by selected tiers
  available = available.filter(p => filterTiers.has(p.tier));

  // Filter by archetype (only apply when not all relevant archetypes selected)
  if (filterArchetypes.size < relevantArchetypes.length) {
    available = available.filter(p => !p.archetype || filterArchetypes.has(p.archetype));
  }

  // Name search — diacritic-insensitive so "Sane" matches "Sané", "Denilson" matches "Denílson"
  if (nameSearch.trim()) {
    const q = normalizeSearch(nameSearch.trim());
    available = available.filter(p => normalizeSearch(p.name).includes(q) || normalizeSearch(p.club).includes(q));
  }

  // Sort
  const tierOrder = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 };
  const dir = sortDir === "desc" ? -1 : 1;
  if (sortBy === "az") {
    available = [...available].sort((a, b) => dir * a.name.localeCompare(b.name));
  } else if (sortBy === "value") {
    available = [...available].sort((a, b) => dir * (a.value - b.value));
  } else {
    // Tier groups, random within tier
    available = [...available].sort((a, b) => {
      const tierCompare = dir * (tierOrder[a.tier] - tierOrder[b.tier]);
      if (tierCompare !== 0) return tierCompare;
      const orderA = draft?.playerOrder?.get(a.id) ?? 0;
      const orderB = draft?.playerOrder?.get(b.id) ?? 0;
      return orderA - orderB;
    });
  }

  const affordable = available.filter(p => currentBudget !== null && p.value <= currentBudget);
  const tooExpensive = available.filter(p => currentBudget !== null && p.value > currentBudget);
  const takenPlayers = currentBudget !== null ? getTakenPlayers(currentPos.key) : [];

  // Whether any filter is narrower than its "show everything" state
  const hasActiveFilters = (showPosChips && filterPos.size < posPool.length)
    || filterEra.size < 3 || filterLeague.size < 6 || filterTiers.size < 5
    || filterArchetypes.size < relevantArchetypes.length || nameSearch.trim() !== "";
  // True budget shortfall: no affordable player exists even ignoring filters
  const genuinelyNoAfford = currentBudget !== null && !rawAvailable.some(p => p.value <= currentBudget);

  function clearFilters() {
    if (showPosChips) setFilterPos(new Set(posPool));
    setFilterEra(new Set(["classic", "golden", "modern"]));
    setFilterLeague(new Set(["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1", "legends"]));
    setFilterTiers(new Set(["T1", "T2", "T3", "T4", "T5"]));
    setFilterArchetypes(new Set(relevantArchetypes));
    setNameSearch("");
  }

  // Leftover Lolly: unspent cash banks into a sub fund instead of carrying over,
  // and from the bench rounds on that fund replaces the wheel entirely — bar the
  // one top-up spin a manager takes on their first sub.
  const lolly = !!draft.leftoverLolly;
  const subFund = activeManager?.subFund || 0;
  const benchRound = lolly && positionIndex >= 11;
  const topUpDue = benchRound && !activeManager?.toppedUp;
  // A bench turn past the top-up loads the fund silently — there's nothing to spin.
  const autoLoadBudget = benchRound && !topUpDue;

  // What the spin actually adds to. Under Lolly the sub fund is locked during the
  // XI rounds — it's banked, not spendable — so the wheel must show nothing
  // carried until the bench, where the fund becomes the whole budget.
  const pendingCarryover = lolly
    ? (benchRound ? subFund : 0)
    : (activeManager?.carryover || 0);

  function handlePickPlayer(player) {
    const prevManagerName = activeManager.dofName || activeManager.name;
    const prevKit = activeManager;
    const n = currentOrder.length;
    const isLastTurn = turnIndex + 1 >= n;
    const isLastPosition = isLastTurn && positionIndex + 1 >= POSITIONS.length;

    if (!isLastPosition) {
      let nextManagerIdx, nextPosLabel;
      if (isLastTurn) {
        const newRound = draft.round + 1;
        nextManagerIdx = (0 + newRound) % n;
        nextPosLabel = draft.positionMode === "random" && positionIndex + 1 < 11
          ? "?"
          : POSITIONS[positionIndex + 1]?.label || "";
      } else {
        nextManagerIdx = currentOrder[turnIndex + 1];
        nextPosLabel = draft.positionMode === "random" && positionIndex < 11
          ? "?"
          : currentPos.label;  // same round, sub mode or fixed
      }
      const nextManager = managers[nextManagerIdx];
      const nextName = nextManager.dofName || nextManager.name;
      setTransition({ prevManager: prevManagerName, player, nextManager: nextName, nextPosLabel, nextKit: nextManager, prevKit });
    }

    pickPlayer(player);
  }

  function handleClickPlayer(player) {
    setPendingPlayer(player);
  }

  const isRandomStarter = draft.positionMode === "random" && positionIndex < 11;
  const needsSlotDraw = isRandomStarter && (draft.currentSlot === null || draft.currentSlot === undefined);

  // CPU turns run themselves: draw slot (random mode), spin budget, then pick.
  // Pauses while a transition screen is up so the human can follow along.
  const isCpuTurn = !!activeManager?.isComputer;

  // A bench turn past the top-up loads the sub fund silently — there's no wheel
  // left to spin, so without this the draft would sit on an empty roll area.
  useEffect(() => {
    if (!autoLoadBudget || isCpuTurn || transition || currentBudget !== null) return;
    confirmBudget(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadBudget, isCpuTurn, transition, currentBudget, activeManagerIdx, positionIndex, turnIndex]);

  // Draw-board review gates — same two holds as Scout mode. Classic keeps its
  // TurnTransition pop-ups; these sit alongside, giving the round a readable
  // summary rather than replacing the per-pick reveal.
  // Acknowledgements live in refs: they must survive re-renders (a stale value
  // would re-show a gate already tapped through) but they are not render inputs
  // themselves. `null` = uninitialised, so resuming a saved draft adopts its
  // position rather than re-gating a round already seen.
  const ackRoundRef = useRef(null);
  const ackPicksRef = useRef(0);
  const [ackTick, setAckTick] = useState(0); // re-render trigger after an ack is written
  if (ackRoundRef.current === null || positionIndex - 1 < ackRoundRef.current) {
    ackRoundRef.current = positionIndex - 1;
    ackPicksRef.current = (draft.pickLog || []).length;
  }
  const roundPicks = (draft.pickLog || []).filter(e => e.positionIndex === positionIndex);
  const roundReview =
    draft.phase !== "complete" && positionIndex - 1 > ackRoundRef.current ? positionIndex - 1 : null;
  const reviewPending =
    roundReview === null && !isCpuTurn && myTurn && roundPicks.length > 0 &&
    ackPicksRef.current < (draft.pickLog || []).length;
  function ackDraw(round) {
    if (round !== null && round !== undefined) ackRoundRef.current = round;
    ackPicksRef.current = (draft.pickLog || []).length;
    setAckTick(t => t + 1);
  }

  useEffect(() => {
    // Freeze CPU picks behind a review gate so the board can't change underneath.
    if (!isCpuTurn || transition || roundReview !== null) return;
    const t = setTimeout(() => {
      // Online, the handlers below are all `isMyTurn`-guarded and a CPU turn is
      // nobody's turn, so the draft would sit still. `stepCpuTurn` does the same
      // one-beat-per-tick job against shared state, host-side.
      if (stepCpuTurn) {
        stepCpuTurn();
      } else if (needsSlotDraw) {
        // Pick a random unfilled starter slot
        const squad = activeManager?.squad || [];
        const avail = [];
        for (let i = 0; i < 11; i++) if (!squad[i]) avail.push(i);
        if (!avail.length) return;
        const slot = avail[Math.floor(Math.random() * avail.length)];
        confirmSlot(slot);
      } else if (currentBudget === null) {
        // Bench rounds under Lolly spin nothing (confirmBudget folds in the sub
        // fund), except the manager's one-off top-up.
        confirmBudget(benchRound && !topUpDue ? 0 : generateBudget(draft.difficulty));
      } else {
        const pick = chooseCpuPick(getAvailablePlayers(currentPos.key), cpuSpendCap(draft, currentBudget), currentPos.key, activeManager?.realClub || null);
        if (pick) handlePickPlayer(pick);
        else skipTurn();
      }
    }, needsSlotDraw ? CPU_SPIN_DELAY : currentBudget === null ? CPU_SPIN_DELAY : CPU_PICK_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuTurn, transition, currentBudget, activeManagerIdx, positionIndex, turnIndex, needsSlotDraw, roundReview]);

  if (transition) {
    return (
      <TurnTransition
        prevManager={transition.prevManager}
        player={transition.player}
        nextManager={transition.nextManager}
        posLabel={transition.nextPosLabel}
        nextKit={transition.nextKit}
        prevKit={transition.prevKit}
        onContinue={() => setTransition(null)}
      />
    );
  }

  // CM00/01-style theming: the chrome takes on the active club's kit colours
  const kitPrimary = activeManager?.primaryColor || "#1a3a6b";
  const kitSecondary = activeManager?.secondaryColor || "#ffffff";
  const kitTheme = {
    "--kit-primary": kitPrimary,
    "--kit-secondary": kitSecondary,
    "--kit-text": readableTextOn(kitPrimary),
    "--kit-accent": kitAccent(kitPrimary, kitSecondary),
  };

  return (
    <div className="draft-screen" style={kitTheme}>
      <DrawPanel
        draft={draft}
        open={drawOpen}
        onOpen={() => setDrawOpen(true)}
        onClose={() => setDrawOpen(false)}
      />

      {pendingPlayer && (
        <div className="bw-modal-overlay" onClick={() => setPendingPlayer(null)}>
          <div className="bw-modal-box" onClick={e => e.stopPropagation()}>
            <div className="bw-modal-title">CONFIRM SIGNING</div>
            <div className="bw-confirm-name">{pendingPlayer.nation} {pendingPlayer.name}</div>
            <div className="bw-confirm-detail">{pendingPlayer.pos} · {pendingPlayer.club} · {pendingPlayer.years}</div>
            <div className="bw-confirm-cost">£{pendingPlayer.value}m</div>
            <div className="bw-confirm-btns">
              <button className="bw-cta-primary" onClick={() => { handlePickPlayer(pendingPlayer); setPendingPlayer(null); }}>
                ✓ CONFIRM SIGNING
              </button>
              <button className="bw-cta-secondary" onClick={() => setPendingPlayer(null)}>
                ✕ CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingSquadIdx !== null && managers[viewingSquadIdx] && (
        <MySquadPanel
          manager={managers[viewingSquadIdx]}
          onClose={() => setViewingSquadIdx(null)}
          hideRatings={draft.hideRatings}
        />
      )}

      {showArchetypeLegend && (
        <div className="bw-modal-overlay" onClick={() => setShowArchetypeLegend(false)}>
          <div className="bw-modal-box archetype-legend-box" onClick={e => e.stopPropagation()}>
            <div className="bw-modal-title">ARCHETYPES & ERAS</div>
            <div className="legend-section-label">ARCHETYPES</div>
            {[
              { name: "Warrior",          desc: "Wins the ball, wins the battle. Tough, combative, never gives up." },
              { name: "Technician",       desc: "Passes, moves, controls. The game flows through them." },
              { name: "Maverick",         desc: "Unpredictable genius. Moments of magic, moments of madness." },
              { name: "Grinder",          desc: "Does the dirty work. Consistent, reliable, never flashy." },
              { name: "Leader",           desc: "Lifts the team. Commands the dressing room and the pitch." },
              { name: "Athlete",          desc: "Pace, power, engine. Gets up and down all day long." },
              { name: "Sweeper Keeper",   desc: "Commands the box and beyond. Comfortable with the ball at their feet." },
              { name: "Shot Stopper",     desc: "Pure reflex goalkeeper. Spectacular saves, line presence." },
              { name: "Organiser",        desc: "Marshals the defence. Reads the game, talks constantly." },
            ].map(({ name, desc }) => {
              const colors = ARCHETYPE_COLOR[name] || { bg: "#222", fg: "#aaa" };
              return (
                <div key={name} className="legend-row legend-row--desc">
                  <span className="legend-initial" style={{ background: colors.bg, color: colors.fg, border: `1px solid ${colors.fg}44` }}>
                    {name[0]}
                  </span>
                  <div>
                    <div className="legend-name" style={{ color: colors.fg }}>{name}</div>
                    <div className="legend-desc">{desc}</div>
                  </div>
                </div>
              );
            })}
            <div className="legend-section-label" style={{ marginTop: 12 }}>ERAS</div>
            {[
              { key: "C", label: "Classic", years: "1998–2008", color: "#88aaff" },
              { key: "G", label: "Golden", years: "2008–2016", color: "#ffd700" },
              { key: "M", label: "Modern", years: "2016–present", color: "#80ff80" },
            ].map(e => (
              <div key={e.key} className="legend-row">
                <span className="legend-initial" style={{ background: "#222", color: e.color, border: `1px solid ${e.color}55` }}>{e.key}</span>
                <span className="legend-name" style={{ color: e.color }}>{e.label} <span style={{ color: "#888", fontSize: 11 }}>{e.years}</span></span>
              </div>
            ))}
            <button className="bw-cta-secondary" style={{ marginTop: 14 }} onClick={() => setShowArchetypeLegend(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="draft-header">
        <div className="bw-team-bar">
          {/* Active club */}
          {activeManager && (
            <button
              className="bw-team-name"
              onClick={() => setViewingSquadIdx(v => v === activeManagerIdx ? null : activeManagerIdx)}
              title="View squad"
            >
              <span className="bw-team-name-label">{activeManager.clubName || activeManager.name}</span>
              {activeManager.isComputer && <span className="bw-team-cpu-tag">CPU</span>}
              <span className="bw-team-squad-btn">▤</span>
            </button>
          )}
          {/* Clickable kit swatches for other clubs */}
          <div className="bw-team-others">
            {managers.map((m, i) => i === activeManagerIdx ? null : (
              <span
                key={i}
                className={`bw-team-mini${viewingSquadIdx === i ? " squad-open" : ""}`}
                title={`${m.clubName || m.name}${m.isComputer ? " (CPU)" : ""} — view squad`}
                onClick={() => setViewingSquadIdx(v => v === i ? null : i)}
              >
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`tab-${i}`} size={16} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Turn banner */}
      <div className="bw-signing-row">
        <div className="bw-signing-left">
          <KitSwatch
            primary={kitPrimary}
            secondary={kitSecondary}
            pattern={activeManager?.pattern || "plain"}
            uid="banner"
            size={28}
          />
          <span className="bw-signing-name">{activeManager?.dofName || activeManager?.name}</span>
          <span className="bw-signing-meta">signing: <strong>{needsSlotDraw ? "?" : currentPos.label}</strong></span>
        </div>
        <div className="bw-signing-right">
          {/* The sub fund is the whole point of Lolly, so it stays on screen all
              draft — watching it tick up is the feedback for underspending. */}
          {lolly && !benchRound && (
            <span className="bw-signing-subfund" title="Unspent cash banks here for your subs">
              Sub Fund: £{subFund}m
            </span>
          )}
          {!lolly && pendingCarryover > 0 && currentBudget === null && (
            <span className="bw-signing-carryover">Carryover: £{pendingCarryover}m</span>
          )}
          {currentBudget !== null && (
            <span className="bw-signing-budget">£{currentBudget}m</span>
          )}
        </div>
      </div>

      {/* Position progress */}
      <div className="bw-pos-strip">
        {draft.positionMode === "random" ? (
          <>
            {/* Random mode: show individual position slots based on what's been filled */}
            {(FORMATION_DISPLAY_ORDER[activeManager?.formation] ?? Array.from({length:11},(_,i)=>i)).map(i => {
              const entry = FORMATIONS[activeManager?.formation]?.[i];
              const posLabel = entry?.label ?? entry?.pos ?? POSITIONS[i].key;
              const isDone = !!activeManager?.squad?.[i];
              const isCurrent = !isDone && draft.currentSlot === i && positionIndex < 11;
              return (
                <span
                  key={i}
                  className={`bw-pos-chip ${isDone ? "done" : isCurrent ? "current" : "todo"}`}
                >
                  {posLabel}
                </span>
              );
            })}
            {/* Subs divider + chips */}
            <span className="bw-pos-chip-divider" />
            {POSITIONS.slice(11).map((p, i) => {
              const absIdx = 11 + i;
              const label = p.key === "GKSUB" ? "GKS" : p.key === "DEFSUB" ? "DEF" : p.key === "MIDSUB" ? "MID" : p.key === "ATTSUB" ? "ATT" : p.key;
              const state = absIdx < positionIndex ? "done" : absIdx === positionIndex ? "current" : "todo";
              return (
                <span key={absIdx} className={`bw-pos-chip sub ${state}`}>
                  {label}
                </span>
              );
            })}
          </>
        ) : (
          <>
            {(FORMATION_DISPLAY_ORDER[activeManager?.formation] ?? Array.from({length:11},(_,i)=>i)).map(i => {
              const entry = FORMATIONS[activeManager?.formation]?.[i];
              const posLabel = entry?.label ?? entry?.pos ?? POSITIONS[i].key;
              return (
                <span key={i} className={`bw-pos-chip ${i < positionIndex ? "done" : i === positionIndex ? "current" : "todo"}`}>
                  {posLabel}
                </span>
              );
            })}
            <span className="bw-pos-chip-divider" />
            {POSITIONS.slice(11).map((p, i) => {
              const absIdx = 11 + i;
              const label = p.key === "GKSUB" ? "GKS" : p.key === "DEFSUB" ? "DEF" : p.key === "MIDSUB" ? "MID" : p.key === "ATTSUB" ? "ATT" : p.key;
              const state = absIdx < positionIndex ? "done" : absIdx === positionIndex ? "current" : "todo";
              return (
                <span key={absIdx} className={`bw-pos-chip sub ${state}`}>
                  {label}
                </span>
              );
            })}
          </>
        )}
      </div>

      {/* Draft order strip — collapsible */}
      <div className="bw-order-wrap">
        <button className="bw-order-toggle" onClick={() => setShowOrder(s => !s)}>
          DRAFT ORDER {showOrder ? "▲" : "▼"}
        </button>
        {showOrder && (
          <div className="bw-order-list">
            {currentOrder.map((pi, i) => (
              <span key={i} className={`bw-order-chip ${i === turnIndex ? "now" : i < turnIndex ? "done" : "waiting"}`}>
                {managers[pi].clubName || managers[pi].name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="draft-main">
        {roundReview !== null ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-human">ROUND COMPLETE</span>
            <div className="bw-cpu-name">{roundLabel(draft, roundReview)}</div>
            <div className="bw-cpu-status">Every club has signed. Here's how the round went.</div>
            <div className="bw-draw-live">
              <DrawBoard draft={draft} round={roundReview} />
            </div>
            <button
              className="bw-cta-primary"
              style={{ marginTop: "1.2rem", width: "auto" }}
              onClick={() => ackDraw(roundReview)}
            >
              CONTINUE →
            </button>
          </div>
        ) : reviewPending ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-human">ROUND SO FAR</span>
            <div className="bw-cpu-name">You're up next</div>
            <div className="bw-cpu-status">Here's how the round's gone so far.</div>
            <div className="bw-draw-live">
              <DrawBoard draft={draft} />
            </div>
            <button
              className="bw-cta-primary"
              style={{ marginTop: "1.2rem", width: "auto" }}
              onClick={() => ackDraw(null)}
            >
              CONTINUE →
            </button>
          </div>
        ) : !myTurn && !isCpuTurn ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-cpu">THEIR TURN</span>
            <div className="bw-cpu-name">{activeManager?.clubName || activeManager?.name}</div>
            <div className="bw-cpu-status">
              {needsSlotDraw
                ? "Drawing their position..."
                : currentBudget === null
                  ? "Spinning their transfer budget..."
                  : `Budget £${currentBudget}m — picking their ${currentPos.label}...`}
            </div>
            <div className="bw-cpu-dots"><span>●</span><span>●</span><span>●</span></div>
          </div>
        ) : isCpuTurn ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-human">CPU TURN</span>
            <div className="bw-cpu-name">{activeManager?.clubName || activeManager?.name}</div>
            <div className="bw-cpu-status">
              {needsSlotDraw
                ? "Drawing position…"
                : isRandomStarter && draft.currentSlot !== null && draft.currentSlot !== undefined
                  ? <>
                      Drew{" "}
                      <strong style={{ color: (draft.currentSlot === 0 ? GROUP_COLORS.GK : draft.currentSlot <= 4 ? GROUP_COLORS.DEF : draft.currentSlot <= 9 ? GROUP_COLORS.MID : GROUP_COLORS.ATT).fill }}>
                        {ALL_POSITIONS[draft.currentSlot]?.label}
                      </strong>
                      {currentBudget === null
                        ? " — Spinning transfer budget…"
                        : ` — Budget £${currentBudget}m · signing…`}
                    </>
                  : currentBudget === null
                    ? "Spinning transfer budget…"
                    : `Budget £${currentBudget}m — scouting for a ${currentPos.label}…`}
            </div>
            {/* The wait IS the draw board — watch the round fill in rather
                than staring at thinking dots. */}
            <div className="bw-draw-live">
              <DrawBoard draft={draft} />
            </div>
            {skipCpuTurns && (
              <button className="bw-cta-secondary" style={{ marginTop: "1.2rem", width: "auto" }} onClick={skipCpuTurns}>
                ⏭ SKIP TO END OF ROUND
              </button>
            )}
          </div>
        ) : needsSlotDraw ? (
          <div className="bw-roll-area">
            <PositionWheel
              squad={activeManager?.squad}
              onConfirm={confirmSlot}
              formation={activeManager?.formation}
            />
          </div>
        ) : currentBudget === null ? (
          <div className="bw-roll-area">
            {topUpDue ? (
              <>
                <div className="bw-roll-sub">
                  <strong>Top-up spin</strong> — one last cash injection before you build your bench
                  <span className="bw-roll-note"> · minimum £{BENCH_MIN_FUND}m guaranteed</span>
                </div>
                <SpinWheel
                  carryover={pendingCarryover}
                  carryLabel="sub fund"
                  onConfirm={confirmBudget}
                  difficulty={draft.difficulty}
                  minTotal={BENCH_MIN_FUND}
                />
              </>
            ) : (
              <>
                <div className="bw-roll-sub">Spin your transfer budget for <strong>{currentPos.label}</strong></div>
                <SpinWheel
                  carryover={pendingCarryover}
                  carryLabel={lolly ? "sub fund" : "carryover"}
                  onConfirm={confirmBudget}
                  difficulty={draft.difficulty}
                />
              </>
            )}
          </div>
        ) : (
          <div className="bw-picker">
            <div className="bw-picker-filters">
              <div className="bw-search-box">
                <span className="bw-search-icon">⌕</span>
                <input
                  className="bw-search-input"
                  type="text"
                  placeholder="Search player or club…"
                  value={nameSearch}
                  onChange={e => setNameSearch(e.target.value)}
                />
              </div>

              <div className="bw-filter-chips">
                {showPosChips && (
                  <div className="bw-filter-chip-wrap">
                    <button
                      className={`bw-filter-chip ${filterPos.size < posPool.length ? "active" : ""}`}
                      onClick={() => { setShowPosDropdown(s => !s); setShowLeagueDropdown(false); setShowEraDropdown(false); setShowTierDropdown(false); setShowArchetypeDropdown(false); }}
                    >
                      Position {filterPos.size < posPool.length ? `· ${[...filterPos].join(", ")}` : ""}
                    </button>
                    {showPosDropdown && (
                      <div className="bw-filter-menu">
                        {posPool.map(pos => (
                          <label key={pos} className="bw-filter-checkbox">
                            <input type="checkbox" checked={filterPos.has(pos)} onChange={() => togglePos(pos)} />
                            {pos}{pos === naturalPos ? " ★" : ` (−${OOP_PENALTY})`}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="bw-filter-chip-wrap">
                  <button
                    className={`bw-filter-chip ${filterLeague.size < 6 ? "active" : ""}`}
                    onClick={() => { setShowLeagueDropdown(s => !s); setShowPosDropdown(false); setShowEraDropdown(false); setShowTierDropdown(false); setShowArchetypeDropdown(false); }}
                  >
                    Leagues {filterLeague.size < 6 ? `(${filterLeague.size}/6)` : ""}
                  </button>
                  {showLeagueDropdown && (
                    <div className="bw-filter-menu">
                      {[
                        { value: "premier_league", label: "Premier League" },
                        { value: "la_liga", label: "La Liga" },
                        { value: "serie_a", label: "Serie A" },
                        { value: "bundesliga", label: "Bundesliga" },
                        { value: "ligue_1", label: "Ligue 1" },
                        { value: "legends", label: "⚜️ Legends" }
                      ].map(league => (
                        <label key={league.value} className="bw-filter-checkbox">
                          <input type="checkbox" checked={filterLeague.has(league.value)} onChange={() => toggleLeague(league.value)} />
                          {league.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bw-filter-chip-wrap">
                  <button
                    className={`bw-filter-chip ${filterEra.size < 3 ? "active" : ""}`}
                    onClick={() => { setShowEraDropdown(s => !s); setShowPosDropdown(false); setShowLeagueDropdown(false); setShowTierDropdown(false); setShowArchetypeDropdown(false); }}
                  >
                    Eras {filterEra.size < 3 ? `(${filterEra.size}/3)` : ""}
                  </button>
                  {showEraDropdown && (
                    <div className="bw-filter-menu">
                      {[
                        { value: "classic", label: "Classic 98–08" },
                        { value: "golden", label: "Golden 08–16" },
                        { value: "modern", label: "Modern 16–" }
                      ].map(era => (
                        <label key={era.value} className="bw-filter-checkbox">
                          <input type="checkbox" checked={filterEra.has(era.value)} onChange={() => toggleEra(era.value)} />
                          {era.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bw-filter-chip-wrap">
                  <button
                    className={`bw-filter-chip ${filterTiers.size < 5 ? "active" : ""}`}
                    onClick={() => { setShowTierDropdown(s => !s); setShowPosDropdown(false); setShowLeagueDropdown(false); setShowEraDropdown(false); setShowArchetypeDropdown(false); }}
                  >
                    Tiers {filterTiers.size < 5 ? `(${filterTiers.size}/5)` : ""}
                  </button>
                  {showTierDropdown && (
                    <div className="bw-filter-menu">
                      {[
                        { value: "T1", label: "T1 — Elite" },
                        { value: "T2", label: "T2 — World Class" },
                        { value: "T3", label: "T3 — Star" },
                        { value: "T4", label: "T4 — Quality" },
                        { value: "T5", label: "T5 — Solid" },
                      ].map(tier => (
                        <label key={tier.value} className="bw-filter-checkbox">
                          <input type="checkbox" checked={filterTiers.has(tier.value)} onChange={() => toggleTier(tier.value)} />
                          {tier.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bw-filter-chip-wrap">
                  <button
                    className={`bw-filter-chip ${filterArchetypes.size < relevantArchetypes.length ? "active" : ""}`}
                    onClick={() => { setShowArchetypeDropdown(s => !s); setShowPosDropdown(false); setShowTierDropdown(false); setShowLeagueDropdown(false); setShowEraDropdown(false); }}
                  >
                    Type {filterArchetypes.size < relevantArchetypes.length ? `(${filterArchetypes.size}/${relevantArchetypes.length})` : ""}
                  </button>
                  {showArchetypeDropdown && (
                    <div className="bw-filter-menu">
                      {relevantArchetypes.map(archetype => (
                        <label key={archetype} className="bw-filter-checkbox">
                          <input type="checkbox" checked={filterArchetypes.has(archetype)} onChange={() => toggleArchetype(archetype)} />
                          {archetype}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bw-sort-controls-row">
                <div className="bw-sort-group">
                  <span className="bw-sort-label">SORT</span>
                  <div className="bw-sort-seg">
                    {[
                      { key: "tier", label: "TIER" },
                      { key: "az", label: "A–Z" },
                      { key: "value", label: "VALUE" },
                    ].map(s => (
                      <button
                        key={s.key}
                        className={`bw-sort-seg-btn ${sortBy === s.key ? "active" : ""}`}
                        onClick={() => {
                          if (sortBy === s.key) setSortDir(d => d === "asc" ? "desc" : "asc");
                          else { setSortBy(s.key); setSortDir("asc"); }
                        }}
                      >
                        {s.label}{sortBy === s.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="bw-affordable-count">
                  <strong>{affordable.length}</strong> affordable · {available.length} total
                </span>
              </div>

              <div className="bw-badge-controls-row">
                <button className={`bw-chip-ghost ${hideBadges ? "active" : ""}`} onClick={() => setHideBadges(h => !h)} title="Toggle archetype tags">
                  {hideBadges ? "TAGS OFF" : "TAGS ON"}
                </button>
                <button className="bw-chip-ghost" onClick={() => setShowArchetypeLegend(true)} title="Archetype & era legend">?</button>
              </div>
            </div>

            <div className="bw-player-list">
              {affordable.length === 0 && currentBudget !== null && (
                genuinelyNoAfford ? (
                  <div className="bw-no-afford">
                    <div className="bw-no-afford-title">⚠ NO AFFORDABLE PLAYERS</div>
                    {/* No wheel is in play on a bench round, so there's nothing to
                        re-spin — skipping returns the pot to the fund instead. */}
                    {benchRound ? (
                      <>
                        <div className="bw-no-afford-msg">
                          £{currentBudget}m isn't enough for anyone available. Skip this sub and the
                          money stays in your <strong>sub fund</strong> for the next one.
                        </div>
                        <button className="bw-cta-secondary" onClick={skipTurn}>→ SKIP THIS SUB</button>
                      </>
                    ) : (
                      <>
                        <div className="bw-no-afford-msg">
                          £{currentBudget}m isn't enough for anyone available. Re-spin for a new budget —
                          but this money is lost and <strong>no carryover</strong> after this pick.
                        </div>
                        <button className="bw-cta-secondary" onClick={respin}>↺ RE-SPIN (NO CARRYOVER)</button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bw-no-results">
                    <div className="bw-no-results-title">No players match — widen your filters</div>
                    <button className="bw-chip-ghost" onClick={clearFilters}>✕ Reset filters</button>
                  </div>
                )
              )}
              {affordable.map(p => (
                <PlayerCard key={p.id} player={p} onPick={handleClickPlayer} canAfford={true} hideRatings={hideRatings} hideBadges={hideBadges} preferredArchetypes={activeManager?.preferredArchetypes} outOfPos={showPosChips && p.pos !== naturalPos ? `OOP −${OOP_PENALTY}` : null} />
              ))}
              {tooExpensive.length > 0 && (
                <>
                  <div className="bw-section-divider">OUT OF BUDGET</div>
                  {tooExpensive.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={hideRatings} hideBadges={hideBadges} budget={currentBudget} preferredArchetypes={activeManager?.preferredArchetypes} outOfPos={showPosChips && p.pos !== naturalPos ? `OOP −${OOP_PENALTY}` : null} />
                  ))}
                </>
              )}
              {takenPlayers.length > 0 && (
                <>
                  <div className="bw-section-divider">ALREADY SIGNED</div>
                  {takenPlayers.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={hideRatings} hideBadges={hideBadges} takenBy={p.ownedBy} preferredArchetypes={activeManager?.preferredArchetypes} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

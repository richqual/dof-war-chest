import { useState, useEffect } from "react";
import { POSITIONS, generateBudget, chooseCpuPick } from "../data/players";
import { GROUP_COLORS, FORMATIONS, FORMATION_DISPLAY_ORDER } from "../data/formations";
import { POSITIONS as ALL_POSITIONS } from "../data/players";
import PlayerCard, { ARCHETYPE_COLOR } from "./PlayerCard";
import SpinWheel from "./SpinWheel";
import PositionWheel from "./PositionWheel";
import TurnTransition from "./TurnTransition";
import MySquadPanel from "./MySquadPanel";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";

const CPU_SPIN_DELAY = 900;
const CPU_PICK_DELAY = 1300;

export default function DraftScreen({
  draft, activeManager, activeManagerIdx, currentPos,
  confirmBudget, confirmSlot, pickPlayer, getAvailablePlayers, getTakenPlayers,
  skipTurn, respin, autoCompleteDraft, skipCpuTurns,
}) {
  const GK_ARCHETYPES = ["Sweeper Keeper", "Shot Stopper", "Organiser"];
  const OUTFIELD_ARCHETYPES = ["Warrior", "Technician", "Maverick", "Grinder", "Leader", "Athlete"];
  const OUTFIELD_POS = ["RB", "LB", "CB", "DM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST"];
  const isGkPos = currentPos.key === "GK" || currentPos.key === "GKSUB";
  const isSubPos = ["DEFSUB", "MIDSUB", "WIDSUB", "ATTSUB"].includes(currentPos.key);
  const showPosChips = !isGkPos && !isSubPos;
  const relevantArchetypes = isGkPos ? GK_ARCHETYPES : OUTFIELD_ARCHETYPES;

  const [filterEra, setFilterEra] = useState(new Set(["classic", "golden", "modern"]));
  const [filterLeague, setFilterLeague] = useState(new Set(["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1"]));
  const [filterTiers, setFilterTiers] = useState(new Set(["T1", "T2", "T3", "T4", "T5"]));
  const [filterArchetypes, setFilterArchetypes] = useState(new Set(relevantArchetypes));
  const [filterPos, setFilterPos] = useState(() => new Set([currentPos.key]));

  // Reset position and archetype filters when the slot changes
  const [lastPosKey, setLastPosKey] = useState(currentPos.key);
  useEffect(() => {
    if (currentPos.key === lastPosKey) return;
    setLastPosKey(currentPos.key);
    setFilterPos(new Set([currentPos.key]));
    const cat = isGkPos ? "gk" : "outfield";
    const prevCat = ["GK", "GKSUB"].includes(lastPosKey) ? "gk" : "outfield";
    if (cat !== prevCat) setFilterArchetypes(new Set(relevantArchetypes));
  }, [currentPos.key]);
  const [sortBy, setSortBy] = useState("tier");
  const [sortDir, setSortDir] = useState("asc");
  const [transition, setTransition] = useState(null);
  const [showMySquad, setShowMySquad] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [showPosDropdown, setShowPosDropdown] = useState(false);
  const [showEraDropdown, setShowEraDropdown] = useState(false);
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showArchetypeDropdown, setShowArchetypeDropdown] = useState(false);
  const [hideBadges, setHideBadges] = useState(false);
  const [showArchetypeLegend, setShowArchetypeLegend] = useState(false);

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
  if (showPosChips && filterPos.size < OUTFIELD_POS.length) {
    available = available.filter(p => filterPos.has(p.pos) || (p.pos2 && filterPos.has(p.pos2)));
  }
  if (filterEra.size > 0) available = available.filter(p => filterEra.has(p.era));
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
    available = Object.values(byName).map(p => ({
      ...p,
      club: p.clubs.length > 1 ? p.clubs.join(", ") : p.clubs[0],
      clubs: undefined, // clean up helper field
    }));
  }

  // Filter by selected tiers
  available = available.filter(p => filterTiers.has(p.tier));

  // Filter by archetype (only apply when not all relevant archetypes selected)
  if (filterArchetypes.size < relevantArchetypes.length) {
    available = available.filter(p => !p.archetype || filterArchetypes.has(p.archetype));
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
  // carryover shown before spin (what the active manager has banked)
  const pendingCarryover = activeManager?.carryover || 0;

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
  useEffect(() => {
    if (!isCpuTurn || transition) return;
    const t = setTimeout(() => {
      if (needsSlotDraw) {
        // Pick a random unfilled starter slot
        const squad = activeManager?.squad || [];
        const avail = [];
        for (let i = 0; i < 11; i++) if (!squad[i]) avail.push(i);
        if (!avail.length) return;
        const slot = avail[Math.floor(Math.random() * avail.length)];
        confirmSlot(slot);
      } else if (currentBudget === null) {
        confirmBudget(generateBudget(draft.difficulty));
      } else {
        const pick = chooseCpuPick(getAvailablePlayers(currentPos.key), currentBudget);
        if (pick) handlePickPlayer(pick);
        else skipTurn();
      }
    }, needsSlotDraw ? CPU_SPIN_DELAY : currentBudget === null ? CPU_SPIN_DELAY : CPU_PICK_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuTurn, transition, currentBudget, activeManagerIdx, positionIndex, turnIndex, needsSlotDraw]);

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
      {pendingPlayer && (
        <div className="menu-overlay" onClick={() => setPendingPlayer(null)}>
          <div className="menu-box" onClick={e => e.stopPropagation()}>
            <div className="menu-title">CONFIRM SIGNING</div>
            <div className="confirm-player-name">{pendingPlayer.nation} {pendingPlayer.name}</div>
            <div className="confirm-player-detail">{pendingPlayer.pos} · {pendingPlayer.club} · {pendingPlayer.years}</div>
            <div className="confirm-player-cost">£{pendingPlayer.value}m</div>
            <div className="confirm-btns">
              <button className="menu-item" onClick={() => { handlePickPlayer(pendingPlayer); setPendingPlayer(null); }}>
                ✓ CONFIRM SIGNING
              </button>
              <button className="menu-item" onClick={() => setPendingPlayer(null)}>
                ✕ CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showMySquad && (
        <MySquadPanel manager={activeManager} onClose={() => setShowMySquad(false)} />
      )}

      {showArchetypeLegend && (
        <div className="menu-overlay" onClick={() => setShowArchetypeLegend(false)}>
          <div className="menu-box archetype-legend-box" onClick={e => e.stopPropagation()}>
            <div className="menu-title">ARCHETYPES & ERAS</div>
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
            <button className="menu-item" style={{ marginTop: 14 }} onClick={() => setShowArchetypeLegend(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="draft-header">
        <div className="manager-tabs">
          {/* Active club only */}
          {activeManager && (
            <span
              className="manager-tab active"
              style={{ background: activeManager.primaryColor, color: readableTextOn(activeManager.primaryColor), borderColor: activeManager.secondaryColor }}
              onClick={() => setShowMySquad(s => !s)}
              title="View my squad"
            >
              <span className="tab-kit-dot" style={{ background: activeManager.primaryColor, boxShadow: `inset 0 0 0 1px ${activeManager.secondaryColor}` }} />
              {activeManager.clubName || activeManager.name}
              {activeManager.isComputer && <span className="cpu-tag">CPU</span>}
              <span className="tab-squad-hint">▤</span>
            </span>
          )}
          {/* Mini kit swatches for other clubs */}
          <div className="manager-tabs-others">
            {managers.map((m, i) => i === activeManagerIdx ? null : (
              <span key={i} className="manager-tab-mini" title={`${m.clubName || m.name}${m.isComputer ? " (CPU)" : ""}`}>
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`tab-${i}`} size={16} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Turn banner */}
      <div className="turn-banner">
        <div className="turn-left">
          <KitSwatch
            primary={kitPrimary}
            secondary={kitSecondary}
            pattern={activeManager?.pattern || "plain"}
            uid="banner"
            size={28}
          />
          <span className="turn-name">{activeManager?.dofName || activeManager?.name}</span>
          <span className="turn-club">({activeManager?.clubName})</span>
          <span className="turn-pos">signing: <strong>{needsSlotDraw ? "?" : currentPos.label}</strong></span>
        </div>
        <div className="turn-right">
          {pendingCarryover > 0 && currentBudget === null && (
            <span className="carryover-badge">Carryover: £{pendingCarryover}m</span>
          )}
          {currentBudget !== null && (
            <span className="budget-badge">Budget: £{currentBudget}m</span>
          )}
        </div>
      </div>

      {/* Position progress */}
      <div className="pos-progress">
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
                  className={`pos-chip ${isDone ? "done" : isCurrent ? "current" : "todo"}`}
                >
                  {posLabel}
                </span>
              );
            })}
            {/* Subs divider + chips */}
            <span className="pos-chip-divider" />
            {POSITIONS.slice(11).map((p, i) => {
              const absIdx = 11 + i;
              const label = p.key === "GKSUB" ? "GKS" : p.key === "DEFSUB" ? "DEF" : p.key === "MIDSUB" ? "MID" : p.key === "ATTSUB" ? "ATT" : p.key;
              const state = absIdx < positionIndex ? "done" : absIdx === positionIndex ? "current" : "todo";
              return (
                <span key={absIdx} className={`pos-chip sub ${state}`}>
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
                <span key={i} className={`pos-chip ${i < positionIndex ? "done" : i === positionIndex ? "current" : "todo"}`}>
                  {posLabel}
                </span>
              );
            })}
            <span className="pos-chip-divider" />
            {POSITIONS.slice(11).map((p, i) => {
              const absIdx = 11 + i;
              const label = p.key === "GKSUB" ? "GKS" : p.key === "DEFSUB" ? "DEF" : p.key === "MIDSUB" ? "MID" : p.key === "ATTSUB" ? "ATT" : p.key;
              const state = absIdx < positionIndex ? "done" : absIdx === positionIndex ? "current" : "todo";
              return (
                <span key={absIdx} className={`pos-chip sub ${state}`}>
                  {label}
                </span>
              );
            })}
          </>
        )}
      </div>

      {/* Draft order strip — collapsible */}
      <div className="order-strip-wrap">
        <button className="order-strip-toggle" onClick={() => setShowOrder(s => !s)}>
          DRAFT ORDER {showOrder ? "▲" : "▼"}
        </button>
        {showOrder && (
          <div className="order-strip">
            {currentOrder.map((pi, i) => (
              <span key={i} className={`order-chip ${i === turnIndex ? "now" : i < turnIndex ? "done" : "waiting"}`}>
                {managers[pi].clubName || managers[pi].name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="draft-main">
        {isCpuTurn ? (
          <div className="cpu-turn-area">
            <div className="cpu-turn-badge">CPU TURN</div>
            <div className="cpu-turn-name">{activeManager?.clubName || activeManager?.name}</div>
            <div className="cpu-turn-status">
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
            <div className="cpu-turn-dots"><span>●</span><span>●</span><span>●</span></div>
            {skipCpuTurns && (
              <button className="sim-btn secondary" style={{ marginTop: "1.2rem", fontSize: "13px" }} onClick={skipCpuTurns}>
                ⏭ SKIP CPU
              </button>
            )}
          </div>
        ) : needsSlotDraw ? (
          <div className="roll-area">
            <PositionWheel
              squad={activeManager?.squad}
              onConfirm={confirmSlot}
              formation={activeManager?.formation}
            />
          </div>
        ) : currentBudget === null ? (
          <div className="roll-area">
            <div className="roll-sub">Spin your transfer budget for <strong>{currentPos.label}</strong></div>
            <SpinWheel carryover={pendingCarryover} onConfirm={confirmBudget} difficulty={draft.difficulty} />
          </div>
        ) : (
          <div className="player-list-area">
            <div className="filter-bar">
              <div className="filter-dropdowns-row">
              {showPosChips && (
                <div className="filter-dropdown">
                  <button
                    className={`filter-dropdown-btn${showPosDropdown ? " open" : filterPos.size < OUTFIELD_POS.length ? " partial" : ""}`}
                    onClick={() => { setShowPosDropdown(s => !s); setShowLeagueDropdown(false); setShowEraDropdown(false); setShowTierDropdown(false); setShowArchetypeDropdown(false); }}
                  >
                    POSITION {filterPos.size < OUTFIELD_POS.length ? `(${[...filterPos].join(", ")})` : ""}
                  </button>
                  {showPosDropdown && (
                    <div className="filter-dropdown-menu">
                      {OUTFIELD_POS.map(pos => (
                        <label key={pos} className="filter-checkbox">
                          <input
                            type="checkbox"
                            checked={filterPos.has(pos)}
                            onChange={() => togglePos(pos)}
                          />
                          {pos}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="filter-dropdown">
                <button
                  className={`filter-dropdown-btn${showLeagueDropdown ? " open" : filterLeague.size < 5 ? " partial" : ""}`}
                  onClick={() => { setShowLeagueDropdown(s => !s); setShowPosDropdown(false); setShowEraDropdown(false); setShowTierDropdown(false); setShowArchetypeDropdown(false); }}
                >
                  LEAGUES {filterLeague.size < 5 ? `(${filterLeague.size}/5)` : ""}
                </button>
                {showLeagueDropdown && (
                  <div className="filter-dropdown-menu">
                    {[
                      { value: "premier_league", label: "Premier League" },
                      { value: "la_liga", label: "La Liga" },
                      { value: "serie_a", label: "Serie A" },
                      { value: "bundesliga", label: "Bundesliga" },
                      { value: "ligue_1", label: "Ligue 1" }
                    ].map(league => (
                      <label key={league.value} className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={filterLeague.has(league.value)}
                          onChange={() => toggleLeague(league.value)}
                        />
                        {league.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-dropdown">
                <button
                  className={`filter-dropdown-btn${showEraDropdown ? " open" : filterEra.size < 3 ? " partial" : ""}`}
                  onClick={() => { setShowEraDropdown(s => !s); setShowPosDropdown(false); setShowLeagueDropdown(false); setShowTierDropdown(false); setShowArchetypeDropdown(false); }}
                >
                  ERAS {filterEra.size < 3 ? `(${filterEra.size}/3)` : ""}
                </button>
                {showEraDropdown && (
                  <div className="filter-dropdown-menu">
                    {[
                      { value: "classic", label: "Classic 98–08" },
                      { value: "golden", label: "Golden 08–16" },
                      { value: "modern", label: "Modern 16–" }
                    ].map(era => (
                      <label key={era.value} className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={filterEra.has(era.value)}
                          onChange={() => toggleEra(era.value)}
                        />
                        {era.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-dropdown">
                <button
                  className={`filter-dropdown-btn${showTierDropdown ? " open" : filterTiers.size < 5 ? " partial" : ""}`}
                  onClick={() => { setShowTierDropdown(s => !s); setShowPosDropdown(false); setShowLeagueDropdown(false); setShowEraDropdown(false); setShowArchetypeDropdown(false); }}
                >
                  TIERS {filterTiers.size < 5 ? `(${filterTiers.size}/5)` : ""}
                </button>
                {showTierDropdown && (
                  <div className="filter-dropdown-menu">
                    {[
                      { value: "T1", label: "T1 — Elite" },
                      { value: "T2", label: "T2 — World Class" },
                      { value: "T3", label: "T3 — Star" },
                      { value: "T4", label: "T4 — Quality" },
                      { value: "T5", label: "T5 — Solid" },
                    ].map(tier => (
                      <label key={tier.value} className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={filterTiers.has(tier.value)}
                          onChange={() => toggleTier(tier.value)}
                        />
                        {tier.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-dropdown">
                <button
                  className={`filter-dropdown-btn${showArchetypeDropdown ? " open" : filterArchetypes.size < relevantArchetypes.length ? " partial" : ""}`}
                  onClick={() => { setShowArchetypeDropdown(s => !s); setShowPosDropdown(false); setShowTierDropdown(false); setShowLeagueDropdown(false); setShowEraDropdown(false); }}
                >
                  TYPE {filterArchetypes.size < relevantArchetypes.length ? `(${filterArchetypes.size}/${relevantArchetypes.length})` : ""}
                </button>
                {showArchetypeDropdown && (
                  <div className="filter-dropdown-menu">
                    {relevantArchetypes.map(archetype => {
                      const arc = ARCHETYPE_COLOR[archetype] || { fg: "#aaa" };
                      return (
                        <label key={archetype} className="filter-checkbox">
                          <input
                            type="checkbox"
                            checked={filterArchetypes.has(archetype)}
                            onChange={() => toggleArchetype(archetype)}
                          />
                          <span style={{ color: arc.fg }}>{archetype}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="filter-sort-row">
                <span className="filter-sort-label">SORT</span>
                {[
                  { key: "tier", label: "TIER" },
                  { key: "az", label: "A–Z" },
                  { key: "value", label: "VALUE" },
                ].map(s => (
                  <button
                    key={s.key}
                    className={`sort-btn${sortBy === s.key ? " active" : ""}`}
                    onClick={() => {
                      if (sortBy === s.key) setSortDir(d => d === "asc" ? "desc" : "asc");
                      else { setSortBy(s.key); setSortDir("asc"); }
                    }}
                  >
                    {s.label}{sortBy === s.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                ))}
              </div>

              <div className="filter-badge-controls">
                <button
                  className={`sort-btn${hideBadges ? " active" : ""}`}
                  onClick={() => setHideBadges(h => !h)}
                  title="Toggle era & archetype badges"
                >
                  {hideBadges ? "BADGES OFF" : "BADGES ON"}
                </button>
                <button
                  className="sort-btn legend-btn"
                  onClick={() => setShowArchetypeLegend(true)}
                  title="Archetype & era legend"
                >
                  ?
                </button>
              </div>

              <span className="affordable-count">
                {affordable.length} affordable / {available.length} total
              </span>
              </div>{/* filter-dropdowns-row */}
            </div>

            <div className="player-list">
              {affordable.length === 0 && currentBudget !== null && (
                <div className="no-afford-respin">
                  <div className="no-afford-title">⚠ NO AFFORDABLE PLAYERS</div>
                  <div className="no-afford-msg">
                    £{currentBudget}m isn't enough for anyone available. Re-spin for a new budget —
                    but this money is lost and <strong>no carryover</strong> after this pick.
                  </div>
                  <button className="respin-btn" onClick={respin}>↺ RE-SPIN (NO CARRYOVER)</button>
                </div>
              )}
              {affordable.map(p => (
                <PlayerCard key={p.id} player={p} onPick={handleClickPlayer} canAfford={true} hideRatings={hideRatings} hideBadges={hideBadges} />
              ))}
              {tooExpensive.length > 0 && (
                <>
                  <div className="section-divider">OUT OF BUDGET</div>
                  {tooExpensive.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={hideRatings} hideBadges={hideBadges} />
                  ))}
                </>
              )}
              {takenPlayers.length > 0 && (
                <>
                  <div className="section-divider">ALREADY SIGNED</div>
                  {takenPlayers.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={hideRatings} hideBadges={hideBadges} takenBy={p.ownedBy} />
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

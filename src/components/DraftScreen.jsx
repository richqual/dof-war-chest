import { useState, useEffect } from "react";
import { POSITIONS, generateBudget, chooseCpuPick } from "../data/players";
import PlayerCard from "./PlayerCard";
import SpinWheel from "./SpinWheel";
import TurnTransition from "./TurnTransition";
import MySquadPanel from "./MySquadPanel";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";

const CPU_SPIN_DELAY = 900;
const CPU_PICK_DELAY = 1300;

export default function DraftScreen({
  draft, activeManager, activeManagerIdx, currentPos,
  confirmBudget, pickPlayer, getAvailablePlayers, getTakenPlayers,
  skipTurn, autoCompleteDraft, skipCpuTurns,
}) {
  const [filterEra, setFilterEra] = useState(new Set(["classic", "golden", "modern"]));
  const [filterLeague, setFilterLeague] = useState(new Set(["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1"]));
  const [filterTiers, setFilterTiers] = useState(new Set(["T1", "T2", "T3", "T4", "T5"]));
  const [sortBy, setSortBy] = useState("tier");
  const [sortDir, setSortDir] = useState("asc");
  const [transition, setTransition] = useState(null);
  const [showMySquad, setShowMySquad] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [showEraDropdown, setShowEraDropdown] = useState(false);
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);

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

  const { currentBudget, currentOrder, turnIndex, positionIndex, managers, hideRatings } = draft;

  let available = getAvailablePlayers(currentPos.key);
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
        nextPosLabel = POSITIONS[positionIndex + 1]?.label || "";
      } else {
        nextManagerIdx = currentOrder[turnIndex + 1];
        nextPosLabel = currentPos.label;
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

  // CPU turns run themselves: spin the budget after a short beat, then pick.
  // Pauses while a transition screen is up so the human can follow along.
  const isCpuTurn = !!activeManager?.isComputer;
  useEffect(() => {
    if (!isCpuTurn || transition) return;
    const t = setTimeout(() => {
      if (currentBudget === null) {
        confirmBudget(generateBudget(draft.difficulty));
      } else {
        const pick = chooseCpuPick(getAvailablePlayers(currentPos.key), currentBudget);
        if (pick) handlePickPlayer(pick);
        else skipTurn();
      }
    }, currentBudget === null ? CPU_SPIN_DELAY : CPU_PICK_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuTurn, transition, currentBudget, activeManagerIdx, positionIndex, turnIndex]);

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

      {/* Header */}
      <div className="draft-header">
        <span className="game-title">DoF: War Chest</span>
        <div className="manager-tabs">
          {managers.map((m, i) => (
            <span
              key={i}
              className={`manager-tab ${i === activeManagerIdx ? "active" : ""}`}
              style={i === activeManagerIdx
                ? { background: m.primaryColor, color: readableTextOn(m.primaryColor), borderColor: m.secondaryColor }
                : undefined}
              onClick={i === activeManagerIdx ? () => setShowMySquad(s => !s) : undefined}
              title={i === activeManagerIdx ? "View my squad" : undefined}
            >
              <span className="tab-kit-dot" style={{ background: m.primaryColor, boxShadow: `inset 0 0 0 1px ${m.secondaryColor}` }} />
              {m.clubName || m.name}
              {m.isComputer && <span className="cpu-tag">CPU</span>}
              {i === activeManagerIdx && <span className="tab-squad-hint">▤</span>}
            </span>
          ))}
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
          <span className="turn-pos">signing: <strong>{currentPos.label}</strong></span>
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
        {POSITIONS.map((p, i) => (
          <span key={i} className={`pos-chip ${i < positionIndex ? "done" : i === positionIndex ? "current" : "todo"}`}>
            {i < positionIndex ? "✓" : p.key === "GKSUB" ? "GKS" : p.key === "DEFSUB" ? "DEF" : p.key === "MIDSUB" ? "MID" : p.key === "ATTSUB" ? "ATT" : p.key}
          </span>
        ))}
      </div>

      {/* Draft order strip */}
      <div className="order-strip">
        <span className="order-label">Order:</span>
        {currentOrder.map((pi, i) => (
          <span key={i} className={`order-chip ${i === turnIndex ? "now" : i < turnIndex ? "done" : "waiting"}`}>
            {managers[pi].clubName || managers[pi].name}
          </span>
        ))}
      </div>

      {/* Main area */}
      <div className="draft-main">
        {isCpuTurn ? (
          <div className="cpu-turn-area">
            <div className="cpu-turn-badge">CPU TURN</div>
            <div className="cpu-turn-name">{activeManager?.clubName || activeManager?.name}</div>
            <div className="cpu-turn-status">
              {currentBudget === null
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
        ) : currentBudget === null ? (
          <div className="roll-area">
            <div className="roll-sub">Spin your transfer budget for <strong>{currentPos.label}</strong></div>
            <SpinWheel carryover={pendingCarryover} onConfirm={confirmBudget} difficulty={draft.difficulty} />
          </div>
        ) : (
          <div className="player-list-area">
            <div className="filter-bar">
              <div className="filter-dropdown">
                <button
                  className={`filter-dropdown-btn${showLeagueDropdown ? " open" : filterLeague.size < 5 ? " partial" : ""}`}
                  onClick={() => { setShowLeagueDropdown(s => !s); setShowEraDropdown(false); setShowTierDropdown(false); }}
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
                  onClick={() => { setShowEraDropdown(s => !s); setShowLeagueDropdown(false); setShowTierDropdown(false); }}
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
                  onClick={() => { setShowTierDropdown(s => !s); setShowLeagueDropdown(false); setShowEraDropdown(false); }}
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

              <span className="affordable-count">
                {affordable.length} affordable / {available.length} total
              </span>
            </div>

            <div className="player-list">
              {affordable.length === 0 && (
                <div className="no-afford">
                  No players affordable at £{currentBudget}m — budget carries to your next pick.
                </div>
              )}
              {affordable.map(p => (
                <PlayerCard key={p.id} player={p} onPick={handleClickPlayer} canAfford={true} hideRatings={hideRatings} />
              ))}
              {tooExpensive.length > 0 && (
                <>
                  <div className="section-divider">OUT OF BUDGET</div>
                  {tooExpensive.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={hideRatings} />
                  ))}
                </>
              )}
              {takenPlayers.length > 0 && (
                <>
                  <div className="section-divider">ALREADY SIGNED</div>
                  {takenPlayers.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={hideRatings} takenBy={p.ownedBy} />
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

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
  const [filterEra, setFilterEra] = useState("all");
  const [filterLeague, setFilterLeague] = useState("all");
  const [filterTiers, setFilterTiers] = useState(new Set(["T1", "T2", "T3", "T4", "T5"]));
  const [sortBy, setSortBy] = useState("rating");
  const [transition, setTransition] = useState(null);
  const [showMySquad, setShowMySquad] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);

  function toggleTierFilter(tier) {
    setFilterTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }

  const { currentBudget, currentOrder, turnIndex, positionIndex, managers, hideRatings } = draft;

  let available = getAvailablePlayers(currentPos.key);
  if (filterEra !== "all") available = available.filter(p => p.era === filterEra);
  if (filterLeague !== "all") available = available.filter(p => p.league === filterLeague);

  // When no era filter, consolidate duplicate players by name to their peak version
  // Collects all clubs they played for in that league
  if (filterEra === "all" && filterLeague !== "all") {
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

  // Filter by selected tiers and sort by tier, then random order within tier
  available = available.filter(p => filterTiers.has(p.tier));
  available = [...available].sort((a, b) => {
    // First sort by tier (T1, T2, T3, T4, T5)
    const tierOrder = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 };
    const tierCompare = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierCompare !== 0) return tierCompare;
    // Within same tier, use random order from draft.playerOrder
    const orderA = draft?.playerOrder?.get(a.id) ?? 0;
    const orderB = draft?.playerOrder?.get(b.id) ?? 0;
    return orderA - orderB;
  });

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
            {i < positionIndex ? "✓" : (p.key === "SUB" || p.key === "GKSUB") ? `S${i - 10}` : p.key}
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
                ⏭ SKIP TO MY TURN
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
              <select className="cm-select" value={filterLeague} onChange={e => setFilterLeague(e.target.value)}>
                <option value="all">All leagues</option>
                <option value="premier_league">Premier League</option>
                <option value="la_liga">La Liga</option>
                <option value="serie_a">Serie A</option>
                <option value="bundesliga">Bundesliga</option>
                <option value="ligue_1">Ligue 1</option>
              </select>
              <select className="cm-select" value={filterEra} onChange={e => setFilterEra(e.target.value)}>
                <option value="all">All eras</option>
                <option value="classic">Classic 98–08</option>
                <option value="golden">Golden 08–16</option>
                <option value="modern">Modern 16–</option>
              </select>
              <select className="cm-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="rating">{hideRatings ? "Sort: Alphabetical" : "Sort: Rating ↓"}</option>
                <option value="value">Sort: Cheapest first</option>
              </select>
              <span className="affordable-count">
                {affordable.length} affordable / {available.length} total
              </span>
            </div>

            <div className="tier-filter-bar">
              <span className="tier-label">TIERS:</span>
              {["T1", "T2", "T3", "T4", "T5"].map(tier => (
                <button
                  key={tier}
                  className={`tier-btn ${filterTiers.has(tier) ? "active" : ""}`}
                  onClick={() => toggleTierFilter(tier)}
                >
                  {tier}
                </button>
              ))}
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

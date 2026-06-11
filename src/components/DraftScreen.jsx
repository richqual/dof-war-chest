import { useState, useEffect } from "react";
import { POSITIONS, generateBudget, chooseCpuPick } from "../data/players";
import PlayerCard from "./PlayerCard";
import SpinWheel from "./SpinWheel";
import TurnTransition from "./TurnTransition";
import MySquadPanel from "./MySquadPanel";

const CPU_SPIN_DELAY = 900;
const CPU_PICK_DELAY = 1300;

export default function DraftScreen({
  draft, activeManager, activeManagerIdx, currentPos,
  confirmBudget, pickPlayer, getAvailablePlayers, getTakenPlayers, restartGame,
  skipTurn, autoCompleteDraft,
}) {
  const [filterEra, setFilterEra] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [transition, setTransition] = useState(null);
  const [showMySquad, setShowMySquad] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { currentBudget, currentOrder, turnIndex, positionIndex, managers, hideRatings } = draft;

  let available = getAvailablePlayers(currentPos.key);
  if (filterEra !== "all") available = available.filter(p => p.era === filterEra);
  available = [...available].sort((a, b) =>
    sortBy === "rating" ? b.rating - a.rating : a.value - b.value
  );

  const affordable = available.filter(p => currentBudget !== null && p.value <= currentBudget);
  const tooExpensive = available.filter(p => currentBudget !== null && p.value > currentBudget);
  const takenPlayers = currentBudget !== null ? getTakenPlayers(currentPos.key) : [];
  // carryover shown before spin (what the active manager has banked)
  const pendingCarryover = activeManager?.carryover || 0;

  function handlePickPlayer(player) {
    const prevManagerName = activeManager.dofName || activeManager.name;
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
      setTransition({ prevManager: prevManagerName, player, nextManager: nextName, nextPosLabel });
    }

    pickPlayer(player);
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
        onContinue={() => setTransition(null)}
      />
    );
  }

  return (
    <div className="draft-screen">
      {showMySquad && (
        <MySquadPanel manager={activeManager} onClose={() => setShowMySquad(false)} />
      )}

      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-box" onClick={e => e.stopPropagation()}>
            <div className="menu-title">MENU</div>
            <button className="menu-item" onClick={() => setShowMenu(false)}>▶ CONTINUE DRAFT</button>
            <button className="menu-item" onClick={() => { setShowMenu(false); autoCompleteDraft(); }}>
              ⏩ AUTO-PICK REST &amp; SKIP TO END-GAME
            </button>
            <p className="menu-warn">CPU picks every remaining player instantly and jumps to the squads screen.</p>
            <div className="menu-divider" />
            <button className="menu-item danger" onClick={() => { setShowMenu(false); restartGame(); }}>
              ✕ ABANDON DRAFT &amp; RESTART
            </button>
            <p className="menu-warn">This will clear all progress and return to setup.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="draft-header">
        <span className="game-title">DoF: War Chest</span>
        <div className="manager-tabs">
          {managers.map((m, i) => (
            <span key={i} className={`manager-tab ${i === activeManagerIdx ? "active" : ""}`}>
              {m.clubName || m.name}
              {m.isComputer && <span className="cpu-tag">CPU</span>}
            </span>
          ))}
        </div>
        <div className="draft-header-actions">
          <button className="my-squad-btn" onClick={() => setShowMySquad(s => !s)}>MY SQUAD</button>
          <button className="menu-btn" onClick={() => setShowMenu(true)}>☰</button>
        </div>
      </div>

      {/* Turn banner */}
      <div className="turn-banner">
        <div className="turn-left">
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
            {i < positionIndex ? "✓" : p.key === "SUB" ? `S${i - 10}` : p.key}
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
          </div>
        ) : currentBudget === null ? (
          <div className="roll-area">
            <div className="roll-sub">Spin your transfer budget for <strong>{currentPos.label}</strong></div>
            <SpinWheel carryover={pendingCarryover} onConfirm={confirmBudget} difficulty={draft.difficulty} />
          </div>
        ) : (
          <div className="player-list-area">
            <div className="filter-bar">
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

            <div className="player-list">
              {affordable.length === 0 && (
                <div className="no-afford">
                  No players affordable at £{currentBudget}m — budget carries to your next pick.
                </div>
              )}
              {affordable.map(p => (
                <PlayerCard key={p.id} player={p} onPick={handlePickPlayer} canAfford={true} hideRatings={hideRatings} />
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

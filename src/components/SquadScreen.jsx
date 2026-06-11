import { useState } from "react";
import { POSITIONS, getRatingBg, getRatingColor, formatValue } from "../data/players";

const FORMATIONS = {
  "4-3-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 50, y: 52 },
    { pos: "MF",  x: 28, y: 48 },
    { pos: "MF",  x: 72, y: 48 },
    { pos: "RW",  x: 80, y: 28 },
    { pos: "LW",  x: 20, y: 28 },
    { pos: "ST",  x: 50, y: 14 },
  ],
  "4-4-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 75, y: 50 },
    { pos: "MF",  x: 55, y: 50 },
    { pos: "MF",  x: 35, y: 50 },
    { pos: "RW",  x: 17, y: 50 },
    { pos: "LW",  x: 35, y: 22 },
    { pos: "ST",  x: 65, y: 22 },
  ],
  "4-5-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 50, y: 52 },
    { pos: "MF",  x: 28, y: 46 },
    { pos: "MF",  x: 72, y: 46 },
    { pos: "RW",  x: 82, y: 30 },
    { pos: "LW",  x: 18, y: 30 },
    { pos: "ST",  x: 50, y: 14 },
  ],
};

function squadRating(squad) {
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return 0;
  return Math.round(starters.reduce((s, p) => s + p.rating, 0) / starters.length);
}

function FormationDiagram({ squad, formation, swapSlot, onSlotClick }) {
  const coords = FORMATIONS[formation];
  return (
    <div className="formation-pitch">
      <svg viewBox="0 0 100 100" className="pitch-svg">
        {/* Pitch markings */}
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="#ffffff22" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="#ffffff22" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="12" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="28" y="5" width="44" height="18" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="28" y="77" width="44" height="18" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="38" y="5" width="24" height="8" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="38" y="87" width="24" height="8" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
      </svg>
      <div className="pitch-players">
        {coords.map((coord, i) => {
          const player = squad[i];
          const isSwapping = swapSlot === i;
          return (
            <div
              key={i}
              className={`pitch-dot ${isSwapping ? "swapping" : ""} ${!player ? "empty" : ""}`}
              style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              onClick={() => onSlotClick(i)}
              title={player ? `${player.name} (${player.rating})` : coord.pos}
            >
              <div className="pitch-dot-inner">
                {player ? (
                  <>
                    <div className="dot-rating" style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating) }}>
                      {player.pos}
                    </div>
                    <div className="dot-name">{player.name.split(" ").pop()}</div>
                  </>
                ) : (
                  <div className="dot-empty">{coord.pos}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SquadDetail({ manager, managerIdx, setTeamName, swapSquadPlayers, onBack, onSimulate, allManagers, managers }) {
  const [formation, setFormation] = useState("4-3-3");
  const [swapSlot, setSwapSlot] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(manager.teamName || "");

  const starters = manager.squad.slice(0, 11);
  const bench = manager.squad.slice(11);

  function handleSlotClick(idx) {
    if (swapSlot === null) {
      setSwapSlot(idx);
    } else if (swapSlot === idx) {
      setSwapSlot(null);
    } else {
      swapSquadPlayers(managerIdx, swapSlot, idx);
      setSwapSlot(null);
    }
  }

  function handleBenchClick(idx) {
    const realIdx = idx + 11;
    if (swapSlot === null) {
      setSwapSlot(realIdx);
    } else if (swapSlot === realIdx) {
      setSwapSlot(null);
    } else {
      swapSquadPlayers(managerIdx, swapSlot, realIdx);
      setSwapSlot(null);
    }
  }

  function exportSquad() {
    const lines = [
      `=== ${manager.teamName || manager.name}'s Squad ===`,
      `Overall: ${squadRating(manager.squad)}`,
      "",
      "STARTING XI:",
      ...starters.map((p, i) => p ? `  ${POSITIONS[i].key.padEnd(3)} ${p.name} (${p.rating}) — ${formatValue(p.value)}` : `  ${POSITIONS[i].key.padEnd(3)} [empty]`),
      "",
      "BENCH:",
      ...bench.map((p, i) => p ? `  SUB ${p.name} (${p.rating}) — ${formatValue(p.value)}` : `  SUB [empty]`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("Copied to clipboard!")).catch(() => alert(lines.join("\n")));
  }

  return (
    <div className="squad-detail">
      <div className="squad-detail-header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <div className="squad-title-area">
          {editingName ? (
            <input
              className="team-name-input"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={() => { setTeamName(managerIdx, nameInput); setEditingName(false); }}
              onKeyDown={e => { if (e.key === "Enter") { setTeamName(managerIdx, nameInput); setEditingName(false); } }}
              autoFocus
              maxLength={24}
            />
          ) : (
            <span className="squad-team-name" onClick={() => setEditingName(true)}>
              {manager.teamName || manager.name} <span className="edit-hint">✎</span>
            </span>
          )}
          <span className="ovr-badge">OVR {squadRating(manager.squad)}</span>
        </div>
        <div className="squad-actions">
          <button className="action-btn" onClick={exportSquad}>EXPORT</button>
          {allManagers.length >= 2 && onSimulate && (
            <button className="action-btn primary" onClick={() => {
              const awayIdx = managers ? managers.findIndex((_, i) => i !== managerIdx) : (managerIdx + 1) % allManagers.length;
              onSimulate(managerIdx, awayIdx);
            }}>SIMULATE</button>
          )}
        </div>
      </div>

      <div className="formation-bar">
        {Object.keys(FORMATIONS).map(f => (
          <button
            key={f}
            className={`formation-btn ${formation === f ? "active" : ""}`}
            onClick={() => setFormation(f)}
          >
            {f}
          </button>
        ))}
        {swapSlot !== null && (
          <span className="swap-hint">Click another slot to swap · <button className="cancel-swap" onClick={() => setSwapSlot(null)}>Cancel</button></span>
        )}
      </div>

      <FormationDiagram
        squad={starters}
        formation={formation}
        swapSlot={swapSlot}
        onSlotClick={handleSlotClick}
      />

      <div className="starting-xi-section">
        <div className="section-title">STARTING XI</div>
        <div className="starting-xi-list">
          {starters.map((p, i) => p ? (
            <div key={i} className="xi-row">
              <span className="xi-pos">{POSITIONS[i].key === "SUB" ? "SUB" : POSITIONS[i].key}</span>
              <span className="xi-nation">{p.nation}</span>
              <span className="xi-name">{p.name}</span>
              <span className="xi-club">{p.club}</span>
              <span className="xi-rating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</span>
            </div>
          ) : null)}
        </div>
      </div>

      <div className="bench-section">
        <div className="section-title">BENCH</div>
        <div className="bench-list">
          {bench.map((p, i) => (
            <div
              key={i}
              className={`bench-item ${swapSlot === i + 11 ? "swapping" : ""} ${!p ? "empty" : ""}`}
              onClick={() => handleBenchClick(i)}
            >
              {p ? (
                <>
                  <span className="bench-pos">SUB</span>
                  <span className="bench-nation">{p.nation}</span>
                  <span className="bench-name">{p.name}</span>
                  <span className="bench-club">{p.club}</span>
                  <span className="bench-rating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</span>
                  <span className="bench-value">{formatValue(p.value)}</span>
                </>
              ) : (
                <span className="bench-empty">Sub {i + 1} — empty</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SquadScreen({ draft, setTeamName, swapSquadPlayers, restartGame, setScreen }) {
  const [viewIdx, setViewIdx] = useState(null);
  const { managers } = draft;

  if (viewIdx !== null) {
    return (
      <SquadDetail
        manager={managers[viewIdx]}
        managerIdx={viewIdx}
        setTeamName={setTeamName}
        swapSquadPlayers={swapSquadPlayers}
        onBack={() => setViewIdx(null)}
        onSimulate={(hi, ai) => { setScreen("match", { homeIdx: hi, awayIdx: ai }); }}
        allManagers={managers}
        managers={managers}
      />
    );
  }

  return (
    <div className="squads-screen">
      <div className="squads-header">
        <div className="trophy-icon">🏆</div>
        <h2 className="squads-title">DRAFT COMPLETE</h2>
        <p className="squads-sub">Select a squad to view or simulate a match</p>
      </div>

      <div className="squad-cards">
        {managers.map((m, i) => {
          const ovr = squadRating(m.squad);
          const starters = m.squad.slice(0, 11).filter(Boolean);
          const best = [...starters].sort((a, b) => b.rating - a.rating)[0];
          return (
            <div key={i} className="squad-summary-card" onClick={() => setViewIdx(i)}>
              <div className="squad-ovr">{ovr}</div>
              <div className="squad-ovr-label">OVERALL</div>
              <div className="squad-mgr-name">{m.teamName || m.name}</div>
              {best && <div className="squad-best">Best: {best.name} ({best.rating})</div>}
              <div className="squad-link">VIEW SQUAD →</div>
            </div>
          );
        })}
      </div>

      {managers.length >= 2 && (
        <div className="match-section">
          <div className="section-title-white">SIMULATE MATCH</div>
          <div className="matchup-grid">
            {managers.flatMap((home, hi) =>
              managers
                .map((away, ai) => ({ away, ai }))
                .filter(({ ai }) => ai > hi)
                .map(({ away, ai }) => (
                  <button
                    key={`${hi}-${ai}`}
                    className="matchup-btn"
                    onClick={() => setScreen("match", { homeIdx: hi, awayIdx: ai })}
                  >
                    {home.teamName || home.name} vs {away.teamName || away.name}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      <div className="squads-footer">
        <button className="restart-btn" onClick={restartGame}>NEW GAME</button>
      </div>
    </div>
  );
}

export { squadRating };

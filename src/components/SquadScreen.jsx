import { useState } from "react";
import { POSITIONS, getRatingBg, getRatingColor, formatValue, ERA_LABELS, ERA_COLORS, ERA_BG } from "../data/players";
import { TIER_LABELS, TIER_COLORS, TIER_BG } from "../data/managers";
import KitSwatch, { kitAccent } from "./KitSwatch";

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
    { pos: "RW",  x: 80, y: 26 },
    { pos: "LW",  x: 20, y: 26 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "4-4-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 78, y: 50 },
    { pos: "MF",  x: 56, y: 50 },
    { pos: "MF",  x: 34, y: 50 },
    { pos: "RW",  x: 12, y: 50 },
    { pos: "LW",  x: 34, y: 20 },
    { pos: "ST",  x: 66, y: 20 },
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
    { pos: "RW",  x: 82, y: 28 },
    { pos: "LW",  x: 18, y: 28 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "3-5-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 86, y: 54 },
    { pos: "LB",  x: 14, y: 54 },
    { pos: "CB",  x: 67, y: 74 },
    { pos: "CB",  x: 33, y: 74 },
    { pos: "DM",  x: 50, y: 74 },
    { pos: "MF",  x: 28, y: 44 },
    { pos: "MF",  x: 50, y: 42 },
    { pos: "RW",  x: 72, y: 44 },
    { pos: "LW",  x: 33, y: 20 },
    { pos: "ST",  x: 67, y: 20 },
  ],
  "3-4-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 86, y: 56 },
    { pos: "LB",  x: 14, y: 56 },
    { pos: "CB",  x: 65, y: 74 },
    { pos: "CB",  x: 35, y: 74 },
    { pos: "DM",  x: 50, y: 74 },
    { pos: "MF",  x: 34, y: 48 },
    { pos: "MF",  x: 66, y: 48 },
    { pos: "RW",  x: 78, y: 20 },
    { pos: "LW",  x: 22, y: 20 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "5-3-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 88, y: 64 },
    { pos: "LB",  x: 12, y: 64 },
    { pos: "CB",  x: 70, y: 76 },
    { pos: "CB",  x: 30, y: 76 },
    { pos: "DM",  x: 50, y: 74 },
    { pos: "MF",  x: 25, y: 48 },
    { pos: "MF",  x: 50, y: 46 },
    { pos: "RW",  x: 75, y: 48 },
    { pos: "LW",  x: 33, y: 20 },
    { pos: "ST",  x: 67, y: 20 },
  ],
  "5-4-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 88, y: 64 },
    { pos: "LB",  x: 12, y: 64 },
    { pos: "CB",  x: 70, y: 76 },
    { pos: "CB",  x: 30, y: 76 },
    { pos: "DM",  x: 50, y: 74 },
    { pos: "MF",  x: 18, y: 48 },
    { pos: "MF",  x: 40, y: 48 },
    { pos: "RW",  x: 60, y: 48 },
    { pos: "LW",  x: 82, y: 48 },
    { pos: "ST",  x: 50, y: 14 },
  ],
};

const TACTICS = ["defensive", "balanced", "attacking"];

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

function SquadDetail({ manager, managerIdx, setTeamName, swapSquadPlayers, setTactics, onBack, onSimulate, allManagers, managers }) {
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

  const fm = manager.footballManager;
  const STYLE_TACTICAL_LINE = {
    pressing:   "plays in a relentless high-press style — they win it back fast and hit hard.",
    counter:    "sit deep and hit on the counter — disciplined, dangerous, and hard to break down.",
    attacking:  "go for the jugular — high-tempo, attack-minded, and fearless.",
    possession: "control the game through the ball — patient, precise, and suffocating.",
    direct:     "play direct and physical — aerial threat, set pieces, and raw intensity.",
    wildcard:   "are impossible to predict — anything could happen, and usually does.",
  };

  return (
    <div className="squad-detail">
      {fm && (
        <div className="mgr-squad-banner">
          <div className="mgr-squad-badges">
            <span
              className="era-badge"
              style={{ background: ERA_BG[fm.era], color: ERA_COLORS[fm.era], border: `1px solid ${ERA_COLORS[fm.era]}55` }}
            >
              {ERA_LABELS[fm.era]}
            </span>
            <span
              className="mgr-tier-badge"
              style={{ background: TIER_BG[fm.tier], color: TIER_COLORS[fm.tier], border: `1px solid ${TIER_COLORS[fm.tier]}88` }}
            >
              {TIER_LABELS[fm.tier]}
            </span>
          </div>
          <div className="mgr-squad-name">{fm.name}</div>
          <div className="mgr-squad-club">{fm.club} · {fm.years}</div>
          <div className="mgr-squad-style">{fm.styleLabel}</div>
          <div className="mgr-squad-tactical">
            Your team {STYLE_TACTICAL_LINE[fm.style] || fm.flavourText}
          </div>
          <div className="mgr-squad-flavour">"{fm.flavourText}"</div>
        </div>
      )}
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

      <div className="squad-layout">
        {/* Left column: formation selector + pitch */}
        <div className="squad-left">
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
          </div>

          <FormationDiagram
            squad={starters}
            formation={formation}
            swapSlot={swapSlot}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Right column: tactics + XI list + bench */}
        <div className="squad-right">
          <div className="tactics-bar">
            <span className="tactics-label">TACTICS</span>
            {TACTICS.map(t => (
              <button
                key={t}
                data-t={t}
                className={`tactics-btn ${(manager.tactics || "balanced") === t ? "active" : ""}`}
                onClick={() => setTactics && setTactics(managerIdx, t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {swapSlot !== null && (
            <div className="swap-hint-bar">
              Select a player to swap with · <button className="cancel-swap" onClick={() => setSwapSlot(null)}>Cancel</button>
            </div>
          )}

          <div className="starting-xi-section">
            <div className="section-title">STARTING XI</div>
            <div className="starting-xi-list">
              {starters.map((p, i) => p ? (
                <div
                  key={i}
                  className={`xi-row ${swapSlot === i ? "swapping" : ""}`}
                  onClick={() => handleSlotClick(i)}
                >
                  <span className="xi-pos">{POSITIONS[i].key}</span>
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
      </div>
    </div>
  );
}

export default function SquadScreen({ draft, setTeamName, swapSquadPlayers, setTactics, restartGame, setScreen, onBackToSeries }) {
  const [viewIdx, setViewIdx] = useState(null);
  const { managers } = draft;
  const inSeries = !!draft.series;

  if (viewIdx !== null) {
    return (
      <SquadDetail
        manager={managers[viewIdx]}
        managerIdx={viewIdx}
        setTeamName={setTeamName}
        swapSquadPlayers={swapSquadPlayers}
        setTactics={setTactics}
        onBack={() => setViewIdx(null)}
        onSimulate={inSeries ? null : (hi, ai) => { setScreen("match", { homeIdx: hi, awayIdx: ai }); }}
        allManagers={managers}
        managers={managers}
      />
    );
  }

  return (
    <div className="squads-screen">
      <div className="squads-header">
        {onBackToSeries && (
          <button className="back-btn" style={{ marginBottom: "0.5rem" }} onClick={onBackToSeries}>← BACK TO TOURNAMENT</button>
        )}
        <div className="trophy-icon">🏆</div>
        <h2 className="squads-title">DRAFT COMPLETE</h2>
        <p className="squads-sub">Select a squad to view details</p>
      </div>

      <div className="squad-cards">
        {managers.map((m, i) => {
          const ovr = squadRating(m.squad);
          const starters = m.squad.slice(0, 11).filter(Boolean);
          const best = [...starters].sort((a, b) => b.rating - a.rating)[0];
          const accent = kitAccent(m.primaryColor, m.secondaryColor);
          return (
            <div key={i} className="squad-summary-card" onClick={() => setViewIdx(i)}
              style={{ borderColor: m.primaryColor }}>
              <div className="squad-card-kit-header" style={{ background: m.primaryColor, borderBottom: `2px solid ${m.secondaryColor}` }}>
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`sc${i}`} size={28} />
                <span className="squad-card-club" style={{ color: accent === m.primaryColor ? m.secondaryColor : accent }}>
                  {m.teamName || m.clubName || m.name}
                </span>
              </div>
              <div className="squad-ovr" style={{ color: accent }}>{ovr}</div>
              <div className="squad-ovr-label">OVERALL</div>
              {m.footballManager && (
                <div className="squad-card-mgr">⚙ {m.footballManager.name}</div>
              )}
              {best && <div className="squad-best">Best: {best.name} ({best.rating})</div>}
              <div className="squad-link">VIEW SQUAD →</div>
            </div>
          );
        })}
      </div>

      {!inSeries && managers.length >= 2 && (
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
        {onBackToSeries && (
          <button className="sim-btn secondary" onClick={onBackToSeries}>← BACK TO TOURNAMENT</button>
        )}
        {!onBackToSeries && (
          <button className="restart-btn" onClick={restartGame}>NEW GAME</button>
        )}
      </div>
    </div>
  );
}

export { squadRating };

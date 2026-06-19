import { POSITIONS, getRatingBg, getRatingColor, formatValue } from "../data/players";
import { FORMATIONS } from "../data/formations";
import { ARCHETYPE_COLOR } from "./PlayerCard";

export default function MySquadPanel({ manager, onClose, hideRatings = false }) {
  const { squad, name, teamName, formation, footballManager: fm } = manager;
  const filled = squad.filter(Boolean);
  const totalValue = filled.reduce((sum, p) => sum + (p.value || 0), 0);
  const fmSlots = FORMATIONS[formation] ?? [];

  function slotLabel(i) {
    if (i < 11) {
      const s = fmSlots[i];
      return s?.pos ?? POSITIONS[i].key;
    }
    const key = POSITIONS[i].key;
    if (key === "GKSUB")  return "GKS";
    if (key === "DEFSUB") return "DEF";
    if (key === "MIDSUB") return "MID";
    if (key === "ATTSUB") return "ATT";
    return key;
  }

  return (
    <div className="my-squad-panel">
      <div className="msp-header">
        <span className="msp-title">{teamName || name}'s Squad</span>
      </div>
      <div className="msp-list">
        {POSITIONS.map((pos, i) => {
          const player = squad[i];
          return (
            <div key={i} className={`msp-row ${player ? "filled" : "empty"}`}>
              <span className="msp-pos">{slotLabel(i)}</span>
              {player ? (
                <>
                  <span className="msp-nation">{player.nation}</span>
                  <span className="msp-name">{player.name}</span>
                  {player.archetype && (() => {
                    const arc = ARCHETYPE_COLOR[player.archetype] || { bg: "#222", fg: "#aaa" };
                    const preferred = fm?.preferredArchetypes?.includes(player.archetype);
                    return (
                      <span className="msp-archetype" style={{ background: arc.bg, color: arc.fg, border: `1px solid ${preferred ? arc.fg : arc.fg + "44"}`, opacity: preferred ? 1 : 0.55 }}>
                        {player.archetype}
                      </span>
                    );
                  })()}
                  {!hideRatings && (
                    <span
                      className="msp-rating"
                      style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating) }}
                    >
                      {player.rating}
                    </span>
                  )}
                </>
              ) : (
                <span className="msp-empty">—</span>
              )}
            </div>
          );
        })}
      </div>
      {fm && (
        <div className="msp-manager">
          <div className="msp-mgr-name">⚙ {fm.name}</div>
          <div className="msp-mgr-style">{fm.styleLabel}</div>
          {fm.preferredArchetypes?.length > 0 && (
            <div className="msp-mgr-archetypes">
              <span className="msp-mgr-arc-label">FAVOURS</span>
              {fm.preferredArchetypes.map(a => {
                const arc = ARCHETYPE_COLOR[a] || { bg: "#222", fg: "#aaa" };
                return (
                  <span key={a} className="archetype-badge" style={{ background: arc.bg, color: arc.fg, border: `1px solid ${arc.fg}44` }}>
                    {a}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="msp-footer">
        <span>{filled.length} / {POSITIONS.length} signed</span>
        <span className="msp-value">{formatValue(totalValue)}</span>
        <button className="msp-close" onClick={onClose}>✕ HIDE</button>
      </div>
    </div>
  );
}

import { POSITIONS, getRatingBg, getRatingColor, formatValue } from "../data/players";

export default function MySquadPanel({ manager, onClose }) {
  const { squad, name, teamName } = manager;
  const filled = squad.filter(Boolean);
  const totalValue = filled.reduce((sum, p) => sum + (p.value || 0), 0);

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
              <span className="msp-pos">{pos.key === "SUB" ? `S${i - 10}` : pos.key}</span>
              {player ? (
                <>
                  <span className="msp-nation">{player.nation}</span>
                  <span className="msp-name">{player.name}</span>
                  <span
                    className="msp-rating"
                    style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating) }}
                  >
                    {player.rating}
                  </span>
                </>
              ) : (
                <span className="msp-empty">—</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="msp-footer">
        <span>{filled.length} / {POSITIONS.length} signed</span>
        <span className="msp-value">{formatValue(totalValue)}</span>
        <button className="msp-close" onClick={onClose}>✕ HIDE</button>
      </div>
    </div>
  );
}

import { ERA_COLORS, ERA_BG, formatValue, getRatingColor, getRatingBg } from "../data/players";

export const ARCHETYPE_COLOR = {
  Warrior:          { bg: "#5a1a1a", fg: "#ff6b6b" },
  Technician:       { bg: "#1a2a4a", fg: "#6ba8ff" },
  Maverick:         { bg: "#2d1a4a", fg: "#b06bff" },
  Grinder:          { bg: "#1a2a1a", fg: "#6bbb6b" },
  Leader:           { bg: "#3a2a00", fg: "#f0c040" },
  Athlete:          { bg: "#003a3a", fg: "#40d4d4" },
  "Sweeper Keeper": { bg: "#1a3a1a", fg: "#60d080" },
  "Shot Stopper":   { bg: "#3a1a1a", fg: "#ff7050" },
  Organiser:        { bg: "#1a1a3a", fg: "#8899ff" },
};

const ERA_INITIAL = { classic: "C", golden: "G", modern: "M" };
const ERA_FULL = { classic: "Classic (98–08)", golden: "Golden (08–16)", modern: "Modern (16–)" };

export default function PlayerCard({ player, onPick, canAfford, compact = false, hideRatings = false, takenBy = null, hideBadges = false }) {
  const cardClass = takenBy
    ? "player-card taken"
    : `player-card ${canAfford ? "affordable" : "unaffordable"}`;
  return (
    <div
      className={cardClass}
      onClick={() => canAfford && !takenBy && onPick && onPick(player)}
      style={{ opacity: takenBy ? 0.55 : canAfford ? 1 : 0.45, cursor: canAfford && onPick && !takenBy ? "pointer" : "default" }}
    >
      {!hideRatings && (
        <div
          className="rating-badge"
          style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating) }}
        >
          {player.rating}
        </div>
      )}

      <div className="card-info">
        <div className="card-name-row">
          <span className="card-name">{player.nation} {player.name}</span>
          {!hideBadges && (
            <span
              className="era-badge era-badge--initial"
              style={{
                background: ERA_BG[player.era],
                color: ERA_COLORS[player.era],
                border: `1px solid ${ERA_COLORS[player.era]}55`,
              }}
              title={ERA_FULL[player.era]}
            >
              {ERA_INITIAL[player.era]}
            </span>
          )}
          {!hideBadges && player.archetype && (() => {
            const arc = ARCHETYPE_COLOR[player.archetype] || { bg: "#222", fg: "#aaa" };
            return (
              <span
                className="archetype-badge archetype-badge--initial"
                style={{ background: arc.bg, color: arc.fg, border: `1px solid ${arc.fg}44` }}
                title={player.archetype}
              >
                {player.archetype[0]}
              </span>
            );
          })()}
        </div>
        {!compact && (
          <div className="card-club">{player.club} · {player.years}</div>
        )}
      </div>

      <div className="card-value" style={{ color: canAfford ? "#f0d060" : "#888" }}>
        {formatValue(player.value)}
      </div>

      {takenBy ? (
        <div className="taken-label">SIGNED BY<span>{takenBy}</span></div>
      ) : canAfford && onPick ? (
        <div className="pick-btn">SIGN</div>
      ) : null}
    </div>
  );
}

import { ERA_LABELS, ERA_COLORS, ERA_BG, formatValue, getRatingColor, getRatingBg } from "../data/players";

export default function PlayerCard({ player, onPick, canAfford, compact = false, hideRatings = false, takenBy = null }) {
  const cardClass = takenBy
    ? "player-card taken"
    : `player-card ${canAfford ? "affordable" : "unaffordable"}`;
  return (
    <div
      className={cardClass}
      onClick={() => canAfford && !takenBy && onPick && onPick(player)}
      style={{ opacity: takenBy ? 0.55 : canAfford ? 1 : 0.45, cursor: canAfford && onPick && !takenBy ? "pointer" : "default" }}
    >
      <div
        className="rating-badge"
        style={hideRatings
          ? { background: "#2a2a2a", color: "#666" }
          : { background: getRatingBg(player.rating), color: getRatingColor(player.rating) }
        }
      >
        {hideRatings ? "?" : player.rating}
      </div>

      <div className="card-info">
        <div className="card-name-row">
          <span className="card-name">{player.nation} {player.name}</span>
          <span
            className="era-badge"
            style={{
              background: ERA_BG[player.era],
              color: ERA_COLORS[player.era],
              border: `1px solid ${ERA_COLORS[player.era]}55`,
            }}
          >
            {ERA_LABELS[player.era]}
          </span>
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

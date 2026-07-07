import { formatValue, getRatingColor, getRatingBg } from "../data/players";

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

export default function PlayerCard({ player, onPick, canAfford, compact = false, hideRatings = false, takenBy = null, hideBadges = false, budget = null }) {
  const rowClass = takenBy
    ? "bw-player-row taken"
    : `bw-player-row ${canAfford ? "affordable" : "unaffordable"}`;
  const overAmount = !takenBy && !canAfford && budget != null ? player.value - budget : null;

  return (
    <div
      className={rowClass}
      onClick={() => canAfford && !takenBy && onPick && onPick(player)}
      style={{ cursor: canAfford && onPick && !takenBy ? "pointer" : "default" }}
    >
      {!hideRatings && (
        <div
          className="bw-player-rating"
          style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating) }}
        >
          {player.rating}
        </div>
      )}

      <div className="bw-player-info">
        <div className="bw-player-name-row">
          <span className="bw-player-name">{player.nation} {player.name}</span>
          {!hideBadges && player.archetype && (
            <span className="bw-player-tag">{player.archetype}</span>
          )}
        </div>
        {!compact && (
          <div className="bw-player-club">{player.club} · {player.years}</div>
        )}
      </div>

      <div className="bw-player-value">{formatValue(player.value)}</div>

      {takenBy ? (
        <div className="bw-player-taken">SIGNED BY<span>{takenBy}</span></div>
      ) : canAfford && onPick ? (
        <div className="bw-player-sign-btn">SIGN</div>
      ) : overAmount != null ? (
        <div className="bw-player-over-btn">{formatValue(overAmount)} OVER</div>
      ) : null}
    </div>
  );
}

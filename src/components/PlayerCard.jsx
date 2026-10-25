import { formatValue, getRatingColor, getRatingBg } from "../data/players";
import { ageInSeason, LATEST_SEASON } from "../utils/season";

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

export default function PlayerCard({ player, onPick, canAfford, compact = false, hideRatings = false, takenBy = null, hideBadges = false, budget = null, preferredArchetypes = null, preferredGkArchetype = null, outOfPos = null, season = null }) {
  const arch = player.archetype;
  // Age at the start of the chosen season (today's season when none is set, i.e.
  // non-season modes). Null when the player has no enriched birthYear.
  const age = player.birthYear != null ? ageInSeason(player.birthYear, season ?? LATEST_SEASON) : null;
  const archColors = arch ? ARCHETYPE_COLOR[arch] : null;
  // Keepers have their own archetype set, so match against the manager's
  // preferred GK archetype rather than the outfield preferences.
  const effectivePreferred = player.pos === "GK"
    ? (preferredGkArchetype ? [preferredGkArchetype] : null)
    : preferredArchetypes;
  const isPreferred = arch && effectivePreferred && effectivePreferred.includes(arch);
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
          {outOfPos && (
            <span
              className="bw-player-tag bw-player-tag-oop"
              title={`Out of position (natural ${player.pos}) — plays with a match-rating penalty here`}
            >
              {outOfPos}
            </span>
          )}
          {!hideBadges && arch && (
            <span
              className="bw-player-tag"
              style={archColors ? {
                background: archColors.bg,
                color: archColors.fg,
                borderColor: `${archColors.fg}55`,
                opacity: effectivePreferred && !isPreferred ? 0.55 : 1,
              } : undefined}
              title={isPreferred ? `Preferred archetype for your Director of Football` : undefined}
            >
              {arch}
            </span>
          )}
        </div>
        {!compact && (
          <div className="bw-player-club">
            {player.club} · {player.years}
            {age != null && <span className="bw-player-age"> · Age {age}</span>}
          </div>
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

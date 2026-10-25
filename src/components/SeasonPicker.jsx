import { allSeasons, seasonLabel, eraForSeason } from "../utils/season";

// Season Pool game-setup control. Picks a single season (end-year) that gates
// the draftable pool to players (and managers) active then, or "All seasons"
// for today's cross-era pool. value is a season number or null; onChange gets
// the same. Range/era presets with a per-player season roll land in Phase 2.
const ERA_LABEL = { classic: "Classic", golden: "Golden", modern: "Modern" };

export default function SeasonPicker({ value, onChange }) {
  const seasons = allSeasons().slice().reverse(); // newest first
  const era = value != null ? eraForSeason(value) : null;
  return (
    <>
      <div className="bw-setup-row">
        <span className="bw-setup-label">SEASON</span>
        <div className="bw-setup-select-wrap">
          <select
            className="bw-setup-select"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">All seasons</option>
            {seasons.map((s) => (
              <option key={s} value={s}>{seasonLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="bw-setup-hint">
        {value == null
          ? "Every era at once — the full player pool (today's default)"
          : `Only players & managers active in ${seasonLabel(value)}${era ? ` · ${ERA_LABEL[era]} era` : ""}, at today's ratings`}
      </div>
    </>
  );
}

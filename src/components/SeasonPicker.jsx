import { allSeasons, seasonLabel, ERA_PRESETS } from "../utils/season";

// Season Pool game-setup control. `value`/`onChange` are string KEYS:
//   "all:peak"   — every player at their peak, one card each (default)
//   "all:random" — every player at a random point in their career
//   "range:<preset>" — Classic / Golden / Modern; one rolled season per player
//   "season:<endYear>" — a single season, everyone pinned to it
// The lobby turns the key into a playerFilter via filterForKey().
const PRESETS = [
  ["classic", "Classic"],
  ["golden", "Golden"],
  ["modern", "Modern"],
];

function hintFor(key) {
  if (key === "all:peak")
    return "Every player at their peak — the classic pool, now with ages";
  if (key === "all:random")
    return "Every player at a random point in their career — young bargains and fading veterans alike";
  if (key.startsWith("range:")) {
    const p = key.slice(6);
    const r = ERA_PRESETS[p];
    return r
      ? `Only the ${seasonLabel(r.from)}–${seasonLabel(r.to)} era — each player rolled to one season within it`
      : "";
  }
  if (key.startsWith("season:")) {
    const s = Number(key.slice(7));
    return `Only players & managers active in ${seasonLabel(s)}, at that season's ratings`;
  }
  return "";
}

export default function SeasonPicker({ value = "all:peak", onChange }) {
  const seasons = allSeasons().slice().reverse(); // newest first
  return (
    <>
      <div className="bw-setup-row">
        <span className="bw-setup-label">SEASON</span>
        <div className="bw-setup-select-wrap">
          <select
            className="bw-setup-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <optgroup label="All seasons">
              <option value="all:peak">All seasons · Peak</option>
              <option value="all:random">All seasons · Random</option>
            </optgroup>
            <optgroup label="Eras (random season each)">
              {PRESETS.map(([k, label]) => (
                <option key={k} value={`range:${k}`}>
                  {label} ({seasonLabel(ERA_PRESETS[k].from)}–{seasonLabel(ERA_PRESETS[k].to)})
                </option>
              ))}
            </optgroup>
            <optgroup label="Single season">
              {seasons.map((s) => (
                <option key={s} value={`season:${s}`}>{seasonLabel(s)}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
      <div className="bw-setup-hint">{hintFor(value)}</div>
    </>
  );
}

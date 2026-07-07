// Prominent on/off toggle for Draft Roulette, with independent era/league sub-toggles.
// Mirrors the visual weight of DRAFT ORDER — this is meant to feel like a headline option, not a buried checkbox.
export default function DraftRouletteToggle({ value, onChange }) {
  const { enabled, era, league } = value;

  function setEnabled(next) {
    if (!next) {
      onChange({ enabled: false, era: false, league: false });
    } else {
      onChange({ enabled: true, era: era || (!era && !league), league });
    }
  }

  function toggleAxis(axis) {
    const next = { ...value, [axis]: !value[axis] };
    // Can't have the mode on with both axes off — flip the other one on instead.
    if (!next.era && !next.league) next[axis === "era" ? "league" : "era"] = true;
    onChange(next);
  }

  return (
    <>
      <div className="bw-setup-row">
        <span className="bw-setup-label">🎰 DRAFT ROULETTE</span>
        <div className="bw-tactics-toggle">
          <button className={`bw-tactics-seg ${!enabled ? "active" : ""}`} onClick={() => setEnabled(false)}>OFF</button>
          <button className={`bw-tactics-seg ${enabled ? "active" : ""}`} onClick={() => setEnabled(true)}>ON</button>
        </div>
      </div>
      <div className="bw-setup-hint">
        Every card is in play — each drafter spins for a random era and/or league pool, and can only draft from theirs
      </div>

      {enabled && (
        <div className="bw-pool-list bw-setup-block">
          <label className={`bw-pool-row ${era ? "checked" : "unchecked"}`}>
            <input type="checkbox" checked={era} onChange={() => toggleAxis("era")} />
            <span className="bw-pool-check-icon">{era ? "✓" : ""}</span>
            <span className="bw-pool-label-wrap">
              <span className="bw-pool-label">Randomise Era</span>
              <span className="bw-pool-label-sub">Classic, Golden, or Modern</span>
            </span>
          </label>
          <label className={`bw-pool-row ${league ? "checked" : "unchecked"}`}>
            <input type="checkbox" checked={league} onChange={() => toggleAxis("league")} />
            <span className="bw-pool-check-icon">{league ? "✓" : ""}</span>
            <span className="bw-pool-label-wrap">
              <span className="bw-pool-label">Randomise League</span>
              <span className="bw-pool-label-sub">Premier League, La Liga, Serie A, Bundesliga, or Ligue 1</span>
            </span>
          </label>
        </div>
      )}
    </>
  );
}

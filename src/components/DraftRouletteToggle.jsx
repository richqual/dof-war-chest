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
    <div className="draft-roulette-toggle">
      <div className="setup-row">
        <span className="setup-row-label">🎰 DRAFT ROULETTE</span>
        <div className="setup-row-btns">
          <button
            className={`setup-row-btn ${!enabled ? "active" : ""}`}
            onClick={() => setEnabled(false)}
          >
            OFF
          </button>
          <button
            className={`setup-row-btn ${enabled ? "active" : ""}`}
            onClick={() => setEnabled(true)}
          >
            ON
          </button>
        </div>
      </div>
      <div className="difficulty-hint setup-row-hint">
        Every card is in play — each drafter spins for a random era and/or league pool, and can only draft from theirs
      </div>

      {enabled && (
        <div className="draft-roulette-axes">
          <label className="option-row">
            <input
              type="checkbox"
              className="option-checkbox"
              checked={era}
              onChange={() => toggleAxis("era")}
            />
            <span className="option-label">Randomise Era</span>
            <span className="option-hint">Classic, Golden, or Modern</span>
          </label>
          <label className="option-row">
            <input
              type="checkbox"
              className="option-checkbox"
              checked={league}
              onChange={() => toggleAxis("league")}
            />
            <span className="option-label">Randomise League</span>
            <span className="option-hint">Premier League, La Liga, Serie A, Bundesliga, or Ligue 1</span>
          </label>
        </div>
      )}
    </div>
  );
}

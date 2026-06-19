import { useState } from "react";

const DIFFICULTY_INFO = [
  { key: "easy",   label: "EASY",   hint: "War chest — big budgets, one zero on the wheel (avg £109m)" },
  { key: "normal", label: "NORMAL", hint: "Tighter purse strings — every spin matters (avg £80m)" },
  { key: "hard",   label: "HARD",   hint: "Shoestring — bargain bins and frequent zeros (avg £48m)" },
  { key: "expert", label: "EXPERT", hint: "Ruthless economy — mostly scraps, many zeros (avg £38m)" },
  { key: "brutal", label: "BRUTAL", hint: "Scrap heap — half the wheel is zero, fight for free transfers (avg £23m)" },
];

const FORMAT_OPTIONS_2 = [
  { key: "bo3", label: "BEST OF 3", short: "BO3", hint: "First to 2 wins" },
  { key: "bo5", label: "BEST OF 5", short: "BO5", hint: "First to 3 wins" },
  { key: "bo7", label: "BEST OF 7", short: "BO7", hint: "First to 4 wins — NBA Finals style" },
];

const FORMAT_OPTIONS_4 = [
  { key: "tournament", label: "TOURNAMENT", short: "CUP", hint: "2-legged semi-finals (aggregate), then a 1-leg Grand Final" },
];

const FORMAT_OPTIONS_8 = [
  { key: "tournament8", label: "TOURNAMENT", short: "CUP", hint: "Single-leg quarter-finals, 2-legged semi-finals (aggregate), then a 1-leg Grand Final" },
];

export function ModeSelectScreen({ onSameDevice, onOnline }) {
  return (
    <div className="setup-screen">
      <div className="setup-card mode-select-card">
        <div className="setup-header">
          <h1 className="setup-title">The Football Director</h1>
          <p className="setup-sub">Build a squad. Spin the wheel. Become a legend.</p>
        </div>

        <div className="mode-options">
          <button className="mode-card" onClick={onSameDevice}>
            <div className="mode-card-label">ONE DEVICE</div>
            <div className="mode-card-desc">
              Solo or local — 1–8 players on one screen. Play alone against the CPU or pass it around between picks.
            </div>
            <div className="mode-card-cta">PLAY →</div>
          </button>

          <button className="mode-card mode-card-online" onClick={onOnline}>
            <div className="mode-card-label">ONLINE</div>
            <div className="mode-card-desc">
              Each player joins from their own phone or laptop — draft together from anywhere.
            </div>
            <div className="mode-card-cta">PLAY →</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LobbyScreen({ onContinue, onBack }) {
  const [numClubs, setNumClubs] = useState(2);
  const [numHumans, setNumHumans] = useState(1);
  const [difficulty, setDifficulty] = useState("normal");
  const [positionMode, setPositionMode] = useState("fixed");
  const [format, setFormat] = useState("bo7");
  const [hideRatings, setHideRatings] = useState(true);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [dynamicForm, setDynamicForm] = useState(true);
  const [managerTiming, setManagerTiming] = useState("before");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const formatOptions = numClubs === 2 ? FORMAT_OPTIONS_2 : numClubs === 8 ? FORMAT_OPTIONS_8 : FORMAT_OPTIONS_4;
  const validFormats = formatOptions.map(f => f.key);
  const activeFormat = validFormats.includes(format) ? format : formatOptions[0].key;

  function handleNumClubs(n) {
    setNumClubs(n);
    if (numHumans > n) setNumHumans(n);
  }

  function handleContinue() {
    onContinue({
      numClubs,
      numHumans,
      difficulty,
      positionMode,
      format: activeFormat,
      hideRatings,
      dynamicValues,
      dynamicForm,
      managerTiming,
    });
  }

  return (
    <div className="setup-screen">
      <div className="setup-card setup-card-wide">
        <div className="setup-header">
          <h1 className="setup-title">The Football Director</h1>
          <p className="setup-sub">Build a squad. Spin the wheel. Become a legend.</p>
        </div>

        <div className="game-options">
          <div className="options-title">GAME SETUP</div>

          <div className="setup-row">
            <span className="setup-row-label">CLUBS</span>
            <select
              className="setup-row-select"
              value={numClubs}
              onChange={e => handleNumClubs(Number(e.target.value))}
            >
              {[2, 4, 8].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="difficulty-hint setup-row-hint">
            {numClubs === 2 ? "Head-to-head — two clubs, one draft, one winner" : numClubs === 8 ? "Eight-way draft — maximum chaos, maximum competition" : "Four-way draft — more chaos, more competition"}
          </div>

          <div className="setup-row">
            <span className="setup-row-label">PLAYERS</span>
            <select
              className="setup-row-select"
              value={numHumans}
              onChange={e => setNumHumans(Number(e.target.value))}
            >
              {Array.from({ length: numClubs }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="difficulty-hint setup-row-hint">
            {numHumans === numClubs
              ? "All clubs are human-controlled"
              : `${numClubs - numHumans} CPU club${numClubs - numHumans > 1 ? "s" : ""} will be auto-generated`}
          </div>

          <div className="setup-row">
            <span className="setup-row-label">DIFFICULTY</span>
            <select
              className="setup-row-select setup-row-select-wide"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              {DIFFICULTY_INFO.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="difficulty-hint setup-row-hint">
            {DIFFICULTY_INFO.find(d => d.key === difficulty)?.hint}
          </div>

          <div className="setup-row">
            <span className="setup-row-label">DRAFT ORDER</span>
            <div className="setup-row-btns">
              <button
                className={`setup-row-btn ${positionMode === "fixed" ? "active" : ""}`}
                onClick={() => setPositionMode("fixed")}
              >
                FIXED
              </button>
              <button
                className={`setup-row-btn ${positionMode === "random" ? "active" : ""}`}
                onClick={() => setPositionMode("random")}
              >
                RANDOM
              </button>
            </div>
          </div>
          <div className="difficulty-hint setup-row-hint">
            {positionMode === "fixed"
              ? "Classic order — GK first, subs last. Predictable and competitive"
              : "Spin to reveal your position each round — chaos, carnage, and competition"}
          </div>

          {numClubs === 2 && (
            <>
              <div className="setup-row">
                <span className="setup-row-label">BEST OF</span>
                <div className="setup-row-btns">
                  {formatOptions.map(f => (
                    <button
                      key={f.key}
                      className={`setup-row-btn ${activeFormat === f.key ? "active" : ""}`}
                      onClick={() => setFormat(f.key)}
                    >
                      {f.key === "bo3" ? "3" : f.key === "bo5" ? "5" : "7"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="difficulty-hint setup-row-hint">
                {formatOptions.find(f => f.key === activeFormat)?.hint}
              </div>
            </>
          )}

          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(v => !v)}
          >
            {showAdvanced ? "▲" : "▼"} ADVANCED OPTIONS
          </button>

          {showAdvanced && (
            <div className="advanced-options">
              <label className="option-row">
                <input
                  type="checkbox"
                  className="option-checkbox"
                  checked={managerTiming === "before"}
                  onChange={e => setManagerTiming(e.target.checked ? "before" : "after")}
                />
                <span className="option-label">Manager draft before squad draft</span>
                <span className="option-hint">Spin the Merry-Go-Round first, then build your squad</span>
              </label>
              <label className="option-row">
                <input
                  type="checkbox"
                  className="option-checkbox"
                  checked={hideRatings}
                  onChange={e => setHideRatings(e.target.checked)}
                />
                <span className="option-label">Hide player ratings during draft</span>
                <span className="option-hint">Adds mystery — pick on reputation alone</span>
              </label>
              <label className="option-row">
                <input
                  type="checkbox"
                  className="option-checkbox"
                  checked={dynamicValues}
                  onChange={e => setDynamicValues(e.target.checked)}
                />
                <span className="option-label">Randomize player values each game</span>
                <span className="option-hint">Prices vary by tier — no two games are alike</span>
              </label>
              <label className="option-row">
                <input
                  type="checkbox"
                  className="option-checkbox"
                  checked={dynamicForm}
                  onChange={e => setDynamicForm(e.target.checked)}
                />
                <span className="option-label">Apply player form variance</span>
                <span className="option-hint">Hot form +2, poor form -2 — bargains and traps daily</span>
              </label>
            </div>
          )}
        </div>

        <div className="setup-rules">
          <div className="rules-title">HOW IT WORKS</div>
          <p className="rules-intro">
            You are a Director of Football tasked with building a new team from the ground up.
            Jump on the Managerial Merry-Go-Round, try your luck on the transfer wheel and
            build a squad of 16 players to become the ultimate football director.
          </p>
          <button className="rules-toggle" onClick={() => setShowRules(v => !v)}>
            {showRules ? "▲ hide rules" : "▼ see rules"}
          </button>
          {showRules && (
            <div className="rules-detail">
              <ul className="rules-bullets">
                <li>Spin the Managerial Merry-Go-Round to assign a manager to your squad</li>
                <li>Spin the budget wheel each turn — £0 to £200m, unspent carries over</li>
                <li>Draft one player per position until your squad of 16 is complete</li>
                <li>Draft order rotates each round — no one picks last forever</li>
                <li>A squad that suits your manager's style will perform better on match day</li>
                <li>Simulate the match and see who built the best team</li>
                <li>Each position is drafted in sequence: GK, DEF ×4, MID ×4, ATT ×3, then 4 subs</li>
                <li>Player values vary each game if randomised prices is on — no two drafts alike</li>
                <li>Form variance can add or subtract up to 2 rating points on match day</li>
                <li>Manager quality affects your team's overall match rating — choose wisely</li>
              </ul>
            </div>
          )}
        </div>

        <button className="start-btn active" onClick={handleContinue}>
          CONTINUE →
        </button>

        {onBack && (
          <button className="mode-back-link" onClick={onBack}>
            ← change mode
          </button>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import DraftRouletteToggle from "./DraftRouletteToggle";

const DIFFICULTY_INFO = [
  { key: "generous", label: "GENEROUS", hint: "Big budgets — legends within reach on most spins (avg £81m)" },
  { key: "easy",     label: "EASY",     hint: "Comfortable budgets — room to breathe on most spins (avg £61m)" },
  { key: "normal",   label: "NORMAL",   hint: "Balanced budgets with the occasional dry spell (avg £41m)" },
  { key: "hard",     label: "HARD",     hint: "Shoestring — bargain bins and frequent zeros (avg £31m)" },
  { key: "brutal",   label: "BRUTAL",   hint: "Scrap heap — half the wheel is zero, fight for free transfers (avg £17m)" },
];

const FORMAT_OPTIONS_2 = [
  { key: "bo3", label: "BEST OF 3", short: "BO3", hint: "First to 2 wins" },
  { key: "bo5", label: "BEST OF 5", short: "BO5", hint: "First to 3 wins" },
  { key: "bo7", label: "BEST OF 7", short: "BO7", hint: "First to 4 wins — NBA Finals style" },
];

export function ModeSelectScreen({ onClassicSolo, onClassicOnline, onWcSolo, onWcOnline, onAbout }) {
  const [selected, setSelected] = useState(null); // null | "classic" | "warchest"

  return (
    <div className="bw-home-screen">
      <div className="bw-home-card">
        <div className="bw-hero">
          <div className="bw-wordmark">THE TRANSFER<br />WHEEL</div>
          <div className="bw-tagline">Build a squad. Spin the wheel. Become a legend.</div>
        </div>

        <div className="bw-home-body">
          <div className={`bw-mode-card bw-mode-card-classic ${selected === "classic" ? "bw-mode-card-expanded" : ""}`}>
            <button className="bw-mode-card-main" onClick={() => setSelected(selected === "classic" ? null : "classic")}>
              <div className="bw-mode-card-text">
                <div className="bw-mode-card-label">CLASSIC</div>
                <div className="bw-mode-card-desc">
                  Spin the Transfer Wheel, build your squad, then play. Solo, local, or online.
                </div>
              </div>
              <div className="bw-mode-card-cta">{selected === "classic" ? "▲" : "PLAY →"}</div>
            </button>
            {selected === "classic" && (
              <div className="bw-mode-sub-options">
                <button className="bw-mode-sub-btn" onClick={onClassicSolo}>
                  <span className="bw-mode-sub-label">SOLO / LOCAL</span>
                  <span className="bw-mode-sub-desc">1–8 players on one screen</span>
                </button>
                <button className="bw-mode-sub-btn bw-mode-sub-btn-online" onClick={onClassicOnline}>
                  <span className="bw-mode-sub-label">ONLINE</span>
                  <span className="bw-mode-sub-desc">Each player joins from their own device</span>
                </button>
              </div>
            )}
          </div>

          <div className={`bw-mode-card bw-mode-card-wc ${selected === "warchest" ? "bw-mode-card-expanded" : ""}`}>
            <button className="bw-mode-card-main" onClick={() => setSelected(selected === "warchest" ? null : "warchest")}>
              <div className="bw-mode-card-text">
                <div className="bw-mode-card-label">WAR CHEST</div>
                <div className="bw-mode-card-desc">
                  5-a-side. Pick a mystery chest to reveal your budget, then race to build the best squad you can afford.
                </div>
              </div>
              <div className="bw-mode-card-cta">{selected === "warchest" ? "▲" : "PLAY →"}</div>
            </button>
            {selected === "warchest" && (
              <div className="bw-mode-sub-options">
                <button className="bw-mode-sub-btn" onClick={onWcSolo}>
                  <span className="bw-mode-sub-label">SOLO / LOCAL</span>
                  <span className="bw-mode-sub-desc">1–8 players on one screen</span>
                </button>
                <button className="bw-mode-sub-btn bw-mode-sub-btn-online" onClick={onWcOnline}>
                  <span className="bw-mode-sub-label">ONLINE</span>
                  <span className="bw-mode-sub-desc">Everyone picks simultaneously from their own device</span>
                </button>
              </div>
            )}
          </div>

          <button className="bw-about-link" onClick={onAbout}>About this game</button>
        </div>
      </div>
    </div>
  );
}

export default function LobbyScreen({ onContinue, onBack }) {
  const [numClubs, setNumClubs] = useState(8);
  const [numHumans, setNumHumans] = useState(1);
  const [difficulty, setDifficulty] = useState("normal");
  const [positionMode, setPositionMode] = useState("random");
  // 2-team match structure: a one-off game or a best-of-N series.
  const [matchType, setMatchType] = useState("series"); // "single" | "series"
  const [seriesLength, setSeriesLength] = useState("bo7"); // bo3 | bo5 | bo7
  const [hideRatings, setHideRatings] = useState(true);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [dynamicForm, setDynamicForm] = useState(true);
  const [realTeams, setRealTeams] = useState(false);
  const [managerTiming, setManagerTiming] = useState("before");
  const [draftRoulette, setDraftRoulette] = useState({ enabled: false, era: false, league: true });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const activeFormat = numClubs === 8 ? "tournament8"
    : numClubs === 4 ? "tournament"
    : matchType === "single" ? "single" : seriesLength;

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
      draftRoulette,
      realTeams,
    });
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-lobby-frame">
        <div className="bw-banner">
          <div className="bw-banner-title">GAME SETUP</div>
          <div className="bw-banner-subtitle">Build a squad. Spin the wheel. Become a legend.</div>
        </div>

        <div className="bw-body bw-lobby-body">
         <div className="bw-lobby-col bw-lobby-col-main">
          <div className="bw-setup-row">
            <span className="bw-setup-label">CLUBS</span>
            <div className="bw-setup-select-wrap">
              <select
                className="bw-setup-select"
                value={numClubs}
                onChange={e => handleNumClubs(Number(e.target.value))}
              >
                {[2, 4, 8].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">
            {numClubs === 2 ? "Head-to-head — two clubs, one draft, one winner" : numClubs === 8 ? "Eight-way knockout tournament — QF, two-legged semis, then a Grand Final" : "Four-way knockout tournament — two-legged semis, then a Grand Final"}
          </div>

          <div className="bw-setup-row">
            <span className="bw-setup-label">PLAYERS</span>
            <div className="bw-setup-select-wrap">
              <select
                className="bw-setup-select"
                value={numHumans}
                onChange={e => setNumHumans(Number(e.target.value))}
              >
                {Array.from({ length: numClubs }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">
            {numHumans === numClubs
              ? "All clubs are human-controlled"
              : `${numClubs - numHumans} CPU club${numClubs - numHumans > 1 ? "s" : ""} will be auto-generated`}
          </div>

          {numClubs === 2 && (
            <>
              <div className="bw-setup-row">
                <span className="bw-setup-label">MATCH TYPE</span>
                <div className="bw-tactics-toggle">
                  <button
                    className={`bw-tactics-seg ${matchType === "single" ? "active" : ""}`}
                    onClick={() => setMatchType("single")}
                  >
                    ONE-OFF
                  </button>
                  <button
                    className={`bw-tactics-seg ${matchType === "series" ? "active" : ""}`}
                    onClick={() => setMatchType("series")}
                  >
                    SERIES
                  </button>
                </div>
              </div>
              {matchType === "series" && (
                <div className="bw-setup-row">
                  <span className="bw-setup-label">LENGTH</span>
                  <div className="bw-tactics-toggle">
                    {["bo3", "bo5", "bo7"].map(k => (
                      <button
                        key={k}
                        className={`bw-tactics-seg ${seriesLength === k ? "active" : ""}`}
                        onClick={() => setSeriesLength(k)}
                      >
                        {k === "bo3" ? "3" : k === "bo5" ? "5" : "7"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bw-setup-hint">
                {matchType === "single"
                  ? "A single winner-takes-all match — level after 90 goes to penalties"
                  : FORMAT_OPTIONS_2.find(f => f.key === seriesLength)?.hint}
              </div>
            </>
          )}

          <div className="bw-setup-row">
            <span className="bw-setup-label">DIFFICULTY</span>
            <div className="bw-setup-select-wrap">
              <select
                className="bw-setup-select accent"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
              >
                {DIFFICULTY_INFO.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">
            {DIFFICULTY_INFO.find(d => d.key === difficulty)?.hint}
          </div>

          <DraftRouletteToggle value={draftRoulette} onChange={setDraftRoulette} />

         </div>

         <div className="bw-lobby-col bw-lobby-col-side">
          <button
            className="bw-collapse-toggle"
            onClick={() => setShowAdvanced(v => !v)}
          >
            {showAdvanced ? "▲" : "▼"} ADVANCED OPTIONS
          </button>

          {showAdvanced && (
            <div className="bw-pool-list bw-setup-block">
              <label className={`bw-pool-row ${positionMode === "fixed" ? "checked" : "unchecked"}`}>
                <input
                  type="checkbox"
                  checked={positionMode === "fixed"}
                  onChange={e => setPositionMode(e.target.checked ? "fixed" : "random")}
                />
                <span className="bw-pool-check-icon">{positionMode === "fixed" ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Fixed Draft Order</span>
                  <span className="bw-pool-label-sub">Draft positions in a set order (GK first, subs last) instead of spinning the position wheel each round.</span>
                </span>
              </label>
              <label className={`bw-pool-row ${hideRatings ? "checked" : "unchecked"}`}>
                <input
                  type="checkbox"
                  checked={hideRatings}
                  onChange={e => setHideRatings(e.target.checked)}
                />
                <span className="bw-pool-check-icon">{hideRatings ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Hide Ratings</span>
                  <span className="bw-pool-label-sub">Hides player ratings during the draft phase. Trust your gut!</span>
                </span>
              </label>
              <label className={`bw-pool-row ${dynamicValues ? "checked" : "unchecked"}`}>
                <input
                  type="checkbox"
                  checked={dynamicValues}
                  onChange={e => setDynamicValues(e.target.checked)}
                />
                <span className="bw-pool-check-icon">{dynamicValues ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Value for Money</span>
                  <span className="bw-pool-label-sub">Transfer value is randomised for each player. Can you find good value, or will you overpay?</span>
                </span>
              </label>
              <label className={`bw-pool-row ${dynamicForm ? "checked" : "unchecked"}`}>
                <input
                  type="checkbox"
                  checked={dynamicForm}
                  onChange={e => setDynamicForm(e.target.checked)}
                />
                <span className="bw-pool-check-icon">{dynamicForm ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">The Form Book</span>
                  <span className="bw-pool-label-sub">Player ratings can vary by +/-2 for each match.</span>
                </span>
              </label>
              {numHumans < numClubs && (
                <label className={`bw-pool-row ${realTeams ? "checked" : "unchecked"}`}>
                  <input
                    type="checkbox"
                    checked={realTeams}
                    onChange={e => setRealTeams(e.target.checked)}
                  />
                  <span className="bw-pool-check-icon">{realTeams ? "✓" : ""}</span>
                  <span className="bw-pool-label-wrap">
                    <span className="bw-pool-label">Super League</span>
                    <span className="bw-pool-label-sub">Each CPU is assigned an elite club and favours its former players</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <button
            className="bw-collapse-toggle"
            onClick={() => setShowRules(v => !v)}
          >
            {showRules ? "▲" : "▼"} HOW IT WORKS
          </button>

          {showRules && (
            <div className="bw-rules-box">
              <p className="bw-rules-intro">
                You are a Director of Football tasked with building a new team from the ground up.
                Jump on the Managerial Merry-Go-Round, try your luck on the transfer wheel and
                build a squad of 16 players to become the ultimate football director.
              </p>
              <ul className="bw-rules-list">
                <li>Spin the Managerial Merry-Go-Round to assign a manager to your squad</li>
                <li>Spin the budget wheel each turn — values vary with difficulty, unspent carries over</li>
                <li>Draft one player per position until your squad of 16 is complete</li>
                <li>Draft order rotates each round — no one picks last forever</li>
                <li>A squad that suits your manager's style will perform better on match day</li>
                <li>Simulate the match and see who built the best team</li>
                <li>Positions are drafted in a randomised order by default</li>
                <li>Player values vary each game if randomised prices is on — no two drafts alike</li>
                <li>Form variance can add or subtract up to 2 rating points on match day</li>
                <li>Manager quality affects your team's overall match rating — choose wisely</li>
              </ul>
            </div>
          )}

          <button className="bw-cta-primary" style={{ marginTop: 10 }} onClick={handleContinue}>
            CONTINUE →
          </button>

          {onBack && (
            <button className="bw-about-link" onClick={onBack}>
              ← change mode
            </button>
          )}
         </div>
        </div>
      </div>
    </div>
  );
}

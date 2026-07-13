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

const FORMAT_OPTIONS_4 = [
  { key: "tournament", label: "TOURNAMENT", short: "CUP", hint: "2-legged semi-finals (aggregate), then a 1-leg Grand Final" },
];

const FORMAT_OPTIONS_8 = [
  { key: "tournament8", label: "TOURNAMENT", short: "CUP", hint: "Single-leg quarter-finals, 2-legged semi-finals (aggregate), then a 1-leg Grand Final" },
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
  const [numClubs, setNumClubs] = useState(2);
  const [numHumans, setNumHumans] = useState(1);
  const [difficulty, setDifficulty] = useState("normal");
  const [positionMode, setPositionMode] = useState("random");
  const [format, setFormat] = useState("bo7");
  const [hideRatings, setHideRatings] = useState(true);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [dynamicForm, setDynamicForm] = useState(true);
  const [managerTiming, setManagerTiming] = useState("before");
  const [draftRoulette, setDraftRoulette] = useState({ enabled: false, era: false, league: true });
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
      draftRoulette,
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
            {numClubs === 2 ? "Head-to-head — two clubs, one draft, one winner" : numClubs === 8 ? "Eight-way draft — maximum chaos, maximum competition" : "Four-way draft — more chaos, more competition"}
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

          <div className="bw-setup-row">
            <span className="bw-setup-label">DRAFT ORDER</span>
            <div className="bw-tactics-toggle">
              <button
                className={`bw-tactics-seg ${positionMode === "fixed" ? "active" : ""}`}
                onClick={() => setPositionMode("fixed")}
              >
                FIXED
              </button>
              <button
                className={`bw-tactics-seg ${positionMode === "random" ? "active" : ""}`}
                onClick={() => setPositionMode("random")}
              >
                RANDOM
              </button>
            </div>
          </div>
          <div className="bw-setup-hint">
            {positionMode === "fixed"
              ? "Classic order — GK first, subs last. Predictable and competitive"
              : "Spin to reveal your position each round — chaos, carnage, and competition"}
          </div>

          <DraftRouletteToggle value={draftRoulette} onChange={setDraftRoulette} />

          {numClubs === 2 && (
            <>
              <div className="bw-setup-row">
                <span className="bw-setup-label">BEST OF</span>
                <div className="bw-tactics-toggle">
                  {formatOptions.map(f => (
                    <button
                      key={f.key}
                      className={`bw-tactics-seg ${activeFormat === f.key ? "active" : ""}`}
                      onClick={() => setFormat(f.key)}
                    >
                      {f.key === "bo3" ? "3" : f.key === "bo5" ? "5" : "7"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bw-setup-hint">
                {formatOptions.find(f => f.key === activeFormat)?.hint}
              </div>
            </>
          )}

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
              <label className={`bw-pool-row ${managerTiming === "before" ? "checked" : "unchecked"}`}>
                <input
                  type="checkbox"
                  checked={managerTiming === "before"}
                  onChange={e => setManagerTiming(e.target.checked ? "before" : "after")}
                />
                <span className="bw-pool-check-icon">{managerTiming === "before" ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Manager draft before squad draft</span>
                  <span className="bw-pool-label-sub">Spin the Merry-Go-Round first, then build your squad</span>
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
                  <span className="bw-pool-label">Hide player ratings during draft</span>
                  <span className="bw-pool-label-sub">Adds mystery — pick on reputation alone</span>
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
                  <span className="bw-pool-label">Randomize player values each game</span>
                  <span className="bw-pool-label-sub">Prices vary by tier — no two games are alike</span>
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
                  <span className="bw-pool-label">Apply player form variance</span>
                  <span className="bw-pool-label-sub">Hot form +2, poor form -2 — bargains and traps daily</span>
                </span>
              </label>
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

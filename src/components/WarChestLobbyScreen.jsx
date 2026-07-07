import { useState } from "react";
import DraftRouletteToggle from "./DraftRouletteToggle";

const FORMAT_OPTIONS = [
  { key: "bo3", label: "3", hint: "First to 2 wins" },
  { key: "bo5", label: "5", hint: "First to 3 wins" },
  { key: "bo7", label: "7", hint: "First to 4 wins" },
];

const DIFFICULTY_INFO = [
  { key: "generous", label: "GENEROUS", hint: "5 chests: £1000m / £750m / £550m / £400m / £275m — 4 GOATs possible" },
  { key: "easy",     label: "EASY",     hint: "5 chests: £520m / £390m / £275m / £190m / £125m" },
  { key: "normal",   label: "NORMAL",   hint: "5 chests: £270m / £205m / £150m / £105m / £70m" },
  { key: "hard",     label: "HARD",     hint: "5 chests: £160m / £120m / £85m / £58m / £35m — bargain bins beckon" },
  { key: "brutal",   label: "BRUTAL",   hint: "5 chests: £55m / £35m / £20m / £8m / £0m — zero is possible" },
];

export default function WarChestLobbyScreen({ onContinue, onBack }) {
  const [numClubs, setNumClubs] = useState(2);
  const [numHumans, setNumHumans] = useState(1);
  const [difficulty, setDifficulty] = useState("normal");
  const [format, setFormat] = useState("bo3");
  const [hideRatings, setHideRatings] = useState(false);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [draftRoulette, setDraftRoulette] = useState({ enabled: false, era: false, league: true });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRules, setShowRules] = useState(false);

  function handleNumClubs(n) {
    setNumClubs(n);
    if (numHumans > n) setNumHumans(n);
  }

  function handleContinue() {
    onContinue({ numClubs, numHumans, difficulty, format: numClubs === 2 ? format : undefined, hideRatings, dynamicValues, dynamicForm: true, draftRoulette });
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-wc-lobby">
        <div className="bw-banner">
          <div className="bw-banner-title bw-wc-title">WAR CHEST</div>
          <div className="bw-banner-subtitle">Pick a mystery chest. Build a 5-player squad. Winner takes all.</div>
        </div>

        <div className="bw-body">
          <div className="bw-setup-row">
            <span className="bw-setup-label">CLUBS</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select" value={numClubs} onChange={e => handleNumClubs(Number(e.target.value))}>
                {[2, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">
            {numClubs === 2 ? "Head-to-head — build your squads then play a series" : `${numClubs}-way — everyone builds a squad, then play off`}
          </div>

          {numClubs === 2 && (
            <>
              <div className="bw-setup-row">
                <span className="bw-setup-label">BEST OF</span>
                <div className="bw-tactics-toggle">
                  {FORMAT_OPTIONS.map(f => (
                    <button
                      key={f.key}
                      className={`bw-tactics-seg ${format === f.key ? "active" : ""}`}
                      onClick={() => setFormat(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bw-setup-hint">
                {FORMAT_OPTIONS.find(f => f.key === format)?.hint}
              </div>
            </>
          )}

          <div className="bw-setup-row">
            <span className="bw-setup-label">PLAYERS</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select" value={numHumans} onChange={e => setNumHumans(Number(e.target.value))}>
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

          <DraftRouletteToggle value={draftRoulette} onChange={setDraftRoulette} />

          <button className="bw-collapse-toggle" onClick={() => setShowAdvanced(v => !v)}>
            {showAdvanced ? "▲" : "▼"} ADVANCED OPTIONS
          </button>

          {showAdvanced && (
            <div className="bw-pool-list bw-setup-block">
              <label className={`bw-pool-row ${hideRatings ? "checked" : "unchecked"}`}>
                <input type="checkbox" checked={hideRatings} onChange={e => setHideRatings(e.target.checked)} />
                <span className="bw-pool-check-icon">{hideRatings ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Hide player ratings during draft</span>
                  <span className="bw-pool-label-sub">Adds mystery — pick on reputation alone</span>
                </span>
              </label>
              <label className={`bw-pool-row ${dynamicValues ? "checked" : "unchecked"}`}>
                <input type="checkbox" checked={dynamicValues} onChange={e => setDynamicValues(e.target.checked)} />
                <span className="bw-pool-check-icon">{dynamicValues ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Randomize player values each game</span>
                  <span className="bw-pool-label-sub">Prices vary by tier — no two games are alike</span>
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
              <ul className="bw-rules-list">
                <li>Each player picks one mystery War Chest from a row of 5 — you don't know the value until you open it</li>
                <li>Your chest is your entire transfer budget for the squad — spend wisely</li>
                <li>Build a 5-player squad: Goalkeeper · Defender · Midfielder · + 2 free slots</li>
                <li>You must fill GK, DEF and MID — the rest are up to you</li>
                <li>Matches are 60 minutes — no manager, just pure squad quality</li>
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
  );
}

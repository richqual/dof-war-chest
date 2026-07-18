import { useState } from "react";

const FORMAT_OPTIONS = [
  { key: "bo3", label: "3", hint: "First to 2 wins" },
  { key: "bo5", label: "5", hint: "First to 3 wins" },
  { key: "bo7", label: "7", hint: "First to 4 wins" },
];

// Classic-wheel difficulties (budget per spin). If Squad tier caps are enabled
// in Advanced Options, they also tighten with difficulty.
const DIFFICULTY_INFO = [
  { key: "generous", label: "GENEROUS", hint: "~£81m avg spin — legends within reach most turns" },
  { key: "easy",     label: "EASY",     hint: "~£61m avg spin — room to breathe" },
  { key: "normal",   label: "NORMAL",   hint: "~£41m avg spin — balanced" },
  { key: "hard",     label: "HARD",     hint: "~£31m avg spin — shoestring, scarcity bites" },
  { key: "brutal",   label: "BRUTAL",   hint: "~£17m avg spin — scrap for every card" },
];

// 11-a-side formations only (excludes the 5-a-side War Chest shape).
const FORMATIONS_11 = ["4-3-3", "4-4-2", "4-5-1", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1"];

// How deep the live pool runs — mainly how many elite (T1/T2) cards exist per
// position. Every size still curates hard vs Classic's open browse.
const POOL_SIZE_INFO = [
  { key: "small",  label: "SMALL",  hint: "Cut-throat — one genuine elite option per position, everyone fights for it" },
  { key: "medium", label: "MEDIUM", hint: "Balanced — a handful of elites per position to scrap over" },
  { key: "large",  label: "LARGE",  hint: "Roomier — nearly one top-tier option per player, more room to build" },
];

export default function ScoutLobbyScreen({ onContinue, onBack }) {
  const [numClubs, setNumClubs] = useState(2);
  const [numHumans, setNumHumans] = useState(1);
  const [difficulty, setDifficulty] = useState("normal");
  const [poolSize, setPoolSize] = useState("medium");
  const [formation, setFormation] = useState("4-3-3");
  const [matchType, setMatchType] = useState("series");
  const [seriesLength, setSeriesLength] = useState("bo3");
  const [hideRatings, setHideRatings] = useState(false);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [tierCaps, setTierCaps] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRules, setShowRules] = useState(false);

  function handleNumClubs(n) {
    setNumClubs(n);
    if (numHumans > n) setNumHumans(n);
  }

  // Mirrors Classic: 8 clubs → eight-team knockout, 4 → four-team knockout,
  // 2 → one-off or best-of-N series. Other counts are a free multi-club draft.
  const activeFormat = numClubs === 8 ? "tournament8"
    : numClubs === 4 ? "tournament"
    : numClubs === 2 ? (matchType === "single" ? "single" : seriesLength)
    : undefined;

  function handleContinue() {
    onContinue({
      numClubs, numHumans, difficulty, format: activeFormat,
      hideRatings, dynamicValues, dynamicForm: true,
      scout: true, scoutFormation: formation, tierCaps, poolSize,
    });
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-scout-lobby">
        <div className="bw-banner">
          <div className="bw-banner-title bw-scout-title">SCOUT MODE</div>
          <div className="bw-banner-subtitle">One shared, shrinking pool. A dealt hand each turn. Draft order finally matters.</div>
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
            {numClubs === 2 ? "Head-to-head — build your squads then play" : numClubs === 8 ? "Eight-way knockout — QF, semis, then a Grand Final" : numClubs === 4 ? "Four-way knockout — two-legged semis, then a Grand Final" : "Multi-club draft — more managers means a fiercer scramble for the pool"}
          </div>

          <div className="bw-setup-row">
            <span className="bw-setup-label">PLAYERS</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select" value={numHumans} onChange={e => setNumHumans(Number(e.target.value))}>
                {Array.from({ length: numClubs }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">
            {numHumans === numClubs ? "All clubs are human-controlled (hot-seat)" : `${numClubs - numHumans} CPU club${numClubs - numHumans > 1 ? "s" : ""} will be auto-generated`}
          </div>

          <div className="bw-setup-row">
            <span className="bw-setup-label">FORMATION</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select accent" value={formation} onChange={e => setFormation(e.target.value)}>
                {FORMATIONS_11.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">
            Shared by every manager — this is what sizes the live pool. You can rearrange your own shape after the draft.
          </div>

          <div className="bw-setup-row">
            <span className="bw-setup-label">POOL SIZE</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select accent" value={poolSize} onChange={e => setPoolSize(e.target.value)}>
                {POOL_SIZE_INFO.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">{POOL_SIZE_INFO.find(p => p.key === poolSize)?.hint}</div>

          {numClubs === 2 && (
            <>
              <div className="bw-setup-row">
                <span className="bw-setup-label">MATCH TYPE</span>
                <div className="bw-tactics-toggle">
                  <button className={`bw-tactics-seg ${matchType === "single" ? "active" : ""}`} onClick={() => setMatchType("single")}>ONE-OFF</button>
                  <button className={`bw-tactics-seg ${matchType === "series" ? "active" : ""}`} onClick={() => setMatchType("series")}>SERIES</button>
                </div>
              </div>
              {matchType === "series" && (
                <div className="bw-setup-row">
                  <span className="bw-setup-label">LENGTH</span>
                  <div className="bw-tactics-toggle">
                    {FORMAT_OPTIONS.map(f => (
                      <button key={f.key} className={`bw-tactics-seg ${seriesLength === f.key ? "active" : ""}`} onClick={() => setSeriesLength(f.key)}>{f.label}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bw-setup-hint">
                {matchType === "single" ? "A single winner-takes-all match — level after 90 goes to penalties" : FORMAT_OPTIONS.find(f => f.key === seriesLength)?.hint}
              </div>
            </>
          )}

          <div className="bw-setup-row">
            <span className="bw-setup-label">DIFFICULTY</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select accent" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                {DIFFICULTY_INFO.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">{DIFFICULTY_INFO.find(d => d.key === difficulty)?.hint}</div>

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
              <label className={`bw-pool-row ${tierCaps ? "checked" : "unchecked"}`}>
                <input type="checkbox" checked={tierCaps} onChange={e => setTierCaps(e.target.checked)} />
                <span className="bw-pool-check-icon">{tierCaps ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Squad tier caps</span>
                  <span className="bw-pool-label-sub">Limit how many of each tier one squad can hold — extra scarcity on top of the pool (off by default)</span>
                </span>
              </label>
            </div>
          )}

          <button className="bw-collapse-toggle" onClick={() => setShowRules(v => !v)}>
            {showRules ? "▲" : "▼"} HOW IT WORKS
          </button>
          {showRules && (
            <div className="bw-rules-box">
              <ul className="bw-rules-list">
                <li>All managers share ONE shrinking live pool per position — drawn just big enough to run dry</li>
                <li>Each turn: spin your budget, then pick from a dealt <strong>scout report</strong> — one affordable player per tier still available</li>
                <li>Draft order matters — the last manager on a position scrapes what's left</li>
                <li>Squad-wide tier caps stop anyone hoarding the elite cards</li>
                <li>Pick club tenets to bias your reports, and use your one scouting mission to search off-pool for a bench spot</li>
              </ul>
            </div>
          )}

          <button className="bw-cta-primary" style={{ marginTop: 10 }} onClick={handleContinue}>CONTINUE →</button>
          {onBack && <button className="bw-about-link" onClick={onBack}>← change mode</button>}
        </div>
      </div>
    </div>
  );
}

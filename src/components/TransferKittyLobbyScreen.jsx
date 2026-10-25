import { useState } from "react";
import DraftRouletteToggle from "./DraftRouletteToggle";
import { loadSetupPrefs, saveSetupPrefs, seededFrom } from "../utils/setupPrefs";

// Setup fields that "remember my preferences" persists for Transfer Kitty.
// Club/player counts and series length are left out — those are per-game choices.
const TK_DEFAULTS = {
  difficulty: "normal",
  drawFormation: "4-4-2",
  hideRatings: true,
  dynamicValues: true,
  draftRoulette: { enabled: false, era: false, league: true },
};

// Transfer Kitty draft formations. Deliberately a SMALL fixed set (spec §Set
// formation): the draft formation only fixes slot counts per block so everyone
// builds the same shape — tactical variety is a post-draw concern. 4-3-3
// reshapes into 4-5-1 / 4-2-3-1 after the draw; back-three is a "maybe later".
const DRAFT_FORMATIONS = [
  { key: "4-4-2", label: "4-4-2", hint: "Back four · RM/CM/CM/LM · two up top" },
  { key: "4-3-3", label: "4-3-3", hint: "Back four · DM/CM/CM · RW/LW/ST (reshapes to 4-5-1 / 4-2-3-1 after the draw)" },
];

const FORMAT_OPTIONS = [
  { key: "bo3", label: "3", hint: "First to 2 wins" },
  { key: "bo5", label: "5", hint: "First to 3 wins" },
  { key: "bo7", label: "7", hint: "First to 4 wins" },
];

const DIFFICULTY_INFO = [
  { key: "generous", label: "GENEROUS", hint: "Deep kitties — Galacticos in every block" },
  { key: "easy",     label: "EASY",     hint: "Comfortable per-block purses" },
  { key: "normal",   label: "NORMAL",   hint: "Balanced kitties — spend with care" },
  { key: "hard",     label: "HARD",     hint: "Lean purses — bargains beckon" },
  { key: "brutal",   label: "BRUTAL",   hint: "Shoestring kitties — every million counts" },
];

export default function TransferKittyLobbyScreen({ onContinue, onBack }) {
  // Seed the setup options from the player's remembered preferences (if opted in).
  const [saved] = useState(() => loadSetupPrefs("transferKitty"));
  const [init] = useState(() => seededFrom(TK_DEFAULTS, saved.values));

  const [numClubs, setNumClubs] = useState(4);
  const [numHumans, setNumHumans] = useState(1);
  const [difficulty, setDifficulty] = useState(init.difficulty);
  const [drawFormation, setDrawFormation] = useState(init.drawFormation);
  // 2-team structure: one-off or a best-of-N series (only shown for 2 clubs).
  const [matchType, setMatchType] = useState("series");
  const [seriesLength, setSeriesLength] = useState("bo3");
  // Hidden by default — Transfer Kitty leans into the Classic "pick on reputation"
  // feel, so ratings are off unless the player opts back in via Advanced Options.
  const [hideRatings, setHideRatings] = useState(init.hideRatings);
  const [dynamicValues, setDynamicValues] = useState(init.dynamicValues);
  const [draftRoulette, setDraftRoulette] = useState(init.draftRoulette);
  const [rememberPrefs, setRememberPrefs] = useState(saved.remember);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRules, setShowRules] = useState(false);

  function handleNumClubs(n) {
    setNumClubs(n);
    if (numHumans > n) setNumHumans(n);
  }

  // 8→bracket-of-8, 4→bracket-of-4, 2→one-off or best-of-N (same tokens the other
  // modes use, so buildSeries produces a real tournament/series instead of nothing).
  const activeFormat = numClubs === 8 ? "tournament8"
    : numClubs === 4 ? "tournament"
    : matchType === "single" ? "single" : seriesLength;

  function handleContinue() {
    saveSetupPrefs("transferKitty", rememberPrefs, {
      difficulty, drawFormation, hideRatings, dynamicValues, draftRoulette,
    });
    onContinue({
      numClubs, numHumans, difficulty, drawFormation, format: activeFormat,
      hideRatings, dynamicValues, dynamicForm: true, draftRoulette,
      transferKitty: true,
    });
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-tk-lobby">
        <div className="bw-banner">
          <div className="bw-banner-title bw-tk-title">TRANSFER KITTY</div>
          <div className="bw-banner-subtitle">A measured kitty per position. Build in blocks. Spend it wisely.</div>
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
            {numClubs === 2 ? "Head-to-head" : numClubs === 8 ? "Eight-way knockout" : "Four-way knockout"}
          </div>

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
              ? "All clubs are human-controlled — pass the device each block"
              : `${numClubs - numHumans} CPU club${numClubs - numHumans > 1 ? "s" : ""} resolve instantly`}
          </div>

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
                {matchType === "single" ? "A single winner-takes-all match" : FORMAT_OPTIONS.find(f => f.key === seriesLength)?.hint}
              </div>
            </>
          )}

          <div className="bw-setup-row">
            <span className="bw-setup-label">FORMATION</span>
            <div className="bw-tactics-toggle">
              {DRAFT_FORMATIONS.map(f => (
                <button
                  key={f.key}
                  className={`bw-tactics-seg ${drawFormation === f.key ? "active" : ""}`}
                  onClick={() => setDrawFormation(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bw-setup-hint">
            {DRAFT_FORMATIONS.find(f => f.key === drawFormation)?.hint} · edit freely after the draw
          </div>

          <div className="bw-setup-row">
            <span className="bw-setup-label">DIFFICULTY</span>
            <div className="bw-setup-select-wrap">
              <select className="bw-setup-select accent" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                {DIFFICULTY_INFO.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="bw-setup-hint">{DIFFICULTY_INFO.find(d => d.key === difficulty)?.hint}</div>

          <DraftRouletteToggle value={draftRoulette} onChange={setDraftRoulette} />

          <button className="bw-collapse-toggle" onClick={() => setShowAdvanced(v => !v)}>
            {showAdvanced ? "▲" : "▼"} ADVANCED OPTIONS
          </button>
          {showAdvanced && (
            <div className="bw-pool-list bw-setup-block">
              <label className={`bw-pool-row bw-pool-util ${rememberPrefs ? "checked" : "unchecked"}`}>
                <input type="checkbox" checked={rememberPrefs} onChange={e => setRememberPrefs(e.target.checked)} />
                <span className="bw-pool-check-icon">{rememberPrefs ? "✓" : ""}</span>
                <span className="bw-pool-label-wrap">
                  <span className="bw-pool-label">Remember My Preferences</span>
                  <span className="bw-pool-label-sub">Save these advanced options on this device and load them the next time you set up a game</span>
                </span>
              </label>
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

          <button className="bw-collapse-toggle" onClick={() => setShowRules(v => !v)}>
            {showRules ? "▲" : "▼"} HOW IT WORKS
          </button>
          {showRules && (
            <div className="bw-rules-box">
              <ul className="bw-rules-list">
                <li>Everyone drafts against the same formation, so blocks are like-for-like</li>
                <li>Open with a keeper on a spun budget</li>
                <li>Build your Defence, Midfield and Attack — each block has its own kitty, attackers weighted biggest</li>
                <li>Unspent money rolls forward, then funds your bench at the finish</li>
                <li>Reshape your drafted squad into any formation once the draw is done</li>
              </ul>
            </div>
          )}

          <button className="bw-cta-primary" style={{ marginTop: 10 }} onClick={handleContinue}>
            CONTINUE →
          </button>
          {onBack && (
            <button className="bw-about-link" onClick={onBack}>← change mode</button>
          )}
        </div>
      </div>
    </div>
  );
}

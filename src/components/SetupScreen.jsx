import { useState } from "react";
import { RANDOM_CLUB_NAMES, RANDOM_MANAGER_NAMES, EASTER_EGG_TEAMS } from "../data/players";
import { FORMATION_LIST } from "../data/formations";
import KitSwatch from "./KitSwatch";

const DEFAULT_COLORS = [
  { primary: "#c8102e", secondary: "#ffffff" }, // Red/White
  { primary: "#003087", secondary: "#ffffff" }, // Blue/White
  { primary: "#034694", secondary: "#d4af37" }, // Blue/Gold
  { primary: "#1B5E20", secondary: "#ffffff" }, // Green/White
];

const CPU_KITS = [
  { primary: "#c8102e", secondary: "#ffffff" },
  { primary: "#003087", secondary: "#ffffff" },
  { primary: "#1B5E20", secondary: "#ffd700" },
  { primary: "#6a0dad", secondary: "#ffffff" },
  { primary: "#f97316", secondary: "#000000" },
  { primary: "#0e7490", secondary: "#ffffff" },
  { primary: "#7c2d12", secondary: "#f5e6d0" },
  { primary: "#111827", secondary: "#fbbf24" },
  { primary: "#be185d", secondary: "#ffffff" },
  { primary: "#365314", secondary: "#ffffff" },
];

function randomClubName() {
  return RANDOM_CLUB_NAMES[Math.floor(Math.random() * RANDOM_CLUB_NAMES.length)];
}

function randomManagerName() {
  return RANDOM_MANAGER_NAMES[Math.floor(Math.random() * RANDOM_MANAGER_NAMES.length)];
}

// 25% chance of an Easter egg identity; otherwise standard random kit + name.
function randomCpuIdentity(existingClubName = "") {
  if (Math.random() < 0.25) {
    const egg = EASTER_EGG_TEAMS[Math.floor(Math.random() * EASTER_EGG_TEAMS.length)];
    return { clubName: egg.clubName, dofName: egg.dofName, primaryColor: egg.primary, secondaryColor: egg.secondary, pattern: egg.pattern };
  }
  const kit = CPU_KITS[Math.floor(Math.random() * CPU_KITS.length)];
  let name;
  do { name = randomClubName(); } while (name === existingClubName);
  const r = Math.random();
  const pattern = r < 0.35 ? "stripes" : r < 0.45 ? "hoops" : "plain";
  return { clubName: name, dofName: randomManagerName(), primaryColor: kit.primary, secondaryColor: kit.secondary, pattern };
}

function ClubSetup({ index, club, onChange, onRemove, canRemove }) {
  const defaults = DEFAULT_COLORS[index % DEFAULT_COLORS.length];

  function randomise() {
    let name;
    do { name = randomClubName(); } while (name === club.clubName);
    onChange({ ...club, clubName: name });
  }

  function randomiseDof() {
    let name;
    do { name = randomManagerName(); } while (name === club.dofName);
    onChange({ ...club, dofName: name });
  }

  // Switching to CPU generates an identity — empty fields get filled, kit is
  // re-rolled. Everything stays editable so it can all be overridden.
  function setComputer(isComputer) {
    if (!isComputer) {
      onChange({ ...club, isComputer: false });
      return;
    }
    const identity = randomCpuIdentity(club.clubName.trim());
    onChange({
      ...club,
      isComputer: true,
      dofName: club.dofName.trim() ? club.dofName : identity.dofName,
      clubName: club.clubName.trim() ? club.clubName : identity.clubName,
      primaryColor: identity.primaryColor,
      secondaryColor: identity.secondaryColor,
      pattern: identity.pattern,
    });
  }

  return (
    <div className="club-setup-card">
      <div className="club-setup-header">
        <span className="club-setup-num">CLUB {index + 1}</span>
        <div className="club-setup-header-right">
          <div className="ctrl-toggle">
            <button
              className={`ctrl-toggle-btn ${!club.isComputer ? "active" : ""}`}
              onClick={() => setComputer(false)}
            >HUMAN</button>
            <button
              className={`ctrl-toggle-btn ${club.isComputer ? "active" : ""}`}
              onClick={() => setComputer(true)}
            >CPU</button>
          </div>
          {canRemove && (
            <button className="remove-btn" onClick={onRemove} title="Remove club">✕</button>
          )}
        </div>
      </div>

      <div className="club-setup-field">
        <label className="field-label-sm">{club.isComputer ? "CPU MANAGER" : "DIRECTOR OF FOOTBALL"}</label>
        <div className="club-name-row">
          <input
            className="name-input"
            value={club.dofName}
            onChange={e => onChange({ ...club, dofName: e.target.value })}
            placeholder={`DoF Name ${index + 1}`}
            maxLength={20}
          />
          {club.isComputer && (
            <button className="randomise-btn" onClick={randomiseDof} title="Random name">🎲</button>
          )}
        </div>
      </div>

      <div className="club-setup-field">
        <label className="field-label-sm">CLUB NAME</label>
        <div className="club-name-row">
          <input
            className="name-input"
            value={club.clubName}
            onChange={e => onChange({ ...club, clubName: e.target.value })}
            placeholder="Club name…"
            maxLength={28}
          />
          <button className="randomise-btn" onClick={randomise} title="Random name">🎲</button>
        </div>
      </div>

      <div className="club-setup-field">
        <label className="field-label-sm">FORMATION</label>
        <select
          className="formation-select"
          value={club.formation || "4-3-3"}
          onChange={e => onChange({ ...club, formation: e.target.value })}
        >
          {FORMATION_LIST.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="club-setup-field">
        <label className="field-label-sm">KIT COLOURS &amp; PATTERN</label>
        <div className="kit-row">
          <KitSwatch
            primary={club.primaryColor || defaults.primary}
            secondary={club.secondaryColor || defaults.secondary}
            pattern={club.pattern || "plain"}
            uid={`c${index}`}
          />
          <div className="colour-pair">
            <input type="color" className="colour-input"
              value={club.primaryColor || defaults.primary}
              onChange={e => onChange({ ...club, primaryColor: e.target.value })} />
            <input type="color" className="colour-input"
              value={club.secondaryColor || defaults.secondary}
              onChange={e => onChange({ ...club, secondaryColor: e.target.value })} />
          </div>
          <div className="pattern-btns">
            {(() => {
              const PATTERNS = [
                { key: "plain", label: "Plain" },
                { key: "stripes", label: "Stripes" },
                { key: "hoops", label: "Hoops" },
              ];
              const cur = club.pattern || "plain";
              const idx = PATTERNS.findIndex(p => p.key === cur);
              const next = PATTERNS[(idx + 1) % PATTERNS.length];
              return (
                <button
                  className="pattern-btn active"
                  onClick={() => onChange({ ...club, pattern: next.key })}
                  title={`Switch to ${next.label}`}
                >🔄</button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function makeClub(index) {
  const d = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  return { dofName: "", clubName: "", primaryColor: d.primary, secondaryColor: d.secondary, pattern: "plain", isComputer: false, formation: "4-3-3" };
}

const DIFFICULTY_INFO = [
  { key: "easy",   label: "EASY",   hint: "War chest — big budgets flow like the old days" },
  { key: "normal", label: "NORMAL", hint: "Tighter purse strings — every spin matters" },
  { key: "hard",   label: "HARD",   hint: "Shoestring — bargain bins and free transfers" },
];

const FORMAT_OPTIONS_2 = [
  { key: "bo3", label: "BEST OF 3", hint: "First to 2 wins" },
  { key: "bo5", label: "BEST OF 5", hint: "First to 3 wins" },
  { key: "bo7", label: "BEST OF 7", hint: "First to 4 wins — NBA Finals style" },
];
const FORMAT_OPTIONS_4 = [
  { key: "tournament", label: "TOURNAMENT", hint: "2-legged semi-finals (aggregate), then a 1-leg Grand Final" },
];

export default function SetupScreen({ onStart }) {
  const [clubs, setClubs] = useState([makeClub(0), makeClub(1)]);
  const [hideRatings, setHideRatings] = useState(true);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [dynamicForm, setDynamicForm] = useState(true);
  const [difficulty, setDifficulty] = useState("normal");
  const [format, setFormat] = useState("bo7");
  const [managerTiming, setManagerTiming] = useState("before");
  const [positionMode, setPositionMode] = useState("fixed");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const formatOptions = clubs.length === 2 ? FORMAT_OPTIONS_2 : FORMAT_OPTIONS_4;
  const validFormats = formatOptions.map(f => f.key);
  const activeFormat = validFormats.includes(format) ? format : (clubs.length === 2 ? "bo7" : "tournament");

  function updateClub(i, updated) {
    setClubs(prev => prev.map((c, j) => j === i ? updated : c));
  }
  function addClub() {
    if (clubs.length < 4) setClubs(prev => [...prev, makeClub(prev.length)]);
  }
  function removeClub(i) {
    if (clubs.length > 2) setClubs(prev => prev.filter((_, j) => j !== i));
  }

  const valid = clubs.every(c => c.dofName.trim() && c.clubName.trim());
  const canStart = valid;

  function handleStart() {
    if (!canStart) return;
    let finalClubs = clubs.map(c => ({ ...c, dofName: c.dofName.trim(), clubName: c.clubName.trim() }));
    if (finalClubs.length === 3) {
      const identity = randomCpuIdentity();
      const cpu = {
        isComputer: true,
        dofName: identity.dofName,
        clubName: identity.clubName,
        primaryColor: identity.primaryColor,
        secondaryColor: identity.secondaryColor,
        pattern: identity.pattern,
      };
      finalClubs = [...finalClubs, cpu];
    }
    onStart(finalClubs, { hideRatings, dynamicValues, dynamicForm, difficulty, format: activeFormat, managerTiming, positionMode });
  }

  return (
    <div className="setup-screen">
      <div className="setup-card setup-card-wide">
        <div className="setup-header">
          <h1 className="setup-title">The Football Director</h1>
          <p className="setup-sub">Build a squad. Spin the wheel. Become a legend.</p>
        </div>

        <div className="setup-rules setup-rules-getstarted">
          <div className="rules-title">GET STARTED</div>
          <p className="rules-intro">Enter your name and create your club to begin. Supports 1–4 human players, with 2 or 4 teams per game — CPU sides fill any empty slots.</p>
        </div>

        <div className="clubs-grid">
          {clubs.map((club, i) => (
            <ClubSetup
              key={i}
              index={i}
              club={club}
              onChange={updated => updateClub(i, updated)}
              onRemove={() => removeClub(i)}
              canRemove={clubs.length > 2}
            />
          ))}
        </div>

        {clubs.length < 4 && (
          <button className="add-player-btn" onClick={addClub}>
            + ADD ANOTHER CLUB
          </button>
        )}
        {clubs.length === 3 && (
          <div className="cpu-autofill-notice">
            ⚠ A CPU team will auto-fill the 4th slot — or add a 4th player above
          </div>
        )}

        <div className="game-options">
          <div className="options-title">GAME OPTIONS</div>

          <div className="difficulty-section">
            <span className="field-label-sm">TRANSFER MARKET DIFFICULTY</span>
            <div className="difficulty-row">
              {DIFFICULTY_INFO.map(d => (
                <button
                  key={d.key}
                  className={`difficulty-btn ${difficulty === d.key ? "active" : ""}`}
                  onClick={() => setDifficulty(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="difficulty-hint">
              {DIFFICULTY_INFO.find(d => d.key === difficulty)?.hint}
            </div>
          </div>

          <div className="difficulty-section">
            <span className="field-label-sm">DRAFT ORDER MODE</span>
            <div className="difficulty-row">
              <button
                className={`difficulty-btn ${positionMode === "fixed" ? "active" : ""}`}
                onClick={() => setPositionMode("fixed")}
              >
                FIXED
              </button>
              <button
                className={`difficulty-btn ${positionMode === "random" ? "active" : ""}`}
                onClick={() => setPositionMode("random")}
              >
                RANDOM
              </button>
            </div>
            <div className="difficulty-hint">
              {positionMode === "fixed"
                ? "Classic order — GK first, subs last. Predictable and competitive"
                : "Spin to reveal your position each round — chaos, carnage, and competition"}
            </div>
          </div>

          <div className="difficulty-section">
            <span className="field-label-sm">COMPETITION FORMAT</span>
            <div className="difficulty-row">
              {formatOptions.map(f => (
                <button
                  key={f.key}
                  className={`difficulty-btn ${activeFormat === f.key ? "active" : ""}`}
                  onClick={() => setFormat(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="difficulty-hint">
              {formatOptions.find(f => f.key === activeFormat)?.hint}
            </div>
          </div>

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

        <button
          className={`start-btn ${canStart ? "active" : ""}`}
          onClick={handleStart}
          disabled={!canStart}
        >
          ▶ BEGIN TRANSFER WINDOW
        </button>

        {!valid && clubs.some(c => c.dofName.trim() || c.clubName.trim()) && (
          <p className="setup-validation">Every club needs a DoF name and a club name to start.</p>
        )}
      </div>
    </div>
  );
}

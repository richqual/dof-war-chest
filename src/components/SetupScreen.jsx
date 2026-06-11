import { useState } from "react";
import { RANDOM_CLUB_NAMES, RANDOM_MANAGER_NAMES } from "../data/players";
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
    const kit = CPU_KITS[Math.floor(Math.random() * CPU_KITS.length)];
    onChange({
      ...club,
      isComputer: true,
      dofName: club.dofName.trim() ? club.dofName : randomManagerName(),
      clubName: club.clubName.trim() ? club.clubName : randomClubName(),
      primaryColor: kit.primary,
      secondaryColor: kit.secondary,
      pattern: Math.random() < 0.4 ? "stripes" : "plain",
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
        <label className="field-label-sm">KIT COLOURS &amp; PATTERN</label>
        <div className="kit-row">
          <KitSwatch
            primary={club.primaryColor || defaults.primary}
            secondary={club.secondaryColor || defaults.secondary}
            pattern={club.pattern || "plain"}
            uid={`c${index}`}
          />
          <div className="colour-pair">
            <label className="colour-label">Home
              <input type="color" className="colour-input"
                value={club.primaryColor || defaults.primary}
                onChange={e => onChange({ ...club, primaryColor: e.target.value })} />
            </label>
            <label className="colour-label">Away
              <input type="color" className="colour-input"
                value={club.secondaryColor || defaults.secondary}
                onChange={e => onChange({ ...club, secondaryColor: e.target.value })} />
            </label>
          </div>
          <div className="pattern-btns">
            {["plain", "stripes"].map(pat => (
              <button
                key={pat}
                className={`pattern-btn ${(club.pattern || "plain") === pat ? "active" : ""}`}
                onClick={() => onChange({ ...club, pattern: pat })}
              >{pat === "plain" ? "■" : "▦"}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function makeClub(index) {
  const d = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  return { dofName: "", clubName: "", primaryColor: d.primary, secondaryColor: d.secondary, pattern: "plain", isComputer: false };
}

const DIFFICULTY_INFO = [
  { key: "easy",   label: "EASY",   hint: "War chest — big budgets flow like the old days" },
  { key: "normal", label: "NORMAL", hint: "Tighter purse strings — every spin matters" },
  { key: "hard",   label: "HARD",   hint: "Shoestring — bargain bins and free transfers" },
];

const FORMAT_OPTIONS_2 = [
  { key: "single", label: "SINGLE MATCH",  hint: "One match decides it all" },
  { key: "bo3",    label: "BEST OF 3",     hint: "First to 2 wins" },
  { key: "bo5",    label: "BEST OF 5",     hint: "First to 3 wins" },
  { key: "bo7",    label: "BEST OF 7",     hint: "First to 4 wins — NBA Finals style" },
];
const FORMAT_OPTIONS_4 = [
  { key: "single",     label: "SINGLE MATCH", hint: "Pick any two teams and play one-off" },
  { key: "tournament", label: "TOURNAMENT",   hint: "2-legged semi-finals (aggregate), then a 1-leg Grand Final" },
];

export default function SetupScreen({ onStart }) {
  const [clubs, setClubs] = useState([makeClub(0), makeClub(1)]);
  const [hideRatings, setHideRatings] = useState(false);
  const [difficulty, setDifficulty] = useState("normal");
  const [format, setFormat] = useState("bo7");

  const formatOptions = clubs.length === 4 ? FORMAT_OPTIONS_4 : FORMAT_OPTIONS_2;
  // Reset format when club count changes and current format is incompatible
  const validFormats = formatOptions.map(f => f.key);
  const activeFormat = validFormats.includes(format) ? format : (clubs.length === 4 ? "tournament" : "bo7");

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
    onStart(clubs.map(c => ({ ...c, dofName: c.dofName.trim(), clubName: c.clubName.trim() })), { hideRatings, difficulty, format: activeFormat });
  }

  return (
    <div className="setup-screen">
      <div className="setup-card setup-card-wide">
        <div className="setup-header">
          <div className="setup-badge">TRANSFER WINDOW</div>
          <h1 className="setup-title">DoF: War Chest</h1>
          <p className="setup-sub">You are a Director of Football. Build a legendary squad spanning generations.</p>
        </div>

        <div className="setup-rules">
          <div className="rules-title">HOW IT WORKS</div>
          <div className="rules-body">
            Each turn spin the budget wheel (£0–200m). Pick one player for the current
            position — unspent money carries over to your next pick. Draft order rotates
            each round. 16 players: 11 starters + 5 subs. Then simulate the match.
          </div>
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

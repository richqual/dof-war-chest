import { useState } from "react";
import { RANDOM_CLUB_NAMES } from "../data/players";

const DEFAULT_COLORS = [
  { primary: "#c8102e", secondary: "#ffffff" }, // Red/White
  { primary: "#003087", secondary: "#ffffff" }, // Blue/White
  { primary: "#034694", secondary: "#d4af37" }, // Blue/Gold
  { primary: "#1B5E20", secondary: "#ffffff" }, // Green/White
];

function randomClubName() {
  return RANDOM_CLUB_NAMES[Math.floor(Math.random() * RANDOM_CLUB_NAMES.length)];
}

function KitSwatch({ primary, secondary, pattern = "plain", uid = "0" }) {
  const patId = `stripe-${uid}`;
  return (
    <svg width="36" height="36" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
      {pattern === "stripes" && (
        <defs>
          <pattern id={patId} x="0" y="0" width="4" height="28" patternUnits="userSpaceOnUse">
            <rect width="2" height="28" fill={primary} />
            <rect x="2" width="2" height="28" fill={secondary} />
          </pattern>
        </defs>
      )}
      <path d="M10 2 L4 7 L7 9 L7 24 L21 24 L21 9 L24 7 L18 2 L15 5 L13 5 Z"
        fill={pattern === "stripes" ? `url(#${patId})` : primary}
        stroke={secondary} strokeWidth="1.5" />
      <path d="M10 2 L13 5 L15 5 L18 2 L15 7 L13 7 Z" fill={secondary} />
    </svg>
  );
}

function ClubSetup({ index, club, onChange, onRemove, canRemove }) {
  const defaults = DEFAULT_COLORS[index % DEFAULT_COLORS.length];

  function randomise() {
    let name;
    do { name = randomClubName(); } while (name === club.clubName);
    onChange({ ...club, clubName: name });
  }

  return (
    <div className="club-setup-card">
      <div className="club-setup-header">
        <span className="club-setup-num">CLUB {index + 1}</span>
        {canRemove && (
          <button className="remove-btn" onClick={onRemove} title="Remove club">✕</button>
        )}
      </div>

      <div className="club-setup-field">
        <label className="field-label-sm">DIRECTOR OF FOOTBALL</label>
        <input
          className="name-input"
          value={club.dofName}
          onChange={e => onChange({ ...club, dofName: e.target.value })}
          placeholder={`DoF Name ${index + 1}`}
          maxLength={20}
        />
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
  return { dofName: "", clubName: "", primaryColor: d.primary, secondaryColor: d.secondary, pattern: "plain" };
}

export default function SetupScreen({ onStart }) {
  const [clubs, setClubs] = useState([makeClub(0), makeClub(1)]);
  const [hideRatings, setHideRatings] = useState(false);

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
    onStart(clubs.map(c => ({ ...c, dofName: c.dofName.trim(), clubName: c.clubName.trim() })), { hideRatings });
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
            Each turn spin a transfer budget (£0–190m). Pick one player for the current
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

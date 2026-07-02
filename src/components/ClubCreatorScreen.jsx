import { useState } from "react";
import { RANDOM_CLUB_NAMES, RANDOM_MANAGER_NAMES, EASTER_EGG_TEAMS } from "../data/players";
import { FORMATION_LIST } from "../data/formations";
import KitSwatch from "./KitSwatch";

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

const HUMAN_KITS = [
  { primary: "#c8102e", secondary: "#ffffff" },
  { primary: "#003087", secondary: "#ffffff" },
  { primary: "#034694", secondary: "#d4af37" },
  { primary: "#1B5E20", secondary: "#ffffff" },
];

const WEIGHTED_FORMATIONS = [
  { f: "4-3-3",   w: 35 },
  { f: "4-2-3-1", w: 25 },
  { f: "4-4-2",   w: 15 },
  { f: "3-5-2",   w: 10 },
  { f: "4-5-1",   w: 6  },
  { f: "3-4-3",   w: 5  },
  { f: "5-3-2",   w: 3  },
  { f: "5-4-1",   w: 1  },
];
const FORMATION_TOTAL = WEIGHTED_FORMATIONS.reduce((s, e) => s + e.w, 0);

function randomClubName() {
  return RANDOM_CLUB_NAMES[Math.floor(Math.random() * RANDOM_CLUB_NAMES.length)];
}

function randomManagerName() {
  return RANDOM_MANAGER_NAMES[Math.floor(Math.random() * RANDOM_MANAGER_NAMES.length)];
}

function randomCpuFormation() {
  let r = Math.random() * FORMATION_TOTAL;
  for (const { f, w } of WEIGHTED_FORMATIONS) {
    r -= w;
    if (r <= 0) return f;
  }
  return "4-3-3";
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colourDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Returns kits from the pool whose primary is sufficiently distinct from all takenColors.
// Falls back to the full pool if everything is too close.
function filterDistinctKits(pool, takenColors, threshold = 80) {
  const distinct = pool.filter(k => takenColors.every(c => colourDistance(k.primary, c) >= threshold));
  return distinct.length > 0 ? distinct : pool;
}

function randomCpuIdentity(existingNames = [], takenColors = []) {
  const formation = randomCpuFormation();
  if (Math.random() < 0.25) {
    const egg = EASTER_EGG_TEAMS[Math.floor(Math.random() * EASTER_EGG_TEAMS.length)];
    return { clubName: egg.clubName, dofName: egg.dofName, primaryColor: egg.primary, secondaryColor: egg.secondary, pattern: egg.pattern, formation };
  }
  const available = filterDistinctKits(CPU_KITS, takenColors);
  const kit = available[Math.floor(Math.random() * available.length)];
  let name;
  do { name = randomClubName(); } while (existingNames.includes(name));
  const r = Math.random();
  const pattern = r < 0.35 ? "stripes" : r < 0.45 ? "hoops" : "plain";
  return { clubName: name, dofName: randomManagerName(), primaryColor: kit.primary, secondaryColor: kit.secondary, pattern, formation };
}

const ALL_KITS = [
  ...CPU_KITS,
  { primary: "#034694", secondary: "#d4af37" },
  { primary: "#dc143c", secondary: "#000000" },
  { primary: "#ffffff", secondary: "#000000" },
  { primary: "#ffcc00", secondary: "#000000" },
  { primary: "#8b0000", secondary: "#ffd700" },
];

function randomHumanIdentity(existingName = "") {
  const formation = randomCpuFormation();
  if (Math.random() < 0.25) {
    const egg = EASTER_EGG_TEAMS[Math.floor(Math.random() * EASTER_EGG_TEAMS.length)];
    return { clubName: egg.clubName, dofName: egg.dofName, primaryColor: egg.primary, secondaryColor: egg.secondary, pattern: egg.pattern, formation };
  }
  const kit = ALL_KITS[Math.floor(Math.random() * ALL_KITS.length)];
  let name;
  do { name = randomClubName(); } while (name === existingName);
  const r = Math.random();
  const pattern = r < 0.35 ? "stripes" : r < 0.45 ? "hoops" : "plain";
  return { clubName: name, dofName: randomManagerName(), primaryColor: kit.primary, secondaryColor: kit.secondary, pattern, formation };
}

function makeHumanClub(index) {
  const d = HUMAN_KITS[index % HUMAN_KITS.length];
  return { dofName: "", clubName: "", primaryColor: d.primary, secondaryColor: d.secondary, pattern: "plain", isComputer: false, formation: "4-3-3" };
}

function makeCpuClub(existingNames, takenColors = []) {
  const identity = randomCpuIdentity(existingNames, takenColors);
  return { ...identity, isComputer: true };
}

// ── Shared club editor form ───────────────────────────────────────────────────

function ClubEditorForm({ club, onChange, index, hideFormation = false, profileDefaults }) {
  const defaults = HUMAN_KITS[index % HUMAN_KITS.length];

  function applyProfile() {
    onChange({
      ...club,
      dofName:        profileDefaults.dofName        || club.dofName,
      clubName:       profileDefaults.clubName        || club.clubName,
      primaryColor:   profileDefaults.primaryColor    || club.primaryColor,
      secondaryColor: profileDefaults.secondaryColor  || club.secondaryColor,
      pattern:        profileDefaults.pattern         || club.pattern,
    });
  }

  return (
    <>
      {profileDefaults && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="profile-autofill-btn" type="button" onClick={applyProfile}>
            ⚽ USE MY SAVED CLUB
          </button>
        </div>
      )}
      <div className="club-setup-field">
        <label className="field-label-sm">DIRECTOR OF FOOTBALL</label>
        <input
          className="name-input creator-name-input"
          value={club.dofName}
          onChange={e => onChange({ ...club, dofName: e.target.value })}
          placeholder="DoF name…"
          maxLength={20}
        />
      </div>

      <div className="club-setup-field">
        <label className="field-label-sm">CLUB NAME</label>
        <input
          className="name-input creator-name-input"
          value={club.clubName}
          onChange={e => onChange({ ...club, clubName: e.target.value })}
          placeholder="Club name…"
          maxLength={28}
        />
      </div>

      <div className="club-setup-field">
        <div className="kit-formation-row">
          <div className="kit-formation-col">
            <label className="field-label-sm">KIT DESIGN</label>
            <div className="kit-row">
              <KitSwatch
                primary={club.primaryColor || defaults.primary}
                secondary={club.secondaryColor || defaults.secondary}
                pattern={club.pattern || "plain"}
                uid={`c${index}`}
                size={64}
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
          {!hideFormation && (
            <div className="kit-formation-col kit-formation-col--formation">
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
          )}
        </div>
      </div>
    </>
  );
}

// ── Overview card: human (read-only summary) ──────────────────────────────────

function HumanSummaryCard({ index, club, hideFormation = false }) {
  return (
    <div className="club-overview-card">
      <div className="club-setup-header">
        <span className="club-setup-num">CLUB {index + 1}</span>
        <span className="human-badge">HUMAN</span>
      </div>
      <div className="overview-preview">
        <KitSwatch
          primary={club.primaryColor}
          secondary={club.secondaryColor}
          pattern={club.pattern || "plain"}
          uid={`ov${index}`}
        />
        <div className="overview-info">
          <div className="overview-club-name">{club.clubName || "—"}</div>
          <div className="overview-meta">{club.dofName || "—"}</div>
          {!hideFormation && <div className="overview-meta">{club.formation || "4-3-3"}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Overview card: CPU (greyed, with edit button) ─────────────────────────────

function CpuSummaryCard({ index, club, onEdit, hideFormation = false }) {
  return (
    <div className="club-overview-card cpu-locked">
      <div className="club-setup-header">
        <span className="club-setup-num">CLUB {index + 1}</span>
        <div className="club-setup-header-right">
          <span className="cpu-badge">CPU</span>
          <button className="cpu-edit-btn" onClick={onEdit}>✎ EDIT</button>
        </div>
      </div>
      <div className="overview-preview">
        <KitSwatch
          primary={club.primaryColor}
          secondary={club.secondaryColor}
          pattern={club.pattern || "plain"}
          uid={`cpu${index}`}
        />
        <div className="overview-info">
          <div className="overview-club-name">{club.clubName}</div>
          <div className="overview-meta">{club.dofName}</div>
          {!hideFormation && <div className="overview-meta">{club.formation}</div>}
        </div>
      </div>
    </div>
  );
}

// ── CPU editor step ────────────────────────────────────────────────────────────

function CpuEditorStep({ index, club, onChange, onDone, otherColors = [], hideFormation = false }) {
  const valid = club.dofName.trim() && club.clubName.trim();
  return (
    <div className="setup-card setup-card-wide">
      <button className="creator-back-link" onClick={onDone}>← BACK TO OVERVIEW</button>

      <div className="creator-step-header">
        <span className="club-setup-num">CLUB {index + 1}</span>
        <div className="creator-step-header-right">
          <button
            className="randomise-all-btn"
            onClick={() => {
              const identity = randomCpuIdentity([], otherColors);
              onChange({ ...club, ...identity, isComputer: true });
            }}
            title="Randomise everything"
          >
            🎲
          </button>
          <span className="cpu-badge">CPU — EDITING</span>
        </div>
      </div>

      <ClubEditorForm club={club} onChange={onChange} index={index} hideFormation={hideFormation} />

      <button
        className={`start-btn ${valid ? "active" : ""}`}
        onClick={onDone}
        disabled={!valid}
      >
        ✓ SAVE &amp; BACK TO OVERVIEW
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ClubCreatorScreen({ config, onStart, onBack, profileDefaults }) {
  const { numClubs, numHumans, warChest, ...gameOptions } = config;
  const hideFormation = !!warChest;

  const [clubs, setClubs] = useState(() => {
    const result = [];
    for (let i = 0; i < numHumans; i++) {
      result.push(makeHumanClub(i));
    }
    const takenNames = [];
    // Seed taken colours with human defaults so CPUs avoid clashing with them too
    const takenColors = result.map(c => c.primaryColor);
    for (let i = numHumans; i < numClubs; i++) {
      const cpu = makeCpuClub(takenNames, takenColors);
      takenNames.push(cpu.clubName);
      takenColors.push(cpu.primaryColor);
      result.push(cpu);
    }
    return result;
  });

  // step: 0..numHumans-1 = human wizard; numHumans = overview
  const [step, setStep] = useState(0);
  // null = not editing a CPU club; number = index of CPU club being edited
  const [editingCpuIdx, setEditingCpuIdx] = useState(null);

  function updateClub(i, updated) {
    setClubs(prev => prev.map((c, j) => j === i ? updated : c));
  }

  // ── CPU editor ──
  if (editingCpuIdx !== null) {
    return (
      <div className="setup-screen">
        <CpuEditorStep
          index={editingCpuIdx}
          club={clubs[editingCpuIdx]}
          onChange={updated => updateClub(editingCpuIdx, updated)}
          onDone={() => setEditingCpuIdx(null)}
          otherColors={clubs.filter((_, i) => i !== editingCpuIdx).map(c => c.primaryColor)}
          hideFormation={hideFormation}
        />
      </div>
    );
  }

  // ── Human wizard step ──
  if (step < numHumans) {
    const club = clubs[step];
    const valid = club.dofName.trim() && club.clubName.trim();
    const isLast = step === numHumans - 1;

    return (
      <div className="setup-screen">
        <div className="setup-card setup-card-wide">
          {step > 0 && (
            <button className="creator-back-link" onClick={() => setStep(s => s - 1)}>
              ← BACK
            </button>
          )}
          {step === 0 && (
            <button className="creator-back-link" onClick={onBack}>
              ← BACK
            </button>
          )}

          <div className="creator-step-header">
            <span className="creator-step-label">
              {numHumans > 1 ? `CLUB ${step + 1} OF ${numHumans}` : "YOUR CLUB"}
            </span>
            <div className="creator-step-header-right">
              <button
                className="randomise-all-btn"
                onClick={() => {
                  const identity = randomHumanIdentity(club.clubName);
                  updateClub(step, { ...club, ...identity, isComputer: false });
                }}
                title="Randomise everything"
              >
                🎲
              </button>
              <span className="player-badge">
                {numHumans > 1 ? `PLAYER ${step + 1}` : "PLAYER"}
              </span>
            </div>
          </div>

          <div className="creator-step-dots">
            {Array.from({ length: numHumans }, (_, i) => (
              <span key={i} className={`creator-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
            ))}
          </div>

          <ClubEditorForm club={club} onChange={updated => updateClub(step, updated)} index={step} hideFormation={hideFormation} profileDefaults={step === 0 ? profileDefaults : null} />

          <button
            className={`start-btn ${valid ? "active" : ""}`}
            onClick={() => { if (valid) setStep(s => s + 1); }}
            disabled={!valid}
          >
            {isLast ? "REVIEW CLUBS →" : "NEXT CLUB →"}
          </button>

          {!valid && (club.dofName.trim() || club.clubName.trim()) && (
            <p className="setup-validation">Enter a DoF name and club name to continue.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Overview ──
  const humanValid = clubs.slice(0, numHumans).every(c => c.dofName.trim() && c.clubName.trim());

  function handleStart() {
    if (!humanValid) return;
    const finalClubs = clubs.map(c => ({ ...c, dofName: c.dofName.trim(), clubName: c.clubName.trim() }));
    onStart(finalClubs, gameOptions);
  }

  return (
    <div className="setup-screen">
      <div className="setup-card setup-card-wide">
        <button className="creator-back-link" onClick={() => setStep(numHumans - 1)}>
          ← BACK
        </button>

        <div className="creator-step-header">
          <span className="creator-step-label">ALL CLUBS</span>
        </div>

        <div className="clubs-grid">
          {clubs.map((club, i) =>
            club.isComputer
              ? <CpuSummaryCard key={i} index={i} club={club} onEdit={() => setEditingCpuIdx(i)} hideFormation={hideFormation} />
              : <HumanSummaryCard key={i} index={i} club={club} hideFormation={hideFormation} />
          )}
        </div>

        <button
          className={`start-btn ${humanValid ? "active" : ""}`}
          onClick={handleStart}
          disabled={!humanValid}
        >
          ▶ BEGIN DRAFT
        </button>
      </div>
    </div>
  );
}

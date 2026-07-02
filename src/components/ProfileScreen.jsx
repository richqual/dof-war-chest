import { useState } from "react";
import KitSwatch from "./KitSwatch";

const PATTERNS = [
  { key: "plain",   label: "Plain"   },
  { key: "stripes", label: "Stripes" },
  { key: "hoops",   label: "Hoops"   },
];

const PRESET_KITS = [
  { primary: "#c8102e", secondary: "#ffffff" },
  { primary: "#003087", secondary: "#ffffff" },
  { primary: "#1B5E20", secondary: "#ffd700" },
  { primary: "#6a0dad", secondary: "#ffffff" },
  { primary: "#f97316", secondary: "#000000" },
  { primary: "#0e7490", secondary: "#ffffff" },
  { primary: "#111827", secondary: "#fbbf24" },
  { primary: "#be185d", secondary: "#ffffff" },
  { primary: "#1a3a6b", secondary: "#ffffff" },
  { primary: "#7c2d12", secondary: "#f5e6d0" },
];

export default function ProfileScreen({ profile, onSave, onBack, isSetup = false }) {
  const [dofName,        setDofName]        = useState(profile?.dofName        || "");
  const [clubName,       setClubName]       = useState(profile?.clubName       || "");
  const [primaryColor,   setPrimaryColor]   = useState(profile?.primaryColor   || "#1a3a6b");
  const [secondaryColor, setSecondaryColor] = useState(profile?.secondaryColor || "#ffffff");
  const [pattern,        setPattern]        = useState(profile?.pattern        || "plain");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");

  const patternIdx  = PATTERNS.findIndex(p => p.key === pattern);
  const nextPattern = PATTERNS[(patternIdx + 1) % PATTERNS.length];

  async function handleSave() {
    if (!dofName.trim()) { setError("Enter your DoF name."); return; }
    if (!clubName.trim()) { setError("Enter a club name."); return; }
    setSaving(true);
    try {
      await onSave({ dofName: dofName.trim(), clubName: clubName.trim(), primaryColor, secondaryColor, pattern });
    } catch (e) {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-screen">
      <div className="profile-box">
        <div className="profile-title">{isSetup ? "SET UP YOUR PROFILE" : "EDIT PROFILE"}</div>
        {isSetup && (
          <p className="profile-subtitle">
            Your default DoF and club — pre-filled whenever you start a game.
          </p>
        )}

        <div className="profile-section-label">DIRECTOR OF FOOTBALL</div>
        <input
          className="setup-input"
          placeholder="Your name"
          value={dofName}
          maxLength={32}
          onChange={e => setDofName(e.target.value)}
        />

        <div className="profile-section-label">DEFAULT CLUB NAME</div>
        <input
          className="setup-input"
          placeholder="Club name"
          value={clubName}
          maxLength={32}
          onChange={e => setClubName(e.target.value)}
        />

        <div className="profile-section-label">DEFAULT KIT</div>

        {/* Kit preview */}
        <div className="profile-kit-preview">
          <KitSwatch
            primary={primaryColor}
            secondary={secondaryColor}
            pattern={pattern}
            uid="profile-kit"
            size={56}
          />
          <span className="profile-club-preview">{clubName || "Your Club"}</span>
        </div>

        {/* Preset swatches */}
        <div className="profile-kit-presets">
          {PRESET_KITS.map((k, i) => (
            <div
              key={i}
              className={`profile-kit-preset ${k.primary === primaryColor && k.secondary === secondaryColor ? "selected" : ""}`}
              onClick={() => { setPrimaryColor(k.primary); setSecondaryColor(k.secondary); }}
            >
              <KitSwatch primary={k.primary} secondary={k.secondary} pattern={pattern} uid={`pk-${i}`} size={28} />
            </div>
          ))}
        </div>

        {/* Custom colours */}
        <div className="profile-kit-colours">
          <label className="kit-colour-label">
            <span>Primary</span>
            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
          </label>
          <label className="kit-colour-label">
            <span>Secondary</span>
            <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
          </label>
          <button
            className="pattern-btn active"
            style={{ marginLeft: "auto" }}
            onClick={() => setPattern(nextPattern.key)}
            title={`Switch to ${nextPattern.label}`}
          >
            🔄 {pattern}
          </button>
        </div>

        {error && <div className="profile-error">{error}</div>}

        <button
          className="tt-continue-btn profile-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "SAVING…" : isSetup ? "▶ LET'S GO" : "✓ SAVE PROFILE"}
        </button>

        {!isSetup && onBack && (
          <button className="sim-btn secondary profile-back-btn" onClick={onBack}>
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}

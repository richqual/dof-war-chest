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
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-topbar">
          {!isSetup && onBack
            ? <button className="bw-back-link" onClick={onBack}>← BACK</button>
            : <span className="bw-screen-badge">THE TRANSFER WHEEL</span>}
          <span className="bw-screen-badge">{isSetup ? "PROFILE SETUP" : "EDIT PROFILE"}</span>
        </div>

        <div className="bw-body">
          {isSetup && (
            <p className="bw-profile-intro">
              Your default DoF and club — pre-filled whenever you start a game.
            </p>
          )}

          <div className="bw-field">
            <div className="bw-field-label">DIRECTOR OF FOOTBALL</div>
            <input
              className="bw-input"
              placeholder="Your name…"
              value={dofName}
              maxLength={32}
              onChange={e => setDofName(e.target.value)}
            />
          </div>

          <div className="bw-field">
            <div className="bw-field-label">DEFAULT CLUB NAME</div>
            <input
              className="bw-input"
              placeholder="Club name…"
              value={clubName}
              maxLength={32}
              onChange={e => setClubName(e.target.value)}
            />
          </div>

          <div className="bw-field">
            <div className="bw-field-label">DEFAULT KIT</div>
            <div className="bw-kit-row">
              <KitSwatch
                primary={primaryColor}
                secondary={secondaryColor}
                pattern={pattern}
                uid="profile-kit"
                size={64}
              />
              <div className="bw-kit-controls">
                <div className="bw-profile-preview-name">{clubName || "Your Club"}</div>
                <div className="bw-kit-swatches">
                  <input type="color" className="bw-colour-input"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)} />
                  <input type="color" className="bw-colour-input"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)} />
                  <button
                    className="bw-pattern-btn"
                    onClick={() => setPattern(nextPattern.key)}
                    title={`Switch to ${nextPattern.label}`}
                  >🔄</button>
                </div>
              </div>
            </div>

            <div className="bw-profile-presets">
              {PRESET_KITS.map((k, i) => {
                const selected = k.primary === primaryColor && k.secondary === secondaryColor;
                return (
                  <button
                    key={i}
                    className={`bw-profile-preset ${selected ? "selected" : ""}`}
                    onClick={() => { setPrimaryColor(k.primary); setSecondaryColor(k.secondary); }}
                  >
                    <KitSwatch primary={k.primary} secondary={k.secondary} pattern={pattern} uid={`pk-${i}`} size={26} />
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="bw-validation">{error}</p>}

          <button
            className="bw-cta-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "SAVING…" : isSetup ? "▶ LET'S GO" : "✓ SAVE PROFILE"}
          </button>

          {!isSetup && onBack && (
            <button className="bw-cta-secondary" onClick={onBack}>
              CANCEL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

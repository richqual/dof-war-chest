import { useState } from "react";
import KitSwatch from "./KitSwatch";

const DIFFICULTY_INFO = [
  { key: "easy",   label: "GENEROUS", hint: "Big budgets (avg £109m)" },
  { key: "normal", label: "EASY",     hint: "Comfortable budgets (avg £80m)" },
  { key: "hard",   label: "NORMAL",   hint: "Balanced, occasional dry spell (avg £48m)" },
  { key: "expert", label: "HARD",     hint: "Shoestring budgets (avg £38m)" },
  { key: "brutal", label: "BRUTAL",   hint: "Scrap heap (avg £23m)" },
];

function HostGameConfig({ onStart, slots }) {
  const numClubs = slots.length;
  const [difficulty, setDifficulty] = useState("hard");
  const [positionMode, setPositionMode] = useState("random");
  const [hideRatings, setHideRatings] = useState(true);
  const [dynamicValues, setDynamicValues] = useState(true);
  const [dynamicForm, setDynamicForm] = useState(true);
  const [managerTiming, setManagerTiming] = useState("before");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Determine valid format options based on club count
  let formatOptions = [];
  if (numClubs === 2) {
    formatOptions = [
      { key: "bo3", label: "BEST OF 3" },
      { key: "bo5", label: "BEST OF 5" },
      { key: "bo7", label: "BEST OF 7" },
    ];
  } else if (numClubs === 4) {
    formatOptions = [{ key: "tournament", label: "TOURNAMENT" }];
  } else if (numClubs === 8) {
    formatOptions = [{ key: "tournament8", label: "TOURNAMENT" }];
  }
  const [format, setFormat] = useState(formatOptions[0]?.key || "bo7");

  function handleStart() {
    // Build clubs array from slots
    const clubs = slots.map((s, i) => ({
      dofName: s.displayName || `Player ${i + 1}`,
      clubName: s.clubName || `Club ${i + 1}`,
      primaryColor: s.primaryColor || "#1a3a6b",
      secondaryColor: s.secondaryColor || "#ffffff",
      pattern: s.pattern || "plain",
      formation: s.formation || "4-3-3",
      isComputer: !s.deviceId,
    }));
    const options = {
      difficulty,
      positionMode,
      format: formatOptions.length > 0 ? format : "bo7",
      hideRatings,
      dynamicValues,
      dynamicForm,
      managerTiming,
    };
    onStart(clubs, options);
  }

  return (
    <div className="mp-game-config">
      <div className="options-title">GAME SETTINGS</div>

      <div className="setup-row">
        <span className="setup-row-label">DIFFICULTY</span>
        <select className="setup-row-select setup-row-select-wide" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          {DIFFICULTY_INFO.map(d => <option key={d.key} value={d.key}>{d.label} — {d.hint}</option>)}
        </select>
      </div>

      <div className="setup-row">
        <span className="setup-row-label">DRAFT ORDER</span>
        <div className="setup-row-btns">
          <button className={`setup-row-btn ${positionMode === "fixed" ? "active" : ""}`} onClick={() => setPositionMode("fixed")}>FIXED</button>
          <button className={`setup-row-btn ${positionMode === "random" ? "active" : ""}`} onClick={() => setPositionMode("random")}>RANDOM</button>
        </div>
      </div>

      {formatOptions.length > 1 && (
        <div className="setup-row">
          <span className="setup-row-label">FORMAT</span>
          <div className="setup-row-btns">
            {formatOptions.map(f => (
              <button key={f.key} className={`setup-row-btn ${format === f.key ? "active" : ""}`} onClick={() => setFormat(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="advanced-toggle" onClick={() => setShowAdvanced(v => !v)}>
        {showAdvanced ? "▲" : "▼"} ADVANCED
      </button>

      {showAdvanced && (
        <div className="advanced-options">
          <label className="option-row">
            <input type="checkbox" className="option-checkbox" checked={managerTiming === "before"} onChange={e => setManagerTiming(e.target.checked ? "before" : "after")} />
            <span className="option-label">Manager draft before squad draft</span>
          </label>
          <label className="option-row">
            <input type="checkbox" className="option-checkbox" checked={hideRatings} onChange={e => setHideRatings(e.target.checked)} />
            <span className="option-label">Hide player ratings during draft</span>
          </label>
          <label className="option-row">
            <input type="checkbox" className="option-checkbox" checked={dynamicValues} onChange={e => setDynamicValues(e.target.checked)} />
            <span className="option-label">Randomize player values each game</span>
          </label>
          <label className="option-row">
            <input type="checkbox" className="option-checkbox" checked={dynamicForm} onChange={e => setDynamicForm(e.target.checked)} />
            <span className="option-label">Apply player form variance</span>
          </label>
        </div>
      )}

      <button className="start-btn active" onClick={handleStart}>
        START GAME →
      </button>
    </div>
  );
}

const COLORS = [
  "#1a3a6b", "#c41e3a", "#006400", "#ff6600", "#8b008b",
  "#005f5f", "#1c1c1c", "#b8860b", "#4b0082", "#8b0000",
  "#ffffff", "#f5f5f5", "#ffd700", "#87ceeb", "#ff69b4",
];

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2", "3-4-3"];

export default function MultiplayerWaitingRoom({ gameDoc, mySlotIdx, isHost, onUpdateSlot, onStartGame, onLeave }) {
  const [editing, setEditing] = useState(false);
  const [clubName, setClubName] = useState(gameDoc?.slots?.[mySlotIdx]?.clubName || "");
  const [displayName, setDisplayName] = useState(gameDoc?.slots?.[mySlotIdx]?.displayName || "");
  const [primaryColor, setPrimaryColor] = useState(gameDoc?.slots?.[mySlotIdx]?.primaryColor || "#1a3a6b");
  const [secondaryColor, setSecondaryColor] = useState(gameDoc?.slots?.[mySlotIdx]?.secondaryColor || "#ffffff");
  const [formation, setFormation] = useState(gameDoc?.slots?.[mySlotIdx]?.formation || "4-3-3");
  const [saving, setSaving] = useState(false);

  const slots = gameDoc?.slots || [];
  const roomCode = gameDoc?.roomCode || "------";
  const mySlot = slots[mySlotIdx] ?? {};
  const myReady = !!(mySlot.clubName && mySlot.displayName);

  const filledSlots = slots.filter(s => s.deviceId !== null).length;
  const canStart = isHost && filledSlots >= 2 && slots.filter(s => s.deviceId && !(s.clubName && s.displayName)).length === 0;

  async function saveSlot() {
    if (!clubName.trim() || !displayName.trim()) return;
    setSaving(true);
    await onUpdateSlot({
      clubName: clubName.trim(),
      displayName: displayName.trim(),
      primaryColor,
      secondaryColor,
      formation,
      ready: true,
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="setup-screen">
      <div className="setup-card setup-card-wide">

        <div className="setup-header">
          <h1 className="setup-title">Waiting Room</h1>
          <p className="setup-sub">Share the code with your mates</p>
        </div>

        {/* Room code */}
        <div className="mp-room-code-box">
          <div className="mp-room-code-label">ROOM CODE</div>
          <div className="mp-room-code">{roomCode}</div>
          <button
            className="mp-copy-btn"
            onClick={() => navigator.clipboard.writeText(roomCode)}
          >
            COPY
          </button>
        </div>

        {/* Player slots */}
        <div className="mp-slots">
          {slots.map((slot, i) => {
            const isMine = i === mySlotIdx;
            const joined = slot.deviceId !== null;
            const ready = !!(slot.clubName && slot.displayName);
            return (
              <div key={i} className={`mp-slot ${isMine ? "mp-slot-mine" : ""} ${ready ? "mp-slot-ready" : ""}`}>
                <div className="mp-slot-number">#{i + 1}</div>
                {joined ? (
                  <>
                    {ready ? (
                      <KitSwatch
                        primary={slot.primaryColor}
                        secondary={slot.secondaryColor}
                        pattern={slot.pattern || "plain"}
                        size={36}
                      />
                    ) : (
                      <div className="mp-slot-kit-placeholder" />
                    )}
                    <div className="mp-slot-info">
                      <div className="mp-slot-name">{slot.clubName || "—"}</div>
                      <div className="mp-slot-manager">{slot.displayName || "Setting up..."}</div>
                    </div>
                    <div className="mp-slot-status">{ready ? "✓ Ready" : "..."}</div>
                  </>
                ) : (
                  <div className="mp-slot-empty">Waiting for player...</div>
                )}
                {isMine && !editing && (
                  <button className="mp-slot-edit-btn" onClick={() => setEditing(true)}>
                    {ready ? "Edit" : "Set up"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* My slot editor */}
        {editing && (
          <div className="mp-slot-editor">
            <div className="mp-editor-title">YOUR CLUB</div>

            <div className="setup-row">
              <span className="setup-row-label">YOUR NAME</span>
              <input
                className="mp-text-input"
                type="text"
                maxLength={20}
                placeholder="e.g. Rich"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            <div className="setup-row">
              <span className="setup-row-label">CLUB NAME</span>
              <input
                className="mp-text-input"
                type="text"
                maxLength={24}
                placeholder="e.g. FC United"
                value={clubName}
                onChange={e => setClubName(e.target.value)}
              />
            </div>

            <div className="setup-row">
              <span className="setup-row-label">FORMATION</span>
              <select
                className="setup-row-select"
                value={formation}
                onChange={e => setFormation(e.target.value)}
              >
                {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="mp-color-row">
              <span className="setup-row-label">PRIMARY</span>
              <div className="mp-color-swatches">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`mp-color-swatch ${primaryColor === c ? "mp-color-selected" : ""}`}
                    style={{ background: c, border: c === "#ffffff" || c === "#f5f5f5" ? "1px solid #555" : "none" }}
                    onClick={() => setPrimaryColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="mp-color-row">
              <span className="setup-row-label">SECONDARY</span>
              <div className="mp-color-swatches">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`mp-color-swatch ${secondaryColor === c ? "mp-color-selected" : ""}`}
                    style={{ background: c, border: c === "#ffffff" || c === "#f5f5f5" ? "1px solid #555" : "none" }}
                    onClick={() => setSecondaryColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="mp-kit-preview">
              <KitSwatch primary={primaryColor} secondary={secondaryColor} pattern="plain" size={64} />
            </div>

            <button
              className="start-btn active"
              onClick={saveSlot}
              disabled={saving || !clubName.trim() || !displayName.trim()}
            >
              {saving ? "SAVING..." : "CONFIRM →"}
            </button>
            <button className="mp-back-link" onClick={() => setEditing(false)}>← cancel</button>
          </div>
        )}

        {/* Host controls */}
        {isHost && !editing && (
          <div className="mp-host-controls">
            {!canStart && (
              <p className="mp-hint">
                {filledSlots < 2
                  ? "Waiting for at least one more player to join..."
                  : "Waiting for all players to set up their club..."}
              </p>
            )}

            {canStart && <HostGameConfig onStart={onStartGame} slots={slots} />}
          </div>
        )}

        {!isHost && !editing && (
          <p className="mp-hint" style={{ marginTop: "1.5rem" }}>
            {myReady ? "You're ready! Waiting for the host to start..." : "Set up your club above to get ready."}
          </p>
        )}

        <button className="mp-back-link" style={{ marginTop: "1rem" }} onClick={onLeave}>
          ✕ Leave room
        </button>
      </div>
    </div>
  );
}

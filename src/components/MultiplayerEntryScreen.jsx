import { useState } from "react";

export default function MultiplayerEntryScreen({ onCreateGame, onJoinGame, onBack, loading, error, clearError }) {
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [numSlots, setNumSlots] = useState(2);
  const [roomCode, setRoomCode] = useState("");

  function handleCreate() {
    onCreateGame(numSlots);
  }

  function handleJoin() {
    if (roomCode.trim().length < 6) return;
    onJoinGame(roomCode.trim());
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-mp-header">
          <div className="bw-mp-header-title">MULTIPLAYER</div>
          <div className="bw-mp-header-sub">Play on your own device — no passing required.</div>
        </div>

        <div className="bw-body">
          {error && (
            <div className="bw-mp-error" onClick={clearError}>
              {error} <span style={{ float: "right", opacity: 0.6 }}>✕</span>
            </div>
          )}

          {!mode && (
            <>
              <button className="bw-mp-option create" onClick={() => setMode("create")}>
                <div className="bw-mp-option-row">
                  <span className="bw-mp-option-label">＋ CREATE ROOM</span>
                  <span className="bw-mp-option-arrow">→</span>
                </div>
                <div className="bw-mp-option-sub">Start a new game and share the code.</div>
              </button>
              <button className="bw-mp-option join" onClick={() => setMode("join")}>
                <div className="bw-mp-option-row">
                  <span className="bw-mp-option-label">→ JOIN ROOM</span>
                  <span className="bw-mp-option-arrow">→</span>
                </div>
                <div className="bw-mp-option-sub">Enter a code to join a friend's game.</div>
              </button>
              <div className="bw-mp-single-link">
                <button className="bw-back-link" onClick={onBack}>← SINGLE PLAYER</button>
              </div>
            </>
          )}

          {mode === "create" && (
            <>
              <div className="bw-field">
                <div className="bw-field-label">PLAYERS</div>
                <select
                  className="bw-select"
                  value={numSlots}
                  onChange={e => setNumSlots(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <p className="bw-mp-hint">
                Each player joins on their own device. Any unclaimed slots become CPU-controlled.
              </p>
              <button
                className="bw-cta-primary"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "CREATING..." : "CREATE ROOM →"}
              </button>
              <button className="bw-back-link bw-mp-back" onClick={() => setMode(null)}>← back</button>
            </>
          )}

          {mode === "join" && (
            <>
              <div className="bw-field">
                <div className="bw-field-label">ENTER ROOM CODE</div>
                <input
                  className="bw-input bw-mp-code-input"
                  type="text"
                  maxLength={6}
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  autoFocus
                />
              </div>
              <button
                className="bw-cta-primary"
                onClick={handleJoin}
                disabled={loading || roomCode.trim().length < 6}
              >
                {loading ? "JOINING..." : "JOIN ROOM →"}
              </button>
              <button className="bw-back-link bw-mp-back" onClick={() => setMode(null)}>← back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

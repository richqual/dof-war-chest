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
      <div className="setup-card setup-card-wide">
        <div className="setup-header">
          <h1 className="setup-title">Multiplayer</h1>
          <p className="setup-sub">Play on your own device — no passing required.</p>
        </div>

        {error && (
          <div className="mp-error" onClick={clearError}>
            {error} <span style={{ float: "right", opacity: 0.6 }}>✕</span>
          </div>
        )}

        {!mode && (
          <div className="mp-mode-buttons">
            <button className="mp-big-btn" onClick={() => setMode("create")}>
              <span className="mp-btn-icon">+</span>
              <span className="mp-btn-label">CREATE ROOM</span>
              <span className="mp-btn-sub">Start a new game and share the code</span>
            </button>
            <button className="mp-big-btn" onClick={() => setMode("join")}>
              <span className="mp-btn-icon">→</span>
              <span className="mp-btn-label">JOIN ROOM</span>
              <span className="mp-btn-sub">Enter a code to join a friend's game</span>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="mp-panel">
            <div className="setup-row">
              <span className="setup-row-label">PLAYERS</span>
              <select
                className="setup-row-select"
                value={numSlots}
                onChange={e => setNumSlots(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <p className="difficulty-hint setup-row-hint">
              Each player joins on their own device. Any unclaimed slots become CPU-controlled.
            </p>
            <button
              className="start-btn active"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "CREATING..." : "CREATE ROOM →"}
            </button>
            <button className="mp-back-link" onClick={() => setMode(null)}>← back</button>
          </div>
        )}

        {mode === "join" && (
          <div className="mp-panel">
            <p className="mp-panel-label">ENTER ROOM CODE</p>
            <input
              className="mp-code-input"
              type="text"
              maxLength={6}
              placeholder="ABC123"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              autoFocus
            />
            <button
              className="start-btn active"
              onClick={handleJoin}
              disabled={loading || roomCode.trim().length < 6}
            >
              {loading ? "JOINING..." : "JOIN ROOM →"}
            </button>
            <button className="mp-back-link" onClick={() => setMode(null)}>← back</button>
          </div>
        )}

        <button className="mp-back-link" style={{ marginTop: "1.5rem" }} onClick={onBack}>
          ← single player
        </button>
      </div>
    </div>
  );
}

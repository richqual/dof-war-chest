import { useState, useEffect } from "react";
import KitSwatch from "./KitSwatch";
import { POSITIONS } from "../data/players";

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getRatingColor(r) {
  if (r >= 85) return "#ffd700";
  if (r >= 75) return "#4ade80";
  if (r >= 65) return "#60a5fa";
  return "#94a3b8";
}

function SquadDetail({ squad, onClose, onDelete }) {
  const starters  = squad.squad.slice(0, 11).filter(Boolean);
  const bench     = squad.squad.slice(11).filter(Boolean);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mysquads-detail">
      <button className="back-btn" onClick={onClose}>← BACK</button>

      <div className="mysquads-detail-header">
        <KitSwatch primary={squad.primaryColor} secondary={squad.secondaryColor} pattern={squad.pattern} uid="sd" size={40} />
        <div>
          <div className="mysquads-detail-name">{squad.clubName}</div>
          <div className="mysquads-detail-meta">{squad.dofName} · {squad.mode} · {formatDate(squad.savedAt)}</div>
        </div>
        <div className="mysquads-rating" style={{ color: getRatingColor(squad.rating) }}>{squad.rating}</div>
      </div>

      <div className="mysquads-section-label">STARTING XI — {squad.formation}</div>
      <div className="mysquads-player-list">
        {starters.map((p, i) => (
          <div key={i} className="mysquads-player-row">
            <span className="mysquads-player-pos">{p.pos}</span>
            <span className="mysquads-player-name">{p.name}</span>
            <span className="mysquads-player-rating" style={{ color: getRatingColor(p.rating) }}>{p.rating}</span>
          </div>
        ))}
      </div>

      {bench.length > 0 && (
        <>
          <div className="mysquads-section-label">BENCH</div>
          <div className="mysquads-player-list">
            {bench.map((p, i) => (
              <div key={i} className="mysquads-player-row bench">
                <span className="mysquads-player-pos">{p.pos}</span>
                <span className="mysquads-player-name">{p.name}</span>
                <span className="mysquads-player-rating" style={{ color: getRatingColor(p.rating) }}>{p.rating}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mysquads-delete-area">
        {confirming ? (
          <>
            <span className="mysquads-confirm-text">Delete this squad?</span>
            <button className="sim-btn secondary" onClick={() => setConfirming(false)}>CANCEL</button>
            <button className="sim-btn danger-btn" onClick={onDelete}>DELETE</button>
          </>
        ) : (
          <button className="sim-btn secondary" onClick={() => setConfirming(true)}>✕ DELETE SQUAD</button>
        )}
      </div>
    </div>
  );
}

export default function MySquadsScreen({ loadSquads, deleteSquad, onBack }) {
  const [squads,  setSquads]  = useState(null); // null = loading
  const [viewing, setViewing] = useState(null);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    loadSquads()
      .then(setSquads)
      .catch(() => setError("Failed to load squads."));
  }, []);

  async function handleDelete(id) {
    try {
      await deleteSquad(id);
      setSquads(prev => prev.filter(s => s.id !== id));
      setViewing(null);
    } catch {
      setError("Failed to delete.");
    }
  }

  if (viewing) {
    return (
      <div className="mysquads-screen">
        <SquadDetail
          squad={viewing}
          onClose={() => setViewing(null)}
          onDelete={() => handleDelete(viewing.id)}
        />
      </div>
    );
  }

  return (
    <div className="mysquads-screen">
      <div className="mysquads-box">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <div className="mysquads-title">MY SQUADS</div>

        {error && <div className="profile-error">{error}</div>}

        {squads === null && <div className="mysquads-empty">Loading…</div>}

        {squads?.length === 0 && (
          <div className="mysquads-empty">No saved squads yet. Complete a draft and save your team!</div>
        )}

        {squads?.length > 0 && (
          <div className="mysquads-list">
            {squads.map(s => (
              <button key={s.id} className="mysquads-row" onClick={() => setViewing(s)}>
                <KitSwatch primary={s.primaryColor} secondary={s.secondaryColor} pattern={s.pattern} uid={s.id} size={28} />
                <div className="mysquads-row-info">
                  <span className="mysquads-row-name">{s.clubName}</span>
                  <span className="mysquads-row-meta">{s.mode} · {formatDate(s.savedAt)}</span>
                </div>
                <span className="mysquads-row-rating" style={{ color: getRatingColor(s.rating) }}>{s.rating}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import KitSwatch from "./KitSwatch";
import { getRatingBg, getRatingColor } from "../data/players";

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Colour for the big club OVR number (tiered, jersey-gold at the top end).
function ovrColor(r) {
  if (r >= 85) return "var(--bw-gold)";
  if (r >= 75) return "var(--bw-line-mid-text)";
  if (r >= 65) return "var(--bw-line-def-text)";
  return "var(--bw-text-mid)";
}

// Jersey-style position colours — matches the converted pitch / squad screens.
function lineColors(pos) {
  if (pos === "GK") return { bg: "var(--bw-line-gk)", text: "var(--bw-line-gk-ink)" };
  if (["RB", "LB", "CB", "WB", "DEF"].includes(pos)) return { bg: "var(--bw-line-def)", text: "#fff" };
  if (["ST", "RW", "LW", "ATT"].includes(pos)) return { bg: "var(--bw-line-att)", text: "#fff" };
  return { bg: "var(--bw-line-mid)", text: "#fff" };
}

function PlayerRow({ p, bench }) {
  const lc = lineColors(p.pos);
  return (
    <div className={`bw-mysq-prow ${bench ? "bench" : ""}`}>
      <span className="bw-mysq-pos" style={{ background: lc.bg, color: lc.text }}>{p.pos}</span>
      <span className="bw-mysq-pname">{p.name}</span>
      <span className="bw-mysq-prating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</span>
    </div>
  );
}

function SquadDetail({ squad, onClose, onDelete }) {
  const starters = squad.squad.slice(0, 11).filter(Boolean);
  const bench    = squad.squad.slice(11).filter(Boolean);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-topbar">
          <button className="bw-back-link" onClick={onClose}>← BACK</button>
          <span className="bw-screen-badge">SQUAD</span>
        </div>

        <div className="bw-body">
          <div className="bw-mysq-detail-header">
            <KitSwatch primary={squad.primaryColor} secondary={squad.secondaryColor} pattern={squad.pattern} uid="sd" size={40} />
            <div className="bw-mysq-detail-names">
              <div className="bw-mysq-detail-name">{squad.clubName}</div>
              <div className="bw-mysq-detail-meta">{squad.dofName} · {squad.mode} · {formatDate(squad.savedAt)}</div>
            </div>
            <div className="bw-mysq-detail-rating" style={{ color: ovrColor(squad.rating) }}>{squad.rating}</div>
          </div>

          {squad.footballManager?.name && (
            <div className="bw-mysq-manager">
              ⚙ {squad.footballManager.name}
              {squad.footballManager.styleLabel && ` — ${squad.footballManager.styleLabel}`}
            </div>
          )}

          <div className="bw-mysq-section">STARTING XI — {squad.formation}</div>
          <div className="bw-mysq-players">
            {starters.map((p, i) => <PlayerRow key={i} p={p} />)}
          </div>

          {bench.length > 0 && (
            <>
              <div className="bw-mysq-section">BENCH</div>
              <div className="bw-mysq-players">
                {bench.map((p, i) => <PlayerRow key={i} p={p} bench />)}
              </div>
            </>
          )}

          <div className="bw-mysq-delete-area">
            {confirming ? (
              <>
                <span className="bw-mysq-confirm-text">Delete this squad?</span>
                <button className="bw-mysq-del-btn" onClick={() => setConfirming(false)}>CANCEL</button>
                <button className="bw-mysq-del-btn danger" onClick={onDelete}>DELETE</button>
              </>
            ) : (
              <button className="bw-mysq-del-btn danger" onClick={() => setConfirming(true)}>✕ DELETE SQUAD</button>
            )}
          </div>
        </div>
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
      <SquadDetail
        squad={viewing}
        onClose={() => setViewing(null)}
        onDelete={() => handleDelete(viewing.id)}
      />
    );
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-mysq-list-frame">
        <div className="bw-topbar">
          <button className="bw-back-link" onClick={onBack}>← BACK</button>
          <span className="bw-screen-badge">MY SQUADS</span>
        </div>

        <div className="bw-body">
          {error && <p className="bw-validation">{error}</p>}

          {squads === null && <div className="bw-mysq-empty">Loading…</div>}

          {squads?.length === 0 && (
            <div className="bw-mysq-empty">No saved squads yet. Complete a draft and save your team!</div>
          )}

          {squads?.length > 0 && (
            <div className="bw-mysq-list">
              {squads.map(s => (
                <button key={s.id} className="bw-mysq-row" onClick={() => setViewing(s)}>
                  <KitSwatch primary={s.primaryColor} secondary={s.secondaryColor} pattern={s.pattern} uid={s.id} size={28} />
                  <div className="bw-mysq-row-info">
                    <span className="bw-mysq-row-name">{s.clubName}</span>
                    <span className="bw-mysq-row-meta">
                      {s.footballManager?.name && `⚙ ${s.footballManager.name} · `}
                      {s.mode} · {formatDate(s.savedAt)}
                    </span>
                  </div>
                  <span className="bw-mysq-row-rating" style={{ color: ovrColor(s.rating) }}>{s.rating}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

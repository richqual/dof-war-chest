import { useState, useEffect } from "react";
import KitSwatch, { kitAccent } from "./KitSwatch";

function DrawClub({ mgr, uid }) {
  const accent = kitAccent(mgr.primaryColor, mgr.secondaryColor);
  return (
    <div className="draw-club drawn">
      <KitSwatch primary={mgr.primaryColor} secondary={mgr.secondaryColor} pattern={mgr.pattern} uid={uid} size={44} />
      <span className="draw-club-name" style={{ color: accent }}>{mgr.teamName || mgr.clubName || mgr.name}</span>
    </div>
  );
}

function DrawSlot({ mgr, uid, revealed }) {
  return (
    <div className={`draw-slot ${revealed ? "revealed" : ""}`}>
      {revealed ? <DrawClub mgr={mgr} uid={uid} /> : <div className="draw-slot-unknown">?</div>}
    </div>
  );
}

export default function DrawScreen({ draft, onComplete }) {
  const { managers } = draft;
  const n = managers.length; // 4 or 8
  const numPairings = n / 2; // 2 or 4
  const is8 = n === 8;

  // Generate the shuffled draw order once on mount
  const [drawOrder] = useState(() => {
    const arr = managers.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  // phase: "intro" → "drawing" → "done"
  const [phase, setPhase] = useState("intro");
  const [revealed, setRevealed] = useState(0); // 0–n

  useEffect(() => {
    if (phase !== "drawing") return;
    if (revealed >= n) { setPhase("done"); return; }
    const delay = revealed === 0 ? 600 : 1400;
    const t = setTimeout(() => setRevealed(r => r + 1), delay);
    return () => clearTimeout(t);
  }, [phase, revealed, n]);

  function startDraw() {
    setRevealed(0);
    setPhase("drawing");
  }

  const roundLabel = is8 ? "QUARTER-FINAL" : "SEMI-FINAL";
  const subText = is8
    ? "Single-leg quarter-finals · 2-legged semi-finals · 1-leg Grand Final"
    : "Semi-finals: 2 legs (aggregate) · Grand Final: 1 leg";

  return (
    <div className="draw-screen">
      <div className="draw-header">
        <div className="setup-badge">🎩 THE DRAW</div>
        <h2 className="draw-title">TOURNAMENT DRAW</h2>
        <p className="draw-sub">{subText}</p>
      </div>

      <div className={`draw-bracket ${is8 ? "draw-bracket-8" : ""}`}>
        {Array.from({ length: numPairings }, (_, pi) => {
          const slotA = pi * 2;
          const slotB = pi * 2 + 1;
          return (
            <div key={pi} className="draw-semi">
              <div className="draw-semi-label">{roundLabel} {pi + 1}</div>
              <DrawSlot mgr={managers[drawOrder[slotA]]} uid={`d${slotA}`} revealed={revealed > slotA} />
              <div className="draw-vs">VS</div>
              <DrawSlot mgr={managers[drawOrder[slotB]]} uid={`d${slotB}`} revealed={revealed > slotB} />
            </div>
          );
        })}
      </div>

      {phase === "intro" && (
        <div className="draw-action">
          <button className="sim-btn" onClick={startDraw}>🎩 MAKE THE DRAW</button>
        </div>
      )}

      {phase === "drawing" && (
        <div className="draw-action draw-suspense">
          <span className="draw-drum">♩ ♩ ♩</span>
        </div>
      )}

      {phase === "done" && (
        <div className="draw-action">
          <p className="draw-complete-text">
            The draw has been made. Let battle commence.
          </p>
          <button className="sim-btn" onClick={() => onComplete(drawOrder)}>
            ▶ BEGIN TOURNAMENT
          </button>
        </div>
      )}
    </div>
  );
}

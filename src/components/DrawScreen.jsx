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
  const [revealed, setRevealed] = useState(0); // 0–4

  useEffect(() => {
    if (phase !== "drawing") return;
    if (revealed >= 4) { setPhase("done"); return; }
    const delay = revealed === 0 ? 600 : 1400;
    const t = setTimeout(() => setRevealed(r => r + 1), delay);
    return () => clearTimeout(t);
  }, [phase, revealed]);

  function startDraw() {
    setRevealed(0);
    setPhase("drawing");
  }

  return (
    <div className="draw-screen">
      <div className="draw-header">
        <div className="setup-badge">🎩 THE DRAW</div>
        <h2 className="draw-title">TOURNAMENT DRAW</h2>
        <p className="draw-sub">Semi-finals: Best of 3 &nbsp;·&nbsp; Grand Final: Best of 5</p>
      </div>

      <div className="draw-bracket">
        {/* Semi-Final 1 */}
        <div className="draw-semi">
          <div className="draw-semi-label">SEMI-FINAL 1</div>
          <DrawSlot mgr={managers[drawOrder[0]]} uid="d0" revealed={revealed >= 1} />
          <div className="draw-vs">VS</div>
          <DrawSlot mgr={managers[drawOrder[1]]} uid="d1" revealed={revealed >= 2} />
        </div>

        <div className="draw-divider">⚔</div>

        {/* Semi-Final 2 */}
        <div className="draw-semi">
          <div className="draw-semi-label">SEMI-FINAL 2</div>
          <DrawSlot mgr={managers[drawOrder[2]]} uid="d2" revealed={revealed >= 3} />
          <div className="draw-vs">VS</div>
          <DrawSlot mgr={managers[drawOrder[3]]} uid="d3" revealed={revealed >= 4} />
        </div>
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

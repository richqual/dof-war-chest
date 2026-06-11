import { useState, useEffect, useRef } from "react";
import { MANAGERS, TIER_LABELS, TIER_COLORS, TIER_BG } from "../data/managers";
import { ERA_LABELS, ERA_COLORS, ERA_BG } from "../data/players";

const TIER_SEAT_COLORS = { elite: "#ffd700", established: "#aaaaaa", journeyman: "#cd7f32" };

function MerryGoRound({ pool, spinning }) {
  const NUM_SEATS = 12;
  const seats = pool.slice(0, NUM_SEATS);
  const radius = 90;
  const cx = 120, cy = 120;
  const angleRef = useRef(0);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Speed: fast when spinning, decelerates to crawl, stops after ~1200ms
    let speed = spinning ? 8 : 0;
    let startTime = performance.now();
    const SPIN_DURATION = 1150; // ms before cards reveal

    function draw(now) {
      const elapsed = now - startTime;
      if (spinning) {
        // Ease-out: fast start, slow down over SPIN_DURATION
        const t = Math.min(elapsed / SPIN_DURATION, 1);
        speed = 8 * (1 - t * t); // quadratic ease-out
        angleRef.current += speed;
      }

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Outer ring shadow
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
      ctx.restore();

      // Spokes
      for (let i = 0; i < NUM_SEATS; i++) {
        const angle = (angleRef.current + (i * 360) / NUM_SEATS) * (Math.PI / 180);
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = "rgba(212,255,212,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Center hub
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();

      // Seats
      for (let i = 0; i < NUM_SEATS; i++) {
        const angle = (angleRef.current + (i * 360) / NUM_SEATS) * (Math.PI / 180);
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius;
        const mgr = seats[i % seats.length];
        const col = mgr ? TIER_SEAT_COLORS[mgr.tier] : "#3a6a3a";

        // Seat circle
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Initial letter
        if (mgr) {
          ctx.fillStyle = "#000";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(mgr.name.split(" ").pop()[0], sx, sy);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning, pool]);

  return (
    <div className="mgr-carousel-wrap">
      <canvas ref={canvasRef} width={240} height={240} className="mgr-carousel-canvas" />
      <div className="mgr-carousel-label">
        {spinning ? "⚙ THE MERRY-GO-ROUND SPINS..." : ""}
      </div>
    </div>
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ManagerCard({ manager, onPick, disabled }) {
  const tierColor = TIER_COLORS[manager.tier];
  const tierBg = TIER_BG[manager.tier];
  const eraColor = ERA_COLORS[manager.era];
  const eraBg = ERA_BG[manager.era];

  return (
    <div className="mgr-card">
      <div className="mgr-card-head">
        <span
          className="era-badge"
          style={{ background: eraBg, color: eraColor, border: `1px solid ${eraColor}55` }}
        >
          {ERA_LABELS[manager.era]}
        </span>
        <span
          className="mgr-tier-badge"
          style={{ background: tierBg, color: tierColor, border: `1px solid ${tierColor}88` }}
        >
          {TIER_LABELS[manager.tier]}
        </span>
      </div>

      <div className="mgr-name">{manager.name}</div>
      <div className="mgr-club">{manager.club}</div>
      <div className="mgr-years">{manager.years}</div>

      <div className="mgr-style-label">{manager.styleLabel}</div>
      <div className="mgr-flavour">"{manager.flavourText}"</div>

      <button
        className="pick-mgr-btn"
        onClick={() => onPick(manager)}
        disabled={disabled}
      >
        PICK THIS MANAGER
      </button>
    </div>
  );
}

export default function ManagerDraftScreen({ draft, onAssignManager }) {
  // Build pick order (random) and remaining pool on mount
  const [pickOrder] = useState(() => shuffle(draft.managers.map((_, i) => i)));
  const [pool, setPool] = useState(() => shuffle([...MANAGERS]));
  const [turnIdx, setTurnIdx] = useState(0);
  const [offered, setOffered] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [assignments, setAssignments] = useState({});

  const currentManagerIdx = pickOrder[turnIdx];
  const currentManager = draft.managers[currentManagerIdx];
  const allDone = turnIdx >= pickOrder.length;

  function spinAndReveal() {
    setSpinning(true);
    setTimeout(() => {
      const three = pool.slice(0, 3);
      setOffered(three);
      setSpinning(false);
    }, 1200);
  }

  useEffect(() => {
    if (!allDone && offered === null && !spinning) {
      spinAndReveal();
    }
  }, [turnIdx]);

  function handlePick(manager) {
    // Remove only the picked manager from the pool; return the other two
    const newPool = pool.filter(m => m.id !== manager.id);
    setPool(shuffle(newPool));

    const newAssignments = { ...assignments, [currentManagerIdx]: manager };
    setAssignments(newAssignments);

    const nextTurn = turnIdx + 1;
    if (nextTurn >= pickOrder.length) {
      // All done — commit
      onAssignManager(newAssignments);
    } else {
      setTurnIdx(nextTurn);
      setOffered(null);
    }
  }

  if (allDone) return null;

  const isHuman = !currentManager.isComputer;
  const playerName = currentManager.dofName || currentManager.name;

  return (
    <div className="mgr-draft-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
        <div className="mgr-draft-sub">Manager Draft — Round {turnIdx + 1} of {pickOrder.length}</div>
      </div>

      <div className="mgr-turn-banner">
        <span className="mgr-turn-label">
          {isHuman ? `${playerName}, choose your manager` : `${playerName} is picking...`}
        </span>
        <div className="mgr-turn-dots">
          {pickOrder.map((idx, i) => (
            <span
              key={idx}
              className={`mgr-turn-dot ${i === turnIdx ? "active" : i < turnIdx ? "done" : ""}`}
              title={draft.managers[idx].dofName || draft.managers[idx].name}
            />
          ))}
        </div>
      </div>

      {(spinning || offered) && (
        <MerryGoRound pool={pool} spinning={spinning} />
      )}

      {!spinning && offered && (
        <>
          <div className="mgr-instruction">
            {isHuman
              ? "Three managers have been offered. Pick one — the others return to the pool."
              : "Selecting automatically..."}
          </div>
          <div className="mgr-cards-row">
            {offered.map(mgr => (
              <ManagerCard
                key={mgr.id}
                manager={mgr}
                onPick={isHuman ? handlePick : () => {}}
                disabled={!isHuman}
              />
            ))}
          </div>
          {!isHuman && (
            <CpuPick offered={offered} onPick={handlePick} />
          )}
        </>
      )}
    </div>
  );
}

// Auto-picks after a short delay for CPU players
function CpuPick({ offered, onPick }) {
  useEffect(() => {
    const t = setTimeout(() => {
      // CPU prefers elite > established > journeyman
      const sorted = [...offered].sort((a, b) => {
        const order = { elite: 0, established: 1, journeyman: 2 };
        return order[a.tier] - order[b.tier];
      });
      onPick(sorted[0]);
    }, 1000);
    return () => clearTimeout(t);
  }, [offered]);
  return null;
}

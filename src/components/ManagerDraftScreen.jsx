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

function ManagerCard({ manager, onPick, disabled, highlighted }) {
  const tierColor = TIER_COLORS[manager.tier];
  const tierBg = TIER_BG[manager.tier];
  const eraColor = ERA_COLORS[manager.era];
  const eraBg = ERA_BG[manager.era];

  return (
    <div className={`mgr-card ${highlighted ? "mgr-card-highlighted" : ""}`}>
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

// The running log of picks made so far
function PicksLog({ assignments, draft }) {
  const entries = Object.entries(assignments);
  if (!entries.length) return null;
  return (
    <div className="mgr-picks-log">
      <div className="mgr-picks-log-title">PICKS SO FAR</div>
      {entries.map(([idx, mgr]) => {
        const club = draft.managers[idx];
        const tierColor = TIER_COLORS[mgr.tier];
        const tierBg = TIER_BG[mgr.tier];
        return (
          <div key={idx} className="mgr-picks-row">
            <span className="mgr-picks-club">{club.dofName || club.name}</span>
            <span className="mgr-picks-arrow">→</span>
            <span className="mgr-picks-name">{mgr.name}</span>
            <span
              className="mgr-tier-badge"
              style={{ background: tierBg, color: tierColor, border: `1px solid ${tierColor}88`, fontSize: "6px", padding: "1px 5px" }}
            >
              {TIER_LABELS[mgr.tier]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ManagerDraftScreen({ draft, onAssignManager }) {
  const [pickOrder] = useState(() => shuffle(draft.managers.map((_, i) => i)));
  const [pool, setPool] = useState(() => shuffle([...MANAGERS]));
  const [turnIdx, setTurnIdx] = useState(0);
  const [offered, setOffered] = useState(null);       // all 3 selected managers
  const [revealed, setRevealed] = useState(0);        // how many cards are visible (0→3)
  const [cpuPick, setCpuPick] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [assignments, setAssignments] = useState({});

  const currentManagerIdx = pickOrder[turnIdx];
  const currentManager = draft.managers[currentManagerIdx];
  const allDone = turnIdx >= pickOrder.length;

  function spinAndReveal() {
    setSpinning(true);
    setCpuPick(null);
    setRevealed(0);
    setTimeout(() => {
      const three = pool.slice(0, 3);
      setOffered(three);
      setSpinning(false);
      // Reveal cards one by one: 1st immediately, 2nd +600ms, 3rd +1200ms
      setTimeout(() => setRevealed(1), 0);
      setTimeout(() => setRevealed(2), 600);
      setTimeout(() => setRevealed(3), 1200);
    }, 1200);
  }

  useEffect(() => {
    if (!allDone && offered === null && !spinning) {
      spinAndReveal();
    }
  }, [turnIdx]);

  // CPU highlights its pick 600ms after all cards are revealed — never auto-advances.
  useEffect(() => {
    if (!offered || currentManager.isComputer === false) return;
    const sorted = [...offered].sort((a, b) => {
      const order = { elite: 0, established: 1, journeyman: 2 };
      return order[a.tier] - order[b.tier];
    });
    const t = setTimeout(() => setCpuPick(sorted[0]), 1800); // 1200ms reveal + 600ms pause
    return () => clearTimeout(t);
  }, [offered, currentManagerIdx]);

  function handlePick(manager) {
    const newPool = pool.filter(m => m.id !== manager.id);
    setPool(shuffle(newPool));
    setCpuPick(null);
    setRevealed(0);

    const newAssignments = { ...assignments, [currentManagerIdx]: manager };
    setAssignments(newAssignments);

    const nextTurn = turnIdx + 1;
    if (nextTurn >= pickOrder.length) {
      onAssignManager(newAssignments);
    } else {
      setTurnIdx(nextTurn);
      setOffered(null);
    }
  }

  function confirmCpuPick() {
    if (cpuPick) handlePick(cpuPick);
  }

  if (allDone) return null;

  const isHuman = !currentManager.isComputer;
  const playerName = currentManager.dofName || currentManager.name;
  const cpuReady = !isHuman && !!cpuPick && revealed >= 3;

  return (
    <div className="mgr-draft-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
        <div className="mgr-draft-sub">Manager Draft — Round {turnIdx + 1} of {pickOrder.length}</div>
      </div>

      <div className="mgr-turn-banner">
        <span className="mgr-turn-label">
          {isHuman
            ? `${playerName}, choose your manager`
            : cpuReady
              ? `${playerName} has chosen — confirm to continue`
              : `${playerName} is deliberating...`}
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

      <div className="mgr-main-area">
        <div className="mgr-left-col">
          {(spinning || offered) && (
            <MerryGoRound pool={pool} spinning={spinning} />
          )}

          {!spinning && offered && (
            <>
              <div className="mgr-instruction">
                {isHuman
                  ? "Three managers have been offered. Pick one — the others return to the pool."
                  : cpuReady
                    ? `${playerName} picks ${cpuPick.name}.`
                    : "Deliberating..."}
              </div>
              <div className="mgr-cards-row">
                {offered.slice(0, revealed).map(mgr => (
                  <ManagerCard
                    key={mgr.id}
                    manager={mgr}
                    onPick={isHuman ? handlePick : () => {}}
                    disabled={!isHuman || revealed < 3}
                    highlighted={cpuPick?.id === mgr.id}
                  />
                ))}
              </div>
              {!isHuman && (
                <button
                  className={`mgr-next-btn ${cpuReady ? "ready" : "waiting"}`}
                  onClick={confirmCpuPick}
                  disabled={!cpuReady}
                >
                  {cpuReady ? "CONFIRM & NEXT →" : "DELIBERATING..."}
                </button>
              )}
            </>
          )}
        </div>

        <PicksLog assignments={assignments} draft={draft} />
      </div>
    </div>
  );
}

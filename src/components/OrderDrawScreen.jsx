import { useState, useEffect } from "react";
import KitSwatch from "./KitSwatch";

function ordinal(n) {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

const BALL_SIZE = 66;
const CELL_GAP  = 18;

function makeBallPositions(n) {
  const COLS = n <= 4 ? 2 : 4;
  const ROWS = Math.ceil(n / COLS);
  const CELL = BALL_SIZE + CELL_GAP;
  const JITTER = 8;

  // Create one slot per grid cell, shuffle them, assign first n to balls
  const slots = Array.from({ length: COLS * ROWS }, (_, i) => ({
    col: i % COLS,
    row: Math.floor(i / COLS),
  }));
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return {
    positions: Array.from({ length: n }, (_, i) => ({
      left: slots[i].col * CELL + (Math.random() - 0.5) * JITTER,
      top:  slots[i].row  * CELL + (Math.random() - 0.5) * JITTER,
      rot:  (Math.random() - 0.5) * 22,
    })),
    bowlW: COLS * CELL + 28,
    bowlH: ROWS * CELL + 28,
  };
}

export default function OrderDrawScreen({ draft, onStart }) {
  const { managers, currentOrder } = draft;
  const n = managers.length;

  const positionForManager = (mIdx) => currentOrder.indexOf(mIdx) + 1;
  const roundPositionForManager = (mIdx, round) => {
    if (round === 1) return currentOrder.indexOf(mIdx) + 1;
    return (mIdx - (round - 1) + n * 100) % n + 1;
  };

  const [pickStep, setPickStep]       = useState(0);
  const [phase, setPhase]             = useState("waiting");
  const [currentReveal, setCurrentReveal] = useState(null);
  const [completedDraws, setCompletedDraws] = useState([]);

  // Pre-compute scattered positions once per render so they don't shift
  const [layout] = useState(() => makeBallPositions(n));

  const curMIdx    = pickStep < n ? pickStep : null;
  const curManager = curMIdx !== null ? managers[curMIdx] : null;
  const isHumanTurn = !!(curManager && !curManager.isComputer);

  // CPU auto-draw
  useEffect(() => {
    if (phase !== "waiting" || curMIdx === null || isHumanTurn) return;
    const t = setTimeout(() => triggerDraw(Math.floor(Math.random() * n)), 1300);
    return () => clearTimeout(t);
  }, [pickStep, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerDraw(ballIdx) {
    const mIdx = pickStep;
    const pos  = positionForManager(mIdx);
    setPhase("drawing");
    setCurrentReveal({ mIdx, ballIdx, pos });

    const t1 = setTimeout(() => setPhase("revealed"), 800);
    const t2 = setTimeout(() => {
      setCompletedDraws(prev => [...prev, { mIdx, ballIdx, pos }]);
      setCurrentReveal(null);
      const next = mIdx + 1;
      if (next >= n) {
        setPhase("summary");
      } else {
        setPickStep(next);
        setPhase("waiting");
      }
    }, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }

  const drawnBalls  = new Set(completedDraws.map(d => d.ballIdx));
  const roundsToShow = n <= 2 ? 2 : 4;

  /* ── SUMMARY ─────────────────────────────────────────────────── */
  if (phase === "summary") {
    return (
      <div className="order-draw-screen">
        <div className="order-draw-box order-draw-box-wide">
          <div className="order-draw-title">DRAFT ORDER SET</div>

          <div className="order-draw-list">
            {currentOrder.map((mIdx, i) => {
              const m = managers[mIdx];
              return (
                <div key={i} className="order-draw-row visible">
                  <span className="order-draw-num">{ordinal(i + 1)}</span>
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`s-${i}`} size={22} />
                  <span className="order-draw-club">{m.clubName || m.name}</span>
                  {m.isComputer && <span className="cpu-tag">CPU</span>}
                </div>
              );
            })}
          </div>

          {managers.some(m => !m.isComputer) && (
            <div className="draw-schedule">
              <div className="draw-schedule-title">YOUR PICK SCHEDULE</div>
              {managers.filter(m => !m.isComputer).map(m => (
                <div key={m.id} className="draw-schedule-row">
                  <div className="draw-schedule-club">
                    <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`sc-${m.id}`} size={18} />
                    <span>{m.clubName || m.name}</span>
                  </div>
                  <div className="draw-schedule-rounds">
                    {Array.from({ length: roundsToShow }, (_, r) => (
                      <div key={r} className="draw-rnd-tag">
                        <span className="draw-rnd-label">R{r + 1}</span>
                        <span className="draw-rnd-pos">{ordinal(roundPositionForManager(m.id, r + 1))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="tt-continue-btn order-draw-go" onClick={onStart}>▶ START DRAFT</button>
        </div>
      </div>
    );
  }

  /* ── PICKING SCREEN ──────────────────────────────────────────── */
  return (
    <div className="order-draw-screen">
      <div className="order-draw-box">
        <div className="order-draw-title">DRAFT ORDER DRAW</div>

        {curManager && (
          <div className="draw-picker-row">
            <KitSwatch primary={curManager.primaryColor} secondary={curManager.secondaryColor} pattern={curManager.pattern || "plain"} uid="cur" size={24} />
            <span className="draw-picker-name">{curManager.clubName || curManager.name}</span>
            {curManager.isComputer && <span className="cpu-tag">CPU</span>}
          </div>
        )}

        <div className="draw-picker-instruction">
          {phase === "waiting"  && isHumanTurn  && "Reach in and pick your ball"}
          {phase === "waiting"  && !isHumanTurn && "CPU is drawing…"}
          {phase === "drawing"  && "Drawing…"}
          {phase === "revealed" && currentReveal && (
            <span>draws <span className="draw-reveal-pos">{ordinal(currentReveal.pos)} pick!</span></span>
          )}
        </div>

        {/* Bowl */}
        <div
          className="draw-bowl"
          style={{ width: layout.bowlW, height: layout.bowlH }}
        >
          {Array.from({ length: n }, (_, i) => {
            const isDone     = drawnBalls.has(i);
            const isCurrent  = currentReveal?.ballIdx === i;
            const isSpinning = isCurrent && phase === "drawing";
            const isFlipped  = isCurrent && phase === "revealed";
            const canClick   = phase === "waiting" && isHumanTurn && !isDone;
            const pos        = layout.positions[i];

            let ballLabel = "?";
            if (isFlipped && currentReveal) ballLabel = ordinal(currentReveal.pos);
            else if (isDone) {
              const cd = completedDraws.find(d => d.ballIdx === i);
              ballLabel = cd ? ordinal(cd.pos) : "?";
            }

            return (
              <div
                key={i}
                className={[
                  "draw-ball",
                  canClick    ? "draw-ball-available" : "",
                  isSpinning  ? "draw-ball-spinning"  : "",
                  isFlipped   ? "draw-ball-flipped"   : "",
                  isDone && !isCurrent ? "draw-ball-done" : "",
                ].filter(Boolean).join(" ")}
                style={{
                  left: pos.left + 14,
                  top:  pos.top  + 14,
                  // Don't rotate while spinning/revealed — animation handles that
                  transform: (isSpinning || isFlipped || isDone) ? undefined : `rotate(${pos.rot}deg)`,
                }}
                onClick={canClick ? () => triggerDraw(i) : undefined}
              >
                {ballLabel}
              </div>
            );
          })}
        </div>

        {/* Drawn so far */}
        {completedDraws.length > 0 && (
          <div className="draw-results">
            <div className="draw-results-label">DRAWN SO FAR</div>
            {[...completedDraws]
              .sort((a, b) => a.pos - b.pos)
              .map(({ mIdx, pos }) => {
                const m = managers[mIdx];
                return (
                  <div key={mIdx} className="draw-result-row">
                    <span className="order-draw-num">{ordinal(pos)}</span>
                    <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`r-${mIdx}`} size={18} />
                    <span className="order-draw-club">{m.clubName || m.name}</span>
                    {m.isComputer && <span className="cpu-tag">CPU</span>}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

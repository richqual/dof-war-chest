import { useState, useEffect, useRef } from "react";
import KitSwatch from "./KitSwatch";

function ordinal(n) {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

/* Scatter ball positions inside the bowl */
function makeBallPositions(n) {
  const BALL = 58;
  const PAD  = 10;
  const COLS = n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const ROWS = Math.ceil(n / COLS);
  const JITTER = 6;
  const STEP = BALL + 10;

  const slots = Array.from({ length: n }, (_, i) => ({
    col: i % COLS,
    row: Math.floor(i / COLS),
  }));
  // shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return {
    positions: slots.map(() => ({
      x: Math.random() * JITTER - JITTER / 2,
      y: Math.random() * JITTER - JITTER / 2,
    })),
    cols: COLS,
    rows: ROWS,
    step: STEP,
    pad: PAD,
    ball: BALL,
    bowlW: COLS * STEP + PAD * 2,
    bowlH: ROWS * STEP + PAD * 2,
  };
}

/* Compute pick position in a given display round (snake draft) */
function pickPosition(managerId, displayRound, initialOrder, n) {
  const forwardPos = initialOrder.indexOf(managerId) + 1; // 1-indexed position in R1
  // Odd rounds = forward order, even rounds = reversed
  if (displayRound % 2 === 1) return forwardPos;
  return n + 1 - forwardPos;
}

export default function OrderDrawScreen({ draft, onStart }) {
  const { managers, currentOrder } = draft;
  const n = managers.length;

  // Stable scattered positions (don't recompute on re-render)
  const [layout] = useState(() => makeBallPositions(n));

  // availableBalls: indices not yet drawn
  const [availableBalls, setAvailableBalls] = useState(() =>
    Array.from({ length: n }, (_, i) => i)
  );

  // pickStep: which manager is currently drawing (0-indexed)
  const [pickStep, setPickStep] = useState(0);
  const [phase, setPhase]       = useState("waiting"); // waiting | drawing | revealed | summary
  const [revealInfo, setRevealInfo]   = useState(null); // { mIdx, ballIdx, pos }
  const [completedDraws, setCompletedDraws] = useState([]); // [{ mIdx, ballIdx, pos }]

  const timers = useRef([]);
  function addTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const curMIdx    = pickStep < n ? pickStep : null;
  const curManager = curMIdx !== null ? managers[curMIdx] : null;
  const isHumanTurn = !!(curManager && !curManager.isComputer);

  // CPU auto-draw
  useEffect(() => {
    if (phase !== "waiting" || curMIdx === null || isHumanTurn) return;
    const t = addTimer(() => {
      if (availableBalls.length === 0) return;
      const randIdx = Math.floor(Math.random() * availableBalls.length);
      triggerDraw(availableBalls[randIdx]);
    }, 1300);
    return () => clearTimeout(t);
  }, [pickStep, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerDraw(ballIdx) {
    if (phase !== "waiting") return;
    const mIdx = pickStep;
    const pos  = currentOrder.indexOf(mIdx) + 1;

    setAvailableBalls(prev => prev.filter(b => b !== ballIdx));
    setPhase("drawing");
    setRevealInfo({ mIdx, ballIdx, pos });

    addTimer(() => setPhase("revealed"), 700);
    addTimer(() => {
      setCompletedDraws(prev => [...prev, { mIdx, ballIdx, pos }]);
      setRevealInfo(null);
      const next = mIdx + 1;
      if (next >= n) {
        setPhase("summary");
      } else {
        setPickStep(next);
        setPhase("waiting");
      }
    }, 2500);
  }

  // Skip to end: instantly assign all remaining picks and go to summary
  function skipToEnd() {
    // Clear all pending timers
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Build complete draws: start from what's already done
    const alreadyDrawn = new Set(completedDraws.map(d => d.ballIdx));
    let remaining = Array.from({ length: n }, (_, i) => i).filter(i => !alreadyDrawn.has(i));

    // Shuffle remaining balls
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    const newDraws = [...completedDraws];
    let ballPool = [...remaining];
    const startStep = revealInfo
      ? pickStep  // if mid-draw, current pick not yet committed
      : completedDraws.length;

    // If we're mid-reveal, include that pick too
    if (revealInfo && phase !== "waiting") {
      newDraws.push({ mIdx: revealInfo.mIdx, ballIdx: revealInfo.ballIdx, pos: revealInfo.pos });
      ballPool = ballPool.filter(b => b !== revealInfo.ballIdx);
    }

    for (let step = newDraws.length; step < n; step++) {
      const mIdx  = step;
      const pos   = currentOrder.indexOf(mIdx) + 1;
      const bIdx  = ballPool.shift();
      newDraws.push({ mIdx, ballIdx: bIdx, pos });
    }

    setCompletedDraws(newDraws);
    setRevealInfo(null);
    setAvailableBalls([]);
    setPickStep(n);
    setPhase("summary");
  }

  const drawnSet     = new Set(completedDraws.map(d => d.ballIdx));
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
                        <span className="draw-rnd-pos">{ordinal(pickPosition(m.id, r + 1, currentOrder, n))}</span>
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

        {/* Current team */}
        {curManager && (
          <div className="draw-current-team">
            <KitSwatch primary={curManager.primaryColor} secondary={curManager.secondaryColor} pattern={curManager.pattern || "plain"} uid="cur" size={26} />
            <div className="draw-current-info">
              <span className="draw-current-name">{curManager.clubName || curManager.name}</span>
              {curManager.isComputer && <span className="cpu-tag">CPU</span>}
            </div>
          </div>
        )}

        {/* Instruction */}
        <div className="draw-instruction">
          {phase === "waiting"  && isHumanTurn  && "Pick a ball from the bowl"}
          {phase === "waiting"  && !isHumanTurn && "CPU is drawing…"}
          {phase === "drawing"  && "Drawing…"}
          {phase === "revealed" && revealInfo && (
            <span>draws <span className="draw-reveal-pos">{ordinal(revealInfo.pos)} PICK!</span></span>
          )}
        </div>

        {/* Ball bowl */}
        <div className="draw-bowl-wrap">
          <div
            className="draw-bowl"
            style={{ width: layout.bowlW, height: layout.bowlH }}
          >
            {Array.from({ length: n }, (_, i) => {
              const isDrawn    = drawnSet.has(i);
              const isCurrent  = revealInfo?.ballIdx === i;
              const isSpinning = isCurrent && phase === "drawing";
              const isRevealed = isCurrent && phase === "revealed";
              const isAvail    = availableBalls.includes(i);
              const canClick   = phase === "waiting" && isHumanTurn && isAvail;

              const col = i % layout.cols;
              const row = Math.floor(i / layout.cols);
              const left = layout.pad + col * layout.step + layout.positions[i].x;
              const top  = layout.pad + row  * layout.step + layout.positions[i].y;

              let label = "?";
              if (isRevealed && revealInfo) label = ordinal(revealInfo.pos);
              else if (isDrawn) {
                const cd = completedDraws.find(d => d.ballIdx === i);
                label = cd ? ordinal(cd.pos) : "?";
              }

              return (
                <div
                  key={i}
                  className={[
                    "draw-ball",
                    canClick   ? "draw-ball-available"  : "",
                    isSpinning ? "draw-ball-spinning"   : "",
                    isRevealed ? "draw-ball-revealed"   : "",
                    isDrawn && !isCurrent ? "draw-ball-done" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ left, top, width: layout.ball, height: layout.ball }}
                  onClick={canClick ? () => triggerDraw(i) : undefined}
                >
                  {label}
                </div>
              );
            })}
          </div>
          {/* Elliptical bowl rim overlay */}
          <div className="draw-bowl-rim" style={{ width: layout.bowlW + 16, height: 18 }} />
        </div>

        {/* Skip to end */}
        <button className="sim-btn secondary order-draw-skip" onClick={skipToEnd}>
          ⏭ SKIP TO END
        </button>

        {/* Results so far */}
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
                    <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`r-${mIdx}`} size={16} />
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

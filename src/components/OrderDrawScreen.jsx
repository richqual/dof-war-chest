import { useState, useEffect, useRef } from "react";
import KitSwatch from "./KitSwatch";

function ordinal(n) {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
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

  // availableBalls: indices not yet drawn (purely theatrical — the pick each
  // manager receives is already fixed by currentOrder; which ball is clicked
  // never changes the outcome, it just choreographs the reveal)
  const [availableBalls, setAvailableBalls] = useState(() =>
    Array.from({ length: n }, (_, i) => i)
  );

  // pickStep: which manager is currently drawing (0-indexed)
  const [pickStep, setPickStep] = useState(0);
  const [phase, setPhase]       = useState("waiting"); // waiting | drawing | revealed | summary
  const [revealInfo, setRevealInfo]   = useState(null); // { mIdx, ballIdx, pos }
  const [nameRevealed, setNameRevealed] = useState(false); // lags the ball: club name fills into the list AFTER the ball shows its number
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
    setNameRevealed(false);

    addTimer(() => setPhase("revealed"), 700);
    // Ball has shown its number — fill the club name into the list a beat
    // later so the ball is read first, then the name drops into the order.
    addTimer(() => setNameRevealed(true), 1700);
    addTimer(() => {
      setCompletedDraws(prev => [...prev, { mIdx, ballIdx, pos }]);
      setRevealInfo(null);
      setNameRevealed(false);
      const next = mIdx + 1;
      if (next >= n) {
        setPhase("summary");
      } else {
        setPickStep(next);
        setPhase("waiting");
      }
    }, 2500);
  }

  function drawNextBall() {
    if (phase !== "waiting" || !isHumanTurn || availableBalls.length === 0) return;
    const randIdx = Math.floor(Math.random() * availableBalls.length);
    triggerDraw(availableBalls[randIdx]);
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

  const roundsToShow = n <= 2 ? 2 : 4;

  /* ── SUMMARY ─────────────────────────────────────────────────── */
  if (phase === "summary") {
    return (
      <div className="setup-screen">
        <div className="bw-frame">
          <div className="bw-banner">
            <div className="bw-banner-title">DRAFT ORDER SET</div>
          </div>
          <div className="bw-body">
            <div className="bw-pick-order-list">
              {currentOrder.map((mIdx, i) => {
                const m = managers[mIdx];
                return (
                  <div key={i} className="bw-pick-order-row">
                    <span className="bw-pick-order-num">{ordinal(i + 1)}</span>
                    <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`s-${i}`} size={20} />
                    <span className="bw-pick-order-club">{m.clubName || m.name}</span>
                    {m.isComputer && <span className="bw-badge-pill bw-badge-pill-cpu">CPU</span>}
                  </div>
                );
              })}
            </div>

            {managers.some(m => !m.isComputer) && (
              <div className="bw-draw-schedule">
                <div className="bw-field-label">YOUR PICK SCHEDULE</div>
                {managers.filter(m => !m.isComputer).map(m => (
                  <div key={m.id} className="bw-draw-schedule-row">
                    <div className="bw-draw-schedule-club">
                      <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`sc-${m.id}`} size={18} />
                      <span>{m.clubName || m.name}</span>
                    </div>
                    <div className="bw-draw-schedule-rounds">
                      {Array.from({ length: roundsToShow }, (_, r) => (
                        <div key={r} className="bw-draw-rnd-tag">
                          <span className="bw-draw-rnd-label">R{r + 1}</span>
                          <span className="bw-draw-rnd-pos">{ordinal(pickPosition(m.id, r + 1, currentOrder, n))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="bw-cta-arcade" style={{ marginTop: 14 }} onClick={onStart}>▶ START DRAFT</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── PICKING SCREEN ──────────────────────────────────────────── */
  return (
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-banner bw-banner-row">
          <span className="bw-banner-title">THE DRAW</span>
          <span className="bw-banner-meta">Ball {Math.min(pickStep + 1, n)} of {n}</span>
        </div>

        <div className="bw-draw-subtitle">
          {phase === "waiting" && isHumanTurn && "Pick a ball from the bowl"}
          {phase === "waiting" && !isHumanTurn && "CPU is drawing…"}
          {(phase === "drawing" || phase === "revealed") && revealInfo && (
            <>Drawing the <strong>{ordinal(revealInfo.pos)} pick</strong>…</>
          )}
        </div>

        <div className="bw-draw-stage">
          <div className="bw-draw-glow" />
          <div className={`bw-draw-hero ${phase === "drawing" ? "spinning" : ""}`}>
            <div className="bw-draw-hero-ball">
              <div className="bw-draw-hero-window">
                {phase === "revealed" && revealInfo ? ordinal(revealInfo.pos) : "?"}
              </div>
            </div>
          </div>
          {phase === "revealed" && revealInfo && (
            <div className="bw-draw-result-banner">
              <span className="bw-draw-result-pill">{ordinal(revealInfo.pos)} PICK</span>
            </div>
          )}
        </div>

        <div className="bw-body">
          <div className="bw-field-label" style={{ textAlign: "center" }}>STILL IN THE BOWL</div>
          <div className="bw-draw-bowl-row">
            {availableBalls.map(ballIdx => (
              <div key={ballIdx} className="bw-draw-mini-ball" />
            ))}
          </div>

          <div className="bw-field-label" style={{ marginTop: 16, textAlign: "center" }}>PICK ORDER</div>
          <div className="bw-pick-order-list">
            {currentOrder.map((mIdx, i) => {
              const pos = i + 1;
              const done = completedDraws.some(d => d.pos === pos);
              const isNow = revealInfo?.pos === pos;
              // Only show the club name once the ball has landed (nameRevealed),
              // so the list fills in just after the ball — never before it.
              const showName = done || (isNow && nameRevealed);
              const m = managers[mIdx];
              return (
                <div key={i} className={`bw-pick-order-row ${done ? "done" : isNow ? "now" : "pending"}`}>
                  <span className="bw-pick-order-num">{ordinal(pos)}</span>
                  {showName ? (
                    <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`po-${i}`} size={16} />
                  ) : (
                    <span className="bw-pick-order-swatch-placeholder" />
                  )}
                  <span className={`bw-pick-order-club ${!showName ? "pending" : ""}`}>
                    {showName ? (m.clubName || m.name) : "To be drawn"}
                  </span>
                  {done && <span className="bw-pick-order-check">✓</span>}
                  {isNow && <span className="bw-pick-order-now-tag">NOW</span>}
                </div>
              );
            })}
          </div>

          {isHumanTurn && phase === "waiting" && (
            <button className="bw-cta-arcade" style={{ marginTop: 12 }} onClick={drawNextBall}>
              DRAW NEXT BALL
            </button>
          )}
          <button className="bw-cta-secondary" style={{ marginTop: 8 }} onClick={skipToEnd}>
            ⏭ SKIP TO END
          </button>
        </div>
      </div>
    </div>
  );
}

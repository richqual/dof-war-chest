import { useState, useEffect } from "react";
import KitSwatch from "./KitSwatch";

function ordinal(n) {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

export default function OrderDrawScreen({ draft, onStart }) {
  const { managers, currentOrder } = draft;
  const n = managers.length;

  // currentOrder[i] = manager index who picks at position i+1 in round 1
  const positionForManager = (mIdx) => currentOrder.indexOf(mIdx) + 1;

  const roundPositionForManager = (mIdx, round) => {
    if (round === 1) return currentOrder.indexOf(mIdx) + 1;
    return (mIdx - (round - 1) + n * 100) % n + 1;
  };

  const [pickStep, setPickStep] = useState(0);
  const [phase, setPhase] = useState("waiting"); // "waiting"|"drawing"|"revealed"|"summary"
  const [currentReveal, setCurrentReveal] = useState(null); // { mIdx, ballIdx, pos }
  const [completedDraws, setCompletedDraws] = useState([]); // [{ mIdx, ballIdx, pos }]

  const curMIdx = pickStep < n ? pickStep : null;
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
    const pos = positionForManager(mIdx);
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

  const drawnBalls = new Set(completedDraws.map(d => d.ballIdx));
  const roundsToShow = n <= 2 ? 2 : 4;

  /* ── SUMMARY SCREEN ──────────────────────────────────────────── */
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

        {/* Current picker */}
        {curManager && (
          <div className="draw-picker-row">
            <KitSwatch primary={curManager.primaryColor} secondary={curManager.secondaryColor} pattern={curManager.pattern || "plain"} uid="cur" size={24} />
            <span className="draw-picker-name">{curManager.clubName || curManager.name}</span>
            {curManager.isComputer && <span className="cpu-tag">CPU</span>}
          </div>
        )}

        <div className="draw-picker-instruction">
          {phase === "waiting" && isHumanTurn && "Pick a ball from the bowl"}
          {phase === "waiting" && !isHumanTurn && "CPU is drawing…"}
          {phase === "drawing" && "Drawing…"}
          {phase === "revealed" && currentReveal && (
            <span>draws <span className="draw-reveal-pos">{ordinal(currentReveal.pos)} pick!</span></span>
          )}
        </div>

        {/* Bowl of balls */}
        <div className="draw-bowl">
          {Array.from({ length: n }, (_, i) => {
            const isDone = drawnBalls.has(i);
            const isCurrent = currentReveal?.ballIdx === i;
            const isSpinning = isCurrent && phase === "drawing";
            const isFlipped = isCurrent && phase === "revealed";
            const canClick = phase === "waiting" && isHumanTurn && !isDone;

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
                  canClick ? "draw-ball-available" : "",
                  isSpinning ? "draw-ball-spinning" : "",
                  isFlipped ? "draw-ball-flipped" : "",
                  isDone && !isCurrent ? "draw-ball-done" : "",
                ].filter(Boolean).join(" ")}
                onClick={canClick ? () => triggerDraw(i) : undefined}
              >
                {ballLabel}
              </div>
            );
          })}
        </div>

        {/* Human prompt button */}
        {phase === "waiting" && isHumanTurn && (
          <button
            className="draw-pick-btn"
            onClick={() => {
              const remaining = Array.from({ length: n }, (_, i) => i).filter(i => !drawnBalls.has(i));
              triggerDraw(remaining[Math.floor(Math.random() * remaining.length)]);
            }}
          >
            DRAW YOUR BALL
          </button>
        )}

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

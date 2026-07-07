import { useState, useEffect, useRef } from "react";
import KitSwatch from "./KitSwatch";
import { DRAFT_ROULETTE_ERAS, DRAFT_ROULETTE_LEAGUES } from "../hooks/draftUtils";

function findLabel(list, key) {
  return list.find(o => o.key === key)?.label ?? key;
}

function neighborsAt(list, idx) {
  const n = list.length;
  return {
    top: list[(idx - 1 + n) % n].label,
    mid: list[idx].label,
    bottom: list[(idx + 1) % n].label,
  };
}

// Fast blur, then a decelerating run of "clunks" through nearby options with
// growing gaps between each — a real fruit-machine reel losing momentum —
// converging exactly on the winner on the final tick.
const REEL_BLUR_MS = 480;
const REEL_DECEL_STEPS = [70, 100, 140, 200, 280, 400];
export const REEL_SPIN_MS = REEL_BLUR_MS + REEL_DECEL_STEPS.reduce((a, b) => a + b, 0);

// One mechanical reel: motion-blurred while spinning, then a slowing run of
// ticks past nearby labels before landing exactly on the winner. Stays on a
// gold "?" until it has actually landed, so the pre-set result isn't
// spoiled before the handle is pulled.
function Reel({ options, finalKey, spinning, done, divider }) {
  const n = options.length;
  const finalIdx = Math.max(0, options.findIndex(o => o.key === finalKey));
  const [tick, setTick] = useState(null); // null = idle/blurring, else decel step index
  const timersRef = useRef([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setTick(null);
    if (!spinning) return;
    let elapsed = REEL_BLUR_MS;
    REEL_DECEL_STEPS.forEach((delay, i) => {
      elapsed += delay;
      timersRef.current.push(setTimeout(() => setTick(i), elapsed));
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [spinning]); // eslint-disable-line react-hooks/exhaustive-deps

  const blurring = spinning && tick === null;
  const settling = spinning && tick !== null;
  const showRows = done || settling;

  // Counts down the remaining decel steps to 0, so the last tick always
  // lands exactly on finalIdx with no visual jump into the "done" state.
  const stepsLeft = settling ? REEL_DECEL_STEPS.length - 1 - tick : 0;
  const idx = ((finalIdx - stepsLeft) % n + n * 2) % n;
  const vals = neighborsAt(options, idx);

  return (
    <div className={`bw-reel${divider ? " bw-reel-divider" : ""}`}>
      {blurring ? (
        <div className="bw-reel-blur" />
      ) : (
        <div className="bw-reel-rows">
          <div className="bw-reel-row bw-reel-row-edge">{showRows ? vals.top : "?"}</div>
          <div
            key={settling ? `t${tick}` : "static"}
            className={`bw-reel-row bw-reel-row-mid${settling ? " bw-reel-row-tick" : ""}${done ? " bw-reel-row-landed" : ""}`}
          >
            {showRows ? vals.mid : "?"}
          </div>
          <div className="bw-reel-row bw-reel-row-edge">{showRows ? vals.bottom : "?"}</div>
        </div>
      )}
      <div className="bw-reel-vignette" />
    </div>
  );
}

export default function DraftRouletteScreen({ draft, onStart }) {
  const { managers, draftRoulette } = draft;
  const humanIndices = managers
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => !m.isComputer)
    .map(({ i }) => i);

  const [stepPos, setStepPos] = useState(0);
  const [phase, setPhase] = useState("waiting"); // waiting | spinning-era | spinning-league | revealed | summary
  const [completed, setCompleted] = useState([]);
  const [handleY, setHandleY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);

  const timers = useRef([]);
  function addTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const showEra = !!draftRoulette?.era;
  const showLeague = !!draftRoulette?.league;

  const curMgrIdx = stepPos < humanIndices.length ? humanIndices[stepPos] : null;
  const curManager = curMgrIdx !== null ? managers[curMgrIdx] : null;

  // Reels land in sequence — era reel is "done" once its spin has passed,
  // league reel only once the whole pull has fully revealed.
  const eraDone = phase === "spinning-league" || phase === "revealed";
  const leagueDone = phase === "revealed";

  function spin() {
    if (phase !== "waiting" || !curManager) return;
    setHandleY(58);
    addTimer(() => setHandleY(0), 280);
    setPhase(showEra ? "spinning-era" : "spinning-league");
  }

  function onHandlePointerDown(e) {
    if (phase !== "waiting" || !curManager) return;
    setDragging(true);
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onHandlePointerMove(e) {
    if (!dragging) return;
    const dy = Math.max(0, Math.min(58, e.clientY - dragStartY.current));
    setHandleY(dy);
  }
  function onHandlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (handleY > 28) spin();
    else setHandleY(0);
  }

  function eraLanded() {
    if (showLeague) {
      addTimer(() => setPhase("spinning-league"), 500);
    } else {
      setPhase("revealed");
    }
  }

  function leagueLanded() {
    setPhase("revealed");
  }

  function next() {
    setCompleted(prev => [...prev, curMgrIdx]);
    const nextPos = stepPos + 1;
    if (nextPos >= humanIndices.length) {
      setPhase("summary");
    } else {
      setStepPos(nextPos);
      setPhase("waiting");
    }
  }

  function skipToEnd() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCompleted(humanIndices);
    setStepPos(humanIndices.length);
    setPhase("summary");
  }

  // Reels spin on a fixed CSS timer rather than a data callback, so drive
  // eraLanded/leagueLanded off the phase itself.
  useEffect(() => {
    if (phase === "spinning-era") {
      const t = addTimer(eraLanded, REEL_SPIN_MS);
      return () => clearTimeout(t);
    }
    if (phase === "spinning-league") {
      const t = addTimer(leagueLanded, REEL_SPIN_MS);
      return () => clearTimeout(t);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (humanIndices.length === 0) {
    onStart();
    return null;
  }

  /* ── SUMMARY ─────────────────────────────────────────────────── */
  if (phase === "summary") {
    return (
      <div className="setup-screen">
        <div className="bw-frame">
          <div className="bw-banner">
            <div className="bw-banner-title">🎰 DRAFT ROULETTE RESULTS</div>
          </div>
          <div className="bw-body">
            <div className="bw-roulette-summary-list">
              {managers.map((m, i) => (
                <div key={i} className="bw-roulette-result-row">
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`rs-${i}`} size={20} />
                  <span className="bw-roulette-result-club">{m.clubName || m.name}</span>
                  {m.isComputer && <span className="bw-badge-pill bw-badge-pill-cpu">CPU</span>}
                  <span className="bw-roulette-result-pool">
                    {showEra && findLabel(DRAFT_ROULETTE_ERAS, m.assignedEra)}
                    {showEra && showLeague && " · "}
                    {showLeague && findLabel(DRAFT_ROULETTE_LEAGUES, m.assignedLeague)}
                  </span>
                </div>
              ))}
            </div>
            <button className="bw-cta-arcade" style={{ marginTop: 14 }} onClick={onStart}>▶ CONTINUE</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── CABINET SCREEN ──────────────────────────────────────────── */
  const isSpinningEra = phase === "spinning-era";
  const isSpinningLeague = phase === "spinning-league";

  return (
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-roulette-marquee">
          <div className="bw-roulette-bulbs">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="bw-roulette-bulb" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <div className="bw-roulette-title">🎰 DRAFT ROULETTE</div>
        </div>

        {curManager && (
          <div className="bw-roulette-team">
            <KitSwatch primary={curManager.primaryColor} secondary={curManager.secondaryColor} pattern={curManager.pattern || "plain"} uid="cur-r" size={18} />
            <span className="bw-roulette-team-name">{curManager.clubName || curManager.name}</span>
          </div>
        )}

        <div className="bw-roulette-subtitle">
          {phase === "waiting" && "Spin to reveal your pool"}
          {phase === "spinning-era" && "Spinning ERA…"}
          {phase === "spinning-league" && "Spinning LEAGUE…"}
          {phase === "revealed" && "Pool revealed — lock it in!"}
        </div>

        <div className="bw-roulette-cabinet">
          <div className="bw-roulette-bezel">
            <span className="bw-roulette-rivet bw-roulette-rivet-tl" />
            <span className="bw-roulette-rivet bw-roulette-rivet-tr" />
            <span className="bw-roulette-rivet bw-roulette-rivet-bl" />
            <span className="bw-roulette-rivet bw-roulette-rivet-br" />
            <div className="bw-roulette-window">
              <div className="bw-roulette-reels">
                {showEra && (
                  <Reel
                    divider={showLeague}
                    options={DRAFT_ROULETTE_ERAS}
                    finalKey={curManager?.assignedEra}
                    spinning={isSpinningEra}
                    done={eraDone}
                  />
                )}
                {showLeague && (
                  <Reel
                    options={DRAFT_ROULETTE_LEAGUES}
                    finalKey={curManager?.assignedLeague}
                    spinning={isSpinningLeague}
                    done={leagueDone}
                  />
                )}
              </div>
              <div className="bw-roulette-payline">
                <span className="bw-roulette-payline-arrow bw-roulette-payline-arrow-left" />
                <span className="bw-roulette-payline-arrow bw-roulette-payline-arrow-right" />
              </div>
              <div className="bw-roulette-glare" />
            </div>
          </div>

          <div className="bw-roulette-handle-rail">
            <div className="bw-roulette-handle-bar" />
            <div className="bw-roulette-handle-cap" />
            <button
              className="bw-roulette-handle-ball"
              style={{ transform: `translateX(-50%) translateY(${handleY}px)`, transition: dragging ? "none" : undefined }}
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              onClick={spin}
              aria-label="Pull to spin"
            />
          </div>
        </div>

        <div className="bw-roulette-labels">
          {showEra && <span className="bw-roulette-label">ERA</span>}
          {showLeague && <span className="bw-roulette-label">LEAGUE</span>}
          <span className="bw-roulette-label-spacer" />
        </div>

        {(phase === "waiting" || phase === "revealed") && (
          <div className="bw-roulette-spin-wrap">
            {phase === "waiting"
              ? <button className="bw-cta-arcade" onClick={spin}>🎰 SPIN</button>
              : <button className="bw-cta-arcade" onClick={next}>▶ NEXT PLAYER</button>}
          </div>
        )}

        <div className="bw-roulette-skip-wrap">
          <button className="bw-cta-secondary" onClick={skipToEnd}>⏭ SKIP TO END</button>
        </div>

        {completed.length > 0 && (
          <div className="bw-roulette-results">
            <div className="bw-roulette-results-label">SPUN SO FAR</div>
            {completed.map(idx => {
              const m = managers[idx];
              return (
                <div key={idx} className="bw-roulette-result-row">
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`rr-${idx}`} size={16} />
                  <span className="bw-roulette-result-club">{m.clubName || m.name}</span>
                  <span className="bw-roulette-result-pool">
                    {showEra && findLabel(DRAFT_ROULETTE_ERAS, m.assignedEra)}
                    {showEra && showLeague && " · "}
                    {showLeague && findLabel(DRAFT_ROULETTE_LEAGUES, m.assignedLeague)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

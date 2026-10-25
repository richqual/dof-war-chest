import { useState, useEffect, useRef } from "react";
import { Reel, REEL_SPIN_MS } from "./DraftRouletteScreen";
import { KITTY_SUBS_REEL, rollSubsReel } from "../hooks/kittyUtils";
import { formatValue } from "../data/players";

// The subs top-up slot machine. Three reels each land a money amount; their sum
// is the spun bench fund, which the caller then stacks on the carried-over sub
// fund and floors at the bench minimum. Reuses Draft Roulette's mechanical
// cabinet (Reel + the bw-roulette-* skin), so it feels like the rest of the game.
//
// `onConfirm(spun)` receives ONLY the three-reel sum — the carryover and the
// minimum floor are applied by confirmKittySubsSpin, exactly as the old wheel's
// finalVal was.
const REEL_OPTIONS = KITTY_SUBS_REEL.map(v => ({ key: String(v), label: formatValue(v) }));
const REEL_STAGGER = 650; // gap between each reel settling — spread out for a slower, punchier reveal

export default function SubsSlotMachine({ carryover = 0, minTotal = 0, onConfirm }) {
  const [finals, setFinals] = useState(null);        // [v0, v1, v2]
  const [spinning, setSpinning] = useState([false, false, false]);
  const [done, setDone] = useState([false, false, false]);
  const [handleY, setHandleY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const timers = useRef([]);

  function addTimer(fn, ms) { const t = setTimeout(fn, ms); timers.current.push(t); return t; }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const phase = finals === null ? "idle" : done.every(Boolean) ? "done" : "spinning";
  const spun = finals ? finals.reduce((a, b) => a + b, 0) : 0;
  const total = Math.max(spun + carryover, minTotal);
  const injected = phase === "done" && spun + carryover < minTotal;

  function pull() {
    if (phase !== "idle") return;
    const picked = [rollSubsReel(), rollSubsReel(), rollSubsReel()];
    setFinals(picked);
    setSpinning([true, true, true]);
    // Reels settle in sequence — each stops REEL_SPIN_MS after it begins.
    picked.forEach((_, i) => {
      addTimer(() => {
        setSpinning(prev => prev.map((s, j) => (j === i ? false : s)));
        setDone(prev => prev.map((d, j) => (j === i ? true : d)));
      }, REEL_SPIN_MS + i * REEL_STAGGER);
    });
    setHandleY(58);
    addTimer(() => setHandleY(0), 280);
  }

  function onDown(e) {
    if (phase !== "idle") return;
    setDragging(true);
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (!dragging) return;
    setHandleY(Math.max(0, Math.min(58, e.clientY - dragStartY.current)));
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (handleY > 28) pull(); else setHandleY(0);
  }

  return (
    <div className="bw-subs-slot">
    <div className="bw-roulette-cabinet">
      <div className="bw-roulette-bezel">
        <span className="bw-roulette-rivet bw-roulette-rivet-tl" />
        <span className="bw-roulette-rivet bw-roulette-rivet-tr" />
        <span className="bw-roulette-rivet bw-roulette-rivet-bl" />
        <span className="bw-roulette-rivet bw-roulette-rivet-br" />
        <div className="bw-roulette-window">
          <div className="bw-roulette-reels">
            {[0, 1, 2].map(i => (
              <Reel
                key={i}
                divider={i < 2}
                options={REEL_OPTIONS}
                finalKey={finals ? String(finals[i]) : REEL_OPTIONS[0].key}
                spinning={spinning[i]}
                done={done[i]}
              />
            ))}
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
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={pull}
          aria-label="Pull to spin the bench fund"
        />
      </div>
    </div>

      <div className="bw-roulette-labels">
        <span className="bw-roulette-label">REEL 1</span>
        <span className="bw-roulette-label">REEL 2</span>
        <span className="bw-roulette-label">REEL 3</span>
        <span className="bw-roulette-label-spacer" />
      </div>

      {phase === "done" && (
        <div className="spin-total-readout">
          <div className="spin-reel-sum">
            {finals.map((v, i) => (
              <span key={i}>{formatValue(v)}{i < 2 ? " + " : ""}</span>
            ))}
            {carryover > 0 && <span className="spin-carryover-inline"> + {formatValue(carryover)} sub fund</span>}
          </div>
          {injected && (
            <div className="spin-injection">💰 CASH INJECTION — topped up to <strong>{formatValue(minTotal)}</strong></div>
          )}
          <div className="spin-total-big">= <strong>{formatValue(total)}</strong> bench fund</div>
        </div>
      )}

      <div className="bw-roulette-spin-wrap">
        {phase === "done"
          ? <button className="bw-cta-arcade" onClick={() => onConfirm(spun)}>✓ LOCK IN {formatValue(total)}</button>
          : <button className="bw-cta-arcade" onClick={pull} disabled={phase === "spinning"}>🎰 PULL</button>}
      </div>
    </div>
  );
}

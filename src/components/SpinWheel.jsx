import { useState, useEffect, useMemo, useRef } from "react";
import { generateBudget, formatValue, WHEEL_VALUES, DIFFICULTY_WEIGHTS } from "../data/players";

const SPIN_DURATION = 5200; // ms — long ease-out so the wheel crawls to a stop
const FULL_SPINS = 5;       // whole rotations before settling

// Display order around the wheel (indices into WHEEL_VALUES). Interleaves
// high and low values roulette-style so the run-up past £200m hurts.
const WHEEL_ORDER = [0, 4, 1, 6, 2, 8, 3, 5, 7];

const SEGMENT_COLORS = {
  0:   "#6b1d1d",
  25:  "#3a3f4a",
  50:  "#2f4a3a",
  75:  "#1a6b4a",
  100: "#1a4580",
  125: "#5a3a8a",
  150: "#9a4d0b",
  175: "#c8780a",
  200: "#b8962e",
};

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

// Segment spans are proportional to the difficulty's real odds, so the wheel
// is an honest picture of the distribution being spun against.
function buildSegments(difficulty) {
  const weights = DIFFICULTY_WEIGHTS[difficulty] || DIFFICULTY_WEIGHTS.normal;
  const total = weights.reduce((s, w) => s + w, 0);
  let angle = 0;
  return WHEEL_ORDER.map(i => {
    const span = (weights[i] / total) * 360;
    const seg = { value: WHEEL_VALUES[i], start: angle, span };
    angle += span;
    return seg;
  });
}

export default function SpinWheel({ carryover, onConfirm, difficulty = "normal" }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [finalVal, setFinalVal] = useState(null);
  const [done, setDone] = useState(false);
  const fallbackRef = useRef(null);

  const segments = useMemo(() => buildSegments(difficulty), [difficulty]);

  useEffect(() => () => clearTimeout(fallbackRef.current), []);

  function land() {
    clearTimeout(fallbackRef.current);
    setSpinning(false);
    setDone(true);
  }

  function spin() {
    if (spinning || done) return;
    const result = generateBudget(difficulty);
    const seg = segments.find(s => s.value === result);
    // Land somewhere inside the segment, away from the edges
    const margin = Math.min(2, seg.span * 0.2);
    const theta = seg.start + margin + Math.random() * (seg.span - margin * 2);

    setRotation(prev => {
      const current = ((prev % 360) + 360) % 360;
      const targetMod = (360 - theta) % 360;
      const delta = ((targetMod - current) % 360 + 360) % 360;
      return prev + FULL_SPINS * 360 + delta;
    });
    setFinalVal(result);
    setSpinning(true);
    // Safety net in case transitionend doesn't fire
    fallbackRef.current = setTimeout(land, SPIN_DURATION + 400);
  }

  const totalBudget = done ? (finalVal || 0) + (carryover || 0) : null;

  return (
    <div className="spin-wheel-container">
      <div className="wheel-wrap">
        <div
          className="wheel-rotor"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${SPIN_DURATION}ms cubic-bezier(0.12, 0.8, 0.18, 1)`,
          }}
          onTransitionEnd={() => spinning && land()}
        >
          <svg viewBox="-104 -104 208 208">
            {segments.map(seg => {
              const [x1, y1] = polar(seg.start, 100);
              const [x2, y2] = polar(seg.start + seg.span, 100);
              const largeArc = seg.span > 180 ? 1 : 0;
              return (
                <path
                  key={seg.value}
                  d={`M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={SEGMENT_COLORS[seg.value]}
                  stroke="#0d0d0d"
                  strokeWidth="1.5"
                />
              );
            })}
            {/* Labels drawn after every wedge so slim segments stay readable */}
            {segments.map(seg => (
              <text
                key={seg.value}
                transform={`rotate(${seg.start + seg.span / 2}) translate(0 -94) rotate(90)`}
                fill={seg.value >= 150 ? "#ffe9b0" : "rgba(255,255,255,0.92)"}
                fontSize={seg.span < 14 ? 9.5 : 12}
                fontWeight="700"
                fontFamily="var(--font-head)"
                dominantBaseline="middle"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.65)", strokeWidth: 2.5 }}
              >
                {seg.value === 0 ? "£0" : `£${seg.value}m`}
              </text>
            ))}
            <circle r="100" fill="none" stroke="#0d0d0d" strokeWidth="3" />
          </svg>
        </div>
        <div className="wheel-pointer" />
        <svg className="wheel-hub" viewBox="-24 -24 48 48">
          <circle r="22" fill="var(--bg)" stroke="var(--amber)" strokeWidth="3" />
          <text
            fill="var(--amber)"
            fontSize="20"
            fontWeight="900"
            fontFamily="var(--font-head)"
            textAnchor="middle"
            dominantBaseline="central"
          >£</text>
        </svg>
      </div>

      {done && (
        <div className="spin-result">
          {finalVal === 0 ? "£0 — FREE AGENTS ONLY" : formatValue(finalVal)}
        </div>
      )}

      {done && carryover > 0 && (
        <div className="spin-carryover">
          + £{carryover}m carryover = <strong>£{totalBudget}m total</strong>
        </div>
      )}

      {!done ? (
        <button
          className={`spin-btn ${spinning ? "disabled" : ""}`}
          onClick={spin}
          disabled={spinning}
        >
          {spinning ? "SPINNING…" : "🎡 SPIN THE WHEEL"}
        </button>
      ) : (
        <button className="spin-confirm-btn" onClick={() => onConfirm(finalVal)}>
          ✓ LOCK IN {formatValue(finalVal)}
        </button>
      )}

      <div className="spin-hint">
        {done
          ? "Lock it in to start picking"
          : spinning
            ? "Where she stops, nobody knows…"
            : "Spin to reveal your transfer budget"}
      </div>
    </div>
  );
}

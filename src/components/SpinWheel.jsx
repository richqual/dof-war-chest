import { useState, useEffect, useRef, useMemo } from "react";
import { generateBudget, formatValue, DIFFICULTY_SLOTS } from "../data/players";

const SPIN_DURATION = 5200;
const FULL_SPINS = 5;
const NUM_SLOTS = 16;
const SLICE_DEG = 360 / NUM_SLOTS; // 22.5°
const NUM_LIGHTS = 24;

function shuffleSlots(slots) {
  const arr = [...slots];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sliceColor(value) {
  if (value === 0)   return "#5c1a1a";
  if (value <= 25)   return "#3a2a1a";
  if (value <= 50)   return "#2a3a2a";
  if (value <= 75)   return "#1a4a2a";
  if (value <= 100)  return "#1a3a6b";
  if (value <= 125)  return "#3a2a6b";
  if (value <= 150)  return "#6b3a0a";
  if (value <= 175)  return "#8a5a0a";
  return "#7a6a1a";
}

function sliceTextColor(value) {
  return value >= 150 ? "#ffe9b0" : "rgba(255,255,255,0.92)";
}

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

function RollerHub({ display, isFinal }) {
  const label = display === null ? "—" : display === 0 ? "£0" : `£${display}m`;
  return (
    <div className={`wheel-roller-hub ${isFinal ? "settled" : "rolling"}`}>
      <span className="wheel-roller-value">{label}</span>
    </div>
  );
}

export default function SpinWheel({ carryover, onConfirm, difficulty = "normal" }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [finalVal, setFinalVal] = useState(null);
  const [done, setDone] = useState(false);
  const [rollerDisplay, setRollerDisplay] = useState(null);

  const fallbackRef = useRef(null);
  const rotorRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(fallbackRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const slots = DIFFICULTY_SLOTS[difficulty] || DIFFICULTY_SLOTS.normal;
  const arranged = useMemo(() => shuffleSlots(slots), [difficulty]);
  const segments = arranged.map((value, i) => ({
    value,
    start: i * SLICE_DEG,
    span: SLICE_DEG,
  }));

  function getSegmentAtPointer() {
    if (!rotorRef.current) return null;
    const matrix = new DOMMatrix(getComputedStyle(rotorRef.current).transform);
    // atan2(b, a) gives the rotation angle in radians
    const angleDeg = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    // Normalize to 0–360: the wheel has rotated angleDeg clockwise
    // Segment at top = the one where (segStart + angleDeg) ≡ 0 (mod 360)
    // => segStart ≡ -angleDeg (mod 360)
    const atTop = (((360 - ((angleDeg % 360) + 360) % 360) % 360) / SLICE_DEG) | 0;
    return segments[atTop % NUM_SLOTS] ?? null;
  }

  function startRaf() {
    function frame() {
      const seg = getSegmentAtPointer();
      if (seg) setRollerDisplay(seg.value);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  function land() {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(fallbackRef.current);
    setSpinning(false);
    setDone(true);
    // Snap roller to final value
    const seg = getSegmentAtPointer();
    setRollerDisplay(seg ? seg.value : finalVal);
  }

  function spin() {
    if (spinning || done) return;
    const result = generateBudget(difficulty);
    const matching = segments.filter(s => s.value === result);
    const seg = matching[Math.floor(Math.random() * matching.length)];
    const margin = SLICE_DEG * 0.15;
    const theta = seg.start + margin + Math.random() * (seg.span - margin * 2);

    setRotation(prev => {
      const current = ((prev % 360) + 360) % 360;
      const targetMod = (360 - theta) % 360;
      const delta = ((targetMod - current) % 360 + 360) % 360;
      return prev + FULL_SPINS * 360 + delta;
    });
    setFinalVal(result);
    setSpinning(true);
    // Start reading live position next frame (after CSS transition begins)
    requestAnimationFrame(() => startRaf());
    fallbackRef.current = setTimeout(land, SPIN_DURATION + 400);
  }

  const lights = Array.from({ length: NUM_LIGHTS }, (_, i) => {
    const angle = (i / NUM_LIGHTS) * 2 * Math.PI;
    const r = 176;
    return {
      left: `calc(50% + ${Math.sin(angle) * r}px - 7px)`,
      top: `calc(50% - ${Math.cos(angle) * r}px - 7px)`,
      animationDelay: `${(i % 2) * 0.25 + Math.floor(i / 2) * 0.04}s`,
      colorClass: `bulb-c${i % 4}`,
    };
  });

  return (
    <div className="spin-wheel-container">
      <div className={`wheel-lights-ring ${spinning ? "lights-active" : ""} ${done ? "lights-done" : ""}`}>
        {lights.map((l, i) => (
          <div
            key={i}
            className={`light-bulb ${l.colorClass}`}
            style={{ left: l.left, top: l.top, animationDelay: l.animationDelay }}
          />
        ))}
        <div className="wheel-wrap">
          <div
            ref={rotorRef}
            className="wheel-rotor"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.12, 0.8, 0.18, 1)`
                : "none",
            }}
            onTransitionEnd={() => spinning && land()}
          >
            <svg viewBox="-104 -104 208 208">
              {segments.map((seg, i) => {
                const [x1, y1] = polar(seg.start, 100);
                const [x2, y2] = polar(seg.start + seg.span, 100);
                return (
                  <path
                    key={i}
                    d={`M 0 0 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                    fill={sliceColor(seg.value)}
                    stroke="#0a0a0a"
                    strokeWidth="1.2"
                  />
                );
              })}
              {segments.map((seg, i) => (
                <text
                  key={i}
                  transform={`rotate(${seg.start + seg.span / 2}) translate(0 -76) rotate(90)`}
                  fill={sliceTextColor(seg.value)}
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="var(--font-head)"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.8)", strokeWidth: 2.5 }}
                >
                  {seg.value === 0 ? "£0" : `£${seg.value}m`}
                </text>
              ))}
              <circle r="100" fill="none" stroke="#0a0a0a" strokeWidth="2" />
            </svg>
          </div>
          <div className="wheel-pointer" />
          {spinning || done ? (
            <RollerHub display={rollerDisplay} isFinal={done} />
          ) : (
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
          )}
        </div>
      </div>

      {done && carryover > 0 && (
        <div className="spin-carryover">
          + £{carryover}m carryover = <strong>£{(finalVal || 0) + carryover}m total</strong>
        </div>
      )}
      {done && finalVal === 0 && (
        <div className="roller-zero-label">FREE AGENTS ONLY</div>
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
          ✓ LOCK IN {finalVal === 0 ? "£0" : formatValue(finalVal)}
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

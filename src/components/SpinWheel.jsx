import { useState, useRef, useMemo } from "react";
import { formatValue, DIFFICULTY_SLOTS } from "../data/players";
import { useSpinnableWheel } from "../hooks/useSpinnableWheel";

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

// Low-to-mid budget tiers are theme-tinted (green in Classic, blue in Scout);
// the top "jackpot" tiers stay gold in every theme.
const WHEEL_RAMPS = {
  green: ["#1a2618", "#14351b", "#0e5a2f", "#0b7a3d", "#146b3a", "#2fd06e"],
  blue:  ["#141d28", "#13233a", "#0e3a63", "#0b4f8a", "#14568f", "#3b9dff"],
};

function sliceColor(value, theme = "green") {
  const ramp = WHEEL_RAMPS[theme] || WHEEL_RAMPS.green;
  if (value === 0)   return ramp[0];
  if (value <= 25)   return ramp[1];
  if (value <= 50)   return ramp[2];
  if (value <= 75)   return ramp[3];
  if (value <= 100)  return ramp[4];
  if (value <= 125)  return ramp[5];
  if (value <= 150)  return "#c99a1a";
  if (value <= 175)  return "#e0a91a";
  return "#f5c542";
}

function sliceTextColor(value) {
  return value >= 150 ? "#241c05" : "rgba(232,241,230,0.92)";
}

// Outline that contrasts with the text itself: light halo behind dark text on
// the gold wedges (a black stroke there merges into an unreadable blob), dark
// halo behind light text on the green wedges.
function sliceStrokeColor(value) {
  return value >= 150 ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)";
}

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

// Which slice sits under the top pointer for a given rotation (clockwise positive).
function idxAt(rotation) {
  const norm = ((rotation % 360) + 360) % 360;
  return (Math.floor(((360 - norm) % 360) / SLICE_DEG)) % NUM_SLOTS;
}

function RollerHub({ display, isFinal }) {
  const label = display === null ? "—" : display === 0 ? "£0" : `£${display}m`;
  return (
    <div className={`wheel-roller-hub ${isFinal ? "settled" : "rolling"}`}>
      <span className="wheel-roller-value">{label}</span>
    </div>
  );
}

// `carryLabel` names what the carried money is: under Leftover Lolly it's a
// banked sub fund rather than a round-to-round carryover. `minTotal` is that
// mode's guaranteed bench floor, shown when the spin lands under it.
export default function SpinWheel({ carryover, onConfirm, difficulty = "normal", theme = "green", carryLabel = "carryover", minTotal = 0 }) {
  const [finalVal, setFinalVal] = useState(null);
  const [rollerDisplay, setRollerDisplay] = useState(null);

  const rotorRef = useRef(null);
  const liveIdxRef = useRef(-1);

  // generateBudget is a uniform pick over these 16 slots, so landing on a random
  // wedge yields the same odds — the wheel's wedges ARE the distribution.
  const slots = DIFFICULTY_SLOTS[difficulty] || DIFFICULTY_SLOTS.normal;
  const arranged = useMemo(() => shuffleSlots(slots), [difficulty]);
  const segments = arranged.map((value, i) => ({ value, start: i * SLICE_DEG, span: SLICE_DEG }));
  const injected = minTotal > 0 && finalVal !== null && (finalVal + carryover) < minTotal;

  const handleLive = (rot) => {
    const idx = idxAt(rot);
    if (idx === liveIdxRef.current) return;
    liveIdxRef.current = idx;
    setRollerDisplay(arranged[idx]);
  };

  const handleLanded = (rot) => {
    const idx = idxAt(rot, arranged.length);
    setFinalVal(arranged[idx]);
    setRollerDisplay(arranged[idx]);
  };

  const { spinning, done, idle, onPointerDown, flick } = useSpinnableWheel({
    rotorRef,
    onLive: handleLive,
    onLanded: handleLanded,
  });

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
        <div
          className={`wheel-wrap ${done ? "" : "grabbable"}`}
          onPointerDown={done ? undefined : onPointerDown}
        >
          <div ref={rotorRef} className="wheel-rotor">
            <svg viewBox="-104 -104 208 208">
              {segments.map((seg, i) => {
                const [x1, y1] = polar(seg.start, 100);
                const [x2, y2] = polar(seg.start + seg.span, 100);
                return (
                  <path
                    key={i}
                    d={`M 0 0 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                    fill={sliceColor(seg.value, theme)}
                    stroke="#0e140d"
                    strokeWidth="1.2"
                  />
                );
              })}
              {segments.map((seg, i) => (
                <text
                  key={i}
                  transform={`rotate(${seg.start + seg.span / 2}) translate(0 -76) rotate(90)`}
                  fill={sliceTextColor(seg.value)}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="var(--bw-font-display, var(--font-head))"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  style={{ paintOrder: "stroke", stroke: sliceStrokeColor(seg.value), strokeWidth: 2.5 }}
                >
                  {seg.value === 0 ? "£0" : `£${seg.value}m`}
                </text>
              ))}
              <circle r="100" fill="none" stroke="#0e140d" strokeWidth="2" />
            </svg>
          </div>
          <div className="wheel-pointer" />
          {spinning || done ? (
            <RollerHub display={rollerDisplay} isFinal={done} />
          ) : (
            <svg className="wheel-hub" viewBox="-24 -24 48 48">
              <circle r="22" fill="var(--bw-field, var(--bg))" stroke="var(--bw-gold, var(--amber))" strokeWidth="3" />
              <text
                fill="var(--bw-gold, var(--amber))"
                fontSize="20"
                fontWeight="900"
                fontFamily="var(--bw-font-display, var(--font-head))"
                textAnchor="middle"
                dominantBaseline="central"
              >£</text>
            </svg>
          )}
        </div>
      </div>

      {idle && (
        <div className="bw-wheel-drag-hint">
          <span className="bw-wheel-drag-arrow" aria-hidden="true">↻</span> Grab the wheel &amp; flick it
        </div>
      )}

      {done && carryover > 0 && (
        <div className="spin-carryover">
          + £{carryover}m {carryLabel} = <strong>£{(finalVal || 0) + carryover}m total</strong>
        </div>
      )}
      {/* The floor is applied to the real budget upstream, so it has to be shown
          here too — otherwise the wheel's sum contradicts the budget you get. */}
      {done && injected && (
        <div className="spin-injection">
          💰 CASH INJECTION — topped up to <strong>£{minTotal}m</strong>
        </div>
      )}
      {done && finalVal === 0 && !injected && (
        <div className="roller-zero-label">WHEEL &amp; DEAL</div>
      )}

      {!done ? (
        <button
          className={`spin-btn ${spinning ? "disabled" : ""}`}
          onClick={flick}
          disabled={spinning}
        >
          {spinning ? "SPINNING…" : "🎡 SPIN THE WHEEL"}
        </button>
      ) : (
        <button className="spin-confirm-btn" onClick={() => onConfirm(finalVal)}>
          {/* On an injection show the floor, not the spin: `onConfirm` still gets
              the raw value (the floor is applied upstream), but a button reading
              "LOCK IN £0" under a cash-injection notice contradicts itself. */}
          ✓ LOCK IN {injected ? `£${minTotal}m` : finalVal === 0 ? "£0" : formatValue(finalVal)}
        </button>
      )}

      <div className="spin-hint">
        {done
          ? "Lock it in to start picking"
          : spinning
            ? "Where she stops, nobody knows…"
            : "Drag the wheel and flick — or tap Spin"}
      </div>
    </div>
  );
}

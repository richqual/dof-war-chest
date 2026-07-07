import { useState, useRef, useEffect } from "react";
import { POSITIONS } from "../data/players";
import { FORMATIONS } from "../data/formations";
import { useSpinnableWheel } from "../hooks/useSpinnableWheel";

const NUM_LIGHTS = 20;

// Mowed-pitch stripes — the wedge fill just alternates by index, no role colour.
const PITCH_STRIPES = ["#1f4d2b", "#173a20"];

// Role is still legible via a small tier dot — colours match the tactics-board pitch dots
// (lineColors() in SquadScreen.jsx): gold=GK, blue=DEF, green=MID, orange=ATT.
const TIER_DOTS = {
  GK:  "var(--bw-line-gk)",
  DEF: "var(--bw-line-def-text)",
  MID: "var(--bw-line-mid-text)",
  ATT: "var(--bw-line-att)",
};

function tierGroup(posKey) {
  if (posKey === "GK") return "GK";
  if (["RB", "LB", "CB", "WB"].includes(posKey)) return "DEF";
  if (["ST", "RW", "LW"].includes(posKey)) return "ATT";
  return "MID";
}

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

export default function PositionWheel({ squad, onConfirm, formation = "4-3-3" }) {
  const [resultSlot, setResultSlot] = useState(null);
  const [liveLabel, setLiveLabel] = useState(null);
  const [tickBounce, setTickBounce] = useState(null);

  const rotorRef = useRef(null);
  const lastSegIdxRef = useRef(-1);
  const lastBounceRef = useRef(0);

  const availSlots = [];
  for (let i = 0; i < 11; i++) {
    if (!squad?.[i]) availSlots.push(i);
  }
  const n = availSlots.length;
  const sliceDeg = n > 0 ? 360 / n : 360;

  const segments = availSlots.map((slotIdx, i) => {
    const entry = FORMATIONS[formation]?.[slotIdx];
    const posKey = entry?.pos ?? POSITIONS[slotIdx]?.key ?? "";
    const label = entry?.label ?? posKey;
    return {
      slotIdx,
      start: i * sliceDeg,
      span: sliceDeg,
      fill: PITCH_STRIPES[i % 2],
      tierColor: TIER_DOTS[tierGroup(posKey)],
      label,
    };
  });

  // Which segment sits under the top pointer for a given rotation (clockwise positive).
  function idxAt(rotation) {
    const norm = ((rotation % 360) + 360) % 360;
    return (Math.floor(((360 - norm) % 360) / sliceDeg)) % n;
  }

  const handleLive = (rot) => {
    const idx = idxAt(rot);
    if (idx === lastSegIdxRef.current) return;
    const now = performance.now();
    if (now - lastBounceRef.current > 55) {
      lastBounceRef.current = now;
      setTickBounce(prev => (prev === "a" ? "b" : "a"));
    }
    lastSegIdxRef.current = idx;
    setLiveLabel(segments[idx]?.label);
  };

  const handleLanded = (rot) => {
    const seg = segments[idxAt(rot)];
    if (seg) {
      setResultSlot(seg.slotIdx);
      setLiveLabel(seg.label);
    }
    setTickBounce(null);
  };

  const { spinning, done, idle, onPointerDown, flick } = useSpinnableWheel({
    rotorRef,
    onLive: handleLive,
    onLanded: handleLanded,
    disabled: n <= 1,
  });

  // Auto-confirm when only one slot remains — no spin needed
  useEffect(() => {
    if (n === 1) {
      const t = setTimeout(() => onConfirm(availSlots[0]), 1800);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resultSeg = done ? segments.find(s => s.slotIdx === resultSlot) : null;

  const lights = Array.from({ length: NUM_LIGHTS }, (_, i) => {
    const angle = (i / NUM_LIGHTS) * 2 * Math.PI;
    const r = 138;
    return {
      left: `calc(50% + ${Math.sin(angle) * r}px - 6px)`,
      top: `calc(50% - ${Math.cos(angle) * r}px - 6px)`,
      animationDelay: `${(i % 2) * 0.25 + Math.floor(i / 2) * 0.05}s`,
      colorClass: `bulb-c${i % 4}`,
    };
  });

  // Last slot — skip the wheel, just flash-reveal and auto-confirm
  if (n === 1) {
    const entry = FORMATIONS[formation]?.[availSlots[0]];
    const posKey = entry?.pos ?? POSITIONS[availSlots[0]]?.key ?? "";
    const label = entry?.label ?? posKey;
    const tierColor = TIER_DOTS[tierGroup(posKey)];
    return (
      <div className="position-wheel-wrap">
        <div className="position-wheel-title">FINAL SLOT</div>
        <div className="pos-auto-reveal" style={{ background: "#173a20", color: "#fff", borderColor: tierColor }}>
          <span className="pos-tier-dot" style={{ background: tierColor }} />
          {label}
        </div>
        <div className="spin-hint">Last position — auto-assigning…</div>
      </div>
    );
  }

  return (
    <div className="position-wheel-wrap">
      <div className="position-wheel-title">DRAW YOUR POSITION</div>

      <div className={`pos-wheel-ring${spinning ? " lights-active" : ""}${done ? " lights-done" : ""}`}>
        {lights.map((l, i) => (
          <div
            key={i}
            className={`light-bulb ${l.colorClass}`}
            style={{ left: l.left, top: l.top, animationDelay: l.animationDelay }}
          />
        ))}

        <div
          className={`pos-wheel-stage ${done ? "" : "grabbable"}`}
          onPointerDown={done ? undefined : onPointerDown}
        >
          <div ref={rotorRef} className="pos-wheel-rotor">
            <svg viewBox="-104 -104 208 208" width="260" height="260">
              {segments.map((seg) => {
                const [x1, y1] = polar(seg.start, 100);
                const [x2, y2] = polar(seg.start + seg.span, 100);
                const large = seg.span > 180 ? 1 : 0;
                const isResult = done && seg.slotIdx === resultSlot;
                const mid = seg.start + seg.span / 2;
                return (
                  <g key={seg.slotIdx}>
                    <path
                      d={`M 0 0 L ${x1} ${y1} A 100 100 0 ${large} 1 ${x2} ${y2} Z`}
                      fill={seg.fill}
                      stroke="#0a0a0a"
                      strokeWidth="1.5"
                      opacity={done && !isResult ? 0.28 : 1}
                    />
                    <line
                      x1="0" y1="0" x2={x1} y2={y1}
                      stroke="rgba(245,197,66,0.5)"
                      strokeWidth="1"
                    />
                    {seg.span > 14 && (
                      <>
                        <g transform={`rotate(${mid}) translate(0 -84)`}>
                          <circle r="3.5" fill={seg.tierColor} />
                        </g>
                        <text
                          transform={`rotate(${mid}) translate(0 -70) rotate(90)`}
                          fill="rgba(255,255,255,0.95)"
                          fontSize={seg.span > 60 ? 15 : seg.span > 35 ? 13 : seg.span > 20 ? 11 : 9.5}
                          fontWeight="800"
                          fontFamily="var(--bw-font-display, var(--font-head))"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.7)", strokeWidth: 3 }}
                        >
                          {seg.label}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
              <circle r="100" fill="none" stroke="#0a0a0a" strokeWidth="2" />
            </svg>
          </div>

          {/* Live hub label */}
          <div
            className={`pos-wheel-hub${done ? " hub-final" : spinning ? " hub-rolling" : " hub-idle"}`}
            style={done ? { background: "#0a0f0b", color: "#fff", borderColor: resultSeg?.tierColor } : {}}
          >
            {spinning || done ? (liveLabel ?? "?") : "?"}
          </div>

          {/* Ticker pointer */}
          <div
            className={[
              "pos-wheel-ticker",
              tickBounce === "a" ? "tick-a" : tickBounce === "b" ? "tick-b" : "",
              done ? "ticker-done" : "",
            ].filter(Boolean).join(" ")}
          />
        </div>
      </div>

      <div className="pos-wheel-legend">
        <span><span className="pos-tier-dot" style={{ background: TIER_DOTS.GK }} />GK</span>
        <span><span className="pos-tier-dot" style={{ background: TIER_DOTS.DEF }} />DEF</span>
        <span><span className="pos-tier-dot" style={{ background: TIER_DOTS.MID }} />MID</span>
        <span><span className="pos-tier-dot" style={{ background: TIER_DOTS.ATT }} />ATT</span>
      </div>

      {idle && (
        <div className="bw-wheel-drag-hint">
          <span className="bw-wheel-drag-arrow" aria-hidden="true">↻</span> Grab the wheel &amp; flick it
        </div>
      )}

      <div className="spin-hint">
        {done
          ? `You're signing a ${resultSeg?.label || ""} — lock it in!`
          : spinning
            ? "Where she stops, nobody knows…"
            : "Drag the wheel and flick — or tap Spin"}
      </div>

      {!done ? (
        <button
          className={`spin-btn${spinning ? " disabled" : ""}`}
          onClick={flick}
          disabled={spinning}
        >
          {spinning ? "SPINNING…" : "🎰 SPIN THE WHEEL"}
        </button>
      ) : (
        <button className="spin-confirm-btn" onClick={() => onConfirm(resultSlot)}>
          ✓ LOCK IN {resultSeg?.label}
        </button>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { POSITIONS } from "../data/players";
import { GROUP_COLORS, FORMATIONS } from "../data/formations";

const SPIN_DURATION = 3000;
const FULL_SPINS = 6;

// Map position key → group color
function posColor(posKey) {
  if (posKey === "GK") return GROUP_COLORS.GK;
  if (["RB","LB","CB"].includes(posKey)) return GROUP_COLORS.DEF;
  if (["ST"].includes(posKey)) return GROUP_COLORS.ATT;
  return GROUP_COLORS.MID; // DM, MF, AM, RW, LW
}

function polar(angleDeg, r, cx = 100, cy = 100) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function slicePath(startDeg, endDeg, r = 88) {
  const [x1, y1] = polar(startDeg, r);
  const [x2, y2] = polar(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function PositionWheel({ squad, onConfirm, formation = "4-3-3" }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultSlot, setResultSlot] = useState(null);
  const [done, setDone] = useState(false);
  const fallbackRef = useRef(null);

  useEffect(() => () => clearTimeout(fallbackRef.current), []);

  // Available slots = unfilled starter positions (indices 0–10)
  const availSlots = [];
  for (let i = 0; i < 11; i++) {
    if (!squad?.[i]) availSlots.push(i);
  }

  const n = availSlots.length;
  const sliceDeg = n > 0 ? 360 / n : 360;

  // Build segments: each slot gets equal slice, in the order they appear in availSlots
  const segments = availSlots.map((slotIdx, i) => {
    const entry = FORMATIONS[formation]?.[slotIdx];
    const posKey = entry?.pos ?? POSITIONS[slotIdx]?.key ?? "";
    const label = entry?.label ?? posKey;
    return {
      slotIdx,
      start: i * sliceDeg,
      span: sliceDeg,
      color: posColor(posKey),
      label,
    };
  });

  function spin() {
    if (spinning || done || n === 0) return;

    // Uniform random pick
    const pick = Math.floor(Math.random() * n);
    const seg = segments[pick];

    // Rotate so the picked segment's center lands at top (pointer)
    const centerAngle = seg.start + seg.span / 2;
    const jitter = (Math.random() - 0.5) * seg.span * 0.4;
    const targetOffset = (360 - centerAngle + jitter + 360) % 360;
    const finalRotation = rotation + FULL_SPINS * 360 + targetOffset;

    setRotation(finalRotation);
    setSpinning(true);

    fallbackRef.current = setTimeout(() => {
      setSpinning(false);
      setDone(true);
      setResultSlot(seg.slotIdx);
    }, SPIN_DURATION + 200);
  }

  function confirm() {
    if (resultSlot !== null) onConfirm(resultSlot);
  }

  const resultSeg = done ? segments.find(s => s.slotIdx === resultSlot) : null;

  return (
    <div className="position-wheel-wrap">
      <div className="position-wheel-title">DRAW YOUR POSITION</div>
      <div className="position-wheel-sub">
        {done
          ? `You're signing a ${resultSeg?.label || ""}`
          : "Spin to reveal which position you're filling this round"}
      </div>

      <div className="position-wheel-stage">
        <div className="pos-wheel-pointer" />

        <svg
          viewBox="0 0 200 200"
          width="230"
          height="230"
          className="position-wheel-svg"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.85, 0.3, 1)`
              : "none",
          }}
        >
          {segments.map((seg) => {
            const isResult = done && seg.slotIdx === resultSlot;
            const [lx, ly] = polar(seg.start + seg.span / 2, 60);
            return (
              <g key={seg.slotIdx}>
                <path
                  d={slicePath(seg.start, seg.start + seg.span)}
                  fill={seg.color.fill}
                  stroke="#0a0a0a"
                  strokeWidth="1.5"
                  opacity={done && !isResult ? 0.35 : 1}
                />
                {seg.span > 18 && (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={seg.span > 60 ? 12 : seg.span > 35 ? 10 : 8}
                    fontWeight="700"
                    fontFamily="monospace"
                    fill={seg.color.text}
                    style={{ userSelect: "none" }}
                  >
                    {seg.label}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx="100" cy="100" r="16" fill="#111" stroke="#333" strokeWidth="1.5" />
        </svg>
      </div>

      {!done && !spinning && (
        <button className="wheel-spin-btn" onClick={spin}>
          ↻ SPIN
        </button>
      )}

      {spinning && (
        <div className="wheel-spinning-label">Spinning…</div>
      )}

      {done && resultSlot !== null && (
        <div className="wheel-result-wrap">
          <div
            className="wheel-result-badge"
            style={{ background: resultSeg?.color.fill, color: resultSeg?.color.text }}
          >
            {resultSeg?.label}
          </div>
          <button className="wheel-spin-btn" onClick={confirm}>
            ✓ CONFIRM
          </button>
        </div>
      )}
    </div>
  );
}

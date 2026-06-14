import { useState, useMemo, useRef, useEffect } from "react";
import { GROUP_ORDER, GROUP_LABELS, GROUP_COLORS, GROUP_SLOT_INDICES } from "../data/formations";

const SPIN_DURATION = 3000;
const FULL_SPINS = 6;

function polar(angleDeg, r) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
}

function arcPath(startDeg, endDeg, r = 85) {
  const [x1, y1] = polar(startDeg, r);
  const [x2, y2] = polar(endDeg, r);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function PositionWheel({ groupProgress, onConfirm }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(false);
  const fallbackRef = useRef(null);

  useEffect(() => () => clearTimeout(fallbackRef.current), []);

  // Build available groups and their remaining slot counts
  const availableGroups = GROUP_ORDER.filter(
    g => (groupProgress?.[g] ?? 0) < GROUP_SLOT_INDICES[g].length
  );
  const remaining = Object.fromEntries(
    availableGroups.map(g => [g, GROUP_SLOT_INDICES[g].length - (groupProgress?.[g] ?? 0)])
  );
  const total = availableGroups.reduce((s, g) => s + remaining[g], 0);

  // Build wheel segments
  const segments = useMemo(() => {
    let angle = 0;
    return availableGroups.map(g => {
      const span = (remaining[g] / total) * 360;
      const seg = { group: g, start: angle, span };
      angle += span;
      return seg;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableGroups.join(","), JSON.stringify(remaining)]);

  function spin() {
    if (spinning || done) return;

    // Weighted random pick
    const r = Math.random() * total;
    let acc = 0;
    let chosen = availableGroups[0];
    for (const g of availableGroups) {
      acc += remaining[g];
      if (r < acc) { chosen = g; break; }
    }

    // Find the center angle of the chosen segment
    const seg = segments.find(s => s.group === chosen);
    const centerAngle = seg.start + seg.span / 2;

    // The pointer is at the top (0deg). Rotate so chosen segment center lands at top.
    // We need: (currentRotation + delta) % 360 = 360 - centerAngle (so center faces up)
    const targetOffset = (360 - centerAngle + Math.random() * (seg.span * 0.4) - seg.span * 0.2) % 360;
    const finalRotation = rotation + FULL_SPINS * 360 + targetOffset;

    setRotation(finalRotation);
    setSpinning(true);

    const onDone = () => {
      setSpinning(false);
      setDone(true);
      setResult(chosen);
    };

    fallbackRef.current = setTimeout(onDone, SPIN_DURATION + 200);
  }

  function confirm() {
    if (result) onConfirm(result);
  }

  const colors = result ? GROUP_COLORS[result] : null;

  return (
    <div className="position-wheel-wrap">
      <div className="position-wheel-title">DRAW YOUR POSITION</div>
      <div className="position-wheel-sub">
        {done
          ? `You're signing a ${GROUP_LABELS[result] || result}`
          : "Spin to find out which position you're filling this round"}
      </div>

      <div className="position-wheel-stage">
        {/* Pointer/needle at top */}
        <div className="wheel-pointer">▼</div>

        <svg
          viewBox="0 0 200 200"
          width="220"
          height="220"
          className="position-wheel-svg"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.85, 0.3, 1)`
              : "none",
          }}
        >
          {segments.map((seg, i) => {
            const col = GROUP_COLORS[seg.group];
            const isResult = done && seg.group === result;
            return (
              <g key={seg.group}>
                <path
                  d={arcPath(seg.start, seg.start + seg.span)}
                  fill={col.fill}
                  stroke="#111"
                  strokeWidth="1.5"
                  opacity={done && !isResult ? 0.45 : 1}
                />
                {/* Label — only show if segment is wide enough */}
                {seg.span > 30 && (() => {
                  const midAngle = seg.start + seg.span / 2;
                  const [lx, ly] = polar(midAngle, 54);
                  return (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={seg.span > 80 ? 13 : 11}
                      fontWeight="700"
                      fontFamily="monospace"
                      fill={col.text}
                      style={{ userSelect: "none" }}
                    >
                      {seg.group}
                    </text>
                  );
                })()}
              </g>
            );
          })}
          {/* Centre circle */}
          <circle cx="100" cy="100" r="18" fill="#111" stroke="#333" strokeWidth="1.5" />
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

      {done && result && (
        <div className="wheel-result-wrap">
          <div
            className="wheel-result-badge"
            style={{ background: colors.fill, color: colors.text }}
          >
            {GROUP_LABELS[result]}
          </div>
          <button className="wheel-spin-btn" onClick={confirm}>
            ✓ CONFIRM
          </button>
        </div>
      )}

      {/* Remaining slots legend */}
      <div className="wheel-slots-legend">
        {availableGroups.map(g => (
          <span key={g} className="wheel-slot-chip" style={{ borderColor: GROUP_COLORS[g].fill, color: GROUP_COLORS[g].fill }}>
            {g} ×{remaining[g]}
          </span>
        ))}
      </div>
    </div>
  );
}

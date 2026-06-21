import { useState, useRef, useEffect } from "react";
import { POSITIONS } from "../data/players";
import { GROUP_COLORS, FORMATIONS } from "../data/formations";

const SPIN_DURATION = 3400;
const FULL_SPINS = 8;
const NUM_LIGHTS = 20;

function posColor(posKey) {
  if (posKey === "GK") return GROUP_COLORS.GK;
  if (["RB", "LB", "CB"].includes(posKey)) return GROUP_COLORS.DEF;
  if (["ST"].includes(posKey)) return GROUP_COLORS.ATT;
  return GROUP_COLORS.MID;
}

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

export default function PositionWheel({ squad, onConfirm, formation = "4-3-3" }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultSlot, setResultSlot] = useState(null);
  const [done, setDone] = useState(false);
  const [liveLabel, setLiveLabel] = useState(null);
  const [tickBounce, setTickBounce] = useState(null);

  const fallbackRef = useRef(null);
  const rafRef = useRef(null);
  const rotorRef = useRef(null);
  const lastSegIdxRef = useRef(-1);
  const lastBounceRef = useRef(0);

  useEffect(() => () => {
    clearTimeout(fallbackRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

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
    return { slotIdx, start: i * sliceDeg, span: sliceDeg, color: posColor(posKey), label };
  });

  // Auto-confirm when only one slot remains — no spin needed
  useEffect(() => {
    if (n === 1) {
      const t = setTimeout(() => onConfirm(availSlots[0]), 1800);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getSegAtPointer() {
    if (!rotorRef.current || n < 1) return null;
    const matrix = new DOMMatrix(getComputedStyle(rotorRef.current).transform);
    const angleDeg = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    const atTop = (((360 - ((angleDeg % 360) + 360) % 360) % 360) / sliceDeg) | 0;
    return segments[atTop % n] ?? null;
  }

  function startRaf() {
    function frame() {
      const seg = getSegAtPointer();
      if (seg) {
        setLiveLabel(seg.label);
        const idx = segments.indexOf(seg);
        const now = performance.now();
        if (idx !== lastSegIdxRef.current && now - lastBounceRef.current > 55) {
          lastSegIdxRef.current = idx;
          lastBounceRef.current = now;
          setTickBounce(prev => (prev === "a" ? "b" : "a"));
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  function land() {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(fallbackRef.current);
    setSpinning(false);
    setDone(true);
    setTickBounce(null);
    const seg = getSegAtPointer();
    if (seg) {
      setResultSlot(seg.slotIdx);
      setLiveLabel(seg.label);
    }
  }

  function spin() {
    if (spinning || done || n <= 1) return;
    lastSegIdxRef.current = -1;
    lastBounceRef.current = 0;
    const pick = Math.floor(Math.random() * n);
    const seg = segments[pick];
    const margin = sliceDeg * 0.15;
    const theta = seg.start + margin + Math.random() * (seg.span - margin * 2);

    setRotation(prev => {
      const current = ((prev % 360) + 360) % 360;
      const targetMod = (360 - theta) % 360;
      const delta = ((targetMod - current) % 360 + 360) % 360;
      return prev + FULL_SPINS * 360 + delta;
    });
    setSpinning(true);
    requestAnimationFrame(() => startRaf());
    fallbackRef.current = setTimeout(land, SPIN_DURATION + 400);
  }

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
    const col = posColor(posKey);
    return (
      <div className="position-wheel-wrap">
        <div className="position-wheel-title">FINAL SLOT</div>
        <div className="pos-auto-reveal" style={{ background: col.fill, color: col.text }}>
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

        <div className="pos-wheel-stage">
          <div
            ref={rotorRef}
            className="pos-wheel-rotor"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.12, 0.8, 0.18, 1)`
                : "none",
            }}
            onTransitionEnd={() => spinning && land()}
          >
            <svg viewBox="-104 -104 208 208" width="260" height="260">
              {segments.map((seg) => {
                const [x1, y1] = polar(seg.start, 100);
                const [x2, y2] = polar(seg.start + seg.span, 100);
                const large = seg.span > 180 ? 1 : 0;
                const isResult = done && seg.slotIdx === resultSlot;
                return (
                  <g key={seg.slotIdx}>
                    <path
                      d={`M 0 0 L ${x1} ${y1} A 100 100 0 ${large} 1 ${x2} ${y2} Z`}
                      fill={seg.color.fill}
                      stroke="#0a0a0a"
                      strokeWidth="1.5"
                      opacity={done && !isResult ? 0.28 : 1}
                    />
                    {seg.span > 14 && (
                      <text
                        transform={`rotate(${seg.start + seg.span / 2}) translate(0 -70) rotate(90)`}
                        fill="rgba(255,255,255,0.95)"
                        fontSize={seg.span > 60 ? 11 : seg.span > 35 ? 9.5 : seg.span > 20 ? 8 : 7}
                        fontWeight="800"
                        fontFamily="var(--font-head)"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.7)", strokeWidth: 3 }}
                      >
                        {seg.label}
                      </text>
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
            style={done ? { background: resultSeg?.color.fill, color: resultSeg?.color.text, borderColor: resultSeg?.color.fill } : {}}
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

      <div className="spin-hint">
        {done
          ? `You're signing a ${resultSeg?.label || ""} — lock it in!`
          : spinning
            ? "Where she stops, nobody knows…"
            : "Spin to reveal your position slot"}
      </div>

      {!done ? (
        <button
          className={`spin-btn${spinning ? " disabled" : ""}`}
          onClick={spin}
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

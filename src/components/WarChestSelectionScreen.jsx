import { useState, useMemo, useEffect } from "react";
import { WAR_CHEST_VALUES } from "../hooks/draftUtils";
import KitSwatch from "./KitSwatch";
import SquadTimer from "./SquadTimer";

function formatChest(v) {
  if (v === 0) return "ZERO";
  if (v >= 1000) return `£${v / 1000}B`;
  return `£${v}m`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The two SVG halves share the same 48×40 viewBox so coordinates align perfectly.
function ChestBase() {
  return (
    <svg className="wc-split-svg wc-split-base" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="2"  y="20" width="44" height="18" rx="2"   fill="#8B4513" />
      <rect x="4"  y="22" width="40" height="14" rx="1"   fill="#A0522D" />
      <rect x="19" y="18" width="10" height="7"  rx="1"   fill="#DAA520" />
      <rect x="21" y="20" width="6"  height="3"  rx="0.5" fill="#B8860B" />
      <rect x="6"  y="28" width="36" height="2"  rx="1"   fill="#6B3410" opacity="0.5" />
    </svg>
  );
}

function ChestLid() {
  return (
    <svg className="wc-split-svg wc-split-lid" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20 Q2 4 24 4 Q46 4 46 20 Z"       fill="#8B4513" />
      <path d="M4 20 Q4 6 24 6 Q44 6 44 20 Z"       fill="#A0522D" />
      <path d="M4 20 Q24 8 44 20" fill="none" stroke="#DAA520" strokeWidth="1" />
      <circle cx="24" cy="14" r="2.5" fill="#DAA520" />
    </svg>
  );
}

// Animated chest: progresses through phases driven by parent
function AnimatedChest({ phase, value }) {
  const lidOpen = phase === "opening" || phase === "risen" || phase === "fanfare";
  const showGlow = phase === "opening" || phase === "risen";
  const showRays = phase === "opening";
  const showItem = phase === "risen" || phase === "fanfare";

  return (
    <div className={`wc-anim-chest wc-anim-chest--${phase}`}>
      {/* Lid — rotates backward on Y-axis when open */}
      <div className="wc-anim-lid-wrap">
        <div className={`wc-anim-lid ${lidOpen ? "wc-anim-lid--open" : ""}`}>
          <ChestLid />
        </div>
      </div>

      {/* Base always stays */}
      <ChestBase />

      {/* Golden glow from inside the open chest */}
      {showGlow && <div className="wc-anim-glow" />}

      {/* Light rays burst outward when lid first opens */}
      {showRays && (
        <div className="wc-anim-rays" aria-hidden="true">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="wc-anim-ray" style={{ "--ray-i": i }} />
          ))}
        </div>
      )}

      {/* Value floats up like an item being obtained */}
      {showItem && (
        <div className="wc-anim-item" aria-hidden="true">
          <div className="wc-anim-item-value">{formatChest(value)}</div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="wc-anim-sparkle" style={{ "--sp-i": i }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WarChestSelectionScreen({ draft, onSelect, deadline }) {
  const managerIdx = draft.wcCurrentManagerIdx;
  const manager = draft.managers[managerIdx];
  if (!manager) return null;

  const values = useMemo(() => {
    const base = WAR_CHEST_VALUES[draft.difficulty] || WAR_CHEST_VALUES.hard;
    return shuffle([...base]);
  }, [managerIdx, draft.difficulty]);

  const [pickedIdx, setPickedIdx] = useState(null);
  const [phase, setPhase] = useState("idle");

  function handlePick(idx) {
    if (pickedIdx !== null) return;
    setPickedIdx(idx);
    setPhase("shaking");
    setTimeout(() => setPhase("opening"), 500);
    setTimeout(() => setPhase("risen"),   1300);
    setTimeout(() => setPhase("fanfare"), 2200);
  }

  function handleConfirm() {
    if (pickedIdx === null) return;
    onSelect(values[pickedIdx]);
  }

  const pickedValue = pickedIdx !== null ? values[pickedIdx] : null;

  const subText =
    phase === "idle"    ? `${manager.dofName}, pick your war chest`
    : phase === "shaking" ? "Something's inside…"
    : phase === "opening" ? "Opening…"
    : "";

  return (
    <div className="setup-screen">

      {/* ── Zelda-style fanfare overlay ── */}
      {phase === "fanfare" && (
        <div className="wc-fanfare-overlay">
          <div className="wc-fanfare-backdrop" />
          <div className="wc-zelda-box">
            <div className="wc-zelda-inner">
              <div className="wc-zelda-label">YOU OBTAINED</div>
              <div className={`wc-zelda-value ${pickedValue === 0 ? "wc-zelda-value--zero" : ""}`}>
                {formatChest(pickedValue)}
              </div>
              <div className="wc-zelda-sub">
                {pickedValue === 0
                  ? "Free transfers only — make it work!"
                  : "Your total squad budget"}
              </div>
              <button className="wc-zelda-confirm" onClick={handleConfirm}>
                BUILD YOUR SQUAD <span className="wc-zelda-cursor">▶</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="setup-card">
        <div className="wc-selection-header">
          <div className="wc-mode-badge">WAR CHEST</div>
          {deadline && <SquadTimer deadline={deadline} />}
          <div className="wc-kit-row">
            <KitSwatch
              primary={manager.primaryColor}
              secondary={manager.secondaryColor}
              pattern={manager.pattern}
              size={32}
            />
            <span className="wc-manager-name">{manager.clubName}</span>
          </div>
          <p className="wc-selection-sub">{subText}</p>
        </div>

        <div className="wc-chests">
          {values.map((val, idx) => {
            const isPicked = pickedIdx === idx;
            const isFaded  = pickedIdx !== null && !isPicked;
            return (
              <button
                key={idx}
                className={`wc-chest ${isPicked ? "wc-chest-picked" : ""} ${isFaded ? "wc-chest-faded" : ""}`}
                onClick={() => handlePick(idx)}
                disabled={pickedIdx !== null}
              >
                {isPicked ? (
                  <AnimatedChest phase={phase} value={val} />
                ) : (
                  /* Closed chest SVG (static for unpicked chests) */
                  <svg className="wc-chest-svg" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2"  y="20" width="44" height="18" rx="2"   fill="#8B4513" />
                    <rect x="4"  y="22" width="40" height="14" rx="1"   fill="#A0522D" />
                    <rect x="19" y="18" width="10" height="7"  rx="1"   fill="#DAA520" />
                    <rect x="21" y="20" width="6"  height="3"  rx="0.5" fill="#B8860B" />
                    <path d="M2 20 Q2 4 24 4 Q46 4 46 20 Z"       fill="#8B4513" />
                    <path d="M4 20 Q4 6 24 6 Q44 6 44 20 Z"       fill="#A0522D" />
                    <path d="M4 20 Q24 8 44 20" fill="none" stroke="#DAA520" strokeWidth="1" />
                    <circle cx="24" cy="14" r="2.5" fill="#DAA520" />
                    <rect x="6"  y="28" width="36" height="2"  rx="1"   fill="#6B3410" opacity="0.5" />
                  </svg>
                )}
                <div className="wc-chest-num">CHEST {idx + 1}</div>
              </button>
            );
          })}
        </div>

        {pickedIdx === null && (
          <p className="wc-selection-hint">
            All 5 chests contain different values — you won&apos;t know until you open it
          </p>
        )}
      </div>
    </div>
  );
}

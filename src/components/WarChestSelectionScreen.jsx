import { useState, useMemo } from "react";
import { WAR_CHEST_VALUES } from "../hooks/draftUtils";
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

function ChestIcon() {
  return (
    <div className="bw-wc-chest-icon">
      <div className="bw-wc-chest-lid" />
      <div className="bw-wc-chest-lid-glow" />
      <div className="bw-wc-chest-body" />
    </div>
  );
}

function RevealStage({ phase }) {
  return (
    <div className="bw-wc-stage">
      <div className="bw-wc-rays" />
      <div className="bw-wc-glow" />
      <div className="bw-wc-beam" />
      <div className="bw-wc-sparkle bw-wc-sparkle-1" />
      <div className="bw-wc-sparkle bw-wc-sparkle-2" />
      <div className="bw-wc-sparkle bw-wc-sparkle-3" />
      <div className="bw-wc-sparkle bw-wc-sparkle-4" />
      {(phase === "risen" || phase === "obtained") && (
        <div className="bw-wc-medallion">
          <span>£</span>
        </div>
      )}
      <div className="bw-wc-open-chest">
        <div className="bw-wc-open-lid" />
        <div className="bw-wc-open-glow-slot" />
        <div className="bw-wc-open-body">
          <div className="bw-wc-open-band" />
          <div className="bw-wc-open-lock" />
        </div>
      </div>
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
  const [phase, setPhase] = useState("pick"); // pick -> opening -> risen -> obtained

  function handlePick(idx) {
    if (pickedIdx !== null) return;
    setPickedIdx(idx);
    setPhase("opening");
    setTimeout(() => setPhase("risen"), 700);
    setTimeout(() => setPhase("obtained"), 1700);
  }

  function handleConfirm() {
    if (pickedIdx === null) return;
    onSelect(values[pickedIdx]);
  }

  const pickedValue = pickedIdx !== null ? values[pickedIdx] : null;

  if (phase !== "pick") {
    return (
      <div className="bw-wc-screen">
        <div className="bw-wc-header">
          <span className="bw-wc-header-label">WAR CHEST</span>
          <span className="bw-wc-header-meta">{manager.clubName} · {manager.dofName}</span>
        </div>
        <RevealStage phase={phase} />
        {phase === "obtained" && (
          <div className="bw-wc-obtained-wrap">
            <div className="bw-wc-obtained-box">
              <div className="bw-wc-obtained-label">YOU OBTAINED</div>
              <div className={`bw-wc-obtained-value${pickedValue === 0 ? " zero" : ""}`}>
                {formatChest(pickedValue)}
              </div>
              <div className="bw-wc-obtained-sub">
                {pickedValue === 0 ? "Free transfers only — make it work!" : "Your total squad budget"}
              </div>
            </div>
            <button className="bw-wc-build-btn" onClick={handleConfirm}>
              BUILD YOUR SQUAD →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bw-wc-screen">
      <div className="bw-wc-header">
        <span className="bw-wc-header-label">WAR CHEST</span>
        <span className="bw-wc-header-meta">{manager.clubName} · {manager.dofName}</span>
      </div>

      {deadline && (
        <div className="bw-wc-timer-wrap">
          <SquadTimer deadline={deadline} />
        </div>
      )}

      <div className="bw-wc-intro">
        <div className="bw-wc-intro-title">Pick your war chest, gaffer.</div>
        <div className="bw-wc-intro-sub">One holds the biggest budget. Choose blind.</div>
      </div>

      <div className="bw-wc-grid">
        {values.slice(0, 3).map((_, idx) => (
          <button key={idx} className="bw-wc-chest-tile" onClick={() => handlePick(idx)}>
            <ChestIcon />
            <span className="bw-wc-chest-label">CHEST {idx + 1}</span>
          </button>
        ))}
      </div>
      <div className="bw-wc-grid bw-wc-grid-row2">
        <div className="bw-wc-grid-spacer" />
        {values.slice(3, 5).map((_, i) => {
          const idx = i + 3;
          return (
            <button key={idx} className="bw-wc-chest-tile" onClick={() => handlePick(idx)}>
              <ChestIcon />
              <span className="bw-wc-chest-label">CHEST {idx + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="bw-wc-footnote">
        All five hold different budgets — you won&apos;t know until you open it.
      </div>
    </div>
  );
}

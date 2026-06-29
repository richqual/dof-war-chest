import { useState, useEffect, useRef } from "react";
import KitSwatch from "./KitSwatch";
import { DRAFT_ROULETTE_ERAS, DRAFT_ROULETTE_LEAGUES } from "../hooks/draftUtils";

function findLabel(list, key) {
  return list.find(o => o.key === key)?.label ?? key;
}

const ITEM_H = 68; // px per drum item
const VISIBLE = 3; // items shown in window
const SPIN_DURATION = 1400; // ms fast spin — shorter so decel starts sooner

// Build a long looping strip ending on the final item, with padding after
// so items are still visible above and below the winner on landing.
function buildStrip(options, finalKey) {
  const loops = 8;
  const strip = [];
  for (let i = 0; i < loops; i++) {
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    strip.push(...shuffled);
  }
  // Winner in center
  strip.push(options.find(o => o.key === finalKey) ?? options[0]);
  // Padding after so the slots below the winner are filled
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  strip.push(...shuffled.slice(0, Math.floor(VISIBLE / 2) + 1));
  return strip;
}

function DrumReel({ options, finalKey, spinning, onLanded }) {
  const [strip] = useState(() => buildStrip(options, finalKey));
  const trackRef = useRef(null);
  const hasSpun = useRef(false);

  // Winner is the item just before the trailing padding
  const paddingCount = Math.floor(VISIBLE / 2) + 1;
  const finalIndex = strip.length - 1 - paddingCount;
  // Offset so center item is visible (window shows VISIBLE items, center = index 1)
  const centerOffset = Math.floor(VISIBLE / 2);

  // Rest position: show item 3 in center
  const restY = -(3 * ITEM_H) + (centerOffset * ITEM_H);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${restY}px)`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!spinning || hasSpun.current) return;
    hasSpun.current = true;
    const el = trackRef.current;
    if (!el) return;

    // 1. Snap to top, start CSS spin loop
    el.style.transition = "none";
    el.style.transform = "translateY(0)";
    el.classList.add("dr-drum-spinning");

    // 2. After spin duration: stop loop, glide to final
    const t = setTimeout(() => {
      el.classList.remove("dr-drum-spinning");
      // Snap to a few items before final (no transition)
      const snapY = -((finalIndex - 10) * ITEM_H) + (centerOffset * ITEM_H);
      el.style.transition = "none";
      el.style.transform = `translateY(${snapY}px)`;
      // Force reflow
      el.getBoundingClientRect();
      // Long drawn-out deceleration — 10 items to crawl through
      const targetY = -(finalIndex * ITEM_H) + (centerOffset * ITEM_H);
      el.style.transition = `transform 4.2s cubic-bezier(0.02, 0.82, 0.06, 1)`;
      el.style.transform = `translateY(${targetY}px)`;

      setTimeout(onLanded, 4300);
    }, SPIN_DURATION);

    return () => clearTimeout(t);
  }, [spinning]); // eslint-disable-line react-hooks/exhaustive-deps

  const landed = !spinning && hasSpun.current;

  return (
    <div className={`dr-drum-window${landed ? " dr-drum-window-landed" : ""}`}>
      {/* Gradient fades top and bottom */}
      <div className="dr-drum-fade dr-drum-fade-top" />
      <div className="dr-drum-fade dr-drum-fade-bottom" />
      {/* Center highlight */}
      <div className="dr-drum-winline" />
      {/* Scrolling track */}
      <div className="dr-drum-track" ref={trackRef}>
        {strip.map((opt, i) => (
          <div
            key={i}
            className={`dr-drum-item${landed && i === finalIndex ? " dr-drum-item-winner" : ""}`}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DraftRouletteScreen({ draft, onStart }) {
  const { managers, draftRoulette } = draft;
  const humanIndices = managers
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => !m.isComputer)
    .map(({ i }) => i);

  const [stepPos, setStepPos] = useState(0);
  const [phase, setPhase] = useState("waiting"); // waiting | spinning-era | spinning-league | revealed | summary
  const [completed, setCompleted] = useState([]);

  const timers = useRef([]);
  function addTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const showEra = !!draftRoulette?.era;
  const showLeague = !!draftRoulette?.league;

  const curMgrIdx = stepPos < humanIndices.length ? humanIndices[stepPos] : null;
  const curManager = curMgrIdx !== null ? managers[curMgrIdx] : null;

  function spin() {
    if (phase !== "waiting" || !curManager) return;
    setPhase(showEra ? "spinning-era" : "spinning-league");
  }

  function eraLanded() {
    if (showLeague) {
      addTimer(() => setPhase("spinning-league"), 500);
    } else {
      setPhase("revealed");
    }
  }

  function leagueLanded() {
    setPhase("revealed");
  }

  function next() {
    setCompleted(prev => [...prev, curMgrIdx]);
    const nextPos = stepPos + 1;
    if (nextPos >= humanIndices.length) {
      setPhase("summary");
    } else {
      setStepPos(nextPos);
      setPhase("waiting");
    }
  }

  function skipToEnd() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCompleted(humanIndices);
    setStepPos(humanIndices.length);
    setPhase("summary");
  }

  if (humanIndices.length === 0) {
    onStart();
    return null;
  }

  /* ── SUMMARY ─────────────────────────────────────────────────── */
  if (phase === "summary") {
    return (
      <div className="order-draw-screen">
        <div className="order-draw-box order-draw-box-wide">
          <div className="order-draw-title">🎰 DRAFT ROULETTE RESULTS</div>
          <div className="order-draw-list">
            {managers.map((m, i) => (
              <div key={i} className="order-draw-row visible roulette-summary-row">
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`rs-${i}`} size={22} />
                <span className="order-draw-club">{m.clubName || m.name}</span>
                {m.isComputer && <span className="cpu-tag">CPU</span>}
                <span className="roulette-summary-pool">
                  {showEra && findLabel(DRAFT_ROULETTE_ERAS, m.assignedEra)}
                  {showEra && showLeague && " · "}
                  {showLeague && findLabel(DRAFT_ROULETTE_LEAGUES, m.assignedLeague)}
                </span>
              </div>
            ))}
          </div>
          <button className="tt-continue-btn order-draw-go" onClick={onStart}>▶ CONTINUE</button>
        </div>
      </div>
    );
  }

  /* ── SPIN SCREEN ─────────────────────────────────────────────── */
  const isSpinningEra = phase === "spinning-era";
  const isSpinningLeague = phase === "spinning-league";

  return (
    <div className="order-draw-screen">
      <div className="order-draw-box">
        <div className="order-draw-title">🎰 DRAFT ROULETTE</div>

        {curManager && (
          <div className="draw-current-team">
            <KitSwatch primary={curManager.primaryColor} secondary={curManager.secondaryColor} pattern={curManager.pattern || "plain"} uid="cur-r" size={26} />
            <div className="draw-current-info">
              <span className="draw-current-name">{curManager.clubName || curManager.name}</span>
            </div>
          </div>
        )}

        <div className="draw-instruction">
          {phase === "waiting" && "Spin to reveal your pool"}
          {phase === "spinning-era" && "Spinning ERA…"}
          {phase === "spinning-league" && "Spinning LEAGUE…"}
          {phase === "revealed" && "Pool revealed — lock it in!"}
        </div>

        {/* Drums — one or two side by side */}
        <div className="dr-displays">
          {showEra && (
            <div className="dr-display-col">
              <DrumReel
                key={`era-${stepPos}`}
                options={DRAFT_ROULETTE_ERAS}
                finalKey={curManager?.assignedEra}
                spinning={isSpinningEra}
                onLanded={eraLanded}
              />
              <span className="dr-display-label">ERA</span>
            </div>
          )}
          {showLeague && (
            <div className="dr-display-col">
              <DrumReel
                key={`league-${stepPos}`}
                options={DRAFT_ROULETTE_LEAGUES}
                finalKey={curManager?.assignedLeague}
                spinning={isSpinningLeague}
                onLanded={leagueLanded}
              />
              <span className="dr-display-label">LEAGUE</span>
            </div>
          )}
        </div>

        {phase === "waiting" && (
          <button className="spin-btn" onClick={spin}>🎰 SPIN</button>
        )}
        {phase === "revealed" && (
          <button className="spin-confirm-btn" onClick={next}>▶ NEXT PLAYER</button>
        )}

        <button className="sim-btn secondary order-draw-skip" onClick={skipToEnd}>
          ⏭ SKIP TO END
        </button>

        {completed.length > 0 && (
          <div className="draw-results">
            <div className="draw-results-label">SPUN SO FAR</div>
            {completed.map(idx => {
              const m = managers[idx];
              return (
                <div key={idx} className="draw-result-row">
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`rr-${idx}`} size={16} />
                  <span className="order-draw-club">{m.clubName || m.name}</span>
                  <span className="roulette-summary-pool">
                    {showEra && findLabel(DRAFT_ROULETTE_ERAS, m.assignedEra)}
                    {showEra && showLeague && " · "}
                    {showLeague && findLabel(DRAFT_ROULETTE_LEAGUES, m.assignedLeague)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

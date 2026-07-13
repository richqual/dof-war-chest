import { useState, useEffect, useRef } from "react";
import KitSwatch from "./KitSwatch";

function BallChip({ children, size = 34 }) {
  const inner = Math.round(size * 0.56);
  return (
    <div className="bw-draw-ball-chip" style={{ width: size, height: size }}>
      <span className="bw-draw-ball-chip-num" style={{ width: inner, height: inner, fontSize: Math.max(8, Math.round(size * 0.3)) }}>
        {children}
      </span>
    </div>
  );
}

function clubName(m) {
  return m.teamName || m.clubName || m.name;
}

function roundAbbrev(is8, pi) {
  return is8 ? `QF${pi + 1}` : `SF${pi + 1}`;
}

// Classic fixture list — one row per pairing, growing left-to-right as balls
// land. No ball numbers here (those only matter until a team is placed) —
// once a slot is filled it's just a normal fixture row, same for a 4-team
// (2 rows) or 8-team (4 rows) draw.
function FixtureList({ managers, drawOrder, revealedCount, is8, activePairing, numPairings }) {
  return (
    <div className="bw-draw-fixture-list">
      {Array.from({ length: numPairings }, (_, pi) => {
        const slotA = pi * 2, slotB = pi * 2 + 1;
        const ma = revealedCount > slotA ? managers[drawOrder[slotA]] : null;
        const mb = revealedCount > slotB ? managers[drawOrder[slotB]] : null;
        const complete = ma && mb;
        const isActive = !complete && pi === activePairing;
        return (
          <div key={pi} className={`bw-draw-fixture-row ${isActive ? "active" : ""}`}>
            <span className="bw-draw-fixture-round">{roundAbbrev(is8, pi)}</span>
            <span className={`bw-draw-fixture-team ${!ma ? "tbd" : ""}`}>
              {ma && <KitSwatch primary={ma.primaryColor} secondary={ma.secondaryColor} pattern={ma.pattern} uid={`fx${pi}a`} size={18} />}
              <span className="bw-draw-fixture-team-name">{ma ? clubName(ma) : "?"}</span>
            </span>
            <span className="bw-draw-fixture-vs">vs</span>
            <span className={`bw-draw-fixture-team ${!mb ? "tbd" : ""}`}>
              {mb && <KitSwatch primary={mb.primaryColor} secondary={mb.secondaryColor} pattern={mb.pattern} uid={`fx${pi}b`} size={18} />}
              <span className="bw-draw-fixture-team-name">{mb ? clubName(mb) : "?"}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DrawScreen({ draft, onComplete, isHost = true }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { managers } = draft;
  const n = managers.length; // 4 or 8
  const numPairings = n / 2; // 2 or 4
  const is8 = n === 8;

  // Generate the shuffled draw order once on mount. drawOrder[i] is the
  // manager index whose ball comes out of the bowl at step i, landing in
  // bracket slot i (pairing = floor(i/2), slot = i % 2).
  const [drawOrder] = useState(() => {
    const arr = managers.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  // phase: "numbers" (ball numbers handed out) → "drawing" (live bowl draw) → "done" (bracket locked)
  const [phase, setPhase] = useState("numbers");
  const [step, setStep] = useState(0);                     // which ball (0..n-1) is currently animating
  const [ballPhase, setBallPhase] = useState("spinning");   // spinning | landed — only meaningful while phase === "drawing"
  const [listAdvanced, setListAdvanced] = useState(false);  // lags the ball: list row fills in shortly AFTER the ball lands

  const timers = useRef([]);
  function addTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (phase !== "drawing") return;
    if (ballPhase === "spinning") {
      addTimer(() => setBallPhase("landed"), 1600);
    } else {
      // Ball has revealed its number — fill the matching list row a beat later
      // so the eye reads the ball first, then sees the name drop into the draw.
      addTimer(() => setListAdvanced(true), 1000);
      addTimer(() => {
        if (step + 1 >= n) {
          setPhase("done");
        } else {
          setStep(s => s + 1);
          setBallPhase("spinning");
          setListAdvanced(false);
        }
      }, 2400);
    }
  }, [phase, step, ballPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  function startDraw() {
    setStep(0);
    setBallPhase("spinning");
    setListAdvanced(false);
    setPhase("drawing");
  }

  // Instantly resolve the rest of the draw — the outcome (drawOrder) was
  // already fixed on mount, skipping just cuts the theatre short.
  function skipDraw() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("done");
  }

  const roundLabel = is8 ? "QUARTER-FINAL" : "SEMI-FINAL";
  const subText = is8
    ? (draft.warChest
      ? "Quarter-finals: 1 leg · Semi-finals: 1 leg · Grand Final: 1 leg"
      : "2-legged quarter-finals · 2-legged semi-finals · 1-leg Grand Final")
    : draft.warChest
      ? "Semi-finals: 1 leg · Grand Final: 1 leg"
      : "Semi-finals: 2 legs (aggregate) · Grand Final: 1 leg";

  // Non-host devices don't run the draw themselves — the drawOrder above is
  // generated locally and would show a different (fake) draw than whatever
  // the host actually pulls. Ball numbers are just each manager's fixed list
  // position though, so those are safe to show while we wait.
  if (!isHost) {
    return (
      <div className="setup-screen">
        <div className="bw-frame">
          <div className="bw-banner"><span className="bw-banner-title">THE DRAW</span></div>
          <div className="bw-body">
            <div className="bw-draw-num-list">
              {managers.map((m, i) => (
                <div key={i} className="bw-draw-num-row">
                  <BallChip size={34}>{i + 1}</BallChip>
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`dnh${i}`} size={24} />
                  <span className="bw-draw-num-name">{clubName(m)}</span>
                </div>
              ))}
            </div>
            <div className="mp-waiting-screen" style={{ marginTop: 14 }}>
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">Waiting for the host to make the draw…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── FRAME 1 · NUMBERS ASSIGNED ──────────────────────────────── */
  if (phase === "numbers") {
    return (
      <div className="setup-screen">
        <div className="bw-frame">
          <div className="bw-banner"><span className="bw-banner-title">THE DRAW</span></div>
          <div className="bw-draw-headline">Ball numbers assigned</div>
          <div className="bw-draw-subtitle">Every {roundLabel.toLowerCase()}ist gets a number. The bowl decides the rest.</div>
          <div className="bw-body">
            <div className="bw-draw-num-list">
              {managers.map((m, i) => (
                <div key={i} className="bw-draw-num-row">
                  <BallChip size={36}>{i + 1}</BallChip>
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`dn${i}`} size={26} />
                  <span className="bw-draw-num-name">{clubName(m)}</span>
                </div>
              ))}
            </div>
            <button className="bw-cta-arcade" style={{ marginTop: 12 }} onClick={startDraw}>START THE DRAW →</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FRAME 3 · BRACKET LOCKED ─────────────────────────────────── */
  if (phase === "done") {
    return (
      <div className="setup-screen">
        <div className="bw-frame">
          <div className="bw-banner"><span className="bw-banner-title">THE DRAW</span></div>
          <div className="bw-draw-headline" style={{ fontSize: 26 }}>Tournament Draw</div>
          <div className="bw-draw-subtitle">{subText}</div>
          <div className="bw-body">
            <FixtureList managers={managers} drawOrder={drawOrder} revealedCount={n} is8={is8} activePairing={-1} numPairings={numPairings} />
            <p className="bw-draw-complete-text">The draw has been made. Let battle commence.</p>
            <button className="bw-cta-arcade" onClick={() => onComplete(drawOrder)}>▶ BEGIN TOURNAMENT</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FRAME 2 · LIVE BOWL DRAW ─────────────────────────────────── */
  const pairing = Math.floor(step / 2);
  const slotInPairing = step % 2;
  const revealedCount = step + (listAdvanced ? 1 : 0);
  const currentTeam = managers[drawOrder[step]];

  return (
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-banner bw-banner-row">
          <span className="bw-banner-title">THE DRAW</span>
          <span className="bw-banner-meta">Ball {step + 1} of {n}</span>
        </div>
        <div className="bw-draw-subtitle">
          Filling <strong>{roundLabel} {pairing + 1}, slot {slotInPairing + 1}</strong>…
        </div>

        <div className="bw-draw-stage">
          <div className="bw-draw-glow" />
          <div className={`bw-draw-hero ${ballPhase === "spinning" ? "spinning" : ""}`}>
            <div className="bw-draw-hero-ball">
              <div className="bw-draw-hero-window">
                {ballPhase === "landed" ? drawOrder[step] + 1 : "?"}
              </div>
            </div>
          </div>
          {ballPhase === "landed" && (
            <div className="bw-draw-result-banner">
              <span className="bw-draw-result-pill">BALL {drawOrder[step] + 1}</span>
              <span className="bw-draw-result-name">{clubName(currentTeam)}</span>
            </div>
          )}
        </div>

        <div className="bw-body">
          <div className="bw-draw-fill-title">The draw so far</div>
          <FixtureList managers={managers} drawOrder={drawOrder} revealedCount={revealedCount} is8={is8} activePairing={pairing} numPairings={numPairings} />
          <button className="bw-cta-secondary" style={{ marginTop: 12 }} onClick={skipDraw}>⏭ SKIP DRAW</button>
        </div>
      </div>
    </div>
  );
}

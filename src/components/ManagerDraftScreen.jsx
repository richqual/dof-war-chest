import { useState, useEffect, useRef, useMemo } from "react";
import { MANAGERS, TIER_LABELS, TIER_COLORS, TIER_BG } from "../data/managers";
import { ERA_LABELS, ERA_COLORS, ERA_BG } from "../data/players";

const LEAGUE_CONFIG = {
  all:            { label: "ANY LEAGUE",   flag: "🌍",  key: "all" },
  premier_league: { label: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", key: "premier_league" },
  la_liga:        { label: "La Liga",      flag: "🇪🇸",  key: "la_liga" },
  bundesliga:     { label: "Bundesliga",   flag: "🇩🇪",  key: "bundesliga" },
  serie_a:        { label: "Serie A",      flag: "🇮🇹",  key: "serie_a" },
  ligue_1:        { label: "Ligue 1",      flag: "🇫🇷",  key: "ligue_1" },
};

function getManagerLeague(m) {
  return m.league || "premier_league";
}

function getLeaguePool(leagueKey) {
  if (leagueKey === "all") return MANAGERS;
  return MANAGERS.filter(m => getManagerLeague(m) === leagueKey);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// CSS marquee carousel — scrolls through manager name pills
// Shuffles the order whenever pool size changes (new turn) for variety
function Carousel({ pool, spinning, allRevealed }) {
  const shuffledPills = useMemo(() => {
    const s = shuffle([...pool]);
    return [...s, ...s]; // doubled for seamless loop
  }, [pool.length]); // re-shuffle each new turn

  const trackClass = `mgr-slot-track${spinning ? " spinning" : allRevealed ? " paused" : ""}`;
  return (
    <div className="mgr-slot-wrap">
      <div className="mgr-slot-window">
        <div className={trackClass}>
          {shuffledPills.map((m, i) => (
            <span
              key={`${m.id}-${i}`}
              className="mgr-slot-pill"
              style={{
                background: TIER_BG[m.tier],
                color: TIER_COLORS[m.tier],
                border: `1px solid ${TIER_COLORS[m.tier]}55`,
              }}
            >
              {m.name}
            </span>
          ))}
        </div>
      </div>
      {spinning && (
        <div className="mgr-slot-spinning-label">⚙ THE MERRY-GO-ROUND SPINS...</div>
      )}
    </div>
  );
}

function ManagerCard({ manager, onPick, disabled, highlighted }) {
  const tierColor = TIER_COLORS[manager.tier];
  const tierBg = TIER_BG[manager.tier];
  const eraColor = ERA_COLORS[manager.era];
  const eraBg = ERA_BG[manager.era];

  return (
    <div className={`mgr-card ${highlighted ? "mgr-card-highlighted" : ""}`}>
      <div className="mgr-card-head">
        <span className="era-badge" style={{ background: eraBg, color: eraColor, border: `1px solid ${eraColor}55` }}>
          {ERA_LABELS[manager.era]}
        </span>
        <span className="mgr-tier-badge" style={{ background: tierBg, color: tierColor, border: `1px solid ${tierColor}88` }}>
          {TIER_LABELS[manager.tier]}
        </span>
      </div>
      <div className="mgr-name">{manager.name}</div>
      <div className="mgr-club">{manager.club}</div>
      <div className="mgr-years">{manager.years}</div>
      <div className="mgr-style-label">{manager.styleLabel}</div>
      <div className="mgr-flavour">"{manager.flavourText}"</div>
      <button className="pick-mgr-btn" onClick={() => onPick(manager)} disabled={disabled}>
        PICK THIS MANAGER
      </button>
    </div>
  );
}

function PicksLog({ assignments, draft }) {
  const entries = Object.entries(assignments);
  if (!entries.length) return null;
  return (
    <div className="mgr-picks-log">
      <div className="mgr-picks-log-title">PICKS SO FAR</div>
      {entries.map(([idx, mgr]) => {
        const club = draft.managers[idx];
        const tierColor = TIER_COLORS[mgr.tier];
        const tierBg = TIER_BG[mgr.tier];
        return (
          <div key={idx} className="mgr-picks-row">
            <span className="mgr-picks-club">{club.dofName || club.name}</span>
            <span className="mgr-picks-arrow">→</span>
            <span className="mgr-picks-name">{mgr.name}</span>
            <span className="mgr-tier-badge" style={{ background: tierBg, color: tierColor, border: `1px solid ${tierColor}88`, fontSize: "6px", padding: "1px 5px" }}>
              {TIER_LABELS[mgr.tier]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LeagueSelector({ onConfirm }) {
  const [selected, setSelected] = useState("all");

  return (
    <div className="mgr-draft-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
        <div className="mgr-draft-sub">Manager Draft — Choose your pool</div>
      </div>

      <div className="mgr-league-prompt">Which league should the managers come from?</div>

      <div className="mgr-league-grid">
        {Object.values(LEAGUE_CONFIG).map(cfg => {
          const count = getLeaguePool(cfg.key).length;
          return (
            <button
              key={cfg.key}
              className={`mgr-league-btn${selected === cfg.key ? " selected" : ""}`}
              onClick={() => setSelected(cfg.key)}
            >
              <span className="mgr-league-flag">{cfg.flag}</span>
              <span className="mgr-league-name">{cfg.label}</span>
              <span className="mgr-league-count">{count} managers</span>
            </button>
          );
        })}
      </div>

      <button className="mgr-go-btn" onClick={() => onConfirm(selected)}>
        ▶ START THE MERRY-GO-ROUND
      </button>
    </div>
  );
}

export default function ManagerDraftScreen({ draft, onAssignManager }) {
  const [phase, setPhase] = useState("league-select");
  const [pickOrder] = useState(() => shuffle(draft.managers.map((_, i) => i)));
  const [pool, setPool] = useState([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [offered, setOffered] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [cpuPick, setCpuPick] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [waitingForGo, setWaitingForGo] = useState(true);
  const [assignments, setAssignments] = useState({});
  const timers = useRef([]);
  const pendingOffer = useRef(null);

  const currentManagerIdx = pickOrder[turnIdx];
  const currentManager = draft.managers[currentManagerIdx];
  const allDone = turnIdx >= pickOrder.length;
  const isHuman = !currentManager?.isComputer;

  function startWithLeague(leagueKey) {
    setPool(shuffle([...getLeaguePool(leagueKey)]));
    setPhase("playing");
    setWaitingForGo(true);
  }

  function clearTimers() {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }

  function spinAndReveal() {
    clearTimers();
    setWaitingForGo(false);
    setSpinning(true);
    setCpuPick(null);
    setRevealed(0);
    setOffered(null);

    // Pre-pick 3 from a fresh shuffle so carousel order ≠ card order
    pendingOffer.current = shuffle([...pool]).slice(0, 3);

    const t0 = setTimeout(() => {
      // Carousel stops — then cards reveal one by one
      setSpinning(false);
      setOffered(pendingOffer.current);
      const t1 = setTimeout(() => setRevealed(1), 1800);
      const t2 = setTimeout(() => setRevealed(2), 4200);
      const t3 = setTimeout(() => setRevealed(3), 6800);
      timers.current = [t1, t2, t3];
    }, 3500);
    timers.current = [t0];
  }

  function skipReveal() {
    clearTimers();
    // Use same pre-picked managers; fall back to fresh pick if spin hadn't started
    setOffered(pendingOffer.current || shuffle([...pool]).slice(0, 3));
    setSpinning(false);
    setRevealed(3);
  }

  // CPU highlights its top pick after all cards are revealed
  useEffect(() => {
    if (!offered || isHuman) return;
    const sorted = [...offered].sort((a, b) => {
      const order = { elite: 0, established: 1, journeyman: 2 };
      return order[a.tier] - order[b.tier];
    });
    const t = setTimeout(() => setCpuPick(sorted[0]), 9500);
    return () => clearTimeout(t);
  }, [offered, currentManagerIdx]);

  // Auto-spin for CPU turns when it's their go
  useEffect(() => {
    if (phase !== "playing") return;
    if (!waitingForGo) return;
    if (isHuman) return;
    const t = setTimeout(() => spinAndReveal(), 800);
    return () => clearTimeout(t);
  }, [phase, waitingForGo, turnIdx]);

  function handlePick(manager) {
    const newPool = pool.filter(m => m.id !== manager.id);
    setPool(shuffle(newPool));
    setCpuPick(null);
    setRevealed(0);
    setOffered(null);

    const newAssignments = { ...assignments, [currentManagerIdx]: manager };
    setAssignments(newAssignments);

    const nextTurn = turnIdx + 1;
    if (nextTurn >= pickOrder.length) {
      onAssignManager(newAssignments);
    } else {
      setTurnIdx(nextTurn);
      setWaitingForGo(true);
    }
  }

  function confirmCpuPick() {
    if (cpuPick) handlePick(cpuPick);
  }

  if (allDone) return null;
  if (phase === "league-select") return <LeagueSelector onConfirm={startWithLeague} />;

  const playerName = currentManager.dofName || currentManager.name;
  const cpuReady = !isHuman && !!cpuPick && revealed >= 3;

  return (
    <div className="mgr-draft-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
        <div className="mgr-draft-sub">Manager Draft — Pick {turnIdx + 1} of {pickOrder.length}</div>
      </div>

      <div className="mgr-turn-banner">
        <span className="mgr-turn-label">
          {spinning
            ? `Spinning the Merry-Go-Round...`
            : waitingForGo && isHuman
              ? `${playerName} — spin to see your options`
              : isHuman && offered
                ? `${playerName}, choose your manager`
                : cpuReady
                  ? `${playerName} has chosen — confirm to continue`
                  : `${playerName} is deliberating...`}
        </span>
        <div className="mgr-turn-dots">
          {pickOrder.map((idx, i) => (
            <span
              key={idx}
              className={`mgr-turn-dot ${i === turnIdx ? "active" : i < turnIdx ? "done" : ""}`}
              title={draft.managers[idx].dofName || draft.managers[idx].name}
            />
          ))}
        </div>
      </div>

      <div className="mgr-main-area">
        <div className="mgr-left-col">
          <Carousel pool={pool} spinning={spinning} allRevealed={revealed >= 3} />

          {waitingForGo && !spinning && isHuman && (
            <button className="mgr-spin-btn" onClick={spinAndReveal}>
              ⚙ SPIN THE MERRY-GO-ROUND
            </button>
          )}

          {(spinning || (!!offered && revealed < 3)) && (
            <button className="mgr-skip-btn" onClick={skipReveal}>
              SKIP ⏩
            </button>
          )}

          {!spinning && offered && (
            <>
              <div className="mgr-instruction">
                {isHuman
                  ? revealed < 3
                    ? "The Merry-Go-Round is revealing your options..."
                    : "Three managers offered — pick one, the rest return to the pool."
                  : cpuReady
                    ? `${playerName} picks ${cpuPick.name}.`
                    : "Deliberating..."}
              </div>
              <div className="mgr-cards-row">
                {offered.slice(0, revealed).map(mgr => (
                  <ManagerCard
                    key={mgr.id}
                    manager={mgr}
                    onPick={isHuman ? handlePick : () => {}}
                    disabled={!isHuman || revealed < 3}
                    highlighted={cpuPick?.id === mgr.id}
                  />
                ))}
              </div>
              {!isHuman && (
                <button
                  className={`mgr-next-btn ${cpuReady ? "ready" : "waiting"}`}
                  onClick={confirmCpuPick}
                  disabled={!cpuReady}
                >
                  {cpuReady ? "CONFIRM & NEXT →" : "DELIBERATING..."}
                </button>
              )}
            </>
          )}
        </div>

        <PicksLog assignments={assignments} draft={draft} />
      </div>
    </div>
  );
}

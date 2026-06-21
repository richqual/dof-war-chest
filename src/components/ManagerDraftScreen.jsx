import { useState, useEffect, useRef, useMemo } from "react";
import { MANAGERS, TIER_LABELS, TIER_COLORS, TIER_BG } from "../data/managers";
import { ERA_LABELS, ERA_COLORS, ERA_BG } from "../data/players";

const LEAGUE_CONFIG = [
  { label: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", key: "premier_league" },
  { label: "La Liga",        flag: "🇪🇸", key: "la_liga" },
  { label: "Serie A",        flag: "🇮🇹", key: "serie_a" },
  { label: "Bundesliga",     flag: "🇩🇪", key: "bundesliga" },
  { label: "Ligue 1",        flag: "🇫🇷", key: "ligue_1" },
  { label: "Legends",        flag: "⚜️", key: "legends" },
];

const TIER_CONFIG = [
  { label: "Elite",       key: "elite" },
  { label: "Established", key: "established" },
  { label: "Journeyman",  key: "journeyman" },
];

function getManagerLeague(m) {
  return m.league || "la_liga";
}

function getFilteredPool(leagues, tiers) {
  return MANAGERS.filter(m =>
    leagues.includes(getManagerLeague(m)) && tiers.includes(m.tier)
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dedupByName(arr) {
  const seen = new Set();
  return arr.filter(m => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });
}

function Carousel({ pool, spinning, allRevealed }) {
  const shuffledPills = useMemo(() => {
    const s = shuffle([...pool]);
    return [...s, ...s];
  }, [pool.length]);

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
      <div className="mgr-club-years"><span className="mgr-club-name">{manager.club}</span> · {manager.years}</div>
      <div className="mgr-style-label">{manager.styleLabel}</div>
      <div className="mgr-flavour">"{manager.flavourText}"</div>
      {manager.preferredArchetypes?.length > 0 && (
        <div className="mgr-preferred">
          <span className="mgr-preferred-label">Prefers:</span>
          {manager.preferredArchetypes.map(a => (
            <span key={a} className="mgr-preferred-tag">{a}</span>
          ))}
        </div>
      )}
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
        return (
          <div key={idx} className="mgr-picks-row">
            <span className="mgr-picks-club">{club.dofName || club.name}</span>
            <span className="mgr-picks-arrow">→</span>
            <span className="mgr-picks-name">{mgr.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function PoolSelector({ onConfirm }) {
  const allLeagues = LEAGUE_CONFIG.map(l => l.key).filter(k => k !== "legends");
  const allTiers = TIER_CONFIG.map(t => t.key);
  const [leagues, setLeagues] = useState(allLeagues);
  const [tiers, setTiers] = useState(allTiers);

  function toggleLeague(key) {
    setLeagues(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }
  function toggleTier(key) {
    setTiers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const pool = getFilteredPool(leagues, tiers);
  const tooSmall = pool.length < 3;

  return (
    <div className="mgr-draft-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
        <div className="mgr-draft-sub">Manager Draft — Build your pool</div>
      </div>

      <div className="mgr-pool-selector">
        <div className="mgr-pool-section">
          <div className="mgr-pool-section-title">LEAGUES</div>
          <div className="mgr-pool-checks">
            {LEAGUE_CONFIG.map(cfg => {
              const count = MANAGERS.filter(m => getManagerLeague(m) === cfg.key).length;
              const checked = leagues.includes(cfg.key);
              return (
                <label key={cfg.key} className={`mgr-pool-check${checked ? " checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleLeague(cfg.key)} />
                  <span className="mgr-pool-flag">{cfg.flag}</span>
                  <span className="mgr-pool-label">{cfg.label}</span>
                  <span className="mgr-pool-count">{count}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mgr-pool-section">
          <div className="mgr-pool-section-title">TIERS</div>
          <div className="mgr-pool-checks">
            {TIER_CONFIG.map(cfg => {
              const count = MANAGERS.filter(m => m.tier === cfg.key).length;
              const checked = tiers.includes(cfg.key);
              return (
                <label key={cfg.key} className={`mgr-pool-check${checked ? " checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleTier(cfg.key)} />
                  <span className="mgr-pool-label">{cfg.label}</span>
                  <span className="mgr-pool-count">{count}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`mgr-pool-total${tooSmall ? " too-small" : ""}`}>
        {tooSmall
          ? `Only ${pool.length} manager${pool.length === 1 ? "" : "s"} match — select more leagues or tiers`
          : `${pool.length} managers in pool`}
      </div>

      <button className="mgr-go-btn" disabled={tooSmall} onClick={() => onConfirm(leagues, tiers)}>
        ▶ START THE MERRY-GO-ROUND
      </button>
    </div>
  );
}

export default function ManagerDraftScreen({
  draft,
  onAssignManager,
  // multiplayer props (omit for single-player)
  mySlotIdx = null,
  externalPicks = {},
  onManagerPick = null,
  isHost = true,
  managerDraftConfig = null,
  onSetManagerDraftConfig = null,
}) {
  const isMultiplayer = !!onManagerPick;

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

  // Refs for stale-closure-safe external pick handling
  const poolRef = useRef(pool);
  const assignmentsRef = useRef(assignments);
  const turnIdxRef = useRef(turnIdx);
  const handledExternalTurns = useRef(new Set());
  useEffect(() => { poolRef.current = pool; }, [pool]);
  useEffect(() => { assignmentsRef.current = assignments; }, [assignments]);
  useEffect(() => { turnIdxRef.current = turnIdx; }, [turnIdx]);

  const currentManagerIdx = pickOrder[turnIdx];
  const currentManager = draft.managers[currentManagerIdx];
  const allDone = turnIdx >= pickOrder.length;
  const isHuman = !currentManager?.isComputer;

  // In multiplayer: only spin/pick when it's your slot or you're host handling a CPU slot
  const isMyTurn = !isMultiplayer
    || (isHuman && currentManagerIdx === mySlotIdx)
    || (!isHuman && isHost);

  // Auto-start from Firestore config when host has chosen the pool
  useEffect(() => {
    if (!isMultiplayer || !managerDraftConfig) return;
    if (phase !== "league-select") return;
    const { leagues, tiers } = managerDraftConfig;
    setPool(shuffle([...getFilteredPool(leagues, tiers)]));
    setPhase("playing");
    setWaitingForGo(true);
  }, [managerDraftConfig, phase, isMultiplayer]);

  function clearTimers() {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }

  function startWithLeague(leagues, tiers) {
    if (onSetManagerDraftConfig) onSetManagerDraftConfig(leagues, tiers);
    setPool(shuffle([...getFilteredPool(leagues, tiers)]));
    setPhase("playing");
    setWaitingForGo(true);
  }

  function spinAndReveal() {
    clearTimers();
    setWaitingForGo(false);
    setSpinning(true);
    setCpuPick(null);
    setRevealed(0);
    setOffered(null);

    pendingOffer.current = dedupByName(shuffle([...pool])).slice(0, 3);

    const t0 = setTimeout(() => {
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
    setOffered(pendingOffer.current || dedupByName(shuffle([...pool])).slice(0, 3));
    setSpinning(false);
    setRevealed(3);
  }

  // CPU highlights its top pick after all cards are revealed
  useEffect(() => {
    if (!offered || isHuman || !isMyTurn) return;
    const sorted = [...offered].sort((a, b) => {
      const order = { elite: 0, established: 1, journeyman: 2 };
      return order[a.tier] - order[b.tier];
    });
    const t = setTimeout(() => setCpuPick(sorted[0]), 9500);
    return () => clearTimeout(t);
  }, [offered, currentManagerIdx, isMyTurn]);

  // Auto-spin for CPU turns — only for the device that handles CPU (host in multiplayer)
  useEffect(() => {
    if (phase !== "playing") return;
    if (!waitingForGo) return;
    if (isHuman) return;
    if (!isMyTurn) return;
    const t = setTimeout(() => spinAndReveal(), 800);
    return () => clearTimeout(t);
  }, [phase, waitingForGo, turnIdx, isMyTurn]);

  // Watch for external picks from other devices (multiplayer only)
  useEffect(() => {
    if (!isMultiplayer) return;
    const pick = externalPicks[String(currentManagerIdx)];
    if (!pick) return;
    if (handledExternalTurns.current.has(currentManagerIdx)) return;
    if (assignmentsRef.current[currentManagerIdx]) return;

    // A pick arrived from another device — mark handled and advance
    handledExternalTurns.current.add(currentManagerIdx);
    clearTimers();
    setOffered([pick]);
    setSpinning(false);
    setRevealed(1);
    setWaitingForGo(false);

    const t = setTimeout(() => {
      const newPool = poolRef.current.filter(m => m.id !== pick.id && m.name !== pick.name);
      setPool(shuffle(newPool));
      setCpuPick(null);
      setRevealed(0);
      setOffered(null);

      const newAssignments = { ...assignmentsRef.current, [currentManagerIdx]: pick };
      setAssignments(newAssignments);

      const nextTurn = turnIdxRef.current + 1;
      if (nextTurn >= pickOrder.length) {
        if (isHost) onAssignManager(newAssignments);
      } else {
        setTurnIdx(nextTurn);
        setWaitingForGo(true);
      }
    }, 1000);
    timers.current = [t];
  }, [externalPicks, currentManagerIdx]);

  function handlePick(manager) {
    // Mark as handled locally so external pick effect doesn't double-advance
    if (isMultiplayer) {
      handledExternalTurns.current.add(currentManagerIdx);
      onManagerPick(currentManagerIdx, manager);
    }

    const newPool = pool.filter(m => m.id !== manager.id && m.name !== manager.name);
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

  function skipAllCpu() {
    clearTimers();
    let newAssignments = { ...assignments };
    let remaining = [...pool];
    let nextHumanIdx = null;

    for (let i = turnIdx; i < pickOrder.length; i++) {
      const mgr = draft.managers[pickOrder[i]];
      if (mgr.isComputer) {
        const sorted = [...remaining].sort((a, b) => {
          const order = { elite: 0, established: 1, journeyman: 2 };
          return order[a.tier] - order[b.tier];
        });
        const pick = sorted[0];
        if (!pick) break;
        newAssignments[pickOrder[i]] = pick;
        if (isMultiplayer) {
          handledExternalTurns.current.add(pickOrder[i]);
          onManagerPick(pickOrder[i], pick);
        }
        remaining = remaining.filter(m => m.id !== pick.id && m.name !== pick.name);
      } else {
        nextHumanIdx = i;
        break;
      }
    }

    setAssignments(newAssignments);
    setPool(shuffle(remaining));
    setSpinning(false);
    setOffered(null);
    setRevealed(0);
    setCpuPick(null);

    if (nextHumanIdx !== null) {
      setTurnIdx(nextHumanIdx);
      setWaitingForGo(true);
    } else {
      onAssignManager(newAssignments);
    }
  }

  if (allDone) return null;

  // Non-host in multiplayer waits for host to choose the pool
  if (phase === "league-select") {
    if (isMultiplayer && !isHost) {
      return (
        <div className="mgr-draft-screen">
          <div className="mgr-draft-header">
            <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
            <div className="mgr-draft-sub">Manager Draft</div>
          </div>
          <div className="mp-waiting-screen">
            <div className="mp-waiting-spinner" />
            <p className="mp-waiting-text">Waiting for host to build the manager pool...</p>
          </div>
        </div>
      );
    }
    return <PoolSelector onConfirm={startWithLeague} />;
  }

  const playerName = currentManager.dofName || currentManager.name;
  const cpuReady = !isHuman && !!cpuPick && revealed >= 3;

  // Non-active human turn in multiplayer: show waiting state
  const theirTurn = isMultiplayer && isHuman && !isMyTurn;

  return (
    <div className="mgr-draft-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">THE MERRY-GO-ROUND</div>
        <div className="mgr-draft-sub">Manager Draft — Pick {turnIdx + 1} of {pickOrder.length}</div>
      </div>

      <div className="mgr-turn-banner">
        <span className="mgr-turn-label">
          {theirTurn
            ? `${playerName} is choosing their manager...`
            : spinning
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
          {theirTurn ? (
            // Another player's human turn — show waiting state
            <div className="mp-waiting-screen" style={{ minHeight: "200px" }}>
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">{playerName} is spinning the Merry-Go-Round...</p>
            </div>
          ) : (
            <>
              <Carousel pool={pool} spinning={spinning} allRevealed={revealed >= 3} />

              {waitingForGo && !spinning && isHuman && isMyTurn && (
                <button className="mgr-spin-btn" onClick={spinAndReveal}>
                  ⚙ SPIN THE MERRY-GO-ROUND
                </button>
              )}

              {(spinning || (!!offered && revealed < 3)) && (
                <button className="mgr-skip-btn" onClick={skipReveal}>
                  SKIP ⏩
                </button>
              )}
              {spinning && !isHuman && isHost && (
                <button className="mgr-skip-cpu-btn" onClick={skipAllCpu}>
                  ⏭ SKIP CPU
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
                        onPick={isHuman && isMyTurn ? handlePick : () => {}}
                        disabled={!isHuman || revealed < 3 || !isMyTurn}
                        highlighted={cpuPick?.id === mgr.id}
                      />
                    ))}
                  </div>
                  {!isHuman && (
                    <div className="mgr-cpu-actions">
                      <button
                        className={`mgr-next-btn ${cpuReady ? "ready" : "waiting"}`}
                        onClick={confirmCpuPick}
                        disabled={!cpuReady}
                      >
                        {cpuReady ? "CONFIRM & NEXT →" : "DELIBERATING..."}
                      </button>
                      {isHost && (
                        <button className="mgr-skip-cpu-btn" onClick={skipAllCpu}>
                          ⏭ SKIP CPU
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <PicksLog assignments={assignments} draft={draft} />
      </div>
    </div>
  );
}

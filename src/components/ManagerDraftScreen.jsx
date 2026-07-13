import { useState, useEffect, useRef } from "react";
import { MANAGERS, TIER_LABELS } from "../data/managers";
import { ERA_LABELS } from "../data/players";
import { DRAFT_ROULETTE_ERAS, DRAFT_ROULETTE_LEAGUES } from "../hooks/draftUtils";

const DRAFT_ROULETTE_ERA_LABELS = Object.fromEntries(DRAFT_ROULETTE_ERAS.map(e => [e.key, e.label]));
const DRAFT_ROULETTE_LEAGUE_LABELS = Object.fromEntries(DRAFT_ROULETTE_LEAGUES.map(l => [l.key, l.label]));

const TIER_ORDER = { elite: 0, established: 1, journeyman: 2 };

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

// Mirrors matchesRoulette() in draftUtils.js for players — same hard-restriction rule,
// applied to whichever subset of `pool` is being offered to the active manager.
function filterByRoulette(pool, manager) {
  const era = manager?.assignedEra;
  const league = manager?.assignedLeague;
  if (!era && !league) return pool;
  return pool.filter(m =>
    getManagerLeague(m) !== "legends" &&
    (!era || m.era === era) &&
    (!league || getManagerLeague(m) === league)
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

const VALANCE_BULBS = Array.from({ length: 8 }, (_, i) => i);

// Three riders — one per real option — evenly spaced (12s / 3) around the orbit.
const RIDER_DELAYS = [0, -4, -8];

function RideStage({ riders }) {
  // Progressive reveal is driven by the parent's `revealed` counter — every rider
  // is a real offer slot that starts as "?????" and flips to the manager once
  // revealed. No decorative filler: the wheel only ever shows the three choices.
  return (
    <div className="bw-ride-stage">
      <div className="bw-ride-lights-bg" />

      <div className="bw-ride-finial">
        <div className="bw-ride-finial-ball" />
        <div className="bw-ride-finial-pole" />
      </div>

      <div className="bw-ride-canopy" />

      <div className="bw-ride-valance">
        {VALANCE_BULBS.map(i => (
          <div key={i} className="bw-ride-scallop">
            <div className="bw-ride-scallop-shade" style={{ background: i % 2 === 0 ? "#e0701a" : "var(--bw-gold)" }} />
            <div className="bw-ride-bulb" style={{ animationDelay: `${i * 0.15}s` }} />
          </div>
        ))}
      </div>

      <div className="bw-ride-pole-center" />
      <div className="bw-ride-pole-side left" />
      <div className="bw-ride-pole-side right" />
      <div className="bw-ride-spotlight" />

      {riders.map((m, i) => (
        <div
          key={i}
          className="bw-ride-orbit"
          style={{ animationDelay: `${RIDER_DELAYS[i]}s` }}
        >
          <div className={`bw-ride-orbit-card ${m ? "" : "pending"}`}>
            <div className="bw-ride-orbit-name">{m ? m.name : "?????"}</div>
            <div className="bw-ride-orbit-style">{m ? m.styleLabel : "···"}</div>
          </div>
        </div>
      ))}

      <div className="bw-ride-marker" />
      <div className="bw-ride-base" />
    </div>
  );
}

function ManagerCard({ manager, onPick, disabled, highlighted, showPickButton = true }) {
  const lastName = manager.name.trim().split(" ").pop().toUpperCase();
  return (
    <div className={`bw-mgr-card ${highlighted ? "recommended" : ""}`}>
      <div className="bw-mgr-card-body">
        <div className="bw-mgr-card-head">
          <div className="bw-mgr-card-name">{manager.name}</div>
          <div className="bw-mgr-card-chips">
            <span className="bw-mgr-chip">{ERA_LABELS[manager.era]}</span>
            <span className={`bw-mgr-chip ${manager.tier === "elite" ? "tier-elite" : ""}`}>{TIER_LABELS[manager.tier]}</span>
          </div>
        </div>
        <div className="bw-mgr-card-meta">{manager.club} · {manager.years}</div>
        <div className="bw-mgr-card-style">{manager.styleLabel}</div>
        <div className="bw-mgr-card-quote">"{manager.flavourText}"</div>
        {manager.preferredArchetypes?.length > 0 && (
          <div className="bw-mgr-card-tags">
            {manager.preferredArchetypes.map(a => (
              <span key={a} className="bw-mgr-tag">{a}</span>
            ))}
          </div>
        )}
      </div>
      {showPickButton && (
        <button className="bw-mgr-pick-btn" onClick={() => onPick(manager)} disabled={disabled}>
          PICK {lastName} →
        </button>
      )}
    </div>
  );
}

function PicksLog({ assignments, draft }) {
  const entries = Object.entries(assignments);
  if (!entries.length) return null;
  return (
    <div className="bw-picks-log">
      <div className="bw-picks-log-title">PICKS SO FAR</div>
      {entries.map(([idx, mgr]) => {
        const club = draft.managers[idx];
        return (
          <div key={idx} className="bw-picks-row">
            <span className="bw-picks-club">{club.dofName || club.name}</span>
            <span className="bw-picks-arrow">→</span>
            <span className="bw-picks-name">{mgr.name}</span>
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
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-banner">
          <div className="bw-banner-title">MERRY-GO-ROUND</div>
          <div className="bw-banner-subtitle">Manager draft · build your pool</div>
        </div>

        <div className="bw-body">
          <div className="bw-field">
            <div className="bw-field-label">LEAGUES</div>
            <div className="bw-pool-list">
              {LEAGUE_CONFIG.map(cfg => {
                const count = MANAGERS.filter(m => getManagerLeague(m) === cfg.key).length;
                const checked = leagues.includes(cfg.key);
                return (
                  <label key={cfg.key} className={`bw-pool-row ${checked ? "checked" : "unchecked"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleLeague(cfg.key)} />
                    <span className="bw-pool-check-icon">{checked ? "✓" : ""}</span>
                    <span className="bw-pool-flag">{cfg.flag}</span>
                    <span className="bw-pool-label">{cfg.label}</span>
                    <span className="bw-pool-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bw-field">
            <div className="bw-field-label">TIERS</div>
            <div className="bw-tier-row">
              {TIER_CONFIG.map(cfg => {
                const count = MANAGERS.filter(m => m.tier === cfg.key).length;
                const checked = tiers.includes(cfg.key);
                return (
                  <label key={cfg.key} className={`bw-tier-chip ${checked ? "checked" : "unchecked"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleTier(cfg.key)} />
                    <span className="bw-tier-chip-label">{cfg.label}</span>
                    <br />
                    <span className="bw-tier-chip-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={`bw-pool-total ${tooSmall ? "too-small" : ""}`}>
            {tooSmall
              ? `Only ${pool.length} manager${pool.length === 1 ? "" : "s"} match — select more leagues or tiers`
              : <><strong>{pool.length}</strong> managers in pool</>}
          </div>

          <button className="bw-cta-arcade" disabled={tooSmall} onClick={() => onConfirm(leagues, tiers)}>
            ▶ START THE RIDE
          </button>
        </div>
      </div>
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
  const draftRouletteActive = !!draft.draftRoulette?.enabled;

  const [phase, setPhase] = useState(draftRouletteActive ? "playing" : "league-select");
  const [pickOrder] = useState(() => shuffle(draft.managers.map((_, i) => i)));
  const [pool, setPool] = useState(() => draftRouletteActive ? shuffle([...MANAGERS]) : []);
  const [turnIdx, setTurnIdx] = useState(0);
  const [offered, setOffered] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [cpuPick, setCpuPick] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [waitingForGo, setWaitingForGo] = useState(true);
  const [assignments, setAssignments] = useState({});
  const timers = useRef([]);
  const pendingOffer = useRef(null);
  // `settled` gates the transition from the spinning ride to the choice cards —
  // it flips true a beat AFTER the final option is revealed, so the wheel keeps
  // spinning for a moment rather than snapping away the instant reveal completes.
  const [settled, setSettled] = useState(false);
  // A human's tapped-but-not-yet-confirmed choice; drives the confirm dialog.
  const [pendingPick, setPendingPick] = useState(null);

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
    setSettled(false);
    setPendingPick(null);

    pendingOffer.current = dedupByName(shuffle(filterByRoulette(pool, currentManager))).slice(0, 3);

    const t0 = setTimeout(() => {
      setSpinning(false);
      setOffered(pendingOffer.current);
      // Reveal the three horses one at a time while the wheel keeps turning,
      // with a generous gap between each for suspense, then hold the spin a good
      // beat longer (settle) before the choice cards appear.
      const t1 = setTimeout(() => setRevealed(1), 2000);
      const t2 = setTimeout(() => setRevealed(2), 4200);
      const t3 = setTimeout(() => setRevealed(3), 6400);
      const t4 = setTimeout(() => setSettled(true), 8800);
      timers.current = [t1, t2, t3, t4];
    }, 3600);
    timers.current = [t0];
  }

  function skipReveal() {
    clearTimers();
    setOffered(pendingOffer.current || dedupByName(shuffle(filterByRoulette(pool, currentManager))).slice(0, 3));
    setSpinning(false);
    setRevealed(3);
    setSettled(true);
  }

  // CPU highlights its top pick after all cards are revealed
  useEffect(() => {
    if (!offered || isHuman || !isMyTurn) return;
    const sorted = [...offered].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
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
      setSettled(false);
      setPendingPick(null);

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
    setSettled(false);
    setPendingPick(null);

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
        const cpuPool = filterByRoulette(remaining, mgr);
        const sorted = cpuPool.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
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
    setSettled(false);
    setPendingPick(null);

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
        <div className="setup-screen">
          <div className="bw-frame">
            <div className="bw-banner">
              <div className="bw-banner-title">MERRY-GO-ROUND</div>
              <div className="bw-banner-subtitle">Manager draft</div>
            </div>
            <div className="mp-waiting-screen">
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">Waiting for host to build the manager pool...</p>
            </div>
          </div>
        </div>
      );
    }
    return <PoolSelector onConfirm={startWithLeague} />;
  }

  const clubDisplayName = currentManager.teamName || currentManager.clubName || currentManager.name;
  const playerName = currentManager.dofName || currentManager.name;
  const cpuReady = !isHuman && !!cpuPick && revealed >= 3;

  // Non-active human turn in multiplayer: show waiting state
  const theirTurn = isMultiplayer && isHuman && !isMyTurn;
  const showChoose = !theirTurn && !spinning && !!offered && revealed >= 3 && settled;
  const showRide = !theirTurn && !showChoose;
  const revealedOffered = offered ? offered.slice(0, revealed) : [];
  const sortedOffered = offered ? [...offered].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) : [];
  const riders = [
    revealedOffered[0] || null,
    revealedOffered[1] || null,
    revealedOffered[2] || null,
  ];

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-mgr-frame">
        <div className="bw-banner bw-banner-row">
          <div className="bw-banner-title">MERRY-GO-ROUND</div>
          <div className="bw-banner-meta">{clubDisplayName} · {playerName}</div>
        </div>

        <div className="bw-turn-status">
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
        </div>
        {pickOrder.length > 1 && (
          <div className="bw-step-dots">
            {pickOrder.map((idx, i) => (
              <span
                key={idx}
                className={`bw-step-dot ${i === turnIdx ? "active" : i < turnIdx ? "done" : ""}`}
                title={draft.managers[idx].dofName || draft.managers[idx].name}
              />
            ))}
          </div>
        )}
        {draftRouletteActive && currentManager && (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <span className="bw-badge-pill bw-badge-pill-cpu">
              🎰 {[currentManager.assignedEra && DRAFT_ROULETTE_ERA_LABELS[currentManager.assignedEra], currentManager.assignedLeague && DRAFT_ROULETTE_LEAGUE_LABELS[currentManager.assignedLeague]].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        {theirTurn ? (
          <div className="mp-waiting-screen" style={{ minHeight: "200px" }}>
            <div className="mp-waiting-spinner" />
            <p className="mp-waiting-text">{playerName} is spinning the Merry-Go-Round...</p>
          </div>
        ) : showRide ? (
          <>
            <RideStage riders={riders} />
            <div className="bw-ride-controls">
              {waitingForGo && !spinning && isHuman && isMyTurn && (
                <button className="bw-cta-arcade" onClick={spinAndReveal}>↻ SPIN THE WHEEL</button>
              )}
              {(spinning || (!!offered && !settled)) && (
                <button className="bw-cta-secondary" onClick={skipReveal}>SKIP</button>
              )}
              {spinning && !isHuman && isHost && (
                <button className="bw-cta-secondary" onClick={skipAllCpu}>⏭ SKIP CPU</button>
              )}
            </div>
          </>
        ) : (
          <div className="bw-body">
            <div className="bw-turn-status" style={{ border: "none", padding: "0 0 8px" }}>
              {isHuman
                ? <>Pick one gaffer for <strong style={{ color: "var(--bw-gold)" }}>{clubDisplayName}</strong>.</>
                : cpuReady
                  ? `${playerName} picks ${cpuPick.name}.`
                  : "Deliberating..."}
            </div>
            <div className="bw-mgr-picks">
              {sortedOffered.map((mgr) => (
                <ManagerCard
                  key={mgr.id}
                  manager={mgr}
                  onPick={isHuman && isMyTurn ? setPendingPick : () => {}}
                  disabled={!isHuman || !isMyTurn}
                  highlighted={isHuman ? pendingPick?.id === mgr.id : cpuPick?.id === mgr.id}
                  showPickButton={isHuman}
                />
              ))}
            </div>
            {!isHuman && (
              <div className="bw-series-actions" style={{ marginTop: 10 }}>
                <button className="bw-cta-primary" onClick={confirmCpuPick} disabled={!cpuReady}>
                  {cpuReady ? "CONFIRM & NEXT →" : "DELIBERATING..."}
                </button>
                {isHost && (
                  <button className="bw-cta-secondary" onClick={skipAllCpu}>⏭ SKIP CPU</button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bw-body" style={{ paddingTop: 0 }}>
          <PicksLog assignments={assignments} draft={draft} />
        </div>
      </div>

      {pendingPick && (
        <div className="bw-modal-overlay" onClick={() => setPendingPick(null)}>
          <div className="bw-modal-box" onClick={e => e.stopPropagation()}>
            <div className="bw-modal-title">CONFIRM APPOINTMENT</div>
            <div className="bw-confirm-name">{pendingPick.name}</div>
            <div className="bw-confirm-detail">{pendingPick.styleLabel}</div>
            <div className="bw-confirm-detail" style={{ marginBottom: 18 }}>
              Appoint as gaffer for <strong style={{ color: "var(--bw-gold)" }}>{clubDisplayName}</strong>?
            </div>
            <div className="bw-confirm-btns">
              <button className="bw-cta-primary" onClick={() => handlePick(pendingPick)}>
                APPOINT {pendingPick.name.trim().split(" ").pop().toUpperCase()} →
              </button>
              <button className="bw-cta-secondary" onClick={() => setPendingPick(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { MANAGERS, TIER_LABELS } from "../data/managers";
import { ERA_LABELS, REAL_TEAMS, managerMatchesRealClub } from "../data/players";
import { DRAFT_ROULETTE_ERAS, DRAFT_ROULETTE_LEAGUES, managerEligibleFor } from "../hooks/draftUtils";
import { lastName } from "../utils/displayName";
import KitSwatch, { readableTextOn } from "./KitSwatch";

// Season Pool: a manager is offered only if eligible under the game's season
// filter — active that season (single), overlapping the range, or any (All
// seasons / non-season). So a 1999 game won't offer Pochettino.

const DRAFT_ROULETTE_ERA_LABELS = Object.fromEntries(DRAFT_ROULETTE_ERAS.map(e => [e.key, e.label]));
const DRAFT_ROULETTE_LEAGUE_LABELS = Object.fromEntries(DRAFT_ROULETTE_LEAGUES.map(l => [l.key, l.label]));

const TIER_ORDER = { elite: 0, established: 1, journeyman: 2 };

// Draw playback speed for CPU manager picks — mirrors the player-draft board:
// CPUs auto-spin and auto-appoint, and this controls how fast you watch it. Same
// labels and the same device-level store key as DraftScreen, so the preference
// is shared. `spin` scales the carousel spin + reveal; `pick` is the beat before
// the CPU's choice locks in. INSTANT skips the animation entirely.
const DRAW_SPEEDS = [
  { label: "SLOW",    pick: 3800, spin: 2800 },
  { label: "NORMAL",  pick: 2800, spin: 2000 },
  { label: "BRISK",   pick: 1800, spin: 1400 },
  { label: "FAST",    pick: 1000, spin: 800  },
  { label: "INSTANT", pick: 0,    spin: 0    },
];
const DEFAULT_DRAW_SPEED_IDX = 1; // NORMAL
const DRAW_SPEED_STORE_KEY = "tg-draw-speed";
function loadDrawSpeedIdx() {
  try {
    const idx = DRAW_SPEEDS.findIndex(s => s.label === localStorage.getItem(DRAW_SPEED_STORE_KEY));
    return idx >= 0 ? idx : DEFAULT_DRAW_SPEED_IDX;
  } catch {
    return DEFAULT_DRAW_SPEED_IDX;
  }
}
function saveDrawSpeedIdx(idx) {
  try {
    if (DRAW_SPEEDS[idx]) localStorage.setItem(DRAW_SPEED_STORE_KEY, DRAW_SPEEDS[idx].label);
  } catch {
    // localStorage unavailable (private mode / quota) — just won't persist.
  }
}
// The CPU always leans to the best available tier.
function cpuPickFrom(offer) {
  return [...offer].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])[0];
}

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

// The PoolSelector's defaults (everything on, minus Legends) — used to seed a
// Season Pool game that skips the league/tier step.
const DEFAULT_MGR_LEAGUES = LEAGUE_CONFIG.map(l => l.key).filter(k => k !== "legends");
const DEFAULT_MGR_TIERS = TIER_CONFIG.map(t => t.key);

function getManagerLeague(m) {
  return m.league || "la_liga";
}

function getFilteredPool(leagues, tiers, seasonFilter = null) {
  return MANAGERS.filter(m =>
    leagues.includes(getManagerLeague(m)) && tiers.includes(m.tier) &&
    managerEligibleFor(m, seasonFilter)
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

// Real Teams: managers in `pool` who managed the CPU's assigned club.
function clubManagersInPool(pool, realClub) {
  if (!realClub) return [];
  return pool.filter(m => managerMatchesRealClub(m, realClub));
}

// Every club manager for the real-club CPUs, so the human's pool filter can't leave a
// real-club CPU without a club manager to be assigned. Deduped against the base pool.
function withRealClubManagers(pool, managers) {
  const extra = [];
  const seen = new Set(pool.map(m => m.id));
  for (const mgr of managers) {
    if (!mgr.realClub) continue;
    for (const m of MANAGERS) {
      if (!seen.has(m.id) && managerMatchesRealClub(m, mgr.realClub)) {
        seen.add(m.id);
        extra.push(m);
      }
    }
  }
  return extra.length ? [...pool, ...extra] : pool;
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

const VALANCE_BULBS = Array.from({ length: 10 }, (_, i) => i);

// A full carousel of horses — rendered twice so the strip can scroll seamlessly
// (translateX 0 → -50% loops without a visible seam). Purely decorative: the
// actual options reveal in the cards below.
const CAROUSEL_HORSES = Array.from({ length: 6 }, (_, i) => i);

// A classic merry-go-round — striped canopy, a ring of bulbs, and carousel
// horses bobbing past on a scrolling strip. It only moves (and the bulbs only
// flash) while `spinning` is true, so nothing animates until HOP ON is tapped.
function Carousel({ spinning }) {
  const horses = [...CAROUSEL_HORSES, ...CAROUSEL_HORSES];
  return (
    <div className={`bw-carousel ${spinning ? "spinning" : ""}`}>
      <div className="bw-car-finial">
        <div className="bw-car-finial-ball" />
        <div className="bw-car-finial-pole" />
      </div>

      <div className="bw-car-canopy" />

      <div className="bw-car-valance">
        {VALANCE_BULBS.map(i => (
          <div key={i} className="bw-car-scallop">
            <div className="bw-car-scallop-shade" style={{ background: i % 2 === 0 ? "#e0701a" : "var(--bw-gold)" }} />
            <div className="bw-car-bulb" style={{ animationDelay: `${(i % 2) * 0.28}s` }} />
          </div>
        ))}
      </div>

      <div className="bw-car-window">
        <div className="bw-car-strip">
          {horses.map((i, idx) => (
            <div
              key={idx}
              className="bw-car-horse"
              style={{ animationDelay: `${(idx % CAROUSEL_HORSES.length) * 0.17}s` }}
            >
              <span className="bw-car-horse-emoji">🎠</span>
              <span className="bw-car-horse-pole" />
            </div>
          ))}
        </div>
      </div>

      <div className="bw-car-pole" />
      <div className="bw-car-base" />
    </div>
  );
}

// A not-yet-revealed slot in the cards grid — holds the card's shape so the
// layout never jumps as names land, then the real card pops in over it.
function PendingCard() {
  return (
    <div className="bw-mgr-card pending">
      <div className="bw-mgr-card-wait">?????</div>
    </div>
  );
}

function ManagerCard({ manager, onPick, highlighted }) {
  // Compact: just name + era/tier + style. No pick button — the whole card is
  // the tap target when `onPick` is set, and the confirm pop-up carries the
  // detail (club · years, flavour quote, archetypes).
  return (
    <div
      className={`bw-mgr-card bw-mgr-card-pop ${highlighted ? "recommended" : ""} ${onPick ? "pickable" : ""}`}
      onClick={onPick ? () => onPick(manager) : undefined}
      role={onPick ? "button" : undefined}
    >
      <div className="bw-mgr-card-body bw-mgr-card-compact">
        <div className="bw-mgr-card-head">
          <div className="bw-mgr-card-name">{manager.name}</div>
          <div className="bw-mgr-card-chips">
            <span className="bw-mgr-chip">{ERA_LABELS[manager.era]}</span>
            <span className={`bw-mgr-chip ${manager.tier === "elite" ? "tier-elite" : ""}`}>{TIER_LABELS[manager.tier]}</span>
          </div>
        </div>
        <div className="bw-mgr-card-style">{manager.styleLabel}</div>
      </div>
    </div>
  );
}

// The appointments board — reuses the player-draft board skin (bw-draw-*): every
// club sits in pick order in its own full kit colour, and the info block fills to
// the same kit colour the moment its manager is appointed. The current club is
// called out ("your pick" / "picking…"), the rest wait.
function DraftBoard({ pickOrder, turnIdx, assignments, draft }) {
  return (
    <div className="bw-draw-board bw-draw-round bw-mgr-draw-board">
      <div className="bw-draw-legend">
        <span className="bw-draw-legend-club">Club</span>
        <div className="bw-draw-legend-info">
          <span className="bw-draw-legend-pick">Manager</span>
        </div>
      </div>
      <ul className="bw-draw-rows">
        {pickOrder.map((clubIdx, i) => {
          const club = draft.managers[clubIdx];
          const mgr = assignments[clubIdx];
          const signed = !!mgr;
          const isNow = !signed && i === turnIdx;
          const isLatest = signed && i === turnIdx - 1;
          const isHuman = !club.isComputer;
          const clubName = club.clubName || club.teamName || club.name;
          const kit = club.primaryColor || "#1a3a6b";
          return (
            <li
              key={clubIdx}
              className={
                "bw-draw-row" +
                (signed ? " is-signed" : " is-pending") +
                (isLatest ? " is-latest" : "") +
                (isNow ? " is-next" : "") +
                (isHuman ? " is-you" : "")
              }
              style={{ "--kit": kit, "--kit-text": readableTextOn(kit) }}
            >
              <div className="bw-draw-cell-club">
                <KitSwatch primary={club.primaryColor} secondary={club.secondaryColor} pattern={club.pattern || "plain"} uid={`mb-${clubIdx}`} size={18} />
                <span className="bw-draw-club-name">{clubName}</span>
                {isHuman ? <span className="bw-draw-you">YOU</span> : <span className="bw-draw-cpu">CPU</span>}
              </div>
              <div className="bw-draw-cell-info">
                <span className="bw-draw-info-main">
                  {signed ? (
                    <span className="bw-draw-pick">
                      <span className="bw-draw-pick-name">{mgr.name}</span>
                    </span>
                  ) : isNow ? (
                    <span className="bw-draw-next-label">{isHuman ? "⏵ Your pick" : "picking…"}</span>
                  ) : (
                    <span className="bw-draw-pending">waiting…</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
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

  // Season Pool (solo): a single season or era range already restricts the
  // managers, so skip the league/tier selection and go straight to the ride with
  // the gated pool. All-seasons keeps the selection (full manager pool on offer).
  const sf = draft.seasonFilter;
  const seasonSkip = !!sf && (sf.kind === "single" || sf.kind === "range") && !isMultiplayer && !draftRouletteActive;
  const [phase, setPhase] = useState(draftRouletteActive || seasonSkip ? "playing" : "league-select");
  const [pickOrder] = useState(() => shuffle(draft.managers.map((_, i) => i)));
  const [pool, setPool] = useState(() => {
    if (draftRouletteActive) return shuffle(MANAGERS.filter(m => managerEligibleFor(m, sf)));
    if (seasonSkip) return shuffle([...withRealClubManagers(getFilteredPool(DEFAULT_MGR_LEAGUES, DEFAULT_MGR_TIERS, sf), draft.managers)]);
    return [];
  });
  const [turnIdx, setTurnIdx] = useState(0);
  const [offered, setOffered] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [cpuPick, setCpuPick] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [waitingForGo, setWaitingForGo] = useState(true);
  const [assignments, setAssignments] = useState({});
  const timers = useRef([]);
  const pendingOffer = useRef(null);
  // A human's tapped-but-not-yet-confirmed choice; drives the confirm dialog.
  const [pendingPick, setPendingPick] = useState(null);
  const [drawSpeedIdx, setDrawSpeedIdx] = useState(loadDrawSpeedIdx);
  function changeDrawSpeed(idx) {
    setDrawSpeedIdx(idx);
    saveDrawSpeedIdx(idx);
  }

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
    setPool(shuffle([...withRealClubManagers(getFilteredPool(leagues, tiers, draft.seasonFilter), draft.managers)]));
    setPhase("playing");
    setWaitingForGo(true);
  }, [managerDraftConfig, phase, isMultiplayer]);

  function clearTimers() {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }

  function startWithLeague(leagues, tiers) {
    if (onSetManagerDraftConfig) onSetManagerDraftConfig(leagues, tiers);
    setPool(shuffle([...withRealClubManagers(getFilteredPool(leagues, tiers, draft.seasonFilter), draft.managers)]));
    setPhase("playing");
    setWaitingForGo(true);
  }

  function spinAndReveal() {
    clearTimers();
    setWaitingForGo(false);
    setCpuPick(null);
    setRevealed(0);
    setOffered(null);
    setPendingPick(null);

    // Real Teams CPU: offer managers from its assigned club (falls back to normal if none)
    const cpu = !!currentManager?.isComputer;
    const clubMgrs = cpu ? clubManagersInPool(pool, currentManager.realClub) : [];
    const offer = clubMgrs.length
      ? dedupByName(shuffle(clubMgrs)).slice(0, 3)
      : dedupByName(shuffle(filterByRoulette(pool, currentManager))).slice(0, 3);
    pendingOffer.current = offer;

    const speed = DRAW_SPEEDS[drawSpeedIdx] || DRAW_SPEEDS[DEFAULT_DRAW_SPEED_IDX];

    // CPU at INSTANT: no theatre, appoint straight away.
    if (cpu && speed.spin === 0 && speed.pick === 0) {
      setSpinning(false);
      handlePick(cpuPickFrom(offer));
      return;
    }

    setSpinning(true);

    // Human turns keep a fixed, comfortable pace; CPU turns follow the draw-speed
    // picker so a watching player can dawdle or blast through. The reveal gap is a
    // full beat so each manager lands with a bit of suspense rather than in a rush.
    const spinMs = cpu ? Math.max(speed.spin, 120) : 1500;
    const gap    = cpu ? Math.max(speed.spin, 90) : 1500;

    const t0 = setTimeout(() => {
      setSpinning(false);
      setOffered(offer);
      // Reveal the three cards one at a time — they pop in underneath the
      // carousel, which keeps spinning until the last one lands. For a CPU, its
      // choice highlights as the last card settles, then auto-confirms.
      const t1 = setTimeout(() => setRevealed(1), gap);
      const t2 = setTimeout(() => setRevealed(2), gap * 2);
      const t3 = setTimeout(() => {
        setRevealed(3);
        // Deliberation beat: hold on all three ("…is deliberating…") before the
        // CPU settles on one, so it reads as a real decision rather than a snap.
        if (cpu) {
          const tThink = setTimeout(() => setCpuPick(cpuPickFrom(offer)), speed.pick);
          timers.current.push(tThink);
        }
      }, gap * 3);
      timers.current = [t1, t2, t3];
    }, spinMs);
    timers.current = [t0];
  }

  function skipReveal() {
    clearTimers();
    const offer = pendingOffer.current || dedupByName(shuffle(filterByRoulette(pool, currentManager))).slice(0, 3);
    setOffered(offer);
    setSpinning(false);
    setRevealed(3);
    if (currentManager?.isComputer) setCpuPick(cpuPickFrom(offer));
  }

  // Auto-spin for CPU turns — only for the device that handles CPU (host in
  // multiplayer). Speed-scaled so INSTANT chains straight through.
  useEffect(() => {
    if (phase !== "playing") return;
    if (!waitingForGo) return;
    if (isHuman) return;
    if (!isMyTurn) return;
    const speed = DRAW_SPEEDS[drawSpeedIdx] || DRAW_SPEEDS[DEFAULT_DRAW_SPEED_IDX];
    const t = setTimeout(() => spinAndReveal(), speed.spin === 0 ? 0 : 500);
    return () => clearTimeout(t);
  }, [phase, waitingForGo, turnIdx, isMyTurn, drawSpeedIdx]);

  // Auto-confirm the CPU's highlighted pick after a speed-scaled beat — replaces
  // the old manual "CONFIRM & NEXT". Humans still appoint by tapping a card.
  useEffect(() => {
    if (isHuman || !isMyTurn) return;
    if (!cpuPick || revealed < 3) return;
    const speed = DRAW_SPEEDS[drawSpeedIdx] || DRAW_SPEEDS[DEFAULT_DRAW_SPEED_IDX];
    // The pick's highlighted — a short beat to read "appoints X", then advance.
    const t = setTimeout(() => handlePick(cpuPick), Math.round(speed.pick * 0.6));
    return () => clearTimeout(t);
  }, [cpuPick, revealed, isHuman, isMyTurn, drawSpeedIdx]);

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

  function skipAllCpu() {
    clearTimers();
    let newAssignments = { ...assignments };
    let remaining = [...pool];
    let nextHumanIdx = null;

    for (let i = turnIdx; i < pickOrder.length; i++) {
      const mgr = draft.managers[pickOrder[i]];
      if (mgr.isComputer) {
        const clubMgrs = clubManagersInPool(remaining, mgr.realClub);
        let pick;
        if (clubMgrs.length) {
          pick = shuffle(clubMgrs)[0];
        } else {
          const cpuPool = filterByRoulette(remaining, mgr);
          pick = cpuPool.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])[0];
        }
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

  // Non-active human turn in multiplayer: show waiting state
  const theirTurn = isMultiplayer && isHuman && !isMyTurn;
  // The carousel turns from HOP ON (or CPU auto-spin) until the last card lands.
  const carouselSpinning = spinning || (!!offered && revealed < 3);
  const allRevealed = !!offered && revealed >= 3;
  const canPick = isHuman && isMyTurn && allRevealed;

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
            : carouselSpinning
              ? `Spinning the Merry-Go-Round...`
              : waitingForGo && isHuman
                ? `${playerName} — hop on to see your options`
                : canPick
                  ? `${playerName}, choose your manager`
                  : !isHuman && cpuPick && revealed >= 3
                    ? `${playerName} appoints ${cpuPick.name}`
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
        ) : (
          <div className="bw-mgr-stage">
            <div className="bw-car-wrap">
              <Carousel spinning={carouselSpinning} />
            </div>

            {/* One fixed-height action bar for every state — buttons swap in
                place rather than appearing mid-page, so nothing below jumps.
                CPU turns are automated: a draw-speed picker + skip, same as the
                player-draft board. Humans hop on and tap a card. */}
            <div className="bw-mgr-actions">
              {!isHuman && isMyTurn && (
                <>
                  <label className="bw-draw-speed-label">
                    Draw speed
                    <select className="bw-draw-speed" value={drawSpeedIdx} onChange={e => changeDrawSpeed(Number(e.target.value))}>
                      {DRAW_SPEEDS.map((s, i) => (
                        <option key={s.label} value={i}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  {isHost && (
                    <button className="bw-cta-secondary bw-draw-skip-btn" onClick={skipAllCpu}>⏭ SKIP</button>
                  )}
                </>
              )}
              {isHuman && isMyTurn && (
                <>
                  {waitingForGo && !offered && (
                    <button className="bw-cta-arcade" onClick={spinAndReveal}>🎠 HOP ON THE RIDE</button>
                  )}
                  {carouselSpinning && (
                    <button className="bw-cta-secondary" onClick={skipReveal}>SKIP</button>
                  )}
                  {canPick && (
                    <span className="bw-mgr-actions-hint">Tap a manager to appoint</span>
                  )}
                </>
              )}
            </div>

            {/* The three offer cards land under the carousel one at a time, then
                become the pickable cards — no separate choose screen. */}
            <div className="bw-body" style={{ paddingTop: 0 }}>
              <div className="bw-mgr-picks">
                {[0, 1, 2].map(i => {
                  const mgr = offered && revealed > i ? offered[i] : null;
                  if (!mgr) return <PendingCard key={i} />;
                  return (
                    <ManagerCard
                      key={mgr.id}
                      manager={mgr}
                      onPick={canPick ? setPendingPick : null}
                      highlighted={isHuman ? pendingPick?.id === mgr.id : cpuPick?.id === mgr.id}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="bw-body" style={{ paddingTop: 0 }}>
          <DraftBoard pickOrder={pickOrder} turnIdx={turnIdx} assignments={assignments} draft={draft} />
        </div>
      </div>

      {pendingPick && (
        <div className="bw-modal-overlay" onClick={() => setPendingPick(null)}>
          <div className="bw-modal-box bw-mgr-confirm" onClick={e => e.stopPropagation()}>
            <div className="bw-modal-title">CONFIRM APPOINTMENT</div>
            <div className="bw-mgr-confirm-head">
              <div className="bw-confirm-name">{pendingPick.name}</div>
              <div className="bw-mgr-card-chips">
                <span className="bw-mgr-chip">{ERA_LABELS[pendingPick.era]}</span>
                <span className={`bw-mgr-chip ${pendingPick.tier === "elite" ? "tier-elite" : ""}`}>{TIER_LABELS[pendingPick.tier]}</span>
              </div>
            </div>
            <div className="bw-mgr-card-meta">{pendingPick.club} · {pendingPick.years}</div>
            <div className="bw-mgr-card-style">{pendingPick.styleLabel}</div>
            <div className="bw-mgr-card-quote">"{pendingPick.flavourText}"</div>
            {pendingPick.preferredArchetypes?.length > 0 && (
              <div className="bw-mgr-card-tags">
                {pendingPick.preferredArchetypes.map(a => (
                  <span key={a} className="bw-mgr-tag">{a}</span>
                ))}
              </div>
            )}
            <div className="bw-confirm-detail" style={{ margin: "16px 0 18px" }}>
              Appoint as gaffer for <strong style={{ color: "var(--bw-gold)" }}>{clubDisplayName}</strong>?
            </div>
            <div className="bw-confirm-btns">
              <button className="bw-cta-primary" onClick={() => handlePick(pendingPick)}>
                APPOINT {lastName(pendingPick.name).toUpperCase()}
              </button>
              <button className="bw-cta-secondary" onClick={() => setPendingPick(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

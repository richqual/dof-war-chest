import { useState, useEffect, useRef } from "react";
import { POSITIONS, SUB_POSITIONS } from "../data/players";
import { FORMATIONS, FORMATION_DISPLAY_ORDER } from "../data/formations";
import { DRAFT_ROULETTE_ERAS, DRAFT_ROULETTE_LEAGUES, BENCH_MIN_FUND } from "../hooks/draftUtils";
import { TIERS, squadTierCounts, ratingRangeLabel, SCOUT_TUNING } from "../hooks/scoutUtils";
import PlayerCard from "./PlayerCard";
import SpinWheel from "./SpinWheel";
import KitSwatch from "./KitSwatch";
import MySquadPanel from "./MySquadPanel";
import DrawBoard, { roundLabel } from "./DrawBoard";
import DrawPanel from "./DrawPanel";

// Pace between single CPU picks — deliberately unhurried, since the whole
// point is that you can read each signing as it lands. Anyone who doesn't want
// to wait has SKIP, which fills the rest of the board instantly.
const CPU_STEP_DELAY = 1600;

// Sub slots (11..15) are the only place a scouting mission is allowed.
const SUB_LABELS = { GKSUB: "GKS", DEFSUB: "DEF", MIDSUB: "MID", WIDSUB: "WID", ATTSUB: "ATT" };

// Full-name labels for the concrete positions a bench slot can span, so the
// mission brief can focus on ONE of them (e.g. ATTSUB → target ST or CAM).
const POS_LABELS = {
  GK: "Goalkeeper", RB: "Right Back", LB: "Left Back", CB: "Centre Back",
  DM: "Def. Mid", CM: "Midfielder", CAM: "Att. Mid", RM: "Right Mid",
  LM: "Left Mid", RW: "Right Winger", LW: "Left Winger", ST: "Striker",
};

export default function ScoutDraftScreen({
  draft, activeManager, activeManagerIdx, currentPos,
  confirmScoutBudget, pickScoutPlayer, reScout, dismissReScoutNotice, revealScoutRatings, setScoutFilter, commissionMission, confirmMission,
  scoutSkipCpuTurns, scoutStepCpuTurn, respin, getTakenPlayers, freeAgents = [],
  myTurn = true,
}) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { currentBudget, currentOrder, turnIndex, positionIndex, managers } = draft;
  const isCpuTurn = !!activeManager?.isComputer;
  // Leftover Lolly — see DraftScreen for the full shape. The fund is banked but
  // locked during the XI rounds, then becomes the entire bench budget.
  const lolly = !!draft.leftoverLolly;
  const subFund = activeManager?.subFund || 0;
  const benchRound = lolly && positionIndex >= 11;
  const topUpDue = benchRound && !activeManager?.toppedUp;
  const pendingCarryover = lolly
    ? (benchRound ? subFund : 0)
    : (activeManager?.carryover || 0);

  // A bench turn past the top-up has nothing to spin — load the fund and deal.
  useEffect(() => {
    if (!lolly || !benchRound || topUpDue || isCpuTurn || !myTurn) return;
    if (currentBudget !== null) return;
    confirmScoutBudget(0);
  }, [lolly, benchRound, topUpDue, isCpuTurn, myTurn, currentBudget, positionIndex, turnIndex]);
  const kitPrimary = activeManager?.primaryColor || "#1a3a6b";
  const kitSecondary = activeManager?.secondaryColor || "#ffffff";

  const [showOrder, setShowOrder] = useState(false);
  const [viewingSquadIdx, setViewingSquadIdx] = useState(null);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionLeague, setMissionLeague] = useState("");
  const [missionEra, setMissionEra] = useState("");
  const [missionPos, setMissionPos] = useState("");
  const [missionCandidates, setMissionCandidates] = useState([]);
  const [missionMiss, setMissionMiss] = useState(false);
  const [bargainOpen, setBargainOpen] = useState(false);
  const [reScoutMenuOpen, setReScoutMenuOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  // Draw-board review acknowledgements live in refs: they must survive re-renders
  // (a stale value would re-show a gate already tapped through) but they are not
  // render inputs themselves. `null` = uninitialised, so resuming a saved draft
  // adopts its position rather than re-gating a round already seen.
  const ackRoundRef = useRef(null);
  const ackPicksRef = useRef(0);
  // After a run of CPU picks, hold on the finished board until the manager taps
  // CONTINUE — otherwise the last signing is on screen for a single frame
  // before the wheel replaces it.
  // Mid-round hold: CPUs have signed since you last looked and now you're up.
  // Derived from the pick log rather than tracked with a flag, so it can't drift
  // out of sync with what actually landed.
  const roundPicks = (draft.pickLog || []).filter(e => e.positionIndex === positionIndex);
  const reviewPending =
    !isCpuTurn && myTurn && roundPicks.length > 0 &&
    ackPicksRef.current < (draft.pickLog || []).length;

  // Round boundary: hold on the COMPLETED round's board until the manager taps
  // through, whether the round ended on a CPU pick or the human's.
  //
  // Derived, not stored: every round below positionIndex is finished by
  // definition, so the gate is simply "the newest finished round the manager
  // hasn't acknowledged". A stored flag set from a render-phase comparison
  // loses the boundary when SKIP crosses it in a single state update — the
  // whole batch (finish this round + run the next one) lands as one change.
  const [ackTick, setAckTick] = useState(0); // re-render trigger after an ack is written
  // A fresh or restarted draft rewinds the acknowledgement, and resuming a
  // saved draft mid-way adopts where it left off rather than re-gating.
  if (ackRoundRef.current === null || positionIndex - 1 < ackRoundRef.current) {
    ackRoundRef.current = positionIndex - 1;
    ackPicksRef.current = (draft.pickLog || []).length;
  }
  const roundReview =
    draft.phase !== "complete" && positionIndex - 1 > ackRoundRef.current ? positionIndex - 1 : null;

  // Step CPU turns ONE pick at a time so each signing lands on the draw board
  // where it can be read. The batch skip is still a button away.
  useEffect(() => {
    if (!isCpuTurn) return;
    // Freeze the draft behind a review gate — otherwise the next round's CPUs
    // would pick away underneath the board the manager is still reading.
    if (roundReview !== null) return;
    const step = scoutStepCpuTurn || scoutSkipCpuTurns;
    if (!step) return;
    const t = setTimeout(() => step(), CPU_STEP_DELAY);
    return () => clearTimeout(t);
  }, [isCpuTurn, activeManagerIdx, positionIndex, turnIndex, roundReview]); // eslint-disable-line

  // Reset the mission panel whenever the turn/slot changes (adjust-state-on-prop-
  // change during render — React's recommended pattern over a setState effect).
  const turnKey = `${activeManagerIdx}-${positionIndex}`;
  const [lastTurnKey, setLastTurnKey] = useState(turnKey);
  if (turnKey !== lastTurnKey) {
    setLastTurnKey(turnKey);
    setMissionOpen(false); setMissionCandidates([]); setMissionMiss(false);
    setMissionLeague(""); setMissionEra(""); setMissionPos(""); setBargainOpen(false);
    setReScoutMenuOpen(false);
  }

  const isSubSlot = positionIndex >= 11;
  const reScoutsLeft = activeManager?.reScoutsLeft ?? 0;
  const missionUsed = !!activeManager?.missionUsed;
  const budget = currentBudget ?? 0;
  const report = draft.currentReport || [];
  const affordableReport = report.filter(p => p.value <= budget);
  // Players at this position already signed by anyone — shown so later pickers
  // can see what's gone (same as the Classic draft's "already signed" list).
  const takenPlayers = (currentBudget !== null && getTakenPlayers)
    ? getTakenPlayers(currentPos.key)
    : [];

  const capCounts = squadTierCounts(activeManager?.squad);

  // Ratings are hidden by default in Scout mode; a manager can pay a flat fee to
  // reveal them for this report, or the setup option can force them always-on.
  const ratingsHidden = !!draft.hideRatings && !draft.ratingsRevealed;
  const revealFee = SCOUT_TUNING.revealFee ?? 5;
  const canAffordReveal = budget >= revealFee;

  const missionSlotPositions = SUB_POSITIONS[currentPos.key] || [currentPos.key];

  function runMission() {
    const request = {
      // Focus the brief on ONE position when chosen, else search the whole slot group.
      positions: missionPos ? [missionPos] : missionSlotPositions,
      league: missionLeague || null,
      era: missionEra || null,
    };
    const found = commissionMission(request) || [];
    if (!found.length) { setMissionMiss(true); setMissionCandidates([]); }
    else { setMissionCandidates(found); setMissionMiss(false); }
  }

  return (
    <div className="bw-draft-screen scout-draft">
      <DrawPanel
        draft={draft}
        open={drawOpen}
        onOpen={() => setDrawOpen(true)}
        onClose={() => setDrawOpen(false)}
      />

      {viewingSquadIdx !== null && managers[viewingSquadIdx] && (
        <MySquadPanel
          manager={managers[viewingSquadIdx]}
          onClose={() => setViewingSquadIdx(null)}
          hideRatings={draft.hideRatings}
        />
      )}

      {/* Club bar — view your own squad and peek at rivals', like Classic */}
      <div className="draft-header">
        <div className="bw-team-bar">
          {activeManager && (
            <button
              className="bw-team-name"
              onClick={() => setViewingSquadIdx(v => v === activeManagerIdx ? null : activeManagerIdx)}
              title="View squad"
            >
              <span className="bw-team-name-label">{activeManager.clubName || activeManager.name}</span>
              {activeManager.isComputer && <span className="bw-team-cpu-tag">CPU</span>}
              <span className="bw-team-squad-btn">▤</span>
            </button>
          )}
          <div className="bw-team-others">
            {managers.map((m, i) => i === activeManagerIdx ? null : (
              <span
                key={i}
                className={`bw-team-mini${viewingSquadIdx === i ? " squad-open" : ""}`}
                title={`${m.clubName || m.name}${m.isComputer ? " (CPU)" : ""} — view squad`}
                onClick={() => setViewingSquadIdx(v => v === i ? null : i)}
              >
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`tab-${i}`} size={16} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Turn banner */}
      <div className="bw-signing-row">
        <div className="bw-signing-left">
          <KitSwatch primary={kitPrimary} secondary={kitSecondary} pattern={activeManager?.pattern || "plain"} uid="scout-banner" size={28} />
          <span className="bw-signing-name">{activeManager?.dofName || activeManager?.name}</span>
          <span className="bw-signing-meta">scouting: <strong>{currentPos.label}</strong></span>
        </div>
        <div className="bw-signing-right">
          {lolly && !benchRound && (
            <span className="bw-signing-subfund" title="Unspent cash banks here for your subs">
              Sub Fund: £{subFund}m
            </span>
          )}
          {!lolly && pendingCarryover > 0 && currentBudget === null && (
            <span className="bw-signing-carryover">Carryover: £{pendingCarryover}m</span>
          )}
          {currentBudget !== null && <span className="bw-signing-budget">£{currentBudget}m</span>}
        </div>
      </div>

      {/* Squad-wide tier caps (only when the opt-in caps are enabled) */}
      {draft.tierCaps && (
        <div className="scout-cap-strip">
          {TIERS.map(t => {
            const cap = draft.tierCaps?.[t];
            const count = capCounts[t] || 0;
            const full = cap != null && count >= cap;
            return (
              <span key={t} className={`scout-cap-chip ${full ? "full" : ""}`} title={cap != null ? `${count} of ${cap} ${t}s used` : `${count} ${t}s (no cap)`}>
                {t} {count}{cap != null ? `/${cap}` : ""}
              </span>
            );
          })}
        </div>
      )}

      {/* Position progress strip */}
      <div className="bw-pos-strip">
        {(FORMATION_DISPLAY_ORDER[activeManager?.formation] ?? Array.from({ length: 11 }, (_, i) => i)).map(i => {
          const entry = FORMATIONS[activeManager?.formation]?.[i];
          const posLabel = entry?.label ?? entry?.pos ?? POSITIONS[i].key;
          return (
            <span key={i} className={`bw-pos-chip ${i < positionIndex ? "done" : i === positionIndex ? "current" : "todo"}`}>
              {posLabel}
            </span>
          );
        })}
        <span className="bw-pos-chip-divider" />
        {POSITIONS.slice(11).map((p, i) => {
          const absIdx = 11 + i;
          const state = absIdx < positionIndex ? "done" : absIdx === positionIndex ? "current" : "todo";
          return <span key={absIdx} className={`bw-pos-chip sub ${state}`}>{SUB_LABELS[p.key] || p.key}</span>;
        })}
      </div>

      {/* Draft order */}
      <div className="bw-order-wrap">
        <button className="bw-order-toggle" onClick={() => setShowOrder(s => !s)}>
          DRAFT ORDER {showOrder ? "▲" : "▼"}
        </button>
        {showOrder && (
          <div className="bw-order-list">
            {currentOrder.map((pi, i) => (
              <span key={i} className={`bw-order-chip ${i === turnIndex ? "now" : i < turnIndex ? "done" : "waiting"}`}>
                {managers[pi].clubName || managers[pi].name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="draft-main">
        {roundReview !== null ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-human">ROUND COMPLETE</span>
            <div className="bw-cpu-name">{roundLabel(draft, roundReview)}</div>
            <div className="bw-cpu-status">Every club has signed. Here's how the round went.</div>
            <div className="bw-draw-live">
              <DrawBoard draft={draft} round={roundReview} />
            </div>
            <button
              className="bw-cta-primary"
              style={{ marginTop: "1.2rem", width: "auto" }}
              onClick={() => {
                ackRoundRef.current = roundReview;
                ackPicksRef.current = (draft.pickLog || []).length;
                setAckTick(t => t + 1);
              }}
            >
              CONTINUE →
            </button>
          </div>
        ) : isCpuTurn || reviewPending ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-human">
              {reviewPending ? "ROUND SO FAR" : "CPU TURN"}
            </span>
            <div className="bw-cpu-name">
              {reviewPending ? "You're up next" : (activeManager?.clubName || activeManager?.name)}
            </div>
            <div className="bw-cpu-status">
              {reviewPending ? "Here's how the round's gone so far." : "Reading their scout report…"}
            </div>
            {/* The wait IS the draw board — you watch the pool drain in real
                time instead of staring at thinking dots. */}
            <div className="bw-draw-live">
              <DrawBoard draft={draft} />
            </div>
            {reviewPending ? (
              <button
                className="bw-cta-primary"
                style={{ marginTop: "1.2rem", width: "auto" }}
                onClick={() => {
                  ackPicksRef.current = (draft.pickLog || []).length;
                  setAckTick(t => t + 1);
                }}
              >
                CONTINUE →
              </button>
            ) : scoutSkipCpuTurns && (
              <button className="bw-cta-secondary" style={{ marginTop: "1.2rem", width: "auto" }} onClick={scoutSkipCpuTurns}>
                ⏭ SKIP TO END OF ROUND
              </button>
            )}
          </div>
        ) : !myTurn ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-cpu">THEIR TURN</span>
            <div className="bw-cpu-name">{activeManager?.clubName || activeManager?.name}</div>
            <div className="bw-cpu-status">Scouting their {currentPos.label}…</div>
          </div>
        ) : currentBudget === null ? (
          <div className="bw-roll-area">
            <div className="bw-roll-sub">
              {topUpDue
                ? <><strong>Top-up spin</strong> — one last cash injection before you build your bench<span className="bw-roll-note"> · minimum £{BENCH_MIN_FUND}m guaranteed</span></>
                : <>Spin your transfer budget for <strong>{currentPos.label}</strong></>}
            </div>
            <SpinWheel
              carryover={pendingCarryover}
              carryLabel={lolly ? "sub fund" : "carryover"}
              onConfirm={confirmScoutBudget}
              difficulty={draft.difficulty}
              theme="blue"
              minTotal={topUpDue ? BENCH_MIN_FUND : 0}
            />
          </div>
        ) : (
          <div className="scout-report-area">
            <div className="scout-report-head">
              <div className="scout-report-head-text">
                <h2 className="scout-report-title">SCOUT REPORT</h2>
                <p className="scout-report-sub">
                  Your scouts found {affordableReport.length} option{affordableReport.length === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="scout-head-actions">
                {(() => {
                  const group = SUB_POSITIONS[currentPos.key] || [];
                  const canChoose = isSubSlot && group.length > 1; // GKSUB / starters skip
                  // Target one position (or the whole group) for this one re-scout.
                  // Setting the filter first keeps the shown hand and the swap aligned.
                  const doReScout = (sel) => {
                    if (reScoutsLeft <= 0) return;
                    setReScoutMenuOpen(false);
                    if (canChoose && setScoutFilter) setScoutFilter(sel); // null = whole group
                    reScout();
                  };
                  return (
                    <div className="scout-rescout-wrap">
                      <button
                        className="bw-cta-secondary scout-head-btn"
                        disabled={reScoutsLeft <= 0}
                        onClick={() => {
                          if (reScoutsLeft <= 0) return;
                          if (canChoose) setReScoutMenuOpen(o => !o);
                          else reScout();
                        }}
                        title={reScoutsLeft <= 0 ? "No re-scouts left this game" : `${reScoutsLeft} re-scout${reScoutsLeft === 1 ? "" : "s"} left`}
                      >
                        🔄 RE-SCOUT ({reScoutsLeft})
                      </button>
                      {canChoose && reScoutMenuOpen && (
                        <div className="scout-rescout-menu">
                          <span className="scout-rescout-menu-label">Re-scout for:</span>
                          <button className="scout-filter-pill" onClick={() => doReScout(null)}>ALL</button>
                          {group.map(pos => (
                            <button key={pos} className="scout-filter-pill" onClick={() => doReScout([pos])}>{pos}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isSubSlot && !missionUsed && (
                  <button className="bw-cta-secondary scout-head-btn" onClick={() => setMissionOpen(o => !o)}>
                    🌍 MISSION
                  </button>
                )}
                {isSubSlot && missionUsed && (
                  <span className="scout-mission-used">Mission used</span>
                )}

                {ratingsHidden && (
                  <button
                    className="bw-cta-secondary scout-head-btn"
                    disabled={!canAffordReveal}
                    onClick={() => canAffordReveal && revealScoutRatings()}
                    title={canAffordReveal ? `Reveal ratings for £${revealFee}m` : `Need £${revealFee}m to reveal ratings`}
                  >
                    👁 REVEAL (£{revealFee}m)
                  </button>
                )}
              </div>
            </div>

            {/* Why a card didn't change: no affordable same-tier player left in the
                database. Without this an unswappable card looks like a broken button. */}
            {draft.reScoutNotice && (
              <div className="scout-rescout-notice">
                <span className="scout-rescout-notice-icon">⚠️</span>
                <div>
                  {draft.reScoutNotice.all ? (
                    <p><strong>Nothing left to re-scout.</strong> No affordable alternatives of these tiers remain in the database, so your hand is unchanged — and your re-scout wasn't used.</p>
                  ) : (
                    <p>
                      <strong>{draft.reScoutNotice.stuck.map(s => s.name).join(", ")}</strong>{" "}
                      couldn't be replaced — no other{" "}
                      {[...new Set(draft.reScoutNotice.stuck.map(s => s.tier))].join(" / ")} player at this position is within your £{budget}m budget.
                    </p>
                  )}
                </div>
                {dismissReScoutNotice && (
                  <button className="scout-rescout-notice-x" onClick={dismissReScoutNotice} aria-label="Dismiss">✕</button>
                )}
              </div>
            )}

            {/* Mission panel — sits directly under the MISSION button so it's not missed */}
            {missionOpen && isSubSlot && !missionUsed && (
              <div className="scout-mission-panel">
                <p className="scout-mission-lead">
                  Commission a one-off search outside your live pool for this bench spot. Costs the player's value plus a premium
                  {activeManager?.tenets?.length ? " (discounted if it matches a club tenet)" : ""}.
                </p>
                <div className="scout-mission-controls">
                  {missionSlotPositions.length > 1 && (
                    <label>Position
                      <select value={missionPos} onChange={e => setMissionPos(e.target.value)}>
                        <option value="">Any</option>
                        {missionSlotPositions.map(p => (
                          <option key={p} value={p}>{POS_LABELS[p] || p}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>League
                    <select value={missionLeague} onChange={e => setMissionLeague(e.target.value)}>
                      <option value="">Any</option>
                      {DRAFT_ROULETTE_LEAGUES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </select>
                  </label>
                  <label>Era
                    <select value={missionEra} onChange={e => setMissionEra(e.target.value)}>
                      <option value="">Any</option>
                      {DRAFT_ROULETTE_ERAS.map(er => <option key={er.key} value={er.key}>{er.label}</option>)}
                    </select>
                  </label>
                  <button className="bw-cta-secondary" onClick={runMission}>SEARCH</button>
                </div>

                {missionMiss && <p className="scout-mission-miss">No candidate matched that brief. Try widening it.</p>}
                {missionCandidates.length > 0 && (
                  <div className="scout-mission-results">
                    <p className="scout-mission-shortlist-label">
                      {missionCandidates.length > 1 ? "Your scouts came back with a shortlist — pick one:" : "Your scouts found one option:"}
                    </p>
                    <div className="scout-cards-row">
                      {missionCandidates.map(cand => {
                        const afford = cand.missionCost <= currentBudget;
                        return (
                          <div key={cand.id} className="scout-card-wrap">
                            <div className="scout-card-tier">{ratingRangeLabel(cand.rating)}</div>
                            <PlayerCard player={cand} canAfford={afford} hideRatings={ratingsHidden} budget={currentBudget} />
                            <div className="scout-mission-cost">
                              Fee: <strong>£{cand.missionCost}m</strong>
                              <span className="scout-mission-premium"> (+{Math.round(cand.missionPremium * 100)}%)</span>
                            </div>
                            <button
                              className="bw-cta-primary"
                              disabled={!afford}
                              onClick={() => confirmMission(cand)}
                            >
                              {afford ? `SIGN FOR £${cand.missionCost}m` : "CAN'T AFFORD"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSubSlot && setScoutFilter && (() => {
              const group = SUB_POSITIONS[currentPos.key] || [];
              if (group.length <= 1) return null; // GK sub — nothing to narrow
              const active = draft.scoutPosFilter; // null = whole group (all on)
              // When no explicit filter, every position is on (ALL lit too).
              const isOn = (pos) => !active || active.includes(pos);
              const toggle = (pos) => {
                const base = active ? active.filter(p => group.includes(p)) : [...group];
                const next = base.includes(pos) ? base.filter(p => p !== pos) : [...base, pos];
                // Empty or full selection both mean "scout the whole group" (ALL on).
                setScoutFilter(next.length === 0 || next.length === group.length ? null : next);
              };
              return (
                <div className="scout-filter-strip">
                  <span className="scout-filter-label">Scout for:</span>
                  <button
                    className={`scout-filter-pill ${!active ? "on" : ""}`}
                    onClick={() => setScoutFilter(null)}
                  >ALL</button>
                  {group.map(pos => (
                    <button
                      key={pos}
                      className={`scout-filter-pill ${isOn(pos) ? "on" : ""}`}
                      onClick={() => toggle(pos)}
                    >{pos}</button>
                  ))}
                </div>
              );
            })()}

            {report.length === 0 ? (
              <div className="scout-empty">
                {isSubSlot && draft.scoutPosFilter ? (
                  <p>No <strong>{draft.scoutPosFilter.join(" / ")}</strong> are within your <strong>£{budget}m</strong> budget. Widen the filter (tap <strong>ALL</strong>){freeAgents.length > 0 ? <> or sign a free agent from the <strong>Bargain Bucket</strong> below</> : null}.</p>
                ) : freeAgents.length > 0 ? (
                  <p>No <strong>{currentPos.label}</strong> is within your <strong>£{budget}m</strong> budget right now. Sign a free agent from the <strong>Bargain Bucket</strong> below.</p>
                ) : (
                  <p>Every <strong>{currentPos.label}</strong> has already been signed, and there are no free agents left in this pool.</p>
                )}
                <div className="scout-empty-actions">
                  {respin && freeAgents.length === 0 && <button className="bw-cta-secondary" onClick={respin}>🎡 RE-SPIN BUDGET</button>}
                </div>
              </div>
            ) : (
              <div className="scout-cards-row">
                {report.map(p => {
                  const afford = p.value <= budget;
                  return (
                    <div key={p.id} className="scout-card-wrap">
                      <div className="scout-card-tier">{ratingRangeLabel(p.rating)}</div>
                      <PlayerCard
                        player={p}
                        onPick={afford ? pickScoutPlayer : undefined}
                        canAfford={afford}
                        hideRatings={ratingsHidden}
                        budget={currentBudget}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bargain bucket — genuine £0 free agents, always signable no matter
                your budget or what the report dealt. Tucked behind a dropdown so
                it's only in view when you actually need it. */}
            {freeAgents.length > 0 && (
              <div className="scout-free-agents">
                <button
                  className="scout-bargain-toggle"
                  onClick={() => setBargainOpen(o => !o)}
                  aria-expanded={bargainOpen}
                >
                  🪣 BARGAIN BUCKET · {freeAgents.length} FREE · £0 {bargainOpen ? "▲" : "▼"}
                </button>
                {bargainOpen && (
                  <div className="scout-cards-row">
                    {freeAgents.map(p => (
                      <div key={p.id} className="scout-card-wrap">
                        <div className="scout-card-tier">Bargain bucket</div>
                        <PlayerCard
                          player={p}
                          onPick={pickScoutPlayer}
                          canAfford={true}
                          hideRatings={ratingsHidden}
                          budget={currentBudget}
                        />
                        <div className="scout-free-badge">✅ FREE TRANSFER · £0</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Already-signed at this position — visible to later pickers */}
            {takenPlayers.length > 0 && (
              <div className="scout-taken">
                <div className="bw-section-divider">ALREADY SIGNED · {currentPos.label}</div>
                <div className="scout-taken-list">
                  {takenPlayers.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={ratingsHidden} takenBy={p.ownedBy} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

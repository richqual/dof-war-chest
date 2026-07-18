import { useState, useEffect } from "react";
import { POSITIONS, SUB_POSITIONS } from "../data/players";
import { FORMATIONS, FORMATION_DISPLAY_ORDER } from "../data/formations";
import { DRAFT_ROULETTE_ERAS, DRAFT_ROULETTE_LEAGUES } from "../hooks/draftUtils";
import { TIERS, squadTierCounts } from "../hooks/scoutUtils";
import PlayerCard from "./PlayerCard";
import SpinWheel from "./SpinWheel";
import KitSwatch from "./KitSwatch";
import MySquadPanel from "./MySquadPanel";

const CPU_SKIP_DELAY = 1100;

// Sub slots (11..15) are the only place a scouting mission is allowed.
const SUB_LABELS = { GKSUB: "GKS", DEFSUB: "DEF", MIDSUB: "MID", WIDSUB: "WID", ATTSUB: "ATT" };

export default function ScoutDraftScreen({
  draft, activeManager, activeManagerIdx, currentPos,
  confirmScoutBudget, pickScoutPlayer, reScout, commissionMission, confirmMission,
  scoutSkipCpuTurns, respin, getTakenPlayers, freeAgents = [],
  myTurn = true,
}) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { currentBudget, currentOrder, turnIndex, positionIndex, managers } = draft;
  const isCpuTurn = !!activeManager?.isComputer;
  const pendingCarryover = activeManager?.carryover || 0;
  const kitPrimary = activeManager?.primaryColor || "#1a3a6b";
  const kitSecondary = activeManager?.secondaryColor || "#ffffff";

  const [showOrder, setShowOrder] = useState(false);
  const [viewingSquadIdx, setViewingSquadIdx] = useState(null);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionLeague, setMissionLeague] = useState("");
  const [missionEra, setMissionEra] = useState("");
  const [missionCandidates, setMissionCandidates] = useState([]);
  const [missionMiss, setMissionMiss] = useState(false);

  // Auto-run CPU turns (batch) after a short beat for readability.
  useEffect(() => {
    if (!isCpuTurn || !scoutSkipCpuTurns) return;
    const t = setTimeout(() => scoutSkipCpuTurns(), CPU_SKIP_DELAY);
    return () => clearTimeout(t);
  }, [isCpuTurn, activeManagerIdx, positionIndex, turnIndex]); // eslint-disable-line

  // Reset the mission panel whenever the turn/slot changes (adjust-state-on-prop-
  // change during render — React's recommended pattern over a setState effect).
  const turnKey = `${activeManagerIdx}-${positionIndex}`;
  const [lastTurnKey, setLastTurnKey] = useState(turnKey);
  if (turnKey !== lastTurnKey) {
    setLastTurnKey(turnKey);
    setMissionOpen(false); setMissionCandidates([]); setMissionMiss(false);
    setMissionLeague(""); setMissionEra("");
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

  function runMission() {
    const request = {
      positions: SUB_POSITIONS[currentPos.key] || [currentPos.key],
      league: missionLeague || null,
      era: missionEra || null,
    };
    const found = commissionMission(request) || [];
    if (!found.length) { setMissionMiss(true); setMissionCandidates([]); }
    else { setMissionCandidates(found); setMissionMiss(false); }
  }

  return (
    <div className="bw-draft-screen scout-draft">
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
          {pendingCarryover > 0 && currentBudget === null && (
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
        {isCpuTurn ? (
          <div className="bw-cpu-area">
            <span className="bw-badge-pill bw-badge-pill-human">CPU TURN</span>
            <div className="bw-cpu-name">{activeManager?.clubName || activeManager?.name}</div>
            <div className="bw-cpu-status">Reading their scout report…</div>
            <div className="bw-cpu-dots"><span>●</span><span>●</span><span>●</span></div>
            {scoutSkipCpuTurns && (
              <button className="bw-cta-secondary" style={{ marginTop: "1.2rem", width: "auto" }} onClick={scoutSkipCpuTurns}>
                ⏭ SKIP CPU
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
            <div className="bw-roll-sub">Spin your transfer budget for <strong>{currentPos.label}</strong></div>
            <SpinWheel carryover={pendingCarryover} onConfirm={confirmScoutBudget} difficulty={draft.difficulty} theme="blue" />
          </div>
        ) : (
          <div className="scout-report-area">
            <div className="scout-report-head">
              <h2 className="scout-report-title">SCOUT REPORT</h2>
              <p className="scout-report-sub">
                Your scouts found {affordableReport.length} option{affordableReport.length === 1 ? "" : "s"}.
              </p>
            </div>

            {report.length === 0 ? (
              <div className="scout-empty">
                <p>Every player in the <strong>{currentPos.label}</strong> pool has already been signed. Re-scout to double-check for anyone freed up.</p>
                <div className="scout-empty-actions">
                  {respin && <button className="bw-cta-secondary" onClick={respin}>🎡 RE-SPIN BUDGET</button>}
                </div>
              </div>
            ) : (
              <div className="scout-cards-row">
                {report.map(p => {
                  const afford = p.value <= budget;
                  return (
                    <div key={p.id} className="scout-card-wrap">
                      <div className="scout-card-tier">{p.tier}</div>
                      <PlayerCard
                        player={p}
                        onPick={afford ? pickScoutPlayer : undefined}
                        canAfford={afford}
                        hideRatings={draft.hideRatings}
                        budget={currentBudget}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Free agents — genuine £0 players, always signable no matter your
                budget or what the report dealt. There's always something here. */}
            {freeAgents.length > 0 && (
              <div className="scout-free-agents">
                <div className="bw-section-divider">FREE AGENTS · £0 · SIGN ANYTIME</div>
                <div className="scout-cards-row">
                  {freeAgents.map(p => (
                    <div key={p.id} className="scout-card-wrap">
                      <div className="scout-card-tier">{p.tier}</div>
                      <PlayerCard
                        player={p}
                        onPick={pickScoutPlayer}
                        canAfford={true}
                        hideRatings={draft.hideRatings}
                        budget={currentBudget}
                      />
                      <div className="scout-free-badge">✅ FREE TRANSFER · £0</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Already-signed at this position — visible to later pickers */}
            {takenPlayers.length > 0 && (
              <div className="scout-taken">
                <div className="bw-section-divider">ALREADY SIGNED · {currentPos.label}</div>
                <div className="scout-taken-list">
                  {takenPlayers.map(p => (
                    <PlayerCard key={p.id} player={p} canAfford={false} hideRatings={draft.hideRatings} takenBy={p.ownedBy} />
                  ))}
                </div>
              </div>
            )}

            {/* Re-scout + Mission actions */}
            <div className="scout-actions">
              <button
                className="bw-cta-secondary"
                disabled={reScoutsLeft <= 0}
                onClick={() => reScoutsLeft > 0 && reScout()}
                title={reScoutsLeft <= 0 ? "No re-scouts left this game" : `${reScoutsLeft} re-scout${reScoutsLeft === 1 ? "" : "s"} left`}
              >
                🔄 RE-SCOUT ({reScoutsLeft} left)
              </button>

              {isSubSlot && !missionUsed && (
                <button className="bw-cta-secondary" onClick={() => setMissionOpen(o => !o)}>
                  🌍 SCOUTING MISSION
                </button>
              )}
              {isSubSlot && missionUsed && (
                <span className="scout-mission-used">Mission used</span>
              )}
            </div>

            {/* Mission panel */}
            {missionOpen && isSubSlot && !missionUsed && (
              <div className="scout-mission-panel">
                <p className="scout-mission-lead">
                  Commission a one-off search outside your live pool for this bench spot. Costs the player's value plus a premium
                  {activeManager?.tenets?.length ? " (discounted if it matches a club tenet)" : ""}.
                </p>
                <div className="scout-mission-controls">
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
                            <div className="scout-card-tier">{cand.tier}</div>
                            <PlayerCard player={cand} canAfford={afford} hideRatings={draft.hideRatings} budget={currentBudget} />
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
          </div>
        )}
      </div>
    </div>
  );
}

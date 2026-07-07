import { WAR_CHEST_SLOTS } from "../hooks/draftUtils";
import { formatValue, getRatingBg, getRatingColor } from "../data/players";
import KitSwatch, { kitAccent } from "./KitSwatch";

function formatChest(v) {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "£0m";
  if (v >= 1000) return `£${v / 1000}B`;
  return `£${v}m`;
}

// Jersey-style position colours — matches the converted squad pitch / lineups
// (SquadScreen.lineColors / MatchSim.pitchLineColors), using the fixed
// --bw-line-* tokens rather than ad-hoc hexes.
function lineColors(pos) {
  if (pos === "GK") return { bg: "var(--bw-line-gk)", text: "var(--bw-line-gk-ink)" };
  if (["RB", "LB", "CB", "WB", "DEF"].includes(pos)) return { bg: "var(--bw-line-def)", text: "#fff" };
  if (["ST", "RW", "LW", "ATT"].includes(pos)) return { bg: "var(--bw-line-att)", text: "#fff" };
  return { bg: "var(--bw-line-mid)", text: "#fff" }; // DM, CM, RM, LM, CAM, MID
}

function SquadCard({ manager, uid }) {
  const budget = manager.chestBudget ?? 0;
  const remaining = manager.wcBudgetRemaining ?? 0;
  const spent = budget - remaining;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const accent = kitAccent(manager.primaryColor, manager.secondaryColor);

  return (
    <div className="bw-wcs-card" style={{ borderColor: manager.primaryColor }}>
      <div
        className="bw-wcs-card-header"
        style={{ background: manager.primaryColor, borderBottom: `2px solid ${manager.secondaryColor}` }}
      >
        <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} uid={uid} size={28} />
        <div className="bw-wcs-card-names">
          <div className="bw-wcs-club" style={{ color: accent === manager.primaryColor ? manager.secondaryColor : accent }}>
            {manager.clubName}
          </div>
          <div className="bw-wcs-dof" style={{ color: accent === manager.primaryColor ? manager.secondaryColor : accent }}>
            {manager.dofName}
          </div>
        </div>
        {manager.isComputer && <span className="bw-badge-pill bw-badge-pill-cpu">CPU</span>}
      </div>

      <div className="bw-wcs-card-body">
        <div className="bw-wcs-budget-row">
          <span className="bw-wcs-budget-spent">{formatChest(spent)} spent</span>
          <span className="bw-wcs-budget-of">of {formatChest(budget)}</span>
        </div>
        <div className="bw-wcs-budget-track">
          <div className="bw-wcs-budget-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="bw-wcs-players">
          {WAR_CHEST_SLOTS.map((slotDef, idx) => {
            const p = manager.squad[idx];
            const lc = p ? lineColors(p.pos) : null;
            return (
              <div key={idx} className={`bw-wcs-row ${!p ? "bw-wcs-row-empty" : ""}`}>
                <span className="bw-wcs-slot">{slotDef.label.toUpperCase()}</span>
                {p ? (
                  <>
                    <span className="bw-wcs-name">{p.name}</span>
                    <span className="bw-wcs-pos" style={{ background: lc.bg, color: lc.text }}>{p.pos}</span>
                    <span className="bw-wcs-rating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</span>
                    <span className="bw-wcs-value">{formatValue(p.value)}</span>
                  </>
                ) : (
                  <span className="bw-wcs-empty">— empty slot</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WarChestSquadScreen({ draft, setScreen, isHost = true }) {
  const managers = draft.managers;
  const n = managers.length;
  const series = draft.series;

  return (
    <div className="bw-wcs-screen">
      <div className="bw-wcs-banner">
        <div className="bw-wcs-badge">WAR CHEST · 5-A-SIDE</div>
        <h2 className="bw-wcs-title">THE SQUADS</h2>
      </div>

      <div className={`bw-wcs-grid bw-wcs-grid-${Math.min(n, 4)}`}>
        {managers.map((m, i) => (
          <SquadCard key={i} manager={m} uid={`wcs${i}`} />
        ))}
      </div>

      <div className="bw-wcs-actions">
        {!isHost ? (
          <div className="mp-waiting-screen">
            <div className="mp-waiting-spinner" />
            <p className="mp-waiting-text">Waiting for the host to start the match…</p>
          </div>
        ) : (
          <>
            {n === 2 && (
              <button className="bw-cta-arcade" onClick={() => setScreen("match", { homeIdx: 0, awayIdx: 1 })}>
                PLAY 60-MIN MATCH →
              </button>
            )}
            {n > 2 && series?.stage === "draw" && (
              <button className="bw-cta-arcade" onClick={() => setScreen("draw")}>
                DRAW THE TOURNAMENT →
              </button>
            )}
            {n > 2 && series && series.stage !== "draw" && series.stage !== "champion" && (
              <button className="bw-cta-arcade" onClick={() => setScreen("series")}>
                CONTINUE TOURNAMENT →
              </button>
            )}
            {n > 2 && series?.stage === "champion" && (
              <button className="bw-cta-arcade" onClick={() => setScreen("series")}>
                SEE THE RESULTS →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { WAR_CHEST_SLOTS } from "../hooks/draftUtils";
import { formatValue, getRatingBg, getRatingColor } from "../data/players";
import KitSwatch from "./KitSwatch";

function formatChest(v) {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "£0m";
  if (v >= 1000) return `£${v / 1000}B`;
  return `£${v}m`;
}

function posGroupColor(pos) {
  if (!pos) return { bg: "#555", fg: "#fff" };
  if (pos === "GK") return { bg: "#f97316", fg: "#fff" };
  if (["RB", "LB", "CB"].includes(pos)) return { bg: "#3b82f6", fg: "#fff" };
  if (["ST", "RW", "LW"].includes(pos)) return { bg: "#ef4444", fg: "#fff" };
  return { bg: "#16a34a", fg: "#fff" };
}

function SquadCard({ manager, isMe, onMatchClick, matchTarget, allReady }) {
  const budget = manager.chestBudget ?? 0;
  const remaining = manager.wcBudgetRemaining ?? 0;
  const spent = budget - remaining;

  return (
    <div className={`wc-squad-card ${isMe ? "wc-squad-card-me" : ""}`}>
      <div className="wc-squad-card-header">
        <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} size={36} />
        <div className="wc-squad-card-names">
          <div className="wc-squad-club">{manager.clubName}</div>
          <div className="wc-squad-dof">{manager.dofName}</div>
        </div>
        {manager.isComputer && <span className="wc-cpu-badge">CPU</span>}
      </div>

      <div className="wc-squad-budget-row">
        <span className="wc-squad-budget-spent">{formatChest(spent)} spent</span>
        <span className="wc-squad-budget-of">of {formatChest(budget)}</span>
      </div>

      <div className="wc-squad-player-list">
        {WAR_CHEST_SLOTS.map((slotDef, idx) => {
          const p = manager.squad[idx];
          return (
            <div key={idx} className={`wc-squad-player-row ${!p ? "wc-squad-player-empty" : ""}`}>
              <span className="wc-squad-slot-label">{slotDef.label.toUpperCase()}</span>
              {p ? (
                <>
                  <span className="wc-squad-p-name">{p.name}</span>
                  <span
                    className="wc-squad-p-pos"
                    style={{ background: posGroupColor(p.pos).bg, color: posGroupColor(p.pos).fg }}
                  >{p.pos}</span>
                  <span
                    className="wc-squad-p-rating"
                    style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
                  >{p.rating}</span>
                  <span className="wc-squad-p-value">{formatValue(p.value)}</span>
                </>
              ) : (
                <span className="wc-squad-p-empty">— empty slot</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WarChestSquadScreen({ draft, setScreen, isHost = true }) {
  const managers = draft.managers;
  const n = managers.length;
  const series = draft.series;

  return (
    <div className="setup-screen" style={{ alignItems: "flex-start", paddingTop: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto", padding: "0 1rem" }}>
        <div className="wc-squads-header">
          <div className="wc-mode-badge">WAR CHEST · 5-A-SIDE</div>
          <h2 className="wc-squads-title">THE SQUADS</h2>
        </div>

        <div className={`wc-squads-grid wc-squads-grid-${Math.min(n, 4)}`}>
          {managers.map((m, i) => (
            <SquadCard key={i} manager={m} isMe={false} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          {!isHost ? (
            <div className="mp-waiting-screen">
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">Waiting for the host to start the match…</p>
            </div>
          ) : (
            <>
              {n === 2 && (
                <button className="start-btn active" onClick={() => setScreen("match", { homeIdx: 0, awayIdx: 1 })}>
                  PLAY 60-MIN MATCH →
                </button>
              )}
              {n > 2 && series?.stage === "draw" && (
                <button className="start-btn active" onClick={() => setScreen("draw")}>
                  DRAW THE TOURNAMENT →
                </button>
              )}
              {n > 2 && series && series.stage !== "draw" && series.stage !== "champion" && (
                <button className="start-btn active" onClick={() => setScreen("series")}>
                  CONTINUE TOURNAMENT →
                </button>
              )}
              {n > 2 && series?.stage === "champion" && (
                <button className="start-btn active" onClick={() => setScreen("series")}>
                  SEE THE RESULTS →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

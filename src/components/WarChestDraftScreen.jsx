import { useState } from "react";
import { WAR_CHEST_SLOTS } from "../hooks/draftUtils";
import { formatValue, getRatingBg, getRatingColor } from "../data/players";
import KitSwatch from "./KitSwatch";

function formatChest(v) {
  if (v === 0) return "FREE";
  if (v >= 1000) return `£${v / 1000}B`;
  return `£${v}m`;
}

function posGroupColor(pos) {
  if (pos === "GK") return { bg: "#f97316", fg: "#fff" };
  if (["RB", "LB", "CB"].includes(pos)) return { bg: "#3b82f6", fg: "#fff" };
  if (["ST", "RW", "LW"].includes(pos)) return { bg: "#ef4444", fg: "#fff" };
  return { bg: "#16a34a", fg: "#fff" };
}

const SLOT_COLORS = ["#f97316", "#3b82f6", "#16a34a", "#a855f7", "#ec4899"];

export default function WarChestDraftScreen({ draft, pickPlayer, onDone, getPlayers }) {
  const managerIdx = draft.wcCurrentManagerIdx;
  const manager = draft.managers[managerIdx];

  const budget = manager.chestBudget ?? 0;
  const remaining = manager.wcBudgetRemaining ?? 0;
  const spent = budget - remaining;
  const pct = budget > 0 ? Math.max(0, Math.min(100, (spent / budget) * 100)) : 0;

  const [activeSlot, setActiveSlot] = useState(null);
  const [search, setSearch] = useState("");

  const numHumans = draft.managers.filter(m => !m.isComputer).length;
  const humanManagerCount = numHumans;
  const currentHumanOrder = draft.managers.filter(m => !m.isComputer).findIndex(
    (_, i) => draft.managers.slice(0, managerIdx + 1).filter(m => !m.isComputer).length - 1 === i
  ) + 1;

  const allFilled = manager.squad.slice(0, WAR_CHEST_SLOTS.length).every(Boolean);
  // GK (0), DEF (1), MID (2) are required; slots 3 & 4 (ATT) must also be filled
  const requiredFilled = [0, 1, 2].every(i => manager.squad[i]);
  const canProceed = allFilled;

  function handleSlotClick(slotIdx) {
    if (manager.squad[slotIdx]) return; // already filled
    setActiveSlot(slotIdx === activeSlot ? null : slotIdx);
    setSearch("");
  }

  function handlePick(player) {
    if (player.value > remaining) return;
    pickPlayer(activeSlot, player);
    setActiveSlot(null);
    setSearch("");
  }

  const activePlayers = activeSlot !== null
    ? getPlayers(activeSlot)
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase()))
        .map(p => ({ ...p, affordable: p.value <= remaining }))
        .sort((a, b) => {
          if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
          return b.rating - a.rating;
        })
    : [];

  const totalManagers = draft.managers.length;
  const isLastHuman = (() => {
    const remainingHumans = draft.managers.slice(managerIdx + 1).filter(m => !m.isComputer);
    return remainingHumans.length === 0;
  })();

  return (
    <div className="draft-screen">
      <div className="draft-header">
        <div className="wc-draft-header-inner">
          <div className="wc-draft-kit-row">
            <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} size={28} />
            <div>
              <div className="wc-draft-club">{manager.clubName}</div>
              {totalManagers > 1 && (
                <div className="wc-draft-turn-badge">
                  {humanManagerCount > 1 ? `Player ${currentHumanOrder} of ${humanManagerCount}` : ""}
                </div>
              )}
            </div>
          </div>
          <div className="wc-budget-block">
            <div className="wc-budget-remaining">{formatChest(remaining)}</div>
            <div className="wc-budget-label">remaining of {formatChest(budget)}</div>
          </div>
        </div>
        <div className="wc-budget-bar-track">
          <div className="wc-budget-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="draft-main">
        <div className="wc-squad-slots">
          {WAR_CHEST_SLOTS.map((slotDef, idx) => {
            const player = manager.squad[idx];
            const isActive = activeSlot === idx;
            const slotColor = SLOT_COLORS[idx];
            return (
              <button
                key={idx}
                className={`wc-slot ${isActive ? "wc-slot-active" : ""} ${player ? "wc-slot-filled" : "wc-slot-empty"}`}
                onClick={() => handleSlotClick(idx)}
                style={{ "--slot-color": slotColor }}
              >
                <div className="wc-slot-label" style={{ color: slotColor }}>{slotDef.label.toUpperCase()}</div>
                {player ? (
                  <div className="wc-slot-player">
                    <span className="wc-slot-player-name">{player.name}</span>
                    <span className="wc-slot-player-meta">
                      <span className="wc-slot-pos-badge" style={{ background: posGroupColor(player.pos).bg, color: posGroupColor(player.pos).fg }}>{player.pos}</span>
                      <span className="wc-slot-rating">{player.rating}</span>
                      <span className="wc-slot-cost">{formatValue(player.value)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="wc-slot-placeholder">
                    {isActive ? "▲ pick a player above" : `+ add ${slotDef.label.toLowerCase()}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {activeSlot !== null && (
          <div className="wc-player-panel">
            <div className="wc-player-panel-header">
              <span>{WAR_CHEST_SLOTS[activeSlot].label.toUpperCase()}</span>
              <button className="wc-panel-close" onClick={() => setActiveSlot(null)}>✕</button>
            </div>
            <input
              className="wc-search"
              placeholder="Search player or club..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div className="wc-player-list">
              {activePlayers.length === 0 && (
                <div className="wc-no-players">No players available</div>
              )}
              {activePlayers.map(p => (
                <button
                  key={p.id}
                  className={`wc-player-row ${!p.affordable ? "wc-player-row-unaffordable" : ""}`}
                  onClick={() => p.affordable && handlePick(p)}
                  disabled={!p.affordable}
                  title={!p.affordable ? `Too expensive (need ${formatValue(p.value)})` : ""}
                >
                  <div className="wc-player-row-main">
                    <span className="wc-pr-name">{p.name}</span>
                    <span className="wc-pr-club">{p.club} · {p.years}</span>
                  </div>
                  <div className="wc-player-row-right">
                    <span
                      className="wc-pr-pos"
                      style={{ background: posGroupColor(p.pos).bg, color: posGroupColor(p.pos).fg }}
                    >{p.pos}</span>
                    <span
                      className="wc-pr-rating"
                      style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
                    >{p.rating}</span>
                    <span className={`wc-pr-value ${!p.affordable ? "wc-pr-value-red" : ""}`}>
                      {formatValue(p.value)}
                    </span>
                    {p.affordable && <span className="wc-pr-pick">PICK</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="wc-done-row">
          <button
            className={`start-btn ${canProceed ? "active" : ""}`}
            style={{ width: "100%", marginTop: "1rem" }}
            onClick={canProceed ? onDone : undefined}
            disabled={!canProceed}
          >
            {!requiredFilled
              ? "FILL GK · DEF · MID TO CONTINUE"
              : !allFilled
                ? "FILL ALL 5 SLOTS TO CONTINUE"
                : (isLastHuman ? "DONE — VIEW SQUADS →" : "DONE — PASS TO NEXT PLAYER →")}
          </button>
        </div>
      </div>
    </div>
  );
}

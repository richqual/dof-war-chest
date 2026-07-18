import { useState, useEffect } from "react";
import { WAR_CHEST_SLOTS } from "../hooks/draftUtils";
import { formatValue, getRatingBg, getRatingColor, normalizeSearch } from "../data/players";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";
import SquadTimer from "./SquadTimer";

function formatChest(v) {
  if (v === 0) return "FREE";
  if (v >= 1000) return `£${v / 1000}B`;
  return `£${v}m`;
}

function posGroupColor(pos) {
  if (pos === "GK") return { bg: "var(--bw-line-gk)", fg: "var(--bw-line-gk-ink)" };
  if (["RB", "LB", "CB"].includes(pos)) return { bg: "var(--bw-line-def)", fg: "var(--bw-line-def-text)" };
  if (["ST", "RW", "LW"].includes(pos)) return { bg: "#4a1f0a", fg: "var(--bw-line-att)" };
  return { bg: "var(--bw-line-mid)", fg: "var(--bw-line-mid-text)" };
}

const SLOT_COLORS = ["var(--bw-line-gk)", "var(--bw-line-def-text)", "var(--bw-line-mid-text)", "#c084fc", "#f472b6"];

export default function WarChestDraftScreen({ draft, pickPlayer, onDone, getPlayers, deadline }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const managerIdx = draft.wcCurrentManagerIdx;
  const manager = draft.managers[managerIdx];

  const budget = manager.chestBudget ?? 0;
  const remaining = manager.wcBudgetRemaining ?? 0;
  const spent = budget - remaining;
  const pct = budget > 0 ? Math.max(0, Math.min(100, (spent / budget) * 100)) : 0;

  const [activeSlot, setActiveSlot] = useState(null);
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState(null);

  const humanManagers = draft.managers.filter(m => !m.isComputer);
  const humanManagerCount = humanManagers.length;
  const currentHumanOrder = draft.managers.slice(0, managerIdx + 1).filter(m => !m.isComputer).length;

  const allFilled = manager.squad.slice(0, WAR_CHEST_SLOTS.length).every(Boolean);
  // GK (0), DEF (1), MID (2) are required; slots 3 & 4 (ATT) must also be filled
  const requiredFilled = [0, 1, 2].every(i => manager.squad[i]);
  const emptySlots = WAR_CHEST_SLOTS.filter((_, i) => !manager.squad[i]).length;
  const avgPerSlot = emptySlots > 0 ? Math.floor(remaining / emptySlots) : 0;
  const canProceed = allFilled;

  function handleSlotClick(slotIdx) {
    if (manager.squad[slotIdx]) return; // already filled
    setActiveSlot(slotIdx === activeSlot ? null : slotIdx);
    setSearch("");
    setPriceRange(null);
  }

  function handlePick(player) {
    if (player.value > remaining) return;
    pickPlayer(activeSlot, player);
    setActiveSlot(null);
    setSearch("");
  }

  const slotPlayers = activeSlot !== null ? getPlayers(activeSlot) : [];
  const boundsMin = slotPlayers.length ? Math.min(...slotPlayers.map(p => p.value)) : 0;
  const boundsMax = slotPlayers.length ? Math.max(...slotPlayers.map(p => p.value)) : 0;
  // Default the upper handle to what you can actually afford (clamped to the
  // slot's price range), so the list pre-filters to affordable players.
  const defaultMax = Math.max(boundsMin, Math.min(remaining, boundsMax));
  const [priceMin, priceMax] = priceRange ?? [boundsMin, defaultMax];

  const activePlayers = activeSlot !== null
    ? slotPlayers
        .filter(p => !search || normalizeSearch(p.name).includes(normalizeSearch(search)) || normalizeSearch(p.club).includes(normalizeSearch(search)))
        .filter(p => p.value >= priceMin && p.value <= priceMax)
        .map(p => ({ ...p, affordable: p.value <= remaining }))
        .sort((a, b) => {
          if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
          return b.rating - a.rating;
        })
    : [];

  const isLastHuman = (() => {
    // Building follows the drawn build order, not array order — count humans
    // still to come after the current build cursor.
    const order = draft.wcBuildOrder || draft.managers.map((_, i) => i);
    const cursor = draft.wcBuildCursor ?? order.indexOf(managerIdx);
    const remainingHumans = order.slice(cursor + 1).filter(mi => !draft.managers[mi].isComputer);
    return remainingHumans.length === 0;
  })();

  const kitPrimary = manager.primaryColor || "#1a3a6b";
  const kitSecondary = manager.secondaryColor || "#ffffff";
  const kitTheme = {
    "--kit-primary": kitPrimary,
    "--kit-secondary": kitSecondary,
    "--kit-text": readableTextOn(kitPrimary),
    "--kit-accent": kitAccent(kitPrimary, kitSecondary),
  };

  return (
    <div className="draft-screen" style={kitTheme}>
      <div className="draft-header">
        {deadline && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
            <SquadTimer deadline={deadline} />
          </div>
        )}
        <div className="bw-wcd-header-inner">
          <div className="bw-wcd-kit-row">
            <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} size={32} />
            <div>
              <div className="bw-wcd-club">{manager.clubName}</div>
              {humanManagerCount > 1 && (
                <div className="bw-wcd-turn-badge">Pick {currentHumanOrder} of {humanManagerCount}</div>
              )}
            </div>
          </div>
          {humanManagerCount > 1 && (
            <div className="bw-wcd-order-row">
              {humanManagers.map((m, i) => (
                <span
                  key={i}
                  className={`bw-wcd-order-pip ${draft.managers.indexOf(m) < managerIdx ? "done" : draft.managers.indexOf(m) === managerIdx ? "current" : "upcoming"}`}
                  title={m.clubName}
                >
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} size={14} />
                </span>
              ))}
            </div>
          )}
          <div className="bw-wcd-budget-remaining">{formatChest(remaining)}</div>
          <div className="bw-wcd-budget-labels">
            <div className="bw-wcd-budget-label">remaining of {formatChest(budget)}</div>
            {emptySlots > 0 && (
              <div className="bw-wcd-budget-avg">{formatChest(avgPerSlot)} avg per slot</div>
            )}
          </div>
        </div>
        <div className="bw-wcd-bar-track">
          <div className="bw-wcd-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="draft-main">
        <div className="bw-wcd-slots">
          {WAR_CHEST_SLOTS.map((slotDef, idx) => {
            const player = manager.squad[idx];
            const isActive = activeSlot === idx;
            const slotColor = SLOT_COLORS[idx];
            return (
              <button
                key={idx}
                className={`bw-wcd-slot ${isActive ? "active" : ""} ${player ? "filled" : "empty"}`}
                onClick={() => handleSlotClick(idx)}
                style={{ "--slot-color": slotColor }}
              >
                <div className="bw-wcd-slot-label" style={{ color: slotColor }}>{slotDef.label.toUpperCase()}</div>
                {player ? (
                  <div className="bw-wcd-slot-player">
                    <span className="bw-wcd-slot-player-name">{player.name}</span>
                    <span className="bw-wcd-slot-player-meta">
                      <span className="bw-wcd-slot-pos-badge" style={{ background: posGroupColor(player.pos).bg, color: posGroupColor(player.pos).fg }}>{player.pos}</span>
                      <span className="bw-wcd-slot-rating">{player.rating}</span>
                      <span className="bw-wcd-slot-cost">{formatValue(player.value)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="bw-wcd-slot-placeholder">
                    {isActive ? "▲ pick a player above" : `+ add ${slotDef.label.toLowerCase()}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {activeSlot !== null && (
          <div className="bw-wcd-panel">
            <div className="bw-wcd-panel-header">
              <span>{WAR_CHEST_SLOTS[activeSlot].label.toUpperCase()}</span>
              <button className="bw-wcd-panel-close" onClick={() => setActiveSlot(null)}>✕</button>
            </div>
            <div className="bw-search-box">
              <span className="bw-search-icon">⌕</span>
              <input
                className="bw-search-input"
                placeholder="Search player or club..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {boundsMax > boundsMin && (
              <div className="bw-wcd-price-filter">
                <div className="bw-wcd-price-filter-labels">
                  <span>{formatValue(priceMin)}</span>
                  <span>{formatValue(priceMax)}</span>
                </div>
                <div className="bw-wcd-price-slider">
                  <div className="bw-wcd-price-slider-track" />
                  <div
                    className="bw-wcd-price-slider-fill"
                    style={{
                      left: `${((priceMin - boundsMin) / (boundsMax - boundsMin)) * 100}%`,
                      right: `${100 - ((priceMax - boundsMin) / (boundsMax - boundsMin)) * 100}%`,
                    }}
                  />
                  <input
                    type="range"
                    className="bw-wcd-price-slider-input"
                    min={boundsMin}
                    max={boundsMax}
                    value={priceMin}
                    onChange={e => setPriceRange([Math.min(Number(e.target.value), priceMax), priceMax])}
                  />
                  <input
                    type="range"
                    className="bw-wcd-price-slider-input"
                    min={boundsMin}
                    max={boundsMax}
                    value={priceMax}
                    onChange={e => setPriceRange([priceMin, Math.max(Number(e.target.value), priceMin)])}
                  />
                </div>
              </div>
            )}
            <div className="bw-wcd-player-list">
              {activePlayers.length === 0 && (
                <div className="bw-no-players">No players available</div>
              )}
              {activePlayers.map(p => (
                <button
                  key={p.id}
                  className={`bw-player-row ${p.affordable ? "affordable" : "unaffordable"}`}
                  onClick={() => p.affordable && handlePick(p)}
                  disabled={!p.affordable}
                  title={!p.affordable ? `Too expensive (need ${formatValue(p.value)})` : ""}
                >
                  <div
                    className="bw-player-rating"
                    style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
                  >
                    {p.rating}
                  </div>
                  <div className="bw-player-info">
                    <div className="bw-player-name-row">
                      <span className="bw-player-name">{p.name}</span>
                      <span
                        className="bw-player-tag"
                        style={{ background: posGroupColor(p.pos).bg, color: posGroupColor(p.pos).fg }}
                      >{p.pos}</span>
                    </div>
                    <div className="bw-player-club">{p.club} · {p.years}</div>
                  </div>
                  <div className="bw-player-value">{formatValue(p.value)}</div>
                  {p.affordable ? (
                    <div className="bw-player-sign-btn">PICK</div>
                  ) : (
                    <div className="bw-player-over-btn">{formatValue(p.value - remaining)} OVER</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="bw-cta-primary"
          style={{ marginTop: "1rem" }}
          onClick={canProceed ? onDone : undefined}
          disabled={!canProceed}
        >
          {!requiredFilled
            ? "COMPLETE YOUR SQUAD TO CONTINUE"
            : !allFilled
              ? "FILL ALL 5 SLOTS TO CONTINUE"
              : (isLastHuman ? "DONE — VIEW SQUADS →" : "DONE — PASS TO NEXT PLAYER →")}
        </button>
      </div>
    </div>
  );
}

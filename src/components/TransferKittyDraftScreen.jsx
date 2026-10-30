import { useState, useEffect } from "react";
import { formationPos } from "../hooks/draftUtils";
import { formatValue, getRatingBg, getRatingColor, normalizeSearch } from "../data/players";
import { KITTY_BLOCK_POSITIONS } from "../hooks/kittyUtils";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";
import MySquadPanel from "./MySquadPanel";
import { ARCHETYPE_COLOR } from "./PlayerCard";

function formatKitty(v) {
  if (v === 0) return "FREE";
  if (v >= 1000) return `£${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}B`;
  return `£${v}m`;
}

// Bench slots (11–15) carry SUB_POSITION keys, not real playing positions.
// Give each a friendly label so a slot reads "SUB MID", not "MIDSUB".
const SUB_LABEL = { GKSUB: "SUB GK", DEFSUB: "SUB DEF", MIDSUB: "SUB MID", WIDSUB: "SUB WIDE", ATTSUB: "SUB ATT" };

function posGroupColor(pos) {
  if (pos === "GK" || pos === "GKSUB") return { bg: "var(--bw-line-gk)", fg: "var(--bw-line-gk-ink)" };
  if (["RB", "LB", "CB", "DEFSUB"].includes(pos)) return { bg: "var(--bw-line-def)", fg: "var(--bw-line-def-text)" };
  if (["ST", "RW", "LW", "CF", "ATTSUB"].includes(pos)) return { bg: "#4a1f0a", fg: "var(--bw-line-att)" };
  return { bg: "var(--bw-line-mid)", fg: "var(--bw-line-mid-text)" };
}

// The label shown on a slot chip — friendly for bench slots, raw position otherwise.
function slotPosLabel(pos) {
  return SUB_LABEL[pos] || pos;
}

// A player's archetype badge, coloured by type. When the manager has a Director
// of Football, a matching archetype shows at full strength and a non-match dims —
// so the DoF's preferred styles stand out (mirrors Classic's PlayerCard).
function ArchetypeTag({ archetype, preferred, pos, preferredGk }) {
  if (!archetype) return null;
  const c = ARCHETYPE_COLOR[archetype];
  // Keepers match against the manager's preferred GK archetype instead.
  const effectivePreferred = pos === "GK" ? (preferredGk ? [preferredGk] : null) : preferred;
  const isPreferred = effectivePreferred && effectivePreferred.includes(archetype);
  return (
    <span
      className="bw-player-tag"
      style={c ? {
        background: c.bg, color: c.fg, borderColor: `${c.fg}55`,
        opacity: effectivePreferred && !isPreferred ? 0.55 : 1,
      } : undefined}
      title={isPreferred ? "Preferred archetype for your Director of Football" : undefined}
    >
      {archetype}
    </span>
  );
}

const GK_ARCHETYPES = ["Sweeper Keeper", "Shot Stopper", "Organiser"];
const OUTFIELD_ARCHETYPES = ["Warrior", "Technician", "Maverick", "Grinder", "Leader", "Athlete"];
const TIERS = [
  { value: "T1", label: "T1 — Elite" },
  { value: "T2", label: "T2 — World Class" },
  { value: "T3", label: "T3 — Star" },
  { value: "T4", label: "T4 — Quality" },
  { value: "T5", label: "T5 — Solid" },
];
const ALL_TIERS = TIERS.map(t => t.value);

const BLOCK_ORDER = ["GK", "DEF", "MID", "ATT", "SUBS"];

// One block of a Transfer Kitty draft. Reuses War Chest's browse/pick UX but
// scoped to the current block's slot subset, spending the block's kitty.
export default function TransferKittyDraftScreen({ draft, pickPlayer, unpickPlayer, onDone, getPlayers }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const managerIdx = draft.currentOrder[draft.turnIndex];
  const manager = draft.managers[managerIdx];
  const block = draft.blocks[draft.tkBlockIndex];
  const formation = draft.drawFormation;
  const hideRatings = !!draft.hideRatings;
  // The manager's Director of Football preferred archetypes — a matching player's
  // tag shows full-strength, a non-match dims (same as Classic's PlayerCard).
  const preferredArchetypes = manager.footballManager?.preferredArchetypes || null;
  const preferredGkArchetype = manager.footballManager?.preferredGkArchetype || null;

  const kitty = manager.blockKitty ?? 0;
  const remaining = manager.kittyRemaining ?? 0;
  const spent = kitty - remaining;
  const pct = kitty > 0 ? Math.max(0, Math.min(100, (spent / kitty) * 100)) : 0;

  const [activeSlot, setActiveSlot] = useState(null);
  // Multi-select position filter: a Set of chosen positions (null = none/GK/subs).
  const [posFilter, setPosFilter] = useState(null);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState(null);
  // Sorting by rating makes hidden-rating drafting too easy — default to price
  // and only offer the rating sort when ratings are visible.
  const [sortBy, setSortBy] = useState(hideRatings ? "price" : "rating");
  const [filterTiers, setFilterTiers] = useState(() => new Set(ALL_TIERS));
  const [filterArchetypes, setFilterArchetypes] = useState(null); // null = all
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showArchetypeDropdown, setShowArchetypeDropdown] = useState(false);
  const [viewingSquad, setViewingSquad] = useState(false);

  // Archetypes relevant to the active slot — GK archetypes for the bench keeper,
  // outfield archetypes for everyone else.
  const activePos = activeSlot !== null ? formationPos(formation, activeSlot) : null;
  const relevantArchetypes = (activePos === "GKSUB" || activePos === "GK") ? GK_ARCHETYPES : OUTFIELD_ARCHETYPES;

  function toggleTier(tier) {
    setFilterTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next.size ? next : new Set(ALL_TIERS);
    });
  }
  function toggleArchetype(a) {
    setFilterArchetypes(prev => {
      const next = new Set(prev ?? relevantArchetypes);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  }

  // Positions the manager may choose across for this block's slots (e.g. gear a
  // 4-3-3 midfield toward a CAM). Empty for GK/subs — those aren't filtered.
  const blockPositions = KITTY_BLOCK_POSITIONS[block.key] || [];

  const slots = block.slotIndices;
  const allFilled = slots.every(si => manager.squad[si]);
  const emptyCount = slots.filter(si => !manager.squad[si]).length;
  const avgPerSlot = emptyCount > 0 ? Math.floor(remaining / emptyCount) : 0;

  const isLastHuman = (() => {
    const after = draft.currentOrder.slice(draft.turnIndex + 1);
    return after.every(mi => draft.managers[mi].isComputer);
  })();
  // Only the SUBS block (index 4) is the true final block — after DEF/MID/ATT
  // the subs phase still follows, so those read "next block", not "view squads".
  const isFinalBlock = draft.tkBlockIndex >= 4;

  function resetFilters() {
    setSearch(""); setPriceRange(null); setSortBy(hideRatings ? "price" : "rating");
    setFilterTiers(new Set(ALL_TIERS)); setFilterArchetypes(null);
    setShowTierDropdown(false); setShowArchetypeDropdown(false);
  }
  function openSlot(slotIdx) {
    // Seed the position filter with the slot's natural position (the default),
    // unless this block isn't filterable (GK/subs) — then leave it off.
    const natural = formationPos(formation, slotIdx);
    setPosFilter(blockPositions.includes(natural) ? new Set([natural]) : null);
  }
  function handleSlotClick(slotIdx) {
    if (manager.squad[slotIdx]) return;
    const opening = slotIdx !== activeSlot;
    setActiveSlot(opening ? slotIdx : null);
    if (opening) openSlot(slotIdx);
    resetFilters();
  }
  function handlePick(player) {
    if (player.value > remaining) return;
    setPendingPlayer(player);
  }
  function confirmSign() {
    if (!pendingPlayer || activeSlot === null) return;
    pickPlayer(activeSlot, pendingPlayer);
    setActiveSlot(null);
    setPendingPlayer(null);
    resetFilters();
  }
  function handleEditSlot(e, slotIdx) {
    e.stopPropagation();
    if (!unpickPlayer || !manager.squad[slotIdx]) return;
    unpickPlayer(slotIdx);
    setActiveSlot(slotIdx);
    openSlot(slotIdx);
    resetFilters();
  }

  function handlePosFilter(pos) {
    setPosFilter(prev => {
      const next = new Set(prev ?? []);
      if (next.has(pos)) next.delete(pos); else next.add(pos);
      // Never leave the filter empty — deselecting the last chip shows the whole
      // block family again rather than an empty list.
      return next.size ? next : new Set(blockPositions);
    });
    // The pool changes, so let the price slider re-fit its new bounds.
    setPriceRange(null);
  }

  const posFilterList = posFilter ? [...posFilter] : null;
  const slotPlayers = activeSlot !== null ? getPlayers(activeSlot, posFilterList) : [];
  const boundsMin = slotPlayers.length ? Math.min(...slotPlayers.map(p => p.value)) : 0;
  const boundsMax = slotPlayers.length ? Math.max(...slotPlayers.map(p => p.value)) : 0;
  // Default the price slider to the FULL spread, not to what's affordable. Capping
  // at `remaining` silently hid every pricier player — and because the cheap end
  // of a pool skews to one position (e.g. budget midfielders are mostly DMs), that
  // made the list look position-filtered. Affordability is already shown by the
  // affordable-first sort + greyed "£X OVER" rows, so nothing needs hiding here.
  const [priceMin, priceMax] = priceRange ?? [boundsMin, boundsMax];

  const archetypeActive = filterArchetypes && filterArchetypes.size < relevantArchetypes.length;
  const activePlayers = activeSlot !== null
    ? slotPlayers
        .filter(p => !search || normalizeSearch(p.name).includes(normalizeSearch(search)) || normalizeSearch(p.club).includes(normalizeSearch(search)))
        .filter(p => p.value >= priceMin && p.value <= priceMax)
        .filter(p => !p.tier || filterTiers.has(p.tier))
        .filter(p => !archetypeActive || !p.archetype || filterArchetypes.has(p.archetype))
        .map(p => ({ ...p, affordable: p.value <= remaining }))
        .sort((a, b) => {
          if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
          return sortBy === "price" ? b.value - a.value : b.rating - a.rating;
        })
    : [];

  const kitPrimary = manager.primaryColor || "#1a3a6b";
  const kitSecondary = manager.secondaryColor || "#ffffff";
  const kitTheme = {
    "--kit-primary": kitPrimary,
    "--kit-secondary": kitSecondary,
    "--kit-text": readableTextOn(kitPrimary),
    "--kit-accent": kitAccent(kitPrimary, kitSecondary),
  };

  return (
    <div className="draft-screen bw-tk-draft" style={kitTheme}>
      <div className="draft-header">
        <div className="bw-wcd-header-inner">
          <button
            className={`bw-tk-squad-btn ${viewingSquad ? "active" : ""}`}
            onClick={() => setViewingSquad(v => !v)}
            title={viewingSquad ? "Hide my squad" : "View my squad"}
            aria-pressed={viewingSquad}
          >▤</button>
          <div className="bw-tk-block-crumbs">
            {BLOCK_ORDER.map((k, i) => (
              <span key={k} className={`bw-tk-crumb ${i === draft.tkBlockIndex ? "current" : i < draft.tkBlockIndex ? "done" : "upcoming"}`}>{k}</span>
            ))}
          </div>
          <div className="bw-wcd-kit-row">
            <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} size={32} />
            <div>
              <div className="bw-wcd-club">{manager.clubName}</div>
              <div className="bw-wcd-turn-badge bw-tk-block-name">{block.label.toUpperCase()}</div>
            </div>
          </div>
          <div className="bw-wcd-budget-remaining">{formatKitty(remaining)}</div>
          <div className="bw-wcd-budget-labels">
            <div className="bw-wcd-budget-label">
              {block.key === "GK" ? "spun keeper budget" : "kitty remaining"} of {formatKitty(kitty)}
            </div>
            {emptyCount > 0 && slots.length > 1 && (
              <div className="bw-wcd-budget-avg">{formatKitty(avgPerSlot)} avg per slot</div>
            )}
          </div>
        </div>
        <div className="bw-wcd-bar-track">
          <div className="bw-wcd-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="draft-main">
        <div className="bw-wcd-slots">
          {slots.map(si => {
            const player = manager.squad[si];
            const isActive = activeSlot === si;
            const pos = formationPos(formation, si);
            const pc = posGroupColor(pos);
            return (
              <button
                key={si}
                className={`bw-wcd-slot ${isActive ? "active" : ""} ${player ? "filled" : "empty"}`}
                onClick={() => handleSlotClick(si)}
                style={{ "--slot-color": pc.bg }}
              >
                <div className="bw-wcd-slot-label" style={{ color: "var(--kit-accent)" }}>{slotPosLabel(pos)}</div>
                {player ? (
                  <div className="bw-wcd-slot-player">
                    <span className="bw-wcd-slot-player-name">{player.name}</span>
                    <span className="bw-wcd-slot-player-meta">
                      <span className="bw-wcd-slot-pos-badge" style={{ background: pc.bg, color: pc.fg }}>{player.pos}</span>
                      {!hideRatings && <span className="bw-wcd-slot-rating">{player.rating}</span>}
                      <span className="bw-wcd-slot-cost">{formatValue(player.value)}</span>
                    </span>
                    {unpickPlayer && (
                      <span
                        role="button" tabIndex={0} className="bw-wcd-slot-edit" title="Change this player"
                        onClick={e => handleEditSlot(e, si)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleEditSlot(e, si); }}
                      >✎</span>
                    )}
                  </div>
                ) : (
                  <div className="bw-wcd-slot-placeholder">{isActive ? "▲ pick a player above" : `+ add ${slotPosLabel(pos)}`}</div>
                )}
              </button>
            );
          })}
        </div>

        {activeSlot !== null && (
          <div className="bw-wcd-panel">
            <div className="bw-wcd-panel-header">
              <span>{posFilterList && posFilterList.length ? posFilterList.join(" / ") : slotPosLabel(formationPos(formation, activeSlot))}</span>
              <button className="bw-wcd-panel-close" onClick={() => setActiveSlot(null)}>✕</button>
            </div>
            {blockPositions.length > 1 && (
              <div className="bw-tk-pos-filter">
                {blockPositions.map(pos => (
                  <button
                    key={pos}
                    className={`bw-tk-pos-chip ${posFilter?.has(pos) ? "active" : ""}`}
                    onClick={() => handlePosFilter(pos)}
                  >{pos}</button>
                ))}
              </div>
            )}
            <div className="bw-search-box">
              <span className="bw-search-icon">⌕</span>
              <input className="bw-search-input" placeholder="Search player or club..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="bw-filter-chips">
              <div className="bw-filter-chip-wrap">
                <button
                  className={`bw-filter-chip ${filterTiers.size < 5 ? "active" : ""}`}
                  onClick={() => { setShowTierDropdown(s => !s); setShowArchetypeDropdown(false); }}
                >
                  Tiers {filterTiers.size < 5 ? `(${filterTiers.size}/5)` : ""}
                </button>
                {showTierDropdown && (
                  <div className="bw-filter-menu">
                    {TIERS.map(tier => (
                      <label key={tier.value} className="bw-filter-checkbox">
                        <input type="checkbox" checked={filterTiers.has(tier.value)} onChange={() => toggleTier(tier.value)} />
                        {tier.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="bw-filter-chip-wrap">
                <button
                  className={`bw-filter-chip ${archetypeActive ? "active" : ""}`}
                  onClick={() => { setShowArchetypeDropdown(s => !s); setShowTierDropdown(false); }}
                >
                  Type {archetypeActive ? `(${filterArchetypes.size}/${relevantArchetypes.length})` : ""}
                </button>
                {showArchetypeDropdown && (
                  <div className="bw-filter-menu">
                    {relevantArchetypes.map(a => (
                      <label key={a} className="bw-filter-checkbox">
                        <input type="checkbox" checked={(filterArchetypes ?? new Set(relevantArchetypes)).has(a)} onChange={() => toggleArchetype(a)} />
                        {a}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {boundsMax > boundsMin && (
              <div className="bw-wcd-price-filter">
                <div className="bw-wcd-price-filter-labels">
                  <span>{formatValue(priceMin)}</span>
                  <span>{formatValue(priceMax)}</span>
                </div>
                <div className="bw-wcd-price-slider">
                  <div className="bw-wcd-price-slider-track" />
                  <div className="bw-wcd-price-slider-fill" style={{
                    left: `${((priceMin - boundsMin) / (boundsMax - boundsMin)) * 100}%`,
                    right: `${100 - ((priceMax - boundsMin) / (boundsMax - boundsMin)) * 100}%`,
                  }} />
                  <input type="range" className="bw-wcd-price-slider-input" min={boundsMin} max={boundsMax} value={priceMin}
                    onChange={e => setPriceRange([Math.min(Number(e.target.value), priceMax), priceMax])} />
                  <input type="range" className="bw-wcd-price-slider-input" min={boundsMin} max={boundsMax} value={priceMax}
                    onChange={e => setPriceRange([priceMin, Math.max(Number(e.target.value), priceMin)])} />
                </div>
              </div>
            )}
            {activePlayers.length > 1 && !hideRatings && (
              <div className="bw-wcd-filter-row">
                <div className="bw-wcd-sort-toggle">
                  <span className="bw-wcd-sort-label">SORT</span>
                  <button className={`bw-wcd-sort-btn ${sortBy === "rating" ? "active" : ""}`} onClick={() => setSortBy("rating")}>RATING</button>
                  <button className={`bw-wcd-sort-btn ${sortBy === "price" ? "active" : ""}`} onClick={() => setSortBy("price")}>PRICE</button>
                </div>
              </div>
            )}
            <div className="bw-wcd-player-list">
              {activePlayers.length === 0 && <div className="bw-no-players">No players available</div>}
              {activePlayers.map(p => (
                <button
                  key={p.id}
                  className={`bw-player-row ${p.affordable ? "affordable" : "unaffordable"}`}
                  onClick={() => p.affordable && handlePick(p)}
                  disabled={!p.affordable}
                  title={!p.affordable ? `Too expensive (need ${formatValue(p.value)})` : ""}
                >
                  {!hideRatings && <div className="bw-player-rating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</div>}
                  <div className="bw-player-info">
                    <div className="bw-player-name-row">
                      <span className="bw-player-name">{p.name}</span>
                      <span className="bw-player-tag" style={{ background: posGroupColor(p.pos).bg, color: posGroupColor(p.pos).fg }}>{p.pos}</span>
                      <ArchetypeTag archetype={p.archetype} preferred={preferredArchetypes} pos={p.pos} preferredGk={preferredGkArchetype} />
                    </div>
                    <div className="bw-player-club">{p.club} · {p.years}</div>
                  </div>
                  <div className="bw-player-value">{formatValue(p.value)}</div>
                  {p.affordable
                    ? <div className="bw-player-sign-btn">PICK</div>
                    : <div className="bw-player-over-btn">{formatValue(p.value - remaining)} OVER</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="bw-cta-primary" style={{ marginTop: "1rem" }} onClick={allFilled ? onDone : undefined} disabled={!allFilled}>
          {!allFilled
            ? `FILL ALL ${slots.length} ${block.label.toUpperCase()} SLOT${slots.length > 1 ? "S" : ""} TO CONTINUE`
            : isLastHuman
              ? (isFinalBlock ? "DONE — VIEW SQUADS" : "DONE — NEXT BLOCK")
              : "DONE — PASS TO NEXT MANAGER"}
        </button>
      </div>

      {viewingSquad && (
        <MySquadPanel manager={{ ...manager, formation: manager.formation || formation }} onClose={() => setViewingSquad(false)} hideRatings={hideRatings} />
      )}

      {pendingPlayer && (
        <div className="bw-wcd-confirm-overlay" onClick={() => setPendingPlayer(null)}>
          <div className="bw-wcd-confirm-card" style={kitTheme} onClick={e => e.stopPropagation()}>
            <div className="bw-wcd-confirm-title">Sign this player?</div>
            <div className="bw-wcd-confirm-player">
              {!hideRatings && <div className="bw-player-rating" style={{ background: getRatingBg(pendingPlayer.rating), color: getRatingColor(pendingPlayer.rating) }}>{pendingPlayer.rating}</div>}
              <div className="bw-player-info">
                <div className="bw-player-name-row">
                  <span className="bw-player-name">{pendingPlayer.name}</span>
                  <span className="bw-player-tag" style={{ background: posGroupColor(pendingPlayer.pos).bg, color: posGroupColor(pendingPlayer.pos).fg }}>{pendingPlayer.pos}</span>
                  <ArchetypeTag archetype={pendingPlayer.archetype} preferred={preferredArchetypes} pos={pendingPlayer.pos} preferredGk={preferredGkArchetype} />
                </div>
                <div className="bw-player-club">{pendingPlayer.club} · {pendingPlayer.years}</div>
              </div>
              <div className="bw-player-value">{formatValue(pendingPlayer.value)}</div>
            </div>
            <div className="bw-wcd-confirm-budget">
              <span>Kitty after signing</span>
              <span className="bw-wcd-confirm-budget-val">{formatKitty(remaining - pendingPlayer.value)}</span>
            </div>
            <div className="bw-wcd-confirm-actions">
              <button className="bw-wcd-confirm-cancel" onClick={() => setPendingPlayer(null)}>CANCEL</button>
              <button className="bw-wcd-confirm-sign" onClick={confirmSign}>CONFIRM SIGNING</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

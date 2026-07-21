import { useState } from "react";
import { POSITIONS, getRatingBg, getRatingColor, formatValue, ERA_LABELS, ERA_COLORS, ERA_BG } from "../data/players";
import { FORMATIONS, FORMATION_LIST } from "../data/formations";

import { TIER_LABELS, TIER_COLORS, TIER_BG } from "../data/managers";
import { ARCHETYPE_COLOR } from "./PlayerCard";
import { getFormArrow } from "../hooks/useDraftState";
import DrawPanel from "./DrawPanel";
import KitSwatch, { kitAccent, readableTextOn } from "./KitSwatch";
import { lastName } from "../utils/displayName";


const TACTICS = ["defensive", "balanced", "attacking"];
const TACTICS_LABEL = { defensive: "DEF", balanced: "BALANCED", attacking: "ATT" };

function lineColors(pos) {
  if (pos === "GK") return { bg: "var(--bw-line-gk)", text: "var(--bw-line-gk-ink)", label: "var(--bw-line-gk)", size: 40 };
  if (["RB", "LB", "CB", "WB"].includes(pos)) return { bg: "var(--bw-line-def)", text: "#fff", label: "var(--bw-line-def-text)", size: 38 };
  if (["ST", "RW", "LW"].includes(pos)) return { bg: "var(--bw-line-att)", text: "#fff", label: "var(--bw-line-att)", size: 40 };
  return { bg: "var(--bw-line-mid)", text: "#fff", label: "var(--bw-line-mid-text)", size: 40 }; // DM, CM, RM, LM, CAM
}

function cohesionPct(squad, fm) {
  if (!fm?.preferredArchetypes?.length) return null;
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return null;
  return Math.round((starters.filter(p => fm.preferredArchetypes.includes(p.archetype)).length / starters.length) * 100);
}

function squadRating(squad) {
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return 0;
  return Math.round(starters.reduce((s, p) => s + p.rating, 0) / starters.length);
}

// Typical GK-kit colours. The keeper is shown in whichever of these sits
// furthest from the club's outfield colours, so it never clashes.
const GK_KITS = ["#1f8a3b", "#111111", "#f0c400", "#f07000"];

function hexRgb(h) {
  const s = (h || "").replace("#", "");
  const v = s.length === 3 ? s.split("").map(c => c + c).join("") : s;
  const n = parseInt(v, 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function colorDist(a, b) {
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
function pickGkKit(primary, secondary) {
  let best = GK_KITS[0], bestScore = -1;
  for (const gk of GK_KITS) {
    // Score by the closest club colour — maximise the worst-case separation.
    const score = Math.min(colorDist(gk, primary || "#888"), colorDist(gk, secondary || primary || "#888"));
    if (score > bestScore) { bestScore = score; best = gk; }
  }
  return best;
}

function SquadPitch({ squad, formation, swapSlot, onSlotClick, kitPrimary, kitSecondary }) {
  const coords = FORMATIONS[formation];
  const tokenBg = kitPrimary || null;
  const tokenInk = kitPrimary ? readableTextOn(kitPrimary) : null;
  const tokenBorder = kitSecondary || "rgba(255,255,255,.9)";
  const gkKit = kitPrimary ? pickGkKit(kitPrimary, kitSecondary) : null;
  return (
    <div className="bw-pitch">
      <div className="bw-pitch-stripes" />
      <div className="bw-pitch-halfway" />
      <div className="bw-pitch-circle" />
      {coords.map((coord, i) => {
        const player = squad[i];
        const isSwapping = swapSlot === i;
        const lc = lineColors(coord.pos);
        const isGk = coord.pos === "GK";
        const slotBg = isGk && gkKit ? gkKit : (tokenBg || lc.bg);
        const slotInk = isGk && gkKit ? readableTextOn(gkKit) : (tokenInk || lc.text);
        return (
          <div
            key={i}
            className={`bw-pitch-slot${isSwapping ? " swapping" : ""}${!player ? " empty" : ""}`}
            style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
            onClick={() => onSlotClick(i)}
            title={player ? `${player.name} (${player.rating})` : coord.pos}
          >
            {player ? (
              <>
                <div className="bw-pitch-token" style={{ width: lc.size, height: lc.size, background: slotBg, color: slotInk, borderColor: tokenBorder }}>
                  {coord.pos}
                </div>
                <div className="bw-pitch-token-name">{lastName(player.name)}</div>
              </>
            ) : (
              <div className="bw-pitch-token bw-pitch-token-empty">{coord.pos}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function drawSquadCard(manager, captainId, starters, bench) {
  const W = 420, DPR = 2, BAR = 10, PAD = 16, ROW_H = 22;
  const H = 120 + starters.length * ROW_H + 28 + bench.length * ROW_H + 60;
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR; canvas.height = H * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  const primary = manager.primaryColor || "#c8a800";
  const secondary = manager.secondaryColor || primary;
  const amber = "#c8a800";
  const bg = "#0a150a", bg2 = "#111d11";
  const text = "#d4e8d4", text2 = "#6aba6a", text3 = "#5a7a5a";
  const border = "rgba(255,255,255,0.08)";
  const teamName = manager.teamName || manager.name;
  const fm = manager.footballManager;
  const ovr = squadRating(manager.squad);
  const captain = [...starters, ...bench].find(p => p?.id === captainId);

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y);
    c.quadraticCurveTo(x+w,y,x+w,y+r); c.lineTo(x+w,y+h-r);
    c.quadraticCurveTo(x+w,y+h,x+w-r,y+h); c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r);
    c.quadraticCurveTo(x,y,x+r,y); c.closePath();
  }

  // Background
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Top kit bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, primary); topGrad.addColorStop(1, secondary);
  ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, BAR);
  const glowGrad = ctx.createLinearGradient(0, BAR, 0, BAR + 50);
  glowGrad.addColorStop(0, primary + "22"); glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad; ctx.fillRect(0, BAR, W, 50);

  let y = BAR + 14;

  // Team name
  ctx.font = `bold 22px 'Share Tech Mono', monospace`;
  ctx.fillStyle = text; ctx.textAlign = "left";
  ctx.fillText(teamName, PAD, y + 18); y += 26;

  // Gaffer + captain row
  ctx.font = `13px 'VT323', monospace`;
  ctx.fillStyle = text3;
  if (fm) ctx.fillText(`THE GAFFER  ${fm.name}`, PAD, y + 12);
  if (captain) {
    ctx.textAlign = "right";
    ctx.fillStyle = amber;
    ctx.fillText(`(C) ${captain.name}`, W - PAD, y + 12);
    ctx.textAlign = "left";
  }
  y += 18;

  // OVR + value row
  ctx.font = `13px 'VT323', monospace`;
  ctx.fillStyle = amber; ctx.textAlign = "left";
  ctx.fillText(`OVR ${ovr}`, PAD, y + 12);
  ctx.textAlign = "right";
  ctx.fillText(formatValue(squadRating ? manager.squad.reduce((s,p)=>s+(p?.value||0),0) : 0), W - PAD, y + 12);
  ctx.textAlign = "left"; y += 20;

  // Divider
  ctx.strokeStyle = border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); y += 10;

  function drawSection(label, players, isBench) {
    ctx.font = `11px 'VT323', monospace`;
    ctx.fillStyle = text3; ctx.textAlign = "left";
    ctx.fillText(label, PAD, y + 10); y += 16;
    players.forEach(p => {
      if (!p) return;
      const isCap = p.id === captainId;
      ctx.font = `14px 'Share Tech Mono', monospace`;
      ctx.fillStyle = text3; ctx.textAlign = "left";
      ctx.fillText(isBench ? "SUB" : (p.pos || ""), PAD, y + 13);
      ctx.fillStyle = isCap ? amber : text;
      ctx.fillText((isCap ? "(C) " : "") + p.name, PAD + 40, y + 13);
      // Rating badge
      const rb = p.rating >= 90 ? "#7c3aed" : p.rating >= 85 ? "#1d6b3e" : p.rating >= 80 ? "#1e40af" : "#374151";
      ctx.fillStyle = rb;
      roundRect(ctx, W - PAD - 28, y + 2, 28, 16, 3); ctx.fill();
      ctx.font = `bold 13px 'VT323', monospace`;
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(p.rating, W - PAD - 14, y + 14);
      ctx.textAlign = "left"; y += ROW_H;
    });
  }

  drawSection("STARTING XI", starters, false);
  y += 4;
  ctx.strokeStyle = border; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); y += 8;
  drawSection("BENCH", bench.filter(Boolean), true);

  // Footer
  y += 10;
  ctx.strokeStyle = border; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); y += 12;
  ctx.font = `12px 'VT323', monospace`; ctx.fillStyle = text3; ctx.textAlign = "center";
  ctx.fillText("THE TRANSFER WHEEL  ·  transfer-game.vercel.app", W / 2, y + 8);

  // Bottom bar
  ctx.fillStyle = topGrad; ctx.fillRect(0, H - BAR, W, BAR);
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, primary); botGrad.addColorStop(1, secondary);
  ctx.fillStyle = botGrad; ctx.fillRect(0, H - BAR, W, BAR);

  return canvas;
}

function SquadDetail({ draft, manager, managerIdx, setTeamName, swapSquadPlayers, setTactics, setFormation, onBack, onSimulate, allManagers, managers, captainId, setCaptain }) {
  // Formation is persisted on the manager so it carries across games, series and
  // tournaments (MatchSim reads manager.formation). Derive directly from the prop.
  const formation = manager.formation || "4-3-3";
  const [swapSlot, setSwapSlot] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(manager.teamName || "");
  const [hideBadges, setHideBadges] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [mgrMinimized, setMgrMinimized] = useState(false);
  const [showPitch, setShowPitch] = useState(true);
  const [showBench, setShowBench] = useState(false);
  const [selectingCaptain, setSelectingCaptain] = useState(false);
  const [exporting, setExporting] = useState(false);

  const starters = manager.squad.slice(0, 11);
  const bench = manager.squad.slice(11);

  function handleSlotClick(idx) {
    if (swapSlot === null) {
      setSwapSlot(idx);
    } else if (swapSlot === idx) {
      setSwapSlot(null);
    } else {
      swapSquadPlayers(managerIdx, swapSlot, idx);
      setSwapSlot(null);
    }
  }

  function handleBenchClick(idx) {
    const realIdx = idx + 11;
    if (swapSlot === null) {
      setSwapSlot(realIdx);
    } else if (swapSlot === realIdx) {
      setSwapSlot(null);
    } else {
      swapSquadPlayers(managerIdx, swapSlot, realIdx);
      setSwapSlot(null);
    }
  }

  const totalSquadValue = manager.squad.filter(Boolean).reduce((s, p) => s + (p.value || 0), 0);

  async function exportSquad() {
    setExporting(true);
    try {
      const canvas = drawSquadCard(manager, captainId, starters, bench);
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const file = new File([blob], `${(manager.teamName || "squad").replace(/\s+/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${manager.teamName || manager.name} Squad` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  const fm = manager.footballManager;
  const STYLE_TACTICAL_LINE = {
    pressing:   "plays in a relentless high-press style — they win it back fast and hit hard.",
    counter:    "sit deep and hit on the counter — disciplined, dangerous, and hard to break down.",
    attacking:  "go for the jugular — high-tempo, attack-minded, and fearless.",
    possession: "control the game through the ball — patient, precise, and suffocating.",
    direct:     "play direct and physical — aerial threat, set pieces, and raw intensity.",
    wildcard:   "are impossible to predict — anything could happen, and usually does.",
  };

  const kitPrimary = manager.primaryColor || "#1a3a6b";
  const kitSecondary = manager.secondaryColor || "#132a4e";
  const kitTheme = {
    "--kit-primary": kitPrimary,
    "--kit-secondary": kitSecondary,
    "--kit-text": readableTextOn(kitPrimary),
  };
  const filledBenchCount = bench.filter(Boolean).length;

  return (
    <div className="bw-squad-detail" style={kitTheme}>
      <div className="bw-squad-header">
        <div className="bw-squad-header-team">
          <button className="bw-squad-back" onClick={onBack} title="Back">←</button>
          <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} uid={`sqd${managerIdx}`} size={13} />
          {editingName ? (
            <input
              className="bw-squad-name-input"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={() => { setTeamName(managerIdx, nameInput); setEditingName(false); }}
              onKeyDown={e => { if (e.key === "Enter") { setTeamName(managerIdx, nameInput); setEditingName(false); } }}
              autoFocus
              maxLength={24}
            />
          ) : (
            <span className="bw-squad-team-name" onClick={() => setEditingName(true)} title="Click to rename">
              {manager.teamName || manager.name}
            </span>
          )}
        </div>
        <div className="bw-squad-header-right">
          <span className="bw-squad-value">{formatValue(totalSquadValue)}</span>
          <span className="bw-squad-ovr">{squadRating(manager.squad)}</span>
        </div>
      </div>

      <div className="bw-squad-actions">
        <button className="bw-squad-action-btn" onClick={exportSquad} disabled={exporting}>{exporting ? "…" : "EXPORT"}</button>
        {allManagers.length >= 2 && onSimulate && (
          <button className="bw-squad-action-btn primary" onClick={() => {
            const awayIdx = managers ? managers.findIndex((_, i) => i !== managerIdx) : (managerIdx + 1) % allManagers.length;
            onSimulate(managerIdx, awayIdx);
          }}>SIMULATE</button>
        )}
      </div>

      <div className="bw-squad-body">
        <div className="bw-squad-left">
          {fm && (
            <div className="bw-gaffer-block">
              <div className="bw-gaffer-top">
                <div className="bw-gaffer-name">{fm.name}</div>
                <button className="bw-gaffer-toggle" onClick={() => setMgrMinimized(m => !m)}>
                  {mgrMinimized ? "▼ THE GAFFER" : "THE GAFFER"}
                </button>
              </div>
              {!mgrMinimized && (
                <>
                  <div className="bw-gaffer-chips">
                    <span className="bw-gaffer-chip" style={{ background: ERA_BG[fm.era], color: ERA_COLORS[fm.era] }}>
                      {ERA_LABELS[fm.era]}
                    </span>
                    <span className="bw-gaffer-chip" style={{ background: TIER_BG[fm.tier], color: TIER_COLORS[fm.tier] }}>
                      {TIER_LABELS[fm.tier]}
                    </span>
                    <span className="bw-gaffer-chip">{fm.club}</span>
                  </div>
                  <div className="bw-gaffer-tagline">{fm.styleLabel}</div>
                  <div className="bw-gaffer-quote">
                    "{STYLE_TACTICAL_LINE[fm.style] ? `Your team ${STYLE_TACTICAL_LINE[fm.style]}` : fm.flavourText}"
                  </div>
                  {fm.preferredArchetypes?.length > 0 && (
                    <div className="bw-gaffer-traits">
                      {fm.preferredArchetypes.map(a => (
                        <span key={a} className="bw-gaffer-trait">{a}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
              {(() => {
                const pct = cohesionPct(manager.squad, fm);
                if (pct === null) return null;
                const color = pct >= 70 ? "#6bbb6b" : pct >= 40 ? "#f0c040" : "#ff6b6b";
                return (
                  <div className="bw-cohesion-row">
                    <span className="bw-cohesion-label">COHESION</span>
                    <div className="bw-cohesion-track">
                      <div className="bw-cohesion-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="bw-cohesion-pct" style={{ color }}>{pct}%</span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="bw-tactics-row">
            <div className="bw-tactics-toggle">
              {TACTICS.map(t => (
                <button
                  key={t}
                  className={`bw-tactics-seg ${(manager.tactics || "balanced") === t ? "active" : ""}`}
                  onClick={() => setTactics && setTactics(managerIdx, t)}
                >
                  {TACTICS_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="bw-tactics-actions">
              <button className="bw-tactics-ghost-btn" onClick={() => setShowPitch(p => !p)}>
                {showPitch ? "HIDE PITCH ▴" : "SHOW PITCH ▾"}
              </button>
              <select
                className="bw-formation-select"
                value={formation}
                onChange={e => setFormation && setFormation(managerIdx, e.target.value)}
              >
                {FORMATION_LIST.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {showPitch && (
            <div className="bw-pitch-wrap">
              <SquadPitch
                squad={starters}
                formation={formation}
                swapSlot={swapSlot}
                onSlotClick={handleSlotClick}
                kitPrimary={kitPrimary}
                kitSecondary={kitSecondary}
              />
            </div>
          )}

          {swapSlot !== null && (
            <div className="bw-swap-hint-bar">
              Select a player to swap with
              <button className="bw-swap-cancel" onClick={() => setSwapSlot(null)}>Cancel</button>
            </div>
          )}
        </div>

        <div className="bw-squad-right-col">
          <div className="bw-xi-section">
            <div className="bw-xi-header">
              <span className="bw-xi-label">STARTING XI</span>
              <div className="bw-xi-controls">
                <button className={`bw-xi-ctrl-chip${hideBadges ? " active" : ""}`} onClick={() => setHideBadges(h => !h)}>
                  {hideBadges ? "BADGES OFF" : "BADGES"}
                </button>
                <button className={`bw-xi-ctrl-chip${showValues ? " active" : ""}`} onClick={() => setShowValues(v => !v)}>
                  {showValues ? "VALUES ON" : "VALUES"}
                </button>
                <button
                  className={`bw-xi-ctrl-chip${selectingCaptain ? " active" : ""}`}
                  onClick={() => setSelectingCaptain(s => !s)}
                >
                  {selectingCaptain
                    ? "TAP A PLAYER…"
                    : captainId
                      ? `(C) ${starters.find(p => p?.id === captainId)?.name || "Captain"}`
                      : "SET CAPTAIN"}
                </button>
              </div>
            </div>
            <div className="bw-xi-list">
              {starters.map((p, i) => {
                if (!p) return null;
                const pos = FORMATIONS[formation][i]?.pos ?? POSITIONS[i].key;
                const lc = lineColors(pos);
                return (
                  <div
                    key={i}
                    className={`bw-xi-row ${swapSlot === i ? "swapping" : ""}${selectingCaptain ? " captain-selectable" : ""}`}
                    onClick={() => {
                      if (selectingCaptain) { setCaptain(p.id); setSelectingCaptain(false); }
                      else handleSlotClick(i);
                    }}
                  >
                    <span className="bw-xi-pos" style={{ color: lc.label }}>{pos}</span>
                    <div className="bw-xi-info">
                      <strong>{p.nation} {p.name}</strong>
                      {captainId === p.id && <span className="bw-xi-captain-tag">(C)</span>}
                      <span className="bw-xi-meta">· {p.club}</span>
                    </div>
                    <span className="bw-xi-form">{draft?.playerForm && draft.playerForm.has(p.id) ? getFormArrow(draft.playerForm.get(p.id)) : ""}</span>
                    {!hideBadges && p.archetype && (() => {
                      const arc = ARCHETYPE_COLOR[p.archetype] || { bg: "#222", fg: "#aaa" };
                      const preferred = fm?.preferredArchetypes?.includes(p.archetype);
                      return (
                        <span
                          className="bw-xi-archetype"
                          style={{ background: arc.bg, color: arc.fg, border: `1px solid ${preferred ? arc.fg : arc.fg + "44"}`, opacity: preferred ? 1 : 0.55 }}
                          title={preferred ? "Matches manager preference" : ""}
                        >
                          {p.archetype}
                        </span>
                      );
                    })()}
                    {showValues && <span className="bw-xi-value">{formatValue(p.value)}</span>}
                    {(() => {
                      const formBonus = draft?.playerForm?.get(p.id) ?? 0;
                      const effRating = formBonus !== 0 ? Math.max(0, p.rating + formBonus) : p.rating;
                      const bg = formBonus > 0 ? "#16a34a" : formBonus < 0 ? "#dc2626" : getRatingBg(p.rating);
                      const fg = formBonus !== 0 ? "#fff" : getRatingColor(p.rating);
                      return <span className="bw-xi-rating" style={{ background: bg, color: fg }}>{effRating}</span>;
                    })()}
                  </div>
                );
              })}
            </div>

            <button className="bw-bench-toggle" onClick={() => setShowBench(b => !b)}>
              {showBench ? "HIDE BENCH ▴" : `SHOW BENCH · ${filledBenchCount} MORE ▾`}
            </button>

            {showBench && (
              <div className="bw-bench-list">
                {bench.map((p, i) => (
                  <div
                    key={i}
                    className={`bw-bench-row ${swapSlot === i + 11 ? "swapping" : ""} ${!p ? "empty" : ""}`}
                    onClick={() => handleBenchClick(i)}
                  >
                    {p ? (
                      <>
                        <span className="bw-bench-pos">SUB</span>
                        <div className="bw-bench-info">
                          <strong>{p.nation} {p.name}</strong> <span className="bw-bench-meta">· {p.club}</span>
                        </div>
                        <span className="bw-xi-form">{draft?.playerForm && draft.playerForm.has(p.id) ? getFormArrow(draft.playerForm.get(p.id)) : ""}</span>
                        {!hideBadges && p.archetype && (() => {
                          const arc = ARCHETYPE_COLOR[p.archetype] || { bg: "#222", fg: "#aaa" };
                          const preferred = fm?.preferredArchetypes?.includes(p.archetype);
                          return (
                            <span className="bw-xi-archetype" style={{ background: arc.bg, color: arc.fg, border: `1px solid ${preferred ? arc.fg : arc.fg + "44"}`, opacity: preferred ? 1 : 0.55 }}>
                              {p.archetype}
                            </span>
                          );
                        })()}
                        {(() => {
                          const formBonus = draft?.playerForm?.get(p.id) ?? 0;
                          const effRating = formBonus !== 0 ? Math.max(0, p.rating + formBonus) : p.rating;
                          const bg = formBonus > 0 ? "#16a34a" : formBonus < 0 ? "#dc2626" : "var(--bw-rating-bg)";
                          const fg = formBonus !== 0 ? "#fff" : "var(--bw-rating-text)";
                          return <span className="bw-bench-rating" style={{ background: bg, color: fg }}>{effRating}</span>;
                        })()}
                        {showValues && <span className="bw-xi-value">{formatValue(p.value)}</span>}
                      </>
                    ) : (
                      <span className="bw-bench-empty">Sub {i + 1} — empty</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SquadScreen({ draft, setTeamName, swapSquadPlayers, setTactics, setFormation, setCaptain, restartGame, setScreen, onBackToSeries, onManagerDraft, onSaveSquad, saveState }) {
  const [viewIdx, setViewIdx] = useState(null);
  const [drawOpen, setDrawOpen] = useState(false);
  const { managers } = draft;

  // Captain is persisted on each manager (manager.captainId). When unset, fall
  // back to the highest-rated starter so a captain always shows, but persist the
  // default once so it survives across games/series without recomputing.
  function captainFor(m) {
    if (m.captainId != null) return m.captainId;
    const starters = m.squad.slice(0, 11).filter(Boolean);
    if (!starters.length) return null;
    return starters.reduce((a, b) => (b.rating > a.rating ? b : a)).id;
  }
  const captains = {};
  managers.forEach((m, i) => { captains[i] = captainFor(m); });
  const inSeries = !!draft.series;
  const seriesOver = inSeries && draft.series.champion !== null && draft.series.champion !== undefined;

  if (viewIdx !== null) {
    return (
      <SquadDetail
        draft={draft}
        manager={managers[viewIdx]}
        managerIdx={viewIdx}
        setTeamName={setTeamName}
        swapSquadPlayers={swapSquadPlayers}
        setTactics={setTactics}
        setFormation={setFormation}
        onBack={() => setViewIdx(null)}
        onSimulate={(inSeries || seriesOver) ? null : (hi, ai) => { setScreen("match", { homeIdx: hi, awayIdx: ai }); }}
        allManagers={managers}
        managers={managers}
        captainId={captains[viewIdx] ?? null}
        setCaptain={(pid) => setCaptain(viewIdx, pid)}
      />
    );
  }

  return (
    <div className="bw-draft-screen">
      <div className="bw-draft-topbar">
        {onBackToSeries && !seriesOver && (
          <button className="bw-back-link" onClick={onBackToSeries}>TO TOURNAMENT</button>
        )}
        {onManagerDraft && (
          <button className="bw-cta-arcade bw-draft-mgr-btn" onClick={onManagerDraft}>
            ⚙ START THE MERRY-GO-ROUND
          </button>
        )}
      </div>

      <div className="bw-draft-banner">
        <div className="bw-draft-trophy">🏆</div>
        <h2 className="bw-draft-title">DRAFT COMPLETE</h2>
        <p className="bw-draft-sub">Select a squad to adjust your starting XI and tactics</p>
        {/* Only offered when there's a log to show — drafts saved before the
            board existed have no pickLog and would open an empty grid. */}
        {(draft.pickLog || []).length > 0 && (
          <button className="bw-draft-draw-btn" onClick={() => setDrawOpen(true)}>
            ▤ VIEW THE FULL DRAW
          </button>
        )}
      </div>

      {drawOpen && (
        <DrawPanel draft={draft} open fullOnly onClose={() => setDrawOpen(false)} />
      )}

      <div className="bw-draft-cards">
        {managers.map((m, i) => {
          const ovr = squadRating(m.squad);
          const starters = m.squad.slice(0, 11).filter(Boolean);
          const captainId = captains[i] ?? null;
          const captain = captainId ? m.squad.find(p => p?.id === captainId) : null;
          const squadVal = m.squad.filter(Boolean).reduce((s, p) => s + (p.value || 0), 0);
          const accent = kitAccent(m.primaryColor, m.secondaryColor);
          return (
            <div key={i} className="bw-draft-card" onClick={() => setViewIdx(i)}
              style={{ borderColor: m.primaryColor }}>
              <div className="bw-draft-card-kit-header" style={{ background: m.primaryColor, borderBottom: `2px solid ${m.secondaryColor}` }}>
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`sc${i}`} size={28} />
                <span className="bw-draft-card-club" style={{ color: accent === m.primaryColor ? m.secondaryColor : accent }}>
                  {m.teamName || m.clubName || m.name}
                </span>
              </div>
              <div className="bw-draft-card-body">
                <div className="bw-draft-card-info">
                  {m.footballManager && (
                    <div className="bw-draft-card-mgr">⚙ {m.footballManager.name}</div>
                  )}
                  {captain
                    ? <div className="bw-draft-card-captain">© {captain.nation} {captain.name}</div>
                    : <div className="bw-draft-card-captain bw-draft-card-captain--unset">© Captain not set</div>
                  }
                  <div className="bw-draft-card-value">Value: {formatValue(squadVal)}</div>
                </div>
                <div className="bw-draft-card-ovr-box">
                  <span className="bw-draft-card-ovr">{ovr}</span>
                  <span className="bw-draft-card-ovr-label">OVR</span>
                  <div className="bw-draft-link">VIEW →</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!inSeries && managers.length >= 2 && (
        <div className="bw-draft-match-section">
          <div className="bw-draft-section-title">SIMULATE MATCH</div>
          <div className="bw-draft-matchup-grid">
            {managers.flatMap((home, hi) =>
              managers
                .map((away, ai) => ({ away, ai }))
                .filter(({ ai }) => ai > hi)
                .map(({ away, ai }) => (
                  <button
                    key={`${hi}-${ai}`}
                    className="bw-draft-matchup-btn"
                    onClick={() => setScreen("match", { homeIdx: hi, awayIdx: ai })}
                  >
                    {home.teamName || home.name} vs {away.teamName || away.name}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      <div className="bw-draft-footer">
        {onBackToSeries && !seriesOver && (
          <button className="bw-cta-secondary" onClick={onBackToSeries}>TO TOURNAMENT</button>
        )}
        {(!onBackToSeries || seriesOver) && (
          <button className="bw-cta-secondary" onClick={restartGame}>NEW GAME</button>
        )}
        {onSaveSquad && (
          <button
            className="bw-cta-secondary"
            onClick={onSaveSquad}
            disabled={saveState?.saving || saveState?.saved}
            style={{ marginTop: "8px" }}
          >
            {saveState?.saved ? "✓ SQUAD SAVED" : saveState?.saving ? "SAVING…" : "💾 SAVE MY SQUAD"}
          </button>
        )}
        {saveState?.error && <p className="mysquads-save-error">{saveState.error}</p>}
      </div>
    </div>
  );
}

export { squadRating };

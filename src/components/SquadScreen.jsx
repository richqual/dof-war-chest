import { useState } from "react";
import { POSITIONS, getRatingBg, getRatingColor, formatValue, ERA_LABELS, ERA_COLORS, ERA_BG } from "../data/players";
import { FORMATIONS, FORMATION_LIST } from "../data/formations";
import { TIER_LABELS, TIER_COLORS, TIER_BG } from "../data/managers";
import { ARCHETYPE_COLOR } from "./PlayerCard";
import { getFormArrow } from "../hooks/useDraftState";
import KitSwatch, { kitAccent } from "./KitSwatch";


const TACTICS = ["defensive", "balanced", "attacking"];

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

function FormationDiagram({ squad, formation, swapSlot, onSlotClick }) {
  const coords = FORMATIONS[formation];
  return (
    <div className="formation-pitch">
      <svg viewBox="0 0 100 100" className="pitch-svg">
        {/* Pitch markings */}
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="#ffffff22" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="#ffffff22" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="12" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="28" y="5" width="44" height="18" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="28" y="77" width="44" height="18" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="38" y="5" width="24" height="8" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
        <rect x="38" y="87" width="24" height="8" fill="none" stroke="#ffffff22" strokeWidth="0.4" />
      </svg>
      <div className="pitch-players">
        {coords.map((coord, i) => {
          const player = squad[i];
          const isSwapping = swapSlot === i;
          return (
            <div
              key={i}
              className={`pitch-dot ${isSwapping ? "swapping" : ""} ${!player ? "empty" : ""}`}
              style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              onClick={() => onSlotClick(i)}
              title={player ? `${player.name} (${player.rating})` : coord.pos}
            >
              <div className="pitch-dot-inner">
                {player ? (
                  <>
                    <div className="dot-rating" style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating) }}>
                      {player.pos}
                    </div>
                    <div className="dot-name">{player.name.split(" ").pop()}</div>
                  </>
                ) : (
                  <div className="dot-empty">{coord.pos}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  ctx.fillText("THE FOOTBALL DIRECTOR  ·  transfer-game.vercel.app", W / 2, y + 8);

  // Bottom bar
  ctx.fillStyle = topGrad; ctx.fillRect(0, H - BAR, W, BAR);
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, primary); botGrad.addColorStop(1, secondary);
  ctx.fillStyle = botGrad; ctx.fillRect(0, H - BAR, W, BAR);

  return canvas;
}

function SquadDetail({ draft, manager, managerIdx, setTeamName, swapSquadPlayers, setTactics, onBack, onSimulate, allManagers, managers, captainId, setCaptain }) {
  const [formation, setFormation] = useState(manager.formation || "4-3-3");
  const [swapSlot, setSwapSlot] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(manager.teamName || "");
  const [hideBadges, setHideBadges] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [mgrMinimized, setMgrMinimized] = useState(false);
  const [showPitch, setShowPitch] = useState(true);
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

  return (
    <div className="squad-detail">
      <div className="squad-detail-header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <div className="squad-title-area">
          {editingName ? (
            <input
              className="team-name-input"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={() => { setTeamName(managerIdx, nameInput); setEditingName(false); }}
              onKeyDown={e => { if (e.key === "Enter") { setTeamName(managerIdx, nameInput); setEditingName(false); } }}
              autoFocus
              maxLength={24}
            />
          ) : (
            <span className="squad-team-name" onClick={() => setEditingName(true)}>
              {manager.teamName || manager.name} <span className="edit-hint">✎</span>
            </span>
          )}
          <span className="ovr-badge">OVR {squadRating(manager.squad)}</span>
          <span className="ovr-badge value-badge">{formatValue(totalSquadValue)}</span>
        </div>
        <div className="squad-actions">
          <button className="sort-btn" onClick={exportSquad} disabled={exporting}>{exporting ? "…" : "EXPORT"}</button>
          {allManagers.length >= 2 && onSimulate && (
            <button className="action-btn primary" onClick={() => {
              const awayIdx = managers ? managers.findIndex((_, i) => i !== managerIdx) : (managerIdx + 1) % allManagers.length;
              onSimulate(managerIdx, awayIdx);
            }}>SIMULATE</button>
          )}
        </div>
      </div>

      {fm && (
        <div className="mgr-squad-banner">
          <div className="mgr-squad-banner-top">
            <div className="mgr-squad-name">{fm.name}</div>
            <div style={{ flex: 1 }} />
            <span className="mgr-section-label">THE GAFFER</span>
            <button className="sort-btn" onClick={() => setMgrMinimized(m => !m)}>
              {mgrMinimized ? "▼ MORE" : "▲ LESS"}
            </button>
          </div>
          {!mgrMinimized && (
            <>
              <div className="mgr-squad-badges">
                <span
                  className="era-badge"
                  style={{ background: ERA_BG[fm.era], color: ERA_COLORS[fm.era], border: `1px solid ${ERA_COLORS[fm.era]}55` }}
                >
                  {ERA_LABELS[fm.era]}
                </span>
                <span
                  className="mgr-tier-badge"
                  style={{ background: TIER_BG[fm.tier], color: TIER_COLORS[fm.tier], border: `1px solid ${TIER_COLORS[fm.tier]}88` }}
                >
                  {TIER_LABELS[fm.tier]}
                </span>
              </div>
              <div className="mgr-squad-club">{fm.club} · {fm.years}</div>
              <div className="mgr-squad-style">{fm.styleLabel}</div>
              <div className="mgr-squad-tactical">
                Your team {STYLE_TACTICAL_LINE[fm.style] || fm.flavourText}
              </div>
              <div className="mgr-squad-flavour">"{fm.flavourText}"</div>
              {fm.preferredArchetypes?.length > 0 && (
                <div className="mgr-archetype-tip">
                  <span className="archetype-tip-label">FAVOURS</span>
                  {fm.preferredArchetypes.map(a => {
                    const arc = ARCHETYPE_COLOR[a] || { bg: "#222", fg: "#aaa" };
                    return (
                      <span key={a} className="archetype-badge" style={{ background: arc.bg, color: arc.fg, border: `1px solid ${arc.fg}44` }}>
                        {a}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {(() => {
            const pct = cohesionPct(manager.squad, fm);
            if (pct === null) return null;
            const color = pct >= 70 ? "#6bbb6b" : pct >= 40 ? "#f0c040" : "#ff6b6b";
            return (
              <div className="mgr-cohesion-bar">
                <span className="cohesion-label">SQUAD COHESION</span>
                <span className="cohesion-pct" style={{ color }}>{pct}%</span>
                <div className="cohesion-track">
                  <div className="cohesion-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <div className="squad-layout">
        {/* Top row: formation bar + optional pitch diagram */}
        <div className="squad-pitch-row">
          <div className="formation-bar">
            <button className="sort-btn" onClick={() => setShowPitch(p => !p)}>
              {showPitch ? "▲ HIDE PITCH" : "▼ SHOW PITCH"}
            </button>
            <select
              className="formation-select"
              value={formation}
              onChange={e => setFormation(e.target.value)}
            >
              {FORMATION_LIST.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {showPitch && (
            <FormationDiagram
              squad={starters}
              formation={formation}
              swapSlot={swapSlot}
              onSlotClick={handleSlotClick}
            />
          )}
        </div>

        {/* Full-width: tactics + XI list + bench */}
        <div className="squad-right">
          <div className="tactics-bar">
            <span className="tactics-label">TACTICS</span>
            {TACTICS.map(t => (
              <button
                key={t}
                data-t={t}
                className={`tactics-btn ${(manager.tactics || "balanced") === t ? "active" : ""}`}
                onClick={() => setTactics && setTactics(managerIdx, t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
            <span className="tactics-divider" />
            <button className={`sort-btn${hideBadges ? " active" : ""}`} onClick={() => setHideBadges(h => !h)}>
              {hideBadges ? "BADGES OFF" : "BADGES ON"}
            </button>
            <button className={`sort-btn${showValues ? " active" : ""}`} onClick={() => setShowValues(v => !v)}>
              {showValues ? "VALUES ON" : "VALUES OFF"}
            </button>
            <span className="tactics-divider" />
            <button
              className={`sort-btn${selectingCaptain ? " active" : ""}`}
              onClick={() => setSelectingCaptain(s => !s)}
            >
              {selectingCaptain
                ? "TAP A PLAYER..."
                : captainId
                  ? `(C) ${starters.find(p => p?.id === captainId)?.name || "Captain"}`
                  : "SET CAPTAIN"}
            </button>
          </div>

          {swapSlot !== null && (
            <div className="swap-hint-bar">
              Select a player to swap with · <button className="cancel-swap" onClick={() => setSwapSlot(null)}>Cancel</button>
            </div>
          )}

          <div className="starting-xi-section">
            <div className="section-title-row">
              <span className="section-title">STARTING XI</span>
            </div>
            <div className="starting-xi-list">
              {starters.map((p, i) => p ? (
                <div
                  key={i}
                  className={`xi-row ${swapSlot === i ? "swapping" : ""}${selectingCaptain ? " captain-selectable" : ""}`}
                  onClick={() => {
                    if (selectingCaptain) { setCaptain(p.id); setSelectingCaptain(false); }
                    else handleSlotClick(i);
                  }}
                >
                  <span className="xi-pos">{POSITIONS[i].key}</span>
                  <span className="xi-nation">{p.nation}</span>
                  <span className={`xi-name${captainId === p.id ? " xi-captain" : ""}`}>
                    {p.name}
                    {captainId === p.id && <span className="captain-badge">(C)</span>}
                  </span>
                  <span className="xi-form">{draft?.playerForm && draft.playerForm.has(p.id) ? getFormArrow(draft.playerForm.get(p.id)) : ""}</span>
                  <span className="xi-club">{p.club}</span>
                  {!hideBadges && p.archetype && (() => {
                    const arc = ARCHETYPE_COLOR[p.archetype] || { bg: "#222", fg: "#aaa" };
                    const preferred = fm?.preferredArchetypes?.includes(p.archetype);
                    return (
                      <span
                        className="xi-archetype"
                        style={{ background: arc.bg, color: arc.fg, border: `1px solid ${preferred ? arc.fg : arc.fg + "44"}`, opacity: preferred ? 1 : 0.55 }}
                        title={preferred ? "Matches manager preference" : ""}
                      >
                        {p.archetype}
                      </span>
                    );
                  })()}
                  {showValues && <span className="xi-value">{formatValue(p.value)}</span>}
                  <span className="xi-rating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</span>
                </div>
              ) : null)}
            </div>
          </div>

          <div className="bench-section">
            <div className="section-title">BENCH</div>
            <div className="bench-list">
              {bench.map((p, i) => (
                <div
                  key={i}
                  className={`bench-item ${swapSlot === i + 11 ? "swapping" : ""} ${!p ? "empty" : ""}`}
                  onClick={() => handleBenchClick(i)}
                >
                  {p ? (
                    <>
                      <span className="bench-pos">SUB</span>
                      <span className="bench-nation">{p.nation}</span>
                      <span className="bench-name">{p.name}</span>
                      <span className="bench-form">{draft?.playerForm && draft.playerForm.has(p.id) ? getFormArrow(draft.playerForm.get(p.id)) : ""}</span>
                      <span className="bench-club">{p.club}</span>
                      {!hideBadges && p.archetype && (() => {
                        const arc = ARCHETYPE_COLOR[p.archetype] || { bg: "#222", fg: "#aaa" };
                        const preferred = fm?.preferredArchetypes?.includes(p.archetype);
                        return (
                          <span className="xi-archetype" style={{ background: arc.bg, color: arc.fg, border: `1px solid ${preferred ? arc.fg : arc.fg + "44"}`, opacity: preferred ? 1 : 0.55 }}>
                            {p.archetype}
                          </span>
                        );
                      })()}
                      <span className="bench-rating" style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}>{p.rating}</span>
                      {showValues && <span className="bench-value">{formatValue(p.value)}</span>}
                    </>
                  ) : (
                    <span className="bench-empty">Sub {i + 1} — empty</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SquadScreen({ draft, setTeamName, swapSquadPlayers, setTactics, restartGame, setScreen, onBackToSeries, onManagerDraft }) {
  const [viewIdx, setViewIdx] = useState(null);
  const { managers } = draft;
  const [captains, setCaptains] = useState(() => {
    const init = {};
    draft.managers.forEach((m, i) => {
      const starters = m.squad.slice(0, 11).filter(Boolean);
      if (starters.length) {
        const best = starters.reduce((a, b) => (b.rating > a.rating ? b : a));
        init[i] = best.id;
      }
    });
    return init;
  });

  function setCaptain(managerIdx, playerId) {
    setCaptains(prev => ({ ...prev, [managerIdx]: playerId }));
  }
  const inSeries = !!draft.series;

  if (viewIdx !== null) {
    return (
      <SquadDetail
        draft={draft}
        manager={managers[viewIdx]}
        managerIdx={viewIdx}
        setTeamName={setTeamName}
        swapSquadPlayers={swapSquadPlayers}
        setTactics={setTactics}
        onBack={() => setViewIdx(null)}
        onSimulate={inSeries ? null : (hi, ai) => { setScreen("match", { homeIdx: hi, awayIdx: ai }); }}
        allManagers={managers}
        managers={managers}
        captainId={captains[viewIdx] ?? null}
        setCaptain={(pid) => setCaptain(viewIdx, pid)}
      />
    );
  }

  return (
    <div className="squads-screen">
      <div className="squads-header">
        {onBackToSeries && (
          <button className="back-btn" style={{ marginBottom: "0.5rem" }} onClick={onBackToSeries}>← TO TOURNAMENT</button>
        )}
        {onManagerDraft && (
          <button className="mgr-go-btn" style={{ marginBottom: "1rem" }} onClick={onManagerDraft}>
            ⚙ START THE MERRY-GO-ROUND
          </button>
        )}
        <div className="trophy-icon">🏆</div>
        <h2 className="squads-title">DRAFT COMPLETE</h2>
        <p className="squads-sub">Select a squad to adjust your starting XI and tactics</p>
      </div>

      <div className="squad-cards">
        {managers.map((m, i) => {
          const ovr = squadRating(m.squad);
          const starters = m.squad.slice(0, 11).filter(Boolean);
          const captainId = captains[i] ?? null;
          const captain = captainId ? m.squad.find(p => p?.id === captainId) : null;
          const squadVal = m.squad.filter(Boolean).reduce((s, p) => s + (p.value || 0), 0);
          const accent = kitAccent(m.primaryColor, m.secondaryColor);
          return (
            <div key={i} className="squad-summary-card" onClick={() => setViewIdx(i)}
              style={{ borderColor: m.primaryColor }}>
              <div className="squad-card-kit-header" style={{ background: m.primaryColor, borderBottom: `2px solid ${m.secondaryColor}` }}>
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`sc${i}`} size={28} />
                <span className="squad-card-club" style={{ color: accent === m.primaryColor ? m.secondaryColor : accent }}>
                  {m.teamName || m.clubName || m.name}
                </span>
              </div>
              <div className="squad-card-body">
                <div className="squad-card-info">
                  {m.footballManager && (
                    <div className="squad-card-mgr">⚙ {m.footballManager.name}</div>
                  )}
                  {captain
                    ? <div className="squad-card-captain">© {captain.nation} {captain.name}</div>
                    : <div className="squad-card-captain squad-best--unset">© Captain not set</div>
                  }
                  <div className="squad-card-value">Value: {formatValue(squadVal)}</div>
                </div>
                <div className="squad-card-ovr-box">
                  <span className="squad-card-ovr">{ovr}</span>
                  <span className="squad-card-ovr-label">OVR</span>
                  <div className="squad-link">VIEW →</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!inSeries && managers.length >= 2 && (
        <div className="match-section">
          <div className="section-title-white">SIMULATE MATCH</div>
          <div className="matchup-grid">
            {managers.flatMap((home, hi) =>
              managers
                .map((away, ai) => ({ away, ai }))
                .filter(({ ai }) => ai > hi)
                .map(({ away, ai }) => (
                  <button
                    key={`${hi}-${ai}`}
                    className="matchup-btn"
                    onClick={() => setScreen("match", { homeIdx: hi, awayIdx: ai })}
                  >
                    {home.teamName || home.name} vs {away.teamName || away.name}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      <div className="squads-footer">
        {onBackToSeries && (
          <button className="sim-btn secondary" onClick={onBackToSeries}>← TO TOURNAMENT</button>
        )}
        {!onBackToSeries && (
          <button className="restart-btn" onClick={restartGame}>NEW GAME</button>
        )}
      </div>
    </div>
  );
}

export { squadRating };

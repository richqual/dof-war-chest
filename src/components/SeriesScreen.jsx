import { useState } from "react";
import KitSwatch, { kitAccent } from "./KitSwatch";
import { POSITIONS, getRatingBg, getRatingColor, formatValue } from "../data/players";
import { squadRating } from "./SquadScreen";

function WinDots({ wins, target, accent }) {
  return (
    <div className="win-dots">
      {Array.from({ length: target }, (_, i) => (
        <span key={i} className={`win-dot ${i < wins ? "filled" : ""}`} style={i < wins ? { background: accent } : {}} />
      ))}
    </div>
  );
}

function ManagerStrip({ mgr, wins, target, isChampion }) {
  const accent = kitAccent(mgr.primaryColor, mgr.secondaryColor);
  return (
    <div className={`series-mgr-strip ${isChampion ? "champion" : ""}`} style={isChampion ? { "--champ-a": mgr.primaryColor, "--champ-b": mgr.secondaryColor } : {}}>
      <KitSwatch primary={mgr.primaryColor} secondary={mgr.secondaryColor} pattern={mgr.pattern} uid={`s${mgr.id}`} size={36} />
      <div className="series-mgr-info">
        <span className="series-mgr-name" style={{ color: accent }}>{mgr.teamName || mgr.clubName || mgr.name}</span>
        {isChampion && <span className="series-champ-tag">🏆 CHAMPION</span>}
      </div>
      <div className="series-mgr-right">
        <span className="series-win-count">{wins}</span>
        <WinDots wins={wins} target={target} accent={accent} />
      </div>
    </div>
  );
}

// Derives the next matchup to play from series state.
function getNextMatchup(series) {
  if (!series || series.stage === "champion") return null;

  if (series.format !== "tournament") {
    const played = series.played ?? (series.wins[0] + series.wins[1]);
    const [p0, p1] = series.participants;
    const isTiebreaker = series.stage === "tiebreaker";
    return {
      homeIdx: played % 2 === 0 ? p0 : p1,
      awayIdx: played % 2 === 0 ? p1 : p0,
      matchNum: played + 1,
      label: isTiebreaker
        ? series.format.toUpperCase().replace("BO", "BEST OF ") + " · TIEBREAKER"
        : series.format.toUpperCase().replace("BO", "BEST OF "),
      isSeriesTiebreaker: isTiebreaker,
    };
  }

  // Tournament semis — UCL format: all leg 1s first, then all leg 2s
  if (series.stage === "semis" && series.semis) {
    const totalLegsPlayed = series.semis.reduce((sum, sm) => sum + sm.legsPlayed, 0);
    const matchNum = totalLegsPlayed + 1;
    // First pass: leg 1s
    for (let si = 0; si < series.semis.length; si++) {
      const sm = series.semis[si];
      if (sm.winner === null && sm.legsPlayed === 0) {
        return { homeIdx: sm.p[0], awayIdx: sm.p[1], matchNum, label: `SEMI ${si + 1} · LEG 1`, semiIdx: si };
      }
    }
    // Second pass: leg 2s
    for (let si = 0; si < series.semis.length; si++) {
      const sm = series.semis[si];
      if (sm.winner === null && sm.legsPlayed === 1) {
        return { homeIdx: sm.p[1], awayIdx: sm.p[0], matchNum, label: `SEMI ${si + 1} · LEG 2`, semiIdx: si };
      }
    }
  }

  // Tournament final
  if ((series.stage === "final" || series.stage === "semis") && series.final) {
    const f = series.final;
    const totalLegsPlayed = (series.semis || []).reduce((sum, sm) => sum + sm.legsPlayed, 0);
    const finalPlayed = f.wins[0] + f.wins[1];
    return {
      homeIdx: finalPlayed % 2 === 0 ? f.p[0] : f.p[1],
      awayIdx: finalPlayed % 2 === 0 ? f.p[1] : f.p[0],
      matchNum: totalLegsPlayed + finalPlayed + 1,
      label: "GRAND FINAL",
    };
  }

  return null;
}

export function getSeriesContext(series, managers) {
  const next = getNextMatchup(series);
  if (!next) return null;
  const hm = managers[next.homeIdx];
  const am = managers[next.awayIdx];
  const homeName = hm.teamName || hm.clubName || hm.name;
  const awayName = am.teamName || am.clubName || am.name;

  let standing = "";
  if (series.format !== "tournament") {
    const [w0, w1] = series.wins;
    const [p0, p1] = series.participants;
    const hWins = next.homeIdx === p0 ? w0 : w1;
    const aWins = next.homeIdx === p0 ? w1 : w0;
    const draws = series.draws ?? 0;
    const drawSuffix = draws > 0 ? ` · ${draws}D` : "";
    if (next.isSeriesTiebreaker) standing = `Level ${hWins}–${aWins}${drawSuffix} · TIEBREAKER`;
    else if (hWins === aWins) standing = `All square · ${hWins}–${aWins}${drawSuffix}`;
    else if (hWins > aWins) standing = `${homeName} lead ${hWins}–${aWins}${drawSuffix}`;
    else standing = `${awayName} lead ${aWins}–${hWins}${drawSuffix}`;
  } else {
    // Show aggregate standing for semi-final legs
    const sm = next.semiIdx != null ? series.semis[next.semiIdx] : null;
    if (sm && sm.legsPlayed > 0) {
      const m0 = managers[sm.p[0]], m1 = managers[sm.p[1]];
      const n0 = m0.teamName || m0.name, n1 = m1.teamName || m1.name;
      if (sm.goals[0] > sm.goals[1])
        standing = `${n0} lead ${sm.goals[0]}–${sm.goals[1]} on agg`;
      else if (sm.goals[1] > sm.goals[0])
        standing = `${n1} lead ${sm.goals[1]}–${sm.goals[0]} on agg`;
      else
        standing = `Level ${sm.goals[0]}–${sm.goals[1]} on aggregate`;
    }
    // Leg 1: no standing to show yet — leave it empty
  }

  // For leg 2 only, pass the leg 1 aggregate so generateEvents can trigger ET on agg level.
  // homeIdx for leg 2 = sm.p[1], so homeAgg = sm.goals[1], awayAgg = sm.goals[0].
  // For leg 1: legContext stays null AND we pass isLeg1=true so ET is never triggered.
  let legContext = null;
  let isLeg1 = false;
  if (next.semiIdx != null && series.semis) {
    const sm = series.semis[next.semiIdx];
    if (sm && sm.legsPlayed === 1) {
      legContext = { homeAgg: sm.goals[1], awayAgg: sm.goals[0] };
    } else if (sm && sm.legsPlayed === 0) {
      isLeg1 = true;
    }
  }

  const isGrandFinal = next.label === "GRAND FINAL";

  // Momentum context: who won the previous match?
  // For 2-legged ties only — leg 2 knows who won leg 1.
  // In leg 2: homeIdx = sm.p[1], awayIdx = sm.p[0]
  let homePrevResult = null, awayPrevResult = null;
  if (next.semiIdx != null && series.semis) {
    const sm = series.semis[next.semiIdx];
    if (sm && sm.legsPlayed === 1) {
      if (sm.goals[0] > sm.goals[1]) {
        // p[0] won leg 1 → p[0] is away team in leg 2
        awayPrevResult = "win"; homePrevResult = "loss";
      } else if (sm.goals[1] > sm.goals[0]) {
        // p[1] won leg 1 → p[1] is home team in leg 2
        homePrevResult = "win"; awayPrevResult = "loss";
      }
      // Tied on agg going into leg 2 → no momentum
    }
  }

  return { label: `MATCH ${next.matchNum} · ${next.label}`, standing, homeIdx: next.homeIdx, awayIdx: next.awayIdx, legContext, isLeg1, isGrandFinal, homePrevResult, awayPrevResult, isSeriesTiebreaker: next.isSeriesTiebreaker ?? false };
}

// Two-player series standings panel
function TwoPlayerStandings({ series, managers }) {
  const [p0, p1] = series.participants;
  const m0 = managers[p0], m1 = managers[p1];
  return (
    <div className="series-standings">
      <ManagerStrip mgr={m0} wins={series.wins[0]} target={series.target} isChampion={series.champion === p0} />
      <div className="series-vs-divider">
        {series.wins[0]}–{series.wins[1]}
        {(series.draws ?? 0) > 0 && <span className="series-draws-label">{series.draws}D</span>}
      </div>
      <ManagerStrip mgr={m1} wins={series.wins[1]} target={series.target} isChampion={series.champion === p1} />
    </div>
  );
}

// Tournament bracket panel
function TournamentBracket({ series, managers }) {
  return (
    <div className="tournament-bracket">
      {(series.semis || []).map((sm, i) => {
        const m0 = managers[sm.p[0]], m1 = managers[sm.p[1]];
        const accent0 = kitAccent(m0.primaryColor, m0.secondaryColor);
        const accent1 = kitAccent(m1.primaryColor, m1.secondaryColor);
        return (
          <div key={i} className="bracket-semi">
            <div className="bracket-semi-label">SEMI-FINAL {i + 1}</div>
            <div className={`bracket-team ${sm.winner === sm.p[0] ? "bracket-winner" : sm.winner !== null ? "bracket-out" : ""}`}>
              <KitSwatch primary={m0.primaryColor} secondary={m0.secondaryColor} pattern={m0.pattern} uid={`bs${i}a`} size={22} />
              <span style={{ color: accent0 }}>{m0.teamName || m0.clubName || m0.name}</span>
              <span className="bracket-wins">{sm.goals?.[0] ?? 0}</span>
            </div>
            <div className={`bracket-team ${sm.winner === sm.p[1] ? "bracket-winner" : sm.winner !== null ? "bracket-out" : ""}`}>
              <KitSwatch primary={m1.primaryColor} secondary={m1.secondaryColor} pattern={m1.pattern} uid={`bs${i}b`} size={22} />
              <span style={{ color: accent1 }}>{m1.teamName || m1.clubName || m1.name}</span>
              <span className="bracket-wins">{sm.goals?.[1] ?? 0}</span>
            </div>
            {sm.legsPlayed === 1 && sm.winner === null && (
              <div className="bracket-adv">Agg: {sm.goals[0]}–{sm.goals[1]} · Leg 2 to come</div>
            )}
            {sm.winner !== null && (
              <div className="bracket-adv">
                → {managers[sm.winner].teamName || managers[sm.winner].name} advance
                {sm.wonOnPens ? " (pens)" : ""}
              </div>
            )}
          </div>
        );
      })}

      {series.final && (
        <div className="bracket-final">
          <div className="bracket-final-label">⭐ GRAND FINAL</div>
          {series.final.p.map((pi, i) => {
            const m = managers[pi];
            const accent = kitAccent(m.primaryColor, m.secondaryColor);
            return (
              <div key={i} className={`bracket-team ${series.final.winner === pi ? "bracket-winner" : series.final.winner !== null ? "bracket-out" : ""}`}>
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`bf${i}`} size={22} />
                <span style={{ color: accent }}>{m.teamName || m.clubName || m.name}</span>
                <span className="bracket-wins">{series.final.wins[i]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function drawSquadCard(manager) {
  await document.fonts.ready;

  const starters = manager.squad.slice(0, 11).filter(Boolean);
  const bench = manager.squad.slice(11, 16).filter(Boolean);
  const ovr = squadRating(manager.squad);
  const squadVal = formatValue(manager.squad.filter(Boolean).reduce((s, p) => s + (p.value || 0), 0));
  const teamName = manager.teamName || manager.clubName || manager.name || "Champions";
  const dofName = manager.dofName || manager.name || "";

  const W = 420;
  const DPR = 2;
  const PAD = 22;
  const ROW_H = 26;
  const BAR = 8;

  // Calculate total height
  const headerH = 190; // bar + trophy + CHAMPION + name + dof + ovr/value + divider
  const squadH = (starters.length + bench.length) * ROW_H + 60; // section labels + rows
  const footerH = 48;
  const H = BAR + headerH + squadH + footerH + BAR;

  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  const primary = manager.primaryColor || "#c8a800";
  const secondary = manager.secondaryColor || primary;
  const amber = "#c8a800";
  const bg = "#0a150a";
  const bg2 = "#111d11";
  const text = "#d4e8d4";
  const text3 = "#5a7a5a";
  const border = "rgba(255,255,255,0.08)";

  // BG
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top kit-colour bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, primary);
  topGrad.addColorStop(1, secondary);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, BAR);

  // Subtle inner glow from top bar
  const glowGrad = ctx.createLinearGradient(0, BAR, 0, BAR + 60);
  glowGrad.addColorStop(0, primary + "28");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, BAR, W, 60);

  let y = BAR + 18;

  // Trophy
  ctx.font = `40px serif`;
  ctx.textAlign = "center";
  ctx.fillText("🏆", W / 2, y + 36);
  y += 48;

  // CHAMPION title
  ctx.font = `bold 28px 'VT323', monospace`;
  ctx.fillStyle = amber;
  ctx.textAlign = "center";
  ctx.fillText("CHAMPIONS", W / 2, y + 24);
  y += 32;

  // Team name
  ctx.font = `bold 22px 'Share Tech Mono', monospace`;
  ctx.fillStyle = text;
  ctx.fillText(teamName, W / 2, y + 20);
  y += 28;

  // DoF row
  ctx.font = `14px 'VT323', monospace`;
  ctx.fillStyle = text3;
  ctx.textAlign = "left";
  ctx.fillText(`DoF: ${dofName}`, PAD, y + 14);
  y += 20;

  // OVR + value row
  ctx.font = `14px 'VT323', monospace`;
  ctx.fillStyle = amber;
  ctx.textAlign = "left";
  ctx.fillText(`Value: ${squadVal}`, PAD, y + 14);
  ctx.textAlign = "right";
  ctx.fillText(`OVR ${ovr}`, W - PAD, y + 14);
  y += 22;

  // Divider
  y += 8;
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 12;

  function drawSection(label, players, posLabel) {
    ctx.font = `12px 'VT323', monospace`;
    ctx.fillStyle = text3;
    ctx.textAlign = "left";
    ctx.fillText(label, PAD, y + 10);
    y += 16;

    players.forEach(p => {
      const pos = posLabel || p.pos || "";
      // Row bg (subtle alternating not needed — just draw)
      ctx.font = `16px 'Share Tech Mono', monospace`;
      ctx.fillStyle = text3;
      ctx.textAlign = "left";
      ctx.fillText(pos.padEnd(3), PAD, y + 14);

      ctx.fillStyle = text;
      ctx.fillText(p.name, PAD + 44, y + 14);

      // Rating badge
      const ratingBg = p.rating >= 90 ? "#7c3aed" : p.rating >= 85 ? "#1d6b3e" : p.rating >= 80 ? "#1e40af" : "#374151";
      const ratingColor = "#ffffff";
      const ratingStr = String(p.rating);
      const badgeW = 30;
      const badgeX = W - PAD - badgeW;
      ctx.fillStyle = ratingBg;
      roundRect(ctx, badgeX, y + 2, badgeW, 18, 3);
      ctx.fill();
      ctx.font = `bold 14px 'VT323', monospace`;
      ctx.fillStyle = ratingColor;
      ctx.textAlign = "center";
      ctx.fillText(ratingStr, badgeX + badgeW / 2, y + 15);

      y += ROW_H;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawSection("STARTING XI", starters);

  y += 4;
  ctx.strokeStyle = border;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 10;

  drawSection("BENCH", bench, "SUB");

  // Footer branding
  y += 12;
  ctx.strokeStyle = border;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 14;
  ctx.font = `13px 'VT323', monospace`;
  ctx.fillStyle = text3;
  ctx.textAlign = "center";
  ctx.fillText("THE FOOTBALL DIRECTOR  ·  transfer-game.vercel.app", W / 2, y + 10);

  // Bottom bar
  ctx.fillStyle = primary;
  ctx.fillRect(0, H - BAR, W, BAR);
  const bottomGrad = ctx.createLinearGradient(0, 0, W, 0);
  bottomGrad.addColorStop(0, primary);
  bottomGrad.addColorStop(1, secondary);
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, H - BAR, W, BAR);

  return canvas;
}

function ChampionSquad({ manager }) {
  const [collapsed, setCollapsed] = useState(true);
  const [exporting, setExporting] = useState(false);
  const starters = manager.squad.slice(0, 11);
  const bench = manager.squad.slice(11, 16);

  async function exportSquad() {
    setExporting(true);
    try {
      const canvas = await drawSquadCard(manager);
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const file = new File([blob], "squad.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Champion Squad" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(manager.teamName || "squad").replace(/\s+/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  const ovr = squadRating(manager.squad);

  return (
    <div className="champ-squad">
      <div className="champ-squad-header" onClick={() => setCollapsed(c => !c)}>
        <span className="champ-squad-ovr">OVR {ovr}</span>
        <span className="champ-squad-toggle-label">SQUAD</span>
        <span className="champ-squad-toggle">{collapsed ? "▲" : "▼"}</span>
        <button className="action-btn" disabled={exporting} onClick={e => { e.stopPropagation(); exportSquad(); }}>{exporting ? "…" : "SHARE"}</button>
      </div>

      {!collapsed && <>
        <div className="champ-squad-section-label">STARTING XI</div>
        <div className="champ-squad-list">
          {starters.map((p, i) => p ? (
            <div key={i} className="champ-squad-row">
              <span className="champ-squad-pos">{POSITIONS[i].key}</span>
              <span className="champ-squad-name">{p.name}</span>
              <span className="champ-squad-club">{p.club}</span>
              <span
                className="champ-squad-rating"
                style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
              >{p.rating}</span>
            </div>
          ) : null)}
        </div>

        <div className="champ-squad-section-label">BENCH</div>
        <div className="champ-squad-list">
          {bench.map((p, i) => p ? (
            <div key={i} className="champ-squad-row">
              <span className="champ-squad-pos">SUB</span>
              <span className="champ-squad-name">{p.name}</span>
              <span className="champ-squad-club">{p.club}</span>
              <span
                className="champ-squad-rating"
                style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
              >{p.rating}</span>
            </div>
          ) : null)}
        </div>
      </>}
    </div>
  );
}

function TournamentStats({ tournamentStats, managers }) {
  const [open, setOpen] = useState(false);
  if (!tournamentStats || Object.keys(tournamentStats).length === 0) return null;

  const allStats = Object.entries(tournamentStats);
  const topScorers = allStats.filter(([, s]) => s.goals > 0)
    .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
    .slice(0, 5);
  const topAssisters = allStats.filter(([, s]) => s.assists > 0)
    .sort((a, b) => b[1].assists - a[1].assists || b[1].goals - a[1].goals)
    .slice(0, 5);

  function teamName(mgrIdx) {
    const m = managers[mgrIdx];
    return m ? (m.teamName || m.clubName || m.name) : "–";
  }

  return (
    <div className="mid-tourn-stats">
      <button className="mid-tourn-toggle" onClick={() => setOpen(o => !o)}>
        📊 TOURNAMENT STATS {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="tourn-tables">
          {topScorers.length > 0 && (
            <div className="tourn-table">
              <div className="tourn-table-title">TOP SCORERS</div>
              {topScorers.map(([name, s]) => (
                <div className="tourn-table-row" key={name}>
                  <span className="tourn-row-name">{name}</span>
                  <span className="tourn-row-team">{teamName(s.managerIdx)}</span>
                  <span className="tourn-row-val">⚽ {s.goals}</span>
                </div>
              ))}
            </div>
          )}
          {topAssisters.length > 0 && (
            <div className="tourn-table">
              <div className="tourn-table-title">TOP ASSISTS</div>
              {topAssisters.map(([name, s]) => (
                <div className="tourn-table-row" key={name}>
                  <span className="tourn-row-name">{name}</span>
                  <span className="tourn-row-team">{teamName(s.managerIdx)}</span>
                  <span className="tourn-row-val">🅰️ {s.assists}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TournamentResults({ tournamentStats, managers }) {
  if (!tournamentStats || Object.keys(tournamentStats).length === 0) return null;

  const allStats = Object.entries(tournamentStats);

  const topScorers = allStats
    .filter(([, s]) => s.goals > 0)
    .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
    .slice(0, 5);

  const topAssisters = allStats
    .filter(([, s]) => s.assists > 0)
    .sort((a, b) => b[1].assists - a[1].assists || b[1].goals - a[1].goals)
    .slice(0, 5);

  const pott = allStats
    .filter(([, s]) => s.ratings.length > 0)
    .map(([name, s]) => {
      const avgRating = s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length;
      return { name, ...s, avgRating, score: s.goals * 3 + s.assists * 2 + avgRating };
    })
    .sort((a, b) => b.score - a.score)[0];

  function teamName(mgrIdx) {
    const m = managers[mgrIdx];
    return m ? (m.teamName || m.clubName || m.name) : "–";
  }

  return (
    <div className="tourn-results">
      {pott && (
        <div className="tourn-pott">
          <div className="tourn-pott-label">⭐ PLAYER OF THE TOURNAMENT</div>
          <div className="tourn-pott-name">{pott.name}</div>
          <div className="tourn-pott-team">{teamName(pott.managerIdx)}</div>
          <div className="tourn-pott-stats">
            <span>⚽ {pott.goals}</span>
            <span>🅰️ {pott.assists}</span>
            <span>★ {pott.avgRating.toFixed(2)} avg</span>
          </div>
        </div>
      )}

      <div className="tourn-tables">
        {topScorers.length > 0 && (
          <div className="tourn-table">
            <div className="tourn-table-title">TOP SCORERS</div>
            {topScorers.map(([name, s]) => (
              <div className="tourn-table-row" key={name}>
                <span className="tourn-row-name">{name}</span>
                <span className="tourn-row-team">{teamName(s.managerIdx)}</span>
                <span className="tourn-row-val">⚽ {s.goals}</span>
              </div>
            ))}
          </div>
        )}
        {topAssisters.length > 0 && (
          <div className="tourn-table">
            <div className="tourn-table-title">TOP ASSISTS</div>
            {topAssisters.map(([name, s]) => (
              <div className="tourn-table-row" key={name}>
                <span className="tourn-row-name">{name}</span>
                <span className="tourn-row-team">{teamName(s.managerIdx)}</span>
                <span className="tourn-row-val">🅰️ {s.assists}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeriesScreen({ draft, setScreen, recordMatchResult, restartGame }) {
  const { managers, series } = draft;
  if (!series) return null;

  const nextMatchup = getNextMatchup(series);
  const isChampion = series.stage === "champion";
  const champion = series.champion !== null ? managers[series.champion] : null;
  const championAccent = champion ? kitAccent(champion.primaryColor, champion.secondaryColor) : null;

  function playNextMatch() {
    if (!nextMatchup) return;
    setScreen("match", { homeIdx: nextMatchup.homeIdx, awayIdx: nextMatchup.awayIdx });
  }

  const formatLabel = series.format === "tournament"
    ? "TOURNAMENT"
    : series.format.toUpperCase().replace("BO", "BEST OF ") + " SERIES";

  return (
    <div className="series-screen">
      {isChampion && champion ? (
        <div className="champion-screen" style={{ "--champ-a": champion.primaryColor, "--champ-b": champion.secondaryColor }}>
          <div className="champion-flash-bg" />
          <div className="champion-content">

            {/* Fanfare header */}
            <div className="champion-trophy">🏆</div>
            <div className="champion-title">CHAMPION!</div>
            <div className="champion-name" style={{ color: championAccent }}>
              {champion.teamName || champion.clubName || champion.name}
            </div>
            <div className="champion-dof">
              Director of Football: {champion.dofName || champion.name}
            </div>
            <div className="champion-sub">
              {series.format === "tournament"
                ? "Wins the tournament!"
                : (() => {
                    const [p0, p1] = series.participants;
                    const [w0, w1] = series.wins;
                    const ci = series.champion === p0 ? 0 : 1;
                    return `Wins the series ${[w0, w1][ci]}–${[w0, w1][1 - ci]}`;
                  })()
              }
            </div>

            {/* Kit strip */}
            <div className="champion-kit">
              <KitSwatch
                primary={champion.primaryColor}
                secondary={champion.secondaryColor}
                pattern={champion.pattern}
                uid="champ"
                size={56}
              />
            </div>

            {/* Full squad */}
            <ChampionSquad manager={champion} />

            {/* Tournament stats */}
            <TournamentResults tournamentStats={draft.tournamentStats} managers={managers} />

            {/* Actions */}
            <div className="champion-actions">
              <button className="sim-btn secondary" onClick={() => setScreen("squads")}>VIEW ALL SQUADS</button>
              <button className="sim-btn secondary" onClick={restartGame}>NEW GAME</button>
            </div>

          </div>
        </div>
      ) : (
        <>
          <div className="series-header">
            <div className="setup-badge">{formatLabel}</div>
            {nextMatchup && (
              <div className="series-next-label">
                {series.format === "tournament"
                  ? nextMatchup.label
                  : nextMatchup.isSeriesTiebreaker
                    ? `MATCH ${nextMatchup.matchNum} · TIEBREAKER`
                    : `MATCH ${nextMatchup.matchNum}`}
              </div>
            )}
          </div>

          {series.format !== "tournament"
            ? <TwoPlayerStandings series={series} managers={managers} />
            : <TournamentBracket series={series} managers={managers} />
          }

          {series.format === "tournament" && (
            <TournamentStats tournamentStats={draft.tournamentStats} managers={managers} />
          )}

          {nextMatchup && (
            <div className="series-actions">
              <button className="sim-btn" onClick={playNextMatch}>
                ▶ PLAY{nextMatchup.matchNum > 1 ? ` MATCH ${nextMatchup.matchNum}` : " FIRST MATCH"}
              </button>
              <button className="sim-btn secondary" onClick={() => setScreen("squads")}>TEAM MANAGEMENT</button>
            </div>
          )}

          <div className="series-footer" />
        </>
      )}
    </div>
  );
}

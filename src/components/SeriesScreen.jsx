import { useState, useEffect } from "react";
import KitSwatch, { kitAccent } from "./KitSwatch";
import { POSITIONS, getRatingBg, getRatingColor, formatValue } from "../data/players";
import { squadRating } from "./SquadScreen";
import { generateEvents, buildEffectiveSquad } from "./MatchSim";

function teamName(m) {
  return m.teamName || m.clubName || m.name;
}

function BwPips({ wins, target }) {
  return (
    <div className="bw-pips">
      {Array.from({ length: target }, (_, i) => (
        <span key={i} className={`bw-pip ${i < wins ? "filled" : ""}`} />
      ))}
    </div>
  );
}

function BwTeamRow({ mgr, wins, target, lead }) {
  return (
    <div className="bw-score-row" style={{ "--bw-row-tint": mgr.primaryColor }}>
      <KitSwatch primary={mgr.primaryColor} secondary={mgr.secondaryColor} pattern={mgr.pattern} uid={`s${mgr.id}`} size={20} />
      <span className="bw-score-name">{teamName(mgr)}</span>
      <BwPips wins={wins} target={target} />
      <span className={`bw-score-num ${lead ? "lead" : ""}`}>{wins}</span>
    </div>
  );
}

// Derives the next matchup to play from series state.
function getNextMatchup(series) {
  if (!series || series.stage === "champion") return null;

  if (series.format !== "tournament" && series.format !== "tournament8") {
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

  const sl = !!series.singleLeg;

  // 8-team tournament: quarter-finals
  if (series.stage === "quarters" && series.quarters) {
    const qLegsPlayed = series.quarters.reduce((sum, q) => sum + (q.legsPlayed || 0), 0);
    const matchNum = qLegsPlayed + 1;
    for (let qi = 0; qi < series.quarters.length; qi++) {
      const q = series.quarters[qi];
      if (q.winner === null && (q.legsPlayed || 0) === 0) {
        return { homeIdx: q.p[0], awayIdx: q.p[1], matchNum, label: sl ? `QF ${qi + 1}` : `QF ${qi + 1} · LEG 1`, quarterIdx: qi, qLeg: 1 };
      }
    }
    if (!sl) {
      for (let qi = 0; qi < series.quarters.length; qi++) {
        const q = series.quarters[qi];
        if (q.winner === null && (q.legsPlayed || 0) === 1) {
          return { homeIdx: q.p[1], awayIdx: q.p[0], matchNum, label: `QF ${qi + 1} · LEG 2`, quarterIdx: qi, qLeg: 2 };
        }
      }
    }
  }

  // Semi-finals — used by both 4-team and 8-team tournaments
  if (series.stage === "semis" && series.semis) {
    const qLegsTotal = series.quarters
      ? series.quarters.length * (sl ? 1 : 2)
      : 0;
    const sfLegsPlayed = series.semis.reduce((sum, sm) => sum + sm.legsPlayed, 0);
    const matchNum = qLegsTotal + sfLegsPlayed + 1;
    for (let si = 0; si < series.semis.length; si++) {
      const sm = series.semis[si];
      if (sm.winner === null && sm.legsPlayed === 0) {
        return { homeIdx: sm.p[0], awayIdx: sm.p[1], matchNum, label: sl ? `SEMI ${si + 1}` : `SEMI ${si + 1} · LEG 1`, semiIdx: si };
      }
    }
    if (!sl) {
      for (let si = 0; si < series.semis.length; si++) {
        const sm = series.semis[si];
        if (sm.winner === null && sm.legsPlayed === 1) {
          return { homeIdx: sm.p[1], awayIdx: sm.p[0], matchNum, label: `SEMI ${si + 1} · LEG 2`, semiIdx: si };
        }
      }
    }
  }

  // Grand Final
  if ((series.stage === "final" || series.stage === "semis") && series.final) {
    const f = series.final;
    const legsPerRound = sl ? 1 : 2;
    const qLegsTotal = series.quarters ? series.quarters.length * legsPerRound : 0;
    const sfLegsTotal = (series.semis || []).reduce((sum, sm) => sum + sm.legsPlayed, 0);
    const finalPlayed = f.wins[0] + f.wins[1];
    return {
      homeIdx: finalPlayed % 2 === 0 ? f.p[0] : f.p[1],
      awayIdx: finalPlayed % 2 === 0 ? f.p[1] : f.p[0],
      matchNum: qLegsTotal + sfLegsTotal + finalPlayed + 1,
      label: "GRAND FINAL",
    };
  }

  return null;
}

export function getSeriesContext(series, managers, warChest = false) {
  const next = getNextMatchup(series);
  if (!next) return null;
  const hm = managers[next.homeIdx];
  const am = managers[next.awayIdx];
  const homeName = hm.teamName || hm.clubName || hm.name;
  const awayName = am.teamName || am.clubName || am.name;

  let standing = "";
  if (series.format !== "tournament" && series.format !== "tournament8") {
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
    // Show aggregate standing for QF/SF leg 2
    const q = next.quarterIdx != null ? series.quarters?.[next.quarterIdx] : null;
    const sm = next.semiIdx != null ? series.semis?.[next.semiIdx] : null;
    const aggSlot = q || sm;
    if (aggSlot && aggSlot.legsPlayed > 0) {
      const m0 = managers[aggSlot.p[0]], m1 = managers[aggSlot.p[1]];
      const n0 = m0.teamName || m0.name, n1 = m1.teamName || m1.name;
      if (aggSlot.goals[0] > aggSlot.goals[1])
        standing = `${n0} lead ${aggSlot.goals[0]}–${aggSlot.goals[1]} on agg`;
      else if (aggSlot.goals[1] > aggSlot.goals[0])
        standing = `${n1} lead ${aggSlot.goals[1]}–${aggSlot.goals[0]} on agg`;
      else
        standing = `Level ${aggSlot.goals[0]}–${aggSlot.goals[1]} on aggregate`;
    }
    // Leg 1 matches: no standing to show yet
  }

  // For SF/QF leg 2 only, pass aggregate so generateEvents can trigger ET on agg level.
  // Single-leg tournaments never have a leg 2, so skip all of this.
  let legContext = null;
  let isLeg1 = false;
  if (!series.singleLeg) {
    if (next.semiIdx != null && series.semis) {
      const sm = series.semis[next.semiIdx];
      if (sm && sm.legsPlayed === 1) {
        legContext = { homeAgg: sm.goals[1], awayAgg: sm.goals[0] };
      } else if (sm && sm.legsPlayed === 0) {
        isLeg1 = true;
      }
    }
    if (next.quarterIdx != null && series.quarters) {
      const q = series.quarters[next.quarterIdx];
      if (next.qLeg === 1) {
        isLeg1 = true;
      } else {
        legContext = { homeAgg: q.goals[1], awayAgg: q.goals[0] };
        isLeg1 = false;
      }
    }
  }

  const isGrandFinal = next.label === "GRAND FINAL";

  // Momentum context: leg 2 QFs and semi-finals
  let homePrevResult = null, awayPrevResult = null;
  const prevLegSlot = next.quarterIdx != null ? series.quarters?.[next.quarterIdx]
    : next.semiIdx != null ? series.semis?.[next.semiIdx]
    : null;
  if (prevLegSlot && prevLegSlot.legsPlayed === 1) {
    // In leg 2, home/away are swapped relative to p0/p1
    // p0 won leg 1 if goals[0] > goals[1], but they're now the AWAY team
    if (prevLegSlot.goals[0] > prevLegSlot.goals[1]) {
      awayPrevResult = "win"; homePrevResult = "loss";
    } else if (prevLegSlot.goals[1] > prevLegSlot.goals[0]) {
      homePrevResult = "win"; awayPrevResult = "loss";
    }
  }

  const isTournamentKnockout = series.format === "tournament" || series.format === "tournament8";
  return { label: `MATCH ${next.matchNum} · ${next.label}`, standing, homeIdx: next.homeIdx, awayIdx: next.awayIdx, legContext, isLeg1, isGrandFinal, homePrevResult, awayPrevResult, isSeriesTiebreaker: next.isSeriesTiebreaker ?? false, isTournamentKnockout, skipToShootout: !!warChest };
}

// Fixtures strip — one tile per possible leg (target*2-1), driven by series.history.
function BwFixtures({ series }) {
  const maxGames = series.target * 2 - 1;
  const nowIndex = series.champion === null ? series.history.length : -1;
  return (
    <div className="bw-fixtures">
      <div className="bw-fixtures-label">FIXTURES</div>
      <div className="bw-fixtures-row">
        {Array.from({ length: maxGames }, (_, i) => {
          const leg = series.history[i];
          const isNow = i === nowIndex;
          const cls = leg ? (leg.winnerPos === 0 ? "won" : leg.winnerPos === 1 ? "lost" : "drawn") : isNow ? "now" : "future";
          return (
            <div key={i} className={`bw-fixture-tile bw-fixture-${cls}`}>
              <div className="bw-fixture-num">M{i + 1}</div>
              {leg ? (
                <div className="bw-fixture-score">{leg.p0Goals}-{leg.p1Goals}</div>
              ) : isNow ? (
                <div className="bw-fixture-now-label">NOW</div>
              ) : (
                <div className="bw-fixture-score">–</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Series hub — the head-to-head best-of-N spine (mock ref: 2d).
function TwoPlayerSeriesHub({ draft, series, managers, nextMatchup, isHost, isCpuVsCpu, cpuSimActive, setCpuSimActive, playNextMatch, setScreen, seriesCtxForSim, handleSimDone }) {
  const [p0, p1] = series.participants;
  const m0 = managers[p0], m1 = managers[p1];
  const [w0, w1] = series.wins;

  let caption;
  if (w0 === w1) caption = <>All square · first to <strong>{series.target}</strong> lifts the cup</>;
  else caption = <>{teamName(w0 > w1 ? m0 : m1)} lead the series · first to <strong>{series.target}</strong> lifts the cup</>;

  const subtitle = nextMatchup
    ? `${series.format.toUpperCase().replace("BO", "Best of ")}${nextMatchup.isSeriesTiebreaker ? " · Tiebreaker" : ` · Match ${nextMatchup.matchNum}`}`
    : series.format.toUpperCase().replace("BO", "Best of ");

  return (
    <div className="bw-series-frame">
      <div className="bw-banner">
        <div className="bw-banner-title">GRAND FINAL</div>
        <div className="bw-banner-subtitle">{subtitle}</div>
      </div>

      <div className="bw-series-body">
        <div className="bw-scoreboard">
          <BwTeamRow mgr={m0} wins={w0} target={series.target} lead={w0 > w1} />
          <div className="bw-scoreboard-divider" />
          <BwTeamRow mgr={m1} wins={w1} target={series.target} lead={w1 > w0} />
        </div>
        <div className="bw-scoreboard-caption">
          {caption}
          {(series.draws ?? 0) > 0 && <span> · {series.draws}D</span>}
        </div>

        <BwFixtures series={series} />

        <TournamentStats tournamentStats={draft.tournamentStats} managers={managers} />

        {nextMatchup && (
          isHost ? (
            <div className="bw-series-actions">
              <button className="bw-cta-arcade" onClick={playNextMatch}>
                ▶ {nextMatchup.isSeriesTiebreaker ? "PLAY TIEBREAKER" : `PLAY MATCH ${nextMatchup.matchNum}`}
              </button>
              {isCpuVsCpu && (
                <button className="bw-cta-secondary" onClick={() => setCpuSimActive(true)}>
                  ⚡ AUTO-SIMULATE
                </button>
              )}
              <button className="bw-cta-secondary" onClick={() => setScreen("squads")}>TEAM MANAGEMENT</button>
            </div>
          ) : (
            <div className="mp-waiting-screen">
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">Waiting for the host to play the next match…</p>
            </div>
          )
        )}

        {cpuSimActive && nextMatchup && (
          <CpuSimOverlay
            draft={draft}
            homeIdx={nextMatchup.homeIdx}
            awayIdx={nextMatchup.awayIdx}
            seriesCtx={seriesCtxForSim}
            onDone={handleSimDone}
          />
        )}
      </div>
    </div>
  );
}

// Tournament bracket panel — handles 4-team (semis+final) and 8-team (quarters+semis+final)
function TournamentBracket({ series, managers }) {
  const quarters = series.quarters || [];
  const semis = series.semis || [];

  return (
    <div className="bw-bracket">
      {/* Grand Final — shown first and made prominent once the semis are through,
          so the upcoming (or just-played) decider doesn't get buried under
          rounds that have already been settled. */}
      {series.final && (
        <div className="bw-bracket-final">
          <div className="bw-bracket-final-label">⭐ GRAND FINAL</div>
          {series.final.p.map((pi, i) => {
            const m = managers[pi];
            return (
              <div key={i} className={`bw-bracket-row ${series.final.winner === pi ? "bw-bracket-winner" : series.final.winner !== null ? "bw-bracket-out" : ""}`}>
                <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern} uid={`bf${i}`} size={22} />
                <span>{m.teamName || m.clubName || m.name}</span>
                {series.final.winner !== null && <span className="bw-bracket-score">{series.final.wins[i]}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Semi-finals — shown before quarter-finals so the bracket reads in
          reverse-chronological order beneath the Grand Final (most recent,
          most relevant round first). */}
      {semis.length > 0 && (
        <div className="bw-bracket-section">
          {quarters.length > 0 && <div className="bw-bracket-section-title">SEMI-FINALS</div>}
          {semis.map((sm, i) => {
            const m0 = managers[sm.p[0]], m1 = managers[sm.p[1]];
            return (
              <div key={i} className="bw-bracket-card">
                <div className="bw-bracket-card-label">SEMI-FINAL {i + 1}</div>
                <div className={`bw-bracket-row ${sm.winner === sm.p[0] ? "bw-bracket-winner" : sm.winner !== null ? "bw-bracket-out" : ""}`}>
                  <KitSwatch primary={m0.primaryColor} secondary={m0.secondaryColor} pattern={m0.pattern} uid={`bs${i}a`} size={16} />
                  <span>{m0.teamName || m0.clubName || m0.name}</span>
                  <span className="bw-bracket-score">{sm.goals?.[0] ?? 0}</span>
                </div>
                <div className={`bw-bracket-row ${sm.winner === sm.p[1] ? "bw-bracket-winner" : sm.winner !== null ? "bw-bracket-out" : ""}`}>
                  <KitSwatch primary={m1.primaryColor} secondary={m1.secondaryColor} pattern={m1.pattern} uid={`bs${i}b`} size={16} />
                  <span>{m1.teamName || m1.clubName || m1.name}</span>
                  <span className="bw-bracket-score">{sm.goals?.[1] ?? 0}</span>
                </div>
                {sm.legsPlayed === 1 && sm.winner === null && (
                  <div className="bw-bracket-adv">Agg: {sm.goals[0]}–{sm.goals[1]} · Leg 2 to come</div>
                )}
                {sm.winner !== null && (
                  <div className="bw-bracket-adv">
                    → {managers[sm.winner].teamName || managers[sm.winner].name} advance
                    {sm.wonOnPens ? " (pens)" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quarter-finals (8-team only) */}
      {quarters.length > 0 && (
        <div className="bw-bracket-section">
          <div className="bw-bracket-section-title">QUARTER-FINALS</div>
          <div className="bw-bracket-grid">
            {quarters.map((q, i) => {
              const m0 = managers[q.p[0]], m1 = managers[q.p[1]];
              return (
                <div key={i} className="bw-bracket-card">
                  <div className="bw-bracket-card-label">QF {i + 1}</div>
                  <div className={`bw-bracket-row ${q.winner === q.p[0] ? "bw-bracket-winner" : q.winner !== null ? "bw-bracket-out" : ""}`}>
                    <KitSwatch primary={m0.primaryColor} secondary={m0.secondaryColor} pattern={m0.pattern} uid={`bq${i}a`} size={16} />
                    <span>{m0.teamName || m0.clubName || m0.name}</span>
                    <span className="bw-bracket-score">{q.goals?.[0] ?? 0}</span>
                  </div>
                  <div className={`bw-bracket-row ${q.winner === q.p[1] ? "bw-bracket-winner" : q.winner !== null ? "bw-bracket-out" : ""}`}>
                    <KitSwatch primary={m1.primaryColor} secondary={m1.secondaryColor} pattern={m1.pattern} uid={`bq${i}b`} size={16} />
                    <span>{m1.teamName || m1.clubName || m1.name}</span>
                    <span className="bw-bracket-score">{q.goals?.[1] ?? 0}</span>
                  </div>
                  {q.legsPlayed === 1 && q.winner === null && (
                    <div className="bw-bracket-adv">Agg: {q.goals[0]}–{q.goals[1]} · Leg 2 to come</div>
                  )}
                  {q.winner !== null && (
                    <div className="bw-bracket-adv">
                      → {(managers[q.winner].teamName || managers[q.winner].name)} advance
                      {q.wonOnPens ? " (pens)" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
  ctx.fillText("THE TRANSFER WHEEL  ·  transfer-game.vercel.app", W / 2, y + 10);

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

function ChampionSquad({ manager, onSaveSquad, saveState }) {
  const [collapsed, setCollapsed] = useState(true);
  const [exporting, setExporting] = useState(false);
  const isWC = manager.chestBudget !== undefined;
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
    <div className="bw-champ-squad">
      <div className="bw-champ-squad-header" onClick={() => setCollapsed(c => !c)}>
        <span className="bw-champ-squad-ovr">OVR {ovr}</span>
        <span className="bw-champ-squad-toggle-label">SQUAD</span>
        <span className="bw-champ-squad-toggle">{collapsed ? "▲" : "▼"}</span>
        <button className="bw-squad-action-btn" disabled={exporting} onClick={e => { e.stopPropagation(); exportSquad(); }}>{exporting ? "…" : "SHARE"}</button>
        {onSaveSquad && (
          <button
            className="bw-squad-action-btn"
            disabled={saveState?.saving || saveState?.saved}
            onClick={e => { e.stopPropagation(); onSaveSquad(); }}
          >
            {saveState?.saved ? "✓" : saveState?.saving ? "…" : "SAVE"}
          </button>
        )}
      </div>

      {!collapsed && <div className="bw-champ-squad-body">
        {manager.footballManager && (
          <div className="bw-champ-squad-manager">
            ⚙ {manager.footballManager.name}
            {manager.footballManager.styleLabel && ` — ${manager.footballManager.styleLabel}`}
          </div>
        )}
        <div className="bw-champ-squad-section-label">{isWC ? "SQUAD" : "STARTING XI"}</div>
        <div className="bw-champ-squad-list">
          {starters.map((p, i) => p ? (
            <div key={i} className="bw-champ-squad-row">
              {!isWC && <span className="bw-champ-squad-pos">{POSITIONS[i].key}</span>}
              <span className="bw-champ-squad-name">{p.name}</span>
              <span className="bw-champ-squad-club">{p.club}</span>
              <span
                className="bw-champ-squad-rating"
                style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
              >{p.rating}</span>
            </div>
          ) : null)}
        </div>

        {!isWC && <>
          <div className="bw-champ-squad-section-label">BENCH</div>
          <div className="bw-champ-squad-list">
            {bench.map((p, i) => p ? (
              <div key={i} className="bw-champ-squad-row">
                <span className="bw-champ-squad-pos">SUB</span>
                <span className="bw-champ-squad-name">{p.name}</span>
                <span className="bw-champ-squad-club">{p.club}</span>
                <span
                  className="bw-champ-squad-rating"
                  style={{ background: getRatingBg(p.rating), color: getRatingColor(p.rating) }}
                >{p.rating}</span>
              </div>
            ) : null)}
          </div>
        </>}
      </div>}
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
    <div className="bw-champ-tourn">
      {pott && (
        <div>
          <div className="bw-champ-pott-label">PLAYER OF THE TOURNAMENT</div>
          <div className="bw-champ-pott">
            <span className="bw-champ-pott-badge">{pott.avgRating.toFixed(1)}</span>
            <div className="bw-champ-pott-info">
              <div className="bw-champ-pott-name">{pott.name}</div>
              <div className="bw-champ-pott-team">{teamName(pott.managerIdx)} · ⚽ {pott.goals} · 🅰️ {pott.assists}</div>
            </div>
            <span className="bw-champ-pott-star">⭐</span>
          </div>
        </div>
      )}

      <div className="bw-champ-tourn-tables">
        {topScorers.length > 0 && (
          <div className="bw-champ-tourn-table">
            <div className="bw-champ-tourn-table-title">TOP SCORERS</div>
            {topScorers.map(([name, s]) => (
              <div className="bw-champ-tourn-row" key={name}>
                <span className="bw-champ-tourn-row-name">{name}</span>
                <span className="bw-champ-tourn-row-team">{teamName(s.managerIdx)}</span>
                <span className="bw-champ-tourn-row-val">⚽ {s.goals}</span>
              </div>
            ))}
          </div>
        )}
        {topAssisters.length > 0 && (
          <div className="bw-champ-tourn-table">
            <div className="bw-champ-tourn-table-title">TOP ASSISTS</div>
            {topAssisters.map(([name, s]) => (
              <div className="bw-champ-tourn-row" key={name}>
                <span className="bw-champ-tourn-row-name">{name}</span>
                <span className="bw-champ-tourn-row-team">{teamName(s.managerIdx)}</span>
                <span className="bw-champ-tourn-row-val">🅰️ {s.assists}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CpuSimOverlay({ draft, homeIdx, awayIdx, seriesCtx, onDone }) {
  const { managers, series } = draft;
  const [phase, setPhase] = useState("spinning");
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    const hm = managers[homeIdx];
    const am = managers[awayIdx];
    const homeName = hm.teamName || hm.clubName || hm.name;
    const awayName = am.teamName || am.clubName || am.name;

    const homeSquad = buildEffectiveSquad(hm, draft.playerAbsences || {});
    const awaySquad = buildEffectiveSquad(am, draft.playerAbsences || {});

    const res = generateEvents(
      homeSquad, awaySquad,
      homeName, awayName,
      seriesCtx?.legContext ?? null,
      hm, am,
      seriesCtx?.isLeg1 ?? false,
      hm.tactics ?? null,
      am.tactics ?? null,
      seriesCtx
    );

    const isLeg1 = seriesCtx?.isLeg1 ?? false;
    const legCtx = seriesCtx?.legContext ?? null;
    const isTournament = series.format === "tournament" || series.format === "tournament8";

    let winnerIdx = null;
    if (!isLeg1) {
      if (res.penWinner) {
        winnerIdx = res.penWinner === "home" ? homeIdx : awayIdx;
      } else if (legCtx) {
        const homeTotal = res.score.home + legCtx.homeAgg;
        const awayTotal = res.score.away + legCtx.awayAgg;
        if (homeTotal !== awayTotal) winnerIdx = homeTotal > awayTotal ? homeIdx : awayIdx;
      } else if (res.score.home !== res.score.away) {
        winnerIdx = res.score.home > res.score.away ? homeIdx : awayIdx;
      } else if (isTournament) {
        // shouldn't happen (pens trigger in single-leg tournament matches), but safe default
        winnerIdx = homeIdx;
      }
    }

    setSimResult({ ...res, winnerIdx });
    const t = setTimeout(() => setPhase("result"), 1600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function confirm() {
    if (!simResult) return;
    onDone(simResult.winnerIdx, simResult.score, simResult.ratings, simResult.events, simResult.matchInjuries);
  }

  useEffect(() => {
    if (phase !== "result" || !simResult) return;
    const t = setTimeout(confirm, 3000);
    return () => clearTimeout(t);
  }, [phase, simResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const hm = managers[homeIdx];
  const am = managers[awayIdx];
  const homeName = hm.teamName || hm.clubName || hm.name;
  const awayName = am.teamName || am.clubName || am.name;
  const homeAccent = kitAccent(hm.primaryColor, hm.secondaryColor);
  const awayAccent = kitAccent(am.primaryColor, am.secondaryColor);

  const goals = simResult ? simResult.events.filter(e => e.type === "goal") : [];
  const homeGoals = goals.filter(e => e.team === "home");
  const awayGoals = goals.filter(e => e.team === "away");

  return (
    <div className="cpu-sim-overlay" onClick={phase === "result" ? confirm : undefined}>
      <div className="cpu-sim-card" onClick={e => e.stopPropagation()}>
        <div className="cpu-sim-label">{seriesCtx?.label || "CPU vs CPU"}</div>

        <div className="cpu-sim-teams">
          <div className="cpu-sim-team">
            <KitSwatch primary={hm.primaryColor} secondary={hm.secondaryColor} pattern={hm.pattern} uid="csH" size={36} />
            <span className="cpu-sim-team-name" style={{ color: homeAccent }}>{homeName}</span>
          </div>
          <div className="cpu-sim-score">
            {phase === "spinning"
              ? <span className="cpu-sim-ball">⚽</span>
              : simResult
                ? <span>{simResult.score.home}–{simResult.score.away}</span>
                : <span>–</span>
            }
          </div>
          <div className="cpu-sim-team cpu-sim-team-right">
            <KitSwatch primary={am.primaryColor} secondary={am.secondaryColor} pattern={am.pattern} uid="csA" size={36} />
            <span className="cpu-sim-team-name" style={{ color: awayAccent }}>{awayName}</span>
          </div>
        </div>

        {phase === "spinning" && <div className="cpu-sim-status">Simulating…</div>}

        {phase === "result" && simResult && (
          <div className="cpu-sim-result">
            {simResult.penWinner && <div className="cpu-sim-pens">⚡ Won on penalties</div>}
            {(homeGoals.length > 0 || awayGoals.length > 0) && (
              <div className="cpu-sim-scorers">
                <div className="cpu-sim-scorer-col">
                  {homeGoals.map((g, i) => (
                    <span key={i} className="cpu-sim-scorer-name">{g.scorer} {g.min}'</span>
                  ))}
                </div>
                <div className="cpu-sim-scorer-col cpu-sim-scorer-col-right">
                  {awayGoals.map((g, i) => (
                    <span key={i} className="cpu-sim-scorer-name">{g.scorer} {g.min}'</span>
                  ))}
                </div>
              </div>
            )}
            <button className="sim-btn cpu-sim-continue" onClick={confirm}>CONTINUE ▶</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeriesScreen({ draft, setScreen, recordMatchResult, restartGame, onSaveSquad, saveState, isHost = true }) {
  const { managers, series } = draft;
  const [cpuSimActive, setCpuSimActive] = useState(false);

  if (!series) return null;

  const nextMatchup = getNextMatchup(series);
  const isChampion = series.stage === "champion";
  const champion = series.champion !== null ? managers[series.champion] : null;

  const isCpuVsCpu = nextMatchup
    ? !!(managers[nextMatchup.homeIdx]?.isComputer && managers[nextMatchup.awayIdx]?.isComputer)
    : false;
  const seriesCtxForSim = nextMatchup ? getSeriesContext(series, managers) : null;

  function playNextMatch() {
    if (!nextMatchup) return;
    setScreen("match", { homeIdx: nextMatchup.homeIdx, awayIdx: nextMatchup.awayIdx });
  }

  function handleSimDone(winnerIdx, score, ratings, events, injuries) {
    const { homeIdx, awayIdx } = nextMatchup;
    setCpuSimActive(false);
    recordMatchResult(homeIdx, awayIdx, winnerIdx, score, ratings, events, injuries);
  }

  const formatLabel = (series.format === "tournament" || series.format === "tournament8")
    ? "TOURNAMENT"
    : series.format.toUpperCase().replace("BO", "BEST OF ") + " SERIES";

  return (
    <div className="series-screen">
      {isChampion && champion ? (
        <div className="bw-champ-screen">
          <div className="bw-champ-stage">
            <div className="bw-champ-stage-spin" />
            <div className="bw-champ-stage-glow" />
            <div className="bw-champ-confetti c1" />
            <div className="bw-champ-confetti c2" />
            <div className="bw-champ-confetti c3" />
            <div className="bw-champ-confetti c4" />
            <div className="bw-champ-confetti c5" />
            <div className="bw-champ-trophy">
              <span className="bw-champ-crown" style={{ background: champion.primaryColor }} />
              <div className="bw-champ-cup">
                <div className="bw-champ-cup-bowl" />
                <div className="bw-champ-cup-handle left" />
                <div className="bw-champ-cup-handle right" />
              </div>
              <div className="bw-champ-cup-stem" />
              <div className="bw-champ-cup-collar" />
              <div className="bw-champ-cup-base" />
            </div>
            <div className="bw-champ-marquee">
              <div className="bw-champ-marquee-sub">WINNERS · GRAND FINAL</div>
              <div className="bw-champ-marquee-main">CHAMPIONS</div>
            </div>
          </div>

          <div className="bw-champ-body">
            <div className="bw-champ-name">
              {champion.teamName || champion.clubName || champion.name}
            </div>
            <div className="bw-champ-result">
              {(series.format === "tournament" || series.format === "tournament8")
                ? "Wins the tournament!"
                : (() => {
                    const [p0, p1] = series.participants;
                    const [w0, w1] = series.wins;
                    const ci = series.champion === p0 ? 0 : 1;
                    const opponent = managers[p0 === series.champion ? p1 : p0];
                    const oppName = opponent ? (opponent.teamName || opponent.clubName || opponent.name) : "opponent";
                    return <>beat {oppName} <strong>{[w0, w1][ci]}–{[w0, w1][1 - ci]}</strong> in the series</>;
                  })()
              }
            </div>
            <div className="bw-champ-dof">
              Director of Football: {champion.dofName || champion.name}
            </div>

            {/* Full squad */}
            <ChampionSquad manager={champion} onSaveSquad={onSaveSquad} saveState={saveState} />

            {/* Tournament stats */}
            <TournamentResults tournamentStats={draft.tournamentStats} managers={managers} />

            {/* Actions */}
            {isHost ? (
              <div className="bw-champ-actions">
                <button className="bw-champ-btn secondary" onClick={() => setScreen("squads")}>VIEW ALL SQUADS</button>
                <button className="bw-champ-btn primary" onClick={restartGame}>NEW GAME →</button>
              </div>
            ) : (
              <div className="mp-waiting-screen">
                <div className="mp-waiting-spinner" />
                <p className="mp-waiting-text">Waiting for the host…</p>
              </div>
            )}

          </div>
        </div>
      ) : (series.format !== "tournament" && series.format !== "tournament8") ? (
        <TwoPlayerSeriesHub
          draft={draft}
          series={{ ...series, history: series.history || [] }}
          managers={managers}
          nextMatchup={nextMatchup}
          isHost={isHost}
          isCpuVsCpu={isCpuVsCpu}
          cpuSimActive={cpuSimActive}
          setCpuSimActive={setCpuSimActive}
          playNextMatch={playNextMatch}
          setScreen={setScreen}
          seriesCtxForSim={seriesCtxForSim}
          handleSimDone={handleSimDone}
        />
      ) : (
        <div className="bw-series-frame">
          <div className="bw-banner">
            <div className="bw-banner-title">{formatLabel}</div>
            {nextMatchup && (
              <div className="bw-tourn-title">{nextMatchup.label}</div>
            )}
          </div>

          <div className="bw-series-body">
            <TournamentBracket series={series} managers={managers} />

            <TournamentStats tournamentStats={draft.tournamentStats} managers={managers} />

            {nextMatchup && (
              isHost ? (
                <div className="bw-series-actions">
                  <button className="bw-cta-arcade" onClick={playNextMatch}>
                    ▶ {nextMatchup.label === "GRAND FINAL" ? "PLAY GRAND FINAL" : nextMatchup.matchNum > 1 ? `PLAY MATCH ${nextMatchup.matchNum} — ${nextMatchup.label}` : `PLAY MATCH 1 — ${nextMatchup.label}`}
                  </button>
                  {isCpuVsCpu && (
                    <button className="bw-cta-secondary" onClick={() => setCpuSimActive(true)}>
                      ⚡ AUTO-SIMULATE
                    </button>
                  )}
                  <button className="bw-cta-secondary" onClick={() => setScreen("squads")}>TEAM MANAGEMENT</button>
                </div>
              ) : (
                <div className="mp-waiting-screen">
                  <div className="mp-waiting-spinner" />
                  <p className="mp-waiting-text">Waiting for the host to play the next match…</p>
                </div>
              )
            )}

            {cpuSimActive && nextMatchup && (
              <CpuSimOverlay
                draft={draft}
                homeIdx={nextMatchup.homeIdx}
                awayIdx={nextMatchup.awayIdx}
                seriesCtx={seriesCtxForSim}
                onDone={handleSimDone}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

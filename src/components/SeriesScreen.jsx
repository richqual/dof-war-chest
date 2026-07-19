import { useState, useEffect } from "react";
import KitSwatch, { kitAccent } from "./KitSwatch";
import { POSITIONS, getRatingBg, getRatingColor, formatValue } from "../data/players";
import { FORMATIONS } from "../data/formations";
import { squadRating } from "./SquadScreen";
import { generateEvents, buildEffectiveSquad } from "./MatchSim";

// Small tally shown while a tournament/series is in progress once it's been
// restarted at least once — a soft "it's taken a few goes" indicator.
function AttemptChip({ restartCount }) {
  if (!restartCount) return null;
  return (
    <div className="bw-attempt-chip">
      ATTEMPT #{restartCount + 1} · {restartCount} RESTART{restartCount > 1 ? "S" : ""}
    </div>
  );
}

// RESTART button with an inline two-tap confirm. Re-runs the whole tournament
// from the draw (or a 2-player series from 0–0) while keeping every squad.
function RestartControl({ onRestart, isTournament }) {
  const [confirming, setConfirming] = useState(false);
  if (!onRestart) return null;
  if (confirming) {
    return (
      <div className="bw-restart-confirm">
        <div className="bw-restart-confirm-msg">
          Restart the {isTournament ? "tournament from the draw" : "series from 0–0"}? Your drafted squads are kept.
        </div>
        <div className="bw-restart-confirm-btns">
          <button className="bw-cta-secondary bw-restart-yes" onClick={onRestart}>↻ YES, RESTART</button>
          <button className="bw-cta-secondary" onClick={() => setConfirming(false)}>CANCEL</button>
        </div>
      </div>
    );
  }
  return (
    // The attempt count already sits in the banner chip above, so repeating it
    // here only made the label overflow its button in the utility row.
    <button className="bw-cta-secondary bw-restart-btn" onClick={() => setConfirming(true)}>
      ↻ RESTART
    </button>
  );
}

// Restart button styled for the champion screen (won or lost). Two-tap confirm
// so a losing finalist can re-run the whole tournament instead of only NEW GAME.
function ChampRestartButton({ onRestart, isTournament }) {
  const [confirming, setConfirming] = useState(false);
  if (!onRestart) return null;
  if (confirming) {
    return (
      <>
        <button className="bw-champ-btn secondary" onClick={() => setConfirming(false)}>CANCEL</button>
        <button className="bw-champ-btn restart" onClick={onRestart}>↻ CONFIRM · SQUADS KEPT</button>
      </>
    );
  }
  return (
    <button className="bw-champ-btn restart" onClick={() => setConfirming(true)}>
      ↻ RESTART {isTournament ? "TOURNAMENT" : "SERIES"}
    </button>
  );
}

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

// The play/watch/skip button cluster, shared by the 2-player hub and the
// tournament bracket view so the two can't drift apart.
//
// For a CPU vs CPU fixture the old single "AUTO-SIMULATE" button read as a
// second, equally-weighted way to play the match. It's now an explicit
// WATCH / SKIP pair: watching opens the full match screen, skipping resolves
// it instantly. Plus a third option to fast-forward every CPU tie between
// here and the player's own next fixture.
// Laid out as a hierarchy rather than one flat stack of equal-weight buttons:
// the gold CTA is the thing to do next, the skip row is how to get past it,
// and the utility row (squads / restart) is quieter and sits underneath.
function MatchActions({ nextMatchup, primaryLabel, isCpuVsCpu, hasHumanLater, playNextMatch, startSkip, startSkipToHuman, children }) {
  return (
    <div className="bw-series-actions">
      {isCpuVsCpu ? (
        <>
          <button className="bw-cta-arcade bw-cta-watch" onClick={playNextMatch}>
            <span className="bw-cta-kicker">CPU vs CPU</span>
            <span className="bw-cta-main">👁 WATCH {nextMatchup.label || primaryLabel}</span>
          </button>
          <div className="bw-series-skiprow">
            <button className="bw-cta-secondary bw-cta-skip" onClick={startSkip}>
              <span className="bw-cta-skip-icon">⏭</span>
              <span className="bw-cta-skip-label">SKIP</span>
              <span className="bw-cta-skip-sub">instant result</span>
            </button>
            {hasHumanLater && (
              <button className="bw-cta-secondary bw-cta-skip" onClick={startSkipToHuman}>
                <span className="bw-cta-skip-icon">⏩</span>
                <span className="bw-cta-skip-label">SKIP AHEAD</span>
                <span className="bw-cta-skip-sub">to my next match</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <button className="bw-cta-arcade" onClick={playNextMatch}>▶ {primaryLabel}</button>
      )}
      <div className="bw-series-utilrow">{children}</div>
    </div>
  );
}

// Mounts the instant-result overlay. Keyed on simTick so each match in a skip
// chain gets a fresh mount (the overlay generates its result on mount).
function SimOverlayHost({ draft, nextMatchup, seriesCtxForSim, cpuSimActive, skipMode, simTick, handleSimDone, cancelSkip }) {
  if (!cpuSimActive || !nextMatchup) return null;
  return (
    <CpuSimOverlay
      key={`${nextMatchup.homeIdx}-${nextMatchup.awayIdx}-${simTick}`}
      draft={draft}
      homeIdx={nextMatchup.homeIdx}
      awayIdx={nextMatchup.awayIdx}
      seriesCtx={seriesCtxForSim}
      onDone={handleSimDone}
      fast={skipMode === "toHuman"}
      onCancel={skipMode === "toHuman" ? cancelSkip : null}
    />
  );
}

// Series hub — the head-to-head best-of-N spine (mock ref: 2d).
function TwoPlayerSeriesHub({ draft, series, managers, nextMatchup, isHost, actions, setScreen, seriesCtxForSim, restartCount = 0, onRestart = null }) {
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
        <AttemptChip restartCount={restartCount} />
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
            <MatchActions
              nextMatchup={nextMatchup}
              primaryLabel={nextMatchup.isSeriesTiebreaker ? "PLAY TIEBREAKER" : `PLAY MATCH ${nextMatchup.matchNum}`}
              {...actions}
            >
              <button className="bw-cta-secondary" onClick={() => setScreen("squads")}>TEAM MANAGEMENT</button>
              <RestartControl onRestart={onRestart} isTournament={false} />
            </MatchActions>
          ) : (
            <div className="mp-waiting-screen">
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">Waiting for the host to play the next match…</p>
            </div>
          )
        )}

        <SimOverlayHost draft={draft} nextMatchup={nextMatchup} seriesCtxForSim={seriesCtxForSim} {...actions} />
      </div>
    </div>
  );
}

// Bracket row score: dash until a leg is played (avoids a phantom 0-0 before
// kick-off).
//
// On a two-legged tie the headline number is the scoreline of the most recent
// leg, with the running aggregate in brackets after it — the football
// convention, and the thing you actually want to read after leg 2. Only
// showing the aggregate made leg 2 impossible to follow.
//
// Saves made before per-leg scores were recorded have no `legs`, so those fall
// back to the old aggregate-only display rather than showing nonsense.
function bracketScore(slot, idx, singleLeg) {
  if (!slot || !(slot.legsPlayed > 0)) return "–";
  const agg = slot.goals?.[idx] ?? 0;
  if (singleLeg) return agg;

  const legs = slot.legs;
  if (!legs?.length) return `(${agg})`;

  const latest = legs[legs.length - 1]?.[idx] ?? 0;
  // After leg 1 the aggregate is just that leg — repeating it reads as noise.
  return legs.length < 2 ? `${latest}` : `${latest} (${agg})`;
}

// One side of a tie. `score` is pre-formatted by the caller because the final
// carries a wins tally while earlier rounds carry goals/aggregate.
function BracketSide({ mgr, score, state, uid }) {
  return (
    <div className={`bw-bracket-row ${state === "won" ? "bw-bracket-winner" : state === "out" ? "bw-bracket-out" : ""}`}>
      <KitSwatch primary={mgr.primaryColor} secondary={mgr.secondaryColor} pattern={mgr.pattern} uid={uid} size={16} />
      <span>{mgr.teamName || mgr.clubName || mgr.name}</span>
      <span className="bw-bracket-score">{score}</span>
    </div>
  );
}

// A single tie in the bracket. Works for quarters, semis and the final — the
// caller supplies the score formatter so the final can show its wins tally.
function BracketTie({ tie, managers, label, uid, scoreFor, isLive, isFinal }) {
  // A tie exists as an empty shell before its feeder round resolves — the
  // final in particular is created with unfilled slots.
  const known = tie && tie.p && managers[tie.p[0]] && managers[tie.p[1]];
  if (!known) {
    return (
      <div className="bw-bracket-card bw-bracket-card-tbd">
        <div className="bw-bracket-card-label">{label}</div>
        <div className="bw-bracket-row bw-bracket-out"><span /><span>TBD</span><span /></div>
        <div className="bw-bracket-row bw-bracket-out"><span /><span>TBD</span><span /></div>
      </div>
    );
  }
  const [a, b] = tie.p;
  const m0 = managers[a], m1 = managers[b];
  const decided = tie.winner !== null && tie.winner !== undefined;
  const stateFor = i => !decided ? "" : tie.winner === tie.p[i] ? "won" : "out";

  return (
    <div className={`bw-bracket-card ${isFinal ? "bw-bracket-card-final" : ""} ${isLive ? "bw-bracket-card-live" : ""}`}>
      <div className="bw-bracket-card-label">
        {label}{isLive && <span className="bw-bracket-live-dot" />}
      </div>
      <BracketSide mgr={m0} score={scoreFor(tie, 0)} state={stateFor(0)} uid={`${uid}a`} />
      <BracketSide mgr={m1} score={scoreFor(tie, 1)} state={stateFor(1)} uid={`${uid}b`} />
      {decided && (
        <div className="bw-bracket-adv">
          {isFinal
            ? `🏆 ${managers[tie.winner].teamName || managers[tie.winner].name} win`
            : `→ ${managers[tie.winner].teamName || managers[tie.winner].name} advance`}
          {tie.wonOnPens ? " (pens)" : ""}
        </div>
      )}
    </div>
  );
}

// Tournament bracket — handles 4-team (semis+final) and 8-team (QF+SF+final).
//
// One DOM, two layouts. Rounds are laid out left-to-right as a flex track with
// connector spines between them. On widescreen the whole track is visible at
// once; on mobile the track becomes a carousel — each round is 100% wide and
// the track is translated by the active index, driven by the ‹ › arrows. That
// keeps a single source of truth rather than two divergent renderers.
function TournamentBracket({ series, managers, nextMatchup }) {
  const quarters = series.quarters || [];
  const semis = series.semis || [];

  // Which single tie is actually up next. Derived from the fixture the hub is
  // about to play, so the pulsing marker means "this one now" rather than
  // "somewhere in this round".
  const liveKey = !nextMatchup ? null
    : nextMatchup.quarterIdx != null ? `qf${nextMatchup.quarterIdx}`
    : nextMatchup.semiIdx != null ? `sf${nextMatchup.semiIdx}`
    : nextMatchup.label === "GRAND FINAL" ? "final0"
    : null;

  // Rounds, in bracket order (earliest first) — this is the reading order for
  // a real bracket, unlike the old reverse-chronological card stack.
  const rounds = [];
  if (quarters.length > 0) {
    rounds.push({
      title: "QUARTER-FINALS",
      short: "QF",
      ties: quarters.map((q, i) => ({ tie: q, label: `QF ${i + 1}`, key: `qf${i}` })),
      scoreFor: (t, i) => bracketScore(t, i, series.singleLeg),
    });
  }
  if (semis.length > 0 || quarters.length > 0) {
    // With 8 teams the semis exist as placeholders before the QFs resolve.
    const slots = semis.length > 0 ? semis : [null, null];
    rounds.push({
      title: "SEMI-FINALS",
      short: "SF",
      ties: slots.map((sm, i) => ({ tie: sm, label: `SEMI-FINAL ${i + 1}`, key: `sf${i}` })),
      scoreFor: (t, i) => bracketScore(t, i, series.singleLeg),
    });
  }
  rounds.push({
    title: "GRAND FINAL",
    short: "FINAL",
    ties: [{ tie: series.final || null, label: "⭐ GRAND FINAL", key: "final0" }],
    scoreFor: (t, i) => (t.winner !== null && t.winner !== undefined ? t.wins[i] : "–"),
    isFinal: true,
  });

  // The round mobile should open on: the one holding the next fixture, falling
  // back to the earliest unresolved round if there's no fixture (tournament over).
  const liveRound = Math.max(0, liveKey
    ? rounds.findIndex(r => r.ties.some(t => t.key === liveKey))
    : rounds.findIndex(r =>
        r.ties.some(({ tie }) => !tie || tie.winner === null || tie.winner === undefined)
      ));

  const [active, setActive] = useState(liveRound);
  // Follow the tournament forward as rounds resolve, but don't yank the view
  // back if the player has deliberately paged to an earlier round.
  const [lastLive, setLastLive] = useState(liveRound);
  if (liveRound !== lastLive) {
    setLastLive(liveRound);
    setActive(liveRound);
  }

  const clamped = Math.min(active, rounds.length - 1);

  return (
    <div className="bw-bracket-wrap">
      {/* Mobile-only round pager. Hidden on widescreen, where the whole
          bracket is on screen and there is nothing to page through. */}
      {rounds.length > 1 && (
        <div className="bw-bracket-nav">
          <button
            className="bw-bracket-nav-arrow"
            onClick={() => setActive(i => Math.max(0, i - 1))}
            disabled={clamped === 0}
            aria-label="Previous round"
          >‹</button>
          <div className="bw-bracket-nav-mid">
            <div className="bw-bracket-nav-title">{rounds[clamped].title}</div>
            <div className="bw-bracket-nav-dots">
              {rounds.map((r, i) => (
                <button
                  key={i}
                  className={`bw-bracket-nav-dot ${i === clamped ? "on" : ""} ${i === liveRound ? "live" : ""}`}
                  onClick={() => setActive(i)}
                  aria-label={r.title}
                />
              ))}
            </div>
          </div>
          <button
            className="bw-bracket-nav-arrow"
            onClick={() => setActive(i => Math.min(rounds.length - 1, i + 1))}
            disabled={clamped === rounds.length - 1}
            aria-label="Next round"
          >›</button>
        </div>
      )}

      <div className="bw-bracket-viewport">
        <div className="bw-bracket-track" style={{ "--bkt-i": clamped, "--bkt-n": rounds.length }}>
          {rounds.map((r, ri) => (
            <div key={ri} className={`bw-bracket-round ${r.isFinal ? "bw-bracket-round-final" : ""}`}>
              <div className="bw-bracket-round-title">{r.title}</div>
              <div className="bw-bracket-round-ties">
                {r.ties.map(({ tie, label, key }, ti) => (
                  <div key={ti} className="bw-bracket-slot">
                    <BracketTie
                      tie={tie}
                      managers={managers}
                      label={label}
                      uid={`bkt${ri}${ti}`}
                      scoreFor={r.scoreFor}
                      isFinal={!!r.isFinal}
                      isLive={key === liveKey}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
  // Label each starter by the manager's actual formation, not the default 4-3-3.
  const formationCoords = FORMATIONS[manager.formation] || FORMATIONS["4-3-3"];

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
              {!isWC && <span className="bw-champ-squad-pos">{formationCoords[i]?.pos || POSITIONS[i].key}</span>}
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

function RoadToVictory({ matchLog, championIdx, managers }) {
  const [open, setOpen] = useState(false);
  if (!matchLog || championIdx == null) return null;

  const games = matchLog
    .filter(m => m.homeIdx === championIdx || m.awayIdx === championIdx)
    .map(m => {
      const isHome = m.homeIdx === championIdx;
      const oppIdx = isHome ? m.awayIdx : m.homeIdx;
      const champScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const opp = managers[oppIdx];
      const oppName = opp ? (opp.teamName || opp.clubName || opp.name) : "–";
      const won = m.winnerIdx === championIdx;
      const champScorers = (m.scorers || []).filter(s => s.teamIdx === championIdx);
      let outcome = "D";
      if (m.winnerIdx != null) outcome = won ? "W" : "L";
      return { oppName, champScore, oppScore, outcome, pens: m.pens, won, champScorers, stage: m.stage };
    });

  if (!games.length) return null;

  return (
    <div className="bw-champ-road">
      <div className="bw-champ-road-header" onClick={() => setOpen(o => !o)}>
        <span className="bw-champ-road-title">🏁 ROAD TO VICTORY</span>
        <span className="bw-champ-road-toggle">{open ? "▼" : "▲"}</span>
      </div>
      {open && (
        <div className="bw-champ-road-body">
          {games.map((g, i) => (
            <div className="bw-champ-road-game" key={i}>
              <div className="bw-champ-road-line">
                <span className={`bw-champ-road-badge ${g.outcome === "W" ? "win" : g.outcome === "L" ? "loss" : "draw"}`}>{g.outcome}</span>
                {g.stage && <span className="bw-champ-road-stage">{g.stage}</span>}
                <span className="bw-champ-road-opp">vs {g.oppName}</span>
                <span className="bw-champ-road-score">
                  {g.champScore}–{g.oppScore}{g.pens ? " (pens)" : ""}
                </span>
              </div>
              {g.champScorers.length > 0 && (
                <div className="bw-champ-road-scorers">
                  {g.champScorers.map((s, j) => (
                    <span key={j} className="bw-champ-road-scorer">⚽ {s.name} {s.min}'</span>
                  ))}
                </div>
              )}
            </div>
          ))}
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

// `fast` shortens both beats so a chain of skipped fixtures reels past at a
// watchable pace instead of costing ~4.6s each. The dwell carries most of the
// budget — that's the part you actually read the scoreline in.
function CpuSimOverlay({ draft, homeIdx, awayIdx, seriesCtx, onDone, fast = false, onCancel = null }) {
  const spinMs = fast ? 340 : 1600;
  const dwellMs = fast ? 1450 : 3000;
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
    const t = setTimeout(() => setPhase("result"), spinMs);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function confirm() {
    if (!simResult) return;
    onDone(simResult.winnerIdx, simResult.score, simResult.ratings, simResult.events, simResult.matchInjuries);
  }

  useEffect(() => {
    if (phase !== "result" || !simResult) return;
    const t = setTimeout(confirm, dwellMs);
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

  const penEvent = simResult ? simResult.events.find(e => e.type === "pens") : null;
  const penWinnerName = simResult?.penWinner
    ? (simResult.penWinner === "home" ? homeName : awayName)
    : null;

  return (
    <div className="cpu-sim-overlay" onClick={phase === "result" ? confirm : undefined}>
      <div className="cpu-sim-card" onClick={e => e.stopPropagation()}>
        <div className="cpu-sim-label">{seriesCtx?.label || "CPU vs CPU"}</div>
        {fast && (
          <div className="cpu-sim-skipbar">
            <span className="cpu-sim-skipbar-text">⏩ SKIPPING TO YOUR NEXT MATCH</span>
            {onCancel && (
              <button className="cpu-sim-skipbar-stop" onClick={onCancel}>STOP</button>
            )}
          </div>
        )}

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
            {simResult.penWinner && (
              <div className="cpu-sim-pens">
                ⚡ {penWinnerName} win {penEvent?.penScore ? `${penEvent.penScore} ` : ""}on penalties
              </div>
            )}
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
            {!fast && <button className="bw-cta-arcade cpu-sim-continue" onClick={confirm}>CONTINUE ▶</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeriesScreen({ draft, setScreen, recordMatchResult, restartGame, restartTournament, onSaveSquad, saveState, isHost = true }) {
  const { managers, series } = draft;
  const [cpuSimActive, setCpuSimActive] = useState(false);
  // null = not skipping, "one" = resolve just this fixture, "toHuman" = keep
  // resolving CPU fixtures until one of the player's own comes up.
  const [skipMode, setSkipMode] = useState(null);
  // Bumped after each resolved sim so the chain can re-arm with a fresh overlay.
  const [simTick, setSimTick] = useState(0);

  // Drives the skip-to-my-next-match chain. Each time a fixture resolves this
  // re-checks who's up: another CPU pairing re-arms the overlay, anything else
  // (a human fixture, or the tournament finishing) ends the chain and hands
  // control back.
  useEffect(() => {
    if (skipMode !== "toHuman") return;
    const nm = series ? getNextMatchup(series) : null;
    const cpuOnly = !!(nm && managers[nm.homeIdx]?.isComputer && managers[nm.awayIdx]?.isComputer);
    if (!cpuOnly) {
      setSkipMode(null);
      setCpuSimActive(false);
      return;
    }
    setCpuSimActive(true);
  }, [skipMode, simTick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!series) return null;

  const restartCount = draft.restartCount || 0;
  const isTournamentFmt = series.format === "tournament" || series.format === "tournament8";
  const canRestart = isHost && restartTournament ? restartTournament : null;

  const nextMatchup = getNextMatchup(series);
  const isChampion = series.stage === "champion";
  const champion = series.champion !== null ? managers[series.champion] : null;

  const isCpuVsCpu = nextMatchup
    ? !!(managers[nextMatchup.homeIdx]?.isComputer && managers[nextMatchup.awayIdx]?.isComputer)
    : false;
  const seriesCtxForSim = nextMatchup ? getSeriesContext(series, managers) : null;

  // Everyone knocked out so far — the loser of every decided tie. Anyone not in
  // here is still in the competition.
  const eliminated = new Set();
  if (isTournamentFmt) {
    for (const tie of [...(series.quarters || []), ...(series.semis || [])]) {
      if (tie.winner !== null && tie.winner !== undefined) {
        eliminated.add(tie.p[0] === tie.winner ? tie.p[1] : tie.p[0]);
      }
    }
  }
  // Only offer "skip to my next match" when the player actually has one coming:
  // a human still in the competition, who isn't in the fixture already up.
  const hasHumanLater = isCpuVsCpu && managers.some(
    (m, i) => !m.isComputer && !eliminated.has(i)
  );

  function playNextMatch() {
    if (!nextMatchup) return;
    setScreen("match", { homeIdx: nextMatchup.homeIdx, awayIdx: nextMatchup.awayIdx });
  }

  function startSkip() {
    setSkipMode("one");
    setCpuSimActive(true);
  }

  function startSkipToHuman() {
    setSkipMode("toHuman");
    setCpuSimActive(true);
  }

  function cancelSkip() {
    setSkipMode(null);
    setCpuSimActive(false);
  }

  function handleSimDone(winnerIdx, score, ratings, events, injuries) {
    const { homeIdx, awayIdx } = nextMatchup;
    setCpuSimActive(false);
    if (skipMode === "one") setSkipMode(null);
    setSimTick(t => t + 1);
    recordMatchResult(homeIdx, awayIdx, winnerIdx, score, ratings, events, injuries);
  }

  // Bundled so the two hub layouts share one wiring surface.
  const actions = {
    isCpuVsCpu, hasHumanLater, cpuSimActive, skipMode, simTick,
    playNextMatch, startSkip, startSkipToHuman, cancelSkip, handleSimDone,
  };

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
            {restartCount > 0 && (
              <div className="bw-champ-attempt">
                🏆 Won on attempt #{restartCount + 1} · took {restartCount} restart{restartCount > 1 ? "s" : ""}
              </div>
            )}

            {/* Full squad */}
            <ChampionSquad manager={champion} onSaveSquad={onSaveSquad} saveState={saveState} />

            {/* Road to Victory — champion's run of games */}
            <RoadToVictory matchLog={draft.matchLog} championIdx={series.champion} managers={managers} />

            {/* Tournament stats */}
            <TournamentResults tournamentStats={draft.tournamentStats} managers={managers} />

            {/* Actions */}
            {isHost ? (
              <div className="bw-champ-actions">
                <button className="bw-champ-btn secondary" onClick={() => setScreen("squads")}>VIEW ALL SQUADS</button>
                <ChampRestartButton onRestart={canRestart} isTournament={isTournamentFmt} />
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
          actions={actions}
          setScreen={setScreen}
          seriesCtxForSim={seriesCtxForSim}
          restartCount={restartCount}
          onRestart={canRestart}
        />
      ) : (
        <div className="bw-series-frame bw-series-frame-bracket">
          <div className="bw-banner">
            <div className="bw-banner-title">{formatLabel}</div>
            {nextMatchup && (
              <div className="bw-tourn-title">{nextMatchup.label}</div>
            )}
            <AttemptChip restartCount={restartCount} />
          </div>

          <div className="bw-series-body">
            <TournamentBracket series={series} managers={managers} nextMatchup={nextMatchup} />

            <TournamentStats tournamentStats={draft.tournamentStats} managers={managers} />

            {nextMatchup && (
              isHost ? (
                <MatchActions
                  nextMatchup={nextMatchup}
                  primaryLabel={nextMatchup.label === "GRAND FINAL" ? "PLAY GRAND FINAL" : `PLAY MATCH ${nextMatchup.matchNum} — ${nextMatchup.label}`}
                  {...actions}
                >
                  <button className="bw-cta-secondary" onClick={() => setScreen("squads")}>TEAM MANAGEMENT</button>
                  <RestartControl onRestart={canRestart} isTournament={isTournamentFmt} />
                </MatchActions>
              ) : (
                <div className="mp-waiting-screen">
                  <div className="mp-waiting-spinner" />
                  <p className="mp-waiting-text">Waiting for the host to play the next match…</p>
                </div>
              )
            )}

            <SimOverlayHost draft={draft} nextMatchup={nextMatchup} seriesCtxForSim={seriesCtxForSim} {...actions} />
          </div>
        </div>
      )}
    </div>
  );
}

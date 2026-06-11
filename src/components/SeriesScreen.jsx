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
    const played = series.wins[0] + series.wins[1];
    const [p0, p1] = series.participants;
    return {
      homeIdx: played % 2 === 0 ? p0 : p1,
      awayIdx: played % 2 === 0 ? p1 : p0,
      matchNum: played + 1,
      label: series.format.toUpperCase().replace("BO", "BEST OF "),
    };
  }

  // Tournament semis (aggregate 2-leg format — ET/pens in leg 2 if level)
  if (series.stage === "semis" && series.semis) {
    for (let si = 0; si < series.semis.length; si++) {
      const sm = series.semis[si];
      if (sm.winner !== null) continue;
      const played = sm.legsPlayed;
      return {
        homeIdx: played % 2 === 0 ? sm.p[0] : sm.p[1],
        awayIdx: played % 2 === 0 ? sm.p[1] : sm.p[0],
        matchNum: played + 1,
        label: `SEMI ${si + 1} · LEG ${played + 1}`,
        semiIdx: si,
      };
    }
  }

  // Tournament final
  if ((series.stage === "final" || series.stage === "semis") && series.final) {
    const f = series.final;
    const played = f.wins[0] + f.wins[1];
    return {
      homeIdx: played % 2 === 0 ? f.p[0] : f.p[1],
      awayIdx: played % 2 === 0 ? f.p[1] : f.p[0],
      matchNum: played + 1,
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
    if (hWins === aWins) standing = `All square · ${hWins}–${aWins}`;
    else if (hWins > aWins) standing = `${homeName} lead ${hWins}–${aWins}`;
    else standing = `${awayName} lead ${aWins}–${hWins}`;
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
    } else {
      standing = next.label;
    }
  }

  // For leg 2, pass the leg 1 aggregate so generateEvents can trigger ET on agg level.
  // homeIdx for leg 2 = sm.p[1], so homeAgg = sm.goals[1], awayAgg = sm.goals[0].
  let legContext = null;
  if (next.semiIdx != null && series.semis) {
    const sm = series.semis[next.semiIdx];
    if (sm && sm.legsPlayed === 1) {
      legContext = { homeAgg: sm.goals[1], awayAgg: sm.goals[0] };
    }
  }

  return { label: `MATCH ${next.matchNum} · ${next.label}`, standing, homeIdx: next.homeIdx, awayIdx: next.awayIdx, legContext };
}

// Two-player series standings panel
function TwoPlayerStandings({ series, managers }) {
  const [p0, p1] = series.participants;
  const m0 = managers[p0], m1 = managers[p1];
  return (
    <div className="series-standings">
      <ManagerStrip mgr={m0} wins={series.wins[0]} target={series.target} isChampion={series.champion === p0} />
      <div className="series-vs-divider">{series.wins[0]}–{series.wins[1]}</div>
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

function ChampionSquad({ manager }) {
  const starters = manager.squad.slice(0, 11);
  const bench = manager.squad.slice(11, 16);

  function exportSquad() {
    const ovr = squadRating(manager.squad);
    const lines = [
      `=== ${manager.teamName || manager.clubName} — CHAMPIONS ===`,
      `Director of Football: ${manager.dofName || manager.name}`,
      `Overall: ${ovr}`,
      "",
      "STARTING XI:",
      ...starters.map((p, i) =>
        p ? `  ${POSITIONS[i].key.padEnd(3)} ${p.name} (${p.rating}) — ${formatValue(p.value)}`
          : `  ${POSITIONS[i].key.padEnd(3)} [empty]`
      ),
      "",
      "BENCH:",
      ...bench.map(p =>
        p ? `  SUB ${p.name} (${p.rating}) — ${formatValue(p.value)}`
          : `  SUB [empty]`
      ),
    ];
    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => alert("Copied to clipboard!"))
      .catch(() => alert(lines.join("\n")));
  }

  const ovr = squadRating(manager.squad);

  return (
    <div className="champ-squad">
      <div className="champ-squad-header">
        <span className="champ-squad-ovr">OVR {ovr}</span>
        <button className="action-btn" onClick={exportSquad}>EXPORT SQUAD</button>
      </div>

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
              <div className="series-next-label">MATCH {nextMatchup.matchNum} · {nextMatchup.label}</div>
            )}
          </div>

          {series.format !== "tournament"
            ? <TwoPlayerStandings series={series} managers={managers} />
            : <TournamentBracket series={series} managers={managers} />
          }

          {nextMatchup && (
            <div className="series-actions">
              <button className="sim-btn" onClick={playNextMatch}>
                ▶ PLAY{nextMatchup.matchNum > 1 ? ` MATCH ${nextMatchup.matchNum}` : " FIRST MATCH"}
              </button>
              <button className="sim-btn secondary" onClick={() => setScreen("squads")}>VIEW SQUADS</button>
            </div>
          )}

          <div className="series-footer">
            <button className="restart-btn" onClick={restartGame}>NEW GAME</button>
          </div>
        </>
      )}
    </div>
  );
}

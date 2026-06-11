import KitSwatch, { kitAccent } from "./KitSwatch";

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

  // Tournament semis
  if (series.stage === "semis" && series.semis) {
    for (let si = 0; si < series.semis.length; si++) {
      const sm = series.semis[si];
      if (sm.winner !== null) continue;
      const played = sm.wins[0] + sm.wins[1];
      return {
        homeIdx: played % 2 === 0 ? sm.p[0] : sm.p[1],
        awayIdx: played % 2 === 0 ? sm.p[1] : sm.p[0],
        matchNum: played + 1,
        label: `SEMI-FINAL ${si + 1}`,
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
    standing = next.label;
  }

  return { label: `MATCH ${next.matchNum} · ${next.label}`, standing, homeIdx: next.homeIdx, awayIdx: next.awayIdx };
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
              <span className="bracket-wins">{sm.wins[0]}</span>
            </div>
            <div className={`bracket-team ${sm.winner === sm.p[1] ? "bracket-winner" : sm.winner !== null ? "bracket-out" : ""}`}>
              <KitSwatch primary={m1.primaryColor} secondary={m1.secondaryColor} pattern={m1.pattern} uid={`bs${i}b`} size={22} />
              <span style={{ color: accent1 }}>{m1.teamName || m1.clubName || m1.name}</span>
              <span className="bracket-wins">{sm.wins[1]}</span>
            </div>
            {sm.winner !== null && (
              <div className="bracket-adv">→ {(managers[sm.winner].teamName || managers[sm.winner].name)} advance</div>
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
        // Champion fanfare
        <div className="champion-screen" style={{ "--champ-a": champion.primaryColor, "--champ-b": champion.secondaryColor }}>
          <div className="champion-flash-bg" />
          <div className="champion-content">
            <div className="champion-trophy">🏆</div>
            <div className="champion-title">CHAMPION!</div>
            <div className="champion-name" style={{ color: championAccent }}>
              {champion.teamName || champion.clubName || champion.name}
            </div>
            <div className="champion-sub">
              {series.format === "tournament"
                ? `Wins the tournament!`
                : (() => {
                    const [p0, p1] = series.participants;
                    const [w0, w1] = series.wins;
                    const ci = series.champion === p0 ? 0 : 1;
                    const oi = 1 - ci;
                    return `Wins the series ${[w0,w1][ci]}–${[w0,w1][oi]}`;
                  })()
              }
            </div>
            <button className="sim-btn" style={{ marginTop: "2rem" }} onClick={restartGame}>NEW GAME</button>
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

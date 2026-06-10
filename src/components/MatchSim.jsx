import { useState, useEffect, useRef } from "react";

function teamStrength(squad) {
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return 70;
  return starters.reduce((s, p) => s + p.rating, 0) / starters.length;
}

function bestPlayer(squad, posFilter) {
  const pl = squad.filter(Boolean);
  if (posFilter) {
    const pos = pl.filter(p => p.pos === posFilter);
    if (pos.length) return pos.sort((a, b) => b.rating - a.rating)[0];
  }
  return pl.sort((a, b) => b.rating - a.rating)[0];
}

function weighted(items) {
  const total = items.reduce((s, it) => s + it.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const COMMENTARY_GOAL = [
  (scorer, team) => `${scorer} slots it home coolly. ${team} in front!`,
  (scorer, team) => `GOAAAL! ${scorer} makes no mistake. ${team} lead!`,
  (scorer, team) => `${scorer} with an absolute thunderbolt! ${team} celebrate!`,
  (scorer, team) => `The keeper had no chance. ${scorer} puts ${team} ahead!`,
  (scorer, team) => `${scorer} taps it in from close range. ${team} in front!`,
  (scorer, team) => `Brilliant finish from ${scorer}! ${team} fans go wild!`,
];

const COMMENTARY_MISS = [
  (p) => `${p} drives wide! So close.`,
  (p) => `${p} rattles the crossbar! Agonising.`,
  (p) => `${p} fires over from six yards!`,
  (p) => `The keeper pulls off a stunning save to deny ${p}.`,
  (p) => `${p} hits the post — can't believe it!`,
  (p) => `${p} blazes over! That was a great chance.`,
];

const COMMENTARY_CARD = [
  (p) => `${p} goes into the book for a reckless challenge.`,
  (p) => `Referee shows ${p} a yellow card after that foul.`,
  (p) => `${p} lunges in late — yellow card.`,
];

const COMMENTARY_NEUTRAL = [
  (a, b) => `${a} pressing hard but ${b}'s defence is holding firm.`,
  (a, b) => `${b} counter-attack — good defending to clear the danger.`,
  (a, b) => `${a} looking comfortable in possession here.`,
  (a, b) => `End to end stuff now as both sides chase the next goal.`,
  (a, b) => `${a} corner comes to nothing. ${b} clear.`,
  (a, b) => `${b} forcing a couple of corners in quick succession.`,
];

function generateEvents(homeSquad, awaySquad, homeName, awayName) {
  const hStr = teamStrength(homeSquad);
  const aStr = teamStrength(awaySquad);
  const ratio = hStr / (hStr + aStr);

  const events = [];
  let hGoals = 0, aGoals = 0;
  const hCards = [], aCards = [];

  const minutes = [...new Set(Array.from({ length: rand(18, 28) }, () => rand(1, 90)))].sort((a, b) => a - b);

  for (const min of minutes) {
    const r = Math.random();

    if (r < 0.32) {
      const isHome = Math.random() < ratio;
      const team = isHome ? homeSquad : awaySquad;
      const teamName = isHome ? homeName : awayName;
      const attacker = bestPlayer(team.slice(0, 11), weighted([{ v: "ST", w: 3 }, { v: "RW", w: 1.5 }, { v: "LW", w: 1.5 }, { v: "MF", w: 1 }]));
      const name = attacker ? attacker.name : "The striker";

      const goalChance = 0.38 + (isHome ? hStr - aStr : aStr - hStr) * 0.004;
      if (Math.random() < goalChance) {
        isHome ? hGoals++ : aGoals++;
        const fn = COMMENTARY_GOAL[rand(0, COMMENTARY_GOAL.length - 1)];
        events.push({ min, type: "goal", team: isHome ? "home" : "away", scorer: name, text: fn(name, teamName), score: `${hGoals}–${aGoals}` });
      } else {
        const fn = COMMENTARY_MISS[rand(0, COMMENTARY_MISS.length - 1)];
        events.push({ min, type: "miss", text: fn(name) });
      }
    } else if (r < 0.45) {
      const isHome = Math.random() < 0.5;
      const team = isHome ? homeSquad : awaySquad;
      const pl = team.slice(0, 11).filter(Boolean);
      const target = pl[rand(0, pl.length - 1)];
      if (target) {
        const fn = COMMENTARY_CARD[rand(0, COMMENTARY_CARD.length - 1)];
        events.push({ min, type: "yellow", team: isHome ? "home" : "away", player: target.name, text: fn(target.name) });
        if (isHome) hCards.push(target.name); else aCards.push(target.name);
      }
    } else {
      const fn = COMMENTARY_NEUTRAL[rand(0, COMMENTARY_NEUTRAL.length - 1)];
      const isHome = Math.random() < 0.5;
      events.push({ min, type: "commentary", text: fn(isHome ? homeName : awayName, isHome ? awayName : homeName) });
    }
  }

  let etEvents = [];
  let penWinner = null;
  let finalHome = hGoals, finalAway = aGoals;

  if (hGoals === aGoals) {
    etEvents.push({ min: 90, type: "commentary", text: `FULL TIME — ${hGoals}–${aGoals}. Extra time!` });
    const etMinutes = [rand(92, 98), rand(99, 105), rand(106, 112), rand(113, 120)];
    for (const min of etMinutes) {
      if (Math.random() < 0.2) {
        const isHome = Math.random() < ratio;
        const team = isHome ? homeSquad : awaySquad;
        const teamName = isHome ? homeName : awayName;
        const attacker = bestPlayer(team.slice(0, 11), null);
        const name = attacker ? attacker.name : "The striker";
        if (Math.random() < 0.45) {
          isHome ? finalHome++ : finalAway++;
          const fn = COMMENTARY_GOAL[rand(0, COMMENTARY_GOAL.length - 1)];
          etEvents.push({ min, type: "goal", team: isHome ? "home" : "away", scorer: name, text: fn(name, teamName), score: `${finalHome}–${finalAway}` });
        } else {
          const fn = COMMENTARY_MISS[rand(0, COMMENTARY_MISS.length - 1)];
          etEvents.push({ min, type: "miss", text: fn(name) });
        }
      } else {
        const fn = COMMENTARY_NEUTRAL[rand(0, COMMENTARY_NEUTRAL.length - 1)];
        etEvents.push({ min, type: "commentary", text: fn(homeName, awayName) });
      }
    }

    if (finalHome === finalAway) {
      etEvents.push({ min: 120, type: "commentary", text: `FULL TIME EXTRA TIME — ${finalHome}–${finalAway}. PENALTY SHOOTOUT!` });
      let hPens = 0, aPens = 0;
      const penLog = [];
      for (let i = 0; i < 5; i++) {
        const hScore = Math.random() < 0.76;
        const aScore = Math.random() < 0.76;
        if (hScore) hPens++; else penLog.push(`${homeName} MISS`);
        if (aScore) aPens++; else penLog.push(`${awayName} MISS`);
        penLog.push(`${homeName} ${hPens}–${aPens} ${awayName}`);
      }
      while (hPens === aPens) {
        const hScore = Math.random() < 0.76;
        const aScore = Math.random() < 0.76;
        if (hScore) hPens++;
        if (aScore) aPens++;
      }
      penWinner = hPens > aPens ? "home" : "away";
      etEvents.push({ min: 121, type: "pens", text: `Penalties: ${homeName} ${hPens}–${aPens} ${awayName}. ${penWinner === "home" ? homeName : awayName} wins on pens!`, penWinner });
    }
  }

  const allEvents = [...events, ...etEvents];
  const hPoss = Math.round(40 + ratio * 20);
  const aPoss = 100 - hPoss;

  const goalEvents = allEvents.filter(e => e.type === "goal");
  const scorers = {};
  goalEvents.forEach(e => { scorers[e.scorer] = (scorers[e.scorer] || 0) + 1; });
  let motm = null;
  if (Object.keys(scorers).length > 0) {
    motm = Object.entries(scorers).sort((a, b) => b[1] - a[1])[0][0];
  } else {
    const all = [...homeSquad.slice(0, 11), ...awaySquad.slice(0, 11)].filter(Boolean);
    const top = all.sort((a, b) => b.rating - a.rating)[0];
    motm = top ? top.name : "N/A";
  }

  return {
    events: allEvents,
    score: { home: finalHome, away: finalAway },
    stats: {
      hShots: Math.max(finalHome, rand(3, 8)),
      aShots: Math.max(finalAway, rand(2, 7)),
      hPoss, aPoss,
      hCards: hCards.length, aCards: aCards.length,
    },
    motm,
    penWinner,
  };
}

const SPEEDS = [
  { label: "CRAWL",   ms: 2500 },
  { label: "SLOW",    ms: 1200 },
  { label: "NORMAL",  ms: 600  },
  { label: "FAST",    ms: 200  },
  { label: "INSTANT", ms: 0   },
];

export default function MatchSim({ draft, homeIdx, awayIdx, onBack }) {
  const homeManager = draft.managers[homeIdx];
  const awayManager = draft.managers[awayIdx];
  const homeName = homeManager.teamName || homeManager.name;
  const awayName = awayManager.teamName || awayManager.name;

  const [result, setResult] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [done, setDone] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2); // default NORMAL
  const feedRef = useRef(null);
  const intervalRef = useRef(null);
  const speedRef = useRef(SPEEDS[1].ms);

  function startSim() {
    clearInterval(intervalRef.current);
    const r = generateEvents(homeManager.squad, awayManager.squad, homeName, awayName);
    setResult(r);
    setVisibleEvents([]);
    setSimulating(true);
    setDone(false);

    const ms = speedRef.current;

    if (ms === 0) {
      // Instant — show all at once
      setVisibleEvents(r.events);
      setSimulating(false);
      setDone(true);
      return;
    }

    let i = 0;
    intervalRef.current = setInterval(() => {
      if (i >= r.events.length) {
        clearInterval(intervalRef.current);
        setSimulating(false);
        setDone(true);
        return;
      }
      setVisibleEvents(prev => [...prev, r.events[i]]);
      i++;
    }, ms);
  }

  function changeSpeed(idx) {
    setSpeedIdx(idx);
    speedRef.current = SPEEDS[idx].ms;
    // If currently simulating, restart the interval at new speed
    if (simulating && result) {
      clearInterval(intervalRef.current);
      const current = visibleEvents.length;
      if (SPEEDS[idx].ms === 0) {
        setVisibleEvents(result.events);
        setSimulating(false);
        setDone(true);
        return;
      }
      let i = current;
      intervalRef.current = setInterval(() => {
        if (i >= result.events.length) {
          clearInterval(intervalRef.current);
          setSimulating(false);
          setDone(true);
          return;
        }
        setVisibleEvents(prev => [...prev, result.events[i]]);
        i++;
      }, SPEEDS[idx].ms);
    }
  }

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visibleEvents]);

  const currentScore = visibleEvents.filter(e => e.type === "goal").reduce(
    (acc, e) => { if (e.team === "home") acc.home++; else acc.away++; return acc; },
    { home: 0, away: 0 }
  );

  function eventIcon(e) {
    if (e.type === "goal") return "⚽";
    if (e.type === "yellow") return "🟨";
    if (e.type === "miss") return "↗";
    if (e.type === "pens") return "🎯";
    return "▸";
  }

  function eventClass(e) {
    if (e.type === "goal") return "event-goal";
    if (e.type === "yellow") return "event-yellow";
    if (e.type === "miss") return "event-miss";
    if (e.type === "pens") return "event-pens";
    return "event-commentary";
  }

  return (
    <div className="match-screen">
      <div className="match-header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <span className="match-title">MATCH SIMULATION</span>
        <div className="speed-controls">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              className={`speed-btn ${speedIdx === i ? "active" : ""}`}
              onClick={() => changeSpeed(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scoreboard">
        <div className="sb-team home">
          <div className="sb-name">{homeName}</div>
          <div className="sb-score">{simulating || done ? currentScore.home : "–"}</div>
        </div>
        <div className="sb-vs">
          {simulating ? <span className="sim-live">LIVE</span> : done ? "FT" : "VS"}
        </div>
        <div className="sb-team away">
          <div className="sb-score">{simulating || done ? currentScore.away : "–"}</div>
          <div className="sb-name">{awayName}</div>
        </div>
      </div>

      {!simulating && !done && (
        <div className="sim-start-area">
          <div className="pre-match-stats">
            <div className="pre-stat">
              <div className="pre-stat-val">{Math.round(teamStrength(homeManager.squad))}</div>
              <div className="pre-stat-label">AVG RATING</div>
            </div>
            <div className="pre-stat-label-mid">VS</div>
            <div className="pre-stat">
              <div className="pre-stat-val">{Math.round(teamStrength(awayManager.squad))}</div>
              <div className="pre-stat-label">AVG RATING</div>
            </div>
          </div>
          <button className="sim-btn" onClick={startSim}>▶ KICK OFF</button>
        </div>
      )}

      <div className="event-feed" ref={feedRef}>
        {visibleEvents.map((e, i) => (
          <div key={i} className={`event-row ${eventClass(e)}`}>
            <span className="event-min">{e.min}&apos;</span>
            <span className="event-icon">{eventIcon(e)}</span>
            <span className="event-text">{e.text}</span>
            {e.score && <span className="event-score">{e.score}</span>}
          </div>
        ))}
      </div>

      {done && result && (
        <div className="match-summary">
          <div className="summary-title">FULL TIME</div>
          <div className="final-score">
            {homeName} {result.score.home}–{result.score.away} {awayName}
            {result.penWinner && (
              <div className="pen-note">
                ({result.penWinner === "home" ? homeName : awayName} win on penalties)
              </div>
            )}
          </div>

          <div className="motm-row">
            <span className="motm-label">MAN OF THE MATCH</span>
            <span className="motm-name">⭐ {result.motm}</span>
          </div>

          <div className="stats-grid">
            <div className="stat-row">
              <span className="stat-home">{result.stats.hShots}</span>
              <span className="stat-label">SHOTS</span>
              <span className="stat-away">{result.stats.aShots}</span>
            </div>
            <div className="stat-row">
              <span className="stat-home">{result.stats.hPoss}%</span>
              <span className="stat-label">POSSESSION</span>
              <span className="stat-away">{result.stats.aPoss}%</span>
            </div>
            <div className="stat-row">
              <span className="stat-home">{result.stats.hCards}</span>
              <span className="stat-label">YELLOW CARDS</span>
              <span className="stat-away">{result.stats.aCards}</span>
            </div>
          </div>

          <button className="sim-btn secondary" onClick={startSim}>REPLAY</button>
        </div>
      )}
    </div>
  );
}

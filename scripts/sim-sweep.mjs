// Headless rating-gap sweep for the match engine (src/components/MatchSim.jsx).
//
// Loads the real generateEvents() function via Vite's SSR module loader (no
// browser needed) and runs a batch of simulated matches at each rating gap,
// so tuning changes to the engine can be checked against real output instead
// of hand-estimated probabilities.
//
// Usage: npm run sim:sweep
// Options (env vars): BASE_RATING (default 82), MAX_GAP (default 40),
//   STEP (default 5), N (sims per gap, default 1500), MODE=5aside for
//   War Chest squads instead of classic 11-a-side.
import { createServer } from "vite";

const BASE_RATING = Number(process.env.BASE_RATING ?? 82);
const MAX_GAP = Number(process.env.MAX_GAP ?? 40);
const STEP = Number(process.env.STEP ?? 5);
const N = Number(process.env.N ?? 1500);
const MODE_5ASIDE = process.env.MODE === "5aside";

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
const { generateEvents } = await server.ssrLoadModule("/src/components/MatchSim.jsx");

function mkPlayer(id, pos, rating) {
  return {
    name: `P${rating}_${id}`, pos, rating,
    pac: rating, sho: rating, pas: rating, dri: rating, def: rating, phy: rating,
  };
}

const CLASSIC_POS = ["GK", "CB", "CB", "LB", "RB", "DM", "CM", "CAM", "LW", "RW", "ST"];
const FIVE_A_SIDE_POS = ["GK", "CB", "CM", "ST", "ST"];
const POS_LIST = MODE_5ASIDE ? FIVE_A_SIDE_POS : CLASSIC_POS;

function buildSquad(rating) {
  return POS_LIST.map((pos, i) => mkPlayer(i, pos, rating));
}

// Standard chess/Elo expected-score formula, inverted to solve for the rating
// gap that would produce the observed win probability. Lets you compare the
// engine's curve directly against real-world Elo systems (e.g. clubelo.com).
function impliedEloGap(expectedScore) {
  const e = Math.min(0.999, Math.max(0.001, expectedScore));
  return -400 * Math.log10(1 / e - 1);
}

function runGap(gap, N) {
  const strong = buildSquad(BASE_RATING + gap / 2);
  const weak = buildSquad(BASE_RATING - gap / 2);
  let strongWin = 0, weakWin = 0, draw = 0, strongGoals = 0, weakGoals = 0;

  for (let i = 0; i < N; i++) {
    const r = generateEvents(strong, weak, "Strong FC", "Weak FC");
    const { score } = r;
    strongGoals += score.home;
    weakGoals += score.away;
    if (score.home > score.away) strongWin++;
    else if (score.away > score.home) weakWin++;
    else draw++;
  }

  const expectedScore = (strongWin + draw * 0.5) / N; // "expected score" in Elo terms
  return {
    gap,
    strongWinPct: +(strongWin / N * 100).toFixed(1),
    drawPct: +(draw / N * 100).toFixed(1),
    weakWinPct: +(weakWin / N * 100).toFixed(1),
    avgStrongGoals: +(strongGoals / N).toFixed(2),
    avgWeakGoals: +(weakGoals / N).toFixed(2),
    impliedElo: Math.round(impliedEloGap(expectedScore)),
  };
}

console.log(`Sweep: ${MODE_5ASIDE ? "5-a-side" : "classic"} mode, base rating ${BASE_RATING}, N=${N} per gap\n`);
console.log(
  "gap".padStart(4), "| strongWin%".padStart(11), "| draw%".padStart(7), "| weakWin%".padStart(9),
  "| avgScore".padStart(11), "| implied Elo".padStart(13), "| Elo/point".padStart(10)
);
console.log("-".repeat(80));

let prevElo = 0;
const rows = [];
for (let gap = 0; gap <= MAX_GAP; gap += STEP) {
  const row = runGap(gap, N);
  const eloPerPoint = gap > 0 ? +((row.impliedElo - 0) / gap).toFixed(1) : null;
  rows.push({ ...row, eloPerPoint });
  console.log(
    String(row.gap).padStart(4),
    `| ${row.strongWinPct}%`.padStart(11),
    `| ${row.drawPct}%`.padStart(7),
    `| ${row.weakWinPct}%`.padStart(9),
    `| ${row.avgStrongGoals}-${row.avgWeakGoals}`.padStart(11),
    `| ${row.impliedElo}`.padStart(13),
    `| ${eloPerPoint ?? "-"}`.padStart(10),
  );
  prevElo = row.impliedElo;
}

// Flag saturation: if Elo-per-point drops sharply as the gap widens, the
// tanh curve is flattening out (clamp or divisor too aggressive at the top).
console.log("\nSaturation check (Elo-per-point should stay roughly flat if the curve scales cleanly):");
const withElo = rows.filter(r => r.eloPerPoint != null);
for (let i = 1; i < withElo.length; i++) {
  const prev = withElo[i - 1], cur = withElo[i];
  const drop = ((prev.eloPerPoint - cur.eloPerPoint) / prev.eloPerPoint * 100).toFixed(0);
  console.log(`  gap ${prev.gap}->${cur.gap}: ${prev.eloPerPoint} -> ${cur.eloPerPoint} Elo/point (${drop > 0 ? "-" : "+"}${Math.abs(drop)}%)`);
}

await server.close();
process.exit(0);

// Sweep every starter+sub slot × budgets, counting how many cards a re-scout swaps.
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(), server: { middlewareMode: true },
  appType: "custom", logLevel: "silent",
});
const S = await server.ssrLoadModule("/src/hooks/scoutUtils.js");
const D = await server.ssrLoadModule("/src/hooks/draftUtils.js");
const { PLAYERS, POSITIONS } = await server.ssrLoadModule("/src/data/players.js");

const byId = new Map(PLAYERS.map(p => [p.id, p]));
const FORMATION = process.env.FORM || "4-3-3";
const NUM = 4;

const availableSet = D.selectGamePlayers({});
const playerValues = D.randomizePlayerValues(availableSet);
const valueOf = (p) => playerValues.get(p.id) ?? p.value ?? Math.round(((p.valueMin ?? 0) + (p.valueMax ?? 0)) / 2);
const filterFn = (p) => availableSet.has(p.id);
const livePool = S.buildScoutLivePool(FORMATION, NUM, { poolSize: "medium", filterFn });

const BUDGETS = [10, 25, 45, 70, 120];
const fails = [];
console.log("slot/bucket        budget  report  swapped");
for (let idx = 0; idx < 16; idx++) {
  const bucket = S.scoutBucketForSlot(FORMATION, idx);
  if (!bucket) continue;
  for (const budget of BUDGETS) {
    const reportIds = S.buildScoutReport({
      livePool, bucket, takenIds: [], squad: [], budget,
      tierCaps: null, tenets: [], valueOf,
    });
    if (!reportIds.length) continue;
    const report = reportIds.map(id => ({ ...byId.get(id) }));
    const res = S.reScoutSwap({
      report, livePool, bucket, formation: FORMATION, positionIndex: idx,
      takenIds: [], budget, tenets: [], valueOf, filterFn,
    });
    const n = res.retireIds.length, tot = report.length;
    const flag = n < tot ? "  <<<< PARTIAL" : "";
    if (n < tot) fails.push({ idx, bucket, budget, n, tot, report });
    console.log(`${String(idx).padStart(2)} ${bucket.padEnd(14)} ${String(budget).padStart(5)}  ${String(tot).padStart(5)}  ${String(n).padStart(6)}${flag}`);
  }
}

if (fails.length) {
  const f = fails[0];
  console.log("\n--- first partial case: slot %d %s budget %d (%d/%d swapped) ---", f.idx, f.bucket, f.budget, f.n, f.tot);
  const inPlay = new Set();
  for (const ids of Object.values(livePool)) for (const id of ids) inPlay.add(id);
  const base = f.bucket.includes("#") ? f.bucket.split("#")[0] : f.bucket;
  f.report.forEach(c => {
    let posOk = 0, avail = 0, notInPool = 0, afford = 0;
    for (const p of PLAYERS) {
      if (p.tier !== c.tier) continue;
      if (p.pos !== c.pos) continue; // rough proxy for eligibility
      posOk++;
      if (!filterFn(p)) continue; avail++;
      if (inPlay.has(p.id)) continue; notInPool++;
      if (valueOf(p) > f.budget) continue; afford++;
    }
    console.log(`  ${c.tier} ${c.pos} ${c.name} £${valueOf(c)}m → samePos+tier ${posOk} / avail ${avail} / notInPool ${notInPool} / affordable ${afford}`);
  });
}

await server.close();

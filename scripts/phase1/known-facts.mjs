// Phase 1 — known-facts tests. A small suite of football facts that must always
// hold against the built data + season logic, guarding the off-by-one hazards
// (end-year convention, career windows, identity merge). Loads the real modules
// via Vite's SSR loader (same trick as kitty-check.mjs) so bare imports resolve.
//
// Usage: node scripts/phase1/known-facts.mjs
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(), server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
});
const { PLAYERS } = await server.ssrLoadModule("/src/data/players.generated.js");
const { selectGamePlayers, identityKey } = await server.ssrLoadModule("/src/hooks/draftUtils.js");
const { MANAGERS } = await server.ssrLoadModule("/src/data/managers.js");
const season = await server.ssrLoadModule("/src/utils/season.js");
const { cardWindow, activeInSeason, ageInSeason } = season;

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${detail}`); }
}

const cardsFor = (name) => PLAYERS.filter((p) => p.name === name);
// An identity is active in S when ANY of its cards' windows cover S.
const identityActive = (name, s) => cardsFor(name).some((c) => activeInSeason(cardWindow(c), s));
const mgrActive = (m, s) => s == null || activeInSeason(cardWindow(m), s);
const mgr = (name) => MANAGERS.find((m) => m.name === name);
const poolHasName = (filter, name) => {
  const ids = selectGamePlayers(filter);
  const wanted = new Set(cardsFor(name).map((c) => c.id));
  return [...ids].some((id) => wanted.has(id));
};

console.log("\n── Age convention (age at season start = season − 1 − birthYear) ──");
check("Gerrard born 1980 is 18 in 1999", ageInSeason(1980, 1999) === 18, `got ${ageInSeason(1980, 1999)}`);
check("2000 → 19", ageInSeason(1980, 2000) === 19);

console.log("\n── Steven Gerrard ──");
const gerrard = cardsFor("Steven Gerrard")[0];
check("exists", !!gerrard);
check("active in 1999", identityActive("Steven Gerrard", 1999));
check("enriched birthYear 1980", gerrard?.birthYear === 1980, `got ${gerrard?.birthYear}`);
check("has wikidataId", !!gerrard?.wikidataId, `got ${gerrard?.wikidataId}`);
check("in the 1999 game pool", poolHasName({ season: 1999 }, "Steven Gerrard"));

console.log("\n── Thierry Henry (identity window spans the move) ──");
check("active in 1999", identityActive("Thierry Henry", 1999));
check("active in 2000", identityActive("Thierry Henry", 2000));
const henryKeys = new Set(cardsFor("Thierry Henry").map(identityKey));
check("3 cards collapse to ONE identity (shared wikidataId)", henryKeys.size === 1, `${henryKeys.size} identities`);
check("one Henry in a no-filter pool", (() => {
  const ids = selectGamePlayers({});
  const henryIds = new Set(cardsFor("Thierry Henry").map((c) => c.id));
  return [...ids].filter((id) => henryIds.has(id)).length === 1;
})());

console.log("\n── Wayne Rooney (MLS years are not top-5) ──");
check("NOT active in 2019", !identityActive("Wayne Rooney", 2019));
check("active in 2010", identityActive("Wayne Rooney", 2010));
check("NOT in the 2019 game pool", !poolHasName({ season: 2019 }, "Wayne Rooney"));

console.log("\n── Managers gated by active window ──");
check("Wenger manages in 1999", mgrActive(mgr("Arsène Wenger"), 1999));
check("Pochettino does NOT manage in 1999", !mgrActive(mgr("Mauricio Pochettino"), 1999));
check("Pochettino DOES manage in 2014", mgrActive(mgr("Mauricio Pochettino"), 2014));

console.log("\n── Legends sit outside the season system ──");
check("no legends in a single-season pool", (() => {
  const ids = selectGamePlayers({ season: 2005 });
  const legendIds = new Set(PLAYERS.filter((p) => p.league === "legends").map((p) => p.id));
  return ![...ids].some((id) => legendIds.has(id));
})());
check("legends present in All-seasons pool", (() => {
  const ids = selectGamePlayers({});
  const legendIds = new Set(PLAYERS.filter((p) => p.league === "legends").map((p) => p.id));
  return [...ids].some((id) => legendIds.has(id));
})());

await server.close();
console.log(`\n${fail ? "FAILED" : "ALL PASS"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

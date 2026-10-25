// Phase 1 — Wikidata enrichment.
//
// Attaches to each player identity (grouped by name): a permanent `wikidataId`
// (Q-ID), `birthYear`, and a best-effort top-5-league career window
// (`firstSeason`/`lastSeason`, end-year convention). The Q-ID is what the
// identity merge in selectGamePlayers dedups on; birthYear drives the Age field.
//
// Availability gating does NOT depend on the derived window (the app gates by
// each card's own `years` spell — see src/utils/season.js cardWindow), so an
// imperfect window is safe: it's additive identity data for the merge, the Age
// field's fallback, and Career Mode. Unmatched names simply keep no Q-ID /
// birthYear and gate by `years` as before.
//
// Source: Wikidata Query Service (public SPARQL, CC0, no auth). Matching is by
// exact English label + occupation footballer, ranked by nationality + how much
// top-5 football the candidate actually played. Results are cached per name so
// the run is resumable; re-running only queries names not yet cached.
//
// Usage:
//   node scripts/phase1/enrich-wikidata.mjs            # full run (writes CSV)
//   node scripts/phase1/enrich-wikidata.mjs --limit 20 # first 20 names only
//   node scripts/phase1/enrich-wikidata.mjs --names "Steven Gerrard,Thierry Henry"
//   node scripts/phase1/enrich-wikidata.mjs --no-write # query+cache, don't touch CSV
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { parseCsvByHeader, toCsv } from "../phase0/players-codec.mjs";

const CSV = new URL("../../src/data/players.source.csv", import.meta.url);
const CACHE = new URL("./wikidata-cache.json", import.meta.url);
const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "TheTransferWheel/1.0 (https://github.com/richqual/dof-war-chest; richstew92@gmail.com)";

// Top-5 league Q-IDs (a club's P118). Used to keep only top-flight spells in the
// career window; everything else (MLS, national teams, lower divisions) drops out.
const TOP5 = new Set(["Q9448", "Q324867", "Q15804", "Q82595", "Q13394"]);

const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const LIMIT = getArg("--limit") ? Number(getArg("--limit")) : null;
const ONLY = getArg("--names") ? getArg("--names").split(",").map((s) => s.trim()) : null;
const NO_WRITE = args.includes("--no-write");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Decode the CSV `nation` flag emoji into an ISO-3166 alpha-2 code for a soft
// nationality tiebreak. Standard flags are two regional-indicator letters; the
// three home-nation "black flag" tag sequences map to GB.
function flagToIso(flag) {
  if (!flag) return null;
  const cps = [...flag].map((c) => c.codePointAt(0));
  const ri = cps.filter((c) => c >= 0x1f1e6 && c <= 0x1f1ff).map((c) => String.fromCharCode(c - 0x1f1e6 + 65));
  if (ri.length === 2) return ri.join("");
  if (cps.some((c) => c === 0x1f3f4)) return "GB"; // England/Scotland/Wales tag flags
  return null;
}

function seasonOfStart(dateStr) {
  if (!dateStr) return null;
  const y = Number(dateStr.slice(0, 4)), m = Number(dateStr.slice(5, 7)) || 1;
  return m >= 7 ? y + 1 : y;            // joined in/after July → first full season is y+1
}
function seasonOfEnd(dateStr) {
  if (!dateStr) return null;
  return Number(dateStr.slice(0, 4));   // leaving year ≈ end-year of the last season played
}

const qid = (uri) => (uri || "").split("/").pop();

async function sparql(query, tries = 4) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(ENDPOINT + "?format=json&query=" + encodeURIComponent(query), {
        headers: { Accept: "application/sparql-results+json", "User-Agent": UA },
      });
      if (res.ok) return (await res.json()).results.bindings;
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (t + 1)); continue; }
      throw new Error("HTTP " + res.status);
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1200 * (t + 1));
    }
  }
  return [];
}

// Escape a label for a SPARQL string literal.
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function queryFor(name) {
  return `SELECT ?item ?dob ?cc ?team ?start ?end ?league WHERE {
  ?item rdfs:label "${esc(name)}"@en .
  ?item wdt:P106 wd:Q937857 .
  OPTIONAL { ?item wdt:P569 ?dob. }
  OPTIONAL { ?item wdt:P27 ?country. OPTIONAL { ?country wdt:P297 ?cc. } }
  OPTIONAL {
    ?item p:P54 ?st. ?st ps:P54 ?team.
    OPTIONAL { ?st pq:P580 ?start. }
    OPTIONAL { ?st pq:P582 ?end. }
    OPTIONAL { ?team wdt:P118 ?league. }
  }
} LIMIT 400`;
}

// Turn the flat result rows for one name into candidate identities, then pick
// the best by (top-5 football played) + (nationality match) + (has birth date).
function resolve(rows, iso) {
  const items = new Map();
  for (const r of rows) {
    const id = qid(r.item?.value);
    if (!id) continue;
    if (!items.has(id)) items.set(id, { id, dob: null, ccs: new Set(), spells: new Map() });
    const it = items.get(id);
    if (r.dob?.value && !it.dob) it.dob = r.dob.value;
    if (r.cc?.value) it.ccs.add(r.cc.value);
    if (r.team?.value) {
      const key = r.team.value + "|" + (r.start?.value || "") + "|" + (r.end?.value || "");
      it.spells.set(key, { league: qid(r.league?.value), start: r.start?.value || null, end: r.end?.value || null });
    }
  }
  let best = null, bestScore = -1;
  for (const it of items.values()) {
    const top5 = [...it.spells.values()].filter((s) => TOP5.has(s.league));
    const natMatch = iso && it.ccs.has(iso);
    const score = top5.length * 10 + (natMatch ? 5 : 0) + (it.dob ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = { it, top5 }; }
  }
  if (!best || !best.it) return null;
  const { it, top5 } = best;
  const out = { wikidataId: it.id };
  if (it.dob) out.birthYear = Number(it.dob.slice(0, 4));
  if (top5.length) {
    const starts = top5.map((s) => seasonOfStart(s.start)).filter((n) => n != null);
    const ends = top5.map((s) => (s.end ? seasonOfEnd(s.end) : 2026)); // open spell → current
    if (starts.length) out.firstSeason = Math.min(...starts);
    if (ends.length) out.lastSeason = Math.max(...ends);
  }
  return out;
}

async function main() {
  const players = parseCsvByHeader(readFileSync(CSV, "utf8"));
  const byName = new Map();
  for (const p of players) { if (!byName.has(p.name)) byName.set(p.name, []); byName.get(p.name).push(p); }

  let names = [...byName.keys()];
  if (ONLY) names = names.filter((n) => ONLY.includes(n));
  if (LIMIT) names = names.slice(0, LIMIT);

  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const todo = names.filter((n) => !(n in cache));
  console.log(`${byName.size} identities · ${names.length} in scope · ${todo.length} to query (rest cached)`);

  let done = 0;
  for (const name of todo) {
    const iso = flagToIso(byName.get(name)[0].nation);
    try {
      const rows = await sparql(queryFor(name));
      cache[name] = resolve(rows, iso); // may be null (no footballer match)
    } catch (e) {
      console.log(`  ! ${name}: ${e.message} (left uncached for retry)`);
    }
    if (++done % 25 === 0) {
      writeFileSync(CACHE, JSON.stringify(cache, null, 0));
      console.log(`  …${done}/${todo.length} queried`);
    }
    await sleep(140);
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 0));

  // Apply cache → CSV (every card of an identity gets the identity's values).
  let matched = 0, withDob = 0, withWindow = 0;
  for (const [name, rows] of byName) {
    const hit = cache[name];
    if (!hit) continue;
    matched++;
    for (const p of rows) {
      if (hit.wikidataId) p.wikidataId = hit.wikidataId;
      if (hit.birthYear != null) p.birthYear = hit.birthYear;
      if (hit.firstSeason != null) p.firstSeason = hit.firstSeason;
      if (hit.lastSeason != null) p.lastSeason = hit.lastSeason;
    }
    if (hit.birthYear != null) withDob++;
    if (hit.firstSeason != null) withWindow++;
  }

  const total = byName.size;
  console.log(`\nMatched ${matched}/${total} identities (${(100 * matched / total).toFixed(0)}%)` +
    ` · birthYear ${withDob} · window ${withWindow}`);

  if (!NO_WRITE) {
    writeFileSync(CSV, toCsv(players));
    console.log("Wrote src/data/players.source.csv — run `npm run data:build` next.");
  } else {
    console.log("(--no-write) CSV untouched.");
  }
}

if (!existsSync(new URL(".", CACHE))) mkdirSync(new URL(".", CACHE), { recursive: true });
main();

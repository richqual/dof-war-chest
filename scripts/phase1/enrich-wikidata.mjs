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
// --refill reprocesses names that are still unmatched (cache null/missing),
// using the diacritic-tolerant search fallback — so "César" matches "Cesar".
const REFILL = args.includes("--refill");
// --fresh ignores the cache and re-queries every name (use after a change to the
// matching/ranking, e.g. adding club-based disambiguation).
const FRESH = args.includes("--fresh");

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

// Parse a card's legacy `years` spell ("2000–2006", "2018–") at face value, the
// same convention season.js uses. Returns { from, to } or null.
function parseCardYears(years) {
  const m = String(years || "").trim().match(/^(\d{4})\s*[–-]\s*(\d{2,4})?$/);
  if (!m) return null;
  const from = Number(m[1]);
  if (m[2] === undefined) return { from, to: 2026 };
  let to = Number(m[2]);
  if (m[2].length === 2) { to = Math.floor(from / 100) * 100 + to; if (to < from) to += 100; }
  return { from, to };
}
const overlaps = (a, b) => a && b && a.from <= b.to && b.from <= a.to;

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
  return `SELECT ?item ?dob ?cc ?team ?teamLabel ?start ?end ?league WHERE {
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
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 400`;
}

// Detail query for a set of candidate Q-IDs (used by the search fallback).
function queryForQids(qids) {
  const values = qids.map((q) => `wd:${q}`).join(" ");
  return `SELECT ?item ?dob ?cc ?team ?teamLabel ?start ?end ?league WHERE {
  VALUES ?item { ${values} }
  ?item wdt:P106 wd:Q937857 .
  OPTIONAL { ?item wdt:P569 ?dob. }
  OPTIONAL { ?item wdt:P27 ?country. OPTIONAL { ?country wdt:P297 ?cc. } }
  OPTIONAL {
    ?item p:P54 ?st. ?st ps:P54 ?team.
    OPTIONAL { ?st pq:P580 ?start. }
    OPTIONAL { ?st pq:P582 ?end. }
    OPTIONAL { ?team wdt:P118 ?league. }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 400`;
}

// Club-name matching to disambiguate same-name players. The card's short club
// ("Betis", "Inter", "Man Utd") is matched against a Wikidata team label ("Real
// Betis Balompié", "Inter Milan", "Manchester United F.C.") by a shared
// DISTINCTIVE token, with a substring allowance for long tokens (so "man" ⊂
// "manchester", "inter" ⊂ "internazionale"). Pure filler ("FC", "CF", city/type
// words) is dropped; generic club words ("Real", "Atlético"…) are kept but can't
// confirm a match on their own (so "Real Madrid" ≠ "Real Sociedad").
const CLUB_FILLER = new Set([
  "fc", "cf", "afc", "sc", "ac", "cd", "rc", "ud", "us", "as", "ssc", "ssd", "asd", "bc",
  "club", "de", "the", "futbol", "football", "calcio", "balompie", "association",
  "city", "united", "town", "county", "albion",
]);
const CLUB_GENERIC = new Set([
  "real", "atletico", "athletic", "sporting", "racing", "deportivo", "nacional",
  "union", "olympique", "borussia", "dynamo", "lokomotiv", "spartak",
]);
function clubTokens(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((t) => t.length >= 3 && !CLUB_FILLER.has(t));
}
function clubsMatch(cardClub, teamLabel) {
  const a = clubTokens(cardClub), b = clubTokens(teamLabel);
  for (const ta of a) {
    if (CLUB_GENERIC.has(ta)) continue; // a generic word alone can't confirm it
    for (const tb of b) {
      if (ta === tb || (ta.length >= 4 && tb.includes(ta)) || (tb.length >= 4 && ta.includes(tb))) return true;
    }
  }
  return false;
}

// Did any returned spell match a card's club AND line up with its years? If so the
// right person is already in the candidate set and the extra lookup can be skipped.
// (Mere club presence isn't enough — a wrong namesake may have played the club in a
// different era, which is exactly the case the club anchor needs to resolve.)
function anyOverlapHit(rows, cards) {
  return rows.some((r) => {
    if (!r.teamLabel?.value) return false;
    const sw = { from: seasonOfStart(r.start?.value) ?? -Infinity, to: r.end?.value ? seasonOfEnd(r.end.value) : 2026 };
    return cards.some((c) => clubsMatch(c.club, r.teamLabel.value) && overlaps(parseCardYears(c.years), sw));
  });
}

// Name + club lookup (fast): everyone who played for a specific team (Q-ID) whose
// label contains the card name. Bounded by that club's players, so the CONTAINS
// is cheap. Catches mononym / short-name cards ("Joaquín" → "Joaquín Sánchez",
// "Vicente" → "Vicente Rodríguez") that an exact-label match misses, anchored by
// the club so it picks the RIGHT namesake.
function queryTeamPlayers(teamQid, name) {
  return `SELECT ?item ?dob ?cc ?team ?teamLabel ?start ?end ?league WHERE {
  ?item wdt:P54 wd:${teamQid} ; wdt:P106 wd:Q937857 ; rdfs:label ?lbl .
  FILTER(LANG(?lbl) = "en" && CONTAINS(LCASE(STR(?lbl)), LCASE("${esc(name)}")))
  OPTIONAL { ?item wdt:P569 ?dob. }
  OPTIONAL { ?item wdt:P27 ?country. OPTIONAL { ?country wdt:P297 ?cc. } }
  OPTIONAL {
    ?item p:P54 ?st. ?st ps:P54 ?team.
    OPTIONAL { ?st pq:P580 ?start. }
    OPTIONAL { ?st pq:P582 ?end. }
    OPTIONAL { ?team wdt:P118 ?league. }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 400`;
}

// Resolve a club name to its Wikidata Q-ID via the search API (fast, fuzzy).
// Prefers a result whose description reads like a football club, so "Valencia"
// resolves to Valencia CF, not the city.
async function searchClubQid(clubName, tries = 3) {
  // Append "football club" so a bare city name ("Valencia") resolves to the club,
  // not the city — the search is fuzzy, so it's harmless for specific names.
  const url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json" +
    "&language=en&uselang=en&type=item&limit=7&search=" + encodeURIComponent(clubName + " football club");
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const hits = (await res.json()).search || [];
        const isClub = (d) => /football|soccer|\bclub\b|\bf\.?c\.?\b|sports team/i.test(d || "");
        return (hits.find((h) => isClub(h.description)) || hits[0])?.id || null;
      }
      if (res.status === 429 || res.status >= 500) { await sleep(1200 * (t + 1)); continue; }
      return null;
    } catch { if (t === tries - 1) return null; await sleep(1000 * (t + 1)); }
  }
  return null;
}

// Card names sometimes carry a disambiguation suffix ("Ronaldo (R9)") that no
// Wikidata label has — strip parentheticals before matching.
const cleanName = (name) => String(name).replace(/\s*\([^)]*\)\s*/g, " ").trim();

// Diacritic-tolerant candidate lookup via the Wikidata search API (wbsearchentities
// folds accents, so "Cesar Azpilicueta" finds "César Azpilicueta"). Returns up to
// 5 Q-IDs to feed queryForQids; the usual ranking then picks the real footballer.
async function searchCandidates(name, tries = 3) {
  const url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json" +
    "&language=en&uselang=en&type=item&limit=5&search=" + encodeURIComponent(name);
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) return ((await res.json()).search || []).map((r) => r.id);
      if (res.status === 429 || res.status >= 500) { await sleep(1200 * (t + 1)); continue; }
      return [];
    } catch { if (t === tries - 1) return []; await sleep(1000 * (t + 1)); }
  }
  return [];
}

// Resolve one identity: exact English label first; if that didn't turn up a
// candidate who played at the card's club, try the name+club lookup (fixes
// mononym cards); still nothing, fall back to fuzzy search. Candidate rows are
// pooled so the ranking (club-weighted) picks the right namesake.
async function enrichOne(name, iso, cards) {
  const clean = cleanName(name);
  const clubs = [...new Set(cards.map((c) => c.club))];
  let rows = await sparql(queryFor(clean));
  // No candidate whose club spell lines up with a card? Anchor on the club(s):
  // resolve each to a team Q-ID and pull that team's players whose name matches.
  if (clubs.length && !anyOverlapHit(rows, cards)) {
    for (const club of clubs.slice(0, 2)) {
      const teamQid = await searchClubQid(club);
      if (teamQid) { await sleep(120); rows = rows.concat(await sparql(queryTeamPlayers(teamQid, clean))); }
      if (anyOverlapHit(rows, cards)) break;
    }
  }
  if (!rows.some((r) => r.item)) {
    const qids = await searchCandidates(clean);
    if (qids.length) { await sleep(120); rows = rows.concat(await sparql(queryForQids(qids))); }
  }
  return resolve(rows, iso, cards);
}

// Turn the flat result rows for one name into candidate identities, then pick the
// best by: spell OVERLAP (a club spell whose dates line up with the card's) >
// CLUB match (the card's club is somewhere in the candidate's career) > top-5
// football > nationality > has a birth date. Overlap + club tell two same-named
// players apart — the overlap check also separates two namesakes at the same club
// (e.g. two Joaquíns at Betis in different eras).
function resolve(rows, iso, cards = []) {
  const clubWins = cards.map((c) => ({ club: c.club, win: parseCardYears(c.years) }));
  const clubs = [...new Set(cards.map((c) => c.club))];
  // The full span the card spells cover — a correct identity must be a plausible
  // playing age across it (so a 1999-born can't own a card spanning 2000).
  const spanFrom = Math.min(...clubWins.map((c) => c.win?.from ?? Infinity));
  const spanTo = Math.max(...clubWins.map((c) => c.win?.to ?? -Infinity));
  const implausible = (birthYear) =>
    Number.isFinite(spanFrom) && (spanFrom - birthYear < 14 || spanTo - birthYear > 50);
  const items = new Map();
  for (const r of rows) {
    const id = qid(r.item?.value);
    if (!id) continue;
    if (!items.has(id)) items.set(id, { id, dob: null, ccs: new Set(), spells: new Map(), teamLabels: new Set() });
    const it = items.get(id);
    if (r.dob?.value && !it.dob) it.dob = r.dob.value;
    if (r.cc?.value) it.ccs.add(r.cc.value);
    if (r.team?.value) {
      const key = r.team.value + "|" + (r.start?.value || "") + "|" + (r.end?.value || "");
      it.spells.set(key, {
        label: r.teamLabel?.value || null, league: qid(r.league?.value),
        start: r.start?.value || null, end: r.end?.value || null,
      });
      if (r.teamLabel?.value) it.teamLabels.add(r.teamLabel.value);
    }
  }
  let best = null, bestScore = -1;
  for (const it of items.values()) {
    const spells = [...it.spells.values()];
    const top5 = spells.filter((s) => TOP5.has(s.league));
    const natMatch = iso && it.ccs.has(iso);
    const labels = [...it.teamLabels];
    // How many card clubs appear anywhere in this candidate's career…
    const clubHits = clubs.filter((c) => labels.some((l) => clubsMatch(c, l))).length;
    // …and how many of those also overlap the card's years at that club (strongest).
    const overlapHits = clubWins.filter(({ club, win }) =>
      spells.some((s) => s.label && clubsMatch(club, s.label) &&
        overlaps(win, { from: seasonOfStart(s.start) ?? -Infinity, to: s.end ? seasonOfEnd(s.end) : 2026 }))
    ).length;
    // Disqualify a candidate whose birth year is an implausible age for the card
    // span — kills wrong-era namesakes (a GK born 1987 can't own a 2000 card).
    const penalty = it.dob && implausible(Number(it.dob.slice(0, 4))) ? 10000 : 0;
    const score = overlapHits * 50 + clubHits * 30 + top5.length * 10 + (natMatch ? 5 : 0) + (it.dob ? 1 : 0) - penalty;
    if (score > bestScore) { bestScore = score; best = { it, top5 }; }
  }
  if (!best || !best.it) return null;
  const { it, top5 } = best;
  // Even the best candidate's age is implausible for the card span → the match is
  // almost certainly the wrong person. Reject it (a blank age beats an absurd one).
  if (it.dob && implausible(Number(it.dob.slice(0, 4)))) return null;
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

  const cache = FRESH ? {} : (existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {});
  // Normal run: query names not yet in the cache. --refill: retry the ones still
  // unmatched (null). --fresh: re-query everything (e.g. after a ranking change).
  const todo = REFILL
    ? names.filter((n) => cache[n] == null)
    : names.filter((n) => !(n in cache));
  console.log(`${byName.size} identities · ${names.length} in scope · ${todo.length} to ${REFILL ? "refill" : "query"}${FRESH ? " (fresh)" : " (rest cached)"}`);

  let done = 0;
  for (const name of todo) {
    const cards = byName.get(name);
    const iso = flagToIso(cards[0].nation);
    try {
      cache[name] = await enrichOne(name, iso, cards); // may be null (no footballer match)
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

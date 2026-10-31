// A short 3-letter club code (HAR, BAR, QUA…) for tight spaces — narrow-screen
// draw-board rows, the match-sim scoreboard, anywhere a full club name won't
// fit. Club names are a curated list rather than composed from parts, but they
// all follow one of two shapes:
//   • English:      "{Place} United/City/Rovers/…"   → core is the FIRST word
//   • Continental:  "{AC/FC/Virtus/Deportivo/…} {Place}" → core is after the prefix
// So the rule is: drop the generic club-type words, then take the first three
// letters of the distinctive word (accents stripped). That yields exactly the
// codes you'd expect — Harchester United → HAR, Virtus Bardolino → BAR.

// Generic club-type words to drop, across the languages the name pools use.
// Both prefixes (FC, AC, Virtus, Deportivo…) and suffixes (United, City…).
const GENERIC = new Set([
  "FC", "AFC", "AC", "AS", "SC", "CF", "CD", "UD", "SD", "SS", "US", "CA", "CP",
  "SV", "TSV", "VFB", "VFL", "RC", "RCD", "EC", "SE",
  "REAL", "ATLETICO", "ATHLETIC", "CALCIO", "UNIONE", "SPORTING", "VIRTUS",
  "DEPORTIVO", "RACING", "CLUB", "SPORTFREUNDE", "BORUSSIA", "OLYMPIQUE",
  "STADE", "UNITED", "UTD", "CITY", "TOWN", "ROVERS", "WANDERERS", "COUNTY",
  "ALBION", "SAN", "SANTA", "SAINT",
]);

const stripDiacritics = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// The distinctive words of a name, uppercased and accent-free: everything that
// isn't a generic club-type word or a bare number ("1." in "1. FC Steinhorst").
function coreWords(name) {
  const cleaned = stripDiacritics(name || "").replace(/[.\-'’]/g, " ");
  const words = cleaned.toUpperCase().split(/\s+/).filter(Boolean);
  const core = words.filter(w => !GENERIC.has(w) && !/^\d+$/.test(w));
  return core.length ? core : words; // all-generic (rare) → fall back to every word
}

// The 3-letter code for one club name, ignoring any other clubs.
export function clubCode(name) {
  const core = coreWords(name);
  const first = core[0] || "";
  let code = first.slice(0, 3);
  // Short distinctive word (e.g. "AS Roma" → "ROM" is fine, but a 2-letter core
  // needs topping up): borrow letters from the remaining core words.
  if (code.length < 3) code = core.join("").slice(0, 3);
  return code || stripDiacritics(name || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

// Codes for a set of clubs in one game, guaranteed distinct from each other.
// On a clash the later club keeps its first two letters and takes its next core
// letter that frees up a code (Coppermill → COP, Coppergate → COG), falling back
// to a trailing digit only if the word runs out of distinguishing letters.
export function clubCodes(names) {
  const used = new Set();
  return (names || []).map(name => {
    const base = clubCode(name);
    if (!used.has(base)) { used.add(base); return base; }
    const core = coreWords(name)[0] || base;
    const a = base[0] || "X", b = base[1] || "X";
    for (let i = 2; i < core.length; i++) {
      const cand = a + b + core[i];
      if (!used.has(cand)) { used.add(cand); return cand; }
    }
    for (let n = 2; n < 10; n++) {
      const cand = base.slice(0, 2) + n;
      if (!used.has(cand)) { used.add(cand); return cand; }
    }
    used.add(base); // give up — allow the duplicate rather than loop forever
    return base;
  });
}

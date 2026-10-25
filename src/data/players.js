// One card per player — their peak/most iconic spell.
// Values scale with rating. Attributes: pac/sho/pas/dri/def/phy stored per player.

// Strips diacritics so "Denilson" matches "Denílson", "Sane" matches "Sané", etc.
export function normalizeSearch(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// PLAYERS is built from the CSV master (src/data/players.source.csv) by
// scripts/phase0/build-players.mjs. Edit the CSV, then `npm run data:build`.
export { PLAYERS } from "./players.generated.js";

export const POSITIONS = [
  { key: "GK",  label: "Goalkeeper",   slot: 0  },
  { key: "RB",  label: "Right Back",   slot: 1  },
  { key: "LB",  label: "Left Back",    slot: 2  },
  { key: "CB",  label: "Centre Back",  slot: 3  },
  { key: "CB",  label: "Centre Back",  slot: 4  },
  { key: "DM",  label: "Def. Mid",     slot: 5  },
  { key: "CM",  label: "Midfielder",   slot: 6  },
  { key: "CM",  label: "Midfielder",   slot: 7  },
  { key: "RW",  label: "Right Winger", slot: 8  },
  { key: "LW",  label: "Left Winger",  slot: 9  },
  { key: "ST",  label: "Striker",      slot: 10 },
  { key: "GKSUB",  label: "Sub Goalkeeper", slot: 11 },
  { key: "DEFSUB", label: "Sub Defender",   slot: 12 },
  { key: "MIDSUB", label: "Sub Midfielder", slot: 13 },
  { key: "WIDSUB", label: "Sub Wide Mid",   slot: 14 },
  { key: "ATTSUB", label: "Sub Attacker",   slot: 15 },
];

export const SUB_POSITIONS = {
  DEFSUB: ["RB", "LB", "CB"],
  MIDSUB: ["DM", "CM", "CAM"],
  WIDSUB: ["RM", "LM", "RW", "LW"],
  ATTSUB: ["ST", "CAM"],
};

export const ERA_LABELS = { classic: "Classic 98-08", golden: "Golden 08-16", modern: "Modern 16-", legend: "Legend" };
export const ERA_COLORS = { classic: "#8B5E3C", golden: "#1A6B4A", modern: "#1A4580", legend: "#6B2D8B" };
export const ERA_BG    = { classic: "#F5E6D0", golden: "#D4EDE2", modern: "#D0E4F5", legend: "#F0D8FF" };

export function formatValue(v) {
  if (v === 0) return "FREE";
  if (v < 1) return `£${Math.round(v * 1000)}k`;
  return `£${v}m`;
}

export function getRatingColor(r) {
  if (r >= 93) return "#7c5f00";
  if (r >= 88) return "#155724";
  if (r >= 83) return "#856404";
  return "#555";
}

export function getRatingBg(r) {
  if (r >= 93) return "#ffe566";
  if (r >= 88) return "#c3e6cb";
  if (r >= 83) return "#fff3cd";
  return "#e0e0e0";
}

// 16 equal slots per difficulty — the wheel is the honest probability distribution.
// Mean budgets: generous ~£81m, easy ~£61m, normal ~£41m, hard ~£31m, brutal ~£17m.
export const DIFFICULTY_SLOTS = {
  generous: [0, 0, 25, 50, 50, 75, 75, 75, 75, 100, 100, 100, 125, 125, 150, 175],
  easy:     [0, 0, 25, 25, 25, 50, 50, 50, 50,  75,  75,  75, 100, 100, 125, 150],
  normal:   [0, 0,  0,  0, 25, 25, 25, 25, 50,  50,  50,  50,  50,  75, 100, 125],
  hard:     [0, 0,  0,  0,  0, 25, 25, 25, 25,  25,  50,  50,  50,  50,  75, 100],
  brutal:   [0, 0,  0,  0,  0,  0,  0,  0, 25,  25,  25,  25,  25,  25,  50,  75],
};

export const DIFFICULTY_LABELS = {
  generous: "Generous", easy: "Easy", normal: "Normal", hard: "Hard", brutal: "Brutal",
};

export function generateBudget(difficulty = "normal") {
  const slots = DIFFICULTY_SLOTS[difficulty] || DIFFICULTY_SLOTS.normal;
  return slots[Math.floor(Math.random() * slots.length)];
}

// War Chest mode: 5 mystery chest values per difficulty.
// In Brutal the zero chest is possible (1-in-5 chance) — the only difficulty where this occurs.
export const WAR_CHEST_VALUES = {
  generous: [1000, 750, 550, 400, 275],
  easy:     [ 520, 390, 275, 190, 125],
  normal:   [ 270, 205, 150, 105,  70],
  hard:     [ 160, 120,  85,  58,  35],
  brutal:   [  55,  35,  20,   8,   0],
};

// 5-a-side squad slots. Slots 3 & 4 are "any outfield" (no GK).
// posFilter is the allowed player positions for each slot.
export const WAR_CHEST_SLOTS = [
  { key: "GK",  label: "Goalkeeper",   posFilter: ["GK"] },
  { key: "DEF", label: "Defender",     posFilter: ["CB", "LB", "RB"] },
  { key: "MID", label: "Midfielder",   posFilter: ["DM", "CM", "CAM", "RM", "LM"] },
  { key: "ATT", label: "Midfield / Attack", posFilter: ["DM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST"] },
  { key: "ATT", label: "Midfield / Attack", posFilter: ["DM", "CM", "CAM", "RM", "LM", "RW", "LW", "ST"] },
];

export const RANDOM_MANAGER_NAMES = [
  // English
  "Ron Atherton","Terry Calloway","Dave Brackley","Steve Hollins",
  "Barry Quigley","Mick Stanhope","Graham Tindall","Les Farnworth",
  "Alan Dewhurst","Keith Mowbray","Roy Cattermole","Frank Ogden",
  "Brian McAllister","Eddie Threlfall","Norman Pickup","Vince Halloran",
  // Italian
  "Marco Tardioli","Sergio Valenti","Luca Ferretti","Enzo Mancino",
  "Roberto Sabbatini","Giacomo Peruzzi","Fabio Dellarocca","Antonio Rinaldi",
  // Spanish
  "Jorge Camacho","Luis Montero","Raúl Esperanza","Javier Castellano",
  "Carlos Andújar","Álvaro Medina","Fernando Belmonte","Ignacio Rueda",
  // German
  "Hans Brouwer","Sven Lindqvist","Dieter Harmann","Klaus Wengler",
  "Ralf Steinbach","Tobias Grunewald","Markus Berghoff","Jürgen Kolbe",
  // French
  "Claude Mercier","Didier Lavelle","Thierry Maubert","Patrice Lebrun",
  "Stéphane Girardot","Nicolas Fauveau","Laurent Chabrol","Julien Devereaux",
];

// CPU draft brain: usually takes the best player it can afford, sometimes a
// cheaper near-equal so it banks carryover and squads vary between games.
// Which player positions are suitable for each draft slot key.
// CPU will prefer these; falls back to any affordable player if none match.
const CPU_POS_SUITABILITY = {
  RB:  ["RB", "RM"],
  LB:  ["LB", "LM"],
  CB:  ["CB"],
  DM:  ["DM", "CM"],
  CM:  ["CM", "DM", "CAM", "AM"],
  RW:  ["RW", "RM", "LW"],
  LW:  ["LW", "LM", "RW"],
  ST:  ["ST", "LW", "RW"],
};

// Elite clubs offered in "Real Teams" mode — one entry per assignable real club.
// `club` must match a player card's `club` string exactly; `league` must match `p.league`.
// `primary`/`secondary`/`pattern` set the CPU's kit; `dof` is the assigned Director of
// Football (a club legend / historical figure); `playerAliases` are extra club strings
// used elsewhere in the data (e.g. Legends cards say "Bayern Munich" not "Bayern") so
// own-club matching catches them; `managerClubs` are substrings matched against a
// manager's `club` for auto-assigning a club manager.
// Kept to well-represented top-tier sides so an assigned CPU has plenty of own-club players.
export const REAL_TEAMS = [
  { club: "Man Utd",     name: "Manchester United",   league: "premier_league", primary: "#DA020E", secondary: "#FBE122", pattern: "plain",   dof: "John Henry Davies",    managerClubs: ["Manchester United"] },
  { club: "Arsenal",     name: "Arsenal",             league: "premier_league", primary: "#EF0107", secondary: "#FFFFFF", pattern: "plain",   dof: "Henry Norris" },
  { club: "Liverpool",   name: "Liverpool",           league: "premier_league", primary: "#C8102E", secondary: "#FFFFFF", pattern: "plain",   dof: "John Houlding" },
  { club: "Chelsea",     name: "Chelsea",             league: "premier_league", primary: "#034694", secondary: "#FFFFFF", pattern: "plain",   dof: "Roman Abramovich" },
  { club: "Man City",    name: "Manchester City",     league: "premier_league", primary: "#6CABDD", secondary: "#FFFFFF", pattern: "plain",   dof: "Joshua Parlby",        managerClubs: ["Manchester City"] },
  { club: "Real Madrid", name: "Real Madrid",         league: "la_liga",        primary: "#FEFEFE", secondary: "#00529F", pattern: "plain",   dof: "Santiago Bernabéu" },
  { club: "Barcelona",   name: "Barcelona",           league: "la_liga",        primary: "#A50044", secondary: "#004D98", pattern: "stripes", dof: "Joan Gamper" },
  { club: "Atlético",    name: "Atlético Madrid",     league: "la_liga",        primary: "#CE3524", secondary: "#FFFFFF", pattern: "stripes", dof: "Vicente Calderón" },
  { club: "Juventus",    name: "Juventus",            league: "serie_a",        primary: "#000000", secondary: "#FFFFFF", pattern: "stripes", dof: "Gianni Agnelli" },
  { club: "Inter",       name: "Inter Milan",         league: "serie_a",        primary: "#010E80", secondary: "#000000", pattern: "stripes", dof: "Giovanni Paramithiotti" },
  { club: "AC Milan",    name: "AC Milan",            league: "serie_a",        primary: "#FB090B", secondary: "#000000", pattern: "stripes", dof: "Silvio Berlusconi" },
  { club: "Bayern",      name: "Bayern Munich",       league: "bundesliga",     primary: "#DC052D", secondary: "#FFFFFF", pattern: "plain",   dof: "Franz John",           playerAliases: ["Bayern Munich"] },
  { club: "Dortmund",    name: "Borussia Dortmund",   league: "bundesliga",     primary: "#FDE100", secondary: "#000000", pattern: "plain",   dof: "Michael Zorc" },
  { club: "PSG",         name: "Paris Saint-Germain", league: "ligue_1",        primary: "#004170", secondary: "#DA291C", pattern: "plain",   dof: "Nasser Al-Khelaifi" },
];

const REAL_TEAM_BY_CLUB = Object.fromEntries(REAL_TEAMS.map(t => [t.club, t]));
const REAL_TEAM_LEAGUE = Object.fromEntries(REAL_TEAMS.map(t => [t.club, t.league]));

// All club strings (canonical + aliases) that count as "played for" a given real club.
export function realTeamPlayerClubs(realClub) {
  const t = REAL_TEAM_BY_CLUB[realClub];
  if (!t) return realClub ? [realClub] : [];
  return [t.club, ...(t.playerAliases || [])];
}

// True if a manager's `club` string belongs to the given real club.
export function managerMatchesRealClub(manager, realClub) {
  const t = REAL_TEAM_BY_CLUB[realClub];
  if (!t || !manager?.club) return false;
  const needles = t.managerClubs || [t.club];
  return needles.some(n => manager.club.includes(n));
}

// ── CPU pick variance ───────────────────────────────────────────────────────
// Every mode ranks its own shortlist by whatever it can "see" (market value in
// Classic, rating in Scout/War Chest) and then hands the best-first list here.
// This is what stops a CPU being a machine that always takes row 0: most of the
// time it takes one of the top few (weighted, so the best is still the odds-on
// favourite), and now and then it has a mood — a splurge on the headline name or
// a deliberate bargain hunt further down the list. Variance is uniform across
// difficulties by design: difficulty already sets the budget, and stacking a
// second knob on top made easy CPUs feel broken rather than beatable.
const CPU_SPLURGE_CHANCE = 0.10;  // take the top of the list outright
const CPU_BARGAIN_CHANCE = 0.12;  // hunt value further down instead
const CPU_TOP_N = 5;              // how deep the everyday weighted pick reaches
const CPU_BARGAIN_DEPTH = 9;      // how deep a bargain hunt will look

export function cpuVariancePick(sorted) {
  if (!sorted || sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];

  const roll = Math.random();
  if (roll < CPU_SPLURGE_CHANCE) return sorted[0];

  if (roll < CPU_SPLURGE_CHANCE + CPU_BARGAIN_CHANCE) {
    // Best rating per unit of value among a wider slice — a genuine steal rather
    // than just "something cheap", so a bargain mood doesn't wreck the squad.
    const pool = sorted.slice(0, Math.min(CPU_BARGAIN_DEPTH, sorted.length));
    return pool.reduce((best, p) =>
      (p.rating / Math.max(p.value, 1)) > (best.rating / Math.max(best.value, 1)) ? p : best
    );
  }

  // Weighted pick over the top N: weight decays with rank, so the shortlist
  // leader still wins most of the time but the chasing pack is live.
  const pool = sorted.slice(0, Math.min(CPU_TOP_N, sorted.length));
  const weights = pool.map((_, i) => 1 / Math.pow(i + 1, 1.6));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    t -= weights[i];
    if (t <= 0) return pool[i];
  }
  return pool[0];
}

// realClub: when set (Real Teams mode), the CPU favours players from that club, then
// players from OTHER leagues (avoiding same-league rivals), before normal preferences.
export function chooseCpuPick(candidates, budget, posKey, realClub = null) {
  let affordable = candidates.filter(p => p.value <= budget);
  if (affordable.length === 0) return null;

  // Narrow to position-suitable players when a slot key is provided.
  if (posKey && CPU_POS_SUITABILITY[posKey]) {
    const suitable = affordable.filter(
      p => CPU_POS_SUITABILITY[posKey].includes(p.pos) ||
           (p.pos2 && CPU_POS_SUITABILITY[posKey].includes(p.pos2))
    );
    if (suitable.length > 0) affordable = suitable;
  }

  // Real Teams preference: (1) own-club players, else (2) players outside the club's
  // league so a CPU never poaches a same-league rival. Falls through to normal behaviour
  // if neither tier has candidates for this slot, so a turn is never wasted.
  if (realClub) {
    const ownClubs = realTeamPlayerClubs(realClub);
    const ownClub = affordable.filter(p => ownClubs.includes(p.club));
    if (ownClub.length > 0) {
      affordable = ownClub;
    } else {
      const league = REAL_TEAM_LEAGUE[realClub];
      const outsideLeague = affordable.filter(p => p.league !== league);
      if (outsideLeague.length > 0) affordable = outsideLeague;
    }
  }

  // CPU acts on value (perceived market reputation), not actual ratings it can't see.
  // Since values are randomised per game, this naturally creates squad variety.
  const sorted = [...affordable].sort((a, b) => b.value - a.value || b.rating - a.rating);
  return cpuVariancePick(sorted);
}

export const RANDOM_CLUB_NAMES = [
  // English
  "Northgate United","Ironbridge FC","Crestfield Athletic","Ashdown Rovers",
  "Riverdale City","Stonewick Town","Brentmoor Wanderers","Coppermill FC",
  "Ashworth United","Blackwell City","Greystone Athletic","Hartfield Rovers",
  "Millbrook Town","Oakdale United","Pennfield Athletic","Ravenwood City",
  "Silverdale FC","Thornbury United","Westbrook Athletic","Dunmore Rovers",
  "Belston City","Cranfield United","Holmewood Athletic","Fernside Rovers",
  "Westgate United","Oakmoor City","Ironhaven United","Coppergate City",
  "Mossfield Athletic","Alderton FC",
  // Italian
  "AC Ferrovia","Unione Calcio Valdese","Sporting Lacovara","FC Montebruno",
  "Atletico Rivara","Calcio Serravalle","AS Pompeiana","Virtus Bardolino",
  // Spanish
  "CD Montealto","UD Valcampo","Atlético Serranillos","CF Peñalara",
  "Racing Club Benicarló","Deportivo Morales","SD Galapagos","FC Entreríos",
  // German
  "FC Braunfelde","SV Niederwald","TSV Kaltenberg","Sportfreunde Grenzbach",
  "1. FC Steinhorst","Borussia Langenmoor","VfB Haselbach","FC Fichtenau",
  // French
  "FC Valdombre","AS Rochebrune","Olympique Pierrevert","SC Hautecombe",
  "Stade Lavaudieu","RC Bellerive","FC Montmorency","AS Châteauvert",
];

// Easter egg CPU identities — fictional clubs from film, TV & fiction.
// Picked ~25% of the time when a full CPU identity is generated.
export const EASTER_EGG_TEAMS = [
  { clubName: "Harchester United",   dofName: "Karl Fletcher",    primary: "#6a0dad", secondary: "#ffffff", pattern: "plain"   },
  { clubName: "Leddersford Town",    dofName: "Steve Barnes",     primary: "#003087", secondary: "#ffffff", pattern: "stripes" },
  { clubName: "Wirral County",       dofName: "Mike Bassett",     primary: "#c8102e", secondary: "#ffffff", pattern: "stripes" },
  { clubName: "Melchester Rovers",   dofName: "Roy Race",         primary: "#c8102e", secondary: "#ffd700", pattern: "hoops"   },
  { clubName: "Allies PoW",          dofName: "Sly Stallone",     primary: "#c8102e", secondary: "#003087", pattern: "stripes" },
  { clubName: "Longmarsh Prisoners", dofName: "Danny Meehan",     primary: "#111827", secondary: "#9ca3af", pattern: "plain"   },
  { clubName: "Renford Rejects",     dofName: "Jason Summerbee",  primary: "#1a1a6e", secondary: "#6a0dad", pattern: "stripes" },
  { clubName: "Hounslow Harriers",   dofName: "Juliette Paxton",  primary: "#ffffff", secondary: "#c8102e", pattern: "plain"   },
  { clubName: "Real San Tadeo",      dofName: "Santiago Muñez",   primary: "#111827", secondary: "#ffffff", pattern: "stripes" },
];

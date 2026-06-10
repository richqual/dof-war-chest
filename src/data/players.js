// One card per player — their peak/most iconic PL spell.
// Values normalised by rating (era-neutral). Same rating = same price bracket.
// Edit any value directly — open src/data/players.js in your editor.
// Scale: 96→190, 95→155, 94→125, 93→100, 92→80, 91→63, 90→49,
//        89→38, 88→29, 87→22, 86→16, 85→11, 84→7, 83→4, 82→2, ≤81→0

export const PLAYERS = [
  // ── GOALKEEPERS ──────────────────────────────────────────────────────
  { id: 1,  name: "Peter Schmeichel",   club: "Man Utd",        years: "1991–99", pos: "GK", rating: 95, value: 136, nation: "🇩🇰", era: "classic" },
  { id: 2,  name: "Edwin van der Sar",  club: "Man Utd",        years: "2005–11", pos: "GK", rating: 91, value: 53,  nation: "🇳🇱", era: "classic" },
  { id: 3,  name: "Pepe Reina",         club: "Liverpool",      years: "2005–14", pos: "GK", rating: 88, value: 26,  nation: "🇪🇸", era: "golden"  },
  { id: 4,  name: "David James",        club: "Man City",       years: "2004–06", pos: "GK", rating: 83, value: 4,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 5,  name: "Joe Hart",           club: "Man City",       years: "2009–16", pos: "GK", rating: 87, value: 20,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 6,  name: "Shay Given",         club: "Newcastle",      years: "1997–09", pos: "GK", rating: 86, value: 14,  nation: "🇮🇪", era: "classic" },
  { id: 7,  name: "Mark Schwarzer",     club: "Fulham",         years: "1999–13", pos: "GK", rating: 84, value: 7,   nation: "🇦🇺", era: "classic" },
  { id: 8,  name: "Brad Friedel",       club: "Blackburn",      years: "2000–08", pos: "GK", rating: 85, value: 10,  nation: "🇺🇸", era: "classic" },
  { id: 9,  name: "Nigel Martyn",       club: "Leeds",          years: "1996–03", pos: "GK", rating: 84, value: 7,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 10, name: "Hugo Lloris",        club: "Spurs",          years: "2012–23", pos: "GK", rating: 90, value: 41,  nation: "🇫🇷", era: "golden"  },
  { id: 11, name: "David de Gea",       club: "Man Utd",        years: "2011–23", pos: "GK", rating: 91, value: 53,  nation: "🇪🇸", era: "golden"  },
  { id: 12, name: "Alisson Becker",     club: "Liverpool",      years: "2018–",   pos: "GK", rating: 93, value: 85,  nation: "🇧🇷", era: "modern"  },
  { id: 13, name: "Ederson",            club: "Man City",       years: "2017–",   pos: "GK", rating: 92, value: 66,  nation: "🇧🇷", era: "modern"  },
  { id: 14, name: "Nick Pope",          club: "Newcastle",      years: "2022–",   pos: "GK", rating: 86, value: 14,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 15, name: "Jordan Pickford",    club: "Everton",        years: "2017–",   pos: "GK", rating: 85, value: 10,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 16, name: "Kasper Schmeichel",  club: "Leicester",      years: "2011–22", pos: "GK", rating: 87, value: 20,  nation: "🇩🇰", era: "golden"  },
  { id: 17, name: "Tim Howard",         club: "Everton",        years: "2006–16", pos: "GK", rating: 86, value: 14,  nation: "🇺🇸", era: "golden"  },
  { id: 18, name: "Jens Lehmann",       club: "Arsenal",        years: "2003–08", pos: "GK", rating: 87, value: 20,  nation: "🇩🇪", era: "classic" },
  { id: 19, name: "Carlo Cudicini",     club: "Chelsea",        years: "1999–09", pos: "GK", rating: 83, value: 4,   nation: "🇮🇹", era: "classic" },
  { id: 20, name: "Rui Patrício",       club: "Wolves",         years: "2018–21", pos: "GK", rating: 86, value: 14,  nation: "🇵🇹", era: "modern"  },
  { id: 21, name: "Lukasz Fabianski",   club: "West Ham",       years: "2014–",   pos: "GK", rating: 83, value: 4,   nation: "🇵🇱", era: "modern"  },
  { id: 22, name: "Ben Foster",         club: "Watford",        years: "2018–21", pos: "GK", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 23, name: "Wayne Hennessey",    club: "Crystal Palace", years: "2014–22", pos: "GK", rating: 79, value: 0,   nation: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", era: "golden"  },
  { id: 24, name: "Scott Carson",       club: "Derby",          years: "2008–15", pos: "GK", rating: 78, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 25, name: "Chris Kirkland",     club: "Wigan",          years: "2006–13", pos: "GK", rating: 79, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 26, name: "Manuel Almunia",     club: "Arsenal",        years: "2004–11", pos: "GK", rating: 80, value: 0,   nation: "🇪🇸", era: "classic" },
  { id: 27, name: "Robert Green",       club: "West Ham",       years: "2006–12", pos: "GK", rating: 80, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },

  // ── RIGHT BACKS ──────────────────────────────────────────────────────
  { id: 100, name: "Gary Neville",           club: "Man Utd",   years: "1992–11", pos: "RB", rating: 88, value: 30,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 101, name: "Pablo Zabaleta",         club: "Man City",  years: "2008–17", pos: "RB", rating: 86, value: 18,  nation: "🇦🇷", era: "golden"  },
  { id: 102, name: "Bacary Sagna",           club: "Arsenal",   years: "2007–14", pos: "RB", rating: 86, value: 18,  nation: "🇫🇷", era: "golden"  },
  { id: 103, name: "Glen Johnson",           club: "Liverpool", years: "2009–15", pos: "RB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 104, name: "Trent Alexander-Arnold", club: "Liverpool", years: "2017–",   pos: "RB", rating: 93, value: 95,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 105, name: "Kyle Walker",            club: "Man City",  years: "2017–",   pos: "RB", rating: 88, value: 30,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 106, name: "Kieran Trippier",        club: "Spurs",     years: "2015–19", pos: "RB", rating: 86, value: 18,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 107, name: "Cesar Azpilicueta",      club: "Chelsea",   years: "2012–23", pos: "RB", rating: 87, value: 23,  nation: "🇪🇸", era: "golden"  },
  { id: 108, name: "Phil Neville",           club: "Man Utd",   years: "1995–05", pos: "RB", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 109, name: "Wes Brown",              club: "Man Utd",   years: "1998–11", pos: "RB", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 110, name: "Stephen Carr",           club: "Spurs",     years: "1993–04", pos: "RB", rating: 83, value: 5,   nation: "🇮🇪", era: "classic" },
  { id: 111, name: "Micah Richards",         club: "Man City",  years: "2005–15", pos: "RB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 112, name: "Nathaniel Clyne",        club: "Liverpool", years: "2015–19", pos: "RB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 113, name: "Seamus Coleman",         club: "Everton",   years: "2009–",   pos: "RB", rating: 84, value: 8,   nation: "🇮🇪", era: "golden"  },
  { id: 114, name: "Aaron Wan-Bissaka",      club: "Man Utd",   years: "2019–23", pos: "RB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 115, name: "Matt Doherty",           club: "Wolves",    years: "2010–20", pos: "RB", rating: 83, value: 5,   nation: "🇮🇪", era: "modern"  },
  { id: 116, name: "Serge Aurier",           club: "Spurs",     years: "2017–21", pos: "RB", rating: 82, value: 3,   nation: "🇨🇮", era: "modern"  },
  { id: 117, name: "Gary Kelly",             club: "Leeds",     years: "1991–07", pos: "RB", rating: 82, value: 3,   nation: "🇮🇪", era: "classic" },
  { id: 118, name: "Alan Hutton",            club: "Spurs",     years: "2008–11", pos: "RB", rating: 79, value: 0,   nation: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", era: "golden"  },

  // ── LEFT BACKS ───────────────────────────────────────────────────────
  { id: 200, name: "Ashley Cole",         club: "Arsenal",        years: "1999–06", pos: "LB", rating: 93, value: 95,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 201, name: "Denis Irwin",         club: "Man Utd",        years: "1990–02", pos: "LB", rating: 88, value: 30,  nation: "🇮🇪", era: "classic" },
  { id: 202, name: "Patrice Evra",        club: "Man Utd",        years: "2006–14", pos: "LB", rating: 91, value: 63,  nation: "🇫🇷", era: "golden"  },
  { id: 203, name: "Andrew Robertson",    club: "Liverpool",      years: "2017–",   pos: "LB", rating: 91, value: 62,  nation: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", era: "modern"  },
  { id: 204, name: "Leighton Baines",     club: "Everton",        years: "2007–20", pos: "LB", rating: 86, value: 18,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 205, name: "Wayne Bridge",        club: "Chelsea",        years: "2003–09", pos: "LB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 206, name: "Gael Clichy",         club: "Arsenal",        years: "2003–11", pos: "LB", rating: 85, value: 11,  nation: "🇫🇷", era: "golden"  },
  { id: 207, name: "John Arne Riise",     club: "Liverpool",      years: "2001–08", pos: "LB", rating: 85, value: 11,  nation: "🇳🇴", era: "classic" },
  { id: 208, name: "Danny Rose",          club: "Spurs",          years: "2012–20", pos: "LB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 209, name: "Graeme Le Saux",      club: "Chelsea",        years: "1997–03", pos: "LB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 210, name: "Nigel Winterburn",    club: "Arsenal",        years: "1987–00", pos: "LB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 211, name: "Oleksandr Zinchenko", club: "Arsenal",        years: "2022–",   pos: "LB", rating: 86, value: 18,  nation: "🇺🇦", era: "modern"  },
  { id: 212, name: "Marcos Alonso",       club: "Chelsea",        years: "2016–22", pos: "LB", rating: 83, value: 5,   nation: "🇪🇸", era: "modern"  },
  { id: 213, name: "Luke Shaw",           club: "Man Utd",        years: "2018–23", pos: "LB", rating: 85, value: 11,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 214, name: "Ryan Bertrand",       club: "Southampton",    years: "2014–21", pos: "LB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 215, name: "Stuart Pearce",       club: "Man City",       years: "2001–02", pos: "LB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 216, name: "Ian Harte",           club: "Leeds",          years: "1995–04", pos: "LB", rating: 83, value: 5,   nation: "🇮🇪", era: "classic" },
  { id: 217, name: "Silvinho",            club: "Arsenal",        years: "1999–01", pos: "LB", rating: 83, value: 5,   nation: "🇧🇷", era: "classic" },
  { id: 218, name: "Ben Davies",          club: "Spurs",          years: "2014–",   pos: "LB", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", era: "modern"  },
  { id: 219, name: "Patrick van Aanholt", club: "Crystal Palace", years: "2017–21", pos: "LB", rating: 81, value: 1,   nation: "🇳🇱", era: "modern"  },
  { id: 220, name: "Fabian Delph",        club: "Man City",       years: "2015–19", pos: "LB", rating: 81, value: 1,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 221, name: "Benjamin Mendy",      club: "Man City",       years: "2017–21", pos: "LB", rating: 86, value: 18,  nation: "🇫🇷", era: "modern"  },
  { id: 222, name: "Nuno Tavares",        club: "Arsenal",        years: "2021–22", pos: "LB", rating: 79, value: 0,   nation: "🇵🇹", era: "modern"  },

  // ── CENTRE BACKS ─────────────────────────────────────────────────────
  { id: 300, name: "John Terry",          club: "Chelsea",        years: "1998–17", pos: "CB", rating: 94, value: 115, nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 301, name: "Rio Ferdinand",       club: "Man Utd",        years: "2002–14", pos: "CB", rating: 93, value: 90,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 302, name: "Virgil van Dijk",     club: "Liverpool",      years: "2018–",   pos: "CB", rating: 95, value: 144, nation: "🇳🇱", era: "modern"  },
  { id: 303, name: "Tony Adams",          club: "Arsenal",        years: "1983–02", pos: "CB", rating: 90, value: 43,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 304, name: "Martin Keown",        club: "Arsenal",        years: "1993–04", pos: "CB", rating: 86, value: 15,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 305, name: "Ruben Dias",          club: "Man City",       years: "2020–",   pos: "CB", rating: 93, value: 90,  nation: "🇵🇹", era: "modern"  },
  { id: 306, name: "Sol Campbell",        club: "Arsenal",        years: "2001–06", pos: "CB", rating: 90, value: 43,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 307, name: "Jamie Carragher",     club: "Liverpool",      years: "1996–13", pos: "CB", rating: 88, value: 27,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 308, name: "Sami Hyypiä",         club: "Liverpool",      years: "1999–09", pos: "CB", rating: 87, value: 21,  nation: "🇫🇮", era: "classic" },
  { id: 309, name: "Nemanja Vidic",       club: "Man Utd",        years: "2006–14", pos: "CB", rating: 92, value: 70,  nation: "🇷🇸", era: "golden"  },
  { id: 310, name: "Gary Pallister",      club: "Man Utd",        years: "1989–01", pos: "CB", rating: 88, value: 27,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 311, name: "Steve Bruce",         club: "Man Utd",        years: "1987–96", pos: "CB", rating: 87, value: 21,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 312, name: "Ledley King",         club: "Spurs",          years: "1998–12", pos: "CB", rating: 88, value: 27,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 313, name: "William Gallas",      club: "Chelsea",        years: "2001–06", pos: "CB", rating: 86, value: 15,  nation: "🇫🇷", era: "classic" },
  { id: 314, name: "Jonathan Woodgate",   club: "Leeds",          years: "1997–03", pos: "CB", rating: 85, value: 11,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 315, name: "Laurent Blanc",       club: "Man Utd",        years: "2001–03", pos: "CB", rating: 85, value: 11,  nation: "🇫🇷", era: "classic" },
  { id: 316, name: "Michael Dawson",      club: "Spurs",          years: "2004–14", pos: "CB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 317, name: "Joleon Lescott",      club: "Man City",       years: "2009–14", pos: "CB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 318, name: "Harry Maguire",       club: "Man Utd",        years: "2019–",   pos: "CB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 319, name: "Aymeric Laporte",     club: "Man City",       years: "2018–23", pos: "CB", rating: 87, value: 21,  nation: "🇪🇸", era: "modern"  },
  { id: 320, name: "Toby Alderweireld",   club: "Spurs",          years: "2015–19", pos: "CB", rating: 87, value: 21,  nation: "🇧🇪", era: "golden"  },
  { id: 321, name: "Gary Cahill",         club: "Chelsea",        years: "2012–19", pos: "CB", rating: 85, value: 11,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 322, name: "Chris Smalling",      club: "Man Utd",        years: "2010–19", pos: "CB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 323, name: "Marc Guehi",          club: "Crystal Palace", years: "2021–",   pos: "CB", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 324, name: "Nathan Aké",          club: "Man City",       years: "2020–",   pos: "CB", rating: 85, value: 11,  nation: "🇳🇱", era: "modern"  },
  { id: 325, name: "Ben White",           club: "Arsenal",        years: "2021–",   pos: "CB", rating: 85, value: 11,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 326, name: "Fikayo Tomori",       club: "Chelsea",        years: "2019–21", pos: "CB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 327, name: "Jonny Evans",         club: "Man Utd",        years: "2007–15", pos: "CB", rating: 84, value: 8,   nation: "🇬🇧", era: "golden"  },
  { id: 328, name: "Wes Morgan",          club: "Leicester",      years: "2012–21", pos: "CB", rating: 83, value: 5,   nation: "🇯🇲", era: "golden"  },
  { id: 329, name: "Tyrone Mings",        club: "Aston Villa",    years: "2019–",   pos: "CB", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 330, name: "Dan Burn",            club: "Newcastle",      years: "2022–",   pos: "CB", rating: 80, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 331, name: "Matthew Upson",       club: "West Ham",       years: "2007–11", pos: "CB", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 332, name: "Ugo Ehiogu",          club: "Aston Villa",    years: "1991–00", pos: "CB", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 333, name: "Joël Matip",          club: "Liverpool",      years: "2016–24", pos: "CB", rating: 85, value: 11,  nation: "🇨🇲", era: "modern"  },

  // ── DEFENSIVE MIDFIELDERS ─────────────────────────────────────────────
  { id: 400, name: "Roy Keane",         club: "Man Utd",    years: "1993–05", pos: "DM", rating: 94, value: 122, nation: "🇮🇪", era: "classic" },
  { id: 401, name: "Patrick Vieira",    club: "Arsenal",    years: "1996–05", pos: "DM", rating: 93, value: 95,  nation: "🇫🇷", era: "classic" },
  { id: 402, name: "Claude Makélélé",   club: "Chelsea",    years: "2003–08", pos: "DM", rating: 91, value: 59,  nation: "🇫🇷", era: "classic" },
  { id: 403, name: "Yaya Touré",        club: "Man City",   years: "2010–18", pos: "DM", rating: 92, value: 74,  nation: "🇨🇮", era: "golden"  },
  { id: 404, name: "Steven Gerrard",    club: "Liverpool",  years: "1998–15", pos: "DM", rating: 94, value: 122, nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 405, name: "Fernandinho",       club: "Man City",   years: "2013–22", pos: "DM", rating: 89, value: 36,  nation: "🇧🇷", era: "golden"  },
  { id: 406, name: "N'Golo Kanté",      club: "Chelsea",    years: "2016–23", pos: "DM", rating: 92, value: 74,  nation: "🇫🇷", era: "modern"  },
  { id: 407, name: "Rodri",             club: "Man City",   years: "2019–",   pos: "DM", rating: 94, value: 122, nation: "🇪🇸", era: "modern"  },
  { id: 408, name: "Declan Rice",       club: "Arsenal",    years: "2023–",   pos: "DM", rating: 89, value: 36,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 409, name: "Nemanja Matić",     club: "Chelsea",    years: "2014–17", pos: "DM", rating: 87, value: 22,  nation: "🇷🇸", era: "golden"  },
  { id: 410, name: "Michael Carrick",   club: "Man Utd",    years: "2006–18", pos: "DM", rating: 87, value: 22,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 411, name: "Gareth Barry",      club: "Man City",   years: "2009–14", pos: "DM", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 412, name: "Jordan Henderson",  club: "Liverpool",  years: "2011–23", pos: "DM", rating: 86, value: 16,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 413, name: "Scott Parker",      club: "Chelsea",    years: "2004–13", pos: "DM", rating: 85, value: 11,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 414, name: "Lucas Leiva",       club: "Liverpool",  years: "2007–17", pos: "DM", rating: 84, value: 8,   nation: "🇧🇷", era: "golden"  },
  { id: 415, name: "Owen Hargreaves",   club: "Man Utd",    years: "2007–11", pos: "DM", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 416, name: "Nigel de Jong",     club: "Man City",   years: "2009–12", pos: "DM", rating: 84, value: 8,   nation: "🇳🇱", era: "golden"  },
  { id: 417, name: "Barry Ferguson",    club: "Blackburn",  years: "2003–09", pos: "DM", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", era: "classic" },
  { id: 418, name: "Lee Bowyer",        club: "Leeds",      years: "1996–03", pos: "DM", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 419, name: "Granit Xhaka",      club: "Arsenal",    years: "2016–23", pos: "DM", rating: 84, value: 8,   nation: "🇨🇭", era: "modern"  },
  { id: 420, name: "Dennis Wise",       club: "Chelsea",    years: "1990–01", pos: "DM", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 421, name: "Thomas Gravesen",   club: "Everton",    years: "2000–05", pos: "DM", rating: 83, value: 5,   nation: "🇩🇰", era: "classic" },
  { id: 422, name: "Cheikh Tioté",      club: "Newcastle",  years: "2010–17", pos: "DM", rating: 82, value: 3,   nation: "🇨🇮", era: "golden"  },
  { id: 423, name: "James Milner",      club: "Liverpool",  years: "2015–23", pos: "DM", rating: 84, value: 8,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 424, name: "Moussa Sissoko",    club: "Spurs",      years: "2016–21", pos: "DM", rating: 81, value: 1,   nation: "🇫🇷", era: "modern"  },
  { id: 425, name: "Nicky Butt",        club: "Man Utd",    years: "1992–04", pos: "DM", rating: 83, value: 5,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 426, name: "Marc Albrighton",   club: "Leicester",  years: "2014–22", pos: "DM", rating: 80, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },

  // ── MIDFIELDERS ──────────────────────────────────────────────────────
  { id: 500, name: "Paul Scholes",       club: "Man Utd",  years: "1993–13", pos: "MF", rating: 92, value: 78,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 501, name: "Frank Lampard",      club: "Chelsea",  years: "2001–14", pos: "MF", rating: 93, value: 100, nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 502, name: "Kevin De Bruyne",    club: "Man City", years: "2015–",   pos: "MF", rating: 96, value: 182, nation: "🇧🇪", era: "modern"  },
  { id: 503, name: "David Beckham",      club: "Man Utd",  years: "1992–03", pos: "MF", rating: 90, value: 48,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 504, name: "Luka Modrić",        club: "Spurs",    years: "2008–12", pos: "MF", rating: 90, value: 48,  nation: "🇭🇷", era: "golden"  },
  { id: 505, name: "Cesc Fàbregas",      club: "Arsenal",  years: "2003–11", pos: "MF", rating: 91, value: 62,  nation: "🇪🇸", era: "golden"  },
  { id: 506, name: "Mesut Özil",         club: "Arsenal",  years: "2013–21", pos: "MF", rating: 89, value: 40,  nation: "🇩🇪", era: "golden"  },
  { id: 507, name: "Juan Mata",          club: "Chelsea",  years: "2011–14", pos: "MF", rating: 87, value: 27,  nation: "🇪🇸", era: "golden"  },
  { id: 508, name: "David Silva",        club: "Man City", years: "2010–20", pos: "MF", rating: 93, value: 100, nation: "🇪🇸", era: "golden"  },
  { id: 509, name: "Phil Foden",         club: "Man City", years: "2017–",   pos: "MF", rating: 92, value: 78,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 510, name: "Bruno Fernandes",    club: "Man Utd",  years: "2020–",   pos: "MF", rating: 90, value: 48,  nation: "🇵🇹", era: "modern"  },
  { id: 511, name: "Martin Ødegaard",    club: "Arsenal",  years: "2021–",   pos: "MF", rating: 89, value: 40,  nation: "🇳🇴", era: "modern"  },
  { id: 512, name: "Christian Eriksen",  club: "Spurs",    years: "2013–20", pos: "MF", rating: 88, value: 33,  nation: "🇩🇰", era: "golden"  },
  { id: 513, name: "Joe Cole",           club: "Chelsea",  years: "2003–10", pos: "MF", rating: 85, value: 15,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 514, name: "Sandro Tonali",      club: "Newcastle",years: "2023–",   pos: "MF", rating: 86, value: 20,  nation: "🇮🇹", era: "modern"  },
  { id: 515, name: "Dele Alli",          club: "Spurs",    years: "2015–21", pos: "MF", rating: 85, value: 15,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 516, name: "Mason Mount",        club: "Chelsea",  years: "2019–23", pos: "MF", rating: 85, value: 15,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 517, name: "Conor Gallagher",    club: "Chelsea",  years: "2022–24", pos: "MF", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 518, name: "Jermaine Jenas",     club: "Spurs",    years: "2005–13", pos: "MF", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 519, name: "Robbie Savage",      club: "Blackburn",years: "2005–08", pos: "MF", rating: 80, value: 0,   nation: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", era: "classic" },
  { id: 520, name: "Harvey Elliott",     club: "Liverpool",years: "2020–",   pos: "MF", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 521, name: "Charlie Adam",       club: "Liverpool",years: "2011–12", pos: "MF", rating: 79, value: 0,   nation: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", era: "golden"  },

  // ── RIGHT WINGERS ─────────────────────────────────────────────────────
  { id: 600, name: "Cristiano Ronaldo",     club: "Man Utd",    years: "2003–09", pos: "RW", rating: 95, value: 168, nation: "🇵🇹", era: "classic" },
  { id: 601, name: "Mohamed Salah",         club: "Liverpool",  years: "2017–",   pos: "RW", rating: 95, value: 168, nation: "🇪🇬", era: "modern"  },
  { id: 602, name: "Bukayo Saka",           club: "Arsenal",    years: "2019–",   pos: "RW", rating: 91, value: 65,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 603, name: "Eden Hazard",           club: "Chelsea",    years: "2012–19", pos: "RW", rating: 93, value: 105, nation: "🇧🇪", era: "golden"  },
  { id: 604, name: "Raheem Sterling",       club: "Man City",   years: "2015–22", pos: "RW", rating: 90, value: 50,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 605, name: "Marc Overmars",         club: "Arsenal",    years: "1997–00", pos: "RW", rating: 90, value: 50,  nation: "🇳🇱", era: "classic" },
  { id: 606, name: "Arjen Robben",          club: "Chelsea",    years: "2004–07", pos: "RW", rating: 90, value: 50,  nation: "🇳🇱", era: "classic" },
  { id: 607, name: "Freddie Ljungberg",     club: "Arsenal",    years: "1998–07", pos: "RW", rating: 88, value: 34,  nation: "🇸🇪", era: "classic" },
  { id: 608, name: "David Ginola",          club: "Spurs",      years: "1997–00", pos: "RW", rating: 88, value: 34,  nation: "🇫🇷", era: "classic" },
  { id: 609, name: "Leroy Sané",            club: "Man City",   years: "2016–20", pos: "RW", rating: 88, value: 34,  nation: "🇩🇪", era: "modern"  },
  { id: 610, name: "Damien Duff",           club: "Chelsea",    years: "2003–06", pos: "RW", rating: 87, value: 27,  nation: "🇮🇪", era: "classic" },
  { id: 611, name: "Matthew Le Tissier",    club: "Southampton",years: "1986–02", pos: "RW", rating: 87, value: 27,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 612, name: "Andrei Kanchelskis",    club: "Man Utd",    years: "1991–95", pos: "RW", rating: 87, value: 27,  nation: "🇷🇺", era: "classic" },
  { id: 613, name: "Antonio Valencia",      club: "Man Utd",    years: "2009–19", pos: "RW", rating: 87, value: 27,  nation: "🇪🇨", era: "golden"  },
  { id: 614, name: "Marcus Rashford",       club: "Man Utd",    years: "2016–",   pos: "RW", rating: 87, value: 27,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 615, name: "Steve McManaman",       club: "Liverpool",  years: "1990–99", pos: "RW", rating: 86, value: 20,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 616, name: "Willian",               club: "Chelsea",    years: "2013–20", pos: "RW", rating: 85, value: 14,  nation: "🇧🇷", era: "golden"  },
  { id: 617, name: "Shaun Wright-Phillips", club: "Chelsea",    years: "2005–08", pos: "RW", rating: 84, value: 9,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 618, name: "Jarrod Bowen",          club: "West Ham",   years: "2020–",   pos: "RW", rating: 84, value: 9,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 619, name: "Michail Antonio",       club: "West Ham",   years: "2015–",   pos: "RW", rating: 83, value: 6,   nation: "🇯🇲", era: "modern"  },
  { id: 620, name: "Pedro",                 club: "Chelsea",    years: "2015–20", pos: "RW", rating: 83, value: 6,   nation: "🇪🇸", era: "golden"  },
  { id: 621, name: "Kevin Gallagher",       club: "Blackburn",  years: "1993–99", pos: "RW", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", era: "classic" },
  { id: 622, name: "Stewart Downing",       club: "Liverpool",  years: "2011–13", pos: "RW", rating: 80, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },

  // ── LEFT WINGERS ──────────────────────────────────────────────────────
  { id: 700, name: "Thierry Henry",       club: "Arsenal",        years: "1999–07", pos: "LW", rating: 96, value: 190, nation: "🇫🇷", era: "classic" },
  { id: 701, name: "Ryan Giggs",          club: "Man Utd",        years: "1990–14", pos: "LW", rating: 94, value: 128, nation: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", era: "classic" },
  { id: 702, name: "Sadio Mané",          club: "Liverpool",      years: "2016–22", pos: "LW", rating: 93, value: 105, nation: "🇸🇳", era: "modern"  },
  { id: 703, name: "Heung-Min Son",       club: "Spurs",          years: "2015–",   pos: "LW", rating: 92, value: 82,  nation: "🇰🇷", era: "modern"  },
  { id: 704, name: "Robert Pires",        club: "Arsenal",        years: "2000–06", pos: "LW", rating: 91, value: 65,  nation: "🇫🇷", era: "classic" },
  { id: 705, name: "Riyad Mahrez",        club: "Man City",       years: "2018–23", pos: "LW", rating: 89, value: 42,  nation: "🇩🇿", era: "modern"  },
  { id: 706, name: "Jack Grealish",       club: "Man City",       years: "2021–",   pos: "LW", rating: 87, value: 27,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 707, name: "Diogo Jota",          club: "Liverpool",      years: "2020–",   pos: "LW", rating: 87, value: 27,  nation: "🇵🇹", era: "modern"  },
  { id: 708, name: "Wilfried Zaha",       club: "Crystal Palace", years: "2015–23", pos: "LW", rating: 86, value: 20,  nation: "🇨🇮", era: "modern"  },
  { id: 709, name: "Chris Waddle",        club: "Sheffield Wed",  years: "1992–97", pos: "LW", rating: 86, value: 20,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 710, name: "Patrik Berger",       club: "Liverpool",      years: "1996–03", pos: "LW", rating: 84, value: 9,   nation: "🇨🇿", era: "classic" },
  { id: 711, name: "Hakim Ziyech",        club: "Chelsea",        years: "2020–23", pos: "LW", rating: 84, value: 9,   nation: "🇲🇦", era: "modern"  },
  { id: 712, name: "Allan Saint-Maximin", club: "Newcastle",      years: "2019–23", pos: "LW", rating: 84, value: 9,   nation: "🇫🇷", era: "modern"  },
  { id: 713, name: "Emile Smith Rowe",    club: "Arsenal",        years: "2021–",   pos: "LW", rating: 83, value: 6,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 714, name: "Leandro Trossard",    club: "Arsenal",        years: "2023–",   pos: "LW", rating: 85, value: 14,  nation: "🇧🇪", era: "modern"  },
  { id: 715, name: "Laurent Robert",      club: "Newcastle",      years: "2001–05", pos: "LW", rating: 82, value: 3,   nation: "🇫🇷", era: "classic" },
  { id: 716, name: "Leon Bailey",         club: "Aston Villa",    years: "2021–",   pos: "LW", rating: 83, value: 6,   nation: "🇯🇲", era: "modern"  },
  { id: 717, name: "Adama Traoré",        club: "Wolves",         years: "2018–22", pos: "LW", rating: 83, value: 6,   nation: "🇪🇸", era: "modern"  },
  { id: 718, name: "Nicolas Anelka",      club: "Arsenal",        years: "1997–99", pos: "LW", rating: 86, value: 20,  nation: "🇫🇷", era: "classic" },
  { id: 719, name: "Anthony Elanga",      club: "Man Utd",        years: "2021–23", pos: "LW", rating: 79, value: 0,   nation: "🇸🇪", era: "modern"  },

  // ── STRIKERS ─────────────────────────────────────────────────────────
  { id: 800, name: "Erling Haaland",        club: "Man City",    years: "2022–",   pos: "ST", rating: 96, value: 198, nation: "🇳🇴", era: "modern"  },
  { id: 801, name: "Alan Shearer",          club: "Newcastle",   years: "1996–06", pos: "ST", rating: 94, value: 141, nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 802, name: "Harry Kane",            club: "Spurs",       years: "2014–23", pos: "ST", rating: 94, value: 141, nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 803, name: "Ruud van Nistelrooy",   club: "Man Utd",     years: "2001–06", pos: "ST", rating: 93, value: 110, nation: "🇳🇱", era: "classic" },
  { id: 804, name: "Didier Drogba",         club: "Chelsea",     years: "2004–12", pos: "ST", rating: 93, value: 110, nation: "🇨🇮", era: "golden"  },
  { id: 805, name: "Wayne Rooney",          club: "Man Utd",     years: "2004–17", pos: "ST", rating: 93, value: 110, nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 806, name: "Robin van Persie",      club: "Arsenal",     years: "2004–12", pos: "ST", rating: 92, value: 86,  nation: "🇳🇱", era: "golden"  },
  { id: 807, name: "Michael Owen",          club: "Liverpool",   years: "1996–04", pos: "ST", rating: 92, value: 86,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 808, name: "Fernando Torres",       club: "Liverpool",   years: "2007–11", pos: "ST", rating: 92, value: 86,  nation: "🇪🇸", era: "golden"  },
  { id: 809, name: "Andy Cole",             club: "Man Utd",     years: "1995–01", pos: "ST", rating: 90, value: 53,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 810, name: "Robbie Fowler",         club: "Liverpool",   years: "1993–01", pos: "ST", rating: 89, value: 42,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 811, name: "Les Ferdinand",         club: "Newcastle",   years: "1995–97", pos: "ST", rating: 89, value: 42,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 812, name: "Alexander Isak",        club: "Newcastle",   years: "2022–",   pos: "ST", rating: 87, value: 30,  nation: "🇸🇪", era: "modern"  },
  { id: 813, name: "Andriy Shevchenko",     club: "Chelsea",     years: "2006–08", pos: "ST", rating: 88, value: 37,  nation: "🇺🇦", era: "classic" },
  { id: 814, name: "Teddy Sheringham",      club: "Man Utd",     years: "1997–01", pos: "ST", rating: 87, value: 30,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 815, name: "Romelu Lukaku",         club: "Chelsea",     years: "2021–22", pos: "ST", rating: 87, value: 30,  nation: "🇧🇪", era: "modern"  },
  { id: 816, name: "Jermain Defoe",         club: "Spurs",       years: "2004–14", pos: "ST", rating: 86, value: 22,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 817, name: "Olivier Giroud",        club: "Arsenal",     years: "2012–18", pos: "ST", rating: 86, value: 22,  nation: "🇫🇷", era: "golden"  },
  { id: 818, name: "Ollie Watkins",         club: "Aston Villa", years: "2020–",   pos: "ST", rating: 85, value: 17,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 819, name: "Gabriel Jesus",         club: "Arsenal",     years: "2022–",   pos: "ST", rating: 85, value: 17,  nation: "🇧🇷", era: "modern"  },
  { id: 820, name: "Darren Bent",           club: "Sunderland",  years: "2009–11", pos: "ST", rating: 84, value: 11,  nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 821, name: "Dominic Calvert-Lewin", club: "Everton",     years: "2016–",   pos: "ST", rating: 83, value: 7,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 822, name: "Callum Wilson",         club: "Newcastle",   years: "2020–",   pos: "ST", rating: 83, value: 7,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "modern"  },
  { id: 823, name: "Emile Heskey",          club: "Liverpool",   years: "2000–04", pos: "ST", rating: 83, value: 7,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 824, name: "Danny Welbeck",         club: "Arsenal",     years: "2014–18", pos: "ST", rating: 81, value: 1,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 825, name: "Peter Crouch",          club: "Liverpool",   years: "2005–08", pos: "ST", rating: 80, value: 0,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "golden"  },
  { id: 826, name: "Dion Dublin",           club: "Man Utd",     years: "1992–94", pos: "ST", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
  { id: 827, name: "Kevin Campbell",        club: "Arsenal",     years: "1988–95", pos: "ST", rating: 82, value: 3,   nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "classic" },
];

export const POSITIONS = [
  { key: "GK",  label: "Goalkeeper",   slot: 0  },
  { key: "RB",  label: "Right Back",   slot: 1  },
  { key: "LB",  label: "Left Back",    slot: 2  },
  { key: "CB",  label: "Centre Back",  slot: 3  },
  { key: "CB",  label: "Centre Back",  slot: 4  },
  { key: "DM",  label: "Def. Mid",     slot: 5  },
  { key: "MF",  label: "Midfielder",   slot: 6  },
  { key: "MF",  label: "Midfielder",   slot: 7  },
  { key: "RW",  label: "Right Winger", slot: 8  },
  { key: "LW",  label: "Left Winger",  slot: 9  },
  { key: "ST",  label: "Striker",      slot: 10 },
  { key: "SUB", label: "Sub 1",        slot: 11 },
  { key: "SUB", label: "Sub 2",        slot: 12 },
  { key: "SUB", label: "Sub 3",        slot: 13 },
  { key: "SUB", label: "Sub 4",        slot: 14 },
  { key: "SUB", label: "Sub 5",        slot: 15 },
];

export const SUB_POSITIONS = ["GK","RB","LB","CB","DM","MF","RW","LW","ST"];

export const ERA_LABELS = { classic: "Classic 98-08", golden: "Golden 08-16", modern: "Modern 16-" };
export const ERA_COLORS = { classic: "#8B5E3C", golden: "#1A6B4A", modern: "#1A4580" };
export const ERA_BG    = { classic: "#F5E6D0", golden: "#D4EDE2", modern: "#D0E4F5" };

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

export function generateBudget() {
  const r = Math.random();
  if (r < 0.12) return Math.floor(Math.random() * 16);
  if (r < 0.28) return Math.floor(Math.random() * 25) + 16;
  if (r < 0.50) return Math.floor(Math.random() * 30) + 41;
  if (r < 0.70) return Math.floor(Math.random() * 30) + 71;
  if (r < 0.84) return Math.floor(Math.random() * 25) + 101;
  if (r < 0.93) return Math.floor(Math.random() * 25) + 126;
  if (r < 0.98) return Math.floor(Math.random() * 25) + 151;
  return Math.floor(Math.random() * 15) + 176;
}

export const RANDOM_CLUB_NAMES = [
  "Northgate United","Ironbridge FC","Crestfield Athletic","Ashdown Rovers",
  "Riverdale City","Stonewick Town","Brentmoor Wanderers","Coppermill FC",
  "Ashworth United","Blackwell City","Greystone Athletic","Hartfield Rovers",
  "Millbrook Town","Oakdale United","Pennfield Athletic","Ravenwood City",
  "Silverdale FC","Thornbury United","Westbrook Athletic","Dunmore Rovers",
  "Belston City","Cranfield United","Holmewood Athletic","Fernside Rovers",
  "Westgate United","Oakmoor City","Ironhaven United","Coppergate City",
  "Mossfield Athletic","Alderton FC",
];

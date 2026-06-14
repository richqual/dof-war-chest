export const FORMATION_LIST = [
  "4-3-3", "4-4-2", "4-5-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-2-3-1",
];

// x/y coords (% of pitch width/height) for each formation slot.
// Slot order: GK=0, RB=1, LB=2, CB=3, CB=4, slot5=6, slot6, slot7, slot8, slot9, slot10=10.
// pos labels reflect the actual position in that formation (used for display + player filtering).
export const FORMATIONS = {
  "4-3-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 50, y: 52 },
    { pos: "MF",  x: 28, y: 48 },
    { pos: "MF",  x: 72, y: 48 },
    { pos: "RW",  x: 80, y: 26 },
    { pos: "LW",  x: 20, y: 26 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "4-4-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "MF",  x: 78, y: 50 },
    { pos: "MF",  x: 56, y: 50 },
    { pos: "MF",  x: 34, y: 50 },
    { pos: "MF",  x: 12, y: 50 },
    { pos: "ST",  x: 34, y: 20 },
    { pos: "ST",  x: 66, y: 20 },
  ],
  "4-5-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 50, y: 52 },
    { pos: "MF",  x: 18, y: 46 },
    { pos: "MF",  x: 82, y: 46 },
    { pos: "MF",  x: 60, y: 28 },
    { pos: "MF",  x: 40, y: 28 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "3-5-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "MF", label: "RM", x: 86, y: 54 },
    { pos: "MF", label: "LM", x: 14, y: 54 },
    { pos: "CB",  x: 67, y: 74 },
    { pos: "CB",  x: 33, y: 74 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "MF",  x: 28, y: 44 },
    { pos: "MF",  x: 50, y: 42 },
    { pos: "MF",  x: 72, y: 44 },
    { pos: "ST",  x: 33, y: 20 },
    { pos: "ST",  x: 67, y: 20 },
  ],
  "3-4-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "MF", label: "RM", x: 86, y: 56 },
    { pos: "MF", label: "LM", x: 14, y: 56 },
    { pos: "CB",  x: 65, y: 74 },
    { pos: "CB",  x: 35, y: 74 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "MF",  x: 34, y: 48 },
    { pos: "MF",  x: 66, y: 48 },
    { pos: "RW",  x: 78, y: 20 },
    { pos: "LW",  x: 22, y: 20 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "5-3-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 88, y: 64 },
    { pos: "LB",  x: 12, y: 64 },
    { pos: "CB",  x: 70, y: 76 },
    { pos: "CB",  x: 30, y: 76 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "MF",  x: 25, y: 48 },
    { pos: "MF",  x: 50, y: 46 },
    { pos: "MF",  x: 75, y: 48 },
    { pos: "ST",  x: 33, y: 20 },
    { pos: "ST",  x: 67, y: 20 },
  ],
  "5-4-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 88, y: 64 },
    { pos: "LB",  x: 12, y: 64 },
    { pos: "CB",  x: 70, y: 76 },
    { pos: "CB",  x: 30, y: 76 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "MF",  x: 18, y: 48 },
    { pos: "MF",  x: 40, y: 48 },
    { pos: "MF",  x: 60, y: 48 },
    { pos: "MF",  x: 82, y: 48 },
    { pos: "ST",  x: 50, y: 14 },
  ],
  "4-2-3-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 35, y: 54 },
    { pos: "DM",  x: 65, y: 54 },
    { pos: "RW",  x: 78, y: 32 },
    { pos: "MF",  x: 50, y: 30 },
    { pos: "LW",  x: 22, y: 32 },
    { pos: "ST",  x: 50, y: 12 },
  ],
};

// Display order for progress bar chips: DEF → MID → ATT.
// Only formations where slot order differs from logical group order need an entry.
// Default (omitted) = [0,1,2,3,4,5,6,7,8,9,10]
export const FORMATION_DISPLAY_ORDER = {
  "3-5-2": [0, 3, 4, 5, 1, 2, 6, 7, 8, 9, 10], // GK, CB CB CB, RM LM, MF MF MF, ST ST
  "3-4-3": [0, 3, 4, 5, 1, 2, 6, 7, 8, 9, 10], // GK, CB CB CB, RM LM, MF MF, RW LW ST
};

// Which POSITIONS slot indices belong to each group.
// Matches POSITIONS array order: GK=0, RB=1, LB=2, CB=3, CB=4, DM=5, MF=6, MF=7, RW=8, LW=9, ST=10
export const GROUP_SLOT_INDICES = {
  GK:  [0],
  DEF: [1, 2, 3, 4],
  MID: [5, 6, 7, 8, 9],
  ATT: [10],
};

export const GROUP_ORDER = ["GK", "DEF", "MID", "ATT"];

export const GROUP_LABELS = {
  GK:  "GOALKEEPER",
  DEF: "DEFENDER",
  MID: "MIDFIELDER",
  ATT: "ATTACKER",
};

export const GROUP_COLORS = {
  GK:  { fill: "#f97316", text: "#000" },
  DEF: { fill: "#3b82f6", text: "#fff" },
  MID: { fill: "#22c55e", text: "#000" },
  ATT: { fill: "#ef4444", text: "#fff" },
};

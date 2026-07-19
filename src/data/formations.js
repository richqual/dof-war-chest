export const FORMATION_LIST = [
  "4-3-3", "4-4-2", "4-5-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-2-3-1",
];

// x/y coords (% of pitch width/height) for each formation slot.
// Slot order: GK=0, RB=1, LB=2, CB=3, CB=4, slot5=6, slot6, slot7, slot8, slot9, slot10=10.
// pos labels reflect the actual position in that formation (used for display + player filtering).
export const FORMATIONS = {
  "1-2-1": [
    { pos: "GK",  x: 50, y: 86 },
    { pos: "DEF", x: 50, y: 65 },
    { pos: "MID", x: 27, y: 42 },
    { pos: "MID", x: 73, y: 42 },
    { pos: "ATT", x: 50, y: 16 },
  ],
  "4-3-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 82, y: 70 },
    { pos: "LB",  x: 18, y: 70 },
    { pos: "CB",  x: 63, y: 70 },
    { pos: "CB",  x: 37, y: 70 },
    { pos: "DM",  x: 50, y: 52 },
    { pos: "CM",  x: 28, y: 48 },
    { pos: "CM",  x: 72, y: 48 },
    { pos: "RW",  x: 80, y: 26 },
    { pos: "LW",  x: 20, y: 26 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "4-4-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RB",  x: 85, y: 70 },
    { pos: "LB",  x: 15, y: 70 },
    { pos: "CB",  x: 62, y: 70 },
    { pos: "CB",  x: 38, y: 70 },
    { pos: "RM",  x: 85, y: 48 },
    { pos: "CM",  x: 62, y: 48 },
    { pos: "CM",  x: 38, y: 48 },
    { pos: "LM",  x: 15, y: 48 },
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
    { pos: "LM",  x: 18, y: 46 },
    { pos: "RM",  x: 82, y: 46 },
    { pos: "CAM", x: 60, y: 28 },
    { pos: "CAM", x: 40, y: 28 },
    { pos: "ST",  x: 50, y: 12 },
  ],
  "3-5-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RM",  x: 86, y: 54 },
    { pos: "LM",  x: 14, y: 54 },
    { pos: "CB",  x: 67, y: 74 },
    { pos: "CB",  x: 33, y: 74 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "CM",  x: 28, y: 44 },
    { pos: "CM",  x: 50, y: 42 },
    { pos: "CM",  x: 72, y: 44 },
    { pos: "ST",  x: 33, y: 20 },
    { pos: "ST",  x: 67, y: 20 },
  ],
  "3-4-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "RM",  x: 86, y: 56 },
    { pos: "LM",  x: 14, y: 56 },
    { pos: "CB",  x: 65, y: 74 },
    { pos: "CB",  x: 35, y: 74 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "CM",  x: 34, y: 48 },
    { pos: "CM",  x: 66, y: 48 },
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
    { pos: "CM",  x: 25, y: 48 },
    { pos: "CM",  x: 50, y: 46 },
    { pos: "CM",  x: 75, y: 48 },
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
    { pos: "LM",  x: 18, y: 48 },
    { pos: "CM",  x: 40, y: 48 },
    { pos: "CM",  x: 60, y: 48 },
    { pos: "RM",  x: 82, y: 48 },
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
    { pos: "CAM", x: 50, y: 30 },
    { pos: "LW",  x: 22, y: 32 },
    { pos: "ST",  x: 50, y: 12 },
  ],
};

// ── Position eligibility ──────────────────────────────────────────────────
// Each outfield starter slot draws from a pool: the slot's NATURAL position
// (no match penalty) plus a set of ELIGIBLE alternatives (small penalty). GK is
// always strict. Players outside the pool can't be drafted into the slot.
//
// Standard elig by natural position. Wing-back and back-three slots differ per
// formation, handled by ELIG_OVERRIDE below (the RM/LM/CB labels mean different
// things in a 3-at-the-back shape than in a flat four).
// Every slot is STRICT to its exact natural position — it draws only players of
// that position — EXCEPT the wide-mid RM/LM slots. Those are the one genuinely
// scarce/ambiguous case (the DB has only ~4 RM and ~2 LM), so they broaden to
// their SAME-SIDE winger to be fillable. Left and right never cross, and no
// other position gets an out-of-position allowance.
const ELIG_STD = {
  GK:  [],
  CB:  [],
  RB:  [],
  LB:  [],
  DM:  [],
  CM:  [],
  CAM: [],
  RM:  ["RW"],   // scarce wide mid → same-side winger only
  LM:  ["LW"],   // scarce wide mid → same-side winger only
  RW:  [],
  LW:  [],
  ST:  [],
};

// Per-formation, per-slot overrides. Keys are slot indices into FORMATIONS.
// In 3-5-2 / 3-4-3 slots 1&2 are the wide RM/LM slots played as WING-BACKS, so
// (again, only the RM/LM slots get an allowance) they broaden to their same-side
// FULL-BACK. The three centre-backs stay strict CB via ELIG_STD.
const WB_R = { natural: "RB", elig: ["RM"] };
const WB_L = { natural: "LB", elig: ["LM"] };
const BACK_THREE_OVERRIDE = { 1: WB_R, 2: WB_L };
const ELIG_OVERRIDE = {
  "3-5-2": BACK_THREE_OVERRIDE,
  "3-4-3": BACK_THREE_OVERRIDE,
};

// Resolve a slot's eligibility. Returns { natural, elig, pool } or null.
// `natural` = 0-penalty position; `elig` = penalised alternatives;
// `pool` = everything draftable into the slot (natural first, deduped).
export function slotEligibility(formation, slotIndex) {
  const entry = FORMATIONS[formation]?.[slotIndex];
  if (!entry) return null;
  const ov = ELIG_OVERRIDE[formation]?.[slotIndex];
  const natural = ov?.natural ?? entry.pos;
  const elig = ov?.elig ?? ELIG_STD[entry.pos] ?? [];
  const pool = [natural, ...elig.filter(p => p !== natural)];
  return { natural, elig, pool };
}

// Flat rating/attribute penalty for playing an eligible-but-not-natural player.
export const OOP_PENALTY = 5;

// Display order for progress bar chips: DEF → MID → ATT.
// Only formations where slot order differs from logical group order need an entry.
// Default (omitted) = [0,1,2,3,4,5,6,7,8,9,10]
export const FORMATION_DISPLAY_ORDER = {
  "3-5-2": [0, 3, 4, 5, 1, 2, 6, 7, 8, 9, 10], // GK, CB CB CB, RM LM, CM CM CM, ST ST
  "3-4-3": [0, 3, 4, 5, 1, 2, 6, 7, 8, 9, 10], // GK, CB CB CB, RM LM, CM CM, RW LW ST
};

// Which POSITIONS slot indices belong to each group.
// GK=0, RB=1, LB=2, CB=3, CB=4, DM=5, slot6, slot7, slot8, slot9, ST/slot10=10
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

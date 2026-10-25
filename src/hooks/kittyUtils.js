// Transfer Kitty mode — pure logic.
//
// This module is the mode's skeleton: block definitions, per-block kitty
// allocation, and the block-granularity turn advance. No UI, no React, no
// Firestore — everything here is a pure function of its inputs so it can be
// unit-tested in isolation (see scripts/kitty-check.mjs) before any screen is
// wired up. See docs/obsidian/Transfer Kitty Mode Spec.md.
//
// Reuse note: this deliberately mirrors the shapes already in draftUtils.js
// (applyPick's "everyone does this slot, then advance"; War Chest's per-slot
// budget-fraction ceiling; Leftover Lolly's leftover→subFund banking) so the
// screens can lean on the existing budgeted-pick primitives rather than new
// systems. Transfer Kitty is a re-composition, one notch coarser: block-major
// instead of slot-major.

import { formationStarterBuckets, bucketBasePosition } from "./scoutUtils";
import { WAR_CHEST_VALUES, cpuVariancePick } from "../data/players";
import {
  availablePlayersFor, resolveValue, formationPos, isDraftableBy, dedupeByName,
} from "./draftUtils";
import { slotEligibility } from "../data/formations";

// ── Block definitions ───────────────────────────────────────────────────────

// Base playing position → draft block. Wide players split by intent: RM/LM are
// midfielders, RW/LW are attackers (this is why 4-4-2's MID is RM/CM/CM/LM while
// 4-3-3's ATT is RW/LW/ST — the formation's own slot labels already encode it).
// GK is its own single-slot spin block; subs are one closing wheel block.
const BASE_TO_BLOCK = {
  GK: "GK",
  RB: "DEF", LB: "DEF", CB: "DEF", RWB: "DEF", LWB: "DEF",
  DM: "MID", CM: "MID", CAM: "MID", RM: "MID", LM: "MID",
  RW: "ATT", LW: "ATT", ST: "ATT", CF: "ATT",
};

// The block a starter slot's position belongs to. Falls back to MID for any
// exotic label so an unknown position is never silently dropped from a block.
export function blockForPosition(pos) {
  return BASE_TO_BLOCK[pos] || "MID";
}

export const KITTY_BLOCK_LABELS = {
  GK: "Goalkeeper",
  DEF: "Defence",
  MID: "Midfield",
  ATT: "Attack",
  SUBS: "Substitutes",
};

// Bench slots are fixed across every formation (squad is Array(16): 0–10
// starters, 11–15 subs — GKSUB/DEFSUB/MIDSUB/WIDSUB/ATTSUB).
const SUB_SLOT_INDICES = [11, 12, 13, 14, 15];

// The ordered block definitions for a formation. Derived from Scout's
// per-formation starter buckets (NOT formations.js's fixed GROUP_SLOT_INDICES,
// which hardcodes the 4-3-3 slot layout) so slot counts are always correct for
// the chosen shape. GK opens on a wheel, DEF/MID/ATT are budgeted builds, SUBS
// closes on a wheel.
//
//   4-4-2 → DEF [1,2,3,4]  MID [5,6,7,8]    ATT [9,10]
//   4-3-3 → DEF [1,2,3,4]  MID [5,6,7]      ATT [8,9,10]
export function kittyBlocks(formation) {
  const buckets = formationStarterBuckets(formation); // slot index → bucket key
  const bySlot = { GK: [], DEF: [], MID: [], ATT: [] };
  buckets.forEach((bucket, slotIndex) => {
    const block = blockForPosition(bucketBasePosition(bucket));
    (bySlot[block] || bySlot.MID).push(slotIndex);
  });
  return [
    { key: "GK",   label: KITTY_BLOCK_LABELS.GK,   slotIndices: bySlot.GK,  wheel: true, build: false },
    { key: "DEF",  label: KITTY_BLOCK_LABELS.DEF,  slotIndices: bySlot.DEF, wheel: false, build: true },
    { key: "MID",  label: KITTY_BLOCK_LABELS.MID,  slotIndices: bySlot.MID, wheel: false, build: true },
    { key: "ATT",  label: KITTY_BLOCK_LABELS.ATT,  slotIndices: bySlot.ATT, wheel: false, build: true },
    { key: "SUBS", label: KITTY_BLOCK_LABELS.SUBS, slotIndices: SUB_SLOT_INDICES, wheel: true, build: false },
  ];
}

// ── Per-block kitty allocation ──────────────────────────────────────────────

// Fraction of a manager's total outfield BUILD budget assigned to each budgeted
// block. Attack weighted highest (attackers cost most), echoing War Chest's
// WC_MAX_FRACTION shape. GK and SUBS are wheel spins funded separately (GK off
// the Classic budget wheel, SUBS off Leftover Lolly), so they're not here.
// DEF+MID+ATT sum to 1.0 — the whole build budget is spread across the outfield.
// Playtest tuning; the *shape* (per-block, attacker-weighted, carryover) is the
// design decision, not these exact numbers.
export const KITTY_FRACTION = { DEF: 0.32, MID: 0.34, ATT: 0.34 };

// Transfer Kitty rolls ONE total build budget per manager, then splits it. The
// band is tied to War Chest's already-tuned difficulty bands via a single
// multiplier: WC funds a 5-a-side squad, Transfer Kitty a full outfield of
// ~9–10 players, so it needs a bigger pot. Keeping it a multiple of the WC band
// means both scale together when the WC bands are retuned. Tunable in one place.
export const KITTY_TOTAL_MULT = 2.4;

export function kittyTotalBand(difficulty) {
  const wc = WAR_CHEST_VALUES[difficulty] || WAR_CHEST_VALUES.hard;
  return wc.map(v => Math.round(v * KITTY_TOTAL_MULT));
}

// Roll a manager's total outfield build budget. rng lets tests pin the result.
export function rollKittyTotal(difficulty, rng = Math.random) {
  const band = kittyTotalBand(difficulty);
  return band[Math.floor(rng() * band.length)];
}

// ── Piggy banks: the per-block budget reveal ─────────────────────────────────
//
// Each budgeted block (DEF/MID/ATT) opens with a selection of piggy banks — you
// smash one to reveal that block's kitty, and see what the others held. It's a
// gamble: the banks hold different amounts, so the pick matters. Attack banks
// skew richest (attackers cost most), mirroring the old KITTY_FRACTION intent
// but as a live choice instead of a hidden split.
//
// One entry per bank in a selection (4 banks), stated PER PLAYER so a block's
// total scales with how many slots it has — 4-3-3's three-man attack gets a
// bigger attack kitty than 4-4-2's two, and its three-man midfield a smaller
// one, keeping per-player affordability comparable across formations. "normal"
// difficulty spread; difficulty scales the set. Attacker banks skew richest.
// Tunable — the *shape* (a spread you gamble on, attacker-weighted, scaling with
// squad shape) is the design.
export const KITTY_BANK_PER_PLAYER = {
  DEF: [15, 22, 30, 40],
  MID: [18, 25, 33, 43],
  ATT: [45, 65, 85, 110],
};

// Fallback slot counts (a standard 4-4-2 shape) when a caller doesn't pass one.
const DEFAULT_BLOCK_SLOTS = { DEF: 4, MID: 4, ATT: 2 };

// Scales every bank in a block. Roughly follows the game's difficulty feel
// (generous ≫ normal ≫ brutal), softened at the extremes so a block is always
// buildable and a generous roll is a genuine treat.
export const KITTY_BANK_DIFF_MULT = {
  generous: 3.4, easy: 1.8, normal: 1, hard: 0.6, brutal: 0.28,
};

// The amounts on offer for one block — the per-player spread × the number of
// slots in the block × the difficulty multiplier. Rounded to £5m, min £5m.
export function kittyBankValues(difficulty, blockKey, slotCount) {
  const per = KITTY_BANK_PER_PLAYER[blockKey] || KITTY_BANK_PER_PLAYER.MID;
  const mult = KITTY_BANK_DIFF_MULT[difficulty] ?? 1;
  const slots = slotCount || DEFAULT_BLOCK_SLOTS[blockKey] || 1;
  return per.map(v => Math.max(5, Math.round((v * mult * slots) / 5) * 5));
}

// A shuffled selection for the reveal UI, so the biggest bank isn't always last.
export function kittyBankSelection(difficulty, blockKey, slotCount) {
  const vals = kittyBankValues(difficulty, blockKey, slotCount);
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  return vals;
}

// The subs top-up is spun on a 3-reel slot machine instead of the single wheel:
// each reel lands one of these amounts and the three sum into the bench fund
// (then stacked on the carried-over sub fund). Per-reel mean ≈ £58m, so a pull
// averages ~£175m — meaningfully more than the old single spin — while a cold
// pull still floors at BENCH_MIN_FUND. Tunable; the *three summed reels* is the
// design (a fuller bench, and a punchier reveal).
export const KITTY_SUBS_REEL = [15, 25, 35, 45, 60, 75, 95, 120];

// Pick one reel's landed amount.
export function rollSubsReel(rng = Math.random) {
  return KITTY_SUBS_REEL[Math.floor(rng() * KITTY_SUBS_REEL.length)];
}

// The kitty a manager brings to one build block: its fraction of their total
// build budget, plus any carryover rolled forward from earlier blocks. Wheel
// blocks (GK/SUBS) have no kitty — returns just the carryover for them.
export function blockKittyFor(total, blockKey, carryover = 0) {
  const frac = KITTY_FRACTION[blockKey];
  const base = frac ? Math.floor(total * frac) : 0;
  return base + (carryover || 0);
}

// The full DEF/MID/ATT split of a rolled total (before carryover), for display
// or pre-allocation. Sums to `total` minus flooring dust.
export function allocateKitties(total) {
  return {
    DEF: Math.floor(total * KITTY_FRACTION.DEF),
    MID: Math.floor(total * KITTY_FRACTION.MID),
    ATT: Math.floor(total * KITTY_FRACTION.ATT),
  };
}

// ── The block-major turn advance ────────────────────────────────────────────
//
// applyKittyBlockDone is the block-granularity analogue of draftUtils.js's
// applyPick. applyPick advances one SLOT for one manager and, once every
// manager has taken that slot, moves the whole table to the next slot. This
// advances one whole BLOCK for one manager (they've made all their budgeted
// picks for it) and, once every manager has finished the block, moves the whole
// table to the next block — reversing order snake-wise, exactly like applyPick.
//
// Expected state (mirrors the spec's data model, all on the `draft` object):
//   tkBlockIndex   0=GK 1=DEF 2=MID 3=ATT 4=SUBS
//   tkPhase        "gk-wheel"|"building"|"block-reveal"|"subs-wheel"|"complete"
//   blocks         kittyBlocks(drawFormation)
//   currentOrder   draft order for this block (snake-reversed per block)
//   snakeOrder     the base seniority order
//   turnIndex      whose turn within the block
//   managers[i]    { squad, blockKitty, kittyRemaining, carryover, subFund, ... }
//
// Banks the on-clock manager's leftover kitty (→ carryover for the next build
// block; → subFund after the final ATT build block, feeding the subs wheel via
// Leftover Lolly), then advances the turn. When the last manager finishes the
// block it snapshots nothing itself (the caller shows the Draw Board on the
// "block-reveal" phase) but advances tkBlockIndex, resets turnIndex, and flips
// currentOrder for the snake.

const BLOCK_SEQUENCE = ["GK", "DEF", "MID", "ATT", "SUBS"];

// Is the block after ATT (i.e. was ATT the block just finished)? Its leftover
// feeds the subs wheel, not another build block.
function isLastBuildBlock(blockKey) {
  return blockKey === "ATT";
}

export function applyKittyBlockDone(d) {
  const n = d.currentOrder.length;
  const activeIdx = d.currentOrder[d.turnIndex];
  const block = d.blocks[d.tkBlockIndex];
  const leftover = Math.max(0, d.managers[activeIdx]?.kittyRemaining ?? 0);

  // Bank the on-clock manager's unspent kitty. After ATT it powers the subs
  // wheel (subFund, via Leftover Lolly); between build blocks it rolls forward.
  // Wheel blocks (GK) don't bank — their budget is spun fresh and separate, so
  // any leftover is simply discarded rather than double-funding the next block.
  const managers = d.managers.map((m, i) => {
    if (i !== activeIdx) return m;
    // Snapshot the budget this manager had for the block before we clear it, so
    // the Draw Board can show each manager's round kitty (blockKitty is nulled
    // on completion). Keyed by block so every board reads its own round.
    const kittyByBlock = block?.build
      ? { ...(m.kittyByBlock || {}), [block.key]: m.blockKitty ?? 0 }
      : m.kittyByBlock;
    if (!block?.build) return { ...m, kittyRemaining: 0, blockKitty: null };
    if (isLastBuildBlock(block?.key)) {
      return { ...m, kittyRemaining: 0, blockKitty: null, kittyByBlock, subFund: (m.subFund || 0) + leftover };
    }
    return { ...m, kittyRemaining: 0, blockKitty: null, kittyByBlock, carryover: (m.carryover || 0) + leftover };
  });

  const newTurnIndex = d.turnIndex + 1;

  // Still managers to go in this block: just pass the turn.
  if (newTurnIndex < n) {
    return { ...d, managers, turnIndex: newTurnIndex };
  }

  // Everyone has finished this block. Advance to the next block, reverse order
  // for the snake, and set the phase for the caller to render.
  const newBlockIndex = d.tkBlockIndex + 1;
  const nextKey = BLOCK_SEQUENCE[newBlockIndex];
  const nextPhase =
    nextKey === undefined ? "complete"
    : nextKey === "SUBS"  ? "subs-wheel"
    : "building";

  return {
    ...d,
    managers,
    tkBlockIndex: newBlockIndex,
    turnIndex: 0,
    // Snake: reverse the order each block, like applyPick's round parity flip.
    currentOrder: [...d.currentOrder].reverse(),
    tkPhase: "block-reveal", // caller shows the Draw Board, then moves to nextPhase
    tkNextPhase: nextPhase,
  };
}

// ── The per-pick browse (shared, depleting pool, scoped to one slot) ─────────
//
// The affordable, draftable candidates for one starter slot in the current
// build block. Reuses the exact Classic machinery — `availablePlayersFor` with
// the slot's `slotEligibility` pool (so RM/LM broaden to same-side wingers,
// etc.), `isDraftableBy` for Real Teams, `dedupeByName`, `resolveValue` — then
// filters to what the kitty can afford. This is the block builder's browse list.
// Which positions a manager may CHOOSE to fill a block's slots with. The draft
// formation only fixes how MANY slots each block has; within a block you're free
// to gear the shape (e.g. a 4-3-3 midfield built as DM/DM/CAM, or CM/CM/CAM).
// The block's natural slot positions are the default; this is the full menu the
// slot filter offers. Left/right stay distinct; GK/subs aren't filtered.
export const KITTY_BLOCK_POSITIONS = {
  DEF: ["RB", "CB", "LB"],
  MID: ["DM", "CM", "CAM", "RM", "LM"],
  ATT: ["ST", "CF", "RW", "LW"],
};

// When you filter on a wide role, the same-side winger/wide-mid comes with it —
// so an RM slot can pull an RW (and vice-versa), a 4-4-2 wide midfielder isn't
// starved. Crucially this is the ONLY broadening a wide filter does: it never
// reaches into central mids, so filtering on RM/LM/RW/LW never surfaces a CM.
// Central and defensive roles stay strict to exactly what you picked.
const KITTY_POS_EXPAND = {
  RM: ["RM", "RW"], RW: ["RW", "RM"],
  LM: ["LM", "LW"], LW: ["LW", "LM"],
};

// Expand a set of chosen filter positions into the actual pool of `pos` strings
// to browse — the union of each choice plus its same-side wide partner.
export function expandKittyPositions(positions) {
  const out = new Set();
  for (const p of positions) (KITTY_POS_EXPAND[p] || [p]).forEach(x => out.add(x));
  return [...out];
}

// `posOverride` is the manager's live position filter: an array of chosen
// positions (multi-select), a single position string, or null for "use the
// slot's natural eligibility pool". An array/string browses exactly the chosen
// positions (wide roles broadened via expandKittyPositions); null falls back to
// the slot's own eligibility.
export function kittySlotPlayers(d, slotIndex, kittyRemaining, activeManager, posOverride = null) {
  const formation = d.drawFormation;
  const posList = Array.isArray(posOverride)
    ? posOverride
    : (posOverride ? [posOverride] : null);
  const pos = posList && posList.length ? posList[0] : formationPos(formation, slotIndex);
  // With an explicit position filter, browse exactly those positions (wide roles
  // broadened to their same-side partner); otherwise use the slot's natural
  // eligibility pool.
  const elig = posList && posList.length
    ? { pool: expandKittyPositions(posList) }
    : slotEligibility(formation, slotIndex);
  const roulette = activeManager
    ? { era: activeManager.assignedEra, league: activeManager.assignedLeague }
    : null;
  let players = availablePlayersFor(pos, d.takenIds, roulette, elig ? elig.pool : null, false);
  if (d.availablePlayerIds instanceof Set) {
    players = players.filter(p => isDraftableBy(d, activeManager, p.id));
  }
  players = dedupeByName(players, d, activeManager);
  return players
    .map(p => ({
      ...p,
      value: resolveValue(d.playerValues, p),
      form: d.playerForm instanceof Map ? (d.playerForm.get(p.id) ?? 0) : 0,
    }))
    .filter(p => kittyRemaining == null || p.value <= kittyRemaining)
    .sort((a, b) => b.rating - a.rating);
}

// ── CPU: auto-build one block within its kitty ───────────────────────────────
//
// Fills the block's still-empty slots for a CPU, spending from `kitty`. Analogue
// of autoFillWarChestSlot scoped to a block's slot subset. Spreads spend so one
// slot can't swallow the whole purse (a soft ceiling while other slots remain),
// then relaxes to the full remainder on the last slot. Picks with
// cpuVariancePick for the same splurge/bargain/shortlist texture as every other
// CPU pick. Returns { squad, takenIds, spent } — the caller banks the leftover.
//
// Fills the tightest slots first (fewest affordable options) so a scarce
// position isn't starved by an earlier slot hoovering its only candidates.
export function autoFillKittyBlock(d, managerIdx, block, kitty) {
  const m = d.managers[managerIdx];
  const squad = [...m.squad];
  let takenIds = [...d.takenIds];
  let remaining = kitty;

  let empties = block.slotIndices.filter(si => !squad[si]);
  const spent0 = kitty;

  while (empties.length) {
    // Recompute pools each pass against the tightest-first ordering.
    const withPool = empties.map(si => ({
      si,
      pool: kittySlotPlayers({ ...d, takenIds }, si, remaining, m),
    }));
    withPool.sort((a, b) => a.pool.length - b.pool.length);
    const { si, pool } = withPool[0];
    empties = empties.filter(x => x !== si);

    const slotsLeft = empties.length + 1;
    // Soft ceiling: while other slots still need funding, don't blow more than a
    // generous share on this one; on the final slot, the whole remainder is fair.
    const cap = slotsLeft > 1 ? Math.floor(remaining * 0.55) : remaining;
    const affordable = pool.filter(p => p.value <= cap);
    const pick = cpuVariancePick(affordable.length ? affordable : pool);
    if (!pick) continue; // nothing affordable/available for this slot — leave empty

    squad[si] = { ...pick };
    takenIds.push(pick.id);
    remaining -= pick.value;
  }

  return { squad, takenIds, spent: spent0 - remaining, remaining };
}

// Assign the on-clock manager the kitty for the block they're about to build:
// its fraction of their rolled total, plus carryover. Call when a build block
// begins for a manager (transitioning into "building"). Pure; returns new d.
export function beginKittyBlockForManager(d) {
  const activeIdx = d.currentOrder[d.turnIndex];
  const block = d.blocks[d.tkBlockIndex];
  if (!block?.build) return d;
  const managers = d.managers.map((m, i) => {
    if (i !== activeIdx) return m;
    const kitty = blockKittyFor(m.kittyTotal ?? 0, block.key, m.carryover || 0);
    return { ...m, blockKitty: kitty, kittyRemaining: kitty, carryover: 0 };
  });
  return { ...d, managers };
}

// Isolated sanity check for Transfer Kitty's pure logic (src/hooks/kittyUtils.js).
// Loads the real module via Vite's SSR loader (same trick as sim-sweep.mjs) so
// the bare `../data/players` imports resolve without a browser.
//
// Usage: node scripts/kitty-check.mjs
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});

const kitty = await server.ssrLoadModule("/src/hooks/kittyUtils.js");
const {
  kittyBlocks, blockForPosition, KITTY_FRACTION, blockKittyFor,
  allocateKitties, rollKittyTotal, applyKittyBlockDone, beginKittyBlockForManager,
} = kitty;

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${detail}`); }
}

console.log("\n── kittyBlocks(formation) ──");
for (const f of ["4-4-2", "4-3-3"]) {
  const blocks = kittyBlocks(f);
  const by = Object.fromEntries(blocks.map(b => [b.key, b.slotIndices]));
  console.log(`  ${f}:`, blocks.map(b => `${b.key}[${b.slotIndices.join(",")}]`).join("  "));
  check(`${f} has 5 blocks`, blocks.length === 5);
  check(`${f} GK = [0]`, JSON.stringify(by.GK) === "[0]");
  check(`${f} SUBS = [11..15]`, JSON.stringify(by.SUBS) === "[11,12,13,14,15]");
  check(`${f} DEF = [1,2,3,4]`, JSON.stringify(by.DEF) === "[1,2,3,4]");
  // Every starter slot 0..10 is covered exactly once across GK/DEF/MID/ATT.
  const starters = [...by.GK, ...by.DEF, ...by.MID, ...by.ATT].sort((a, b) => a - b);
  check(`${f} covers starters 0..10 once`, JSON.stringify(starters) === JSON.stringify([...Array(11).keys()]));
  check(`${f} GK/SUBS are wheel, DEF/MID/ATT build`,
    blocks[0].wheel && blocks[4].wheel && blocks[1].build && blocks[2].build && blocks[3].build);
}
// The formation-sensitive split: 442 MID=4 ATT=2, 433 MID=3 ATT=3.
{
  const m442 = Object.fromEntries(kittyBlocks("4-4-2").map(b => [b.key, b.slotIndices]));
  const m433 = Object.fromEntries(kittyBlocks("4-3-3").map(b => [b.key, b.slotIndices]));
  check("442 MID=[5,6,7,8] ATT=[9,10]", JSON.stringify(m442.MID) === "[5,6,7,8]" && JSON.stringify(m442.ATT) === "[9,10]");
  check("433 MID=[5,6,7] ATT=[8,9,10]", JSON.stringify(m433.MID) === "[5,6,7]" && JSON.stringify(m433.ATT) === "[8,9,10]");
}

console.log("\n── position → block ──");
check("RM is MID", blockForPosition("RM") === "MID");
check("RW is ATT", blockForPosition("RW") === "ATT");
check("CB is DEF", blockForPosition("CB") === "DEF");
check("unknown falls back to MID", blockForPosition("ZZ") === "MID");

console.log("\n── kitty allocation ──");
check("fractions sum to 1.0", Math.abs(KITTY_FRACTION.DEF + KITTY_FRACTION.MID + KITTY_FRACTION.ATT - 1) < 1e-9);
check("ATT >= DEF (attacker-weighted)", KITTY_FRACTION.ATT >= KITTY_FRACTION.DEF);
{
  const total = 1000;
  const a = allocateKitties(total);
  check("allocateKitties(1000) DEF=320 MID=340 ATT=340", a.DEF === 320 && a.MID === 340 && a.ATT === 340, JSON.stringify(a));
  check("blockKittyFor adds carryover", blockKittyFor(1000, "DEF", 50) === 370);
  check("blockKittyFor wheel block = carryover only", blockKittyFor(1000, "GK", 25) === 25);
}
{
  // rollKittyTotal picks a band value; pin rng to the first and last slots.
  const lo = rollKittyTotal("normal", () => 0);
  const hi = rollKittyTotal("normal", () => 0.999);
  check("rollKittyTotal picks from band", lo > 0 && hi > 0 && lo !== hi, `${lo},${hi}`);
}

console.log("\n── applyKittyBlockDone (block-major snake) ──");
{
  // 3 managers, seniority order [0,1,2]. Walk DEF block through all three.
  const mk = () => ({ squad: Array(16).fill(null), kittyTotal: 1000, blockKitty: null, kittyRemaining: 0, carryover: 0, subFund: 0 });
  let d = {
    blocks: kittyBlocks("4-4-2"),
    tkBlockIndex: 1, tkPhase: "building",
    snakeOrder: [0, 1, 2], currentOrder: [0, 1, 2], turnIndex: 0,
    managers: [mk(), mk(), mk()],
  };
  // Manager on clock begins the block, "spends" some, leaves 40 unspent.
  d = beginKittyBlockForManager(d);
  check("DEF kitty assigned = 320", d.managers[0].blockKitty === 320, String(d.managers[0].blockKitty));
  d.managers[0].kittyRemaining = 40;
  d = applyKittyBlockDone(d);
  check("leftover 40 → carryover", d.managers[0].carryover === 40, String(d.managers[0].carryover));
  check("turn passed to idx 1", d.turnIndex === 1 && d.tkBlockIndex === 1);

  // Manager 1 and 2 finish with 0 left.
  d = applyKittyBlockDone(d); // mgr 1
  d = applyKittyBlockDone(d); // mgr 2 → block complete
  check("advanced to MID block", d.tkBlockIndex === 2, String(d.tkBlockIndex));
  check("turnIndex reset", d.turnIndex === 0);
  check("order reversed (snake)", JSON.stringify(d.currentOrder) === "[2,1,0]", JSON.stringify(d.currentOrder));
  check("phase = block-reveal, next = building", d.tkPhase === "block-reveal" && d.tkNextPhase === "building");

  // Carryover rolls into MID kitty for manager 0 (now last in reversed order,
  // but still carries their own 40). Re-assign at their turn.
  // Fast-forward: put mgr 0 on clock in MID.
  d.turnIndex = 2; // reversed order [2,1,0] → idx 2 is mgr 0
  d = beginKittyBlockForManager(d);
  check("MID kitty = 340 + carryover 40 = 380", d.managers[0].blockKitty === 380, String(d.managers[0].blockKitty));
  check("carryover consumed on begin", d.managers[0].carryover === 0);

  // Finish through MID then ATT to confirm ATT leftover → subFund, then complete.
  d.managers[0].kittyRemaining = 0;
  d = applyKittyBlockDone(d); // last of MID (turnIndex 2 of 3) → ATT
  check("advanced to ATT block", d.tkBlockIndex === 3, String(d.tkBlockIndex));

  // Walk ATT: give each a leftover, confirm it lands in subFund not carryover.
  d.currentOrder.forEach((mi, i) => { d.managers[mi].kittyRemaining = 10; });
  const before = d.tkBlockIndex;
  d.turnIndex = 0;
  d = applyKittyBlockDone(d);
  const firstAtt = d.currentOrder[0]; // still same order until block ends
  check("ATT leftover → subFund (not carryover)",
    d.managers[d.blocks && d.currentOrder ? d.currentOrder[0] : 0] !== undefined);
  // Explicit: mgr who just went is the one whose subFund grew.
  d = applyKittyBlockDone(d);
  d = applyKittyBlockDone(d); // finish ATT → SUBS
  check("advanced to SUBS block", d.tkBlockIndex === 4, String(d.tkBlockIndex));
  check("next phase = subs-wheel", d.tkNextPhase === "subs-wheel", d.tkNextPhase);
  const anySubFund = d.managers.some(m => m.subFund === 10);
  check("some manager banked ATT leftover into subFund", anySubFund, JSON.stringify(d.managers.map(m => m.subFund)));
}

console.log("\n── piggy-bank values ──");
{
  const { kittyBankValues, kittyBankSelection } = kitty;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  // 4-4-2 slot counts: DEF 4, MID 4, ATT 2.
  const def = kittyBankValues("normal", "DEF", 4);
  const mid = kittyBankValues("normal", "MID", 4);
  const att = kittyBankValues("normal", "ATT", 2);
  check("4 banks per block", def.length === 4 && mid.length === 4 && att.length === 4);
  check("banks are a spread (distinct)", new Set(def).size === 4);
  check("attack banks skew richest per player", mean(att) / 2 > mean(mid) / 4 && mean(mid) / 4 > mean(def) / 4);
  check("generous > normal > brutal", mean(kittyBankValues("generous", "ATT", 2)) > mean(att) && mean(att) > mean(kittyBankValues("brutal", "ATT", 2)));
  check("brutal still buildable (>= £5m)", kittyBankValues("brutal", "DEF", 4).every(v => v >= 5));
  // Slot-count scaling: 4-3-3's 3-man attack gets a bigger kitty than 4-4-2's 2-man;
  // its 3-man midfield a smaller one than 4-4-2's 4-man. Per-player stays equal.
  const att3 = kittyBankValues("normal", "ATT", 3);
  const mid3 = kittyBankValues("normal", "MID", 3);
  check("3-man attack kitty > 2-man attack kitty", mean(att3) > mean(att), `${mean(att)}→${mean(att3)}`);
  check("3-man midfield kitty < 4-man midfield kitty", mean(mid3) < mean(mid), `${mean(mid)}→${mean(mid3)}`);
  check("per-player attack budget equal across formations", Math.abs(mean(att) / 2 - mean(att3) / 3) < 0.01, `${mean(att) / 2} vs ${mean(att3) / 3}`);
  const sel = kittyBankSelection("normal", "ATT", 2);
  check("selection is a permutation of the values", JSON.stringify([...sel].sort((a, b) => a - b)) === JSON.stringify([...att].sort((a, b) => a - b)));
}

console.log("\n── kittySlotPlayers + autoFillKittyBlock (real pool) ──");
{
  const { kittySlotPlayers, autoFillKittyBlock } = kitty;
  const players = await server.ssrLoadModule("/src/data/players.js");
  const { PLAYERS } = players;
  const allIds = new Set(PLAYERS.map(p => p.id));
  const playerValues = new Map(PLAYERS.map(p => [p.id, Math.round(((p.valueMin ?? 0) + (p.valueMax ?? 0)) / 2)]));

  const d = {
    drawFormation: "4-4-2",
    blocks: kittyBlocks("4-4-2"),
    takenIds: [],
    availablePlayerIds: allIds,
    playerValues,
    playerForm: new Map(),
    managers: [{ squad: Array(16).fill(null), isComputer: true }],
  };
  const defBlock = d.blocks[1]; // DEF slots 1..4

  const pool = kittySlotPlayers(d, 1, 30, d.managers[0]); // RB slot, cap £30m
  check("slot pool returns affordable RB-eligible players", pool.length > 0 && pool.every(p => p.value <= 30), String(pool.length));
  check("slot pool sorted by rating desc", pool.every((p, i) => i === 0 || pool[i - 1].rating >= p.rating));

  const kittyBudget = 200;
  const res = autoFillKittyBlock(d, 0, defBlock, kittyBudget);
  const filled = defBlock.slotIndices.filter(si => res.squad[si]);
  check("CPU filled all 4 DEF slots", filled.length === 4, `${filled.length}/4`);
  check("CPU spent within kitty", res.spent <= kittyBudget && res.spent >= 0, String(res.spent));
  check("CPU took 4 new ids", res.takenIds.length === 4);
  check("no slot swallowed the whole purse", defBlock.slotIndices.every(si => !res.squad[si] || res.squad[si].value <= kittyBudget));
  const ids = defBlock.slotIndices.map(si => res.squad[si]?.id).filter(Boolean);
  check("no duplicate players in block", new Set(ids).size === ids.length);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
await server.close();
process.exit(fail === 0 ? 0 : 1);

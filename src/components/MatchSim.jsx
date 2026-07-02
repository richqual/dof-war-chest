import { useState, useEffect, useRef } from "react";
import KitSwatch, { readableTextOn, teamAccent } from "./KitSwatch";
import { TIER_SIM_MODIFIER } from "../data/managers";
import { FORMATIONS } from "../data/formations";
import { getRatingBg, getRatingColor } from "../data/players";

function teamStrength(squad) {
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return 70;
  return starters.reduce((s, p) => s + p.rating, 0) / starters.length;
}

function bestPlayer(squad, posFilter) {
  const pl = squad.filter(Boolean);
  if (posFilter) {
    const pos = pl.filter(p => p.pos === posFilter);
    if (pos.length) return pos.sort((a, b) => b.rating - a.rating)[0];
  }
  return pl.sort((a, b) => b.rating - a.rating)[0];
}

function weighted(items) {
  const total = items.reduce((s, it) => s + it.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Player attributes — read directly from stored pac/sho/pas/dri/def/phy.
// Maps to the old att/def/pac/tec/aer shape used by the engine internals.
// ---------------------------------------------------------------------------

function deriveAttributes(player) {
  const clamp = v => Math.round(Math.min(99, Math.max(1, v)));
  const pac = clamp(player.pac ?? 60);
  const sho = clamp(player.sho ?? 50);
  const pas = clamp(player.pas ?? 50);
  const dri = clamp(player.dri ?? 50);
  const def = clamp(player.def ?? 50);
  const phy = clamp(player.phy ?? 60);
  return {
    att: clamp(Math.round(sho * 0.6 + dri * 0.4)),
    def: clamp(Math.round(def * 0.7 + phy * 0.3)),
    pac,
    tec: clamp(Math.round(pas * 0.55 + dri * 0.45)),
    aer: clamp(Math.round(phy * 0.65 + def * 0.35)),
  };
}

// Pick a player from a list, weighted by a scorer function.
// Uses squared weighting to strongly favour high-attribute players.
function pickWeightedPlayer(players, scoreFn) {
  if (!players.length) return null;
  const scored = players.map(p => ({ p, w: Math.pow(Math.max(1, scoreFn(p)), 2) }));
  const total = scored.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of scored) {
    r -= x.w;
    if (r <= 0) return x.p;
  }
  return scored[scored.length - 1].p;
}

// Positional goal-scoring likelihood — forwards score most, defenders rarely
const POS_GOAL_WEIGHT = {
  ST: 3.2, LW: 2.4, RW: 2.4, CAM: 1.8, RM: 1.5, LM: 1.5,
  CM: 0.7, DM: 0.3, RB: 0.2, LB: 0.2, CB: 0.15,
};
const POS_AERIAL_WEIGHT = {
  ST: 3.0, CB: 1.8, LW: 1.0, RW: 1.0, CAM: 0.9, CM: 0.8,
  DM: 0.7, RB: 0.6, LB: 0.6, LM: 0.5, RM: 0.5,
};

function pickAttacker(players) {
  return pickWeightedPlayer(players, p => {
    const a = deriveAttributes(p);
    const posW = POS_GOAL_WEIGHT[p.pos] ?? 1.0;
    return (a.att * 0.6 + a.pac * 0.2 + a.tec * 0.2) * posW;
  });
}

const POS_ASSIST_WEIGHT = {
  CAM: 2.2, CM: 1.8, LM: 1.5, RM: 1.5, LW: 1.4, RW: 1.4,
  ST: 1.0, DM: 0.9, RB: 0.8, LB: 0.8, CB: 0.5, GK: 0.12,
};

function pickAssister(players, excludeName) {
  const cands = players.filter(p => p.name !== excludeName);
  if (!cands.length) return null;
  return pickWeightedPlayer(cands, p => {
    const a = deriveAttributes(p);
    const posW = POS_ASSIST_WEIGHT[p.pos] ?? 1.0;
    return (a.tec * 0.55 + a.att * 0.20 + a.pac * 0.15 + a.aer * 0.10) * posW;
  });
}

function pickAerialScorer(players) {
  return pickWeightedPlayer(players, p => {
    const a = deriveAttributes(p);
    const posW = POS_AERIAL_WEIGHT[p.pos] ?? 1.0;
    return (a.aer * 0.70 + a.att * 0.30) * posW;
  });
}

// Average attacking attribute of the outfield players (used for goal chance).
function teamAttStrength(squad) {
  const outfield = squad.slice(0, 11).filter(p => p && p.pos !== "GK");
  if (!outfield.length) return 50;
  return outfield.reduce((s, p) => s + deriveAttributes(p).att, 0) / outfield.length;
}

// Average defensive attribute of all starters (used for goal chance against).
function teamDefStrength(squad) {
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return 50;
  return starters.reduce((s, p) => s + deriveAttributes(p).def, 0) / starters.length;
}

// Goal commentary keyed by match situation, so an equaliser never
// reads as "puts TEAM ahead".
const COMMENTARY_GOAL = {
  lead: [
    (scorer, team) => `${scorer} slots it home coolly. ${team} in front!`,
    (scorer, team) => `GOAAAL! ${scorer} makes no mistake. ${team} lead!`,
    (scorer, team) => `The keeper had no chance. ${scorer} puts ${team} ahead!`,
    (scorer, team) => `${scorer} taps it in from close range. ${team} strike first blood!`,
    (scorer, team) => `Brilliant finish from ${scorer}! ${team} take the lead!`,
    (scorer, team) => `${scorer} has done it! And ${team} are ahead — it's what they deserved!`,
    (scorer, team) => `He only scores goals, does ${scorer}. ${team} lead!`,
    (scorer, team) => `A moment of pure class from ${scorer}! ${team} ahead!`,
    (scorer, team) => `${scorer} — WHAT a finish! They ALL count for ${team}!`,
  ],
  equaliser: [
    (scorer, team) => `${scorer} drags ${team} level! All square!`,
    (scorer, team) => `GOAAAL! ${scorer} equalises for ${team} — game on!`,
    (scorer, team) => `${scorer} with an absolute thunderbolt! ${team} are back on terms!`,
    (scorer, team) => `It's level! ${scorer} restores parity for ${team}!`,
    (scorer, team) => `${scorer} pulls ${team} level — this tie is very much alive!`,
    (scorer, team) => `And it's all square now! ${scorer} with the leveller for ${team}!`,
    (scorer, team) => `The momentum has shifted! ${scorer} and ${team} are back in this!`,
  ],
  extend: [
    (scorer, team) => `${scorer} adds another! ${team} are stretching clear!`,
    (scorer, team) => `GOAAAL! ${scorer} again the tormentor — ${team} extend their lead!`,
    (scorer, team) => `Surely that's the cushion ${team} wanted. ${scorer} scores!`,
    (scorer, team) => `${scorer} piles on the misery! ${team} in total command!`,
    (scorer, team) => `The game is running away from them now! ${scorer} makes it emphatic for ${team}!`,
    (scorer, team) => `${scorer}! As if the game wasn't already over… it certainly is now!`,
    (scorer, team) => `This could be a cricket score! ${scorer} adds another for ${team}!`,
  ],
  pullback: [
    (scorer, team) => `${scorer} pulls one back for ${team}! A lifeline!`,
    (scorer, team) => `${scorer} gives ${team} hope! The comeback is on?`,
    (scorer, team) => `GOAL! ${scorer} reduces the arrears for ${team}!`,
    (scorer, team) => `There's still time! ${scorer} and ${team} smell blood!`,
    (scorer, team) => `It's a consolation — or is it? ${scorer} for ${team}!`,
    (scorer, team) => `${team} refuse to lie down! ${scorer} keeps the dream alive!`,
  ],
};

// Used when a goal has an assister — replaces the standard ctx line.
const COMMENTARY_GOAL_ASSIST = [
  (a, s, t) => `${a}'s through ball is perfectly weighted and ${s} does the rest. ${t} ahead!`,
  (a, s, t) => `What a ball from ${a}! ${s} runs onto it and finishes with aplomb. ${t} score!`,
  (a, s, t) => `${a} whips in the cross and ${s} is there to head it home. ${t} in front!`,
  (a, s, t) => `${a} picks out ${s} with a sublime pass — and he doesn't need a second invitation!`,
  (a, s, t) => `Brilliant assist from ${a}, drilled low across the box, and ${s} taps it in for ${t}!`,
  (a, s, t) => `${a} with the corner — swung in perfectly, and ${s} meets it at the near post. ${t} lead!`,
  (a, s, t) => `${a} plays ${s} in behind the defence — one-on-one with the keeper, and he doesn't miss!`,
  (a, s, t) => `A gorgeous clipped ball from ${a} over the top, ${s} brings it down and finishes. ${t}!`,
  (a, s, t) => `${a} cuts it back from the byline and ${s} has the simplest of finishes for ${t}!`,
  (a, s, t) => `Free kick from ${a} — curled right into the danger zone — and ${s} is on hand to convert!`,
  (a, s, t) => `${a} with a delicious flick, ${s} latches onto it and drives it home. ${t} go ahead!`,
  (a, s, t) => `${a} releases ${s} in acres of space. He takes one touch and buries it. Textbook from ${t}!`,
  (a, s, t) => `The one-two between ${a} and ${s} rips the defence open — ${s} finishes calmly for ${t}!`,
  (a, s, t) => `${a} sees the run and hits the pass early. ${s} is through and slots it. ${t} score!`,
  (a, s, t) => `A long ball from ${a}, flicked on, and somehow ${s} is the first to react. Goal for ${t}!`,
  (a, s, t) => `${a} pulls it back across the six-yard box and ${s} can't miss from there. ${t} in front!`,
  (a, s, t) => `${a} drives forward and lays it off at exactly the right moment — ${s} finishes it off for ${t}!`,
  (a, s, t) => `What vision from ${a}! A pass of the highest quality, and ${s} does what he does. ${t} lead!`,
  (a, s, t) => `${a} with the delivery from the right flank — floated, dangerous — and ${s} heads home for ${t}!`,
  (a, s, t) => `${a} skips past his man and squares it to ${s}, who only has the keeper to beat. He doesn't miss. ${t}!`,
  (a, s, t) => `Corner from ${a}. It's got pace on it. ${s} attacks the ball brilliantly and ${t} are ahead!`,
  (a, s, t) => `${a} with the long diagonal switch — sensational pass — found ${s} who made no mistake for ${t}!`,
  (a, s, t) => `${a} threads the needle in a packed penalty area. Only ${s} saw the run. Only ${s} could finish that.`,
];

// Used when the assister is a goalkeeper — distribution rather than a pass
const COMMENTARY_GOAL_ASSIST_GK = [
  (a, s, t) => `${a} rolls it out quickly and ${s} is in behind — clinical finish for ${t}!`,
  (a, s, t) => `Quick hands from ${a} — the distribution is perfect and ${s} does the rest. ${t} score!`,
  (a, s, t) => `${a} launches it long and ${s} brings it down beautifully before finishing. ${t} ahead!`,
  (a, s, t) => `${a} spots the run early and bowls it out — ${s} is clean through and doesn't miss. ${t}!`,
  (a, s, t) => `The goalkeeper, ${a}, with a stunning long throw — ${s} latches on and finishes. ${t} lead!`,
  (a, s, t) => `${a} distributes quickly before the defence can set — ${s} is onto it in a flash. Goal for ${t}!`,
];

const COMMENTARY_MISS = [
  (p) => `${p} drives wide! So close.`,
  (p) => `${p} rattles the crossbar! Agonising.`,
  (p) => `${p} fires over from six yards!`,
  (p) => `The keeper pulls off a stunning save to deny ${p}.`,
  (p) => `${p} hits the post — can't believe it!`,
  (p) => `${p} blazes over! That was a great chance.`,
  (p) => `My grandmother could've scored that, and she's been dead fifteen years. ${p} will not want to see that again.`,
  (p) => `${p} somehow contrives to miss from point-blank range. The chance of a lifetime, squandered!`,
  (p) => `The keeper doesn't even move — ${p} has put it straight at him!`,
  (p) => `${p} with a fresh air shot! Remarkable. Remarkable miss.`,
  (p) => `He's put it wide! ${p} has had a mare there.`,
  (p) => `A miss! A horrible, horrible miss from ${p}! He's put his head in his hands!`,
  (p) => `The ball has struck ${p} and gone wide. He may not have meant that.`,
  (p) => `${p} lashes it over the bar! The keeper was well beaten — but the crossbar wasn't!`,
  (p) => `Oh, he's snatched at it! ${p} will be furious with himself.`,
];

const COMMENTARY_CARD = [
  (p) => `${p} goes into the book for a reckless challenge.`,
  (p) => `Referee shows ${p} a yellow card after that foul.`,
  (p) => `${p} lunges in late — yellow card.`,
  (p) => `${p} has been booked! He won't be happy with himself.`,
  (p) => `That's a yellow for ${p} — he knew exactly what he was doing.`,
  (p) => `The referee has had enough of ${p}! Into the book he goes.`,
  (p) => `Cynical foul from ${p} — lucky it's only a yellow, if we're honest.`,
  (p) => `${p} raises his hands in protest but the referee's having none of it. Yellow card.`,
];

const COMMENTARY_RED = [
  (p, team, men) => `${p} is shown a SECOND YELLOW — RED CARD! ${team} are down to ${men} men!`,
  (p, team, men) => `That's his second booking! ${p} is off! ${team} reduced to ${men}!`,
  (p, team, men) => `${p} can have no complaints — two yellows and he's sent off. ${team} play on with ${men} men.`,
  (p, team, men) => `OFF! ${p} goes for an early bath! ${team} will have to dig deep with ${men} men.`,
  (p, team, men) => `What was ${p} thinking?! Second yellow, red card — ${team} are down to ${men}!`,
];

const COMMENTARY_NEUTRAL = [
  (a, b) => `${a} pressing hard but ${b}'s defence is holding firm.`,
  (a, b) => `${b} counter-attack — good defending to clear the danger.`,
  (a, b) => `${a} looking comfortable in possession here.`,
  (a, b) => `End to end stuff now as both sides chase the next goal.`,
  (a, b) => `${a} corner comes to nothing. ${b} clear.`,
  (a, b) => `${b} forcing a couple of corners in quick succession.`,
  (a, b) => `${a} with the ball now — patient build-up play, or just going backwards? Hard to say.`,
  (a, b) => `The referee is having a bit of a nightmare here, and frankly, who can blame him.`,
  (a, b) => `At the end of the day, ${a} will be looking to give 110%.`,
  (a, b) => `${b}'s goalkeeper has had a very quiet afternoon so far. Almost too quiet.`,
  (a, b) => `The fans are getting restless. ${a} need to do something special — or at least something.`,
  (a, b) => `${a}'s manager cuts a frustrated figure on the touchline. He's seen something he doesn't like.`,
  (a, b) => `Incredible scenes. Well — moderately interesting scenes. Football!`,
  (a, b) => `${a} looking for the killer ball. ${b} holding a very high line — dangerous.`,
  (a, b) => `It's a game of two halves, and we're firmly in one of them.`,
  (a, b) => `${b}'s midfield doing a lot of running today. Lots of it. Some of it useful.`,
  (a, b) => `The ball is in play. Things are happening. Football is definitely occurring.`,
  (a, b) => `${a} with the throw-in. You wouldn't believe the tension.`,
  (a, b) => `${a} counter-attacking with pace! But ${b} scramble it clear.`,
  (a, b) => `${b} struggling to get a foothold in this match, if we're being charitable.`,
  (a, b) => `Both sets of fans making themselves heard. Lively atmosphere here.`,
  (a, b) => `${a} looking to exploit the channels. Classic modern football analysis there.`,
  (a, b) => `He's gone down! The referee waves play on — twelve people disagree loudly.`,
  (a, b) => `${b}'s centre-back marshalling the defence admirably. A rock. An absolute rock. A slightly nervous rock.`,
  (a, b) => `Tactical change brewing on the ${a} bench. The manager has stood up. He's sat back down again.`,
  (a, b) => `${b} looking to win the second ball. They haven't had much luck with the first one either, if we're honest.`,
  (a, b) => `The linesman raises his flag! Or was he just stretching? He was just stretching.`,
  (a, b) => `${b}'s striker appeals for a penalty! The referee is unmoved. The striker remains extremely moved.`,
  (a, b) => `${a} keeping their shape brilliantly. A lovely 4-3-3. Or a 4-5-1. Modern football — who can say.`,
  (a, b) => `Tremendous character from ${b} here. Some might call it stubbornness. Let's call it character.`,
  (a, b) => `${a}'s physio has been called on. We're told it's nothing serious. We're always told it's nothing serious.`,
  (a, b) => `${b} recycling possession patiently. Their manager would call it game management. Others might not.`,
  (a, b) => `${a} working the ball through the thirds. Or possibly the second third. Geography is hard.`,
  (a, b) => `There's a coming-together! Both players spring to their feet to demonstrate they are completely fine.`,
  (a, b) => `${a} free kick. Three players standing over the ball. A brief conference. They decide on the option that doesn't work.`,
  (a, b) => `The ball has trickled out for a goal kick. We pause here, briefly, in quiet reflection.`,
  (a, b) => `${b}'s goalkeeper has just kicked the ball very firmly to nobody in particular.`,
  (a, b) => `${a}'s winger cuts inside! He passes it square instead. A decision has been made.`,
  (a, b) => `${b} with a long ball over the top — the centre-forward had it all on but... no, he's miles offside.`,
  (a, b) => `${a}'s substitutes are warming up along the touchline. Whether anyone wants them on is another matter.`,
];

const COMMENTARY_PEN_SCORED = [
  (name) => `${name} steps up and buries it. Ice cold.`,
  (name) => `${name} sends the keeper the wrong way — SCORED!`,
  (name) => `${name} places it perfectly into the corner. No chance for the keeper.`,
  (name) => `Calm as you like from ${name}. Penalty converted.`,
  (name) => `${name} smashes it into the top corner! Unstoppable.`,
  (name) => `${name} with a stuttering run-up — buries it to the keeper's right!`,
  (name) => `Keeper dives left, ${name} goes right. Clinical finish.`,
  (name) => `${name} scores from the spot. Icy composure under enormous pressure.`,
];

const COMMENTARY_PEN_MISSED = [
  (name) => `${name} fires wide! The pressure has got to him!`,
  (name) => `SAVED! The keeper dives low and pushes it away. ${name} can't believe it.`,
  (name) => `${name} hits the post! Agonising.`,
  (name) => `${name} blazes it over the bar! The nerves have shown.`,
  (name) => `The keeper guesses right and makes the save! ${name} sinks to his knees.`,
  (name) => `Weak penalty from ${name} — easy save for the keeper!`,
  (name) => `${name} slips in his run-up — straight at the keeper. What a miss.`,
  (name) => `${name} sends it way over! He'll be having nightmares about that.`,
];

const COMMENTARY_PEN_SD = [
  `SUDDEN DEATH! Next to miss goes out!`,
  `Into sudden death. One miss and it's all over.`,
  `The tension is unbearable. Sudden death penalties now.`,
];

const COMMENTARY_INJURY = [
  (p, t) => `${p} goes down and stays down — ${t} will be worried. He looks to be struggling with his hamstring.`,
  (p, t) => `${p} is receiving treatment on the pitch. This doesn't look good for ${t}.`,
  (p, t) => `${p} pulls up sharply! He's holding his knee — could be a problem for ${t}.`,
  (p, t) => `Tough luck for ${t} — ${p} limps off after pulling his calf. He won't finish this one.`,
  (p, t) => `${p} is down injured. The physio is on. ${t} will be hoping it's nothing serious — but it doesn't look that way.`,
  (p, t) => `A concerned look on the ${t} bench as ${p} goes down clutching his ankle. He looks in real discomfort.`,
  (p, t) => `${p} signals he can't continue. A blow for ${t} — he'll be assessed after the match.`,
];

const POS_PRIORITY = {
  GK:  ["GK"],
  CB:  ["CB", "LB", "RB", "DM", "CM"],
  LB:  ["LB", "RB", "CB", "DM", "CM"],
  RB:  ["RB", "LB", "CB", "DM", "CM"],
  DM:  ["DM", "CM", "CB"],
  CM:  ["CM", "CAM", "DM", "LM", "RM", "LW", "RW"],
  CAM: ["CAM", "CM", "RM", "LM", "LW", "RW"],
  RM:  ["RM", "RW", "CM", "CAM"],
  LM:  ["LM", "LW", "CM", "CAM"],
  LW:  ["LW", "LM", "RW", "RM", "CAM", "CM", "ST"],
  RW:  ["RW", "RM", "LW", "LM", "CAM", "CM", "ST"],
  ST:  ["ST", "LW", "RW", "CAM"],
};

export function buildEffectiveSquad(manager, playerAbsences) {
  if (!playerAbsences || Object.keys(playerAbsences).length === 0) return manager.squad;
  const starters = manager.squad.slice(0, 11).map(p => p || null);
  const bench = manager.squad.slice(11, 16).filter(p => p);
  const usedFromBench = new Set();
  const effectiveStarters = starters.map(p => {
    if (!p || !playerAbsences[p.name]) return p;
    const priority = POS_PRIORITY[p.pos] || Object.keys(POS_PRIORITY);
    let replacement = null;
    for (const posGroup of priority) {
      replacement = bench.find(b => b.pos === posGroup && !usedFromBench.has(b.name) && !playerAbsences[b.name]);
      if (replacement) break;
    }
    if (!replacement) replacement = bench.find(b => !usedFromBench.has(b.name) && !playerAbsences[b.name]);
    if (replacement) { usedFromBench.add(replacement.name); return replacement; }
    return null;
  });
  const remainingBench = bench.filter(b => !usedFromBench.has(b.name));
  return [...effectiveStarters, ...remainingBench];
}

function goalContext(forGoals, againstGoals) {
  // Called BEFORE incrementing the scorer's tally
  if (forGoals === againstGoals) return "lead";
  if (forGoals + 1 === againstGoals) return "equaliser";
  if (forGoals > againstGoals) return "extend";
  return "pullback";
}

const DEFENSIVE_POS = new Set(["GK", "RB", "LB", "CB", "DM"]);

function buildRatings(squad, side, allEvents, conceded, won, drew) {
  return squad.slice(0, 11).filter(Boolean).map(p => {
    const goals = allEvents.filter(e => e.type === "goal" && e.team === side && e.scorer === p.name).length;
    const assists = allEvents.filter(e => e.type === "goal" && e.team === side && e.assister === p.name).length;
    const yellow = allEvents.some(e => e.type === "yellow" && e.team === side && e.player === p.name);
    const red = allEvents.some(e => e.type === "red" && e.team === side && e.player === p.name);

    let r = 6.2 + (p.rating - 80) * 0.04 + Math.random() * 0.9;
    r += goals * 1.2;
    r += assists * 0.5;
    if (yellow) r -= 0.4;
    if (red) r -= 1.8;
    r += won ? 0.4 : drew ? 0 : -0.4;
    if (DEFENSIVE_POS.has(p.pos) && conceded === 0) r += 0.8;
    else if (DEFENSIVE_POS.has(p.pos) && conceded >= 3) r -= 0.5;
    r = Math.min(10, Math.max(3.5, Math.round(r * 10) / 10));

    return { name: p.name, pos: p.pos, rating: r, goals, assists, yellow, red };
  });
}

function buildSummary({ homeName, awayName, score, penWinner, allEvents }) {
  const winnerSide = penWinner || (score.home > score.away ? "home" : score.away > score.home ? "away" : null);
  const winner = winnerSide === "home" ? homeName : awayName;
  const loser = winnerSide === "home" ? awayName : homeName;
  const scoreline = `${score.home}–${score.away}`;
  const margin = Math.abs(score.home - score.away);

  const sentences = [];
  if (penWinner) {
    sentences.push(`Nothing could separate the sides after 120 minutes at ${scoreline}, but ${winner} held their nerve in the shootout to break ${loser} hearts.`);
  } else if (margin >= 3) {
    sentences.push(`${winner} ran riot, thrashing ${loser} ${scoreline} in a one-sided affair.`);
  } else if (margin === 2) {
    sentences.push(`${winner} impressed in a comfortable ${scoreline} win over ${loser}.`);
  } else {
    sentences.push(`${winner} edged a tight contest ${scoreline} against ${loser}.`);
  }

  const winnerGoals = allEvents.filter(e => e.type === "goal" && e.team === winnerSide);
  const tally = {};
  winnerGoals.forEach(e => { tally[e.scorer] = (tally[e.scorer] || 0) + 1; });
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const [name, n] = top;
    if (n >= 3) sentences.push(`${name} stole the show with a hat-trick.`);
    else if (n === 2) sentences.push(`${name} did the damage with a brace.`);
    else if (winnerGoals.length === 1) sentences.push(`${name}'s strike in the ${winnerGoals[0].min}th minute proved decisive.`);
  }

  const reds = allEvents.filter(e => e.type === "red");
  if (reds.length) {
    const r = reds[0];
    sentences.push(`${r.player}'s second-yellow dismissal soured the day for ${r.team === "home" ? homeName : awayName}.`);
  }

  return sentences.join(" ");
}

// Manager-style commentary inserts, keyed by style
const MGR_STYLE_COMMENTARY = {
  pressing: [
    (mgr, team) => `${team} hunting in packs — ${mgr}'s trademark press forcing a mistake.`,
    (mgr, team) => `Relentless from ${team}. ${mgr} would love that pressing trigger.`,
    (mgr, team) => `${team} win it high up the pitch. Classic ${mgr} — suffocating the opposition.`,
    (mgr, team) => `The intensity is incredible. This is exactly the heavy-metal football ${mgr} demands.`,
  ],
  counter: [
    (mgr, team) => `${team} absorbing pressure and waiting for their moment — the ${mgr} way.`,
    (mgr, team) => `Compact and disciplined. ${mgr}'s defensive masterclass is in full effect.`,
    (mgr, team) => `${team} spring the counter with real pace. ${mgr} drilled them well.`,
    (mgr, team) => `Just what ${mgr} would have wanted — shape, discipline, and the threat on the break.`,
  ],
  attacking: [
    (mgr, team) => `${team} pouring forward again — ${mgr} wants goals, not caution.`,
    (mgr, team) => `No fear from ${team}. ${mgr} has given them licence to attack.`,
    (mgr, team) => `End to end stuff and ${team} are loving it. This is ${mgr}'s kind of game.`,
    (mgr, team) => `${mgr} animated on the touchline — he wants MORE from ${team}.`,
  ],
  possession: [
    (mgr, team) => `${team} pinging it around beautifully. ${mgr} in his element.`,
    (mgr, team) => `The opposition can't get near the ball. ${mgr}'s possession game strangling them.`,
    (mgr, team) => `Thirty passes and counting. ${mgr} wants to suffocate them into submission.`,
    (mgr, team) => `${team} content to wait for the right moment — ${mgr}'s patient philosophy on display.`,
  ],
  direct: [
    (mgr, team) => `Long ball over the top — ${mgr} keeping it simple and effective.`,
    (mgr, team) => `${team} winning the second balls. ${mgr} set them up to fight for everything.`,
    (mgr, team) => `Aerial duel won by ${team}. ${mgr} has identified their weakness in the air.`,
    (mgr, team) => `Dead ball situation for ${team}. Set pieces are ${mgr}'s bread and butter.`,
  ],
  wildcard: [
    (mgr, team) => `Completely unpredictable from ${team}. Nobody knows what ${mgr} is going to do next — including ${mgr}.`,
    (mgr, team) => `${team} switching shape mid-move. The chaos is the plan under ${mgr}.`,
    (mgr, team) => `What is ${mgr} doing with that formation?! Somehow it's working.`,
    (mgr, team) => `${team} just threw the tactical manual out the window. ${mgr} strikes again.`,
  ],
};

const MGR_MOTM_LINES = {
  pressing:   (mgr, team) => `A typical ${mgr} performance — relentless pressing and clinical execution.`,
  counter:    (mgr, team) => `A classic ${mgr} clean sheet — the defensive masterclass continues.`,
  attacking:  (mgr, team) => `Pure ${mgr} — attacking from the first whistle to the last.`,
  possession: (mgr, team) => `Just what ${mgr} wants — total control through possession.`,
  direct:     (mgr, team) => `Exactly the ${mgr} blueprint — physical, direct, and brutally effective.`,
  wildcard:   (mgr, team) => `Only ${mgr} could have planned that. Or perhaps didn't.`,
};

// Style matchup soft bonuses: [advantaged style][disadvantaged style] = +3 eff strength
const STYLE_MATCHUP = {
  pressing:   { direct: true, wildcard: true },
  possession: { pressing: true },
  counter:    { possession: true, attacking: true },
  attacking:  { direct: true },
  direct:     { counter: true },
};

function styleMatchupBonus(myStyle, oppStyle) {
  if (!myStyle || !oppStyle) return 0;
  return STYLE_MATCHUP[myStyle]?.[oppStyle] ? 3 : 0;
}

function cohesionBonus(squad, mgr) {
  if (!mgr?.preferredArchetypes?.length) return 0;
  const starters = squad.slice(0, 11).filter(Boolean);
  if (!starters.length) return 0;
  const matches = starters.filter(p => mgr.preferredArchetypes.includes(p.archetype)).length;
  const pct = matches / starters.length;
  return pct * 5; // up to +5 at 100% cohesion
}

// Commentary lines for the new systems
const COHESION_COMMENTARY = [
  (mgr, team) => `${team}'s players look perfectly suited to ${mgr}'s system — real cohesion on display.`,
  (mgr, team) => `${mgr} has assembled exactly the profile of player he craves. ${team} look fluid and purposeful.`,
  (mgr, team) => `You can see the understanding in ${team}'s movement. ${mgr}'s philosophy runs through this squad.`,
];
const MOMENTUM_COMMENTARY_WIN = [
  (team, mgr) => `${team} carry the momentum from the first leg — ${mgr} will have drilled this into them all week.`,
  (team, mgr) => `The first-leg result is in their heads. ${team} believing right now under ${mgr}.`,
  (team, mgr) => `${mgr}'s team rode that first-leg wave beautifully. ${team} looking full of confidence.`,
];
const MOMENTUM_COMMENTARY_LOSS = [
  (team, mgr) => `${team} have a mountain to climb — ${mgr} needs a reaction and needs it now.`,
  (team, mgr) => `The first-leg defeat is a weight on ${team}'s shoulders. ${mgr} will have to rally his players.`,
  (team, mgr) => `${team} desperate to overturn the deficit. ${mgr} demanding an immediate response.`,
];
const STYLE_MATCHUP_COMMENTARY = [
  (myTeam, oppTeam) => `${myTeam} exploiting exactly the space ${oppTeam} leaves — the tactical matchup firmly in their favour.`,
  (myTeam, oppTeam) => `${oppTeam} struggling to cope with the shape ${myTeam} are deploying. A real mismatch developing here.`,
  (myTeam, oppTeam) => `Tactically, ${myTeam} have found the blueprint to unlock ${oppTeam}'s system. Fascinating.`,
];

function generatePreMatchNarrative(draft, homeIdx, awayIdx, seriesContext) {
  if (!seriesContext || !draft?.series) return null;
  const { series, managers, tournamentStats } = draft;
  const hm = managers[homeIdx], am = managers[awayIdx];
  const homeName = hm.teamName || hm.clubName || hm.name;
  const awayName = am.teamName || am.clubName || am.name;
  const hmFm = hm.footballManager, amFm = am.footballManager;
  const hmFmName = hmFm ? hmFm.name.split(" ").pop() : null;
  const amFmName = amFm ? amFm.name.split(" ").pop() : null;

  function topScorerFor(mgrIndices) {
    if (!tournamentStats) return null;
    return Object.entries(tournamentStats)
      .filter(([, s]) => mgrIndices.includes(s.managerIdx) && s.goals > 0)
      .sort((a, b) => b[1].goals - a[1].goals)[0] || null;
  }
  function topScorerOverall() {
    if (!tournamentStats) return null;
    return Object.entries(tournamentStats)
      .filter(([, s]) => s.goals > 0)
      .sort((a, b) => b[1].goals - a[1].goals)[0] || null;
  }
  function mgrTeamRef(fmName, teamName, style) {
    const styleDescriptions = {
      pressing: `${fmName}'s high-press side`,
      counter: `${fmName}'s disciplined outfit`,
      attacking: `${fmName}'s attack-minded ${teamName}`,
      possession: `${fmName}'s possession-hungry ${teamName}`,
      direct: `${fmName}'s direct, physical ${teamName}`,
      wildcard: `the unpredictable ${teamName} under ${fmName}`,
    };
    return styleDescriptions[style] || `${fmName}'s ${teamName}`;
  }

  const sentences = [];

  if (series.format === "tournament" || series.format === "tournament8") {
    // Quarter-final (tournament8 only — single leg)
    const qIdx = (series.quarters || []).findIndex(q =>
      q.p.includes(homeIdx) && q.p.includes(awayIdx)
    );
    if (qIdx >= 0) {
      if (seriesContext?.isLeg1) {
        sentences.push(`Quarter-final first leg — ${homeName} host ${awayName}. The second leg awaits on their travels.`);
      } else {
        const agg = series.quarters[qIdx];
        const homeAgg = seriesContext?.legContext?.homeAgg ?? 0;
        const awayAgg = seriesContext?.legContext?.awayAgg ?? 0;
        if (homeAgg > awayAgg) {
          sentences.push(`Quarter-final second leg — ${awayName} trail ${awayAgg}–${homeAgg} from the first leg. They need a comeback tonight.`);
        } else if (awayAgg > homeAgg) {
          sentences.push(`Quarter-final second leg — ${homeName} trail ${homeAgg}–${awayAgg} from the first leg. They must turn it around at home.`);
        } else {
          sentences.push(`Quarter-final second leg — level ${homeAgg}–${awayAgg} on aggregate. Everything to play for tonight.`);
        }
      }
      if (hmFmName && amFmName) {
        sentences.push(`${hmFmName} against ${amFmName} — two managers who know what's at stake.`);
      } else if (hmFmName) {
        sentences.push(`${mgrTeamRef(hmFmName, homeName, hmFm.style)} welcome the challenge of a knockout tie.`);
      } else if (amFmName) {
        sentences.push(`${amFmName} brings his side here desperate to reach the last four.`);
      }
    }

    const semiIdx = (series.semis || []).findIndex(sm =>
      sm.p.includes(homeIdx) && sm.p.includes(awayIdx)
    );
    if (semiIdx >= 0) {
      const sm = series.semis[semiIdx];
      const otherSemi = series.semis[1 - semiIdx];
      const otherFinalist = otherSemi?.winner != null ? managers[otherSemi.winner] : null;
      const otherFinalistName = otherFinalist ? (otherFinalist.teamName || otherFinalist.name) : null;

      if (sm.legsPlayed === 0) {
        if (otherFinalistName) {
          sentences.push(`${homeName} and ${awayName} kick off their semi-final tonight knowing ${otherFinalistName} are already waiting in the grand final.`);
        } else {
          sentences.push(`The semi-finals are underway — ${homeName} welcome ${awayName} for the first leg of what promises to be a mouthwatering tie.`);
        }
        if (hmFmName && amFmName) {
          sentences.push(`${hmFmName} and ${amFmName} go head to head — two very different football philosophies about to collide.`);
        } else if (hmFmName) {
          sentences.push(`All eyes on ${hmFmName} tonight — can ${mgrTeamRef(hmFmName, homeName, hmFm.style)} take a crucial first-leg advantage?`);
        } else if (amFmName) {
          sentences.push(`${amFmName} brings his side here with one objective: leave with an advantage heading into the second leg.`);
        }
      } else {
        // Leg 2
        const homeAgg = sm.goals[1], awayAgg = sm.goals[0];
        const tieScorer = topScorerFor(sm.p);
        const margin = Math.abs(homeAgg - awayAgg);
        const slender = margin === 1 ? "slender " : "";

        if (homeAgg > awayAgg) {
          if (otherFinalistName) {
            sentences.push(`${homeName} will be hoping to join ${otherFinalistName} in the final tonight, taking a ${slender}${homeAgg}–${awayAgg} aggregate lead into the second leg.`);
          } else {
            sentences.push(`${homeName} hold a ${slender}${homeAgg}–${awayAgg} aggregate advantage — ${awayName} must overturn the deficit or go home.`);
          }
          if (tieScorer) {
            const hitFor = managers[tieScorer[1].managerIdx];
            const hitName = hitFor?.teamName || hitFor?.name || "";
            sentences.push(`${tieScorer[0]} broke the deadlock in the first leg${tieScorer[1].goals > 1 ? ` and leads the tie with ${tieScorer[1].goals} goals` : ""} for ${hitName}.`);
          }
          if (amFmName) sentences.push(`${amFmName} needs an immediate response — there is no tomorrow.`);
        } else if (awayAgg > homeAgg) {
          if (otherFinalistName) {
            sentences.push(`${awayName} are hoping to join ${otherFinalistName} in the grand final, holding a ${slender}${awayAgg}–${homeAgg} aggregate lead going into the second leg at ${homeName}.`);
          } else {
            sentences.push(`${awayName} arrive here with a ${slender}${awayAgg}–${homeAgg} lead on aggregate — ${homeName} have a mountain to climb.`);
          }
          if (tieScorer) {
            sentences.push(`${tieScorer[0]}'s crucial away goal in the first leg has put${tieScorer[1].goals > 1 ? ` ${tieScorer[1].goals} goals in the tie and` : ""} ${managers[tieScorer[1].managerIdx]?.teamName || ""} in the driving seat.`);
          }
          if (hmFmName) sentences.push(`${hmFmName} will demand a reaction from ${homeName} — they cannot afford to go out without a fight.`);
          else sentences.push(`${homeName} must attack from the first whistle. A draw is not enough.`);
        } else {
          if (otherFinalistName) {
            sentences.push(`${otherFinalistName} are in the final and waiting. Tonight, ${homeName} and ${awayName} — level at ${homeAgg}–${awayAgg} on aggregate — decide who joins them.`);
          } else {
            sentences.push(`Perfectly poised. After the first leg, ${homeName} and ${awayName} are level at ${homeAgg}–${awayAgg} on aggregate — everything to play for.`);
          }
          if (tieScorer) sentences.push(`${tieScorer[0]} found the net in the first leg, but the tie remains in the balance.`);
          sentences.push(`Extra time and penalties loom if neither side can break the deadlock tonight.`);
        }
      }
    } else if (series.final) {
      const topScorer = topScorerOverall();
      sentences.push(`This is it — the grand final. ${homeName} against ${awayName}.`);
      if (topScorer) {
        const scorerMgr = managers[topScorer[1].managerIdx];
        const scorerTeam = scorerMgr?.teamName || scorerMgr?.name || "";
        sentences.push(`${topScorer[0]} has lit up the tournament with ${topScorer[1].goals} goal${topScorer[1].goals !== 1 ? "s" : ""}${topScorer[1].assists > 0 ? ` and ${topScorer[1].assists} assist${topScorer[1].assists !== 1 ? "s" : ""}` : ""} for ${scorerTeam}.`);
      }
      if (hmFmName && amFmName) {
        sentences.push(`${hmFmName} against ${amFmName} — a tactical battle to decide the tournament.`);
      } else if (hmFmName) {
        sentences.push(`${mgrTeamRef(hmFmName, homeName, hmFm.style)} arrive as favourites — but ${awayName} didn't read the script.`);
      } else if (amFmName) {
        sentences.push(`${amFmName} leads ${awayName} into the biggest match of the tournament. ${homeName} will make them earn it.`);
      }
    }
  } else {
    // Series format
    const [p0, p1] = series.participants;
    const [w0, w1] = series.wins;
    const played = series.played ?? (w0 + w1);
    const hWins = homeIdx === p0 ? w0 : w1;
    const aWins = homeIdx === p0 ? w1 : w0;
    const draws = series.draws ?? 0;
    const target = series.target;
    const fmtStr = series.format === "bo3" ? "best-of-three" : series.format === "bo5" ? "best-of-five" : "best-of-seven";
    const topScorer = topScorerOverall();
    const topHome = topScorerFor([homeIdx]);
    const topAway = topScorerFor([awayIdx]);
    const isTiebreaker = series.stage === "tiebreaker";

    if (played === 0) {
      if (hmFmName && amFmName) {
        sentences.push(`${mgrTeamRef(hmFmName, homeName, hmFm.style)} kick off this ${fmtStr} series against ${mgrTeamRef(amFmName, awayName, amFm.style)} — two managers, one trophy.`);
      } else {
        sentences.push(`${homeName} and ${awayName} get their ${fmtStr} series underway. First to ${target} wins takes it all.`);
      }
      if (hmFmName) {
        const openers = {
          pressing: `Expect ${hmFmName} to set the tempo early — ${homeName} will press hard from the first whistle.`,
          counter: `${hmFmName} will set up compact and patient — dangerous on the counter.`,
          attacking: `${hmFmName} won't be cautious. ${homeName} come here to score.`,
          possession: `${hmFmName}'s ${homeName} will look to dominate the ball and suffocate ${awayName}.`,
          direct: `${hmFmName} keeps it simple — ${homeName} will look to win the physical battle.`,
          wildcard: `Nobody quite knows what ${hmFmName} will conjure up tonight. That's rather the point.`,
        };
        if (openers[hmFm.style]) sentences.push(openers[hmFm.style]);
      }
    } else if (isTiebreaker) {
      sentences.push(`It all comes down to this. ${homeName} and ${awayName} are locked at ${hWins}–${aWins} in the ${fmtStr} — one match decides everything.`);
      if (topScorer) {
        const sc = managers[topScorer[1].managerIdx];
        sentences.push(`${topScorer[0]} has been the standout performer across the series with ${topScorer[1].goals} goal${topScorer[1].goals !== 1 ? "s" : ""} for ${sc?.teamName || sc?.name || ""}.`);
      }
      const fm = hmFmName || amFmName;
      const fmTeam = hmFmName ? homeName : awayName;
      if (fm) sentences.push(`${fm} has come this far — ${fmTeam} will not go quietly.`);
    } else if (hWins === aWins) {
      sentences.push(`Level at ${hWins}–${aWins} in the ${fmtStr} — ${homeName} and ${awayName} couldn't be more evenly matched heading into match ${played + 1}.`);
      if (topScorer) {
        const sc = managers[topScorer[1].managerIdx];
        sentences.push(`${topScorer[0]} leads the scoring charts with ${topScorer[1].goals} in the series for ${sc?.teamName || sc?.name || ""}.`);
      }
      if (draws > 0) sentences.push(`${draws} draw${draws > 1 ? "s" : ""} have left this series delicately balanced — tonight, someone has to blink first.`);
    } else if (hWins > aWins) {
      if (target - hWins === 1) {
        sentences.push(`${homeName} are one win from glory, leading the ${fmtStr} ${hWins}–${aWins}. ${awayName} must win or go home.`);
        if (topHome) sentences.push(`${topHome[0]} has been pivotal with ${topHome[1].goals} goal${topHome[1].goals !== 1 ? "s" : ""} in the series.`);
        if (amFmName) sentences.push(`${amFmName} needs a response — and it has to come tonight.`);
        else sentences.push(`${awayName} cannot allow another defeat. Everything is on the line.`);
      } else {
        sentences.push(`${homeName} lead ${hWins}–${aWins} in the ${fmtStr} and are building real momentum heading into match ${played + 1}.`);
        if (topHome) sentences.push(`The ${homeName} attack has been in fine form — ${topHome[0]} with ${topHome[1].goals} goal${topHome[1].goals !== 1 ? "s" : ""} to show for it.`);
        if (amFmName) sentences.push(`${amFmName} needs a reaction from ${awayName} before this series slips away.`);
      }
    } else {
      if (target - aWins === 1) {
        sentences.push(`${awayName} are a single win from the title, leading ${aWins}–${hWins} in the ${fmtStr}. ${homeName} have their backs against the wall.`);
        if (topAway) sentences.push(`${topAway[0]} has been the difference-maker with ${topAway[1].goals} goal${topAway[1].goals !== 1 ? "s" : ""} for ${awayName}.`);
        if (hmFmName) sentences.push(`${hmFmName} must galvanise ${homeName} tonight — or the series is over.`);
        else sentences.push(`${homeName} cannot afford another loss. Tonight is a must-win.`);
      } else {
        sentences.push(`${awayName} have taken a ${aWins}–${hWins} series lead and now come to ${homeName} looking to extend their advantage in match ${played + 1}.`);
        if (topAway) sentences.push(`${topAway[0]} has caught the eye for ${awayName} with ${topAway[1].goals} goal${topAway[1].goals !== 1 ? "s" : ""} in the series.`);
        if (hmFmName) sentences.push(`${hmFmName}'s ${homeName} haven't been at their best — but there's still everything to play for.`);
      }
    }
  }

  return sentences.slice(0, 3).join(" ");
}

// legContext = { homeAgg, awayAgg } when this is leg 2 of an aggregate tie.
// ET/pens trigger on aggregate level rather than match level.
// isLeg1 = true suppresses ET entirely (leg 1 of a 2-legged tie is always 90 min).
// homeTactics / awayTactics: "defensive" | "balanced" | "attacking"
// seriesContext = { homePrevResult: "win"|"loss"|null, awayPrevResult: "win"|"loss"|null } for momentum
export function generateEvents(homeSquad, awaySquad, homeName, awayName, legContext = null, homeFootballMgr = null, awayFootballMgr = null, isLeg1 = false, homeTactics = "balanced", awayTactics = "balanced", seriesContext = null, matchMinutes = 90) {
  // Resolve wildcard: pick a random style for the match
  function resolveStyle(fm) {
    if (!fm) return null;
    if (fm.style === "wildcard") {
      const styles = ["pressing", "counter", "attacking", "possession", "direct"];
      return styles[Math.floor(Math.random() * styles.length)];
    }
    return fm.style;
  }
  const hStyle = resolveStyle(homeFootballMgr);
  const aStyle = resolveStyle(awayFootballMgr);

  // Tier modifiers
  const hTierMod = homeFootballMgr ? (TIER_SIM_MODIFIER[homeFootballMgr.tier] ?? 0) : 0;
  const aTierMod = awayFootballMgr ? (TIER_SIM_MODIFIER[awayFootballMgr.tier] ?? 0) : 0;

  const hStr = teamStrength(homeSquad);
  const aStr = teamStrength(awaySquad);
  const hAttStr = teamAttStrength(homeSquad);
  const aAttStr = teamAttStrength(awaySquad);
  const hDefStr = teamDefStrength(homeSquad);
  const aDefStr = teamDefStrength(awaySquad);

  // Style modifiers on effective team strength
  function styleStrengthBonus(style, isHome) {
    if (!style) return 0;
    // possession reduces opponent shot volume (simulated by buffing own "strength")
    // pressing boosts midfield effectiveness slightly
    // attacking boosts scoring tendency
    // counter shifts baseline rather than raw str
    // direct is neutral on raw str
    if (style === "possession") return isHome ? 1.5 : 0;
    if (style === "pressing")   return isHome ? 1.0 : 0;
    if (style === "attacking")  return isHome ? 0.5 : 0;
    return 0;
  }

  // Possession ratio: attacking gets more of the ball, defensive less
  const TACTICS_MOD = { attacking: 0.05, balanced: 0, defensive: -0.04 };
  const tacticsDelta = (TACTICS_MOD[homeTactics] ?? 0) - (TACTICS_MOD[awayTactics] ?? 0);

  // Attribute modifiers: attacking boosts effective att but opens up defensively, and vice versa
  const TACTICS_ATT_MOD = { attacking: +8, balanced: 0, defensive: -6 };
  const TACTICS_DEF_MOD = { attacking: -6, balanced: 0, defensive: +8 };
  const hEffAttStr = hAttStr + (TACTICS_ATT_MOD[homeTactics] ?? 0);
  const aEffAttStr = aAttStr + (TACTICS_ATT_MOD[awayTactics] ?? 0);
  const hEffDefStr = hDefStr + (TACTICS_DEF_MOD[homeTactics] ?? 0);
  const aEffDefStr = aDefStr + (TACTICS_DEF_MOD[awayTactics] ?? 0);

  // Cohesion bonuses (squad archetype alignment with manager philosophy)
  const hCohesion = cohesionBonus(homeSquad, homeFootballMgr);
  const aCohesion = cohesionBonus(awaySquad, awayFootballMgr);

  // Style matchup bonuses
  const hMatchupBonus = styleMatchupBonus(hStyle, aStyle);
  const aMatchupBonus = styleMatchupBonus(aStyle, hStyle);

  // Momentum (±1 from previous match result in series)
  const hMomentum = seriesContext?.homePrevResult === "win" ? 1 : seriesContext?.homePrevResult === "loss" ? -1 : 0;
  const aMomentum = seriesContext?.awayPrevResult === "win" ? 1 : seriesContext?.awayPrevResult === "loss" ? -1 : 0;

  const hEffStr = hStr + styleStrengthBonus(hStyle, true) + hTierMod * 50 + hCohesion + hMatchupBonus + hMomentum;
  const aEffStr = aStr + styleStrengthBonus(aStyle, true) + aTierMod * 50 + aCohesion + aMatchupBonus + aMomentum;
  // Logistic curve on the strength gap rather than a plain ratio — a consistent
  // rating gap now buys a real, compounding edge instead of washing out to ~50/50.
  const strTilt = 0.5 * Math.tanh((hEffStr - aEffStr) / 40);
  const ratio = Math.min(0.82, Math.max(0.18, 0.5 + strTilt + tacticsDelta));

  // Track which new commentary has been used this match (fire each at most once)
  let cohesionCommentaryFired = false;
  let momentumCommentaryFired = false;
  let matchupCommentaryFired = false;

  // Shuffle neutral lines once per match so no line repeats within a game.
  // With ~10 neutral events and 36 lines, repetition is extremely unlikely.
  const neutralPool = [...COMMENTARY_NEUTRAL].sort(() => Math.random() - 0.5);
  let neutralCursor = 0;
  function pickNeutral(a, b) {
    const fn = neutralPool[neutralCursor % neutralPool.length];
    neutralCursor++;
    return fn(a, b);
  }

  const events = [];

  // Inject early contextual commentary (minutes 2-15) for new systems
  const earlyMins = [];
  if (hMomentum === 1 && homeFootballMgr) {
    earlyMins.push({ min: rand(2, 10), text: pick(MOMENTUM_COMMENTARY_WIN)(homeName, homeFootballMgr.name.split(" ").pop()) });
  }
  if (aMomentum === 1 && awayFootballMgr) {
    earlyMins.push({ min: rand(2, 10), text: pick(MOMENTUM_COMMENTARY_WIN)(awayName, awayFootballMgr.name.split(" ").pop()) });
  }
  if (hMomentum === -1 && homeFootballMgr) {
    earlyMins.push({ min: rand(2, 10), text: pick(MOMENTUM_COMMENTARY_LOSS)(homeName, homeFootballMgr.name.split(" ").pop()) });
  }
  if (aMomentum === -1 && awayFootballMgr) {
    earlyMins.push({ min: rand(2, 10), text: pick(MOMENTUM_COMMENTARY_LOSS)(awayName, awayFootballMgr.name.split(" ").pop()) });
  }
  // Cohesion commentary for the team with higher cohesion (>60% match)
  const hCohesionPct = homeFootballMgr?.preferredArchetypes?.length
    ? homeSquad.slice(0, 11).filter(Boolean).filter(p => homeFootballMgr.preferredArchetypes.includes(p.archetype)).length / Math.max(1, homeSquad.slice(0, 11).filter(Boolean).length)
    : 0;
  const aCohesionPct = awayFootballMgr?.preferredArchetypes?.length
    ? awaySquad.slice(0, 11).filter(Boolean).filter(p => awayFootballMgr.preferredArchetypes.includes(p.archetype)).length / Math.max(1, awaySquad.slice(0, 11).filter(Boolean).length)
    : 0;
  if (hCohesionPct >= 0.6 && homeFootballMgr) {
    earlyMins.push({ min: rand(5, 20), text: pick(COHESION_COMMENTARY)(homeFootballMgr.name.split(" ").pop(), homeName) });
  }
  if (aCohesionPct >= 0.6 && awayFootballMgr) {
    earlyMins.push({ min: rand(5, 20), text: pick(COHESION_COMMENTARY)(awayFootballMgr.name.split(" ").pop(), awayName) });
  }
  // Style matchup commentary (fire once mid-match if there's a clear advantage)
  if (hMatchupBonus > 0) {
    earlyMins.push({ min: rand(25, 55), text: pick(STYLE_MATCHUP_COMMENTARY)(homeName, awayName) });
  } else if (aMatchupBonus > 0) {
    earlyMins.push({ min: rand(25, 55), text: pick(STYLE_MATCHUP_COMMENTARY)(awayName, homeName) });
  }
  for (const e of earlyMins) {
    events.push({ ...e, type: "commentary", poss: Math.round(ratio * 100) });
  }

  let hGoals = 0, aGoals = 0;
  let hShots = 0, aShots = 0;
  let hOnTarget = 0, aOnTarget = 0;
  let hFouls = 0, aFouls = 0;
  const hCards = [], aCards = [];
  const hBooked = new Set(), aBooked = new Set();
  const hSentOff = new Set(), aSentOff = new Set();
  let possH = ratio; // running possession [0,1], drifts per event

  const onPitch = (squad, sentOff) => squad.slice(0, 11).filter(p => p && !sentOff.has(p.name));

  const is5aside = homeSquad.filter(Boolean).length <= 5;
  // 5-a-side pitches are tiny — the ball is live constantly, so allow multiple
  // events per minute instead of deduping down to unique minutes like classic mode.
  const rawMinutes = Array.from({ length: is5aside ? rand(38, 55) : rand(18, 28) }, () => rand(1, matchMinutes));
  const minutes = (is5aside ? rawMinutes : [...new Set(rawMinutes)]).sort((a, b) => a - b);
  // Small-sided games have way more shots and far fewer stoppages than 11-a-side.
  const SHOT_THRESH = is5aside ? 0.48 : 0.32;
  const FOUL_THRESH = is5aside ? SHOT_THRESH + 0.09 : 0.45;

  // Style-influenced goal frequency modifiers
  function goalChanceBonus(isHome) {
    const style = isHome ? hStyle : aStyle;
    if (style === "attacking") return 0.05;
    if (style === "pressing")  return 0.02;
    if (style === "counter")   return 0.01;
    return 0;
  }
  function shotFrequencyBonus(isHome) {
    const style = isHome ? hStyle : aStyle;
    if (style === "attacking") return 0.04;  // more chances created
    if (style === "pressing")  return 0.02;
    return 0;
  }
  // Possession style reduces opponent's shot count (fewer events for opponent)
  function opponentShotPenalty(isHome) {
    const oppStyle = isHome ? aStyle : hStyle; // opponent's style
    if (oppStyle === "possession") return 0.04;
    return 0;
  }

  // Add manager-style commentary events at natural points
  function maybeStyleComment(isHome, min) {
    const fm = isHome ? homeFootballMgr : awayFootballMgr;
    const style = isHome ? hStyle : aStyle;
    if (!fm || !style || Math.random() > 0.28) return null;
    const pool = MGR_STYLE_COMMENTARY[style];
    if (!pool) return null;
    const mgrName = fm.name.split(" ").pop(); // last name
    const teamName = isHome ? homeName : awayName;
    return { min, type: "commentary", text: pick(pool)(mgrName, teamName) };
  }

  for (const min of minutes) {
    const r = Math.random();

    if (r < SHOT_THRESH) {
      const isHome = Math.random() < ratio;
      const team = isHome ? homeSquad : awaySquad;
      const teamName = isHome ? homeName : awayName;
      const side = isHome ? "home" : "away";
      const pitchPlayers = onPitch(team, isHome ? hSentOff : aSentOff);
      const pitchOutfield = pitchPlayers.filter(p => p.pos !== "GK");
      // ~15% of goals are aerial (headed) — scored by players with high aer attribute
      const isAerial = Math.random() < 0.15;
      const scorerPool = pitchOutfield.length > 0 ? pitchOutfield : pitchPlayers;
      const attacker = isAerial ? pickAerialScorer(scorerPool) : pickAttacker(scorerPool);
      const name = attacker ? attacker.name : "The striker";

      // Being a man (or more) down makes scoring harder
      const menDown = (isHome ? hSentOff.size : aSentOff.size) - (isHome ? aSentOff.size : hSentOff.size);
      // Goal chance: tactics-adjusted att vs def — attacking opens up play, defensive tightens it
      const attVsDef = isHome ? (hEffAttStr - aEffDefStr) : (aEffAttStr - hEffDefStr);
      const goalChance = (is5aside ? 0.45 : 0.38) + attVsDef * 0.004 - menDown * 0.08
        + goalChanceBonus(isHome) - opponentShotPenalty(isHome) + (isHome ? hTierMod : aTierMod);
      if (isHome) possH = Math.min(0.82, possH + 0.025); else possH = Math.max(0.18, possH - 0.025);
      if (Math.random() < goalChance) {
        const ctx = isHome ? goalContext(hGoals, aGoals) : goalContext(aGoals, hGoals);
        isHome ? hGoals++ : aGoals++;
        let assister = null;
        if (Math.random() < 0.72) {
          const assisterPlayer = pickAssister(pitchPlayers, name);
          assister = assisterPlayer?.name || null;
          var assisterIsGK = assisterPlayer?.pos === "GK";
        }
        const assistPool = assisterIsGK ? COMMENTARY_GOAL_ASSIST_GK : COMMENTARY_GOAL_ASSIST;
        const goalText = assister
          ? pick(assistPool)(assister, name, teamName)
          : pick(COMMENTARY_GOAL[ctx])(name, teamName);
        events.push({ min, type: "goal", team: side, scorer: name, assister, text: goalText, score: `${hGoals}–${aGoals}`, poss: Math.round(possH * 100) });
        if (isHome) { hShots++; hOnTarget++; } else { aShots++; aOnTarget++; }
      } else {
        events.push({ min, type: "miss", team: side, text: pick(COMMENTARY_MISS)(name), poss: Math.round(possH * 100) });
        if (isHome) hShots++; else aShots++;
        if (Math.random() < 0.5) { if (isHome) hOnTarget++; else aOnTarget++; }
      }
    } else if (r < FOUL_THRESH) {
      const isHome = Math.random() < 0.5;
      const team = isHome ? homeSquad : awaySquad;
      const booked = isHome ? hBooked : aBooked;
      const sentOff = isHome ? hSentOff : aSentOff;
      const pl = onPitch(team, sentOff);
      const target = pl[rand(0, pl.length - 1)];
      if (target) {
        possH = possH * 0.94 + ratio * 0.06;
        if (isHome) hFouls++; else aFouls++;
        // 5-a-side: no red cards — losing a fifth of your squad for the rest of
        // the tie (with no bench to cover) is too punishing for the format.
        if (is5aside) {
          if (!booked.has(target.name)) {
            booked.add(target.name);
            events.push({ min, type: "yellow", team: isHome ? "home" : "away", player: target.name, text: pick(COMMENTARY_CARD)(target.name), poss: Math.round(possH * 100) });
            if (isHome) hCards.push(target.name); else aCards.push(target.name);
          }
        } else if (booked.has(target.name)) {
          sentOff.add(target.name);
          events.push({ min, type: "red", team: isHome ? "home" : "away", player: target.name, text: pick(COMMENTARY_RED)(target.name, isHome ? homeName : awayName, 11 - sentOff.size), poss: Math.round(possH * 100) });
        } else {
          booked.add(target.name);
          events.push({ min, type: "yellow", team: isHome ? "home" : "away", player: target.name, text: pick(COMMENTARY_CARD)(target.name), poss: Math.round(possH * 100) });
          if (isHome) hCards.push(target.name); else aCards.push(target.name);
        }
      }
    } else {
      possH = possH * 0.94 + ratio * 0.06;
      const styleEv = maybeStyleComment(Math.random() < 0.5, min);
      const ev = styleEv || { min, type: "commentary", text: pickNeutral(homeName, awayName) };
      events.push({ ...ev, poss: Math.round(possH * 100) });
    }
  }

  // Injury events: one possible injury per team, fired at a random mid-match minute
  // We pick the player now (post loop so we know who stayed on), then inject a commentary event.
  // Skipped in 5-a-side — losing a fifth of a 5-player squad with no bench cover is too harsh.
  const matchInjuries = []; // { name, team: "home"|"away" }
  for (const [squad, side, teamName] of is5aside ? [] : [[homeSquad, "home", homeName], [awaySquad, "away", awayName]]) {
    if (Math.random() < 0.08) {
      const eligible = squad.slice(0, 11).filter(p => p);
      if (eligible.length > 0) {
        const victim = pick(eligible);
        const injMin = rand(20, 88);
        events.push({ min: injMin, type: "injury", team: side, player: victim.name, text: pick(COMMENTARY_INJURY)(victim.name, teamName), poss: Math.round(possH * 100) });
        matchInjuries.push({ name: victim.name, team: side });
      }
    }
  }
  // Re-sort events by minute after injection
  events.sort((a, b) => a.min - b.min);

  let etEvents = [];
  let penWinner = null;
  let finalHome = hGoals, finalAway = aGoals;

  // In aggregate mode ET triggers when the overall tie is level, not just this match.
  // Leg 1 never has ET — it's always a straight 90-minute result.
  const aggHome = () => finalHome + (legContext?.homeAgg ?? 0);
  const aggAway = () => finalAway + (legContext?.awayAgg ?? 0);
  // ET fires: aggregate tie in leg 2, series tiebreaker, or standalone match level.
  // Regular series matches (bo3/bo5/bo7) allow draws — no ET.
  const isSeriesTiebreaker = seriesContext?.isSeriesTiebreaker ?? false;
  const isRegularSeriesMatch = !!seriesContext && !isSeriesTiebreaker && !legContext && !seriesContext.isTournamentKnockout;
  const skipToShootout = seriesContext?.skipToShootout ?? false;
  const needsET = !isLeg1 && !isRegularSeriesMatch && !skipToShootout && (legContext ? aggHome() === aggAway() : hGoals === aGoals);
  const needsShootout = skipToShootout && hGoals === aGoals;

  if (needsShootout) {
    etEvents.push({ min: matchMinutes, type: "commentary", text: `FULL TIME — ${hGoals}–${aGoals}. It's level — straight to penalties!`, penStartPause: true });
  }

  if (needsET) {
    const ftNote = legContext
      ? `FULL TIME — ${hGoals}–${aGoals} on the night. ${aggHome()}–${aggAway()} on aggregate. EXTRA TIME!`
      : `FULL TIME — ${hGoals}–${aGoals}. Extra time!`;
    etEvents.push({ min: matchMinutes, type: "commentary", text: ftNote });
    const etEnd = matchMinutes + 15;
    const etQ = Math.floor((etEnd - matchMinutes) / 4);
    const etMinutes = [
      rand(matchMinutes + 1, matchMinutes + etQ),
      rand(matchMinutes + etQ + 1, matchMinutes + etQ * 2),
      rand(matchMinutes + etQ * 2 + 1, matchMinutes + etQ * 3),
      rand(matchMinutes + etQ * 3 + 1, etEnd),
    ];
    for (const min of etMinutes) {
      if (Math.random() < 0.2) {
        const isHome = Math.random() < ratio;
        const team = isHome ? homeSquad : awaySquad;
        const teamName = isHome ? homeName : awayName;
        const side = isHome ? "home" : "away";
        const etPitch = onPitch(team, isHome ? hSentOff : aSentOff);
        const etOutfield = etPitch.filter(p => p.pos !== "GK");
        const etAttacker = pickAttacker(etOutfield.length > 0 ? etOutfield : etPitch);
        const name = etAttacker ? etAttacker.name : "The striker";
        if (Math.random() < 0.45) {
          const ctx = isHome ? goalContext(finalHome, finalAway) : goalContext(finalAway, finalHome);
          isHome ? finalHome++ : finalAway++;
          let etAssister = null;
          let etAssisterIsGK = false;
          if (Math.random() < 0.72) {
            const etAssisterPlayer = pickAssister(etPitch, name);
            etAssister = etAssisterPlayer?.name || null;
            etAssisterIsGK = etAssisterPlayer?.pos === "GK";
          }
          const etAssistPool = etAssisterIsGK ? COMMENTARY_GOAL_ASSIST_GK : COMMENTARY_GOAL_ASSIST;
          const etGoalText = etAssister
            ? pick(etAssistPool)(etAssister, name, teamName)
            : pick(COMMENTARY_GOAL[ctx])(name, teamName);
          etEvents.push({ min, type: "goal", team: side, scorer: name, assister: etAssister, text: etGoalText, score: `${finalHome}–${finalAway}` });
        } else {
          etEvents.push({ min, type: "miss", team: side, text: pick(COMMENTARY_MISS)(name) });
        }
      } else {
        etEvents.push({ min, type: "commentary", text: pick(COMMENTARY_NEUTRAL)(homeName, awayName) });
      }
    }

    const stillLevel = legContext ? aggHome() === aggAway() : finalHome === finalAway;
    if (stillLevel) {
      etEvents.push({ min: matchMinutes + 15, type: "commentary", text: `FULL TIME EXTRA TIME — ${finalHome}–${finalAway}. PENALTY SHOOTOUT!`, penStartPause: true });
    }
  }

  // Penalties: reached either after ET (still level) or directly (skipToShootout)
  const afterETLevel = needsET && (legContext ? aggHome() === aggAway() : finalHome === finalAway);
  if (afterETLevel || needsShootout) {
    const penMin = needsShootout ? matchMinutes : matchMinutes + 15;

    // Success scales gently with the taker's finishing — a stacked attack still
    // has to convert its pens, but it's no longer a flat coin flip for everyone.
    function penSuccessChance(taker) {
      if (!taker) return 0.76;
      const att = deriveAttributes(taker).att;
      return Math.min(0.90, Math.max(0.55, 0.68 + (att - 70) * 0.003));
    }
    const NUM_KICKS = 5;
    // Best attacking players take pens first
    const byAtt = ps => [...ps].sort((a, b) => deriveAttributes(b).att - deriveAttributes(a).att);
    const hOF = byAtt(homeSquad.slice(0, 11).filter(p => p && p.pos !== "GK"));
    const aOF = byAtt(awaySquad.slice(0, 11).filter(p => p && p.pos !== "GK"));
    const hFallback = homeSquad.slice(0, 11).filter(Boolean);
    const aFallback = awaySquad.slice(0, 11).filter(Boolean);
    const hOrder = hOF.length ? hOF : hFallback;
    const aOrder = aOF.length ? aOF : aFallback;

    let hPens = 0, aPens = 0;
    let penDone = false;

    for (let round = 0; round < NUM_KICKS && !penDone; round++) {
      // Home kick
      const hTaker = hOrder[round % Math.max(1, hOrder.length)];
      const hName = hTaker?.name || "The taker";
      const hScored = Math.random() < penSuccessChance(hTaker);
      if (hScored) hPens++;
      etEvents.push({
        min: penMin, type: hScored ? "pen_goal" : "pen_miss", team: "home",
        scorer: hScored ? hName : null,
        text: hScored ? pick(COMMENTARY_PEN_SCORED)(hName) : pick(COMMENTARY_PEN_MISSED)(hName),
        penScore: `${hPens}–${aPens}`,
      });
      // Early clinch check: away can't catch up even scoring all remaining kicks
      if (hPens > aPens + (NUM_KICKS - round)) { penDone = true; penWinner = "home"; break; }

      // Away kick
      const aTaker = aOrder[round % Math.max(1, aOrder.length)];
      const aName = aTaker?.name || "The taker";
      const aScored = Math.random() < penSuccessChance(aTaker);
      if (aScored) aPens++;
      etEvents.push({
        min: penMin, type: aScored ? "pen_goal" : "pen_miss", team: "away",
        scorer: aScored ? aName : null,
        text: aScored ? pick(COMMENTARY_PEN_SCORED)(aName) : pick(COMMENTARY_PEN_MISSED)(aName),
        penScore: `${hPens}–${aPens}`,
      });
      // Early clinch check: home can't catch up
      if (aPens > hPens + (NUM_KICKS - round - 1)) { penDone = true; penWinner = "away"; break; }
    }

    if (!penDone) {
      if (hPens > aPens) { penWinner = "home"; penDone = true; }
      else if (aPens > hPens) { penWinner = "away"; penDone = true; }
    }

    // Sudden death
    if (!penDone) {
      etEvents.push({ min: penMin, type: "commentary", text: pick(COMMENTARY_PEN_SD) });
      let sdRound = 0;
      while (!penDone && sdRound < 10) {
        const hTaker = hOrder[(NUM_KICKS + sdRound) % Math.max(1, hOrder.length)];
        const aTaker = aOrder[(NUM_KICKS + sdRound) % Math.max(1, aOrder.length)];
        const hName = hTaker?.name || "The taker";
        const aName = aTaker?.name || "The taker";
        const hScored = Math.random() < penSuccessChance(hTaker);
        if (hScored) hPens++;
        etEvents.push({
          min: penMin, type: hScored ? "pen_goal" : "pen_miss", team: "home",
          scorer: hScored ? hName : null,
          text: hScored ? pick(COMMENTARY_PEN_SCORED)(hName) : pick(COMMENTARY_PEN_MISSED)(hName),
          penScore: `${hPens}–${aPens}`, suddenDeath: true,
        });
        const aScored = Math.random() < penSuccessChance(aTaker);
        if (aScored) aPens++;
        etEvents.push({
          min: penMin, type: aScored ? "pen_goal" : "pen_miss", team: "away",
          scorer: aScored ? aName : null,
          text: aScored ? pick(COMMENTARY_PEN_SCORED)(aName) : pick(COMMENTARY_PEN_MISSED)(aName),
          penScore: `${hPens}–${aPens}`, suddenDeath: true,
        });
        if (hPens !== aPens) { penWinner = hPens > aPens ? "home" : "away"; penDone = true; }
        sdRound++;
      }
      if (!penDone) penWinner = Math.random() < 0.5 ? "home" : "away";
    }

    etEvents.push({
      min: penMin, type: "pens", team: penWinner,
      text: `${penWinner === "home" ? homeName : awayName} WIN ON PENALTIES! ${homeName} ${hPens}–${aPens} ${awayName}.`,
      penWinner, penScore: `${hPens}–${aPens}`,
    });
  }

  const allEvents = [...events, ...etEvents];
  const lastPossEvent = [...events].reverse().find(e => e.poss != null);
  const hPoss = lastPossEvent ? lastPossEvent.poss : Math.round(40 + ratio * 20);
  const aPoss = 100 - hPoss;

  const score = { home: finalHome, away: finalAway };
  // In aggregate mode winner is decided by overall goals, not just this match.
  const totalHome = finalHome + (legContext?.homeAgg ?? 0);
  const totalAway = finalAway + (legContext?.awayAgg ?? 0);
  const winnerSide = penWinner || (totalHome > totalAway ? "home" : totalAway > totalHome ? "away" : null);
  const drew = !penWinner && totalHome === totalAway;
  const homeRatings = buildRatings(homeSquad, "home", allEvents, finalAway, winnerSide === "home", drew);
  const awayRatings = buildRatings(awaySquad, "away", allEvents, finalHome, winnerSide === "away", drew);

  const allRated = [
    ...homeRatings.map(r => ({ ...r, side: "home" })),
    ...awayRatings.map(r => ({ ...r, side: "away" })),
  ].sort((a, b) => b.rating - a.rating);
  const motmEntry = allRated[0];
  if (motmEntry) {
    (motmEntry.side === "home" ? homeRatings : awayRatings)
      .find(r => r.name === motmEntry.name).motm = true;
  }

  // MOTM manager style flavour
  let motmLine = motmEntry ? motmEntry.name : "N/A";
  const motmSide = motmEntry?.side;
  const motmFm = motmSide === "home" ? homeFootballMgr : awayFootballMgr;
  const motmTeam = motmSide === "home" ? homeName : awayName;
  const motmStyle = motmSide === "home" ? hStyle : aStyle;
  if (motmFm && motmStyle && MGR_MOTM_LINES[motmStyle]) {
    const mgrLastName = motmFm.name.split(" ").pop();
    motmLine = `${motmEntry.name} — ${MGR_MOTM_LINES[motmStyle](mgrLastName, motmTeam)}`;
  }

  // Post-match manager reaction lines (totalHome/totalAway already declared above)
  const winner = winnerSide;
  function managerReaction(fm, isWin, isDraw) {
    if (!fm) return null;
    const n = fm.name.split(" ").pop();
    if (isWin) {
      const WINS = {
        pressing: `${n}: "We pressed them off the park. That's what we do."`,
        counter:  `${n}: "Clean sheet, three points. The system worked to perfection."`,
        attacking:`${n}: "I told them to go for it. They delivered."`,
        possession:`${n}: "We controlled the game completely. A deserved victory."`,
        direct:   `${n}: "Hard work and desire — that's this group in a nutshell."`,
        wildcard: `${n}: "I can't explain it. I won't even try."`,
      };
      return WINS[fm.style] || null;
    }
    if (isDraw) {
      const DRAWS = {
        pressing: `${n}: "We pressed and pressed but couldn't find the killer pass. Frustrating."`,
        counter:  `${n}: "We were hard to beat. A point away from home is never the worst."`,
        attacking:`${n}: "Not quite enough going forward. We'll fix that."`,
        possession:`${n}: "We had the ball but not the result. Tough to take."`,
        direct:   `${n}: "We fought hard. Not the result we wanted but the spirit was right."`,
        wildcard: `${n}: "A draw. We can work with that. Or maybe not."`,
      };
      return DRAWS[fm.style] || null;
    }
    const LOSSES = {
      pressing: `${n}: "We didn't press with enough intensity. That won't happen again."`,
      counter:  `${n}: "We gave them too much space on the break. Not good enough."`,
      attacking:`${n}: "We attacked, we just didn't score. The process was right."`,
      possession:`${n}: "We had the ball but gave away sloppy transitions. Unacceptable."`,
      direct:   `${n}: "We didn't compete in the air. Simple as that."`,
      wildcard: `${n}: "I have no idea what happened out there. I genuinely don't."`,
    };
    return LOSSES[fm.style] || null;
  }

  const hWon = winner === "home", aWon = winner === "away";
  const homeReaction = managerReaction(homeFootballMgr, hWon, drew); // `drew` declared at line 475
  const awayReaction = managerReaction(awayFootballMgr, aWon, drew);

  // Pre-match flavour
  function preFlavour(fm, teamName) {
    if (!fm) return null;
    const n = fm.name.split(" ").pop();
    const lines = {
      pressing:   `${n}: "Press them from the first whistle. No mercy."`,
      counter:    `${n}: "Stay compact. Be patient. Then hurt them."`,
      attacking:  `${n}: "Attack, attack, attack. I want goals from the first minute."`,
      possession: `${n}: "Keep the ball. Make them chase shadows."`,
      direct:     `${n}: "Win your headers. Win your tackles. Make it physical."`,
      wildcard:   `${n}: "...I've got a feeling about today."`,
    };
    return lines[fm.style] || null;
  }

  return {
    events: allEvents,
    score,
    stats: {
      hShots: Math.max(hShots, finalHome),
      aShots: Math.max(aShots, finalAway),
      hOnTarget: Math.min(Math.max(hOnTarget, finalHome), Math.max(hShots, finalHome)),
      aOnTarget: Math.min(Math.max(aOnTarget, finalAway), Math.max(aShots, finalAway)),
      hPoss, aPoss,
      hCards: hCards.length, aCards: aCards.length,
      hReds: hSentOff.size, aReds: aSentOff.size,
      hFouls: hFouls + rand(8, 12), aFouls: aFouls + rand(8, 12),
    },
    ratings: { home: homeRatings, away: awayRatings },
    motm: motmLine,
    motmName: motmEntry ? motmEntry.name : "N/A",
    summary: buildSummary({ homeName, awayName, score, penWinner, allEvents }),
    penWinner,
    homeReaction,
    awayReaction,
    homePreFlavour: preFlavour(homeFootballMgr, homeName),
    awayPreFlavour: preFlavour(awayFootballMgr, awayName),
    matchInjuries,
  };
}

const SPEEDS = [
  { label: "CRAWL",   ms: 4000 },
  { label: "SLOW",    ms: 2500 },
  { label: "NORMAL",  ms: 600  },
  { label: "FAST",    ms: 200  },
  { label: "INSTANT", ms: 0   },
];

function ratingClass(r) {
  if (r >= 8.5) return "mr-elite";
  if (r >= 7.5) return "mr-good";
  if (r >= 6.5) return "mr-ok";
  return "mr-poor";
}

function PlayerRatingRow({ r }) {
  return (
    <div className={`mr-row ${r.motm ? "motm" : ""}`}>
      <span className="mr-pos">{r.pos}</span>
      <span className="mr-name">
        {r.name}
        {r.goals > 0 && <span className="mr-marks"> {"⚽".repeat(r.goals)}</span>}
        {r.assists > 0 && <span className="mr-marks mr-assist"> {"🅰️".repeat(r.assists)}</span>}
        {r.red ? <span className="mr-marks"> 🟥</span> : r.yellow ? <span className="mr-marks"> 🟨</span> : null}
        {r.motm && <span className="mr-marks"> ⭐</span>}
      </span>
      <span className={`mr-val ${ratingClass(r.rating)}`}>{r.rating.toFixed(1)}</span>
    </div>
  );
}

function PreMatchPitch({ manager, accent, formation, variant = "grass" }) {
  const coords = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const lineColor = variant === "clay" ? "#ffffff33" : variant === "concrete" ? "#ffffff25" : "#ffffff22";
  return (
    <div className="pre-pitch-wrap">
      <div className={`formation-pitch pre-match-pitch ${variant !== "grass" ? `pitch-${variant}` : ""}`}>
        <svg viewBox="0 0 100 100" className="pitch-svg">
          {variant === "clay" ? (
            <>
              <rect x="5" y="5" width="90" height="90" fill="none" stroke={lineColor} strokeWidth="0.5" />
              <line x1="5" y1="50" x2="95" y2="50" stroke={lineColor} strokeWidth="0.4" />
              {/* Top goal D — semi-circle curving into pitch */}
              <path d="M 28 5 A 24 24 0 0 0 72 5" fill="none" stroke={lineColor} strokeWidth="0.4" />
              {/* Bottom goal D — semi-circle curving into pitch */}
              <path d="M 28 95 A 24 24 0 0 1 72 95" fill="none" stroke={lineColor} strokeWidth="0.4" />
              {/* Goal lines (small goal markers) */}
              <line x1="42" y1="5" x2="58" y2="5" stroke={lineColor} strokeWidth="1.2" />
              <line x1="42" y1="95" x2="58" y2="95" stroke={lineColor} strokeWidth="1.2" />
            </>
          ) : (
            <>
              <rect x="5" y="5" width="90" height="90" fill="none" stroke={lineColor} strokeWidth="0.5" />
              <line x1="5" y1="50" x2="95" y2="50" stroke={lineColor} strokeWidth="0.4" />
              <circle cx="50" cy="50" r="12" fill="none" stroke={lineColor} strokeWidth="0.4" />
              <rect x="28" y="5" width="44" height="18" fill="none" stroke={lineColor} strokeWidth="0.4" />
              <rect x="28" y="77" width="44" height="18" fill="none" stroke={lineColor} strokeWidth="0.4" />
              <rect x="38" y="5" width="24" height="8" fill="none" stroke={lineColor} strokeWidth="0.4" />
              <rect x="38" y="87" width="24" height="8" fill="none" stroke={lineColor} strokeWidth="0.4" />
            </>
          )}
        </svg>
        <div className="pitch-players">
          {coords.map((coord, i) => {
            const player = manager.squad[i];
            return (
              <div key={i} className="pitch-dot" style={{ left: `${coord.x}%`, top: `${coord.y}%`, cursor: "default" }}>
                <div className="pitch-dot-inner">
                  {player ? (
                    <>
                      <div className="dot-rating" style={{ background: getRatingBg(player.rating), color: getRatingColor(player.rating), borderColor: `${accent}55` }}>
                        {player.pos}
                      </div>
                      <div className="dot-name">{player.name.split(" ").pop()}</div>
                    </>
                  ) : (
                    <div className="dot-empty">{coord.pos}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {formation !== "1-2-1" && <div className="pre-pitch-formation" style={{ color: accent }}>{formation}</div>}
    </div>
  );
}

function LineupPanel({ homeManager, awayManager, homeName, awayName, onClose }) {
  const teams = [
    { mgr: homeManager, name: homeName, uid: "lh" },
    { mgr: awayManager, name: awayName, uid: "la" },
  ];
  return (
    <div className="lineup-overlay" onClick={onClose}>
      <div className="lineup-panel" onClick={e => e.stopPropagation()}>
        <div className="lineup-head">
          <span className="lineup-title">LINE-UPS</span>
          <button className="lineup-close" onClick={onClose}>✕</button>
        </div>
        <div className="lineup-cols">
          {teams.map(({ mgr, name, uid }) => (
            <div className="lineup-col" key={uid}>
              <div className="lineup-team" style={{ color: teamAccent(mgr.primaryColor, mgr.secondaryColor) }}>
                <KitSwatch primary={mgr.primaryColor} secondary={mgr.secondaryColor} pattern={mgr.pattern} uid={uid} size={26} />
                <span>{name}</span>
              </div>
              {mgr.squad.slice(0, 11).map((p, i) => (
                <div className="lineup-row" key={i}>
                  <span className="lineup-pos">{p ? p.pos : "–"}</span>
                  <span className="lineup-name">{p ? p.name : "(empty)"}</span>
                  <span className="lineup-rating">{p ? p.rating : ""}</span>
                </div>
              ))}
              {mgr.squad.slice(11, 16).some(Boolean) && <>
                <div className="lineup-subs-label">SUBSTITUTES</div>
                {mgr.squad.slice(11, 16).map((p, i) => (
                  <div className="lineup-row sub" key={i}>
                    <span className="lineup-pos">{p ? p.pos : "–"}</span>
                    <span className="lineup-name">{p ? p.name : "(empty)"}</span>
                    <span className="lineup-rating">{p ? p.rating : ""}</span>
                  </div>
                ))}
              </>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MatchSim({ draft, homeIdx, awayIdx, onBack, onMatchResult, seriesContext, isHost = true, externalMatchData = null, onMatchGenerated = null, matchMinutes = 90 }) {
  const isRegularSeriesMatch = !!seriesContext && !seriesContext.isSeriesTiebreaker && !seriesContext.legContext && !seriesContext.isTournamentKnockout;
  const homeManager = draft.managers[homeIdx];
  const awayManager = draft.managers[awayIdx];
  const homeName = homeManager.teamName || homeManager.name;
  const awayName = awayManager.teamName || awayManager.name;
  const homeAccent = teamAccent(homeManager.primaryColor, homeManager.secondaryColor);
  const awayAccent = teamAccent(awayManager.primaryColor, awayManager.secondaryColor);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [result, setResult] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [done, setDone] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2); // default NORMAL
  const [paused, setPaused] = useState(false);
  const [penPaused, setPenPaused] = useState(false);
  const [showLineups, setShowLineups] = useState(false);
  const feedRef = useRef(null);
  const timerRef = useRef(null);
  const speedRef = useRef(SPEEDS[2].ms);
  const eventsRef = useRef([]);
  const nextIdxRef = useRef(0);
  const externalStartedRef = useRef(false);

  // Non-host: auto-start animation when host's match data arrives from Firestore
  useEffect(() => {
    if (!externalMatchData || isHost || externalStartedRef.current) return;
    externalStartedRef.current = true;
    eventsRef.current = externalMatchData.events;
    nextIdxRef.current = 0;
    setResult(externalMatchData);
    setVisibleEvents([]);
    setSimulating(true);
    setDone(false);
    setPaused(false);
    runFeed(speedRef.current);
  }, [externalMatchData]); // eslint-disable-line react-hooks/exhaustive-deps

  function finishFeed() {
    clearTimeout(timerRef.current);
    setSimulating(false);
    setDone(true);
  }

  function stepFeed() {
    const evs = eventsRef.current;
    if (nextIdxRef.current >= evs.length) {
      finishFeed();
      return;
    }
    const ev = evs[nextIdxRef.current];
    nextIdxRef.current++;
    setVisibleEvents(prev => [...prev, ev]);
    // Pause before penalties so the user can trigger the shootout
    if (ev.penStartPause && speedRef.current > 0) {
      setPenPaused(true);
      return;
    }
    const ms = speedRef.current;
    // Goals linger on screen — let the flash breathe, CM-style
    timerRef.current = setTimeout(stepFeed, ev.type === "goal" ? ms * 3 : ms);
  }

  function runFeed(ms) {
    clearTimeout(timerRef.current);
    if (ms === 0) {
      // Instant — show all at once
      nextIdxRef.current = eventsRef.current.length;
      setVisibleEvents(eventsRef.current);
      finishFeed();
      return;
    }
    timerRef.current = setTimeout(stepFeed, ms);
  }

  function startSim() {
    const homeSquadEff = buildEffectiveSquad(homeManager, draft.playerAbsences);
    const awaySquadEff = buildEffectiveSquad(awayManager, draft.playerAbsences);
    const r = generateEvents(
      homeSquadEff, awaySquadEff, homeName, awayName,
      seriesContext?.legContext ?? null,
      homeManager.footballManager ?? null,
      awayManager.footballManager ?? null,
      seriesContext?.isLeg1 ?? false,
      homeManager.tactics ?? "balanced",
      awayManager.tactics ?? "balanced",
      seriesContext ? { homePrevResult: seriesContext.homePrevResult ?? null, awayPrevResult: seriesContext.awayPrevResult ?? null, isSeriesTiebreaker: seriesContext.isSeriesTiebreaker ?? false, isTournamentKnockout: seriesContext.isTournamentKnockout ?? false, skipToShootout: (seriesContext.isTournamentKnockout && matchMinutes < 90) ?? false } : null,
      matchMinutes,
    );
    if (onMatchGenerated) onMatchGenerated(r); // broadcast to all players via Firestore
    eventsRef.current = r.events;
    nextIdxRef.current = 0;
    setResult(r);
    setVisibleEvents([]);
    setSimulating(true);
    setDone(false);
    setPaused(false);
    runFeed(speedRef.current);
  }

  function changeSpeed(idx) {
    setSpeedIdx(idx);
    speedRef.current = SPEEDS[idx].ms;
    // If currently simulating, restart the timer at new speed.
    // INSTANT overrides a pause; other speeds wait for resume.
    if (simulating && result) {
      if (SPEEDS[idx].ms === 0) {
        setPaused(false);
        runFeed(0);
      } else if (!paused) {
        runFeed(SPEEDS[idx].ms);
      }
    }
  }

  function togglePause() {
    if (!simulating) return;
    if (paused) {
      setPaused(false);
      runFeed(speedRef.current);
    } else {
      setPaused(true);
      clearTimeout(timerRef.current);
    }
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [visibleEvents]);

  const currentScore = visibleEvents.filter(e => e.type === "goal").reduce(
    (acc, e) => { if (e.team === "home") acc.home++; else acc.away++; return acc; },
    { home: 0, away: 0 }
  );

  const lastPossVisible = [...visibleEvents].reverse().find(e => e.poss != null);
  const currentPoss = lastPossVisible
    ? { h: lastPossVisible.poss, a: 100 - lastPossVisible.poss }
    : { h: 50, a: 50 };

  function eventIcon(e) {
    if (e.type === "goal") return "⚽";
    if (e.type === "yellow") return "🟨";
    if (e.type === "red") return "🟥";
    if (e.type === "miss") return "↗";
    if (e.type === "pens") return "🎯";
    if (e.type === "pen_goal") return "⚽";
    if (e.type === "pen_miss") return "✕";
    if (e.type === "injury") return "🚑";
    return "▸";
  }

  function eventClass(e) {
    if (e.type === "goal") return "event-goal";
    if (e.type === "yellow") return "event-yellow";
    if (e.type === "red") return "event-red";
    if (e.type === "miss") return "event-miss";
    if (e.type === "pens") return "event-pens";
    if (e.type === "pen_goal") return "event-goal event-pen";
    if (e.type === "pen_miss") return "event-miss event-pen";
    if (e.type === "injury") return "event-injury";
    return "event-commentary";
  }

  function eventStyle(e, isLatest) {
    const style = {};
    if (e.team === "home" || e.team === "away") {
      style["--team-accent"] = e.team === "home" ? homeAccent : awayAccent;
    }
    if (isLatest && (e.type === "goal" || e.type === "pen_goal")) {
      const mgr = e.team === "home" ? homeManager : awayManager;
      style["--flash-a"] = mgr.primaryColor;
      style["--flash-b"] = mgr.secondaryColor;
      style["--flash-on-a"] = readableTextOn(mgr.primaryColor);
      style["--flash-on-b"] = readableTextOn(mgr.secondaryColor);
    }
    return style;
  }

  return (
    <div className="match-screen">
      <div className="match-header">
        {!simulating && !seriesContext && isHost && <button className="back-btn" onClick={onBack}>← BACK</button>}
        <span className="match-title">LIVE MATCH</span>
        <button className="lineup-btn" onClick={() => setShowLineups(true)}>LINE-UPS</button>
        <div className="speed-controls">
          {simulating && !penPaused && (
            <button
              className={`speed-btn pause-toggle ${paused ? "active" : ""}`}
              onClick={togglePause}
            >
              {paused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          )}
          <select
            className="speed-select"
            value={speedIdx}
            onChange={e => changeSpeed(Number(e.target.value))}
          >
            {SPEEDS.map((s, i) => (
              <option key={s.label} value={i}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="scoreboard">
        {seriesContext && (
          <div className="series-banner">
            <span className="series-banner-label">{seriesContext.label}</span>
            {seriesContext.standing && (
              <span className="series-banner-standing">{seriesContext.standing}</span>
            )}
          </div>
        )}
        <div className="sb-teams">
          <div className="sb-team-row">
            <KitSwatch primary={homeManager.primaryColor} secondary={homeManager.secondaryColor} pattern={homeManager.pattern} uid="mh" size={28} />
            <div className="sb-name" style={{ color: homeAccent }}>{homeName}</div>
            <div className="sb-score">{simulating || done ? currentScore.home : "–"}</div>
          </div>
          <div className="sb-team-row">
            <KitSwatch primary={awayManager.primaryColor} secondary={awayManager.secondaryColor} pattern={awayManager.pattern} uid="ma" size={28} />
            <div className="sb-name" style={{ color: awayAccent }}>{awayName}</div>
            <div className="sb-score">{simulating || done ? currentScore.away : "–"}</div>
          </div>
        </div>
        <div className="sb-status">
          {penPaused ? <span className="sim-paused">PENS</span>
            : simulating ? (paused ? <span className="sim-paused">PAUSED</span> : <span className="sim-live">LIVE</span>)
            : done ? "FT" : "VS"}
        </div>
        {(simulating || done) && (
          <div className="poss-bar-row">
            <span className="poss-pct home" style={{ color: homeAccent }}>{currentPoss.h}%</span>
            <div className="poss-bar">
              <div className="poss-bar-fill" style={{ flex: currentPoss.h, background: homeAccent }} />
              <div className="poss-bar-fill" style={{ flex: currentPoss.a, background: awayAccent }} />
            </div>
            <span className="poss-pct away" style={{ color: awayAccent }}>{currentPoss.a}%</span>
          </div>
        )}
        {penPaused && simulating && isHost && (
          <button
            className="sim-btn continue-btn sb-continue-btn pen-start-btn"
            onClick={() => { setPenPaused(false); runFeed(speedRef.current); }}
          >
            ⚽ BEGIN PENALTY SHOOTOUT →
          </button>
        )}
        {done && onMatchResult && isHost && (
          <button className="sim-btn continue-btn sb-continue-btn" onClick={() => {
            const legCtx = seriesContext?.legContext;
            const isDraw = !result.penWinner && result.score.home === result.score.away && isRegularSeriesMatch;
            if (isDraw) {
              onMatchResult(null, result.score, result.ratings, result.events, result.matchInjuries);
            } else {
              let side;
              if (result.penWinner) {
                side = result.penWinner;
              } else if (legCtx) {
                side = (result.score.home + legCtx.homeAgg) > (result.score.away + legCtx.awayAgg) ? "home" : "away";
              } else {
                side = result.score.home > result.score.away ? "home" : "away";
              }
              onMatchResult(side === "home" ? homeIdx : awayIdx, result.score, result.ratings, result.events, result.matchInjuries);
            }
          }}>
            {seriesContext?.isGrandFinal ? "SEE THE RESULT →" : seriesContext ? "CONTINUE TOURNAMENT →" : draft?.warChest ? "BACK TO SQUADS →" : "CONTINUE SERIES →"}
          </button>
        )}
        {done && !isHost && (
          <p className="mp-waiting-text" style={{ textAlign: "center", padding: "0.5rem 0", margin: 0 }}>
            Waiting for host to continue...
          </p>
        )}
      </div>

      <div className="match-body">
      {!simulating && !done && (
        <div className="sim-start-area">
          {/* Pre-match narrative */}
          {seriesContext && (() => {
            const narrative = generatePreMatchNarrative(draft, homeIdx, awayIdx, seriesContext);
            return narrative ? (
              <div className="pre-match-narrative">
                <div className="pre-match-narrative-label">MATCH PREVIEW</div>
                <p className="pre-match-narrative-text">{narrative}</p>
              </div>
            ) : null;
          })()}

          {/* Kick Off button above formations */}
          <div className="pre-kickoff-top">
            {isHost ? (
              <button className="sim-btn pre-kickoff-btn" onClick={startSim}>▶ KICK OFF</button>
            ) : (
              <div className="mp-waiting-screen" style={{ minHeight: "60px", padding: "0.75rem" }}>
                <div className="mp-waiting-spinner" />
                <p className="mp-waiting-text">Waiting for host to kick off...</p>
              </div>
            )}
          </div>

          {/* Formations side-by-side */}
          <div className="pre-formations-row">
            {/* Home */}
            <div className="pre-team-col">
              <div className="pre-team-name" style={{ color: homeAccent }}>{homeName}</div>
              {homeManager.footballManager && (
                <div className="pre-team-mgr">
                  <div className="pre-mgr-name" style={{ color: homeAccent }}>{homeManager.footballManager.name}</div>
                  <div className="pre-mgr-style">{homeManager.footballManager.styleLabel}</div>
                </div>
              )}
              <div className="pre-stat-inline">
                <span className="pre-stat-val">{Math.round(teamStrength(homeManager.squad))}</span>
                <span className="pre-stat-label">AVG</span>
              </div>
              <PreMatchPitch manager={homeManager} accent={homeAccent} formation={draft?.warChest ? "1-2-1" : (homeManager.formation || "4-3-3")} variant={draft?.warChest ? "clay" : "grass"} />
              {/* Home absences */}
              {draft.playerAbsences && (() => {
                const absent = Object.entries(draft.playerAbsences).filter(([, a]) => a.mgrIdx === homeIdx);
                return absent.length > 0 ? (
                  <div className="pre-absence-side" style={{ color: homeAccent }}>
                    {absent.map(([name, a]) => (
                      <div key={name} className="pre-absence-row">
                        {a.type === "suspension" ? "🟥" : "🚑"} {name}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Centre: VS */}
            <div className="pre-centre-col">
              <div className="pre-stat-label-mid">VS</div>
            </div>

            {/* Away */}
            <div className="pre-team-col pre-team-col--away">
              <div className="pre-team-name" style={{ color: awayAccent }}>{awayName}</div>
              {awayManager.footballManager && (
                <div className="pre-team-mgr">
                  <div className="pre-mgr-name" style={{ color: awayAccent }}>{awayManager.footballManager.name}</div>
                  <div className="pre-mgr-style">{awayManager.footballManager.styleLabel}</div>
                </div>
              )}
              <div className="pre-stat-inline">
                <span className="pre-stat-val">{Math.round(teamStrength(awayManager.squad))}</span>
                <span className="pre-stat-label">AVG</span>
              </div>
              <PreMatchPitch manager={awayManager} accent={awayAccent} formation={draft?.warChest ? "1-2-1" : (awayManager.formation || "4-3-3")} variant={draft?.warChest ? "clay" : "grass"} />
              {draft.playerAbsences && (() => {
                const absent = Object.entries(draft.playerAbsences).filter(([, a]) => a.mgrIdx === awayIdx);
                return absent.length > 0 ? (
                  <div className="pre-absence-side" style={{ color: awayAccent }}>
                    {absent.map(([name, a]) => (
                      <div key={name} className="pre-absence-row">
                        {a.type === "suspension" ? "🟥" : "🚑"} {name}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="event-feed" ref={feedRef}>
        {/* Newest first — each event pushes the history down, CM-style */}
        {visibleEvents.map((e, i) => ({ e, i })).reverse().map(({ e, i }) => {
          const isLatest = simulating && i === visibleEvents.length - 1;
          return (
            <div
              key={i}
              className={`event-row ${eventClass(e)} ${isLatest ? "latest" : ""}`}
              style={eventStyle(e, isLatest)}
            >
              <span className="event-min">
                {(e.type === "pen_goal" || e.type === "pen_miss") ? "PEN" : `${e.min}′`}
              </span>
              <span className="event-icon">{eventIcon(e)}</span>
              <span className="event-text">{e.text}</span>
              {e.penScore && <span className="event-score event-pen-score">{e.penScore}</span>}
              {!e.penScore && e.score && <span className="event-score">{e.score}</span>}
            </div>
          );
        })}
      </div>

      {done && result && (
        <div className={`match-summary ${summaryCollapsed ? "summary-collapsed" : ""}`}>
          <div className="summary-header" onClick={() => setSummaryCollapsed(c => !c)}>
            <div className="summary-header-left">
              <span className="summary-title">FULL TIME</span>
              <span className="summary-score-inline">{homeName} {result.score.home}–{result.score.away} {awayName}</span>
            </div>
            <span className="summary-toggle">{summaryCollapsed ? "▲" : "▼"}</span>
          </div>
          {!summaryCollapsed && <div className="summary-cols">
            <div className="summary-main">
              {result.penWinner && (
                <div className="pen-note">
                  ({result.penWinner === "home" ? homeName : awayName} win on penalties)
                </div>
              )}

              <p className="match-report">{result.summary}</p>

              <div className="motm-row">
                <span className="motm-label">POTM</span>
                <span className="motm-name">⭐ {result.motm}</span>
              </div>

              <div className="stats-grid">
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hShots}</span>
                  <span className="stat-label">SHOTS</span>
                  <span className="stat-away">{result.stats.aShots}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hOnTarget}</span>
                  <span className="stat-label">ON TARGET</span>
                  <span className="stat-away">{result.stats.aOnTarget}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hPoss}%</span>
                  <span className="stat-label">POSSESSION</span>
                  <span className="stat-away">{result.stats.aPoss}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hFouls}</span>
                  <span className="stat-label">FOULS</span>
                  <span className="stat-away">{result.stats.aFouls}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hCards}</span>
                  <span className="stat-label">YELLOW CARDS</span>
                  <span className="stat-away">{result.stats.aCards}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hReds}</span>
                  <span className="stat-label">RED CARDS</span>
                  <span className="stat-away">{result.stats.aReds}</span>
                </div>
              </div>

              <div className="post-match-btns">
                {!onMatchResult && (
                  <button className="sim-btn secondary" onClick={startSim}>REPLAY</button>
                )}
              </div>
            </div>

            <div className="summary-ratings">
              <div className="ratings-title">PLAYER RATINGS</div>
              <div className="ratings-cols">
                {[
                  { rs: result.ratings.home, accent: homeAccent, name: homeName, reaction: result.homeReaction },
                  { rs: result.ratings.away, accent: awayAccent, name: awayName, reaction: result.awayReaction },
                ].map(({ rs, accent, name, reaction }) => (
                  <div className="ratings-col" key={name}>
                    <div className="ratings-team" style={{ color: accent }}>{name}</div>
                    {rs.map(r => <PlayerRatingRow key={r.name} r={r} />)}
                    {reaction && (
                      <div className="post-mgr-quote" style={{ borderColor: accent }}>
                        <span className="post-mgr-text">{reaction}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>}
        </div>
      )}

      </div>{/* end .match-body */}

      {showLineups && (
        <LineupPanel
          homeManager={homeManager}
          awayManager={awayManager}
          homeName={homeName}
          awayName={awayName}
          onClose={() => setShowLineups(false)}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import KitSwatch, { readableTextOn, teamAccent } from "./KitSwatch";
import { TIER_SIM_MODIFIER } from "../data/managers";

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
    const yellow = allEvents.some(e => e.type === "yellow" && e.team === side && e.player === p.name);
    const red = allEvents.some(e => e.type === "red" && e.team === side && e.player === p.name);

    let r = 6.2 + (p.rating - 80) * 0.04 + Math.random() * 0.9;
    r += goals * 1.2;
    if (yellow) r -= 0.4;
    if (red) r -= 1.8;
    r += won ? 0.4 : drew ? 0 : -0.4;
    if (DEFENSIVE_POS.has(p.pos) && conceded === 0) r += 0.8;
    else if (DEFENSIVE_POS.has(p.pos) && conceded >= 3) r -= 0.5;
    r = Math.min(10, Math.max(3.5, Math.round(r * 10) / 10));

    return { name: p.name, pos: p.pos, rating: r, goals, yellow, red };
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

// legContext = { homeAgg, awayAgg } when this is leg 2 of an aggregate tie.
// ET/pens trigger on aggregate level rather than match level.
// isLeg1 = true suppresses ET entirely (leg 1 of a 2-legged tie is always 90 min).
// homeTactics / awayTactics: "defensive" | "balanced" | "attacking"
// seriesContext = { homePrevResult: "win"|"loss"|null, awayPrevResult: "win"|"loss"|null } for momentum
export function generateEvents(homeSquad, awaySquad, homeName, awayName, legContext = null, homeFootballMgr = null, awayFootballMgr = null, isLeg1 = false, homeTactics = "balanced", awayTactics = "balanced", seriesContext = null) {
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

  const TACTICS_MOD = { attacking: 0.05, balanced: 0, defensive: -0.04 };
  const tacticsDelta = (TACTICS_MOD[homeTactics] ?? 0) - (TACTICS_MOD[awayTactics] ?? 0);

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
  const ratio = Math.min(0.82, Math.max(0.18, hEffStr / (hEffStr + aEffStr) + tacticsDelta));

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
  const hCards = [], aCards = [];
  const hBooked = new Set(), aBooked = new Set();
  const hSentOff = new Set(), aSentOff = new Set();
  let possH = ratio; // running possession [0,1], drifts per event

  const onPitch = (squad, sentOff) => squad.slice(0, 11).filter(p => p && !sentOff.has(p.name));

  const minutes = [...new Set(Array.from({ length: rand(18, 28) }, () => rand(1, 90)))].sort((a, b) => a - b);

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

    if (r < 0.32) {
      const isHome = Math.random() < ratio;
      const team = isHome ? homeSquad : awaySquad;
      const teamName = isHome ? homeName : awayName;
      const side = isHome ? "home" : "away";
      const attacker = bestPlayer(onPitch(team, isHome ? hSentOff : aSentOff), weighted([{ v: "ST", w: 3 }, { v: "RW", w: 1.5 }, { v: "LW", w: 1.5 }, { v: "MF", w: 1 }]));
      const name = attacker ? attacker.name : "The striker";

      // Being a man (or more) down makes scoring harder
      const menDown = (isHome ? hSentOff.size : aSentOff.size) - (isHome ? aSentOff.size : hSentOff.size);
      const goalChance = 0.38 + (isHome ? hStr - aStr : aStr - hStr) * 0.004 - menDown * 0.08
        + goalChanceBonus(isHome) - opponentShotPenalty(isHome) + (isHome ? hTierMod : aTierMod);
      if (isHome) possH = Math.min(0.82, possH + 0.025); else possH = Math.max(0.18, possH - 0.025);
      if (Math.random() < goalChance) {
        const ctx = isHome ? goalContext(hGoals, aGoals) : goalContext(aGoals, hGoals);
        isHome ? hGoals++ : aGoals++;
        events.push({ min, type: "goal", team: side, scorer: name, text: pick(COMMENTARY_GOAL[ctx])(name, teamName), score: `${hGoals}–${aGoals}`, poss: Math.round(possH * 100) });
      } else {
        events.push({ min, type: "miss", team: side, text: pick(COMMENTARY_MISS)(name), poss: Math.round(possH * 100) });
      }
    } else if (r < 0.45) {
      const isHome = Math.random() < 0.5;
      const team = isHome ? homeSquad : awaySquad;
      const booked = isHome ? hBooked : aBooked;
      const sentOff = isHome ? hSentOff : aSentOff;
      const pl = onPitch(team, sentOff);
      const target = pl[rand(0, pl.length - 1)];
      if (target) {
        possH = possH * 0.94 + ratio * 0.06;
        if (booked.has(target.name)) {
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
  const isRegularSeriesMatch = !!seriesContext && !isSeriesTiebreaker && !legContext;
  const needsET = !isLeg1 && !isRegularSeriesMatch && (legContext ? aggHome() === aggAway() : hGoals === aGoals);

  if (needsET) {
    const ftNote = legContext
      ? `FULL TIME — ${hGoals}–${aGoals} on the night. ${aggHome()}–${aggAway()} on aggregate. EXTRA TIME!`
      : `FULL TIME — ${hGoals}–${aGoals}. Extra time!`;
    etEvents.push({ min: 90, type: "commentary", text: ftNote });
    const etMinutes = [rand(92, 98), rand(99, 105), rand(106, 112), rand(113, 120)];
    for (const min of etMinutes) {
      if (Math.random() < 0.2) {
        const isHome = Math.random() < ratio;
        const team = isHome ? homeSquad : awaySquad;
        const teamName = isHome ? homeName : awayName;
        const side = isHome ? "home" : "away";
        const attacker = bestPlayer(onPitch(team, isHome ? hSentOff : aSentOff), null);
        const name = attacker ? attacker.name : "The striker";
        if (Math.random() < 0.45) {
          const ctx = isHome ? goalContext(finalHome, finalAway) : goalContext(finalAway, finalHome);
          isHome ? finalHome++ : finalAway++;
          etEvents.push({ min, type: "goal", team: side, scorer: name, text: pick(COMMENTARY_GOAL[ctx])(name, teamName), score: `${finalHome}–${finalAway}` });
        } else {
          etEvents.push({ min, type: "miss", team: side, text: pick(COMMENTARY_MISS)(name) });
        }
      } else {
        etEvents.push({ min, type: "commentary", text: pick(COMMENTARY_NEUTRAL)(homeName, awayName) });
      }
    }

    const stillLevel = legContext ? aggHome() === aggAway() : finalHome === finalAway;
    if (stillLevel) {
      etEvents.push({ min: 120, type: "commentary", text: `FULL TIME EXTRA TIME — ${finalHome}–${finalAway}. PENALTY SHOOTOUT!` });
      let hPens = 0, aPens = 0;
      for (let i = 0; i < 5; i++) {
        if (Math.random() < 0.76) hPens++;
        if (Math.random() < 0.76) aPens++;
      }
      while (hPens === aPens) {
        if (Math.random() < 0.76) hPens++;
        if (Math.random() < 0.76) aPens++;
      }
      penWinner = hPens > aPens ? "home" : "away";
      etEvents.push({ min: 121, type: "pens", team: penWinner, text: `Penalties: ${homeName} ${hPens}–${aPens} ${awayName}. ${penWinner === "home" ? homeName : awayName} wins on pens!`, penWinner });
    }
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
      hShots: Math.max(finalHome, rand(3, 8)),
      aShots: Math.max(finalAway, rand(2, 7)),
      hPoss, aPoss,
      hCards: hCards.length, aCards: aCards.length,
      hReds: hSentOff.size, aReds: aSentOff.size,
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
        {r.red ? <span className="mr-marks"> 🟥</span> : r.yellow ? <span className="mr-marks"> 🟨</span> : null}
        {r.motm && <span className="mr-marks"> ⭐</span>}
      </span>
      <span className={`mr-val ${ratingClass(r.rating)}`}>{r.rating.toFixed(1)}</span>
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
              <div className="lineup-subs-label">SUBSTITUTES</div>
              {mgr.squad.slice(11, 16).map((p, i) => (
                <div className="lineup-row sub" key={i}>
                  <span className="lineup-pos">{p ? p.pos : "–"}</span>
                  <span className="lineup-name">{p ? p.name : "(empty)"}</span>
                  <span className="lineup-rating">{p ? p.rating : ""}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MatchSim({ draft, homeIdx, awayIdx, onBack, onMatchResult, seriesContext }) {
  const isRegularSeriesMatch = !!seriesContext && !seriesContext.isSeriesTiebreaker && !seriesContext.legContext;
  const homeManager = draft.managers[homeIdx];
  const awayManager = draft.managers[awayIdx];
  const homeName = homeManager.teamName || homeManager.name;
  const awayName = awayManager.teamName || awayManager.name;
  const homeAccent = teamAccent(homeManager.primaryColor, homeManager.secondaryColor);
  const awayAccent = teamAccent(awayManager.primaryColor, awayManager.secondaryColor);

  const [result, setResult] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [done, setDone] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2); // default NORMAL
  const [paused, setPaused] = useState(false);
  const [showLineups, setShowLineups] = useState(false);
  const feedRef = useRef(null);
  const timerRef = useRef(null);
  const speedRef = useRef(SPEEDS[2].ms);
  const eventsRef = useRef([]);
  const nextIdxRef = useRef(0);

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
    const r = generateEvents(
      homeManager.squad, awayManager.squad, homeName, awayName,
      seriesContext?.legContext ?? null,
      homeManager.footballManager ?? null,
      awayManager.footballManager ?? null,
      seriesContext?.isLeg1 ?? false,
      homeManager.tactics ?? "balanced",
      awayManager.tactics ?? "balanced",
      seriesContext ? { homePrevResult: seriesContext.homePrevResult ?? null, awayPrevResult: seriesContext.awayPrevResult ?? null } : null,
    );
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
    return "▸";
  }

  function eventClass(e) {
    if (e.type === "goal") return "event-goal";
    if (e.type === "yellow") return "event-yellow";
    if (e.type === "red") return "event-red";
    if (e.type === "miss") return "event-miss";
    if (e.type === "pens") return "event-pens";
    return "event-commentary";
  }

  function eventStyle(e, isLatest) {
    const style = {};
    if (e.team === "home" || e.team === "away") {
      style["--team-accent"] = e.team === "home" ? homeAccent : awayAccent;
    }
    if (isLatest && e.type === "goal") {
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
        {!simulating && !seriesContext && <button className="back-btn" onClick={onBack}>← BACK</button>}
        <span className="match-title">MATCH SIMULATION</span>
        <button className="lineup-btn" onClick={() => setShowLineups(true)}>LINE-UPS</button>
        <div className="speed-controls">
          {simulating && (
            <button
              className={`speed-btn pause-toggle ${paused ? "active" : ""}`}
              onClick={togglePause}
            >
              {paused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          )}
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              className={`speed-btn ${speedIdx === i ? "active" : ""}`}
              onClick={() => changeSpeed(i)}
            >
              {s.label}
            </button>
          ))}
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
          {simulating ? (
            paused ? <span className="sim-paused">PAUSED</span> : <span className="sim-live">LIVE</span>
          ) : done ? "FT" : "VS"}
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
        {done && onMatchResult && (
          <button className="sim-btn continue-btn sb-continue-btn" onClick={() => {
            const legCtx = seriesContext?.legContext;
            const isDraw = !result.penWinner && result.score.home === result.score.away && isRegularSeriesMatch;
            if (isDraw) {
              onMatchResult(null, result.score);
            } else {
              let side;
              if (result.penWinner) {
                side = result.penWinner;
              } else if (legCtx) {
                side = (result.score.home + legCtx.homeAgg) > (result.score.away + legCtx.awayAgg) ? "home" : "away";
              } else {
                side = result.score.home > result.score.away ? "home" : "away";
              }
              onMatchResult(side === "home" ? homeIdx : awayIdx, result.score);
            }
          }}>
            {seriesContext?.isGrandFinal ? "SEE THE RESULT →" : seriesContext ? "CONTINUE TOURNAMENT →" : "CONTINUE SERIES →"}
          </button>
        )}
      </div>

      <div className="match-body">
      {!simulating && !done && (
        <div className="sim-start-area">
          {/* Manager pre-match flavour */}
          {(homeManager.footballManager || awayManager.footballManager) && (
            <div className="pre-mgr-quotes">
              {homeManager.footballManager && (
                <div className="pre-mgr-quote home" style={{ color: homeAccent }}>
                  <div className="pre-mgr-name">{homeManager.footballManager.name}</div>
                  <div className="pre-mgr-style">{homeManager.footballManager.styleLabel}</div>
                </div>
              )}
              {awayManager.footballManager && (
                <div className="pre-mgr-quote away" style={{ color: awayAccent }}>
                  <div className="pre-mgr-name">{awayManager.footballManager.name}</div>
                  <div className="pre-mgr-style">{awayManager.footballManager.styleLabel}</div>
                </div>
              )}
            </div>
          )}
          <div className="pre-match-stats">
            <div className="pre-stat">
              <div className="pre-stat-val">{Math.round(teamStrength(homeManager.squad))}</div>
              <div className="pre-stat-label">AVG RATING</div>
            </div>
            <div className="pre-stat-label-mid">VS</div>
            <div className="pre-stat">
              <div className="pre-stat-val">{Math.round(teamStrength(awayManager.squad))}</div>
              <div className="pre-stat-label">AVG RATING</div>
            </div>
          </div>
          <button className="sim-btn" onClick={startSim}>▶ KICK OFF</button>
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
              <span className="event-min">{e.min}&apos;</span>
              <span className="event-icon">{eventIcon(e)}</span>
              <span className="event-text">{e.text}</span>
              {e.score && <span className="event-score">{e.score}</span>}
            </div>
          );
        })}
      </div>

      {done && result && (
        <div className={`match-summary ${summaryCollapsed ? "summary-collapsed" : ""}`}>
          <div className="summary-header" onClick={() => setSummaryCollapsed(c => !c)}>
            <span className="summary-title">FULL TIME</span>
            <span className="summary-score-inline">{homeName} {result.score.home}–{result.score.away} {awayName}</span>
            <span className="summary-toggle">{summaryCollapsed ? "▲" : "▼"}</span>
          </div>
          {!summaryCollapsed && <div className="summary-cols">
            <div className="summary-main">
              <div className="final-score">
                {homeName} {result.score.home}–{result.score.away} {awayName}
                {result.penWinner && (
                  <div className="pen-note">
                    ({result.penWinner === "home" ? homeName : awayName} win on penalties)
                  </div>
                )}
              </div>

              <p className="match-report">{result.summary}</p>

              {(result.homeReaction || result.awayReaction) && (
                <div className="post-mgr-reactions">
                  {result.homeReaction && (
                    <div className="post-mgr-quote" style={{ borderColor: homeAccent }}>
                      <span className="post-mgr-team" style={{ color: homeAccent }}>{homeName}</span>
                      <span className="post-mgr-text">{result.homeReaction}</span>
                    </div>
                  )}
                  {result.awayReaction && (
                    <div className="post-mgr-quote" style={{ borderColor: awayAccent }}>
                      <span className="post-mgr-team" style={{ color: awayAccent }}>{awayName}</span>
                      <span className="post-mgr-text">{result.awayReaction}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="motm-row">
                <span className="motm-label">MAN OF THE MATCH</span>
                <span className="motm-name">⭐ {result.motm}</span>
              </div>

              <div className="stats-grid">
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hShots}</span>
                  <span className="stat-label">SHOTS</span>
                  <span className="stat-away">{result.stats.aShots}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hPoss}%</span>
                  <span className="stat-label">POSSESSION</span>
                  <span className="stat-away">{result.stats.aPoss}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-home">{result.stats.hCards}</span>
                  <span className="stat-label">YELLOW CARDS</span>
                  <span className="stat-away">{result.stats.aCards}</span>
                </div>
                {(result.stats.hReds > 0 || result.stats.aReds > 0) && (
                  <div className="stat-row">
                    <span className="stat-home">{result.stats.hReds}</span>
                    <span className="stat-label">RED CARDS</span>
                    <span className="stat-away">{result.stats.aReds}</span>
                  </div>
                )}
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
                  { rs: result.ratings.home, accent: homeAccent, name: homeName },
                  { rs: result.ratings.away, accent: awayAccent, name: awayName },
                ].map(({ rs, accent, name }) => (
                  <div className="ratings-col" key={name}>
                    <div className="ratings-team" style={{ color: accent }}>{name}</div>
                    {rs.map(r => <PlayerRatingRow key={r.name} r={r} />)}
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

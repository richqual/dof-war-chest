# Claude Notes — Naming & Roadmap

Back to [[The Transfer Wheel]]. Related: [[Roadmap]], [[Game Modes]], [[Data Model]], [[Version History]].

> Written by Claude (chat), after reading the live vault at v3.9.68. Meant to sit alongside [[Roadmap]], not replace it — Rich owns the official one, this is input to fold in.

## Big Picture: Plan vs. Build

Stepping back from naming/roadmap specifics — a comparison of what I had catalogued from earlier chats against what the vault actually shows. Worth being upfront: I'm the party whose picture turned out stale here, so read this as "here's the gap," not a verdict on direction. Some of it is completely normal brainstorm-to-build drift; a couple of items are worth an actual gut check.

| Area | Originally discussed | Actually built |
|---|---|---|
| Multiplayer backend | Supabase + Vercel | Firebase (Firestore + Auth) — same room-code idea, different provider |
| Player identity | Fictional, Pro Evo–style names, no real badges/kits — a clean licensing path for a paid app | Real names, real clubs, real kits — Real Teams/Super League mode leans into this deliberately. **Resolved:** staying real IP, see note below. |
| Manager system | 36 managers across 3 eras, Tier (minor weight) + a **Style tag** (pressing/counter/attacking/possession/direct/wildcard) as the *core* strategic mechanic | ~127 managers/DoFs, drafted via a dedicated screen (`ManagerDraftScreen`) — the vault doesn't mention style tags or tiers at all |
| Extra modes | FFP, Managerial Merry-Go-Round (style-driven), League Wars, Lucky Bag, Wildcard Draft, Story Mode, club-philosophy/perks system | Classic, War Chest, Real Teams/Super League, Draft Roulette shipped. League Wars + Wildcard merged into Draft Roulette; Lucky Bag renamed **Scout Mode / Scout Reports** and reframed around pool-scarcity friction; FFP still backlog; Story Mode confirmed wanted (tied to Career mode); perks confirmed but later |
| Platform | iOS first, native, via React Native | A single responsive web app (React + Vite) on Vercel. **Resolved:** staying web-only, see note below. |
| Monetisation | Free download + one-time premium unlock, rewarded ads, 100k paid downloads milestone | **Resolved:** not pursuing profit — a "Buy Me a Coffee" button instead. See note below. |
| Standalone simulator | A separate product: take squads from other draft games (7-0, 38-0, 15-0), simulate with commentary | No trace in the vault |

### What I'd actually flag from this
- **Manager style tags are the one worth checking directly, not assuming.** The design principle behind it was explicit — *"style over rating... rating-driven design was explicitly rejected"* — so if that layer isn't actually in `managers.js`/`ManagerDraftScreen`, that's a real design gap, not a documentation gap. Worth a direct question to Code: does a manager's style tag currently affect match sim, or is it just a card attribute (or not present at all)?
- **Real names, web-only, non-commercial — decided.** The whole cluster of open questions this doc kept flagging (licensing, App Store viability, mobile-native build, monetisation) is resolved by one call: staying web-based, not pursuing profit, keeping real IP, with a Buy Me a Coffee button for anyone who wants to chip in. That's not a compromise position, it's a genuinely good fit for the actual goal — playing this with your nephew on holiday doesn't need an App Store listing, and real player names are simply more fun than a Pro Evo–style fictional roster. Worth updating [[Roadmap]] and [[Data Model]] to drop any lingering "which way will we license this" framing, since it's settled.
- **Story Mode and the perks system: both confirmed, different urgency.** Career/Story mode is definitely wanted — see [[Roadmap]] below, it connects directly to the vault's own "Career mode" entry. The club-philosophy perks system is also wanted eventually but explicitly not urgent — other builds take priority for now.
- **On the positive side:** what's shipped reads as tighter and more coherent than the original sprawling mode list. Four real modes (Classic, War Chest, Real Teams, Draft Roulette) covering what was originally six-plus separate ideas is arguably the *"would this work in a board game version?"* filter working as intended — less scope creep, not less ambition.

## Naming

**Decision (for now): sticking with The Transfer Wheel**, unless something better crops up. Recorded below for context on why that's a solid call, not just the default.

### Where things stand
The name history: *The Transfer Game → The Football Director → DoF: War Chest → The Transfer Circus → **The Transfer Wheel*** (current, and what the vault treats as settled). *Silly Season* was under consideration as a further rebrand.

**Checked Silly Season properly — it's a real collision, not a nervy overthink.** There's an existing board game called *Silly Season* (Between, Stockholm, 2014) on BoardGameGeek, and its own pitch is startlingly close to this game's: <cite index="12-1">you're the newly appointed manager of one of the largest football clubs in the country, buying new players and building a team for the top</cite>. On top of that, sillyseason.com is owned by a football banter Facebook page with <cite index="15-1">139,210 likes</cite>. Being put off is the right call.

### Alternative directions
**Keep "The Transfer Wheel."** It's already shipped — it's in the URL, the repo history, presumably the About screen copy — and it's a plainly honest description of the actual mechanic (spin a wheel, get a budget). Sometimes the safe, already-invested-in option is also just the correct one.

If the appeal of Silly Season was really the *transfer-window chaos* flavour rather than the specific phrase, a few options that chase that without the collision:

| Idea | Take |
|---|---|
| **The Window** | Too generic — "transfer window" is used everywhere, no room to own it. |
| **Deadline Day** | Dead end — there's a Peacock documentary with this exact title, and Sky Sports brands every transfer window with it. Unrankable. |
| **Panic Buy** / **The Panic Window** | Captures the chaos, much lower collision risk, still playful. Worth a proper domain/App Store check if it lands. |
| **The Merry-Go-Round** | Reuses the existing *Managerial Merry-Go-Round* mode name (nice internal consistency, and it's a phrase pundits already use for managerial sackings) — but that familiarity cuts both ways; it's fairly generic as a standalone title. Might work better as a subtitle than the name itself. |

**Or: don't rename at all, just lean harder into the flavour in copy, not the title.** That's consistent with the design principle already in the vault's DNA — *"football game first, circus second."* If that logic applies to features, it probably applies to naming too: keep *The Transfer Wheel* as the formal name, let tagline/marketing copy carry the silly-season energy instead.

### Domain / TLD
Since this is staying web-only and non-commercial, the stakes here are lower than an App Store listing would carry — but if a custom domain is ever wanted, `.club` fits thematically and `.app` reads clearly even for a web game. No urgency on this now.

## Roadmap

### Vault's official roadmap (from [[Roadmap]])
- Position eligibility 🟡 — designed, not built
- Career mode 🟡 — designed, not built
- Match sim desktop reflow 🟡 — in progress

### Update (post-vault-review conversation)
Two changes since the first pass above:
- **League Wars and Wildcard Draft have conceptually merged into Draft Roulette.** Makes sense — a league-restricted draft and a randomly-assigned pool filter are the same underlying mechanic (constrain the pool by an axis), just triggered differently. So this is really "extend Draft Roulette's modifier pool to include league/era restrictions" rather than two separate modes.
- **All top 5 European leagues (Prem, La Liga, Serie A, Bundesliga, Ligue 1) are now covered and fleshed out.** That removes the one hard blocker the old League Wars idea had.

### The remaining modes still on the table

**League/era modifiers in Draft Roulette** (the merged League Wars + Wildcard Draft) — with all five leagues now fleshed out, this is probably the best next build: it's extending an already-shipped screen/mechanic (`DraftRouletteScreen`) with new modifier types, not standing up a new mode from scratch, and the database dependency that used to block it is gone.

**FFP / wages mode** — toggleable wages mechanic: blind budget-envelope pick at game start, Classic players get age tiers (Young/Prime/Experienced), an FFP penalty if the wage budget is blown (cut the top 5 earners, backfill from a free-transfer pool). Looks like it'd slot in the same way Real Teams already does — an Advanced Options toggle on Classic — rather than a whole new mode screen. **Dependency:** every one of the ~1,300 player cards still needs a wage number (or a formula off `rating`/`tier`) before it's actually buildable, so it's a database task first.

**Scout Mode / Scout Reports** (renamed from Lucky Bag Mode, and reframed) — this has shifted from the original idea. It's no longer just "guarantee one elite player per position, rest random" — the actual goal now is **friction**: right now it's too easy to end up with a squad of great players, and this mode is meant to fix that by shrinking the available pool per player rather than padding it out. Called a "big one" — agreed, this is more of a core difficulty/economy lever than a side mode. **Needs a proper scoping pass before it's build-ready** — there are several factors still to pin down (how pools shrink, whether restriction is shared across players or per-player, how it interacts with position eligibility and tiers, etc.). Happy to help think through that scoping whenever it's useful — just flagging it here as "important, not yet spec'd" rather than sequencing it as if it were ready to hand to Code.

**Career / Story mode** — confirmed definitely wanted. The vault's own [[Roadmap]] already lists **Career mode** (🟡 designed, not built: wipe/re-draft loop, tier + era progression, save slots) — worth treating that and the earlier "Story Mode" idea (club philosophies governing transfer decisions) as one connected initiative rather than two separate ones, since a re-draft/progression loop is a natural vehicle for club-philosophy constraints. Club-philosophy **perks** (scouting perks, finance boosts, wheel re-spins) are wanted too, but explicitly *not* immediate — they'd likely layer onto this same system once the core loop exists, rather than needing to ship alongside it.

### Suggested sequencing
1. **Position eligibility** — already designed, no new data dependency, just needs building.
2. **League/era modifiers in Draft Roulette** — unblocked now, and cheap since it extends an existing screen.
3. **Career/Story mode** — already partly designed per the vault, confirmed as a real priority, and the natural home for club-philosophy perks later.
4. **FFP/wages** — gated on adding a wage field across the card database; can run alongside the others since it doesn't compete for the same screens.
5. **Scout Mode / Scout Reports** — high priority in spirit, but needs its own scoping session before it can be sequenced properly against the above. Worth doing that scoping soon precisely *because* it's a big one, not despite it.
6. **Club-philosophy perks** — confirmed, deliberately later, sits on top of Career/Story mode once that exists.

### One decision that's now resolved
Real names vs. fictional was flagged here as load-bearing for the roadmap — it's now settled: staying real IP, web-only, non-commercial (Buy Me a Coffee, not a paid release). That clears the one caveat that was hanging over the League/era Draft Roulette modifiers and FFP/wages — no relicensing pass needed, both can proceed on the real-player database as-is.

## Open questions for next session
- ~~Naming~~ — settled for now: sticking with The Transfer Wheel unless a better idea turns up.
- ~~Licensing~~ — resolved: real names, web-only, non-commercial.
- ~~Story Mode / perks~~ — resolved: Career/Story mode is a confirmed priority (see Roadmap); perks confirmed but deliberately later.
- **Scout Mode / Scout Reports needs a scoping session.** This is the one live open thread — several factors to pin down before it's build-ready (see Roadmap section above).

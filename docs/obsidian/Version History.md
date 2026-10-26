# Version History

Back to [[The Transfer Wheel]]. Related: [[Roadmap]], [[Game Modes]].

Current: **v5.4.0**. Reconstructed from git history (`git log`). Grouped by the project's major arcs rather than every commit — for the exact log run `git log --oneline`.

> Naming note: the project began as **"DoF War Chest" / "The Football Director"** and became **"The Transfer Wheel"**. The *War Chest* name survives as one of the [[Game Modes|game modes]].

---

## v1 — Foundations (v1.0 → v1.11)
The core single-screen draft game takes shape.
- **v1.0** Initial release (as *DoF War Chest*).
- Difficulty levels + the **roulette budget wheel** + bargain players.
- Match simulation engine + UI overhaul; **series & tournament system** with commentary.
- **Managerial Merry-Go-Round** — a manager draft phase between the player draft and the tournament, with one-at-a-time suspenseful card reveals.
- Rebrand to **The Football Director**; setup screen overhaul; lobby + club creator wizard.
- Filters (era / league / nation / tier), **player pool screen**, formation choice, structured substitute slots.
- Player **archetypes**, manager cohesion, style matchups, momentum, series draws.
- **v1.11** UCL match order, tournament stats panel, interactive draft-order draw with ball-pick.

## v2 — Multiplayer, accounts & depth (v2.0 → v2.21)
The game goes online and gains real systems.
- **v2.0** 🚀 **Multiplayer launch** — Firebase room create/join, waiting room, live draft sync (+ a run of sync bug-fixes). See [[Multiplayer]].
- 8-team tournament support; mode-select home screen.
- **v2.5** ⚔️ **War Chest mode** — fixed-budget economy, chest reveal, penalty shootout overhaul. See [[Game Modes#War Chest]].
- **v2.6** Player **attribute system** (pac/sho/pas/dri/def/phy) + full database rebalance. See [[Data Model]].
- **v2.9** 🎡 **Draft Roulette** mode (pre-game modifier wheel).
- **v2.10** +151 players (2024/25 season, club legends, Villa/Man Utd expansion).
- **v2.13+** War Chest online host control + squad timer; match-sim tuning; 5-a-side scoring tweaks.
- **Player accounts** — Google sign-in + save/load squads.
- **v2.16–2.20** Creation/finishing split, GK composite rating, automatic substitutions, manager shown on champion screen & saved squads.
- **v2.21** Tournament bracket polish (grand final promotion, reverse-chronological order).

## v3.9 — The Broadcast redesign era
A full visual overhaul plus new modes. (Versioning jumped to 3.9.x here.)
- **v3.9.23** 🎨 **Broadcast redesign** — every screen reskinned to the new dark-pitch look; CRT scanline removed.
- **v3.9.25–31** Post-redesign fixes, **drag-to-spin wheels**, global menu → right-edge **pull-tab**.
- **v3.9.32–39** War Chest light-mode fixes; **desktop / widescreen support** across the app.
- **v3.9.40–43** Cup-draw feel — staggered reveals, ball-number-then-team, human ball choice.
- **v3.9.47–48** Squad-screen polish (kit-coloured pitch tokens, distinct GK kit); inline **penalty shootout tracker**.
- **v3.9.51–53** Compact name display fix; champion screen warmth; **series tiebreaker → straight penalties**.
- **v3.9.55–59** 🏟️ **Real Teams mode** (later renamed **Super League**) — CPUs assigned elite real clubs with real kits, legend DoF, and auto club manager. Advanced Options + How It Works copy rework.
- **v3.9.61–67** Matchday & champion-screen fixes; 4-4-2 pitch alignment; mobile tournament stats; "Road to Victory" stage labels; cleaner setup (default 8 teams, inline match-type).
- **v3.9.68** This docs vault + roadmap added.
- **v3.9.71** Formation & captain persist across games; War Chest flow refinements.

## v4 — Scout Mode & the draw (v4.0 → v4.2)
A third core mode, then a run of tournament and draft-visibility work.
- **v4.0.7** 🔎 **Scout Mode launch** — the v3 → v4 bump. A dealt scout report from one shared, depleting per-position pool, with tier caps, tenets and missions. Solo/local only. See [[Game Modes]] and the Scout Mode Spec.
- **v4.0.8 – v4.1.3** Scout tuning: guaranteed report options, a genuine £0 free-agent pool, affordable-only reports so you're never stranded, re-scout actually re-rolling the hand.
- **v4.1.5–6** **Hidden ratings + paid reveal** on the scout report, rating-based range labels, bargain-bucket dropdown.
- **v4.1.8–11** Scout filtering — per-turn sub position filters, ALL/one-position pill behaviour, Mission panel moved under its header button.
- **v4.2.0 / v4.2.7** ♻️ **RESTART** — re-run a tournament or series keeping drafted squads, from the series screen and the champion card (including after a loss).
- **v4.2.2–10** Scout copy and empty-state clarity; "Wheel & Deal" zero-spin label; current mode + settings shown in the pull-out menu; iOS zoom/keyboard fix on War Chest search.
- **v4.2.11–20** 🏆 **Tournament presentation overhaul** — a real bracket, clearer watch/skip controls, leg scores with aggregate, possession-coloured commentary, aligned bracket connectors, full 30 minutes of extra time, widescreen bracket sized to its round count.
- **v4.2.30** 📋 **[[Draw Board]]** — see what every club spun and signed, round by round, in Classic and Scout. Plus three multiplayer fixes found while testing it: online CPU turns that never advanced, a wheel that could spin forever, and `lastName()` mangling parenthetical names. See [[Bug Fixes]].
- **v4.2.35–37** 💰 **Leftover Lolly** — unspent cash banks into a sub fund that replaces the wheel for bench rounds, plus one top-up spin with a £25m floor; on in Scout, off in Classic. Also CPU pick variance, a guaranteed free-transfer bench, and a fix for `undefined` values with Value for Money off (widened £0 tier).
- **v4.2.38–39** Preferred archetypes highlighted in the draft player list (softened to an opacity cue).
- **v4.2.45** 🔎 **Per-player draft filters + club locker** — pass-and-play draft filters saved per human, plus a reusable "club locker" of past clubs (cloud/localStorage). Keys `tg-filter-prefs` / `tg-club-locker`.
- **v4.2.46–47** ⭐ **Remember My Preferences** — opt-in toggle saves a device's lobby advanced-options setup and re-seeds it next game (Classic + Scout). Styled as a distinct meta control. Key `tg-setup-prefs`.
- **v4.2.48–50** ⏩ **Match sim speeds reworked** — SLOW / NORMAL / BRISK / FAST / INSTANT (Crawl dropped, Brisk added, 200ms Fast restored), remembered device-level per label. Key `tg-matchsim-speed`.
- **v4.2.53** **Free Subs** — position filter on open bench slots.
- **v4.2.55** War Chest draft polish — a sign-confirm dialog, editing a signed player to swap them out, and a club-coloured "your turn" handoff splash.
- **v4.2.57** Draw screens — kit-coloured "your turn" callout and clearer bracket-draw text.

## v4.3 → v5.0 — Transfer Kitty (the gold mode)
A new multiplayer-first draft mode and the v4 → v5 bump.
- **v4.3.9** 🐷 **Transfer Kitty mode** — solo/local POC, feature-complete. A gold-themed draft bookended by wheel spins (GK spin → budgeted DEF/MID/ATT *kitty* blocks → SUBS slot machine), a piggy-bank kitty reveal per block carrying over into [[Leftover Lolly]], a draft-locked formation (442/433, editable after), merry-go-round, per-block position filters and a block recap draw board. See the Transfer Kitty Mode Spec.
- **v4.3.10** Transfer Kitty gains the **Remember My Preferences** toggle (namespace `transferKitty`) for parity with Classic/Scout.
- **v4.3.11** Home screen shows a **suggested player count per mode**.
- **v5.0.0** 🚀 **Transfer Kitty launch** — the v4 → v5 bump. Ships solo/local; online MP (simultaneous blind block-building with a host-authoritative clash reveal) is the follow-up.
- **v5.0.1** 🗃️ **Season Pool — Phase 0** groundwork (no behaviour change). Player data moves to a CSV master → generated module pipeline, with a round-trip gate proving the data is reproduced exactly, a coverage script, and season-convention helpers. See the Season Pool Spec.
- **v5.1.0** 📅 **Season Pool — Phase 1: career windows + season picker.** Pick a single season (1998/99 → 2025/26) in the Classic and Scout lobbies and the pool shows only players — and managers — active then, at today's ratings; "All seasons" keeps the full cross-era pool. Players carry a Wikidata identity (`wikidataId` + `birthYear` + career window), so the ~151 duplicate-era cards collapse into one identity and cards gain an **Age** field. New pipeline steps: `enrich` (Wikidata), `data:populate`/`data:export` (Google Sheet master ↔ repo), and a known-facts test suite. Range/era presets with a per-player season roll, and per-club-season timelines, come in Phase 2+.
- **v5.1.1** 🔧 **Season Pool fixes** (playtest feedback). The player-pool and manager league/tier selection steps are now **skipped** in a season game — the year already restricts the pool (they'd otherwise rebuild it and drop the season). The season also survives going back from the club creator, **Age** shows only in a season game (no more today's-age on a peak card), and Wikidata matching now folds accents (César, etc.), lifting birth-year coverage to 96% of cards.
- **v5.2.0** 📈 **Season Pool — Phase 2: career curves & reputation.** In a season game a player is now shown and played *at the level he was that season*, not at his peak. A position-based ageing curve over each card's peak rating + birth year makes young players lower-rated and cheap, prime players peak, and veterans decline (keepers/centre-backs gracefully, pacy wide players fast) — so 1998/99 Gerrard is a promising 18-year-old and 2016 Henry is a fading winger. **Value follows reputation**, which lags ability both ways: ageing stars stay expensive (a trap), wonderkids are bargains before their reputation catches up — and since the CPU drafts by value, it over-rates the vets and misses the kids, so football knowledge is a real edge. Six attributes scale with the rating delta (extra pace lost with age), and all of it feeds the match engine, not just the card. Formula-driven, so no new hand data and the round-trip stays exact; per-player tuned keyframes, range-preset season rolls and season flavour come next. Non-season games are untouched.
- **v5.2.1** 🔧 **Career-window accuracy.** A player is only draftable in seasons he actually played: corrected a handful of cards whose data overran a real career (Rijkaard's spell was his whole life incl. management → his AC Milan years; Baumgart's ran into his coaching era) or carried a wrong-namesake birth year (Rubén García, a stray Sevilla "Nacho"). Added a build-time guard that fails if any non-legend card stays active past a plausible playing age (outfield 43 / keeper 46) — Zlatan's genuine run to 41 still passes. First deliberate edit to an original column, so the round-trip golden snapshot was re-baselined for those two `years`.
- **v5.3.0** 🎲 **Season Pool — the season randomiser.** The season picker now offers **era ranges** (Classic / Golden / Modern) and **All seasons · Peak** or **· Random**, not just a single year. Every mode pins each player to one season: a single year for all, a random season within an era range, their peak season in Peak mode, or any career season in Random — so a Golden draft might hand you 18-year-old Scuffet, prime ter Stegen and veteran Casillas side by side, each at that season's rating and reputation price. Cards now read **club + Age** everywhere (the year-range is gone — you're at the club *that* season), and a **season badge** in the draft header shows which season/era you're in. Legends ride along in All-seasons only. Single season and ranges skip the pool/manager-selection steps (the time window already restricts them); All-seasons keeps them so you can still narrow by league/tier. Managers are gated to the era too. All formula-driven — the round-trip stays exact.
- **v5.3.1** 🔧 The signing splash and the confirm-signing dialog now show **club + Age** in a season game too (they still showed the career year-range), matching the cards.
- **v5.3.2** 🩹 **No more empty squad slots in thin seasons.** Single-season (and thin-range) games could leave a club short because a scarce wide role (LM/RM/LW) ran out of players — in 1998/99 there are *zero* pure left-mids. Classic now **widens an exhausted slot to adjacent positions** and signs an out-of-position stand-in (with the usual OOP −5 match penalty), so every slot always fills. And the budget **re-spin is replaced by Option B**: if you can't afford anyone, you take one of a short list of the lowest-rated available players with your budget topped up to cover it — no second roll at the stars (fairer on everyone who committed to their spin). CPU and human alike. War Chest/Scout unaffected (Scout already had its own safety net).
- **v5.4.0** 🐷📅 **War Chest becomes a season mode — with its own empty-slot safety net.** The season picker (single year / era range / All-seasons Peak or Random) is now in the War Chest lobby too, so a 5-a-side chest game can be played in any era — cards show that season's rating, a reputation-based price, club + Age, and a season badge in the header. And because a lean chest in a star-heavy season could leave a slot empty, the auto-build and the human build now ladder down — within the per-slot cap → within the chest → an emergency signing (lowest-rated, chest tops up to cover) — and widen an exhausted position to a stand-in. A faithful sim of the worst case (1998/99 on Brutal budgets) goes from ~26% empty slots to **0%**. A full Wikidata re-match with **club-based disambiguation** (rank a candidate by whether the card's club appears in their real career), **career-spell overlap**, and a **plausibility guard** that blanks rather than guesses. Fixes the wrong-namesake ages playtesting surfaced — Ronaldo (R9), Pelé (was born 1991!), Marcelo, Vicente, Júlio César, Joaquín, Pedro, Raúl and more — and honestly blanks the handful with no confident match instead of showing "age 5". No behaviour or schema change: the new data rides the existing additive columns, so the round-trip gate stays exact.

---

## How to keep this current
When you cut a notable version, add a bullet under the latest arc (or start a new arc heading on a big shift). The commit subject line is usually enough — this note is the *story*, `git log` is the *record*.

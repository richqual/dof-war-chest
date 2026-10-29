// Season-convention helpers for the Season Pool system.
//
// CONVENTION: a season is stored as its END year. `1999` means the 1998/99
// season ("the 99 season"). This is the one place the end-year convention is
// defined; everything else should go through these helpers rather than doing
// year maths inline, because the start-year-vs-end-year mismatch (below) is the
// main source of off-by-one bugs in this whole project.

import { KEYFRAMES } from "../data/keyframes.js";

export const FIRST_SEASON = 1999; // 1998/99 — earliest season in the pool
export const LATEST_SEASON = 2026; // 2025/26 — "today" / inflation anchor

// 1999 -> "1998/99", 2000 -> "1999/00", 2026 -> "2025/26".
export function seasonLabel(endYear) {
  const start = String(endYear - 1);
  const end = String(endYear).slice(2).padStart(2, "0");
  return `${start}/${end}`;
}

// 1999 -> "'99", 2000 -> "'00". Space-tight short form.
export function seasonShort(endYear) {
  return "'" + String(endYear).slice(2).padStart(2, "0");
}

// "1998/99" -> 1999. Inverse of seasonLabel; tolerant of the short "99" form.
export function seasonFromLabel(label) {
  const [startStr, endStr] = String(label).split("/");
  const start = Number(startStr);
  // Resolve a 2-digit end into the right century from the start year.
  const end = endStr.length === 2 ? expandTwoDigitYear(start, Number(endStr)) : Number(endStr);
  return end;
}

// Expand a 2-digit year written after a 4-digit start into a full year,
// rolling the century when the end digits are smaller (e.g. 1991–99 -> 1999,
// 1999–00 -> 2000, 2005–11 -> 2011).
export function expandTwoDigitYear(startYear, twoDigit) {
  const century = Math.floor(startYear / 100) * 100;
  let full = century + twoDigit;
  if (full < startYear) full += 100; // crossed into the next century
  return full;
}

// Parse a legacy `years` spell string into { from, to, open }.
//
// The current data writes `years` in START years with a 2-digit end and an
// open-ended current spell: "1991–99", "2005–11", "1996–2018", "2018–".
// Accepts both the en-dash "–" and a plain hyphen "-".
//   "1991–99"   -> { from: 1991, to: 1999, open: false }
//   "2005–11"   -> { from: 2005, to: 2011, open: false }
//   "1996–2018" -> { from: 1996, to: 2018, open: false }
//   "2018–"     -> { from: 2018, to: null, open: true }
export function parseYearsRange(years) {
  const m = String(years).trim().match(/^(\d{4})\s*[–-]\s*(\d{2,4})?$/);
  if (!m) return null;
  const from = Number(m[1]);
  if (m[2] === undefined) return { from, to: null, open: true };
  const to = m[2].length === 2 ? expandTwoDigitYear(from, Number(m[2])) : Number(m[2]);
  return { from, to, open: false };
}

// All end-year seasons in [FIRST_SEASON, LATEST_SEASON].
export function allSeasons() {
  const out = [];
  for (let y = FIRST_SEASON; y <= LATEST_SEASON; y++) out.push(y);
  return out;
}

// Era presets over the end-year convention (see Season Pool Spec).
export const ERA_PRESETS = {
  classic: { from: 1999, to: 2008 },
  golden: { from: 2009, to: 2016 },
  modern: { from: 2017, to: 2026 },
};

// The SeasonPicker works in string keys; these map a key to the lobby
// playerFilter and back (for re-seeding the control after a back-nav).
//   "all:peak" | "all:random" | "range:<preset>" | "season:<endYear>"
export function filterForKey(key) {
  if (key && key.startsWith("season:")) return { season: Number(key.slice(7)) };
  if (key && key.startsWith("range:")) {
    const preset = key.slice(6);
    return ERA_PRESETS[preset] ? { range: ERA_PRESETS[preset], preset } : { allSeasons: "peak" };
  }
  if (key === "all:random") return { allSeasons: "random" };
  return { allSeasons: "peak" }; // default
}
export function keyForFilter(filter) {
  if (!filter) return "all:peak";
  if (filter.season != null) return `season:${filter.season}`;
  if (filter.preset) return `range:${filter.preset}`;
  if (filter.allSeasons) return `all:${filter.allSeasons}`;
  return "all:peak";
}

// Which preset an end-year season falls in ("classic" | "golden" | "modern"),
// or null if outside. Replaces the hand-entered `era` field once seasons land.
export function eraForSeason(endYear) {
  for (const [key, { from, to }] of Object.entries(ERA_PRESETS)) {
    if (endYear >= from && endYear <= to) return key;
  }
  return null;
}

// ── Career windows (Phase 1) ──────────────────────────────────────────────
// A player/manager is "active in season S" when S falls inside their window.
// Windows are end-year seasons. Two sources, in priority order:
//   1. Wikidata-derived firstSeason/lastSeason on the card (proper end-years).
//   2. Fallback: the legacy start-year `years` spell read AT FACE VALUE — the
//      same (acknowledged undercount) convention coverage.mjs already uses, so
//      the whole project keeps ONE window interpretation. The earliest offered
//      season (1999) hides the most common debut off-by-one.

// Face-value window from a legacy `years` spell, or null if unparseable.
export function yearsWindow(years) {
  const r = parseYearsRange(years);
  if (!r) return null;
  return { from: r.from, to: r.to ?? LATEST_SEASON };
}

// Resolve a card's (or manager's) active window for availability gating.
// Prefers the card's OWN `years` spell — it's the most specific, per-spell
// window, so a multi-card identity gates to the right-era card each season
// (Henry's Arsenal card covers 2003, his Monaco card does not). Falls back to
// the enriched identity career window only when `years` is missing/unparseable.
export function cardWindow(card) {
  const yw = yearsWindow(card && card.years);
  if (yw) return yw;
  if (card && card.firstSeason != null) {
    return { from: card.firstSeason, to: card.lastSeason ?? LATEST_SEASON };
  }
  return null;
}

// Is a { from, to } window active in end-year season S? Open `to` → still active.
export function activeInSeason(window, season) {
  if (!window) return false;
  return season >= window.from && season <= (window.to ?? LATEST_SEASON);
}

// Age at the START of a season (e.g. 1998/99 starts in 1998): season − 1 − birthYear.
// null when birthYear is unknown. (Gerrard, born 1980, is 18 in season 1999.)
export function ageInSeason(birthYear, season) {
  if (birthYear == null || !season) return null;
  return season - 1 - birthYear;
}

// ── Phase 2: career curves, reputation & value ─────────────────────────────
// Every card is the player's PEAK spell (its `rating`/`valueMin`/`valueMax` and
// attributes are the peak). Phase 2 reads those as the peak keyframe and derives
// a DIFFERENT rating for any other season from a position-based ageing curve +
// the player's age that season. No hand-authored per-season data yet: the only
// inputs are the peak card, `pos` and `birthYear` (so a card with no birthYear
// can't be curved and keeps its peak rating — honest, not wrong).
//
// These are deliberately loose, playtestable knobs, NOT spec decisions. One
// source of truth: display (PlayerCard), the baked squad/match stats and the
// value band all call through here so a season game is internally consistent.

// Peak age + how fast ability falls after it, by position. Keepers and centre
// backs peak late and decline gently; pace-reliant wide players peak early and
// fall away fast. `rise` is how many rating points a player gains per year as
// they climb towards their peak from youth.
const POSITION_CURVE = {
  GK:  { peakAge: 30, decline: 0.7, rise: 1.1 },
  CB:  { peakAge: 29, decline: 1.0, rise: 1.4 },
  RB:  { peakAge: 28, decline: 1.5, rise: 1.4 },
  LB:  { peakAge: 28, decline: 1.5, rise: 1.4 },
  RWB: { peakAge: 28, decline: 1.6, rise: 1.4 },
  LWB: { peakAge: 28, decline: 1.6, rise: 1.4 },
  DM:  { peakAge: 28, decline: 1.1, rise: 1.3 },
  CM:  { peakAge: 28, decline: 1.1, rise: 1.3 },
  CAM: { peakAge: 27, decline: 1.3, rise: 1.4 },
  RM:  { peakAge: 27, decline: 1.6, rise: 1.5 },
  LM:  { peakAge: 27, decline: 1.6, rise: 1.5 },
  RW:  { peakAge: 26, decline: 1.8, rise: 1.6 },
  LW:  { peakAge: 26, decline: 1.8, rise: 1.6 },
  ST:  { peakAge: 27, decline: 1.5, rise: 1.5 },
  CF:  { peakAge: 27, decline: 1.5, rise: 1.5 },
};
const DEFAULT_CURVE = { peakAge: 27, decline: 1.3, rise: 1.4 };
const MAX_DROP = 18;       // a season rating never sits more than this below peak
const RATING_FLOOR = 50;   // nor below this absolute floor
// Global tempo scales on the position curve (v5.5.1 value-spread tuning):
// a gentler rise so young stars sit closer to their peak rating, and a gentler
// decline so veterans hold their overall rating (their pace/physique still fade
// through seasonAttributes). See the growth-types follow-up for per-player shapes.
const RISE_SCALE = 0.62;
const DECLINE_SCALE = 0.7;

// Per-player GROWTH TYPES reshape the position curve so careers age in distinct
// shapes rather than one flat rate. `growth` is optional authored data; absent or
// unknown → "standard" (the plain position curve, = byte-for-byte prior behaviour).
//   dPeak       shifts the peak age (early peakers −, late bloomers +)
//   riseMult    scales the youth climb (lower = stronger younger)
//   declineMult scales the post-peak fall (lower = ages gracefully)
//   plateau     flat years held at peak before any decline (evergreens)
// The V2 global RISE_SCALE/DECLINE_SCALE still apply on top in seasonRating.
// Values are playtestable knobs, tuned alongside the V2 dials — not spec.
export const GROWTH_TYPES = {
  standard:  { dPeak: 0,  riseMult: 1.00, declineMult: 1.00, plateau: 0 },
  early:     { dPeak: -2, riseMult: 0.70, declineMult: 1.15, plateau: 0 },
  late:      { dPeak: 3,  riseMult: 1.35, declineMult: 0.70, plateau: 0 },
  evergreen: { dPeak: 1,  riseMult: 0.85, declineMult: 0.50, plateau: 3 },
  fragile:   { dPeak: 0,  riseMult: 0.90, declineMult: 2.00, plateau: 0 },
};

// Resolve a card's effective ageing curve: its position curve adjusted by its
// growth type. Accepts a card (preferred — reads pos + growth) or a bare pos
// string. Returns { peakAge, rise, decline, plateau }.
function curveFor(card) {
  const pos = typeof card === "string" ? card : card?.pos;
  const base = POSITION_CURVE[pos] || DEFAULT_CURVE;
  const growth = (card && typeof card === "object" && card.growth) || "standard";
  const g = GROWTH_TYPES[growth] || GROWTH_TYPES.standard;
  return {
    peakAge: base.peakAge + g.dPeak,
    rise: base.rise * g.riseMult,
    decline: base.decline * g.declineMult,
    plateau: g.plateau,
  };
}

// ── Per-player keyframes (precise career curves) ───────────────────────────
// A keyframed identity (src/data/keyframes.js, keyed by wikidataId) carries its
// own age→rating points + peak value band, which OVERRIDE the per-spell card
// curve in a season game — so a multi-card player ages along ONE arc no matter
// which club-spell card is rolled. These helpers resolve the effective peak /
// peak age / band for any card: the keyframe's when keyframed, the card's own
// otherwise (so a non-keyframed card behaves exactly as before).
function keyframesFor(card) {
  return (card && card.wikidataId && KEYFRAMES[card.wikidataId]) || null;
}

// Linear interpolation across sorted [age, rating] points; held flat beyond the
// first/last point. Assumes at least one point.
function interpKeyframes(points, age) {
  if (age <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (age >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [a1, r1] = points[i];
    if (age <= a1) {
      const [a0, r0] = points[i - 1];
      return r0 + (r1 - r0) * ((age - a0) / (a1 - a0));
    }
  }
  return last[1];
}

// Effective peak RATING: the keyframe's highest point if keyframed, else the card's.
function effectivePeak(card) {
  const kf = keyframesFor(card);
  if (!kf) return card?.rating ?? null;
  return kf.points.reduce((m, p) => Math.max(m, p[1]), 0);
}

// Age at which the effective peak occurs: the keyframe's top-point age if
// keyframed, else the growth/position peak age.
function effectivePeakAge(card) {
  const kf = keyframesFor(card);
  if (!kf) return curveFor(card).peakAge;
  return kf.points.reduce((best, p) => (p[1] > best[1] ? p : best), kf.points[0])[0];
}

// Peak value band: the keyframe's identity band if keyframed, else the card's.
function effectiveBand(card) {
  const kf = keyframesFor(card);
  if (kf) return { min: kf.band[0], max: kf.band[1] };
  return { min: card?.valueMin ?? 0, max: card?.valueMax ?? 0 };
}

// The player's rating in end-year season S, derived from the peak card by the
// position ageing curve. Returns the peak rating unchanged when the season isn't
// set or birthYear is unknown (so non-season games are byte-for-byte as before).
export function seasonRating(card, season) {
  if (!card || season == null || card.birthYear == null || card.rating == null) {
    return card ? card.rating : null;
  }
  const age = ageInSeason(card.birthYear, season);
  // Keyframed identities override the per-spell curve: one career arc by age,
  // so every club-spell card of the player reads the same rating in a season.
  const kf = keyframesFor(card);
  if (kf) {
    const r = interpKeyframes(kf.points, age);
    return Math.round(Math.max(RATING_FLOOR, Math.min(effectivePeak(card), r)));
  }
  const { peakAge, decline, rise, plateau } = curveFor(card);
  const peak = card.rating;
  // Before peak: climb from youth. Through the plateau: hold at peak. After the
  // plateau: decline at the (growth-adjusted) position rate.
  let delta;
  if (age <= peakAge) delta = -rise * RISE_SCALE * (peakAge - age);
  else if (age <= peakAge + plateau) delta = 0;
  else delta = -decline * DECLINE_SCALE * (age - peakAge - plateau);
  const floored = Math.max(peak - MAX_DROP, RATING_FLOOR, peak + delta);
  return Math.round(Math.min(peak, floored));
}

// Reputation lags ability in BOTH directions and is what price follows:
//   • declining stars stay expensive for a while (reputation falls slower than
//     ability) — a trap for the unwary;
//   • rising youngsters are cheap before their reputation catches up — the
//     bargains that reward football knowledge.
// Always ≤ peak (the peak season is the most valuable), so value never exceeds
// today's authored band. Returns peak when season/birthYear is missing.
const REP_DECAY = 0.5;       // post-peak reputation loss per year (< ability decline)
const YOUTH_LAG = 0.5;       // pre-peak reputation sits this far below ability/yr
const REP_MAX_LAG = 6;       // youth reputation never more than this below ability
export function seasonReputation(card, season) {
  if (!card || season == null || card.birthYear == null || card.rating == null) {
    return card ? card.rating : null;
  }
  const peakAge = effectivePeakAge(card);
  const peak = effectivePeak(card);
  const plateau = keyframesFor(card) ? 0 : curveFor(card).plateau;
  const age = ageInSeason(card.birthYear, season);
  const rating = seasonRating(card, season);
  if (age >= peakAge) {
    // Past peak: reputation clings to the peak, decaying slowly from the end of
    // any plateau (so evergreens stay dear right across their flat years).
    return Math.round(Math.min(peak, Math.max(rating, peak - REP_DECAY * Math.max(0, age - peakAge - plateau))));
  }
  // Pre-peak: reputation sits below current ability (the bargain window).
  const lag = Math.min(REP_MAX_LAG, YOUTH_LAG * (peakAge - age));
  return Math.round(Math.max(RATING_FLOOR, rating - lag));
}

// Re-centre the authored peak value band on reputation for season S. Value grows
// roughly geometrically with rating, so we scale by 2^((rep − peak)/RATING_PER_DOUBLING):
// every ~9 reputation points below peak roughly halves the price. reputation ≤ peak,
// so the multiplier is ≤ 1 (peak season = dearest). Band shape is preserved.
const RATING_PER_DOUBLING = 9;
export function seasonValueBand(card, season) {
  const min = card?.valueMin ?? 0;
  const max = card?.valueMax ?? 0;
  if (!card || season == null || card.birthYear == null || card.rating == null) {
    return { min, max };
  }
  // Keyframed players anchor on their identity peak band + peak rating; everyone
  // else on the card's own band + rating (so non-keyframed is unchanged).
  const band = effectiveBand(card);
  const peak = effectivePeak(card);
  const rep = seasonReputation(card, season);
  const mult = Math.min(1, Math.pow(2, (rep - peak) / RATING_PER_DOUBLING));
  return {
    min: Math.max(0, Math.round(band.min * mult)),
    max: Math.max(0, Math.round(band.max * mult)),
  };
}

// Scale the six attributes with the season rating delta from peak, with an extra
// pace penalty once a player is past their peak age (legs go first). Clamped to
// 1..99. A no-op (returns the originals) when the season/birthYear is missing.
const ATTR_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"];
const PACE_AGE_PENALTY = 0.6; // extra pac lost per year past peak
export function seasonAttributes(card, season) {
  const base = {};
  for (const k of ATTR_KEYS) if (card?.[k] != null) base[k] = card[k];
  if (!card || season == null || card.birthYear == null || card.rating == null) {
    return base;
  }
  const delta = seasonRating(card, season) - card.rating; // ≤ 0 mostly
  const peakAge = effectivePeakAge(card);
  const age = ageInSeason(card.birthYear, season);
  const extraPace = Math.max(0, age - peakAge) * PACE_AGE_PENALTY;
  const out = {};
  for (const k of ATTR_KEYS) {
    if (base[k] == null) continue;
    const adj = base[k] + delta - (k === "pac" ? extraPace : 0);
    out[k] = Math.max(1, Math.min(99, Math.round(adj)));
  }
  return out;
}

// ── Phase 2b: per-player season roll (range presets & All-seasons) ─────────
// A game can pin every player to ONE season (single-season already does). For a
// range preset (Classic/Golden/Modern) or All-seasons, each identity instead
// ROLLS a season within the selected range — so you might draft 2009 Ronaldo or
// 2014 Ronaldo, not always his peak. "Peak/Prime" mode rolls each player to his
// own peak season instead of a random one. These helpers answer, for one card:
// which seasons could it be rolled to, and where is its peak.

// The peak end-year season of a card (where its curve tops out), clamped to its
// active window — the anchor for Peak/Prime mode and a sensible default age.
export function peakSeasonOf(card) {
  const w = cardWindow(card);
  if (card && card.birthYear != null) {
    const peakAge = effectivePeakAge(card);
    const peak = card.birthYear + peakAge + 1; // the season he turns peakAge
    if (!w) return Math.max(FIRST_SEASON, Math.min(LATEST_SEASON, peak));
    return Math.max(w.from, Math.min(w.to, peak));
  }
  return w ? Math.round((w.from + w.to) / 2) : null;
}

// The end-year seasons (within [from, to]) that a card is actually active in,
// using the same window logic as gating. Empty when it never overlaps the range.
export function activeSeasonsInRange(card, from, to) {
  const w = cardWindow(card);
  if (!w) return [];
  const lo = Math.max(from, FIRST_SEASON);
  const hi = Math.min(to, LATEST_SEASON);
  const out = [];
  for (let s = lo; s <= hi; s++) if (activeInSeason(w, s)) out.push(s);
  return out;
}

// Does a card/manager's window overlap [from, to] at all? (manager range-gating)
export function windowOverlaps(card, from, to) {
  for (let s = Math.max(from, FIRST_SEASON); s <= Math.min(to, LATEST_SEASON); s++) {
    if (activeInSeason(cardWindow(card), s)) return true;
  }
  return false;
}

// Return a card with rating, the six attributes and the value band replaced by
// their season-S values — the one place the whole draft materialises "the player
// as he was that season". A no-op (returns the card as-is) outside a season game
// or when birthYear is unknown, so Classic/Kitty/War Chest and un-enriched cards
// are byte-for-byte unchanged. Form and the rolled `value` layer on top of this.
export function applySeasonStats(card, season) {
  // Always hand back a fresh object — callers mutate `.value`/`.ownedBy` on it,
  // and must never write through to the shared PLAYERS card.
  if (!card || season == null || card.birthYear == null || card.rating == null) {
    return card ? { ...card } : card;
  }
  const band = seasonValueBand(card, season);
  return {
    ...card,
    rating: seasonRating(card, season),
    ...seasonAttributes(card, season),
    valueMin: band.min,
    valueMax: band.max,
    // Stamp the season this card was materialised for, so a card carries its own
    // (possibly rolled) season into display — PlayerCard reads it for the Age
    // field and to show club-only instead of the club+years spell.
    seasonYear: season,
  };
}

// Label for a season-pool descriptor (draft.seasonFilter), for a header badge:
// "2008/09", "Classic", "All seasons · Random", or null for a non-season game.
const PRESET_NAME = { classic: "Classic", golden: "Golden", modern: "Modern" };
export function seasonFilterLabel(sf) {
  if (!sf) return null;
  if (sf.kind === "single") return seasonLabel(sf.season);
  if (sf.kind === "range") return PRESET_NAME[sf.preset] || `${seasonLabel(sf.from)}–${seasonLabel(sf.to)}`;
  if (sf.kind === "all") return `All seasons · ${sf.mode === "random" ? "Random" : "Peak"}`;
  return null;
}

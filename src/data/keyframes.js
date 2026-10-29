// Per-player keyframes — explicit age→rating career curves for a hand-picked set
// of marquee identities. The precise layer on top of growth types (season.js).
//
// Keyed by wikidataId (the identity key). Each entry carries the identity's PEAK
// value band (what he's worth at his best) and the age→rating control points; the
// highest point IS his peak rating. In a SEASON game these OVERRIDE the per-spell
// card rating, so a multi-card player ages along ONE consistent curve no matter
// which club-spell card is rolled for that season (fixing the overlap-year
// inconsistency where the same player/season could read two different ratings).
// The spell-card still supplies club, attributes and availability window.
//
// Numbers are hand-tuned and playtestable. Add an entry to keyframe a player;
// everyone else keeps their growth-type / position curve. Non-season games have
// no age and are unaffected.
export const KEYFRAMES = {
  // Ronaldo (R9) — Inter peak, then the knee-injury dip and 2002 World Cup comeback.
  "Q529207":   { band: [150, 237], points: [[17, 80], [20, 94], [21, 96], [23, 87], [25, 90], [27, 86], [29, 82], [31, 78]] },
  // Kylian Mbappé — elite young, still around his peak.
  "Q21621995": { band: [121, 208], points: [[17, 79], [18, 83], [19, 87], [21, 91], [23, 93], [25, 95], [28, 94]] },
  // Cristiano Ronaldo — long plateau into his mid-30s, decline after.
  "Q11571":    { band: [136, 224], points: [[18, 80], [20, 87], [23, 93], [26, 96], [28, 97], [30, 96], [32, 95], [34, 92], [37, 86], [39, 82]] },
  // Lionel Messi — long flat peak, gentle decline.
  "Q615":      { band: [145, 245], points: [[18, 86], [20, 92], [22, 96], [24, 98], [27, 98], [30, 98], [33, 96], [36, 93]] },
  // Wayne Rooney — teenage sensation, peaks mid-20s, fades after.
  "Q266613":   { band: [54, 90],   points: [[17, 80], [18, 84], [20, 87], [23, 90], [26, 92], [28, 91], [30, 88], [33, 83]] },
  // Steven Gerrard — steady riser, long prime.
  "Q459830":   { band: [79, 135],  points: [[18, 80], [20, 85], [23, 88], [26, 91], [29, 92], [31, 90], [33, 88], [35, 84]] },
};

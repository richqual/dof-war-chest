// Returns the name to show on compact tokens (pitch tokens, chips, commentary).
// Uses the last word of the name, but:
//  - skips trailing suffixes like "Jr"/"Sr"/roman numerals, so
//    "Neymar Jr" shows "Neymar", not "Jr".
//  - keeps leading particles like "van"/"de"/"der", so
//    "Louis van Gaal" shows "van Gaal", not "Gaal".
const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);
const PARTICLES = new Set([
  "van", "von", "de", "del", "della", "di", "da", "der", "den",
  "dos", "das", "la", "le", "el", "al", "bin", "ter", "ten",
]);

export function lastName(fullName) {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  // Drop trailing suffixes ("Jr", "III", ...) and parenthesised qualifiers used
  // to tell same-named players apart ("Ronaldo (R9)" → "Ronaldo", not "(R9)").
  while (
    parts.length > 1 &&
    (SUFFIXES.has(parts[parts.length - 1].toLowerCase()) ||
      /^\(.*\)$/.test(parts[parts.length - 1]))
  ) {
    parts.pop();
  }
  // Start from the last remaining word and absorb any preceding particles.
  let start = parts.length - 1;
  while (start > 0 && PARTICLES.has(parts[start - 1].toLowerCase())) {
    start--;
  }
  return parts.slice(start).join(" ");
}

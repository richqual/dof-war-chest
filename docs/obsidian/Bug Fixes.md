# Bug Fixes

Back to [[The Transfer Wheel]]. Related: [[Version History]], [[Claude Notes]], [[Multiplayer]].

Non-obvious bugs worth remembering — the kind where the *cause* isn't guessable from the symptom, so rediscovering them costs real time. Newest first.

---

## The wheel could spin forever (v4.2.30)
**Symptom:** wheel stuck on "SPINNING…" indefinitely, blocking the whole draft behind it. Seen on a guest client; not reproducible by staring at the physics.

**Cause:** `useSpinnableWheel.js` integrated rotation through a **capped** slice of time (`Math.min(dt, 50)`) so the wheel couldn't teleport after a stall — but that *same capped value* also drove the friction decay. That made the spin's duration effectively **frame-counted rather than clock-based**: however much real time passed between frames, each callback only ever applied 50ms of slowdown. Starve the frames (backgrounded tab, throttled or occluded renderer, slow device) and the spin stretches without bound.

**Fix:** split `real` (true elapsed) from `dt` (capped, for rotation only) and decay friction over `real`. Plus a `setTimeout` backstop (`MAX_SPIN_MS`, 12s).

**Two lessons:**
- **A failsafe inside the rAF loop is worthless here** — the loop is precisely the thing that isn't running. The first attempt made exactly this mistake. Backstops must not depend on the mechanism they're backing up.
- **Landing late is still fair.** The outcome is wherever physics leaves the wheel, which stays uniform over the wedges — and the wedges *are* the odds. So the failsafe path doesn't change the distribution.

Measured: unchanged at 30/60fps (5.7s); 115s → 7s at 1fps; 230s → 8s at 0.5fps. If a spin ever feels wrong after a change here, the two dials are `STEP_CAP` and `MAX_SPIN_MS`. ⚠️ The preview browser often delivers almost no animation frames, so the wheel **can't be judged for feel there**.

---

## Online CPU turns never advanced (v4.2.30)
Screen-level CPU effects drove the draft through `isMyTurn`-guarded handlers, and on a CPU turn no client is "my turn". Silent no-op; looked identical to a hung timer. Full write-up in [[Multiplayer#CPU turns online]].

---

## `lastName()` returned `(R9)` (v4.2.30)
**Symptom:** "Ronaldo (R9)" rendered as **`(R9)`** on compact name tokens.

**Cause:** `utils/displayName.js` dropped trailing suffixes (`Jr`, `III`, …) before taking the last word, but parenthetical qualifiers — used to tell same-named players apart — weren't in that set, so the parenthetical *was* the last word.

**Fix:** drop trailing `(...)` tokens the same way suffixes are dropped. Affected every compact name token app-wide, not just the [[Draw Board]] — the board just made it visible. Related: the [[Data Model]] rule that same-named players across eras must share an identical name string to dedup.

---

## Misdiagnosed "remount bug" (pre-v4.2.30)
**Symptom:** a review gate silently failed when SKIP crossed a round boundary. Two fixes based on a per-turn remount theory both failed.

**Cause:** there was no remount. Instrumentation showed MOUNT/UNMOUNT/MOUNT with the driving props unchanged and **no render logged between them** — impossible for a condition-driven unmount. It was React **StrictMode's dev-only double-invoke**, plus **Vite HMR** remounting after each edit. The tell: a full turn with no file edits produced *zero* mounts.

**Lesson:** in dev, if state seems to vanish, rule out StrictMode and HMR *before* theorising — especially when you've been editing files immediately before every failing test. Module-level globals were briefly used as a workaround; the real fix was `useRef`.

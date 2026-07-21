import { useRef, useState, useCallback, useEffect } from "react";

/*
 * Physics for a wheel the player can grab, drag and flick to spin.
 *
 * The outcome is decided purely by where physics comes to rest — which is fair,
 * because each wheel's visible wedges already encode the intended probability
 * distribution (the budget wheel's 16 slices ARE DIFFICULTY_SLOTS, the position
 * wheel's slices are the available slots). So a physically-uniform landing
 * reproduces the same odds the old predetermined pick used.
 *
 * The rotor transform is written imperatively (ref → style) every frame so the
 * component doesn't re-render 60x/sec; React state is only used for phase changes.
 */

const FRAME = 16.6667;      // ms, reference frame for normalising dt
const FRICTION = 0.984;     // velocity retained per reference frame during momentum
const STOP_VEL = 0.008;     // deg/ms — below this the wheel is considered stopped
const MIN_FLICK = 0.15;     // deg/ms — release faster than this commits a real spin
const SOFT_FLOOR = 0.7;     // deg/ms — a committed flick gets at least this much oomph
const DRIFT = 0.16;         // deg/frame idle drift (~9.5°/s) — the "spin me" affordance
const SPIN_JITTER = 0.26;   // ± fraction of random speed variation added at spin commit
const STEP_CAP = 50;        // ms, largest slice of real time we'll *rotate* through at once
const MAX_SPIN_MS = 12000;  // wall-clock failsafe — never leave a spin hanging forever

export function useSpinnableWheel({ rotorRef, onLive, onLanded, disabled = false }) {
  const [phase, setPhase] = useState("idle"); // idle | dragging | momentum | done

  const phaseRef = useRef("idle");
  const rotRef = useRef(0);
  const velRef = useRef(0);       // deg/ms
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
  const spinStartRef = useRef(0);  // frame clock at spin commit, for the failsafe
  const failsafeRef = useRef(null);
  const dragRef = useRef(null);
  const moveRef = useRef(null);
  const upRef = useRef(null);

  const liveRef = useRef(onLive); liveRef.current = onLive;
  const landedRef = useRef(onLanded); landedRef.current = onLanded;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;

  const goPhase = useCallback((p) => { phaseRef.current = p; setPhase(p); }, []);

  const paint = useCallback(() => {
    const el = rotorRef.current;
    if (el) el.style.transform = `rotate(${rotRef.current}deg)`;
  }, [rotorRef]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTRef.current = 0;
  }, []);

  const loop = useCallback((t) => {
    // `real` is the true elapsed time; `dt` is how much of it we rotate through.
    // They differ only when frames arrive slowly (backgrounded tab, throttled
    // renderer, slow device). Rotation stays capped so the wheel never teleports,
    // but friction is applied over the REAL elapsed time — otherwise a spin's
    // duration is measured in frames rather than seconds, and a starved tab
    // leaves the wheel spinning long after it should have come to rest.
    const real = lastTRef.current ? t - lastTRef.current : FRAME;
    const dt = Math.min(real, STEP_CAP);
    lastTRef.current = t;
    const p = phaseRef.current;

    if (p === "idle") {
      rotRef.current += DRIFT * (dt / FRAME);
      paint();
      rafRef.current = requestAnimationFrame(loop);
    } else if (p === "momentum") {
      if (!spinStartRef.current) spinStartRef.current = t;
      rotRef.current += velRef.current * dt;
      velRef.current *= Math.pow(FRICTION, real / FRAME);
      paint();
      liveRef.current?.(rotRef.current, "momentum");
      const overdue = spinStartRef.current && t - spinStartRef.current > MAX_SPIN_MS;
      if (Math.abs(velRef.current) < STOP_VEL || overdue) {
        velRef.current = 0;
        spinStartRef.current = 0;
        clearTimeout(failsafeRef.current);
        stop();
        goPhase("done");
        // Landing where the wheel happens to be is still uniform over the
        // wedges, so the failsafe path keeps the same odds as a natural stop.
        landedRef.current?.(rotRef.current);
      } else {
        rafRef.current = requestAnimationFrame(loop);
      }
    } else {
      rafRef.current = null; // dragging / done — nothing to animate
    }
  }, [paint, stop, goPhase]);

  const run = useCallback(() => {
    if (!rafRef.current) { lastTRef.current = 0; rafRef.current = requestAnimationFrame(loop); }
  }, [loop]);

  // Commit the current velocity into a momentum spin, nudged by a random amount
  // so two near-identical flicks don't come to rest in the same place. The
  // landing stays physically uniform over the wedges, so the odds are unchanged
  // — this only breaks the "I can guess where it'll stop" predictability.
  const commitSpin = useCallback(() => {
    velRef.current *= 1 + (Math.random() * 2 - 1) * SPIN_JITTER;
    spinStartRef.current = 0; // stamped on the first momentum frame, off the same clock
    goPhase("momentum");
    run();
    // Backstop on a timer rather than inside the frame loop: if the renderer
    // stops delivering animation frames altogether, anything living in that loop
    // can't rescue it, and the wheel would read "SPINNING…" forever with the
    // whole draft stuck behind it. Timers keep firing when frames don't.
    clearTimeout(failsafeRef.current);
    failsafeRef.current = setTimeout(() => {
      if (phaseRef.current !== "momentum") return;
      velRef.current = 0;
      spinStartRef.current = 0;
      stop();
      goPhase("done");
      landedRef.current?.(rotRef.current);
    }, MAX_SPIN_MS);
  }, [run, goPhase, stop]);

  const onPointerDown = useCallback((e) => {
    if (disabledRef.current) return;
    const p = phaseRef.current;
    if (p === "done" || p === "momentum") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    dragRef.current = {
      cx, cy,
      lastA: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI,
      lastT: performance.now(),
    };
    velRef.current = 0;
    stop();
    goPhase("dragging");

    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const a = Math.atan2(ev.clientY - d.cy, ev.clientX - d.cx) * 180 / Math.PI;
      let delta = a - d.lastA;
      if (delta > 180) delta -= 360; else if (delta < -180) delta += 360;
      const now = performance.now();
      const dt = Math.max(now - d.lastT, 1);
      rotRef.current += delta;
      paint();
      // exponential-smoothed angular velocity so a flick reads cleanly on release
      velRef.current = velRef.current * 0.55 + (delta / dt) * 0.45;
      d.lastA = a; d.lastT = now;
      liveRef.current?.(rotRef.current, "dragging");
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragRef.current = null;
      if (Math.abs(velRef.current) >= MIN_FLICK) {
        if (Math.abs(velRef.current) < SOFT_FLOOR) velRef.current = Math.sign(velRef.current) * SOFT_FLOOR;
        commitSpin();
      } else {
        // too gentle to count as a flick — no result, drift resumes
        velRef.current = 0;
        goPhase("idle");
        run();
      }
    };
    moveRef.current = move; upRef.current = up;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    e.preventDefault();
  }, [paint, stop, run, goPhase, commitSpin]);

  const flick = useCallback(() => {
    if (disabledRef.current) return;
    const p = phaseRef.current;
    if (p === "done" || p === "momentum" || p === "dragging") return;
    stop();
    const v = 1.7 + Math.random() * 0.8;
    velRef.current = (Math.random() < 0.5 ? -1 : 1) * v;
    commitSpin();
  }, [stop, commitSpin]);

  // Start the idle drift on mount (unless the wheel is disabled, e.g. only one slot left).
  useEffect(() => {
    paint();
    if (!disabled) { goPhase("idle"); run(); }
    return () => {
      stop();
      clearTimeout(failsafeRef.current);
      if (moveRef.current) window.removeEventListener("pointermove", moveRef.current);
      if (upRef.current) {
        window.removeEventListener("pointerup", upRef.current);
        window.removeEventListener("pointercancel", upRef.current);
      }
    };
  }, [disabled, paint, run, stop, goPhase]);

  return {
    phase,
    spinning: phase === "dragging" || phase === "momentum",
    done: phase === "done",
    idle: phase === "idle",
    onPointerDown,
    flick,
  };
}

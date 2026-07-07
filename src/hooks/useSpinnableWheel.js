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
const FRICTION = 0.982;     // velocity retained per reference frame during momentum
const STOP_VEL = 0.016;     // deg/ms — below this the wheel is considered stopped
const MIN_FLICK = 0.15;     // deg/ms — release faster than this commits a real spin
const SOFT_FLOOR = 0.7;     // deg/ms — a committed flick gets at least this much oomph
const DRIFT = 0.16;         // deg/frame idle drift (~9.5°/s) — the "spin me" affordance

export function useSpinnableWheel({ rotorRef, onLive, onLanded, disabled = false }) {
  const [phase, setPhase] = useState("idle"); // idle | dragging | momentum | done

  const phaseRef = useRef("idle");
  const rotRef = useRef(0);
  const velRef = useRef(0);       // deg/ms
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
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
    const dt = lastTRef.current ? Math.min(t - lastTRef.current, 50) : FRAME;
    lastTRef.current = t;
    const p = phaseRef.current;

    if (p === "idle") {
      rotRef.current += DRIFT * (dt / FRAME);
      paint();
      rafRef.current = requestAnimationFrame(loop);
    } else if (p === "momentum") {
      rotRef.current += velRef.current * dt;
      velRef.current *= Math.pow(FRICTION, dt / FRAME);
      paint();
      liveRef.current?.(rotRef.current, "momentum");
      if (Math.abs(velRef.current) < STOP_VEL) {
        velRef.current = 0;
        stop();
        goPhase("done");
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
        goPhase("momentum");
        run();
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
  }, [paint, stop, run, goPhase]);

  const flick = useCallback(() => {
    if (disabledRef.current) return;
    const p = phaseRef.current;
    if (p === "done" || p === "momentum" || p === "dragging") return;
    stop();
    const v = 1.7 + Math.random() * 0.8;
    velRef.current = (Math.random() < 0.5 ? -1 : 1) * v;
    goPhase("momentum");
    run();
  }, [stop, run, goPhase]);

  // Start the idle drift on mount (unless the wheel is disabled, e.g. only one slot left).
  useEffect(() => {
    paint();
    if (!disabled) { goPhase("idle"); run(); }
    return () => {
      stop();
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

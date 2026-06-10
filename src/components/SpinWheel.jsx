import { useState, useEffect, useRef } from "react";
import { generateBudget, formatValue } from "../data/players";

const TICK_INTERVAL_FAST = 50;
const TICK_INTERVAL_SLOW = 180;
const SPIN_DURATION = 2800; // ms total

export default function SpinWheel({ carryover, onConfirm }) {
  const [spinning, setSpinning] = useState(false);
  const [displayVal, setDisplayVal] = useState(null);
  const [finalVal, setFinalVal] = useState(null);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  function spin() {
    if (spinning) return;
    const result = generateBudget();
    setFinalVal(result);
    setDone(false);
    setSpinning(true);
    startTimeRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      // Exponential slowdown
      const interval = TICK_INTERVAL_FAST + (TICK_INTERVAL_SLOW - TICK_INTERVAL_FAST) * (progress ** 2);

      setDisplayVal(generateBudget());

      if (progress >= 1) {
        clearTimeout(intervalRef.current);
        setDisplayVal(result);
        setSpinning(false);
        setDone(true);
        return;
      }

      intervalRef.current = setTimeout(tick, interval);
    }

    tick();
  }

  useEffect(() => {
    return () => clearTimeout(intervalRef.current);
  }, []);

  const totalBudget = done ? (finalVal || 0) + (carryover || 0) : null;

  return (
    <div className="spin-wheel-container">
      <div className={`spin-display ${spinning ? "spinning" : ""} ${done ? "landed" : ""}`}>
        {displayVal !== null ? (
          <span className="spin-value">
            {displayVal === 0 ? "FREE" : `£${displayVal}m`}
          </span>
        ) : (
          <span className="spin-placeholder">£???</span>
        )}
      </div>

      {done && carryover > 0 && (
        <div className="spin-carryover">
          + £{carryover}m carryover = <strong>£{totalBudget}m total</strong>
        </div>
      )}

      {!done ? (
        <button
          className={`spin-btn ${spinning ? "disabled" : ""}`}
          onClick={spin}
          disabled={spinning}
        >
          {spinning ? "SPINNING…" : displayVal === null ? "🎰 SPIN" : "🎰 SPIN AGAIN"}
        </button>
      ) : (
        <button className="spin-confirm-btn" onClick={() => onConfirm(finalVal)}>
          ✓ LOCK IN {formatValue(finalVal)}
        </button>
      )}

      <div className="spin-hint">
        {done
          ? "Lock it in to start picking"
          : "Spin to reveal your transfer budget"}
      </div>
    </div>
  );
}

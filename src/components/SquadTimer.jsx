import { useState, useEffect } from "react";

// Ticks locally off a shared absolute deadline (epoch ms) written by the host, so every
// device shows the same countdown regardless of when it joined or its own clock drift.
export default function SquadTimer({ deadline }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  if (!deadline) return null;

  const totalSec = Math.max(0, Math.ceil((deadline - now) / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const urgent = totalSec <= 10;

  return (
    <div className={`wc-timer-badge ${urgent ? "wc-timer-urgent" : ""}`}>
      ⏱ {totalSec > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : "TIME'S UP"}
    </div>
  );
}

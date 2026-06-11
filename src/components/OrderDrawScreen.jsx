import { useState, useEffect } from "react";
import KitSwatch, { readableTextOn } from "./KitSwatch";

export default function OrderDrawScreen({ draft, onStart }) {
  const { managers, currentOrder } = draft;
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (revealed >= currentOrder.length) {
      const t = setTimeout(() => setDone(true), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed(r => r + 1), 700);
    return () => clearTimeout(t);
  }, [revealed, currentOrder.length]);

  const ordinals = ["1ST", "2ND", "3RD", "4TH"];

  return (
    <div className="order-draw-screen">
      <div className="order-draw-box">
        <div className="order-draw-title">DRAFT ORDER DRAW</div>
        <div className="order-draw-subtitle">Picking order for Round 1</div>

        <div className="order-draw-list">
          {currentOrder.map((mIdx, i) => {
            const m = managers[mIdx];
            const isVisible = i < revealed;
            return (
              <div
                key={i}
                className={`order-draw-row ${isVisible ? "visible" : "hidden"}`}
              >
                <span className="order-draw-num">{ordinals[i] || `${i + 1}TH`}</span>
                <KitSwatch
                  primary={m.primaryColor}
                  secondary={m.secondaryColor}
                  pattern={m.pattern || "plain"}
                  uid={`draw-${i}`}
                  size={22}
                />
                <span className="order-draw-club">{m.clubName || m.name}</span>
                {m.isComputer && <span className="cpu-tag">CPU</span>}
              </div>
            );
          })}
        </div>

        {done && (
          <button className="tt-continue-btn order-draw-go" onClick={onStart}>
            ▶ START DRAFT
          </button>
        )}
      </div>
    </div>
  );
}

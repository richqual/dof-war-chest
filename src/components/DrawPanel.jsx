import { useState, useEffect } from "react";
import DrawBoard from "./DrawBoard";

// Slide-in draw board, mirroring the GlobalMenu pull-tab (R8 option 8b) on the
// LEFT edge — the right edge is already the global menu's. Opens on the round
// currently being drafted and follows it live; paging back pins it to that
// round until reopened, so a manager reading round 2 isn't yanked forward.
// `fullOnly` is the post-draft entry point: once the draft is over there is no
// "current round" to hold, so it opens straight into the full board and skips
// the pull-tab (the host screen supplies its own way in).
export default function DrawPanel({ draft, open, onOpen, onClose, fullOnly = false }) {
  const [round, setRound] = useState(draft?.positionIndex ?? 0);
  const [full, setFull] = useState(fullOnly);
  const live = draft?.positionIndex ?? 0;

  // Follow the live round while the panel is shut, so it opens on "now".
  useEffect(() => { if (!open) setRound(live); }, [live, open]);

  if (!draft) return null;

  return (
    <>
      {/* The tab has nothing to peel back from once the full screen is up. */}
      {!full && !fullOnly && (
        <button
          className={`bw-draw-tab${open ? " is-open" : ""}`}
          onClick={() => (open ? onClose() : onOpen())}
          title="The draw — what everyone spun and signed"
        >
          {open ? "✕" : "DRAW"}
        </button>
      )}

      {/* The full board is a screen in its own right, not a squeeze into the
          380px panel — at 8 clubs the grid needs the whole viewport. */}
      {open && full && (
        <div className="bw-draw-screen">
          <div className="bw-draw-screen-head">
            <span className="bw-draw-panel-title">Full Draw</span>
            <button
              className="bw-draw-panel-close"
              onClick={() => (fullOnly ? onClose() : setFull(false))}
            >
              {fullOnly ? "✕ CLOSE" : "← BACK TO THIS ROUND"}
            </button>
          </div>
          <div className="bw-draw-screen-body">
            <DrawBoard draft={draft} mode="full" />
          </div>
        </div>
      )}

      {open && !full && (
        <div className="bw-draw-overlay" onClick={onClose}>
          <div className="bw-draw-panel" onClick={e => e.stopPropagation()}>
            <div className="bw-draw-panel-head">
              <span className="bw-draw-panel-title">The Draw</span>
              <button className="bw-draw-panel-close" onClick={onClose}>✕ HIDE</button>
            </div>
            <div className="bw-draw-panel-body">
              <DrawBoard
                draft={draft}
                mode="round"
                round={round}
                onRound={setRound}
                onViewFull={() => setFull(true)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

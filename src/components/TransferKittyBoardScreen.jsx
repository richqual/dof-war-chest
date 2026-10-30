import { useEffect } from "react";
import KitSwatch from "./KitSwatch";
import { formationPos } from "../hooks/draftUtils";
import { lastName } from "../utils/displayName";
import { formatValue } from "../data/players";

// The recap "Draw Board" shown after each build block (Defence / Midfield /
// Attack): every manager's signings for that block, side by side. Ratings are
// hidden here, same as the Classic/Scout draw board — a shared board never gives
// rivals' ratings away. Reads straight from each squad (no pickLog needed).
//
// Online (deferred): this is the natural home for clash re-picks — reveal the
// block, flag any player two managers both took, senior draft-order keeps them,
// losers re-pick from what's left. Built as a pure recap for now.
export default function TransferKittyBoardScreen({ draft, onContinue }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  // The block that just completed — advanceKitty has already advanced the index.
  const block = draft.blocks[draft.tkBlockIndex - 1];
  const formation = draft.drawFormation;
  if (!block) return null;

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-tk-board">
        <div className="bw-banner">
          <div className="bw-banner-title bw-tk-title">THE DRAW BOARD</div>
          <div className="bw-banner-subtitle">{block.label} — what everyone signed</div>
        </div>

        <div className="bw-body">
          <div className="bw-tk-board-list">
            {draft.managers.map((m, i) => (
              <div key={i} className="bw-tk-board-mgr">
                <div className="bw-tk-board-mgr-head">
                  <KitSwatch primary={m.primaryColor} secondary={m.secondaryColor} pattern={m.pattern || "plain"} uid={`tkb-${i}`} size={18} />
                  <span className="bw-tk-board-club">{m.clubName || m.name}</span>
                  {m.isComputer && <span className="bw-draw-cpu">CPU</span>}
                  {m.kittyByBlock?.[block.key] != null && (
                    <span className="bw-tk-board-kitty">{formatValue(m.kittyByBlock[block.key])} kitty</span>
                  )}
                </div>
                <div className="bw-tk-board-picks">
                  {block.slotIndices.map(si => {
                    const p = m.squad[si];
                    return (
                      <div key={si} className="bw-tk-board-pick">
                        <span className="bw-tk-board-pos">{formationPos(formation, si)}</span>
                        {p ? (
                          <span className="bw-tk-board-name">{lastName(p.name)}</span>
                        ) : (
                          <span className="bw-tk-board-empty">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button className="bw-cta-primary" style={{ marginTop: 12 }} onClick={onContinue}>
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}

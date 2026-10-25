import { useEffect } from "react";
import SpinWheel from "./SpinWheel";
import SubsSlotMachine from "./SubsSlotMachine";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";
import { BENCH_MIN_FUND } from "../hooks/draftUtils";

const BLOCK_ORDER = ["GK", "DEF", "MID", "ATT", "SUBS"];

// The two bookend wheels. GK opens the draft (spin your keeper budget); SUBS
// closes it (spin a richer top-up onto your carried-over sub fund, then pick the
// bench). Reuses the exact Classic SpinWheel, gold-themed.
export default function TransferKittyWheelScreen({ draft, onConfirm }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const managerIdx = draft.currentOrder[draft.turnIndex];
  const manager = draft.managers[managerIdx];
  const isSubs = draft.tkPhase === "subs-wheel";
  const crumbIdx = isSubs ? 4 : 0;

  const kitPrimary = manager.primaryColor || "#1a3a6b";
  const kitSecondary = manager.secondaryColor || "#ffffff";
  const kitTheme = {
    "--kit-primary": kitPrimary,
    "--kit-secondary": kitSecondary,
    "--kit-text": readableTextOn(kitPrimary),
    "--kit-accent": kitAccent(kitPrimary, kitSecondary),
  };

  return (
    <div className="draft-screen bw-tk-draft" style={kitTheme}>
      <div className="draft-header">
        <div className="bw-wcd-header-inner">
          <div className="bw-tk-block-crumbs">
            {BLOCK_ORDER.map((k, i) => (
              <span key={k} className={`bw-tk-crumb ${i === crumbIdx ? "current" : i < crumbIdx ? "done" : "upcoming"}`}>{k}</span>
            ))}
          </div>
          <div className="bw-wcd-kit-row">
            <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} size={32} />
            <div>
              <div className="bw-wcd-club">{manager.clubName}</div>
              <div className="bw-wcd-turn-badge bw-tk-block-name">{isSubs ? "SUBSTITUTES" : "GOALKEEPER"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="draft-main">
        <div className="bw-roll-area">
          <div className="bw-roll-sub">
            {isSubs
              ? <>Pull the handle to fill your <strong>bench fund</strong> — three reels, stacked on your carried-over sub fund<span className="bw-roll-note"> · minimum £{BENCH_MIN_FUND}m guaranteed</span></>
              : <>Spin for your <strong>goalkeeper</strong> budget — the draft opens here</>}
          </div>
          {isSubs ? (
            <SubsSlotMachine
              carryover={manager.subFund || 0}
              minTotal={BENCH_MIN_FUND}
              onConfirm={onConfirm}
            />
          ) : (
            <SpinWheel
              theme="gold"
              difficulty={draft.difficulty}
              carryover={0}
              carryLabel="sub fund"
              minTotal={0}
              slotValues={null}
              onConfirm={onConfirm}
            />
          )}
        </div>
      </div>
    </div>
  );
}

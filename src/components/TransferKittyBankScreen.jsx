import { useState, useEffect } from "react";
import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";
import { kittyBankSelection } from "../hooks/kittyUtils";

const BLOCK_ORDER = ["GK", "DEF", "MID", "ATT", "SUBS"];

// The per-block budget reveal: a row of piggy banks holding different amounts.
// Smash one to reveal this block's kitty — and see what the others held. It's a
// gamble (attack banks skew richer); leftover from earlier blocks stacks on top.
export default function TransferKittyBankScreen({ draft, onConfirm }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const managerIdx = draft.currentOrder[draft.turnIndex];
  const manager = draft.managers[managerIdx];
  const block = draft.blocks[draft.tkBlockIndex];
  const carry = manager.carryover || 0;

  const [banks] = useState(() => kittyBankSelection(draft.difficulty, block.key, block.slotIndices.length));
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);

  function smash(i) {
    if (picked !== null) return;
    setPicked(i);
    setTimeout(() => setRevealed(true), 650);
  }

  const pickedVal = picked !== null ? banks[picked] : null;
  const total = (pickedVal || 0) + carry;

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
              <span key={k} className={`bw-tk-crumb ${i === draft.tkBlockIndex ? "current" : i < draft.tkBlockIndex ? "done" : "upcoming"}`}>{k}</span>
            ))}
          </div>
          <div className="bw-wcd-kit-row">
            <KitSwatch primary={manager.primaryColor} secondary={manager.secondaryColor} pattern={manager.pattern} size={32} />
            <div>
              <div className="bw-wcd-club">{manager.clubName}</div>
              <div className="bw-wcd-turn-badge bw-tk-block-name">{block.label.toUpperCase()} KITTY</div>
            </div>
          </div>
        </div>
      </div>

      <div className="draft-main">
        <div className="bw-tk-bank-intro">
          {revealed
            ? <>Your <strong>{block.label}</strong> kitty</>
            : <>Smash a piggy bank for your <strong>{block.label}</strong> kitty</>}
          {carry > 0 && <span className="bw-tk-bank-carry"> · £{carry}m carried over</span>}
        </div>

        <div className="bw-tk-bank-grid">
          {banks.map((val, i) => {
            const isPicked = picked === i;
            const state = picked === null ? "idle"
              : isPicked ? (revealed ? "picked revealed" : "picked smashing")
              : (revealed ? "other revealed" : "other");
            return (
              <button
                key={i}
                className={`bw-tk-bank ${state}`}
                onClick={() => smash(i)}
                disabled={picked !== null}
              >
                <span className="bw-tk-bank-emoji" aria-hidden="true">
                  {isPicked && revealed ? "💰" : revealed ? "🐷" : isPicked ? "💥" : "🐷"}
                </span>
                <span className="bw-tk-bank-val">{revealed ? `£${val}m` : "?"}</span>
                {revealed && <span className="bw-tk-bank-note">{isPicked ? "yours" : "held"}</span>}
              </button>
            );
          })}
        </div>

        {revealed && (
          <>
            {carry > 0 && (
              <div className="bw-tk-bank-total-line">
                £{pickedVal}m + £{carry}m carried = <strong>£{total}m total</strong>
              </div>
            )}
            <button className="bw-cta-primary" style={{ marginTop: "1rem" }} onClick={() => onConfirm(pickedVal)}>
              LOCK IN £{total}m — BUILD YOUR {block.label.toUpperCase()} →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

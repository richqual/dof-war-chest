import { POSITIONS, getRatingBg, getRatingColor } from "../data/players";
import { subDisplayLabel } from "../hooks/draftUtils";
import KitSwatch, { readableTextOn } from "./KitSwatch";

// The draw board: what everyone spun and who they took, per round.
//
//   mode="round" — one round, one row per manager. Narrow enough for the
//                  slide-in panel at 375px; this is the live "waiting area".
//   mode="full"  — every round × every manager as a grid. Its own view, scrolls
//                  horizontally on narrow screens rather than squeezing.
//
// Both read the same denormalised draft.pickLog entries, so neither has to
// resolve player ids against a pool that has since depleted.

// A round is only a shared position label when every manager is filling the same
// slot in the same order — i.e. fixed position mode. Under Classic's random draw
// each manager can be on a different position in the same round, and different
// formations put different positions at the same slot index either way. So the
// row is just a number and each CELL carries its own position (entry.slotPos).
export function roundLabel(draft, positionIndex) {
  if (draft.positionMode === "random") return `Round ${positionIndex + 1}`;
  const sharedFormation = draft.managers?.every(
    m => (m.formation || "4-3-3") === (draft.managers[0]?.formation || "4-3-3")
  );
  if (!sharedFormation) return `Round ${positionIndex + 1}`;
  const entry = POSITIONS[positionIndex];
  return subDisplayLabel(draft, entry?.key, entry?.label ?? `Round ${positionIndex + 1}`);
}

// A manager still to pick in the round being shown — rendered as a waiting row
// so the board reads as a full grid from the start rather than growing into one.
function pendingRow(managerIdx) {
  return { pending: true, managerIdx };
}

// Ratings are a paid reveal in Scout — the fee buys the ratings on your OWN
// report, so a shared board must never leak rivals' ratings there. `showRatings`
// is therefore on only in modes with no such economy (Classic & co.), where the
// signed player reads as full name · position · age · rating.
function PickCell({ entry, showRatings = false }) {
  if (entry?.pending) return <span className="bw-draw-pending">waiting…</span>;
  if (!entry) return <span className="bw-draw-empty">—</span>;
  if (!entry.playerId) return <span className="bw-draw-skip">no signing</span>;
  // One line: position on the left, name in the middle (ellipsised), age +
  // rating pinned to the right. Fixed shape so the row doesn't resize on reveal.
  return (
    <span className="bw-draw-pick">
      <span className="bw-draw-pick-pos">{entry.slotPos || entry.pos}</span>
      <span className="bw-draw-pick-name">{entry.name}</span>
      <span className="bw-draw-pick-extra">
        {entry.age != null && <span className="bw-draw-pick-age">{entry.age}y</span>}
        {showRatings && entry.rating != null && (
          <span
            className="bw-draw-pick-rating"
            style={{ background: getRatingBg(entry.rating), color: getRatingColor(entry.rating) }}
          >
            {entry.rating}
          </span>
        )}
      </span>
    </span>
  );
}

export default function DrawBoard({
  draft,
  mode = "round",
  round,
  onRound,
  onViewFull,
}) {
  if (!draft) return null;
  const { managers = [], pickLog = [], positionIndex = 0, currentOrder = [] } = draft;
  // Ratings are a paid reveal in Scout only; everywhere else the board can show
  // them. Derived from the draft so every caller (incl. the shared DrawPanel)
  // gets it right without threading a prop through.
  const showRatings = !draft.scout;

  if (mode === "full") {
    const lastRound = Math.min(positionIndex, POSITIONS.length - 1);
    const rounds = Array.from({ length: lastRound + 1 }, (_, i) => i);
    const byKey = new Map(pickLog.map(e => [`${e.positionIndex}-${e.managerIdx}`, e]));
    return (
      <div className="bw-draw-board bw-draw-full">
        <div className="bw-draw-scroll">
          <table className="bw-draw-table">
            <thead>
              <tr>
                <th className="bw-draw-corner">Round</th>
                {managers.map((m, i) => (
                  <th key={i} className="bw-draw-head">
                    <KitSwatch
                      primary={m.primaryColor}
                      secondary={m.secondaryColor}
                      pattern={m.pattern || "plain"}
                      uid={`draw-head-${i}`}
                      size={16}
                    />
                    <span className="bw-draw-head-name">{m.clubName || m.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map(r => (
                <tr key={r}>
                  <th className="bw-draw-round-label">{roundLabel(draft, r)}</th>
                  {managers.map((_, i) => {
                    const entry = byKey.get(`${r}-${i}`);
                    return (
                      <td key={i} className="bw-draw-cell">
                        {entry && (
                          <span className="bw-draw-spin">
                            £{entry.spun ?? entry.budget}m
                            {entry.budget > (entry.spun ?? entry.budget) && (
                              <span className="bw-draw-pot">(£{entry.budget}m)</span>
                            )}
                          </span>
                        )}
                        <PickCell entry={entry} showRatings={showRatings} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Round mode ───────────────────────────────────────────────────────────
  const shown = round ?? positionIndex;
  const isLive = shown === positionIndex;
  const picked = pickLog.filter(e => e.positionIndex === shown);
  const pickedIdx = new Set(picked.map(e => e.managerIdx));
  // Live round: keep the pick order on screen, with whoever is still to come
  // listed after in turn order. Past rounds are already complete.
  const rows = isLive
    ? [...picked, ...currentOrder.filter(i => !pickedIdx.has(i)).map(pendingRow)]
    : picked;
  // The next manager to pick in a live round — the first in turn order still
  // waiting. Used to call out "your go next" so a human sees it coming.
  const nextIdx = isLive ? currentOrder.find(i => !pickedIdx.has(i)) : undefined;

  return (
    <div className="bw-draw-board bw-draw-round">
      <div className="bw-draw-nav">
        <button
          className="bw-draw-nav-btn"
          onClick={() => onRound?.(shown - 1)}
          disabled={!onRound || shown <= 0}
          aria-label="Previous round"
        >‹</button>
        <span className="bw-draw-nav-label">{roundLabel(draft, shown)}</span>
        <button
          className="bw-draw-nav-btn"
          onClick={() => onRound?.(shown + 1)}
          disabled={!onRound || shown >= positionIndex}
          aria-label="Next round"
        >›</button>
      </div>

      {/* Each row is two parts: a club block that's always in full kit colour,
          and an info block (spun + signed) that fills to the same colour the
          instant a signing locks in. The gap between "spun" and what they laid
          out is the story the two money figures tell. */}
      <div className="bw-draw-legend">
        <span className="bw-draw-legend-club">Club</span>
        <div className="bw-draw-legend-info">
          <span className="bw-draw-legend-spin">Spun</span>
          <span className="bw-draw-legend-pick">Signed</span>
        </div>
      </div>

      <ul className="bw-draw-rows">
        {rows.map((entry, n) => {
          const m = managers[entry.managerIdx];
          if (!m) return null;
          const signed = !entry.pending;
          const isLatest = signed && entry === picked[picked.length - 1] && isLive;
          const isNext = !signed && entry.managerIdx === nextIdx;
          const isHuman = !m.isComputer;
          const kit = m.primaryColor || "#1a3a6b";
          const kitText = readableTextOn(kit);
          return (
            <li
              key={`${entry.managerIdx}-${n}`}
              className={
                "bw-draw-row" +
                (signed ? " is-signed" : " is-pending") +
                (isLatest ? " is-latest" : "") +
                (isNext ? " is-next" : "") +
                (isHuman ? " is-you" : "")
              }
              // The kit colour and the text that reads on it drive both blocks
              // via CSS, so the fill-in is a pure colour transition (no reflow).
              style={{ "--kit": kit, "--kit-text": kitText }}
            >
              {/* Club block — always full kit colour. */}
              <div className="bw-draw-cell-club">
                <KitSwatch
                  primary={m.primaryColor}
                  secondary={m.secondaryColor}
                  pattern={m.pattern || "plain"}
                  uid={`draw-${shown}-${entry.managerIdx}`}
                  size={18}
                />
                <span className="bw-draw-club-name">{m.clubName || m.name}</span>
                {isHuman
                  ? <span className="bw-draw-you">YOU</span>
                  : <span className="bw-draw-cpu">CPU</span>}
              </div>

              {/* Info block — neutral while waiting, full kit colour once signed.
                  Both the spin slot and the main slot are fixed-size so the box
                  is fully shaped before it fills — no resize on reveal. */}
              <div className="bw-draw-cell-info">
                <span className="bw-draw-spin">
                  {signed ? `£${entry.spun ?? entry.budget}m` : "—"}
                  {signed && entry.budget > (entry.spun ?? entry.budget) && (
                    <span className="bw-draw-pot">(£{entry.budget}m)</span>
                  )}
                </span>
                <span className="bw-draw-info-main">
                  {signed ? (
                    <PickCell entry={entry} showRatings={showRatings} />
                  ) : isNext ? (
                    <span className="bw-draw-next-label">
                      {isHuman ? "⏵ Your go next" : "up next…"}
                    </span>
                  ) : (
                    <span className="bw-draw-pending">waiting…</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {onViewFull && (
        <button className="bw-draw-full-link" onClick={onViewFull}>
          View full draw
        </button>
      )}
    </div>
  );
}

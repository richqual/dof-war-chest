import { POSITIONS } from "../data/players";
import { lastName } from "../utils/displayName";
import KitSwatch from "./KitSwatch";

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
  return POSITIONS[positionIndex]?.label ?? `Round ${positionIndex + 1}`;
}

// A manager still to pick in the round being shown — rendered as a waiting row
// so the board reads as a full grid from the start rather than growing into one.
function pendingRow(managerIdx) {
  return { pending: true, managerIdx };
}

// Ratings are never shown here, in any mode. Scout charges a fee to reveal them
// on your OWN report, so putting rivals' ratings on a shared board would give
// away the thing that fee is for.
function PickCell({ entry }) {
  if (entry?.pending) return <span className="bw-draw-pending">waiting…</span>;
  if (!entry) return <span className="bw-draw-empty">—</span>;
  if (!entry.playerId) return <span className="bw-draw-skip">no signing</span>;
  return (
    <span className="bw-draw-pick">
      <span className="bw-draw-pick-name">{lastName(entry.name)}</span>
      <span className="bw-draw-pick-meta">
        {entry.slotPos || entry.pos}
        {entry.spent != null && <> · £{entry.spent}m</>}
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
                        <PickCell entry={entry} />
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

      {/* Two money figures per row need naming: what the wheel gave them vs what
          they actually laid out. The gap between them is the story. */}
      <div className="bw-draw-legend">
        <span />
        <span>Club</span>
        <span>Spun</span>
        <span>Signed</span>
      </div>

      <ul className="bw-draw-rows">
        {rows.map((entry, n) => {
          const m = managers[entry.managerIdx];
          if (!m) return null;
          const isLatest = !entry.pending && entry === picked[picked.length - 1] && isLive;
          return (
            <li
              key={`${entry.managerIdx}-${n}`}
              className={`bw-draw-row${entry.pending ? " is-pending" : ""}${isLatest ? " is-latest" : ""}`}
            >
              <KitSwatch
                primary={m.primaryColor}
                secondary={m.secondaryColor}
                pattern={m.pattern || "plain"}
                uid={`draw-${shown}-${entry.managerIdx}`}
                size={18}
              />
              <span className="bw-draw-club">
                {/* Name truncates, chip never does — they can't share an ellipsis. */}
                <span className="bw-draw-club-name">{m.clubName || m.name}</span>
                {m.isComputer && <span className="bw-draw-cpu">CPU</span>}
              </span>
              <span className="bw-draw-spin">
                {entry.pending ? "—" : `£${entry.spun ?? entry.budget}m`}
                {/* Only worth showing when carryover made the pot bigger than
                    the spin — otherwise it's the same number twice. */}
                {!entry.pending && entry.budget > (entry.spun ?? entry.budget) && (
                  <span className="bw-draw-pot">(£{entry.budget}m)</span>
                )}
              </span>
              <PickCell entry={entry} />
            </li>
          );
        })}
      </ul>

      {onViewFull && (
        <button className="bw-draw-full-link" onClick={onViewFull}>
          View full draw →
        </button>
      )}
    </div>
  );
}

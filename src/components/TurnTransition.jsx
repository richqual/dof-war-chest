import KitSwatch, { readableTextOn } from "./KitSwatch";

export default function TurnTransition({ prevManager, player, nextManager, posLabel, nextKit, onContinue }) {
  return (
    <div className="turn-transition-overlay">
      <div className="turn-transition-box">
        <div className="tt-complete">TRANSFER COMPLETE</div>
        <div className="tt-signing">
          <span className="tt-manager">{prevManager}</span>
          <span className="tt-verb">signs</span>
          <span className="tt-player-name">{player.name}</span>
        </div>
        <div className="tt-detail">
          {player.nation} · {player.pos} · {player.club} · {player.years}
        </div>
        <div
          className="tt-next-up"
          style={nextKit ? {
            background: nextKit.primaryColor,
            color: readableTextOn(nextKit.primaryColor),
            borderColor: nextKit.secondaryColor,
          } : undefined}
        >
          {nextKit && (
            <KitSwatch
              primary={nextKit.primaryColor}
              secondary={nextKit.secondaryColor}
              pattern={nextKit.pattern || "plain"}
              uid="tt-next"
              size={22}
            />
          )}
          NEXT UP: <strong style={nextKit ? { color: "inherit" } : undefined}>{nextManager}</strong>
        </div>
        <div className="tt-next-pos">signing: {posLabel}</div>
        <button className="tt-continue-btn" onClick={onContinue}>
          ▶ CONTINUE
        </button>
      </div>
    </div>
  );
}

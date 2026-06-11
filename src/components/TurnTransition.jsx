import KitSwatch, { readableTextOn, kitAccent } from "./KitSwatch";

export default function TurnTransition({ prevManager, player, nextManager, posLabel, nextKit, prevKit, onContinue }) {
  const signingBg = prevKit?.primaryColor || "#1a3a6b";
  const signingText = readableTextOn(signingBg);
  const signingAccent = prevKit ? kitAccent(prevKit.primaryColor, prevKit.secondaryColor) : "#ffd700";

  return (
    <div className="turn-transition-overlay">
      <div className="turn-transition-box">
        {/* Signing confirmation — in the signing team's colours */}
        <div className="tt-signing-block" style={{ background: signingBg, color: signingText, borderBottom: `3px solid ${prevKit?.secondaryColor || "#fff"}` }}>
          <div className="tt-complete" style={{ color: signingAccent === signingBg ? signingText : signingAccent }}>TRANSFER COMPLETE</div>
          {prevKit && (
            <KitSwatch
              primary={prevKit.primaryColor}
              secondary={prevKit.secondaryColor}
              pattern={prevKit.pattern || "plain"}
              uid="tt-prev"
              size={32}
            />
          )}
          <div className="tt-signing">
            <span className="tt-manager" style={{ color: signingText }}>{prevManager}</span>
            <span className="tt-verb" style={{ color: signingText, opacity: 0.7 }}>signs</span>
            <span className="tt-player-name" style={{ color: signingAccent === signingBg ? signingText : signingAccent }}>{player.name}</span>
          </div>
          <div className="tt-detail" style={{ color: signingText, opacity: 0.75 }}>
            {player.nation} · {player.pos} · {player.club} · {player.years}
          </div>
        </div>

        {/* Hand-off to next player */}
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

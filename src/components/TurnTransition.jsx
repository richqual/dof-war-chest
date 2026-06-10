export default function TurnTransition({ prevManager, player, nextManager, posLabel, onContinue }) {
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
        <div className="tt-next-up">
          NEXT UP: <strong>{nextManager}</strong>
        </div>
        <div className="tt-next-pos">signing: {posLabel}</div>
        <button className="tt-continue-btn" onClick={onContinue}>
          ▶ CONTINUE
        </button>
      </div>
    </div>
  );
}

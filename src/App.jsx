import { useState, Component } from "react";
import { useDraftState } from "./hooks/useDraftState";
import SetupScreen from "./components/SetupScreen";
import DraftScreen from "./components/DraftScreen";
import SquadScreen from "./components/SquadScreen";
import MatchSim from "./components/MatchSim";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", color: "#f87171", fontFamily: "monospace" }}>
          <h2>Something went wrong</h2>
          <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
          <button
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
            onClick={() => { localStorage.removeItem("transfer-game-state"); window.location.reload(); }}
          >
            Clear saved game &amp; restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, pickPlayer, setTeamName,
    swapSquadPlayers, restartGame, getAvailablePlayers, getTakenPlayers,
  } = useDraftState();

  const [matchConfig, setMatchConfig] = useState({ homeIdx: 0, awayIdx: 1 });

  function handleSetScreen(s, extra) {
    if (s === "match" && extra) setMatchConfig(extra);
    else if (s === "match") setMatchConfig({ homeIdx: 0, awayIdx: 1 });
    setScreen(s);
  }

  if (screen === "setup" || !draft) {
    return <SetupScreen onStart={startGame} />;
  }

  if (screen === "draft" && draft && currentPos) {
    return (
      <DraftScreen
        draft={draft}
        activeManager={activeManager}
        activeManagerIdx={activeManagerIdx}
        currentPos={currentPos}
        confirmBudget={confirmBudget}
        pickPlayer={pickPlayer}
        getAvailablePlayers={getAvailablePlayers}
        getTakenPlayers={getTakenPlayers}
        restartGame={restartGame}
      />
    );
  }

  if (screen === "squads" && draft) {
    return (
      <SquadScreen
        draft={draft}
        setTeamName={setTeamName}
        swapSquadPlayers={swapSquadPlayers}
        restartGame={restartGame}
        setScreen={handleSetScreen}
      />
    );
  }

  if (screen === "match" && draft) {
    const homeIdx = matchConfig.homeIdx ?? 0;
    const awayIdx = matchConfig.awayIdx ?? 1;
    if (!draft.managers[homeIdx] || !draft.managers[awayIdx]) {
      return <SquadScreen draft={draft} setTeamName={setTeamName} swapSquadPlayers={swapSquadPlayers} restartGame={restartGame} setScreen={handleSetScreen} />;
    }
    return (
      <MatchSim
        draft={draft}
        homeIdx={homeIdx}
        awayIdx={awayIdx}
        onBack={() => setScreen("squads")}
      />
    );
  }

  return <SetupScreen onStart={startGame} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

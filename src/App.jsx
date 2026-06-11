import { useState, useEffect, Component } from "react";
import { useDraftState } from "./hooks/useDraftState";
import SetupScreen from "./components/SetupScreen";
import OrderDrawScreen from "./components/OrderDrawScreen";
import DraftScreen from "./components/DraftScreen";
import SquadScreen from "./components/SquadScreen";
import MatchSim from "./components/MatchSim";
import DrawScreen from "./components/DrawScreen";
import SeriesScreen from "./components/SeriesScreen";
import { getSeriesContext } from "./components/SeriesScreen";
import ManagerDraftScreen from "./components/ManagerDraftScreen";

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

function ThemeToggle({ light, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        position: "fixed", top: "8px", right: "8px", zIndex: 10000,
        background: "var(--bg2)", border: "1px solid var(--border)",
        color: "var(--text2)", fontSize: "16px", padding: "4px 8px",
        cursor: "pointer", lineHeight: 1,
      }}
    >
      {light ? "🌙" : "☀️"}
    </button>
  );
}

function AppInner() {
  const {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, pickPlayer, setTeamName,
    swapSquadPlayers, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, autoCompleteDraft, skipCpuTurns,
    completeDraw, recordMatchResult, assignManagers,
  } = useDraftState();

  const [matchConfig, setMatchConfig] = useState({ homeIdx: 0, awayIdx: 1 });
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("tg-theme") === "light");

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", lightMode);
    localStorage.setItem("tg-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  function handleSetScreen(s, extra) {
    if (s === "match" && extra) setMatchConfig(extra);
    else if (s === "match") setMatchConfig({ homeIdx: 0, awayIdx: 1 });
    setScreen(s);
  }

  const toggle = <ThemeToggle light={lightMode} onToggle={() => setLightMode(l => !l)} />;

  if (screen === "setup" || !draft) {
    return <>{toggle}<SetupScreen onStart={startGame} /></>;
  }

  if (screen === "order-draw" && draft) {
    return <>{toggle}<OrderDrawScreen draft={draft} onStart={() => setScreen("draft")} /></>;
  }

  if (screen === "draft" && draft && currentPos) {
    return (
      <>
        {toggle}
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
          skipTurn={skipTurn}
          autoCompleteDraft={autoCompleteDraft}
          skipCpuTurns={skipCpuTurns}
        />
      </>
    );
  }

  if (screen === "manager-draft" && draft) {
    return (
      <>
        {toggle}
        <ManagerDraftScreen draft={draft} onAssignManager={assignManagers} />
      </>
    );
  }

  if (screen === "squads" && draft) {
    return (
      <>
        {toggle}
        <SquadScreen
          draft={draft}
          setTeamName={setTeamName}
          swapSquadPlayers={swapSquadPlayers}
          restartGame={restartGame}
          setScreen={handleSetScreen}
          onBackToSeries={draft.series ? () => setScreen("series") : undefined}
        />
      </>
    );
  }

  if (screen === "draw" && draft?.series?.stage === "draw") {
    return <>{toggle}<DrawScreen draft={draft} onComplete={completeDraw} /></>;
  }

  if (screen === "series" && draft?.series) {
    return (
      <>
        {toggle}
        <SeriesScreen
          draft={draft}
          setScreen={handleSetScreen}
          recordMatchResult={recordMatchResult}
          restartGame={restartGame}
        />
      </>
    );
  }

  if (screen === "match" && draft) {
    const homeIdx = matchConfig.homeIdx ?? 0;
    const awayIdx = matchConfig.awayIdx ?? 1;
    if (!draft.managers[homeIdx] || !draft.managers[awayIdx]) {
      return <>{toggle}<SquadScreen draft={draft} setTeamName={setTeamName} swapSquadPlayers={swapSquadPlayers} restartGame={restartGame} setScreen={handleSetScreen} onBackToSeries={draft.series ? () => setScreen("series") : undefined} /></>;
    }
    const inSeries = !!draft.series;
    const seriesCtx = inSeries ? getSeriesContext(draft.series, draft.managers) : null;
    return (
      <>
        {toggle}
        <MatchSim
          draft={draft}
          homeIdx={homeIdx}
          awayIdx={awayIdx}
          onBack={() => setScreen(inSeries ? "series" : "squads")}
          onMatchResult={inSeries ? (winnerIdx, score) => recordMatchResult(homeIdx, awayIdx, winnerIdx, score) : undefined}
          seriesContext={seriesCtx}
        />
      </>
    );
  }

  return <>{toggle}<SetupScreen onStart={startGame} /></>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

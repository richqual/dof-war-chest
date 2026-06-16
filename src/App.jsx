import { useState, useEffect, Component } from "react";
import { useDraftState } from "./hooks/useDraftState";
import LobbyScreen from "./components/LobbyScreen";
import ClubCreatorScreen from "./components/ClubCreatorScreen";
import OrderDrawScreen from "./components/OrderDrawScreen";
import DraftScreen from "./components/DraftScreen";
import SquadScreen from "./components/SquadScreen";
import MatchSim from "./components/MatchSim";
import DrawScreen from "./components/DrawScreen";
import SeriesScreen from "./components/SeriesScreen";
import { getSeriesContext } from "./components/SeriesScreen";
import ManagerDraftScreen from "./components/ManagerDraftScreen";
import PlayerPoolScreen from "./components/PlayerPoolScreen";

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

function GlobalMenu({ light, onToggle, hasGame, onAbandon, extraOptions }) {
  const [open, setOpen] = useState(false);

  function abandon() {
    setOpen(false);
    onAbandon();
  }

  return (
    <>
      <button
        className="global-menu-btn"
        onClick={() => setOpen(o => !o)}
        title="Menu"
      >
        ☰
      </button>

      {open && (
        <div className="global-menu-overlay" onClick={() => setOpen(false)}>
          <div className="global-menu-box" onClick={e => e.stopPropagation()}>
            <div className="global-menu-title">THE FOOTBALL DIRECTOR</div>

            <button className="global-menu-item" onClick={() => setOpen(false)}>
              ▶ CONTINUE
            </button>

            {extraOptions && (
              <>
                <div className="global-menu-divider" />
                {extraOptions.map((opt, i) => (
                  <div key={i}>
                    <button className="global-menu-item" onClick={() => { setOpen(false); opt.action(); }}>
                      {opt.label}
                    </button>
                    {opt.warn && <p className="global-menu-warn">{opt.warn}</p>}
                  </div>
                ))}
              </>
            )}

            <div className="global-menu-divider" />

            <button className="global-menu-item" onClick={() => window.location.reload()}>
              ↺ RESTART APP
            </button>

            <div className="global-menu-divider" />

            <button className="global-menu-item" onClick={() => { setOpen(false); onToggle(); }}>
              {light ? "🌙 DARK MODE" : "☀️ LIGHT MODE"}
            </button>

            {hasGame && (
              <>
                <div className="global-menu-divider" />
                <button className="global-menu-item danger" onClick={abandon}>
                  ✕ QUIT &amp; RETURN TO HOME
                </button>
                <p className="global-menu-warn">Abandons the current game and returns to the setup screen.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AppInner() {
  const {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, confirmSlot, pickPlayer, setTeamName,
    swapSquadPlayers, setTactics, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, respin, autoCompleteDraft, skipCpuTurns,
    completeDraw, recordMatchResult, assignManagers, setPlayerPool,
  } = useDraftState();

  const [preScreen, setPreScreen] = useState("lobby"); // "lobby" | "club-creator"
  const [lobbyConfig, setLobbyConfig] = useState(null);

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

  function handleAbandon() {
    restartGame();
    setPreScreen("lobby");
  }

  const hasGame = !!draft;
  const globalMenu = (
    <GlobalMenu
      light={lightMode}
      onToggle={() => setLightMode(l => !l)}
      hasGame={hasGame}
      onAbandon={handleAbandon}
      screen={screen}
    />
  );

  if (screen === "setup" || !draft) {
    if (preScreen === "lobby") {
      return (
        <>
          {globalMenu}
          <LobbyScreen onContinue={config => { setLobbyConfig(config); setPreScreen("club-creator"); }} />
        </>
      );
    }
    return (
      <>
        {globalMenu}
        <ClubCreatorScreen
          config={lobbyConfig}
          onStart={(clubs, opts) => { startGame(clubs, opts); setPreScreen("lobby"); }}
          onBack={() => setPreScreen("lobby")}
        />
      </>
    );
  }

  if (screen === "order-draw" && draft) {
    return <>{globalMenu}<OrderDrawScreen draft={draft} onStart={() => setScreen("player-pool")} /></>;
  }

  if (screen === "player-pool" && draft) {
    return (
      <>
        {globalMenu}
        <PlayerPoolScreen onConfirm={filter => {
          setPlayerPool(filter);
          setScreen(draft.managerTiming === "before" ? "manager-draft" : "draft");
        }} />
      </>
    );
  }

  if (screen === "draft" && draft && currentPos) {
    const draftMenuOptions = [
      { label: "⏩ AUTO-PICK REST & SKIP TO END-GAME", action: autoCompleteDraft, warn: "CPU picks every remaining player instantly and jumps to the squads screen." },
    ];
    return (
      <>
        <GlobalMenu
          light={lightMode}
          onToggle={() => setLightMode(l => !l)}
          hasGame={true}
          onAbandon={restartGame}
          extraOptions={draftMenuOptions}
        />
        <DraftScreen
          draft={draft}
          activeManager={activeManager}
          activeManagerIdx={activeManagerIdx}
          currentPos={currentPos}
          confirmBudget={confirmBudget}
          confirmSlot={confirmSlot}
          pickPlayer={pickPlayer}
          getAvailablePlayers={getAvailablePlayers}
          getTakenPlayers={getTakenPlayers}
          skipTurn={skipTurn}
          respin={respin}
          autoCompleteDraft={autoCompleteDraft}
          skipCpuTurns={skipCpuTurns}
        />
      </>
    );
  }

  if (screen === "manager-draft" && draft) {
    return (
      <>
        {globalMenu}
        <ManagerDraftScreen draft={draft} onAssignManager={assignManagers} />
      </>
    );
  }

  if (screen === "squads" && draft) {
    const managersAssigned = draft.managers.some(m => m.footballManager);
    const onManagerDraft = (draft.managerTiming === "after" && !managersAssigned)
      ? () => setScreen("manager-draft")
      : undefined;
    return (
      <>
        {globalMenu}
        <SquadScreen
          draft={draft}
          setTeamName={setTeamName}
          swapSquadPlayers={swapSquadPlayers}
          setTactics={setTactics}
          restartGame={restartGame}
          setScreen={handleSetScreen}
          onBackToSeries={draft.series ? () => setScreen(draft.series.stage === "draw" ? "draw" : "series") : undefined}
          onManagerDraft={onManagerDraft}
        />
      </>
    );
  }

  if (screen === "draw" && draft?.series?.stage === "draw") {
    return <>{globalMenu}<DrawScreen draft={draft} onComplete={completeDraw} /></>;
  }

  if (screen === "series" && draft?.series) {
    return (
      <>
        {globalMenu}
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
      return <>{globalMenu}<SquadScreen draft={draft} setTeamName={setTeamName} swapSquadPlayers={swapSquadPlayers} setTactics={setTactics} restartGame={restartGame} setScreen={handleSetScreen} onBackToSeries={draft.series ? () => setScreen("series") : undefined} /></>;
    }
    const inSeries = !!draft.series;
    const seriesCtx = inSeries ? getSeriesContext(draft.series, draft.managers) : null;
    return (
      <>
        {globalMenu}
        <MatchSim
          draft={draft}
          homeIdx={homeIdx}
          awayIdx={awayIdx}
          onBack={() => setScreen(inSeries ? "series" : "squads")}
          onMatchResult={inSeries ? (winnerIdx, score, ratings, events, matchInjuries) => recordMatchResult(homeIdx, awayIdx, winnerIdx, score, ratings, events, matchInjuries) : undefined}
          seriesContext={seriesCtx}
        />
      </>
    );
  }

  return <>{globalMenu}<SetupScreen onStart={startGame} /></>;
}

const APP_VERSION = "1.11.0";

function AppFooter() {
  return (
    <div className="app-footer">
      v{APP_VERSION} · created by <a href="https://x.com/richqual" target="_blank" rel="noreferrer">@richqual</a> with Claude
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
      <AppFooter />
    </ErrorBoundary>
  );
}

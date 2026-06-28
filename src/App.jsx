import { useState, useEffect, Component } from "react";
import { useDraftState } from "./hooks/useDraftState";
import { useMultiplayerSession } from "./hooks/useMultiplayerSession";
import { useMultiplayerDraft } from "./hooks/useMultiplayerDraft";
import LobbyScreen, { ModeSelectScreen } from "./components/LobbyScreen";
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
import MultiplayerEntryScreen from "./components/MultiplayerEntryScreen";
import MultiplayerWaitingRoom from "./components/MultiplayerWaitingRoom";
import AboutScreen from "./components/AboutScreen";
import WarChestLobbyScreen from "./components/WarChestLobbyScreen";
import WarChestSelectionScreen from "./components/WarChestSelectionScreen";
import WarChestDraftScreen from "./components/WarChestDraftScreen";
import WarChestSquadScreen from "./components/WarChestSquadScreen";

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

function GlobalMenu({ light, onToggle, largeText, onToggleLargeText, hasGame, onAbandon, onAbout, extraOptions }) {
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
            <div className="global-menu-title">THE TRANSFER WHEEL</div>

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

            <button className="global-menu-item" onClick={() => { setOpen(false); onAbout(); }}>
              ℹ ABOUT THIS GAME
            </button>

            <div className="global-menu-divider" />

            <button className="global-menu-item" onClick={() => window.location.reload()}>
              ↺ RESTART APP
            </button>

            <div className="global-menu-divider" />

            <button className="global-menu-item" onClick={() => { setOpen(false); onToggle(); }}>
              {light ? "🌙 DARK MODE" : "☀️ LIGHT MODE"}
            </button>

            <div className="global-menu-divider" />

            <button className="global-menu-item" onClick={() => { setOpen(false); onToggleLargeText(); }}>
              {largeText ? "𝐀 NORMAL TEXT" : "𝐀 LARGE TEXT"}
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

// ── Multiplayer ────────────────────────────────────────────────────────────

function MultiplayerApp({ onBack }) {
  const session = useMultiplayerSession();
  const { gameDoc, mySlotIdx, isHost, error, loading, createGame, joinGame, updateMySlot, writeGameState, submitManagerPick, setManagerDraftConfig, setMatchConfig: setMatchConfigRemote, setMatchData, clearMatchData, setPhase, leaveGame, clearError } = session;

  const mpDraft = useMultiplayerDraft({
    gameDoc,
    mySlotIdx,
    writeGameState,
    setPhase,
    isHost,
  });

  const [lightMode, setLightMode] = useState(() => localStorage.getItem("tg-theme") === "light");
  const [largeText, setLargeText] = useState(() => localStorage.getItem("tg-text-size") === "large");
  // matchConfig is synced to Firestore so all devices see the same home/away indices
  const matchConfig = gameDoc?.matchConfig ?? { homeIdx: 0, awayIdx: 1 };

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", lightMode);
    localStorage.setItem("tg-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    localStorage.setItem("tg-text-size", largeText ? "large" : "normal");
  }, [largeText]);

  const { screen, draft, activeManager, activeManagerIdx, currentPos, isMyTurn, ...actions } = mpDraft;

  function handleSetScreen(s, extra) {
    if (s === "match") {
      const cfg = extra ?? { homeIdx: 0, awayIdx: 1 };
      setMatchConfigRemote(cfg.homeIdx, cfg.awayIdx);
    }
    mpDraft.setScreen(s);
  }

  async function handleLeave() {
    await leaveGame();
    onBack();
  }

  const globalMenu = (
    <GlobalMenu
      light={lightMode}
      onToggle={() => setLightMode(l => !l)}
      largeText={largeText}
      onToggleLargeText={() => setLargeText(t => !t)}
      hasGame={!!draft}
      onAbandon={() => { actions.restartGame(); }}
    />
  );

  // Not yet in a game session — show entry or waiting room
  if (!gameDoc) {
    return (
      <MultiplayerEntryScreen
        onCreateGame={createGame}
        onJoinGame={joinGame}
        onBack={onBack}
        loading={loading}
        error={error}
        clearError={clearError}
      />
    );
  }

  // In a game session but not yet started
  if (gameDoc.phase === "waiting") {
    return (
      <MultiplayerWaitingRoom
        gameDoc={gameDoc}
        mySlotIdx={mySlotIdx}
        isHost={isHost}
        onUpdateSlot={updateMySlot}
        onStartGame={(clubs, options) => actions.startGame(clubs, options)}
        onLeave={handleLeave}
      />
    );
  }

  // Only the player pool config screen is host-only
  if (!isHost && screen === "player-pool") {
    return (
      <>
        {globalMenu}
        <div className="setup-screen">
          <div className="setup-card">
            <div className="mp-waiting-screen">
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">Waiting for host to finish setup...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // During draft: show DraftScreen with turn-lock for non-active players
  if (screen === "draft" && draft && currentPos) {
    const draftMenuOptions = isHost
      ? [{ label: "⏩ AUTO-PICK REST & SKIP TO END-GAME", action: actions.autoCompleteDraft, warn: "CPU picks every remaining player instantly." }]
      : [];

    return (
      <>
        <GlobalMenu
          light={lightMode}
          onToggle={() => setLightMode(l => !l)}
          largeText={largeText}
          onToggleLargeText={() => setLargeText(t => !t)}
          hasGame={true}
          onAbandon={actions.restartGame}
          extraOptions={draftMenuOptions}
        />
        <DraftScreen
          draft={draft}
          activeManager={activeManager}
          activeManagerIdx={activeManagerIdx}
          currentPos={currentPos}
          confirmBudget={isMyTurn ? actions.confirmBudget : () => {}}
          confirmSlot={isMyTurn ? actions.confirmSlot : () => {}}
          pickPlayer={isMyTurn ? actions.pickPlayer : () => {}}
          getAvailablePlayers={actions.getAvailablePlayers}
          getTakenPlayers={actions.getTakenPlayers}
          skipTurn={isMyTurn ? actions.skipTurn : () => {}}
          respin={isMyTurn ? actions.respin : () => {}}
          autoCompleteDraft={isHost ? actions.autoCompleteDraft : null}
          skipCpuTurns={isHost ? actions.skipCpuTurns : () => {}}
          myTurn={isMyTurn}
        />
      </>
    );
  }

  // All other screens — render normally (same as single player)
  if (screen === "setup" || !draft) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <div className="mp-waiting-screen">
            <div className="mp-waiting-spinner" />
            <p className="mp-waiting-text">Waiting for host to set up the game...</p>
            <button className="mp-back-link" style={{ marginTop: "1.5rem" }} onClick={handleLeave}>
              ← Leave game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "order-draw" && draft) {
    return <>{globalMenu}<OrderDrawScreen draft={draft} onStart={isHost ? () => mpDraft.setScreen("player-pool") : () => {}} /></>;
  }

  if (screen === "player-pool" && draft) {
    return (
      <>
        {globalMenu}
        <PlayerPoolScreen numClubs={draft.managers.length} onConfirm={filter => {
          actions.setPlayerPool(filter);
          mpDraft.setScreen(draft.managerTiming === "before" ? "manager-draft" : "draft");
        }} />
      </>
    );
  }

  if (screen === "manager-draft" && draft) {
    return (
      <>
        {globalMenu}
        <ManagerDraftScreen
          draft={draft}
          onAssignManager={isHost ? actions.assignManagers : () => {}}
          mySlotIdx={mySlotIdx}
          externalPicks={gameDoc?.managerPicks || {}}
          onManagerPick={submitManagerPick}
          isHost={isHost}
          managerDraftConfig={gameDoc?.managerDraftConfig || null}
          onSetManagerDraftConfig={isHost ? setManagerDraftConfig : null}
        />
      </>
    );
  }

  if (screen === "squads" && draft) {
    const managersAssigned = draft.managers.some(m => m.footballManager);
    const onManagerDraft = (draft.managerTiming === "after" && !managersAssigned)
      ? () => mpDraft.setScreen("manager-draft")
      : undefined;
    // Non-host can view squads and manage their own, but only host can start a match
    function mpSquadSetScreen(s, extra) {
      if (s === "match" && !isHost) return;
      handleSetScreen(s, extra);
    }
    return (
      <>
        {globalMenu}
        <SquadScreen
          draft={draft}
          setTeamName={actions.setTeamName}
          swapSquadPlayers={(idx, a, b) => idx === mySlotIdx && actions.swapSquadPlayers(idx, a, b)}
          setTactics={(idx, t) => idx === mySlotIdx && actions.setTactics(idx, t)}
          restartGame={isHost ? actions.restartGame : () => {}}
          setScreen={mpSquadSetScreen}
          onBackToSeries={draft.series ? () => mpDraft.setScreen(draft.series.stage === "draw" ? "draw" : "series") : undefined}
          onManagerDraft={onManagerDraft}
          mySlotIdx={mySlotIdx}
        />
      </>
    );
  }

  if (screen === "draw" && draft?.series?.stage === "draw") {
    return <>{globalMenu}<DrawScreen draft={draft} onComplete={actions.completeDraw} /></>;
  }

  if (screen === "series" && draft?.series) {
    return (
      <>
        {globalMenu}
        <SeriesScreen
          draft={draft}
          setScreen={isHost ? handleSetScreen : () => {}}
          recordMatchResult={isHost ? actions.recordMatchResult : () => {}}
          restartGame={isHost ? actions.restartGame : () => {}}
        />
      </>
    );
  }

  if (screen === "match" && draft) {
    const homeIdx = matchConfig.homeIdx ?? 0;
    const awayIdx = matchConfig.awayIdx ?? 1;
    if (!draft.managers[homeIdx] || !draft.managers[awayIdx]) {
      return <>{globalMenu}<SquadScreen draft={draft} setTeamName={actions.setTeamName} swapSquadPlayers={actions.swapSquadPlayers} setTactics={actions.setTactics} restartGame={actions.restartGame} setScreen={handleSetScreen} onBackToSeries={draft.series ? () => mpDraft.setScreen("series") : undefined} mySlotIdx={mySlotIdx} /></>;
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
          onBack={isHost ? () => mpDraft.setScreen(inSeries ? "series" : "squads") : null}
          onMatchResult={inSeries && isHost ? (winnerIdx, score, ratings, events, injuries) => {
            clearMatchData();
            actions.recordMatchResult(homeIdx, awayIdx, winnerIdx, score, ratings, events, injuries);
          } : undefined}
          seriesContext={seriesCtx}
          isHost={isHost}
          externalMatchData={gameDoc?.matchData || null}
          onMatchGenerated={isHost ? setMatchData : null}
        />
      </>
    );
  }

  return <>{globalMenu}</>;
}

// ── Single player ──────────────────────────────────────────────────────────

function AppInner({ onMultiplayer }) {
  const {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos,
    startGame, confirmBudget, confirmSlot, pickPlayer, setTeamName,
    swapSquadPlayers, setTactics, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, respin, autoCompleteDraft, skipCpuTurns,
    completeDraw, recordMatchResult, assignManagers, setPlayerPool,
    startWarChestGame, selectWarChest, pickWarChestPlayer, completeWarChestSquad, getWarChestPlayers,
  } = useDraftState();

  const [preScreen, setPreScreen] = useState("mode-select"); // "mode-select" | "lobby" | "club-creator" | "wc-lobby" | "wc-club-creator"
  const [showAbout, setShowAbout] = useState(false);
  const [lobbyConfig, setLobbyConfig] = useState(null);

  const [matchConfig, setMatchConfig] = useState({ homeIdx: 0, awayIdx: 1 });
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("tg-theme") === "light");
  const [largeText, setLargeText] = useState(() => localStorage.getItem("tg-text-size") === "large");

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", lightMode);
    localStorage.setItem("tg-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    localStorage.setItem("tg-text-size", largeText ? "large" : "normal");
  }, [largeText]);

  useEffect(() => {
    const isWC = !!draft?.warChest || preScreen === "wc-lobby" || preScreen === "wc-club-creator";
    document.documentElement.classList.toggle("wc-theme", isWC);
    return () => document.documentElement.classList.remove("wc-theme");
  }, [draft?.warChest, preScreen]);

  function handleSetScreen(s, extra) {
    if (s === "match" && extra) setMatchConfig(extra);
    else if (s === "match") setMatchConfig({ homeIdx: 0, awayIdx: 1 });
    setScreen(s);
  }

  function handleAbandon() {
    restartGame();
    setPreScreen("mode-select");
  }

  const hasGame = !!draft;
  const globalMenu = (
    <GlobalMenu
      light={lightMode}
      onToggle={() => setLightMode(l => !l)}
      largeText={largeText}
      onToggleLargeText={() => setLargeText(t => !t)}
      hasGame={hasGame}
      onAbandon={handleAbandon}
      onAbout={() => setShowAbout(true)}
      screen={screen}
    />
  );

  if (showAbout) {
    return (
      <>
        {globalMenu}
        <AboutScreen onBack={() => setShowAbout(false)} />
      </>
    );
  }

  if (screen === "setup" || !draft) {
    if (preScreen === "mode-select") {
      return (
        <>
          {globalMenu}
          <ModeSelectScreen
            onSameDevice={() => setPreScreen("lobby")}
            onOnline={onMultiplayer}
            onWarChest={() => setPreScreen("wc-lobby")}
            onAbout={() => setShowAbout(true)}
          />
        </>
      );
    }
    if (preScreen === "wc-lobby") {
      return (
        <>
          {globalMenu}
          <WarChestLobbyScreen
            onContinue={config => { setLobbyConfig({ ...config, warChest: true }); setPreScreen("wc-club-creator"); }}
            onBack={() => setPreScreen("mode-select")}
          />
        </>
      );
    }
    if (preScreen === "wc-club-creator") {
      return (
        <>
          {globalMenu}
          <ClubCreatorScreen
            config={lobbyConfig}
            onStart={(clubs, opts) => {
              startWarChestGame(clubs, { ...opts, ...lobbyConfig });
              setPreScreen("mode-select");
            }}
            onBack={() => setPreScreen("wc-lobby")}
          />
        </>
      );
    }
    if (preScreen === "lobby") {
      return (
        <>
          {globalMenu}
          <LobbyScreen
            onContinue={config => { setLobbyConfig(config); setPreScreen("club-creator"); }}
            onBack={() => setPreScreen("mode-select")}
          />
        </>
      );
    }
    return (
      <>
        {globalMenu}
        <ClubCreatorScreen
          config={lobbyConfig}
          onStart={(clubs, opts) => { startGame(clubs, opts); setPreScreen("mode-select"); }}
          onBack={() => setPreScreen("lobby")}
        />
      </>
    );
  }

  // ── War Chest screens ────────────────────────────────────────────────────
  if (draft?.warChest) {
    if (screen === "war-chest-select") {
      return (
        <>
          {globalMenu}
          <WarChestSelectionScreen draft={draft} onSelect={selectWarChest} />
        </>
      );
    }
    if (screen === "war-chest-draft") {
      return (
        <>
          {globalMenu}
          <WarChestDraftScreen
            draft={draft}
            pickPlayer={pickWarChestPlayer}
            onDone={completeWarChestSquad}
            getPlayers={getWarChestPlayers}
          />
        </>
      );
    }
    if (screen === "squads") {
      return (
        <>
          {globalMenu}
          <WarChestSquadScreen draft={draft} setScreen={handleSetScreen} />
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
    if (screen === "match") {
      const homeIdx = matchConfig.homeIdx ?? 0;
      const awayIdx = matchConfig.awayIdx ?? 1;
      const inSeries = !!draft.series;
      const seriesCtx = inSeries ? getSeriesContext(draft.series, draft.managers) : null;
      return (
        <>
          {globalMenu}
          <MatchSim
            draft={draft}
            homeIdx={homeIdx}
            awayIdx={awayIdx}
            matchMinutes={60}
            onBack={() => handleSetScreen(inSeries ? "series" : "squads")}
            onMatchResult={(winnerIdx, score, ratings, events, injuries) => {
              if (inSeries) {
                recordMatchResult(homeIdx, awayIdx, winnerIdx, score, ratings, events, injuries);
              } else {
                handleSetScreen("squads");
              }
            }}
            seriesContext={seriesCtx}
          />
        </>
      );
    }
  }

  if (screen === "order-draw" && draft) {
    return <>{globalMenu}<OrderDrawScreen draft={draft} onStart={() => setScreen("player-pool")} /></>;
  }

  if (screen === "player-pool" && draft) {
    return (
      <>
        {globalMenu}
        <PlayerPoolScreen numClubs={draft.managers.length} onConfirm={filter => {
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

const APP_VERSION = "2.6.2";

function AppFooter() {
  return (
    <div className="app-footer">
      v{APP_VERSION} · created by <a href="https://www.instagram.com/richqual" target="_blank" rel="noreferrer">@richqual</a> with Claude · <a href="https://buymeacoffee.com/thetransfergame" target="_blank" rel="noreferrer">buy me a coffee</a>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("single"); // "single" | "multiplayer"
  return (
    <ErrorBoundary>
      {mode === "multiplayer"
        ? <MultiplayerApp onBack={() => setMode("single")} />
        : <AppInner onMultiplayer={() => setMode("multiplayer")} />
      }
      <AppFooter />
    </ErrorBoundary>
  );
}

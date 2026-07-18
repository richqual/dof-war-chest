import { useState, useEffect, useRef, Component } from "react";
import { useDraftState } from "./hooks/useDraftState";
import { useMultiplayerSession } from "./hooks/useMultiplayerSession";
import { useMultiplayerDraft } from "./hooks/useMultiplayerDraft";
import { useAuth } from "./hooks/useAuth";
import { useSaveSquad } from "./hooks/useSaveSquad";
import LobbyScreen, { ModeSelectScreen } from "./components/LobbyScreen";
import ClubCreatorScreen from "./components/ClubCreatorScreen";
import OrderDrawScreen from "./components/OrderDrawScreen";
import ProfileScreen from "./components/ProfileScreen";
import MySquadsScreen from "./components/MySquadsScreen";
import DraftRouletteScreen from "./components/DraftRouletteScreen";
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
import ScoutLobbyScreen from "./components/ScoutLobbyScreen";
import ScoutTenetsScreen from "./components/ScoutTenetsScreen";
import ScoutDraftScreen from "./components/ScoutDraftScreen";
import SquadTimer from "./components/SquadTimer";

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

function GlobalMenu({ light, onToggle, largeText, onToggleLargeText, hasGame, onAbandon, abandonLabel = "✕ QUIT & RETURN TO HOME", abandonWarn = "Abandons the current game and returns to the setup screen.", onAbout, extraOptions, user, isGuest, onSignIn, onSignInGuest, onLinkGoogle, onSignOut, onProfile, onMySquads }) {
  const [open, setOpen] = useState(false);

  function abandon() {
    setOpen(false);
    onAbandon();
  }

  return (
    <>
      <button
        className={"global-menu-tab" + (open ? " is-open" : "")}
        onClick={() => setOpen(o => !o)}
        title="Menu"
        aria-label="Menu"
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

            {/* Auth section */}
            {user && !isGuest ? (
              <>
                <div className="global-menu-account">
                  <span className="global-menu-account-name">⚽ {user.displayName || user.email}</span>
                </div>
                <button className="global-menu-item" onClick={() => { setOpen(false); onMySquads(); }}>
                  🗂 MY SQUADS
                </button>
                <button className="global-menu-item" onClick={() => { setOpen(false); onProfile(); }}>
                  👤 EDIT PROFILE
                </button>
                <button className="global-menu-item" onClick={() => { setOpen(false); onSignOut(); }}>
                  ⇥ SIGN OUT
                </button>
              </>
            ) : isGuest ? (
              <>
                <div className="global-menu-account">
                  <span className="global-menu-account-name">👤 Playing as Guest</span>
                </div>
                <button className="global-menu-item" onClick={() => { setOpen(false); onLinkGoogle(); }}>
                  ⇥ LINK GOOGLE ACCOUNT
                </button>
                <p className="global-menu-warn">Link to save your squads and history.</p>
                <button className="global-menu-item" onClick={() => { setOpen(false); onSignOut(); }}>
                  ⇥ SIGN OUT
                </button>
              </>
            ) : (
              <>
                <button className="global-menu-item" onClick={() => { setOpen(false); onSignIn(); }}>
                  ⇥ SIGN IN WITH GOOGLE
                </button>
                <button className="global-menu-item" onClick={() => { setOpen(false); onSignInGuest(); }}>
                  ⇥ PLAY AS GUEST
                </button>
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
                  {abandonLabel}
                </button>
                <p className="global-menu-warn">{abandonWarn}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Multiplayer ────────────────────────────────────────────────────────────

function MultiplayerApp({ onBack, initialGameMode = "classic" }) {
  const session = useMultiplayerSession();
  const { gameDoc, mySlotIdx, isHost, error, loading, createGame, joinGame, updateMySlot, writeGameState, submitManagerPick, setManagerDraftConfig, setMatchConfig: setMatchConfigRemote, setMatchData, clearMatchData, setPhase, updateWcSlot, updateGameFields, leaveGame, clearError } = session;

  const mpDraft = useMultiplayerDraft({
    gameDoc,
    mySlotIdx,
    writeGameState,
    setPhase,
    isHost,
    updateWcSlot,
    updateGameFields,
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

  // ── War Chest multiplayer: host advances phase when all players are ready ──
  // (CPU slots are auto-filled up front in startGame(), so they're always ready.)
  useEffect(() => {
    if (!isHost || !draft?.warChest || screen !== "wc-select") return;
    const wcSlots = gameDoc?.wcSlots || {};
    const allSelected = draft.managers.every((_, i) => wcSlots[i]?.chestBudget != null);
    if (!allSelected) return;
    const nextDraft = {
      ...draft,
      managers: draft.managers.map((m, i) => {
        const wd = wcSlots[i] || {};
        return { ...m, chestBudget: wd.chestBudget, wcBudgetRemaining: wd.chestBudget };
      }),
    };
    actions.advanceWcPhase(nextDraft, "wc-draft");
  }, [gameDoc?.wcSlots, screen, isHost, draft?.warChest]); // eslint-disable-line

  useEffect(() => {
    if (!isHost || !draft?.warChest || screen !== "wc-draft") return;
    const wcSlots = gameDoc?.wcSlots || {};
    const allDone = draft.managers.every((_, i) => wcSlots[i]?.done);
    if (!allDone) return;
    const nextDraft = {
      ...draft,
      managers: draft.managers.map((m, i) => {
        const wd = wcSlots[i] || {};
        return { ...m, squad: wd.squad || m.squad, wcBudgetRemaining: wd.wcBudgetRemaining ?? m.wcBudgetRemaining, chestBudget: wd.chestBudget ?? m.chestBudget };
      }),
      phase: "complete",
      wcPhase: "complete",
    };
    actions.advanceWcPhase(nextDraft, "squads");
  }, [gameDoc?.wcSlots, screen, isHost, draft?.warChest]); // eslint-disable-line

  // ── War Chest multiplayer: host auto-fills anyone still not done once the squad-build
  // timer expires, reusing the same CPU pick logic (keeps whatever they'd already picked).
  const wcAutoFillInFlight = useRef(new Set());
  useEffect(() => {
    if (!isHost || !draft?.warChest || !draft.wcDeadline) return;
    if (screen !== "wc-select" && screen !== "wc-draft") return;
    const tick = () => {
      if (Date.now() < draft.wcDeadline) return;
      const wcSlots = gameDoc?.wcSlots || {};
      draft.managers.forEach((m, i) => {
        if (m.isComputer || wcSlots[i]?.done) { wcAutoFillInFlight.current.delete(i); return; }
        if (wcAutoFillInFlight.current.has(i)) return;
        wcAutoFillInFlight.current.add(i);
        actions.autoFillWcSlot(i);
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isHost, draft?.warChest, draft?.wcDeadline, screen, gameDoc?.wcSlots]); // eslint-disable-line

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
      onAbandon={() => { if (isHost) actions.restartGame(); else handleLeave(); }}
      abandonLabel={isHost ? "✕ END GAME FOR EVERYONE" : "✕ LEAVE GAME"}
      abandonWarn={isHost ? "Ends the game for all players and returns everyone to setup." : "You'll leave the game — the other players can continue without you."}
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
        initialGameMode={initialGameMode}
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
          onAbandon={() => { if (isHost) actions.restartGame(); else handleLeave(); }}
          abandonLabel={isHost ? "✕ END GAME FOR EVERYONE" : "✕ LEAVE GAME"}
          abandonWarn={isHost ? "Ends the game for all players and returns everyone to setup." : "You'll leave the game — the other players can continue without you."}
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

  // ── War Chest multiplayer screens ─────────────────────────────────────────

  if (screen === "wc-select" && draft) {
    const myWcData = gameDoc?.wcSlots?.[mySlotIdx] || {};
    if (myWcData.chestBudget != null) {
      const othersLeft = draft.managers.filter((m, i) => !m.isComputer && i !== mySlotIdx && !(gameDoc?.wcSlots?.[i]?.chestBudget != null)).length;
      return (
        <>{globalMenu}
          <div className="setup-screen"><div className="setup-card">
            <div className="mp-waiting-screen">
              {draft.wcDeadline && <SquadTimer deadline={draft.wcDeadline} />}
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">
                {myWcData.auto ? "⏱ Time's up — your squad was auto-filled! " : "Chest opened! "}
                Waiting for {othersLeft === 1 ? "1 other manager" : `${othersLeft} others`}…
              </p>
            </div>
          </div></div>
        </>
      );
    }
    return (
      <>{globalMenu}
        <WarChestSelectionScreen
          draft={{ ...draft, wcCurrentManagerIdx: mySlotIdx }}
          onSelect={actions.selectWarChest}
          deadline={draft.wcDeadline}
        />
      </>
    );
  }

  if (screen === "wc-draft" && draft) {
    const myWcData = gameDoc?.wcSlots?.[mySlotIdx] || {};
    if (myWcData.done) {
      const othersLeft = draft.managers.filter((m, i) => !m.isComputer && i !== mySlotIdx && !gameDoc?.wcSlots?.[i]?.done).length;
      return (
        <>{globalMenu}
          <div className="setup-screen"><div className="setup-card">
            <div className="mp-waiting-screen">
              {draft.wcDeadline && <SquadTimer deadline={draft.wcDeadline} />}
              <div className="mp-waiting-spinner" />
              <p className="mp-waiting-text">
                {myWcData.auto ? "⏱ Time's up — your squad was auto-filled! " : "Squad complete! "}
                Waiting for {othersLeft === 1 ? "1 other manager" : `${othersLeft} others`}…
              </p>
            </div>
          </div></div>
        </>
      );
    }
    const localDraft = {
      ...draft,
      wcCurrentManagerIdx: mySlotIdx,
      managers: draft.managers.map((m, i) =>
        i === mySlotIdx
          ? { ...m, chestBudget: myWcData.chestBudget, wcBudgetRemaining: myWcData.wcBudgetRemaining ?? myWcData.chestBudget, squad: myWcData.squad || Array(16).fill(null) }
          : m
      ),
    };
    return (
      <>{globalMenu}
        <WarChestDraftScreen
          draft={localDraft}
          pickPlayer={(slot, player) => actions.pickWarChestPlayer(slot, player)}
          onDone={actions.completeWarChestSquad}
          getPlayers={actions.getWarChestPlayers}
          deadline={draft.wcDeadline}
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
    function mpSquadSetScreen(s, extra) {
      if ((s === "match" || s === "series" || s === "draw") && !isHost) return;
      handleSetScreen(s, extra);
    }
    if (draft.warChest) {
      return (
        <>
          {globalMenu}
          <WarChestSquadScreen draft={draft} setScreen={mpSquadSetScreen} isHost={isHost} />
        </>
      );
    }
    const managersAssigned = draft.managers.some(m => m.footballManager);
    const onManagerDraft = (draft.managerTiming === "after" && !managersAssigned)
      ? () => mpDraft.setScreen("manager-draft")
      : undefined;
    return (
      <>
        {globalMenu}
        <SquadScreen
          draft={draft}
          setTeamName={actions.setTeamName}
          swapSquadPlayers={(idx, a, b) => idx === mySlotIdx && actions.swapSquadPlayers(idx, a, b)}
          setTactics={(idx, t) => idx === mySlotIdx && actions.setTactics(idx, t)}
          setFormation={(idx, f) => idx === mySlotIdx && actions.setFormation(idx, f)}
          setCaptain={(idx, pid) => idx === mySlotIdx && actions.setCaptain(idx, pid)}
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
    return <>{globalMenu}<DrawScreen draft={draft} onComplete={actions.completeDraw} isHost={isHost} /></>;
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
          isHost={isHost}
        />
      </>
    );
  }

  if (screen === "match" && draft) {
    const homeIdx = matchConfig.homeIdx ?? 0;
    const awayIdx = matchConfig.awayIdx ?? 1;
    if (!draft.managers[homeIdx] || !draft.managers[awayIdx]) {
      return <>{globalMenu}<SquadScreen draft={draft} setTeamName={actions.setTeamName} swapSquadPlayers={actions.swapSquadPlayers} setTactics={actions.setTactics} setFormation={actions.setFormation} setCaptain={actions.setCaptain} restartGame={actions.restartGame} setScreen={handleSetScreen} onBackToSeries={draft.series ? () => mpDraft.setScreen("series") : undefined} mySlotIdx={mySlotIdx} /></>;
    }
    const inSeries = !!draft.series;
    const seriesCtx = inSeries ? getSeriesContext(draft.series, draft.managers, !!draft.warChest) : null;
    return (
      <>
        {globalMenu}
        <MatchSim
          draft={draft}
          homeIdx={homeIdx}
          awayIdx={awayIdx}
          matchMinutes={draft.warChest ? 60 : 90}
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

function AppInner({ onMultiplayer, auth }) {
  const {
    screen, setScreen,
    draft, activeManager, activeManagerIdx, currentPos, scoutFreeAgentList,
    startGame, confirmBudget, confirmSlot, pickPlayer, setTeamName,
    swapSquadPlayers, setTactics, setFormation, setCaptain, restartGame, getAvailablePlayers, getTakenPlayers,
    skipTurn, respin, autoCompleteDraft, skipCpuTurns,
    completeDraw, recordMatchResult, assignManagers, setPlayerPool,
    startWarChestGame, beginChestPhase, selectWarChest, beginBuildPhase, pickWarChestPlayer, completeWarChestSquad, getWarChestPlayers,
    startScoutGame, confirmScoutBudget, pickScoutPlayer, reScout, commissionMission, confirmMission, scoutSkipCpuTurns,
  } = useDraftState();

  const [preScreen, setPreScreen] = useState("mode-select"); // "mode-select" | "lobby" | "club-creator" | "wc-lobby" | "wc-club-creator"
  const [showAbout, setShowAbout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMySquads, setShowMySquads] = useState(false);
  const [lobbyConfig, setLobbyConfig] = useState(null);

  const saveSquadHook = useSaveSquad(auth.user);

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

  useEffect(() => {
    const isScout = !!draft?.scout || ["scout-lobby", "scout-club-creator", "scout-tenets"].includes(preScreen);
    document.documentElement.classList.toggle("scout-theme", isScout);
    return () => document.documentElement.classList.remove("scout-theme");
  }, [draft?.scout, preScreen]);

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
      user={auth.user}
      isGuest={auth.isGuest}
      onSignIn={auth.signInWithGoogle}
      onSignInGuest={auth.signInAsGuest}
      onLinkGoogle={auth.linkGoogleAccount}
      onSignOut={auth.signOut}
      onProfile={() => setShowProfile(true)}
      onMySquads={() => setShowMySquads(true)}
    />
  );

  // First-time profile setup (not for guests)
  if (auth.user && !auth.isGuest && auth.profile && !auth.profile.setupComplete) {
    return (
      <ProfileScreen
        profile={auth.profile}
        onSave={auth.saveProfile}
        isSetup
      />
    );
  }

  // Edit profile overlay
  if (showProfile) {
    return (
      <>
        {globalMenu}
        <ProfileScreen
          profile={auth.profile}
          onSave={async (updates) => { await auth.saveProfile(updates); setShowProfile(false); }}
          onBack={() => setShowProfile(false)}
        />
      </>
    );
  }

  if (showAbout) {
    return (
      <>
        {globalMenu}
        <AboutScreen onBack={() => setShowAbout(false)} />
      </>
    );
  }

  if (showMySquads) {
    return (
      <>
        {globalMenu}
        <MySquadsScreen
          loadSquads={saveSquadHook.loadSquads}
          deleteSquad={saveSquadHook.deleteSquad}
          onBack={() => setShowMySquads(false)}
        />
      </>
    );
  }

  if (screen === "setup" || !draft) {
    if (preScreen === "mode-select") {
      return (
        <>
          {globalMenu}
          <ModeSelectScreen
            onClassicSolo={() => setPreScreen("lobby")}
            onClassicOnline={() => onMultiplayer("classic")}
            onWcSolo={() => setPreScreen("wc-lobby")}
            onWcOnline={() => onMultiplayer("warchest")}
            onScoutSolo={() => setPreScreen("scout-lobby")}
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
            profileDefaults={auth.profile?.setupComplete ? auth.profile : null}
            onStart={(clubs, opts) => {
              startWarChestGame(clubs, { ...opts, ...lobbyConfig });
              setPreScreen("mode-select");
            }}
            onBack={() => setPreScreen("wc-lobby")}
          />
        </>
      );
    }
    if (preScreen === "scout-lobby") {
      return (
        <>
          {globalMenu}
          <ScoutLobbyScreen
            onContinue={config => { setLobbyConfig(config); setPreScreen("scout-club-creator"); }}
            onBack={() => setPreScreen("mode-select")}
          />
        </>
      );
    }
    if (preScreen === "scout-club-creator") {
      return (
        <>
          {globalMenu}
          <ClubCreatorScreen
            config={lobbyConfig}
            profileDefaults={auth.profile?.setupComplete ? auth.profile : null}
            onStart={(clubs, opts) => { setLobbyConfig({ ...lobbyConfig, ...opts, _clubs: clubs }); setPreScreen("scout-tenets"); }}
            onBack={() => setPreScreen("scout-lobby")}
          />
        </>
      );
    }
    if (preScreen === "scout-tenets") {
      return (
        <>
          {globalMenu}
          <ScoutTenetsScreen
            clubs={lobbyConfig?._clubs || []}
            onStart={(tenets) => {
              const { _clubs, ...opts } = lobbyConfig;
              startScoutGame(_clubs, { ...opts, tenets });
              setPreScreen("mode-select");
            }}
            onBack={() => setPreScreen("scout-club-creator")}
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
          profileDefaults={auth.profile?.setupComplete ? auth.profile : null}
          onStart={(clubs, opts) => { startGame(clubs, opts); setPreScreen("mode-select"); }}
          onBack={() => setPreScreen("lobby")}
        />
      </>
    );
  }

  // ── War Chest screens ────────────────────────────────────────────────────
  if (draft?.warChest) {
    if (screen === "draft-roulette") {
      return <>{globalMenu}<DraftRouletteScreen draft={draft} onStart={() => beginChestPhase(draft)} /></>;
    }
    if (screen === "war-chest-select") {
      return (
        <>
          {globalMenu}
          <WarChestSelectionScreen draft={draft} onSelect={selectWarChest} />
        </>
      );
    }
    if (screen === "war-chest-order-draw") {
      return <>{globalMenu}<OrderDrawScreen draft={draft} onStart={beginBuildPhase} warChest /></>;
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
            onSaveSquad={auth.user && !auth.isGuest ? () => {
              const hIdx = draft.managers.findIndex(m => !m.isComputer);
              if (hIdx !== -1) saveSquadHook.saveSquad(draft, hIdx);
            } : undefined}
            saveState={saveSquadHook}
          />
        </>
      );
    }
    if (screen === "match") {
      const homeIdx = matchConfig.homeIdx ?? 0;
      const awayIdx = matchConfig.awayIdx ?? 1;
      const inSeries = !!draft.series;
      const seriesCtx = inSeries ? getSeriesContext(draft.series, draft.managers, !!draft.warChest) : null;
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

  if (screen === "draft-roulette" && draft) {
    return <>{globalMenu}<DraftRouletteScreen draft={draft} onStart={() => setScreen("order-draw")} /></>;
  }

  if (screen === "order-draw" && draft) {
    const afterDraw = draft.scout
      ? (draft.managerTiming === "before" ? "manager-draft" : "draft")
      : draft.draftRoulette?.enabled
        ? (draft.managerTiming === "before" ? "manager-draft" : "draft")
        : "player-pool";
    return <>{globalMenu}<OrderDrawScreen draft={draft} onStart={() => setScreen(afterDraw)} /></>;
  }

  if (screen === "player-pool" && draft) {
    // Draft Roulette assigns pools per-manager — skip the global pool screen
    if (draft.draftRoulette?.enabled) {
      setScreen(draft.managerTiming === "before" ? "manager-draft" : "draft");
      return null;
    }
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

  if (screen === "draft" && draft?.scout && currentPos) {
    return (
      <>
        <GlobalMenu light={lightMode} onToggle={() => setLightMode(l => !l)} hasGame={true} onAbandon={restartGame} />
        <ScoutDraftScreen
          draft={draft}
          activeManager={activeManager}
          activeManagerIdx={activeManagerIdx}
          currentPos={currentPos}
          confirmScoutBudget={confirmScoutBudget}
          pickScoutPlayer={pickScoutPlayer}
          reScout={reScout}
          commissionMission={commissionMission}
          confirmMission={confirmMission}
          scoutSkipCpuTurns={scoutSkipCpuTurns}
          respin={respin}
          getTakenPlayers={getTakenPlayers}
          freeAgents={scoutFreeAgentList}
        />
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
          setFormation={setFormation}
          setCaptain={setCaptain}
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
          onSaveSquad={auth.user && !auth.isGuest ? () => {
            const hIdx = draft.managers.findIndex(m => !m.isComputer);
            if (hIdx !== -1) saveSquadHook.saveSquad(draft, hIdx);
          } : undefined}
          saveState={saveSquadHook}
        />
      </>
    );
  }

  if (screen === "match" && draft) {
    const homeIdx = matchConfig.homeIdx ?? 0;
    const awayIdx = matchConfig.awayIdx ?? 1;
    if (!draft.managers[homeIdx] || !draft.managers[awayIdx]) {
      return <>{globalMenu}<SquadScreen draft={draft} setTeamName={setTeamName} swapSquadPlayers={swapSquadPlayers} setTactics={setTactics} setFormation={setFormation} setCaptain={setCaptain} restartGame={restartGame} setScreen={handleSetScreen} onBackToSeries={draft.series ? () => setScreen("series") : undefined} /></>;
    }
    const inSeries = !!draft.series;
    const seriesCtx = inSeries ? getSeriesContext(draft.series, draft.managers, !!draft.warChest) : null;
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

  // Defensive fallback: unreachable in normal flow (the setup block above
  // returns for every !draft / screen==="setup" case). Render just the menu
  // rather than a stale setup form.
  return <>{globalMenu}</>;
}

const APP_VERSION = "4.1.1";

function AppFooter() {
  return (
    <div className="app-footer">
      v{APP_VERSION} · created by <a href="https://www.instagram.com/richqual" target="_blank" rel="noreferrer">@richqual</a> with Claude · <a href="https://buymeacoffee.com/thetransfergame" target="_blank" rel="noreferrer">buy me a coffee</a>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("single"); // "single" | "multiplayer"
  const [mpInitialMode, setMpInitialMode] = useState("classic");
  const auth = useAuth();

  function goMultiplayer(gameMode = "classic") {
    setMpInitialMode(gameMode);
    setMode("multiplayer");
  }

  // Still resolving auth state — show nothing to avoid flash
  if (auth.user === undefined) return null;

  return (
    <ErrorBoundary>
      {mode === "multiplayer"
        ? <MultiplayerApp onBack={() => setMode("single")} initialGameMode={mpInitialMode} />
        : <AppInner onMultiplayer={goMultiplayer} auth={auth} />
      }
      <AppFooter />
    </ErrorBoundary>
  );
}

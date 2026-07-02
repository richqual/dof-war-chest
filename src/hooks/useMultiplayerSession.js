import { useState, useEffect } from "react";
import { doc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

function getDeviceId() {
  let id = localStorage.getItem("tfd-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("tfd-device-id", id);
  }
  return id;
}

function genRoomCode() {
  // Omit easily-confused characters (0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function useMultiplayerSession() {
  const [deviceId] = useState(getDeviceId);
  const [gameId, setGameId] = useState(() => localStorage.getItem("tfd-mp-game-id"));
  const [gameDoc, setGameDoc] = useState(null);
  const [mySlotIdx, setMySlotIdx] = useState(() => {
    const s = localStorage.getItem("tfd-mp-slot");
    return s !== null ? Number(s) : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), snap => {
      if (snap.exists()) {
        setGameDoc(snap.data());
      } else {
        // Game was deleted
        setGameDoc(null);
        setGameId(null);
        setMySlotIdx(null);
        localStorage.removeItem("tfd-mp-game-id");
        localStorage.removeItem("tfd-mp-slot");
      }
    });
    return unsub;
  }, [gameId]);

  async function createGame(numSlots) {
    setLoading(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const roomCode = genRoomCode();
      const slots = Array.from({ length: numSlots }, (_, i) => ({
        deviceId: i === 0 ? deviceId : null,
        displayName: null,
        clubName: null,
        primaryColor: "#1a3a6b",
        secondaryColor: "#ffffff",
        pattern: "plain",
        formation: "4-3-3",
        ready: false,
      }));
      await setDoc(doc(db, "games", id), {
        roomCode,
        hostDeviceId: deviceId,
        phase: "waiting",   // waiting | playing | done
        numSlots,
        slots,
        draft: null,
        screen: "setup",
        createdAt: Date.now(),
      });
      setGameId(id);
      setMySlotIdx(0);
      localStorage.setItem("tfd-mp-game-id", id);
      localStorage.setItem("tfd-mp-slot", "0");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinGame(roomCode) {
    setLoading(true);
    setError(null);
    try {
      const code = roomCode.toUpperCase().trim();
      const q = query(collection(db, "games"), where("roomCode", "==", code));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("Room not found — check the code and try again.");
        setLoading(false);
        return false;
      }
      const gameSnap = snap.docs[0];
      const data = gameSnap.data();

      if (data.phase !== "waiting") {
        setError("This game has already started.");
        setLoading(false);
        return false;
      }

      // Already in this game on another tab / rejoining
      const existingSlot = data.slots.findIndex(s => s.deviceId === deviceId);
      if (existingSlot >= 0) {
        setGameId(gameSnap.id);
        setMySlotIdx(existingSlot);
        localStorage.setItem("tfd-mp-game-id", gameSnap.id);
        localStorage.setItem("tfd-mp-slot", String(existingSlot));
        setLoading(false);
        return true;
      }

      const freeSlot = data.slots.findIndex(s => s.deviceId === null);
      if (freeSlot < 0) {
        setError("This room is full.");
        setLoading(false);
        return false;
      }

      const newSlots = data.slots.map((s, i) =>
        i === freeSlot ? { ...s, deviceId } : s
      );
      await updateDoc(doc(db, "games", gameSnap.id), { slots: newSlots });
      setGameId(gameSnap.id);
      setMySlotIdx(freeSlot);
      localStorage.setItem("tfd-mp-game-id", gameSnap.id);
      localStorage.setItem("tfd-mp-slot", String(freeSlot));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateMySlot(slotData) {
    if (!gameId || mySlotIdx === null || !gameDoc) return;
    const newSlots = gameDoc.slots.map((s, i) =>
      i === mySlotIdx ? { ...s, ...slotData } : s
    );
    await updateDoc(doc(db, "games", gameId), { slots: newSlots });
  }

  async function writeGameState(serializedDraft, screen) {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), {
      draft: serializedDraft,
      screen,
    });
  }

  async function submitManagerPick(slotIdx, manager) {
    if (!gameId) return;
    const picks = { ...(gameDoc?.managerPicks || {}), [String(slotIdx)]: manager };
    await updateDoc(doc(db, "games", gameId), { managerPicks: picks });
  }

  async function clearManagerPicks() {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), { managerPicks: null });
  }

  async function setManagerDraftConfig(leagues, tiers) {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), { managerDraftConfig: { leagues, tiers } });
  }

  async function setMatchConfig(homeIdx, awayIdx) {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), { matchConfig: { homeIdx, awayIdx } });
  }

  async function setMatchData(data) {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), { matchData: data });
  }

  async function clearMatchData() {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), { matchData: null });
  }

  async function setPhase(phase) {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), { phase });
  }

  // Write a single player's WC slot data (chest pick + squad) without touching others.
  // Defaults to this device's own slot; the host also uses this to fill CPU slots and
  // to auto-fill a slot when a player's squad-build timer expires.
  async function updateWcSlot(data, slotIdx = mySlotIdx) {
    if (!gameId || slotIdx === null || slotIdx === undefined) return;
    await updateDoc(doc(db, "games", gameId), { [`wcSlots.${slotIdx}`]: data });
  }

  // Arbitrary field update — used by host to clear wcSlots on game start
  async function updateGameFields(fields) {
    if (!gameId) return;
    await updateDoc(doc(db, "games", gameId), fields);
  }

  async function leaveGame() {
    setGameId(null);
    setGameDoc(null);
    setMySlotIdx(null);
    localStorage.removeItem("tfd-mp-game-id");
    localStorage.removeItem("tfd-mp-slot");
  }

  const isHost = !!gameDoc && gameDoc.hostDeviceId === deviceId;

  return {
    deviceId,
    gameId,
    gameDoc,
    mySlotIdx,
    isHost,
    error,
    loading,
    createGame,
    joinGame,
    updateMySlot,
    writeGameState,
    submitManagerPick,
    clearManagerPicks,
    setManagerDraftConfig,
    setMatchConfig,
    setMatchData,
    clearMatchData,
    setPhase,
    updateWcSlot,
    updateGameFields,
    leaveGame,
    clearError: () => setError(null),
  };
}

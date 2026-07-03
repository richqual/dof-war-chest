import { useState } from "react";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export function useSaveSquad(user) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

  async function saveSquad(draft, humanManagerIdx) {
    if (!user || user.isAnonymous) return;
    setSaving(true);
    setError(null);
    try {
      const m = draft.managers[humanManagerIdx];
      const starters = m.squad.slice(0, 11).filter(Boolean);
      const rating = starters.length
        ? Math.round(starters.reduce((s, p) => s + p.rating, 0) / starters.length)
        : 0;

      const squadData = {
        savedAt:       Date.now(),
        clubName:      m.clubName || m.teamName || m.name,
        dofName:       m.dofName || m.name,
        primaryColor:  m.primaryColor,
        secondaryColor:m.secondaryColor,
        pattern:       m.pattern || "plain",
        formation:     m.formation || "4-3-3",
        tactics:       m.tactics || "balanced",
        footballManager: m.footballManager || null,
        rating,
        squad:         m.squad,
        mode:          draft.warChest ? "War Chest" : "Standard",
        difficulty:    draft.difficulty || "normal",
        budgetSpent:   m.carryover !== undefined
                         ? (draft.currentBudget ?? 0) - (m.carryover ?? 0)
                         : null,
      };

      const ref = collection(db, "users", user.uid, "squads");
      await addDoc(ref, squadData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function loadSquads() {
    if (!user || user.isAnonymous) return [];
    const ref = collection(db, "users", user.uid, "squads");
    const q   = query(ref, orderBy("savedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function deleteSquad(squadId) {
    if (!user || user.isAnonymous) return;
    await deleteDoc(doc(db, "users", user.uid, "squads", squadId));
  }

  return { saving, saved, error, saveSquad, loadSquads, deleteSquad };
}

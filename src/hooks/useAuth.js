import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInAnonymously, linkWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";

const GUEST_LOCKER_KEY = "tg-club-locker";
const LOCKER_CAP = 12;

// Reduce a club to the identity fields worth re-using across games.
function normalizeClub(c) {
  return {
    clubName: (c.clubName || "").trim(),
    dofName: (c.dofName || "").trim(),
    primaryColor: c.primaryColor || "#1a3a6b",
    secondaryColor: c.secondaryColor || "#ffffff",
    pattern: c.pattern || "plain",
  };
}

// Merge freshly-played clubs into an existing locker: dedup on club+DoF name,
// move re-used clubs to the front (most-recent-first), cap the list.
function mergeClubs(existing, incoming) {
  const out = [...(existing || [])];
  for (const raw of incoming) {
    const club = normalizeClub(raw);
    if (!club.clubName || !club.dofName) continue;
    const key = `${club.clubName}|${club.dofName}`.toLowerCase();
    const idx = out.findIndex(x => `${x.clubName}|${x.dofName}`.toLowerCase() === key);
    if (idx >= 0) out.splice(idx, 1);
    out.unshift(club);
  }
  return out.slice(0, LOCKER_CAP);
}

function readGuestLocker() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_LOCKER_KEY)) || [];
  } catch {
    return [];
  }
}

export function useAuth() {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  // Guests can't sync to Firestore, so their club locker lives in localStorage.
  const [guestLocker, setGuestLocker] = useState(readGuestLocker);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser && !firebaseUser.isAnonymous) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          const bare = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            dofName: "",
            clubName: "",
            primaryColor: "#1a3a6b",
            secondaryColor: "#ffffff",
            pattern: "plain",
            createdAt: Date.now(),
            setupComplete: false,
          };
          await setDoc(ref, bare);
          setProfile(bare);
        }
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signInAsGuest() {
    await signInAnonymously(auth);
  }

  // Upgrade a guest account by linking Google — preserves their uid and any saved data
  async function linkGoogleAccount() {
    await linkWithPopup(auth, googleProvider);
    // After linking, re-fetch the now-permanent user
    const firebaseUser = auth.currentUser;
    const ref  = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setProfile(snap.data());
    } else {
      const bare = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || "",
        dofName: "",
        clubName: "",
        primaryColor: "#1a3a6b",
        secondaryColor: "#ffffff",
        pattern: "plain",
        createdAt: Date.now(),
        setupComplete: false,
      };
      await setDoc(ref, bare);
      setProfile(bare);
    }
    setUser({ ...firebaseUser });
  }

  async function signOutUser() {
    await signOut(auth);
  }

  async function saveProfile(updates) {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const next = { ...profile, ...updates, setupComplete: true };
    await setDoc(ref, next, { merge: true });
    setProfile(next);
  }

  const isGuest = !user || user.isAnonymous;
  const clubLocker = isGuest ? guestLocker : (profile?.clubLocker || []);

  // Save the human clubs from a just-started game into the locker for re-use.
  async function saveClubsToLocker(clubs) {
    const next = mergeClubs(clubLocker, clubs);
    if (isGuest) {
      setGuestLocker(next);
      try { localStorage.setItem(GUEST_LOCKER_KEY, JSON.stringify(next)); } catch { /* quota/private mode */ }
    } else {
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, { clubLocker: next }, { merge: true });
      setProfile(p => ({ ...p, clubLocker: next }));
    }
  }

  async function removeClubFromLocker(index) {
    const next = clubLocker.filter((_, i) => i !== index);
    if (isGuest) {
      setGuestLocker(next);
      try { localStorage.setItem(GUEST_LOCKER_KEY, JSON.stringify(next)); } catch { /* quota/private mode */ }
    } else {
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, { clubLocker: next }, { merge: true });
      setProfile(p => ({ ...p, clubLocker: next }));
    }
  }

  return {
    user,
    profile,
    isGuest: !!user?.isAnonymous,
    clubLocker,
    saveClubsToLocker,
    removeClubFromLocker,
    signInWithGoogle,
    signInAsGuest,
    linkGoogleAccount,
    signOut: signOutUser,
    saveProfile,
  };
}

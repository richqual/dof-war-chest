import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInAnonymously, linkWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";

export function useAuth() {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

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

  return {
    user,
    profile,
    isGuest: !!user?.isAnonymous,
    signInWithGoogle,
    signInAsGuest,
    linkGoogleAccount,
    signOut: signOutUser,
    saveProfile,
  };
}

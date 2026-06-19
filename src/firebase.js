import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbOI9iHSwukasOyKdqw2MhJvboEtg4zMQ",
  authDomain: "the-football-director.firebaseapp.com",
  projectId: "the-football-director",
  storageBucket: "the-football-director.firebasestorage.app",
  messagingSenderId: "461789641694",
  appId: "1:461789641694:web:1cbfb7174f69fdb546fb4f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

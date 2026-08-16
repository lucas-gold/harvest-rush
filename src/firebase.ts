import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Public, safe-to-embed client config — same nature as the PostHog project
// token used elsewhere (see src/analytics.ts). What's actually gated is
// access to the "leaderboard" collection, enforced by Firestore security
// rules (see firestore.rules: public read, no client write), not by
// keeping this config secret.
const firebaseConfig = {
  apiKey: "AIzaSyCy1xMjWCka-BFxphsPhTlsRA5ZrYcShQo",
  authDomain: "harvest-rush-77ec3.firebaseapp.com",
  projectId: "harvest-rush-77ec3",
  storageBucket: "harvest-rush-77ec3.firebasestorage.app",
  messagingSenderId: "697493111778",
  appId: "1:697493111778:web:aa9c43b0f0d6611a06efbb",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

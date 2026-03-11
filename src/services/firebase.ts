import AsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_CONFIG, isFirebaseConfigured } from "./firebaseConfig";

let app: any = null;
let auth: any = null;
let db: any = null;
let initPromise: Promise<boolean> | null = null;

/**
 * Lazily initializes Firebase (App + Auth w/ AsyncStorage persistence +
 * Firestore) and signs the player in anonymously so cloud save works with
 * zero login friction. Anonymous accounts can later be upgraded via
 * Sign in with Apple / Google using `linkWithCredential` without losing
 * data — wire that into SettingsScreen once you want account recovery.
 */
export function initFirebase(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isFirebaseConfigured()) {
      console.warn(
        "[firebase] No Firebase config set — cloud save disabled. See README 'Cloud save setup'."
      );
      return false;
    }
    try {
      const { initializeApp } = await import("firebase/app");
      // Cast to any: the RN-specific build (which metro resolves at bundle
      // time via the "react-native" package.json condition) exposes
      // getReactNativePersistence, but the web typings TS resolves
      // statically don't declare it.
      const authModule: any = await import("firebase/auth");
      const { initializeAuth, getReactNativePersistence, signInAnonymously, onAuthStateChanged } =
        authModule;
      const { getFirestore } = await import("firebase/firestore");

      app = initializeApp(FIREBASE_CONFIG);
      auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
      db = getFirestore(app);

      await new Promise<void>((resolve) => {
        const unsub = onAuthStateChanged(auth, async (user: any) => {
          if (!user) {
            await signInAnonymously(auth).catch((err: any) =>
              console.warn("[firebase] anonymous sign-in failed", err)
            );
          } else {
            unsub();
            resolve();
          }
        });
      });

      return true;
    } catch (err) {
      console.warn("[firebase] init failed", err);
      return false;
    }
  })();

  return initPromise;
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirestoreDb() {
  return db;
}

export function currentUserId(): string | null {
  return auth?.currentUser?.uid ?? null;
}

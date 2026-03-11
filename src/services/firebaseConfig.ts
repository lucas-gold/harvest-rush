// Create a Firebase project at console.firebase.google.com, add an iOS app
// (bundle ID must match app.json's ios.bundleIdentifier) and an Android app
// (must match android.package), then paste the web config below — the same
// object Firebase gives you for a "web app" also works for the JS SDK here.
// See README "Cloud save setup".
export const FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID",
};

export function isFirebaseConfigured() {
  return !FIREBASE_CONFIG.apiKey.startsWith("REPLACE_WITH");
}

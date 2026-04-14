import { Platform } from "react-native";

// Wraps react-native-expo-game-kit (Game Center on iOS, Play Games Services
// on Android) behind a small facade that:
//  - no-ops safely in Expo Go / web, where the native module doesn't exist
//    (this library needs a custom dev client / EAS build to function — see
//    README "Game Services setup")
//  - keeps the rest of the app decoupled from this specific library, so it
//    can be swapped later without touching call sites.

export const LEADERBOARD_WAVE_ID = "harvestrush_waves_survived";
export const LEADERBOARD_COINS_ID = "harvestrush_total_coins";

export const ACHIEVEMENTS = {
  firstHarvest: "harvestrush_first_harvest",
  wave10: "harvestrush_wave_10",
  wave25: "harvestrush_wave_25",
  richFarmer: "harvestrush_10000_coins",
} as const;

let signedIn = false;

function getNativeModule(): any | null {
  try {
    // Lazy require so bundling never fails even if the native module isn't
    // linked yet (e.g. before the first `expo prebuild` / dev client build).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-expo-game-kit");
    return mod?.GameServices ?? null;
  } catch {
    return null;
  }
}

export async function signIn(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  const GameServices = getNativeModule();
  if (!GameServices) {
    // Expected in Expo Go / before a dev client build — logged, not warned,
    // so it doesn't trip LogBox's warning banner during normal dev.
    console.log(
      "[gameServices] Native game services module unavailable — run a dev client / EAS build (not Expo Go) to test Game Center / Play Games."
    );
    return false;
  }
  try {
    await GameServices.signInOrAuthenticate();
    signedIn = true;
    return true;
  } catch (err) {
    // Also expected until Game Center / Play Games is set up server-side
    // (see README) — logged, not warned.
    console.log("[gameServices] sign-in failed", err);
    return false;
  }
}

export async function submitWaveScore(wavesCleared: number, totalCoinsEarned: number) {
  const GameServices = getNativeModule();
  if (!GameServices || !signedIn) return;
  try {
    await GameServices.submitScore(LEADERBOARD_WAVE_ID, wavesCleared);
    await GameServices.submitScore(LEADERBOARD_COINS_ID, totalCoinsEarned);
  } catch (err) {
    console.warn("[gameServices] submitScore failed", err);
  }
}

export async function unlockAchievement(id: string, percent: number = 100) {
  const GameServices = getNativeModule();
  if (!GameServices || !signedIn) return;
  try {
    await GameServices.unlockAchievement(id, percent);
  } catch (err) {
    console.warn("[gameServices] unlockAchievement failed", err);
  }
}

export async function showLeaderboard(id: string = LEADERBOARD_WAVE_ID) {
  const GameServices = getNativeModule();
  if (!GameServices || !signedIn) return;
  try {
    await GameServices.showLeaderboard(id);
  } catch (err) {
    console.warn("[gameServices] showLeaderboard failed", err);
  }
}

export async function showAchievements() {
  const GameServices = getNativeModule();
  if (!GameServices || !signedIn) return;
  try {
    await GameServices.showAchievements();
  } catch (err) {
    console.warn("[gameServices] showAchievements failed", err);
  }
}

export function isSignedIn() {
  return signedIn;
}

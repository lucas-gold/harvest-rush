import { Platform } from "react-native";
import posthog from "posthog-js";

// Same PostHog project as the server (server/src/analytics.ts) — this is
// the write-only "Project API Key," meant to be safe to ship in a public
// client bundle, not a secret. Web only: posthog-js assumes a real
// browser (window/localStorage), which a native build doesn't have.
const PROJECT_TOKEN = "phc_pQ84TRHyQTJaArQwqcnHvYYDsSqgHxPnjFugv4RgzfYo";
const HOST = "https://us.i.posthog.com";

let initialized = false;
let landedEventSent = false;

function ensureInit() {
  if (initialized || Platform.OS !== "web") return;
  initialized = true;
  posthog.init(PROJECT_TOKEN, {
    api_host: HOST,
    // This is a single-screen arcade game, not a multi-page site — a
    // handful of deliberate custom events says more than autocaptured
    // clicks and synthetic pageviews on every route change would.
    autocapture: false,
    capture_pageview: false,
    // Off by default — nothing here needs a video of what someone's
    // screen looked like, and it's a separate PostHog quota/cost from
    // plain events.
    disable_session_recording: true,
  });
}

/** The server tags its own game_session_ended event with this same id
 * (passed along in the "join" message — see connection.ts) so a lobby
 * visit and any games that follow it show up as one person in PostHog,
 * not disconnected anonymous events. posthog-js generates and persists
 * this itself (localStorage) the first time it's asked; nothing here
 * manages identity directly. */
export function getAnalyticsId(): string | null {
  if (Platform.OS !== "web") return null;
  ensureInit();
  return posthog.get_distinct_id();
}

/** Fires once per real page load, not once per visit to the entry
 * screen — exiting back to the lobby after a game shouldn't read as a
 * fresh "landed and maybe didn't play" visit the way actually opening
 * the site does. */
export function trackLandedOnLobby() {
  if (Platform.OS !== "web" || landedEventSent) return;
  landedEventSent = true;
  ensureInit();
  posthog.capture("landed_on_lobby");
}

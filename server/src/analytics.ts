import { PostHog } from "posthog-node";

// Optional -- an environment without POSTHOG_API_KEY set (local dev, or
// anyone running their own copy of this server) just no-ops instead of
// requiring a PostHog account to run the server at all.
const apiKey = process.env.POSTHOG_API_KEY;
const client = apiKey
  ? new PostHog(apiKey, { host: process.env.POSTHOG_HOST || "https://us.i.posthog.com" })
  : null;

/** One event per completed real-player session, fired from Room.leave.
 * distinctId is normally the client's own persisted PostHog id (see
 * src/analytics.ts on the client, threaded through the "join" message) so
 * a lobby visit and the games that follow it link up as one person --
 * falls back to a fresh per-session id for any client that didn't send
 * one. name is just a property on the event for filtering/display, not
 * an identity in its own right. */
export function trackSessionEnd(params: {
  distinctId: string;
  name: string;
  joinedAt: number;
  peakCrops: number;
  kills: number;
}) {
  if (!client) return;
  client.capture({
    distinctId: params.distinctId,
    event: "game_session_ended",
    properties: {
      name: params.name,
      duration_seconds: Math.round((Date.now() - params.joinedAt) / 1000),
      peak_crops: params.peakCrops,
      kills: params.kills,
      joined_at: new Date(params.joinedAt).toISOString(),
    },
  });
}

/** Flushes any queued events -- called on SIGTERM so a rolling deploy
 * doesn't silently drop whatever hasn't been batched out yet. */
export function shutdownAnalytics(): Promise<void> {
  return client ? client.shutdown() : Promise.resolve();
}

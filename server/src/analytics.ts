import { PostHog } from "posthog-node";

// Optional -- an environment without POSTHOG_API_KEY set (local dev, or
// anyone running their own copy of this server) just no-ops instead of
// requiring a PostHog account to run the server at all.
const apiKey = process.env.POSTHOG_API_KEY;
const client = apiKey
  ? new PostHog(apiKey, { host: process.env.POSTHOG_HOST || "https://us.i.posthog.com" })
  : null;

/** How a session ended, in order of "most deliberate" to "least":
 * eliminated in combat, an explicit clean disconnect (Exit button, or the
 * old connection closing right before a Play Again reconnect), the
 * browser tab/page closing, an abrupt disconnect (network drop, a dead
 * connection caught by the heartbeat in index.ts, anything without a
 * clean close code), or the server itself shutting down for a deploy
 * while the session was still active. */
export type SessionEndReason = "eliminated" | "left" | "closed_tab" | "disconnected" | "server_restart";

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
  endReason: SessionEndReason;
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
      end_reason: params.endReason,
    },
  });
}

/** Flushes any queued events -- called on SIGTERM so a rolling deploy
 * doesn't silently drop whatever hasn't been batched out yet. */
export function shutdownAnalytics(): Promise<void> {
  return client ? client.shutdown() : Promise.resolve();
}

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";

// Optional, same pattern as analytics.ts -- an environment without a
// service account configured just no-ops instead of requiring Firestore
// to run the server at all.
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
let db: Firestore | null = null;
if (serviceAccountJson) {
  const app = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  db = getFirestore(app);
}

/** One record per browser (see analyticsId in analytics.ts) in the public
 * "leaderboard" collection the client reads directly. highScore and
 * mostKills are each their own running best across every life this
 * browser has ever played -- a big score in one game and a big kill
 * count in a different game both count, rather than only whichever run
 * happened to set the high score. totalCropsCollected is the one
 * cumulative stat, summed across every life. Skipped entirely for a
 * 0-crop session; nothing worth recording. Best-effort: a Firestore
 * hiccup shouldn't affect gameplay, so failures are swallowed after
 * logging. */
export async function updateGlobalLeaderboard(params: {
  distinctId: string;
  name: string;
  peakCrops: number;
  kills: number;
  cropsCollected: number;
}) {
  if (!db || params.peakCrops <= 0) return;
  const ref = db.collection("leaderboard").doc(params.distinctId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? snap.data()! : { highScore: 0, mostKills: 0, totalCropsCollected: 0 };
      tx.set(ref, {
        name: params.name,
        highScore: Math.max(existing.highScore ?? 0, params.peakCrops),
        mostKills: Math.max(existing.mostKills ?? 0, params.kills),
        totalCropsCollected: (existing.totalCropsCollected ?? 0) + params.cropsCollected,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    console.error("[leaderboard] failed to update", params.distinctId, err);
  }
}
